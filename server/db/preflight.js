const EXPECTED_TABLES = [
  'roomy_categories', 'roomy_items', 'roomy_layout_items', 'roomy_layouts',
  'roomy_migrations', 'roomy_photo_cleanup', 'roomy_rooms',
]

const EXPECTED_POLICIES = [
  ['roomy_categories', 'roomy_runtime_categories_read'],
  ['roomy_rooms', 'roomy_runtime_rooms_owner'],
  ['roomy_items', 'roomy_runtime_items_owner'],
  ['roomy_layouts', 'roomy_runtime_layouts_owner'],
  ['roomy_layout_items', 'roomy_runtime_layout_items_owner'],
  ['roomy_photo_cleanup', 'roomy_runtime_photo_cleanup_owner'],
  ['roomy_photo_cleanup', 'roomy_photo_maintenance_jobs'],
]

function hasOnlyRole(value, role) {
  // PostgreSQL name[] values may arrive from node-postgres as their raw
  // array literal instead of a JavaScript array.
  if (Array.isArray(value)) return value.length === 1 && value[0] === role
  return value === `{${role}}`
}

function policyMatches(policy, role, command, using, check = null) {
  const normalize = (expression) => expression?.replace(/\s+/g, ' ').trim() ?? null
  return policy.permissive === 'PERMISSIVE' && hasOnlyRole(policy.roles, role) &&
    policy.cmd === command &&
    normalize(policy.qual) === using && normalize(policy.with_check) === check
}

export async function runtimeDatabaseIssues(db) {
  const issues = []
  const roleResult = await db.query(`SELECT r.rolsuper, r.rolbypassrls, r.rolcreatedb,
      r.rolcreaterole, r.rolreplication, r.rolinherit,
      COALESCE((SELECT pg_has_role(current_user, role.oid, 'MEMBER')
        FROM pg_roles role WHERE role.rolname='roomy_runtime'), false) AS runtime_member,
      ARRAY(SELECT parent.rolname FROM pg_auth_members m
        JOIN pg_roles parent ON parent.oid=m.roleid
        JOIN pg_roles member ON member.oid=m.member
        WHERE member.rolname=current_user) AS direct_memberships,
      EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relname=ANY($1::text[])
          AND pg_get_userbyid(c.relowner)=current_user) AS owns_roomy_table,
      has_table_privilege(current_user, 'public.roomy_categories', 'SELECT') AS categories_read,
      (has_table_privilege(current_user, 'public.roomy_categories', 'INSERT') OR
        has_table_privilege(current_user, 'public.roomy_categories', 'UPDATE') OR
        has_table_privilege(current_user, 'public.roomy_categories', 'DELETE')) AS categories_write,
      (has_table_privilege(current_user, 'public.roomy_rooms', 'SELECT') AND has_table_privilege(current_user, 'public.roomy_rooms', 'INSERT') AND has_table_privilege(current_user, 'public.roomy_rooms', 'UPDATE') AND has_table_privilege(current_user, 'public.roomy_rooms', 'DELETE')) AS rooms_rw,
      (has_table_privilege(current_user, 'public.roomy_items', 'SELECT') AND has_table_privilege(current_user, 'public.roomy_items', 'INSERT') AND has_table_privilege(current_user, 'public.roomy_items', 'UPDATE') AND has_table_privilege(current_user, 'public.roomy_items', 'DELETE')) AS items_rw,
      (has_table_privilege(current_user, 'public.roomy_layouts', 'SELECT') AND has_table_privilege(current_user, 'public.roomy_layouts', 'INSERT') AND has_table_privilege(current_user, 'public.roomy_layouts', 'UPDATE') AND has_table_privilege(current_user, 'public.roomy_layouts', 'DELETE')) AS layouts_rw,
      (has_table_privilege(current_user, 'public.roomy_layout_items', 'SELECT') AND has_table_privilege(current_user, 'public.roomy_layout_items', 'INSERT') AND has_table_privilege(current_user, 'public.roomy_layout_items', 'UPDATE') AND has_table_privilege(current_user, 'public.roomy_layout_items', 'DELETE')) AS placements_rw,
      (has_table_privilege(current_user, 'public.roomy_photo_cleanup', 'SELECT') AND has_table_privilege(current_user, 'public.roomy_photo_cleanup', 'INSERT') AND has_table_privilege(current_user, 'public.roomy_photo_cleanup', 'UPDATE') AND has_table_privilege(current_user, 'public.roomy_photo_cleanup', 'DELETE')) AS cleanup_rw,
      (has_table_privilege(current_user, 'public.roomy_migrations', 'SELECT') OR has_table_privilege(current_user, 'public.roomy_migrations', 'INSERT') OR has_table_privilege(current_user, 'public.roomy_migrations', 'UPDATE') OR has_table_privilege(current_user, 'public.roomy_migrations', 'DELETE')) AS migrations_rw
    FROM pg_roles r WHERE r.rolname=current_user`,
  [EXPECTED_TABLES])
  const role = roleResult.rows[0]
  if (!role.runtime_member) issues.push('DATABASE_URL is not a member of roomy_runtime')
  if (role.rolsuper || role.rolbypassrls || role.rolcreatedb || role.rolcreaterole || role.rolreplication || role.owns_roomy_table) {
    issues.push('DATABASE_URL role has owner, bypass, or administrative privileges')
  }
  if (!role.rolinherit || !hasOnlyRole(role.direct_memberships, 'roomy_runtime')) {
    issues.push('DATABASE_URL has unexpected role memberships or does not inherit roomy_runtime')
  }
  if (!role.categories_read || role.categories_write || !role.rooms_rw || !role.items_rw ||
    !role.layouts_rw || !role.placements_rw || !role.cleanup_rw || role.migrations_rw) {
    issues.push('DATABASE_URL table grants do not match the restricted runtime access policy')
  }

  const tablesResult = await db.query(`SELECT t.tablename, t.rowsecurity, c.relforcerowsecurity AS force_rls
    FROM pg_tables t JOIN pg_namespace n ON n.nspname=t.schemaname
    JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=t.tablename
    WHERE t.schemaname='public' AND t.tablename=ANY($1::text[])`, [EXPECTED_TABLES])
  const byTable = new Map(tablesResult.rows.map((row) => [row.tablename, row]))
  for (const name of EXPECTED_TABLES) {
    const table = byTable.get(name)
    if (!table || !table.rowsecurity || (name !== 'roomy_migrations' && !table.force_rls)) {
      issues.push(`RLS is missing or not forced on ${name}`)
    }
  }

  const policiesResult = await db.query(`SELECT tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies
    WHERE schemaname='public' AND tablename=ANY($1::text[])`, [EXPECTED_TABLES])
  const expectedPolicies = new Map(EXPECTED_POLICIES.map(([table, name]) => [`${table}:${name}`, { table, name }]))
  const actualPolicies = new Set(policiesResult.rows.map(({ tablename, policyname }) => `${tablename}:${policyname}`))
  for (const [policyKey, { table, name }] of expectedPolicies) {
    const policy = policiesResult.rows.find((row) => `${row.tablename}:${row.policyname}` === policyKey)
    if (!policy) {
      issues.push(`Expected RLS policy is missing: ${name}`)
      continue
    }
    if (table === 'roomy_categories') {
      if (!policyMatches(policy, 'roomy_runtime', 'SELECT', 'true')) {
        issues.push(`RLS policy is misconfigured: ${name}`)
      }
    } else if (name === 'roomy_photo_maintenance_jobs') {
      if (!policyMatches(policy, 'roomy_photo_maintenance', 'ALL', 'true', 'true')) {
        issues.push(`RLS policy is misconfigured: ${name}`)
      }
    } else if (name === 'roomy_runtime_photo_cleanup_owner') {
      const ownerPath = "(path ~~ (current_setting('roomy.user_id'::text, true) || '/%'::text))"
      if (!policyMatches(policy, 'roomy_runtime', 'ALL', ownerPath, ownerPath)) {
        issues.push(`RLS policy is misconfigured: ${name}`)
      }
    } else {
      const ownerMatches = [
        "(owner_id = NULLIF(current_setting('roomy.user_id'::text, true), ''::text)::uuid)",
        "(owner_id = (NULLIF(current_setting('roomy.user_id'::text, true), ''::text))::uuid)",
      ]
      if (!ownerMatches.some((ownerMatch) =>
        policyMatches(policy, 'roomy_runtime', 'ALL', ownerMatch, ownerMatch))) {
        issues.push(`RLS policy is misconfigured: ${name}`)
      }
    }
  }
  if ([...actualPolicies].some((policy) => !expectedPolicies.has(policy))) {
    issues.push('Unexpected policy found on a Roomy table; review it for permissive access')
  }

  const publicGrants = await db.query(`SELECT grantee, table_name FROM information_schema.role_table_grants
    WHERE table_schema='public' AND table_name=ANY($1::text[])
      AND grantee=ANY(ARRAY['PUBLIC','anon','authenticated','service_role'])`, [EXPECTED_TABLES])
  if (publicGrants.rowCount) issues.push('Direct Data API or PUBLIC grants remain on a Roomy table')

  return issues
}

export async function maintenanceDatabaseIssues(db) {
  if (!db) return ['PHOTO_CLEANUP_DATABASE_URL is not configured']
  const result = await db.query(`SELECT r.rolsuper, r.rolbypassrls, r.rolcreatedb,
      r.rolcreaterole, r.rolreplication, r.rolinherit,
      COALESCE((SELECT pg_has_role(current_user, role.oid, 'MEMBER')
        FROM pg_roles role WHERE role.rolname='roomy_photo_maintenance'), false) AS maintenance_member,
      COALESCE((SELECT pg_has_role(current_user, role.oid, 'MEMBER')
        FROM pg_roles role WHERE role.rolname='roomy_runtime'), false) AS runtime_member,
      ARRAY(SELECT parent.rolname FROM pg_auth_members m
        JOIN pg_roles parent ON parent.oid=m.roleid
        JOIN pg_roles member ON member.oid=m.member
        WHERE member.rolname=current_user) AS direct_memberships,
      has_table_privilege(current_user, 'public.roomy_items', 'SELECT') AS can_read_items,
      has_table_privilege(current_user, 'public.roomy_photo_cleanup', 'SELECT') AS can_read_jobs,
      has_table_privilege(current_user, 'public.roomy_rooms', 'SELECT') AS can_read_rooms,
      has_table_privilege(current_user, 'public.roomy_categories', 'SELECT') AS can_read_categories,
      has_table_privilege(current_user, 'public.roomy_layouts', 'SELECT') AS can_read_layouts,
      has_table_privilege(current_user, 'public.roomy_layout_items', 'SELECT') AS can_read_layout_items,
      has_table_privilege(current_user, 'public.roomy_migrations', 'SELECT') AS can_read_migrations,
      (has_table_privilege(current_user, 'public.roomy_photo_cleanup', 'INSERT') AND
        has_table_privilege(current_user, 'public.roomy_photo_cleanup', 'UPDATE') AND
        has_table_privilege(current_user, 'public.roomy_photo_cleanup', 'DELETE')) AS can_write_jobs
    FROM pg_roles r WHERE r.rolname=current_user`)
  const role = result.rows[0]
  const issues = []
  if (!role.maintenance_member || role.runtime_member || !role.rolinherit ||
    !hasOnlyRole(role.direct_memberships, 'roomy_photo_maintenance')) {
    issues.push('Photo cleanup connection has incorrect role memberships')
  }
  if (role.rolsuper || role.rolbypassrls || role.rolcreatedb || role.rolcreaterole || role.rolreplication ||
    role.runtime_member || role.can_read_items || role.can_read_rooms || role.can_read_categories ||
    role.can_read_layouts || role.can_read_layout_items || role.can_read_migrations ||
    !role.can_read_jobs || !role.can_write_jobs) {
    issues.push('Photo cleanup connection is not restricted to maintenance work')
  }
  return issues
}

export async function productionDatabaseIssues(runtimeDb, cleanupDb) {
  return [
    ...(await runtimeDatabaseIssues(runtimeDb)),
    ...(await maintenanceDatabaseIssues(cleanupDb)),
  ]
}

import test from 'node:test'
import assert from 'node:assert/strict'
import { maintenanceDatabaseIssues, runtimeDatabaseIssues } from '../db/preflight.js'

const tables = [
  'roomy_categories', 'roomy_items', 'roomy_layout_items', 'roomy_layouts',
  'roomy_migrations', 'roomy_photo_cleanup', 'roomy_rooms',
].map((tablename) => ({ tablename, rowsecurity: true, force_rls: true }))
const policies = [
  ['roomy_categories', 'roomy_runtime_categories_read'],
  ['roomy_rooms', 'roomy_runtime_rooms_owner'],
  ['roomy_items', 'roomy_runtime_items_owner'],
  ['roomy_layouts', 'roomy_runtime_layouts_owner'],
  ['roomy_layout_items', 'roomy_runtime_layout_items_owner'],
  ['roomy_photo_cleanup', 'roomy_runtime_photo_cleanup_owner'],
  ['roomy_photo_cleanup', 'roomy_photo_maintenance_jobs'],
].map(([tablename, policyname]) => ({
  tablename, policyname,
  permissive: 'PERMISSIVE',
  roles: [policyname === 'roomy_photo_maintenance_jobs' ? 'roomy_photo_maintenance' : 'roomy_runtime'],
  cmd: tablename === 'roomy_categories' ? 'SELECT' : 'ALL',
  qual: policyname === 'roomy_runtime_categories_read' || policyname === 'roomy_photo_maintenance_jobs'
    ? 'true' : policyname.includes('photo_cleanup') ? "(path ~~ (current_setting('roomy.user_id'::text, true) || '/%'::text))" : "(owner_id = NULLIF(current_setting('roomy.user_id'::text, true), ''::text)::uuid)",
  with_check: policyname === 'roomy_runtime_categories_read' ? null :
    policyname === 'roomy_photo_maintenance_jobs' ? 'true' : policyname.includes('photo_cleanup')
      ? "(path ~~ (current_setting('roomy.user_id'::text, true) || '/%'::text))" : "(owner_id = NULLIF(current_setting('roomy.user_id'::text, true), ''::text)::uuid)",
}))

function runtimeDb({ admin = false, missingPolicy = false, unsafePolicy = false } = {}) {
  return { async query(sql) {
    if (sql.includes('SELECT r.rolsuper')) {
      assert.match(sql, /FROM pg_roles r WHERE r\.rolname=current_user/)
      return { rows: [{
        rolsuper: admin, rolbypassrls: admin, rolcreatedb: false, rolcreaterole: false,
        rolreplication: false, rolinherit: true, runtime_member: true,
        direct_memberships: ['roomy_runtime'], owns_roomy_table: admin, can_read_migrations: false,
        categories_read: true, categories_write: false, rooms_rw: true, items_rw: true,
        layouts_rw: true, placements_rw: true, cleanup_rw: true, migrations_rw: false,
      }] }
    }
    if (sql.includes('SELECT t.tablename')) return { rows: tables }
    if (sql.includes('SELECT tablename, policyname')) {
      if (missingPolicy) return { rows: policies.slice(1) }
      if (unsafePolicy) return { rows: policies.map((policy) => policy.policyname === 'roomy_runtime_rooms_owner'
        ? { ...policy, qual: `true OR ${policy.qual}` } : policy) }
      return { rows: policies }
    }
    if (sql.includes('SELECT grantee, table_name')) return { rows: [], rowCount: 0 }
    throw new Error('Unexpected preflight query')
  } }
}

test('runtime database preflight accepts a restricted role with all required RLS policies', async () => {
  assert.deepEqual(await runtimeDatabaseIssues(runtimeDb()), [])
})

test('runtime database preflight rejects admin bypass and missing policies', async () => {
  const issues = await runtimeDatabaseIssues(runtimeDb({ admin: true, missingPolicy: true }))
  assert.ok(issues.some((issue) => issue.includes('administrative privileges')))
  assert.ok(issues.some((issue) => issue.includes('Expected RLS policy is missing')))
})

test('runtime database preflight rejects a weakened owner policy', async () => {
  const issues = await runtimeDatabaseIssues(runtimeDb({ unsafePolicy: true }))
  assert.ok(issues.includes('RLS policy is misconfigured: roomy_runtime_rooms_owner'))
})

test('maintenance connection must be isolated from inventory data and runtime access', async () => {
  const safeDb = { async query(sql) {
    assert.match(sql, /FROM pg_roles r WHERE r\.rolname=current_user/)
    return { rows: [{
      rolsuper: false, rolbypassrls: false, rolcreatedb: false, rolcreaterole: false,
      rolreplication: false, rolinherit: true, maintenance_member: true, runtime_member: false,
      direct_memberships: ['roomy_photo_maintenance'],
      can_read_items: false, can_read_jobs: true, can_read_rooms: false, can_read_categories: false,
      can_read_layouts: false, can_read_layout_items: false, can_read_migrations: false, can_write_jobs: true,
    }] }
  } }
  assert.deepEqual(await maintenanceDatabaseIssues(safeDb), [])
  assert.ok((await maintenanceDatabaseIssues(null)).some((issue) => issue.includes('not configured')))
})

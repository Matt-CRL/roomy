# Predeployment security rollout — historical original-project assessment

**Current app target:** `roomy-production`, the same Supabase project formerly
used for isolated QA. Its runtime/photo-maintenance security preflight passed
again on 2026-10-08. The separate original Supabase project remains unchanged
and is not the selected app database.

**Scope warning:** Findings and rollout steps below concern that former
original project and are retained as historical context. Migration 005 is
already applied to `roomy-production`; do not reapply it there. The former
original project is unchanged and is not part of the current adoption path.
Database and Storage backup coverage, manual browser QA, and deployment checks
remain pending before public use.

## Historical findings for the former original project

## Historical state of the former original project (2026-10-05)

A read-only catalog query against the configured Supabase database found:

- All seven `roomy_*` tables have RLS enabled, but none has `FORCE ROW LEVEL
  SECURITY`.
- There are no policies on those tables.
- The configured `DATABASE_URL` connection resolves to the `postgres` role,
  whose `BYPASSRLS` attribute is on. The current API database connection
  therefore does not receive the intended per-user protection from RLS.
- A second read-only preflight confirmed that the API login is not a member of
  `roomy_runtime`, the expected owner policies are absent, and the cleanup
  database URL is not configured. It also found `service_role` has
  `REFERENCES`, `TRIGGER`, and `TRUNCATE` grants on each Roomy table; migration
  005 revokes these broad grants before assigning the narrow application
  grants. The configured Storage bucket was confirmed private.
- No user rows or photo objects were read, and no live schema or data was
  changed during this inspection.

Migration `005_runtime_roles_and_rls.sql` is **not applied** to the live
database. It fails closed if it encounters pre-existing Roomy policies; inspect
and reconcile any such policies before a later live cutover. It also refuses to
reuse pre-existing `roomy_runtime` or `roomy_photo_maintenance` group roles,
whose memberships/grants would need separate review. The local Docker daemon
was unavailable, so this workspace could not provide the isolated PostgreSQL
instance required by the plan. Do not apply migration 005 to the existing
Supabase project until the isolated test and cutover review are done.

## Security configuration now implemented in code

- `DATABASE_URL`: a login role that is a member only of `roomy_runtime`; not a
  table owner, `postgres`, `service_role`, superuser, or `BYPASSRLS` role.
- `PHOTO_CLEANUP_DATABASE_URL`: a distinct login role that is a member only of
  `roomy_photo_maintenance`. It can operate on the durable cleanup queue and
  cannot read inventory tables.
- `MIGRATION_DATABASE_URL`: an administrative migration credential with
  sufficient authority to apply DDL/data migrations to RLS-protected tables,
  kept out of the running API environment.
- Each authenticated API request checks out one database client, begins a
  transaction, sets `roomy.user_id` from the verified Supabase Auth UUID using
  a parameterized transaction-local setting, and uses that same connection for
  all repository work. Nested repository transactions use savepoints.
- RLS denies reads/writes with no identity or a mismatched owner. Categories
  are read-only. Migration history has no runtime policy. Cleanup worker access
  is separately scoped to the cleanup table.
- Production startup fails unless the HTTPS API/Auth/CORS settings are
  present, verifies that the configured Storage bucket is private, and fails
  its database preflight unless role flags, grants, RLS, policies, and the
  maintenance connection match the expected contract.

## Historical cutover proposal for the former original project

1. Create a disposable database/project that contains no personal data. Do
   not use the existing project as the test database. Apply migrations 001–005
   there using the migration-only connection.
2. Provision login roles through the database host's secure role/password
   process. Grant the runtime login only `roomy_runtime`, and the cleanup login
   only `roomy_photo_maintenance`. Keep passwords out of SQL files, shell
   history, Markdown, source control, and frontend `VITE_` variables.
3. Set the two restricted URLs and public/server Supabase settings in a private
   local environment. Run `npm run db:preflight`, then start with
   `NODE_ENV=production` and confirm `/readyz` succeeds. Production startup
   must reject the current admin `DATABASE_URL`.
4. Using two disposable Auth accounts, exercise all API, photo, and planner
   paths in T-0051. Verify absent and wrong transaction identities, cross-owner
   inserts/updates/deletes, direct Supabase Data API denial, storage isolation,
   and pooled-client reuse. Confirm cleanup retries work with the dedicated
   maintenance login.
5. Record test results and review the exact migration and rollback steps.
   Before any live change, re-run a read-only inventory of table owners, RLS
   flags, policies, grants, and role memberships. Back up the project.
6. Apply the reviewed migration to the live project using the migration
   credential, provision the two logins, switch the API environment to the
   restricted URLs, and run the preflight before serving traffic.
7. Configure GitHub Actions repository **Variables** for the public frontend
   values: `VITE_USE_MOCK_API=false`, `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`,
   and `VITE_SUPABASE_PUBLISHABLE_KEY`. Those browser values are public by
   design. Never put a Supabase secret key, database URL, password, or token in
   a `VITE_` variable. The production build intentionally fails closed until
   these are valid.

The API host is still undecided. Select an HTTPS host that can run a persistent
Node.js process before filling in the production API origin and final CORS/Auth
redirect settings. The current frontend workflow targets GitHub Pages and the
client now accounts for its repository subpath.

## Rollback guidance

If the restricted API role or application preflight fails, stop traffic and
roll back the application release or correct the role/configuration. Preserve
RLS and the owner policies. Do **not** disable RLS, grant `BYPASSRLS`, or switch
the running API back to `postgres` as a workaround. Database changes in
migration 005 are additive; data is not dropped or rewritten.

## Local checks implemented

- `npm test` covers server behavior, transaction-local identity/savepoints,
  production config checks, and role/policy preflight logic (23 tests pass).
- `npm run test:config` covers fail-closed frontend config and base-path logic.
- `npm run build:demo` is the intentional demo-only build path.
- `npm run db:preflight` checks a connected database without modifying it.
- Historical read-only preflight against the former original project failed
  for the admin runtime login, missing RLS policies/FORCE RLS, broad Data API
  grants, and absent cleanup role URL. It made no changes. The selected
  `roomy-production` project passed the runtime and photo-maintenance preflight
  again on 2026-10-08.

The API emits security response headers, and release builds include a
Content-Security-Policy meta element. This does not provide HTTP response
headers such as HSTS or `X-Frame-Options` for the static GitHub Pages frontend;
verify/configure those at the selected frontend host or CDN before release.

The earlier isolated-database, two-account, and private-Storage QA passed on
the project now named `roomy-production`. The user previously reported that
the separate original project was paused; its current dashboard status was not
rechecked during adoption. Manual browser/responsive and production-host tests
remain outstanding.

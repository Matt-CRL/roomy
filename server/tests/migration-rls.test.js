import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const migrationUrl = new URL('../db/migrations/005_runtime_roles_and_rls.sql', import.meta.url)
const migration = readFileSync(fileURLToPath(migrationUrl), 'utf8')

test('RLS migration enables all seven tables and forces six runtime-facing tables', () => {
  assert.equal((migration.match(/ENABLE ROW LEVEL SECURITY/g) || []).length, 7)
  assert.equal((migration.match(/FORCE ROW LEVEL SECURITY/g) || []).length, 6)
  assert.match(migration, /roomy_migrations ENABLE ROW LEVEL SECURITY/)
  assert.doesNotMatch(migration, /roomy_migrations FORCE ROW LEVEL SECURITY/)
})

test('RLS migration restricts runtime grants and creates owner-scoped policies', () => {
  assert.match(migration, /CREATE ROLE roomy_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION/)
  assert.match(migration, /CREATE ROLE roomy_photo_maintenance NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION/)
  assert.match(migration, /Roomy security group roles already exist/)
  assert.doesNotMatch(migration, /ALTER ROLE roomy_(runtime|photo_maintenance)/)
  assert.equal((migration.match(/CREATE POLICY roomy_runtime_.*owner/g) || []).length, 5)
  assert.match(migration, /current_setting\('roomy\.user_id', true\)/)
  assert.match(migration, /roomy_migrations FROM roomy_runtime, roomy_photo_maintenance/)
  assert.match(migration, /Existing Roomy RLS policies found/)
})

test('RLS migration does not drop tables, truncate, or delete user records', () => {
  assert.doesNotMatch(migration, /\b(DROP TABLE|TRUNCATE|DELETE FROM)\b/i)
})

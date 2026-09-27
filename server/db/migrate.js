import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createPool } from './pool.js'

const directory = fileURLToPath(new URL('./migrations/', import.meta.url))
const files = readdirSync(directory).filter((name) => /^\d+_.*\.sql$/.test(name)).sort()
const pool = createPool(process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL)
const client = await pool.connect()

try {
  await client.query('BEGIN')
  await client.query('SELECT pg_advisory_xact_lock(81414021)')
  await client.query(`CREATE TABLE IF NOT EXISTS roomy_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
  )`)
  await client.query(`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
      REVOKE ALL ON roomy_migrations FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
      REVOKE ALL ON roomy_migrations FROM authenticated;
    END IF;
  END $$`)
  const applied = new Set((await client.query('SELECT name FROM roomy_migrations')).rows.map((row) => row.name))
  for (const file of files) {
    if (applied.has(file)) continue
    await client.query(readFileSync(join(directory, file), 'utf8'))
    await client.query('INSERT INTO roomy_migrations(name) VALUES ($1)', [file])
    console.log(`Applied ${file}`)
  }
  await client.query('COMMIT')
  console.log('Database migrations current')
} catch (error) {
  await client.query('ROLLBACK')
  console.error('Migration failed:', error)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}

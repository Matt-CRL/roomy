import pg from 'pg'
import { readFileSync } from 'node:fs'

// Build a pool for an explicitly supplied connection string without imposing
// the API's DATABASE_URL startup requirement. Migration tools use this factory
// with their separate, migration-only connection.
export function createPool(connectionString) {
  if (!connectionString) throw new Error('A PostgreSQL connection string is required')

  const databaseUrl = new URL(connectionString)
  const host = databaseUrl.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  // pg-connection-string may override the ssl object when sslmode is present.
  databaseUrl.searchParams.delete('sslmode')
  const caFile = process.env.DATABASE_SSL_CA_FILE || databaseUrl.searchParams.get('sslrootcert')
  databaseUrl.searchParams.delete('sslrootcert')
  const ca = !isLocal && caFile ? readFileSync(caFile, 'utf8') : undefined
  const connectionPool = new pg.Pool({
    connectionString: databaseUrl.toString(),
    ssl: isLocal ? false : { rejectUnauthorized: true, ...(ca && { ca }) },
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  })
  connectionPool.on('error', (error) => console.error('Unexpected database pool error:', error.message))
  return connectionPool
}

import pg from 'pg'
import { readFileSync } from 'node:fs'

// Fail at boot with one clear line, rather than with a mystery 500 an hour
// later. The commonest deployment mistake is setting a variable in .env on your
// laptop and never setting it in the host's dashboard.
if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Locally: copy .env.example to .env and fill it in. ' +
    'On a host: add it in the dashboard, then redeploy.'
  )
  process.exit(1)
}

export function createPool(connectionString) {
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

export const pool = createPool(process.env.DATABASE_URL)

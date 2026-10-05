import { pool } from './pool.js'
import { cleanupPool, photoStorageIssues } from '../photos.js'
import { productionDatabaseIssues } from './preflight.js'

try {
  const issues = [
    ...await productionDatabaseIssues(pool, cleanupPool),
    ...await photoStorageIssues(),
  ]
  if (issues.length) {
    console.error(`Roomy database preflight failed:\n- ${issues.join('\n- ')}`)
    process.exitCode = 1
  } else {
    console.log('Roomy runtime and photo-maintenance database roles pass the security preflight')
  }
} catch (error) {
  console.error(`Roomy database preflight could not complete (${error.code || 'database error'})`)
  process.exitCode = 1
} finally {
  await Promise.all([pool.end(), cleanupPool?.end()].filter(Boolean))
}

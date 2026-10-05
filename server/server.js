import { assertProductionConfig } from './config.js'
import { productionDatabaseIssues } from './db/preflight.js'

assertProductionConfig()

const [{ app }, { pool }, { cleanupPool, processPhotoJobs, photoStorageIssues }] = await Promise.all([
  import('./app.js'),
  import('./db/pool.js'),
  import('./photos.js'),
])

if (process.env.NODE_ENV === 'production') {
  let issues
  try {
    issues = await productionDatabaseIssues(pool, cleanupPool)
    issues.push(...await photoStorageIssues())
  } catch {
    issues = ['Database security preflight could not complete']
  }
  if (issues.length) {
    console.error(`Production database preflight failed:\n- ${issues.join('\n- ')}`)
    await Promise.all([pool.end(), cleanupPool?.end()].filter(Boolean))
    process.exit(1)
  }
}

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Roomy API listening on port ${port}`))
const cleanupTimer = setInterval(() => {
  processPhotoJobs().catch((error) => console.error('Photo cleanup retry failed:', error.message))
}, 5 * 60 * 1000)
cleanupTimer.unref()

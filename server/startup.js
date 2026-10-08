import { assertProductionConfig } from './config.js'
import { productionDatabaseIssues } from './db/preflight.js'
import { pool } from './db/pool.js'
import { cleanupPool, photoStorageIssues } from './photos.js'

let startupPromise

export function initializeServer() {
  startupPromise ??= initialize()
  return startupPromise
}

async function initialize() {
  assertProductionConfig()
  if (process.env.NODE_ENV !== 'production') return

  let issues
  try {
    issues = await productionDatabaseIssues(pool, cleanupPool)
    issues.push(...await photoStorageIssues())
  } catch {
    throw new Error('Production database and photo-storage preflight could not complete')
  }

  if (issues.length) {
    throw new Error(`Production database preflight failed:\n- ${issues.join('\n- ')}`)
  }
}

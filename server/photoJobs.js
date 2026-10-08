const MAX_JOBS_PER_BATCH = 5

export function createPhotoJobProcessor({ pool, removeObject, batchSize = MAX_JOBS_PER_BATCH }) {
  return async function processPhotoJobs() {
    if (!pool) return { processed: 0, deleted: 0, failed: 0 }

    const db = await pool.connect()
    let committed = false
    let processed = 0
    let deleted = 0
    let failed = 0
    try {
      await db.query('BEGIN')
      const { rows } = await db.query(`SELECT path FROM roomy_photo_cleanup
        ORDER BY queued_at, path LIMIT $1 FOR UPDATE SKIP LOCKED`, [batchSize])

      for (const job of rows) {
        processed += 1
        let removalError
        try {
          await removeObject(job.path)
        } catch (error) {
          removalError = error
        }

        if (removalError) {
          failed += 1
          const message = String(removalError.message || 'Photo cleanup failed').slice(0, 500)
          await db.query(`UPDATE roomy_photo_cleanup
            SET attempts=attempts+1, queued_at=now(), last_error=$2 WHERE path=$1`,
          [job.path, message])
        } else {
          await db.query('DELETE FROM roomy_photo_cleanup WHERE path=$1', [job.path])
          deleted += 1
        }
      }

      await db.query('COMMIT')
      committed = true
      return { processed, deleted, failed }
    } catch (error) {
      if (!committed) await db.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      db.release()
    }
  }
}

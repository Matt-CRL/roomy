import test from 'node:test'
import assert from 'node:assert/strict'
import { createPhotoJobProcessor } from '../photoJobs.js'

function fakePool(jobs) {
  const statements = []
  let released = false
  const client = {
    async query(sql, values) {
      statements.push({ sql, values })
      if (sql.includes('SELECT path FROM roomy_photo_cleanup')) return { rows: jobs }
      return { rows: [] }
    },
    release() { released = true },
  }
  return {
    pool: { async connect() { return client } },
    statements,
    wasReleased: () => released,
  }
}

test('photo cleanup locks a small batch and continues after a failed object deletion', async () => {
  const state = fakePool([{ path: 'owner/item/old.png' }, { path: 'owner/item/new.png' }])
  const removed = []
  const processJobs = createPhotoJobProcessor({
    pool: state.pool,
    batchSize: 5,
    async removeObject(path) {
      removed.push(path)
      if (path.endsWith('old.png')) throw new Error('temporary storage error')
    },
  })

  assert.deepEqual(await processJobs(), { processed: 2, deleted: 1, failed: 1 })
  assert.deepEqual(removed, ['owner/item/old.png', 'owner/item/new.png'])
  assert.match(state.statements[1].sql, /ORDER BY queued_at, path LIMIT \$1 FOR UPDATE SKIP LOCKED/)
  assert.equal(state.statements[1].values[0], 5)
  assert.ok(state.statements.some(({ sql }) => /SET attempts=attempts\+1, queued_at=now\(\), last_error=\$2/.test(sql)))
  assert.ok(state.statements.some(({ sql }) => sql === 'DELETE FROM roomy_photo_cleanup WHERE path=$1'))
  assert.equal(state.statements.at(-1).sql, 'COMMIT')
  assert.equal(state.wasReleased(), true)
})

test('photo cleanup rolls back and releases its connection when the queue query fails', async () => {
  let released = false
  const pool = { async connect() {
    return {
      async query(sql) {
        if (sql.startsWith('SELECT')) throw new Error('temporary database error')
        return { rows: [] }
      },
      release() { released = true },
    }
  } }

  await assert.rejects(createPhotoJobProcessor({ pool, async removeObject() {} })(), /temporary database error/)
  assert.equal(released, true)
})

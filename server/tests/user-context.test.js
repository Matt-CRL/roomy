import test from 'node:test'
import assert from 'node:assert/strict'
import { hasUserContext, withUserContext } from '../db/userContext.js'
import { transaction } from '../roomyRepo.js'

function fakePool() {
  const calls = []
  let released = 0
  const client = {
    async query(sql, values) {
      calls.push({ sql, values })
      return { rows: [] }
    },
    release() { released += 1 },
  }
  return { calls, client, pool: { async connect() { return client } }, released: () => released }
}

test('user identity is transaction-local and nested repository work uses savepoints', async () => {
  const state = fakePool()
  const ownerId = '139c4fac-12a6-414b-95d3-55ea70b82f61'
  await withUserContext(state.pool, ownerId, async (db) => {
    assert.equal(hasUserContext(db), true)
    await transaction(db, async (tx) => tx.query('SELECT 1'))
  })

  assert.equal(state.calls[0].sql, 'BEGIN')
  assert.equal(state.calls[1].sql, "SELECT set_config('roomy.user_id', $1, true)")
  assert.deepEqual(state.calls[1].values, [ownerId])
  assert.match(state.calls[2].sql, /^SAVEPOINT roomy_nested_/)
  assert.match(state.calls.at(-1).sql, /^COMMIT$/)
  assert.equal(state.released(), 1)
  assert.equal(hasUserContext(state.client), false)
})

test('failed user work rolls back and releases the connection context', async () => {
  const state = fakePool()
  await assert.rejects(withUserContext(state.pool, '139c4fac-12a6-414b-95d3-55ea70b82f61', async (db) => {
    assert.equal(hasUserContext(db), true)
    throw new Error('expected test failure')
  }), /expected test failure/)
  assert.equal(state.calls.at(-1).sql, 'ROLLBACK')
  assert.equal(state.released(), 1)
  assert.equal(hasUserContext(state.client), false)
})

test('nested repository failure rolls back to its savepoint without closing user context', async () => {
  const state = fakePool()
  await withUserContext(state.pool, '139c4fac-12a6-414b-95d3-55ea70b82f61', async (db) => {
    await assert.rejects(transaction(db, async () => { throw new Error('nested failure') }), /nested failure/)
    assert.equal(hasUserContext(db), true)
  })
  assert.ok(state.calls.some(({ sql }) => /^ROLLBACK TO SAVEPOINT roomy_nested_/.test(sql)))
  assert.match(state.calls.at(-1).sql, /^COMMIT$/)
})

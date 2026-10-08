import test from 'node:test'
import assert from 'node:assert/strict'

test('health is public and Roomy data is protected', async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/roomy_test'
  process.env.CRON_SECRET = 'private-test-cron-secret-longer-than-32-chars'
  const { app } = await import('../app.js')
  const { pool } = await import('../db/pool.js')
  const server = app.listen(0)
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    const health = await fetch(`${base}/healthz`)
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { ok: true })
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(health.headers.get('x-frame-options'), 'DENY')
    assert.equal(health.headers.get('x-powered-by'), null)
    const privateResponse = await fetch(`${base}/api/rooms`)
    assert.equal(privateResponse.status, 401)
    const accountResponse = await fetch(`${base}/api/account`, { method: 'DELETE' })
    assert.equal(accountResponse.status, 401)

    const cronUrl = `${base}/api/cron/photo-cleanup`
    assert.equal((await fetch(cronUrl)).status, 401)
    assert.equal((await fetch(cronUrl, { headers: { authorization: 'Bearer wrong-secret' } })).status, 401)
    const cron = await fetch(cronUrl, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    assert.equal(cron.status, 200)
    assert.deepEqual(await cron.json(), { ok: true, processed: 0, deleted: 0, failed: 0 })
    assert.equal(cron.headers.get('cache-control'), 'no-store')

  } finally {
    await new Promise((resolve) => server.close(resolve))
    await pool.end()
  }
})

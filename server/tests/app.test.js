import test from 'node:test'
import assert from 'node:assert/strict'

test('health is public and Roomy data is protected', async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/roomy_test'
  const { app } = await import('../app.js')
  const { pool } = await import('../db/pool.js')
  const server = app.listen(0)
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    const health = await fetch(`${base}/healthz`)
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { ok: true })
    const privateResponse = await fetch(`${base}/api/rooms`)
    assert.equal(privateResponse.status, 401)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await pool.end()
  }
})

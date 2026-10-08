import test from 'node:test'
import assert from 'node:assert/strict'

test('Vercel entry exports the guarded Express app without opening a listener', async () => {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/roomy_test'
  const { default: app } = await import('../index.js')
  assert.equal(typeof app, 'function')
})

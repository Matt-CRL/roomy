import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('Vercel schedules one daily authenticated photo-cleanup request', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.deepEqual(config.crons, [{ path: '/api/cron/photo-cleanup', schedule: '0 4 * * *' }])
})

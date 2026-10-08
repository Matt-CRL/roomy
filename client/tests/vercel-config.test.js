import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isItemPhotoSizeAllowed, MAX_ITEM_PHOTO_BYTES } from '../src/utils/itemPhotoSize.js'

test('Vercel frontend sends application deep links to the SPA entry and adds browser security headers', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }])
  const headers = config.headers.flatMap((rule) => rule.headers)
  for (const name of ['Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
    assert.ok(headers.some((header) => header.key === name), `missing ${name}`)
  }
})

test('item photo limit accepts 4 MiB and rejects files above the Vercel function request limit', () => {
  assert.equal(MAX_ITEM_PHOTO_BYTES, 4 * 1024 * 1024)
  assert.equal(isItemPhotoSizeAllowed(MAX_ITEM_PHOTO_BYTES), true)
  assert.equal(isItemPhotoSizeAllowed(MAX_ITEM_PHOTO_BYTES + 1), false)
  assert.equal(isItemPhotoSizeAllowed(Number.NaN), false)
})

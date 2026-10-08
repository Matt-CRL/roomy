import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { photoUploadBodyParser } from '../photoBody.js'
import { MAX_ITEM_PHOTO_BYTES } from '../photoLimits.js'

test('photo upload parser accepts exactly 4 MiB and rejects a larger body', async () => {
  const app = express()
  app.post('/photo', photoUploadBodyParser, (request, response) => response.sendStatus(204))
  app.use((error, request, response, next) => {
    if (error.type === 'entity.too.large') return response.sendStatus(413)
    return next(error)
  })
  const server = app.listen(0)
  try {
    const url = `http://127.0.0.1:${server.address().port}/photo`
    const boundary = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'image/png' },
      body: new Uint8Array(MAX_ITEM_PHOTO_BYTES),
    })
    assert.equal(boundary.status, 204)
    const tooLarge = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'image/png' },
      body: new Uint8Array(MAX_ITEM_PHOTO_BYTES + 1),
    })
    assert.equal(tooLarge.status, 413)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})

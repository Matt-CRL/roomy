import test from 'node:test'
import assert from 'node:assert/strict'
import { fromPublicPath, publicAssetPath, toPublicPath } from '../src/utils/appBasePath.js'

test('base-path conversion stays at the origin root during local development', () => {
  assert.equal(fromPublicPath('/rooms/abc'), '/rooms/abc')
  assert.equal(toPublicPath('/rooms/abc'), '/rooms/abc')
  assert.equal(publicAssetPath('roomy-loading.mp4'), '/roomy-loading.mp4')
})

test('base-path conversion strips/adds the GitHub Pages repository prefix', () => {
  const prefix = '/roomy/'
  assert.equal(fromPublicPath('/roomy/rooms/abc/planner', prefix), '/rooms/abc/planner')
  assert.equal(fromPublicPath('/roomy', prefix), '/')
  assert.equal(fromPublicPath('/other/rooms/abc', prefix), '/')
  assert.equal(toPublicPath('/rooms/abc/planner', prefix), '/roomy/rooms/abc/planner')
  assert.equal(publicAssetPath('cursor-trail/phone.png', prefix), '/roomy/cursor-trail/phone.png')
})

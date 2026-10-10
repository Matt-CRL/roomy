import test from 'node:test'
import assert from 'node:assert/strict'
import { getViewportMenuPosition } from '../src/utils/viewportMenu.js'

test('clamps a room menu away from the right viewport edge', () => {
  assert.deepEqual(getViewportMenuPosition({
    trigger: { top: 240, right: 318, bottom: 280 },
    menu: { width: 144, height: 92 },
    viewportWidth: 320,
    viewportHeight: 640,
  }), { left: 168, top: 140 })
})

test('opens below a trigger near the top edge', () => {
  assert.deepEqual(getViewportMenuPosition({
    trigger: { top: 12, right: 180, bottom: 44 },
    menu: { width: 144, height: 92 },
    viewportWidth: 360,
    viewportHeight: 640,
  }), { left: 36, top: 52 })
})

test('chooses the side with enough room and stays within short viewports', () => {
  assert.deepEqual(getViewportMenuPosition({
    trigger: { top: 82, right: 200, bottom: 114 },
    menu: { width: 144, height: 92 },
    viewportWidth: 360,
    viewportHeight: 180,
  }), { left: 56, top: 8 })
})

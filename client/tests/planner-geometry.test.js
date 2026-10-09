import test from 'node:test'
import assert from 'node:assert/strict'
import { clampShapePosition, minimumRoomDimensions, shapeFitsRoom } from '../src/utils/plannerGeometry.js'

test('a rotated long item can move to room walls without changing its size', () => {
  const shape = { x: 0, y: 0, width: 108.33, depth: 35, rotation: 90 }
  const minimum = minimumRoomDimensions([shape])
  const positioned = clampShapePosition(shape, minimum.width, minimum.depth)

  assert.deepEqual(minimum, { width: 35.01, depth: 108.34 })
  assert.ok(positioned.x < 0)
  assert.equal(positioned.width, shape.width)
  assert.equal(positioned.depth, shape.depth)
  assert.ok(shapeFitsRoom(positioned, minimum.width, minimum.depth))
})

test('unrotated shapes still clamp their origins to zero', () => {
  const shape = { x: -10, y: -10, width: 30, depth: 30, rotation: 0 }
  const positioned = clampShapePosition(shape, 100, 100)

  assert.equal(positioned.x, 0)
  assert.equal(positioned.y, 0)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { moveLayerOrder, normalizeLayerOrder } from './layerOrder.js'

test('layer normalization sorts explicit orders and keeps input order as the legacy fallback', () => {
  const normalized = normalizeLayerOrder([
    { itemId: 'front', layerOrder: 4 },
    { itemId: 'legacy' },
    { itemId: 'back', layerOrder: 0 },
  ])

  assert.deepEqual(normalized.map(({ itemId, layerOrder }) => [itemId, layerOrder]), [
    ['back', 0],
    ['legacy', 1],
    ['front', 2],
  ])
  assert.deepEqual(normalizeLayerOrder([{ itemId: 'one' }, { itemId: 'two' }]).map((item) => item.itemId), ['one', 'two'])
})

test('moving one layer swaps adjacent objects and compacts their layer values', () => {
  const shapes = [
    { itemId: 'desk', layerOrder: 0, color: '#123456' },
    { itemId: 'figure', layerOrder: 1, color: '#abcdef' },
    { itemId: 'lamp', layerOrder: 2 },
  ]

  const forward = moveLayerOrder(shapes, 'desk', 1)
  assert.deepEqual(forward.map(({ itemId, layerOrder }) => [itemId, layerOrder]), [
    ['figure', 0],
    ['desk', 1],
    ['lamp', 2],
  ])
  assert.equal(forward[1].color, '#123456')

  const backward = moveLayerOrder(forward, 'desk', -1)
  assert.deepEqual(backward.map(({ itemId, layerOrder }) => [itemId, layerOrder]), [
    ['desk', 0],
    ['figure', 1],
    ['lamp', 2],
  ])
})

test('layer moves stop at the back and front boundaries', () => {
  const shapes = [{ itemId: 'desk' }, { itemId: 'figure' }]
  assert.equal(moveLayerOrder(shapes, 'desk', -1), shapes)
  assert.equal(moveLayerOrder(shapes, 'figure', 1), shapes)
  assert.equal(moveLayerOrder(shapes, 'missing', 1), shapes)
})

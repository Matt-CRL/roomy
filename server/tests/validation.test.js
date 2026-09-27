import test from 'node:test'
import assert from 'node:assert/strict'
import { roomInput, itemInput, contentsDecision, layoutInput } from '../validation.js'

test('room dimensions must be a positive cm pair', () => {
  assert.deepEqual(roomInput({ name: ' Bedroom ', widthCm: 300, depthCm: 420 }),
    { name: 'Bedroom', widthCm: 300, depthCm: 420 })
  assert.throws(() => roomInput({ name: 'Bedroom', widthCm: 0, depthCm: 300 }), /widthCm/)
  assert.throws(() => roomInput({ name: 'Bedroom', widthCm: 300 }), /together/)
})

test('items cannot skip name, category, or storage choice', () => {
  assert.throws(() => itemInput({ name: '', category: 'Furniture', isStorageUnit: false }), /name/)
  assert.throws(() => itemInput({ name: 'Chair', category: '', isStorageUnit: false }), /category/)
  assert.throws(() => itemInput({ name: 'Chair', category: 'Furniture' }), /isStorageUnit/)
  assert.equal(itemInput({ name: 'Chair', category: 'Furniture', isStorageUnit: false }).name, 'Chair')
})

test('item photo display settings use safe defaults and supported values', () => {
  assert.deepEqual(
    itemInput({ name: 'Chair', category: 'Furniture', isStorageUnit: false }).photoFit,
    'cover',
  )
  assert.deepEqual(
    itemInput({
      name: 'Chair', category: 'Furniture', isStorageUnit: false,
      photoFit: 'contain', photoPosition: 'bottom',
      photoPositionX: 24, photoPositionY: 72, photoZoom: 1.5,
    }),
    {
      name: 'Chair', category: 'Furniture', notes: '', isStorageUnit: false,
      parentStorageId: null, widthCm: null, depthCm: null,
      photoFit: 'contain', photoPosition: 'bottom',
      photoPositionX: 24, photoPositionY: 72, photoZoom: 1.5,
    },
  )
  assert.throws(() => itemInput({ name: 'Chair', category: 'Furniture', isStorageUnit: false, photoFit: 'fill' }), /photoFit/)
  assert.throws(() => itemInput({ name: 'Chair', category: 'Furniture', isStorageUnit: false, photoPosition: 'middle' }), /photoPosition/)
  assert.throws(() => itemInput({ name: 'Chair', category: 'Furniture', isStorageUnit: false, photoPositionX: 101 }), /photoPositionX/)
  assert.throws(() => itemInput({ name: 'Chair', category: 'Furniture', isStorageUnit: false, photoZoom: 0.5 }), /photoZoom/)
})

test('nonempty storage requires an explicit contents decision and reviewed version', () => {
  assert.throws(() => contentsDecision({ includeContents: true }), /Refresh/)
  assert.throws(() => contentsDecision({ contentsVersion: 'a'.repeat(64) }), /Choose/)
  assert.deepEqual(contentsDecision({ includeContents: false, contentsVersion: 'a'.repeat(64) }),
    { includeContents: false, contentsVersion: 'a'.repeat(64) })
})

test('layout rejects duplicates and shapes beyond user room dimensions', () => {
  const room = { width_cm: 300, depth_cm: 400 }
  const shape = { itemId: 'bfa3aca1-45c4-4c93-8fdc-e781059e050a', x: 250, y: 20, width: 40, depth: 60 }
  assert.equal(layoutInput({ revision: 0, items: [shape] }, room).items.length, 1)
  assert.equal(layoutInput({ revision: 0, items: [{ ...shape, x: 0.29 }] }, room).items[0].x, 0.29)
  assert.throws(() => layoutInput({ revision: 0, items: [shape, shape] }, room), /once/)
  assert.throws(() => layoutInput({ revision: 0, items: [{ ...shape, width: 51 }] }, room), /outside/)
})

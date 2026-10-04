import test from 'node:test'
import assert from 'node:assert/strict'
import { roomInput, itemInput, contentsDecision, layoutInput } from '../validation.js'
import { saveLayout } from '../roomyRepo.js'

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
  assert.equal(layoutInput({ revision: 0, items: [shape] }, room).items[0].color, '#1d1b31')
  assert.equal(layoutInput({ revision: 0, items: [{ ...shape, x: 0.29 }] }, room).items[0].x, 0.29)
  assert.deepEqual(layoutInput({ revision: 0, widthCm: 320, depthCm: 420, items: [shape] }, room).widthCm, 320)
  assert.throws(() => layoutInput({ revision: 0, items: [shape, shape] }, room), /once/)
  assert.throws(() => layoutInput({ revision: 0, items: [{ ...shape, width: 51 }] }, room), /outside/)
  assert.throws(() => layoutInput({ revision: 0, items: [{ ...shape, rotation: 45 }] }, room), /outside/)
  assert.throws(() => layoutInput({ revision: 0, widthCm: 300, items: [shape] }, room), /together/)
})

test('planner save updates the room and placed item dimensions in one transaction', async () => {
  const ownerId = 'test-owner'
  const roomId = '5ac095c1-6d15-436b-a764-f62bb4d7537f'
  const itemId = 'bfa3aca1-45c4-4c93-8fdc-e781059e050a'
  const calls = []
  const room = {
    id: roomId, owner_id: ownerId, name: 'Bedroom', width_cm: 300, depth_cm: 400,
    created_at: new Date(), updated_at: new Date(),
  }
  const shape = { itemId, x: 40, y: 50, width: 120, depth: 80, rotation: 0, color: '#f97316' }
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values })
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] }
      if (sql.startsWith('SELECT id, owner_id, name, width_cm')) return { rows: [room] }
      if (sql.startsWith('SELECT revision FROM roomy_layouts')) return { rows: [{ revision: 0 }] }
      if (sql.startsWith('SELECT id,parent_storage_id')) return { rows: [{ id: itemId, parent_storage_id: null }], rowCount: 1 }
      if (sql.startsWith('UPDATE roomy_rooms')) {
        room.width_cm = values[2]
        room.depth_cm = values[3]
        return { rows: [] }
      }
      if (sql.startsWith('SELECT revision,updated_at FROM roomy_layouts')) return { rows: [{ revision: 1, updated_at: new Date() }] }
      if (sql.startsWith('SELECT item_id,x,y,width,depth,rotation,color FROM roomy_layout_items')) {
        return { rows: [{ item_id: itemId, x: 40, y: 50, width: 120, depth: 80, rotation: 0, color: '#f97316' }] }
      }
      return { rows: [] }
    },
    release() {},
  }

  const saved = await saveLayout({ connect: async () => client }, ownerId, roomId, () => ({
    revision: 0, widthCm: 360, depthCm: 440, items: [shape],
  }))

  assert.equal(saved.widthCm, 360)
  assert.equal(saved.depthCm, 440)
  assert.ok(calls.some(({ sql, values }) => sql.startsWith('UPDATE roomy_items SET width_cm') && values[3] === 120 && values[4] === 80))
  assert.ok(calls.some(({ sql, values }) => sql.startsWith('UPDATE roomy_rooms SET width_cm') && values[2] === 360 && values[3] === 440))
  assert.equal(calls[0].sql, 'BEGIN')
  assert.equal(calls.at(-1).sql, 'COMMIT')
})

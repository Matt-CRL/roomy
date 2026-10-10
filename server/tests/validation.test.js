import test from 'node:test'
import assert from 'node:assert/strict'
import { roomInput, itemInput, contentsDecision, layoutInput } from '../validation.js'
import { getLayout, saveLayout, updateItem } from '../roomyRepo.js'

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

test('layout accepts negative unrotated origins only when the rotated footprint stays inside the room', () => {
  const room = { width_cm: 35.01, depth_cm: 108.34 }
  const shape = {
    itemId: 'bfa3aca1-45c4-4c93-93c0-e781059e050a',
    x: -36.66,
    y: 36.67,
    width: 108.33,
    depth: 35,
    rotation: 90,
  }

  assert.equal(layoutInput({ revision: 0, items: [shape] }, room).items[0].x, -36.66)
  assert.throws(() => layoutInput({ revision: 0, items: [{ ...shape, x: -36.67 }] }, room), /outside/)
  assert.throws(() => layoutInput({ revision: 0, items: [{ ...shape, rotation: 0 }] }, room), /outside/)
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

test('editing placed item dimensions invalidates stale planner revisions', async () => {
  const ownerId = 'test-owner'
  const roomId = '5ac095c1-6d15-436b-a764-f62bb4d7537f'
  const itemId = 'bfa3aca1-45c4-4c93-8fdc-e781059e050a'
  const calls = []
  const item = {
    id: itemId, owner_id: ownerId, room_id: roomId, name: 'Desk', category: 'Furniture',
    notes: '', is_storage_unit: false, parent_storage_id: null, width_cm: 80.5,
    depth_cm: 60.25, photo_path: null, photo_fit: 'cover', photo_position: 'center',
    photo_position_x: 50, photo_position_y: 50, photo_zoom: 1,
    created_at: new Date(), updated_at: new Date('2026-10-09T00:00:00.000Z'),
  }
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values })
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] }
      if (sql.startsWith('SELECT id, owner_id, room_id')) return { rows: [{ ...item }] }
      if (sql.startsWith('SELECT 1 FROM roomy_categories')) return { rows: [{}], rowCount: 1 }
      if (sql.startsWith('SELECT li.x,li.y')) return { rows: [{
        x: 40, y: 50, width: 80.5, depth: 60.25, rotation: 90, width_cm: 300, depth_cm: 400,
      }] }
      if (sql.startsWith('UPDATE roomy_layouts SET revision=revision+1')) return { rows: [], rowCount: 1 }
      if (sql.startsWith('UPDATE roomy_items SET name=')) {
        item.width_cm = values[7]
        item.depth_cm = values[8]
        item.updated_at = new Date('2026-10-10T00:00:00.000Z')
        return { rows: [{ ...item }] }
      }
      return { rows: [] }
    },
    release() {},
  }

  const updated = await updateItem({ connect: async () => client }, ownerId, itemId, {
    widthCm: 80.5,
    depthCm: 45.25,
  })

  assert.equal(updated.widthCm, 80.5)
  assert.equal(updated.depthCm, 45.25)
  assert.ok(calls.some(({ sql }) => sql.startsWith('UPDATE roomy_layouts SET revision=revision+1')))
  const placementUpdate = calls.find(({ sql }) => sql.startsWith('UPDATE roomy_layout_items SET x='))
  assert.deepEqual(placementUpdate.values.slice(2, 6), [40, 57.5, 80.5, 45.25])
  assert.ok(calls.findIndex(({ sql }) => sql.startsWith('UPDATE roomy_layouts SET revision=revision+1')) <
    calls.findIndex(({ sql }) => sql.startsWith('UPDATE roomy_layout_items SET x=')))
  assert.ok(calls.findIndex(({ sql }) => sql.startsWith('UPDATE roomy_layout_items SET x=')) <
    calls.findIndex(({ sql }) => sql.startsWith('UPDATE roomy_items SET name=')))
})

test('editing a placed item cannot set dimensions beyond its rotated room bounds', async () => {
  const ownerId = 'test-owner'
  const roomId = '5ac095c1-6d15-436b-a764-f62bb4d7537f'
  const itemId = 'bfa3aca1-45c4-4c93-8fdc-e781059e050a'
  const calls = []
  const item = {
    id: itemId, owner_id: ownerId, room_id: roomId, name: 'Shelf', category: 'Furniture',
    notes: '', is_storage_unit: true, parent_storage_id: null, width_cm: 108.33,
    depth_cm: 35, photo_path: null, photo_fit: 'cover', photo_position: 'center',
    photo_position_x: 50, photo_position_y: 50, photo_zoom: 1,
    created_at: new Date(), updated_at: new Date(),
  }
  const client = {
    async query(sql) {
      calls.push(sql)
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] }
      if (sql.startsWith('SELECT id, owner_id, room_id')) return { rows: [{ ...item }] }
      if (sql.startsWith('SELECT 1 FROM roomy_categories')) return { rows: [{}], rowCount: 1 }
      if (sql.startsWith('SELECT li.x,li.y')) return { rows: [{
        x: -36.66, y: 36.67, width: 108.33, depth: 35, rotation: 90,
        width_cm: 35.01, depth_cm: 108.34,
      }] }
      return { rows: [] }
    },
    release() {},
  }

  await assert.rejects(
    updateItem({ connect: async () => client }, ownerId, itemId, { widthCm: 120, depthCm: 35 }),
    /extend beyond the room boundaries/,
  )
  assert.equal(calls.some((sql) => sql.startsWith('UPDATE roomy_items SET name=')), false)
})

test('planner reads synchronized placement dimensions after an item form edit', async () => {
  const ownerId = 'test-owner'
  const roomId = '5ac095c1-6d15-436b-a764-f62bb4d7537f'
  let shapesQuery = ''
  const room = { id: roomId, owner_id: ownerId, name: 'Test', width_cm: 300, depth_cm: 400 }
  const db = {
    async query(sql) {
      if (sql.startsWith('SELECT id, owner_id, name, width_cm')) return { rows: [room] }
      if (sql.startsWith('SELECT revision,updated_at FROM roomy_layouts')) {
        return { rows: [{ revision: 2, updated_at: new Date('2026-10-09T00:00:00.000Z') }] }
      }
      if (sql.startsWith('SELECT item_id,x,y,width,depth,rotation,color FROM roomy_layout_items')) {
        shapesQuery = sql
        return { rows: [{ item_id: 'bfa3aca1-45c4-4c93-8fdc-e781059e050a',
          x: 40, y: 57.5, width: 80.5, depth: 45.25, rotation: 90, color: '#f97316' }] }
      }
      return { rows: [] }
    },
  }

  const layout = await getLayout(db, ownerId, roomId)

  assert.equal(layout.items[0].width, 80.5)
  assert.equal(layout.items[0].depth, 45.25)
  assert.equal(layout.items[0].x, 40)
  assert.equal(layout.items[0].y, 57.5)
  assert.match(shapesQuery, /FROM roomy_layout_items/)
})

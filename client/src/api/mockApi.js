// Browser-only Roomy adapter for the visible demo mode.

import { categories } from '../data/categoryOptions'

const ROOMS = 'roomy:rooms'
const ITEMS = 'roomy:items'
const LAYOUTS = 'roomy:layouts'

const readRows = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
const saveRows = (key, rows) => localStorage.setItem(key, JSON.stringify(rows))
const missing = () => { throw new Error('Not found') }
const wait = () => new Promise((resolve) => setTimeout(resolve, 150))

export async function listRooms() {
  await wait()
  const items = readRows(ITEMS)
  return readRows(ROOMS).map((room) => ({ ...room,
    itemCount: items.filter((item) => item.roomId === room.id).length,
    storageCount: items.filter((item) => item.roomId === room.id && item.isStorageUnit).length,
  }))
}
export async function getRoom(id) { return (await listRooms()).find((room) => room.id === id) || missing() }
export async function createRoom(input) {
  await wait()
  const room = { ...input, id: crypto.randomUUID(), itemCount: 0, storageCount: 0, createdAt: input.createdAt || new Date().toISOString() }
  saveRows(ROOMS, [...readRows(ROOMS), room])
  return room
}
export async function updateRoom(id, input) {
  await wait()
  const rooms = readRows(ROOMS)
  const index = rooms.findIndex((room) => room.id === id)
  if (index < 0) missing()
  rooms[index] = { ...rooms[index], ...input }
  saveRows(ROOMS, rooms)
  return rooms[index]
}
export async function deleteRoom(id) {
  await wait()
  saveRows(ROOMS, readRows(ROOMS).filter((room) => room.id !== id))
  saveRows(ITEMS, readRows(ITEMS).filter((item) => item.roomId !== id))
}
export async function listCategories() {
  return categories
}
export async function listItems(roomId, filters = {}) {
  await wait()
  return readRows(ITEMS).filter((item) => item.roomId === roomId)
    .filter((item) => !filters.q || item.name.toLowerCase().includes(filters.q.toLowerCase()))
    .filter((item) => !filters.type || filters.type === 'all' || item.isStorageUnit === (filters.type === 'storage'))
    .filter((item) => !filters.categories || filters.categories.split(',').includes(item.category))
}
export async function getItem(id) {
  const item = readRows(ITEMS).find((entry) => entry.id === id) || missing()
  return { ...item, storedCount: readRows(ITEMS).filter((entry) => entry.parentStorageId === id).length }
}
export async function createItem(roomId, input) {
  await wait()
  const item = { ...input, id: crypto.randomUUID(), roomId, storedCount: 0 }
  saveRows(ITEMS, [...readRows(ITEMS), item])
  return item
}
export async function updateItem(id, input) {
  await wait()
  const items = readRows(ITEMS)
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) missing()
  items[index] = { ...items[index], ...input }
  saveRows(ITEMS, items)
  return items[index]
}
export async function getContents(id) {
  const items = readRows(ITEMS).filter((item) => item.parentStorageId === id)
  const bytes = new TextEncoder().encode(items.map((item) => `${item.id}:${item.updatedAt || ''}`).sort().join('|'))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return { items, contentsVersion: [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('') }
}
export async function moveItem(id, { targetRoomId, includeContents, contentsVersion }) {
  const items = readRows(ITEMS)
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) missing()
  const currentContents = await getContents(id)
  if (currentContents.items.length && (typeof includeContents !== 'boolean' || contentsVersion !== currentContents.contentsVersion)) {
    throw new Error('Storage contents changed. Review the items and confirm again.')
  }
  items[index] = { ...items[index], roomId: targetRoomId, parentStorageId: null }
  for (const child of items.filter((item) => item.parentStorageId === id)) {
    if (includeContents) child.roomId = targetRoomId
    else child.parentStorageId = null
  }
  saveRows(ITEMS, items)
  return items[index]
}
export async function deleteItem(id, { includeContents, contentsVersion } = {}) {
  const items = readRows(ITEMS)
  const currentContents = await getContents(id)
  if (currentContents.items.length && (typeof includeContents !== 'boolean' || contentsVersion !== currentContents.contentsVersion)) {
    throw new Error('Storage contents changed. Review the items and confirm again.')
  }
  saveRows(ITEMS, items.filter((item) => item.id !== id && (item.parentStorageId !== id || !includeContents))
    .map((item) => item.parentStorageId === id ? { ...item, parentStorageId: null } : item))
}
export async function getLayout(roomId) {
  const room = await getRoom(roomId)
  return readRows(LAYOUTS).find((layout) => layout.roomId === roomId) ||
    { roomId, widthCm: room.widthCm ?? null, depthCm: room.depthCm ?? null, revision: 0, items: [] }
}
export async function saveLayout(roomId, input) {
  const layouts = readRows(LAYOUTS)
  const current = await getLayout(roomId)
  if (current.revision !== input.revision) throw new Error('Layout changed; reload first')
  const rooms = readRows(ROOMS)
  const roomIndex = rooms.findIndex((room) => room.id === roomId)
  if (roomIndex < 0) missing()
  const widthCm = input.widthCm ?? rooms[roomIndex].widthCm
  const depthCm = input.depthCm ?? rooms[roomIndex].depthCm
  if (!Number.isFinite(Number(widthCm)) || !Number.isFinite(Number(depthCm)) || Number(widthCm) < 1 || Number(depthCm) < 1) {
    throw new Error('Set room width and depth before saving a layout')
  }
  rooms[roomIndex] = { ...rooms[roomIndex], widthCm: Number(widthCm), depthCm: Number(depthCm) }
  saveRows(ROOMS, rooms)

  const dimensionsByItemId = new Map((input.items || []).map((item) => [item.itemId, item]))
  const nextItems = readRows(ITEMS).map((item) => {
    const shape = dimensionsByItemId.get(item.id)
    return shape
      ? { ...item, widthCm: shape.width, depthCm: shape.depth, width: shape.width, depth: shape.depth }
      : item
  })
  saveRows(ITEMS, nextItems)

  const next = {
    ...current,
    ...input,
    widthCm: Number(widthCm),
    depthCm: Number(depthCm),
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
  }
  saveRows(LAYOUTS, [...layouts.filter((layout) => layout.roomId !== roomId), next])
  return next
}
export async function uploadPhoto() { throw new Error('Photo uploads require the real API') }
export async function getPhoto() { throw new Error('Photo downloads require the real API') }
export async function deletePhoto() { throw new Error('Photo deletion requires the real API') }

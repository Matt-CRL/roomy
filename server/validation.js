import { badRequest } from './errors.js'

const PHOTO_FITS = new Set(['cover', 'contain'])
const PHOTO_POSITIONS = new Set(['center', 'top', 'bottom', 'left', 'right'])

function photoPercentage(value, field, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  const number = Number(value)
  if (typeof value === 'boolean' || !Number.isFinite(number) || number < 0 || number > 100) {
    throw badRequest(`${field} must be between 0 and 100`)
  }
  return number
}

function photoZoom(value, field, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  const number = Number(value)
  if (typeof value === 'boolean' || !Number.isFinite(number) || number < 1 || number > 2) {
    throw badRequest(`${field} must be between 1 and 2`)
  }
  return number
}

export const isUuid = (value) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

export function uuid(value, field = 'id') {
  if (!isUuid(value)) throw badRequest(`${field} must be a UUID`, { [field]: 'Invalid UUID' })
  return value
}

export function string(value, field, max, required = true) {
  if (value == null && !required) return ''
  if (typeof value !== 'string') throw badRequest(`${field} must be text`, { [field]: 'Expected text' })
  const cleaned = value.trim()
  if ((required && !cleaned) || cleaned.length > max) {
    throw badRequest(`${field} must be ${required ? '1 to ' : 'at most '}${max} characters`, { [field]: 'Invalid length' })
  }
  return cleaned
}

function measure(value, field) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  if (typeof value === 'boolean' || !Number.isFinite(number) || number < 1 || number > 100000 || Math.abs(number * 100 - Math.round(number * 100)) > 1e-6) {
    throw badRequest(`${field} must be between 1 and 100000 cm with at most two decimal places`, { [field]: 'Invalid dimension' })
  }
  return number
}

export function dimensions(body) {
  const widthCm = measure(body.widthCm, 'widthCm')
  const depthCm = measure(body.depthCm, 'depthCm')
  if ((widthCm === null) !== (depthCm === null)) throw badRequest('Width and depth must be set together')
  return { widthCm, depthCm }
}

export function roomInput(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Expected a room object')
  const value = {}
  if ('name' in body || !partial) value.name = string(body.name, 'name', 80)
  if ('widthCm' in body || 'depthCm' in body || !partial) Object.assign(value, dimensions(body))
  if (!Object.keys(value).length) throw badRequest('No room fields supplied')
  return value
}

export function itemInput(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Expected an item object')
  const value = {}
  if ('name' in body || !partial) value.name = string(body.name, 'name', 80)
  if ('category' in body || !partial) value.category = string(body.category, 'category', 80)
  if ('notes' in body || !partial) value.notes = string(body.notes ?? '', 'notes', 500, false)
  if ('isStorageUnit' in body || !partial) {
    if (typeof body.isStorageUnit !== 'boolean') throw badRequest('isStorageUnit must be true or false')
    value.isStorageUnit = body.isStorageUnit
  }
  if ('parentStorageId' in body || !partial) value.parentStorageId = body.parentStorageId == null ? null : uuid(body.parentStorageId, 'parentStorageId')
  if ('widthCm' in body || 'depthCm' in body || !partial) Object.assign(value, dimensions(body))
  if ('photoFit' in body || !partial) {
    if (!PHOTO_FITS.has(body.photoFit ?? 'cover')) throw badRequest('photoFit must be cover or contain')
    value.photoFit = body.photoFit ?? 'cover'
  }
  if ('photoPosition' in body || !partial) {
    if (!PHOTO_POSITIONS.has(body.photoPosition ?? 'center')) throw badRequest('photoPosition must be center, top, bottom, left, or right')
    value.photoPosition = body.photoPosition ?? 'center'
  }
  if ('photoPositionX' in body || !partial) value.photoPositionX = photoPercentage(body.photoPositionX, 'photoPositionX', 50)
  if ('photoPositionY' in body || !partial) value.photoPositionY = photoPercentage(body.photoPositionY, 'photoPositionY', 50)
  if ('photoZoom' in body || !partial) value.photoZoom = photoZoom(body.photoZoom, 'photoZoom', 1)
  if (!Object.keys(value).length) throw badRequest('No item fields supplied')
  return value
}

export function contentsDecision(body) {
  if (typeof body?.includeContents !== 'boolean') throw badRequest('Choose whether to include the stored items')
  if (typeof body?.contentsVersion !== 'string' || !/^[a-f0-9]{64}$/.test(body.contentsVersion)) {
    throw badRequest('Refresh the storage contents before confirming')
  }
  return { includeContents: body.includeContents, contentsVersion: body.contentsVersion }
}

export function itemFilters(query) {
  const q = query.q === undefined ? '' : string(query.q, 'q', 100, false)
  const type = query.type ?? 'all'
  if (!['all', 'item', 'storage'].includes(type)) throw badRequest('Invalid item type')
  const categories = query.categories ? String(query.categories).split(',').filter(Boolean) : []
  if (categories.length > 30 || categories.some((category) => category.length > 80)) throw badRequest('Invalid categories')
  const limit = query.limit === undefined ? 100 : Number(query.limit)
  const offset = query.offset === undefined ? 0 : Number(query.offset)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) throw badRequest('Invalid pagination')
  return { q, type, categories, limit, offset }
}

export function layoutInput(body, room) {
  if (!Number.isInteger(body?.revision) || body.revision < 0 || !Array.isArray(body.items) || body.items.length > 500) {
    throw badRequest('Expected revision and up to 500 layout items')
  }
  if (room.width_cm === null || room.depth_cm === null) throw badRequest('Set room width and depth before saving a layout')
  const seen = new Set()
  const items = body.items.map((entry) => {
    const itemId = uuid(entry?.itemId, 'itemId')
    if (seen.has(itemId)) throw badRequest('Each item may appear once in the layout')
    seen.add(itemId)
    const { x, y, width, depth, rotation = 0 } = entry
    for (const [key, value] of Object.entries({ x, y, width, depth, rotation })) {
      if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 100000 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
        throw badRequest(`${key} must be a finite number with at most two decimal places`)
      }
    }
    if (x < 0 || y < 0 || width <= 0 || depth <= 0 || x + width > Number(room.width_cm) || y + depth > Number(room.depth_cm)) {
      throw badRequest('A shape is outside the room dimensions')
    }
    if (rotation < -360 || rotation > 360) throw badRequest('Invalid rotation')
    const color = entry.color ?? '#f97316'
    if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) throw badRequest('Invalid color')
    return { itemId, x, y, width, depth, rotation, color }
  })
  return { revision: body.revision, items }
}

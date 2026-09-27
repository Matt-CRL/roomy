import { createHash, randomUUID } from 'node:crypto'
import { badRequest, conflict, notFound } from './errors.js'

const roomColumns = 'id, owner_id, name, width_cm, depth_cm, created_at, updated_at'
const itemColumns = 'id, owner_id, room_id, name, category, notes, is_storage_unit, parent_storage_id, width_cm, depth_cm, photo_path, photo_fit, photo_position, photo_position_x, photo_position_y, photo_zoom, created_at, updated_at'

export const roomJson = (row) => row && ({
  id: row.id, name: row.name, widthCm: row.width_cm === null ? null : Number(row.width_cm),
  depthCm: row.depth_cm === null ? null : Number(row.depth_cm),
  itemCount: Number(row.item_count ?? 0), storageCount: Number(row.storage_count ?? 0),
  createdAt: row.created_at, updatedAt: row.updated_at,
})

export const itemJson = (row) => row && ({
  id: row.id, roomId: row.room_id, name: row.name, category: row.category,
  notes: row.notes, isStorageUnit: row.is_storage_unit,
  parentStorageId: row.parent_storage_id, storedInside: row.parent_name ?? null,
  storedCount: Number(row.stored_count ?? 0),
  widthCm: row.width_cm === null ? null : Number(row.width_cm),
  depthCm: row.depth_cm === null ? null : Number(row.depth_cm),
  photoFit: row.photo_fit ?? 'cover', photoPosition: row.photo_position ?? 'center',
  photoPositionX: row.photo_position_x === null || row.photo_position_x === undefined ? 50 : Number(row.photo_position_x),
  photoPositionY: row.photo_position_y === null || row.photo_position_y === undefined ? 50 : Number(row.photo_position_y),
  photoZoom: row.photo_zoom === null || row.photo_zoom === undefined ? 1 : Number(row.photo_zoom),
  hasPhoto: Boolean(row.photo_path), createdAt: row.created_at, updatedAt: row.updated_at,
})

export async function transaction(pool, work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function ownedRoom(db, ownerId, roomId, lock = false) {
  const result = await db.query(`SELECT ${roomColumns} FROM roomy_rooms WHERE owner_id=$1 AND id=$2 ${lock ? 'FOR UPDATE' : ''}`, [ownerId, roomId])
  if (!result.rows[0]) throw notFound()
  return result.rows[0]
}

export async function ownedItem(db, ownerId, itemId, lock = false) {
  const result = await db.query(`SELECT ${itemColumns} FROM roomy_items WHERE owner_id=$1 AND id=$2 ${lock ? 'FOR UPDATE' : ''}`, [ownerId, itemId])
  if (!result.rows[0]) throw notFound()
  return result.rows[0]
}

export async function listRooms(db, ownerId) {
  const result = await db.query(`SELECT r.*, count(i.id)::int AS item_count,
    count(i.id) FILTER (WHERE i.is_storage_unit)::int AS storage_count
    FROM roomy_rooms r LEFT JOIN roomy_items i ON i.owner_id=r.owner_id AND i.room_id=r.id
    WHERE r.owner_id=$1 GROUP BY r.id ORDER BY r.created_at, r.id`, [ownerId])
  return result.rows.map(roomJson)
}

export async function createRoom(db, ownerId, input) {
  const result = await db.query(`INSERT INTO roomy_rooms(id,owner_id,name,width_cm,depth_cm)
    VALUES($1,$2,$3,$4,$5) RETURNING *`,
  [randomUUID(), ownerId, input.name, input.widthCm, input.depthCm])
  return roomJson(result.rows[0])
}

export async function updateRoom(pool, ownerId, roomId, input) {
  return transaction(pool, async (db) => {
    const room = await ownedRoom(db, ownerId, roomId, true)
    const width = 'widthCm' in input ? input.widthCm : room.width_cm
    const depth = 'depthCm' in input ? input.depthCm : room.depth_cm
    const placed = await db.query(`SELECT 1 FROM roomy_layout_items WHERE owner_id=$1 AND room_id=$2
      AND ($3::numeric IS NULL OR $4::numeric IS NULL OR x+width>$3 OR y+depth>$4) LIMIT 1`,
    [ownerId, roomId, width, depth])
    if (placed.rowCount) throw conflict('Existing planner shapes would fall outside the new room dimensions')
    const result = await db.query(`UPDATE roomy_rooms SET name=$3,width_cm=$4,depth_cm=$5,updated_at=now()
      WHERE owner_id=$1 AND id=$2 RETURNING *`,
    [ownerId, roomId, input.name ?? room.name, width, depth])
    return roomJson(result.rows[0])
  })
}

export async function deleteRoom(pool, ownerId, roomId) {
  return transaction(pool, async (db) => {
    await ownedRoom(db, ownerId, roomId, true)
    const paths = (await db.query('SELECT photo_path FROM roomy_items WHERE owner_id=$1 AND room_id=$2 AND photo_path IS NOT NULL', [ownerId, roomId])).rows.map((row) => row.photo_path)
    await db.query('DELETE FROM roomy_rooms WHERE owner_id=$1 AND id=$2', [ownerId, roomId])
    await enqueuePhotoCleanup(db, paths)
    return paths
  })
}

export async function listCategories(db) {
  return (await db.query('SELECT name FROM roomy_categories ORDER BY name')).rows.map((row) => row.name)
}

export async function listItems(db, ownerId, roomId, filters) {
  await ownedRoom(db, ownerId, roomId)
  const result = await db.query(`SELECT i.*, parent.name AS parent_name, (SELECT count(*) FROM roomy_items child
      WHERE child.parent_storage_id=i.id)::int AS stored_count
    FROM roomy_items i LEFT JOIN roomy_items parent
      ON parent.id=i.parent_storage_id AND parent.owner_id=i.owner_id
    WHERE i.owner_id=$1 AND i.room_id=$2
      AND ($3='' OR position(lower($3) in lower(i.name))>0
        OR position(lower($3) in lower(i.category))>0
        OR position(lower($3) in lower(parent.name))>0)
      AND ($4='all' OR i.is_storage_unit=($4='storage'))
      AND (cardinality($5::text[])=0 OR i.category=ANY($5))
    ORDER BY i.created_at, i.id LIMIT $6 OFFSET $7`,
  [ownerId, roomId, filters.q, filters.type, filters.categories, filters.limit, filters.offset])
  return result.rows.map(itemJson)
}

export async function getItem(db, ownerId, itemId) {
  const result = await db.query(`SELECT i.*, (SELECT count(*) FROM roomy_items child WHERE child.parent_storage_id=i.id)::int AS stored_count
    FROM roomy_items i WHERE i.owner_id=$1 AND i.id=$2`, [ownerId, itemId])
  if (!result.rows[0]) throw notFound()
  return itemJson(result.rows[0])
}

async function checkCategory(db, category) {
  if (!(await db.query('SELECT 1 FROM roomy_categories WHERE name=$1', [category])).rowCount) throw badRequest('Choose an existing category')
}

async function checkParent(db, ownerId, roomId, parentId) {
  if (!parentId) return
  const parent = await ownedItem(db, ownerId, parentId, true)
  if (parent.room_id !== roomId || !parent.is_storage_unit || parent.parent_storage_id) throw badRequest('Storage must be a storage unit in the same room')
}

export async function createItem(pool, ownerId, roomId, input) {
  return transaction(pool, async (db) => {
    await ownedRoom(db, ownerId, roomId)
    await checkCategory(db, input.category)
    if (input.isStorageUnit && input.parentStorageId) throw badRequest('Storage units cannot be stored inside another item')
    await checkParent(db, ownerId, roomId, input.parentStorageId)
    const result = await db.query(`INSERT INTO roomy_items(id,owner_id,room_id,name,category,notes,is_storage_unit,parent_storage_id,width_cm,depth_cm,photo_fit,photo_position,photo_position_x,photo_position_y,photo_zoom)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [randomUUID(), ownerId, roomId, input.name, input.category, input.notes,
      input.isStorageUnit, input.parentStorageId, input.widthCm, input.depthCm, input.photoFit, input.photoPosition,
      input.photoPositionX, input.photoPositionY, input.photoZoom])
    return itemJson(result.rows[0])
  })
}

export async function updateItem(pool, ownerId, itemId, changes) {
  return transaction(pool, async (db) => {
    const current = await ownedItem(db, ownerId, itemId, true)
    const input = {
      name: changes.name ?? current.name, category: changes.category ?? current.category,
      notes: changes.notes ?? current.notes,
      isStorageUnit: changes.isStorageUnit ?? current.is_storage_unit,
      parentStorageId: 'parentStorageId' in changes ? changes.parentStorageId : current.parent_storage_id,
      widthCm: 'widthCm' in changes ? changes.widthCm : current.width_cm,
      depthCm: 'depthCm' in changes ? changes.depthCm : current.depth_cm,
      photoFit: 'photoFit' in changes ? changes.photoFit : (current.photo_fit ?? 'cover'),
      photoPosition: 'photoPosition' in changes ? changes.photoPosition : (current.photo_position ?? 'center'),
      photoPositionX: 'photoPositionX' in changes ? changes.photoPositionX : (current.photo_position_x ?? 50),
      photoPositionY: 'photoPositionY' in changes ? changes.photoPositionY : (current.photo_position_y ?? 50),
      photoZoom: 'photoZoom' in changes ? changes.photoZoom : (current.photo_zoom ?? 1),
    }
    await checkCategory(db, input.category)
    if (input.isStorageUnit && input.parentStorageId) throw badRequest('Storage units cannot be stored inside another item')
    if (!input.isStorageUnit && current.is_storage_unit) {
      if ((await db.query('SELECT 1 FROM roomy_items WHERE parent_storage_id=$1 LIMIT 1', [itemId])).rowCount) {
        throw conflict('Empty this storage unit before changing it to a regular item')
      }
    }
    await checkParent(db, ownerId, current.room_id, input.parentStorageId)
    if (input.parentStorageId) await db.query('DELETE FROM roomy_layout_items WHERE item_id=$1', [itemId])
    const result = await db.query(`UPDATE roomy_items SET name=$3,category=$4,notes=$5,
      is_storage_unit=$6,parent_storage_id=$7,width_cm=$8,depth_cm=$9,photo_fit=$10,photo_position=$11,
      photo_position_x=$12,photo_position_y=$13,photo_zoom=$14,updated_at=now()
      WHERE owner_id=$1 AND id=$2 RETURNING *`,
    [ownerId, itemId, input.name, input.category, input.notes, input.isStorageUnit,
      input.parentStorageId, input.widthCm, input.depthCm, input.photoFit, input.photoPosition,
      input.photoPositionX, input.photoPositionY, input.photoZoom])
    return itemJson(result.rows[0])
  })
}

function versionFor(rows) {
  return createHash('sha256').update(rows.map((row) => `${row.id}:${new Date(row.updated_at).toISOString()}`).join('|')).digest('hex')
}

export async function storageContents(db, ownerId, itemId) {
  const unit = await ownedItem(db, ownerId, itemId)
  if (!unit.is_storage_unit) throw badRequest('This item is not a storage unit')
  const rows = (await db.query(`SELECT ${itemColumns} FROM roomy_items WHERE owner_id=$1 AND parent_storage_id=$2 ORDER BY id`, [ownerId, itemId])).rows
  return { items: rows.map(itemJson), contentsVersion: versionFor(rows) }
}

async function lockedContents(db, ownerId, unit) {
  const rows = (await db.query(`SELECT ${itemColumns} FROM roomy_items WHERE owner_id=$1 AND parent_storage_id=$2 ORDER BY id FOR UPDATE`, [ownerId, unit.id])).rows
  return rows
}

function checkDecision(rows, decision) {
  if (!rows.length && !decision) return
  if (!decision || versionFor(rows) !== decision.contentsVersion) throw conflict('Storage contents changed. Review the items and confirm again.')
}

export async function moveItem(pool, ownerId, itemId, targetRoomId, decision) {
  return transaction(pool, async (db) => {
    const current = await ownedItem(db, ownerId, itemId, true)
    await ownedRoom(db, ownerId, targetRoomId)
    if (current.room_id === targetRoomId) throw badRequest('Choose a different room')
    const children = current.is_storage_unit ? await lockedContents(db, ownerId, current) : []
    checkDecision(children, decision)
    await db.query('DELETE FROM roomy_layout_items WHERE owner_id=$1 AND item_id=$2', [ownerId, itemId])
    if (children.length) {
      if (decision.includeContents) {
        await db.query('DELETE FROM roomy_layout_items WHERE owner_id=$1 AND item_id=ANY($2::uuid[])', [ownerId, children.map((row) => row.id)])
        await db.query('UPDATE roomy_items SET room_id=$2,updated_at=now() WHERE parent_storage_id=$1', [itemId, targetRoomId])
      } else {
        await db.query('UPDATE roomy_items SET parent_storage_id=NULL,updated_at=now() WHERE parent_storage_id=$1', [itemId])
      }
    }
    const result = await db.query(`UPDATE roomy_items SET room_id=$3,parent_storage_id=NULL,updated_at=now()
      WHERE owner_id=$1 AND id=$2 RETURNING *`, [ownerId, itemId, targetRoomId])
    return itemJson(result.rows[0])
  })
}

export async function deleteItem(pool, ownerId, itemId, decision) {
  return transaction(pool, async (db) => {
    const current = await ownedItem(db, ownerId, itemId, true)
    const children = current.is_storage_unit ? await lockedContents(db, ownerId, current) : []
    checkDecision(children, decision)
    let paths = [current.photo_path].filter(Boolean)
    if (children.length) {
      if (decision.includeContents) {
        paths = paths.concat(children.map((row) => row.photo_path).filter(Boolean))
        await db.query('DELETE FROM roomy_items WHERE owner_id=$1 AND parent_storage_id=$2', [ownerId, itemId])
      } else {
        await db.query('UPDATE roomy_items SET parent_storage_id=NULL,updated_at=now() WHERE owner_id=$1 AND parent_storage_id=$2', [ownerId, itemId])
      }
    }
    await db.query('DELETE FROM roomy_items WHERE owner_id=$1 AND id=$2', [ownerId, itemId])
    await enqueuePhotoCleanup(db, paths)
    return paths
  })
}

export async function enqueuePhotoCleanup(db, paths) {
  for (const path of paths) {
    await db.query('INSERT INTO roomy_photo_cleanup(path) VALUES($1) ON CONFLICT DO NOTHING', [path])
  }
}

export async function getLayout(db, ownerId, roomId) {
  const room = await ownedRoom(db, ownerId, roomId)
  const row = (await db.query('SELECT revision,updated_at FROM roomy_layouts WHERE owner_id=$1 AND room_id=$2', [ownerId, roomId])).rows[0]
  const items = (await db.query(`SELECT item_id,x,y,width,depth,rotation,color FROM roomy_layout_items
    WHERE owner_id=$1 AND room_id=$2 ORDER BY item_id`, [ownerId, roomId])).rows.map((item) => ({
    itemId: item.item_id, x: Number(item.x), y: Number(item.y), width: Number(item.width),
    depth: Number(item.depth), rotation: Number(item.rotation), color: item.color,
  }))
  return { roomId, widthCm: room.width_cm === null ? null : Number(room.width_cm),
    depthCm: room.depth_cm === null ? null : Number(room.depth_cm),
    revision: row?.revision ?? 0, updatedAt: row?.updated_at ?? null, items }
}

export async function saveLayout(pool, ownerId, roomId, validate) {
  return transaction(pool, async (db) => {
    const room = await ownedRoom(db, ownerId, roomId, true)
    const { revision, items } = validate(room)
    await db.query(`INSERT INTO roomy_layouts(room_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [roomId, ownerId])
    const current = (await db.query('SELECT revision FROM roomy_layouts WHERE room_id=$1 AND owner_id=$2 FOR UPDATE', [roomId, ownerId])).rows[0]
    if (current.revision !== revision) throw conflict('This layout changed elsewhere. Reload before saving.')
    if (items.length) {
      const result = await db.query('SELECT id,parent_storage_id FROM roomy_items WHERE owner_id=$1 AND room_id=$2 AND id=ANY($3::uuid[]) FOR UPDATE', [ownerId, roomId, items.map((item) => item.itemId)])
      if (result.rowCount !== items.length || result.rows.some((item) => item.parent_storage_id)) throw badRequest('Only unstored items from this room may be placed')
    }
    await db.query('DELETE FROM roomy_layout_items WHERE owner_id=$1 AND room_id=$2', [ownerId, roomId])
    for (const item of items) {
      await db.query(`INSERT INTO roomy_layout_items(owner_id,room_id,item_id,x,y,width,depth,rotation,color)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [ownerId, roomId, item.itemId, item.x, item.y, item.width, item.depth, item.rotation, item.color])
    }
    await db.query('UPDATE roomy_layouts SET revision=revision+1,updated_at=now() WHERE room_id=$1 AND owner_id=$2', [roomId, ownerId])
    return getLayout(db, ownerId, roomId)
  })
}

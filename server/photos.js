import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { pool } from './db/pool.js'
import { ApiError, badRequest, notFound } from './errors.js'
import { enqueuePhotoCleanup, ownedItem, transaction } from './roomyRepo.js'

const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const secretKey = process.env.SUPABASE_SECRET_KEY
const bucket = process.env.SUPABASE_PHOTO_BUCKET || 'roomy-item-photos'
let storage

function storageBucket() {
  if (!projectUrl || !secretKey) throw new ApiError(503, 'Photo storage is not configured')
  storage ??= createClient(projectUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).storage.from(bucket)
  return storage
}

function imageType(bytes) {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return ['image/jpeg', 'jpg']
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ['image/png', 'png']
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return ['image/webp', 'webp']
  throw new ApiError(415, 'Use a JPEG, PNG, or WebP image')
}

async function removeObject(path) {
  const { error } = await storageBucket().remove([path])
  if (error) throw new ApiError(503, 'Could not clean up a photo')
}

export async function processPhotoJobs() {
  if (!projectUrl || !secretKey) return
  const jobs = (await pool.query('SELECT path FROM roomy_photo_cleanup ORDER BY queued_at LIMIT 20')).rows
  for (const job of jobs) {
    try {
      await removeObject(job.path)
      await pool.query('DELETE FROM roomy_photo_cleanup WHERE path=$1', [job.path])
    } catch (error) {
      await pool.query('UPDATE roomy_photo_cleanup SET attempts=attempts+1,last_error=$2 WHERE path=$1', [job.path, error.message])
    }
  }
}

export async function uploadPhoto(ownerId, itemId, bytes, statedType) {
  const photos = storageBucket()
  if (!Buffer.isBuffer(bytes) || !bytes.length) throw badRequest('Choose an image file')
  const [mime, extension] = imageType(bytes)
  if (mime !== statedType) throw new ApiError(415, 'Image type does not match file content')
  const item = await ownedItem(pool, ownerId, itemId)
  const path = `${ownerId}/${itemId}/${randomUUID()}.${extension}`
  const { error: uploadError } = await photos.upload(path,
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    { contentType: mime, upsert: false })
  if (uploadError) throw new ApiError(503, 'Could not upload photo')
  try {
    await transaction(pool, async (db) => {
      const locked = await ownedItem(db, ownerId, itemId, true)
      await db.query('UPDATE roomy_items SET photo_path=$3,updated_at=now() WHERE owner_id=$1 AND id=$2', [ownerId, itemId, path])
      if (locked.photo_path) await enqueuePhotoCleanup(db, [locked.photo_path])
    })
  } catch (error) {
    await enqueuePhotoCleanup(pool, [path])
    throw error
  }
  return { hasPhoto: true }
}

export async function downloadPhoto(ownerId, itemId) {
  const photos = storageBucket()
  const item = await ownedItem(pool, ownerId, itemId)
  if (!item.photo_path) throw notFound()
  const { data, error } = await photos.download(item.photo_path)
  if (error || !data) throw new ApiError(503, 'Could not load photo')
  return { bytes: Buffer.from(await data.arrayBuffer()), type: data.type || 'application/octet-stream' }
}

export async function deletePhoto(ownerId, itemId) {
  await transaction(pool, async (db) => {
    const item = await ownedItem(db, ownerId, itemId, true)
    if (!item.photo_path) return
    await db.query('UPDATE roomy_items SET photo_path=NULL,updated_at=now() WHERE owner_id=$1 AND id=$2', [ownerId, itemId])
    await enqueuePhotoCleanup(db, [item.photo_path])
  })
}

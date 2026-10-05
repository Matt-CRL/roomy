import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createPool } from './db/pool.js'
import { ApiError, badRequest, notFound } from './errors.js'
import { enqueuePhotoCleanup, ownedItem, transaction } from './roomyRepo.js'
import { afterUserRollback } from './db/userContext.js'

const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const secretKey = process.env.SUPABASE_SECRET_KEY
const bucket = process.env.SUPABASE_PHOTO_BUCKET || 'roomy-item-photos'
let storage
const cleanupDatabaseUrl = process.env.PHOTO_CLEANUP_DATABASE_URL
export const cleanupPool = cleanupDatabaseUrl ? createPool(cleanupDatabaseUrl) : null

export async function photoStorageIssues() {
  if (!projectUrl || !secretKey || !bucket) return ['Supabase Storage configuration is incomplete']
  try {
    const response = await fetch(`${projectUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
      headers: { apikey: secretKey, authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(7000),
    })
    if (!response.ok) return ['Configured photo bucket could not be verified']
    const details = await response.json()
    if (details.public !== false) return ['Configured photo bucket is not private']
    return []
  } catch {
    return ['Configured photo bucket could not be verified']
  }
}

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

async function removeOrQueueOrphan(path) {
  try {
    await removeObject(path)
  } catch {
    if (cleanupPool) {
      await cleanupPool.query('INSERT INTO roomy_photo_cleanup(path) VALUES($1) ON CONFLICT DO NOTHING', [path]).catch(() => {})
    }
  }
}

export async function processPhotoJobs() {
  if (!projectUrl || !secretKey || !cleanupPool) return
  const jobs = (await cleanupPool.query('SELECT path FROM roomy_photo_cleanup ORDER BY queued_at LIMIT 20')).rows
  for (const job of jobs) {
    try {
      await removeObject(job.path)
      await cleanupPool.query('DELETE FROM roomy_photo_cleanup WHERE path=$1', [job.path])
    } catch (error) {
      await cleanupPool.query('UPDATE roomy_photo_cleanup SET attempts=attempts+1,last_error=$2 WHERE path=$1', [job.path, error.message])
    }
  }
}

export async function uploadPhoto(ownerId, itemId, bytes, statedType, db) {
  const photos = storageBucket()
  if (!Buffer.isBuffer(bytes) || !bytes.length) throw badRequest('Choose an image file')
  const [mime, extension] = imageType(bytes)
  if (mime !== statedType) throw new ApiError(415, 'Image type does not match file content')
  await ownedItem(db, ownerId, itemId)
  const path = `${ownerId}/${itemId}/${randomUUID()}.${extension}`
  const { error: uploadError } = await photos.upload(path,
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    { contentType: mime, upsert: false })
  if (uploadError) throw new ApiError(503, 'Could not upload photo')
  try {
    await transaction(db, async (tx) => {
      const locked = await ownedItem(tx, ownerId, itemId, true)
      await tx.query('UPDATE roomy_items SET photo_path=$3,updated_at=now() WHERE owner_id=$1 AND id=$2', [ownerId, itemId, path])
      if (locked.photo_path) await enqueuePhotoCleanup(tx, [locked.photo_path])
    })
    afterUserRollback(db, () => removeOrQueueOrphan(path))
  } catch (error) {
    await removeOrQueueOrphan(path)
    throw error
  }
  return { hasPhoto: true }
}

export async function downloadPhoto(ownerId, itemId, db) {
  const photos = storageBucket()
  const item = await ownedItem(db, ownerId, itemId)
  if (!item.photo_path) throw notFound()
  const { data, error } = await photos.download(item.photo_path)
  if (error || !data) throw new ApiError(503, 'Could not load photo')
  return { bytes: Buffer.from(await data.arrayBuffer()), type: data.type || 'application/octet-stream' }
}

export async function deletePhoto(ownerId, itemId, db) {
  await transaction(db, async (tx) => {
    const item = await ownedItem(tx, ownerId, itemId, true)
    if (!item.photo_path) return
    await tx.query('UPDATE roomy_items SET photo_path=NULL,updated_at=now() WHERE owner_id=$1 AND id=$2', [ownerId, itemId])
    await enqueuePhotoCleanup(tx, [item.photo_path])
  })
}

import { createClient } from '@supabase/supabase-js'
import { pool } from './db/pool.js'
import { ApiError } from './errors.js'
import { transaction } from './roomyRepo.js'

const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const secretKey = process.env.SUPABASE_SECRET_KEY
const bucket = process.env.SUPABASE_PHOTO_BUCKET || 'roomy-item-photos'
let adminClient

function supabaseAdmin() {
  if (!projectUrl || !secretKey) throw new ApiError(503, 'Account deletion is not configured')
  adminClient ??= createClient(projectUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return adminClient
}

export async function deleteAccount(userId) {
  const admin = supabaseAdmin()
  const photoPaths = (await pool.query(
    'SELECT photo_path FROM roomy_items WHERE owner_id=$1 AND photo_path IS NOT NULL',
    [userId],
  )).rows.map((row) => row.photo_path)

  if (photoPaths.length) {
    const { error } = await admin.storage.from(bucket).remove(photoPaths)
    if (error) throw new ApiError(503, 'Could not remove the account photos')
  }

  await transaction(pool, async (db) => {
    await db.query('DELETE FROM roomy_rooms WHERE owner_id=$1', [userId])
    await db.query('DELETE FROM roomy_photo_cleanup WHERE path LIKE $1', [`${userId}/%`])
  })

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new ApiError(503, 'Could not delete the account')
}

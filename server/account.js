import { createClient } from '@supabase/supabase-js'
import { ApiError } from './errors.js'
import { enqueuePhotoCleanup, transaction } from './roomyRepo.js'
import { afterUserCommit } from './db/userContext.js'

const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const secretKey = process.env.SUPABASE_SECRET_KEY
let adminClient

function supabaseAdmin() {
  if (!projectUrl || !secretKey) throw new ApiError(503, 'Account deletion is not configured')
  adminClient ??= createClient(projectUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return adminClient
}

export async function deleteAccount(userId, db) {
  const admin = supabaseAdmin()
  const photoPaths = (await db.query(
    'SELECT photo_path FROM roomy_items WHERE owner_id=$1 AND photo_path IS NOT NULL',
    [userId],
  )).rows.map((row) => row.photo_path)

  await transaction(db, async (tx) => {
    await enqueuePhotoCleanup(tx, photoPaths)
    await tx.query('DELETE FROM roomy_rooms WHERE owner_id=$1', [userId])
  })

  afterUserCommit(db, async () => {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) throw new ApiError(503, 'Could not delete the account')
  })
}

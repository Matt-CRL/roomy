import { ApiError } from './errors.js'
import { isUuid } from './validation.js'

const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY

export async function requireUser(request, response, next) {
  const match = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? '')
  if (!match) return next(new ApiError(401, 'Sign in to continue'))
  if (!projectUrl || !publishableKey) return next(new ApiError(503, 'Authentication is not configured'))

  try {
    // Supabase Auth verifies both the signature and current session on its server.
    // Decoding a JWT locally without verification would allow forged owner IDs.
    const result = await fetch(`${projectUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, authorization: `Bearer ${match[1]}` },
      signal: AbortSignal.timeout(7000),
    })
    if (!result.ok) return next(new ApiError(result.status >= 500 ? 503 : 401, result.status >= 500 ? 'Authentication unavailable' : 'Session expired'))
    const user = await result.json()
    if (!isUuid(user.id)) return next(new ApiError(401, 'Invalid session'))
    request.userId = user.id
    next()
  } catch (error) {
    next(new ApiError(503, 'Authentication unavailable'))
  }
}

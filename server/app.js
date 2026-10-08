import express from 'express'
import cors from 'cors'
import { timingSafeEqual } from 'node:crypto'
import { pool } from './db/pool.js'
import { requireUser } from './auth.js'
import { deleteAccount } from './account.js'
import { ApiError, asyncRoute } from './errors.js'
import { contentsDecision, itemFilters, itemInput, layoutInput, roomInput, uuid } from './validation.js'
import * as repo from './roomyRepo.js'
import * as photos from './photos.js'
import { afterUserCommit, withUserContext } from './db/userContext.js'
import { runtimeDatabaseIssues } from './db/preflight.js'
import { initializeServer } from './startup.js'
import { photoUploadBodyParser } from './photoBody.js'

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean)

export const app = express()
export default app
app.disable('x-powered-by')
app.use((request, response, next) => {
  response.set({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  })
  if (process.env.NODE_ENV === 'production' && process.env.PUBLIC_HTTPS === 'true') {
    response.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '100kb' }))

app.get('/healthz', (request, response) => response.json({ ok: true }))
app.get('/readyz', asyncRoute(async (request, response) => {
  try {
    const issues = await runtimeDatabaseIssues(pool)
    if (issues.length) return response.status(503).json({ ok: false })
    response.json({ ok: true })
  } catch {
    response.status(503).json({ ok: false })
  }
}))

app.get('/api/cron/photo-cleanup', asyncRoute(async (request, response) => {
  const secret = process.env.CRON_SECRET
  const expected = secret ? Buffer.from(`Bearer ${secret}`) : Buffer.alloc(0)
  const supplied = Buffer.from(request.get('authorization') || '')
  if (expected.length < 39 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return response.status(401).set('Cache-Control', 'no-store').json({ error: 'Unauthorized' })
  }

  try {
    const summary = await photos.processPhotoJobs()
    return response.set('Cache-Control', 'no-store').json({ ok: true, ...summary })
  } catch {
    console.error('Photo cleanup batch failed')
    return response.status(500).set('Cache-Control', 'no-store').json({ error: 'Photo cleanup failed' })
  }
}))

app.use('/api', requireUser)

const jsonResult = (body, status = 200) => ({ body, status })
const emptyResult = { status: 204 }
const binaryResult = (body, type) => ({ body, type, status: 200 })

const privateRoute = (handler) => asyncRoute(async (request, response) => {
  const result = await withUserContext(pool, request.userId, async (db) => {
    request.db = db
    return handler(request)
  })
  if (result.status === 204) return response.status(204).end()
  if (result.type) {
    return response.status(result.status).set('Cache-Control', 'private, no-store').type(result.type).send(result.body)
  }
  return response.status(result.status).json(result.body)
})

app.delete('/api/account', privateRoute(async (request) => {
  afterUserCommit(request.db, photos.schedulePhotoCleanup)
  await deleteAccount(request.userId, request.db)
  return emptyResult
}))

app.get('/api/categories', privateRoute(async (request) => jsonResult(await repo.listCategories(request.db))))

app.get('/api/rooms', privateRoute(async (request) => jsonResult(await repo.listRooms(request.db, request.userId))))

app.post('/api/rooms', privateRoute(async (request) =>
  jsonResult(await repo.createRoom(request.db, request.userId, roomInput(request.body)), 201)))

app.get('/api/rooms/:roomId', privateRoute(async (request) => {
  const room = await repo.ownedRoom(request.db, request.userId, uuid(request.params.roomId, 'roomId'))
  return jsonResult(repo.roomJson(room))
}))

app.patch('/api/rooms/:roomId', privateRoute(async (request) =>
  jsonResult(await repo.updateRoom(request.db, request.userId,
    uuid(request.params.roomId, 'roomId'), roomInput(request.body, true)))))

app.delete('/api/rooms/:roomId', privateRoute(async (request) => {
  const paths = await repo.deleteRoom(request.db, request.userId, uuid(request.params.roomId, 'roomId'))
  if (paths.length) afterUserCommit(request.db, photos.schedulePhotoCleanup)
  if (paths.length) console.warn(`Room deleted with ${paths.length} photo objects pending cleanup`)
  return emptyResult
}))

app.get('/api/rooms/:roomId/items', privateRoute(async (request) =>
  jsonResult(await repo.listItems(request.db, request.userId,
    uuid(request.params.roomId, 'roomId'), itemFilters(request.query)))))

app.post('/api/rooms/:roomId/items', privateRoute(async (request) =>
  jsonResult(await repo.createItem(request.db, request.userId,
    uuid(request.params.roomId, 'roomId'), itemInput(request.body)), 201)))

app.get('/api/items/:itemId', privateRoute(async (request) =>
  jsonResult(await repo.getItem(request.db, request.userId, uuid(request.params.itemId, 'itemId')))))

app.patch('/api/items/:itemId', privateRoute(async (request) =>
  jsonResult(await repo.updateItem(request.db, request.userId,
    uuid(request.params.itemId, 'itemId'), itemInput(request.body, true)))))

app.get('/api/items/:itemId/contents', privateRoute(async (request) =>
  jsonResult(await repo.storageContents(request.db, request.userId, uuid(request.params.itemId, 'itemId')))))

app.post('/api/items/:itemId/move', privateRoute(async (request) => {
  const targetRoomId = uuid(request.body?.targetRoomId, 'targetRoomId')
  const decision = request.body?.contentsVersion === undefined && request.body?.includeContents === undefined
    ? null : contentsDecision(request.body)
  return jsonResult(await repo.moveItem(request.db, request.userId,
    uuid(request.params.itemId, 'itemId'), targetRoomId, decision))
}))

app.delete('/api/items/:itemId', privateRoute(async (request) => {
  const body = request.body ?? {}
  const decision = body.contentsVersion === undefined && body.includeContents === undefined
    ? null : contentsDecision(body)
  const paths = await repo.deleteItem(request.db, request.userId, uuid(request.params.itemId, 'itemId'), decision)
  if (paths.length) afterUserCommit(request.db, photos.schedulePhotoCleanup)
  if (paths.length) console.warn(`Item deleted with ${paths.length} photo objects pending cleanup`)
  return emptyResult
}))

app.get('/api/rooms/:roomId/layout', privateRoute(async (request) =>
  jsonResult(await repo.getLayout(request.db, request.userId, uuid(request.params.roomId, 'roomId')))))

app.put('/api/rooms/:roomId/layout', privateRoute(async (request) =>
  jsonResult(await repo.saveLayout(request.db, request.userId, uuid(request.params.roomId, 'roomId'),
    (room) => layoutInput(request.body, room)))))

app.post('/api/items/:itemId/photo', photoUploadBodyParser, privateRoute(async (request) => {
  const result = await photos.uploadPhoto(request.userId, uuid(request.params.itemId, 'itemId'),
    request.body, request.headers['content-type'], request.db)
  return jsonResult(result, 201)
}))

app.get('/api/items/:itemId/photo', privateRoute(async (request) => {
  const { bytes, type } = await photos.downloadPhoto(request.userId, uuid(request.params.itemId, 'itemId'), request.db)
  return binaryResult(bytes, type)
}))

app.delete('/api/items/:itemId/photo', privateRoute(async (request) => {
  await photos.deletePhoto(request.userId, uuid(request.params.itemId, 'itemId'), request.db)
  return emptyResult
}))

app.use((request, response) => response.status(404).json({ error: 'No such route' }))

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error)
  if (error instanceof ApiError) {
    return response.status(error.status).json({ error: error.message, ...(error.fields && { fields: error.fields }) })
  }
  if (error.type === 'entity.too.large') return response.status(413).json({ error: 'Request is too large' })
  if (error instanceof SyntaxError && error.status === 400) return response.status(400).json({ error: 'Invalid JSON' })
  if (error.code === '23505') return response.status(409).json({ error: 'A record with this value already exists' })
  if (['40P01', '40001'].includes(error.code)) return response.status(409).json({ error: 'This data changed at the same time. Reload and try again.' })
  if (['23503', '23514', '22P02'].includes(error.code)) return response.status(400).json({ error: 'Invalid record or relationship' })
  console.error(error)
  response.status(500).json({ error: 'Something went wrong on the server' })
})

if (process.env.VERCEL) await initializeServer()

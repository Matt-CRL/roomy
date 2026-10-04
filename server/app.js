import express from 'express'
import cors from 'cors'
import { pool } from './db/pool.js'
import { requireUser } from './auth.js'
import { deleteAccount } from './account.js'
import { ApiError, asyncRoute } from './errors.js'
import { contentsDecision, itemFilters, itemInput, layoutInput, roomInput, uuid } from './validation.js'
import * as repo from './roomyRepo.js'
import * as photos from './photos.js'

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean)

export const app = express()
app.disable('x-powered-by')
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '100kb' }))

app.get('/healthz', (request, response) => response.json({ ok: true }))
app.get('/readyz', asyncRoute(async (request, response) => {
  try {
    await pool.query('SELECT 1')
    response.json({ ok: true, db: 'up' })
  } catch {
    response.status(503).json({ ok: false, db: 'down' })
  }
}))

app.use('/api', requireUser)

app.delete('/api/account', asyncRoute(async (request, response) => {
  await deleteAccount(request.userId)
  response.status(204).end()
}))

app.get('/api/categories', asyncRoute(async (request, response) => {
  response.json(await repo.listCategories(pool))
}))

app.get('/api/rooms', asyncRoute(async (request, response) => {
  response.json(await repo.listRooms(pool, request.userId))
}))

app.post('/api/rooms', asyncRoute(async (request, response) => {
  response.status(201).json(await repo.createRoom(pool, request.userId, roomInput(request.body)))
}))

app.get('/api/rooms/:roomId', asyncRoute(async (request, response) => {
  const room = await repo.ownedRoom(pool, request.userId, uuid(request.params.roomId, 'roomId'))
  response.json(repo.roomJson(room))
}))

app.patch('/api/rooms/:roomId', asyncRoute(async (request, response) => {
  response.json(await repo.updateRoom(pool, request.userId,
    uuid(request.params.roomId, 'roomId'), roomInput(request.body, true)))
}))

app.delete('/api/rooms/:roomId', asyncRoute(async (request, response) => {
  const paths = await repo.deleteRoom(pool, request.userId, uuid(request.params.roomId, 'roomId'))
  if (paths.length) console.warn(`Room deleted with ${paths.length} photo objects pending cleanup`)
  response.status(204).end()
}))

app.get('/api/rooms/:roomId/items', asyncRoute(async (request, response) => {
  response.json(await repo.listItems(pool, request.userId,
    uuid(request.params.roomId, 'roomId'), itemFilters(request.query)))
}))

app.post('/api/rooms/:roomId/items', asyncRoute(async (request, response) => {
  response.status(201).json(await repo.createItem(pool, request.userId,
    uuid(request.params.roomId, 'roomId'), itemInput(request.body)))
}))

app.get('/api/items/:itemId', asyncRoute(async (request, response) => {
  response.json(await repo.getItem(pool, request.userId, uuid(request.params.itemId, 'itemId')))
}))

app.patch('/api/items/:itemId', asyncRoute(async (request, response) => {
  response.json(await repo.updateItem(pool, request.userId,
    uuid(request.params.itemId, 'itemId'), itemInput(request.body, true)))
}))

app.get('/api/items/:itemId/contents', asyncRoute(async (request, response) => {
  response.json(await repo.storageContents(pool, request.userId, uuid(request.params.itemId, 'itemId')))
}))

app.post('/api/items/:itemId/move', asyncRoute(async (request, response) => {
  const targetRoomId = uuid(request.body?.targetRoomId, 'targetRoomId')
  const decision = request.body?.contentsVersion === undefined && request.body?.includeContents === undefined
    ? null : contentsDecision(request.body)
  response.json(await repo.moveItem(pool, request.userId,
    uuid(request.params.itemId, 'itemId'), targetRoomId, decision))
}))

app.delete('/api/items/:itemId', asyncRoute(async (request, response) => {
  const body = request.body ?? {}
  const decision = body.contentsVersion === undefined && body.includeContents === undefined
    ? null : contentsDecision(body)
  const paths = await repo.deleteItem(pool, request.userId, uuid(request.params.itemId, 'itemId'), decision)
  if (paths.length) console.warn(`Item deleted with ${paths.length} photo objects pending cleanup`)
  response.status(204).end()
}))

app.get('/api/rooms/:roomId/layout', asyncRoute(async (request, response) => {
  response.json(await repo.getLayout(pool, request.userId, uuid(request.params.roomId, 'roomId')))
}))

app.put('/api/rooms/:roomId/layout', asyncRoute(async (request, response) => {
  response.json(await repo.saveLayout(pool, request.userId, uuid(request.params.roomId, 'roomId'),
    (room) => layoutInput(request.body, room)))
}))

app.post('/api/items/:itemId/photo', express.raw({ type: 'image/*', limit: '5mb' }), asyncRoute(async (request, response) => {
  const result = await photos.uploadPhoto(request.userId, uuid(request.params.itemId, 'itemId'),
    request.body, request.headers['content-type'])
  response.status(201).json(result)
}))

app.get('/api/items/:itemId/photo', asyncRoute(async (request, response) => {
  const { bytes, type } = await photos.downloadPhoto(request.userId, uuid(request.params.itemId, 'itemId'))
  response.set('Cache-Control', 'private, max-age=3600').type(type).send(bytes)
}))

app.delete('/api/items/:itemId/photo', asyncRoute(async (request, response) => {
  await photos.deletePhoto(request.userId, uuid(request.params.itemId, 'itemId'))
  response.status(204).end()
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

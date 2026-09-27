// Roomy requests use the current Supabase session and the Express API.

import { supabase } from './supabase.js'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options = {}) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('Sign in to continue')
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${data.session.access_token}`,
      ...(options.body && !options.raw ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    // Try to use the API's own message; fall back to the status line.
    let message = `${response.status} ${response.statusText}`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // The body was not JSON. The status line is all we have.
    }
    throw new Error(message)
  }

  if (options.blob) return response.blob()
  return response.status === 204 ? null : response.json()
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })

export const listRooms = () => request('/api/rooms')
export const getRoom = (id) => request(`/api/rooms/${id}`)
export const createRoom = (input) => request('/api/rooms', json('POST', input))
export const updateRoom = (id, input) => request(`/api/rooms/${id}`, json('PATCH', input))
export const deleteRoom = (id) => request(`/api/rooms/${id}`, { method: 'DELETE' })
export const listCategories = () => request('/api/categories')
export const listItems = (roomId, filters = {}) => {
  const query = new URLSearchParams(filters).toString()
  return request(`/api/rooms/${roomId}/items${query ? `?${query}` : ''}`)
}
export const getItem = (id) => request(`/api/items/${id}`)
export const createItem = (roomId, input) => request(`/api/rooms/${roomId}/items`, json('POST', input))
export const updateItem = (id, input) => request(`/api/items/${id}`, json('PATCH', input))
export const getContents = (id) => request(`/api/items/${id}/contents`)
export const moveItem = (id, input) => request(`/api/items/${id}/move`, json('POST', input))
export const deleteItem = (id, decision = {}) => request(`/api/items/${id}`, json('DELETE', decision))
export const getLayout = (roomId) => request(`/api/rooms/${roomId}/layout`)
export const saveLayout = (roomId, input) => request(`/api/rooms/${roomId}/layout`, json('PUT', input))
export const uploadPhoto = (id, file) => request(`/api/items/${id}/photo`, {
  method: 'POST', body: file, headers: { 'content-type': file.type }, raw: true,
})
export const getPhoto = (id) => request(`/api/items/${id}/photo`, { blob: true })
export const deletePhoto = (id) => request(`/api/items/${id}/photo`, { method: 'DELETE' })

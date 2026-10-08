import express from 'express'
import app from './app.js'
import { initializeServer } from './startup.js'

if (typeof express !== 'function' || typeof app !== 'function') {
  throw new Error('Roomy Express application could not be initialized')
}

await initializeServer()

export default app

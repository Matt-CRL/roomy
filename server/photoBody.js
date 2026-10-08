import express from 'express'
import { MAX_ITEM_PHOTO_BYTES } from './photoLimits.js'

export const photoUploadBodyParser = express.raw({
  type: 'image/*',
  limit: `${MAX_ITEM_PHOTO_BYTES}b`,
})

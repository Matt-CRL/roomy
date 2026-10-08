export const MAX_ITEM_PHOTO_BYTES = 4 * 1024 * 1024

export function isItemPhotoSizeAllowed(size) {
  return Number.isFinite(size) && size >= 0 && size <= MAX_ITEM_PHOTO_BYTES
}

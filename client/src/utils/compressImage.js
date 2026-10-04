const MAX_IMAGE_DIMENSION = 1800
const TARGET_IMAGE_BYTES = 1024 * 1024
const IMAGE_QUALITY_STEPS = [0.82, 0.74, 0.66]

function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }

  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read the selected image'))
    }
    image.src = objectUrl
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function compressImage(file) {
  if (!file?.type?.startsWith('image/')) return file

  const image = await decodeImage(file)
  const sourceWidth = image.width || image.naturalWidth
  const sourceHeight = image.height || image.naturalHeight
  const longestSide = Math.max(sourceWidth, sourceHeight)

  if (file.size <= TARGET_IMAGE_BYTES && longestSide <= MAX_IMAGE_DIMENSION) {
    image.close?.()
    return file
  }

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / longestSide)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sourceWidth * scale))
  canvas.height = Math.max(1, Math.round(sourceHeight * scale))

  const context = canvas.getContext('2d')
  if (!context) {
    image.close?.()
    return file
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close?.()

  // WebP keeps transparency while producing much smaller files than PNG.
  const outputType = 'image/webp'
  let compressedBlob = null
  for (const quality of IMAGE_QUALITY_STEPS) {
    compressedBlob = await canvasToBlob(canvas, outputType, quality)
    if (compressedBlob && compressedBlob.size <= TARGET_IMAGE_BYTES) break
  }

  if (!compressedBlob || compressedBlob.size >= file.size) return file

  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'roomy-photo'
  return new File([compressedBlob], `${baseName}.webp`, {
    type: outputType,
    lastModified: Date.now(),
  })
}

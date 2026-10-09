export const PLANNER_MIN_DIMENSION = 1
export const PLANNER_MAX_DIMENSION = 100000

const EPSILON = 0.0001

export const round = (value) => Math.round(Number(value) * 100) / 100

export const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum)

export function normalizeAngle(angle) {
  return ((Number(angle) % 360) + 360) % 360
}

export function angleDifference(firstAngle, secondAngle) {
  return ((firstAngle - secondAngle + 540) % 360) - 180
}

export function snapRotation(angle, tolerance = 8) {
  const normalized = normalizeAngle(angle)
  const nearest = normalizeAngle(Math.round(normalized / 45) * 45)
  return Math.abs(angleDifference(normalized, nearest)) <= tolerance
    ? nearest
    : round(normalized)
}

export function rotatedSpan(width, depth, rotation) {
  const radians = (Number(rotation) * Math.PI) / 180
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))

  return {
    width: Number(width) * cosine + Number(depth) * sine,
    depth: Number(width) * sine + Number(depth) * cosine,
  }
}

export function rotatedBounds(shape) {
  const width = Number(shape.width)
  const depth = Number(shape.depth)
  const x = Number(shape.x)
  const y = Number(shape.y)
  const span = rotatedSpan(width, depth, shape.rotation)
  const centerX = x + width / 2
  const centerY = y + depth / 2

  return {
    minX: centerX - span.width / 2,
    maxX: centerX + span.width / 2,
    minY: centerY - span.depth / 2,
    maxY: centerY + span.depth / 2,
    width: span.width,
    depth: span.depth,
  }
}

export function shapeFitsRoom(shape, roomWidth, roomDepth) {
  const bounds = rotatedBounds(shape)
  return bounds.minX >= -EPSILON && bounds.minY >= -EPSILON &&
    bounds.maxX <= Number(roomWidth) + EPSILON &&
    bounds.maxY <= Number(roomDepth) + EPSILON
}

export function clampShapePosition(shape, roomWidth, roomDepth) {
  const bounds = rotatedBounds(shape)
  const width = Number(shape.width)
  const depth = Number(shape.depth)
  const positionStep = 100
  const quantizationEpsilon = 1e-8
  const minX = (bounds.width - width) / 2
  const maxX = Number(roomWidth) - (bounds.width + width) / 2
  const minY = (bounds.depth - depth) / 2
  const maxY = Number(roomDepth) - (bounds.depth + depth) / 2
  const safeMinX = Math.ceil(minX * positionStep - quantizationEpsilon) / positionStep
  const safeMaxX = Math.floor(maxX * positionStep + quantizationEpsilon) / positionStep
  const safeMinY = Math.ceil(minY * positionStep - quantizationEpsilon) / positionStep
  const safeMaxY = Math.floor(maxY * positionStep + quantizationEpsilon) / positionStep
  const x = bounds.width <= Number(roomWidth) + EPSILON && safeMinX <= safeMaxX
    ? clamp(round(shape.x), safeMinX, safeMaxX)
    : round(shape.x)
  const y = bounds.depth <= Number(roomDepth) + EPSILON && safeMinY <= safeMaxY
    ? clamp(round(shape.y), safeMinY, safeMaxY)
    : round(shape.y)

  return { ...shape, x: x === 0 ? 0 : x, y: y === 0 ? 0 : y }
}

export function maximumWidthForRoom(depth, rotation, roomWidth, roomDepth) {
  const radians = (Number(rotation) * Math.PI) / 180
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))
  const limits = [PLANNER_MAX_DIMENSION]

  if (cosine > EPSILON) limits.push((roomWidth - depth * sine) / cosine)
  if (sine > EPSILON) limits.push((roomDepth - depth * cosine) / sine)

  return Math.max(0, Math.min(...limits))
}

export function maximumDepthForRoom(width, rotation, roomWidth, roomDepth) {
  const radians = (Number(rotation) * Math.PI) / 180
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))
  const limits = [PLANNER_MAX_DIMENSION]

  if (sine > EPSILON) limits.push((roomWidth - width * cosine) / sine)
  if (cosine > EPSILON) limits.push((roomDepth - width * sine) / cosine)

  return Math.max(0, Math.min(...limits))
}

export function maximumUniformScale(shape, roomWidth, roomDepth) {
  const span = rotatedSpan(shape.width, shape.depth, shape.rotation)
  return Math.min(
    PLANNER_MAX_DIMENSION / Math.max(shape.width, shape.depth),
    roomWidth / span.width,
    roomDepth / span.depth,
  )
}

export function minimumRoomDimensions(shapes) {
  return shapes.reduce((minimum, shape) => {
    const width = Number(shape.width)
    const depth = Number(shape.depth)
    const span = rotatedSpan(width, depth, shape.rotation)
    const minimumDimension = (objectDimension, footprintDimension) => {
      let roomDimension = Math.ceil(footprintDimension * 100 - 1e-8) / 100
      const hasValidPosition = (dimension) => {
        const minimumPosition = (footprintDimension - objectDimension) / 2
        const maximumPosition = dimension - (footprintDimension + objectDimension) / 2
        const safeMinimum = Math.ceil(minimumPosition * 100 - 1e-8)
        const safeMaximum = Math.floor(maximumPosition * 100 + 1e-8)
        return safeMinimum <= safeMaximum
      }

      while (!hasValidPosition(roomDimension) && roomDimension < PLANNER_MAX_DIMENSION) {
        roomDimension = round(roomDimension + 0.01)
      }
      return roomDimension
    }

    return {
      width: Math.max(minimum.width, minimumDimension(width, span.width)),
      depth: Math.max(minimum.depth, minimumDimension(depth, span.depth)),
    }
  }, { width: PLANNER_MIN_DIMENSION, depth: PLANNER_MIN_DIMENSION })
}

const LEGACY_POSITIONS = {
  center: [50, 50],
  top: [50, 0],
  bottom: [50, 100],
  left: [0, 50],
  right: [100, 50],
}

function clamp(value, minimum, maximum, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maximum, Math.max(minimum, number))
}

export function getPhotoAdjustment(item) {
  const legacyPosition = LEGACY_POSITIONS[item?.photoPosition] ?? LEGACY_POSITIONS.center
  return {
    x: clamp(item?.photoPositionX, 0, 100, legacyPosition[0]),
    y: clamp(item?.photoPositionY, 0, 100, legacyPosition[1]),
    zoom: clamp(item?.photoZoom, 1, 2, 1),
  }
}

export function getPhotoImageStyle(item) {
  const { x, y, zoom } = getPhotoAdjustment(item)
  return {
    display: 'block',
    objectFit: 'cover',
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${zoom})`,
    transformOrigin: 'center',
    willChange: 'transform',
  }
}

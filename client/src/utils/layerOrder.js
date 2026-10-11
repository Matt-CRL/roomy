export function normalizeLayerOrder(items = []) {
  return items
    .map((item, index) => ({
      item,
      index,
      order: Number.isInteger(item.layerOrder) && item.layerOrder >= 0
        ? item.layerOrder
        : index,
    }))
    .sort((left, right) => left.order - right.order || left.index - right.index)
    .map(({ item }, layerOrder) => ({ ...item, layerOrder }))
}

export function moveLayerOrder(items, itemId, direction) {
  const ordered = normalizeLayerOrder(items)
  const currentIndex = ordered.findIndex((item) => item.itemId === itemId)
  if (currentIndex < 0) return items

  const nextIndex = Math.max(0, Math.min(ordered.length - 1, currentIndex + Math.sign(direction)))
  if (nextIndex === currentIndex) return items

  const [movedItem] = ordered.splice(currentIndex, 1)
  ordered.splice(nextIndex, 0, movedItem)
  return ordered.map((item, layerOrder) => ({ ...item, layerOrder }))
}

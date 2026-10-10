export function getViewportMenuPosition({ trigger, menu, viewportWidth, viewportHeight, gutter = 8, gap = 8 }) {
  const maxLeft = Math.max(gutter, viewportWidth - menu.width - gutter)
  const maxTop = Math.max(gutter, viewportHeight - menu.height - gutter)
  const left = Math.min(maxLeft, Math.max(gutter, trigger.right - menu.width))
  const above = trigger.top - menu.height - gap
  const below = trigger.bottom + gap
  const top = above >= gutter || below > maxTop
    ? Math.min(maxTop, Math.max(gutter, above))
    : below

  return { left, top }
}

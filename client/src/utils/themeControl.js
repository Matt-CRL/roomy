function overlaps(first, second, clearance = 0) {
  if (!first || !second) return false
  return first.left - clearance < second.right &&
    first.right + clearance > second.left &&
    first.top - clearance < second.bottom &&
    first.bottom + clearance > second.top
}

function isVisible(element) {
  if (!element || element.closest('[aria-hidden="true"], [data-theme-hanger], [data-theme-toggle]')) return false
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' &&
    element.getClientRects().length > 0
}

export function collectThemeControlObstacles(root, hanger, clearance = 8) {
  if (!root || !hanger) return []
  const obstacles = []
  const controls = root.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])')

  for (const element of controls) {
    if (!isVisible(element)) continue
    const bounds = element.getBoundingClientRect()
    if (overlaps(hanger, bounds, clearance)) obstacles.push(bounds)
  }

  const document = root.ownerDocument || root
  const showText = document.defaultView?.NodeFilter?.SHOW_TEXT
  if (!showText) return obstacles

  const walker = document.createTreeWalker(root, showText)
  const range = document.createRange()
  let node = walker.nextNode()
  while (node) {
    const parent = node.parentElement
    if (node.nodeValue?.trim() && parent &&
      !parent.closest('button, a, input, select, textarea, [role="button"], [data-theme-hanger], [data-theme-toggle]') &&
      isVisible(parent)) {
      const parentBounds = parent.getBoundingClientRect()
      if (overlaps(hanger, parentBounds, clearance)) {
        range.selectNodeContents(node)
        for (const bounds of range.getClientRects()) {
          if (bounds.width && bounds.height && overlaps(hanger, bounds, clearance)) {
            obstacles.push(bounds)
          }
        }
      }
    }
    node = walker.nextNode()
  }

  range.detach?.()
  return obstacles
}

export function shouldUseCompactThemeControl({ hanger, obstacles = [], clearance = 8, currentlyCompact = false, releaseClearance = 16 }) {
  const separation = currentlyCompact ? clearance + releaseClearance : clearance
  return Boolean(hanger && obstacles.some((obstacle) => overlaps(hanger, obstacle, separation)))
}

export function shouldMeasureThemeControlAtScrollPosition(scrollY, viewportWidth, previousViewportWidth) {
  return Number(scrollY) <= 0 || (
    Number.isFinite(viewportWidth) && Number.isFinite(previousViewportWidth) &&
    viewportWidth !== previousViewportWidth
  )
}

export function getNavbarCollisionBounds(navbar, hanger, clearance = 8) {
  return navbar && overlaps(hanger, navbar, clearance) ? navbar : null
}

export function getThemeHangerLeft({ navbarLeft, navbarRight, hangerWidth, viewportWidth, gutter = 8 }) {
  if (![navbarLeft, navbarRight, hangerWidth, viewportWidth, gutter].every(Number.isFinite) ||
    navbarLeft < 0 || navbarRight <= navbarLeft || hangerWidth <= 0 || viewportWidth <= 0 || gutter < 0) {
    return null
  }

  const rightGutter = viewportWidth - navbarRight
  if (rightGutter >= hangerWidth + gutter * 2) {
    const centeredLeft = navbarRight + (rightGutter - hangerWidth) / 2
    return Math.max(navbarRight + gutter, centeredLeft - 6)
  }

  if (navbarLeft >= hangerWidth + gutter * 2) {
    return (navbarLeft - hangerWidth) / 2
  }

  return null
}

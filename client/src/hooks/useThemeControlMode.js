import { useLayoutEffect, useRef, useState } from 'react'
import {
  collectThemeControlObstacles,
  getNavbarCollisionBounds,
  getThemeHangerLeft,
  shouldMeasureThemeControlAtScrollPosition,
  shouldUseCompactThemeControl,
} from '../utils/themeControl'

export default function useThemeControlMode(refreshKey) {
  const [mode, setMode] = useState({ compact: false })
  const modeRef = useRef(mode)

  useLayoutEffect(() => {
    const hanger = document.querySelector('[data-theme-hanger]')
    const navbar = document.querySelector('[data-main-navbar]')
    if (!hanger) {
      modeRef.current = { compact: false }
      setMode(modeRef.current)
      return undefined
    }

    let frame = 0
    let lastMeasuredViewportWidth = window.innerWidth
    let viewportRefreshPending = false
    function scheduleUpdate() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        if (hanger.dataset.themePulling === 'true') return

        const navbarBounds = navbar?.getBoundingClientRect()
        let hasNavbarSpace = true
        if (navbarBounds) {
          const hangerWidth = hanger.getBoundingClientRect().width
          const left = getThemeHangerLeft({
            navbarLeft: navbarBounds.left,
            navbarRight: navbarBounds.right,
            hangerWidth,
            viewportWidth: window.innerWidth,
          })
          if (left !== null) {
            hanger.style.left = `${left}px`
            hanger.style.right = 'auto'
            hanger.style.visibility = ''
          } else {
            hasNavbarSpace = false
            hanger.style.left = ''
            hanger.style.right = ''
            hanger.style.visibility = 'hidden'
          }
        } else {
          hanger.style.left = ''
          hanger.style.right = ''
          hanger.style.visibility = ''
        }

        const viewportWidth = window.innerWidth
        const shouldMeasure = shouldMeasureThemeControlAtScrollPosition(
          window.scrollY,
          viewportWidth,
          lastMeasuredViewportWidth,
        ) || viewportRefreshPending
        lastMeasuredViewportWidth = viewportWidth
        viewportRefreshPending = false
        if (!shouldMeasure) return

        const hangerBounds = hanger.getBoundingClientRect()
        const obstacles = collectThemeControlObstacles(document.body, hangerBounds)
        const navbarCollision = getNavbarCollisionBounds(navbarBounds, hangerBounds)
        if (navbarCollision) obstacles.push(navbarCollision)
        const compact = shouldUseCompactThemeControl({
          hanger: hangerBounds,
          obstacles,
          currentlyCompact: modeRef.current.compact,
        }) || !hasNavbarSpace
        if (modeRef.current.compact !== compact) {
          modeRef.current = { compact }
          setMode(modeRef.current)
        }
      })
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(document.body)
    resizeObserver.observe(hanger)
    if (navbar) resizeObserver.observe(navbar)
    const mutationObserver = new MutationObserver(scheduleUpdate)
    mutationObserver.observe(document.body, { childList: true, characterData: true, subtree: true })
    function scheduleViewportUpdate() {
      viewportRefreshPending = true
      scheduleUpdate()
    }
    const visualViewport = window.visualViewport
    window.addEventListener('resize', scheduleViewportUpdate)
    visualViewport?.addEventListener('resize', scheduleViewportUpdate)
    function updateOnlyAtTop(event) {
      const isDocumentScroll = event.target === document || event.target === document.documentElement
      if (isDocumentScroll && shouldMeasureThemeControlAtScrollPosition(window.scrollY)) scheduleUpdate()
    }

    window.addEventListener('scroll', updateOnlyAtTop, { capture: true, passive: true })
    scheduleUpdate()

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', scheduleViewportUpdate)
      visualViewport?.removeEventListener('resize', scheduleViewportUpdate)
      window.removeEventListener('scroll', updateOnlyAtTop, true)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [refreshKey])

  return mode
}

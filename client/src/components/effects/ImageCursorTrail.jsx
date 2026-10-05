import { useEffect, useRef, useState } from 'react'

const TRAIL_IMAGES = [
  `${import.meta.env.BASE_URL}cursor-trail/backpack.png`,
  `${import.meta.env.BASE_URL}cursor-trail/basketball.png`,
  `${import.meta.env.BASE_URL}cursor-trail/figure.png`,
  `${import.meta.env.BASE_URL}cursor-trail/lamp.png`,
  `${import.meta.env.BASE_URL}cursor-trail/phone.png`,
  `${import.meta.env.BASE_URL}cursor-trail/plant.png`,
  `${import.meta.env.BASE_URL}cursor-trail/shoes.png`,
]

const MAX_TRAIL_IMAGES = 7
const MIN_CURSOR_DISTANCE = 44

export default function ImageCursorTrail({ scopeRef }) {
  const [trail, setTrail] = useState([])
  const lastPoint = useRef(null)
  const nextImageIndex = useRef(0)
  const nextId = useRef(0)

  useEffect(() => {
    const canHover = window.matchMedia('(any-hover: hover) and (any-pointer: fine)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!canHover || prefersReducedMotion) return undefined

    function handlePointerMove(event) {
      if (event.pointerType === 'touch') return

      const point = { x: event.clientX, y: event.clientY }
      const scopeBounds = scopeRef?.current?.getBoundingClientRect()
      if (scopeBounds) {
        const isInsideScope = point.x >= scopeBounds.left
          && point.x <= scopeBounds.right
          && point.y >= scopeBounds.top
          && point.y <= scopeBounds.bottom

        if (!isInsideScope) {
          lastPoint.current = null
          return
        }
      }

      if (lastPoint.current) {
        const distance = Math.hypot(point.x - lastPoint.current.x, point.y - lastPoint.current.y)
        if (distance < MIN_CURSOR_DISTANCE) return
      }

      lastPoint.current = point
      const image = TRAIL_IMAGES[nextImageIndex.current % TRAIL_IMAGES.length]
      nextImageIndex.current += 1

      const nextItem = {
        id: nextId.current,
        image,
        x: scopeBounds ? point.x - scopeBounds.left : point.x,
        y: scopeBounds ? point.y - scopeBounds.top : point.y,
        rotation: Math.round((Math.random() - 0.5) * 24),
      }
      nextId.current += 1

      setTrail((current) => [...current, nextItem].slice(-MAX_TRAIL_IMAGES))
    }

    function resetPoint() {
      lastPoint.current = null
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerleave', resetPoint)
    window.addEventListener('blur', resetPoint)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', resetPoint)
      window.removeEventListener('blur', resetPoint)
    }
  }, [])

  function removeTrailImage(id) {
    setTrail((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className={`image-cursor-trail-layer${scopeRef ? ' image-cursor-trail-layer-scoped' : ''}`} aria-hidden="true">
      {trail.map((item) => (
        <img
          key={item.id}
          src={item.image}
          alt=""
          draggable="false"
          className="image-cursor-trail-sticker"
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            '--trail-rotation': `${item.rotation}deg`,
          }}
          onAnimationEnd={() => removeTrailImage(item.id)}
        />
      ))}
    </div>
  )
}

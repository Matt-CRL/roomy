import { useEffect, useState } from 'react'

const INITIAL_TILT = {
  rotateX: 0,
  rotateY: 0,
  glowX: 50,
  glowY: 50,
  glareAngle: 135,
  isActive: false,
}

export default function TiltEffect({
  children,
  className = '',
  disabled = false,
  maxTilt = 7,
}) {
  const [tilt, setTilt] = useState(INITIAL_TILT)

  useEffect(() => {
    if (disabled) setTilt(INITIAL_TILT)
  }, [disabled])

  function handlePointerMove(event) {
    if (disabled || event.pointerType === 'touch') return

    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))

    setTilt({
      rotateX: (0.5 - y) * maxTilt,
      rotateY: (x - 0.5) * maxTilt,
      glowX: x * 100,
      glowY: y * 100,
      glareAngle: 115 + x * 40 + (0.5 - y) * 20,
      isActive: true,
    })
  }

  function resetTilt() {
    setTilt(INITIAL_TILT)
  }

  const isActive = !disabled && tilt.isActive

  return (
    <div
      className={`tilt-effect ${isActive ? 'tilt-effect-active' : ''} ${disabled ? 'tilt-effect-disabled' : ''} ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      style={{
        '--tilt-glow-x': `${tilt.glowX}%`,
        '--tilt-glow-y': `${tilt.glowY}%`,
        '--tilt-glare-angle': `${tilt.glareAngle}deg`,
        transform: isActive
          ? `perspective(1200px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(0)`
          : undefined,
      }}
    >
      {children}
    </div>
  )
}

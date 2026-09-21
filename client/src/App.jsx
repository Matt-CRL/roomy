import { useEffect, useRef, useState } from 'react'
import ItemFormPage from './pages/ItemFormPage'
import RoomsPage from './pages/RoomsPage'
import RoomInventoryPage from './pages/RoomInventoryPage'

function ThemeToggleButton({ isDarkMode, onToggle }) {
  const [sway, setSway] = useState(0)
  const [isPressed, setIsPressed] = useState(false)
  const [pullProgressValue, setPullProgress] = useState(0)
  const [pullSideOffset, setPullSideOffset] = useState(0)
  const pressTimer = useRef(0)
  const pullProgress = useRef(0)
  const pullAnimationFrame = useRef(0)
  const targetSway = useRef(0)
  const currentSway = useRef(0)
  const animationFrame = useRef(0)

  useEffect(() => {
    let lastScrollY = window.scrollY
    let lastTime = performance.now()

    function animateSway() {
      const nextSway =
        currentSway.current +
        (targetSway.current - currentSway.current) * 0.16

      currentSway.current = nextSway
      targetSway.current *= 0.9
      setSway(nextSway)

      if (
        Math.abs(nextSway) < 0.02 &&
        Math.abs(targetSway.current) < 0.02
      ) {
        currentSway.current = 0
        targetSway.current = 0
        animationFrame.current = 0
        setSway(0)
        return
      }

      animationFrame.current = window.requestAnimationFrame(animateSway)
    }

    function handleScroll() {
      const now = performance.now()
      const deltaY = window.scrollY - lastScrollY
      const elapsed = Math.max(now - lastTime, 16)
      const rotation = Math.max(-14, Math.min(14, (deltaY / elapsed) * 4))

      targetSway.current = rotation

      if (!animationFrame.current) {
        animationFrame.current = window.requestAnimationFrame(animateSway)
      }

      lastScrollY = window.scrollY
      lastTime = now
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.cancelAnimationFrame(animationFrame.current)
      window.clearTimeout(pressTimer.current)
      window.cancelAnimationFrame(pullAnimationFrame.current)
    }
  }, [])

  function animatePull(target) {
    window.cancelAnimationFrame(pullAnimationFrame.current)

    const startProgress = pullProgress.current
    const startTime = performance.now()
    const duration = target === 1 ? 90 : 300

    function step(now) {
      const elapsed = Math.min(1, (now - startTime) / duration)
      const nextProgress = target === 0
        ? startProgress * Math.exp(-5.5 * elapsed) * Math.cos(14 * elapsed)
        : startProgress + (target - startProgress) * (1 - Math.pow(1 - elapsed, 3))
      const sideOffset = target === 0
        ? Math.sin(18 * elapsed) * Math.exp(-4.5 * elapsed) * 8
        : Math.sin(Math.PI * elapsed) * 2

      pullProgress.current = nextProgress
      setPullProgress(nextProgress)
      setPullSideOffset(sideOffset)

      if (elapsed < 1) {
        pullAnimationFrame.current = window.requestAnimationFrame(step)
      } else {
        pullProgress.current = target
        pullAnimationFrame.current = 0
        setPullSideOffset(0)
      }
    }

    pullAnimationFrame.current = window.requestAnimationFrame(step)
  }

  function handleSwitchClick() {
    onToggle?.()
    setIsPressed(true)
    window.clearTimeout(pressTimer.current)
    animatePull(1)
    pressTimer.current = window.setTimeout(() => {
      setIsPressed(false)
      animatePull(0)
    }, 150)
  }

  const centerX = 28
  const pullOffset = {
    x: pullSideOffset,
    y: pullProgressValue * 80,
  }
  const baseBeadYPositions = [8, 26, 44, 62, 80, 98, 116, 134]
  const lastBeadY = baseBeadYPositions[baseBeadYPositions.length - 1]
  const beadPositions = baseBeadYPositions.map((baseY) => {
    const progress = baseY / lastBeadY
    const curveOffset = sway * 1.4 * Math.sin(progress * Math.PI / 2)

    return {
      x: centerX + curveOffset + pullOffset.x * progress,
      y: baseY + pullOffset.y * progress,
    }
  })
  const chainHeight = Math.max(50, 144 + pullOffset.y)
  const chainPoints = [
    `${centerX},0`,
    ...beadPositions.map(({ x, y }) => `${x},${y}`),
    `${centerX + sway * 0.8},${chainHeight}`,
  ].join(' ')

  return (
    <div className="pointer-events-none fixed right-20 top-0 z-50 flex w-14 flex-col items-center">
      <svg
        aria-hidden="true"
        viewBox={`0 0 56 ${chainHeight}`}
        style={{ height: `${chainHeight}px` }}
        className="w-14 overflow-visible"
      >
        <polyline
          points={chainPoints}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="text-slate-300"
        />

        {beadPositions.map(({ x, y }, index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="5.5"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      <button
        type="button"
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={isDarkMode}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={handleSwitchClick}
        style={{
          transform: `translateX(${pullOffset.x + sway * 0.8}px) rotate(${sway * 0.35}deg)`,
        }}
        className="theme-switch-button pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-lg transition-[background-color,transform] duration-200 ease-out hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          {isDarkMode ? (
            <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </>
          )}
        </svg>
      </button>
    </div>
  )
}

function AppShell({ children, isDarkMode, onToggleTheme }) {
  return (
    <div
      className={`theme-transition min-h-screen ${
        isDarkMode ? 'night-mode' : ''
      }`}
    >
      {isDarkMode && (
        <>
          <div aria-hidden="true" className="night-mode-lamp-glow" />
          <div aria-hidden="true" className="night-mode-bottom-gradient" />
        </>
      )}
      {children}
      <ThemeToggleButton
        isDarkMode={isDarkMode}
        onToggle={onToggleTheme}
      />
    </div>
  )
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('inventory')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState({
    name: 'Bedroom 1',
  })
  const [selectedItem, setSelectedItem] = useState(null)

  if (currentPage === 'rooms') {
    return (
      <AppShell
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((current) => !current)}
      >
        <RoomsPage
          onEnterRoom={(room) => {
            setSelectedRoom(room)
            setCurrentPage('inventory')
          }}
        />
      </AppShell>
    )
  }

  if (currentPage === 'item-form') {
    return (
      <AppShell
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((current) => !current)}
      >
        <ItemFormPage
          room={selectedRoom}
          item={selectedItem}
          onCancel={() => setCurrentPage('inventory')}
          onBackToRooms={() => setCurrentPage('rooms')}
          onBackToInventory={() => setCurrentPage('inventory')}
          onSave={() => {
            setSelectedItem(null)
            setCurrentPage('inventory')
          }}
        />
      </AppShell>
    )
  }

  return (
    <AppShell
      isDarkMode={isDarkMode}
      onToggleTheme={() => setIsDarkMode((current) => !current)}
    >
      <RoomInventoryPage
        room={selectedRoom}
        onBackToRooms={() => setCurrentPage('rooms')}
        onAddItem={() => {
          setSelectedItem(null)
          setCurrentPage('item-form')
        }}
        onEditItem={(item) => {
          setSelectedItem(item)
          setCurrentPage('item-form')
        }}
      />
    </AppShell>
  )
}

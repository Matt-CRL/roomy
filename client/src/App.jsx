import { useEffect, useRef, useState } from 'react'
import ItemFormPage from './pages/ItemFormPage'
import RoomsPage from './pages/RoomsPage'
import RoomInventoryPage from './pages/RoomInventoryPage'
import AuthPage from './pages/AuthPage'
import PlannerWorkspace, { PlannerLoadingScreen } from './pages/PlannerWorkspace'
import ThemeToggleButton from './components/layout/ThemeToggleButton'
import Button from './components/common/Button'
import * as api from './api'
import { supabase } from './api/supabase'
import DemoNotice from './components/DemoNotice'
import { compressImage } from './utils/compressImage'

const ROOMS_STORAGE_KEY = 'roomy:rooms'
const ITEMS_STORAGE_KEY = 'roomy:items'
const DEMO_THEME_STORAGE_KEY = 'roomy:demo-theme'

function readDemoThemePreference() {
  try {
    return window.localStorage.getItem(DEMO_THEME_STORAGE_KEY) === 'dark'
  } catch {
    return false
  }
}

function readAccountThemePreference(user) {
  const savedTheme = user?.user_metadata?.roomy_theme
  if (savedTheme === 'dark') return true
  if (savedTheme === 'light') return false

  try {
    return window.localStorage.getItem(`roomy:theme:${user?.id}`) === 'dark'
  } catch {
    return false
  }
}

function decodeRoutePart(value) {
  try {
    return value ? decodeURIComponent(value) : null
  } catch {
    return null
  }
}

function readAppRoute(pathname = window.location.pathname) {
  const parts = pathname.split('/').filter(Boolean).map(decodeRoutePart)

  if (parts[0] === 'login') return { page: 'login', roomId: null, itemId: null }
  if (parts[0] !== 'rooms') return { page: 'rooms', roomId: null, itemId: null }
  if (!parts[1]) return { page: 'rooms', roomId: null, itemId: null }
  if (parts[2] === 'planner') return { page: 'planner', roomId: parts[1], itemId: null }
  if (parts[2] === 'items' && parts[3] === 'new') return { page: 'item-form', roomId: parts[1], itemId: null }
  if (parts[2] === 'items' && parts[3] && parts[4] === 'edit') {
    return { page: 'item-form', roomId: parts[1], itemId: parts[3] }
  }
  return { page: 'inventory', roomId: parts[1], itemId: null }
}

function appPath(page, roomId, itemId) {
  if (page === 'login') return '/login'
  if (page === 'rooms' || !roomId) return '/rooms'
  if (page === 'planner') return `/rooms/${encodeURIComponent(roomId)}/planner`
  if (page === 'item-form') {
    return itemId
      ? `/rooms/${encodeURIComponent(roomId)}/items/${encodeURIComponent(itemId)}/edit`
      : `/rooms/${encodeURIComponent(roomId)}/items/new`
  }
  return `/rooms/${encodeURIComponent(roomId)}`
}

const defaultRooms = [
  { id: 'bedroom-1', name: 'Bedroom 1', createdAt: new Date().toISOString() },
  { id: 'bedroom-2', name: 'Bedroom 2', createdAt: new Date().toISOString() },
  { id: 'kitchen', name: 'Kitchen', createdAt: new Date().toISOString() },
]

const defaultItems = [
  {
    id: 'wardrobe',
    roomId: 'bedroom-1',
    name: 'Wardrobe',
    category: 'Furniture',
    isStorageUnit: true,
    storedCount: 12,
    storedInside: null,
    shape: 'portrait',
  },
  {
    id: 'bed-frame',
    roomId: 'bedroom-1',
    name: 'Bed frame',
    category: 'Furniture',
    isStorageUnit: false,
    storedInside: null,
    shape: 'landscape',
  },
  {
    id: 'bedside-table',
    roomId: 'bedroom-1',
    name: 'Bedside table',
    category: 'Furniture',
    isStorageUnit: true,
    storedCount: 4,
    storedInside: null,
    shape: 'portrait',
  },
  {
    id: 'laptop',
    roomId: 'bedroom-1',
    name: 'Laptop',
    category: 'Electronics',
    isStorageUnit: false,
    storedInside: 'Wardrobe',
    shape: 'landscape',
  },
  {
    id: 'desk-lamp',
    roomId: 'bedroom-1',
    name: 'Desk lamp',
    category: 'Electronics',
    isStorageUnit: false,
    storedInside: null,
    shape: 'portrait',
  },
]

const demoStoredItems = [
  {
    id: 'wardrobe-book-set',
    roomId: 'bedroom-1',
    name: 'Book set',
    category: 'Books & media',
    isStorageUnit: false,
    storedInside: 'Wardrobe',
    shape: 'landscape',
  },
  {
    id: 'wardrobe-winter-coat',
    roomId: 'bedroom-1',
    name: 'Winter coat',
    category: 'Clothing',
    isStorageUnit: false,
    storedInside: 'Wardrobe',
    shape: 'portrait',
  },
  {
    id: 'wardrobe-camera',
    roomId: 'bedroom-1',
    name: 'Camera',
    category: 'Electronics',
    isStorageUnit: false,
    storedInside: 'Wardrobe',
    shape: 'square',
  },
  {
    id: 'wardrobe-travel-bag',
    roomId: 'bedroom-1',
    name: 'Travel bag',
    category: 'Personal items',
    isStorageUnit: false,
    storedInside: 'Wardrobe',
    shape: 'landscape',
  },
  {
    id: 'wardrobe-headphones',
    roomId: 'bedroom-1',
    name: 'Headphones',
    category: 'Electronics',
    isStorageUnit: false,
    storedInside: 'Wardrobe',
    shape: 'square',
  },
  {
    id: 'wardrobe-documents',
    roomId: 'bedroom-1',
    name: 'Important documents',
    category: 'Documents',
    isStorageUnit: false,
    storedInside: 'Wardrobe',
    shape: 'portrait',
  },
  {
    id: 'wardrobe-scarf',
    roomId: 'bedroom-1',
    name: 'Winter scarf',
    category: 'Clothing',
    isStorageUnit: false,
    storedInside: 'Wardrobe',
    shape: 'wide',
  },
  {
    id: 'wardrobe-game-controller',
    roomId: 'bedroom-1',
    name: 'Game controller',
    category: 'Electronics',
    isStorageUnit: false,
    storedInside: 'Wardrobe',
    shape: 'landscape',
  },
]

function loadCollection(key, fallback) {
  const storedValue = window.localStorage.getItem(key)

  if (storedValue) {
    try {
      const parsedValue = JSON.parse(storedValue)

      if (Array.isArray(parsedValue)) {
        return parsedValue
      }
    } catch {
      window.localStorage.removeItem(key)
    }
  }

  return fallback
}

function loadInitialItems() {
  return loadCollection(ITEMS_STORAGE_KEY, [...defaultItems, ...demoStoredItems])
}

function addRoomCounts(rooms, items) {
  return rooms.map((room) => {
    const roomItems = items.filter((item) => item.roomId === room.id)

    return {
      ...room,
      itemCount: roomItems.length,
      storageCount: roomItems.filter((item) => item.isStorageUnit).length,
    }
  })
}

function LegacyThemeToggleButton({ isDarkMode, onToggle }) {
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

function AppShell({ children, isDarkMode, onToggleTheme, errorMessage, isLoading, confirmation, onConfirmationChoice, onSignOut, hideThemeToggle = false }) {
  const shellRef = useRef(null)
  const isMoveAction = confirmation?.action === 'Move'
  const keepContentsLabel = isMoveAction ? 'Leave unstored' : 'Keep items'
  const includeContentsLabel = isMoveAction ? 'Move with items' : 'Delete items too'

  useEffect(() => {
    if (!isDarkMode || !window.matchMedia('(any-hover: hover) and (any-pointer: fine)').matches) return undefined

    const shell = shellRef.current
    if (!shell) return undefined

    let animationFrame = 0
    let pointerX = 0
    let pointerY = 0

    function handlePointerMove(event) {
      if (event.pointerType === 'touch') return

      pointerX = event.clientX
      pointerY = event.clientY

      if (animationFrame) return
      animationFrame = window.requestAnimationFrame(() => {
        shell.style.setProperty('--cursor-glow-x', `${pointerX}px`)
        shell.style.setProperty('--cursor-glow-y', `${pointerY}px`)
        shell.style.setProperty('--cursor-glow-opacity', '1')
        animationFrame = 0
      })
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.cancelAnimationFrame(animationFrame)
      shell.style.setProperty('--cursor-glow-opacity', '0')
    }
  }, [isDarkMode])

  return (
    <div
      ref={shellRef}
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
      <DemoNotice />
      {children}
      {errorMessage && <div role="alert" className="fixed bottom-5 left-5 z-[70] max-w-md border border-red-300 bg-white p-4 text-sm text-red-700 shadow-xl">{errorMessage}</div>}
      {isLoading && <div role="status" className="fixed bottom-5 right-5 z-[60] border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow">Saving or loading…</div>}
      {confirmation && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-6">
          <section role="dialog" aria-modal="true" aria-labelledby="storage-confirm-title" className="w-full max-w-md border border-slate-300 bg-white p-6 shadow-2xl">
            <h2 id="storage-confirm-title" className="text-xl font-semibold text-slate-900">{confirmation.action} storage unit?</h2>
            <p className="mt-3 text-sm text-slate-700">
              This storage unit contains {confirmation.count} {confirmation.count === 1 ? 'item' : 'items'}.
              Choose what happens to them. Items you leave behind stay in this room as Unstored.
              {confirmation.action === 'Delete' && ' Included items will be permanently deleted.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="tertiary" type="button" onClick={() => onConfirmationChoice(null)}>
                Cancel
              </Button>
              <Button variant="secondary" type="button" onClick={() => onConfirmationChoice(false)}>
                {keepContentsLabel}
              </Button>
              <Button variant={confirmation.action === 'Delete' ? 'danger' : 'primary'} type="button" onClick={() => onConfirmationChoice(true)}>
                {includeContentsLabel}
              </Button>
            </div>
          </section>
        </div>
      )}
      {!hideThemeToggle && <ThemeToggleButton isDarkMode={isDarkMode} onToggle={onToggleTheme} />}
    </div>
  )
}

export default function App() {
  const initialRoute = readAppRoute()
  const [currentPage, setCurrentPage] = useState(initialRoute.page)
  const [isDarkMode, setIsDarkMode] = useState(() => api.USING_MOCK_API && readDemoThemePreference())
  const [rooms, setRooms] = useState(() =>
    api.USING_MOCK_API ? loadCollection(ROOMS_STORAGE_KEY, defaultRooms) : [],
  )
  const [roomLayouts, setRoomLayouts] = useState({})
  const [items, setItems] = useState(() =>
    api.USING_MOCK_API ? loadInitialItems() : [],
  )
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoute.roomId || (api.USING_MOCK_API ? 'bedroom-1' : null))
  const [selectedItem, setSelectedItem] = useState(null)
  const [routeItemId, setRouteItemId] = useState(initialRoute.itemId)
  const [session, setSession] = useState(api.USING_MOCK_API ? true : undefined)
  const [demoDisplayName, setDemoDisplayName] = useState('')
  const [isDemoSignedOut, setIsDemoSignedOut] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRoomsLoading, setIsRoomsLoading] = useState(!api.USING_MOCK_API)
  const [isItemsLoading, setIsItemsLoading] = useState(!api.USING_MOCK_API)
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [roomFilters, setRoomFilters] = useState({ q: '', type: 'all', categories: '' })
  const [plannerItems, setPlannerItems] = useState([])
  const [storageUnits, setStorageUnits] = useState([])
  const [isStorageUnitsLoading, setIsStorageUnitsLoading] = useState(false)
  const photoUrls = useRef(new Map())
  const photoRequests = useRef(new Map())
  const inventoryLists = useRef(new Map())
  const photoCacheGeneration = useRef(0)

  function inventoryKey(roomId, filters = roomFilters) {
    return JSON.stringify([session?.user?.id ?? 'demo', roomId, filters.q, filters.type, filters.categories])
  }

  function withCachedPhotos(rows) {
    return rows.map((item) => {
      const imageUrl = item.hasPhoto && photoUrls.current.get(`${item.id}:${item.updatedAt}`)
      return imageUrl ? { ...item, imageUrl } : item
    })
  }

  function clearPrivateCache() {
    photoCacheGeneration.current += 1
    photoUrls.current.forEach((url) => URL.revokeObjectURL(url))
    photoUrls.current.clear()
    photoRequests.current.clear()
    inventoryLists.current.clear()
  }

  function handleToggleTheme() {
    const nextIsDarkMode = !isDarkMode
    setIsDarkMode(nextIsDarkMode)

    if (api.USING_MOCK_API) {
      try {
        window.localStorage.setItem(DEMO_THEME_STORAGE_KEY, nextIsDarkMode ? 'dark' : 'light')
      } catch {
        // Keep the current theme for this session if browser storage is unavailable.
      }
      return
    }

    const user = session?.user
    if (!user || !supabase) return

    const theme = nextIsDarkMode ? 'dark' : 'light'
    try {
      window.localStorage.setItem(`roomy:theme:${user.id}`, theme)
    } catch {
      // Supabase account metadata remains the persistent preference.
    }

    supabase.auth.updateUser({
      data: { ...user.user_metadata, roomy_theme: theme },
    }).then(({ error }) => {
      if (error) setErrorMessage(`Theme changed, but its account preference could not be saved: ${error.message}`)
    }).catch((error) => {
      setErrorMessage(`Theme changed, but its account preference could not be saved: ${error.message}`)
    })
  }

  function goToRoute(page, { roomId = selectedRoomId, itemId = null, replace = false } = {}) {
    const nextPath = appPath(page, roomId, itemId)
    const nextUrl = `${nextPath}${window.location.search}`
    const method = replace ? 'replaceState' : 'pushState'

    window.history[method]({ page, roomId, itemId }, '', nextUrl)
    if (page === 'inventory' && roomId && roomId !== selectedRoomId && !api.USING_MOCK_API) {
      const cachedItems = inventoryLists.current.get(inventoryKey(roomId))
      setItems(cachedItems ? withCachedPhotos(cachedItems) : [])
      setIsItemsLoading(!cachedItems)
    }
    setCurrentPage(page)
    setSelectedRoomId(roomId || null)
    setRouteItemId(itemId)
    setSelectedItem(itemId ? items.find((item) => item.id === itemId) || null : null)
  }

  useEffect(() => {
    const handlePopState = () => {
      const route = readAppRoute()
      setCurrentPage(route.page)
      setSelectedRoomId(route.roomId || null)
      setRouteItemId(route.itemId)
      setSelectedItem(route.itemId ? items.find((item) => item.id === route.itemId) || null : null)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [items])

  useEffect(() => {
    if (currentPage !== 'item-form' || !routeItemId || selectedItem?.id === routeItemId) return
    const item = items.find((entry) => entry.id === routeItemId)
    if (item) setSelectedItem(item)
  }, [currentPage, items, routeItemId, selectedItem?.id])

  useEffect(() => () => { photoUrls.current.forEach((url) => URL.revokeObjectURL(url)) }, [])

  useEffect(() => {
    if (!confirmation) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { confirmation.resolve(null); setConfirmation(null) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmation])

  const shellProps = {
    isDarkMode, onToggleTheme: handleToggleTheme,
    errorMessage, isLoading, confirmation,
    onConfirmationChoice: (choice) => { confirmation?.resolve(choice); setConfirmation(null) },
    onSignOut: () => {
      if (api.USING_MOCK_API) {
        setIsDemoSignedOut(true)
        goToRoute('login', { replace: true })
        return
      }

      clearPrivateCache()
      goToRoute('login', { replace: true })
      return supabase?.auth.signOut({ scope: 'local' })
    },
  }

  const displayName = api.USING_MOCK_API
    ? demoDisplayName || 'User'
    : session?.user?.user_metadata?.display_name || session?.user?.email?.split('@')[0] || 'User'
  const accountEmail = api.USING_MOCK_API ? 'demo@roomy.local' : session?.user?.email || ''

  async function handleUpdateDisplayName(nextName) {
    if (api.USING_MOCK_API) {
      setDemoDisplayName(nextName)
      return
    }
    const { error } = await supabase.auth.updateUser({ data: { display_name: nextName } })
    if (error) throw error
  }

  async function handleChangePassword(nextPassword) {
    if (api.USING_MOCK_API) return
    const { error } = await supabase.auth.updateUser({ password: nextPassword })
    if (error) throw error
  }

    async function handleDeleteAccount() {
      if (api.USING_MOCK_API) {
        window.localStorage.removeItem(ROOMS_STORAGE_KEY)
        window.localStorage.removeItem(ITEMS_STORAGE_KEY)
        setRooms([])
        setItems([])
        setSelectedRoomId(null)
        setDemoDisplayName('')
        setIsDemoSignedOut(true)
        return
      }
    await api.deleteAccount()
    await supabase.auth.signOut({ scope: 'local' })
  }

  const accountProps = {
    email: accountEmail,
    onUpdateDisplayName: handleUpdateDisplayName,
    onChangePassword: handleChangePassword,
    onDeleteAccount: handleDeleteAccount,
  }

  const roomsWithCounts = api.USING_MOCK_API ? addRoomCounts(rooms, items) : rooms
  const selectedRoom =
    roomsWithCounts.find((room) => room.id === selectedRoomId) ??
    roomsWithCounts[0] ??
    { id: null, name: 'Room', itemCount: 0, storageCount: 0 }
  const storageNames = new Map(items.filter((item) => item.isStorageUnit).map((item) => [item.id, item.name]))
  const displayItems = api.USING_MOCK_API ? items.map((item) => item.isStorageUnit
    ? { ...item, storedCount: items.filter((entry) => entry.roomId === item.roomId && entry.storedInside?.toLowerCase() === item.name.toLowerCase()).length }
    : item) : items.map((item) => ({
    ...item, width: item.widthCm, depth: item.depthCm,
    storedInside: item.parentStorageId ? (item.storedInside || storageNames.get(item.parentStorageId) || 'Stored') : null,
  }))
  const inventoryStorageOptions = withCachedPhotos((api.USING_MOCK_API ? items : storageUnits)
    .filter((item) => item.roomId === selectedRoom.id && item.isStorageUnit))

  useEffect(() => {
    if (api.USING_MOCK_API || !supabase) return undefined
    let active = true
    let knownSession = null
    let initialSessionKnown = false

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        knownSession = data.session
        initialSessionKnown = true
        if (data.session) setIsDarkMode(readAccountThemePreference(data.session.user))
        setSession(data.session)
      }
    })
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (active) {
        const previousSession = knownSession
        knownSession = nextSession
        if (previousSession?.user?.id && nextSession?.user?.id && previousSession.user.id !== nextSession.user.id) {
          clearPrivateCache()
          setItems([])
        }
        if (event === 'INITIAL_SESSION') initialSessionKnown = true
        if (nextSession && ['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED'].includes(event)) {
          setIsDarkMode(readAccountThemePreference(nextSession.user))
        }
        setSession(nextSession)
        if (event === 'SIGNED_IN' && initialSessionKnown && !previousSession && readAppRoute().page === 'login') {
          goToRoute('rooms', { replace: true })
        }
        if (!nextSession) {
          clearPrivateCache()
          setRooms([])
          setItems([])
          goToRoute('login', { replace: true })
        }
      }
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (api.USING_MOCK_API || !session) return undefined
    let active = true
    setIsRoomsLoading(true)
    setIsLoading(true)
    api.listRooms().then((nextRooms) => {
      if (!active) return
      setRooms(nextRooms)
      setSelectedRoomId((current) => nextRooms.some((room) => room.id === current) ? current : (nextRooms[0]?.id ?? null))
      if (!nextRooms.length) goToRoute('rooms', { replace: true })
    }).catch((error) => { if (active) setErrorMessage(error.message) })
      .finally(() => {
        if (active) {
          setIsLoading(false)
          setIsRoomsLoading(false)
        }
      })
    return () => { active = false }
  }, [session?.user?.id])

  useEffect(() => {
    if (currentPage !== 'rooms' || !rooms.length || (!api.USING_MOCK_API && !session)) return undefined
    let active = true

    Promise.all(rooms.map(async (room) => {
      try {
        const layout = await api.getLayout(room.id)
        const placements = Array.isArray(layout.items) ? layout.items : []
        let roomItems = []

        if (placements.length) {
          roomItems = api.USING_MOCK_API
            ? items.filter((item) => item.roomId === room.id)
            : await listEveryItem(room.id, { q: '', type: 'all', categories: '' })
        }

        const itemsById = new Map(roomItems.map((item) => [item.id, item]))
        return [room.id, {
          ...layout,
          items: placements.map((placement) => ({
            ...placement,
            name: itemsById.get(placement.itemId)?.name || 'Item',
          })),
        }]
      } catch {
        return [room.id, { items: [], updatedAt: null, previewUnavailable: true }]
      }
    })).then((entries) => {
      if (active) setRoomLayouts(Object.fromEntries(entries))
    })

    return () => { active = false }
  }, [currentPage, rooms, session?.user?.id, api.USING_MOCK_API ? items : null])

  useEffect(() => {
    if (api.USING_MOCK_API) {
      setIsItemsLoading(false)
      return undefined
    }
    if (!session || !selectedRoomId) {
      setIsItemsLoading(false)
      return undefined
    }
    let active = true
    const key = inventoryKey(selectedRoomId, roomFilters)
    const cachedItems = inventoryLists.current.get(key)
    if (cachedItems) setItems(withCachedPhotos(cachedItems))
    else setItems([])
    setIsItemsLoading(!cachedItems)
    listEveryItem(selectedRoomId, roomFilters).then((nextItems) => {
      if (!active) return

      inventoryLists.current.set(key, nextItems)
      setItems(withCachedPhotos(nextItems))
    }).catch((error) => { if (active) setErrorMessage(error.message) })
      .finally(() => { if (active) setIsItemsLoading(false) })
    return () => { active = false }
  }, [session?.user?.id, selectedRoomId, roomFilters.q, roomFilters.type, roomFilters.categories])

  useEffect(() => {
    if (api.USING_MOCK_API || !session || !['item-form', 'inventory'].includes(currentPage) || !selectedRoomId) {
      setIsStorageUnitsLoading(false)
      return undefined
    }
    let active = true
    setStorageUnits([])
    setIsStorageUnitsLoading(true)
    listEveryItem(selectedRoomId, { q: '', type: 'storage', categories: '' })
      .then((rows) => { if (active) setStorageUnits(rows) })
      .catch((error) => { if (active) setErrorMessage(error.message) })
      .finally(() => { if (active) setIsStorageUnitsLoading(false) })
    return () => { active = false }
  }, [session?.user?.id, currentPage, selectedRoomId])

  useEffect(() => {
    if (currentPage !== 'planner' || !selectedRoomId) return undefined
    if (api.USING_MOCK_API) { setPlannerItems(items.filter((item) => item.roomId === selectedRoomId)); return undefined }
    let active = true
    listEveryItem(selectedRoomId, { q: '', type: 'all', categories: '' })
      .then((rows) => { if (active) setPlannerItems(rows) })
      .catch((error) => { if (active) setErrorMessage(error.message) })
    return () => { active = false }
  }, [currentPage, selectedRoomId, session?.user?.id])

  useEffect(() => {
    if (!api.USING_MOCK_API) return
    window.localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms))
  }, [rooms])

  useEffect(() => {
    if (!api.USING_MOCK_API) return
    window.localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  async function run(operation) {
    setErrorMessage('')
    setIsLoading(true)
    try { return await operation() }
    catch (error) { setErrorMessage(error.message); throw error }
    finally { setIsLoading(false) }
  }

  async function refreshRooms() {
    if (!api.USING_MOCK_API) setRooms(await api.listRooms())
  }

  async function listEveryItem(roomId, filters) {
    const all = []
    for (let offset = 0; ; offset += 100) {
      const page = await api.listItems(roomId, { ...filters, limit: 100, offset })
      all.push(...page)
      if (page.length < 100) return all
    }
  }

  async function getAllRoomItems(roomId) {
    if (api.USING_MOCK_API) return items.filter((item) => item.roomId === roomId)

    const filters = { q: '', type: 'all', categories: '' }
    const key = inventoryKey(roomId, filters)
    let roomItems = inventoryLists.current.get(key)
    if (!roomItems) {
      roomItems = await listEveryItem(roomId, filters)
      inventoryLists.current.set(key, roomItems)
    }
    return withCachedPhotos(roomItems)
  }

  async function loadPhotoForItem(item) {
    if (api.USING_MOCK_API || !item?.hasPhoto) return null

    const key = `${item.id}:${item.updatedAt}`
    const cachedUrl = photoUrls.current.get(key)
    if (cachedUrl) return cachedUrl

    const pendingRequest = photoRequests.current.get(key)
    if (pendingRequest) return pendingRequest

    const generation = photoCacheGeneration.current
    const request = api.getPhoto(item.id, item.updatedAt).then((blob) => {
      if (generation !== photoCacheGeneration.current) return null
      const imageUrl = URL.createObjectURL(blob)
      photoUrls.current.set(key, imageUrl)
      setItems((currentItems) => currentItems.map((entry) => (
        entry.id === item.id && entry.updatedAt === item.updatedAt
          ? { ...entry, imageUrl }
          : entry
      )))
      return imageUrl
    }).finally(() => {
      if (photoRequests.current.get(key) === request) photoRequests.current.delete(key)
    })

    photoRequests.current.set(key, request)
    return request
  }

  async function refreshItems(roomId = selectedRoomId) {
    if (!api.USING_MOCK_API && roomId) {
      const nextItems = await listEveryItem(roomId, roomFilters)
      inventoryLists.current.set(inventoryKey(roomId), nextItems)
      setItems(withCachedPhotos(nextItems))
    }
  }

  async function handleSavePlannerLayout(roomId, input) {
    const savedLayout = await run(() => api.saveLayout(roomId, input))
    inventoryLists.current.clear()
    try {
      const allItemsFilter = { q: '', type: 'all', categories: '' }
      const [nextRooms, nextPlannerItems, nextInventoryItems] = await Promise.all([
        api.listRooms(),
        listEveryItem(roomId, allItemsFilter),
        listEveryItem(roomId, roomFilters),
      ])

      inventoryLists.current.set(inventoryKey(roomId, roomFilters), nextInventoryItems)
      setRooms(nextRooms)
      setPlannerItems(nextPlannerItems)
      setItems((currentItems) => withCachedPhotos(nextInventoryItems).map((item) => ({
        ...item,
        imageUrl: item.imageUrl ?? currentItems.find((current) => current.id === item.id)?.imageUrl,
      })))
    } catch (error) {
      setErrorMessage(`Layout saved. Other room views will refresh when reopened: ${error.message}`)
    }
    return savedLayout
  }

  async function getContentsWithPhotos(itemId) {
    const contents = await api.getContents(itemId)
    if (api.USING_MOCK_API) return contents
    return { ...contents, items: withCachedPhotos(contents.items) }
  }

  async function handleUnstoreItem(item) {
    return run(async () => {
      const updatedItem = await api.updateItem(item.id, { parentStorageId: null })
      if (api.USING_MOCK_API) {
        setItems((currentItems) => currentItems.map((entry) => {
          if (entry.id === item.id) {
            return { ...entry, ...updatedItem, parentStorageId: null, storedInside: null }
          }

          const isParentStorage = entry.isStorageUnit && (
            entry.id === item.parentStorageId ||
            (item.storedInside && entry.name.toLowerCase() === item.storedInside.toLowerCase())
          )
          if (!isParentStorage) return entry

          const storedCount = currentItems.filter((candidate) => (
            candidate.id !== item.id && (
              candidate.parentStorageId === entry.id ||
              (!candidate.parentStorageId && candidate.storedInside?.toLowerCase() === entry.name.toLowerCase())
            )
          )).length
          return { ...entry, storedCount }
        }))
        return updatedItem
      }

      inventoryLists.current.clear()
      await refreshItems()
      return updatedItem
    })
  }

  async function handleStoreItem(item, storage) {
    if (item.isStorageUnit) throw new Error('Storage units cannot be stored inside another item.')

    const availableStorages = api.USING_MOCK_API ? items : storageUnits
    const targetStorage = availableStorages.find((entry) => (
      entry.id === storage.id && entry.roomId === item.roomId && entry.isStorageUnit
    ))
    if (!targetStorage) throw new Error('That storage unit is no longer available in this room.')

    return run(async () => {
      const updateFields = {
        parentStorageId: targetStorage.id,
        ...(api.USING_MOCK_API ? { storedInside: targetStorage.name } : {}),
      }
      const updatedItem = await api.updateItem(item.id, updateFields)

      if (api.USING_MOCK_API) {
        setItems((currentItems) => currentItems.map((entry) => (
          entry.id === item.id ? { ...entry, ...updateFields } : entry
        )))
        return updatedItem
      }

      inventoryLists.current.clear()
      await refreshItems()
      return updatedItem
    })
  }

  async function handleAddRoom(room) {
    if (!api.USING_MOCK_API) {
      await run(async () => { await api.createRoom({ name: room.name, widthCm: room.widthCm, depthCm: room.depthCm }); await refreshRooms() })
      return
    }
    setRooms((currentRooms) => [...currentRooms, room])
  }

  async function handleRenameRoom(roomId, name) {
    if (!api.USING_MOCK_API) {
      await run(async () => { await api.updateRoom(roomId, { name }); await refreshRooms() })
      return
    }
    setRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === roomId ? { ...room, name } : room,
      ),
    )
  }

  async function handleDeleteRoom(roomId) {
    if (!api.USING_MOCK_API) {
      await run(async () => {
        await api.deleteRoom(roomId)
        const nextRooms = await api.listRooms()
        setRooms(nextRooms)
        if (selectedRoomId === roomId) { setSelectedRoomId(nextRooms[0]?.id ?? null); setItems([]) }
      })
      return
    }
    const remainingRooms = rooms.filter((room) => room.id !== roomId)

    setRooms(remainingRooms)
    setItems((currentItems) =>
      currentItems.filter((item) => item.roomId !== roomId),
    )

    if (selectedRoomId === roomId) {
      setSelectedRoomId(remainingRooms[0]?.id ?? null)
    }
  }

  function askAboutContents(action, count) {
    return new Promise((resolve) => setConfirmation({ action, count, resolve }))
  }

  async function handleSaveItem(formData) {
    if (!api.USING_MOCK_API) {
      const payload = {
        name: formData.name.trim(), category: formData.category, notes: formData.notes,
        isStorageUnit: Boolean(formData.isStorageUnit),
        parentStorageId: formData.isStorageUnit || formData.storedInside === 'Not stored' ? null : formData.storedInside,
        widthCm: formData.width === '' ? null : Number(formData.width),
        depthCm: formData.depth === '' ? null : Number(formData.depth),
        photoPositionX: formData.photoPositionX,
        photoPositionY: formData.photoPositionY,
        photoZoom: formData.photoZoom,
      }
      await run(async () => {
        const saved = selectedItem
          ? await api.updateItem(selectedItem.id, payload)
          : await api.createItem(selectedRoom.id, payload)
        if (formData.photoFile) {
          try {
            const compressedPhoto = await compressImage(formData.photoFile)
            await api.uploadPhoto(saved.id, compressedPhoto)
          }
          catch (error) { setSelectedItem(saved); throw new Error(`Item saved, but photo upload failed: ${error.message}`) }
        }
        await refreshItems()
        await refreshRooms()
        goToRoute('inventory')
      })
      return
    }
    const savedItem = {
      id: selectedItem?.id ?? `item-${Date.now()}`,
      roomId: formData.roomId ?? selectedRoom.id,
      name: formData.name.trim(),
      category: formData.category,
      isStorageUnit: Boolean(formData.isStorageUnit),
      storedInside:
        formData.isStorageUnit || formData.storedInside === 'Not stored'
          ? null
          : formData.storedInside,
      storedCount: selectedItem?.storedCount ?? 0,
      notes: formData.notes,
      width: formData.width ? Number(formData.width) : null,
      depth: formData.depth ? Number(formData.depth) : null,
      photoPositionX: formData.photoPositionX ?? 50,
      photoPositionY: formData.photoPositionY ?? 50,
      photoZoom: formData.photoZoom ?? 1,
      shape: selectedItem?.shape ?? 'square',
    }

    setItems((currentItems) => {
      if (selectedItem) {
        return currentItems.map((item) =>
          item.id === selectedItem.id ? savedItem : item,
        )
      }

      return [...currentItems, savedItem]
    })
    goToRoute('inventory')
  }

  async function handleDeleteItem(itemId) {
    if (!api.USING_MOCK_API) {
      const item = items.find((entry) => entry.id === itemId)
      if (!item) return
      const contents = item.isStorageUnit ? await api.getContents(itemId) : null
      let decision = {}
      if (contents?.items.length) {
        const includeContents = await askAboutContents('Delete', contents.items.length)
        if (includeContents === null) return
        decision = { includeContents, contentsVersion: contents.contentsVersion }
      }
      await run(async () => {
        await api.deleteItem(itemId, decision)
        await refreshItems()
        await refreshRooms()
        goToRoute('inventory')
      })
      return
    }
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    const children = item.isStorageUnit ? items.filter((entry) => entry.roomId === item.roomId && entry.storedInside?.toLowerCase() === item.name.toLowerCase()) : []
    let includeContents = false
    if (children.length) {
      includeContents = await askAboutContents('Delete', children.length)
      if (includeContents === null) return
    }
    setItems((currentItems) => currentItems
      .filter((entry) => entry.id !== itemId && (!includeContents || !children.some((child) => child.id === entry.id)))
      .map((entry) => children.some((child) => child.id === entry.id) ? { ...entry, storedInside: null } : entry))
    goToRoute('inventory')
  }

  async function handleMoveItem(itemId, roomName) {
    const targetRoom = rooms.find((room) => room.name === roomName)

    if (!targetRoom) return

    if (!api.USING_MOCK_API) {
      const item = items.find((entry) => entry.id === itemId)
      if (!item) return
      const contents = item.isStorageUnit ? await api.getContents(itemId) : null
      let decision = {}
      if (contents?.items.length) {
        const includeContents = await askAboutContents('Move', contents.items.length)
        if (includeContents === null) return
        decision = { includeContents, contentsVersion: contents.contentsVersion }
      }
      await run(async () => {
        await api.moveItem(itemId, { targetRoomId: targetRoom.id, ...decision })
        await refreshItems()
        await refreshRooms()
        goToRoute('inventory')
      })
      return
    }

    const item = items.find((entry) => entry.id === itemId)
    const children = item?.isStorageUnit ? items.filter((entry) => entry.roomId === item.roomId && entry.storedInside?.toLowerCase() === item.name.toLowerCase()) : []
    let includeContents = false
    if (children.length) {
      includeContents = await askAboutContents('Move', children.length)
      if (includeContents === null) return
    }
    setItems((currentItems) => currentItems.map((entry) => {
      if (entry.id === itemId) return { ...entry, roomId: targetRoom.id, storedInside: null }
      if (children.some((child) => child.id === entry.id)) return includeContents
        ? { ...entry, roomId: targetRoom.id }
        : { ...entry, storedInside: null }
      return entry
    }))
    goToRoute('inventory')
  }

  if (!api.USING_MOCK_API && !supabase) {
    return <div className="mx-auto max-w-xl p-8 text-slate-900">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in client/.env to enable the real app.</div>
  }
  if (!api.USING_MOCK_API && session === undefined) {
    if (currentPage === 'planner') return <PlannerLoadingScreen />
    return <div role="status" className="p-8 text-slate-700">Checking your session…</div>
  }
  if (isDemoSignedOut) {
    return <AuthPage
      demoMode
      isDarkMode={isDarkMode}
      onToggleTheme={handleToggleTheme}
      onDemoSignIn={(nextDisplayName) => {
        if (nextDisplayName) setDemoDisplayName(nextDisplayName)
        goToRoute('rooms', { replace: true })
        setIsDemoSignedOut(false)
      }}
    />
  }
  if (!api.USING_MOCK_API && !session) {
    return <AuthPage isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} />
  }

  if (currentPage === 'planner') {
    return <AppShell {...shellProps} hideThemeToggle>
      <PlannerWorkspace room={selectedRoom} items={plannerItems} onBack={() => goToRoute('inventory')}
        isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} onLoad={api.getLayout} onLoadPhoto={loadPhotoForItem} onSave={handleSavePlannerLayout} onGetContents={api.getContents} onSignOut={shellProps.onSignOut} displayName={displayName} {...accountProps} />
    </AppShell>
  }

  if (currentPage === 'rooms') {
    return (
      <AppShell {...shellProps}>
        <RoomsPage
          rooms={roomsWithCounts}
          roomLayouts={roomLayouts}
          onAddRoom={handleAddRoom}
          onRenameRoom={handleRenameRoom}
          onDeleteRoom={handleDeleteRoom}
          onSignOut={shellProps.onSignOut}
          displayName={displayName}
          isDarkMode={isDarkMode}
          isLoading={isRoomsLoading}
          {...accountProps}
          onEnterRoom={(room) => {
            goToRoute('inventory', { roomId: room.id })
          }}
        />
      </AppShell>
    )
  }

  if (currentPage === 'item-form') {
    return (
      <AppShell {...shellProps}>
        <ItemFormPage
          room={selectedRoom}
          item={selectedItem}
          onCancel={() => goToRoute('inventory')}
          onBackToRooms={() => goToRoute('rooms')}
          onBackToInventory={() => goToRoute('inventory')}
          rooms={roomsWithCounts}
          onSave={handleSaveItem}
          onDeleteItem={handleDeleteItem}
          onMoveItem={handleMoveItem}
          onSignOut={shellProps.onSignOut}
          displayName={displayName}
          isDarkMode={isDarkMode}
          {...accountProps}
          onDeletePhoto={async (itemId) => run(async () => {
            await api.deletePhoto(itemId)
            setSelectedItem((current) => current ? { ...current, hasPhoto: false, imageUrl: null } : current)
            await refreshItems()
          })}
          storageOptions={api.USING_MOCK_API ? undefined : storageUnits.filter((entry) => entry.id !== selectedItem?.id).map((entry) => ({ value: entry.id, label: entry.name }))}
          allowPhoto={!api.USING_MOCK_API}
        />
      </AppShell>
    )
  }

  return (
    <AppShell {...shellProps}>
      <RoomInventoryPage
        room={selectedRoom}
        items={displayItems.filter((item) => item.roomId === selectedRoom.id)}
        onBackToRooms={() => goToRoute('rooms')}
        onAddItem={() => {
          goToRoute('item-form', { itemId: null })
        }}
        onEditItem={(item) => {
          goToRoute('item-form', { itemId: item.id })
        }}
        onOpenPlanner={() => goToRoute('planner')}
        onSignOut={shellProps.onSignOut}
        displayName={displayName}
        isDarkMode={isDarkMode}
        {...accountProps}
        onGetContents={api.USING_MOCK_API ? undefined : getContentsWithPhotos}
        onGetAddableItems={getAllRoomItems}
        onLoadPhoto={loadPhotoForItem}
        onUnstoreItem={handleUnstoreItem}
        onStoreItem={handleStoreItem}
        storageOptions={inventoryStorageOptions}
        storageOptionsLoading={isStorageUnitsLoading}
        isLoading={isItemsLoading}
        onFilterChange={api.USING_MOCK_API ? undefined : (next) => setRoomFilters((current) => {
          const updated = { q: next.q, type: next.type, categories: next.categories.join(',') }
          return current.q === updated.q && current.type === updated.type && current.categories === updated.categories ? current : updated
        })}
      />
    </AppShell>
  )
}

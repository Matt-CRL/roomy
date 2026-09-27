import { useEffect, useRef, useState } from 'react'
import ItemFormPage from './pages/ItemFormPage'
import RoomsPage from './pages/RoomsPage'
import RoomInventoryPage from './pages/RoomInventoryPage'
import AuthPage from './pages/AuthPage'
import PlannerPage from './pages/PlannerPage'
import ThemeToggleButton from './components/layout/ThemeToggleButton'
import Button from './components/common/Button'
import * as api from './api'
import { supabase } from './api/supabase'
import DemoNotice from './components/DemoNotice'

const ROOMS_STORAGE_KEY = 'roomy:rooms'
const ITEMS_STORAGE_KEY = 'roomy:items'

const defaultRooms = [
  { id: 'bedroom-1', name: 'Bedroom 1' },
  { id: 'bedroom-2', name: 'Bedroom 2' },
  { id: 'kitchen', name: 'Kitchen' },
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

function AppShell({ children, isDarkMode, onToggleTheme, errorMessage, isLoading, confirmation, onConfirmationChoice, onSignOut }) {
  const isMoveAction = confirmation?.action === 'Move'
  const keepContentsLabel = isMoveAction ? 'Leave unstored' : 'Keep items'
  const includeContentsLabel = isMoveAction ? 'Move with items' : 'Delete items too'

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
  const [rooms, setRooms] = useState(() =>
    api.USING_MOCK_API ? loadCollection(ROOMS_STORAGE_KEY, defaultRooms) : [],
  )
  const [items, setItems] = useState(() =>
    api.USING_MOCK_API ? loadInitialItems() : [],
  )
  const [selectedRoomId, setSelectedRoomId] = useState(api.USING_MOCK_API ? 'bedroom-1' : null)
  const [selectedItem, setSelectedItem] = useState(null)
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
  const photoUrls = useRef(new Map())

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
    isDarkMode, onToggleTheme: () => setIsDarkMode((current) => !current),
    errorMessage, isLoading, confirmation,
    onConfirmationChoice: (choice) => { confirmation?.resolve(choice); setConfirmation(null) },
    onSignOut: () => {
      if (api.USING_MOCK_API) {
        setIsDemoSignedOut(true)
        return
      }

      return supabase?.auth.signOut({ scope: 'local' })
    },
  }

  const displayName = api.USING_MOCK_API
    ? demoDisplayName || 'User'
    : session?.user?.user_metadata?.display_name || session?.user?.email?.split('@')[0] || 'User'

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

  useEffect(() => {
    if (api.USING_MOCK_API || !supabase) return undefined
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session)
    })
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (active) {
        setSession(nextSession)
        if (!nextSession) { setRooms([]); setItems([]); setSelectedRoomId(null) }
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
      if (!nextRooms.length) setCurrentPage('rooms')
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
    if (api.USING_MOCK_API) {
      setIsItemsLoading(false)
      return undefined
    }
    if (!session || !selectedRoomId) {
      setIsItemsLoading(false)
      return undefined
    }
    let active = true
    setIsItemsLoading(true)
    listEveryItem(selectedRoomId, roomFilters).then((nextItems) => {
      return hydratePhotos(nextItems).then((withPhotos) => { if (active) setItems(withPhotos) })
    }).catch((error) => { if (active) setErrorMessage(error.message) })
      .finally(() => { if (active) setIsItemsLoading(false) })
    return () => { active = false }
  }, [session?.user?.id, selectedRoomId, roomFilters.q, roomFilters.type, roomFilters.categories])

  useEffect(() => {
    if (api.USING_MOCK_API || !session || currentPage !== 'item-form' || !selectedRoomId) return undefined
    let active = true
    listEveryItem(selectedRoomId, { q: '', type: 'storage', categories: '' })
      .then((rows) => { if (active) setStorageUnits(rows) })
      .catch((error) => { if (active) setErrorMessage(error.message) })
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

  async function hydratePhotos(rows) {
    if (api.USING_MOCK_API) return rows
    return Promise.all(rows.map(async (item) => {
      if (!item.hasPhoto) return item
      try {
        const key = `${item.id}:${item.updatedAt}`
        if (photoUrls.current.has(key)) return { ...item, imageUrl: photoUrls.current.get(key) }
        const imageUrl = URL.createObjectURL(await api.getPhoto(item.id))
        photoUrls.current.set(key, imageUrl)
        return { ...item, imageUrl }
      } catch { return item }
    }))
  }

  async function refreshItems(roomId = selectedRoomId) {
    if (!api.USING_MOCK_API && roomId) setItems(await hydratePhotos(await listEveryItem(roomId, roomFilters)))
  }

  async function getContentsWithPhotos(itemId) {
    const contents = await api.getContents(itemId)
    if (api.USING_MOCK_API) return contents
    return { ...contents, items: await hydratePhotos(contents.items) }
  }

  async function handleAddRoom(room) {
    if (!api.USING_MOCK_API) {
      await run(async () => { await api.createRoom({ name: room.name, widthCm: room.widthCm, depthCm: room.depthCm }); await refreshRooms() })
      return
    }
    setRooms((currentRooms) => [...currentRooms, room])
  }

  async function handleRenameRoom(roomId, name, widthCm, depthCm) {
    if (!api.USING_MOCK_API) {
      await run(async () => { await api.updateRoom(roomId, { name, widthCm, depthCm }); await refreshRooms() })
      return
    }
    setRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === roomId ? { ...room, name, widthCm, depthCm } : room,
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
          try { await api.uploadPhoto(saved.id, formData.photoFile) }
          catch (error) { setSelectedItem(saved); throw new Error(`Item saved, but photo upload failed: ${error.message}`) }
        }
        await refreshItems()
        await refreshRooms()
        setSelectedItem(null)
        setCurrentPage('inventory')
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
    setSelectedItem(null)
    setCurrentPage('inventory')
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
        setSelectedItem(null)
        setCurrentPage('inventory')
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
    setSelectedItem(null)
    setCurrentPage('inventory')
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
        setSelectedItem(null)
        setCurrentPage('inventory')
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
    setSelectedItem(null)
    setCurrentPage('inventory')
  }

  if (!api.USING_MOCK_API && !supabase) {
    return <div className="mx-auto max-w-xl p-8 text-slate-900">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in client/.env to enable the real app.</div>
  }
  if (!api.USING_MOCK_API && session === undefined) {
    return <div role="status" className="p-8 text-slate-700">Checking your session…</div>
  }
  if (isDemoSignedOut) {
    return <AuthPage
      demoMode
      onDemoSignIn={(nextDisplayName) => {
        if (nextDisplayName) setDemoDisplayName(nextDisplayName)
        setIsDemoSignedOut(false)
      }}
    />
  }
  if (!api.USING_MOCK_API && !session) {
    return <AuthPage />
  }

  if (currentPage === 'planner') {
    return <AppShell {...shellProps}>
      <PlannerPage room={selectedRoom} items={plannerItems} onBack={() => setCurrentPage('inventory')}
        onLoad={api.getLayout} onSave={api.saveLayout} onGetContents={api.getContents} onSignOut={shellProps.onSignOut} displayName={displayName} />
    </AppShell>
  }

  if (currentPage === 'rooms') {
    return (
      <AppShell {...shellProps}>
        <RoomsPage
          rooms={roomsWithCounts}
          onAddRoom={handleAddRoom}
          onRenameRoom={handleRenameRoom}
          onDeleteRoom={handleDeleteRoom}
          onSignOut={shellProps.onSignOut}
          displayName={displayName}
          isLoading={isRoomsLoading}
          onEnterRoom={(room) => {
            setSelectedRoomId(room.id)
            if (!api.USING_MOCK_API) setIsItemsLoading(true)
            setCurrentPage('inventory')
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
          onCancel={() => setCurrentPage('inventory')}
          onBackToRooms={() => setCurrentPage('rooms')}
          onBackToInventory={() => setCurrentPage('inventory')}
          rooms={roomsWithCounts}
          onSave={handleSaveItem}
          onDeleteItem={handleDeleteItem}
          onMoveItem={handleMoveItem}
          onSignOut={shellProps.onSignOut}
          displayName={displayName}
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
        onBackToRooms={() => setCurrentPage('rooms')}
        onAddItem={() => {
          setSelectedItem(null)
          setCurrentPage('item-form')
        }}
        onEditItem={(item) => {
          setSelectedItem(item)
          setCurrentPage('item-form')
        }}
        onOpenPlanner={() => setCurrentPage('planner')}
        onSignOut={shellProps.onSignOut}
        displayName={displayName}
        onGetContents={api.USING_MOCK_API ? undefined : getContentsWithPhotos}
        isLoading={isItemsLoading}
        onFilterChange={api.USING_MOCK_API ? undefined : (next) => setRoomFilters((current) => {
          const updated = { q: next.q, type: next.type, categories: next.categories.join(',') }
          return current.q === updated.q && current.type === updated.type && current.categories === updated.categories ? current : updated
        })}
      />
    </AppShell>
  )
}

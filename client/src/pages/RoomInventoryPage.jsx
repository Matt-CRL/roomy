import { useEffect, useRef, useState } from 'react'
import Button from '../components/common/Button'
import AddItemCard from '../components/items/AddItemCard'
import InventoryFilters from '../components/items/InventoryFilters'
import InventoryItemCard from '../components/items/InventoryItemCard'
import InventoryTypeIcon from '../components/items/InventoryTypeIcon'
import { getPhotoImageStyle } from '../data/photoDisplay'
import TiltEffect from '../components/common/TiltEffect'
import AppNavbar from '../components/layout/AppNavbar'
import emptyRoomIcon from '../assets/empty-room.png'

function getItemStatus(item) {
  if (item.isStorageUnit) return `${item.storedCount ?? 0} inside`
  if (item.storedInside && item.storedInside !== 'Not stored') {
    return `Stored in ${item.storedInside}`
  }

  return 'Unstored'
}

function InventoryLoadingState({ viewMode }) {
  if (viewMode === 'list') {
    return (
      <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading inventory">
        {[0, 1, 2, 3, 4].map((skeleton) => (
          <div key={skeleton} className="flex min-h-16 animate-pulse items-center justify-between border border-slate-300 bg-white px-4 py-2">
            <div className="space-y-2">
              <div className="h-3 w-28 bg-slate-200" />
              <div className="h-2.5 w-20 bg-slate-100" />
            </div>
            <div className="h-6 w-16 bg-slate-200" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading inventory">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((skeleton) => (
        <div key={skeleton} className="animate-pulse overflow-hidden border border-slate-300 bg-white">
          <div className="h-40 bg-slate-200" />
          <div className="space-y-3 p-3">
            <div className="h-3 w-24 bg-slate-200" />
            <div className="h-2.5 w-16 bg-slate-100" />
            <div className="mt-4 h-6 w-20 bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RoomInventoryPage({
  room,
  items = [],
  onBackToRooms,
  onAddItem,
  onEditItem,
  onOpenPlanner,
  onGetContents,
  onFilterChange,
  onSignOut,
  displayName,
  isLoading = false,
}) {
  const roomName = room?.name ?? 'Bedroom 1'
  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ type: 'all', categories: [] })
  const [loadedContents, setLoadedContents] = useState(null)
  const [focusedItem, setFocusedItem] = useState(null)
  const [focusOrigin, setFocusOrigin] = useState(null)
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [isInventoryClosing, setIsInventoryClosing] = useState(false)
  const [isInventoryRecentering, setIsInventoryRecentering] = useState(false)
  const [isInventoryAtTop, setIsInventoryAtTop] = useState(true)
  const [isInventoryAtBottom, setIsInventoryAtBottom] = useState(false)
  const inventoryCloseTimer = useRef(null)

  useEffect(() => {
    if (!focusedItem) return undefined

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setFocusedItem(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousBodyOverflow
    }
  }, [focusedItem])

  useEffect(() => {
    if (!onFilterChange) return undefined
    const timer = window.setTimeout(() => onFilterChange({ q: searchQuery, ...filters }), 250)
    return () => window.clearTimeout(timer)
  }, [searchQuery, filters, onFilterChange])

  useEffect(() => {
    setLoadedContents(null)
    if (!focusedItem?.isStorageUnit || !onGetContents) return undefined
    let active = true
    onGetContents(focusedItem.id).then((result) => { if (active) setLoadedContents(result.items) })
      .catch(() => { if (active) setLoadedContents([]) })
    return () => { active = false }
  }, [focusedItem?.id, onGetContents])

  useEffect(() => {
    window.clearTimeout(inventoryCloseTimer.current)
    setIsInventoryOpen(false)
    setIsInventoryClosing(false)
    setIsInventoryRecentering(false)
    setIsInventoryAtTop(true)
    setIsInventoryAtBottom(false)
  }, [focusedItem])

  useEffect(
    () => () => window.clearTimeout(inventoryCloseTimer.current),
    [],
  )

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const visibleItems = (normalizedQuery
    ? items.filter((item) =>
        [item.name, item.category, item.storedInside]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
    : items).filter((item) => filters.type === 'all' || item.isStorageUnit === (filters.type === 'storage'))
      .filter((item) => !filters.categories.length || filters.categories.includes(item.category))
  const containedItems = loadedContents ?? (focusedItem
    ? items.filter(
        (item) =>
          item.id !== focusedItem.id &&
          typeof item.storedInside === 'string' &&
          item.storedInside.toLowerCase() === focusedItem.name.toLowerCase(),
      )
    : [])

  function handleAddItem() {
    onAddItem?.()
  }

  function handlePlanner() {
    onOpenPlanner?.()
  }

  function handleItemOptions(item) {
    setFocusedItem(null)
    onEditItem?.(item)
  }

  function handleItemSelect(item, event) {
    const sourceRect = event?.currentTarget?.getBoundingClientRect()

    if (sourceRect) {
      const sourceCenterX = sourceRect.left + sourceRect.width / 2
      const sourceCenterY = sourceRect.top + sourceRect.height / 2
      const sourceScale = Math.max(
        0.35,
        Math.min(0.7, Math.min(sourceRect.width / 760, sourceRect.height / 460)),
      )

      setFocusOrigin({
        x: sourceCenterX - window.innerWidth / 2,
        y: sourceCenterY - window.innerHeight / 2,
        scale: sourceScale,
      })
    }

    setFocusedItem(item)
  }

  function toggleInventorySidebar() {
    window.clearTimeout(inventoryCloseTimer.current)

    if (isInventoryOpen) {
      setIsInventoryClosing(true)
      setIsInventoryRecentering(false)
      inventoryCloseTimer.current = window.setTimeout(() => {
        setIsInventoryRecentering(true)
        inventoryCloseTimer.current = window.setTimeout(() => {
          setIsInventoryOpen(false)
          setIsInventoryClosing(false)
          setIsInventoryRecentering(false)
        }, 300)
      }, 300)
      return
    }

    setIsInventoryClosing(false)
    setIsInventoryRecentering(false)
    setIsInventoryAtTop(true)
    setIsInventoryAtBottom(false)
    setIsInventoryOpen(true)
  }

  function handleInventoryScroll(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget

    setIsInventoryAtTop(scrollTop <= 20)
    setIsInventoryAtBottom(
      scrollTop + clientHeight >= scrollHeight - 20,
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-screen-2xl">
        <AppNavbar onSignOut={onSignOut} displayName={displayName} />

        <header className="flex flex-col gap-5 pt-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-3xl font-bold text-slate-900">
                Room Inventory
              </h1>

              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-base text-slate-500"
              >
                <button
                  type="button"
                  onClick={onBackToRooms}
                  className="transition-colors hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  Rooms
                </button>
                <span aria-hidden="true">/</span>
              <span className="font-semibold text-orange-500">
                {roomName}
              </span>
              </nav>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              {room?.itemCount ?? items.length} {(room?.itemCount ?? items.length) === 1 ? 'item' : 'items'} ·{' '}
              {room?.storageCount ?? items.filter((item) => item.isStorageUnit).length} storage{' '}
              {(room?.storageCount ?? items.filter((item) => item.isStorageUnit).length) === 1
                ? 'unit'
                : 'units'}{' '}
              · Updated today
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handlePlanner}>
              Planner
            </Button>

            <Button variant="primary" onClick={handleAddItem}>
              + Add item
            </Button>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
          <InventoryFilters value={filters} onChange={setFilters} />

          <section aria-labelledby="inventory-heading">
            <h2 id="inventory-heading" className="sr-only">
              Bedroom inventory items
            </h2>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 gap-2">
                <div className="relative min-w-0 flex-1">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  >
                    <circle cx="11" cy="11" r="6" />
                    <path d="m16 16 4 4" />
                  </svg>

                  <input
                    type="search"
                    placeholder="Search items"
                    aria-label="Search items"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="min-h-11 w-full border border-slate-300 pl-10 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="night-view-toggle flex self-end border border-slate-300 text-xs font-medium xl:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`min-h-11 px-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset ${
                    viewMode === 'grid'
                      ? 'view-toggle-active bg-slate-900 text-white'
                      : 'view-toggle-inactive bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={viewMode === 'grid'}
                >
                  Grid
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`min-h-11 px-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset ${
                    viewMode === 'list'
                      ? 'view-toggle-active bg-slate-900 text-white'
                      : 'view-toggle-inactive bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={viewMode === 'list'}
                >
                  List
                </button>
              </div>
            </div>

            {isLoading ? (
              <InventoryLoadingState viewMode={viewMode} />
            ) : (room?.itemCount ?? items.length) === 0 ? (
              <div className="mt-6 flex min-h-80 flex-col items-center justify-center border border-dashed border-slate-300 bg-white p-8 text-center">
                <img
                  src={emptyRoomIcon}
                  alt=""
                  className="h-24 w-24 object-contain"
                />
                <h3 className="mt-5 text-base font-semibold text-slate-900">
                  Room is empty
                </h3>
                <p className="mt-2 text-xs text-slate-500">
                  Add the first item to start your inventory.
                </p>
                <Button variant="primary" className="mt-5" onClick={handleAddItem}>
                  Add first item
                </Button>
              </div>
            ) : (
              <>
                <div
                  className={
                    viewMode === 'grid'
                      ? 'mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'
                      : 'mt-6 space-y-3'
                  }
                >
                  <AddItemCard
                    onClick={handleAddItem}
                    compact={viewMode === 'list'}
                  />

                  {visibleItems.map((item) => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      onSelect={handleItemSelect}
                      onOptions={handleItemOptions}
                      viewMode={viewMode}
                    />
                  ))}
                </div>

                {visibleItems.length === 0 && (
                  <div className="mt-4 px-2 py-6 text-center">
                    <h3 className="text-sm font-semibold text-slate-900">
                      No matching items
                    </h3>
                    <p className="mt-2 text-xs text-slate-500">
                      Try a different search term.
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {focusedItem && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-6 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => setFocusedItem(null)}
        >
          <div
            className={`flex max-h-[calc(100vh-3rem)] w-full flex-col items-center gap-4 ${isInventoryOpen ? 'overflow-hidden' : 'overflow-visible'} lg:flex-row lg:items-center lg:gap-5 ${
              isInventoryOpen ? 'max-w-5xl' : 'max-w-3xl'
            }`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              className={`inventory-main-shell w-full lg:w-[48rem] lg:flex-none ${
                isInventoryRecentering ? 'inventory-main-recentering' : ''
              }`}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-focus-title"
                className="item-focus-dialog w-full max-w-3xl"
                style={
                  focusOrigin
                    ? {
                        '--item-origin-x': `${focusOrigin.x}px`,
                        '--item-origin-y': `${focusOrigin.y}px`,
                        '--item-origin-scale': focusOrigin.scale,
                      }
                    : undefined
                }
              >
                <TiltEffect
                  className="w-full border border-slate-300 bg-white p-6 shadow-2xl sm:p-8"
                  disabled={isInventoryOpen}
                >
                  <div className="w-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Item details
                </p>
                <h2
                  id="item-focus-title"
                  className="mt-1 text-2xl font-bold text-slate-900"
                >
                  {focusedItem.name}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close item preview"
                onClick={() => setFocusedItem(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="mt-6">
              <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)] md:items-stretch">
                <div className="flex min-h-72 w-full aspect-[4/3] items-center justify-center overflow-hidden border border-slate-300 bg-slate-200 p-4 sm:p-6">
                  {focusedItem.imageUrl ? (
                    <img
                      src={focusedItem.imageUrl}
                      alt={focusedItem.name}
                      className="block h-full w-full object-contain object-center"
                      decoding="async"
                    />
                  ) : (
                    <InventoryTypeIcon
                      isStorageUnit={focusedItem.isStorageUnit}
                      className="h-28 w-28 text-slate-500"
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-col">
                  <dl className="item-details-list mt-5 divide-y divide-slate-200 border-y border-slate-200 text-xs">
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-slate-500">Category</dt>
                      <dd className="font-bold text-orange-500">
                        {focusedItem.category}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-slate-500">Status</dt>
                      <dd className="font-semibold text-slate-900">
                        {getItemStatus(focusedItem)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-slate-500">Type</dt>
                      <dd className="font-semibold text-slate-900">
                        {focusedItem.isStorageUnit ? 'Storage unit' : 'Item'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-slate-500">Dimensions</dt>
                      <dd className="font-semibold text-slate-900">
                        {focusedItem.width && focusedItem.depth
                          ? `${focusedItem.width} × ${focusedItem.depth} cm`
                          : 'Not set'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <h3 className="text-xs font-semibold text-slate-900">Notes</h3>
                    <p className="mt-2 max-w-full whitespace-pre-wrap break-words text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
                      {focusedItem.notes || 'No notes added.'}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-end gap-3 pt-6">
                    <Button variant="secondary" onClick={() => { setFocusedItem(null); onEditItem?.(focusedItem) }}>
                      Edit item
                    </Button>

                    {focusedItem.isStorageUnit && (
                      <Button variant="primary" onClick={toggleInventorySidebar}>
                        {isInventoryOpen ? 'Close inventory' : 'Open inventory'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

                  </div>
                </TiltEffect>
              </section>
            </div>

            {isInventoryOpen && (
              <aside
                aria-label="Inventory sidebar placeholder"
                className={`inventory-sidebar h-[28rem] w-full shrink-0 snap-y snap-mandatory scroll-smooth overflow-y-auto overscroll-contain p-3 lg:h-[40rem] lg:w-56 ${
                  isInventoryAtTop ? 'inventory-sidebar-at-top' : ''
                } ${
                  isInventoryAtBottom ? 'inventory-sidebar-at-bottom' : ''
                } ${
                  isInventoryClosing ? 'inventory-sidebar-closing' : ''
                }`}
                onScroll={handleInventoryScroll}
              >
                <div className="space-y-3">
                  {containedItems.length > 0 ? (
                    containedItems.map((item) => (
                      <article
                        key={item.id}
                        className="inventory-sidebar-card card-tilt-disabled h-32 snap-start snap-always overflow-hidden border border-slate-300 bg-white p-2"
                      >
                        <div className="flex h-20 items-center justify-center bg-slate-200">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt=""
                              style={getPhotoImageStyle(item)}
                              className="h-full w-full"
                            />
                          ) : (
                            <InventoryTypeIcon
                              isStorageUnit={item.isStorageUnit}
                              className="h-12 w-12 text-slate-500"
                            />
                          )}
                        </div>
                        <p className="mt-2 truncate text-xs font-semibold text-slate-900">
                          {item.name}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="py-6 text-center text-xs text-slate-500">
                      No items stored here yet.
                    </p>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

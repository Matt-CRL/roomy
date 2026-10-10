import { useEffect, useRef, useState } from 'react'
import Button from '../components/common/Button'
import AddItemCard from '../components/items/AddItemCard'
import InventoryFilters from '../components/items/InventoryFilters'
import InventoryItemCard from '../components/items/InventoryItemCard'
import InventoryTypeIcon from '../components/items/InventoryTypeIcon'
import { getPhotoImageStyle } from '../data/photoDisplay'
import TiltEffect from '../components/common/TiltEffect'
import AppNavbar from '../components/layout/AppNavbar'
import LocationTrail from '../components/layout/LocationTrail'
import emptyRoomIcon from '../assets/empty-room.png'
import ImageCursorTrail from '../components/effects/ImageCursorTrail'

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

function StorageAddableItemButton({ item, storageName, onStore, onLoadPhoto, disabled, isBusy }) {
  const photoRef = useRef(null)
  const loadPhotoRef = useRef(onLoadPhoto)
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? null)
  loadPhotoRef.current = onLoadPhoto

  useEffect(() => {
    setImageUrl(item.imageUrl ?? null)
  }, [item.id, item.updatedAt, item.imageUrl])

  useEffect(() => {
    if (item.imageUrl || !item.hasPhoto || !loadPhotoRef.current || !photoRef.current) return undefined

    let active = true
    let requested = false
    const photoContainer = photoRef.current
    const scrollContainer = photoContainer.closest('#storage-addable-items')

    function requestPhoto() {
      if (requested) return
      requested = true
      Promise.resolve(loadPhotoRef.current?.(item)).then((url) => {
        if (active && url) setImageUrl(url)
      }).catch(() => {})
    }

    if (!('IntersectionObserver' in window)) {
      requestPhoto()
      return () => { active = false }
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        requestPhoto()
        observer.disconnect()
      }
    }, { root: scrollContainer, rootMargin: '32px' })

    observer.observe(photoContainer)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [item.id, item.updatedAt, item.hasPhoto, item.imageUrl])

  return (
    <button
      type="button"
      aria-label={`Add ${item.name} to ${storageName}`}
      disabled={disabled}
      onClick={() => onStore(item)}
      className="storage-add-item-option flex min-h-11 w-full snap-start snap-always items-center gap-3 border-b border-slate-100 py-1 pl-1 pr-3 text-left text-xs text-slate-700 transition-colors last:border-b-0 hover:bg-orange-50 focus-visible:bg-orange-50 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
    >
      <div ref={photoRef} className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt="" draggable="false" style={getPhotoImageStyle(item)} className="h-full w-full" />
        ) : (
          <InventoryTypeIcon isStorageUnit={item.isStorageUnit} className="h-5 w-5 text-slate-500" />
        )}
      </div>
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      <span aria-hidden="true" className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-medium leading-none text-orange-600">
        {isBusy ? '…' : '+'}
      </span>
    </button>
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
  onGetAddableItems,
  onLoadPhoto,
  onUnstoreItem,
  onStoreItem,
  storageOptions = [],
  storageOptionsLoading = false,
  onViewStorage,
  onFilterChange,
  onSignOut,
  displayName,
  email,
  onUpdateDisplayName,
  onChangePassword,
  onDeleteAccount,
  isDarkMode = false,
  onToggleTheme,
  compactTheme = false,
  isLoading = false,
}) {
  const roomName = room?.name ?? 'Bedroom 1'
  const location = [
    { label: 'Rooms', onClick: onBackToRooms },
    { label: roomName },
  ]
  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ type: 'all', categories: [] })
  const [loadedContents, setLoadedContents] = useState(null)
  const [unstoreBusyId, setUnstoreBusyId] = useState(null)
  const [unstoreError, setUnstoreError] = useState('')
  const [addableItems, setAddableItems] = useState(null)
  const [isAddItemPickerOpen, setIsAddItemPickerOpen] = useState(false)
  const [isAddableItemsLoading, setIsAddableItemsLoading] = useState(false)
  const [storeItemBusyId, setStoreItemBusyId] = useState(null)
  const [storeItemError, setStoreItemError] = useState('')
  const contentsLoadGeneration = useRef(0)
  const addableItemsLoadGeneration = useRef(0)
  const [focusedItem, setFocusedItem] = useState(null)
  const [openStorageContentsId, setOpenStorageContentsId] = useState(null)
  const [focusOrigin, setFocusOrigin] = useState(null)
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [isInventoryClosing, setIsInventoryClosing] = useState(false)
  const [isInventoryRecentering, setIsInventoryRecentering] = useState(false)
  const [isInventoryAtTop, setIsInventoryAtTop] = useState(true)
  const [isInventoryAtBottom, setIsInventoryAtBottom] = useState(false)
  const inventoryCloseTimer = useRef(null)
  const getContentsRef = useRef(onGetContents)
  const loadPhotoRef = useRef(onLoadPhoto)
  const filterChangeRef = useRef(onFilterChange)
  getContentsRef.current = onGetContents
  loadPhotoRef.current = onLoadPhoto
  filterChangeRef.current = onFilterChange

  useEffect(() => {
    if (!focusedItem?.id) return undefined

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
  }, [focusedItem?.id])

  useEffect(() => {
    if (!filterChangeRef.current) return undefined
    const timer = window.setTimeout(() => filterChangeRef.current?.({ q: searchQuery, ...filters }), 250)
    return () => window.clearTimeout(timer)
  }, [searchQuery, filters])

  useEffect(() => {
    setLoadedContents(null)
    setAddableItems(null)
    setIsAddItemPickerOpen(false)
    setIsAddableItemsLoading(false)
    setStoreItemError('')
    addableItemsLoadGeneration.current += 1
    if (!focusedItem?.isStorageUnit || !getContentsRef.current) return undefined
    let active = true
    const generation = ++contentsLoadGeneration.current
    getContentsRef.current(focusedItem.id).then((result) => {
      if (!active || generation !== contentsLoadGeneration.current) return
      setLoadedContents(result.items)
      result.items.forEach((item) => {
        if (!item.hasPhoto || item.imageUrl || !loadPhotoRef.current) return
        loadPhotoRef.current(item).then((imageUrl) => {
          if (!active || generation !== contentsLoadGeneration.current || !imageUrl) return
          setLoadedContents((current) => current?.map((entry) => (
            entry.id === item.id && entry.updatedAt === item.updatedAt
              ? { ...entry, imageUrl }
              : entry
          )))
        }).catch(() => {})
      })
    })
      .catch(() => { if (active && generation === contentsLoadGeneration.current) setLoadedContents([]) })
    return () => { active = false }
  }, [focusedItem?.id, focusedItem?.isStorageUnit])

  useEffect(() => {
    window.clearTimeout(inventoryCloseTimer.current)
    setIsInventoryOpen(false)
    setIsInventoryClosing(false)
    setIsInventoryRecentering(false)
    setIsInventoryAtTop(true)
    setIsInventoryAtBottom(false)
  }, [focusedItem?.id])

  useEffect(() => {
    if (focusedItem?.id !== openStorageContentsId || !focusedItem?.isStorageUnit) return
    setIsInventoryClosing(false)
    setIsInventoryRecentering(false)
    setIsInventoryAtTop(true)
    setIsInventoryAtBottom(false)
    setIsInventoryOpen(true)
    setOpenStorageContentsId(null)
  }, [focusedItem?.id, focusedItem?.isStorageUnit, openStorageContentsId])

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
  const containedItemIds = new Set(containedItems.map((item) => item.id))
  const availableAddableItems = (addableItems ?? items)
    .filter((item) => (
      item.id !== focusedItem?.id &&
      !item.isStorageUnit &&
      !item.parentStorageId &&
      (!item.storedInside || item.storedInside === 'Not stored') &&
      !containedItemIds.has(item.id) &&
      (!focusedItem?.roomId || item.roomId === focusedItem.roomId)
    ))
    .sort((left, right) => left.name.localeCompare(right.name))

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

  function handleViewStorage(item, event) {
    setOpenStorageContentsId(item.id)
    handleItemSelect(item, event)
  }

  async function handleUnstoreItem(item) {
    if (!onUnstoreItem || unstoreBusyId) return

    setUnstoreError('')
    setUnstoreBusyId(item.id)
    try {
      await onUnstoreItem(item)
      contentsLoadGeneration.current += 1
      setLoadedContents((current) => (current ?? containedItems).filter((entry) => entry.id !== item.id))
      setAddableItems((current) => current
        ? [...current.filter((entry) => entry.id !== item.id), { ...item, parentStorageId: null, storedInside: null }]
          .sort((left, right) => left.name.localeCompare(right.name))
        : current)
      setFocusedItem((current) => current?.id === focusedItem?.id
        ? { ...current, storedCount: Math.max(0, (current.storedCount ?? containedItems.length) - 1) }
        : current)
    } catch (error) {
      setUnstoreError(error?.message || 'Could not unstore this item. Please try again.')
    } finally {
      setUnstoreBusyId(null)
    }
  }

  async function toggleAddItemPicker() {
    if (isAddItemPickerOpen) {
      setIsAddItemPickerOpen(false)
      return
    }

    setIsAddItemPickerOpen(true)
    setStoreItemError('')
    if (addableItems) return

    const generation = ++addableItemsLoadGeneration.current
    const storageId = focusedItem?.id
    setIsAddableItemsLoading(true)
    try {
      const availableItems = onGetAddableItems
        ? await onGetAddableItems(focusedItem?.roomId)
        : items
      if (generation === addableItemsLoadGeneration.current && storageId === focusedItem?.id) {
        setAddableItems(availableItems)
      }
    } catch (error) {
      if (generation === addableItemsLoadGeneration.current && storageId === focusedItem?.id) {
        setStoreItemError(error?.message || 'Could not load unstored items. Please try again.')
      }
    } finally {
      if (generation === addableItemsLoadGeneration.current) setIsAddableItemsLoading(false)
    }
  }

  async function handleStoreInOpenStorage(item) {
    if (!onStoreItem || !focusedItem?.id || storeItemBusyId) return

    const storage = focusedItem
    setStoreItemError('')
    setStoreItemBusyId(item.id)
    try {
      const savedItem = await onStoreItem(item, { id: storage.id, name: storage.name })
      const storedItem = {
        ...item,
        ...(savedItem && typeof savedItem === 'object' ? savedItem : {}),
        parentStorageId: storage.id,
        storedInside: storage.name,
      }
      setLoadedContents((current) => {
        const currentItems = current ?? containedItems
        return currentItems.some((entry) => entry.id === storedItem.id)
          ? currentItems
          : [...currentItems, storedItem]
      })
      setFocusedItem((current) => {
        if (current?.id !== storage.id) return current
        const count = current.storedCount != null && Number.isFinite(Number(current.storedCount))
          ? Number(current.storedCount)
          : containedItems.length
        return { ...current, storedCount: count + 1 }
      })
    } catch (error) {
      setStoreItemError(error?.message || 'Could not store this item. Please try again.')
    } finally {
      setStoreItemBusyId(null)
    }
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

    if (item.hasPhoto && !item.imageUrl && onLoadPhoto) {
      onLoadPhoto(item).then((imageUrl) => {
        if (!imageUrl) return
        setFocusedItem((current) => current?.id === item.id
          ? { ...current, imageUrl }
          : current)
      }).catch(() => {})
    }
  }

  function toggleInventorySidebar() {
    window.clearTimeout(inventoryCloseTimer.current)

    if (window.matchMedia('(max-width: 1023px)').matches) {
      setIsInventoryClosing(false)
      setIsInventoryRecentering(false)
      setIsInventoryAtTop(true)
      setIsInventoryAtBottom(false)
      setIsInventoryOpen((isOpen) => !isOpen)
      return
    }

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
    <main className="isolate min-h-screen bg-slate-50 px-3 py-4 sm:p-6">
      {!isDarkMode && <ImageCursorTrail />}
      <div className="mx-auto max-w-[1700px]">
        <AppNavbar
          onSignOut={onSignOut}
          displayName={displayName}
          location={location}
          email={email}
          onUpdateDisplayName={onUpdateDisplayName}
          onChangePassword={onChangePassword}
          onDeleteAccount={onDeleteAccount}
          isDarkMode={isDarkMode}
          onToggleTheme={onToggleTheme}
          compactTheme={compactTheme}
        />

        <header className="flex flex-col gap-5 pt-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Room Inventory
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              {room?.itemCount ?? items.length} {(room?.itemCount ?? items.length) === 1 ? 'item' : 'items'} ·{' '}
              {room?.storageCount ?? items.filter((item) => item.isStorageUnit).length} storage{' '}
              {(room?.storageCount ?? items.filter((item) => item.isStorageUnit).length) === 1
                ? 'unit'
                : 'units'}{' '}
              · Updated today
            </p>
          </div>

          <div className="flex w-full min-w-0 items-center justify-between gap-2 lg:w-auto lg:justify-end">
            <LocationTrail location={location} className="min-w-0 flex-1 md:hidden" />
            <div className="ml-auto flex shrink-0 gap-2">
              <Button variant="secondary" onClick={handlePlanner}>
                Planner
              </Button>

              <Button variant="primary" onClick={handleAddItem}>
                + Add item
              </Button>
            </div>
          </div>
        </header>

        <section aria-labelledby="inventory-heading" className="mt-5 sm:mt-8">
            <h2 id="inventory-heading" className="sr-only">
              {roomName} inventory items
            </h2>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 lg:grid-cols-[minmax(12rem,1fr)_auto_auto]">
                <div className="relative col-span-2 min-w-0 lg:col-span-1">
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
                    className="min-h-11 w-full border border-slate-300 bg-white pl-10 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <InventoryFilters value={filters} onChange={setFilters} />

              <div className="night-view-toggle relative isolate grid h-11 w-fit grid-cols-2 overflow-hidden border border-slate-300 bg-white text-xs font-medium">
                <span
                  aria-hidden="true"
                  className={`view-toggle-slider pointer-events-none absolute inset-y-0 left-0 w-1/2 ${
                    viewMode === 'list' ? 'view-toggle-slider-list' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`relative z-10 flex min-h-0 items-center justify-center px-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset ${
                    viewMode === 'grid'
                      ? 'view-toggle-active bg-transparent text-white'
                      : 'view-toggle-inactive bg-transparent text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={viewMode === 'grid'}
                >
                  Grid
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`relative z-10 flex min-h-0 items-center justify-center px-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset ${
                    viewMode === 'list'
                      ? 'view-toggle-active bg-transparent text-white'
                      : 'view-toggle-inactive bg-transparent text-slate-700 hover:bg-slate-50'
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
                  {visibleItems.length > 0 && (
                    <div className="hidden h-full sm:block">
                      <AddItemCard
                        onClick={handleAddItem}
                        compact={viewMode === 'list'}
                      />
                    </div>
                  )}

                  {visibleItems.map((item) => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      onSelect={handleItemSelect}
                      onOptions={handleItemOptions}
                      onLoadPhoto={onLoadPhoto}
                      onStoreItem={onStoreItem}
                      onUnstoreItem={onUnstoreItem}
                      storageOptions={storageOptions}
                      storageOptionsLoading={storageOptionsLoading}
                      onViewStorage={handleViewStorage}
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
                      Try a different search term or filter.
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
      </div>

      {focusedItem && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onMouseDown={() => setFocusedItem(null)}
        >
          <div
            className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col items-center gap-4 overflow-y-auto overflow-x-hidden sm:max-h-[calc(100dvh-3rem)] lg:overflow-hidden lg:flex-row lg:items-center lg:gap-5 ${
              isInventoryOpen ? 'max-w-5xl' : 'max-w-3xl'
            }`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="inventory-mobile-viewport w-full">
              <div className="inventory-mobile-track">
            <div
              className={`inventory-mobile-page inventory-main-shell w-full shrink-0 lg:w-[48rem] lg:flex-none ${
                isInventoryRecentering ? 'inventory-main-recentering' : ''
              }`}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-focus-title"
              className="item-focus-dialog max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto sm:max-h-[calc(100dvh-3rem)] lg:max-h-none lg:overflow-visible"
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
                <div className="flex min-h-48 w-full aspect-[4/3] items-center justify-center overflow-hidden border border-slate-300 bg-slate-200 p-4 sm:min-h-72 sm:p-6">
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

            {focusedItem?.isStorageUnit && (
              <aside
                aria-label="Inventory sidebar placeholder"
                className={`inventory-mobile-page inventory-sidebar inventory-sidebar-mobile-page mt-3 h-auto w-full shrink-0 overflow-visible p-0 lg:mt-0 lg:h-[40rem] lg:w-56 lg:snap-y lg:snap-mandatory lg:scroll-smooth lg:overflow-y-auto lg:overscroll-contain lg:p-3 ${
                  isInventoryOpen || isInventoryClosing || isInventoryRecentering
                    ? 'block'
                    : 'hidden'
                } ${
                  isInventoryAtTop ? 'inventory-sidebar-at-top' : ''
                } ${
                  isInventoryAtBottom ? 'inventory-sidebar-at-bottom' : ''
                } ${
                  isInventoryClosing ? 'inventory-sidebar-closing' : ''
                }`}
                onScroll={handleInventoryScroll}
              >
                <div className={`inventory-sidebar-content roomy-dropdown-scrollbar ${containedItems.length < 5
                  ? 'flex min-h-full flex-col justify-center gap-3'
                  : 'space-y-3'}`}>
                  {unstoreError && (
                    <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {unstoreError}
                    </p>
                  )}
                  {focusedItem?.isStorageUnit && onGetContents && loadedContents === null ? (
                    <p role="status" className="py-6 text-center text-xs text-slate-500">
                      Loading storage contents…
                    </p>
                  ) : (
                    <>
                  {(onStoreItem || containedItems.length === 0) && (
                    <div className={`inventory-sidebar-card storage-add-item-card card-tilt-disabled snap-start snap-always overflow-hidden border border-slate-300 bg-white ${
                      containedItems.length > 0 ? 'mobile-storage-add-hidden' : ''
                    }`}>
                      <div className={`storage-add-item-header px-3 py-3 ${isAddItemPickerOpen ? 'border-b border-slate-200' : ''}`}>
                        {onStoreItem && (
                          <button
                            type="button"
                            aria-expanded={isAddItemPickerOpen}
                            aria-controls="storage-addable-items"
                            onClick={toggleAddItemPicker}
                            className="relative flex min-h-10 w-full items-center justify-center rounded-sm px-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                          >
                            <span>
                              {containedItems.length === 0 ? 'Add item' : 'Add another item'}
                            </span>
                            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`absolute right-1 h-4 w-4 text-slate-400 transition-transform ${isAddItemPickerOpen ? 'rotate-180' : ''}`}>
                              <path d="m5 7.5 5 5 5-5" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {onStoreItem && isAddItemPickerOpen && (
                        <section id="storage-addable-items" aria-label="Available unstored items" aria-busy={isAddableItemsLoading} className="max-h-56 overflow-y-auto">
                          {storeItemError && (
                            <p role="alert" className="px-3 py-2 text-xs text-red-600">
                              {storeItemError}
                            </p>
                          )}
                          {isAddableItemsLoading ? (
                            <p role="status" className="px-3 py-3 text-center text-xs text-slate-500">
                              Loading available items…
                            </p>
                          ) : storageOptionsLoading ? (
                            <p role="status" className="px-3 py-3 text-center text-xs text-slate-500">
                              Loading storage options…
                            </p>
                          ) : availableAddableItems.length > 0 ? (
                            availableAddableItems.map((item) => (
                              <StorageAddableItemButton
                                key={item.id}
                                item={item}
                                storageName={focusedItem.name}
                                onStore={handleStoreInOpenStorage}
                                onLoadPhoto={onLoadPhoto}
                                disabled={storeItemBusyId !== null || storageOptionsLoading}
                                isBusy={storeItemBusyId === item.id}
                              />
                            ))
                          ) : null}
                          {!isAddableItemsLoading && !storageOptionsLoading && addableItems && availableAddableItems.length === 0 && !storeItemError && (
                            <p className="px-3 py-2 text-center text-[10px] text-slate-400">
                              No unstored items available.
                            </p>
                          )}
                        </section>
                      )}
                    </div>
                  )}
                  {containedItems.length > 0 && containedItems.map((item) => (
                      <article
                        key={item.id}
                        className="inventory-sidebar-card card-tilt-disabled h-32 snap-start snap-always overflow-hidden border border-slate-300 bg-white p-2"
                      >
                        <div className="flex h-16 items-center justify-center bg-slate-200">
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
                        <div className="mt-2 flex min-h-6 items-center justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-900">
                            {item.name}
                          </p>
                          {onUnstoreItem && (
                            <button
                              type="button"
                              aria-label={`Unstore ${item.name}`}
                              title={`Unstore ${item.name}`}
                              disabled={unstoreBusyId !== null}
                              onClick={() => handleUnstoreItem(item)}
                              className="night-secondary-surface flex min-h-6 shrink-0 items-center justify-center rounded-sm border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-orange-500 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {unstoreBusyId === item.id ? 'Unstoring…' : 'Unstore'}
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                    </>
                  )}
                </div>
              </aside>
            )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

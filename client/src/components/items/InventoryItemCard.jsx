import { useEffect, useRef, useState } from 'react'
import InventoryTypeIcon from './InventoryTypeIcon'
import { getPhotoImageStyle } from '../../data/photoDisplay'

function StorageOptionThumbnail({ storage, onLoadPhoto }) {
  const imageRef = useRef(null)
  const loadPhotoRef = useRef(onLoadPhoto)
  const [imageUrl, setImageUrl] = useState(storage.imageUrl ?? null)
  loadPhotoRef.current = onLoadPhoto

  useEffect(() => {
    setImageUrl(storage.imageUrl ?? null)
  }, [storage.id, storage.updatedAt, storage.imageUrl])

  useEffect(() => {
    if (storage.imageUrl || !storage.hasPhoto || !loadPhotoRef.current || !imageRef.current) return undefined

    let active = true
    let requested = false
    const imageElement = imageRef.current

    function requestPhoto() {
      if (requested) return
      requested = true
      Promise.resolve(loadPhotoRef.current?.(storage)).then((url) => {
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
    }, {
      root: imageElement.closest('.inventory-storage-picker-list'),
      rootMargin: '24px',
    })

    observer.observe(imageElement)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [storage.id, storage.updatedAt, storage.hasPhoto, storage.imageUrl])

  return (
    <span ref={imageRef} aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100">
      {imageUrl ? (
        <img src={imageUrl} alt="" draggable="false" style={getPhotoImageStyle(storage)} className="h-full w-full" />
      ) : (
        <InventoryTypeIcon isStorageUnit className="h-5 w-5 text-slate-500" />
      )}
    </span>
  )
}

export default function InventoryItemCard({
  item,
  onSelect,
  onOptions,
  onLoadPhoto,
  storageOptions = [],
  storageOptionsLoading = false,
  onStoreItem,
  onUnstoreItem,
  onViewStorage,
  viewMode = 'grid',
}) {
  const photoContainerRef = useRef(null)
  const photoRequested = useRef(false)
  const photoFailed = useRef(false)
  const photoKey = `${item.id}:${item.updatedAt}`
  const currentPhotoKey = useRef(photoKey)
  currentPhotoKey.current = photoKey
  const optionsRef = useRef(null)
  const storageOptionsListRef = useRef(null)
  const [photoError, setPhotoError] = useState(false)
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const [isStoragePickerOpen, setIsStoragePickerOpen] = useState(false)
  const [storageActionBusy, setStorageActionBusy] = useState(false)
  const [storageActionError, setStorageActionError] = useState('')
  const [storageOptionsScroll, setStorageOptionsScroll] = useState({ progress: 0, thumbHeight: 100 })
  const availableStorageOptions = storageOptions.filter((storage) => storage.id !== item.id)
  const storedInStorage = storageOptions.find((storage) => (
    storage.id === item.parentStorageId || (
      item.storedInside && storage.name?.toLowerCase() === item.storedInside.toLowerCase()
    )
  ))
  const isStored = Boolean(item.parentStorageId || (item.storedInside && item.storedInside !== 'Not stored'))
  const itemStatus = item.isStorageUnit
    ? `${item.storedCount} inside`
    : item.storedInside && item.storedInside !== 'Not stored'
      ? 'Stored'
      : 'Unstored'

  useEffect(() => {
    photoRequested.current = false
    photoFailed.current = false
    setPhotoError(false)
  }, [item.id, item.updatedAt])

  useEffect(() => {
    if (!isOptionsOpen) return undefined

    function handleOutsideClick(event) {
      if (!optionsRef.current?.contains(event.target)) {
        setIsOptionsOpen(false)
        setIsStoragePickerOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOptionsOpen(false)
        setIsStoragePickerOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOptionsOpen])

  useEffect(() => {
    if (!isStoragePickerOpen) return undefined
    const list = storageOptionsListRef.current
    if (!list) return undefined

    function updateScrollThumb() {
      const maximumScroll = Math.max(0, list.scrollHeight - list.clientHeight)
      const thumbHeight = list.scrollHeight > 0
        ? Math.max(12, Math.min(100, (list.clientHeight / list.scrollHeight) * 100))
        : 100
      setStorageOptionsScroll({
        progress: maximumScroll > 0 ? (list.scrollTop / maximumScroll) * 100 : 0,
        thumbHeight,
      })
    }

    updateScrollThumb()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollThumb)
    observer?.observe(list)
    return () => observer?.disconnect()
  }, [isStoragePickerOpen, availableStorageOptions.length])

  function requestPhoto() {
    if (photoRequested.current || photoFailed.current || !onLoadPhoto) return
    photoRequested.current = true
    onLoadPhoto(item).then((imageUrl) => {
      if (currentPhotoKey.current !== photoKey) return
      if (!imageUrl) throw new Error('Photo unavailable')
    }).catch(() => {
      if (currentPhotoKey.current !== photoKey) return
      photoRequested.current = false
      photoFailed.current = true
      setPhotoError(true)
    })
  }

  useEffect(() => {
    if (!['grid', 'list'].includes(viewMode) || !item.hasPhoto || item.imageUrl || !onLoadPhoto || !photoContainerRef.current || photoRequested.current || photoFailed.current) return undefined

    if (!('IntersectionObserver' in window)) {
      requestPhoto()
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        requestPhoto()
        observer.disconnect()
      }
    }, { rootMargin: '240px' })

    observer.observe(photoContainerRef.current)
    return () => observer.disconnect()
  }, [item, onLoadPhoto, viewMode])

  function handleKeyDown(event) {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(item)
    }
  }

  async function handleStore(storage) {
    if (!onStoreItem || storageActionBusy) return

    setStorageActionError('')
    setStorageActionBusy(true)
    try {
      await onStoreItem(item, storage)
      setIsOptionsOpen(false)
      setIsStoragePickerOpen(false)
    } catch (error) {
      setStorageActionError(error?.message || 'Could not store this item. Please try again.')
    } finally {
      setStorageActionBusy(false)
    }
  }

  async function handleUnstore() {
    if (!onUnstoreItem || storageActionBusy) return

    setStorageActionError('')
    setStorageActionBusy(true)
    try {
      await onUnstoreItem(item)
      setIsOptionsOpen(false)
    } catch (error) {
      setStorageActionError(error?.message || 'Could not unstore this item. Please try again.')
    } finally {
      setStorageActionBusy(false)
    }
  }

  function renderOptionsMenu() {
    return (
      <div ref={optionsRef} className="relative -mr-2">
        <button
          type="button"
          aria-label={`More options for ${item.name}`}
          aria-haspopup="menu"
          aria-expanded={isOptionsOpen}
          onClick={(event) => {
            event.stopPropagation()
            setIsOptionsOpen((open) => !open)
            setIsStoragePickerOpen(false)
            setStorageActionError('')
          }}
          onDoubleClick={(event) => event.stopPropagation()}
          className="inline-flex h-8 min-w-14 items-center justify-center rounded-full text-lg leading-none text-slate-600 transition-colors hover:bg-slate-200 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">⋯</span>
        </button>

        {isOptionsOpen && (
          <div
            role="menu"
            aria-label={`${item.name} options`}
            className="night-dropdown-menu absolute bottom-10 left-1/2 z-40 w-36 -translate-x-1/2 rounded-md border border-slate-300 bg-white p-1.5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {isStoragePickerOpen ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setIsStoragePickerOpen(false)}
                  className="flex min-h-9 w-full items-center justify-center rounded-sm px-3 text-center text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
                >
                  ← Back to options
                </button>
                <div className="relative">
                  <div
                    ref={storageOptionsListRef}
                    onScroll={(event) => {
                      const list = event.currentTarget
                      const maximumScroll = Math.max(0, list.scrollHeight - list.clientHeight)
                      setStorageOptionsScroll((current) => ({
                        ...current,
                        progress: maximumScroll > 0 ? (list.scrollTop / maximumScroll) * 100 : 0,
                      }))
                    }}
                    className={`planner-room-items-rail inventory-storage-picker-list max-h-[108px] overflow-y-auto overscroll-contain ${availableStorageOptions.length > 3 ? 'pr-2' : ''}`}
                  >
                    {availableStorageOptions.length ? (
                      availableStorageOptions.map((storage) => (
                        <button
                          key={storage.id}
                          type="button"
                          role="menuitem"
                          disabled={storageActionBusy}
                          onClick={() => handleStore(storage)}
                          className="flex min-h-9 w-full items-center gap-2 rounded-sm px-1 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:opacity-60"
                        >
                          <StorageOptionThumbnail storage={storage} onLoadPhoto={onLoadPhoto} />
                          <span className="min-w-0 flex-1 truncate">{storage.name}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-center text-xs text-slate-500">
                        {storageOptionsLoading ? 'Loading storage units…' : 'No storage units in this room yet.'}
                      </p>
                    )}
                  </div>
                  {availableStorageOptions.length > 3 && (
                    <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 top-0 w-[5px] overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="planner-room-items-thumb absolute left-0 right-0 rounded-full bg-orange-500"
                        style={{
                          height: `${storageOptionsScroll.thumbHeight}%`,
                          top: `${(100 - storageOptionsScroll.thumbHeight) * storageOptionsScroll.progress / 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                {storageActionBusy && <p role="status" className="px-3 py-2 text-center text-xs text-slate-500">Storing…</p>}
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOptionsOpen(false)
                    onOptions?.(item)
                  }}
                  className="flex min-h-9 w-full items-center justify-center rounded-sm px-3 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
                >
                  Edit
                </button>
                {item.isStorageUnit ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(event) => {
                      event.stopPropagation()
                      setIsOptionsOpen(false)
                      onViewStorage?.(item, event)
                    }}
                    className="flex min-h-9 w-full items-center justify-center rounded-sm px-3 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
                  >
                    View storage
                  </button>
                ) : isStored ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={storageActionBusy}
                    onClick={handleUnstore}
                    aria-label={`Unstore ${item.name} from ${storedInStorage?.name || item.storedInside || 'storage'}`}
                    title={`Unstore from ${storedInStorage?.name || item.storedInside || 'storage'}`}
                    className="flex min-h-9 w-full items-center gap-2 rounded-sm px-1 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:opacity-60"
                  >
                    {storedInStorage ? <StorageOptionThumbnail storage={storedInStorage} onLoadPhoto={onLoadPhoto} /> : null}
                    <span className="min-w-0 flex-1 truncate">
                      <span className="block">{storageActionBusy ? 'Unstoring…' : 'Unstore from'}</span>
                      <span className="block truncate text-[9px] font-normal text-slate-500">
                        {storedInStorage?.name || item.storedInside || 'Storage'}
                      </span>
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setIsStoragePickerOpen(true)}
                    className="flex min-h-9 w-full items-center justify-center rounded-sm px-3 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
                  >
                  Store in…
                  </button>
                )}
              </>
            )}
            {storageActionError && (
              <p role="alert" className="border-t border-slate-200 px-3 py-2 text-center text-xs text-red-600">
                {storageActionError}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <article
        role="button"
        tabIndex={0}
        aria-label={`View ${item.name}`}
        onClick={(event) => onSelect?.(item, event)}
        onKeyDown={handleKeyDown}
        className={`group flex min-h-16 select-none items-center justify-between gap-4 border border-slate-300 bg-white py-2 pl-2 pr-4 transition-all hover:border-orange-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${isOptionsOpen ? 'relative z-30' : ''}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div ref={photoContainerRef} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" draggable="false" style={getPhotoImageStyle(item)} className="h-full w-full" />
            ) : (
              <InventoryTypeIcon
                isStorageUnit={item.isStorageUnit}
                className="h-6 w-6 text-slate-500"
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-xs font-semibold leading-tight text-slate-900">
              {item.name}
            </h3>

            <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-500">
              {item.category}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-end gap-3">
          <span className="border border-slate-300 px-2 py-1 text-[10px] text-slate-700">
            {itemStatus}
          </span>

          {renderOptionsMenu()}
        </div>
      </article>
    )
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`View ${item.name}`}
      onClick={(event) => onSelect?.(item, event)}
      onKeyDown={handleKeyDown}
      className={`group relative select-none border border-slate-300 bg-white transition-all hover:border-orange-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${isOptionsOpen ? 'z-30' : ''}`}
    >
      <div ref={photoContainerRef} className="relative flex h-40 items-center justify-center overflow-hidden border-b border-slate-300 bg-slate-200">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            style={getPhotoImageStyle(item)}
            className="h-full w-full"
          />
        ) : item.hasPhoto && photoError ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              photoFailed.current = false
              setPhotoError(false)
              requestPhoto()
            }}
            className="text-xs text-slate-600 underline underline-offset-2 hover:text-orange-500"
          >
            Photo unavailable. Retry
          </button>
        ) : item.hasPhoto ? (
          <div className="flex h-full w-full animate-pulse items-center justify-center text-xs text-slate-500">
            Loading photo…
          </div>
        ) : (
          <InventoryTypeIcon
            isStorageUnit={item.isStorageUnit}
            className="h-16 w-16 text-slate-500"
          />
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-orange-500/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10 text-white"
          >
            <circle cx="10.5" cy="10.5" r="5.5" />
            <path d="m15 15 5 5" />
          </svg>
        </div>
      </div>

      <div className="p-3">
        <div>
          <div className="min-w-0">
            <h3 className="truncate text-xs font-semibold leading-tight text-slate-900">
              {item.name}
            </h3>

            <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-500">
              {item.category}
            </p>
          </div>

        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="inline-flex border border-slate-300 px-2 py-1 text-[10px] text-slate-700">
            {itemStatus}
          </span>

          {renderOptionsMenu()}
        </div>
      </div>
    </article>
  )
}

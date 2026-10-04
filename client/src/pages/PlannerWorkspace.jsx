import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Button from '../components/common/Button'
import InventoryTypeIcon from '../components/items/InventoryTypeIcon'
import { getPhotoImageStyle } from '../data/photoDisplay'
import {
  clamp,
  clampShapePosition,
  angleDifference,
  maximumDepthForRoom,
  maximumUniformScale,
  maximumWidthForRoom,
  minimumRoomDimensions,
  normalizeAngle,
  PLANNER_MAX_DIMENSION,
  PLANNER_MIN_DIMENSION,
  round,
  snapRotation,
} from '../utils/plannerGeometry'

const DEFAULT_ITEM_DIMENSION = 30
const DEFAULT_ITEM_COLOR = '#1d1b31'
const PERSON_ID = '__roomy_person__'
const PERSON_WIDTH_CM = 50
const PERSON_DEPTH_CM = 30
const HISTORY_LIMIT = 50
const PLANNER_LOADING_MIN_MS = 2500
const PLANNER_LOADING_FADE_MS = 180
const PLANNER_AUTOSAVE_DELAY_MS = 700

function getContrastingTextColor(color) {
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color || '')
  if (!match) return '#000000'
  const hex = match[1].length === 3 ? [...match[1]].map((digit) => `${digit}${digit}`).join('') : match[1]
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
  const luminance = channels.reduce((sum, channel, index) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    return sum + linear * [0.2126, 0.7152, 0.0722][index]
  }, 0)
  const blackContrast = (luminance + 0.05) / 0.05
  const whiteContrast = 1.05 / (luminance + 0.05)
  return whiteContrast > blackContrast ? '#ffffff' : '#000000'
}

function cloneShape(shape) {
  return shape ? { ...shape } : null
}

function cloneDraft(draft) {
  return {
    items: draft.items.map(cloneShape),
    widthCm: draft.widthCm,
    depthCm: draft.depthCm,
    person: cloneShape(draft.person),
  }
}

function sameDraft(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function getPersistedLayout(draft) {
  return {
    widthCm: Number(draft.widthCm),
    depthCm: Number(draft.depthCm),
    items: draft.items.map((shape) => ({
      itemId: shape.itemId,
      x: Number(shape.x),
      y: Number(shape.y),
      width: Number(shape.width),
      depth: Number(shape.depth),
      rotation: Number(shape.rotation || 0),
      color: shape.color ?? DEFAULT_ITEM_COLOR,
    })),
  }
}

function getPersistedLayoutKey(draft) {
  return JSON.stringify(getPersistedLayout(draft))
}

function handleClass(side) {
  return {
    nw: '-left-[3px] -top-[3px] cursor-nwse-resize',
    n: 'left-1/2 -top-[3px] -translate-x-1/2 cursor-ns-resize',
    ne: '-right-[3px] -top-[3px] cursor-nesw-resize',
    e: '-right-[3px] top-1/2 -translate-y-1/2 cursor-ew-resize',
    se: '-bottom-[3px] -right-[3px] cursor-nwse-resize',
    s: '-bottom-[3px] left-1/2 -translate-x-1/2 cursor-ns-resize',
    sw: '-bottom-[3px] -left-[3px] cursor-nesw-resize',
    w: '-left-[3px] top-1/2 -translate-y-1/2 cursor-ew-resize',
  }[side]
}

function PlannerObject({
  shape,
  item,
  isSelected,
  isPerson,
  scale,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onResizePointerDown,
  onRotatePointerDown,
  onSelect,
}) {
  const [isHovered, setIsHovered] = useState(false)
  const storageLabel = item?.isStorageUnit && item.storedCount > 0
    ? `${item.storedCount} inside`
    : null
  const personHighlighted = isPerson && (isSelected || isHovered)

  return (
    <div
      role="button"
      tabIndex={0}
      data-planner-object
      aria-label={isPerson ? 'Move person reference guide' : `Move ${item?.name || 'item'}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={`absolute flex select-none items-center justify-center px-1.5 text-center text-[10px] font-semibold text-slate-900 ${
        isPerson
          ? `${isSelected ? 'z-30' : 'z-20'} border-0 bg-transparent shadow-none`
          : isSelected
            ? 'z-30 overflow-visible border-2 border-orange-500 transition-colors'
            : 'z-20 overflow-hidden border-2 border-slate-500 shadow-sm transition-shadow hover:border-orange-500 hover:shadow-md'
      }`}
      style={{
        left: `${shape.x * scale}px`,
        top: `${shape.y * scale}px`,
        width: `${shape.width * scale}px`,
        height: `${shape.depth * scale}px`,
        transform: `rotate(${shape.rotation}deg)`,
        transformOrigin: 'center',
        backgroundColor: isPerson ? 'transparent' : shape.color,
        color: isPerson ? undefined : getContrastingTextColor(shape.color),
        boxShadow: personHighlighted
          ? 'inset 0 0 0 1px #f97316, 0 0 0 1px #f97316'
          : undefined,
      }}
    >
      {isPerson ? (
        <img
          src="/preview-person.png"
          alt="Top-down person reference"
          draggable="false"
          className="pointer-events-none h-full w-full object-contain"
        />
      ) : (
        <div className="pointer-events-none flex h-full w-full flex-col items-center justify-center overflow-hidden">
          <span className="leading-tight">
            {item?.name || 'Item'}
            {storageLabel && <small className="mt-0.5 block text-[9px] font-medium">{storageLabel}</small>}
          </span>
        </div>
      )}

      {isSelected && (
        <>
          {!isPerson && ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((side) => (
            <button
              key={side}
              type="button"
              data-planner-control
              aria-label={`Resize ${item?.name || 'item'} from ${side}`}
              onPointerDown={(event) => onResizePointerDown(event, side)}
              className={`absolute z-40 h-1.5 w-1.5 shrink-0 aspect-square border border-current bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${handleClass(side)}`}
            />
          ))}

          <button
            type="button"
            data-planner-control
            aria-label={`Rotate ${isPerson ? 'person reference' : item?.name || 'item'}`}
            onPointerDown={onRotatePointerDown}
            className="absolute left-1/2 top-0 z-40 flex h-8 w-12 -translate-x-1/2 -translate-y-[calc(100%+11px)] items-center justify-center bg-transparent p-0 text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <img src="/rotation-arrow.png" alt="" draggable="false" className="h-7 w-10 object-contain" />
          </button>
        </>
      )}
    </div>
  )
}

function usePlannerItemPhoto(item, photoRootRef, onLoadPhoto) {
  const photoRef = useRef(null)
  const [photoUrl, setPhotoUrl] = useState(item.imageUrl || '')
  const [photoFailed, setPhotoFailed] = useState(false)

  useEffect(() => {
    setPhotoUrl(item.imageUrl || '')
    setPhotoFailed(false)
  }, [item.id, item.updatedAt, item.imageUrl])

  useEffect(() => {
    if (!item.hasPhoto || photoUrl || !onLoadPhoto || !photoRef.current) return undefined
    let active = true
    let requested = false
    const loadPhoto = () => {
      if (requested) return
      requested = true
      onLoadPhoto(item)
        .then((url) => {
          if (!active) return
          if (url) setPhotoUrl(url)
          else setPhotoFailed(true)
        })
        .catch(() => { if (active) setPhotoFailed(true) })
    }

    if (!('IntersectionObserver' in window)) {
      loadPhoto()
      return () => { active = false }
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadPhoto()
        observer.disconnect()
      }
    }, { root: photoRootRef.current, rootMargin: '120px' })
    observer.observe(photoRef.current)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [item.id, item.updatedAt, item.hasPhoto, item.imageUrl, onLoadPhoto, photoRootRef, photoUrl])

  return { photoRef, photoUrl: photoUrl || item.imageUrl || '', photoFailed }
}

function PlannerItemCard({ item, placed, unavailable, photoRootRef, onLoadPhoto, onActivate }) {
  const { photoRef, photoUrl, photoFailed } = usePlannerItemPhoto(item, photoRootRef, onLoadPhoto)

  return (
    <button
      type="button"
      title={item.name}
      aria-label={`${placed ? 'Select' : unavailable ? 'Unavailable' : 'Add'} ${item.name}${unavailable && !placed ? ', stored in another item' : ''}`}
      disabled={unavailable && !placed}
      onClick={onActivate}
      className={`group flex min-h-[74px] min-w-0 flex-col overflow-hidden border text-left transition-colors disabled:cursor-not-allowed ${placed ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-orange-500'} ${unavailable && !placed ? 'opacity-60' : ''}`}
    >
      <span ref={photoRef} className="relative flex h-10 w-full shrink-0 items-center justify-center overflow-hidden bg-slate-200">
        {photoUrl ? (
          <img src={photoUrl} alt="" draggable="false" style={getPhotoImageStyle(item)} className="h-full w-full" />
        ) : item.hasPhoto && onLoadPhoto && !photoFailed ? (
          <span className="h-full w-full animate-pulse bg-slate-300" aria-hidden="true" />
        ) : (
          <InventoryTypeIcon isStorageUnit={item.isStorageUnit} className="h-8 w-8 text-slate-500" />
        )}
      </span>
      <span className="flex min-h-8 min-w-0 flex-1 items-center justify-between gap-1 px-2 py-1 text-[10px]">
        <span className="truncate font-semibold text-slate-900">{item.name}</span>
        {placed ? <span className="shrink-0 text-[8px] font-semibold text-orange-600">Placed</span>
          : unavailable ? <span className="shrink-0 text-[8px] text-slate-500">Stored</span>
            : <span aria-hidden="true" className="shrink-0 text-base font-medium leading-none text-slate-500 group-hover:text-orange-500">+</span>}
      </span>
    </button>
  )
}

function PlannerStorageItemCard({ item, photoRootRef, onLoadPhoto }) {
  const { photoRef, photoUrl, photoFailed } = usePlannerItemPhoto(item, photoRootRef, onLoadPhoto)

  return (
    <div className="w-24 shrink-0 snap-start">
      <div ref={photoRef} className="relative flex h-20 items-center justify-center overflow-hidden border border-slate-200 bg-slate-200">
        {photoUrl ? (
          <img src={photoUrl} alt="" draggable="false" style={getPhotoImageStyle(item)} className="h-full w-full" />
        ) : item.hasPhoto && onLoadPhoto && !photoFailed ? (
          <span className="h-full w-full animate-pulse bg-slate-300" aria-hidden="true" />
        ) : (
          <InventoryTypeIcon isStorageUnit={item.isStorageUnit} className="h-9 w-9 text-slate-500" />
        )}
      </div>
      <p title={item.name} className="mt-1 truncate text-[10px] font-medium text-slate-900">{item.name}</p>
    </div>
  )
}

export function PlannerLoadingScreen({ roomName, isVisible = true }) {
  return (
    <div role="status" aria-live="polite" className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-6 text-center text-white transition-opacity duration-200 ease-out ${isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
      <video autoPlay loop muted playsInline preload="auto" aria-hidden="true" className="mb-5 h-auto w-auto max-h-[55vh] max-w-md object-contain">
        <source src="/roomy-loading.mp4" type="video/mp4" />
      </video>
      <p className="text-lg font-semibold">Entering room planner…</p>
      {roomName && <p className="mt-1 text-sm text-slate-300">Preparing {roomName}</p>}
      <div
        role="progressbar"
        aria-label="Loading room planner"
        className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-white/20"
      >
        <div className="planner-loading-bar h-full w-[35%] rounded-full bg-orange-500" />
      </div>
    </div>
  )
}

export default function PlannerWorkspace({
  room,
  items = [],
  onBack,
  isDarkMode,
  onToggleTheme,
  onLoad,
  onLoadPhoto,
  onSave,
  onGetContents,
}) {
  const [layout, setLayout] = useState({ revision: 0, items: [] })
  const [roomDimensions, setRoomDimensions] = useState({ widthCm: 0, depthCm: 0 })
  const [selectedId, setSelectedId] = useState(null)
  const [person, setPerson] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [itemTypeFilter, setItemTypeFilter] = useState('all')
  const [contents, setContents] = useState([])
  const [storageScroll, setStorageScroll] = useState({ overflow: false, canScrollLeft: false, canScrollRight: false, progress: 0, thumbWidth: 100 })
  const [roomItemsScroll, setRoomItemsScroll] = useState({ overflow: false, progress: 0, thumbHeight: 100 })
  const [roomItemsBounce, setRoomItemsBounce] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveStatus, setSaveStatus] = useState('loading')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [isLayoutReady, setIsLayoutReady] = useState(false)
  const [isLayoutLoading, setIsLayoutLoading] = useState(true)
  const [isLayoutLoadingVisible, setIsLayoutLoadingVisible] = useState(true)
  const [view, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } })
  const [isPanning, setIsPanning] = useState(false)
  const [hoveredWall, setHoveredWall] = useState(null)
  const [selectedWall, setSelectedWall] = useState(null)
  const [rotationCursor, setRotationCursor] = useState(null)
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const [viewportSize, setViewportSize] = useState({ width: 760, height: 600 })

  const viewportRef = useRef(null)
  const itemGridRef = useRef(null)
  const storageRailRef = useRef(null)
  const roomItemsBounceTimeoutRef = useRef(null)
  const layoutLoadingTimerRef = useRef(null)
  const layoutLoadingFadeTimerRef = useRef(null)
  const autosaveTimerRef = useRef(null)
  const layoutLoadedRef = useRef(false)
  const savedLayoutKeyRef = useRef(null)
  const layoutRevisionRef = useRef(0)
  const saveInFlightRef = useRef(false)
  const autosaveDueRef = useRef(false)
  const saveActionRef = useRef(null)
  const interactionRef = useRef(null)
  const draftRef = useRef({ items: [], widthCm: 0, depthCm: 0, person: null })
  const viewRef = useRef(view)
  const inspectorHistoryRef = useRef(null)

  const widthCm = Number(roomDimensions.widthCm)
  const depthCm = Number(roomDimensions.depthCm)
  const hasDimensions = widthCm > 0 && depthCm > 0
  const lastSavedLabel = lastSavedAt
    ? `Last saved ${lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Last saved'
  const persistedDraftKey = useMemo(
    () => getPersistedLayoutKey({ items: layout.items, widthCm, depthCm }),
    [layout.items, widthCm, depthCm],
  )

  const selectedShape = selectedId === PERSON_ID
    ? person
    : layout.items.find((shape) => shape.itemId === selectedId)
  const selectedItem = selectedId === PERSON_ID
    ? null
    : items.find((item) => item.id === selectedId)
  const isSelectedPerson = selectedId === PERSON_ID && Boolean(person)

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return items
      .filter((item) => {
        const matchesSearch = String(item.name || '').toLowerCase().includes(query)
        const matchesType = itemTypeFilter === 'all'
          || (itemTypeFilter === 'storage' ? item.isStorageUnit : !item.isStorageUnit)
        return matchesSearch && matchesType
      })
      .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), undefined, { sensitivity: 'base', numeric: true }))
  }, [items, searchTerm, itemTypeFilter])

  const minimumDimensions = useMemo(() => minimumRoomDimensions([
    ...layout.items,
    ...(person ? [person] : []),
  ]), [layout.items, person])

  useEffect(() => () => {
    if (roomItemsBounceTimeoutRef.current) window.clearTimeout(roomItemsBounceTimeoutRef.current)
  }, [])

  const baseScale = hasDimensions
    ? Math.max(0.002, Math.min(
      (viewportSize.width - 140) / widthCm,
      (viewportSize.height - 150) / depthCm,
      1,
    ))
    : 1
  const floorWidth = Math.max(1, widthCm * baseScale)
  const floorHeight = Math.max(1, depthCm * baseScale)
  const roomFrameWidth = floorWidth + 76
  const roomFrameHeight = floorHeight + 76

  useLayoutEffect(() => {
    if (!viewportRef.current) return undefined
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(viewportRef.current)
    return () => observer.disconnect()
  }, [])

  const scheduleAutosave = useCallback((delay = PLANNER_AUTOSAVE_DELAY_MS) => {
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null
      if (!layoutLoadedRef.current) return
      if (interactionRef.current || inspectorHistoryRef.current) {
        scheduleAutosave()
        return
      }
      if (saveInFlightRef.current) {
        autosaveDueRef.current = true
        return
      }
      saveActionRef.current?.(false)
    }, delay)
  }, [])

  useEffect(() => {
    if (!room?.id) return undefined
    let active = true
    const loadStartedAt = Date.now()
    layoutLoadedRef.current = false
    savedLayoutKeyRef.current = null
    layoutRevisionRef.current = 0
    autosaveDueRef.current = false
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = null
    setIsLayoutReady(false)
    setSaveStatus('loading')
    setLastSavedAt(null)
    setBusy(true)
    setIsLayoutLoading(true)
    setIsLayoutLoadingVisible(true)
    setError('')

    onLoad(room.id)
      .then((next) => {
        if (!active) return
        const nextWidth = Number(next.widthCm ?? room.widthCm)
        const nextDepth = Number(next.depthCm ?? room.depthCm)
        const nextDraft = {
          items: (next.items || []).map(cloneShape),
          widthCm: nextWidth,
          depthCm: nextDepth,
          person: null,
        }
        layoutRevisionRef.current = Number(next.revision ?? 0)
        savedLayoutKeyRef.current = getPersistedLayoutKey(nextDraft)
        layoutLoadedRef.current = true
        setIsLayoutReady(true)
        setSaveStatus('saved')
        draftRef.current = nextDraft
        setLayout({ ...next, items: nextDraft.items })
        setRoomDimensions({ widthCm: nextWidth, depthCm: nextDepth })
        setPerson(null)
        setSelectedId(null)
        setHistory([])
        setFuture([])
        const defaultView = { zoom: 1, pan: { x: 0, y: 0 } }
        setView(defaultView)
        viewRef.current = defaultView
      })
      .catch((cause) => {
        if (!active) return
        setError(cause.message)
        setSaveStatus('load-error')
      })
      .finally(() => {
        if (!active) return
        setBusy(false)
        const minimumWait = Math.max(0, PLANNER_LOADING_MIN_MS - (Date.now() - loadStartedAt))
        layoutLoadingTimerRef.current = window.setTimeout(() => {
          if (!active) return
          setIsLayoutLoadingVisible(false)
          layoutLoadingFadeTimerRef.current = window.setTimeout(() => {
            if (active) setIsLayoutLoading(false)
            layoutLoadingTimerRef.current = null
            layoutLoadingFadeTimerRef.current = null
          }, PLANNER_LOADING_FADE_MS)
        }, minimumWait)
      })

    return () => {
      active = false
      layoutLoadedRef.current = false
      autosaveDueRef.current = false
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
      if (layoutLoadingTimerRef.current) window.clearTimeout(layoutLoadingTimerRef.current)
      if (layoutLoadingFadeTimerRef.current) window.clearTimeout(layoutLoadingFadeTimerRef.current)
    }
  }, [room?.id, onLoad])

  useEffect(() => {
    if (!room?.id || !isLayoutReady || !hasDimensions) return undefined
    if (persistedDraftKey === savedLayoutKeyRef.current) {
      setSaveStatus((current) => current === 'unsaved' || current === 'error' ? 'saved' : current)
      setError('')
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
      return undefined
    }

    setSaveStatus((current) => current === 'saving' ? current : 'unsaved')
    setError('')
    scheduleAutosave()
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
  }, [persistedDraftKey, hasDimensions, isLayoutReady, room?.id, scheduleAutosave])

  useEffect(() => {
    setContents([])
    if (!selectedItem?.isStorageUnit || !onGetContents) return undefined
    let active = true
    onGetContents(selectedItem.id)
      .then((data) => { if (active) setContents(data.items || []) })
      .catch(() => { if (active) setContents([]) })
    return () => { active = false }
  }, [selectedItem?.id, onGetContents])

  useEffect(() => {
    const rail = storageRailRef.current
    if (!rail || !contents.length || !selectedItem?.isStorageUnit) {
      setStorageScroll({ overflow: false, canScrollLeft: false, canScrollRight: false, progress: 0, thumbWidth: 100 })
      return undefined
    }

    const updateScrollState = () => {
      const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth)
      const overflow = maximum > 1
      const thumbWidth = overflow ? Math.max(16, (rail.clientWidth / rail.scrollWidth) * 100) : 100
      const progress = overflow ? Math.round((rail.scrollLeft / maximum) * 100) : 0
      setStorageScroll((current) => {
        const next = {
          overflow,
          canScrollLeft: rail.scrollLeft > 1,
          canScrollRight: rail.scrollLeft < maximum - 1,
          progress,
          thumbWidth,
        }
        return Object.keys(next).every((key) => next[key] === current[key]) ? current : next
      })
    }

    updateScrollState()
    rail.addEventListener('scroll', updateScrollState, { passive: true })
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(rail)
    return () => {
      rail.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
    }
  }, [contents, selectedItem?.id, selectedItem?.isStorageUnit])

  useEffect(() => {
    const rail = itemGridRef.current
    if (!rail || !filteredItems.length) {
      setRoomItemsScroll({ overflow: false, progress: 0, thumbHeight: 100 })
      return undefined
    }

    const updateScrollState = () => {
      const maximum = Math.max(0, rail.scrollHeight - rail.clientHeight)
      const overflow = maximum > 1
      const itemRows = Math.ceil(filteredItems.length / 2)
      const maximumThumbHeight = Math.max(44, 82 - itemRows * 4)
      const thumbHeight = overflow
        ? Math.max(12, Math.min(maximumThumbHeight, (rail.clientHeight / rail.scrollHeight) * 100))
        : 100
      const progress = overflow
        ? rail.scrollTop >= maximum - 1 ? 100 : Math.round((rail.scrollTop / maximum) * 100)
        : 0
      setRoomItemsScroll((current) => {
        const next = { overflow, progress, thumbHeight }
        return Object.keys(next).every((key) => next[key] === current[key]) ? current : next
      })
    }

    updateScrollState()
    rail.addEventListener('scroll', updateScrollState, { passive: true })
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(rail)
    return () => {
      rail.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
    }
  }, [filteredItems.length])

  function snapshot() {
    return cloneDraft(draftRef.current)
  }

  function replaceDraft(nextDraft) {
    const normalized = cloneDraft(nextDraft)
    draftRef.current = normalized
    setLayout((current) => ({ ...current, items: normalized.items }))
    setRoomDimensions({ widthCm: normalized.widthCm, depthCm: normalized.depthCm })
    setPerson(normalized.person)
  }

  function recordSnapshot(previous) {
    setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), previous])
    setFuture([])
  }

  function finishInteraction() {
    const interaction = interactionRef.current
    interactionRef.current = null
    setIsPanning(false)
    setRotationCursor(null)
    if (interaction?.snapshot && !sameDraft(interaction.snapshot, snapshot())) recordSnapshot(interaction.snapshot)
  }

  function restoreSnapshot(nextSnapshot) {
    replaceDraft(nextSnapshot)
    setSelectedId(null)
    setSelectedWall(null)
  }

  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    const current = snapshot()
    restoreSnapshot(previous)
    setHistory((entries) => entries.slice(0, -1))
    setFuture((entries) => [current, ...entries].slice(0, HISTORY_LIMIT))
  }

  function redo() {
    const next = future[0]
    if (!next) return
    const current = snapshot()
    restoreSnapshot(next)
    setFuture((entries) => entries.slice(1))
    setHistory((entries) => [...entries.slice(-(HISTORY_LIMIT - 1)), current])
  }

  function setCanvasView(nextView) {
    viewRef.current = nextView
    setView(nextView)
  }

  function changeZoom(amount, focalPoint = null) {
    const current = viewRef.current
    const zoom = clamp(round(current.zoom + amount), 0.5, 2.5)
    if (zoom === current.zoom) return
    const ratio = zoom / current.zoom
    const pan = focalPoint
      ? { x: focalPoint.x - ratio * (focalPoint.x - current.pan.x), y: focalPoint.y - ratio * (focalPoint.y - current.pan.y) }
      : current.pan
    setCanvasView({ zoom, pan })
  }

  function resetView() {
    setCanvasView({ zoom: 1, pan: { x: 0, y: 0 } })
  }

  function scrollStorageContents(direction) {
    const rail = storageRailRef.current
    if (!rail) return
    rail.scrollBy({ left: direction * Math.max(160, rail.clientWidth * 0.75), behavior: 'smooth' })
  }

  function handleStorageContentsWheel(event) {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

    const rail = event.currentTarget
    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth)
    const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, rail.scrollLeft + event.deltaY))
    if (nextScrollLeft === rail.scrollLeft) return

    event.preventDefault()
    rail.scrollLeft = nextScrollLeft
  }

  function handleRoomItemsWheel(event) {
    if (!filteredItems.length) return
    const rail = event.currentTarget
    const maximum = Math.max(0, rail.scrollHeight - rail.clientHeight)
    const requestedScrollTop = rail.scrollTop + event.deltaY
    const nextScrollTop = Math.max(0, Math.min(maximum, requestedScrollTop))
    const bounceDirection = requestedScrollTop < 0 ? 1 : requestedScrollTop > maximum ? -1 : 0
    if (nextScrollTop === rail.scrollTop && !bounceDirection) return

    event.preventDefault()
    if (nextScrollTop !== rail.scrollTop) {
      rail.scrollTop = nextScrollTop
      setRoomItemsBounce(0)
      if (roomItemsBounceTimeoutRef.current) window.clearTimeout(roomItemsBounceTimeoutRef.current)
    }
    if (bounceDirection) {
      setRoomItemsBounce(bounceDirection * 14)
      if (roomItemsBounceTimeoutRef.current) window.clearTimeout(roomItemsBounceTimeoutRef.current)
      roomItemsBounceTimeoutRef.current = window.setTimeout(() => {
        setRoomItemsBounce(0)
        roomItemsBounceTimeoutRef.current = null
      }, 140)
    }
  }

  function shapeForId(id) {
    return id === PERSON_ID
      ? draftRef.current.person
      : draftRef.current.items.find((shape) => shape.itemId === id)
  }

  function updateShape(id, nextShape) {
    const current = draftRef.current
    if (id === PERSON_ID) {
      replaceDraft({ ...current, person: nextShape })
      return
    }
    replaceDraft({ ...current, items: current.items.map((shape) => shape.itemId === id ? nextShape : shape) })
  }

  function fittingShape(shape) {
    const widthLimit = maximumWidthForRoom(shape.depth, shape.rotation, widthCm, depthCm)
    const depthLimit = maximumDepthForRoom(shape.width, shape.rotation, widthCm, depthCm)
    let next = {
      ...shape,
      width: round(clamp(Number(shape.width), PLANNER_MIN_DIMENSION, Math.max(PLANNER_MIN_DIMENSION, widthLimit))),
      depth: round(clamp(Number(shape.depth), PLANNER_MIN_DIMENSION, Math.max(PLANNER_MIN_DIMENSION, depthLimit))),
    }
    const uniformScale = maximumUniformScale(next, widthCm, depthCm)
    if (uniformScale < 1) {
      next = {
        ...next,
        width: round(Math.max(PLANNER_MIN_DIMENSION, next.width * uniformScale)),
        depth: round(Math.max(PLANNER_MIN_DIMENSION, next.depth * uniformScale)),
      }
    }
    return clampShapePosition(next, widthCm, depthCm)
  }

  function resizeWithAnchoredOpposite(shape, nextWidth, nextDepth, horizontal = 0, vertical = 0) {
    const widthChange = nextWidth - shape.width
    const depthChange = nextDepth - shape.depth
    const radians = (shape.rotation * Math.PI) / 180
    const localX = horizontal * widthChange / 2
    const localY = vertical * depthChange / 2
    const shiftX = localX * Math.cos(radians) - localY * Math.sin(radians)
    const shiftY = localX * Math.sin(radians) + localY * Math.cos(radians)
    const centerX = shape.x + shape.width / 2 + shiftX
    const centerY = shape.y + shape.depth / 2 + shiftY
    return fittingShape({
      ...shape,
      width: round(nextWidth),
      depth: round(nextDepth),
      x: round(centerX - nextWidth / 2),
      y: round(centerY - nextDepth / 2),
    })
  }

  function resizeFromHandle(shape, handle, localX, localY) {
    const horizontal = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0
    const vertical = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0
    if (horizontal && vertical) {
      const horizontalChange = horizontal * localX / shape.width
      const verticalChange = vertical * localY / shape.depth
      const dominantChange = Math.abs(horizontalChange) >= Math.abs(verticalChange) ? horizontalChange : verticalChange
      const minimumScale = Math.max(PLANNER_MIN_DIMENSION / shape.width, PLANNER_MIN_DIMENSION / shape.depth)
      const maximumScale = maximumUniformScale(shape, widthCm, depthCm)
      const scale = clamp(1 + dominantChange, minimumScale, Math.max(minimumScale, maximumScale))
      return resizeWithAnchoredOpposite(shape, round(shape.width * scale), round(shape.depth * scale), horizontal, vertical)
    }
    if (horizontal) {
      const maximumWidth = maximumWidthForRoom(shape.depth, shape.rotation, widthCm, depthCm)
      const nextWidth = clamp(shape.width + horizontal * localX, PLANNER_MIN_DIMENSION, Math.max(PLANNER_MIN_DIMENSION, maximumWidth))
      return resizeWithAnchoredOpposite(shape, round(nextWidth), shape.depth, horizontal, 0)
    }
    const maximumDepth = maximumDepthForRoom(shape.width, shape.rotation, widthCm, depthCm)
    const nextDepth = clamp(shape.depth + vertical * localY, PLANNER_MIN_DIMENSION, Math.max(PLANNER_MIN_DIMENSION, maximumDepth))
    return resizeWithAnchoredOpposite(shape, shape.width, round(nextDepth), 0, vertical)
  }

  function pointerScale() {
    return Math.max(0.0001, baseScale * viewRef.current.zoom)
  }

  function startObjectDrag(event, id) {
    if (event.button !== 0) return
    const shape = shapeForId(id)
    if (!shape) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    interactionRef.current = { type: 'move', pointerId: event.pointerId, id, startX: event.clientX, startY: event.clientY, initialShape: cloneShape(shape), snapshot: snapshot() }
    setSelectedId(id)
  }

  function moveObject(event) {
    const interaction = interactionRef.current
    if (!interaction || interaction.type !== 'move' || interaction.pointerId !== event.pointerId) return
    const scale = pointerScale()
    updateShape(interaction.id, clampShapePosition({
      ...interaction.initialShape,
      x: interaction.initialShape.x + (event.clientX - interaction.startX) / scale,
      y: interaction.initialShape.y + (event.clientY - interaction.startY) / scale,
    }, widthCm, depthCm))
  }

  function startResize(event, id, handle) {
    if (event.button !== 0 || id === PERSON_ID) return
    const shape = shapeForId(id)
    if (!shape) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    interactionRef.current = { type: 'resize', pointerId: event.pointerId, id, handle, startX: event.clientX, startY: event.clientY, initialShape: cloneShape(shape), snapshot: snapshot() }
    setSelectedId(id)
  }

  function resizeObject(event) {
    const interaction = interactionRef.current
    if (!interaction || interaction.type !== 'resize' || interaction.pointerId !== event.pointerId) return
    const scale = pointerScale()
    const screenX = (event.clientX - interaction.startX) / scale
    const screenY = (event.clientY - interaction.startY) / scale
    const radians = (interaction.initialShape.rotation * Math.PI) / 180
    const localX = screenX * Math.cos(radians) + screenY * Math.sin(radians)
    const localY = -screenX * Math.sin(radians) + screenY * Math.cos(radians)
    updateShape(interaction.id, resizeFromHandle(interaction.initialShape, interaction.handle, localX, localY))
  }

  function startRotation(event, id) {
    if (event.button !== 0) return
    const shape = shapeForId(id)
    const objectElement = event.currentTarget.closest('[data-planner-object]')
    const viewportBounds = viewportRef.current?.getBoundingClientRect()
    const objectBounds = objectElement?.getBoundingClientRect()
    if (!shape || !viewportBounds || !objectBounds) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const centerX = objectBounds.left + objectBounds.width / 2
    const centerY = objectBounds.top + objectBounds.height / 2
    const startPointerAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI)
    interactionRef.current = { type: 'rotate', pointerId: event.pointerId, id, centerX, centerY, startPointerAngle, initialShape: cloneShape(shape), snapshot: snapshot(), viewportBounds }
    setSelectedId(id)
    setRotationCursor({ x: event.clientX - viewportBounds.left, y: event.clientY - viewportBounds.top, degrees: shape.rotation })
  }

  function rotateObject(event) {
    const interaction = interactionRef.current
    if (!interaction || interaction.type !== 'rotate' || interaction.pointerId !== event.pointerId) return
    const pointerAngle = Math.atan2(event.clientY - interaction.centerY, event.clientX - interaction.centerX) * (180 / Math.PI)
    const rotation = snapRotation(interaction.initialShape.rotation + angleDifference(pointerAngle, interaction.startPointerAngle))
    setRotationCursor({ x: event.clientX - interaction.viewportBounds.left, y: event.clientY - interaction.viewportBounds.top, degrees: rotation })
    const candidate = { ...interaction.initialShape, rotation }
    if (maximumUniformScale(candidate, widthCm, depthCm) < 1) return
    updateShape(interaction.id, clampShapePosition(candidate, widthCm, depthCm))
  }

  function endObjectInteraction(event) {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId || interaction.type === 'pan' || interaction.type === 'wall') return
    finishInteraction()
  }

  function startWallDrag(event, wall) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    interactionRef.current = { type: 'wall', pointerId: event.pointerId, wall, startX: event.clientX, startY: event.clientY, initialWidth: widthCm, initialDepth: depthCm, snapshot: snapshot() }
    setSelectedWall(wall)
  }

  function dragWall(event) {
    const interaction = interactionRef.current
    if (!interaction || interaction.type !== 'wall' || interaction.pointerId !== event.pointerId) return
    const scale = pointerScale()
    const deltaX = (event.clientX - interaction.startX) / scale
    const deltaY = (event.clientY - interaction.startY) / scale
    const changesWidth = interaction.wall === 'left' || interaction.wall === 'right'
    const changesDepth = interaction.wall === 'top' || interaction.wall === 'bottom'
    const requestedWidth = interaction.wall === 'right' ? interaction.initialWidth + deltaX : interaction.wall === 'left' ? interaction.initialWidth - deltaX : interaction.initialWidth
    const requestedDepth = interaction.wall === 'bottom' ? interaction.initialDepth + deltaY : interaction.wall === 'top' ? interaction.initialDepth - deltaY : interaction.initialDepth
    replaceDraft({
      ...draftRef.current,
      widthCm: changesWidth ? round(clamp(requestedWidth, minimumDimensions.width, PLANNER_MAX_DIMENSION)) : interaction.initialWidth,
      depthCm: changesDepth ? round(clamp(requestedDepth, minimumDimensions.depth, PLANNER_MAX_DIMENSION)) : interaction.initialDepth,
    })
  }

  function endWallDrag(event) {
    const interaction = interactionRef.current
    if (!interaction || interaction.type !== 'wall' || interaction.pointerId !== event.pointerId) return
    finishInteraction()
  }

  function handleCanvasPointerDown(event) {
    if (event.button !== 0 || event.target.closest('[data-planner-object], [data-planner-wall], [data-planner-control]')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    interactionRef.current = { type: 'pan', pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, initialView: viewRef.current }
    setSelectedId(null)
    setSelectedWall(null)
    setIsPanning(true)
  }

  function handleCanvasPointerMove(event) {
    const interaction = interactionRef.current
    if (!interaction || interaction.type !== 'pan' || interaction.pointerId !== event.pointerId) return
    setCanvasView({
      ...interaction.initialView,
      pan: {
        x: interaction.initialView.pan.x + event.clientX - interaction.startX,
        y: interaction.initialView.pan.y + event.clientY - interaction.startY,
      },
    })
  }

  function handleCanvasPointerUp(event) {
    const interaction = interactionRef.current
    if (!interaction || interaction.type !== 'pan' || interaction.pointerId !== event.pointerId) return
    interactionRef.current = null
    setIsPanning(false)
  }

  function addItem(item) {
    if (!hasDimensions) return
    const previous = snapshot()
    const rawWidth = Number(item.widthCm ?? item.width ?? DEFAULT_ITEM_DIMENSION)
    const rawDepth = Number(item.depthCm ?? item.depth ?? DEFAULT_ITEM_DIMENSION)
    const shape = fittingShape({
      itemId: item.id,
      x: 0,
      y: 0,
      width: Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : DEFAULT_ITEM_DIMENSION,
      depth: Number.isFinite(rawDepth) && rawDepth > 0 ? rawDepth : DEFAULT_ITEM_DIMENSION,
      rotation: 0,
      color: DEFAULT_ITEM_COLOR,
    })
    replaceDraft({ ...draftRef.current, items: [...draftRef.current.items, shape] })
    setSelectedId(item.id)
    recordSnapshot(previous)
  }

  function togglePerson() {
    const previous = snapshot()
    if (person) {
      replaceDraft({ ...draftRef.current, person: null })
      if (selectedId === PERSON_ID) setSelectedId(null)
      recordSnapshot(previous)
      return
    }
    const nextPerson = fittingShape({
      id: PERSON_ID,
      x: Math.max(0, (widthCm - PERSON_WIDTH_CM) / 2),
      y: Math.max(0, (depthCm - PERSON_DEPTH_CM) / 2),
      width: PERSON_WIDTH_CM,
      depth: PERSON_DEPTH_CM,
      rotation: 0,
    })
    replaceDraft({ ...draftRef.current, person: nextPerson })
    setSelectedId(PERSON_ID)
    recordSnapshot(previous)
  }

  function removeSelected() {
    if (!selectedId || selectedId === PERSON_ID) return
    const previous = snapshot()
    replaceDraft({ ...draftRef.current, items: draftRef.current.items.filter((shape) => shape.itemId !== selectedId) })
    setSelectedId(null)
    recordSnapshot(previous)
  }

  function startInspectorEdit() {
    inspectorHistoryRef.current = snapshot()
  }

  function finishInspectorEdit() {
    const previous = inspectorHistoryRef.current
    inspectorHistoryRef.current = null
    if (previous && !sameDraft(previous, snapshot())) recordSnapshot(previous)
  }

  function updateRoomDimension(field, rawValue) {
    const value = Number(rawValue)
    if (!Number.isFinite(value)) return
    const minimum = field === 'widthCm' ? minimumDimensions.width : minimumDimensions.depth
    replaceDraft({
      ...draftRef.current,
      [field]: round(clamp(value, minimum, PLANNER_MAX_DIMENSION)),
    })
  }

  function updateInspectorField(field, rawValue) {
    if (!selectedShape || selectedId === PERSON_ID) return
    if (field === 'color') {
      updateShape(selectedId, { ...selectedShape, color: rawValue })
      return
    }
    const value = Number(rawValue)
    if (!Number.isFinite(value)) return
    let next = { ...selectedShape }
    if (field === 'x' || field === 'y') {
      next[field] = round(value)
      next = clampShapePosition(next, widthCm, depthCm)
    } else if (field === 'rotation') {
      next.rotation = normalizeAngle(value)
      if (maximumUniformScale(next, widthCm, depthCm) < 1) return
      next = clampShapePosition(next, widthCm, depthCm)
    } else if (field === 'width') {
      const maximumWidth = maximumWidthForRoom(next.depth, next.rotation, widthCm, depthCm)
      next = resizeWithAnchoredOpposite(next, clamp(value, PLANNER_MIN_DIMENSION, Math.max(PLANNER_MIN_DIMENSION, maximumWidth)), next.depth)
    } else if (field === 'depth') {
      const maximumDepth = maximumDepthForRoom(next.width, next.rotation, widthCm, depthCm)
      next = resizeWithAnchoredOpposite(next, next.width, clamp(value, PLANNER_MIN_DIMENSION, Math.max(PLANNER_MIN_DIMENSION, maximumDepth)))
    }
    updateShape(selectedId, next)
  }

  async function save(immediate = true) {
    if (immediate) {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
      autosaveDueRef.current = false
    }
    if (!isLayoutReady || !hasDimensions) return
    if (saveInFlightRef.current) {
      if (!immediate) autosaveDueRef.current = true
      return
    }

    const requestDraft = cloneDraft(draftRef.current)
    const payload = getPersistedLayout(requestDraft)
    const requestKey = JSON.stringify(payload)
    if (requestKey === savedLayoutKeyRef.current) {
      setSaveStatus('saved')
      return
    }

    saveInFlightRef.current = true
    setBusy(true)
    setSaveStatus('saving')
    setError('')
    let didSave = false
    try {
      const next = await onSave(room.id, { revision: layoutRevisionRef.current, ...payload })
      const currentDraftKey = getPersistedLayoutKey(draftRef.current)
      const hasPersistedEditsDuringSave = currentDraftKey !== requestKey
      const draftChangedDuringSave = !sameDraft(requestDraft, draftRef.current)
      const nextDraft = {
        items: (next.items || []).map(cloneShape),
        widthCm: Number(next.widthCm ?? payload.widthCm),
        depthCm: Number(next.depthCm ?? payload.depthCm),
        person: draftRef.current.person,
      }
      savedLayoutKeyRef.current = getPersistedLayoutKey(nextDraft)
      layoutRevisionRef.current = Number(next.revision ?? (layoutRevisionRef.current + 1))
      setLastSavedAt(new Date())
      if (!hasPersistedEditsDuringSave) {
        draftRef.current = nextDraft
        setRoomDimensions({ widthCm: nextDraft.widthCm, depthCm: nextDraft.depthCm })
      }
      setLayout((current) => ({
        ...current,
        ...next,
        revision: layoutRevisionRef.current,
        items: hasPersistedEditsDuringSave ? current.items : nextDraft.items,
      }))
      if (immediate && !draftChangedDuringSave) {
        setHistory([])
        setFuture([])
      }
      setSaveStatus(hasPersistedEditsDuringSave ? 'unsaved' : 'saved')
      didSave = true
    } catch (cause) {
      setError(cause.message)
      setSaveStatus('error')
    } finally {
      saveInFlightRef.current = false
      setBusy(false)
      const latestKey = getPersistedLayoutKey(draftRef.current)
      if (latestKey !== savedLayoutKeyRef.current) {
        if (didSave) setSaveStatus('unsaved')
        if (didSave) {
          const wasAutosaveDue = autosaveDueRef.current
          autosaveDueRef.current = false
          if (!autosaveTimerRef.current) {
            scheduleAutosave(wasAutosaveDue ? 0 : PLANNER_AUTOSAVE_DELAY_MS)
          }
        } else {
          autosaveDueRef.current = false
          if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
          autosaveTimerRef.current = null
        }
      } else {
        autosaveDueRef.current = false
        if (didSave) setSaveStatus('saved')
      }
    }
  }

  saveActionRef.current = save

  return (
    <main className="relative h-screen w-full overflow-hidden bg-slate-100">
      <nav aria-label="Planner navigation" className="absolute inset-x-0 top-0 z-50 w-full border-b border-black bg-black px-3 text-white sm:px-8">
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 lg:min-h-[80px] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-8 lg:py-0">
          <div className="flex min-w-0 items-center gap-2 sm:gap-7 lg:col-start-1 lg:row-start-1">
            <span className="shrink-0 text-xl font-bold tracking-tight text-orange-500 sm:text-2xl">Roomy</span>
            <span aria-hidden="true" className={`hidden h-8 w-px sm:block ${isDarkMode ? 'bg-slate-700' : 'bg-[#62769a]'}`} />
            <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-200 transition-colors hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:gap-2 sm:text-sm">
              <span aria-hidden="true" className="text-lg">←</span>
              <span>Back to inventory</span>
            </button>
          </div>
          <div className={`col-span-2 row-start-2 flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t pt-2 text-center lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:max-w-[42vw] lg:flex-nowrap lg:justify-self-center lg:border-0 lg:pt-0 ${isDarkMode ? 'border-slate-800' : 'border-[#3d5279]'}`}>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-500 sm:text-[11px]">Planner mode</span>
            <span aria-hidden="true" className={`hidden h-5 w-px sm:block ${isDarkMode ? 'bg-slate-700' : 'bg-[#62769a]'}`} />
            <h1 className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">{room?.name}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 lg:col-start-3 lg:row-start-1 lg:justify-self-end">
            <button type="button" aria-label={isDarkMode ? 'Dark mode' : 'Light mode'} aria-pressed={Boolean(isDarkMode)} title={isDarkMode ? 'Dark mode' : 'Light mode'} onClick={onToggleTheme} className={`mr-3 inline-flex h-11 w-11 items-center justify-center rounded-md border text-slate-200 transition-colors hover:border-orange-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isDarkMode ? 'border-slate-700' : 'border-[#7285a8]'}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                {isDarkMode ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></> : <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z" />}
              </svg>
            </button>
            <span
              role="status"
              aria-live="polite"
              className={`max-w-[68px] text-right text-[10px] leading-tight sm:max-w-none sm:text-xs ${saveStatus === 'error' || saveStatus === 'load-error' ? 'text-red-300' : saveStatus === 'unsaved' ? 'text-orange-300' : 'text-slate-300'}`}
            >
              {saveStatus === 'loading' ? 'Loading…' : saveStatus === 'unsaved' ? 'Unsaved changes' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'load-error' ? 'Load failed' : saveStatus === 'error' ? 'Save failed' : lastSavedLabel}
            </span>
            <Button variant="primary" onClick={() => save(true)} disabled={!hasDimensions || busy || !isLayoutReady} className="shrink-0">
              {saveStatus === 'saving' ? 'Saving…' : 'Save now'}
            </Button>
          </div>
        </div>
      </nav>

      {isLayoutLoading && (
        <PlannerLoadingScreen roomName={room?.name} isVisible={isLayoutLoadingVisible} />
      )}

      <div className="absolute inset-0 z-10 w-full">
        <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-2">
          <button type="button" aria-label="Undo planner change" onClick={undo} disabled={!history.length || busy} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m8 4-4 4 4 4" /><path d="M4 8h10a6 6 0 0 1 0 12h-2" /></svg>
          </button>
          <button type="button" aria-label="Redo planner change" onClick={redo} disabled={!future.length || busy} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m16 4 4 4-4 4" /><path d="M20 8H10a6 6 0 0 0 0 12h2" /></svg>
          </button>
        </div>

        {error && <p role="alert" className="absolute left-1/2 top-36 z-50 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 border border-red-300 bg-white p-3 text-sm text-red-700">{error}</p>}

        {!hasDimensions ? (
          <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-slate-300 bg-white p-6 text-sm text-slate-700">Set this room’s width and depth from the Rooms page to use the planner.</p>
        ) : (
  <div className="relative h-full w-full">
              <aside className="planner-side-panel absolute left-4 top-28 z-30 flex h-[calc(50vh-6rem)] max-h-[calc(100%-7rem)] w-[280px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden border border-slate-300 p-4 md:top-28 md:h-[calc(100vh-8rem)] md:max-h-[calc(100%-7rem)] lg:top-24 lg:h-[calc(100vh-7rem)]">
              <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900">Room items</h2><span className="text-xs text-slate-500">{layout.items.length} placed</span></div>
              <label className="relative mt-3 block"><span className="sr-only">Find room item</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Find item" className="min-h-10 w-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500" /></label>
              <div role="group" aria-label="Filter room items by type" className="mt-2 flex gap-1">
                {[['all', 'All items'], ['items', 'Items'], ['storage', 'Storage']].map(([value, label]) => <button key={value} type="button" aria-pressed={itemTypeFilter === value} onClick={() => setItemTypeFilter(value)} className={`min-h-7 flex-1 border px-1 text-[9px] font-medium transition-colors ${itemTypeFilter === value ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-orange-500 hover:text-orange-500'}`}>{label}</button>)}
              </div>
              <div className="relative mt-2 min-h-0 flex-1">
                <div ref={itemGridRef} onWheel={handleRoomItemsWheel} className="planner-room-items-rail absolute inset-0 overflow-y-auto overscroll-contain">
                  <div className="planner-room-items-content grid grid-cols-2 content-start gap-2" style={{ minHeight: filteredItems.length ? 'calc(100% + 32px)' : undefined, transform: roomItemsBounce ? `translateY(${roomItemsBounce}px)` : undefined }}>
                    {filteredItems.length ? filteredItems.map((item) => {
                      const placed = layout.items.some((shape) => shape.itemId === item.id)
                      const unavailable = Boolean(item.parentStorageId || item.storedInside)
                      return <PlannerItemCard key={item.id} item={item} placed={placed} unavailable={unavailable} photoRootRef={itemGridRef} onLoadPhoto={onLoadPhoto} onActivate={() => { if (placed) setSelectedId(item.id); else if (!unavailable) addItem(item) }} />
                    }) : <p className="col-span-2 py-6 text-center text-xs text-slate-500">No matching room items.</p>}
                  </div>
                </div>
                {filteredItems.length > 0 && <div aria-hidden="true" className="pointer-events-none absolute -right-[10px] top-0 bottom-0 w-[5px] overflow-hidden rounded-full bg-slate-200"><div className="planner-room-items-thumb absolute left-0 right-0 rounded-full bg-orange-500" style={{ height: `${roomItemsScroll.overflow ? roomItemsScroll.thumbHeight : 28}%`, top: `${(100 - (roomItemsScroll.overflow ? roomItemsScroll.thumbHeight : 28)) * roomItemsScroll.progress / 100}%`, transform: roomItemsBounce ? 'scaleY(0.72)' : undefined, transformOrigin: roomItemsBounce < 0 ? 'bottom center' : 'top center' }} /></div>}
              </div>
              <p className="mt-2 text-[9px] leading-3 text-slate-500">Stored items stay in inventory and do not appear separately on the room canvas.</p>
            </aside>

            <section className="absolute inset-0 z-0 min-w-0 bg-transparent p-0">
              <div
                ref={viewportRef}
                role="region"
                aria-label="Interactive room layout canvas"
                onWheel={(event) => {
                  event.preventDefault()
                  const bounds = event.currentTarget.getBoundingClientRect()
                  changeZoom(event.deltaY < 0 ? 0.1 : -0.1, { x: event.clientX - bounds.left - bounds.width / 2, y: event.clientY - bounds.top - bounds.height / 2 })
                }}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                className={`room-preview-grid isolate absolute inset-0 min-h-0 touch-none select-none overflow-hidden border-0 bg-slate-50 ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
                style={{ backgroundSize: `${16 * view.zoom}px ${16 * view.zoom}px`, backgroundPosition: '0 0' }}
              >
                <p className="pointer-events-none absolute left-4 top-4 z-10 text-[10px] font-medium text-slate-500">Room preview</p>
                <p className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 text-xs font-semibold text-slate-900">{widthCm} × {depthCm} cm</p>
                <span className="pointer-events-none absolute right-4 top-4 z-10 text-[10px] font-medium text-slate-500">Top view</span>
                {rotationCursor && <span className="pointer-events-none absolute z-50 rounded-sm bg-slate-900 px-2 py-1 text-xs font-semibold text-white" style={{ left: rotationCursor.x + 12, top: rotationCursor.y + 12 }}>{Math.round(rotationCursor.degrees)}°</span>}

                <div className="absolute left-1/2 top-1/2 transition-transform duration-200" style={{ width: roomFrameWidth, height: roomFrameHeight, transform: `translate(calc(-50% + ${view.pan.x}px), calc(-50% + ${view.pan.y}px)) scale(${view.zoom})`, transformOrigin: 'center' }}>
                  <svg aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible" width={roomFrameWidth} height={roomFrameHeight} viewBox={`0 0 ${roomFrameWidth} ${roomFrameHeight}`}>
                    <defs>
                      <marker id="planner-width-start" markerWidth="7" markerHeight="7" viewBox="0 0 8 8" refX="0" refY="4" orient="auto"><path d="M 0 4 L 8 0 L 8 8 Z" fill="#f97316" /></marker>
                      <marker id="planner-width-end" markerWidth="7" markerHeight="7" viewBox="0 0 8 8" refX="8" refY="4" orient="auto"><path d="M 8 4 L 0 0 L 0 8 Z" fill="#f97316" /></marker>
                      <marker id="planner-depth-start" markerWidth="7" markerHeight="7" viewBox="0 0 8 8" refX="0" refY="4" orient="auto"><path d="M 0 4 L 8 0 L 8 8 Z" fill="#f97316" /></marker>
                      <marker id="planner-depth-end" markerWidth="7" markerHeight="7" viewBox="0 0 8 8" refX="8" refY="4" orient="auto"><path d="M 8 4 L 0 0 L 0 8 Z" fill="#f97316" /></marker>
                    </defs>
                    <line x1="38" y1="18" x2={38 + floorWidth} y2="18" stroke="#f97316" strokeWidth="1.5" markerStart="url(#planner-width-start)" markerEnd="url(#planner-width-end)" />
                    <line x1="38" y1="18" x2="38" y2="38" stroke="#f97316" strokeWidth="1.5" />
                    <line x1={38 + floorWidth} y1="18" x2={38 + floorWidth} y2="38" stroke="#f97316" strokeWidth="1.5" />
                    <line x1="18" y1="38" x2="18" y2={38 + floorHeight} stroke="#f97316" strokeWidth="1.5" markerStart="url(#planner-depth-start)" markerEnd="url(#planner-depth-end)" />
                    <line x1="18" y1="38" x2="38" y2="38" stroke="#f97316" strokeWidth="1.5" />
                    <line x1="18" y1={38 + floorHeight} x2="38" y2={38 + floorHeight} stroke="#f97316" strokeWidth="1.5" />
                  </svg>
                  <span className="absolute top-1 text-[10px] font-semibold text-orange-500" style={{ left: 38 + floorWidth / 2, transform: 'translateX(-50%)' }}>{widthCm} cm</span>
                  <span className="absolute text-[10px] font-semibold text-orange-500" style={{ left: 6, top: 38 + floorHeight / 2, transform: 'translate(-50%, -50%) rotate(-90deg)' }}>{depthCm} cm</span>

                  <div className="absolute bg-slate-200" style={{ left: 38, top: 38, width: floorWidth, height: floorHeight }}>
                    {rotationCursor && selectedShape && (
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute z-10 overflow-visible"
                        viewBox="0 0 100 100"
                        width={Math.max(selectedShape.width, selectedShape.depth) * baseScale + 44}
                        height={Math.max(selectedShape.width, selectedShape.depth) * baseScale + 44}
                        style={{
                          left: (selectedShape.x + selectedShape.width / 2) * baseScale,
                          top: (selectedShape.y + selectedShape.depth / 2) * baseScale,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <circle cx="50" cy="50" r="46" fill="none" stroke="#f97316" strokeWidth="1.5" strokeOpacity="0.8" />
                        {Array.from({ length: 8 }, (_, index) => (
                          <line
                            key={index}
                            x1="50"
                            y1="50"
                            x2="96"
                            y2="50"
                            stroke="#f97316"
                            strokeOpacity="0.7"
                            strokeWidth="1"
                            transform={`rotate(${index * 45} 50 50)`}
                          />
                        ))}
                      </svg>
                    )}
                    {layout.items.map((shape) => <PlannerObject key={shape.itemId} shape={shape} item={items.find((item) => item.id === shape.itemId)} isSelected={selectedId === shape.itemId} scale={baseScale} onPointerDown={(event) => startObjectDrag(event, shape.itemId)} onPointerMove={(event) => { moveObject(event); resizeObject(event); rotateObject(event) }} onPointerUp={endObjectInteraction} onResizePointerDown={(event, side) => startResize(event, shape.itemId, side)} onRotatePointerDown={(event) => startRotation(event, shape.itemId)} onSelect={() => setSelectedId(shape.itemId)} />)}
                    {person && <PlannerObject shape={person} isPerson isSelected={isSelectedPerson} scale={baseScale} onPointerDown={(event) => startObjectDrag(event, PERSON_ID)} onPointerMove={(event) => { moveObject(event); resizeObject(event); rotateObject(event) }} onPointerUp={endObjectInteraction} onResizePointerDown={() => {}} onRotatePointerDown={(event) => startRotation(event, PERSON_ID)} onSelect={() => setSelectedId(PERSON_ID)} />}
                  </div>

                  <div aria-hidden="true" className="pointer-events-none absolute z-10 border-[7px] border-solid" style={{ left: 31, top: 31, width: floorWidth + 14, height: floorHeight + 14, borderTopColor: hoveredWall === 'top' || selectedWall === 'top' ? '#f97316' : '#64748b', borderRightColor: hoveredWall === 'right' || selectedWall === 'right' ? '#f97316' : '#64748b', borderBottomColor: hoveredWall === 'bottom' || selectedWall === 'bottom' ? '#f97316' : '#64748b', borderLeftColor: hoveredWall === 'left' || selectedWall === 'left' ? '#f97316' : '#64748b' }} />
                  {[
                    { id: 'top', style: { left: 38, top: 31, width: floorWidth, height: 14 }, cursor: 'cursor-ns-resize' },
                    { id: 'right', style: { left: 38 + floorWidth - 7, top: 38, width: 14, height: floorHeight }, cursor: 'cursor-ew-resize' },
                    { id: 'bottom', style: { left: 38, top: 38 + floorHeight - 7, width: floorWidth, height: 14 }, cursor: 'cursor-ns-resize' },
                    { id: 'left', style: { left: 31, top: 38, width: 14, height: floorHeight }, cursor: 'cursor-ew-resize' },
                  ].map((wall) => <button key={wall.id} type="button" data-planner-wall aria-label={`Resize room from ${wall.id} wall`} aria-pressed={selectedWall === wall.id} onPointerDown={(event) => startWallDrag(event, wall.id)} onPointerMove={dragWall} onPointerUp={endWallDrag} onPointerCancel={endWallDrag} onMouseEnter={() => setHoveredWall(wall.id)} onMouseLeave={() => setHoveredWall(null)} onClick={() => setSelectedWall(wall.id)} className={`absolute z-20 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${wall.cursor}`} style={wall.style} />)}
                </div>

                <div className="absolute bottom-4 left-3 z-40 md:left-[304px]" onPointerDown={(event) => event.stopPropagation()}><Button variant="secondary" onClick={togglePerson} className="min-h-9 px-3 py-2 text-xs">{person ? 'Hide person' : '+ Add person'}</Button></div>
                <div className="absolute bottom-4 right-3 z-40 flex items-center gap-1" onPointerDown={(event) => event.stopPropagation()}>
                  <button type="button" aria-label="Zoom out" onClick={() => changeZoom(-0.1)} className="h-8 w-8 border border-slate-300 bg-white text-base font-semibold text-slate-700 hover:bg-slate-100">−</button>
                  <button type="button" aria-label="Reset view" onClick={resetView} className="h-8 min-w-12 border border-slate-300 bg-white px-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100">{Math.round(view.zoom * 100)}%</button>
                  <button type="button" aria-label="Zoom in" onClick={() => changeZoom(0.1)} className="h-8 w-8 border border-slate-300 bg-white text-base font-semibold text-slate-700 hover:bg-slate-100">+</button>
                </div>
              </div>
            </section>

            <aside className="planner-side-panel absolute bottom-16 right-4 z-30 max-h-[calc(50vh-6rem)] w-[300px] max-w-[calc(100vw-2rem)] overflow-y-auto border border-slate-300 p-4 md:bottom-auto md:top-24 md:max-h-[calc(100%-7rem)]">
              {isSelectedPerson ? (
                <div><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900">Person guide</h2><span className="text-xs text-slate-500">Temporary</span></div><p className="mt-3 text-xs leading-5 text-slate-600">A movable 50 × 30 cm reference guide. It is not included when you save the layout.</p><Button variant="tertiary" onClick={togglePerson} className="mt-4 min-h-9 px-0 py-2 text-xs text-slate-700">Hide person</Button></div>
              ) : selectedShape && selectedItem ? (
                <div>
                  <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">{selectedItem.name}</h2><p className="mt-1 text-xs text-slate-500">{selectedItem.category}</p></div><Button variant="tertiary" onClick={removeSelected} className={`min-h-8 px-2 py-1 text-xs ${isDarkMode ? 'text-red-600 hover:text-red-700' : '!text-red-600 hover:!text-red-700 focus-visible:!text-red-600 active:!text-red-700'}`}>Remove</Button></div>
                  <p className="mt-4 text-xs text-slate-600">Drag the shape, use its handles to resize it, or edit its approximate values below.</p>
                  <section className="mt-5 border-t border-slate-200 pt-4">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Size</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {[
                        ['width', 'Width (cm)'],
                        ['depth', 'Depth (cm)'],
                      ].map(([field, label]) => <label key={field} className="text-[10px] font-semibold text-slate-700">{label}<input type="number" min={1} step="0.1" value={selectedShape[field]} onFocus={startInspectorEdit} onBlur={finishInspectorEdit} onChange={(event) => updateInspectorField(field, event.target.value)} className="mt-1 min-h-9 w-full border border-slate-300 bg-white px-2 text-xs font-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" /></label>)}
                    </div>
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Position</h3>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {[
                          ['x', 'X (cm)'],
                          ['y', 'Y (cm)'],
                          ['rotation', 'Rotation (°)'],
                        ].map(([field, label]) => <label key={field} className="text-[10px] font-semibold text-slate-700">{label}<input type="number" min={field === 'rotation' ? 0 : 1} step="0.1" value={selectedShape[field]} onFocus={startInspectorEdit} onBlur={finishInspectorEdit} onChange={(event) => updateInspectorField(field, event.target.value)} className="mt-1 min-h-9 w-full border border-slate-300 bg-white px-2 text-xs font-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" /></label>)}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Appearance</h3>
                      <label className="mt-3 block text-[10px] font-semibold text-slate-700">Color<input type="color" value={selectedShape.color} onFocus={startInspectorEdit} onBlur={finishInspectorEdit} onChange={(event) => updateInspectorField('color', event.target.value)} className="mt-1 block h-9 w-full border border-slate-300 bg-white p-1" /></label>
                    </div>
                  </section>
                  {selectedItem.isStorageUnit && (
                    <section className="mt-5 border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Storage contents · {contents.length}</h3>
                        {storageScroll.overflow && <div className="flex gap-1">
                          <button type="button" aria-label="Scroll storage contents left" disabled={!storageScroll.canScrollLeft} onClick={() => scrollStorageContents(-1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-sm text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-500 disabled:cursor-default disabled:opacity-40"><span aria-hidden="true">←</span></button>
                          <button type="button" aria-label="Scroll storage contents right" disabled={!storageScroll.canScrollRight} onClick={() => scrollStorageContents(1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-sm text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-500 disabled:cursor-default disabled:opacity-40"><span aria-hidden="true">→</span></button>
                        </div>}
                      </div>
                      {contents.length ? (
                        <>
                        <div ref={storageRailRef} role="region" aria-label="Stored items" tabIndex={0} onWheel={handleStorageContentsWheel} className="storage-contents-rail mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500">
                          {contents.map((item) => <PlannerStorageItemCard key={item.id} item={item} photoRootRef={storageRailRef} onLoadPhoto={onLoadPhoto} />)}
                        </div>
                        {storageScroll.overflow && <div aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-orange-500 transition-all duration-150" style={{ width: `${storageScroll.thumbWidth}%`, marginLeft: `${(100 - storageScroll.thumbWidth) * storageScroll.progress / 100}%` }} /></div>}
                        </>
                      ) : <p className="mt-3 text-xs text-slate-500">No stored items.</p>}
                    </section>
                  )}
                </div>
              ) : (
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Room</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-600">Set the room dimensions here or drag a wall on the canvas.</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      ['widthCm', 'Width (cm)', minimumDimensions.width],
                      ['depthCm', 'Depth (cm)', minimumDimensions.depth],
                    ].map(([field, label, minimum]) => (
                      <label key={field} className="text-[10px] font-semibold text-slate-700">
                        {label}
                        <input
                          type="number"
                          min={minimum}
                          max={PLANNER_MAX_DIMENSION}
                          step="0.1"
                          value={field === 'widthCm' ? widthCm : depthCm}
                          onFocus={startInspectorEdit}
                          onBlur={finishInspectorEdit}
                          onChange={(event) => updateRoomDimension(field, event.target.value)}
                          className="mt-1 min-h-9 w-full border border-slate-300 bg-white px-2 text-xs font-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}

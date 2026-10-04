import { useEffect, useRef, useState } from 'react'
import openDoorIcon from '../../assets/open-door.png'

function getContrastingTextColor(color) {
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color || '')
  if (!match) return '#000000'
  const hex = match[1].length === 3 ? [...match[1]].map((digit) => `${digit}${digit}`).join('') : match[1]
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
  const luminance = channels.reduce((sum, channel, index) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    return sum + linear * [0.2126, 0.7152, 0.0722][index]
  }, 0)
  return 1.05 / (luminance + 0.05) > (luminance + 0.05) / 0.05 ? '#ffffff' : '#000000'
}

function formatLastUpdated(updatedAt, createdAt) {
  const isSaved = Boolean(updatedAt)
  const date = new Date(updatedAt || createdAt)
  if (Number.isNaN(date.getTime())) return 'Creation date unavailable'
  const formattedDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  return isSaved ? `Last updated ${formattedDate}` : `Created ${formattedDate}`
}

export default function RoomCard({
  room,
  layout,
  onEnter,
  onRename,
  onDelete,
}) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const optionsRef = useRef(null)
  const width = Number(layout?.widthCm ?? room.widthCm)
  const depth = Number(layout?.depthCm ?? room.depthCm)
  const widthCm = Number.isFinite(width) && width > 0 ? width : 300
  const depthCm = Number.isFinite(depth) && depth > 0 ? depth : 300
  const previewScale = Math.min(300 / widthCm, 132 / depthCm)
  const previewWidth = widthCm * previewScale
  const previewHeight = depthCm * previewScale
  const previewX = (360 - previewWidth) / 2
  const previewY = (200 - previewHeight) / 2 + 12
  const wallThickness = 7
  const placedItems = Array.isArray(layout?.items) ? layout.items : []

  useEffect(() => {
    if (!isOptionsOpen) return undefined

    function handleOutsideClick(event) {
      if (!optionsRef.current?.contains(event.target)) {
        setIsOptionsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [isOptionsOpen])

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onEnter?.(room)
    }
  }

  function handlePointerUp(event) {
    if (event.pointerType === 'touch' && !event.target.closest('button')) {
      onEnter?.(room)
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Double-click on desktop or tap on mobile to enter ${room.name}. ${placedItems.length} items saved in planner.`}
      onDoubleClick={() => onEnter?.(room)}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      title={`Double-click on desktop or tap on mobile to enter ${room.name}`}
      className="group relative select-none touch-manipulation rounded-sm border border-slate-300 bg-white transition-all hover:border-orange-500 hover:shadow-md focus-within:border-orange-500 focus-within:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <div className="room-preview-grid relative h-48 overflow-hidden rounded-t-sm bg-slate-50">
        <div className="absolute inset-x-3 top-2 z-[1] flex items-center justify-between gap-2 text-[10px] font-medium text-slate-500">
          <span className="uppercase tracking-wide">Room preview</span>
          <span>{widthCm} × {depthCm} cm</span>
        </div>

        <svg
          viewBox="0 0 360 200"
          role="img"
          aria-label={`Top-down room preview, ${widthCm} by ${depthCm} centimeters`}
          className="h-full w-full"
        >
          <rect
            x={previewX - wallThickness / 2}
            y={previewY - wallThickness / 2}
            width={previewWidth + wallThickness}
            height={previewHeight + wallThickness}
            className="room-card-preview-shape"
            strokeWidth={wallThickness}
            vectorEffect="non-scaling-stroke"
          />
          {placedItems.map((item) => {
            const itemWidth = Number(item.width) * previewScale - 1.5
            const itemHeight = Number(item.depth) * previewScale - 1.5
            const itemX = previewX + (Number(item.x) + Number(item.width) / 2) * previewScale
            const itemY = previewY + (Number(item.y) + Number(item.depth) / 2) * previewScale
            if (![itemWidth, itemHeight, itemX, itemY].every(Number.isFinite) || itemWidth <= 0 || itemHeight <= 0) return null

            const fontSize = Math.max(5, Math.min(9, itemWidth * 0.24, itemHeight * 0.42))
            const maxCharacters = Math.floor(Math.max(0, itemWidth - 4) / (fontSize * 0.58))
            const itemName = item.name || 'Item'
            const label = maxCharacters >= 4 && itemName.length > maxCharacters
              ? `${itemName.slice(0, maxCharacters - 1)}…`
              : maxCharacters >= 4 ? itemName : ''

            return (
              <g
                key={item.itemId}
                transform={`translate(${itemX} ${itemY}) rotate(${Number(item.rotation) || 0})`}
              >
                <rect
                  x={-itemWidth / 2}
                  y={-itemHeight / 2}
                  width={itemWidth}
                  height={itemHeight}
                  rx="1"
                  fill={item.color || '#1d1b31'}
                  stroke="#64748b"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                {label && (
                  <text
                    x="0"
                    y="0"
                    fill={getContrastingTextColor(item.color || '#1d1b31')}
                    fontSize={fontSize}
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="central"
                    pointerEvents="none"
                  >
                    {label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-orange-500/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <img
            src={openDoorIcon}
            alt=""
            className="h-11 w-11 object-contain brightness-0 invert"
          />
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-4 rounded-b-sm px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900">
              {room.name}
            </h3>
            <span aria-hidden="true" className="shrink-0 text-xs text-slate-400">|</span>

            <p className="shrink-0 whitespace-nowrap text-xs text-slate-500">
              {room.itemCount} {room.itemCount === 1 ? 'item' : 'items'}{' '}
              <span aria-hidden="true">·</span>{' '}
              {room.storageCount} storage
            </p>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            {!layout
              ? 'Loading planner preview…'
              : layout.previewUnavailable
                ? 'Planner preview unavailable'
                : formatLastUpdated(layout.updatedAt, room.createdAt)}
          </p>
        </div>

        <div ref={optionsRef} className="relative -mr-2">
          <button
            type="button"
            aria-label={`More options for ${room.name}`}
            aria-haspopup="menu"
            aria-expanded={isOptionsOpen}
            onClick={(event) => {
              event.stopPropagation()
              setIsOptionsOpen((open) => !open)
            }}
            onDoubleClick={(event) => event.stopPropagation()}
            className="inline-flex h-8 min-w-14 items-center justify-center rounded-full text-xl leading-none text-slate-600 transition-colors hover:bg-slate-200 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">⋯</span>
          </button>

          {isOptionsOpen && (
            <div
              role="menu"
              aria-label={`${room.name} options`}
              className="night-dropdown-menu absolute bottom-10 left-1/2 z-20 w-36 -translate-x-1/2 rounded-md border border-slate-300 bg-white p-1.5 shadow-lg"
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation()
                  setIsOptionsOpen(false)
                  onRename?.(room)
                }}
                className="flex min-h-9 w-full items-center justify-center gap-2 rounded-sm px-3 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
                Rename room
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation()
                  setIsOptionsOpen(false)
                  onDelete?.(room)
                }}
                className="flex min-h-9 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-transparent px-3 text-center text-xs font-medium text-red-600 transition-colors hover:bg-slate-100 hover:text-red-600 focus-visible:bg-slate-100 focus-visible:text-red-600 focus-visible:outline-none active:bg-slate-200 active:text-red-600"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="m19 6-1 14H6L5 6" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
                Delete room
              </button>
            </div>
          )}
        </div>
      </div>

    </article>
  )
}

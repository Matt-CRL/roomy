import { useEffect, useRef, useState } from 'react'
import openDoorIcon from '../../assets/open-door.png'

export default function RoomCard({
  room,
  onEnter,
  onRename,
  onDelete,
}) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const optionsRef = useRef(null)

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

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Double-click to enter ${room.name}`}
      onDoubleClick={() => onEnter?.(room)}
      onKeyDown={handleKeyDown}
      title={`Double-click to enter ${room.name}`}
      className="group relative select-none rounded-sm border border-slate-300 bg-white transition-all hover:border-orange-500 hover:shadow-md focus-within:border-orange-500 focus-within:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <div className="relative h-28 overflow-hidden rounded-t-sm bg-slate-200">
        {room.imageUrl && (
          <img
            src={room.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-orange-500/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <img
            src={openDoorIcon}
            alt=""
            className="h-11 w-11 object-contain brightness-0 invert"
          />
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-4 rounded-b-sm px-3 py-2.5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {room.name}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {room.itemCount} {room.itemCount === 1 ? 'item' : 'items'}{' '}
            <span aria-hidden="true">·</span>{' '}
            {room.storageCount}{' '}
            {room.storageCount === 1 ? 'storage' : 'storage'}
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
                className="flex min-h-9 w-full items-center justify-center gap-2 rounded-sm border border-transparent bg-transparent px-3 text-center text-xs font-medium text-red-600 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:bg-slate-100 focus-visible:text-slate-700 focus-visible:outline-none active:bg-slate-200 active:text-slate-700"
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

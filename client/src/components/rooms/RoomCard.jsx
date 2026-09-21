import openDoorIcon from '../../assets/open-door.png'

export default function RoomCard({
  room,
  onEnter,
  onOptions,
}) {
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
      aria-label={`Enter ${room.name}`}
      onClick={() => onEnter?.(room)}
      onKeyDown={handleKeyDown}
      className="group relative overflow-hidden rounded-sm border border-slate-300 bg-white transition-all hover:border-orange-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <div className="relative h-28 bg-slate-200">
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

      <div className="flex items-end justify-between gap-4 px-3 py-2.5">
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

        <button
          type="button"
          aria-label={`More options for ${room.name}`}
          onClick={(event) => {
            event.stopPropagation()
            onOptions?.(room)
          }}
          className="-mr-2 inline-flex h-8 min-w-14 items-center justify-center rounded-full text-xl leading-none text-slate-600 transition-colors hover:bg-slate-200 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">⋯</span>
        </button>
      </div>

    </article>
  )
}

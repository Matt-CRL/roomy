const shapeStyles = {
  portrait: 'h-16 w-10',
  landscape: 'h-10 w-24',
  square: 'h-14 w-14',
  wide: 'h-8 w-20',
}

export default function InventoryItemCard({
  item,
  onSelect,
  onOptions,
  viewMode = 'grid',
}) {
  const shapeClass = shapeStyles[item.shape] ?? shapeStyles.square
  const itemStatus = item.isStorageUnit
    ? `${item.storedCount} inside`
    : item.storedInside
      ? 'Stored'
      : 'Unstored'

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(item)
    }
  }

  if (viewMode === 'list') {
    return (
      <article
        role="button"
        tabIndex={0}
        aria-label={`View ${item.name}`}
        onClick={() => onSelect?.(item)}
        onKeyDown={handleKeyDown}
        className="group flex min-h-16 items-center justify-between gap-4 border border-slate-300 bg-white px-4 py-2 transition-all hover:border-orange-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        <div className="min-w-0">
          <h3 className="truncate text-xs font-semibold leading-tight text-slate-900">
            {item.name}
          </h3>

          <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-500">
            {item.category}
          </p>
        </div>

        <div className="flex shrink-0 items-end gap-3">
          <span className="border border-slate-300 px-2 py-1 text-[10px] text-slate-700">
            {itemStatus}
          </span>

          <button
            type="button"
            aria-label={`More options for ${item.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onOptions?.(item)
            }}
            className="inline-flex h-8 min-w-14 items-center justify-center rounded-full text-lg leading-none text-slate-600 transition-colors hover:bg-slate-200 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">⋯</span>
          </button>
        </div>
      </article>
    )
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`View ${item.name}`}
      onClick={() => onSelect?.(item)}
      onKeyDown={handleKeyDown}
      className="group overflow-hidden border border-slate-300 bg-white transition-all hover:border-orange-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <div className="relative flex h-28 items-center justify-center border-b border-slate-300 bg-slate-200">
        <div
          aria-hidden="true"
          className={`border border-slate-500 bg-slate-200 ${shapeClass}`}
        />

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

          <button
            type="button"
            aria-label={`More options for ${item.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onOptions?.(item)
            }}
            className="-mr-2 inline-flex h-8 min-w-14 items-center justify-center rounded-full text-lg leading-none text-slate-600 transition-colors hover:bg-slate-200 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <span aria-hidden="true">⋯</span>
          </button>
        </div>
      </div>
    </article>
  )
}

function SummaryIcon({ type }) {
  if (type === 'rooms') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M8 20V9h8v11M11 13h2" />
      </svg>
    )
  }

  if (type === 'items') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <path d="m4 8 8-4 8 4-8 4-8-4Z" />
        <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <path d="M4 7h16v13H4zM4 7l2-3h12l2 3M8 11h8" />
    </svg>
  )
}

export default function RoomsSummary({ rooms, loading = false }) {
  const totalItems = rooms.reduce((total, room) => total + room.itemCount, 0)
  const totalStorage = rooms.reduce(
    (total, room) => total + room.storageCount,
    0,
  )

  const summaryItems = [
    {
      label: 'Rooms',
      value: rooms.length,
      detail: 'Your rooms',
      icon: 'rooms',
    },
    {
      label: 'Items',
      value: totalItems,
      detail: 'Across all rooms',
      icon: 'items',
    },
    {
      label: 'Storage units',
      value: totalStorage,
      detail: 'Across all rooms',
      icon: 'storage',
      compactLabel: 'Storage',
    },
  ]

  return (
    <section
      aria-label="Rooms summary"
      className="mb-6 grid grid-cols-3 gap-2 sm:mb-10 sm:gap-4"
    >
      {summaryItems.map((item) => (
        <article
          key={item.label}
          className="min-h-[4.5rem] min-w-0 border border-slate-300 bg-white p-2 sm:min-h-24 sm:p-4"
        >
          <p className="flex min-w-0 items-center gap-1 text-[8px] font-semibold uppercase leading-tight tracking-wide text-slate-600 sm:gap-1.5 sm:text-[10px]">
            <SummaryIcon type={item.icon} />
            <span aria-hidden="true" className="truncate sm:hidden">{item.compactLabel ?? item.label}</span>
            <span aria-hidden="true" className="hidden truncate sm:inline">{item.label}</span>
            <span className="sr-only">{item.label}</span>
          </p>

          <div className="mt-2 flex min-w-0 items-end justify-between gap-1 sm:mt-3 sm:gap-4">
            <p className="text-xl font-bold leading-none text-slate-900 sm:text-2xl">
              {loading ? (
                <span className="inline-block h-7 w-10 animate-pulse bg-slate-200" aria-label="Loading" />
              ) : item.value}
            </p>

            <p className="hidden text-right text-[10px] text-slate-500 sm:block">
              {item.detail}
            </p>
          </div>
        </article>
      ))}
    </section>
  )
}

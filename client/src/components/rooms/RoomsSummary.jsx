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

export default function RoomsSummary({ rooms }) {
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
    },
  ]

  return (
    <section
      aria-label="Rooms summary"
      className="mb-10 grid gap-4 md:grid-cols-3"
    >
      {summaryItems.map((item) => (
        <article
          key={item.label}
          className="min-h-24 border border-slate-300 bg-white p-4"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            <SummaryIcon type={item.icon} />
            {item.label}
          </p>

          <div className="mt-3 flex items-end justify-between gap-4">
            <p className="text-2xl font-bold leading-none text-slate-900">
              {item.value}
            </p>

            <p className="text-right text-[10px] text-slate-500">
              {item.detail}
            </p>
          </div>
        </article>
      ))}
    </section>
  )
}

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
    },
    {
      label: 'Items',
      value: totalItems,
      detail: 'Across all rooms',
    },
    {
      label: 'Storage units',
      value: totalStorage,
      detail: 'Across all rooms',
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
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
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

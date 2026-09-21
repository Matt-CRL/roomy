export default function AddItemCard({ onClick, compact = false }) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-16 w-full items-center justify-center gap-3 border border-dashed border-slate-300 bg-white px-4 text-center transition-colors hover:border-orange-400 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        <span aria-hidden="true" className="text-2xl font-light leading-none text-slate-900">
          +
        </span>
        <span className="text-sm font-semibold text-slate-900">
          Add another item
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[214px] w-full flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-4 text-center transition-colors hover:border-orange-400 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className="text-2xl font-light leading-none text-slate-900"
      >
        +
      </span>

      <span className="mt-4 text-sm font-semibold text-slate-900">
        Add another item
      </span>

      <span className="mt-2 text-xs text-slate-500">
        Add it now, organize it later
      </span>
    </button>
  )
}

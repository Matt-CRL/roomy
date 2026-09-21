export default function AddRoomCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[180px] w-full flex-col items-center justify-center border border-dashed border-slate-300 bg-white px-4 text-center transition-colors hover:border-orange-400 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className="text-2xl font-light leading-none text-slate-900"
      >
        +
      </span>

      <span className="mt-4 text-sm font-semibold text-slate-900">
        Add another room
      </span>

      <span className="mt-2 text-xs text-slate-500">
        Name it now, plan it later
      </span>
    </button>
  )
}

export default function AppNavbar() {
  return (
    <nav
      aria-label="Main navigation"
      className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4"
    >
      <span className="text-2xl font-bold tracking-tight text-orange-500">
        Roomy
      </span>

      <button
        type="button"
        aria-label="Open user menu for ML"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      >
        ML
      </button>
    </nav>
  )
}

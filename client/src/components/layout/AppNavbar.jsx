export default function AppNavbar({ onSignOut, displayName = 'User' }) {
  const displayLabel = String(displayName || 'User').trim() || 'User'

  return (
    <nav
      aria-label="Main navigation"
      className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4"
    >
      <span className="text-2xl font-bold tracking-tight text-orange-500">
        Roomy
      </span>

      <div className="flex items-center gap-2">
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex min-h-10 items-center justify-center rounded-sm border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            Sign out
          </button>
        )}
        <button
          type="button"
          aria-label={`Open user menu for ${displayLabel}`}
          title={displayLabel}
          className="inline-flex min-h-10 min-w-10 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-orange-500 hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          {displayLabel}
        </button>
      </div>
    </nav>
  )
}

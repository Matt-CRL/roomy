export default function CompactThemeButton({ isDarkMode, onToggle, className = '' }) {
  const label = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={Boolean(isDarkMode)}
      title={label}
      onClick={onToggle}
      data-theme-toggle="true"
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${isDarkMode ? 'border-slate-700 bg-[#19182c] text-slate-100 hover:bg-[#24223a]' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'} ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        {isDarkMode ? (
          <>
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        ) : (
          <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z" />
        )}
      </svg>
    </button>
  )
}

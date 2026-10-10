export default function LocationTrail({ location = [], className = '' }) {
  if (!location.length) return null

  return (
    <div className={`flex min-w-0 items-center gap-1 ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-orange-500 sm:h-5 sm:w-5">
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      <nav aria-label="Current location" className="flex min-w-0 items-center gap-1 overflow-hidden text-[10px] leading-4 sm:gap-1.5 sm:text-sm">
        {location.map((part, index) => (
          <span key={`${part.label}-${index}`} className="inline-flex min-w-0 items-center gap-1 sm:gap-1.5">
            {index > 0 && <span aria-hidden="true" className="shrink-0 text-slate-400">/</span>}
            {part.onClick ? (
              <button type="button" onClick={part.onClick} className="max-w-[20vw] truncate whitespace-nowrap font-medium text-slate-500 transition-colors hover:text-orange-500 sm:max-w-[180px]">
                {part.label}
              </button>
            ) : (
              <span aria-current={index === location.length - 1 ? 'page' : undefined} className="max-w-[24vw] truncate whitespace-nowrap font-semibold text-orange-500 sm:max-w-[220px]">
                {part.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </div>
  )
}

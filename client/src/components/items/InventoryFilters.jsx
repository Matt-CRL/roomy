import { useEffect, useRef, useState } from 'react'
import { categoryGroups } from '../../data/categoryOptions'

const itemTypes = [
  ['all', 'All items'],
  ['item', 'Regular items'],
  ['storage', 'Storage units'],
]

function TypeOptions({ value, onChange, name, onSelect }) {
  return itemTypes.map(([type, label]) => (
    <label
      key={type}
      className="roomy-dropdown-option flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 text-xs text-slate-700"
    >
      <input
        type="radio"
        name={name}
        className="h-4 w-4 accent-orange-500"
        checked={value.type === type}
        onChange={() => {
          onChange({ ...value, type })
          onSelect?.()
        }}
      />
      {label}
    </label>
  ))
}

function CategoryOptions({ value, onChange }) {
  return categoryGroups.map((group) => (
    <fieldset key={group.label} className="border-t border-slate-200 py-2 first:border-t-0">
      <legend className="px-2 text-[10px] font-semibold text-slate-500">{group.label}</legend>
      <div className="mt-1">
        {group.categories.map((category) => (
          <label
            key={`${group.label}-${category}`}
            className="roomy-dropdown-option flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 text-xs text-slate-700"
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-orange-500"
              checked={value.categories.includes(category)}
              onChange={() => onChange({
                ...value,
                categories: value.categories.includes(category)
                  ? value.categories.filter((entry) => entry !== category)
                  : [...value.categories, category],
              })}
            />
            {category}
          </label>
        ))}
      </div>
    </fieldset>
  ))
}

function FilterFields({ value, onChange }) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Item type</legend>
        <div className="mt-1 grid gap-1 sm:grid-cols-3">
          <TypeOptions value={value} onChange={onChange} name="mobile-item-type" />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Categories</legend>
        <div className="roomy-dropdown-scrollbar mt-1 grid max-h-64 gap-x-4 overflow-y-auto border border-slate-200 p-2 sm:grid-cols-2">
          <CategoryOptions value={value} onChange={onChange} />
        </div>
      </fieldset>
    </div>
  )
}

function ActiveFilterChips({ value, onChange, horizontalScroll = false }) {
  const chips = [
    ...(value.type === 'all' ? [] : [{ key: 'type', kind: 'type', label: value.type === 'item' ? 'Regular items' : 'Storage units' }]),
    ...value.categories.map((category) => ({ key: `category-${category}`, kind: 'category', label: category })),
  ]

  if (chips.length === 0) return null

  return (
    <div
      aria-label="Active inventory filters"
      className={`flex gap-2 ${horizontalScroll ? 'max-w-full overflow-x-auto pb-1' : 'flex-wrap'}`}
    >
      {chips.map(({ key, kind, label }) => (
        <button
          key={key}
          type="button"
          aria-label={`Remove ${label} filter`}
          onClick={() => {
            if (kind === 'type') {
              onChange({ ...value, type: 'all' })
            } else {
              onChange({ ...value, categories: value.categories.filter((entry) => entry !== label) })
            }
          }}
          className="inventory-filter-chip inline-flex min-h-8 shrink-0 items-center gap-1 border px-2 text-[11px] font-medium"
        >
          {label}<span aria-hidden="true">×</span>
        </button>
      ))}
    </div>
  )
}

export default function InventoryFilters({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const triggerRef = useRef(null)
  const sheetRef = useRef(null)
  const closeButtonRef = useRef(null)
  const desktopFiltersRef = useRef(null)
  const typeTriggerRef = useRef(null)
  const categoryTriggerRef = useRef(null)
  const activeCount = value.categories.length + (value.type === 'all' ? 0 : 1)
  const typeLabel = itemTypes.find(([type]) => type === value.type)?.[1] ?? 'All items'

  useEffect(() => {
    if (!isOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        window.requestAnimationFrame(() => triggerRef.current?.focus())
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(sheetRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled])') ?? [])]
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    function handleResize() {
      if (window.matchMedia('(min-width: 1024px)').matches) setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  useEffect(() => {
    if (!openMenu) return undefined

    function handlePointerDown(event) {
      if (!desktopFiltersRef.current?.contains(event.target)) setOpenMenu(null)
    }
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      const trigger = openMenu === 'type' ? typeTriggerRef.current : categoryTriggerRef.current
      setOpenMenu(null)
      window.requestAnimationFrame(() => trigger?.focus())
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenu])

  function closeSheet() {
    setIsOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  function clearFilters() {
    onChange({ type: 'all', categories: [] })
    setOpenMenu(null)
  }

  function toggleMenu(menu) {
    setOpenMenu((current) => current === menu ? null : menu)
  }

  function closeTypeMenu() {
    setOpenMenu(null)
    window.requestAnimationFrame(() => typeTriggerRef.current?.focus())
  }

  return (
    <>
      <div className="min-w-0 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls="inventory-filter-sheet"
            onClick={() => setIsOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 6h16M7 12h10m-7 6h4" /><circle cx="8" cy="6" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" /></svg>
            Filters
            {activeCount > 0 && <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] text-white">{activeCount}</span>}
          </button>
          <p className="min-w-0 flex-1 truncate text-xs text-slate-500" aria-live="polite">
            {activeCount === 0 ? 'All items' : `${activeCount} filter${activeCount === 1 ? '' : 's'} selected`}
          </p>
          {activeCount > 0 && <button type="button" onClick={clearFilters} className="min-h-10 shrink-0 px-2 text-xs font-semibold text-orange-600 underline underline-offset-2">Clear</button>}
        </div>
        <div className="mt-2">
          <ActiveFilterChips value={value} onChange={onChange} horizontalScroll />
        </div>
      </div>

      <div ref={desktopFiltersRef} className="relative hidden min-w-0 lg:block">
        <div className="flex min-h-11 items-center gap-2">
          <div className="relative">
            <button
              ref={typeTriggerRef}
              type="button"
              aria-expanded={openMenu === 'type'}
              aria-controls="inventory-type-options"
              onClick={() => toggleMenu('type')}
              className={`roomy-dropdown-trigger night-form-control inline-flex min-h-11 items-center gap-2 border bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:border-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${value.type !== 'all' ? 'border-orange-400' : 'border-slate-300'}`}
            >
              <span>{typeLabel}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${openMenu === 'type' ? 'rotate-180' : ''}`}><path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
            </button>
            {openMenu === 'type' && (
              <div id="inventory-type-options" role="group" aria-label="Filter by item type" className="night-dropdown-menu roomy-dropdown-scrollbar absolute left-0 top-full z-50 mt-2 w-52 border border-slate-300 bg-white p-2 shadow-xl">
                <TypeOptions value={value} onChange={onChange} name="desktop-item-type" onSelect={closeTypeMenu} />
              </div>
            )}
          </div>

          <div className="relative">
            <button
              ref={categoryTriggerRef}
              type="button"
              aria-expanded={openMenu === 'categories'}
              aria-controls="inventory-category-options"
              onClick={() => toggleMenu('categories')}
              className={`roomy-dropdown-trigger night-form-control inline-flex min-h-11 items-center gap-2 border bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:border-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${value.categories.length > 0 ? 'border-orange-400' : 'border-slate-300'}`}
            >
              <span>Category{value.categories.length > 0 ? ` (${value.categories.length})` : ''}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${openMenu === 'categories' ? 'rotate-180' : ''}`}><path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
            </button>
            {openMenu === 'categories' && (
              <div id="inventory-category-options" role="group" aria-label="Filter by category" className="night-dropdown-menu roomy-dropdown-scrollbar absolute right-0 top-full z-50 mt-2 max-h-[min(26rem,70vh)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto border border-slate-300 bg-white p-2 shadow-xl">
                <CategoryOptions value={value} onChange={onChange} />
              </div>
            )}
          </div>

          {activeCount > 0 && (
            <button type="button" onClick={clearFilters} className="min-h-10 shrink-0 px-2 text-xs font-semibold text-orange-600 underline underline-offset-2">
              Clear
            </button>
          )}
        </div>
        <div className="mt-2">
          <ActiveFilterChips value={value} onChange={onChange} />
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[75] flex items-end bg-slate-950/50 sm:items-center sm:justify-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSheet() }}>
          <section
            ref={sheetRef}
            id="inventory-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-filter-title"
            className="max-h-[82dvh] w-full overflow-y-auto overscroll-contain border border-slate-300 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-xl sm:p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="inventory-filter-title" className="text-base font-semibold text-slate-900">Filter inventory</h2>
              <button ref={closeButtonRef} type="button" aria-label="Close filters" onClick={closeSheet} className="min-h-10 min-w-10 rounded-full text-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">×</button>
            </div>
            <FilterFields value={value} onChange={onChange} />
            <div className="sticky bottom-[-1rem] mt-4 flex gap-2 border-t border-slate-200 bg-white py-3">
              <button type="button" onClick={clearFilters} className="min-h-11 flex-1 border border-slate-300 px-3 text-sm font-semibold text-slate-700">Clear all</button>
              <button type="button" onClick={closeSheet} className="min-h-11 flex-1 bg-orange-500 px-3 text-sm font-semibold text-white hover:bg-orange-600">Show results</button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

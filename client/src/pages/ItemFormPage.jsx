import { useEffect, useRef, useState } from 'react'
import Button from '../components/common/Button'
import AppNavbar from '../components/layout/AppNavbar'

const ITEM_NAME_MAX_LENGTH = 80
const ITEM_NOTES_MAX_LENGTH = 500

const categoryGroups = [
  {
    label: 'Bedroom',
    categories: ['Furniture', 'Bedding', 'Clothing', 'Personal items', 'Books & media'],
  },
  {
    label: 'Living room',
    categories: ['Furniture', 'Electronics', 'Decor', 'Books & media', 'Storage'],
  },
  {
    label: 'Kitchen',
    categories: ['Appliances', 'Cookware', 'Dinnerware', 'Utensils', 'Food storage'],
  },
  {
    label: 'Bathroom',
    categories: ['Toiletries', 'Towels', 'Personal care', 'Bathroom storage', 'Cleaning supplies'],
  },
  {
    label: 'General',
    categories: ['Documents', 'Tools', 'Cables', 'Miscellaneous'],
  },
]

function FormDropdown({
  value,
  onChange,
  options = [],
  groups,
  ariaLabel,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const optionGroups = groups ?? [{ label: null, categories: options }]

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div ref={dropdownRef} className="relative mt-2">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        className={`night-form-control flex min-h-11 w-full items-center justify-between border border-slate-300 px-3 text-left text-xs font-normal outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 ${
          disabled
            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
            : 'bg-white text-slate-900'
        }`}
      >
        <span>{value}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 transition-transform ${
            disabled ? 'text-slate-300' : 'text-slate-500'
          } ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="night-dropdown-menu absolute left-0 top-full z-30 mt-1 max-h-64 w-full overflow-y-auto border border-slate-300 bg-white py-1 shadow-lg"
        >
          {optionGroups.map((group) => (
            <div key={group.label ?? 'options'}>
              {group.label && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {group.label}
                </p>
              )}

              {group.categories.map((option) => (
                <button
                  key={`${group.label ?? 'options'}-${option}`}
                  type="button"
                  role="option"
                  aria-selected={value === option}
                  onClick={() => {
                    onChange(option)
                    setIsOpen(false)
                  }}
                  className="block min-h-9 w-full px-3 text-left text-xs text-slate-700 transition-colors hover:bg-orange-50 hover:text-orange-600 focus-visible:bg-orange-50 focus-visible:outline-none"
                >
                  {option}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ItemFormPage({
  room,
  item,
  onCancel,
  onSave,
  onBackToRooms,
  onBackToInventory,
  rooms = [],
  onDeleteItem,
  onMoveItem,
}) {
  const roomName = room?.name ?? 'Bedroom 1'
  const isEditMode = Boolean(item)
  const otherRoomOptions = rooms
    .filter((roomOption) => roomOption.id !== room?.id)
    .map((roomOption) => roomOption.name)

  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'Furniture',
    storedInside: item?.storedInside ?? 'Not stored',
    notes: item?.notes ?? '',
    width: item?.width > 0 ? item.width : '',
    depth: item?.depth > 0 ? item.depth : '',
    isStorageUnit: item?.isStorageUnit ?? false,
  })
  const [moveToRoom, setMoveToRoom] = useState(otherRoomOptions[0] ?? '')

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.name.trim()) return

    onSave?.({ ...form, room: roomName, roomId: room?.id })
  }

  function handleMoveItem() {
    onMoveItem?.(item?.id, moveToRoom)
  }

  function handleDeleteItem() {
    if (window.confirm(`Delete ${item?.name ?? 'this item'} permanently?`)) {
      onDeleteItem?.(item?.id)
    }
  }

  function handleDimensionChange(field, value) {
    if (value === '') {
      updateField(field, '')
      return
    }

    const numericValue = Number(value)
    updateField(
      field,
      String(Number.isFinite(numericValue) ? Math.max(1, numericValue) : 1),
    )
  }

  const widthInCm = Number(form.width) > 0 ? Number(form.width) : 120
  const depthInCm = Number(form.depth) > 0 ? Number(form.depth) : 55
  const previewScale = Math.min(180 / widthInCm, 120 / depthInCm)
  const previewWidth = Math.max(48, Math.round(widthInCm * previewScale))
  const previewHeight = Math.max(40, Math.round(depthInCm * previewScale))

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-screen-2xl">
        <AppNavbar />

        <header className="flex flex-col gap-5 pt-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-3xl font-bold text-slate-900">
                {isEditMode ? 'Edit item' : 'Add item'}
              </h1>

              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-base text-slate-500"
              >
                <button
                  type="button"
                  onClick={onBackToRooms}
                  className="transition-colors hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  Rooms
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={onBackToInventory}
                  className="text-slate-500 transition-colors hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  {roomName}
                </button>
                <span aria-hidden="true">/</span>
                <span className="font-semibold text-orange-500">
                  {form.name || 'Item name'}
                </span>
              </nav>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              {isEditMode
                ? 'Update details, location, storage behavior, or planner visibility.'
                : 'Add details, location, storage behavior, and planner visibility.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" type="button" onClick={onCancel}>
              Cancel
            </Button>

            <Button variant="primary" type="submit" form="item-form">
              Save
            </Button>
          </div>
        </header>

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
          <form
            id="item-form"
            onSubmit={handleSubmit}
            className="border border-slate-300 bg-white p-5"
          >
            <label className="block text-xs font-semibold text-slate-900">
              Item photo
              <button
                type="button"
                className="night-secondary-surface mt-2 flex min-h-28 w-full flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-900 transition-colors hover:border-orange-400 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                <span className="font-semibold">+ Add optional reference photo</span>
                <span className="mt-2 text-[10px] font-normal text-slate-500">
                  Used in inventory only
                </span>
              </button>
            </label>

            <label className="mt-5 block text-xs font-semibold text-slate-900">
              Item name
              <input
                required
                maxLength={ITEM_NAME_MAX_LENGTH}
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Item name"
                className="mt-2 min-h-11 w-full border border-slate-300 px-3 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-900">
                Category
                <FormDropdown
                  value={form.category}
                  onChange={(category) => updateField('category', category)}
                  groups={categoryGroups}
                  ariaLabel="Item category"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-900">
                Storage settings
                <span className="night-form-control mt-2 flex min-h-11 items-center gap-2 border border-slate-300 px-3 text-xs font-normal text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isStorageUnit}
                    onChange={(event) => {
                      const isStorageUnit = event.target.checked
                      setForm((currentForm) => ({
                        ...currentForm,
                        isStorageUnit,
                        ...(isStorageUnit ? { storedInside: 'Not stored' } : {}),
                      }))
                    }}
                    className="h-3 w-3 accent-orange-500"
                  />
                  This item is a storage unit
                </span>
              </label>
            </div>

            {!form.isStorageUnit && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-900">
                  Stored inside
                  <FormDropdown
                    value={form.storedInside}
                    onChange={(storedInside) => updateField('storedInside', storedInside)}
                    options={['Not stored', 'Wardrobe', 'Bedside drawer', 'Under-bed box']}
                    ariaLabel="Stored inside"
                  />
                </label>
              </div>
            )}

            <label className="mt-4 block text-xs font-semibold text-slate-900">
              <span className="flex items-center justify-between gap-3">
                <span>Notes</span>
                <span className="text-[10px] font-normal text-slate-500">
                  {form.notes.length}/{ITEM_NOTES_MAX_LENGTH}
                </span>
              </span>
              <textarea
                maxLength={ITEM_NOTES_MAX_LENGTH}
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="Add notes about this item"
                rows="3"
                className="mt-2 w-full resize-y border border-slate-300 px-3 py-3 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </label>

            <fieldset className="mt-5 border-t border-slate-200 pt-4">
              <legend className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Planner settings
              </legend>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-900">
                  Width (cm)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.width}
                    onChange={(event) =>
                      handleDimensionChange('width', event.target.value)
                    }
                    placeholder="120"
                    className="mt-2 min-h-11 w-full border border-slate-300 px-3 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-900">
                  Depth (cm)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.depth}
                    onChange={(event) =>
                      handleDimensionChange('depth', event.target.value)
                    }
                    placeholder="55"
                    className="mt-2 min-h-11 w-full border border-slate-300 px-3 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </label>

              </div>

              <p className="mt-3 text-[10px] text-slate-500">
                Approximate values only; no exact real-world scale.
              </p>
            </fieldset>
          </form>

          <aside className="space-y-5">
            <section className="border border-slate-300 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Planner preview
              </h2>

              <div className="night-secondary-surface mt-4 flex min-h-40 items-center justify-center border border-slate-200 bg-slate-50">
                <div
                  style={{ width: `${previewWidth}px`, height: `${previewHeight}px` }}
                  className="flex items-center justify-center border border-slate-500 bg-slate-200 px-2 text-center text-xs font-semibold text-slate-900 transition-all duration-200"
                >
                  {form.name || 'Item name'}
                </div>
              </div>

              <p className="mt-4 text-[10px] text-slate-500">
                Simple labelled top-down shape
              </p>
            </section>

            {isEditMode && (
              <div className="grid gap-5 sm:grid-cols-2">
                <section className="flex flex-col border border-slate-300 bg-white p-5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Move item
                  </h2>

                  <p className="mt-2 text-xs text-slate-600">
                    Choose another room for this item.
                  </p>

                  <label className="mt-4 block text-xs font-semibold text-slate-900">
                    Move to
                    <FormDropdown
                      value={moveToRoom}
                      onChange={setMoveToRoom}
                      options={otherRoomOptions}
                      ariaLabel="Move item to another room"
                      disabled={otherRoomOptions.length === 0}
                    />
                  </label>

                  <div className="mt-auto pt-5">
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleMoveItem}
                    >
                      Move item
                    </Button>
                  </div>
                </section>

                <section className="flex flex-col border border-dashed border-slate-300 bg-white p-5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Remove item
                  </h2>

                  <p className="mt-2 text-xs text-slate-600">
                    Permanently deletes this item.
                  </p>

                  <div className="mt-auto pt-5">
                    <Button
                      variant="danger"
                      type="button"
                      onClick={handleDeleteItem}
                    >
                      Delete item
                    </Button>
                  </div>
                </section>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}

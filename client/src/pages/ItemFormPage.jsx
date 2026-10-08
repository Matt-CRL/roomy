import { useEffect, useRef, useState } from 'react'
import Button from '../components/common/Button'
import AppNavbar from '../components/layout/AppNavbar'
import { categoryGroups } from '../data/categoryOptions'
import { getPhotoAdjustment, getPhotoImageStyle } from '../data/photoDisplay'
import ImageCursorTrail from '../components/effects/ImageCursorTrail'

const ITEM_NAME_MAX_LENGTH = 80
const ITEM_NOTES_MAX_LENGTH = 500
const DEFAULT_PLANNER_DIMENSION_CM = 30
const DEFAULT_PLANNER_OBJECT_COLOR = '#1d1b31'
const STORAGE_UNIT_NESTING_HELP = "Storage units can't be stored inside another storage unit."

function FormDropdown({
  value,
  onChange,
  options = [],
  groups,
  ariaLabel,
  disabled = false,
  describedBy,
  maxMenuHeight = 180,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const optionGroups = groups ?? [{ label: null, categories: options }]
  const optionValue = (option) => typeof option === 'string' ? option : option.value
  const optionLabel = (option) => typeof option === 'string' ? option : option.label
  const selected = optionGroups.flatMap((group) => group.categories).find((option) => optionValue(option) === value)

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
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        className={`roomy-dropdown-trigger night-form-control flex min-h-11 w-full items-center justify-between border border-slate-300 px-3 text-left text-xs font-normal outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 ${
          disabled
            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
            : 'bg-white text-slate-900'
        }`}
      >
        <span>{selected ? optionLabel(selected) : value}</span>
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
          className="night-dropdown-menu roomy-dropdown-scrollbar absolute left-0 top-full z-30 mt-1 w-full overscroll-contain overflow-y-auto border border-slate-300 bg-white py-1 shadow-lg"
          style={{ maxHeight: `${maxMenuHeight}px` }}
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
                  key={`${group.label ?? 'options'}-${optionValue(option)}`}
                  type="button"
                  role="option"
                  aria-selected={value === optionValue(option)}
                  onClick={() => {
                    onChange(optionValue(option))
                    setIsOpen(false)
                  }}
                  className="roomy-dropdown-option block min-h-9 w-full px-3 text-left text-xs text-slate-700 transition-colors focus-visible:outline-none"
                >
                  {optionLabel(option)}
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
  onLoadPhoto,
  storageOptions,
  allowPhoto = false,
  onDeletePhoto,
  onSignOut,
  displayName,
  email,
  onUpdateDisplayName,
  onChangePassword,
  onDeleteAccount,
  isDarkMode = false,
}) {
  const roomName = room?.name ?? 'Bedroom 1'
  const isEditMode = Boolean(item)
  const initialPhotoAdjustment = getPhotoAdjustment(item)
  const otherRoomOptions = rooms
    .filter((roomOption) => roomOption.id !== room?.id)
    .map((roomOption) => roomOption.name)

  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'Furniture',
    storedInside: item?.parentStorageId ?? item?.storedInside ?? 'Not stored',
    notes: item?.notes ?? '',
    width: (item?.widthCm ?? item?.width) > 0 ? (item.widthCm ?? item.width) : '',
    depth: (item?.depthCm ?? item?.depth) > 0 ? (item.depthCm ?? item.depth) : '',
    isStorageUnit: item?.isStorageUnit ?? false,
    photoPositionX: initialPhotoAdjustment.x,
    photoPositionY: initialPhotoAdjustment.y,
    photoZoom: initialPhotoAdjustment.zoom,
  })
  const [moveToRoom, setMoveToRoom] = useState(otherRoomOptions[0] ?? '')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(item?.imageUrl ?? null)
  const [isPhotoLoading, setIsPhotoLoading] = useState(Boolean(item?.hasPhoto && !item?.imageUrl))
  const [photoLoadError, setPhotoLoadError] = useState('')
  const [photoLoadRetry, setPhotoLoadRetry] = useState(0)
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false)
  const photoInputRef = useRef(null)
  const photoDragRef = useRef(null)
  const photoLoaderRef = useRef(onLoadPhoto)
  photoLoaderRef.current = onLoadPhoto

  useEffect(() => {
    let active = true

    if (photoFile) {
      const previewUrl = URL.createObjectURL(photoFile)
      setPhotoPreviewUrl(previewUrl)
      setIsPhotoLoading(false)
      setPhotoLoadError('')
      return () => {
        active = false
        URL.revokeObjectURL(previewUrl)
      }
    }

    if (item?.imageUrl) {
      setPhotoPreviewUrl(item.imageUrl)
      setIsPhotoLoading(false)
      setPhotoLoadError('')
      return undefined
    }

    if (!item?.hasPhoto) {
      setPhotoPreviewUrl(null)
      setIsPhotoLoading(false)
      setPhotoLoadError('')
      return undefined
    }

    setPhotoPreviewUrl(null)
    setIsPhotoLoading(true)
    setPhotoLoadError('')
    const loadPhoto = photoLoaderRef.current
    if (!loadPhoto) {
      setIsPhotoLoading(false)
      setPhotoLoadError('Could not load the saved photo. Try again.')
      return undefined
    }

    loadPhoto(item).then((previewUrl) => {
      if (!active) return
      if (!previewUrl) throw new Error('Photo unavailable')
      setPhotoPreviewUrl(previewUrl)
    }).catch(() => {
      if (active) setPhotoLoadError('Could not load the saved photo. Try again.')
    }).finally(() => {
      if (active) setIsPhotoLoading(false)
    })

    return () => { active = false }
  }, [item?.id, item?.updatedAt, item?.hasPhoto, item?.imageUrl, photoFile, photoLoadRetry])

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function startPhotoDrag(event) {
    if (!photoPreviewUrl) return
    const frame = event.currentTarget
    event.preventDefault()
    frame.setPointerCapture?.(event.pointerId)
    photoDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startPositionX: form.photoPositionX,
      startPositionY: form.photoPositionY,
      frameWidth: frame.clientWidth,
      frameHeight: frame.clientHeight,
    }
    setIsDraggingPhoto(true)
  }

  function movePhoto(event) {
    const drag = photoDragRef.current
    if (!drag) return
    const nextX = Math.min(100, Math.max(0,
      drag.startPositionX - ((event.clientX - drag.startX) / drag.frameWidth) * 100,
    ))
    const nextY = Math.min(100, Math.max(0,
      drag.startPositionY - ((event.clientY - drag.startY) / drag.frameHeight) * 100,
    ))
    setForm((currentForm) => ({
      ...currentForm,
      photoPositionX: nextX,
      photoPositionY: nextY,
    }))
  }

  function endPhotoDrag(event) {
    if (photoDragRef.current && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    photoDragRef.current = null
    setIsDraggingPhoto(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.name.trim()) return
    setBusy(true)
    setBusyAction('save')
    setActionError('')
    try { await onSave?.({ ...form, room: roomName, roomId: room?.id, photoFile }) }
    catch (error) { setActionError(error.message) }
    finally { setBusy(false); setBusyAction('') }
  }

  async function handleMoveItem() {
    setBusy(true)
    setBusyAction('move')
    setActionError('')
    try { await onMoveItem?.(item?.id, moveToRoom) }
    catch (error) { setActionError(error.message) }
    finally { setBusy(false); setBusyAction('') }
  }

  async function confirmDeleteItem() {
    setBusy(true)
    setBusyAction('delete')
    setActionError('')
    try {
      await onDeleteItem?.(item?.id)
      setIsDeleteConfirmOpen(false)
    }
    catch (error) { setActionError(error.message) }
    finally { setBusy(false); setBusyAction('') }
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

  const widthInCm = Number(form.width) > 0 ? Number(form.width) : DEFAULT_PLANNER_DIMENSION_CM
  const depthInCm = Number(form.depth) > 0 ? Number(form.depth) : DEFAULT_PLANNER_DIMENSION_CM
  const previewScale = Math.min(180 / widthInCm, 120 / depthInCm)
  const previewWidth = Math.max(2, Math.round(widthInCm * previewScale))
  const previewHeight = Math.max(2, Math.round(depthInCm * previewScale))
  const previewStatus = form.isStorageUnit
    ? '0 inside'
    : form.storedInside && form.storedInside !== 'Not stored'
      ? 'Stored'
      : 'Unstored'

  return (
    <main className={`isolate min-h-screen bg-slate-50 p-6 ${isEditMode ? 'pb-32' : ''}`}>
      {!isDarkMode && <ImageCursorTrail />}
      <div className="mx-auto max-w-screen-2xl">
        <AppNavbar
          onSignOut={onSignOut}
          displayName={displayName}
          location={[
            { label: 'Rooms', onClick: onBackToRooms },
            { label: roomName, onClick: onBackToInventory },
            { label: form.name || 'Item name' },
          ]}
          email={email}
          onUpdateDisplayName={onUpdateDisplayName}
          onChangePassword={onChangePassword}
          onDeleteAccount={onDeleteAccount}
        />

        <header className="flex flex-col gap-5 pt-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {isEditMode ? 'Edit item' : 'Add item'}
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              {isEditMode
                ? 'Update details, location, storage behavior, or planner visibility.'
                : 'Add details, location, storage behavior, and planner visibility.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 self-end lg:self-auto">
            <Button variant="secondary" type="button" onClick={onCancel}>
              Cancel
            </Button>

            <Button variant="primary" type="submit" form="item-form" disabled={busy}>
              {busyAction === 'save' ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </header>

        {actionError && <p role="alert" className="mt-4 border border-red-300 bg-white p-3 text-sm text-red-700">{actionError}</p>}

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
          <form
            id="item-form"
            onSubmit={handleSubmit}
            className="night-form-surface border border-slate-300 bg-white p-5"
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="flex flex-col text-xs text-slate-900">
                <h2 className="font-semibold">Item photo</h2>
                <p className="mt-1 text-[10px] font-normal text-slate-500">
                  Upload a photo for inventory reference only.
                </p>
                <p className="mt-4 text-[10px] font-semibold text-slate-600">
                  Reference photo
                </p>
                <button
                  type="button"
                  disabled={!allowPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className="night-secondary-surface mt-2 flex h-[16rem] w-full flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-900 transition-colors hover:border-orange-400 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  {item?.imageUrl && !photoFile && <img src={item.imageUrl} alt="Current item" className="mb-2 max-h-32 max-w-full object-contain" />}
                  <span className="font-semibold">{photoFile ? photoFile.name : allowPhoto ? item?.hasPhoto ? 'Replace reference photo' : '+ Add optional reference photo' : 'Photos available in real mode'}</span>
                  <span className="mt-2 text-[10px] font-normal text-slate-500">
                    Used in inventory only
                  </span>
                </button>
                <input ref={photoInputRef} type="file" aria-label="Choose item photo" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  if (file.size > 5 * 1024 * 1024) { setActionError('Use an image smaller than 5 MB.'); return }
                  setPhotoFile(file)
                  setForm((currentForm) => ({
                    ...currentForm,
                    photoPositionX: 50,
                    photoPositionY: 50,
                    photoZoom: 1,
                  }))
                  setActionError('')
                }} />
                {allowPhoto && item?.hasPhoto && <button type="button" onClick={async () => {
                  if (!window.confirm('Remove this item photo?')) return
                  setBusy(true)
                  setBusyAction('photo')
                  setActionError('')
                  try { await onDeletePhoto?.(item.id) }
                  catch (error) { setActionError(error.message) }
                  finally { setBusy(false); setBusyAction('') }
                }} disabled={busy} className="mt-3 self-start text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50">{busyAction === 'photo' ? 'Removing…' : 'Remove photo'}</button>}
              </div>

            <section className="border-t border-slate-200 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <h2 className="text-xs font-semibold text-slate-900">
                Adjust photo
              </h2>

              <p className="mt-1 text-[10px] text-slate-500">
                Drag the image to choose what appears in the inventory card.
              </p>

              <p className="mt-4 text-[10px] font-semibold leading-4 text-slate-600 lg:mt-3">
                Item card preview
              </p>

              <div className="mt-2 h-[16rem] overflow-hidden border border-slate-300 bg-slate-200">
                <div
                  className={`relative flex h-40 touch-none items-center justify-center overflow-hidden border-b border-slate-300 bg-slate-200 ${
                    photoPreviewUrl ? isDraggingPhoto ? 'cursor-grabbing' : 'cursor-grab' : ''
                  }`}
                  onPointerDown={startPhotoDrag}
                  onPointerMove={movePhoto}
                  onPointerUp={endPhotoDrag}
                  onPointerCancel={endPhotoDrag}
                  onDragStart={(event) => event.preventDefault()}
                  role={photoPreviewUrl ? 'application' : undefined}
                  aria-label={photoPreviewUrl ? 'Drag to adjust the inventory photo' : undefined}
                >
                  {photoPreviewUrl ? (
                    <img
                      src={photoPreviewUrl}
                      alt="Inventory card preview"
                      draggable="false"
                      style={getPhotoImageStyle({
                        photoPositionX: form.photoPositionX,
                        photoPositionY: form.photoPositionY,
                        photoZoom: form.photoZoom,
                      })}
                      className="pointer-events-none h-full w-full select-none"
                    />
                  ) : (
                    <span className="px-4 text-center text-[10px] text-slate-500">
                      {isPhotoLoading ? 'Loading saved photo…' : photoLoadError ? (
                        <>
                          {photoLoadError}{' '}
                          <button type="button" onClick={() => setPhotoLoadRetry((retry) => retry + 1)} className="font-semibold text-orange-600 underline underline-offset-2">Try again</button>
                        </>
                      ) : 'Add a photo to adjust its card display.'}
                    </span>
                  )}
                {photoPreviewUrl && (
                  <span className="pointer-events-none absolute bottom-2 right-2 w-max bg-slate-950/60 px-2 py-1 text-[10px] text-white">
                    Drag to reposition
                  </span>
                )}
                </div>
                <div className="bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {form.name || 'Item name'}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{form.category}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="inline-flex border border-slate-300 px-2 py-1 text-[10px] text-slate-700">
                      {previewStatus}
                    </span>
                    <span aria-hidden="true" className="text-lg leading-none text-slate-600">⋯</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <label className="flex min-w-0 flex-1 items-center gap-3 text-[10px] font-semibold text-slate-600">
                  <span>Zoom</span>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.05"
                    value={form.photoZoom}
                    onChange={(event) => updateField('photoZoom', Number(event.target.value))}
                    disabled={!photoPreviewUrl}
                    aria-label="Photo zoom"
                    className="min-w-0 flex-1 accent-orange-500"
                  />
                  <span className="w-8 text-right font-normal">{Math.round(form.photoZoom * 100)}%</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForm((currentForm) => ({ ...currentForm, photoPositionX: 50, photoPositionY: 50, photoZoom: 1 }))}
                  disabled={!photoPreviewUrl}
                  className="text-[10px] font-semibold text-slate-600 underline-offset-2 hover:text-orange-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </section>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-900">
                <span className="flex items-center justify-between gap-3">
                  <span>Item name</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    {form.name.length}/{ITEM_NAME_MAX_LENGTH}
                  </span>
                </span>
                <input
                  required
                  maxLength={ITEM_NAME_MAX_LENGTH}
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Item name"
                  className="mt-2 min-h-11 w-full border border-slate-300 px-3 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-900">
                Category
                <FormDropdown
                  value={form.category}
                  onChange={(category) => updateField('category', category)}
                  groups={categoryGroups}
                  ariaLabel="Item category"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

              <label className="block text-xs font-semibold text-slate-900">
                Stored inside
                <div title={form.isStorageUnit ? STORAGE_UNIT_NESTING_HELP : undefined}>
                  <FormDropdown
                    value={form.storedInside}
                    onChange={(storedInside) => updateField('storedInside', storedInside)}
                    options={storageOptions ? [{ value: 'Not stored', label: 'Not stored' }, ...storageOptions] : ['Not stored', 'Wardrobe', 'Bedside drawer', 'Under-bed box']}
                    ariaLabel="Stored inside"
                    disabled={form.isStorageUnit}
                    describedBy={form.isStorageUnit ? 'stored-inside-disabled-help' : undefined}
                  />
                </div>
                {form.isStorageUnit && (
                  <span id="stored-inside-disabled-help" className="sr-only">
                    {STORAGE_UNIT_NESTING_HELP}
                  </span>
                )}
              </label>
            </div>

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
                className="roomy-dropdown-scrollbar mt-2 h-20 w-full resize-none overflow-y-auto border border-slate-300 px-3 py-2 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </label>
          </form>

          <aside className="space-y-5">
            <section className="border border-slate-300 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Planner preview
              </h2>

              <div className="room-preview-grid night-secondary-surface mt-4 flex h-48 items-center justify-center border border-slate-200 bg-slate-50">
                <div
                  style={{
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                    backgroundColor: DEFAULT_PLANNER_OBJECT_COLOR,
                    color: '#ffffff',
                  }}
                  className="flex items-center justify-center border-2 border-slate-500 px-1.5 text-center text-[10px] font-semibold transition-all duration-200"
                >
                  <span className="pointer-events-none leading-tight">
                    {form.name || 'Item name'}
                    {form.isStorageUnit && item?.storedCount > 0 && <small className="mt-0.5 block text-[9px] font-medium">{item.storedCount} inside</small>}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[10px] text-slate-500">
                Same color, outline, and label style as Room Planner
              </p>
              <fieldset className="mt-5 border-t border-slate-200 pt-4">
                <legend className="text-sm font-semibold text-slate-900">
                  Planner settings
                </legend>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  You can adjust these later in Planner Mode.
                </p>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-900">
                    Width (cm)
                    <input
                      form="item-form"
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.width}
                      onChange={(event) => handleDimensionChange('width', event.target.value)}
                      placeholder="30"
                      className="mt-2 min-h-11 w-full border border-slate-300 px-3 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-900">
                    Depth (cm)
                    <input
                      form="item-form"
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.depth}
                      onChange={(event) => handleDimensionChange('depth', event.target.value)}
                      placeholder="30"
                      className="mt-2 min-h-11 w-full border border-slate-300 px-3 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                  </label>
                </div>
              </fieldset>
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
                      maxMenuHeight={120}
                    />
                  </label>

                  <div className="mt-auto pt-5">
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleMoveItem}
                      disabled={busy || !moveToRoom}
                    >
                      {busyAction === 'move' ? 'Moving…' : 'Move item'}
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
                      onClick={() => {
                        if (item?.isStorageUnit && Number(item.storedCount) > 0) {
                          confirmDeleteItem()
                          return
                        }
                        setIsDeleteConfirmOpen(true)
                      }}
                      disabled={busy}
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

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-item-confirm-title"
            className="night-form-surface w-full max-w-md border border-slate-300 bg-white p-6 shadow-2xl"
          >
            <h2 id="delete-item-confirm-title" className="text-lg font-semibold text-slate-900">
              Delete {item?.name || 'this item'}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {item?.isStorageUnit
                ? 'This permanently deletes the storage unit. This action cannot be undone.'
                : 'This permanently deletes the item. This action cannot be undone.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="tertiary"
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={confirmDeleteItem}
                disabled={busy}
              >
                {busyAction === 'delete' ? 'Deleting…' : 'Delete item'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

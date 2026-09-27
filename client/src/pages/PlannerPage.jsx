import { useEffect, useRef, useState } from 'react'
import AppNavbar from '../components/layout/AppNavbar'
import Button from '../components/common/Button'

const round = (value) => Math.round(value * 100) / 100

export default function PlannerPage({ room, items = [], onBack, onLoad, onSave, onGetContents, onSignOut, displayName }) {
  const [layout, setLayout] = useState({ revision: 0, items: [] })
  const [selectedId, setSelectedId] = useState(null)
  const [availableId, setAvailableId] = useState('')
  const [contents, setContents] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const widthCm = Number(room?.widthCm)
  const depthCm = Number(room?.depthCm)
  const hasDimensions = widthCm > 0 && depthCm > 0
  const available = items.filter((item) => !item.parentStorageId && !item.storedInside && !layout.items.some((shape) => shape.itemId === item.id))
  const selected = layout.items.find((shape) => shape.itemId === selectedId)
  const selectedItem = items.find((item) => item.id === selectedId)

  useEffect(() => {
    if (!room?.id) return undefined
    let active = true
    setBusy(true)
    onLoad(room.id).then((next) => {
      if (active) { setLayout(next); setSelectedId(null); setError('') }
    }).catch((cause) => { if (active) setError(cause.message) })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [room?.id, onLoad])

  useEffect(() => {
    setContents([])
    if (!selectedItem?.isStorageUnit || !onGetContents) return undefined
    let active = true
    onGetContents(selectedItem.id).then((data) => { if (active) setContents(data.items) })
      .catch(() => { if (active) setContents([]) })
    return () => { active = false }
  }, [selectedItem?.id, onGetContents])

  function updateShape(itemId, changes) {
    setLayout((current) => ({ ...current, items: current.items.map((shape) => {
      if (shape.itemId !== itemId) return shape
      const next = { ...shape, ...changes }
      next.width = Math.max(1, Math.min(next.width, widthCm))
      next.depth = Math.max(1, Math.min(next.depth, depthCm))
      next.x = Math.max(0, Math.min(next.x, widthCm - next.width))
      next.y = Math.max(0, Math.min(next.y, depthCm - next.depth))
      return next
    }) }))
  }

  function addShape() {
    const item = available.find((entry) => entry.id === availableId) || available[0]
    if (!item || !hasDimensions) return
    const width = Math.min(widthCm, Math.max(1, Number(item.widthCm || item.width || 80)))
    const depth = Math.min(depthCm, Math.max(1, Number(item.depthCm || item.depth || 80)))
    const shape = { itemId: item.id, x: 0, y: 0, width: round(width), depth: round(depth), rotation: 0, color: '#f97316' }
    setLayout((current) => ({ ...current, items: [...current.items, shape] }))
    setSelectedId(item.id)
    setAvailableId('')
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const deltaX = ((event.clientX - dragRef.current.clientX) / rect.width) * widthCm
    const deltaY = ((event.clientY - dragRef.current.clientY) / rect.height) * depthCm
    updateShape(dragRef.current.itemId, {
      x: round(dragRef.current.x + deltaX), y: round(dragRef.current.y + deltaY),
    })
  }

  async function save() {
    setBusy(true)
    setError('')
    try { setLayout(await onSave(room.id, { revision: layout.revision, items: layout.items })) }
    catch (cause) { setError(cause.message) }
    finally { setBusy(false) }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-screen-2xl">
        <AppNavbar onSignOut={onSignOut} displayName={displayName} />
        <header className="flex flex-wrap items-center justify-between gap-4 pt-3">
          <div>
            <button type="button" onClick={onBack} className="text-sm text-slate-600 hover:text-orange-500">← Room Inventory</button>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{room?.name} planner</h1>
            <p className="mt-1 text-sm text-slate-600">Approximate top-down layout · {widthCm || '—'} × {depthCm || '—'} cm</p>
          </div>
          <Button variant="primary" onClick={save} disabled={!hasDimensions || busy}>{busy ? 'Working…' : 'Save layout'}</Button>
        </header>
        {error && <p role="alert" className="mt-5 border border-red-300 bg-white p-3 text-sm text-red-700">{error}</p>}
        {!hasDimensions ? <p className="mt-8 border border-slate-300 bg-white p-6 text-sm">Set this room’s width and depth from the Rooms page to use the planner.</p> : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 overflow-auto border border-slate-300 bg-white p-4">
              <div ref={canvasRef} role="region" aria-label="Room layout canvas" className="relative mx-auto w-full max-w-4xl touch-none border-2 border-slate-500 bg-orange-50" style={{ aspectRatio: `${widthCm} / ${depthCm}` }}>
                {layout.items.map((shape) => {
                  const item = items.find((entry) => entry.id === shape.itemId)
                  return <button key={shape.itemId} type="button" aria-label={`Move ${item?.name || 'item'}`} onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId)
                    dragRef.current = { itemId: shape.itemId, clientX: event.clientX, clientY: event.clientY, x: shape.x, y: shape.y }
                    setSelectedId(shape.itemId)
                  }} onPointerMove={handlePointerMove} onPointerUp={() => { dragRef.current = null }} onPointerCancel={() => { dragRef.current = null }}
                  className={`absolute flex select-none items-center justify-center overflow-hidden border-2 p-1 text-center text-xs font-semibold text-slate-900 ${selectedId === shape.itemId ? 'border-slate-950' : 'border-slate-600'}`}
                  style={{ left: `${shape.x / widthCm * 100}%`, top: `${shape.y / depthCm * 100}%`, width: `${shape.width / widthCm * 100}%`, height: `${shape.depth / depthCm * 100}%`, backgroundColor: shape.color, transform: `rotate(${shape.rotation}deg)` }}>{item?.name || 'Item'}</button>
                })}
              </div>
            </div>
            <aside className="space-y-5 border border-slate-300 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Shapes</h2>
              <label className="block text-sm text-slate-700">Add an unstored item
                <select value={availableId} onChange={(event) => setAvailableId(event.target.value)} className="mt-2 min-h-11 w-full border border-slate-300 bg-white px-2">
                  <option value="">{available.length ? 'Choose an item' : 'No items available'}</option>
                  {available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <Button variant="secondary" onClick={addShape} disabled={!available.length}>Add to planner</Button>
              {selected && <div className="space-y-3 border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900">{selectedItem?.name || 'Selected item'}</h3>
                <p className="text-xs text-slate-600">Drag the shape, or edit its approximate footprint below.</p>
                <div className="grid grid-cols-2 gap-2">
                  {['x', 'y', 'width', 'depth', 'rotation'].map((field) => <label key={field} className="text-xs capitalize text-slate-700">{field === 'rotation' ? 'Rotation (°)' : `${field} (cm)`}
                    <input type="number" step="1" value={selected[field]} onChange={(event) => updateShape(selectedId, { [field]: round(Number(event.target.value)) })} className="mt-1 min-h-10 w-full border border-slate-300 px-2" />
                  </label>)}
                </div>
                <label className="block text-xs text-slate-700">Color
                  <input type="color" value={selected.color} onChange={(event) => updateShape(selectedId, { color: event.target.value })} className="mt-1 block h-10 w-full" />
                </label>
                <Button variant="tertiary" onClick={() => { setLayout((current) => ({ ...current, items: current.items.filter((shape) => shape.itemId !== selectedId) })); setSelectedId(null) }}>Remove from planner</Button>
                {selectedItem?.isStorageUnit && <div className="border-t border-slate-200 pt-3 text-xs text-slate-700">Inside: {contents.length ? contents.map((item) => item.name).join(', ') : 'No stored items'}</div>}
              </div>}
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}

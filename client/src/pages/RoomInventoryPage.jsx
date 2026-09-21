import { useState } from 'react'
import Button from '../components/common/Button'
import AddItemCard from '../components/items/AddItemCard'
import InventoryFilters from '../components/items/InventoryFilters'
import InventoryItemCard from '../components/items/InventoryItemCard'
import AppNavbar from '../components/layout/AppNavbar'

const inventoryItems = [
  {
    id: 'wardrobe',
    name: 'Wardrobe',
    category: 'Furniture',
    location: 'storage',
    isStorageUnit: true,
    storedCount: 12,
    shape: 'portrait',
  },
  {
    id: 'bed-frame',
    name: 'Bed frame',
    category: 'Furniture',
    location: 'in room',
    storedInside: null,
    shape: 'landscape',
  },
  {
    id: 'bedside-table',
    name: 'Bedside table',
    category: 'Furniture',
    location: 'storage',
    isStorageUnit: true,
    storedCount: 4,
    shape: 'portrait',
  },
  {
    id: 'laptop',
    name: 'Laptop',
    category: 'Electronics',
    location: 'on desk',
    storedInside: 'Wardrobe',
    shape: 'landscape',
  },
  {
    id: 'desk-lamp',
    name: 'Desk lamp',
    category: 'Electronics',
    location: 'on desk',
    storedInside: null,
    shape: 'portrait',
  },
  {
    id: 'book-set',
    name: 'Book set',
    category: 'Books',
    location: 'wardrobe',
    storedInside: 'Wardrobe',
    shape: 'wide',
  },
  {
    id: 'storage-box',
    name: 'Storage box',
    category: 'Other',
    location: 'storage',
    isStorageUnit: true,
    storedCount: 8,
    shape: 'square',
  },
  {
    id: 'desk-chair',
    name: 'Desk chair',
    category: 'Furniture',
    location: 'in room',
    storedInside: null,
    shape: 'portrait',
  },
]

export default function RoomInventoryPage({
  room,
  onBackToRooms,
  onAddItem,
  onEditItem,
}) {
  const roomName = room?.name ?? 'Bedroom 1'
  const [viewMode, setViewMode] = useState('grid')

  function handleAddItem() {
    onAddItem?.()
  }

  function handlePlanner() {
    console.log('Open planner')
  }

  function handleItemOptions(item) {
    console.log('Item options:', item)
  }

  function handleItemSelect(item) {
    onEditItem?.(item)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-screen-2xl">
        <AppNavbar />

        <header className="flex flex-col gap-5 pt-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-3xl font-bold text-slate-900">
                Room Inventory
              </h1>

              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1 text-sm text-slate-500"
              >
                <button
                  type="button"
                  onClick={onBackToRooms}
                  className="transition-colors hover:text-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                  Rooms
                </button>
                <span aria-hidden="true">/</span>
              <span className="font-semibold text-orange-500">
                {roomName}
              </span>
              </nav>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              34 items · 4 storage units · Updated today
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handlePlanner}>
              Planner
            </Button>

            <Button variant="primary" onClick={handleAddItem}>
              + Add item
            </Button>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
          <InventoryFilters />

          <section aria-labelledby="inventory-heading">
            <h2 id="inventory-heading" className="sr-only">
              Bedroom inventory items
            </h2>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 gap-2">
                <div className="relative min-w-0 flex-1">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  >
                    <circle cx="11" cy="11" r="6" />
                    <path d="m16 16 4 4" />
                  </svg>

                  <input
                    type="search"
                    placeholder="Search items"
                    aria-label="Search items"
                    className="min-h-11 w-full border border-slate-300 pl-10 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="night-view-toggle flex self-end border border-slate-300 text-xs font-medium xl:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`min-h-11 px-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset ${
                    viewMode === 'grid'
                      ? 'view-toggle-active bg-slate-900 text-white'
                      : 'view-toggle-inactive bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={viewMode === 'grid'}
                >
                  Grid
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`min-h-11 px-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset ${
                    viewMode === 'list'
                      ? 'view-toggle-active bg-slate-900 text-white'
                      : 'view-toggle-inactive bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-pressed={viewMode === 'list'}
                >
                  List
                </button>
              </div>
            </div>

            <div
              className={
                viewMode === 'grid'
                  ? 'mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'
                  : 'mt-6 space-y-3'
              }
            >
              <AddItemCard onClick={handleAddItem} compact={viewMode === 'list'} />

              {inventoryItems.map((item) => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  onSelect={handleItemSelect}
                  onOptions={handleItemOptions}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

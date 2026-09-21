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

function FilterGroup({ label, options }) {
  return (
    <fieldset className="border-t border-slate-200 pt-3">
      <legend className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </legend>

      <div className="mt-1 space-y-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 text-xs text-slate-600"
          >
            <input
              type="checkbox"
              className="h-3 w-3 accent-orange-500"
              defaultChecked={option === 'In room' || option === 'All items'}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function CategoryFilterGroup() {
  return (
    <fieldset className="border-t border-slate-200 pt-3">
      <legend className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        Category
      </legend>

      <div className="mt-1 space-y-2">
        {categoryGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-slate-500">
              {group.label}
            </p>

            <div className="mt-0.5 space-y-1 pl-1">
              {group.categories.map((category) => (
                <label
                  key={`${group.label}-${category}`}
                  className="flex items-center gap-2 text-xs text-slate-600"
                >
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-orange-500"
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  )
}

export default function InventoryFilters() {
  return (
    <aside className="border border-slate-300 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">
        Filter inventory
      </h2>

      <div className="mt-4 space-y-3">
        <FilterGroup
          label="Item type"
          options={['All items', 'Regular items', 'Storage units']}
        />

        <CategoryFilterGroup />
      </div>
    </aside>
  )
}

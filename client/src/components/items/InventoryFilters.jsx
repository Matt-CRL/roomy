import { categoryGroups } from '../../data/categoryOptions'

function CategoryFilterGroup({ value, onChange }) {
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
                    checked={value.categories.includes(category)}
                    onChange={() => onChange({ ...value, categories: value.categories.includes(category)
                      ? value.categories.filter((entry) => entry !== category)
                      : [...value.categories, category] })}
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

export default function InventoryFilters({ value, onChange }) {
  return (
    <aside className="border border-slate-300 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">
        Filter inventory
      </h2>

      <div className="mt-4 space-y-3">
        <fieldset className="border-t border-slate-200 pt-3">
          <legend className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Item type</legend>
          <div className="mt-1 space-y-2">
            {[['all', 'All items'], ['item', 'Regular items'], ['storage', 'Storage units']].map(([type, label]) => (
              <label key={type} className="flex items-center gap-2 text-xs text-slate-600">
                <input type="radio" name="item-type" checked={value.type === type} onChange={() => onChange({ ...value, type })} className="h-3 w-3 accent-orange-500" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <CategoryFilterGroup value={value} onChange={onChange} />
      </div>
    </aside>
  )
}

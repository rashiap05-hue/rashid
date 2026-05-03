import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Check, Loader2, Plus, Edit3 } from 'lucide-react';

/* Reusable searchable picker for selecting items from a catalog
 * (Activities, Hotels, Cities, etc.).
 *
 * Props:
 *   - selected:      the currently-selected item (or `null`)
 *   - onSelect:      (item|null) => void  (called when user picks or clears)
 *   - loadItems:     async () => [{ id, label, sub, image }]
 *   - placeholder:   text shown when nothing is selected
 *   - emptyText:     text shown when search has no results
 *   - testid:        prefix for data-testids
 *   - allowManual:   if true, "Manual override" button switches the parent
 *                    to free-text mode (caller decides what that means).
 */
export default function CatalogPicker({
  selected,
  onSelect,
  loadItems,
  placeholder = 'Pick from catalog…',
  emptyText = 'No items found.',
  testid = 'catalog-picker',
  allowManual = false,
  onManualEdit,
  scopeFilter = null,             // {label: "Almaty", predicate: (rawItem) => bool}
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    setShowAll(false);
    Promise.resolve(loadItems()).then((arr) => {
      if (!cancel) {
        setItems(Array.isArray(arr) ? arr : []);
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 30);
      }
    }).catch(() => { if (!cancel) { setItems([]); setLoading(false); } });
    return () => { cancel = true; };
  }, [open, loadItems]);

  // Apply scope filter first (unless user toggled "Show all"), then apply search query
  const scoped = scopeFilter && !showAll
    ? items.filter(i => scopeFilter.predicate(i.raw || {}))
    : items;
  const filtered = !query
    ? scoped
    : scoped.filter(i => {
        const q = query.toLowerCase();
        return (i.label || '').toLowerCase().includes(q)
          || (i.sub || '').toLowerCase().includes(q);
      });

  const pick = (item) => {
    onSelect(item);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" data-testid={testid}>
      {selected ? (
        <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded">
          {selected.image && (
            <img src={selected.image} alt="" className="w-9 h-9 object-cover rounded flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-emerald-900 truncate">{selected.label}</div>
            {selected.sub && <div className="text-[11px] text-emerald-700 truncate">{selected.sub}</div>}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded"
            data-testid={`${testid}-change`}
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
            title="Unlink from catalog"
            data-testid={`${testid}-unlink`}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded text-xs font-semibold text-[#002B5B] hover:border-[#002B5B] hover:bg-blue-50 flex items-center justify-center gap-1"
            data-testid={`${testid}-open`}
          >
            <Plus size={12} /> {placeholder}
          </button>
          {allowManual && (
            <button
              type="button"
              onClick={onManualEdit}
              className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 rounded border border-gray-300 flex items-center gap-1"
              title="Type manually instead of picking from catalog"
              data-testid={`${testid}-manual`}
            >
              <Edit3 size={10} /> Manual
            </button>
          )}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            data-testid={`${testid}-modal`}
          >
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
              <h3 className="font-black text-sm text-gray-900">{placeholder}</h3>
              <div className="flex items-center gap-2">
                {scopeFilter && (
                  <button
                    type="button"
                    onClick={() => setShowAll(v => !v)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                      showAll
                        ? 'bg-gray-100 text-gray-600 border-gray-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                    title={showAll ? 'Re-apply the destination filter' : 'Show items from every destination'}
                    data-testid={`${testid}-toggle-scope`}
                  >
                    {showAll ? 'Filtered: All destinations' : `Filtered: ${scopeFilter.label} only`}
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
              </div>
            </div>
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, city, country…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#002B5B]"
                  data-testid={`${testid}-search`}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-500"><Loader2 className="inline mr-2 animate-spin" size={14} /> Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400 italic">{emptyText}</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filtered.map((it) => {
                    const isSelected = selected?.id === it.id;
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => pick(it)}
                          className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 ${isSelected ? 'bg-emerald-50' : ''}`}
                          data-testid={`${testid}-item-${it.id}`}
                        >
                          {it.image ? (
                            <img src={it.image} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{it.label}</div>
                            {it.sub && <div className="text-[11px] text-gray-500 truncate">{it.sub}</div>}
                          </div>
                          {isSelected && <Check size={14} className="text-emerald-600 flex-shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-500 flex items-center justify-between">
              <span>
                {scopeFilter && !showAll && <span className="text-emerald-700 font-semibold">Scoped to {scopeFilter.label} · </span>}
                {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
              </span>
              {scopeFilter && !showAll && filtered.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="text-[10px] font-bold text-[#002B5B] hover:underline"
                  data-testid={`${testid}-show-all`}
                >
                  Show all destinations →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

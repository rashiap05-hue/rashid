import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

/* ---------- Generic collapsible section shell ---------- */
export function Section({ title, subtitle, count, children, defaultOpen = false, testid }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white" data-testid={testid}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition"
      >
        <div>
          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide flex items-center gap-2">
            {title}
            {count != null && (
              <span className="text-[10px] bg-[#002B5B] text-white px-1.5 py-0.5 rounded-full font-bold">
                {count}
              </span>
            )}
          </h3>
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="p-4 space-y-3 border-t border-gray-200">{children}</div>}
    </div>
  );
}

/* ---------- Simple bullet list editor (highlights, exclusions) ---------- */
export function BulletListEditor({ items, onChange, placeholder = 'Add bullet...', testidPrefix }) {
  const update = (i, v) => onChange(items.map((x, idx) => (idx === i ? v : x)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, '']);
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const arr = [...items];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-gray-400 italic px-2">No entries yet.</p>
      )}
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-2" data-testid={`${testidPrefix}-row-${i}`}>
          <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
          <input
            value={v}
            onChange={e => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#002B5B]"
            data-testid={`${testidPrefix}-input-${i}`}
          />
          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 rounded"><ArrowUp size={12} /></button>
          <button type="button" onClick={() => move(i, +1)} disabled={i === items.length - 1} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 rounded"><ArrowDown size={12} /></button>
          <button type="button" onClick={() => remove(i)} className="p-1 text-red-500 hover:bg-red-50 rounded" data-testid={`${testidPrefix}-remove-${i}`}><Trash2 size={12} /></button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#002B5B] hover:bg-[#003d82] text-white text-xs font-semibold rounded"
        data-testid={`${testidPrefix}-add`}
      >
        <Plus size={12} /> Add
      </button>
    </div>
  );
}

/* ---------- Itinerary editor (per day: title, desc, meals, hotel_note) ---------- */
const MEAL_OPTIONS = [
  { v: 'B', label: 'Breakfast' },
  { v: 'L', label: 'Lunch' },
  { v: 'D', label: 'Dinner' },
];

export function ItineraryEditor({ days, onChange }) {
  const update = (i, patch) => onChange(days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const remove = (i) => onChange(days.filter((_, idx) => idx !== i));
  const add = () => {
    const nextDay = (days[days.length - 1]?.day || 0) + 1;
    onChange([...days, { day: nextDay, title: '', desc: '', meals: [], hotel_note: '' }]);
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= days.length) return;
    const arr = [...days];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };
  const toggleMeal = (i, meal) => {
    const current = days[i].meals || [];
    const next = current.includes(meal) ? current.filter(m => m !== meal) : [...current, meal];
    update(i, { meals: next });
  };
  return (
    <div className="space-y-3">
      {days.length === 0 && <p className="text-xs text-gray-400 italic">No itinerary days yet.</p>}
      {days.map((d, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50" data-testid={`itin-day-${i}`}>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-bold text-gray-700">DAY</label>
            <input
              type="number"
              min="1"
              value={d.day}
              onChange={e => update(i, { day: Number(e.target.value) || 1 })}
              className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm font-bold"
              data-testid={`itin-${i}-day`}
            />
            <input
              type="text"
              value={d.title}
              onChange={e => update(i, { title: e.target.value })}
              placeholder="Day title (e.g. Arrival in Baku)"
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-semibold"
              data-testid={`itin-${i}-title`}
            />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 hover:bg-gray-200 disabled:opacity-30 rounded"><ArrowUp size={12} /></button>
            <button type="button" onClick={() => move(i, +1)} disabled={i === days.length - 1} className="p-1 hover:bg-gray-200 disabled:opacity-30 rounded"><ArrowDown size={12} /></button>
            <button type="button" onClick={() => remove(i)} className="p-1 text-red-500 hover:bg-red-50 rounded" data-testid={`itin-${i}-remove`}><Trash2 size={12} /></button>
          </div>
          <textarea
            value={d.desc}
            onChange={e => update(i, { desc: e.target.value })}
            placeholder="Describe the day's activities..."
            rows={3}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2"
            data-testid={`itin-${i}-desc`}
          />
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] uppercase text-gray-500 font-bold">Meals:</span>
            {MEAL_OPTIONS.map(m => (
              <label key={m.v} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={(d.meals || []).includes(m.v)}
                  onChange={() => toggleMeal(i, m.v)}
                  data-testid={`itin-${i}-meal-${m.v}`}
                />
                {m.label}
              </label>
            ))}
          </div>
          <input
            type="text"
            value={d.hotel_note || ''}
            onChange={e => update(i, { hotel_note: e.target.value })}
            placeholder="Hotel note (e.g. Overnight stay at hotel in Baku) — optional"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            data-testid={`itin-${i}-hotel-note`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#002B5B] hover:bg-[#003d82] text-white text-xs font-semibold rounded"
        data-testid="itin-add"
      >
        <Plus size={12} /> Add Day
      </button>
    </div>
  );
}

/* ---------- Hotels editor ---------- */
export function HotelsEditor({ hotels, onChange }) {
  const update = (i, patch) => onChange(hotels.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const remove = (i) => onChange(hotels.filter((_, idx) => idx !== i));
  const add = () => onChange([...hotels, { name: '', stars: 3, nights: 1, room_type: 'Standard Room', meal_plan: 'Bed & Breakfast', image: '' }]);
  return (
    <div className="space-y-3">
      {hotels.length === 0 && <p className="text-xs text-gray-400 italic">No hotels yet.</p>}
      {hotels.map((h, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2" data-testid={`hotel-${i}`}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={h.name}
              onChange={e => update(i, { name: e.target.value })}
              placeholder="Hotel name (e.g. Park Inn by Radisson Baku)"
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm font-semibold"
              data-testid={`hotel-${i}-name`}
            />
            <button type="button" onClick={() => remove(i)} className="p-1 text-red-500 hover:bg-red-50 rounded" data-testid={`hotel-${i}-remove`}><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-0.5">Stars</label>
              <input type="number" min="1" max="5" value={h.stars} onChange={e => update(i, { stars: Number(e.target.value) || 3 })} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-0.5">Nights</label>
              <input type="number" min="1" value={h.nights} onChange={e => update(i, { nights: Number(e.target.value) || 1 })} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-0.5">Room Type</label>
              <input type="text" value={h.room_type} onChange={e => update(i, { room_type: e.target.value })} placeholder="Standard Twin Room" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-0.5">Meal Plan</label>
              <input type="text" value={h.meal_plan} onChange={e => update(i, { meal_plan: e.target.value })} placeholder="Bed & Breakfast" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-0.5">Image URL</label>
              <input type="text" value={h.image || ''} onChange={e => update(i, { image: e.target.value })} placeholder="https://..." className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#002B5B] hover:bg-[#003d82] text-white text-xs font-semibold rounded"
        data-testid="hotel-add"
      >
        <Plus size={12} /> Add Hotel
      </button>
    </div>
  );
}

/* ---------- Inclusions editor (grouped by category) ---------- */
export function InclusionsEditor({ inclusions, onChange }) {
  const categories = Object.keys(inclusions || {});
  const [newCat, setNewCat] = useState('');

  const updateCat = (cat, items) => onChange({ ...inclusions, [cat]: items });
  const renameCat = (oldName, newName) => {
    if (!newName || newName === oldName) return;
    const next = {};
    Object.keys(inclusions).forEach(k => {
      next[k === oldName ? newName : k] = inclusions[k];
    });
    onChange(next);
  };
  const removeCat = (cat) => {
    if (!window.confirm(`Remove category "${cat}" and all its bullets?`)) return;
    const next = { ...inclusions };
    delete next[cat];
    onChange(next);
  };
  const addCat = () => {
    const name = newCat.trim();
    if (!name || inclusions[name]) return;
    onChange({ ...inclusions, [name]: [] });
    setNewCat('');
  };

  return (
    <div className="space-y-3">
      {categories.length === 0 && <p className="text-xs text-gray-400 italic">No categories yet. Add one below.</p>}
      {categories.map(cat => (
        <div key={cat} className="border border-gray-200 rounded-lg p-3 bg-gray-50" data-testid={`incl-cat-${cat}`}>
          <div className="flex items-center gap-2 mb-2">
            <input
              defaultValue={cat}
              onBlur={e => renameCat(cat, e.target.value.trim())}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-bold text-gray-800"
              data-testid={`incl-cat-${cat}-name`}
            />
            <button type="button" onClick={() => removeCat(cat)} className="p-1 text-red-500 hover:bg-red-50 rounded" data-testid={`incl-cat-${cat}-remove`}>
              <Trash2 size={12} />
            </button>
          </div>
          <BulletListEditor
            items={inclusions[cat] || []}
            onChange={(items) => updateCat(cat, items)}
            placeholder={`${cat} item...`}
            testidPrefix={`incl-${cat.toLowerCase().replace(/\s+/g, '-')}`}
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          placeholder="New category (e.g. Meals)"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
          data-testid="incl-new-cat"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCat(); } }}
        />
        <button
          type="button"
          onClick={addCat}
          disabled={!newCat.trim()}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#002B5B] hover:bg-[#003d82] text-white text-xs font-semibold rounded disabled:opacity-40"
          data-testid="incl-add-cat"
        >
          <Plus size={12} /> Add Category
        </button>
      </div>
    </div>
  );
}

/* ---------- Paragraph list editor (what_to_expect) ---------- */
export function ParagraphListEditor({ paragraphs, onChange, placeholder = 'Write a paragraph...', testidPrefix }) {
  const update = (i, v) => onChange(paragraphs.map((x, idx) => (idx === i ? v : x)));
  const remove = (i) => onChange(paragraphs.filter((_, idx) => idx !== i));
  const add = () => onChange([...paragraphs, '']);
  return (
    <div className="space-y-2">
      {paragraphs.length === 0 && <p className="text-xs text-gray-400 italic">No paragraphs yet.</p>}
      {paragraphs.map((p, i) => (
        <div key={i} className="flex items-start gap-2" data-testid={`${testidPrefix}-row-${i}`}>
          <textarea
            value={p}
            onChange={e => update(i, e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
            data-testid={`${testidPrefix}-input-${i}`}
          />
          <button type="button" onClick={() => remove(i)} className="p-1 text-red-500 hover:bg-red-50 rounded mt-1" data-testid={`${testidPrefix}-remove-${i}`}><Trash2 size={14} /></button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#002B5B] hover:bg-[#003d82] text-white text-xs font-semibold rounded"
        data-testid={`${testidPrefix}-add`}
      >
        <Plus size={12} /> Add Paragraph
      </button>
    </div>
  );
}

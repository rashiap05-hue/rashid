import React, { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RichTextEditor from './RichTextEditor';
import CatalogPicker from './CatalogPicker';
import { api } from '@/App';

/* Lazy loaders for the Activities + Hotels + Cities catalogs (cached per-mount). */
let _activitiesCache = null;
let _hotelsCache = null;
let _citiesCache = null;
const stripHtml = (html) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
async function loadActivities() {
  if (_activitiesCache) return _activitiesCache;
  const r = await api.get('/activities');
  const list = (r.data?.activities || r.data || []).map((a) => ({
    id: a.id,
    label: a.name,
    sub: [a.city, a.country, a.duration].filter(Boolean).join(' · '),
    image: (a.images || [])[0] || '',
    raw: a,
  }));
  _activitiesCache = list;
  return list;
}
async function loadHotels() {
  if (_hotelsCache) return _hotelsCache;
  const r = await api.get('/hotels');
  const list = (r.data?.hotels || r.data || []).map((h) => ({
    id: h.id,
    label: h.name,
    sub: [h.city, h.country, `${h.star_rating || h.stars || 3}★`].filter(Boolean).join(' · '),
    image: (h.images || [])[0] || h.image || '',
    raw: h,
  }));
  _hotelsCache = list;
  return list;
}
/* Build a predicate that matches items whose `city` / `name` equals the given
 * destination (case-insensitive). Shared by Activities + Hotels pickers. */
function _cityScopeFilter(destination) {
  if (!destination) return null;
  const needle = String(destination).trim().toLowerCase();
  if (!needle) return null;
  return {
    label: destination,
    predicate: (raw) => {
      const city = String(raw?.city || raw?.name || '').trim().toLowerCase();
      return city === needle;
    },
  };
}

export async function loadCities() {
  if (_citiesCache) return _citiesCache;
  const r = await api.get('/cities');
  const list = (r.data?.cities || r.data || []).map((c) => ({
    id: c.id || c.name,
    label: c.name,
    sub: c.country || '',
    image: c.image || '',
    raw: c,
  }));
  _citiesCache = list;
  return list;
}

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

/* ---------- Itinerary editor (drag-and-drop sortable days) ---------- */
const MEAL_OPTIONS = [
  { v: 'B', label: 'Breakfast' },
  { v: 'L', label: 'Lunch' },
  { v: 'D', label: 'Dinner' },
];

function SortableDay({ id, index, day, total, onUpdate, onRemove, destination }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const toggleMeal = (meal) => {
    const current = day.meals || [];
    onUpdate({ meals: current.includes(meal) ? current.filter(m => m !== meal) : [...current, meal] });
  };

  // Linked activity (read from day.activity_id + denormalised label)
  const selectedActivity = day.activity_id
    ? { id: day.activity_id, label: day.activity_name || day.title || 'Linked activity', sub: '', image: '' }
    : null;

  const onPickActivity = useCallback((item) => {
    if (!item) {
      onUpdate({ activity_id: null, activity_name: null });
      return;
    }
    const a = item.raw || {};
    onUpdate({
      activity_id: item.id,
      activity_name: item.label,
      title: item.label || day.title,
      desc: a.description ? `<p>${a.description.replace(/\n+/g, '</p><p>')}</p>` : day.desc,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-lg p-3 bg-gray-50" data-testid={`itin-day-${index}`}>
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
          data-testid={`itin-${index}-drag`}
        >
          <GripVertical size={14} />
        </button>
        <label className="text-xs font-bold text-gray-700">DAY</label>
        <input
          type="number"
          min="1"
          value={day.day}
          onChange={e => onUpdate({ day: Number(e.target.value) || 1 })}
          className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm font-bold"
          data-testid={`itin-${index}-day`}
        />
        <input
          type="text"
          value={day.title}
          onChange={e => onUpdate({ title: e.target.value })}
          placeholder="Day title (e.g. Arrival in Baku)"
          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-semibold"
          data-testid={`itin-${index}-title`}
        />
        <button type="button" onClick={() => onRemove()} className="p-1 text-red-500 hover:bg-red-50 rounded" data-testid={`itin-${index}-remove`}><Trash2 size={12} /></button>
      </div>

      {/* Catalog activity picker (optional — falls back to free-text title/desc) */}
      <div className="mb-2">
        <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Linked Activity (from Activities catalog)</label>
        <CatalogPicker
          selected={selectedActivity}
          onSelect={onPickActivity}
          loadItems={loadActivities}
          placeholder="Pick activity from catalog…"
          emptyText="No activities found in the catalog yet."
          scopeFilter={_cityScopeFilter(destination)}
          testid={`itin-${index}-activity`}
        />
      </div>

      <div className="mb-2">
        <RichTextEditor
          value={day.desc || ''}
          onChange={(html) => onUpdate({ desc: html })}
          placeholder="Describe the day's activities..."
          minHeight={80}
          testid={`itin-${index}-desc`}
        />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[10px] uppercase text-gray-500 font-bold">Meals:</span>
        {MEAL_OPTIONS.map(m => (
          <label key={m.v} className="flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={(day.meals || []).includes(m.v)}
              onChange={() => toggleMeal(m.v)}
              data-testid={`itin-${index}-meal-${m.v}`}
            />
            {m.label}
          </label>
        ))}
      </div>
      <input
        type="text"
        value={day.hotel_note || ''}
        onChange={e => onUpdate({ hotel_note: e.target.value })}
        placeholder="Hotel note (e.g. Overnight stay at hotel in Baku) — optional"
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        data-testid={`itin-${index}-hotel-note`}
      />
      <div className="text-[10px] text-gray-400 mt-1">Position {index + 1} of {total}</div>
    </div>
  );
}

export function ItineraryEditor({ days, onChange, destination }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = days.findIndex((_, i) => `day-${i}` === active.id);
    const newIdx = days.findIndex((_, i) => `day-${i}` === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onChange(arrayMove(days, oldIdx, newIdx));
  };

  const update = (i, patch) => onChange(days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const remove = (i) => onChange(days.filter((_, idx) => idx !== i));
  const add = () => {
    const nextDay = (days[days.length - 1]?.day || 0) + 1;
    onChange([...days, { day: nextDay, title: '', desc: '', meals: [], hotel_note: '' }]);
  };

  const ids = days.map((_, i) => `day-${i}`);

  return (
    <div className="space-y-3">
      {days.length === 0 && <p className="text-xs text-gray-400 italic">No itinerary days yet.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {days.map((d, i) => (
              <SortableDay
                key={`day-${i}`}
                id={`day-${i}`}
                index={i}
                day={d}
                total={days.length}
                destination={destination}
                onUpdate={(patch) => update(i, patch)}
                onRemove={() => remove(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#002B5B] hover:bg-[#003d82] text-white text-xs font-semibold rounded"
        data-testid="itin-add"
      >
        <Plus size={12} /> Add Day
      </button>
      <p className="text-[11px] text-gray-500"><GripVertical size={11} className="inline" /> Drag the handle on the left of each day to reorder. The day numbers won't auto-renumber — edit them manually if needed.</p>
    </div>
  );
}

/* ---------- Hotels editor ---------- */
import ImageUploadField from './ImageUploadField';

export function HotelsEditor({ hotels, onChange, packageId = '', destination }) {
  const update = (i, patch) => onChange(hotels.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const remove = (i) => onChange(hotels.filter((_, idx) => idx !== i));
  const add = () => onChange([...hotels, { name: '', stars: 3, nights: 1, room_type: 'Standard Room', meal_plan: 'Bed & Breakfast', image: '', hotel_id: null }]);

  const onPickHotel = (i, item) => {
    if (!item) {
      update(i, { hotel_id: null });
      return;
    }
    const raw = item.raw || {};
    update(i, {
      hotel_id: item.id,
      name: item.label,
      stars: Number(raw.star_rating || raw.stars || 3),
      image: (raw.images && raw.images[0]) || raw.image || '',
    });
  };

  return (
    <div className="space-y-3">
      {hotels.length === 0 && <p className="text-xs text-gray-400 italic">No hotels yet.</p>}
      {hotels.map((h, i) => {
        const selectedHotel = h.hotel_id
          ? { id: h.hotel_id, label: h.name || 'Linked hotel', sub: h.stars ? `${h.stars}★` : '', image: h.image || '' }
          : null;
        return (
          <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2" data-testid={`hotel-${i}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase text-gray-500 font-bold">Hotel #{i + 1}</span>
              <button type="button" onClick={() => remove(i)} className="p-1 text-red-500 hover:bg-red-50 rounded" data-testid={`hotel-${i}-remove`}><Trash2 size={14} /></button>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Linked Hotel (from Hotels catalog)</label>
              <CatalogPicker
                selected={selectedHotel}
                onSelect={(item) => onPickHotel(i, item)}
                loadItems={loadHotels}
                placeholder="Pick hotel from catalog…"
                emptyText="No hotels found in the catalog yet."
                scopeFilter={_cityScopeFilter(destination)}
                testid={`hotel-${i}-picker`}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-0.5">Display Name (override)</label>
              <input
                type="text"
                value={h.name}
                onChange={e => update(i, { name: e.target.value })}
                placeholder="Hotel display name (e.g. Park Inn by Radisson Baku)"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-semibold"
                data-testid={`hotel-${i}-name`}
              />
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
              <div className="col-span-4">
                <ImageUploadField
                  label="Hotel Image (override)"
                  value={h.image || ''}
                  onChange={(url) => update(i, { image: url })}
                  packageId={packageId}
                  testidPrefix={`hotel-${i}-img`}
                />
              </div>
            </div>
          </div>
        );
      })}
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

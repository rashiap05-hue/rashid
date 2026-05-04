import React, { useRef, useState } from 'react';
import { Plane, X, Plus, Upload, Loader2 } from 'lucide-react';
import { api } from '@/App';

/* Empty flight segment template (mirrors the backend FlightSegment Pydantic model). */
const EMPTY_FLIGHT = {
  airline: '', airline_logo: '', flight_number: '',
  from_city: '', from_airport: '', from_code: '', from_terminal: '',
  to_city: '', to_airport: '', to_code: '', to_terminal: '',
  departure_date: '', departure_time: '',
  arrival_date: '', arrival_time: '',
  duration: '', fare: 'Basic', baggage: '20 kg',
  meals: 'At Extra Cost', cabin: 'Economy',
};

/* Upload-or-paste logo widget for a single airline.
 * Click thumbnail to upload a file (≤2 MB), or paste a URL.
 * Reuses the existing /api/uploads/group-tour-image endpoint. */
function AirlineLogoField({ value, onChange, idx }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const upload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('Pick an image'); return; }
    if (file.size > 2 * 1024 * 1024) { setErr('Logo must be ≤ 2 MB'); return; }
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('package_id', `airline_${idx}`);
      const res = await api.post('/uploads/group-tour-image', fd, {
        headers: { 'Content-Type': undefined },
        transformRequest: [(d) => d],
      });
      onChange(res.data.url);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Airline Logo</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="relative w-16 h-12 border-2 border-dashed border-gray-300 rounded bg-white hover:border-sky-400 hover:bg-sky-50 flex items-center justify-center flex-shrink-0 overflow-hidden"
          title="Click to upload a logo"
          data-testid={`gt-flight-${idx}-logo-upload`}
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin text-sky-500" />
          ) : value ? (
            <img src={value} alt="logo" className="max-w-full max-h-full object-contain" />
          ) : (
            <Upload size={16} className="text-gray-400" />
          )}
        </button>
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste URL"
          className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-gray-400 hover:text-red-600 p-1"
            title="Remove logo"
          >
            <X size={14} />
          </button>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}
    </div>
  );
}

function Field({ label, children, span = 1 }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">{label}</label>
      {children}
    </div>
  );
}

function FlightCard({ flight, idx, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...flight, [k]: v });
  const cls = "w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500";

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-3" data-testid={`gt-flight-${idx}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sky-700 font-bold text-sm">
          <Plane size={14} /> Flight {idx + 1}
          {flight.flight_number && <span className="text-gray-500 font-normal">— {flight.flight_number}</span>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-600 p-1"
          title="Remove flight"
          data-testid={`gt-flight-${idx}-remove`}
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Airline"><input value={flight.airline} onChange={e => set('airline', e.target.value)} className={cls} placeholder="Air Arabia" /></Field>
        <Field label="Flight Number"><input value={flight.flight_number} onChange={e => set('flight_number', e.target.value)} className={cls} placeholder="G9-253" /></Field>
        <AirlineLogoField
          value={flight.airline_logo}
          onChange={(v) => set('airline_logo', v)}
          idx={idx}
        />
      </div>

      <div className="border-t border-gray-100 pt-3">
        <div className="text-[11px] font-bold text-gray-600 uppercase mb-2">Departure</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="From City"><input value={flight.from_city} onChange={e => set('from_city', e.target.value)} className={cls} placeholder="Sharjah" /></Field>
          <Field label="Airport"><input value={flight.from_airport} onChange={e => set('from_airport', e.target.value)} className={cls} placeholder="Sharjah Airport" /></Field>
          <Field label="IATA Code"><input value={flight.from_code} onChange={e => set('from_code', e.target.value)} className={cls} placeholder="SHJ" /></Field>
          <Field label="Terminal"><input value={flight.from_terminal} onChange={e => set('from_terminal', e.target.value)} className={cls} placeholder="1" /></Field>
          <Field label="Departure Date"><input type="date" value={flight.departure_date} onChange={e => set('departure_date', e.target.value)} className={cls} /></Field>
          <Field label="Departure Time"><input type="time" value={flight.departure_time} onChange={e => set('departure_time', e.target.value)} className={cls} /></Field>
          <Field label="Duration"><input value={flight.duration} onChange={e => set('duration', e.target.value)} className={cls} placeholder="3h 10m" /></Field>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <div className="text-[11px] font-bold text-gray-600 uppercase mb-2">Arrival</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="To City"><input value={flight.to_city} onChange={e => set('to_city', e.target.value)} className={cls} placeholder="Almaty" /></Field>
          <Field label="Airport"><input value={flight.to_airport} onChange={e => set('to_airport', e.target.value)} className={cls} placeholder="Almaty Airport" /></Field>
          <Field label="IATA Code"><input value={flight.to_code} onChange={e => set('to_code', e.target.value)} className={cls} placeholder="ALA" /></Field>
          <Field label="Terminal"><input value={flight.to_terminal} onChange={e => set('to_terminal', e.target.value)} className={cls} /></Field>
          <Field label="Arrival Date"><input type="date" value={flight.arrival_date} onChange={e => set('arrival_date', e.target.value)} className={cls} /></Field>
          <Field label="Arrival Time"><input type="time" value={flight.arrival_time} onChange={e => set('arrival_time', e.target.value)} className={cls} /></Field>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <div className="text-[11px] font-bold text-gray-600 uppercase mb-2">Fare</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Fare"><input value={flight.fare} onChange={e => set('fare', e.target.value)} className={cls} placeholder="Basic" /></Field>
          <Field label="Baggage"><input value={flight.baggage} onChange={e => set('baggage', e.target.value)} className={cls} placeholder="20 kg" /></Field>
          <Field label="Meals"><input value={flight.meals} onChange={e => set('meals', e.target.value)} className={cls} placeholder="At Extra Cost" /></Field>
          <Field label="Cabin"><input value={flight.cabin} onChange={e => set('cabin', e.target.value)} className={cls} placeholder="Economy" /></Field>
        </div>
      </div>
    </div>
  );
}

export default function FlightsEditor({ flights, onChange }) {
  const list = Array.isArray(flights) ? flights : [];

  const update = (idx, next) => onChange(list.map((f, i) => (i === idx ? next : f)));
  const remove = (idx) => onChange(list.filter((_, i) => i !== idx));
  const add = () => onChange([...list, { ...EMPTY_FLIGHT }]);

  return (
    <div className="border border-sky-200 bg-sky-50/40 rounded-lg p-4 space-y-3" data-testid="gt-flights-editor">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-sm text-gray-800 uppercase tracking-wide flex items-center gap-2">
          <Plane size={14} /> Flights ({list.length})
        </h3>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded"
          data-testid="gt-flights-add"
        >
          <Plus size={12} /> Add Flight
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-gray-500 italic">No flights configured. The public Flights tab will show the default amber banner.</p>
      ) : (
        <div className="space-y-3">
          {list.map((f, i) => (
            <FlightCard
              key={i}
              flight={f}
              idx={i}
              onChange={(next) => update(i, next)}
              onRemove={() => remove(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

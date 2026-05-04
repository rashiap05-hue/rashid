import React from 'react';
import { Plane, Briefcase, Utensils } from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const _fmtTime12 = (t24) => {
  if (!t24) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(t24);
  if (!m) return t24;
  let hh = parseInt(m[1], 10);
  const mm = m[2];
  const ap = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${String(hh).padStart(2, '0')}:${mm} ${ap}`;
};

const _fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const _isNextDay = (depDate, arrDate) => {
  if (!depDate || !arrDate || depDate === arrDate) return false;
  return new Date(arrDate) > new Date(depDate);
};

/* ── Single flight card (mirrors the brochure layout) ────────────────────── */
function FlightCard({ flight, idx }) {
  const f = flight || {};
  const nextDay = _isNextDay(f.departure_date, f.arrival_date);
  const fromAirport = `${f.from_airport || ''}${f.from_code ? ` (${f.from_code})` : ''}${f.from_terminal ? ` , Terminal ${f.from_terminal}` : ''}`.trim();
  const toAirport = `${f.to_airport || ''}${f.to_code ? ` (${f.to_code})` : ''}${f.to_terminal ? ` , Terminal ${f.to_terminal}` : ''}`.trim();

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white" data-testid={`pkg-flight-${idx}`}>
      {/* Route header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <Plane size={16} className="text-gray-700" />
        <span className="font-bold text-gray-900 text-sm md:text-base" data-testid={`pkg-flight-${idx}-route`}>
          {f.from_city || 'From'} to {f.to_city || 'To'}
        </span>
        <span className="text-xs md:text-sm text-gray-500 ml-2">{_fmtDate(f.departure_date)}</span>
      </div>

      {/* Airline strip */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        {f.airline_logo ? (
          <img src={f.airline_logo} alt={f.airline} className="h-6 w-auto max-w-[60px] object-contain" />
        ) : (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-rose-50 text-rose-500">
            <Plane size={14} />
          </span>
        )}
        <span className="font-bold text-gray-900 text-sm" data-testid={`pkg-flight-${idx}-airline`}>{f.airline || 'Airline'}</span>
        <span className="text-sm font-bold text-gray-800">{f.flight_number}</span>
      </div>

      {/* Body — 3 columns: timeline | dates | fare/baggage/meals/cabin */}
      <div className="px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 text-sm">
        {/* Timeline column */}
        <div className="lg:col-span-7 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {/* Dep row */}
          <div className="font-bold text-gray-900 self-center" data-testid={`pkg-flight-${idx}-dep-time`}>{_fmtTime12(f.departure_time)}</div>
          <div className="text-gray-600 truncate self-center">{fromAirport || '—'}</div>

          {/* Connector + duration */}
          <div className="flex justify-center">
            <span className="block w-px h-8 bg-gray-300 my-1" />
          </div>
          <div className="text-gray-700 font-bold py-1" data-testid={`pkg-flight-${idx}-duration`}>{f.duration || '—'}</div>

          {/* Arr row */}
          <div className="font-bold text-gray-900 self-center inline-flex items-baseline gap-1" data-testid={`pkg-flight-${idx}-arr-time`}>
            {_fmtTime12(f.arrival_time)}
            {nextDay && <sup className="text-[10px] text-rose-600 font-bold">+1</sup>}
          </div>
          <div className="text-gray-600 truncate self-center">{toAirport || '—'}</div>
        </div>

        {/* Dates column (sm: hidden, lg: visible) */}
        <div className="hidden lg:flex lg:col-span-2 flex-col justify-between text-gray-500 text-xs py-1">
          <span>{_fmtDate(f.departure_date)}</span>
          <span className="opacity-0 select-none">·</span>
          <span>{_fmtDate(f.arrival_date)}</span>
        </div>

        {/* Fare / baggage / meals / cabin column */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs lg:text-sm content-start">
          <span className="text-gray-500">Fare</span>
          <span className="font-bold text-gray-900 border-b border-dotted border-gray-400 inline-block w-fit">{f.fare || 'Basic'}</span>

          <span className="text-gray-500 inline-flex items-center gap-1.5"><Briefcase size={12} className="text-gray-400" /> Baggage</span>
          <span className="font-bold text-gray-900">{f.baggage || '—'}</span>

          <span className="text-gray-500 inline-flex items-center gap-1.5"><Utensils size={12} className="text-gray-400" /> Meals</span>
          <span className="font-bold text-gray-900">{f.meals || '—'}</span>

          <span className="text-gray-500">Cabin</span>
          <span className="font-bold text-gray-900">{f.cabin || 'Economy'}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Block — header + stack of flight cards ──────────────────────────────── */
export default function FlightsBlock({ flights }) {
  const list = Array.isArray(flights) ? flights : [];

  if (list.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3" data-testid="pkg-flights-banner">
        <Plane size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800 text-sm">Flights</p>
          <p className="text-sm text-amber-700 mt-0.5">
            To and Fro flights included upto AED 1,100 / pax booked.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="pkg-flights-block">
      <div className="flex items-center gap-2 text-gray-900">
        <Plane size={18} />
        <h3 className="text-base md:text-lg font-black">Flights</h3>
      </div>
      <div className="space-y-3">
        {list.map((f, i) => <FlightCard key={i} flight={f} idx={i} />)}
      </div>
    </div>
  );
}

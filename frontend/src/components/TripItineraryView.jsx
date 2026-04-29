import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Plane,
  Utensils,
  Coffee,
  CheckCircle2,
  XCircle,
  Car,
  User,
  Clock,
  Camera,
  Info,
} from 'lucide-react';
import { api } from '@/App';

/* ------------------- helpers ------------------- */
const fmtShort = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};
const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};
const addDays = (iso, n) => {
  if (!iso) return '';
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const mealsFromHotel = (hotel) => {
  const sel = hotel?.selectedRoom || hotel?.selected_room || {};
  const rp = sel.rate_plan || sel.ratePlan || {};
  const mp = String(
    rp.meal_plan || rp.mealPlan ||
    sel.meal_plan || sel.mealPlan || sel.meals ||
    hotel?.meal_plan || ''
  ).toLowerCase();
  const isBB = mp.includes('breakfast') || mp === 'bb';
  const isHB = mp.includes('half board') || mp === 'hb';
  const isFB = mp.includes('full board') || mp === 'fb';
  const isAI = mp.includes('all inclusive') || mp.includes('all-inclusive') || mp === 'ai';
  return {
    breakfast: isBB || isHB || isFB || isAI,
    lunch: mp.includes('lunch') || isFB || isAI,
    dinner: mp.includes('dinner') || isHB || isFB || isAI,
  };
};
const mealsFromActivity = (a) => {
  const m = a?.meals_included || {};
  const inc = (a?.inclusions || []).join(' ').toLowerCase();
  return {
    breakfast: !!(m.breakfast || inc.includes('breakfast')),
    lunch: !!(m.lunch || inc.includes('lunch')),
    dinner: !!(m.dinner || inc.includes('dinner')),
  };
};

/* parses op_note for "Driver: X | Phone: Y | Plate: Z" or freeform */
const parseDriverNote = (note) => {
  if (!note) return null;
  const out = { name: '', phone: '', plate: '' };
  const lower = note.toLowerCase();
  const match = (re) => {
    const m = note.match(re);
    return m ? m[1].trim() : '';
  };
  out.name = match(/driver\s*[:\-]\s*([^\n|;,]+)/i);
  out.phone = match(/(?:phone|contact|mobile|tel|whatsapp)\s*[:\-]?\s*([+\d\s()-]{6,})/i);
  out.plate = match(/(?:plate|car\s*no|vehicle\s*no)\s*[:\-]\s*([A-Z0-9 -]+)/i);
  if (!out.name && !out.phone && !out.plate && lower.length < 80 && /[a-zA-Z]/.test(note)) {
    // Freeform — show as name
    out.name = note;
  }
  return (out.name || out.phone || out.plate) ? out : null;
};

/* ------------------- LEFT RAIL: city-grouped card ------------------- */
const CityCard = ({ city, nights, hotel, dateIn, dateOut, active, onClick, dayNum, dateLabel }) => {
  const sel = hotel?.selectedRoom || hotel?.selected_room || {};
  const room = sel.name || sel.room_type || 'Standard Room';
  const stars = Number(hotel?.star_rating || hotel?.rating || 4);
  const img = hotel?.images?.[0] || hotel?.image || '';
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`itinerary-city-card-${city}`}
      className={`w-full text-left rounded-xl bg-white border-2 transition-all overflow-hidden ${active ? 'border-emerald-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
    >
      {/* Top: round image + day text */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-4">
        {img ? (
          <img src={img} alt={city} className="w-16 h-16 rounded-full object-cover flex-shrink-0 border border-gray-100" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-100 to-emerald-100 flex-shrink-0" />
        )}
        <div>
          <div className="text-2xl font-bold text-gray-900 leading-none">Day {dayNum}</div>
          <div className="text-sm text-gray-500 mt-1.5">{dateLabel}</div>
        </div>
      </div>

      <div className="px-5">
        <div className="border-t border-gray-100" />
      </div>

      {/* CHECK IN TO badge + nights/city */}
      <div className="px-5 py-4">
        <span className="inline-block bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded">
          Check in to
        </span>
        <div className="text-2xl font-bold text-gray-900 mt-3">
          {nights}N {city}
        </div>

        {/* Hotel hero image */}
        {img ? (
          <img src={img} alt={hotel?.name} className="w-full h-44 object-cover rounded mt-4" />
        ) : null}

        {/* Hotel name + stars */}
        <div className="mt-3">
          <div className="font-bold text-base text-gray-900">{hotel?.name || '—'}</div>
          <div className="text-amber-500 text-sm mt-0.5">{'★'.repeat(stars)}</div>
        </div>

        {/* Room */}
        <div className="mt-3">
          <div className="text-[11px] uppercase font-semibold text-gray-500 tracking-wider">Room</div>
          <div className="text-sm font-bold text-gray-800 mt-0.5">{room}</div>
        </div>

        <div className="border-t border-gray-200 my-4" />

        {/* Check-in / check-out grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] uppercase font-semibold text-gray-500 tracking-wider">Check-in</div>
            <div className="text-base font-bold text-gray-900 mt-0.5">02:00 PM</div>
            <div className="text-xs text-gray-500">{fmtDate(dateIn)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase font-semibold text-gray-500 tracking-wider">Check-out</div>
            <div className="text-base font-bold text-gray-900 mt-0.5">12:00 PM</div>
            <div className="text-xs text-gray-500">{fmtDate(dateOut)}</div>
          </div>
        </div>
      </div>
    </button>
  );
};

/* ------------------- RIGHT: Day section ------------------- */
const FlightLine = ({ flight, label }) => {
  if (!flight) return null;
  const num = flight.flight_number || flight.flight_no || flight.flightNumber || '';
  const airline = flight.airline || flight.airline_name || '';
  const date = flight.date || flight.arrival_date || flight.departure_date || '';
  const time = flight.arrival_time || flight.arrivalTime || flight.departure_time || flight.time || '';
  const airport = flight.arrival_airport || flight.from_airport || flight.airport || flight.to_airport || '';
  const isArrival = /arr/i.test(label);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm" data-testid={`itinerary-flight-${label}`}>
      <div className="flex items-center gap-3 text-gray-800">
        <Plane size={18} className="text-gray-700 flex-shrink-0" />
        <span>
          <span className="font-bold">{[airline, num].filter(Boolean).join(' ')}</span>
          {date ? <> - Flight {isArrival ? 'arriving' : 'departing'} on <span className="font-semibold">{fmtDate(date)}</span></> : null}
          {time ? <> at <span className="font-semibold">{time}</span></> : null}
          {airport ? <> - {airport}</> : null}
        </span>
      </div>
    </div>
  );
};

const TimePill = ({ time }) => {
  if (!time) return null;
  return (
    <div className="-mb-3 z-10 relative">
      <span className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded">
        <Clock size={12} /> {time}
      </span>
    </div>
  );
};

const TransferBlock = ({ transfer, title, confirmation, defaultPickupTime }) => {
  if (!transfer) return null;
  const t = transfer.title || transfer.name || title;
  const veh = (transfer.vehicle_type || transfer.selectedVehicle || transfer.vehicle || 'Private').toString();
  const isSic = veh.toLowerCase().includes('sic') || veh.toLowerCase().includes('sharing');
  const pickupTime = (confirmation?.pickup_time) || transfer.pickup_time || transfer.pickupTime || defaultPickupTime || '';
  const pickupInfo = transfer.pickup_info || transfer.pickup_location || 'Hotel';
  // Prefer structured fields written by the new Operational confirm modal,
  // fall back to op_note parsing for legacy entries.
  const parsed = parseDriverNote(confirmation?.op_note);
  const driverName = (confirmation?.driver_name || parsed?.name || '').trim();
  const driverPhone = (confirmation?.driver_phone || parsed?.phone || '').trim();
  const plate = (confirmation?.vehicle_plate || parsed?.plate || '').trim();
  const hasDriverInfo = driverName || driverPhone || plate;
  const sicLabel = veh.match(/sedan|suv|van|bus|car/i)?.[0]?.toUpperCase() || (isSic ? 'SIC' : 'CAR');

  return (
    <>
      <TimePill time={pickupTime} />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" data-testid="itinerary-transfer-block">
        {/* Header row */}
        <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <Car size={18} className="text-gray-800 mt-0.5 flex-shrink-0" />
            <span className="font-semibold text-gray-900 text-[15px] leading-snug">{t}</span>
          </div>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded border whitespace-nowrap ${
            isSic ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}>
            {isSic ? 'SIC' : 'Private'}
          </span>
        </div>

        {/* Pickup info / pickup time grid */}
        <div className="grid grid-cols-2 gap-6 px-5 py-4">
          <div>
            <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Pickup Information</div>
            <div className="text-base font-bold text-gray-900 mt-1">{pickupInfo}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Pickup Time</div>
            <div className="text-base font-bold text-gray-900 mt-1">{pickupTime || '—'}</div>
          </div>
        </div>

        {/* Driver block — shown whenever any structured driver field OR a parseable op_note is present */}
        {hasDriverInfo ? (
          <div className="mx-5 mb-5 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-[64px_1fr_1fr_1fr] gap-4 items-center">
              <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center text-gray-300">
                <User size={32} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Driver</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5 leading-tight">{driverName || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Driver Contact No</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">
                  {driverPhone ? <a href={`tel:${driverPhone}`} className="text-[#0066CC]">{driverPhone}</a> : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">{sicLabel.includes('CAR') ? sicLabel : `${sicLabel} CAR`}</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">{plate || '—'}</div>
              </div>
            </div>
          </div>
        ) : confirmation?.confirmation_number ? (
          <div className="mx-5 mb-5 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded text-[12px] text-emerald-800">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">Confirmation:</span> {confirmation.confirmation_number}
          </div>
        ) : null}
      </div>
    </>
  );
};

const ActivityBlock = ({ activity, confirmation }) => {
  const meals = mealsFromActivity(activity);
  const veh = (activity.selectedVehicle || activity.vehicle || activity.transfer_type || 'Private').toString();
  const isSic = veh.toLowerCase().includes('sic') || veh.toLowerCase().includes('shared') || veh.toLowerCase().includes('sharing');
  const useful = (activity.useful_information || activity.usefulInformation || []).filter(Boolean);
  const inc = (activity.inclusions || []).filter(Boolean);
  const desc = activity.description || '';
  const parsed = parseDriverNote(confirmation?.op_note);
  const driverName = (confirmation?.driver_name || parsed?.name || '').trim();
  const driverPhone = (confirmation?.driver_phone || parsed?.phone || '').trim();
  const plate = (confirmation?.vehicle_plate || parsed?.plate || '').trim();
  const hasDriverInfo = driverName || driverPhone || plate;
  const pickup = (confirmation?.pickup_time) || activity.pickup_time || activity.pickupTime || activity.start_times?.[0] || '';
  const pickupInfo = activity.pickup_info || activity.pickup_location || activity.meeting_point || 'Hotel - Lobby';
  const sicLabel = veh.match(/sedan|suv|van|bus|car|coach/i)?.[0]?.toUpperCase() || (isSic ? 'SIC' : 'CAR');

  return (
    <>
      <TimePill time={pickup} />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" data-testid="itinerary-activity-block">
        {/* Header row — camera icon + activity name + PRIVATE/SIC badge */}
        <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <Camera size={18} className="text-gray-800 mt-0.5 flex-shrink-0" />
            <span className="font-semibold text-gray-900 text-[15px] leading-snug">{activity.name}</span>
          </div>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded border whitespace-nowrap ${
            isSic ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}>
            {isSic ? 'SIC' : 'Private'}
          </span>
        </div>

        {/* Pickup info / pickup time grid */}
        <div className="grid grid-cols-2 gap-6 px-5 py-4">
          <div>
            <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Pickup Information</div>
            <div className="text-base font-bold text-gray-900 mt-1">{pickupInfo}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Pickup Time</div>
            <div className="text-base font-bold text-gray-900 mt-1">{pickup || '—'}</div>
          </div>
        </div>

        {/* Important info callout — dashed green border with bullet list */}
        {useful.length > 0 ? (
          <div className="mx-5 mb-4">
            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                <ul className="flex-1 list-disc pl-4 space-y-2 text-[13px] text-emerald-900 leading-relaxed">
                  {useful.slice(0, 8).map((u, i) => <li key={i}>{u}</li>)}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {/* Description + meal pills + inclusions (collapsible-style summary) */}
        {(desc || meals.breakfast || meals.lunch || meals.dinner || inc.length > 0 || activity.duration) ? (
          <div className="px-5 pb-4 space-y-3 text-sm">
            {activity.duration ? (
              <div className="text-[12px] text-gray-600 inline-flex items-center gap-1.5">
                <Clock size={12} /> Duration: <span className="font-semibold text-gray-800">{activity.duration}</span>
              </div>
            ) : null}
            {(meals.breakfast || meals.lunch || meals.dinner) ? (
              <div className="flex flex-wrap gap-2">
                {meals.breakfast ? <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Breakfast incl.</span> : null}
                {meals.lunch ? <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Lunch incl.</span> : null}
                {meals.dinner ? <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Dinner incl.</span> : null}
              </div>
            ) : null}
            {desc ? <p className="text-[13px] text-gray-700 leading-relaxed line-clamp-3">{desc}</p> : null}
            {inc.length > 0 ? (
              <div>
                <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider mb-1">Inclusions</div>
                <ul className="text-[12.5px] text-gray-700 list-disc pl-5 space-y-0.5">
                  {inc.slice(0, 8).map((i, j) => <li key={j}>{i}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Driver / contact / vehicle block (same 4-col layout as Transfer) */}
        {hasDriverInfo ? (
          <div className="border-t border-gray-100">
            <div className="px-5 py-4 grid grid-cols-[64px_1fr_1fr_1fr] gap-4 items-center">
              <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center text-gray-300">
                <User size={32} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Driver</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5 leading-tight">{driverName || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Driver Contact No</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">
                  {driverPhone ? <a href={`tel:${driverPhone}`} className="text-[#0066CC]">{driverPhone}</a> : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">{sicLabel.includes('CAR') ? sicLabel : `${sicLabel} CAR`}</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">{plate || '—'}</div>
              </div>
            </div>
          </div>
        ) : confirmation?.confirmation_number ? (
          <div className="mx-5 mb-5 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded text-[12px] text-emerald-800">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">Confirmation:</span> {confirmation.confirmation_number}
          </div>
        ) : null}
      </div>
    </>
  );
};

const MealRow = ({ label, included, Icon }) => (
  <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center justify-between" data-testid={`itinerary-meal-${label.toLowerCase()}`}>
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-gray-700" />
      <span className="font-semibold text-gray-900">{label}</span>
    </div>
    {included ? (
      <span className="inline-flex items-center gap-1.5 text-emerald-700 text-sm font-medium">
        <CheckCircle2 size={16} /> Included
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-rose-600 text-sm font-medium">
        <XCircle size={16} /> Not included
      </span>
    )}
  </div>
);

/* ------------------- main view ------------------- */
export default function TripItineraryView({ proposalId, bookingId, bookingRef, customerName, onBack }) {
  const [proposal, setProposal] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);
  const dayRefs = useRef({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pr, br] = await Promise.all([
          api.get(`/proposals/${proposalId}`),
          bookingId ? api.get(`/bookings/${bookingId}`).catch(() => null) : Promise.resolve(null),
        ]);
        if (alive) {
          setProposal(pr.data);
          if (br?.data) setBooking(br.data);
        }
      } catch (e) {
        console.error('Failed to load itinerary', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [proposalId, bookingId]);

  const sc = booking?.service_confirmations || {};
  const conf = (key) => sc[key] || null;

  // Build day list. Two kinds of days:
  //   (a) per-night day  -> belongs to a city, has a hotel
  //   (b) departure-only day after the last night
  const days = useMemo(() => {
    if (!proposal) return [];
    const out = [];
    const startDate = proposal.leaving_on || proposal.start_date;
    let cursor = 0;
    (proposal.cities || []).forEach((c, ci) => {
      const cityName = c?.name || c;
      const nights = Number(c?.nights || 0);
      const hotel = (proposal.selected_hotels || {})[`${cityName}_${ci}`];
      for (let n = 0; n < nights; n++) {
        out.push({
          idx: out.length,
          date: addDays(startDate, cursor),
          city: cityName,
          cityIdx: ci,
          hotel,
          cityNights: nights,
          isFirstNightOfCity: n === 0,
          isFirstNightOfTrip: ci === 0 && n === 0,
          isInterCityDay: n === 0 && ci > 0,
        });
        cursor += 1;
      }
    });
    out.push({
      idx: out.length,
      date: addDays(startDate, cursor),
      city: (proposal.cities?.[(proposal.cities?.length || 1) - 1]?.name) || '',
      cityIdx: (proposal.cities?.length || 1) - 1,
      isDeparture: true,
    });
    return out;
  }, [proposal]);

  // Group cities for left rail (one card per city stay)
  const cityStays = useMemo(() => {
    if (!proposal) return [];
    const startDate = proposal.leaving_on || proposal.start_date;
    let cursor = 0;
    return (proposal.cities || []).map((c, ci) => {
      const cityName = c?.name || c;
      const nights = Number(c?.nights || 0);
      const hotel = (proposal.selected_hotels || {})[`${cityName}_${ci}`];
      const dateIn = addDays(startDate, cursor);
      const dateOut = addDays(startDate, cursor + nights);
      const dayNum = cursor + 1;
      const dateLabel = fmtShort(dateIn);
      cursor += nights;
      return { city: cityName, cityIdx: ci, nights, hotel, dateIn, dateOut, dayNum, dateLabel };
    });
  }, [proposal]);

  // Scroll-spy: active day (threshold accounts for the dual sticky headers, ~160px)
  useEffect(() => {
    const onScroll = () => {
      let nearest = 1;
      let nearestDelta = Infinity;
      Object.entries(dayRefs.current).forEach(([d, el]) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const delta = Math.abs(r.top - 180);
        if (r.top < 260 && delta < nearestDelta) {
          nearestDelta = delta;
          nearest = Number(d);
        }
      });
      setActiveDay(nearest);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [days.length]);

  const scrollToDay = (n) => {
    const el = dayRefs.current[n];
    if (el) {
      // Scroll with offset to clear the dual sticky headers (~150px: 68 app + ~82 itinerary)
      const top = el.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading itinerary…</div>;
  if (!proposal) return <div className="p-12 text-center text-gray-500">Itinerary not available.</div>;

  const interCity = proposal.inter_city_transfers || {};
  const arrivalT = proposal.arrival_transfer;
  const departureT = proposal.departure_transfer;
  const arrivalFlight = proposal.arrival_flight_info || proposal.flight_info;
  const departureFlight = proposal.departure_flight_info;
  const selectedActivities = proposal.selected_activities || {};

  // For left-rail "active" highlight: which city is currently in view?
  const activeCityIdx = (() => {
    if (!days.length) return 0;
    const d = days[Math.min(activeDay - 1, days.length - 1)];
    return d?.cityIdx ?? 0;
  })();

  return (
    <div className="bg-gray-50 min-h-screen" data-testid="trip-itinerary-view">
      {/* Top bar — stickies below the global app Header (which is sticky top-0 z-50, ~68px tall) */}
      <div className="bg-[#1f1f1f] text-white sticky top-[68px] z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <button onClick={onBack} className="text-white/80 hover:text-white inline-flex items-center gap-1.5 text-sm" data-testid="itinerary-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="text-center flex-1 truncate text-sm font-bold tracking-wide">
            {bookingRef || ''}
            {customerName ? <> · <span className="opacity-90">{(customerName || '').toUpperCase()}</span></> : null}
          </div>
          <div className="w-12" />
        </div>
        <div className="border-t border-white/10 bg-[#2a2a2a]">
          <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-2 overflow-x-auto" data-testid="itinerary-day-nav">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => scrollToDay(i + 1)}
                className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  activeDay === i + 1 ? 'bg-emerald-500 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                data-testid={`itinerary-day-tab-${i + 1}`}
              >
                Day {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Left rail — one card per city; sticks below the itinerary nav (which sticks below the app header) */}
        <aside className="space-y-4 lg:sticky lg:top-[220px] lg:self-start lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto pb-6">
          {cityStays.map((cs, i) => (
            <CityCard
              key={i}
              city={cs.city}
              nights={cs.nights}
              hotel={cs.hotel}
              dateIn={cs.dateIn}
              dateOut={cs.dateOut}
              dayNum={cs.dayNum}
              dateLabel={cs.dateLabel}
              active={activeCityIdx === cs.cityIdx}
              onClick={() => {
                // Find first day for this city and scroll
                const targetDay = days.findIndex((d) => d.cityIdx === cs.cityIdx) + 1;
                if (targetDay) scrollToDay(targetDay);
              }}
            />
          ))}
        </aside>

        {/* Right rail — day sections */}
        <main className="space-y-6">
          {days.map((d, i) => {
            // Activity key uses 1-based day number, e.g. "Bangkok_1" = activity on Day 1
            const dayNum = i + 1;
            const cityKey = `${d.city}_${d.cityIdx}`;
            const activityKey = `${d.city}_${dayNum}`;
            const acts = (selectedActivities[activityKey] || selectedActivities[cityKey] || []);
            const actList = Array.isArray(acts) ? acts : [acts].filter(Boolean);

            // Title for the day
            let title;
            if (d.isFirstNightOfTrip) title = `Arrive in ${d.city}`;
            else if (d.isInterCityDay) title = `Transfer to ${d.city}`;
            else if (d.isDeparture) title = `Departure from ${d.city}`;
            else title = `Day in ${d.city}`;

            // Roll up meals
            const meals = mealsFromHotel(d.hotel);
            actList.forEach((a) => {
              const m = mealsFromActivity(a);
              meals.breakfast = meals.breakfast || m.breakfast;
              meals.lunch = meals.lunch || m.lunch;
              meals.dinner = meals.dinner || m.dinner;
            });

            const interKey = `${d.cityIdx - 1}_${d.cityIdx}`;
            const interTransfer = d.isInterCityDay ? interCity[interKey] : null;

            return (
              <section
                key={i}
                ref={(el) => { dayRefs.current[i + 1] = el; }}
                data-testid={`itinerary-day-section-${i + 1}`}
                className="space-y-4"
              >
                {/* Day header */}
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-sm font-semibold text-gray-500">Day {i + 1}</span>
                  <h2 className="text-2xl font-bold text-gray-900 leading-none">{title}</h2>
                  <span className="ml-auto text-xs text-gray-500">{fmtShort(d.date)}</span>
                </div>

                {/* Day content */}
                <div className="space-y-4">
                  {d.isFirstNightOfTrip ? <FlightLine flight={arrivalFlight} label="Arrival flight" /> : null}
                  {d.isFirstNightOfTrip ? (
                    <TransferBlock
                      transfer={arrivalT}
                      title="Arrival Transfer"
                      confirmation={conf('transfer:arrival')}
                      defaultPickupTime={arrivalFlight?.arrival_time || arrivalFlight?.arrivalTime}
                    />
                  ) : null}
                  {d.isInterCityDay && interTransfer ? (
                    <TransferBlock
                      transfer={interTransfer}
                      title="Inter-city Transfer"
                      confirmation={conf(`transfer:inter:${interKey}`)}
                    />
                  ) : null}
                  {/* Activities (skip for departure) */}
                  {!d.isDeparture && actList.length > 0 ? actList.map((a, j) => (
                    <ActivityBlock
                      key={j}
                      activity={a}
                      confirmation={conf(`activity:${activityKey}#${j}`) || conf(`activity:${activityKey}`) || conf(`activity:${cityKey}#${j}`) || conf(`activity:${cityKey}`)}
                    />
                  )) : null}
                  {d.isDeparture ? (
                    <>
                      <TransferBlock
                        transfer={departureT}
                        title="Departure Transfer"
                        confirmation={conf('transfer:departure')}
                        defaultPickupTime={departureFlight?.departure_time}
                      />
                      <FlightLine flight={departureFlight} label="Departure flight" />
                    </>
                  ) : null}

                  {/* Meal rows */}
                  {!d.isDeparture ? (
                    <div className="space-y-3 pt-2">
                      <MealRow label="Breakfast" included={meals.breakfast} Icon={Utensils} />
                      <MealRow label="Lunch" included={meals.lunch} Icon={Utensils} />
                      <MealRow label="Dinner" included={meals.dinner} Icon={Coffee} />
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}

          {/* Footer */}
          <div className="text-[11px] text-gray-500 leading-relaxed bg-white border border-gray-200 rounded-xl p-5 mt-4">
            <p className="font-semibold text-gray-700 mb-2">Important Notes</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>The timing of trips and stays are subject to change depending on local conditions; any changes will be informed by the local operator.</li>
              <li>Standard hotel check-in is at 14:00 and check-out at 12:00. Early check-in / late check-out is subject to availability.</li>
              <li>Transfers are scheduled based on flight timings; please be ready in the lobby 15 minutes before pick-up.</li>
              <li>All meal inclusions are as per the hotel's meal plan and any activity inclusions noted above.</li>
              <li>Country guidelines may change without notice — please verify visa and entry requirements for your destination before travel.</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}

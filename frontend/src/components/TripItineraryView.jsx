import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Plane,
  Sun,
  Utensils,
  Moon,
  Bed,
  Car,
  MapPin,
  CalendarDays,
  Hotel,
  Clock,
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

/* ------------------- left rail mini-card ------------------- */
const DayCard = ({ idx, date, city, hotel, isArrival, isDeparture, meals, active, onClick }) => {
  const sel = hotel?.selectedRoom || hotel?.selected_room || {};
  const room = sel.name || sel.room_type || 'Standard Room';
  const img = hotel?.images?.[0] || hotel?.image || '';
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`itinerary-day-card-${idx + 1}`}
      className={`w-full text-left rounded-lg border transition-all overflow-hidden group ${
        active ? 'border-[#7c3015] shadow-md ring-1 ring-[#7c3015]/30' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="bg-[#7c3015] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 flex items-center justify-between">
        <span>Day {idx + 1}</span>
        <span className="opacity-90">{fmtShort(date).split(',')[0]}</span>
      </div>
      <div className="px-3 py-2.5 bg-white">
        <div className="text-[11px] font-semibold text-gray-700">{fmtShort(date)}</div>
        <div className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1">
          <MapPin size={10} /> {city || '—'}
        </div>
      </div>
      {isArrival ? (
        <div className="bg-[#7c3015] text-white text-center text-[10px] font-bold uppercase tracking-wider py-1">
          Arrive in {city}
        </div>
      ) : isDeparture ? (
        <div className="bg-[#7c3015] text-white text-center text-[10px] font-bold uppercase tracking-wider py-1">
          Depart from {city}
        </div>
      ) : null}
      {hotel ? (
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/40">
          {img ? (
            <img src={img} alt={hotel.name} className="w-full h-16 object-cover rounded mb-1.5" />
          ) : null}
          <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Hotel</div>
          <div className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2">{hotel.name}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">{room}</div>
        </div>
      ) : null}
      <div className="flex border-t border-gray-100 bg-white">
        {[
          { key: 'breakfast', Icon: Sun, on: meals.breakfast },
          { key: 'lunch', Icon: Utensils, on: meals.lunch },
          { key: 'dinner', Icon: Moon, on: meals.dinner },
        ].map(({ key, Icon, on }) => (
          <div key={key} className="flex-1 flex justify-center py-1.5">
            <Icon size={12} className={on ? 'text-emerald-600' : 'text-gray-300'} />
          </div>
        ))}
      </div>
    </button>
  );
};

/* ------------------- right side day section ------------------- */
const ConfirmationLine = ({ entry }) => {
  if (!entry) return null;
  const status = entry.status || 'pending';
  const num = entry.confirmation_number;
  const note = (entry.op_note || '').trim();
  if (status !== 'confirmed' && !num && !note) {
    return (
      <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2 inline-flex items-center gap-1.5">
        <Clock size={11} /> Awaiting confirmation
      </div>
    );
  }
  return (
    <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 mt-2 space-y-1">
      {num ? <div><span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">Confirmation:</span> {num}</div> : null}
      {note ? <div className="text-emerald-900 whitespace-pre-wrap"><span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">Operations note:</span> {note}</div> : null}
    </div>
  );
};

const MealStrip = ({ meals }) => (
  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
    {[
      { key: 'breakfast', label: 'Breakfast', Icon: Sun },
      { key: 'lunch', label: 'Lunch', Icon: Utensils },
      { key: 'dinner', label: 'Dinner', Icon: Moon },
    ].map(({ key, label, Icon }) => (
      <div key={key} className="flex items-center gap-2 text-xs">
        <Icon size={14} className={meals[key] ? 'text-emerald-600' : 'text-gray-300'} />
        <span className={meals[key] ? 'text-gray-800 font-medium' : 'text-gray-400'}>
          {label}: {meals[key] ? 'Included' : 'Not included'}
        </span>
      </div>
    ))}
  </div>
);

const FlightCard = ({ flight, label, confirmation }) => {
  if (!flight) return null;
  const airline = flight.airline || flight.airline_name || '';
  const num = flight.flight_number || flight.flight_no || flight.flightNumber || '';
  const date = flight.date || flight.departure_date || flight.arrival_date || '';
  const dep = flight.departure_airport || flight.from || flight.from_airport || '';
  const arr = flight.arrival_airport || flight.to || flight.to_airport || '';
  const depTime = flight.departure_time || flight.departureTime || '';
  const arrTime = flight.arrival_time || flight.arrivalTime || flight.time || '';
  const terminal = flight.terminal || '';
  return (
    <div className="px-4 py-3 bg-blue-50/40 border border-blue-100 rounded-lg" data-testid={`itinerary-flight-${label}`}>
      <div className="flex items-start gap-3">
        <Plane size={18} className="text-[#0066CC] mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-sm text-gray-800">
          <div className="font-semibold flex flex-wrap items-center gap-2">
            <span>{airline || 'Flight'} {num}</span>
            {date ? <span className="text-xs text-gray-500 font-normal">· {fmtShort(date)}</span> : null}
          </div>
          {(dep || arr) ? (
            <div className="text-xs text-gray-600 mt-1">
              {dep ? <span className="font-semibold">{dep}</span> : null}
              {depTime ? <span className="text-gray-500"> {depTime}</span> : null}
              {(dep && arr) ? <span className="mx-1.5 text-gray-400">→</span> : null}
              {arr ? <span className="font-semibold">{arr}</span> : null}
              {arrTime ? <span className="text-gray-500"> {arrTime}</span> : null}
            </div>
          ) : (arrTime ? <div className="text-xs text-gray-600 mt-1">Arrives {arrTime}</div> : null)}
          {terminal ? <div className="text-[11px] text-gray-500 mt-0.5">Terminal: {terminal}</div> : null}
          <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-1 font-bold">{label}</div>
        </div>
      </div>
      <ConfirmationLine entry={confirmation} />
    </div>
  );
};

const TransferCard = ({ transfer, title, confirmation }) => {
  if (!transfer) return null;
  const t = transfer.title || transfer.name || title;
  const veh = transfer.vehicle_type || transfer.selectedVehicle || transfer.vehicle || 'Private';
  const dur = transfer.duration || '';
  const from = transfer.from_location || transfer.from_city || transfer.from || '';
  const to = transfer.to_location || transfer.to_city || transfer.to || '';
  const pickup = transfer.pickup_time || transfer.pickupTime || '';
  const supplier = transfer.supplier_name || transfer.supplier || '';
  const supplierPhone = transfer.supplier_phone || transfer.phone || '';
  return (
    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg" data-testid="itinerary-transfer-card">
      <div className="flex items-start gap-3">
        <Car size={18} className="text-[#7c3015] mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-gray-800 leading-snug">{t}</div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded whitespace-nowrap">{veh.toString().includes('SIC') ? 'SIC' : 'Private'}</span>
          </div>
          {(from || to) ? (
            <div className="text-xs text-gray-600 mt-1">
              {from ? <span className="font-semibold">{from}</span> : null}
              {(from && to) ? <span className="mx-1.5 text-gray-400">→</span> : null}
              {to ? <span className="font-semibold">{to}</span> : null}
            </div>
          ) : null}
          <div className="text-xs text-gray-500 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1"><Bed size={11} />{veh}</span>
            {dur ? <span className="inline-flex items-center gap-1"><Clock size={11} />{dur}</span> : null}
            {pickup ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Clock size={11} />Pickup {pickup}</span> : null}
          </div>
          {supplier ? <div className="text-[11px] text-gray-600 mt-1"><span className="font-semibold">Operator:</span> {supplier}{supplierPhone ? <> · <a href={`tel:${supplierPhone}`} className="text-[#0066CC]">{supplierPhone}</a></> : null}</div> : null}
        </div>
      </div>
      <ConfirmationLine entry={confirmation} />
    </div>
  );
};

const HotelCard = ({ hotel, nights, checkIn, checkOut, confirmation }) => {
  if (!hotel) return null;
  const sel = hotel?.selectedRoom || hotel?.selected_room || {};
  const room = sel.name || sel.room_type || 'Standard Room';
  const stars = Number(hotel.star_rating || hotel.rating || 4);
  const rp = sel.rate_plan || sel.ratePlan || {};
  const mealPlan = rp.meal_plan || rp.mealPlan || sel.meals || hotel?.meal_plan || 'Room Only';
  const address = hotel.address || hotel.location || '';
  const phone = hotel.phone || hotel.contact_number || '';
  const bedType = sel.bed_type || sel.bedType || '';
  const refundable = rp.refundable || sel.refundable;
  const refundUntil = rp.refund_deadline || sel.refundable_until;
  const amenities = (hotel.amenities || []).slice(0, 6);
  return (
    <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg" data-testid="itinerary-hotel-card">
      <div className="flex items-start gap-3">
        <Hotel size={18} className="text-[#7c3015] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-800">{hotel.name}</span>
            <span className="text-amber-500 text-xs">{'★'.repeat(stars)}</span>
          </div>
          <div className="text-xs text-gray-600 mt-0.5">{room}{bedType ? ` · ${bedType}` : ''} · {mealPlan}</div>
          {address ? (
            <div className="text-[11px] text-gray-500 mt-1 flex items-start gap-1">
              <MapPin size={11} className="mt-0.5 flex-shrink-0" />
              <span>{address}</span>
            </div>
          ) : null}
          {phone ? (
            <div className="text-[11px] text-gray-600 mt-0.5">
              <span className="font-semibold">Phone:</span> <a href={`tel:${phone}`} className="text-[#0066CC]">{phone}</a>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
            <div className="text-gray-600"><span className="font-semibold">Check-in:</span> {fmtShort(checkIn)} · 14:00</div>
            <div className="text-gray-600"><span className="font-semibold">Check-out:</span> {fmtShort(checkOut)} · 12:00</div>
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-3">
            <span>{nights} night{nights > 1 ? 's' : ''}</span>
            {refundable === false ? (
              <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-semibold">Non-refundable</span>
            ) : refundUntil ? (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">Refundable until {fmtShort(refundUntil)}</span>
            ) : null}
          </div>
          {amenities.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-2">
              {amenities.map((am, i) => (
                <span key={i} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{am}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <ConfirmationLine entry={confirmation} />
    </div>
  );
};

const ActivityCard = ({ activity, confirmation }) => {
  const meals = mealsFromActivity(activity);
  const veh = activity.selectedVehicle || activity.vehicle || 'Private';
  const inc = (activity.inclusions || []).filter(Boolean);
  const desc = activity.description || '';
  const supplier = activity.supplier_name || activity.supplier || '';
  const supplierPhone = activity.supplier_phone || activity.phone || '';
  const pickup = activity.pickup_time || activity.pickupTime || '';
  const meeting = activity.meeting_point || activity.meetingPoint || '';
  return (
    <div className="px-4 py-3 bg-emerald-50/30 border border-emerald-100 rounded-lg" data-testid="itinerary-activity-card">
      <div className="flex items-start gap-3">
        <CalendarDays size={18} className="text-emerald-700 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-sm text-gray-800">{activity.name}</div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-white border border-emerald-200 px-2 py-1 rounded whitespace-nowrap">{veh}</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {activity.duration ? <span className="inline-flex items-center gap-1"><Clock size={11} /> {activity.duration}</span> : null}
            {pickup ? <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Clock size={11} /> Pickup {pickup}</span> : null}
          </div>
          {meeting ? <div className="text-[11px] text-gray-600 mt-1"><span className="font-semibold">Meeting point:</span> {meeting}</div> : null}
          {desc ? <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed line-clamp-3">{desc}</p> : null}
          {(meals.breakfast || meals.lunch || meals.dinner) ? (
            <div className="flex gap-2 mt-2 flex-wrap">
              {meals.breakfast ? <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">Breakfast incl.</span> : null}
              {meals.lunch ? <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">Lunch incl.</span> : null}
              {meals.dinner ? <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">Dinner incl.</span> : null}
            </div>
          ) : null}
          {inc.length > 0 ? (
            <div className="mt-2">
              <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider mb-1">Inclusions</div>
              <ul className="text-[11px] text-gray-700 list-disc pl-4 space-y-0.5">
                {inc.slice(0, 6).map((i, j) => <li key={j}>{i}</li>)}
              </ul>
            </div>
          ) : null}
          {supplier ? <div className="text-[11px] text-gray-600 mt-2"><span className="font-semibold">Operator:</span> {supplier}{supplierPhone ? <> · <a href={`tel:${supplierPhone}`} className="text-[#0066CC]">{supplierPhone}</a></> : null}</div> : null}
        </div>
      </div>
      <ConfirmationLine entry={confirmation} />
    </div>
  );
};

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
        console.error('Failed to load proposal for itinerary', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [proposalId, bookingId]);

  // service_confirmations lookup helper
  const sc = booking?.service_confirmations || {};
  const conf = (key) => sc[key] || null;

  // Build a flat day list: [{idx, date, city, cityIdx, hotel, isArrival, isDeparture, ...}]
  const days = useMemo(() => {
    if (!proposal) return [];
    const out = [];
    const startDate = proposal.leaving_on || proposal.start_date;
    let cursor = 0;
    (proposal.cities || []).forEach((c, ci) => {
      const cityName = c?.name || c;
      const nights = Number(c?.nights || 0);
      const hotel = (proposal.selected_hotels || {})[`${cityName}_${ci}`];
      const totalCities = (proposal.cities || []).length;
      for (let n = 0; n < nights; n++) {
        const isArrival = ci === 0 && n === 0;
        const isCheckIn = n === 0;
        const isLastNightOfCity = n === nights - 1;
        // departure from final city (after the last night) is its own row;
        // here we treat each night as a stay row
        out.push({
          idx: out.length,
          date: addDays(startDate, cursor),
          city: cityName,
          cityIdx: ci,
          hotel,
          nights,
          isArrival,
          isCheckIn,
          isInterCityNight: isCheckIn && ci > 0,
          isLastNightOfCity,
          isDeparture: false,
          isFinalCity: ci === totalCities - 1,
        });
        cursor += 1;
      }
    });
    // Add a final departure-only row if there's a departure flight or we want a "Departure" card
    out.push({
      idx: out.length,
      date: addDays(startDate, cursor),
      city: (proposal.cities?.[(proposal.cities?.length || 1) - 1]?.name) || '',
      cityIdx: (proposal.cities?.length || 1) - 1,
      hotel: null,
      isDeparture: true,
      isArrival: false,
      isCheckIn: false,
      isLastNightOfCity: false,
      isFinalCity: true,
    });
    return out;
  }, [proposal]);

  // Scroll-spy: update activeDay as user scrolls
  useEffect(() => {
    const onScroll = () => {
      let nearest = 1;
      let nearestDelta = Infinity;
      Object.entries(dayRefs.current).forEach(([d, el]) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const delta = Math.abs(r.top - 120);
        if (r.top < 200 && delta < nearestDelta) {
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
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading itinerary…</div>;
  }
  if (!proposal) {
    return <div className="p-12 text-center text-gray-500">Itinerary not available.</div>;
  }

  const interCity = proposal.inter_city_transfers || {};
  const arrivalT = proposal.arrival_transfer;
  const departureT = proposal.departure_transfer;
  const arrivalFlight = proposal.arrival_flight_info || proposal.flight_info;
  const departureFlight = proposal.departure_flight_info;
  const selectedActivities = proposal.selected_activities || {};

  return (
    <div className="bg-gray-50 min-h-screen" data-testid="trip-itinerary-view">
      {/* Top bar */}
      <div className="bg-[#1f1f1f] text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="text-white/80 hover:text-white inline-flex items-center gap-1.5 text-sm"
            data-testid="itinerary-back-btn"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="text-center flex-1 truncate">
            <span className="text-sm font-bold tracking-wide">
              {bookingRef || ''}
              {customerName ? <> · <span className="opacity-90">{(customerName || '').toUpperCase()}</span></> : null}
            </span>
          </div>
          <div className="w-12" />
        </div>
        {/* Day nav strip */}
        <div className="border-t border-white/10 bg-[#2a2a2a]">
          <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-2 overflow-x-auto" data-testid="itinerary-day-nav">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => scrollToDay(i + 1)}
                className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  activeDay === i + 1
                    ? 'bg-[#7c3015] text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                data-testid={`itinerary-day-tab-${i + 1}`}
              >
                Day {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Left rail */}
        <aside className="space-y-2 lg:sticky lg:top-[120px] lg:self-start lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto pb-6">
          {days.map((d, i) => {
            // meals roll-up: hotel + activities for this city/day
            const hotelMeals = mealsFromHotel(d.hotel);
            const cityKey = `${d.city}_${d.cityIdx}`;
            const acts = (selectedActivities[cityKey] || selectedActivities[`${d.city}_${i}`]) || [];
            const actList = Array.isArray(acts) ? acts : [acts];
            actList.forEach((a) => {
              const m = mealsFromActivity(a);
              hotelMeals.breakfast = hotelMeals.breakfast || m.breakfast;
              hotelMeals.lunch = hotelMeals.lunch || m.lunch;
              hotelMeals.dinner = hotelMeals.dinner || m.dinner;
            });
            return (
              <DayCard
                key={i}
                idx={i}
                date={d.date}
                city={d.city}
                hotel={d.hotel}
                isArrival={d.isArrival}
                isDeparture={d.isDeparture}
                meals={hotelMeals}
                active={activeDay === i + 1}
                onClick={() => scrollToDay(i + 1)}
              />
            );
          })}
        </aside>

        {/* Right detail */}
        <main className="space-y-5">
          {days.map((d, i) => {
            const cityKey = `${d.city}_${d.cityIdx}`;
            const acts = (selectedActivities[cityKey] || []);
            const actList = Array.isArray(acts) ? acts : [acts].filter(Boolean);
            // Day section title
            let title = `Day in ${d.city}`;
            if (d.isArrival) title = `Arrive in ${d.city}`;
            else if (d.isInterCityNight) title = `Transfer to ${d.city}`;
            else if (d.isDeparture) title = `Departure from ${d.city}`;

            // Roll-up meals for the strip
            const meals = mealsFromHotel(d.hotel);
            actList.forEach((a) => {
              const m = mealsFromActivity(a);
              meals.breakfast = meals.breakfast || m.breakfast;
              meals.lunch = meals.lunch || m.lunch;
              meals.dinner = meals.dinner || m.dinner;
            });

            const interKey = `${d.cityIdx - 1}_${d.cityIdx}`;
            const interTransfer = d.isInterCityNight ? interCity[interKey] : null;

            // Figure out city's check-in / check-out for hotel card on first night
            const cityFirstDayIdx = days.findIndex((x) => x.cityIdx === d.cityIdx);
            const cityNights = (proposal.cities || [])[d.cityIdx]?.nights || 0;
            const cityCheckIn = days[cityFirstDayIdx]?.date;
            const cityCheckOut = addDays(cityCheckIn, cityNights);

            return (
              <section
                key={i}
                ref={(el) => { dayRefs.current[i + 1] = el; }}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                data-testid={`itinerary-day-section-${i + 1}`}
              >
                <div className="px-5 py-3 bg-gradient-to-r from-[#fff8f4] to-white border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-[#7c3015]">Day {i + 1}</div>
                      <h3 className="text-base font-bold text-gray-900">{title}</h3>
                    </div>
                    <div className="text-xs text-gray-500">{fmtShort(d.date)}</div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {/* Day 1 arrival flight + arrival transfer */}
                  {d.isArrival ? (
                    <>
                      <FlightCard flight={arrivalFlight} label="Arrival flight" confirmation={conf('flight:arrival')} />
                      <TransferCard transfer={arrivalT} title="Arrival Transfer" confirmation={conf('transfer:arrival')} />
                    </>
                  ) : null}

                  {/* Inter-city transfer day */}
                  {d.isInterCityNight && interTransfer ? (
                    <TransferCard transfer={interTransfer} title="Inter-city Transfer" confirmation={conf(`transfer:inter:${d.cityIdx - 1}_${d.cityIdx}`)} />
                  ) : null}

                  {/* Hotel card (only on first night of city, to avoid duplication) */}
                  {d.isCheckIn && d.hotel ? (
                    <HotelCard
                      hotel={d.hotel}
                      nights={cityNights}
                      checkIn={cityCheckIn}
                      checkOut={cityCheckOut}
                      confirmation={conf(`hotel:${d.city}_${d.cityIdx}`)}
                    />
                  ) : null}

                  {/* Activities for the day */}
                  {!d.isDeparture && actList.length > 0 ? (
                    actList.map((a, j) => <ActivityCard key={j} activity={a} confirmation={conf(`activity:${cityKey}#${j}`) || conf(`activity:${cityKey}`)} />)
                  ) : null}

                  {/* Departure flight + transfer */}
                  {d.isDeparture ? (
                    <>
                      <TransferCard transfer={departureT} title="Departure Transfer" confirmation={conf('transfer:departure')} />
                      <FlightCard flight={departureFlight} label="Departure flight" confirmation={conf('flight:departure')} />
                    </>
                  ) : null}

                  {/* Meal status (skip on departure-only row) */}
                  {!d.isDeparture ? <MealStrip meals={meals} /> : null}
                </div>
              </section>
            );
          })}

          {/* Footer fine print */}
          <div className="text-[10px] text-gray-500 leading-relaxed bg-white border border-gray-200 rounded-xl p-5">
            <p className="font-semibold text-gray-700 mb-2">Important Notes</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>The timing of the trips and stays are subject to change depending upon the local conditions; any changes will be informed by the local operator.</li>
              <li>You are taking the trip at your own consent. We are not liable for any unforeseen events.</li>
              <li>Hotel rooms are subject to availability at the time of booking confirmation. Standard check-in is at 14:00 and check-out at 12:00.</li>
              <li>Any special requests (early check-in, late check-out, room type) will be requested but not guaranteed.</li>
              <li>Transfers are scheduled based on flight timings; please be ready in the lobby 15 minutes before pick-up.</li>
              <li>All meal inclusions are as per the hotel's meal plan and any activity inclusions noted above.</li>
              <li>Country guidelines may change without notice — please verify visa and entry requirements with the regulatory website of the destination country before travel.</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}

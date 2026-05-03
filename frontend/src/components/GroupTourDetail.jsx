import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Star, MapPin, Calendar, Users,
  Coffee, Utensils, Moon, Bed, Plane, Check, X, Info, ChevronDown,
} from 'lucide-react';
import { api } from '@/App';
import ActivityDetailModal from './ActivityDetailModal';

/* ---------- Fallback-safe image ---------- */
function DealImage({ src, alt, gradient, label, className }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className={className} style={{ background: gradient || 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)' }}>
        <div className="w-full h-full flex items-end p-4">
          <span className="text-white font-black text-lg drop-shadow">{label}</span>
        </div>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />;
}

/* ---------- Package content: prefer backend data, fall back to template ---------- */
function buildPackage(deal) {
  const destination = deal?.destination || (deal?.subtitle || '').split(' ')[0] || 'Baku';
  const nights = Number(deal?.nights) || parseInt((deal?.subtitle || '').match(/(\d+)\s*night/i)?.[1] || '4', 10);

  // Prefer backend-provided itinerary/hotels/etc when present. Fall back to
  // the previous destination-based template for older packages.
  const highlights = (deal?.highlights && deal.highlights.length) ? deal.highlights : [
    `Discover the Top Attractions of ${destination} with a Licensed Tour Guide`,
    `Dive into Local Culture — Traditional Food, Arts & Architecture`,
    'Enjoy Comfortable Stays at 3–5 Star Hotels with Daily Breakfast',
    'Seamless Private Arrival & Departure Airport Transfers',
    'Scenic Day Tours Including Local Landmarks and Hidden Gems',
    'Shopping & Leisure Time at the Most Famous Bazaars & Malls',
  ];

  // Backend now returns itinerary as { day, title, desc, meals, hotel_note,
  // date, activities[{id,name,image,sub,duration}], transfer_label }.
  // Detail page expects { day, title, desc, meal, hotel, date, activities, transfer } — map keys.
  const itinerary = (deal?.itinerary && deal.itinerary.length)
    ? deal.itinerary.map(d => ({
        day: d.day,
        title: d.title,
        desc: d.desc,
        meal: d.meals || [],
        hotel: d.hotel_note || null,
        date: d.date || null,
        activities: Array.isArray(d.activities) ? d.activities : [],
        transfer: d.transfer_label || null,
      }))
    : [
        { day: 1, title: `Arrival in ${destination}`, desc: `On arrival at ${destination} International Airport, our representative will welcome you and transfer you to the hotel for check-in. Relax and spend the evening at leisure. Enjoy dinner at your leisure before retiring for the night.`, meal: ['D'], hotel: 'Check-in to the hotel' },
        { day: 2, title: `Full Day ${destination} City Tour`, desc: `After breakfast, embark on a guided ${destination} city tour covering the Old City, cultural landmarks, religious monuments and viewpoints with panoramic city vistas. Enjoy lunch at a traditional restaurant before heading back to the hotel.`, meal: ['B', 'L'], hotel: `Overnight stay at hotel in ${destination}` },
        { day: 3, title: 'Day Trip to Mountains & Countryside', desc: `Full-day excursion to the countryside. Visit UNESCO-listed heritage sites, natural reservoirs, tea gardens and enjoy cable-car rides with stunning mountain views. Return to ${destination} for a relaxed evening.`, meal: ['B', 'L'], hotel: `Overnight stay at hotel in ${destination}` },
        { day: 4, title: 'Shopping & Leisure Day', desc: `Morning is at leisure for personal activities. In the afternoon, a guided shopping tour at the most popular malls, handicraft streets and bazaars. Evening dinner at a traditional restaurant with live music & cultural performance.`, meal: ['B', 'D'], hotel: `Overnight stay at hotel in ${destination}` },
        ...(nights >= 5 ? [{ day: 5, title: `Optional Tour - ${destination} Night Experience`, desc: `Optional evening tour including rooftop city viewpoints, night cruise and dinner at a signature local restaurant. Overnight back at hotel.`, meal: ['B'], hotel: `Overnight stay at hotel in ${destination}` }] : []),
        { day: nights + 1, title: `Departure from ${destination}`, desc: `After breakfast at the hotel, check-out at the scheduled time. Our representative will transfer you to ${destination} International Airport for your return flight home.`, meal: ['B'], hotel: null },
      ];

  const hotels = (deal?.hotels && deal.hotels.length)
    ? deal.hotels.map(h => ({ name: h.name, stars: h.stars, nights: h.nights, image: h.image || deal?.image, roomType: h.room_type || 'Standard Room', meal: h.meal_plan || 'Bed & Breakfast' }))
    : [
        { name: `Park Inn by Radisson ${destination} or similar`, stars: 4, nights, image: deal?.image, roomType: 'Standard Twin Room', meal: 'Bed & Breakfast' },
        { name: `Holiday Inn ${destination} or similar`, stars: 4, nights: Math.max(1, nights - 2), image: deal?.image, roomType: 'Superior Room', meal: 'Bed & Breakfast' },
        { name: `Hilton Garden Inn ${destination} or similar`, stars: 4, nights: 2, image: deal?.image, roomType: 'Guest Room', meal: 'Bed & Breakfast' },
      ];

  const inclusions = (deal?.inclusions && Object.keys(deal.inclusions).length) ? deal.inclusions : {
    Accommodation: [
      `${nights} nights' accommodation at selected hotels`,
      'Daily buffet breakfast at the hotel',
      'Check-in from 14:00 hrs & Check-out until 12:00 hrs',
    ],
    Transfers: [
      'Private airport pick-up on arrival',
      'Private airport drop-off on departure',
      'All inter-city transfers by A/C private vehicle',
    ],
    Sightseeing: [
      `Full Day ${destination} City Tour with guide`,
      'Day trip with entrance fees as per itinerary',
      'Professional English-speaking tour guide',
    ],
    Miscellaneous: [
      'All applicable taxes and service charges',
      'Tourist tax included in hotel rate',
    ],
  };

  const exclusions = (deal?.exclusions && deal.exclusions.length) ? deal.exclusions : [
    'International airfare (Tickets can be booked separately)',
    'Visa fees and travel insurance',
    'Lunches and dinners unless specified',
    'Any optional tours, personal expenses, tips and gratuities',
  ];

  const what_to_expect = (deal?.what_to_expect && deal.what_to_expect.length) ? deal.what_to_expect : null;
  const intro_paragraph = deal?.intro_paragraph || `This trip by Travo Tours is a handpicked experience featuring ${destination}. Enjoy panoramic landscapes, cultural landmarks, and comfortable stays in boutique hotels.`;

  const similar = [
    { id: 'baku', title: 'Baku Eid Break', city: 'Baku', nights: 4, price: 3293, gradient: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)' },
    { id: 'tbilisi', title: 'Tbilisi Eid Break', city: 'Tbilisi', nights: 4, price: 3544, gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' },
    { id: 'almaty', title: 'Almaty Eid Break', city: 'Almaty', nights: 5, price: 3738, gradient: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)' },
    { id: 'armenia', title: 'Armenia Eid Break', city: 'Yerevan', nights: 4, price: 3766, gradient: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' },
    { id: 'istanbul', title: 'Istanbul Special', city: 'Istanbul', nights: 5, price: 4210, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)' },
    { id: 'dubai', title: 'Dubai Explorer', city: 'Dubai', nights: 3, price: 1980, gradient: 'linear-gradient(135deg, #fbbf24 0%, #92400e 100%)' },
  ];

  return { destination, nights, highlights, itinerary, hotels, inclusions, exclusions, similar, intro_paragraph, what_to_expect, terms_and_conditions: deal?.terms_and_conditions || '' };
}

const MEAL_META = {
  B: { icon: Coffee, label: 'Breakfast', cls: 'text-amber-600' },
  L: { icon: Utensils, label: 'Lunch', cls: 'text-orange-600' },
  D: { icon: Moon, label: 'Dinner', cls: 'text-indigo-600' },
};

/* ---------- Sub-components ---------- */
const _resolveActImg = (src) =>
  !src ? '' : (src.startsWith('http') ? src : (process.env.REACT_APP_BACKEND_URL + src));

const _formatDayDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch { return iso; }
};

function DayCard({ entry }) {
  const acts = (entry.activities || []).filter(a => a && a.id);
  const [openAct, setOpenAct] = useState(null); // { id, fallback }
  return (
    <div className="flex gap-4 pb-6 border-b border-gray-200 last:border-b-0" data-testid={`itinerary-day-${entry.day}`}>
      <div className="flex-shrink-0">
        <div className="bg-rose-500 text-white px-4 py-2 rounded-md text-center shadow-sm min-w-[78px]">
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">Day</div>
          <div className="text-lg font-black leading-none">{String(entry.day).padStart(2, '0')}</div>
        </div>
        {entry.date && (
          <div className="mt-1.5 text-[10px] text-center text-gray-500 font-semibold uppercase tracking-wider min-w-[78px]" data-testid={`itinerary-day-${entry.day}-date`}>
            {_formatDayDate(entry.date)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-gray-900 text-base md:text-lg mb-2">{entry.title}</h3>

        {/* Linked activities — rich cards (image + name + sub) */}
        {acts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3" data-testid={`itinerary-day-${entry.day}-activities`}>
            {acts.map((a, i) => (
              <div
                key={a.id || i}
                className="flex items-center gap-2 p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg"
                data-testid={`itinerary-day-${entry.day}-activity-${i}`}
              >
                {a.image && (
                  <img
                    src={_resolveActImg(a.image)}
                    alt=""
                    className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-emerald-900 truncate">{a.name}</div>
                  {a.sub && <div className="text-[11px] text-emerald-700 truncate">{a.sub}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => setOpenAct({ id: a.id, fallback: a })}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded uppercase tracking-wider flex-shrink-0"
                  data-testid={`itinerary-day-${entry.day}-activity-${i}-view`}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className="text-sm text-gray-600 leading-relaxed mb-3 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: entry.desc }}
        />

        <div className="flex flex-wrap items-center gap-4 text-xs">
          {entry.meal?.length > 0 && (
            <div className="flex items-center gap-2">
              {entry.meal.map(m => {
                const { icon: I, label, cls } = MEAL_META[m] || {};
                return I ? (
                  <span key={m} className="inline-flex items-center gap-1 text-gray-600">
                    <I size={14} className={cls} /> {label}
                  </span>
                ) : null;
              })}
            </div>
          )}
          {entry.transfer && (
            <span className="inline-flex items-center gap-1 text-gray-600" data-testid={`itinerary-day-${entry.day}-transfer`}>
              <Plane size={14} className="text-blue-600" /> {entry.transfer}
            </span>
          )}
          {entry.hotel && (
            <span className="inline-flex items-center gap-1 text-gray-600">
              <Bed size={14} className="text-teal-600" /> {entry.hotel}
            </span>
          )}
          {entry.hotel && (
            <button className="text-sky-600 font-semibold text-xs hover:underline" data-testid={`included-hotel-${entry.day}`}>
              Included hotel
            </button>
          )}
        </div>
      </div>

      {openAct && (
        <ActivityDetailModal
          activityId={openAct.id}
          fallback={openAct.fallback}
          onClose={() => setOpenAct(null)}
        />
      )}
    </div>
  );
}

function HotelRow({ h, i }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-200 last:border-b-0" data-testid={`pkg-hotel-${i}`}>
      <DealImage src={h.image} alt={h.name} className="w-28 h-20 object-cover rounded-md flex-shrink-0" gradient="linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)" label="Hotel" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-bold text-gray-900 text-sm md:text-base truncate">{h.name}</h4>
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: h.stars }).map((_, i) => (
                <Star key={i} size={12} className="text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{h.roomType} · {h.meal}</p>
          </div>
          <button className="text-sky-600 hover:underline text-xs font-semibold flex-shrink-0" data-testid={`hotel-view-details-${i}`}>View Details</button>
        </div>
      </div>
    </div>
  );
}

function SimilarCard({ s, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      onClick={onClick}
      data-testid={`similar-${s.id}`}
      className="text-left rounded-lg overflow-hidden h-40 min-w-[200px] flex-shrink-0 relative group"
      style={{ background: s.gradient }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 text-white">
        <h5 className="font-black text-sm leading-tight">{s.title}</h5>
        <p className="text-[10px] opacity-90 mt-0.5">{s.city} · {s.nights} nights</p>
        <p className="text-xs font-bold mt-1">From AED {s.price.toLocaleString()}</p>
      </div>
    </motion.button>
  );
}

/* ---------- Rooms / Adults / Children stepper popover ---------- */
const CHILD_AGE_OPTIONS = [
  '<2 yrs',
  '2+ yrs', '3+ yrs', '4+ yrs', '5+ yrs', '6+ yrs',
  '7+ yrs', '8+ yrs', '9+ yrs', '10+ yrs', '11+ yrs', '12+ yrs',
];

function Stepper({ value, onChange, min = 0, max = 99, testid }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const minusDisabled = value <= min;
  return (
    <div className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden" data-testid={testid}>
      <button
        type="button"
        onClick={dec}
        disabled={minusDisabled}
        className={`w-8 h-8 flex items-center justify-center text-gray-700 ${minusDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}`}
        data-testid={`${testid}-minus`}
      >−</button>
      <span className="w-10 h-8 flex items-center justify-center font-bold text-gray-900 border-x border-gray-300">{value}</span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40"
        data-testid={`${testid}-plus`}
      >+</button>
    </div>
  );
}

function RoomBlock({ roomIndex, room, onChange, testidBase, showDivider }) {
  const setAdults = (n) => onChange({ ...room, adults: n });
  const setChildrenCount = (n) => {
    const cur = room.children || [];
    if (n > cur.length) {
      // Add default-age children
      const add = Array.from({ length: n - cur.length }, () => ({ age: '<2 yrs' }));
      onChange({ ...room, children: [...cur, ...add] });
    } else {
      onChange({ ...room, children: cur.slice(0, n) });
    }
  };
  const setChildAge = (i, age) => {
    const next = [...(room.children || [])];
    next[i] = { ...next[i], age };
    onChange({ ...room, children: next });
  };

  return (
    <div data-testid={`${testidBase}-room-${roomIndex}`}>
      <div className="grid grid-cols-2 gap-4 py-2">
        <div>
          <div className="font-bold text-gray-900 text-sm mb-2">Adults(12+)</div>
          <Stepper value={room.adults} onChange={setAdults} min={1} max={10} testid={`${testidBase}-adults-${roomIndex}`} />
        </div>
        <div>
          <div className="font-bold text-gray-900 text-sm mb-2">Children</div>
          <Stepper value={(room.children || []).length} onChange={setChildrenCount} min={0} max={6} testid={`${testidBase}-children-${roomIndex}`} />
        </div>
      </div>
      {(room.children || []).length > 0 && (
        <div className="grid grid-cols-2 gap-4 pb-2">
          {room.children.map((ch, ci) => (
            <div key={ci} className={ci % 2 === 0 ? '' : ''}>
              <select
                value={ch.age}
                onChange={e => setChildAge(ci, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                data-testid={`${testidBase}-child-age-${roomIndex}-${ci}`}
              >
                {CHILD_AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
      {showDivider && <div className="border-t border-gray-200 my-1" />}
    </div>
  );
}

function RoomsOccupancyPicker({ rooms, onChange, testid = 'pkg-rooms-adults' }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(rooms);
  const ref = useRef(null);

  useEffect(() => { setLocal(rooms); }, [rooms]);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const totalAdults = local.reduce((s, r) => s + (r.adults || 0), 0);
  const totalChildren = local.reduce((s, r) => s + (r.children || []).length, 0);

  const label = () => {
    const totalAdultsP = rooms.reduce((s, r) => s + (r.adults || 0), 0);
    const totalChildrenP = rooms.reduce((s, r) => s + (r.children || []).length, 0);
    const r = rooms.length === 1 ? '1 room' : `${rooms.length} rooms`;
    const a = totalAdultsP === 1 ? '1 adult' : `${totalAdultsP} adults`;
    const c = totalChildrenP > 0 ? `, ${totalChildrenP === 1 ? '1 child' : `${totalChildrenP} children`}` : '';
    return `${r}, ${a}${c}`;
  };

  const setRoomCount = (n) => {
    if (n > local.length) {
      const add = Array.from({ length: n - local.length }, () => ({ adults: 1, children: [] }));
      setLocal([...local, ...add]);
    } else {
      setLocal(local.slice(0, n));
    }
  };

  const updateRoom = (i, next) => {
    const arr = [...local];
    arr[i] = next;
    setLocal(arr);
  };

  const done = () => {
    onChange(local);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm font-semibold text-gray-900 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-sky-500"
        data-testid={testid}
      >
        <span>{label()}</span>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 p-4 max-h-[28rem] overflow-y-auto"
          data-testid={`${testid}-popover`}
        >
          {/* Rooms master stepper */}
          <div className="flex items-center justify-between py-2">
            <span className="font-bold text-gray-900 text-base">Rooms</span>
            <Stepper value={local.length} onChange={setRoomCount} min={1} max={9} testid={`${testid}-rooms-stepper`} />
          </div>
          <div className="border-t border-gray-200 my-2" />

          {/* Per-room blocks — one Adults+Children pair per room, with individual child-age dropdowns */}
          {local.map((room, i) => (
            <RoomBlock
              key={i}
              roomIndex={i}
              room={room}
              onChange={(next) => updateRoom(i, next)}
              testidBase={testid}
              showDivider={i < local.length - 1}
            />
          ))}

          <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Total: <span className="font-semibold text-gray-700">{local.length} {local.length === 1 ? 'room' : 'rooms'}</span> · <span className="font-semibold text-gray-700">{totalAdults} adults</span>{totalChildren > 0 && <>, <span className="font-semibold text-gray-700">{totalChildren} children</span></>}
            </div>
            <button
              type="button"
              onClick={done}
              className="px-5 py-1.5 border border-gray-300 rounded-md text-sm font-semibold text-gray-800 hover:bg-gray-50"
              data-testid={`${testid}-done`}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Main component ---------- */
export default function GroupTourDetail({ deal, onBack }) {
  const pkg = buildPackage(deal);
  const [activeTab, setActiveTab] = useState('itinerary');

  // Allowed "Leaving From" cities — admin-managed per-package; fall back to platform default.
  const DEFAULT_DEPARTURE_CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Bangalore', 'Mumbai', 'Delhi'];
  const allowedDepartureCities = (Array.isArray(deal?.departure_cities) && deal.departure_cities.length > 0)
    ? deal.departure_cities
    : DEFAULT_DEPARTURE_CITIES;

  // Travel window — used to clamp the "Leaving On" date picker.
  const travelWindowStart = deal?.travel_window_start || '';
  const travelWindowEnd = deal?.travel_window_end || '';

  const [selectedDate, setSelectedDate] = useState(travelWindowStart || '2026-07-10');
  // Per-room occupancy — each room has its own adults & array of children (each with an age bracket)
  const [roomsOccupancy, setRoomsOccupancy] = useState([{ adults: 2, children: [] }]);
  const [leavingFrom, setLeavingFrom] = useState(allowedDepartureCities[0] || 'Dubai');
  const [quote, setQuote] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [downloadingBrochure, setDownloadingBrochure] = useState(false);

  /* Download the WeasyPrint brochure PDF for this package. */
  const downloadBrochure = async () => {
    if (!deal?.id || downloadingBrochure) return;
    setDownloadingBrochure(true);
    try {
      const res = await api.get(`/group-tours/${deal.id}/brochure-pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Brochure_${(deal.title || deal.id).replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Brochure download failed:', e);
      alert(e?.response?.data?.detail || 'Failed to download brochure. Please try again.');
    } finally {
      setDownloadingBrochure(false);
    }
  };

  /* Ask the backend for a server-computed quote so the price/child-rules/tax
     stay in sync with whatever the operations team set in the Admin panel. */
  const computeQuote = async () => {
    if (!deal?.id) return;
    setCalculating(true);
    try {
      const res = await api.post(`/group-tours/${deal.id}/quote`, {
        rooms: roomsOccupancy.map(r => ({
          adults: r.adults || 0,
          children: (r.children || []).map(c => ({ age: c.age })),
        })),
        departure_date: selectedDate,
        leaving_from: leavingFrom,
      });
      setQuote(res.data);
    } catch (e) {
      // Fall back to a minimal client-side quote so users still see something
      setQuote({
        rooms: roomsOccupancy.length,
        adults: roomsOccupancy.reduce((s, r) => s + (r.adults || 0), 0),
        children: 0, infants: 0, lines: [],
        subtotal: 0, tax_pct: 0, tax_amount: 0, total: 0,
        error: e?.response?.data?.detail || 'Failed to calculate quote',
      });
    } finally {
      setCalculating(false);
    }
  };

  // Use up to 5 admin-uploaded cover images; fall back to the legacy single-image
  // (repeated to fill the 3-up gallery layout) when only one is available.
  const adminImages = (Array.isArray(deal?.images) ? deal.images.filter(Boolean) : []).slice(0, 5);
  const galleryImages = adminImages.length >= 2
    ? adminImages
    : [deal?.image, deal?.image, deal?.image].filter(Boolean);
  const title = deal?.title || `${pkg.destination} Package`;
  const price = Number(deal?.price_per_adult ?? deal?.price ?? 3293);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="group-tour-detail-page">
      {/* Top header bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg" data-testid="pkg-detail-back">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 flex items-center gap-1.5 min-w-0">
            <button onClick={onBack} className="hover:text-sky-600">Home</button>
            <ChevronRight size={12} />
            <span className="hover:text-sky-600">Eid Deals</span>
            <ChevronRight size={12} />
            <span className="text-gray-900 font-semibold truncate">{title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-1">{title}</h1>
        <div
          className="text-sm text-gray-600 mb-6 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: pkg.intro_paragraph }}
        />

        {/* MAIN GRID: gallery + booking card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Image Gallery (spans 2) */}
          <div className="lg:col-span-2">
            <div className="rounded-xl overflow-hidden h-64 md:h-96 mb-3">
              <DealImage src={galleryImages[0]} alt={title} className="w-full h-full object-cover" gradient={deal?.gradient} label={title} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {galleryImages.slice(0, 3).map((img, i) => (
                <div key={i} className="rounded-lg overflow-hidden h-20 md:h-24">
                  <DealImage src={img} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" gradient={deal?.gradient} label={`View ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Booking panel — price card on top + form card below */}
          <div className="h-fit sticky top-20 space-y-4" data-testid="pkg-booking-card">
            {/* Price card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-black text-[#002B5B]">AED {price.toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">per person · {new Date(selectedDate).toLocaleString('en-US', { month: 'long' })}</p>
            </div>

            {/* Book your trip form card */}
            <div className="bg-white rounded-xl border border-rose-200 shadow-sm">
              <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 border-b border-gray-200">
                <h3 className="font-black text-gray-900 text-xl md:text-2xl">Book your trip</h3>
              </div>
              <div className="px-5 md:px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Leaving From</label>
                    <select
                      value={leavingFrom}
                      onChange={e => setLeavingFrom(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm font-semibold text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      data-testid="pkg-leaving-from"
                    >
                      {allowedDepartureCities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Leaving On</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      min={travelWindowStart || undefined}
                      max={travelWindowEnd || undefined}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      data-testid="pkg-date-input"
                    />
                    {(travelWindowStart || travelWindowEnd) && (
                      <p className="mt-1 text-[11px] text-gray-500" data-testid="pkg-travel-window-hint">
                        Travel window: {travelWindowStart || '—'} to {travelWindowEnd || '—'}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1.5">No. Of Rooms</label>
                  <RoomsOccupancyPicker
                    rooms={roomsOccupancy}
                    onChange={setRoomsOccupancy}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={computeQuote}
                    disabled={calculating}
                    className="py-3 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md text-xs md:text-sm tracking-wide disabled:opacity-70"
                    data-testid="pkg-check-availability"
                  >
                    {calculating ? 'Calculating...' : 'Check Availability'}
                  </button>
                  <button
                    onClick={downloadBrochure}
                    disabled={downloadingBrochure}
                    className="py-3 px-3 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold rounded-md text-xs md:text-sm tracking-wide disabled:opacity-70"
                    data-testid="pkg-download-brochure"
                  >
                    {downloadingBrochure ? 'Preparing...' : 'Download Brochure'}
                  </button>
                  <button
                    className="py-3 px-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-md text-xs md:text-sm tracking-wide"
                    data-testid="pkg-generate-leads"
                  >
                    Generate Leads
                  </button>
                </div>

                {quote && (
                  <div className="mt-3 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-lg p-4 space-y-2 text-sm" data-testid="pkg-quote-breakdown">
                    <div className="flex items-center justify-between pb-2 border-b border-sky-200">
                      <span className="font-black text-gray-900">Price Breakdown</span>
                      <span className="text-[11px] text-gray-500">{quote.rooms} room{quote.rooms > 1 ? 's' : ''} · {new Date(selectedDate).toLocaleDateString('en-GB')}</span>
                    </div>
                    {quote.error ? (
                      <div className="text-xs text-red-600 py-2">{quote.error}</div>
                    ) : (
                      <>
                        {(quote.lines || []).map((ln, i) => (
                          <div key={i} className={`flex justify-between ${ln.subtotal === 0 ? 'text-gray-500 italic' : 'text-gray-700'}`}>
                            <span>{ln.count} × {ln.label}</span>
                            <span className={ln.subtotal === 0 ? '' : 'font-semibold'}>AED {Number(ln.subtotal).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t-2 border-sky-300">
                          <span className="font-black text-gray-900 text-base">Total Price</span>
                          <span className="font-black text-[#002B5B] text-xl">AED {Number(quote.total).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TRIP HIGHLIGHTS */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 mb-10">
          <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-sky-500 rounded-full" /> Trip Highlights
          </h2>
          <ul className="space-y-2.5">
            {pkg.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* SIMILAR PACKAGES */}
        <section className="mb-10">
          <h2 className="text-lg font-black text-gray-900 mb-4">Similar packages</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {pkg.similar.map(s => (
              <SimilarCard key={s.id} s={s} onClick={() => {}} />
            ))}
          </div>
        </section>

        {/* TABS */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex gap-1 border-b border-gray-200 px-5 md:px-6 overflow-x-auto">
            {[
              { k: 'itinerary', label: 'Itinerary' },
              { k: 'flights', label: 'Flights' },
              { k: 'hotels', label: 'Hotels' },
              ...((pkg.terms_and_conditions || '').trim() ? [{ k: 'terms', label: 'Terms' }] : []),
            ].map(t => (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k)}
                data-testid={`pkg-tab-${t.k}`}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  activeTab === t.k ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 md:p-6">
            {activeTab === 'itinerary' && (
              <div className="space-y-6">
                {pkg.itinerary.map(entry => <DayCard key={entry.day} entry={entry} />)}
              </div>
            )}

            {activeTab === 'flights' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3" data-testid="pkg-flights-banner">
                <Plane size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800 text-sm">Flights</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    To and Fro flights included upto AED 1,100 / pax booked.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'hotels' && (
              <div>
                {pkg.hotels.map((h, i) => <HotelRow key={i} h={h} i={i} />)}
              </div>
            )}

            {activeTab === 'terms' && (
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: pkg.terms_and_conditions }}
                data-testid="pkg-tab-terms-content"
              />
            )}
          </div>
        </div>

        {/* INCLUDED IN PRICE */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 mt-10">
          <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-sky-500 rounded-full" /> Included in price
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Object.entries(pkg.inclusions).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="font-bold text-gray-800 text-sm mb-2">{cat}</h3>
                <ul className="space-y-1.5">
                  {items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* EXCLUSIONS */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 mt-6">
          <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-rose-500 rounded-full" /> Exclusions
          </h2>
          <ul className="space-y-2">
            {pkg.exclusions.map((ex, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <X size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{ex}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* WHAT TO EXPECT */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 mt-6">
          <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-sky-500 rounded-full" /> What to Expect
          </h2>
          <div className="text-sm text-gray-600 leading-relaxed space-y-3">
            {pkg.what_to_expect ? (
              pkg.what_to_expect.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <>
                <p>Travelers will be met by our airport representative at the arrival terminal of {pkg.destination}'s International Airport. Please allow some time after immigration before proceeding to the airport meet & greet point. Our representative will carry a Travo Tours name sign for easy identification.</p>
                <p>Timings for arrival and departure will be confirmed by our local partner. Travelers are requested to check the itinerary carefully and revert to us with any concerns within 48 hours of receiving the document.</p>
                <p>All hotels are subject to availability at the time of booking. In the event a specific hotel is unavailable, we will book a similar category hotel. You will be notified of any change prior to booking confirmation.</p>
                <p>Please note that during special events, festivals or local holidays some attractions may be closed. Your guide will offer suitable alternative activities if such a situation arises during your trip.</p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

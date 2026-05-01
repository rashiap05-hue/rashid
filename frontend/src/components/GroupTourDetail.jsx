import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Star, MapPin, Calendar, Users,
  Coffee, Utensils, Moon, Bed, Plane, Check, X, Info,
} from 'lucide-react';

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

/* ---------- Demo package data derived from the deal passed in ---------- */
function buildPackage(deal) {
  const destination = (deal?.subtitle || '').split(' ')[0] || 'Baku';
  const nights = parseInt((deal?.subtitle || '').match(/(\d+)\s*night/i)?.[1] || '4', 10);

  const highlights = [
    `Discover the Top Attractions of ${destination} with a Licensed Tour Guide`,
    `Dive into Local Culture — Traditional Food, Arts & Architecture`,
    'Enjoy Comfortable Stays at 3–5 Star Hotels with Daily Breakfast',
    'Seamless Private Arrival & Departure Airport Transfers',
    'Scenic Day Tours Including Local Landmarks and Hidden Gems',
    'Shopping & Leisure Time at the Most Famous Bazaars & Malls',
  ];

  const itinerary = [
    { day: 1, title: `Arrival in ${destination}`, desc: `On arrival at ${destination} International Airport, our representative will welcome you and transfer you to the hotel for check-in. Relax and spend the evening at leisure. Enjoy dinner at your leisure before retiring for the night.`, meal: ['D'], hotel: 'Check-in to the hotel' },
    { day: 2, title: `Full Day ${destination} City Tour`, desc: `After breakfast, embark on a guided ${destination} city tour covering the Old City, cultural landmarks, religious monuments and viewpoints with panoramic city vistas. Enjoy lunch at a traditional restaurant before heading back to the hotel.`, meal: ['B', 'L'], hotel: `Overnight stay at hotel in ${destination}` },
    { day: 3, title: 'Day Trip to Mountains & Countryside', desc: `Full-day excursion to the countryside. Visit UNESCO-listed heritage sites, natural reservoirs, tea gardens and enjoy cable-car rides with stunning mountain views. Return to ${destination} for a relaxed evening.`, meal: ['B', 'L'], hotel: `Overnight stay at hotel in ${destination}` },
    { day: 4, title: 'Shopping & Leisure Day', desc: `Morning is at leisure for personal activities. In the afternoon, a guided shopping tour at the most popular malls, handicraft streets and bazaars. Evening dinner at a traditional restaurant with live music & cultural performance.`, meal: ['B', 'D'], hotel: `Overnight stay at hotel in ${destination}` },
    ...(nights >= 5 ? [{ day: 5, title: `Optional Tour - ${destination} Night Experience`, desc: `Optional evening tour including rooftop city viewpoints, night cruise and dinner at a signature local restaurant. Overnight back at hotel.`, meal: ['B'], hotel: `Overnight stay at hotel in ${destination}` }] : []),
    { day: nights + 1, title: `Departure from ${destination}`, desc: `After breakfast at the hotel, check-out at the scheduled time. Our representative will transfer you to ${destination} International Airport for your return flight home.`, meal: ['B'], hotel: null },
  ];

  const hotels = [
    { name: `Park Inn by Radisson ${destination} or similar`, stars: 4, nights, image: deal?.image, roomType: 'Standard Twin Room', meal: 'Bed & Breakfast' },
    { name: `Holiday Inn ${destination} or similar`, stars: 4, nights: Math.max(1, nights - 2), image: deal?.image, roomType: 'Superior Room', meal: 'Bed & Breakfast' },
    { name: `Hilton Garden Inn ${destination} or similar`, stars: 4, nights: 2, image: deal?.image, roomType: 'Guest Room', meal: 'Bed & Breakfast' },
  ];

  const inclusions = {
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

  const exclusions = [
    'International airfare (Tickets can be booked separately)',
    'Visa fees and travel insurance',
    'Lunches and dinners unless specified',
    'Any optional tours, personal expenses, tips and gratuities',
  ];

  const similar = [
    { id: 'baku', title: 'Baku Eid Break', city: 'Baku', nights: 4, price: 3293, gradient: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)' },
    { id: 'tbilisi', title: 'Tbilisi Eid Break', city: 'Tbilisi', nights: 4, price: 3544, gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' },
    { id: 'almaty', title: 'Almaty Eid Break', city: 'Almaty', nights: 5, price: 3738, gradient: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)' },
    { id: 'armenia', title: 'Armenia Eid Break', city: 'Yerevan', nights: 4, price: 3766, gradient: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' },
    { id: 'istanbul', title: 'Istanbul Special', city: 'Istanbul', nights: 5, price: 4210, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)' },
    { id: 'dubai', title: 'Dubai Explorer', city: 'Dubai', nights: 3, price: 1980, gradient: 'linear-gradient(135deg, #fbbf24 0%, #92400e 100%)' },
  ];

  return { destination, nights, highlights, itinerary, hotels, inclusions, exclusions, similar };
}

const MEAL_META = {
  B: { icon: Coffee, label: 'Breakfast', cls: 'text-amber-600' },
  L: { icon: Utensils, label: 'Lunch', cls: 'text-orange-600' },
  D: { icon: Moon, label: 'Dinner', cls: 'text-indigo-600' },
};

/* ---------- Sub-components ---------- */
function DayCard({ entry }) {
  return (
    <div className="flex gap-4 pb-6 border-b border-gray-200 last:border-b-0" data-testid={`itinerary-day-${entry.day}`}>
      <div className="flex-shrink-0">
        <div className="bg-rose-500 text-white px-4 py-2 rounded-md text-center shadow-sm min-w-[78px]">
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">Day</div>
          <div className="text-lg font-black leading-none">{String(entry.day).padStart(2, '0')}</div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-gray-900 text-base md:text-lg mb-2">{entry.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{entry.desc}</p>

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

/* ---------- Main component ---------- */
export default function GroupTourDetail({ deal, onBack }) {
  const pkg = buildPackage(deal);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [selectedDate, setSelectedDate] = useState('2026-07-10');
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);

  const galleryImages = [deal?.image, deal?.image, deal?.image];
  const title = deal?.title || `${pkg.destination} Package`;
  const price = deal?.price || 3293;

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
        <p className="text-sm text-gray-600 mb-6">
          This trip by Travo Tours is a handpicked experience featuring {pkg.destination}. Enjoy panoramic landscapes, cultural landmarks, and comfortable stays in boutique hotels.
        </p>

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

          {/* Booking panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit sticky top-20" data-testid="pkg-booking-card">
            <div className="pb-4 border-b border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Starting From</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900">AED {price.toLocaleString()}</span>
                <span className="text-xs text-gray-500">/ adult</span>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-sm font-black text-gray-900 mb-3">Book your trip</h3>

              <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Departure Date</label>
              <div className="relative mb-3">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                  data-testid="pkg-date-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Rooms</label>
                  <select value={rooms} onChange={e => setRooms(+e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-sky-500" data-testid="pkg-rooms-input">
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Room{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 font-semibold uppercase mb-1">Adults</label>
                  <select value={adults} onChange={e => setAdults(+e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-sky-500" data-testid="pkg-adults-input">
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>

              <button className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md mb-2.5 text-sm tracking-wide" data-testid="pkg-check-availability">
                Price & Availability
              </button>
              <button className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-md text-sm tracking-wide" data-testid="pkg-customize-leads">
                Customize Leads
              </button>
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
            <p>Travelers will be met by our airport representative at the arrival terminal of {pkg.destination}'s International Airport. Please allow some time after immigration before proceeding to the airport meet & greet point. Our representative will carry a Travo Tours name sign for easy identification.</p>
            <p>Timings for arrival and departure will be confirmed by our local partner. Travelers are requested to check the itinerary carefully and revert to us with any concerns within 48 hours of receiving the document.</p>
            <p>All hotels are subject to availability at the time of booking. In the event a specific hotel is unavailable, we will book a similar category hotel. You will be notified of any change prior to booking confirmation.</p>
            <p>Please note that during special events, festivals or local holidays some attractions may be closed. Your guide will offer suitable alternative activities if such a situation arises during your trip.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

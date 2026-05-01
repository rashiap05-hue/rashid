import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Calendar } from 'lucide-react';

const EID_DEALS = [
  {
    id: 'baku',
    title: 'Baku Eid Break',
    subtitle: 'Baku 4 nights',
    dateRange: '24-31 May',
    stars: 3,
    price: 3293,
    image: 'https://images.unsplash.com/photo-1601823984263-b87b59798b70?w=800&q=80&auto=format&fit=crop',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
  },
  {
    id: 'tbilisi',
    title: 'Tbilisi Eid Break',
    subtitle: 'Tbilisi 4 nights',
    dateRange: '24-31 May',
    stars: 5,
    price: 3544,
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80&auto=format&fit=crop',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
  },
  {
    id: 'almaty',
    title: 'Almaty Eid Break',
    subtitle: 'Almaty 5 nights',
    dateRange: '24-31 May',
    stars: 4,
    price: 3738,
    image: 'https://images.unsplash.com/photo-1588615419957-3f1bfe5f29d7?w=800&q=80&auto=format&fit=crop',
    gradient: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
  },
  {
    id: 'armenia',
    title: 'Armenia Eid Break',
    subtitle: 'Yerevan 4 nights',
    dateRange: '24-31 May',
    stars: 3,
    price: 3766,
    image: 'https://images.unsplash.com/photo-1615460549969-36fa19521a4f?w=800&q=80&auto=format&fit=crop',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
  },
];

const MONTHLY_DEALS = [
  {
    id: 'dubai-visa',
    title: 'Dubai Tourist Visa',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=700&h=1000&q=80&auto=format&fit=crop',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #92400e 100%)',
  },
  {
    id: 'crazy-offers',
    title: 'Crazy Holiday Offers',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=700&h=1000&q=80&auto=format&fit=crop',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)',
  },
  {
    id: 'airfares',
    title: 'Lowest Airfares',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=700&h=1000&q=80&auto=format&fit=crop',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  },
  {
    id: 'hotels',
    title: 'Budget & Luxury Hotels',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=700&h=1000&q=80&auto=format&fit=crop',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #115e59 100%)',
  },
];

function StarRating({ count }) {
  return (
    <div className="flex items-center gap-0.5" data-testid="deal-stars">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={16} className="text-yellow-500 fill-yellow-500" />
      ))}
    </div>
  );
}

function DealImage({ src, alt, gradient, className, label }) {
  const [failed, setFailed] = React.useState(false);
  if (failed || !src) {
    return (
      <div className={className} style={{ background: gradient || 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)' }}>
        <div className="w-full h-full flex items-end p-5">
          <span className="text-white font-black text-xl drop-shadow">{label}</span>
        </div>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

function EidDealCard({ deal, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: '0 12px 28px rgba(0,43,91,0.12)' }}
      onClick={onClick}
      data-testid={`eid-deal-${deal.id}`}
      className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm cursor-pointer transition-shadow"
    >
      <div className="relative h-52 overflow-hidden">
        <DealImage
          src={deal.image}
          alt={deal.title}
          gradient={deal.gradient}
          label={deal.subtitle}
          className="w-full h-full object-cover"
        />
        {/* Eid Al Adha Holiday Deals badge */}
        <div className="absolute top-3 left-3">
          <div className="relative">
            <div className="bg-gradient-to-r from-[#0994C4] to-[#4BB8DD] text-white px-3 py-1.5 rounded-md shadow-md flex items-center gap-1.5">
              {/* Lantern glyph */}
              <svg viewBox="0 0 24 24" width="14" height="18" className="flex-shrink-0">
                <path fill="#FFD54A" d="M12 3c1 1.5 1 3 0 4.5C11 6 11 4.5 12 3z" />
                <rect x="8" y="7" width="8" height="10" rx="1.2" fill="#F9C74F" stroke="#7C4E00" strokeWidth="0.6" />
                <rect x="9" y="8.3" width="6" height="7.4" fill="#FDE68A" opacity="0.7" />
                <rect x="7.5" y="16.5" width="9" height="2" rx="0.6" fill="#7C4E00" />
                <rect x="10.5" y="18.5" width="3" height="1.2" rx="0.4" fill="#7C4E00" />
              </svg>
              <div className="leading-tight">
                <div className="text-[10px] font-black uppercase tracking-wide">Eid Al Adha</div>
                <div className="text-[9px] font-semibold opacity-95">Holiday Deals</div>
              </div>
            </div>
          </div>
        </div>
        {/* Date range pill */}
        <div className="absolute bottom-3 right-3 bg-[#0994C4] text-white text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1.5 shadow-md">
          <Calendar size={12} />
          {deal.dateRange}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-black text-gray-900 text-base mb-0.5">{deal.title}</h3>
        <p className="text-gray-500 text-sm mb-6">{deal.subtitle}</p>

        <div className="flex items-end justify-between border-t border-gray-100 pt-3">
          <StarRating count={deal.stars} />
          <div className="text-right">
            <div className="text-[11px] text-gray-500">Starting From</div>
            <div className="font-black text-gray-900 text-lg leading-none mt-0.5">AED {deal.price.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MonthlyDealTile({ deal, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      data-testid={`monthly-deal-${deal.id}`}
      className="cursor-pointer group"
    >
      <div className="rounded-xl overflow-hidden h-[380px] shadow-sm mb-3 relative">
        <DealImage
          src={deal.image}
          alt={deal.title}
          gradient={deal.gradient}
          label={deal.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <h4 className="font-black text-gray-900 text-base md:text-lg">{deal.title}</h4>
    </motion.div>
  );
}

export default function GroupTours({ onBack }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA]" data-testid="group-tours-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="group-tours-back-btn"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div>
            <h1 className="font-black text-gray-900 text-lg md:text-xl">Group Tours</h1>
            <p className="text-xs text-gray-500">Curated holiday packages &amp; deals from UAE</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Eid Holiday Deals */}
        <section className="mb-12 md:mb-16">
          <h2 className="font-black text-gray-900 text-xl md:text-2xl mb-5 md:mb-6">Eid Holiday Deals from UAE</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {EID_DEALS.map(d => (
              <EidDealCard key={d.id} deal={d} onClick={() => {}} />
            ))}
          </div>
        </section>

        {/* Deals of the Month */}
        <section>
          <h2 className="font-black text-gray-900 text-xl md:text-2xl mb-5 md:mb-6">Deals of the Month</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {MONTHLY_DEALS.map(d => (
              <MonthlyDealTile key={d.id} deal={d} onClick={() => {}} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

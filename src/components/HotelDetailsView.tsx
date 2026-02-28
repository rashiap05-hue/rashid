import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  Coffee, 
  Waves, 
  Dumbbell, 
  ShoppingBag,
  Info,
  Calendar,
  Users,
  Globe,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Hotel, Room } from '../data/hotels';

interface HotelDetailsViewProps {
  hotel: Hotel;
  onBack: () => void;
}

export default function HotelDetailsView({ hotel, onBack }: HotelDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<'options' | 'details' | 'rooms' | 'location'>('options');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % hotel.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + hotel.images.length) % hotel.images.length);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-blue-600 font-medium hover:underline">
          <ArrowLeft size={18} />
          See all properties
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">{hotel.name}</h1>
              <div className="flex">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <MapPin size={14} />
              {hotel.address}
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 h-[500px]">
          <div className="md:col-span-2 relative rounded-2xl overflow-hidden group">
            <img 
              src={hotel.images[currentImageIndex]} 
              alt={hotel.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={24} />
            </button>
            <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-white text-xs rounded-md">
              Reception
            </div>
          </div>
          <div className="grid grid-rows-2 gap-4">
            <div className="rounded-2xl overflow-hidden">
              <img 
                src={hotel.images[(currentImageIndex + 1) % hotel.images.length]} 
                alt="Gallery" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="rounded-2xl overflow-hidden relative">
              <img 
                src={hotel.images[(currentImageIndex + 2) % hotel.images.length]} 
                alt="Gallery" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <button className="px-4 py-2 bg-white rounded-lg text-sm font-bold shadow-lg">
                  View all photos
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Description & What to know */}
          <div className="lg:col-span-2 space-y-12">
            <div>
              <p className="text-gray-600 leading-relaxed mb-4">
                {hotel.description}
              </p>
              <button className="text-blue-600 font-bold text-sm hover:underline">...more</button>
            </div>

            <div className="bg-blue-50/30 rounded-3xl p-8 border border-blue-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">What to know about this hotel</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                {hotel.whatToKnow.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-blue-100 rounded text-blue-600">
                      <Info size={14} />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-gray-800">{item.title}: </span>
                      <span className="text-sm text-gray-600">{item.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Widget */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Check-in</label>
                  <div className="relative">
                    <input type="text" defaultValue="13 Mar 2026" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Check-out</label>
                  <div className="relative">
                    <input type="text" defaultValue="17 Mar 2026" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Number of rooms</label>
                  <div className="relative">
                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none appearance-none">
                      <option>1 room, 3 adults</option>
                    </select>
                    <Users className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                </div>
                <div className="flex items-end">
                  <button className="w-full py-3 bg-[#002B5B] text-white rounded-xl font-bold text-sm hover:bg-[#003d82] transition-all">
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex gap-8">
                {[
                  { id: 'options', label: 'AVAILABLE OPTIONS' },
                  { id: 'details', label: 'DETAILS' },
                  { id: 'rooms', label: 'ROOMS' },
                  { id: 'location', label: 'LOCATION' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "pb-4 text-xs font-bold tracking-widest transition-all relative",
                      activeTab === tab.id ? "text-[#002B5B]" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && <motion.div layoutId="hotelTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#002B5B]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Options */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Search room..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none" />
                </div>
                <div className="flex items-center gap-4">
                  <select className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none">
                    <option>Meal Plans</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <input type="checkbox" className="rounded border-gray-300" />
                    Refundable
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-lg font-bold text-gray-900 border-l-4 border-[#002B5B] pl-4">Superior Room</h4>
                {hotel.rooms.map((room) => (
                  <div key={room.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col md:flex-row">
                    <div className="md:w-64 h-48 md:h-auto bg-gray-100 flex items-center justify-center">
                      {room.images?.[0] ? (
                        <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-gray-300 flex flex-col items-center gap-2">
                          < Globe size={48} />
                          <span className="text-[10px] font-bold uppercase">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-6 flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-bold text-gray-900">{room.name}</h5>
                            <Info size={14} className="text-blue-400 cursor-help" />
                          </div>
                          <p className="text-xs text-gray-500">{room.meals}</p>
                        </div>
                        <ul className="space-y-1">
                          {room.amenities.map((amenity, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              {amenity}
                            </li>
                          ))}
                          {room.refundable && (
                            <li className="text-xs text-green-600 font-bold">
                              Fully refundable before {room.refundableUntil}
                            </li>
                          )}
                        </ul>
                      </div>
                      <div className="text-right flex flex-col justify-between items-end">
                        <div>
                          <div className="text-xs text-gray-400 line-through">{room.currency} {room.originalPrice.toLocaleString()}</div>
                          <div className="text-2xl font-black text-gray-900">{room.currency} {room.price.toLocaleString()}</div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase">total price</div>
                        </div>
                        <div className="space-y-2 w-full">
                          <button className="w-full px-8 py-2 bg-white border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors">
                            select
                          </button>
                          <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                            ORN_SPECIAL coupon applied
                          </div>
                          <button className="text-xs font-bold text-blue-600 hover:underline">
                            Block and pay later
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Ratings & Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center text-xl font-black">
                    {hotel.ratingScore}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{hotel.ratingText}</div>
                    <div className="text-xs text-gray-500">{hotel.reviewCount} ratings</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Cleanliness', score: hotel.detailedRatings.cleanliness },
                  { label: 'Service', score: hotel.detailedRatings.service },
                  { label: 'Comfort', score: hotel.detailedRatings.comfort },
                  { label: 'Condition', score: hotel.detailedRatings.condition },
                  { label: 'Amenities', score: hotel.detailedRatings.amenities }
                ].map((rating) => (
                  <div key={rating.label}>
                    <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                      <span>{rating.label}</span>
                      <span>{rating.score}/5</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(rating.score / 5) * 100}%` }}
                        className="h-full bg-blue-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-4">Location</h4>
              <div className="aspect-square bg-gray-200 rounded-2xl overflow-hidden relative mb-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin size={32} className="text-red-500" />
                </div>
              </div>
              <p className="text-sm text-gray-600">{hotel.address}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

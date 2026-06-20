import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Star, ChevronLeft, ChevronRight, Check, X,
  Wifi, Car, Dumbbell, Coffee, Utensils, Bath, Tv, Wind, Building2,
  Calendar, Users, Search, Info, ChevronDown, ChevronUp, Filter, Plane
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Image Gallery Component
function ImageGallery({ images, hotelName }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Default images if none provided
  const galleryImages = images?.length > 0 ? images : [
    'https://picsum.photos/seed/hotel1/1200/800',
    'https://picsum.photos/seed/hotel2/600/400',
    'https://picsum.photos/seed/hotel3/600/400',
    'https://picsum.photos/seed/hotel4/600/400'
  ];

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % galleryImages.length);
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);

  return (
    <div className="grid grid-cols-4 gap-2 h-[400px]">
      {/* Main Image */}
      <div className="col-span-3 relative rounded-lg overflow-hidden group">
        <img
          src={galleryImages[currentIndex]}
          alt={`${hotelName} - View ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setShowFullscreen(true)}
        />
        
        {/* Navigation Arrows */}
        <button
          onClick={prevImage}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <button
          onClick={nextImage}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight size={24} className="text-gray-700" />
        </button>

        {/* Image Caption */}
        <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded text-sm">
          Reception
        </div>
      </div>

      {/* Thumbnails */}
      <div className="col-span-1 flex flex-col gap-2">
        {galleryImages.slice(1, 4).map((img, idx) => (
          <div
            key={idx}
            className={cn(
              "flex-1 rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
              currentIndex === idx + 1 ? "border-[#002B5B]" : "border-transparent"
            )}
            onClick={() => setCurrentIndex(idx + 1)}
          >
            <img
              src={img}
              alt={`Thumbnail ${idx + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          </div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {showFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
            onClick={() => setShowFullscreen(false)}
          >
            <button
              className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
              onClick={() => setShowFullscreen(false)}
            >
              <X size={32} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full"
            >
              <ChevronLeft size={48} />
            </button>
            <img
              src={galleryImages[currentIndex]}
              alt={hotelName}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full"
            >
              <ChevronRight size={48} />
            </button>
            <div className="absolute bottom-4 text-white text-sm">
              {currentIndex + 1} / {galleryImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Rating Breakdown Component
function RatingBreakdown({ ratingScore, ratingText, reviewCount, detailedRatings }) {
  const ratings = detailedRatings || {
    cleanliness: 4.7,
    service: 4.6,
    comfort: 4.7,
    condition: 4.7,
    amenities: 4.6
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Overall Rating */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 bg-[#002B5B] text-white rounded-lg flex items-center justify-center text-2xl font-bold">
          {ratingScore || 9.2}
        </div>
        <div>
          <div className="font-bold text-gray-800">{ratingText || 'Wonderful'}</div>
          <div className="text-sm text-gray-500">{reviewCount || 107} ratings</div>
        </div>
      </div>

      {/* Detailed Ratings */}
      <div className="space-y-3">
        {Object.entries(ratings).map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 capitalize">{key}</span>
              <span className="font-medium text-gray-800">{value}/5</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#002B5B] rounded-full transition-all"
                style={{ width: `${(value / 5) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// What to Know Section
function WhatToKnow({ highlights, hotel }) {
  const defaultHighlights = [
    { icon: 'Lobby', text: 'LobbyAmbience: Spacious lobby with comfortable seating area' },
    { icon: 'Shopping', text: 'LocalShopping: Walking distance to local markets and shops' },
    { icon: 'Metro', text: 'MetroProximity: 5-minute walk to 28 May metro station' },
    { icon: 'Room', text: `SpaciousRooms: Rooms average 323 sq ft, with modern amenities` },
    { icon: 'Fitness', text: 'FitnessCenter: 24-hour fitness center with modern equipment' },
    { icon: 'New', text: `NewHotel: Hotel built in ${hotel?.year_built || 2015}, modern facilities and design` },
    { icon: 'Mall', text: 'MallAccess: 10-minute walk to Port Baku Mall' },
    { icon: 'Dining', text: 'DiningOptions: Four on-site dining options, including international buffet' }
  ];

  const items = highlights?.length > 0 
    ? highlights.map(h => ({ icon: 'Info', text: h }))
    : defaultHighlights;

  return (
    <div className="bg-[#E8F5E9] rounded-xl p-5 mt-6">
      <h3 className="text-lg font-bold text-[#2E7D32] mb-4">What to know about this hotel</h3>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-[#2E7D32]">
            <span className="mt-1">•</span>
            <span className="text-sm">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Room Option Card
function RoomOption({ room, onSelect, nights = 4, totalGuests = 2, selectLabel = 'select' }) {
  const [expanded, setExpanded] = useState(false);
  
  // Use rate plan price if available, otherwise use room price
  const ratePlan = room.rate_plan || (room.rate_plans?.[0] || null);
  const price = ratePlan?.price || room.price || 0;
  const supplierCost = ratePlan?.supplier_cost || room.supplier_cost || null;
  
  const totalPrice = price * nights;
  const originalTotal = supplierCost ? supplierCost * nights : null;
  const hasDiscount = originalTotal && originalTotal < totalPrice;
  
  // Get room capacity
  const getRoomCapacity = () => {
    const name = (room.name || '').toLowerCase();
    const type = (room.type || '').toLowerCase();
    const combinedText = `${name} ${type}`;
    
    if (room.max_occupancy) return room.max_occupancy;
    if (room.capacity) return room.capacity;
    if (room.room_type?.max_occupancy) return room.room_type.max_occupancy;
    
    if (combinedText.includes('family') || combinedText.includes('suite')) return 4;
    if (combinedText.includes('triple') || combinedText.includes('3 bed')) return 3;
    if (combinedText.includes('quad') || combinedText.includes('4 bed')) return 4;
    if (combinedText.includes('twin') || combinedText.includes('double')) return 2;
    if (combinedText.includes('single')) return 1;
    if (combinedText.includes('apartment') || combinedText.includes('villa')) return 6;
    
    return 2;
  };
  
  const roomCapacity = getRoomCapacity();
  
  // Create enhanced room object with rate plan data
  const handleSelect = () => {
    const enhancedRoom = {
      ...room,
      price: price,
      rate_plan: ratePlan,
      supplier_cost: supplierCost,
      supplier_name: ratePlan?.supplier_name || ''
    };
    onSelect(enhancedRoom);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-[#002B5B] transition-colors">
      <div className="flex gap-4">
        {/* Room Image */}
        <div className="w-48 h-32 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
          {room.images?.[0] ? (
            <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <div className="text-center text-gray-400">
              <div className="text-xs font-bold text-gray-500">NO IMAGE</div>
              <div className="text-[10px] text-green-600 font-bold mt-2">AVAILABLE</div>
            </div>
          )}
        </div>

        {/* Room Details */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                {room.name}
                {room.recommended && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold" data-testid="room-recommended-badge">
                    Recommended
                  </span>
                )}
                <button className="text-gray-400 hover:text-gray-600">
                  <Info size={16} />
                </button>
              </h4>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-gray-500">
                  {ratePlan?.meal_plan || room.meals || 'No meals included'}
                </p>
                <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  <Users size={12} />
                  Max {roomCapacity} guests
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-gray-800">AED {totalPrice.toLocaleString()}</div>
              <div className="text-xs text-gray-500">total price ({nights} nights)</div>
            </div>
          </div>

          {/* Inclusions */}
          <ul className="mt-2 text-xs text-gray-500 space-y-0.5">
            <li>• {ratePlan?.meal_plan || room.meals || 'Room Only'}</li>
            {ratePlan?.inclusions?.length > 0 ? (
              ratePlan.inclusions.map((inclusion, idx) => (
                <li key={idx}>• {inclusion}</li>
              ))
            ) : (
              room.amenities?.slice(0, 3).map((amenity, idx) => (
                <li key={idx}>• {amenity}</li>
              ))
            )}
            {ratePlan?.taxes?.length > 0 ? (
              ratePlan.taxes.map((tax, idx) => (
                <li key={`tax-${idx}`}>• {tax}</li>
              ))
            ) : (
              <>
                <li>• Tourism Tax (PRPN - amt)</li>
                <li>• City tax(Amount)</li>
                <li>• Sales tax</li>
              </>
            )}
          </ul>

          {/* Refundable Status & Actions */}
          <div className="flex items-center justify-between mt-3">
            <div>
              {(ratePlan?.refund_policy === 'Refundable' || room.refundable) ? (
                <span className="text-xs text-teal-600">
                  {ratePlan?.refund_deadline || `Fully refundable before ${room.refundable_until || '11 Mar'}`}
                </span>
              ) : (
                <span className="text-xs text-orange-600">Non-refundable</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-green-600 font-medium">ORN_SPECIAL coupon applied</div>
                <div className="text-xs text-[#002B5B] hover:underline cursor-pointer">Block and pay later</div>
              </div>
              <button
                onClick={handleSelect}
                className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                data-testid={`select-room-${room.id}`}
              >
                {selectLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Room Category Section
function RoomCategory({ category, rooms, onSelectRoom, nights, totalGuests, selectLabel = 'select' }) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  
  const displayRooms = showAll ? rooms : rooms.slice(0, 2);
  const hasMore = rooms.length > 2;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      {/* Category Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <h3 className="font-bold text-gray-800">{category}</h3>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {/* Rooms */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="divide-y divide-gray-100"
          >
            {displayRooms.map((room, idx) => (
              <div key={room.id || idx} className="p-4">
                <RoomOption room={room} onSelect={onSelectRoom} nights={nights} totalGuests={totalGuests} selectLabel={selectLabel} />
              </div>
            ))}
            
            {hasMore && !showAll && (
              <div className="p-4 text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Show {rooms.length - 2} more
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main Hotel Details View Component
export default function HotelDetailsView({ hotel, onBack, onSelectRoom, onSelectRooms, checkIn, checkOut, nights = 4, totalGuests = 2, adults = 1, childrenCount = 0, bookingRooms = [] }) {
  const [activeTab, setActiveTab] = useState('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [mealFilter, setMealFilter] = useState('all');
  const [refundableOnly, setRefundableOnly] = useState(false);

  // Multi-room mode: when more than one room was booked, the agent picks a
  // room type per booked room (each filtered by that room's occupancy).
  const isMultiRoom = (bookingRooms?.length || 0) > 1;
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [selectedPerRoom, setSelectedPerRoom] = useState(() => (bookingRooms || []).map(() => null));

  // Reset per-room selections when the hotel or the room set changes.
  useEffect(() => {
    setSelectedPerRoom((bookingRooms || []).map(() => null));
    setActiveRoomIdx(0);
  }, [hotel?.id, bookingRooms?.length]);

  // Occupancy used for filtering: the active booked room in multi-room mode,
  // otherwise the single aggregate occupancy passed in.
  const effAdults = isMultiRoom ? (bookingRooms[activeRoomIdx]?.adults ?? 1) : adults;
  const effChildren = isMultiRoom ? (bookingRooms[activeRoomIdx]?.childrenCount ?? 0) : childrenCount;

  // Assign a chosen room type to the active booked room (multi-room) or just
  // select it (single-room). Auto-advances to the next unselected room.
  const handleRoomChosen = (room) => {
    if (!isMultiRoom) { onSelectRoom?.(room); return; }
    setSelectedPerRoom((prev) => {
      const next = [...prev];
      next[activeRoomIdx] = room;
      const nextIdx = next.findIndex((r, i) => i > activeRoomIdx && !r);
      const anyIdx = next.findIndex((r) => !r);
      const target = nextIdx !== -1 ? nextIdx : anyIdx;
      if (target !== -1) setActiveRoomIdx(target);
      return next;
    });
  };

  if (!hotel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">No hotel selected</div>
      </div>
    );
  }

  // Helper: does a blackout range overlap with the requested stay nights?
  // Intervals overlap iff (stay_in < blackout_to) AND (stay_out > blackout_from).
  const overlapsStay = (range) => {
    if (!range?.from || !range?.to || !checkIn || !checkOut) return false;
    return checkIn < range.to && checkOut > range.from;
  };

  // Occupancy filter: per user spec, when there are children we strictly
  // require `max_children >= childrenCount`. Likewise `max_adults >= adults`.
  // 1A/0C → every room qualifies. 2A+1C → Single (1A/0C) hidden, Family
  // (2A/2C) shown, Double (2A/0C) hidden, Triple-strict (3A/0C) hidden,
  // Triple-with-child (2A/1C) shown.
  const isOccupancyMatch = (roomType) => {
    const maxA = Number(roomType?.max_adults ?? 0);
    const maxC = Number(roomType?.max_children ?? 0);
    if (maxA < effAdults) return false;
    if (effChildren > 0 && maxC < effChildren) return false;
    return true;
  };

  // Get rooms from either room_types (new format) or rooms (legacy format)
  const getAllRooms = () => {
    // First check for room_types with rate_plans (new format)
    if (hotel.room_types && hotel.room_types.length > 0) {
      // Convert room_types to display format. Apply BOTH the occupancy
      // filter AND the per-room blackout filter before expanding rate plans.
      const eligibleRoomTypes = hotel.room_types.filter((rt) => {
        if (!isOccupancyMatch(rt)) return false;
        if (Array.isArray(rt.unavailable_dates) && rt.unavailable_dates.some(overlapsStay)) return false;
        return true;
      });
      return eligibleRoomTypes.flatMap(roomType => {
        // If room type has rate plans, create a room entry for each rate plan
        if (roomType.rate_plans && roomType.rate_plans.length > 0) {
          return roomType.rate_plans.map((ratePlan, idx) => ({
            id: ratePlan.id || `${roomType.id}_${idx}`,
            name: roomType.name || 'Standard Room',
            type: roomType.category || 'Standard',
            bed_type: roomType.bed_configuration?.join(', ') || '1 King',
            view: roomType.view_type || 'City View',
            size: roomType.room_size ? `${roomType.room_size} ${roomType.size_unit || 'sqm'}` : '30 sqm',
            price: ratePlan.price || 0,
            original_price: ratePlan.supplier_cost || null,
            currency: ratePlan.currency || 'AED',
            amenities: roomType.amenities || [],
            refundable: ratePlan.refund_policy === 'Refundable',
            refundable_until: ratePlan.refund_deadline || '24 hours before',
            meals: ratePlan.meal_plan || 'Room Only',
            images: roomType.images || [],
            rate_plan: ratePlan,
            room_type: roomType,
            recommended: roomType.recommended || false
          }));
        }
        // If no rate plans, create a single room entry
        return [{
          id: roomType.id || `room_${Date.now()}`,
          name: roomType.name || 'Standard Room',
          type: roomType.category || 'Standard',
          bed_type: roomType.bed_configuration?.join(', ') || '1 King',
          view: roomType.view_type || 'City View',
          size: roomType.room_size ? `${roomType.room_size} ${roomType.size_unit || 'sqm'}` : '30 sqm',
          price: 0,
          currency: 'AED',
          amenities: roomType.amenities || [],
          refundable: true,
          meals: 'Room Only',
          images: roomType.images || [],
          room_type: roomType,
          recommended: roomType.recommended || false
        }];
      });
    }
    // Fall back to legacy rooms format
    return hotel.rooms || [];
  };

  const allRooms = getAllRooms();

  // Group rooms by type
  const roomsByCategory = allRooms.reduce((acc, room) => {
    const category = room.type || 'Standard';
    if (!acc[category]) acc[category] = [];
    acc[category].push(room);
    return acc;
  }, {});

  // Filter rooms — search/meal/refund only. Occupancy + blackout filters
  // are applied earlier in getAllRooms() (per user request: only show room
  // types that match the selected occupancy and respect per-room blackouts).
  const filterRooms = (rooms) => {
    return rooms.filter(room => {
      const matchesSearch = !searchQuery ||
        room.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMeal = mealFilter === 'all' ||
        (mealFilter === 'breakfast' && room.meals?.toLowerCase().includes('breakfast')) ||
        (mealFilter === 'none' && (room.meals === 'Room Only' || !room.meals));
      const matchesRefund = !refundableOnly || room.refundable;

      return matchesSearch && matchesMeal && matchesRefund;
    });
  };

  return (
    <div className="min-h-screen bg-white" data-testid="hotel-details-view">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#0066CC] hover:underline mb-4"
          data-testid="back-to-hotels"
        >
          <ArrowLeft size={16} />
          See all properties
        </button>

        {/* Hotel Title */}
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">{hotel.name}</h1>
          {hotel.recommended && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold" data-testid="hotel-detail-recommended-badge">
              Recommended
            </span>
          )}
          <div className="flex items-center gap-0.5">
            {Array.from({ length: hotel.star_rating || 4 }).map((_, i) => (
              <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>
        <p className="text-gray-600 flex items-center gap-1 mb-6">
          <MapPin size={16} className="text-gray-400" />
          {hotel.address || `${hotel.city}, ${hotel.country}`}
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Gallery & Description */}
          <div className="col-span-2">
            <ImageGallery images={hotel.images} hotelName={hotel.name} />

            {/* Description */}
            <div className="mt-6 prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {hotel.description || `A stay at ${hotel.name} places you in the heart of ${hotel.city}, within a 15-minute walk of major attractions. This upscale hotel features modern amenities and exceptional service.`}
              </p>

              {/* Nearby Attractions */}
              {Array.isArray(hotel.nearby_attractions) && hotel.nearby_attractions.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-sm font-bold text-gray-800 mb-2 not-prose">Distances to popular places</h4>
                  <ul className="space-y-1.5 not-prose">
                    {hotel.nearby_attractions.map((line, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <MapPin size={14} className="text-[#0066CC] mt-0.5 flex-shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nearby Airports */}
              {Array.isArray(hotel.nearby_airports) && hotel.nearby_airports.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-sm font-bold text-gray-800 mb-2 not-prose">The nearest major airports</h4>
                  <ul className="space-y-1.5 not-prose">
                    {hotel.nearby_airports.map((line, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <Plane size={14} className="text-[#0066CC] mt-0.5 flex-shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* What to Know */}
            <WhatToKnow highlights={hotel.highlights} hotel={hotel} />
          </div>

          {/* Right Column - Ratings */}
          <div className="col-span-1">
            <RatingBreakdown
              ratingScore={hotel.rating_score}
              ratingText={hotel.rating_text}
              reviewCount={hotel.review_count}
              detailedRatings={hotel.detailed_ratings}
            />
          </div>
        </div>

        {/* Room Availability Section */}
        <div className="mt-10 mb-10">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-8">
              {[
                { id: 'available', label: 'AVAILABLE OPTIONS' },
                { id: 'details', label: 'DETAILS' },
                { id: 'rooms', label: 'ROOMS' },
                { id: 'location', label: 'LOCATION' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "pb-3 text-sm font-medium transition-colors relative",
                    activeTab === tab.id
                      ? "text-[#0066CC] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0066CC]"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          {activeTab === 'available' && (
            <>
              {/* Per-room selector (multi-room occupancy) */}
              {isMultiRoom && (
                <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/40 p-3" data-testid="per-room-selector">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Choose a room type for each booked room</p>
                  <div className="flex flex-wrap gap-2">
                    {bookingRooms.map((br, i) => {
                      const sel = selectedPerRoom[i];
                      const active = i === activeRoomIdx;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveRoomIdx(i)}
                          className={cn(
                            'text-left px-3 py-2 rounded-lg border-2 transition-all min-w-[170px]',
                            active ? 'border-[#002B5B] bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                          )}
                          data-testid={`booking-room-tab-${i}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-gray-800">{br.label || `Room ${i + 1}`}</span>
                            {sel ? <Check size={15} className="text-green-600" /> : (active ? <span className="text-[10px] font-bold text-[#002B5B] uppercase">Selecting</span> : null)}
                          </div>
                          <div className="text-xs text-gray-500">{br.adults} adult{br.adults > 1 ? 's' : ''}{br.childrenCount > 0 ? ` + ${br.childrenCount} child` : ''}</div>
                          <div className={cn('text-xs mt-0.5 truncate', sel ? 'text-green-700' : 'text-gray-400')}>{sel ? `${sel.name} · ${sel.meals || 'Room Only'}` : 'No room selected'}</div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedPerRoom.every(Boolean) && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-blue-100 pt-3">
                      <div className="text-sm text-gray-600">
                        Total: <span className="font-bold text-[#002B5B]">AED {selectedPerRoom.reduce((s, r) => s + ((r?.price || 0) * nights), 0).toLocaleString()}</span>{' '}
                        <span className="text-xs text-gray-400">({nights} night{nights > 1 ? 's' : ''})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectRooms?.(selectedPerRoom)}
                        className="px-5 py-2.5 bg-[#002B5B] text-white font-bold rounded-lg hover:bg-[#003d82] transition-colors"
                        data-testid="confirm-rooms-btn"
                      >
                        Confirm {selectedPerRoom.length} Rooms
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-xs">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search room..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="search-room-input"
                  />
                </div>
                <select
                  value={mealFilter}
                  onChange={(e) => setMealFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="meal-filter"
                >
                  <option value="all">Meal Plans</option>
                  <option value="breakfast">Breakfast Included</option>
                  <option value="none">Room Only</option>
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundableOnly}
                    onChange={(e) => setRefundableOnly(e.target.checked)}
                    className="rounded border-gray-300 text-[#002B5B] focus:ring-[#002B5B]"
                    data-testid="refundable-filter"
                  />
                  <span className="text-sm text-gray-600">Refundable</span>
                </label>
              </div>

              {/* Room Categories */}
              {Object.entries(roomsByCategory).map(([category, rooms]) => {
                const filteredRooms = filterRooms(rooms);
                if (filteredRooms.length === 0) return null;
                
                return (
                  <RoomCategory
                    key={category}
                    category={`${category} Room`}
                    rooms={filteredRooms}
                    onSelectRoom={handleRoomChosen}
                    nights={nights}
                    totalGuests={totalGuests}
                    selectLabel={isMultiRoom ? `Select for ${bookingRooms[activeRoomIdx]?.label || `Room ${activeRoomIdx + 1}`}` : 'select'}
                  />
                );
              })}

              {/* If no rooms match filters */}
              {Object.entries(roomsByCategory).every(([_, rooms]) => filterRooms(rooms).length === 0) && allRooms.length > 0 && (
                <div className="text-center py-12 text-gray-500 bg-amber-50 border border-amber-200 rounded-lg">
                  <Users size={48} className="mx-auto mb-4 text-amber-400" />
                  <p className="font-medium text-amber-700">No rooms match the selected filters</p>
                  <p className="text-sm text-amber-600 mt-2">Try adjusting the search, meal plan, or refundable filters</p>
                </div>
              )}

              {/* If no rooms at all — distinguish "no rooms in catalog" vs
                  "all filtered out by occupancy / blackout" so the agent
                  knows why nothing is showing. */}
              {Object.keys(roomsByCategory).length === 0 && (
                <div className="text-center py-12 text-gray-500" data-testid="no-rooms-available">
                  <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
                  {(hotel.room_types?.length || hotel.rooms?.length) ? (
                    <>
                      <p className="font-medium text-gray-700">No rooms available for this selection</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {(() => {
                          const hints = [];
                          if (effChildren > 0) hints.push(`${effAdults} adult${effAdults > 1 ? 's' : ''} + ${effChildren} child${effChildren > 1 ? 'ren' : ''}`);
                          else hints.push(`${effAdults} adult${effAdults > 1 ? 's' : ''}`);
                          if (checkIn && checkOut) hints.push(`${checkIn} → ${checkOut}`);
                          return `Occupancy: ${hints.join(' • ')}. All room types are either too small or unavailable for these dates.`;
                        })()}
                      </p>
                    </>
                  ) : (
                    <p>No room options available</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Other tabs placeholders */}
          {activeTab === 'details' && (
            <div className="py-8">
              <h3 className="text-lg font-bold mb-4">Hotel Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Amenities</h4>
                  <ul className="space-y-1">
                    {(hotel.amenities || ['Free WiFi', 'Pool', 'Spa', 'Fitness Center']).map((amenity, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                        <Check size={14} className="text-green-500" />
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Check-in / Check-out</h4>
                  <p className="text-sm text-gray-600">Check-in: {hotel.check_in_time || '15:00'}</p>
                  <p className="text-sm text-gray-600">Check-out: {hotel.check_out_time || '12:00'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="py-8">
              <h3 className="text-lg font-bold mb-4">All Room Types</h3>
              <div className="space-y-4">
                {allRooms.map((room, idx) => (
                  <div key={idx} className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-bold">{room.name}</h4>
                    <p className="text-sm text-gray-500">{room.bed_type} • {room.size} • {room.view}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(room.amenities || []).map((amenity, i) => (
                        <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{amenity}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {allRooms.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No rooms defined for this hotel</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="py-8">
              <h3 className="text-lg font-bold mb-4">Location</h3>
              <p className="text-gray-600">{hotel.address || `${hotel.city}, ${hotel.country}`}</p>
              <div className="mt-4 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <MapPin size={48} className="text-gray-300" />
                <span className="ml-2 text-gray-400">Map view coming soon</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

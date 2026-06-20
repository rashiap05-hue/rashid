import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Loader2, Star, Hotel, Filter, Wifi } from 'lucide-react';
import { api } from '@/App';
import HotelDetailsView from '../HotelDetailsView';

function HotelSelectionModal({ isOpen, onClose, city, checkIn, checkOut, nights, onSelect, searchQuery = '', initialHotel = null, totalGuests = 2, adults = 1, children = 0, bookingRooms = [], roomConfig = [], onRoomsChange }) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [filterQuery, setFilterQuery] = useState(searchQuery);
  
  const [sortBy, setSortBy] = useState('recommended');
  const [starFilter, setStarFilter] = useState([]);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState([]);
  const [mealPlanFilter, setMealPlanFilter] = useState([]);
  const [amenitiesFilter, setAmenitiesFilter] = useState([]);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setFilterQuery(searchQuery);
      if (initialHotel) {
        setSelectedHotel(initialHotel);
        setViewMode('detail');
      } else {
        setSelectedHotel(null);
        setViewMode('list');
      }
      fetchHotels();
    }
  }, [isOpen, city, searchQuery, initialHotel]);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const cityParam = city ? `?city=${encodeURIComponent(city)}` : '';
      const res = await api.get(`/hotels${cityParam}`);
      let hotelList = res.data?.hotels || [];
      
      if (searchQuery) {
        hotelList = hotelList.filter(h => 
          h.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setHotels(hotelList);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const propertyTypes = ['Hotel', 'Apart Hotel', 'Apartment', 'Hostel', 'Resort', 'Villa'];
  const mealPlans = ['Room Only', 'Bed and Breakfast', 'Half Board', 'Full Board', 'All Inclusive'];
  const amenitiesList = ['Free WiFi', 'Air Conditioning', 'Parking Facility', 'Restaurant', 'Swimming Pool', 'Spa', 'Gym', '24 hr Front Desk', 'Room Service', 'Pet Friendly'];

  const getFilteredHotels = () => {
    let filtered = hotels;
    
    if (filterQuery) {
      filtered = filtered.filter(h => 
        h.name?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        h.city?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        h.location?.toLowerCase().includes(filterQuery.toLowerCase())
      );
    }
    
    if (starFilter.length > 0) {
      filtered = filtered.filter(h => starFilter.includes(h.star_rating || 4));
    }
    
    if (propertyTypeFilter.length > 0) {
      filtered = filtered.filter(h => 
        propertyTypeFilter.some(type => 
          (h.property_type || 'Hotel').toLowerCase().includes(type.toLowerCase())
        )
      );
    }
    
    if (mealPlanFilter.length > 0) {
      filtered = filtered.filter(h => {
        const hotelMeals = h.rooms?.some(r => 
          mealPlanFilter.some(meal => 
            (r.meals || 'Room Only').toLowerCase().includes(meal.toLowerCase())
          )
        );
        return hotelMeals;
      });
    }
    
    if (amenitiesFilter.length > 0) {
      filtered = filtered.filter(h => {
        const hotelAmenities = h.amenities || [];
        return amenitiesFilter.every(amenity => 
          hotelAmenities.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
        );
      });
    }
    
    const getCheapestPrice = (hotel) => {
      const rooms = hotel.rooms || [];
      if (rooms.length === 0) return 0;
      return Math.min(...rooms.map(r => r.price_per_night || r.price || Infinity));
    };
    
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => getCheapestPrice(a) - getCheapestPrice(b));
        break;
      case 'price_high':
        filtered.sort((a, b) => getCheapestPrice(b) - getCheapestPrice(a));
        break;
      case 'name_asc':
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_desc':
        filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0));
        break;
      case 'recommended':
      default:
        // Recommended hotels first, then by rating
        filtered.sort((a, b) => {
          if (a.recommended && !b.recommended) return -1;
          if (!a.recommended && b.recommended) return 1;
          return (b.rating_score || 0) - (a.rating_score || 0);
        });
        break;
    }
    
    return filtered;
  };
  
  const filteredHotels = getFilteredHotels();

  const toggleStarFilter = (star) => {
    setStarFilter(prev => 
      prev.includes(star) ? prev.filter(s => s !== star) : [...prev, star]
    );
  };
  
  const togglePropertyType = (type) => {
    setPropertyTypeFilter(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };
  
  const toggleMealPlan = (meal) => {
    setMealPlanFilter(prev => 
      prev.includes(meal) ? prev.filter(m => m !== meal) : [...prev, meal]
    );
  };
  
  const toggleAmenity = (amenity) => {
    setAmenitiesFilter(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };
  
  const clearAllFilters = () => {
    setFilterQuery('');
    setStarFilter([]);
    setPropertyTypeFilter([]);
    setMealPlanFilter([]);
    setAmenitiesFilter([]);
    setSortBy('recommended');
  };

  const handleSelectHotel = (hotel, roomOrRooms) => {
    // `roomOrRooms` is an array when the user picked a room type per booked
    // room (multi-room occupancy), otherwise a single room object.
    const selectedRooms = Array.isArray(roomOrRooms) ? roomOrRooms : [roomOrRooms];
    onSelect({
      ...hotel,
      selectedRoom: selectedRooms[0],
      selectedRooms,
      checkIn,
      checkOut,
      nights
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="bg-[#002B5B] text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Select Hotel - {nights} Nights {city}</h2>
            <p className="text-sm text-blue-200">
              {(() => {
                // checkIn/checkOut are ISO YYYY-MM-DD (used by blackout
                // overlap math). Pretty-print them for the header only.
                const fmt = (iso) => {
                  if (!iso) return '';
                  try {
                    return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
                  } catch { return iso; }
                };
                return `${fmt(checkIn)} - ${fmt(checkOut)}`;
              })()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
            >
              <Filter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {viewMode === 'list' && showFilters && (
            <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50 p-4 flex-shrink-0">
              <div className="mb-5">
                <h4 className="font-bold text-gray-700 text-sm mb-2">Search by property</h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="mb-5 pb-4 border-b border-dashed border-gray-300">
                <h4 className="font-bold text-gray-700 text-sm mb-2">Star rating</h4>
                <div className="space-y-1.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <label key={star} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded">
                      <input
                        type="checkbox"
                        checked={starFilter.includes(star)}
                        onChange={() => toggleStarFilter(star)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex">
                        {Array.from({ length: star }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="mb-5 pb-4 border-b border-dashed border-gray-300">
                <h4 className="font-bold text-gray-700 text-sm mb-2">Property type</h4>
                <div className="space-y-1.5">
                  {propertyTypes.map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded text-sm">
                      <input
                        type="checkbox"
                        checked={propertyTypeFilter.includes(type)}
                        onChange={() => togglePropertyType(type)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-600">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="mb-5 pb-4 border-b border-dashed border-gray-300">
                <h4 className="font-bold text-gray-700 text-sm mb-2">Meal Plan</h4>
                <div className="space-y-1.5">
                  {mealPlans.map(meal => (
                    <label key={meal} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded text-sm">
                      <input
                        type="checkbox"
                        checked={mealPlanFilter.includes(meal)}
                        onChange={() => toggleMealPlan(meal)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-600">{meal}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="mb-5">
                <h4 className="font-bold text-gray-700 text-sm mb-2">Amenities</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {amenitiesList.map(amenity => (
                    <label key={amenity} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded text-sm">
                      <input
                        type="checkbox"
                        checked={amenitiesFilter.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-600">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {(starFilter.length > 0 || propertyTypeFilter.length > 0 || mealPlanFilter.length > 0 || amenitiesFilter.length > 0 || filterQuery) && (
                <button
                  onClick={clearAllFilters}
                  className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6">
            {viewMode === 'list' && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  {filteredHotels.length} hotel{filteredHotels.length !== 1 ? 's' : ''} found
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price_low">Price - Low to High</option>
                    <option value="price_high">Price - High to Low</option>
                    <option value="rating">Star Rating</option>
                    <option value="name_asc">Name - A to Z</option>
                    <option value="name_desc">Name - Z to A</option>
                  </select>
                </div>
              </div>
            )}
            
            {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#002B5B] animate-spin" />
              <p className="mt-4 text-gray-500 font-medium">Searching for hotels...</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {filteredHotels.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Hotel className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">{filterQuery ? `No hotels found for "${filterQuery}"` : 'No hotels available for this destination'}</p>
                </div>
              ) : (
                filteredHotels.map((hotel) => (
                  <div 
                    key={hotel.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedHotel(hotel);
                      setViewMode('detail');
                    }}
                    data-testid={`hotel-option-${hotel.id}`}
                  >
                    <div className="flex">
                      <div className="w-48 h-36 flex-shrink-0">
                        <img 
                          src={hotel.images?.[0] || 'https://via.placeholder.com/200x150?text=Hotel'} 
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-800">{hotel.name}</h3>
                              {hotel.recommended && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold" data-testid={`hotel-recommended-${hotel.id}`}>
                                  Recommended
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {Array.from({ length: hotel.star_rating || 4 }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{hotel.city}, {hotel.country}</p>
                          </div>
                          <div className="text-right">
                            <div className="bg-green-100 text-green-700 px-2 py-1 rounded font-bold text-sm">
                              {hotel.rating_score || 8.5}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{hotel.rating_text || 'Excellent'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          {hotel.amenities?.slice(0, 4).map((amenity, i) => (
                            <span key={`${amenity}-${i}`} className="flex items-center gap-1">
                              {amenity === 'Free WiFi' && <Wifi size={12} />}
                              {amenity === 'Pool' && <span>🏊</span>}
                              {amenity === 'Spa' && <span>💆</span>}
                              {amenity}
                            </span>
                          ))}
                        </div>
                        <div className="flex justify-between items-end mt-3">
                          <p className="text-xs text-green-600 font-medium">Fully refundable before check-in</p>
                          <div className="text-right">
                            {(() => {
                              const rooms = hotel.rooms || [];
                              const cheapestRoom = rooms.length > 0 
                                ? rooms.reduce((min, room) => 
                                    (room.price_per_night || room.price || Infinity) < (min.price_per_night || min.price || Infinity) ? room : min
                                  , rooms[0])
                                : null;
                              const cheapestPrice = cheapestRoom?.price_per_night || cheapestRoom?.price || 180;
                              const originalPrice = cheapestRoom?.original_price || Math.round(cheapestPrice * 1.1);
                              
                              return (
                                <>
                                  <p className="text-xs text-gray-400 line-through">AED {originalPrice * nights}</p>
                                  <p className="text-lg font-bold text-[#002B5B]">AED {cheapestPrice * nights}</p>
                                  <p className="text-xs text-gray-500">for {nights} nights</p>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <HotelDetailsView
              hotel={selectedHotel}
              onBack={() => setViewMode('list')}
              onSelectRoom={(room) => handleSelectHotel(selectedHotel, room)}
              onSelectRooms={(rooms) => handleSelectHotel(selectedHotel, rooms)}
              checkIn={checkIn}
              checkOut={checkOut}
              nights={nights}
              totalGuests={totalGuests}
              adults={adults}
              childrenCount={children}
              bookingRooms={bookingRooms}
              roomConfig={roomConfig}
              onRoomsChange={onRoomsChange}
            />
          )}
        </div>
        </div>
      </motion.div>
    </div>
  );
}

export default HotelSelectionModal;

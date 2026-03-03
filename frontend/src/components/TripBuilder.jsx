import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Hotel, MapPin, Calendar, Users, ChevronDown, ChevronRight, 
  Plus, X, Check, Star, Clock, Coffee, Wifi, Car, Edit2, Loader2,
  CreditCard, Save, ArrowRight, Sun, Moon, Utensils, Camera, Info, AlertCircle,
  List, Ban, Search, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';
import FlightSearchModal from './FlightSearchModal';
import HotelDetailsView from './HotelDetailsView';

// Hotel Options Modal Component (Choose how to change hotel)
function HotelOptionsModal({ isOpen, onClose, city, onViewAll, onNoStay, onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

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
        className="relative bg-[#F5F5F5] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-8 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Option 1: View all stay options */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onViewAll}
              className="bg-white rounded-2xl p-8 text-center hover:shadow-lg transition-all border border-gray-100 min-h-[320px] flex flex-col items-center justify-center"
              data-testid="view-all-hotels"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <List className="text-[#002B5B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 italic">
                View all stay options in {city}
              </h3>
            </motion.button>

            {/* Option 2: No stay required */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNoStay}
              className="bg-white rounded-2xl p-8 text-center hover:shadow-lg transition-all border border-gray-100 min-h-[320px] flex flex-col items-center justify-center"
              data-testid="no-stay-required"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Ban className="text-[#002B5B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 italic">
                No stay required in {city}
              </h3>
            </motion.button>

            {/* Option 3: Search for particular hotel */}
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 min-h-[320px] flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Hotel className="text-[#002B5B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 italic mb-6">
                Looking for a particular hotel
              </h3>
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by property name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm"
                  data-testid="hotel-search-input"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Hotel Selection Modal Component
function HotelSelectionModal({ isOpen, onClose, city, checkIn, checkOut, nights, onSelect, searchQuery = '' }) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [filterQuery, setFilterQuery] = useState(searchQuery);

  useEffect(() => {
    if (isOpen) {
      setFilterQuery(searchQuery);
      fetchHotels();
    }
  }, [isOpen, city, searchQuery]);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      // Fetch hotels filtered by city
      const cityParam = city ? `?city=${encodeURIComponent(city)}` : '';
      const res = await api.get(`/hotels${cityParam}`);
      let hotelList = res.data?.hotels || [];
      
      // Additional search filter if provided
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

  // Filter hotels based on current filter query
  const filteredHotels = filterQuery 
    ? hotels.filter(h => 
        h.name?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        h.city?.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : hotels;

  const handleSelectHotel = (hotel, room) => {
    onSelect({
      ...hotel,
      selectedRoom: room,
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
        className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#002B5B] text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Select Hotel in {city}</h2>
            <p className="text-sm text-blue-200">{checkIn} - {checkOut} ({nights} nights)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search Filter */}
          {viewMode === 'list' && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search hotels by name..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm"
                />
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
                            <h3 className="font-bold text-gray-800">{hotel.name}</h3>
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
                            <span key={i} className="flex items-center gap-1">
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
                            <p className="text-xs text-gray-400 line-through">AED {(hotel.rooms?.[0]?.original_price || 2000) * nights}</p>
                            <p className="text-lg font-bold text-[#002B5B]">AED {(hotel.rooms?.[0]?.price || 1800) * nights}</p>
                            <p className="text-xs text-gray-500">for {nights} nights</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Hotel Detail View - Using HotelDetailsView Component */
            <HotelDetailsView
              hotel={selectedHotel}
              onBack={() => setViewMode('list')}
              onSelectRoom={(room) => handleSelectHotel(selectedHotel, room)}
              checkIn={checkIn}
              checkOut={checkOut}
              nights={nights}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Day Card Component
function DayCard({ day, date, city, activities, isFirst, isLast, isDeparture, onAddActivity, onChangeHotel, hotel, onSelectArrivalTransfer, onSelectDepartureTransfer, selectedArrivalTransfer, selectedDepartureTransfer }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full px-6 py-4 flex items-center justify-between text-white",
          isDeparture 
            ? "bg-gradient-to-r from-orange-500 to-orange-600" 
            : "bg-gradient-to-r from-[#002B5B] to-[#004080]"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold">
            {day}
          </div>
          <div className="text-left">
            <h3 className="font-bold">{isDeparture ? `${date} - Return Day` : date}</h3>
            <p className={cn("text-sm", isDeparture ? "text-orange-100" : "text-blue-200")}>{city}</p>
          </div>
        </div>
        <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {/* Arrival on Day 1 */}
              {isFirst && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Plane className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">Arrival at {city}</p>
                    {selectedArrivalTransfer ? (
                      <div className="mt-1">
                        <p className="text-sm text-green-600 font-medium">{selectedArrivalTransfer.title}</p>
                        <p className="text-xs text-gray-500">{selectedArrivalTransfer.vehicle_type} • {selectedArrivalTransfer.duration} • {selectedArrivalTransfer.price} AED</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Transfer from airport to hotel</p>
                    )}
                  </div>
                  <button 
                    onClick={() => onSelectArrivalTransfer && onSelectArrivalTransfer(city)}
                    className="bg-[#002B5B] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#003d82] transition-all flex items-center gap-2"
                    data-testid="select-arrival-transfer"
                  >
                    <Car size={16} />
                    {selectedArrivalTransfer ? 'Change' : 'Select Transfer'}
                  </button>
                </div>
              )}

              {/* Departure Day (Return) */}
              {isDeparture && (
                <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Plane className="text-orange-600 rotate-45" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">Return Flight - Departure from {city}</p>
                    {selectedDepartureTransfer ? (
                      <div className="mt-1">
                        <p className="text-sm text-green-600 font-medium">{selectedDepartureTransfer.title}</p>
                        <p className="text-xs text-gray-500">{selectedDepartureTransfer.vehicle_type} • {selectedDepartureTransfer.duration} • {selectedDepartureTransfer.price} AED</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Check-out from hotel & transfer to airport</p>
                    )}
                  </div>
                  <button 
                    onClick={() => onSelectDepartureTransfer && onSelectDepartureTransfer(city)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition-all flex items-center gap-2"
                    data-testid="select-departure-transfer"
                  >
                    <Car size={16} />
                    {selectedDepartureTransfer ? 'Change' : 'Select Transfer'}
                  </button>
                </div>
              )}

              {/* Hotel Stay Reference (only for non-departure days) */}
              {!isDeparture && hotel && (
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                  <img 
                    src={hotel.images?.[0] || 'https://via.placeholder.com/80'} 
                    alt={hotel.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{hotel.name}</p>
                    <p className="text-sm text-gray-500">{hotel.selectedRoom?.name || 'Standard Room'}</p>
                  </div>
                  <Check className="text-green-500" size={20} />
                </div>
              )}
              
              {!isDeparture && !hotel && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Hotel className="text-gray-400" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-500">No Hotel Selected</p>
                    <p className="text-sm text-gray-400">Add a hotel for your stay in {city}</p>
                  </div>
                  <button 
                    onClick={onChangeHotel}
                    className="bg-[#002B5B] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#003d82] transition-all"
                  >
                    Add Hotel
                  </button>
                </div>
              )}

              {/* Meals (only for non-departure days) */}
              {!isDeparture && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Sun className="text-yellow-500" size={16} />
                    <span className="text-sm text-gray-600">Breakfast: {hotel ? 'Included' : 'Not included'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Utensils className="text-orange-500" size={16} />
                    <span className="text-sm text-gray-600">Lunch: Not included</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Moon className="text-purple-500" size={16} />
                    <span className="text-sm text-gray-600">Dinner: Not included</span>
                  </div>
                </div>
              )}

              {/* Activities (only for non-departure days) */}
              {!isDeparture && activities?.length > 0 && (
                <div className="space-y-2">
                  {activities.map((activity, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Camera className="text-purple-600" size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{activity.name}</p>
                        <p className="text-sm text-gray-500">{activity.duration}</p>
                      </div>
                      <span className="font-bold text-[#002B5B]">AED {activity.price}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Activity Button (only for non-departure days) */}
              {!isDeparture && (
                <button 
                  onClick={onAddActivity}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-[#002B5B] hover:text-[#002B5B] transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Activity in {city}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main Trip Builder Component
export default function TripBuilder({ data, user, onBack, onConfirm }) {
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showHotelOptions, setShowHotelOptions] = useState(false);
  const [selectedHotels, setSelectedHotels] = useState({});
  const [activeHotelCity, setActiveHotelCity] = useState(null);
  const [hotelSearchQuery, setHotelSearchQuery] = useState('');
  const [noStayCities, setNoStayCities] = useState({});
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Transfer state
  const [availableTransfers, setAvailableTransfers] = useState([]);
  const [selectedArrivalTransfer, setSelectedArrivalTransfer] = useState(null);
  const [selectedDepartureTransfer, setSelectedDepartureTransfer] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferModalType, setTransferModalType] = useState('arrival'); // 'arrival' or 'departure'
  const [transferCity, setTransferCity] = useState(null);

  // Fetch transfers for the destination country
  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        // Get the first city to determine the country
        const destinationCity = data?.cities?.[0]?.name;
        if (!destinationCity) return;
        
        // Fetch city details to get the country
        const cityRes = await api.get(`/cities?search=${encodeURIComponent(destinationCity)}`);
        const cityData = cityRes.data?.cities?.[0];
        const country = cityData?.country;
        
        if (country) {
          // Fetch transfers for this city
          const transferRes = await api.get(`/transfers?city=${encodeURIComponent(destinationCity)}`);
          let transfers = transferRes.data?.transfers || [];
          
          // If no transfers for specific city, try fetching by country match
          if (transfers.length === 0) {
            const allTransfersRes = await api.get('/transfers');
            const allTransfers = allTransfersRes.data?.transfers || [];
            // Filter transfers that are in cities of the same country
            // For now, we'll use city-based matching since transfers have city field
            transfers = allTransfers.filter(t => {
              const transferCity = t.city?.toLowerCase() || '';
              const destCity = destinationCity.toLowerCase();
              // Match by city name or country-related keywords
              return transferCity.includes(destCity) || 
                     destCity.includes(transferCity) ||
                     transferCity.includes(country.toLowerCase().split(' ')[0]);
            });
            
            // If still no matches, show all transfers from the same general region
            if (transfers.length === 0) {
              transfers = allTransfers;
            }
          }
          
          setAvailableTransfers(transfers);
        }
      } catch (error) {
        console.error('Error fetching transfers:', error);
      }
    };
    
    fetchTransfers();
  }, [data?.cities]);

  // Open transfer selection modal
  const openTransferModal = (type, city) => {
    setTransferModalType(type);
    setTransferCity(city);
    setShowTransferModal(true);
  };

  // Select a transfer
  const handleSelectTransfer = (transfer) => {
    if (transferModalType === 'arrival') {
      setSelectedArrivalTransfer(transfer);
    } else {
      setSelectedDepartureTransfer(transfer);
    }
    setShowTransferModal(false);
  };

  // Handle hotel option selection
  const handleChangeHotel = (cityName) => {
    setActiveHotelCity(cityName);
    setShowHotelOptions(true);
  };

  const handleViewAllHotels = () => {
    setShowHotelOptions(false);
    setHotelSearchQuery('');
    setShowHotelModal(true);
  };

  const handleNoStay = () => {
    setNoStayCities(prev => ({ ...prev, [activeHotelCity]: true }));
    setSelectedHotels(prev => {
      const newHotels = { ...prev };
      delete newHotels[activeHotelCity];
      return newHotels;
    });
    setShowHotelOptions(false);
  };

  const handleSearchHotel = (query) => {
    setHotelSearchQuery(query);
    setShowHotelOptions(false);
    setShowHotelModal(true);
  };

  // Calculate trip details
  const cities = data?.cities || [];
  const totalNights = cities.reduce((acc, c) => acc + (c.nights || 1), 0);
  const totalDays = totalNights + 1; // Days = Nights + 1 (departure day)
  
  // Format date
  let startDate = new Date(data?.leaving_on || new Date());
  
  // Calculate return date (departure date + total nights)
  const returnDate = new Date(startDate);
  returnDate.setDate(returnDate.getDate() + totalNights);
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };
  
  const formatShortDate = (date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  // Generate itinerary days - including departure day
  const generateItinerary = () => {
    const days = [];
    let currentDate = new Date(startDate);
    let dayNumber = 1;
    
    // Generate days for each city's nights
    cities.forEach((city, cityIndex) => {
      for (let night = 0; night < (city.nights || 1); night++) {
        days.push({
          day: dayNumber,
          date: formatDate(currentDate),
          city: city.name,
          cityIndex,
          isFirst: dayNumber === 1,
          isLast: false,
          isDeparture: false,
          hotel: selectedHotels[city.name]
        });
        currentDate.setDate(currentDate.getDate() + 1);
        dayNumber++;
      }
    });

    // Add departure day (the day after the last night)
    if (days.length > 0) {
      const lastCity = cities[cities.length - 1];
      days.push({
        day: dayNumber,
        date: formatDate(currentDate),
        city: lastCity?.name || 'Destination',
        cityIndex: cities.length - 1,
        isFirst: false,
        isLast: true,
        isDeparture: true,
        hotel: null
      });
    }

    return days;
  };

  const itinerary = generateItinerary();

  // Calculate pricing
  const calculatePricing = () => {
    let hotelTotal = 0;
    Object.values(selectedHotels).forEach(hotel => {
      if (hotel?.selectedRoom?.price) {
        hotelTotal += hotel.selectedRoom.price * (hotel.nights || 1);
      }
    });

    const flightPrice = selectedFlight ? parseFloat(selectedFlight.price?.replace(',', '') || 0) : 0;
    const arrivalTransferPrice = selectedArrivalTransfer?.price || 0;
    const departureTransferPrice = selectedDepartureTransfer?.price || 0;
    const transferTotal = arrivalTransferPrice + departureTransferPrice;
    
    const adultsCount = data?.room_data?.reduce((acc, r) => acc + r.adults, 0) || 2;
    const childrenCount = data?.room_data?.reduce((acc, r) => acc + r.children?.length, 0) || 0;
    
    const subtotal = hotelTotal + flightPrice + transferTotal;
    const pricePerAdult = Math.round(subtotal / adultsCount);
    const pricePerChild = Math.round(pricePerAdult * 0.7); // 30% discount for children

    return {
      hotelTotal,
      flightPrice,
      transferTotal,
      arrivalTransferPrice,
      departureTransferPrice,
      pricePerAdult,
      pricePerChild,
      adultsCount,
      childrenCount,
      total: subtotal
    };
  };

  const pricing = calculatePricing();

  // Handle hotel selection
  const handleHotelSelect = (hotel) => {
    setSelectedHotels(prev => ({
      ...prev,
      [activeHotelCity]: hotel
    }));
    setShowHotelModal(false);
  };

  // Handle save proposal
  const handleSaveProposal = async () => {
    setIsSaving(true);
    try {
      await api.post('/proposals', {
        leaving_from: data.leaving_from,
        nationality: data.nationality,
        leaving_on: data.leaving_on,
        star_rating: data.star_rating,
        add_transfers: data.add_transfers,
        room_data: data.room_data,
        cities: data.cities,
        selected_flight: selectedFlight,
        selected_hotels: selectedHotels,
        total_price: pricing.total
      });
      onConfirm();
    } catch (error) {
      console.error('Error saving proposal:', error);
      alert('Failed to save proposal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle payment
  const handlePayment = async () => {
    setIsPaymentLoading(true);
    try {
      const proposalRes = await api.post('/proposals', {
        leaving_from: data.leaving_from,
        nationality: data.nationality,
        leaving_on: data.leaving_on,
        star_rating: data.star_rating,
        add_transfers: data.add_transfers,
        room_data: data.room_data,
        cities: data.cities,
        selected_flight: selectedFlight,
        selected_hotels: selectedHotels,
        total_price: pricing.total
      });

      const origin = window.location.origin;
      const paymentRes = await api.post(`/payments/stripe/checkout?proposal_id=${proposalRes.data.id}&origin_url=${origin}`);
      
      if (paymentRes.data.url) {
        window.location.href = paymentRes.data.url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment initiation failed. Please try again.');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#F0F2F5]" data-testid="trip-builder">
      {/* Flight Search Modal */}
      <FlightSearchModal 
        isOpen={showFlightSearch} 
        onClose={() => setShowFlightSearch(false)} 
        initialFrom={data.leaving_from}
        initialTo={cities[0]?.name}
        onSelect={(flight) => setSelectedFlight(flight)}
      />

      {/* Hotel Selection Modal */}
      <HotelSelectionModal
        isOpen={showHotelModal}
        onClose={() => setShowHotelModal(false)}
        city={activeHotelCity}
        checkIn={formatDate(startDate)}
        checkOut={formatDate(new Date(startDate.getTime() + totalNights * 24 * 60 * 60 * 1000))}
        nights={cities.find(c => c.name === activeHotelCity)?.nights || 1}
        onSelect={handleHotelSelect}
        searchQuery={hotelSearchQuery}
      />

      {/* Hotel Options Modal (Change Hotel choices) */}
      <HotelOptionsModal
        isOpen={showHotelOptions}
        onClose={() => setShowHotelOptions(false)}
        city={activeHotelCity}
        onViewAll={handleViewAllHotels}
        onNoStay={handleNoStay}
        onSearch={handleSearchHotel}
      />

      {/* Transfer Selection Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowTransferModal(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className={cn(
                "px-6 py-4 flex items-center justify-between",
                transferModalType === 'arrival' 
                  ? "bg-gradient-to-r from-[#002B5B] to-[#004080]" 
                  : "bg-gradient-to-r from-orange-500 to-orange-600"
              )}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Car className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {transferModalType === 'arrival' ? 'Select Arrival Transfer' : 'Select Departure Transfer'}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {transferModalType === 'arrival' 
                        ? `Airport to hotel transfer in ${transferCity}`
                        : `Hotel to airport transfer from ${transferCity}`
                      }
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTransferModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Transfer List */}
              <div className="flex-1 overflow-y-auto p-6">
                {availableTransfers.length === 0 ? (
                  <div className="text-center py-12">
                    <Car size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No transfers available for this destination</p>
                    <p className="text-gray-400 text-sm mt-2">Please contact support to arrange transfer</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableTransfers.map((transfer) => (
                      <motion.div
                        key={transfer.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectTransfer(transfer)}
                        className={cn(
                          "p-5 rounded-xl border-2 cursor-pointer transition-all",
                          (transferModalType === 'arrival' && selectedArrivalTransfer?.id === transfer.id) ||
                          (transferModalType === 'departure' && selectedDepartureTransfer?.id === transfer.id)
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-[#002B5B] hover:shadow-md bg-white"
                        )}
                        data-testid={`transfer-option-${transfer.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                              transfer.transfer_type === 'Luxury' ? 'bg-amber-100 text-amber-700' :
                              transfer.transfer_type === 'Shared' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                            )}>
                              {transfer.transfer_type}
                            </span>
                            {transfer.vehicle_type && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                {transfer.vehicle_type}
                              </span>
                            )}
                          </div>
                          {((transferModalType === 'arrival' && selectedArrivalTransfer?.id === transfer.id) ||
                            (transferModalType === 'departure' && selectedDepartureTransfer?.id === transfer.id)) && (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="text-white" size={14} />
                            </div>
                          )}
                        </div>
                        
                        <h4 className="font-bold text-gray-800 text-sm mb-2 line-clamp-2">{transfer.title}</h4>
                        
                        <div className="space-y-1.5 text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-green-500 flex-shrink-0" />
                            <span className="truncate">{transfer.from_location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-red-500 flex-shrink-0" />
                            <span className="truncate">{transfer.to_location}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{transfer.duration}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={12} />
                              <span>{transfer.max_bags || 2} bags</span>
                            </div>
                          </div>
                          <div className="text-lg font-bold text-[#002B5B]">
                            {transfer.price} <span className="text-xs font-normal text-gray-500">AED</span>
                          </div>
                        </div>
                        
                        {transfer.pickup_times && transfer.pickup_times.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-1">Pick-up times:</p>
                            <div className="flex flex-wrap gap-1">
                              {transfer.pickup_times.slice(0, 4).map((time, idx) => (
                                <span key={idx} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                  {time}
                                </span>
                              ))}
                              {transfer.pickup_times.length > 4 && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  +{transfer.pickup_times.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {availableTransfers.length} transfer option{availableTransfers.length !== 1 ? 's' : ''} available
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className={cn(
                      "px-6 py-2 rounded-xl font-bold text-white transition-colors",
                      transferModalType === 'arrival'
                        ? "bg-[#002B5B] hover:bg-[#003d82]"
                        : "bg-orange-500 hover:bg-orange-600"
                    )}
                  >
                    Confirm Selection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Progress Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  <Check size={16} />
                </div>
                <span className="font-bold text-gray-400">Trip Details</span>
              </div>
              <ChevronRight className="text-gray-300" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#002B5B] rounded-lg flex items-center justify-center text-white font-bold text-sm">2</div>
                <span className="font-bold text-[#002B5B]">Customize Your Trip</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Price</p>
              <p className="text-2xl font-bold text-[#002B5B]" data-testid="total-price">
                AED {pricing.total.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatShortDate(startDate)} - {formatShortDate(returnDate)}
            </span>
            <span>•</span>
            <span>{totalNights} night{totalNights > 1 ? 's' : ''} / {totalDays} days</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users size={14} />
              {data.travelersSummary || data.travelers}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Column - Itinerary */}
          <div className="flex-1">
            {/* Flights Section */}
            <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Plane size={24} />
                  <h2 className="text-lg font-bold">Flights</h2>
                </div>
                {selectedFlight && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Selected</span>
                )}
              </div>
              <div className="p-6">
                {selectedFlight ? (
                  <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center font-bold text-[#002B5B] border">
                        {selectedFlight.airline?.[0] || 'F'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{selectedFlight.airline}</p>
                        <p className="text-sm text-gray-500">
                          {data.leaving_from} → {cities[0]?.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {selectedFlight.departure_time} - {selectedFlight.arrival_time} • {selectedFlight.duration}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#002B5B] text-lg">AED {selectedFlight.price}</p>
                      <button 
                        onClick={() => setShowFlightSearch(true)}
                        className="text-sm text-[#002B5B] font-medium hover:underline"
                      >
                        Change Flight
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 font-medium">No flights included</p>
                      <p className="text-sm text-gray-400">{data.leaving_from} → {cities[0]?.name}</p>
                    </div>
                    <button 
                      onClick={() => setShowFlightSearch(true)}
                      className="bg-[#002B5B] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#003d82] transition-all flex items-center gap-2"
                      data-testid="add-flight-button"
                    >
                      <Plane size={18} />
                      Add Flights
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Day-by-Day Itinerary */}
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Itinerary</h2>
            
            {/* Hotel Stay Sections for each city */}
            {cities.map((city, cityIndex) => {
              const cityHotel = selectedHotels[city.name];
              const cityStartDate = new Date(startDate);
              // Calculate check-in date based on previous cities
              for (let i = 0; i < cityIndex; i++) {
                cityStartDate.setDate(cityStartDate.getDate() + (cities[i].nights || 1));
              }
              const cityEndDate = new Date(cityStartDate);
              cityEndDate.setDate(cityEndDate.getDate() + (city.nights || 1));
              
              return (
                <div key={cityIndex} className="mb-6">
                  {/* Stay Header */}
                  <div className="bg-[#E8F4F8] px-6 py-3 rounded-t-xl">
                    <h3 className="text-lg font-bold text-[#002B5B]">
                      Stay in {city.name} {city.nights} night{city.nights > 1 ? 's' : ''}
                    </h3>
                  </div>
                  
                  {/* Hotel Card */}
                  {cityHotel ? (
                    <div className="bg-white rounded-b-xl border border-gray-200 border-t-0">
                      <div className="p-6">
                        <div className="flex gap-6">
                          {/* Hotel Image */}
                          <img 
                            src={cityHotel.images?.[0] || 'https://via.placeholder.com/160x120?text=Hotel'} 
                            alt={cityHotel.name}
                            className="w-40 h-32 object-cover rounded-lg flex-shrink-0"
                          />
                          
                          {/* Hotel Details */}
                          <div className="flex-1">
                            {/* Stars */}
                            <div className="flex items-center gap-1 mb-1">
                              {Array.from({ length: cityHotel.star_rating || 4 }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>
                            
                            {/* Hotel Name */}
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-bold text-[#002B5B]">{cityHotel.name}</h4>
                              <button className="text-xs text-gray-500 border border-gray-300 px-2 py-0.5 rounded hover:bg-gray-50">
                                view
                              </button>
                            </div>
                            
                            {/* Address */}
                            <p className="text-sm text-blue-600 mt-1">{cityHotel.address || `${cityHotel.city}, ${cityHotel.country}`}</p>
                            
                            {/* Rating */}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="bg-[#002B5B] text-white px-2 py-1 rounded font-bold text-sm">
                                {cityHotel.rating_score || 8.2}
                              </div>
                              <div>
                                <span className="font-bold text-gray-800">{cityHotel.rating_text || 'Very Good'}</span>
                                <span className="text-sm text-gray-500 ml-1">{cityHotel.review_count || 45} ratings</span>
                              </div>
                            </div>
                            
                            {/* Check-in / Check-out */}
                            <div className="flex items-center gap-8 mt-4 text-sm">
                              <div>
                                <p className="text-gray-500">Check-in</p>
                                <p className="font-bold text-gray-800">03:00 PM {formatDate(cityStartDate)}</p>
                              </div>
                              <div className="h-8 w-px bg-gray-200" />
                              <div>
                                <p className="text-gray-500">Check-out</p>
                                <p className="font-bold text-gray-800">12:00 PM {formatDate(cityEndDate)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Selected Room Info */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-gray-700">Selected Room: <strong>1 x {cityHotel.selectedRoom?.name || 'Standard Room'}, {cityHotel.selectedRoom?.bed_type || 'Twin Beds'}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-gray-700">
                              {cityHotel.selectedRoom?.rate_plan?.meal_plan || cityHotel.selectedRoom?.meals || 'Bed and Breakfast'}, No Extra Bed
                            </span>
                          </div>
                          {cityHotel.selectedRoom?.rate_plan?.refund_policy === 'Refundable' ? (
                            <p className="text-orange-500 font-medium text-sm ml-7">
                              {cityHotel.selectedRoom?.rate_plan?.refund_deadline || 'Fully refundable before check-in'}
                            </p>
                          ) : (
                            <p className="text-red-500 font-medium text-sm ml-7">Non-refundable</p>
                          )}
                          {/* Price per night */}
                          <div className="flex items-center gap-2 text-sm mt-2 pt-2 border-t border-gray-100">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-gray-700">
                              Price: <strong className="text-[#002B5B]">AED {(cityHotel.selectedRoom?.price || 0).toLocaleString()}</strong> / night
                              <span className="text-gray-400 ml-2">x {city.nights} nights = </span>
                              <strong className="text-[#002B5B]">AED {((cityHotel.selectedRoom?.price || 0) * city.nights).toLocaleString()}</strong>
                            </span>
                          </div>
                        </div>
                        
                        {/* Selected Meals */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <h5 className="font-bold text-gray-800 mb-2">Selected Meals at Hotel</h5>
                          {cityHotel.selectedRoom?.rate_plan?.meal_plan && cityHotel.selectedRoom?.rate_plan?.meal_plan !== 'Room Only' ? (
                            <>
                              <div className="flex items-center gap-2 text-sm">
                                <Check className="w-5 h-5 text-green-500" />
                                <span className="text-gray-700">{cityHotel.selectedRoom.rate_plan.meal_plan}</span>
                              </div>
                              {cityHotel.selectedRoom.rate_plan.meal_details && (
                                <p className="text-gray-500 text-xs ml-7">{cityHotel.selectedRoom.rate_plan.meal_details}</p>
                              )}
                              <p className="text-green-600 font-medium text-sm ml-7">Included</p>
                            </>
                          ) : (
                            <p className="text-gray-500 text-sm">No meals included (Room Only)</p>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                          <button 
                            onClick={() => handleChangeHotel(city.name)}
                            className="bg-[#8B4513] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#723a0f] transition-all"
                          >
                            Change Room
                          </button>
                          <button 
                            onClick={() => handleChangeHotel(city.name)}
                            className="bg-[#8B4513] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#723a0f] transition-all"
                          >
                            Change Hotel
                          </button>
                        </div>
                      </div>
                      
                      {/* What to know section */}
                      <button className="w-full px-6 py-3 text-left text-sm text-gray-600 border-t border-gray-100 hover:bg-gray-50 flex items-center gap-2">
                        <Info size={16} />
                        What to know about this hotel
                      </button>
                      
                      {/* Info notice */}
                      <div className="bg-amber-50 px-6 py-4 border-t border-amber-100 rounded-b-xl">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-800">
                            Room in {cityHotel.name} is probably a twin bed room, which means 2 single beds will be provided. Are you sure about this room?
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Hotel className="text-gray-400" size={24} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-500">{noStayCities[city.name] ? 'No stay required' : 'No Hotel Selected'}</p>
                            <p className="text-sm text-gray-400">Check-in: {formatDate(cityStartDate)} • Check-out: {formatDate(cityEndDate)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleChangeHotel(city.name)}
                          className="bg-[#002B5B] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#003d82] transition-all flex items-center gap-2"
                          data-testid={`add-hotel-${city.name}`}
                        >
                          <Hotel size={18} />
                          {noStayCities[city.name] ? 'Change' : 'Add Hotel'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Day-by-Day Details */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 mt-8">Daily Itinerary</h2>
            {itinerary.map((day, index) => (
              <DayCard
                key={index}
                {...day}
                onAddActivity={() => {}}
                onChangeHotel={() => {
                  setActiveHotelCity(day.city);
                  setShowHotelModal(true);
                }}
                onSelectArrivalTransfer={(city) => openTransferModal('arrival', city)}
                onSelectDepartureTransfer={(city) => openTransferModal('departure', city)}
                selectedArrivalTransfer={selectedArrivalTransfer}
                selectedDepartureTransfer={selectedDepartureTransfer}
              />
            ))}
          </div>

          {/* Right Column - Trip Summary */}
          <div className="w-96 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 sticky top-32">
              <div className="bg-[#002B5B] text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Trip Summary</h3>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Destinations */}
                <div>
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-[#002B5B]" />
                    Destinations
                  </h4>
                  <div className="space-y-2">
                    {cities.map((city, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{city.name}</span>
                        <span className="font-medium">{city.nights} night{city.nights > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Flight */}
                {selectedFlight && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Plane size={16} className="text-[#002B5B]" />
                      Flight
                    </h4>
                    <p className="text-sm text-gray-600">{selectedFlight.airline}</p>
                    <p className="text-sm font-medium">AED {selectedFlight.price}</p>
                  </div>
                )}

                {/* Selected Hotels */}
                {Object.entries(selectedHotels).length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Hotel size={16} className="text-[#002B5B]" />
                      Hotels
                    </h4>
                    {Object.entries(selectedHotels).map(([city, hotel]) => (
                      <div key={city} className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-800">{city}</p>
                        <p className="text-sm text-gray-600">{hotel.name}</p>
                        <p className="text-xs text-gray-500">{hotel.selectedRoom?.name}</p>
                        {hotel.selectedRoom?.rate_plan && (
                          <div className="mt-1 text-xs">
                            <span className="text-purple-600">{hotel.selectedRoom.rate_plan.meal_plan}</span>
                            {hotel.selectedRoom.rate_plan.supplier_name && (
                              <span className="text-gray-400 ml-2">({hotel.selectedRoom.rate_plan.supplier_name})</span>
                            )}
                          </div>
                        )}
                        <p className="text-sm font-bold text-[#002B5B] mt-1">
                          AED {(hotel.selectedRoom?.price || 0).toLocaleString()} x {hotel.nights || 1} night{(hotel.nights || 1) > 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pricing Breakdown */}
                <div className="border-t pt-4">
                  <h4 className="font-bold text-gray-800 mb-3">Price Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    {pricing.hotelTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hotels</span>
                        <span className="font-medium">AED {pricing.hotelTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {pricing.flightPrice > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Flights</span>
                        <span className="font-medium">AED {pricing.flightPrice.toLocaleString()}</span>
                      </div>
                    )}
                    {pricing.transferTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transfers</span>
                        <span className="font-medium">AED {pricing.transferTotal.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-dashed">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price per adult ({pricing.adultsCount})</span>
                        <span className="font-medium">AED {pricing.pricePerAdult.toLocaleString()}</span>
                      </div>
                      {pricing.childrenCount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price per child ({pricing.childrenCount})</span>
                          <span className="font-medium">AED {pricing.pricePerChild.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>- AED 0</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t text-lg font-bold">
                      <span>Total</span>
                      <span className="text-[#002B5B]">AED {pricing.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button 
                    onClick={handleSaveProposal}
                    disabled={isSaving}
                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="save-proposal-button"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Save As Proposal
                  </button>
                  <button 
                    onClick={handlePayment}
                    disabled={isPaymentLoading}
                    className="w-full bg-[#E66B31] text-white py-3 rounded-xl font-bold hover:bg-[#d15a24] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="pay-now-button"
                  >
                    {isPaymentLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        Pay Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <button 
            onClick={onBack}
            className="text-gray-500 font-medium hover:text-[#002B5B] transition-colors flex items-center gap-2"
            data-testid="back-button"
          >
            ← Back to Trip Details
          </button>
        </div>
      </div>
    </div>
  );
}

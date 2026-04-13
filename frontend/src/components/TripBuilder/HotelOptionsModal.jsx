import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, List, Ban, Hotel, Search, Star, Loader2 } from 'lucide-react';
import { api } from '@/App';

function HotelOptionsModal({ isOpen, onClose, city, onViewAll, onNoStay, onSearch, onSelectHotel }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/hotels?search=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(city)}`);
        setSearchResults(res.data?.hotels || []);
      } catch (e) {
        console.error('Hotel search error:', e);
      }
      setSearching(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, city]);

  if (!isOpen) return null;

  const handleSelect = (hotel) => {
    if (onSelectHotel) {
      onSelectHotel(hotel);
    } else if (onSearch) {
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
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onViewAll}
              className="bg-white rounded-xl p-8 text-center hover:shadow-lg transition-all border border-gray-100 min-h-[280px] flex flex-col items-center justify-center"
              data-testid="view-all-hotels"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                <List className="text-gray-500" size={28} />
              </div>
              <p className="text-base text-gray-700 leading-relaxed">
                View all stay options in {city}
              </p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNoStay}
              className="bg-white rounded-xl p-8 text-center hover:shadow-lg transition-all border border-gray-100 min-h-[280px] flex flex-col items-center justify-center"
              data-testid="no-stay-required"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                <Ban className="text-gray-500" size={28} />
              </div>
              <p className="text-base text-gray-700 leading-relaxed">
                No stay required in {city}
              </p>
            </motion.button>

            <div className="bg-white rounded-xl p-6 border border-gray-100 min-h-[280px] flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mt-2">
                <Hotel className="text-gray-500" size={28} />
              </div>
              <p className="text-base text-gray-700 leading-relaxed mb-4 text-center">
                Looking for a particular hotel
              </p>
              <div className="relative w-full">
                <Search className="absolute left-4 top-3.5 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by property name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#002B5B] outline-none text-sm text-gray-600"
                  data-testid="hotel-search-input"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-3.5 animate-spin text-gray-400" size={16} />
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="w-full mt-2 max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                  {searchResults.slice(0, 8).map(hotel => (
                    <button
                      key={hotel.id}
                      onClick={() => handleSelect(hotel)}
                      className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3"
                      data-testid={`search-result-${hotel.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{hotel.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {hotel.star_rating && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-500">
                              <Star size={10} fill="currentColor" /> {hotel.star_rating}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{hotel.city}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-xs text-gray-400 mt-2 text-center">No hotels found for "{searchQuery}"</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default HotelOptionsModal;

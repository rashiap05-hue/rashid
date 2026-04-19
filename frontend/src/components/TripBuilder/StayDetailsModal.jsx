import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

export default function StayDetailsModal({
  isOpen, onClose, onSave,
  stayType, setStayType,
  stayHotelQuery, setStayHotelQuery,
  stayHotelResults, stayHotelSearching,
  staySelectedHotel, setStaySelectedHotel, setStayHotelResults,
  stayNotFound, setStayNotFound,
  stayManualName, setStayManualName,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
            data-testid="stay-details-modal"
          >
            <button 
              onClick={onClose} 
              className="absolute top-3 right-3 z-10 w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
              data-testid="stay-details-close"
            >
              <X size={18} />
            </button>

            <div className="px-6 pt-6 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-[#002B5B]">Stay details booked separately</h3>
            </div>

            <div className="px-6 py-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stay Type</label>
                  <select
                    value={stayType}
                    onChange={(e) => setStayType(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-800 rounded-md text-sm bg-white focus:outline-none focus:border-[#002B5B]"
                    data-testid="stay-type-select"
                  >
                    <option>Hotel - Own Arrangement</option>
                    <option>Airbnb / Apartment</option>
                    <option>Staying with Friends / Family</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hotel</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Choose Hotel"
                      value={stayNotFound ? '' : stayHotelQuery}
                      onChange={(e) => {
                        setStayHotelQuery(e.target.value);
                        setStaySelectedHotel(null);
                      }}
                      disabled={stayNotFound}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#002B5B] disabled:bg-gray-100 disabled:text-gray-400"
                      data-testid="stay-hotel-search"
                    />
                    {stayHotelSearching && (
                      <Loader2 className="absolute right-3 top-3 animate-spin text-gray-400" size={16} />
                    )}
                    {stayHotelResults.length > 0 && !staySelectedHotel && !stayNotFound && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                        {stayHotelResults.map(hotel => (
                          <button
                            key={hotel.id}
                            onClick={() => {
                              setStaySelectedHotel(hotel);
                              setStayHotelQuery(hotel.name);
                              setStayHotelResults([]);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
                            data-testid={`stay-hotel-result-${hotel.id}`}
                          >
                            <span className="font-medium text-gray-800">{hotel.name}</span>
                            {hotel.star_rating && (
                              <span className="ml-2 text-xs text-amber-500">{hotel.star_rating} star</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stayNotFound}
                      onChange={(e) => {
                        setStayNotFound(e.target.checked);
                        if (e.target.checked) {
                          setStayHotelQuery('');
                          setStaySelectedHotel(null);
                          setStayHotelResults([]);
                        } else {
                          setStayManualName('');
                        }
                      }}
                      className="w-4 h-4 border-gray-300 rounded"
                      data-testid="stay-not-found-checkbox"
                    />
                    <span className="text-sm text-gray-600">Not able to find the hotel?</span>
                  </label>
                </div>
              </div>

              {stayNotFound && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Name</label>
                  <input
                    type="text"
                    placeholder="Enter hotel name manually"
                    value={stayManualName}
                    onChange={(e) => setStayManualName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#002B5B]"
                    data-testid="stay-manual-name"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={onSave}
                className="bg-[#002B5B] text-white px-8 py-2.5 rounded font-bold text-sm hover:bg-[#003d82] transition-colors"
                data-testid="stay-details-save"
              >
                SAVE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

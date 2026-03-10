import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, List, Ban, Hotel, Search } from 'lucide-react';

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

export default HotelOptionsModal;

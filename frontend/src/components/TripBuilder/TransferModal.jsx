import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TransferModal({
  isOpen, onClose, transferModalType, transferCity, leavingOn,
  availableTransfers, transferSearch, setTransferSearch,
  transferCategoryFilter, setTransferCategoryFilter,
  transferTimeFilter, setTransferTimeFilter,
  selectedArrivalTransfer, selectedDepartureTransfer,
  onSelectTransfer,
}) {
  if (!isOpen) return null;

  const cityLower = transferCity?.toLowerCase() || '';

  const baseFiltered = availableTransfers.filter(t => {
    if (transferCity) {
      const tCity = (t.city || '').toLowerCase();
      if (tCity && tCity !== cityLower) return false;
    }
    return !t.transfer_direction || t.transfer_direction === transferModalType;
  });

  const categories = ['All Options', ...new Set(baseFiltered.map(t => t.transfer_type || 'Private'))];

  let filtered = availableTransfers.filter(t => {
    if (transferCity) {
      const tCity = (t.city || '').toLowerCase();
      if (tCity && tCity !== cityLower) return false;
    }
    if (t.transfer_direction && t.transfer_direction !== transferModalType) return false;
    if (transferCategoryFilter !== 'All Options' && (t.transfer_type || 'Private') !== transferCategoryFilter) return false;
    if (transferSearch) {
      const q = transferSearch.toLowerCase();
      if (!(t.title || '').toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
    }
    if (transferTimeFilter !== 'All' && t.pickup_times?.length > 0) {
      const hasMatchingTime = t.pickup_times.some(time => {
        const hour = parseInt(time.split(':')[0], 10);
        if (transferTimeFilter === 'Morning') return hour >= 5 && hour < 12;
        if (transferTimeFilter === 'Afternoon') return hour >= 12 && hour < 17;
        if (transferTimeFilter === 'Evening') return hour >= 17 || hour < 5;
        return true;
      });
      if (!hasMatchingTime) return false;
    }
    return true;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
            <h3 className="text-base font-bold text-gray-900">
              Add {transferModalType === 'arrival' ? 'Arrival' : transferModalType === 'departure' ? 'Departure' : 'Transfer'} in {transferCity}
              {leavingOn && (
                <span className="text-gray-500 font-normal text-sm ml-2">
                  (Day 1: {new Date(leavingOn).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })})
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search transfers..." value={transferSearch}
                  onChange={e => setTransferSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:border-[#002B5B]"
                  data-testid="transfer-modal-search" />
              </div>
              <button onClick={onClose} className="w-8 h-8 hover:bg-gray-100 text-gray-500 rounded-full flex items-center justify-center"><X size={18} /></button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-44 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0 hidden md:block">
              <div className="py-2">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setTransferCategoryFilter(cat)}
                    className={cn("w-full text-left px-4 py-3 text-sm transition-colors",
                      transferCategoryFilter === cat ? "bg-white text-[#002B5B] font-bold border-r-2 border-[#002B5B]" : "text-gray-600 hover:bg-white"
                    )} data-testid={`transfer-cat-${cat.toLowerCase().replace(/\s+/g, '-')}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-white">
                {['All', 'Morning', 'Afternoon', 'Evening'].map(tf => (
                  <button key={tf} onClick={() => setTransferTimeFilter(tf)}
                    className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                      transferTimeFilter === tf ? "bg-[#002B5B] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )} data-testid={`transfer-time-${tf.toLowerCase()}`}>{tf}</button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <Car size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No transfers found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filtered.map(transfer => {
                      const isSelected = (transferModalType === 'arrival' && selectedArrivalTransfer?.id === transfer.id) ||
                        (transferModalType === 'departure' && selectedDepartureTransfer?.id === transfer.id);
                      return (
                        <div key={transfer.id} className={cn("border rounded-xl p-5 transition-all",
                          isSelected ? "border-green-500 bg-green-50/50" : "border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white"
                        )} data-testid={`transfer-option-${transfer.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 text-sm mb-1.5">{transfer.title}</h4>
                              {(transfer.pickup_times?.length > 0 || transfer.duration) && (
                                <p className="text-xs text-gray-500 mb-2">
                                  {transfer.pickup_times?.length > 0 && <><span className="font-medium text-gray-600">Starts:</span> {transfer.pickup_times.join(', ')}</>}
                                  {transfer.duration && <>{transfer.pickup_times?.length > 0 && <span className="mx-2">|</span>}<span className="font-medium text-gray-600">Duration:</span> {transfer.duration}</>}
                                </p>
                              )}
                              {transfer.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">{transfer.description}</p>}
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="text-xs text-gray-600 flex items-center gap-1">
                                  <Check size={12} className="text-green-500" /> {transfer.from_location || transfer.title?.split(' - ')[0]} — {transfer.transfer_type || 'Private'}
                                </span>
                                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                                  transfer.transfer_type === 'Luxury' ? 'bg-amber-100 text-amber-700' :
                                  transfer.transfer_type === 'Shared' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                                )}>{transfer.transfer_type || 'Private'} Transfers</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <p className="text-base font-bold text-[#002B5B]">+ AED {Number(transfer.price || 0).toLocaleString()}</p>
                              <button onClick={() => onSelectTransfer(transfer)}
                                className={cn("px-5 py-2 rounded-lg text-xs font-bold transition-colors",
                                  isSelected ? "bg-green-500 text-white" : "bg-[#002B5B] hover:bg-[#003d82] text-white"
                                )} data-testid={`select-transfer-${transfer.id}`}>
                                {isSelected ? 'Selected' : 'Select'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">{baseFiltered.length} transfers available</div>
            <button onClick={onClose} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors">Close</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

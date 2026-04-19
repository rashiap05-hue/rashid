import React from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Car, ChevronRight, Check } from 'lucide-react';
import { resolveImageUrl } from '@/App';

export default function DetailViewModal({ isOpen, onClose, item, type }) {
  if (!isOpen || !item) return null;
  
  const isTransfer = type === 'transfer';
  const headerImage = item.image || item.images?.[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()} data-testid="detail-view-modal">
        
        {headerImage && (
          <div className="w-full h-48 flex-shrink-0 relative">
            <img src={resolveImageUrl(headerImage)} alt={item.name || item.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
              data-testid="detail-modal-close">
              <X size={18} />
            </button>
            <div className="absolute bottom-4 left-6 right-6 text-white">
              <h2 className="text-xl font-bold">{item.name || item.title}</h2>
              {item.city && <p className="text-sm text-white/80 mt-0.5">{item.city}</p>}
            </div>
          </div>
        )}

        {!headerImage && (
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{item.name || item.title}</h2>
              {item.city && <p className="text-sm text-gray-500">{item.city}</p>}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
              data-testid="detail-modal-close">
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex flex-wrap gap-3">
            {item.duration && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200">
                <Clock size={14} />{item.duration}
              </span>
            )}
            {(item.selectedVehicle || item.vehicle_label) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 text-sm rounded-lg border border-teal-200">
                <Car size={14} />{item.vehicle_label || item.selectedVehicle}
              </span>
            )}
            {item.transfer_type && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-lg border border-purple-200">
                {item.transfer_type}
              </span>
            )}
          </div>

          {isTransfer && (item.from_location || item.to_location) && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-3 text-sm">Route</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-400">From</p>
                  <p className="text-sm font-medium text-gray-700">{item.from_location || 'Airport'}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400">To</p>
                  <p className="text-sm font-medium text-gray-700">{item.to_location || 'Hotel'}</p>
                </div>
              </div>
            </div>
          )}

          {item.description && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Description</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          )}

          {item.highlights?.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Highlights</h4>
              <div className="flex flex-wrap gap-2">
                {item.highlights.map((h, i) => (
                  <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">{h}</span>
                ))}
              </div>
            </div>
          )}

          {item.inclusions?.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">What's Included</h4>
              <ul className="space-y-2">
                {item.inclusions.map((inc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={14} className="text-teal-500 mt-0.5 flex-shrink-0" />{inc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.start_times?.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Available Start Times</h4>
              <div className="flex flex-wrap gap-2">
                {item.start_times.map((t, i) => (
                  <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg border border-gray-200">{t}</span>
                ))}
              </div>
            </div>
          )}

          {item.images?.length > 1 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Photos</h4>
              <div className="grid grid-cols-3 gap-2">
                {item.images.slice(0, 6).map((img, i) => (
                  <img key={i} src={resolveImageUrl(img)} alt={`${item.name || item.title} ${i + 1}`} className="rounded-lg object-cover h-28 w-full" />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

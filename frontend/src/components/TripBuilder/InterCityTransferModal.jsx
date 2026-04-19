import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Car, Clock, Loader2 } from 'lucide-react';

export default function InterCityTransferModal({
  modal, onClose, options, loading, selectedVehicle,
  interCityTransfers, onSelectTransfer,
}) {
  if (!modal.open) return null;

  const transferKey = `${modal.fromCityIdx}_${modal.toCityIdx}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          data-testid="inter-city-transfer-modal"
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Car size={20} />
                <div>
                  <h2 className="text-lg font-bold">Add Transfer to {modal.toCity}</h2>
                  <p className="text-sm text-blue-200">{modal.fromCity} → {modal.toCity}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-blue-600" />
                <span className="ml-3 text-gray-500">Searching transfers...</span>
              </div>
            ) : options.length > 0 ? (
              options.map((transfer) => {
                const price = (transfer.vehicle_pricing && transfer.vehicle_pricing[selectedVehicle.key])
                  ? transfer.vehicle_pricing[selectedVehicle.key].selling_price
                  : transfer.price || 0;
                const isSelected = interCityTransfers[transferKey]?.id === transfer.id;
                return (
                  <div
                    key={transfer.id}
                    className={`border rounded-xl overflow-hidden transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                    data-testid={`inter-transfer-option-${transfer.id}`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-800">{transfer.title}</h3>
                            {transfer.transfer_type && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{transfer.transfer_type}</span>
                            )}
                          </div>
                          {transfer.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{transfer.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3">
                            {transfer.duration && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock size={12} />
                                <span>{transfer.duration}</span>
                              </div>
                            )}
                            {transfer.vehicle_type && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{transfer.vehicle_type}</span>
                            )}
                            {transfer.max_bags && (
                              <span className="text-xs text-gray-500">{transfer.max_bags} bags</span>
                            )}
                          </div>
                          {transfer.vehicle_pricing && Object.keys(transfer.vehicle_pricing).length > 0 && (
                            <p className="mt-2 text-xs text-blue-600 font-medium">Vehicle selection available on next step</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end ml-4">
                          <span className="text-2xl font-bold text-green-600">AED {price.toLocaleString()}</span>
                          <span className="text-xs text-gray-400">per vehicle</span>
                          <button
                            onClick={() => onSelectTransfer(transfer)}
                            className={`mt-3 px-5 py-2 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            data-testid={`select-inter-transfer-${transfer.id}`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Car size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No transfers found</p>
                <p className="text-sm text-gray-400 mt-1">No transfers available from {modal.fromCity} to {modal.toCity}</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-400">{options.length} transfer{options.length !== 1 ? 's' : ''} available</p>
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

function VehicleSelectionModal({ isOpen, onClose, activity, onSelectVehicle, totalPax, currentVehicle }) {
  if (!isOpen || !activity) return null;

  const vehicleOptions = [
    { key: 'sedan_4', label: '4 Seater Sedan', icon: '🚗', minPax: 1, maxPax: 4 },
    { key: 'car_7', label: '7 Seater Minivan', icon: '🚙', minPax: 3, maxPax: 7, optional: true },
    { key: 'van_8', label: '8 Seater Van', icon: '🚐', minPax: 5, maxPax: 8, optional: true },
    { key: 'van_17', label: '17 Seater Van', icon: '🚐', minPax: 9, maxPax: 17 },
    { key: 'bus_29', label: '29 Seater Bus', icon: '🚌', minPax: 18, maxPax: 29 },
    { key: 'bus_45', label: '45 Seater Bus', icon: '🚌', minPax: 30, maxPax: 45 },
    { key: 'bus_55', label: '55 Seater Bus', icon: '🚌', minPax: 46, maxPax: 55 }
  ];

  const getDefaultVehicle = () => {
    if (totalPax <= 4) return 'sedan_4';
    if (totalPax <= 7) return 'car_7';
    if (totalPax <= 8) return 'van_8';
    if (totalPax <= 17) return 'van_17';
    if (totalPax <= 29) return 'bus_29';
    if (totalPax <= 45) return 'bus_45';
    return 'bus_55';
  };

  const defaultVehicleKey = getDefaultVehicle();

  const defaultKeys = new Set(vehicleOptions.map(v => v.key));
  // Custom vehicle types added in the Transfer/Activity admin forms live in
  // vehicle_pricing under non-default keys. They have free-text pax, so they're
  // always offered (no numeric range to filter on).
  const customVehicles = Object.entries(activity?.vehicle_pricing || {})
    .filter(([key]) => !defaultKeys.has(key))
    .map(([key, v]) => ({ key, label: v?.label || 'Custom Vehicle', icon: '🚖', pax: v?.pax || '', custom: true, minPax: 1, maxPax: 9999 }));

  const availableVehicles = [
    ...vehicleOptions.filter(v => {
      if (v.key === defaultVehicleKey) return true;
      if (v.optional && totalPax >= v.minPax - 2 && totalPax <= v.maxPax) return true;
      if (v.maxPax > totalPax && v.minPax <= totalPax) return true;
      return false;
    }),
    ...customVehicles,
  ];

  const getVehiclePrice = (vehicleKey) => {
    if (activity.vehicle_pricing && activity.vehicle_pricing[vehicleKey]) {
      return activity.vehicle_pricing[vehicleKey].selling_price || 0;
    }
    return activity.price || 0;
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Select Vehicle Type</h3>
              <p className="text-blue-100 text-sm">{activity.name || activity.title}</p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Users size={16} />
            <span className="font-medium">{totalPax} passengers</span>
            <span className="text-blue-500">• Choose your preferred vehicle</span>
          </div>
        </div>

        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="space-y-3">
            {availableVehicles.map((vehicle) => {
              const price = getVehiclePrice(vehicle.key);
              const isDefault = vehicle.key === defaultVehicleKey;
              const isSelected = currentVehicle === vehicle.key;
              
              return (
                <motion.button
                  key={vehicle.key}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelectVehicle(activity, vehicle.key, price)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all text-left",
                    isSelected 
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : isDefault
                        ? "border-green-300 bg-green-50 hover:border-green-400"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                  )}
                  data-testid={`vehicle-option-${vehicle.key}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{vehicle.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{activity?.vehicle_pricing?.[vehicle.key]?.label || vehicle.label}</span>
                          {isDefault && (
                            <span className="text-[10px] px-2 py-0.5 bg-green-500 text-white rounded-full font-bold">
                              Recommended
                            </span>
                          )}
                          {vehicle.optional && !isDefault && (
                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">
                              Upgrade
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {activity?.vehicle_pricing?.[vehicle.key]?.pax || `${vehicle.minPax}-${vehicle.maxPax} passengers`} • Extra comfort & space
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-green-600">AED {price}</div>
                      <div className="text-xs text-gray-400">per vehicle</div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            💡 Choose a larger vehicle for extra luggage space or comfort
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default VehicleSelectionModal;

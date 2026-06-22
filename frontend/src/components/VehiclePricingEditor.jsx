import React from 'react';
import { Car, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// The seven built-in vehicle types. Custom types added by the user live in the
// pricing dict under generated keys and are merged in below.
export const DEFAULT_VEHICLES = [
  { key: 'sedan_4', label: '4 Seater Sedan', icon: '🚗', pax: '1-4 pax' },
  { key: 'car_7', label: '7 Seater Minivan', icon: '🚙', pax: '3-7 pax', optional: true },
  { key: 'van_8', label: '8 Seater Van', icon: '🚐', pax: '5-8 pax', optional: true },
  { key: 'van_17', label: '17 Seater Van', icon: '🚐', pax: '9-17 pax' },
  { key: 'bus_29', label: '29 Seater Bus', icon: '🚌', pax: '18-29 pax' },
  { key: 'bus_45', label: '45 Seater Bus', icon: '🚌', pax: '30-45 pax' },
  { key: 'bus_55', label: '55 Seater Bus', icon: '🚌', pax: '46-55 pax' },
];

const DEFAULT_KEYS = new Set(DEFAULT_VEHICLES.map((v) => v.key));

export const isCustomVehicleKey = (key) => !DEFAULT_KEYS.has(key);

/**
 * Reusable vehicle pricing editor used by both the Transfer and Activity forms.
 * Vehicle name and passenger capacity (pax) are editable for every row, and new
 * custom vehicle types can be added/removed. All data lives in the
 * `vehicle_pricing` dict (keyed by vehicle key) so it persists without schema
 * changes.
 */
export default function VehiclePricingEditor({ value = {}, onChange, currency = 'AED' }) {
  const vp = value || {};
  const customKeys = Object.keys(vp).filter(isCustomVehicleKey);

  const rows = [
    ...DEFAULT_VEHICLES.map((v) => ({ ...v, custom: false })),
    ...customKeys.map((k) => ({
      key: k,
      icon: '🚖',
      label: vp[k]?.label || 'Custom Vehicle',
      pax: vp[k]?.pax || '',
      custom: true,
    })),
  ];

  const setField = (key, patch) => onChange?.({ ...vp, [key]: { ...vp[key], ...patch } });
  const addVehicle = () => {
    const key = `custom_${Date.now()}`;
    onChange?.({ ...vp, [key]: { label: '', pax: '', selling_price: 0, supplier_cost: 0, max_bags: 0, custom: true } });
  };
  const removeVehicle = (key) => {
    const next = { ...vp };
    delete next[key];
    onChange?.(next);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-gray-700 flex items-center gap-2"><Car size={18} /> Vehicle-Based Pricing ({currency})</h4>
          <p className="text-xs text-gray-500 mt-1">Set selling price and supplier cost for each vehicle type</p>
        </div>
        <button
          type="button"
          onClick={addVehicle}
          className="px-3 py-1.5 bg-[#002B5B] text-white rounded-lg text-xs font-bold hover:bg-[#003d82] transition-colors flex items-center gap-1 flex-shrink-0"
          data-testid="add-vehicle-type-btn"
        >
          <Plus size={14} /> Add Vehicle Type
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {rows.map((vehicle) => {
          const pricing = vp[vehicle.key] || { selling_price: 0, supplier_cost: 0, max_bags: 0 };
          const margin = (pricing.selling_price || 0) - (pricing.supplier_cost || 0);
          const marginPercent = pricing.selling_price > 0 ? (margin / pricing.selling_price * 100) : 0;

          return (
            <div key={vehicle.key} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-48 flex items-center gap-2 flex-shrink-0">
                  <span className="text-lg flex-shrink-0">{vehicle.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={pricing.label ?? vehicle.label}
                        placeholder="Vehicle name"
                        onChange={(e) => setField(vehicle.key, { label: e.target.value })}
                        className="w-full text-sm font-medium text-gray-700 border border-transparent hover:border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 focus:outline-none"
                        data-testid={`vehicle-name-${vehicle.key}`}
                      />
                      {vehicle.optional && <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium flex-shrink-0">Optional</span>}
                      {vehicle.custom && <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium flex-shrink-0">Custom</span>}
                    </div>
                    <input
                      type="text"
                      value={pricing.pax ?? vehicle.pax}
                      placeholder="e.g. 1-4 pax"
                      onChange={(e) => setField(vehicle.key, { pax: e.target.value })}
                      className="w-full mt-0.5 text-xs text-gray-400 border border-transparent hover:border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 focus:outline-none"
                      data-testid={`vehicle-pax-${vehicle.key}`}
                    />
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Selling Price</label>
                    <input type="number" min="0" value={pricing.selling_price || ''} placeholder="0"
                      onChange={(e) => setField(vehicle.key, { selling_price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Supplier Cost</label>
                    <input type="number" min="0" value={pricing.supplier_cost || ''} placeholder="0"
                      onChange={(e) => setField(vehicle.key, { supplier_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Bags</label>
                    <input type="number" min="0" value={pricing.max_bags || ''} placeholder="0"
                      onChange={(e) => setField(vehicle.key, { max_bags: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Margin</label>
                    <div className={cn("px-3 py-2 rounded-lg text-sm font-medium", margin > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400")}>
                      {margin > 0 ? <>{currency} {margin.toFixed(0)}<span className="text-xs ml-1">({marginPercent.toFixed(0)}%)</span></> : '-'}
                    </div>
                  </div>
                </div>

                {vehicle.custom ? (
                  <button type="button" onClick={() => removeVehicle(vehicle.key)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0" data-testid={`remove-vehicle-${vehicle.key}`}>
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <div className="w-9 flex-shrink-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

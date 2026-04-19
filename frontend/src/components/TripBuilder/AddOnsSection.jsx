import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Phone, Shield, X } from 'lucide-react';

export default function AddOnsSection({
  visaSettings, visaIncluded, setVisaIncluded, visaPersons, setVisaPersons,
  simCardSettings, simCardIncluded, setSimCardIncluded, simCardPersons, setSimCardPersons,
  insuranceSettings, travelInsurance, setTravelInsurance, insurancePersons, setInsurancePersons,
  quantityPopup, setQuantityPopup, totalPax,
}) {
  const handleConfirmQuantity = () => {
    const { type, count } = quantityPopup;
    if (type === 'visa') { setVisaIncluded(true); setVisaPersons(count); }
    else if (type === 'sim') { setSimCardIncluded(true); setSimCardPersons(count); }
    else if (type === 'insurance') { setTravelInsurance(true); setInsurancePersons(count); }
    setQuantityPopup({ open: false, type: '', count: 1 });
  };

  return (
    <>
      {/* Visa Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6" data-testid="trip-builder-visa">
        <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100">
          <Globe size={20} className="text-[#002B5B]" />
          <h2 className="text-lg font-bold text-[#002B5B]">Visa</h2>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-700">
                {visaSettings?.country || 'Destination'} - {visaSettings?.visa_type || 'Tourist Visa'} - {visaSettings?.entry_type || 'Tourist / Single Entry / Sticker Visa'}
              </p>
              {visaIncluded ? (
                <p className="text-sm text-teal-600 font-medium mt-1">Added to proposal ({visaPersons} person{visaPersons > 1 ? 's' : ''})</p>
              ) : (
                <p className="text-sm text-red-500 mt-1">Not Included</p>
              )}
            </div>
            {visaIncluded ? (
              <button 
                onClick={() => { setVisaIncluded(false); setVisaPersons(1); }}
                className="px-4 py-2 bg-red-50 border border-red-300 text-red-600 text-sm font-medium rounded hover:bg-red-100 transition-colors flex-shrink-0 flex items-center gap-1"
                data-testid="remove-visa-btn"
              >
                <X size={14} /> REMOVE
              </button>
            ) : (
              <button 
                onClick={() => setQuantityPopup({ open: true, type: 'visa', count: 1 })}
                className="px-4 py-2 border border-[#002B5B] text-[#002B5B] text-sm font-medium rounded hover:bg-[#002B5B]/5 transition-colors flex-shrink-0"
                data-testid="add-visa-btn"
              >
                + ADD
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SIM Card Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6" data-testid="trip-builder-sim-card">
        <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100">
          <Phone size={20} className="text-[#002B5B]" />
          <h2 className="text-lg font-bold text-[#002B5B]">SIM Card</h2>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-700">
                {simCardSettings?.country || 'Destination'} - {simCardSettings?.provider || 'Local SIM'} - {simCardSettings?.plan_name || 'Tourist Data Plan'}
                {simCardSettings?.data_allowance && ` (${simCardSettings.data_allowance})`}
              </p>
              {simCardIncluded ? (
                <p className="text-sm text-teal-600 font-medium mt-1">Added to proposal ({simCardPersons} person{simCardPersons > 1 ? 's' : ''})</p>
              ) : (
                <p className="text-sm text-red-500 mt-1">Not Included</p>
              )}
            </div>
            {simCardIncluded ? (
              <button 
                onClick={() => { setSimCardIncluded(false); setSimCardPersons(1); }}
                className="px-4 py-2 bg-red-50 border border-red-300 text-red-600 text-sm font-medium rounded hover:bg-red-100 transition-colors flex-shrink-0 flex items-center gap-1"
                data-testid="remove-sim-card-btn"
              >
                <X size={14} /> REMOVE
              </button>
            ) : (
              <button 
                onClick={() => setQuantityPopup({ open: true, type: 'sim', count: 1 })}
                className="px-4 py-2 border border-[#002B5B] text-[#002B5B] text-sm font-medium rounded hover:bg-[#002B5B]/5 transition-colors flex-shrink-0"
                data-testid="add-sim-card-btn"
              >
                + ADD
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Travel Insurance Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6" data-testid="trip-builder-insurance">
        <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100">
          <Shield size={20} className="text-[#002B5B]" />
          <h2 className="text-lg font-bold text-[#002B5B]">Travel Insurance</h2>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-700">{insuranceSettings?.description || 'Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs'}</p>
              <p className="text-base font-semibold text-[#002B5B] mt-2">
                {insuranceSettings?.currency || 'AED'} {insuranceSettings?.price_per_person || 50} <span className="text-xs font-normal text-gray-500">per person</span>
              </p>
              {travelInsurance ? (
                <p className="text-sm text-teal-600 font-medium mt-1">Added to proposal ({insurancePersons} person{insurancePersons > 1 ? 's' : ''})</p>
              ) : (
                <p className="text-sm text-red-500 mt-1">Not Included</p>
              )}
            </div>
            {travelInsurance ? (
              <button 
                onClick={() => { setTravelInsurance(false); setInsurancePersons(1); }}
                className="px-4 py-2 bg-red-50 border border-red-300 text-red-600 text-sm font-medium rounded hover:bg-red-100 transition-colors flex-shrink-0 flex items-center gap-1"
                data-testid="remove-insurance-btn"
              >
                <X size={14} /> REMOVE
              </button>
            ) : (
              <button 
                onClick={() => setQuantityPopup({ open: true, type: 'insurance', count: 1 })}
                className="px-4 py-2 border border-[#002B5B] text-[#002B5B] text-sm font-medium rounded hover:bg-[#002B5B]/5 transition-colors flex-shrink-0"
                data-testid="add-insurance-btn"
              >
                + ADD
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quantity Selection Popup */}
      {quantityPopup.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setQuantityPopup({ open: false, type: '', count: 1 })} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#002B5B] mb-1">
              {quantityPopup.type === 'visa' ? 'Add Visa' : quantityPopup.type === 'sim' ? 'Add SIM Card' : 'Add Travel Insurance'}
            </h3>
            <p className="text-sm text-gray-500 mb-5">How many persons?</p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setQuantityPopup(p => ({ ...p, count: Math.max(1, p.count - 1) }))}
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-lg font-bold text-gray-600 hover:border-[#002B5B] hover:text-[#002B5B] transition-colors"
                data-testid="qty-minus"
              >-</button>
              <span className="text-3xl font-bold text-[#002B5B] w-12 text-center" data-testid="qty-count">
                {quantityPopup.count}
              </span>
              <button
                onClick={() => setQuantityPopup(p => ({ ...p, count: Math.min(totalPax, p.count + 1) }))}
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-lg font-bold text-gray-600 hover:border-[#002B5B] hover:text-[#002B5B] transition-colors"
                data-testid="qty-plus"
              >+</button>
            </div>
            <p className="text-xs text-gray-400 text-center mb-4">Max {totalPax} person{totalPax > 1 ? 's' : ''} (based on trip)</p>

            <div className="flex gap-3">
              <button
                onClick={() => setQuantityPopup({ open: false, type: '', count: 1 })}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >Cancel</button>
              <button
                onClick={handleConfirmQuantity}
                className="flex-1 px-4 py-2.5 bg-[#002B5B] text-white rounded-lg text-sm font-bold hover:bg-[#003d82] transition-colors"
                data-testid="qty-confirm"
              >Confirm</button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

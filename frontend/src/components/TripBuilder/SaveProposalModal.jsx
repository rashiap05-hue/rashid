import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Save } from 'lucide-react';

function SaveProposalModal({ isOpen, onClose, onSave, tripData, pricing }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    proposal_name: '',
    expected_booking_date: '',
    flights_booked: null,
    markup_value: 0,
    markup_type: 'percentage',
    discount_amount: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && tripData?.cities?.[0]?.name) {
      setFormData(prev => ({
        ...prev,
        proposal_name: `Trip to ${tripData.cities[0].name}`
      }));
    }
  }, [isOpen, tripData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name.trim()) {
      alert('Customer name is required');
      return;
    }
    if (!formData.proposal_name.trim()) {
      alert('Trip name is required');
      return;
    }
    if (!formData.expected_booking_date) {
      alert('Estimated date of booking is required');
      return;
    }
    if (formData.flights_booked === null) {
      alert('Please select if flights are booked');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save proposal');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Save Proposal</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Customer Details</legend>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <label className="w-24 text-sm font-medium text-gray-700 pt-2">
                  Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  required
                  data-testid="customer-name-input"
                />
              </div>
              
              <div className="flex items-start gap-4">
                <label className="w-24 text-sm font-medium text-gray-700 pt-2">Email</label>
                <div className="flex-1">
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="customer-email-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional - Provide client's email address if available. No email will be sent on saving proposal.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <label className="w-24 text-sm font-medium text-gray-700 pt-2">Phone</label>
                <div className="flex-1">
                  <input
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="customer-phone-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional - Provide client's mobile number if available
                  </p>
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Proposal Details</legend>
            
            <div className="flex items-start gap-4">
              <label className="w-24 text-sm font-medium text-gray-700 pt-2">
                Trip Name<span className="text-red-500">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.proposal_name}
                  onChange={(e) => setFormData({...formData, proposal_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  required
                  data-testid="proposal-name-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is the name given to the proposal and it is communicated with the customer. 
                  After saving the proposal, a proposal reference will be provided. 
                  Please use this in all correspondence regarding this proposal.
                </p>
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Estimated Booking Date</legend>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <label className="w-40 text-sm font-medium text-gray-700 pt-2">
                  Estimated Date of Booking<span className="text-red-500">*</span>
                </label>
                <div className="flex-1">
                  <input
                    type="date"
                    value={formData.expected_booking_date}
                    onChange={(e) => setFormData({...formData, expected_booking_date: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    max={(() => {
                      const travelDate = tripData?.leaving_on || tripData?.start_date;
                      if (!travelDate) return undefined;
                      const d = new Date(travelDate);
                      d.setDate(d.getDate() - 26);
                      return d.toISOString().split('T')[0];
                    })()}
                    data-testid="booking-date-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Please select a date when you expect this quote to close
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="w-40 text-sm font-medium text-gray-700">
                  Are Flights Booked?<span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="flights_booked"
                      checked={formData.flights_booked === true}
                      onChange={() => setFormData({...formData, flights_booked: true})}
                      className="w-4 h-4 text-[#002B5B] border-gray-300 focus:ring-[#002B5B]"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="flights_booked"
                      checked={formData.flights_booked === false}
                      onChange={() => setFormData({...formData, flights_booked: false})}
                      className="w-4 h-4 text-[#002B5B] border-gray-300 focus:ring-[#002B5B]"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Markup</legend>
            
            <div className="flex items-center gap-4">
              <label className="w-24 text-sm font-medium text-gray-700">Land</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={formData.markup_value}
                  onChange={(e) => setFormData({...formData, markup_value: parseFloat(e.target.value) || 0})}
                  className="w-24 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="markup-value-input"
                />
                <select
                  value={formData.markup_type}
                  onChange={(e) => setFormData({...formData, markup_type: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
                  data-testid="markup-type-select"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Discount</legend>
            
            <div className="flex items-start gap-4">
              <label className="w-32 text-sm font-medium text-gray-700 pt-2">
                Discount Amount
              </label>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})}
                  className="w-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="discount-amount-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Discount will be adjusted against and limited by the commission/markup.<br/>
                  It will be shown on the customer's final quote proposal.
                </p>
              </div>
            </div>
          </fieldset>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-3 bg-[#002B5B] text-white font-bold rounded hover:bg-[#003d82] transition-colors disabled:opacity-50 flex items-center gap-2"
            data-testid="save-proposal-btn"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            SAVE PROPOSAL
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default SaveProposalModal;

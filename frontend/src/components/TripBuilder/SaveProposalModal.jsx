import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Save, AlertTriangle, Edit2, CalendarIcon } from 'lucide-react';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

function SaveProposalModal({ isOpen, onClose, onSave, tripData, pricing, selectedHotels, cities }) {
  const isEditing = !!tripData?.isEditing;
  const [showCustomerEdit, setShowCustomerEdit] = useState(!isEditing);
  const [saveAsNew, setSaveAsNew] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    proposal_name: '',
    expected_booking_date: new Date().toISOString().split('T')[0],
    flights_booked: null,
    markup_value: 0,
    markup_type: 'percentage',
    discount_amount: 0
  });
  const [saving, setSaving] = useState(false);

  // Pre-fill form data from tripData (works for both new and edit modes)
  useEffect(() => {
    if (!isOpen) return;

    if (isEditing) {
      // Editing: pre-fill ALL saved fields
      setFormData({
        customer_name: tripData.customer_name || '',
        customer_email: tripData.customer_email || '',
        customer_phone: tripData.customer_phone || '',
        proposal_name: tripData.proposal_name || `Trip to ${tripData.cities?.[0]?.name || ''}`,
        expected_booking_date: tripData.expected_booking_date || '',
        flights_booked: tripData.flights_booked ?? null,
        markup_value: tripData.markup_value || 0,
        markup_type: tripData.markup_type || 'percentage',
        discount_amount: tripData.discount_amount || 0
      });
      setShowCustomerEdit(false);
    } else {
      // New proposal: auto-generate trip name only
      setFormData(prev => ({
        ...prev,
        proposal_name: prev.proposal_name || `Trip to ${tripData?.cities?.[0]?.name || ''}`
      }));
      setShowCustomerEdit(true);
    }
  }, [isOpen, isEditing, tripData]);

  // Build hotel star rating warning
  const getHotelWarnings = () => {
    if (!selectedHotels || !cities) return [];
    const warnings = [];
    const starRatings = {};

    Object.entries(selectedHotels).forEach(([idx, hotel]) => {
      if (hotel?.star_rating) {
        const city = cities[parseInt(idx)];
        const cityName = city?.name || `City ${idx}`;
        starRatings[cityName] = hotel.star_rating;
      }
    });

    const ratings = Object.values(starRatings);
    if (ratings.length > 1) {
      const allSame = ratings.every(r => r === ratings[0]);
      if (!allSame) {
        const parts = Object.entries(starRatings).map(([city, star]) => `${city} (${star} Star)`);
        warnings.push(`Selected hotel in ${parts.join(', ')} offer inconsistent experience to customer.`);
      }
    }
    return warnings;
  };

  const hotelWarnings = getHotelWarnings();

  // Build trip summary for customer card
  const getTripSummary = () => {
    const cityNames = (tripData?.cities || []).map(c => c.name).join(', ');
    const leavingFrom = tripData?.leaving_from?.split('(')?.[0]?.trim() || '';
    const leavingOn = tripData?.leaving_on
      ? new Date(tripData.leaving_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    return `Trip to ${cityNames} from ${leavingFrom} on ${leavingOn}`;
  };

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
      await onSave({
        ...formData,
        _saveAsNew: saveAsNew,
        _isEditing: isEditing && !saveAsNew,
        _editProposalId: tripData?.editProposalId
      });
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
          <h2 className="text-xl font-bold text-gray-800" data-testid="save-modal-title">Save Proposal</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
            data-testid="save-modal-close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hotel Star Rating Warning */}
          {hotelWarnings.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden" data-testid="hotel-warning">
              <div className="bg-blue-500 px-4 py-1.5">
                <span className="text-white font-bold text-sm flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Warning:
                </span>
              </div>
              <ul className="px-4 py-3 space-y-1">
                {hotelWarnings.map((w, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Customer Details */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Customer Details</legend>

            {isEditing && !showCustomerEdit && formData.customer_name ? (
              /* Read-only customer card when editing with existing data */
              <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-start justify-between" data-testid="customer-card">
                <div>
                  <p className="font-bold text-gray-800">{formData.customer_name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{getTripSummary()}</p>
                  {formData.customer_email && (
                    <p className="text-xs text-gray-400 mt-1">{formData.customer_email}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomerEdit(true)}
                  className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1 flex-shrink-0"
                  data-testid="change-customer-btn"
                >
                  change customer
                </button>
              </div>
            ) : (
              /* Editable customer fields */
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <label className="w-24 text-sm font-medium text-gray-700 pt-2">
                    Name<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="customer-phone-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional - Provide client's mobile number if available
                    </p>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCustomerEdit(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel edit
                    </button>
                  </div>
                )}
              </div>
            )}
          </fieldset>

          {/* Proposal Details */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Proposal Details</legend>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <label className="w-24 text-sm font-medium text-gray-700 pt-2">
                  Trip Name<span className="text-red-500">*</span>
                </label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.proposal_name}
                    onChange={(e) => setFormData({ ...formData, proposal_name: e.target.value })}
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

              {isEditing && (
                <label className="flex items-center gap-2 cursor-pointer ml-28" data-testid="save-as-new-checkbox">
                  <input
                    type="checkbox"
                    checked={saveAsNew}
                    onChange={(e) => setSaveAsNew(e.target.checked)}
                    className="w-4 h-4 text-[#002B5B] border-gray-300 rounded focus:ring-[#002B5B]"
                  />
                  <span className="text-sm font-medium text-gray-700">Save as a New Proposal</span>
                </label>
              )}
            </div>
          </fieldset>

          {/* Estimated Booking Date */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Estimated Booking Date</legend>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <label className="w-40 text-sm font-medium text-gray-700 pt-2">
                  Estimated Date of Booking<span className="text-red-500">*</span>
                </label>
                <div className="flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal gap-2",
                          !formData.expected_booking_date && "text-muted-foreground"
                        )}
                        data-testid="booking-date-input"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        {formData.expected_booking_date
                          ? new Date(formData.expected_booking_date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'Select'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[200]" align="start">
                      <Calendar
                        mode="single"
                        numberOfMonths={2}
                        selected={formData.expected_booking_date ? new Date(formData.expected_booking_date + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setFormData({ ...formData, expected_booking_date: `${y}-${m}-${d}` });
                          }
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                      onChange={() => setFormData({ ...formData, flights_booked: true })}
                      className="w-4 h-4 text-[#002B5B] border-gray-300 focus:ring-[#002B5B]"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="flights_booked"
                      checked={formData.flights_booked === false}
                      onChange={() => setFormData({ ...formData, flights_booked: false })}
                      className="w-4 h-4 text-[#002B5B] border-gray-300 focus:ring-[#002B5B]"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Markup */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Markup</legend>

            <div className="flex items-center gap-4">
              <label className="w-24 text-sm font-medium text-gray-700">Land</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={formData.markup_value}
                  onChange={(e) => setFormData({ ...formData, markup_value: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="markup-value-input"
                />
                <select
                  value={formData.markup_type}
                  onChange={(e) => setFormData({ ...formData, markup_type: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
                  data-testid="markup-type-select"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Discount */}
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
                  onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="discount-amount-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Discount will be adjusted against and limited by the commission/markup.<br />
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

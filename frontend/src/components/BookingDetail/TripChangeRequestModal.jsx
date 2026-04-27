import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Loader2 } from 'lucide-react';
import { api } from '@/App';

const FOR_OPTIONS = [
  'Complete Trip',
  'Hotels',
  'Transfers',
  'Activities',
  'Flights',
];

const TYPE_OPTIONS = [
  'Date Change',
  'Hotel Change',
  'Room Type Change',
  'Add Service',
  'Remove Service',
  'Activity Change',
  'Transfer Change',
  'Add Traveler',
  'Special Request',
  'Other',
];

export default function TripChangeRequestModal({ open, onClose, bookingId, onSubmitted }) {
  const [forScope, setForScope] = useState('Complete Trip');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const reset = () => {
    setForScope('Complete Trip');
    setType('');
    setDescription('');
    setError('');
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose?.();
  };

  const handleSave = async () => {
    setError('');
    if (!type) {
      setError('Please select a Type for the change request');
      return;
    }
    if (!description.trim()) {
      setError('Please describe what you would like to change');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/bookings/${bookingId}/change-requests`, {
        for: forScope,
        type,
        description: description.trim(),
      });
      onSubmitted?.(res.data?.change_request);
      reset();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to submit change request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-6 overflow-y-auto"
        data-testid="trip-change-request-modal"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={submitting}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-40"
            data-testid="trip-change-request-close"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="px-7 pt-7 pb-4 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">Add Trip Change Request</h2>
          </div>

          {/* Body */}
          <div className="px-7 py-6 space-y-5">
            {/* Important Information */}
            <div>
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Important Information</p>
              <ul className="text-sm text-gray-600 space-y-2.5 list-disc pl-5 leading-relaxed">
                <li>
                  Taking into account the trip start date, please note that we will try our best to action the request as soon as possible, but if any service becomes non-refundable or non-actionable during this time, we will not be held responsible for the same.
                </li>
                <li>
                  <span className="font-bold text-gray-900">Hotel Requests</span> - for specific hotel requests such as early check in / late check out, rooming configuration, views, floors, adjoining rooms etc. These are on request and subject to availability. Please contact the hotel directly to make this request.
                </li>
                <li>
                  <span className="font-bold text-gray-900">Transfers</span> - If you wish to book any transfer that is offered by the hotel as part of their room rate, please contact the hotel directly to make this request.
                </li>
              </ul>
            </div>

            {/* Service charge banner */}
            <div className="flex items-center gap-2 px-4 py-3 bg-cyan-50 border border-cyan-100 rounded-md text-sm text-gray-700" data-testid="trip-change-fee-banner">
              <Info size={16} className="text-cyan-600 flex-shrink-0" />
              <span>A service charge of <span className="font-bold">AED 100</span> will be charged for every change request</span>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">For</label>
                <select
                  value={forScope}
                  onChange={(e) => setForScope(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="trip-change-for-select"
                >
                  {FOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="trip-change-type-select"
                >
                  <option value="">- Select -</option>
                  {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none"
                placeholder="Describe what you'd like to change..."
                data-testid="trip-change-description"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700" data-testid="trip-change-error">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-7 pt-2 pb-6 flex justify-end border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={submitting}
              className="px-7 py-2.5 bg-[#002B5B] hover:bg-[#001f44] disabled:opacity-60 text-white font-bold text-sm uppercase tracking-wider rounded-md transition-colors flex items-center gap-2"
              data-testid="trip-change-save-btn"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

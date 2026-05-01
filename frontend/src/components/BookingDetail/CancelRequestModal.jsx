import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { api } from '@/App';

export default function CancelRequestModal({ open, onClose, booking, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const shortRef = booking?.booking_ref
    || (booking?.booking_number != null ? `TBM-${String(booking.booking_number).padStart(6, '0')}` : '—');

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please provide a reason for cancellation.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/bookings/${booking.id}/cancel-request`, { reason: trimmed });
      onSubmitted?.();
      setReason('');
      onClose();
    } catch (e) {
      const detail = e?.response?.data?.detail || 'Failed to submit cancellation request.';
      setError(detail);
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        data-testid="cancel-request-modal"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-rose-50 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-black text-gray-900 text-base">Request Cancellation</h2>
                <p className="text-xs text-gray-600 mt-0.5">Trip Reference: <span className="font-bold">{shortRef}</span></p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              data-testid="cancel-request-close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <p className="font-bold mb-1">Important</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>This request will be sent to the admin &amp; operational team for approval.</li>
                <li>The booking will only be cancelled once approved.</li>
                <li>Standard cancellation policies and refund rules will apply.</li>
              </ul>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                Reason for Cancellation <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                placeholder="Tell us why you need to cancel this trip (required)..."
                data-testid="cancel-request-reason-input"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-700" data-testid="cancel-request-error">
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-md disabled:opacity-50"
              data-testid="cancel-request-dismiss"
            >
              Keep Booking
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason.trim()}
              className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              data-testid="cancel-request-submit"
            >
              {submitting ? 'Submitting...' : 'Submit Cancel Request'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

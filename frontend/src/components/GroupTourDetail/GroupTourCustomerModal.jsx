import React, { useState, useEffect } from 'react';
import { X, Loader2, User, Mail, Phone } from 'lucide-react';
import { api } from '@/App';

/**
 * Lightweight modal shown when the agent clicks "Book Now" or
 * "Save As Proposal" on a Group Tour detail page. Collects just the
 * customer's name / email / phone, calls the save-as-proposal endpoint,
 * and bubbles the resulting proposal back to the parent via `onSaved`.
 *
 * Props:
 *  - mode: 'book' | 'save'    — controls the primary button label/intent.
 *  - dealId, leavingFrom, leavingOn, rooms   — context for the POST body.
 *  - onClose()                — dismiss the modal.
 *  - onSaved(proposal)        — called with the created proposal doc.
 */
export default function GroupTourCustomerModal({
  open, mode, dealId, leavingFrom, leavingOn, rooms, onClose, onSaved,
}) {
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ customer_name: '', customer_email: '', customer_phone: '' });
      setErr('');
    }
  }, [open]);

  if (!open) return null;

  const isBook = mode === 'book';
  const primaryLabel = isBook ? 'Continue to Booking' : 'Save Proposal';
  const primaryClass = isBook ? 'bg-red-600 hover:bg-red-700' : 'bg-[#002B5B] hover:bg-[#003d82]';

  const submit = async () => {
    if (!form.customer_name.trim()) {
      setErr('Customer name is required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim(),
        customer_phone: form.customer_phone.trim(),
        leaving_from: leavingFrom,
        leaving_on: leavingOn,
        rooms: (rooms || []).map(r => ({
          adults: r.adults || 0,
          children: (r.children || []).map(c => ({ age: c.age })),
        })),
      };
      const res = await api.post(`/group-tours/${dealId}/save-as-proposal`, payload);
      onSaved?.(res.data, mode);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="gt-customer-modal">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-black text-gray-900 text-lg">
            {isBook ? 'Book Now — Customer Details' : 'Save As Proposal'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" data-testid="gt-customer-modal-close">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-600">
            {isBook
              ? 'Enter customer details to proceed to the booking confirmation page.'
              : 'This will save the package as a proposal in your My Leads list for follow-up.'}
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Customer Name *</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.customer_name}
                onChange={(e) => setForm(f => ({ ...f, customer_name: e.target.value }))}
                placeholder="Full name"
                className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                data-testid="gt-customer-name-input"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm(f => ({ ...f, customer_email: e.target.value }))}
                placeholder="customer@example.com"
                className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                data-testid="gt-customer-email-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Phone</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.customer_phone}
                onChange={(e) => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                placeholder="+971 50 123 4567"
                className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                data-testid="gt-customer-phone-input"
              />
            </div>
          </div>

          {err && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2" data-testid="gt-customer-modal-error">
              {err}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded disabled:opacity-60"
            data-testid="gt-customer-modal-cancel"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded disabled:opacity-70 ${primaryClass}`}
            data-testid="gt-customer-modal-submit"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

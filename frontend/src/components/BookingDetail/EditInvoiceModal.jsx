import React, { useEffect, useState } from 'react';
import { X, Save, Loader2, Calendar, Mail } from 'lucide-react';
import { api } from '@/App';

const fmtAmount = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (v) => {
  if (!v) return '';
  // Accept ISO YYYY-MM-DD or full ISO timestamps
  return String(v).slice(0, 10);
};

/* Admin/Staff modal to override the invoice's financial fields shown on the
 * Proforma Invoice PDF — Total Price, Amount Paid, Final Payment Due Date.
 */
export default function EditInvoiceModal({ open, booking, onClose, onSaved, onReminderSent }) {
  const [form, setForm] = useState({
    total_price: 0,
    payment_amount: 0,
    payment_fee: 0,
    refund_amount: 0,
    final_payment_due_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open || !booking) return;
    setForm({
      total_price: Number(booking.total_price || 0),
      payment_amount: Number(booking.payment_amount || 0),
      payment_fee: Number(booking.payment_fee || 0),
      refund_amount: Number(booking.refund_amount || 0),
      final_payment_due_date: isoDate(booking.final_payment_due_date),
    });
    setErr('');
    setReminderResult(null);
  }, [open, booking]);

  if (!open) return null;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const total = Number(form.total_price) || 0;
  const paid = Number(form.payment_amount) || 0;
  const fee = Number(form.payment_fee) || 0;
  const refund = Number(form.refund_amount) || 0;
  const balance = Math.max(total - paid + fee - refund, 0);
  const hasBalance = balance > 0.01;

  const sendReminder = async () => {
    if (!hasBalance) return;
    setSendingReminder(true);
    setReminderResult(null);
    setErr('');
    try {
      const res = await api.post(`/bookings/${booking.id}/send-payment-reminder`);
      setReminderResult({
        type: 'success',
        text: `Reminder sent to ${res.data.recipient} · Balance AED ${Number(res.data.balance_due).toLocaleString(undefined, { minimumFractionDigits: 2 })} · Reminder #${res.data.reminder_count}`,
      });
      onReminderSent?.(res.data);
    } catch (e) {
      setReminderResult({
        type: 'error',
        text: e?.response?.data?.detail || 'Failed to send reminder email',
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const payload = {
        total_price: total,
        payment_amount: paid,
        payment_fee: fee,
        refund_amount: refund,
        final_payment_due_date: form.final_payment_due_date || null,
      };
      await api.patch(`/bookings/${booking.id}/invoice-fields`, payload);
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to save invoice fields');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="edit-invoice-modal"
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Edit Invoice Fields</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Override the Total · Paid · Balance Due · Due Date shown on the Proforma Invoice PDF.
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Total Price (AED)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.total_price}
                onChange={e => update('total_price', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#002B5B]"
                data-testid="ei-total-price"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Amount Paid (AED)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.payment_amount}
                onChange={e => update('payment_amount', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#002B5B]"
                data-testid="ei-payment-amount"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Payment Fee (AED)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.payment_fee}
                onChange={e => update('payment_fee', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#002B5B]"
                data-testid="ei-payment-fee"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Refunded (AED)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.refund_amount}
                onChange={e => update('refund_amount', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#002B5B]"
                data-testid="ei-refund-amount"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1 flex items-center gap-1">
              <Calendar size={12} /> Final Payment Due Date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={form.final_payment_due_date || ''}
                onChange={e => update('final_payment_due_date', e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#002B5B]"
                data-testid="ei-due-date"
              />
              <button
                type="button"
                onClick={sendReminder}
                disabled={!hasBalance || sendingReminder || !booking?.id}
                className={`px-3 py-2 text-xs font-bold rounded flex items-center gap-1.5 transition border ${
                  hasBalance
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 disabled:opacity-60'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
                title={hasBalance ? 'Email the customer the latest Proforma Invoice with balance + due date' : 'No outstanding balance — nothing to remind'}
                data-testid="ei-send-reminder"
              >
                {sendingReminder ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                {sendingReminder ? 'Sending...' : 'Send Reminder'}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Customer will see this date as the deadline to settle the outstanding balance.
            </p>
            {reminderResult && (
              <div
                className={`mt-2 text-xs rounded px-3 py-2 border ${
                  reminderResult.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
                data-testid="ei-reminder-result"
              >
                {reminderResult.type === 'success' ? '✓ ' : '⚠ '}{reminderResult.text}
              </div>
            )}
            {!reminderResult && booking?.last_payment_reminder_at && (
              <p className="text-[11px] text-gray-400 mt-1 italic" data-testid="ei-last-reminder">
                Last reminder sent on {new Date(booking.last_payment_reminder_at).toLocaleString()} · {booking.payment_reminder_count || 1}× total.
              </p>
            )}
          </div>

          {/* Live balance preview */}
          <div className={`rounded-lg border p-4 ${hasBalance ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`} data-testid="ei-balance-preview">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-700">Balance Due (preview)</span>
              <span className={`text-xl font-black font-mono ${hasBalance ? 'text-red-700' : 'text-emerald-700'}`} data-testid="ei-balance-amount">
                AED {fmtAmount(balance)}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              = Total − Paid + Fee − Refund. {hasBalance ? 'The invoice PDF will highlight the Final Payment Due date in red.' : 'Fully paid — no balance due.'}
            </p>
          </div>

          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white bg-[#002B5B] hover:bg-[#003d82] rounded flex items-center gap-2 disabled:opacity-60"
            data-testid="ei-save"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

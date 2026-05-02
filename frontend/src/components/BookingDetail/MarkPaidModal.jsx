import React, { useState, useEffect } from 'react';
import { X, Loader2, Wallet, CheckCircle2 } from 'lucide-react';
import { api } from '@/App';

const METHODS = [
  { value: 'cash',           label: 'Cash' },
  { value: 'bank_transfer',  label: 'Bank Transfer / NEFT' },
  { value: 'card',           label: 'Credit / Debit Card' },
  { value: 'cheque',         label: 'Cheque' },
  { value: 'wallet',         label: 'Agent Wallet' },
  { value: 'other',          label: 'Other' },
];

/* Admin / owner-agent modal to register a partial or full payment against a
 * booking. The backend appends it to `payments[]`, re-totals `payment_amount`
 * and automatically emails the Payment Receipt PDF to the customer. */
export default function MarkPaidModal({ open, booking, balanceDue, onClose, onSaved }) {
  const [form, setForm] = useState({ amount: 0, method: 'bank_transfer', reference: '', note: '', send_receipt: true });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({ amount: Number(balanceDue || 0), method: 'bank_transfer', reference: '', note: '', send_receipt: true });
    setResult(null);
    setErr('');
  }, [open, balanceDue]);

  if (!open) return null;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) {
      setErr('Amount must be greater than 0');
      return;
    }
    setSaving(true);
    setErr('');
    setResult(null);
    try {
      const res = await api.post(`/bookings/${booking.id}/mark-paid`, {
        amount: amt,
        method: form.method,
        reference: form.reference || null,
        note: form.note || null,
        send_receipt: !!form.send_receipt,
      });
      setResult(res.data);
      onSaved?.(res.data);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to mark payment');
    } finally {
      setSaving(false);
    }
  };

  const newBalance = result?.balance_due;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()} data-testid="mark-paid-modal">
        <div className="px-6 py-4 border-b border-gray-200 bg-emerald-50 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
              <Wallet size={18} className="text-emerald-600" /> Mark as Paid
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Register a payment & auto-email the Receipt PDF.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white rounded"><X size={20} /></button>
        </div>

        {!result ? (
          <div className="px-6 py-5 space-y-4">
            <div className="bg-gray-50 rounded p-3 text-xs text-gray-600 border border-gray-200">
              Outstanding Balance: <strong className="text-gray-900 font-mono">AED {Number(balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Amount (AED)</label>
              <input
                type="number" step="0.01" min="0.01"
                value={form.amount}
                onChange={e => update('amount', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                data-testid="mp-amount"
              />
              {Number(form.amount) > Number(balanceDue || 0) + 0.01 && (
                <p className="text-[11px] text-amber-700 mt-1">⚠ Amount exceeds current balance — an overpayment will be recorded.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Method</label>
              <select
                value={form.method}
                onChange={e => update('method', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500"
                data-testid="mp-method"
              >
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Reference / Transaction ID</label>
              <input
                type="text"
                value={form.reference}
                onChange={e => update('reference', e.target.value)}
                placeholder="e.g. NEFT-2345, CHQ-00456"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                data-testid="mp-reference"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Note (optional)</label>
              <input
                type="text"
                value={form.note}
                onChange={e => update('note', e.target.value)}
                placeholder="Internal note"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                data-testid="mp-note"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.send_receipt}
                onChange={e => update('send_receipt', e.target.checked)}
                data-testid="mp-send-receipt"
              />
              Auto-email Payment Receipt PDF to customer
            </label>

            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</div>}
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4" data-testid="mp-result">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <CheckCircle2 size={36} className="text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-emerald-900 text-base">
                Payment Recorded — AED {Number(result.transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                New Balance: <strong>AED {Number(newBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                {result.fully_paid && <span className="ml-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Fully Paid</span>}
              </p>
            </div>
            {result.receipt && (
              <div className={`text-xs rounded px-3 py-2 border ${result.receipt.sent ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                {result.receipt.sent
                  ? `✓ Payment Receipt emailed to ${result.receipt.recipient}`
                  : `⚠ Receipt NOT sent — ${result.receipt.error || 'unknown error'}`}
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          {!result ? (
            <>
              <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded">Cancel</button>
              <button
                onClick={submit}
                disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-2 disabled:opacity-60"
                data-testid="mp-submit"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {saving ? 'Recording...' : 'Confirm Payment'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-bold text-white bg-[#002B5B] hover:bg-[#003d82] rounded"
              data-testid="mp-done"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { History, Mail, Bot, Hand, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/App';

const MILESTONE_COLORS = {
  'T-14':  { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200',    label: 'T-14' },
  'T-7':   { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'T-7' },
  'T-3':   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'T-3' },
  'manual':{ bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-200',   label: 'Manual' },
};

const fmtWhen = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};

/* Payment-reminder timeline for the booking. Fetches /reminder-history and
 * renders both the milestone progress + full log.
 */
export default function ReminderHistorySection({ bookingId, refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await api.get(`/bookings/${bookingId}/reminder-history`);
        if (!cancel) setData(res.data);
      } catch (e) {
        if (!cancel) setErr(e?.response?.data?.detail || 'Failed to load reminder history');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [bookingId, refreshKey]);

  if (loading) {
    return <div className="text-xs text-gray-400 py-3 italic">Loading reminder history...</div>;
  }
  if (err) {
    return <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</div>;
  }
  if (!data || data.count === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 border border-gray-200" data-testid="reminder-history-empty">
        <Clock size={14} /> No reminders sent yet. Reminders fire automatically at T-14, T-7 &amp; T-3 days before the payment due date.
      </div>
    );
  }

  const milestones = ['T-14', 'T-7', 'T-3'];
  const sentSet = new Set(data.milestones_sent || []);

  return (
    <div className="space-y-3" data-testid="reminder-history">
      {/* Milestone progress pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Auto Schedule:</span>
        {milestones.map(m => {
          const sent = sentSet.has(m);
          const col = MILESTONE_COLORS[m];
          return (
            <span
              key={m}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                sent ? `${col.bg} ${col.text} ${col.border}` : 'bg-white text-gray-400 border-gray-200'
              }`}
              data-testid={`reminder-milestone-${m}`}
            >
              {sent ? <CheckCircle2 size={10} /> : <Clock size={10} />} {col.label}
            </span>
          );
        })}
        <span className="text-[10px] text-gray-500 ml-auto">Total sent: <strong className="text-gray-800">{data.count}</strong></span>
      </div>

      {/* Timeline entries */}
      <ol className="space-y-2 border-l-2 border-gray-200 pl-4 ml-1">
        {data.entries.map((e, i) => {
          const col = MILESTONE_COLORS[e.milestone] || MILESTONE_COLORS.manual;
          const Icon = e.source === 'auto' ? Bot : Hand;
          return (
            <li key={i} className="relative" data-testid={`reminder-entry-${i}`}>
              <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full ${col.bg} ${col.border} border-2 flex items-center justify-center`}>
                {e.email_sent ? <CheckCircle2 size={8} className={col.text} /> : <AlertCircle size={8} className="text-red-600" />}
              </div>
              <div className="flex items-start gap-2 pb-2">
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${col.bg} ${col.text} ${col.border} border flex items-center gap-1 flex-shrink-0`}>
                  <Icon size={10} /> {col.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-800 flex items-center gap-1 flex-wrap">
                    <Mail size={11} className="text-gray-400" />
                    <span>To: <strong className="text-gray-900 break-all">{e.recipient}</strong></span>
                    <span className="text-gray-400">·</span>
                    <span>Balance: <strong className="font-mono text-red-700">AED {Number(e.balance_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    #{e.reminder_no} · {fmtWhen(e.sent_at)}
                    {e.due_date && <span> · Due {new Date(String(e.due_date).slice(0,10)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                    {!e.email_sent && <span className="ml-2 text-red-600 font-semibold">(delivery failed)</span>}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

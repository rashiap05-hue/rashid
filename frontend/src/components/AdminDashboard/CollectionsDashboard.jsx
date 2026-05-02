import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, Mail, CheckCircle, RefreshCw, Loader2, Search,
  Wallet, Clock, FileSearch,
} from 'lucide-react';
import { api } from '@/App';

const BUCKET_META = {
  overdue:      { label: 'Overdue',          cls: 'bg-red-100 text-red-700 border-red-200' },
  critical:     { label: 'Due in 3 days',    cls: 'bg-red-100 text-red-700 border-red-200' },
  warning:      { label: 'Due in 7 days',    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  watch:        { label: 'Due in 14 days',   cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  future:       { label: 'Future',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  no_due_date:  { label: 'No due date',      cls: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const fmtMoney = (v) => `AED ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(String(iso).slice(0, 10)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
};

export default function CollectionsDashboard({ onViewBooking }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/collections');
      setData(res.data);
    } catch {
      setData({ summary: { total_bookings: 0, total_outstanding: 0, by_bucket: {} }, rows: [] });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const sendReminder = async (row) => {
    setBusyId(row.id);
    try {
      const res = await api.post(`/bookings/${row.id}/send-payment-reminder`);
      setToast(`✓ Reminder sent to ${res.data.recipient}`);
      setTimeout(() => setToast(''), 2500);
      load();
    } catch (e) {
      setToast(`⚠ ${e?.response?.data?.detail || 'Reminder failed'}`);
      setTimeout(() => setToast(''), 3000);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = (data?.rows || []).filter(r => {
    if (filter !== 'all' && r.bucket !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.booking_ref || '').toLowerCase().includes(q)
        || (r.customer_name || '').toLowerCase().includes(q)
        || (r.customer_email || '').toLowerCase().includes(q)
        || (r.destination || '').toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500"><Loader2 className="inline mr-2 animate-spin" size={14} /> Loading collections data...</div>;
  }
  if (!data || data.summary.total_bookings === 0) {
    return (
      <div className="p-12 text-center" data-testid="collections-empty">
        <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
        <p className="text-base font-bold text-gray-800">All accounts settled 🎉</p>
        <p className="text-xs text-gray-500 mt-1">No bookings have an outstanding balance right now.</p>
      </div>
    );
  }

  const summary = data.summary;
  const counts = summary.by_bucket || {};

  return (
    <div data-testid="collections-dashboard">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Wallet size={20} /> Collections Dashboard
          </h3>
          <p className="text-xs text-gray-500 mt-1">Bookings with outstanding balance, sorted by due date.</p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1"
          data-testid="collections-refresh"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <Card label="Total Outstanding" value={fmtMoney(summary.total_outstanding)} cls="bg-[#002B5B] text-white" big testid="kpi-total" />
        <Card label="Bookings" value={summary.total_bookings} cls="bg-white border border-gray-200" testid="kpi-count" />
        <Card label="Overdue" value={counts.overdue || 0} cls="bg-red-50 border border-red-200 text-red-700" testid="kpi-overdue" />
        <Card label="Due in 3d" value={counts.critical || 0} cls="bg-red-50 border border-red-200 text-red-700" testid="kpi-critical" />
        <Card label="Due in 7d" value={counts.warning || 0} cls="bg-amber-50 border border-amber-200 text-amber-700" testid="kpi-warning" />
        <Card label="Due in 14d" value={counts.watch || 0} cls="bg-sky-50 border border-sky-200 text-sky-700" testid="kpi-watch" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>All ({summary.total_bookings})</FilterPill>
        <FilterPill active={filter === 'overdue'} onClick={() => setFilter('overdue')} cls="border-red-300 text-red-700">Overdue ({counts.overdue || 0})</FilterPill>
        <FilterPill active={filter === 'critical'} onClick={() => setFilter('critical')} cls="border-red-300 text-red-700">3-day ({counts.critical || 0})</FilterPill>
        <FilterPill active={filter === 'warning'} onClick={() => setFilter('warning')} cls="border-amber-300 text-amber-700">7-day ({counts.warning || 0})</FilterPill>
        <FilterPill active={filter === 'watch'} onClick={() => setFilter('watch')} cls="border-sky-300 text-sky-700">14-day ({counts.watch || 0})</FilterPill>
        <FilterPill active={filter === 'future'} onClick={() => setFilter('future')} cls="border-emerald-300 text-emerald-700">Future ({counts.future || 0})</FilterPill>
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ref, name, email..."
            className="pl-7 pr-3 py-1.5 border border-gray-300 rounded text-xs w-64 focus:outline-none focus:border-[#002B5B]"
            data-testid="collections-search"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 font-bold">
              <tr>
                <th className="px-3 py-2.5 text-left">Booking</th>
                <th className="px-3 py-2.5 text-left">Customer</th>
                <th className="px-3 py-2.5 text-left">Destination</th>
                <th className="px-3 py-2.5 text-right">Balance</th>
                <th className="px-3 py-2.5 text-center">Due Date</th>
                <th className="px-3 py-2.5 text-center">Aging</th>
                <th className="px-3 py-2.5 text-center">Reminders</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center text-gray-400 py-8 italic">No bookings match the current filter.</td></tr>
              )}
              {filtered.map(r => {
                const bucket = BUCKET_META[r.bucket] || BUCKET_META.no_due_date;
                return (
                  <tr key={r.id} className="border-t border-gray-200 hover:bg-gray-50" data-testid={`coll-row-${r.id}`}>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-gray-900">{r.booking_ref || '—'}</div>
                      <div className="text-[10px] text-gray-500">{r.owner_email}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-gray-800">{r.customer_name || '—'}</div>
                      <div className="text-[10px] text-gray-500">{r.customer_email || ''}</div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">{r.destination || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-red-700">{fmtMoney(r.balance_due)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{fmtDate(r.final_payment_due_date)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${bucket.cls}`}>
                        {r.days_to_due == null ? '—' : (r.days_to_due < 0 ? `${Math.abs(r.days_to_due)}d overdue` : `${r.days_to_due}d`)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {['T-14', 'T-7', 'T-3'].map(m => {
                          const sent = (r.milestones_sent || []).includes(m);
                          return (
                            <span
                              key={m}
                              className={`text-[9px] font-bold px-1 py-0.5 rounded ${sent ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}
                              title={`${m} ${sent ? 'sent' : 'pending'}`}
                            >
                              {m}
                            </span>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{r.reminder_count}× sent</div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => sendReminder(r)}
                          disabled={busyId === r.id}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded flex items-center gap-1 disabled:opacity-60"
                          title="Send Payment Reminder email"
                          data-testid={`coll-remind-${r.id}`}
                        >
                          {busyId === r.id ? <Loader2 size={10} className="animate-spin" /> : <Mail size={10} />}
                          Remind
                        </button>
                        <button
                          onClick={() => onViewBooking?.(r.id)}
                          className="px-2 py-1 border border-gray-300 hover:bg-gray-50 text-gray-700 text-[10px] font-bold rounded flex items-center gap-1"
                          title="Open Booking Detail"
                          data-testid={`coll-view-${r.id}`}
                        >
                          <FileSearch size={10} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50" data-testid="collections-toast">
          {toast}
        </div>
      )}
    </div>
  );
}

function Card({ label, value, cls = '', big = false, testid }) {
  return (
    <div className={`rounded-lg p-3 ${cls}`} data-testid={testid}>
      <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold">{label}</div>
      <div className={`${big ? 'text-xl' : 'text-lg'} font-black mt-1 leading-tight`}>{value}</div>
    </div>
  );
}

function FilterPill({ active, onClick, cls = '', children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
        active
          ? 'bg-[#002B5B] text-white border-[#002B5B]'
          : `bg-white hover:bg-gray-50 border-gray-300 text-gray-700 ${cls}`
      }`}
    >
      {children}
    </button>
  );
}

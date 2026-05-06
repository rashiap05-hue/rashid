import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Calendar, Plus, Loader2, Star, AlertCircle, ChevronDown,
} from 'lucide-react';
import { api } from '@/App';

// ----- helpers -----
const fmtDate = (s) => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};
const fmtDateTime = (s) => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  } catch { return '—'; }
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const isoOffsetDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// Countdown badge for travel date
const Countdown = ({ days }) => {
  if (days === null || days === undefined) return null;
  const cls = days < 0
    ? 'bg-gray-100 text-gray-500'
    : days <= 7
      ? 'bg-rose-100 text-rose-700'
      : days <= 21
        ? 'bg-amber-100 text-amber-700'
        : 'bg-orange-100 text-orange-700';
  const label = days < 0 ? `D+${Math.abs(days)}` : `D-${days}`;
  return (
    <span className={`inline-block mt-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${cls}`}>
      {label}
    </span>
  );
};

// KPI card
const KpiCard = ({ value, label, testid }) => (
  <div className="flex-1 min-w-[160px] bg-white border border-gray-200 rounded-lg px-6 py-4 text-center" data-testid={testid}>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="mt-1 text-xs uppercase tracking-wider text-gray-500 font-medium">{label}</div>
  </div>
);

export default function MyLeads({ onCreateNewQuery, onViewLead }) {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, converted: 0, conv_rate: 0, last_txn_on: null, new_count: 0, follow_up_count: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new');                // 'new' | 'follow_up'
  const [search, setSearch] = useState('');

  // Filter form (only applied when "Show Leads" clicked)
  const [dateFrom, setDateFrom] = useState(isoOffsetDays(-30));
  const [dateTo, setDateTo] = useState(isoOffsetDays(0));
  const [statusFilter, setStatusFilter] = useState('open');
  const [deskFilter, setDeskFilter] = useState('any');
  const [appliedFilters, setAppliedFilters] = useState({
    date_from: isoOffsetDays(-30),
    date_to: isoOffsetDays(0),
    status: 'open',
    desk: 'any',
  });

  // Per-column inline search (table header inputs)
  const [colFilters, setColFilters] = useState({ customer: '', status: '', stage: '', from: '', to: '', date: '', created: '' });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedFilters.date_from) params.set('date_from', appliedFilters.date_from);
      if (appliedFilters.date_to) params.set('date_to', appliedFilters.date_to);
      if (appliedFilters.status && appliedFilters.status !== 'all') params.set('status', appliedFilters.status);
      if (appliedFilters.desk && appliedFilters.desk !== 'any') params.set('desk', appliedFilters.desk);
      if (search.trim()) params.set('search', search.trim());
      const [resL, resS] = await Promise.all([
        api.get(`/leads?${params.toString()}`),
        api.get('/leads/stats'),
      ]);
      setLeads(resL.data || []);
      setStats(resS.data || stats);
    } catch (e) {
      console.error('My Leads fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, search]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const onShowLeads = () => {
    setAppliedFilters({ date_from: dateFrom, date_to: dateTo, status: statusFilter, desk: deskFilter });
  };

  // Derive tab-filtered + column-filtered rows
  const filteredLeads = useMemo(() => {
    const tabFiltered = leads.filter((l) => activeTab === 'follow_up' ? l.is_follow_up : (!l.is_follow_up && l.status === 'open'));
    const c = colFilters;
    return tabFiltered.filter((l) => {
      const dest = (l.destinations || []).join(', ');
      if (c.customer && !l.customer_name?.toLowerCase().includes(c.customer.toLowerCase())) return false;
      if (c.status && !(l.proposal_name || '').toLowerCase().includes(c.status.toLowerCase()) && !(l.status || '').toLowerCase().includes(c.status.toLowerCase())) return false;
      if (c.stage && !(l.trip_stage_note || '').toLowerCase().includes(c.stage.toLowerCase())) return false;
      if (c.from && !(l.from_location || '').toLowerCase().includes(c.from.toLowerCase())) return false;
      if (c.to && !dest.toLowerCase().includes(c.to.toLowerCase())) return false;
      if (c.date && !(l.travel_date || '').toLowerCase().includes(c.date.toLowerCase())) return false;
      if (c.created && !(l.created_at || '').toLowerCase().includes(c.created.toLowerCase())) return false;
      return true;
    });
  }, [leads, activeTab, colFilters]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="my-leads-page">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900" data-testid="my-leads-heading">My Leads Dashboard</h1>
        <button
          onClick={onCreateNewQuery}
          className="inline-flex items-center gap-2 px-5 py-2 border border-[#002B5B] text-[#002B5B] uppercase tracking-wider text-xs font-bold rounded-md hover:bg-[#002B5B] hover:text-white transition-colors"
          data-testid="create-new-query-btn"
        >
          <Plus size={14} /> Create New Query
        </button>
      </div>

      {/* Filter bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none"
            data-testid="filter-date-from" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">—</span>
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none"
              data-testid="filter-date-to" />
          </div>
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-3 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none appearance-none"
            data-testid="filter-status">
            <option value="open">Only Open Leads</option>
            <option value="closed">Only Closed Leads</option>
            <option value="converted">Only Converted Leads</option>
            <option value="all">All Leads</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
        <div className="relative">
          <select value={deskFilter} onChange={(e) => setDeskFilter(e.target.value)}
            className="w-full pl-3 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none appearance-none"
            data-testid="filter-desk">
            <option value="any">Any Desk</option>
            <option value="Default">Default</option>
            <option value="UAE">UAE</option>
            <option value="Far East">Far East</option>
            <option value="Europe">Europe</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
        <button
          onClick={onShowLeads}
          className="px-4 py-2.5 bg-[#002B5B] text-white rounded-lg font-semibold text-sm hover:bg-[#001a3d] transition-colors"
          data-testid="show-leads-btn"
        >
          Show Leads
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard testid="kpi-total" value={stats.total} label="Total Leads" />
        <KpiCard testid="kpi-converted" value={stats.converted} label="Converted" />
        <KpiCard testid="kpi-rate" value={`${stats.conv_rate}%`} label="Conv Rate" />
        <KpiCard testid="kpi-last-txn" value={stats.last_txn_on ? fmtDate(stats.last_txn_on) : '—'} label="Last Txn On" />
      </div>

      {/* Search */}
      <div className="flex justify-end mb-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, email or number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none"
            data-testid="leads-search"
          />
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
        {/* Left rail tabs */}
        <aside className="space-y-2">
          <button
            onClick={() => setActiveTab('new')}
            className={`w-full text-left px-4 py-3 rounded-md text-sm font-semibold border transition-colors ${activeTab === 'new' ? 'bg-[#002B5B] text-white border-[#002B5B]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            data-testid="tab-new-leads"
          >
            New Leads ({stats.new_count})
          </button>
          <button
            onClick={() => setActiveTab('follow_up')}
            className={`w-full text-left px-4 py-3 rounded-md text-sm font-semibold border transition-colors ${activeTab === 'follow_up' ? 'bg-[#002B5B] text-white border-[#002B5B]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            data-testid="tab-follow-ups"
          >
            Follow ups ({stats.follow_up_count})
          </button>
        </aside>

        {/* Right table */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-1" data-testid="active-tab-heading">
            {activeTab === 'new' ? 'New Leads' : 'Follow ups'}
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            {activeTab === 'new'
              ? 'Leads which have not been quoted till now'
              : 'Leads requiring follow-up — older than 3 days or manually flagged'}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500" data-testid="leads-loading">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading leads…
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg py-16 text-center" data-testid="leads-empty">
              <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No leads found for the current filters.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left w-10">#</th>
                      <th className="px-3 py-3 text-left">Customer</th>
                      <th className="px-3 py-3 text-left">Status</th>
                      <th className="px-3 py-3 text-left">Trip Stage</th>
                      <th className="px-3 py-3 text-left">From</th>
                      <th className="px-3 py-3 text-left">To</th>
                      <th className="px-3 py-3 text-left">Travel Date</th>
                      <th className="px-3 py-3 text-left">Lead Creation Time</th>
                      <th className="px-3 py-3 text-center w-10"></th>
                    </tr>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="px-3 py-2"></th>
                      {['customer', 'status', 'stage', 'from', 'to', 'date', 'created'].map((k) => (
                        <th key={k} className="px-3 py-2">
                          <input
                            type="text"
                            value={colFilters[k]}
                            onChange={(e) => setColFilters({ ...colFilters, [k]: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-[#002B5B] focus:border-transparent outline-none"
                            data-testid={`col-filter-${k}`}
                          />
                        </th>
                      ))}
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead, idx) => (
                      <tr key={lead.id} className="border-b border-gray-100 hover:bg-blue-50/30" data-testid={`lead-row-${idx}`}>
                        <td className="px-3 py-3 text-gray-600">{idx + 1}</td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => onViewLead?.(lead)}
                            className="text-blue-600 hover:underline text-sm font-medium text-left"
                            data-testid={`lead-customer-link-${idx}`}
                          >
                            {lead.customer_name}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-sm text-gray-700">{lead.proposal_name || '—'}</div>
                          {lead.assigned_to_name && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded font-medium">
                              {lead.assigned_to_name}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700 max-w-[200px]">
                          <div className="line-clamp-3">{lead.trip_stage_note || '—'}</div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700">{lead.from_location || '—'}</td>
                        <td className="px-3 py-3 text-sm text-gray-700 max-w-[200px]">
                          <div className="line-clamp-3">{(lead.destinations || []).join(', ') || '—'}</div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700">
                          <div>{fmtDate(lead.travel_date)}</div>
                          <Countdown days={lead.days_to_travel} />
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{fmtDateTime(lead.created_at)}</td>
                        <td className="px-3 py-3 text-center">
                          {lead.is_follow_up && <Star size={14} className="text-amber-500 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500" data-testid="leads-count">
                Showing {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}

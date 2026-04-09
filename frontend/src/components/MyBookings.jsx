import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/App';
import { ArrowUpDown, Search, Calendar } from 'lucide-react';
import { BookingStatusTrackerMini } from './BookingStatusTracker';
import { useCurrency } from '@/CurrencyContext';

export default function MyBookings({ onViewProposal, onViewBooking }) {
  const { format } = useCurrency();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateType, setDateType] = useState('booking');
  const [statusFilter, setStatusFilter] = useState('all');
  const [destination, setDestination] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Column filters
  const [colRef, setColRef] = useState('');
  const [colType, setColType] = useState('all');
  const [colStatus, setColStatus] = useState('all');
  const [colBookedBy, setColBookedBy] = useState('');
  const [colName, setColName] = useState('');
  const [colDest, setColDest] = useState('');

  // Sort
  const [sortField, setSortField] = useState('held_at');
  const [sortDir, setSortDir] = useState('desc');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/held-bookings');
      setBookings(res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' });
  };

  const formatDateTime = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    const date = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' });
    const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dubai' });
    return `${date} at ${time}`;
  };

  // Apply all filters
  let filtered = bookings.filter(b => {
    // Top-level filters
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (destination && !(b.cities || []).some(c => (c.name || c || '').toLowerCase().includes(destination.toLowerCase()))) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(b.customer_email || '').toLowerCase().includes(q) && !(b.customer_name || '').toLowerCase().includes(q)) return false;
    }
    if (dateFrom) {
      const df = new Date(dateFrom);
      const bd = new Date(dateType === 'booking' ? b.held_at : b.leaving_on);
      if (bd < df) return false;
    }
    if (dateTo) {
      const dt = new Date(dateTo);
      const bd = new Date(dateType === 'booking' ? b.held_at : b.leaving_on);
      if (bd > dt) return false;
    }
    // Column filters
    if (colRef && !(b.id || '').toLowerCase().includes(colRef.toLowerCase())) return false;
    if (colType !== 'all') {
      const type = b.type || 'Package';
      if (colType !== type) return false;
    }
    if (colStatus !== 'all' && b.status !== colStatus) return false;
    if (colBookedBy && !(b.booked_by_name || '').toLowerCase().includes(colBookedBy.toLowerCase())) return false;
    if (colName && !(b.customer_name || '').toLowerCase().includes(colName.toLowerCase())) return false;
    if (colDest && !(b.cities || []).some(c => (c.name || c || '').toLowerCase().includes(colDest.toLowerCase()))) return false;
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let va = a[sortField] || '';
    let vb = b[sortField] || '';
    if (sortField === 'total_price') { va = Number(va) || 0; vb = Number(vb) || 0; }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const confirmedCount = filtered.filter(b => b.status === 'confirmed').length;
  const totalAmount = filtered.reduce((s, b) => s + (Number(b.total_price) || 0), 0);
  const confirmedAmount = filtered.filter(b => b.status === 'confirmed').reduce((s, b) => s + (Number(b.total_price) || 0), 0);

  const STAGE_LABELS = { held: 'Hold', payment_pending: 'Payment Pending', payment_received: 'Payment Received', confirmed: 'Confirmed', ticketed: 'Ticketed' };

  const getStatusBadge = (status) => {
    const styles = {
      held: 'bg-amber-100 text-amber-800',
      payment_pending: 'bg-orange-100 text-orange-800',
      payment_received: 'bg-teal-100 text-teal-800',
      confirmed: 'bg-green-100 text-green-800',
      ticketed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-700',
      pending: 'bg-blue-100 text-blue-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getTypeBadge = (type) => {
    return type === 'Flight' ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600';
  };

  const getShortRef = (id) => {
    if (!id) return '—';
    return 'ORN' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
  };

  const SortHeader = ({ label, field }) => (
    <th
      className="text-left px-4 py-3 font-bold text-gray-700 text-xs cursor-pointer select-none whitespace-nowrap hover:bg-gray-100"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className="text-gray-400" />
      </span>
    </th>
  );

  return (
    <div className="max-w-full mx-auto px-3 md:px-6 py-4 md:py-8" data-testid="my-bookings-page">
      <h1 className="text-xl md:text-2xl font-black text-[#002B5B] mb-4 md:mb-6">My Bookings</h1>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6 bg-white border border-gray-200 rounded-lg p-3 md:p-4" data-testid="bookings-filter-bar">
        <div className="flex items-center gap-1">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm w-28 md:w-36" data-testid="filter-date-from" />
          <span className="text-gray-400">-</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm w-28 md:w-36" data-testid="filter-date-to" />
        </div>
        <select value={dateType} onChange={e => setDateType(e.target.value)} className="border border-gray-300 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm" data-testid="filter-date-type">
          <option value="booking">By Booking Date</option>
          <option value="travel">By Travel Date</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm" data-testid="filter-status">
          <option value="all">Any Status</option>
          <option value="held">Held</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="pending">Pending</option>
        </select>
        <input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Destination" className="border border-gray-300 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm w-24 md:w-32" data-testid="filter-destination" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="border border-gray-300 rounded-lg px-2 md:px-3 py-2 text-xs md:text-sm w-32 md:w-48 flex-1 min-w-[100px]" data-testid="filter-search" />
        <button onClick={fetchBookings} className="px-3 md:px-5 py-2 bg-[#002B5B] text-white font-semibold rounded-lg hover:bg-[#003d82] text-xs md:text-sm whitespace-nowrap" data-testid="filter-search-btn">
          Search
        </button>
      </div>

      {/* Summary */}
      <div className="text-center mb-6" data-testid="bookings-summary">
        <p className="text-sm text-gray-700">
          Trips Shown - {filtered.length} (<span className="text-green-600 font-semibold">Confirmed: {confirmedCount}</span>)
        </p>
        <p className="text-sm text-gray-700">
          Amount - {format(totalAmount)} (<span className="text-green-600 font-semibold">Confirmed: {format(confirmedAmount)}</span>)
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-3 border-[#002B5B] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto" data-testid="bookings-table">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              {/* Header Row */}
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs w-10">#</th>
                <SortHeader label="Reference" field="id" />
                <SortHeader label="Type" field="type" />
                <SortHeader label="Status" field="status" />
                <SortHeader label="Book Time" field="held_at" />
                <SortHeader label="Travel Date" field="leaving_on" />
                <SortHeader label="Booked By" field="booked_by_name" />
                <SortHeader label="Name" field="customer_name" />
                <SortHeader label="Destinations" field="cities" />
                <SortHeader label="Total Amount" field="total_price" />
                <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs whitespace-nowrap">Pending Amount</th>
                <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs whitespace-nowrap">Progress</th>
              </tr>
              {/* Filter Row */}
              <tr className="border-b border-gray-100 bg-white">
                <td className="px-4 py-2" />
                <td className="px-4 py-2"><input type="text" value={colRef} onChange={e => setColRef(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" data-testid="col-filter-ref" /></td>
                <td className="px-4 py-2">
                  <select value={colType} onChange={e => setColType(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" data-testid="col-filter-type">
                    <option value="all">All</option>
                    <option value="Package">Package</option>
                    <option value="Flight">Flight</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select value={colStatus} onChange={e => setColStatus(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" data-testid="col-filter-status">
                    <option value="all">All</option>
                    <option value="held">Held</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2" />
                <td className="px-4 py-2"><input type="text" value={colBookedBy} onChange={e => setColBookedBy(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" data-testid="col-filter-booked-by" /></td>
                <td className="px-4 py-2"><input type="text" value={colName} onChange={e => setColName(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" data-testid="col-filter-name" /></td>
                <td className="px-4 py-2"><input type="text" value={colDest} onChange={e => setColDest(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" data-testid="col-filter-dest" /></td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2" />
                <td className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">No bookings found</td></tr>
              ) : (
                filtered.map((b, idx) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => onViewBooking?.(b.id)} data-testid={`booking-row-${b.id}`}>
                    <td className="px-4 py-4 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-4">
                      <button onClick={(e) => { e.stopPropagation(); onViewBooking?.(b.id); }} className="text-[#0066CC] hover:underline font-medium text-sm" data-testid={`booking-ref-${b.id}`}>
                        {getShortRef(b.id)}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${getTypeBadge(b.type || 'Package')}`}>
                        {b.type || 'Package'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold capitalize ${getStatusBadge(b.status)}`}>
                        {STAGE_LABELS[b.status] || b.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-xs whitespace-nowrap">{formatDateTime(b.held_at)}</td>
                    <td className="px-4 py-4 text-gray-600 text-xs whitespace-nowrap">{formatDate(b.leaving_on)}</td>
                    <td className="px-4 py-4 text-gray-700">{b.booked_by_name || '—'}</td>
                    <td className="px-4 py-4">
                      <div className="text-gray-800">{b.customer_name || '—'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {b.adults || 0} adult{(b.adults || 0) !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {(b.cities || []).map(c => c.name || c).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-4 text-gray-800 font-medium">{format(b.total_price || 0)}</td>
                    <td className="px-4 py-4 text-gray-500">
                      {b.status === 'confirmed' ? format(0) : format(b.total_price || 0)}
                    </td>
                    <td className="px-4 py-4">
                      <BookingStatusTrackerMini status={b.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

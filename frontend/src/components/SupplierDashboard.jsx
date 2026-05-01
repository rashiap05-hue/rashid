import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, Hotel, Camera, DollarSign, Calendar, Clock, Users, CheckCircle, XCircle, 
  AlertCircle, Package, MapPin, Phone, Mail, User, RefreshCw, Search, Eye, X,
  ArrowLeft, Building2, Loader2, ChevronDown, Plane, FileText, MessageSquare,
  Shield, Smartphone, BookOpen, Bed, Download, Star, Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';
import ServiceItemsTable, { StarRating, formatDate } from './SupplierDashboard/ServiceItemsTable';
import { extractHotels, extractTransfers, extractActivities, extractFlights, extractAddons } from './SupplierDashboard/serviceExtractors';
import ServiceViewModal from './SupplierDashboard/ServiceViewModal';
import { rowsToCsv, downloadCsv, todayStamp } from './SupplierDashboard/csvExport';

// Per-service config (icon, title, details grid) for the generic ServiceViewModal
// Returns a stable shape even when `kind` is null so that conditional rendering
// in the parent doesn't have to re-call this for every prop.
function serviceViewConfig(kind, row) {
  if (!kind || !row) return { icon: null, iconClassName: '', title: '', titleExtra: null, subtitle: '', detailsGrid: [] };

  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  };

  if (kind === 'hotel') {
    const stars = Math.max(0, Math.min(5, Number(row.star_rating) || 0));
    return {
      icon: Hotel,
      iconClassName: 'bg-purple-50 text-purple-700',
      title: row.name,
      titleExtra: stars ? (
        <span className="inline-flex items-center gap-0.5 text-amber-500">
          {Array.from({ length: stars }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
        </span>
      ) : null,
      subtitle: row.city,
      detailsGrid: [
        { label: 'Check-in', value: fmtDate(row.check_in), icon: Calendar },
        { label: 'Check-out', value: fmtDate(row.check_out), icon: Calendar },
        { label: 'Nights', value: row.nights },
        { label: 'Rooms', value: `${row.rooms} × ${row.room_type}`, icon: Bed },
        { label: 'Meal Plan', value: row.meal_plan },
      ],
    };
  }

  if (kind === 'transfer') {
    return {
      icon: Car,
      iconClassName: 'bg-blue-50 text-blue-700',
      title: row.name,
      subtitle: `${row.kind || 'Transfer'} · ${row.type || 'Private'}`,
      detailsGrid: [
        { label: 'Direction', value: row.kind || 'Transfer' },
        { label: 'Vehicle', value: row.type || 'Private' },
        { label: 'Date', value: fmtDate(row.date || row.travel_date), icon: Calendar },
        { label: 'Route', value: row.route || row.city || '—', icon: MapPin },
      ],
    };
  }

  if (kind === 'activity') {
    return {
      icon: Camera,
      iconClassName: 'bg-pink-50 text-pink-700',
      title: row.name,
      subtitle: row.city,
      detailsGrid: [
        { label: 'Date', value: fmtDate(row.date || row.travel_date), icon: Calendar },
        { label: 'Start Time', value: row.start_time || '—', icon: Clock },
        { label: 'Duration', value: row.duration ? (/hr|hour|day/i.test(String(row.duration)) ? row.duration : `${row.duration} hrs`) : '—' },
        { label: 'Vehicle', value: row.type || 'Private' },
      ],
    };
  }

  if (kind === 'flight') {
    return {
      icon: Plane,
      iconClassName: 'bg-sky-50 text-sky-700',
      title: row.airline || 'Flight',
      titleExtra: row.flight_no ? <span className="text-sm font-medium text-gray-500">· {row.flight_no}</span> : null,
      subtitle: `${row.from || '—'} → ${row.to || '—'}`,
      detailsGrid: [
        { label: 'Direction', value: row.kind || 'Onward' },
        { label: 'Departure', value: fmtDate(row.depart_at), icon: Calendar },
        { label: 'Arrival', value: fmtDate(row.arrive_at), icon: Calendar },
        { label: 'Cabin', value: row.cabin || 'Economy' },
        { label: 'PNR', value: row.pnr || '—' },
      ],
    };
  }

  return { icon: null, iconClassName: '', title: '', titleExtra: null, subtitle: '', detailsGrid: [] };
}

export default function SupplierDashboard({ user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [stats, setStats] = useState({});
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailBooking, setDetailBooking] = useState(null);
  const [serviceView, setServiceView] = useState({ kind: null, booking: null, row: null });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, bookRes] = await Promise.all([
        api.get('/supplier/dashboard'),
        api.get('/supplier/bookings'),
      ]);
      setStats(dashRes.data?.stats || {});
      setBookings(bookRes.data?.bookings || []);
    } catch (e) {
      console.error('Supplier dashboard error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleConfirm = async () => { /* legacy — booking-level confirmations replaced by per-service flow */ };
  const handleReject = async () => { /* legacy — booking-level rejections replaced by per-service flow */ };
  // Suppress unused-var warnings (kept as no-ops to avoid breaking any external callers)
  void handleConfirm; void handleReject;

  const filtered = bookings.filter(b => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'cancellation_requested') {
        if (b.cancellation_status !== 'requested' || b.status === 'cancelled') return false;
      } else if (statusFilter === 'cancelled') {
        if (b.status !== 'cancelled') return false;
      } else if (b.supplier_status !== statusFilter) {
        return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = b.proposal?.customer_name?.toLowerCase() || '';
      const pname = b.proposal?.proposal_name?.toLowerCase() || '';
      const oid = (b.order_id || '').toLowerCase();
      const ref = (b.booking_ref || '').toLowerCase();
      if (!name.includes(q) && !pname.includes(q) && !oid.includes(q) && !ref.includes(q)) return false;
    }
    return true;
  });

  const cancellationPendingCount = bookings.filter(
    b => b.cancellation_status === 'requested' && b.status !== 'cancelled'
  ).length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  // Pending counts per tab — used to render at-a-glance badges next to tab names
  const pendingCounts = useMemo(() => {
    const isPending = (r) => (r.status || 'pending') === 'pending';
    return {
      bookings: bookings.filter(b => (b.supplier_status || 'pending') === 'pending').length,
      hotels: extractHotels(bookings).filter(isPending).length,
      transfers: extractTransfers(bookings).filter(isPending).length,
      activities: extractActivities(bookings).filter(isPending).length,
      flights: extractFlights(bookings).filter(isPending).length,
      insurance: extractAddons(bookings, 'insurance').filter(isPending).length,
      visa: extractAddons(bookings, 'visa').filter(isPending).length,
      sim: extractAddons(bookings, 'sim').filter(isPending).length,
    };
  }, [bookings]);

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  // Also import Ban icon for the cancellation state — handled at top of file

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#002B5B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#002B5B] text-white px-8 py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Operational Dashboard</h1>
              <p className="text-sm text-white/70">{user?.company_name || user?.full_name}</p>
            </div>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Bookings', value: stats.total_bookings || 0, icon: Package, color: 'text-blue-600 bg-blue-50' },
            { label: 'Pending', value: stats.pending_bookings || 0, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
            { label: 'Confirmed', value: stats.confirmed_bookings || 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
            { label: 'Cancel Requests', value: cancellationPendingCount, icon: Ban, color: 'text-rose-600 bg-rose-50' },
            { label: 'Rejected', value: stats.rejected_bookings || 0, icon: XCircle, color: 'text-red-600 bg-red-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 border border-gray-200 overflow-x-auto" data-testid="op-dashboard-tabs">
          {[
            { key: 'bookings', label: 'Bookings', icon: Package },
            { key: 'hotels', label: 'Hotels', icon: Hotel },
            { key: 'transfers', label: 'Transfers', icon: Car },
            { key: 'activities', label: 'Activities', icon: Camera },
            { key: 'flights', label: 'Flights', icon: Plane },
            { key: 'insurance', label: 'Insurance', icon: Shield },
            { key: 'visa', label: 'Visa', icon: BookOpen },
            { key: 'sim', label: 'SIM Cards', icon: Smartphone },
          ].map(({ key, label, icon: Icon }) => {
            const pending = pendingCounts[key] || 0;
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                data-testid={`op-tab-${key}`}
                className={cn('px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap',
                  activeTab === key ? 'bg-[#002B5B] text-white' : 'text-gray-600 hover:bg-gray-100'
                )}>
                <Icon size={14} /> {label}
                {pending > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold leading-none',
                      activeTab === key ? 'bg-white text-[#002B5B]' : 'bg-amber-500 text-white'
                    )}
                    data-testid={`op-tab-pending-badge-${key}`}
                    aria-label={`${pending} pending`}
                  >
                    {pending}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search by name, proposal, order ID..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'confirmed', label: 'Confirmed' },
                  { key: 'cancellation_requested', label: `Cancel Req${cancellationPendingCount ? ` (${cancellationPendingCount})` : ''}` },
                  { key: 'cancelled', label: `Cancelled${cancelledCount ? ` (${cancelledCount})` : ''}` },
                  { key: 'rejected', label: 'Rejected' },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setStatusFilter(key)}
                    className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      statusFilter === key ? 'bg-[#002B5B] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                    )}
                    data-testid={`filter-${key}`}>{label}</button>
                ))}
              </div>
            </div>

            {/* Bookings List */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <Package size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No bookings found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(booking => {
                  const p = booking.proposal || {};
                  const cities = (p.cities || []).map(c => c.name).join(', ');
                  return (
                    <div key={booking.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid={`supplier-booking-${booking.id}`}>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Booking Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="font-bold text-gray-900">{p.proposal_name || 'Trip Booking'}</h3>
                              {booking.cancellation_status === 'requested' && booking.status !== 'cancelled' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-100 text-rose-800 flex items-center gap-1">
                                  <Ban size={10} /> Cancel Req
                                </span>
                              ) : booking.status === 'cancelled' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-red-100 text-red-800 flex items-center gap-1">
                                  <XCircle size={10} /> Cancelled
                                </span>
                              ) : (
                                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase", statusColors[booking.supplier_status] || statusColors.pending)}>
                                  {booking.supplier_status || 'pending'}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-gray-400" />
                                <span className="text-gray-600">{p.customer_name || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-gray-400" />
                                <span className="text-gray-600">{cities || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" />
                                <span className="text-gray-600">{p.leaving_on ? new Date(p.leaving_on).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                              </div>
                            </div>

                            {/* Matched Services */}
                            {booking.matched_services?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {booking.matched_services.map((s, i) => (
                                  <span key={i} className={cn("px-2 py-1 rounded text-xs font-medium",
                                    s.type === 'hotel' ? 'bg-purple-50 text-purple-700' :
                                    s.type === 'transfer' ? 'bg-blue-50 text-blue-700' : 'bg-teal-50 text-teal-700'
                                  )}>
                                    {s.type === 'hotel' && <Hotel size={10} className="inline mr-1" />}
                                    {s.type === 'transfer' && <Car size={10} className="inline mr-1" />}
                                    {s.type === 'activity' && <Camera size={10} className="inline mr-1" />}
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {booking.cancellation_status === 'requested' && booking.status !== 'cancelled' && (
                              <div className="mt-3 px-3 py-2 bg-rose-50 border border-rose-200 rounded-md" data-testid={`cancel-request-chip-${booking.id}`}>
                                <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Cancellation Requested</p>
                                {booking.cancellation_reason && (
                                  <p className="text-xs text-rose-700 mt-0.5 line-clamp-2"><span className="font-semibold">Reason:</span> {booking.cancellation_reason}</p>
                                )}
                                {booking.cancellation_requested_by_name && (
                                  <p className="text-[11px] text-rose-600 mt-0.5">
                                    By {booking.cancellation_requested_by_name}
                                    {booking.cancellation_requested_at ? ` · ${new Date(booking.cancellation_requested_at).toLocaleDateString('en-GB')}` : ''}
                                  </p>
                                )}
                                <p className="text-[11px] text-rose-700 mt-1 italic">Click "Details" to approve or reject on the Trip Confirmation page.</p>
                              </div>
                            )}

                            {booking.supplier_note && (
                              <p className="text-xs text-green-600 mt-2">Note: {booking.supplier_note}</p>
                            )}
                            {booking.supplier_rejection_reason && (
                              <p className="text-xs text-red-600 mt-2">Rejection: {booking.supplier_rejection_reason}</p>
                            )}

                            {/* Per-service progress (X / Y services confirmed) */}
                            {(() => {
                              const sc = booking.service_confirmations || {};
                              const totalServices =
                                extractHotels([booking]).length
                                + extractTransfers([booking]).length
                                + extractActivities([booking]).length
                                + extractFlights([booking]).length;
                              if (!totalServices) return null;
                              const confirmedCount = Object.values(sc).filter(s => s?.status === 'confirmed').length;
                              const rejectedCount = Object.values(sc).filter(s => s?.status === 'rejected').length;
                              const pct = Math.round((confirmedCount / totalServices) * 100);
                              return (
                                <div className="mt-3" data-testid={`booking-progress-${booking.id}`}>
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="font-bold text-gray-700">
                                      {confirmedCount} / {totalServices} services confirmed
                                      {rejectedCount > 0 && <span className="text-red-600 ml-2">· {rejectedCount} rejected</span>}
                                    </span>
                                    <span className="text-gray-500">{pct}%</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    Status auto-rolls up when all services are confirmed via the per-service tabs above.
                                  </p>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setDetailBooking(booking)}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                              data-testid={`view-booking-${booking.id}`}>
                              <Eye size={14} /> Details
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Payment info bar */}
                      <div className="bg-gray-50 px-5 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Ref: {booking.booking_ref || (booking.booking_number != null ? `TBM-${String(booking.booking_number).padStart(6, '0')}` : booking.id?.slice(0, 8))}</span>
                        <span>Payment: {booking.payment_method || 'N/A'} — AED {(booking.payment_amount || p.total_price || 0).toLocaleString()}</span>
                        <span>Booked: {booking.created_at ? new Date(booking.created_at).toLocaleDateString('en-GB') : 'N/A'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Service-type Tabs */}
        {activeTab !== 'bookings' && (
          <ServiceTab
            tab={activeTab}
            bookings={filtered}
            onView={(bid, row) => {
              const b = bookings.find(x => x.id === bid);
              if (!b) return;
              if (['hotels', 'transfers', 'activities', 'flights'].includes(activeTab)) {
                const KIND_MAP = { hotels: 'hotel', transfers: 'transfer', activities: 'activity', flights: 'flight' };
                setServiceView({ kind: KIND_MAP[activeTab], booking: b, row });
              } else {
                setDetailBooking(b);
              }
            }}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
      </div>

      {/* Service View modal — works for hotels / transfers / activities / flights */}
      <ServiceViewModal
        open={!!serviceView.booking}
        onClose={() => setServiceView({ kind: null, booking: null, row: null })}
        booking={serviceView.booking}
        row={serviceView.row}
        currentUser={user}
        onUpdated={fetchData}
        kind={serviceView.kind}
        icon={serviceViewConfig(serviceView.kind, serviceView.row).icon}
        iconClassName={serviceViewConfig(serviceView.kind, serviceView.row).iconClassName}
        title={serviceViewConfig(serviceView.kind, serviceView.row).title}
        titleExtra={serviceViewConfig(serviceView.kind, serviceView.row).titleExtra}
        subtitle={serviceViewConfig(serviceView.kind, serviceView.row).subtitle}
        detailsGrid={serviceViewConfig(serviceView.kind, serviceView.row).detailsGrid}
        guestsFallback={serviceView.row?.guests}
        testIdPrefix={`${serviceView.kind || 'service'}-view`}
      />

      {/* Booking Detail Modal */}
      <AnimatePresence>
        {detailBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailBooking(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="booking-detail-modal">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-gray-900">Booking Details</h3>
                <button onClick={() => setDetailBooking(null)} className="p-1 hover:bg-gray-100 rounded-full"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-5">
                {/* Customer Info */}
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Customer</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400">Name:</span> <span className="font-medium">{detailBooking.proposal?.customer_name || 'N/A'}</span></div>
                    <div><span className="text-gray-400">Email:</span> <span className="font-medium">{detailBooking.proposal?.customer_email || 'N/A'}</span></div>
                    <div><span className="text-gray-400">Phone:</span> <span className="font-medium">{detailBooking.proposal?.customer_phone || 'N/A'}</span></div>
                    <div><span className="text-gray-400">Travel Date:</span> <span className="font-medium">{detailBooking.proposal?.leaving_on || 'N/A'}</span></div>
                  </div>
                </div>

                {/* Trip Details */}
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Trip Details</h4>
                  <p className="text-sm text-gray-700 font-medium mb-2">{detailBooking.proposal?.proposal_name}</p>
                  <div className="flex flex-wrap gap-2">
                    {(detailBooking.proposal?.cities || []).map((c, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 rounded-lg text-sm">
                        <MapPin size={12} className="inline mr-1 text-gray-400" />{c.name} — {c.nights} night{c.nights > 1 ? 's' : ''}
                      </span>
                    ))}
                  </div>
                  {detailBooking.proposal?.room_data?.length > 0 && (
                    <div className="mt-3 text-sm text-gray-600">
                      <Users size={14} className="inline mr-1" />
                      {detailBooking.proposal.room_data.map((r, i) => (
                        <span key={i}>{i > 0 && ', '}Room {i + 1}: {r.adults} adult{r.adults > 1 ? 's' : ''}{r.children?.length > 0 ? `, ${r.children.length} child` : ''}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Your Services in This Booking */}
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Your Services</h4>
                  <div className="space-y-2">
                    {(detailBooking.matched_services || []).map((s, i) => (
                      <div key={i} className={cn("p-3 rounded-lg border text-sm",
                        s.type === 'hotel' ? 'bg-purple-50 border-purple-200' :
                        s.type === 'transfer' ? 'bg-blue-50 border-blue-200' : 'bg-teal-50 border-teal-200'
                      )}>
                        <span className="font-medium capitalize">{s.type}:</span> {s.name}
                        {s.direction && <span className="text-xs text-gray-500 ml-2">({s.direction})</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hotels */}
                {detailBooking.proposal?.selected_hotels && Object.keys(detailBooking.proposal.selected_hotels).length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Hotels</h4>
                    {Object.entries(detailBooking.proposal.selected_hotels).map(([key, hotel]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg text-sm mb-2">
                        <p className="font-medium">{hotel?.name}</p>
                        <p className="text-gray-500">{hotel?.selectedRoom?.name || 'Standard Room'} • {hotel?.star_rating} star</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transfers */}
                {(detailBooking.proposal?.arrival_transfer || detailBooking.proposal?.departure_transfer) && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Transfers</h4>
                    {detailBooking.proposal.arrival_transfer && (
                      <div className="p-3 bg-blue-50 rounded-lg text-sm mb-2">
                        <p className="font-medium text-blue-800">Arrival: {detailBooking.proposal.arrival_transfer.title}</p>
                      </div>
                    )}
                    {detailBooking.proposal.departure_transfer && (
                      <div className="p-3 bg-orange-50 rounded-lg text-sm mb-2">
                        <p className="font-medium text-orange-800">Departure: {detailBooking.proposal.departure_transfer.title}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Travelers */}
                {detailBooking.travelers?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Travelers</h4>
                    {detailBooking.travelers.map((t, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm mb-2">
                        <p className="font-medium">{t.title} {t.firstName} {t.lastName}</p>
                        {t.passportNumber && <p className="text-gray-500">Passport: {t.passportNumber}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Payment */}
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Payment</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400">Method:</span> <span className="font-medium capitalize">{detailBooking.payment_method || 'N/A'}</span></div>
                    <div><span className="text-gray-400">Amount:</span> <span className="font-bold text-green-700">AED {(detailBooking.payment_amount || detailBooking.proposal?.total_price || 0).toLocaleString()}</span></div>
                    <div><span className="text-gray-400">Booking Ref:</span> <span className="font-medium">{detailBooking.booking_ref || (detailBooking.booking_number != null ? `TBM-${String(detailBooking.booking_number).padStart(6, '0')}` : 'N/A')}</span></div>
                    <div><span className="text-gray-400">Status:</span> <span className={cn("font-bold uppercase", detailBooking.supplier_status === 'confirmed' ? 'text-green-600' : detailBooking.supplier_status === 'rejected' ? 'text-red-600' : 'text-amber-600')}>{detailBooking.supplier_status || 'Pending'}</span></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ===========================
// Service-type tab subcomponent
// ===========================
function ServiceTab({ tab, bookings, onView, statusFilter, setStatusFilter, searchQuery, setSearchQuery }) {
  const rows = useMemo(() => {
    let r = [];
    if (tab === 'hotels') r = extractHotels(bookings);
    else if (tab === 'transfers') r = extractTransfers(bookings);
    else if (tab === 'activities') r = extractActivities(bookings);
    else if (tab === 'flights') r = extractFlights(bookings);
    else if (tab === 'insurance') r = extractAddons(bookings, 'insurance');
    else if (tab === 'visa') r = extractAddons(bookings, 'visa');
    else if (tab === 'sim') r = extractAddons(bookings, 'sim');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      r = r.filter(x => Object.values(x).some(v => String(v ?? '').toLowerCase().includes(q)));
    }
    return r;
  }, [tab, bookings, searchQuery]);

  const COLUMNS = {
    hotels: [
      { key: 'name', label: 'Hotel', render: (r) => (
        <div>
          <p className="font-bold text-gray-900">{r.name} <StarRating rating={r.star_rating} /></p>
          <p className="text-xs text-gray-500">{r.city}</p>
        </div>
      ), csv: (r) => `${r.name}${r.star_rating ? ` (${r.star_rating}*)` : ''} — ${r.city || ''}` },
      { key: 'guests', label: 'Guest' },
      { key: 'check_in', label: 'Check-in', render: (r) => formatDate(r.check_in), csv: (r) => formatDate(r.check_in) },
      { key: 'check_out', label: 'Check-out', render: (r) => formatDate(r.check_out), csv: (r) => formatDate(r.check_out) },
      { key: 'rooms', label: 'Rooms', render: (r) => `${r.rooms} × ${r.room_type}`, csv: (r) => `${r.rooms} × ${r.room_type}` },
      { key: 'meal_plan', label: 'Meal Plan' },
      { key: 'confirmation', label: 'Confirmation' },
    ],
    transfers: [
      { key: 'kind', label: 'Type', render: (r) => (
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
          r.kind === 'Arrival' ? 'bg-blue-50 text-blue-700' :
          r.kind === 'Departure' ? 'bg-orange-50 text-orange-700' : 'bg-purple-50 text-purple-700'
        )}>{r.kind}</span>
      ), csv: (r) => r.kind },
      { key: 'name', label: 'Service', render: (r) => (
        <div>
          <p className="font-bold text-gray-900">{r.name}</p>
          {r.route && <p className="text-xs text-gray-500">Route: {r.route}</p>}
        </div>
      ), csv: (r) => `${r.name}${r.route ? ` (Route: ${r.route})` : ''}` },
      { key: 'type', label: 'Vehicle' },
      { key: 'guests', label: 'Passenger(s)' },
      { key: 'date', label: 'Date', render: (r) => formatDate(r.date || r.travel_date), csv: (r) => formatDate(r.date || r.travel_date) },
    ],
    activities: [
      { key: 'name', label: 'Activity', render: (r) => (
        <div>
          <p className="font-bold text-gray-900">{r.name}</p>
          <p className="text-xs text-gray-500">{r.city}</p>
        </div>
      ), csv: (r) => `${r.name} — ${r.city || ''}` },
      { key: 'guests', label: 'Guest(s)' },
      { key: 'date', label: 'Date', render: (r) => formatDate(r.date || r.travel_date) },
      { key: 'start_time', label: 'Start', render: (r) => r.start_time || '—' },
      { key: 'duration', label: 'Duration', render: (r) => {
        if (!r.duration) return '—';
        const s = String(r.duration);
        return /hr|hour|day/i.test(s) ? s : `${s} hrs`;
      } },
      { key: 'type', label: 'Vehicle' },
    ],
    flights: [
      { key: 'kind', label: 'Direction', render: (r) => r.kind || 'Onward' },
      { key: 'airline', label: 'Airline', render: (r) => (
        <div>
          <p className="font-bold text-gray-900">{r.airline}</p>
          <p className="text-xs text-gray-500">{r.flight_no || ''}</p>
        </div>
      ) },
      { key: 'route', label: 'Route', render: (r) => `${r.from || '—'} → ${r.to || '—'}` },
      { key: 'depart_at', label: 'Departure', render: (r) => formatDate(r.depart_at) },
      { key: 'cabin', label: 'Cabin' },
      { key: 'guests', label: 'Passenger(s)' },
      { key: 'pnr', label: 'PNR' },
    ],
    insurance: [
      { key: 'customer', label: 'Customer' },
      { key: 'pax', label: 'Pax' },
      { key: 'detail', label: 'Plan' },
      { key: 'travel_date', label: 'Travel Date', render: (r) => formatDate(r.travel_date) },
      { key: 'city', label: 'Destination' },
    ],
    visa: [
      { key: 'customer', label: 'Customer' },
      { key: 'pax', label: 'Pax' },
      { key: 'detail', label: 'Visa' },
      { key: 'city', label: 'Destination' },
      { key: 'travel_date', label: 'Travel Date', render: (r) => formatDate(r.travel_date) },
    ],
    sim: [
      { key: 'customer', label: 'Customer' },
      { key: 'pax', label: 'Pax' },
      { key: 'detail', label: 'SIM Plan' },
      { key: 'city', label: 'Destination' },
      { key: 'travel_date', label: 'Travel Date', render: (r) => formatDate(r.travel_date) },
    ],
  };

  const titles = {
    hotels: 'Hotel Reservations',
    transfers: 'Transfer Bookings',
    activities: 'Activity Bookings',
    flights: 'Flight Reservations',
    insurance: 'Travel Insurance',
    visa: 'Visa Cases',
    sim: 'SIM Card Orders',
  };

  return (
    <div data-testid={`service-tab-${tab}`}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${titles[tab].toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            data-testid={`service-search-${tab}`}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'confirmed', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3.5 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                statusFilter === s ? 'bg-[#002B5B] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              )}
              data-testid={`service-filter-${tab}-${s}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-500" data-testid={`service-count-${tab}`}>
            {rows.length} {rows.length === 1 ? 'item' : 'items'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (!rows.length) return;
              const csv = rowsToCsv(rows, COLUMNS[tab]);
              const filename = `${tab}-${todayStamp()}.csv`;
              downloadCsv(filename, csv);
            }}
            disabled={!rows.length}
            className={cn(
              'px-3.5 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors',
              rows.length ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
            data-testid={`service-export-csv-${tab}`}
            title={rows.length ? 'Download as CSV' : 'No rows to export'}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <h3 className="text-sm font-bold text-gray-700 mb-3">{titles[tab]}</h3>
      <ServiceItemsTable
        rows={rows}
        columns={COLUMNS[tab]}
        emptyText={`No ${titles[tab].toLowerCase()} for the current filter`}
        onView={onView}
        testId={`service-table-${tab}`}
      />
    </div>
  );
}

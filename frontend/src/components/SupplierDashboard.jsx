import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, Hotel, Camera, DollarSign, Calendar, Clock, Users, CheckCircle, XCircle, 
  AlertCircle, Package, MapPin, Phone, Mail, User, RefreshCw, Search, Eye, X,
  ArrowLeft, Building2, Loader2, ChevronDown, Plane, FileText, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

export default function SupplierDashboard({ user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [stats, setStats] = useState({});
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionModal, setActionModal] = useState({ open: false, booking: null, type: null });
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [detailBooking, setDetailBooking] = useState(null);

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

  const handleConfirm = async () => {
    if (!actionModal.booking) return;
    setActionLoading(true);
    try {
      await api.post(`/supplier/bookings/${actionModal.booking.id}/confirm`, { note: actionNote });
      setActionModal({ open: false, booking: null, type: null });
      setActionNote('');
      fetchData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to confirm');
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!actionModal.booking || !actionNote.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/supplier/bookings/${actionModal.booking.id}/reject`, { reason: actionNote });
      setActionModal({ open: false, booking: null, type: null });
      setActionNote('');
      fetchData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to reject');
    }
    setActionLoading(false);
  };

  const filtered = bookings.filter(b => {
    if (statusFilter !== 'all' && b.supplier_status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = b.proposal?.customer_name?.toLowerCase() || '';
      const pname = b.proposal?.proposal_name?.toLowerCase() || '';
      const oid = (b.order_id || '').toLowerCase();
      if (!name.includes(q) && !pname.includes(q) && !oid.includes(q)) return false;
    }
    return true;
  });

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

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
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Bookings', value: stats.total_bookings || 0, icon: Package, color: 'text-blue-600 bg-blue-50' },
            { label: 'Pending', value: stats.pending_bookings || 0, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
            { label: 'Confirmed', value: stats.confirmed_bookings || 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
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
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 border border-gray-200 w-fit">
          {['bookings', 'services'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("px-5 py-2 rounded-md text-sm font-medium transition-colors capitalize",
                activeTab === tab ? 'bg-[#002B5B] text-white' : 'text-gray-600 hover:bg-gray-100'
              )}>{tab}</button>
          ))}
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
              <div className="flex gap-2">
                {['all', 'pending', 'confirmed', 'rejected'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={cn("px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
                      statusFilter === s ? 'bg-[#002B5B] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                    )}>{s}</button>
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
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-gray-900">{p.proposal_name || 'Trip Booking'}</h3>
                              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase", statusColors[booking.supplier_status] || statusColors.pending)}>
                                {booking.supplier_status || 'pending'}
                              </span>
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

                            {booking.supplier_note && (
                              <p className="text-xs text-green-600 mt-2">Note: {booking.supplier_note}</p>
                            )}
                            {booking.supplier_rejection_reason && (
                              <p className="text-xs text-red-600 mt-2">Rejection: {booking.supplier_rejection_reason}</p>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setDetailBooking(booking)}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                              data-testid={`view-booking-${booking.id}`}>
                              <Eye size={14} /> Details
                            </button>
                            {(!booking.supplier_status || booking.supplier_status === 'pending') && (
                              <>
                                <button onClick={() => { setActionModal({ open: true, booking, type: 'confirm' }); setActionNote(''); }}
                                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                  data-testid={`confirm-booking-${booking.id}`}>
                                  <CheckCircle size={14} /> Confirm
                                </button>
                                <button onClick={() => { setActionModal({ open: true, booking, type: 'reject' }); setActionNote(''); }}
                                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                  data-testid={`reject-booking-${booking.id}`}>
                                  <XCircle size={14} /> Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Payment info bar */}
                      <div className="bg-gray-50 px-5 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Order: {booking.order_id || booking.id?.slice(0, 8)}</span>
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

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Your Linked Services</h3>
            <p className="text-sm text-gray-500 mb-2">Total services: {stats.total_services || 0} (Hotels: {stats.total_hotels || 0}, Transfers: {stats.total_transfers || 0}, Activities: {stats.total_activities || 0})</p>
            <p className="text-xs text-gray-400">Bookings containing your services are auto-routed to this dashboard.</p>
          </div>
        )}
      </div>

      {/* Confirm/Reject Modal */}
      <AnimatePresence>
        {actionModal.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActionModal({ open: false, booking: null, type: null })} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-md" data-testid="action-modal">
              <div className={cn("px-6 py-4 rounded-t-xl text-white", actionModal.type === 'confirm' ? 'bg-green-600' : 'bg-red-600')}>
                <h3 className="text-lg font-bold">{actionModal.type === 'confirm' ? 'Confirm Booking' : 'Reject Booking'}</h3>
                <p className="text-sm text-white/80">{actionModal.booking?.proposal?.proposal_name}</p>
              </div>
              <div className="p-6">
                <label className="text-sm font-medium text-gray-700">
                  {actionModal.type === 'confirm' ? 'Note (optional)' : 'Reason for rejection *'}
                </label>
                <textarea value={actionNote} onChange={e => setActionNote(e.target.value)}
                  placeholder={actionModal.type === 'confirm' ? 'Add a note...' : 'Please provide a reason...'}
                  className="mt-2 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none h-28 focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="action-note-input" />
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setActionModal({ open: false, booking: null, type: null })}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={actionModal.type === 'confirm' ? handleConfirm : handleReject}
                    disabled={actionLoading || (actionModal.type === 'reject' && !actionNote.trim())}
                    className={cn("flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50",
                      actionModal.type === 'confirm' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    )} data-testid="action-submit-btn">
                    {actionLoading && <Loader2 size={14} className="animate-spin" />}
                    {actionModal.type === 'confirm' ? 'Confirm' : 'Reject'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    <div><span className="text-gray-400">Order ID:</span> <span className="font-medium">{detailBooking.order_id || 'N/A'}</span></div>
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

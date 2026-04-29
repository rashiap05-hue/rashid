import React, { useState, useEffect, useCallback } from 'react';
import { api, resolveImageUrl } from '@/App';
import { BookingStatusTrackerFull } from './BookingStatusTracker';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '@/CurrencyContext';
import {
  ArrowLeft, Calendar, Users, MapPin, Phone, Mail, Clock, Star,
  Download, Upload, ChevronDown, ChevronUp, Plane, Building2, Car,
  Shield, FileText, AlertTriangle, CreditCard, CheckCircle, User, Bed, Smartphone, Printer
} from 'lucide-react';
import TripChangeRequestModal from './BookingDetail/TripChangeRequestModal';
import TripTasksCard from './BookingDetail/TripTasksCard';
import TripTaskDetailsModal from './BookingDetail/TripTaskDetailsModal';

export default function BookingDetail({ bookingId, initialTaskId, onBack, onViewProposal, onClickPay, onViewItinerary }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [travelers, setTravelers] = useState([]);
  const [savingTravelers, setSavingTravelers] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'invoice' | 'voucher' | null
  const [emailToast, setEmailToast] = useState('');
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [tripTasks, setTripTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);

  // Read current logged-in user from localStorage (App.js writes 'travo_user')
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('travo_user') || 'null'); }
    catch { return null; }
  })();
  const isAdmin = currentUser?.role === 'admin';

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS = Array.from({length: 31}, (_, i) => i + 1);
  const YEARS = Array.from({length: 80}, (_, i) => new Date().getFullYear() - i);
  const EXPIRY_YEARS = Array.from({length: 11}, (_, i) => new Date().getFullYear() + i);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/held-bookings/${bookingId}`);
      setData(res.data);
      // Compute total travelers from proposal.room_data (sum of adults across rooms),
      // falling back to booking.adults / 1 if not set.
      const proposal = res.data.proposal || {};
      const roomData = Array.isArray(proposal.room_data) ? proposal.room_data : [];
      const totalAdults = roomData.length
        ? roomData.reduce((s, r) => s + (Number(r.adults) || 0), 0)
        : (res.data.booking?.adults || 1);
      const adults = Math.max(1, totalAdults);
      const existing = res.data.booking?.travelers || [];
      const t = [];
      for (let i = 0; i < adults; i++) {
        t.push(existing[i] || { title: '', firstName: '', lastName: '', dobDay: '', dobMonth: '', dobYear: '', passportNumber: '', expiryDay: '', expiryMonth: '', expiryYear: '', nationality: '' });
      }
      setTravelers(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [bookingId]);

  const fetchTripTasks = useCallback(async () => {
    try {
      const res = await api.get(`/bookings/${bookingId}/change-requests`);
      setTripTasks(res.data?.change_requests || []);
    } catch (e) { /* noop */ }
  }, [bookingId]);

  useEffect(() => { fetchDetail(); fetchTripTasks(); }, [fetchDetail, fetchTripTasks]);

  // Auto-open a specific task when navigating from a notification click
  useEffect(() => {
    if (!initialTaskId || !tripTasks.length) return;
    const target = tripTasks.find(t => t.id === initialTaskId);
    if (target) setActiveTask(target);
  }, [initialTaskId, tripTasks]);

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' });
  };
  const formatDateTime = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' }) + ' ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dubai' });
  };

  const updateTraveler = (idx, field, value) => {
    setTravelers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const saveTravelers = async () => {
    setSavingTravelers(true);
    try {
      await api.put(`/bookings/${bookingId}/travelers`, { travelers });
      alert('Traveler information saved!');
    } catch (e) { console.error(e); }
    setSavingTravelers(false);
  };

  const { format: formatPrice } = useCurrency();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-[#002B5B] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-gray-500">Booking not found</div>;
  }

  const { booking, proposal, terms, expert, user } = data;
  const shortRef = booking.booking_ref
    || (booking.booking_number != null ? `TBM-${String(booking.booking_number).padStart(6, '0')}` : null)
    || (() => {
      const digits = (booking.id || '').replace(/\D/g, '').slice(0, 6) || '000000';
      return `TBM-${digits.padStart(6, '0')}`;
    })();
  const totalPrice = Number(booking.total_price || 0);
  // Build payment transactions list from booking.payments[] if present, else synthesize from booking.paid_at/amount.
  const transactions = Array.isArray(booking.payments) && booking.payments.length > 0
    ? booking.payments.map(p => ({
        date: p.paid_at || p.created_at,
        amount: Number(p.amount || 0),
        status: p.status || 'Processed Successfully',
        receipt_id: p.id || p.order_id,
      }))
    : (booking.paid_at ? [{
        date: booking.paid_at,
        amount: Number(booking.payment_amount || totalPrice),
        status: 'Processed Successfully',
        receipt_id: booking.order_id,
      }] : []);
  const paidAmount = transactions.reduce((s, t) => s + (t.amount || 0), 0);
  const outstanding = Math.max(totalPrice - paidAmount, 0);
  const isPaid = paidAmount >= totalPrice && totalPrice > 0;

  const handleDocAction = async (kind, action) => {
    setOpenDropdown(null);
    const docName = kind === 'invoice' ? 'Invoice' : 'Voucher';
    const endpoint = kind === 'invoice'
      ? `/bookings/${booking.id}/invoice-pdf`
      : `/bookings/${booking.id}/voucher-pdf`;

    if (action === 'download' || action === 'print') {
      try {
        const res = await api.get(endpoint, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        if (action === 'print') {
          const w = window.open(url, '_blank');
          if (w) w.onload = () => w.print();
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.download = `${docName}_${shortRef}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 5000);
      } catch (e) {
        console.error(e);
        setEmailToast(`Failed to ${action} ${docName.toLowerCase()}`);
        setTimeout(() => setEmailToast(''), 3500);
      }
      return;
    }
    if (action === 'email') {
      try {
        const sendUrl = kind === 'invoice'
          ? `/bookings/${booking.id}/send-invoice`
          : `/bookings/${booking.id}/send-voucher`;
        const res = await api.post(sendUrl);
        const recipient = res?.data?.recipient || booking.customer_email || 'the registered email';
        setEmailToast(`${docName} sent to ${recipient} ✓`);
      } catch (e) {
        console.error(e);
        const detail = e?.response?.data?.detail || `Failed to email ${docName.toLowerCase()}`;
        setEmailToast(detail);
      }
      setTimeout(() => setEmailToast(''), 3500);
    }
  };

  // Extract hotels & activities from proposal
  const selectedHotels = proposal?.selected_hotels || {};
  const selectedActivities = proposal?.selected_activities || {};
  const flights = proposal?.flights || [];
  const cities = proposal?.cities || booking.cities || [];

  const CollapsibleSection = ({ title, sectionKey, children, icon }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4" data-testid={`section-${sectionKey}`}>
      <button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors">
        <span className="flex items-center gap-2 font-bold text-gray-800 text-sm">{icon}{title}</span>
        {expandedSections[sectionKey] ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {expandedSections[sectionKey] && <div className="px-5 py-4">{children}</div>}
    </div>
  );

  const STAGE_LABELS = { held: 'Blocked', payment_pending: 'Payment Pending', payment_received: 'Payment Received', confirmed: 'Confirmed', ticketed: 'Ticketed' };

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8" data-testid="booking-detail-page" onClick={() => openDropdown && setOpenDropdown(null)}>
      {/* Action toast */}
      <AnimatePresence>
        {emailToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-[60] bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2"
            data-testid="email-toast"
          >
            <CheckCircle size={16} />{emailToast}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 md:mb-6" data-testid="back-to-bookings">
        <ArrowLeft size={16} /> Back to My Bookings
      </button>

      {/* Page Title */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-black text-[#002B5B]">Your Trip Confirmation</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          booking.status === 'held' ? 'bg-amber-100 text-amber-800' :
          booking.status === 'payment_pending' ? 'bg-orange-100 text-orange-800' :
          booking.status === 'payment_received' ? 'bg-teal-100 text-teal-800' :
          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
          booking.status === 'ticketed' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`} data-testid="booking-page-status">
          {booking.status === 'confirmed' || booking.status === 'ticketed' ? '✓ Confirmed' : (STAGE_LABELS[booking.status] || booking.status)}
        </span>
      </div>

      {/* Trip Reference Header */}
      <div className="bg-[#002B5B] rounded-xl p-4 md:p-6 mb-4 md:mb-6 text-white" data-testid="trip-reference-header">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider">Trip Reference</p>
            <h2 className="text-xl md:text-2xl font-black mt-1">{shortRef}</h2>
            <p className="text-sm text-white/70 mt-2">{booking.proposal_name || 'Trip Package'}</p>
          </div>
          <button
            onClick={() => onViewProposal?.(booking.proposal_id)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
            data-testid="view-quote-btn"
          >
            View Quote
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mt-5 md:mt-6 pt-4 md:pt-5 border-t border-white/20">
          <div><p className="text-xs text-white/50">Guest Name</p><p className="font-semibold text-sm mt-0.5">{booking.customer_name || '—'}</p></div>
          <div><p className="text-xs text-white/50">Email</p><p className="font-semibold text-sm mt-0.5">{booking.customer_email || '—'}</p></div>
          <div><p className="text-xs text-white/50">Phone</p><p className="font-semibold text-sm mt-0.5">{booking.customer_phone || user?.mobile || '—'}</p></div>
          <div><p className="text-xs text-white/50">Travel Date</p><p className="font-semibold text-sm mt-0.5">{formatDate(booking.leaving_on)}</p></div>
          <div><p className="text-xs text-white/50">Guests</p><p className="font-semibold text-sm mt-0.5">{booking.rooms || 1} room, {booking.adults || 0} adult{(booking.adults||0)!==1?'s':''}</p></div>
          <div><p className="text-xs text-white/50">Submitted</p><p className="font-semibold text-sm mt-0.5">{formatDateTime(booking.held_at)}</p></div>
        </div>
      </div>

      {/* Status Tracker */}
      <BookingStatusTrackerFull
        status={booking.status}
        statusHistory={booking.status_history}
        heldAt={booking.held_at}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Payment Details */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="payment-details">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><CreditCard size={18} /> Payment Details</h2>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'invoice' ? null : 'invoice')}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                  data-testid="payment-invoice-btn"
                >
                  Invoice <ChevronDown size={12} className={`transition-transform ${openDropdown === 'invoice' ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === 'invoice' && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden" data-testid="invoice-dropdown">
                    <button onClick={() => handleDocAction('invoice', 'download')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-testid="invoice-download"><Download size={14} className="text-gray-500" /> Download</button>
                    <button onClick={() => handleDocAction('invoice', 'print')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-testid="invoice-print"><Printer size={14} className="text-gray-500" /> Print</button>
                    <button onClick={() => handleDocAction('invoice', 'email')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-testid="invoice-email"><Mail size={14} className="text-gray-500" /> Email</button>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-5">
              {booking.status === 'held' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5 flex items-start gap-3" data-testid="hold-warning">
                  <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Booking is on Hold</p>
                    <p className="text-xs text-amber-700 mt-0.5">Hold expires on {formatDate(booking.hold_until_date)}. Please complete payment to confirm.</p>
                  </div>
                </div>
              )}

              {/* Top row: Total Net Price (highlighted) + Voucher dropdown */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="bg-blue-50 rounded-md px-5 py-3 flex items-center gap-6 flex-1 max-w-md">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Total Net Price</span>
                  <span className="text-lg font-black text-gray-900">{formatPrice(totalPrice)}</span>
                </div>
                <div className="text-right relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'voucher' ? null : 'voucher')}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1 ml-auto"
                    data-testid="payment-voucher-btn"
                  >
                    Voucher <ChevronDown size={12} className={`transition-transform ${openDropdown === 'voucher' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'voucher' && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden" data-testid="voucher-dropdown">
                      <button onClick={() => handleDocAction('voucher', 'download')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-testid="voucher-download"><Download size={14} className="text-gray-500" /> Download</button>
                      <button onClick={() => handleDocAction('voucher', 'print')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-testid="voucher-print"><Printer size={14} className="text-gray-500" /> Print</button>
                      <button onClick={() => handleDocAction('voucher', 'email')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-testid="voucher-email"><Mail size={14} className="text-gray-500" /> Email</button>
                    </div>
                  )}
                  {booking.last_voucher_sent_at && (
                    <p className="text-[11px] text-gray-400 mt-2">Last voucher mail sent at {formatDateTime(booking.last_voucher_sent_at)}</p>
                  )}
                </div>
              </div>

              {/* Transactions list — 3 column grid layout */}
              {transactions.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {transactions.map((t, i) => (
                    <div key={i} className={`grid grid-cols-3 gap-4 px-5 py-4 items-center ${i < transactions.length - 1 ? 'border-b border-gray-100' : ''}`} data-testid={`txn-row-${i}`}>
                      <div className="text-sm text-gray-700">{formatDateTime(t.date)}</div>
                      <div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold inline-block">{t.status}</span>
                        <div className="flex gap-3 mt-2 text-xs">
                          <button className="text-blue-600 hover:underline italic" data-testid={`print-receipt-${i}`}>Print Receipt</button>
                          <button className="text-blue-600 hover:underline italic" data-testid={`refresh-status-${i}`}>Refresh Status</button>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-green-700">{formatPrice(t.amount)}</span>
                        <span className="text-xs text-gray-600 ml-2">paid on {formatDateTime(t.date)}</span>
                      </div>
                    </div>
                  ))}
                  {/* Footer summary */}
                  <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-stone-100 items-center text-sm">
                    <div></div>
                    <div className="text-right text-gray-700 font-semibold">{isPaid ? 'Payment Received' : 'Payment Pending'}</div>
                    <div className="text-right font-bold text-gray-900">{formatPrice(paidAmount)}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">No transactions yet</div>
              )}

              {!isPaid && (
                <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Outstanding Amount</p>
                    <p className="text-xl font-black text-red-600">{formatPrice(outstanding)}</p>
                  </div>
                  <button
                    onClick={() => onClickPay?.(booking)}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors"
                    data-testid="click-to-pay-btn"
                  >
                    Click to pay
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Attached Trips */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="attached-trips">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><MapPin size={18} /> Attached Trips</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-500">{cities.map(c => c.name || c).join(' → ')} | {(booking.nights || cities.reduce((s, c) => s + (c?.nights ?? 0), 0))} Nights | {booking.rooms || 1} Room, {booking.adults || 0} Adults</p>
            </div>
          </div>

          {/* Flight Cards */}
          {flights.length > 0 && flights.map((flight, fi) => (
            <div key={fi} className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid={`flight-card-${fi}`}>
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><Plane size={18} /> {fi === 0 ? 'Departure Flight' : 'Return Flight'}</h2>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{flight.departure_time || '—'}</p>
                    <p className="text-xs text-gray-500">{flight.from || flight.departure_city}</p>
                  </div>
                  <div className="flex-1 flex items-center">
                    <div className="flex-1 border-t-2 border-dashed border-gray-300 relative">
                      <Plane size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400 bg-white px-1" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{flight.arrival_time || '—'}</p>
                    <p className="text-xs text-gray-500">{flight.to || flight.arrival_city}</p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-4 mt-5 pt-4 border-t border-gray-100 text-sm">
                  <div><p className="text-xs text-gray-500">Airline</p><p className="font-medium">{flight.airline || '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Baggage</p><p className="font-medium">{flight.baggage || '30 Kg'}</p></div>
                  <div><p className="text-xs text-gray-500">Fare Class</p><p className="font-medium">{flight.fare_class || 'Economy'}</p></div>
                  <div><p className="text-xs text-gray-500">Fare Type</p><p className="font-medium">{flight.fare_type || 'Basic'}</p></div>
                  <div><p className="text-xs text-gray-500">PNR</p><p className="font-medium text-[#0066CC]">{flight.pnr || 'Pending'}</p></div>
                </div>
                <div className="mt-3">
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                    {flight.status || 'Blocked'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Hotel Cards */}
          {Object.entries(selectedHotels).map(([key, hotel]) => {
            if (!hotel) return null;
            // key format: "<CityName>_<cityIndex>" e.g. "Tbilisi_0"
            const lastUnderscore = key.lastIndexOf('_');
            const cityName = lastUnderscore > 0 ? key.substring(0, lastUnderscore) : key;
            const cityIdx = lastUnderscore > 0 ? parseInt(key.substring(lastUnderscore + 1), 10) : NaN;
            const matchedCity = !isNaN(cityIdx) ? cities[cityIdx] : cities.find(c => (c?.name || c) === cityName);
            const cityNights = (matchedCity && (matchedCity.nights ?? matchedCity)) || hotel.nights || 0;
            // Compute check-in by walking through cities up to this index
            let priorNights = 0;
            for (let i = 0; i < cityIdx && i < cities.length; i++) {
              priorNights += (cities[i]?.nights ?? 0);
            }
            const computedCheckIn = hotel.check_in || (booking.leaving_on ? new Date(new Date(booking.leaving_on).getTime() + priorNights * 86400000).toISOString() : '');
            const computedCheckOut = hotel.check_out || (computedCheckIn && cityNights ? new Date(new Date(computedCheckIn).getTime() + cityNights * 86400000).toISOString() : '');
            const sel_room = hotel.selected_room || hotel.selectedRoom || {};
            const roomName = hotel.room_type || sel_room.name || sel_room.room_type || 'Standard Room';
            const _ratePlan = sel_room.rate_plan || sel_room.ratePlan || {};
            const mealPlan =
              _ratePlan.meal_plan
              || _ratePlan.mealPlan
              || sel_room.meal_plan
              || sel_room.mealPlan
              || sel_room.meals
              || hotel.meal_plan
              || 'Room Only';
            // Per-service confirmation lookup (new flow stores it on booking.service_confirmations)
            const svcConf = (booking.service_confirmations || {})[`hotel:${key}`] || {};
            const confirmationNumber = svcConf.confirmation_number || hotel.confirmation_code || hotel.confirmation_number || '';
            const confirmationStatus = svcConf.status;
            const hotelImg = (hotel.images && hotel.images[0]) || hotel.image;
            return (
              <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid={`hotel-card-${key}`}>
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2"><Building2 size={18} /> Hotel — {cityName}</h2>
                </div>
                <div className="p-5 flex gap-5">
                  <div className="w-40 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {hotelImg ? (
                      <img src={resolveImageUrl(hotelImg)} alt={hotel.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Building2 size={32} className="text-gray-300" /></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{hotel.name || hotel.hotel_name || '—'}</h3>
                      <div className="flex gap-0.5">{Array.from({length: hotel.stars || hotel.star_rating || 4}).map((_, i) => <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />)}</div>
                    </div>
                    {hotel.address && <p className="text-xs text-gray-500 mt-1">{hotel.address}</p>}
                    <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                      <div><p className="text-xs text-gray-500">Check-in</p><p className="font-medium">{formatDate(computedCheckIn) || '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Check-out</p><p className="font-medium">{formatDate(computedCheckOut) || '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Room Type</p><p className="font-medium">{roomName}</p></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                      <div><p className="text-xs text-gray-500">Meals</p><p className="font-medium">{mealPlan}</p></div>
                      <div><p className="text-xs text-gray-500">Nights</p><p className="font-medium">{cityNights || '—'}</p></div>
                      <div>
                        <p className="text-xs text-gray-500">Confirmation</p>
                        <p className={`font-medium ${confirmationStatus === 'rejected' ? 'text-red-600' : 'text-[#0066CC]'}`}>
                          {confirmationStatus === 'rejected' ? 'Rejected' : (confirmationNumber || 'Pending')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.get(
                              `/bookings/${booking.id}/hotel-voucher-pdf?key=${encodeURIComponent(key)}`,
                              { responseType: 'blob' }
                            );
                            const blobUrl = URL.createObjectURL(
                              new Blob([res.data], { type: 'application/pdf' })
                            );
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = `${booking.booking_ref || 'TBM'}_${cityName}_Hotel_Voucher.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(blobUrl);
                          } catch (err) {
                            console.error('Failed to download hotel voucher:', err);
                            alert('Could not download hotel voucher. Please try again.');
                          }
                        }}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                        data-testid={`download-voucher-${key}`}
                      >
                        <Download size={12} /> Download Voucher
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Day-by-day Itinerary (groups arrival, inter-city, activities, departure in chronological order) */}
          {(() => {
            if (!cities.length) return null;
            const leavingOn = booking.leaving_on || proposal?.leaving_on;
            const interCityTransfers = proposal?.inter_city_transfers || {};
            const arrivalT = proposal?.arrival_transfer;
            const departureT = proposal?.departure_transfer;

            const addDays = (iso, n) => {
              if (!iso) return '';
              const d = new Date(iso);
              if (isNaN(d.getTime())) return '';
              d.setDate(d.getDate() + n);
              return d.toISOString();
            };

            const days = [];
            let dayNum = 0;
            for (let ci = 0; ci < cities.length; ci++) {
              const c = cities[ci];
              const cityName = c?.name || c;
              const nights = (c && typeof c === 'object' && c.nights) || 1;
              for (let n = 0; n < nights; n++) {
                dayNum++;
                const dayDate = addDays(leavingOn, dayNum - 1);
                const items = [];
                // Arrival transfer on day 1
                if (ci === 0 && n === 0 && arrivalT) {
                  items.push({ kind: 'transfer', label: 'Arrival Transfer', data: arrivalT });
                }
                // Inter-city transfer when entering a new city after day 1
                if (n === 0 && ci > 0) {
                  const t = interCityTransfers[`${ci - 1}_${ci}`];
                  if (t) items.push({ kind: 'transfer', label: 'Inter-city Transfer', data: t });
                }
                // Activities for the day
                const acts = selectedActivities[`${cityName}_${dayNum}`];
                if (acts) {
                  const arr = Array.isArray(acts) ? acts : [acts];
                  arr.forEach(a => { if (a) items.push({ kind: 'activity', data: a }); });
                }
                days.push({ num: dayNum, date: dayDate, city: cityName, items });
              }
            }
            // Final departure day (after the last night)
            if (departureT) {
              dayNum++;
              const lastCity = cities[cities.length - 1];
              days.push({
                num: dayNum,
                date: addDays(leavingOn, dayNum - 1),
                city: (lastCity?.name || lastCity || ''),
                items: [{ kind: 'transfer', label: 'Departure Transfer', data: departureT }],
              });
            }

            const renderItem = (it, idx) => {
              const data = it.data || {};
              if (it.kind === 'transfer') {
                const ttype = data.transfer_type || data.type || 'Private';
                const isPrivate = String(ttype).toLowerCase().includes('private');
                return (
                  <div key={idx} className="flex gap-3 items-start py-3 border-b border-gray-100 last:border-b-0">
                    <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Car size={16} className="text-[#002B5B]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-gray-900">{data.title || data.name || it.label}</h4>
                      {(data.from_location || data.to_location) && (
                        <p className="text-xs text-gray-500 mt-0.5">{data.from_location || ''} {data.to_location ? `→ ${data.to_location}` : ''}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {data.duration && (
                          <span className="text-xs text-gray-600 flex items-center gap-1"><Clock size={11} className="text-gray-400" />{data.duration}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${isPrivate ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {isPrivate ? 'Private Transfer' : 'Shared Transfer'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              // activity
              const img = (data.images && data.images[0]) || data.image;
              const incList = Array.isArray(data.inclusions) ? data.inclusions : (data.inclusions ? [data.inclusions] : []);
              return (
                <div key={idx} className="flex gap-3 items-start py-3 border-b border-gray-100 last:border-b-0">
                  <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {img ? (
                      <img src={resolveImageUrl(img)} alt={data.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><MapPin size={20} className="text-gray-300" /></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-gray-900">{data.name || data.title || '—'}</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.duration && (
                        <span className="text-xs text-gray-600 flex items-center gap-1"><Clock size={11} className="text-gray-400" />{data.duration}</span>
                      )}
                      {data.transfer_type && (
                        <span className="text-xs px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full font-semibold">{data.transfer_type}</span>
                      )}
                    </div>
                    {data.description && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{data.description}</p>
                    )}
                    {incList.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {incList.slice(0, 4).map((inc, i) => (
                          <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                            <CheckCircle size={10} className="text-emerald-500 mt-0.5 flex-shrink-0" />{inc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="day-itinerary-section">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2"><MapPin size={18} /> Day-by-Day Itinerary</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {days.map((d) => (
                    <div key={d.num} className="px-6 py-4" data-testid={`day-card-${d.num}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#002B5B] text-white text-xs font-bold px-2.5 py-1 rounded">Day {d.num}</span>
                          <span className="text-sm font-semibold text-gray-700">{formatDate(d.date)}</span>
                        </div>
                        <span className="text-xs text-gray-500">{d.city}</span>
                      </div>
                      {d.items.length === 0 ? (
                        <p className="text-xs text-gray-400 italic ml-1">No activities planned — free day in {d.city}</p>
                      ) : (
                        <div>{d.items.map((it, i) => renderItem(it, i))}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Add-ons: Travel Insurance, Visa, SIM Card */}
          {(() => {
            const hasAddons = proposal?.travel_insurance || proposal?.visa_included || proposal?.sim_card_included;
            if (!hasAddons) return null;
            const addons = [];
            if (proposal.travel_insurance) {
              const persons = proposal.travel_insurance_persons || 1;
              const price = proposal.travel_insurance_price;
              addons.push({
                key: 'insurance',
                title: 'Travel Insurance',
                icon: <Shield size={18} className="text-emerald-600" />,
                meta: `${persons} traveler${persons !== 1 ? 's' : ''}${price ? ` • AED ${price} per person` : ''}`,
              });
            }
            if (proposal.visa_included) {
              const persons = proposal.visa_persons || 1;
              const vd = proposal.visa_details || {};
              const country = vd.country || '';
              const visaType = vd.visa_type || vd.type || 'Tourist Visa';
              const price = vd.price;
              const metaBits = [`${persons} traveler${persons !== 1 ? 's' : ''}${price ? ` • AED ${price} per person` : ''}`];
              if (country) metaBits.push(country);
              addons.push({
                key: 'visa',
                title: visaType,
                icon: <FileText size={18} className="text-blue-600" />,
                meta: metaBits.join(' • '),
              });
            }
            if (proposal.sim_card_included) {
              const persons = proposal.sim_card_persons || 1;
              const sd = proposal.sim_card_details || {};
              const provider = sd.provider || 'Local SIM';
              const planName = sd.plan_name || 'Tourist Data Plan';
              const dataAllowance = sd.data_allowance || '';
              const validity = sd.validity || '';
              const price = sd.price;
              const metaBits = [`${persons} traveler${persons !== 1 ? 's' : ''}${price ? ` • AED ${price} per person` : ''}`];
              if (dataAllowance) metaBits.push(dataAllowance);
              if (validity) metaBits.push(validity);
              addons.push({
                key: 'sim',
                title: `${provider} - ${planName}`,
                icon: <Smartphone size={18} className="text-violet-600" />,
                meta: metaBits.join(' • '),
              });
            }
            return (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="addons-section">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2"><Star size={18} className="text-amber-500" /> Add-on Services</h2>
                </div>
                <div className="p-5 space-y-3">
                  {addons.map(a => (
                    <div key={a.key} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg" data-testid={`addon-${a.key}`}>
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                        {a.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-sm">{a.title}</h3>
                        <p className="text-xs text-gray-600 mt-0.5">{a.meta}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold">Included</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Traveler Details */}
          {(() => {
            const paidStatuses = ['payment_received', 'paid', 'confirmed', 'completed'];
            const isPaid = paidStatuses.includes(booking.status);
            const fieldsLocked = isPaid && !isAdmin;
            const lockedClass = fieldsLocked ? 'opacity-70 cursor-not-allowed bg-gray-50' : '';
            return (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="traveler-details-section">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><Users size={18} /> Traveler Details</h2>
              {fieldsLocked && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full" data-testid="traveler-fields-locked">
                  <Shield size={12} /> Locked — admin only
                </span>
              )}
            </div>
            <div className="px-6 py-5">
              <p className="text-xs text-gray-500 mb-1">Please ensure all traveler information matches passport exactly.</p>
              {fieldsLocked && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4" data-testid="traveler-locked-banner">
                  Payment received. Traveler details are read-only — only an administrator can edit after payment to prevent accidental changes to confirmed bookings.
                </p>
              )}
              {travelers.map((t, idx) => (
                <div key={idx} className="mb-6 pb-6 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0" data-testid={`traveler-form-${idx}`}>
                  <p className="text-sm font-bold text-gray-700 mb-3">Traveler {idx + 1}</p>
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Title</label>
                      <select disabled={fieldsLocked} value={t.title} onChange={e => updateTraveler(idx, 'title', e.target.value)} className={`mt-1 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm ${lockedClass}`}>
                        <option value="">Select</option>
                        <option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Miss">Miss</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">First Name</label>
                      <input disabled={fieldsLocked} type="text" value={t.firstName} onChange={e => updateTraveler(idx, 'firstName', e.target.value)} className={`mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${lockedClass}`} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Last Name</label>
                      <input disabled={fieldsLocked} type="text" value={t.lastName} onChange={e => updateTraveler(idx, 'lastName', e.target.value)} className={`mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${lockedClass}`} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Nationality</label>
                      <input disabled={fieldsLocked} type="text" value={t.nationality} onChange={e => updateTraveler(idx, 'nationality', e.target.value)} className={`mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${lockedClass}`} placeholder="e.g. Indian" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Date of Birth</label>
                      <div className="flex gap-1 mt-1">
                        <select disabled={fieldsLocked} value={t.dobDay} onChange={e => updateTraveler(idx, 'dobDay', e.target.value)} className={`flex-1 border border-gray-300 rounded px-1 py-2 text-sm ${lockedClass}`}><option value="">Day</option>{DAYS.map(d => <option key={d} value={String(d)}>{d}</option>)}</select>
                        <select disabled={fieldsLocked} value={t.dobMonth} onChange={e => updateTraveler(idx, 'dobMonth', e.target.value)} className={`flex-1 border border-gray-300 rounded px-1 py-2 text-sm ${lockedClass}`}><option value="">Mon</option>{MONTHS.map((m,i) => <option key={m} value={String(i+1)}>{m}</option>)}</select>
                        <select disabled={fieldsLocked} value={t.dobYear} onChange={e => updateTraveler(idx, 'dobYear', e.target.value)} className={`flex-1 border border-gray-300 rounded px-1 py-2 text-sm ${lockedClass}`}><option value="">Year</option>{YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}</select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Passport Number</label>
                      <input disabled={fieldsLocked} type="text" value={t.passportNumber} onChange={e => updateTraveler(idx, 'passportNumber', e.target.value)} className={`mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${lockedClass}`} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Passport Expiry</label>
                      <div className="flex gap-1 mt-1">
                        <select disabled={fieldsLocked} value={t.expiryDay} onChange={e => updateTraveler(idx, 'expiryDay', e.target.value)} className={`flex-1 border border-gray-300 rounded px-1 py-2 text-sm ${lockedClass}`}><option value="">Day</option>{DAYS.map(d => <option key={d} value={String(d)}>{d}</option>)}</select>
                        <select disabled={fieldsLocked} value={t.expiryMonth} onChange={e => updateTraveler(idx, 'expiryMonth', e.target.value)} className={`flex-1 border border-gray-300 rounded px-1 py-2 text-sm ${lockedClass}`}><option value="">Mon</option>{MONTHS.map((m,i) => <option key={m} value={String(i+1)}>{m}</option>)}</select>
                        <select disabled={fieldsLocked} value={t.expiryYear} onChange={e => updateTraveler(idx, 'expiryYear', e.target.value)} className={`flex-1 border border-gray-300 rounded px-1 py-2 text-sm ${lockedClass}`}><option value="">Year</option>{EXPIRY_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}</select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Upload Documents</label>
                    <label className={`mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-400 ${fieldsLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'}`}>
                      <Upload size={14} /> Upload passport copy
                      <input type="file" className="hidden" accept="image/*,.pdf" disabled={fieldsLocked} />
                    </label>
                  </div>
                </div>
              ))}
              {!fieldsLocked && (
                <div className="flex justify-end mt-4">
                  <button onClick={saveTravelers} disabled={savingTravelers} className="px-6 py-2.5 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold rounded-lg text-sm disabled:opacity-50" data-testid="save-travelers-btn">
                    {savingTravelers ? 'SAVING...' : 'SAVE TRAVELER INFORMATION'}
                  </button>
                </div>
              )}
            </div>
          </div>
            );
          })()}

          {/* Trip Documents */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="trip-documents-section">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18} /> Trip Documents</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-4 p-4 border border-gray-200 rounded-lg hover:border-[#002B5B] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={22} className="text-[#002B5B]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Itinerary</p>
                    <p className="font-semibold text-sm text-gray-800">{shortRef} - {(booking.customer_name || 'Trip Itinerary').toUpperCase()}</p>
                  </div>
                </div>
                <button
                  onClick={() => onViewItinerary?.(booking)}
                  className="px-4 py-2 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold text-xs rounded-lg uppercase tracking-wider transition-colors flex items-center gap-1.5"
                  data-testid="view-itinerary-btn"
                >
                  <FileText size={12} /> View Itinerary
                </button>
              </div>
            </div>
          </div>

          {/* Terms & Policies - Collapsible */}
          <CollapsibleSection title="Important Notes and Terms" sectionKey="notes" icon={<AlertTriangle size={16} className="text-amber-500" />}>
            <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
              <li>All bookings are subject to availability at the time of confirmation.</li>
              <li>Passport must be valid for at least 6 months from the date of travel.</li>
              <li>Cancellation charges apply as per the policy below.</li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="Terms and Conditions" sectionKey="terms" icon={<FileText size={16} className="text-gray-500" />}>
            {(terms || []).filter(t => t.category === 'terms' || t.title?.includes('Terms')).map((t, i) => (
              <div key={i} className="mb-3">
                <h4 className="font-semibold text-sm text-gray-800">{t.title}</h4>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{t.content}</p>
              </div>
            ))}
            {(terms || []).filter(t => t.category === 'terms' || t.title?.includes('Terms')).length === 0 && (
              <p className="text-sm text-gray-500">Standard terms and conditions apply. Please contact support for full documentation.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Our Scope of Services" sectionKey="scope" icon={<Shield size={16} className="text-blue-500" />}>
            <p className="text-sm text-gray-600">Our services include hotel accommodation, airport transfers, sightseeing tours, and flight bookings as specified in the proposal. Any additional services requested will be quoted separately.</p>
          </CollapsibleSection>

          <CollapsibleSection title="Payment Policies" sectionKey="payment" icon={<CreditCard size={16} className="text-green-600" />}>
            {(terms || []).filter(t => t.category === 'payment' || t.title?.includes('Payment')).map((t, i) => (
              <div key={i} className="mb-3">
                <h4 className="font-semibold text-sm text-gray-800">{t.title}</h4>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{t.content}</p>
              </div>
            ))}
            {(terms || []).filter(t => t.category === 'payment' || t.title?.includes('Payment')).length === 0 && (
              <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                <li>Full payment is required 7 days before the travel date.</li>
                <li>Payments can be made via bank transfer, credit card, or wallet balance.</li>
                <li>All amounts are in AED unless stated otherwise.</li>
              </ul>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Airline Policy" sectionKey="airline" icon={<Plane size={16} className="text-indigo-500" />}>
            <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
              <li>Flight tickets are non-refundable once issued unless specified by the airline.</li>
              <li>Name changes are not permitted after ticketing.</li>
              <li>Baggage allowance as per airline policy.</li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="Hotel and Land Cancellation Policy" sectionKey="cancellation" icon={<Building2 size={16} className="text-red-500" />}>
            {(terms || []).filter(t => t.category === 'cancellation' || t.title?.includes('Cancellation')).map((t, i) => (
              <div key={i} className="mb-3">
                <h4 className="font-semibold text-sm text-gray-800">{t.title}</h4>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{t.content}</p>
              </div>
            ))}
            {(terms || []).filter(t => t.category === 'cancellation' || t.title?.includes('Cancellation')).length === 0 && (
              <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                <li>30+ days before travel: Full refund minus processing fee.</li>
                <li>15-29 days: 50% cancellation charge.</li>
                <li>7-14 days: 75% cancellation charge.</li>
                <li>Less than 7 days: No refund.</li>
              </ul>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Amendment of Booking by Guest" sectionKey="amendment" icon={<FileText size={16} className="text-orange-500" />}>
            <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
              <li>Amendments are subject to availability and may incur additional charges.</li>
              <li>Date changes must be requested at least 14 days before travel.</li>
              <li>Room type upgrades are subject to hotel availability.</li>
            </ul>
          </CollapsibleSection>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Seller Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-5" data-testid="seller-details">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Seller Details</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#002B5B] rounded-full flex items-center justify-center text-white font-bold text-sm">T</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{user?.company_name || 'Travo Tours'}</p>
                  <p className="text-xs text-gray-500">{user?.name || 'Travel Agent'}</p>
                </div>
              </div>
              {user?.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail size={14} className="text-gray-400" />{user.email}</div>}
              {user?.mobile && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={14} className="text-gray-400" />{user.mobile}</div>}
            </div>
            <button onClick={() => setShowChangeRequestModal(true)} className="w-full mt-4 py-2.5 border-2 border-dashed border-[#002B5B] text-[#002B5B] font-bold text-xs rounded-lg hover:bg-[#002B5B]/5 transition-colors uppercase tracking-wider" data-testid="add-change-request-btn">
              Add Trip Change Request
            </button>
          </div>

          {/* Trip Tasks (change requests list) */}
          <TripTasksCard tasks={tripTasks} onOpenDetails={setActiveTask} />

          {/* Destination Expert */}
          {expert && (
            <div className="bg-white border border-gray-200 rounded-xl p-5" data-testid="booking-expert-card">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Destination Expert</p>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {expert.photo ? <img src={resolveImageUrl(expert.photo)} alt={expert.name} className="w-full h-full object-cover" /> : <User size={22} className="text-gray-400" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">{expert.name}</p>
                  {expert.location && <p className="text-xs text-gray-500 mt-0.5">{expert.location}</p>}
                  {expert.phone && <p className="text-xs text-gray-500">{expert.phone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Quick Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-5" data-testid="quick-summary">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Booking Summary</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="font-medium">{shortRef}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Destinations</span><span className="font-medium">{cities.map(c => c.name || c).join(', ')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Travel Date</span><span className="font-medium">{formatDate(booking.leaving_on)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium">{(booking.nights || cities.reduce((s, c) => s + (c?.nights ?? 0), 0))} Nights</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Hold Until</span><span className="font-medium text-amber-600">{formatDate(booking.hold_until_date)}</span></div>
              <div className="flex justify-between pt-3 border-t border-gray-100"><span className="text-gray-800 font-bold">Total</span><span className="font-black text-gray-900">{formatPrice(totalPrice)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Change Request Modal */}
      <TripChangeRequestModal
        open={showChangeRequestModal}
        onClose={() => setShowChangeRequestModal(false)}
        bookingId={booking.id}
        onSubmitted={() => {
          setEmailToast('Change request submitted to your travel advisor ✓');
          setTimeout(() => setEmailToast(''), 3500);
          fetchTripTasks();
        }}
      />

      {/* Trip Task Details Modal */}
      <TripTaskDetailsModal
        open={!!activeTask}
        onClose={() => setActiveTask(null)}
        request={activeTask}
        currentUser={user}
        onUpdated={(updated) => {
          if (updated) {
            setTripTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
            setActiveTask(updated);
          }
        }}
      />
    </div>
  );
}

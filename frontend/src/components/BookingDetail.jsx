import React, { useState, useEffect, useCallback } from 'react';
import { api, resolveImageUrl } from '@/App';
import { BookingStatusTrackerFull } from './BookingStatusTracker';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '@/CurrencyContext';
import {
  ArrowLeft, Calendar, Users, MapPin, Phone, Mail, Clock, Star,
  Download, Upload, ChevronDown, ChevronUp, Plane, Building2, Car,
  Shield, FileText, AlertTriangle, CreditCard, CheckCircle, User, Bed
} from 'lucide-react';

export default function BookingDetail({ bookingId, onBack, onViewProposal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [travelers, setTravelers] = useState([]);
  const [savingTravelers, setSavingTravelers] = useState(false);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS = Array.from({length: 31}, (_, i) => i + 1);
  const YEARS = Array.from({length: 80}, (_, i) => new Date().getFullYear() - i);
  const EXPIRY_YEARS = Array.from({length: 11}, (_, i) => new Date().getFullYear() + i);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/held-bookings/${bookingId}`);
      setData(res.data);
      const adults = res.data.booking?.adults || 1;
      const existing = res.data.booking?.travelers || [];
      const t = [];
      for (let i = 0; i < adults; i++) {
        t.push(existing[i] || { title: '', firstName: '', lastName: '', dobDay: '', dobMonth: '', dobYear: '', passportNumber: '', expiryDay: '', expiryMonth: '', expiryYear: '', nationality: '' });
      }
      setTravelers(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [bookingId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

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
  const shortRef = 'ORN' + (booking.id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  const totalPrice = Number(booking.total_price || 0);
  const paidAmount = 0;
  const outstanding = totalPrice - paidAmount;

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
    <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8" data-testid="booking-detail-page">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 md:mb-6" data-testid="back-to-bookings">
        <ArrowLeft size={16} /> Back to My Bookings
      </button>

      {/* Page Title */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <h1 className="text-xl font-black text-[#002B5B]">
          {booking.status === 'ticketed' ? 'Booking Complete' :
           booking.status === 'confirmed' ? 'Booking Confirmed' :
           'Please complete payment'}
        </h1>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          booking.status === 'held' ? 'bg-amber-100 text-amber-800' :
          booking.status === 'payment_pending' ? 'bg-orange-100 text-orange-800' :
          booking.status === 'payment_received' ? 'bg-teal-100 text-teal-800' :
          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
          booking.status === 'ticketed' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`} data-testid="booking-page-status">{STAGE_LABELS[booking.status] || booking.status}</span>
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
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><CreditCard size={18} /> Payment Details</h2>
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
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Total Net Price</span>
                <span className="font-bold text-gray-900">{formatPrice(totalPrice)}</span>              </div>
              <div className="mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Amount</th>
                      <th className="text-right py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50">
                      <td className="py-3 text-gray-600">{formatDate(booking.held_at)}</td>
                      <td className="py-3 text-gray-700">Booking Hold</td>
                      <td className="py-3 text-right text-gray-800">{formatPrice(totalPrice)}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">Pending</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Outstanding Amount</p>
                  <p className="text-xl font-black text-red-600">{formatPrice(outstanding)}</p>
                </div>
                <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors" data-testid="click-to-pay-btn">
                  Click to pay
                </button>
              </div>
            </div>
          </div>

          {/* Attached Trips */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="attached-trips">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><MapPin size={18} /> Attached Trips</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-500">{cities.map(c => c.name || c).join(' → ')} | {booking.nights || 0} Nights | {booking.rooms || 1} Room, {booking.adults || 0} Adults</p>
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
            const cityName = key.split('_')[0];
            return (
              <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid={`hotel-card-${key}`}>
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2"><Building2 size={18} /> Hotel — {cityName}</h2>
                </div>
                <div className="p-5 flex gap-5">
                  <div className="w-40 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {hotel.image ? (
                      <img src={resolveImageUrl(hotel.image)} alt={hotel.name} className="w-full h-full object-cover" />
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
                      <div><p className="text-xs text-gray-500">Check-in</p><p className="font-medium">{formatDate(hotel.check_in || booking.leaving_on)}</p></div>
                      <div><p className="text-xs text-gray-500">Check-out</p><p className="font-medium">{formatDate(hotel.check_out)}</p></div>
                      <div><p className="text-xs text-gray-500">Room Type</p><p className="font-medium">{hotel.room_type || hotel.selected_room?.name || '—'}</p></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                      <div><p className="text-xs text-gray-500">Meals</p><p className="font-medium">{hotel.meal_plan || hotel.selected_room?.meal_plan || 'Room Only'}</p></div>
                      <div><p className="text-xs text-gray-500">Nights</p><p className="font-medium">{hotel.nights || '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Confirmation</p><p className="font-medium text-[#0066CC]">{hotel.confirmation_code || 'Pending'}</p></div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <button className="px-3 py-1 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1" data-testid={`download-voucher-${key}`}>
                        <Download size={12} /> Download Voucher
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Inclusions */}
          {proposal?.inter_city_transfers && Object.keys(proposal.inter_city_transfers).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="inclusions-section">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><Car size={18} /> Inclusions</h2>
              </div>
              <div className="px-6 py-4">
                <ul className="space-y-2 text-sm text-gray-700">
                  {Object.entries(proposal.inter_city_transfers).map(([key, transfer]) => (
                    <li key={key} className="flex items-center gap-2">
                      <Car size={14} className="text-gray-400" />
                      {transfer.name || `Transfer: ${key}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Traveler Details */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="traveler-details-section">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2"><Users size={18} /> Traveler Details</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs text-gray-500 mb-5">Please ensure all traveler information matches passport exactly.</p>
              {travelers.map((t, idx) => (
                <div key={idx} className="mb-6 pb-6 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0" data-testid={`traveler-form-${idx}`}>
                  <p className="text-sm font-bold text-gray-700 mb-3">Traveler {idx + 1}</p>
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Title</label>
                      <select value={t.title} onChange={e => updateTraveler(idx, 'title', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm">
                        <option value="">Select</option>
                        <option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Miss">Miss</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">First Name</label>
                      <input type="text" value={t.firstName} onChange={e => updateTraveler(idx, 'firstName', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Last Name</label>
                      <input type="text" value={t.lastName} onChange={e => updateTraveler(idx, 'lastName', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Nationality</label>
                      <input type="text" value={t.nationality} onChange={e => updateTraveler(idx, 'nationality', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Indian" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Date of Birth</label>
                      <div className="flex gap-1 mt-1">
                        <select value={t.dobDay} onChange={e => updateTraveler(idx, 'dobDay', e.target.value)} className="flex-1 border border-gray-300 rounded px-1 py-2 text-sm"><option value="">Day</option>{DAYS.map(d => <option key={d} value={String(d)}>{d}</option>)}</select>
                        <select value={t.dobMonth} onChange={e => updateTraveler(idx, 'dobMonth', e.target.value)} className="flex-1 border border-gray-300 rounded px-1 py-2 text-sm"><option value="">Mon</option>{MONTHS.map((m,i) => <option key={m} value={String(i+1)}>{m}</option>)}</select>
                        <select value={t.dobYear} onChange={e => updateTraveler(idx, 'dobYear', e.target.value)} className="flex-1 border border-gray-300 rounded px-1 py-2 text-sm"><option value="">Year</option>{YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}</select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Passport Number</label>
                      <input type="text" value={t.passportNumber} onChange={e => updateTraveler(idx, 'passportNumber', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Passport Expiry</label>
                      <div className="flex gap-1 mt-1">
                        <select value={t.expiryDay} onChange={e => updateTraveler(idx, 'expiryDay', e.target.value)} className="flex-1 border border-gray-300 rounded px-1 py-2 text-sm"><option value="">Day</option>{DAYS.map(d => <option key={d} value={String(d)}>{d}</option>)}</select>
                        <select value={t.expiryMonth} onChange={e => updateTraveler(idx, 'expiryMonth', e.target.value)} className="flex-1 border border-gray-300 rounded px-1 py-2 text-sm"><option value="">Mon</option>{MONTHS.map((m,i) => <option key={m} value={String(i+1)}>{m}</option>)}</select>
                        <select value={t.expiryYear} onChange={e => updateTraveler(idx, 'expiryYear', e.target.value)} className="flex-1 border border-gray-300 rounded px-1 py-2 text-sm"><option value="">Year</option>{EXPIRY_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}</select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Upload Documents</label>
                    <label className="mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-400">
                      <Upload size={14} /> Upload passport copy
                      <input type="file" className="hidden" accept="image/*,.pdf" />
                    </label>
                  </div>
                </div>
              ))}
              <div className="flex justify-end mt-4">
                <button onClick={saveTravelers} disabled={savingTravelers} className="px-6 py-2.5 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold rounded-lg text-sm disabled:opacity-50" data-testid="save-travelers-btn">
                  {savingTravelers ? 'SAVING...' : 'SAVE TRAVELER INFORMATION'}
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
            <button className="w-full mt-4 py-2.5 border-2 border-dashed border-[#002B5B] text-[#002B5B] font-bold text-xs rounded-lg hover:bg-[#002B5B]/5 transition-colors uppercase tracking-wider" data-testid="add-change-request-btn">
              Add Trip Change Request
            </button>
          </div>

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
              <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium">{booking.nights || 0} Nights</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Hold Until</span><span className="font-medium text-amber-600">{formatDate(booking.hold_until_date)}</span></div>
              <div className="flex justify-between pt-3 border-t border-gray-100"><span className="text-gray-800 font-bold">Total</span><span className="font-black text-gray-900">{formatPrice(totalPrice)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Users, DollarSign, CreditCard, HelpCircle,
  Edit2, X, Check, CheckCircle, Download, Mail, MessageCircle, 
  Eye, ChevronDown, Loader2, MoreVertical, Bed
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';
import { formatDate, addDays } from './helpers';
import SendEmailModal from './SendEmailModal';
import WhatsAppShareModal from './WhatsAppShareModal';

export default 
function PriceSidebar({ proposal, onBookNow, onEditProposal, onUpdateProposal, onAcceptProposal, acceptModal, onNeedHelp, onHoldBooking, onViewBooking }) {
  const [showMarkupModal, setShowMarkupModal] = useState(false);
  const [markupLandValue, setMarkupLandValue] = useState(proposal.markup_value || 0);
  const [discountValue, setDiscountValue] = useState(proposal.discount_amount || 0);
  const [updating, setUpdating] = useState(false);
  const [showNetPrice, setShowNetPrice] = useState(true);
  const [showBookingTerms, setShowBookingTerms] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [holdingBooking, setHoldingBooking] = useState(false);

  const adultsCount = proposal.room_data?.reduce((acc, r) => acc + (r.adults || 0), 0) || 2;
  const childrenCount = proposal.room_data?.reduce((acc, r) => acc + (r.children?.length || 0), 0) || 0;
  const roomsCount = proposal.room_data?.length || 1;
  const totalPax = adultsCount + childrenCount;
  
  // Get vehicle type based on passengers
  const getVehicleTypeForPax = (pax) => {
    if (pax <= 4) return { key: 'sedan_4', label: '4 Seater Sedan', icon: '🚗' };
    if (pax <= 7) return { key: 'car_7', label: '7 Seater Minivan', icon: '🚙' };
    if (pax <= 8) return { key: 'van_8', label: '8 Seater Van', icon: '🚐' };
    if (pax <= 17) return { key: 'van_17', label: '17 Seater Van', icon: '🚐' };
    if (pax <= 29) return { key: 'bus_29', label: '29 Seater Bus', icon: '🚌' };
    if (pax <= 45) return { key: 'bus_45', label: '45 Seater Bus', icon: '🚌' };
    return { key: 'bus_55', label: '55 Seater Bus', icon: '🚌' };
  };
  
  const vehicleType = proposal.vehicle_label 
    ? { label: proposal.vehicle_label, icon: proposal.vehicle_type?.includes('sedan') ? '🚗' : proposal.vehicle_type?.includes('car') ? '🚙' : proposal.vehicle_type?.includes('bus') ? '🚌' : '🚐' }
    : getVehicleTypeForPax(totalPax);
  
  // Calculate pricing — discount is now an independent reduction (was
  // previously capped at markup, which silently zeroed the discount when
  // markup=0). Agent is responsible for not pricing below cost.
  const basePrice = proposal.total_price || 0;
  const markupLand = proposal.markup_land || 0;
  const discountAmount = proposal.discount_amount || 0;
  const couponCode = proposal.coupon_code || '';
  const totalPrice = basePrice;
  const priceAfterDiscount = totalPrice + markupLand - discountAmount;
  const pricePerAdult = Math.round(priceAfterDiscount / adultsCount);
  const netPrice = totalPrice;
  
  // Estimated booking date (7 days from now or from proposal)
  const estimatedBookingDate = proposal.estimated_booking_date 
    ? new Date(proposal.estimated_booking_date) 
    : addDays(new Date(), 7);
  
  // Extract departure city from leaving_from
  const departureCity = proposal.leaving_from?.split(' ')[0] || 'Dubai';

  // Locked view — once the trip has been held or booked, the sidebar becomes
  // a simple, read-only summary matching the user-supplied reference design.
  const [resolvedBookingRef, setResolvedBookingRef] = useState(null);

  const bookingRef = proposal.booking_ref
    || (proposal.booking_number != null ? `TBM-${String(proposal.booking_number).padStart(6, '0')}` : null)
    || resolvedBookingRef;
  const isLocked = Boolean(proposal.booking_id || bookingRef)
    || ['held', 'booked', 'confirmed', 'cancelled'].includes(proposal.status);

  // Fallback: if the proposal came with a booking_id but no ref (stale cache /
  // legacy row), fetch the booking to resolve its TBM ref. Runs once per id.
  useEffect(() => {
    if (!isLocked) return;
    if (bookingRef) return;
    const bid = proposal.booking_id;
    if (!bid) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/bookings/${bid}`);
        const b = res.data || {};
        const ref = b.booking_ref
          || (b.booking_number != null ? `TBM-${String(b.booking_number).padStart(6, '0')}` : null);
        if (!cancelled && ref) setResolvedBookingRef(ref);
      } catch {
        // silent — the sidebar will fall back to "TBM-—" placeholder
      }
    })();
    return () => { cancelled = true; };
  }, [proposal.booking_id, isLocked, bookingRef]);

  if (isLocked) {
    return (
      <div className="bg-[#FFFBEB] rounded-lg border border-[#F5E6B3] sticky top-20" data-testid="price-sidebar-locked">
        <div className="p-5">
          {/* Estimated Date of Booking */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E8D9A0]">
            <span className="text-gray-600 text-sm">Estimated Date of Booking</span>
            <span className="font-bold text-gray-800">{formatDate(estimatedBookingDate, 'day')}</span>
          </div>

          {/* Price Breakdown — read-only */}
          <div className="pt-4">
            <h3 className="font-bold text-lg text-gray-800 mb-3">Price Breakdown</h3>

            <div className="text-sm text-gray-600 space-y-0.5 mb-5">
              <p>{roomsCount} room{roomsCount !== 1 ? 's' : ''}, {adultsCount} adult{adultsCount !== 1 ? 's' : ''}{childrenCount > 0 ? `, ${childrenCount} child${childrenCount !== 1 ? 'ren' : ''}` : ''}</p>
              <p>Nationality: {proposal.nationality || 'India'}</p>
              <p>Departure City: {departureCity}</p>
            </div>

            <div className="space-y-3 text-sm border-t border-[#E8D9A0] pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Price per adult</span>
                <span className="text-gray-800 font-medium">AED {pricePerAdult.toLocaleString()}</span>
              </div>

              <div className="pt-3 border-t border-[#E8D9A0]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-[#0094D4]" />
                    <span className="text-gray-700 font-medium">Total Price</span>
                  </div>
                  <span className="text-2xl font-black text-gray-900">AED {priceAfterDiscount.toLocaleString()}</span>
                </div>
                <p className="text-gray-400 text-[11px] uppercase tracking-wider text-right mt-1">INCLUDING ALL TAXES</p>
              </div>

              <div className="flex justify-between pt-3 border-t border-[#E8D9A0]">
                <span className="text-gray-600">Net Price</span>
                <span className="text-gray-800 font-medium">AED {netPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Booking Details CTA — flips to red CANCELLED state when the trip is cancelled */}
            {proposal.status === 'cancelled' ? (
              <button
                onClick={() => onViewBooking?.(proposal.booking_id)}
                disabled={!proposal.booking_id}
                className="w-full mt-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed tracking-wide flex items-center justify-center gap-2"
                data-testid="booking-details-btn"
              >
                <X size={16} /> {bookingRef || 'TBM-—'} — CANCELLED
              </button>
            ) : (
              <button
                onClick={() => onViewBooking?.(proposal.booking_id)}
                disabled={!proposal.booking_id}
                className="w-full mt-5 py-3 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
                data-testid="booking-details-btn"
              >
                {bookingRef || 'TBM-—'} — BOOKING DETAILS
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFBEB] rounded-lg border border-[#F5E6B3] sticky top-20">
      <div className="p-5">
        {/* Estimated Date of Booking */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8D9A0]">
          <span className="text-gray-600 text-sm">Estimated Date of Booking</span>
          <span className="font-bold text-gray-800">{formatDate(estimatedBookingDate, 'day')}</span>
        </div>

        {/* Price Breakdown */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg text-gray-800">Price Breakdown</h3>
            <button onClick={onEditProposal} className="text-blue-600 text-sm hover:underline font-medium" data-testid="edit-proposal-btn">Edit</button>
          </div>
          
          <div className="text-sm text-gray-600 space-y-0.5 mb-3">
            <p>{roomsCount} room, {adultsCount} adults{childrenCount > 0 ? `, ${childrenCount} children` : ''}</p>
            <p>Nationality: {proposal.nationality || 'India'}</p>
            <p>Departure City: {departureCity}</p>
          </div>
          
          <button 
            onClick={() => { setMarkupLandValue(proposal.markup_value || 0); setDiscountValue(proposal.discount_amount || 0); setShowMarkupModal(true); }}
            className="text-blue-600 text-sm hover:underline mb-4 block"
            data-testid="update-markup-btn"
          >
            Update Markup / Discount
          </button>

          {/* Markup/Discount Modal */}
          {showMarkupModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMarkupModal(false)} />
              <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl" data-testid="markup-discount-modal">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">Update Markup / Discount</h2>
                  <button onClick={() => setShowMarkupModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500">
                    <X size={16} />
                  </button>
                </div>

                {/* Form */}
                <div className="px-6 py-6">
                  <fieldset className="border border-gray-200 rounded-lg p-5">
                    <legend className="text-sm font-bold text-gray-800 px-2">Markup</legend>
                    
                    <div className="mb-5">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Land</label>
                      <input
                        type="number"
                        step="0.01"
                        value={markupLandValue}
                        onChange={(e) => setMarkupLandValue(parseFloat(e.target.value) || 0)}
                        className="w-full max-w-[240px] px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                        data-testid="markup-land-input"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Discount Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                        className="w-full max-w-[240px] px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                        data-testid="discount-amount-input"
                      />
                      <p className="text-xs text-gray-400 mt-2 max-w-[240px]">Discount is applied directly to the final price. Make sure it stays within your cost margin.</p>
                    </div>
                  </fieldset>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={async () => {
                      setUpdating(true);
                      try {
                        await api.patch(`/proposals/${proposal.id}`, {
                          markup_value: markupLandValue,
                          markup_land: markupLandValue,
                          discount_amount: discountValue,
                          pricing_breakdown: {
                            ...proposal.pricing_breakdown,
                            markup: markupLandValue,
                            discount: discountValue
                          }
                        });
                        onUpdateProposal?.();
                        setShowMarkupModal(false);
                      } catch (e) {
                        console.error('Failed to update markup/discount', e);
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    disabled={updating}
                    className="px-6 py-2.5 bg-[#002B5B] text-white text-sm font-bold rounded-lg hover:bg-[#003d82] transition-colors disabled:opacity-50"
                    data-testid="update-markup-submit"
                  >
                    {updating ? 'UPDATING...' : 'UPDATE'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Price Lines */}
          <div className="space-y-3 text-sm border-t border-[#E8D9A0] pt-4">
            {showNetPrice && (
            <>
            <div className="flex justify-between">
              <span className="text-gray-600">Price per adult</span>
              <span className="text-gray-800 font-medium">AED {pricePerAdult.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Price</span>
              <span className="text-gray-800 font-medium">AED {totalPrice.toLocaleString()}</span>
            </div>

            {/* Markup */}
            {markupLand > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Markup</span>
                <span className="text-gray-800 font-medium">AED +{markupLand.toLocaleString()}</span>
              </div>
            )}

            {/* Coupon / Manual Discount */}
            {discountAmount > 0 && (
              <div className="pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{couponCode ? 'Coupon Discount' : 'Discount'}</span>
                  <span className="text-gray-800">AED -{discountAmount.toLocaleString()}</span>
                </div>
                {couponCode && (
                  <p className="text-gray-400 text-xs mt-1">{couponCode} Coupon Applied</p>
                )}
              </div>
            )}
            </>
            )}

            {/* Price after discount */}
            <div className="pt-3 border-t border-[#E8D9A0]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Price after discount</span>
                  <Eye size={14} className="text-blue-500 cursor-pointer" onClick={() => setShowNetPrice(!showNetPrice)} data-testid="toggle-net-price" />
                </div>
                <span className="text-2xl font-bold text-gray-800">AED {priceAfterDiscount.toLocaleString()}</span>
              </div>
              <p className="text-gray-400 text-xs text-right">INCLUDING ALL TAXES</p>
            </div>

            {/* Net Price */}
            {showNetPrice && (
            <div className="flex justify-between pt-2 border-t border-[#E8D9A0]">
              <span className="text-gray-600">Net Price</span>
              <span className="text-gray-800 font-medium">AED {netPrice.toLocaleString()}</span>
            </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mt-6">
          {proposal.status !== 'held' && (() => {
            const d = new Date(proposal.leaving_on);
            d.setDate(d.getDate() - 21);
            const diffDays = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
            return diffDays >= 7;
          })() && (
            <button 
              onClick={async () => {
                setHoldingBooking(true);
                try {
                  const d = new Date(proposal.leaving_on);
                  d.setDate(d.getDate() - 21);
                  const holdDate = d.toISOString().split('T')[0];
                  await onHoldBooking?.(holdDate);
                } catch (e) { console.error(e); }
                setHoldingBooking(false);
              }}
              disabled={holdingBooking}
              className="w-full py-3 bg-[#B5651D] hover:bg-[#9A5316] text-white font-semibold rounded-lg transition-colors"
              data-testid="hold-booking-btn"
            >
              {holdingBooking ? 'HOLDING...' : `HOLD BOOKING UNTIL ${(() => {
                try {
                  const d = new Date(proposal.leaving_on);
                  d.setDate(d.getDate() - 21);
                  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Asia/Dubai' }).toUpperCase();
                } catch { return 'N/A'; }
              })()}`}
            </button>
          )}

          {/* Booking Terms Modal */}
          {showBookingTerms && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBookingTerms(false)} />
              <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col" data-testid="booking-terms-modal">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 flex-shrink-0">
                  <h2 className="text-lg font-bold text-gray-900 pr-4">Please make sure you explain to the guest following points before booking</h2>
                  <button onClick={() => setShowBookingTerms(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex-shrink-0">
                    <X size={16} />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                  {/* Hotel Warning */}
                  {proposal.cities?.length > 0 && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800">
                      Selected hotel in {proposal.cities.map((c, i) => {
                        const hotel = proposal.selected_hotels?.[`${c.name}_${i}`];
                        const stars = hotel?.star_rating || hotel?.stars || '';
                        return `${c.name}${stars ? ` (${stars} Star)` : ''}`;
                      }).join(', ')} offer inconsistent experience to customer.
                    </div>
                  )}

                  {/* General */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">General</h3>
                    <ol className="list-decimal list-outside ml-5 space-y-2 text-sm text-gray-700">
                      <li>Any ticket to attractions, museums, train, cable car, ferries, rides, safari, etc. are not included unless explicitly mentioned as an inclusion.</li>
                      <li>For queries regarding cancellations and refunds, please refer to our Cancellation Policy.</li>
                      <li>We reserve the right to issue a full refund in case we believe we are unable to fulfil the services for any technical reasons.</li>
                      <li>Please make sure that the passport of all guests travelling is valid for at least 6 months from the date of travel.</li>
                      <li>We can only facilitate the visa application for the travelling passengers. Granting of visa is solely at the discretion of Embassy. If visa is rejected or delayed by the Embassy for any reason then we are not liable to give any refund and respective cancellation policies will apply.</li>
                    </ol>
                  </div>

                  {/* Hotel */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Hotel</h3>
                    <ol className="list-decimal list-outside ml-5 space-y-2 text-sm text-gray-700">
                      <li>At the time of check-in to your hotel, hotel may ask you to make an advance/security deposit (amount depends upon hotel policy). This amount is refunded at the time of check-out, minus the cost of any items taken from the mini-bar or other charges (like late check-out or any damages done to the accommodation).</li>
                    </ol>
                  </div>

                  {/* Tours and Transfers */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Tours and Transfers</h3>
                    <ol className="list-decimal list-outside ml-5 space-y-2 text-sm text-gray-700">
                      <li>The cost and ticket issued for various attractions with regards to any children travelling are based on the age provided at the time of creating the package quote. If the service provider decide to charge extra cost based on the height of the children or wrong information as per Passport, then the cost has to be borne by the customer on site.</li>
                    </ol>
                  </div>

                  {/* Europe Section */}
                  <div className="bg-gray-50 border-l-4 border-gray-300 px-4 py-2">
                    <h3 className="font-bold text-gray-900">Europe</h3>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">General</h3>
                    <ol className="list-decimal list-outside ml-5 space-y-2 text-sm text-gray-700">
                      <li>Please make sure to download the telegram app before your travel starts, where driver details for all tours and transfers shall be shared.</li>
                      <li>The driver details for private airport transfers or train station transfers or tours shall be shared within 24 hours of scheduled time only on the telegram app.</li>
                      <li>On arrival in case you cannot locate your driver please call the service provider and give your complete name and confirmation number for them to guide you.</li>
                      <li>In case of any emergency or issue during the trip, please contact us immediately on the provided emergency number.</li>
                    </ol>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
                  <button
                    onClick={() => { setShowBookingTerms(false); onBookNow?.(); }}
                    className="px-6 py-2.5 bg-[#002B5B] text-white text-sm font-bold rounded-lg hover:bg-[#003d82] transition-colors"
                    data-testid="continue-to-book-btn"
                  >
                    I Understand, Continue to Book
                  </button>
                </div>
              </div>
            </div>
          )}

          {(proposal.status === 'accepted' || acceptModal?.holdUntil) ? (
            <div className="w-full py-2.5 bg-green-100 text-green-800 font-semibold rounded-lg text-center text-sm" data-testid="accepted-badge">
              Accepted on {(() => {
                const ts = acceptModal?.acceptedAt || proposal.accepted_at;
                if (!ts) return '—';
                const d = new Date(ts);
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'Asia/Dubai' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Dubai' });
              })()}
            </div>
          ) : (
            <button 
              className="w-full py-3 bg-[#8B4513] hover:bg-[#723A0F] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              data-testid="accept-proposal-btn"
              onClick={onAcceptProposal}
              disabled={acceptModal?.loading}
            >
              {acceptModal?.loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {acceptModal?.loading ? 'ACCEPTING...' : 'ACCEPT PROPOSAL'}
            </button>
          )}
          
          <button 
            className="w-full py-3 bg-[#D946EF] hover:bg-[#C026D3] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            data-testid="need-help-btn"
            onClick={onNeedHelp}
          >
            <HelpCircle size={18} />
            NEED HELP
          </button>

          {/* Mail and WhatsApp buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex-1 py-2.5 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              data-testid="mail-btn"
            >
              <Mail size={16} />
              MAIL
            </button>
            <button
              onClick={() => setShowWhatsappModal(true)}
              className="flex-1 py-2.5 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              data-testid="whatsapp-btn"
            >
              <MessageCircle size={16} />
              WHATSAPP
            </button>
          </div>
        </div>

        {/* Payment Schedule */}
        <div className="mt-5 bg-white border border-[#E8D9A0] rounded-lg p-4">
          <p className="text-amber-700 font-medium text-sm text-center mb-2">Payment Schedule</p>
          <div className="bg-[#FFFBEB] border border-[#E8D9A0] rounded py-2 px-3 text-center">
            <span className="text-sm text-gray-600">AED {totalPrice.toLocaleString()} due on {formatDate(addDays(proposal.leaving_on, -7), 'day')}</span>
          </div>
        </div>
      </div>

      {/* Send Proposal Email Modal */}
      {showEmailModal && (
        <SendEmailModal
          proposal={proposal}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {/* WhatsApp Share Modal */}
      {showWhatsappModal && (
        <WhatsAppShareModal
          proposal={proposal}
          onClose={() => setShowWhatsappModal(false)}
        />
      )}
    </div>
  );
}

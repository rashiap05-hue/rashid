import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Users, Clock, Star, Hotel, Plane, Car, 
  ChevronDown, ChevronUp, Check, X, AlertTriangle, Play,
  Download, Mail, MessageCircle, DollarSign, CreditCard, HelpCircle,
  Coffee, Utensils, Sun, Moon, Plus, Edit2, Trash2, Bed, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

// Day Itinerary Card Component
function DayItineraryCard({ day, date, cityName, activities, transfers, hotel, meals, isArrival, isDeparture }) {
  const [expanded, setExpanded] = useState(true);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      {/* Day Header */}
      <div 
        className="bg-[#002B5B] text-white px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
            {day}
          </div>
          <div>
            <span className="font-medium">{formatDate(date)}</span>
            <span className="mx-2">-</span>
            <span>
              {isArrival ? 'Arrival at ' : isDeparture ? 'Departure from ' : ''}
              {cityName}
              {!isArrival && !isDeparture && ' - Day at leisure'}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {/* Day Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white"
          >
            {/* Missing Info Alert */}
            {(isArrival || isDeparture) && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle size={18} />
                  <span className="font-medium">
                    {isArrival ? 'Arrival' : 'Departure'} information is missing.
                  </span>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="p-4 border-b border-gray-100">
              <p className="text-gray-600 text-sm">
                {isArrival 
                  ? `Welcome to ${cityName}! Upon arrival, you will be transferred to your hotel.`
                  : isDeparture 
                  ? `Check out from your hotel and transfer to the airport for your departure.`
                  : `Enjoy a free day to explore ${cityName} at your leisure.`
                }
              </p>
            </div>

            {/* Transfers */}
            {transfers && transfers.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <h4 className="font-medium text-gray-700 mb-3">Transfers</h4>
                {transfers.map((transfer, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Car className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{transfer.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {transfer.type || 'Private Transfers'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 text-red-500 hover:bg-red-50 rounded">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Activities */}
            {activities && activities.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <h4 className="font-medium text-gray-700 mb-3">Activities</h4>
                {activities.map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-2">
                    <div className="flex items-center gap-3">
                      <img 
                        src={activity.images?.[0] || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=100'}
                        alt={activity.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{activity.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">
                            {activity.category}
                          </span>
                          <span className="text-xs text-gray-500">{activity.duration}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-600">AED {activity.price}</span>
                      <button className="p-2 text-red-500 hover:bg-red-50 rounded">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Meals */}
            <div className="p-4 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-4">
                {['Breakfast', 'Lunch', 'Dinner'].map((meal) => {
                  const included = meals?.includes(meal.toLowerCase());
                  return (
                    <div key={meal} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {meal === 'Breakfast' ? <Coffee size={16} className="text-gray-400" /> :
                         meal === 'Lunch' ? <Sun size={16} className="text-gray-400" /> :
                         <Moon size={16} className="text-gray-400" />}
                        <span className="text-sm text-gray-600">{meal}:</span>
                        <span className={cn("text-sm font-medium", included ? "text-green-600" : "text-red-500")}>
                          {included ? 'Included' : 'Not Included'}
                        </span>
                      </div>
                      {!included && (
                        <button className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <Plus size={12} />
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accommodation */}
            {hotel && !isDeparture && (
              <div className="p-4 bg-gray-50">
                <div className="flex items-center gap-2 text-gray-700">
                  <Bed size={18} className="text-[#002B5B]" />
                  <span>Overnight stay at <strong>{hotel.name}</strong></span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main Proposal View Component
export default function ProposalView({ proposal, onBack, onBookNow }) {
  const [activeTab, setActiveTab] = useState('itinerary');
  const [expandedSections, setExpandedSections] = useState({
    inclusions: true,
    exclusions: true,
    terms: false,
    policies: false
  });

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">No proposal data available</p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  // Calculate totals
  const adultsCount = proposal.room_data?.reduce((acc, r) => acc + (r.adults || 0), 0) || 2;
  const childrenCount = proposal.room_data?.reduce((acc, r) => acc + (r.children?.length || 0), 0) || 0;
  const roomsCount = proposal.room_data?.length || 1;
  const nightsCount = proposal.cities?.reduce((acc, c) => acc + (c.nights || 0), 0) || 1;
  const destinations = proposal.cities?.map(c => c.name).join(', ') || '';

  // Generate itinerary days
  const generateItinerary = () => {
    const days = [];
    let currentDate = new Date(proposal.leaving_on);
    let dayNumber = 1;

    proposal.cities?.forEach((city, cityIndex) => {
      const nights = city.nights || 1;
      
      for (let i = 0; i < nights + (cityIndex === proposal.cities.length - 1 ? 1 : 0); i++) {
        const isArrival = dayNumber === 1;
        const isDeparture = cityIndex === proposal.cities.length - 1 && i === nights;
        
        days.push({
          day: dayNumber,
          date: new Date(currentDate),
          cityName: city.name,
          isArrival,
          isDeparture,
          hotel: proposal.selected_hotels?.[city.name],
          activities: [],
          transfers: isArrival || isDeparture ? [{ name: `Transfer ${isArrival ? 'from airport to hotel' : 'from hotel to airport'}`, type: 'Private' }] : [],
          meals: []
        });

        currentDate.setDate(currentDate.getDate() + 1);
        dayNumber++;
      }
    });

    return days;
  };

  const itinerary = generateItinerary();

  // Calculate price
  const basePrice = proposal.total_price || 0;
  const markupAmount = proposal.markup_type === 'percentage' 
    ? (basePrice * (proposal.markup_value || 0) / 100)
    : (proposal.markup_value || 0);
  const discountAmount = proposal.discount_amount || 0;
  const totalPrice = basePrice + markupAmount - discountAmount;
  const pricePerAdult = adultsCount > 0 ? Math.round(totalPrice / adultsCount) : totalPrice;

  const tabs = [
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'inclusions', label: 'Inclusions' },
    { id: 'terms', label: 'Terms and Policies' },
    { id: 'messages', label: 'Messages' },
    { id: 'help', label: 'Need Help' }
  ];

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="proposal-view-page">
      {/* Proposal Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-sm text-gray-500">Proposal No:</span>
              <span className="ml-2 font-bold text-[#002B5B]">{proposal.id?.slice(-7).toUpperCase() || '0000000'}</span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <h1 className="font-bold text-lg text-gray-800">
                {proposal.proposal_name || `Trip to ${proposal.cities?.[0]?.name || 'Unknown'}`}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {destinations} • {nightsCount} nights
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(proposal.leaving_on)}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {roomsCount} room, {adultsCount} adults{childrenCount > 0 ? `, ${childrenCount} children` : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Lead Details">
              <Info size={20} />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Download PDF">
              <Download size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id 
                    ? "border-[#002B5B] text-[#002B5B]" 
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Left Content */}
          <div className="flex-1">
            {activeTab === 'itinerary' && (
              <div>
                {/* Video Placeholder */}
                <div className="relative bg-gray-200 rounded-xl overflow-hidden mb-6 h-64">
                  <img 
                    src={`https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800`}
                    alt="Destination"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <button className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                      <Play size={28} className="text-[#002B5B] ml-1" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-lg font-bold">Play Your Itinerary</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-6">
                  *Video is for informational purposes and may not reflect actual services.
                </p>

                {/* Introduction Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">Introduction for Customer</h3>
                  <textarea 
                    className="w-full border border-gray-200 rounded p-3 text-sm resize-none"
                    rows={3}
                    placeholder="Add a personalized introduction for your customer..."
                  />
                </div>

                {/* Day by Day Itinerary */}
                <h2 className="text-xl font-bold text-gray-800 mb-4">Day by Day Itinerary</h2>
                {itinerary.map((day) => (
                  <DayItineraryCard key={day.day} {...day} />
                ))}

                {/* Inclusions */}
                <div className="bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden">
                  <button 
                    className="w-full px-4 py-3 flex items-center justify-between bg-green-50 text-green-800 font-medium"
                    onClick={() => toggleSection('inclusions')}
                  >
                    <span className="flex items-center gap-2">
                      <Check size={18} />
                      Inclusions
                    </span>
                    {expandedSections.inclusions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedSections.inclusions && (
                    <div className="p-4">
                      <ul className="space-y-2 text-sm text-gray-600">
                        {proposal.cities?.map((city, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check size={14} className="text-green-500" />
                            Stay at {proposal.selected_hotels?.[city.name]?.name || 'Selected Hotel'} in {city.name}
                          </li>
                        ))}
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-green-500" />
                          Airport transfers (arrival and departure)
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-green-500" />
                          All applicable taxes
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Exclusions */}
                <div className="bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden">
                  <button 
                    className="w-full px-4 py-3 flex items-center justify-between bg-red-50 text-red-800 font-medium"
                    onClick={() => toggleSection('exclusions')}
                  >
                    <span className="flex items-center gap-2">
                      <X size={18} />
                      Exclusions
                    </span>
                    {expandedSections.exclusions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedSections.exclusions && (
                    <div className="p-4">
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <X size={14} className="text-red-500" />
                          Passport and visa fees
                        </li>
                        <li className="flex items-center gap-2">
                          <X size={14} className="text-red-500" />
                          Travel insurance
                        </li>
                        <li className="flex items-center gap-2">
                          <X size={14} className="text-red-500" />
                          Early check-in / Late check-out
                        </li>
                        <li className="flex items-center gap-2">
                          <X size={14} className="text-red-500" />
                          Meals not mentioned in inclusions
                        </li>
                        <li className="flex items-center gap-2">
                          <X size={14} className="text-red-500" />
                          Personal expenses and tips
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden">
                  <button 
                    className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 font-medium"
                    onClick={() => toggleSection('terms')}
                  >
                    <span>Terms and Conditions</span>
                    {expandedSections.terms ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedSections.terms && (
                    <div className="p-4 text-sm text-gray-600 space-y-3">
                      <p>• All bookings are subject to availability at the time of confirmation.</p>
                      <p>• Prices are subject to change without prior notice.</p>
                      <p>• Full payment is required to confirm the booking.</p>
                      <p>• Cancellation charges apply as per the hotel/supplier policy.</p>
                    </div>
                  )}
                </div>

                {/* Payment Policies */}
                <div className="bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden">
                  <button 
                    className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 font-medium"
                    onClick={() => toggleSection('policies')}
                  >
                    <span>Payment Policies</span>
                    {expandedSections.policies ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedSections.policies && (
                    <div className="p-4 text-sm text-gray-600 space-y-3">
                      <p>• 100% payment is required at the time of booking.</p>
                      <p>• Payment can be made via bank transfer, credit card, or online payment.</p>
                      <p>• All payments are in AED unless otherwise specified.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'inclusions' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Package Inclusions</h2>
                <ul className="space-y-3">
                  {proposal.cities?.map((city, idx) => (
                    <li key={idx} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Check size={20} className="text-green-600" />
                      <span>{city.nights} night(s) accommodation in {city.name}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Check size={20} className="text-green-600" />
                    <span>Airport transfers (arrival and departure)</span>
                  </li>
                </ul>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Terms and Policies</h2>
                <div className="space-y-4 text-sm text-gray-600">
                  <section>
                    <h3 className="font-bold text-gray-800 mb-2">Booking Terms</h3>
                    <p>All bookings are subject to availability. Confirmation will be provided within 24-48 hours.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-gray-800 mb-2">Cancellation Policy</h3>
                    <p>Cancellations made 30+ days before travel: Full refund minus admin fees.</p>
                    <p>Cancellations made 15-30 days before travel: 50% refund.</p>
                    <p>Cancellations made less than 15 days: No refund.</p>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Messages</h2>
                <p className="text-gray-500">No messages yet. Start a conversation with your client.</p>
              </div>
            )}

            {activeTab === 'help' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Need Help?</h2>
                <p className="text-gray-600 mb-4">Our support team is here to help you with any questions.</p>
                <button className="px-6 py-3 bg-[#002B5B] text-white rounded-lg font-medium">
                  Contact Support
                </button>
              </div>
            )}
          </div>

          {/* Right Sidebar - Price Summary */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 sticky top-24">
              {/* Price Breakdown */}
              <div className="p-4 border-b border-gray-200">
                <p className="text-sm text-gray-500 mb-2">
                  Estimated Date of Booking: <span className="font-medium">{formatDate(proposal.expected_booking_date) || 'Not set'}</span>
                </p>
                <h3 className="font-bold text-gray-800 mb-4">Price Breakdown</h3>
                
                <div className="space-y-2 text-sm">
                  <p className="text-gray-500">{roomsCount} room, {adultsCount} adults</p>
                  <p className="text-gray-500">Nationality: {proposal.nationality || 'Not specified'}</p>
                  <p className="text-gray-500">Departure City: {proposal.leaving_from || 'Not specified'}</p>
                </div>

                <button className="text-blue-600 text-sm hover:underline mt-3">
                  Update Markup / Discount
                </button>

                <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Price per adult:</span>
                    <span className="font-medium">AED {pricePerAdult.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Price:</span>
                    <span className="font-medium">AED {(basePrice + markupAmount).toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>- AED {discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                    <span>Net Price:</span>
                    <span className="text-[#002B5B]">AED {totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 space-y-3">
                <button 
                  onClick={onBookNow}
                  className="w-full py-3 bg-[#8B0000] text-white font-bold rounded-lg hover:bg-[#6B0000] transition-colors flex items-center justify-center gap-2"
                  data-testid="book-now-btn"
                >
                  <CreditCard size={18} />
                  BOOK NOW
                </button>
                <button className="w-full py-3 bg-[#4A154B] text-white font-bold rounded-lg hover:bg-[#3A0A3B] transition-colors flex items-center justify-center gap-2">
                  <Check size={18} />
                  ACCEPT PROPOSAL
                </button>
                <button className="w-full py-3 bg-[#6B21A8] text-white font-bold rounded-lg hover:bg-[#581C87] transition-colors flex items-center justify-center gap-2">
                  <HelpCircle size={18} />
                  NEED HELP
                </button>
              </div>

              {/* Communication */}
              <div className="p-4 border-t border-gray-200 flex justify-center gap-4">
                <button className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors" title="Send Email">
                  <Mail size={20} className="text-gray-600" />
                </button>
                <button className="p-3 bg-green-100 rounded-full hover:bg-green-200 transition-colors" title="WhatsApp">
                  <MessageCircle size={20} className="text-green-600" />
                </button>
              </div>

              {/* Payment Schedule */}
              <div className="p-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Payment Schedule</h4>
                <p className="text-sm text-gray-600">
                  AED {totalPrice.toLocaleString()} due on {formatDate(proposal.leaving_on) || 'Travel date'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <button 
          onClick={onBack}
          className="text-gray-500 hover:text-[#002B5B] font-medium transition-colors"
        >
          ← Back to Proposals
        </button>
      </div>
    </div>
  );
}

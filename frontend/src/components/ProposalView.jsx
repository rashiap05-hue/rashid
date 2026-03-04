import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Users, Clock, Star, Hotel, Plane, Car, 
  ChevronDown, ChevronUp, Check, X, AlertTriangle, Play,
  Download, Mail, MessageCircle, DollarSign, CreditCard, HelpCircle,
  Coffee, Utensils, Sun, Moon, Plus, Edit2, Trash2, Bed, Info, Eye,
  FileText, ChevronRight, Shield, Briefcase, AlertCircle, List,
  MessageSquare, Phone, CheckCircle, Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

// Format date helper
const formatDate = (dateStr, format = 'short') => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (format === 'short') {
    const options = { weekday: 'short', day: '2-digit', month: 'short' };
    return date.toLocaleDateString('en-GB', options);
  } else if (format === 'long') {
    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  } else if (format === 'day') {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  }
  return date.toLocaleDateString();
};

// Add days to date
const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date;
};

// Expandable Section Component for Terms
function ExpandableSection({ title, icon: Icon, children, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-4 px-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} className="text-gray-500" />}
          <span className="font-medium text-gray-800">{title}</span>
        </div>
        <ChevronDown 
          size={18} 
          className={cn("text-gray-400 transition-transform duration-200", expanded && "rotate-180")} 
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm text-gray-600">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Day Itinerary Component - Redesigned
function DayItinerary({ 
  dayNumber, 
  dayRange, 
  title, 
  date, 
  dateRange, 
  cityName, 
  isArrival, 
  isDeparture, 
  isLeisure,
  transfers, 
  hotel, 
  meals, 
  activities, 
  expanded,
  onExpand 
}) {
  return (
    <div className="border-b border-gray-200">
      {/* Day Header */}
      <div 
        className="flex items-center justify-between py-4 cursor-pointer hover:bg-gray-50 px-4 -mx-4"
        onClick={onExpand}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 font-medium min-w-[60px]">Day {dayRange || dayNumber}</span>
          <div className="flex items-center gap-2">
            <ChevronDown 
              size={18} 
              className={cn("text-gray-400 transition-transform duration-200", expanded && "rotate-180")} 
            />
            <span className="text-base font-semibold text-gray-800">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{dateRange || formatDate(date, 'long')}</span>
          <button 
            className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-lg">⋮</span>
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-6 pl-20 pr-4 space-y-4">
              {/* Missing Info Alert for Arrival/Departure */}
              {(isArrival || isDeparture) && (
                <div className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-md text-sm",
                  isArrival ? "bg-orange-50 border-l-4 border-orange-400 text-orange-700" : "bg-pink-50 border-l-4 border-pink-400 text-pink-700"
                )}>
                  <AlertCircle size={16} />
                  <span>{isArrival ? 'Arrival' : 'Departure'} information is missing</span>
                </div>
              )}

              {/* Description */}
              <p className="text-gray-600 text-sm leading-relaxed">
                {isArrival 
                  ? `Arrive at the ${cityName} International Airport into the city of ${cityName} and enjoy a stress-free start to your visit to ${cityName}'s capital. Upon arrival check in the hotel. Rest of the day leisure at your own to explore the city. Overnight stay.`
                  : isDeparture 
                  ? `After breakfast time to check out of the hotel and as per your flight timing or check out time you will be transferred to ${cityName} International Airport for your onward Journey with a lifetime memories.`
                  : `Today you are free to explore ${cityName} on your own. Enjoy the local culture, cuisine, and attractions at your leisure.`
                }
              </p>

              {/* Notes for Arrival/Departure */}
              {(isArrival || isDeparture) && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
                  <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
                    <li>Small vehicle upto 6 pax will come with Drive cum Guide (with limited English) If you require an additional Guide, please request for it at applicable additional charges.</li>
                    <li>7 people and above will be provided a Sprinter where Guide is mandatory and included.</li>
                  </ul>
                </div>
              )}

              {/* Transfers */}
              {transfers && transfers.length > 0 && transfers.map((transfer, idx) => (
                <div key={idx} className="flex items-start gap-3 py-3 border-t border-gray-100">
                  <Car size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-800 font-medium text-sm">{transfer.name}</span>
                      <button className="text-xs text-blue-600 border border-blue-500 px-2 py-0.5 rounded hover:bg-blue-50 font-medium">
                        VIEW
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded font-medium">Private Transfers</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">
                        <Briefcase size={12} />
                        3 Bags
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Overnight Stay */}
              {hotel && !isDeparture && (
                <div className="flex items-center gap-3 py-2 border-t border-gray-100">
                  <Bed size={18} className="text-gray-400" />
                  <span className="text-gray-600 text-sm">Overnight stay at <span className="font-medium text-gray-800">{hotel.name}</span></span>
                </div>
              )}

              {/* Meals Grid */}
              <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                {!isArrival && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Coffee size={14} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Breakfast</p>
                      <p className="text-xs text-gray-400">Not Included</p>
                    </div>
                  </div>
                )}
                {isArrival && <div></div>}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <X size={14} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Lunch</p>
                    <p className="text-xs text-gray-400">Not Included</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Moon size={14} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Dinner</p>
                    <p className="text-xs text-gray-400">Not Included</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Price Sidebar Component
function PriceSidebar({ proposal, onBookNow, onEditProposal }) {
  const adultsCount = proposal.room_data?.reduce((acc, r) => acc + (r.adults || 0), 0) || 2;
  const childrenCount = proposal.room_data?.reduce((acc, r) => acc + (r.children?.length || 0), 0) || 0;
  const roomsCount = proposal.room_data?.length || 1;
  
  // Calculate pricing
  const basePrice = proposal.total_price || 1500;
  const pricePerAdult = Math.round(basePrice / adultsCount);
  const totalPrice = basePrice;
  const markupLand = proposal.markup_land || 0;
  const discountAmount = proposal.discount_amount || 0;
  const couponCode = proposal.coupon_code || '';
  const priceAfterDiscount = totalPrice + markupLand - discountAmount;
  const netPrice = priceAfterDiscount;
  
  // Estimated booking date (7 days from now or from proposal)
  const estimatedBookingDate = proposal.estimated_booking_date 
    ? new Date(proposal.estimated_booking_date) 
    : addDays(new Date(), 7);
  
  // Payment schedule date (leaving date minus 7 days)
  const paymentDueDate = addDays(proposal.leaving_on, -7);
  
  // Extract departure city from leaving_from
  const departureCity = proposal.leaving_from?.split(' ')[0] || 'Dubai';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-20">
      {/* Edit Proposal Header */}
      <div className="flex justify-end p-4 border-b border-gray-100">
        <button 
          onClick={onEditProposal}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          data-testid="sidebar-edit-proposal-btn"
        >
          <Menu size={16} />
          EDIT PROPOSAL
        </button>
      </div>

      <div className="p-5">
        {/* Estimated Date of Booking */}
        <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg mb-5">
          <span className="text-gray-600 text-sm">Estimated Date of Booking</span>
          <span className="font-semibold text-gray-800">{formatDate(estimatedBookingDate, 'day')}</span>
        </div>

        {/* Price Breakdown */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg text-gray-800">Price Breakdown</h3>
            <button className="text-blue-600 text-sm hover:underline font-medium">Edit</button>
          </div>
          
          <div className="text-sm text-gray-600 space-y-0.5 mb-3">
            <p>{roomsCount} room, {adultsCount} adults{childrenCount > 0 ? `, ${childrenCount} children` : ''}</p>
            <p>Nationality: {proposal.nationality || 'India'}</p>
            <p>Departure City: {departureCity}</p>
          </div>

          <button className="text-blue-600 text-sm hover:underline mb-4 block">
            Update Markup / Discount
          </button>

          {/* Price Lines */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Price per adult</span>
              <span className="text-gray-800">AED {pricePerAdult.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Price</span>
              <span className="text-gray-800">AED {totalPrice.toLocaleString()}</span>
            </div>
            
            {/* Coupon Discount */}
            {discountAmount > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-600">Coupon Discount</span>
                  <span className="text-gray-800">AED -{discountAmount.toLocaleString()}</span>
                </div>
                {couponCode && (
                  <p className="text-gray-400 text-xs mt-1">{couponCode} Coupon Applied</p>
                )}
              </div>
            )}

            {/* Price after discount */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Price after discount</span>
                  <Eye size={14} className="text-blue-500" />
                </div>
                <span className="text-2xl font-bold text-gray-800">AED {priceAfterDiscount.toLocaleString()}</span>
              </div>
              <p className="text-gray-400 text-xs">INCLUDING ALL TAXES</p>
            </div>

            {/* Net Price */}
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="text-gray-600">Net Price</span>
              <span className="text-gray-800 font-medium">AED {netPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={onBookNow}
            className="w-full py-3 bg-[#8B4513] hover:bg-[#723A0F] text-white font-semibold rounded-lg transition-colors"
            data-testid="book-now-btn"
          >
            BOOK NOW
          </button>
          
          <button 
            className="w-full py-3 bg-[#8B4513] hover:bg-[#723A0F] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            data-testid="accept-proposal-btn"
          >
            <CheckCircle size={18} />
            ACCEPT PROPOSAL
          </button>
          
          <button 
            className="w-full py-3 bg-[#D946EF] hover:bg-[#C026D3] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            data-testid="need-help-btn"
          >
            <HelpCircle size={18} />
            NEED HELP
          </button>

          {/* Mail and WhatsApp buttons */}
          <div className="flex gap-3">
            <button className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <Mail size={16} />
              MAIL
            </button>
            <button className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <MessageCircle size={16} />
              WHATSAPP LINK
            </button>
          </div>
        </div>

        {/* Payment Schedule */}
        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-700 font-medium text-sm text-center mb-2">Payment Schedule</p>
          <div className="bg-white border border-amber-300 rounded py-2 px-3 text-center">
            <span className="text-sm text-gray-600">AED {totalPrice.toLocaleString()} due on {formatDate(paymentDueDate, 'day')}</span>
          </div>
        </div>

        {/* Chat with client */}
        <div className="mt-5 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-gray-700">
            <MessageSquare size={18} />
            <span className="font-medium">Chat with client</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Proposal View Component
export default function ProposalView({ proposal, onBack, onBookNow }) {
  const [activeTab, setActiveTab] = useState('itinerary');
  const [expandedDays, setExpandedDays] = useState({1: true});
  const [allExpanded, setAllExpanded] = useState(false);

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No proposal data available</p>
          <button 
            onClick={onBack}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Calculate trip details
  const adultsCount = proposal.room_data?.reduce((acc, r) => acc + (r.adults || 0), 0) || 2;
  const childrenCount = proposal.room_data?.reduce((acc, r) => acc + (r.children?.length || 0), 0) || 0;
  const roomsCount = proposal.room_data?.length || 1;
  const nightsCount = proposal.cities?.reduce((acc, c) => acc + (c.nights || 0), 0) || 1;
  const daysCount = nightsCount + 1;
  const destinations = proposal.cities?.map(c => c.name).join(', ') || '';
  const mainCity = proposal.cities?.[0]?.name || 'Unknown';
  const proposalNumber = proposal.id?.slice(-7).toUpperCase() || '0000000';

  // Get hotel for city
  const getHotelForCity = (cityName) => {
    return proposal.selected_hotels?.[cityName];
  };

  // Check-in/Check-out dates
  const checkInDate = new Date(proposal.leaving_on);
  const checkOutDate = addDays(proposal.leaving_on, nightsCount);

  const toggleDay = (day) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const toggleAllDays = () => {
    const newExpanded = !allExpanded;
    setAllExpanded(newExpanded);
    const days = {};
    for (let i = 1; i <= daysCount; i++) {
      days[i] = newExpanded;
    }
    setExpandedDays(days);
  };

  const tabs = [
    { id: 'itinerary', label: 'ITINERARY', icon: Calendar },
    { id: 'inclusions', label: 'INCLUSIONS', icon: FileText },
    { id: 'terms', label: 'TERMS AND POLICIES', icon: Shield },
    { id: 'messages', label: 'MESSAGES', icon: MessageCircle },
    { id: 'help', label: 'NEED HELP', icon: HelpCircle }
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="proposal-view-page">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <button 
              onClick={onBack}
              className="text-blue-600 hover:underline font-medium"
              data-testid="breadcrumb-lead-details"
            >
              Lead Details
            </button>
            <ChevronRight size={14} className="text-gray-400" />
            <button className="text-blue-600 hover:underline font-medium">
              View All Suggested Options
            </button>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="text-gray-600">{proposal.proposal_name || `Option 1 - Trip to ${mainCity}`}</span>
          </nav>
        </div>
      </div>

      {/* Proposal Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400 italic mb-2">Proposal No: {proposalNumber}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4" data-testid="proposal-title">
                {proposal.proposal_name || `Option 1 - Trip to ${mainCity}`}
              </h1>
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span>{mainCity} {nightsCount} nights</span>
                </span>
                <span className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{formatDate(proposal.leaving_on, 'day')} - {nightsCount} nights/{daysCount} days</span>
                </span>
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <span>{roomsCount} room, {adultsCount} adults{childrenCount > 0 ? `, ${childrenCount} children` : ''}</span>
                </span>
              </div>
            </div>
            <button 
              className="hidden md:flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              data-testid="download-pdf-btn"
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Tab Navigation */}
      <div className="bg-gray-800 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex overflow-x-auto scrollbar-hide">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 md:px-6 py-4 text-xs md:text-sm font-medium flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap",
                    activeTab === tab.id 
                      ? "border-teal-400 text-white" 
                      : "border-transparent text-gray-400 hover:text-white"
                  )}
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            <button 
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              data-testid="edit-proposal-btn"
            >
              <Edit2 size={16} />
              EDIT PROPOSAL
            </button>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* ITINERARY Tab */}
            {activeTab === 'itinerary' && (
              <div className="bg-white rounded-xl p-6 shadow-sm" data-testid="itinerary-content">
                {/* Introduction Section */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-700">Introduction for Customer</h3>
                  <button className="text-sm text-blue-600 border border-blue-500 px-3 py-1.5 rounded hover:bg-blue-50 font-medium">
                    + ADD
                  </button>
                </div>

                {/* Map Section */}
                <div className="mb-8 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(mainCity)}&zoom=10`}
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map of ${mainCity}`}
                    data-testid="proposal-map"
                  />
                </div>

                {/* Flights Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Plane size={20} className="text-gray-600" />
                    Flights
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="font-medium text-gray-800">{proposal.leaving_from || 'Dubai'} to {mainCity}</p>
                    <p className="text-gray-500 text-sm mt-1">No Flight Included</p>
                  </div>
                </div>

                {/* City & Hotel Sections */}
                {proposal.cities?.map((city, cityIdx) => {
                  const hotel = getHotelForCity(city.name);
                  return (
                    <div key={cityIdx} className="mb-10">
                      {/* City Header */}
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin size={20} className="text-teal-500" />
                        {city.name}
                        <span className="text-gray-500 font-normal text-base ml-1">{city.nights} nights</span>
                      </h3>

                      {/* Hotel Card */}
                      {hotel && (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row">
                            {/* Hotel Image */}
                            <div className="w-full md:w-72 h-48 md:h-auto flex-shrink-0 relative">
                              <img
                                src={hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'}
                                alt={hotel.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {/* Hotel Details */}
                            <div className="flex-1 p-5">
                              {/* Star Rating */}
                              <div className="flex items-center gap-1 mb-2">
                                {[...Array(hotel.star_rating || 3)].map((_, i) => (
                                  <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                              
                              {/* Hotel Name & View Button */}
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-bold text-gray-800">{hotel.name}</h4>
                                <button className="text-xs text-blue-600 border border-blue-500 px-2 py-0.5 rounded hover:bg-blue-50 font-medium">
                                  VIEW
                                </button>
                              </div>
                              
                              {/* Address */}
                              <p className="text-sm text-gray-500 mb-4">{hotel.address || `${city.name}, ${city.country || ''}`}</p>
                              
                              {/* Check-in/out */}
                              <div className="flex gap-8 mb-4">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Check-in</p>
                                  <p className="text-sm font-semibold text-gray-800">{formatDate(proposal.leaving_on, 'short')}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Check-out</p>
                                  <p className="text-sm font-semibold text-gray-800">{formatDate(checkOutDate, 'short')}</p>
                                </div>
                              </div>

                              {/* Room Details */}
                              <div className="space-y-1.5 text-sm">
                                <p className="flex items-center gap-2 text-gray-700">
                                  <Bed size={14} className="text-gray-400" />
                                  <span className="font-medium">{hotel.selectedRoom?.name || '1 x Double or Twin Room'}</span>
                                </p>
                                <p className="text-gray-500">Parking, Coffee & tea, Express check-in</p>
                                <p className="text-gray-500">Free WiFi, Drinking water</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-gray-500">Room only</span>
                                  <span className="text-red-500 text-xs font-medium">Non-Refundable</span>
                                </div>
                                <p className="text-gray-400 text-xs mt-1">No meals included</p>
                              </div>
                            </div>
                            {/* Actions */}
                            <div className="p-3">
                              <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                                <span className="text-lg">⋮</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* What to know about this hotel */}
                      {hotel && (
                        <div className="bg-gray-50 p-5 rounded-xl mb-6 border border-gray-100">
                          <h5 className="font-semibold text-gray-800 mb-4">What to know about this hotel</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="space-y-3">
                              <p>• <span className="font-medium">Central Location:</span> Walking distance to Freedom Square, 5-minute walk to metro</p>
                              <p>• <span className="font-medium">Fast Wi-Fi:</span> Stable and fast internet connection throughout the hotel</p>
                              <p>• <span className="font-medium">Old Building:</span> Hotel is located in an old building, some areas need renovation</p>
                            </div>
                            <div className="space-y-3">
                              <p>• <span className="font-medium">Local Shopping:</span> Nearby shops and markets for local souvenirs</p>
                              <p>• <span className="font-medium">Spacious Rooms:</span> Rooms are 250-350 sq ft, with modern amenities</p>
                              <p>• <span className="font-medium">No Gym:</span> No fitness center or gym facilities available</p>
                            </div>
                            <div className="space-y-3">
                              <p>• <span className="font-medium">Cozy Lobby:</span> Small, elegant lobby with comfortable seating</p>
                              <p>• <span className="font-medium">Limited Dining:</span> Only one restaurant on site, limited dining options</p>
                              <p>• <span className="font-medium">Small Lift:</span> One small lift serving 5 floors, can be slow during peak hours</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Expand All Days Button */}
                <div className="flex justify-end mb-4">
                  <button 
                    onClick={toggleAllDays}
                    className="text-sm text-teal-600 border border-teal-500 px-4 py-2 rounded-lg hover:bg-teal-50 font-medium transition-colors"
                    data-testid="expand-all-days-btn"
                  >
                    {allExpanded ? '- COLLAPSE ALL DAYS' : '+ EXPAND ALL DAYS'}
                  </button>
                </div>

                {/* Day by Day Itinerary */}
                <div className="border-t border-gray-200">
                  {(() => {
                    const days = [];
                    let currentDate = new Date(proposal.leaving_on);
                    let dayNum = 1;
                    
                    proposal.cities?.forEach((city, cityIdx) => {
                      const hotel = getHotelForCity(city.name);
                      
                      // Day 1 - Arrival
                      if (cityIdx === 0) {
                        days.push(
                          <DayItinerary
                            key={dayNum}
                            dayNumber={dayNum}
                            title={`Arrival at ${city.name}`}
                            date={currentDate}
                            cityName={city.name}
                            isArrival={true}
                            hotel={hotel}
                            transfers={[{
                              name: `One-way transfer from ${city.name} airport to ${city.name} center - Private from Shota Rustaveli ${city.name} International Airport`
                            }]}
                            expanded={expandedDays[dayNum]}
                            onExpand={() => toggleDay(dayNum)}
                          />
                        );
                        currentDate = addDays(currentDate, 1);
                        dayNum++;
                      }

                      // Middle days - Day at leisure
                      const leisureDays = city.nights - 1;
                      if (leisureDays > 0) {
                        const startDay = dayNum;
                        const endDay = dayNum + leisureDays - 1;
                        const startDate = new Date(currentDate);
                        const endDate = addDays(currentDate, leisureDays - 1);
                        
                        days.push(
                          <DayItinerary
                            key={dayNum}
                            dayNumber={dayNum}
                            dayRange={leisureDays > 1 ? `${startDay} - ${endDay}` : String(startDay)}
                            title={`${city.name} - Day at leisure`}
                            date={startDate}
                            dateRange={leisureDays > 1 ? `${formatDate(startDate, 'long')} - ${formatDate(endDate, 'long')}` : formatDate(startDate, 'long')}
                            cityName={city.name}
                            isLeisure={true}
                            hotel={hotel}
                            expanded={expandedDays[dayNum]}
                            onExpand={() => toggleDay(dayNum)}
                          />
                        );
                        currentDate = addDays(currentDate, leisureDays);
                        dayNum += leisureDays;
                      }

                      // Last day - Departure
                      if (cityIdx === proposal.cities.length - 1) {
                        days.push(
                          <DayItinerary
                            key={dayNum}
                            dayNumber={dayNum}
                            title={`Departure from ${city.name}`}
                            date={currentDate}
                            cityName={city.name}
                            isDeparture={true}
                            transfers={[{
                              name: `One-way transfer from ${city.name} center - ${city.name} Airport - Private to Shota Rustaveli ${city.name} International Airport`
                            }]}
                            expanded={expandedDays[dayNum]}
                            onExpand={() => toggleDay(dayNum)}
                          />
                        );
                      }
                    });

                    return days;
                  })()}
                </div>
              </div>
            )}

            {/* INCLUSIONS Tab */}
            {activeTab === 'inclusions' && (
              <div className="bg-white rounded-xl p-6 shadow-sm" data-testid="inclusions-content">
                {/* INCLUSIONS Header */}
                <div className="flex items-center justify-center my-8">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <h2 className="px-6 text-xl font-bold text-gray-800 tracking-wider">INCLUSIONS</h2>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {/* City Inclusions */}
                {proposal.cities?.map((city, idx) => {
                  const hotel = getHotelForCity(city.name);
                  const cityStartDate = addDays(proposal.leaving_on, idx > 0 ? proposal.cities.slice(0, idx).reduce((acc, c) => acc + c.nights, 0) : 0);
                  
                  return (
                    <div key={idx} className="mb-10 bg-gray-50 rounded-xl p-6">
                      {/* City Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                          <MapPin size={16} className="text-white" />
                        </div>
                        <span className="text-lg font-bold text-gray-800">{city.name}</span>
                        <span className="text-gray-500">{city.nights} nights - {formatDate(cityStartDate, 'short')}</span>
                      </div>

                      {/* Hotel Stay */}
                      {hotel && (
                        <div className="mb-6 pl-4 border-l-2 border-gray-200">
                          <div className="flex items-start gap-4 mb-4">
                            <Hotel size={18} className="text-gray-400 mt-1 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-800">Stay for {city.nights} nights at {hotel.name}</p>
                              <p className="text-sm text-gray-500 mt-1">{hotel.selectedRoom?.name || '1 x Double or Twin Room'}</p>
                              <p className="text-sm text-gray-500">Parking, Coffee & tea, Express check-in</p>
                              <p className="text-sm text-gray-500">Free WiFi, Drinking water</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-500">Room only</span>
                                <span className="text-xs text-red-500 font-medium">Non-Refundable</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Transfers */}
                      <div className="space-y-4 mb-6 pl-4 border-l-2 border-gray-200">
                        {/* Arrival Transfer */}
                        <div className="flex items-start gap-4">
                          <Car size={18} className="text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-gray-800 text-sm">One-way transfer from {city.name} airport to {city.name} center - Private from Shota Rustaveli {city.name} International Airport</span>
                                <button className="text-xs text-blue-600 border border-blue-500 px-2 py-0.5 rounded hover:bg-blue-50 font-medium">VIEW</button>
                              </div>
                              <div className="text-right text-sm text-gray-500">
                                <p>Day 1</p>
                                <p>{formatDate(proposal.leaving_on, 'long')}</p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded font-medium">Private Transfers</span>
                            </div>
                          </div>
                        </div>

                        {/* Departure Transfer */}
                        <div className="flex items-start gap-4">
                          <Car size={18} className="text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-gray-800 text-sm">One-way transfer from {city.name} center - {city.name} Airport - Private to Shota Rustaveli {city.name} International Airport</span>
                                <button className="text-xs text-blue-600 border border-blue-500 px-2 py-0.5 rounded hover:bg-blue-50 font-medium">VIEW</button>
                              </div>
                              <div className="text-right text-sm text-gray-500">
                                <p>Day {daysCount}</p>
                                <p>{formatDate(checkOutDate, 'long')}</p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded font-medium">Private Transfers</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Meals Grid */}
                      <div className="grid grid-cols-3 gap-6 py-5 border-t border-gray-200">
                        <div className="flex items-center gap-3">
                          <Utensils size={18} className="text-gray-400" />
                          <div>
                            <p className="text-gray-800 font-medium">Breakfast</p>
                            <p className="text-sm text-gray-400">Not Included</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <X size={18} className="text-gray-400" />
                          <div>
                            <p className="text-gray-800 font-medium">Lunch</p>
                            <p className="text-sm text-gray-400">Not Included</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Moon size={18} className="text-gray-400" />
                          <div>
                            <p className="text-gray-800 font-medium">Dinner</p>
                            <p className="text-sm text-gray-400">Not Included</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Travel Insurance */}
                <div className="mt-10 bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Shield size={20} className="text-gray-600" />
                    Travel Insurance
                  </h3>
                  <p className="text-gray-600 mb-2">Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs</p>
                  <p className="text-red-500 text-sm font-medium">Not Included</p>
                </div>

                {/* Exclusions */}
                <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <AlertCircle size={22} className="text-gray-400" />
                    Exclusions
                  </h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Passport fees, immunization costs, city taxes at the hotel and local departure taxes (wherever applicable)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Optional enhancements like room or flight upgrades, or local camera or video fees</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Additional sightseeing, activities and experiences outside of the itinerary</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Early check-in or late check-out from hotels (unless otherwise specified)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Breakfast, lunches, dinners and drinks (alcoholic and non-alcoholic), unless specified in the itinerary</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Any international and/or domestic flights, unless explicitly mentioned as an inclusion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Excess baggage charges, and where applicable, baggage not included in your fare</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Tips for services and experiences</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Any Visa required, unless mentioned as an inclusion</span>
                    </li>
                    <li className="flex items-start gap-2 text-blue-600">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>Read useful information and terms for more on what is included and excluded</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* TERMS AND POLICIES Tab */}
            {activeTab === 'terms' && (
              <div className="bg-white rounded-xl shadow-sm" data-testid="terms-content">
                {/* Any Other Commitments */}
                <ExpandableSection title="Any Other Commitments" icon={CheckCircle}>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                    If any other service or commitments have been made apart from the inclusions in the proposal, then please make sure they are mentioned in this section.
                  </div>
                </ExpandableSection>

                {/* Important Notes */}
                <ExpandableSection title="Important Notes" icon={Info} defaultExpanded={true}>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">General</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Any ticket to attractions, museums, train, cable car, ferries, rides, safari, etc. are not included unless explicitly mentioned as an inclusion.</li>
                        <li>For queries regarding cancellations and refunds, please refer to our Cancellation Policy.</li>
                        <li>We reserve the right to issue a full refund in case we believe we are unable to fulfil the services for any technical reasons.</li>
                        <li>Please make sure that the passport of all guests travelling is valid for at least 6 months from the date of travel.</li>
                        <li>We can only facilitate the visa application for the travelling passengers. Granting of visa is solely at the discretion of Embassy. If visa is rejected or delayed by the Embassy for any reason then we are not liable to give any refund and respective cancellation policies will apply.</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Hotel</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>At the time of check-in to your hotel, hotel may ask you to make an advance/security deposit (amount depends upon hotel policy). This amount is refunded at the time of check-out, minus the cost of any items taken from the mini-bar or other charges (like late check-out or any damages done to the accommodation).</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Tours and Transfers</h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>The cost and ticket issued for various attractions with regards to any children travelling are based on the age provided at the time of creating the package quote. If the service provider decide to charge extra cost based on the height of the children or wrong information as per Passport, then the cost has to be borne by the customer on site.</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Europe</h4>
                      <h5 className="font-medium text-gray-700 mb-2">General</h5>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
                        <li>Please make sure to download the telegram app before your travel starts, where driver details for all tours and transfers shall be shared.</li>
                        <li>The driver details for private airport transfers or train station transfers or tours shall be shared within 24 hours of scheduled time only on the telegram app.</li>
                        <li>On arrival in case you cannot locate your driver please call the service provider and give your complete name and confirmation number for them to guide you.</li>
                        <li>Any changes in pickup times in Europe for airport or train station transfers (private only) can be done only 24 hours before the scheduled pickup time. In case any change request received within 24 hours, there will be 100% cancellation charges applicable and no refund shall be provided.</li>
                        <li>Most tours on sharing basis in Europe start from a common point in the city. Please make sure you reach the shared common point mentioned in the activity voucher at least 15 mins before the scheduled time.</li>
                        <li>In case you are delayed in reaching the common point, and the bus leaves for the tour, the tour is considered a no show and no refund shall be provided.</li>
                        <li>For tours and activities booked on private basis, the drivers arrive at specified time only and the maximum waiting time is only 10-15 mins.</li>
                        <li>Please note that we are not responsible for any delays (if any) in the vehicle for pick-ups or drops due to any un-avoidable conditions, like traffic, accidents, vehicle breakdown etc.</li>
                        <li>Please note that any trains confirmed as part of journeys exclude seat reservations and seat reservation charges. You are required to reserve your seat at least 24 hours before to avoid hassle in case the trains are running full.</li>
                        <li>In Europe you are required to manage and handle your luggage on your own. No porterage services are provided by us.</li>
                      </ol>
                    </div>
                  </div>
                </ExpandableSection>

                {/* Terms and Conditions */}
                <ExpandableSection title="Terms and Conditions" icon={Shield}>
                  <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li>Airline seats and hotel rooms are subject to availability at the time of confirmation.</li>
                    <li>In case of unavailability in the listed hotels, arrangement for an alternate accommodation will be made in a hotel of similar standard.</li>
                    <li>There will be no refund for unused nights or early check-out (in case of Medical condition it completely depends on hotel policy).</li>
                    <li>There will be no refund for any unutilized services (meals, entrance fees, optional tours, hotels, transport and sightseeing etc) for any reason whatsoever.</li>
                    <li>Check-in and check-out times at hotels would be as per Hotel policies. Early check-in or late check-out is subject to availability and may be chargeable by the hotel.</li>
                    <li>The price does not include expenses of personal nature, such as laundry, telephone calls, room service, alcoholic beverages, mini bar charges, tips, portage, camera fees etc.</li>
                    <li>We reserves the right to modify the itinerary at any point, due to reasons including but not limited to: Force Majeure events, strikes, fairs, festivals, weather conditions, traffic problems, overbooking of hotels / flights, cancellation / re-routing of flights, closure of / entry restrictions at a place of visit, etc.</li>
                    <li>In case a flight gets cancelled, we will not be liable to provide any alternate flights within the same cost, any additional cost incurred for the same shall be borne by the traveler.</li>
                    <li>If your stay falls on special dates (like 24th December, 31st December, 14th February, etc.) when hotel organize gala dinner, then there may be mandatory Gala Dinner Charges additional that you need to pay at the hotel directly.</li>
                    <li>Country guidelines may change without notice, hence do check travel rules and your eligibility for travel on the regulatory website of the respective country/state, before booking your travel.</li>
                  </ul>
                </ExpandableSection>

                {/* Our Scope of Services */}
                <ExpandableSection title="Our Scope of Services" icon={Briefcase}>
                  <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li>We are holiday organizers only. We inspect and select the services to be provided to you. However, we do not own, operate or control any airline, shipping company, coach or coach company, hotel, transport, restaurant, kitchen caravan or any other facility or provider etc. that is engaged to provide you services during the course of your tour. Therefore, please carefully note that:</li>
                    <li>You will need to adhere to the conditions, rules and regulations of each service provider. For instance, you will need to check the baggage rules of the airline, you will need to check the hotel rules to check what the mealtimes are, at which you should make yourself available. The company is not responsible / liable for the consequences if you breach such rules and regulations.</li>
                    <li>If you cause any injury or damage affecting the service provider, then you may be liable to the service provider and if the service provider recovers any monies from us for such injury or damages, we shall separately charge you for the same.</li>
                    <li>We cannot be held responsible / liable for any delay, deficiency, injury, death, loss or damage etc. occasioned due to act or default of such service providers, their employees or agents.</li>
                  </ul>
                </ExpandableSection>

                {/* Hotel Cancellation Policy */}
                <ExpandableSection title="Hotel Cancellation Policy" icon={Hotel}>
                  <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li>Hotel cancellation will be as per the hotel cancellation policy. If the hotels are non-refundable, you will not get any refund for hotels in the event of cancellation.</li>
                    <li>Any transfers or activities included in the trip will be non-refundable if cancelled within 3 days of the travel start date, unless otherwise specified during the quotation stage in the 'Points to Note' section. Some services handle different cancellation policies and they must be respected accordingly.</li>
                    <li>Entrance tickets of any kind are non-refundable from the moment of booking, unless specified otherwise.</li>
                    <li>There will also a service charge of 5% on total value in case of cancellation of Land and 5% on total value for any amendments.</li>
                    <li>Hotel room allocation will be subject to availability and will be on a first come first serve basis.</li>
                    <li>Any transfers or activities included in the trip will be non-refundable if cancelled within 3 days of the travel start date.</li>
                  </ul>
                </ExpandableSection>

                {/* Payment Policies */}
                <ExpandableSection title="Payment Policies" icon={CreditCard}>
                  <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li>There might be an increase in total package cost offered at the time of bookings in case the payments are not received by us as per the terms mentioned and the extra cost need to be borne by the guest.</li>
                    <li>We will never ask you to pay in a personal account. Please always pay using our website or in our company bank account.</li>
                  </ul>
                </ExpandableSection>

                {/* Amendment of Booking by Guest */}
                <ExpandableSection title="Amendment of Booking by Guest" icon={Edit2}>
                  <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li>If you wish to amend or change your booking, you have to communicate your request to us in writing. Such requests for change or amendment will be accepted subject to availability. Please note that the amended or changed booking will be regarded as a new booking. In case the amendment is carried out within the cancellation period, then a cancellation charge shall apply as if a cancellation was made on the date the request for amendment or change is made. Please note the cancellation charges will be as per the airline and hotel policies.</li>
                  </ul>
                </ExpandableSection>
              </div>
            )}

            {/* MESSAGES Tab */}
            {activeTab === 'messages' && (
              <div className="bg-white rounded-xl p-6 shadow-sm" data-testid="messages-content">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Messages</h2>
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100">
                  <MessageCircle size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">No messages yet</p>
                  <p className="text-gray-400 text-sm mt-1">Start a conversation with your client</p>
                  <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    Send Message
                  </button>
                </div>
              </div>
            )}

            {/* NEED HELP Tab */}
            {activeTab === 'help' && (
              <div className="bg-white rounded-xl p-6 shadow-sm" data-testid="help-content">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Need Help?</h2>
                <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                  <p className="text-gray-600 mb-6">Our support team is here to assist you with any questions about this proposal.</p>
                  <div className="flex flex-wrap gap-4">
                    <button className="px-6 py-3 bg-[#002B5B] text-white rounded-lg font-medium hover:bg-[#003d82] transition-colors">
                      Contact Support
                    </button>
                    <button className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2">
                      <MessageCircle size={18} />
                      WhatsApp
                    </button>
                    <button className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
                      <Mail size={18} />
                      Email Us
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Price Breakdown */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <PriceSidebar 
              proposal={proposal} 
              onBookNow={onBookNow}
              onEditProposal={() => {}}
            />
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <button 
            onClick={onBack}
            className="text-gray-500 hover:text-[#002B5B] font-medium transition-colors flex items-center gap-2"
            data-testid="back-to-proposals-btn"
          >
            <ChevronRight size={16} className="rotate-180" />
            Back to Proposals
          </button>
        </div>
      </div>
    </div>
  );
}

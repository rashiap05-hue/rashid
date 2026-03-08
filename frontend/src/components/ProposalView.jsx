import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Users, Clock, Star, Hotel, Plane, Car, 
  ChevronDown, ChevronUp, Check, X, AlertTriangle, Play,
  Download, Mail, MessageCircle, DollarSign, CreditCard, HelpCircle,
  Coffee, Utensils, Sun, Moon, Plus, Edit2, Trash2, Bed, Info, Eye,
  FileText, ChevronRight, Shield, Briefcase, AlertCircle, List,
  MessageSquare, Phone, CheckCircle, Menu, Camera, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

// Icon mapping for terms/policies
const TERMS_ICONS = {
  info: Info,
  shield: Shield,
  hotel: Hotel,
  creditCard: CreditCard,
  check: CheckCircle,
  briefcase: Briefcase,
  edit: Edit2,
  file: FileText
};

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

// Left Sidebar Navigation Icons
function LeftSidebarNav({ activeSection, onSectionChange }) {
  const sections = [
    { id: 'flights', icon: Plane, label: 'Flights' },
    { id: 'hotel', icon: Hotel, label: 'Hotel' },
    { id: 'transfers', icon: Car, label: 'Transfers' },
    { id: 'activities', icon: MapPin, label: 'Activities' },
  ];
  
  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 bg-white border-r border-gray-200 shadow-sm z-30 hidden lg:flex flex-col py-4">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          className={cn(
            "w-12 h-12 flex items-center justify-center transition-colors",
            activeSection === section.id 
              ? "bg-teal-50 text-teal-600 border-l-2 border-teal-500" 
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          )}
          title={section.label}
        >
          <section.icon size={20} />
        </button>
      ))}
    </div>
  );
}

// Price Sidebar Component - Yellow/Cream Background Style
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
  
  // Extract departure city from leaving_from
  const departureCity = proposal.leaving_from?.split(' ')[0] || 'Dubai';

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
          <div className="space-y-3 text-sm border-t border-[#E8D9A0] pt-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Price per adult</span>
              <span className="text-gray-800 font-medium">AED {pricePerAdult.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Price</span>
              <span className="text-gray-800 font-medium">AED {totalPrice.toLocaleString()}</span>
            </div>
            
            {/* Coupon Discount */}
            {discountAmount > 0 && (
              <div className="pt-2">
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
            <div className="pt-3 border-t border-[#E8D9A0]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Price after discount</span>
                  <Eye size={14} className="text-blue-500 cursor-pointer" />
                </div>
                <span className="text-2xl font-bold text-gray-800">AED {priceAfterDiscount.toLocaleString()}</span>
              </div>
              <p className="text-gray-400 text-xs text-right">INCLUDING ALL TAXES</p>
            </div>

            {/* Net Price */}
            <div className="flex justify-between pt-2 border-t border-[#E8D9A0]">
              <span className="text-gray-600">Net Price</span>
              <span className="text-gray-800 font-medium">AED {netPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mt-6">
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
            <button className="flex-1 py-2.5 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <Mail size={16} />
              MAIL
            </button>
            <button className="flex-1 py-2.5 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
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

        {/* Chat with client */}
        <div className="mt-5 pt-4 border-t border-[#E8D9A0]">
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
export default function ProposalView({ proposal, onBack, onBookNow, onEditProposal }) {
  const [activeTab, setActiveTab] = useState('itinerary');
  const [expandedDays, setExpandedDays] = useState({1: true});
  const [allExpanded, setAllExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState('flights');
  
  // Dynamic Terms & Policies state
  const [termsAndPolicies, setTermsAndPolicies] = useState([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState(null);

  // Fetch Terms & Policies based on proposal destination
  useEffect(() => {
    const fetchTermsAndPolicies = async () => {
      if (!proposal) return;
      
      setTermsLoading(true);
      setTermsError(null);
      
      try {
        // Get all cities from the proposal
        const cities = proposal.cities || [];
        const mainCity = cities[0]?.name || '';
        
        // First, look up the country for the main city from the cities database
        let country = '';
        if (mainCity) {
          try {
            const cityResponse = await api.get(`/cities?search=${encodeURIComponent(mainCity)}&limit=1`);
            const cityData = cityResponse.data?.cities?.[0];
            if (cityData?.country) {
              country = cityData.country;
            }
          } catch (e) {
            console.log('Could not look up country for city:', mainCity);
          }
        }
        
        // Fetch terms - the backend will return:
        // 1. All global policies (applies_to: "all")
        // 2. City-specific policies for the main city
        // 3. Country-specific policies for the country (applies to ALL cities in that country)
        let url = '/terms-policies?active_only=true';
        if (mainCity) {
          url += `&city=${encodeURIComponent(mainCity)}`;
        }
        if (country) {
          url += `&country=${encodeURIComponent(country)}`;
        }
        
        const response = await api.get(url);
        
        // Sort by order and filter active ones
        const policies = (response.data || [])
          .filter(p => p.is_active)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setTermsAndPolicies(policies);
      } catch (error) {
        console.error('Error fetching terms and policies:', error);
        setTermsError('Failed to load terms and policies');
        // Fall back to empty array - hardcoded fallback will be shown
        setTermsAndPolicies([]);
      } finally {
        setTermsLoading(false);
      }
    };
    
    fetchTermsAndPolicies();
  }, [proposal]);

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

  // Destination image based on city
  const getDestinationImage = (cityName) => {
    const images = {
      'Tbilisi': 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1200',
      'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200',
      'Kuala Lumpur': 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200',
      'default': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200'
    };
    return images[cityName] || images['default'];
  };

  const tabs = [
    { id: 'itinerary', label: 'ITINERARY', icon: Plane },
    { id: 'inclusions', label: 'INCLUSIONS', icon: FileText },
    { id: 'terms', label: 'TERMS AND POLICIES', icon: Shield },
    { id: 'help', label: 'NEED HELP', icon: HelpCircle }
  ];

  return (
    <div className="min-h-screen bg-white" data-testid="proposal-view-page">
      {/* Left Sidebar Nav */}
      <LeftSidebarNav activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Breadcrumb Navigation */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 lg:pl-16">
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
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 lg:pl-16">
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

      {/* Fixed Tab Navigation - Dark Background */}
      <div className="bg-[#1a1a2e] text-white fixed top-0 left-0 right-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 lg:pl-16">
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
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => onEditProposal && onEditProposal(proposal)}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer"
              data-testid="edit-proposal-btn"
            >
              <Menu size={16} />
              EDIT PROPOSAL
            </button>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar - Add top padding for fixed header */}
      <div className="max-w-7xl mx-auto px-6 py-8 lg:pl-16 mt-14">
        <div className="flex gap-8">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* ITINERARY Tab */}
            {activeTab === 'itinerary' && (
              <div data-testid="itinerary-content">
                {/* Hero Image with Play Button */}
                <div className="relative mb-8 rounded-xl overflow-hidden shadow-lg">
                  <img
                    src={getDestinationImage(mainCity)}
                    alt={mainCity}
                    className="w-full h-[350px] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <button className="w-16 h-16 bg-white/90 rounded-lg flex items-center justify-center shadow-lg hover:bg-white transition-colors">
                      <Play size={28} className="text-gray-700 ml-1" />
                    </button>
                  </div>
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

                {/* Transfer Info */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=200"
                        alt="Transfer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-600 text-sm">Pick up from {proposal.leaving_from?.includes('Airport') ? proposal.leaving_from.split('(')[0] : 'Airport'}.</p>
                      <p className="text-gray-600 text-sm mt-1">Drop off at {mainCity} Hotel.</p>
                      
                      <p className="text-gray-700 mt-4 text-sm leading-relaxed">
                        {mainCity} is the federal capital and the largest city in the region. 
                        Literally meaning "muddy river confluence", {mainCity} has grown from a small sleepy village 
                        to a bustling metropolis. A cultural melting pot with some of...
                        <button className="text-blue-600 hover:underline ml-1">...more</button>
                      </p>
                      
                      <div className="mt-4 bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <Info size={16} />
                          <span className="font-medium">Notes:</span>
                        </div>
                        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                          <li>Valid for Pickups between 6 am - 11 pm. Pickups between 11 pm and 6 am will attract a Surcharge.</li>
                          <li>Estimated tour: 3 hrs</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* City Tour Section */}
                {proposal.cities?.map((city, cityIdx) => {
                  const hotel = getHotelForCity(city.name);
                  return (
                    <div key={cityIdx} className="mb-8">
                      {/* Tour Activity */}
                      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
                        <div className="flex items-start gap-3">
                          <Camera size={20} className="text-gray-400 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-800">{city.name} City Tour - Private Transfers</span>
                              <button className="text-xs text-blue-600 border border-blue-500 px-2 py-0.5 rounded hover:bg-blue-50 font-medium">
                                VIEW
                              </button>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Starts at 10:00 am, 11:00 am, 12:00 pm, 1:00 pm (Duration: 3 hrs)</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Check size={14} className="text-green-500" />
                              <span className="text-sm text-gray-600">Pick up time 12:00 pm</span>
                            </div>
                            <p className="text-sm text-gray-500 ml-6">Start from {hotel?.name || 'Hotel'}</p>
                            <span className="inline-block mt-2 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded font-medium">
                              Private Transfers
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Overnight Stay */}
                      {hotel && (
                        <div className="flex items-center gap-3 py-4 px-6 bg-gray-50 rounded-xl mb-4">
                          <Bed size={20} className="text-gray-400" />
                          <span className="text-gray-700">Overnight stay at <span className="font-medium">{hotel.name}</span></span>
                        </div>
                      )}

                      {/* Meals */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 py-3 px-6 border-b border-gray-100">
                          <Utensils size={18} className="text-gray-300" />
                          <div>
                            <span className="text-gray-500">Lunch</span>
                            <p className="text-xs text-gray-400">Not Included</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-3 px-6 border-b border-gray-100">
                          <Moon size={18} className="text-gray-300" />
                          <div>
                            <span className="text-gray-500">Dinner</span>
                            <p className="text-xs text-gray-400">Not Included</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* INCLUSIONS Tab */}
            {activeTab === 'inclusions' && (
              <div className="bg-white rounded-xl p-6 shadow-sm" data-testid="inclusions-content">
                <div className="flex items-center justify-center my-8">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <h2 className="px-6 text-xl font-bold text-gray-800 tracking-wider">INCLUSIONS</h2>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {proposal.cities?.map((city, idx) => {
                  const hotel = getHotelForCity(city.name);
                  return (
                    <div key={idx} className="mb-10 bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                          <MapPin size={16} className="text-white" />
                        </div>
                        <span className="text-lg font-bold text-gray-800">{city.name}</span>
                        <span className="text-gray-500">{city.nights} nights</span>
                      </div>

                      {hotel && (
                        <div className="mb-6 pl-4 border-l-2 border-gray-200">
                          <div className="flex items-start gap-4">
                            <Hotel size={18} className="text-gray-400 mt-1" />
                            <div>
                              <p className="font-medium text-gray-800">Stay for {city.nights} nights at {hotel.name}</p>
                              <p className="text-sm text-gray-500">{hotel.selectedRoom?.name || '1 x Double Room'}</p>
                            </div>
                          </div>
                        </div>
                      )}

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

                {/* Exclusions */}
                <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Exclusions</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>Passport fees, immunization costs, city taxes at the hotel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>Optional enhancements like room or flight upgrades</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>Additional sightseeing and activities outside of the itinerary</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>Early check-in or late check-out from hotels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">•</span>
                      <span>Meals not specified in the itinerary</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* TERMS AND POLICIES Tab */}
            {activeTab === 'terms' && (
              <div className="bg-white rounded-xl shadow-sm" data-testid="terms-content">
                {termsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-gray-400 mr-2" size={24} />
                    <span className="text-gray-500">Loading terms and policies...</span>
                  </div>
                ) : termsError && termsAndPolicies.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500">{termsError}</p>
                  </div>
                ) : termsAndPolicies.length > 0 ? (
                  // Dynamic Terms from API
                  termsAndPolicies.map((term) => {
                    const IconComponent = TERMS_ICONS[term.icon] || Info;
                    return (
                      <ExpandableSection 
                        key={term.id} 
                        title={term.title} 
                        icon={IconComponent}
                        defaultExpanded={term.is_expanded_default}
                      >
                        {/* Special styling for Commitments category */}
                        {term.category === 'Commitments' && term.content?.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                            {term.content.map((item, idx) => (
                              <p key={idx}>{item}</p>
                            ))}
                          </div>
                        )}
                        
                        {/* Regular content items */}
                        {term.category !== 'Commitments' && term.content?.length > 0 && (
                          <ul className="list-disc list-inside space-y-2 text-gray-600">
                            {term.content.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        )}
                        
                        {/* Sub-sections (e.g., General, Hotel, Europe under Important Notes) */}
                        {term.sub_sections?.length > 0 && (
                          <div className="space-y-4">
                            {term.sub_sections.map((section, sIdx) => (
                              <div key={sIdx}>
                                <h4 className="font-semibold text-gray-800 mb-2">{section.title}</h4>
                                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                                  {section.items?.map((item, iIdx) => (
                                    <li key={iIdx}>{item}</li>
                                  ))}
                                </ol>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Show empty state if no content */}
                        {(!term.content || term.content.length === 0) && 
                         (!term.sub_sections || term.sub_sections.length === 0) && (
                          <p className="text-gray-400 italic">No content available.</p>
                        )}
                      </ExpandableSection>
                    );
                  })
                ) : (
                  // Fallback to hardcoded content if no policies from API
                  <>
                    <ExpandableSection title="Any Other Commitments" icon={CheckCircle}>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                        If any other service or commitments have been made apart from the inclusions, please mention them here.
                      </div>
                    </ExpandableSection>

                    <ExpandableSection title="Important Notes" icon={Info} defaultExpanded={true}>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">General</h4>
                          <ol className="list-decimal list-inside space-y-2 text-gray-600">
                            <li>Tickets to attractions are not included unless mentioned.</li>
                            <li>For cancellations, refer to our Cancellation Policy.</li>
                            <li>Passport must be valid for 6 months from travel date.</li>
                          </ol>
                        </div>
                      </div>
                    </ExpandableSection>

                    <ExpandableSection title="Terms and Conditions" icon={Shield}>
                      <ul className="list-disc list-inside space-y-2 text-gray-600">
                        <li>Airline seats and hotel rooms subject to availability.</li>
                        <li>No refund for unused nights or early check-out.</li>
                        <li>Check-in/out times as per hotel policies.</li>
                      </ul>
                    </ExpandableSection>

                    <ExpandableSection title="Hotel Cancellation Policy" icon={Hotel}>
                      <ul className="list-disc list-inside space-y-2 text-gray-600">
                        <li>Hotel cancellation as per hotel policy.</li>
                        <li>Non-refundable hotels will not be refunded.</li>
                        <li>5% service charge on cancellations.</li>
                      </ul>
                    </ExpandableSection>

                    <ExpandableSection title="Payment Policies" icon={CreditCard}>
                      <ul className="list-disc list-inside space-y-2 text-gray-600">
                        <li>Full payment required at time of booking.</li>
                        <li>Always pay via official website or company bank account.</li>
                      </ul>
                    </ExpandableSection>
                  </>
                )}
              </div>
            )}

            {/* NEED HELP Tab */}
            {activeTab === 'help' && (
              <div className="bg-white rounded-xl p-6 shadow-sm" data-testid="help-content">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Need Help?</h2>
                <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                  <p className="text-gray-600 mb-6">Our support team is here to assist you.</p>
                  <div className="flex flex-wrap gap-4">
                    <button className="px-6 py-3 bg-[#002B5B] text-white rounded-lg font-medium hover:bg-[#003d82]">
                      Contact Support
                    </button>
                    <button className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 flex items-center gap-2">
                      <MessageCircle size={18} />
                      WhatsApp
                    </button>
                    <button className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 flex items-center gap-2">
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

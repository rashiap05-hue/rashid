import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Users, Clock, Star, Hotel, Plane, Car, 
  ChevronDown, ChevronUp, Check, X, AlertTriangle, Play,
  Download, Mail, MessageCircle, DollarSign, CreditCard, HelpCircle,
  Coffee, Utensils, Sun, Moon, Plus, Edit2, Trash2, Bed, Info, Eye,
  FileText, ChevronRight, Shield, Briefcase, AlertCircle, List,
  MessageSquare, Phone, CheckCircle, Menu, Camera, Loader2, MoreVertical, User
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

// Video Modal Component
function VideoModal({ isOpen, onClose, videoUrl, title }) {
  if (!isOpen) return null;
  
  // Check if it's a YouTube URL
  const isYouTubeUrl = (url) => {
    return url?.includes('youtube.com') || url?.includes('youtu.be');
  };
  
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <X size={20} />
        </button>
        {title && (
          <div className="absolute top-4 left-4 z-10 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-white font-medium">
            {title}
          </div>
        )}
        <div className="aspect-video">
          {isYouTubeUrl(videoUrl) ? (
            <iframe
              src={getYouTubeEmbedUrl(videoUrl)}
              title={title || "Video"}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
              <p>No video available for this destination</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

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

// Left Sidebar Navigation with Trip Timeline
function LeftSidebarNav({ proposal, activeSection, onSectionChange }) {
  const nightsCount = proposal?.cities?.reduce((acc, c) => acc + (c.nights || 0), 0) || 1;
  const daysCount = nightsCount + 1;
  const mainCity = proposal?.cities?.[0]?.name || 'Unknown';
  
  // Build timeline items
  const timelineItems = [
    { id: 'flights', type: 'section', icon: Plane, label: 'Flights' },
  ];
  
  // Add city nights
  proposal?.cities?.forEach((city, idx) => {
    timelineItems.push({
      id: `city-${idx}`,
      type: 'city',
      icon: Hotel,
      label: `${city.nights} Nights ${city.name}`,
      city: city.name,
      nights: city.nights
    });
  });
  
  // Add days
  for (let i = 1; i <= daysCount; i++) {
    const isFirst = i === 1;
    const isLast = i === daysCount;
    timelineItems.push({
      id: `day-${i}`,
      type: 'day',
      day: i,
      label: isFirst ? 'Arrival' : isLast ? 'Departure' : `Day ${i}`,
      subLabel: isFirst ? `Day${i}` : isLast ? `Day${i}` : ''
    });
  }
  
  // Add travel insurance
  timelineItems.push({ id: 'insurance', type: 'section', icon: Shield, label: 'Travel Insurance' });
  
  return (
    <div className="fixed left-0 top-1/3 bg-white border-r border-gray-200 shadow-lg z-30 hidden lg:flex flex-col py-2 rounded-r-lg max-h-[60vh] overflow-y-auto">
      <div className="px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Trip Overview</span>
      </div>
      
      {timelineItems.map((item, idx) => (
        <button
          key={item.id}
          onClick={() => onSectionChange(item.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-left transition-colors text-sm",
            activeSection === item.id 
              ? "bg-teal-50 text-teal-700 border-l-2 border-teal-500" 
              : "text-gray-600 hover:bg-gray-50 border-l-2 border-transparent"
          )}
        >
          {item.type === 'section' && item.icon && (
            <item.icon size={14} className="flex-shrink-0" />
          )}
          {item.type === 'city' && (
            <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-teal-600">{item.city?.charAt(0)}</span>
            </div>
          )}
          {item.type === 'day' && (
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-gray-500">{item.day}</span>
            </div>
          )}
          <span className="truncate text-xs">{item.label}</span>
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
  const totalPax = adultsCount + childrenCount;
  
  // Get vehicle type based on passengers
  const getVehicleTypeForPax = (pax) => {
    if (pax <= 4) return { key: 'sedan_4', label: '4 Seater Sedan', icon: '🚗' };
    if (pax <= 7) return { key: 'car_7', label: '7 Seater Car', icon: '🚙' };
    if (pax <= 8) return { key: 'van_8', label: '8 Seater Van', icon: '🚐' };
    if (pax <= 17) return { key: 'van_17', label: '17 Seater Van', icon: '🚐' };
    if (pax <= 29) return { key: 'bus_29', label: '29 Seater Bus', icon: '🚌' };
    if (pax <= 45) return { key: 'bus_45', label: '45 Seater Bus', icon: '🚌' };
    return { key: 'bus_55', label: '55 Seater Bus', icon: '🚌' };
  };
  
  const vehicleType = proposal.vehicle_label 
    ? { label: proposal.vehicle_label, icon: proposal.vehicle_type?.includes('sedan') ? '🚗' : proposal.vehicle_type?.includes('car') ? '🚙' : proposal.vehicle_type?.includes('bus') ? '🚌' : '🚐' }
    : getVehicleTypeForPax(totalPax);
  
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
          
          {/* Vehicle Type Badge */}
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2 mb-3 border border-blue-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">{vehicleType.icon}</span>
              <span className="text-sm font-medium text-blue-800">{vehicleType.label}</span>
            </div>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
              {totalPax} pax
            </span>
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
  
  // Video modal state
  const [videoModal, setVideoModal] = useState({ open: false, url: null, title: '' });
  
  // Dynamic Terms & Policies state
  const [termsAndPolicies, setTermsAndPolicies] = useState([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState(null);
  
  // Destination videos state
  const [destinationVideo, setDestinationVideo] = useState(null);

  // Fetch destination video from activities/transfers
  useEffect(() => {
    const fetchDestinationVideo = async () => {
      if (!proposal) return;
      
      const mainCity = proposal.cities?.[0]?.name || '';
      if (!mainCity) return;
      
      try {
        // Try to find videos from activities for this city
        const activitiesRes = await api.get(`/activities?city=${encodeURIComponent(mainCity)}`);
        const activities = activitiesRes.data?.activities || [];
        const activityWithVideo = activities.find(a => a.video);
        if (activityWithVideo?.video) {
          setDestinationVideo(activityWithVideo.video);
          return;
        }
        
        // Try transfers if no activity video
        const transfersRes = await api.get(`/transfers?city=${encodeURIComponent(mainCity)}`);
        const transfers = transfersRes.data?.transfers || [];
        const transferWithVideo = transfers.find(t => t.video);
        if (transferWithVideo?.video) {
          setDestinationVideo(transferWithVideo.video);
        }
      } catch (error) {
        console.log('Could not fetch destination video:', error);
      }
    };
    
    fetchDestinationVideo();
  }, [proposal]);

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
    { id: 'itinerary', label: 'Itinerary', icon: Plane },
    { id: 'inclusions', label: 'Inclusions', icon: FileText },
    { id: 'terms', label: 'Terms and Policies', icon: Shield },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'changes', label: 'Request Changes', icon: Edit2 }
  ];

  return (
    <div className="min-h-screen bg-white" data-testid="proposal-view-page">
      {/* Left Sidebar Nav */}
      <LeftSidebarNav proposal={proposal} activeSection={activeSection} onSectionChange={setActiveSection} />

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
              <div className="flex items-center gap-4 mb-2">
                <p className="text-sm text-gray-500">Proposal No: <span className="font-semibold text-gray-700">{proposalNumber}</span></p>
                <div className="flex items-center gap-2">
                  <button 
                    className="px-4 py-1.5 bg-[#002B5B] text-white text-sm font-medium rounded hover:bg-[#003d82] transition-colors"
                    data-testid="save-proposal-btn"
                  >
                    Save
                  </button>
                  <button 
                    onClick={onBack}
                    className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
                    data-testid="cancel-proposal-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
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
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total Price</p>
                <p className="text-lg font-bold text-teal-400">AED {proposal.total_price || 1500}</p>
              </div>
              <button 
                className="px-5 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                data-testid="book-now-header-btn"
              >
                Book Now
              </button>
            </div>
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
                    <button 
                      onClick={() => setVideoModal({ open: true, url: destinationVideo, title: `Discover ${mainCity}` })}
                      className="w-16 h-16 bg-white/90 rounded-lg flex items-center justify-center shadow-lg hover:bg-white transition-colors group"
                      data-testid="play-video-btn"
                    >
                      <Play size={28} className="text-gray-700 ml-1 group-hover:text-[#002B5B]" />
                    </button>
                  </div>
                  {destinationVideo && (
                    <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Play size={12} />
                      <span>Video Available</span>
                    </div>
                  )}
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
                <div className="bg-white border border-gray-200 rounded-xl mb-8 shadow-sm" data-testid="flights-section">
                  {/* Flights Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Plane size={20} className="text-gray-700" />
                      <h2 className="text-xl font-semibold text-gray-800">Flights</h2>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical size={18} className="text-gray-500" />
                    </button>
                  </div>

                  {/* Outbound Flight */}
                  <div className="p-6">
                    {/* Flight Route Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <Plane size={16} className="text-gray-600" />
                      <span className="font-medium text-gray-800">
                        {proposal.leaving_from?.split('(')[0]?.trim() || 'Origin'} to {mainCity}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {formatDate(proposal.leaving_on, 'full')}
                      </span>
                    </div>

                    {/* Airline Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                          <X size={16} className="text-orange-500" />
                        </div>
                        <span className="text-gray-700 font-medium">
                          {proposal.arrival_flight_info?.airline || 'Airline'} {proposal.arrival_flight_info?.flightNumber || 'IX-000'}
                        </span>
                      </div>
                    </div>

                    {/* Flight Timeline */}
                    <div className="flex">
                      {/* Left: Time and Route */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          {/* Timeline */}
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full border-2 border-gray-400 bg-white"></div>
                            <div className="w-0.5 h-16 bg-gray-300 border-l border-dashed border-gray-400"></div>
                            <div className="w-3 h-3 rounded-full border-2 border-gray-400 bg-white"></div>
                          </div>
                          {/* Flight Details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-8 mb-2">
                              <span className="font-semibold text-gray-800 w-20">
                                {proposal.arrival_flight_info?.flightTime || '00:00'}
                              </span>
                              <span className="text-gray-600">
                                {proposal.leaving_from?.split('(')[1]?.replace(')', '') || 'DEP'}, Terminal
                              </span>
                              <span className="text-gray-500 text-sm ml-auto">
                                {formatDate(proposal.leaving_on, 'full')}
                              </span>
                            </div>
                            <div className="text-gray-500 text-sm mb-4 ml-28">
                              {proposal.arrival_flight_info?.duration || '4h 00m'}
                            </div>
                            <div className="flex items-center gap-8">
                              <span className="font-semibold text-gray-800 w-20">
                                {proposal.arrival_flight_info?.arrivalTime || '00:00'}
                              </span>
                              <span className="text-gray-600">
                                {mainCity} Intl Airport ({proposal.cities?.[0]?.airport_code || 'ARR'})
                              </span>
                              <span className="text-gray-500 text-sm ml-auto">
                                {formatDate(proposal.leaving_on, 'full')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amenities */}
                      <div className="w-48 pl-6 border-l border-gray-200">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-2">
                              <Briefcase size={14} />
                              Baggage
                            </span>
                            <span className="text-gray-700 font-medium">30Kg</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-2">
                              <Utensils size={14} />
                              Meals
                            </span>
                            <span className="text-gray-700">At Extra Cost</span>
                          </div>
                          <div className="text-gray-400 text-xs">non-refundable</div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-2">
                              <User size={14} />
                              Cabin
                            </span>
                            <span className="text-gray-700 font-medium">Economy</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Return Flight */}
                  <div className="p-6 border-t border-gray-100">
                    {/* Flight Route Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <Plane size={16} className="text-gray-600 rotate-180" />
                      <span className="font-medium text-gray-800">
                        {mainCity} to {proposal.leaving_from?.split('(')[0]?.trim() || 'Origin'}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {(() => {
                          const startDate = new Date(proposal.leaving_on);
                          startDate.setDate(startDate.getDate() + nightsCount);
                          return formatDate(startDate.toISOString(), 'full');
                        })()}
                      </span>
                    </div>

                    {/* Airline Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                          <X size={16} className="text-orange-500" />
                        </div>
                        <span className="text-gray-700 font-medium">
                          {proposal.departure_flight_info?.airline || 'Airline'} {proposal.departure_flight_info?.flightNumber || 'IX-000'}
                        </span>
                      </div>
                    </div>

                    {/* Flight Timeline */}
                    <div className="flex">
                      {/* Left: Time and Route */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          {/* Timeline */}
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full border-2 border-gray-400 bg-white"></div>
                            <div className="w-0.5 h-16 bg-gray-300 border-l border-dashed border-gray-400"></div>
                            <div className="w-3 h-3 rounded-full border-2 border-gray-400 bg-white"></div>
                          </div>
                          {/* Flight Details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-8 mb-2">
                              <span className="font-semibold text-gray-800 w-20">
                                {proposal.departure_flight_info?.flightTime || '00:00'}
                              </span>
                              <span className="text-gray-600">
                                {mainCity} Intl Airport ({proposal.cities?.[0]?.airport_code || 'DEP'}), Terminal
                              </span>
                              <span className="text-gray-500 text-sm ml-auto">
                                {(() => {
                                  const startDate = new Date(proposal.leaving_on);
                                  startDate.setDate(startDate.getDate() + nightsCount);
                                  return formatDate(startDate.toISOString(), 'full');
                                })()}
                              </span>
                            </div>
                            <div className="text-gray-500 text-sm mb-4 ml-28">
                              {proposal.departure_flight_info?.duration || '4h 00m'}
                            </div>
                            <div className="flex items-center gap-8">
                              <span className="font-semibold text-gray-800 w-20">
                                {proposal.departure_flight_info?.arrivalTime || '00:00'}<sup className="text-orange-500">+1</sup>
                              </span>
                              <span className="text-gray-600">
                                {proposal.leaving_from?.split('(')[1]?.replace(')', '') || 'ARR'}
                              </span>
                              <span className="text-gray-500 text-sm ml-auto">
                                {(() => {
                                  const startDate = new Date(proposal.leaving_on);
                                  startDate.setDate(startDate.getDate() + nightsCount + 1);
                                  return formatDate(startDate.toISOString(), 'full');
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amenities */}
                      <div className="w-48 pl-6 border-l border-gray-200">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-2">
                              <Briefcase size={14} />
                              Baggage
                            </span>
                            <span className="text-gray-700 font-medium">30Kg</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-2">
                              <Utensils size={14} />
                              Meals
                            </span>
                            <span className="text-gray-700">At Extra Cost</span>
                          </div>
                          <div className="text-gray-400 text-xs">non-refundable</div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-2">
                              <User size={14} />
                              Cabin
                            </span>
                            <span className="text-gray-700 font-medium">Economy</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* City Tour Section */}
                {proposal.cities?.map((city, cityIdx) => {
                  const hotel = getHotelForCity(city.name);
                  // Get activities for this city from selected_activities
                  // Handle multiple key formats: 'CityName_day', cityIdx, or String(cityIdx)
                  const getAllActivitiesForCity = () => {
                    const activities = [];
                    const selectedActs = proposal.selected_activities || {};
                    
                    // Check for city_day format (e.g., "Tbilisi_1", "Tbilisi_2")
                    Object.keys(selectedActs).forEach(key => {
                      if (key.startsWith(city.name + '_')) {
                        const dayActivities = selectedActs[key];
                        if (Array.isArray(dayActivities)) {
                          activities.push(...dayActivities);
                        }
                      }
                    });
                    
                    // Also check numeric/string index formats for backward compatibility
                    if (activities.length === 0) {
                      const indexActivities = selectedActs[cityIdx] || selectedActs[String(cityIdx)] || [];
                      if (Array.isArray(indexActivities)) {
                        activities.push(...indexActivities);
                      }
                    }
                    
                    return activities;
                  };
                  
                  const cityActivities = getAllActivitiesForCity();
                  
                  return (
                    <div key={cityIdx} className="mb-8">
                      {/* Tour Activity */}
                      {cityActivities.length > 0 ? (
                        // Show actual selected activities
                        cityActivities.map((activity, actIdx) => (
                          <div key={actIdx} className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
                            <div className="flex items-start gap-3">
                              <Camera size={20} className="text-gray-400 mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-gray-800">{activity.name}</span>
                                  <button className="text-xs text-blue-600 border border-blue-500 px-2 py-0.5 rounded hover:bg-blue-50 font-medium">
                                    VIEW
                                  </button>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  {activity.start_times?.length > 0 
                                    ? `Starts at ${activity.start_times.slice(0,4).join(', ')}` 
                                    : 'Flexible timing'
                                  } (Duration: {activity.duration || '3 hrs'})
                                </p>
                                
                                {/* Activity Inclusions */}
                                {activity.inclusions?.length > 0 && (
                                  <div className="mt-3 space-y-1.5">
                                    {activity.inclusions.map((inclusion, incIdx) => (
                                      <div key={incIdx} className="flex items-start gap-2">
                                        <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-600">{inclusion}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Activity Highlights */}
                                {activity.highlights?.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {activity.highlights.slice(0, 3).map((highlight, hIdx) => (
                                      <span key={hIdx} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                                        {highlight}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                
                                <span className="inline-block mt-3 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded font-medium">
                                  {activity.transfer_type || 'Private'} Transfers
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        // Default city tour if no activities selected
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
                      )}

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
                  // Get activities for this city - handle multiple key formats
                  const getAllActivitiesForCityInclusions = () => {
                    const activities = [];
                    const selectedActs = proposal.selected_activities || {};
                    
                    // Check for city_day format (e.g., "Tbilisi_1", "Tbilisi_2")
                    Object.keys(selectedActs).forEach(key => {
                      if (key.startsWith(city.name + '_')) {
                        const dayActivities = selectedActs[key];
                        if (Array.isArray(dayActivities)) {
                          activities.push(...dayActivities);
                        }
                      }
                    });
                    
                    // Also check numeric/string index formats
                    if (activities.length === 0) {
                      const indexActivities = selectedActs[idx] || selectedActs[String(idx)] || [];
                      if (Array.isArray(indexActivities)) {
                        activities.push(...indexActivities);
                      }
                    }
                    
                    return activities;
                  };
                  
                  const cityActivities = getAllActivitiesForCityInclusions();
                  
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

                      {/* Show Activities with Inclusions */}
                      {cityActivities.length > 0 && (
                        <div className="mb-6 space-y-4">
                          {cityActivities.map((activity, actIdx) => (
                            <div key={actIdx} className="pl-4 border-l-2 border-teal-200">
                              <div className="flex items-start gap-4">
                                <Camera size={18} className="text-teal-500 mt-1" />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800">{activity.name}</p>
                                  <p className="text-sm text-gray-500">{activity.duration || 'Full Day'} • {activity.transfer_type || 'Private'}</p>
                                  
                                  {/* Activity Inclusions */}
                                  {activity.inclusions?.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {activity.inclusions.map((inclusion, incIdx) => (
                                        <div key={incIdx} className="flex items-start gap-2">
                                          <Check size={12} className="text-green-500 mt-1 flex-shrink-0" />
                                          <span className="text-sm text-gray-600">{inclusion}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
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

            {/* MESSAGES Tab */}
            {activeTab === 'messages' && (
              <div className="bg-white rounded-xl p-6 shadow-sm" data-testid="messages-content">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Send a message to the advisor</h2>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <textarea
                      placeholder="Type your message here..."
                      className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none"
                      data-testid="message-textarea"
                    />
                    <div className="mt-4 flex justify-end">
                      <button className="px-6 py-2.5 bg-[#002B5B] text-white rounded-lg font-medium hover:bg-[#003d82] flex items-center gap-2">
                        <MessageSquare size={16} />
                        Send
                      </button>
                    </div>
                  </div>
                  
                  {/* Chat History */}
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-4">Message History</h3>
                    <div className="text-center text-gray-400 py-8">
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* REQUEST CHANGES Tab */}
            {activeTab === 'changes' && (
              <div className="bg-white rounded-xl p-6 shadow-sm" data-testid="changes-content">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Request Changes</h2>
                <div className="space-y-4">
                  {/* More Actions */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                    <h3 className="font-medium text-gray-800 mb-4">More Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-[#002B5B] hover:bg-blue-50 transition-all text-left">
                        <Phone size={18} className="text-[#002B5B]" />
                        <div>
                          <p className="font-medium text-gray-800">Request Callback</p>
                          <p className="text-sm text-gray-500">Call me to explain proposal</p>
                        </div>
                      </button>
                      
                      <button className="w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-[#002B5B] hover:bg-blue-50 transition-all text-left">
                        <Edit2 size={18} className="text-[#002B5B]" />
                        <div>
                          <p className="font-medium text-gray-800">I want changes in flight / hotel / itinerary</p>
                        </div>
                      </button>
                      
                      <button className="w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all text-left">
                        <X size={18} className="text-red-500" />
                        <div>
                          <p className="font-medium text-gray-800">I have cancelled / postponed my plans</p>
                        </div>
                      </button>
                      
                      <button className="w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-left">
                        <DollarSign size={18} className="text-green-600" />
                        <div>
                          <p className="font-medium text-gray-800">I want lower prices</p>
                        </div>
                      </button>
                    </div>
                  </div>
                  
                  {/* Lower Price Form */}
                  <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                    <h3 className="font-medium text-amber-800 mb-3">LOWER PRICE ELSEWHERE</h3>
                    <p className="text-sm text-amber-700 mb-4">Found a better price? Let us know and we'll try to match it.</p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Competitor website/agency name"
                        className="w-full px-4 py-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Indicative Price*"
                        className="w-full px-4 py-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                      />
                      <p className="text-xs text-amber-600">*Please make sure indicative price is reasonable to allow us to come back with suitable offers</p>
                      <button className="w-full py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700">
                        Submit
                      </button>
                    </div>
                  </div>
                  
                  {/* Share on WhatsApp */}
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <h3 className="font-medium text-green-800 mb-4">Share on WhatsApp</h3>
                    <div className="space-y-3">
                      <input
                        type="tel"
                        placeholder="Mobile Number"
                        className="w-full px-4 py-2.5 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      />
                      <textarea
                        placeholder="Message to Share"
                        className="w-full px-4 py-2.5 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white h-20 resize-none"
                        defaultValue={`Check out this trip proposal: ${proposal.proposal_name || `Trip to ${mainCity}`}`}
                      />
                      <button className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                        <MessageCircle size={18} />
                        Share on WhatsApp
                      </button>
                    </div>
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
      
      {/* Video Modal */}
      <AnimatePresence>
        {videoModal.open && (
          <VideoModal
            isOpen={videoModal.open}
            videoUrl={videoModal.url}
            title={videoModal.title}
            onClose={() => setVideoModal({ open: false, url: null, title: '' })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

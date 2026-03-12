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
  } else if (format === 'numeric') {
    // Format like 3/10/2026
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  } else if (format === 'full') {
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
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
        <div className="max-w-[1600px] mx-auto px-6 py-3 lg:pl-20">
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
        <div className="max-w-[1600px] mx-auto px-6 py-6 lg:pl-20">
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
              onClick={async () => {
                try {
                  const response = await api.get(`/proposals/${proposal.id}/pdf`, { responseType: 'blob' });
                  const blob = new Blob([response.data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `Travo_DMC_${(proposal.proposal_name || 'Proposal').replace(/\s+/g, '_')}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('PDF download error:', err);
                  alert('Failed to generate PDF. Please try again.');
                }
              }}
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
        <div className="max-w-[1600px] mx-auto px-6 lg:pl-20">
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
      <div className="max-w-[1600px] mx-auto px-6 py-8 lg:pl-20 mt-14">
        <div className="flex gap-8">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0 max-w-[1100px]">
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
                      <Plane size={18} className="text-gray-600 -rotate-45" />
                      <h2 className="text-lg font-semibold text-gray-800">Flights</h2>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical size={18} className="text-gray-400" />
                    </button>
                  </div>

                  {/* Outbound Flight */}
                  <div className="p-6">
                    {/* Flight Route Header */}
                    <div className="flex items-center gap-2 mb-5">
                      <Plane size={14} className="text-gray-500 -rotate-45" />
                      <span className="font-medium text-gray-700">
                        {proposal.leaving_from?.split('(')[0]?.trim() || 'Origin'} to {mainCity}
                      </span>
                      <span className="text-gray-400 text-sm ml-2">
                        {formatDate(proposal.leaving_on, 'full')}
                      </span>
                    </div>

                    {/* Airline Info */}
                    <div className="bg-gray-50 rounded-lg px-4 py-3 mb-5 inline-flex items-center gap-3">
                      <div className="w-6 h-6 flex items-center justify-center">
                        <X size={18} className="text-orange-500" strokeWidth={3} />
                      </div>
                      <span className="text-gray-600">
                        {proposal.arrival_flight_info?.airline || 'AirIndiaExpress'} <span className="ml-2">{proposal.arrival_flight_info?.flightNumber || 'IX-343'}</span>
                      </span>
                    </div>

                    {/* Flight Timeline - 3 Column Layout */}
                    <div className="flex items-stretch">
                      {/* Left Column: Time and Route */}
                      <div className="flex-1 pr-8">
                        <div className="flex gap-4">
                          {/* Time Column */}
                          <div className="w-20">
                            <p className="text-gray-800 font-medium">{proposal.arrival_flight_info?.flightTime || '02:10 PM'}</p>
                            <p className="text-gray-400 text-sm py-6">{proposal.arrival_flight_info?.duration || '4h 25m'}</p>
                            <p className="text-gray-800 font-medium">{proposal.arrival_flight_info?.arrivalTime || '05:05 PM'}</p>
                          </div>
                          
                          {/* Timeline dots */}
                          <div className="flex flex-col items-center py-1">
                            <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 bg-white"></div>
                            <div className="w-px flex-1 border-l border-dashed border-gray-300"></div>
                            <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 bg-white"></div>
                          </div>
                          
                          {/* Airport Names */}
                          <div className="flex-1">
                            <p className="text-gray-600">{proposal.leaving_from_code || 'Kozhikode (CCJ)'}, Terminal</p>
                            <div className="py-6"></div>
                            <p className="text-gray-600">{mainCity} Intl Airport (DXB)</p>
                          </div>
                        </div>
                      </div>

                      {/* Right Section: Date + Amenities */}
                      <div className="flex">
                        {/* Date Column */}
                        <div className="w-32 flex flex-col justify-between py-1 pr-6">
                          <p className="text-gray-500 text-sm">{formatDate(proposal.leaving_on, 'full')}</p>
                          <p className="text-gray-500 text-sm">{formatDate(proposal.leaving_on, 'full')}</p>
                        </div>

                        {/* Amenities Column */}
                        <div className="w-56 border-l border-gray-200 pl-6 flex flex-col justify-between py-1">
                          <div className="space-y-4">
                            <div className="flex items-center">
                              <Briefcase size={14} className="text-gray-400 mr-4" />
                              <span className="text-gray-400 w-16">Baggage</span>
                              <span className="text-gray-700 font-medium ml-auto">30Kg</span>
                            </div>
                            <div className="flex items-center">
                              <Utensils size={14} className="text-gray-400 mr-4" />
                              <span className="text-gray-400 w-16">Meals</span>
                              <span className="text-gray-700 ml-auto">At Extra Cost</span>
                            </div>
                            <div className="text-gray-300 text-sm pl-8">non-refundable</div>
                            <div className="flex items-center">
                              <User size={14} className="text-gray-400 mr-4" />
                              <span className="text-gray-400 w-16">Cabin</span>
                              <span className="text-gray-700 font-medium ml-auto">Economy</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Return Flight */}
                  <div className="p-6 border-t border-gray-100">
                    {/* Flight Route Header */}
                    <div className="flex items-center gap-2 mb-5">
                      <Plane size={14} className="text-gray-500 rotate-[135deg]" />
                      <span className="font-medium text-gray-700">
                        {mainCity} to {proposal.leaving_from?.split('(')[0]?.trim() || 'Origin'}
                      </span>
                      <span className="text-gray-400 text-sm ml-2">
                        {(() => {
                          const returnDate = new Date(proposal.leaving_on);
                          returnDate.setDate(returnDate.getDate() + nightsCount);
                          return formatDate(returnDate.toISOString(), 'full');
                        })()}
                      </span>
                    </div>

                    {/* Airline Info */}
                    <div className="bg-gray-50 rounded-lg px-4 py-3 mb-5 inline-flex items-center gap-3">
                      <div className="w-6 h-6 flex items-center justify-center">
                        <X size={18} className="text-orange-500" strokeWidth={3} />
                      </div>
                      <span className="text-gray-600">
                        {proposal.departure_flight_info?.airline || 'AirIndiaExpress'} <span className="ml-2">{proposal.departure_flight_info?.flightNumber || 'IX-344'}</span>
                      </span>
                    </div>

                    {/* Flight Timeline - 3 Column Layout */}
                    <div className="flex items-stretch">
                      {/* Left Column: Time and Route */}
                      <div className="flex-1 pr-8">
                        <div className="flex gap-4">
                          {/* Time Column */}
                          <div className="w-20">
                            <p className="text-gray-800 font-medium">{proposal.departure_flight_info?.flightTime || '06:40 PM'}</p>
                            <p className="text-gray-400 text-sm py-6">{proposal.departure_flight_info?.duration || '3h 55m'}</p>
                            <p className="text-gray-800 font-medium">
                              {proposal.departure_flight_info?.arrivalTime || '12:05 AM'}<sup className="text-orange-500 text-[10px] ml-0.5">+1</sup>
                            </p>
                          </div>
                          
                          {/* Timeline dots */}
                          <div className="flex flex-col items-center py-1">
                            <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 bg-white"></div>
                            <div className="w-px flex-1 border-l border-dashed border-gray-300"></div>
                            <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 bg-white"></div>
                          </div>
                          
                          {/* Airport Names */}
                          <div className="flex-1">
                            <p className="text-gray-600">{mainCity} Intl Airport (DXB), Terminal</p>
                            <div className="py-6"></div>
                            <p className="text-gray-600">{proposal.leaving_from_code || 'Kozhikode (CCJ)'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right Section: Date + Amenities */}
                      <div className="flex">
                        {/* Date Column */}
                        <div className="w-32 flex flex-col justify-between py-1 pr-6">
                          <p className="text-gray-500 text-sm">
                            {(() => {
                              const returnDate = new Date(proposal.leaving_on);
                              returnDate.setDate(returnDate.getDate() + nightsCount);
                              return formatDate(returnDate.toISOString(), 'full');
                            })()}
                          </p>
                          <p className="text-gray-500 text-sm">
                            {(() => {
                              const arrivalDate = new Date(proposal.leaving_on);
                              arrivalDate.setDate(arrivalDate.getDate() + nightsCount + 1);
                              return formatDate(arrivalDate.toISOString(), 'full');
                            })()}
                          </p>
                        </div>

                        {/* Amenities Column */}
                        <div className="w-56 border-l border-gray-200 pl-6 flex flex-col justify-between py-1">
                          <div className="space-y-4">
                            <div className="flex items-center">
                              <Briefcase size={14} className="text-gray-400 mr-4" />
                              <span className="text-gray-400 w-16">Baggage</span>
                              <span className="text-gray-700 font-medium ml-auto">30Kg</span>
                            </div>
                            <div className="flex items-center">
                              <Utensils size={14} className="text-gray-400 mr-4" />
                              <span className="text-gray-400 w-16">Meals</span>
                              <span className="text-gray-700 ml-auto">At Extra Cost</span>
                            </div>
                            <div className="text-gray-300 text-sm pl-8">non-refundable</div>
                            <div className="flex items-center">
                              <User size={14} className="text-gray-400 mr-4" />
                              <span className="text-gray-400 w-16">Cabin</span>
                              <span className="text-gray-700 font-medium ml-auto">Economy</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hotel Section - Per City */}
                {proposal.cities?.map((city, cityIdx) => {
                  const hotel = getHotelForCity(city.name);
                  const checkInDate = new Date(proposal.leaving_on);
                  const checkOutDate = new Date(proposal.leaving_on);
                  checkOutDate.setDate(checkOutDate.getDate() + (city.nights || 1));
                  
                  return (
                    <div key={`hotel-${cityIdx}`} className="bg-white border border-gray-200 rounded-xl mb-8 shadow-sm overflow-hidden" data-testid={`hotel-section-${cityIdx}`}>
                      {/* City Header */}
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                        <MapPin size={20} className="text-gray-600" />
                        <h2 className="text-xl font-bold text-gray-800">{city.name}</h2>
                        <span className="text-gray-500">{city.nights || 1} nights</span>
                      </div>

                      {/* Hotel Card */}
                      <div className="p-6">
                        <div className="flex gap-6">
                          {/* Hotel Image */}
                          <div className="w-56 h-44 flex-shrink-0 rounded-lg overflow-hidden">
                            <img 
                              src={hotel?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'}
                              alt={hotel?.name || 'Hotel'}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Hotel Details */}
                          <div className="flex-1">
                            {/* Stars */}
                            <div className="flex mb-1">
                              {Array.from({ length: hotel?.star_rating || 3 }).map((_, i) => (
                                <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>

                            {/* Hotel Name */}
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-bold text-gray-800">{hotel?.name || 'Hotel Name'}</h3>
                              <button className="px-3 py-1 border border-teal-500 text-teal-600 text-xs font-medium rounded hover:bg-teal-50 transition-colors">
                                VIEW
                              </button>
                            </div>

                            {/* Location */}
                            <p className="text-teal-600 text-sm mb-3">{hotel?.location || hotel?.address || `${city.name} City Center`}</p>

                            {/* Rating */}
                            <div className="flex items-center gap-2 mb-4">
                              <div className="bg-[#002B5B] text-white px-2 py-1 rounded text-sm font-bold">
                                {hotel?.rating_score || '7.4'}
                              </div>
                              <div>
                                <span className="font-medium text-gray-800">{hotel?.rating_text || 'Good'}</span>
                                <span className="text-gray-400 text-sm ml-2">{hotel?.reviews_count || '941'} ratings</span>
                              </div>
                            </div>

                            {/* Check-in / Check-out */}
                            <div className="flex gap-8 mb-4">
                              <div>
                                <p className="text-gray-500 text-sm">Check-in</p>
                                <p className="font-medium text-gray-800">02:00 PM {formatDate(checkInDate, 'short')}</p>
                              </div>
                              <div className="border-l border-gray-200 pl-8">
                                <p className="text-gray-500 text-sm">Check-out</p>
                                <p className="font-medium text-gray-800">12:00 PM {formatDate(checkOutDate, 'short')}</p>
                              </div>
                            </div>

                            {/* Room Info */}
                            <div className="flex items-start gap-2 mb-3">
                              <CheckCircle size={18} className="text-teal-500 mt-0.5 flex-shrink-0" />
                              <p className="text-gray-700">
                                1 x {hotel?.selectedRoom?.name || 'Double Room'} - includes 20% off Food & Beverage (excluding in-room dining)
                              </p>
                            </div>

                            {/* Room Details */}
                            <div className="pl-6 space-y-1 text-sm text-gray-500 mb-3">
                              <p>1 Double Bed</p>
                              <p>Package rate</p>
                              <p>Free WiFi</p>
                              <p>Limited time offer</p>
                            </div>

                            <p className="text-gray-500 text-sm mb-2">No meals included</p>
                            <a href="#" className="text-teal-600 text-sm hover:underline">Fully refundable before {formatDate(new Date(checkInDate.getTime() - 86400000), 'day')}</a>
                          </div>

                          {/* 3-dot menu */}
                          <button className="self-start p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreVertical size={18} className="text-gray-400" />
                          </button>
                        </div>
                      </div>

                      {/* Tax Info */}
                      <div className="mx-6 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-gray-600 text-sm mb-2">You'll be asked to pay the following charges at the property:</p>
                        <ul className="list-disc list-inside text-gray-600 text-sm">
                          <li>A tax is imposed by the city: AED 10.00 per accommodation, per night</li>
                        </ul>
                      </div>

                      {/* What to know section */}
                      <div className="mx-6 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-4">What to know about this hotel</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <ul className="space-y-2 text-gray-600">
                            <li className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>Newly Renovated: Recently renovated in 2020</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>Spacious Rooms: Average 250 sq ft room size</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>Limited Amenities: No fitness center or spa</span>
                            </li>
                          </ul>
                          <ul className="space-y-2 text-gray-600">
                            <li className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>Local Shopping: Al Fahidi Street and Meena Bazaar nearby</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>Close to Metro: 5-minute walk to Al Fahidi Metro Station</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>Crowded Lift: Only 2 lifts, can be slow during peak hours</span>
                            </li>
                          </ul>
                          <ul className="space-y-2 text-gray-600">
                            <li className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>Variety Dining: Multiple dining options nearby</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>Lively Lobby: Spacious and modern lobby area</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-gray-400">•</span>
                              <span>Small Pool: Pool area is relatively small</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Warning Message */}
                      <div className="mx-6 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-700 text-sm">Based on expected time of departure, long wait is expected after check-out from the hotel</p>
                      </div>
                    </div>
                  );
                })}

                {/* Day-wise Itinerary Section */}
                <div className="mb-8" data-testid="day-wise-itinerary">
                  {/* Expand All Days Button */}
                  <div className="flex justify-end mb-4">
                    <button 
                      onClick={toggleAllDays}
                      className="text-orange-600 text-sm font-medium hover:text-orange-700 transition-colors"
                      data-testid="expand-all-days-btn"
                    >
                      {allExpanded ? '- COLLAPSE ALL DAYS' : '+ EXPAND ALL DAYS'}
                    </button>
                  </div>

                  {/* Generate Day Cards */}
                  {Array.from({ length: daysCount }).map((_, dayIndex) => {
                    const dayNum = dayIndex + 1;
                    const isArrivalDay = dayNum === 1;
                    const isDepartureDay = dayNum === daysCount;
                    const isMiddleDay = !isArrivalDay && !isDepartureDay;
                    const isExpanded = expandedDays[dayNum] || false;
                    
                    const dayDate = new Date(proposal.leaving_on);
                    dayDate.setDate(dayDate.getDate() + dayIndex);
                    
                    // Get activities for this day
                    const dayActivities = proposal.selected_activities?.[`${mainCity}_${dayNum}`] || [];
                    const hotel = getHotelForCity(mainCity);
                    
                    // Generate day title
                    let dayTitle = '';
                    if (isArrivalDay) {
                      dayTitle = `Arrival into ${mainCity}`;
                    } else if (isDepartureDay) {
                      dayTitle = `Departure from ${mainCity}`;
                    } else {
                      if (dayActivities.length > 0) {
                        const activityNames = dayActivities.slice(0, 2).map(a => a.name?.split(' - ')[0] || a.name).join(' - ');
                        dayTitle = activityNames;
                      } else {
                        dayTitle = `Day at leisure in ${mainCity}`;
                      }
                    }

                    return (
                      <div key={dayNum} className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden shadow-sm" data-testid={`day-card-${dayNum}`}>
                        {/* Day Header - Clickable to expand/collapse */}
                        <button
                          onClick={() => toggleDay(dayNum)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          data-testid={`day-toggle-${dayNum}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                              isArrivalDay ? "bg-orange-100 text-orange-700" :
                              isDepartureDay ? "bg-pink-100 text-pink-700" :
                              "bg-teal-100 text-teal-700"
                            )}>
                              {dayNum}
                            </div>
                            <div className="text-left">
                              <h3 className="text-base font-semibold text-gray-800">{dayTitle}</h3>
                              <p className="text-xs text-gray-500">{formatDate(dayDate, 'full')}</p>
                            </div>
                          </div>
                          <ChevronDown 
                            size={20} 
                            className={cn(
                              "text-gray-400 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )} 
                          />
                        </button>

                        {/* Day Content - Collapsible */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6 border-t border-gray-100">
                                {/* Arrival Day Content */}
                                {isArrivalDay && (
                                  <div className="pt-5 space-y-5">
                                    {/* Alert Banner */}
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                                      <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                                      <p className="text-sm text-orange-700">
                                        You will be met by our representative at the Airport Arrival Terminal. Our representative will be holding a signage card with your name on it.
                                      </p>
                                    </div>

                                    {/* Flight Info */}
                                    <div className="flex items-start gap-3 pl-2">
                                      <Plane size={18} className="text-gray-400 -rotate-45 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-gray-700">Flight Arrival</p>
                                        <p className="text-sm text-gray-500">
                                          {proposal.arrival_flight_info?.flightNumber || 'IX-343'} arriving on {formatDate(dayDate, 'day')} at {proposal.arrival_flight_info?.arrivalTime || '05:05 PM'} - {mainCity} Intl Airport
                                        </p>
                                      </div>
                                    </div>

                                    {/* Transfer */}
                                    <div className="pl-2">
                                      <div className="flex items-start gap-3">
                                        <Car size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-gray-700">
                                              One-way transfer from {proposal.leaving_from?.split('(')[0]?.trim() || 'Airport'} to {mainCity} Hotel
                                            </p>
                                            <button className="px-2 py-0.5 border border-teal-500 text-teal-600 text-xs rounded hover:bg-teal-50" data-testid={`transfer-view-day-${dayNum}`}>
                                              VIEW
                                            </button>
                                          </div>
                                          <div className="flex gap-2 mt-2">
                                            <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200">
                                              Private Transfers
                                            </span>
                                            <span className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200 flex items-center gap-1">
                                              <Briefcase size={11} />
                                              4 Bags
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Overnight Stay */}
                                    <div className="flex items-center gap-3 pl-2">
                                      <Bed size={18} className="text-gray-400 flex-shrink-0" />
                                      <p className="text-gray-600">Overnight stay at <span className="font-medium">{hotel?.name || 'Hotel'}</span></p>
                                    </div>

                                    {/* Meals Grid */}
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                      <div className="grid grid-cols-3 gap-4">
                                        <div className="flex items-center gap-3">
                                          <Coffee size={16} className="text-gray-300" />
                                          <div>
                                            <p className="text-sm text-gray-500">Breakfast</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Utensils size={16} className="text-gray-300" />
                                          <div>
                                            <p className="text-sm text-gray-500">Lunch</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Utensils size={16} className="text-gray-300" />
                                          <div>
                                            <p className="text-sm text-gray-500">Dinner</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Middle Day Content */}
                                {isMiddleDay && (
                                  <div className="pt-5 space-y-5">
                                    {/* Activities */}
                                    {dayActivities.length > 0 ? (
                                      dayActivities.map((activity, actIdx) => (
                                        <div key={actIdx} className="pl-2">
                                          <div className="flex items-start gap-3">
                                            <Camera size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-medium text-gray-700">{activity.name}</span>
                                                <button className="px-2 py-0.5 border border-teal-500 text-teal-600 text-xs rounded hover:bg-teal-50" data-testid={`activity-view-day-${dayNum}-${actIdx}`}>
                                                  VIEW
                                                </button>
                                              </div>
                                              <p className="text-sm text-gray-500 mb-2">
                                                {activity.start_times?.length > 0 
                                                  ? `Starts at ${activity.start_times.slice(0,3).join(', ')}` 
                                                  : 'Flexible timing'
                                                } (Duration: {activity.duration || '4 hrs'})
                                              </p>
                                              {/* Pickup info */}
                                              <div className="space-y-1 text-sm mb-3">
                                                <p className="flex items-center gap-2 text-gray-600">
                                                  <Check size={13} className="text-gray-400" />
                                                  Pick up time {activity.start_times?.[0] || '09:00 am'}
                                                </p>
                                                <p className="text-gray-500 ml-6">Start from {hotel?.name || 'Hotel'}</p>
                                              </div>
                                              {/* Transfer & Meal badges */}
                                              <div className="flex gap-2 flex-wrap">
                                                <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200">
                                                  {activity.transfer_type || 'Private'} Transfers
                                                </span>
                                                {activity.inclusions?.some(inc => inc.toLowerCase().includes('meal') || inc.toLowerCase().includes('dinner') || inc.toLowerCase().includes('lunch')) && (
                                                  <span className="px-2.5 py-1 bg-green-50 text-green-600 text-xs rounded-full border border-green-200">
                                                    Meal Included
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="pl-2 flex items-start gap-3">
                                        <Sun size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-gray-500 italic">Free day to explore {mainCity} at your leisure.</p>
                                      </div>
                                    )}

                                    {/* Overnight Stay */}
                                    <div className="flex items-center gap-3 pl-2">
                                      <Bed size={18} className="text-gray-400 flex-shrink-0" />
                                      <p className="text-gray-600">Overnight stay at <span className="font-medium">{hotel?.name || 'Hotel'}</span></p>
                                    </div>

                                    {/* Meals Grid */}
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                      <div className="grid grid-cols-3 gap-4">
                                        <div className="flex items-center gap-3">
                                          <Coffee size={16} className="text-gray-300" />
                                          <div>
                                            <p className="text-sm text-gray-500">Breakfast</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Utensils size={16} className="text-gray-300" />
                                          <div>
                                            <p className="text-sm text-gray-500">Lunch</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Utensils size={16} className="text-gray-300" />
                                          <div>
                                            <p className="text-sm text-gray-500">Dinner</p>
                                            {dayActivities.some(a => a.inclusions?.some(inc => inc.toLowerCase().includes('meal') || inc.toLowerCase().includes('dinner'))) ? (
                                              <p className="text-xs text-teal-600 font-medium">Included</p>
                                            ) : (
                                              <p className="text-xs text-gray-400">Not Included</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Departure Day Content */}
                                {isDepartureDay && (
                                  <div className="pt-5 space-y-5">
                                    {/* Alert Banner */}
                                    <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 flex items-start gap-3">
                                      <AlertTriangle size={18} className="text-pink-500 flex-shrink-0 mt-0.5" />
                                      <p className="text-sm text-pink-700">
                                        Please be available at the hotel lobby 15 minutes before the confirmed pick-up time for your airport transfer.
                                      </p>
                                    </div>

                                    {/* Transfer */}
                                    <div className="pl-2">
                                      <div className="flex items-start gap-3">
                                        <Car size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-gray-700">
                                              One-way transfer from {mainCity} Hotel to Airport
                                            </p>
                                            <button className="px-2 py-0.5 border border-teal-500 text-teal-600 text-xs rounded hover:bg-teal-50" data-testid={`transfer-view-day-${dayNum}`}>
                                              VIEW
                                            </button>
                                          </div>
                                          <div className="flex gap-2 mt-2">
                                            <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200">
                                              Private Transfers
                                            </span>
                                            <span className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200 flex items-center gap-1">
                                              <Briefcase size={11} />
                                              4 Bags
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Flight Departure */}
                                    <div className="flex items-start gap-3 pl-2">
                                      <Plane size={18} className="text-gray-400 rotate-45 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-gray-700">Flight Departure</p>
                                        <p className="text-sm text-gray-500">
                                          {proposal.departure_flight_info?.flightNumber || 'IX-344'} departing on {formatDate(dayDate, 'day')} at {proposal.departure_flight_info?.flightTime || '06:40 PM'} - {mainCity} Intl Airport
                                        </p>
                                      </div>
                                    </div>

                                    {/* Meals Grid */}
                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                      <div className="grid grid-cols-3 gap-4">
                                        <div className="flex items-center gap-3">
                                          <Coffee size={16} className="text-gray-300" />
                                          <div>
                                            <p className="text-sm text-gray-500">Breakfast</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Utensils size={16} className="text-gray-300" />
                                          <div>
                                            <p className="text-sm text-gray-500">Lunch</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Utensils size={16} className="text-gray-300" />
                                          <div>
                                            <p className="text-sm text-gray-500">Dinner</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Travel Insurance Section */}
                <div className="bg-white border border-gray-200 rounded-xl mb-8 shadow-sm overflow-hidden" data-testid="travel-insurance-section">
                  <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100">
                    <Shield size={18} className="text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Travel Insurance</h2>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start gap-3">
                      <Shield size={18} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-800">Travel Insurance (min $50,000 coverage)</p>
                        <p className="text-sm text-gray-500 mt-1">Only for Age Below 60 Yrs</p>
                        <p className="text-sm text-red-400 mt-1">Not Included</p>
                      </div>
                    </div>
                  </div>
                </div>
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

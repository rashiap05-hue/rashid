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
import { api, resolveImageUrl } from '@/App';

// Import extracted components
import {
  VideoModal, DayDescription, DetailViewModal, ExpandableSection,
  LeftSidebarNav, DestinationExpertCard, SendEmailModal, WhatsAppShareModal,
  PriceSidebar, formatDate, addDays, TERMS_ICONS
} from './ProposalView/index';
import RequestChangesTab from './ProposalView/RequestChangesTab';

// Main Proposal View Component
export default function ProposalView({ proposal: initialProposal, onBack, onBookNow, onEditProposal, onHoldBooking }) {
  const [proposal, setProposal] = useState(initialProposal);
  
  const refreshProposal = async () => {
    try {
      const res = await api.get(`/proposals/${proposal.id}`);
      setProposal(res.data);
    } catch (e) {
      console.error('Failed to refresh proposal', e);
    }
  };
  const [activeTab, setActiveTab] = useState('itinerary');
  const [expandedDays, setExpandedDays] = useState({1: true});
  const [allExpanded, setAllExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState('flights');
  
  // Video modal state
  const [videoModal, setVideoModal] = useState({ open: false, url: null, title: '' });
  const [detailModal, setDetailModal] = useState({ open: false, item: null, type: null });
  
  // Messages state
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  
  useEffect(() => {
    if (proposal?.id) {
      api.get(`/messages/${proposal.id}`).then(res => {
        setChatMessages(res.data?.messages || []);
      }).catch(() => {});
    }
  }, [proposal?.id]);
  
  // Helper to open transfer detail modal with full data from API
  const openTransferDetail = async (transfer) => {
    if (!transfer?.id) {
      setDetailModal({ open: true, item: transfer, type: 'transfer' });
      return;
    }
    try {
      const res = await api.get(`/transfers/${transfer.id}`);
      const fullTransfer = res.data?.transfer || res.data;
      setDetailModal({ open: true, item: { ...transfer, ...fullTransfer, image: fullTransfer.images?.[0] || null }, type: 'transfer' });
    } catch {
      setDetailModal({ open: true, item: transfer, type: 'transfer' });
    }
  };
  
  // Dynamic Terms & Policies state
  const [termsAndPolicies, setTermsAndPolicies] = useState([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState(null);
  
  // Destination videos state
  const [destinationVideo, setDestinationVideo] = useState(null);

  // Accept Proposal state
  const [acceptModal, setAcceptModal] = useState({ open: false, holdUntil: null, acceptedAt: null, loading: false });

  const handleAcceptProposal = async () => {
    setAcceptModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.post(`/proposals/${proposal.id}/accept`);
      setAcceptModal({ open: true, holdUntil: res.data.hold_until, acceptedAt: res.data.accepted_at, loading: false });
      await refreshProposal();
    } catch (e) {
      console.error('Failed to accept proposal', e);
      setAcceptModal({ open: false, holdUntil: null, acceptedAt: null, loading: false });
    }
  };

  const handleHoldBooking = async (holdDate) => {
    try {
      await api.post(`/proposals/${proposal.id}/hold`, { hold_until_date: holdDate });
      await refreshProposal();
      onHoldBooking?.();
    } catch (e) {
      console.error('Failed to hold booking', e);
      alert(e.response?.data?.detail || 'Failed to hold booking. Please try again.');
    }
  };

  // Fresh hotel images from DB (in case saved proposal has stale/missing images)
  const [freshHotelImages, setFreshHotelImages] = useState({});
  const [freshActivityImages, setFreshActivityImages] = useState({});
  const [freshTransferImages, setFreshTransferImages] = useState({});

  // Fetch fresh hotel images from the API
  useEffect(() => {
    const fetchFreshHotelImages = async () => {
      if (!proposal?.cities) return;
      const hotelMap = {};
      for (let idx = 0; idx < proposal.cities.length; idx++) {
        const city = proposal.cities[idx];
        const cityName = city.name;
        const savedHotel = proposal.selected_hotels?.[`${cityName}_${idx}`] || proposal.selected_hotels?.[cityName];
        if (savedHotel?.name) {
          try {
            const res = await api.get(`/hotels?city=${encodeURIComponent(cityName)}`);
            const hotels = res.data?.hotels || [];
            const match = hotels.find(h => h.id === savedHotel.id || h.name === savedHotel.name);
            if (match?.images?.[0]) {
              hotelMap[`${cityName}_${idx}`] = match.images[0];
            }
          } catch (e) {
            // ignore
          }
        }
      }
      setFreshHotelImages(hotelMap);
    };
    fetchFreshHotelImages();
  }, [proposal]);

  // Fetch fresh activity images from the API
  useEffect(() => {
    const fetchFreshActivityImages = async () => {
      if (!proposal?.selected_activities) return;
      const imgMap = {};
      const fetchedCities = new Set();
      for (const [key, acts] of Object.entries(proposal.selected_activities)) {
        if (!Array.isArray(acts)) continue;
        // Extract city name from key (format: "CityName_DayNumber")
        const lastUnderscore = key.lastIndexOf('_');
        const cityName = lastUnderscore > 0 ? key.substring(0, lastUnderscore) : key;
        if (!fetchedCities.has(cityName)) {
          try {
            const res = await api.get(`/activities?city=${encodeURIComponent(cityName)}`);
            const dbActivities = res.data?.activities || (Array.isArray(res.data) ? res.data : []);
            for (const dbAct of dbActivities) {
              const img = dbAct.images?.[0] || dbAct.image;
              if (img) imgMap[dbAct.id] = img;
              if (dbAct.name && img) imgMap[dbAct.name] = img;
            }
            fetchedCities.add(cityName);
          } catch (e) {
            // ignore
          }
        }
      }
      setFreshActivityImages(imgMap);
    };
    fetchFreshActivityImages();
  }, [proposal]);

  // Fetch fresh transfer images from the API
  useEffect(() => {
    const fetchFreshTransferImages = async () => {
      if (!proposal) return;
      const imgMap = {};
      const transferIds = new Set();
      
      // Collect all transfer IDs from the proposal
      if (proposal.arrival_transfer?.id) transferIds.add(proposal.arrival_transfer.id);
      if (proposal.departure_transfer?.id) transferIds.add(proposal.departure_transfer.id);
      if (proposal.inter_city_transfers) {
        for (const [key, t] of Object.entries(proposal.inter_city_transfers)) {
          if (t?.id) transferIds.add(t.id);
        }
      }
      
      // Fetch image for each transfer
      for (const tid of transferIds) {
        try {
          const res = await api.get(`/transfers/${tid}`);
          const transfer = res.data?.transfer || res.data;
          const img = transfer?.images?.[0];
          if (img) imgMap[tid] = img;
        } catch (e) {
          // ignore
        }
      }
      setFreshTransferImages(imgMap);
    };
    fetchFreshTransferImages();
  }, [proposal]);

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

  // Get hotel for city using the cityName_cityIndex key format (matching TripBuilder save format)
  const getHotelForCity = (cityName, cityIdx) => {
    if (!proposal.selected_hotels) return null;
    // Try exact key: "CityName_cityIndex"
    const exactKey = `${cityName}_${cityIdx}`;
    if (proposal.selected_hotels[exactKey]) return proposal.selected_hotels[exactKey];
    // Fallback: try plain cityName for backward compat
    if (proposal.selected_hotels[cityName]) return proposal.selected_hotels[cityName];
    // Fallback: try numeric index
    if (proposal.selected_hotels[cityIdx] || proposal.selected_hotels[String(cityIdx)]) {
      return proposal.selected_hotels[cityIdx] || proposal.selected_hotels[String(cityIdx)];
    }
    return null;
  };

  // Map a day number (1-based) to its city name and city index
  const getDayCityInfo = (dayNum) => {
    let dayCounter = 0;
    for (let cityIdx = 0; cityIdx < (proposal.cities || []).length; cityIdx++) {
      const city = proposal.cities[cityIdx];
      for (let night = 0; night < (city.nights || 1); night++) {
        dayCounter++;
        if (dayCounter === dayNum) {
          return { cityName: city.name, cityIndex: cityIdx };
        }
      }
    }
    // Departure day - belongs to last city
    const lastIdx = (proposal.cities?.length || 1) - 1;
    return { cityName: proposal.cities?.[lastIdx]?.name || 'Unknown', cityIndex: lastIdx };
  };

  // Check if hotel includes breakfast based on meal_plan
  const hotelIncludesBreakfast = (hotel) => {
    const mealPlan = hotel?.selectedRoom?.rate_plan?.meal_plan || hotel?.selectedRoom?.meals || '';
    return mealPlan.toLowerCase().includes('breakfast') || mealPlan.toLowerCase().includes('bb') || mealPlan.toLowerCase().includes('half board') || mealPlan.toLowerCase().includes('full board');
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
                {/* Flights Section - Only show when flights are added */}
                {(proposal.arrival_flight_info?.airline || proposal.departure_flight_info?.airline) && (
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

                  {(proposal.arrival_flight_info || proposal.departure_flight_info) ? (
                  <>
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
                  </>
                  ) : (
                  <div className="p-6">
                    <p className="text-gray-700 font-medium mb-1">
                      {proposal.leaving_from?.split('(')[0]?.trim() || 'Origin'} to {mainCity}
                    </p>
                    <p className="text-gray-400 text-sm">No Flight Included</p>
                  </div>
                  )}
                </div>
                )}

                {/* Hotel Section - Per City */}
                {proposal.cities?.map((city, cityIdx) => {
                  const hotel = getHotelForCity(city.name, cityIdx);
                  // Calculate cumulative check-in date based on previous cities' nights
                  let cumulativeNights = 0;
                  for (let i = 0; i < cityIdx; i++) {
                    cumulativeNights += proposal.cities[i].nights || 1;
                  }
                  const checkInDate = new Date(proposal.leaving_on);
                  checkInDate.setDate(checkInDate.getDate() + cumulativeNights);
                  const checkOutDate = new Date(checkInDate);
                  checkOutDate.setDate(checkOutDate.getDate() + (city.nights || 1));
                  
                  return (
                    <div key={`hotel-${cityIdx}`} className="bg-white border border-gray-200 rounded-xl mb-8 shadow-sm overflow-hidden" data-testid={`hotel-section-${cityIdx}`}>
                      {/* City Header */}
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                        <MapPin size={20} className="text-gray-600" />
                        <h2 className="text-xl font-bold text-gray-800">{city.name}</h2>
                        <span className="text-gray-500">{city.nights || 1} nights</span>
                      </div>

                      {hotel ? (
                      <>
                      {/* Hotel Card */}
                      <div className="p-6">
                        <div className="flex gap-6">
                          {/* Hotel Image */}
                          <div className="w-56 h-44 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            <img 
                              src={freshHotelImages[`${city.name}_${cityIdx}`] || freshHotelImages[city.name] || hotel.image || hotel.images?.[0] || hotel.selectedRoom?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'}
                              alt={hotel.name || 'Hotel'}
                              className="w-full h-full object-cover"
                              data-testid={`hotel-image-${cityIdx}`}
                              onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'; }}
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
                              <button 
                                onClick={() => setDetailModal({ open: true, item: hotel, type: 'hotel' })}
                                className="px-3 py-1 border border-teal-500 text-teal-600 text-xs font-medium rounded hover:bg-teal-50 transition-colors">
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
                                1 x {hotel?.selectedRoom?.name || 'Double Room'}
                                {hotel?.selectedRoom?.rate_plan?.description ? ` - ${hotel.selectedRoom.rate_plan.description}` : ''}
                              </p>
                            </div>

                            {/* Room Details - from actual data */}
                            <div className="pl-6 space-y-1 text-sm text-gray-500 mb-3">
                              {hotel?.selectedRoom?.bedType && <p>{hotel.selectedRoom.bedType}</p>}
                              {!hotel?.selectedRoom?.bedType && <p>1 Double Bed</p>}
                              <p>Package rate</p>
                              {hotel?.amenities?.includes('Free WiFi') || hotel?.amenities?.includes('WiFi') ? <p>Free WiFi</p> : null}
                            </div>

                            {/* Meal Plan - from actual data */}
                            {(() => {
                              const mealPlan = hotel?.selectedRoom?.rate_plan?.meal_plan || hotel?.selectedRoom?.meals || '';
                              if (mealPlan) {
                                return <p className="text-teal-600 text-sm font-medium mb-2">{mealPlan}</p>;
                              }
                              return <p className="text-gray-500 text-sm mb-2">No meals included</p>;
                            })()}

                            {/* Refund Policy */}
                            {hotel?.selectedRoom?.rate_plan?.refund_policy === 'Refundable' || hotel?.selectedRoom?.rate_plan?.refund_deadline ? (
                              <p className="text-teal-600 text-sm">{hotel.selectedRoom.rate_plan.refund_deadline || `Fully refundable before ${formatDate(new Date(checkInDate.getTime() - 86400000), 'day')}`}</p>
                            ) : hotel?.selectedRoom?.cancellation_policy ? (
                              <p className="text-teal-600 text-sm">{hotel.selectedRoom.cancellation_policy}</p>
                            ) : (
                              <p className="text-teal-600 text-sm hover:underline">Fully refundable before {formatDate(new Date(checkInDate.getTime() - 86400000), 'day')}</p>
                            )}
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

                      {/* Amenities Section */}
                      {hotel?.amenities && hotel.amenities.length > 0 && (
                      <div className="mx-6 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-4">Hotel Amenities</h4>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          {hotel.amenities.slice(0, 9).map((amenity, aIdx) => (
                            <div key={aIdx} className="flex items-start gap-2 text-gray-600">
                              <Check size={14} className="text-teal-500 mt-0.5 flex-shrink-0" />
                              <span>{amenity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      )}

                      {/* Warning Message */}
                      <div className="mx-6 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-amber-700 text-sm">Based on expected time of departure, long wait is expected after check-out from the hotel</p>
                      </div>
                      </>
                      ) : (
                      <div className="p-8 text-center">
                        <Hotel size={32} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No hotel selected for {city.name}</p>
                        <p className="text-gray-300 text-xs mt-1">Go to Customize Your Trip to select a hotel</p>
                      </div>
                      )}
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
                    
                    // Get the city this day belongs to
                    const dayCityInfo = getDayCityInfo(dayNum);
                    const dayCity = dayCityInfo.cityName;
                    const dayCityIdx = dayCityInfo.cityIndex;
                    
                    // Get activities for this day
                    const dayActivities = proposal.selected_activities?.[`${dayCity}_${dayNum}`] || [];
                    const hotel = getHotelForCity(dayCity, dayCityIdx);
                    
                    // Check for inter-city transfer arriving on this day
                    let interCityTransfer = null;
                    if (proposal.inter_city_transfers && dayCityIdx > 0) {
                      // Check if this is the first day in this city (check-in day)
                      const prevDayCityInfo = dayNum > 1 ? getDayCityInfo(dayNum - 1) : null;
                      if (prevDayCityInfo && prevDayCityInfo.cityIndex !== dayCityIdx) {
                        // This is a check-in day for a new city — find the inter-city transfer
                        const transferKey = `${prevDayCityInfo.cityIndex}_${dayCityIdx}`;
                        interCityTransfer = proposal.inter_city_transfers[transferKey];
                      }
                    }
                    
                    // Generate day title
                    let dayTitle = '';
                    if (isArrivalDay) {
                      dayTitle = `Arrival into ${dayCity}`;
                    } else if (isDepartureDay) {
                      dayTitle = `Departure from ${dayCity}`;
                    } else {
                      if (interCityTransfer) {
                        const fromCity = interCityTransfer.from_city || proposal.cities?.[getDayCityInfo(dayNum - 1)?.cityIndex]?.name || '';
                        dayTitle = `${fromCity} to ${dayCity}`;
                        if (dayActivities.length > 0) {
                          dayTitle += ` - ${dayActivities[0]?.name?.split(' - ')[0] || dayActivities[0]?.name}`;
                        }
                      } else if (dayActivities.length > 0) {
                        const activityNames = dayActivities.slice(0, 2).map(a => a.name?.split(' - ')[0] || a.name).join(' - ');
                        dayTitle = activityNames;
                      } else {
                        dayTitle = `Day at leisure in ${dayCity}`;
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
                                  <div className="pt-5 flex gap-6">
                                    {/* Left - Large Image */}
                                    <div className="w-72 flex-shrink-0">
                                      <img 
                                        src={resolveImageUrl(freshActivityImages[dayActivities[0]?.id] || freshActivityImages[dayActivities[0]?.name] || dayActivities[0]?.image || dayActivities[0]?.images?.[0] || freshTransferImages[proposal.arrival_transfer?.id] || `https://images.unsplash.com/photo-1565008576549-57569a49371d?w=600`)}
                                        alt={dayActivities[0]?.name || dayCity}
                                        className="w-full h-full object-cover rounded-lg min-h-[400px]"
                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=600'; }}
                                        data-testid={`day-image-${dayNum}`}
                                      />
                                    </div>
                                    
                                    {/* Right - Content */}
                                    <div className="flex-1 space-y-5">
                                      {/* Alert Banner */}
                                      {!proposal.arrival_flight_info && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                          <p className="text-sm text-red-500 font-semibold">Arrival information is missing</p>
                                        </div>
                                      )}
                                      {proposal.arrival_transfer && proposal.arrival_flight_info && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                                          <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                                          <p className="text-sm text-orange-700">
                                            You will be met by our representative at the Airport Arrival Terminal. Our representative will be holding a signage card with your name on it.
                                          </p>
                                        </div>
                                      )}

                                      {/* Description */}
                                      <DayDescription 
                                        dayCity={dayCity}
                                        isArrival={true}
                                        isDeparture={false}
                                        activities={dayActivities}
                                        hotel={hotel}
                                      />

                                      {/* Notes */}
                                      {(dayActivities.some(a => a.notes) || proposal.arrival_transfer?.notes) && (
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                          <p className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
                                            <AlertCircle size={14} className="text-gray-500" />
                                            Notes:
                                          </p>
                                          <ul className="space-y-1.5 text-sm text-gray-600 list-disc list-inside">
                                            {proposal.arrival_transfer?.notes && <li>{proposal.arrival_transfer.notes}</li>}
                                            {dayActivities.filter(a => a.notes).map((a, i) => <li key={i}>{a.notes}</li>)}
                                            <li>Small vehicle upto 6 pax will come with Drive cum Guide (with limited English) if you require an additional Guide, please request for it at applicable additional charges.</li>
                                            <li>7 people and above will be provided a Sprinter where Guide is mandatory and included.</li>
                                          </ul>
                                        </div>
                                      )}

                                      {/* Transfer */}
                                      {proposal.arrival_transfer ? (
                                        <div className="flex items-start gap-3">
                                          <Car size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="font-semibold text-gray-800">
                                                {proposal.arrival_transfer.title || `One-way transfer from ${proposal.leaving_from?.split('(')[0]?.trim() || 'Airport'} to ${dayCity} center`} - Private
                                                {proposal.arrival_transfer.from_location && ` from ${proposal.arrival_transfer.from_location}`}
                                              </p>
                                              <button 
                                                onClick={() => openTransferDetail(proposal.arrival_transfer)}
                                                className="px-2 py-0.5 border border-teal-500 text-teal-600 text-xs rounded hover:bg-teal-50" data-testid={`transfer-view-day-${dayNum}`}>
                                                VIEW
                                              </button>
                                            </div>
                                            <div className="flex gap-2 mt-2 flex-wrap">
                                              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200">Private Transfers</span>
                                              {proposal.arrival_transfer.max_bags && (
                                                <span className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200 flex items-center gap-1">
                                                  {proposal.arrival_transfer.max_bags} Bags
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-3">
                                          <Car size={18} className="text-gray-300 flex-shrink-0" />
                                          <p className="text-gray-400 text-sm italic">No arrival transfer selected</p>
                                        </div>
                                      )}

                                      {/* Activities */}
                                      {dayActivities.map((activity, actIdx) => (
                                        <div key={actIdx} className="flex items-start gap-3">
                                          <Camera size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="font-semibold text-gray-800">{activity.name} - Private Transfers</p>
                                              <button 
                                                onClick={() => setDetailModal({ open: true, item: activity, type: 'activity' })}
                                                className="px-2 py-0.5 border border-teal-500 text-teal-600 text-xs rounded hover:bg-teal-50" data-testid={`activity-view-day-${dayNum}-${actIdx}`}>
                                                VIEW
                                              </button>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                              {activity.start_times?.length > 0 
                                                ? `Starts at ${activity.start_times.join(', ')}` 
                                                : 'Flexible timing'
                                              }
                                              {activity.duration ? ` (Duration: ${activity.duration})` : ''}
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200">Private Transfers</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}

                                      {/* Overnight Stay */}
                                      {hotel && (
                                        <div className="flex items-center gap-3">
                                          <Bed size={18} className="text-gray-400 flex-shrink-0" />
                                          <p className="text-gray-700">Overnight stay at <span className="font-semibold">{hotel.name}</span></p>
                                        </div>
                                      )}

                                      {/* Meals - Stacked (Arrival day: no breakfast) */}
                                      <div className="space-y-4 pt-3 border-t border-gray-100">
                                        <div className="flex items-start gap-3">
                                          <Coffee size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-gray-700 font-medium">Breakfast</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                          <Utensils size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-gray-700 font-medium">Lunch</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                          <Utensils size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-gray-700 font-medium">Dinner</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Middle Day Content */}
                                {isMiddleDay && (
                                  <div className="pt-5 flex gap-6">
                                    {/* Left - Large Image */}
                                    <div className="w-72 flex-shrink-0">
                                      <img 
                                        src={resolveImageUrl(freshActivityImages[dayActivities[0]?.id] || freshActivityImages[dayActivities[0]?.name] || dayActivities[0]?.image || dayActivities[0]?.images?.[0] || freshTransferImages[interCityTransfer?.id] || `https://images.unsplash.com/photo-1565008576549-57569a49371d?w=600`)}
                                        alt={dayActivities[0]?.name || dayCity}
                                        className="w-full h-full object-cover rounded-lg min-h-[300px]"
                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=600'; }}
                                        data-testid={`day-image-${dayNum}`}
                                      />
                                    </div>
                                    
                                    {/* Right - Content */}
                                    <div className="flex-1 space-y-5">
                                      {/* Description */}
                                      <DayDescription 
                                        dayCity={dayCity}
                                        isArrival={false}
                                        isDeparture={false}
                                        activities={dayActivities}
                                        hotel={hotel}
                                      />

                                      {/* Notes */}
                                      {dayActivities.some(a => a.notes) && (
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                          <p className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
                                            <AlertCircle size={14} className="text-gray-500" />
                                            Notes:
                                          </p>
                                          <ul className="space-y-1.5 text-sm text-gray-600 list-disc list-inside">
                                            {dayActivities.filter(a => a.notes).map((a, i) => <li key={i}>{a.notes}</li>)}
                                            <li>Small vehicle upto 6 pax will come with Drive cum Guide (with limited English) if you require an additional Guide, please request for it at applicable additional charges.</li>
                                            <li>7 people and above will be provided a Sprinter where Guide is mandatory and included.</li>
                                          </ul>
                                        </div>
                                      )}

                                      {/* Inter-city Transfer */}
                                      {interCityTransfer && (
                                        <div className="flex items-start gap-3">
                                          <Car size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="font-semibold text-gray-800">
                                                {interCityTransfer.title || `Transfer from ${interCityTransfer.from_city || ''} to ${interCityTransfer.to_city || dayCity}`} - Private
                                              </p>
                                              <button 
                                                onClick={() => openTransferDetail(interCityTransfer)}
                                                className="px-2 py-0.5 border border-teal-500 text-teal-600 text-xs rounded hover:bg-teal-50" data-testid={`intercity-transfer-view-day-${dayNum}`}>
                                                VIEW
                                              </button>
                                            </div>
                                            {interCityTransfer.duration && (
                                              <p className="text-sm text-gray-500 mt-1">Duration: {interCityTransfer.duration}</p>
                                            )}
                                            <div className="flex gap-2 mt-2">
                                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">Inter-City Transfer</span>
                                              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200">Private</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Middle Day Activities */}
                                      {dayActivities.length > 0 ? (
                                        dayActivities.map((activity, actIdx) => (
                                          <div key={actIdx} className="flex items-start gap-3">
                                            <Camera size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-gray-800">{activity.name} - Private Transfers</p>
                                                <button 
                                                  onClick={() => setDetailModal({ open: true, item: activity, type: 'activity' })}
                                                  className="px-2 py-0.5 border border-teal-500 text-teal-600 text-xs rounded hover:bg-teal-50" data-testid={`activity-view-day-${dayNum}-${actIdx}`}>
                                                  VIEW
                                                </button>
                                              </div>
                                              <p className="text-sm text-gray-500 mt-1">
                                                {activity.start_times?.length > 0 
                                                  ? `Starts at ${activity.start_times.join(', ')}` 
                                                  : 'Flexible timing'
                                                }
                                                {activity.duration ? ` (Duration: ${activity.duration})` : ''}
                                              </p>
                                              <div className="flex gap-2 mt-2">
                                                <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200">Private Transfers</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))
                                      ) : !interCityTransfer ? (
                                        <div className="flex items-start gap-3">
                                          <Sun size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                          <p className="text-gray-500 italic">Free day to explore {dayCity} at your leisure.</p>
                                        </div>
                                      ) : null}

                                      {/* Overnight Stay */}
                                      {hotel && (
                                        <div className="flex items-center gap-3">
                                          <Bed size={18} className="text-gray-400 flex-shrink-0" />
                                          <p className="text-gray-700">Overnight stay at <span className="font-semibold">{hotel.name}</span></p>
                                        </div>
                                      )}

                                      {/* Meals - Stacked */}
                                      <div className="space-y-4 pt-3 border-t border-gray-100">
                                        {hotelIncludesBreakfast(hotel) && (
                                          <div className="flex items-start gap-3">
                                            <Coffee size={18} className="text-teal-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                              <p className="text-gray-700 font-medium">Breakfast</p>
                                              <p className="text-xs text-teal-600">Included at hotel</p>
                                            </div>
                                          </div>
                                        )}
                                        <div className="flex items-start gap-3">
                                          <Utensils size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-gray-700 font-medium">Lunch</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                          <Utensils size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-gray-700 font-medium">Dinner</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Departure Day Content */}
                                {isDepartureDay && (
                                  <div className="pt-5 flex gap-6">
                                    {/* Left - Large Image */}
                                    <div className="w-72 flex-shrink-0">
                                      <img 
                                        src={resolveImageUrl(freshTransferImages[proposal.departure_transfer?.id] || `https://images.unsplash.com/photo-1565008576549-57569a49371d?w=600`)}
                                        alt={dayCity}
                                        className="w-full h-full object-cover rounded-lg min-h-[250px]"
                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=600'; }}
                                        data-testid={`day-image-${dayNum}`}
                                      />
                                    </div>
                                    
                                    {/* Right - Content */}
                                    <div className="flex-1 space-y-5">
                                      {/* Alert Banner */}
                                      {!proposal.departure_flight_info && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                          <p className="text-sm text-red-500 font-semibold">Departure information is missing</p>
                                        </div>
                                      )}
                                      {proposal.departure_transfer && (
                                        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 flex items-start gap-3">
                                          <AlertTriangle size={18} className="text-pink-500 flex-shrink-0 mt-0.5" />
                                          <p className="text-sm text-pink-700">
                                            Please be available at the hotel lobby 15 minutes before the confirmed pick-up time for your airport transfer.
                                          </p>
                                        </div>
                                      )}

                                      {/* Description */}
                                      <DayDescription 
                                        dayCity={dayCity}
                                        isArrival={false}
                                        isDeparture={true}
                                        activities={[]}
                                        hotel={hotel}
                                      />

                                      {/* Transfer */}
                                      {proposal.departure_transfer ? (
                                        <div className="flex items-start gap-3">
                                          <Car size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="font-semibold text-gray-800">
                                                {proposal.departure_transfer.title || `One-way transfer from ${dayCity} Hotel to Airport`} - Private
                                              </p>
                                              <button 
                                                onClick={() => openTransferDetail(proposal.departure_transfer)}
                                                className="px-2 py-0.5 border border-teal-500 text-teal-600 text-xs rounded hover:bg-teal-50" data-testid={`transfer-view-day-${dayNum}`}>
                                                VIEW
                                              </button>
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full border border-teal-200">Private Transfers</span>
                                              {proposal.departure_transfer.max_bags && (
                                                <span className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200 flex items-center gap-1">
                                                  {proposal.departure_transfer.max_bags} Bags
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-3">
                                          <Car size={18} className="text-gray-300 flex-shrink-0" />
                                          <p className="text-gray-400 text-sm italic">No departure transfer selected</p>
                                        </div>
                                      )}

                                      {/* Flight Departure */}
                                      {proposal.departure_flight_info && (
                                        <div className="flex items-start gap-3">
                                          <Plane size={18} className="text-gray-400 rotate-45 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="font-medium text-gray-700">Flight Departure</p>
                                            <p className="text-sm text-gray-500">
                                              {proposal.departure_flight_info.flightNumber} departing on {formatDate(dayDate, 'day')} at {proposal.departure_flight_info.flightTime} - {dayCity} Intl Airport
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Meals - Stacked */}
                                      <div className="space-y-4 pt-3 border-t border-gray-100">
                                        {hotelIncludesBreakfast(hotel) && (
                                          <div className="flex items-start gap-3">
                                            <Coffee size={18} className="text-teal-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                              <p className="text-gray-700 font-medium">Breakfast</p>
                                              <p className="text-xs text-teal-600">Included at hotel</p>
                                            </div>
                                          </div>
                                        )}
                                        <div className="flex items-start gap-3">
                                          <Utensils size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-gray-700 font-medium">Lunch</p>
                                            <p className="text-xs text-gray-400">Not Included</p>
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                          <Utensils size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-gray-700 font-medium">Dinner</p>
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

                {/* Travel Insurance Section - only if added */}
                {proposal.travel_insurance && (
                <div className="bg-white border border-gray-200 rounded-xl mb-8 shadow-sm overflow-hidden" data-testid="travel-insurance-section">
                  <div className="px-6 py-5 flex items-center gap-3 border-b border-gray-100">
                    <Shield size={20} className="text-[#002B5B]" />
                    <h2 className="text-lg font-bold text-[#002B5B]">Travel Insurance</h2>
                  </div>
                  <div className="px-6 py-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-gray-700">Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs</p>
                        {proposal.travel_insurance_price > 0 && (
                          <p className="text-base font-semibold text-[#002B5B] mt-2">AED {proposal.travel_insurance_price} <span className="text-xs font-normal text-gray-500">per person</span></p>
                        )}
                        <p className="text-sm text-teal-600 font-medium mt-1">Included</p>
                      </div>
                      <span className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm font-medium rounded border border-teal-200">Added</span>
                    </div>
                  </div>
                </div>
                )}

                {/* ========== INCLUSIONS SECTION ========== */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8" data-testid="inclusions-section">
                  {/* Header */}
                  <div className="flex items-center justify-center py-6 px-6">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <h2 className="px-6 text-sm font-bold text-gray-700 tracking-[0.2em] uppercase">Inclusions</h2>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>

                  {/* City-wise inclusions */}
                  {proposal.cities?.map((city, cityIdx) => {
                    const hotel = getHotelForCity(city.name, cityIdx);
                    let cumulativeNights = 0;
                    for (let i = 0; i < cityIdx; i++) cumulativeNights += proposal.cities[i]?.nights || 0;
                    const cityStartDate = addDays(proposal.leaving_on, cumulativeNights);
                    const isLastCity = cityIdx === proposal.cities.length - 1;

                    // Collect ALL transfers for this city
                    const transfers = [];
                    if (cityIdx === 0 && proposal.arrival_transfer) {
                      transfers.push({ ...proposal.arrival_transfer, _dayNum: 1, _date: addDays(proposal.leaving_on, 0) });
                    }
                    if (cityIdx > 0 && proposal.inter_city_transfers) {
                      const ict = proposal.inter_city_transfers[`${cityIdx - 1}_${cityIdx}`];
                      if (ict) transfers.push({ ...ict, _dayNum: cumulativeNights + 1, _date: cityStartDate });
                    }
                    if (isLastCity && proposal.departure_transfer) {
                      transfers.push({ ...proposal.departure_transfer, _dayNum: nightsCount + 1, _date: addDays(proposal.leaving_on, nightsCount) });
                    }

                    // Collect ALL activities for this city
                    const cityActivities = [];
                    const selectedActs = proposal.selected_activities || {};
                    Object.keys(selectedActs).forEach(key => {
                      if (key === `${city.name}_${cityIdx}` || key.startsWith(city.name + '_')) {
                        const acts = selectedActs[key];
                        if (Array.isArray(acts)) {
                          acts.forEach(a => {
                            if (!cityActivities.some(existing => existing.name === a.name)) {
                              cityActivities.push(a);
                            }
                          });
                        } else if (acts && !cityActivities.some(existing => existing.name === acts.name)) {
                          cityActivities.push(acts);
                        }
                      }
                    });

                    return (
                      <div key={cityIdx} data-testid={`inclusion-city-${cityIdx}`}>
                        {/* City Header */}
                        <div className="bg-gray-50 px-8 py-5 flex items-center gap-3 border-y border-gray-100">
                          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                            <MapPin size={15} className="text-white" />
                          </div>
                          <span className="text-lg font-bold text-gray-800">{city.name}</span>
                          <span className="text-sm text-gray-400 ml-1">{city.nights} night{city.nights > 1 ? 's' : ''} - {formatDate(cityStartDate, 'short')}</span>
                        </div>

                        <div className="px-8 py-6 space-y-6">
                          {/* Hotel */}
                          {hotel && (
                            <div className="flex items-start gap-4">
                              <Hotel size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-[15px] text-gray-800">
                                  Stay for {city.nights} night{city.nights > 1 ? 's' : ''} at <span className="font-bold">{hotel.name}</span>
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                  1 x {hotel.selectedRoom?.name || hotel.rooms?.[0]?.name || 'Double Room'}
                                </p>
                                {hotelIncludesBreakfast(hotel) ? (
                                  <p className="text-sm text-teal-600 mt-0.5">Breakfast Included</p>
                                ) : (
                                  <p className="text-sm text-gray-400 mt-0.5">Breakfast: Not Included</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Merge transfers + activities, sort by day number */}
                          {(() => {
                            const allItems = [
                              ...transfers.map((t, tIdx) => ({ ...t, _type: 'transfer', _sortDay: t._dayNum, _idx: tIdx })),
                              ...cityActivities.map((a, aIdx) => ({
                                ...a,
                                _type: 'activity',
                                _sortDay: cumulativeNights + 1 + Math.min(aIdx, city.nights - 1),
                                _date: addDays(proposal.leaving_on, cumulativeNights + Math.min(aIdx, city.nights - 1)),
                                _idx: aIdx
                              }))
                            ].sort((a, b) => a._sortDay - b._sortDay);

                            return allItems.map((item, idx) => {
                              if (item._type === 'transfer') {
                                return (
                                  <div key={`t-${item._idx}`} className="flex items-start gap-4">
                                    <Car size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <p className="text-[15px] text-gray-800">
                                            {item.title || 'Private Transfer'}
                                            <button
                                              onClick={() => openTransferDetail(item)}
                                              className="ml-3 px-2.5 py-0.5 text-[11px] font-semibold text-teal-600 border border-teal-300 rounded bg-white hover:bg-teal-50 transition-colors align-middle"
                                              data-testid={`inclusion-transfer-view-${cityIdx}-${item._idx}`}
                                            >
                                              VIEW
                                            </button>
                                          </p>
                                          {item.duration && (
                                            <p className="text-sm text-gray-400 mt-1">Duration: {item.duration}</p>
                                          )}
                                          <span className="inline-block mt-2 px-2.5 py-0.5 text-[11px] font-medium text-teal-700 border border-teal-200 rounded">
                                            Private Transfers
                                          </span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-sm text-gray-500">Day {item._dayNum}</p>
                                          <p className="text-sm text-gray-400">{formatDate(item._date, 'long')}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                return (
                                  <div key={`a-${item._idx}`} className="flex items-start gap-4">
                                    <Camera size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <p className="text-[15px] text-gray-800">
                                            {item.name}
                                            <button
                                              onClick={() => setDetailModal({ open: true, item: item, type: 'activity' })}
                                              className="ml-3 px-2.5 py-0.5 text-[11px] font-semibold text-teal-600 border border-teal-300 rounded bg-white hover:bg-teal-50 transition-colors align-middle"
                                              data-testid={`inclusion-activity-view-${cityIdx}-${item._idx}`}
                                            >
                                              VIEW
                                            </button>
                                          </p>
                                          <p className="text-sm text-gray-500 mt-1">{item.duration || 'Full Day'} • {item.transfer_type || 'Private'}</p>
                                          {item.inclusions?.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                              {item.inclusions.map((inc, incIdx) => (
                                                <div key={incIdx} className="flex items-start gap-2">
                                                  <Check size={12} className="text-green-500 mt-1 flex-shrink-0" />
                                                  <span className="text-sm text-gray-600">{inc}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-sm text-gray-500">Day {item._sortDay}</p>
                                          <p className="text-sm text-gray-400">{formatDate(item._date, 'long')}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            });
                          })()}
                        </div>
                      </div>
                    );
                  })}

                  {/* Meals Row - single row at the bottom */}
                  <div className="px-8 py-6 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="flex items-center gap-3">
                        <Utensils size={18} className="text-gray-500" />
                        <div>
                          <p className="text-sm font-bold text-gray-800">Breakfast</p>
                          {(() => {
                            let breakfastDays = 0;
                            proposal.cities?.forEach((c, i) => {
                              const h = getHotelForCity(c.name, i);
                              if (hotelIncludesBreakfast(h)) breakfastDays += c.nights;
                            });
                            return breakfastDays > 0
                              ? <p className="text-xs text-teal-600 font-semibold">Included on {breakfastDays} day{breakfastDays > 1 ? 's' : ''}</p>
                              : <p className="text-xs text-gray-400">Not Included</p>;
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <X size={18} className="text-gray-300" />
                        <div>
                          <p className="text-sm font-bold text-gray-800">Lunch</p>
                          <p className="text-xs text-gray-400">Not Included</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Moon size={18} className="text-gray-300" />
                        <div>
                          <p className="text-sm font-bold text-gray-800">Dinner</p>
                          <p className="text-xs text-gray-400">Not Included</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========== EXCLUSIONS SECTION ========== */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 border border-gray-200" data-testid="exclusions-section">
                  <div className="px-6 py-5 flex items-center gap-3">
                    <Info size={20} className="text-gray-500" />
                    <h2 className="text-lg font-bold text-gray-800">Exclusions</h2>
                  </div>
                  <div className="px-6 pb-6">
                    <ul className="space-y-2.5 text-sm text-gray-600">
                      {[
                        'Passport fees, immunization costs, city taxes at the hotel and local departure taxes (wherever applicable)',
                        'Optional enhancements like room or flight upgrades, or local camera or video fees',
                        'Additional sightseeing, activities and experiences outside of the itinerary',
                        'Early check-in or late check-out from hotels (unless otherwise specified)',
                        'Breakfast, lunches, dinners and drinks (alcoholic and non-alcoholic), unless specified in the itinerary',
                        'Any international and/or domestic flights, unless explicitly mentioned as an inclusion',
                        'Excess baggage charges, and where applicable, baggage not included in your fare',
                        'Tips for services and experiences',
                        'Any Visa required, unless mentioned as an inclusion',
                        'Read useful information and terms for more on what is included and excluded',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* ========== TERMS & POLICIES SECTION (inline) ========== */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8" data-testid="terms-inline-section">
                  <div className="px-6 py-5 flex items-center gap-3 border-b border-gray-100">
                    <Shield size={20} className="text-[#002B5B]" />
                    <h2 className="text-lg font-bold text-[#002B5B]">Terms & Policies</h2>
                  </div>
                  {termsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-gray-400 mr-2" size={20} />
                      <span className="text-gray-500 text-sm">Loading...</span>
                    </div>
                  ) : termsAndPolicies.length > 0 ? (
                    termsAndPolicies.map((term) => {
                      const IconComp = TERMS_ICONS[term.icon] || Info;
                      return (
                        <ExpandableSection key={term.id} title={term.title} icon={IconComp} defaultExpanded={term.is_expanded_default}>
                          {term.category === 'Commitments' && term.content?.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                              {term.content.map((item, idx) => <p key={idx}>{item}</p>)}
                            </div>
                          )}
                          {term.category !== 'Commitments' && term.content?.length > 0 && (
                            <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm">
                              {term.content.map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                          )}
                          {term.sub_sections?.length > 0 && (
                            <div className="space-y-4">
                              {term.sub_sections.map((section, sIdx) => (
                                <div key={sIdx}>
                                  <h4 className="font-semibold text-gray-800 mb-2">{section.title}</h4>
                                  <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
                                    {section.items?.map((item, iIdx) => <li key={iIdx}>{item}</li>)}
                                  </ol>
                                </div>
                              ))}
                            </div>
                          )}
                        </ExpandableSection>
                      );
                    })
                  ) : (
                    <ExpandableSection title="Terms and Conditions" icon={Shield}>
                      <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm">
                        <li>50% advance payment required at time of booking</li>
                        <li>Balance payment due 15 days before travel</li>
                        <li>Free cancellation up to 30 days before travel</li>
                        <li>Hotel check-in 14:00 / check-out 12:00</li>
                      </ul>
                    </ExpandableSection>
                  )}
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
                  const hotel = getHotelForCity(city.name, idx);
                  let cumulativeNightsTab = 0;
                  for (let i = 0; i < idx; i++) cumulativeNightsTab += proposal.cities[i]?.nights || 0;
                  const cityStartDateTab = addDays(proposal.leaving_on, cumulativeNightsTab);
                  const isLastCityTab = idx === proposal.cities.length - 1;
                  const totalNightsTab = proposal.cities?.reduce((acc, c) => acc + (c.nights || 0), 0) || 1;

                  // Collect transfers for this city
                  const cityTransfersTab = [];
                  if (idx === 0 && proposal.arrival_transfer) {
                    cityTransfersTab.push({ ...proposal.arrival_transfer, _dayNum: 1, _date: addDays(proposal.leaving_on, 0) });
                  }
                  if (idx > 0 && proposal.inter_city_transfers) {
                    const ict = proposal.inter_city_transfers[`${idx - 1}_${idx}`];
                    if (ict) cityTransfersTab.push({ ...ict, _dayNum: cumulativeNightsTab + 1, _date: cityStartDateTab });
                  }
                  if (isLastCityTab && proposal.departure_transfer) {
                    cityTransfersTab.push({ ...proposal.departure_transfer, _dayNum: totalNightsTab + 1, _date: addDays(proposal.leaving_on, totalNightsTab) });
                  }

                  // Collect activities for this city with day numbers
                  const cityActivitiesTab = [];
                  const selectedActsTab = proposal.selected_activities || {};
                  Object.keys(selectedActsTab).forEach(key => {
                    if (key.startsWith(city.name + '_')) {
                      const dayNum = parseInt(key.split('_').pop()) || 1;
                      const acts = selectedActsTab[key];
                      if (Array.isArray(acts)) {
                        acts.forEach(a => {
                          if (!cityActivitiesTab.some(existing => existing.id === a.id)) {
                            cityActivitiesTab.push({
                              ...a,
                              _dayNum: dayNum,
                              _date: addDays(proposal.leaving_on, dayNum - 1)
                            });
                          }
                        });
                      } else if (acts && !cityActivitiesTab.some(existing => existing.id === acts.id)) {
                        cityActivitiesTab.push({
                          ...acts,
                          _dayNum: dayNum,
                          _date: addDays(proposal.leaving_on, dayNum - 1)
                        });
                      }
                    }
                  });

                  // Merge and sort by day number
                  const allItemsTab = [
                    ...cityTransfersTab.map((t, tIdx) => ({ ...t, _type: 'transfer', _sortDay: t._dayNum, _idx: tIdx })),
                    ...cityActivitiesTab.map((a, aIdx) => ({
                      ...a,
                      _type: 'activity',
                      _sortDay: a._dayNum,
                      _idx: aIdx
                    }))
                  ].sort((a, b) => a._sortDay - b._sortDay);
                  
                  return (
                    <div key={idx} className="mb-10 bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                          <MapPin size={16} className="text-white" />
                        </div>
                        <span className="text-lg font-bold text-gray-800">{city.name}</span>
                        <span className="text-gray-500">{city.nights} night{city.nights > 1 ? 's' : ''} - {formatDate(cityStartDateTab, 'short')}</span>
                      </div>

                      {hotel && (
                        <div className="mb-6 pl-4 border-l-2 border-gray-200">
                          <div className="flex items-start gap-4">
                            <Hotel size={18} className="text-gray-400 mt-1" />
                            <div>
                              <p className="font-medium text-gray-800">Stay for {city.nights} night{city.nights > 1 ? 's' : ''} at {hotel.name}</p>
                              <p className="text-sm text-gray-500">{hotel.selectedRoom?.name || '1 x Double Room'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Transfers + Activities merged and sorted by day */}
                      {allItemsTab.length > 0 && (
                        <div className="mb-6 space-y-4">
                          {allItemsTab.map((item, itemIdx) => {
                            if (item._type === 'transfer') {
                              return (
                                <div key={`t-${item._idx}`} className="pl-4 border-l-2 border-teal-200">
                                  <div className="flex items-start gap-4">
                                    <Car size={18} className="text-teal-500 mt-1" />
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <p className="font-medium text-gray-800">
                                            {item.title || 'Private Transfer'}
                                            <button
                                              onClick={() => openTransferDetail(item)}
                                              className="ml-3 px-2.5 py-0.5 text-[11px] font-semibold text-teal-600 border border-teal-300 rounded bg-white hover:bg-teal-50 transition-colors align-middle"
                                            >
                                              VIEW
                                            </button>
                                          </p>
                                          {item.duration && (
                                            <p className="text-sm text-gray-500 mt-1">Duration: {item.duration}</p>
                                          )}
                                          <span className="inline-block mt-2 px-2.5 py-0.5 text-[11px] font-medium text-teal-700 border border-teal-200 rounded">
                                            Private Transfers
                                          </span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-sm text-gray-500">Day {item._dayNum}</p>
                                          <p className="text-sm text-gray-400">{formatDate(item._date, 'long')}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div key={`a-${item._idx}`} className="pl-4 border-l-2 border-teal-200">
                                  <div className="flex items-start gap-4">
                                    <Camera size={18} className="text-teal-500 mt-1" />
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <p className="font-medium text-gray-800">
                                            {item.name}
                                            <button
                                              onClick={() => setDetailModal({ open: true, item: item, type: 'activity' })}
                                              className="ml-3 px-2.5 py-0.5 text-[11px] font-semibold text-teal-600 border border-teal-300 rounded bg-white hover:bg-teal-50 transition-colors align-middle"
                                            >
                                              VIEW
                                            </button>
                                          </p>
                                          <p className="text-sm text-gray-500">{item.duration || 'Full Day'} • {item.transfer_type || 'Private'}</p>
                                          {item.inclusions?.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                              {item.inclusions.map((inc, incIdx) => (
                                                <div key={incIdx} className="flex items-start gap-2">
                                                  <Check size={12} className="text-green-500 mt-1 flex-shrink-0" />
                                                  <span className="text-sm text-gray-600">{inc}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-sm text-gray-500">Day {item._sortDay}</p>
                                          <p className="text-sm text-gray-400">{formatDate(item._date, 'long')}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-6 py-5 border-t border-gray-200">
                        <div className="flex items-center gap-3">
                          <Utensils size={18} className={hotelIncludesBreakfast(hotel) ? "text-teal-500" : "text-gray-400"} />
                          <div>
                            <p className="text-gray-800 font-medium">Breakfast</p>
                            {hotelIncludesBreakfast(hotel) ? (
                              <p className="text-sm text-teal-600 font-medium">Included with hotel</p>
                            ) : (
                              <p className="text-sm text-gray-400">Not Included</p>
                            )}
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
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none"
                      data-testid="message-textarea"
                    />
                    <div className="mt-4 flex justify-end">
                      <button 
                        onClick={async () => {
                          if (!messageText.trim()) return;
                          setSendingMessage(true);
                          try {
                            await api.post(`/messages/${proposal.id}`, {
                              sender: 'agent',
                              sender_name: proposal.customer_name || 'Agent',
                              text: messageText.trim()
                            });
                            setMessageText('');
                            // Refresh messages
                            const res = await api.get(`/messages/${proposal.id}`);
                            setChatMessages(res.data?.messages || []);
                          } catch (e) {
                            console.error('Send message error:', e);
                          }
                          setSendingMessage(false);
                        }}
                        disabled={sendingMessage || !messageText.trim()}
                        className="px-6 py-2.5 bg-[#002B5B] text-white rounded-lg font-medium hover:bg-[#003d82] flex items-center gap-2 disabled:opacity-50"
                        data-testid="send-message-btn"
                      >
                        <MessageSquare size={16} />
                        {sendingMessage ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Chat History */}
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-4">Message History</h3>
                    {chatMessages.length > 0 ? (
                      <div className="space-y-3">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className={`p-4 rounded-lg ${msg.sender === 'agent' ? 'bg-blue-50 border border-blue-100 ml-8' : 'bg-gray-50 border border-gray-100 mr-8'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">{msg.sender_name || msg.sender}</span>
                              <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-sm text-gray-600">{msg.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* REQUEST CHANGES Tab */}
            {activeTab === 'changes' && (
              <RequestChangesTab proposal={proposal} mainCity={mainCity} refreshProposal={refreshProposal} />
            )}
          </div>

          {/* Right Sidebar - Destination Expert + Price Breakdown */}
          <div className="hidden lg:block w-80 flex-shrink-0 space-y-4">
            {/* Destination Expert Card */}
            <DestinationExpertCard proposal={proposal} />

            <PriceSidebar 
              proposal={proposal} 
              onBookNow={onBookNow}
              onEditProposal={() => onEditProposal?.(proposal)}
              onUpdateProposal={refreshProposal}
              onAcceptProposal={handleAcceptProposal}
              acceptModal={acceptModal}
              onNeedHelp={() => {
                setActiveTab('changes');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onHoldBooking={handleHoldBooking}
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
        {detailModal.open && (
          <DetailViewModal
            isOpen={detailModal.open}
            item={detailModal.item}
            type={detailModal.type}
            onClose={() => setDetailModal({ open: false, item: null, type: null })}
          />
        )}

        {/* Accept Proposal Notification Modal */}
        {acceptModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setAcceptModal(prev => ({ ...prev, open: false }))}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
              onClick={e => e.stopPropagation()}
              data-testid="accept-proposal-modal"
            >
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Proposal Accepted</h3>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-gray-700">
                  Your proposal has been accepted and is now <span className="font-semibold text-green-700">held for 30 minutes</span>. 
                  Please proceed to booking before the hold expires.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <Clock size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Hold expires at</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      {acceptModal.holdUntil
                        ? new Date(acceptModal.holdUntil).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true,
                            timeZone: 'Asia/Dubai'
                          })
                        : '—'}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">Prices and availability are guaranteed until this time.</p>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-5 flex gap-3">
                <button
                  onClick={() => setAcceptModal(prev => ({ ...prev, open: false }))}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  data-testid="accept-modal-close"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setAcceptModal(prev => ({ ...prev, open: false }));
                    onBookNow?.();
                  }}
                  className="flex-1 py-2.5 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold rounded-lg transition-colors text-sm"
                  data-testid="accept-modal-book-now"
                >
                  Book Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

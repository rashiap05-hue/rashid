import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Users, Clock, Star, Hotel, Plane, Car, 
  ChevronDown, ChevronUp, Check, X, AlertTriangle, Play,
  Download, Mail, MessageCircle, DollarSign, CreditCard, HelpCircle,
  Coffee, Utensils, Sun, Moon, Plus, Edit2, Trash2, Bed, Info, Eye,
  FileText, ChevronRight, Shield, Briefcase, AlertCircle
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
    <div className="min-h-screen bg-white" data-testid="proposal-view-page">
      {/* Breadcrumb Navigation */}
      <div className="bg-gray-50 border-b border-gray-200">
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
      <div className="border-b border-gray-200">
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ITINERARY Tab */}
        {activeTab === 'itinerary' && (
          <div data-testid="itinerary-content">
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
                height="350"
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
          <div data-testid="inclusions-content">
            {/* INCLUSIONS Header */}
            <div className="flex items-center justify-center my-8">
              <div className="flex-1 h-px bg-gray-200"></div>
              <h2 className="px-6 text-xl font-bold text-gray-800 tracking-wider">INCLUSIONS</h2>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* City Inclusions */}
            {proposal.cities?.map((city, idx) => {
              const hotel = getHotelForCity(city.name);
              return (
                <div key={idx} className="mb-10">
                  {/* City Header */}
                  <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-200">
                    <MapPin size={20} className="text-teal-500" />
                    <span className="text-lg font-bold text-gray-800">{city.name}</span>
                    <span className="text-gray-500">{city.nights} nights - {formatDate(proposal.leaving_on, 'short')}</span>
                  </div>

                  {/* Hotel Stay */}
                  {hotel && (
                    <div className="mb-6">
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
                  <div className="space-y-4 mb-6">
                    {/* Arrival Transfer */}
                    <div className="flex items-start gap-4">
                      <Car size={18} className="text-gray-400 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-800 text-sm">One-way transfer from {city.name} airport to {city.name} center - Private from Shota Rustaveli {city.name} International Airport</span>
                          <button className="text-xs text-blue-600 border border-blue-500 px-2 py-0.5 rounded hover:bg-blue-50 font-medium">VIEW</button>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded font-medium">Private Transfers</span>
                          <span className="text-gray-500">Day 1</span>
                          <span className="text-gray-500">{formatDate(proposal.leaving_on, 'long')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Departure Transfer */}
                    <div className="flex items-start gap-4">
                      <Car size={18} className="text-gray-400 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-800 text-sm">One-way transfer from {city.name} center - {city.name} Airport - Private to Shota Rustaveli {city.name} International Airport</span>
                          <button className="text-xs text-blue-600 border border-blue-500 px-2 py-0.5 rounded hover:bg-blue-50 font-medium">VIEW</button>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded font-medium">Private Transfers</span>
                          <span className="text-gray-500">Day {daysCount}</span>
                          <span className="text-gray-500">{formatDate(checkOutDate, 'long')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meals Grid */}
                  <div className="grid grid-cols-3 gap-6 py-5 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Coffee size={18} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-800 font-medium">Breakfast</p>
                        <p className="text-sm text-gray-400">Not Included</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <X size={18} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-800 font-medium">Lunch</p>
                        <p className="text-sm text-gray-400">Not Included</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Moon size={18} className="text-gray-400" />
                      </div>
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
            <div className="mt-10 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Shield size={20} className="text-gray-600" />
                Travel Insurance
              </h3>
              <p className="text-gray-600 mb-2">Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs</p>
              <p className="text-red-500 text-sm font-medium">Not Included</p>
            </div>

            {/* Exclusions */}
            <div className="mt-12 pt-8 border-t border-gray-200">
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
          <div className="py-6" data-testid="terms-content">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Terms and Policies</h2>
            <div className="space-y-8 text-gray-600">
              <section>
                <h3 className="font-bold text-gray-800 mb-3 text-lg">Booking Terms</h3>
                <p className="leading-relaxed">All bookings are subject to availability at the time of confirmation. The prices quoted are valid for the specified dates and may vary if dates are changed.</p>
              </section>
              <section>
                <h3 className="font-bold text-gray-800 mb-3 text-lg">Payment Terms</h3>
                <p className="leading-relaxed">100% payment is required at the time of booking to confirm the reservation. All payments must be made in the currency specified in the quotation.</p>
              </section>
              <section>
                <h3 className="font-bold text-gray-800 mb-3 text-lg">Cancellation Policy</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Cancellations made 30+ days before travel: Full refund minus administrative fees</li>
                  <li>Cancellations made 15-30 days before travel: 50% refund</li>
                  <li>Cancellations made 7-14 days before travel: 25% refund</li>
                  <li>Cancellations made less than 7 days before travel: No refund</li>
                </ul>
              </section>
              <section>
                <h3 className="font-bold text-gray-800 mb-3 text-lg">Amendment Policy</h3>
                <p className="leading-relaxed">Any changes to the booking after confirmation may be subject to additional charges depending on availability and supplier policies.</p>
              </section>
              <section>
                <h3 className="font-bold text-gray-800 mb-3 text-lg">Travel Documents</h3>
                <p className="leading-relaxed">It is the responsibility of the traveler to ensure they have valid travel documents, including passports, visas, and any required health certifications.</p>
              </section>
            </div>
          </div>
        )}

        {/* MESSAGES Tab */}
        {activeTab === 'messages' && (
          <div className="py-6" data-testid="messages-content">
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
          <div className="py-6" data-testid="help-content">
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

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
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
  );
}

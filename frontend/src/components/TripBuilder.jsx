import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Hotel, MapPin, Calendar, Users, ChevronDown, ChevronRight, 
  Plus, X, Check, Star, Clock, Coffee, Wifi, Car, Edit2, Loader2,
  CreditCard, Save, ArrowRight, Sun, Moon, Utensils, Camera, Info, AlertCircle,
  List, Ban, Search, DollarSign, Globe, Compass, Trash2, Phone, Mail, User, Filter,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';
import FlightSearchModal from './FlightSearchModal';
import HotelDetailsView from './HotelDetailsView';

// Import extracted components from TripBuilder folder
import SaveProposalModal from './TripBuilder/SaveProposalModal';
import ActivitiesModal from './TripBuilder/ActivitiesModal';
import VehicleSelectionModal from './TripBuilder/VehicleSelectionModal';
import UpdateFlightInfoModal from './TripBuilder/UpdateFlightInfoModal';
import HotelOptionsModal from './TripBuilder/HotelOptionsModal';
import HotelSelectionModal from './TripBuilder/HotelSelectionModal';
import DayCard from './TripBuilder/DayCard';
import VersionHistoryPanel from './TripBuilder/VersionHistoryPanel';

// Main Trip Builder Component
export default function TripBuilder({ data, user, onBack, onConfirm }) {
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showHotelOptions, setShowHotelOptions] = useState(false);
  const [selectedHotels, setSelectedHotels] = useState({});
  const [activeHotelCity, setActiveHotelCity] = useState(null);
  const [hotelSearchQuery, setHotelSearchQuery] = useState('');
  const [noStayCities, setNoStayCities] = useState({});
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [changeRoomHotel, setChangeRoomHotel] = useState(null); // Hotel to show room options for
  
  // Save Proposal Modal state
  const [showSaveProposalModal, setShowSaveProposalModal] = useState(false);
  
  // Activities state
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [activeActivityCity, setActiveActivityCity] = useState(null);
  const [activeActivityDay, setActiveActivityDay] = useState(null);
  const [selectedActivities, setSelectedActivities] = useState({}); // { "city_day": [activities] }
  
  // Selected extras state: { "activityId": [{ id, name, price, ... }] }
  const [selectedExtras, setSelectedExtras] = useState({});
  
  // Vehicle selection state for activities
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [pendingActivity, setPendingActivity] = useState(null);
  const [activityVehicles, setActivityVehicles] = useState({}); // { "activityId": vehicleKey }

  // Travel Insurance state
  const [travelInsurance, setTravelInsurance] = useState(false);
  const [insuranceSettings, setInsuranceSettings] = useState(null);

  // AI Itinerary Generator state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiItinerary, setAiItinerary] = useState(null);
  const [showAiItinerary, setShowAiItinerary] = useState(false);

  // Fetch insurance settings based on destination country
  useEffect(() => {
    const fetchInsurance = async () => {
      try {
        // Get destination city and look up its country
        const destinationCity = data?.cities?.[0]?.name;
        let country = '';
        if (destinationCity) {
          const cityRes = await api.get(`/cities?search=${encodeURIComponent(destinationCity)}`);
          country = cityRes.data?.cities?.[0]?.country || '';
        }
        const params = country ? `?country=${encodeURIComponent(country)}` : '';
        const res = await api.get(`/settings/insurance${params}`);
        setInsuranceSettings(res.data);
      } catch (e) { /* use defaults */ }
    };
    fetchInsurance();
  }, [data?.cities]);
  
  // Transfer state
  const [availableTransfers, setAvailableTransfers] = useState([]);
  const [selectedArrivalTransfer, setSelectedArrivalTransfer] = useState(null);
  const [selectedDepartureTransfer, setSelectedDepartureTransfer] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferModalType, setTransferModalType] = useState('arrival'); // 'arrival' or 'departure'
  const [transferCity, setTransferCity] = useState(null);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferCategoryFilter, setTransferCategoryFilter] = useState('All Options');
  const [transferTimeFilter, setTransferTimeFilter] = useState('All');

  // Inter-city transfer state
  const [interCityTransfers, setInterCityTransfers] = useState({}); // keyed by "fromIdx_toIdx"
  const [interCityTransferModal, setInterCityTransferModal] = useState({ open: false, fromCityIdx: null, toCityIdx: null, fromCity: '', toCity: '' });
  const [interCityTransferOptions, setInterCityTransferOptions] = useState([]);
  const [interCityLoading, setInterCityLoading] = useState(false);
  const [showInterCityVehicleModal, setShowInterCityVehicleModal] = useState(false);
  const [pendingInterCityTransfer, setPendingInterCityTransfer] = useState(null);
  
  // Vehicle selection state for transfers
  const [showTransferVehicleModal, setShowTransferVehicleModal] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [transferVehicles, setTransferVehicles] = useState({}); // { "transferId": vehicleKey }

  // Update Flight Info Modal state
  const [showFlightInfoModal, setShowFlightInfoModal] = useState(false);
  const [flightInfoType, setFlightInfoType] = useState('arrival'); // 'arrival' or 'departure'
  const [arrivalFlightInfo, setArrivalFlightInfo] = useState(null);
  const [departureFlightInfo, setDepartureFlightInfo] = useState(null);

  // Load saved proposal data when editing
  useEffect(() => {
    if (!data?.isEditing) return;
    
    // Restore selected hotels (keyed by cityIndex)
    if (data.selected_hotels && typeof data.selected_hotels === 'object') {
      const hotels = {};
      const vehiclesMap = {};
      Object.entries(data.selected_hotels).forEach(([key, hotel]) => {
        if (!hotel) return;
        // Handle both pure numeric keys ("0") and "CityName_idx" format
        let cityIndex = key;
        if (!/^\d+$/.test(key)) {
          // Key like "Tbilisi_0" - extract the last numeric segment
          const lastUnderscore = key.lastIndexOf('_');
          if (lastUnderscore !== -1) {
            cityIndex = key.substring(lastUnderscore + 1);
          }
        }
        hotels[cityIndex] = hotel;
      });
      if (Object.keys(hotels).length > 0) setSelectedHotels(hotels);
    }

    // Restore selected activities and rebuild activityVehicles map
    if (data.selected_activities && typeof data.selected_activities === 'object') {
      const restoredVehicles = {};
      Object.values(data.selected_activities).forEach(dayActivities => {
        if (Array.isArray(dayActivities)) {
          dayActivities.forEach(act => {
            if (act?.id && act?.selectedVehicle) {
              restoredVehicles[act.id] = act.selectedVehicle;
            }
          });
        }
      });
      setSelectedActivities(data.selected_activities);
      if (Object.keys(restoredVehicles).length > 0) setActivityVehicles(restoredVehicles);
    }

    // Restore selected extras
    if (data.selected_extras && typeof data.selected_extras === 'object') {
      setSelectedExtras(data.selected_extras);
    }

    // Restore arrival/departure transfers and rebuild transferVehicles map
    if (data.arrival_transfer) {
      setSelectedArrivalTransfer(data.arrival_transfer);
      if (data.arrival_transfer.id && data.arrival_transfer.selectedVehicle) {
        setTransferVehicles(prev => ({ ...prev, [data.arrival_transfer.id]: data.arrival_transfer.selectedVehicle }));
      }
    }
    if (data.departure_transfer) {
      setSelectedDepartureTransfer(data.departure_transfer);
      if (data.departure_transfer.id && data.departure_transfer.selectedVehicle) {
        setTransferVehicles(prev => ({ ...prev, [data.departure_transfer.id]: data.departure_transfer.selectedVehicle }));
      }
    }

    // Restore inter-city transfers
    if (data.inter_city_transfers && typeof data.inter_city_transfers === 'object') {
      setInterCityTransfers(data.inter_city_transfers);
    }

    // Restore flight info
    if (data.arrival_flight_info) setArrivalFlightInfo(data.arrival_flight_info);
    if (data.departure_flight_info) setDepartureFlightInfo(data.departure_flight_info);

    // Restore selected flight
    if (data.selected_flight) setSelectedFlight(data.selected_flight);

    // Restore travel insurance
    if (data.travel_insurance) setTravelInsurance(data.travel_insurance);
  }, [data?.isEditing]);

  // Fetch transfers for the destination country
  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        // Get the first city to determine the country
        const destinationCity = data?.cities?.[0]?.name;
        if (!destinationCity) return;
        
        // Fetch city details to get the country
        const cityRes = await api.get(`/cities?search=${encodeURIComponent(destinationCity)}`);
        const cityData = cityRes.data?.cities?.[0];
        const country = cityData?.country;
        
        if (country) {
          // Fetch transfers for this city
          const transferRes = await api.get(`/transfers?city=${encodeURIComponent(destinationCity)}`);
          let transfers = transferRes.data?.transfers || [];
          
          // If no transfers for specific city, try fetching by country match
          if (transfers.length === 0) {
            const allTransfersRes = await api.get('/transfers');
            const allTransfers = allTransfersRes.data?.transfers || [];
            // Filter transfers that are in cities of the same country
            // For now, we'll use city-based matching since transfers have city field
            transfers = allTransfers.filter(t => {
              const transferCity = t.city?.toLowerCase() || '';
              const destCity = destinationCity.toLowerCase();
              // Match by city name or country-related keywords
              return transferCity.includes(destCity) || 
                     destCity.includes(transferCity) ||
                     transferCity.includes(country.toLowerCase().split(' ')[0]);
            });
            
            // If still no matches, show all transfers from the same general region
            if (transfers.length === 0) {
              transfers = allTransfers;
            }
          }
          
          setAvailableTransfers(transfers);
        }
      } catch (error) {
        console.error('Error fetching transfers:', error);
      }
    };
    
    fetchTransfers();
  }, [data?.cities]);

  // Open transfer selection modal
  const openTransferModal = (type, city) => {
    setTransferModalType(type);
    setTransferCity(city);
    setTransferSearch('');
    setTransferCategoryFilter('All Options');
    setTransferTimeFilter('All');
    setShowTransferModal(true);
  };

  // Select a transfer - show vehicle modal first
  const handleSelectTransfer = (transfer) => {
    setPendingTransfer(transfer);
    setShowTransferVehicleModal(true);
  };

  // Handle vehicle selection for transfer
  const handleTransferVehicleSelect = (transfer, vehicleKey, price) => {
    const transferWithVehicle = { ...transfer, selectedVehicle: vehicleKey, vehiclePrice: price };
    
    if (transferModalType === 'arrival') {
      setSelectedArrivalTransfer(transferWithVehicle);
    } else {
      setSelectedDepartureTransfer(transferWithVehicle);
    }
    
    // Store vehicle selection
    setTransferVehicles(prev => ({
      ...prev,
      [transfer.id]: vehicleKey
    }));
    
    setShowTransferVehicleModal(false);
    setShowTransferModal(false);
    setPendingTransfer(null);
  };

  // Handle hotel option selection
  const handleChangeHotel = (cityIndex) => {
    setActiveHotelCity(cityIndex);
    setChangeRoomHotel(null);
    setShowHotelOptions(true);
  };

  // Handle Change Room - directly show room options for the selected hotel
  const handleChangeRoom = (cityIndex) => {
    const currentHotel = selectedHotels[cityIndex];
    if (currentHotel) {
      setActiveHotelCity(cityIndex);
      setChangeRoomHotel(currentHotel);
      setShowHotelModal(true);
    }
  };

  const handleViewAllHotels = () => {
    setShowHotelOptions(false);
    setHotelSearchQuery('');
    setChangeRoomHotel(null);
    setShowHotelModal(true);
  };

  const handleNoStay = () => {
    setNoStayCities(prev => ({ ...prev, [activeHotelCity]: true }));
    setSelectedHotels(prev => {
      const newHotels = { ...prev };
      delete newHotels[activeHotelCity];
      return newHotels;
    });
    setShowHotelOptions(false);
  };

  const handleSearchHotel = (query) => {
    setHotelSearchQuery(query);
    setShowHotelOptions(false);
    setShowHotelModal(true);
  };

  // Handle opening Update Flight Info Modal
  const handleOpenFlightInfoModal = (type, city) => {
    setFlightInfoType(type);
    setShowFlightInfoModal(true);
  };

  // Handle updating flight info
  const handleUpdateFlightInfo = (info) => {
    if (info.type === 'arrival') {
      setArrivalFlightInfo(info);
    } else {
      setDepartureFlightInfo(info);
    }
  };

  // Handle activity selection
  const handleAddActivity = (cityName, dayNumber) => {
    setActiveActivityCity(cityName);
    setActiveActivityDay(dayNumber);
    setShowActivitiesModal(true);
  };

  const handleSelectActivity = (activity) => {
    const key = `${activeActivityCity}_${activeActivityDay}`;
    const currentActivities = selectedActivities[key] || [];
    
    // Check if already selected - if so, remove it directly
    const existingIndex = currentActivities.findIndex(a => a.id === activity.id);
    if (existingIndex >= 0) {
      // Remove activity
      setSelectedActivities(prev => ({
        ...prev,
        [key]: currentActivities.filter(a => a.id !== activity.id)
      }));
      // Also remove vehicle selection
      setActivityVehicles(prev => {
        const newVehicles = { ...prev };
        delete newVehicles[activity.id];
        return newVehicles;
      });
    } else {
      // Show vehicle selection modal for new activity
      setPendingActivity(activity);
      setShowVehicleModal(true);
    }
  };

  // Handle vehicle selection for activity
  const handleVehicleSelect = (activity, vehicleKey, price) => {
    const key = `${activeActivityCity}_${activeActivityDay}`;
    
    // Add activity with selected vehicle
    setSelectedActivities(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { ...activity, selectedVehicle: vehicleKey, vehiclePrice: price }]
    }));
    
    // Store vehicle selection
    setActivityVehicles(prev => ({
      ...prev,
      [activity.id]: vehicleKey
    }));
    
    // Close vehicle modal
    setShowVehicleModal(false);
    setPendingActivity(null);
  };

  const handleRemoveActivity = (cityName, dayNumber, activityId) => {
    const key = `${cityName}_${dayNumber}`;
    setSelectedActivities(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(a => a.id !== activityId)
    }));
    // Also clean up extras for removed activity
    setSelectedExtras(prev => {
      const next = { ...prev };
      delete next[activityId];
      return next;
    });
  };

  // Toggle an extra for a specific activity
  const handleToggleExtra = (activityId, extra) => {
    setSelectedExtras(prev => {
      const current = prev[activityId] || [];
      const extraKey = extra.id || extra.name;
      const exists = current.some(e => (e.id || e.name) === extraKey);
      if (exists) {
        return { ...prev, [activityId]: current.filter(e => (e.id || e.name) !== extraKey) };
      } else {
        return { ...prev, [activityId]: [...current, extra] };
      }
    });
  };

  // AI Itinerary Generator
  const handleGenerateAiItinerary = async () => {
    setAiGenerating(true);
    try {
      const citiesPayload = cities.map(c => ({ name: c.name, nights: c.nights || 1 }));
      const totalPaxCount = getTotalPassengers();
      const res = await api.post('/ai/itinerary', {
        cities: citiesPayload,
        travelers: totalPaxCount,
        interests: null
      });
      if (res.data?.success && res.data?.itinerary) {
        setAiItinerary(res.data.itinerary);
        setShowAiItinerary(true);
      } else if (res.data?.raw) {
        setAiItinerary({ raw: res.data.raw });
        setShowAiItinerary(true);
      } else {
        alert('AI could not generate an itinerary. Please try again.');
      }
    } catch (err) {
      alert('Failed to generate AI itinerary: ' + (err.response?.data?.detail || err.message));
    } finally {
      setAiGenerating(false);
    }
  };

  // Apply AI itinerary to Trip Builder
  const handleApplyAiItinerary = async () => {
    if (!aiItinerary?.days) return;
    try {
      // Fetch all activities for the trip cities
      const cityNames = cities.map(c => c.name);
      const allActivities = [];
      for (const cityName of cityNames) {
        const res = await api.get(`/activities?city=${encodeURIComponent(cityName)}`);
        if (res.data?.activities) allActivities.push(...res.data.activities);
      }

      const newSelectedActivities = { ...selectedActivities };
      let appliedCount = 0;

      for (const day of aiItinerary.days) {
        if (!day.activities?.length) continue;
        const dayCity = day.city;
        const dayNum = day.day;
        const key = `${dayCity}_${dayNum}`;
        const existingIds = new Set((newSelectedActivities[key] || []).map(a => a.id));
        const dayActivities = [...(newSelectedActivities[key] || [])];

        for (const aiAct of day.activities) {
          // Try to match by activity_id first
          let dbActivity = null;
          if (aiAct.activity_id) {
            dbActivity = allActivities.find(a => a.id === aiAct.activity_id);
          }
          // Fallback: match by name similarity
          if (!dbActivity) {
            const aiName = (aiAct.name || '').toLowerCase();
            dbActivity = allActivities.find(a =>
              a.city?.toLowerCase() === dayCity.toLowerCase() &&
              (a.name?.toLowerCase().includes(aiName) || aiName.includes(a.name?.toLowerCase()))
            );
          }
          if (dbActivity && !existingIds.has(dbActivity.id)) {
            // Auto-select default vehicle pricing
            let vehicleKey = selectedVehicle.key;
            let vehiclePrice = dbActivity.price || 0;
            if (dbActivity.vehicle_pricing && dbActivity.vehicle_pricing[vehicleKey]) {
              vehiclePrice = dbActivity.vehicle_pricing[vehicleKey].selling_price || vehiclePrice;
            }
            dayActivities.push({ ...dbActivity, selectedVehicle: vehicleKey, vehiclePrice });
            existingIds.add(dbActivity.id);
            appliedCount++;
          }
        }
        newSelectedActivities[key] = dayActivities;
      }

      setSelectedActivities(newSelectedActivities);
      setShowAiItinerary(false);
      if (appliedCount > 0) {
        alert(`Applied ${appliedCount} activities from the AI itinerary to your trip!`);
      } else {
        alert('No matching activities found in the database. You can add activities manually to each day.');
      }
    } catch (err) {
      alert('Failed to apply itinerary: ' + err.message);
    }
  };

  // Get activities for a specific day
  const getActivitiesForDay = (cityName, dayNumber) => {
    const key = `${cityName}_${dayNumber}`;
    return selectedActivities[key] || [];
  };

  // Calculate trip details
  const cities = data?.cities || [];
  const totalNights = cities.reduce((acc, c) => acc + (c.nights || 1), 0);
  const totalDays = totalNights + 1; // Days = Nights + 1 (departure day)
  
  // Format date
  let startDate = new Date(data?.leaving_on || new Date());
  
  // Calculate return date (departure date + total nights)
  const returnDate = new Date(startDate);
  returnDate.setDate(returnDate.getDate() + totalNights);
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };
  
  const formatShortDate = (date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  // Generate itinerary days - including departure day
  const generateItinerary = () => {
    const days = [];
    let currentDate = new Date(startDate);
    let dayNumber = 1;
    
    // Generate days for each city's nights
    cities.forEach((city, cityIndex) => {
      for (let night = 0; night < (city.nights || 1); night++) {
        const isFirstNightInCity = night === 0;
        const isLastNightInCity = night === (city.nights || 1) - 1;
        const prevCity = cityIndex > 0 ? cities[cityIndex - 1] : null;
        const nextCity = cities[cityIndex + 1];
        
        // Check-in day: first night in city, has a previous different city
        const isCheckInDay = isFirstNightInCity && prevCity && prevCity.name !== city.name;
        // Check-out day: last night in city, has a next different city
        const isCheckOutDay = isLastNightInCity && nextCity && nextCity.name !== city.name;
        
        days.push({
          day: dayNumber,
          date: formatDate(currentDate),
          city: city.name,
          cityIndex,
          isFirst: dayNumber === 1,
          isLast: false,
          isDeparture: false,
          hotel: selectedHotels[cityIndex],
          // Incoming transfer (shown on check-in day of destination)
          isCheckInDay,
          incomingFromCity: isCheckInDay ? prevCity.name : null,
          incomingFromCityIdx: isCheckInDay ? cityIndex - 1 : null,
          incomingTransfer: isCheckInDay ? interCityTransfers[`${cityIndex - 1}_${cityIndex}`] : null,
          // Outgoing transfer (shown on check-out day of source)
          isCheckOutDay,
          outgoingToCity: isCheckOutDay ? nextCity.name : null,
          outgoingToCityIdx: isCheckOutDay ? cityIndex + 1 : null,
          outgoingTransfer: isCheckOutDay ? interCityTransfers[`${cityIndex}_${cityIndex + 1}`] : null,
          // Keep for backward compat
          isTransitionDay: false,
          nextCity: null,
          nextCityIndex: null,
          interCityTransfer: null
        });
        currentDate.setDate(currentDate.getDate() + 1);
        dayNumber++;
      }
    });

    // Add departure day (the day after the last night)
    if (days.length > 0) {
      const lastCity = cities[cities.length - 1];
      days.push({
        day: dayNumber,
        date: formatDate(currentDate),
        city: lastCity?.name || 'Destination',
        cityIndex: cities.length - 1,
        isFirst: false,
        isLast: true,
        isDeparture: true,
        hotel: null
      });
    }

    return days;
  };

  const itinerary = generateItinerary();

  // Determine vehicle type based on total passengers
  const getVehicleTypeForPax = (totalPax) => {
    if (totalPax <= 4) return { key: 'sedan_4', label: '4 Seater Sedan', icon: '🚗', maxPax: 4 };
    if (totalPax <= 7) return { key: 'car_7', label: '7 Seater Car', icon: '🚙', maxPax: 7 };
    if (totalPax <= 8) return { key: 'van_8', label: '8 Seater Van', icon: '🚐', maxPax: 8 };
    if (totalPax <= 17) return { key: 'van_17', label: '17 Seater Van', icon: '🚐', maxPax: 17 };
    if (totalPax <= 29) return { key: 'bus_29', label: '29 Seater Bus', icon: '🚌', maxPax: 29 };
    if (totalPax <= 45) return { key: 'bus_45', label: '45 Seater Bus', icon: '🚌', maxPax: 45 };
    return { key: 'bus_55', label: '55 Seater Bus', icon: '🚌', maxPax: 55 };
  };

  // Calculate total passengers
  const getTotalPassengers = () => {
    const adultsCount = data?.room_data?.reduce((acc, r) => acc + r.adults, 0) || 2;
    const childrenCount = data?.room_data?.reduce((acc, r) => acc + r.children?.length, 0) || 0;
    return adultsCount + childrenCount;
  };

  const totalPax = getTotalPassengers();
  const selectedVehicle = getVehicleTypeForPax(totalPax);

  // Get vehicle-based price for an activity
  const getActivityPriceForVehicle = (activity) => {
    if (!activity) return 0;
    
    // Check if activity has a selected vehicle (from vehicle selection modal)
    if (activity.selectedVehicle && activity.vehiclePrice !== undefined) {
      return activity.vehiclePrice;
    }
    
    // Check if we have stored a vehicle selection for this activity
    const storedVehicle = activityVehicles[activity.id];
    if (storedVehicle && activity.vehicle_pricing && activity.vehicle_pricing[storedVehicle]) {
      return activity.vehicle_pricing[storedVehicle].selling_price || 0;
    }
    
    // If activity has vehicle-based pricing, use selected vehicle based on pax
    if (activity.vehicle_pricing && activity.vehicle_pricing[selectedVehicle.key]) {
      return activity.vehicle_pricing[selectedVehicle.key].selling_price || 0;
    }
    
    // Fallback to regular price
    return activity.price || 0;
  };

  // Get vehicle label for an activity
  const getActivityVehicleLabel = (activity) => {
    if (!activity) return null;
    
    // Check if activity has a selected vehicle
    if (activity.selectedVehicle) {
      const vehicles = {
        'sedan_4': '🚗 4 Seater Sedan',
        'car_7': '🚙 7 Seater Car',
        'van_8': '🚐 8 Seater Van',
        'van_17': '🚐 17 Seater Van',
        'bus_29': '🚌 29 Seater Bus',
        'bus_45': '🚌 45 Seater Bus',
        'bus_55': '🚌 55 Seater Bus'
      };
      return vehicles[activity.selectedVehicle] || null;
    }
    
    return null;
  };

  // Get vehicle-based price for a transfer
  const getTransferPriceForVehicle = (transfer) => {
    if (!transfer) return 0;
    
    // Check if transfer has a selected vehicle (from vehicle selection modal)
    if (transfer.selectedVehicle && transfer.vehiclePrice !== undefined) {
      return transfer.vehiclePrice;
    }
    
    // Check if we have stored a vehicle selection for this transfer
    const storedVehicle = transferVehicles[transfer.id];
    if (storedVehicle && transfer.vehicle_pricing && transfer.vehicle_pricing[storedVehicle]) {
      return transfer.vehicle_pricing[storedVehicle].selling_price || 0;
    }
    
    // If transfer has vehicle-based pricing, use selected vehicle based on pax
    if (transfer.vehicle_pricing && transfer.vehicle_pricing[selectedVehicle.key]) {
      return transfer.vehicle_pricing[selectedVehicle.key].selling_price || 0;
    }
    
    // Fallback to regular price
    return transfer.price || 0;
  };

  // Get vehicle label for a transfer
  const getTransferVehicleLabel = (transfer) => {
    if (!transfer) return null;
    
    // Check if transfer has a selected vehicle
    if (transfer.selectedVehicle) {
      const vehicles = {
        'sedan_4': '🚗 4 Seater Sedan',
        'car_7': '🚙 7 Seater Car',
        'van_8': '🚐 8 Seater Van',
        'van_17': '🚐 17 Seater Van',
        'bus_29': '🚌 29 Seater Bus',
        'bus_45': '🚌 45 Seater Bus',
        'bus_55': '🚌 55 Seater Bus'
      };
      return vehicles[transfer.selectedVehicle] || null;
    }
    
    return null;
  };

  // Inter-city transfer modal handler
  const handleOpenInterCityTransfer = async (fromCityIdx, toCityIdx, fromCity, toCity) => {
    setInterCityTransferModal({ open: true, fromCityIdx, toCityIdx, fromCity, toCity });
    setInterCityLoading(true);
    try {
      const res = await api.get(`/transfers/inter-city/search?from_city=${encodeURIComponent(fromCity)}&to_city=${encodeURIComponent(toCity)}`);
      setInterCityTransferOptions(res.data?.transfers || []);
    } catch (err) {
      setInterCityTransferOptions([]);
    } finally {
      setInterCityLoading(false);
    }
  };

  const handleSelectInterCityTransfer = (transfer) => {
    // If transfer has vehicle pricing, show vehicle selection modal
    if (transfer.vehicle_pricing && Object.keys(transfer.vehicle_pricing).length > 0) {
      setPendingInterCityTransfer(transfer);
      setShowInterCityVehicleModal(true);
    } else {
      // No vehicle pricing, select directly
      const key = `${interCityTransferModal.fromCityIdx}_${interCityTransferModal.toCityIdx}`;
      setInterCityTransfers(prev => ({
        ...prev,
        [key]: { ...transfer, selectedPrice: transfer.price || 0, selectedVehicle: null, vehicleLabel: null }
      }));
      setInterCityTransferModal({ open: false, fromCityIdx: null, toCityIdx: null, fromCity: '', toCity: '' });
    }
  };

  const handleInterCityVehicleSelect = (transfer, vehicleKey, price) => {
    const vehicleLabels = {
      'sedan_4': '4 Seater Sedan',
      'car_7': '7 Seater Car',
      'van_8': '8 Seater Van',
      'van_17': '17 Seater Van',
      'bus_29': '29 Seater Bus',
      'bus_45': '45 Seater Bus',
      'bus_55': '55 Seater Bus'
    };
    const key = `${interCityTransferModal.fromCityIdx}_${interCityTransferModal.toCityIdx}`;
    setInterCityTransfers(prev => ({
      ...prev,
      [key]: { ...transfer, selectedPrice: price, selectedVehicle: vehicleKey, vehicleLabel: vehicleLabels[vehicleKey] || vehicleKey }
    }));
    setShowInterCityVehicleModal(false);
    setPendingInterCityTransfer(null);
    setInterCityTransferModal({ open: false, fromCityIdx: null, toCityIdx: null, fromCity: '', toCity: '' });
  };

  const handleRemoveInterCityTransfer = (fromCityIdx, toCityIdx) => {
    const key = `${fromCityIdx}_${toCityIdx}`;
    setInterCityTransfers(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Calculate pricing
  const calculatePricing = () => {
    let hotelTotal = 0;
    Object.values(selectedHotels).forEach(hotel => {
      if (hotel?.selectedRoom?.price) {
        hotelTotal += hotel.selectedRoom.price * (hotel.nights || 1);
      }
    });

    const flightPrice = selectedFlight ? parseFloat(selectedFlight.price?.replace(',', '') || 0) : 0;
    
    // Use vehicle-based pricing for transfers
    const arrivalTransferPrice = getTransferPriceForVehicle(selectedArrivalTransfer);
    const departureTransferPrice = getTransferPriceForVehicle(selectedDepartureTransfer);
    
    // Inter-city transfer costs
    let interCityTransferTotal = 0;
    Object.values(interCityTransfers).forEach(t => {
      interCityTransferTotal += t.selectedPrice || t.price || 0;
    });
    
    const transferTotal = arrivalTransferPrice + departureTransferPrice + interCityTransferTotal;
    
    // Calculate activities total using vehicle-based pricing
    let activitiesTotal = 0;
    Object.values(selectedActivities).forEach(dayActivities => {
      dayActivities.forEach(activity => {
        activitiesTotal += getActivityPriceForVehicle(activity);
      });
    });
    
    // Calculate extras total
    let extrasTotal = 0;
    Object.entries(selectedExtras).forEach(([activityId, extras]) => {
      extras.forEach(extra => {
        // Find the activity to check vehicle selection
        let activityVehicle = null;
        Object.values(selectedActivities).forEach(dayActs => {
          const found = dayActs.find(a => a.id === activityId);
          if (found) activityVehicle = found.selectedVehicle;
        });
        if (extra.vehicle_pricing && activityVehicle && extra.vehicle_pricing[activityVehicle]) {
          extrasTotal += extra.vehicle_pricing[activityVehicle];
        } else {
          extrasTotal += extra.price || 0;
        }
      });
    });
    activitiesTotal += extrasTotal;
    
    const adultsCount = data?.room_data?.reduce((acc, r) => acc + r.adults, 0) || 2;
    const childrenCount = data?.room_data?.reduce((acc, r) => acc + r.children?.length, 0) || 0;
    
    const subtotal = hotelTotal + flightPrice + transferTotal + activitiesTotal;
    
    // Calculate insurance cost (per person × adults)
    const insuranceTotal = travelInsurance ? (insuranceSettings?.price_per_person || 0) * adultsCount : 0;
    
    const grandTotal = subtotal + insuranceTotal;
    const pricePerAdult = Math.round(grandTotal / adultsCount);
    const pricePerChild = Math.round(pricePerAdult * 0.7); // 30% discount for children

    return {
      hotelTotal,
      flightPrice,
      transferTotal,
      activitiesTotal,
      insuranceTotal,
      arrivalTransferPrice,
      departureTransferPrice,
      pricePerAdult,
      pricePerChild,
      adultsCount,
      childrenCount,
      totalPax: adultsCount + childrenCount,
      vehicleType: selectedVehicle,
      total: grandTotal
    };
  };

  const pricing = calculatePricing();

  // Handle hotel selection
  const handleHotelSelect = (hotel) => {
    setSelectedHotels(prev => ({
      ...prev,
      [activeHotelCity]: hotel
    }));
    setShowHotelModal(false);
  };

  // Open save proposal modal
  const handleSaveProposal = () => {
    setShowSaveProposalModal(true);
  };

  // Actually save the proposal with form data
  const handleSaveProposalWithData = async (formData) => {
    setIsSaving(true);
    try {
      // Build complete activities data with all details
      const activitiesWithDetails = {};
      Object.entries(selectedActivities).forEach(([key, activities]) => {
        activitiesWithDetails[key] = activities.map(activity => ({
          id: activity.id,
          name: activity.name,
          description: activity.description,
          price: activity.price,
          duration: activity.duration,
          city: activity.city,
          highlights: activity.highlights,
          inclusions: activity.inclusions,
          selectedVehicle: activity.selectedVehicle,
          vehiclePrice: activity.vehiclePrice,
          image: activity.image
        }));
      });

      // Build hotels data with selected rooms (keyed by cityIndex)
      const hotelsWithRooms = {};
      Object.entries(selectedHotels).forEach(([cityIdx, hotel]) => {
        const city = cities[parseInt(cityIdx)];
        const cityLabel = city ? `${city.name}_${cityIdx}` : cityIdx;
        hotelsWithRooms[cityLabel] = {
          id: hotel.id,
          name: hotel.name,
          star_rating: hotel.star_rating,
          location: hotel.location,
          city: hotel.city,
          image: hotel.image || hotel.images?.[0] || '',
          images: hotel.images || [],
          amenities: hotel.amenities,
          selectedRoom: hotel.selectedRoom,
          checkIn: hotel.checkIn,
          checkOut: hotel.checkOut,
          nights: hotel.nights,
          rating_score: hotel.rating_score,
          rating_text: hotel.rating_text,
          review_count: hotel.review_count,
          address: hotel.address
        };
      });

      const proposalData = {
        // Basic trip info
        leaving_from: data.leaving_from,
        leaving_from_code: data.leaving_from_code,
        nationality: data.nationality,
        leaving_on: data.leaving_on,
        star_rating: data.star_rating,
        add_transfers: data.add_transfers,
        room_data: data.room_data,
        cities: data.cities,
        
        // Flight info
        selected_flight: selectedFlight,
        arrival_flight_info: arrivalFlightInfo,
        departure_flight_info: departureFlightInfo,
        
        // Hotels with full details
        selected_hotels: hotelsWithRooms,
        
        // Activities with full details
        selected_activities: activitiesWithDetails,
        
        // Selected extras per activity
        selected_extras: selectedExtras,
        
        // Transfers with vehicle selection
        arrival_transfer: selectedArrivalTransfer ? {
          id: selectedArrivalTransfer.id,
          title: selectedArrivalTransfer.title,
          from_location: selectedArrivalTransfer.from_location,
          to_location: selectedArrivalTransfer.to_location,
          duration: selectedArrivalTransfer.duration,
          selectedVehicle: selectedArrivalTransfer.selectedVehicle,
          vehiclePrice: selectedArrivalTransfer.vehiclePrice,
          price: selectedArrivalTransfer.price
        } : null,
        departure_transfer: selectedDepartureTransfer ? {
          id: selectedDepartureTransfer.id,
          title: selectedDepartureTransfer.title,
          from_location: selectedDepartureTransfer.from_location,
          to_location: selectedDepartureTransfer.to_location,
          duration: selectedDepartureTransfer.duration,
          selectedVehicle: selectedDepartureTransfer.selectedVehicle,
          vehiclePrice: selectedDepartureTransfer.vehiclePrice,
          price: selectedDepartureTransfer.price
        } : null,
        
        // Pricing
        pricing_breakdown: {
          hotels: pricing.hotelTotal,
          activities: pricing.activitiesTotal,
          transfers: pricing.transferTotal,
          subtotal: pricing.subtotal,
          markup: formData.markup_type === 'percentage' 
            ? (pricing.subtotal * formData.markup_value / 100)
            : formData.markup_value,
          discount: formData.discount_amount,
          total: pricing.total
        },
        total_price: pricing.total,
        
        // Vehicle info
        vehicle_type: selectedVehicle.key,
        vehicle_label: selectedVehicle.label,
        total_pax: totalPax,
        
        // Itinerary
        itinerary: itinerary,
        total_nights: totalNights,
        start_date: startDate.toISOString(),

        // Inter-city transfers
        inter_city_transfers: Object.entries(interCityTransfers).reduce((acc, [key, t]) => {
          const [fromIdx, toIdx] = key.split('_');
          acc[key] = {
            id: t.id,
            title: t.title,
            from_city: cities[parseInt(fromIdx)]?.name,
            to_city: cities[parseInt(toIdx)]?.name,
            price: t.selectedPrice || t.price,
            vehicle_type: t.vehicle_type,
            duration: t.duration
          };
          return acc;
        }, {}),

        // Travel Insurance
        travel_insurance: travelInsurance,
        travel_insurance_price: travelInsurance ? (insuranceSettings?.price_per_person || 50) : 0,
        
        // Customer info from modal
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        proposal_name: formData.proposal_name,
        expected_booking_date: formData.expected_booking_date,
        flights_booked: formData.flights_booked,
        markup_value: formData.markup_value,
        markup_type: formData.markup_type,
        discount_amount: formData.discount_amount,
        status: 'pending'
      };

      const response = formData._isEditing && formData._editProposalId
        ? await api.put(`/proposals/${formData._editProposalId}`, proposalData)
        : await api.post('/proposals', proposalData);
      
      // Create full proposal object for the view page
      const savedProposal = {
        id: formData._isEditing ? formData._editProposalId : response.data.id,
        ...proposalData,
        created_at: data.created_at || new Date().toISOString()
      };

      setShowSaveProposalModal(false);
      onConfirm(savedProposal);  // Pass the saved proposal data
    } catch (error) {
      console.error('Error saving proposal:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle payment
  const handlePayment = async () => {
    setIsPaymentLoading(true);
    try {
      const proposalRes = await api.post('/proposals', {
        leaving_from: data.leaving_from,
        nationality: data.nationality,
        leaving_on: data.leaving_on,
        star_rating: data.star_rating,
        add_transfers: data.add_transfers,
        room_data: data.room_data,
        cities: data.cities,
        selected_flight: selectedFlight,
        selected_hotels: selectedHotels,
        total_price: pricing.total
      });

      const origin = window.location.origin;
      const paymentRes = await api.post(`/payments/stripe/checkout?proposal_id=${proposalRes.data.id}&origin_url=${origin}`);
      
      if (paymentRes.data.url) {
        window.location.href = paymentRes.data.url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment initiation failed. Please try again.');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#F0F2F5]" data-testid="trip-builder">
      {/* Flight Search Modal */}
      <FlightSearchModal 
        isOpen={showFlightSearch} 
        onClose={() => setShowFlightSearch(false)} 
        initialFrom={data.leaving_from}
        initialTo={cities[0]?.name}
        onSelect={(flight) => setSelectedFlight(flight)}
      />

      {/* Hotel Selection Modal */}
      <HotelSelectionModal
        isOpen={showHotelModal}
        onClose={() => {
          setShowHotelModal(false);
          setChangeRoomHotel(null); // Clear change room hotel on close
        }}
        city={cities[activeHotelCity]?.name || ''}
        checkIn={formatDate(startDate)}
        checkOut={formatDate(new Date(startDate.getTime() + totalNights * 24 * 60 * 60 * 1000))}
        nights={cities[activeHotelCity]?.nights || 1}
        onSelect={handleHotelSelect}
        searchQuery={hotelSearchQuery}
        initialHotel={changeRoomHotel}
        totalGuests={totalPax}
      />

      {/* Hotel Options Modal (Change Hotel choices) */}
      <HotelOptionsModal
        isOpen={showHotelOptions}
        onClose={() => setShowHotelOptions(false)}
        city={cities[activeHotelCity]?.name || ''}
        onViewAll={handleViewAllHotels}
        onNoStay={handleNoStay}
        onSearch={handleSearchHotel}
      />

      {/* Transfer Selection Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowTransferModal(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <h3 className="text-base font-bold text-gray-900">
                  Add {transferModalType === 'arrival' ? 'Arrival' : transferModalType === 'departure' ? 'Departure' : 'Transfer'} in {transferCity}
                  {data?.leaving_on && (
                    <span className="text-gray-500 font-normal text-sm ml-2">
                      (Day 1: {new Date(data.leaving_on).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })})
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search transfers..." value={transferSearch}
                      onChange={e => setTransferSearch(e.target.value)}
                      className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:border-[#002B5B]"
                      data-testid="transfer-modal-search" />
                  </div>
                  <button onClick={() => setShowTransferModal(false)} className="w-8 h-8 hover:bg-gray-100 text-gray-500 rounded-full flex items-center justify-center"><X size={18} /></button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Categories */}
                <div className="w-44 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0 hidden md:block">
                  <div className="py-2">
                    {['All Options', ...new Set(availableTransfers.filter(t => !t.transfer_direction || t.transfer_direction === transferModalType).map(t => t.transfer_type || 'Private'))].map(cat => (
                      <button key={cat} onClick={() => setTransferCategoryFilter(cat)}
                        className={cn("w-full text-left px-4 py-3 text-sm transition-colors",
                          transferCategoryFilter === cat ? "bg-white text-[#002B5B] font-bold border-r-2 border-[#002B5B]" : "text-gray-600 hover:bg-white"
                        )} data-testid={`transfer-cat-${cat.toLowerCase().replace(/\s+/g, '-')}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Time Filters */}
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-white">
                    {['All', 'Morning', 'Afternoon', 'Evening'].map(tf => (
                      <button key={tf} onClick={() => setTransferTimeFilter(tf)}
                        className={cn("px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                          transferTimeFilter === tf ? "bg-[#002B5B] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )} data-testid={`transfer-time-${tf.toLowerCase()}`}>{tf}</button>
                    ))}
                  </div>

                  {/* Card List */}
                  <div className="flex-1 overflow-y-auto p-5">
                    {(() => {
                      let filtered = availableTransfers.filter(t => {
                        if (t.transfer_direction && t.transfer_direction !== transferModalType) return false;
                        if (transferCategoryFilter !== 'All Options' && (t.transfer_type || 'Private') !== transferCategoryFilter) return false;
                        if (transferSearch) {
                          const q = transferSearch.toLowerCase();
                          if (!(t.title || '').toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
                        }
                        if (transferTimeFilter !== 'All' && t.pickup_times?.length > 0) {
                          const hasMatchingTime = t.pickup_times.some(time => {
                            const hour = parseInt(time.split(':')[0], 10);
                            if (transferTimeFilter === 'Morning') return hour >= 5 && hour < 12;
                            if (transferTimeFilter === 'Afternoon') return hour >= 12 && hour < 17;
                            if (transferTimeFilter === 'Evening') return hour >= 17 || hour < 5;
                            return true;
                          });
                          if (!hasMatchingTime) return false;
                        }
                        return true;
                      });

                      if (filtered.length === 0) return (
                        <div className="text-center py-12">
                          <Car size={40} className="mx-auto text-gray-300 mb-3" />
                          <p className="text-gray-500 font-medium">No transfers found</p>
                          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                        </div>
                      );

                      return (
                        <div className="space-y-4">
                          {filtered.map(transfer => {
                            const isSelected = (transferModalType === 'arrival' && selectedArrivalTransfer?.id === transfer.id) ||
                              (transferModalType === 'departure' && selectedDepartureTransfer?.id === transfer.id);
                            return (
                              <div key={transfer.id} className={cn("border rounded-xl p-5 transition-all",
                                isSelected ? "border-green-500 bg-green-50/50" : "border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white"
                              )} data-testid={`transfer-option-${transfer.id}`}>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-sm mb-1.5">{transfer.title}</h4>
                                    {(transfer.pickup_times?.length > 0 || transfer.duration) && (
                                      <p className="text-xs text-gray-500 mb-2">
                                        {transfer.pickup_times?.length > 0 && <><span className="font-medium text-gray-600">Starts:</span> {transfer.pickup_times.join(', ')}</>}
                                        {transfer.duration && <>{transfer.pickup_times?.length > 0 && <span className="mx-2">|</span>}<span className="font-medium text-gray-600">Duration:</span> {transfer.duration}</>}
                                      </p>
                                    )}
                                    {transfer.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">{transfer.description}</p>}
                                    <div className="flex items-center flex-wrap gap-2">
                                      <span className="text-xs text-gray-600 flex items-center gap-1">
                                        <Check size={12} className="text-green-500" /> {transfer.from_location || transfer.title?.split(' - ')[0]} — {transfer.transfer_type || 'Private'}
                                      </span>
                                      <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                                        transfer.transfer_type === 'Luxury' ? 'bg-amber-100 text-amber-700' :
                                        transfer.transfer_type === 'Shared' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                                      )}>{transfer.transfer_type || 'Private'} Transfers</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <p className="text-base font-bold text-[#002B5B]">+ AED {Number(transfer.price || 0).toLocaleString()}</p>
                                    <button onClick={() => handleSelectTransfer(transfer)}
                                      className={cn("px-5 py-2 rounded-lg text-xs font-bold transition-colors",
                                        isSelected ? "bg-green-500 text-white" : "bg-[#002B5B] hover:bg-[#003d82] text-white"
                                      )} data-testid={`select-transfer-${transfer.id}`}>
                                      {isSelected ? 'Selected' : 'Select'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {availableTransfers.filter(t => !t.transfer_direction || t.transfer_direction === transferModalType).length} transfers available
                </div>
                <button onClick={() => setShowTransferModal(false)} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Vehicle Selection Modal for Transfers */}
      <AnimatePresence>
        {showTransferVehicleModal && pendingTransfer && (
          <VehicleSelectionModal
            isOpen={showTransferVehicleModal}
            onClose={() => {
              setShowTransferVehicleModal(false);
              setPendingTransfer(null);
            }}
            activity={pendingTransfer}
            onSelectVehicle={handleTransferVehicleSelect}
            totalPax={totalPax}
            currentVehicle={transferVehicles[pendingTransfer?.id]}
          />
        )}
      </AnimatePresence>

      {/* Progress Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  <Check size={16} />
                </div>
                <span className="font-bold text-gray-400">Trip Details</span>
              </div>
              <ChevronRight className="text-gray-300" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#002B5B] rounded-lg flex items-center justify-center text-white font-bold text-sm">2</div>
                <span className="font-bold text-[#002B5B]">Customize Your Trip</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Price</p>
              <p className="text-2xl font-bold text-[#002B5B]" data-testid="total-price">
                AED {pricing.total.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatShortDate(startDate)} - {formatShortDate(returnDate)}
            </span>
            <span>•</span>
            <span>{totalNights} night{totalNights > 1 ? 's' : ''} / {totalDays} days</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users size={14} />
              {data.travelersSummary || data.travelers}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Column - Itinerary */}
          <div className="flex-1">
            {/* Flights Section */}
            <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Plane size={24} />
                  <h2 className="text-lg font-bold">Flights</h2>
                </div>
                {selectedFlight && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Selected</span>
                )}
              </div>
              <div className="p-6">
                {selectedFlight ? (
                  <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center font-bold text-[#002B5B] border">
                        {selectedFlight.airline?.[0] || 'F'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{selectedFlight.airline}</p>
                        <p className="text-sm text-gray-500">
                          {data.leaving_from} → {cities[0]?.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {selectedFlight.departure_time} - {selectedFlight.arrival_time} • {selectedFlight.duration}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#002B5B] text-lg">AED {selectedFlight.price}</p>
                      <div className="flex items-center gap-3 justify-end mt-1">
                        <button 
                          onClick={() => setShowFlightSearch(true)}
                          className="text-sm text-[#002B5B] font-medium hover:underline"
                        >
                          Change Flight
                        </button>
                        <button 
                          onClick={() => { setSelectedFlight(null); setArrivalFlightInfo(null); setDepartureFlightInfo(null); }}
                          className="text-sm text-red-500 font-medium hover:underline"
                          data-testid="remove-flight-button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 font-medium">No flights included</p>
                      <p className="text-sm text-gray-400">{data.leaving_from} → {cities[0]?.name}</p>
                    </div>
                    <button 
                      onClick={() => setShowFlightSearch(true)}
                      className="bg-[#002B5B] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#003d82] transition-all flex items-center gap-2"
                      data-testid="add-flight-button"
                    >
                      <Plane size={18} />
                      Add Flights
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Day-by-Day Itinerary */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Your Itinerary</h2>
              <button
                onClick={handleGenerateAiItinerary}
                disabled={aiGenerating}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                data-testid="ai-generate-itinerary-btn"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Compass size={16} />
                    AI Generate Itinerary
                  </>
                )}
              </button>
            </div>
            
            {/* Hotel Stay Sections for each city */}
            {cities.map((city, cityIndex) => {
              const cityHotel = selectedHotels[cityIndex];
              const cityStartDate = new Date(startDate);
              // Calculate check-in date based on previous cities
              for (let i = 0; i < cityIndex; i++) {
                cityStartDate.setDate(cityStartDate.getDate() + (cities[i].nights || 1));
              }
              const cityEndDate = new Date(cityStartDate);
              cityEndDate.setDate(cityEndDate.getDate() + (city.nights || 1));
              
              return (
                <div key={cityIndex} className="mb-6">
                  {/* Stay Header */}
                  <div className="bg-[#E8F4F8] px-6 py-3 rounded-t-xl">
                    <h3 className="text-lg font-bold text-[#002B5B]">
                      Stay in {city.name} {city.nights} night{city.nights > 1 ? 's' : ''}
                    </h3>
                  </div>
                  
                  {/* Hotel Card */}
                  {cityHotel ? (
                    <div className="bg-white rounded-b-xl border border-gray-200 border-t-0">
                      <div className="p-6">
                        <div className="flex gap-6">
                          {/* Hotel Image */}
                          <img 
                            src={cityHotel.images?.[0] || 'https://via.placeholder.com/160x120?text=Hotel'} 
                            alt={cityHotel.name}
                            className="w-40 h-32 object-cover rounded-lg flex-shrink-0"
                          />
                          
                          {/* Hotel Details */}
                          <div className="flex-1">
                            {/* Stars */}
                            <div className="flex items-center gap-1 mb-1">
                              {Array.from({ length: cityHotel.star_rating || 4 }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>
                            
                            {/* Hotel Name */}
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-bold text-[#002B5B]">{cityHotel.name}</h4>
                              <button className="text-xs text-gray-500 border border-gray-300 px-2 py-0.5 rounded hover:bg-gray-50">
                                view
                              </button>
                            </div>
                            
                            {/* Address */}
                            <p className="text-sm text-blue-600 mt-1">{cityHotel.address || `${cityHotel.city}, ${cityHotel.country}`}</p>
                            
                            {/* Rating */}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="bg-[#002B5B] text-white px-2 py-1 rounded font-bold text-sm">
                                {cityHotel.rating_score || 8.2}
                              </div>
                              <div>
                                <span className="font-bold text-gray-800">{cityHotel.rating_text || 'Very Good'}</span>
                                <span className="text-sm text-gray-500 ml-1">{cityHotel.review_count || 45} ratings</span>
                              </div>
                            </div>
                            
                            {/* Check-in / Check-out */}
                            <div className="flex items-center gap-8 mt-4 text-sm">
                              <div>
                                <p className="text-gray-500">Check-in</p>
                                <p className="font-bold text-gray-800">03:00 PM {formatDate(cityStartDate)}</p>
                              </div>
                              <div className="h-8 w-px bg-gray-200" />
                              <div>
                                <p className="text-gray-500">Check-out</p>
                                <p className="font-bold text-gray-800">12:00 PM {formatDate(cityEndDate)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Selected Room Info */}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-gray-700">Selected Room: <strong>1 x {cityHotel.selectedRoom?.name || 'Standard Room'}, {cityHotel.selectedRoom?.bed_type || 'Twin Beds'}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-gray-700">
                              {cityHotel.selectedRoom?.rate_plan?.meal_plan || cityHotel.selectedRoom?.meals || 'Bed and Breakfast'}, No Extra Bed
                            </span>
                          </div>
                          {cityHotel.selectedRoom?.rate_plan?.refund_policy === 'Refundable' ? (
                            <p className="text-orange-500 font-medium text-sm ml-7">
                              {cityHotel.selectedRoom?.rate_plan?.refund_deadline || 'Fully refundable before check-in'}
                            </p>
                          ) : (
                            <p className="text-red-500 font-medium text-sm ml-7">Non-refundable</p>
                          )}
                        </div>
                        
                        {/* Selected Meals */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <h5 className="font-bold text-gray-800 mb-2">Selected Meals at Hotel</h5>
                          {cityHotel.selectedRoom?.rate_plan?.meal_plan && cityHotel.selectedRoom?.rate_plan?.meal_plan !== 'Room Only' ? (
                            <>
                              <div className="flex items-center gap-2 text-sm">
                                <Check className="w-5 h-5 text-green-500" />
                                <span className="text-gray-700">{cityHotel.selectedRoom.rate_plan.meal_plan}</span>
                              </div>
                              {cityHotel.selectedRoom.rate_plan.meal_details && (
                                <p className="text-gray-500 text-xs ml-7">{cityHotel.selectedRoom.rate_plan.meal_details}</p>
                              )}
                              <p className="text-green-600 font-medium text-sm ml-7">Included</p>
                            </>
                          ) : (
                            <p className="text-gray-500 text-sm">No meals included (Room Only)</p>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-6">
                          <button 
                            onClick={() => handleChangeRoom(cityIndex)}
                            className="bg-[#8B4513] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#723a0f] transition-all"
                            data-testid={`change-room-${cityIndex}`}
                          >
                            Change Room
                          </button>
                          <button 
                            onClick={() => handleChangeHotel(cityIndex)}
                            className="bg-[#8B4513] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#723a0f] transition-all"
                            data-testid={`change-hotel-${cityIndex}`}
                          >
                            Change Hotel
                          </button>
                        </div>
                      </div>
                      
                      {/* What to know section */}
                      <button className="w-full px-6 py-3 text-left text-sm text-gray-600 border-t border-gray-100 hover:bg-gray-50 flex items-center gap-2">
                        <Info size={16} />
                        What to know about this hotel
                      </button>
                      
                      {/* Info notice */}
                      <div className="bg-amber-50 px-6 py-4 border-t border-amber-100 rounded-b-xl">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-800">
                            Room in {cityHotel.name} is probably a twin bed room, which means 2 single beds will be provided. Are you sure about this room?
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Hotel className="text-gray-400" size={24} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-500">{noStayCities[cityIndex] ? 'No stay required' : 'No Hotel Selected'}</p>
                            <p className="text-sm text-gray-400">Check-in: {formatDate(cityStartDate)} • Check-out: {formatDate(cityEndDate)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleChangeHotel(cityIndex)}
                          className="bg-[#002B5B] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#003d82] transition-all flex items-center gap-2"
                          data-testid={`add-hotel-${cityIndex}`}
                        >
                          <Hotel size={18} />
                          {noStayCities[cityIndex] ? 'Change' : 'Add Hotel'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Day-by-Day Details */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 mt-8">Daily Itinerary</h2>
            {itinerary.map((day, index) => (
              <DayCard
                key={index}
                {...day}
                activities={getActivitiesForDay(day.city, day.day)}
                onAddActivity={() => handleAddActivity(day.city, day.day)}
                onRemoveActivity={(activityId) => handleRemoveActivity(day.city, day.day, activityId)}
                onChangeHotel={() => {
                  setActiveHotelCity(day.cityIndex);
                  setShowHotelModal(true);
                }}
                onSelectArrivalTransfer={(city) => openTransferModal('arrival', city)}
                onSelectDepartureTransfer={(city) => openTransferModal('departure', city)}
                selectedArrivalTransfer={selectedArrivalTransfer}
                selectedDepartureTransfer={selectedDepartureTransfer}
                onUpdateFlightInfo={handleOpenFlightInfoModal}
                arrivalFlightInfo={arrivalFlightInfo}
                departureFlightInfo={departureFlightInfo}
                onChangeInterCityTransfer={(type) => {
                  if (type === 'incoming' && day.isCheckInDay) {
                    handleOpenInterCityTransfer(day.incomingFromCityIdx, day.cityIndex, day.incomingFromCity, day.city);
                  } else if (type === 'outgoing' && day.isCheckOutDay) {
                    handleOpenInterCityTransfer(day.cityIndex, day.outgoingToCityIdx, day.city, day.outgoingToCity);
                  }
                }}
                onRemoveInterCityTransfer={(type) => {
                  if (type === 'incoming' && day.isCheckInDay) {
                    handleRemoveInterCityTransfer(day.incomingFromCityIdx, day.cityIndex);
                  } else if (type === 'outgoing' && day.isCheckOutDay) {
                    handleRemoveInterCityTransfer(day.cityIndex, day.outgoingToCityIdx);
                  }
                }}
                selectedExtras={selectedExtras}
                onToggleExtra={handleToggleExtra}
              />
            ))}
          </div>

          {/* Right Column - Trip Summary */}
          <div className="w-96 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 sticky top-32 max-h-[calc(100vh-10rem)] flex flex-col">
              <div className="bg-[#002B5B] text-white px-6 py-4 rounded-t-xl flex-shrink-0">
                <h3 className="text-lg font-bold">Trip Summary</h3>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Destinations */}
                <div>
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-[#002B5B]" />
                    Destinations
                  </h4>
                  <div className="space-y-2">
                    {cities.map((city, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{city.name}</span>
                        <span className="font-medium">{city.nights} night{city.nights > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Flight */}
                {selectedFlight && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Plane size={16} className="text-[#002B5B]" />
                      Flight
                    </h4>
                    <p className="text-sm text-gray-600">{selectedFlight.airline}</p>
                    <p className="text-sm font-medium">AED {selectedFlight.price}</p>
                  </div>
                )}

                {/* Selected Hotels */}
                {Object.entries(selectedHotels).length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Hotel size={16} className="text-[#002B5B]" />
                      Hotels
                    </h4>
                    {Object.entries(selectedHotels).map(([cityIdx, hotel]) => {
                      const city = cities[parseInt(cityIdx)];
                      const cityName = city?.name || `City ${parseInt(cityIdx) + 1}`;
                      return (
                      <div key={cityIdx} className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-800">{cityName}</p>
                        <p className="text-sm text-gray-600">{hotel.name}</p>
                        <p className="text-xs text-gray-500">{hotel.selectedRoom?.name}</p>
                        {hotel.selectedRoom?.rate_plan && (
                          <div className="mt-1 text-xs">
                            <span className="text-purple-600">{hotel.selectedRoom.rate_plan.meal_plan}</span>
                            {hotel.selectedRoom.rate_plan.supplier_name && (
                              <span className="text-gray-400 ml-2">({hotel.selectedRoom.rate_plan.supplier_name})</span>
                            )}
                          </div>
                        )}
                        <p className="text-sm font-bold text-[#002B5B] mt-1">
                          AED {(hotel.selectedRoom?.price || 0).toLocaleString()} x {hotel.nights || 1} night{(hotel.nights || 1) > 1 ? 's' : ''}
                        </p>
                      </div>
                      );
                    })}
                  </div>
                )}

                {/* Selected Transfers */}
                {(selectedArrivalTransfer || selectedDepartureTransfer) && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Car size={16} className="text-blue-600" />
                      Transfers
                    </h4>
                    <div className="space-y-2">
                      {selectedArrivalTransfer && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Arrival Transfer</span>
                            <span className="text-sm font-bold text-blue-600">
                              AED {getTransferPriceForVehicle(selectedArrivalTransfer)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{selectedArrivalTransfer.title}</p>
                          {getTransferVehicleLabel(selectedArrivalTransfer) && (
                            <div className="text-xs text-blue-600 mt-0.5">
                              {getTransferVehicleLabel(selectedArrivalTransfer)}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedDepartureTransfer && (
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Departure Transfer</span>
                            <span className="text-sm font-bold text-orange-600">
                              AED {getTransferPriceForVehicle(selectedDepartureTransfer)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{selectedDepartureTransfer.title}</p>
                          {getTransferVehicleLabel(selectedDepartureTransfer) && (
                            <div className="text-xs text-orange-600 mt-0.5">
                              {getTransferVehicleLabel(selectedDepartureTransfer)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Inter-City Transfers */}
                {Object.keys(interCityTransfers).length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <ArrowRight size={16} className="text-indigo-600" />
                      Inter-City Transfers
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(interCityTransfers).map(([key, transfer]) => {
                        const [fromIdx, toIdx] = key.split('_');
                        const fromCity = cities[parseInt(fromIdx)]?.name || '';
                        const toCity = cities[parseInt(toIdx)]?.name || '';
                        return (
                          <div key={key} className="p-3 bg-indigo-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">{fromCity} → {toCity}</span>
                              <span className="text-sm font-bold text-indigo-600">
                                AED {(transfer.selectedPrice || transfer.price || 0).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{transfer.title}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Activities */}
                {Object.entries(selectedActivities).some(([_, acts]) => acts.length > 0) && (
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Compass size={16} className="text-pink-600" />
                      Activities
                    </h4>
                    {Object.entries(selectedActivities).map(([key, activities]) => {
                      if (activities.length === 0) return null;
                      const [city, day] = key.split('_');
                      return (
                        <div key={key} className="mb-3 p-3 bg-pink-50 rounded-lg">
                          <p className="text-xs font-medium text-pink-600 mb-1">Day {day} - {city}</p>
                          {activities.map(activity => {
                            const vehicleLabel = getActivityVehicleLabel(activity);
                            const activityPrice = getActivityPriceForVehicle(activity);
                            return (
                              <div key={activity.id} className="py-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600 line-clamp-1 flex-1">{activity.name}</span>
                                  <span className="text-sm font-bold text-pink-600 ml-2">AED {activityPrice}</span>
                                </div>
                                {vehicleLabel && (
                                  <div className="text-xs text-blue-600 mt-0.5">
                                    {vehicleLabel}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pricing Breakdown */}
                <div className="border-t pt-4">
                  <h4 className="font-bold text-gray-800 mb-3">Price Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    {pricing.hotelTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hotels</span>
                        <span className="font-medium">AED {pricing.hotelTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {pricing.flightPrice > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Flights</span>
                        <span className="font-medium">AED {pricing.flightPrice.toLocaleString()}</span>
                      </div>
                    )}
                    {pricing.transferTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transfers</span>
                        <span className="font-medium">AED {pricing.transferTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {pricing.activitiesTotal > 0 && (
                      <div className="flex justify-between text-pink-600">
                        <span>Activities</span>
                        <span className="font-medium">AED {pricing.activitiesTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {pricing.insuranceTotal > 0 && (
                      <div className="flex justify-between text-indigo-600">
                        <span>Insurance ({pricing.adultsCount} pax)</span>
                        <span className="font-medium">AED {pricing.insuranceTotal.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {/* Vehicle Type Based on Passengers */}
                    <div className="pt-2 border-t border-dashed mt-2">
                      <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{pricing.vehicleType?.icon}</span>
                          <span className="text-sm font-medium text-blue-800">{pricing.vehicleType?.label}</span>
                        </div>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          {pricing.totalPax} pax
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-dashed">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price per adult ({pricing.adultsCount})</span>
                        <span className="font-medium">AED {pricing.pricePerAdult.toLocaleString()}</span>
                      </div>
                      {pricing.childrenCount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price per child ({pricing.childrenCount})</span>
                          <span className="font-medium">AED {pricing.pricePerChild.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>- AED 0</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t text-lg font-bold">
                      <span>Total</span>
                      <span className="text-[#002B5B]">AED {pricing.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button 
                    onClick={handleSaveProposal}
                    disabled={isSaving}
                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="save-proposal-button"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Save As Proposal
                  </button>
                </div>

                {/* Version History - only when editing */}
                {data?.isEditing && data?.editProposalId && (
                  <VersionHistoryPanel
                    proposalId={data.editProposalId}
                    onRestoreAsNew={(newId, newProposal) => {
                      // Navigate to the restored proposal
                      if (newProposal) {
                        onConfirm({
                          id: newId,
                          ...newProposal,
                        });
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Travel Insurance Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6" data-testid="trip-builder-insurance">
          <div className="px-6 py-4 flex items-center gap-3 border-b border-gray-100">
            <Shield size={20} className="text-[#002B5B]" />
            <h2 className="text-lg font-bold text-[#002B5B]">Travel Insurance</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-700">{insuranceSettings?.description || 'Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs'}</p>
                <p className="text-base font-semibold text-[#002B5B] mt-2">
                  {insuranceSettings?.currency || 'AED'} {insuranceSettings?.price_per_person || 50} <span className="text-xs font-normal text-gray-500">per person</span>
                </p>
                {travelInsurance ? (
                  <p className="text-sm text-teal-600 font-medium mt-1">Added to proposal</p>
                ) : (
                  <p className="text-sm text-red-500 mt-1">Not Included</p>
                )}
              </div>
              {travelInsurance ? (
                <button 
                  onClick={() => setTravelInsurance(false)}
                  className="px-4 py-2 bg-red-50 border border-red-300 text-red-600 text-sm font-medium rounded hover:bg-red-100 transition-colors flex-shrink-0 flex items-center gap-1"
                  data-testid="remove-insurance-btn"
                >
                  <X size={14} /> REMOVE
                </button>
              ) : (
                <button 
                  onClick={() => setTravelInsurance(true)}
                  className="px-4 py-2 border border-[#002B5B] text-[#002B5B] text-sm font-medium rounded hover:bg-[#002B5B]/5 transition-colors flex-shrink-0"
                  data-testid="add-insurance-btn"
                >
                  + ADD
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <button 
            onClick={onBack}
            className="text-gray-500 font-medium hover:text-[#002B5B] transition-colors flex items-center gap-2"
            data-testid="back-button"
          >
            ← Back to Trip Details
          </button>
        </div>
      </div>

      {/* Activities Modal */}
      <AnimatePresence>
        {showActivitiesModal && (
          <ActivitiesModal
            isOpen={showActivitiesModal}
            onClose={() => setShowActivitiesModal(false)}
            city={activeActivityCity}
            selectedActivities={getActivitiesForDay(activeActivityCity, activeActivityDay)}
            onSelectActivity={handleSelectActivity}
          />
        )}
      </AnimatePresence>

      {/* Vehicle Selection Modal */}
      <AnimatePresence>
        {showVehicleModal && pendingActivity && (
          <VehicleSelectionModal
            isOpen={showVehicleModal}
            onClose={() => {
              setShowVehicleModal(false);
              setPendingActivity(null);
            }}
            activity={pendingActivity}
            onSelectVehicle={handleVehicleSelect}
            totalPax={totalPax}
            currentVehicle={activityVehicles[pendingActivity?.id]}
          />
        )}
      </AnimatePresence>

      {/* Update Flight Info Modal */}
      <AnimatePresence>
        {showFlightInfoModal && (
          <UpdateFlightInfoModal
            isOpen={showFlightInfoModal}
            onClose={() => setShowFlightInfoModal(false)}
            type={flightInfoType}
            city={cities[0]?.name || 'Destination'}
            date={formatDate(startDate)}
            onUpdate={handleUpdateFlightInfo}
          />
        )}
      </AnimatePresence>

      {/* Save Proposal Modal */}
      <AnimatePresence>
        {showSaveProposalModal && (
          <SaveProposalModal
            isOpen={showSaveProposalModal}
            onClose={() => setShowSaveProposalModal(false)}
            onSave={handleSaveProposalWithData}
            tripData={data}
            pricing={pricing}
            selectedHotels={selectedHotels}
            cities={cities}
          />
        )}
      </AnimatePresence>

      {/* AI Itinerary Modal */}
      <AnimatePresence>
        {showAiItinerary && aiItinerary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAiItinerary(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
              data-testid="ai-itinerary-modal"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Compass size={22} />
                  <h2 className="text-lg font-bold">AI-Generated Itinerary</h2>
                </div>
                <button onClick={() => setShowAiItinerary(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {aiItinerary.raw ? (
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">{aiItinerary.raw}</div>
                ) : aiItinerary.days ? (
                  <>
                    {aiItinerary.days.map((day, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl overflow-hidden" data-testid={`ai-day-${day.day}`}>
                        <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{day.day}</span>
                            <div>
                              <span className="font-bold text-gray-800">{day.title || `Day ${day.day}`}</span>
                              <span className="text-sm text-gray-500 ml-2">- {day.city}</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-5 space-y-3">
                          {/* Activities */}
                          {day.activities?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Camera size={13} /> Activities
                              </h4>
                              <div className="space-y-2">
                                {day.activities.map((act, j) => (
                                  <div key={j} className="flex items-start gap-3 p-2.5 bg-indigo-50/50 rounded-lg">
                                    <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded whitespace-nowrap mt-0.5">{act.time}</span>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-800">{act.name}</p>
                                        {act.activity_id && (
                                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">DB Match</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500">{act.description}</p>
                                      {act.duration && <span className="text-[10px] text-gray-400">{act.duration}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Meals */}
                          {day.meals?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Utensils size={13} /> Meals
                              </h4>
                              <div className="grid grid-cols-3 gap-2">
                                {day.meals.map((meal, j) => (
                                  <div key={j} className="p-2 bg-amber-50/50 rounded-lg">
                                    <span className="text-[10px] font-bold text-amber-700 uppercase">{meal.type}</span>
                                    <p className="text-xs text-gray-600 mt-0.5">{meal.suggestion}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Transfers */}
                          {day.transfers?.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Car size={13} /> Transfers
                              </h4>
                              {day.transfers.map((t, j) => (
                                <div key={j} className="p-2 bg-blue-50/50 rounded-lg text-xs text-gray-600">
                                  <span className="font-medium text-blue-700">{t.type}:</span> {t.description}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Tips */}
                          {day.tips && (
                            <div className="flex items-start gap-2 p-2 bg-green-50/50 rounded-lg">
                              <Info size={13} className="text-green-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-green-700">{day.tips}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* General Tips */}
                    {aiItinerary.general_tips?.length > 0 && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <h4 className="text-sm font-bold text-gray-700 mb-2">Travel Tips</h4>
                        <ul className="space-y-1">
                          {aiItinerary.general_tips.map((tip, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                              <Check size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8">No itinerary data available.</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-2xl">
                <p className="text-xs text-gray-400">AI-generated suggestions. Modify as needed in your trip builder.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAiItinerary(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleGenerateAiItinerary();
                      setShowAiItinerary(false);
                    }}
                    className="px-4 py-2 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all font-medium flex items-center gap-2"
                    data-testid="ai-regenerate-btn"
                  >
                    <Compass size={14} /> Regenerate
                  </button>
                  {aiItinerary?.days && (
                    <button
                      onClick={handleApplyAiItinerary}
                      className="px-5 py-2 text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all font-medium flex items-center gap-2 shadow-md"
                      data-testid="ai-apply-to-trip-btn"
                    >
                      <Check size={14} /> Apply to Trip
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inter-City Transfer Modal */}
      <AnimatePresence>
        {interCityTransferModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setInterCityTransferModal({ open: false, fromCityIdx: null, toCityIdx: null, fromCity: '', toCity: '' })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              data-testid="inter-city-transfer-modal"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Car size={20} />
                    <div>
                      <h2 className="text-lg font-bold">Add Transfer to {interCityTransferModal.toCity}</h2>
                      <p className="text-sm text-blue-200">{interCityTransferModal.fromCity} → {interCityTransferModal.toCity}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInterCityTransferModal({ open: false, fromCityIdx: null, toCityIdx: null, fromCity: '', toCity: '' })}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Transfer Options List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {interCityLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-500">Searching transfers...</span>
                  </div>
                ) : interCityTransferOptions.length > 0 ? (
                  interCityTransferOptions.map((transfer) => {
                    const price = (transfer.vehicle_pricing && transfer.vehicle_pricing[selectedVehicle.key])
                      ? transfer.vehicle_pricing[selectedVehicle.key].selling_price
                      : transfer.price || 0;
                    const isSelected = interCityTransfers[`${interCityTransferModal.fromCityIdx}_${interCityTransferModal.toCityIdx}`]?.id === transfer.id;
                    return (
                      <div
                        key={transfer.id}
                        className={`border rounded-xl overflow-hidden transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                        data-testid={`inter-transfer-option-${transfer.id}`}
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-800">{transfer.title}</h3>
                                {transfer.transfer_type && (
                                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{transfer.transfer_type}</span>
                                )}
                              </div>
                              {transfer.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{transfer.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-3">
                                {transfer.duration && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock size={12} />
                                    <span>{transfer.duration}</span>
                                  </div>
                                )}
                                {transfer.vehicle_type && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{transfer.vehicle_type}</span>
                                )}
                                {transfer.max_bags && (
                                  <span className="text-xs text-gray-500">{transfer.max_bags} bags</span>
                                )}
                              </div>

                              {/* Vehicle pricing - hint */}
                              {transfer.vehicle_pricing && Object.keys(transfer.vehicle_pricing).length > 0 && (
                                <p className="mt-2 text-xs text-blue-600 font-medium">Vehicle selection available on next step</p>
                              )}
                            </div>

                            <div className="flex flex-col items-end ml-4">
                              <span className="text-2xl font-bold text-green-600">AED {price.toLocaleString()}</span>
                              <span className="text-xs text-gray-400">per vehicle</span>
                              <button
                                onClick={() => handleSelectInterCityTransfer(transfer)}
                                className={`mt-3 px-5 py-2 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                data-testid={`select-inter-transfer-${transfer.id}`}
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Car size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No transfers found</p>
                    <p className="text-sm text-gray-400 mt-1">No transfers available from {interCityTransferModal.fromCity} to {interCityTransferModal.toCity}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-2xl">
                <p className="text-xs text-gray-400">{interCityTransferOptions.length} transfer{interCityTransferOptions.length !== 1 ? 's' : ''} available</p>
                <button
                  onClick={() => setInterCityTransferModal({ open: false, fromCityIdx: null, toCityIdx: null, fromCity: '', toCity: '' })}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inter-City Transfer Vehicle Selection Modal */}
      <AnimatePresence>
        {showInterCityVehicleModal && pendingInterCityTransfer && (
          <VehicleSelectionModal
            isOpen={showInterCityVehicleModal}
            onClose={() => {
              setShowInterCityVehicleModal(false);
              setPendingInterCityTransfer(null);
            }}
            activity={pendingInterCityTransfer}
            onSelectVehicle={handleInterCityVehicleSelect}
            totalPax={totalPax}
            currentVehicle={null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

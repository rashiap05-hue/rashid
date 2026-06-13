import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Hotel, MapPin, Calendar, Users, ChevronDown, ChevronRight, 
  Plus, X, Check, Star, Clock, Coffee, Wifi, Car, Edit2, Loader2,
  CreditCard, Save, ArrowRight, Sun, Moon, Utensils, Camera, Info, AlertCircle,
  List, Ban, Search, DollarSign, Globe, Compass, Trash2, Phone, Mail, User, Filter,
  Shield, Building2
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
import StayDetailsModal from './TripBuilder/StayDetailsModal';
import TransferModal from './TripBuilder/TransferModal';
import TripSummary from './TripBuilder/TripSummary';
import AddOnsSection from './TripBuilder/AddOnsSection';
import AiItineraryModal from './TripBuilder/AiItineraryModal';
import InterCityTransferModal from './TripBuilder/InterCityTransferModal';

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
  const [insurancePersons, setInsurancePersons] = useState(1);

  // Visa state
  const [visaIncluded, setVisaIncluded] = useState(false);
  const [visaSettings, setVisaSettings] = useState(null);
  const [visaPersons, setVisaPersons] = useState(1);

  // SIM Card state
  const [simCardIncluded, setSimCardIncluded] = useState(false);
  const [simCardSettings, setSimCardSettings] = useState(null);
  const [simCardPersons, setSimCardPersons] = useState(1);

  // Shared quantity popup state
  const [quantityPopup, setQuantityPopup] = useState({ open: false, type: '', count: 1 });

  // AI Itinerary Generator state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiItinerary, setAiItinerary] = useState(null);
  const [showAiItinerary, setShowAiItinerary] = useState(false);

  // Stay Details Modal state
  const [showStayDetailsModal, setShowStayDetailsModal] = useState(false);
  const [stayDetailsCityIndex, setStayDetailsCityIndex] = useState(null);
  const [stayType, setStayType] = useState('Hotel - Own Arrangement');
  const [stayHotelQuery, setStayHotelQuery] = useState('');
  const [stayHotelResults, setStayHotelResults] = useState([]);
  const [stayHotelSearching, setStayHotelSearching] = useState(false);
  const [staySelectedHotel, setStaySelectedHotel] = useState(null);
  const [stayNotFound, setStayNotFound] = useState(false);
  const [stayManualName, setStayManualName] = useState('');

  // Fetch insurance and visa settings based on destination country
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const destinationCity = data?.cities?.[0]?.name;
        let country = '';
        if (destinationCity) {
          const cityRes = await api.get(`/cities?search=${encodeURIComponent(destinationCity)}`);
          country = cityRes.data?.cities?.[0]?.country || '';
        }
        const params = country ? `?country=${encodeURIComponent(country)}` : '';
        const [insuranceRes, visaRes, simRes] = await Promise.all([
          api.get(`/settings/insurance${params}`),
          api.get(`/settings/visa${params}`),
          api.get(`/sim-cards${params}`)
        ]);
        setInsuranceSettings(insuranceRes.data);
        setVisaSettings({ ...visaRes.data, country: country || visaRes.data?.country || 'Destination' });
        const simCards = simRes.data?.sim_cards || [];
        setSimCardSettings(simCards.length > 0 ? { ...simCards[0], country: country || simCards[0]?.country || 'Destination' } : { country: country || 'Destination', provider: 'Local SIM', plan_name: 'Tourist Data Plan', data_allowance: '5GB', validity: '7 days', price: 25 });
      } catch (e) {
        // Non-fatal — fall back to the default visa / SIM hint UX. Log so
        // we can still trace the failure during development.
        console.warn('[TripBuilder] visa / SIM settings fetch failed:', e?.message || e);
      }
    };
    fetchSettings();
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
    if (data.travel_insurance_persons) setInsurancePersons(data.travel_insurance_persons);
    // Restore visa
    if (data.visa_included) setVisaIncluded(data.visa_included);
    if (data.visa_persons) setVisaPersons(data.visa_persons);
    // Restore SIM card
    if (data.sim_card_included) setSimCardIncluded(data.sim_card_included);
    if (data.sim_card_persons) setSimCardPersons(data.sim_card_persons);
    // One-time hydration of saved proposal state when entering edit mode.
    // We deliberately depend on `data` (the full prop) so a freshly-loaded
    // proposal re-hydrates the form; the early-return guard at the top
    // prevents re-runs for non-edit flows.
  }, [data]);

  // Fetch transfers for the destination country
  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        const allTransfersRes = await api.get('/transfers');
        setAvailableTransfers(allTransfersRes.data?.transfers || []);
      } catch (error) {
        console.error('Error fetching transfers:', error);
      }
    };
    
    fetchTransfers();
  }, [data?.cities]);

  // Auto-recommend hotels, transfers, and activities on initial load (not editing)
  const [autoRecommendDone, setAutoRecommendDone] = useState(false);
  useEffect(() => {
    const tripCities = data?.cities || [];
    if (data?.isEditing || autoRecommendDone || !tripCities.length) return;
    
    const autoRecommend = async () => {
      try {
        const adultsCount = data?.room_data?.reduce((acc, r) => acc + r.adults, 0) || 2;
        const childrenCount = data?.room_data?.reduce((acc, r) => acc + r.children?.length, 0) || 0;
        const paxCount = adultsCount + childrenCount;
        let vehicleKey = 'sedan_4';
        if (paxCount > 4 && paxCount <= 7) vehicleKey = 'car_7';
        else if (paxCount > 7 && paxCount <= 8) vehicleKey = 'van_8';
        else if (paxCount > 8 && paxCount <= 17) vehicleKey = 'van_17';
        else if (paxCount > 17) vehicleKey = 'bus_29';
        
        // Parse duration string to hours
        const parseDuration = (dur) => {
          if (!dur) return 4;
          const str = String(dur).toLowerCase();
          if (str.includes('full day')) return 8;
          const match = str.match(/(\d+)/);
          return match ? parseInt(match[1]) : 4;
        };

        // Get cheapest vehicle price for a transfer
        const getCheapestPrice = (transfer) => {
          const vp = transfer.vehicle_pricing || {};
          if (vp[vehicleKey]?.selling_price) return vp[vehicleKey].selling_price;
          const prices = Object.values(vp).map(v => v.selling_price).filter(Boolean);
          return prices.length > 0 ? Math.min(...prices) : Infinity;
        };

        // 1. Auto-select hotels for each city
        const hotelPromises = tripCities.map(city => 
          api.get(`/hotels?city=${encodeURIComponent(city.name)}`).catch(() => ({ data: { hotels: [] } }))
        );
        const hotelResults = await Promise.all(hotelPromises);
        const autoHotels = {};
        hotelResults.forEach((res, idx) => {
          const cityHotels = res.data?.hotels || [];
          if (cityHotels.length > 0) {
            const recommended = cityHotels.find(h => h.recommended) || cityHotels[0];
            autoHotels[idx] = recommended;
          }
        });
        if (Object.keys(autoHotels).length > 0) {
          setSelectedHotels(autoHotels);
        }

        // 2. Auto-select transfers (cheapest for first city arrival, last city departure)
        const allTransfersRes = await api.get('/transfers');
        const allTransfers = allTransfersRes.data?.transfers || [];
        
        const firstCity = tripCities[0]?.name;
        const lastCity = tripCities[tripCities.length - 1]?.name;
        
        if (data?.add_transfers !== false) {
          const arrivalTransfers = allTransfers
            .filter(t => t.transfer_direction === 'arrival' && t.city?.toLowerCase() === firstCity?.toLowerCase())
            .sort((a, b) => getCheapestPrice(a) - getCheapestPrice(b));
          
          if (arrivalTransfers.length > 0) {
            const cheapest = arrivalTransfers[0];
            const price = getCheapestPrice(cheapest);
            setSelectedArrivalTransfer({ ...cheapest, selectedVehicle: vehicleKey, vehiclePrice: price !== Infinity ? price : 0 });
            setTransferVehicles(prev => ({ ...prev, [cheapest.id]: vehicleKey }));
          }
          
          const departureTransfers = allTransfers
            .filter(t => t.transfer_direction === 'departure' && t.city?.toLowerCase() === lastCity?.toLowerCase())
            .sort((a, b) => getCheapestPrice(a) - getCheapestPrice(b));
          
          if (departureTransfers.length > 0) {
            const cheapest = departureTransfers[0];
            const price = getCheapestPrice(cheapest);
            setSelectedDepartureTransfer({ ...cheapest, selectedVehicle: vehicleKey, vehiclePrice: price !== Infinity ? price : 0 });
            setTransferVehicles(prev => ({ ...prev, [cheapest.id]: vehicleKey }));
          }
        }

        // 3. Auto-select activities (1-2 per day, max 10 hours total)
        const uniqueCityNames = [...new Set(tripCities.map(c => c.name))];
        const activityPromises = uniqueCityNames.map(cityName =>
          api.get(`/activities?city=${encodeURIComponent(cityName)}`).catch(() => ({ data: { activities: [] } }))
        );
        const activityResults = await Promise.all(activityPromises);
        const activitiesByCity = {};
        uniqueCityNames.forEach((cityName, idx) => {
          activitiesByCity[cityName.toLowerCase()] = activityResults[idx]?.data?.activities || [];
        });

        const newActivities = {};
        const newVehicles = {};
        let dayNum = 1;
        tripCities.forEach((city) => {
          const cityActivities = activitiesByCity[city.name.toLowerCase()] || [];
          const usedIds = new Set();
          
          for (let night = 0; night < (city.nights || 1); night++) {
            const key = `${city.name}_${dayNum}`;
            let totalHours = 0;
            const dayActs = [];
            
            for (const act of cityActivities) {
              if (usedIds.has(act.id)) continue;
              const dur = parseDuration(act.duration);
              if (totalHours + dur > 10) continue;
              if (dayActs.length >= 2) break;
              
              const vp = act.vehicle_pricing || {};
              let price = act.price || 0;
              if (vp[vehicleKey]?.selling_price) {
                price = vp[vehicleKey].selling_price;
              }
              
              dayActs.push({ ...act, selectedVehicle: vehicleKey, vehiclePrice: price });
              newVehicles[act.id] = vehicleKey;
              usedIds.add(act.id);
              totalHours += dur;
            }
            
            if (dayActs.length > 0) {
              newActivities[key] = dayActs;
            }
            dayNum++;
          }
        });
        
        if (Object.keys(newActivities).length > 0) {
          setSelectedActivities(newActivities);
          setActivityVehicles(prev => ({ ...prev, ...newVehicles }));
        }

        setAutoRecommendDone(true);
      } catch (err) {
        console.error('Auto-recommend error:', err);
        setAutoRecommendDone(true);
      }
    };

    autoRecommend();
    // `autoRecommendDone` is intentionally read inside but not in deps —
    // it flips once and the early-return prevents re-fires. `data?.cities`
    // changing (e.g. user edits city list) IS the trigger for re-recommend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.isEditing, data?.cities, data?.room_data, data?.add_transfers]);

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

  // Stay Details Modal handlers
  const openStayDetailsModal = (cityIndex) => {
    setStayDetailsCityIndex(cityIndex);
    const existing = noStayCities[cityIndex];
    if (existing && typeof existing === 'object') {
      setStayType(existing.stayType || 'Hotel - Own Arrangement');
      setStayManualName(existing.manualName || '');
      setStayNotFound(existing.notFound || false);
      setStaySelectedHotel(existing.hotel || null);
      setStayHotelQuery(existing.hotel?.name || '');
    } else {
      setStayType('Hotel - Own Arrangement');
      setStayManualName('');
      setStayNotFound(false);
      setStaySelectedHotel(null);
      setStayHotelQuery('');
    }
    setStayHotelResults([]);
    setShowStayDetailsModal(true);
  };

  const handleStayDetailsSave = () => {
    const details = {
      stayType,
      hotel: staySelectedHotel,
      notFound: stayNotFound,
      manualName: stayNotFound ? stayManualName : '',
    };
    setNoStayCities(prev => ({ ...prev, [stayDetailsCityIndex]: details }));
    setShowStayDetailsModal(false);
  };

  // Debounced hotel search for stay details modal
  const staySearchRef = React.useRef(null);
  useEffect(() => {
    if (!showStayDetailsModal || stayNotFound) return;
    if (!stayHotelQuery.trim() || stayHotelQuery.length < 2) {
      setStayHotelResults([]);
      return;
    }
    if (staySearchRef.current) clearTimeout(staySearchRef.current);
    staySearchRef.current = setTimeout(async () => {
      setStayHotelSearching(true);
      try {
        const cityName = data?.cities?.[stayDetailsCityIndex]?.name || '';
        const res = await api.get(`/hotels?search=${encodeURIComponent(stayHotelQuery)}&city=${encodeURIComponent(cityName)}`);
        setStayHotelResults(res.data?.hotels || []);
      } catch (e) {
        console.error('Stay hotel search error:', e);
      }
      setStayHotelSearching(false);
    }, 300);
    return () => { if (staySearchRef.current) clearTimeout(staySearchRef.current); };
  }, [stayHotelQuery, showStayDetailsModal, stayNotFound, stayDetailsCityIndex, data?.cities]);

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

  // Time limit exceeded toast state
  const [timeLimitToast, setTimeLimitToast] = useState(null);

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
      // Check 12-hour limit before adding
      const currentHours = currentActivities.reduce((sum, a) => sum + parseDurationHours(a.duration), 0);
      const newDuration = parseDurationHours(activity.duration);
      if (currentHours + newDuration > MAX_HOURS_PER_DAY) {
        setTimeLimitToast(`Cannot add "${activity.name}" (${activity.duration}). Day ${activeActivityDay} already has ${currentHours} hours. Maximum is ${MAX_HOURS_PER_DAY} hours per day.`);
        setTimeout(() => setTimeLimitToast(null), 5000);
        return;
      }
      // If the same activity is already on another day in the same city, remove it
      // from that day so it's not duplicated. (Nexus DMC behavior: an activity belongs to one day.)
      setSelectedActivities(prev => {
        const next = { ...prev };
        Object.entries(next).forEach(([k, acts]) => {
          if (k === key) return; // skip current day
          const lastUs = k.lastIndexOf('_');
          const k_city = lastUs > 0 ? k.slice(0, lastUs) : '';
          if (k_city !== activeActivityCity) return;
          if ((acts || []).some(a => a?.id === activity.id)) {
            next[k] = acts.filter(a => a?.id !== activity.id);
          }
        });
        return next;
      });
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
    
    // Close all modals (vehicle + activity)
    setShowVehicleModal(false);
    setPendingActivity(null);
    setShowActivitiesModal(false);
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

  // For the ActivitiesModal: returns a map { activityId: dayNumber } of activities
  // already selected on OTHER days within the same city, so we can warn on duplicates.
  const getActivitiesOnOtherDaysInCity = (cityName, currentDay) => {
    const map = {};
    Object.entries(selectedActivities).forEach(([key, acts]) => {
      const lastUs = key.lastIndexOf('_');
      if (lastUs <= 0) return;
      const k_city = key.slice(0, lastUs);
      const k_day = parseInt(key.slice(lastUs + 1), 10);
      if (k_city !== cityName || k_day === currentDay) return;
      (acts || []).forEach((a) => {
        if (a?.id) map[a.id] = k_day;
      });
    });
    return map;
  };

  // Parse duration string to hours
  const parseDurationHours = (dur) => {
    if (!dur) return 4;
    const str = String(dur).toLowerCase();
    if (str.includes('full day')) return 8;
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1]) : 4;
  };

  // Compute time limit violations (12 hours max per day)
  const MAX_HOURS_PER_DAY = 12;
  const [showTimeWarnings, setShowTimeWarnings] = useState(false);

  const { timeViolations, overflowByDay } = React.useMemo(() => {
    const violations = [];
    const byDay = {}; // { "city_day": [activityId, ...] }
    Object.entries(selectedActivities).forEach(([key, activities]) => {
      if (!activities || activities.length === 0) return;
      const [city, day] = key.split('_');
      let totalHours = 0;
      const overflowIds = [];
      activities.forEach(act => {
        const dur = parseDurationHours(act.duration);
        totalHours += dur;
        if (totalHours > MAX_HOURS_PER_DAY) {
          overflowIds.push(act.id);
          violations.push({ name: act.name, day, city });
        }
      });
      if (overflowIds.length > 0) {
        byDay[key] = overflowIds;
      }
    });
    return { timeViolations: violations, overflowByDay: byDay };
  }, [selectedActivities]);

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
    if (totalPax <= 7) return { key: 'car_7', label: '7 Seater Minivan', icon: '🚙', maxPax: 7 };
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
        'car_7': '🚙 7 Seater Minivan',
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
        'car_7': '🚙 7 Seater Minivan',
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
      'car_7': '7 Seater Minivan',
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
    // Number of physical rooms the customer is booking (e.g. 2 rooms for
    // 4 adults split as 2A + 2A). Each selected room type gets booked
    // `roomsCount` times — pricing scales accordingly.
    const roomsCount = data?.room_data?.length || 1;
    let hotelTotal = 0;
    Object.values(selectedHotels).forEach(hotel => {
      if (hotel?.selectedRoom?.price) {
        hotelTotal += hotel.selectedRoom.price * (hotel.nights || 1) * roomsCount;
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
    
    // Eligible pax for extras = adults + children excluding infants (<2 yrs).
    // Per business rule, infants are not charged for extras.
    const eligiblePax = (data?.room_data || []).reduce((acc, r) => {
      const adultCount = Number(r.adults || 0);
      const nonInfantChildren = (r.children || []).filter(ch => {
        const age = (ch?.age || '').toString().toLowerCase();
        return !(age.includes('<2') || age.includes('infant') || age.includes('0-2'));
      }).length;
      return acc + adultCount + nonInfantChildren;
    }, 0) || 1;

    // Calculate extras total. Extras are keyed by entityId (activity OR
    // transfer id). Look up the entity's selected vehicle in either the
    // activities map or the transfer maps so per-vehicle pricing applies.
    let extrasTotal = 0;
    Object.entries(selectedExtras).forEach(([entityId, extras]) => {
      let entityVehicle = null;
      // Activities
      Object.values(selectedActivities).forEach(dayActs => {
        const found = dayActs.find(a => a.id === entityId);
        if (found) entityVehicle = found.selectedVehicle;
      });
      // Inter-city transfers
      if (!entityVehicle) {
        Object.values(interCityTransfers).forEach(t => {
          if (t?.id === entityId) entityVehicle = t.selectedVehicle;
        });
      }
      // Arrival / departure transfers
      if (!entityVehicle && selectedArrivalTransfer?.id === entityId) entityVehicle = selectedArrivalTransfer.selectedVehicle;
      if (!entityVehicle && selectedDepartureTransfer?.id === entityId) entityVehicle = selectedDepartureTransfer.selectedVehicle;

      extras.forEach(extra => {
        const perPax = (extra.vehicle_pricing && entityVehicle && extra.vehicle_pricing[entityVehicle])
          ? extra.vehicle_pricing[entityVehicle]
          : (extra.price || 0);
        // Per-person extras: multiply by eligible pax (adults + non-infant kids)
        extrasTotal += perPax * eligiblePax;
      });
    });
    activitiesTotal += extrasTotal;
    
    const adultsCount = data?.room_data?.reduce((acc, r) => acc + r.adults, 0) || 2;
    const childrenCount = data?.room_data?.reduce((acc, r) => acc + r.children?.length, 0) || 0;
    
    const subtotal = hotelTotal + flightPrice + transferTotal + activitiesTotal;
    
    // Calculate insurance cost (per person × persons selected)
    const insuranceTotal = travelInsurance ? (insuranceSettings?.price_per_person || 0) * insurancePersons : 0;
    
    // Calculate visa cost (per person × persons selected)
    const visaTotal = visaIncluded ? (visaSettings?.price || 0) * visaPersons : 0;
    
    // Calculate SIM card cost (per person × persons selected)
    const simCardTotal = simCardIncluded ? (simCardSettings?.price || 0) * simCardPersons : 0;
    
    const grandTotal = subtotal + insuranceTotal + visaTotal + simCardTotal;
    const pricePerAdult = Math.round(grandTotal / adultsCount);
    const pricePerChild = Math.round(pricePerAdult * 0.7); // 30% discount for children

    return {
      hotelTotal,
      flightPrice,
      transferTotal,
      activitiesTotal,
      insuranceTotal,
      visaTotal,
      simCardTotal,
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
            ? Math.round(pricing.total * formData.markup_value / 100)
            : formData.markup_value,
          discount: formData.discount_amount,
          total: pricing.total
        },
        total_price: pricing.total,
        markup_land: formData.markup_type === 'percentage' 
          ? Math.round(pricing.total * formData.markup_value / 100)
          : formData.markup_value,
        
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
            vehicle_type: t.vehicleLabel || t.vehicle_type,
            selectedVehicle: t.selectedVehicle || null,
            vehiclePrice: t.selectedPrice ?? t.vehiclePrice ?? null,
            duration: t.duration,
            // Carry the catalog's extras list so the saved proposal can show
            // them in the customer view; the user-selected ones live in
            // selectedExtras keyed by transfer id.
            extras: t.extras || [],
          };
          return acc;
        }, {}),

        // Travel Insurance
        travel_insurance: travelInsurance,
        travel_insurance_price: travelInsurance ? (insuranceSettings?.price_per_person || 50) : 0,
        travel_insurance_persons: insurancePersons,
        
        // Visa
        visa_included: visaIncluded,
        visa_details: visaIncluded ? visaSettings : null,
        visa_persons: visaPersons,

        // SIM Card
        sim_card_included: simCardIncluded,
        sim_card_details: simCardIncluded ? simCardSettings : null,
        sim_card_persons: simCardPersons,

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
        checkIn={(() => {
          // City-specific check-in = trip start + sum of nights for prior cities.
          // MUST be ISO "YYYY-MM-DD" so the room blackout-overlap check inside
          // HotelDetailsView can do lexicographic string compare correctly.
          const offset = cities.slice(0, activeHotelCity || 0).reduce((a, c) => a + (c.nights || 1), 0);
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + offset);
          return d.toISOString().slice(0, 10);
        })()}
        checkOut={(() => {
          const offset = cities.slice(0, activeHotelCity || 0).reduce((a, c) => a + (c.nights || 1), 0)
                       + (cities[activeHotelCity]?.nights || 1);
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + offset);
          return d.toISOString().slice(0, 10);
        })()}
        nights={cities[activeHotelCity]?.nights || 1}
        onSelect={handleHotelSelect}
        searchQuery={hotelSearchQuery}
        initialHotel={changeRoomHotel}
        totalGuests={totalPax}
        // Age-aware per-room occupancy from Create Trip Package form. Per
        // user spec: children above 5 yrs count as ADULTS for occupancy (so
        // 2A+1C-aged-6 → effectively 3 pax, hiding Twin/Queen/King). Children
        // ≤5 yrs are free-in-bed and don't occupy a slot, so we drop them
        // from both counts. `child.age` values from the picker look like
        // "<2 yrs", "3 yrs", "11 yrs".
        adults={(() => {
          const firstRoom = data?.room_data?.[0];
          if (!firstRoom) return 1;
          const baseAdults = firstRoom.adults || 1;
          const childrenAboveFive = (firstRoom.children || []).filter((c) => {
            const n = parseInt(String(c.age || '').replace(/[^0-9]/g, ''), 10);
            return Number.isFinite(n) && n > 5;
          }).length;
          return baseAdults + childrenAboveFive;
        })()}
        children={(() => {
          // Only kids ≤5 still occupy a "child" slot (free-in-bed) — kids >5
          // were already promoted into the adult count above.
          return 0;
        })()}
      />

      {/* Hotel Options Modal (Change Hotel choices) */}
      <HotelOptionsModal
        isOpen={showHotelOptions}
        onClose={() => setShowHotelOptions(false)}
        city={cities[activeHotelCity]?.name || ''}
        onViewAll={handleViewAllHotels}
        onNoStay={handleNoStay}
        onSearch={handleSearchHotel}
        onSelectHotel={(hotel) => {
          setSelectedHotels(prev => ({ ...prev, [activeHotelCity]: hotel }));
          setNoStayCities(prev => { const n = {...prev}; delete n[activeHotelCity]; return n; });
          setShowHotelOptions(false);
        }}
      />

      {/* Stay Details Booked Separately Modal */}
      <StayDetailsModal
        isOpen={showStayDetailsModal}
        onClose={() => setShowStayDetailsModal(false)}
        onSave={handleStayDetailsSave}
        stayType={stayType} setStayType={setStayType}
        stayHotelQuery={stayHotelQuery} setStayHotelQuery={setStayHotelQuery}
        stayHotelResults={stayHotelResults} stayHotelSearching={stayHotelSearching}
        staySelectedHotel={staySelectedHotel} setStaySelectedHotel={setStaySelectedHotel}
        setStayHotelResults={setStayHotelResults}
        stayNotFound={stayNotFound} setStayNotFound={setStayNotFound}
        stayManualName={stayManualName} setStayManualName={setStayManualName}
      />

      {/* Transfer Selection Modal */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        transferModalType={transferModalType}
        transferCity={transferCity}
        leavingOn={data?.leaving_on}
        availableTransfers={availableTransfers}
        transferSearch={transferSearch} setTransferSearch={setTransferSearch}
        transferCategoryFilter={transferCategoryFilter} setTransferCategoryFilter={setTransferCategoryFilter}
        transferTimeFilter={transferTimeFilter} setTransferTimeFilter={setTransferTimeFilter}
        selectedArrivalTransfer={selectedArrivalTransfer}
        selectedDepartureTransfer={selectedDepartureTransfer}
        onSelectTransfer={handleSelectTransfer}
      />

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
          {/* Top row: title, meta, total price + Save & Proceed */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg md:text-xl font-extrabold text-[#0B4F9C] tracking-tight">Customize Your Trip</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={14} />
                  {formatShortDate(startDate)} – {formatShortDate(returnDate)}
                </span>
                <span className="text-gray-300">•</span>
                <span>{totalNights} night{totalNights > 1 ? 's' : ''} / {totalDays} days</span>
                <span className="text-gray-300">•</span>
                <span className="inline-flex items-center gap-1">
                  <Users size={14} />
                  {data.travelersSummary || data.travelers}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              {timeViolations.length > 0 && (
                <div className="inline-block relative">
                  <button
                    onClick={() => setShowTimeWarnings(!showTimeWarnings)}
                    className="relative w-10 h-10 bg-[#0B4F9C] text-white rounded-full flex items-center justify-center hover:bg-[#0a4488] transition-colors"
                    data-testid="time-warning-btn"
                  >
                    <AlertCircle size={20} />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {timeViolations.length}
                    </span>
                  </button>
                  {showTimeWarnings && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowTimeWarnings(false)} />
                      <div className="absolute right-0 top-full mt-2 z-40">
                        <div className="w-4 h-4 bg-red-600 rotate-45 absolute -top-2 right-4" />
                        <div className="bg-[#FFF5F0] border-t-4 border-red-600 rounded-b-xl shadow-xl w-80 p-5 space-y-0" data-testid="time-warnings-popup">
                          {timeViolations.map((v, i) => (
                            <div key={`violation-${v.day}-${v.name || v.id || i}`}>
                              {i > 0 && <div className="border-b-2 border-dashed border-red-300 my-4" />}
                              <p className="font-bold text-red-900 text-sm">Day {v.day}: {v.name}</p>
                              <p className="text-red-800 text-xs mt-1 italic">Not possible to do because of other inclusions on this day</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="text-right">
                <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-400">Total Package</p>
                <p className="text-xl md:text-2xl font-extrabold text-[#0B4F9C] leading-none" data-testid="total-price">AED {pricing.total.toLocaleString()}</p>
              </div>
              <button
                onClick={handleSaveProposal}
                disabled={isSaving}
                data-testid="header-save-proceed"
                className="hidden sm:inline-flex items-center gap-2 bg-[#0B4F9C] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-[#0B4F9C]/20 hover:bg-[#0a4488] transition-all disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                Save &amp; Proceed
              </button>
            </div>
          </div>

          {/* Step indicator */}
          <div className="mt-4 flex items-center">
            {[
              { label: 'Trip Details', n: 1, state: 'done', onClick: onBack },
              { label: 'Flights', n: 2, state: 'current' },
              { label: 'Hotels', n: 3, state: 'current' },
              { label: 'Activities', n: 4, state: 'current' },
              { label: 'Review & Payment', n: 5, state: 'upcoming' },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <button
                  type="button"
                  onClick={s.onClick}
                  disabled={!s.onClick}
                  className={cn('flex items-center gap-2 shrink-0', s.onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default')}
                >
                  <span className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors',
                    s.state === 'done' && 'bg-emerald-500 border-emerald-500 text-white',
                    s.state === 'current' && 'bg-[#0B4F9C] border-[#0B4F9C] text-white shadow-md shadow-[#0B4F9C]/30',
                    s.state === 'upcoming' && 'bg-white border-gray-300 text-gray-400'
                  )}>
                    {s.state === 'done' ? <Check size={16} /> : s.n}
                  </span>
                  <span className={cn(
                    'hidden md:inline text-sm font-bold whitespace-nowrap',
                    s.state === 'done' && 'text-gray-500',
                    s.state === 'current' && 'text-[#0B4F9C]',
                    s.state === 'upcoming' && 'text-gray-400'
                  )}>{s.label}</span>
                </button>
                {i < arr.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-2 md:mx-3 rounded-full', arr[i + 1].state === 'upcoming' ? 'bg-gray-200' : 'bg-[#0B4F9C]/40')} />
                )}
              </React.Fragment>
            ))}
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
                <div key={`stay-${cityIndex}-${city.name}`} className="mb-6">
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
                            <span className="text-gray-700">Selected Room: <strong>{(data?.room_data?.length || 1)} x {cityHotel.selectedRoom?.name || 'Standard Room'}, {cityHotel.selectedRoom?.bed_type || 'Twin Beds'}</strong></span>
                          </div>
                          {(() => {
                            const mealPlan = cityHotel.selectedRoom?.rate_plan?.meal_plan
                              || cityHotel.selectedRoom?.meal_plan
                              || cityHotel.selectedRoom?.mealPlan
                              || cityHotel.selectedRoom?.meals
                              || 'Room Only';
                            return (
                              <div className="flex items-center gap-2 text-sm">
                                <Check className="w-5 h-5 text-green-500" />
                                <span className="text-gray-700">{mealPlan}, No Extra Bed</span>
                              </div>
                            );
                          })()}
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
                          {(() => {
                            const mealPlan = cityHotel.selectedRoom?.rate_plan?.meal_plan
                              || cityHotel.selectedRoom?.meal_plan
                              || cityHotel.selectedRoom?.mealPlan
                              || cityHotel.selectedRoom?.meals
                              || 'Room Only';
                            const hasMeals = mealPlan && mealPlan !== 'Room Only';
                            if (!hasMeals) {
                              return <p className="text-gray-500 text-sm">No meals included (Room Only)</p>;
                            }
                            return (
                              <>
                                <div className="flex items-center gap-2 text-sm">
                                  <Check className="w-5 h-5 text-green-500" />
                                  <span className="text-gray-700">{mealPlan}</span>
                                </div>
                                {cityHotel.selectedRoom?.rate_plan?.meal_details && (
                                  <p className="text-gray-500 text-xs ml-7">{cityHotel.selectedRoom.rate_plan.meal_details}</p>
                                )}
                                <p className="text-green-600 font-medium text-sm ml-7">Included</p>
                              </>
                            );
                          })()}
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
                    <div className="bg-white rounded-b-xl border border-gray-200 border-t-0">
                      <div className="p-6">
                        <div className="flex items-start gap-6">
                          {/* Hotel illustration with X */}
                          <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Building2 className="text-gray-400" size={40} strokeWidth={1.5} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                              <X className="text-white" size={14} strokeWidth={2.5} />
                            </div>
                          </div>

                          {/* Right content */}
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-[#002B5B] mb-4">
                              {noStayCities[cityIndex] ? 'No Stay Included' : 'No Hotel Selected'}
                            </h4>

                            {/* Check-in / Check-out */}
                            <div className="flex items-start gap-8 text-sm mb-5">
                              <div>
                                <p className="text-gray-500 mb-0.5">Check-in</p>
                                <p className="font-bold text-[#002B5B]">{formatDate(cityStartDate)}</p>
                              </div>
                              <div className="h-10 w-px bg-gray-300" />
                              <div>
                                <p className="text-gray-500 mb-0.5">Check-out</p>
                                <p className="font-bold text-[#002B5B]">{formatDate(cityEndDate)}</p>
                              </div>
                            </div>

                            {/* Stay info box */}
                            {noStayCities[cityIndex] && (
                              <div className="bg-gray-100 rounded-lg px-5 py-4 mb-5 max-w-md">
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Stay information booked separately</p>
                                {/* Show saved hotel details if available */}
                                {typeof noStayCities[cityIndex] === 'object' && (noStayCities[cityIndex].hotel || noStayCities[cityIndex].manualName) && (
                                  <p className="text-sm font-bold text-[#002B5B] mb-1">
                                    {noStayCities[cityIndex].hotel 
                                      ? `${noStayCities[cityIndex].hotel.name}${noStayCities[cityIndex].hotel.star_rating ? ` (${noStayCities[cityIndex].hotel.star_rating} star)` : ''}`
                                      : noStayCities[cityIndex].manualName
                                    }
                                  </p>
                                )}
                                <button
                                  onClick={() => openStayDetailsModal(cityIndex)}
                                  className="text-sm text-[#1a6b8a] hover:underline font-medium"
                                  data-testid={`update-stay-details-${cityIndex}`}
                                >
                                  update stay details
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Change Hotel button */}
                        <div className="mt-4">
                          <button 
                            onClick={() => handleChangeHotel(cityIndex)}
                            className="bg-[#7B2D26] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#5e221d] transition-all text-sm"
                            data-testid={`add-hotel-${cityIndex}`}
                          >
                            {noStayCities[cityIndex] ? 'Change Hotel' : 'Add Hotel'}
                          </button>
                        </div>
                      </div>

                      {/* Warning banner - only when no details provided */}
                      {noStayCities[cityIndex] && (noStayCities[cityIndex] === true || (typeof noStayCities[cityIndex] === 'object' && !noStayCities[cityIndex].hotel && !noStayCities[cityIndex].manualName)) && (
                        <div className="bg-amber-50 px-6 py-4 border-t border-amber-100 rounded-b-xl">
                          <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-900">
                              As stay information is missing, please note that SIC transfers are only available from hotels in few areas and there may be extra cost for private transfer if the pickup location is far from city center
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Day-by-Day Details */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 mt-8">Daily Itinerary</h2>
            {itinerary.map((day, index) => (
              <DayCard
                key={`day-${day.day}-${day.city || ''}-${index}`}
                {...day}
                activities={getActivitiesForDay(day.city, day.day)}
                onAddActivity={() => handleAddActivity(day.city, day.day)}
                onRemoveActivity={(activityId) => handleRemoveActivity(day.city, day.day, activityId)}
                // Inter-city transfer day: also expose the FROM-city's
                // activities so the agent can plan morning sightseeing in
                // the origin city before the transfer.
                fromCityActivities={day.isCheckInDay && day.incomingFromCity
                  ? getActivitiesForDay(day.incomingFromCity, day.day)
                  : undefined}
                onAddActivityFromCity={day.isCheckInDay && day.incomingFromCity
                  ? () => handleAddActivity(day.incomingFromCity, day.day)
                  : undefined}
                onRemoveFromCityActivity={day.isCheckInDay && day.incomingFromCity
                  ? (activityId) => handleRemoveActivity(day.incomingFromCity, day.day, activityId)
                  : undefined}
                onChangeHotel={() => {
                  setActiveHotelCity(day.cityIndex);
                  setShowHotelModal(true);
                }}
                onSelectArrivalTransfer={(city) => openTransferModal('arrival', city)}
                onSelectDepartureTransfer={(city) => openTransferModal('departure', city)}
                onRemoveArrivalTransfer={() => setSelectedArrivalTransfer(null)}
                onRemoveDepartureTransfer={() => setSelectedDepartureTransfer(null)}
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
                overflowActivityIds={overflowByDay[`${day.city}_${day.day}`] || []}
              />
            ))}
          </div>

          {/* Right Column - Trip Summary */}
          <TripSummary
            cities={cities} noStayCities={noStayCities} openStayDetailsModal={openStayDetailsModal}
            selectedFlight={selectedFlight} selectedHotels={selectedHotels}
            selectedArrivalTransfer={selectedArrivalTransfer} selectedDepartureTransfer={selectedDepartureTransfer}
            getTransferVehicleLabel={getTransferVehicleLabel}
            interCityTransfers={interCityTransfers}
            selectedActivities={selectedActivities} getActivityVehicleLabel={getActivityVehicleLabel} getActivityPriceForVehicle={getActivityPriceForVehicle}
            pricing={pricing} isSaving={isSaving} handleSaveProposal={handleSaveProposal}
            data={data} onConfirm={onConfirm}
          />
        </div>

        {/* Add-ons: Visa, SIM Card, Travel Insurance */}
        <AddOnsSection
          visaSettings={visaSettings} visaIncluded={visaIncluded} setVisaIncluded={setVisaIncluded}
          visaPersons={visaPersons} setVisaPersons={setVisaPersons}
          simCardSettings={simCardSettings} simCardIncluded={simCardIncluded} setSimCardIncluded={setSimCardIncluded}
          simCardPersons={simCardPersons} setSimCardPersons={setSimCardPersons}
          insuranceSettings={insuranceSettings} travelInsurance={travelInsurance} setTravelInsurance={setTravelInsurance}
          insurancePersons={insurancePersons} setInsurancePersons={setInsurancePersons}
          quantityPopup={quantityPopup} setQuantityPopup={setQuantityPopup}
          totalPax={totalPax}
        />

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
            dayNumber={activeActivityDay}
            startDate={data?.leaving_on}
            selectedActivities={getActivitiesForDay(activeActivityCity, activeActivityDay)}
            otherDayActivityMap={getActivitiesOnOtherDaysInCity(activeActivityCity, activeActivityDay)}
            onSelectActivity={handleSelectActivity}
            // On inter-city transfer days, restrict the picker to activities
            // admins have explicitly opted-in via the "Available on Internal
            // Transfer Days" toggle on the Edit Activity form.
            transferDayMode={!!itinerary.find(d => d.day === activeActivityDay)?.isCheckInDay}
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
      <AiItineraryModal
        isOpen={showAiItinerary}
        aiItinerary={aiItinerary}
        onClose={() => setShowAiItinerary(false)}
        onRegenerate={() => { handleGenerateAiItinerary(); setShowAiItinerary(false); }}
        onApply={handleApplyAiItinerary}
      />

      {/* Inter-City Transfer Modal */}
      <InterCityTransferModal
        modal={interCityTransferModal}
        onClose={() => setInterCityTransferModal({ open: false, fromCityIdx: null, toCityIdx: null, fromCity: '', toCity: '' })}
        options={interCityTransferOptions}
        loading={interCityLoading}
        selectedVehicle={selectedVehicle}
        interCityTransfers={interCityTransfers}
        onSelectTransfer={handleSelectInterCityTransfer}
      />

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

      {/* Time Limit Toast */}
      <AnimatePresence>
        {timeLimitToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl max-w-lg flex items-start gap-3"
            data-testid="time-limit-toast"
          >
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Time Limit Exceeded</p>
              <p className="text-xs mt-1 text-red-100">{timeLimitToast}</p>
            </div>
            <button onClick={() => setTimeLimitToast(null)} className="ml-2 text-red-200 hover:text-white flex-shrink-0">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

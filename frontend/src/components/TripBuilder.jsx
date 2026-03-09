import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Hotel, MapPin, Calendar, Users, ChevronDown, ChevronRight, 
  Plus, X, Check, Star, Clock, Coffee, Wifi, Car, Edit2, Loader2,
  CreditCard, Save, ArrowRight, Sun, Moon, Utensils, Camera, Info, AlertCircle,
  List, Ban, Search, DollarSign, Globe, Compass, Trash2, Phone, Mail, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';
import FlightSearchModal from './FlightSearchModal';
import HotelDetailsView from './HotelDetailsView';

// Save Proposal Modal Component
function SaveProposalModal({ isOpen, onClose, onSave, tripData, pricing }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    proposal_name: '',
    expected_booking_date: '',
    flights_booked: null,
    markup_value: 0,
    markup_type: 'percentage',
    discount_amount: 0
  });
  const [saving, setSaving] = useState(false);

  // Set default proposal name based on trip data
  useEffect(() => {
    if (isOpen && tripData?.cities?.[0]?.name) {
      setFormData(prev => ({
        ...prev,
        proposal_name: `Trip to ${tripData.cities[0].name}`
      }));
    }
  }, [isOpen, tripData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name.trim()) {
      alert('Customer name is required');
      return;
    }
    if (!formData.proposal_name.trim()) {
      alert('Trip name is required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save proposal');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Save Proposal</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customer Details */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Customer Details</legend>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <label className="w-24 text-sm font-medium text-gray-700 pt-2">
                  Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  required
                  data-testid="customer-name-input"
                />
              </div>
              
              <div className="flex items-start gap-4">
                <label className="w-24 text-sm font-medium text-gray-700 pt-2">Email</label>
                <div className="flex-1">
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="customer-email-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional - Provide client's email address if available. No email will be sent on saving proposal.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <label className="w-24 text-sm font-medium text-gray-700 pt-2">Phone</label>
                <div className="flex-1">
                  <input
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="customer-phone-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional - Provide client's mobile number if available
                  </p>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Proposal Details */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Proposal Details</legend>
            
            <div className="flex items-start gap-4">
              <label className="w-24 text-sm font-medium text-gray-700 pt-2">
                Trip Name<span className="text-red-500">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.proposal_name}
                  onChange={(e) => setFormData({...formData, proposal_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  required
                  data-testid="proposal-name-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is the name given to the proposal and it is communicated with the customer. 
                  After saving the proposal, a proposal reference will be provided. 
                  Please use this in all correspondence regarding this proposal.
                </p>
              </div>
            </div>
          </fieldset>

          {/* Estimated Booking Date */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Estimated Booking Date</legend>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <label className="w-40 text-sm font-medium text-gray-700 pt-2">
                  Estimated Date of Booking
                </label>
                <div className="flex-1">
                  <input
                    type="date"
                    value={formData.expected_booking_date}
                    onChange={(e) => setFormData({...formData, expected_booking_date: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="booking-date-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Please select a date when you expect this quote to close
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="w-40 text-sm font-medium text-gray-700">
                  Are Flights Booked?
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="flights_booked"
                      checked={formData.flights_booked === true}
                      onChange={() => setFormData({...formData, flights_booked: true})}
                      className="w-4 h-4 text-[#002B5B] border-gray-300 focus:ring-[#002B5B]"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="flights_booked"
                      checked={formData.flights_booked === false}
                      onChange={() => setFormData({...formData, flights_booked: false})}
                      className="w-4 h-4 text-[#002B5B] border-gray-300 focus:ring-[#002B5B]"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Markup */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Markup</legend>
            
            <div className="flex items-center gap-4">
              <label className="w-24 text-sm font-medium text-gray-700">Land</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={formData.markup_value}
                  onChange={(e) => setFormData({...formData, markup_value: parseFloat(e.target.value) || 0})}
                  className="w-24 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="markup-value-input"
                />
                <select
                  value={formData.markup_type}
                  onChange={(e) => setFormData({...formData, markup_type: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
                  data-testid="markup-type-select"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Discount */}
          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="px-2 text-sm font-medium text-gray-600">Discount</legend>
            
            <div className="flex items-start gap-4">
              <label className="w-32 text-sm font-medium text-gray-700 pt-2">
                Discount Amount
              </label>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})}
                  className="w-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="discount-amount-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Discount will be adjusted against and limited by the commission/markup.<br/>
                  It will be shown on the customer's final quote proposal.
                </p>
              </div>
            </div>
          </fieldset>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-3 bg-[#002B5B] text-white font-bold rounded hover:bg-[#003d82] transition-colors disabled:opacity-50 flex items-center gap-2"
            data-testid="save-proposal-btn"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            SAVE PROPOSAL
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Activities Modal Component - Shows activities filtered by city
function ActivitiesModal({ isOpen, onClose, city, onSelectActivity, selectedActivities = [] }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && city) {
      fetchActivities();
    }
  }, [isOpen, city]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      // Fetch activities filtered by city
      const res = await api.get(`/activities?city=${encodeURIComponent(city)}`);
      let activityList = res.data?.activities || [];
      
      // If no activities for the specific city, try broader search
      if (activityList.length === 0) {
        const allRes = await api.get('/activities');
        const allActivities = allRes.data?.activities || [];
        // Filter by city name match (case-insensitive)
        activityList = allActivities.filter(a => 
          a.city?.toLowerCase().includes(city.toLowerCase()) ||
          city.toLowerCase().includes(a.city?.toLowerCase() || '')
        );
      }
      
      // Filter only available activities
      activityList = activityList.filter(a => a.available !== false);
      
      setActivities(activityList);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter activities by search query
  const filteredActivities = searchQuery
    ? activities.filter(a =>
        a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activities;

  // Check if an activity is already selected
  const isSelected = (activityId) => {
    return selectedActivities.some(a => a.id === activityId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Activities in {city}</h2>
            <p className="text-pink-100 text-sm">Select activities for your trip</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search activities by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              data-testid="activity-search-input"
            />
          </div>
        </div>

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-pink-500" size={40} />
              <p className="mt-4 text-gray-500 font-medium">Loading activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Compass size={48} className="text-gray-300 mb-4" />
              <p className="font-medium text-gray-500">
                {searchQuery 
                  ? `No activities found for "${searchQuery}"`
                  : `No activities available in ${city}`
                }
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Try searching for a different activity or check back later
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActivities.map((activity) => {
                const selected = isSelected(activity.id);
                return (
                  <motion.div
                    key={activity.id}
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      "bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all",
                      selected 
                        ? "border-pink-500 ring-2 ring-pink-200" 
                        : "border-gray-200 hover:border-pink-300"
                    )}
                    onClick={() => onSelectActivity(activity)}
                    data-testid={`activity-option-${activity.id}`}
                  >
                    <div className="flex">
                      {/* Activity Image */}
                      <div className="w-32 h-32 flex-shrink-0 relative">
                        <img
                          src={activity.images?.[0] || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400'}
                          alt={activity.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <span className="bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {activity.category || 'Activity'}
                          </span>
                          {activity.transfer_type && (
                            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {activity.transfer_type}
                            </span>
                          )}
                        </div>
                        {selected && (
                          <div className="absolute inset-0 bg-pink-500/30 flex items-center justify-center">
                            <div className="bg-pink-500 text-white rounded-full p-2">
                              <Check size={20} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Activity Details */}
                      <div className="flex-1 p-4">
                        <h3 className="font-bold text-gray-800 line-clamp-1">{activity.name}</h3>
                        
                        {/* Timing */}
                        {activity.start_times?.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <Clock size={10} />
                            <span>Starts at {activity.start_times.slice(0, 2).join(', ')} ({activity.duration})</span>
                          </div>
                        )}
                        
                        {/* Languages */}
                        {activity.languages?.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Globe size={10} />
                            <span>{activity.languages.slice(0, 2).join(', ')}</span>
                          </div>
                        )}
                        
                        {/* Closed Days */}
                        {activity.closed_days?.length > 0 && (
                          <div className="text-xs text-red-500 mt-1">
                            Closed on {activity.closed_days.join(', ')}
                          </div>
                        )}

                        {/* Inclusions */}
                        {activity.inclusions?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {activity.inclusions.slice(0, 2).map((inc, i) => (
                              <span key={i} className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                                {inc}
                              </span>
                            ))}
                            {activity.inclusions.length > 2 && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                +{activity.inclusions.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Price */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} className="text-green-600" />
                            <span className="font-bold text-green-600">{activity.price}</span>
                            <span className="text-xs text-gray-500">{activity.currency || 'AED'}</span>
                          </div>
                          {activity.rating && (
                            <div className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                              <Star size={10} className="fill-yellow-400" />
                              <span>{activity.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {selectedActivities.length} activit{selectedActivities.length !== 1 ? 'ies' : 'y'} selected for this day
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Vehicle Selection Modal - For choosing vehicle type when selecting an activity
function VehicleSelectionModal({ isOpen, onClose, activity, onSelectVehicle, totalPax, currentVehicle }) {
  if (!isOpen || !activity) return null;

  // Define all vehicle options with pricing from the activity
  const vehicleOptions = [
    { key: 'sedan_4', label: '4 Seater Sedan', icon: '🚗', minPax: 1, maxPax: 4 },
    { key: 'car_7', label: '7 Seater Car', icon: '🚙', minPax: 3, maxPax: 7, optional: true },
    { key: 'van_8', label: '8 Seater Van', icon: '🚐', minPax: 5, maxPax: 8, optional: true },
    { key: 'van_17', label: '17 Seater Van', icon: '🚐', minPax: 9, maxPax: 17 },
    { key: 'bus_29', label: '29 Seater Bus', icon: '🚌', minPax: 18, maxPax: 29 },
    { key: 'bus_45', label: '45 Seater Bus', icon: '🚌', minPax: 30, maxPax: 45 },
    { key: 'bus_55', label: '55 Seater Bus', icon: '🚌', minPax: 46, maxPax: 55 }
  ];

  // Get default vehicle based on pax count
  const getDefaultVehicle = () => {
    if (totalPax <= 4) return 'sedan_4';
    if (totalPax <= 7) return 'car_7';
    if (totalPax <= 8) return 'van_8';
    if (totalPax <= 17) return 'van_17';
    if (totalPax <= 29) return 'bus_29';
    if (totalPax <= 45) return 'bus_45';
    return 'bus_55';
  };

  const defaultVehicleKey = getDefaultVehicle();

  // Filter available vehicles - show default + optional upgrades
  const availableVehicles = vehicleOptions.filter(v => {
    // Always show the default vehicle for this pax count
    if (v.key === defaultVehicleKey) return true;
    // Show optional vehicles that can accommodate this pax count (for upgrades)
    if (v.optional && totalPax >= v.minPax - 2 && totalPax <= v.maxPax) return true;
    // Show larger vehicles as upgrade options
    if (v.maxPax > totalPax && v.minPax <= totalPax) return true;
    return false;
  });

  // Get price for a vehicle
  const getVehiclePrice = (vehicleKey) => {
    if (activity.vehicle_pricing && activity.vehicle_pricing[vehicleKey]) {
      return activity.vehicle_pricing[vehicleKey].selling_price || 0;
    }
    return activity.price || 0;
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Select Vehicle Type</h3>
              <p className="text-blue-100 text-sm">{activity.name}</p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Passenger Info */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Users size={16} />
            <span className="font-medium">{totalPax} passengers</span>
            <span className="text-blue-500">• Choose your preferred vehicle</span>
          </div>
        </div>

        {/* Vehicle Options */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="space-y-3">
            {availableVehicles.map((vehicle) => {
              const price = getVehiclePrice(vehicle.key);
              const isDefault = vehicle.key === defaultVehicleKey;
              const isSelected = currentVehicle === vehicle.key;
              
              return (
                <motion.button
                  key={vehicle.key}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelectVehicle(activity, vehicle.key, price)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all text-left",
                    isSelected 
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : isDefault
                        ? "border-green-300 bg-green-50 hover:border-green-400"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                  )}
                  data-testid={`vehicle-option-${vehicle.key}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{vehicle.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{vehicle.label}</span>
                          {isDefault && (
                            <span className="text-[10px] px-2 py-0.5 bg-green-500 text-white rounded-full font-bold">
                              Recommended
                            </span>
                          )}
                          {vehicle.optional && !isDefault && (
                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">
                              Upgrade
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {vehicle.minPax}-{vehicle.maxPax} passengers • Extra comfort & space
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-green-600">${price}</div>
                      <div className="text-xs text-gray-400">per vehicle</div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            💡 Choose a larger vehicle for extra luggage space or comfort
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Hotel Options Modal Component (Choose how to change hotel)
function HotelOptionsModal({ isOpen, onClose, city, onViewAll, onNoStay, onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-[#F5F5F5] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-8 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Option 1: View all stay options */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onViewAll}
              className="bg-white rounded-2xl p-8 text-center hover:shadow-lg transition-all border border-gray-100 min-h-[320px] flex flex-col items-center justify-center"
              data-testid="view-all-hotels"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <List className="text-[#002B5B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 italic">
                View all stay options in {city}
              </h3>
            </motion.button>

            {/* Option 2: No stay required */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNoStay}
              className="bg-white rounded-2xl p-8 text-center hover:shadow-lg transition-all border border-gray-100 min-h-[320px] flex flex-col items-center justify-center"
              data-testid="no-stay-required"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Ban className="text-[#002B5B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 italic">
                No stay required in {city}
              </h3>
            </motion.button>

            {/* Option 3: Search for particular hotel */}
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 min-h-[320px] flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Hotel className="text-[#002B5B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 italic mb-6">
                Looking for a particular hotel
              </h3>
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by property name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm"
                  data-testid="hotel-search-input"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Hotel Selection Modal Component
function HotelSelectionModal({ isOpen, onClose, city, checkIn, checkOut, nights, onSelect, searchQuery = '', initialHotel = null }) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [filterQuery, setFilterQuery] = useState(searchQuery);

  useEffect(() => {
    if (isOpen) {
      setFilterQuery(searchQuery);
      // If initialHotel is provided, show room options directly
      if (initialHotel) {
        setSelectedHotel(initialHotel);
        setViewMode('detail');
      } else {
        setSelectedHotel(null);
        setViewMode('list');
      }
      fetchHotels();
    }
  }, [isOpen, city, searchQuery, initialHotel]);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      // Fetch hotels filtered by city
      const cityParam = city ? `?city=${encodeURIComponent(city)}` : '';
      const res = await api.get(`/hotels${cityParam}`);
      let hotelList = res.data?.hotels || [];
      
      // Additional search filter if provided
      if (searchQuery) {
        hotelList = hotelList.filter(h => 
          h.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setHotels(hotelList);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter hotels based on current filter query
  const filteredHotels = filterQuery 
    ? hotels.filter(h => 
        h.name?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        h.city?.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : hotels;

  const handleSelectHotel = (hotel, room) => {
    onSelect({
      ...hotel,
      selectedRoom: room,
      checkIn,
      checkOut,
      nights
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#002B5B] text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Select Hotel in {city}</h2>
            <p className="text-sm text-blue-200">{checkIn} - {checkOut} ({nights} nights)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search Filter */}
          {viewMode === 'list' && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search hotels by name..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#002B5B] animate-spin" />
              <p className="mt-4 text-gray-500 font-medium">Searching for hotels...</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {filteredHotels.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Hotel className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">{filterQuery ? `No hotels found for "${filterQuery}"` : 'No hotels available for this destination'}</p>
                </div>
              ) : (
                filteredHotels.map((hotel) => (
                  <div 
                    key={hotel.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedHotel(hotel);
                      setViewMode('detail');
                    }}
                    data-testid={`hotel-option-${hotel.id}`}
                  >
                    <div className="flex">
                      <div className="w-48 h-36 flex-shrink-0">
                        <img 
                          src={hotel.images?.[0] || 'https://via.placeholder.com/200x150?text=Hotel'} 
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-800">{hotel.name}</h3>
                            <div className="flex items-center gap-1 mt-1">
                              {Array.from({ length: hotel.star_rating || 4 }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{hotel.city}, {hotel.country}</p>
                          </div>
                          <div className="text-right">
                            <div className="bg-green-100 text-green-700 px-2 py-1 rounded font-bold text-sm">
                              {hotel.rating_score || 8.5}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{hotel.rating_text || 'Excellent'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          {hotel.amenities?.slice(0, 4).map((amenity, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {amenity === 'Free WiFi' && <Wifi size={12} />}
                              {amenity === 'Pool' && <span>🏊</span>}
                              {amenity === 'Spa' && <span>💆</span>}
                              {amenity}
                            </span>
                          ))}
                        </div>
                        <div className="flex justify-between items-end mt-3">
                          <p className="text-xs text-green-600 font-medium">Fully refundable before check-in</p>
                          <div className="text-right">
                            <p className="text-xs text-gray-400 line-through">AED {(hotel.rooms?.[0]?.original_price || 2000) * nights}</p>
                            <p className="text-lg font-bold text-[#002B5B]">AED {(hotel.rooms?.[0]?.price || 1800) * nights}</p>
                            <p className="text-xs text-gray-500">for {nights} nights</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Hotel Detail View - Using HotelDetailsView Component */
            <HotelDetailsView
              hotel={selectedHotel}
              onBack={() => setViewMode('list')}
              onSelectRoom={(room) => handleSelectHotel(selectedHotel, room)}
              checkIn={checkIn}
              checkOut={checkOut}
              nights={nights}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Day Card Component
function DayCard({ day, date, city, activities, isFirst, isLast, isDeparture, onAddActivity, onRemoveActivity, onChangeHotel, hotel, onSelectArrivalTransfer, onSelectDepartureTransfer, selectedArrivalTransfer, selectedDepartureTransfer }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full px-6 py-4 flex items-center justify-between text-white",
          isDeparture 
            ? "bg-gradient-to-r from-orange-500 to-orange-600" 
            : "bg-gradient-to-r from-[#002B5B] to-[#004080]"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold">
            {day}
          </div>
          <div className="text-left">
            <h3 className="font-bold">{isDeparture ? `${date} - Return Day` : date}</h3>
            <p className={cn("text-sm", isDeparture ? "text-orange-100" : "text-blue-200")}>{city}</p>
          </div>
        </div>
        <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {/* Arrival on Day 1 */}
              {isFirst && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Plane className="text-blue-600" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">Arrival at {city}</p>
                    {selectedArrivalTransfer ? (
                      <div className="mt-1">
                        <p className="text-sm text-green-600 font-medium">{selectedArrivalTransfer.title}</p>
                        <p className="text-xs text-gray-500">
                          {selectedArrivalTransfer.selectedVehicle ? (
                            <>
                              {selectedArrivalTransfer.selectedVehicle === 'sedan_4' && '🚗 4 Seater Sedan'}
                              {selectedArrivalTransfer.selectedVehicle === 'car_7' && '🚙 7 Seater Car'}
                              {selectedArrivalTransfer.selectedVehicle === 'van_8' && '🚐 8 Seater Van'}
                              {selectedArrivalTransfer.selectedVehicle === 'van_17' && '🚐 17 Seater Van'}
                              {selectedArrivalTransfer.selectedVehicle === 'bus_29' && '🚌 29 Seater Bus'}
                              {selectedArrivalTransfer.selectedVehicle === 'bus_45' && '🚌 45 Seater Bus'}
                              {selectedArrivalTransfer.selectedVehicle === 'bus_55' && '🚌 55 Seater Bus'}
                              {' • '}{selectedArrivalTransfer.duration} • {selectedArrivalTransfer.vehiclePrice || selectedArrivalTransfer.price} AED
                            </>
                          ) : (
                            <>{selectedArrivalTransfer.vehicle_type} • {selectedArrivalTransfer.duration} • {selectedArrivalTransfer.price} AED</>
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Transfer from airport to hotel</p>
                    )}
                  </div>
                  <button 
                    onClick={() => onSelectArrivalTransfer && onSelectArrivalTransfer(city)}
                    className="bg-[#002B5B] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#003d82] transition-all flex items-center gap-2"
                    data-testid="select-arrival-transfer"
                  >
                    <Car size={16} />
                    {selectedArrivalTransfer ? 'Change' : 'Select Transfer'}
                  </button>
                </div>
              )}

              {/* Departure Day (Return) */}
              {isDeparture && (
                <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Plane className="text-orange-600 rotate-45" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">Return Flight - Departure from {city}</p>
                    {selectedDepartureTransfer ? (
                      <div className="mt-1">
                        <p className="text-sm text-green-600 font-medium">{selectedDepartureTransfer.title}</p>
                        <p className="text-xs text-gray-500">
                          {selectedDepartureTransfer.selectedVehicle ? (
                            <>
                              {selectedDepartureTransfer.selectedVehicle === 'sedan_4' && '🚗 4 Seater Sedan'}
                              {selectedDepartureTransfer.selectedVehicle === 'car_7' && '🚙 7 Seater Car'}
                              {selectedDepartureTransfer.selectedVehicle === 'van_8' && '🚐 8 Seater Van'}
                              {selectedDepartureTransfer.selectedVehicle === 'van_17' && '🚐 17 Seater Van'}
                              {selectedDepartureTransfer.selectedVehicle === 'bus_29' && '🚌 29 Seater Bus'}
                              {selectedDepartureTransfer.selectedVehicle === 'bus_45' && '🚌 45 Seater Bus'}
                              {selectedDepartureTransfer.selectedVehicle === 'bus_55' && '🚌 55 Seater Bus'}
                              {' • '}{selectedDepartureTransfer.duration} • {selectedDepartureTransfer.vehiclePrice || selectedDepartureTransfer.price} AED
                            </>
                          ) : (
                            <>{selectedDepartureTransfer.vehicle_type} • {selectedDepartureTransfer.duration} • {selectedDepartureTransfer.price} AED</>
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Check-out from hotel & transfer to airport</p>
                    )}
                  </div>
                  <button 
                    onClick={() => onSelectDepartureTransfer && onSelectDepartureTransfer(city)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition-all flex items-center gap-2"
                    data-testid="select-departure-transfer"
                  >
                    <Car size={16} />
                    {selectedDepartureTransfer ? 'Change' : 'Select Transfer'}
                  </button>
                </div>
              )}

              {/* Hotel Stay Reference (only for non-departure days) */}
              {!isDeparture && hotel && (
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                  <img 
                    src={hotel.images?.[0] || 'https://via.placeholder.com/80'} 
                    alt={hotel.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{hotel.name}</p>
                    <p className="text-sm text-gray-500">{hotel.selectedRoom?.name || 'Standard Room'}</p>
                  </div>
                  <Check className="text-green-500" size={20} />
                </div>
              )}
              
              {!isDeparture && !hotel && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Hotel className="text-gray-400" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-500">No Hotel Selected</p>
                    <p className="text-sm text-gray-400">Add a hotel for your stay in {city}</p>
                  </div>
                  <button 
                    onClick={onChangeHotel}
                    className="bg-[#002B5B] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#003d82] transition-all"
                  >
                    Add Hotel
                  </button>
                </div>
              )}

              {/* Meals Section */}
              <div className={`grid ${isFirst ? 'grid-cols-2' : (isDeparture ? 'grid-cols-1' : 'grid-cols-3')} gap-3`}>
                {/* Breakfast - show on all days except first day */}
                {!isFirst && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Sun className="text-yellow-500" size={16} />
                    <span className="text-sm text-gray-600">Breakfast: {hotel || isDeparture ? 'Included' : 'Not included'}</span>
                  </div>
                )}
                {/* Lunch - show on first day and middle days, not departure */}
                {!isDeparture && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Utensils className="text-orange-500" size={16} />
                    <span className="text-sm text-gray-600">Lunch: Not included</span>
                  </div>
                )}
                {/* Dinner - show on first day and middle days, not departure */}
                {!isDeparture && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Moon className="text-purple-500" size={16} />
                    <span className="text-sm text-gray-600">Dinner: Not included</span>
                  </div>
                )}
              </div>

              {/* Activities - show on ALL days */}
              {activities?.length > 0 && (
                <div className="space-y-2">
                  {activities.map((activity, i) => (
                    <div key={activity.id || i} className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100 group">
                      {/* Activity Image */}
                      <img 
                        src={activity.images?.[0] || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=100'}
                        alt={activity.name}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 line-clamp-1">{activity.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-medium">
                            {activity.category || 'Activity'}
                          </span>
                          {activity.transfer_type && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                              {activity.transfer_type}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.start_times?.length > 0 
                            ? `${activity.start_times[0]} • ${activity.duration}`
                            : activity.duration
                          }
                          {activity.languages?.length > 0 && ` • ${activity.languages[0]}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-green-600">AED {activity.price}</span>
                        {onRemoveActivity && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveActivity(activity.id);
                            }}
                            className="ml-2 p-1.5 text-red-500 hover:bg-red-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove activity"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Activity Button - show on ALL days */}
              <button 
                onClick={onAddActivity}
                className="w-full py-3 border-2 border-dashed border-pink-200 rounded-xl text-pink-500 font-medium hover:border-pink-500 hover:bg-pink-50 transition-all flex items-center justify-center gap-2"
                data-testid={`add-activity-day-${day}`}
              >
                <Plus size={18} />
                Add Activity in {city}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  
  // Vehicle selection state for activities
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [pendingActivity, setPendingActivity] = useState(null);
  const [activityVehicles, setActivityVehicles] = useState({}); // { "activityId": vehicleKey }
  
  // Transfer state
  const [availableTransfers, setAvailableTransfers] = useState([]);
  const [selectedArrivalTransfer, setSelectedArrivalTransfer] = useState(null);
  const [selectedDepartureTransfer, setSelectedDepartureTransfer] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferModalType, setTransferModalType] = useState('arrival'); // 'arrival' or 'departure'
  const [transferCity, setTransferCity] = useState(null);
  
  // Vehicle selection state for transfers
  const [showTransferVehicleModal, setShowTransferVehicleModal] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [transferVehicles, setTransferVehicles] = useState({}); // { "transferId": vehicleKey }

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
  const handleChangeHotel = (cityName) => {
    setActiveHotelCity(cityName);
    setChangeRoomHotel(null); // Clear any change room hotel
    setShowHotelOptions(true);
  };

  // Handle Change Room - directly show room options for the selected hotel
  const handleChangeRoom = (cityName) => {
    const currentHotel = selectedHotels[cityName];
    if (currentHotel) {
      setActiveHotelCity(cityName);
      setChangeRoomHotel(currentHotel); // Set the hotel to show room options for
      setShowHotelModal(true);
    }
  };

  const handleViewAllHotels = () => {
    setShowHotelOptions(false);
    setHotelSearchQuery('');
    setChangeRoomHotel(null); // Clear change room hotel when viewing all
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
        days.push({
          day: dayNumber,
          date: formatDate(currentDate),
          city: city.name,
          cityIndex,
          isFirst: dayNumber === 1,
          isLast: false,
          isDeparture: false,
          hotel: selectedHotels[city.name]
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
    const transferTotal = arrivalTransferPrice + departureTransferPrice;
    
    // Calculate activities total using vehicle-based pricing
    let activitiesTotal = 0;
    Object.values(selectedActivities).forEach(dayActivities => {
      dayActivities.forEach(activity => {
        activitiesTotal += getActivityPriceForVehicle(activity);
      });
    });
    
    const adultsCount = data?.room_data?.reduce((acc, r) => acc + r.adults, 0) || 2;
    const childrenCount = data?.room_data?.reduce((acc, r) => acc + r.children?.length, 0) || 0;
    
    const subtotal = hotelTotal + flightPrice + transferTotal + activitiesTotal;
    const pricePerAdult = Math.round(subtotal / adultsCount);
    const pricePerChild = Math.round(pricePerAdult * 0.7); // 30% discount for children

    return {
      hotelTotal,
      flightPrice,
      transferTotal,
      activitiesTotal,
      arrivalTransferPrice,
      departureTransferPrice,
      pricePerAdult,
      pricePerChild,
      adultsCount,
      childrenCount,
      totalPax: adultsCount + childrenCount,
      vehicleType: selectedVehicle,
      total: subtotal
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
      const proposalData = {
        leaving_from: data.leaving_from,
        leaving_from_code: data.leaving_from_code,
        nationality: data.nationality,
        leaving_on: data.leaving_on,
        star_rating: data.star_rating,
        add_transfers: data.add_transfers,
        room_data: data.room_data,
        cities: data.cities,
        selected_flight: selectedFlight,
        selected_hotels: selectedHotels,
        selected_activities: selectedActivities,
        total_price: pricing.total,
        // Vehicle type based on passengers
        vehicle_type: selectedVehicle.key,
        vehicle_label: selectedVehicle.label,
        total_pax: totalPax,
        // New fields from the modal
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

      const response = await api.post('/proposals', proposalData);
      
      // Create full proposal object for the view page
      const savedProposal = {
        id: response.data.id,
        ...proposalData,
        created_at: new Date().toISOString()
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
        city={activeHotelCity}
        checkIn={formatDate(startDate)}
        checkOut={formatDate(new Date(startDate.getTime() + totalNights * 24 * 60 * 60 * 1000))}
        nights={cities.find(c => c.name === activeHotelCity)?.nights || 1}
        onSelect={handleHotelSelect}
        searchQuery={hotelSearchQuery}
        initialHotel={changeRoomHotel}
      />

      {/* Hotel Options Modal (Change Hotel choices) */}
      <HotelOptionsModal
        isOpen={showHotelOptions}
        onClose={() => setShowHotelOptions(false)}
        city={activeHotelCity}
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
              className="relative bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className={cn(
                "px-6 py-4 flex items-center justify-between",
                transferModalType === 'arrival' 
                  ? "bg-gradient-to-r from-[#002B5B] to-[#004080]" 
                  : "bg-gradient-to-r from-orange-500 to-orange-600"
              )}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Car className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {transferModalType === 'arrival' ? 'Select Arrival Transfer' : 'Select Departure Transfer'}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {transferModalType === 'arrival' 
                        ? `Airport to hotel transfer in ${transferCity}`
                        : `Hotel to airport transfer from ${transferCity}`
                      }
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTransferModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Transfer List */}
              <div className="flex-1 overflow-y-auto p-6">
                {availableTransfers.length === 0 ? (
                  <div className="text-center py-12">
                    <Car size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No transfers available for this destination</p>
                    <p className="text-gray-400 text-sm mt-2">Please contact support to arrange transfer</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableTransfers.map((transfer) => (
                      <motion.div
                        key={transfer.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectTransfer(transfer)}
                        className={cn(
                          "p-5 rounded-xl border-2 cursor-pointer transition-all",
                          (transferModalType === 'arrival' && selectedArrivalTransfer?.id === transfer.id) ||
                          (transferModalType === 'departure' && selectedDepartureTransfer?.id === transfer.id)
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-[#002B5B] hover:shadow-md bg-white"
                        )}
                        data-testid={`transfer-option-${transfer.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                              transfer.transfer_type === 'Luxury' ? 'bg-amber-100 text-amber-700' :
                              transfer.transfer_type === 'Shared' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                            )}>
                              {transfer.transfer_type}
                            </span>
                            {transfer.vehicle_type && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                {transfer.vehicle_type}
                              </span>
                            )}
                          </div>
                          {((transferModalType === 'arrival' && selectedArrivalTransfer?.id === transfer.id) ||
                            (transferModalType === 'departure' && selectedDepartureTransfer?.id === transfer.id)) && (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="text-white" size={14} />
                            </div>
                          )}
                        </div>
                        
                        <h4 className="font-bold text-gray-800 text-sm mb-2 line-clamp-2">{transfer.title}</h4>
                        
                        <div className="space-y-1.5 text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-green-500 flex-shrink-0" />
                            <span className="truncate">{transfer.from_location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-red-500 flex-shrink-0" />
                            <span className="truncate">{transfer.to_location}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{transfer.duration}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={12} />
                              <span>{transfer.max_bags || 2} bags</span>
                            </div>
                          </div>
                          <div className="text-lg font-bold text-[#002B5B]">
                            {transfer.price} <span className="text-xs font-normal text-gray-500">AED</span>
                          </div>
                        </div>
                        
                        {transfer.pickup_times && transfer.pickup_times.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-1">Pick-up times:</p>
                            <div className="flex flex-wrap gap-1">
                              {transfer.pickup_times.slice(0, 4).map((time, idx) => (
                                <span key={idx} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                  {time}
                                </span>
                              ))}
                              {transfer.pickup_times.length > 4 && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  +{transfer.pickup_times.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {availableTransfers.length} transfer option{availableTransfers.length !== 1 ? 's' : ''} available
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className={cn(
                      "px-6 py-2 rounded-xl font-bold text-white transition-colors",
                      transferModalType === 'arrival'
                        ? "bg-[#002B5B] hover:bg-[#003d82]"
                        : "bg-orange-500 hover:bg-orange-600"
                    )}
                  >
                    Confirm Selection
                  </button>
                </div>
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
                      <button 
                        onClick={() => setShowFlightSearch(true)}
                        className="text-sm text-[#002B5B] font-medium hover:underline"
                      >
                        Change Flight
                      </button>
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Itinerary</h2>
            
            {/* Hotel Stay Sections for each city */}
            {cities.map((city, cityIndex) => {
              const cityHotel = selectedHotels[city.name];
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
                          {/* Price per night */}
                          <div className="flex items-center gap-2 text-sm mt-2 pt-2 border-t border-gray-100">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-gray-700">
                              Price: <strong className="text-[#002B5B]">AED {(cityHotel.selectedRoom?.price || 0).toLocaleString()}</strong> / night
                              <span className="text-gray-400 ml-2">x {city.nights} nights = </span>
                              <strong className="text-[#002B5B]">AED {((cityHotel.selectedRoom?.price || 0) * city.nights).toLocaleString()}</strong>
                            </span>
                          </div>
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
                            onClick={() => handleChangeRoom(city.name)}
                            className="bg-[#8B4513] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#723a0f] transition-all"
                            data-testid={`change-room-${city.name}`}
                          >
                            Change Room
                          </button>
                          <button 
                            onClick={() => handleChangeHotel(city.name)}
                            className="bg-[#8B4513] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#723a0f] transition-all"
                            data-testid={`change-hotel-${city.name}`}
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
                            <p className="font-medium text-gray-500">{noStayCities[city.name] ? 'No stay required' : 'No Hotel Selected'}</p>
                            <p className="text-sm text-gray-400">Check-in: {formatDate(cityStartDate)} • Check-out: {formatDate(cityEndDate)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleChangeHotel(city.name)}
                          className="bg-[#002B5B] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#003d82] transition-all flex items-center gap-2"
                          data-testid={`add-hotel-${city.name}`}
                        >
                          <Hotel size={18} />
                          {noStayCities[city.name] ? 'Change' : 'Add Hotel'}
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
                  setActiveHotelCity(day.city);
                  setShowHotelModal(true);
                }}
                onSelectArrivalTransfer={(city) => openTransferModal('arrival', city)}
                onSelectDepartureTransfer={(city) => openTransferModal('departure', city)}
                selectedArrivalTransfer={selectedArrivalTransfer}
                selectedDepartureTransfer={selectedDepartureTransfer}
              />
            ))}
          </div>

          {/* Right Column - Trip Summary */}
          <div className="w-96 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 sticky top-32">
              <div className="bg-[#002B5B] text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-bold">Trip Summary</h3>
              </div>
              
              <div className="p-6 space-y-6">
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
                    {Object.entries(selectedHotels).map(([city, hotel]) => (
                      <div key={city} className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-800">{city}</p>
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
                    ))}
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
              </div>
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

      {/* Save Proposal Modal */}
      <AnimatePresence>
        {showSaveProposalModal && (
          <SaveProposalModal
            isOpen={showSaveProposalModal}
            onClose={() => setShowSaveProposalModal(false)}
            onSave={handleSaveProposalWithData}
            tripData={data}
            pricing={pricing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

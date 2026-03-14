import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Users, FileText, Settings, Search, RefreshCw,
  Edit2, Trash2, CheckCircle, XCircle, MapPin, Plane, Building2, X,
  ChevronLeft, ChevronRight, Plus, Save, Car, Clock, DollarSign, Briefcase, Star, Bed,
  Compass, Camera, Utensils, Mountain, Globe, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';
import HotelEditForm from './HotelEditForm';
import ActivityEditForm from './ActivityEditForm';
import TermsPoliciesManager from './TermsPoliciesManager';

export default function AdminDashboard({ onBack, onViewHotel, onUsersView }) {
  const [airports, setAirports] = useState([]);
  const [cities, setCities] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('airports');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state for airports
  const [airportPagination, setAirportPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [airportSearch, setAirportSearch] = useState('');

  // Edit modal states
  const [editModal, setEditModal] = useState({ open: false, type: null, data: null });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Hotel edit form state (separate from generic edit modal)
  const [hotelEditModal, setHotelEditModal] = useState({ open: false, hotel: null, isNew: false });
  
  // Activity edit form state (separate from generic edit modal)
  const [activityEditModal, setActivityEditModal] = useState({ open: false, activity: null, isNew: false });

  // Insurance settings state (country-based)
  const [insurancePrices, setInsurancePrices] = useState([]);
  const [insuranceModal, setInsuranceModal] = useState({ open: false, data: null, isNew: false });
  const [insuranceSaving, setInsuranceSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch airports when page or search changes
  useEffect(() => {
    if (activeTab === 'airports') {
      fetchAirports();
    }
  }, [airportPagination.page, airportSearch, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [citiesRes, hotelsRes, transfersRes, activitiesRes, insuranceRes] = await Promise.all([
        api.get('/cities'),
        api.get('/hotels'),
        api.get('/transfers'),
        api.get('/activities'),
        api.get('/settings/insurance')
      ]);
      setCities(citiesRes.data?.cities || []);
      setHotels(hotelsRes.data?.hotels || []);
      setTransfers(transfersRes.data?.transfers || []);
      setActivities(activitiesRes.data?.activities || []);
      if (insuranceRes.data?.insurance_prices) setInsurancePrices(insuranceRes.data.insurance_prices);
      
      // Fetch airports separately with pagination
      await fetchAirports();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAirports = async () => {
    try {
      const params = new URLSearchParams({
        page: airportPagination.page.toString(),
        limit: airportPagination.limit.toString()
      });
      if (airportSearch) {
        params.append('search', airportSearch);
      }
      const res = await api.get(`/airports?${params.toString()}`);
      setAirports(res.data?.airports || []);
      if (res.data?.pagination) {
        setAirportPagination(prev => ({
          ...prev,
          total: res.data.pagination.total,
          pages: res.data.pagination.pages
        }));
      }
    } catch (error) {
      console.error('Error fetching airports:', error);
    }
  };

  const handleAirportSearch = (value) => {
    setAirportSearch(value);
    setAirportPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
  };

  const handleAirportPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= airportPagination.pages) {
      setAirportPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const filteredCities = cities.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHotels = hotels.filter(h =>
    h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransfers = transfers.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.from_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActivities = activities.filter(a =>
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open edit modal
  const openEditModal = (type, data = null) => {
    setEditModal({ open: true, type, data });
    if (data) {
      setEditForm({ ...data });
    } else {
      // Default values for new items
      if (type === 'airport') setEditForm({ code: '', name: '', city: '', country: '' });
      if (type === 'city') setEditForm({ name: '', country: '' });
      if (type === 'hotel') setEditForm({ 
        name: '', 
        address: '',
        city: '', 
        country: '', 
        star_rating: 4, 
        rating_score: 8.0, 
        description: '',
        check_in_time: '14:00',
        check_out_time: '12:00',
        total_rooms: null,
        amenities: [],
        highlights: [],
        board_types: ['RO', 'BB'],
        cancellation_policy: 'Flexible',
        supplier_name: '',
        supplier_cost_per_night: null
      });
      if (type === 'transfer') setEditForm({ 
        title: '', 
        from_location: '', 
        to_location: '', 
        price: 0, 
        description: '', 
        duration: '1 hrs', 
        confirmation_time: '4 hrs', 
        transfer_type: 'Private', 
        transfer_direction: 'arrival', // 'arrival' or 'departure'
        city: '', 
        is_available: true,
        pickup_times: [],
        max_bags: 2,
        supplier_name: '',
        supplier_cost: 0,
        video: null,
        vehicle_pricing: {
          sedan_4: { selling_price: 0, supplier_cost: 0, max_bags: 2 },
          car_7: { selling_price: 0, supplier_cost: 0, max_bags: 4 },
          van_8: { selling_price: 0, supplier_cost: 0, max_bags: 6 },
          van_17: { selling_price: 0, supplier_cost: 0, max_bags: 12 },
          bus_29: { selling_price: 0, supplier_cost: 0, max_bags: 20 },
          bus_45: { selling_price: 0, supplier_cost: 0, max_bags: 35 },
          bus_55: { selling_price: 0, supplier_cost: 0, max_bags: 45 }
        }
      });
      if (type === 'activity') setEditForm({
        name: '',
        description: '',
        city: '',
        country: '',
        category: 'Sightseeing',
        duration: '4 hours',
        price: 0,
        currency: 'AED',
        images: [],
        highlights: [],
        inclusions: [],
        exclusions: [],
        meeting_point: '',
        start_times: [],
        languages: ['English'],
        min_participants: 1,
        max_participants: 20,
        age_restriction: 'All ages',
        cancellation_policy: 'Free cancellation up to 24 hours',
        supplier_name: '',
        supplier_cost: 0,
        available: true,
        rating: 4.5,
        review_count: 0
      });
    }
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModal({ open: false, type: null, data: null });
    setEditForm({});
  };

  // Generic field change handler - prevents input lag
  const handleFieldChange = useCallback((field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save edited item
  const saveEdit = async () => {
    setSaving(true);
    try {
      const { type, data } = editModal;
      
      if (type === 'proposal') {
        if (data) {
          await api.put(`/proposals/${data.id}`, editForm);
          setProposals(proposals.map(p => p.id === data.id ? { ...p, ...editForm } : p));
        } else {
          const res = await api.post('/proposals', editForm);
          setProposals([...proposals, { id: res.data.id, ...editForm }]);
        }
      } else if (type === 'airport') {
        if (data) {
          await api.put(`/airports/${data.id}`, editForm);
          setAirports(airports.map(a => a.id === data.id ? { ...a, ...editForm } : a));
        } else {
          const res = await api.post('/airports', editForm);
          setAirports([...airports, { id: res.data.id, ...editForm }]);
          setAirportPagination(prev => ({ ...prev, total: prev.total + 1 }));
        }
      } else if (type === 'city') {
        if (data) {
          await api.put(`/cities/${data.id}`, editForm);
          setCities(cities.map(c => c.id === data.id ? { ...c, ...editForm } : c));
        } else {
          const res = await api.post('/cities', editForm);
          setCities([...cities, { id: res.data.id, ...editForm }]);
        }
      } else if (type === 'hotel') {
        if (data) {
          await api.put(`/hotels/${data.id}`, editForm);
          setHotels(hotels.map(h => h.id === data.id ? { ...h, ...editForm } : h));
        } else {
          const res = await api.post('/hotels', editForm);
          setHotels([...hotels, { id: res.data.id, ...editForm }]);
        }
      } else if (type === 'transfer') {
        if (data) {
          await api.put(`/transfers/${data.id}`, editForm);
          setTransfers(transfers.map(t => t.id === data.id ? { ...t, ...editForm } : t));
        } else {
          const res = await api.post('/transfers', editForm);
          setTransfers([...transfers, { id: res.data.id, ...editForm }]);
        }
      } else if (type === 'activity') {
        if (data) {
          await api.put(`/activities/${data.id}`, editForm);
          setActivities(activities.map(a => a.id === data.id ? { ...a, ...editForm } : a));
        } else {
          const res = await api.post('/activities', editForm);
          setActivities([...activities, { id: res.data.id, ...editForm }]);
        }
      }
      
      closeEditModal();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const deleteAirport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this airport?')) return;
    try {
      await api.delete(`/airports/${id}`);
      setAirports(airports.filter(a => a.id !== id));
      setAirportPagination(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (error) {
      console.error('Error deleting airport:', error);
    }
  };

  const deleteCity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this city?')) return;
    try {
      await api.delete(`/cities/${id}`);
      setCities(cities.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting city:', error);
    }
  };

  const deleteHotel = async (id) => {
    if (!window.confirm('Are you sure you want to delete this hotel?')) return;
    try {
      await api.delete(`/hotels/${id}`);
      setHotels(hotels.filter(h => h.id !== id));
    } catch (error) {
      console.error('Error deleting hotel:', error);
    }
  };

  const deleteTransfer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transfer?')) return;
    try {
      await api.delete(`/transfers/${id}`);
      setTransfers(transfers.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transfer:', error);
    }
  };

  const deleteActivity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    try {
      await api.delete(`/activities/${id}`);
      setActivities(activities.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  // Determine modal type and if it's a new item
  const modalType = editModal.type;
  const isNewItem = !editModal.data;

  // Render edit modal content inline
  const renderEditModal = () => {
    if (!editModal.open) return null;
    
    const type = editModal.type;
    const isNew = !editModal.data;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeEditModal}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 w-full max-w-3xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {isNew ? 'Add New' : 'Edit'} {type.charAt(0).toUpperCase() + type.slice(1)}
            </h3>
            <button onClick={closeEditModal} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {type === 'proposal' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Leaving From</label>
                  <input
                    type="text"
                    value={editForm.leaving_from || ''}
                    onChange={(e) => handleFieldChange('leaving_from', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-proposal-leaving-from"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={editForm.nationality || ''}
                    onChange={(e) => handleFieldChange('nationality', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-proposal-nationality"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Leaving On</label>
                  <input
                    type="date"
                    value={editForm.leaving_on || ''}
                    onChange={(e) => handleFieldChange('leaving_on', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-proposal-leaving-on"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Star Rating</label>
                    <select
                      value={editForm.star_rating || 3}
                      onChange={(e) => handleFieldChange('star_rating', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-proposal-star-rating"
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Star</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Status</label>
                    <select
                      value={editForm.status || 'pending'}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-proposal-status"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {type === 'airport' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">IATA Code</label>
                  <input
                    type="text"
                    value={editForm.code || ''}
                    onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                    maxLength={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent uppercase"
                    data-testid="edit-airport-code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Airport Name</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-airport-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-airport-city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                  <input
                    type="text"
                    value={editForm.country || ''}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-airport-country"
                  />
                </div>
              </>
            )}

            {type === 'city' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">City Name</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-city-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                  <input
                    type="text"
                    value={editForm.country || ''}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-city-country"
                  />
                </div>
              </>
            )}

            {type === 'hotel' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Hotel Name</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Address</label>
                  <input
                    type="text"
                    value={editForm.address || ''}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="Full hotel address"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                    <input
                      type="text"
                      value={editForm.country || ''}
                      onChange={(e) => handleFieldChange('country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-country"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Star Rating</label>
                    <select
                      value={editForm.star_rating || 4}
                      onChange={(e) => handleFieldChange('star_rating', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-star-rating"
                    >
                      {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} Star</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Rating Score</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.rating_score || 8.0}
                      onChange={(e) => handleFieldChange('rating_score', parseFloat(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-rating-score"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Total Rooms</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.total_rooms || ''}
                      onChange={(e) => handleFieldChange('total_rooms', parseInt(e.target.value) || null)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-total-rooms"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Check-in Time</label>
                    <input
                      type="time"
                      value={editForm.check_in_time || '14:00'}
                      onChange={(e) => handleFieldChange('check_in_time', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-checkin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Check-out Time</label>
                    <input
                      type="time"
                      value={editForm.check_out_time || '12:00'}
                      onChange={(e) => handleFieldChange('check_out_time', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-checkout"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Board Types Available</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['RO', 'BB', 'HB', 'FB'].map((board) => (
                      <label key={board} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={(editForm.board_types || []).includes(board)}
                          onChange={(e) => {
                            const current = editForm.board_types || [];
                            if (e.target.checked) {
                              handleFieldChange('board_types', [...current, board]);
                            } else {
                              handleFieldChange('board_types', current.filter(b => b !== board));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {board === 'RO' ? 'Room Only' : board === 'BB' ? 'B&B' : board === 'HB' ? 'Half Board' : 'Full Board'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Amenities (comma-separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(editForm.amenities) ? editForm.amenities.join(', ') : (editForm.amenities || '')}
                    onChange={(e) => handleFieldChange('amenities', e.target.value.split(',').map(a => a.trim()).filter(a => a))}
                    placeholder="e.g., Free WiFi, Pool, Spa, Gym, Restaurant"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-amenities"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Highlights (comma-separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(editForm.highlights) ? editForm.highlights.join(', ') : (editForm.highlights || '')}
                    onChange={(e) => handleFieldChange('highlights', e.target.value.split(',').map(h => h.trim()).filter(h => h))}
                    placeholder="e.g., Walking distance to metro, Free parking"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-highlights"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Cancellation Policy</label>
                  <select
                    value={editForm.cancellation_policy || 'Flexible'}
                    onChange={(e) => handleFieldChange('cancellation_policy', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-cancellation"
                  >
                    <option value="Flexible">Flexible - Free cancellation</option>
                    <option value="Moderate">Moderate - Free cancellation until 3 days before</option>
                    <option value="Strict">Strict - Free cancellation until 7 days before</option>
                    <option value="Non-refundable">Non-refundable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none"
                    data-testid="edit-hotel-description"
                  />
                </div>
                
                {/* Supplier Information */}
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Building2 size={16} className="text-purple-500" />
                    Supplier Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">Supplier Name</label>
                      <input
                        type="text"
                        value={editForm.supplier_name || ''}
                        onChange={(e) => handleFieldChange('supplier_name', e.target.value)}
                        placeholder="e.g., Marriott Hotels"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                        data-testid="edit-hotel-supplier-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">Supplier Cost/Night (AED)</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.supplier_cost_per_night || ''}
                        onChange={(e) => handleFieldChange('supplier_cost_per_night', parseFloat(e.target.value) || null)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                        data-testid="edit-hotel-supplier-cost"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {type === 'transfer' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="e.g., Private from Dubai International Airport"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-transfer-title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">From Location</label>
                    <input
                      type="text"
                      value={editForm.from_location || ''}
                      onChange={(e) => handleFieldChange('from_location', e.target.value)}
                      placeholder="Airport or hotel name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-from"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">To Location</label>
                    <input
                      type="text"
                      value={editForm.to_location || ''}
                      onChange={(e) => handleFieldChange('to_location', e.target.value)}
                      placeholder="Hotel or destination"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-to"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-city"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Transfer Type</label>
                    <select
                      value={editForm.transfer_type || 'Private'}
                      onChange={(e) => handleFieldChange('transfer_type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-type"
                    >
                      <option value="Private">Private</option>
                      <option value="Shared">Shared</option>
                      <option value="Luxury">Luxury</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Transfer Direction</label>
                    <select
                      value={editForm.transfer_direction || 'arrival'}
                      onChange={(e) => handleFieldChange('transfer_direction', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-direction"
                    >
                      <option value="arrival">Arrival (Airport → Hotel)</option>
                      <option value="departure">Departure (Hotel → Airport)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Duration</label>
                    <input
                      type="text"
                      value={editForm.duration || ''}
                      onChange={(e) => handleFieldChange('duration', e.target.value)}
                      placeholder="e.g., 1 hrs"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-duration"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Confirmation Time</label>
                    <input
                      type="text"
                      value={editForm.confirmation_time || ''}
                      onChange={(e) => handleFieldChange('confirmation_time', e.target.value)}
                      placeholder="e.g., 4 hrs"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-confirmation"
                    />
                  </div>
                </div>
                
                {/* Vehicle-Based Pricing Section */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                      <Car size={18} className="text-blue-600" />
                      Vehicle-Based Pricing (AED)
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">Set selling price and supplier cost for each vehicle type</p>
                  </div>
                  
                  <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                    {[
                      { key: 'sedan_4', label: '4 Seater Sedan', icon: '🚗', pax: '1-4 pax' },
                      { key: 'car_7', label: '7 Seater Car', icon: '🚙', pax: '3-7 pax', optional: true },
                      { key: 'van_8', label: '8 Seater Van', icon: '🚐', pax: '5-8 pax', optional: true },
                      { key: 'van_17', label: '17 Seater Van', icon: '🚐', pax: '9-17 pax' },
                      { key: 'bus_29', label: '29 Seater Bus', icon: '🚌', pax: '18-29 pax' },
                      { key: 'bus_45', label: '45 Seater Bus', icon: '🚌', pax: '30-45 pax' },
                      { key: 'bus_55', label: '55 Seater Bus', icon: '🚌', pax: '46-55 pax' }
                    ].map(vehicle => {
                      const vp = editForm.vehicle_pricing || {};
                      const pricing = vp[vehicle.key] || { selling_price: 0, supplier_cost: 0, max_bags: 0 };
                      const margin = (pricing.selling_price || 0) - (pricing.supplier_cost || 0);
                      const marginPercent = pricing.selling_price > 0 ? (margin / pricing.selling_price * 100) : 0;
                      
                      return (
                        <div key={vehicle.key} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-44 flex items-center gap-2 flex-shrink-0">
                              <span className="text-lg">{vehicle.icon}</span>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium text-gray-700">{vehicle.label}</span>
                                  {vehicle.optional && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Optional</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">{vehicle.pax}</span>
                              </div>
                            </div>
                            
                            <div className="flex-1 grid grid-cols-4 gap-4">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Selling Price</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={pricing.selling_price || ''}
                                  onChange={(e) => {
                                    const newPricing = { ...editForm.vehicle_pricing };
                                    newPricing[vehicle.key] = {
                                      ...newPricing[vehicle.key],
                                      selling_price: parseFloat(e.target.value) || 0
                                    };
                                    handleFieldChange('vehicle_pricing', newPricing);
                                  }}
                                  placeholder="0"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Supplier Cost</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={pricing.supplier_cost || ''}
                                  onChange={(e) => {
                                    const newPricing = { ...editForm.vehicle_pricing };
                                    newPricing[vehicle.key] = {
                                      ...newPricing[vehicle.key],
                                      supplier_cost: parseFloat(e.target.value) || 0
                                    };
                                    handleFieldChange('vehicle_pricing', newPricing);
                                  }}
                                  placeholder="0"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Max Bags</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={pricing.max_bags || ''}
                                  onChange={(e) => {
                                    const newPricing = { ...editForm.vehicle_pricing };
                                    newPricing[vehicle.key] = {
                                      ...newPricing[vehicle.key],
                                      max_bags: parseInt(e.target.value) || 0
                                    };
                                    handleFieldChange('vehicle_pricing', newPricing);
                                  }}
                                  placeholder="0"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Margin</label>
                                <div className={`px-3 py-2 rounded-lg text-sm font-medium ${margin > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                                  {margin > 0 ? (
                                    <>
                                      {margin.toFixed(0)}
                                      <span className="text-xs ml-1">({marginPercent.toFixed(0)}%)</span>
                                    </>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Max Bags</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={editForm.max_bags || 2}
                      onChange={(e) => handleFieldChange('max_bags', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-max-bags"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={editForm.supplier_name || ''}
                      onChange={(e) => handleFieldChange('supplier_name', e.target.value)}
                      placeholder="Enter supplier name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-supplier-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Pick-up Times (comma-separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(editForm.pickup_times) ? editForm.pickup_times.join(', ') : (editForm.pickup_times || '')}
                    onChange={(e) => handleFieldChange('pickup_times', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                    placeholder="e.g., 06:00, 09:00, 12:00, 15:00, 18:00, 21:00"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-transfer-pickup-times"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={2}
                    placeholder="Transfer details and what's included..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none"
                    data-testid="edit-transfer-description"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_available !== false}
                    onChange={(e) => handleFieldChange('is_available', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#002B5B] focus:ring-[#002B5B]"
                    data-testid="edit-transfer-available"
                  />
                  <label className="text-sm font-bold text-gray-600">Transfer Available</label>
                </div>
                
                {/* Video Section */}
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Destination Video
                  </h4>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Video URL (YouTube or direct link)</label>
                    <input
                      type="text"
                      value={editForm.video || ''}
                      onChange={(e) => handleFieldChange('video', e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or direct video URL"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-video"
                    />
                    <p className="text-xs text-gray-400 mt-1">This video will appear on the proposal page for days with this transfer</p>
                  </div>
                  {editForm.video && editForm.video.includes('youtube') && (
                    <div className="mt-2 aspect-video bg-gray-900 rounded-lg overflow-hidden max-w-sm">
                      <iframe
                        src={`https://www.youtube.com/embed/${editForm.video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/)?.[1]}`}
                        title="Preview"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={closeEditModal}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-[#002B5B] text-white rounded-xl font-bold hover:bg-[#003d82] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="save-edit-button"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  {isNewItem ? 'Create' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans text-[#1A1A1A]" data-testid="admin-dashboard">
      {renderEditModal()}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header with User Management Button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={onUsersView}
            data-testid="user-management-button"
            className="flex items-center gap-2 px-6 py-3 bg-[#002B5B] text-white rounded-xl font-bold hover:bg-[#003d82] transition-colors shadow-lg"
          >
            <Users size={20} />
            User Management
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {[
            { label: 'Airports in DB', value: airportPagination.total || airports.length, icon: Plane, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Cities in DB', value: cities.length, icon: MapPin, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Hotels in DB', value: hotels.length, icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Transfers in DB', value: transfers.length, icon: Car, color: 'text-teal-600', bg: 'bg-teal-50' },
            { label: 'Activities in DB', value: activities.length, icon: Compass, color: 'text-pink-600', bg: 'bg-pink-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm" data-testid={`stat-${i}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-xl", stat.bg)}>
                  <stat.icon className={stat.color} size={24} />
                </div>
                <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded">Active</span>
              </div>
              <div className="text-2xl font-black text-gray-800">{stat.value}</div>
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {['airports', 'cities', 'hotels', 'transfers', 'activities', 'terms', 'insurance'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                data-testid={`tab-${tab}`}
                className={cn(
                  "px-8 py-5 font-bold text-sm transition-all relative capitalize whitespace-nowrap",
                  activeTab === tab ? "text-[#002B5B]" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {tab === 'terms' ? 'Terms & Policies' : tab === 'insurance' ? 'Insurance' : `${tab} Management`}
                {activeTab === tab && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#002B5B]" />}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Search and Refresh */}
            <div className="flex justify-between items-center mb-8">
              <div className="relative w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="search-input"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                />
              </div>
              <button 
                onClick={fetchData}
                data-testid="refresh-button"
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-sm font-bold transition-colors"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Refresh Data
              </button>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'airports' && (
              <div>
                {/* Airport-specific search and Add button */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="relative w-full max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by name, code, city or country..."
                        value={airportSearch}
                        onChange={(e) => handleAirportSearch(e.target.value)}
                        data-testid="airport-search-input"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Showing {airports.length} of {airportPagination.total} airports
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal('airport')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-airport-button"
                  >
                    <Plus size={18} />
                    Add Airport
                  </button>
                </div>

                {/* Airports Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {airports.map((airport, i) => (
                    <div key={airport.id || i} className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all group" data-testid={`airport-card-${airport.code}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="font-bold text-purple-600 text-sm">{airport.code}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-800 text-sm truncate">{airport.name}</div>
                            <div className="text-xs text-gray-500">{airport.city}, {airport.country}</div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button 
                            onClick={() => openEditModal('airport', airport)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            data-testid={`edit-airport-${airport.code}`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => deleteAirport(airport.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            data-testid={`delete-airport-${airport.code}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {airportPagination.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6" data-testid="airport-pagination">
                    <button
                      onClick={() => handleAirportPageChange(airportPagination.page - 1)}
                      disabled={airportPagination.page === 1}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        airportPagination.page === 1 
                          ? "text-gray-300 cursor-not-allowed" 
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                      data-testid="airport-prev-page"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, airportPagination.pages) }, (_, i) => {
                        let pageNum;
                        if (airportPagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (airportPagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (airportPagination.page >= airportPagination.pages - 2) {
                          pageNum = airportPagination.pages - 4 + i;
                        } else {
                          pageNum = airportPagination.page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handleAirportPageChange(pageNum)}
                            className={cn(
                              "w-10 h-10 rounded-lg text-sm font-bold transition-colors",
                              pageNum === airportPagination.page
                                ? "bg-[#002B5B] text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            )}
                            data-testid={`airport-page-${pageNum}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handleAirportPageChange(airportPagination.page + 1)}
                      disabled={airportPagination.page === airportPagination.pages}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        airportPagination.page === airportPagination.pages 
                          ? "text-gray-300 cursor-not-allowed" 
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                      data-testid="airport-next-page"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'cities' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => openEditModal('city')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-city-button"
                  >
                    <Plus size={18} />
                    Add City
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {filteredCities.map((city, i) => (
                    <div key={city.id || i} className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MapPin className="text-green-500" size={20} />
                          <div>
                            <div className="font-bold text-gray-800">{city.name}</div>
                            <div className="text-xs text-gray-500">{city.country}</div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal('city', city)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            data-testid={`edit-city-${city.id}`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => deleteCity(city.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            data-testid={`delete-city-${city.id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'hotels' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setHotelEditModal({ open: true, hotel: null, isNew: true })}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-hotel-button"
                  >
                    <Plus size={18} />
                    Add Hotel
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredHotels.map((hotel, i) => (
                    <div 
                      key={hotel.id || i} 
                      className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg transition-all group"
                    >
                      <div className="flex gap-4">
                        {/* Hotel Image */}
                        <div className="relative">
                          <img 
                            src={hotel.images?.[0] || 'https://via.placeholder.com/120x100?text=No+Image'} 
                            alt={hotel.name}
                            className="w-28 h-24 rounded-lg object-cover cursor-pointer"
                            onClick={() => onViewHotel && onViewHotel(hotel)}
                          />
                          {hotel.images?.length > 1 && (
                            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                              +{hotel.images.length - 1}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="cursor-pointer" onClick={() => onViewHotel && onViewHotel(hotel)}>
                              <div className="font-bold text-gray-800 truncate">{hotel.name}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {Array.from({ length: hotel.star_rating || 4 }).map((_, j) => (
                                  <Star key={j} size={12} className="fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{hotel.city}, {hotel.country}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="bg-[#002B5B] text-white px-2 py-1 rounded font-bold text-sm">
                                {hotel.rating_score || 8.0}
                              </div>
                            </div>
                          </div>
                          
                          {/* Room Types & Rate Plans Count */}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Bed size={12} />
                              {hotel.room_types?.length || hotel.rooms?.length || 0} room types
                            </span>
                            {hotel.amenities?.length > 0 && (
                              <span className="truncate">
                                {hotel.amenities.slice(0, 3).join(', ')}
                              </span>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setHotelEditModal({ open: true, hotel, isNew: false }); 
                              }}
                              className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                              data-testid={`edit-hotel-${hotel.id}`}
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteHotel(hotel.id); }}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                              data-testid={`delete-hotel-${hotel.id}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredHotels.length === 0 && (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Building2 size={48} />
                      <span className="font-bold">No hotels found</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transfers' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => openEditModal('transfer')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-transfer-button"
                  >
                    <Plus size={18} />
                    Add Transfer
                  </button>
                </div>
                
                {loading ? (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-[#002B5B] border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold text-gray-400">Loading transfers...</span>
                    </div>
                  </div>
                ) : filteredTransfers.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Car size={48} />
                      <span className="font-bold">No transfers found</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTransfers.map((transfer, i) => (
                      <div 
                        key={transfer.id || i} 
                        className="bg-gray-50 p-5 rounded-xl border border-gray-100 hover:shadow-md transition-all group"
                        data-testid={`transfer-card-${transfer.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              transfer.transfer_type === 'Luxury' ? 'bg-amber-100' :
                              transfer.transfer_type === 'Shared' ? 'bg-blue-100' : 'bg-teal-100'
                            }`}>
                              <Car className={`${
                                transfer.transfer_type === 'Luxury' ? 'text-amber-600' :
                                transfer.transfer_type === 'Shared' ? 'text-blue-600' : 'text-teal-600'
                              }`} size={20} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                transfer.transfer_type === 'Luxury' ? 'bg-amber-100 text-amber-700' :
                                transfer.transfer_type === 'Shared' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                              }`}>
                                {transfer.transfer_type}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                transfer.transfer_direction === 'departure' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {transfer.transfer_direction === 'departure' ? '✈️ Departure' : '🛬 Arrival'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEditModal('transfer', transfer)}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                              data-testid={`edit-transfer-${transfer.id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => deleteTransfer(transfer.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                              data-testid={`delete-transfer-${transfer.id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        
                        <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-1">{transfer.title}</h3>
                        
                        <div className="space-y-2 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-green-500 flex-shrink-0" />
                            <span className="truncate">{transfer.from_location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-red-500 flex-shrink-0" />
                            <span className="truncate">{transfer.to_location}</span>
                          </div>
                        </div>
                        
                        {/* Vehicle Info Row */}
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1" title="Max Bags">
                            <Briefcase size={12} />
                            <span>{transfer.max_bags || 2} bags</span>
                          </div>
                          {transfer.pickup_times && transfer.pickup_times.length > 0 && (
                            <div className="flex items-center gap-1" title="Pick-up Times">
                              <Clock size={12} />
                              <span>{transfer.pickup_times.length} times</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Pickup Times Display */}
                        {transfer.pickup_times && transfer.pickup_times.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {transfer.pickup_times.slice(0, 4).map((time, idx) => (
                              <span key={idx} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                {time}
                              </span>
                            ))}
                            {transfer.pickup_times.length > 4 && (
                              <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                                +{transfer.pickup_times.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={12} />
                              <span>{transfer.duration}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin size={12} />
                              <span>{transfer.city}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} className="text-green-600" />
                            <span className="font-bold text-green-600">{transfer.price} AED</span>
                          </div>
                        </div>
                        
                        {/* Supplier Info (Admin only) */}
                        {transfer.supplier_name && (
                          <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-purple-600">
                              <Building2 size={12} />
                              <span className="font-medium">{transfer.supplier_name}</span>
                            </div>
                            {transfer.supplier_cost > 0 && (
                              <span className="text-gray-500">
                                Cost: <span className="font-medium">{transfer.supplier_cost} AED</span>
                                {transfer.price > transfer.supplier_cost && (
                                  <span className="text-green-600 ml-1">
                                    (+{(transfer.price - transfer.supplier_cost).toFixed(0)})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {!transfer.is_available && (
                          <div className="mt-2 px-2 py-1 bg-red-50 rounded text-xs text-red-600 font-bold text-center">
                            Unavailable
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activities Tab */}
            {activeTab === 'activities' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setActivityEditModal({ open: true, activity: null, isNew: true })}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-activity-button"
                  >
                    <Plus size={18} />
                    Add Activity
                  </button>
                </div>
                {filteredActivities.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Compass size={48} />
                      <span className="font-bold">No activities found</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredActivities.map((activity) => (
                      <div 
                        key={activity.id} 
                        className={cn(
                          "bg-white p-5 rounded-xl border hover:shadow-lg transition-all group",
                          activity.available === false ? "border-red-200 opacity-75" : "border-gray-200"
                        )}
                      >
                        {/* Activity Image */}
                        <div className="relative mb-4">
                          <img 
                            src={activity.images?.[0] || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400'} 
                            alt={activity.name}
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                            <span className="bg-pink-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                              {activity.category || 'Activity'}
                            </span>
                            {activity.transfer_type && (
                              <span className="bg-blue-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                                {activity.transfer_type}
                              </span>
                            )}
                            {activity.available === false && (
                              <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                                UNAVAILABLE
                              </span>
                            )}
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setActivityEditModal({ open: true, activity, isNew: false })}
                              className="p-2 bg-white/90 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors shadow"
                              data-testid={`edit-activity-${activity.id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => deleteActivity(activity.id)}
                              className="p-2 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg transition-colors shadow"
                              data-testid={`delete-activity-${activity.id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Activity Info */}
                        <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{activity.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <MapPin size={12} />
                          <span>{activity.city}, {activity.country}</span>
                        </div>
                        
                        {/* Timing Info */}
                        {activity.start_times && activity.start_times.length > 0 && (
                          <div className="text-xs text-blue-600 mb-2">
                            <Clock size={10} className="inline mr-1" />
                            Starts at {activity.start_times.join(', ')} ({activity.duration})
                          </div>
                        )}
                        
                        {/* Closed Days */}
                        {activity.closed_days && activity.closed_days.length > 0 && (
                          <div className="text-xs text-red-500 mb-2">
                            Closed on {activity.closed_days.join(', ')}
                          </div>
                        )}
                        
                        {/* Languages */}
                        {activity.languages && activity.languages.length > 0 && (
                          <div className="text-xs text-gray-500 mb-2">
                            <Globe size={10} className="inline mr-1" />
                            {activity.languages.join(', ')}
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{activity.description}</p>
                        
                        {/* Activity Details */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                            <Clock size={12} />
                            <span>{activity.duration}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                            <Users size={12} />
                            <span>{activity.min_participants}-{activity.max_participants}</span>
                          </div>
                          {activity.rating && (
                            <div className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                              <Star size={12} className="fill-yellow-400" />
                              <span>{activity.rating}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Inclusions Preview */}
                        {activity.inclusions && activity.inclusions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {activity.inclusions.slice(0, 3).map((inc, idx) => (
                              <span key={idx} className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded font-medium">
                                {inc}
                              </span>
                            ))}
                            {activity.inclusions.length > 3 && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                +{activity.inclusions.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Price & Supplier */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-1">
                            <DollarSign size={16} className="text-green-600" />
                            <span className="font-bold text-green-600 text-lg">{activity.price}</span>
                            <span className="text-xs text-gray-500">{activity.currency}</span>
                          </div>
                          {activity.supplier_name && (
                            <div className="text-xs text-purple-600">
                              {activity.supplier_name}
                            </div>
                          )}
                        </div>
                        
                        {/* Supplier Cost (Admin view) */}
                        {activity.supplier_cost > 0 && (
                          <div className="mt-2 text-xs text-gray-500 flex justify-between">
                            <span>Supplier Cost: {activity.supplier_cost} {activity.currency}</span>
                            {activity.price > activity.supplier_cost && (
                              <span className="text-green-600 font-medium">
                                Margin: +{(activity.price - activity.supplier_cost).toFixed(0)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Terms & Policies Tab */}
            {activeTab === 'terms' && (
              <TermsPoliciesManager />
            )}

            {activeTab === 'insurance' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6" data-testid="insurance-management">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Shield size={24} className="text-[#002B5B]" />
                    <h2 className="text-xl font-bold text-[#002B5B]">Country-Based Insurance Pricing</h2>
                  </div>
                  <button
                    onClick={() => setInsuranceModal({ open: true, data: { country: '', price_per_person: 50, currency: 'AED', min_coverage: 50000, max_age: 60, description: '' }, isNew: true })}
                    className="px-4 py-2 bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d] transition-colors font-medium flex items-center gap-2 text-sm"
                    data-testid="add-insurance-price-btn"
                  >
                    <Plus size={16} /> Add Country Price
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-4">Set different insurance prices per country. The "Default" entry is used as fallback for countries without a specific price.</p>

                {/* Insurance Prices Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="insurance-prices-table">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="py-3 px-4 font-semibold text-gray-600">Country</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Price/Person</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Currency</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Min Coverage</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Max Age</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Description</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insurancePrices.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors" data-testid={`insurance-row-${entry.country}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Globe size={14} className="text-gray-400" />
                              <span className="font-medium text-gray-800">{entry.country}</span>
                              {entry.country === 'Default' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Fallback</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#002B5B]">{entry.price_per_person}</td>
                          <td className="py-3 px-4 text-gray-600">{entry.currency}</td>
                          <td className="py-3 px-4 text-gray-600">${(entry.min_coverage || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-gray-600">{entry.max_age} yrs</td>
                          <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate">{entry.description || '-'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setInsuranceModal({ open: true, data: { ...entry }, isNew: false })}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                data-testid={`edit-insurance-${entry.country}`}
                              >
                                <Edit2 size={15} />
                              </button>
                              {entry.country !== 'Default' && (
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Delete insurance pricing for "${entry.country}"?`)) return;
                                    try {
                                      await api.delete(`/settings/insurance/${entry.id}`);
                                      setInsurancePrices(prev => prev.filter(p => p.id !== entry.id));
                                    } catch (err) {
                                      alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
                                    }
                                  }}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  data-testid={`delete-insurance-${entry.country}`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {insurancePrices.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-gray-400">No insurance prices configured</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Insurance Add/Edit Modal */}
                <AnimatePresence>
                  {insuranceModal.open && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setInsuranceModal({ open: false, data: null, isNew: false })}>
                      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" data-testid="insurance-modal">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-lg font-bold text-[#002B5B]">{insuranceModal.isNew ? 'Add Country Price' : `Edit: ${insuranceModal.data?.country}`}</h3>
                          <button onClick={() => setInsuranceModal({ open: false, data: null, isNew: false })} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                            {insuranceModal.isNew ? (
                              <select
                                value={insuranceModal.data?.country || ''}
                                onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, country: e.target.value } }))}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm"
                                data-testid="insurance-country-select"
                              >
                                <option value="">Select Country...</option>
                                <option value="Default">Default (Fallback)</option>
                                {["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Samoa","San Marino","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"]
                                  .filter(c => !insurancePrices.some(p => p.country === c))
                                  .map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            ) : (
                              <input type="text" value={insuranceModal.data?.country || ''} disabled className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500" />
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Person</label>
                              <input type="number" value={insuranceModal.data?.price_per_person || ''} onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, price_per_person: parseFloat(e.target.value) || 0 } }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" data-testid="insurance-price-input" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                              <select value={insuranceModal.data?.currency || 'AED'} onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, currency: e.target.value } }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm" data-testid="insurance-currency-select">
                                <option value="AED">AED</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="INR">INR</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Min Coverage ($)</label>
                              <input type="number" value={insuranceModal.data?.min_coverage || ''} onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, min_coverage: parseInt(e.target.value) || 0 } }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" data-testid="insurance-coverage-input" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Max Age</label>
                              <input type="number" value={insuranceModal.data?.max_age || ''} onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, max_age: parseInt(e.target.value) || 0 } }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" data-testid="insurance-age-input" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea value={insuranceModal.data?.description || ''} onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, description: e.target.value } }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm h-20 resize-none" placeholder="Insurance description..." data-testid="insurance-description-input" />
                          </div>
                          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                            <button onClick={() => setInsuranceModal({ open: false, data: null, isNew: false })} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 text-sm hover:bg-gray-50">Cancel</button>
                            <button
                              onClick={async () => {
                                setInsuranceSaving(true);
                                try {
                                  if (insuranceModal.isNew) {
                                    const res = await api.post('/settings/insurance', insuranceModal.data);
                                    setInsurancePrices(prev => [...prev, res.data].sort((a, b) => a.country === 'Default' ? -1 : b.country === 'Default' ? 1 : a.country.localeCompare(b.country)));
                                  } else {
                                    const res = await api.put(`/settings/insurance/${insuranceModal.data.id}`, insuranceModal.data);
                                    setInsurancePrices(prev => prev.map(p => p.id === res.data.id ? res.data : p));
                                  }
                                  setInsuranceModal({ open: false, data: null, isNew: false });
                                } catch (err) {
                                  alert('Failed to save: ' + (err.response?.data?.detail || err.message));
                                } finally {
                                  setInsuranceSaving(false);
                                }
                              }}
                              disabled={insuranceSaving || (insuranceModal.isNew && !insuranceModal.data?.country)}
                              className="px-5 py-2 bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d] transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                              data-testid="insurance-save-btn"
                            >
                              <Save size={15} />
                              {insuranceSaving ? 'Saving...' : insuranceModal.isNew ? 'Add Price' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Hotel Edit Form Modal */}
      <AnimatePresence>
        {hotelEditModal.open && (
          <HotelEditForm
            hotel={hotelEditModal.hotel}
            isNew={hotelEditModal.isNew}
            onClose={() => setHotelEditModal({ open: false, hotel: null, isNew: false })}
            onSave={async (hotelData) => {
              try {
                if (hotelEditModal.isNew) {
                  const res = await api.post('/hotels', hotelData);
                  setHotels([...hotels, { id: res.data.id, ...hotelData }]);
                } else {
                  await api.put(`/hotels/${hotelEditModal.hotel.id}`, hotelData);
                  setHotels(hotels.map(h => h.id === hotelEditModal.hotel.id ? { ...h, ...hotelData } : h));
                }
                setHotelEditModal({ open: false, hotel: null, isNew: false });
              } catch (error) {
                console.error('Error saving hotel:', error);
                throw error;
              }
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Activity Edit Form Modal */}
      <AnimatePresence>
        {activityEditModal.open && (
          <ActivityEditForm
            activity={activityEditModal.activity}
            isNew={activityEditModal.isNew}
            onClose={() => setActivityEditModal({ open: false, activity: null, isNew: false })}
            onSave={async (activityData) => {
              try {
                if (activityEditModal.isNew) {
                  const res = await api.post('/activities', activityData);
                  setActivities([...activities, { id: res.data.id, ...activityData }]);
                } else {
                  await api.put(`/activities/${activityEditModal.activity.id}`, activityData);
                  setActivities(activities.map(a => a.id === activityEditModal.activity.id ? { ...a, ...activityData } : a));
                }
                setActivityEditModal({ open: false, activity: null, isNew: false });
              } catch (error) {
                console.error('Error saving activity:', error);
                throw error;
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

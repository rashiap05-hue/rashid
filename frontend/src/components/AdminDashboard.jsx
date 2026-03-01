import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Users, FileText, Settings, Search, RefreshCw,
  Edit2, Trash2, CheckCircle, XCircle, MapPin, Plane, Building2, X,
  ChevronLeft, ChevronRight, Plus, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

export default function AdminDashboard({ onBack, onViewHotel, onUsersView }) {
  const [proposals, setProposals] = useState([]);
  const [airports, setAirports] = useState([]);
  const [cities, setCities] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('proposals');
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
      const [proposalsRes, citiesRes, hotelsRes] = await Promise.all([
        api.get('/proposals'),
        api.get('/cities'),
        api.get('/hotels')
      ]);
      // Handle proposals response (returns array directly)
      setProposals(Array.isArray(proposalsRes.data) ? proposalsRes.data : []);
      setCities(citiesRes.data?.cities || []);
      setHotels(hotelsRes.data?.hotels || []);
      
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

  const filteredProposals = proposals.filter(p => 
    p.leaving_from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nationality?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCities = cities.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHotels = hotels.filter(h =>
    h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteProposal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this proposal?')) return;
    try {
      await api.delete(`/proposals/${id}`);
      setProposals(proposals.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting proposal:', error);
    }
  };

  // Open edit modal
  const openEditModal = (type, data = null) => {
    setEditModal({ open: true, type, data });
    if (data) {
      setEditForm({ ...data });
    } else {
      // Default values for new items
      if (type === 'proposal') setEditForm({ leaving_from: '', nationality: '', leaving_on: '', star_rating: 3, status: 'pending' });
      if (type === 'airport') setEditForm({ code: '', name: '', city: '', country: '' });
      if (type === 'city') setEditForm({ name: '', country: '' });
      if (type === 'hotel') setEditForm({ name: '', city: '', country: '', star_rating: 4, rating_score: 8.0, description: '' });
    }
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModal({ open: false, type: null, data: null });
    setEditForm({});
  };

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

  // Edit Modal Component
  const EditModal = () => {
    if (!editModal.open) return null;
    
    const { type, data } = editModal;
    const isNew = !data;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeEditModal}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
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
                    onChange={(e) => setEditForm({ ...editForm, leaving_from: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-proposal-leaving-from"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={editForm.nationality || ''}
                    onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-proposal-nationality"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Leaving On</label>
                  <input
                    type="date"
                    value={editForm.leaving_on || ''}
                    onChange={(e) => setEditForm({ ...editForm, leaving_on: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-proposal-leaving-on"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Star Rating</label>
                    <select
                      value={editForm.star_rating || 3}
                      onChange={(e) => setEditForm({ ...editForm, star_rating: parseInt(e.target.value) })}
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
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
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
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
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
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-airport-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-airport-city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                  <input
                    type="text"
                    value={editForm.country || ''}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
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
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-city-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                  <input
                    type="text"
                    value={editForm.country || ''}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
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
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city || ''}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                    <input
                      type="text"
                      value={editForm.country || ''}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-country"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Star Rating</label>
                    <select
                      value={editForm.star_rating || 4}
                      onChange={(e) => setEditForm({ ...editForm, star_rating: parseInt(e.target.value) })}
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
                      onChange={(e) => setEditForm({ ...editForm, rating_score: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-rating-score"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none"
                    data-testid="edit-hotel-description"
                  />
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
                  {isNew ? 'Create' : 'Save Changes'}
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
      <EditModal />
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Proposals', value: proposals.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Airports in DB', value: airportPagination.total || airports.length, icon: Plane, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Cities in DB', value: cities.length, icon: MapPin, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Hotels in DB', value: hotels.length, icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50' },
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
          <div className="flex border-b border-gray-100">
            {['proposals', 'airports', 'cities', 'hotels'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                data-testid={`tab-${tab}`}
                className={cn(
                  "px-8 py-5 font-bold text-sm transition-all relative capitalize",
                  activeTab === tab ? "text-[#002B5B]" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {tab} Management
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
            {activeTab === 'proposals' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => openEditModal('proposal')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-proposal-button"
                  >
                    <Plus size={18} />
                    Add Proposal
                  </button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-100">
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-4">ID</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-4">Origin</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-4">Destination</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-4">Date</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-4">Status</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-[#002B5B] border-t-transparent rounded-full animate-spin" />
                            <span className="font-bold text-gray-400">Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredProposals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-30">
                            <FileText size={48} />
                            <span className="font-bold">No proposals found</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredProposals.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group" data-testid={`proposal-row-${p.id}`}>
                          <td className="py-5 px-4 font-mono text-xs text-gray-400">#{p.id.slice(0, 8)}</td>
                          <td className="py-5 px-4">
                            <div className="font-bold text-gray-800">{p.leaving_from}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">{p.nationality}</div>
                          </td>
                          <td className="py-5 px-4">
                            <div className="font-bold text-gray-800">{p.cities?.[0]?.name || 'N/A'}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">{p.cities?.length || 0} Cities</div>
                          </td>
                          <td className="py-5 px-4">
                            <div className="font-bold text-gray-800">{p.leaving_on}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">{p.star_rating} Star</div>
                          </td>
                          <td className="py-5 px-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              p.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                            )}>
                              {p.status === 'confirmed' ? <CheckCircle size={12} /> : null}
                              {p.status}
                            </span>
                          </td>
                          <td className="py-5 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => openEditModal('proposal', p)}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                data-testid={`edit-proposal-${p.id}`}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => deleteProposal(p.id)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                data-testid={`delete-proposal-${p.id}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            )}

            {activeTab === 'airports' && (
              <div>
                {/* Airport-specific search */}
                <div className="mb-6">
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

                {/* Airports Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {airports.map((airport, i) => (
                    <div key={airport.id || i} className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all" data-testid={`airport-card-${airport.code}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-purple-600 text-sm">{airport.code}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-800 text-sm truncate">{airport.name}</div>
                          <div className="text-xs text-gray-500">{airport.city}, {airport.country}</div>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {filteredCities.map((city, i) => (
                  <div key={city.id || i} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <MapPin className="text-green-500" size={20} />
                      <div>
                        <div className="font-bold text-gray-800">{city.name}</div>
                        <div className="text-xs text-gray-500">{city.country}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'hotels' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredHotels.map((hotel, i) => (
                  <div 
                    key={hotel.id || i} 
                    className="bg-gray-50 p-6 rounded-xl border border-gray-100 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => onViewHotel && onViewHotel(hotel)}
                  >
                    <div className="flex gap-4">
                      <img 
                        src={hotel.images?.[0] || 'https://via.placeholder.com/100'} 
                        alt={hotel.name}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-gray-800">{hotel.name}</div>
                            <div className="text-xs text-gray-500">{hotel.city}, {hotel.country}</div>
                          </div>
                          <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded">
                            <span className="text-green-600 font-bold text-sm">{hotel.rating_score}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {Array.from({ length: hotel.star_rating || 4 }).map((_, j) => (
                            <span key={j} className="text-yellow-400">★</span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-2 line-clamp-2">{hotel.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, DollarSign, Calendar, Clock, Users, CheckCircle, XCircle, 
  AlertCircle, TrendingUp, Package, MapPin, Phone, Mail, User,
  ChevronRight, RefreshCw, Filter, Search, Eye, Edit2, X, Save,
  ArrowLeft, Briefcase, Building2
} from 'lucide-react';
import { api } from '@/App';

export default function SupplierDashboard({ user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editModal, setEditModal] = useState({ open: false, transfer: null });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [bookingDetailModal, setBookingDetailModal] = useState({ open: false, booking: null });
  
  // Demo mode: allow selecting supplier for testing
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [availableSuppliers, setAvailableSuppliers] = useState([]);

  // Get supplier name - use selected supplier or user's company
  const supplierName = selectedSupplier || user?.company_name || user?.full_name || 'Emirates Transfers LLC';

  // Fetch available suppliers for demo mode
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await api.get('/transfers');
        if (response.data.success) {
          const suppliers = [...new Set(response.data.transfers.map(t => t.supplier_name).filter(Boolean))];
          setAvailableSuppliers(suppliers);
          // Auto-select first supplier if user's company doesn't match any
          if (suppliers.length > 0 && !suppliers.includes(user?.company_name)) {
            setSelectedSupplier(suppliers[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };
    fetchSuppliers();
  }, [user?.company_name]);

  const fetchDashboardData = useCallback(async () => {
    if (!supplierName) return;
    setLoading(true);
    try {
      const response = await api.get(`/supplier/dashboard?supplier_name=${encodeURIComponent(supplierName)}`);
      if (response.data.success) {
        setStats(response.data.stats);
        setTransfers(response.data.transfers);
        setBookings(response.data.recent_bookings);
      }
    } catch (error) {
      console.error('Error fetching supplier data:', error);
    } finally {
      setLoading(false);
    }
  }, [supplierName]);

  useEffect(() => {
    if (supplierName) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, supplierName]);

  const fetchBookings = async (status = null) => {
    try {
      const url = status && status !== 'all' 
        ? `/supplier/bookings?supplier_name=${encodeURIComponent(supplierName)}&status=${status}`
        : `/supplier/bookings?supplier_name=${encodeURIComponent(supplierName)}`;
      const response = await api.get(url);
      if (response.data.success) {
        setBookings(response.data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      await api.post(`/supplier/bookings/${bookingId}/status?supplier_name=${encodeURIComponent(supplierName)}&status=${newStatus}`);
      fetchBookings(statusFilter);
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const openEditModal = (transfer) => {
    setEditForm({
      is_available: transfer.is_available,
      pickup_times: transfer.pickup_times || [],
      description: transfer.description || '',
      duration: transfer.duration || '',
      confirmation_time: transfer.confirmation_time || ''
    });
    setEditModal({ open: true, transfer });
  };

  const handleFieldChange = useCallback((field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveTransferEdit = async () => {
    setSaving(true);
    try {
      await api.put(
        `/supplier/transfers/${editModal.transfer.id}?supplier_name=${encodeURIComponent(supplierName)}`,
        editForm
      );
      setEditModal({ open: false, transfer: null });
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating transfer:', error);
    } finally {
      setSaving(false);
    }
  };

  const createSampleBookings = async () => {
    try {
      await api.post(`/supplier/bookings/create-sample?supplier_name=${encodeURIComponent(supplierName)}`);
      fetchDashboardData();
      fetchBookings();
    } catch (error) {
      console.error('Error creating sample bookings:', error);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.transfer?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'rejected': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const StatCard = ({ icon: Icon, label, value, subValue, color, bgColor }) => (
    <div className={`${bgColor} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="relative z-10">
        <div className={`w-12 h-12 ${color} bg-white/20 rounded-xl flex items-center justify-center mb-4`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-white/80 text-sm">{label}</div>
        {subValue && <div className="text-white/60 text-xs mt-1">{subValue}</div>}
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-10">
        <Icon size={120} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-white text-lg">Loading Supplier Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" data-testid="supplier-dashboard">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="back-button"
              >
                <ArrowLeft className="text-white" size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Supplier Dashboard</h1>
                <div className="flex items-center gap-3">
                  <p className="text-purple-300 text-sm flex items-center gap-2">
                    <Building2 size={14} />
                    {supplierName}
                  </p>
                  {availableSuppliers.length > 1 && (
                    <select
                      value={selectedSupplier || ''}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white/80 focus:outline-none focus:border-purple-400"
                      data-testid="supplier-selector"
                    >
                      {availableSuppliers.map((s) => (
                        <option key={s} value={s} className="bg-slate-800">{s}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDashboardData}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                data-testid="refresh-data"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
              {bookings.length === 0 && (
                <button
                  onClick={createSampleBookings}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
                  data-testid="create-sample-bookings"
                >
                  <Package size={18} />
                  Generate Sample Bookings
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Car}
            label="Total Transfers"
            value={stats.total_transfers || 0}
            bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            icon={Package}
            label="Total Bookings"
            value={stats.total_bookings || 0}
            subValue={`${stats.pending_bookings || 0} pending`}
            bgColor="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <StatCard
            icon={DollarSign}
            label="Total Earnings"
            value={`${(stats.total_earnings || 0).toLocaleString()} AED`}
            subValue={`${(stats.pending_earnings || 0).toLocaleString()} AED pending`}
            bgColor="bg-gradient-to-br from-green-500 to-green-600"
          />
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={stats.completed_bookings || 0}
            subValue={`${stats.confirmed_bookings || 0} confirmed`}
            bgColor="bg-gradient-to-br from-teal-500 to-teal-600"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['overview', 'transfers', 'bookings', 'earnings'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'bookings') fetchBookings();
              }}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab
                  ? 'bg-white text-purple-900 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              data-testid={`tab-${tab}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
              
              {/* Recent Bookings */}
              <div className="space-y-3">
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={48} className="mx-auto text-white/30 mb-4" />
                    <p className="text-white/50">No bookings yet</p>
                    <button
                      onClick={createSampleBookings}
                      className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
                    >
                      Generate Sample Bookings
                    </button>
                  </div>
                ) : (
                  bookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <User size={20} className="text-purple-400" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{booking.customer_name}</div>
                          <div className="text-white/50 text-sm">{booking.transfer?.title || 'Transfer'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-white font-bold">{booking.supplier_earnings || 0} AED</div>
                          <div className="text-white/50 text-xs">{booking.pickup_date}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">My Transfers ({transfers.length})</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-purple-500/50 transition-all group"
                    data-testid={`transfer-card-${transfer.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transfer.transfer_type === 'Luxury' ? 'bg-amber-500/20' :
                          transfer.transfer_type === 'Shared' ? 'bg-blue-500/20' : 'bg-teal-500/20'
                        }`}>
                          <Car className={`${
                            transfer.transfer_type === 'Luxury' ? 'text-amber-400' :
                            transfer.transfer_type === 'Shared' ? 'text-blue-400' : 'text-teal-400'
                          }`} size={20} />
                        </div>
                        <div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            transfer.transfer_type === 'Luxury' ? 'bg-amber-500/20 text-amber-400' :
                            transfer.transfer_type === 'Shared' ? 'bg-blue-500/20 text-blue-400' : 'bg-teal-500/20 text-teal-400'
                          }`}>
                            {transfer.transfer_type}
                          </span>
                          {transfer.vehicle_type && (
                            <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-white/60">
                              {transfer.vehicle_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openEditModal(transfer)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        data-testid={`edit-transfer-${transfer.id}`}
                      >
                        <Edit2 size={16} className="text-white/60" />
                      </button>
                    </div>
                    
                    <h3 className="text-white font-bold text-sm mb-2 line-clamp-1">{transfer.title}</h3>
                    
                    <div className="space-y-1.5 text-xs text-white/60 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-green-400" />
                        <span className="truncate">{transfer.from_location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-red-400" />
                        <span className="truncate">{transfer.to_location}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-3 text-xs text-white/50">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{transfer.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase size={12} />
                          <span>{transfer.max_bags || 2} bags</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 text-xs">Cost:</span>
                        <span className="text-green-400 font-bold">{transfer.supplier_cost} AED</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        transfer.is_available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {transfer.is_available ? 'Available' : 'Unavailable'}
                      </span>
                      <span className="text-white/30 text-xs">
                        Sale Price: {transfer.price} AED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Bookings</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search bookings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                      data-testid="search-bookings"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      fetchBookings(e.target.value);
                    }}
                    className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500"
                    data-testid="filter-status"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-3">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={48} className="mx-auto text-white/30 mb-4" />
                    <p className="text-white/50">No bookings found</p>
                  </div>
                ) : (
                  filteredBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-purple-500/30 transition-all"
                      data-testid={`booking-card-${booking.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <User size={24} className="text-purple-400" />
                          </div>
                          <div>
                            <div className="text-white font-bold">{booking.customer_name}</div>
                            <div className="flex items-center gap-4 text-sm text-white/50 mt-1">
                              <span className="flex items-center gap-1">
                                <Mail size={14} />
                                {booking.customer_email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone size={14} />
                                {booking.customer_phone}
                              </span>
                            </div>
                            <div className="text-white/70 text-sm mt-2">
                              {booking.transfer?.title || 'Transfer'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                          <div className="text-white font-bold text-lg mt-2">{booking.supplier_earnings || 0} AED</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-white/60 text-sm">
                          <Calendar size={16} />
                          <span>{booking.pickup_date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/60 text-sm">
                          <Clock size={16} />
                          <span>{booking.pickup_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/60 text-sm">
                          <Users size={16} />
                          <span>{booking.passengers} passenger(s)</span>
                        </div>
                        
                        <div className="flex-1" />
                        
                        {booking.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
                              data-testid={`confirm-booking-${booking.id}`}
                            >
                              <CheckCircle size={14} />
                              Accept
                            </button>
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'rejected')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                              data-testid={`reject-booking-${booking.id}`}
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </div>
                        )}
                        
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
                            data-testid={`complete-booking-${booking.id}`}
                          >
                            <CheckCircle size={14} />
                            Mark Complete
                          </button>
                        )}
                      </div>
                      
                      {booking.notes && (
                        <div className="mt-3 p-3 bg-white/5 rounded-lg text-white/60 text-sm">
                          <strong>Notes:</strong> {booking.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Earnings Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-5 border border-green-500/20">
                  <div className="text-green-400 text-sm mb-1">Total Earnings</div>
                  <div className="text-3xl font-bold text-white">{(stats.total_earnings || 0).toLocaleString()} AED</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl p-5 border border-amber-500/20">
                  <div className="text-amber-400 text-sm mb-1">Pending Earnings</div>
                  <div className="text-3xl font-bold text-white">{(stats.pending_earnings || 0).toLocaleString()} AED</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-5 border border-purple-500/20">
                  <div className="text-purple-400 text-sm mb-1">Completed Bookings</div>
                  <div className="text-3xl font-bold text-white">{stats.completed_bookings || 0}</div>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-3">Earnings by Transfer</h3>
              <div className="space-y-3">
                {transfers.map((transfer) => {
                  const transferBookings = bookings.filter(b => b.transfer_id === transfer.id && ['confirmed', 'completed'].includes(b.status));
                  const transferEarnings = transferBookings.reduce((sum, b) => sum + (b.supplier_earnings || 0), 0);
                  
                  return (
                    <div
                      key={transfer.id}
                      className="bg-white/5 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Car size={20} className="text-purple-400" />
                        </div>
                        <div>
                          <div className="text-white font-medium line-clamp-1">{transfer.title}</div>
                          <div className="text-white/50 text-sm">{transferBookings.length} bookings</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-lg">{transferEarnings.toLocaleString()} AED</div>
                        <div className="text-white/40 text-xs">@ {transfer.supplier_cost} AED each</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Transfer Modal */}
      <AnimatePresence>
        {editModal.open && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setEditModal({ open: false, transfer: null })}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Edit Transfer</h3>
                <button
                  onClick={() => setEditModal({ open: false, transfer: null })}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <X size={20} className="text-white/60" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-1">Duration</label>
                  <input
                    type="text"
                    value={editForm.duration || ''}
                    onChange={(e) => handleFieldChange('duration', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                    data-testid="edit-transfer-duration"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-1">Confirmation Time</label>
                  <input
                    type="text"
                    value={editForm.confirmation_time || ''}
                    onChange={(e) => handleFieldChange('confirmation_time', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                    data-testid="edit-transfer-confirmation"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-1">Pick-up Times (comma-separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(editForm.pickup_times) ? editForm.pickup_times.join(', ') : ''}
                    onChange={(e) => handleFieldChange('pickup_times', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                    placeholder="06:00, 09:00, 12:00"
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                    data-testid="edit-transfer-pickup-times"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-1">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none"
                    data-testid="edit-transfer-description"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_available}
                    onChange={(e) => handleFieldChange('is_available', e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                    data-testid="edit-transfer-available"
                  />
                  <label className="text-sm font-bold text-white/70">Transfer Available</label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditModal({ open: false, transfer: null })}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTransferEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="save-transfer-button"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

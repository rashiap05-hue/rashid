import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserCheck, UserX, Search, RefreshCw, Edit2, Trash2, 
  Shield, ShieldCheck, ShieldX, MoreVertical, X, ChevronRight,
  TrendingUp, DollarSign, FileText, Clock, CheckCircle, AlertCircle,
  Mail, Building2, Calendar, Activity, Phone, Save, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

export default function AdminUserDashboard({ onBack }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats')
      ]);
      setUsers(usersRes.data?.users || []);
      setStats(statsRes.data?.stats || null);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      setUserDetails(response.data);
      setShowUserModal(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      await api.post(`/admin/users/${userId}/status?status=${status}`);
      fetchData();
      setShowActionMenu(null);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await api.post(`/admin/users/${userId}/role?role=${role}`);
      fetchData();
      setShowActionMenu(null);
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also delete all their proposals.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      mobile: user.mobile || '',
      company_name: user.company_name || ''
    });
    setShowEditModal(true);
    setShowActionMenu(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setSaving(true);
    try {
      await api.put(`/admin/users/${editingUser.id}`, editFormData);
      setShowEditModal(false);
      setEditingUser(null);
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'active') return matchesSearch && user.status === 'active';
    if (activeFilter === 'suspended') return matchesSearch && user.status === 'suspended';
    if (activeFilter === 'admin') return matchesSearch && user.role === 'admin';
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <ShieldCheck className="text-purple-500" size={16} />;
      case 'manager': return <Shield className="text-blue-500" size={16} />;
      default: return <Users className="text-gray-500" size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans" data-testid="admin-user-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500">Manage all registered users and their permissions</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            data-testid="refresh-users"
            className="flex items-center gap-2 px-4 py-2 bg-[#002B5B] text-white rounded-xl hover:bg-[#003d82] transition-colors font-medium"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              data-testid="stat-total-users"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="text-blue-600" size={24} />
                </div>
                <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">
                  +{stats.recent_signups} new
                </span>
              </div>
              <div className="text-3xl font-black text-gray-900">{stats.total_users}</div>
              <div className="text-sm font-medium text-gray-500">Total Users</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              data-testid="stat-proposals"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="text-purple-600" size={24} />
                </div>
              </div>
              <div className="text-3xl font-black text-gray-900">{stats.total_proposals}</div>
              <div className="text-sm font-medium text-gray-500">Total Proposals</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              data-testid="stat-confirmed"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
              </div>
              <div className="text-3xl font-black text-gray-900">{stats.confirmed_proposals}</div>
              <div className="text-sm font-medium text-gray-500">Confirmed Bookings</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              data-testid="stat-revenue"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="text-orange-600" size={24} />
                </div>
              </div>
              <div className="text-3xl font-black text-gray-900">
                AED {stats.total_revenue?.toLocaleString() || 0}
              </div>
              <div className="text-sm font-medium text-gray-500">Total Revenue</div>
            </motion.div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All Users', icon: Users },
                  { id: 'active', label: 'Active', icon: UserCheck },
                  { id: 'suspended', label: 'Suspended', icon: UserX },
                  { id: 'admin', label: 'Admins', icon: ShieldCheck }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      activeFilter === filter.id 
                        ? "bg-[#002B5B] text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    <filter.icon size={16} />
                    {filter.label}
                  </button>
                ))}
              </div>
              
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="search-users"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Proposals</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Value</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-[#002B5B] border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium text-gray-400">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-50">
                        <Users size={48} />
                        <span className="font-medium">No users found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-gray-50/50 transition-colors group"
                      data-testid={`user-row-${user.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#002B5B] to-[#004080] rounded-full flex items-center justify-center text-white font-bold">
                            {user.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{user.full_name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail size={12} />
                              {user.email}
                            </div>
                            {user.mobile && (
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone size={12} />
                                {user.mobile}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Building2 size={14} className="text-gray-400" />
                          <span className="text-sm font-medium">{user.company_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role)}
                          <span className="text-sm font-medium capitalize">{user.role || 'agent'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase",
                          getStatusColor(user.status)
                        )}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-gray-400" />
                          <span className="font-bold text-gray-900">{user.proposals_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#002B5B]">
                          AED {(user.total_bookings_value || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 relative">
                          <button
                            onClick={() => fetchUserDetails(user.id)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <ChevronRight size={18} />
                          </button>
                          <button
                            onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                            className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          {/* Action Menu Dropdown */}
                          <AnimatePresence>
                            {showActionMenu === user.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
                              >
                                <div className="p-1">
                                  <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase">Change Role</div>
                                  {['admin', 'manager', 'agent'].map((role) => (
                                    <button
                                      key={role}
                                      onClick={() => updateUserRole(user.id, role)}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-lg capitalize flex items-center gap-2"
                                    >
                                      {getRoleIcon(role)}
                                      {role}
                                    </button>
                                  ))}
                                  
                                  <div className="border-t border-gray-100 my-1" />
                                  <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase">Change Status</div>
                                  {['active', 'suspended', 'inactive'].map((status) => (
                                    <button
                                      key={status}
                                      onClick={() => updateUserStatus(user.id, status)}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-lg capitalize"
                                    >
                                      {status}
                                    </button>
                                  ))}
                                  
                                  <div className="border-t border-gray-100 my-1" />
                                  <button
                                    onClick={() => deleteUser(user.id)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 rounded-lg flex items-center gap-2"
                                  >
                                    <Trash2 size={14} />
                                    Delete User
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserModal && userDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUserModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              data-testid="user-details-modal"
            >
              <div className="bg-gradient-to-r from-[#002B5B] to-[#004080] text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                      {userDetails.user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{userDetails.user?.full_name}</h2>
                      <p className="text-blue-200 text-sm">{userDetails.user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-1">Company</div>
                    <div className="font-bold text-gray-900">{userDetails.user?.company_name || '-'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-1">Role</div>
                    <div className="font-bold text-gray-900 capitalize flex items-center gap-2">
                      {getRoleIcon(userDetails.user?.role)}
                      {userDetails.user?.role || 'agent'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-1">Status</div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase",
                      getStatusColor(userDetails.user?.status)
                    )}>
                      {userDetails.user?.status || 'active'}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-1">Joined</div>
                    <div className="font-bold text-gray-900">
                      {userDetails.user?.created_at ? new Date(userDetails.user.created_at).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                {userDetails.stats && (
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <div className="text-2xl font-black text-blue-600">{userDetails.stats.proposals_count}</div>
                      <div className="text-xs text-blue-600 font-medium">Total Proposals</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <div className="text-2xl font-black text-green-600">{userDetails.stats.confirmed_count}</div>
                      <div className="text-xs text-green-600 font-medium">Confirmed</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-xl">
                      <div className="text-2xl font-black text-yellow-600">{userDetails.stats.pending_count}</div>
                      <div className="text-xs text-yellow-600 font-medium">Pending</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <div className="text-2xl font-black text-purple-600">
                        AED {userDetails.stats.total_value?.toLocaleString() || 0}
                      </div>
                      <div className="text-xs text-purple-600 font-medium">Total Value</div>
                    </div>
                  </div>
                )}

                {/* Recent Proposals */}
                {userDetails.proposals?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">Recent Proposals</h3>
                    <div className="space-y-2">
                      {userDetails.proposals.slice(0, 5).map((proposal) => (
                        <div key={proposal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div>
                            <div className="font-medium text-gray-900">
                              {proposal.leaving_from} → {proposal.cities?.[0]?.name}
                            </div>
                            <div className="text-xs text-gray-500">{proposal.leaving_on}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#002B5B]">AED {proposal.total_price?.toLocaleString()}</div>
                            <span className={cn(
                              "text-xs font-bold uppercase",
                              proposal.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'
                            )}>
                              {proposal.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

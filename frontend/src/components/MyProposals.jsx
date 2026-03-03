import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MapPin, Calendar, Users, DollarSign, Clock, 
  Filter, ChevronDown, Eye, Edit2, Trash2, Loader2,
  FileText, CheckCircle, XCircle, AlertCircle, Plane
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

// Status Badge Component
function StatusBadge({ status }) {
  const statusConfig = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completed' },
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-bold", config.bg, config.text)}>
      {config.label}
    </span>
  );
}

// Proposal Card Component
function ProposalCard({ proposal, onView, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-[#002B5B]">
              {proposal.leaving_from || 'Unknown Airport'}
              {proposal.leaving_from_code && ` (${proposal.leaving_from_code})`}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Calendar size={14} />
              <span>{proposal.leaving_on || 'No date'}</span>
            </div>
          </div>
          <StatusBadge status={proposal.status} />
        </div>

        {/* Destination Cities */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin size={16} className="text-pink-500" />
            <span className="font-medium">
              {proposal.cities?.map(c => c.name).join(' → ') || 'No destinations'}
            </span>
          </div>
        </div>

        {/* Trip Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users size={14} />
            <span>{proposal.room_data?.reduce((acc, r) => acc + r.adults, 0) || 2} Adults</span>
            {proposal.room_data?.reduce((acc, r) => acc + (r.children?.length || 0), 0) > 0 && (
              <span>, {proposal.room_data.reduce((acc, r) => acc + (r.children?.length || 0), 0)} Children</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={14} />
            <span>
              {proposal.cities?.reduce((acc, c) => acc + (c.nights || 0), 0) || 0} Nights
            </span>
          </div>
        </div>

        {/* Price */}
        {proposal.total_price && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Total Package</span>
            <span className="text-2xl font-bold text-[#D4A853]">
              AED {proposal.total_price.toLocaleString()}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => onView(proposal)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#002B5B] text-white rounded-lg font-medium hover:bg-[#003d82] transition-colors"
          >
            <Eye size={16} />
            View
          </button>
          <button
            onClick={() => onEdit(proposal)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(proposal.id)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Main My Proposals Component
export default function MyProposals({ onViewProposal, onEditProposal }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/proposals');
      setProposals(response.data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (proposalId) => {
    if (!window.confirm('Are you sure you want to delete this proposal?')) return;
    
    try {
      await api.delete(`/proposals/${proposalId}`);
      setProposals(proposals.filter(p => p.id !== proposalId));
    } catch (error) {
      console.error('Error deleting proposal:', error);
      alert('Failed to delete proposal');
    }
  };

  // Filter and sort proposals
  const filteredProposals = proposals
    .filter(p => {
      const matchesSearch = !searchQuery || 
        p.leaving_from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cities?.some(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      } else if (sortBy === 'price-high') {
        return (b.total_price || 0) - (a.total_price || 0);
      } else if (sortBy === 'price-low') {
        return (a.total_price || 0) - (b.total_price || 0);
      }
      return 0;
    });

  // Stats
  const stats = {
    total: proposals.length,
    pending: proposals.filter(p => p.status === 'pending').length,
    confirmed: proposals.filter(p => p.status === 'confirmed').length,
    totalValue: proposals.reduce((acc, p) => acc + (p.total_price || 0), 0)
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]" data-testid="my-proposals-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#002B5B] to-[#004080] text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">My Proposals</h1>
          <p className="text-white/70">Manage and track all your trip proposals</p>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">Total Proposals</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-300">{stats.pending}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">Confirmed</p>
              <p className="text-2xl font-bold text-green-300">{stats.confirmed}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">Total Value</p>
              <p className="text-2xl font-bold text-[#D4A853]">AED {stats.totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4 items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by destination or airport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
              data-testid="proposals-search"
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
              data-testid="status-filter"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
          
          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
              data-testid="sort-filter"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Proposals Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#002B5B]" size={48} />
            <p className="mt-4 text-gray-500 font-medium">Loading proposals...</p>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
            <FileText size={64} className="text-gray-300 mb-4" />
            <p className="font-bold text-gray-500 text-xl">No proposals found</p>
            <p className="text-gray-400 mt-2">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first trip proposal to get started'
              }
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Showing {filteredProposals.length} of {proposals.length} proposals
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onView={onViewProposal}
                  onEdit={onEditProposal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

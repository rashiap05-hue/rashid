import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Calendar, ChevronDown, ChevronLeft, ChevronRight, 
  Eye, Trash2, Loader2, Filter, ArrowUpDown, Edit2, MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

// Format date helper
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  return `${date.toLocaleDateString('en-GB', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;
};

// Generate proposal number
const generateProposalNumber = (id) => {
  if (!id) return '-';
  // Take last 7 characters of ID or generate a number
  return id.slice(-7).toUpperCase();
};

// Main My Proposals Component
export default function MyProposals({ onViewProposal, onEditProposal }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDesk, setSelectedDesk] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Sorting
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

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
      const token = localStorage.getItem('travo_token');
      if (!token) {
        alert('Please login again to delete proposals');
        return;
      }
      await api.delete(`/proposals/${proposalId}`);
      setProposals(proposals.filter(p => p.id !== proposalId));
    } catch (error) {
      console.error('Error deleting proposal:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
      } else {
        alert('Failed to delete proposal: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter proposals
  const filteredProposals = proposals.filter(p => {
    // Hide held proposals
    if (p.status === 'held') return false;
    // Date filter
    if (dateFrom) {
      const proposalDate = new Date(p.created_at || p.leaving_on);
      const fromDate = new Date(dateFrom);
      if (proposalDate < fromDate) return false;
    }
    if (dateTo) {
      const proposalDate = new Date(p.created_at || p.leaving_on);
      const toDate = new Date(dateTo);
      if (proposalDate > toDate) return false;
    }
    
    // Customer search
    if (customerSearch) {
      const searchLower = customerSearch.toLowerCase();
      const customerName = (p.customer_name || p.sent_by || '').toLowerCase();
      const customerEmail = (p.customer_email || '').toLowerCase();
      if (!customerName.includes(searchLower) && !customerEmail.includes(searchLower)) {
        return false;
      }
    }
    
    // Destination search
    if (destinationSearch) {
      const searchLower = destinationSearch.toLowerCase();
      const destinations = p.cities?.map(c => c.name?.toLowerCase()).join(' ') || '';
      if (!destinations.includes(searchLower)) return false;
    }
    
    return true;
  });

  // Sort proposals
  const sortedProposals = [...filteredProposals].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortField) {
      case 'proposal_number':
        aVal = a.id || '';
        bVal = b.id || '';
        break;
      case 'created_at':
        aVal = new Date(a.created_at || 0);
        bVal = new Date(b.created_at || 0);
        break;
      case 'travel_date':
        aVal = new Date(a.leaving_on || 0);
        bVal = new Date(b.leaving_on || 0);
        break;
      case 'price':
        aVal = a.total_price || 0;
        bVal = b.total_price || 0;
        break;
      default:
        aVal = a[sortField] || '';
        bVal = b[sortField] || '';
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Paginate
  const totalPages = Math.ceil(sortedProposals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProposals = sortedProposals.slice(startIndex, startIndex + itemsPerPage);

  // Column header component
  const SortableHeader = ({ field, label }) => (
    <th 
      className="px-4 py-3 text-left text-sm font-bold text-gray-700 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={14} className={cn(
          "text-gray-400",
          sortField === field && "text-[#002B5B]"
        )} />
      </div>
    </th>
  );

  // Build proposal table rows as an array (avoids inline conditional that triggers visual-editor span injection)
  const proposalRows = paginatedProposals.length === 0
    ? [
        <tr key="__empty__">
          <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
            No proposals found
          </td>
        </tr>
      ]
    : paginatedProposals.map((proposal) => {
        const adultsCount = proposal.room_data?.reduce((acc, r) => acc + (r.adults || 0), 0) || 2;
        const childrenCount = proposal.room_data?.reduce((acc, r) => acc + (r.children?.length || 0), 0) || 0;
        const nightsCount = proposal.cities?.reduce((acc, c) => acc + (c.nights || 0), 0) || 1;
        const destinations = proposal.cities?.map(c => c.name).join(', ') || '-';
        return (
          <tr
            key={proposal.id}
            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            data-testid={`proposal-row-${proposal.id}`}
          >
            <td className="px-4 py-4 text-sm text-gray-800 font-medium">{generateProposalNumber(proposal.id)}</td>
            <td className="px-4 py-4 text-sm text-gray-600">{proposal.created_by_name || proposal.sent_by || proposal.created_by || 'Admin'}</td>
            <td className="px-4 py-4 text-sm text-gray-600">{proposal.customer_name || proposal.client_name || '-'}</td>
            <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDateTime(proposal.created_at)}</td>
            <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(proposal.expected_booking_date) || '-'}</td>
            <td className="px-4 py-4">
              <div className="text-sm text-gray-800 font-medium">{proposal.proposal_name || `Trip to ${proposal.cities?.[0]?.name || 'Unknown'}`}</div>
              <div className="text-xs text-gray-500">{destinations}</div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-600">{proposal.leaving_from || proposal.leaving_from_code || '-'}</td>
            <td className="px-4 py-4">
              <div className="text-sm text-gray-800">{formatDate(proposal.leaving_on)}</div>
              <div className="text-xs text-gray-500">{nightsCount} night{nightsCount !== 1 ? 's' : ''}</div>
              <div className="text-xs text-gray-500">{adultsCount}A {childrenCount > 0 ? `${childrenCount}C` : ''}</div>
            </td>
            <td className="px-4 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">AED {(proposal.total_price || 0).toLocaleString()}</td>
            <td className="px-4 py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onEditProposal && onEditProposal(proposal)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                  data-testid={`edit-proposal-${proposal.id}`}
                  title="Edit Proposal"
                >
                  <Edit2 size={14} />Edit
                </button>
                <button
                  onClick={() => handleDelete(proposal.id)}
                  className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm font-medium hover:underline"
                  data-testid={`delete-proposal-${proposal.id}`}
                  title="Delete Proposal"
                >
                  <Trash2 size={14} />Delete
                </button>
              </div>
            </td>
            <td className="px-4 py-4">
              <button
                onClick={() => onViewProposal && onViewProposal(proposal)}
                className="flex items-center gap-1 text-[#002B5B] hover:text-[#004080] text-sm font-medium hover:underline whitespace-nowrap"
                data-testid={`view-proposal-${proposal.id}`}
              >
                <Eye size={14} />View Proposal
              </button>
            </td>
          </tr>
        );
      });

  return (
    <div className="min-h-screen bg-white p-6" data-testid="my-proposals-page">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Proposals</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-gray-50 p-4 rounded-lg">
        {/* Date From */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
            data-testid="date-from"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
            data-testid="date-to"
          />
        </div>

        {/* Desk Filter */}
        <div className="relative">
          <select
            value={selectedDesk}
            onChange={(e) => setSelectedDesk(e.target.value)}
            className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
            data-testid="desk-filter"
          >
            <option value="">Any Desk</option>
            <option value="desk1">Desk 1</option>
            <option value="desk2">Desk 2</option>
          </select>
          <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Customer Search */}
        <input
          type="text"
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          placeholder="Customer Name/Email"
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent w-48"
          data-testid="customer-search"
        />

        {/* Destination Search */}
        <input
          type="text"
          value={destinationSearch}
          onChange={(e) => setDestinationSearch(e.target.value)}
          placeholder="Destination"
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent w-36"
          data-testid="destination-search"
        />

        {/* Market Filter */}
        <div className="relative">
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="appearance-none px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
            data-testid="market-filter"
          >
            <option value="">Any Market</option>
            <option value="uae">UAE</option>
            <option value="india">India</option>
            <option value="europe">Europe</option>
          </select>
          <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Show Proposals Button */}
        <button
          onClick={fetchProposals}
          className="px-6 py-2 bg-[#002B5B] text-white rounded-lg font-medium hover:bg-[#003d82] transition-colors"
          data-testid="show-proposals-btn"
        >
          Show Proposals
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#002B5B]" size={40} />
          <p className="mt-4 text-gray-500">Loading proposals...</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full" data-testid="proposals-table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <SortableHeader field="proposal_number" label="Proposal #" />
                  <SortableHeader field="sent_by" label="Sent By" />
                  <SortableHeader field="customer" label="Customer" />
                  <SortableHeader field="created_at" label="Created At" />
                  <SortableHeader field="expected_booking" label="Expected Booking Date" />
                  <SortableHeader field="proposal_name" label="Proposal Name" />
                  <SortableHeader field="from" label="From" />
                  <SortableHeader field="travel_date" label="Travel Date" />
                  <SortableHeader field="price" label="Price Quoted" />
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Actions</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700"></th>
                </tr>
                {/* Filter Row */}
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-4 py-2 font-normal"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></th>
                  <th className="px-4 py-2 font-normal"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></th>
                  <th className="px-4 py-2 font-normal"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></th>
                  <th className="px-4 py-2 font-normal"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></th>
                  <th className="px-4 py-2 font-normal"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></th>
                  <th className="px-4 py-2 font-normal"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></th>
                  <th className="px-4 py-2 font-normal"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></th>
                  <th className="px-4 py-2 font-normal"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></th>
                  <th className="px-4 py-2 font-normal"><input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-sm" /></th>
                  <th className="px-4 py-2"></th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>{proposalRows}</tbody>
            </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 px-2">
        <p className="text-sm text-gray-600">
          Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, sortedProposals.length)} of {sortedProposals.length} results
        </p>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors",
              currentPage === 1 
                ? "text-gray-400 cursor-not-allowed" 
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          {/* Page Numbers */}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                "w-8 h-8 rounded-full text-sm font-medium transition-colors",
                currentPage === page 
                  ? "bg-gray-600 text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors",
              currentPage === totalPages || totalPages === 0
                ? "text-gray-400 cursor-not-allowed" 
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

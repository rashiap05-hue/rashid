import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plane, 
  MapPin, 
  Globe, 
  ChevronLeft,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AIRPORT_DATABASE, Airport } from '../data/airports';

const ITEMS_PER_PAGE = 20;

export default function AirportDatabase({ onBack }: { onBack: () => void }) {
  const [airports, setAirports] = useState<Airport[]>(AIRPORT_DATABASE);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAirport, setEditingAirport] = useState<{ airport: Airport, index: number } | null>(null);
  const [formData, setFormData] = useState<Airport>({
    country: '',
    location: '',
    airport: '',
    iata: ''
  });

  const countries = useMemo(() => ['All', ...Array.from(new Set(airports.map(a => a.country)))].sort(), [airports]);

  const filteredAirports = useMemo(() => {
    return airports.filter(airport => {
      const matchesSearch = 
        airport.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        airport.airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
        airport.iata.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCountry = selectedCountry === 'All' || airport.country === selectedCountry;
      
      return matchesSearch && matchesCountry;
    });
  }, [airports, searchTerm, selectedCountry]);

  const totalPages = Math.ceil(filteredAirports.length / ITEMS_PER_PAGE);
  const paginatedAirports = filteredAirports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenModal = (airport?: Airport, index?: number) => {
    if (airport && index !== undefined) {
      setEditingAirport({ airport, index });
      setFormData(airport);
    } else {
      setEditingAirport(null);
      setFormData({ country: '', location: '', airport: '', iata: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAirport) {
      const newAirports = [...airports];
      // Find the actual index in the original array if we were using IDs, 
      // but here we'll just update the one we found during filtering for simplicity in this demo
      const actualIndex = airports.findIndex(a => a.iata === editingAirport.airport.iata && a.airport === editingAirport.airport.airport);
      if (actualIndex !== -1) {
        newAirports[actualIndex] = formData;
        setAirports(newAirports);
      }
    } else {
      setAirports([formData, ...airports]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (iata: string, airportName: string) => {
    if (confirm('Are you sure you want to delete this airport?')) {
      setAirports(airports.filter(a => !(a.iata === iata && a.airport === airportName)));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[#002B5B]">Airport Database</h2>
            <p className="text-sm text-gray-500">Manage global airport codes and locations</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-[#002B5B] text-white rounded-2xl text-sm font-bold hover:bg-[#003d82] transition-all shadow-lg shadow-[#002B5B]/20"
        >
          <Plus size={18} />
          Add New Airport
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by city, airport name, or IATA code..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
              />
            </div>
            <div className="relative w-full md:w-64">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium appearance-none"
              >
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="py-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-6">Country</th>
                <th className="py-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-6">Location</th>
                <th className="py-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-6">Airport Name</th>
                <th className="py-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-6">IATA Code</th>
                <th className="py-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedAirports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Plane size={48} />
                      <span className="font-bold">No airports found matching your criteria</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAirports.map((airport, index) => (
                  <tr 
                    key={`${airport.iata}-${index}`}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-blue-400" />
                        <span className="font-bold text-gray-800">{airport.country}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-orange-400" />
                        <span className="text-sm font-medium text-gray-600">{airport.location}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-gray-800">{airport.airport}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-[#002B5B] text-xs font-black border border-blue-100">
                        {airport.iata}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(airport, index)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(airport.iata, airport.airport)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
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
        
        <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Showing {paginatedAirports.length} of {filteredAirports.length} results
          </p>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronsLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-[#002B5B] px-3 py-1 bg-white rounded-lg border border-gray-200">
                  {currentPage}
                </span>
                <span className="text-sm text-gray-400 font-medium">of {totalPages}</span>
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronsRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-bold text-[#002B5B]">
                    {editingAirport ? 'Edit Airport' : 'Add New Airport'}
                  </h3>
                  <p className="text-sm text-gray-500">Enter the airport details below</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Country</label>
                    <input 
                      required
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                      placeholder="e.g. United Arab Emirates"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">IATA Code</label>
                    <input 
                      required
                      type="text"
                      maxLength={3}
                      value={formData.iata}
                      onChange={(e) => setFormData({ ...formData, iata: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium uppercase"
                      placeholder="e.g. DXB"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Location / City</label>
                  <input 
                    required
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                    placeholder="e.g. Dubai"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Airport Name</label>
                  <input 
                    required
                    type="text"
                    value={formData.airport}
                    onChange={(e) => setFormData({ ...formData, airport: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                    placeholder="e.g. Dubai International Airport"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-[#002B5B] text-white rounded-2xl text-sm font-bold hover:bg-[#003d82] transition-all shadow-lg shadow-[#002B5B]/20"
                  >
                    {editingAirport ? 'Save Changes' : 'Add Airport'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


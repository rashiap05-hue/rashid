import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  Users, 
  FileText, 
  Settings, 
  ArrowLeft, 
  Search, 
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  MapPin,
  Plane,
  Building2
} from 'lucide-react';
import { cn } from './lib/utils';
import { AIRPORTS, MAJOR_CITIES } from './constants';
import { AIRPORT_DATABASE } from './data/airports';
import { HOTEL_DATABASE, Hotel } from './data/hotels';
import AirportDatabase from './components/AirportDatabase';
import HotelDatabase from './components/HotelDatabase';

export default function AdminDashboard({ 
  onBack,
  onViewHotel
}: { 
  onBack: () => void,
  onViewHotel?: (hotel: Hotel) => void
}) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proposals' | 'data'>('proposals');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAirportDB, setShowAirportDB] = useState(false);
  const [showHotelDB, setShowHotelDB] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proposals');
      const data = await response.json();
      setProposals(data);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = proposals.filter(p => 
    p.leaving_from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nationality?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans text-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Proposals', value: proposals.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active Users', value: '124', icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Airports in DB', value: AIRPORT_DATABASE.length, icon: Plane, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Hotels in DB', value: HOTEL_DATABASE.length, icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-xl", stat.bg)}>
                  <stat.icon className={stat.color} size={24} />
                </div>
                <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded">+12%</span>
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
            <button 
              onClick={() => {
                setActiveTab('proposals');
                setShowAirportDB(false);
                setShowHotelDB(false);
              }}
              className={cn(
                "px-8 py-5 font-bold text-sm transition-all relative",
                activeTab === 'proposals' ? "text-[#002B5B]" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Proposals Management
              {activeTab === 'proposals' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#002B5B]" />}
            </button>
            <button 
              onClick={() => setActiveTab('data')}
              className={cn(
                "px-8 py-5 font-bold text-sm transition-all relative",
                activeTab === 'data' ? "text-[#002B5B]" : "text-gray-400 hover:text-gray-600"
              )}
            >
              System Data Settings
              {activeTab === 'data' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#002B5B]" />}
            </button>
          </div>

          <div className="p-8">
            {showAirportDB ? (
              <AirportDatabase onBack={() => setShowAirportDB(false)} />
            ) : showHotelDB ? (
              <HotelDatabase 
                onBack={() => setShowHotelDB(false)} 
                onViewHotel={onViewHotel}
              />
            ) : activeTab === 'proposals' ? (
              <>
                <div className="flex justify-between items-center mb-8">
                  <div className="relative w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search proposals by city or nationality..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                    />
                  </div>
                  <button 
                    onClick={fetchProposals}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-sm font-bold transition-colors"
                  >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh Data
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
                              <span className="font-bold text-gray-400">Loading proposals...</span>
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
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="py-5 px-4 font-mono text-xs text-gray-400">#{p.id}</td>
                            <td className="py-5 px-4">
                              <div className="font-bold text-gray-800">{p.leaving_from}</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">{p.nationality}</div>
                            </td>
                            <td className="py-5 px-4">
                              <div className="font-bold text-gray-800">{p.cities?.[0]?.name || 'N/A'}</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">{p.cities?.length || 0} Cities Total</div>
                            </td>
                            <td className="py-5 px-4">
                              <div className="font-bold text-gray-800">{p.leaving_on}</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">{p.star_rating} Star Hotel</div>
                            </td>
                            <td className="py-5 px-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-wider">
                                <CheckCircle size={12} />
                                Confirmed
                              </span>
                            </td>
                            <td className="py-5 px-4 text-right">
                              <div className="flex justify-end gap-2 transition-opacity">
                                <button className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                                  <Edit2 size={16} />
                                </button>
                                <button className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
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
              </>
            ) : (
              <div className="max-w-2xl mx-auto py-12">
                <div className="text-center mb-12">
                  <Settings className="mx-auto text-gray-300 mb-4" size={48} />
                  <h3 className="text-2xl font-bold text-gray-800">System Data Settings</h3>
                  <p className="text-gray-500">Update global constants and system parameters</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Plane size={18} className="text-blue-500" />
                      Airport Database
                    </h4>
                    <p className="text-sm text-gray-500 mb-6">Currently managing {AIRPORT_DATABASE.length} international airports across the globe.</p>
                    <button 
                      onClick={() => setShowAirportDB(true)}
                      className="w-full py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      Manage Airport List
                    </button>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Building2 size={18} className="text-orange-500" />
                      Hotel Database
                    </h4>
                    <p className="text-sm text-gray-500 mb-6">Currently managing {HOTEL_DATABASE.length} hotels and accommodations globally.</p>
                    <button 
                      onClick={() => setShowHotelDB(true)}
                      className="w-full py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      Manage Hotel List
                    </button>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <MapPin size={18} className="text-green-500" />
                      City Coverage
                    </h4>
                    <p className="text-sm text-gray-500 mb-6">System currently supports {MAJOR_CITIES.length} major tourist destinations.</p>
                    <button className="w-full py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm">
                      Update City Data
                    </button>
                  </div>

                  <div className="bg-[#002B5B] p-8 rounded-3xl text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <h4 className="text-xl font-bold mb-2">Live Update Sync</h4>
                      <p className="text-white/60 text-sm mb-6">Synchronize your local database with the global travel API for latest prices and availability.</p>
                      <button className="bg-yellow-400 text-[#002B5B] px-8 py-3 rounded-xl font-bold text-sm hover:bg-yellow-300 transition-colors">
                        Run Global Sync
                      </button>
                    </div>
                    <RefreshCw className="absolute -right-8 -bottom-8 text-white/5" size={200} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

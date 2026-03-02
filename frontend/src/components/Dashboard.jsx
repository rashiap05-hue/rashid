import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plane, Hotel, MapPin, Calendar, Users, ChevronRight, 
  Star, Globe, ShieldCheck, FileText, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FlightDashboard from './FlightDashboard';
import { api } from '@/App';

export default function Dashboard({ 
  user, 
  onLogout,
  onNewProposal,
  onViewProposal,
  onAdminView,
  activeTab,
  setActiveTab
}) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/proposals');
      setProposals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#1A1A1A]" data-testid="dashboard">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {activeTab === 'Flights' || activeTab === 'Flight Search' ? (
            <FlightDashboard />
          ) : (
            <main className="max-w-7xl mx-auto px-6 py-8">
              {activeTab === 'Home' ? (
                <>
                  {/* Hero Search Section */}
                  <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8" data-testid="search-section">
                    <h2 className="text-2xl font-bold text-[#002B5B] mb-6">Book your Holiday</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Leaving from</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input type="text" placeholder="Dubai" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Destination name</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input type="text" placeholder="Destination name" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Duration</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <select className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm appearance-none bg-white">
                            <option>Any Duration</option>
                            <option>1-3 Days</option>
                            <option>4-7 Days</option>
                            <option>8-14 Days</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Departure Month</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <select className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm appearance-none bg-white">
                            <option>Any</option>
                            <option>March 2026</option>
                            <option>April 2026</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button data-testid="search-button" className="w-full bg-[#002B5B] text-white py-2.5 rounded-lg font-bold hover:bg-[#003d82] transition-all shadow-lg shadow-[#002B5B]/20">
                          SEARCH
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Quick Links Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {[
                      { title: 'Book FIT Package', icon: Users, color: 'bg-blue-50 text-blue-600', onClick: onNewProposal },
                      { title: 'Book Group Tours', icon: Globe, color: 'bg-green-50 text-green-600' },
                      { title: 'Book Private Van Tours', icon: MapPin, color: 'bg-orange-50 text-orange-600' },
                      { title: 'Book Adhoc Groups', icon: Users, color: 'bg-purple-50 text-purple-600' },
                    ].map((item, i) => (
                      <motion.div 
                        key={i}
                        whileHover={{ y: -5 }}
                        onClick={item.onClick}
                        data-testid={`quick-link-${i}`}
                        className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", item.color)}>
                            <item.icon size={24} />
                          </div>
                          <span className="font-bold text-gray-700">{item.title}</span>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-[#002B5B] transition-colors" size={20} />
                      </motion.div>
                    ))}
                  </div>

                  {/* Recent Proposals */}
                  {proposals.length > 0 && (
                    <section className="mb-12">
                      <h3 className="text-xl font-bold text-[#002B5B] mb-6">Recent Proposals</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {proposals.slice(0, 3).map((proposal) => (
                          <div
                            key={proposal.id}
                            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-all"
                            onClick={() => onViewProposal && onViewProposal(proposal.id)}
                            data-testid={`proposal-${proposal.id}`}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="font-bold text-gray-800">{proposal.leaving_from}</div>
                                <div className="text-sm text-gray-500">{proposal.leaving_on}</div>
                              </div>
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-bold",
                                proposal.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                              )}>
                                {proposal.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {proposal.cities?.map(c => c.name).join(' → ')}
                            </div>
                            {proposal.total_price && (
                              <div className="mt-3 text-lg font-bold text-[#002B5B]">
                                AED {proposal.total_price.toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Banner Section */}
                  <div className="relative rounded-2xl overflow-hidden mb-12 h-[400px]">
                    <img 
                      src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&h=400&fit=crop" 
                      alt="Promotion" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center px-12">
                      <div className="max-w-md text-white">
                        <h3 className="text-4xl font-bold mb-4">Booking Day Trips</h3>
                        <p className="text-lg mb-6 opacity-90">Explore the world with our curated day trip packages. Best price guaranteed.</p>
                        <button className="bg-yellow-400 text-[#002B5B] px-8 py-3 rounded-full font-bold hover:bg-yellow-300 transition-colors">
                          BOOK NOW
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats Section */}
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {[
                      { label: 'Groups per year', value: '4,200+', icon: Users },
                      { label: 'Passengers Annually', value: '1,13,000+', icon: Globe },
                      { label: 'Team based in Europe', value: '100+', icon: ShieldCheck },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm text-center">
                        <div className="w-16 h-16 bg-[#002B5B]/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <stat.icon className="text-[#002B5B]" size={32} />
                        </div>
                        <div className="text-3xl font-bold text-[#002B5B] mb-1">{stat.value}</div>
                        <div className="text-gray-500 font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </section>
                </>
              ) : (
                <div className="py-20 text-center bg-white rounded-2xl border border-gray-100">
                  <div className="text-gray-400 font-bold text-xl">{activeTab} Dashboard Coming Soon</div>
                </div>
              )}
            </main>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-[#002B5B] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-[#002B5B] font-bold text-lg">T</div>
              <span className="font-bold text-xl">TRAVO DMC</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Leading B2B travel platform connecting travel agents with direct suppliers worldwide.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6">Quick Links</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Our Services</a></li>
              <li><button onClick={onAdminView} className="hover:text-white transition-colors text-left">Backend Admin Dashboard</button></li>
              <li><a href="/supplier-dashboard" className="hover:text-white transition-colors">Supplier Dashboard</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms & Conditions</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Our Destinations</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li><a href="#" className="hover:text-white transition-colors">Europe</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Indonesia</a></li>
              <li><a href="#" className="hover:text-white transition-colors">United Arab Emirates</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Singapore</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Newsletter</h4>
            <p className="text-sm text-white/60 mb-4">Stay updated with our latest offers.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email address" className="bg-white/10 border border-white/20 rounded px-4 py-2 text-sm w-full outline-none focus:border-white/40" />
              <button className="bg-white text-[#002B5B] px-4 py-2 rounded text-sm font-bold">JOIN</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 text-center text-xs text-white/40">
          © 2026 Travo DMC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

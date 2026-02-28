import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plane, 
  Hotel, 
  Activity, 
  ChevronLeft, 
  Download, 
  Share2, 
  MapPin, 
  Calendar, 
  Clock,
  ArrowRight,
  Info
} from 'lucide-react';

interface Proposal {
  id: number;
  leaving_from: string;
  nationality: string;
  leaving_on: string;
  star_rating: string;
  add_transfers: boolean;
  room_data: any[];
  cities: { name: string; nights: number }[];
  created_at: string;
}

export default function ProposalDetails({ proposalId, onBack }: { proposalId: number; onBack: () => void }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/proposals/${proposalId}`)
      .then(res => res.json())
      .then(data => {
        setProposal(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [proposalId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B]"></div>
      </div>
    );
  }

  if (!proposal) {
    return <div className="p-8 text-center">Proposal not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Itinerary */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Custom Trip Itinerary</h1>
              <p className="text-gray-500 flex items-center gap-2">
                <Calendar size={16} />
                Created on {new Date(proposal.created_at).toLocaleDateString()}
              </p>
            </section>

            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-wrap gap-8">
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Departure</div>
                <div className="font-bold text-gray-800">{proposal.leaving_from}</div>
                <div className="text-sm text-gray-500">
                  {(() => {
                    const [y, m, d] = proposal.leaving_on.split('-').map(Number);
                    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  })()}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Travelers</div>
                <div className="font-bold text-gray-800">{proposal.room_data.length} Room(s)</div>
                <div className="text-sm text-gray-500">{proposal.room_data.reduce((acc, r) => acc + r.adults, 0)} Adults</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Star Rating</div>
                <div className="font-bold text-gray-800">{proposal.star_rating === 'select' ? 'Any' : `${proposal.star_rating} Star`}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Transfers</div>
                <div className="font-bold text-gray-800">{proposal.add_transfers ? 'Included' : 'Not Included'}</div>
              </div>
            </div>

            {/* Itinerary Steps */}
            <div className="space-y-12 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-200">
              {proposal.cities.map((city, idx) => (
                <div key={idx} className="relative pl-12">
                  <div className="absolute left-0 top-0 w-10 h-10 bg-white border-2 border-[#002B5B] rounded-full flex items-center justify-center z-10">
                    <MapPin size={20} className="text-[#002B5B]" />
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{city.name}</h3>
                      <p className="text-gray-500 text-sm font-medium">{city.nights} Night{city.nights > 1 ? 's' : ''} Stay</p>
                    </div>

                    {/* Flight Section */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm group hover:border-blue-200 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                          <Plane size={16} />
                          Recommended Flight
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Best Value</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-lg font-bold text-gray-800">DXB</div>
                          <div className="text-xs text-gray-500">Dubai</div>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div className="text-[10px] text-gray-400 font-bold uppercase">6h 30m</div>
                          <div className="w-full h-px bg-gray-200 relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-300 rounded-full" />
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">Direct</div>
                        </div>
                        <div className="flex-1 text-right">
                          <div className="text-lg font-bold text-gray-800">LHR</div>
                          <div className="text-xs text-gray-500">London</div>
                        </div>
                      </div>
                    </div>

                    {/* Hotel Section */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm group hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-wider mb-4">
                        <Hotel size={16} />
                        Selected Accommodation
                      </div>
                      <div className="flex gap-4">
                        <img 
                          src={`https://picsum.photos/seed/${city.name}/200/200`} 
                          alt="Hotel" 
                          className="w-24 h-24 rounded-lg object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800">Grand Plaza Hotel & Spa</h4>
                          <div className="flex text-yellow-400 my-1">
                            {[...Array(parseInt(proposal.star_rating) || 4)].map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-2">Located in the heart of {city.name}, offering luxury rooms and world-class amenities.</p>
                          <button className="text-blue-600 text-xs font-bold hover:underline">View Details</button>
                        </div>
                      </div>
                    </div>

                    {/* Activities Section */}
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm group hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-4">
                        <Activity size={16} />
                        Top Activities
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 rounded flex items-center justify-center text-emerald-600">
                              <Clock size={18} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-800">City Highlights Tour</div>
                              <div className="text-[10px] text-gray-400">4 Hours • Guided</div>
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-gray-300" />
                        </div>
                        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 rounded flex items-center justify-center text-emerald-600">
                              <Activity size={18} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-800">Local Food Tasting</div>
                              <div className="text-[10px] text-gray-400">3 Hours • Small Group</div>
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-gray-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Pricing & Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Price Summary</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Flights</span>
                  <span className="font-bold text-gray-800">AED 2,450</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Hotels</span>
                  <span className="font-bold text-gray-800">AED 4,120</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Activities</span>
                  <span className="font-bold text-gray-800">AED 850</span>
                </div>
                {proposal.add_transfers && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Transfers</span>
                    <span className="font-bold text-gray-800">AED 320</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Price</span>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#002B5B]">AED 7,740</div>
                    <div className="text-[10px] text-gray-400">Incl. all taxes</div>
                  </div>
                </div>
              </div>

              <button className="w-full bg-[#003366] text-white py-3 rounded-xl font-bold hover:bg-[#00264d] transition-all shadow-lg shadow-blue-900/20 mb-3">
                Book This Trip
              </button>
              <button className="w-full bg-white text-[#003366] py-3 rounded-xl font-bold border border-[#003366] hover:bg-blue-50 transition-all">
                Save for Later
              </button>

              <div className="mt-6 flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <Info size={16} className="text-blue-600 mt-0.5" />
                <p className="text-[10px] text-blue-800 leading-relaxed">
                  Prices are subject to availability at the time of booking. This proposal is valid for 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Printer, 
  MapPin, 
  Calendar, 
  Users, 
  Hotel,
  Plane,
  ChevronRight
} from 'lucide-react';

interface ProposalData {
  cities: { name: string; nights: number }[];
  leavingFrom: string;
  leavingOn: string;
  travelers: string;
  starRating: string;
}

export default function ProposalView({ 
  data, 
  onBack 
}: { 
  data: ProposalData; 
  onBack: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-[#002B5B] text-white p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">Proposal #PR-2026-001</h2>
            <p className="text-xs opacity-70">Created on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Share2 size={16} /> Share
          </button>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download size={16} /> PDF
          </button>
          <button className="flex items-center gap-2 bg-yellow-400 text-[#002B5B] hover:bg-yellow-300 px-6 py-2 rounded-lg text-sm font-bold transition-colors">
            Confirm Booking
          </button>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Itinerary Details */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h3 className="text-lg font-bold text-[#002B5B] mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-blue-500" />
              Itinerary Overview
            </h3>
            <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
              {data.cities.map((city, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-white border-4 border-blue-500 z-10" />
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-800 text-lg">{city.name}</h4>
                        <p className="text-sm text-gray-500">{city.nights} Night{city.nights > 1 ? 's' : ''} Stay</p>
                      </div>
                      <div className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-sm">
                        DAY {data.cities.slice(0, idx).reduce((acc, c) => acc + c.nights, 0) + 1}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Hotel size={14} className="text-gray-400" />
                        {data.starRating === 'select' ? '4' : data.starRating} Star Hotel included
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <MapPin size={14} className="text-gray-400" />
                        Sightseeing included
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="font-bold text-[#002B5B] mb-4">Inclusions</h3>
            <ul className="grid grid-cols-2 gap-3">
              {[
                'Daily Breakfast at Hotels',
                'Private Airport Transfers',
                'Inter-city Train/Coach Tickets',
                'Standard Sightseeing Tours',
                '24/7 On-trip Support',
                'Travel Insurance'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right Column: Summary & Pricing */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-4">Trip Summary</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                  <Plane size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Departure</p>
                  <p className="text-sm font-bold text-gray-700">{data.leavingFrom}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Date</p>
                  <p className="text-sm font-bold text-gray-700">
                    {(() => {
                      const [y, m, d] = data.leavingOn.split('-').map(Number);
                      return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Travelers</p>
                  <p className="text-sm font-bold text-gray-700">{data.travelers}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Package Total</span>
                <span className="text-lg font-bold text-gray-800">AED 12,450</span>
              </div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm text-gray-500">Taxes & Fees</span>
                <span className="text-sm font-bold text-gray-800">Included</span>
              </div>
              <div className="bg-[#002B5B] text-white p-4 rounded-xl text-center">
                <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest mb-1">Total Price</p>
                <p className="text-2xl font-black">AED 12,450</p>
                <p className="text-[10px] opacity-50 mt-1">*Price subject to availability</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
            <p className="text-xs text-yellow-800 leading-relaxed">
              <strong>Note:</strong> This is a customized proposal based on your requirements. Rates are dynamic and may change at the time of booking.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

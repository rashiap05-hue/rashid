import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, 
  Search, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Clock, 
  Filter,
  ChevronDown,
  Info,
  ChevronLeft
} from 'lucide-react';
import { cn } from './lib/utils';
import FlightSearchForm from './components/FlightSearchForm';

const MOCK_FLIGHTS = [
  {
    id: '1',
    airline: 'Emirates',
    logo: 'EK',
    from: 'DXB',
    to: 'TBS',
    departure: '08:30',
    arrival: '11:45',
    duration: '3h 15m',
    price: '1,450',
    type: 'Non-stop',
    class: 'Economy'
  },
  {
    id: '2',
    airline: 'FlyDubai',
    logo: 'FZ',
    from: 'DXB',
    to: 'TBS',
    departure: '14:20',
    arrival: '17:35',
    duration: '3h 15m',
    price: '980',
    type: 'Non-stop',
    class: 'Economy'
  },
  {
    id: '3',
    airline: 'Qatar Airways',
    logo: 'QR',
    from: 'DXB',
    to: 'TBS',
    departure: '06:15',
    arrival: '12:30',
    duration: '6h 15m',
    price: '1,220',
    type: '1 Stop (DOH)',
    class: 'Economy'
  }
];

export default function FlightDashboard() {
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    setLoading(true);
    // Simulate search delay
    setTimeout(() => {
      setLoading(false);
      setShowResults(true);
    }, 1000);
  };

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {!showResults ? (
          <motion.div
            key="search-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {loading ? (
              <div className="min-h-[600px] flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 border-4 border-[#002B5B] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Searching for the best flights...</p>
              </div>
            ) : (
              <FlightSearchForm onSearch={handleSearch} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="search-results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowResults(false)}
                className="flex items-center gap-2 text-gray-500 hover:text-[#002B5B] font-medium transition-colors"
              >
                <ChevronLeft size={20} />
                Back to Search
              </button>
              <h2 className="text-2xl font-bold text-[#002B5B]">Available Flights</h2>
            </div>

            <div className="flex gap-8">
              {/* Filters Sidebar */}
              <aside className="w-64 space-y-6 hidden lg:block">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-800">Filters</h3>
                    <Filter size={16} className="text-gray-400" />
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Stops</label>
                      <div className="space-y-2">
                        {['Non-stop', '1 Stop', '2+ Stops'].map(stop => (
                          <label key={stop} className="flex items-center gap-2 cursor-pointer group">
                            <div className="w-4 h-4 border-2 border-gray-200 rounded group-hover:border-[#002B5B] transition-colors" />
                            <span className="text-sm text-gray-600">{stop}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Airlines</label>
                      <div className="space-y-2">
                        {['Emirates', 'FlyDubai', 'Qatar Airways', 'Turkish Airlines'].map(airline => (
                          <label key={airline} className="flex items-center gap-2 cursor-pointer group">
                            <div className="w-4 h-4 border-2 border-gray-200 rounded group-hover:border-[#002B5B] transition-colors" />
                            <span className="text-sm text-gray-600">{airline}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#002B5B] p-6 rounded-2xl text-white">
                  <Info className="mb-4 text-yellow-400" size={24} />
                  <h4 className="font-bold mb-2">Need Help?</h4>
                  <p className="text-xs text-white/60 mb-4">Our support team is available 24/7 for flight bookings.</p>
                  <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">
                    Contact Support
                  </button>
                </div>
              </aside>

              {/* Flight Results */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 font-medium">{MOCK_FLIGHTS.length} flights found</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#002B5B] cursor-pointer">
                    Sort by: Lowest Price <ChevronDown size={16} />
                  </div>
                </div>

                {MOCK_FLIGHTS.map((flight) => (
                  <motion.div 
                    key={flight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      {/* Airline Info */}
                      <div className="flex items-center gap-4 w-full md:w-48">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-black text-[#002B5B] border border-gray-100">
                          {flight.logo}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{flight.airline}</div>
                          <div className="text-xs text-gray-500">{flight.class}</div>
                        </div>
                      </div>

                      {/* Flight Path */}
                      <div className="flex-1 flex items-center justify-between gap-4 w-full">
                        <div className="text-center">
                          <div className="text-xl font-black text-gray-800">{flight.departure}</div>
                          <div className="text-xs font-bold text-gray-400 uppercase">{flight.from}</div>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{flight.duration}</div>
                          <div className="w-full h-[2px] bg-gray-100 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-200 rounded-full" />
                          </div>
                          <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{flight.type}</div>
                        </div>

                        <div className="text-center">
                          <div className="text-xl font-black text-gray-800">{flight.arrival}</div>
                          <div className="text-xs font-bold text-gray-400 uppercase">{flight.to}</div>
                        </div>
                      </div>

                      {/* Price & Action */}
                      <div className="w-full md:w-48 text-center md:text-right border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-8">
                        <div className="text-xs text-gray-400 font-bold uppercase mb-1">Price per adult</div>
                        <div className="text-2xl font-black text-[#002B5B] mb-3">AED {flight.price}</div>
                        <button className="w-full bg-[#002B5B] text-white py-2.5 rounded-xl font-bold hover:bg-[#003d82] transition-all shadow-lg shadow-[#002B5B]/20">
                          Select Flight
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

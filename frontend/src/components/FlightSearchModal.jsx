import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plane, MapPin, Clock, Loader2 } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { api } from '@/App';

export default function FlightSearchModal({ isOpen, onClose, initialFrom, initialTo, onSelect }) {
  const [tripType, setTripType] = useState('One-way');
  const [cabinClass, setCabinClass] = useState('Economy');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departDate, setDepartDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState(null);
  
  const [airports, setAirports] = useState([]);
  const [filteredFrom, setFilteredFrom] = useState([]);
  const [filteredTo, setFilteredTo] = useState([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fromRef = useRef(null);
  const toRef = useRef(null);

  useEffect(() => {
    fetchAirports();
  }, []);

  useEffect(() => {
    if (initialFrom) setFrom(`${initialFrom} (DXB)`);
    if (initialTo) setTo(initialTo);
  }, [initialFrom, initialTo]);

  const fetchAirports = async () => {
    try {
      const response = await api.get('/airports/');
      setAirports(response.data?.airports || []);
    } catch (error) {
      console.error('Error fetching airports:', error);
    }
  };

  const filterAirports = (query, setter) => {
    const filtered = airports.filter(a => 
      a.name?.toLowerCase().includes(query.toLowerCase()) ||
      a.city?.toLowerCase().includes(query.toLowerCase()) ||
      a.code?.toLowerCase().includes(query.toLowerCase())
    );
    setter(filtered);
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const response = await api.post('/flights/search/', {
        from_airport: from,
        to_airport: to,
        depart_date: departDate?.toISOString().split('T')[0],
        return_date: returnDate?.toISOString().split('T')[0],
        trip_type: tripType,
        cabin_class: cabinClass
      });
      setFlights(response.data?.flights || []);
    } catch (error) {
      console.error('Error searching flights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-start justify-center pt-20 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mb-20 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          data-testid="flight-search-modal"
        >
          <div className="bg-[#002B5B] text-white px-8 py-6 relative">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Plane size={28} />
              Search Flights
            </h2>
            <p className="text-blue-200 mt-1">Find the best flights for your journey</p>
          </div>

          <div className="p-8">
            {/* Trip Type & Cabin Class */}
            <div className="flex gap-4 mb-6">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['One-way', 'Round-trip'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTripType(type)}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                      tripType === type ? 'bg-white shadow text-[#002B5B]' : 'text-gray-500'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <select 
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white"
              >
                <option>Economy</option>
                <option>Business</option>
                <option>First</option>
              </select>
            </div>

            {/* Search Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="relative" ref={fromRef}>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">From</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      filterAirports(e.target.value, setFilteredFrom);
                      setShowFromDropdown(true);
                    }}
                    onFocus={() => {
                      filterAirports(from, setFilteredFrom);
                      setShowFromDropdown(true);
                    }}
                    data-testid="from-input"
                    placeholder="City or Airport"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] outline-none text-sm"
                  />
                </div>
                {showFromDropdown && filteredFrom.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredFrom.slice(0, 10).map((airport) => (
                      <button
                        key={airport.id || airport.code}
                        onClick={() => {
                          setFrom(`${airport.city} (${airport.code})`);
                          setShowFromDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                      >
                        <div className="font-bold text-gray-800">{airport.city}</div>
                        <div className="text-xs text-gray-500">{airport.name} ({airport.code})</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={toRef}>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">To</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      filterAirports(e.target.value, setFilteredTo);
                      setShowToDropdown(true);
                    }}
                    onFocus={() => {
                      filterAirports(to, setFilteredTo);
                      setShowToDropdown(true);
                    }}
                    data-testid="to-input"
                    placeholder="City or Airport"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] outline-none text-sm"
                  />
                </div>
                {showToDropdown && filteredTo.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredTo.slice(0, 10).map((airport) => (
                      <button
                        key={airport.id || airport.code}
                        onClick={() => {
                          setTo(`${airport.city} (${airport.code})`);
                          setShowToDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                      >
                        <div className="font-bold text-gray-800">{airport.city}</div>
                        <div className="text-xs text-gray-500">{airport.name} ({airport.code})</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Depart</label>
                <DatePicker
                  selected={departDate}
                  onChange={(date) => setDepartDate(date)}
                  dateFormat="dd MMM yyyy"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] outline-none text-sm"
                />
              </div>

              {tripType === 'Round-trip' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Return</label>
                  <DatePicker
                    selected={returnDate}
                    onChange={(date) => setReturnDate(date)}
                    dateFormat="dd MMM yyyy"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B] outline-none text-sm"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              data-testid="search-flights-button"
              className="w-full bg-[#002B5B] text-white py-4 rounded-xl font-bold hover:bg-[#003d82] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              {loading ? 'Searching...' : 'Search Flights'}
            </button>

            {/* Results */}
            {searched && (
              <div className="mt-8" data-testid="flight-results">
                <h3 className="font-bold text-gray-800 mb-4">
                  {flights.length > 0 ? `${flights.length} flights found` : 'No flights found'}
                </h3>
                <div className="space-y-4">
                  {flights.map((flight, index) => (
                    <motion.div
                      key={flight.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => {
                        onSelect(flight);
                        onClose();
                      }}
                      data-testid={`flight-option-${index}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-[#002B5B] text-lg">
                            {flight.logo || flight.airline?.[0]}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800">{flight.airline}</div>
                            <div className="text-xs text-gray-500">{flight.type || 'Non-stop'} • {flight.cabin_class}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <div className="font-bold text-lg text-gray-800">{flight.departure_time}</div>
                            <div className="text-xs text-gray-500">{flight.departure_airport}</div>
                          </div>
                          <div className="flex flex-col items-center">
                            <Clock className="text-gray-400 mb-1" size={16} />
                            <div className="text-xs text-gray-500">{flight.duration}</div>
                            <div className="w-20 h-0.5 bg-gray-200 relative my-1">
                              <div className="absolute -right-1 -top-1 w-2 h-2 border-r-2 border-t-2 border-gray-300 transform rotate-45" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-lg text-gray-800">{flight.arrival_time}</div>
                            <div className="text-xs text-gray-500">{flight.arrival_airport}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#002B5B]">AED {flight.price}</div>
                          <div className="text-xs text-gray-500">per person</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Search, ArrowDownUp, Calendar, Users, MapPin, 
  Clock, Filter, Loader2, ChevronDown, Plus, Edit2, Trash2
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { api } from '@/App';

export default function FlightDashboard() {
  const [tripType, setTripType] = useState('One-way');
  const [cabinClass, setCabinClass] = useState('Economy');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departDate, setDepartDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState(null);
  const [passengers, setPassengers] = useState({ adults: 1, children: 0, infants: 0 });
  
  const [airports, setAirports] = useState([]);
  const [filteredFrom, setFilteredFrom] = useState([]);
  const [filteredTo, setFilteredTo] = useState([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [flights, setFlights] = useState([]);
  const [allFlights, setAllFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
  const [sortBy, setSortBy] = useState('price');
  const [viewMode, setViewMode] = useState('search');

  useEffect(() => {
    fetchAirports();
    fetchAllFlights();
  }, []);

  const fetchAirports = async () => {
    try {
      const response = await api.get('/airports');
      setAirports(response.data?.airports || []);
    } catch (error) {
      console.error('Error fetching airports:', error);
    }
  };

  const fetchAllFlights = async () => {
    try {
      const response = await api.get('/flights');
      setAllFlights(response.data?.flights || []);
    } catch (error) {
      console.error('Error fetching all flights:', error);
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

  const swapLocations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const response = await api.post('/flights/search', {
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

  const deleteFlight = async (id) => {
    if (!window.confirm('Delete this flight?')) return;
    try {
      await api.delete(`/flights/${id}`);
      setAllFlights(allFlights.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting flight:', error);
    }
  };

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans" data-testid="flight-dashboard">
      {/* View Toggle */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {['search', 'manage'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg font-bold text-sm capitalize transition-all ${
                viewMode === mode 
                  ? 'bg-[#002B5B] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode === 'search' ? 'Search Flights' : 'Manage Flights'}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'search' ? (
        <>
          {/* Search Hero */}
          <div className="bg-gradient-to-br from-[#002B5B] via-[#003366] to-[#004080] py-12 px-6">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl font-bold text-white mb-8">Find Your Perfect Flight</h1>
              
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                {/* Trip Type */}
                <div className="flex gap-6 mb-6">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {['One-way', 'Round-trip', 'Multi-city'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setTripType(type)}
                        className={`px-5 py-2 rounded-md text-sm font-bold transition-all ${
                          tripType === type ? 'bg-white shadow-md text-[#002B5B]' : 'text-gray-500 hover:text-gray-700'
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
                    <option>Premium Economy</option>
                    <option>Business</option>
                    <option>First</option>
                  </select>
                </div>

                {/* Search Form */}
                <div className="grid grid-cols-12 gap-4 items-end">
                  {/* From */}
                  <div className="col-span-3 relative">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">From</label>
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
                        onBlur={() => setTimeout(() => setShowFromDropdown(false), 200)}
                        placeholder="City or Airport"
                        data-testid="flight-from-input"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] outline-none text-sm"
                      />
                    </div>
                    {showFromDropdown && filteredFrom.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {filteredFrom.slice(0, 8).map((airport) => (
                          <button
                            key={airport.id || airport.code}
                            onMouseDown={() => {
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

                  {/* Swap Button */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={swapLocations}
                      className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <ArrowDownUp className="text-[#002B5B]" size={18} />
                    </button>
                  </div>

                  {/* To */}
                  <div className="col-span-3 relative">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">To</label>
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
                        onBlur={() => setTimeout(() => setShowToDropdown(false), 200)}
                        placeholder="City or Airport"
                        data-testid="flight-to-input"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] outline-none text-sm"
                      />
                    </div>
                    {showToDropdown && filteredTo.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {filteredTo.slice(0, 8).map((airport) => (
                          <button
                            key={airport.id || airport.code}
                            onMouseDown={() => {
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

                  {/* Dates */}
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Depart</label>
                    <DatePicker
                      selected={departDate}
                      onChange={(date) => setDepartDate(date)}
                      dateFormat="dd MMM, EEE"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] outline-none text-sm"
                    />
                  </div>

                  {tripType === 'Round-trip' && (
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Return</label>
                      <DatePicker
                        selected={returnDate}
                        onChange={(date) => setReturnDate(date)}
                        dateFormat="dd MMM, EEE"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] outline-none text-sm"
                      />
                    </div>
                  )}

                  {/* Passengers */}
                  <div className={`${tripType === 'Round-trip' ? 'col-span-1' : 'col-span-2'} relative`}>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Travelers</label>
                    <button
                      onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-left text-sm flex items-center justify-between"
                    >
                      <span>{totalPassengers} Traveler{totalPassengers > 1 ? 's' : ''}</span>
                      <ChevronDown size={16} className="text-gray-400" />
                    </button>
                    {showPassengerDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                        {['adults', 'children', 'infants'].map((type) => (
                          <div key={type} className="flex justify-between items-center py-2">
                            <span className="capitalize text-sm font-medium">{type}</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setPassengers({ ...passengers, [type]: Math.max(type === 'adults' ? 1 : 0, passengers[type] - 1) })}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                              >-</button>
                              <span className="w-6 text-center font-bold">{passengers[type]}</span>
                              <button
                                onClick={() => setPassengers({ ...passengers, [type]: passengers[type] + 1 })}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                              >+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Search Button */}
                  <div className={tripType === 'Round-trip' ? 'col-span-12 md:col-span-12' : 'col-span-1'}>
                    <button
                      onClick={handleSearch}
                      disabled={loading}
                      data-testid="flight-search-button"
                      className="w-full bg-[#E66B31] text-white py-3 rounded-xl font-bold hover:bg-[#d15a24] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                      Search
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          {searched && (
            <div className="max-w-6xl mx-auto px-6 py-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {flights.length > 0 ? `${flights.length} flights found` : 'No flights found'}
                </h2>
                <div className="flex items-center gap-4">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="price">Sort by Price</option>
                    <option value="duration">Sort by Duration</option>
                    <option value="departure">Sort by Departure</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    <Filter size={16} />
                    Filters
                  </button>
                </div>
              </div>

              <div className="space-y-4" data-testid="flight-results">
                {flights.map((flight, index) => (
                  <motion.div
                    key={flight.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all p-6"
                    data-testid={`flight-result-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                          <span className="font-bold text-[#002B5B] text-lg">{flight.logo || flight.airline?.[0]}</span>
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 text-lg">{flight.airline}</div>
                          <div className="text-xs text-gray-500">{flight.type || 'Non-stop'} • {flight.cabin_class}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-12">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-800">{flight.departure_time}</div>
                          <div className="text-sm text-gray-500">{flight.departure_airport}</div>
                        </div>
                        
                        <div className="flex flex-col items-center px-4">
                          <div className="text-xs text-gray-500 mb-1">{flight.duration}</div>
                          <div className="w-32 h-0.5 bg-gray-200 relative">
                            <Plane className="absolute left-1/2 -top-2 -translate-x-1/2 text-[#002B5B] rotate-90" size={14} />
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{flight.type || 'Non-stop'}</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-800">{flight.arrival_time}</div>
                          <div className="text-sm text-gray-500">{flight.arrival_airport}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-3xl font-bold text-[#002B5B]">AED {flight.price}</div>
                        <div className="text-xs text-gray-500 mb-2">per person</div>
                        <button className="bg-[#E66B31] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#d15a24] transition-all">
                          Select
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Manage Flights View */
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Manage Flights Database</h2>
            <button className="bg-[#002B5B] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
              <Plus size={18} />
              Add Flight
            </button>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">Airline</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">Route</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">Time</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase">Price</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allFlights.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No flights in database. Add flights to see them here.
                    </td>
                  </tr>
                ) : (
                  allFlights.map((flight) => (
                    <tr key={flight.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800">{flight.airline}</div>
                        <div className="text-xs text-gray-500">{flight.flight_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-800">{flight.departure_airport} → {flight.arrival_airport}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-800">{flight.departure_time} - {flight.arrival_time}</div>
                        <div className="text-xs text-gray-500">{flight.duration}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#002B5B]">AED {flight.price}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteFlight(flight.id)}
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
        </div>
      )}
    </div>
  );
}

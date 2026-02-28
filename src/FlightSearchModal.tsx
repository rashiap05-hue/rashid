import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, ChevronDown } from 'lucide-react';
import { cn } from './lib/utils';
import { AIRPORTS, MAJOR_CITIES } from './constants';
import AirportAutocomplete from './components/AirportAutocomplete';
import CustomDatePicker from './components/CustomDatePicker';

interface FlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (flight: any) => void;
  initialFrom?: string;
  initialTo?: string;
  initialDepartDate?: string;
  initialReturnDate?: string;
  initialCities?: any[];
}

export default function FlightSearchModal({ 
  isOpen, 
  onClose, 
  onSelect,
  initialFrom, 
  initialTo,
  initialDepartDate,
  initialReturnDate,
  initialCities
}: FlightSearchModalProps) {
  const [tripType, setTripType] = useState('One-way');
  const [cabinClass, setCabinClass] = useState('Economy');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnFrom, setReturnFrom] = useState('');
  const [returnTo, setReturnTo] = useState('');
  const [multiCitySegments, setMultiCitySegments] = useState([
    { id: '1', from: '', to: '', date: '' },
    { id: '2', from: '', to: '', date: '' }
  ]);

  const [showDepartPicker, setShowDepartPicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [activeSegmentPicker, setActiveSegmentPicker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  // Helper to find airport string
  const getAirportString = (cityName: string) => {
    if (!cityName) return '';
    if (cityName.includes('(') && cityName.includes(')')) return cityName;

    const cityInfo = MAJOR_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    const country = cityInfo?.country;

    let airportMatch;
    if (country === "Georgia") {
      airportMatch = AIRPORTS.find(a => a.code === "TBS");
    } else if (country === "United Arab Emirates" || country === "UAE") {
      airportMatch = AIRPORTS.find(a => a.code === "DXB");
    } else {
      airportMatch = AIRPORTS.find((a: any) => a.city.toLowerCase() === cityName.toLowerCase());
      if (!airportMatch && country) {
        airportMatch = AIRPORTS.find(a => a.country === country);
      }
    }

    if (airportMatch) {
      return `${airportMatch.city} (${airportMatch.code}) - ${airportMatch.name}`;
    }
    return cityName;
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Auto-populate based on initial props
      if (initialFrom) {
        setFrom(getAirportString(initialFrom));
      }

      if (initialTo) {
        setTo(getAirportString(initialTo));
      }

      if (initialDepartDate) {
        setDepartDate(initialDepartDate);
      }
      if (initialReturnDate) {
        setReturnDate(initialReturnDate);
        setTripType('Return'); // Default to Return if we have a return date
      }

      // Multi-city auto-population
      if (initialCities && initialCities.length > 1) {
        setTripType('Multi-City');
        const segments: any[] = [];
        let currentDate = initialDepartDate ? new Date(initialDepartDate) : new Date();
        
        // Origin to first city
        segments.push({
          id: '1',
          from: getAirportString(initialFrom || 'Dubai'),
          to: getAirportString(initialCities[0].name),
          date: initialDepartDate || ''
        });

        // Between cities
        for (let i = 0; i < initialCities.length - 1; i++) {
          const prevCity = initialCities[i];
          const nextCity = initialCities[i + 1];
          
          // Add nights to current date
          currentDate.setDate(currentDate.getDate() + (prevCity.nights || 0));
          const y = currentDate.getFullYear();
          const m = String(currentDate.getMonth() + 1).padStart(2, '0');
          const d = String(currentDate.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;

          segments.push({
            id: (i + 2).toString(),
            from: getAirportString(prevCity.name),
            to: getAirportString(nextCity.name),
            date: dateStr
          });
        }

        // Last city back to origin
        const lastCity = initialCities[initialCities.length - 1];
        currentDate.setDate(currentDate.getDate() + (lastCity.nights || 0));
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        segments.push({
          id: (initialCities.length + 1).toString(),
          from: getAirportString(lastCity.name),
          to: getAirportString(initialFrom || 'Dubai'),
          date: dateStr
        });

        setMultiCitySegments(segments);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialFrom, initialTo, initialDepartDate, initialReturnDate, initialCities]);

  const addSegment = () => {
    setMultiCitySegments([...multiCitySegments, { id: Math.random().toString(), from: '', to: '', date: '' }]);
  };

  const removeSegment = (id: string) => {
    if (multiCitySegments.length > 1) {
      setMultiCitySegments(multiCitySegments.filter(s => s.id !== id));
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setResults(null);
    try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          departDate,
          returnDate,
          tripType,
          cabinClass
        })
      });
      const data = await response.json();
      if (data.success) {
        setResults(data.flights);
      }
    } catch (error) {
      console.error('Flight search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tripTypes = ['One-way', 'Return', 'Open Jaw', 'Multi-City'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 py-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[#002B5B]">Select Flight</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          {/* Form Container */}
          <div className="px-8 pb-8 max-h-[calc(100vh-120px)] overflow-y-auto">
            <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
              {/* Trip Type Tabs */}
              <div className="flex gap-2 mb-8">
                {tripTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setTripType(type)}
                    className={cn(
                      "px-6 py-2 rounded-md text-sm font-bold transition-all border",
                      tripType === type 
                        ? "bg-[#6B6B6B] text-white border-[#6B6B6B]" 
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Form Fields */}
              {tripType === 'Multi-City' ? (
                <div className="grid grid-cols-12 gap-8 items-start">
                  {/* Left Side: Segments */}
                  <div className="col-span-8 space-y-4">
                    {multiCitySegments.map((segment, index) => (
                      <div key={segment.id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <AirportAutocomplete
                            value={segment.from}
                            onChange={(val) => {
                              const newSegments = [...multiCitySegments];
                              newSegments[index].from = val;
                              setMultiCitySegments(newSegments);
                            }}
                            placeholder="from"
                          />
                        </div>
                        <div className="flex-1">
                          <AirportAutocomplete
                            value={segment.to}
                            onChange={(val) => {
                              const newSegments = [...multiCitySegments];
                              newSegments[index].to = val;
                              setMultiCitySegments(newSegments);
                            }}
                            placeholder="to"
                          />
                        </div>
                        <div className="w-40 relative">
                          <input 
                            type="text" 
                            placeholder="departure date"
                            readOnly
                            onClick={() => setActiveSegmentPicker(segment.id)}
                            value={segment.date}
                            className="w-full h-12 px-4 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] text-gray-700 cursor-pointer"
                          />
                          <Calendar 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer" 
                            size={18} 
                            onClick={() => setActiveSegmentPicker(segment.id)}
                          />
                          <AnimatePresence>
                            {activeSegmentPicker === segment.id && (
                              <CustomDatePicker
                                value={segment.date}
                                onChange={(val) => {
                                  const newSegments = [...multiCitySegments];
                                  newSegments[index].date = val;
                                  setMultiCitySegments(newSegments);
                                }}
                                onClose={() => setActiveSegmentPicker(null)}
                                className="right-0 left-auto"
                              />
                            )}
                          </AnimatePresence>
                        </div>
                        <button 
                          onClick={() => removeSegment(segment.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={addSegment}
                      className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Add flight
                    </button>
                  </div>

                  {/* Right Side: Class & Search */}
                  <div className="col-span-4 flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-[#002B5B] mb-2">Class</label>
                      <div className="relative">
                        <select 
                          value={cabinClass}
                          onChange={(e) => setCabinClass(e.target.value)}
                          className="w-full h-12 px-4 appearance-none border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] bg-white text-sm"
                        >
                          <option>Economy</option>
                          <option>Premium Economy</option>
                          <option>Business</option>
                          <option>First</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                    <button 
                      onClick={handleSearch}
                      disabled={loading}
                      className="flex-1 h-12 bg-[#002B5B] text-white font-bold rounded-md hover:bg-[#003d82] transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Searching...' : 'Search Flights'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className={cn((tripType === 'Return' || tripType === 'Open Jaw') ? "col-span-2" : "col-span-3")}>
                      <label className="block text-sm font-bold text-[#002B5B] mb-2">From</label>
                      <AirportAutocomplete
                        value={from}
                        onChange={setFrom}
                        placeholder="Departure City"
                      />
                    </div>

                    <div className={cn((tripType === 'Return' || tripType === 'Open Jaw') ? "col-span-2" : "col-span-3")}>
                      <label className="block text-sm font-bold text-[#002B5B] mb-2">To</label>
                      <AirportAutocomplete
                        value={to}
                        onChange={setTo}
                        placeholder="Destination City"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-[#002B5B] mb-2">Depart on</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          readOnly
                          placeholder="YYYY-MM-DD"
                          onClick={() => setShowDepartPicker(!showDepartPicker)}
                          value={departDate}
                          className="w-full h-12 px-4 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] cursor-pointer"
                        />
                        <Calendar 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer" 
                          size={18} 
                          onClick={() => setShowDepartPicker(!showDepartPicker)}
                        />
                        <AnimatePresence>
                          {showDepartPicker && (
                            <CustomDatePicker
                              value={departDate}
                              onChange={setDepartDate}
                              onClose={() => setShowDepartPicker(false)}
                              className="right-0 left-auto"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {(tripType === 'Return' || tripType === 'Open Jaw') && (
                      <div className="col-span-2">
                        <label className="block text-sm font-bold text-[#002B5B] mb-2">Return on</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            readOnly
                            placeholder="YYYY-MM-DD"
                            onClick={() => setShowReturnPicker(!showReturnPicker)}
                            value={returnDate}
                            className="w-full h-12 px-4 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] cursor-pointer"
                          />
                          <Calendar 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer" 
                            size={18} 
                            onClick={() => setShowReturnPicker(!showReturnPicker)}
                          />
                          <AnimatePresence>
                            {showReturnPicker && (
                              <CustomDatePicker
                                value={returnDate}
                                onChange={setReturnDate}
                                onClose={() => setShowReturnPicker(false)}
                                className="right-0 left-auto"
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}

                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-[#002B5B] mb-2">Class</label>
                      <div className="relative">
                        <select 
                          value={cabinClass}
                          onChange={(e) => setCabinClass(e.target.value)}
                          className="w-full h-12 px-4 appearance-none border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] bg-white text-sm"
                        >
                          <option>Economy</option>
                          <option>Premium Economy</option>
                          <option>Business</option>
                          <option>First</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      </div>
                    </div>

                    <div className="col-span-2">
                      <button 
                        onClick={handleSearch}
                        disabled={loading}
                        className="w-full h-12 bg-[#002B5B] text-white font-bold rounded-md hover:bg-[#003d82] transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Searching...' : 'Search Flights'}
                      </button>
                    </div>
                  </div>

                  {tripType === 'Open Jaw' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid grid-cols-12 gap-4 items-end"
                    >
                      <div className="col-span-2">
                        <label className="block text-sm font-bold text-[#002B5B] mb-2">Return from</label>
                        <AirportAutocomplete
                          value={returnFrom}
                          onChange={setReturnFrom}
                          placeholder="Return From"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-bold text-[#002B5B] mb-2">Return to</label>
                        <AirportAutocomplete
                          value={returnTo}
                          onChange={setReturnTo}
                          placeholder="Return To"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Flight Results */}
            <AnimatePresence>
              {results && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 space-y-4"
                >
                  <h3 className="text-lg font-bold text-[#002B5B] mb-4">Available Flights</h3>
                  {results.map((flight) => (
                    <div 
                      key={flight.id}
                      className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center font-black text-[#002B5B] border border-gray-100">
                          {flight.logo}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{flight.airline}</div>
                          <div className="text-xs text-gray-500">{flight.departure} - {flight.arrival} ({flight.duration})</div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
                          <div className="text-xs text-gray-400 font-bold uppercase mb-1">Price</div>
                          <div className="text-xl font-black text-[#002B5B]">AED {flight.price}</div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              if (onSelect) {
                                onSelect(flight);
                              }
                              onClose();
                            }}
                            className="bg-[#002B5B] text-white px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#003d82] transition-all"
                          >
                            Select Flight
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Actions */}
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleSearch}
                disabled={loading}
                className="bg-[#E66B31] text-white px-8 py-2.5 rounded-lg font-bold text-sm hover:bg-[#d15a24] transition-all shadow-md disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Do Live Search'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

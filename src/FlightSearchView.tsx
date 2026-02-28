import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  ArrowUpDown,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from './lib/utils';

interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  departureCode: string;
  arrivalCode: string;
  duration: string;
  price: number;
  class: 'Economy' | 'Business' | 'First';
  stops: number;
}

const MOCK_FLIGHTS: Flight[] = [
  { id: '1', airline: 'Emirates', flightNumber: 'EK 2391', departureTime: '08:30', arrivalTime: '11:45', departureAirport: 'Dubai Intl', arrivalAirport: 'Tbilisi Intl', departureCode: 'DXB', arrivalCode: 'TBS', duration: '3h 15m', price: 1250, class: 'Economy', stops: 0 },
  { id: '2', airline: 'FlyDubai', flightNumber: 'FZ 713', departureTime: '14:15', arrivalTime: '17:35', departureAirport: 'Dubai Intl', arrivalAirport: 'Tbilisi Intl', departureCode: 'DXB', arrivalCode: 'TBS', duration: '3h 20m', price: 980, class: 'Economy', stops: 0 },
  { id: '3', airline: 'Qatar Airways', flightNumber: 'QR 356', departureTime: '10:00', arrivalTime: '16:20', departureAirport: 'Dubai Intl', arrivalAirport: 'Tbilisi Intl', departureCode: 'DXB', arrivalCode: 'TBS', duration: '6h 20m', price: 1100, class: 'Economy', stops: 1 },
  { id: '4', airline: 'Turkish Airlines', flightNumber: 'TK 1902', departureTime: '06:45', arrivalTime: '13:10', departureAirport: 'Dubai Intl', arrivalAirport: 'Tbilisi Intl', departureCode: 'DXB', arrivalCode: 'TBS', duration: '6h 25m', price: 1050, class: 'Economy', stops: 1 },
  { id: '5', airline: 'Emirates', flightNumber: 'EK 2395', departureTime: '22:10', arrivalTime: '01:25', departureAirport: 'Dubai Intl', arrivalAirport: 'Tbilisi Intl', departureCode: 'DXB', arrivalCode: 'TBS', duration: '3h 15m', price: 1450, class: 'Business', stops: 0 },
  { id: '6', airline: 'Air Arabia', flightNumber: 'G9 291', departureTime: '11:30', arrivalTime: '14:50', departureAirport: 'Sharjah Intl', arrivalAirport: 'Tbilisi Intl', departureCode: 'SHJ', arrivalCode: 'TBS', duration: '3h 20m', price: 850, class: 'Economy', stops: 0 },
  { id: '7', airline: 'FlyDubai', flightNumber: 'FZ 715', departureTime: '19:45', arrivalTime: '23:05', departureAirport: 'Dubai Intl', arrivalAirport: 'Tbilisi Intl', departureCode: 'DXB', arrivalCode: 'TBS', duration: '3h 20m', price: 1020, class: 'Economy', stops: 0 },
  { id: '8', airline: 'Lufthansa', flightNumber: 'LH 631', departureTime: '02:15', arrivalTime: '10:45', departureAirport: 'Dubai Intl', arrivalAirport: 'Tbilisi Intl', departureCode: 'DXB', arrivalCode: 'TBS', duration: '8h 30m', price: 1800, class: 'Economy', stops: 1 },
];

export default function FlightSearchView() {
  const [departure, setDeparture] = useState('Dubai');
  const [destination, setDestination] = useState('Tbilisi');
  const [date, setDate] = useState('2026-03-21');
  const [seatClass, setSeatClass] = useState<'Economy' | 'Business' | 'First'>('Economy');
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'departure'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredFlights = useMemo(() => {
    return MOCK_FLIGHTS
      .filter(f => f.class === seatClass)
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'price') comparison = a.price - b.price;
        if (sortBy === 'duration') comparison = a.duration.localeCompare(b.duration);
        if (sortBy === 'departure') comparison = a.departureTime.localeCompare(b.departureTime);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [seatClass, sortBy, sortOrder]);

  const paginatedFlights = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFlights.slice(start, start + itemsPerPage);
  }, [filteredFlights, currentPage]);

  const totalPages = Math.ceil(filteredFlights.length / itemsPerPage);

  const toggleSort = (key: 'price' | 'duration' | 'departure') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Plane size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#002B5B]">Search Flights</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Find the best deals worldwide</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Leaving From</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Destination</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Departure Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium" 
              />
            </div>
          </div>
          <div className="flex items-end">
            <button className="w-full bg-[#002B5B] text-white py-3 rounded-xl font-black hover:bg-[#003d82] transition-all shadow-lg shadow-[#002B5B]/20 flex items-center justify-center gap-2">
              <Search size={18} />
              SEARCH FLIGHTS
            </button>
          </div>
        </div>
      </section>

      {/* Filters & Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-2">Filters:</span>
          <div className="flex gap-2">
            {(['Economy', 'Business', 'First'] as const).map((cls) => (
              <button
                key={cls}
                onClick={() => setSeatClass(cls)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                  seatClass === cls 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                )}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sort By:</span>
          <div className="flex gap-4">
            {[
              { label: 'Price', key: 'price' as const },
              { label: 'Duration', key: 'duration' as const },
              { label: 'Departure', key: 'departure' as const },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => toggleSort(item.key)}
                className={cn(
                  "flex items-center gap-1 text-xs font-bold transition-colors",
                  sortBy === item.key ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {item.label}
                {sortBy === item.key && (
                  sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Flight Results */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {paginatedFlights.map((flight) => (
            <motion.div
              key={flight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
            >
              <div className="p-6 flex flex-col lg:flex-row items-center gap-8">
                {/* Airline Info */}
                <div className="w-full lg:w-48 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Plane size={24} className="text-gray-300 group-hover:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-black text-gray-800">{flight.airline}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{flight.flightNumber}</p>
                  </div>
                </div>

                {/* Flight Path */}
                <div className="flex-1 w-full grid grid-cols-3 gap-4">
                  <div className="text-center lg:text-left">
                    <p className="text-2xl font-black text-[#002B5B]">{flight.departureTime}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Local Time (GST)</p>
                    <p className="text-xs font-bold text-gray-500">{flight.departureCode}</p>
                    <p className="text-[10px] text-gray-400 truncate">{flight.departureAirport}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{flight.duration}</p>
                    <div className="w-full h-px bg-gray-200 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border-2 border-blue-500" />
                    </div>
                    <p className={cn(
                      "text-[10px] font-bold mt-1 uppercase tracking-widest",
                      flight.stops === 0 ? "text-green-500" : "text-orange-500"
                    )}>
                      {flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop`}
                    </p>
                  </div>
                  <div className="text-center lg:text-right">
                    <p className="text-2xl font-black text-[#002B5B]">{flight.arrivalTime}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Local Time (GET)</p>
                    <p className="text-xs font-bold text-gray-500">{flight.arrivalCode}</p>
                    <p className="text-[10px] text-gray-400 truncate">{flight.arrivalAirport}</p>
                  </div>
                </div>

                {/* Price & Action */}
                <div className="w-full lg:w-48 flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-4 lg:border-l lg:border-gray-100 lg:pl-8">
                  <div className="text-right lg:text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Price from</p>
                    <p className="text-2xl font-black text-[#002B5B]">AED {flight.price}</p>
                  </div>
                  <button className="bg-[#002B5B] text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-[#003d82] transition-all flex items-center gap-2">
                    BOOK NOW
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredFlights.length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center">
            <Info size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800">No flights found</h3>
            <p className="text-sm text-gray-400">Try adjusting your filters or search criteria</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={cn(
                "w-10 h-10 rounded-lg font-bold text-sm transition-all",
                currentPage === i + 1 
                  ? "bg-[#002B5B] text-white shadow-lg shadow-[#002B5B]/20" 
                  : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
              )}
            >
              {i + 1}
            </button>
          ))}
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

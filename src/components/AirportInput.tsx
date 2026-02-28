import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Plane, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { AIRPORT_DATABASE, Airport } from '../data/airports';

interface AirportInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: 'map-pin' | 'plane';
  className?: string;
}

export default function AirportInput({ 
  label, 
  value, 
  onChange, 
  placeholder = "Search city or airport...", 
  icon = 'map-pin',
  className
}: AirportInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [filteredAirports, setFilteredAirports] = useState<Airport[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setIsOpen(true);

    if (term.length > 1) {
      const filtered = AIRPORT_DATABASE.filter(airport => 
        airport.location.toLowerCase().includes(term.toLowerCase()) ||
        airport.airport.toLowerCase().includes(term.toLowerCase()) ||
        airport.iata.toLowerCase().includes(term.toLowerCase())
      ).slice(0, 10);
      setFilteredAirports(filtered);
    } else {
      setFilteredAirports([]);
    }
    
    // Also update parent state if user is typing manually
    onChange(term);
  };

  const handleSelect = (airport: Airport) => {
    const displayValue = `${airport.location} (${airport.iata})`;
    setSearchTerm(displayValue);
    onChange(displayValue);
    setIsOpen(false);
  };

  return (
    <div className={cn("space-y-1.5 relative", className)} ref={wrapperRef}>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {icon === 'map-pin' ? (
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        ) : (
          <Plane className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" size={18} />
        )}
        <input 
          type="text" 
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] outline-none transition-all text-sm font-medium"
        />
        {searchTerm && (
          <button 
            onClick={() => { setSearchTerm(''); onChange(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && filteredAirports.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-64 overflow-y-auto py-2">
          {filteredAirports.map((airport, index) => (
            <button
              key={`${airport.iata}-${index}`}
              onClick={() => handleSelect(airport)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-[#002B5B] group-hover:bg-white transition-colors">
                  <Plane size={14} />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">{airport.location}</div>
                  <div className="text-[10px] text-gray-400 font-medium uppercase">{airport.airport}</div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-[#002B5B] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {airport.iata}
                </span>
                <span className="text-[9px] text-gray-300 font-bold uppercase mt-1">{airport.country}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

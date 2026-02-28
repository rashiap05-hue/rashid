import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { AIRPORTS } from '../constants';

interface AirportAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
}

export default function AirportAutocomplete({ 
  value, 
  onChange, 
  placeholder,
  className 
}: AirportAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredAirports = AIRPORTS.filter(airport => {
    const search = searchTerm.toLowerCase();
    return (airport.name?.toLowerCase() || "").includes(search) ||
           (airport.city?.toLowerCase() || "").includes(search) ||
           (airport.code?.toLowerCase() || "").includes(search);
  }).slice(0, 10);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update internal search term when external value changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative">
        <input 
          type="text" 
          placeholder={placeholder}
          className="w-full h-12 px-4 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] text-sm"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
      </div>
      
      <AnimatePresence>
        {isOpen && filteredAirports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[300] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          >
            {filteredAirports.map((airport, idx) => (
              <button
                key={idx}
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between group transition-colors"
                onClick={() => {
                  const displayValue = `${airport.city} (${airport.code}) - ${airport.name}`;
                  setSearchTerm(displayValue);
                  onChange(displayValue);
                  setIsOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800">{airport.city} ({airport.code})</span>
                  <span className="text-[10px] text-gray-400 group-hover:text-gray-500">{airport.name}, {airport.country}</span>
                </div>
                <ChevronDown className="-rotate-90 text-gray-300 group-hover:text-[#002B5B]" size={14} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

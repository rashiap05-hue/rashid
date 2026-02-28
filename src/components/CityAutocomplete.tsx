import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { MAJOR_CITIES } from '../constants';

interface CityAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
}

export default function CityAutocomplete({ 
  value, 
  onChange, 
  placeholder,
  className 
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCities = MAJOR_CITIES.filter(city => {
    const search = searchTerm.toLowerCase();
    return (city.name?.toLowerCase() || "").includes(search) ||
           (city.country?.toLowerCase() || "").includes(search);
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
          className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-gray-300 outline-none text-sm"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
      </div>
      
      <AnimatePresence>
        {isOpen && filteredCities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[110] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
          >
            {filteredCities.map((city, idx) => (
              <button
                key={idx}
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between group transition-colors"
                onClick={() => {
                  setSearchTerm(city.name);
                  onChange(city.name);
                  setIsOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800">{city.name}</span>
                  <span className="text-[10px] text-gray-400 group-hover:text-gray-500">{city.country}</span>
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

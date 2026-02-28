import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Calendar, 
  Users, 
  MapPin, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Search
} from 'lucide-react';
import { cn } from './lib/utils';
import { MAJOR_CITIES, NATIONALITIES, AIRPORTS } from './constants';
import AirportAutocomplete from './components/AirportAutocomplete';
import CityAutocomplete from './components/CityAutocomplete';
import CustomDatePicker from './components/CustomDatePicker';

// ... (TravelerPicker component remains same)

interface City {
  id: string;
  name: string;
  nights: number;
}

interface RoomData {
  adults: number;
  children: { age: string }[];
}

function TravelerPicker({ 
  rooms, 
  onUpdate 
}: { 
  rooms: RoomData[]; 
  onUpdate: (rooms: RoomData[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalAdults = rooms.reduce((acc, r) => acc + r.adults, 0);
  const totalChildren = rooms.reduce((acc, r) => acc + r.children.length, 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateRoom = (idx: number, field: keyof RoomData, value: any) => {
    const newRooms = [...rooms];
    newRooms[idx] = { ...newRooms[idx], [field]: value };
    onUpdate(newRooms);
  };

  const addRoom = () => {
    onUpdate([...rooms, { adults: 2, children: [] }]);
  };

  const removeRoom = () => {
    if (rooms.length > 1) {
      onUpdate(rooms.slice(0, -1));
    }
  };

  const childAges = ["<2 yrs", "2 yrs", "3 yrs", "4 yrs", "5 yrs", "6 yrs", "7 yrs", "8 yrs", "9 yrs", "10 yrs", "11 yrs"];

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-200 rounded text-left text-sm bg-white flex justify-between items-center"
      >
        <span>{rooms.length} room{rooms.length > 1 ? 's' : ''}, {totalAdults} adult{totalAdults > 1 ? 's' : ''}</span>
        <ChevronDown className={cn("text-gray-400 transition-transform", isOpen && "rotate-180")} size={14} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-[120] left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-3 space-y-4">
              {/* Rooms Header */}
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="font-bold text-gray-800 text-sm">Rooms</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button type="button" onClick={removeRoom} className="px-2 py-0.5 hover:bg-gray-50 text-gray-400 border-r border-gray-200">-</button>
                  <span className="px-3 py-0.5 font-medium text-xs">{rooms.length}</span>
                  <button type="button" onClick={addRoom} className="px-2 py-0.5 hover:bg-gray-50 text-gray-400 border-l border-gray-200">+</button>
                </div>
              </div>

              {/* Room Details */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {rooms.map((room, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="text-[10px] font-bold text-[#002B5B] uppercase tracking-wider">Room {idx + 1}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500">Adults(12+)</label>
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button 
                            type="button" 
                            onClick={() => updateRoom(idx, 'adults', Math.max(1, room.adults - 1))} 
                            className="px-2 py-0.5 hover:bg-gray-50 text-gray-400 border-r border-gray-200"
                          >-</button>
                          <span className="flex-1 text-center py-0.5 font-medium text-xs">{room.adults}</span>
                          <button 
                            type="button" 
                            onClick={() => updateRoom(idx, 'adults', room.adults + 1)} 
                            className="px-2 py-0.5 hover:bg-gray-50 text-gray-400 border-l border-gray-200"
                          >+</button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500">Children</label>
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button 
                            type="button" 
                            onClick={() => updateRoom(idx, 'children', room.children.slice(0, -1))} 
                            className="px-2 py-0.5 hover:bg-gray-50 text-gray-400 border-r border-gray-200"
                          >-</button>
                          <span className="flex-1 text-center py-0.5 font-medium text-xs">{room.children.length}</span>
                          <button 
                            type="button" 
                            onClick={() => updateRoom(idx, 'children', [...room.children, { age: "<2 yrs" }])} 
                            className="px-2 py-0.5 hover:bg-gray-50 text-gray-400 border-l border-gray-200"
                          >+</button>
                        </div>
                      </div>
                    </div>

                    {room.children.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {room.children.map((child, cIdx) => (
                          <div key={cIdx} className="relative">
                            <select 
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs appearance-none bg-white focus:ring-1 focus:ring-[#002B5B] outline-none"
                              value={child.age}
                              onChange={(e) => {
                                const newChildren = [...room.children];
                                newChildren[cIdx] = { age: e.target.value };
                                updateRoom(idx, 'children', newChildren);
                              }}
                            >
                              {childAges.map(age => <option key={age} value={age}>{age}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-gray-50 flex justify-end">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-white transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FitPackageForm({ 
  onClose,
  onCreateSuccess,
  initialData
}: { 
  onClose: () => void;
  onCreateSuccess: (data: any) => void;
  initialData?: any;
}) {
  const [cities, setCities] = useState<City[]>(initialData?.rawCities || [{ id: '1', name: '', nights: 1 }]);
  const [leavingFrom, setLeavingFrom] = useState(initialData?.leavingFrom || 'Dubai');
  const [nationality, setNationality] = useState(initialData?.nationality || 'United Arab Emirates');
  const [leavingOn, setLeavingOn] = useState(initialData?.leavingOn || '2026-04-09');
  const [roomData, setRoomData] = useState<RoomData[]>(initialData?.roomData || [{ adults: 2, children: [] }]);
  const [starRating, setStarRating] = useState(initialData?.starRating || 'select');
  const [addTransfers, setAddTransfers] = useState(initialData?.addTransfers !== undefined ? initialData.addTransfers : true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const dateInputRef = useRef<HTMLDivElement>(null);

  const addCity = () => {
    setCities([...cities, { id: Math.random().toString(), name: '', nights: 1 }]);
  };

  const removeCity = (id: string) => {
    if (cities.length > 1) {
      setCities(cities.filter(c => c.id !== id));
    }
  };

  const updateCity = (id: string, field: keyof City, value: any) => {
    setCities(cities.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Ensure all city names are filled
    const emptyCities = cities.filter(c => !c.name.trim());
    if (emptyCities.length > 0) {
      setErrors(['Please enter a city name for all stops.']);
      return;
    }
    
    setErrors([]);
    setIsCalculating(true);
    // Simulate calculation
    setTimeout(() => {
      setIsCalculating(false);
      const totalAdults = roomData.reduce((acc, r) => acc + r.adults, 0);
      const totalChildren = roomData.reduce((acc, r) => acc + r.children.length, 0);
      const travelersSummary = `${roomData.length} room - ${totalAdults} adults${totalChildren > 0 ? ` and ${totalChildren} children` : ''}`;

      const proposalData = {
        cities: cities.map(c => ({ name: c.name, nights: c.nights })),
        rawCities: cities, // Keep IDs for restoration
        leavingFrom,
        leavingOn,
        nationality,
        roomData,
        addTransfers,
        travelers: `${roomData.length} Room(s), ${totalAdults} Adults`,
        travelersSummary,
        starRating
      };
      onCreateSuccess(proposalData);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-[520px] rounded shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center relative">
          <h2 className="text-xl font-bold text-[#002B5B]">Change Trip Details</h2>
          <button onClick={onClose} className="absolute -right-2 -top-2 bg-black text-white rounded-full p-1 hover:bg-gray-800 transition-colors shadow-lg z-[110]">
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleCreateProposal} className="space-y-6">
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded font-bold">
                {errors[0]}
              </div>
            )}
            {/* Destinations Section */}
            <section className="space-y-4">
              <h3 className="font-bold text-[#002B5B] uppercase text-xs tracking-wider">DESTINATIONS</h3>
              <p className="text-sm text-gray-600">Enter the cities below in the order in which they will be visited for the itinerary:</p>
              
              <div className="space-y-4 pt-2">
                {cities.map((city, index) => (
                  <div key={city.id} className="flex gap-3 items-center">
                    <div className="flex items-center gap-2 text-gray-400 cursor-grab">
                      <div className="flex flex-col gap-1">
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      <CityAutocomplete 
                        placeholder="City Name"
                        value={city.name}
                        onChange={(val) => updateCity(city.id, 'name', val)}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                        <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />
                        <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />
                        <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />
                      </div>
                    </div>
                    <div className="w-32 relative">
                      <select 
                        className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-gray-300 outline-none text-sm appearance-none bg-white font-medium"
                        value={city.nights}
                        onChange={(e) => updateCity(city.id, 'nights', parseInt(e.target.value))}
                      >
                        {[...Array(14)].map((_, i) => (
                          <option key={i+1} value={i+1}>{i+1} night{i > 0 ? 's' : ''}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeCity(city.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={20} className="border border-gray-300 rounded-full p-0.5" />
                    </button>
                  </div>
                ))}
              </div>
              
              <button 
                type="button" 
                onClick={addCity}
                className="text-[#0066cc] text-sm font-medium flex items-center gap-1 hover:underline pl-8"
              >
                + Add Another City
              </button>
            </section>

            <div className="border-t border-gray-100" />

            {/* Trip Details Section */}
            <section className="space-y-6">
              <h3 className="font-bold text-[#002B5B] uppercase text-xs tracking-wider">TRIP DETAILS</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Leaving From</label>
                  <AirportAutocomplete 
                    placeholder="Dubai"
                    value={leavingFrom}
                    onChange={(val) => setLeavingFrom(val)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Nationality*</label>
                  <div className="relative">
                    <select 
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-gray-300 outline-none text-sm bg-white appearance-none"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                    >
                      {NATIONALITIES.map((nat) => (
                        <option key={nat} value={nat}>{nat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-medium text-gray-700">Leaving on*</label>
                  <div className="relative flex items-center" ref={dateInputRef}>
                    <input 
                      type="text" 
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-gray-300 outline-none text-sm cursor-pointer"
                      value={(() => {
                        try {
                          const [year, month, day] = leavingOn.split('-').map(Number);
                          const d = new Date(year, month - 1, day);
                          if (isNaN(d.getTime())) return leavingOn;
                          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        } catch (e) {
                          return leavingOn;
                        }
                      })()}
                      onClick={() => setShowDatePicker(!showDatePicker)}
                    />
                    <Calendar 
                      className="absolute right-3 text-gray-600 cursor-pointer" 
                      size={18} 
                      onClick={() => setShowDatePicker(!showDatePicker)}
                    />
                    
                    <AnimatePresence>
                      {showDatePicker && (
                        <CustomDatePicker 
                          value={leavingOn}
                          onChange={(val) => setLeavingOn(val)}
                          onClose={() => setShowDatePicker(false)}
                          className="top-0 left-0 mt-10"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Number of Travelers*</label>
                  <TravelerPicker 
                    rooms={roomData}
                    onUpdate={(newRooms) => setRoomData(newRooms)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Star rating</label>
                  <div className="relative">
                    <select 
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-1 focus:ring-gray-300 outline-none text-sm bg-white appearance-none"
                      value={starRating}
                      onChange={(e) => setStarRating(e.target.value)}
                    >
                      <option value="select">select</option>
                      <option value="3">3 Star</option>
                      <option value="4">4 Star</option>
                      <option value="5">5 Star</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input 
                    type="checkbox" 
                    id="transfers"
                    className="w-4 h-4 text-[#002B5B] border-gray-300 rounded focus:ring-[#002B5B]"
                    checked={addTransfers}
                    onChange={(e) => setAddTransfers(e.target.checked)}
                  />
                  <label htmlFor="transfers" className="text-sm text-gray-700">Add Transfers</label>
                </div>
              </div>
            </section>

            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                className="bg-[#003366] text-white px-8 py-2.5 rounded font-bold text-sm hover:bg-[#00264d] transition-all shadow-md"
              >
                Create Proposal
              </button>
            </div>
          </form>
        </div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isCalculating && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-gray-100 rounded-full" />
                <div className="w-20 h-20 border-4 border-[#002B5B] border-t-transparent rounded-full animate-spin absolute inset-0" />
              </div>
              <p className="mt-6 text-xl font-bold text-[#002B5B]">Re-calculating Price...</p>
              <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the best rates for you.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

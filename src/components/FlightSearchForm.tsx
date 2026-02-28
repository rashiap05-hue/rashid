import React, { useState } from 'react';
import { motion } from 'motion/react';
import DatePicker from 'react-datepicker';
import { 
  Plane, 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  ChevronDown, 
  Search,
  HelpCircle,
  X,
  Globe
} from 'lucide-react';
import { cn } from '../lib/utils';
import AirportInput from './AirportInput';

export default function FlightSearchForm({ onSearch }: { onSearch: () => void }) {
  const [tripType, setTripType] = useState('Return');
  const [mainTab, setMainTab] = useState('Flights');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departDate, setDepartDate] = useState<Date | null>(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(new Date());
  const [multiCityRows, setMultiCityRows] = useState([
    { from: '', to: '', date: new Date() },
    { from: '', to: '', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
  ]);

  const addMultiCityRow = () => {
    if (multiCityRows.length < 5) {
      const lastDate = multiCityRows[multiCityRows.length - 1].date;
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 7);
      setMultiCityRows([...multiCityRows, { from: '', to: '', date: nextDate }]);
    }
  };

  const removeMultiCityRow = (index: number) => {
    if (multiCityRows.length > 2) {
      setMultiCityRows(multiCityRows.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="relative min-h-[600px] rounded-3xl overflow-hidden shadow-2xl">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://picsum.photos/seed/flight-bg/1920/1080" 
          alt="Flight background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-12">
        <h1 className="text-4xl font-medium text-white mb-8 drop-shadow-md">Book Flights</h1>

        <div className="max-w-4xl">
          {/* Main Tabs */}
          <div className="flex mb-0">
            <button 
              onClick={() => setMainTab('Flights')}
              className={cn(
                "px-8 py-3 flex items-center gap-2 font-medium transition-all rounded-t-xl",
                mainTab === 'Flights' 
                  ? "bg-white text-gray-800" 
                  : "bg-black/20 text-white hover:bg-black/30 backdrop-blur-sm"
              )}
            >
              <Plane size={18} />
              Flights
            </button>
            <button 
              onClick={() => setMainTab('Series Flights')}
              className={cn(
                "px-8 py-3 flex items-center gap-2 font-medium transition-all rounded-t-xl",
                mainTab === 'Series Flights' 
                  ? "bg-white text-gray-800" 
                  : "bg-black/20 text-white hover:bg-black/30 backdrop-blur-sm"
              )}
            >
              <Plane size={18} className="rotate-45" />
              Series Flights
            </button>
          </div>

          {/* Search Card */}
          <div className="bg-white p-8 rounded-b-xl rounded-tr-xl shadow-2xl">
            {/* Trip Type Sub-tabs */}
            <div className="flex gap-2 mb-8">
              {['One-way', 'Return', 'Open Jaw', 'Multi-City'].map((type) => (
                <button
                  key={type}
                  onClick={() => setTripType(type)}
                  className={cn(
                    "px-6 py-2 rounded text-sm font-medium transition-all border",
                    tripType === type 
                      ? "bg-[#4A4A4A] text-white border-[#4A4A4A]" 
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            {tripType === 'Multi-City' ? (
              <div className="space-y-4 mb-8">
                {multiCityRows.map((row, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-4">
                      <AirportInput 
                        label="From"
                        value={row.from}
                        onChange={(val) => {
                          const newRows = [...multiCityRows];
                          newRows[index].from = val;
                          setMultiCityRows(newRows);
                        }}
                        placeholder="Departure City"
                        icon="map-pin"
                      />
                    </div>
                    <div className="col-span-4">
                      <AirportInput 
                        label="To"
                        value={row.to}
                        onChange={(val) => {
                          const newRows = [...multiCityRows];
                          newRows[index].to = val;
                          setMultiCityRows(newRows);
                        }}
                        placeholder="Destination City"
                        icon="plane"
                      />
                    </div>
                    <div className="col-span-3 space-y-1.5">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Depart on</label>
                      <div className="relative date-picker-container">
                        <DatePicker
                          selected={row.date}
                          onChange={(date) => {
                            const newRows = [...multiCityRows];
                            if (date) newRows[index].date = date;
                            setMultiCityRows(newRows);
                          }}
                          dateFormat="dd MMM yyyy"
                          className="w-full px-4 py-3 border border-gray-200 rounded focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] outline-none transition-all text-sm font-medium"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-center pb-1">
                      {multiCityRows.length > 2 && (
                        <button 
                          onClick={() => removeMultiCityRow(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button 
                  onClick={addMultiCityRow}
                  className="text-[#002B5B] text-sm font-bold hover:underline flex items-center gap-1"
                >
                  + Add Another Flight
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <AirportInput 
                    label="From"
                    value={from}
                    onChange={setFrom}
                    placeholder="Departure City"
                    icon="map-pin"
                  />
                  <AirportInput 
                    label="To"
                    value={to}
                    onChange={setTo}
                    placeholder="Destination City"
                    icon="plane"
                  />
                </div>

                <div className={cn(
                  "grid gap-6 mb-6",
                  tripType === 'One-way' ? "grid-cols-1" : "grid-cols-2"
                )}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Depart on</label>
                    <div className="relative date-picker-container">
                      <DatePicker
                        selected={departDate}
                        onChange={(date) => setDepartDate(date)}
                        dateFormat="dd MMM yyyy"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] outline-none transition-all text-sm font-medium"
                      />
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>
                  </div>
                  {tripType !== 'One-way' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Return on</label>
                      <div className="relative date-picker-container">
                        <DatePicker
                          selected={returnDate}
                          onChange={(date) => setReturnDate(date)}
                          dateFormat="dd MMM yyyy"
                          minDate={departDate || undefined}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] outline-none transition-all text-sm font-medium"
                        />
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Number of Travelers</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] outline-none transition-all appearance-none bg-white">
                    <option>1 adult</option>
                    <option>2 adults</option>
                    <option>3 adults</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Class</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] outline-none transition-all appearance-none bg-white">
                    <option>Economy</option>
                    <option>Business</option>
                    <option>First</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Routing</label>
                <div className="relative">
                  <select className="w-full px-4 py-3 border border-gray-200 rounded focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] outline-none transition-all appearance-none bg-white">
                    <option>All</option>
                    <option>Direct Only</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-medium text-gray-700">Airlines</label>
                  <HelpCircle size={14} className="text-gray-400 cursor-help" />
                </div>
                <input 
                  type="text" 
                  placeholder=""
                  className="w-full px-4 py-3 border border-gray-200 rounded focus:ring-2 focus:ring-[#002B5B]/10 focus:border-[#002B5B] outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={onSearch}
                className="bg-[#002B5B] text-white px-10 py-3 rounded font-bold hover:bg-[#003d82] transition-all shadow-lg flex items-center gap-2"
              >
                Search Flights
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


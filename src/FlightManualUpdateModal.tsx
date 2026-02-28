import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Plane, Info, Clock } from 'lucide-react';
import { cn } from './lib/utils';

interface FlightManualUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  date: string;
  onUpdate: (flightData: any) => void;
}

export default function FlightManualUpdateModal({ 
  isOpen, 
  onClose, 
  city, 
  date,
  onUpdate 
}: FlightManualUpdateModalProps) {
  const [flightNumber, setFlightNumber] = useState('');
  const [depCode, setDepCode] = useState('');
  const [depTime, setDepTime] = useState('');
  const [depDate, setDepDate] = useState(date);
  const [arrCode, setArrCode] = useState('');
  const [arrTime, setArrTime] = useState('');
  const [dayOffset, setDayOffset] = useState('Same day');

  if (!isOpen) return null;

  const handleUpdate = () => {
    onUpdate({
      airline: flightNumber.split('-')[0] || 'Manual',
      flightNumber,
      departure: depCode,
      arrival: arrCode,
      depTime,
      arrTime,
      depDate,
      dayOffset,
      duration: 'Manual Entry',
      price: '0' // Manual entries might not have price or handled differently
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#002B5B]">Update Arrival/Departure Information</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="p-6">
            {/* Context Info */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700">Arrive in {city}</h3>
              <span className="text-sm font-bold text-[#002B5B]">{date}</span>
            </div>

            {/* Info Box */}
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 mb-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Info className="text-cyan-600" size={20} />
                <span className="text-sm font-bold text-cyan-800">Do not have complete details yet?</span>
              </div>
              <button className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors">
                Provide arrival/departure time
              </button>
            </div>

            {/* Form Grid */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#002B5B]">
                  <option>Flight</option>
                </select>
                <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#002B5B]">
                  <option>Arrival Information</option>
                </select>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs font-bold text-gray-500">Arriving On:</span>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={depDate}
                      onChange={(e) => setDepDate(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#002B5B]" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Flight Number (Example 9W-811)</label>
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="Flight Number like AI-811"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                    <button className="bg-cyan-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-cyan-600 transition-colors">
                      Get Flight Details
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Departure Airport Code</label>
                    <input 
                      type="text" 
                      placeholder="DXB"
                      value={depCode}
                      onChange={(e) => setDepCode(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Departure Time (hh:mm)</label>
                    <input 
                      type="text" 
                      placeholder="hh:mm"
                      value={depTime}
                      onChange={(e) => setDepTime(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Departure Date</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={depDate}
                        onChange={(e) => setDepDate(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#002B5B]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Arrival Airport Code</label>
                    <input 
                      type="text" 
                      placeholder="TBS"
                      value={arrCode}
                      onChange={(e) => setArrCode(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Arrival Time (hh:mm)</label>
                    <input 
                      type="text" 
                      placeholder="hh:mm"
                      value={arrTime}
                      onChange={(e) => setArrTime(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#002B5B]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Arrival Day Offset</label>
                    <select 
                      value={dayOffset}
                      onChange={(e) => setDayOffset(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#002B5B] appearance-none"
                    >
                      <option>Same day</option>
                      <option>+1 day</option>
                      <option>+2 days</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button 
              onClick={handleUpdate}
              className="bg-[#002B5B] text-white px-10 py-2.5 rounded-lg font-bold text-sm hover:bg-[#003d82] transition-all shadow-lg shadow-[#002B5B]/20"
            >
              UPDATE
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

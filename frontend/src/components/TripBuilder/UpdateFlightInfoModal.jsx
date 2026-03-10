import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

function UpdateFlightInfoModal({ isOpen, onClose, type, city, date, onUpdate }) {
  const [flightType, setFlightType] = useState('flight');
  const [infoType, setInfoType] = useState(type === 'arrival' ? 'Arrival Information' : 'Departure Information');
  const [flightDate, setFlightDate] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightTime, setFlightTime] = useState('');
  const [airline, setAirline] = useState('');
  const [terminal, setTerminal] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [flightStatus, setFlightStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && date) {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        const formattedDate = dateObj.toISOString().split('T')[0];
        setFlightDate(formattedDate);
      } else {
        setFlightDate(date);
      }
    }
    setInfoType(type === 'arrival' ? 'Arrival Information' : 'Departure Information');
  }, [isOpen, date, type]);

  if (!isOpen) return null;

  const handleGetFlightDetails = async () => {
    if (!flightNumber) return;
    setLoading(true);
    setError('');
    
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${API_URL}/api/flights/search?flight_number=${encodeURIComponent(flightNumber)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.flights && data.flights.length > 0) {
          const flight = data.flights[0];
          setAirline(flight.airline_name || flight.airline || 'Unknown Airline');
          setFlightTime(type === 'arrival' ? (flight.arr_time || flight.arrival_time || '') : (flight.dep_time || flight.departure_time || ''));
          setTerminal(type === 'arrival' ? (flight.arr_terminal || '') : (flight.dep_terminal || ''));
          setDepartureAirport(flight.dep_iata || flight.departure || '');
          setArrivalAirport(flight.arr_iata || flight.arrival || '');
          setFlightStatus(flight.status || 'Scheduled');
          setError('');
        } else if (data.error) {
          setError(data.error);
          setAirline('');
          setFlightTime('');
          setTerminal('');
        } else {
          setError('Flight not found. Please check the flight number.');
          setAirline('');
          setFlightTime('');
          setTerminal('');
        }
      } else {
        setError('Could not fetch flight data. Please try again.');
        setAirline('');
        setFlightTime('');
        setTerminal('');
      }
    } catch (err) {
      console.error('Error fetching flight details:', err);
      setError('Could not fetch flight data. Please try again.');
      setAirline('');
      setFlightTime('');
      setTerminal('');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    const flightInfo = {
      type,
      flightType,
      infoType,
      flightNumber,
      flightDate,
      flightTime,
      airline,
      terminal,
      departureAirport,
      arrivalAirport,
      flightStatus
    };
    onUpdate(flightInfo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
        className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Update Arrival/Departure Information</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">
              {type === 'arrival' ? 'Arrival at' : 'Departure from'} {city}
            </h3>
            <span className="text-gray-600 font-medium">{date}</span>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-teal-700 font-semibold">Do not have complete details yet?</p>
            <button 
              onClick={() => setShowTimeInput(!showTimeInput)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Provide {type}/departure time
            </button>
          </div>

          {showTimeInput && (
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {type === 'arrival' ? 'Arrival' : 'Departure'} Time
              </label>
              <input
                type="time"
                value={flightTime}
                onChange={(e) => setFlightTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="bg-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <select
                  value={flightType}
                  onChange={(e) => setFlightType(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="flight">Flight</option>
                  <option value="train">Train</option>
                  <option value="bus">Bus</option>
                  <option value="self">Self Arranged</option>
                </select>
              </div>
              
              <div>
                <select
                  value={infoType}
                  onChange={(e) => setInfoType(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Arrival Information">Arrival Information</option>
                  <option value="Departure Information">Departure Information</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm">{type === 'arrival' ? 'Arriving On:' : 'Departing On:'}</span>
                <input
                  type="date"
                  value={flightDate}
                  onChange={(e) => setFlightDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">
              Flight Number (Example 9W-811)
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Flight Number like AI-811"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleGetFlightDetails}
                disabled={!flightNumber || loading}
                className="px-6 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                Get Flight Details
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm">
              {error}
            </div>
          )}

          {airline && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h4 className="font-bold text-green-800 mb-3">Flight Details Found</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Airline:</span>
                  <p className="font-medium text-gray-800">{airline}</p>
                </div>
                <div>
                  <span className="text-gray-500">{type === 'arrival' ? 'Arrival' : 'Departure'} Time:</span>
                  <p className="font-medium text-gray-800">{flightTime || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Terminal:</span>
                  <p className="font-medium text-gray-800">{terminal || 'N/A'}</p>
                </div>
                {departureAirport && (
                  <div>
                    <span className="text-gray-500">From:</span>
                    <p className="font-medium text-gray-800">{departureAirport}</p>
                  </div>
                )}
                {arrivalAirport && (
                  <div>
                    <span className="text-gray-500">To:</span>
                    <p className="font-medium text-gray-800">{arrivalAirport}</p>
                  </div>
                )}
                {flightStatus && (
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className={`font-medium ${flightStatus === 'Scheduled' ? 'text-blue-600' : flightStatus === 'Active' ? 'text-green-600' : 'text-gray-800'}`}>
                      {flightStatus}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={handleUpdate}
            className="px-8 py-3 bg-[#002B5B] text-white font-bold rounded-lg hover:bg-[#003d82] transition-colors"
          >
            UPDATE
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default UpdateFlightInfoModal;

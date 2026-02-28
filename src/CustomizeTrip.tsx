import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plane, 
  ChevronRight, 
  CheckCircle2, 
  Circle,
  Plus,
  Info
} from 'lucide-react';
import { cn } from './lib/utils';
import FlightSearchModal from './FlightSearchModal';
import FlightManualUpdateModal from './FlightManualUpdateModal';
import { AIRPORTS, MAJOR_CITIES } from './constants';

interface CustomizeTripProps {
  data: any;
  onBack: () => void;
  onConfirm: () => void;
}

export default function CustomizeTrip({ data, onBack, onConfirm }: CustomizeTripProps) {
  const [activeSection, setActiveSection] = useState('flights');

  // Calculate summary info
  const totalNights = (data?.cities || []).reduce((acc: number, c: any) => acc + (c.nights || 0), 0);
  const [year, month, day] = (data?.leavingOn || '2026-01-01').split('-').map(Number);
  const dateStr = new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  
  // Mock price
  const totalPrice = "7,357";

  if (!data) return null;

  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [showManualFlight, setShowManualFlight] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);

  // Calculate return date
  const departDate = data?.leavingOn;
  let returnDate = '';
  if (departDate && totalNights > 0) {
    const d = new Date(year, month - 1, day + totalNights);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    returnDate = `${y}-${m}-${dayNum}`;
  }

  // Helper to find airport display name
  const getAirportDisplayName = (cityName: string) => {
    if (!cityName) return '';
    
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
      return airportMatch.city;
    }
    return cityName;
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans text-[#1A1A1A]">
      {/* Progress Sub-Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-12">
          <div className="flex items-center gap-3 opacity-50">
            <div className="w-8 h-8 bg-[#00D1A0] rounded flex items-center justify-center text-white font-bold text-sm">1</div>
            <span className="font-bold text-gray-400">Your Trip Details</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#002B5B] rounded flex items-center justify-center text-white font-bold text-sm">2</div>
            <span className="font-bold text-[#002B5B]">Customize Your Trip</span>
          </div>
          <div className="ml-auto">
            <span className="text-2xl font-bold text-gray-800">AED {totalPrice}</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-2">
          <p className="text-sm font-bold text-gray-600">
            {dateStr} - {totalNights} nights - {data.travelersSummary || data.travelers}
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <FlightSearchModal 
          isOpen={showFlightSearch} 
          onClose={() => setShowFlightSearch(false)} 
          initialFrom={data.leavingFrom}
          initialTo={data.cities?.[0]?.name}
          initialDepartDate={departDate}
          initialReturnDate={returnDate}
          initialCities={data.cities}
        />
        <FlightManualUpdateModal
          isOpen={showManualFlight}
          onClose={() => setShowManualFlight(false)}
          city={data.cities?.[0]?.name}
          date={departDate}
          onUpdate={(flightData) => setSelectedFlight(flightData)}
        />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Section Header */}
          <div className="bg-[#F8F9FA] px-8 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-[#002B5B]">Flights</h2>
          </div>

          <div className="p-8">
            {/* Flight Search Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">
                  Add flights to my trip {getAirportDisplayName(data.leavingFrom?.split(' (')[0] || data.leavingFrom)} to {getAirportDisplayName(data.cities?.[0]?.name)}
                </h3>
              </div>
              
              <div className="border-t border-gray-100 pt-6">
                {!selectedFlight ? (
                  <div className="flex flex-col items-start gap-4">
                    <span className="text-gray-400 font-medium">No Flight Included</span>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowFlightSearch(true)}
                        className="bg-[#002B5B] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#003d82] transition-all shadow-md"
                      >
                        Add flights to my trip
                      </button>
                      <button 
                        onClick={() => setShowManualFlight(true)}
                        className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
                      >
                        Provide arrival/departure time
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[#002B5B] font-bold border border-blue-100">
                        {selectedFlight.airline[0]}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{selectedFlight.airline}</div>
                        <div className="text-xs text-gray-500">{selectedFlight.departure} - {selectedFlight.arrival} ({selectedFlight.duration})</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#002B5B]">AED {selectedFlight.price}</div>
                      <button 
                        onClick={() => setSelectedFlight(null)}
                        className="text-[10px] font-bold text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Other sections placeholder */}
            <div className="mt-8 space-y-4">
              {['Hotels', 'Activities', 'Transfers'].map((section) => (
                <div key={section} className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex justify-between items-center opacity-50">
                  <span className="font-bold text-gray-600">{section}</span>
                  <Plus className="text-gray-400" size={20} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <button 
            onClick={onBack}
            className="text-gray-500 font-bold hover:underline"
          >
            Back to Details
          </button>
          <button 
            onClick={onConfirm}
            className="bg-[#002B5B] text-white px-10 py-3 rounded-xl font-bold hover:bg-[#003d82] transition-all shadow-lg shadow-[#002B5B]/20"
          >
            Review & Confirm
          </button>
        </div>
      </main>
    </div>
  );
}

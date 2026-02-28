import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Plus, CreditCard, Loader2 } from 'lucide-react';
import FlightSearchModal from './FlightSearchModal';
import { api } from '@/App';

export default function CustomizeTrip({ data, user, onBack, onConfirm }) {
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  const totalNights = (data?.cities || []).reduce((acc, c) => acc + (c.nights || 0), 0);
  
  let dateStr = '';
  try {
    const date = new Date(data?.leaving_on);
    dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    dateStr = data?.leaving_on || '';
  }
  
  // Calculate mock price
  const basePrice = 500 * totalNights * (data?.room_data?.length || 1);
  const flightPrice = selectedFlight ? parseFloat(selectedFlight.price?.replace(',', '') || 0) : 0;
  const totalPrice = basePrice + flightPrice;

  const handlePayment = async () => {
    setIsPaymentLoading(true);
    try {
      // First save the proposal
      const proposalRes = await api.post('/proposals', {
        leaving_from: data.leaving_from,
        nationality: data.nationality,
        leaving_on: data.leaving_on,
        star_rating: data.star_rating,
        add_transfers: data.add_transfers,
        room_data: data.room_data,
        cities: data.cities
      });

      // Then initiate payment
      const origin = window.location.origin;
      const paymentRes = await api.post(`/payments/stripe/checkout?proposal_id=${proposalRes.data.id}&origin_url=${origin}`);
      
      if (paymentRes.data.url) {
        window.location.href = paymentRes.data.url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment initiation failed. Please try again.');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans text-[#1A1A1A]" data-testid="customize-trip">
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
            <span className="text-2xl font-bold text-gray-800" data-testid="total-price">AED {totalPrice.toLocaleString()}</span>
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
          initialFrom={data.leaving_from}
          initialTo={data.cities?.[0]?.name}
          onSelect={(flight) => setSelectedFlight(flight)}
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#F8F9FA] px-8 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-[#002B5B]">Flights</h2>
          </div>

          <div className="p-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">
                  Add flights: {data.leaving_from} → {data.cities?.[0]?.name}
                </h3>
              </div>
              
              <div className="border-t border-gray-100 pt-6">
                {!selectedFlight ? (
                  <div className="flex flex-col items-start gap-4">
                    <span className="text-gray-400 font-medium">No Flight Included</span>
                    <button 
                      onClick={() => setShowFlightSearch(true)}
                      data-testid="add-flight-button"
                      className="bg-[#002B5B] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#003d82] transition-all shadow-md"
                    >
                      Add flights to my trip
                    </button>
                  </div>
                ) : (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center" data-testid="selected-flight">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-[#002B5B] font-bold border border-blue-100">
                        {selectedFlight.logo || selectedFlight.airline?.[0]}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{selectedFlight.airline}</div>
                        <div className="text-xs text-gray-500">{selectedFlight.departure_time} - {selectedFlight.arrival_time} ({selectedFlight.duration})</div>
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

            {/* Other sections */}
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

        {/* Trip Summary */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-[#002B5B] mb-4">Trip Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Package ({totalNights} nights)</span>
              <span className="font-bold">AED {basePrice.toLocaleString()}</span>
            </div>
            {selectedFlight && (
              <div className="flex justify-between">
                <span className="text-gray-600">Flight ({selectedFlight.airline})</span>
                <span className="font-bold">AED {selectedFlight.price}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2 flex justify-between">
              <span className="font-bold text-gray-800">Total</span>
              <span className="font-bold text-[#002B5B] text-lg">AED {totalPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <button 
            onClick={onBack}
            data-testid="back-button"
            className="text-gray-500 font-bold hover:underline"
          >
            Back to Details
          </button>
          <div className="flex gap-4">
            <button 
              onClick={onConfirm}
              data-testid="save-proposal-button"
              className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Save as Draft
            </button>
            <button 
              onClick={handlePayment}
              disabled={isPaymentLoading}
              data-testid="pay-now-button"
              className="bg-[#E66B31] text-white px-10 py-3 rounded-xl font-bold hover:bg-[#d15a24] transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isPaymentLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  Pay Now
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

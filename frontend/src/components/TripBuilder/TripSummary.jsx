import React from 'react';
import { MapPin, Plane, Hotel, Car, ArrowRight, Compass, Save, Loader2, AlertCircle } from 'lucide-react';
import VersionHistoryPanel from './VersionHistoryPanel';

export default function TripSummary({
  cities, noStayCities, openStayDetailsModal,
  selectedFlight, selectedHotels,
  selectedArrivalTransfer, selectedDepartureTransfer,
  getTransferVehicleLabel,
  interCityTransfers,
  selectedActivities, getActivityVehicleLabel, getActivityPriceForVehicle,
  pricing, isSaving, handleSaveProposal,
  data, onConfirm,
}) {
  return (
    <div className="w-96 flex-shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 sticky top-32 max-h-[calc(100vh-10rem)] flex flex-col">
        <div className="bg-[#002B5B] text-white px-6 py-4 rounded-t-xl flex-shrink-0">
          <h3 className="text-lg font-bold">Trip Summary</h3>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Stay Information Alerts */}
          {cities.some((_, i) => {
            const stayData = noStayCities[i];
            return stayData && (stayData === true || (typeof stayData === 'object' && !stayData.hotel && !stayData.manualName));
          }) && (
            <div className="space-y-2">
              {cities.map((city, i) => {
                const stayData = noStayCities[i];
                const needsInfo = stayData && (stayData === true || (typeof stayData === 'object' && !stayData.hotel && !stayData.manualName));
                if (!needsInfo) return null;
                return (
                  <div 
                    key={`alert-${i}`} 
                    className="bg-red-50 border-t-4 border-red-600 rounded-b-lg px-4 py-3 cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => openStayDetailsModal(i)}
                    data-testid={`stay-alert-${i}`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-800">Stay in {city.name}</p>
                        <p className="text-xs text-red-700">Please provide stay information</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Destinations */}
          <div>
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-[#002B5B]" />
              Destinations
            </h4>
            <div className="space-y-2">
              {cities.map((city, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{city.name}</span>
                  <span className="font-medium">{city.nights} night{city.nights > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Flight */}
          {selectedFlight && (
            <div>
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Plane size={16} className="text-[#002B5B]" />
                Flight
              </h4>
              <p className="text-sm text-gray-600">{selectedFlight.airline}</p>
            </div>
          )}

          {/* Selected Hotels */}
          {Object.entries(selectedHotels).length > 0 && (
            <div>
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Hotel size={16} className="text-[#002B5B]" />
                Hotels
              </h4>
              {Object.entries(selectedHotels).map(([cityIdx, hotel]) => {
                const city = cities[parseInt(cityIdx)];
                const cityName = city?.name || `City ${parseInt(cityIdx) + 1}`;
                return (
                  <div key={cityIdx} className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-800">{cityName}</p>
                    <p className="text-sm text-gray-600">{hotel.name}</p>
                    <p className="text-xs text-gray-500">{hotel.selectedRoom?.name}</p>
                    {hotel.selectedRoom?.rate_plan && (
                      <div className="mt-1 text-xs">
                        <span className="text-purple-600">{hotel.selectedRoom.rate_plan.meal_plan}</span>
                        {hotel.selectedRoom.rate_plan.supplier_name && (
                          <span className="text-gray-400 ml-2">({hotel.selectedRoom.rate_plan.supplier_name})</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Transfers */}
          {(selectedArrivalTransfer || selectedDepartureTransfer) && (
            <div>
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Car size={16} className="text-blue-600" />
                Transfers
              </h4>
              <div className="space-y-2">
                {selectedArrivalTransfer && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-600">Arrival Transfer</span>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedArrivalTransfer.title}</p>
                    {getTransferVehicleLabel(selectedArrivalTransfer) && (
                      <div className="text-xs text-blue-600 mt-0.5">{getTransferVehicleLabel(selectedArrivalTransfer)}</div>
                    )}
                  </div>
                )}
                {selectedDepartureTransfer && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm text-gray-600">Departure Transfer</span>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedDepartureTransfer.title}</p>
                    {getTransferVehicleLabel(selectedDepartureTransfer) && (
                      <div className="text-xs text-orange-600 mt-0.5">{getTransferVehicleLabel(selectedDepartureTransfer)}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inter-City Transfers */}
          {Object.keys(interCityTransfers).length > 0 && (
            <div>
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <ArrowRight size={16} className="text-indigo-600" />
                Inter-City Transfers
              </h4>
              <div className="space-y-2">
                {Object.entries(interCityTransfers).map(([key, transfer]) => {
                  const [fromIdx, toIdx] = key.split('_');
                  const fromCity = cities[parseInt(fromIdx)]?.name || '';
                  const toCity = cities[parseInt(toIdx)]?.name || '';
                  return (
                    <div key={key} className="p-3 bg-indigo-50 rounded-lg">
                      <span className="text-sm text-gray-600">{fromCity} → {toCity}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{transfer.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Activities */}
          {Object.entries(selectedActivities).some(([_, acts]) => acts.length > 0) && (
            <div>
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Compass size={16} className="text-pink-600" />
                Activities
              </h4>
              {Object.entries(selectedActivities).map(([key, activities]) => {
                if (activities.length === 0) return null;
                const [city, day] = key.split('_');
                return (
                  <div key={key} className="mb-3 p-3 bg-pink-50 rounded-lg">
                    <p className="text-xs font-medium text-pink-600 mb-1">Day {day} - {city}</p>
                    {activities.map(activity => {
                      const vehicleLabel = getActivityVehicleLabel(activity);
                      return (
                        <div key={activity.id} className="py-1">
                          <span className="text-sm text-gray-600 line-clamp-1">{activity.name}</span>
                          {vehicleLabel && (
                            <div className="text-xs text-blue-600 mt-0.5">{vehicleLabel}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Price Summary */}
          <div className="border-t pt-4">
            <h4 className="font-bold text-[#006B5B] mb-4 bg-[#006B5B]/10 px-3 py-1.5 rounded inline-block text-sm">Price Summary</h4>
            <p className="text-xs text-gray-500 underline mb-4">Trip Summary</p>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-700">Price per adult</span>
              <span className="text-sm font-bold text-gray-900">AED {pricing.pricePerAdult.toLocaleString()}</span>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Total Discount</span>
                <span className="text-sm font-bold text-gray-700">AED -0</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Price</span>
                <span className="text-xl font-bold text-[#002B5B]">AED {pricing.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button 
              onClick={handleSaveProposal}
              disabled={isSaving}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="save-proposal-button"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save As Proposal
            </button>
          </div>

          {/* Version History - only when editing */}
          {data?.isEditing && data?.editProposalId && (
            <VersionHistoryPanel
              proposalId={data.editProposalId}
              onRestoreAsNew={(newId, newProposal) => {
                if (newProposal) {
                  onConfirm({ id: newId, ...newProposal });
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

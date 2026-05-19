import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Plane, Car, Hotel, Sun, Moon, Utensils, 
  Check, Trash2, Plus, ArrowRight, AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

function DayCard({ 
  day, 
  date, 
  city, 
  activities, 
  isFirst, 
  isLast, 
  isDeparture, 
  onAddActivity, 
  onRemoveActivity, 
  onChangeHotel, 
  hotel, 
  onSelectArrivalTransfer, 
  onSelectDepartureTransfer, 
  onRemoveArrivalTransfer,
  onRemoveDepartureTransfer,
  selectedArrivalTransfer, 
  selectedDepartureTransfer, 
  onUpdateFlightInfo, 
  arrivalFlightInfo, 
  departureFlightInfo,
  isCheckInDay,
  incomingFromCity,
  incomingTransfer,
  isCheckOutDay,
  outgoingToCity,
  outgoingTransfer,
  onChangeInterCityTransfer,
  onRemoveInterCityTransfer,
  selectedExtras,
  onToggleExtra,
  overflowActivityIds
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <button 
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full px-6 py-4 flex items-center justify-between text-white",
          isDeparture 
            ? "bg-gradient-to-r from-orange-500 to-orange-600" 
            : "bg-gradient-to-r from-[#002B5B] to-[#004080]"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold">
            {day}
          </div>
          <div className="text-left">
            <h3 className="font-bold">{isDeparture ? `${date} - Return Day` : date}</h3>
            <p className={cn("text-sm", isDeparture ? "text-orange-100" : "text-blue-200")}>{city}</p>
          </div>
        </div>
        <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {/* Arrival on Day 1 */}
              {isFirst && (
                <div className="space-y-3">
                  {!arrivalFlightInfo && (
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                      <p className="text-red-700 font-semibold">Arrival information is missing</p>
                      <button 
                        onClick={() => onUpdateFlightInfo && onUpdateFlightInfo('arrival', city)}
                        className="bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-800 transition-all"
                        data-testid="update-arrival-details"
                      >
                        Update Arrival Details
                      </button>
                    </div>
                  )}
                  
                  {arrivalFlightInfo && (
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center gap-3">
                        <Check className="text-green-600" size={20} />
                        <div>
                          <p className="text-green-700 font-semibold">Arrival Details Added</p>
                          <p className="text-sm text-green-600">
                            {arrivalFlightInfo.flightNumber && `Flight: ${arrivalFlightInfo.flightNumber}`}
                            {arrivalFlightInfo.flightTime && ` • Time: ${arrivalFlightInfo.flightTime}`}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onUpdateFlightInfo && onUpdateFlightInfo('arrival', city)}
                        className="text-green-700 underline font-medium text-sm hover:text-green-800"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Plane className="text-blue-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">Arrival at {city}</p>
                      {selectedArrivalTransfer ? (
                        <div className="mt-1">
                          <p className="text-sm text-green-600 font-medium">{selectedArrivalTransfer.title}</p>
                          <p className="text-xs text-gray-500">
                            {selectedArrivalTransfer.selectedVehicle ? (
                              <>
                                {selectedArrivalTransfer.selectedVehicle === 'sedan_4' && '🚗 4 Seater Sedan'}
                                {selectedArrivalTransfer.selectedVehicle === 'car_7' && '🚙 7 Seater Minivan'}
                                {selectedArrivalTransfer.selectedVehicle === 'van_8' && '🚐 8 Seater Van'}
                                {selectedArrivalTransfer.selectedVehicle === 'van_17' && '🚐 17 Seater Van'}
                                {selectedArrivalTransfer.selectedVehicle === 'bus_29' && '🚌 29 Seater Bus'}
                                {selectedArrivalTransfer.selectedVehicle === 'bus_45' && '🚌 45 Seater Bus'}
                                {selectedArrivalTransfer.selectedVehicle === 'bus_55' && '🚌 55 Seater Bus'}
                                {' • '}{selectedArrivalTransfer.duration}
                              </>
                            ) : (
                              <>{selectedArrivalTransfer.vehicle_type} • {selectedArrivalTransfer.duration}</>
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Transfer from airport to hotel</p>
                      )}
                    </div>
                    <button 
                      onClick={() => onSelectArrivalTransfer && onSelectArrivalTransfer(city)}
                      className="bg-[#002B5B] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#003d82] transition-all flex items-center gap-2"
                      data-testid="select-arrival-transfer"
                    >
                      <Car size={16} />
                      {selectedArrivalTransfer ? 'Change' : 'Select Transfer'}
                    </button>
                    {selectedArrivalTransfer && (
                      <button 
                        onClick={() => onRemoveArrivalTransfer && onRemoveArrivalTransfer()}
                        className="w-9 h-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center transition-all border border-red-200"
                        data-testid="remove-arrival-transfer"
                        title="Remove transfer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Departure Day (Return) */}
              {isDeparture && (
                <div className="space-y-3">
                  {!departureFlightInfo && (
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                      <p className="text-red-700 font-semibold">Departure information is missing</p>
                      <button 
                        onClick={() => onUpdateFlightInfo && onUpdateFlightInfo('departure', city)}
                        className="bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-800 transition-all"
                        data-testid="update-departure-details"
                      >
                        Update Departure Details
                      </button>
                    </div>
                  )}
                  
                  {departureFlightInfo && (
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center gap-3">
                        <Check className="text-green-600" size={20} />
                        <div>
                          <p className="text-green-700 font-semibold">Departure Details Added</p>
                          <p className="text-sm text-green-600">
                            {departureFlightInfo.flightNumber && `Flight: ${departureFlightInfo.flightNumber}`}
                            {departureFlightInfo.flightTime && ` • Time: ${departureFlightInfo.flightTime}`}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onUpdateFlightInfo && onUpdateFlightInfo('departure', city)}
                        className="text-green-700 underline font-medium text-sm hover:text-green-800"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Plane className="text-orange-600 rotate-45" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">Return Flight - Departure from {city}</p>
                      {selectedDepartureTransfer ? (
                        <div className="mt-1">
                          <p className="text-sm text-green-600 font-medium">{selectedDepartureTransfer.title}</p>
                          <p className="text-xs text-gray-500">
                            {selectedDepartureTransfer.selectedVehicle ? (
                              <>
                                {selectedDepartureTransfer.selectedVehicle === 'sedan_4' && '🚗 4 Seater Sedan'}
                                {selectedDepartureTransfer.selectedVehicle === 'car_7' && '🚙 7 Seater Minivan'}
                                {selectedDepartureTransfer.selectedVehicle === 'van_8' && '🚐 8 Seater Van'}
                                {selectedDepartureTransfer.selectedVehicle === 'van_17' && '🚐 17 Seater Van'}
                                {selectedDepartureTransfer.selectedVehicle === 'bus_29' && '🚌 29 Seater Bus'}
                                {selectedDepartureTransfer.selectedVehicle === 'bus_45' && '🚌 45 Seater Bus'}
                                {selectedDepartureTransfer.selectedVehicle === 'bus_55' && '🚌 55 Seater Bus'}
                                {' • '}{selectedDepartureTransfer.duration}
                              </>
                            ) : (
                              <>{selectedDepartureTransfer.vehicle_type} • {selectedDepartureTransfer.duration}</>
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Check-out from hotel & transfer to airport</p>
                      )}
                    </div>
                    <button 
                      onClick={() => onSelectDepartureTransfer && onSelectDepartureTransfer(city)}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-600 transition-all flex items-center gap-2"
                      data-testid="select-departure-transfer"
                    >
                      <Car size={16} />
                      {selectedDepartureTransfer ? 'Change' : 'Select Transfer'}
                    </button>
                    {selectedDepartureTransfer && (
                      <button 
                        onClick={() => onRemoveDepartureTransfer && onRemoveDepartureTransfer()}
                        className="w-9 h-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center transition-all border border-red-200"
                        data-testid="remove-departure-transfer"
                        title="Remove transfer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Hotel Stay Reference (only for non-departure days) */}
              {!isDeparture && hotel && (
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                  <img 
                    src={hotel.images?.[0] || 'https://via.placeholder.com/80'} 
                    alt={hotel.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{hotel.name}</p>
                    <p className="text-sm text-gray-500">{hotel.selectedRoom?.name || 'Standard Room'}</p>
                  </div>
                  <Check className="text-green-500" size={20} />
                </div>
              )}
              
              {!isDeparture && !hotel && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Hotel className="text-gray-400" size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-500">No Hotel Selected</p>
                    <p className="text-sm text-gray-400">Add a hotel for your stay in {city}</p>
                  </div>
                  <button 
                    onClick={onChangeHotel}
                    className="bg-[#002B5B] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#003d82] transition-all"
                  >
                    Add Hotel
                  </button>
                </div>
              )}

              {/* Meals Section - rolled up from hotel breakfast + selected activities' meals_included */}
              {(() => {
                // Hotel meal plan parsing for breakfast inclusion
                const sel = hotel?.selected_room || hotel?.selectedRoom || {};
                const rp = sel.rate_plan || sel.ratePlan || {};
                const mp = String(
                  rp.meal_plan || rp.mealPlan || sel.meal_plan || sel.mealPlan || sel.meals || hotel?.meal_plan || ''
                ).toLowerCase();
                const isBB = mp.includes('breakfast') || mp === 'bb' || mp.endsWith('bb') || mp.startsWith('bb ');
                const isHB = mp.includes('half board') || mp === 'hb';
                const isFB = mp.includes('full board') || mp === 'fb';
                const isAI = mp.includes('all inclusive') || mp.includes('all-inclusive') || mp === 'ai';

                let breakfast = isBB || isHB || isFB || isAI;
                let lunch = mp.includes('lunch') || isFB || isAI;
                let dinner = mp.includes('dinner') || isHB || isFB || isAI;

                // Activities can also include meals
                (activities || []).forEach((a) => {
                  if (a?.meals_included?.breakfast) breakfast = true;
                  if (a?.meals_included?.lunch) lunch = true;
                  if (a?.meals_included?.dinner) dinner = true;
                });

                // For first day & departure days the original logic still applies
                const showBreakfast = !isFirst;
                const showLunchDinner = !isDeparture;
                const breakfastTxt = breakfast ? 'Included' : 'Not included';

                return (
                  <div className={`grid ${isFirst ? 'grid-cols-2' : (isDeparture ? 'grid-cols-1' : 'grid-cols-3')} gap-3`}>
                    {showBreakfast && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg" data-testid="day-meal-breakfast">
                        <Sun className={breakfast ? "text-yellow-500" : "text-gray-400"} size={16} />
                        <span className="text-sm text-gray-600">Breakfast: {breakfastTxt}</span>
                      </div>
                    )}
                    {showLunchDinner && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg" data-testid="day-meal-lunch">
                        <Utensils className={lunch ? "text-emerald-500" : "text-gray-400"} size={16} />
                        <span className="text-sm text-gray-600">Lunch: {lunch ? 'Included' : 'Not included'}</span>
                      </div>
                    )}
                    {showLunchDinner && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg" data-testid="day-meal-dinner">
                        <Moon className={dinner ? "text-purple-500" : "text-gray-400"} size={16} />
                        <span className="text-sm text-gray-600">Dinner: {dinner ? 'Included' : 'Not included'}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Activities */}
              {activities?.length > 0 && (
                <div className="space-y-2">
                  {activities.map((activity, i) => {
                    const activityExtras = activity.extras || [];
                    const activitySelectedExtras = selectedExtras?.[activity.id] || [];
                    
                    return (
                      <div key={activity.id || i} className="rounded-xl border border-purple-100 overflow-hidden group">
                        <div className="flex items-center gap-4 p-4 bg-purple-50">
                          <img 
                            src={activity.images?.[0] || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=100'}
                            alt={activity.name}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 line-clamp-1">{activity.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-medium">
                                {activity.category || 'Activity'}
                              </span>
                              {activity.transfer_type && (
                                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                  {activity.transfer_type}
                                </span>
                              )}
                              {activityExtras.length > 0 && (
                                <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
                                  {activityExtras.length} extras
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {activity.start_times?.length > 0 
                                ? `${activity.start_times[0]} • ${activity.duration}`
                                : activity.duration
                              }
                              {activity.languages?.length > 0 && ` • ${activity.languages[0]}`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {onRemoveActivity && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveActivity(activity.id);
                                }}
                                className="ml-2 p-1.5 text-red-500 hover:bg-red-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove activity"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Extras Section */}
                        {activityExtras.length > 0 && (
                          <div className="px-4 py-3 bg-white border-t border-purple-100">
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Extras available for purchase</p>
                            <div className="space-y-1.5">
                              {activityExtras.map((extra, eIdx) => {
                                const isChecked = activitySelectedExtras.some(e => (e.id || e.name) === (extra.id || extra.name));
                                const extraPrice = extra.vehicle_pricing && activity.selectedVehicle
                                  ? (extra.vehicle_pricing[activity.selectedVehicle] || extra.price || 0)
                                  : (extra.price || 0);
                                
                                return (
                                  <label 
                                    key={extra.id || eIdx}
                                    className={cn(
                                      "flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                                      isChecked ? "bg-green-50 border border-green-200" : "hover:bg-gray-50 border border-transparent"
                                    )}
                                    data-testid={`extra-checkbox-${activity.id}-${eIdx}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => onToggleExtra && onToggleExtra(activity.id, extra)}
                                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className={cn(
                                        "text-sm font-medium",
                                        isChecked ? "text-green-700" : "text-gray-700"
                                      )}>
                                        {extra.name}
                                      </p>
                                      {extra.description && (
                                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{extra.description}</p>
                                      )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <span className="text-[10px] text-gray-400">starting from</span>
                                      <p className={cn(
                                        "text-sm font-bold",
                                        isChecked ? "text-green-600" : "text-gray-700"
                                      )}>
                                        AED {extraPrice}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Time limit warning */}
                        {overflowActivityIds?.includes(activity.id) && (
                          <div className="px-4 py-2.5 bg-red-50 border-t border-red-100 flex items-center gap-2">
                            <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                            <p className="text-xs text-red-600 italic">Not possible to do because of other inclusions on this day</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Activity Button — visible on every day, including the
                  inter-hotel transfer day (so the agent can slot in light
                  sightseeing for the arrival day too). */}
              <button
                onClick={onAddActivity}
                className="w-full py-3 border-2 border-dashed border-pink-200 rounded-xl text-pink-500 font-medium hover:border-pink-500 hover:bg-pink-50 transition-all flex items-center justify-center gap-2"
                data-testid={`add-activity-day-${day}`}
              >
                <Plus size={18} />
                Add Activity in {city}
              </button>

              {/* Incoming Inter-City Transfer (Check-in day) */}
              {isCheckInDay && incomingFromCity && (
                <div className="mt-4 border border-green-200 rounded-xl overflow-hidden" data-testid={`incoming-transfer-day-${day}`}>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 flex items-center gap-3 border-b border-green-200">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <ArrowRight size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-800">
                        Arrival Transfer from {incomingFromCity} to {city}
                      </p>
                      <p className="text-xs text-green-500">
                        {incomingTransfer ? incomingTransfer.title : 'No Transfer Selected'}
                      </p>
                    </div>
                  </div>

                  {incomingTransfer ? (
                    <div className="p-4 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Car size={18} className="text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{incomingTransfer.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500">{incomingTransfer.duration || ''}</span>
                              {incomingTransfer.vehicleLabel && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{incomingTransfer.vehicleLabel}</span>
                              )}
                              {!incomingTransfer.vehicleLabel && incomingTransfer.vehicle_type && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{incomingTransfer.vehicle_type}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onRemoveInterCityTransfer('incoming')}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Remove transfer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Extras Available for Purchase — same pattern as activities */}
                      {(() => {
                        const transferExtras = incomingTransfer.extras || [];
                        if (transferExtras.length === 0) return null;
                        const transferKey = incomingTransfer.id || `transfer_${day}`;
                        const selectedTransferExtras = selectedExtras?.[transferKey] || [];
                        return (
                          <div className="mt-3 -mx-4 px-4 py-3 bg-gradient-to-r from-green-50/40 to-white border-t border-green-100">
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Extras available for purchase</p>
                            <div className="space-y-1.5">
                              {transferExtras.map((extra, eIdx) => {
                                const isChecked = selectedTransferExtras.some(e => (e.id || e.name) === (extra.id || extra.name));
                                const extraPrice = extra.vehicle_pricing && incomingTransfer.selectedVehicle
                                  ? (extra.vehicle_pricing[incomingTransfer.selectedVehicle] || extra.price || 0)
                                  : (extra.price || 0);
                                return (
                                  <label
                                    key={extra.id || eIdx}
                                    className={cn(
                                      "flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                                      isChecked ? "bg-green-50 border border-green-200" : "hover:bg-gray-50 border border-transparent"
                                    )}
                                    data-testid={`transfer-extra-checkbox-${transferKey}-${eIdx}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => onToggleExtra && onToggleExtra(transferKey, extra)}
                                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className={cn("text-sm font-medium", isChecked ? "text-green-700" : "text-gray-700")}>
                                        {extra.name}
                                      </p>
                                      {extra.description && (
                                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{extra.description}</p>
                                      )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <span className="text-[10px] text-gray-400">starting from</span>
                                      <p className={cn("text-sm font-bold", isChecked ? "text-green-600" : "text-gray-700")}>
                                        AED {extraPrice}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      <button
                        onClick={() => onChangeInterCityTransfer('incoming')}
                        className="mt-3 w-full py-2 border border-green-200 rounded-lg text-green-600 text-sm font-medium hover:bg-green-50 transition-colors"
                        data-testid={`change-incoming-transfer-day-${day}`}
                      >
                        Change Transfer from {incomingFromCity}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-white">
                      <button
                        onClick={() => onChangeInterCityTransfer('incoming')}
                        className="w-full py-3 border-2 border-dashed border-green-200 rounded-xl text-green-600 font-medium hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                        data-testid={`add-incoming-transfer-day-${day}`}
                      >
                        <Plus size={18} />
                        Add Transfer from {incomingFromCity}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DayCard;

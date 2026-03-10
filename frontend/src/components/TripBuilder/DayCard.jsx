import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Plane, Car, Hotel, Sun, Moon, Utensils, 
  Check, Trash2, Plus 
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
  selectedArrivalTransfer, 
  selectedDepartureTransfer, 
  onUpdateFlightInfo, 
  arrivalFlightInfo, 
  departureFlightInfo 
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
                                {selectedArrivalTransfer.selectedVehicle === 'car_7' && '🚙 7 Seater Car'}
                                {selectedArrivalTransfer.selectedVehicle === 'van_8' && '🚐 8 Seater Van'}
                                {selectedArrivalTransfer.selectedVehicle === 'van_17' && '🚐 17 Seater Van'}
                                {selectedArrivalTransfer.selectedVehicle === 'bus_29' && '🚌 29 Seater Bus'}
                                {selectedArrivalTransfer.selectedVehicle === 'bus_45' && '🚌 45 Seater Bus'}
                                {selectedArrivalTransfer.selectedVehicle === 'bus_55' && '🚌 55 Seater Bus'}
                                {' • '}{selectedArrivalTransfer.duration} • {selectedArrivalTransfer.vehiclePrice || selectedArrivalTransfer.price} AED
                              </>
                            ) : (
                              <>{selectedArrivalTransfer.vehicle_type} • {selectedArrivalTransfer.duration} • {selectedArrivalTransfer.price} AED</>
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
                                {selectedDepartureTransfer.selectedVehicle === 'car_7' && '🚙 7 Seater Car'}
                                {selectedDepartureTransfer.selectedVehicle === 'van_8' && '🚐 8 Seater Van'}
                                {selectedDepartureTransfer.selectedVehicle === 'van_17' && '🚐 17 Seater Van'}
                                {selectedDepartureTransfer.selectedVehicle === 'bus_29' && '🚌 29 Seater Bus'}
                                {selectedDepartureTransfer.selectedVehicle === 'bus_45' && '🚌 45 Seater Bus'}
                                {selectedDepartureTransfer.selectedVehicle === 'bus_55' && '🚌 55 Seater Bus'}
                                {' • '}{selectedDepartureTransfer.duration} • {selectedDepartureTransfer.vehiclePrice || selectedDepartureTransfer.price} AED
                              </>
                            ) : (
                              <>{selectedDepartureTransfer.vehicle_type} • {selectedDepartureTransfer.duration} • {selectedDepartureTransfer.price} AED</>
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

              {/* Meals Section */}
              <div className={`grid ${isFirst ? 'grid-cols-2' : (isDeparture ? 'grid-cols-1' : 'grid-cols-3')} gap-3`}>
                {!isFirst && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Sun className="text-yellow-500" size={16} />
                    <span className="text-sm text-gray-600">Breakfast: {hotel || isDeparture ? 'Included' : 'Not included'}</span>
                  </div>
                )}
                {!isDeparture && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Utensils className="text-orange-500" size={16} />
                    <span className="text-sm text-gray-600">Lunch: Not included</span>
                  </div>
                )}
                {!isDeparture && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Moon className="text-purple-500" size={16} />
                    <span className="text-sm text-gray-600">Dinner: Not included</span>
                  </div>
                )}
              </div>

              {/* Activities */}
              {activities?.length > 0 && (
                <div className="space-y-2">
                  {activities.map((activity, i) => (
                    <div key={activity.id || i} className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100 group">
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
                        <span className="font-bold text-green-600">AED {activity.price}</span>
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
                  ))}
                </div>
              )}

              {/* Add Activity Button */}
              <button 
                onClick={onAddActivity}
                className="w-full py-3 border-2 border-dashed border-pink-200 rounded-xl text-pink-500 font-medium hover:border-pink-500 hover:bg-pink-50 transition-all flex items-center justify-center gap-2"
                data-testid={`add-activity-day-${day}`}
              >
                <Plus size={18} />
                Add Activity in {city}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DayCard;

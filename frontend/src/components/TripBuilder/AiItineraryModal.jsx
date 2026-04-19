import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Compass, Check, Camera, Utensils, Car, Info } from 'lucide-react';

export default function AiItineraryModal({
  isOpen, aiItinerary, onClose, onRegenerate, onApply,
}) {
  if (!isOpen || !aiItinerary) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
          data-testid="ai-itinerary-modal"
        >
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Compass size={22} />
              <h2 className="text-lg font-bold">AI-Generated Itinerary</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {aiItinerary.raw ? (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">{aiItinerary.raw}</div>
            ) : aiItinerary.days ? (
              <>
                {aiItinerary.days.map((day, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden" data-testid={`ai-day-${day.day}`}>
                    <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{day.day}</span>
                        <div>
                          <span className="font-bold text-gray-800">{day.title || `Day ${day.day}`}</span>
                          <span className="text-sm text-gray-500 ml-2">- {day.city}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      {day.activities?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Camera size={13} /> Activities
                          </h4>
                          <div className="space-y-2">
                            {day.activities.map((act, j) => (
                              <div key={j} className="flex items-start gap-3 p-2.5 bg-indigo-50/50 rounded-lg">
                                <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded whitespace-nowrap mt-0.5">{act.time}</span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-800">{act.name}</p>
                                    {act.activity_id && (
                                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">DB Match</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500">{act.description}</p>
                                  {act.duration && <span className="text-[10px] text-gray-400">{act.duration}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {day.meals?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Utensils size={13} /> Meals
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {day.meals.map((meal, j) => (
                              <div key={j} className="p-2 bg-amber-50/50 rounded-lg">
                                <span className="text-[10px] font-bold text-amber-700 uppercase">{meal.type}</span>
                                <p className="text-xs text-gray-600 mt-0.5">{meal.suggestion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {day.transfers?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Car size={13} /> Transfers
                          </h4>
                          {day.transfers.map((t, j) => (
                            <div key={j} className="p-2 bg-blue-50/50 rounded-lg text-xs text-gray-600">
                              <span className="font-medium text-blue-700">{t.type}:</span> {t.description}
                            </div>
                          ))}
                        </div>
                      )}

                      {day.tips && (
                        <div className="flex items-start gap-2 p-2 bg-green-50/50 rounded-lg">
                          <Info size={13} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-green-700">{day.tips}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {aiItinerary.general_tips?.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Travel Tips</h4>
                    <ul className="space-y-1">
                      {aiItinerary.general_tips.map((tip, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <Check size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">No itinerary data available.</p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-400">AI-generated suggestions. Modify as needed in your trip builder.</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                Close
              </button>
              <button
                onClick={onRegenerate}
                className="px-4 py-2 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all font-medium flex items-center gap-2"
                data-testid="ai-regenerate-btn"
              >
                <Compass size={14} /> Regenerate
              </button>
              {aiItinerary?.days && (
                <button
                  onClick={onApply}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all font-medium flex items-center gap-2 shadow-md"
                  data-testid="ai-apply-to-trip-btn"
                >
                  <Check size={14} /> Apply to Trip
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Loader2, Check, Clock, Globe, DollarSign, Star, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

function ActivitiesModal({ isOpen, onClose, city, onSelectActivity, selectedActivities = [] }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && city) {
      fetchActivities();
    }
  }, [isOpen, city]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/activities?city=${encodeURIComponent(city)}`);
      let activityList = res.data?.activities || [];
      
      if (activityList.length === 0) {
        const allRes = await api.get('/activities');
        const allActivities = allRes.data?.activities || [];
        activityList = allActivities.filter(a => 
          a.city?.toLowerCase().includes(city.toLowerCase()) ||
          city.toLowerCase().includes(a.city?.toLowerCase() || '')
        );
      }
      
      activityList = activityList.filter(a => a.available !== false);
      setActivities(activityList);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = searchQuery
    ? activities.filter(a =>
        a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activities;

  const isSelected = (activityId) => {
    return selectedActivities.some(a => a.id === activityId);
  };

  if (!isOpen) return null;

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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white w-full max-w-5xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Activities in {city}</h2>
            <p className="text-pink-100 text-sm">Select activities for your trip</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search activities by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              data-testid="activity-search-input"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-pink-500" size={40} />
              <p className="mt-4 text-gray-500 font-medium">Loading activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Compass size={48} className="text-gray-300 mb-4" />
              <p className="font-medium text-gray-500">
                {searchQuery 
                  ? `No activities found for "${searchQuery}"`
                  : `No activities available in ${city}`
                }
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Try searching for a different activity or check back later
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActivities.map((activity) => {
                const selected = isSelected(activity.id);
                return (
                  <motion.div
                    key={activity.id}
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      "bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all",
                      selected 
                        ? "border-pink-500 ring-2 ring-pink-200" 
                        : "border-gray-200 hover:border-pink-300"
                    )}
                    onClick={() => onSelectActivity(activity)}
                    data-testid={`activity-option-${activity.id}`}
                  >
                    <div className="flex">
                      <div className="w-32 h-32 flex-shrink-0 relative">
                        <img
                          src={activity.images?.[0] || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400'}
                          alt={activity.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <span className="bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {activity.category || 'Activity'}
                          </span>
                          {activity.transfer_type && (
                            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {activity.transfer_type}
                            </span>
                          )}
                        </div>
                        {selected && (
                          <div className="absolute inset-0 bg-pink-500/30 flex items-center justify-center">
                            <div className="bg-pink-500 text-white rounded-full p-2">
                              <Check size={20} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-4">
                        <h3 className="font-bold text-gray-800 line-clamp-1">{activity.name}</h3>
                        
                        {activity.start_times?.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <Clock size={10} />
                            <span>Starts at {activity.start_times.slice(0, 2).join(', ')} ({activity.duration})</span>
                          </div>
                        )}
                        
                        {activity.languages?.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Globe size={10} />
                            <span>{activity.languages.slice(0, 2).join(', ')}</span>
                          </div>
                        )}
                        
                        {activity.closed_days?.length > 0 && (
                          <div className="text-xs text-red-500 mt-1">
                            Closed on {activity.closed_days.join(', ')}
                          </div>
                        )}

                        {activity.inclusions?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {activity.inclusions.slice(0, 2).map((inc, i) => (
                              <span key={i} className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">
                                {inc}
                              </span>
                            ))}
                            {activity.inclusions.length > 2 && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                +{activity.inclusions.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} className="text-green-600" />
                            <span className="font-bold text-green-600">{activity.price}</span>
                            <span className="text-xs text-gray-500">{activity.currency || 'AED'}</span>
                          </div>
                          {activity.rating && (
                            <div className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                              <Star size={10} className="fill-yellow-400" />
                              <span>{activity.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {selectedActivities.length} activit{selectedActivities.length !== 1 ? 'ies' : 'y'} selected for this day
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ActivitiesModal;

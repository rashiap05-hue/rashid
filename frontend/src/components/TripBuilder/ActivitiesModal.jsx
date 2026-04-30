import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Loader2, Check, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

function ActivitiesModal({ isOpen, onClose, city, dayNumber, startDate, onSelectActivity, selectedActivities = [], otherDayActivityMap = {} }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Options');
  const [timeFilter, setTimeFilter] = useState('All');
  const [expandedDesc, setExpandedDesc] = useState({});

  // Compute day date
  const dayDate = (() => {
    if (!startDate || !dayNumber) return '';
    const d = new Date(startDate);
    d.setDate(d.getDate() + (dayNumber - 1));
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  })();

  useEffect(() => {
    if (isOpen && city) {
      fetchActivities();
      setSearchQuery('');
      setCategoryFilter('All Options');
      setTimeFilter('All');
      setExpandedDesc({});
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

  // Get unique categories
  const categories = ['All Options', ...new Set(activities.map(a => a.category || 'City Tours'))];

  // Filter activities
  const filteredActivities = activities.filter(a => {
    // Category filter
    if (categoryFilter !== 'All Options' && (a.category || 'City Tours') !== categoryFilter) return false;
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(a.name || '').toLowerCase().includes(q) && !(a.description || '').toLowerCase().includes(q)) return false;
    }
    // Time filter
    if (timeFilter !== 'All' && a.start_times?.length > 0) {
      const hasMatch = a.start_times.some(time => {
        const hour = parseInt(time.split(':')[0], 10);
        if (timeFilter === 'Morning') return hour >= 5 && hour < 12;
        if (timeFilter === 'Afternoon') return hour >= 12 && hour < 17;
        if (timeFilter === 'Full Day') {
          const dur = parseInt(a.duration, 10);
          return dur >= 6;
        }
        return true;
      });
      if (timeFilter === 'Full Day') {
        const dur = parseInt(a.duration, 10);
        if (dur < 6) return false;
      } else if (!hasMatch) return false;
    }
    return true;
  });

  const isSelected = (activityId) => selectedActivities.some(a => a.id === activityId);

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
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h3 className="text-base font-bold text-gray-900" data-testid="activity-modal-title">
            Add Activity in {city}
            {dayDate && (
              <span className="text-gray-500 font-normal text-sm ml-2">
                (Day {dayNumber}: {dayDate})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-44 focus:outline-none focus:border-[#002B5B]"
                data-testid="activity-search-input"
              />
            </div>
            <button onClick={onClose} className="w-8 h-8 hover:bg-gray-100 text-gray-500 rounded-full flex items-center justify-center" data-testid="activity-modal-close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Categories */}
          <div className="w-44 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0 hidden md:block">
            <div className="py-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn("w-full text-left px-4 py-3 text-sm transition-colors",
                    categoryFilter === cat
                      ? "bg-white text-[#002B5B] font-bold border-r-2 border-[#002B5B]"
                      : "text-gray-600 hover:bg-white"
                  )}
                  data-testid={`activity-cat-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Time Filters */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-white">
              {['All', 'Morning', 'Afternoon', 'Full Day'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeFilter(tf)}
                  className={cn("px-4 py-1.5 rounded text-xs font-medium transition-colors border",
                    timeFilter === tf
                      ? "bg-[#002B5B] text-white border-[#002B5B]"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  )}
                  data-testid={`activity-time-${tf.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Card List */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin text-[#002B5B]" size={40} />
                  <p className="mt-4 text-gray-500 font-medium">Loading activities...</p>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-12">
                  <Compass size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No activities found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredActivities.map(activity => {
                    const selected = isSelected(activity.id);
                    const desc = activity.description || '';
                    const isExpanded = expandedDesc[activity.id];
                    const isLong = desc.length > 200;
                    const displayDesc = isLong && !isExpanded ? desc.slice(0, 200) : desc;

                    return (
                      <div
                        key={activity.id}
                        className={cn("border rounded-xl p-5 transition-all",
                          selected ? "border-green-500 bg-green-50/50" : "border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white"
                        )}
                        data-testid={`activity-option-${activity.id}`}
                      >
                        {/* Duplicate-day notice — Nexus DMC behavior: if this activity is already
                            on another day in this same city, warn the agent. Selecting will
                            auto-remove it from the other day. */}
                        {otherDayActivityMap[activity.id] && otherDayActivityMap[activity.id] !== dayNumber ? (
                          <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800" data-testid={`activity-other-day-${activity.id}`}>
                            <span className="font-bold">Included on day {otherDayActivityMap[activity.id]}.</span>{' '}
                            If selected, it will be removed from day {otherDayActivityMap[activity.id]}.
                          </div>
                        ) : null}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-sm mb-1.5">{activity.name}</h4>

                            {/* Start times & Duration */}
                            <p className="text-xs text-gray-600 mb-2">
                              {activity.start_times?.length > 0 && (
                                <><span className="font-semibold">Starts:</span> {activity.start_times.map(t => `${t} hrs`).join(', ')}</>
                              )}
                              {activity.duration && (
                                <>{activity.start_times?.length > 0 && <span className="mx-2 text-gray-400">|</span>}<span className="font-semibold">Duration:</span> {activity.duration}</>
                              )}
                            </p>

                            {/* Description with ...more */}
                            {desc && (
                              <p className="text-xs text-gray-500 leading-relaxed mb-2">
                                {displayDesc}
                                {isLong && (
                                  <button
                                    onClick={() => setExpandedDesc(prev => ({ ...prev, [activity.id]: !isExpanded }))}
                                    className="text-[#002B5B] font-medium ml-1 hover:underline"
                                  >
                                    ...{isExpanded ? 'less' : 'more'}
                                  </button>
                                )}
                              </p>
                            )}

                            {/* Transfer info line */}
                            <div className="flex items-center flex-wrap gap-2 mt-1">
                              <span className="text-xs text-gray-600 flex items-center gap-1">
                                <Check size={12} className="text-green-500" />
                                {activity.name} - {activity.transfer_type || 'Private'} Basis
                              </span>
                            </div>
                            {activity.start_times?.length > 0 && (
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                Starts at {activity.start_times[0]} {parseInt(activity.start_times[0]) < 12 ? 'am' : 'pm'} (Duration: {activity.duration})
                              </p>
                            )}
                            <span className={cn("inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded mt-1",
                              activity.transfer_type === 'Shared' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                            )}>
                              {activity.transfer_type || 'Private'} Transfers
                            </span>
                          </div>

                          {/* Price & Select */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <p className="text-base font-bold text-[#002B5B]">+ AED {Number(activity.price || 0).toLocaleString()}</p>
                            <button
                              onClick={() => onSelectActivity(activity)}
                              className={cn("px-5 py-2 rounded-lg text-xs font-bold transition-colors",
                                selected ? "bg-green-500 text-white" : "bg-[#002B5B] hover:bg-[#003d82] text-white"
                              )}
                              data-testid={`select-activity-${activity.id}`}
                            >
                              {selected ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredActivities.length} activit{filteredActivities.length !== 1 ? 'ies' : 'y'} available
            {selectedActivities.length > 0 && ` | ${selectedActivities.length} selected`}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            data-testid="activity-modal-done"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ActivitiesModal;

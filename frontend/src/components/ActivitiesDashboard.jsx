import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MapPin, Clock, Star, Globe, Users, Calendar, 
  Filter, ChevronDown, Check, X, Loader2, DollarSign,
  Compass, Camera, Mountain, Utensils, Waves, Car, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, API } from '@/App';

// Activity Detail Modal
function ActivityDetailModal({ activity, isOpen, onClose }) {
  if (!isOpen || !activity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative h-64 flex-shrink-0">
          <img
            src={activity.images?.[0] || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800'}
            alt={activity.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-pink-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                {activity.category || 'Activity'}
              </span>
              {activity.transfer_type && (
                <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                  {activity.transfer_type}
                </span>
              )}
              {activity.available === false && (
                <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                  Currently Unavailable
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">{activity.name}</h2>
            <div className="flex items-center gap-4 mt-2 text-white/80 text-sm">
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {activity.city}, {activity.country}
              </span>
              {activity.rating && (
                <span className="flex items-center gap-1">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  {activity.rating} ({activity.review_count || 0} reviews)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Timing & Schedule */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              Timing & Schedule
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-2 font-medium">{activity.duration}</span>
              </div>
              {activity.start_times?.length > 0 && (
                <div>
                  <span className="text-gray-500">Starts at:</span>
                  <span className="ml-2 font-medium text-blue-600">
                    {activity.start_times.join(', ')}
                  </span>
                </div>
              )}
              {activity.closed_days?.length > 0 && (
                <div className="col-span-2">
                  <span className="text-red-500 font-medium">
                    Closed/Not operated on {activity.closed_days.join(', ')}
                  </span>
                </div>
              )}
              {activity.operating_days?.length > 0 && activity.operating_days.length < 7 && (
                <div className="col-span-2">
                  <span className="text-gray-500">Operating days:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {activity.operating_days.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Languages */}
          {activity.languages?.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Globe size={18} className="text-purple-600" />
                Languages Spoken
              </h3>
              <div className="flex flex-wrap gap-2">
                {activity.languages.map((lang, idx) => (
                  <span key={idx} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description / Itinerary */}
          {activity.description && (
            <div>
              <h3 className="font-bold text-gray-800 mb-2">Tour Description / Itinerary</h3>
              <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed">
                {activity.description}
              </p>
            </div>
          )}

          {/* Useful Information */}
          {activity.useful_information?.length > 0 && (
            <div className="bg-yellow-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Info size={18} className="text-yellow-600" />
                Useful Information
              </h3>
              <ul className="space-y-1">
                {activity.useful_information.map((info, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    {info}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Inclusions & Exclusions */}
          <div className="grid grid-cols-2 gap-4">
            {activity.inclusions?.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="font-bold text-green-700 mb-2">Inclusions</h3>
                <ul className="space-y-1">
                  {activity.inclusions.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                      <Check size={14} className="text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activity.exclusions?.length > 0 && (
              <div className="bg-red-50 rounded-xl p-4">
                <h3 className="font-bold text-red-700 mb-2">Exclusions</h3>
                <ul className="space-y-1">
                  {activity.exclusions.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                      <X size={14} className="text-red-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Users size={20} className="mx-auto text-gray-400 mb-1" />
              <span className="text-gray-500">Participants</span>
              <p className="font-medium">{activity.min_participants || 1} - {activity.max_participants || 20}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Calendar size={20} className="mx-auto text-gray-400 mb-1" />
              <span className="text-gray-500">Age Restriction</span>
              <p className="font-medium">{activity.age_restriction || 'All ages'}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Info size={20} className="mx-auto text-gray-400 mb-1" />
              <span className="text-gray-500">Cancellation</span>
              <p className="font-medium text-xs">{activity.cancellation_policy || 'Free up to 24hrs'}</p>
            </div>
          </div>
        </div>

        {/* Footer with Price */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
          <div>
            <span className="text-gray-500 text-sm">Price per person</span>
            <p className="text-3xl font-bold text-green-600">
              {activity.currency || 'AED'} {activity.price || 0}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-[#002B5B] text-white rounded-xl font-bold hover:bg-[#003d82] transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Activity Card Component
function ActivityCard({ activity, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white rounded-xl border overflow-hidden cursor-pointer transition-all shadow-sm hover:shadow-xl group",
        activity.available === false ? "border-red-200 opacity-75" : "border-gray-200"
      )}
      onClick={() => onClick(activity)}
      data-testid={`activity-card-${activity.id}`}
    >
      {/* Image */}
      <div className="relative h-48">
        <img
          src={activity.images?.[0] || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400'}
          alt={activity.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="bg-pink-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
            {activity.category || 'Activity'}
          </span>
          {activity.transfer_type && (
            <span className="bg-blue-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
              {activity.transfer_type}
            </span>
          )}
        </div>
        {activity.available === false && (
          <div className="absolute top-3 right-3">
            <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
              Unavailable
            </span>
          </div>
        )}
        {activity.rating && (
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-bold">{activity.rating}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 min-h-[48px]">{activity.name}</h3>
        
        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
          <MapPin size={14} />
          <span>{activity.city}, {activity.country}</span>
        </div>

        {/* Timing */}
        {activity.start_times?.length > 0 && (
          <div className="text-xs text-blue-600 mb-2 flex items-center gap-1">
            <Clock size={12} />
            <span>Starts at {activity.start_times.slice(0, 2).join(', ')} ({activity.duration})</span>
          </div>
        )}

        {/* Closed Days */}
        {activity.closed_days?.length > 0 && (
          <div className="text-xs text-red-500 mb-2">
            Closed/Not operated on {activity.closed_days.join(', ')}
          </div>
        )}

        {/* Languages */}
        {activity.languages?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <Globe size={12} />
            <span>{activity.languages.slice(0, 3).join(', ')}</span>
          </div>
        )}

        {/* Inclusions */}
        {activity.inclusions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {activity.inclusions.slice(0, 3).map((inc, idx) => (
              <span key={idx} className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded font-medium">
                {inc}
              </span>
            ))}
            {activity.inclusions.length > 3 && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                +{activity.inclusions.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <span className="text-xs text-gray-500">From</span>
            <p className="text-lg font-bold text-green-600">
              {activity.currency || 'AED'} {activity.price || 0}
            </p>
          </div>
          <button className="px-4 py-2 bg-pink-100 text-pink-600 rounded-lg text-sm font-bold hover:bg-pink-200 transition-colors">
            View Details
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Main Activities Dashboard Component
export default function ActivitiesDashboard() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/activities');
      setActivities(res.data?.activities || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique cities and categories for filters
  const cities = [...new Set(activities.map(a => a.city).filter(Boolean))];
  const categories = [...new Set(activities.map(a => a.category).filter(Boolean))];

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = !searchQuery || 
      activity.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCity = selectedCity === 'all' || activity.city === selectedCity;
    const matchesCategory = selectedCategory === 'all' || activity.category === selectedCategory;
    
    return matchesSearch && matchesCity && matchesCategory;
  });

  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setShowDetailModal(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]" data-testid="activities-dashboard">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Explore Activities & Excursions</h1>
          <p className="text-pink-100">Discover amazing experiences for your clients</p>
          
          {/* Search and Filters */}
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={20} />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:ring-2 focus:ring-white/30 focus:border-transparent outline-none"
                  data-testid="activities-search-input"
                />
              </div>
              
              {/* City Filter */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={20} />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white appearance-none cursor-pointer focus:ring-2 focus:ring-white/30 focus:border-transparent outline-none"
                  data-testid="city-filter"
                >
                  <option value="all" className="text-gray-800">All Cities</option>
                  {cities.map(city => (
                    <option key={city} value={city} className="text-gray-800">{city}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60" size={20} />
              </div>
              
              {/* Category Filter */}
              <div className="relative">
                <Compass className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={20} />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white appearance-none cursor-pointer focus:ring-2 focus:ring-white/30 focus:border-transparent outline-none"
                  data-testid="category-filter"
                >
                  <option value="all" className="text-gray-800">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat} className="text-gray-800">{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60" size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activities Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            Showing <span className="font-bold text-gray-800">{filteredActivities.length}</span> activities
            {selectedCity !== 'all' && <span> in <span className="font-bold">{selectedCity}</span></span>}
          </p>
          {(selectedCity !== 'all' || selectedCategory !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCity('all');
                setSelectedCategory('all');
              }}
              className="text-sm text-pink-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-pink-500" size={48} />
            <p className="mt-4 text-gray-500 font-medium">Loading activities...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
            <Compass size={64} className="text-gray-300 mb-4" />
            <p className="font-bold text-gray-500 text-xl">No activities found</p>
            <p className="text-gray-400 mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActivities.map((activity) => (
              <ActivityCard 
                key={activity.id} 
                activity={activity} 
                onClick={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Activity Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <ActivityDetailModal
            activity={selectedActivity}
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedActivity(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

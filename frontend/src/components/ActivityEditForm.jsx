import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Trash2, Upload, Image, Star, Building2, Clock, Eye, Users, 
  DollarSign, ChevronDown, ChevronUp, Check, AlertCircle, MapPin, Globe,
  Calendar, Languages, Car, Info, CheckCircle, XCircle, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, API } from '@/App';

// Image Upload Component for Activities
function ActivityImageUploader({ images = [], onImagesChange, activityId = '' }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const newImages = [...images];
    
    for (const file of files) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Only JPG, PNG, GIF, WEBP allowed.`);
        continue;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('activity_id', activityId);
        
        const res = await api.post('/uploads/activity-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (res.data.url) {
          const baseUrl = API.replace('/api', '');
          const fullUrl = `${baseUrl}${res.data.url}`;
          newImages.push(fullUrl);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }
    
    onImagesChange(newImages);
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleRemoveImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const handleUrlAdd = () => {
    const url = prompt('Enter image URL:');
    if (url && url.trim()) {
      onImagesChange([...images, url.trim()]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-gray-600">Attraction Photos</label>
        <button
          type="button"
          onClick={handleUrlAdd}
          className="text-xs text-blue-600 hover:underline"
        >
          + Add URL
        </button>
      </div>
      
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative group aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img 
                src={img} 
                alt={`Preview ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => e.target.src = 'https://via.placeholder.com/200x150?text=Error'}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                  Main
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
          uploading && "opacity-50 pointer-events-none"
        )}
        onClick={() => document.getElementById(`file-input-activity-${activityId}`).click()}
      >
        <input
          id={`file-input-activity-${activityId}`}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(Array.from(e.target.files))}
        />
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-gray-500">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Drag & drop images or <span className="text-blue-600">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WEBP up to 10MB</p>
          </>
        )}
      </div>
    </div>
  );
}

// List Editor Component for arrays like inclusions, exclusions, etc.
function ListEditor({ items = [], onChange, placeholder = "Add item...", label = "Items" }) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemove = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-600">{label}</label>
      
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg group">
              <span className="flex-1 text-sm text-gray-700">{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1 text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// Days Selector Component
function DaysSelector({ operatingDays = [], closedDays = [], onChange }) {
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day) => {
    if (closedDays.includes(day)) {
      // Currently closed, make it operating
      onChange({
        operatingDays: [...operatingDays, day],
        closedDays: closedDays.filter(d => d !== day)
      });
    } else {
      // Currently operating, make it closed
      onChange({
        operatingDays: operatingDays.filter(d => d !== day),
        closedDays: [...closedDays, day]
      });
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-600">Operating Days</label>
      <div className="flex flex-wrap gap-2">
        {allDays.map(day => {
          const isClosed = closedDays.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                isClosed 
                  ? "bg-red-100 text-red-700 border border-red-200" 
                  : "bg-green-100 text-green-700 border border-green-200"
              )}
            >
              {day.slice(0, 3)}
              {isClosed && <span className="ml-1">(Closed)</span>}
            </button>
          );
        })}
      </div>
      {closedDays.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          Closed on: {closedDays.join(', ')}
        </p>
      )}
    </div>
  );
}

// Start Times Editor
function StartTimesEditor({ times = [], onChange }) {
  const [newTime, setNewTime] = useState('');

  const handleAdd = () => {
    if (newTime && !times.includes(newTime)) {
      const sortedTimes = [...times, newTime].sort();
      onChange(sortedTimes);
      setNewTime('');
    }
  };

  const handleRemove = (time) => {
    onChange(times.filter(t => t !== time));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-600">Start Times</label>
      
      {times.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {times.map((time, idx) => (
            <div key={idx} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg group">
              <Clock size={12} className="text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">{time}</span>
              <button
                type="button"
                onClick={() => handleRemove(time)}
                className="p-0.5 text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <input
          type="time"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
      <p className="text-xs text-gray-400">e.g., Starts at 10:00 am, 3:00 pm, 3:30 pm</p>
    </div>
  );
}

// Languages Editor
function LanguagesEditor({ languages = [], onChange }) {
  const commonLanguages = ['English', 'Arabic', 'Spanish', 'French', 'German', 'Italian', 'Russian', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Hindi'];
  const [showMore, setShowMore] = useState(false);

  const toggleLanguage = (lang) => {
    if (languages.includes(lang)) {
      onChange(languages.filter(l => l !== lang));
    } else {
      onChange([...languages, lang]);
    }
  };

  const displayLanguages = showMore ? commonLanguages : commonLanguages.slice(0, 6);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-600">Languages Spoken</label>
      <div className="flex flex-wrap gap-2">
        {displayLanguages.map(lang => (
          <button
            key={lang}
            type="button"
            onClick={() => toggleLanguage(lang)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
              languages.includes(lang)
                ? "bg-purple-100 text-purple-700 border-purple-200"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            )}
          >
            {lang}
            {languages.includes(lang) && <Check size={12} className="inline ml-1" />}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="px-3 py-1.5 text-sm text-blue-600 hover:underline"
        >
          {showMore ? 'Show less' : 'More...'}
        </button>
      </div>
    </div>
  );
}

// Main Activity Edit Form Component
export default function ActivityEditForm({ activity, onSave, onClose, isNew = false }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  
  // Initialize form data
  const [formData, setFormData] = useState({
    name: activity?.name || '',
    description: activity?.description || '',
    city: activity?.city || '',
    country: activity?.country || '',
    category: activity?.category || 'City Tours',
    duration: activity?.duration || '5 hrs',
    price: activity?.price || 0,
    currency: activity?.currency || 'AED',
    images: activity?.images || [],
    highlights: activity?.highlights || [],
    inclusions: activity?.inclusions || [],
    exclusions: activity?.exclusions || [],
    useful_information: activity?.useful_information || [],
    meeting_point: activity?.meeting_point || '',
    start_times: activity?.start_times || [],
    languages: activity?.languages || ['English'],
    transfer_type: activity?.transfer_type || 'Private',
    operating_days: activity?.operating_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    closed_days: activity?.closed_days || [],
    min_participants: activity?.min_participants || 1,
    max_participants: activity?.max_participants || 20,
    age_restriction: activity?.age_restriction || 'All ages',
    cancellation_policy: activity?.cancellation_policy || 'Free cancellation up to 24 hours',
    supplier_name: activity?.supplier_name || '',
    supplier_cost: activity?.supplier_cost || 0,
    available: activity?.available !== false,
    rating: activity?.rating || 4.5,
    review_count: activity?.review_count || 0
  });

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Activity name is required');
      return;
    }
    if (!formData.city.trim()) {
      alert('City is required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'timing', label: 'Timing & Schedule', icon: Clock },
    { id: 'details', label: 'Tour Details', icon: CheckCircle },
    { id: 'supplier', label: 'Supplier & Pricing', icon: Building2 }
  ];

  const categories = [
    'City Tours', 'Sightseeing', 'Adventure', 'Cultural', 'Food & Drink', 
    'Nature', 'Water Sports', 'Day Trips', 'Guided Tours', 'Museum Tours',
    'Walking Tours', 'Desert Safari', 'Boat Tours', 'Theme Parks'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-3xl mx-4 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isNew ? 'Add New Activity' : 'Edit Activity'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {formData.name || 'Untitled Activity'} {formData.city && `• ${formData.city}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 overflow-x-auto">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <motion.div
                key="basic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Activity Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="e.g., Half Day Tbilisi City Tour - Private Transfers"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="activity-name-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      data-testid="activity-category-select"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Transfer Type</label>
                    <select
                      value={formData.transfer_type}
                      onChange={(e) => handleFieldChange('transfer_type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      data-testid="activity-transfer-type-select"
                    >
                      <option value="Private">Private</option>
                      <option value="Shared">Shared</option>
                      <option value="Luxury">Luxury</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">City *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      placeholder="e.g., Tbilisi"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      data-testid="activity-city-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleFieldChange('country', e.target.value)}
                      placeholder="e.g., Georgia"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      data-testid="activity-country-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Meeting Point</label>
                  <input
                    type="text"
                    value={formData.meeting_point}
                    onChange={(e) => handleFieldChange('meeting_point', e.target.value)}
                    placeholder="e.g., Hotel lobby pickup"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="activity-meeting-point-input"
                  />
                </div>

                <LanguagesEditor
                  languages={formData.languages}
                  onChange={(langs) => handleFieldChange('languages', langs)}
                />

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => handleFieldChange('available', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    id="activity-available"
                  />
                  <label htmlFor="activity-available" className="text-sm font-medium text-gray-700">
                    Activity Available for Booking
                  </label>
                </div>
              </motion.div>
            )}

            {/* Photos Tab */}
            {activeTab === 'photos' && (
              <motion.div
                key="photos"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <ActivityImageUploader
                  images={formData.images}
                  onImagesChange={(imgs) => handleFieldChange('images', imgs)}
                  activityId={activity?.id || 'new'}
                />

                <ListEditor
                  items={formData.highlights}
                  onChange={(items) => handleFieldChange('highlights', items)}
                  placeholder="Add highlight (e.g., Narikala Fortress visit)"
                  label="Highlights / Key Features"
                />
              </motion.div>
            )}

            {/* Timing & Schedule Tab */}
            {activeTab === 'timing' && (
              <motion.div
                key="timing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Duration</label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => handleFieldChange('duration', e.target.value)}
                      placeholder="e.g., 5 hrs, Full Day, Half Day"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      data-testid="activity-duration-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Age Restriction</label>
                    <select
                      value={formData.age_restriction}
                      onChange={(e) => handleFieldChange('age_restriction', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="All ages">All ages</option>
                      <option value="3+">3+ years</option>
                      <option value="6+">6+ years</option>
                      <option value="12+">12+ years</option>
                      <option value="18+">18+ (Adults only)</option>
                    </select>
                  </div>
                </div>

                <StartTimesEditor
                  times={formData.start_times}
                  onChange={(times) => handleFieldChange('start_times', times)}
                />

                <DaysSelector
                  operatingDays={formData.operating_days}
                  closedDays={formData.closed_days}
                  onChange={({ operatingDays, closedDays }) => {
                    handleFieldChange('operating_days', operatingDays);
                    handleFieldChange('closed_days', closedDays);
                  }}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Min Participants</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.min_participants}
                      onChange={(e) => handleFieldChange('min_participants', parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Max Participants</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_participants}
                      onChange={(e) => handleFieldChange('max_participants', parseInt(e.target.value) || 20)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tour Details Tab */}
            {activeTab === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">
                    Tour Description / Itinerary
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={6}
                    placeholder="Describe the tour itinerary in detail...

Example:
10:00 AM - Meet the Driver and Guide at your hotel lobby
10:20 PM - Explore the city and have a local tour
- Visit Metekhi Church
- Monument to King Vakhtang Gorgasali
- Rike Park & Cable Car to Narikala Fortress
15:00 PM - Transfer to hotel
15:30 PM - End of the tour"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    data-testid="activity-description-textarea"
                  />
                </div>

                <ListEditor
                  items={formData.useful_information}
                  onChange={(items) => handleFieldChange('useful_information', items)}
                  placeholder="Add useful info (e.g., Small vehicle up to 6 pax...)"
                  label="Useful Information"
                />

                <ListEditor
                  items={formData.inclusions}
                  onChange={(items) => handleFieldChange('inclusions', items)}
                  placeholder="Add inclusion (e.g., Driver cum Guide, Cable Car)"
                  label="Inclusions (What's Included)"
                />

                <ListEditor
                  items={formData.exclusions}
                  onChange={(items) => handleFieldChange('exclusions', items)}
                  placeholder="Add exclusion (e.g., Lunch, Tips)"
                  label="Exclusions (What's Not Included)"
                />

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Cancellation Policy</label>
                  <select
                    value={formData.cancellation_policy}
                    onChange={(e) => handleFieldChange('cancellation_policy', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Free cancellation up to 24 hours">Free cancellation up to 24 hours</option>
                    <option value="Free cancellation up to 48 hours">Free cancellation up to 48 hours</option>
                    <option value="Free cancellation up to 72 hours">Free cancellation up to 72 hours</option>
                    <option value="Non-refundable">Non-refundable</option>
                  </select>
                </div>
              </motion.div>
            )}

            {/* Supplier & Pricing Tab */}
            {activeTab === 'supplier' && (
              <motion.div
                key="supplier"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Selling Price *</label>
                    <div className="flex">
                      <select
                        value={formData.currency}
                        onChange={(e) => handleFieldChange('currency', e.target.value)}
                        className="px-3 py-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="AED">AED</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={formData.price}
                        onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        data-testid="activity-price-input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Supplier Cost</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.supplier_cost || ''}
                      onChange={(e) => handleFieldChange('supplier_cost', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      data-testid="activity-supplier-cost-input"
                    />
                  </div>
                </div>

                {formData.price > 0 && formData.supplier_cost > 0 && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Margin:</span>
                      <span className="text-lg font-bold text-green-700">
                        {formData.currency} {(formData.price - formData.supplier_cost).toFixed(2)}
                        <span className="text-sm font-normal ml-2">
                          ({((formData.price - formData.supplier_cost) / formData.price * 100).toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={formData.supplier_name}
                    onChange={(e) => handleFieldChange('supplier_name', e.target.value)}
                    placeholder="e.g., Local Tours Georgia"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="activity-supplier-name-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Rating</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={formData.rating}
                        onChange={(e) => handleFieldChange('rating', parseFloat(e.target.value) || 0)}
                        className="w-24 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            size={20}
                            className={cn(
                              star <= formData.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Review Count</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.review_count}
                      onChange={(e) => handleFieldChange('review_count', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-[#002B5B] text-white rounded-xl font-bold hover:bg-[#003d82] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="save-activity-button"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                {isNew ? 'Create Activity' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Clock, Info, Image, Car, CheckCircle, Building2, DollarSign, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { api, resolveImageUrl } from '../App';

// Image Uploader for transfers
function TransferImageUploader({ images = [], onImagesChange, transferId = '' }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/uploads/activity-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        onImagesChange([...images, res.data.url]);
      }
    } catch (error) {
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const addFromUrl = () => {
    const url = prompt('Enter image URL:');
    if (url?.trim()) onImagesChange([...images, url.trim()]);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-600">Transfer Photos</label>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative group aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img src={resolveImageUrl(img)} alt={`Transfer ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
          uploading && "opacity-50 pointer-events-none"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
        onClick={() => document.getElementById(`img-input-transfer-${transferId}`).click()}
      >
        <input
          id={`img-input-transfer-${transferId}`}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-gray-500">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Image size={20} className="text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">Drag & drop images or <span className="text-blue-600">browse</span></p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
          </>
        )}
      </div>
      <button type="button" onClick={addFromUrl} className="text-sm text-blue-600 hover:underline">
        + Add from URL
      </button>
    </div>
  );
}

// Video Uploader for transfers
function TransferVideoUploader({ video = null, onVideoChange, transferId = '' }) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/uploads/activity-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onVideoChange(res.data.url);
    } catch (error) {
      alert(`Video upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const addFromUrl = () => {
    const url = prompt('Enter video URL (YouTube or direct link):');
    if (url?.trim()) onVideoChange(url.trim());
  };

  const getYouTubeEmbedUrl = (url) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-600">Transfer Video</label>
      {video && (
        <div className="relative">
          {getYouTubeEmbedUrl(video) ? (
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <iframe src={getYouTubeEmbedUrl(video)} title="Transfer Video" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video src={video} controls className="w-full h-full object-contain" />
            </div>
          )}
          <button type="button" onClick={() => onVideoChange(null)} className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
            <X size={14} />
          </button>
        </div>
      )}
      {!video && (
        <>
          <div
            className={cn("border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer border-gray-200 hover:border-gray-300", uploading && "opacity-50 pointer-events-none")}
            onClick={() => document.getElementById(`vid-input-transfer-${transferId}`).click()}
          >
            <input id={`vid-input-transfer-${transferId}`} type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e.target.files[0])} />
            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-sm text-gray-500">Uploading video...</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">Drag & drop video or <span className="text-purple-600">browse</span></p>
                <p className="text-xs text-gray-400 mt-1">MP4, WebM, MOV up to 100MB</p>
              </>
            )}
          </div>
          <button type="button" onClick={addFromUrl} className="text-sm text-purple-600 hover:underline">
            + Add YouTube or video URL
          </button>
        </>
      )}
    </div>
  );
}

// List Editor (reusable)
function ListEditor({ items = [], onChange, placeholder = "Add item...", label = "Items" }) {
  const [newItem, setNewItem] = useState('');
  const handleAdd = () => { if (newItem.trim()) { onChange([...items, newItem.trim()]); setNewItem(''); } };
  const handleRemove = (index) => { onChange(items.filter((_, i) => i !== index)); };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-600">{label}</label>
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg group">
              <span className="flex-1 text-sm text-gray-700">{item}</span>
              <button type="button" onClick={() => handleRemove(idx)} className="p-1 text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())} placeholder={placeholder} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <button type="button" onClick={handleAdd} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"><Plus size={16} /></button>
      </div>
    </div>
  );
}

// Pickup Times Editor
function PickupTimesEditor({ times = [], onChange }) {
  const [newTime, setNewTime] = useState('');
  const handleAdd = () => { if (newTime && !times.includes(newTime)) { onChange([...times, newTime].sort()); setNewTime(''); } };
  const handleRemove = (time) => { onChange(times.filter(t => t !== time)); };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-600">Pick-up Times</label>
      {times.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {times.map((time, idx) => (
            <div key={idx} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg group">
              <Clock size={12} className="text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">{time}</span>
              <button type="button" onClick={() => handleRemove(time)} className="p-0.5 text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <button type="button" onClick={handleAdd} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"><Plus size={16} /></button>
      </div>
      <p className="text-xs text-gray-400">e.g., 06:00, 09:00, 12:00, 15:00</p>
    </div>
  );
}

// Main Transfer Edit Form
export default function TransferEditForm({ transfer, onSave, onClose, isNew = false, cities = [] }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: transfer?.title || '',
    description: transfer?.description || '',
    from_location: transfer?.from_location || '',
    to_location: transfer?.to_location || '',
    // Derive country from the city when the saved transfer record only has
    // city set (older records didn't persist country) — keeps the dropdown
    // pre-selected on edit instead of forcing the agent to re-pick it.
    country: transfer?.country
      || cities.find(c => c.name?.toLowerCase() === (transfer?.city || '').toLowerCase())?.country
      || '',
    city: transfer?.city || '',
    transfer_type: transfer?.transfer_type || 'Private',
    transfer_direction: transfer?.transfer_direction || 'arrival',
    duration: transfer?.duration || '',
    confirmation_time: transfer?.confirmation_time || '',
    images: transfer?.images || [],
    video: transfer?.video || null,
    highlights: transfer?.highlights || [],
    inclusions: transfer?.inclusions || [],
    exclusions: transfer?.exclusions || [],
    notes: transfer?.notes || '',
    extras: transfer?.extras || [],
    pickup_times: transfer?.pickup_times || [],
    supplier_name: transfer?.supplier_name || '',
    is_available: transfer?.is_available !== false,
    max_bags: transfer?.max_bags || 0,
    vehicle_pricing: transfer?.vehicle_pricing || {
      sedan_4: { selling_price: 0, supplier_cost: 0, max_bags: 0 },
      car_7: { selling_price: 0, supplier_cost: 0, max_bags: 0 },
      van_8: { selling_price: 0, supplier_cost: 0, max_bags: 0 },
      van_17: { selling_price: 0, supplier_cost: 0, max_bags: 0 },
      bus_29: { selling_price: 0, supplier_cost: 0, max_bags: 0 },
      bus_45: { selling_price: 0, supplier_cost: 0, max_bags: 0 },
      bus_55: { selling_price: 0, supplier_cost: 0, max_bags: 0 }
    }
  });

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    if (!formData.title.trim()) { alert('Transfer title is required'); return; }
    if (!formData.city.trim()) { alert('City is required'); return; }
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save transfer');
    } finally {
      setSaving(false);
    }
  };

  // When the cities list loads asynchronously (after the form mounts) and the
  // saved transfer record didn't persist a country, derive it from the city
  // → so the Country dropdown stays pre-selected on edit instead of forcing
  // the agent to re-pick it every time.
  useEffect(() => {
    if (formData.country || !formData.city || !cities?.length) return;
    const match = cities.find(c => c.name?.toLowerCase() === formData.city.toLowerCase());
    if (match?.country) {
      setFormData(prev => ({ ...prev, country: match.country }));
    }
  }, [cities, formData.city, formData.country]);

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'photos', label: 'Photos & Video', icon: Image },
    { id: 'timing', label: 'Timing & Schedule', icon: Clock },
    { id: 'details', label: 'Route Details', icon: CheckCircle },
    { id: 'extras', label: 'Extras', icon: Plus },
    { id: 'pricing', label: 'Vehicle Pricing', icon: Car },
    { id: 'supplier', label: 'Supplier', icon: Building2 }
  ];

  const vehicles = [
    { key: 'sedan_4', label: '4 Seater Sedan', pax: '1-4 pax' },
    { key: 'car_7', label: '7 Seater Minivan', pax: '3-7 pax', optional: true },
    { key: 'van_8', label: '8 Seater Van', pax: '5-8 pax', optional: true },
    { key: 'van_17', label: '17 Seater Van', pax: '9-17 pax' },
    { key: 'bus_29', label: '29 Seater Bus', pax: '18-29 pax' },
    { key: 'bus_45', label: '45 Seater Bus', pax: '30-45 pax' },
    { key: 'bus_55', label: '55 Seater Bus', pax: '46-55 pax' }
  ];

  // For Inter-Hotel (Hotel to Hotel) transfers the From/To locations are cities,
  // so they render as dropdowns filtered to the selected country's cities.
  const isInterHotel = formData.transfer_direction === 'inter-hotel';
  const countryCities = formData.country
    ? cities.filter(c => c.country?.toLowerCase() === formData.country.toLowerCase())
    : [];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onMouseDown={(e) => {
        // Only close when the user actually clicks the backdrop itself, not when
        // a descendant (input, button, framer-motion gesture handler, etc.) bubbles up.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-3xl mx-4 shadow-2xl max-h-[90vh] flex flex-col"
        data-testid="transfer-edit-form"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isNew ? 'Add New Transfer' : 'Edit Transfer'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{formData.title || 'Untitled Transfer'} {formData.city && `- ${formData.city}`}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
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
                  activeTab === tab.id ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:bg-gray-100"
                )}
                data-testid={`transfer-tab-${tab.id}`}
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
              <motion.div key="basic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Title *</label>
                  <input type="text" value={formData.title} onChange={(e) => handleFieldChange('title', e.target.value)} placeholder="e.g., Private Airport Transfer to City Center" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent" data-testid="edit-transfer-title" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => handleFieldChange('description', e.target.value)} rows={3} placeholder="Transfer details and what's included..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none" data-testid="edit-transfer-description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">From Location{isInterHotel ? ' (City)' : ''}</label>
                    {isInterHotel ? (
                      <select value={formData.from_location} onChange={(e) => handleFieldChange('from_location', e.target.value)} disabled={!formData.country} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400" data-testid="edit-transfer-from">
                        <option value="">{formData.country ? 'Select departure city...' : 'Select a country first'}</option>
                        {countryCities.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={formData.from_location} onChange={(e) => handleFieldChange('from_location', e.target.value)} placeholder="Airport or hotel" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent" data-testid="edit-transfer-from" />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">To Location{isInterHotel ? ' (City)' : ''}</label>
                    {isInterHotel ? (
                      <select value={formData.to_location} onChange={(e) => handleFieldChange('to_location', e.target.value)} disabled={!formData.country} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400" data-testid="edit-transfer-to">
                        <option value="">{formData.country ? 'Select arrival city...' : 'Select a country first'}</option>
                        {countryCities.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={formData.to_location} onChange={(e) => handleFieldChange('to_location', e.target.value)} placeholder="Hotel or destination" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent" data-testid="edit-transfer-to" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                    <select value={formData.country} onChange={(e) => { handleFieldChange('country', e.target.value); handleFieldChange('city', ''); if (isInterHotel) { handleFieldChange('from_location', ''); handleFieldChange('to_location', ''); } }} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white" data-testid="edit-transfer-country">
                      <option value="">Select Country...</option>
                      {[...new Set(cities.map(c => c.country).filter(Boolean))].sort().map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">City *</label>
                    <select value={formData.city} onChange={(e) => handleFieldChange('city', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white" data-testid="edit-transfer-city">
                      <option value="">Select City...</option>
                      {cities.filter(c => !formData.country || c.country?.toLowerCase() === formData.country?.toLowerCase()).map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Transfer Type</label>
                    <select value={formData.transfer_type} onChange={(e) => handleFieldChange('transfer_type', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white" data-testid="edit-transfer-type">
                      <option value="Private">Private</option>
                      <option value="Shared">Shared</option>
                      <option value="Luxury">Luxury</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Direction</label>
                    <select value={formData.transfer_direction} onChange={(e) => handleFieldChange('transfer_direction', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white" data-testid="edit-transfer-direction">
                      <option value="arrival">Arrival (Airport to Hotel)</option>
                      <option value="departure">Departure (Hotel to Airport)</option>
                      <option value="inter-hotel">Inter-Hotel (Hotel to Hotel)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" checked={formData.is_available} onChange={(e) => handleFieldChange('is_available', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[#002B5B] focus:ring-[#002B5B]" data-testid="edit-transfer-available" />
                  <label className="text-sm font-bold text-gray-600">Transfer Available</label>
                </div>
              </motion.div>
            )}

            {/* Photos & Video Tab */}
            {activeTab === 'photos' && (
              <motion.div key="photos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <TransferImageUploader images={formData.images} onImagesChange={(imgs) => handleFieldChange('images', imgs)} transferId={transfer?.id || 'new'} />
                <TransferVideoUploader video={formData.video} onVideoChange={(v) => handleFieldChange('video', v)} transferId={transfer?.id || 'new'} />
                <ListEditor items={formData.highlights} onChange={(h) => handleFieldChange('highlights', h)} placeholder="Add highlight..." label="Highlights / Key Features" />
              </motion.div>
            )}

            {/* Timing & Schedule Tab */}
            {activeTab === 'timing' && (
              <motion.div key="timing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Duration</label>
                    <input type="text" value={formData.duration} onChange={(e) => handleFieldChange('duration', e.target.value)} placeholder="e.g., 1 hr" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent" data-testid="edit-transfer-duration" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Confirmation Time</label>
                    <input type="text" value={formData.confirmation_time} onChange={(e) => handleFieldChange('confirmation_time', e.target.value)} placeholder="e.g., 4 hrs" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent" data-testid="edit-transfer-confirmation" />
                  </div>
                </div>
                <PickupTimesEditor times={formData.pickup_times} onChange={(t) => handleFieldChange('pickup_times', t)} />
              </motion.div>
            )}

            {/* Route Details Tab */}
            {activeTab === 'details' && (
              <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <ListEditor items={formData.inclusions} onChange={(i) => handleFieldChange('inclusions', i)} placeholder="Add inclusion..." label="Inclusions (What's Included)" />
                <ListEditor items={formData.exclusions} onChange={(e) => handleFieldChange('exclusions', e)} placeholder="Add exclusion..." label="Exclusions (What's Not Included)" />
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Notes / Important Info</label>
                  <textarea value={formData.notes} onChange={(e) => handleFieldChange('notes', e.target.value)} rows={3} placeholder="Important notes for this transfer..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none" />
                </div>
              </motion.div>
            )}

            {/* Extras Tab */}
            {activeTab === 'extras' && (
              <motion.div key="extras" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-700">Extras Available for Purchase</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Add optional add-ons agents can offer when booking this transfer (zip line, rope way, drinks etc.)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newExtra = { id: `extra_${Date.now()}`, name: '', description: '', price: 0, vehicle_pricing: null };
                      handleFieldChange('extras', [...(formData.extras || []), newExtra]);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                    data-testid="add-extra-button"
                  >
                    <Plus size={16} /> Add Extra
                  </button>
                </div>

                {(!formData.extras || formData.extras.length === 0) && (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <DollarSign size={32} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No extras added yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Add Extra" to create purchasable add-ons</p>
                  </div>
                )}

                <div className="space-y-3">
                  {(formData.extras || []).map((extra, idx) => (
                    <div key={extra.id || idx} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors" data-testid={`extra-item-${idx}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-[1fr_120px] gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Extra Name *</label>
                              <input
                                type="text"
                                value={extra.name}
                                onChange={(e) => {
                                  const updated = [...formData.extras];
                                  updated[idx] = { ...updated[idx], name: e.target.value };
                                  handleFieldChange('extras', updated);
                                }}
                                placeholder="e.g., Zip line"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                data-testid={`extra-name-${idx}`}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Price (AED)</label>
                              <input
                                type="number"
                                min="0"
                                value={extra.price || ''}
                                onChange={(e) => {
                                  const updated = [...formData.extras];
                                  updated[idx] = { ...updated[idx], price: parseFloat(e.target.value) || 0 };
                                  handleFieldChange('extras', updated);
                                }}
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                data-testid={`extra-price-${idx}`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Description / Note</label>
                            <input
                              type="text"
                              value={extra.description || ''}
                              onChange={(e) => {
                                const updated = [...formData.extras];
                                updated[idx] = { ...updated[idx], description: e.target.value };
                                handleFieldChange('extras', updated);
                              }}
                              placeholder="e.g., Optional add-on, paid on the day"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              data-testid={`extra-desc-${idx}`}
                            />
                          </div>

                          {/* Vehicle pricing toggle */}
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...formData.extras];
                                if (updated[idx].vehicle_pricing) {
                                  updated[idx] = { ...updated[idx], vehicle_pricing: null };
                                } else {
                                  updated[idx] = {
                                    ...updated[idx],
                                    vehicle_pricing: { sedan_4: 0, car_7: 0, van_8: 0, van_17: 0, bus_29: 0, bus_45: 0, bus_55: 0 },
                                  };
                                }
                                handleFieldChange('extras', updated);
                              }}
                              className={cn(
                                'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                                extra.vehicle_pricing ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              )}
                              data-testid={`toggle-vp-${idx}`}
                            >
                              <Car size={12} className="inline mr-1" />
                              {extra.vehicle_pricing ? 'Vehicle Pricing Enabled' : 'Enable Vehicle Pricing'}
                            </button>

                            {extra.vehicle_pricing && (
                              <div className="mt-2 grid grid-cols-4 gap-2">
                                {[
                                  { key: 'sedan_4', label: 'Sedan (4)' },
                                  { key: 'car_7', label: 'Minivan (7)' },
                                  { key: 'van_17', label: 'Van (17)' },
                                  { key: 'bus_45', label: 'Bus (45)' },
                                ].map((v) => (
                                  <div key={v.key}>
                                    <label className="block text-[10px] text-gray-400 mb-0.5">{v.label}</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={extra.vehicle_pricing[v.key] || ''}
                                      onChange={(e) => {
                                        const updated = [...formData.extras];
                                        updated[idx] = {
                                          ...updated[idx],
                                          vehicle_pricing: {
                                            ...updated[idx].vehicle_pricing,
                                            [v.key]: parseFloat(e.target.value) || 0,
                                          },
                                        };
                                        handleFieldChange('extras', updated);
                                      }}
                                      placeholder="0"
                                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleFieldChange('extras', formData.extras.filter((_, i) => i !== idx))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          data-testid={`delete-extra-${idx}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Vehicle Pricing Tab */}
            {activeTab === 'pricing' && (
              <motion.div key="pricing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-gray-700 flex items-center gap-2"><Car size={18} className="text-blue-600" /> Vehicle-Based Pricing (AED)</h4>
                  <p className="text-xs text-gray-500 mt-1">Set selling price and supplier cost for each vehicle type</p>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {vehicles.map(vehicle => {
                    const vp = formData.vehicle_pricing || {};
                    const pricing = vp[vehicle.key] || { selling_price: 0, supplier_cost: 0, max_bags: 0 };
                    const margin = (pricing.selling_price || 0) - (pricing.supplier_cost || 0);
                    const marginPercent = pricing.selling_price > 0 ? (margin / pricing.selling_price * 100) : 0;
                    return (
                      <div key={vehicle.key} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-44 flex items-center gap-2 flex-shrink-0">
                            <Car size={16} className="text-gray-400" />
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium text-gray-700">{vehicle.label}</span>
                                {vehicle.optional && <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Optional</span>}
                              </div>
                              <span className="text-xs text-gray-400">{vehicle.pax}</span>
                            </div>
                          </div>
                          <div className="flex-1 grid grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Selling Price</label>
                              <input type="number" min="0" value={pricing.selling_price || ''} onChange={(e) => {
                                const newPricing = { ...formData.vehicle_pricing };
                                newPricing[vehicle.key] = { ...newPricing[vehicle.key], selling_price: parseFloat(e.target.value) || 0 };
                                handleFieldChange('vehicle_pricing', newPricing);
                              }} placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Supplier Cost</label>
                              <input type="number" min="0" value={pricing.supplier_cost || ''} onChange={(e) => {
                                const newPricing = { ...formData.vehicle_pricing };
                                newPricing[vehicle.key] = { ...newPricing[vehicle.key], supplier_cost: parseFloat(e.target.value) || 0 };
                                handleFieldChange('vehicle_pricing', newPricing);
                              }} placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Max Bags</label>
                              <input type="number" min="0" value={pricing.max_bags || ''} onChange={(e) => {
                                const newPricing = { ...formData.vehicle_pricing };
                                newPricing[vehicle.key] = { ...newPricing[vehicle.key], max_bags: parseInt(e.target.value) || 0 };
                                handleFieldChange('vehicle_pricing', newPricing);
                              }} placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Margin</label>
                              <div className={`px-3 py-2 rounded-lg text-sm font-medium ${margin > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                                {margin > 0 ? <>{margin.toFixed(0)}<span className="text-xs ml-1">({marginPercent.toFixed(0)}%)</span></> : '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Supplier Tab */}
            {activeTab === 'supplier' && (
              <motion.div key="supplier" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Supplier Name</label>
                  <input type="text" value={formData.supplier_name} onChange={(e) => handleFieldChange('supplier_name', e.target.value)} placeholder="Enter supplier name" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent" data-testid="edit-transfer-supplier-name" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-[#002B5B] text-white font-bold rounded-xl hover:bg-[#003d82] transition-colors disabled:opacity-50 flex items-center gap-2" data-testid="save-transfer-btn">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
            {saving ? 'Saving...' : 'Save Transfer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

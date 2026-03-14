import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Trash2, Upload, Image, Star, Building2, Bed, Eye, Users, 
  DollarSign, ChevronDown, ChevronUp, GripVertical, Check, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, API } from '@/App';

const ALL_COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Samoa","San Marino","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];

// Image Upload Component
function ImageUploader({ images = [], onImagesChange, uploadType = 'hotel', entityId = '' }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const newImages = [...images];
    
    for (const file of files) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Only JPG, PNG, GIF, WEBP allowed.`);
        continue;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append(uploadType === 'hotel' ? 'hotel_id' : 'room_id', entityId);
        
        const endpoint = uploadType === 'hotel' ? '/uploads/hotel-image' : '/uploads/room-image';
        const res = await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (res.data.url) {
          // Construct full URL - API returns /api/static/... which goes through the proxy
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
        <label className="block text-sm font-bold text-gray-600">Photos</label>
        <button
          type="button"
          onClick={handleUrlAdd}
          className="text-xs text-blue-600 hover:underline"
        >
          + Add URL
        </button>
      </div>
      
      {/* Image Preview Grid */}
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
      
      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
          uploading && "opacity-50 pointer-events-none"
        )}
        onClick={() => document.getElementById(`file-input-${uploadType}-${entityId}`).click()}
      >
        <input
          id={`file-input-${uploadType}-${entityId}`}
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

// Rate Plan Editor Component
function RatePlanEditor({ ratePlans = [], onChange }) {
  const [expanded, setExpanded] = useState(null);

  const addRatePlan = () => {
    const newPlan = {
      id: `rp_${Date.now()}`,
      name: 'Room Only',
      price: 0,
      supplier_cost: null,
      supplier_name: '',
      currency: 'AED',
      meal_plan: 'Room Only',
      meal_details: '',
      refund_policy: 'Refundable',
      refund_deadline: '',
      inclusions: [],
      taxes: ['Tourism Tax', 'City Tax'],
      available: true
    };
    onChange([...ratePlans, newPlan]);
    setExpanded(ratePlans.length);
  };

  const updateRatePlan = (index, field, value) => {
    const updated = [...ratePlans];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeRatePlan = (index) => {
    if (window.confirm('Delete this rate plan?')) {
      onChange(ratePlans.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-gray-600">Rate Plans</label>
        <button
          type="button"
          onClick={addRatePlan}
          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 flex items-center gap-1"
        >
          <Plus size={12} /> Add Rate Plan
        </button>
      </div>

      {ratePlans.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No rate plans. Click "Add Rate Plan" to create one.</p>
      ) : (
        <div className="space-y-2">
          {ratePlans.map((plan, idx) => (
            <div key={plan.id || idx} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Rate Plan Header */}
              <div 
                className="px-4 py-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === idx ? null : idx)}
              >
                <div className="flex items-center gap-3">
                  <DollarSign size={16} className="text-green-600" />
                  <div>
                    <span className="font-medium text-gray-800">{plan.name || 'Unnamed Plan'}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      AED {plan.price?.toLocaleString() || 0}
                    </span>
                    {plan.supplier_name && (
                      <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        {plan.supplier_name}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded font-medium",
                    plan.refund_policy === 'Refundable' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  )}>
                    {plan.refund_policy}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeRatePlan(idx); }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expanded === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {/* Rate Plan Details */}
              <AnimatePresence>
                {expanded === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4 bg-white">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Rate Name</label>
                          <input
                            type="text"
                            value={plan.name || ''}
                            onChange={(e) => updateRatePlan(idx, 'name', e.target.value)}
                            placeholder="e.g., Room Only, Breakfast Included"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Meal Plan</label>
                          <select
                            value={plan.meal_plan || 'Room Only'}
                            onChange={(e) => updateRatePlan(idx, 'meal_plan', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Room Only">Room Only</option>
                            <option value="Breakfast">Breakfast</option>
                            <option value="Half Board">Half Board</option>
                            <option value="Full Board">Full Board</option>
                            <option value="All Inclusive">All Inclusive</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Selling Price (AED)</label>
                          <input
                            type="number"
                            value={plan.price || ''}
                            onChange={(e) => updateRatePlan(idx, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Refund Policy</label>
                          <select
                            value={plan.refund_policy || 'Refundable'}
                            onChange={(e) => updateRatePlan(idx, 'refund_policy', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Refundable">Refundable</option>
                            <option value="Non-refundable">Non-refundable</option>
                          </select>
                        </div>
                      </div>

                      {/* Supplier Information for Rate Plan */}
                      <div className="grid grid-cols-2 gap-4 p-3 bg-purple-50 rounded-lg">
                        <div>
                          <label className="block text-xs font-medium text-purple-700 mb-1">Supplier Name (Optional)</label>
                          <input
                            type="text"
                            value={plan.supplier_name || ''}
                            onChange={(e) => updateRatePlan(idx, 'supplier_name', e.target.value)}
                            placeholder="e.g., Marriott Hotels"
                            className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-purple-700 mb-1">Supplier Cost/Night (Optional)</label>
                          <input
                            type="number"
                            value={plan.supplier_cost || ''}
                            onChange={(e) => updateRatePlan(idx, 'supplier_cost', parseFloat(e.target.value) || null)}
                            placeholder="Cost from supplier"
                            className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                          />
                        </div>
                      </div>

                      {plan.refund_policy === 'Refundable' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Refund Deadline</label>
                          <input
                            type="text"
                            value={plan.refund_deadline || ''}
                            onChange={(e) => updateRatePlan(idx, 'refund_deadline', e.target.value)}
                            placeholder="e.g., Fully refundable before 11 Mar"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Meal Details</label>
                        <input
                          type="text"
                          value={plan.meal_details || ''}
                          onChange={(e) => updateRatePlan(idx, 'meal_details', e.target.value)}
                          placeholder="e.g., Breakfast buffet, Breakfast for 2"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Inclusions (comma-separated)</label>
                        <input
                          type="text"
                          value={Array.isArray(plan.inclusions) ? plan.inclusions.join(', ') : ''}
                          onChange={(e) => updateRatePlan(idx, 'inclusions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="e.g., Free WiFi, Free parking, Airport transfer"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Taxes (comma-separated)</label>
                        <input
                          type="text"
                          value={Array.isArray(plan.taxes) ? plan.taxes.join(', ') : ''}
                          onChange={(e) => updateRatePlan(idx, 'taxes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="e.g., Tourism Tax, City Tax, Sales Tax"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Room Type Editor Component
function RoomTypeEditor({ roomTypes = [], onChange, hotelId = '' }) {
  const [expandedRoom, setExpandedRoom] = useState(null);

  const addRoomType = () => {
    const newRoom = {
      id: `room_${Date.now()}`,
      name: '',
      category: 'Standard',
      bed_configuration: ['1 King'],
      view_type: 'City View',
      room_size: null,
      size_unit: 'sqm',
      max_adults: 2,
      max_children: 1,
      smoking: false,
      amenities: ['Free WiFi', 'LED TV', 'Minibar'],
      images: [],
      description: '',
      rate_plans: [],
      available: true,
      total_inventory: 10
    };
    onChange([...roomTypes, newRoom]);
    setExpandedRoom(roomTypes.length);
  };

  const updateRoomType = (index, field, value) => {
    const updated = [...roomTypes];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeRoomType = (index) => {
    if (window.confirm('Delete this room type and all its rate plans?')) {
      onChange(roomTypes.filter((_, i) => i !== index));
    }
  };

  const BED_OPTIONS = [
    '1 King', '2 Twin', '1 Queen', '1 Double', '2 Double', 
    '1 King + Sofa Bed', '2 Twin + Sofa Bed', '3 Single'
  ];

  const VIEW_OPTIONS = [
    'City View', 'Garden View', 'Sea View', 'Pool View', 
    'Mountain View', 'Courtyard View', 'No View'
  ];

  const CATEGORY_OPTIONS = [
    'Standard', 'Superior', 'Deluxe', 'Junior Suite', 'Suite', 
    'Executive', 'Presidential', 'Family Room', 'Studio'
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Bed size={16} className="text-blue-500" />
          Room Types & Rate Plans
        </h3>
        <button
          type="button"
          onClick={addRoomType}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus size={14} /> Add Room Type
        </button>
      </div>

      {roomTypes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Bed className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No room types defined</p>
          <p className="text-sm text-gray-400 mt-1">Click "Add Room Type" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roomTypes.map((room, idx) => (
            <div key={room.id || idx} className={cn(
              "border rounded-xl overflow-hidden bg-white transition-all",
              room.available === false ? "border-red-200 opacity-75" : "border-gray-200"
            )}>
              {/* Room Header */}
              <div 
                className={cn(
                  "px-4 py-3 flex items-center justify-between cursor-pointer",
                  room.available === false 
                    ? "bg-gradient-to-r from-red-50 to-orange-50" 
                    : "bg-gradient-to-r from-blue-50 to-indigo-50"
                )}
                onClick={() => setExpandedRoom(expandedRoom === idx ? null : idx)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    room.available === false ? "bg-red-100" : "bg-blue-100"
                  )}>
                    <Bed className={cn(
                      "w-5 h-5",
                      room.available === false ? "text-red-600" : "text-blue-600"
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">
                        {room.name || 'Unnamed Room Type'}
                      </span>
                      {room.available === false && (
                        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-medium">
                          UNAVAILABLE
                        </span>
                      )}
                      {room.available !== false && room.total_inventory && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          {room.total_inventory} rooms
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">{room.category}</span>
                      <span>•</span>
                      <span>{room.bed_configuration?.join(', ') || 'No beds'}</span>
                      <span>•</span>
                      <span>{room.rate_plans?.length || 0} rate plans</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Availability Toggle */}
                  <div 
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs text-gray-500">Available</span>
                    <button
                      type="button"
                      onClick={() => updateRoomType(idx, 'available', room.available === false ? true : false)}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors",
                        room.available === false ? "bg-gray-300" : "bg-green-500"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        room.available === false ? "left-0.5" : "left-[22px]"
                      )} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeRoomType(idx); }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                  {expandedRoom === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Room Details */}
              <AnimatePresence>
                {expandedRoom === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4 border-t border-gray-100">
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Room Name</label>
                          <input
                            type="text"
                            value={room.name || ''}
                            onChange={(e) => updateRoomType(idx, 'name', e.target.value)}
                            placeholder="e.g., Superior Room, 1 King, City View"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                          <select
                            value={room.category || 'Standard'}
                            onChange={(e) => updateRoomType(idx, 'category', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {CATEGORY_OPTIONS.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Bed & View */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Bed Configuration</label>
                          <select
                            value={room.bed_configuration?.[0] || '1 King'}
                            onChange={(e) => updateRoomType(idx, 'bed_configuration', [e.target.value])}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {BED_OPTIONS.map(bed => (
                              <option key={bed} value={bed}>{bed}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">View Type</label>
                          <select
                            value={room.view_type || 'City View'}
                            onChange={(e) => updateRoomType(idx, 'view_type', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {VIEW_OPTIONS.map(view => (
                              <option key={view} value={view}>{view}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Size & Occupancy */}
                      <div className="grid grid-cols-5 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Room Size</label>
                          <input
                            type="number"
                            value={room.room_size || ''}
                            onChange={(e) => updateRoomType(idx, 'room_size', parseFloat(e.target.value) || null)}
                            placeholder="e.g., 35"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                          <select
                            value={room.size_unit || 'sqm'}
                            onChange={(e) => updateRoomType(idx, 'size_unit', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="sqm">sqm</option>
                            <option value="sqft">sqft</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Max Adults</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={room.max_adults || 2}
                            onChange={(e) => updateRoomType(idx, 'max_adults', parseInt(e.target.value) || 2)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Max Children</label>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            value={room.max_children || 0}
                            onChange={(e) => updateRoomType(idx, 'max_children', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-green-600 mb-1">Total Rooms</label>
                          <input
                            type="number"
                            min="0"
                            value={room.total_inventory || ''}
                            onChange={(e) => updateRoomType(idx, 'total_inventory', parseInt(e.target.value) || 0)}
                            placeholder="Inventory"
                            className="w-full px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 bg-green-50"
                          />
                        </div>
                      </div>

                      {/* Room Amenities */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Room Amenities (comma-separated)</label>
                        <input
                          type="text"
                          value={Array.isArray(room.amenities) ? room.amenities.join(', ') : ''}
                          onChange={(e) => updateRoomType(idx, 'amenities', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="e.g., Free WiFi, LED TV, Minibar, Safe, Hairdryer"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Room Description */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea
                          value={room.description || ''}
                          onChange={(e) => updateRoomType(idx, 'description', e.target.value)}
                          rows={2}
                          placeholder="Brief description of the room..."
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>

                      {/* Room Images */}
                      <ImageUploader
                        images={room.images || []}
                        onImagesChange={(images) => updateRoomType(idx, 'images', images)}
                        uploadType="room"
                        entityId={room.id}
                      />

                      {/* Rate Plans */}
                      <RatePlanEditor
                        ratePlans={room.rate_plans || []}
                        onChange={(plans) => updateRoomType(idx, 'rate_plans', plans)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Rating Breakdown Editor
function RatingBreakdownEditor({ ratings = {}, onChange }) {
  const categories = [
    { key: 'cleanliness', label: 'Cleanliness' },
    { key: 'service', label: 'Service' },
    { key: 'comfort', label: 'Comfort' },
    { key: 'location', label: 'Location' },
    { key: 'amenities', label: 'Amenities' }
  ];

  const updateRating = (key, value) => {
    onChange({ ...ratings, [key]: parseFloat(value) || 0 });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-600">Rating Breakdown (0-5)</label>
      <div className="grid grid-cols-5 gap-3">
        {categories.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={ratings[key] || ''}
              onChange={(e) => updateRating(key, e.target.value)}
              placeholder="4.5"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Hotel Edit Form Component
export default function HotelEditForm({ hotel, onSave, onClose, isNew = false }) {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    country: '',
    address: '',
    description: '',
    star_rating: 4,
    rating_score: 8.0,
    rating_text: 'Very Good',
    review_count: 0,
    images: [],
    amenities: [],
    detailed_ratings: {},
    highlights: [],
    room_types: [],
    check_in_time: '14:00',
    check_out_time: '12:00',
    total_rooms: null,
    board_types: ['RO', 'BB'],
    cancellation_policy: 'Flexible',
    supplier_name: '',
    supplier_cost_per_night: null,
    ...hotel
  });
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name?.trim()) {
      alert('Hotel name is required');
      return;
    }
    if (!formData.city?.trim()) {
      alert('City is required');
      return;
    }
    
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save hotel');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: Building2 },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'ratings', label: 'Ratings', icon: Star },
    { id: 'rooms', label: 'Room Types', icon: Bed }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002B5B] to-[#004080] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 size={24} />
            <div>
              <h2 className="text-xl font-bold">{isNew ? 'Add New Hotel' : 'Edit Hotel'}</h2>
              <p className="text-blue-200 text-sm">{formData.name || 'Unnamed Hotel'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-gray-50">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeSection === id 
                  ? "border-[#002B5B] text-[#002B5B]" 
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Basic Info Section */}
          {activeSection === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Hotel Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="e.g., Courtyard by Marriott Baku"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  data-testid="hotel-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder="Full hotel address"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">City *</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                  <select
                    value={formData.country || ''}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
                    data-testid="edit-hotel-country"
                  >
                    <option value="">Select Country...</option>
                    {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Star Rating</label>
                  <select
                    value={formData.star_rating || 4}
                    onChange={(e) => handleFieldChange('star_rating', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  >
                    {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} Star</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Total Rooms</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.total_rooms || ''}
                    onChange={(e) => handleFieldChange('total_rooms', parseInt(e.target.value) || null)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Cancellation</label>
                  <select
                    value={formData.cancellation_policy || 'Flexible'}
                    onChange={(e) => handleFieldChange('cancellation_policy', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  >
                    <option value="Flexible">Flexible</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Strict">Strict</option>
                    <option value="Non-refundable">Non-refundable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Check-in Time</label>
                  <input
                    type="time"
                    value={formData.check_in_time || '14:00'}
                    onChange={(e) => handleFieldChange('check_in_time', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Check-out Time</label>
                  <input
                    type="time"
                    value={formData.check_out_time || '12:00'}
                    onChange={(e) => handleFieldChange('check_out_time', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Board Types Available</label>
                <div className="flex flex-wrap gap-2">
                  {['RO', 'BB', 'HB', 'FB'].map((board) => (
                    <label key={board} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={(formData.board_types || []).includes(board)}
                        onChange={(e) => {
                          const current = formData.board_types || [];
                          if (e.target.checked) {
                            handleFieldChange('board_types', [...current, board]);
                          } else {
                            handleFieldChange('board_types', current.filter(b => b !== board));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {board === 'RO' ? 'Room Only' : board === 'BB' ? 'B&B' : board === 'HB' ? 'Half Board' : 'Full Board'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Amenities (comma-separated)</label>
                <input
                  type="text"
                  value={Array.isArray(formData.amenities) ? formData.amenities.join(', ') : ''}
                  onChange={(e) => handleFieldChange('amenities', e.target.value.split(',').map(a => a.trim()).filter(Boolean))}
                  placeholder="e.g., Free WiFi, Pool, Spa, Gym, Restaurant"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Highlights / What to Know (comma-separated)</label>
                <input
                  type="text"
                  value={Array.isArray(formData.highlights) ? formData.highlights.join(', ') : ''}
                  onChange={(e) => handleFieldChange('highlights', e.target.value.split(',').map(h => h.trim()).filter(Boolean))}
                  placeholder="e.g., Walking distance to metro, Free parking, 24-hour fitness center"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  rows={3}
                  placeholder="Detailed description of the hotel..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}

          {/* Photos Section */}
          {activeSection === 'photos' && (
            <div className="space-y-4">
              <ImageUploader
                images={formData.images || []}
                onImagesChange={(images) => handleFieldChange('images', images)}
                uploadType="hotel"
                entityId={formData.id || 'new'}
              />
            </div>
          )}

          {/* Ratings Section */}
          {activeSection === 'ratings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Overall Score (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={formData.rating_score || ''}
                    onChange={(e) => handleFieldChange('rating_score', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Rating Text</label>
                  <select
                    value={formData.rating_text || 'Very Good'}
                    onChange={(e) => handleFieldChange('rating_text', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  >
                    <option value="Exceptional">Exceptional (9.5+)</option>
                    <option value="Wonderful">Wonderful (9.0+)</option>
                    <option value="Excellent">Excellent (8.5+)</option>
                    <option value="Very Good">Very Good (8.0+)</option>
                    <option value="Good">Good (7.0+)</option>
                    <option value="Pleasant">Pleasant (6.0+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Review Count</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.review_count || ''}
                    onChange={(e) => handleFieldChange('review_count', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  />
                </div>
              </div>

              <RatingBreakdownEditor
                ratings={formData.detailed_ratings || {}}
                onChange={(ratings) => handleFieldChange('detailed_ratings', ratings)}
              />
            </div>
          )}

          {/* Room Types Section */}
          {activeSection === 'rooms' && (
            <RoomTypeEditor
              roomTypes={formData.room_types || []}
              onChange={(types) => handleFieldChange('room_types', types)}
              hotelId={formData.id || 'new'}
            />
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-[#002B5B] text-white rounded-xl font-bold hover:bg-[#003d82] transition-colors disabled:opacity-50 flex items-center gap-2"
            data-testid="save-hotel-button"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} />
                {isNew ? 'Create Hotel' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

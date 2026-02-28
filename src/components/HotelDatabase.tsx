import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Building2, 
  MapPin, 
  Globe, 
  ChevronLeft,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Star,
  Eye,
  Image as ImageIcon,
  Info,
  Bed,
  DollarSign,
  Maximize2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { HOTEL_DATABASE, Hotel, Room } from '../data/hotels';

const ITEMS_PER_PAGE = 20;

export default function HotelDatabase({ 
  onBack,
  onViewHotel
}: { 
  onBack: () => void,
  onViewHotel?: (hotel: Hotel) => void
}) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'basic' | 'ratings' | 'media' | 'rooms'>('basic');
  const [editingHotel, setEditingHotel] = useState<{ hotel: Hotel, index: number } | null>(null);
  const [formData, setFormData] = useState<Hotel>({
    id: '',
    name: '',
    city: '',
    country: '',
    address: '',
    description: '',
    starRating: 5,
    ratingScore: 0,
    ratingText: '',
    reviewCount: 0,
    images: [],
    amenities: [],
    detailedRatings: {
      cleanliness: 0,
      service: 0,
      comfort: 0,
      condition: 0,
      amenities: 0
    },
    whatToKnow: [],
    rooms: []
  });
  const [amenityInput, setAmenityInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [whatToKnowInput, setWhatToKnowInput] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hotels');
      const data = await response.json();
      if (data.success) {
        setHotels(data.hotels);
      }
    } catch (error) {
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  const countries = useMemo(() => ['All', ...Array.from(new Set(hotels.map(h => h.country)))].sort(), [hotels]);

  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      const matchesSearch = 
        hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCountry = selectedCountry === 'All' || hotel.country === selectedCountry;
      
      return matchesSearch && matchesCountry;
    });
  }, [hotels, searchTerm, selectedCountry]);

  const totalPages = Math.ceil(filteredHotels.length / ITEMS_PER_PAGE);
  const paginatedHotels = filteredHotels.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleOpenModal = (hotel?: Hotel, index?: number) => {
    if (hotel && index !== undefined) {
      setEditingHotel({ hotel, index });
      setFormData(hotel);
    } else {
      setEditingHotel(null);
      setFormData({ 
        id: `H${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`, 
        name: '', 
        city: '', 
        country: '', 
        address: '',
        description: '',
        starRating: 5, 
        ratingScore: 0,
        ratingText: '',
        reviewCount: 0,
        images: [],
        amenities: [],
        detailedRatings: {
          cleanliness: 0,
          service: 0,
          comfort: 0,
          condition: 0,
          amenities: 0
        },
        whatToKnow: [],
        rooms: []
      });
    }
    setAmenityInput('');
    setImageInput('');
    setWhatToKnowInput({ title: '', description: '' });
    setModalTab('basic');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingHotel ? 'PUT' : 'POST';
      const url = editingHotel ? `/api/hotels/${formData.id}` : '/api/hotels';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchHotels();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving hotel:', error);
      alert('Failed to save hotel data. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this hotel?')) {
      try {
        const response = await fetch(`/api/hotels/${id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          await fetchHotels();
        }
      } catch (error) {
        console.error('Error deleting hotel:', error);
      }
    }
  };

  const addAmenity = () => {
    if (amenityInput.trim() && !formData.amenities.includes(amenityInput.trim())) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenityInput.trim()]
      });
      setAmenityInput('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter(a => a !== amenity)
    });
  };

  const addImage = () => {
    if (imageInput.trim() && !formData.images.includes(imageInput.trim())) {
      setFormData({
        ...formData,
        images: [...formData.images, imageInput.trim()]
      });
      setImageInput('');
    }
  };

  const removeImage = (img: string) => {
    setFormData({
      ...formData,
      images: formData.images.filter(i => i !== img)
    });
  };

  const addWhatToKnow = () => {
    if (whatToKnowInput.title.trim() && whatToKnowInput.description.trim()) {
      setFormData({
        ...formData,
        whatToKnow: [...formData.whatToKnow, { icon: 'Info', title: whatToKnowInput.title.trim(), description: whatToKnowInput.description.trim() }]
      });
      setWhatToKnowInput({ title: '', description: '' });
    }
  };

  const removeWhatToKnow = (index: number) => {
    setFormData({
      ...formData,
      whatToKnow: formData.whatToKnow.filter((_, i) => i !== index)
    });
  };

  const addRoom = () => {
    const newRoom: Room = {
      id: `R${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      name: 'New Room Type',
      type: 'Standard',
      bedType: '1 King',
      view: 'City View',
      size: '30 sqm',
      price: 0,
      originalPrice: 0,
      currency: 'AED',
      amenities: [],
      refundable: true,
      meals: 'No meals included',
      images: []
    };
    setFormData({
      ...formData,
      rooms: [...formData.rooms, newRoom]
    });
  };

  const updateRoom = (index: number, field: keyof Room, value: any) => {
    const newRooms = [...formData.rooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    setFormData({ ...formData, rooms: newRooms });
  };

  const removeRoom = (index: number) => {
    setFormData({
      ...formData,
      rooms: formData.rooms.filter((_, i) => i !== index)
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (!formData.images.includes(base64String)) {
          setFormData({
            ...formData,
            images: [...formData.images, base64String]
          });
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[#002B5B]">Hotel Database</h2>
            <p className="text-sm text-gray-500">Manage global hotel inventory and ratings</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-[#002B5B] text-white rounded-2xl text-sm font-bold hover:bg-[#003d82] transition-all shadow-lg shadow-[#002B5B]/20"
        >
          <Plus size={18} />
          Add New Hotel
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by hotel name, city, or ID..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
              />
            </div>
            <div className="relative w-full md:w-64">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium appearance-none"
              >
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="py-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-6">ID</th>
                <th className="py-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-6">Hotel Name</th>
                <th className="py-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-6">Location</th>
                <th className="py-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-6">Rating</th>
                <th className="py-4 font-bold text-xs text-gray-400 uppercase tracking-widest px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-[#002B5B] border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold text-gray-400">Loading hotels...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedHotels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Building2 size={48} />
                      <span className="font-bold">No hotels found matching your criteria</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedHotels.map((hotel, index) => (
                  <tr 
                    key={hotel.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-[#002B5B] text-xs font-black border border-blue-100">
                        {hotel.id}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-gray-800">{hotel.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-orange-400" />
                          <span className="text-sm font-medium text-gray-600">{hotel.city}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Globe size={12} className="text-blue-400" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{hotel.country}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: hotel.starRating }).map((_, i) => (
                          <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 transition-opacity">
                        {onViewHotel && (
                          <button 
                            onClick={() => onViewHotel(hotel)}
                            className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenModal(hotel, index)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(hotel.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Showing {paginatedHotels.length} of {filteredHotels.length} results
          </p>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronsLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-[#002B5B] px-3 py-1 bg-white rounded-lg border border-gray-200">
                  {currentPage}
                </span>
                <span className="text-sm text-gray-400 font-medium">of {totalPages}</span>
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
              >
                <ChevronsRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-bold text-[#002B5B]">
                    {editingHotel ? 'Edit Hotel' : 'Add New Hotel'}
                  </h3>
                  <p className="text-sm text-gray-500">Enter the hotel details below</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex border-b border-gray-100 bg-gray-50/30">
                {[
                  { id: 'basic', label: 'Basic Info', icon: Building2 },
                  { id: 'ratings', label: 'Ratings', icon: Star },
                  { id: 'media', label: 'Media & Info', icon: ImageIcon },
                  { id: 'rooms', label: 'Rooms', icon: Bed }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-widest transition-all relative",
                      modalTab === tab.id ? "text-[#002B5B]" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                    {modalTab === tab.id && <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#002B5B]" />}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                {modalTab === 'basic' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Hotel Name</label>
                        <input 
                          required
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                          placeholder="e.g. The Ritz-Carlton"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Star Rating</label>
                        <select
                          value={formData.starRating}
                          onChange={(e) => setFormData({ ...formData, starRating: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium appearance-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map(rating => (
                            <option key={rating} value={rating}>{rating} Star</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">City</label>
                        <input 
                          required
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                          placeholder="e.g. New York"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Country</label>
                        <input 
                          required
                          type="text"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                          placeholder="e.g. United States"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Address</label>
                      <input 
                        required
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                        placeholder="Full street address"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Description</label>
                      <textarea 
                        required
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium resize-none"
                        placeholder="Hotel description and history..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Amenities</label>
                      <div className="flex gap-2 mb-2">
                        <input 
                          type="text"
                          value={amenityInput}
                          onChange={(e) => setAmenityInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addAmenity();
                            }
                          }}
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                          placeholder="e.g. Free WiFi (Press Enter to add)"
                        />
                        <button 
                          type="button"
                          onClick={addAmenity}
                          className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.amenities.map(amenity => (
                          <span key={amenity} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                            {amenity}
                            <button 
                              type="button"
                              onClick={() => removeAmenity(amenity)}
                              className="p-0.5 hover:bg-blue-100 rounded-full transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'ratings' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Overall Score (0-10)</label>
                        <input 
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={formData.ratingScore}
                          onChange={(e) => setFormData({ ...formData, ratingScore: parseFloat(e.target.value) })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Rating Text</label>
                        <input 
                          type="text"
                          value={formData.ratingText}
                          onChange={(e) => setFormData({ ...formData, ratingText: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                          placeholder="e.g. Wonderful"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Review Count</label>
                        <input 
                          type="number"
                          value={formData.reviewCount}
                          onChange={(e) => setFormData({ ...formData, reviewCount: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-3xl space-y-6">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <Star size={18} className="text-yellow-500" />
                        Detailed Ratings (0-5)
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        {Object.keys(formData.detailedRatings).map((key) => (
                          <div key={key} className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 capitalize">{key}</label>
                            <input 
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              value={(formData.detailedRatings as any)[key]}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                detailedRatings: { ...formData.detailedRatings, [key]: parseFloat(e.target.value) } 
                              })}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'media' && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hotel Photos</label>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            id="hotel-photo-upload"
                            onChange={handleFileUpload}
                          />
                          <label 
                            htmlFor="hotel-photo-upload"
                            className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
                          >
                            <Plus size={14} />
                            Upload from computer
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={imageInput}
                          onChange={(e) => setImageInput(e.target.value)}
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                          placeholder="Or paste image URL here..."
                        />
                        <button 
                          type="button"
                          onClick={addImage}
                          className="px-6 py-3 bg-[#002B5B] text-white rounded-2xl text-sm font-bold hover:bg-[#003d82] transition-all"
                        >
                          Add Photo
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {formData.images.map((img, i) => (
                          <div key={i} className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100">
                            <img src={img} alt="Hotel" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => removeImage(img)}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-3xl space-y-6">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <Info size={18} className="text-blue-500" />
                        What to Know (Highlights)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="text"
                          value={whatToKnowInput.title}
                          onChange={(e) => setWhatToKnowInput({ ...whatToKnowInput, title: e.target.value })}
                          className="px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                          placeholder="Title (e.g. Location)"
                        />
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={whatToKnowInput.description}
                            onChange={(e) => setWhatToKnowInput({ ...whatToKnowInput, description: e.target.value })}
                            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                            placeholder="Description"
                          />
                          <button 
                            type="button"
                            onClick={addWhatToKnow}
                            className="px-4 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {formData.whatToKnow.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                <Info size={14} />
                              </div>
                              <div className="text-sm">
                                <span className="font-bold text-gray-800">{item.title}: </span>
                                <span className="text-gray-500">{item.description}</span>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeWhatToKnow(i)}
                              className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'rooms' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-800">Room Types & Pricing</h4>
                      <button 
                        type="button"
                        onClick={addRoom}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                      >
                        <Plus size={14} />
                        Add Room Type
                      </button>
                    </div>

                    <div className="space-y-6">
                      {formData.rooms.map((room, i) => (
                        <div key={i} className="bg-gray-50 p-6 rounded-3xl border border-gray-200 space-y-6 relative group">
                          <button 
                            type="button"
                            onClick={() => removeRoom(i)}
                            className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>

                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Room Name</label>
                              <input 
                                type="text"
                                value={room.name}
                                onChange={(e) => updateRoom(i, 'name', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                                placeholder="e.g. Superior King Room"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Room Type</label>
                              <input 
                                type="text"
                                value={room.type}
                                onChange={(e) => updateRoom(i, 'type', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                                placeholder="e.g. Superior"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Bed Type</label>
                              <input 
                                type="text"
                                value={room.bedType}
                                onChange={(e) => updateRoom(i, 'bedType', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                                placeholder="e.g. 1 King Bed"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">View</label>
                              <input 
                                type="text"
                                value={room.view}
                                onChange={(e) => updateRoom(i, 'view', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                                placeholder="e.g. City View"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Size</label>
                              <input 
                                type="text"
                                value={room.size}
                                onChange={(e) => updateRoom(i, 'size', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                                placeholder="e.g. 35 sqm"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Current Price</label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input 
                                  type="number"
                                  value={room.price}
                                  onChange={(e) => updateRoom(i, 'price', parseInt(e.target.value))}
                                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Original Price</label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input 
                                  type="number"
                                  value={room.originalPrice}
                                  onChange={(e) => updateRoom(i, 'originalPrice', parseInt(e.target.value))}
                                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Currency</label>
                              <input 
                                type="text"
                                value={room.currency}
                                onChange={(e) => updateRoom(i, 'currency', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-8 flex gap-4 sticky bottom-0 bg-white pb-2 border-t border-gray-100 mt-auto">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-[#002B5B] text-white rounded-2xl text-sm font-bold hover:bg-[#003d82] transition-all shadow-lg shadow-[#002B5B]/20"
                  >
                    {editingHotel ? 'Save All Changes' : 'Create Hotel'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

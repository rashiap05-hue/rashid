import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp,
  Info, Shield, Hotel, CreditCard, Check, Briefcase, FileText,
  Globe, MapPin, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

const ICONS = {
  info: Info,
  shield: Shield,
  hotel: Hotel,
  creditCard: CreditCard,
  check: Check,
  briefcase: Briefcase,
  edit: Edit2,
  file: FileText
};

const CATEGORIES = [
  'Commitments',
  'General',
  'Regional',
  'Legal',
  'Cancellation',
  'Payment',
  'Booking'
];

const ICON_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'shield', label: 'Shield' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'creditCard', label: 'Credit Card' },
  { value: 'check', label: 'Check' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'edit', label: 'Edit' },
  { value: 'file', label: 'File' }
];

export default function TermsPoliciesManager() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTerm, setEditingTerm] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    content: [],
    sub_sections: [],
    country: '',
    city: '',
    applies_to: 'all',
    order: 0,
    is_expanded_default: false,
    is_active: true,
    icon: 'info'
  });

  useEffect(() => {
    fetchTerms();
    fetchCountriesAndCities();
  }, []);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/terms-policies/all');
      setTerms(response.data);
    } catch (error) {
      console.error('Error fetching terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountriesAndCities = async () => {
    try {
      const citiesRes = await api.get('/cities');
      const uniqueCountries = [...new Set(citiesRes.data.map(c => c.country).filter(Boolean))];
      setCountries(uniqueCountries);
      setCities(citiesRes.data.map(c => c.name));
    } catch (error) {
      console.error('Error fetching countries/cities:', error);
    }
  };

  const handleCreate = () => {
    setFormData({
      title: '',
      category: 'General',
      content: [],
      sub_sections: [],
      country: '',
      city: '',
      applies_to: 'all',
      order: terms.length + 1,
      is_expanded_default: false,
      is_active: true,
      icon: 'info'
    });
    setIsCreating(true);
    setEditingTerm(null);
  };

  const handleEdit = (term) => {
    setFormData({
      ...term,
      country: term.country || '',
      city: term.city || ''
    });
    setEditingTerm(term.id);
    setIsCreating(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...formData,
        country: formData.country || null,
        city: formData.city || null
      };

      if (isCreating) {
        await api.post('/terms-policies', payload);
      } else {
        await api.put(`/terms-policies/${editingTerm}`, payload);
      }
      
      await fetchTerms();
      setEditingTerm(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Error saving term:', error);
      alert('Failed to save. Make sure you are logged in as admin.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this term/policy?')) return;
    
    try {
      await api.delete(`/terms-policies/${id}`);
      await fetchTerms();
    } catch (error) {
      console.error('Error deleting term:', error);
      alert('Failed to delete. Make sure you are logged in as admin.');
    }
  };

  const handleCancel = () => {
    setEditingTerm(null);
    setIsCreating(false);
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addContentItem = () => {
    setFormData(prev => ({
      ...prev,
      content: [...prev.content, '']
    }));
  };

  const updateContentItem = (index, value) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content.map((item, i) => i === index ? value : item)
    }));
  };

  const removeContentItem = (index) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content.filter((_, i) => i !== index)
    }));
  };

  const addSubSection = () => {
    setFormData(prev => ({
      ...prev,
      sub_sections: [...prev.sub_sections, { title: '', items: [] }]
    }));
  };

  const updateSubSection = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sub_sections: prev.sub_sections.map((section, i) => 
        i === index ? { ...section, [field]: value } : section
      )
    }));
  };

  const addSubSectionItem = (sectionIndex) => {
    setFormData(prev => ({
      ...prev,
      sub_sections: prev.sub_sections.map((section, i) => 
        i === sectionIndex ? { ...section, items: [...section.items, ''] } : section
      )
    }));
  };

  const updateSubSectionItem = (sectionIndex, itemIndex, value) => {
    setFormData(prev => ({
      ...prev,
      sub_sections: prev.sub_sections.map((section, i) => 
        i === sectionIndex ? {
          ...section,
          items: section.items.map((item, j) => j === itemIndex ? value : item)
        } : section
      )
    }));
  };

  const removeSubSectionItem = (sectionIndex, itemIndex) => {
    setFormData(prev => ({
      ...prev,
      sub_sections: prev.sub_sections.map((section, i) => 
        i === sectionIndex ? {
          ...section,
          items: section.items.filter((_, j) => j !== itemIndex)
        } : section
      )
    }));
  };

  const removeSubSection = (index) => {
    setFormData(prev => ({
      ...prev,
      sub_sections: prev.sub_sections.filter((_, i) => i !== index)
    }));
  };

  const IconComponent = (iconName) => {
    const Icon = ICONS[iconName] || Info;
    return <Icon size={18} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Terms & Policies Management</h2>
          <p className="text-gray-500 text-sm mt-1">Manage terms, policies and conditions by country/city</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#002B5B] text-white rounded-lg hover:bg-[#003d82] transition-colors"
        >
          <Plus size={18} />
          Add New
        </button>
      </div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {(isCreating || editingTerm) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {isCreating ? 'Create New Term/Policy' : 'Edit Term/Policy'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Hotel Cancellation Policy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ICON_OPTIONS.map(icon => (
                    <option key={icon.value} value={icon.value}>{icon.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
                <select
                  value={formData.applies_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, applies_to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Destinations</option>
                  <option value="country">Specific Country</option>
                  <option value="city">Specific City</option>
                </select>
              </div>

              {formData.applies_to === 'country' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                    <option value="Europe">Europe (Region)</option>
                    <option value="Asia">Asia (Region)</option>
                    <option value="Middle East">Middle East (Region)</option>
                  </select>
                </div>
              )}

              {formData.applies_to === 'city' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select City</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_expanded_default}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_expanded_default: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Expanded by Default</span>
              </label>
            </div>

            {/* Content Items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Content Items</label>
                <button
                  onClick={addContentItem}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              {formData.content.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateContentItem(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Enter policy item..."
                  />
                  <button
                    onClick={() => removeContentItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Sub Sections */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Sub Sections (e.g., General, Hotel, Europe)</label>
                <button
                  onClick={addSubSection}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Sub Section
                </button>
              </div>
              {formData.sub_sections.map((section, sIndex) => (
                <div key={sIndex} className="bg-gray-50 rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSubSection(sIndex, 'title', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                      placeholder="Section title (e.g., General, Hotel)"
                    />
                    <button
                      onClick={() => removeSubSection(sIndex)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="ml-4">
                    {section.items.map((item, iIndex) => (
                      <div key={iIndex} className="flex gap-2 mb-2">
                        <span className="text-gray-400 mt-2">{iIndex + 1}.</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateSubSectionItem(sIndex, iIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Enter item..."
                        />
                        <button
                          onClick={() => removeSubSectionItem(sIndex, iIndex)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addSubSectionItem(sIndex)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.title}
                className="flex items-center gap-2 px-4 py-2 bg-[#002B5B] text-white rounded-lg hover:bg-[#003d82] transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isCreating ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terms List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Order</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Title</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Category</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Applies To</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((term) => (
              <React.Fragment key={term.id}>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{term.order}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleExpand(term.id)}
                      className="flex items-center gap-2 text-left"
                    >
                      {expandedItems[term.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span className="text-gray-500">{IconComponent(term.icon)}</span>
                      <span className="font-medium text-gray-800">{term.title}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      {term.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {term.applies_to === 'all' ? (
                      <span className="flex items-center gap-1">
                        <Globe size={14} /> All
                      </span>
                    ) : term.applies_to === 'country' ? (
                      <span className="flex items-center gap-1">
                        <Globe size={14} /> {term.country}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {term.city}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      term.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {term.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(term)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(term.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Expanded content */}
                {expandedItems[term.id] && (
                  <tr className="bg-gray-50">
                    <td colSpan="6" className="px-8 py-4">
                      {term.content && term.content.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Content:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {term.content.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {term.sub_sections && term.sub_sections.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Sub Sections:</p>
                          {term.sub_sections.map((section, si) => (
                            <div key={si} className="mb-3 ml-4">
                              <p className="text-sm font-semibold text-gray-700">{section.title}</p>
                              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1 ml-2">
                                {section.items.map((item, ii) => (
                                  <li key={ii}>{item}</li>
                                ))}
                              </ol>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, User, Calendar, MapPin, Hotel, Car, Camera, 
  ChevronDown, ChevronUp, Check, AlertCircle, Clock, Shield,
  Mail, Phone, Building, FileText, Upload, X, Info, CreditCard, Bed, Loader2, ScanLine
} from 'lucide-react';
import { api } from '../App';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = Array.from({length: 31}, (_, i) => i + 1);
const YEARS = Array.from({length: 100}, (_, i) => new Date().getFullYear() - i);
const ISSUE_EXPIRY_YEARS = Array.from({length: 30}, (_, i) => new Date().getFullYear() + 10 - i);
const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr'];
const NATIONALITIES = ['Afghanistan','Albania','Algeria','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia','Brazil','Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Ecuador','Egypt','Estonia','Ethiopia','Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan','Latvia','Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Maldives','Mexico','Moldova','Mongolia','Montenegro','Morocco','Myanmar','Nepal','Netherlands','New Zealand','Nigeria','North Macedonia','Norway','Oman','Pakistan','Palestine','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','Somalia','South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Tunisia','Turkey','Turkmenistan','UAE','Uganda','UK','Ukraine','Uruguay','USA','Uzbekistan','Venezuela','Vietnam','Yemen','Zimbabwe'];

function formatDate(dateStr, format = 'long') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  if (format === 'short') return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Traveler form row
function TravelerForm({ index, roomIndex, traveler, onChange, isChild, isFirstInRoom }) {
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState(''); // '', 'success', 'error'
  const fileInputRef = React.useRef(null);
  const [scanKey, setScanKey] = useState(0);

  const handleDocUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const file = files[0];
    const newDoc = { name: file.name, size: file.size };
    const existing = traveler.documents || [];

    // Auto-scan passport
    setScanning(true);
    setScanStatus('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/scan-passport', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        // Convert all values to strings for select compatibility
        onChange({
          ...traveler,
          title: String(d.title || '') || traveler.title,
          firstName: String(d.firstName || '') || traveler.firstName,
          lastName: String(d.lastName || '') || traveler.lastName,
          dobDay: String(d.dobDay || '') || traveler.dobDay,
          dobMonth: String(d.dobMonth || '') || traveler.dobMonth,
          dobYear: String(d.dobYear || '') || traveler.dobYear,
          passportNumber: String(d.passportNumber || '') || traveler.passportNumber,
          issueDay: String(d.issueDay || '') || traveler.issueDay,
          issueMonth: String(d.issueMonth || '') || traveler.issueMonth,
          issueYear: String(d.issueYear || '') || traveler.issueYear,
          expiryDay: String(d.expiryDay || '') || traveler.expiryDay,
          expiryMonth: String(d.expiryMonth || '') || traveler.expiryMonth,
          expiryYear: String(d.expiryYear || '') || traveler.expiryYear,
          nationality: String(d.nationality || '') || traveler.nationality,
          documents: [...existing, newDoc]
        });
        setScanStatus('success');
        setScanKey(k => k + 1);
      } else {
        // Scan failed, still save the document
        onChange({...traveler, documents: [...existing, newDoc]});
        setScanStatus('error');
      }
    } catch (err) {
      console.error('Passport scan failed:', err);
      onChange({...traveler, documents: [...existing, newDoc]});
      setScanStatus('error');
    } finally {
      setScanning(false);
      // Reset input so the same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setScanStatus(''), 8000);
    }
  };

  const removeDoc = (docIdx) => {
    onChange({...traveler, documents: (traveler.documents || []).filter((_, i) => i !== docIdx)});
  };

  return (
    <div key={scanKey} className="mb-6 border border-gray-200 rounded-lg p-5" data-testid={`traveler-form-${roomIndex}-${index}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Room {roomIndex + 1}</p>
          <h4 className="text-base font-bold text-gray-900">
            Traveler {index + 1}: {isChild ? 'Child' : 'Adult'}
          </h4>
        </div>
        <button className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`pick-traveler-${roomIndex}-${index}`}>
          Pick Traveler
        </button>
      </div>

      {/* Row 1: Title, First Name, Last Name */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Title<span className="text-red-500">*</span></label>
          <select
            value={traveler.title}
            onChange={e => onChange({...traveler, title: e.target.value})}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            data-testid={`traveler-title-${roomIndex}-${index}`}
          >
            <option value="">Title</option>
            {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">First Name<span className="text-red-500">*</span></label>
          <input
            type="text"
            value={traveler.firstName}
            onChange={e => onChange({...traveler, firstName: e.target.value})}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="First Name"
            data-testid={`traveler-firstname-${roomIndex}-${index}`}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Last Name<span className="text-red-500">*</span></label>
          <input
            type="text"
            value={traveler.lastName}
            onChange={e => onChange({...traveler, lastName: e.target.value})}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Last Name"
            data-testid={`traveler-lastname-${roomIndex}-${index}`}
          />
        </div>
      </div>

      {/* Row 2: Date of Birth + Bed Preference (only for first traveler in room) */}
      <div className={`grid ${isFirstInRoom && !isChild ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-4`}>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date of Birth<span className="text-red-500">*</span></label>
          <div className="flex gap-2 mt-1">
            <select value={traveler.dobDay} onChange={e => onChange({...traveler, dobDay: e.target.value})} className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm" data-testid={`traveler-dob-day-${roomIndex}-${index}`}>
              <option value="">Day</option>
              {DAYS.map(d => <option key={d} value={String(d)}>{d}</option>)}
            </select>
            <select value={traveler.dobMonth} onChange={e => { console.log('Month changed to:', e.target.value); onChange({...traveler, dobMonth: e.target.value}); }} className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm" data-testid={`traveler-dob-month-${roomIndex}-${index}`}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
            <select value={traveler.dobYear} onChange={e => onChange({...traveler, dobYear: e.target.value})} className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm" data-testid={`traveler-dob-year-${roomIndex}-${index}`}>
              <option value="">Year</option>
              {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        </div>
        {isFirstInRoom && !isChild && (
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              Bed Preference
              <span className="relative group">
                <Info size={12} className="text-gray-400 cursor-help" />
                <span className="hidden group-hover:block absolute -top-8 left-0 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  Bed type assigned by hotel availability
                </span>
              </span>
            </label>
            <select
              value={traveler.bedPreference}
              onChange={e => onChange({...traveler, bedPreference: e.target.value})}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              data-testid={`traveler-bed-${roomIndex}-${index}`}
            >
              <option value="">-- Choose Bed Preference --</option>
              <option value="single">Single Bed</option>
              <option value="double">Double Bed</option>
              <option value="twin">Twin Bed</option>
              <option value="king">King Bed</option>
              <option value="queen">Queen Bed</option>
            </select>
          </div>
        )}
      </div>

      {/* Row 3: Passport Number, Issue Date, Expiry Date */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Passport Number</label>
          <input
            type="text"
            value={traveler.passportNumber || ''}
            onChange={e => onChange({...traveler, passportNumber: e.target.value})}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Passport Number"
            data-testid={`traveler-passport-${roomIndex}-${index}`}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Issue Date</label>
          <div className="flex gap-2 mt-1">
            <select value={traveler.issueDay || ''} onChange={e => onChange({...traveler, issueDay: e.target.value})} className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm" data-testid={`traveler-issue-day-${roomIndex}-${index}`}>
              <option value="">Day</option>
              {DAYS.map(d => <option key={d} value={String(d)}>{d}</option>)}
            </select>
            <select value={traveler.issueMonth || ''} onChange={e => onChange({...traveler, issueMonth: e.target.value})} className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm" data-testid={`traveler-issue-month-${roomIndex}-${index}`}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
            <select value={traveler.issueYear || ''} onChange={e => onChange({...traveler, issueYear: e.target.value})} className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm" data-testid={`traveler-issue-year-${roomIndex}-${index}`}>
              <option value="">Year</option>
              {ISSUE_EXPIRY_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Expiry Date</label>
          <div className="flex gap-2 mt-1">
            <select value={traveler.expiryDay || ''} onChange={e => onChange({...traveler, expiryDay: e.target.value})} className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm" data-testid={`traveler-expiry-day-${roomIndex}-${index}`}>
              <option value="">Day</option>
              {DAYS.map(d => <option key={d} value={String(d)}>{d}</option>)}
            </select>
            <select value={traveler.expiryMonth || ''} onChange={e => onChange({...traveler, expiryMonth: e.target.value})} className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm" data-testid={`traveler-expiry-month-${roomIndex}-${index}`}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
            <select value={traveler.expiryYear || ''} onChange={e => onChange({...traveler, expiryYear: e.target.value})} className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm" data-testid={`traveler-expiry-year-${roomIndex}-${index}`}>
              <option value="">Year</option>
              {ISSUE_EXPIRY_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Row 4: Nationality */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nationality</label>
          <select
            value={traveler.nationality || ''}
            onChange={e => onChange({...traveler, nationality: e.target.value})}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            data-testid={`traveler-nationality-${roomIndex}-${index}`}
          >
            <option value="">Select Nationality</option>
            {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Row 5: Requirement */}
      <div className="mb-4">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Requirement</label>
        <input
          type="text"
          value={traveler.requirement || ''}
          onChange={e => onChange({...traveler, requirement: e.target.value})}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          placeholder="Any special requirements for this traveler (e.g. wheelchair access, dietary needs)"
          data-testid={`traveler-requirement-${roomIndex}-${index}`}
        />
      </div>

      {/* Upload Passenger Document */}
      <div>
        {(traveler.documents || []).length > 0 && (
          <div className="mb-2 space-y-1">
            {(traveler.documents || []).map((doc, dIdx) => (
              <div key={dIdx} className="flex items-center gap-2 text-sm text-gray-600">
                <FileText size={14} className="text-gray-400" />
                <span>{doc.name}</span>
                <span className="text-xs text-gray-400">({(doc.size / 1024).toFixed(1)} KB)</span>
                <button onClick={() => removeDoc(dIdx)} className="text-gray-400 hover:text-red-500 ml-1">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {scanning && (
          <div className="mb-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3" data-testid={`scan-loading-${roomIndex}-${index}`}>
            <Loader2 size={16} className="text-blue-600 animate-spin" />
            <span className="text-sm text-blue-700 font-medium">Scanning passport and extracting details...</span>
          </div>
        )}
        {scanStatus === 'success' && (
          <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3" data-testid={`scan-success-${roomIndex}-${index}`}>
            <Check size={16} className="text-green-600" />
            <span className="text-sm text-green-700 font-medium">Passport scanned successfully! Details auto-filled.</span>
          </div>
        )}
        {scanStatus === 'error' && (
          <div className="mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3" data-testid={`scan-error-${roomIndex}-${index}`}>
            <AlertCircle size={16} className="text-amber-600" />
            <span className="text-sm text-amber-700">Could not extract all details. Please verify and fill manually.</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleDocUpload}
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }}
          disabled={scanning}
          data-testid={`file-input-${roomIndex}-${index}`}
        />
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!scanning && fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${scanning ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 cursor-pointer'}`}
          disabled={scanning}
          data-testid={`upload-doc-${roomIndex}-${index}`}
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
          <span>{scanning ? 'Scanning passport...' : 'Upload Passport & Auto-Fill'}</span>
        </button>
        <p className="text-[11px] text-gray-400 mt-1 ml-5">Upload passport photo to auto-fill traveler details</p>
      </div>
    </div>
  );
}

export default function BookingConfirmation({ proposal, onBack, onConfirmBooking }) {
  // Build traveler list from room_data
  const roomData = proposal.room_data || [{ adults: proposal.total_pax || 2, children: [] }];
  
  const [travelers, setTravelers] = useState(() => {
    const initial = [];
    roomData.forEach((room, rIdx) => {
      const adults = room.adults || 2;
      for (let i = 0; i < adults; i++) {
        initial.push({
          roomIndex: rIdx,
          type: 'adult',
          title: '', firstName: '', lastName: '',
          dobDay: '', dobMonth: '', dobYear: '',
          bedPreference: '',
          passportNumber: '', issueDay: '', issueMonth: '', issueYear: '',
          expiryDay: '', expiryMonth: '', expiryYear: '',
          nationality: '',
          requirement: '',
          documents: [],
          _indexInRoom: i
        });
      }
      (room.children || []).forEach((child, cIdx) => {
        initial.push({
          roomIndex: rIdx,
          type: 'child',
          title: '', firstName: '', lastName: '',
          dobDay: '', dobMonth: '', dobYear: '',
          bedPreference: '',
          passportNumber: '', issueDay: '', issueMonth: '', issueYear: '',
          expiryDay: '', expiryMonth: '', expiryYear: '',
          nationality: '',
          requirement: '',
          documents: [],
          _indexInRoom: room.adults + cIdx
        });
      });
    });
    return initial;
  });

  const [consentChecked, setConsentChecked] = useState(false);
  const [specialOccasion, setSpecialOccasion] = useState('none');
  const [contactInfo, setContactInfo] = useState({
    clientProfile: '',
    email: proposal.customer_email || 'ticketing@travotours.ae',
    phone: proposal.customer_phone || '',
    city: 'Dubai',
    agentReference: ''
  });
  const [paymentOption, setPaymentOption] = useState('full');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [showImportantInfo, setShowImportantInfo] = useState(true);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmationTime, setConfirmationTime] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [attachments, setAttachments] = useState([]);

  // Pricing
  const totalPrice = proposal.pricing_breakdown?.total || proposal.total_price || 0;
  const totalDiscount = (proposal.discount_amount || 0) + couponDiscount;
  const pricePerAdult = proposal.pricing_breakdown?.total 
    ? Math.round(proposal.pricing_breakdown.total / Math.max(proposal.total_pax || 2, 1))
    : Math.round(totalPrice / Math.max(proposal.total_pax || 2, 1));
  const finalPrice = totalPrice;
  const partialPayment = Math.round(finalPrice * 0.25);
  const balanceAmount = finalPrice - partialPayment;
  const nightsCount = proposal.cities?.reduce((acc, c) => acc + (c.nights || 0), 0) || 1;

  // Hold booking date
  const holdDate = addDays(new Date().toISOString().split('T')[0], 7);

  // Get first hotel for important info
  const firstHotel = useMemo(() => {
    if (!proposal.selected_hotels) return null;
    const keys = Object.keys(proposal.selected_hotels);
    return keys.length > 0 ? proposal.selected_hotels[keys[0]] : null;
  }, [proposal.selected_hotels]);

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      setCouponApplied(true);
      setCouponDiscount(16);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size, file: f }))]);
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateTraveler = (index, updated) => {
    setTravelers(prev => prev.map((t, i) => i === index ? updated : t));
  };

  const validateForm = () => {
    for (let i = 0; i < travelers.length; i++) {
      const t = travelers[i];
      if (!t.title || !t.firstName.trim() || !t.lastName.trim() || !t.dobDay || !t.dobMonth || !t.dobYear) {
        return `Please complete all required fields for Traveler ${i + 1}.`;
      }
    }
    if (!contactInfo.email.trim() || !contactInfo.phone.trim() || !contactInfo.city.trim()) {
      return 'Please complete all required contact information fields.';
    }
    if (!consentChecked) {
      return 'You must check the consent box and provide required attachments before you can continue.';
    }
    return null;
  };

  const handleConfirmBooking = () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');
    const timestamp = new Date().toISOString();
    setConfirmationTime(timestamp);
    setBookingConfirmed(true);
  };

  // Collect all activities and transfers for sidebar
  const sidebarItems = useMemo(() => {
    const items = [];
    let cumulativeNights = 0;
    proposal.cities?.forEach((city, idx) => {
      if (idx === 0 && proposal.arrival_transfer) {
        items.push({
          type: 'transfer',
          name: proposal.arrival_transfer.title || 'Airport Transfer',
          date: addDays(proposal.leaving_on, 0),
          icon: 'car'
        });
      }
      if (idx > 0 && proposal.inter_city_transfers) {
        const ict = proposal.inter_city_transfers[`${idx-1}_${idx}`];
        if (ict) {
          items.push({
            type: 'transfer',
            name: ict.title || 'Inter-city Transfer',
            date: addDays(proposal.leaving_on, cumulativeNights),
            icon: 'car'
          });
        }
      }
      // Activities
      const selectedActs = proposal.selected_activities || {};
      Object.keys(selectedActs).forEach(key => {
        if (key.startsWith(city.name + '_')) {
          const acts = selectedActs[key];
          if (Array.isArray(acts)) {
            acts.forEach((a, aIdx) => {
              const dayOffset = cumulativeNights + Math.min(aIdx, city.nights - 1);
              if (!items.some(existing => existing.name === a.name)) {
                items.push({
                  type: 'activity',
                  name: a.name,
                  date: addDays(proposal.leaving_on, dayOffset),
                  icon: 'camera'
                });
              }
            });
          }
        }
      });
      cumulativeNights += city.nights || 0;
    });
    // Departure transfer
    if (proposal.departure_transfer) {
      items.push({
        type: 'transfer',
        name: proposal.departure_transfer.title || 'Airport Transfer',
        date: addDays(proposal.leaving_on, cumulativeNights),
        icon: 'car'
      });
    }
    return items;
  }, [proposal]);

  const mainCity = proposal.cities?.[0]?.name || 'Trip';

  return (
    <div className="min-h-screen bg-gray-50" data-testid="booking-confirmation-page">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors" data-testid="booking-back-btn">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Proposal</span>
          </button>
          <div className="flex-1" />
          <h1 className="text-lg font-bold text-[#002B5B]">Booking Confirmation</h1>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Intro */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
            Please complete the traveler details and contact information below. Review all information carefully — names must match travel ID and passports must be valid for at least 6 months from the travel date.
          </p>
        </div>

        <div className="flex gap-6">
          {/* Left Column - Main Form */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Traveler Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="traveler-details-section">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Traveler Details</h2>
                <p className="text-sm text-gray-500 mt-1">Please enter names as per valid id proof and contact information for guests traveling on this trip:</p>
              </div>
              <div className="px-6 py-5">
                {travelers.map((traveler, idx) => (
                  <TravelerForm
                    key={idx}
                    index={idx}
                    roomIndex={traveler.roomIndex}
                    traveler={traveler}
                    onChange={(updated) => handleUpdateTraveler(idx, updated)}
                    isChild={traveler.type === 'child'}
                    isFirstInRoom={traveler._indexInRoom === 0}
                  />
                ))}

                {/* Consent Checkbox */}
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <label className="flex items-start gap-3 cursor-pointer" data-testid="consent-checkbox-label">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => { setConsentChecked(e.target.checked); setValidationError(''); }}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      data-testid="consent-checkbox"
                    />
                    <span className="text-sm text-gray-700 leading-relaxed">
                      I have reviewed the information above, confirm that all traveler details and attachments are correct, and understand that any additional costs arising from discrepancies are my responsibility.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Attachment Upload */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="attachments-section">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Attachment Requirements</h2>
                <p className="text-sm text-gray-500 mt-1">Upload copies of passports, visas, or any supporting documents. Acceptable formats: PDF, JPG, PNG (max 10MB each).</p>
              </div>
              <div className="px-6 py-5">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Drag files here or click to upload</p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    data-testid="file-upload-input"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer inline-block px-4 py-2 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors">
                    Browse Files
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button onClick={() => removeAttachment(idx)} className="text-gray-400 hover:text-red-500" data-testid={`remove-attachment-${idx}`}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Special Occasion */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="special-occasion-section">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Are any of the travelers celebrating any special occasion?</h2>
                <p className="text-sm text-gray-500 mt-1">We will try to make sure we can organize something memorable for their special occasion while they are on their trip.</p>
              </div>
              <div className="px-6 py-5 flex flex-wrap gap-6">
                {['none', 'birthday', 'honeymoon', 'anniversary'].map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer" data-testid={`occasion-${option}`}>
                    <input
                      type="radio"
                      name="occasion"
                      checked={specialOccasion === option}
                      onChange={() => setSpecialOccasion(option)}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="contact-info-section">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Contact Information</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-gray-700">Client Profile</label>
                  <div>
                    <input
                      type="text"
                      value={contactInfo.clientProfile}
                      onChange={e => setContactInfo({...contactInfo, clientProfile: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Optional. Example: Celebrity, MP, CEO, VP, etc"
                      data-testid="contact-client-profile"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-gray-700">Email Address<span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={e => setContactInfo({...contactInfo, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    data-testid="contact-email"
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-gray-700">Contact Phone<span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={contactInfo.phone}
                    onChange={e => setContactInfo({...contactInfo, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    data-testid="contact-phone"
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-gray-700">City of Residence<span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={contactInfo.city}
                    onChange={e => setContactInfo({...contactInfo, city: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    data-testid="contact-city"
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm text-gray-700">Agent Reference</label>
                  <input
                    type="text"
                    value={contactInfo.agentReference}
                    onChange={e => setContactInfo({...contactInfo, agentReference: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Any internal reference you want to give to this booking (optional)"
                    data-testid="contact-agent-ref"
                  />
                </div>
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="important-info-section">
              <button
                onClick={() => setShowImportantInfo(!showImportantInfo)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
              >
                <h2 className="text-lg font-bold text-gray-900">Important information about your booking</h2>
                {showImportantInfo ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </button>
              <AnimatePresence>
                {showImportantInfo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      {firstHotel && (
                        <p className="font-semibold text-gray-800 mb-3">{firstHotel.name}</p>
                      )}
                      <ul className="space-y-3 text-sm text-gray-600 list-disc list-outside ml-5">
                        <li>Extra-person charges may apply and vary depending on property policy. Government-issued photo identification and a credit card, debit card, or cash deposit may be required at check-in for incidental charges. Special requests are subject to availability upon check-in and may incur additional charges; special requests cannot be guaranteed. This property accepts credit cards and cash.</li>
                        <li>This property offers transfers from the airport (surcharges may apply). Guests must contact the property with arrival details before travel, using the contact information on the booking confirmation. Front desk staff will greet guests on arrival at the property.</li>
                        <li><strong>Policies:</strong> If you require a visa to enter the country, your property may be able to help with the supporting documents needed to obtain one. To learn more, you can reach out to the property via the contact details included on your booking confirmation.</li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Payment Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="payment-section">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">How much do you want to pay now?</h2>
              </div>
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <label
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${paymentOption === 'partial' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                    data-testid="payment-partial"
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentOption === 'partial'}
                      onChange={() => setPaymentOption('partial')}
                      className="w-4 h-4 text-teal-600 mr-2"
                    />
                    <span className="text-sm font-medium text-gray-800">Pay AED {partialPayment.toLocaleString()} now and confirm</span>
                    {paymentOption === 'partial' && (
                      <div className="mt-2 ml-6">
                        <p className="text-xs text-red-600">Balance amount of AED {balanceAmount.toLocaleString()} due on {formatDate(addDays(new Date().toISOString().split('T')[0], 15), 'short')}</p>
                        <p className="text-xs text-gray-500 mt-1">Remaining amount needs to be paid as per our <span className="text-teal-600 underline">payment policy</span></p>
                      </div>
                    )}
                  </label>
                  <label
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${paymentOption === 'full' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                    data-testid="payment-full"
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentOption === 'full'}
                      onChange={() => setPaymentOption('full')}
                      className="w-4 h-4 text-teal-600 mr-2"
                    />
                    <span className="text-sm font-medium text-gray-800">Pay full amount and confirm</span>
                  </label>
                </div>

                {/* Price summary */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-gray-700">TOTAL DISCOUNT</span>
                      <span className="text-gray-700">AED -{totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-700">TOTAL PRICE</span>
                    <span className="font-bold text-gray-900">AED {finalPrice.toLocaleString()}.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-700">AMOUNT TO PAY NOW</span>
                    <span className="font-bold text-gray-900">AED {(paymentOption === 'full' ? finalPrice : partialPayment).toLocaleString()}.00</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">By proceeding to make payment, you agree to the <span className="text-teal-600 underline cursor-pointer">terms and conditions</span></p>

                {/* Timestamp microcopy */}
                <div className="mt-2 flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                  <Clock size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-500">
                    Clicking "I Understand — Continue to Book" records the date and time of your confirmation and moves you to payment. This timestamp will be used for booking deadlines and any hold periods.
                  </p>
                </div>

                {/* Validation error */}
                {validationError && (
                  <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3" data-testid="validation-error">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{validationError}</p>
                  </div>
                )}

                {/* Post-click confirmation */}
                <AnimatePresence>
                  {bookingConfirmed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4"
                      data-testid="booking-confirmed-message"
                    >
                      <div className="flex items-start gap-3">
                        <Check size={20} className="text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-green-800">Thank you — your booking has been confirmed and the confirmation time has been recorded.</p>
                          <p className="text-sm text-green-700 mt-1">Proceed to payment or review your booking summary. If any attachments are missing, you will be prompted to upload them before payment.</p>
                          {confirmationTime && (
                            <p className="text-xs text-green-600 mt-2 font-mono">Confirmed at: {new Date(confirmationTime).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6">
                  <button
                    className="flex-1 py-3 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg transition-colors text-sm"
                    data-testid="hold-booking-btn"
                  >
                    Hold Booking Until {formatDate(holdDate, 'short')}
                  </button>
                  {!bookingConfirmed ? (
                    <button
                      onClick={handleConfirmBooking}
                      className="flex-1 py-3 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold rounded-lg transition-colors text-sm"
                      data-testid="confirm-booking-btn"
                    >
                      I Understand — Continue to Book
                    </button>
                  ) : (
                    <button
                      onClick={() => onConfirmBooking?.({ travelers, contactInfo, specialOccasion, paymentOption, confirmationTime, attachments })}
                      className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors text-sm"
                      data-testid="proceed-payment-btn"
                    >
                      Proceed to Payment
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Guaranteed Security */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6" data-testid="security-section">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Guaranteed security and worry-free travel</h3>
              <p className="text-sm text-gray-600 mb-4">Your transaction is backed by major commercial banks and your personal information is protected and kept private. We guarantee conformity to international credit card payment standards and use the latest methods to protect your information.</p>
              <div className="flex items-center gap-6">
                <span className="text-2xl font-bold text-[#003087] italic">PayPal</span>
                <span className="text-2xl font-bold text-[#1A1F71] tracking-wider">VISA</span>
                <span className="text-xl font-bold text-[#EB001B]">Master<span className="text-[#F79E1B]">Card</span></span>
                <span className="text-lg font-bold text-[#006FCF]">AMEX</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-[300px] flex-shrink-0 space-y-6">
            {/* Price Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-20" data-testid="price-summary-sidebar">
              <div className="px-5 py-4">
                <h3 className="text-base font-bold text-gray-900 mb-4">Your Price Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price per adult</span>
                    <span className="text-gray-900">AED {pricePerAdult.toLocaleString()}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total discount</span>
                        <span className="text-gray-900">AED -{totalDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check size={14} className="text-green-500" />
                        <span className="text-xs text-green-600 font-medium">Coupon Applied</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-4 bg-pink-50 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="text-base font-bold text-gray-900">Total Price</p>
                    <p className="text-xs text-gray-500">(Incl all taxes)</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">AED {finalPrice.toLocaleString()}.00</p>
                </div>
              </div>

              {/* Coupon */}
              <div className="px-5 py-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 mb-2">Coupon</h4>
                <p className="text-xs text-gray-500 mb-2">Have a coupon? Redeem here</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    data-testid="coupon-input"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 transition-colors"
                    data-testid="apply-coupon-btn"
                  >
                    Apply Discount
                  </button>
                </div>
                {couponApplied && (
                  <p className="text-xs text-green-600 mt-2 font-medium">Awesome! You will get Discount: AED {couponDiscount}</p>
                )}
              </div>

              {/* Trip Details */}
              <div className="px-5 py-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Trip to {mainCity}</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-teal-500" />
                    <span>{mainCity} {nightsCount} nights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span>{formatDate(proposal.leaving_on, 'short')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <span>{roomData.length} room, {proposal.total_pax || 2} adults</span>
                  </div>
                </div>

                {/* Hotels */}
                {proposal.cities?.map((city, idx) => {
                  const hotel = proposal.selected_hotels?.[`${city.name}_${idx}`];
                  if (!hotel) return null;
                  let cumNights = 0;
                  for (let i = 0; i < idx; i++) cumNights += proposal.cities[i]?.nights || 0;
                  const checkIn = addDays(proposal.leaving_on, cumNights);
                  const checkOut = addDays(proposal.leaving_on, cumNights + city.nights);
                  return (
                    <div key={idx} className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Stay in {city.name}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{hotel.name}</p>
                      {hotel.star_rating && (
                        <span className="text-yellow-500 text-xs">{'*'.repeat(hotel.star_rating)}</span>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div>
                          <p className="font-bold uppercase">Check-in</p>
                          <p>{formatDate(checkIn, 'short')}</p>
                        </div>
                        <p className="text-gray-300">|</p>
                        <p className="font-medium">{city.nights} night{city.nights > 1 ? 's' : ''}</p>
                        <p className="text-gray-300">|</p>
                        <div>
                          <p className="font-bold uppercase">Check-out</p>
                          <p>{formatDate(checkOut, 'short')}</p>
                        </div>
                      </div>
                      {hotel.selectedRoom && (
                        <div className="flex items-start gap-2 mt-2">
                          <Bed size={14} className="text-gray-400 mt-0.5" />
                          <span className="text-xs text-gray-600">{hotel.selectedRoom.name}{hotel.selectedRoom.bed_type ? `, ${hotel.selectedRoom.bed_type}` : ''}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Itinerary items */}
                {sidebarItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {sidebarItems.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        {item.icon === 'car' ? (
                          <Car size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Camera size={14} className="text-teal-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-xs text-gray-700 leading-tight">{item.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(item.date, 'short')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

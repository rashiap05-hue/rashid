import React, { useState } from 'react';
import { Phone, Edit2, X, DollarSign, MessageCircle, Check, Loader2 } from 'lucide-react';
import { api } from '@/App';

export default function RequestChangesTab({ proposal, mainCity, refreshProposal }) {
  const [actionSent, setActionSent] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [competitor, setCompetitor] = useState('');
  const [indicativePrice, setIndicativePrice] = useState('');
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  const [priceSubmitted, setPriceSubmitted] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState(
    `Check out this trip proposal: ${proposal.proposal_name || `Trip to ${mainCity}`}`
  );

  const sendAction = async (type, details = '') => {
    setActionLoading(type);
    try {
      await api.post(`/messages/${proposal.id}`, {
        sender: 'customer',
        sender_name: proposal.customer_name || 'Customer',
        text: `[${type}] ${details}`.trim()
      });
      setActionSent(type);
      setTimeout(() => setActionSent(null), 4000);
    } catch (e) {
      console.error('Action error:', e);
    }
    setActionLoading(null);
  };

  const handlePriceSubmit = async () => {
    if (!indicativePrice.trim()) return;
    setPriceSubmitting(true);
    try {
      await api.post(`/messages/${proposal.id}`, {
        sender: 'customer',
        sender_name: proposal.customer_name || 'Customer',
        text: `[Lower Price Request] Competitor: ${competitor || 'N/A'}, Indicative Price: ${indicativePrice}`
      });
      setPriceSubmitted(true);
      setCompetitor('');
      setIndicativePrice('');
      setTimeout(() => setPriceSubmitted(false), 4000);
    } catch (e) {
      console.error('Price submit error:', e);
    }
    setPriceSubmitting(false);
  };

  const handleWhatsApp = () => {
    const cleanPhone = waPhone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(waMessage);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const actions = [
    { type: 'callback', icon: Phone, iconColor: 'text-[#002B5B]', label: 'Request Callback', sub: 'Call me to explain proposal', hoverBorder: 'hover:border-[#002B5B]', hoverBg: 'hover:bg-blue-50' },
    { type: 'changes', icon: Edit2, iconColor: 'text-[#002B5B]', label: 'I want changes in flight / hotel / itinerary', hoverBorder: 'hover:border-[#002B5B]', hoverBg: 'hover:bg-blue-50' },
    { type: 'cancelled', icon: X, iconColor: 'text-red-500', label: 'I have cancelled / postponed my plans', hoverBorder: 'hover:border-red-300', hoverBg: 'hover:bg-red-50' },
    { type: 'lower_price', icon: DollarSign, iconColor: 'text-green-600', label: 'I want lower prices', hoverBorder: 'hover:border-green-300', hoverBg: 'hover:bg-green-50' },
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm" data-testid="changes-content">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Request Changes</h2>
      <div className="space-y-4">
        {/* More Actions */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
          <h3 className="font-medium text-gray-800 mb-4">More Actions</h3>
          <div className="space-y-3">
            {actions.map(({ type, icon: Icon, iconColor, label, sub, hoverBorder, hoverBg }) => (
              <button
                key={type}
                onClick={() => sendAction(type, label)}
                disabled={actionLoading === type}
                className={`w-full flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 ${hoverBorder} ${hoverBg} transition-all text-left disabled:opacity-60`}
                data-testid={`action-${type}`}
              >
                {actionLoading === type ? (
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                ) : actionSent === type ? (
                  <Check size={18} className="text-green-500" />
                ) : (
                  <Icon size={18} className={iconColor} />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${actionSent === type ? 'text-green-600' : 'text-gray-800'}`}>
                    {actionSent === type ? 'Request sent!' : label}
                  </p>
                  {sub && actionSent !== type && <p className="text-sm text-gray-500">{sub}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Lower Price Form */}
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
          <h3 className="font-medium text-amber-800 mb-3">LOWER PRICE ELSEWHERE</h3>
          <p className="text-sm text-amber-700 mb-4">Found a better price? Let us know and we'll try to match it.</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Competitor website/agency name"
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              className="w-full px-4 py-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
              data-testid="competitor-input"
            />
            <input
              type="text"
              placeholder="Indicative Price*"
              value={indicativePrice}
              onChange={(e) => setIndicativePrice(e.target.value)}
              className="w-full px-4 py-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
              data-testid="indicative-price-input"
            />
            <p className="text-xs text-amber-600">*Please make sure indicative price is reasonable to allow us to come back with suitable offers</p>
            <button
              onClick={handlePriceSubmit}
              disabled={priceSubmitting || !indicativePrice.trim()}
              className="w-full py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="price-submit-btn"
            >
              {priceSubmitting ? <Loader2 size={16} className="animate-spin" /> : priceSubmitted ? <Check size={16} /> : null}
              {priceSubmitted ? 'Submitted!' : priceSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Share on WhatsApp */}
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h3 className="font-medium text-green-800 mb-4">Share on WhatsApp</h3>
          <div className="space-y-3">
            <input
              type="tel"
              placeholder="Mobile Number"
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              className="w-full px-4 py-2.5 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              data-testid="wa-phone-input"
            />
            <textarea
              placeholder="Message to Share"
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              className="w-full px-4 py-2.5 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white h-20 resize-none"
              data-testid="wa-message-input"
            />
            <button
              onClick={handleWhatsApp}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
              data-testid="wa-share-btn"
            >
              <MessageCircle size={18} />
              Share on WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

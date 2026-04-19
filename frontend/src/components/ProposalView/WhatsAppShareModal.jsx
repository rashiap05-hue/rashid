import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function WhatsAppShareModal({ proposal, onClose }) {
  const proposalName = proposal.proposal_name || `Trip to ${proposal.cities?.[0]?.name || 'Destination'}`;
  const shortId = (proposal.id || '').replace(/-/g, '').slice(-7).toUpperCase();
  const proposalUrl = `${window.location.origin}/q/${proposal.id}?seen=W`;

  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(
    `Hi! Here's your travel proposal: *${proposalName}* (Ref: #${shortId})\n\n${proposalUrl}`
  );

  const handleShare = () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()} data-testid="whatsapp-share-modal">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Share on WhatsApp</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" data-testid="whatsapp-modal-close"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-gray-800 w-32 flex-shrink-0">Mobile Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 971501234567"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm" data-testid="whatsapp-phone-input" />
          </div>
          <div className="flex items-start gap-4">
            <label className="text-sm font-bold text-gray-800 w-32 flex-shrink-0 pt-2">Message to Share</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-none" data-testid="whatsapp-message-input" />
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-center">
          <button onClick={handleShare}
            className="px-8 py-3 bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold rounded-lg transition-colors text-sm shadow-md"
            data-testid="whatsapp-share-btn">Share on WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

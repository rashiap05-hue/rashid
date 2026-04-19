import React, { useState } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { api } from '@/App';

export default function SendEmailModal({ proposal, onClose }) {
  const proposalName = proposal.proposal_name || `Trip to ${proposal.cities?.[0]?.name || 'Destination'}`;
  const shortId = (proposal.id || '').replace(/-/g, '').slice(-7).toUpperCase();
  
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(`Option 1 - ${proposalName}`);
  const [email, setEmail] = useState(proposal.customer_email || 'ticketing@travotours.ae');
  const [subject, setSubject] = useState(`${`Option 1 - ${proposalName}`} - #${shortId}`);
  const [body, setBody] = useState(
    `Hi Travo Ticketing,\n\nThanks for your travel enquiry and the opportunity to provide you with a proposed itinerary.\n\nPlease let me know if you have any questions or would like further information at this stage.`
  );
  const [noPrice, setNoPrice] = useState(false);
  const [noLink, setNoLink] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const templates = [
    { label: 'Default Greeting', body: `Hi Travo Ticketing,\n\nThanks for your travel enquiry and the opportunity to provide you with a proposed itinerary.\n\nPlease let me know if you have any questions or would like further information at this stage.` },
    { label: 'Follow Up', body: `Hi,\n\nJust following up on the proposal we shared earlier. Please let us know if you'd like to proceed or need any modifications.\n\nLooking forward to hearing from you.` },
    { label: 'Revised Proposal', body: `Hi,\n\nPlease find the revised proposal as per your feedback. We've updated the itinerary and pricing accordingly.\n\nLet us know if this works for you.` },
  ];

  const handleSend = async () => {
    setSending(true);
    try {
      await api.post('/email/send-proposal', {
        recipient_email: email, recipient_name: name, subject, message: body, proposal_id: proposal.id,
      });
      setSent(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Email send error:', err);
      alert(err.response?.data?.detail || 'Failed to send email. Please try again.');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()} data-testid="send-email-modal">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Send Proposal Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" data-testid="email-modal-close"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="text-sm text-gray-500">Proposal Name</label>
            <div className="mt-1 flex items-center gap-3">
              {editingName ? (
                <input type="text" value={name}
                  onChange={e => { setName(e.target.value); setSubject(`${e.target.value} - #${shortId}`); }}
                  onBlur={() => setEditingName(false)} onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                  autoFocus className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold"
                  data-testid="email-proposal-name-input" />
              ) : (
                <>
                  <span className="text-base font-bold text-gray-800">{name}</span>
                  <button onClick={() => setEditingName(true)}
                    className="text-sm text-gray-500 border border-gray-300 rounded-lg px-3 py-1 hover:bg-gray-50 transition-colors"
                    data-testid="change-proposal-name-btn">change proposal name</button>
                </>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" data-testid="email-address-input" />
          </div>
          <div>
            <label className="text-sm text-gray-500">Email Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" data-testid="email-subject-input" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-500">Email Body</label>
              <div className="relative group">
                <button className="text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1 hover:bg-gray-50 flex items-center gap-1" data-testid="email-template-select">
                  Select <ChevronDown size={14} />
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-48 py-1 hidden group-focus-within:block hover:block z-10">
                  {templates.map((t, i) => (
                    <button key={i} onClick={() => setBody(t.body)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" data-testid={`email-template-${i}`}>{t.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
              className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-none" data-testid="email-body-input" />
          </div>
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer" data-testid="no-price-checkbox-label">
              <input type="checkbox" checked={noPrice} onChange={e => setNoPrice(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#002B5B] focus:ring-[#002B5B]" data-testid="no-price-checkbox" />
              <span className="text-sm text-gray-700">Do NOT add price in the proposal email and attached PDF</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer" data-testid="no-link-checkbox-label">
              <input type="checkbox" checked={noLink} onChange={e => setNoLink(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#002B5B] focus:ring-[#002B5B]" data-testid="no-link-checkbox" />
              <span className="text-sm text-gray-700">Do NOT add proposal link/button in the proposal email and attached PDF</span>
            </label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          {sent ? (
            <div className="flex items-center gap-2 text-green-700 font-medium text-sm" data-testid="email-sent-success">
              <Check size={18} />Email sent successfully!
            </div>
          ) : (
            <button onClick={handleSend} disabled={sending || !email.trim()}
              className="px-6 py-2.5 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold rounded-lg transition-colors text-sm disabled:opacity-50"
              data-testid="send-email-btn">{sending ? 'SENDING...' : 'SEND EMAIL'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

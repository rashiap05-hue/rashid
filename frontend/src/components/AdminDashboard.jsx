import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Users, FileText, Settings, Search, RefreshCw,
  Edit2, Trash2, CheckCircle, XCircle, MapPin, Plane, Building2, X,
  ChevronLeft, ChevronRight, Plus, Save, Car, Clock, DollarSign, Briefcase, Star, Bed,
  Compass, Camera, Utensils, Mountain, Globe, Shield, User, Phone, Mail, Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';
import HotelEditForm from './HotelEditForm';
import ActivityEditForm from './ActivityEditForm';
import TransferEditForm from './TransferEditForm';
import TermsPoliciesManager from './TermsPoliciesManager';
import { BookingStatusTrackerMini } from './BookingStatusTracker';
import { useCurrency } from '@/CurrencyContext';

const ALL_COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Samoa","San Marino","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];

const BOOKING_STAGES = ['held', 'payment_pending', 'payment_received', 'confirmed', 'ticketed'];
const STAGE_LABELS = { held: 'Hold', payment_pending: 'Payment Pending', payment_received: 'Payment Received', confirmed: 'Confirmed', ticketed: 'Ticketed' };

function AdminBookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(null);
  const [noteModal, setNoteModal] = useState({ open: false, bookingId: null, currentStatus: '' });
  const [note, setNote] = useState('');
  const { format: formatPrice } = useCurrency();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/admin/all');
      setBookings(res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const advanceStatus = async (bookingId) => {
    setAdvancing(bookingId);
    try {
      await api.put(`/bookings/${bookingId}/status/advance`, { note });
      setNoteModal({ open: false, bookingId: null, currentStatus: '' });
      setNote('');
      fetchBookings();
    } catch (e) { console.error(e); alert(e.response?.data?.detail || 'Error advancing status'); }
    setAdvancing(null);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' });
  };

  const getNextStage = (status) => {
    const idx = BOOKING_STAGES.indexOf(status);
    if (idx < 0 || idx >= BOOKING_STAGES.length - 1) return null;
    return BOOKING_STAGES[idx + 1];
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-[#002B5B] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div data-testid="admin-bookings-tab">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">All Bookings ({bookings.length})</h3>
        <button onClick={fetchBookings} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-600" data-testid="refresh-bookings">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="admin-bookings-table">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs">#</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs">Reference</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs">Customer</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs">Destinations</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs">Travel Date</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs">Amount</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs">Status</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs">Progress</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700 text-xs">Action</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No bookings</td></tr>
            ) : (
              bookings.map((b, idx) => {
                const nextStage = getNextStage(b.status);
                return (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50" data-testid={`admin-booking-row-${b.id}`}>
                    <td className="px-4 py-4 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-4 font-medium text-[#0066CC]">{'ORN' + (b.id || '').replace(/-/g, '').slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-4">
                      <div className="text-gray-800 text-sm">{b.customer_name || '—'}</div>
                      <div className="text-xs text-gray-400">{b.customer_email || ''}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">{(b.cities || []).map(c => c.name || c).join(', ') || '—'}</td>
                    <td className="px-4 py-4 text-gray-600 text-xs">{formatDate(b.leaving_on)}</td>
                    <td className="px-4 py-4 font-medium">{formatPrice(b.total_price || 0)}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${
                        b.status === 'ticketed' ? 'bg-green-100 text-green-800' :
                        b.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'payment_received' ? 'bg-teal-100 text-teal-800' :
                        b.status === 'payment_pending' ? 'bg-orange-100 text-orange-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>{STAGE_LABELS[b.status] || b.status}</span>
                    </td>
                    <td className="px-4 py-4"><BookingStatusTrackerMini status={b.status} /></td>
                    <td className="px-4 py-4">
                      {nextStage ? (
                        <button
                          onClick={() => { setNoteModal({ open: true, bookingId: b.id, currentStatus: b.status }); setNote(''); }}
                          disabled={advancing === b.id}
                          className="px-3 py-1.5 bg-[#002B5B] hover:bg-[#003d82] text-white rounded-lg text-xs font-bold disabled:opacity-50 whitespace-nowrap"
                          data-testid={`advance-status-${b.id}`}
                        >
                          {advancing === b.id ? '...' : `Advance to ${STAGE_LABELS[nextStage]}`}
                        </button>
                      ) : (
                        <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle size={14} /> Complete</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {noteModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center" onClick={() => setNoteModal({ open: false, bookingId: null, currentStatus: '' })}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()} data-testid="advance-status-modal">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Advance Booking Status</h3>
              <p className="text-sm text-gray-500 mb-4">
                Moving from <span className="font-bold">{STAGE_LABELS[noteModal.currentStatus]}</span> to{' '}
                <span className="font-bold text-[#002B5B]">{STAGE_LABELS[getNextStage(noteModal.currentStatus)]}</span>
              </p>
              <label className="text-xs font-bold text-gray-500 uppercase">Note (optional)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none"
                placeholder="e.g., Payment confirmed via bank transfer"
                data-testid="advance-note-input"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setNoteModal({ open: false, bookingId: null, currentStatus: '' })} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={() => advanceStatus(noteModal.bookingId)}
                  disabled={advancing}
                  className="flex-1 px-4 py-2.5 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold rounded-lg text-sm disabled:opacity-50"
                  data-testid="confirm-advance-btn"
                >
                  {advancing ? 'Advancing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminWalletTab() {
  const [wallets, setWallets] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topupModal, setTopupModal] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([api.get('/wallets/all'), api.get('/wallets/payment-proofs/all')]);
      setWallets(wRes.data);
      setProofs(pRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTopup = async (userId, amount, note) => {
    try {
      await api.post('/wallets/topup', { user_id: userId, amount: parseFloat(amount), note });
      setTopupModal(null);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleReview = async (proofId, action) => {
    try {
      await api.post(`/wallets/payment-proofs/${proofId}/review`, { action });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' }) : '—';
  const pendingProofs = proofs.filter(p => p.status === 'pending');
  const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

  if (loading) return <p className="text-center py-8 text-gray-500">Loading...</p>;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#002B5B] rounded-xl p-5 text-white">
          <p className="text-xs opacity-70">Total Balance</p>
          <p className="text-xl font-bold mt-1">AED {totalBalance.toLocaleString()}</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-gray-500">Active Wallets</p>
          <p className="text-xl font-bold mt-1">{wallets.length}</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-xs text-gray-500">Pending Approvals</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{pendingProofs.length}</p>
        </div>
      </div>

      {/* Wallets Table */}
      <h4 className="font-bold text-gray-800 mb-3">Agent Wallets</h4>
      <div className="bg-white border rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Agent</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Balance (AED)</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map(w => (
              <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{w.user?.name || w.user?.company_name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{w.user?.email || '—'}</td>
                <td className="px-4 py-3 text-right font-bold">AED {Number(w.balance || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setTopupModal(w)} className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Top Up</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Payment Proofs */}
      {pendingProofs.length > 0 && (
        <>
          <h4 className="font-bold text-gray-800 mb-3">Pending Payment Proofs</h4>
          <div className="space-y-2">
            {pendingProofs.map(proof => (
              <div key={proof.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{proof.user_name} — AED {Number(proof.amount).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{proof.reference || proof.note} | {formatDate(proof.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReview(proof.id, 'approve')} className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                  <button onClick={() => handleReview(proof.id, 'reject')} className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Topup Modal */}
      <AnimatePresence>
        {topupModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setTopupModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <AdminTopupForm wallet={topupModal} onClose={() => setTopupModal(null)} onTopup={handleTopup} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminTopupForm({ wallet, onClose, onTopup }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  return (
    <>
      <div className="px-5 py-4 border-b"><h3 className="font-bold">Top Up: {wallet?.user?.name || 'Agent'}</h3><p className="text-xs text-gray-500">Current: AED {Number(wallet?.balance || 0).toLocaleString()}</p></div>
      <div className="px-5 py-4 space-y-3">
        <div><label className="text-xs font-bold text-gray-600">Amount (AED)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="text-xs font-bold text-gray-600">Note</label><input type="text" value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      <div className="px-5 py-4 border-t flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
        <button onClick={() => onTopup(wallet.user_id, amount, note)} disabled={!amount} className="px-5 py-2 text-sm bg-green-600 text-white rounded-lg disabled:opacity-50">Credit Wallet</button>
      </div>
    </>
  );
}

function StaffExpertsTab({ searchTerm }) {
  const [experts, setExperts] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpert, setEditingExpert] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', location: '', photo: null });
  const [saving, setSaving] = useState(false);
  const [assignModal, setAssignModal] = useState({ open: false, proposal: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, propRes] = await Promise.all([api.get('/experts'), api.get('/proposals')]);
      setExperts(expRes.data);
      setProposals(propRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = experts.filter(e =>
    !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('location', form.location);
      if (form.photo) fd.append('photo', form.photo);
      if (editingExpert) {
        await api.put(`/experts/${editingExpert.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/experts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setShowForm(false);
      setEditingExpert(null);
      setForm({ name: '', email: '', phone: '', location: '', photo: null });
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expert?')) return;
    await api.delete(`/experts/${id}`);
    fetchData();
  };

  const handleAssign = async (proposalId, expertId) => {
    try {
      await api.post(`/experts/assign/${proposalId}`, { expert_id: expertId });
      setAssignModal({ open: false, proposal: null });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const resolvePhoto = (photo) => {
    if (!photo) return null;
    const base = api.defaults.baseURL.replace('/api', '');
    return `${base}${photo}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800">Destination Experts / Staff</h3>
        <button
          onClick={() => { setShowForm(true); setEditingExpert(null); setForm({ name: '', email: '', phone: '', location: '', photo: null }); }}
          className="px-4 py-2 bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d] flex items-center gap-2 text-sm font-medium"
          data-testid="add-expert-btn"
        >
          <Plus size={16} /> Add Expert
        </button>
      </div>

      {/* Expert List */}
      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(expert => (
            <div key={expert.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow" data-testid={`expert-card-${expert.id}`}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {expert.photo ? (
                    <img src={resolvePhoto(expert.photo)} alt={expert.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-gray-900 truncate">{expert.name}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin size={12} /> {expert.location || '—'}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <Mail size={12} /> {expert.email}
                  </div>
                  {expert.phone && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Phone size={12} /> {expert.phone}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => { setEditingExpert(expert); setForm({ name: expert.name, email: expert.email, phone: expert.phone || '', location: expert.location || '', photo: null }); setShowForm(true); }}
                  className="flex-1 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
                  data-testid={`edit-expert-${expert.id}`}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(expert.id)}
                  className="flex-1 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-1"
                  data-testid={`delete-expert-${expert.id}`}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proposal Assignment Section */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Assign Expert to Proposal</h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Proposal</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Assigned Expert</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map(p => {
                const assignedExpert = experts.find(e => e.id === p.assigned_expert_id);
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.proposal_name || 'Untitled'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.customer_name || '—'}</td>
                    <td className="px-4 py-3">
                      {assignedExpert ? (
                        <span className="text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-semibold">{assignedExpert.name}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setAssignModal({ open: true, proposal: p })}
                        className="px-3 py-1 text-xs font-medium bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d]"
                        data-testid={`assign-btn-${p.id}`}
                      >
                        {assignedExpert ? 'Change' : 'Assign'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Expert Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()} data-testid="expert-form-modal">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="font-bold text-gray-800">{editingExpert ? 'Edit Expert' : 'Add New Expert'}</h3>
                <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" data-testid="expert-name-input" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Email *</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" data-testid="expert-email-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Phone</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" data-testid="expert-phone-input" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Location</label>
                    <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" data-testid="expert-location-input" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Profile Photo</label>
                  <label className="mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
                    <Upload size={16} />
                    {form.photo ? form.photo.name : 'Upload photo...'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => setForm({ ...form, photo: e.target.files[0] })} data-testid="expert-photo-input" />
                  </label>
                </div>
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-3">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim() || !form.email.trim()}
                  className="px-4 py-2 text-sm bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d] disabled:opacity-50 flex items-center gap-2"
                  data-testid="save-expert-btn"
                >
                  <Save size={14} /> {saving ? 'Saving...' : editingExpert ? 'Update' : 'Add Expert'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Expert Modal */}
      <AnimatePresence>
        {assignModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setAssignModal({ open: false, proposal: null })}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()} data-testid="assign-expert-modal">
              <div className="px-5 py-4 border-b">
                <h3 className="font-bold text-gray-800">Assign Expert</h3>
                <p className="text-xs text-gray-500 mt-1">Select a destination expert for: <strong>{assignModal.proposal?.proposal_name || 'Proposal'}</strong></p>
              </div>
              <div className="px-5 py-3 max-h-60 overflow-y-auto space-y-2">
                {experts.map(expert => (
                  <button
                    key={expert.id}
                    onClick={() => handleAssign(assignModal.proposal.id, expert.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      assignModal.proposal?.assigned_expert_id === expert.id ? "bg-green-50 border border-green-200" : "hover:bg-gray-50 border border-gray-100"
                    )}
                    data-testid={`assign-expert-option-${expert.id}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {expert.photo ? (
                        <img src={resolvePhoto(expert.photo)} alt={expert.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{expert.name}</p>
                      <p className="text-xs text-gray-500">{expert.location} — {expert.email}</p>
                    </div>
                    {assignModal.proposal?.assigned_expert_id === expert.id && (
                      <CheckCircle size={16} className="ml-auto text-green-600" />
                    )}
                  </button>
                ))}
              </div>
              <div className="px-5 py-3 border-t">
                <button onClick={() => setAssignModal({ open: false, proposal: null })} className="w-full py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminDashboard({ onBack, onViewHotel, onUsersView }) {
  const [airports, setAirports] = useState([]);
  const [cities, setCities] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('airports');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state for airports
  const [airportPagination, setAirportPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [airportSearch, setAirportSearch] = useState('');

  // Edit modal states
  const [editModal, setEditModal] = useState({ open: false, type: null, data: null });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Hotel edit form state (separate from generic edit modal)
  const [hotelEditModal, setHotelEditModal] = useState({ open: false, hotel: null, isNew: false });
  
  // Activity edit form state (separate from generic edit modal)
  const [activityEditModal, setActivityEditModal] = useState({ open: false, activity: null, isNew: false });
  const [transferEditModal, setTransferEditModal] = useState({ open: false, transfer: null, isNew: false });

  // Insurance settings state (country-based)
  const [insurancePrices, setInsurancePrices] = useState([]);
  const [insuranceModal, setInsuranceModal] = useState({ open: false, data: null, isNew: false });
  const [insuranceSaving, setInsuranceSaving] = useState(false);

  // Visa state
  const [visaList, setVisaList] = useState([]);
  const [visaModal, setVisaModal] = useState({ open: false, data: null, isNew: false });
  const [visaSaving, setVisaSaving] = useState(false);

  // SIM Card state
  const [simCardList, setSimCardList] = useState([]);
  const [simCardModal, setSimCardModal] = useState({ open: false, data: null, isNew: false });
  const [simCardSaving, setSimCardSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch airports when page or search changes
  useEffect(() => {
    if (activeTab === 'airports') {
      fetchAirports();
    }
  }, [airportPagination.page, airportSearch, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [citiesRes, hotelsRes, transfersRes, activitiesRes, insuranceRes, visasRes, simCardsRes] = await Promise.all([
        api.get('/cities'),
        api.get('/hotels'),
        api.get('/transfers'),
        api.get('/activities'),
        api.get('/settings/insurance'),
        api.get('/visas'),
        api.get('/sim-cards')
      ]);
      setCities(citiesRes.data?.cities || []);
      setHotels(hotelsRes.data?.hotels || []);
      setTransfers(transfersRes.data?.transfers || []);
      setActivities(activitiesRes.data?.activities || []);
      if (insuranceRes.data?.insurance_prices) setInsurancePrices(insuranceRes.data.insurance_prices);
      setVisaList(visasRes.data?.visas || []);
      setSimCardList(simCardsRes.data?.sim_cards || []);
      
      // Fetch airports separately with pagination
      await fetchAirports();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAirports = async () => {
    try {
      const params = new URLSearchParams({
        page: airportPagination.page.toString(),
        limit: airportPagination.limit.toString()
      });
      if (airportSearch) {
        params.append('search', airportSearch);
      }
      const res = await api.get(`/airports?${params.toString()}`);
      setAirports(res.data?.airports || []);
      if (res.data?.pagination) {
        setAirportPagination(prev => ({
          ...prev,
          total: res.data.pagination.total,
          pages: res.data.pagination.pages
        }));
      }
    } catch (error) {
      console.error('Error fetching airports:', error);
    }
  };

  const handleAirportSearch = (value) => {
    setAirportSearch(value);
    setAirportPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
  };

  const handleAirportPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= airportPagination.pages) {
      setAirportPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const filteredCities = cities.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHotels = hotels.filter(h =>
    h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransfers = transfers.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.from_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActivities = activities.filter(a =>
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open edit modal
  const openEditModal = (type, data = null) => {
    setEditModal({ open: true, type, data });
    if (data) {
      setEditForm({ ...data });
    } else {
      // Default values for new items
      if (type === 'airport') setEditForm({ code: '', name: '', city: '', country: '' });
      if (type === 'city') setEditForm({ name: '', country: '' });
      if (type === 'hotel') setEditForm({ 
        name: '', 
        address: '',
        city: '', 
        country: '', 
        star_rating: 4, 
        rating_score: 8.0, 
        description: '',
        check_in_time: '14:00',
        check_out_time: '12:00',
        total_rooms: null,
        amenities: [],
        highlights: [],
        board_types: ['RO', 'BB'],
        cancellation_policy: 'Flexible',
        supplier_name: '',
        supplier_cost_per_night: null
      });
      if (type === 'transfer') setEditForm({ 
        title: '', 
        from_location: '', 
        to_location: '', 
        price: 0, 
        description: '', 
        duration: '1 hrs', 
        confirmation_time: '4 hrs', 
        transfer_type: 'Private', 
        transfer_direction: 'arrival', // 'arrival' or 'departure'
        city: '', 
        is_available: true,
        pickup_times: [],
        max_bags: 2,
        supplier_name: '',
        supplier_cost: 0,
        video: null,
        vehicle_pricing: {
          sedan_4: { selling_price: 0, supplier_cost: 0, max_bags: 2 },
          car_7: { selling_price: 0, supplier_cost: 0, max_bags: 4 },
          van_8: { selling_price: 0, supplier_cost: 0, max_bags: 6 },
          van_17: { selling_price: 0, supplier_cost: 0, max_bags: 12 },
          bus_29: { selling_price: 0, supplier_cost: 0, max_bags: 20 },
          bus_45: { selling_price: 0, supplier_cost: 0, max_bags: 35 },
          bus_55: { selling_price: 0, supplier_cost: 0, max_bags: 45 }
        }
      });
      if (type === 'activity') setEditForm({
        name: '',
        description: '',
        city: '',
        country: '',
        category: 'Sightseeing',
        duration: '4 hours',
        price: 0,
        currency: 'AED',
        images: [],
        highlights: [],
        inclusions: [],
        exclusions: [],
        meeting_point: '',
        start_times: [],
        languages: ['English'],
        min_participants: 1,
        max_participants: 20,
        age_restriction: 'All ages',
        cancellation_policy: 'Free cancellation up to 24 hours',
        supplier_name: '',
        supplier_cost: 0,
        available: true,
        rating: 4.5,
        review_count: 0
      });
    }
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModal({ open: false, type: null, data: null });
    setEditForm({});
  };

  // Generic field change handler - prevents input lag
  const handleFieldChange = useCallback((field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save edited item
  const saveEdit = async () => {
    setSaving(true);
    try {
      const { type, data } = editModal;
      
      if (type === 'proposal') {
        if (data) {
          await api.put(`/proposals/${data.id}`, editForm);
          setProposals(proposals.map(p => p.id === data.id ? { ...p, ...editForm } : p));
        } else {
          const res = await api.post('/proposals', editForm);
          setProposals([...proposals, { id: res.data.id, ...editForm }]);
        }
      } else if (type === 'airport') {
        if (data) {
          await api.put(`/airports/${data.id}`, editForm);
          setAirports(airports.map(a => a.id === data.id ? { ...a, ...editForm } : a));
        } else {
          const res = await api.post('/airports', editForm);
          setAirports([...airports, { id: res.data.id, ...editForm }]);
          setAirportPagination(prev => ({ ...prev, total: prev.total + 1 }));
        }
      } else if (type === 'city') {
        if (data) {
          await api.put(`/cities/${data.id}`, editForm);
          setCities(cities.map(c => c.id === data.id ? { ...c, ...editForm } : c));
        } else {
          const res = await api.post('/cities', editForm);
          setCities([...cities, { id: res.data.id, ...editForm }]);
        }
      } else if (type === 'hotel') {
        if (data) {
          await api.put(`/hotels/${data.id}`, editForm);
          setHotels(hotels.map(h => h.id === data.id ? { ...h, ...editForm } : h));
        } else {
          const res = await api.post('/hotels', editForm);
          setHotels([...hotels, { id: res.data.id, ...editForm }]);
        }
      } else if (type === 'transfer') {
        if (data) {
          await api.put(`/transfers/${data.id}`, editForm);
          setTransfers(transfers.map(t => t.id === data.id ? { ...t, ...editForm } : t));
        } else {
          const res = await api.post('/transfers', editForm);
          setTransfers([...transfers, { id: res.data.id, ...editForm }]);
        }
      } else if (type === 'activity') {
        if (data) {
          await api.put(`/activities/${data.id}`, editForm);
          setActivities(activities.map(a => a.id === data.id ? { ...a, ...editForm } : a));
        } else {
          const res = await api.post('/activities', editForm);
          setActivities([...activities, { id: res.data.id, ...editForm }]);
        }
      }
      
      closeEditModal();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const deleteAirport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this airport?')) return;
    try {
      await api.delete(`/airports/${id}`);
      setAirports(airports.filter(a => a.id !== id));
      setAirportPagination(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (error) {
      console.error('Error deleting airport:', error);
    }
  };

  const deleteCity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this city?')) return;
    try {
      await api.delete(`/cities/${id}`);
      setCities(cities.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting city:', error);
    }
  };

  const deleteHotel = async (id) => {
    if (!window.confirm('Are you sure you want to delete this hotel?')) return;
    try {
      await api.delete(`/hotels/${id}`);
      setHotels(hotels.filter(h => h.id !== id));
    } catch (error) {
      console.error('Error deleting hotel:', error);
    }
  };

  const deleteTransfer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transfer?')) return;
    try {
      await api.delete(`/transfers/${id}`);
      setTransfers(transfers.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transfer:', error);
    }
  };

  const deleteActivity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    try {
      await api.delete(`/activities/${id}`);
      setActivities(activities.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  // Determine modal type and if it's a new item
  const modalType = editModal.type;
  const isNewItem = !editModal.data;

  // Render edit modal content inline
  const renderEditModal = () => {
    if (!editModal.open) return null;
    
    const type = editModal.type;
    const isNew = !editModal.data;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeEditModal}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 w-full max-w-3xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {isNew ? 'Add New' : 'Edit'} {type.charAt(0).toUpperCase() + type.slice(1)}
            </h3>
            <button onClick={closeEditModal} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {type === 'proposal' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Leaving From</label>
                  <input
                    type="text"
                    value={editForm.leaving_from || ''}
                    onChange={(e) => handleFieldChange('leaving_from', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-proposal-leaving-from"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={editForm.nationality || ''}
                    onChange={(e) => handleFieldChange('nationality', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-proposal-nationality"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Leaving On</label>
                  <input
                    type="date"
                    value={editForm.leaving_on || ''}
                    onChange={(e) => handleFieldChange('leaving_on', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-proposal-leaving-on"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Star Rating</label>
                    <select
                      value={editForm.star_rating || 3}
                      onChange={(e) => handleFieldChange('star_rating', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-proposal-star-rating"
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Star</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Status</label>
                    <select
                      value={editForm.status || 'pending'}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-proposal-status"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {type === 'airport' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">IATA Code</label>
                  <input
                    type="text"
                    value={editForm.code || ''}
                    onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                    maxLength={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent uppercase"
                    data-testid="edit-airport-code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Airport Name</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-airport-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-airport-city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                  <select
                    value={editForm.country || ''}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
                    data-testid="edit-airport-country"
                  >
                    <option value="">Select Country...</option>
                    {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}

            {type === 'city' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">City Name</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-city-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                  <select
                    value={editForm.country || ''}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
                    data-testid="edit-city-country"
                  >
                    <option value="">Select Country...</option>
                    {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}

            {type === 'hotel' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Hotel Name</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Address</label>
                  <input
                    type="text"
                    value={editForm.address || ''}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="Full hotel address"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Country</label>
                    <select
                      value={editForm.country || ''}
                      onChange={(e) => {
                        handleFieldChange('country', e.target.value);
                        handleFieldChange('city', '');
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
                      data-testid="edit-hotel-country"
                    >
                      <option value="">Select Country...</option>
                      {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">City *</label>
                    <select
                      value={editForm.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent bg-white"
                      data-testid="edit-hotel-city"
                    >
                      <option value="">Select City...</option>
                      {cities
                        .filter(c => !editForm.country || c.country?.toLowerCase() === editForm.country?.toLowerCase())
                        .map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)
                      }
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Star Rating</label>
                    <select
                      value={editForm.star_rating || 4}
                      onChange={(e) => handleFieldChange('star_rating', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-star-rating"
                    >
                      {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} Star</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Rating Score</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.rating_score || 8.0}
                      onChange={(e) => handleFieldChange('rating_score', parseFloat(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-rating-score"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Total Rooms</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.total_rooms || ''}
                      onChange={(e) => handleFieldChange('total_rooms', parseInt(e.target.value) || null)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-total-rooms"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Check-in Time</label>
                    <input
                      type="time"
                      value={editForm.check_in_time || '14:00'}
                      onChange={(e) => handleFieldChange('check_in_time', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-checkin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Check-out Time</label>
                    <input
                      type="time"
                      value={editForm.check_out_time || '12:00'}
                      onChange={(e) => handleFieldChange('check_out_time', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-hotel-checkout"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Board Types Available</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['RO', 'BB', 'HB', 'FB'].map((board) => (
                      <label key={board} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={(editForm.board_types || []).includes(board)}
                          onChange={(e) => {
                            const current = editForm.board_types || [];
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
                    value={Array.isArray(editForm.amenities) ? editForm.amenities.join(', ') : (editForm.amenities || '')}
                    onChange={(e) => handleFieldChange('amenities', e.target.value.split(',').map(a => a.trim()).filter(a => a))}
                    placeholder="e.g., Free WiFi, Pool, Spa, Gym, Restaurant"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-amenities"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Highlights (comma-separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(editForm.highlights) ? editForm.highlights.join(', ') : (editForm.highlights || '')}
                    onChange={(e) => handleFieldChange('highlights', e.target.value.split(',').map(h => h.trim()).filter(h => h))}
                    placeholder="e.g., Walking distance to metro, Free parking"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-highlights"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Cancellation Policy</label>
                  <select
                    value={editForm.cancellation_policy || 'Flexible'}
                    onChange={(e) => handleFieldChange('cancellation_policy', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-hotel-cancellation"
                  >
                    <option value="Flexible">Flexible - Free cancellation</option>
                    <option value="Moderate">Moderate - Free cancellation until 3 days before</option>
                    <option value="Strict">Strict - Free cancellation until 7 days before</option>
                    <option value="Non-refundable">Non-refundable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none"
                    data-testid="edit-hotel-description"
                  />
                </div>
                
                {/* Supplier Information */}
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Building2 size={16} className="text-purple-500" />
                    Supplier Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">Supplier Name</label>
                      <input
                        type="text"
                        value={editForm.supplier_name || ''}
                        onChange={(e) => handleFieldChange('supplier_name', e.target.value)}
                        placeholder="e.g., Marriott Hotels"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                        data-testid="edit-hotel-supplier-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">Supplier Cost/Night (AED)</label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.supplier_cost_per_night || ''}
                        onChange={(e) => handleFieldChange('supplier_cost_per_night', parseFloat(e.target.value) || null)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                        data-testid="edit-hotel-supplier-cost"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {type === 'transfer' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="e.g., Private from Dubai International Airport"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-transfer-title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">From Location</label>
                    <input
                      type="text"
                      value={editForm.from_location || ''}
                      onChange={(e) => handleFieldChange('from_location', e.target.value)}
                      placeholder="Airport or hotel name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-from"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">To Location</label>
                    <input
                      type="text"
                      value={editForm.to_location || ''}
                      onChange={(e) => handleFieldChange('to_location', e.target.value)}
                      placeholder="Hotel or destination"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-to"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-city"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Transfer Type</label>
                    <select
                      value={editForm.transfer_type || 'Private'}
                      onChange={(e) => handleFieldChange('transfer_type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-type"
                    >
                      <option value="Private">Private</option>
                      <option value="Shared">Shared</option>
                      <option value="Luxury">Luxury</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Transfer Direction</label>
                    <select
                      value={editForm.transfer_direction || 'arrival'}
                      onChange={(e) => handleFieldChange('transfer_direction', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-direction"
                    >
                      <option value="arrival">Arrival (Airport → Hotel)</option>
                      <option value="departure">Departure (Hotel → Airport)</option>
                      <option value="inter-hotel">Inter-Hotel (Hotel → Hotel)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Duration</label>
                    <input
                      type="text"
                      value={editForm.duration || ''}
                      onChange={(e) => handleFieldChange('duration', e.target.value)}
                      placeholder="e.g., 1 hrs"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-duration"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Confirmation Time</label>
                    <input
                      type="text"
                      value={editForm.confirmation_time || ''}
                      onChange={(e) => handleFieldChange('confirmation_time', e.target.value)}
                      placeholder="e.g., 4 hrs"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-confirmation"
                    />
                  </div>
                </div>
                
                {/* Vehicle-Based Pricing Section */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                      <Car size={18} className="text-blue-600" />
                      Vehicle-Based Pricing (AED)
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">Set selling price and supplier cost for each vehicle type</p>
                  </div>
                  
                  <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                    {[
                      { key: 'sedan_4', label: '4 Seater Sedan', icon: '🚗', pax: '1-4 pax' },
                      { key: 'car_7', label: '7 Seater Car', icon: '🚙', pax: '3-7 pax', optional: true },
                      { key: 'van_8', label: '8 Seater Van', icon: '🚐', pax: '5-8 pax', optional: true },
                      { key: 'van_17', label: '17 Seater Van', icon: '🚐', pax: '9-17 pax' },
                      { key: 'bus_29', label: '29 Seater Bus', icon: '🚌', pax: '18-29 pax' },
                      { key: 'bus_45', label: '45 Seater Bus', icon: '🚌', pax: '30-45 pax' },
                      { key: 'bus_55', label: '55 Seater Bus', icon: '🚌', pax: '46-55 pax' }
                    ].map(vehicle => {
                      const vp = editForm.vehicle_pricing || {};
                      const pricing = vp[vehicle.key] || { selling_price: 0, supplier_cost: 0, max_bags: 0 };
                      const margin = (pricing.selling_price || 0) - (pricing.supplier_cost || 0);
                      const marginPercent = pricing.selling_price > 0 ? (margin / pricing.selling_price * 100) : 0;
                      
                      return (
                        <div key={vehicle.key} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-44 flex items-center gap-2 flex-shrink-0">
                              <span className="text-lg">{vehicle.icon}</span>
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-medium text-gray-700">{vehicle.label}</span>
                                  {vehicle.optional && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Optional</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">{vehicle.pax}</span>
                              </div>
                            </div>
                            
                            <div className="flex-1 grid grid-cols-4 gap-4">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Selling Price</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={pricing.selling_price || ''}
                                  onChange={(e) => {
                                    const newPricing = { ...editForm.vehicle_pricing };
                                    newPricing[vehicle.key] = {
                                      ...newPricing[vehicle.key],
                                      selling_price: parseFloat(e.target.value) || 0
                                    };
                                    handleFieldChange('vehicle_pricing', newPricing);
                                  }}
                                  placeholder="0"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Supplier Cost</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={pricing.supplier_cost || ''}
                                  onChange={(e) => {
                                    const newPricing = { ...editForm.vehicle_pricing };
                                    newPricing[vehicle.key] = {
                                      ...newPricing[vehicle.key],
                                      supplier_cost: parseFloat(e.target.value) || 0
                                    };
                                    handleFieldChange('vehicle_pricing', newPricing);
                                  }}
                                  placeholder="0"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Max Bags</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={pricing.max_bags || ''}
                                  onChange={(e) => {
                                    const newPricing = { ...editForm.vehicle_pricing };
                                    newPricing[vehicle.key] = {
                                      ...newPricing[vehicle.key],
                                      max_bags: parseInt(e.target.value) || 0
                                    };
                                    handleFieldChange('vehicle_pricing', newPricing);
                                  }}
                                  placeholder="0"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Margin</label>
                                <div className={`px-3 py-2 rounded-lg text-sm font-medium ${margin > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                                  {margin > 0 ? (
                                    <>
                                      {margin.toFixed(0)}
                                      <span className="text-xs ml-1">({marginPercent.toFixed(0)}%)</span>
                                    </>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={editForm.supplier_name || ''}
                      onChange={(e) => handleFieldChange('supplier_name', e.target.value)}
                      placeholder="Enter supplier name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-supplier-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Pick-up Times (comma-separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(editForm.pickup_times) ? editForm.pickup_times.join(', ') : (editForm.pickup_times || '')}
                    onChange={(e) => handleFieldChange('pickup_times', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                    placeholder="e.g., 06:00, 09:00, 12:00, 15:00, 18:00, 21:00"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                    data-testid="edit-transfer-pickup-times"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={2}
                    placeholder="Transfer details and what's included..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none"
                    data-testid="edit-transfer-description"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_available !== false}
                    onChange={(e) => handleFieldChange('is_available', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#002B5B] focus:ring-[#002B5B]"
                    data-testid="edit-transfer-available"
                  />
                  <label className="text-sm font-bold text-gray-600">Transfer Available</label>
                </div>
                
                {/* Video Section */}
                <div className="border-t border-gray-200 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Destination Video
                  </h4>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Video URL (YouTube or direct link)</label>
                    <input
                      type="text"
                      value={editForm.video || ''}
                      onChange={(e) => handleFieldChange('video', e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or direct video URL"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      data-testid="edit-transfer-video"
                    />
                    <p className="text-xs text-gray-400 mt-1">This video will appear on the proposal page for days with this transfer</p>
                  </div>
                  {editForm.video && editForm.video.includes('youtube') && (
                    <div className="mt-2 aspect-video bg-gray-900 rounded-lg overflow-hidden max-w-sm">
                      <iframe
                        src={`https://www.youtube.com/embed/${editForm.video.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/)?.[1]}`}
                        title="Preview"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={closeEditModal}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-[#002B5B] text-white rounded-xl font-bold hover:bg-[#003d82] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="save-edit-button"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  {isNewItem ? 'Create' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans text-[#1A1A1A]" data-testid="admin-dashboard">
      {renderEditModal()}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header with User Management Button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={onUsersView}
            data-testid="user-management-button"
            className="flex items-center gap-2 px-6 py-3 bg-[#002B5B] text-white rounded-xl font-bold hover:bg-[#003d82] transition-colors shadow-lg"
          >
            <Users size={20} />
            User Management
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {[
            { label: 'Airports in DB', value: airportPagination.total || airports.length, icon: Plane, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Cities in DB', value: cities.length, icon: MapPin, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Hotels in DB', value: hotels.length, icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Transfers in DB', value: transfers.length, icon: Car, color: 'text-teal-600', bg: 'bg-teal-50' },
            { label: 'Activities in DB', value: activities.length, icon: Compass, color: 'text-pink-600', bg: 'bg-pink-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm" data-testid={`stat-${i}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-xl", stat.bg)}>
                  <stat.icon className={stat.color} size={24} />
                </div>
                <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded">Active</span>
              </div>
              <div className="text-2xl font-black text-gray-800">{stat.value}</div>
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {['airports', 'cities', 'hotels', 'transfers', 'activities', 'visas', 'sim-cards', 'terms', 'insurance', 'staff', 'wallets', 'bookings'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                data-testid={`tab-${tab}`}
                className={cn(
                  "px-8 py-5 font-bold text-sm transition-all relative capitalize whitespace-nowrap",
                  activeTab === tab ? "text-[#002B5B]" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {tab === 'terms' ? 'Terms & Policies' : tab === 'insurance' ? 'Insurance' : tab === 'staff' ? 'Staff / Experts' : tab === 'wallets' ? 'Wallets' : tab === 'bookings' ? 'Bookings' : tab === 'visas' ? 'Visas' : tab === 'sim-cards' ? 'SIM Cards' : `${tab} Management`}
                {activeTab === tab && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#002B5B]" />}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Search and Refresh */}
            <div className="flex justify-between items-center mb-8">
              <div className="relative w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="search-input"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                />
              </div>
              <button 
                onClick={fetchData}
                data-testid="refresh-button"
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-sm font-bold transition-colors"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Refresh Data
              </button>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'airports' && (
              <div>
                {/* Airport-specific search and Add button */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="relative w-full max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by name, code, city or country..."
                        value={airportSearch}
                        onChange={(e) => handleAirportSearch(e.target.value)}
                        data-testid="airport-search-input"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none text-sm font-medium"
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Showing {airports.length} of {airportPagination.total} airports
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal('airport')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-airport-button"
                  >
                    <Plus size={18} />
                    Add Airport
                  </button>
                </div>

                {/* Airports Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {airports.map((airport, i) => (
                    <div key={airport.id || i} className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all group" data-testid={`airport-card-${airport.code}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="font-bold text-purple-600 text-sm">{airport.code}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-800 text-sm truncate">{airport.name}</div>
                            <div className="text-xs text-gray-500">{airport.city}, {airport.country}</div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button 
                            onClick={() => openEditModal('airport', airport)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            data-testid={`edit-airport-${airport.code}`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => deleteAirport(airport.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            data-testid={`delete-airport-${airport.code}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {airportPagination.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6" data-testid="airport-pagination">
                    <button
                      onClick={() => handleAirportPageChange(airportPagination.page - 1)}
                      disabled={airportPagination.page === 1}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        airportPagination.page === 1 
                          ? "text-gray-300 cursor-not-allowed" 
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                      data-testid="airport-prev-page"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, airportPagination.pages) }, (_, i) => {
                        let pageNum;
                        if (airportPagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (airportPagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (airportPagination.page >= airportPagination.pages - 2) {
                          pageNum = airportPagination.pages - 4 + i;
                        } else {
                          pageNum = airportPagination.page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handleAirportPageChange(pageNum)}
                            className={cn(
                              "w-10 h-10 rounded-lg text-sm font-bold transition-colors",
                              pageNum === airportPagination.page
                                ? "bg-[#002B5B] text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            )}
                            data-testid={`airport-page-${pageNum}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handleAirportPageChange(airportPagination.page + 1)}
                      disabled={airportPagination.page === airportPagination.pages}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        airportPagination.page === airportPagination.pages 
                          ? "text-gray-300 cursor-not-allowed" 
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                      data-testid="airport-next-page"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'cities' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => openEditModal('city')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-city-button"
                  >
                    <Plus size={18} />
                    Add City
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {filteredCities.map((city, i) => (
                    <div key={city.id || i} className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MapPin className="text-green-500" size={20} />
                          <div>
                            <div className="font-bold text-gray-800">{city.name}</div>
                            <div className="text-xs text-gray-500">{city.country}</div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditModal('city', city)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            data-testid={`edit-city-${city.id}`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => deleteCity(city.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            data-testid={`delete-city-${city.id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'hotels' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setHotelEditModal({ open: true, hotel: null, isNew: true })}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-hotel-button"
                  >
                    <Plus size={18} />
                    Add Hotel
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredHotels.map((hotel, i) => (
                    <div 
                      key={hotel.id || i} 
                      className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg transition-all group"
                    >
                      <div className="flex gap-4">
                        {/* Hotel Image */}
                        <div className="relative">
                          <img 
                            src={hotel.images?.[0] || 'https://via.placeholder.com/120x100?text=No+Image'} 
                            alt={hotel.name}
                            className="w-28 h-24 rounded-lg object-cover cursor-pointer"
                            onClick={() => onViewHotel && onViewHotel(hotel)}
                          />
                          {hotel.images?.length > 1 && (
                            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                              +{hotel.images.length - 1}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="cursor-pointer" onClick={() => onViewHotel && onViewHotel(hotel)}>
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-gray-800 truncate">{hotel.name}</div>
                                {hotel.recommended && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" data-testid={`hotel-recommended-badge-${hotel.id}`}>
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {Array.from({ length: hotel.star_rating || 4 }).map((_, j) => (
                                  <Star key={j} size={12} className="fill-yellow-400 text-yellow-400" />
                                ))}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{hotel.city}, {hotel.country}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="bg-[#002B5B] text-white px-2 py-1 rounded font-bold text-sm">
                                {hotel.rating_score || 8.0}
                              </div>
                            </div>
                          </div>
                          
                          {/* Room Types & Rate Plans Count */}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Bed size={12} />
                              {hotel.room_types?.length || hotel.rooms?.length || 0} room types
                            </span>
                            {hotel.amenities?.length > 0 && (
                              <span className="truncate">
                                {hotel.amenities.slice(0, 3).join(', ')}
                              </span>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setHotelEditModal({ open: true, hotel, isNew: false }); 
                              }}
                              className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                              data-testid={`edit-hotel-${hotel.id}`}
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteHotel(hotel.id); }}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                              data-testid={`delete-hotel-${hotel.id}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredHotels.length === 0 && (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Building2 size={48} />
                      <span className="font-bold">No hotels found</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transfers' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setTransferEditModal({ open: true, transfer: null, isNew: true })}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-transfer-button"
                  >
                    <Plus size={18} />
                    Add Transfer
                  </button>
                </div>
                
                {loading ? (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-[#002B5B] border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold text-gray-400">Loading transfers...</span>
                    </div>
                  </div>
                ) : filteredTransfers.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Car size={48} />
                      <span className="font-bold">No transfers found</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTransfers.map((transfer, i) => (
                      <div 
                        key={transfer.id || i} 
                        className="bg-gray-50 p-5 rounded-xl border border-gray-100 hover:shadow-md transition-all group"
                        data-testid={`transfer-card-${transfer.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              transfer.transfer_type === 'Luxury' ? 'bg-amber-100' :
                              transfer.transfer_type === 'Shared' ? 'bg-blue-100' : 'bg-teal-100'
                            }`}>
                              <Car className={`${
                                transfer.transfer_type === 'Luxury' ? 'text-amber-600' :
                                transfer.transfer_type === 'Shared' ? 'text-blue-600' : 'text-teal-600'
                              }`} size={20} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                transfer.transfer_type === 'Luxury' ? 'bg-amber-100 text-amber-700' :
                                transfer.transfer_type === 'Shared' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                              }`}>
                                {transfer.transfer_type}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                transfer.transfer_direction === 'departure' ? 'bg-orange-100 text-orange-700' : transfer.transfer_direction === 'inter-hotel' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {transfer.transfer_direction === 'departure' ? 'Departure' : transfer.transfer_direction === 'inter-hotel' ? 'Inter-Hotel' : 'Arrival'}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setTransferEditModal({ open: true, transfer: transfer, isNew: false })}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                              data-testid={`edit-transfer-${transfer.id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => deleteTransfer(transfer.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                              data-testid={`delete-transfer-${transfer.id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        
                        <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-1">{transfer.title}</h3>
                        
                        <div className="space-y-2 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-green-500 flex-shrink-0" />
                            <span className="truncate">{transfer.from_location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-red-500 flex-shrink-0" />
                            <span className="truncate">{transfer.to_location}</span>
                          </div>
                        </div>
                        
                        {/* Vehicle Info Row */}
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                          {transfer.pickup_times && transfer.pickup_times.length > 0 && (
                            <div className="flex items-center gap-1" title="Pick-up Times">
                              <Clock size={12} />
                              <span>{transfer.pickup_times.length} times</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Pickup Times Display */}
                        {transfer.pickup_times && transfer.pickup_times.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {transfer.pickup_times.slice(0, 4).map((time, idx) => (
                              <span key={idx} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                {time}
                              </span>
                            ))}
                            {transfer.pickup_times.length > 4 && (
                              <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                                +{transfer.pickup_times.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={12} />
                              <span>{transfer.duration}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin size={12} />
                              <span>{transfer.city}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} className="text-green-600" />
                            <span className="font-bold text-green-600">{transfer.price} AED</span>
                          </div>
                        </div>
                        
                        {/* Supplier Info (Admin only) */}
                        {transfer.supplier_name && (
                          <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-purple-600">
                              <Building2 size={12} />
                              <span className="font-medium">{transfer.supplier_name}</span>
                            </div>
                            {transfer.supplier_cost > 0 && (
                              <span className="text-gray-500">
                                Cost: <span className="font-medium">{transfer.supplier_cost} AED</span>
                                {transfer.price > transfer.supplier_cost && (
                                  <span className="text-green-600 ml-1">
                                    (+{(transfer.price - transfer.supplier_cost).toFixed(0)})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {!transfer.is_available && (
                          <div className="mt-2 px-2 py-1 bg-red-50 rounded text-xs text-red-600 font-bold text-center">
                            Unavailable
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activities Tab */}
            {activeTab === 'activities' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setActivityEditModal({ open: true, activity: null, isNew: true })}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
                    data-testid="add-activity-button"
                  >
                    <Plus size={18} />
                    Add Activity
                  </button>
                </div>
                {filteredActivities.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Compass size={48} />
                      <span className="font-bold">No activities found</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredActivities.map((activity) => (
                      <div 
                        key={activity.id} 
                        className={cn(
                          "bg-white p-5 rounded-xl border hover:shadow-lg transition-all group",
                          activity.available === false ? "border-red-200 opacity-75" : "border-gray-200"
                        )}
                      >
                        {/* Activity Image */}
                        <div className="relative mb-4">
                          <img 
                            src={activity.images?.[0] || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400'} 
                            alt={activity.name}
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                            <span className="bg-pink-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                              {activity.category || 'Activity'}
                            </span>
                            {activity.transfer_type && (
                              <span className="bg-blue-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                                {activity.transfer_type}
                              </span>
                            )}
                            {activity.available === false && (
                              <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">
                                UNAVAILABLE
                              </span>
                            )}
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setActivityEditModal({ open: true, activity, isNew: false })}
                              className="p-2 bg-white/90 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors shadow"
                              data-testid={`edit-activity-${activity.id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => deleteActivity(activity.id)}
                              className="p-2 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg transition-colors shadow"
                              data-testid={`delete-activity-${activity.id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Activity Info */}
                        <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{activity.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <MapPin size={12} />
                          <span>{activity.city}, {activity.country}</span>
                        </div>
                        
                        {/* Timing Info */}
                        {activity.start_times && activity.start_times.length > 0 && (
                          <div className="text-xs text-blue-600 mb-2">
                            <Clock size={10} className="inline mr-1" />
                            Starts at {activity.start_times.join(', ')} ({activity.duration})
                          </div>
                        )}
                        
                        {/* Closed Days */}
                        {activity.closed_days && activity.closed_days.length > 0 && (
                          <div className="text-xs text-red-500 mb-2">
                            Closed on {activity.closed_days.join(', ')}
                          </div>
                        )}
                        
                        {/* Languages */}
                        {activity.languages && activity.languages.length > 0 && (
                          <div className="text-xs text-gray-500 mb-2">
                            <Globe size={10} className="inline mr-1" />
                            {activity.languages.join(', ')}
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{activity.description}</p>
                        
                        {/* Activity Details */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                            <Clock size={12} />
                            <span>{activity.duration}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                            <Users size={12} />
                            <span>{activity.min_participants}-{activity.max_participants}</span>
                          </div>
                          {activity.rating && (
                            <div className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                              <Star size={12} className="fill-yellow-400" />
                              <span>{activity.rating}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Inclusions Preview */}
                        {activity.inclusions && activity.inclusions.length > 0 && (
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
                        
                        {/* Price & Supplier */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-1">
                            <DollarSign size={16} className="text-green-600" />
                            <span className="font-bold text-green-600 text-lg">{activity.price}</span>
                            <span className="text-xs text-gray-500">{activity.currency}</span>
                          </div>
                          {activity.supplier_name && (
                            <div className="text-xs text-purple-600">
                              {activity.supplier_name}
                            </div>
                          )}
                        </div>
                        
                        {/* Supplier Cost (Admin view) */}
                        {activity.supplier_cost > 0 && (
                          <div className="mt-2 text-xs text-gray-500 flex justify-between">
                            <span>Supplier Cost: {activity.supplier_cost} {activity.currency}</span>
                            {activity.price > activity.supplier_cost && (
                              <span className="text-green-600 font-medium">
                                Margin: +{(activity.price - activity.supplier_cost).toFixed(0)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Terms & Policies Tab */}
            {activeTab === 'visas' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6" data-testid="visa-management">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Globe size={24} className="text-[#002B5B]" />
                    <h2 className="text-xl font-bold text-[#002B5B]">Visa Management</h2>
                  </div>
                  <button
                    onClick={() => setVisaModal({ open: true, data: { country: '', visa_type: 'Tourist Visa', entry_type: 'Tourist / Single Entry / Sticker Visa', required: true, processing_time: '', validity: '', max_stay: '', price: 0, currency: 'AED', documents_required: [], notes: '', available: true }, isNew: true })}
                    className="px-4 py-2 bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d] transition-colors font-medium flex items-center gap-2 text-sm"
                    data-testid="add-visa-btn"
                  >
                    <Plus size={16} /> Add Country Visa
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200 text-gray-500">
                        <th className="py-3 px-3 font-medium">Country</th>
                        <th className="py-3 px-3 font-medium">Visa Type</th>
                        <th className="py-3 px-3 font-medium">Entry Type</th>
                        <th className="py-3 px-3 font-medium">Required</th>
                        <th className="py-3 px-3 font-medium">Processing</th>
                        <th className="py-3 px-3 font-medium">Price</th>
                        <th className="py-3 px-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visaList.map((visa) => (
                        <tr key={visa.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3 font-medium text-gray-900">{visa.country}</td>
                          <td className="py-3 px-3 text-gray-600">{visa.visa_type}</td>
                          <td className="py-3 px-3 text-gray-600 text-xs">{visa.entry_type}</td>
                          <td className="py-3 px-3">
                            <span className={cn("px-2 py-0.5 rounded text-xs font-bold", visa.required ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                              {visa.required ? 'Required' : 'Not Required'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-600 text-xs">{visa.processing_time || '-'}</td>
                          <td className="py-3 px-3 font-medium">{visa.currency} {visa.price}</td>
                          <td className="py-3 px-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setVisaModal({ open: true, data: { ...visa }, isNew: false })}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                data-testid={`edit-visa-${visa.id}`}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm(`Delete visa for ${visa.country}?`)) return;
                                  await api.delete(`/visas/${visa.id}`);
                                  setVisaList(prev => prev.filter(v => v.id !== visa.id));
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                data-testid={`delete-visa-${visa.id}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {visaList.length === 0 && (
                        <tr><td colSpan="7" className="text-center py-8 text-gray-400">No visa entries yet. Add your first country visa.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Visa Modal */}
                {visaModal.open && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setVisaModal({ open: false, data: null, isNew: false })}>
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      <h3 className="text-lg font-bold text-[#002B5B] mb-4">{visaModal.isNew ? 'Add' : 'Edit'} Visa Entry</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Country *</label>
                          <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={visaModal.data?.country || ''} onChange={e => setVisaModal(p => ({ ...p, data: { ...p.data, country: e.target.value } }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Visa Type</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={visaModal.data?.visa_type || ''} onChange={e => setVisaModal(p => ({ ...p, data: { ...p.data, visa_type: e.target.value } }))} />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Entry Type</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={visaModal.data?.entry_type || ''} onChange={e => setVisaModal(p => ({ ...p, data: { ...p.data, entry_type: e.target.value } }))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Processing Time</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. 3-5 business days" value={visaModal.data?.processing_time || ''} onChange={e => setVisaModal(p => ({ ...p, data: { ...p.data, processing_time: e.target.value } }))} />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Validity</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. 180 days" value={visaModal.data?.validity || ''} onChange={e => setVisaModal(p => ({ ...p, data: { ...p.data, validity: e.target.value } }))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Max Stay</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. 30 days" value={visaModal.data?.max_stay || ''} onChange={e => setVisaModal(p => ({ ...p, data: { ...p.data, max_stay: e.target.value } }))} />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Price (AED)</label>
                            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={visaModal.data?.price || 0} onChange={e => setVisaModal(p => ({ ...p, data: { ...p.data, price: Number(e.target.value) } }))} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="visa-required" checked={visaModal.data?.required || false} onChange={e => setVisaModal(p => ({ ...p, data: { ...p.data, required: e.target.checked } }))} />
                          <label htmlFor="visa-required" className="text-sm font-medium text-gray-700">Visa Required</label>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Documents Required (comma separated)</label>
                          <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="Valid passport, Return ticket, Hotel booking" value={(visaModal.data?.documents_required || []).join(', ')} onChange={e => setVisaModal(p => ({ ...p, data: { ...p.data, documents_required: e.target.value.split(',').map(d => d.trim()).filter(Boolean) } }))} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Notes</label>
                          <textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={2} value={visaModal.data?.notes || ''} onChange={e => setVisaModal(p => ({ ...p, data: { ...p.data, notes: e.target.value } }))} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-5">
                        <button onClick={() => setVisaModal({ open: false, data: null, isNew: false })} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm">Cancel</button>
                        <button
                          disabled={visaSaving}
                          onClick={async () => {
                            setVisaSaving(true);
                            try {
                              const payload = { ...visaModal.data };
                              delete payload.id; delete payload.created_at; delete payload.updated_at;
                              if (visaModal.isNew) {
                                const res = await api.post('/visas', payload);
                                setVisaList(prev => [...prev, { ...payload, id: res.data.id }]);
                              } else {
                                await api.put(`/visas/${visaModal.data.id}`, payload);
                                setVisaList(prev => prev.map(v => v.id === visaModal.data.id ? { ...v, ...payload } : v));
                              }
                              setVisaModal({ open: false, data: null, isNew: false });
                            } catch (err) { console.error(err); }
                            setVisaSaving(false);
                          }}
                          className="px-4 py-2 bg-[#002B5B] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                          data-testid="save-visa-btn"
                        >
                          {visaSaving ? 'Saving...' : visaModal.isNew ? 'Add Visa' : 'Update Visa'}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            )}

            {activeTab === 'sim-cards' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6" data-testid="sim-card-management">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Phone size={24} className="text-[#002B5B]" />
                    <h2 className="text-xl font-bold text-[#002B5B]">SIM Card Management</h2>
                  </div>
                  <button
                    onClick={() => setSimCardModal({ open: true, data: { country: '', provider: '', plan_name: '', data_allowance: '', validity: '', calls_included: false, sms_included: false, price: 0, currency: 'AED', notes: '', available: true }, isNew: true })}
                    className="px-4 py-2 bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d] transition-colors font-medium flex items-center gap-2 text-sm"
                    data-testid="add-sim-card-btn"
                  >
                    <Plus size={16} /> Add SIM Card Plan
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-gray-200 text-gray-500">
                        <th className="py-3 px-3 font-medium">Country</th>
                        <th className="py-3 px-3 font-medium">Provider</th>
                        <th className="py-3 px-3 font-medium">Plan</th>
                        <th className="py-3 px-3 font-medium">Data</th>
                        <th className="py-3 px-3 font-medium">Validity</th>
                        <th className="py-3 px-3 font-medium">Calls/SMS</th>
                        <th className="py-3 px-3 font-medium">Price</th>
                        <th className="py-3 px-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simCardList.map((sim) => (
                        <tr key={sim.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3 font-medium text-gray-900">{sim.country}</td>
                          <td className="py-3 px-3 text-gray-600">{sim.provider}</td>
                          <td className="py-3 px-3 text-gray-600">{sim.plan_name}</td>
                          <td className="py-3 px-3 text-gray-600">{sim.data_allowance || '-'}</td>
                          <td className="py-3 px-3 text-gray-600">{sim.validity || '-'}</td>
                          <td className="py-3 px-3">
                            <div className="flex gap-1">
                              {sim.calls_included && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">Calls</span>}
                              {sim.sms_included && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">SMS</span>}
                              {!sim.calls_included && !sim.sms_included && <span className="text-gray-400">-</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-medium">{sim.currency} {sim.price}</td>
                          <td className="py-3 px-3">
                            <div className="flex gap-2">
                              <button onClick={() => setSimCardModal({ open: true, data: { ...sim }, isNew: false })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                              <button onClick={async () => { if (!window.confirm(`Delete SIM plan for ${sim.country}?`)) return; await api.delete(`/sim-cards/${sim.id}`); setSimCardList(prev => prev.filter(s => s.id !== sim.id)); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {simCardList.length === 0 && (
                        <tr><td colSpan="8" className="text-center py-8 text-gray-400">No SIM card plans yet. Add your first country plan.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {simCardModal.open && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSimCardModal({ open: false, data: null, isNew: false })}>
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      <h3 className="text-lg font-bold text-[#002B5B] mb-4">{simCardModal.isNew ? 'Add' : 'Edit'} SIM Card Plan</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Country *</label>
                          <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={simCardModal.data?.country || ''} onChange={e => setSimCardModal(p => ({ ...p, data: { ...p.data, country: e.target.value } }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Provider</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. Magti, Geocell" value={simCardModal.data?.provider || ''} onChange={e => setSimCardModal(p => ({ ...p, data: { ...p.data, provider: e.target.value } }))} />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Plan Name</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. Tourist Data Plan" value={simCardModal.data?.plan_name || ''} onChange={e => setSimCardModal(p => ({ ...p, data: { ...p.data, plan_name: e.target.value } }))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Data Allowance</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. 5GB, Unlimited" value={simCardModal.data?.data_allowance || ''} onChange={e => setSimCardModal(p => ({ ...p, data: { ...p.data, data_allowance: e.target.value } }))} />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Validity</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. 7 days, 30 days" value={simCardModal.data?.validity || ''} onChange={e => setSimCardModal(p => ({ ...p, data: { ...p.data, validity: e.target.value } }))} />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Price (AED)</label>
                          <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={simCardModal.data?.price || 0} onChange={e => setSimCardModal(p => ({ ...p, data: { ...p.data, price: Number(e.target.value) } }))} />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={simCardModal.data?.calls_included || false} onChange={e => setSimCardModal(p => ({ ...p, data: { ...p.data, calls_included: e.target.checked } }))} />
                            Calls Included
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={simCardModal.data?.sms_included || false} onChange={e => setSimCardModal(p => ({ ...p, data: { ...p.data, sms_included: e.target.checked } }))} />
                            SMS Included
                          </label>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Notes</label>
                          <textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={2} value={simCardModal.data?.notes || ''} onChange={e => setSimCardModal(p => ({ ...p, data: { ...p.data, notes: e.target.value } }))} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-5">
                        <button onClick={() => setSimCardModal({ open: false, data: null, isNew: false })} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm">Cancel</button>
                        <button
                          disabled={simCardSaving}
                          onClick={async () => {
                            setSimCardSaving(true);
                            try {
                              const payload = { ...simCardModal.data };
                              delete payload.id; delete payload.created_at; delete payload.updated_at;
                              if (simCardModal.isNew) {
                                const res = await api.post('/sim-cards', payload);
                                setSimCardList(prev => [...prev, { ...payload, id: res.data.id }]);
                              } else {
                                await api.put(`/sim-cards/${simCardModal.data.id}`, payload);
                                setSimCardList(prev => prev.map(s => s.id === simCardModal.data.id ? { ...s, ...payload } : s));
                              }
                              setSimCardModal({ open: false, data: null, isNew: false });
                            } catch (err) { console.error(err); }
                            setSimCardSaving(false);
                          }}
                          className="px-4 py-2 bg-[#002B5B] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                          data-testid="save-sim-card-btn"
                        >
                          {simCardSaving ? 'Saving...' : simCardModal.isNew ? 'Add Plan' : 'Update Plan'}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            )}

            {activeTab === 'terms' && (
              <TermsPoliciesManager />
            )}

            {activeTab === 'insurance' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6" data-testid="insurance-management">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Shield size={24} className="text-[#002B5B]" />
                    <h2 className="text-xl font-bold text-[#002B5B]">Country-Based Insurance Pricing</h2>
                  </div>
                  <button
                    onClick={() => setInsuranceModal({ open: true, data: { country: '', price_per_person: 50, currency: 'AED', min_coverage: 50000, max_age: 60, description: '' }, isNew: true })}
                    className="px-4 py-2 bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d] transition-colors font-medium flex items-center gap-2 text-sm"
                    data-testid="add-insurance-price-btn"
                  >
                    <Plus size={16} /> Add Country Price
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-4">Set different insurance prices per country. The "Default" entry is used as fallback for countries without a specific price.</p>

                {/* Insurance Prices Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="insurance-prices-table">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="py-3 px-4 font-semibold text-gray-600">Country</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Price/Person</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Currency</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Min Coverage</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Max Age</th>
                        <th className="py-3 px-4 font-semibold text-gray-600">Description</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insurancePrices.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors" data-testid={`insurance-row-${entry.country}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Globe size={14} className="text-gray-400" />
                              <span className="font-medium text-gray-800">{entry.country}</span>
                              {entry.country === 'Default' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Fallback</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#002B5B]">{entry.price_per_person}</td>
                          <td className="py-3 px-4 text-gray-600">{entry.currency}</td>
                          <td className="py-3 px-4 text-gray-600">${(entry.min_coverage || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-gray-600">{entry.max_age} yrs</td>
                          <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate">{entry.description || '-'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setInsuranceModal({ open: true, data: { ...entry }, isNew: false })}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                data-testid={`edit-insurance-${entry.country}`}
                              >
                                <Edit2 size={15} />
                              </button>
                              {entry.country !== 'Default' && (
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Delete insurance pricing for "${entry.country}"?`)) return;
                                    try {
                                      await api.delete(`/settings/insurance/${entry.id}`);
                                      setInsurancePrices(prev => prev.filter(p => p.id !== entry.id));
                                    } catch (err) {
                                      alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
                                    }
                                  }}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  data-testid={`delete-insurance-${entry.country}`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {insurancePrices.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-gray-400">No insurance prices configured</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Insurance Add/Edit Modal */}
                <AnimatePresence>
                  {insuranceModal.open && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setInsuranceModal({ open: false, data: null, isNew: false })}>
                      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" data-testid="insurance-modal">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-lg font-bold text-[#002B5B]">{insuranceModal.isNew ? 'Add Country Price' : `Edit: ${insuranceModal.data?.country}`}</h3>
                          <button onClick={() => setInsuranceModal({ open: false, data: null, isNew: false })} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                            {insuranceModal.isNew ? (
                              <select
                                value={insuranceModal.data?.country || ''}
                                onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, country: e.target.value } }))}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm"
                                data-testid="insurance-country-select"
                              >
                                <option value="">Select Country...</option>
                                <option value="Default">Default (Fallback)</option>
                                {["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)","Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Samoa","San Marino","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"]
                                  .filter(c => !insurancePrices.some(p => p.country === c))
                                  .map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            ) : (
                              <input type="text" value={insuranceModal.data?.country || ''} disabled className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500" />
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Person</label>
                              <input type="number" value={insuranceModal.data?.price_per_person || ''} onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, price_per_person: parseFloat(e.target.value) || 0 } }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" data-testid="insurance-price-input" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                              <select value={insuranceModal.data?.currency || 'AED'} onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, currency: e.target.value } }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm" data-testid="insurance-currency-select">
                                <option value="AED">AED</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="INR">INR</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Min Coverage ($)</label>
                              <input type="number" value={insuranceModal.data?.min_coverage || ''} onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, min_coverage: parseInt(e.target.value) || 0 } }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" data-testid="insurance-coverage-input" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Max Age</label>
                              <input type="number" value={insuranceModal.data?.max_age || ''} onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, max_age: parseInt(e.target.value) || 0 } }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" data-testid="insurance-age-input" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea value={insuranceModal.data?.description || ''} onChange={e => setInsuranceModal(prev => ({ ...prev, data: { ...prev.data, description: e.target.value } }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm h-20 resize-none" placeholder="Insurance description..." data-testid="insurance-description-input" />
                          </div>
                          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                            <button onClick={() => setInsuranceModal({ open: false, data: null, isNew: false })} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 text-sm hover:bg-gray-50">Cancel</button>
                            <button
                              onClick={async () => {
                                setInsuranceSaving(true);
                                try {
                                  if (insuranceModal.isNew) {
                                    const res = await api.post('/settings/insurance', insuranceModal.data);
                                    setInsurancePrices(prev => [...prev, res.data].sort((a, b) => a.country === 'Default' ? -1 : b.country === 'Default' ? 1 : a.country.localeCompare(b.country)));
                                  } else {
                                    const res = await api.put(`/settings/insurance/${insuranceModal.data.id}`, insuranceModal.data);
                                    setInsurancePrices(prev => prev.map(p => p.id === res.data.id ? res.data : p));
                                  }
                                  setInsuranceModal({ open: false, data: null, isNew: false });
                                } catch (err) {
                                  alert('Failed to save: ' + (err.response?.data?.detail || err.message));
                                } finally {
                                  setInsuranceSaving(false);
                                }
                              }}
                              disabled={insuranceSaving || (insuranceModal.isNew && !insuranceModal.data?.country)}
                              className="px-5 py-2 bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d] transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                              data-testid="insurance-save-btn"
                            >
                              <Save size={15} />
                              {insuranceSaving ? 'Saving...' : insuranceModal.isNew ? 'Add Price' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {activeTab === 'staff' && (
              <StaffExpertsTab searchTerm={searchTerm} />
            )}

            {activeTab === 'wallets' && (
              <AdminWalletTab />
            )}

            {activeTab === 'bookings' && (
              <AdminBookingsTab />
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {hotelEditModal.open && (
          <HotelEditForm
            hotel={hotelEditModal.hotel}
            isNew={hotelEditModal.isNew}
            cities={cities}
            onClose={() => setHotelEditModal({ open: false, hotel: null, isNew: false })}
            onSave={async (hotelData) => {
              try {
                if (hotelEditModal.isNew) {
                  const res = await api.post('/hotels', hotelData);
                  setHotels([...hotels, { id: res.data.id, ...hotelData }]);
                } else {
                  await api.put(`/hotels/${hotelEditModal.hotel.id}`, hotelData);
                  setHotels(hotels.map(h => h.id === hotelEditModal.hotel.id ? { ...h, ...hotelData } : h));
                }
                setHotelEditModal({ open: false, hotel: null, isNew: false });
              } catch (error) {
                console.error('Error saving hotel:', error);
                throw error;
              }
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Activity Edit Form Modal */}
      <AnimatePresence>
        {activityEditModal.open && (
          <ActivityEditForm
            activity={activityEditModal.activity}
            isNew={activityEditModal.isNew}
            cities={cities}
            onClose={() => setActivityEditModal({ open: false, activity: null, isNew: false })}
            onSave={async (activityData) => {
              try {
                if (activityEditModal.isNew) {
                  const res = await api.post('/activities', activityData);
                  setActivities([...activities, { id: res.data.id, ...activityData }]);
                } else {
                  await api.put(`/activities/${activityEditModal.activity.id}`, activityData);
                  setActivities(activities.map(a => a.id === activityEditModal.activity.id ? { ...a, ...activityData } : a));
                }
                setActivityEditModal({ open: false, activity: null, isNew: false });
              } catch (error) {
                console.error('Error saving activity:', error);
                throw error;
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Transfer Edit Form Modal */}
      <AnimatePresence>
        {transferEditModal.open && (
          <TransferEditForm
            transfer={transferEditModal.transfer}
            isNew={transferEditModal.isNew}
            cities={cities}
            onClose={() => setTransferEditModal({ open: false, transfer: null, isNew: false })}
            onSave={async (transferData) => {
              try {
                if (transferEditModal.isNew) {
                  const res = await api.post('/transfers', transferData);
                  setTransfers([...transfers, { id: res.data.id, ...transferData }]);
                } else {
                  await api.put(`/transfers/${transferEditModal.transfer.id}`, transferData);
                  setTransfers(transfers.map(t => t.id === transferEditModal.transfer.id ? { ...t, ...transferData } : t));
                }
                setTransferEditModal({ open: false, transfer: null, isNew: false });
              } catch (error) {
                console.error('Error saving transfer:', error);
                throw error;
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/App';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  CheckCircle, XCircle, Clock, Eye, X, Upload, FileText, Search, ChevronDown
} from 'lucide-react';

export default function StaffDashboard({ onBack }) {
  const [activeTab, setActiveTab] = useState('wallets');
  const [wallets, setWallets] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [topupModal, setTopupModal] = useState({ open: false, wallet: null });
  const [txnModal, setTxnModal] = useState({ open: false, userId: null, userName: '', txns: [] });
  const [showStmtUpload, setShowStmtUpload] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, pRes, sRes] = await Promise.all([
        api.get('/wallets/all'),
        api.get('/wallets/payment-proofs/all'),
        api.get('/wallets/statements'),
      ]);
      setWallets(wRes.data);
      setProofs(pRes.data);
      setStatements(sRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' });
  };

  const handleTopup = async (userId, amount, note) => {
    try {
      await api.post('/wallets/topup', { user_id: userId, amount: parseFloat(amount), note });
      setTopupModal({ open: false, wallet: null });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleRefund = async (userId, amount, note) => {
    try {
      await api.post('/wallets/refund', { user_id: userId, amount: parseFloat(amount), note });
      setTopupModal({ open: false, wallet: null });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleReview = async (proofId, action) => {
    try {
      await api.post(`/wallets/payment-proofs/${proofId}/review`, { action });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const viewTransactions = async (userId, userName) => {
    try {
      const res = await api.get(`/wallets/transactions/${userId}`);
      setTxnModal({ open: true, userId, userName, txns: res.data });
    } catch (e) { console.error(e); }
  };

  const filteredWallets = wallets.filter(w => {
    const name = w.user?.name || w.user?.company_name || '';
    return !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const pendingProofs = proofs.filter(p => p.status === 'pending');
  const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

  const resolveUrl = (url) => `${api.defaults.baseURL.replace('/api', '')}${url}`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="staff-dashboard">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage agent wallets and payment approvals</p>
        </div>
        <button onClick={onBack} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Back</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#002B5B] rounded-xl p-5 text-white">
          <p className="text-xs opacity-70 uppercase tracking-wider">Total Balance (All Agents)</p>
          <p className="text-2xl font-bold mt-1">AED {totalBalance.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Active Wallets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{wallets.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Pending Approvals</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingProofs.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Statements</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{statements.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'wallets', label: 'Agent Wallets' },
            { id: 'proofs', label: `Payment Proofs ${pendingProofs.length > 0 ? `(${pendingProofs.length})` : ''}` },
            { id: 'statements', label: 'Statements' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              data-testid={`staff-tab-${tab.id}`}
            >{tab.label}</button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={fetchData} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-3 border-[#002B5B] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Wallets Tab */}
          {activeTab === 'wallets' && (
            <div>
              <div className="mb-4 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search agents..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm" data-testid="staff-search-agents" />
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Agent</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Email</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Balance (AED)</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWallets.map(w => (
                      <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">{w.user?.name || w.user?.company_name || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{w.user?.email || '—'}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">AED {Number(w.balance || 0).toLocaleString()}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setTopupModal({ open: true, wallet: w })} className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700" data-testid={`topup-btn-${w.user_id}`}>Top Up</button>
                            <button onClick={() => viewTransactions(w.user_id, w.user?.name || '—')} className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100" data-testid={`view-txns-${w.user_id}`}>History</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredWallets.length === 0 && <p className="text-center py-8 text-gray-400">No wallets found</p>}
              </div>
            </div>
          )}

          {/* Payment Proofs Tab */}
          {activeTab === 'proofs' && (
            <div className="space-y-3">
              {proofs.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white border rounded-xl"><FileText size={40} className="mx-auto mb-3 opacity-50" /><p>No payment proofs</p></div>
              ) : (
                proofs.map(proof => (
                  <div key={proof.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between" data-testid={`staff-proof-${proof.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{proof.user_name || '—'} — AED {Number(proof.amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{proof.reference ? `Ref: ${proof.reference}` : proof.note || proof.file_name}</p>
                        <p className="text-xs text-gray-400">{formatDate(proof.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        proof.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        proof.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>{proof.status}</span>
                      <a href={resolveUrl(proof.file_url)} target="_blank" rel="noreferrer" className="p-2 hover:bg-gray-100 rounded-lg"><Eye size={16} className="text-gray-400" /></a>
                      {proof.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleReview(proof.id, 'approve')} className="p-2 bg-green-50 hover:bg-green-100 rounded-lg" data-testid={`approve-proof-${proof.id}`}><CheckCircle size={16} className="text-green-600" /></button>
                          <button onClick={() => handleReview(proof.id, 'reject')} className="p-2 bg-red-50 hover:bg-red-100 rounded-lg" data-testid={`reject-proof-${proof.id}`}><XCircle size={16} className="text-red-500" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Statements Tab */}
          {activeTab === 'statements' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowStmtUpload(true)} className="px-4 py-2 text-sm bg-[#002B5B] text-white rounded-lg hover:bg-[#003d82] flex items-center gap-2" data-testid="upload-statement-btn">
                  <Upload size={14} /> Upload Statement
                </button>
              </div>
              {statements.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white border rounded-xl"><FileText size={40} className="mx-auto mb-3 opacity-50" /><p>No statements uploaded</p></div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">File</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">Note</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">Uploaded By</th>
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                        <th className="text-right px-5 py-3 font-semibold text-gray-600">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statements.map(s => (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-800">{s.file_name}</td>
                          <td className="px-5 py-3 text-gray-500">{s.note || '—'}</td>
                          <td className="px-5 py-3 text-gray-500">{s.uploaded_by_name || '—'}</td>
                          <td className="px-5 py-3 text-gray-500">{formatDate(s.created_at)}</td>
                          <td className="px-5 py-3 text-right">
                            <a href={resolveUrl(s.file_url)} target="_blank" rel="noreferrer" className="text-[#002B5B] hover:underline text-xs font-medium">Download</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Top Up / Refund Modal */}
      <AnimatePresence>
        {topupModal.open && <TopupModal wallet={topupModal.wallet} onClose={() => setTopupModal({ open: false, wallet: null })} onTopup={handleTopup} onRefund={handleRefund} />}
        {txnModal.open && <TransactionHistoryModal data={txnModal} onClose={() => setTxnModal({ open: false, userId: null, userName: '', txns: [] })} />}
        {showStmtUpload && <StatementUploadModal onClose={() => setShowStmtUpload(false)} onSuccess={() => { setShowStmtUpload(false); fetchData(); }} />}
      </AnimatePresence>
    </div>
  );
}

function TopupModal({ wallet, onClose, onTopup, onRefund }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [action, setAction] = useState('topup');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()} data-testid="topup-modal">
        <div className="px-5 py-4 border-b"><h3 className="font-bold text-gray-800">{wallet?.user?.name || 'Agent'}</h3><p className="text-xs text-gray-500">Current balance: AED {Number(wallet?.balance || 0).toLocaleString()}</p></div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setAction('topup')} className={`flex-1 py-2 text-sm rounded-lg font-medium ${action === 'topup' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Top Up</button>
            <button onClick={() => setAction('refund')} className={`flex-1 py-2 text-sm rounded-lg font-medium ${action === 'refund' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Refund</button>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600">Amount (AED)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0.00" data-testid="topup-amount" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600">Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Reason" data-testid="topup-note" />
          </div>
        </div>
        <div className="px-5 py-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={() => action === 'topup' ? onTopup(wallet.user_id, amount, note) : onRefund(wallet.user_id, amount, note)} disabled={!amount || parseFloat(amount) <= 0}
            className={`px-5 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${action === 'topup' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`} data-testid="topup-submit">
            {action === 'topup' ? 'Credit Wallet' : 'Process Refund'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TransactionHistoryModal({ data, onClose }) {
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' }) : '—';
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()} data-testid="txn-history-modal">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div><h3 className="font-bold text-gray-800">Transaction History</h3><p className="text-xs text-gray-500">{data.userName}</p></div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3">
          {data.txns.length === 0 ? <p className="text-center py-8 text-gray-400">No transactions</p> : (
            <div className="space-y-2">
              {data.txns.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm text-gray-700">{t.note}</p>
                    <p className="text-xs text-gray-400">{formatDate(t.created_at)}</p>
                  </div>
                  <span className={`font-bold text-sm ${t.amount >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {t.amount >= 0 ? '+' : ''}AED {Number(t.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t"><button onClick={onClose} className="w-full py-2 text-sm border rounded-lg hover:bg-gray-50">Close</button></div>
      </motion.div>
    </motion.div>
  );
}

function StatementUploadModal({ onClose, onSuccess }) {
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('note', note);
      fd.append('file', file);
      await api.post('/wallets/statements/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSuccess();
    } catch (e) { console.error(e); }
    setUploading(false);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()} data-testid="stmt-upload-modal">
        <div className="px-5 py-4 border-b"><h3 className="font-bold text-gray-800">Upload Bank Statement</h3></div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600">Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. March 2026 reconciliation" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600">File *</label>
            <label className="mt-1 flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
              <Upload size={18} />{file ? file.name : 'Choose PDF/CSV...'}
              <input type="file" accept=".pdf,.csv,.xlsx" className="hidden" onChange={e => setFile(e.target.files[0])} />
            </label>
          </div>
        </div>
        <div className="px-5 py-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleUpload} disabled={uploading || !file} className="px-5 py-2 text-sm bg-[#002B5B] text-white rounded-lg disabled:opacity-50" data-testid="stmt-upload-submit">
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

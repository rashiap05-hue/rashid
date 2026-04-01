import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/App';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw, Upload, Download,
  Clock, CheckCircle, XCircle, X, FileText, Eye
} from 'lucide-react';

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, tRes, pRes] = await Promise.all([
        api.get('/wallets/my'),
        api.get('/wallets/transactions'),
        api.get('/wallets/payment-proofs/my'),
      ]);
      setWallet(wRes.data);
      setTransactions(tRes.data);
      setProofs(pRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' });
  };
  const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Dubai' });
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const totalCredits = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalDebits = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const downloadStatement = () => {
    let csv = 'Date,Time,Type,Amount (AED),Note,Performed By\n';
    transactions.forEach(t => {
      csv += `"${formatDate(t.created_at)}","${formatTime(t.created_at)}","${t.type}","${t.amount}","${(t.note || '').replace(/"/g, '""')}","${t.performed_by_name || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet_statement_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-[#002B5B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8" data-testid="wallet-page">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[#002B5B] to-[#004a8f] rounded-xl p-6 text-white shadow-lg" data-testid="wallet-balance-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={20} className="opacity-80" />
            <span className="text-sm opacity-80">Available Balance</span>
          </div>
          <p className="text-3xl font-bold">AED {Number(wallet?.balance || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle size={20} className="text-green-600" />
            <span className="text-sm text-gray-500">Total Credits</span>
          </div>
          <p className="text-2xl font-bold text-green-700">AED {totalCredits.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle size={20} className="text-red-500" />
            <span className="text-sm text-gray-500">Total Debits</span>
          </div>
          <p className="text-2xl font-bold text-red-600">AED {totalDebits.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[{ id: 'transactions', label: 'Transactions' }, { id: 'proofs', label: 'Payment Proofs' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              data-testid={`wallet-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {activeTab === 'transactions' && (
            <button onClick={downloadStatement} className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2" data-testid="download-statement-btn">
              <Download size={14} /> Download Statement
            </button>
          )}
          {activeTab === 'proofs' && (
            <button onClick={() => setShowUploadModal(true)} className="px-4 py-2 text-sm font-medium bg-[#002B5B] text-white rounded-lg hover:bg-[#003d82] flex items-center gap-2" data-testid="upload-proof-btn">
              <Upload size={14} /> Upload Payment Proof
            </button>
          )}
          <button onClick={fetchData} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50" data-testid="refresh-wallet-btn">
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Transaction List */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" data-testid="transactions-list">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Wallet size={40} className="mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Note</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Amount (AED)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => (
                  <tr key={txn.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-600">
                      {formatDate(txn.created_at)} <span className="text-gray-400 text-xs">{formatTime(txn.created_at)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                        txn.type === 'credit' ? 'bg-green-100 text-green-800' :
                        txn.type === 'refund' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {txn.type === 'credit' ? <ArrowUpCircle size={12} /> : txn.type === 'refund' ? <RefreshCw size={12} /> : <ArrowDownCircle size={12} />}
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{txn.note}</td>
                    <td className={`px-5 py-3 text-right font-bold ${txn.amount >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {txn.amount >= 0 ? '+' : ''}{Number(txn.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payment Proofs */}
      {activeTab === 'proofs' && (
        <div className="space-y-3" data-testid="proofs-list">
          {proofs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl">
              <FileText size={40} className="mx-auto mb-3 opacity-50" />
              <p>No payment proofs uploaded</p>
            </div>
          ) : (
            proofs.map(proof => (
              <div key={proof.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between" data-testid={`proof-card-${proof.id}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">AED {Number(proof.amount).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{proof.reference ? `Ref: ${proof.reference}` : proof.note || proof.file_name}</p>
                    <p className="text-xs text-gray-400">{formatDate(proof.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadge(proof.status)}`}>
                    {proof.status === 'pending' && <Clock size={11} className="inline mr-1" />}
                    {proof.status === 'approved' && <CheckCircle size={11} className="inline mr-1" />}
                    {proof.status === 'rejected' && <XCircle size={11} className="inline mr-1" />}
                    {proof.status}
                  </span>
                  <a href={`${api.defaults.baseURL.replace('/api', '')}${proof.file_url}`} target="_blank" rel="noreferrer" className="p-2 hover:bg-gray-100 rounded-lg">
                    <Eye size={16} className="text-gray-400" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upload Payment Proof Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadProofModal onClose={() => setShowUploadModal(false)} onSuccess={() => { setShowUploadModal(false); fetchData(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadProofModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !amount) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('amount', amount);
      fd.append('reference', reference);
      fd.append('note', note);
      fd.append('file', file);
      await api.post('/wallets/payment-proof', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSuccess();
    } catch (e) { console.error(e); }
    setUploading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()} data-testid="upload-proof-modal">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">Upload Payment Proof</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Amount (AED) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="0.00" data-testid="proof-amount-input" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Reference Number</label>
            <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="Bank reference / UTR" data-testid="proof-reference-input" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" placeholder="Optional note" data-testid="proof-note-input" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Receipt / Screenshot *</label>
            <label className="mt-1 flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
              <Upload size={18} />
              {file ? file.name : 'Choose file...'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFile(e.target.files[0])} data-testid="proof-file-input" />
            </label>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleUpload} disabled={uploading || !amount || !file} className="px-5 py-2 text-sm bg-[#002B5B] text-white rounded-lg hover:bg-[#003d82] disabled:opacity-50" data-testid="submit-proof-btn">
            {uploading ? 'Uploading...' : 'Submit Proof'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

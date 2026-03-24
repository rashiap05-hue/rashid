import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Save, RotateCcw, X, Loader2, Clock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { api } from '@/App';

export default function VersionHistoryPanel({ proposalId, onRestoreAsNew }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [versionNote, setVersionNote] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  const fetchVersions = useCallback(async () => {
    if (!proposalId) return;
    setLoading(true);
    try {
      const res = await api.get(`/proposals/${proposalId}/versions`);
      setVersions(res.data?.versions || []);
    } catch (err) {
      console.error('Error fetching versions:', err);
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    if (proposalId) fetchVersions();
  }, [proposalId, fetchVersions]);

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      await api.post(`/proposals/${proposalId}/versions`, {
        version_note: versionNote.trim() || ''
      });
      setVersionNote('');
      setShowNoteInput(false);
      await fetchVersions();
      setExpanded(true);
    } catch (err) {
      alert('Failed to save version: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (versionId) => {
    if (!window.confirm('This will create a new proposal from this version. Continue?')) return;
    setRestoringId(versionId);
    try {
      const res = await api.post(`/proposals/${proposalId}/versions/${versionId}/restore`);
      if (res.data?.success && onRestoreAsNew) {
        onRestoreAsNew(res.data.new_proposal_id, res.data.proposal);
      }
    } catch (err) {
      alert('Failed to restore version: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const getVersionSummary = (snapshot) => {
    if (!snapshot) return '';
    const parts = [];
    const hotels = snapshot.selected_hotels ? Object.keys(snapshot.selected_hotels).length : 0;
    if (hotels > 0) parts.push(`${hotels} hotel${hotels > 1 ? 's' : ''}`);
    const activities = snapshot.selected_activities
      ? Object.values(snapshot.selected_activities).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
      : 0;
    if (activities > 0) parts.push(`${activities} activit${activities > 1 ? 'ies' : 'y'}`);
    if (snapshot.total_price) parts.push(`AED ${snapshot.total_price.toLocaleString()}`);
    return parts.join(' · ') || 'Empty proposal';
  };

  if (!proposalId) return null;

  return (
    <div className="border-t pt-4 mt-4" data-testid="version-history-panel">
      {/* Save Version Button */}
      <div className="space-y-2">
        {!showNoteInput ? (
          <button
            onClick={() => setShowNoteInput(true)}
            disabled={saving}
            className="w-full bg-indigo-50 text-indigo-700 py-2.5 rounded-xl font-medium hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 text-sm border border-indigo-200"
            data-testid="save-version-trigger-btn"
          >
            <History size={16} />
            Save as Version
          </button>
        ) : (
          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-700">
              <MessageSquare size={12} />
              Version note (optional)
            </div>
            <input
              type="text"
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              placeholder="e.g. Updated hotel per client request"
              className="w-full px-3 py-1.5 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              data-testid="version-note-input"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveVersion()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveVersion}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                data-testid="save-version-confirm-btn"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Version
              </button>
              <button
                onClick={() => { setShowNoteInput(false); setVersionNote(''); }}
                className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Version History List */}
      {versions.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-600 hover:text-gray-800 py-1.5"
            data-testid="toggle-version-history"
          >
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              Version History ({versions.length})
            </span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 mt-2 max-h-64 overflow-y-auto pr-1">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
                      data-testid={`version-item-${v.version_number}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                              v{v.version_number}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(v.created_at)}
                            </span>
                          </div>
                          {v.version_note && (
                            <p className="text-xs text-gray-600 mt-1 italic truncate">
                              "{v.version_note}"
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1 truncate">
                            {getVersionSummary(v.snapshot)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestore(v.id)}
                        disabled={restoringId === v.id}
                        className="mt-2 w-full text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                        data-testid={`restore-version-${v.version_number}`}
                      >
                        {restoringId === v.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RotateCcw size={12} />
                        )}
                        Restore as New Proposal
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {loading && versions.length === 0 && (
        <div className="flex items-center justify-center py-3 text-gray-400 text-xs">
          <Loader2 size={14} className="animate-spin mr-2" />
          Loading versions...
        </div>
      )}
    </div>
  );
}

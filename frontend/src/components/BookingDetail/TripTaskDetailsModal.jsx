import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Send, MessageCircle, ChevronDown } from 'lucide-react';
import { api } from '@/App';

const STATUS_META = {
  open:           { label: 'Open',          bg: 'bg-amber-500',  text: 'text-white' },
  under_process:  { label: 'Under Process', bg: 'bg-orange-500', text: 'text-white' },
  closed:         { label: 'Closed',        bg: 'bg-emerald-500',text: 'text-white' },
  rejected:       { label: 'Rejected',      bg: 'bg-red-500',    text: 'text-white' },
};

export const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.open;
  return (
    <span className={`inline-flex items-center justify-center px-3 py-1 text-[11px] font-bold rounded ${meta.bg} ${meta.text}`} data-testid={`task-status-${status}`}>
      {meta.label}
    </span>
  );
};

const formatRelative = (iso) => {
  if (!iso) return '';
  const dt = new Date(iso);
  const diff = (Date.now() - dt.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function TripTaskDetailsModal({ open, onClose, request, currentUser, onUpdated }) {
  const [task, setTask] = useState(request);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => { setTask(request); }, [request]);

  const refresh = useCallback(async () => {
    if (!request?.id) return;
    try {
      const res = await api.get(`/change-requests/${request.id}`);
      setTask(res.data?.change_request);
    } catch (e) { /* noop */ }
  }, [request?.id]);

  if (!open || !task) return null;

  const handleClose = () => {
    if (sending || statusUpdating) return;
    setReply('');
    setError('');
    setShowStatusMenu(false);
    onClose?.();
  };

  const handleSendReply = async () => {
    setError('');
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/change-requests/${task.id}/replies`, { text: reply.trim() });
      setTask(res.data?.change_request);
      setReply('');
      onUpdated?.(res.data?.change_request);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setShowStatusMenu(false);
    if (newStatus === task.status) return;
    setStatusUpdating(true);
    setError('');
    try {
      const res = await api.patch(`/change-requests/${task.id}`, { status: newStatus });
      setTask(res.data?.change_request);
      onUpdated?.(res.data?.change_request);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const replies = task.replies || [];
  const myUserId = currentUser?.id;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-6 overflow-y-auto"
        data-testid="trip-task-details-modal"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
            data-testid="task-details-close"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Trip Special Request</p>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{task.type}</h2>
                <p className="text-sm text-gray-500 mt-0.5">For: {task.for_scope}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu(v => !v)}
                    disabled={statusUpdating}
                    className="flex items-center gap-1.5 disabled:opacity-50"
                    data-testid="task-status-trigger"
                  >
                    <StatusBadge status={task.status} />
                    <ChevronDown size={14} className="text-gray-500" />
                  </button>
                  {showStatusMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden" data-testid="task-status-menu">
                      {Object.entries(STATUS_META).map(([key, meta]) => (
                        <button
                          key={key}
                          onClick={() => handleStatusChange(key)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${task.status === key ? 'bg-gray-50 font-bold' : ''}`}
                          data-testid={`task-status-option-${key}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${meta.bg}`} />
                          {meta.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {/* Original request */}
            <div className="mb-5">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Original Request</p>
                <p className="text-[11px] text-gray-400">{formatRelative(task.created_at)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-1">{task.requested_by_name} <span className="font-normal text-gray-400">· {task.requested_by_role || 'agent'}</span></p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
              </div>
            </div>

            {/* Replies */}
            <div className="space-y-3" data-testid="task-replies">
              {replies.map((r, idx) => {
                const mine = myUserId && r.sender_id === myUserId;
                return (
                  <div key={r.id || idx} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-3 ${mine ? 'bg-[#002B5B] text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-[11px] font-bold ${mine ? 'text-white/80' : 'text-gray-700'}`}>
                          {r.sender_name || r.sender_email}
                        </p>
                        <span className={`text-[10px] uppercase font-medium ${mine ? 'text-white/60' : 'text-gray-400'}`}>{r.sender_role || ''}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.text}</p>
                      <p className={`text-[10px] mt-1.5 ${mine ? 'text-white/60' : 'text-gray-400'}`}>{formatRelative(r.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              {replies.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-400 flex flex-col items-center gap-2">
                  <MessageCircle size={20} className="text-gray-300" />
                  No replies yet — be the first to respond
                </div>
              )}
            </div>
          </div>

          {/* Reply composer */}
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl">
            {error && <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">{error}</div>}
            <div className="flex gap-2 items-end">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Type your reply..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#002B5B] focus:border-transparent resize-none"
                data-testid="task-reply-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <button
                onClick={handleSendReply}
                disabled={sending || !reply.trim()}
                className="px-4 py-2 bg-[#002B5B] hover:bg-[#001f44] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-md transition-colors flex items-center gap-1.5"
                data-testid="task-reply-send-btn"
              >
                {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Send
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Tip: Press ⌘/Ctrl + Enter to send</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

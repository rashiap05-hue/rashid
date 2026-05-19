import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, CheckCircle, XCircle, Loader2, Send, MessageCircle, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const TASK_STATUS_META = {
  open: { label: 'Open', cls: 'bg-amber-500 text-white' },
  under_process: { label: 'Under Process', cls: 'bg-orange-500 text-white' },
  closed: { label: 'Closed', cls: 'bg-emerald-500 text-white' },
  rejected: { label: 'Rejected', cls: 'bg-red-500 text-white' },
};

const formatRelative = (iso) => {
  if (!iso) return '';
  const dt = new Date(iso);
  const diff = (Date.now() - dt.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Generic Service View modal used by Hotels / Transfers / Activities / Flights tabs.
 *
 * Props:
 *  - kind: 'hotel' | 'transfer' | 'activity' | 'flight' (label / copy)
 *  - icon: Lucide icon component
 *  - iconClassName: tailwind classes for the icon container
 *  - title: bold service title (e.g. hotel name, activity name)
 *  - titleExtra: optional ReactNode rendered next to title (e.g. star rating)
 *  - subtitle: small line under title
 *  - detailsGrid: array of {label, value} objects rendered as a responsive grid
 *  - booking: full supplier booking object
 *  - row: the extracted service row (carries service_type, service_key, status, confirmation)
 */
export default function ServiceViewModal({
  open,
  onClose,
  booking,
  row,
  currentUser,
  onUpdated,
  kind = 'service',
  icon: Icon,
  iconClassName = 'bg-gray-50 text-gray-700',
  title,
  titleExtra = null,
  subtitle,
  detailsGrid = [],
  guestsFallback = '',
  testIdPrefix = 'service-view',
}) {
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmNumber, setConfirmNumber] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionMode, setActionMode] = useState(null); // 'confirm' | 'reject' | null

  const fetchTasks = useCallback(async () => {
    if (!booking?.id) return;
    try {
      const res = await api.get(`/bookings/${booking.id}/change-requests`);
      setTasks(res.data?.change_requests || []);
    } catch (e) {
      console.warn('[ServiceViewModal] fetchTasks failed:', e?.response?.data || e?.message || e);
    }
  }, [booking?.id]);

  useEffect(() => {
    if (open) {
      setActionMode(null);
      setActionError('');
      // Prefer the per-service confirmation number, then fall back to booking-level
      const sc = booking?.service_confirmations?.[`${row?.service_type}:${row?.service_key}`] || {};
      setConfirmNumber(
        (row?.confirmation && row.confirmation !== 'Pending' ? row.confirmation : '')
        || sc.confirmation_number
        || booking?.supplier_confirmation_number
        || ''
      );
      setActionNote(sc.op_note || '');
      setDriverName(sc.driver_name || '');
      setDriverPhone(sc.driver_phone || '');
      setVehiclePlate(sc.vehicle_plate || '');
      setPickupTime(sc.pickup_time || '');
      setRejectReason('');
      setActiveTask(null);
      fetchTasks();
    }
  }, [open, booking, row, fetchTasks]);

  if (!open || !booking) return null;

  // Per-service status (falls back to booking-level if extractor didn't provide it)
  const status = row?.status || booking.supplier_status || 'pending';
  const isPending = status === 'pending' || !status;

  const handleConfirm = async () => {
    setActionError('');
    if (!confirmNumber.trim()) {
      setActionError('Confirmation number is required to confirm.');
      return;
    }
    if (!row?.service_type || !row?.service_key) {
      setActionError('Internal error: missing service identifiers.');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/operational/service-confirm', {
        booking_id: booking.id,
        service_type: row.service_type,
        service_key: row.service_key,
        confirmation_number: confirmNumber.trim(),
        note: actionNote.trim(),
        driver_name: driverName.trim(),
        driver_phone: driverPhone.trim(),
        vehicle_plate: vehiclePlate.trim(),
        pickup_time: pickupTime.trim(),
      });
      onUpdated?.();
      onClose?.();
    } catch (e) {
      setActionError(e?.response?.data?.detail || 'Failed to confirm');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionError('');
    if (!rejectReason.trim()) {
      setActionError('Reason is required to reject.');
      return;
    }
    if (!row?.service_type || !row?.service_key) {
      setActionError('Internal error: missing service identifiers.');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/operational/service-reject', {
        booking_id: booking.id,
        service_type: row.service_type,
        service_key: row.service_key,
        reason: rejectReason.trim(),
      });
      onUpdated?.();
      onClose?.();
    } catch (e) {
      setActionError(e?.response?.data?.detail || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !activeTask?.id) return;
    setSending(true);
    try {
      const res = await api.post(`/change-requests/${activeTask.id}/replies`, { text: reply.trim() });
      const updated = res.data?.change_request;
      setActiveTask(updated);
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      setReply('');
    } catch (e) {
      console.warn('[ServiceViewModal] reply post failed:', e?.response?.data || e?.message || e);
    }
    setSending(false);
  };

  const handleTaskStatus = async (newStatus) => {
    if (!activeTask?.id) return;
    try {
      const res = await api.patch(`/change-requests/${activeTask.id}`, { status: newStatus });
      const updated = res.data?.change_request;
      setActiveTask(updated);
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (e) {
      console.warn('[ServiceViewModal] handleTaskStatus failed:', e?.response?.data || e?.message || e);
    }
  };

  const kindLabel = {
    hotel: 'Hotel Reservation',
    transfer: 'Transfer Booking',
    activity: 'Activity Booking',
    flight: 'Flight Reservation',
    service: 'Service Booking',
  }[kind] || 'Service Booking';

  const confirmCtaLabel = {
    hotel: 'Confirm Reservation',
    transfer: 'Confirm Transfer',
    activity: 'Confirm Activity',
    flight: 'Confirm Flight',
    service: 'Confirm',
  }[kind] || 'Confirm';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-3 py-6 overflow-y-auto"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        data-testid={`${testIdPrefix}-modal`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-start gap-3 min-w-0">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', iconClassName)}>
                {Icon && <Icon size={20} />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{kindLabel}</p>
                <h2 className="text-lg font-bold text-gray-900 leading-tight truncate flex items-center gap-2">
                  {title} {titleExtra}
                </h2>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap', STATUS_COLORS[status] || STATUS_COLORS.pending)} data-testid={`${testIdPrefix}-status`}>
                {status}
              </span>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500" data-testid={`${testIdPrefix}-close`} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-5 space-y-5">
            {/* Details grid */}
            {detailsGrid.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {detailsGrid.map((item, idx) => (
                  <div key={idx}>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      {item.icon && <item.icon size={11} />} {item.label}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 break-words">{item.value || '—'}</p>
                  </div>
                ))}
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Confirmation #</p>
                  <p className="text-sm font-semibold text-gray-900">{(row?.confirmation && row.confirmation !== 'Pending' ? row.confirmation : null) || booking.supplier_confirmation_number || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Booking Ref</p>
                  <p className="text-sm font-semibold text-gray-900">{booking.booking_ref || (booking.booking_number != null ? `TBM-${String(booking.booking_number).padStart(6, '0')}` : booking.id?.slice(0, 8))}</p>
                </div>
              </div>
            )}

            {/* Guests */}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Users size={11} /> Guests</p>
              <div className="flex flex-wrap gap-2">
                {(booking.travelers || []).length === 0 ? (
                  <span className="text-sm text-gray-700">{guestsFallback || booking.customer_name || '—'}</span>
                ) : (
                  (booking.travelers || []).map((t, i) => (
                    <div key={i} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                      {t.title} {t.firstName} {t.lastName}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Trip Change Requests */}
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <MessageCircle size={11} /> Trip Change Requests
                {tasks.length > 0 && <span className="text-gray-400">· {tasks.length}</span>}
              </p>
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No change requests for this booking</p>
              ) : !activeTask ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {tasks.map((t) => {
                    const meta = TASK_STATUS_META[t.status] || TASK_STATUS_META.open;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveTask(t)}
                        className="w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 flex items-center gap-3"
                        data-testid={`${testIdPrefix}-task-${t.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{t.type} · {t.for_scope}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>
                          <p className="text-[10px] text-blue-500 mt-1">{(t.replies?.length || 0)} replies · {formatRelative(t.created_at)}</p>
                        </div>
                        <span className={cn('px-2.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap', meta.cls)}>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <button onClick={() => setActiveTask(null)} className="text-xs text-[#0066CC] hover:underline" data-testid={`${testIdPrefix}-task-back`}>
                      ← Back to all requests
                    </button>
                    <select
                      value={activeTask.status}
                      onChange={(e) => handleTaskStatus(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                      data-testid={`${testIdPrefix}-task-status`}
                    >
                      {Object.entries(TASK_STATUS_META).map(([k, m]) => (
                        <option key={k} value={k}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="p-4 max-h-72 overflow-y-auto space-y-3">
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <p className="text-[11px] font-bold text-gray-700">{activeTask.requested_by_name} <span className="font-normal text-gray-400">· {activeTask.requested_by_role}</span> · {formatRelative(activeTask.created_at)}</p>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{activeTask.description}</p>
                    </div>
                    {(activeTask.replies || []).map((r) => {
                      const mine = r.sender_id === currentUser?.id;
                      return (
                        <div key={r.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-lg p-3 ${mine ? 'bg-[#002B5B] text-white' : 'bg-gray-100 text-gray-800'}`}>
                            <p className={`text-[10px] font-bold ${mine ? 'text-white/80' : 'text-gray-700'}`}>{r.sender_name} · {r.sender_role}</p>
                            <p className="text-sm mt-0.5 whitespace-pre-wrap">{r.text}</p>
                            <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-gray-400'}`}>{formatRelative(r.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-gray-200 px-3 py-2 flex gap-2 bg-gray-50">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type a reply..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      data-testid={`${testIdPrefix}-reply-input`}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                    />
                    <button
                      onClick={handleReply}
                      disabled={sending || !reply.trim()}
                      className="px-3 py-2 bg-[#002B5B] hover:bg-[#001f44] disabled:opacity-40 text-white rounded text-xs font-bold flex items-center gap-1"
                      data-testid={`${testIdPrefix}-reply-send`}
                    >
                      {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action footer */}
          {(isPending || currentUser?.role === 'admin') && actionMode === null && (
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-2 bg-gray-50 rounded-b-xl">
              <div className="text-[11px] text-gray-500">
                {!isPending && currentUser?.role === 'admin' && (
                  <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                    Admin override — you can change the status of an already {status} service.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setActionMode('reject'); setActionError(''); }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5"
                  data-testid={`${testIdPrefix}-reject-btn`}
                >
                  <XCircle size={14} /> {status === 'rejected' ? 'Update Reason' : 'Reject'}
                </button>
                <button
                  onClick={() => { setActionMode('confirm'); setActionError(''); }}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5"
                  data-testid={`${testIdPrefix}-confirm-btn`}
                >
                  <CheckCircle size={14} /> {status === 'confirmed' ? 'Update Confirmation' : 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {actionMode === 'confirm' && (
            <div className="border-t border-gray-100 px-6 py-4 bg-green-50 rounded-b-xl space-y-3">
              <p className="text-sm font-bold text-green-900">{confirmCtaLabel}</p>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirmation Number <span className="text-red-500">*</span></label>
                <input
                  value={confirmNumber}
                  onChange={(e) => setConfirmNumber(e.target.value)}
                  placeholder="e.g. PNR / supplier reference"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  data-testid={`${testIdPrefix}-confirm-number`}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Note (optional)</label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={2}
                  placeholder="Internal note for the agent..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  data-testid={`${testIdPrefix}-confirm-note`}
                />
              </div>

              {/* Driver / Vehicle / Pickup — shown for transfer + activity rows so the
                  Trip Itinerary page can display them as labeled fields. */}
              {(row?.service_type === 'transfer' || row?.service_type === 'activity') && (
                <div className="space-y-3 pt-3 border-t border-green-200/60">
                  <p className="text-[11px] font-bold text-green-900 uppercase tracking-wider">
                    {row?.service_type === 'transfer' ? 'Driver / Vehicle Details' : 'Guide / Driver Details'} <span className="font-normal lowercase text-green-700/80">(optional)</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Driver / Guide Name</label>
                      <input
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="e.g. Mr. Somchai Jaidee"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        data-testid={`${testIdPrefix}-driver-name`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Contact No</label>
                      <input
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="e.g. +66 81 234 5678"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        data-testid={`${testIdPrefix}-driver-phone`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">{row?.service_type === 'transfer' ? 'Vehicle Plate' : 'Vehicle / Plate'}</label>
                      <input
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        placeholder="e.g. 7กข-1234"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        data-testid={`${testIdPrefix}-vehicle-plate`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Pickup Time</label>
                      <input
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        placeholder="e.g. 13:30"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        data-testid={`${testIdPrefix}-pickup-time`}
                      />
                    </div>
                  </div>
                </div>
              )}
              {actionError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> {actionError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setActionMode(null)} disabled={actionLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button
                  onClick={handleConfirm}
                  disabled={actionLoading || !confirmNumber.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-sm font-bold flex items-center gap-1.5"
                  data-testid={`${testIdPrefix}-confirm-submit`}
                >
                  {actionLoading && <Loader2 size={12} className="animate-spin" />}
                  {confirmCtaLabel}
                </button>
              </div>
            </div>
          )}

          {actionMode === 'reject' && (
            <div className="border-t border-gray-100 px-6 py-4 bg-red-50 rounded-b-xl space-y-3">
              <p className="text-sm font-bold text-red-900">Reject {kindLabel.toLowerCase()}</p>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  data-testid={`${testIdPrefix}-reject-reason`}
                  autoFocus
                />
              </div>
              {actionError && (
                <div className="px-3 py-2 bg-red-100 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> {actionError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setActionMode(null)} disabled={actionLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-sm font-bold flex items-center gap-1.5"
                  data-testid={`${testIdPrefix}-reject-submit`}
                >
                  {actionLoading && <Loader2 size={12} className="animate-spin" />}
                  Reject
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

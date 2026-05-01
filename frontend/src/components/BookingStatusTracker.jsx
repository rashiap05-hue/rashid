import React from 'react';
import { Check, Clock, CreditCard, CircleDollarSign, ShieldCheck, Ticket, Plane } from 'lucide-react';

const STAGES = [
  { key: 'held', label: 'Hold', icon: Clock },
  { key: 'payment_pending', label: 'Payment Pending', icon: CreditCard },
  { key: 'payment_received', label: 'Payment Received', icon: CircleDollarSign },
  { key: 'confirmed', label: 'Confirmed', icon: ShieldCheck },
  { key: 'ticketed', label: 'Ticketed', icon: Ticket },
  { key: 'completed', label: 'Completed', icon: Plane },
];

function getStageIndex(status) {
  const idx = STAGES.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

function getTimestampForStage(stageKey, statusHistory) {
  if (!statusHistory || !statusHistory.length) return null;
  const entry = statusHistory.find(h => h.to_status === stageKey);
  return entry ? entry.timestamp : null;
}

function formatShortDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Asia/Dubai' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dubai' });
}

export function BookingStatusTrackerFull({ status, statusHistory, heldAt }) {
  const currentIdx = getStageIndex(status);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6" data-testid="booking-status-tracker-full">
      <h3 className="text-sm font-bold text-gray-700 mb-5 uppercase tracking-wider">Booking Progress</h3>
      <div className="flex items-start justify-between relative">
        {/* Connector line */}
        <div className="absolute top-5 left-[40px] right-[40px] h-0.5 bg-gray-200 z-0" />
        <div
          className="absolute top-5 left-[40px] h-0.5 bg-[#002B5B] z-0 transition-all duration-500"
          style={{ width: `${currentIdx > 0 ? (currentIdx / (STAGES.length - 1)) * (100 - (80 / (STAGES.length))) : 0}%` }}
        />

        {STAGES.map((stage, idx) => {
          const isComplete = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;
          const Icon = stage.icon;

          let ts = null;
          if (idx === 0 && heldAt) ts = heldAt;
          else ts = getTimestampForStage(stage.key, statusHistory);

          return (
            <div key={stage.key} className="flex flex-col items-center z-10 flex-1" data-testid={`stage-${stage.key}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                isComplete ? 'bg-[#002B5B] text-white' :
                isCurrent ? 'bg-[#002B5B] text-white ring-4 ring-[#002B5B]/20' :
                'bg-gray-100 text-gray-400 border-2 border-gray-200'
              }`}>
                {isComplete ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
              </div>
              <p className={`text-xs font-bold mt-2 text-center ${
                isComplete || isCurrent ? 'text-[#002B5B]' : 'text-gray-400'
              }`}>{stage.label}</p>
              {ts && (
                <p className="text-[10px] text-gray-400 mt-0.5 text-center">{formatShortDate(ts)}</p>
              )}
              {isCurrent && !isComplete && (
                <span className="mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">Current</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Status History Log */}
      {statusHistory && statusHistory.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Activity Log</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {[...statusHistory].reverse().map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" data-testid={`history-entry-${i}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#002B5B] mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-gray-600">
                    <span className="font-medium text-gray-800">{h.changed_by_name || h.changed_by}</span>
                    {' '}advanced to{' '}
                    <span className="font-bold text-[#002B5B]">{STAGES.find(s => s.key === h.to_status)?.label || h.to_status}</span>
                  </span>
                  {h.note && <span className="text-gray-400 ml-1">— {h.note}</span>}
                  <span className="text-gray-400 ml-2">{formatShortDate(h.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BookingStatusTrackerMini({ status }) {
  const currentIdx = getStageIndex(status);

  return (
    <div className="flex items-center gap-1" data-testid="booking-status-tracker-mini">
      {STAGES.map((stage, idx) => {
        const isComplete = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={stage.key} className="flex items-center gap-1" title={stage.label}>
            <div className={`w-2.5 h-2.5 rounded-full transition-all ${
              isComplete ? 'bg-[#002B5B]' :
              isCurrent ? 'bg-amber-500 ring-2 ring-amber-200' :
              'bg-gray-200'
            }`} />
            {idx < STAGES.length - 1 && (
              <div className={`w-3 h-0.5 ${isComplete ? 'bg-[#002B5B]' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { StatusBadge } from './TripTaskDetailsModal';

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

export default function TripTasksCard({ tasks = [], onOpenDetails }) {
  if (!tasks.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5" data-testid="trip-tasks-card">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Trip Tasks</p>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto] bg-gray-50 px-4 py-2 border-b border-gray-200">
          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Task</p>
          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Status</p>
        </div>

        {/* Task rows */}
        {tasks.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
            data-testid={`trip-task-row-${t.id}`}
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900">Trip Special Request</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5 truncate">{t.type} · {t.for_scope}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
              <p className="text-[10px] text-blue-500 mt-2 flex items-center gap-1">
                <MessageCircle size={10} />
                {(t.replies?.length || 0)} - {formatRelative(t.created_at)}
              </p>
            </div>
            <div className="flex flex-col items-end justify-between gap-2">
              <StatusBadge status={t.status} />
              <button
                onClick={() => onOpenDetails?.(t)}
                className="text-xs text-[#0066CC] hover:underline font-medium"
                data-testid={`trip-task-details-${t.id}`}
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

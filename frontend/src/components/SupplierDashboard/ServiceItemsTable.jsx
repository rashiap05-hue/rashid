import React from 'react';
import { Eye, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from './serviceExtractors';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const StatusPill = ({ status }) => (
  <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap', STATUS_COLORS[status] || STATUS_COLORS.pending)}>
    {status || 'pending'}
  </span>
);

export default function ServiceItemsTable({ rows, columns, emptyText, onView, testId }) {
  if (!rows.length) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200" data-testid={`${testId}-empty`}>
        <p className="text-gray-500 font-medium">{emptyText || 'No items found'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid={testId}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn('px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap', c.headerClassName)}>
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.booking_id}-${i}`} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors" data-testid={`${testId}-row-${i}`}>
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 text-gray-700', c.className)}>
                    {c.render ? c.render(r) : (r[c.key] ?? '—')}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => onView?.(r.booking_id)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1" data-testid={`${testId}-view-${i}`}>
                    <Eye size={12} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const StarRating = ({ rating }) => {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  if (!r) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${r} star`}>
      {Array.from({ length: r }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
    </span>
  );
};

export { formatDate };

import React, { useEffect, useState } from 'react';
import { X, Star, MapPin, Clock, Users, Languages, Info, Check, X as XIcon, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/App';

const _resolveImg = (src) =>
  !src ? '' : (src.startsWith('http') ? src : (process.env.REACT_APP_BACKEND_URL + src));

/* Modal that shows the complete details of a single activity, fetched on-demand
 * from `GET /api/activities/{id}`. Rendered into the existing day-card overlay
 * stack on the public Group Tour Detail page.
 */
export default function ActivityDetailModal({ activityId, fallback, onClose }) {
  const [act, setAct] = useState(fallback || null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    if (!activityId) return;
    let cancelled = false;
    setLoading(true);
    setErr('');
    api.get(`/activities/${activityId}`)
      .then(r => {
        if (cancelled) return;
        // The singular endpoint wraps the payload in `{ success, activity }`;
        // the list endpoint returns objects directly. Handle both shapes.
        const data = r.data?.activity || r.data;
        setAct(data);
        setHeroIdx(0);
      })
      .catch(e => { if (!cancelled) setErr(e?.response?.data?.detail || 'Failed to load activity'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activityId]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const images = (act?.images || []).filter(Boolean);
  const heroSrc = _resolveImg(images[heroIdx] || images[0] || fallback?.image || '');

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      data-testid="activity-detail-modal"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <Info size={16} className="text-emerald-600 flex-shrink-0" />
            <h3 className="font-bold text-gray-900 text-sm md:text-base truncate">
              {act?.name || fallback?.name || 'Activity Details'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
            data-testid="activity-detail-close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero image with gallery controls */}
          {heroSrc && (
            <div className="relative bg-gray-100">
              <img src={heroSrc} alt="" className="w-full h-64 md:h-80 object-cover" />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setHeroIdx(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow"
                    data-testid="activity-detail-prev"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroIdx(i => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow"
                    data-testid="activity-detail-next"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">
                    {heroIdx + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-1.5 p-2 bg-gray-50 overflow-x-auto">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setHeroIdx(i)}
                  className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 ${i === heroIdx ? 'border-emerald-500' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  data-testid={`activity-detail-thumb-${i}`}
                >
                  <img src={_resolveImg(src)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-5 space-y-4">
            {/* Loading / error state */}
            {loading && !act && (
              <div className="text-sm text-gray-500 text-center py-4">Loading details…</div>
            )}
            {err && !act && (
              <div className="text-sm text-red-600 text-center py-4">{err}</div>
            )}

            {/* Headline meta-row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              {(act?.city || fallback?.sub) && (
                <span className="inline-flex items-center gap-1 text-gray-700">
                  <MapPin size={13} className="text-emerald-600" />
                  <span className="font-semibold">
                    {[act?.city, act?.country].filter(Boolean).join(' · ') || fallback?.sub}
                  </span>
                </span>
              )}
              {act?.duration && (
                <span className="inline-flex items-center gap-1 text-gray-700">
                  <Clock size={13} className="text-amber-600" />
                  <span className="font-semibold">{act.duration}</span>
                </span>
              )}
              {act?.rating ? (
                <span className="inline-flex items-center gap-1 text-gray-700">
                  <Star size={13} className="text-yellow-500" fill="currentColor" />
                  <span className="font-semibold">{act.rating}</span>
                  {act.review_count ? <span className="text-gray-400">· {act.review_count} reviews</span> : null}
                </span>
              ) : null}
              {act?.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase">
                  {act.category}
                </span>
              )}
            </div>

            {/* Description */}
            {act?.description && (
              <p className="text-sm text-gray-700 leading-relaxed">{act.description}</p>
            )}

            {/* Highlights */}
            {Array.isArray(act?.highlights) && act.highlights.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Highlights</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  {act.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inclusions / Exclusions side-by-side on md+ */}
            {(act?.inclusions?.length > 0 || act?.exclusions?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {act?.inclusions?.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5">What's Included</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {act.inclusions.map((x, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {act?.exclusions?.length > 0 && (
                  <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-800 mb-1.5">Not Included</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {act.exclusions.map((x, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <XIcon size={13} className="text-rose-500 flex-shrink-0 mt-0.5" />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Operational meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm pt-1">
              {act?.meeting_point && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Meeting Point</div>
                  <div className="text-gray-700 flex items-center gap-1.5">
                    <MapPin size={12} className="text-gray-400" /> {act.meeting_point}
                  </div>
                </div>
              )}
              {Array.isArray(act?.languages) && act.languages.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Languages</div>
                  <div className="text-gray-700 flex items-center gap-1.5">
                    <Languages size={12} className="text-gray-400" /> {act.languages.join(', ')}
                  </div>
                </div>
              )}
              {(act?.min_participants || act?.max_participants) && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Group Size</div>
                  <div className="text-gray-700 flex items-center gap-1.5">
                    <Users size={12} className="text-gray-400" />
                    {[act?.min_participants, act?.max_participants].filter(Boolean).join(' – ')} people
                  </div>
                </div>
              )}
              {Array.isArray(act?.start_times) && act.start_times.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Start Times</div>
                  <div className="text-gray-700 flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" /> {act.start_times.join(', ')}
                  </div>
                </div>
              )}
              {act?.transfer_type && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Transfer Type</div>
                  <div className="text-gray-700 flex items-center gap-1.5">
                    <Globe size={12} className="text-gray-400" /> {act.transfer_type}
                  </div>
                </div>
              )}
              {act?.cancellation_policy && (
                <div className="sm:col-span-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cancellation Policy</div>
                  <div className="text-gray-700 text-xs">{act.cancellation_policy}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded"
            data-testid="activity-detail-close-footer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

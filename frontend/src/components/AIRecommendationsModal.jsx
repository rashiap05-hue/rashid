import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, MapPin, Calendar, Wallet, Users, Lightbulb } from 'lucide-react';
import { api } from '@/App';

export default function AIRecommendationsModal({ open, onClose, onUseDestination }) {
  const [preferences, setPreferences] = useState('');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('');
  const [travelers, setTravelers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const reset = () => {
    setPreferences('');
    setBudget('');
    setDuration('');
    setTravelers(2);
    setResults(null);
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    onClose?.();
    setTimeout(reset, 300);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!preferences.trim()) {
      setError('Please tell us a bit about what kind of trip you want.');
      return;
    }
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const res = await api.post('/ai/recommendations', {
        preferences: preferences.trim(),
        budget: budget || null,
        duration: duration || null,
        travelers: Number(travelers) || 2,
      });
      // Backend returns recommendations as a JSON-string from Gemini; parse it
      const raw = res.data?.recommendations;
      let parsed = null;
      if (typeof raw === 'string') {
        try {
          const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = { destinations: [], tips: [], _raw: raw };
        }
      } else if (raw && typeof raw === 'object') {
        parsed = raw;
      }
      setResults(parsed || { destinations: [], tips: [] });
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.detail || 'Failed to fetch recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={handleClose}
          data-testid="ai-recommendations-modal"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#002B5B] to-[#0066CC] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 p-2 rounded-lg"><Sparkles size={22} /></div>
                <div>
                  <h2 className="text-lg font-bold">AI Trip Recommendations</h2>
                  <p className="text-xs opacity-85">Tell us your style — we'll suggest destinations</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white"
                data-testid="ai-modal-close"
              >
                <X size={22} />
              </button>
            </div>

            {/* Form / Results */}
            <div className="flex-1 overflow-y-auto p-5">
              {!results ? (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">What kind of trip do you want?</label>
                    <textarea
                      data-testid="ai-pref-input"
                      value={preferences}
                      onChange={(e) => setPreferences(e.target.value)}
                      placeholder="e.g. A relaxed beach honeymoon with cultural day-trips, no extreme adventure, mid-range hotels"
                      className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none min-h-[90px]"
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5"><Wallet size={12} /> Budget</label>
                      <input
                        data-testid="ai-budget-input"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="e.g. AED 5000-8000"
                        className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5"><Calendar size={12} /> Duration</label>
                      <input
                        data-testid="ai-duration-input"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 5-7 days"
                        className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5"><Users size={12} /> Travelers</label>
                      <input
                        data-testid="ai-travelers-input"
                        type="number"
                        min={1}
                        value={travelers}
                        onChange={(e) => setTravelers(e.target.value)}
                        className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="ai-error">{error}</div>}

                  <button
                    type="submit"
                    disabled={loading}
                    data-testid="ai-submit-btn"
                    className="w-full bg-[#002B5B] hover:bg-[#003d82] disabled:bg-gray-400 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {loading ? 'Generating recommendations…' : 'Get AI Recommendations'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4" data-testid="ai-results">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#002B5B] uppercase tracking-wider">Suggested Destinations</h3>
                    <button
                      onClick={() => setResults(null)}
                      className="text-xs text-[#002B5B] hover:underline font-semibold"
                      data-testid="ai-back-btn"
                    >
                      ← Refine search
                    </button>
                  </div>

                  {results._raw && (
                    <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap max-h-80 overflow-y-auto">{results._raw}</pre>
                  )}

                  <div className="space-y-3">
                    {(results.destinations || []).map((d, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="border border-gray-200 rounded-lg p-4 hover:border-[#002B5B] transition-colors"
                        data-testid={`ai-destination-${i}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-[#002B5B] font-bold text-base">
                              <MapPin size={16} />{d.name}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{d.description}</p>
                          </div>
                          {onUseDestination && (
                            <button
                              onClick={() => onUseDestination(d)}
                              className="text-xs bg-[#002B5B] text-white px-3 py-1.5 rounded font-semibold hover:bg-[#003d82] whitespace-nowrap"
                              data-testid={`ai-use-${i}`}
                            >
                              Use this
                            </button>
                          )}
                        </div>
                        {d.highlights && d.highlights.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {d.highlights.map((h, hi) => (
                              <span key={hi} className="bg-blue-50 text-[#002B5B] text-xs px-2 py-0.5 rounded font-semibold">{h}</span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                          {d.best_time && <span><Calendar size={11} className="inline mr-1" />{d.best_time}</span>}
                          {d.estimated_budget && <span><Wallet size={11} className="inline mr-1" />{d.estimated_budget}</span>}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {results.tips && results.tips.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-1.5"><Lightbulb size={14} /> Travel Tips</h4>
                      <ul className="text-sm text-amber-900 space-y-1.5 list-disc pl-5">
                        {results.tips.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

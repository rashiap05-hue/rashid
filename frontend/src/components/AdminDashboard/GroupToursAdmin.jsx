import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Loader2 } from 'lucide-react';
import { api } from '@/App';

const BLANK_TIER = { supplier_cost: 0, display_price: 0 };

const EMPTY_PRICING = {
  single_sharing: { ...BLANK_TIER },
  twin_double:    { ...BLANK_TIER },
  triple:         { ...BLANK_TIER },
  child_no_bed:   { ...BLANK_TIER },
  infant:         { ...BLANK_TIER },
};

const EMPTY_PKG = {
  title: '', destination: '', subtitle: '', nights: 4,
  date_range: '', stars: 3, tax_pct: 5,
  pricing: EMPTY_PRICING,
  image: '',
  gradient: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
  active: true,
};

const TIER_ROWS = [
  { key: 'single_sharing', label: 'Cost per adult — Single sharing' },
  { key: 'twin_double',    label: 'Cost per adult — Twin / Double' },
  { key: 'triple',         label: 'Cost per adult — Triple' },
  { key: 'child_no_bed',   label: 'Cost per child — without bed (2-5 yrs)' },
  { key: 'infant',         label: 'Cost per infant — (0-2 yrs)' },
];

function PackageEditorModal({ open, pkg, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_PKG);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (pkg) {
      setForm({
        ...EMPTY_PKG,
        ...pkg,
        pricing: { ...EMPTY_PRICING, ...(pkg.pricing || {}) },
      });
    } else {
      setForm(EMPTY_PKG);
    }
    setErr('');
  }, [pkg, open]);

  if (!open) return null;

  const isEdit = Boolean(pkg?.id);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updateTier = (tierKey, field, val) => setForm(f => ({
    ...f,
    pricing: {
      ...f.pricing,
      [tierKey]: { ...(f.pricing?.[tierKey] || BLANK_TIER), [field]: val },
    },
  }));

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const cleanedTiers = {};
      TIER_ROWS.forEach(({ key }) => {
        const t = form.pricing?.[key] || BLANK_TIER;
        cleanedTiers[key] = {
          supplier_cost: Number(t.supplier_cost) || 0,
          display_price: Number(t.display_price) || 0,
        };
      });
      const payload = {
        title: form.title,
        destination: form.destination,
        subtitle: form.subtitle,
        date_range: form.date_range,
        image: form.image,
        gradient: form.gradient,
        active: form.active,
        nights: Number(form.nights) || 0,
        stars: Number(form.stars) || 0,
        tax_pct: Number(form.tax_pct) || 0,
        pricing: cleanedTiers,
      };
      if (isEdit) {
        await api.put(`/group-tours/${pkg.id}`, payload);
      } else {
        await api.post(`/group-tours`, payload);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()} data-testid="group-tour-editor">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-black text-gray-900 text-lg">{isEdit ? 'Edit' : 'Add'} Group Tour Package</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Title</label>
              <input value={form.title} onChange={e => update('title', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-title" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Destination</label>
              <input value={form.destination} onChange={e => update('destination', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-destination" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Subtitle</label>
              <input value={form.subtitle} onChange={e => update('subtitle', e.target.value)} placeholder="e.g. Baku 4 nights" className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-subtitle" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Date Range</label>
              <input value={form.date_range} onChange={e => update('date_range', e.target.value)} placeholder="24-31 May" className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-date-range" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nights</label>
              <input type="number" value={form.nights} onChange={e => update('nights', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-nights" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Stars (1-5)</label>
              <input type="number" min="1" max="5" value={form.stars} onChange={e => update('stars', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-stars" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tax %</label>
              <input type="number" step="0.01" value={form.tax_pct} onChange={e => update('tax_pct', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-tax" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cover Image URL</label>
              <input value={form.image} onChange={e => update('image', e.target.value)} placeholder="https://..." className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-image" />
            </div>
          </div>

          {/* Pricing — B2B + Display */}
          <div className="border border-gray-200 rounded-lg overflow-hidden" data-testid="gt-pricing-table">
            <div className="bg-[#0F2A4A] text-white px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wide">Price B2B / Display</h3>
                <p className="text-xs text-white/70 mt-0.5">Supplier Cost = internal net rate · Display Price = customer-facing rate.</p>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Without emi</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[#E8F0F7] text-[11px] uppercase text-gray-700 font-bold">
                <tr>
                  <th className="px-4 py-2.5 text-left">Tier</th>
                  <th className="px-4 py-2.5 text-right w-48">Supplier Cost (AED)</th>
                  <th className="px-4 py-2.5 text-right w-48">Display Price (AED)</th>
                </tr>
              </thead>
              <tbody>
                {TIER_ROWS.map(({ key, label }, i) => {
                  const tier = form.pricing?.[key] || BLANK_TIER;
                  return (
                    <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} data-testid={`gt-tier-row-${key}`}>
                      <td className="px-4 py-2.5 text-gray-800 font-semibold">{label}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.supplier_cost}
                          onChange={e => updateTier(key, 'supplier_cost', e.target.value)}
                          className="w-40 text-right border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#0F2A4A] focus:ring-1 focus:ring-[#0F2A4A]"
                          data-testid={`gt-tier-${key}-supplier`}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.display_price}
                          onChange={e => updateTier(key, 'display_price', e.target.value)}
                          className="w-40 text-right border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#0F2A4A] focus:ring-1 focus:ring-[#0F2A4A]"
                          data-testid={`gt-tier-${key}-display`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 text-[11px] text-gray-500 bg-gray-50 border-t border-gray-200">
              Note: Customers see the <strong>Display Price</strong>. Supplier Cost is internal-only (admin + accounting).
              Children 6-11 yrs are billed at the Twin/Double Display Price (they require a bed).
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <input type="checkbox" id="pkg-active" checked={form.active} onChange={e => update('active', e.target.checked)} />
            <label htmlFor="pkg-active" className="text-sm text-gray-700">Active (visible on Group Tours page)</label>
          </div>

          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-bold text-white bg-[#002B5B] hover:bg-[#003d82] rounded flex items-center gap-2 disabled:opacity-60" data-testid="gt-save">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const fmt = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function GroupToursAdmin() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/group-tours');
      setList(res.data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm('Delete this package? This cannot be undone.')) return;
    await api.delete(`/group-tours/${id}`);
    await load();
  };

  return (
    <div data-testid="group-tours-admin">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-black text-gray-900">Group Tours (Eid Holiday Deals)</h3>
          <p className="text-xs text-gray-500 mt-1">Prices, B2B supplier cost &amp; display price for the public Group Tours page.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="px-4 py-2 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold rounded-md text-sm flex items-center gap-2"
          data-testid="gt-new-btn"
        >
          <Plus size={14} /> New Package
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-8 text-center">Loading...</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center italic">No packages yet. Click "New Package" to create one.</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Destination</th>
                <th className="px-4 py-3 text-center">Nights</th>
                <th className="px-4 py-3 text-center">Stars</th>
                <th className="px-4 py-3 text-right">Twin Supplier (AED)</th>
                <th className="px-4 py-3 text-right">Twin Display (AED)</th>
                <th className="px-4 py-3 text-right">Tax %</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => {
                const twin = p.pricing?.twin_double || {};
                return (
                  <tr key={p.id} className="border-t border-gray-200 hover:bg-gray-50" data-testid={`gt-row-${p.id}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.title}</td>
                    <td className="px-4 py-3 text-gray-700">{p.destination}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{p.nights}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{p.stars}★</td>
                    <td className="px-4 py-3 text-right text-amber-700 font-mono text-xs" data-testid={`gt-row-${p.id}-supplier`}>
                      {fmt(twin.supplier_cost)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-mono text-sm font-semibold" data-testid={`gt-row-${p.id}-display`}>
                      {fmt(twin.display_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{p.tax_pct}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {p.active ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditing(p); setModalOpen(true); }} className="text-sky-600 hover:bg-sky-50 p-1.5 rounded" data-testid={`gt-edit-${p.id}`}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => remove(p.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded ml-1" data-testid={`gt-delete-${p.id}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-800">
            <strong>Twin Supplier</strong> = B2B net cost (operations / accounting). <strong>Twin Display</strong> = headline rate shown on the public Group Tours card. Open the editor to see all 5 pricing tiers.
          </div>
        </div>
      )}

      <PackageEditorModal
        open={modalOpen}
        pkg={editing}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

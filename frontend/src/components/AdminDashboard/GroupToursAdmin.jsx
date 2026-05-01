import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Loader2 } from 'lucide-react';
import { api } from '@/App';

const DEFAULT_RULES = [
  { label: '<2 yrs', min_age: 0, max_age: 2, multiplier: 0 },
  { label: '2-11 yrs', min_age: 2, max_age: 12, multiplier: 0.75 },
  { label: '12+ yrs', min_age: 12, max_age: null, multiplier: 1.0 },
];

const EMPTY_PKG = {
  title: '', destination: '', subtitle: '', nights: 4,
  date_range: '', stars: 3, price_per_adult: 0, tax_pct: 5,
  image: '',
  gradient: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
  child_age_rules: DEFAULT_RULES,
  active: true,
};

function PackageEditorModal({ open, pkg, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_PKG);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (pkg) {
      setForm({ ...EMPTY_PKG, ...pkg, child_age_rules: pkg.child_age_rules || DEFAULT_RULES });
    } else {
      setForm(EMPTY_PKG);
    }
    setErr('');
  }, [pkg, open]);

  if (!open) return null;

  const isEdit = Boolean(pkg?.id);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updateRule = (i, k, v) => setForm(f => {
    const rules = [...f.child_age_rules];
    rules[i] = { ...rules[i], [k]: v };
    return { ...f, child_age_rules: rules };
  });
  const addRule = () => setForm(f => ({
    ...f,
    child_age_rules: [...f.child_age_rules, { label: 'New bracket', min_age: 0, max_age: null, multiplier: 0.5 }],
  }));
  const removeRule = (i) => setForm(f => ({
    ...f,
    child_age_rules: f.child_age_rules.filter((_, j) => j !== i),
  }));

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const payload = {
        ...form,
        nights: Number(form.nights) || 0,
        stars: Number(form.stars) || 0,
        price_per_adult: Number(form.price_per_adult) || 0,
        tax_pct: Number(form.tax_pct) || 0,
        child_age_rules: form.child_age_rules.map(r => ({
          ...r,
          min_age: Number(r.min_age) || 0,
          max_age: r.max_age === '' || r.max_age === null ? null : Number(r.max_age),
          multiplier: Number(r.multiplier) || 0,
        })),
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()} data-testid="group-tour-editor">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-black text-gray-900 text-lg">{isEdit ? 'Edit' : 'Add'} Group Tour Package</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4">
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
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Price per Adult (AED)</label>
              <input type="number" value={form.price_per_adult} onChange={e => update('price_per_adult', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-price" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tax %</label>
              <input type="number" step="0.01" value={form.tax_pct} onChange={e => update('tax_pct', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-tax" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cover Image URL</label>
            <input value={form.image} onChange={e => update('image', e.target.value)} placeholder="https://..." className="w-full border rounded px-3 py-2 text-sm" data-testid="gt-field-image" />
          </div>

          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-gray-800">Child Age Pricing Rules</h3>
              <button onClick={addRule} className="text-xs text-sky-600 hover:underline flex items-center gap-1" data-testid="gt-add-rule">
                <Plus size={12} /> Add bracket
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Multiplier: 0 = free (infant), 0.75 = 75% of adult rate, 1.0 = full adult rate.</p>
            <div className="space-y-2">
              {form.child_age_rules.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded" data-testid={`gt-rule-${i}`}>
                  <input value={r.label} onChange={e => updateRule(i, 'label', e.target.value)} placeholder="Label" className="col-span-3 border rounded px-2 py-1.5 text-xs" />
                  <input type="number" value={r.min_age} onChange={e => updateRule(i, 'min_age', e.target.value)} placeholder="Min age" className="col-span-2 border rounded px-2 py-1.5 text-xs" />
                  <input type="number" value={r.max_age == null ? '' : r.max_age} onChange={e => updateRule(i, 'max_age', e.target.value)} placeholder="Max age (blank = ∞)" className="col-span-3 border rounded px-2 py-1.5 text-xs" />
                  <input type="number" step="0.01" min="0" max="1.5" value={r.multiplier} onChange={e => updateRule(i, 'multiplier', e.target.value)} placeholder="0..1" className="col-span-3 border rounded px-2 py-1.5 text-xs" />
                  <button onClick={() => removeRule(i)} className="col-span-1 text-red-600 hover:bg-red-50 rounded p-1" data-testid={`gt-remove-rule-${i}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
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
          <p className="text-xs text-gray-500 mt-1">Prices, child-age rules &amp; packages shown on the public Group Tours page.</p>
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
                <th className="px-4 py-3 text-left">Nights</th>
                <th className="px-4 py-3 text-left">Stars</th>
                <th className="px-4 py-3 text-right">Price (AED)</th>
                <th className="px-4 py-3 text-right">Tax %</th>
                <th className="px-4 py-3 text-left">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} className="border-t border-gray-200 hover:bg-gray-50" data-testid={`gt-row-${p.id}`}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.title}</td>
                  <td className="px-4 py-3 text-gray-700">{p.destination}</td>
                  <td className="px-4 py-3 text-gray-700">{p.nights}</td>
                  <td className="px-4 py-3 text-gray-700">{p.stars}★</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{Number(p.price_per_adult).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{p.tax_pct}%</td>
                  <td className="px-4 py-3">
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
              ))}
            </tbody>
          </table>
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

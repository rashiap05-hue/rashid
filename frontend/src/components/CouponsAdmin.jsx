import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Tag, Calendar, Percent, DollarSign, ToggleRight, ToggleLeft, X, Check,
} from 'lucide-react';
import { api } from '@/App';

const fmtDate = (s) => {
  if (!s) return 'No expiry';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return s; }
};

const emptyCoupon = {
  code: '',
  discount_type: 'percentage',
  discount_value: 10,
  max_discount: '',
  min_order_amount: 0,
  expiry_date: '',
  active: true,
  usage_limit: '',
  description: '',
};

export default function CouponsAdmin() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);     // null | {coupon} | 'new'

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/coupons');
      setCoupons(res.data || []);
    } catch (e) {
      console.error('Coupons fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleSave = async (form) => {
    const payload = {
      ...form,
      code: (form.code || '').trim().toUpperCase(),
      discount_value: Number(form.discount_value) || 0,
      max_discount: form.max_discount === '' ? null : Number(form.max_discount),
      min_order_amount: Number(form.min_order_amount) || 0,
      usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
      expiry_date: form.expiry_date || null,
    };
    try {
      if (editing === 'new') {
        await api.post('/coupons', payload);
      } else if (editing?.id) {
        await api.patch(`/coupons/${editing.id}`, payload);
      }
      setEditing(null);
      fetchCoupons();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Could not save coupon');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon? This cannot be undone.')) return;
    try {
      await api.delete(`/coupons/${id}`);
      fetchCoupons();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Could not delete coupon');
    }
  };

  const handleToggle = async (c) => {
    try {
      await api.patch(`/coupons/${c.id}`, { active: !c.active });
      fetchCoupons();
    } catch (e) {
      console.error('Toggle failed', e);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="coupons-admin">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 inline-flex items-center gap-2">
          <Tag size={18} className="text-amber-600" /> Coupons
        </h3>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
          data-testid="add-coupon-button"
        >
          <Plus size={18} /> Add Coupon
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading…</div>
      ) : coupons.length === 0 ? (
        <div className="py-20 text-center">
          <div className="flex flex-col items-center gap-3 opacity-30">
            <Tag size={48} />
            <span className="font-bold">No coupons yet</span>
            <span className="text-sm">Click "Add Coupon" to create one.</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Discount</th>
                <th className="px-4 py-3 text-left">Min Order</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Usage</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c, idx) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-amber-50/30" data-testid={`coupon-row-${idx}`}>
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-gray-800">{c.code}</div>
                    {c.description && <div className="text-xs text-gray-400 mt-0.5">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {c.discount_type === 'percentage' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <Percent size={12} /> {c.discount_value}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                        <DollarSign size={12} /> AED {c.discount_value}
                      </span>
                    )}
                    {c.max_discount > 0 && c.discount_type === 'percentage' && (
                      <div className="text-[10px] text-gray-400 mt-0.5">capped at AED {c.max_discount}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.min_order_amount > 0 ? `AED ${c.min_order_amount.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600 inline-flex items-center gap-1.5"><Calendar size={12} /> {fmtDate(c.expiry_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{c.usage_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(c)}
                      className={c.active ? 'text-emerald-600' : 'text-gray-400'}
                      title={c.active ? 'Click to disable' : 'Click to enable'}
                      data-testid={`toggle-coupon-${idx}`}
                    >
                      {c.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing(c)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded mr-1" data-testid={`edit-coupon-${idx}`}><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" data-testid={`delete-coupon-${idx}`}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <CouponEditor
          coupon={editing === 'new' ? emptyCoupon : editing}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </motion.div>
  );
}

function CouponEditor({ coupon, onCancel, onSave }) {
  const [form, setForm] = useState({
    ...emptyCoupon,
    ...coupon,
    expiry_date: coupon.expiry_date ? String(coupon.expiry_date).slice(0, 10) : '',
    max_discount: coupon.max_discount ?? '',
    usage_limit: coupon.usage_limit ?? '',
  });
  const isNew = !coupon.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="coupon-editor-modal">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">{isNew ? 'New Coupon' : `Edit ${form.code}`}</h2>
          <button onClick={onCancel} className="p-1 text-gray-500 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. WELCOME10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase tracking-wide focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              data-testid="coupon-code-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Discount Type</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                data-testid="coupon-type-select"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (AED)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                Value {form.discount_type === 'percentage' ? '(%)' : '(AED)'}
              </label>
              <input
                type="number" min="0"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                data-testid="coupon-value-input"
              />
            </div>
          </div>

          {form.discount_type === 'percentage' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Max Discount Cap (AED)</label>
              <input
                type="number" min="0"
                value={form.max_discount}
                onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                placeholder="Leave blank for no cap"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Min Order (AED)</label>
              <input
                type="number" min="0"
                value={form.min_order_amount}
                onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Usage Limit</label>
              <input
                type="number" min="0"
                value={form.usage_limit}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Expiry Date</label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              data-testid="coupon-expiry-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What this coupon is for"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Active (customers can redeem this coupon)</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 inline-flex items-center gap-2"
            data-testid="save-coupon-btn"
          >
            <Check size={16} /> {isNew ? 'Create Coupon' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

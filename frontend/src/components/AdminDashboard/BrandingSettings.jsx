import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload, Trash2, RotateCcw, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const FIELDS = [
  { key: 'company_name',   label: 'Company Name',   placeholder: 'Acme Travel Co.',           hint: 'Replaces "Travo Tours" on every customer-facing PDF.' },
  { key: 'footer_email',   label: 'Support Email',  placeholder: 'hello@acme.travel',         hint: 'Shown in PDF footers + the brochure terms page.' },
  { key: 'footer_phone',   label: 'Phone Number',   placeholder: '+971 50 123 4567',          hint: 'Optional — appears in the brochure footer line.' },
  { key: 'footer_website', label: 'Website',        placeholder: 'www.acme.travel',           hint: 'Optional — appears in the brochure footer line.' },
];

export default function BrandingSettings() {
  const [branding, setBranding] = useState({ logo_url: '', company_name: '', footer_email: '', footer_phone: '', footer_website: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/settings/branding');
      setBranding({
        logo_url: r.data.logo_url || '',
        company_name: r.data.company_name || '',
        footer_email: r.data.footer_email || '',
        footer_phone: r.data.footer_phone || '',
        footer_website: r.data.footer_website || '',
      });
    } catch (e) {
      toast.error('Could not load branding settings');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onPickLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      toast.error('Please pick a PNG / JPG / WEBP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5 MB');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/uploads/branding-logo', fd, {
        headers: { 'Content-Type': undefined },
        transformRequest: (d) => d,
      });
      setBranding((b) => ({ ...b, logo_url: r.data.url }));
      toast.success('Logo uploaded — remember to click "Save Branding" to apply.');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Logo upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/branding', branding);
      toast.success('Branding saved — applied to all new PDF downloads.');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onClearLogo = () => setBranding((b) => ({ ...b, logo_url: '' }));

  const onResetAll = async () => {
    if (!window.confirm('Reset all branding? PDFs will revert to the default Travo Tours look.')) return;
    setSaving(true);
    try {
      await api.delete('/settings/branding');
      setBranding({ logo_url: '', company_name: '', footer_email: '', footer_phone: '', footer_website: '' });
      toast.success('Branding cleared.');
    } catch (err) {
      toast.error('Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const logoFullUrl = branding.logo_url ? (branding.logo_url.startsWith('http') ? branding.logo_url : `${BACKEND_URL}${branding.logo_url}`) : '';

  if (loading) {
    return <div className="p-12 text-center text-gray-500" data-testid="branding-loading">Loading branding settings…</div>;
  }

  return (
    <div data-testid="branding-tab" className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#002B5B]">White-Label Branding</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Upload your logo + footer details. Applied automatically to every customer-facing PDF —
            <span className="font-semibold"> Group Tour Brochures, Trip Invoices, Travel Vouchers, and Payment Receipts</span>.
          </p>
        </div>

        {/* Logo block */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#002B5B] flex items-center gap-2"><ImageIcon size={18} /> Company Logo</h3>
              <p className="text-xs text-gray-500 mt-1">PNG / JPG / WEBP · landscape works best · up to 5 MB</p>
            </div>
            {branding.logo_url && (
              <button
                onClick={onClearLogo}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                data-testid="branding-clear-logo-btn"
              >
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div
              className="w-56 h-28 bg-[#0f2a4a] rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden"
              data-testid="branding-logo-preview"
            >
              {logoFullUrl ? (
                <img src={logoFullUrl} alt="logo preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-white/60 text-xs">No logo</span>
              )}
            </div>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d] text-sm font-medium disabled:opacity-50">
              <Upload size={15} />
              {uploading ? 'Uploading…' : (branding.logo_url ? 'Replace Logo' : 'Upload Logo')}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onPickLogo}
                className="hidden"
                disabled={uploading}
                data-testid="branding-logo-input"
              />
            </label>
          </div>
        </section>

        {/* Footer fields */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-[#002B5B] mb-4">Footer Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{f.label}</label>
                <input
                  type="text"
                  value={branding[f.key]}
                  onChange={(e) => setBranding({ ...branding, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#002B5B]/20 focus:border-[#002B5B] outline-none text-sm"
                  data-testid={`branding-${f.key.replace(/_/g, '-')}-input`}
                />
                <p className="text-xs text-gray-400 mt-1">{f.hint}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onResetAll}
            className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-1.5 px-3 py-2"
            data-testid="branding-reset-btn"
          >
            <RotateCcw size={14} /> Reset to default
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#002B5B] text-white rounded-lg hover:bg-[#001d3d] flex items-center gap-2 font-semibold text-sm disabled:opacity-50"
            data-testid="branding-save-btn"
          >
            {saving ? (<>Saving…</>) : (<><Save size={15} /> Save Branding</>)}
          </button>
        </div>

        {/* Tip card */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start">
          <CheckCircle2 className="text-blue-600 mt-0.5 shrink-0" size={18} />
          <div className="text-sm text-blue-900">
            <strong>Live preview:</strong> after saving, download any{' '}
            <span className="font-semibold">Group Tour brochure</span>,{' '}
            <span className="font-semibold">Trip Invoice</span>,{' '}
            <span className="font-semibold">Voucher</span>, or{' '}
            <span className="font-semibold">Payment Receipt</span> — your logo and footer details
            replace the default Travo Tours branding instantly. Changes apply tenant-wide.
          </div>
        </div>
      </motion.div>
    </div>
  );
}

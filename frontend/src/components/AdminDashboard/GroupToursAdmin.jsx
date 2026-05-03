import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/App';
import {
  Section, BulletListEditor, ItineraryEditor, HotelsEditor, InclusionsEditor, ParagraphListEditor,
  loadCities,
} from './GroupTourEditorSections';
import MultiImageUploadField from './MultiImageUploadField';
import RichTextEditor from './RichTextEditor';
import CatalogPicker from './CatalogPicker';
import { DEFAULT_TERMS_HTML } from './defaultTerms';

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
  date_range: '', stars: 3, target_margin_pct: 25,
  pricing: EMPTY_PRICING,
  image: '',
  images: [],
  gradient: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)',
  active: true,
  intro_paragraph: '',
  highlights: [],
  itinerary: [],
  hotels: [],
  transfers: [],
  inclusions: {},
  exclusions: [],
  what_to_expect: [],
  terms_and_conditions: DEFAULT_TERMS_HTML,
};

const TIER_ROWS = [
  { key: 'single_sharing', label: 'Cost per adult — Single sharing' },
  { key: 'twin_double',    label: 'Cost per adult — Twin / Double' },
  { key: 'triple',         label: 'Cost per adult — Triple' },
  { key: 'child_no_bed',   label: 'Cost per child — without bed (2-5 yrs)' },
  { key: 'infant',         label: 'Cost per infant — (0-2 yrs)' },
];

/* Markup % = (display - supplier) / supplier × 100. Returns null when supplier=0. */
const computeMargin = (supplier, display) => {
  const s = Number(supplier) || 0;
  const d = Number(display) || 0;
  if (s <= 0) return null;
  return ((d - s) / s) * 100;
};

/* Suggested display price = supplier × (1 + target/100), rounded to 2 dp. */
const suggestedDisplay = (supplier, targetPct) => {
  const s = Number(supplier) || 0;
  const t = Number(targetPct) || 0;
  if (s <= 0) return 0;
  return Math.round(s * (1 + t / 100) * 100) / 100;
};

/* Color-coded margin badge: red <10, amber 10-19.99, emerald 20-49.99, indigo >=50. */
const MarginBadge = ({ margin, target }) => {
  if (margin == null) return <span className="text-[10px] text-gray-400 italic">No supplier cost</span>;
  let cls = 'bg-red-100 text-red-700 border-red-200';
  if (margin >= 50) cls = 'bg-indigo-100 text-indigo-700 border-indigo-200';
  else if (margin >= 20) cls = 'bg-emerald-100 text-emerald-700 border-emerald-200';
  else if (margin >= 10) cls = 'bg-amber-100 text-amber-700 border-amber-200';
  const sign = margin >= 0 ? '+' : '';
  const tgt = Number(target) || 0;
  const offTarget = tgt > 0 ? margin - tgt : null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}
      title={offTarget != null ? `${offTarget >= 0 ? '+' : ''}${offTarget.toFixed(1)} pts vs target ${tgt}%` : 'Set a target margin to see deviation'}
    >
      {sign}{margin.toFixed(1)}%
    </span>
  );
};

function PackageEditorModal({ open, pkg, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_PKG);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (pkg) {
      const incomingImages = Array.isArray(pkg.images) && pkg.images.length > 0
        ? pkg.images
        : (pkg.image ? [pkg.image] : []);
      setForm({
        ...EMPTY_PKG,
        ...pkg,
        images: incomingImages,
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
        image: (form.images && form.images[0]) || form.image || '',
        images: Array.isArray(form.images) ? form.images.filter(Boolean).slice(0, 5) : [],
        gradient: form.gradient,
        active: form.active,
        nights: Number(form.nights) || 0,
        stars: Number(form.stars) || 0,
        target_margin_pct: Number(form.target_margin_pct) || 0,
        pricing: cleanedTiers,
        intro_paragraph: form.intro_paragraph || '',
        highlights: (form.highlights || []).filter(x => (x || '').trim()),
        itinerary: (form.itinerary || []).map(d => {
          const activities = Array.isArray(d.activities) && d.activities.length > 0
            ? d.activities
                .filter(a => a && a.id)
                .map(a => ({
                  id: a.id,
                  name: a.name || '',
                  image: a.image || '',
                  sub: a.sub || '',
                  duration: a.duration || '',
                }))
                .slice(0, 5)
            : (d.activity_id ? [{ id: d.activity_id, name: d.activity_name || '', image: '', sub: '', duration: '' }] : []);
          return {
            day: Number(d.day) || 1,
            title: d.title || '',
            desc: d.desc || '',
            meals: d.meals || [],
            hotel_note: d.hotel_note || '',
            activity_id: activities[0]?.id || null,
            activity_name: activities[0]?.name || null,
            activities,
            transfer_id: d.transfer_id || null,
            transfer_label: d.transfer_label || null,
            date: d.date || null,
            images: Array.isArray(d.images) ? d.images.filter(Boolean).slice(0, 5) : [],
          };
        }),
        hotels: (form.hotels || []).map(h => {
          const hotelImages = Array.isArray(h.images) && h.images.length > 0
            ? h.images.filter(Boolean).slice(0, 5)
            : (h.image ? [h.image] : []);
          return {
            name: h.name || '',
            stars: Number(h.stars) || 3,
            nights: Number(h.nights) || 1,
            room_type: h.room_type || '',
            meal_plan: h.meal_plan || '',
            image: hotelImages[0] || h.image || '',
            images: hotelImages,
            hotel_id: h.hotel_id || null,
          };
        }),
        transfers: (form.transfers || []).map(t => ({
          transfer_id: t.transfer_id || null,
          label: t.label || '',
          from_location: t.from_location || '',
          to_location: t.to_location || '',
          vehicle_type: t.vehicle_type || '',
          note: t.note || '',
        })),
        inclusions: Object.fromEntries(
          Object.entries(form.inclusions || {}).map(([cat, items]) => [cat, (items || []).filter(x => (x || '').trim())])
        ),
        exclusions: (form.exclusions || []).filter(x => (x || '').trim()),
        what_to_expect: (form.what_to_expect || []).filter(x => (x || '').trim()),
        terms_and_conditions: form.terms_and_conditions || '',
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" data-testid="group-tour-editor">
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
              <CatalogPicker
                selected={form.destination ? { id: form.destination, label: form.destination, sub: '', image: '' } : null}
                onSelect={(item) => update('destination', item ? item.label : '')}
                loadItems={loadCities}
                placeholder="Pick a city from the Cities catalog…"
                emptyText="No cities found in the catalog yet."
                testid="gt-field-destination"
              />
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
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Target Margin %</label>
              <input
                type="number" step="0.1" min="0"
                value={form.target_margin_pct}
                onChange={e => update('target_margin_pct', e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                data-testid="gt-field-target-margin"
                placeholder="e.g. 25"
              />
            </div>
            <div className="col-span-2">
              <MultiImageUploadField
                label="Cover Images"
                images={form.images || []}
                onChange={(imgs) => setForm(f => ({ ...f, images: imgs, image: imgs[0] || '' }))}
                packageId={pkg?.id || form.title}
                maxImages={5}
                testidPrefix="gt-field-cover-images"
              />
            </div>
          </div>

          {/* Pricing — B2B + Display */}
          <div className="border border-gray-200 rounded-lg overflow-hidden" data-testid="gt-pricing-table">
            <div className="bg-[#0F2A4A] text-white px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wide">Price B2B / Display</h3>
                <p className="text-xs text-white/70 mt-0.5">Supplier Cost = internal net rate · Display Price = customer-facing rate · Target margin {Number(form.target_margin_pct) || 0}%.</p>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Without emi</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[#E8F0F7] text-[11px] uppercase text-gray-700 font-bold">
                <tr>
                  <th className="px-4 py-2.5 text-left">Tier</th>
                  <th className="px-4 py-2.5 text-right w-44">Supplier Cost (AED)</th>
                  <th className="px-4 py-2.5 text-right w-56">Display Price (AED)</th>
                  <th className="px-4 py-2.5 text-center w-28">Markup</th>
                </tr>
              </thead>
              <tbody>
                {TIER_ROWS.map(({ key, label }, i) => {
                  const tier = form.pricing?.[key] || BLANK_TIER;
                  const margin = computeMargin(tier.supplier_cost, tier.display_price);
                  const suggested = suggestedDisplay(tier.supplier_cost, form.target_margin_pct);
                  const canSuggest = Number(tier.supplier_cost) > 0 && Number(form.target_margin_pct) > 0;
                  const isAtSuggestion = canSuggest && Math.abs((Number(tier.display_price) || 0) - suggested) < 0.5;
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
                          className="w-36 text-right border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#0F2A4A] focus:ring-1 focus:ring-[#0F2A4A]"
                          data-testid={`gt-tier-${key}-supplier`}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={tier.display_price}
                            onChange={e => updateTier(key, 'display_price', e.target.value)}
                            className="w-36 text-right border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#0F2A4A] focus:ring-1 focus:ring-[#0F2A4A]"
                            data-testid={`gt-tier-${key}-display`}
                          />
                          <button
                            type="button"
                            disabled={!canSuggest}
                            onClick={() => updateTier(key, 'display_price', suggested)}
                            className={`p-1.5 rounded border text-[10px] flex items-center gap-1 transition ${
                              canSuggest
                                ? (isAtSuggestion
                                    ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                    : 'border-[#0F2A4A] text-[#0F2A4A] hover:bg-[#0F2A4A] hover:text-white')
                                : 'border-gray-200 text-gray-300 cursor-not-allowed'
                            }`}
                            title={canSuggest ? `Suggested: AED ${suggested.toLocaleString()} (supplier × ${1 + (Number(form.target_margin_pct) || 0) / 100})` : 'Set Supplier Cost & Target Margin to enable'}
                            data-testid={`gt-tier-${key}-suggest`}
                          >
                            <RefreshCw size={11} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center" data-testid={`gt-tier-${key}-margin`}>
                        <MarginBadge margin={margin} target={form.target_margin_pct} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 text-[11px] text-gray-500 bg-gray-50 border-t border-gray-200">
              Note: Customers see the <strong>Display Price</strong>. Supplier Cost is internal-only (admin + accounting).
              Click <RefreshCw size={10} className="inline" /> to apply the Suggested Price (Supplier × Target Margin).
              Children 6-11 yrs are billed at the Twin/Double Display Price (they require a bed).
            </div>
          </div>

          {/* ---------- Rich itinerary content (collapsible) ---------- */}
          <Section
            title="Intro Paragraph & Trip Highlights"
            subtitle="The opening blurb and the green-check bullets on the Group Tour Detail page."
            count={(form.highlights || []).length}
            testid="gt-section-highlights"
          >
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Intro Paragraph</label>
              <RichTextEditor
                value={form.intro_paragraph || ''}
                onChange={(html) => update('intro_paragraph', html)}
                placeholder="This trip by Travo Tours is a handpicked experience featuring..."
                minHeight={100}
                testid="gt-field-intro"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Highlights</label>
              <BulletListEditor
                items={form.highlights || []}
                onChange={(items) => update('highlights', items)}
                placeholder="Highlight bullet (e.g. Visit UNESCO heritage sites)"
                testidPrefix="gt-hl"
              />
            </div>
          </Section>

          <Section
            title="Itinerary (Day-by-day)"
            subtitle="Renders as the 'Itinerary' tab on the Detail page."
            count={(form.itinerary || []).length}
            testid="gt-section-itinerary"
          >
            <ItineraryEditor
              days={form.itinerary || []}
              onChange={(days) => update('itinerary', days)}
              destination={form.destination}
              packageId={pkg?.id || form.title}
            />
          </Section>

          <Section
            title="Hotels"
            subtitle="Renders as the 'Hotels' tab on the Detail page."
            count={(form.hotels || []).length}
            testid="gt-section-hotels"
          >
            <HotelsEditor
              hotels={form.hotels || []}
              onChange={(hotels) => update('hotels', hotels)}
              packageId={pkg?.id || form.title}
              destination={form.destination}
            />
          </Section>

          <Section
            title="Inclusions"
            subtitle="Grouped by category (Accommodation / Transfers / Sightseeing / Miscellaneous)."
            count={Object.values(form.inclusions || {}).reduce((s, arr) => s + (arr || []).length, 0)}
            testid="gt-section-inclusions"
          >
            <InclusionsEditor
              inclusions={form.inclusions || {}}
              onChange={(inc) => update('inclusions', inc)}
            />
          </Section>

          <Section
            title="Exclusions"
            subtitle="Shown as red × bullets on the Detail page."
            count={(form.exclusions || []).length}
            testid="gt-section-exclusions"
          >
            <BulletListEditor
              items={form.exclusions || []}
              onChange={(items) => update('exclusions', items)}
              placeholder="Exclusion bullet (e.g. International airfare)"
              testidPrefix="gt-exc"
            />
          </Section>

          <Section
            title="What to Expect"
            subtitle="Free-form notes shown in the 'What to Expect' section."
            count={(form.what_to_expect || []).length}
            testid="gt-section-expect"
          >
            <ParagraphListEditor
              paragraphs={form.what_to_expect || []}
              onChange={(p) => update('what_to_expect', p)}
              placeholder="A paragraph of guest-facing notes..."
              testidPrefix="gt-exp"
            />
          </Section>

          <Section
            title="Terms & Conditions"
            subtitle="Rich-text block rendered on the public 'Terms' tab of the Group Tour Detail page."
            count={(form.terms_and_conditions || '').trim() ? 1 : 0}
            testid="gt-section-terms"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] text-gray-500">
                Tip: the default template is auto-loaded for new packages. Edit any clause or use the button to restore the full default.
              </span>
              <button
                type="button"
                onClick={() => {
                  if (
                    !(form.terms_and_conditions || '').trim() ||
                    window.confirm('Replace the current Terms & Conditions with the default template? Any custom edits will be lost.')
                  ) {
                    update('terms_and_conditions', DEFAULT_TERMS_HTML);
                  }
                }}
                className="px-3 py-1.5 bg-[#002B5B] hover:bg-[#003d82] text-white text-xs font-bold rounded whitespace-nowrap"
                data-testid="gt-terms-load-default"
              >
                ↻ Load Default Template
              </button>
            </div>
            <RichTextEditor
              value={form.terms_and_conditions || ''}
              onChange={(html) => update('terms_and_conditions', html)}
              placeholder="e.g. Booking is non-refundable within 14 days of departure..."
              testid="gt-terms-editor"
            />
          </Section>

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
      const res = await api.get('/group-tours', { params: { include_inactive: true } });
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
                <th className="px-4 py-3 text-center">Markup (Twin)</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => {
                const twin = p.pricing?.twin_double || {};
                const margin = computeMargin(twin.supplier_cost, twin.display_price);
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
                    <td className="px-4 py-3 text-center" data-testid={`gt-row-${p.id}-markup`}>
                      <MarginBadge margin={margin} target={p.target_margin_pct} />
                    </td>
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
            <strong>Twin Supplier</strong> = B2B net cost · <strong>Twin Display</strong> = headline rate shown publicly · <strong>Markup</strong> badge: <span className="font-bold text-red-700">red &lt;10%</span>, <span className="font-bold text-amber-700">amber 10-19%</span>, <span className="font-bold text-emerald-700">emerald 20-49%</span>, <span className="font-bold text-indigo-700">indigo 50%+</span>. Open the editor to set the per-package Target Margin and click <RefreshCw size={10} className="inline" /> to apply suggested prices.
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

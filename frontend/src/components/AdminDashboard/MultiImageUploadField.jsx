import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, ArrowLeft, ArrowRight, Plus, Star } from 'lucide-react';
import { api } from '@/App';

/* Multi-image upload widget used by Group Tour cover, hotel rows, and itinerary days.
 * Supports up to `maxImages` (default 5) images. The FIRST image is the primary
 * (hero) and is shown with a yellow "PRIMARY" badge.
 * Reorder via arrow buttons; remove via X.
 *
 * Props:
 *   - images: string[]   current URLs/paths (ordered; index 0 = primary)
 *   - onChange: (next: string[]) => void
 *   - packageId: string  (optional) forwarded to the upload endpoint so files
 *                        land in a per-package folder
 *   - maxImages: number  default 5
 *   - label: string
 *   - testidPrefix: string
 */
export default function MultiImageUploadField({
  images,
  onChange,
  packageId = '',
  maxImages = 5,
  label = 'Images',
  testidPrefix = 'multi-img',
}) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const inputRef = useRef(null);

  const atMax = list.length >= maxImages;

  const pushUrl = (url) => {
    if (!url) return;
    if (atMax) {
      setErr(`Maximum ${maxImages} images reached. Remove one first.`);
      return;
    }
    onChange([...list, url]);
    setErr('');
  };

  const upload = async (file) => {
    if (!file) return;
    if (atMax) {
      setErr(`Maximum ${maxImages} images reached.`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErr('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr('Image must be smaller than 10 MB');
      return;
    }
    setUploading(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (packageId) fd.append('package_id', packageId);
      const res = await api.post('/uploads/group-tour-image', fd, {
        headers: { 'Content-Type': undefined },
        transformRequest: [(d) => d],
      });
      onChange([...list, res.data.url]);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onPick = (e) => {
    const files = Array.from(e.target.files || []);
    // Upload sequentially up to the remaining slots
    (async () => {
      for (const f of files) {
        if (list.length + (e.target.__uploaded || 0) >= maxImages) break;
        await upload(f);
      }
    })();
    e.target.value = '';
  };

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i) => {
    onChange(list.filter((_, idx) => idx !== i));
    setErr('');
  };

  const makePrimary = (i) => {
    if (i === 0) return;
    const next = [list[i], ...list.filter((_, idx) => idx !== i)];
    onChange(next);
  };

  const resolve = (src) => (src && src.startsWith('http')) ? src : (process.env.REACT_APP_BACKEND_URL + src);

  return (
    <div data-testid={testidPrefix}>
      {label && (
        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
          {label}
          <span className="ml-1.5 text-[10px] text-gray-400 font-medium normal-case">
            ({list.length}/{maxImages}) · First image = primary
          </span>
        </label>
      )}

      {/* Thumbnails */}
      {list.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mb-2">
          {list.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className={`relative group rounded-lg overflow-hidden border-2 aspect-[4/3] ${
                i === 0 ? 'border-amber-400' : 'border-gray-200'
              }`}
              data-testid={`${testidPrefix}-thumb-${i}`}
            >
              <img src={resolve(src)} alt="" className="w-full h-full object-cover" />

              {i === 0 && (
                <span className="absolute top-1 left-1 bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star size={8} fill="currentColor" /> PRIMARY
                </span>
              )}

              {/* Hover controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="p-1 bg-white/90 hover:bg-white text-gray-800 rounded disabled:opacity-30"
                  title="Move left"
                  data-testid={`${testidPrefix}-move-left-${i}`}
                >
                  <ArrowLeft size={12} />
                </button>
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => makePrimary(i)}
                    className="p-1 bg-amber-400 hover:bg-amber-500 text-amber-900 rounded"
                    title="Make primary"
                    data-testid={`${testidPrefix}-make-primary-${i}`}
                  >
                    <Star size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => move(i, +1)}
                  disabled={i === list.length - 1}
                  className="p-1 bg-white/90 hover:bg-white text-gray-800 rounded disabled:opacity-30"
                  title="Move right"
                  data-testid={`${testidPrefix}-move-right-${i}`}
                >
                  <ArrowRight size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1 bg-red-500 hover:bg-red-600 text-white rounded"
                  title="Remove"
                  data-testid={`${testidPrefix}-remove-${i}`}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
          {/* "Add" tile when not at max */}
          {!atMax && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="aspect-[4/3] border-2 border-dashed border-gray-300 hover:border-[#002B5B] hover:bg-blue-50 rounded-lg flex flex-col items-center justify-center text-[10px] text-gray-500 font-semibold gap-1"
              data-testid={`${testidPrefix}-add-tile`}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
              {uploading ? 'Uploading…' : 'Add image'}
            </button>
          )}
        </div>
      )}

      {/* Empty-state upload area (only shown when list is empty) */}
      {list.length === 0 && (
        <div
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center text-xs text-gray-500 mb-2"
        >
          <ImageIcon size={24} className="text-gray-300 mb-1" />
          <span>No images yet. Drop an image here or click "Add image" below.</span>
        </div>
      )}

      {/* Action row: Upload + URL paste (only if room left) */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || atMax}
          className="px-3 py-1.5 bg-[#002B5B] hover:bg-[#003d82] text-white text-xs font-bold rounded flex items-center gap-1.5 disabled:opacity-40"
          data-testid={`${testidPrefix}-upload-btn`}
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
          {uploading ? 'Uploading…' : atMax ? `Max ${maxImages}` : 'Add image'}
        </button>

        {!atMax && (
          <div className="flex-1 min-w-[220px] flex items-center gap-1">
            <input
              type="text"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pushUrl(urlDraft.trim()); setUrlDraft(''); } }}
              placeholder="…or paste an image URL and press Enter"
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[#002B5B]"
              data-testid={`${testidPrefix}-url-input`}
            />
            <button
              type="button"
              onClick={() => { pushUrl(urlDraft.trim()); setUrlDraft(''); }}
              disabled={!urlDraft.trim()}
              className="px-2 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded disabled:opacity-40"
              data-testid={`${testidPrefix}-url-add`}
            >
              Add
            </button>
          </div>
        )}

        <span className="text-[10px] text-gray-400">JPG, PNG, WEBP · ≤10 MB</span>
      </div>

      {err && <div className="text-[11px] text-red-600 mt-1">{err}</div>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}

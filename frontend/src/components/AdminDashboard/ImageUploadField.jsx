import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { api } from '@/App';

/* Reusable image-upload widget for Group Tour cover + hotel images.
 * Posts to /api/uploads/group-tour-image (multipart) and returns the
 * relative URL — which is then stored as the package's `image` field.
 *
 * Falls back gracefully if the user pastes a remote URL into the input.
 */
export default function ImageUploadField({ value, onChange, packageId = '', label = 'Cover Image', testidPrefix = 'img-upload' }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  const upload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('Please select an image file (.jpg, .png, .webp, etc.)');
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
      onChange(res.data.url);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  return (
    <div data-testid={testidPrefix}>
      {label && <label className="block text-xs font-bold text-gray-600 uppercase mb-1">{label}</label>}
      <div className="flex items-stretch gap-2">
        {/* Preview */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`w-24 h-20 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0 ${
            value ? 'border-gray-300' : 'border-gray-300 bg-gray-50'
          }`}
        >
          {value ? (
            <img src={value.startsWith('http') ? value : (process.env.REACT_APP_BACKEND_URL + value)} alt="" className="w-full h-full object-cover" data-testid={`${testidPrefix}-preview`} />
          ) : (
            <ImageIcon size={20} className="text-gray-300" />
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder="Paste an image URL or upload a file →"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#002B5B]"
            data-testid={`${testidPrefix}-url`}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 bg-[#002B5B] hover:bg-[#003d82] text-white text-xs font-bold rounded flex items-center gap-1.5 disabled:opacity-60"
              data-testid={`${testidPrefix}-btn`}
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-2 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded flex items-center gap-1"
                data-testid={`${testidPrefix}-clear`}
              >
                <X size={11} /> Clear
              </button>
            )}
            <span className="text-[10px] text-gray-400">JPG, PNG, WEBP up to 10 MB</span>
          </div>
          {err && <div className="text-[11px] text-red-600">{err}</div>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
    </div>
  );
}

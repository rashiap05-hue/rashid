import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Eraser } from 'lucide-react';

/* Lightweight WYSIWYG editor using contentEditable + a small toolbar.
 *
 * - Stores rich text as HTML (the same shape as a more elaborate library,
 *   so swapping later is trivial).
 * - No external runtime deps → no concurrent-rendering issues / hydration
 *   warnings under React 18 concurrent mode.
 * - Toolbar: H3, Bold, Italic, Underline, Link, Bullet List, Numbered List,
 *   Clear formatting.
 * - Incoming HTML is sanitised with DOMPurify before being injected into
 *   the contentEditable so a malicious paste cannot execute scripts.
 */
export default function RichTextEditor({ value, onChange, placeholder = '', testid = 'rte', minHeight = 100 }) {
  const ref = useRef(null);
  const [hasFocus, setHasFocus] = useState(false);

  // Sync external value → DOM only when the value differs from the live HTML
  // (prevents caret jumping while the user is typing).
  useEffect(() => {
    if (!ref.current) return;
    const incoming = DOMPurify.sanitize(value || '');
    if (ref.current.innerHTML !== incoming) {
      ref.current.innerHTML = incoming;
    }
  }, [value]);

  const exec = (cmd, val = null) => {
    ref.current?.focus();
    // eslint-disable-next-line no-restricted-syntax
    document.execCommand(cmd, false, val);
    onChange(ref.current?.innerHTML || '');
  };
  const onInput = () => onChange(ref.current?.innerHTML || '');
  const onLink = () => {
    const url = window.prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };
  const showPlaceholder = !value && !hasFocus;

  return (
    <div className="rte" data-testid={testid}>
      <style>{`
        .rte { border: 1px solid #d1d5db; border-radius: 4px; background: #fff; }
        .rte-toolbar { display: flex; gap: 2px; padding: 4px; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; background: #f9fafb; border-radius: 4px 4px 0 0; }
        .rte-btn { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid transparent; background: transparent; color: #4b5563; border-radius: 3px; cursor: pointer; }
        .rte-btn:hover { background: #e5e7eb; color: #111827; }
        .rte-btn[data-format-active="true"] { background: #002B5B; color: white; }
        .rte-content { min-height: ${minHeight}px; padding: 8px 10px; font-size: 13px; line-height: 1.5; color: #111827; outline: none; }
        .rte-content[data-empty="true"]::before { content: attr(data-placeholder); color: #9ca3af; font-style: normal; pointer-events: none; }
        .rte-content p { margin: 0 0 6px; }
        .rte-content ul, .rte-content ol { padding-left: 22px; margin: 4px 0 8px; }
        .rte-content a { color: #2563eb; text-decoration: underline; }
        .rte-content h3 { font-weight: 700; font-size: 1rem; margin: 6px 0; }
      `}</style>
      <div className="rte-toolbar" data-testid={`${testid}-toolbar`}>
        <button type="button" className="rte-btn" onClick={() => exec('bold')} title="Bold (Ctrl+B)" data-testid={`${testid}-bold`}><Bold size={13} /></button>
        <button type="button" className="rte-btn" onClick={() => exec('italic')} title="Italic (Ctrl+I)" data-testid={`${testid}-italic`}><Italic size={13} /></button>
        <button type="button" className="rte-btn" onClick={() => exec('underline')} title="Underline (Ctrl+U)" data-testid={`${testid}-underline`}><Underline size={13} /></button>
        <span className="w-px h-5 bg-gray-300 mx-1 inline-block" />
        <button type="button" className="rte-btn" onClick={() => exec('insertUnorderedList')} title="Bullet List" data-testid={`${testid}-ul`}><List size={13} /></button>
        <button type="button" className="rte-btn" onClick={() => exec('insertOrderedList')} title="Numbered List" data-testid={`${testid}-ol`}><ListOrdered size={13} /></button>
        <span className="w-px h-5 bg-gray-300 mx-1 inline-block" />
        <button type="button" className="rte-btn" onClick={onLink} title="Insert Link" data-testid={`${testid}-link`}><LinkIcon size={13} /></button>
        <button type="button" className="rte-btn" onClick={() => exec('removeFormat')} title="Clear Formatting" data-testid={`${testid}-clear`}><Eraser size={13} /></button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-empty={showPlaceholder}
        data-placeholder={placeholder}
        className="rte-content"
        onInput={onInput}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        data-testid={`${testid}-content`}
      />
    </div>
  );
}

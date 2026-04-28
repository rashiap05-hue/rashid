// CSV export helper for the operational dashboard service tabs
const escape = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const formatCell = (v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return v;
};

/**
 * Build a CSV string from rows + columns config. Adds a final "Status" column.
 * Each `column.csv(row)` is called when present; otherwise falls back to row[column.key].
 */
export const rowsToCsv = (rows, columns) => {
  const headers = [...columns.map(c => c.label), 'Status', 'Booking Ref'];
  const lines = [headers.map(escape).join(',')];
  rows.forEach((r) => {
    const cells = columns.map((c) => {
      const v = c.csv ? c.csv(r) : r[c.key];
      return escape(formatCell(v));
    });
    cells.push(escape(r.status || ''));
    cells.push(escape(r.order_id || r.booking_id || ''));
    lines.push(cells.join(','));
  });
  return lines.join('\n');
};

export const downloadCsv = (filename, csvString) => {
  const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const todayStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

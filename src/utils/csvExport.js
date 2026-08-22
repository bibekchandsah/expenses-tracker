/**
 * Escapes a single CSV cell value.
 * Wraps in quotes and escapes internal quotes.
 */
function cell(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // Always quote — handles commas, newlines, and unicode safely
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Converts an array of row-arrays to a UTF-8 BOM CSV string.
 * The BOM (\uFEFF) tells Excel to open the file as UTF-8,
 * which correctly renders emojis and special characters.
 */
function toCSV(headers, rows) {
  const lines = [
    headers.map(cell).join(','),
    ...rows.map(r => r.map(cell).join(',')),
  ];
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Triggers a CSV file download in the browser.
 */
function download(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export expenses to CSV.
 * @param {Array} expenses
 * @param {Array} categories  - full categories array from CategoryContext
 * @param {string} filename
 */
export function exportToCSV(expenses, categories = [], filename = 'expenses.csv') {
  const catMap = Object.fromEntries((categories || []).map(c => [c.id, c.name]));

  const headers = ['Title', 'Amount', 'Category', 'Date', 'Notes', 'Description'];
  const rows = expenses.map(e => [
    e.title || '',
    e.amount ?? '',
    catMap[e.category] || e.category || '',
    e.date || '',
    e.notes || '',
    e.description || '',
  ]);

  download(toCSV(headers, rows), filename);
}

/**
 * Generic CSV export helper for pages that build their own rows.
 * @param {string[]} headers
 * @param {Array[]}  rows     - array of plain value arrays (no manual quoting needed)
 * @param {string}   filename
 */
export function exportCSV(headers, rows, filename) {
  download(toCSV(headers, rows), filename);
}

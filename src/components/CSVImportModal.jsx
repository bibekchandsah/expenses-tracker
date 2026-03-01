/**
 * CSVImportModal — Generic reusable CSV importer
 *
 * Props:
 *  isOpen          boolean
 *  onClose         () => void
 *  entityName      string  e.g. "Expense"
 *  fields          FieldDef[]   { key, label, required, type: 'text'|'number'|'date' }
 *  existingRecords any[]        existing data for duplicate detection
 *  duplicateKeyFn  (record) => string   build a key from a record for dedup
 *  onImport        async (records[]) => void
 *  accentColor     string  optional tailwind color class prefix e.g. 'blue' | 'green'
 */

import { useState, useRef, useCallback } from 'react';
import {
  X, Upload, FileText, AlertTriangle, CheckCircle2, AlertCircle,
  ChevronRight, SkipForward, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_FORMATS = [
  { label: 'Auto-detect',              value: 'auto' },
  { label: 'YYYY-MM-DD',               value: 'YYYY-MM-DD' },
  { label: 'MM/DD/YYYY (US)',          value: 'MM/DD/YYYY' },
  { label: 'DD/MM/YYYY (EU/Asia)',     value: 'DD/MM/YYYY' },
  { label: 'MM-DD-YYYY',              value: 'MM-DD-YYYY' },
  { label: 'DD-MM-YYYY',              value: 'DD-MM-YYYY' },
  { label: 'YYYY/MM/DD',              value: 'YYYY/MM/DD' },
  { label: 'D MMM YYYY (15 Mar 2024)', value: 'D_MMM_YYYY' },
  { label: 'MMM D YYYY (Mar 15 2024)', value: 'MMM_D_YYYY' },
];

const MONTHS_SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

const STEP = { UPLOAD: 0, MAP: 1, REVIEW: 2, IMPORTING: 3, DONE: 4 };

// ── Utilities ─────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let inQuote = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        row.push(cell.trim());
        cell = '';
      } else {
        cell += ch;
      }
    }
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

function toISO(y, m, d) {
  const year  = String(+y).padStart(4, '0');
  const month = String(+m).padStart(2, '0');
  const day   = String(+d).padStart(2, '0');
  if (+month < 1 || +month > 12 || +day < 1 || +day > 31) return null;
  return `${year}-${month}-${day}`;
}

function parseDate(raw, format) {
  if (!raw) return null;
  const s = String(raw).trim().replace(/\s+/g, ' ');

  if (format === 'YYYY-MM-DD' || format === 'auto') {
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return toISO(m[1], m[2], m[3]);
  }
  if (format === 'YYYY/MM/DD' || format === 'auto') {
    const m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (m) return toISO(m[1], m[2], m[3]);
  }
  if (format === 'MM/DD/YYYY') {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return toISO(m[3], m[1], m[2]);
  }
  if (format === 'DD/MM/YYYY') {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return toISO(m[3], m[2], m[1]);
  }
  // auto slash: prefer MM/DD/YYYY (US default) unless day > 12
  if (format === 'auto') {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      if (+m[1] > 12) return toISO(m[3], m[2], m[1]); // day first
      return toISO(m[3], m[1], m[2]); // month first
    }
  }
  if (format === 'MM-DD-YYYY') {
    const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) return toISO(m[3], m[1], m[2]);
  }
  if (format === 'DD-MM-YYYY') {
    const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) return toISO(m[3], m[2], m[1]);
  }
  if (format === 'auto') {
    const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) {
      if (+m[1] > 12) return toISO(m[3], m[2], m[1]);
      return toISO(m[3], m[1], m[2]);
    }
  }
  if (format === 'D_MMM_YYYY' || format === 'auto') {
    const m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (m) {
      const mon = MONTHS_SHORT.indexOf(m[2].toLowerCase().slice(0, 3)) + 1;
      if (mon > 0) return toISO(m[3], mon, m[1]);
    }
  }
  if (format === 'MMM_D_YYYY' || format === 'auto') {
    const m = s.match(/^([A-Za-z]+)\s+(\d{1,2})[,\s]+(\d{4})$/);
    if (m) {
      const mon = MONTHS_SHORT.indexOf(m[1].toLowerCase().slice(0, 3)) + 1;
      if (mon > 0) return toISO(m[3], mon, m[2]);
    }
  }
  // Final fallback: native JS Date.parse
  if (format === 'auto') {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

function parseAmount(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;
  // Remove currency symbols, spaces, thousands separators (handles ,)
  let s = String(raw).trim().replace(/[^0-9.\-+,]/g, '');
  // Detect EU format: "1.234,56" → remove dots as thousands, replace comma with dot
  if (/\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Remove commas used as thousands separators
    s = s.replace(/,(?=\d{3}(?:\.|$))/g, '').replace(',', '');
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function guessMapping(headers, fields) {
  const mapping = {};
  fields.forEach(f => {
    const fKey = f.key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fLabel = f.label.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = headers.findIndex(h => {
      const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return hClean === fKey || hClean === fLabel ||
        hClean.includes(fKey) || fKey.includes(hClean) ||
        hClean.includes(fLabel) || fLabel.includes(hClean);
    });
    if (idx >= 0) mapping[f.key] = String(idx);
  });
  return mapping;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CSVImportModal({
  isOpen, onClose,
  entityName = 'Record',
  fields = [],
  existingRecords = [],
  duplicateKeyFn,
  onImport,
  accentColor = 'blue',
}) {
  const [step, setStep]               = useState(STEP.UPLOAD);
  const [csvHeaders, setCsvHeaders]   = useState([]);
  const [csvRows, setCsvRows]         = useState([]);
  const [fileName, setFileName]       = useState('');
  const [parseError, setParseError]   = useState('');
  const [mapping, setMapping]         = useState({});
  const [dateFormat, setDateFormat]   = useState('auto');
  const [dupAction, setDupAction]     = useState('skip');
  const [analysis, setAnalysis]       = useState(null);
  const [showDupList, setShowDupList] = useState(false);
  const [showBadList, setShowBadList] = useState(false);
  const [importing, setImporting]     = useState(false);
  const [result, setResult]           = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const fileRef = useRef(null);

  const accent = accentColor;

  function reset() {
    setStep(STEP.UPLOAD);
    setCsvHeaders([]); setCsvRows([]); setFileName(''); setParseError('');
    setMapping({}); setDateFormat('auto'); setDupAction('skip');
    setAnalysis(null); setShowDupList(false); setShowBadList(false);
    setImporting(false); setResult(null); setDragOver(false);
  }

  function handleClose() { reset(); onClose(); }

  // ── File processing ────────────────────────────────────────────
  function processFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target.result);
        if (rows.length < 2) { setParseError('CSV must have a header row and at least one data row.'); return; }
        const headers = rows[0];
        const data    = rows.slice(1).filter(r => r.some(c => c));
        if (!headers.length) { setParseError('Could not read CSV headers.'); return; }
        setCsvHeaders(headers);
        setCsvRows(data);
        setMapping(guessMapping(headers, fields));
        setParseError('');
        setStep(STEP.MAP);
      } catch {
        setParseError('Failed to parse CSV. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }

  // ── Parse a single CSV row into a record ──────────────────────
  function parseRow(row) {
    const rec = {};
    fields.forEach(f => {
      const colIdx = mapping[f.key] !== undefined && mapping[f.key] !== '' ? +mapping[f.key] : -1;
      if (colIdx < 0) { rec[f.key] = ''; return; }
      const raw = row[colIdx] ?? '';
      if (f.type === 'date')   rec[f.key] = parseDate(raw, dateFormat) || '';
      else if (f.type === 'number') rec[f.key] = parseAmount(raw) ?? '';
      else rec[f.key] = String(raw).trim();
    });
    return rec;
  }

  // ── Analyse all rows ──────────────────────────────────────────
  function analyse() {
    const existingKeys = new Set(
      (existingRecords || []).map(r => duplicateKeyFn ? duplicateKeyFn(r) : '')
    );
    const valid = [], duplicates = [], invalid = [];
    csvRows.forEach((row, i) => {
      const rec = parseRow(row);
      const missingReq = fields.filter(f => f.required && !rec[f.key]).map(f => f.label);
      if (missingReq.length) {
        invalid.push({ row: i + 2, rec, reason: `Missing: ${missingReq.join(', ')}` });
        return;
      }
      const key = duplicateKeyFn ? duplicateKeyFn(rec) : null;
      if (key && existingKeys.has(key)) duplicates.push({ row: i + 2, rec });
      else valid.push(rec);
    });
    setAnalysis({ valid, duplicates, invalid });
    setStep(STEP.REVIEW);
  }

  // ── Import ────────────────────────────────────────────────────
  async function doImport() {
    setImporting(true);
    setStep(STEP.IMPORTING);
    const toImport = [
      ...analysis.valid,
      ...(dupAction === 'include' ? analysis.duplicates.map(d => d.rec) : []),
    ];
    let imported = 0, failed = 0;
    for (const rec of toImport) {
      try {
        await onImport([rec]);
        imported++;
      } catch {
        failed++;
      }
    }
    const skipped = dupAction === 'skip' ? analysis.duplicates.length : 0;
    setResult({ imported, skipped, failed, dupIncluded: dupAction === 'include' ? analysis.duplicates.length : 0 });
    setImporting(false);
    setStep(STEP.DONE);
  }

  if (!isOpen) return null;

  const btnPrimary = `px-4 py-2 text-sm font-medium text-white bg-${accent}-600 hover:bg-${accent}-700 disabled:opacity-40 rounded-xl transition-colors`;
  const btnSecondary = `px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors`;

  // Step progress labels
  const STEPS = ['Upload', 'Map Columns', 'Review', null, 'Done'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Import {entityName}s from CSV
            </h2>
            {step < STEP.IMPORTING && (
              <div className="flex items-center gap-1 mt-1">
                {[0, 1, 2].map(s => (
                  <span key={s} className="flex items-center gap-1">
                    <span className={`text-xs font-medium ${step === s ? `text-${accent}-600 dark:text-${accent}-400` : step > s ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-400 dark:text-gray-500'}`}>
                      {STEPS[s]}
                    </span>
                    {s < 2 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP 0: UPLOAD ── */}
          {step === STEP.UPLOAD && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload a <strong>.csv</strong> file exported from any spreadsheet app, Splitwise, bank portal, etc.
                The next step will let you map the CSV columns to the correct fields.
              </p>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? `border-${accent}-400 bg-${accent}-50 dark:bg-${accent}-900/20`
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Upload className={`w-10 h-10 mx-auto mb-3 text-${accent}-500`} />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drag & drop your CSV here</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">or click to browse</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => processFile(e.target.files[0])} />
              </div>
              {parseError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {parseError}
                </div>
              )}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p className="font-semibold text-gray-600 dark:text-gray-300">Tips for CSV format</p>
                <p>• First row should be column headers (e.g. Date, Amount, Description)</p>
                <p>• Dates can be in any common format — you'll select the format in the next step</p>
                <p>• Amounts can include currency symbols and thousands separators (e.g. $1,234.56)</p>
                <p>• Many apps like Splitwise, Google Sheets, Excel export directly to CSV</p>
              </div>
            </div>
          )}

          {/* ── STEP 1: MAP COLUMNS ── */}
          {step === STEP.MAP && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-400">
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span><strong>{fileName}</strong> — {csvRows.length} data rows, {csvHeaders.length} columns detected</span>
              </div>

              {/* Field mapping */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Map CSV Columns to Fields</h3>
                <div className="space-y-2">
                  {fields.map(f => (
                    <div key={f.key} className="grid grid-cols-2 gap-3 items-center">
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        {f.label}
                        {f.required && <span className="text-red-500 ml-1">*</span>}
                        {f.hint && <span className="block text-xs text-gray-400 dark:text-gray-500">{f.hint}</span>}
                      </label>
                      <select
                        value={mapping[f.key] ?? ''}
                        onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— skip this field —</option>
                        {csvHeaders.map((h, i) => (
                          <option key={i} value={String(i)}>{h || `Column ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date format */}
              {fields.some(f => f.type === 'date') && (
                <div className="grid grid-cols-2 gap-3 items-center pt-1 border-t border-gray-100 dark:border-gray-700">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Date Format
                    <span className="block text-xs text-gray-400 dark:text-gray-500">Select if auto-detect fails</span>
                  </label>
                  <select
                    value={dateFormat}
                    onChange={e => setDateFormat(e.target.value)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DATE_FORMATS.map(df => <option key={df.value} value={df.value}>{df.label}</option>)}
                  </select>
                </div>
              )}

              {/* Preview table */}
              {csvRows.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview (first 5 rows)</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50">
                          {fields.filter(f => mapping[f.key] !== undefined && mapping[f.key] !== '').map(f => (
                            <th key={f.key} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                              {f.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {csvRows.slice(0, 5).map((row, ri) => {
                          const rec = parseRow(row);
                          return (
                            <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                              {fields.filter(f => mapping[f.key] !== undefined && mapping[f.key] !== '').map(f => (
                                <td key={f.key} className={`px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[180px] truncate ${!rec[f.key] && f.required ? 'text-red-400' : ''}`}>
                                  {rec[f.key] !== '' && rec[f.key] !== null ? String(rec[f.key]) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: REVIEW ── */}
          {step === STEP.REVIEW && analysis && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{analysis.valid.length}</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">New records</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{analysis.duplicates.length}</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">Duplicates found</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{analysis.invalid.length}</p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Invalid / skipped</p>
                </div>
              </div>

              {/* Duplicate handling */}
              {analysis.duplicates.length > 0 && (
                <div className="border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 bg-yellow-50 dark:bg-yellow-900/10 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                        {analysis.duplicates.length} duplicate{analysis.duplicates.length !== 1 ? 's' : ''} detected
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                        These records appear to already exist (matched by date + amount + title/name).
                        How should they be handled?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="dupAction" value="skip" checked={dupAction === 'skip'} onChange={() => setDupAction('skip')}
                        className="accent-yellow-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Skip duplicates</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="dupAction" value="include" checked={dupAction === 'include'} onChange={() => setDupAction('include')}
                        className="accent-yellow-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Import anyway</span>
                    </label>
                  </div>

                  {/* Expandable duplicate list */}
                  <button
                    onClick={() => setShowDupList(p => !p)}
                    className="flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-400 hover:underline"
                  >
                    {showDupList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showDupList ? 'Hide' : 'Show'} duplicate records
                  </button>
                  {showDupList && (
                    <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-yellow-200 dark:border-yellow-800 bg-white dark:bg-gray-800">
                      <table className="w-full text-xs">
                        <thead className="bg-yellow-50 dark:bg-yellow-900/30 sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-gray-500 dark:text-gray-400">Row</th>
                            {fields.slice(0, 4).map(f => (
                              <th key={f.key} className="px-2 py-1.5 text-left text-gray-500 dark:text-gray-400">{f.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-yellow-100 dark:divide-yellow-900/30">
                          {analysis.duplicates.map(({ row, rec }) => (
                            <tr key={row} className="hover:bg-yellow-50/50 dark:hover:bg-yellow-900/10">
                              <td className="px-2 py-1.5 text-gray-400">{row}</td>
                              {fields.slice(0, 4).map(f => (
                                <td key={f.key} className="px-2 py-1.5 text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                                  {rec[f.key] !== '' ? String(rec[f.key]) : '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Invalid rows */}
              {analysis.invalid.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowBadList(p => !p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      {analysis.invalid.length} row{analysis.invalid.length !== 1 ? 's' : ''} will be skipped (missing required fields)
                    </span>
                    {showBadList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showBadList && (
                    <div className="max-h-36 overflow-y-auto">
                      {analysis.invalid.map(({ row, reason }) => (
                        <div key={row} className="flex items-center gap-3 px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                          <span className="text-gray-400">Row {row}</span>
                          <span className="text-red-500">{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Zero valid warning */}
              {analysis.valid.length === 0 && (dupAction === 'skip' || analysis.duplicates.length === 0) && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl text-sm text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  No records will be imported. Go back to adjust the column mapping.
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: IMPORTING ── */}
          {step === STEP.IMPORTING && (
            <div className="py-12 flex flex-col items-center gap-4 text-center">
              <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Importing…</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please wait while records are being saved.</p>
              </div>
            </div>
          )}

          {/* ── STEP 4: DONE ── */}
          {step === STEP.DONE && result && (
            <div className="py-8 flex flex-col items-center gap-5 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">Import Complete!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here's a summary of what happened:</p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
                  <p className="text-2xl font-black text-green-600 dark:text-green-400">{result.imported}</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">Imported</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{result.skipped + (result.dupIncluded || 0)}</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">{result.skipped > 0 ? 'Dup skipped' : 'Dup imported'}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
                  <p className="text-2xl font-black text-red-600 dark:text-red-400">{result.failed}</p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Failed</p>
                </div>
              </div>
              {result.failed > 0 && (
                <p className="text-xs text-gray-400">Some records failed to save. Check your connection and try again.</p>
              )}
            </div>
          )}

        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {step === STEP.DONE ? (
            <div className="flex gap-2 ml-auto">
              <button onClick={reset} className={btnSecondary}>Import Another</button>
              <button onClick={handleClose} className={btnPrimary}>Done</button>
            </div>
          ) : step === STEP.IMPORTING ? (
            <div />
          ) : (
            <>
              <button
                onClick={step === STEP.UPLOAD ? handleClose : () => setStep(s => s - 1)}
                className={btnSecondary}
              >
                {step === STEP.UPLOAD ? 'Cancel' : '← Back'}
              </button>

              {step === STEP.UPLOAD && (
                <button disabled className={`${btnPrimary} opacity-40 cursor-not-allowed`}>
                  Next →
                </button>
              )}

              {step === STEP.MAP && (
                <button
                  onClick={analyse}
                  disabled={!fields.some(f => f.required && (mapping[f.key] !== undefined && mapping[f.key] !== ''))}
                  className={btnPrimary}
                >
                  Analyse →
                </button>
              )}

              {step === STEP.REVIEW && (
                <button
                  onClick={doImport}
                  disabled={analysis.valid.length === 0 && (dupAction === 'skip' || analysis.duplicates.length === 0)}
                  className={btnPrimary}
                >
                  {analysis?.duplicates.length > 0 && dupAction === 'skip'
                    ? `Import ${analysis.valid.length} records (skip ${analysis.duplicates.length} dup${analysis.duplicates.length !== 1 ? 's' : ''})`
                    : analysis?.duplicates.length > 0 && dupAction === 'include'
                    ? `Import all ${analysis.valid.length + analysis.duplicates.length} records`
                    : `Import ${analysis?.valid.length ?? 0} records`
                  }
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

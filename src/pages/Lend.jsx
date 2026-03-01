import { useState, useMemo, useEffect } from 'react';
import {
  HandCoins, Plus, Edit2, Trash2, X, Search,
  ArrowUp, ArrowDown, ChevronsUpDown, User, CheckCircle2, AlertCircle, ChevronDown,
  PanelRightClose, PanelRightOpen, Upload, Download, Zap,
} from 'lucide-react';
import CSVImportModal from '../components/CSVImportModal';
import QuickAddModal from '../components/QuickAddModal';
import { useBanks } from '../context/BankContext';
import { useLends } from '../context/LendContext';
import { useLoans } from '../context/LoanContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';

// ── Add / Edit Lend Modal ───────────────────────────────────────
const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  name: '',
  reason: '',
  returnedAmount: '',
  description: '',
};

function LendModal({ isOpen, lend, onClose, onSave, existingNames }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [nameSuggest, setNameSuggest] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(lend ? {
      date: lend.date,
      amount: String(lend.amount),
      name: lend.name,
      reason: lend.reason || '',
      returnedAmount: lend.returnedAmount ? String(lend.returnedAmount) : '',
      description: lend.description || '',
    } : EMPTY_FORM);
    setErrors({});
  }, [isOpen, lend]);

  if (!isOpen) return null;

  function validate() {
    const e = {};
    if (!form.date) e.date = 'Date is required';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.amount || +form.amount <= 0) e.amount = 'Amount must be positive';
    if (form.returnedAmount && +form.returnedAmount < 0) e.returnedAmount = 'Cannot be negative';
    if (form.returnedAmount && +form.returnedAmount > +form.amount) e.returnedAmount = 'Cannot exceed lent amount';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { setErrors({ global: 'Failed to save. Please try again.' }); }
    finally { setSaving(false); }
  }

  const suggestions = existingNames.filter(n =>
    n.toLowerCase().includes(form.name.toLowerCase()) && n !== form.name
  );

  function field(id, label, type = 'text', placeholder = '', required = false, extra = {}) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <input
          type={type}
          value={form[id]}
          onChange={e => { setForm(f => ({ ...f, [id]: e.target.value })); setErrors(er => ({ ...er, [id]: '' })); }}
          placeholder={placeholder}
          {...extra}
          className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors[id] ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {errors[id] && <p className="text-xs text-red-500 mt-1">{errors[id]}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-primary-600" />
            {lend ? 'Edit Lend Record' : 'New Lend Record'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date + Amount row */}
          <div className="grid grid-cols-2 gap-3">
            {field('date', 'Date', 'date', '', true)}
            {field('amount', 'Amount Lent', 'number', '0.00', true, { min: '0.01', step: '0.01' })}
          </div>

          {/* Name with autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Person Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })); setNameSuggest(true); }}
              onBlur={() => setTimeout(() => setNameSuggest(false), 150)}
              onFocus={() => setNameSuggest(true)}
              placeholder="e.g. Rahul, Priya..."
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            {nameSuggest && form.name && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-20 overflow-hidden">
                {suggestions.map(n => (
                  <button key={n} type="button"
                    onMouseDown={() => { setForm(f => ({ ...f, name: n })); setNameSuggest(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <User className="w-3.5 h-3.5 opacity-50" /> {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {field('reason', 'Reason', 'text', 'e.g. Emergency, Business, Travel...')}

          {/* Returned amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Returned Amount <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.returnedAmount}
              onChange={e => { setForm(f => ({ ...f, returnedAmount: e.target.value })); setErrors(er => ({ ...er, returnedAmount: '' })); }}
              placeholder="0.00"
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.returnedAmount ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.returnedAmount && <p className="text-xs text-red-500 mt-1">{errors.returnedAmount}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none transition-colors"
            />
          </div>

          {errors.global && <p className="text-xs text-red-500">{errors.global}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-colors">
              {saving ? 'Saving...' : lend ? 'Update' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sort helper ─────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40 flex-shrink-0" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3 h-3 text-primary-500 flex-shrink-0" />
    : <ArrowDown className="w-3 h-3 text-primary-500 flex-shrink-0" />;
}

// ── Main Lend Page ─────────────────────────────────────────────
const IMPORT_FIELDS = [
  { key: 'name',           label: 'Person / Name',           required: true,  type: 'text'   },
  { key: 'amount',         label: 'Amount Lent',             required: true,  type: 'number' },
  { key: 'date',           label: 'Date',                    required: true,  type: 'date'   },
  { key: 'reason',         label: 'Reason / Purpose',        required: false, type: 'text'   },
  { key: 'returnedAmount', label: 'Returned Amount',         required: false, type: 'number' },
  { key: 'description',   label: 'Description / Notes',     required: false, type: 'text'   },
];
function lendKey(r) { return `${String(r.name || '').toLowerCase()}|${r.date}|${r.amount}`; }
export default function Lend() {
  const { lends, loading, addLend, updateLend, deleteLend } = useLends();
  const { currency } = useCurrency();
  const { loans } = useLoans();
  const { addToast } = useToast();
  const { banks, selectedBankId } = useBanks();

  const [modalOpen, setModalOpen]         = useState(false);
  const [importOpen, setImportOpen]        = useState(false);
  const [quickAddOpen, setQuickAddOpen]   = useState({ open: false, row: null });
  const [editingLend, setEditingLend]     = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [search, setSearch]               = useState('');
  const [sortCol, setSortCol]             = useState(null);
  const [sortDir, setSortDir]             = useState('desc');
  const [personFilter, setPersonFilter]   = useState(null); // highlight from right panel
  const [panelOpen, setPanelOpen]         = useState(true); // collapsible on mobile
  const [chartOpen, setChartOpen]         = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(true);

  // Unique names for autocomplete — merged from both Lend and Loan pages
  const existingNames = useMemo(() => [
    ...new Set([
      ...lends.map(l => l.name),
      ...loans.map(l => l.name),
    ])
  ].filter(Boolean).sort(), [lends, loans]);

  // Sort
  function handleSort(col) {
    if (sortCol === col) {
      if (sortDir === 'desc') setSortDir('asc');
      else { setSortCol(null); setSortDir('desc'); }
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  // Filter + sort
  const filteredLends = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = q
      ? lends.filter(l =>
          l.name.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.date.includes(q) ||
          String(l.amount).includes(q)
        )
      : personFilter
        ? lends.filter(l => l.name === personFilter)
        : lends;

    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      let av, bv;
      if      (sortCol === 'date')           { av = a.date; bv = b.date; }
      else if (sortCol === 'amount')         { av = +a.amount; bv = +b.amount; }
      else if (sortCol === 'name')           { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (sortCol === 'reason')         { av = a.reason.toLowerCase(); bv = b.reason.toLowerCase(); }
      else if (sortCol === 'returnedAmount') { av = +a.returnedAmount; bv = +b.returnedAmount; }
      else if (sortCol === 'remaining')      { av = a.amount - a.returnedAmount; bv = b.amount - b.returnedAmount; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [lends, search, sortCol, sortDir, personFilter]);

  // Per-person summary (right panel)
  const personSummary = useMemo(() => {
    const map = {};
    lends.forEach(l => {
      if (!map[l.name]) map[l.name] = { name: l.name, totalLent: 0, totalReturned: 0 };
      map[l.name].totalLent     += +l.amount          || 0;
      map[l.name].totalReturned += +l.returnedAmount  || 0;
    });
    return Object.values(map)
      .map(p => ({ ...p, remaining: p.totalLent - p.totalReturned }))
      .sort((a, b) => b.remaining - a.remaining);
  }, [lends]);

  // Overall stats
  const stats = useMemo(() => ({
    totalLent:     lends.reduce((s, l) => s + (+l.amount          || 0), 0),
    totalReturned: lends.reduce((s, l) => s + (+l.returnedAmount  || 0), 0),
    totalRemaining:lends.reduce((s, l) => s + ((+l.amount || 0) - (+l.returnedAmount || 0)), 0),
    peopleCount:   new Set(lends.map(l => l.name)).size,
  }), [lends]);

  async function handleSave(data) {
    if (editingLend) { await updateLend(editingLend.id, data); addToast('Record updated!'); }
    else             { await addLend(data);                    addToast('Record added!');   }
  }

  async function handleDelete() {
    await deleteLend(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Record deleted');
  }

  function handleExport() {
    if (!filteredLends.length) { addToast('No records to export', 'info'); return; }
    const headers = ['Name', 'Date', 'Amount Lent', 'Returned Amount', 'Outstanding', 'Reason', 'Description'];
    const rows = filteredLends.map(l => [
      `"${(l.name || '').replace(/"/g, '""')}"`,
      l.date || '',
      l.amount || 0,
      l.returnedAmount || 0,
      (+l.amount || 0) - (+l.returnedAmount || 0),
      `"${(l.reason || '').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'lends.csv';
    a.click();
  }

  async function handleCSVImport(records) {
    for (const rec of records) {
      await addLend({
        name:           rec.name,
        amount:         +rec.amount,
        date:           rec.date,
        reason:         rec.reason || '',
        returnedAmount: rec.returnedAmount ? +rec.returnedAmount : 0,
        description:    rec.description || '',
      });
    }
    addToast(`Imported ${records.length} lend record${records.length !== 1 ? 's' : ''}!`);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  const SortBtn = ({ col, label, align = 'left' }) => (
    <button
      onClick={() => handleSort(col)}
      className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''} w-full hover:text-gray-900 dark:hover:text-white transition-colors ${sortCol === col ? 'text-primary-600 dark:text-primary-400' : ''}`}
    >
      {align === 'right' && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
      <span>{label}</span>
      {align !== 'right' && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
    </button>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-primary-600" /> Lend Tracker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track money you've lent and amounts received back</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => { setEditingLend(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> New Lend
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Lent</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats.totalLent, currency)}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-4">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">Returned</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{formatCurrency(stats.totalReturned, currency)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800 p-4">
          <p className="text-xs text-red-700 dark:text-red-400 font-medium">To Receive</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">{formatCurrency(stats.totalRemaining, currency)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">People</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">{stats.peopleCount}</p>
        </div>
      </div>

      {lends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center px-4">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
            <HandCoins className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No lend records yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">Start tracking money you lend to friends and family.</p>
          <button
            onClick={() => { setEditingLend(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add First Record
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ── Left: Main Table ── */}
          <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Search + active filter */}
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPersonFilter(null); }}
                  placeholder="Search name, reason, date (YYYY-MM-DD), amount..."
                  className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowSidePanel(o => !o)}
                title={showSidePanel ? 'Hide panel' : 'Show panel'}
                className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {showSidePanel
                  ? <PanelRightClose className="w-4 h-4" />
                  : <PanelRightOpen  className="w-4 h-4" />}
              </button>
              {personFilter && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-sm border border-primary-200 dark:border-primary-800 flex-shrink-0">
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[100px] truncate">{personFilter}</span>
                  <button onClick={() => setPersonFilter(null)} className="hover:text-primary-900"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            {/* Table header */}
            <div className="hidden lg:grid grid-cols-12 gap-1 px-5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <div className="col-span-2"><SortBtn col="date"           label="Date"     /></div>
              <div className="col-span-2"><SortBtn col="name"           label="Name"     /></div>
              <div className="col-span-1 flex justify-end"><SortBtn col="amount"         label="Lent"     align="right" /></div>
              <div className="col-span-2"><SortBtn col="reason"         label="Reason"   /></div>
              <div className="col-span-1 flex justify-end"><SortBtn col="returnedAmount" label="Returned" align="right" /></div>
              <div className="col-span-1 flex justify-end"><SortBtn col="remaining"      label="Due"      align="right" /></div>
              <div className="col-span-2 text-left pl-1">Description</div>
              <div className="col-span-1 text-right">Act.</div>
            </div>

            {/* Rows */}
            {filteredLends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No records found</p>
                {(search || personFilter) && (
                  <button onClick={() => { setSearch(''); setPersonFilter(null); }} className="mt-2 text-xs text-primary-600 hover:underline">Clear filter</button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredLends.map(lend => {
                  const remaining = (+lend.amount || 0) - (+lend.returnedAmount || 0);
                  const isSettled = remaining <= 0;
                  return (
                    <div key={lend.id}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-1 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center group">

                      {/* Date */}
                      <div className="lg:col-span-2 text-xs text-gray-500 dark:text-gray-400">{formatDate(lend.date)}</div>

                      {/* Name */}
                      <div className="lg:col-span-2">
                        <button
                          onClick={() => { setPersonFilter(p => p === lend.name ? null : lend.name); setSearch(''); }}
                          className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline truncate max-w-full text-left"
                          title={`Filter by ${lend.name}`}
                        >
                          {lend.name}
                        </button>
                      </div>

                      {/* Lent */}
                      <div className="lg:col-span-1 text-right">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(lend.amount, currency)}</span>
                      </div>

                      {/* Reason */}
                      <div className="lg:col-span-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate block" title={lend.reason}>{lend.reason || '—'}</span>
                      </div>

                      {/* Returned */}
                      <div className="lg:col-span-1 text-right">
                        {+lend.returnedAmount > 0
                          ? <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(lend.returnedAmount, currency)}</span>
                          : <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
                        }
                      </div>

                      {/* Remaining / Due */}
                      <div className="lg:col-span-1 text-right">
                        {isSettled
                          ? <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-600 dark:text-green-400"><CheckCircle2 className="w-3 h-3" /> Settled</span>
                          : <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(remaining, currency)}</span>
                        }
                      </div>

                      {/* Description */}
                      <div className="lg:col-span-2 pl-0 lg:pl-1">
                        {lend.description
                          ? <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1" title={lend.description}>{lend.description}</span>
                          : <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
                        }
                      </div>

                      {/* Actions */}
                      <div className="lg:col-span-1 flex items-center gap-1 justify-start lg:justify-end opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setQuickAddOpen({ open: true, row: lend })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                          title="Quick Add"
                        ><Zap className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={() => { setEditingLend(lend); setModalOpen(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          title="Edit"
                        ><Edit2 className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={() => setDeleteTarget(lend)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        ><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table footer totals */}
            {filteredLends.length > 0 && (
              <div className="hidden lg:grid grid-cols-12 gap-1 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                <div className="col-span-4">{filteredLends.length} record{filteredLends.length !== 1 ? 's' : ''}</div>
                <div className="col-span-1 text-right text-gray-900 dark:text-white">
                  {formatCurrency(filteredLends.reduce((s, l) => s + (+l.amount || 0), 0))}
                </div>
                <div className="col-span-2" />
                <div className="col-span-1 text-right text-green-600 dark:text-green-400">
                  {formatCurrency(filteredLends.reduce((s, l) => s + (+l.returnedAmount || 0), 0))}
                </div>
                <div className="col-span-1 text-right text-red-600 dark:text-red-400">
                  {formatCurrency(filteredLends.reduce((s, l) => s + ((+l.amount || 0) - (+l.returnedAmount || 0)), 0))}
                </div>
                <div className="col-span-3" />
              </div>
            )}
          </div>

          {/* ── Right: Person Summary Panel + Bar Chart ── */}
          {showSidePanel && (
          <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700"
              onClick={() => setPanelOpen(o => !o)}
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-primary-600" /> People Summary
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
            </button>

            {panelOpen && (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {/* Column labels */}
                <div className="grid grid-cols-4 gap-1 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/40">
                  <div className="col-span-2">Name</div>
                  <div className="text-right">Lent</div>
                  <div className="text-right">Due</div>
                </div>
                {personSummary.map(person => {
                  const isSettled = person.remaining <= 0;
                  const isActive  = personFilter === person.name;
                  return (
                    <button
                      key={person.name}
                      onClick={() => { setPersonFilter(p => p === person.name ? null : person.name); setSearch(''); }}
                      className={`w-full grid grid-cols-4 gap-1 px-4 py-3 text-left transition-colors ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                        {isSettled
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          : <AlertCircle   className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        }
                        <span className={`text-sm font-medium truncate ${isActive ? 'text-primary-700 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                          {person.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(person.totalLent, currency)}</span>
                      </div>
                      <div className="text-right">
                        {isSettled
                          ? <span className="text-xs font-semibold text-green-600 dark:text-green-400">Settled</span>
                          : <span className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(person.remaining, currency)}</span>
                        }
                      </div>
                    </button>
                  );
                })}
                {/* Panel totals */}
                <div className="grid grid-cols-4 gap-1 px-4 py-3 bg-gray-50 dark:bg-gray-700/40 text-xs font-black text-gray-700 dark:text-gray-200 uppercase">
                  <div className="col-span-2">Total</div>
                  <div className="text-right">{formatCurrency(stats.totalLent, currency)}</div>
                  <div className="text-right text-red-600 dark:text-red-400">{formatCurrency(stats.totalRemaining, currency)}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Bar Chart ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700"
              onClick={() => setChartOpen(o => !o)}
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Lent vs Returned</span>
              <div className="flex items-center gap-3">
                {chartOpen && (
                  <>
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-block w-3 h-2.5 rounded-sm bg-[#7c3aed]" /> Returned
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-block w-3 h-2.5 rounded-sm bg-[#c4b5fd]" /> Lent
                    </span>
                  </>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${chartOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {chartOpen && (
            <div className="px-4 py-3 space-y-3">
              {personSummary.map(person => {
                const isActive = personFilter === person.name;
                return (
                  <button
                    key={person.name}
                    onClick={() => { setPersonFilter(p => p === person.name ? null : person.name); setSearch(''); }}
                    className={`w-full text-left group rounded-lg px-1 py-0.5 transition-colors ${isActive ? 'ring-1 ring-primary-400' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold truncate max-w-[55%] ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {person.name}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {formatCurrency(person.totalReturned, currency)} / {formatCurrency(person.totalLent, currency)}
                      </span>
                    </div>
                    {/* Bar track */}
                    <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                      {/* Light purple — always full width (= their total lent) */}
                      <div
                        className="absolute left-0 top-0 h-full w-full rounded-full"
                        style={{ backgroundColor: '#c4b5fd' }}
                      />
                      {/* Dark purple — returned portion of their own lent */}
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                        style={{ width: `${person.totalLent > 0 ? (Math.min(person.totalReturned, person.totalLent) / person.totalLent) * 100 : 0}%`, backgroundColor: '#7c3aed' }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            )}
          </div>

          </div>
          )}
        </div>
      )}

      {/* Modals */}
      <LendModal
        isOpen={modalOpen}
        lend={editingLend}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        existingNames={existingNames}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Record"
        message={`Delete lend record for "${deleteTarget?.name}" (${formatCurrency(deleteTarget?.amount || 0, currency)})? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
      <QuickAddModal
        isOpen={quickAddOpen.open}
        onClose={() => setQuickAddOpen({ open: false, row: null })}
        sourcePage="lend"
        sourceRow={quickAddOpen.row}
      />
      <CSVImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        entityName="Lend Record"
        fields={IMPORT_FIELDS}
        existingRecords={lends}
        duplicateKeyFn={lendKey}
        onImport={handleCSVImport}
        accentColor="blue"
      />
    </div>
  );
}

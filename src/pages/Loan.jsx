import { useState, useMemo, useEffect } from 'react';
import {
  Wallet, Plus, Edit2, Trash2, X, Search,
  ArrowUp, ArrowDown, ChevronsUpDown, User, CheckCircle2, AlertCircle, ChevronDown,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { useLoans } from '../context/LoanContext';
import { useLends } from '../context/LendContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';

// ── Add / Edit Loan Modal ───────────────────────────────────────
const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  name: '',
  reason: '',
  paidAmount: '',
  description: '',
};

function LoanModal({ isOpen, loan, onClose, onSave, existingNames }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [nameSuggest, setNameSuggest] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(loan ? {
      date: loan.date,
      amount: String(loan.amount),
      name: loan.name,
      reason: loan.reason || '',
      paidAmount: loan.paidAmount ? String(loan.paidAmount) : '',
      description: loan.description || '',
    } : EMPTY_FORM);
    setErrors({});
  }, [isOpen, loan]);

  if (!isOpen) return null;

  function validate() {
    const e = {};
    if (!form.date) e.date = 'Date is required';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.amount || +form.amount <= 0) e.amount = 'Amount must be positive';
    if (form.paidAmount && +form.paidAmount < 0) e.paidAmount = 'Cannot be negative';
    if (form.paidAmount && +form.paidAmount > +form.amount) e.paidAmount = 'Cannot exceed borrowed amount';
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
            <Wallet className="w-5 h-5 text-primary-600" />
            {loan ? 'Edit Loan Record' : 'New Loan Record'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date + Amount row */}
          <div className="grid grid-cols-2 gap-3">
            {field('date', 'Date', 'date', '', true)}
            {field('amount', 'Amount Borrowed', 'number', '0.00', true, { min: '0.01', step: '0.01' })}
          </div>

          {/* Lender name with autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lender Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })); setNameSuggest(true); }}
              onBlur={() => setTimeout(() => setNameSuggest(false), 150)}
              onFocus={() => setNameSuggest(true)}
              placeholder="Who lent you money..."
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

          {/* Paid amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount Paid Back <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.paidAmount}
              onChange={e => { setForm(f => ({ ...f, paidAmount: e.target.value })); setErrors(er => ({ ...er, paidAmount: '' })); }}
              placeholder="0.00"
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.paidAmount ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.paidAmount && <p className="text-xs text-red-500 mt-1">{errors.paidAmount}</p>}
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
              {saving ? 'Saving...' : loan ? 'Update' : 'Add Record'}
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

// ── Main Loan Page ──────────────────────────────────────────────
export default function Loan() {
  const { loans, loading, addLoan, updateLoan, deleteLoan } = useLoans();
  const { currency } = useCurrency();
  const { lends } = useLends();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen]         = useState(false);
  const [editingLoan, setEditingLoan]     = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [search, setSearch]               = useState('');
  const [sortCol, setSortCol]             = useState(null);
  const [sortDir, setSortDir]             = useState('desc');
  const [personFilter, setPersonFilter]   = useState(null);
  const [panelOpen, setPanelOpen]         = useState(true);
  const [chartOpen, setChartOpen]         = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(true);

  // Unique names for autocomplete — merged from both Loan and Lend pages
  const existingNames = useMemo(() => [
    ...new Set([
      ...loans.map(l => l.name),
      ...lends.map(l => l.name),
    ])
  ].filter(Boolean).sort(), [loans, lends]);

  function handleSort(col) {
    if (sortCol === col) {
      if (sortDir === 'desc') setSortDir('asc');
      else { setSortCol(null); setSortDir('desc'); }
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  const filteredLoans = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = q
      ? loans.filter(l =>
          l.name.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.date.includes(q) ||
          String(l.amount).includes(q)
        )
      : personFilter
        ? loans.filter(l => l.name === personFilter)
        : loans;

    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      let av, bv;
      if      (sortCol === 'date')       { av = a.date; bv = b.date; }
      else if (sortCol === 'amount')     { av = +a.amount; bv = +b.amount; }
      else if (sortCol === 'name')       { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (sortCol === 'reason')     { av = a.reason.toLowerCase(); bv = b.reason.toLowerCase(); }
      else if (sortCol === 'paidAmount') { av = +a.paidAmount; bv = +b.paidAmount; }
      else if (sortCol === 'remaining')  { av = a.amount - a.paidAmount; bv = b.amount - b.paidAmount; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [loans, search, sortCol, sortDir, personFilter]);

  // Per-lender summary (right panel)
  const lenderSummary = useMemo(() => {
    const map = {};
    loans.forEach(l => {
      if (!map[l.name]) map[l.name] = { name: l.name, totalBorrowed: 0, totalPaid: 0 };
      map[l.name].totalBorrowed += +l.amount     || 0;
      map[l.name].totalPaid     += +l.paidAmount || 0;
    });
    return Object.values(map)
      .map(p => ({ ...p, remaining: p.totalBorrowed - p.totalPaid }))
      .sort((a, b) => b.remaining - a.remaining);
  }, [loans]);

  const stats = useMemo(() => ({
    totalBorrowed: loans.reduce((s, l) => s + (+l.amount     || 0), 0),
    totalPaid:     loans.reduce((s, l) => s + (+l.paidAmount || 0), 0),
    totalRemaining:loans.reduce((s, l) => s + ((+l.amount || 0) - (+l.paidAmount || 0)), 0),
    lendersCount:  new Set(loans.map(l => l.name)).size,
  }), [loans]);

  async function handleSave(data) {
    if (editingLoan) { await updateLoan(editingLoan.id, data); addToast('Record updated!'); }
    else             { await addLoan(data);                    addToast('Record added!');   }
  }

  async function handleDelete() {
    await deleteLoan(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Record deleted');
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
            <Wallet className="w-6 h-6 text-primary-600" /> Loan Tracker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track money you've borrowed and amounts paid back</p>
        </div>
        <button
          onClick={() => { setEditingLoan(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Loan
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Borrowed</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats.totalBorrowed, currency)}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-4">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">Paid Back</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{formatCurrency(stats.totalPaid, currency)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800 p-4">
          <p className="text-xs text-red-700 dark:text-red-400 font-medium">To Pay</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">{formatCurrency(stats.totalRemaining, currency)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Lenders</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">{stats.lendersCount}</p>
        </div>
      </div>

      {loans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center px-4">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
            <Wallet className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No loan records yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">Start tracking money you've borrowed from others.</p>
          <button
            onClick={() => { setEditingLoan(null); setModalOpen(true); }}
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
              {personFilter && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-sm border border-primary-200 dark:border-primary-800 flex-shrink-0">
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[100px] truncate">{personFilter}</span>
                  <button onClick={() => setPersonFilter(null)} className="hover:text-primary-900"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
              <button
                onClick={() => setShowSidePanel(o => !o)}
                title={showSidePanel ? 'Hide panel' : 'Show panel'}
                className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {showSidePanel
                  ? <PanelRightClose className="w-4 h-4" />
                  : <PanelRightOpen  className="w-4 h-4" />}
              </button>
            </div>

            {/* Table header */}
            <div className="hidden lg:grid grid-cols-12 gap-1 px-5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <div className="col-span-2"><SortBtn col="date"       label="Date"      /></div>
              <div className="col-span-2"><SortBtn col="name"       label="Name"      /></div>
              <div className="col-span-1 flex justify-end"><SortBtn col="amount"      label="Borrowed"  align="right" /></div>
              <div className="col-span-2"><SortBtn col="reason"     label="Reason"    /></div>
              <div className="col-span-1 flex justify-end"><SortBtn col="paidAmount"  label="Paid"      align="right" /></div>
              <div className="col-span-1 flex justify-end"><SortBtn col="remaining"   label="Due"       align="right" /></div>
              <div className="col-span-2 text-left pl-1">Description</div>
              <div className="col-span-1 text-right">Act.</div>
            </div>

            {/* Rows */}
            {filteredLoans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No records found</p>
                {(search || personFilter) && (
                  <button onClick={() => { setSearch(''); setPersonFilter(null); }} className="mt-2 text-xs text-primary-600 hover:underline">Clear filter</button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredLoans.map(loan => {
                  const remaining = (+loan.amount || 0) - (+loan.paidAmount || 0);
                  const isSettled = remaining <= 0;
                  return (
                    <div key={loan.id}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-1 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center group">

                      {/* Date */}
                      <div className="lg:col-span-2 text-xs text-gray-500 dark:text-gray-400">{formatDate(loan.date)}</div>

                      {/* Name */}
                      <div className="lg:col-span-2">
                        <button
                          onClick={() => { setPersonFilter(p => p === loan.name ? null : loan.name); setSearch(''); }}
                          className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline truncate max-w-full text-left"
                          title={`Filter by ${loan.name}`}
                        >
                          {loan.name}
                        </button>
                      </div>

                      {/* Borrowed */}
                      <div className="lg:col-span-1 text-right">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(loan.amount, currency)}</span>
                      </div>

                      {/* Reason */}
                      <div className="lg:col-span-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate block" title={loan.reason}>{loan.reason || '—'}</span>
                      </div>

                      {/* Paid */}
                      <div className="lg:col-span-1 text-right">
                        {+loan.paidAmount > 0
                          ? <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(loan.paidAmount, currency)}</span>
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
                        {loan.description
                          ? <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1" title={loan.description}>{loan.description}</span>
                          : <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
                        }
                      </div>

                      {/* Actions */}
                      <div className="lg:col-span-1 flex items-center gap-1 justify-start lg:justify-end opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingLoan(loan); setModalOpen(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          title="Edit"
                        ><Edit2 className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={() => setDeleteTarget(loan)}
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
            {filteredLoans.length > 0 && (
              <div className="hidden lg:grid grid-cols-12 gap-1 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                <div className="col-span-4">{filteredLoans.length} record{filteredLoans.length !== 1 ? 's' : ''}</div>
                <div className="col-span-1 text-right text-gray-900 dark:text-white">
                  {formatCurrency(filteredLoans.reduce((s, l) => s + (+l.amount || 0), 0))}
                </div>
                <div className="col-span-2" />
                <div className="col-span-1 text-right text-green-600 dark:text-green-400">
                  {formatCurrency(filteredLoans.reduce((s, l) => s + (+l.paidAmount || 0), 0))}
                </div>
                <div className="col-span-1 text-right text-red-600 dark:text-red-400">
                  {formatCurrency(filteredLoans.reduce((s, l) => s + ((+l.amount || 0) - (+l.paidAmount || 0)), 0))}
                </div>
                <div className="col-span-3" />
              </div>
            )}
          </div>

          {/* ── Right: Lender Summary Panel + Bar Chart ── */}
          {showSidePanel && (
          <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">

            {/* Lender Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setPanelOpen(o => !o)}
              >
                <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-600" /> Lender Summary
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
              </button>

              {panelOpen && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  <div className="grid grid-cols-4 gap-1 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/40">
                    <div className="col-span-2">Name</div>
                    <div className="text-right">Borrowed</div>
                    <div className="text-right">Due</div>
                  </div>
                  {lenderSummary.map(person => {
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
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(person.totalBorrowed, currency)}</span>
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
                  <div className="grid grid-cols-4 gap-1 px-4 py-3 bg-gray-50 dark:bg-gray-700/40 text-xs font-black text-gray-700 dark:text-gray-200 uppercase">
                    <div className="col-span-2">Total</div>
                    <div className="text-right">{formatCurrency(stats.totalBorrowed, currency)}</div>
                    <div className="text-right text-red-600 dark:text-red-400">{formatCurrency(stats.totalRemaining, currency)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Bar Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setChartOpen(o => !o)}
              >
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Borrowed vs Paid</span>
                <div className="flex items-center gap-3">
                  {chartOpen && (
                    <>
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-block w-3 h-2.5 rounded-sm bg-[#7c3aed]" /> Paid
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-block w-3 h-2.5 rounded-sm bg-[#c4b5fd]" /> Borrowed
                      </span>
                    </>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${chartOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {chartOpen && (
              <div className="px-4 py-3 space-y-3">
                {lenderSummary.map(person => {
                  const isActive = personFilter === person.name;
                  return (
                    <button
                      key={person.name}
                      onClick={() => { setPersonFilter(p => p === person.name ? null : person.name); setSearch(''); }}
                      className={`w-full text-left rounded-lg px-1 py-0.5 transition-colors ${isActive ? 'ring-1 ring-primary-400' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold truncate max-w-[55%] ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {person.name}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {formatCurrency(person.totalPaid, currency)} / {formatCurrency(person.totalBorrowed, currency)}
                        </span>
                      </div>
                      <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                        <div
                          className="absolute left-0 top-0 h-full w-full rounded-full"
                          style={{ backgroundColor: '#c4b5fd' }}
                        />
                        <div
                          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                          style={{ width: `${person.totalBorrowed > 0 ? (Math.min(person.totalPaid, person.totalBorrowed) / person.totalBorrowed) * 100 : 0}%`, backgroundColor: '#7c3aed' }}
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
      <LoanModal
        isOpen={modalOpen}
        loan={editingLoan}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        existingNames={existingNames}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Record"
        message={`Delete loan record for "${deleteTarget?.name}" (${formatCurrency(deleteTarget?.amount || 0, currency)})? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  );
}

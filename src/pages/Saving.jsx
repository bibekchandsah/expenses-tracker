import { useState, useMemo, useEffect } from 'react';
import {
  PiggyBank, Plus, Edit2, Trash2, X, Search,
  ArrowUp, ArrowDown, ChevronsUpDown,
  PanelRightClose, PanelRightOpen, Upload, Download, Zap,
} from 'lucide-react';
import CSVImportModal from '../components/CSVImportModal';
import QuickAddModal from '../components/QuickAddModal';
import { useBanks } from '../context/BankContext';
import { useSavings } from '../context/SavingContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';
import { useActiveYear } from '../context/ActiveYearContext';
import YearSelector from '../components/ui/YearSelector';

const todayStr = () => new Date().toISOString().split('T')[0];

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3 h-3 text-primary-500" />
    : <ArrowDown className="w-3 h-3 text-primary-500" />;
}

function SavingModal({ isOpen, entry, onClose, onSave }) {
  const [form, setForm] = useState({ date: todayStr(), amount: '', expendOn: '', description: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(entry
      ? { date: entry.date, amount: String(entry.amount), expendOn: entry.expendOn || '', description: entry.description || '' }
      : { date: todayStr(), amount: '', expendOn: '', description: '' });
    setErrors({});
  }, [isOpen, entry]);

  if (!isOpen) return null;
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  function validate() {
    const e = {};
    if (!form.date) e.date = 'Date is required';
    if (!form.amount || +form.amount <= 0) e.amount = 'Amount must be positive';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-primary-600" />
            {entry ? 'Edit Saving' : 'New Saving'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.global && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{errors.global}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`} />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount <span className="text-red-400">*</span></label>
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00"
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.amount ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`} />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expend On</label>
            <input type="text" value={form.expendOn} onChange={e => set('expendOn', e.target.value)} placeholder="e.g. Emergency fund, Vacation..."
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes..."
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? 'Saving...' : entry ? 'Save Changes' : 'Add Saving'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SourceModal({ isOpen, source, onClose, onSave }) {
  const [form, setForm] = useState({ date: todayStr(), amount: '', description: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(source
      ? { date: source.date, amount: String(source.amount), description: source.description || '' }
      : { date: todayStr(), amount: '', description: '' });
    setErrors({});
  }, [isOpen, source]);

  if (!isOpen) return null;
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  function validate() {
    const e = {};
    if (!form.date) e.date = 'Date is required';
    if (!form.amount || +form.amount <= 0) e.amount = 'Amount must be positive';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { setErrors({ global: 'Failed to save.' }); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {source ? 'Edit Source' : 'New Source'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.global && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{errors.global}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`} />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount <span className="text-red-400">*</span></label>
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00"
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.amount ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`} />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Salary, Freelance..."
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? 'Saving...' : source ? 'Save' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const IMPORT_FIELDS = [
  { key: 'expendOn',    label: 'Saved For / Purpose',  required: false, type: 'text'   },
  { key: 'amount',      label: 'Amount',               required: true,  type: 'number' },
  { key: 'date',        label: 'Date',                 required: true,  type: 'date'   },
  { key: 'description', label: 'Description / Notes', required: false, type: 'text'   },
];
function savingKey(r) { return `${String(r.expendOn || '').toLowerCase()}|${r.date}|${r.amount}`; }

export default function Saving() {
  const { savings, sources, loading, addSaving, updateSaving, deleteSaving, addSource, updateSource, deleteSource } = useSavings();
  const { currency } = useCurrency();
  const { addToast } = useToast();
  const { banks, selectedBankId } = useBanks();
  const { activeYear } = useActiveYear();

  const [showSidePanel, setShowSidePanel] = useState(true);
  const [importOpen, setImportOpen]        = useState(false);
  const [quickAddOpen, setQuickAddOpen]   = useState({ open: false, row: null });
  const [savingModal, setSavingModal]     = useState({ open: false, item: null });
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [sourceModal, setSourceModal]     = useState({ open: false, item: null });
  const [deleteSourceTarget, setDeleteSourceTarget] = useState(null);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [search,  setSearch]  = useState('');
  const [yearFilter, setYearFilter] = useState(() => activeYear);

  useEffect(() => { setYearFilter(activeYear); }, [activeYear]);

  function handleSort(col) {
    if (sortCol === col) {
      if (sortDir === 'desc') setSortDir('asc');
      else { setSortCol(null); setSortDir('desc'); }
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  const filteredSavings = useMemo(() => {
    let rows = savings.filter(r => r.date?.startsWith(String(yearFilter)));
    const q = search.toLowerCase();
    if (q) rows = rows.filter(r =>
      r.expendOn?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      String(r.amount).includes(q) ||
      r.date?.includes(q)
    );
    if (sortCol) {
      rows.sort((a, b) => {
        const av = sortCol === 'amount' ? +a.amount : (a[sortCol] || '');
        const bv = sortCol === 'amount' ? +b.amount : (b[sortCol] || '');
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [savings, sortCol, sortDir, search, yearFilter]);

  const totalSpent   = useMemo(() => savings.reduce((s, r) => s + (+r.amount || 0), 0), [savings]);
  const totalSourced = useMemo(() => sources.reduce((s, r) => s + (+r.amount || 0), 0), [sources]);
  const netBalance   = totalSourced - totalSpent;

  async function handleSave(form) {
    if (savingModal.item) { await updateSaving(savingModal.item.id, form); addToast('Record updated!'); }
    else                  { await addSaving(form);                         addToast('Record added!');   }
  }
  async function handleDelete() {
    await deleteSaving(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Record deleted');
  }

  function handleExport() {
    if (!filteredSavings.length) { addToast('No records to export', 'info'); return; }
    const headers = ['Date', 'Saved For', 'Amount', 'Description'];
    const rows = filteredSavings.map(r => [
      r.date || '',
      `"${(r.expendOn || '').replace(/"/g, '""')}"`,
      r.amount || 0,
      `"${(r.description || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'savings.csv';
    a.click();
  }

  async function handleCSVImport(records) {
    for (const rec of records) {
      await addSaving({
        expendOn:    rec.expendOn || '',
        amount:      +rec.amount,
        date:        rec.date,
        description: rec.description || '',
      });
    }
    addToast(`Imported ${records.length} saving record${records.length !== 1 ? 's' : ''}!`);
  }
  async function handleSaveSource(form) {
    if (sourceModal.item) { await updateSource(sourceModal.item.id, form); addToast('Source updated!'); }
    else                  { await addSource(form);                         addToast('Source added!');   }
  }
  async function handleDeleteSource() {
    await deleteSource(deleteSourceTarget.id);
    setDeleteSourceTarget(null);
    addToast('Source deleted');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-primary-600" /> Personal Saving
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track savings and their sources</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <YearSelector year={yearFilter} onChange={yr => setYearFilter(yr)} />
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
            onClick={() => setSavingModal({ open: true, item: null })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> New Saving
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Spent</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totalSpent, currency)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{savings.length} record{savings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-4">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">Total Sourced</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{formatCurrency(totalSourced, currency)}</p>
          <p className="text-xs text-green-600/60 dark:text-green-600 mt-0.5">{sources.length} source{sources.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${netBalance >= 0 ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
          <p className={`text-xs font-medium ${netBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>Net Balance</p>
          <p className={`text-lg font-bold mt-1 ${netBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>{formatCurrency(netBalance, currency)}</p>
          <p className={`text-xs mt-0.5 ${netBalance >= 0 ? 'text-blue-600/60 dark:text-blue-600' : 'text-red-600/60 dark:text-red-600'}`}>Sources minus Spent</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-200 dark:border-purple-800 p-4">
          <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Savings Rate</p>
          <p className="text-lg font-bold text-purple-700 dark:text-purple-400 mt-1">
            {totalSourced > 0 ? `${Math.round((netBalance / totalSourced) * 100)}%` : '-'}
          </p>
          <p className="text-xs text-purple-600/60 dark:text-purple-600 mt-0.5">Net / Sourced</p>
        </div>
      </div>

      {savings.length === 0 && sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center px-4">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
            <PiggyBank className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No savings yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">Start tracking your savings and where your money comes from.</p>
          <button
            onClick={() => setSavingModal({ open: true, item: null })}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add First Record
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* Main Table */}
          <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Search toolbar */}
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search date (YYYY-MM-DD), amount, expend on, description..."
                  className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setSavingModal({ open: true, item: null })}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
              <button
                onClick={() => setShowSidePanel(o => !o)}
                title={showSidePanel ? 'Hide sources panel' : 'Show sources panel'}
                className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {showSidePanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </button>
            </div>

            {/* Table header */}
            <div className="hidden lg:grid grid-cols-12 gap-1 px-5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <div className="col-span-2"><SortBtn col="date"     label="Date"      /></div>
              <div className="col-span-2 flex justify-end"><SortBtn col="amount"   label="Amount"    align="right" /></div>
              <div className="col-span-3"><SortBtn col="expendOn" label="Expend On" /></div>
              <div className="col-span-4 pl-1">Description</div>
              <div className="col-span-1 text-right">Act.</div>
            </div>

            {/* Rows */}
            {filteredSavings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No records found</p>
                {search && <button onClick={() => setSearch('')} className="mt-2 text-xs text-primary-600 hover:underline">Clear filter</button>}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredSavings.map(row => (
                  <div key={row.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-1 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center group">
                    <div className="lg:col-span-2 text-xs text-gray-500 dark:text-gray-400">{formatDate(row.date)}</div>
                    <div className="lg:col-span-2 text-right">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(row.amount, currency)}</span>
                    </div>
                    <div className="lg:col-span-3">
                      {row.expendOn
                        ? <span className="inline-block px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs truncate max-w-full" title={row.expendOn}>{row.expendOn}</span>
                        : <span className="text-gray-300 dark:text-gray-600 text-sm">-</span>
                      }
                    </div>
                    <div className="lg:col-span-4 pl-0 lg:pl-1">
                      {row.description
                        ? <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1" title={row.description}>{row.description}</span>
                        : <span className="text-gray-300 dark:text-gray-600 text-sm">-</span>
                      }
                    </div>
                    <div className="lg:col-span-1 flex items-center gap-1 justify-start lg:justify-end opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setQuickAddOpen({ open: true, row: row })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                        title="Quick Add"
                      ><Zap className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => setSavingModal({ open: true, item: row })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        title="Edit"
                      ><Edit2 className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => setDeleteTarget(row)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer totals */}
            {filteredSavings.length > 0 && (
              <div className="hidden lg:grid grid-cols-12 gap-1 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                <div className="col-span-2">{filteredSavings.length} record{filteredSavings.length !== 1 ? 's' : ''}{search && ` (of ${savings.length})`}</div>
                <div className="col-span-2 text-right text-gray-900 dark:text-white">
                  {formatCurrency(filteredSavings.reduce((s, r) => s + (+r.amount || 0), 0))}
                </div>
                <div className="col-span-8" />
              </div>
            )}
          </div>

          {/* Right Panel: Saving Sources */}
          {showSidePanel && (
            <div className="w-full lg:w-72 flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Saved Money From</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Sources of savings</p>
                </div>
                <button
                  onClick={() => setSourceModal({ open: true, item: null })}
                  className="p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  title="Add source"
                ><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <div className="px-4 py-2 bg-green-50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-900/30 flex justify-between text-xs">
                <span className="text-green-700 dark:text-green-400 font-medium">{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
                <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(totalSourced, currency)}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-[520px] overflow-y-auto">
                {sources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <p className="text-sm text-gray-400 dark:text-gray-500">No sources yet.</p>
                    <button onClick={() => setSourceModal({ open: true, item: null })} className="mt-2 text-xs text-primary-600 hover:underline">Add your first source</button>
                  </div>
                ) : sources.map(src => (
                  <div key={src.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 group transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(src.amount, currency)}</span>
                          <span className="text-xs text-gray-400">{formatDate(src.date)}</span>
                        </div>
                        {src.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={src.description}>{src.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => setSourceModal({ open: true, item: src })}
                          className="p-1 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => setDeleteSourceTarget(src)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <SavingModal
        isOpen={savingModal.open}
        entry={savingModal.item}
        onClose={() => setSavingModal({ open: false, item: null })}
        onSave={handleSave}
      />
      <SourceModal
        isOpen={sourceModal.open}
        source={sourceModal.item}
        onClose={() => setSourceModal({ open: false, item: null })}
        onSave={handleSaveSource}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete saving record?"
        message={deleteTarget ? `Amount: ${formatCurrency(deleteTarget.amount, currency)} on ${formatDate(deleteTarget.date)}` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        isOpen={!!deleteSourceTarget}
        title="Delete source record?"
        message={deleteSourceTarget ? `Amount: ${formatCurrency(deleteSourceTarget.amount, currency)} on ${formatDate(deleteSourceTarget.date)}` : ''}
        onConfirm={handleDeleteSource}
        onCancel={() => setDeleteSourceTarget(null)}
      />
      <QuickAddModal
        isOpen={quickAddOpen.open}
        onClose={() => setQuickAddOpen({ open: false, row: null })}
        sourcePage="saving"
        sourceRow={quickAddOpen.row}
      />
      <CSVImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        entityName="Saving Record"
        fields={IMPORT_FIELDS}
        existingRecords={savings}
        duplicateKeyFn={savingKey}
        onImport={handleCSVImport}
        accentColor="blue"
      />
    </div>
  );
}

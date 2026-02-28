import { useState, useMemo, useEffect } from 'react';
import {
  Building2, Plus, Edit2, Trash2, X, ChevronDown,
  ArrowDownCircle, ArrowUpCircle, Wallet, Download,
  ChevronsUpDown, Check, Settings, Search, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useBanks } from '../context/BankContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';

// ── Add/Edit Bank Modal ─────────────────────────────────────────
function BankModal({ isOpen, bank, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', openingBalance: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) setForm(bank ? { name: bank.name, openingBalance: String(bank.openingBalance || 0) } : { name: '', openingBalance: '' });
    setError('');
  }, [isOpen, bank]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Bank name is required'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            {bank ? 'Edit Bank' : 'Add New Bank'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank / Account Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError(''); }}
              placeholder="e.g. HDFC Savings, Cash, Wallet..."
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Opening Balance <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.openingBalance}
              onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1">Starting balance before any transactions</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-colors">
              {saving ? 'Saving...' : bank ? 'Update' : 'Add Bank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add/Edit Entry Modal ────────────────────────────────────────
function EntryModal({ isOpen, entry, bankName, onClose, onSave }) {
  const EMPTY = { date: new Date().toISOString().split('T')[0], description: '', deposit: '', withdraw: '' };
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState('deposit'); // 'deposit' | 'withdraw'

  useEffect(() => {
    if (!isOpen) return;
    if (entry) {
      const t = +entry.deposit > 0 ? 'deposit' : 'withdraw';
      setType(t);
      setForm({ date: entry.date, description: entry.description, deposit: entry.deposit ? String(entry.deposit) : '', withdraw: entry.withdraw ? String(entry.withdraw) : '' });
    } else {
      setType('deposit');
      setForm(EMPTY);
    }
    setErrors({});
  }, [isOpen, entry]);

  if (!isOpen) return null;

  function validate() {
    const e = {};
    if (!form.date) e.date = 'Date is required';
    if (!form.description.trim()) e.description = 'Description is required';
    const val = type === 'deposit' ? +form.deposit : +form.withdraw;
    if (!val || val <= 0) e.amount = 'Amount must be a positive number';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({
        date: form.date,
        description: form.description.trim(),
        deposit: type === 'deposit' ? +form.deposit : 0,
        withdraw: type === 'withdraw' ? +form.withdraw : 0,
      });
      onClose();
    } catch {
      setErrors({ global: 'Failed to save entry. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{entry ? 'Edit Entry' : 'New Entry'}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{bankName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Deposit / Withdraw toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <button
              type="button"
              onClick={() => { setType('deposit'); setErrors({}); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${type === 'deposit' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              <ArrowDownCircle className="w-4 h-4" /> Deposit
            </button>
            <button
              type="button"
              onClick={() => { setType('withdraw'); setErrors({}); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${type === 'withdraw' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              <ArrowUpCircle className="w-4 h-4" /> Withdraw
            </button>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={e => { setForm(f => ({ ...f, date: e.target.value })); setErrors(err => ({ ...err, date: '' })); }}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <input
              type="text"
              value={form.description}
              onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setErrors(err => ({ ...err, description: '' })); }}
              placeholder={type === 'deposit' ? 'e.g. Salary, Transfer received...' : 'e.g. Bill payment, ATM withdrawal...'}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.description ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {type === 'deposit' ? 'Deposit Amount *' : 'Withdraw Amount *'}
            </label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium ${type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                {type === 'deposit' ? '+' : '−'}
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={type === 'deposit' ? form.deposit : form.withdraw}
                onChange={e => {
                  setForm(f => type === 'deposit' ? { ...f, deposit: e.target.value, withdraw: '' } : { ...f, withdraw: e.target.value, deposit: '' });
                  setErrors(err => ({ ...err, amount: '' }));
                }}
                placeholder="0.00"
                className={`w-full pl-7 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.amount ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
          </div>

          {errors.global && <p className="text-xs text-red-500">{errors.global}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-2.5 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 ${type === 'deposit' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {saving ? 'Saving...' : entry ? 'Update' : `Add ${type === 'deposit' ? 'Deposit' : 'Withdrawal'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── CSV Export ──────────────────────────────────────────────────
function exportBankCSV(entries, bankName, openingBalance) {
  const headers = ['Date', 'Description', 'Deposit', 'Withdraw', 'Closing Balance'];
  const rows = entries.map(e => [e.date, `"${e.description.replace(/"/g, '""')}"`, e.deposit || '', e.withdraw || '', e.closingBalance?.toFixed(2)]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${bankName}-statement.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Main Bank Page ──────────────────────────────────────────────
export default function Bank() {
  const {
    banks, banksLoading, selectedBankId, setSelectedBankId, selectedBank,
    entries, entriesLoading, addBank, updateBank, deleteBank, addEntry, updateEntry, deleteEntry,
  } = useBanks();
  const { addToast } = useToast();

  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [deleteBankTarget, setDeleteBankTarget] = useState(null);

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState(null);

  const [monthPage, setMonthPage] = useState(0); // 0 = newest month
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);   // null | 'date'|'description'|'deposit'|'withdraw'|'balance'
  const [sortDir, setSortDir] = useState('asc');  // 'asc' | 'desc'
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Reset to newest month + clear search when bank changes
  useEffect(() => { setMonthPage(0); setShowAll(false); setSearch(''); setSortCol(null); }, [selectedBankId]);

  function handleSort(col) {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortCol(null); setSortDir('asc'); } // third click resets
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-primary-500" />
      : <ArrowDown className="w-3 h-3 text-primary-500" />;
  }

  // Group entries by month (newest month first).
  // Within each month entries are reversed for display (newest entry at top).
  // closingBalance on each entry is already computed oldest-first in context.
  const months = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const key = e.date.slice(0, 7); // "YYYY-MM"
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a)) // newest month first
      .map(key => {
        const [y, m] = key.split('-');
        const label = new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const monthEntries = map[key];
        const totalDeposit  = monthEntries.reduce((s, e) => s + (+e.deposit  || 0), 0);
        const totalWithdraw = monthEntries.reduce((s, e) => s + (+e.withdraw || 0), 0);
        return { key, label, entries: [...monthEntries].reverse(), totalDeposit, totalWithdraw };
      });
  }, [entries]);

  const currentMonth = months[monthPage] ?? null;

  // Search: filter all entries, then re-group into months
  const query = search.trim().toLowerCase();
  const searchActive = query.length > 0;

  // Apply per-month entry sorting
  function sortEntries(arr) {
    if (!sortCol) return arr;
    return [...arr].sort((a, b) => {
      let av, bv;
      if (sortCol === 'date')        { av = a.date; bv = b.date; }
      else if (sortCol === 'description') { av = a.description.toLowerCase(); bv = b.description.toLowerCase(); }
      else if (sortCol === 'deposit')  { av = +a.deposit  || 0; bv = +b.deposit  || 0; }
      else if (sortCol === 'withdraw') { av = +a.withdraw || 0; bv = +b.withdraw || 0; }
      else if (sortCol === 'balance')  { av = a.closingBalance; bv = b.closingBalance; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const filteredMonths = useMemo(() => {
    if (!searchActive) return months;
    return months
      .map(month => ({
        ...month,
        entries: month.entries.filter(e =>
          e.description.toLowerCase().includes(query) ||
          e.date.includes(query) ||
          String(e.deposit  || '').includes(query) ||
          String(e.withdraw || '').includes(query)
        ),
      }))
      .filter(month => month.entries.length > 0);
  }, [months, query, searchActive]);

  // Bank stats
  const stats = useMemo(() => {
    const totalDeposit = entries.reduce((s, e) => s + (+e.deposit || 0), 0);
    const totalWithdraw = entries.reduce((s, e) => s + (+e.withdraw || 0), 0);
    const currentBalance = entries.length > 0
      ? entries[entries.length - 1].closingBalance
      : (selectedBank?.openingBalance || 0);
    return { totalDeposit, totalWithdraw, currentBalance };
  }, [entries, selectedBank]);

  async function handleSaveBank(data) {
    if (editingBank) { await updateBank(editingBank.id, { name: data.name, openingBalance: +data.openingBalance || 0 }); addToast('Bank updated!'); }
    else { await addBank(data); addToast('Bank added!'); }
  }

  async function handleDeleteBank() {
    await deleteBank(deleteBankTarget.id);
    setDeleteBankTarget(null);
    addToast('Bank deleted', 'success');
  }

  async function handleSaveEntry(data) {
    if (editingEntry) { await updateEntry(editingEntry.id, data); addToast('Entry updated!'); }
    else { await addEntry(data); addToast('Entry added!'); }
  }

  async function handleDeleteEntry() {
    await deleteEntry(deleteEntryTarget.id);
    setDeleteEntryTarget(null);
    addToast('Entry deleted', 'success');
  }

  if (banksLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-600" /> Bank Statements
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage bank accounts and track transactions</p>
        </div>
        <button
          onClick={() => { setEditingBank(null); setBankModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Bank
        </button>
      </div>

      {/* ── No banks empty state ── */}
      {banks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center px-4">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No banks added yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">Add your first bank or account to start tracking transactions and statements.</p>
          <button
            onClick={() => { setEditingBank(null); setBankModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add First Bank
          </button>
        </div>
      ) : (
        <>
          {/* ── Bank Selector + Actions row ── */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Custom dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-900 dark:text-white hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px] justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                  <span className="truncate max-w-[160px]">{selectedBank?.name || 'Select bank...'}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[220px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden animate-slide-in">
                  {banks.map(bank => (
                    <button
                      key={bank.id}
                      onClick={() => { setSelectedBankId(bank.id); setDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        bank.id === selectedBankId
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Building2 className="w-4 h-4 flex-shrink-0 opacity-60" />
                      <span className="flex-1 text-left font-medium truncate">{bank.name}</span>
                      {bank.id === selectedBankId && <Check className="w-4 h-4 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Edit / Delete current bank */}
            {selectedBank && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditingBank(selectedBank); setBankModalOpen(true); }}
                  className="p-2 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-gray-200 dark:border-gray-700 transition-colors"
                  title="Edit bank"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteBankTarget(selectedBank)}
                  className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700 transition-colors"
                  title="Delete bank"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="sm:ml-auto flex items-center gap-2">
              {entries.length > 0 && (
                <button
                  onClick={() => exportBankCSV(entries, selectedBank?.name || 'bank', selectedBank?.openingBalance || 0)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              )}
              {months.length > 1 && (
                <button
                  onClick={() => setShowAll(v => !v)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-xl transition-colors ${
                    showAll
                      ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                      : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {showAll ? 'Monthly View' : 'All Months'}
                </button>
              )}
              <button
                onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Entry
              </button>
            </div>
          </div>

          {/* ── Summary Cards ── */}
          {selectedBank && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Opening Balance</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(selectedBank.openingBalance || 0)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-4">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium flex items-center gap-1">
                  <ArrowDownCircle className="w-3.5 h-3.5" /> Total Deposits
                </p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{formatCurrency(stats.totalDeposit)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800 p-4">
                <p className="text-xs text-red-700 dark:text-red-400 font-medium flex items-center gap-1">
                  <ArrowUpCircle className="w-3.5 h-3.5" /> Total Withdrawals
                </p>
                <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">{formatCurrency(stats.totalWithdraw)}</p>
              </div>
              <div className={`rounded-2xl border p-4 ${stats.currentBalance >= 0 ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'}`}>
                <p className={`text-xs font-medium flex items-center gap-1 ${stats.currentBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                  <Wallet className="w-3.5 h-3.5" /> Current Balance
                </p>
                <p className={`text-lg font-bold mt-1 ${stats.currentBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                  {formatCurrency(stats.currentBalance)}
                </p>
              </div>
            </div>
          )}

          {/* ── Statement Table ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Search bar */}
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setMonthPage(0); }}
                  placeholder="Search by description, date (YYYY-MM-DD) or amount..."
                  className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {/* Table Head */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {[{col:'date',label:'Date',span:'col-span-2',align:'text-left'},
                {col:'description',label:'Description',span:'col-span-4',align:'text-left'},
                {col:'deposit',label:'Deposit',span:'col-span-2',align:'text-right'},
                {col:'withdraw',label:'Withdraw',span:'col-span-2',align:'text-right'},
                {col:'balance',label:'Balance',span:'col-span-1',align:'text-right'},
              ].map(({col,label,span,align}) => (
                <button
                  key={col}
                  onClick={() => handleSort(col)}
                  className={`${span} flex items-center gap-1 ${align === 'text-right' ? 'justify-end' : ''} hover:text-gray-900 dark:hover:text-white transition-colors ${
                    sortCol === col ? 'text-primary-600 dark:text-primary-400' : ''
                  }`}
                >
                  {align === 'text-right' && <SortIcon col={col} />}
                  {label}
                  {align !== 'text-right' && <SortIcon col={col} />}
                </button>
              ))}
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {entriesLoading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner />
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mb-3">
                  <ChevronsUpDown className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">No transactions yet for <strong>{selectedBank?.name}</strong></p>
                <button
                  onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add First Entry
                </button>
              </div>
            ) : filteredMonths.length === 0 && searchActive ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No entries match <strong>&ldquo;{search}&rdquo;</strong></p>
                <button onClick={() => setSearch('')} className="mt-3 text-xs text-primary-600 hover:underline">Clear search</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {(searchActive ? filteredMonths : (showAll ? months : (currentMonth ? [currentMonth] : []))).map((month) => (
                  // apply sort inside each month group
                  { ...month, entries: sortEntries(month.entries) }
                )).map((month) => (
                  <div key={month.key}>
                    {/* Month section header (only in all-months / search view) */}
                    {(showAll || searchActive) && (
                      <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800">
                        <div className="col-span-12 text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-wider">
                          {month.label}
                        </div>
                      </div>
                    )}

                    {month.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center group"
                    >
                      {/* Date */}
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatDate(entry.date)}</p>
                      </div>

                      {/* Description */}
                      <div className="sm:col-span-4">
                        <p className="text-sm text-gray-900 dark:text-white font-medium truncate" title={entry.description}>{entry.description}</p>
                        {/* Mobile amounts */}
                        <div className="flex items-center gap-3 sm:hidden mt-0.5">
                          {+entry.deposit > 0 && <span className="text-xs font-semibold text-green-600">+{formatCurrency(entry.deposit)}</span>}
                          {+entry.withdraw > 0 && <span className="text-xs font-semibold text-red-600">−{formatCurrency(entry.withdraw)}</span>}
                          <span className="text-xs text-gray-500">Bal: {formatCurrency(entry.closingBalance)}</span>
                        </div>
                      </div>

                      {/* Deposit */}
                      <div className="hidden sm:block sm:col-span-2 text-right">
                        {+entry.deposit > 0 ? (
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            +{formatCurrency(entry.deposit)}
                          </span>
                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </div>

                      {/* Withdraw */}
                      <div className="hidden sm:block sm:col-span-2 text-right">
                        {+entry.withdraw > 0 ? (
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            −{formatCurrency(entry.withdraw)}
                          </span>
                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </div>

                      {/* Closing Balance */}
                      <div className="hidden sm:block sm:col-span-1 text-right">
                        <span className={`text-sm font-bold ${entry.closingBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(entry.closingBalance)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="sm:col-span-1 flex items-center gap-1 sm:justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingEntry(entry); setEntryModalOpen(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteEntryTarget(entry)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Per-month totals row */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <div className="col-span-6">{month.label} — {month.entries.length} transaction{month.entries.length !== 1 ? 's' : ''}</div>
                    <div className="col-span-2 text-right text-green-600 dark:text-green-400">{formatCurrency(month.totalDeposit)}</div>
                    <div className="col-span-2 text-right text-red-600 dark:text-red-400">{formatCurrency(month.totalWithdraw)}</div>
                    <div className="col-span-2 text-right text-blue-600 dark:text-blue-400">{formatCurrency(month.entries[0]?.closingBalance ?? (selectedBank?.openingBalance || 0))}</div>
                  </div>
                </div>
                ))}

                {/* All-months grand total */}
                {showAll && entries.length > 0 && (
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600 text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                    <div className="col-span-6">Grand Total — {entries.length} transactions</div>
                    <div className="col-span-2 text-right text-green-700 dark:text-green-400">{formatCurrency(stats.totalDeposit)}</div>
                    <div className="col-span-2 text-right text-red-700 dark:text-red-400">{formatCurrency(stats.totalWithdraw)}</div>
                    <div className="col-span-2 text-right text-blue-700 dark:text-blue-400">{formatCurrency(stats.currentBalance)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Month navigation — hidden when showing all months or searching */}
            {months.length > 0 && !showAll && !searchActive && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setMonthPage(p => Math.min(months.length - 1, p + 1))}
                  disabled={monthPage >= months.length - 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  ← Older
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{currentMonth?.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{monthPage + 1} of {months.length} {months.length === 1 ? 'month' : 'months'}</p>
                </div>
                <button
                  onClick={() => setMonthPage(p => Math.max(0, p - 1))}
                  disabled={monthPage === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Newer →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modals ── */}
      <BankModal
        isOpen={bankModalOpen}
        bank={editingBank}
        onClose={() => setBankModalOpen(false)}
        onSave={handleSaveBank}
      />
      <EntryModal
        isOpen={entryModalOpen}
        entry={editingEntry}
        bankName={selectedBank?.name}
        onClose={() => setEntryModalOpen(false)}
        onSave={handleSaveEntry}
      />
      <ConfirmDialog
        isOpen={!!deleteBankTarget}
        title="Delete Bank"
        message={`Delete "${deleteBankTarget?.name}" and ALL its transactions? This action cannot be undone.`}
        onConfirm={handleDeleteBank}
        onCancel={() => setDeleteBankTarget(null)}
      />
      <ConfirmDialog
        isOpen={!!deleteEntryTarget}
        title="Delete Entry"
        message={`Delete "${deleteEntryTarget?.description}"? This will update the closing balances.`}
        onConfirm={handleDeleteEntry}
        onCancel={() => setDeleteEntryTarget(null)}
      />
    </div>
  );
}

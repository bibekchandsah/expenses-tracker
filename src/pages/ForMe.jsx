import { useState, useMemo, useEffect } from 'react';
import {
  Heart, Plus, Edit2, Trash2, X, Search,
  ArrowUp, ArrowDown, ChevronsUpDown, User, ChevronDown,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useForMe } from '../context/ForMeContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';

// ── helpers ──────────────────────────────────────────────────────
function toInputDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  const d = date instanceof Date ? date : date.toDate?.() ?? new Date(date);
  return d.toISOString().slice(0, 10);
}

function toTimestamp(str) {
  return Timestamp.fromDate(new Date(str));
}

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  name: '',
  description: '',
};

// ── Sort icon ─────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
}

// ── Modal ─────────────────────────────────────────────────────────
function ForMeModal({ isOpen, entry, onClose, onSave, existingNames }) {
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [errors,      setErrors]      = useState({});
  const [saving,      setSaving]      = useState(false);
  const [nameSuggest, setNameSuggest] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(entry ? {
      date:        toInputDate(entry.date),
      amount:      String(entry.amount),
      name:        entry.name,
      description: entry.description || '',
    } : { ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setErrors({});
  }, [isOpen, entry]);

  if (!isOpen) return null;

  function validate() {
    const e = {};
    if (!form.date)                       e.date   = 'Date is required';
    if (!form.name.trim())                e.name   = 'Name is required';
    if (!form.amount || +form.amount <= 0) e.amount = 'Amount must be positive';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({ ...form, amount: Number(form.amount), date: toTimestamp(form.date) });
      onClose();
    } catch { setErrors({ global: 'Failed to save. Please try again.' }); }
    finally { setSaving(false); }
  }

  const suggestions = existingNames.filter(n =>
    n.toLowerCase().includes(form.name.toLowerCase()) && n !== form.name
  );

  function field(id, label, type = 'text', placeholder = '', required = false) {
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
          className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors[id] ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {errors[id] && <p className="text-xs text-red-500 mt-1">{errors[id]}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {entry ? 'Edit Entry' : 'Add Entry'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {errors.global && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{errors.global}</p>}

          {field('date', 'Date', 'date', '', true)}

          {/* Name with autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Person&apos;s Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })); setNameSuggest(true); }}
              onBlur={() => setTimeout(() => setNameSuggest(false), 150)}
              placeholder="e.g. Sita, Ram..."
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            {nameSuggest && suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                {suggestions.map(s => (
                  <button key={s} type="button"
                    onClick={() => { setForm(f => ({ ...f, name: s })); setNameSuggest(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {field('amount', 'Amount (Rs)', 'number', '0.00', true)}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Owes me treat for birthday, movie ticket..."
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors disabled:opacity-60">
              {saving ? 'Saving...' : entry ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ForMe() {
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useForMe();
  const { currency } = useCurrency();
  const { addToast } = useToast();

  const [modalOpen,     setModalOpen]     = useState(false);
  const [editingEntry,  setEditingEntry]  = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [search,        setSearch]        = useState('');
  const [personFilter,  setPersonFilter]  = useState(null);
  const [sortCol,       setSortCol]       = useState('date');
  const [sortDir,       setSortDir]       = useState('desc');
  const [panelOpen,     setPanelOpen]     = useState(true);
  const [chartOpen,     setChartOpen]     = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(true);

  const existingNames = useMemo(() => [...new Set(entries.map(e => e.name))].sort(), [entries]);

  function handleSort(col) {
    if (sortCol === col) {
      if (sortDir === 'desc') setSortDir('asc');
      else { setSortCol(null); setSortDir('desc'); }
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = q
      ? entries.filter(e =>
          e.name?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          String(e.amount || '').includes(q) ||
          toInputDate(e.date).includes(q) ||
          formatDate(toInputDate(e.date)).toLowerCase().includes(q)
        )
      : personFilter
        ? entries.filter(e => e.name === personFilter)
        : entries;

    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      let av, bv;
      if      (sortCol === 'date')   { av = a.date; bv = b.date; }
      else if (sortCol === 'amount') { av = +a.amount; bv = +b.amount; }
      else if (sortCol === 'name')   { av = a.name?.toLowerCase() || ''; bv = b.name?.toLowerCase() || ''; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [entries, search, sortCol, sortDir, personFilter]);

  // Per-person summary for right panel
  const personSummary = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (!map[e.name]) map[e.name] = { name: e.name, total: 0, count: 0 };
      map[e.name].total += +e.amount || 0;
      map[e.name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [entries]);

  const stats = useMemo(() => ({
    total:   entries.reduce((s, e) => s + (+e.amount || 0), 0),
    count:   entries.length,
    people:  new Set(entries.map(e => e.name)).size,
    highest: entries.reduce((mx, e) => Math.max(mx, +e.amount || 0), 0),
  }), [entries]);

  const maxPersonTotal = useMemo(() => Math.max(...personSummary.map(p => p.total), 1), [personSummary]);

  async function handleSave(data) {
    if (editingEntry) { await updateEntry(editingEntry.id, data); addToast('Entry updated!'); }
    else              { await addEntry(data);                     addToast('Entry added!'); }
  }

  async function handleDelete() {
    await deleteEntry(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Entry deleted');
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
            <Heart className="w-6 h-6 text-pink-500" /> For Me
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track people who owe you a treat or payment</p>
        </div>
        <button
          onClick={() => { setEditingEntry(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Entries</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{stats.count}</p>
        </div>
        <div className="bg-pink-50 dark:bg-pink-900/10 rounded-2xl border border-pink-200 dark:border-pink-800 p-4">
          <p className="text-xs text-pink-700 dark:text-pink-400 font-medium">Total Amount</p>
          <p className="text-lg font-bold text-pink-600 dark:text-pink-400 mt-1">{formatCurrency(stats.total, currency)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">People</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">{stats.people}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-200 dark:border-orange-800 p-4">
          <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">Highest</p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1">{formatCurrency(stats.highest, currency)}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center px-4">
          <div className="w-16 h-16 bg-pink-50 dark:bg-pink-900/20 rounded-2xl flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-pink-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No entries yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">Add someone who owes you a treat or payment.</p>
          <button
            onClick={() => { setEditingEntry(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add First Entry
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ── Left: Main Table ── */}
          <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Search + filter + panel toggle */}
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPersonFilter(null); }}
                  placeholder="Search name, description, amount, date (YYYY-MM-DD)..."
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
                {showSidePanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </button>
            </div>

            {/* Table header */}
            <div className="hidden lg:grid grid-cols-12 gap-1 px-5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <div className="col-span-2"><SortBtn col="date"   label="Date"   /></div>
              <div className="col-span-2 flex justify-end"><SortBtn col="amount" label="Amount" align="right" /></div>
              <div className="col-span-3"><SortBtn col="name"   label="Name"   /></div>
              <div className="col-span-4 pl-1">Description</div>
              <div className="col-span-1 text-right">Act.</div>
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No records found</p>
                {(search || personFilter) && (
                  <button onClick={() => { setSearch(''); setPersonFilter(null); }} className="mt-2 text-xs text-primary-600 hover:underline">Clear filter</button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map(entry => (
                  <div key={entry.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-1 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center group">

                    {/* Date */}
                    <div className="lg:col-span-2 text-xs text-gray-500 dark:text-gray-400">{formatDate(toInputDate(entry.date))}</div>

                    {/* Amount */}
                    <div className="lg:col-span-2 text-right">
                      <span className="text-sm font-bold text-pink-600 dark:text-pink-400">{formatCurrency(entry.amount, currency)}</span>
                    </div>

                    {/* Name */}
                    <div className="lg:col-span-3">
                      <button
                        onClick={() => { setPersonFilter(p => p === entry.name ? null : entry.name); setSearch(''); }}
                        className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline truncate max-w-full text-left"
                        title={`Filter by ${entry.name}`}
                      >
                        {entry.name}
                      </button>
                    </div>

                    {/* Description */}
                    <div className="lg:col-span-4 pl-0 lg:pl-1">
                      {entry.description
                        ? <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1" title={entry.description}>{entry.description}</span>
                        : <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
                      }
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-1 flex items-center gap-1 justify-start lg:justify-end opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingEntry(entry); setModalOpen(true); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        title="Edit"
                      ><Edit2 className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => setDeleteTarget(entry)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Table footer totals */}
            {filtered.length > 0 && (
              <div className="hidden lg:grid grid-cols-12 gap-1 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                <div className="col-span-2">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</div>
                <div className="col-span-2 text-right text-pink-600 dark:text-pink-400">
                  {formatCurrency(filtered.reduce((s, e) => s + (+e.amount || 0), 0))}
                </div>
                <div className="col-span-8" />
              </div>
            )}
          </div>

          {/* ── Right: Person Summary Panel + Bar Chart ── */}
          {showSidePanel && (
            <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">

              {/* Person Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700"
                  onClick={() => setPanelOpen(o => !o)}
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-primary-600" /> Person Summary
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
                </button>

                {panelOpen && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    <div className="grid grid-cols-4 gap-1 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/40">
                      <div className="col-span-2">Name</div>
                      <div className="text-right">Count</div>
                      <div className="text-right">Total</div>
                    </div>
                    {personSummary.map(person => {
                      const isActive = personFilter === person.name;
                      return (
                        <button
                          key={person.name}
                          onClick={() => { setPersonFilter(p => p === person.name ? null : person.name); setSearch(''); }}
                          className={`w-full grid grid-cols-4 gap-1 px-4 py-3 text-left transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                        >
                          <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                            <Heart className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                            <span className={`text-sm font-medium truncate ${isActive ? 'text-primary-700 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                              {person.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{person.count}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-pink-600 dark:text-pink-400">{formatCurrency(person.total, currency)}</span>
                          </div>
                        </button>
                      );
                    })}
                    <div className="grid grid-cols-4 gap-1 px-4 py-3 bg-gray-50 dark:bg-gray-700/40 text-xs font-black text-gray-700 dark:text-gray-200 uppercase">
                      <div className="col-span-2">Total</div>
                      <div className="text-right">{stats.count}</div>
                      <div className="text-right text-pink-600 dark:text-pink-400">{formatCurrency(stats.total, currency)}</div>
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
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Amount by Person</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${chartOpen ? 'rotate-180' : ''}`} />
                </button>
                {chartOpen && (
                  <div className="px-4 py-3 space-y-3">
                    {/* Grand total reference bar */}
                    <div className="px-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">Grand Total</span>
                        <span className="text-xs font-bold text-pink-400 dark:text-pink-500">{formatCurrency(stats.total, currency)}</span>
                      </div>
                      <div className="w-full h-4 rounded-full overflow-hidden" style={{ backgroundColor: '#fce7f3' }}>
                        <div className="h-full w-full rounded-full" style={{ backgroundColor: '#fbcfe8' }} />
                      </div>
                    </div>

                    {/* Per-person bars — dark pink, width relative to grand total */}
                    {personSummary.map(person => {
                      const isActive = personFilter === person.name;
                      const pct = stats.total > 0 ? (person.total / stats.total) * 100 : 0;
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
                              {formatCurrency(person.total, currency)}
                            </span>
                          </div>
                          {/* Light pink = full bar (total), dark pink fill = person's share */}
                          <div className="w-full h-4 rounded-full overflow-hidden" style={{ backgroundColor: '#fce7f3' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: '#be185d' }}
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
      <ForMeModal
        isOpen={modalOpen}
        entry={editingEntry}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        existingNames={existingNames}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Entry"
        message={`Delete entry for "${deleteTarget?.name}" (${formatCurrency(deleteTarget?.amount || 0, currency)})? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  );
}

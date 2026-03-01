import { useState, useMemo } from 'react';
import {
  Heart, Plus, Search, X, Pencil, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronUp, ChevronDown,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useForMe } from '../context/ForMeContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// ── helpers ──────────────────────────────────────────────────────
function toInputDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : date.toDate?.() ?? new Date(date);
  return d.toISOString().slice(0, 10);
}

function displayDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function toTimestamp(str) {
  return Timestamp.fromDate(new Date(str));
}

const EMPTY_FORM = { name: '', amount: '', description: '', date: toInputDate(new Date()) };

// ── Entry Modal ───────────────────────────────────────────────────
function EntryModal({ isOpen, entry, onClose, onSave }) {
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useMemo(() => {
    if (!isOpen) return;
    setErrors({});
    setForm(entry
      ? { name: entry.name, amount: String(entry.amount), description: entry.description || '', date: toInputDate(entry.date) }
      : { ...EMPTY_FORM, date: toInputDate(new Date()) }
    );
  }, [isOpen, entry]);

  if (!isOpen) return null;

  function validate() {
    const e = {};
    if (!form.name.trim())        e.name   = 'Name is required';
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Valid amount required';
    if (!form.date)               e.date   = 'Date is required';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({ ...form, amount: Number(form.amount), date: toTimestamp(form.date) });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {entry ? 'Edit Entry' : 'Add Entry'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Person's Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sita, Ram..."
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.name ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount (Rs) *</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.amount ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.date ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Owes me treat for birthday, movie ticket..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
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

// ── Sort icon ─────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ForMe() {
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useForMe();
  const { addToast } = useToast();

  const [modal,       setModal]       = useState({ open: false, entry: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search,      setSearch]      = useState('');
  const [sortCol,     setSortCol]     = useState('date');
  const [sortDir,     setSortDir]     = useState('desc');

  // Stats
  const totalAmount = entries.reduce((s, e) => s + (e.amount || 0), 0);
  const totalPeople = new Set(entries.map(e => e.name?.toLowerCase()).filter(Boolean)).size;

  // Sort cycle
  function handleSort(col) {
    if (sortCol !== col) { setSortCol(col); setSortDir('desc'); return; }
    if (sortDir === 'desc') { setSortDir('asc'); return; }
    setSortCol('date'); setSortDir('desc');
  }

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = q
      ? entries.filter(e =>
          e.name?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q)
        )
      : [...entries];

    list.sort((a, b) => {
      let av, bv;
      if (sortCol === 'amount') { av = a.amount; bv = b.amount; }
      else if (sortCol === 'name') { av = a.name?.toLowerCase() || ''; bv = b.name?.toLowerCase() || ''; }
      else { av = a.date; bv = b.date; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1  : -1;
      return 0;
    });
    return list;
  }, [entries, search, sortCol, sortDir]);

  // Handlers
  async function handleSave(data) {
    if (modal.entry) {
      await updateEntry(modal.entry.id, data);
      addToast('Entry updated!');
    } else {
      await addEntry(data);
      addToast('Entry added!');
    }
  }

  async function handleDelete() {
    await deleteEntry(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Entry deleted');
  }

  const thClass = "px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap select-none";
  const thBtn   = "flex items-center gap-1.5 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer";

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500" /> For Me
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            People who owe you a treat or payment
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, entry: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">Total Entries</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{entries.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-pink-500">Rs {totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">People</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPeople}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or description..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-14 h-14 bg-pink-50 dark:bg-pink-900/20 rounded-2xl flex items-center justify-center mb-4">
              <Heart className="w-7 h-7 text-pink-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {search ? 'No results found' : 'No entries yet'}
            </h3>
            <p className="text-sm text-gray-400 max-w-xs">
              {search ? 'Try a different name or description.' : 'Add someone who owes you a treat or payment.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className={thClass}>
                    <span className={thBtn} onClick={() => handleSort('date')}>
                      Date <SortIcon col="date" sortCol={sortCol} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className={thClass}>
                    <span className={thBtn} onClick={() => handleSort('amount')}>
                      Amount <SortIcon col="amount" sortCol={sortCol} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className={thClass}>
                    <span className={thBtn} onClick={() => handleSort('name')}>
                      Name <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                    </span>
                  </th>
                  <th className={thClass}>Description</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((e, i) => (
                  <tr key={e.id} className={`group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40 ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-900/10'}`}>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                      {displayDate(e.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-pink-500">Rs {e.amount?.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium whitespace-nowrap">
                      {e.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs">
                      <span className="line-clamp-2">{e.description || <span className="italic text-gray-300 dark:text-gray-600">—</span>}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ open: true, entry: e })}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(e)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}{search && ` matching "${search}"`}</span>
              <span className="font-semibold text-pink-500">
                Total: Rs {filtered.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <EntryModal
        isOpen={modal.open}
        entry={modal.entry}
        onClose={() => setModal({ open: false, entry: null })}
        onSave={handleSave}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete entry?"
        message={deleteTarget ? `Remove "${deleteTarget.name}" — Rs ${deleteTarget.amount?.toLocaleString()}?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

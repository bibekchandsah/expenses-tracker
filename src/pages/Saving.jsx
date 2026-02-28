import { useState, useMemo, useRef, useEffect } from 'react';
import {
  PiggyBank, Plus, Pencil, Trash2, Search, X, ChevronUp, ChevronDown,
  PanelRightClose, PanelRightOpen, ArrowDownUp,
} from 'lucide-react';
import { useSavings } from '../context/SavingContext';

// ── helpers ───────────────────────────────────────────────────────
const fmt   = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];

// ── SortIcon ──────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ArrowDownUp size={12} className="inline ml-1 opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="inline ml-1 text-primary-500" />
    : <ChevronDown size={12} className="inline ml-1 text-primary-500" />;
}

// ── Modal: Saving (main table) ────────────────────────────────────
function SavingModal({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState({ date: today(), amount: '', expendOn: '', description: '' });

  useEffect(() => {
    if (open) setForm(initial
      ? { date: initial.date, amount: initial.amount, expendOn: initial.expendOn || '', description: initial.description || '' }
      : { date: today(), amount: '', expendOn: '', description: '' });
  }, [open, initial]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.date || !form.amount) return;
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial ? 'Edit Saving' : 'Add Saving'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input type="date" required value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
              <input type="number" required min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expend On</label>
            <input type="text" value={form.expendOn} onChange={e => set('expendOn', e.target.value)}
              placeholder="e.g. Emergency fund, Vacation…"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Optional notes…"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
              {initial ? 'Save Changes' : 'Add Saving'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Source (right panel) ───────────────────────────────────
function SourceModal({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState({ date: today(), amount: '', description: '' });

  useEffect(() => {
    if (open) setForm(initial
      ? { date: initial.date, amount: initial.amount, description: initial.description || '' }
      : { date: today(), amount: '', description: '' });
  }, [open, initial]);

  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.date || !form.amount) return;
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial ? 'Edit Source' : 'Add Source'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input type="date" required value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
              <input type="number" required min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. Salary, Freelance…"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
              {initial ? 'Save' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Delete ────────────────────────────────────────────────
function ConfirmDelete({ open, label, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
        <Trash2 size={40} className="mx-auto mb-3 text-red-500" />
        <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Delete record?</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{label}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Saving() {
  const { savings, sources, loading, addSaving, updateSaving, deleteSaving, addSource, updateSource, deleteSource } = useSavings();

  // ── panel toggle
  const [showSidePanel, setShowSidePanel] = useState(true);

  // ── saving modal
  const [savingModal, setSavingModal] = useState({ open: false, item: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, label: '' });

  // ── source modal
  const [sourceModal, setSourceModal] = useState({ open: false, item: null });
  const [deleteSourceConfirm, setDeleteSourceConfirm] = useState({ open: false, id: null, label: '' });

  // ── main table sort / search
  const [sortCol, setSortCol]   = useState(null);
  const [sortDir, setSortDir]   = useState('desc');
  const [search,  setSearch]    = useState('');

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const filteredSavings = useMemo(() => {
    let rows = [...savings];
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
  }, [savings, sortCol, sortDir, search]);

  // ── stats
  const totalSaved   = useMemo(() => savings.reduce((s, r) => s + (+r.amount || 0), 0), [savings]);
  const totalSources = useMemo(() => sources.reduce((s, r) => s + (+r.amount || 0), 0), [sources]);
  const netSaving    = totalSources - totalSaved;

  // ── handlers: savings
  const openAdd  = () => setSavingModal({ open: true, item: null });
  const openEdit = (item) => setSavingModal({ open: true, item });
  const saveEntry = (form) => {
    if (savingModal.item) updateSaving(savingModal.item.id, form);
    else addSaving(form);
  };
  const askDelete = (r) => setDeleteConfirm({ open: true, id: r.id, label: `Amount: ${fmt(r.amount)} on ${r.date}` });
  const confirmDelete = () => { deleteSaving(deleteConfirm.id); setDeleteConfirm({ open: false, id: null, label: '' }); };

  // ── handlers: sources
  const openAddSource  = () => setSourceModal({ open: true, item: null });
  const openEditSource = (item) => setSourceModal({ open: true, item });
  const saveSource = (form) => {
    if (sourceModal.item) updateSource(sourceModal.item.id, form);
    else addSource(form);
  };
  const askDeleteSource = (r) => setDeleteSourceConfirm({ open: true, id: r.id, label: `Amount: ${fmt(r.amount)} on ${r.date}` });
  const confirmDeleteSource = () => { deleteSource(deleteSourceConfirm.id); setDeleteSourceConfirm({ open: false, id: null, label: '' }); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <PiggyBank size={22} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Personal Saving</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Track savings and their sources</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Spent</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(totalSaved)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{savings.length} record{savings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sourced</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(totalSources)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sources.length} source{sources.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net Balance</p>
          <p className={`text-lg font-bold ${netSaving >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {fmt(netSaving)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Sources − Spent</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Savings Rate</p>
          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {totalSources > 0 ? `${Math.round((netSaving / totalSources) * 100)}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Net / Sourced</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-4 items-start">
        {/* Main Table */}
        <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Toolbar */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search savings…"
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium whitespace-nowrap">
              <Plus size={15} /> Add
            </button>
            <button
              onClick={() => setShowSidePanel(o => !o)}
              title={showSidePanel ? 'Hide sources panel' : 'Show sources panel'}
              className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {showSidePanel ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                  {[
                    { col: 'date',      label: 'Date' },
                    { col: 'amount',   label: 'Amount' },
                    { col: 'expendOn', label: 'Expend On' },
                    { col: 'description', label: 'Description' },
                  ].map(({ col, label }) => (
                    <th key={col}
                      onClick={() => toggleSort(col)}
                      className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700">
                      {label}<SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredSavings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                      {search ? 'No results found.' : 'No savings recorded yet. Click Add to start.'}
                    </td>
                  </tr>
                ) : filteredSavings.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{fmt(row.amount)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {row.expendOn
                        ? <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs">{row.expendOn}</span>
                        : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[180px] truncate" title={row.description}>
                      {row.description || <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 mr-1">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => askDelete(row)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredSavings.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
              {filteredSavings.length} record{filteredSavings.length !== 1 ? 's' : ''}
              {search && ` (filtered from ${savings.length})`}
            </div>
          )}
        </div>

        {/* Right Panel: Saving Sources */}
        {showSidePanel && (
          <div className="w-72 shrink-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Saved Money From</h3>
                <p className="text-xs text-gray-400 mt-0.5">Sources of savings</p>
              </div>
              <button onClick={openAddSource}
                className="p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
                <Plus size={14} />
              </button>
            </div>

            {/* Panel summary strip */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700 flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">{sources.length} sources</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{fmt(totalSources)}</span>
            </div>

            {/* Sources list */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[520px] overflow-y-auto">
              {sources.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-10">
                  No sources yet.<br />
                  <button onClick={openAddSource} className="mt-2 text-primary-600 hover:underline text-xs">Add your first source</button>
                </p>
              ) : sources.map(src => (
                <div key={src.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(src.amount)}</span>
                        <span className="text-xs text-gray-400">{src.date}</span>
                      </div>
                      {src.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={src.description}>{src.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEditSource(src)} className="p-1 text-gray-400 hover:text-primary-600 rounded">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => askDeleteSource(src)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SavingModal
        open={savingModal.open}
        initial={savingModal.item}
        onClose={() => setSavingModal({ open: false, item: null })}
        onSave={saveEntry}
      />
      <SourceModal
        open={sourceModal.open}
        initial={sourceModal.item}
        onClose={() => setSourceModal({ open: false, item: null })}
        onSave={saveSource}
      />
      <ConfirmDelete
        open={deleteConfirm.open}
        label={deleteConfirm.label}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null, label: '' })}
      />
      <ConfirmDelete
        open={deleteSourceConfirm.open}
        label={deleteSourceConfirm.label}
        onConfirm={confirmDeleteSource}
        onCancel={() => setDeleteSourceConfirm({ open: false, id: null, label: '' })}
      />
    </div>
  );
}

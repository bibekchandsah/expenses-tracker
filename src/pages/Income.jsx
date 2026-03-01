import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, SlidersHorizontal, X, Download, Edit2, Trash2, Upload, Zap } from 'lucide-react';
import CSVImportModal from '../components/CSVImportModal';
import QuickAddModal from '../components/QuickAddModal';
import { useIncomes } from '../context/IncomeContext';
import { useBanks } from '../context/BankContext';
import { useToast } from '../components/ui/Toast';
import IncomeModal, { INCOME_SOURCES } from '../components/IncomeModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';
import { useActiveYear } from '../context/ActiveYearContext';
import YearSelector from '../components/ui/YearSelector';
import { useDebounce } from '../hooks/useDebounce';

const PAGE_SIZE = 30;

const IMPORT_FIELDS = [
  { key: 'title',       label: 'Title / Description',         required: true,  type: 'text'   },
  { key: 'amount',      label: 'Amount',                       required: true,  type: 'number' },
  { key: 'date',        label: 'Date',                         required: true,  type: 'date'   },
  { key: 'source',      label: 'Source (Salary, Freelance…)',  required: false, type: 'text',  hint: 'Matched to known sources; unrecognised left as-is' },
  { key: 'description', label: 'Description',                  required: false, type: 'text'   },
  { key: 'notes',       label: 'Notes',                        required: false, type: 'text'   },
];

function incomeKey(r) {
  return `${String(r.title || '').toLowerCase()}|${r.date}|${r.amount}`;
}

const SOURCE_COLORS = {
  Salary:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Freelance:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Business:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Investment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Rental:     'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Gift:       'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Other:      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
};

function SortIcon({ field, sortBy, sortDir }) {
  if (sortBy !== field) return <span className="text-gray-400 ml-1 text-xs">⇅</span>;
  return <span className="text-green-600 dark:text-green-400 ml-1 text-xs">{sortDir === 'desc' ? '↓' : '↑'}</span>;
}

function sourceLabel(val) {
  return INCOME_SOURCES.find(s => s.value === val)?.label ?? val ?? '—';
}

export default function Income() {
  const { incomes, filteredIncomes, loading, filters, setFilters, resetFilters, addIncome, updateIncome, deleteIncome } = useIncomes();
  const { currency } = useCurrency();
  const { addToast } = useToast();
  const { banks, selectedBankId } = useBanks();
  const { activeYear } = useActiveYear();

  const [modalOpen, setModalOpen]       = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState({ open: false, row: null });
  const [importOpen, setImportOpen]      = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleteTarget, setDeleteTarget]  = useState(null);
  const [showFilters, setShowFilters]    = useState(false);
  const [yearFilter, setYearFilter]      = useState(() => activeYear);
  const [page, setPage]                  = useState(1);

  useEffect(() => { setYearFilter(activeYear); }, [activeYear]);

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Full-text search
  const searchFiltered = useMemo(() => {
    const yearFiltered = filteredIncomes.filter(i => i.date?.startsWith(String(yearFilter)));
    if (!debouncedSearch.trim()) return yearFiltered;
    const q = debouncedSearch.toLowerCase();
    return yearFiltered.filter(i =>
      i.title?.toLowerCase().includes(q) ||
      i.date?.toLowerCase().includes(q) ||
      String(i.amount).includes(q) ||
      i.source?.toLowerCase().includes(q) ||
      i.notes?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    );
  }, [filteredIncomes, debouncedSearch, yearFilter]);

  const useMonthView = searchFiltered.length > 30;

  const groupedByMonth = useMemo(() => {
    const map = {};
    searchFiltered.forEach(i => {
      const m = i.date?.slice(0, 7) ?? 'Unknown';
      if (!map[m]) map[m] = [];
      map[m].push(i);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [searchFiltered]);

  const paginated = useMemo(() => {
    if (useMonthView) return [];
    const start = (page - 1) * PAGE_SIZE;
    return searchFiltered.slice(start, start + PAGE_SIZE);
  }, [searchFiltered, page, useMonthView]);

  const totalPages = Math.ceil(searchFiltered.length / PAGE_SIZE);

  // Stats — all scoped to yearFilter
  const stats = useMemo(() => {
    const d = new Date();
    const thisMonth = `${yearFilter}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const yearIncomes = incomes.filter(i => i.date?.startsWith(String(yearFilter)));
    const total        = yearIncomes.reduce((s, i) => s + (+i.amount || 0), 0);
    const thisMonthAmt = yearIncomes
      .filter(i => i.date?.startsWith(thisMonth))
      .reduce((s, i) => s + (+i.amount || 0), 0);
    const avgMonthly = (() => {
      const months = new Set(yearIncomes.map(i => i.date?.slice(0, 7)).filter(Boolean));
      return months.size ? total / months.size : 0;
    })();
    return { total, thisMonthAmt, avgMonthly, count: yearIncomes.length };
  }, [incomes, yearFilter]);

  // Monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const map = {};
    searchFiltered.forEach(i => {
      const m = i.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, total: 0, count: 0 };
      map[m].total += +i.amount || 0;
      map[m].count += 1;
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [searchFiltered]);

  function openAdd()       { setEditingIncome(null); setModalOpen(true); }
  function openEdit(inc)   { setEditingIncome(inc);  setModalOpen(true); }

  async function handleSave(data) {
    if (editingIncome) {
      await updateIncome(editingIncome.id, data);
      addToast('Income updated!', 'success');
    } else {
      await addIncome(data);
      addToast('Income added!', 'success');
    }
  }

  async function handleDelete() {
    await deleteIncome(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Income deleted', 'success');
  }

  async function handleCSVImport(records) {
    for (const rec of records) {
      await addIncome({
        title:       rec.title,
        amount:      +rec.amount,
        date:        rec.date,
        source:      rec.source || 'Other',
        description: rec.description || '',
        notes:       rec.notes || '',
      });
    }
    addToast(`Imported ${records.length} income record${records.length !== 1 ? 's' : ''}!`, 'success');
  }

  function handleSort(field) {
    if (filters.sortBy !== field) {
      setFilters({ sortBy: field, sortDir: 'desc' });
    } else if (filters.sortDir === 'desc') {
      setFilters({ sortDir: 'asc' });
    } else {
      setFilters({ sortBy: '', sortDir: 'desc' });
    }
    setPage(1);
  }

  function handleExportCSV() {
    if (!searchFiltered.length) { addToast('No data to export', 'info'); return; }
    const headers = ['Title', 'Date', 'Amount', 'Source', 'Notes', 'Description'];
    const rows = searchFiltered.map(i => [
      i.title,
      i.date,
      i.amount,
      i.source || '',
      i.notes || '',
      i.description || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'income.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const hasActiveFilters = filters.source || filters.month || filters.startDate || filters.endDate;

  const d = new Date();
  const thisMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const renderRow = (inc) => (
    <div
      key={inc.id}
      className="grid grid-cols-12 gap-0 px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors items-center"
    >
      <div className="col-span-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{inc.title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(inc.date)}</p>
      </div>
      <div className="col-span-2">
        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(inc.amount, currency)}
        </span>
      </div>
      <div className="col-span-2">
        <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[140px]" title={inc.notes || ''}>
          {inc.notes || <span className="text-gray-300 dark:text-gray-600">—</span>}
        </p>
      </div>
      <div className="col-span-2">
        <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[140px]" title={inc.description || ''}>
          {inc.description || <span className="text-gray-300 dark:text-gray-600">—</span>}
        </p>
      </div>
      <div className="col-span-2">
        {inc.source ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[inc.source] ?? SOURCE_COLORS.Other}`}>
            {sourceLabel(inc.source)}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
        )}
      </div>
      <div className="col-span-1 flex items-center justify-end gap-1">
        <button
          onClick={() => setQuickAddOpen({ open: true, row: inc })}
          className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
          title="Quick Add"
        >
          <Zap className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => openEdit(inc)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setDeleteTarget(inc)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Income</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track all your income sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelector year={yearFilter} onChange={yr => { setYearFilter(yr); setPage(1); }} />
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Income
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Total Income</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(stats.total, currency)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">This Month</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(stats.thisMonthAmt, currency)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Avg / Month</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats.avgMonthly, currency)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Entries</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{stats.count}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, date (YYYY-MM-DD), note, description, source amount..."
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-xl transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters {hasActiveFilters && <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            {/* Source */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Source</label>
              <select
                value={filters.source}
                onChange={e => { setFilters({ source: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Sources</option>
                {INCOME_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {/* Month */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Month</label>
              <input
                type="month"
                value={filters.month}
                onChange={e => { setFilters({ month: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {/* From */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => { setFilters({ startDate: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {/* To */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => { setFilters({ endDate: e.target.value }); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {hasActiveFilters && (
              <div className="col-span-full flex justify-end">
                <button
                  onClick={() => { resetFilters(); setPage(1); }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-0 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-3 cursor-pointer select-none flex items-center" onClick={() => handleSort('title')}>
            Title / Date <SortIcon field="title" sortBy={filters.sortBy} sortDir={filters.sortDir} />
          </div>
          <div className="col-span-2 cursor-pointer select-none flex items-center" onClick={() => handleSort('amount')}>
            Amount <SortIcon field="amount" sortBy={filters.sortBy} sortDir={filters.sortDir} />
          </div>
          <div className="col-span-2">Notes</div>
          <div className="col-span-2">Description</div>
          <div className="col-span-2 cursor-pointer select-none flex items-center" onClick={() => handleSort('source')}>
            Source <SortIcon field="source" sortBy={filters.sortBy} sortDir={filters.sortDir} />
          </div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Rows */}
        {searchFiltered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">
            <p className="text-4xl mb-3">💰</p>
            <p className="font-medium">No income entries yet</p>
            <p className="text-sm mt-1">Click "Add Income" to get started</p>
          </div>
        ) : useMonthView ? (
          groupedByMonth.flatMap(([month, items]) => [
            <div key={`mh-${month}`} className="px-4 py-2 bg-gray-50 dark:bg-gray-700/70 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                {new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {items.length} {items.length === 1 ? 'entry' : 'entries'} · {formatCurrency(items.reduce((s, i) => s + (+i.amount || 0), 0), currency)}
              </span>
            </div>,
            ...items.map(renderRow)
          ])
        ) : (
          paginated.map(renderRow)
        )}

        {/* Pagination — only in paginated mode */}
        {!useMonthView && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, searchFiltered.length)} of {searchFiltered.length}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                Prev
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Breakdown */}
      {monthlyBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Monthly Breakdown</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Month</th>
                <th className="text-center px-4 py-3">Entries</th>
                <th className="text-right px-5 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {monthlyBreakdown.map(row => (
                <tr key={row.month} className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${row.month === thisMonth ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    {row.month === thisMonth && <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />}
                    {row.month}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{row.count}</td>
                  <td className="px-5 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(row.total, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold border-t-2 border-gray-200 dark:border-gray-600">
                <td className="px-5 py-3 text-gray-900 dark:text-white">Total</td>
                <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                  {monthlyBreakdown.reduce((s, r) => s + r.count, 0)}
                </td>
                <td className="px-5 py-3 text-right text-green-600 dark:text-green-400">
                  {formatCurrency(monthlyBreakdown.reduce((s, r) => s + r.total, 0), currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modals */}
      <IncomeModal
        isOpen={modalOpen}
        income={editingIncome}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Income"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <QuickAddModal
        isOpen={quickAddOpen.open}
        onClose={() => setQuickAddOpen({ open: false, row: null })}
        sourcePage="income"
        sourceRow={quickAddOpen.row}
      />
      <CSVImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        entityName="Income"
        fields={IMPORT_FIELDS}
        existingRecords={incomes}
        duplicateKeyFn={incomeKey}
        onImport={handleCSVImport}
        accentColor="green"
      />
    </div>
  );
}

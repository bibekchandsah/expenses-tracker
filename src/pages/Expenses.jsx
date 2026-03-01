import { useState, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, ChevronUp, ChevronDown, SlidersHorizontal, X, BarChart2, Upload } from 'lucide-react';
import CSVImportModal from '../components/CSVImportModal';
import { useExpenses } from '../context/ExpenseContext';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../components/ui/Toast';
import ExpenseModal from '../components/ExpenseModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';
import { exportToCSV } from '../utils/csvExport';
import { useDebounce } from '../hooks/useDebounce';

const PAGE_SIZE = 30;

const IMPORT_FIELDS = [
  { key: 'title',       label: 'Title / Description',          required: true,  type: 'text'   },
  { key: 'amount',      label: 'Amount',                        required: true,  type: 'number' },
  { key: 'date',        label: 'Date',                          required: true,  type: 'date'   },
  { key: 'category',    label: 'Category (name)',               required: false, type: 'text',    hint: 'Matched to existing category names; unmatched left blank' },
  { key: 'description', label: 'Description',                   required: false, type: 'text'   },
  { key: 'notes',       label: 'Notes',                         required: false, type: 'text'   },
];

function expenseKey(r) {
  return `${String(r.title || '').toLowerCase()}|${r.date}|${r.amount}`;
}

export default function Expenses() {
  const { expenses, filteredExpenses, loading, filters, setFilters, resetFilters, addExpense, updateExpense, deleteExpense } = useExpenses();
  const { currency } = useCurrency();
  const { categories, getCategoryById } = useCategories();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Full-text search across all visible fields
  const searchFiltered = useMemo(() => {
    if (!debouncedSearch.trim()) return filteredExpenses;
    const q = debouncedSearch.toLowerCase();
    return filteredExpenses.filter(e => {
      const cat = getCategoryById(e.category);
      return (
        e.title?.toLowerCase().includes(q) ||
        e.date?.toLowerCase().includes(q) ||
        String(e.amount).includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        cat?.name?.toLowerCase().includes(q)
      );
    });
  }, [filteredExpenses, debouncedSearch, getCategoryById]);

  const useMonthView = searchFiltered.length > 30;

  const groupedByMonth = useMemo(() => {
    const map = {};
    searchFiltered.forEach(e => {
      const m = e.date?.slice(0, 7) ?? 'Unknown';
      if (!map[m]) map[m] = [];
      map[m].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [searchFiltered]);

  const paginated = useMemo(() => {
    if (useMonthView) return [];
    const start = (page - 1) * PAGE_SIZE;
    return searchFiltered.slice(start, start + PAGE_SIZE);
  }, [searchFiltered, page, useMonthView]);

  const totalPages = Math.ceil(searchFiltered.length / PAGE_SIZE);

  // Monthly breakdown (based on current filters + search)
  const monthlyBreakdown = useMemo(() => {
    const map = {};
    searchFiltered.forEach(e => {
      const m = e.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, total: 0, count: 0 };
      map[m].total += +e.amount || 0;
      map[m].count += 1;
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [searchFiltered]);

  function openAdd() { setEditingExpense(null); setModalOpen(true); }
  function openEdit(exp) { setEditingExpense(exp); setModalOpen(true); }

  async function handleSave(data) {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
      addToast('Expense updated!', 'success');
    } else {
      await addExpense(data);
      addToast('Expense added!', 'success');
    }
  }

  async function handleDelete() {
    await deleteExpense(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Expense deleted', 'success');
  }

  async function handleCSVImport(records) {
    for (const rec of records) {
      const matched = categories.find(
        c => c.name?.toLowerCase() === String(rec.category || '').toLowerCase()
      );
      await addExpense({
        title:       rec.title,
        amount:      +rec.amount,
        date:        rec.date,
        category:    matched?.id || '',
        description: rec.description || '',
        notes:       rec.notes || '',
      });
    }
    addToast(`Imported ${records.length} expense${records.length !== 1 ? 's' : ''}!`, 'success');
  }

  function handleSort(field) {
    if (filters.sortBy !== field) {
      // 1st click on a new column → descending
      setFilters({ sortBy: field, sortDir: 'desc' });
    } else if (filters.sortDir === 'desc') {
      // 2nd click → ascending
      setFilters({ sortDir: 'asc' });
    } else {
      // 3rd click → reset to natural order
      setFilters({ sortBy: '', sortDir: 'desc' });
    }
    setPage(1);
  }

  function SortIcon({ field }) {
    if (filters.sortBy !== field) return <span className="inline ml-0.5 text-gray-300 dark:text-gray-600">&#8693;</span>;
    return filters.sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5 text-primary-500" />
      : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5 text-primary-500" />;
  }

  const hasActiveFilters = filters.category || filters.month || filters.startDate || filters.endDate;

  const renderExpenseRow = (expense) => {
    const cat = getCategoryById(expense.category);
    return (
      <div key={expense.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center">
        <div className="sm:col-span-3 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: (cat?.color || '#6b7280') + '20' }}
          >
            {cat?.icon || '📦'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{expense.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(expense.date)}</p>
          </div>
        </div>
        <div className="sm:col-span-2">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {formatCurrency(expense.amount, currency)}
          </span>
        </div>
        <div className="sm:col-span-2">
          {expense.notes ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate block max-w-[120px]" title={expense.notes}>
              {expense.notes}
            </span>
          ) : (
            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
          )}
        </div>
        <div className="sm:col-span-2">
          {expense.description ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate block max-w-[120px]" title={expense.description}>
              {expense.description}
            </span>
          ) : (
            <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
          )}
        </div>
        <div className="sm:col-span-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium"
            style={{ background: (cat?.color || '#6b7280') + '20', color: cat?.color || '#6b7280' }}>
            {cat?.name || expense.category}
          </span>
        </div>
        <div className="sm:col-span-1 flex items-center gap-1">
          <button
            onClick={() => openEdit(expense)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(expense)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{searchFiltered.length} of {expenses.length} expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          <button
            onClick={() => exportToCSV(filteredExpenses)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Search & Filters bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setPage(1); }}
              placeholder="Search by title, date (YYYY-MM-DD), note, description, category, amount..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors ${
              hasActiveFilters || showFilters
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 text-primary-700 dark:text-primary-400'
                : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary-600 inline-block" />}
          </button>

          {hasActiveFilters && (
            <button onClick={() => { resetFilters(); setSearchInput(''); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={e => { setFilters({ category: e.target.value }); setPage(1); }}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Month</label>
              <input
                type="month"
                value={filters.month}
                onChange={e => { setFilters({ month: e.target.value }); setPage(1); }}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">From</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => { setFilters({ startDate: e.target.value }); setPage(1); }}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">To</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => { setFilters({ endDate: e.target.value }); setPage(1); }}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Expense list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          <div className="col-span-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('date')}>
            Title / Date <SortIcon field="date" />
          </div>
          <div className="col-span-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('amount')}>
            Amount <SortIcon field="amount" />
          </div>
          <div className="col-span-2">Note</div>
          <div className="col-span-2">Description</div>
          <div className="col-span-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('category')}>
            Category <SortIcon field="category" />
          </div>
          <div className="col-span-1">Actions</div>
        </div>

        {searchFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-3">
              {expenses.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
            </p>
            {expenses.length === 0 && (
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors">
                <Plus className="w-4 h-4" /> Add first expense
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {useMonthView
              ? groupedByMonth.flatMap(([month, items]) => [
                  <div key={`mh-${month}`} className="px-5 py-2 bg-gray-50 dark:bg-gray-700/70 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                      {new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {items.length} {items.length === 1 ? 'expense' : 'expenses'} · {formatCurrency(items.reduce((s, e) => s + (+e.amount || 0), 0), currency)}
                    </span>
                  </div>,
                  ...items.map(renderExpenseRow)
                ])
              : paginated.map(renderExpenseRow)
            }
          </div>
        )}

        {/* Pagination — only in non-grouped mode */}
        {!useMonthView && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >Previous</button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Breakdown */}
      {monthlyBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <BarChart2 className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly Breakdown</h2>
            <span className="text-xs text-gray-400 ml-1">{monthlyBreakdown.length} month{monthlyBreakdown.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Month</th>
                <th className="px-5 py-3 text-center">Transactions</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {monthlyBreakdown.map((row, i) => {
                const label = new Date(row.month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const isCurrentMonth = row.month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                return (
                  <tr key={row.month} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${isCurrentMonth ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      {isCurrentMonth && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block flex-shrink-0" />}
                      {label}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-500 dark:text-gray-400 tabular-nums">{row.count}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(row.total, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <td className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</td>
                <td className="px-5 py-3 text-center text-sm font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                  {monthlyBreakdown.reduce((s, r) => s + r.count, 0)}
                </td>
                <td className="px-5 py-3 text-right text-sm font-black text-primary-600 dark:text-primary-400 tabular-nums">
                  {formatCurrency(monthlyBreakdown.reduce((s, r) => s + r.total, 0), currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modals */}
      <ExpenseModal
        isOpen={modalOpen}
        expense={editingExpense}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <CSVImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        entityName="Expense"
        fields={IMPORT_FIELDS}
        existingRecords={expenses}
        duplicateKeyFn={expenseKey}
        onImport={handleCSVImport}
        accentColor="blue"
      />
    </div>
  );
}

import { useState, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, ChevronUp, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../components/ui/Toast';
import ExpenseModal from '../components/ExpenseModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCSV } from '../utils/csvExport';
import { useDebounce } from '../hooks/useDebounce';

const PAGE_SIZE = 15;

export default function Expenses() {
  const { expenses, filteredExpenses, loading, filters, setFilters, resetFilters, addExpense, updateExpense, deleteExpense } = useExpenses();
  const { categories, getCategoryById } = useCategories();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced search to context filters
  useMemo(() => setFilters({ search: debouncedSearch }), [debouncedSearch]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredExpenses.slice(start, start + PAGE_SIZE);
  }, [filteredExpenses, page]);

  const totalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE);

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

  function handleSort(field) {
    if (filters.sortBy === field) {
      setFilters({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      setFilters({ sortBy: field, sortDir: 'desc' });
    }
    setPage(1);
  }

  function SortIcon({ field }) {
    if (filters.sortBy !== field) return null;
    return filters.sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />;
  }

  const hasActiveFilters = filters.category || filters.startDate || filters.endDate;

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{filteredExpenses.length} of {expenses.length} expenses</p>
        </div>
        <div className="flex items-center gap-2">
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
              placeholder="Search expenses..."
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
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <div className="col-span-4 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('date')}>
            Title / Date <SortIcon field="date" />
          </div>
          <div className="col-span-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('category')}>
            Category <SortIcon field="category" />
          </div>
          <div className="col-span-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors" onClick={() => handleSort('amount')}>
            Amount <SortIcon field="amount" />
          </div>
          <div className="col-span-3">Actions</div>
        </div>

        {paginated.length === 0 ? (
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
            {paginated.map(expense => {
              const cat = getCategoryById(expense.category);
              return (
                <div key={expense.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center">
                  {/* Title + date */}
                  <div className="sm:col-span-4 flex items-center gap-3">
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
                  {/* Category */}
                  <div className="sm:col-span-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium"
                      style={{ background: (cat?.color || '#6b7280') + '20', color: cat?.color || '#6b7280' }}>
                      {cat?.name || expense.category}
                    </span>
                  </div>
                  {/* Amount */}
                  <div className="sm:col-span-3">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                  {/* Actions */}
                  <div className="sm:col-span-3 flex items-center gap-2">
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
                    {expense.notes && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[100px]" title={expense.notes}>
                        {expense.notes}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
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
    </div>
  );
}

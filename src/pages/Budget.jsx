import { useState, useMemo } from 'react';
import { Target, TrendingUp, AlertTriangle, Check } from 'lucide-react';
import { useBudgets } from '../context/BudgetContext';
import { useExpenses } from '../context/ExpenseContext';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, currentMonth, formatMonth } from '../utils/formatters';

function BudgetRow({ category, expenses, budget, month, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const spent = useMemo(() =>
    expenses.filter(e => e.category === category.id && e.date.startsWith(month))
      .reduce((s, e) => s + +e.amount, 0),
    [expenses, category.id, month]
  );

  const budgetAmount = budget?.amount || 0;
  const pct = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
  const over = budgetAmount > 0 && spent > budgetAmount;
  const warning = budgetAmount > 0 && pct >= 80 && !over;

  async function handleSave() {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      await onSave(category.id, month, amount);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      over ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
           : warning ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10'
           : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: category.color + '20' }}>
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{category.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Spent: {formatCurrency(spent)}</p>
        </div>
        {over && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
        {warning && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
        {!over && !warning && budgetAmount > 0 && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
      </div>

      {/* Progress bar */}
      {budgetAmount > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{pct.toFixed(0)}% used</span>
            <span>of {formatCurrency(budgetAmount)}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : warning ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {over && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
              Over budget by {formatCurrency(spent - budgetAmount)}
            </p>
          )}
        </div>
      )}

      {/* Edit budget */}
      {editing ? (
        <div className="flex gap-2">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Budget amount"
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {saving ? '...' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setValue(budgetAmount ? String(budgetAmount) : ''); setEditing(true); }}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
        >
          {budgetAmount > 0 ? 'Edit budget' : 'Set budget'}
        </button>
      )}
    </div>
  );
}

export default function Budget() {
  const { budgets, loading: bLoading, setBudget, getBudget } = useBudgets();
  const { expenses } = useExpenses();
  const { categories } = useCategories();
  const { addToast } = useToast();
  const [month, setMonth] = useState(currentMonth());

  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(d.toISOString().slice(0, 7));
    }
    return opts;
  }, []);

  async function handleSaveBudget(categoryId, m, amount) {
    await setBudget(categoryId, m, amount);
    addToast('Budget saved!', 'success');
  }

  const totalBudget = categories.reduce((s, c) => {
    const b = getBudget(c.id, month);
    return s + (b?.amount || 0);
  }, 0);
  const totalSpent = expenses.filter(e => e.date.startsWith(month)).reduce((s, e) => s + +e.amount, 0);

  if (bLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Planner</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Set monthly limits per category</p>
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {monthOptions.map(m => (
            <option key={m} value={m}>{formatMonth(m + '-01')}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      {totalBudget > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Budget</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Spent</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalSpent)}</p>
          </div>
          <div className={`rounded-2xl border p-4 text-center ${totalSpent > totalBudget ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/10' : 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/10'}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
            <p className={`text-lg font-bold ${totalSpent > totalBudget ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(totalBudget - totalSpent))}
              {totalSpent > totalBudget ? ' over' : ' left'}
            </p>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-1 gap-3">
        {categories.map(cat => (
          <BudgetRow
            key={cat.id}
            category={cat}
            expenses={expenses}
            budget={getBudget(cat.id, month)}
            month={month}
            onSave={handleSaveBudget}
          />
        ))}
      </div>
    </div>
  );
}

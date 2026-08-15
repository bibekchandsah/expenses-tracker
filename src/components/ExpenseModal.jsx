import { useState, useEffect, useRef } from 'react';
import { X, DollarSign, Calendar, Tag, FileText, AlignLeft, Pin, Building2 } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';
import { useCalendar } from '../context/CalendarContext';
import { useBanks } from '../context/BankContext';
import NepaliDatePickerInput from './ui/NepaliDatePickerInput';
import CategoryModal from './CategoryModal';

const EMPTY = { title: '', amount: '', category: '', date: '', description: '', notes: '', bankId: '' };

const LS_KEY = 'expenseLastBankId';

function getLastBankId() {
  try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
}
function saveLastBankId(id) {
  try { localStorage.setItem(LS_KEY, id); } catch {}
}

export default function ExpenseModal({ isOpen, expense, onClose, onSave, pinned = false, onPinnedChange }) {
  const { categories, addCategory } = useCategories();
  const { calendar } = useCalendar();
  const { banks } = useBanks();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const pendingCategoryName = useRef(null);

  // Auto-select newly added category once Firestore updates `categories`
  useEffect(() => {
    if (!pendingCategoryName.current) return;
    const match = categories.find(
      c => c.name.trim().toLowerCase() === pendingCategoryName.current.trim().toLowerCase()
    );
    if (match) {
      change('category', match.id);
      pendingCategoryName.current = null;
    }
  }, [categories]); // eslint-disable-line

  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setForm({
          title: expense.title,
          amount: String(expense.amount),
          category: expense.category,
          date: expense.date,
          description: expense.description || '',
          notes: expense.notes || '',
          bankId: expense.bankId || '',
        });
      } else {
        // For new expenses, restore last-used bank from localStorage
        const lastBankId = getLastBankId();
        const validId = banks.find(b => b.id === lastBankId) ? lastBankId : (banks[0]?.id || '');
        setForm({ ...EMPTY, date: new Date().toISOString().split('T')[0], bankId: validId });
      }
      setErrors({});
    }
  }, [isOpen, expense, banks]);

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.amount || isNaN(+form.amount) || +form.amount <= 0) e.amount = 'Amount must be a positive number';
    if (!form.category) e.category = 'Category is required';
    if (!form.date) e.date = 'Date is required';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      // Persist selected bank for next time
      if (form.bankId) saveLastBankId(form.bankId);
      await onSave({ ...form, amount: +form.amount });
      if (pinned && !expense) {
        // keep modal open, reset form for next entry
        setForm(prev => ({ ...EMPTY, date: prev.date, bankId: prev.bankId }));
        setErrors({});
      } else {
        onClose();
      }
    } catch {
      // error handled in context
    } finally {
      setSaving(false);
    }
  }

  function change(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <div className="flex items-center gap-1">
            {!expense && onPinnedChange && (
              <button
                type="button"
                onClick={() => onPinnedChange(p => !p)}
                title={pinned ? 'Unpin: close after adding' : 'Pin: keep open to add multiple'}
                className={`p-1.5 rounded-lg transition-colors ${pinned ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <Pin className={`w-4 h-4 ${pinned ? 'fill-primary-600 dark:fill-primary-400' : ''}`} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={form.title}
                onChange={e => change('title', e.target.value)}
                placeholder="e.g. Lunch at restaurant"
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.title ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
            </div>
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={e => change('amount', e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.amount ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <select
                  value={form.category}
                  onChange={e => {
                    if (e.target.value === '__add_new__') {
                      setCategoryModalOpen(true);
                    } else {
                      change('category', e.target.value);
                    }
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.category ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="">Select...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                  <option value="__add_new__">＋ Add new category</option>
                </select>
              </div>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {calendar === 'bs' ? (
                <NepaliDatePickerInput
                  value={form.date}
                  onChange={adDate => change('date', adDate)}
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                />
              ) : (
                <input
                  type="date"
                  value={form.date}
                  onChange={e => change('date', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                />
              )}
            </div>
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Notes & Description side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={form.notes}
                  onChange={e => change('notes', e.target.value)}
                  rows={3}
                  placeholder="Add any notes..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={form.description}
                  onChange={e => change('description', e.target.value)}
                  rows={3}
                  placeholder="Add a description..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Bank (optional) */}
          {banks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={form.bankId}
                  onChange={e => {
                    change('bankId', e.target.value);
                    if (e.target.value) saveLastBankId(e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                >
                  <option value="">None</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-1">Selecting a bank will create a matching withdrawal entry</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {saving ? 'Saving...' : expense ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>

      {/* Add Category — stacked on top (z-[60]) */}
      <CategoryModal
        isOpen={categoryModalOpen}
        category={null}
        onClose={() => setCategoryModalOpen(false)}
        onSave={async (data) => {
          pendingCategoryName.current = data.name;
          await addCategory(data);
          setCategoryModalOpen(false);
        }}
      />
    </div>
  );
}

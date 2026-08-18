import { useState, useEffect, useRef } from 'react';
import { X, DollarSign, Calendar, Tag, FileText, AlignLeft, Pin, Building2, ChevronDown, Search } from 'lucide-react';
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

function CategoryDropdown({ categories, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [highlighted, setHighlighted] = useState(0);

  const selected = categories.find(c => c.id === value);

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // All options including "Add new"
  const options = [...filtered, { id: '__add_new__', name: '+ Add new category', icon: '' }];

  // When search changes, highlight the selected item if it's in the filtered list, else first item
  useEffect(() => {
    const idx = filtered.findIndex(c => c.id === value);
    setHighlighted(idx >= 0 ? idx : 0);
  }, [search]); // eslint-disable-line

  // Focus search input when dropdown opens and scroll selected item into view
  useEffect(() => {
    if (open) {
      const idx = options.findIndex(o => o.id === value);
      setHighlighted(idx >= 0 ? idx : 0);
      setTimeout(() => {
        searchRef.current?.focus();
        if (listRef.current) {
          const item = listRef.current.children[idx >= 0 ? idx : 0];
          item?.scrollIntoView({ block: 'nearest' });
        }
      }, 50);
    } else {
      setSearch('');
    }
  }, [open]); // eslint-disable-line

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted];
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[highlighted]) {
        onChange(options[highlighted].id);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors text-left ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
      >
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <span className={`flex-1 truncate ${!selected ? 'text-gray-400' : ''}`}>
          {selected ? `${selected.icon} ${selected.name}` : 'Select...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search category..."
              className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Options list */}
          <ul ref={listRef} className="max-h-44 overflow-y-auto py-1">
            {options.length === 1 && options[0].id === '__add_new__' && search && (
              <li className="px-3 py-1.5 text-xs text-gray-400 italic">No categories match "{search}"</li>
            )}
            {options.map((opt, idx) => (
              <li
                key={opt.id}
                onMouseEnter={() => setHighlighted(idx)}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors
                  ${idx === highlighted ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}
                  ${opt.id === '__add_new__' ? 'border-t border-gray-100 dark:border-gray-700 text-primary-600 dark:text-primary-400 font-medium' : ''}
                  ${opt.id === value ? 'font-semibold' : ''}
                `}
              >
                {opt.icon && <span>{opt.icon}</span>}
                <span>{opt.id === '__add_new__' ? opt.name : opt.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
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
              <CategoryDropdown
                categories={categories}
                value={form.category}
                onChange={id => {
                  if (id === '__add_new__') {
                    setCategoryModalOpen(true);
                  } else {
                    change('category', id);
                  }
                }}
                error={errors.category}
              />
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

import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Briefcase, FileText, AlignLeft } from 'lucide-react';

export const INCOME_SOURCES = [
  { value: 'Salary',     label: '💼 Salary' },
  { value: 'Freelance',  label: '💻 Freelance' },
  { value: 'Business',   label: '🏢 Business' },
  { value: 'Investment', label: '📈 Investment' },
  { value: 'Rental',     label: '🏠 Rental' },
  { value: 'Gift',       label: '🎁 Gift' },
  { value: 'Other',      label: '📦 Other' },
];

const EMPTY = { title: '', amount: '', source: '', date: '', description: '', notes: '' };

export default function IncomeModal({ isOpen, income, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(income ? {
        title:       income.title,
        amount:      String(income.amount),
        source:      income.source || '',
        date:        income.date,
        description: income.description || '',
        notes:       income.notes || '',
      } : { ...EMPTY, date: new Date().toISOString().split('T')[0] });
      setErrors({});
    }
  }, [isOpen, income]);

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.amount || isNaN(+form.amount) || +form.amount <= 0) e.amount = 'Amount must be a positive number';
    if (!form.source) e.source = 'Source is required';
    if (!form.date) e.date = 'Date is required';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({ ...form, amount: +form.amount });
      onClose();
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
            {income ? 'Edit Income' : 'Add Income'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
                value={form.title}
                onChange={e => change('title', e.target.value)}
                placeholder="e.g. Monthly salary"
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.title ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
            </div>
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Amount & Source */}
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
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.amount ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source *
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={form.source}
                  onChange={e => change('source', e.target.value)}
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.source ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="">Select...</option>
                  {INCOME_SOURCES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              {errors.source && <p className="text-xs text-red-500 mt-1">{errors.source}</p>}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={form.date}
                onChange={e => change('date', e.target.value)}
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
            </div>
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Description & Notes side by side */}
          <div className="grid grid-cols-2 gap-4">
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
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none transition-colors"
                />
              </div>
            </div>
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
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none transition-colors"
                />
              </div>
            </div>
          </div>

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
              className="flex-1 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {saving ? 'Saving...' : income ? 'Update' : 'Add Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

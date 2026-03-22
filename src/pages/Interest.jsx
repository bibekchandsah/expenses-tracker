import { useState, useMemo, useEffect } from 'react';
import { Percent, Plus, Edit2, Trash2, X, Info, Zap, Calculator, TrendingUp, User, ChevronDown, PanelRightClose, PanelRightOpen, Search } from 'lucide-react';
import { useInterest } from '../context/InterestContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CountUpValue from '../components/ui/CountUpValue';
import QuickAddModal from '../components/QuickAddModal';
import { formatCurrency, capFirst } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';
import { useCalendar } from '../context/CalendarContext';
import { useActiveYear } from '../context/ActiveYearContext';
import YearSelector from '../components/ui/YearSelector';
import NepaliDatePickerInput from '../components/ui/NepaliDatePickerInput';

const COMPOUND_FREQUENCIES = [
  { value: 1, label: 'Annually' },
  { value: 2, label: 'Semi-Annually' },
  { value: 4, label: 'Quarterly' },
  { value: 12, label: 'Monthly' },
  { value: 52, label: 'Weekly' },
  { value: 365, label: 'Daily' },
];

const EMPTY_FORM = {
  name: '',
  date: new Date().toISOString().split('T')[0],
  transactionType: 'given', // 'given' or 'taken'
  principal: '',
  rate: '',
  years: '',
  months: '',
  days: '',
  compoundFrequency: 12,
  info: '',
  isSettled: false, // whether paid/received
};

// ── Interest Calculator Modal ───────────────────────────────────
function InterestModal({ isOpen, record, onClose, onSave }) {
  const { calendar } = useCalendar();
  const { currency } = useCurrency();
  const [calcType, setCalcType] = useState('simple');
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (record) {
      // Editing existing record - reconstruct form from saved data
      const totalYears = record.years || 0;
      const years = Math.floor(totalYears);
      const remainingMonths = (totalYears - years) * 12;
      const months = Math.floor(remainingMonths);
      const days = Math.round((remainingMonths - months) * 30);
      
      setForm({
        name: record.name,
        date: record.date,
        transactionType: record.transactionType || 'given',
        principal: String(record.principal),
        rate: String(record.rate),
        years: String(years),
        months: String(months),
        days: String(days),
        compoundFrequency: record.compoundFrequency || 12,
        info: record.info || '',
        isSettled: record.isSettled || false,
      });
      setCalcType(record.type);
      setResult({
        principal: record.principal,
        interest: record.interest,
        total: record.total,
      });
    } else {
      setForm(EMPTY_FORM);
      setCalcType('simple');
      setResult(null);
    }
    setErrors({});
  }, [isOpen, record]);

  if (!isOpen) return null;

  const getTotalYears = () => {
    const y = parseFloat(form.years) || 0;
    const m = parseFloat(form.months) || 0;
    const d = parseFloat(form.days) || 0;
    return y + (m / 12) + (d / 365);
  };

  const calculate = () => {
    const P = parseFloat(form.principal);
    const r = parseFloat(form.rate) / 100;
    const t = getTotalYears();

    if (!P || !r || !t) {
      setErrors({ calc: 'Please enter principal, rate, and duration' });
      return;
    }

    if (calcType === 'simple') {
      const A = P * (1 + r * t);
      const interest = A - P;
      setResult({ principal: P, interest, total: A });
    } else {
      const n = form.compoundFrequency;
      const A = P * Math.pow(1 + r / n, n * t);
      const interest = A - P;
      setResult({ principal: P, interest, total: A });
    }
    setErrors({});
  };

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.date) e.date = 'Date is required';
    if (!result) e.calc = 'Please calculate first';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({
        name: form.name,
        date: form.date,
        transactionType: form.transactionType,
        type: calcType,
        principal: result.principal,
        rate: parseFloat(form.rate),
        years: getTotalYears(),
        compoundFrequency: calcType === 'compound' ? form.compoundFrequency : null,
        interest: result.interest,
        total: result.total,
        info: form.info,
        isSettled: form.isSettled,
      });
      onClose();
    } catch {
      setErrors({ global: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary-600" />
            {record ? 'Edit Interest Calculation' : 'New Interest Calculation'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Calculator Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <button
              type="button"
              onClick={() => { setCalcType('simple'); setResult(null); }}
              className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                calcType === 'simple'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Simple Interest
            </button>
            <button
              type="button"
              onClick={() => { setCalcType('compound'); setResult(null); }}
              className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                calcType === 'compound'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Compound Interest
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name / Description <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })); }}
              placeholder="e.g. Fixed Deposit, Loan Interest..."
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transaction Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, transactionType: 'given' }))}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border-2 ${
                  form.transactionType === 'given'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <TrendingUp className="w-5 h-5" />
                  <span>Given / Invested</span>
                  <span className="text-xs opacity-75">Money lent out</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, transactionType: 'taken' }))}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border-2 ${
                  form.transactionType === 'taken'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <TrendingUp className="w-5 h-5 rotate-180" />
                  <span>Taken / Borrowed</span>
                  <span className="text-xs opacity-75">Money borrowed</span>
                </div>
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date <span className="text-red-400">*</span>
            </label>
            {calendar === 'bs' ? (
              <NepaliDatePickerInput
                value={form.date}
                onChange={adDate => { setForm(f => ({ ...f, date: adDate })); setErrors(er => ({ ...er, date: '' })); }}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
            ) : (
              <input
                type="date"
                value={form.date}
                onChange={e => { setForm(f => ({ ...f, date: e.target.value })); setErrors(er => ({ ...er, date: '' })); }}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
            )}
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Principal & Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Principal Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.principal}
                onChange={e => { setForm(f => ({ ...f, principal: e.target.value })); setResult(null); }}
                placeholder="10000"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Annual Rate (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.rate}
                onChange={e => { setForm(f => ({ ...f, rate: e.target.value })); setResult(null); }}
                placeholder="5.5"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Compound Frequency */}
          {calcType === 'compound' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Compound Frequency
              </label>
              <select
                value={form.compoundFrequency}
                onChange={e => { setForm(f => ({ ...f, compoundFrequency: parseInt(e.target.value) })); setResult(null); }}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {COMPOUND_FREQUENCIES.map(freq => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duration</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <input
                  type="number"
                  min="0"
                  value={form.years}
                  onChange={e => { setForm(f => ({ ...f, years: e.target.value })); setResult(null); }}
                  placeholder="Years"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1 text-center">Years</p>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={form.months}
                  onChange={e => { setForm(f => ({ ...f, months: e.target.value })); setResult(null); }}
                  placeholder="Months"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1 text-center">Months</p>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max="364"
                  value={form.days}
                  onChange={e => { setForm(f => ({ ...f, days: e.target.value })); setResult(null); }}
                  placeholder="Days"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1 text-center">Days</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Additional Info <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.info}
              onChange={e => setForm(f => ({ ...f, info: e.target.value }))}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Settlement Status */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <input
              type="checkbox"
              id="isSettled"
              checked={form.isSettled}
              onChange={e => setForm(f => ({ ...f, isSettled: e.target.checked }))}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
            />
            <label htmlFor="isSettled" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              {form.transactionType === 'given' 
                ? 'Mark as received (amount has been returned to me)'
                : 'Mark as paid (I have paid back this amount)'}
            </label>
          </div>

          {/* Calculate Button */}
          <button
            type="button"
            onClick={calculate}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            Calculate Interest
          </button>

          {errors.calc && <p className="text-xs text-red-500">{errors.calc}</p>}

          {/* Result */}
          {result && (
            <div className="p-5 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-2xl border border-primary-200 dark:border-primary-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Calculation Result
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Principal Amount:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(result.principal, currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Interest Earned:</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(result.interest, currency)}
                  </span>
                </div>
                <div className="h-px bg-gray-300 dark:bg-gray-600" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Value:</span>
                  <span className="text-xl font-black text-primary-600 dark:text-primary-400">
                    {formatCurrency(result.total, currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {errors.global && <p className="text-xs text-red-500">{errors.global}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-colors">
              {saving ? 'Saving...' : record ? 'Update' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Info Detail Modal ───────────────────────────────────────────
function InfoModal({ isOpen, record, onClose }) {
  const { currency } = useCurrency();
  const { dateLabel } = useCalendar();

  if (!isOpen || !record) return null;

  const freqLabel = COMPOUND_FREQUENCIES.find(f => f.value === record.compoundFrequency)?.label || 'N/A';

  // Calculate end date
  const startDate = new Date(record.date);
  const endDate = new Date(startDate);
  const totalDays = Math.round(record.years * 365);
  endDate.setDate(endDate.getDate() + totalDays);
  const endDateStr = endDate.toISOString().split('T')[0];

  // Calculate time remaining till end date
  const today = new Date();
  const timeRemaining = endDate - today;
  const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
  
  let remainingText = '';
  if (daysRemaining < 0) {
    remainingText = 'Completed';
  } else {
    const yearsLeft = Math.floor(daysRemaining / 365);
    const monthsLeft = Math.floor((daysRemaining % 365) / 30);
    const daysLeft = Math.floor((daysRemaining % 365) % 30);
    
    const parts = [];
    if (yearsLeft > 0) parts.push(`${yearsLeft} year${yearsLeft !== 1 ? 's' : ''}`);
    if (monthsLeft > 0) parts.push(`${monthsLeft} month${monthsLeft !== 1 ? 's' : ''}`);
    if (daysLeft > 0) parts.push(`${daysLeft} day${daysLeft !== 1 ? 's' : ''}`);
    
    remainingText = parts.length > 0 ? parts.join(' ') + ' left' : 'Less than a day left';
  }

  // Format duration as "X years Y months Z days"
  const formatDuration = (totalYears) => {
    const years = Math.floor(totalYears);
    const remainingMonths = (totalYears - years) * 12;
    const months = Math.floor(remainingMonths);
    const days = Math.round((remainingMonths - months) * 30);
    
    const parts = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(' ') : '0 days';
  };

  // Calculate interest till today
  const calculateTillToday = () => {
    const startDate = new Date(record.date);
    const today = new Date();
    const diffTime = Math.abs(today - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const yearsElapsed = diffDays / 365;

    const P = record.principal;
    const r = record.rate / 100;

    if (record.type === 'simple') {
      const A = P * (1 + r * yearsElapsed);
      return { interest: A - P, total: A, years: yearsElapsed };
    } else {
      const n = record.compoundFrequency;
      const A = P * Math.pow(1 + r / n, n * yearsElapsed);
      return { interest: A - P, total: A, years: yearsElapsed };
    }
  };

  const tillToday = calculateTillToday();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-primary-600" />
            Calculation Details
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Name</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">{capFirst(record.name)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Transaction Type</p>
              {record.transactionType === 'given' ? (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold">Given / Invested</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <TrendingUp className="w-4 h-4 rotate-180" />
                  <span className="text-sm font-semibold">Taken / Borrowed</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Type</p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                record.type === 'simple'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
              }`}>
                {record.type === 'simple' ? 'Simple' : 'Compound'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Date / Start Date</p>
              <p className="text-sm text-gray-900 dark:text-white">{dateLabel(record.date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">End Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{dateLabel(endDateStr)}</p>
              <p className={`text-xs mt-0.5 ${daysRemaining < 0 ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {remainingText}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Date</p>
              <p className="text-sm text-gray-900 dark:text-white">{dateLabel(record.date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Principal</p>
              <p className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(record.principal, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Rate</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">{record.rate.toFixed(2)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Duration</p>
              <p className="text-sm text-gray-900 dark:text-white font-medium">{record.years.toFixed(2)} years</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">({formatDuration(record.years)})</p>
            </div>
            {record.type === 'compound' && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Frequency</p>
                <p className="text-sm text-gray-900 dark:text-white">{freqLabel}</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Original Calculation</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Interest Earned:</span>
                <span className="text-base font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(record.interest, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Value:</span>
                <span className="text-lg font-black text-primary-600 dark:text-primary-400">
                  {formatCurrency(record.total, currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10 -mx-6 px-6 py-4">
            <p className="text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Interest Till Today
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Duration Elapsed:</span>
                <span>{tillToday.years.toFixed(2)} years ({formatDuration(tillToday.years)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Interest Earned:</span>
                <span className="text-base font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(tillToday.interest, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Value:</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {formatCurrency(tillToday.total, currency)}
                </span>
              </div>
            </div>
          </div>

          {record.info && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Additional Info</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{capFirst(record.info)}</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Interest Page ──────────────────────────────────────────
export default function Interest() {
  const { records, loading, addRecord, updateRecord, deleteRecord } = useInterest();
  const { currency } = useCurrency();
  const { dateLabel, calendar } = useCalendar();
  const { addToast } = useToast();
  const { activeYear, bsActiveYear } = useActiveYear();
  const isBS = calendar === 'bs';

  const [yearFilter, setYearFilter] = useState(() => isBS ? bsActiveYear : activeYear);
  const [modalOpen, setModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState({ open: false, row: null });
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [personFilter, setPersonFilter] = useState(null);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [chartOpen, setChartOpen] = useState(true);
  const [includeInterest, setIncludeInterest] = useState(true);
  const [search, setSearch] = useState('');
  const [sidePanelWidth, setSidePanelWidth] = useState(() => {
    try { return parseInt(localStorage.getItem('interestSidePanelWidth')) || 288; } catch { return 288; }
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    setYearFilter(isBS ? bsActiveYear : activeYear);
  }, [activeYear, bsActiveYear, calendar]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    const yearRecords = records.filter(r => r.date?.startsWith(String(yearFilter)));
    
    let data = yearRecords;
    
    // Apply search filter
    if (q) {
      data = data.filter(r => {
        const formattedYears = r.years ? r.years.toFixed(2) : '';
        return (
          r.name.toLowerCase().includes(q) ||
          r.date.includes(q) ||
          (r.info && r.info.toLowerCase().includes(q)) ||
          String(r.principal).includes(q) ||
          String(r.rate).includes(q) ||
          String(r.total).includes(q) ||
          String(r.interest).includes(q) ||
          String(r.years).includes(q) ||
          formattedYears.includes(q) ||
          r.type.toLowerCase().includes(q) ||
          (r.transactionType === 'given' ? 'given' : 'taken').includes(q)
        );
      });
    }
    
    // Apply person filter
    if (personFilter) {
      data = data.filter(r => (r.name || '').trim().toLowerCase() === personFilter);
    }
    
    console.log('Interest filtering:', { 
      totalRecords: records.length, 
      yearFilter, 
      filteredCount: data.length,
      sampleDates: records.slice(0, 3).map(r => r.date)
    });
    
    return data;
  }, [records, yearFilter, personFilter, search]);

  // Per-person summary
  const personSummary = useMemo(() => {
    const yearRecords = records.filter(r => r.date?.startsWith(String(yearFilter)));
    const map = {};
    yearRecords.forEach(r => {
      const key = (r.name || '').trim().toLowerCase();
      if (!map[key]) map[key] = { key, name: r.name, totalGiven: 0, totalTaken: 0, principalGiven: 0, principalTaken: 0, interestGiven: 0, interestTaken: 0 };
      if (r.transactionType === 'given') {
        map[key].totalGiven += +r.total || 0;
        map[key].principalGiven += +r.principal || 0;
        map[key].interestGiven += +r.interest || 0;
      } else {
        map[key].totalTaken += +r.total || 0;
        map[key].principalTaken += +r.principal || 0;
        map[key].interestTaken += +r.interest || 0;
      }
    });
    return Object.values(map)
      .map(p => ({ 
        ...p, 
        netAmount: (includeInterest ? p.totalGiven : p.principalGiven) - (includeInterest ? p.totalTaken : p.principalTaken)
      }))
      .sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount));
  }, [records, yearFilter, includeInterest]);

  const stats = useMemo(() => {
    const total = filteredRecords.reduce((s, r) => s + (r.total || 0), 0);
    const totalInterest = filteredRecords.reduce((s, r) => s + (r.interest || 0), 0);
    const totalPrincipal = filteredRecords.reduce((s, r) => s + (r.principal || 0), 0);
    const totalGiven = filteredRecords.filter(r => r.transactionType === 'given').reduce((s, r) => s + (includeInterest ? (r.total || 0) : (r.principal || 0)), 0);
    const totalTaken = filteredRecords.filter(r => r.transactionType === 'taken').reduce((s, r) => s + (includeInterest ? (r.total || 0) : (r.principal || 0)), 0);
    const principalGiven = filteredRecords.filter(r => r.transactionType === 'given').reduce((s, r) => s + (r.principal || 0), 0);
    const principalTaken = filteredRecords.filter(r => r.transactionType === 'taken').reduce((s, r) => s + (r.principal || 0), 0);
    return { total, totalInterest, totalPrincipal, totalGiven, totalTaken, principalGiven, principalTaken, count: filteredRecords.length };
  }, [filteredRecords, includeInterest]);

  async function handleSave(data) {
    if (editingRecord) {
      await updateRecord(editingRecord.id, data);
      addToast('Calculation updated!', 'success');
    } else {
      await addRecord(data);
      addToast('Calculation saved!', 'success');
    }
  }

  async function handleDelete() {
    await deleteRecord(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Record deleted', 'success');
  }

  // Resize handler
  function handleResizeStart(e) {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX || e.touches?.[0]?.clientX;
    const startWidth = sidePanelWidth;

    function handleMouseMove(ev) {
      const currentX = ev.clientX || ev.touches?.[0]?.clientX;
      const diff = startX - currentX;
      const newWidth = Math.min(Math.max(240, startWidth + diff), 500);
      setSidePanelWidth(newWidth);
    }

    function handleMouseUp() {
      setIsResizing(false);
      try { localStorage.setItem('interestSidePanelWidth', String(sidePanelWidth)); } catch {}
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('touchend', handleMouseUp);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Percent className="w-6 h-6 text-primary-600" /> Interest Calculator
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Calculate simple and compound interest with history tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelector year={yearFilter} calendar={calendar} onChange={yr => setYearFilter(yr)} />
          <button
            onClick={() => { setEditingRecord(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Calculations</p>
          <CountUpValue value={stats.count} className="text-xl font-bold text-gray-900 dark:text-white mt-1 block" />
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Total Principal</p>
          <CountUpValue value={formatCurrency(stats.totalPrincipal, currency)} className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1 block" />
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-4">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">Total Interest</p>
          <CountUpValue value={formatCurrency(stats.totalInterest, currency)} className="text-xl font-bold text-green-700 dark:text-green-400 mt-1 block" />
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-200 dark:border-purple-800 p-4">
          <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Total Value</p>
          <CountUpValue value={formatCurrency(stats.total, currency)} className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-1 block" />
        </div>
      </div>

      {/* Empty State */}
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center px-4">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
            <Percent className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No calculations yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
            Start calculating interest for your investments and loans.
          </p>
          <button
            onClick={() => { setEditingRecord(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add First Entry
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start lg:gap-0">
          {/* ── Left: Main Table ── */}
          <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Search + active filter */}
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPersonFilter(null); }}
                  placeholder="Search by type, date (YYYY-MM-DD), name, amount, rate, duration..."
                  className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowSidePanel(o => !o)}
                title={showSidePanel ? 'Hide panel' : 'Show panel'}
                className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {showSidePanel
                  ? <PanelRightClose className="w-4 h-4" />
                  : <PanelRightOpen  className="w-4 h-4" />}
              </button>
              {personFilter && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-sm border border-primary-200 dark:border-primary-800 flex-shrink-0">
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[100px] truncate">{capFirst(personFilter)}</span>
                  <button onClick={() => setPersonFilter(null)} className="hover:text-primary-900"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            {filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No records found</p>
                {(search || personFilter) && (
                  <button onClick={() => { setSearch(''); setPersonFilter(null); }} className="mt-2 text-xs text-primary-600 hover:underline">Clear filter</button>
                )}
              </div>
            ) : (
              <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Type & Date</th>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-right">Principal</th>
                  <th className="px-5 py-3 text-center">Rate %</th>
                  <th className="px-5 py-3 text-center">Duration</th>
                  <th className="px-5 py-3 text-right">Interest</th>
                  <th className="px-5 py-3 text-right">Total Value</th>
                  <th className="px-5 py-3 text-center">Info</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredRecords.map(record => {
                  // Calculate till today interest
                  const startDate = new Date(record.date);
                  const today = new Date();
                  const diffTime = Math.abs(today - startDate);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const yearsElapsed = diffDays / 365;
                  const P = record.principal;
                  const r = record.rate / 100;
                  let tillTodayInterest = 0;
                  
                  if (record.type === 'simple') {
                    const A = P * (1 + r * yearsElapsed);
                    tillTodayInterest = A - P;
                  } else {
                    const n = record.compoundFrequency;
                    const A = P * Math.pow(1 + r / n, n * yearsElapsed);
                    tillTodayInterest = A - P;
                  }
                  
                  return (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {record.transactionType === 'given' ? (
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        ) : (
                          <TrendingUp className="w-4 h-4 rotate-180 text-red-600 dark:text-red-400 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-gray-900 dark:text-white">
                              {record.transactionType === 'given' ? 'Given' : 'Taken'}
                            </p>
                            {record.isSettled && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                ✓ {record.transactionType === 'given' ? 'Received' : 'Paid'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{dateLabel(record.date)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{capFirst(record.name)}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          record.type === 'simple'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {record.type === 'simple' ? 'Simple' : 'Compound'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(record.principal, currency)}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400">
                      {record.rate.toFixed(2)}%
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400">
                      {record.years.toFixed(2)} yrs
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="text-xs">
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(tillTodayInterest, currency)}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500">/ {formatCurrency(record.interest, currency)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-primary-600 dark:text-primary-400">
                      {formatCurrency(record.total, currency)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => { setSelectedRecord(record); setInfoModalOpen(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setQuickAddOpen({ open: true, row: record })}
                          className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                          title="Quick Add"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingRecord(record); setModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(record)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
            {filteredRecords.map(record => {
              // Calculate till today interest for mobile
              const startDate = new Date(record.date);
              const today = new Date();
              const diffTime = Math.abs(today - startDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const yearsElapsed = diffDays / 365;
              const P = record.principal;
              const r = record.rate / 100;
              let tillTodayInterest = 0;
              
              if (record.type === 'simple') {
                const A = P * (1 + r * yearsElapsed);
                tillTodayInterest = A - P;
              } else {
                const n = record.compoundFrequency;
                const A = P * Math.pow(1 + r / n, n * yearsElapsed);
                tillTodayInterest = A - P;
              }
              
              return (
              <div key={record.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {record.transactionType === 'given' ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-xs font-medium">Given</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                          <TrendingUp className="w-3 h-3 rotate-180" />
                          <span className="text-xs font-medium">Taken</span>
                        </div>
                      )}
                      {record.isSettled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          ✓ {record.transactionType === 'given' ? 'Received' : 'Paid'}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">{capFirst(record.name)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{dateLabel(record.date)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setSelectedRecord(record); setInfoModalOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setQuickAddOpen({ open: true, row: record })}
                      className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setEditingRecord(record); setModalOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(record)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className={`font-medium ${
                      record.type === 'simple' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      {record.type === 'simple' ? 'Simple' : 'Compound'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Principal:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(record.principal, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Rate:</span>
                    <span className="text-gray-600 dark:text-gray-400">{record.rate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                    <span className="text-gray-600 dark:text-gray-400">{record.years.toFixed(2)} years</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Interest (Today/Total):</span>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600 dark:text-blue-400 text-sm">
                        {formatCurrency(tillTodayInterest, currency)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">/ {formatCurrency(record.interest, currency)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Total:</span>
                    <span className="font-bold text-primary-600 dark:text-primary-400">
                      {formatCurrency(record.total, currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
            </>
          )}
          </div>

          {/* ── Resizable Divider ── */}
          {showSidePanel && (
            <div
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
              className={`hidden lg:block flex-shrink-0 cursor-col-resize transition-all relative self-stretch ${isResizing ? 'bg-primary-500/10' : 'hover:bg-primary-500/5'}`}
              style={{ width: '8px', padding: '6px', touchAction: 'none' }}
            >
              <div className={`absolute left-1/2 -translate-x-1/2 w-0.5 transition-colors ${isResizing ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600 hover:bg-primary-400 dark:hover:bg-primary-500'}`} 
                   style={{ top: '10%', bottom: '10%' }} />
              <div className="absolute inset-0 -left-2 -right-2" />
            </div>
          )}

          {/* ── Right: Person Summary Panel + Chart ── */}
          {showSidePanel && (
          <div className="flex-shrink-0 flex flex-col gap-4" style={{ width: window.innerWidth >= 1024 ? `${sidePanelWidth}px` : '100%' }}>
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
                  {/* Include Interest Checkbox */}
                  <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/40">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeInterest}
                        onChange={(e) => setIncludeInterest(e.target.checked)}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Include Interest</span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/40">
                    <div>Name</div>
                    <div className="text-right">Given</div>
                    <div className="text-right">Taken</div>
                  </div>
                  {personSummary.map(person => {
                    const isActive = personFilter === person.key;
                    const givenAmount = includeInterest ? person.totalGiven : person.principalGiven;
                    const takenAmount = includeInterest ? person.totalTaken : person.principalTaken;
                    return (
                      <button
                        key={person.key}
                        onClick={() => { setPersonFilter(p => p === person.key ? null : person.key); }}
                        className={`w-full grid grid-cols-3 gap-1 px-4 py-3 text-left transition-colors ${
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-sm font-medium truncate ${isActive ? 'text-primary-700 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {capFirst(person.name)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">{formatCurrency(givenAmount, currency)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">{formatCurrency(takenAmount, currency)}</span>
                        </div>
                      </button>
                    );
                  })}
                  <div className="grid grid-cols-3 gap-1 px-4 py-3 bg-gray-50 dark:bg-gray-700/40 text-xs font-black text-gray-700 dark:text-gray-200 uppercase">
                    <div>Total</div>
                    <div className="text-right text-green-600 dark:text-green-400">{formatCurrency(stats.totalGiven, currency)}</div>
                    <div className="text-right text-red-600 dark:text-red-400">{formatCurrency(stats.totalTaken, currency)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Given vs Taken Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700"
                onClick={() => setChartOpen(o => !o)}
              >
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Given vs Taken</span>
                <div className="flex items-center gap-3">
                  {chartOpen && (
                    <>
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-block w-3 h-2.5 rounded-sm bg-green-500" /> Given
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-block w-3 h-2.5 rounded-sm bg-red-500" /> Taken
                      </span>
                    </>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${chartOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {chartOpen && (
                <div className="px-4 py-3 space-y-3">
                  {personSummary.map(person => {
                    const isActive = personFilter === person.key;
                    const givenAmount = includeInterest ? person.totalGiven : person.principalGiven;
                    const takenAmount = includeInterest ? person.totalTaken : person.principalTaken;
                    return (
                      <button
                        key={person.key}
                        onClick={() => { setPersonFilter(p => p === person.key ? null : person.key); }}
                        className={`w-full text-left group rounded-lg px-1 py-0.5 transition-colors ${isActive ? 'ring-1 ring-primary-400' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold truncate max-w-[55%] ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {capFirst(person.name)}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                            <span className="text-green-600 dark:text-green-400">{formatCurrency(givenAmount, currency)}</span>
                            {' / '}
                            <span className="text-red-600 dark:text-red-400">{formatCurrency(takenAmount, currency)}</span>
                          </span>
                        </div>
                        {/* Merged bar track - Taken as base, Given overlays */}
                        <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                          {/* Red bar (Taken) - always full width as base */}
                          <div
                            className="absolute left-0 top-0 h-full w-full rounded-full"
                            style={{ backgroundColor: '#ef4444' }}
                          />
                          {/* Green bar (Given) - overlays on top, proportional to taken */}
                          <div
                            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${takenAmount > 0 ? Math.min((givenAmount / takenAmount) * 100, 100) : (givenAmount > 0 ? 100 : 0)}%`, 
                              backgroundColor: '#22c55e' 
                            }}
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
      <InterestModal
        isOpen={modalOpen}
        record={editingRecord}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
      <InfoModal
        isOpen={infoModalOpen}
        record={selectedRecord}
        onClose={() => setInfoModalOpen(false)}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Calculation"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <QuickAddModal
        isOpen={quickAddOpen.open}
        onClose={() => setQuickAddOpen({ open: false, row: null })}
        sourcePage="interest"
        sourceRow={quickAddOpen.row}
      />
    </div>
  );
}

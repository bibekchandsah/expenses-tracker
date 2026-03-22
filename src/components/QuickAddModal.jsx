import { useState, useEffect, useMemo } from 'react';
import { X, Plus, ArrowDown, ArrowUp, ChevronLeft, User } from 'lucide-react';
import { useToast } from './ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useIncomes } from '../context/IncomeContext';
import { useExpenses } from '../context/ExpenseContext';
import { useBanks } from '../context/BankContext';
import { useLends } from '../context/LendContext';
import { useLoans } from '../context/LoanContext';
import { useSavings } from '../context/SavingContext';
import { useForMe } from '../context/ForMeContext';
import { useInterest } from '../context/InterestContext';
import { useCategories } from '../context/CategoryContext';
import { useCalendar } from '../context/CalendarContext';
import NepaliDatePickerInput from './ui/NepaliDatePickerInput';
import { INCOME_SOURCES } from './IncomeModal';
import { addBankEntry as addBankEntrySvc } from '../services/bankService';
import { capWords } from '../utils/formatters';

const TODAY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const PAGE_OPTIONS = [
  { key: 'income',   label: 'Income',   icon: '💰', accent: 'green',  bankDir: 'deposit'  },
  { key: 'expenses', label: 'Expenses', icon: '💸', accent: 'red',    bankDir: 'withdraw' },
  { key: 'bank',     label: 'Bank',     icon: '🏦', accent: 'blue',   bankDir: null       },
  { key: 'lend',     label: 'Lend',     icon: '🤝', accent: 'orange', bankDir: 'withdraw' },
  { key: 'loan',     label: 'Loan',     icon: '💼', accent: 'purple', bankDir: 'deposit'  },
  { key: 'saving',   label: 'Saving',   icon: '🐷', accent: 'teal',   bankDir: 'deposit'  },
  { key: 'forMe',    label: 'For Me',   icon: '❤️', accent: 'pink',   bankDir: 'deposit'  },
  { key: 'interest', label: 'Interest', icon: '📈', accent: 'indigo', bankDir: null       },
];

const ACCENT_BTN = {
  green:  'bg-green-600 hover:bg-green-700',
  red:    'bg-red-500 hover:bg-red-600',
  blue:   'bg-blue-600 hover:bg-blue-700',
  orange: 'bg-orange-500 hover:bg-orange-600',
  purple: 'bg-purple-600 hover:bg-purple-700',
  teal:   'bg-teal-600 hover:bg-teal-700',
  pink:   'bg-pink-500 hover:bg-pink-600',
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
};

const ACCENT_TEXT = {
  green:  'text-green-600 dark:text-green-400',
  red:    'text-red-500 dark:text-red-400',
  blue:   'text-blue-600 dark:text-blue-400',
  orange: 'text-orange-500 dark:text-orange-400',
  purple: 'text-purple-600 dark:text-purple-400',
  teal:   'text-teal-600 dark:text-teal-400',
  pink:   'text-pink-500 dark:text-pink-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
};

const ACCENT_CARD = {
  green:  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-500',
  red:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-500',
  blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-500',
  orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-500',
  purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-500',
  teal:   'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 hover:border-teal-400 dark:hover:border-teal-500',
  pink:   'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 hover:border-pink-400 dark:hover:border-pink-500',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-500',
};

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const LABEL_CLS = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

// Safely convert any date value (string, JS Date, Firestore Timestamp) to "YYYY-MM-DD"
function toISODate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  const dt = typeof d.toDate === 'function' ? d.toDate() : (d instanceof Date ? d : null);
  if (!dt) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// Build a pre-filled form for targetPage from the sourceRow values
function prefill(targetPage, sourceRow) {
  const today = TODAY();
  if (!sourceRow) {
    const base = { date: today, amount: '' };
    switch (targetPage) {
      case 'income':   return { ...base, title: '', source: '', notes: '', description: '' };
      case 'expenses': return { ...base, title: '', category: '', notes: '', description: '' };
      case 'bank':     return { date: today, type: 'deposit', amount: '', description: '', bankId: '' };
      case 'lend':     return { ...base, name: '', reason: '', description: '' };
      case 'loan':     return { ...base, name: '', reason: '', description: '' };
      case 'saving':   return { ...base, expendOn: '', description: '' };
      case 'forMe':    return { ...base, name: '', person: '', description: '' };
      case 'interest': return { date: today, name: '', principal: '', rate: '', years: '', months: '', days: '', interestType: 'simple', transactionType: 'given', compoundFrequency: 12, info: '' };
      default:         return { date: today };
    }
  }
  const date        = toISODate(sourceRow.date) || today;
  const amount      = sourceRow.amount != null ? String(sourceRow.amount) : '';
  const description = sourceRow.description || '';
  // Normalise a "name-like" value from whatever field the source row has
  const nameish = sourceRow.name || sourceRow.title || sourceRow.expendOn || '';
  switch (targetPage) {
    case 'income':   return { date, amount: sourceRow.withdraw || sourceRow.deposit || sourceRow.lent || sourceRow.borrowed || sourceRow.amount, title: nameish || sourceRow.description || '', source: '', notes: sourceRow.notes || sourceRow.reason || '', description };
    case 'expenses': return { date, amount: sourceRow.withdraw || sourceRow.deposit || sourceRow.lent || sourceRow.borrowed || sourceRow.amount, title: nameish || sourceRow.description || '', category: '', notes: sourceRow.note || sourceRow.notes || sourceRow.reason || '', description };
    case 'bank':     return { date, type: 'deposit', amount: sourceRow.withdraw || sourceRow.deposit || sourceRow.lent || sourceRow.borrowed || sourceRow.amount, description: nameish+' '+sourceRow.reason || description, bankId: '' };
    case 'lend':     return { date, amount: sourceRow.withdraw || sourceRow.deposit || sourceRow.lent || sourceRow.borrowed || sourceRow.amount, name: nameish, reason: sourceRow.reason || sourceRow.note || sourceRow.notes || '', description };
    case 'loan':     return { date, amount: sourceRow.withdraw || sourceRow.deposit || sourceRow.lent || sourceRow.borrowed || sourceRow.amount, name: nameish, reason: sourceRow.reason || sourceRow.note || sourceRow.notes || '', description };
    case 'saving':   return { date, amount: sourceRow.withdraw || sourceRow.deposit || sourceRow.lent || sourceRow.borrowed || sourceRow.amount, expendOn: nameish+' '+sourceRow.reason, description };
    case 'forMe':    return { date, amount: sourceRow.withdraw || sourceRow.deposit || sourceRow.lent || sourceRow.borrowed || sourceRow.amount, name: nameish, person: sourceRow.person || '', description };
    case 'interest': {
      // Extract years, months, days from total years
      const totalYears = sourceRow.years || 0;
      const years = Math.floor(totalYears);
      const remainingMonths = (totalYears - years) * 12;
      const months = Math.floor(remainingMonths);
      const days = Math.round((remainingMonths - months) * 30);
      
      return { 
        date, 
        name: nameish, 
        principal: String(sourceRow.principal || sourceRow.amount || sourceRow.withdraw || sourceRow.deposit || ''), 
        rate: String(sourceRow.rate || ''), 
        years: String(years || ''), 
        months: String(months || ''), 
        days: String(days || ''), 
        interestType: sourceRow.type || 'simple', 
        transactionType: sourceRow.transactionType || 'given', 
        compoundFrequency: sourceRow.compoundFrequency || 12, 
        info: sourceRow.info || description 
      };
    }
    default:         return { date: today };
  }
}


export default function QuickAddModal({ isOpen, onClose, sourcePage, sourceRow }) {
  const { addToast } = useToast();
  const { user } = useAuth();

  // ── Consume all page contexts internally ─────────────────────
  const { addIncome }                           = useIncomes();
  const { addExpense }                          = useExpenses();
  const { banks }                               = useBanks();
  const { addLend, lends }                      = useLends();
  const { addLoan, loans }                      = useLoans();
  const { addSaving }                           = useSavings();
  const { addEntry: addForMeEntry, entries: forMeEntries } = useForMe();
  const { addRecord: addInterestRecord }        = useInterest();
  const { categories }                          = useCategories();

  // ── Deduplicated name suggestions from existing records ────────
  const existingNames = useMemo(() => {
    const seen = new Set();
    return [
      ...(lends || []).map(l => l.name),
      ...(loans || []).map(l => l.name),
      ...(forMeEntries || []).map(e => e.name),
    ]
      .filter(Boolean)
      .reduce((acc, n) => {
        const key = n.trim().toLowerCase();
        if (!seen.has(key)) { seen.add(key); acc.push(capWords(n.trim())); }
        return acc;
      }, [])
      .sort();
  }, [lends, loans, forMeEntries]);

  // ── Component state ──────────────────────────────────────────
  const [targetPage,   setTargetPage]   = useState(null);   // null = page-picker step
  const [form,         setForm]         = useState({});
  const [saving,       setSaving]       = useState(false);
  const [count,        setCount]        = useState(0);
  const [nameSuggest,  setNameSuggest]  = useState(false);
  const { calendar, dateLabel } = useCalendar();

  // Reset everything when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTargetPage(null);
      setForm({});
      setCount(0);
    }
  }, [isOpen]); // eslint-disable-line

  // Pre-fill form when user picks a target page
  useEffect(() => {
    if (targetPage) {
      const f = prefill(targetPage, sourceRow);
      if (targetPage === 'bank' && banks.length > 0) f.bankId = banks[0].id;
      setForm(f);
    }
  }, [targetPage]); // eslint-disable-line

  if (!isOpen) return null;

  const pageOpt  = PAGE_OPTIONS.find(p => p.key === targetPage);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function getAddFn(pg) {
    switch (pg) {
      case 'income':   return addIncome;
      case 'expenses': return addExpense;
      case 'lend':     return addLend;
      case 'loan':     return addLoan;
      case 'saving':   return addSaving;
      case 'forMe':    return addForMeEntry;
      case 'interest': return addInterestRecord;
      default:         return null;
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!targetPage) return;
    
    // Interest validation
    if (targetPage === 'interest') {
      const principal = parseFloat(form.principal);
      const rate = parseFloat(form.rate);
      const y = parseFloat(form.years) || 0;
      const m = parseFloat(form.months) || 0;
      const d = parseFloat(form.days) || 0;
      const totalYears = y + (m / 12) + (d / 365);
      
      if (!form.principal || isNaN(principal) || principal <= 0) {
        addToast('Enter a valid principal amount', 'error'); return;
      }
      if (!form.rate || isNaN(rate) || rate <= 0) {
        addToast('Enter a valid interest rate', 'error'); return;
      }
      if (totalYears <= 0) {
        addToast('Enter a valid duration (years, months, or days)', 'error'); return;
      }
      if (!form.name?.trim()) {
        addToast('Name is required', 'error'); return;
      }
    }
    
    const amt = parseFloat(form.amount);
    if (targetPage !== 'bank' && targetPage !== 'interest' && (!form.amount || isNaN(amt) || amt <= 0)) {
      addToast('Enter a valid amount', 'error'); return;
    }
    // Bank validation
    if (targetPage === 'bank') {
      const ba = parseFloat(form.amount);
      if (!form.amount || isNaN(ba) || ba <= 0) { addToast('Enter a valid amount', 'error'); return; }
      if (!form.bankId) { addToast('Select a bank', 'error'); return; }
    }
    if ((targetPage === 'income' || targetPage === 'expenses') && !form.title?.trim()) {
      addToast('Title is required', 'error'); return;
    }
    if ((targetPage === 'lend' || targetPage === 'loan') && !form.name?.trim()) {
      addToast('Name is required', 'error'); return;
    }
    setSaving(true);
    try {
      const data = { ...form };
      
      if (targetPage === 'interest') {
        // For interest, calculate based on all provided fields
        const P = parseFloat(form.principal);
        const r = parseFloat(form.rate) / 100;
        const y = parseFloat(form.years) || 0;
        const m = parseFloat(form.months) || 0;
        const d = parseFloat(form.days) || 0;
        const t = y + (m / 12) + (d / 365);
        
        let A, interest;
        if ((form.interestType || 'simple') === 'simple') {
          A = P * (1 + r * t);
          interest = A - P;
        } else {
          const n = form.compoundFrequency || 12;
          A = P * Math.pow(1 + r / n, n * t);
          interest = A - P;
        }
        
        await addInterestRecord({
          name: form.name,
          date: form.date,
          transactionType: form.transactionType || 'given',
          type: form.interestType || 'simple',
          principal: P,
          rate: parseFloat(form.rate),
          years: t,
          compoundFrequency: form.interestType === 'compound' ? (form.compoundFrequency || 12) : null,
          interest: interest,
          total: A,
          info: form.info || '',
          isSettled: false,
        });
      } else {
        const numAmt = parseFloat(form.amount) || 0;

        if (targetPage === 'bank') {
          data.deposit  = form.type === 'deposit'  ? numAmt : 0;
          data.withdraw = form.type === 'withdraw' ? numAmt : 0;
          delete data.type;
          delete data.amount;
          const bankId = data.bankId;
          delete data.bankId;
          await addBankEntrySvc(user.uid, bankId, data);
        } else {
          data.amount = numAmt;
        }
        if (targetPage === 'lend') data.returnedAmount = 0;
        if (targetPage === 'loan') data.paidAmount = 0;

        if (targetPage !== 'bank') {
          const addFn = getAddFn(targetPage);
          if (addFn) await addFn(data);
        }
      }

      setCount(c => c + 1);
      addToast(`${pageOpt.label} entry added`, 'success');
      // Re-prefill (keeps date + source row values, clears editable fields)
      const nextForm = prefill(targetPage, sourceRow);
      if (targetPage === 'bank') nextForm.bankId = form.bankId; // keep selected bank
      setForm(nextForm);
    } catch {
      addToast('Failed to save entry', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-in max-h-[90vh] overflow-y-auto">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            {targetPage && (
              <button
                onClick={() => setTargetPage(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                title="Change page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className={`text-sm font-semibold truncate ${targetPage ? ACCENT_TEXT[pageOpt.accent] : 'text-gray-700 dark:text-gray-200'}`}>
                {targetPage ? `Quick Add → ${pageOpt.icon} ${pageOpt.label}` : '⚡ Quick Add Entry'}
              </h2>
              {!targetPage && sourcePage && (
                <p className="text-xs text-gray-400 mt-0.5 capitalize">From: {sourcePage}</p>
              )}
              {count > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {count} entr{count === 1 ? 'y' : 'ies'} added this session
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Step 1: Page Picker ──────────────────────────────── */}
        {!targetPage ? (
          <div className="p-4">
            {sourceRow && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Pre-filling from selected row:</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 dark:text-gray-300">
                  {sourceRow.date   && <span>📅 {dateLabel(toISODate(sourceRow.date))}</span>}
                  {(sourceRow.withdraw || sourceRow.deposit || sourceRow.amount) && (
                    <span>💲 {sourceRow.withdraw || sourceRow.deposit || sourceRow.amount}</span>
                  )}
                  {(sourceRow.name || sourceRow.title || sourceRow.expendOn || sourceRow.description) && (
                    <span>🏷 {sourceRow.name || sourceRow.title || sourceRow.expendOn || sourceRow.description}</span>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Select a page to add an entry to:</p>
            <div className="grid grid-cols-2 gap-2">
              {PAGE_OPTIONS.map(opt => {
                const isCurrent = opt.key === sourcePage;
                return (
                  <button
                    key={opt.key}
                    onClick={() => !isCurrent && setTargetPage(opt.key)}
                    disabled={isCurrent}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      isCurrent
                        ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-700/40 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                        : `${ACCENT_CARD[opt.accent]} ${ACCENT_TEXT[opt.accent]}`
                    }`}
                  >
                    <span className="text-base leading-none">{opt.icon}</span>
                    <span>{opt.label}{isCurrent && <span className="ml-1 text-xs opacity-70">(current)</span>}</span>
                  </button>
                );
              })}
            </div>
          </div>

        ) : (
          /* ── Step 2: Form ─────────────────────────────────── */
          <form onSubmit={handleAdd} className="p-4 space-y-3">

            {/* Date + Amount (not for interest) */}
            {targetPage !== 'interest' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>Date</label>
                  {calendar === 'bs' ? (
                    <NepaliDatePickerInput
                      value={form.date || ''}
                      onChange={adDate => set('date', adDate)}
                      className={INPUT_CLS}
                    />
                  ) : (
                    <input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} className={INPUT_CLS} />
                  )}
                </div>
                <div>
                  <label className={LABEL_CLS}>Amount *</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount || ''} onChange={e => set('amount', e.target.value)} className={INPUT_CLS} autoFocus />
                </div>
              </div>
            )}

            {/* Date only for interest */}
            {targetPage === 'interest' && (
              <div>
                <label className={LABEL_CLS}>Date</label>
                {calendar === 'bs' ? (
                  <NepaliDatePickerInput
                    value={form.date || ''}
                    onChange={adDate => set('date', adDate)}
                    className={INPUT_CLS}
                  />
                ) : (
                  <input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} className={INPUT_CLS} />
                )}
              </div>
            )}

            {/* Bank selector */}
            {targetPage === 'bank' && banks.length > 0 && (
              <div>
                <label className={LABEL_CLS}>Bank *</label>
                <select
                  value={form.bankId || ''}
                  onChange={e => set('bankId', e.target.value)}
                  className={INPUT_CLS}
                >
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>🏦 {b.name}</option>
                  ))}
                </select>
              </div>
            )}
            {targetPage === 'bank' && banks.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center py-1">No banks added yet. Add a bank first.</p>
            )}

            {/* Bank: deposit / withdraw toggle */}
            {targetPage === 'bank' && (
              <div>
                <label className={LABEL_CLS}>Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => set('type', 'deposit')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-colors ${form.type === 'deposit' ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700 dark:text-green-400 font-medium' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
                    <ArrowDown className="w-3.5 h-3.5" /> Deposit
                  </button>
                  <button type="button" onClick={() => set('type', 'withdraw')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-colors ${form.type === 'withdraw' ? 'bg-red-50 dark:bg-red-900/20 border-red-400 text-red-700 dark:text-red-400 font-medium' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
                    <ArrowUp className="w-3.5 h-3.5" /> Withdraw
                  </button>
                </div>
              </div>
            )}

            {/* Title (income / expenses) */}
            {(targetPage === 'income' || targetPage === 'expenses') && (
              <div>
                <label className={LABEL_CLS}>Title *</label>
                <input type="text" placeholder="Title" value={form.title || ''} onChange={e => set('title', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

            {/* Name (lend / loan / forMe) with autocomplete */}
            {(targetPage === 'lend' || targetPage === 'loan' || targetPage === 'forMe') && (() => {
              const suggestions = existingNames.filter(n =>
                n.toLowerCase().includes((form.name || '').toLowerCase()) &&
                n.toLowerCase() !== (form.name || '').trim().toLowerCase()
              );
              return (
                <div className="relative">
                  <label className={LABEL_CLS}>{targetPage === 'forMe' ? 'Name' : 'Name *'}</label>
                  <input
                    type="text"
                    placeholder="Person's name"
                    value={form.name || ''}
                    onChange={e => { set('name', e.target.value); setNameSuggest(true); }}
                    onFocus={() => setNameSuggest(true)}
                    onBlur={() => setTimeout(() => setNameSuggest(false), 150)}
                    className={INPUT_CLS}
                  />
                  {nameSuggest && form.name && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-20 overflow-hidden">
                      {suggestions.map(n => (
                        <button key={n} type="button"
                          onMouseDown={() => { set('name', n); setNameSuggest(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                          <User className="w-3.5 h-3.5 opacity-50" /> {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Person (forMe) */}
            {targetPage === 'forMe' && (
              <div>
                <label className={LABEL_CLS}>Person</label>
                <input type="text" placeholder="Context / note about person" value={form.person || ''} onChange={e => set('person', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

            {/* Source (income) */}
            {targetPage === 'income' && (
              <div>
                <label className={LABEL_CLS}>Source</label>
                <select value={form.source || ''} onChange={e => set('source', e.target.value)} className={INPUT_CLS}>
                  <option value="">— Select source —</option>
                  {INCOME_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}

            {/* Category (expenses) */}
            {targetPage === 'expenses' && categories.length > 0 && (
              <div>
                <label className={LABEL_CLS}>Category</label>
                <select value={form.category || ''} onChange={e => set('category', e.target.value)} className={INPUT_CLS}>
                  <option value="">— No category —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            )}

            {/* Reason (lend / loan) */}
            {(targetPage === 'lend' || targetPage === 'loan') && (
              <div>
                <label className={LABEL_CLS}>Reason</label>
                <input type="text" placeholder="Reason" value={form.reason || ''} onChange={e => set('reason', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

            {/* Expend On (saving) */}
            {targetPage === 'saving' && (
              <div>
                <label className={LABEL_CLS}>Expend On</label>
                <input type="text" placeholder="What are you saving for?" value={form.expendOn || ''} onChange={e => set('expendOn', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

            {/* Interest-specific fields */}
            {targetPage === 'interest' && (
              <>
                {/* Interest Type Toggle */}
                <div>
                  <label className={LABEL_CLS}>Interest Type *</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <button
                      type="button"
                      onClick={() => set('interestType', 'simple')}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        (form.interestType || 'simple') === 'simple'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => set('interestType', 'compound')}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        form.interestType === 'compound'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Compound
                    </button>
                  </div>
                </div>

                {/* Transaction Type */}
                <div>
                  <label className={LABEL_CLS}>Transaction Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => set('transactionType', 'given')}
                      className={`py-2 px-3 rounded-xl text-xs font-medium transition-all border ${
                        (form.transactionType || 'given') === 'given'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Given / Invested
                    </button>
                    <button
                      type="button"
                      onClick={() => set('transactionType', 'taken')}
                      className={`py-2 px-3 rounded-xl text-xs font-medium transition-all border ${
                        form.transactionType === 'taken'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Taken / Borrowed
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className={LABEL_CLS}>Name / Description *</label>
                  <input type="text" placeholder="e.g. Fixed Deposit, Loan..." value={form.name || ''} onChange={e => set('name', e.target.value)} className={INPUT_CLS} />
                </div>

                {/* Principal Amount */}
                <div>
                  <label className={LABEL_CLS}>Principal Amount *</label>
                  <input type="number" step="0.01" min="0" placeholder="10000" value={form.principal || ''} onChange={e => set('principal', e.target.value)} className={INPUT_CLS} />
                </div>

                {/* Annual Rate */}
                <div>
                  <label className={LABEL_CLS}>Annual Rate (%) *</label>
                  <input type="number" step="0.01" min="0" placeholder="5.5" value={form.rate || ''} onChange={e => set('rate', e.target.value)} className={INPUT_CLS} />
                </div>

                {/* Duration */}
                <div>
                  <label className={LABEL_CLS}>Duration *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <input
                        type="number"
                        min="0"
                        value={form.years || ''}
                        onChange={e => set('years', e.target.value)}
                        placeholder="Years"
                        className={INPUT_CLS}
                      />
                      <p className="text-xs text-gray-400 mt-1 text-center">Years</p>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="11"
                        value={form.months || ''}
                        onChange={e => set('months', e.target.value)}
                        placeholder="Months"
                        className={INPUT_CLS}
                      />
                      <p className="text-xs text-gray-400 mt-1 text-center">Months</p>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="364"
                        value={form.days || ''}
                        onChange={e => set('days', e.target.value)}
                        placeholder="Days"
                        className={INPUT_CLS}
                      />
                      <p className="text-xs text-gray-400 mt-1 text-center">Days</p>
                    </div>
                  </div>
                </div>

                {/* Compound Frequency */}
                {form.interestType === 'compound' && (
                  <div>
                    <label className={LABEL_CLS}>Compound Frequency</label>
                    <select
                      value={form.compoundFrequency || 12}
                      onChange={e => set('compoundFrequency', parseInt(e.target.value))}
                      className={INPUT_CLS}
                    >
                      <option value={1}>Annually</option>
                      <option value={2}>Semi-Annually</option>
                      <option value={4}>Quarterly</option>
                      <option value={12}>Monthly</option>
                      <option value={52}>Weekly</option>
                      <option value={365}>Daily</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Notes (income) */}
            {targetPage === 'income' && (
              <div>
                <label className={LABEL_CLS}>Notes</label>
                <input type="text" placeholder="Notes" value={form.notes || ''} onChange={e => set('notes', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

            {/* Notes (expenses) */}
            {targetPage === 'expenses' && (
              <div>
                <label className={LABEL_CLS}>Notes</label>
                <input type="text" placeholder="Notes" value={form.notes || ''} onChange={e => set('notes', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

            {/* Description */}
            {targetPage !== 'interest' && (
              <div>
                <label className={LABEL_CLS}>Description</label>
                <input type="text" placeholder="Description" value={form.description || ''} onChange={e => set('description', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

            {/* Info (interest) */}
            {targetPage === 'interest' && (
              <div>
                <label className={LABEL_CLS}>Info</label>
                <input type="text" placeholder="Additional notes..." value={form.info || ''} onChange={e => set('info', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-60 ${ACCENT_BTN[pageOpt.accent]}`}
              >
                <Plus className="w-4 h-4" />
                {saving ? 'Adding…' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setTargetPage(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

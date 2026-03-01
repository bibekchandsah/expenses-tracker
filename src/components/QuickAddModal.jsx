import { useState, useEffect } from 'react';
import { X, Plus, Building2, ArrowDown, ArrowUp, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';
import { useIncomes } from '../context/IncomeContext';
import { useExpenses } from '../context/ExpenseContext';
import { useBanks } from '../context/BankContext';
import { useLends } from '../context/LendContext';
import { useLoans } from '../context/LoanContext';
import { useSavings } from '../context/SavingContext';
import { useForMe } from '../context/ForMeContext';
import { useCategories } from '../context/CategoryContext';
import { addBankEntry } from '../services/bankService';
import { INCOME_SOURCES } from './IncomeModal';

const TODAY = () => new Date().toISOString().slice(0, 10);

const PAGE_OPTIONS = [
  { key: 'income',   label: 'Income',   icon: '💰', accent: 'green',  bankDir: 'deposit'  },
  { key: 'expenses', label: 'Expenses', icon: '💸', accent: 'red',    bankDir: 'withdraw' },
  { key: 'bank',     label: 'Bank',     icon: '🏦', accent: 'blue',   bankDir: null       },
  { key: 'lend',     label: 'Lend',     icon: '🤝', accent: 'orange', bankDir: 'withdraw' },
  { key: 'loan',     label: 'Loan',     icon: '💼', accent: 'purple', bankDir: 'deposit'  },
  { key: 'saving',   label: 'Saving',   icon: '🐷', accent: 'teal',   bankDir: 'deposit'  },
  { key: 'forMe',    label: 'For Me',   icon: '❤️', accent: 'pink',   bankDir: 'deposit'  },
];

const ACCENT_BTN = {
  green:  'bg-green-600 hover:bg-green-700',
  red:    'bg-red-500 hover:bg-red-600',
  blue:   'bg-blue-600 hover:bg-blue-700',
  orange: 'bg-orange-500 hover:bg-orange-600',
  purple: 'bg-purple-600 hover:bg-purple-700',
  teal:   'bg-teal-600 hover:bg-teal-700',
  pink:   'bg-pink-500 hover:bg-pink-600',
};

const ACCENT_TEXT = {
  green:  'text-green-600 dark:text-green-400',
  red:    'text-red-500 dark:text-red-400',
  blue:   'text-blue-600 dark:text-blue-400',
  orange: 'text-orange-500 dark:text-orange-400',
  purple: 'text-purple-600 dark:text-purple-400',
  teal:   'text-teal-600 dark:text-teal-400',
  pink:   'text-pink-500 dark:text-pink-400',
};

const ACCENT_CARD = {
  green:  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-500',
  red:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-500',
  blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-500',
  orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-500',
  purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-500',
  teal:   'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 hover:border-teal-400 dark:hover:border-teal-500',
  pink:   'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 hover:border-pink-400 dark:hover:border-pink-500',
};

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const LABEL_CLS = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

// Build a pre-filled form for targetPage from the sourceRow values
function prefill(targetPage, sourceRow) {
  const today = TODAY();
  if (!sourceRow) {
    const base = { date: today, amount: '' };
    switch (targetPage) {
      case 'income':   return { ...base, title: '', source: '', notes: '', description: '' };
      case 'expenses': return { ...base, title: '', category: '', note: '', description: '' };
      case 'bank':     return { date: today, type: 'deposit', amount: '', description: '' };
      case 'lend':     return { ...base, name: '', reason: '', description: '' };
      case 'loan':     return { ...base, name: '', reason: '', description: '' };
      case 'saving':   return { ...base, expendOn: '', description: '' };
      case 'forMe':    return { ...base, name: '', person: '', description: '' };
      default:         return { date: today };
    }
  }
  const date        = sourceRow.date        || today;
  const amount      = sourceRow.amount != null ? String(sourceRow.amount) : '';
  const description = sourceRow.description || '';
  // Normalise a "name-like" value from whatever field the source row has
  const nameish = sourceRow.name || sourceRow.title || sourceRow.expendOn || '';
  switch (targetPage) {
    case 'income':   return { date, amount, title: nameish, source: '', notes: sourceRow.notes || '', description };
    case 'expenses': return { date, amount, title: nameish, category: '', note: sourceRow.note || '', description };
    case 'bank':     return { date, type: 'deposit', amount, description: nameish || description };
    case 'lend':     return { date, amount, name: nameish, reason: sourceRow.reason || '', description };
    case 'loan':     return { date, amount, name: nameish, reason: sourceRow.reason || '', description };
    case 'saving':   return { date, amount, expendOn: nameish, description };
    case 'forMe':    return { date, amount, name: nameish, person: sourceRow.person || '', description };
    default:         return { date: today };
  }
}

function toBankSyncEntry(targetPage, form) {
  const amt = +form.amount || 0;
  switch (targetPage) {
    case 'income':   return { date: form.date, deposit: amt, withdraw: 0,   description: form.title   || '' };
    case 'expenses': return { date: form.date, deposit: 0,   withdraw: amt, description: form.title   || '' };
    case 'lend':     return { date: form.date, deposit: 0,   withdraw: amt, description: form.name    || form.reason || '' };
    case 'loan':     return { date: form.date, deposit: amt, withdraw: 0,   description: form.name    || form.reason || '' };
    case 'saving':   return { date: form.date, deposit: amt, withdraw: 0,   description: form.expendOn || '' };
    case 'forMe':    return { date: form.date, deposit: amt, withdraw: 0,   description: form.name    || '' };
    default:         return null;
  }
}

export default function QuickAddModal({ isOpen, onClose, sourcePage, sourceRow }) {
  const { user }     = useAuth();
  const { addToast } = useToast();

  // ── Consume all page contexts internally ─────────────────────
  const { addIncome }                           = useIncomes();
  const { addExpense }                          = useExpenses();
  const { banks, selectedBankId, addEntry: addBankEntry_ctx } = useBanks();
  const { addLend }                             = useLends();
  const { addLoan }                             = useLoans();
  const { addSaving }                           = useSavings();
  const { addEntry: addForMeEntry }             = useForMe();
  const { categories }                          = useCategories();

  // ── Component state ──────────────────────────────────────────
  const [targetPage, setTargetPage] = useState(null);   // null = page-picker step
  const [form,       setForm]       = useState({});
  const [bankSync,   setBankSync]   = useState(false);
  const [bankId,     setBankId]     = useState('');
  const [saving,     setSaving]     = useState(false);
  const [count,      setCount]      = useState(0);

  // Reset everything when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTargetPage(null);
      setForm({});
      setBankSync(false);
      setBankId(selectedBankId || banks[0]?.id || '');
      setCount(0);
    }
  }, [isOpen]); // eslint-disable-line

  // Pre-fill form when user picks a target page
  useEffect(() => {
    if (targetPage) {
      setForm(prefill(targetPage, sourceRow));
      setBankSync(false);
    }
  }, [targetPage]); // eslint-disable-line

  if (!isOpen) return null;

  const pageOpt  = PAGE_OPTIONS.find(p => p.key === targetPage);
  const canSync  = !!(targetPage && targetPage !== 'bank' && banks.length > 0);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function getAddFn(pg) {
    switch (pg) {
      case 'income':   return addIncome;
      case 'expenses': return addExpense;
      case 'bank':     return addBankEntry_ctx;
      case 'lend':     return addLend;
      case 'loan':     return addLoan;
      case 'saving':   return addSaving;
      case 'forMe':    return addForMeEntry;
      default:         return null;
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!targetPage) return;
    const amt = parseFloat(form.amount);
    if (targetPage !== 'bank' && (!form.amount || isNaN(amt) || amt <= 0)) {
      addToast('Enter a valid amount', 'error'); return;
    }
    if (targetPage === 'bank') {
      const ba = parseFloat(form.amount);
      if (!form.amount || isNaN(ba) || ba <= 0) { addToast('Enter a valid amount', 'error'); return; }
    }
    if ((targetPage === 'income' || targetPage === 'expenses') && !form.title?.trim()) {
      addToast('Title is required', 'error'); return;
    }
    if ((targetPage === 'lend' || targetPage === 'loan') && !form.name?.trim()) {
      addToast('Name is required', 'error'); return;
    }
    if (canSync && bankSync && !bankId) {
      addToast('Select a bank to sync with', 'error'); return;
    }

    setSaving(true);
    try {
      const data = { ...form };
      const numAmt = parseFloat(form.amount) || 0;

      if (targetPage === 'bank') {
        data.deposit  = form.type === 'deposit'  ? numAmt : 0;
        data.withdraw = form.type === 'withdraw' ? numAmt : 0;
        delete data.type;
        delete data.amount;
      } else {
        data.amount = numAmt;
      }
      if (targetPage === 'lend') data.returnedAmount = 0;
      if (targetPage === 'loan') data.paidAmount = 0;

      const addFn = getAddFn(targetPage);
      if (addFn) await addFn(data);

      // Bank sync (skip when adding to bank itself)
      if (canSync && bankSync && bankId && user) {
        const be = toBankSyncEntry(targetPage, form);
        if (be) await addBankEntry(user.uid, bankId, be);
      }

      setCount(c => c + 1);
      addToast(
        `${pageOpt.label} entry added${canSync && bankSync ? ' + synced to bank' : ''}`,
        'success'
      );
      // Re-prefill (keeps date + source row values, clears editable fields)
      setForm(prefill(targetPage, sourceRow));
    } catch {
      addToast('Failed to save entry', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-in">

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
                  {sourceRow.date   && <span>📅 {sourceRow.date}</span>}
                  {sourceRow.amount && <span>💲 {sourceRow.amount}</span>}
                  {(sourceRow.name || sourceRow.title || sourceRow.expendOn) && (
                    <span>🏷 {sourceRow.name || sourceRow.title || sourceRow.expendOn}</span>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Select a page to add an entry to:</p>
            <div className="grid grid-cols-2 gap-2">
              {PAGE_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setTargetPage(opt.key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${ACCENT_CARD[opt.accent]} ${ACCENT_TEXT[opt.accent]}`}
                >
                  <span className="text-base leading-none">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        ) : (
          /* ── Step 2: Form ─────────────────────────────────── */
          <form onSubmit={handleAdd} className="p-4 space-y-3">

            {/* Date + Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Date</label>
                <input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Amount *</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount || ''} onChange={e => set('amount', e.target.value)} className={INPUT_CLS} autoFocus />
              </div>
            </div>

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

            {/* Name (lend / loan / forMe) */}
            {(targetPage === 'lend' || targetPage === 'loan' || targetPage === 'forMe') && (
              <div>
                <label className={LABEL_CLS}>{targetPage === 'forMe' ? 'Name' : 'Name *'}</label>
                <input type="text" placeholder="Person's name" value={form.name || ''} onChange={e => set('name', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

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

            {/* Notes (income) */}
            {targetPage === 'income' && (
              <div>
                <label className={LABEL_CLS}>Notes</label>
                <input type="text" placeholder="Notes" value={form.notes || ''} onChange={e => set('notes', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

            {/* Note (expenses) */}
            {targetPage === 'expenses' && (
              <div>
                <label className={LABEL_CLS}>Note</label>
                <input type="text" placeholder="Note" value={form.note || ''} onChange={e => set('note', e.target.value)} className={INPUT_CLS} />
              </div>
            )}

            {/* Description */}
            <div>
              <label className={LABEL_CLS}>Description</label>
              <input type="text" placeholder="Description" value={form.description || ''} onChange={e => set('description', e.target.value)} className={INPUT_CLS} />
            </div>

            {/* Bank Sync */}
            {canSync && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={bankSync} onChange={e => setBankSync(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
                  <Building2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Also add to bank
                    <span className="ml-1 text-xs text-gray-400">
                      ({pageOpt.bankDir === 'deposit' ? '↓ deposit' : '↑ withdraw'})
                    </span>
                  </span>
                </label>
                {bankSync && (
                  <select value={bankId} onChange={e => setBankId(e.target.value)} className={INPUT_CLS}>
                    <option value="">— Select bank —</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
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

import { useState, useEffect, useRef } from 'react';
import { Mail, Globe, Check, CalendarRange, Download, Trash2, AlertTriangle, FileJson, FileSpreadsheet, Camera, Pencil, X, TrendingUp, Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useActiveYear } from '../context/ActiveYearContext';
import { useToast } from '../components/ui/Toast';
import { getUserProfile, updateUserProfile } from '../services/profileService';
import { useCalendar } from '../context/CalendarContext';
import { useExpenses } from '../context/ExpenseContext';
import { useIncomes } from '../context/IncomeContext';
import { useLends } from '../context/LendContext';
import { useLoans } from '../context/LoanContext';
import { useSavings } from '../context/SavingContext';
import { useForMe } from '../context/ForMeContext';
import { useBanks } from '../context/BankContext';
import { getBankEntriesOnce } from '../services/bankService';
import { useCategories } from '../context/CategoryContext';
import { INCOME_SOURCES } from '../components/IncomeModal';
import { formatCurrency } from '../utils/formatters';
import { isInBSYear, getCurrentBSYear, safeADToBS } from '../utils/calendarUtils';

function toDateStr(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : d.toDate?.() ?? new Date(d);
  return dt.toISOString().slice(0, 10);
}

function formatExportDate(adDate, calendar) {
  if (!adDate) return '';
  if (calendar === 'bs') {
    const bs = safeADToBS(adDate);
    return bs || adDate;
  }
  return adDate;
}

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar',              symbol: '$'  },
  { code: 'EUR', label: 'Euro',                   symbol: '€'  },
  { code: 'GBP', label: 'British Pound',          symbol: '£'  },
  { code: 'INR', label: 'Indian Rupee',           symbol: '₹'  },
  { code: 'NPR', label: 'Nepalese Rupee',         symbol: 'Rs' },
  { code: 'THB', label: 'Thai Baht',              symbol: '฿'  },
  { code: 'IDR', label: 'Indonesian Rupiah',      symbol: 'Rp' },
  { code: 'BTN', label: 'Bhutanese Ngultrum',     symbol: 'Nu' },
  { code: 'LKR', label: 'Sri Lankan Rupee',       symbol: 'Rs' },
  { code: 'MVR', label: 'Maldivian Rufiyaa',      symbol: 'Rf' },
  { code: 'JPY', label: 'Japanese Yen',           symbol: '¥'  },
  { code: 'CNY', label: 'Chinese Yuan',           symbol: '¥'  },
  { code: 'CAD', label: 'Canadian Dollar',        symbol: 'C$' },
  { code: 'AUD', label: 'Australian Dollar',      symbol: 'A$' },
  { code: 'SGD', label: 'Singapore Dollar',       symbol: 'S$' },
  { code: 'AED', label: 'UAE Dirham',             symbol: 'د.إ'},
  { code: 'SAR', label: 'Saudi Riyal',            symbol: '﷼'  },
  { code: 'MYR', label: 'Malaysian Ringgit',      symbol: 'RM' },
  { code: 'PKR', label: 'Pakistani Rupee',        symbol: 'Rs' },
  { code: 'BDT', label: 'Bangladeshi Taka',       symbol: '৳'  },
  { code: 'MMK', label: 'Myanmar Kyat',           symbol: 'K'  },
  { code: 'KHR', label: 'Cambodian Riel',         symbol: '៛'  },
  { code: 'VND', label: 'Vietnamese Dong',        symbol: '₫'  },
  { code: 'PHP', label: 'Philippine Peso',        symbol: '₱'  },
  { code: 'BRL', label: 'Brazilian Real',         symbol: 'R$' },
  { code: 'MXN', label: 'Mexican Peso',           symbol: '$'  },
  { code: 'ZAR', label: 'South African Rand',     symbol: 'R'  },
  { code: 'NGN', label: 'Nigerian Naira',         symbol: '₦'  },
  { code: 'KES', label: 'Kenyan Shilling',        symbol: 'Ksh'},
  { code: 'CHF', label: 'Swiss Franc',            symbol: 'Fr' },
  { code: 'SEK', label: 'Swedish Krona',          symbol: 'kr' },
  { code: 'NOK', label: 'Norwegian Krone',        symbol: 'kr' },
  { code: 'DKK', label: 'Danish Krone',           symbol: 'kr' },
  { code: 'NZD', label: 'New Zealand Dollar',     symbol: 'NZ$'},
  { code: 'HKD', label: 'Hong Kong Dollar',       symbol: 'HK$'},
  { code: 'KRW', label: 'South Korean Won',       symbol: '₩'  },
  { code: 'TRY', label: 'Turkish Lira',           symbol: '₺'  },
  { code: 'RUB', label: 'Russian Ruble',          symbol: '₽'  },
  { code: 'QAR', label: 'Qatari Riyal',           symbol: 'QR' },
];

export default function Profile() {
  const { user, updateUserInfo, setProfilePhoto, avatarURL } = useAuth();
  const { currency: activeCurrency, updateCurrency } = useCurrency();
  const { activeYear, updateActiveYear, bsActiveYear, updateBSActiveYear } = useActiveYear();
  const { calendar, updateCalendar, yearLabel } = useCalendar();
  const { expenses, deleteExpense } = useExpenses();
  const { incomes, deleteIncome } = useIncomes();
  const { lends, deleteLend } = useLends();
  const { loans, deleteLoan } = useLoans();
  const { savings, sources, deleteSaving, deleteSource } = useSavings();
  const { entries: forMeEntries, deleteEntry } = useForMe();
  const { banks, selectedBankId, setSelectedBankId, selectedBank, entries: bankEntries, entriesLoading: bankEntriesLoading } = useBanks();
  const { getCategoryById } = useCategories();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const photoInputRef = useRef(null);
  const [form, setForm] = useState({ displayName: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  // Currency picker state
  const [currencySearch, setCurrencySearch] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(p => {
        if (p) {
          setProfile(p);
          setForm({ displayName: p.displayName || user.displayName || '' });
          // Check if saved currency is a known one
          const known = CURRENCIES.find(c => c.code === (p.currency || 'USD'));
          if (!known && p.currency) {
            setShowCustom(true);
            setCustomCode(p.currency);
          }
        }
      });
    }
  }, [user]);

  async function handleSave(e) {
    e?.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        updateUserProfile(user.uid, { displayName: form.displayName }),
        updateUserInfo({ displayName: form.displayName }),
      ]);
      addToast('Profile updated!', 'success');
    } catch {
      addToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveName() {
    const name = nameValue.trim();
    if (!name) return;
    setSaving(true);
    try {
      await Promise.all([
        updateUserProfile(user.uid, { displayName: name }),
        updateUserInfo({ displayName: name }),
      ]);
      setForm(f => ({ ...f, displayName: name }));
      setEditingName(false);
      addToast('Name updated!', 'success');
    } catch {
      addToast('Failed to update name', 'error');
    } finally {
      setSaving(false);
    }
  }

  function compressImage(file, size = 150, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        // crop to square from center
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const base64 = await compressImage(file);
      await updateUserProfile(user.uid, { photoURL: base64 });
      setProfilePhoto(base64);
      addToast('Profile picture updated!', 'success');
    } catch {
      addToast('Failed to update photo', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

  async function handleRemovePhoto() {
    try {
      await updateUserProfile(user.uid, { photoURL: null });
      setProfilePhoto(null);
      addToast('Profile picture removed', 'success');
    } catch {
      addToast('Failed to remove photo', 'error');
    }
  }

  async function handleSelectCurrency(code) {
    try {
      await updateCurrency(code);
      addToast(`Currency set to ${code}`, 'success');
    } catch {
      addToast('Failed to update currency', 'error');
    }
  }

  async function handleCustomCurrency(e) {
    e.preventDefault();
    const code = customCode.trim().toUpperCase();
    if (!code || code.length < 2) return;
    await handleSelectCurrency(code);
  }

  const filteredCurrencies = CURRENCIES.filter(c =>
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.label.toLowerCase().includes(currencySearch.toLowerCase())
  );

  async function handleExportYear(format) {
    setExporting(true);
    try {
      const yr = String(activeYear);

      // Fetch all bank entries for all banks (one-time reads)
      const bankData = await Promise.all(
        banks.map(async bank => {
          const all = await getBankEntriesOnce(user.uid, bank.id);
          return { bank, entries: all.filter(e => e.date?.startsWith(yr)) };
        })
      );

      const yearExpenses = expenses.filter(e => e.date?.startsWith(yr));
      const yearIncomes  = incomes.filter(i => i.date?.startsWith(yr));
      const yearLends    = lends.filter(l => l.date?.startsWith(yr));
      const yearLoans    = loans.filter(l => l.date?.startsWith(yr));
      const yearSavings  = savings.filter(s => s.date?.startsWith(yr));
      const yearSources  = sources.filter(s => s.date?.startsWith(yr));
      const yearForMe    = forMeEntries
        .filter(e => toDateStr(e.date).startsWith(yr))
        .map(e => ({ ...e, date: toDateStr(e.date) }));

      if (format === 'json') {
        const fmtDate = d => formatExportDate(d, calendar);
        const data = {
          year: activeYear,
          calendar: calendar === 'bs' ? 'BS (Bikram Sambat)' : 'AD (Gregorian)',
          exportedAt: new Date().toISOString(),
          expenses: yearExpenses.map(e => ({ ...e, date: fmtDate(e.date) })),
          incomes:  yearIncomes.map(i => ({ ...i, date: fmtDate(i.date) })),
          lends:    yearLends.map(l => ({ ...l, date: fmtDate(l.date) })),
          loans:    yearLoans.map(l => ({ ...l, date: fmtDate(l.date) })),
          savings:  yearSavings.map(s => ({ ...s, date: fmtDate(s.date) })),
          savingSources: yearSources.map(s => ({ ...s, date: fmtDate(s.date) })),
          forMe: yearForMe.map(e => ({ ...e, date: fmtDate(e.date) })),
          banks: bankData.map(({ bank, entries }) => ({
            bank: { id: bank.id, name: bank.name, openingBalance: bank.openingBalance },
            entries: entries.map(e => ({ ...e, date: fmtDate(e.date) })),
          })),
        };
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = `expense-tracker-${activeYear}.json`;
        a.click();
      } else {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        let sheetCount = 0;
        const fmtDate = d => formatExportDate(d, calendar);

        function addSheet(name, rows) {
          if (!rows.length) return;
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
          sheetCount++;
        }

        addSheet('Income', yearIncomes.map(i => ({
          'Date':        fmtDate(i.date),
          'Title':       i.title || '',
          'Amount':      +i.amount,
          'Source':      INCOME_SOURCES.find(s => s.value === i.source)?.label || i.source || '',
          'Notes':       i.notes || '',
          'Description': i.description || '',
        })));
        addSheet('Expenses', yearExpenses.map(e => ({
          'Date':        fmtDate(e.date),
          'Title':       e.title || '',
          'Amount':      +e.amount,
          'Category':    getCategoryById(e.category)?.name || e.category || '',
          'Notes':       e.notes || '',
          'Description': e.description || '',
        })));
        addSheet('Lends', yearLends.map(l => ({
          'Date':        fmtDate(l.date),
          'Name':        l.name || '',
          'Lent':        +l.amount,
          'Reason':      l.reason || '',
          'Returned':    +l.returnedAmount || 0,
          'Due':         (+l.amount || 0) - (+l.returnedAmount || 0),
          'Description': l.description || '',
        })));
        addSheet('Loans', yearLoans.map(l => ({
          'Date':        fmtDate(l.date),
          'Name':        l.name || '',
          'Borrowed':    +l.amount,
          'Reason':      l.reason || '',
          'Paid':        +l.paidAmount || 0,
          'Due':         (+l.amount || 0) - (+l.paidAmount || 0),
          'Description': l.description || '',
        })));
        addSheet('Savings', yearSavings.map(s => ({
          'Date':        fmtDate(s.date),
          'Amount':      +s.amount,
          'Expend On':   s.expendOn || '',
          'Description': s.description || '',
        })));
        addSheet('Saving Sources', yearSources.map(s => ({
          'Date':        fmtDate(s.date),
          'Amount':      +s.amount,
          'Description': s.description || '',
        })));
        addSheet('For Me', yearForMe.map(e => ({
          'Date':        fmtDate(e.date),
          'Name':        e.name || '',
          'Amount':      +e.amount,
          'Description': e.description || '',
        })));
        bankData.forEach(({ bank, entries }) => {
          let balance = bank.openingBalance || 0;
          addSheet(`Bank - ${bank.name}`, entries.map(e => {
            balance += (+e.deposit || 0) - (+e.withdraw || 0);
            return {
              'Date':            fmtDate(e.date),
              'Description':     e.description || '',
              'Deposit':         +e.deposit || 0,
              'Withdraw':        +e.withdraw || 0,
              'Closing Balance': balance,
            };
          }));
        });

        if (sheetCount === 0) {
          addToast(`No data found for ${activeYear}`, 'info');
          return;
        }

        XLSX.writeFile(wb, `expense-tracker-${activeYear}.xlsx`);
      }
    } catch (err) {
      console.error(err);
      addToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteYear() {
    setDeleting(true);
    const matchFn = calendar === 'bs'
      ? (d) => isInBSYear(d, bsActiveYear)
      : (d) => d?.startsWith(String(activeYear));
    try {
      await Promise.all([
        ...expenses.filter(e => matchFn(e.date)).map(e => deleteExpense(e.id)),
        ...incomes.filter(i => matchFn(i.date)).map(i => deleteIncome(i.id)),
        ...lends.filter(l => matchFn(l.date)).map(l => deleteLend(l.id)),
        ...loans.filter(l => matchFn(l.date)).map(l => deleteLoan(l.id)),
        ...savings.filter(s => matchFn(s.date)).map(s => deleteSaving(s.id)),
        ...sources.filter(s => matchFn(s.date)).map(s => deleteSource(s.id)),
        ...forMeEntries.filter(e => matchFn(toDateStr(e.date))).map(e => deleteEntry(e.id)),
      ]);
      addToast(`All ${yearLabel(effectiveYear)} data deleted successfully`, 'success');
      setDeleteConfirm(false);
    } catch {
      addToast('Some items failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  }

  // Year-scoped stats — honours BS calendar mode
  const effectiveYear = calendar === 'bs' ? bsActiveYear : activeYear;
  const yearExpenses = calendar === 'bs'
    ? expenses.filter(e => isInBSYear(e.date, bsActiveYear))
    : expenses.filter(e => e.date?.startsWith(String(activeYear)));
  const totalExpenses  = yearExpenses.length;
  const now            = new Date();
  // "This month" AD prefix for Gregorian; for BS we use adDateToBSMonthKey
  const displayMonth   = `${activeYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthTotal = yearExpenses
    .filter(e => e.date?.startsWith(displayMonth))
    .reduce((s, e) => s + +e.amount, 0);
  const yearTotal = yearExpenses.reduce((s, e) => s + +e.amount, 0);

  // Income stats
  const yearIncomeItems = calendar === 'bs'
    ? incomes.filter(i => isInBSYear(i.date, bsActiveYear))
    : incomes.filter(i => i.date?.startsWith(String(activeYear)));
  const thisMonthIncome = yearIncomeItems
    .filter(i => i.date?.startsWith(displayMonth))
    .reduce((s, i) => s + +i.amount, 0);
  const yearTotalIncome = yearIncomeItems.reduce((s, i) => s + +i.amount, 0);

  // Bank balance: last entry's closingBalance, or openingBalance if no entries
  const bankBalance = bankEntries.length > 0
    ? bankEntries[bankEntries.length - 1].closingBalance
    : (selectedBank?.openingBalance ?? null);

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account settings</p>
      </div>

      {/* Avatar + info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-5">
          <div
            className="relative group cursor-pointer"
            onClick={() => photoInputRef.current?.click()}
            title="Change profile picture"
          >
            {avatarURL ? (
              <img src={avatarURL} alt={user.displayName} referrerPolicy="no-referrer" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xl font-bold text-primary-700 dark:text-primary-400">
                {user?.displayName?.[0] || 'U'}
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingPhoto
                ? <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <Camera className="w-5 h-5 text-white" />
              }
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div>
            {editingName ? (
              <form
                onSubmit={e => { e.preventDefault(); handleSaveName(); }}
                className="flex items-center gap-2"
              >
                <input
                  autoFocus
                  type="text"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  className="text-sm font-semibold px-2 py-1 border border-primary-400 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-44"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="p-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
                  title="Save"
                >
                  {saving ? <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="p-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{user?.displayName}</h2>
                <button
                  type="button"
                  onClick={() => { setNameValue(form.displayName || user?.displayName || ''); setEditingName(true); }}
                  className="p-1 rounded-lg text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Edit display name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                Google Account
              </span>
              {avatarURL && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 underline underline-offset-2"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: `${effectiveYear} Expenses`, value: totalExpenses },
          { label: 'This Month', value: formatCurrency(thisMonthTotal, activeCurrency) },
          { label: `${effectiveYear} Total`, value: formatCurrency(yearTotal, activeCurrency) },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Income & Bank Balance */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Income &amp; Bank</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* This month income */}
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
            <p className="text-base font-bold text-green-700 dark:text-green-400">{formatCurrency(thisMonthIncome, activeCurrency)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This Month Income</p>
          </div>
          {/* Year total income */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-center">
            <p className="text-base font-bold text-blue-700 dark:text-blue-400">{formatCurrency(yearTotalIncome, activeCurrency)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{effectiveYear} Income</p>
          </div>
          {/* Bank balance */}
          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-center">
            {bankEntriesLoading ? (
              <div className="flex justify-center items-center h-8"><div className="w-4 h-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" /></div>
            ) : (
              <p className="text-base font-bold text-purple-700 dark:text-purple-400">
                {bankBalance !== null ? formatCurrency(bankBalance, activeCurrency) : '—'}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Bank Balance</p>
          </div>
        </div>
        {/* Bank selector */}
        {banks.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Landmark className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <select
              value={selectedBankId || ''}
              onChange={e => setSelectedBankId(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {banks.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
        {banks.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">No banks added yet</p>
        )}
      </div>

      {/* Currency Picker */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary-500" /> Currency
          </h2>
          <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-full font-semibold">
            Active: {activeCurrency}
          </span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          This currency will be used throughout the app for all financial figures.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search currency..."
          value={currencySearch}
          onChange={e => setCurrencySearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
        />

        {/* Currency grid */}
        <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-0.5">
          {filteredCurrencies.map(c => {
            const isActive = activeCurrency === c.code;
            return (
              <button
                key={c.code}
                onClick={() => handleSelectCurrency(c.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-all border
                  ${isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
              >
                <span className="w-8 text-center font-mono text-xs font-bold text-gray-400">{c.symbol}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{c.code}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.label}</div>
                </div>
                {isActive && <Check className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />}
              </button>
            );
          })}
          {filteredCurrencies.length === 0 && (
            <div className="col-span-2 text-center text-sm text-gray-400 py-4">No match — use custom below</div>
          )}
        </div>

        {/* Custom currency */}
        <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          <button
            type="button"
            onClick={() => setShowCustom(v => !v)}
            className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline mb-2"
          >
            {showCustom ? 'Hide custom code' : '+ Enter custom currency code'}
          </button>
          {showCustom && (
            <form onSubmit={handleCustomCurrency} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. BTC, XAF"
                value={customCode}
                maxLength={10}
                onChange={e => setCustomCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Set
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Calendar System */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarRange className="w-4 h-4 text-primary-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Calendar System</h2>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Choose how month names are displayed across Dashboard, Expenses and Income.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'gregorian', label: 'International', sub: 'Gregorian (Jan – Dec)' },
            { value: 'bs', label: 'Bikram Sambat', sub: 'Nepali (Baisakh – Chaitra)' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateCalendar(opt.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                calendar === opt.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="font-semibold text-sm text-gray-900 dark:text-white">{opt.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.sub}</div>
              {calendar === opt.value && <Check className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 mt-1.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Export & Delete Year Data */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
          <Download className="w-4 h-4 text-primary-500" /> Year Data Management
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Export or permanently delete all your data for <span className="font-semibold text-gray-700 dark:text-gray-300">{effectiveYear}</span>. Includes expenses, income, lends, loans, savings, for-me and all bank records.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <button
            onClick={() => handleExportYear('xlsx')}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-60 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> {exporting ? 'Exporting...' : `Export ${effectiveYear} as Excel`}
          </button>
          <button
            onClick={() => handleExportYear('json')}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 disabled:opacity-60 transition-colors"
          >
            <FileJson className="w-4 h-4" /> {exporting ? 'Exporting...' : `Export ${effectiveYear} as JSON`}
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete {effectiveYear} Data
          </button>
        </div>

        {deleteConfirm && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Delete all {effectiveYear} data?</p>
                <p className="text-xs text-red-600/80 dark:text-red-500 mt-1">
                  This will permanently delete all expenses, income, lends, loans, savings and for-me records from {effectiveYear}. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleDeleteYear}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> {deleting ? 'Deleting...' : `Yes, Delete All ${effectiveYear} Data`}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Year Picker */}
      {(() => {
        const isBS = calendar === 'bs';
        const currentAD = new Date().getFullYear();
        const currentBS = getCurrentBSYear();
        const startY  = isBS ? 2074 : 2020;
        const endY    = isBS ? currentBS + 1 : currentAD + 1;
        const nowY    = isBS ? currentBS : currentAD;
        const yearRange = [];
        for (let y = startY; y <= endY; y++) yearRange.push(y);
        return (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-primary-500" /> Active Year
              </h2>
              <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-full font-semibold">
                Active: {isBS ? bsActiveYear : yearLabel(activeYear)}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              All pages will default to showing data for this year. You can still change the year on any page.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {yearRange.map(y => {
                const isActive  = isBS ? (bsActiveYear === y) : (activeYear === y);
                const isCurrent = y === nowY;
                return (
                  <button
                    key={y}
                    onClick={() => isBS ? updateBSActiveYear(y) : updateActiveYear(y)}
                    className={`relative py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      isActive
                        ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                    }`}
                  >
                    {y}
                    {isCurrent && (
                      <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1 py-0.5 rounded-full ${
                        isActive ? 'bg-white text-primary-600' : 'bg-primary-600 text-white'
                      }`}>NOW</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

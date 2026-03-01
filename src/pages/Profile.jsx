import { useState, useEffect } from 'react';
import { User, Mail, Globe, Save, Check, CalendarRange } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useActiveYear } from '../context/ActiveYearContext';
import { useToast } from '../components/ui/Toast';
import { getUserProfile, updateUserProfile } from '../services/profileService';
import { useExpenses } from '../context/ExpenseContext';
import { formatCurrency } from '../utils/formatters';

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
  const { user } = useAuth();
  const { currency: activeCurrency, updateCurrency } = useCurrency();
  const { activeYear, updateActiveYear } = useActiveYear();
  const { expenses } = useExpenses();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ displayName: '' });
  const [saving, setSaving] = useState(false);

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
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName: form.displayName });
      addToast('Profile updated!', 'success');
    } catch {
      addToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
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

  const totalExpenses = expenses.reduce((s, e) => s + +e.amount, 0);
  const thisMonthExp = expenses.filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)));
  const thisMonthTotal = thisMonthExp.reduce((s, e) => s + +e.amount, 0);

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your account settings</p>
      </div>

      {/* Avatar + info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xl font-bold text-primary-700 dark:text-primary-400">
                {user?.displayName?.[0] || 'U'}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{user?.displayName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </p>
            <span className="inline-block mt-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
              Google Account
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Expenses', value: expenses.length },
          { label: 'This Month', value: formatCurrency(thisMonthTotal, activeCurrency) },
          { label: 'All Time', value: formatCurrency(totalExpenses, activeCurrency) },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Settings form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Settings</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-colors"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
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

      {/* Active Year Picker */}
      {(() => {
        const thisYear = new Date().getFullYear();
        const yearRange = [];
        for (let y = 2020; y <= thisYear + 1; y++) yearRange.push(y);
        return (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-primary-500" /> Active Year
              </h2>
              <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-full font-semibold">
                Active: {activeYear}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              All pages will default to showing data for this year. You can still change the year on any page.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {yearRange.map(y => {
                const isActive = activeYear === y;
                const isCurrent = y === thisYear;
                return (
                  <button
                    key={y}
                    onClick={() => updateActiveYear(y)}
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

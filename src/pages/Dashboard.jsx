import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import { DollarSign, TrendingUp, ShoppingBag, Calendar, ArrowRight, Plus } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { useCategories } from '../context/CategoryContext';
import { useAuth } from '../context/AuthContext';
import { useBanks } from '../context/BankContext';
import { useIncomes } from '../context/IncomeContext';
import { useActiveYear } from '../context/ActiveYearContext';
import StatsCard from '../components/ui/StatsCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import YearSelector from '../components/ui/YearSelector';
import { formatCurrency, groupByMonth, groupByCategory, monthsOfYear } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';

export default function Dashboard() {
  const { expenses, loading } = useExpenses();
  const { currency } = useCurrency();
  const { categories, getCategoryById } = useCategories();
  const { user } = useAuth();
  const { entries: bankEntries, selectedBank, banks, setSelectedBankId } = useBanks();
  const { incomes } = useIncomes();

  const now = new Date();
  const { activeYear } = useActiveYear();
  const [selectedYear, setSelectedYear] = useState(() => activeYear);
  useEffect(() => { setSelectedYear(activeYear); }, [activeYear]);

  // The same calendar month inside the selected year (e.g. March 2025 if today is March)
  const displayMonth = `${selectedYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [catPeriod, setCatPeriod] = useState('month');
  const [trendPeriod, setTrendPeriod] = useState('6m');
  const [incomeTrendPeriod, setIncomeTrendPeriod] = useState('6m');
  const [bankPeriod, setBankPeriod] = useState('6m');

  const stats = useMemo(() => {
    const monthExpenses    = expenses.filter(e => e.date.startsWith(displayMonth));
    const yearExpenses     = expenses.filter(e => e.date.startsWith(String(selectedYear)));

    // Previous month relative to displayMonth (for trend %)
    const prevM = new Date(selectedYear, now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const lastMonthExpenses = expenses.filter(e => e.date.startsWith(prevM));

    const monthTotal     = monthExpenses.reduce((s, e) => s + +e.amount, 0);
    const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + +e.amount, 0);
    const yearTotal      = yearExpenses.reduce((s, e) => s + +e.amount, 0);
    const trend = lastMonthTotal ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    const avgMonthly = yearTotal / Math.max(1, new Set(yearExpenses.map(e => e.date.slice(0, 7))).size);

    return { monthTotal, yearTotal, trend, avgMonthly, count: monthExpenses.length, yearCount: yearExpenses.length };
  }, [expenses, displayMonth, selectedYear]);

  // Category breakdown — this month (within selectedYear) or full year
  const categoryData = useMemo(() => {
    const filtered = catPeriod === 'month'
      ? expenses.filter(e => e.date.startsWith(displayMonth))
      : expenses.filter(e => e.date.startsWith(String(selectedYear)));
    return groupByCategory(filtered).map(g => {
      const cat = getCategoryById(g.category);
      return { ...g, name: cat?.name || g.category, color: cat?.color || '#6b7280' };
    }).sort((a, b) => b.total - a.total);
  }, [expenses, displayMonth, selectedYear, catPeriod, getCategoryById]);

  // Monthly bar chart (all 12 months of selectedYear)
  const monthlyData = useMemo(() => {
    const months = monthsOfYear(selectedYear);
    const map = {};
    expenses.filter(e => e.date?.startsWith(String(selectedYear))).forEach(e => {
      const m = e.date.slice(0, 7);
      map[m] = (map[m] || 0) + (+e.amount || 0);
    });
    return months.map(m => ({
      month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' }),
      amount: map[m] || 0,
    }));
  }, [expenses, selectedYear]);

  // Line chart data — 12m = all 12 months of selectedYear, 6m = last 6 months of selectedYear
  const trendData = useMemo(() => {
    const months = trendPeriod === '12m' ? monthsOfYear(selectedYear) : monthsOfYear(selectedYear).slice(-6);
    const map = {};
    expenses.forEach(e => {
      const m = e.date?.slice(0, 7);
      if (m) map[m] = (map[m] || 0) + (+e.amount || 0);
    });
    return months.map(m => ({
      month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' }),
      amount: map[m] || 0,
    }));
  }, [expenses, trendPeriod, selectedYear]);

  // Income trend — 12m = all 12 months of selectedYear, 6m = last 6 months of selectedYear
  const incomeTrendData = useMemo(() => {
    const months = incomeTrendPeriod === '12m' ? monthsOfYear(selectedYear) : monthsOfYear(selectedYear).slice(-6);
    const map = {};
    incomes.forEach(i => {
      const m = i.date?.slice(0, 7);
      if (m) map[m] = (map[m] || 0) + (+i.amount || 0);
    });
    return months.map(m => ({
      month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' }),
      amount: map[m] || 0,
    }));
  }, [incomes, incomeTrendPeriod, selectedYear]);

  // Bank deposit / withdraw trend — 12m = all 12 months of selectedYear, 6m = last 6 months of selectedYear
  const bankTrendData = useMemo(() => {
    const months = bankPeriod === '12m' ? monthsOfYear(selectedYear) : monthsOfYear(selectedYear).slice(-6);
    const map = {};
    bankEntries.forEach(e => {
      const m = e.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { deposit: 0, withdraw: 0 };
      map[m].deposit  += +e.deposit  || 0;
      map[m].withdraw += +e.withdraw || 0;
    });
    return months.map(m => ({
      month: new Date(m + '-02').toLocaleDateString('en-US', { month: 'short' }),
      deposit:  map[m]?.deposit  || 0,
      withdraw: map[m]?.withdraw || 0,
    }));
  }, [bankEntries, bankPeriod, selectedYear]);

  const recentExpenses = useMemo(
    () => expenses.filter(e => e.date.startsWith(String(selectedYear))).slice(0, 5),
    [expenses, selectedYear]
  );

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Good {now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}, {user?.displayName?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Here's your financial overview</p>
        </div>
        <YearSelector year={selectedYear} onChange={setSelectedYear} />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="This Month"
          value={formatCurrency(stats.monthTotal, currency)}
          icon={DollarSign}
          color="blue"
          trend={stats.trend}
          subtitle={`${now.toLocaleDateString('en-US', { month: 'long' })} ${selectedYear}`}
        />
        <StatsCard
          title="This Year"
          value={formatCurrency(stats.yearTotal, currency)}
          icon={Calendar}
          color="purple"
          subtitle={`${selectedYear}`}
        />
        <StatsCard
          title="Monthly Average"
          value={formatCurrency(stats.avgMonthly, currency)}
          icon={TrendingUp}
          color="green"
          subtitle="This year"
        />
        <StatsCard
          title="Total Expenses"
          value={stats.yearCount}
          icon={ShoppingBag}
          color="orange"
          subtitle={`In ${selectedYear}`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Monthly Expenses {selectedYear}</h2>
          {expenses.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="dark:fill-gray-400" />
                <YAxis tick={{ fontSize: 11 }} className="dark:fill-gray-400" />
                <Tooltip
                  formatter={(v) => [formatCurrency(v, currency), 'Amount']}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Category Breakdown ({catPeriod === 'month'
                ? `${now.toLocaleDateString('en-US', { month: 'long' })} ${selectedYear}`
                : String(selectedYear)})
            </h2>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-xs font-medium">
              <button
                onClick={() => setCatPeriod('month')}
                className={`px-3 py-1.5 transition-colors ${
                  catPeriod === 'month'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >Monthly</button>
              <button
                onClick={() => setCatPeriod('year')}
                className={`px-3 py-1.5 transition-colors ${
                  catPeriod === 'year'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >Yearly</button>
            </div>
          </div>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No expenses {catPeriod === 'month' ? 'this month' : `in ${selectedYear}`}</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="total"
                    paddingAngle={2}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v, currency)} contentStyle={{ borderRadius: 12, border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.slice(0, 5).map(c => (
                  <div key={c.category} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{c.name}</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatCurrency(c.total, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Income Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Income Trend {selectedYear} ({incomeTrendPeriod === '12m' ? 'Full Year' : 'Last 6 Months'})
          </h2>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-xs font-medium">
            <button
              onClick={() => setIncomeTrendPeriod('6m')}
              className={`px-3 py-1.5 transition-colors ${
                incomeTrendPeriod === '6m'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >6 Months</button>
            <button
              onClick={() => setIncomeTrendPeriod('12m')}
              className={`px-3 py-1.5 transition-colors ${
                incomeTrendPeriod === '12m'
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >1 Year</button>
          </div>
        </div>
        {incomes.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">No income data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={incomeTrendData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [formatCurrency(v, currency), 'Income']} contentStyle={{ borderRadius: 12, border: 'none' }} />
              <Area type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Trend line */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Spending Trend {selectedYear} ({trendPeriod === '12m' ? 'Full Year' : 'Last 6 Months'})
          </h2>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-xs font-medium">
            <button
              onClick={() => setTrendPeriod('6m')}
              className={`px-3 py-1.5 transition-colors ${
                trendPeriod === '6m'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >6 Months</button>
            <button
              onClick={() => setTrendPeriod('12m')}
              className={`px-3 py-1.5 transition-colors ${
                trendPeriod === '12m'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >1 Year</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [formatCurrency(v, currency), 'Amount']} contentStyle={{ borderRadius: 12, border: 'none' }} />
            <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#areaGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bank Deposit / Withdraw Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start sm:items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Bank Trend</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Deposits vs Withdrawals</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {banks.length > 1 && (
              <select
                value={selectedBank?.id || ''}
                onChange={e => setSelectedBankId(e.target.value)}
                className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            {banks.length === 1 && selectedBank && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{selectedBank.name}</span>
            )}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-xs font-medium">
              <button
                onClick={() => setBankPeriod('6m')}
                className={`px-3 py-1.5 transition-colors ${
                  bankPeriod === '6m'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >6 Months</button>
              <button
                onClick={() => setBankPeriod('12m')}
                className={`px-3 py-1.5 transition-colors ${
                  bankPeriod === '12m'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >1 Year</button>
            </div>
          </div>
        </div>
        {bankEntries.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No bank transactions yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={bankTrendData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="depositGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="withdrawGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              />
              <Tooltip
                formatter={(v, name) => [formatCurrency(v, currency), name === 'deposit' ? 'Deposit' : 'Withdraw']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Legend
                formatter={v => v === 'deposit' ? 'Deposit' : 'Withdraw'}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Area type="monotone" dataKey="deposit"  stroke="#22c55e" strokeWidth={2} fill="url(#depositGradient)" />
              <Area type="monotone" dataKey="withdraw" stroke="#ef4444" strokeWidth={2} fill="url(#withdrawGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
          <Link to="/expenses" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-gray-400 text-sm mb-3">No expenses yet</p>
            <Link to="/expenses" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors">
              <Plus className="w-4 h-4" /> Add your first expense
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentExpenses.map(e => {
              const cat = getCategoryById(e.category);
              return (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: cat?.color + '20' }}
                  >
                    {cat?.icon || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{e.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{cat?.name} • {e.date}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                    {formatCurrency(e.amount, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
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
import StatsCard from '../components/ui/StatsCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency, groupByMonth, groupByCategory, currentMonth, currentYear, last12Months } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';

export default function Dashboard() {
  const { expenses, loading } = useExpenses();
  const { currency } = useCurrency();
  const { categories, getCategoryById } = useCategories();
  const { user } = useAuth();

  const now = new Date();
  const thisMonth = currentMonth();
  const thisYear = currentYear();

  const stats = useMemo(() => {
    const monthExpenses = expenses.filter(e => e.date.startsWith(thisMonth));
    const yearExpenses = expenses.filter(e => e.date.startsWith(String(thisYear)));

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const lastMonthExpenses = expenses.filter(e => e.date.startsWith(lastMonth));

    const monthTotal = monthExpenses.reduce((s, e) => s + +e.amount, 0);
    const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + +e.amount, 0);
    const yearTotal = yearExpenses.reduce((s, e) => s + +e.amount, 0);
    const trend = lastMonthTotal ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    const avgMonthly = expenses.length
      ? yearTotal / Math.max(1, new Set(expenses.filter(e => e.date.startsWith(String(thisYear))).map(e => e.date.slice(0, 7))).size)
      : 0;

    return { monthTotal, yearTotal, trend, avgMonthly, count: monthExpenses.length };
  }, [expenses, thisMonth, thisYear]);

  // Category breakdown for this month
  const categoryData = useMemo(() => {
    const monthExp = expenses.filter(e => e.date.startsWith(thisMonth));
    return groupByCategory(monthExp).map(g => {
      const cat = getCategoryById(g.category);
      return { ...g, name: cat?.name || g.category, color: cat?.color || '#6b7280' };
    }).sort((a, b) => b.total - a.total);
  }, [expenses, thisMonth, getCategoryById]);

  // Monthly bar chart (last 12 months)
  const monthlyData = useMemo(() => {
    const months = last12Months();
    const grouped = groupByMonth(expenses);
    const groupMap = {};
    grouped.forEach(g => { groupMap[g.month] = g.total; });
    return months.map(m => ({
      month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      amount: groupMap[m] || 0,
    }));
  }, [expenses]);

  // Line chart data (last 6 months)
  const trendData = monthlyData.slice(-6);

  const recentExpenses = expenses.slice(0, 5);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good {now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}, {user?.displayName?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Here's your financial overview</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="This Month"
          value={formatCurrency(stats.monthTotal, currency)}
          icon={DollarSign}
          color="blue"
          trend={stats.trend}
          subtitle={`${stats.count} transactions`}
        />
        <StatsCard
          title="This Year"
          value={formatCurrency(stats.yearTotal, currency)}
          icon={Calendar}
          color="purple"
          subtitle={`${thisYear}`}
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
          value={expenses.length}
          icon={ShoppingBag}
          color="orange"
          subtitle="All time"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Monthly Expenses</h2>
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
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown (This Month)</h2>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No expenses this month</div>
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

      {/* Trend line */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Spending Trend (Last 6 Months)</h2>
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

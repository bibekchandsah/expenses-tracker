import { useState, useMemo, useEffect } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown, BarChart3, TrendingUp, TrendingDown, Users, Calendar, Tag, MessageCircle } from 'lucide-react';
import { useLends } from '../context/LendContext';
import { useLoans } from '../context/LoanContext';
import { useExpenses } from '../context/ExpenseContext';
import { useCategories } from '../context/CategoryContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';
import { useCalendar } from '../context/CalendarContext';
import { useActiveYear } from '../context/ActiveYearContext';
import YearSelector from '../components/ui/YearSelector';
import { getBSYearRange, adDateToBSMonthKey, getBSMonthLabel, safeADToBS, BS_MONTHS_SHORT } from '../utils/calendarUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
}

export default function NetSummary() {
  const { lends, loading: lendLoading }  = useLends();
  const { currency } = useCurrency();
  const { monthLabel, calendar } = useCalendar();
  const { loans, loading: loanLoading }  = useLoans();
  const { expenses } = useExpenses();
  const { getCategoryById } = useCategories();

  const [sortCol, setSortCol] = useState('net');
  const [sortDir, setSortDir] = useState('desc');
  const [search,  setSearch]  = useState('');
  const { activeYear, bsActiveYear } = useActiveYear();
  const isBS = calendar === 'bs';
  const [yearFilter, setYearFilter] = useState(() => isBS ? bsActiveYear : activeYear);
  const [dailyMonth, setDailyMonth] = useState(null);

  useEffect(() => { setYearFilter(isBS ? bsActiveYear : activeYear); }, [activeYear, bsActiveYear, calendar]); // eslint-disable-line
  // Reset daily month when year or calendar changes
  useEffect(() => { setDailyMonth(null); }, [yearFilter, calendar]); // eslint-disable-line

  const bsYearRange = useMemo(() => isBS ? getBSYearRange(yearFilter) : null, [isBS, yearFilter]);

  const loading = lendLoading || loanLoading;

  function handleSort(col) {
    if (sortCol === col) {
      if (sortDir === 'desc') {
        setSortDir('asc');
      } else {
        setSortCol(null);
        setSortDir('desc');
      }
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

  // Build combined per-person map
  const rows = useMemo(() => {
    const map = {};

    const filterByYear = arr => isBS
      ? arr.filter(l => l.date && bsYearRange && l.date >= bsYearRange.start && l.date <= bsYearRange.end)
      : arr.filter(l => l.date?.startsWith(String(yearFilter)));

    filterByYear(lends).forEach(l => {
      const k = l.name;
      if (!map[k]) map[k] = { name: k, lent: 0, returned: 0, borrowed: 0, paid: 0 };
      map[k].lent     += +l.amount         || 0;
      map[k].returned += +l.returnedAmount || 0;
    });

    filterByYear(loans).forEach(l => {
      const k = l.name;
      if (!map[k]) map[k] = { name: k, lent: 0, returned: 0, borrowed: 0, paid: 0 };
      map[k].borrowed += +l.amount     || 0;
      map[k].paid     += +l.paidAmount || 0;
    });

    return Object.values(map).map(p => ({
      ...p,
      toReceive: p.lent     - p.returned,
      toGive:    p.borrowed - p.paid,
      net:       (p.lent - p.returned) - (p.borrowed - p.paid),
    }));
  }, [lends, loans, yearFilter, isBS, bsYearRange]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const data = q ? rows.filter(r => r.name.toLowerCase().includes(q)) : rows;
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [rows, search, sortCol, sortDir]);

  const totals = useMemo(() => ({
    lent:        rows.reduce((s, r) => s + r.lent, 0),
    borrowed:    rows.reduce((s, r) => s + r.borrowed, 0),
    toReceive:   rows.reduce((s, r) => s + r.toReceive, 0),
    toGive:      rows.reduce((s, r) => s + r.toGive, 0),
    net:         rows.reduce((s, r) => s + r.net, 0),
    netPositive: rows.reduce((s, r) => s + (r.net > 0 ? r.net : 0), 0),
    netNegative: rows.reduce((s, r) => s + (r.net < 0 ? Math.abs(r.net) : 0), 0),
    people:      rows.length,
  }), [rows]);

  // Monthly expense breakdown for selected year
  const monthlyData = useMemo(() => {
    const filtered = isBS
      ? expenses.filter(e => e.date && bsYearRange && e.date >= bsYearRange.start && e.date <= bsYearRange.end)
      : expenses.filter(e => e.date?.startsWith(String(yearFilter)));
    const map = {};
    filtered.forEach(e => {
      const m = isBS ? adDateToBSMonthKey(e.date) : e.date?.slice(0, 7);
      if (!m) return;
      map[m] = (map[m] || 0) + (+e.amount || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month,
        label: isBS ? getBSMonthLabel(month, 'short') : monthLabel(month, 'short'),
        total,
      }));
  }, [expenses, yearFilter, monthLabel, isBS, bsYearRange]);

  // Daily expense breakdown for selected month
  const activeDailyMonth = dailyMonth || (monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].month : null);
  const dailyData = useMemo(() => {
    if (!activeDailyMonth) return [];
    const filtered = isBS
      ? expenses.filter(e => adDateToBSMonthKey(e.date) === activeDailyMonth)
      : expenses.filter(e => e.date?.startsWith(activeDailyMonth));
    const map = {};
    filtered.forEach(e => {
      if (!e.date) return;
      map[e.date] = (map[e.date] || 0) + (+e.amount || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => {
        let dayLabel, fullLabel;
        if (isBS) {
          const bs = safeADToBS(date);
          const parts = bs.split('-').map(Number);
          dayLabel = parts[2] ? String(parts[2]) : date.slice(8);
          fullLabel = parts[1] ? `${BS_MONTHS_SHORT[parts[1] - 1]} ${parts[2]}` : date;
        } else {
          dayLabel = String(+date.slice(8));
          const d = new Date(date + 'T00:00:00');
          fullLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        return { date, dayLabel, fullLabel, total };
      });
  }, [expenses, activeDailyMonth, isBS]); // eslint-disable-line

  // Per-category expense breakdown
  const categoryData = useMemo(() => {
    const map = {};
    const catFiltered = isBS
      ? expenses.filter(e => e.date && bsYearRange && e.date >= bsYearRange.start && e.date <= bsYearRange.end)
      : expenses.filter(e => e.date?.startsWith(String(yearFilter)));
    catFiltered.forEach(e => {
      const id = e.category;
      if (!id) return;
      map[id] = (map[id] || 0) + (+e.amount || 0);
    });
    return Object.entries(map)
      .map(([id, total]) => {
        const cat = getCategoryById(id);
        return { id, total, name: cat?.name || id, icon: cat?.icon || '📦', color: cat?.color || '#6366f1' };
      })
      .sort((a, b) => b.total - a.total);
  }, [expenses, getCategoryById, yearFilter, isBS, bsYearRange]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  const SortBtn = ({ col, label, align = 'left' }) => (
    <button
      onClick={() => handleSort(col)}
      className={`flex items-center gap-1 w-full ${align === 'right' ? 'justify-end' : ''} hover:text-gray-900 dark:hover:text-white transition-colors ${sortCol === col && sortCol !== null ? 'text-primary-600 dark:text-primary-400' : ''}`}
    >
      {align === 'right' && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
      <span className="whitespace-nowrap">{label}</span>
      {align !== 'right' && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
    </button>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" /> Net Summary
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Combined view of all lend &amp; loan transactions per person</p>
        </div>
        <YearSelector year={yearFilter} calendar={calendar} onChange={yr => setYearFilter(yr)} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1"><Users className="w-3.5 h-3.5" /> People</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{totals.people}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Total Lent</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">{formatCurrency(totals.lent, currency)}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-200 dark:border-orange-800 p-4">
          <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">Total Borrowed</p>
          <p className="text-lg font-bold text-orange-700 dark:text-orange-400 mt-1">{formatCurrency(totals.borrowed, currency)}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-4">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> To Receive</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{formatCurrency(totals.netPositive, currency)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800 p-4">
          <p className="text-xs text-red-700 dark:text-red-400 font-medium flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> To Give</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">{formatCurrency(totals.netNegative, currency)}</p>
        </div>
      </div>

      {/* Net balance callout */}
      <div className={`rounded-2xl border px-5 py-4 flex items-center gap-3 ${totals.net >= 0 ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
        {totals.net >= 0
          ? <TrendingUp  className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          : <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />}
        <div>
          <p className={`text-sm font-semibold ${totals.net >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {totals.net >= 0 ? 'You are net owed' : 'You net owe'}&nbsp;
            <span className="text-base font-bold">{formatCurrency(Math.abs(totals.net), currency)}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Remaining to receive {formatCurrency(totals.toReceive, currency)} − Remaining to give {formatCurrency(totals.toGive, currency)}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center px-4">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No records yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">Add entries on the Lend or Loan pages to see combined summary here.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Search */}
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            />
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-sm text-gray-500 dark:text-gray-400">
              No results for &ldquo;{search}&rdquo;
            </div>
          ) : (
            <>
            {/* ── Mobile cards (xs / small screens) ── */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700/50">
              {filtered.map(row => {
                const netPositive = row.net >= 0;
                const todayStr = new Date().toISOString().slice(0, 10);
                const displayDate = (() => {
                  if (calendar === 'bs') {
                    const bs = safeADToBS(todayStr);
                    if (bs) { const [y, m, d] = bs.split('-'); return `${d}/${m}/${y}`; }
                  }
                  const [y, m, d] = todayStr.split('-');
                  return `${d}/${m}/${y}`;
                })();
                const absNet = Math.abs(row.net);
                const waMessage = `Date: ${displayDate}\nHi ${row.name}, Just a gentle reminder about the money ${currency} ${absNet.toFixed(2)}. Need that money back. Can you take care of it soon?`;
                const waUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;
                return (
                  <div key={row.name} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Name */}
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{row.name}</p>

                    {/* Row 1: Borrowed | To Give */}
                    <div className="grid grid-cols-2 gap-x-2 mb-1">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Borrowed: </span>
                        <span className={`text-xs font-semibold tabular-nums ${row.borrowed > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {row.borrowed > 0 ? formatCurrency(row.borrowed, currency) : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">To Give: </span>
                        <span className={`text-xs font-semibold tabular-nums ${row.toGive > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {row.toGive > 0 ? formatCurrency(row.toGive, currency) : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Lent | To Receive */}
                    <div className="grid grid-cols-2 gap-x-2 mb-2">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Lent: </span>
                        <span className={`text-xs font-semibold tabular-nums ${row.lent > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {row.lent > 0 ? formatCurrency(row.lent, currency) : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">To Receive: </span>
                        <span className={`text-xs font-semibold tabular-nums ${row.toReceive > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {row.toReceive > 0 ? formatCurrency(row.toReceive, currency) : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Row 3: Net | WhatsApp */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Net: </span>
                        <span className={`text-xs font-black tabular-nums ${netPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {netPositive ? '+' : ''}{formatCurrency(row.net, currency)}
                        </span>
                      </div>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Send WhatsApp reminder to ${row.name}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors whitespace-nowrap"
                      >
                        <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
              {/* Mobile footer totals */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-700">
                <p className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase mb-2">
                  {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
                </p>
                <div className="grid grid-cols-2 gap-x-2 mb-1">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Borrowed: </span>
                    <span className="text-xs font-bold tabular-nums text-orange-600 dark:text-orange-400">
                      {formatCurrency(filtered.reduce((s, r) => s + r.borrowed, 0), currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">To Give: </span>
                    <span className="text-xs font-bold tabular-nums text-red-600 dark:text-red-400">
                      {formatCurrency(filtered.reduce((s, r) => s + r.toGive, 0), currency)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-2 mb-1">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Lent: </span>
                    <span className="text-xs font-bold tabular-nums text-blue-600 dark:text-blue-400">
                      {formatCurrency(filtered.reduce((s, r) => s + r.lent, 0), currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">To Receive: </span>
                    <span className="text-xs font-bold tabular-nums text-green-600 dark:text-green-400">
                      {formatCurrency(filtered.reduce((s, r) => s + r.toReceive, 0), currency)}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Net: </span>
                  <span className={`text-xs font-black tabular-nums ${filtered.reduce((s, r) => s + r.net, 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(filtered.reduce((s, r) => s + r.net, 0), currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Desktop table (sm and above) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <th className="px-5 py-2.5 text-left"><SortBtn col="name" label="Name" /></th>
                    <th className="px-5 py-2.5 text-right"><SortBtn col="borrowed"  label="Borrowed"   align="right" /></th>
                    <th className="px-5 py-2.5 text-right"><SortBtn col="toGive"    label="To Give"    align="right" /></th>
                    <th className="px-5 py-2.5 text-right"><SortBtn col="lent"      label="Lent"       align="right" /></th>
                    <th className="px-5 py-2.5 text-right"><SortBtn col="toReceive" label="To Receive" align="right" /></th>
                    <th className="px-5 py-2.5 text-right"><SortBtn col="net"       label="Net"        align="right" /></th>
                    <th className="px-5 py-2.5 text-center whitespace-nowrap">Send Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map(row => {
                    const netPositive = row.net >= 0;
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const displayDate = (() => {
                      if (calendar === 'bs') {
                        const bs = safeADToBS(todayStr);
                        if (bs) { const [y, m, d] = bs.split('-'); return `${d}/${m}/${y}`; }
                      }
                      const [y, m, d] = todayStr.split('-');
                      return `${d}/${m}/${y}`;
                    })();
                    const absNet = Math.abs(row.net);
                    const waMessage = `Date: ${displayDate}\nHi ${row.name}, Just a gentle reminder about the money ${currency} ${absNet.toFixed(2)}. Need that money back. Can you take care of it soon?`;
                    const waUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;
                    return (
                      <tr key={row.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{row.name}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          <span className={`font-semibold ${row.borrowed > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            {row.borrowed > 0 ? formatCurrency(row.borrowed, currency) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          <span className={`font-semibold ${row.toGive > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            {row.toGive > 0 ? formatCurrency(row.toGive, currency) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          <span className={`font-semibold ${row.lent > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            {row.lent > 0 ? formatCurrency(row.lent, currency) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          <span className={`font-semibold ${row.toReceive > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            {row.toReceive > 0 ? formatCurrency(row.toReceive, currency) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          <span className={`font-black ${netPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {netPositive ? '+' : ''}{formatCurrency(row.net, currency)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Send WhatsApp reminder to ${row.name}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors whitespace-nowrap"
                          >
                            <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            WhatsApp
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-700">
                  <tr className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase">
                    <td className="px-5 py-3">{filtered.length} {filtered.length === 1 ? 'person' : 'people'}</td>
                    <td className="px-5 py-3 text-right text-orange-600 dark:text-orange-400 tabular-nums">
                      {formatCurrency(filtered.reduce((s, r) => s + r.borrowed, 0), currency)}
                    </td>
                    <td className="px-5 py-3 text-right text-red-600 dark:text-red-400 tabular-nums">
                      {formatCurrency(filtered.reduce((s, r) => s + r.toGive, 0), currency)}
                    </td>
                    <td className="px-5 py-3 text-right text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatCurrency(filtered.reduce((s, r) => s + r.lent, 0), currency)}
                    </td>
                    <td className="px-5 py-3 text-right text-green-600 dark:text-green-400 tabular-nums">
                      {formatCurrency(filtered.reduce((s, r) => s + r.toReceive, 0), currency)}
                    </td>
                    <td className={`px-5 py-3 text-right tabular-nums ${filtered.reduce((s, r) => s + r.net, 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(filtered.reduce((s, r) => s + r.net, 0), currency)}
                    </td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {/* Category Expense Breakdown */}
      {categoryData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Expenses by Category</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{categoryData.length} categories</span>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Table — left */}
            <div className="lg:w-64 xl:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 overflow-y-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700/60">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {categoryData.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ background: c.color + '28' }}
                          >{c.icon}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{c.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(c.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/60 border-t-2 border-gray-200 dark:border-gray-700">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total</td>
                    <td className="px-4 py-2.5 text-right text-xs font-black text-primary-600 dark:text-primary-400 tabular-nums">
                      {formatCurrency(categoryData.reduce((s, c) => s + c.total, 0), currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bar chart — right */}
            <div className="flex-1 p-4 min-h-64">
              <ResponsiveContainer width="100%" height={Math.max(240, categoryData.length * 36)}>
                <BarChart
                  layout="vertical"
                  data={categoryData}
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                      return v;
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    formatter={v => [formatCurrency(v, currency), 'Spent']}
                    contentStyle={{
                      borderRadius: 12,
                      border: 'none',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                      fontSize: 13,
                    }}
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {categoryData.map(c => (
                      <Cell key={c.id} fill={c.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Expense Breakdown */}
      {monthlyData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly Expenses</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">Last {monthlyData.length} months</span>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Table — left */}
            <div className="lg:w-64 xl:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 overflow-y-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700/60">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Month</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {[...monthlyData].reverse().map((m, i) => (
                    <tr key={m.month} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${i === 0 ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">{m.label}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(m.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/60 border-t-2 border-gray-200 dark:border-gray-700">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total</td>
                    <td className="px-4 py-2.5 text-right text-xs font-black text-primary-600 dark:text-primary-400 tabular-nums">
                      {formatCurrency(monthlyData.reduce((s, m) => s + m.total, 0), currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bar chart — right */}
            <div className="flex-1 p-4 min-h-64">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                      return v;
                    }}
                    width={45}
                  />
                  <Tooltip
                    formatter={v => [formatCurrency(v, currency), 'Expense']}
                    contentStyle={{
                      borderRadius: 12,
                      border: 'none',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                      fontSize: 13,
                    }}
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {monthlyData.map((entry, index) => {
                      const isLatest = index === monthlyData.length - 1;
                      return (
                        <Cell
                          key={entry.month}
                          fill={isLatest ? '#6366f1' : '#a5b4fc'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-1">
                Darker bar = current month
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Daily Expense Breakdown */}
      {monthlyData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Daily Expenses</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{dailyData.length} days</span>
            <div className="ml-auto">
              <select
                value={activeDailyMonth || ''}
                onChange={e => setDailyMonth(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {[...monthlyData].reverse().map(m => (
                  <option key={m.month} value={m.month}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {dailyData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400 dark:text-gray-500">
              No expenses for this month
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row">
              {/* Table — left */}
              <div className="lg:w-64 xl:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 overflow-y-auto max-h-72">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700/60">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Day</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {[...dailyData].reverse().map(d => (
                      <tr key={d.date} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">{d.fullLabel}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(d.total, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/60 border-t-2 border-gray-200 dark:border-gray-700">
                    <tr>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total</td>
                      <td className="px-4 py-2.5 text-right text-xs font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {formatCurrency(dailyData.reduce((s, d) => s + d.total, 0), currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bar chart — right */}
              <div className="flex-1 p-4 min-h-64">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="dayLabel"
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      interval={dailyData.length > 20 ? 1 : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => {
                        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                        if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                        return v;
                      }}
                      width={45}
                    />
                    <Tooltip
                      formatter={v => [formatCurrency(v, currency), 'Expense']}
                      labelFormatter={label => {
                        const entry = dailyData.find(d => d.dayLabel === label);
                        return entry ? entry.fullLabel : label;
                      }}
                      contentStyle={{
                        borderRadius: 12,
                        border: 'none',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                        fontSize: 13,
                      }}
                      cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {dailyData.map((entry, index) => {
                        const isToday = entry.date === new Date().toISOString().slice(0, 10);
                        const isMax = entry.total === Math.max(...dailyData.map(d => d.total));
                        return (
                          <Cell
                            key={entry.date}
                            fill={isToday ? '#6366f1' : isMax ? '#818cf8' : '#c7d2fe'}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-1">
                  Darkest = today · Medium = highest spending day
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

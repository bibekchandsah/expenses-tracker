import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown, BarChart3, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useLends } from '../context/LendContext';
import { useLoans } from '../context/LoanContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
}

export default function NetSummary() {
  const { lends, loading: lendLoading }  = useLends();
  const { loans, loading: loanLoading }  = useLoans();

  const [sortCol, setSortCol] = useState('net');
  const [sortDir, setSortDir] = useState('desc');
  const [search,  setSearch]  = useState('');

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

    lends.forEach(l => {
      const k = l.name;
      if (!map[k]) map[k] = { name: k, lent: 0, returned: 0, borrowed: 0, paid: 0 };
      map[k].lent     += +l.amount         || 0;
      map[k].returned += +l.returnedAmount || 0;
    });

    loans.forEach(l => {
      const k = l.name;
      if (!map[k]) map[k] = { name: k, lent: 0, returned: 0, borrowed: 0, paid: 0 };
      map[k].borrowed += +l.amount     || 0;
      map[k].paid     += +l.paidAmount || 0;
    });

    return Object.values(map).map(p => ({
      ...p,
      toReceive: p.lent     - p.returned,   // what this person still owes you
      toGive:    p.borrowed - p.paid,        // what you still owe this person
      net:       (p.lent - p.returned) - (p.borrowed - p.paid), // positive = you net receive, negative = you net owe
    }));
  }, [lends, loans]);

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
    netPositive: rows.reduce((s, r) => s + (r.net > 0 ? r.net : 0), 0),  // sum of positive nets
    netNegative: rows.reduce((s, r) => s + (r.net < 0 ? Math.abs(r.net) : 0), 0), // sum of negative nets
    people:      rows.length,
  }), [rows]);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-600" /> Net Summary
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Combined view of all lend &amp; loan transactions per person</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1"><Users className="w-3.5 h-3.5" /> People</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{totals.people}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Total Lent</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">{formatCurrency(totals.lent)}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-200 dark:border-orange-800 p-4">
          <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">Total Borrowed</p>
          <p className="text-lg font-bold text-orange-700 dark:text-orange-400 mt-1">{formatCurrency(totals.borrowed)}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-800 p-4">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> To Receive</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{formatCurrency(totals.netPositive)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800 p-4">
          <p className="text-xs text-red-700 dark:text-red-400 font-medium flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> To Give</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">{formatCurrency(totals.netNegative)}</p>
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
            <span className="text-base font-bold">{formatCurrency(Math.abs(totals.net))}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Remaining to receive {formatCurrency(totals.toReceive)} − Remaining to give {formatCurrency(totals.toGive)}
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

          {/* Table header — desktop */}
          <div className="hidden xl:grid grid-cols-12 gap-1 px-5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <div className="col-span-3"><SortBtn col="name"      label="Name"       /></div>
            <div className="col-span-2 flex justify-end"><SortBtn col="borrowed"   label="Borrowed"   align="right" /></div>
            <div className="col-span-2 flex justify-end"><SortBtn col="toGive"     label="To Give"    align="right" /></div>
            <div className="col-span-2 flex justify-end"><SortBtn col="lent"       label="Lent"       align="right" /></div>
            <div className="col-span-2 flex justify-end"><SortBtn col="toReceive"  label="To Receive" align="right" /></div>
            <div className="col-span-1 flex justify-end"><SortBtn col="net"        label="Net"        align="right" /></div>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-sm text-gray-500 dark:text-gray-400">
              No results for &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filtered.map(row => {
                const netPositive = row.net >= 0;
                return (
                  <div key={row.name} className="px-5 py-4 xl:grid xl:grid-cols-12 gap-1 items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors flex flex-col xl:flex-row">

                    {/* Name */}
                    <div className="xl:col-span-3 w-full xl:w-auto mb-2 xl:mb-0">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{row.name}</span>
                    </div>

                    {/* Mobile: grid 2-col */}
                    <div className="xl:contents grid grid-cols-2 gap-x-4 gap-y-2 w-full text-sm">
                      {/* Borrowed */}
                      <div className="xl:col-span-2 flex xl:block items-center justify-between xl:justify-end">
                        <span className="xl:hidden text-xs text-gray-400 font-medium">Borrowed</span>
                        <span className={`font-semibold ${row.borrowed > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'} xl:text-right block`}>
                          {row.borrowed > 0 ? formatCurrency(row.borrowed) : '—'}
                        </span>
                      </div>

                      {/* To Give */}
                      <div className="xl:col-span-2 flex xl:block items-center justify-between xl:justify-end">
                        <span className="xl:hidden text-xs text-gray-400 font-medium">To Give</span>
                        <span className={`font-semibold ${row.toGive > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'} xl:text-right block`}>
                          {row.toGive > 0 ? formatCurrency(row.toGive) : '—'}
                        </span>
                      </div>

                      {/* Lent */}
                      <div className="xl:col-span-2 flex xl:block items-center justify-between xl:justify-end">
                        <span className="xl:hidden text-xs text-gray-400 font-medium">Lent</span>
                        <span className={`font-semibold ${row.lent > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} xl:text-right block`}>
                          {row.lent > 0 ? formatCurrency(row.lent) : '—'}
                        </span>
                      </div>

                      {/* To Receive */}
                      <div className="xl:col-span-2 flex xl:block items-center justify-between xl:justify-end">
                        <span className="xl:hidden text-xs text-gray-400 font-medium">To Receive</span>
                        <span className={`font-semibold ${row.toReceive > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'} xl:text-right block`}>
                          {row.toReceive > 0 ? formatCurrency(row.toReceive) : '—'}
                        </span>
                      </div>

                      {/* Net */}
                      <div className="xl:col-span-1 flex xl:block items-center justify-between xl:justify-end col-span-2">
                        <span className="xl:hidden text-xs text-gray-400 font-medium">Net</span>
                        <span className={`text-sm font-black xl:text-right block ${netPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {netPositive ? '+' : ''}{formatCurrency(row.net)}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Footer totals */}
          {filtered.length > 0 && (
            <div className="hidden xl:grid grid-cols-12 gap-1 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-700 text-xs font-black text-gray-600 dark:text-gray-300 uppercase">
              <div className="col-span-3">{filtered.length} {filtered.length === 1 ? 'person' : 'people'}</div>
              <div className="col-span-2 text-right text-orange-600 dark:text-orange-400">
                {formatCurrency(filtered.reduce((s, r) => s + r.borrowed, 0))}
              </div>
              <div className="col-span-2 text-right text-red-600 dark:text-red-400">
                {formatCurrency(filtered.reduce((s, r) => s + r.toGive, 0))}
              </div>
              <div className="col-span-2 text-right text-blue-600 dark:text-blue-400">
                {formatCurrency(filtered.reduce((s, r) => s + r.lent, 0))}
              </div>
              <div className="col-span-2 text-right text-green-600 dark:text-green-400">
                {formatCurrency(filtered.reduce((s, r) => s + r.toReceive, 0))}
              </div>
              <div className={`col-span-1 text-right font-black ${filtered.reduce((s, r) => s + r.net, 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(filtered.reduce((s, r) => s + r.net, 0))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { ChevronLeft, ChevronRight } from 'lucide-react';

const MIN_YEAR = 2020;
const MAX_YEAR = new Date().getFullYear() + 1;

/**
 * A compact year nav with ‹ YYYY › arrows.
 *
 * Props:
 *   year     – current year (number)
 *   onChange – called with new year (number)
 *   className – optional extra wrapper classes
 */
export default function YearSelector({ year, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-1 py-0.5 ${className}`}>
      <button
        onClick={() => year > MIN_YEAR && onChange(year - 1)}
        disabled={year <= MIN_YEAR}
        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Previous year"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 px-1 min-w-[40px] text-center select-none">
        {year}
      </span>
      <button
        onClick={() => year < MAX_YEAR && onChange(year + 1)}
        disabled={year >= MAX_YEAR}
        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Next year"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

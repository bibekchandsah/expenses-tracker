import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCurrentBSYear } from '../../utils/calendarUtils';

const AD_MIN = 2020;
const AD_MAX = new Date().getFullYear() + 1;

const BS_MIN = 2074;
const BS_MAX = getCurrentBSYear() + 1;

/**
 * A compact year nav with ‹ YYYY › arrows.
 *
 * Props:
 *   year      – current year (number)
 *   onChange  – called with new year (number)
 *   calendar  – 'gregorian' | 'bs'  (default: 'gregorian')
 *   className – optional extra wrapper classes
 */
export default function YearSelector({ year, onChange, calendar = 'gregorian', className = '' }) {
  const minYear = calendar === 'bs' ? BS_MIN : AD_MIN;
  const maxYear = calendar === 'bs' ? BS_MAX : AD_MAX;

  return (
    <div className={`flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-1 py-0.5 ${className}`}>
      <button
        onClick={() => year > minYear && onChange(year - 1)}
        disabled={year <= minYear}
        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Previous year"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100 px-1 text-center select-none">
        {year}
      </span>
      <button
        onClick={() => year < maxYear && onChange(year + 1)}
        disabled={year >= maxYear}
        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Next year"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

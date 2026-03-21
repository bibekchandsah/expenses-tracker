import { useCountUp } from '../../hooks/useCountUp';

/**
 * Parses a formatted currency/number string into a raw number for animation.
 * Returns { prefix, suffix, rawNumber } so we can re-format during animation.
 */
function parseValue(value) {
  if (typeof value === 'number') return { prefix: '', suffix: '', rawNumber: value };
  const str = String(value);
  // Match optional prefix (currency symbol / letters), number, optional suffix
  const match = str.match(/^([^0-9-]*)(-?[\d,]+\.?\d*)(.*)$/);
  if (!match) return { prefix: '', suffix: '', rawNumber: null };
  const rawNumber = parseFloat(match[2].replace(/,/g, ''));
  return { prefix: match[1], suffix: match[3], rawNumber: isNaN(rawNumber) ? null : rawNumber };
}

function formatAnimated(prefix, suffix, rawNumber, animated) {
  // Preserve decimal places from original
  const decimals = (String(rawNumber).split('.')[1] || '').length;
  const formatted = animated.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${formatted}${suffix}`;
}

export default function StatsCard({ title, value, icon: Icon, color = 'blue', trend, trendLabel = 'vs last month', subtitle }) {
  const colors = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };

  const { prefix, suffix, rawNumber } = parseValue(value);
  const animated = useCountUp(rawNumber ?? 0);
  const displayValue = rawNumber !== null
    ? formatAnimated(prefix, suffix, rawNumber, animated)
    : value;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">{displayValue}</p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <p className={`text-xs font-medium mt-1 ${trend >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% {trendLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${colors[color]} ml-3 flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

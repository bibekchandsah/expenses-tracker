import { useCountUp } from '../../hooks/useCountUp';

/**
 * Renders an animated count-up number.
 * Accepts either a raw number or a pre-formatted string (e.g. "Rs 1,234.00").
 */
export default function CountUpValue({ value, className }) {
  // Parse the input value
  const str = String(value ?? 0);
  const match = str.match(/^([^0-9-]*)(-?[\d,]+\.?\d*)(.*)$/);
  
  const prefix = match ? match[1] : '';
  const suffix = match ? match[3] : '';
  const rawNumber = match ? parseFloat(match[2].replace(/,/g, '')) : (typeof value === 'number' ? value : 0);
  
  // Determine decimal places from the original number
  const decimals = rawNumber ? (String(rawNumber).split('.')[1] || '').length : 2;

  // Animate the number
  const animated = useCountUp(isNaN(rawNumber) ? 0 : rawNumber);

  // Format the animated value
  const formatted = animated.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}

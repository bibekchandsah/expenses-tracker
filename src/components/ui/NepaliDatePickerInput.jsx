import { useEffect, useRef } from 'react';
import { ADToBS, BSToAD } from 'bikram-sambat-js';

/**
 * A React wrapper around the vanilla Nepali Date Picker v5 by sajanmaharjan.
 * Requires the CDN <script> and <link> to be present in index.html.
 *
 * Props:
 *   value    – AD date string "YYYY-MM-DD" (stored / passed back)
 *   onChange – called with an AD date string "YYYY-MM-DD" on selection
 *   className – forwarded to the underlying <input>
 */
export default function NepaliDatePickerInput({ value, onChange, className }) {
  const inputRef  = useRef(null);
  // Keep a stable ref to onChange so the onSelect closure never goes stale
  const onChangeFn = useRef(onChange);
  useEffect(() => { onChangeFn.current = onChange; });

  // Read dark mode from document root class (set by ThemeContext)
  const isDark = () => document.documentElement.classList.contains('dark');

  // Convert AD value → BS for display
  const toBS = (adDate) => {
    try { return adDate ? ADToBS(adDate) : ''; } catch { return ''; }
  };

  // ── Initialize picker once on mount ──────────────────────────────────────
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    function initPicker() {
      if (typeof input.NepaliDatePicker !== 'function') {
        // CDN script not yet ready – retry in 100 ms
        setTimeout(initPicker, 100);
        return;
      }
      const initialBS = toBS(input.dataset.adValue);
      input.NepaliDatePicker({
        dateFormat: 'YYYY-MM-DD',
        miniEnglishDates: true,
        ...(isDark() ? { mode: 'dark' } : {}),
        ...(initialBS ? { value: initialBS } : {}),
        onSelect(bsDate) {
          if (!bsDate) return;
          try {
            // v5 onSelect may pass either a "YYYY-MM-DD" string or a {year,month,day} object
            const bsStr = typeof bsDate === 'string'
              ? bsDate
              : `${bsDate.year}-${String(bsDate.month).padStart(2, '0')}-${String(bsDate.day).padStart(2, '0')}`;
            const adDate = BSToAD(bsStr);
            onChangeFn.current(adDate);
          } catch (err) {
            console.error('[NepaliDatePicker] onSelect error:', err, 'bsDate:', bsDate);
          }
        },
      });
    }

    setTimeout(initPicker, 0);

    return () => {
      try {
        if (typeof input.NepaliDatePicker === 'function') {
          input.NepaliDatePicker('destroy');
        }
      } catch {}
    };
  // Intentionally [] — initialize/destroy only on mount/unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync displayed BS value when the AD value prop changes ───────────────
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    // Store the current AD value so initPicker can read it on first mount
    input.dataset.adValue = value || '';
    const bs = toBS(value);
    // Only update the native input value — don’t trigger a re-init
    if (input.value !== bs) input.value = bs;
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      readOnly
      defaultValue={toBS(value)}
      data-ad-value={value || ''}
      placeholder="Select BS date"
      className={className}
    />
  );
}

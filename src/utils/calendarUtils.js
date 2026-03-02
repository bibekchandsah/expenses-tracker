// Bikram Sambat (BS) calendar utilities
// Conversion powered by the bikram-sambat-js library (npm: bikram-sambat-js)

import { ADToBS } from 'bikram-sambat-js';

export const BS_MONTHS_LONG = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan',
  'Bhadra',  'Ashwin', 'Kartik', 'Mangsir',
  'Poush',   'Magh',   'Falgun', 'Chaitra',
];

export const BS_MONTHS_SHORT = [
  'Bai', 'Jes', 'Asd', 'Shr',
  'Bha', 'Asw', 'Kar', 'Man',
  'Pou', 'Mag', 'Fal', 'Cha',
];

/**
 * Get a display month label for a YYYY-MM string.
 *
 * @param {string} yyyyMM            - e.g. '2025-04'
 * @param {'gregorian'|'bs'} calendar
 * @param {'short'|'long'}   format
 * @returns {string}  e.g. 'Apr' | 'April 2025' | 'Bai' | 'Baisakh 2082'
 */
export function getMonthLabel(yyyyMM, calendar = 'gregorian', format = 'short') {
  // Use the 15th as representative day to avoid month-boundary edge cases
  const d = new Date(yyyyMM + '-15T00:00:00');

  if (calendar !== 'bs') {
    return format === 'short'
      ? d.toLocaleDateString('en-US', { month: 'short' })
      : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Use the 1st of the month — BS boundaries fall mid-month (~13th–17th),
  // so day 15 can already be in the *next* BS month.
  const bsStr = ADToBS(yyyyMM + '-01'); // e.g. "2082-01-02"
  const [bsYear, bsMonth] = bsStr.split('-').map(Number);

  return format === 'short'
    ? BS_MONTHS_SHORT[bsMonth - 1]
    : `${BS_MONTHS_LONG[bsMonth - 1]} ${bsYear}`;
}

/**
 * Format a full YYYY-MM-DD date string for display.
 *
 * @param {string} yyyyMMDD          - e.g. '2026-03-02'
 * @param {'gregorian'|'bs'} calendar
 * @returns {string}  e.g. 'Mar 2, 2026' | 'Fal 18, 2082'
 */
export function getFullDateLabel(yyyyMMDD, calendar = 'gregorian') {
  if (calendar !== 'bs') {
    const d = new Date(yyyyMMDD + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const bsStr = ADToBS(yyyyMMDD); // e.g. "2082-11-18"
  const [bsYear, bsMonth, bsDay] = bsStr.split('-').map(Number);
  return `${BS_MONTHS_SHORT[bsMonth - 1]} ${bsDay}, ${bsYear}`;
}

/**
 * Return a year label for a Gregorian year number.
 * Gregorian year 2026 spans two BS years (e.g. 2082 & 2083), so BS shows "2082/83".
 *
 * @param {number} year              - Gregorian year e.g. 2026
 * @param {'gregorian'|'bs'} calendar
 * @returns {string}  e.g. '2026' | '2082/83'
 */
export function getYearLabel(year, calendar = 'gregorian') {
  if (calendar !== 'bs') return String(year);
  const startBS = ADToBS(`${year}-01-01`).split('-').map(Number)[0]; // BS year of Jan 1
  const endBS   = ADToBS(`${year}-12-31`).split('-').map(Number)[0]; // BS year of Dec 31
  if (startBS === endBS) return String(startBS);
  return `${startBS}/${String(endBS).slice(-2)}`; // e.g. "2082/83"
}

/**
 * Safely convert an AD date string (YYYY-MM-DD) to BS (YYYY-MM-DD).
 * Returns empty string on invalid input or conversion error.
 */
export function safeADToBS(adDate) {
  if (!adDate || typeof adDate !== 'string' || adDate.length < 10) return '';
  try { return ADToBS(adDate); } catch { return ''; }
}

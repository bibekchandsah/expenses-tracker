// Bikram Sambat (BS) calendar utilities
// Conversion powered by the bikram-sambat-js library (npm: bikram-sambat-js)

import { ADToBS, BSToAD } from 'bikram-sambat-js';

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

// ─────────────────────────────────────────────────────────────────────────────
// BS-NATIVE YEAR / MONTH UTILITIES
// These operate on actual BS years (2082, 2083…) rather than the AD year that
// a BS range straddles.  Use these when calendar === 'bs'.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the BS year that today falls in.
 * e.g. if today is 2026-03-20 (= Cha 6, 2082) → 2082
 */
export function getCurrentBSYear() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    return parseInt(ADToBS(today).split('-')[0], 10);
  } catch {
    return new Date().getFullYear() + 56; // rough fallback
  }
}

/**
 * Return the AD date range {start, end} that covers a full BS year.
 * start = Baisakh 1  (AD)
 * end   = the day before Baisakh 1 of the following BS year (AD)
 *
 * @param {number} bsYear  e.g. 2082
 * @returns {{ start: string, end: string }}  both in 'YYYY-MM-DD' AD format
 */
export function getBSYearRange(bsYear) {
  const start = BSToAD(`${bsYear}-01-01`);
  const endDate = new Date(BSToAD(`${bsYear + 1}-01-01`) + 'T00:00:00');
  endDate.setDate(endDate.getDate() - 1);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

/**
 * Return the AD date range for a specific BS month.
 *
 * @param {number} bsYear
 * @param {number} bsMonth  1–12
 * @returns {{ start: string, end: string }}
 */
export function getBSMonthRange(bsYear, bsMonth) {
  const start = BSToAD(`${bsYear}-${String(bsMonth).padStart(2, '0')}-01`);
  let nextYear = bsYear, nextMonth = bsMonth + 1;
  if (nextMonth > 12) { nextYear += 1; nextMonth = 1; }
  const nextStart = new Date(BSToAD(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`) + 'T00:00:00');
  nextStart.setDate(nextStart.getDate() - 1);
  const end = nextStart.toISOString().slice(0, 10);
  return { start, end };
}

/**
 * Convert an AD date string to a BS "YYYY-MM" key (e.g. "2082-12").
 * Returns '' on failure.
 *
 * @param {string} adDate  'YYYY-MM-DD'
 * @returns {string}
 */
export function adDateToBSMonthKey(adDate) {
  if (!adDate || adDate.length < 10) return '';
  try {
    const bsStr = ADToBS(adDate);          // e.g. "2082-12-06"
    const [bsYear, bsMonth] = bsStr.split('-');
    return `${bsYear}-${bsMonth}`;         // e.g. "2082-12"
  } catch { return ''; }
}

/**
 * Return an array of 12 BS "YYYY-MM" keys for the given BS year,
 * from Baisakh (01) to Chaitra (12).
 *
 * @param {number} bsYear
 * @returns {string[]}  e.g. ["2082-01", "2082-02", …, "2082-12"]
 */
export function bsMonthsOfYear(bsYear) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    months.push(`${bsYear}-${String(m).padStart(2, '0')}`);
  }
  return months;
}

/**
 * Return a display label for a BS "YYYY-MM" key.
 *
 * @param {string} bsMonthKey  e.g. "2082-12"
 * @param {'short'|'long'} format
 * @returns {string}  e.g. 'Cha' | 'Chaitra 2082'
 */
export function getBSMonthLabel(bsMonthKey, format = 'short') {
  const parts = String(bsMonthKey).split('-');
  const bsYear  = parseInt(parts[0], 10);
  const bsMonth = parseInt(parts[1], 10);
  if (!bsMonth || bsMonth < 1 || bsMonth > 12) return bsMonthKey;
  return format === 'short'
    ? BS_MONTHS_SHORT[bsMonth - 1]
    : `${BS_MONTHS_LONG[bsMonth - 1]} ${bsYear}`;
}

/**
 * Check whether an AD date falls within a given BS year.
 *
 * @param {string} adDate  'YYYY-MM-DD'
 * @param {number} bsYear
 * @returns {boolean}
 */
export function isInBSYear(adDate, bsYear) {
  if (!adDate || adDate.length < 10) return false;
  const { start, end } = getBSYearRange(bsYear);
  return adDate >= start && adDate <= end;
}

const CURRENCY_SYMBOLS = {
  USD: '$',   EUR: '€',   GBP: '£',   INR: '₹',   NPR: 'Rs',
  THB: '฿',  IDR: 'Rp',  BTN: 'Nu',  LKR: 'Rs',  MVR: 'Rf',
  JPY: '¥',  CNY: '¥',   CAD: 'C$',  AUD: 'A$',  SGD: 'S$',
  AED: 'د.إ',SAR: '﷼',  MYR: 'RM',  PKR: '₨',   BDT: '৳',
  MMK: 'K',  KHR: '៛',   VND: '₫',   PHP: '₱',   BRL: 'R$',
  MXN: '$',  ZAR: 'R',   NGN: '₦',   KES: 'Ksh', CHF: 'Fr',
  SEK: 'kr', NOK: 'kr',  DKK: 'kr',  NZD: 'NZ$', HKD: 'HK$',
  KRW: '₩',  TRY: '₺',   RUB: '₽',   QAR: 'QR',  HUF: 'Ft',
  CZK: 'Kč', PLN: 'zł',  ILS: '₪',   CLP: '$',   COP: '$',
};

export function formatCurrency(amount, currency = 'USD') {
  const num = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const sym = CURRENCY_SYMBOLS[currency?.toUpperCase()];
  if (sym) return `${sym} ${num}`;

  // Fallback: try Intl currency formatting, catch unknown codes
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${num}`;
  }
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatMonth(dateStr) {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return new Date(+year, +month - 1, 1).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long',
  });
}

export function getMonthYear(dateStr) {
  if (!dateStr) return '';
  return dateStr.slice(0, 7); // "YYYY-MM"
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentYear() {
  return new Date().getFullYear();
}

export function groupByMonth(expenses) {
  const groups = {};
  expenses.forEach(e => {
    const key = e.date.slice(0, 7);
    if (!groups[key]) groups[key] = { month: key, total: 0, expenses: [] };
    groups[key].total += +e.amount;
    groups[key].expenses.push(e);
  });
  return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
}

export function groupByCategory(expenses) {
  const groups = {};
  expenses.forEach(e => {
    if (!groups[e.category]) groups[e.category] = { category: e.category, total: 0, count: 0 };
    groups[e.category].total += +e.amount;
    groups[e.category].count++;
  });
  return Object.values(groups);
}

export function last12Months() {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
  }
  return months;
}

export function monthsOfYear(year) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    months.push(`${year}-${String(m).padStart(2, '0')}`);
  }
  return months;
}

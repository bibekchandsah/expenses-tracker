export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
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
  return new Date().toISOString().slice(0, 7);
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
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

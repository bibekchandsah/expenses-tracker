export function exportToCSV(expenses, filename = 'expenses.csv') {
  const headers = ['Title', 'Amount', 'Category', 'Date', 'Notes'];
  const rows = expenses.map(e => [
    `"${e.title?.replace(/"/g, '""') || ''}"`,
    e.amount,
    `"${e.category || ''}"`,
    e.date,
    `"${e.notes?.replace(/"/g, '""') || ''}"`,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

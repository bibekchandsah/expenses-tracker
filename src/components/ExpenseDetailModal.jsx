import { useEffect, useRef } from 'react';
import { X, Edit2, Trash2, Zap, Calendar, Tag, AlignLeft, FileText, Building2 } from 'lucide-react';
import { formatCurrency, capFirst } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';
import { useCalendar } from '../context/CalendarContext';

export default function ExpenseDetailModal({ expense, category, bank, onClose, onEdit, onDelete, onQuickAdd }) {
  const { currency } = useCurrency();
  const { dateLabel } = useCalendar();
  const overlayRef = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!expense) return null;

  const cat = category;
  const accentColor = cat?.color || '#6b7280';
  const bgAccent = accentColor + '18';
  const bgAccentStrong = accentColor + '30';

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
    >
      <div className="w-full sm:max-w-sm bg-white dark:bg-gray-900 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-in">

        {/* ── Hero band ── */}
        <div
          className="relative px-6 pt-6 pb-5"
          style={{ background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}0a 100%)` }}
        >
          {/* Drag handle (mobile) */}
          <div className="sm:hidden w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-5" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon + category label + amount */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
              style={{ background: bgAccentStrong }}
            >
              {cat?.icon || '📦'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: accentColor }}>
                {cat?.name || 'Uncategorized'}
              </p>
              <span className="text-2xl font-black tabular-nums leading-none" style={{ color: accentColor }}>
                {formatCurrency(expense.amount, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-gray-100 dark:bg-gray-800" />

        {/* ── Detail rows ── */}
        {/* Order: Date → Title → Notes → Description → Bank → Category */}
        <div className="px-6 py-4 space-y-3.5">
          <DetailRow
            icon={<Calendar className="w-4 h-4" />}
            label="Date"
            value={dateLabel(expense.date)}
          />

          <DetailRow
            icon={<FileText className="w-4 h-4" />}
            label="Title"
            value={capFirst(expense.title)}
          />

          {expense.notes && (
            <DetailRow
              icon={<AlignLeft className="w-4 h-4" />}
              label="Notes"
              value={capFirst(expense.notes)}
              multiline
            />
          )}

          {expense.description && (
            <DetailRow
              icon={<FileText className="w-4 h-4" />}
              label="Description"
              value={capFirst(expense.description)}
              multiline
            />
          )}

          {/* Bank — second last */}
          {bank && (
            <DetailRow
              icon={<Building2 className="w-4 h-4" />}
              label="Bank"
              value={bank.name}
            />
          )}

          {/* Category — last */}
          {cat?.name && (
            <DetailRow
              icon={<Tag className="w-4 h-4" />}
              label="Category"
              value={
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: bgAccent, color: accentColor }}
                >
                  {cat.icon} {cat.name}
                </span>
              }
            />
          )}
        </div>

        {/* ── Actions ── */}
        <div className="px-6 pb-6 pt-2 grid grid-cols-3 gap-2.5">
          <ActionBtn
            onClick={() => { onQuickAdd(); onClose(); }}
            icon={<Zap className="w-4 h-4" />}
            label="Quick Add"
            className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          />
          <ActionBtn
            onClick={() => { onEdit(); onClose(); }}
            icon={<Edit2 className="w-4 h-4" />}
            label="Edit"
            className="text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40"
          />
          <ActionBtn
            onClick={() => { onDelete(); onClose(); }}
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40"
          />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, multiline = false }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
        {typeof value === 'string' ? (
          <p className={`text-sm text-gray-800 dark:text-gray-200 font-medium ${multiline ? 'whitespace-pre-wrap' : ''}`}>
            {value}
          </p>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold transition-colors ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

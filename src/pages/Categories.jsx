import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Lock, X, Check, Smile, Pin } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const PRESET_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
  '#06b6d4','#3b82f6','#8b5cf6','#ec4899','#f43f5e',
  '#84cc16','#10b981','#0ea5e9','#6366f1','#a855f7',
  '#f59e0b','#64748b','#78716c','#1e293b','#0f172a',
];

const EMOJI_GROUPS = [
  { label: 'Money & Finance', emojis: ['💰','💵','💳','🏦','📈','📉','💸','🪙','💹','🤑','💎','🏧'] },
  { label: 'Food & Drink',    emojis: ['🍔','🍕','🌮','🍣','☕','🍺','🥗','🍜','🍰','🛒','🍱','🥤'] },
  { label: 'Travel',          emojis: ['✈️','🚗','🚕','🚂','⛵','🏨','🗺️','🧳','⛽','🚌','🛵','🚁'] },
  { label: 'Home & Life',     emojis: ['🏠','🏡','🛋️','🔑','💡','🔧','🛁','🧹','🌿','🐾','🌱','🌻'] },
  { label: 'Health',          emojis: ['💊','🏥','🩺','🧬','🏋️','🧘','🫀','🦷','👓','💉','🩹','🧪'] },
  { label: 'Entertainment',   emojis: ['🎮','🎵','🎬','📚','🎲','🎭','🎨','🎤','🏆','⚽','🎯','🎸'] },
  { label: 'Tech & Work',     emojis: ['💻','📱','🖥️','⌨️','📷','📡','🔋','🖨️','📄','✏️','📌','🗂️'] },
  { label: 'People & Care',   emojis: ['👶','🧒','👨‍👩‍👧','❤️','👗','👟','💍','👑','🎓','🎁','🎀','🧧'] },
];

const EMPTY_FORM = { name: '', icon: '📦', color: '#3b82f6' };

function CategoryModal({ isOpen, category, onClose, onSave, pinned = false, onPinnedChange }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [activeGroup, setActiveGroup] = useState(0);
  const colorRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm(category ? { name: category.name, icon: category.icon, color: category.color } : EMPTY_FORM);
      setCustomEmoji('');
      setActiveGroup(0);
    }
  }, [isOpen, category]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      await onSave(form);
      if (pinned && !category) {
        setForm(EMPTY_FORM);
        setCustomEmoji('');
        setActiveGroup(0);
        setError('');
      } else {
        onClose();
      }
    }
    catch { setError('Failed to save category'); }
    finally { setSaving(false); }
  }

  function applyCustomEmoji() {
    const trimmed = customEmoji.trim();
    if (trimmed) {
      // Take first grapheme cluster (one emoji)
      const seg = [...new Intl.Segmenter().segment(trimmed)];
      if (seg.length > 0) setForm(f => ({ ...f, icon: seg[0].segment }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-slide-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{category ? 'Edit' : 'Add'} Category</h2>
          <div className="flex items-center gap-1">
            {!category && onPinnedChange && (
              <button
                type="button"
                onClick={() => onPinnedChange(p => !p)}
                title={pinned ? 'Unpin: close after adding' : 'Pin: keep open to add multiple'}
                className={`p-1.5 rounded-lg transition-colors ${pinned ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <Pin className={`w-4 h-4 ${pinned ? 'fill-primary-600 dark:fill-primary-400' : ''}`} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:bg-gray-700 transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto">

            {/* Preview */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100 dark:border-gray-700" style={{ background: form.color + '28' }}>
                {form.icon}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError(''); }}
                placeholder="Category name"
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            {/* ── Emoji Picker ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <Smile className="w-4 h-4" /> Icon
              </label>

              {/* Group tabs */}
              <div className="flex gap-1 flex-wrap mb-2">
                {EMOJI_GROUPS.map((g, i) => (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => setActiveGroup(i)}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors font-medium ${
                      activeGroup === i
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {g.label.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Emoji grid */}
              <div className="grid grid-cols-8 gap-1 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                {EMOJI_GROUPS[activeGroup].emojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, icon: emoji }))}
                    title={emoji}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-xl transition-all ${
                      form.icon === emoji
                        ? 'ring-2 ring-primary-500 bg-primary-100 dark:bg-primary-900/40 scale-110'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Custom emoji input */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={customEmoji}
                  onChange={e => setCustomEmoji(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCustomEmoji(); }}}
                  placeholder="Paste any emoji..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={applyCustomEmoji}
                  className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Use
                </button>
              </div>
            </div>

            {/* ── Color Picker ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color }))}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center flex-shrink-0 ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110' : ''}`}
                    style={{ background: color }}
                  >
                    {form.color === color && <Check className="w-3 h-3 text-white drop-shadow" />}
                  </button>
                ))}

                {/* Custom color swatch — clicking opens hidden input */}
                <button
                  type="button"
                  onClick={() => colorRef.current?.click()}
                  className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors text-base"
                  title="Custom color"
                >
                  +
                </button>
                <input
                  ref={colorRef}
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="sr-only"
                />
              </div>

              {/* Current color preview */}
              <div className="flex items-center gap-2 mt-1">
                <div className="w-5 h-5 rounded-full shadow-sm flex-shrink-0" style={{ background: form.color }} />
                <input
                  type="text"
                  value={form.color}
                  maxLength={7}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm(f => ({ ...f, color: v }));
                  }}
                  className="w-24 px-2 py-1 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-400">or type a hex code</span>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-colors">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Categories() {
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useCategories();
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPinned, setModalPinned] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const customCategories = categories.filter(c => !c.isDefault);
  const defaultCategories = categories.filter(c => c.isDefault);

  async function handleSave(data) {
    if (editing) {
      await updateCategory(editing.id, data);
      addToast('Category updated!', 'success');
    } else {
      await addCategory(data);
      addToast('Category added!', 'success');
    }
  }

  async function handleDelete() {
    await deleteCategory(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Category deleted', 'success');
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  const renderCategory = (cat) => (
    <div key={cat.id} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: cat.color + '20' }}>
        {cat.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{cat.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
          <span className="text-xs text-gray-400">{cat.color}</span>
          {cat.isDefault && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-md">Default</span>}
        </div>
      </div>
      {!cat.isDefault ? (
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setEditing(cat); setModalOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteTarget(cat)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <Lock className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{categories.length} categories total</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {customCategories.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Custom</h2>
          <div className="grid grid-cols-1 gap-3">
            {customCategories.map(renderCategory)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Default</h2>
        <div className="grid grid-cols-1 gap-3">
          {defaultCategories.map(renderCategory)}
        </div>
      </div>

      <CategoryModal
        isOpen={modalOpen}
        category={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        pinned={modalPinned}
        onPinnedChange={setModalPinned}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? Existing expenses with this category won't be affected.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

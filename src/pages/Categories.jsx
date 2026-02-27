import { useState } from 'react';
import { Plus, Edit2, Trash2, Lock, X, Check } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const PRESET_COLORS = ['#f97316', '#06b6d4', '#ec4899', '#8b5cf6', '#ef4444', '#eab308', '#22c55e', '#3b82f6', '#14b8a6', '#f43f5e'];
const PRESET_ICONS = ['🍔', '✈️', '🛍️', '📄', '❤️', '🎮', '📦', '💰', '🎓', '🏠', '🚗', '💊', '🎵', '📱', '🌿', '🏋️', '🐾', '☕'];
const EMPTY_FORM = { name: '', icon: '📦', color: '#3b82f6' };

function CategoryModal({ isOpen, category, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useState(() => {
    if (isOpen) setForm(category ? { name: category.name, icon: category.icon, color: category.color } : EMPTY_FORM);
  }, [isOpen, category]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { setError('Failed to save category'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{category ? 'Edit' : 'Add'} Category</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hovr:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Preview */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: form.color + '20' }}>
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
          {/* Icon picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icon</label>
            <div className="grid grid-cols-9 gap-1">
              {PRESET_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, icon }))}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all ${form.icon === icon ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color }))}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ background: color }}
                >
                  {form.color === color && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
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
    <div className="max-w-2xl space-y-6 animate-fade-in">
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

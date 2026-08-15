import { useState } from 'react';
import { Plus, Edit2, Trash2, Lock } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CategoryModal from '../components/CategoryModal';

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

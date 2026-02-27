import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToCategories,
  addCategory as addCatSvc,
  updateCategory as updateCatSvc,
  deleteCategory as deleteCatSvc,
  DEFAULT_CATEGORIES,
} from '../services/categoryService';

const CategoryContext = createContext(null);

export function CategoryProvider({ children }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) { setCategories(DEFAULT_CATEGORIES); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToCategories(user.uid, (data) => {
      setCategories(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addCategory = useCallback(async (data) => {
    try { await addCatSvc(user.uid, data); }
    catch (e) { setError(e.message); throw e; }
  }, [user]);

  const updateCategory = useCallback(async (id, data) => {
    try { await updateCatSvc(user.uid, id, data); }
    catch (e) { setError(e.message); throw e; }
  }, [user]);

  const deleteCategory = useCallback(async (id) => {
    try { await deleteCatSvc(user.uid, id); }
    catch (e) { setError(e.message); throw e; }
  }, [user]);

  const getCategoryById = useCallback((id) => categories.find(c => c.id === id) || null, [categories]);

  return (
    <CategoryContext.Provider value={{ categories, loading, error, addCategory, updateCategory, deleteCategory, getCategoryById }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error('useCategories must be used within CategoryProvider');
  return ctx;
}

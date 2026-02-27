import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToBudgets,
  setBudget as setBudgetSvc,
  deleteBudget as deleteBudgetSvc,
} from '../services/budgetService';

const BudgetContext = createContext(null);

export function BudgetProvider({ children }) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setBudgets({}); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToBudgets(user.uid, (data) => {
      setBudgets(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const setBudget = useCallback(async (categoryId, month, amount) => {
    await setBudgetSvc(user.uid, categoryId, month, amount);
  }, [user]);

  const deleteBudget = useCallback(async (id) => {
    await deleteBudgetSvc(user.uid, id);
  }, [user]);

  // Get budget for a specific category and month
  const getBudget = useCallback((categoryId, month) => {
    const id = `${month}_${categoryId}`;
    return budgets[id] || null;
  }, [budgets]);

  return (
    <BudgetContext.Provider value={{ budgets, loading, setBudget, deleteBudget, getBudget }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudgets() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudgets must be used within BudgetProvider');
  return ctx;
}

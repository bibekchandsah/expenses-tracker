import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToExpenses,
  addExpense as addExpenseSvc,
  updateExpense as updateExpenseSvc,
  deleteExpense as deleteExpenseSvc,
} from '../services/expenseService';

const ExpenseContext = createContext(null);

const initialState = {
  expenses: [],
  loading: true,
  error: null,
  filters: {
    search: '',
    category: '',
    month: '',
    startDate: '',
    endDate: '',
    sortBy: '',
    sortDir: 'desc',
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_EXPENSES':
      return { ...state, expenses: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'RESET_FILTERS':
      return { ...state, filters: initialState.filters };
    default:
      return state;
  }
}

export function ExpenseProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_EXPENSES', payload: [] });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    const unsub = subscribeToExpenses(user.uid, (data) => {
      dispatch({ type: 'SET_EXPENSES', payload: data });
    });
    return unsub;
  }, [user]);

  const addExpense = useCallback(async (data) => {
    try {
      await addExpenseSvc(user.uid, data);
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
      throw e;
    }
  }, [user]);

  const updateExpense = useCallback(async (id, data) => {
    try {
      await updateExpenseSvc(user.uid, id, data);
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
      throw e;
    }
  }, [user]);

  const deleteExpense = useCallback(async (id) => {
    try {
      await deleteExpenseSvc(user.uid, id);
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
      throw e;
    }
  }, [user]);

  const setFilters = useCallback((f) => dispatch({ type: 'SET_FILTERS', payload: f }), []);
  const resetFilters = useCallback(() => dispatch({ type: 'RESET_FILTERS' }), []);

  // Filtered + sorted expenses
  const filteredExpenses = state.expenses.filter(e => {
    if (state.filters.category && e.category !== state.filters.category) return false;
    if (state.filters.month && !e.date.startsWith(state.filters.month)) return false;
    if (state.filters.startDate && e.date < state.filters.startDate) return false;
    if (state.filters.endDate && e.date > state.filters.endDate) return false;
    return true;
  }).sort((a, b) => {
    if (!state.filters.sortBy) return 0; // natural Firestore order
    const dir = state.filters.sortDir === 'asc' ? 1 : -1;
    if (state.filters.sortBy === 'amount') return (a.amount - b.amount) * dir;
    if (state.filters.sortBy === 'category') return a.category.localeCompare(b.category) * dir;
    return (a.date > b.date ? 1 : -1) * dir;
  });

  return (
    <ExpenseContext.Provider value={{
      expenses: state.expenses,
      filteredExpenses,
      loading: state.loading,
      error: state.error,
      filters: state.filters,
      addExpense,
      updateExpense,
      deleteExpense,
      setFilters,
      resetFilters,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('useExpenses must be used within ExpenseProvider');
  return ctx;
}

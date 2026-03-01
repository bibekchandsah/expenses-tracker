import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToIncomes,
  addIncome as addIncomeSvc,
  updateIncome as updateIncomeSvc,
  deleteIncome as deleteIncomeSvc,
} from '../services/incomeService';

const IncomeContext = createContext(null);

const initialState = {
  incomes: [],
  loading: true,
  error: null,
  filters: {
    search: '',
    source: '',
    month: '',
    startDate: '',
    endDate: '',
    sortBy: '',
    sortDir: 'desc',
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_INCOMES':
      return { ...state, incomes: action.payload, loading: false };
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

function applyFilters(incomes, filters) {
  let result = [...incomes];

  if (filters.source) {
    result = result.filter(i => i.source === filters.source);
  }
  if (filters.month) {
    result = result.filter(i => i.date?.startsWith(filters.month));
  }
  if (filters.startDate) {
    result = result.filter(i => i.date >= filters.startDate);
  }
  if (filters.endDate) {
    result = result.filter(i => i.date <= filters.endDate);
  }

  if (filters.sortBy) {
    result.sort((a, b) => {
      let va = a[filters.sortBy];
      let vb = b[filters.sortBy];
      if (filters.sortBy === 'amount') { va = +va; vb = +vb; }
      if (va < vb) return filters.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return filters.sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return result;
}

export function IncomeProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_INCOMES', payload: [] });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    const unsub = subscribeToIncomes(user.uid, (data) => {
      dispatch({ type: 'SET_INCOMES', payload: data });
    });
    return unsub;
  }, [user]);

  const addIncome = useCallback(async (data) => {
    try {
      await addIncomeSvc(user.uid, data);
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
      throw e;
    }
  }, [user]);

  const updateIncome = useCallback(async (id, data) => {
    try {
      await updateIncomeSvc(user.uid, id, data);
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
      throw e;
    }
  }, [user]);

  const deleteIncome = useCallback(async (id) => {
    try {
      await deleteIncomeSvc(user.uid, id);
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
      throw e;
    }
  }, [user]);

  const setFilters = useCallback((payload) => dispatch({ type: 'SET_FILTERS', payload }), []);
  const resetFilters = useCallback(() => dispatch({ type: 'RESET_FILTERS' }), []);

  const filteredIncomes = applyFilters(state.incomes, state.filters);

  return (
    <IncomeContext.Provider value={{
      incomes: state.incomes,
      filteredIncomes,
      loading: state.loading,
      error: state.error,
      filters: state.filters,
      setFilters,
      resetFilters,
      addIncome,
      updateIncome,
      deleteIncome,
    }}>
      {children}
    </IncomeContext.Provider>
  );
}

export function useIncomes() {
  const ctx = useContext(IncomeContext);
  if (!ctx) throw new Error('useIncomes must be used within IncomeProvider');
  return ctx;
}

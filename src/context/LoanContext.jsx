import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToLoans,
  addLoan as addLoanSvc,
  updateLoan as updateLoanSvc,
  deleteLoan as deleteLoanSvc,
} from '../services/loanService';

const LoanContext = createContext(null);

export function LoanProvider({ children }) {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoans([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToLoans(user.uid, (data) => {
      setLoans(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addLoan    = useCallback((data)     => addLoanSvc(user.uid, data),           [user]);
  const updateLoan = useCallback((id, data) => updateLoanSvc(user.uid, id, data),    [user]);
  const deleteLoan = useCallback((id)       => deleteLoanSvc(user.uid, id),           [user]);

  return (
    <LoanContext.Provider value={{ loans, loading, addLoan, updateLoan, deleteLoan }}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoans() {
  const ctx = useContext(LoanContext);
  if (!ctx) throw new Error('useLoans must be used inside LoanProvider');
  return ctx;
}

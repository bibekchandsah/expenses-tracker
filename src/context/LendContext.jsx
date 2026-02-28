import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToLends,
  addLend as addLendSvc,
  updateLend as updateLendSvc,
  deleteLend as deleteLendSvc,
} from '../services/lendService';

const LendContext = createContext(null);

export function LendProvider({ children }) {
  const { user } = useAuth();
  const [lends, setLends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLends([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToLends(user.uid, (data) => {
      setLends(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addLend    = useCallback((data)           => addLendSvc(user.uid, data),           [user]);
  const updateLend = useCallback((id, data)       => updateLendSvc(user.uid, id, data),    [user]);
  const deleteLend = useCallback((id)             => deleteLendSvc(user.uid, id),           [user]);

  return (
    <LendContext.Provider value={{ lends, loading, addLend, updateLend, deleteLend }}>
      {children}
    </LendContext.Provider>
  );
}

export function useLends() {
  const ctx = useContext(LendContext);
  if (!ctx) throw new Error('useLends must be used inside LendProvider');
  return ctx;
}

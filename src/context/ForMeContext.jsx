import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToForMe,
  addForMe    as svcAdd,
  updateForMe as svcUpdate,
  deleteForMe as svcDelete,
} from '../services/forMeService';

const ForMeContext = createContext(null);

export function ForMeProvider({ children }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToForMe(
      user.uid,
      (data) => { setEntries(data); setLoading(false); },
      ()     => setLoading(false)
    );
    return unsub;
  }, [user]);

  const addEntry    = useCallback((data)     => svcAdd(user.uid, data),    [user]);
  const updateEntry = useCallback((id, data) => svcUpdate(user.uid, id, data), [user]);
  const deleteEntry = useCallback((id)       => svcDelete(user.uid, id),   [user]);

  return (
    <ForMeContext.Provider value={{ entries, loading, addEntry, updateEntry, deleteEntry }}>
      {children}
    </ForMeContext.Provider>
  );
}

export function useForMe() {
  const ctx = useContext(ForMeContext);
  if (!ctx) throw new Error('useForMe must be used inside ForMeProvider');
  return ctx;
}

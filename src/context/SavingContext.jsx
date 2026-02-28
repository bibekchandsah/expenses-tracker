import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToSavings,
  addSaving as addSavingSvc,
  updateSaving as updateSavingSvc,
  deleteSaving as deleteSavingSvc,
  subscribeToSavingSources,
  addSavingSource as addSavingSourceSvc,
  updateSavingSource as updateSavingSourceSvc,
  deleteSavingSource as deleteSavingSourceSvc,
} from '../services/savingService';

const SavingContext = createContext(null);

export function SavingProvider({ children }) {
  const { user } = useAuth();
  const [savings, setSavings]           = useState([]);
  const [sources, setSources]           = useState([]);
  const [loadingSavings, setLoadingSavings] = useState(true);
  const [loadingSources, setLoadingSources] = useState(true);

  useEffect(() => {
    if (!user) {
      setSavings([]); setSources([]);
      setLoadingSavings(false); setLoadingSources(false);
      return;
    }
    setLoadingSavings(true);
    setLoadingSources(true);
    const unsubSavings = subscribeToSavings(user.uid, (data) => {
      setSavings(data);
      setLoadingSavings(false);
    });
    const unsubSources = subscribeToSavingSources(user.uid, (data) => {
      setSources(data);
      setLoadingSources(false);
    });
    return () => { unsubSavings(); unsubSources(); };
  }, [user]);

  const addSaving          = useCallback((data)     => addSavingSvc(user.uid, data),           [user]);
  const updateSaving       = useCallback((id, data) => updateSavingSvc(user.uid, id, data),    [user]);
  const deleteSaving       = useCallback((id)       => deleteSavingSvc(user.uid, id),           [user]);
  const addSource          = useCallback((data)     => addSavingSourceSvc(user.uid, data),      [user]);
  const updateSource       = useCallback((id, data) => updateSavingSourceSvc(user.uid, id, data), [user]);
  const deleteSource       = useCallback((id)       => deleteSavingSourceSvc(user.uid, id),     [user]);

  return (
    <SavingContext.Provider value={{
      savings, sources,
      loading: loadingSavings || loadingSources,
      addSaving, updateSaving, deleteSaving,
      addSource, updateSource, deleteSource,
    }}>
      {children}
    </SavingContext.Provider>
  );
}

export function useSavings() {
  const ctx = useContext(SavingContext);
  if (!ctx) throw new Error('useSavings must be used inside SavingProvider');
  return ctx;
}

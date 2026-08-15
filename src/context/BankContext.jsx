import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToBanks,
  subscribeToBankEntries,
  addBank as addBankSvc,
  updateBank as updateBankSvc,
  deleteBank as deleteBankSvc,
  addBankEntry as addEntrySvc,
  updateBankEntry as updateEntrySvc,
  deleteBankEntry as deleteEntrySvc,
} from '../services/bankService';

const BankContext = createContext(null);

export function BankProvider({ children }) {
  const { user } = useAuth();
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);

  const [selectedBankId, setSelectedBankId] = useState(() => {
    try { return localStorage.getItem('bankLastSelectedId') || null; } catch { return null; }
  });
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Unsubscribe ref for entries listener
  const entryUnsub = useRef(null);

  // Persist selected bank to localStorage whenever it changes
  const setSelectedBankIdPersisted = useCallback((idOrUpdater) => {
    setSelectedBankId(prev => {
      const next = typeof idOrUpdater === 'function' ? idOrUpdater(prev) : idOrUpdater;
      try { if (next) localStorage.setItem('bankLastSelectedId', next); } catch {}
      return next;
    });
  }, []);
  useEffect(() => {
    if (!user) { setBanks([]); setBanksLoading(false); return; }
    setBanksLoading(true);
    const unsub = subscribeToBanks(user.uid, (data) => {
      setBanks(data);
      setBanksLoading(false);
      // Restore persisted bank if valid, otherwise fall back to first bank
      setSelectedBankIdPersisted(prev => {
        if (!prev && data.length > 0) return data[0].id;
        if (prev && !data.find(b => b.id === prev)) return data[0]?.id || null;
        return prev;
      });
    });
    return unsub;
  }, [user, setSelectedBankIdPersisted]);

  // Subscribe to entries whenever selectedBankId changes
  useEffect(() => {
    if (entryUnsub.current) { entryUnsub.current(); entryUnsub.current = null; }
    if (!user || !selectedBankId) { setEntries([]); return; }
    setEntriesLoading(true);
    entryUnsub.current = subscribeToBankEntries(user.uid, selectedBankId, (data) => {
      setEntries(data);
      setEntriesLoading(false);
    });
    return () => { if (entryUnsub.current) entryUnsub.current(); };
  }, [user, selectedBankId]);

  // Bank CRUD
  const addBank = useCallback(async (data) => {
    const ref = await addBankSvc(user.uid, data);
    setSelectedBankIdPersisted(ref.id);
    return ref;
  }, [user, setSelectedBankIdPersisted]);

  const updateBank = useCallback((bankId, data) => updateBankSvc(user.uid, bankId, data), [user]);

  const deleteBank = useCallback(async (bankId) => {
    await deleteBankSvc(user.uid, bankId);
    setSelectedBankIdPersisted(prev => (prev === bankId ? null : prev));
  }, [user, setSelectedBankIdPersisted]);

  // Entry CRUD
  const addEntry   = useCallback((data) => addEntrySvc(user.uid, selectedBankId, data), [user, selectedBankId]);
  const updateEntry = useCallback((entryId, data) => updateEntrySvc(user.uid, selectedBankId, entryId, data), [user, selectedBankId]);
  const deleteEntry = useCallback((entryId) => deleteEntrySvc(user.uid, selectedBankId, entryId), [user, selectedBankId]);
  // Add/update/delete an entry in a specific bank (not necessarily the selected one)
  const addEntryToBank    = useCallback((bankId, data)           => addEntrySvc(user.uid, bankId, data), [user]);
  const updateEntryInBank = useCallback((bankId, entryId, data)  => updateEntrySvc(user.uid, bankId, entryId, data), [user]);
  const deleteEntryInBank = useCallback((bankId, entryId)        => deleteEntrySvc(user.uid, bankId, entryId), [user]);

  // Compute running closing balance
  const selectedBank = banks.find(b => b.id === selectedBankId) || null;
  const entriesWithBalance = entries.reduce((acc, entry, idx) => {
    const prev = idx === 0 ? (selectedBank?.openingBalance || 0) : acc[idx - 1].closingBalance;
    acc.push({ ...entry, closingBalance: prev + (+entry.deposit || 0) - (+entry.withdraw || 0) });
    return acc;
  }, []);

  return (
    <BankContext.Provider value={{
      banks, banksLoading,
      selectedBankId, setSelectedBankId: setSelectedBankIdPersisted,
      selectedBank,
      entries: entriesWithBalance,
      entriesLoading,
      addBank, updateBank, deleteBank,
      addEntry, updateEntry, deleteEntry,
      addEntryToBank, updateEntryInBank, deleteEntryInBank,
    }}>
      {children}
    </BankContext.Provider>
  );
}

export function useBanks() {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error('useBanks must be used within BankProvider');
  return ctx;
}

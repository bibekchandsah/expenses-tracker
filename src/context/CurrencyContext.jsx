import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (!user) { setCurrency('USD'); return; }
    const ref = doc(db, 'users', user.uid, 'profile', 'info');
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setCurrency(snap.data().currency || 'USD');
      }
    });
    return unsub;
  }, [user]);

  async function updateCurrency(code) {
    if (!user) return;
    setCurrency(code); // optimistic update
    const ref = doc(db, 'users', user.uid, 'profile', 'info');
    await updateDoc(ref, { currency: code, updatedAt: serverTimestamp() });
  }

  return (
    <CurrencyContext.Provider value={{ currency, updateCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

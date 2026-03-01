import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const ActiveYearContext = createContext(null);

export function ActiveYearProvider({ children }) {
  const { user } = useAuth();
  const thisYear = new Date().getFullYear();
  const [activeYear, setActiveYear] = useState(thisYear);

  useEffect(() => {
    if (!user) { setActiveYear(thisYear); return; }
    const ref = doc(db, 'users', user.uid, 'profile', 'info');
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setActiveYear(snap.data().activeYear || thisYear);
      }
    });
    return unsub;
  }, [user]); // eslint-disable-line

  async function updateActiveYear(year) {
    if (!user) return;
    setActiveYear(year); // optimistic
    const ref = doc(db, 'users', user.uid, 'profile', 'info');
    await updateDoc(ref, { activeYear: year, updatedAt: serverTimestamp() });
  }

  return (
    <ActiveYearContext.Provider value={{ activeYear, updateActiveYear }}>
      {children}
    </ActiveYearContext.Provider>
  );
}

export function useActiveYear() {
  const ctx = useContext(ActiveYearContext);
  if (!ctx) throw new Error('useActiveYear must be used within ActiveYearProvider');
  return ctx;
}

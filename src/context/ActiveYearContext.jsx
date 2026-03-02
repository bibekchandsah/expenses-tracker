import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { getCurrentBSYear } from '../utils/calendarUtils';

const ActiveYearContext = createContext(null);

export function ActiveYearProvider({ children }) {
  const { user } = useAuth();
  const thisYear   = new Date().getFullYear();
  const thisBSYear = getCurrentBSYear();

  const [activeYear,   setActiveYear]   = useState(thisYear);
  const [bsActiveYear, setBSActiveYear] = useState(thisBSYear);

  useEffect(() => {
    if (!user) { setActiveYear(thisYear); setBSActiveYear(thisBSYear); return; }
    const ref = doc(db, 'users', user.uid, 'profile', 'info');
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        setActiveYear(data.activeYear || thisYear);
        setBSActiveYear(data.bsActiveYear || thisBSYear);
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

  async function updateBSActiveYear(year) {
    if (!user) return;
    setBSActiveYear(year); // optimistic
    const ref = doc(db, 'users', user.uid, 'profile', 'info');
    await updateDoc(ref, { bsActiveYear: year, updatedAt: serverTimestamp() });
  }

  return (
    <ActiveYearContext.Provider value={{ activeYear, updateActiveYear, bsActiveYear, updateBSActiveYear }}>
      {children}
    </ActiveYearContext.Provider>
  );
}

export function useActiveYear() {
  const ctx = useContext(ActiveYearContext);
  if (!ctx) throw new Error('useActiveYear must be used within ActiveYearProvider');
  return ctx;
}

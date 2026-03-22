import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToInterestRecords,
  addInterestRecord,
  updateInterestRecord,
  deleteInterestRecord,
} from '../services/interestService';

const InterestContext = createContext();

export function InterestProvider({ children }) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToInterestRecords(
      user.uid,
      (data) => {
        setRecords(data);
        setLoading(false);
      },
      (error) => {
        console.error('Interest subscription error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  async function addRecord(data) {
    if (!user) return;
    return addInterestRecord(user.uid, data);
  }

  async function updateRecord(id, data) {
    if (!user) return;
    return updateInterestRecord(user.uid, id, data);
  }

  async function deleteRecord(id) {
    if (!user) return;
    return deleteInterestRecord(user.uid, id);
  }

  return (
    <InterestContext.Provider value={{ records, loading, addRecord, updateRecord, deleteRecord }}>
      {children}
    </InterestContext.Provider>
  );
}

export function useInterest() {
  const context = useContext(InterestContext);
  if (!context) throw new Error('useInterest must be used within InterestProvider');
  return context;
}

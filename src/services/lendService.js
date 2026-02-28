import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

function lendsRef(uid) {
  return collection(db, 'users', uid, 'lends');
}

export function subscribeToLends(uid, callback, onError) {
  const q = query(lendsRef(uid), orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date?.toDate
        ? d.data().date.toDate().toISOString().split('T')[0]
        : d.data().date,
    }));
    callback(data);
  }, (err) => {
    console.error('subscribeToLends error:', err);
    callback([]);
    onError && onError(err);
  });
}

export async function addLend(uid, lend) {
  return addDoc(lendsRef(uid), {
    date: Timestamp.fromDate(new Date(lend.date)),
    amount: +lend.amount || 0,
    name: lend.name.trim(),
    reason: lend.reason?.trim() || '',
    returnedAmount: +lend.returnedAmount || 0,
    description: lend.description?.trim() || '',
    createdAt: serverTimestamp(),
  });
}

export async function updateLend(uid, lendId, lend) {
  return updateDoc(doc(db, 'users', uid, 'lends', lendId), {
    date: Timestamp.fromDate(new Date(lend.date)),
    amount: +lend.amount || 0,
    name: lend.name.trim(),
    reason: lend.reason?.trim() || '',
    returnedAmount: +lend.returnedAmount || 0,
    description: lend.description?.trim() || '',
  });
}

export async function deleteLend(uid, lendId) {
  return deleteDoc(doc(db, 'users', uid, 'lends', lendId));
}

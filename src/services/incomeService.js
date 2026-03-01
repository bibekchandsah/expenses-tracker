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

function incomesRef(uid) {
  return collection(db, 'users', uid, 'incomes');
}

export function subscribeToIncomes(uid, callback) {
  const q = query(incomesRef(uid), orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date?.toDate
        ? d.data().date.toDate().toISOString().split('T')[0]
        : d.data().date,
    }));
    callback(data);
  });
}

export async function addIncome(uid, income) {
  return addDoc(incomesRef(uid), {
    ...income,
    date: Timestamp.fromDate(new Date(income.date)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateIncome(uid, id, income) {
  const ref = doc(db, 'users', uid, 'incomes', id);
  return updateDoc(ref, {
    ...income,
    date: Timestamp.fromDate(new Date(income.date)),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteIncome(uid, id) {
  const ref = doc(db, 'users', uid, 'incomes', id);
  return deleteDoc(ref);
}

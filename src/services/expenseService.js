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

function expensesRef(uid) {
  return collection(db, 'users', uid, 'expenses');
}

export function subscribeToExpenses(uid, callback) {
  const q = query(expensesRef(uid), orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date?.toDate ? d.data().date.toDate().toISOString().split('T')[0] : d.data().date,
    }));
    callback(data);
  });
}

export async function addExpense(uid, expense) {
  return addDoc(expensesRef(uid), {
    ...expense,
    date: Timestamp.fromDate(new Date(expense.date)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateExpense(uid, id, expense) {
  const ref = doc(db, 'users', uid, 'expenses', id);
  return updateDoc(ref, {
    ...expense,
    date: Timestamp.fromDate(new Date(expense.date)),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteExpense(uid, id) {
  const ref = doc(db, 'users', uid, 'expenses', id);
  return deleteDoc(ref);
}

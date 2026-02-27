import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  query,
} from 'firebase/firestore';
import { db } from '../firebase/config';

function budgetsRef(uid) {
  return collection(db, 'users', uid, 'budgets');
}

export function subscribeToBudgets(uid, callback) {
  const q = query(budgetsRef(uid));
  return onSnapshot(q, (snap) => {
    const data = {};
    snap.docs.forEach(d => {
      data[d.id] = { id: d.id, ...d.data() };
    });
    callback(data);
  });
}

// budgetId is "{year}-{month}" e.g. "2024-01" + categoryId
export async function setBudget(uid, categoryId, month, amount) {
  const id = `${month}_${categoryId}`;
  const ref = doc(db, 'users', uid, 'budgets', id);
  return setDoc(ref, { categoryId, month, amount, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteBudget(uid, id) {
  const ref = doc(db, 'users', uid, 'budgets', id);
  return deleteDoc(ref);
}

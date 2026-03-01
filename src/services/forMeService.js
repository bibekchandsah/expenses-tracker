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
} from 'firebase/firestore';
import { db } from '../firebase/config';

function forMeRef(uid) {
  return collection(db, 'users', uid, 'forMe');
}

export function subscribeToForMe(uid, callback, onError) {
  const q = query(forMeRef(uid), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          date:      d.data().date?.toDate?.()      ?? null,
          createdAt: d.data().createdAt?.toDate?.() ?? null,
        }))
      );
    },
    (err) => {
      console.error('subscribeToForMe error:', err);
      callback([]);
      onError?.(err);
    }
  );
}

export async function addForMe(uid, entry) {
  return addDoc(forMeRef(uid), {
    name:        entry.name?.trim()        || '',
    amount:      Number(entry.amount)      || 0,
    description: entry.description?.trim() || '',
    date:        entry.date,
    createdAt:   serverTimestamp(),
  });
}

export async function updateForMe(uid, id, entry) {
  return updateDoc(doc(forMeRef(uid), id), {
    name:        entry.name?.trim()        || '',
    amount:      Number(entry.amount)      || 0,
    description: entry.description?.trim() || '',
    date:        entry.date,
  });
}

export async function deleteForMe(uid, id) {
  return deleteDoc(doc(forMeRef(uid), id));
}

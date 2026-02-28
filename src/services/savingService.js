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

// ── Savings (main table) ─────────────────────────────────────────
function savingsRef(uid) {
  return collection(db, 'users', uid, 'savings');
}

export function subscribeToSavings(uid, callback, onError) {
  const q = query(savingsRef(uid), orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date?.toDate
        ? d.data().date.toDate().toISOString().split('T')[0]
        : d.data().date,
    })));
  }, (err) => {
    console.error('subscribeToSavings error:', err);
    callback([]);
    onError && onError(err);
  });
}

export async function addSaving(uid, entry) {
  return addDoc(savingsRef(uid), {
    date: Timestamp.fromDate(new Date(entry.date)),
    amount: +entry.amount || 0,
    expendOn: entry.expendOn?.trim() || '',
    description: entry.description?.trim() || '',
    createdAt: serverTimestamp(),
  });
}

export async function updateSaving(uid, id, entry) {
  return updateDoc(doc(db, 'users', uid, 'savings', id), {
    date: Timestamp.fromDate(new Date(entry.date)),
    amount: +entry.amount || 0,
    expendOn: entry.expendOn?.trim() || '',
    description: entry.description?.trim() || '',
  });
}

export async function deleteSaving(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'savings', id));
}

// ── Saving Sources (right panel table) ──────────────────────────
function savingSourcesRef(uid) {
  return collection(db, 'users', uid, 'savingSources');
}

export function subscribeToSavingSources(uid, callback, onError) {
  const q = query(savingSourcesRef(uid), orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date?.toDate
        ? d.data().date.toDate().toISOString().split('T')[0]
        : d.data().date,
    })));
  }, (err) => {
    console.error('subscribeToSavingSources error:', err);
    callback([]);
    onError && onError(err);
  });
}

export async function addSavingSource(uid, entry) {
  return addDoc(savingSourcesRef(uid), {
    date: Timestamp.fromDate(new Date(entry.date)),
    amount: +entry.amount || 0,
    description: entry.description?.trim() || '',
    createdAt: serverTimestamp(),
  });
}

export async function updateSavingSource(uid, id, entry) {
  return updateDoc(doc(db, 'users', uid, 'savingSources', id), {
    date: Timestamp.fromDate(new Date(entry.date)),
    amount: +entry.amount || 0,
    description: entry.description?.trim() || '',
  });
}

export async function deleteSavingSource(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'savingSources', id));
}

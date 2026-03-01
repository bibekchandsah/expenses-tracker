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
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Bank accounts ──────────────────────────────────────────────
function banksRef(uid) {
  return collection(db, 'users', uid, 'banks');
}

export function subscribeToBanks(uid, callback, onError) {
  const q = query(banksRef(uid), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(data);
  }, (err) => {
    console.error('subscribeToBanks error:', err);
    callback([]);
    onError && onError(err);
  });
}

export async function addBank(uid, bank) {
  return addDoc(banksRef(uid), {
    name: bank.name,
    openingBalance: +bank.openingBalance || 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateBank(uid, bankId, data) {
  return updateDoc(doc(db, 'users', uid, 'banks', bankId), data);
}

export async function deleteBank(uid, bankId) {
  return deleteDoc(doc(db, 'users', uid, 'banks', bankId));
}

// ── Bank entries (transactions) ────────────────────────────────
function entriesRef(uid, bankId) {
  return collection(db, 'users', uid, 'banks', bankId, 'entries');
}

export function subscribeToBankEntries(uid, bankId, callback, onError) {
  const q = query(entriesRef(uid, bankId), orderBy('date', 'asc'), orderBy('createdAt', 'asc'));
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
    console.error('subscribeToBankEntries error:', err);
    callback([]);
    onError && onError(err);
  });
}

export async function addBankEntry(uid, bankId, entry) {
  return addDoc(entriesRef(uid, bankId), {
    date: Timestamp.fromDate(new Date(entry.date)),
    description: entry.description,
    deposit: +entry.deposit || 0,
    withdraw: +entry.withdraw || 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateBankEntry(uid, bankId, entryId, entry) {
  return updateDoc(doc(db, 'users', uid, 'banks', bankId, 'entries', entryId), {
    date: Timestamp.fromDate(new Date(entry.date)),
    description: entry.description,
    deposit: +entry.deposit || 0,
    withdraw: +entry.withdraw || 0,
  });
}

export async function deleteBankEntry(uid, bankId, entryId) {
  return deleteDoc(doc(db, 'users', uid, 'banks', bankId, 'entries', entryId));
}

// One-time fetch of all entries for a bank (used for export)
export async function getBankEntriesOnce(uid, bankId) {
  const q = query(entriesRef(uid, bankId), orderBy('date', 'asc'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    date: d.data().date?.toDate
      ? d.data().date.toDate().toISOString().split('T')[0]
      : d.data().date,
  }));
}

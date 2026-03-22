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

function interestRef(uid) {
  return collection(db, 'users', uid, 'interest');
}

export function subscribeToInterestRecords(uid, callback, onError) {
  const q = query(interestRef(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate
          ? d.data().date.toDate().toISOString().split('T')[0]
          : d.data().date,
      }));
      callback(data);
    },
    (err) => {
      console.error('subscribeToInterestRecords error:', err);
      callback([]);
      onError && onError(err);
    }
  );
}

export async function addInterestRecord(uid, record) {
  return addDoc(interestRef(uid), {
    name: record.name,
    date: Timestamp.fromDate(new Date(record.date)),
    transactionType: record.transactionType || 'given',
    type: record.type,
    principal: +record.principal || 0,
    rate: +record.rate || 0,
    years: +record.years || 0,
    compoundFrequency: record.compoundFrequency || null,
    interest: +record.interest || 0,
    total: +record.total || 0,
    info: record.info || '',
    createdAt: serverTimestamp(),
  });
}

export async function updateInterestRecord(uid, recordId, record) {
  const docRef = doc(db, 'users', uid, 'interest', recordId);
  return updateDoc(docRef, {
    name: record.name,
    date: Timestamp.fromDate(new Date(record.date)),
    transactionType: record.transactionType || 'given',
    type: record.type,
    principal: +record.principal || 0,
    rate: +record.rate || 0,
    years: +record.years || 0,
    compoundFrequency: record.compoundFrequency || null,
    interest: +record.interest || 0,
    total: +record.total || 0,
    info: record.info || '',
  });
}

export async function deleteInterestRecord(uid, recordId) {
  return deleteDoc(doc(db, 'users', uid, 'interest', recordId));
}

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

function loansRef(uid) {
  return collection(db, 'users', uid, 'loans');
}

export function subscribeToLoans(uid, callback, onError) {
  const q = query(loansRef(uid), orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
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
    console.error('subscribeToLoans error:', err);
    callback([]);
    onError && onError(err);
  });
}

export async function addLoan(uid, loan) {
  return addDoc(loansRef(uid), {
    date: Timestamp.fromDate(new Date(loan.date)),
    amount: +loan.amount || 0,
    name: loan.name.trim(),
    reason: loan.reason?.trim() || '',
    paidAmount: +loan.paidAmount || 0,
    description: loan.description?.trim() || '',
    createdAt: serverTimestamp(),
  });
}

export async function updateLoan(uid, loanId, loan) {
  return updateDoc(doc(db, 'users', uid, 'loans', loanId), {
    date: Timestamp.fromDate(new Date(loan.date)),
    amount: +loan.amount || 0,
    name: loan.name.trim(),
    reason: loan.reason?.trim() || '',
    paidAmount: +loan.paidAmount || 0,
    description: loan.description?.trim() || '',
  });
}

export async function deleteLoan(uid, loanId) {
  return deleteDoc(doc(db, 'users', uid, 'loans', loanId));
}

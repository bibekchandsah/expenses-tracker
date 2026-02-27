import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid, 'profile', 'info');
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  const ref = doc(db, 'users', uid, 'profile', 'info');
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

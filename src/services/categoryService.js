import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#f97316', isDefault: true },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#06b6d4', isDefault: true },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899', isDefault: true },
  { id: 'bills', name: 'Bills', icon: '📄', color: '#8b5cf6', isDefault: true },
  { id: 'health', name: 'Health', icon: '❤️', color: '#ef4444', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮', color: '#eab308', isDefault: true },
  { id: 'others', name: 'Others', icon: '📦', color: '#6b7280', isDefault: true },
];

function categoriesRef(uid) {
  return collection(db, 'users', uid, 'categories');
}

export function subscribeToCategories(uid, callback) {
  const q = query(categoriesRef(uid), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const custom = snap.docs.map(d => ({ id: d.id, ...d.data(), isDefault: false }));
    callback([...DEFAULT_CATEGORIES, ...custom]);
  });
}

export async function addCategory(uid, cat) {
  return addDoc(categoriesRef(uid), { ...cat, createdAt: serverTimestamp() });
}

export async function updateCategory(uid, id, cat) {
  const ref = doc(db, 'users', uid, 'categories', id);
  return updateDoc(ref, cat);
}

export async function deleteCategory(uid, id) {
  const ref = doc(db, 'users', uid, 'categories', id);
  return deleteDoc(ref);
}

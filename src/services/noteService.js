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

function notesRef(uid) {
  return collection(db, 'users', uid, 'notes');
}

export function subscribeToNotes(uid, callback, onError) {
  const q = query(notesRef(uid), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() ?? null,
          updatedAt: d.data().updatedAt?.toDate?.() ?? null,
        }))
      );
    },
    (err) => {
      console.error('subscribeToNotes error:', err);
      callback([]);
      onError?.(err);
    }
  );
}

export async function addNote(uid, note) {
  return addDoc(notesRef(uid), {
    title:    note.title?.trim()   || '',
    content:  note.content?.trim() || '',
    color:    note.color           || 'default',
    pinned:   note.pinned          ?? false,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateNote(uid, id, fields) {
  return updateDoc(doc(db, 'users', uid, 'notes', id), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNote(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'notes', id));
}

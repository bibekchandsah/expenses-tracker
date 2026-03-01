import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToNotes,
  addNote    as addNoteSvc,
  updateNote as updateNoteSvc,
  deleteNote as deleteNoteSvc,
} from '../services/noteService';

const NoteContext = createContext(null);

export function NoteProvider({ children }) {
  const { user } = useAuth();
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setNotes([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToNotes(user.uid, (data) => {
      setNotes(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addNote    = useCallback((data)     => addNoteSvc(user.uid, data),           [user]);
  const updateNote = useCallback((id, data) => updateNoteSvc(user.uid, id, data),    [user]);
  const deleteNote = useCallback((id)       => deleteNoteSvc(user.uid, id),           [user]);

  return (
    <NoteContext.Provider value={{ notes, loading, addNote, updateNote, deleteNote }}>
      {children}
    </NoteContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NoteContext);
  if (!ctx) throw new Error('useNotes must be used inside NoteProvider');
  return ctx;
}

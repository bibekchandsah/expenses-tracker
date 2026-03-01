import { useState, useMemo, useEffect, useRef } from 'react';
import {
  StickyNote, Plus, Search, X, Pin, PinOff, Archive, ArchiveX,
  Trash2, Palette, LayoutGrid, List, Clock, SortAsc,
  Check,
} from 'lucide-react';
import { useNotes } from '../context/NoteContext';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// ── Color palette ────────────────────────────────────────────────
const COLORS = [
  { id: 'default', label: 'Default', bg: '', cardLight: 'bg-white border-gray-200', cardDark: 'dark:bg-gray-800 dark:border-gray-700', dot: 'bg-gray-300 dark:bg-gray-600' },
  { id: 'red',     label: 'Red',     bg: 'bg-red-50    dark:bg-red-950',   cardLight: 'bg-red-50    border-red-200',    cardDark: 'dark:bg-red-950    dark:border-red-800',    dot: 'bg-red-400' },
  { id: 'orange',  label: 'Orange',  bg: 'bg-orange-50 dark:bg-orange-950', cardLight: 'bg-orange-50 border-orange-200', cardDark: 'dark:bg-orange-950 dark:border-orange-800', dot: 'bg-orange-400' },
  { id: 'yellow',  label: 'Yellow',  bg: 'bg-yellow-50 dark:bg-yellow-950', cardLight: 'bg-yellow-50 border-yellow-200', cardDark: 'dark:bg-yellow-950 dark:border-yellow-800', dot: 'bg-yellow-400' },
  { id: 'green',   label: 'Green',   bg: 'bg-green-50  dark:bg-green-950',  cardLight: 'bg-green-50  border-green-200',  cardDark: 'dark:bg-green-950  dark:border-green-800',  dot: 'bg-green-400' },
  { id: 'teal',    label: 'Teal',    bg: 'bg-teal-50   dark:bg-teal-950',   cardLight: 'bg-teal-50   border-teal-200',   cardDark: 'dark:bg-teal-950   dark:border-teal-800',   dot: 'bg-teal-400' },
  { id: 'blue',    label: 'Blue',    bg: 'bg-blue-50   dark:bg-blue-950',   cardLight: 'bg-blue-50   border-blue-200',   cardDark: 'dark:bg-blue-950   dark:border-blue-800',   dot: 'bg-blue-400' },
  { id: 'purple',  label: 'Purple',  bg: 'bg-purple-50 dark:bg-purple-950', cardLight: 'bg-purple-50 border-purple-200', cardDark: 'dark:bg-purple-950 dark:border-purple-800', dot: 'bg-purple-400' },
  { id: 'pink',    label: 'Pink',    bg: 'bg-pink-50   dark:bg-pink-950',   cardLight: 'bg-pink-50   border-pink-200',   cardDark: 'dark:bg-pink-950   dark:border-pink-800',   dot: 'bg-pink-400' },
];

function getColor(id) {
  return COLORS.find(c => c.id === id) ?? COLORS[0];
}

function formatRelative(date) {
  if (!date) return '';
  const now  = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

// ── Color Picker ─────────────────────────────────────────────────
function ColorPicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function outside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Change color"
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <Palette className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 flex gap-1.5 flex-wrap w-48">
          {COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              onClick={() => { onChange(c.id); setOpen(false); }}
              className={`w-6 h-6 rounded-full ${c.dot} ring-offset-1 transition-all ${value === c.id ? 'ring-2 ring-primary-500 scale-110' : 'hover:scale-110'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────
function NoteModal({ isOpen, note, onClose, onSave }) {
  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');
  const [color,   setColor]   = useState('default');
  const [pinned,  setPinned]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const contentRef = useRef();

  useEffect(() => {
    if (!isOpen) return;
    setTitle(note?.title   ?? '');
    setContent(note?.content ?? '');
    setColor(note?.color   ?? 'default');
    setPinned(note?.pinned ?? false);
    setTimeout(() => contentRef.current?.focus(), 50);
  }, [isOpen, note]);

  if (!isOpen) return null;

  const c = getColor(color);

  async function handleSave() {
    if (!title.trim() && !content.trim()) { onClose(); return; }
    setSaving(true);
    try { await onSave({ title, content, color, pinned }); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col animate-slide-in ${c.cardLight} ${c.cardDark}`} style={{ maxHeight: '90vh' }}>
        {/* Title */}
        <div className="px-6 pt-6 pb-2 flex-shrink-0">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent text-lg font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
        </div>
        {/* Content */}
        <div className="px-6 pb-3 flex-1 overflow-y-auto">
          <textarea
            ref={contentRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Take a note..."
            rows={14}
            className="w-full h-full bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none resize-none"
          />
        </div>
        {/* Footer */}
        <div className="flex items-center gap-1 px-4 py-3 border-t border-black/5 dark:border-white/10 flex-shrink-0">
          <button
            type="button"
            onClick={() => setPinned(p => !p)}
            title={pinned ? 'Unpin' : 'Pin note'}
            className={`p-1.5 rounded-lg transition-colors ${pinned ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'}`}
          >
            {pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
          </button>
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : note ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Quick Add Bar ─────────────────────────────────────────────────
function QuickAdd({ onAdd }) {
  const [open,    setOpen]    = useState(false);
  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');
  const [color,   setColor]   = useState('default');
  const [pinned,  setPinned]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const wrapRef = useRef();

  // close on outside click
  useEffect(() => {
    function outside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        handleClose();
      }
    }
    if (open) document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open, title, content]);

  function handleClose() {
    if ((title.trim() || content.trim()) && !saving) {
      handleSave();
    } else {
      reset();
    }
  }

  function reset() {
    setOpen(false); setTitle(''); setContent(''); setColor('default'); setPinned(false);
  }

  async function handleSave() {
    if (!title.trim() && !content.trim()) { reset(); return; }
    setSaving(true);
    try { await onAdd({ title, content, color, pinned }); }
    finally { setSaving(false); reset(); }
  }

  const c = getColor(color);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full max-w-2xl mx-auto flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
      >
        <Plus className="w-4 h-4" />
        Take a note...
      </button>
    );
  }

  // Expanded → full modal overlay
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div ref={wrapRef} className={`w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col animate-slide-in ${c.cardLight} ${c.cardDark}`} style={{ maxHeight: '90vh' }}>
        {/* Title */}
        <div className="px-6 pt-6 pb-2 flex-shrink-0">
          <input
            type="text"
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent text-lg font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            onKeyDown={e => { if (e.key === 'Escape') reset(); }}
          />
        </div>
        {/* Content */}
        <div className="px-6 pb-3 flex-1 overflow-y-auto">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Take a note..."
            rows={14}
            className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none resize-none"
            onKeyDown={e => { if (e.key === 'Escape') reset(); }}
          />
        </div>
        {/* Footer */}
        <div className="flex items-center gap-1 px-4 py-3 border-t border-black/5 dark:border-white/10 flex-shrink-0">
          <button
            type="button"
            onClick={() => setPinned(p => !p)}
            title={pinned ? 'Unpin' : 'Pin'}
            className={`p-1.5 rounded-lg transition-colors ${pinned ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-400 hover:text-gray-600 hover:bg-black/5 dark:hover:bg-white/10'}`}
          >
            {pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
          </button>
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex-1" />
          <button
            type="button"
            onClick={reset}
            className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Note Card ─────────────────────────────────────────────────────
function NoteCard({ note, onEdit, onPin, onArchive, onDelete, onColorChange }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const c = getColor(note.color);

  return (
    <div
      className={`group relative rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${c.cardLight} ${c.cardDark}`}
      onClick={() => onEdit(note)}
    >
      {/* Pin badge */}
      {note.pinned && (
        <span className="absolute top-2 right-2 text-primary-400">
          <Pin className="w-3.5 h-3.5" />
        </span>
      )}

      {/* Title */}
      {note.title && (
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 pr-5 line-clamp-2">
          {note.title}
        </h3>
      )}

      {/* Content */}
      {note.content && (
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-6 whitespace-pre-wrap leading-relaxed">
          {note.content}
        </p>
      )}

      {/* Timestamp */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        {formatRelative(note.updatedAt)}
      </p>

      {/* Action bar (appears on hover) */}
      <div
        className="absolute bottom-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        {/* Color picker */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            title="Change color"
            onClick={e => { e.stopPropagation(); setShowColorPicker(o => !o); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          {showColorPicker && (
            <div
              className="absolute bottom-full right-0 mb-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 flex gap-1.5 flex-wrap w-40"
              onClick={e => e.stopPropagation()}
            >
              {COLORS.map(col => (
                <button
                  key={col.id}
                  title={col.label}
                  onClick={e => { e.stopPropagation(); onColorChange(note, col.id); setShowColorPicker(false); }}
                  className={`w-5 h-5 rounded-full ${col.dot} ring-offset-1 transition-all hover:scale-110 ${note.color === col.id ? 'ring-2 ring-primary-500 scale-110' : ''}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pin toggle */}
        <button
          title={note.pinned ? 'Unpin' : 'Pin'}
          onClick={e => { e.stopPropagation(); onPin(note); }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>

        {/* Archive toggle */}
        <button
          title={note.archived ? 'Unarchive' : 'Archive'}
          onClick={e => { e.stopPropagation(); onArchive(note); }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          {note.archived ? <ArchiveX className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
        </button>

        {/* Delete */}
        <button
          title="Delete"
          onClick={e => { e.stopPropagation(); onDelete(note); }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Notes Grid ────────────────────────────────────────────────────
function NotesGrid({ notes, onEdit, onPin, onArchive, onDelete, onColorChange }) {
  if (notes.length === 0) return null;
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4" style={{ columnGap: '1rem' }}>
      {notes.map(n => (
        <div key={n.id} className="break-inside-avoid" style={{ marginBottom: '1rem' }}>
          <NoteCard
            note={n}
            onEdit={onEdit}
            onPin={onPin}
            onArchive={onArchive}
            onDelete={onDelete}
            onColorChange={onColorChange}
          />
        </div>
      ))}
    </div>
  );
}

// ── Notes List (compact) ──────────────────────────────────────────
function NotesList({ notes, onEdit, onPin, onArchive, onDelete, onColorChange }) {
  if (notes.length === 0) return null;
  return (
    <div className="space-y-3">
      {notes.map(n => {
        const c = getColor(n.color);
        return (
          <div
            key={n.id}
            onClick={() => onEdit(n)}
            className={`group flex items-start gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${c.cardLight} ${c.cardDark}`}
          >
            {n.pinned && <Pin className="w-3 h-3 text-primary-400 flex-shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              {n.title   && <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{n.title}</p>}
              {n.content && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.content}</p>}
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 self-center">{formatRelative(n.updatedAt)}</span>
            <div
              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={e => e.stopPropagation()}
            >
              <button title={n.pinned ? 'Unpin' : 'Pin'} onClick={e => { e.stopPropagation(); onPin(n); }}
                className="p-1 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><Pin className="w-3 h-3" /></button>
              <button title={n.archived ? 'Unarchive' : 'Archive'} onClick={e => { e.stopPropagation(); onArchive(n); }}
                className="p-1 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><Archive className="w-3 h-3" /></button>
              <button title="Delete" onClick={e => { e.stopPropagation(); onDelete(n); }}
                className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sort options ──────────────────────────────────────────────────
const SORT_OPTIONS = [
  { id: 'updated', label: 'Last edited', icon: Clock },
  { id: 'created', label: 'Date created', icon: Clock },
  { id: 'title',   label: 'Title A→Z',   icon: SortAsc },
];

// ── Main Page ─────────────────────────────────────────────────────
export default function Note() {
  const { notes, loading, addNote, updateNote, deleteNote } = useNotes();
  const { addToast } = useToast();

  const [modal,       setModal]       = useState({ open: false, note: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search,      setSearch]      = useState('');
  const [sortBy,      setSortBy]      = useState('updated');
  const [viewMode,    setViewMode]    = useState('grid');   // 'grid' | 'list'
  const [showArchive, setShowArchive] = useState(false);
  const [showSort,    setShowSort]    = useState(false);
  const sortRef = useRef();

  useEffect(() => {
    function outside(e) { if (sortRef.current && !sortRef.current.contains(e.target)) setShowSort(false); }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  // Filter + sort
  const processed = useMemo(() => {
    let list = [...notes];
    if (showArchive) {
      list = list.filter(n => n.archived);
    } else {
      list = list.filter(n => !n.archived);
    }
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'title')   return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'created') return (b.createdAt || 0) - (a.createdAt || 0);
      return (b.updatedAt || 0) - (a.updatedAt || 0); // 'updated'
    });
    return list;
  }, [notes, search, sortBy, showArchive]);

  const pinned   = useMemo(() => processed.filter(n => n.pinned  && !showArchive), [processed, showArchive]);
  const others   = useMemo(() => processed.filter(n => !n.pinned || showArchive),  [processed, showArchive]);

  // handlers
  async function handleAdd(data) {
    await addNote(data);
    addToast('Note added!');
  }

  async function handleSave(data) {
    if (modal.note) {
      await updateNote(modal.note.id, data);
      addToast('Note updated!');
    } else {
      await addNote(data);
      addToast('Note added!');
    }
  }

  async function handlePin(note) {
    await updateNote(note.id, { pinned: !note.pinned });
  }

  async function handleArchive(note) {
    await updateNote(note.id, { archived: !note.archived, pinned: false });
    addToast(note.archived ? 'Note unarchived' : 'Note archived');
  }

  async function handleColorChange(note, color) {
    await updateNote(note.id, { color });
  }

  async function handleDelete() {
    await deleteNote(deleteTarget.id);
    setDeleteTarget(null);
    addToast('Note deleted');
  }

  const noteCount    = notes.filter(n => !n.archived).length;
  const archiveCount = notes.filter(n =>  n.archived).length;

  const GridOrList = viewMode === 'grid' ? NotesGrid : NotesList;

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-primary-600" /> Notes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {noteCount} note{noteCount !== 1 ? 's' : ''}
            {archiveCount > 0 && ` · ${archiveCount} archived`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Archive toggle */}
          <button
            onClick={() => setShowArchive(a => !a)}
            title={showArchive ? 'Show notes' : 'Show archive'}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-colors ${showArchive ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            {showArchive ? <><ArchiveX className="w-4 h-4" /> Back to Notes</> : <><Archive className="w-4 h-4" /> Archive {archiveCount > 0 && `(${archiveCount})`}</>}
          </button>
          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'List view' : 'Grid view'}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Quick add (only on main view, not archive) */}
      {!showArchive && <QuickAdd onAdd={handleAdd} />}

      {/* Search + Sort bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => setShowSort(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <SortAsc className="w-4 h-4" />
            <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.id === sortBy)?.label}</span>
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-44 py-1 overflow-hidden">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setSortBy(opt.id); setShowSort(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${sortBy === opt.id ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  {opt.label}
                  {sortBy === opt.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Archive label */}
      {showArchive && (
        <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400 font-medium">
          <Archive className="w-4 h-4" /> Archived Notes
        </div>
      )}

      {/* Empty state */}
      {processed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center px-4">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
            {showArchive ? <Archive className="w-8 h-8 text-yellow-500" /> : <StickyNote className="w-8 h-8 text-primary-600" />}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {search ? 'No notes match your search' : showArchive ? 'No archived notes' : 'No notes yet'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            {search ? 'Try a different search term.' : showArchive ? 'Archived notes will appear here.' : 'Click the bar above to start writing your first note.'}
          </p>
        </div>
      )}

      {/* Pinned section */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Pinned
          </p>
          <GridOrList
            notes={pinned}
            onEdit={n => setModal({ open: true, note: n })}
            onPin={handlePin}
            onArchive={handleArchive}
            onDelete={setDeleteTarget}
            onColorChange={handleColorChange}
          />
        </div>
      )}

      {/* Others section */}
      {others.length > 0 && (
        <div className="space-y-3">
          {pinned.length > 0 && (
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Others</p>
          )}
          <GridOrList
            notes={others}
            onEdit={n => setModal({ open: true, note: n })}
            onPin={handlePin}
            onArchive={handleArchive}
            onDelete={setDeleteTarget}
            onColorChange={handleColorChange}
          />
        </div>
      )}

      {/* Edit Modal */}
      <NoteModal
        isOpen={modal.open}
        note={modal.note}
        onClose={() => setModal({ open: false, note: null })}
        onSave={handleSave}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete note?"
        message={deleteTarget?.title ? `"${deleteTarget.title}"` : 'This note will be permanently deleted.'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

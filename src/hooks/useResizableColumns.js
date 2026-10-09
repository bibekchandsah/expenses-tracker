import { useState, useCallback, useRef } from 'react';

const LS_KEY_PREFIX = 'colWidths_';

function loadWidths(tableKey, defaults) {
  try {
    const raw = localStorage.getItem(LS_KEY_PREFIX + tableKey);
    if (!raw) return [...defaults];
    const saved = JSON.parse(raw);
    // saved may have fewer entries if columns were added; fall back per-column
    return defaults.map((def, i) => (typeof saved[i] === 'number' ? saved[i] : def));
  } catch {
    return [...defaults];
  }
}

function saveWidths(tableKey, widths) {
  try { localStorage.setItem(LS_KEY_PREFIX + tableKey, JSON.stringify(widths)); } catch {}
}

/**
 * Hook that gives each column a pixel width and exposes a mousedown handler
 * for a drag handle placed on the right edge of each <th>.
 *
 * @param {string}   tableKey  – unique key for localStorage persistence
 * @param {number[]} defaults  – default pixel widths, one per column
 * @param {number}   [minWidth=60] – minimum column width in px
 *
 * @returns {{ colWidths, getResizeHandler, resetWidths }}
 *   colWidths        – number[]  current widths
 *   getResizeHandler – (index) => (mousedownEvent) => void
 *   resetWidths      – () => void
 */
export function useResizableColumns(tableKey, defaults, minWidth = 60) {
  const [colWidths, setColWidths] = useState(() => loadWidths(tableKey, defaults));
  const dragging = useRef(false);

  const getResizeHandler = useCallback(
    (index) => (e) => {
      e.preventDefault();
      e.stopPropagation();

      dragging.current = true;
      const startX = e.clientX;
      const startWidth = colWidths[index];

      // Overlay to keep cursor consistent during drag
      const overlay = document.createElement('div');
      overlay.style.cssText =
        'position:fixed;inset:0;cursor:col-resize;z-index:9999;user-select:none';
      document.body.appendChild(overlay);

      function onMouseMove(ev) {
        const delta = ev.clientX - startX;
        const newWidth = Math.max(minWidth, startWidth + delta);
        setColWidths((prev) => {
          const next = [...prev];
          next[index] = newWidth;
          return next;
        });
      }

      function onMouseUp() {
        dragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.removeChild(overlay);
        // Persist after drag ends
        setColWidths((prev) => {
          saveWidths(tableKey, prev);
          return prev;
        });
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [colWidths, tableKey, minWidth]
  );

  const resetWidths = useCallback(() => {
    setColWidths([...defaults]);
    saveWidths(tableKey, defaults);
  }, [tableKey, defaults]); // eslint-disable-line react-hooks/exhaustive-deps

  return { colWidths, getResizeHandler, resetWidths };
}

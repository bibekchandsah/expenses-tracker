import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/* ── button style variants ──────────────────────────────────────── */
const V = {
  func: 'bg-[#A5A5A5] text-black active:bg-[#d4d4d4]',
  op:   'bg-[#FF9F0A] text-white active:bg-[#ffbd62]',
  num:  'bg-[#333333] text-white active:bg-[#4d4d4d]',
};

/* ── helper: format result ──────────────────────────────────────── */
function fmt(n) {
  if (!isFinite(n)) return 'Error';
  // avoid e notation for manageable numbers
  const s = parseFloat(n.toFixed(10)).toString();
  return s.length > 12 ? parseFloat(n.toPrecision(8)).toString() : s;
}

/* ═══════════════════════════════════════════════════════════════════
   Calculator
   ═══════════════════════════════════════════════════════════════════ */
export default function Calculator({ onClose }) {
  /* ── calc state ─────────────────────────────────────────────────── */
  const [display,            setDisplay]            = useState('0');
  const [prevValue,          setPrevValue]          = useState(null);
  const [operator,           setOperator]           = useState(null);
  const [waitingForOperand,  setWaitingForOperand]  = useState(false);
  const [justCalculated,     setJustCalculated]     = useState(false);
  // for equation sub-line display
  const [leftStr,            setLeftStr]            = useState('');
  const [equationStr,        setEquationStr]        = useState('');

  /* ── drag / resize state ────────────────────────────────────────── */
  const [pos,  setPos]  = useState({
    x: Math.max(0, window.innerWidth  / 2 - 160),
    y: Math.max(0, window.innerHeight / 2 - 250),
  });
  const [size, setSize] = useState({ w: 320, h: 500 });

  const dragInfo   = useRef(null);   // { offsetX, offsetY }
  const resizeInfo = useRef(null);   // { startX, startY, startW, startH }
  const calcRef    = useRef(null);

  /* ── calc logic (memoised so keyboard handler stays stable) ─────── */
  const inputDigit = useCallback((digit) => {
    setDisplay(prev => {
      if (waitingForOperand) { setWaitingForOperand(false); setJustCalculated(false); return String(digit); }
      if (justCalculated)    { setJustCalculated(false);    return String(digit); }
      return prev === '0' ? String(digit) : prev.length < 12 ? prev + digit : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForOperand, justCalculated]);

  const inputDot = useCallback(() => {
    setDisplay(prev => {
      if (waitingForOperand) { setWaitingForOperand(false); setJustCalculated(false); return '0.'; }
      if (prev.includes('.')) return prev;
      return prev + '.';
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForOperand]);

  const clearAll = useCallback(() => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setJustCalculated(false);
    setLeftStr('');
    setEquationStr('');
  }, []);

  const backspace = useCallback(() => {
    setDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  }, []);

  const toggleSign = useCallback(() => {
    setDisplay(prev => {
      const n = parseFloat(prev);
      return isNaN(n) ? prev : fmt(n * -1);
    });
  }, []);

  const toPercent = useCallback(() => {
    setDisplay(prev => {
      const n = parseFloat(prev);
      return isNaN(n) ? prev : fmt(n / 100);
    });
  }, []);

  // Returns numeric result of pending operation without side effects
  const runOp = useCallback((opSym, a, b) => {
    switch (opSym) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b === 0 ? Infinity : a / b;
      default:  return b;
    }
  }, []);

  const pressOperator = useCallback((op) => {
    const current = parseFloat(display);
    if (prevValue !== null && !waitingForOperand && !justCalculated) {
      const result = runOp(operator, prevValue, current);
      const s = fmt(result);
      setDisplay(s);
      setPrevValue(parseFloat(s));
      setLeftStr(s);
    } else {
      setPrevValue(current);
      setLeftStr(display);
    }
    setOperator(op);
    setWaitingForOperand(true);
    setJustCalculated(false);
    setEquationStr('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, prevValue, operator, waitingForOperand, justCalculated, runOp]);

  const calculate = useCallback(() => {
    if (operator === null || prevValue === null) return;
    const current = parseFloat(display);
    const result  = runOp(operator, prevValue, current);
    const s = fmt(result);
    setEquationStr(`${leftStr} ${operator} ${display} =`);
    setDisplay(s);
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setJustCalculated(true);
    setLeftStr('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, prevValue, operator, leftStr, runOp]);

  /* ── keyboard support ───────────────────────────────────────────── */
  useEffect(() => {
    function onKey(e) {
      // Only intercept when calculator is open; don't steal from other inputs
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;

      if (e.key >= '0' && e.key <= '9') { e.preventDefault(); inputDigit(e.key); }
      else if (e.key === '.')            { e.preventDefault(); inputDot(); }
      else if (e.key === '+')            { e.preventDefault(); pressOperator('+'); }
      else if (e.key === '-')            { e.preventDefault(); pressOperator('−'); }
      else if (e.key === '*')            { e.preventDefault(); pressOperator('×'); }
      else if (e.key === '/')            { e.preventDefault(); pressOperator('÷'); }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calculate(); }
      else if (e.key === 'Backspace')    { e.preventDefault(); backspace(); }
      else if (e.key === 'Escape')       { e.preventDefault(); clearAll(); }
      else if (e.key === '%')            { e.preventDefault(); toPercent(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inputDigit, inputDot, pressOperator, calculate, backspace, clearAll, toPercent]);

  /* ── drag ───────────────────────────────────────────────────────── */
  const onDragStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragInfo.current = { offsetX: e.clientX - pos.x, offsetY: e.clientY - pos.y };

    function onMove(ev) {
      if (!dragInfo.current) return;
      const newX = Math.min(Math.max(0, ev.clientX - dragInfo.current.offsetX), window.innerWidth  - (calcRef.current?.offsetWidth  ?? 320));
      const newY = Math.min(Math.max(0, ev.clientY - dragInfo.current.offsetY), window.innerHeight - (calcRef.current?.offsetHeight ?? 500));
      setPos({ x: newX, y: newY });
    }
    function onUp() {
      dragInfo.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  /* ── resize ─────────────────────────────────────────────────────── */
  const onResizeStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeInfo.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };

    function onMove(ev) {
      if (!resizeInfo.current) return;
      const dx = ev.clientX - resizeInfo.current.startX;
      const dy = ev.clientY - resizeInfo.current.startY;
      setSize({
        w: Math.min(Math.max(280, resizeInfo.current.startW + dx), 560),
        h: Math.min(Math.max(440, resizeInfo.current.startH + dy), 900),
      });
    }
    function onUp() {
      resizeInfo.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  /* ── derived ────────────────────────────────────────────────────── */
  const isAC     = display === '0' && !prevValue;
  const btnFontSize = size.w < 340 ? 'text-xl' : 'text-2xl';
  const dispFontSize = display.length > 9 ? 'text-3xl' : display.length > 6 ? 'text-4xl' : 'text-5xl';

  /* ── render ─────────────────────────────────────────────────────── */
  const calculator = (
    /* backdrop — click outside closes */
    <div
      className="fixed inset-0 z-[9998]"
      style={{ pointerEvents: 'none' }}
    >
      <div
        ref={calcRef}
        className="absolute select-none flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{
          left:   pos.x,
          top:    pos.y,
          width:  size.w,
          height: size.h,
          pointerEvents: 'auto',
          background: '#1c1c1e',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* ── drag handle ───────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onMouseDown={onDragStart}
        >
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest select-none">
            Calculator
          </span>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── display ───────────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col justify-end items-end px-6 pb-2 gap-1"
          onMouseDown={onDragStart}
          style={{ cursor: 'grab' }}
        >
          {/* sub-expression / equation */}
          <div className="text-gray-500 text-sm h-5 truncate w-full text-right">
            {justCalculated
              ? equationStr
              : prevValue !== null ? `${leftStr} ${operator ?? ''}` : ''}
          </div>
          {/* main display */}
          <div className={`text-white font-light w-full text-right leading-none ${dispFontSize} break-all`}>
            {display}
          </div>
        </div>

        {/* ── button grid ───────────────────────────────────────────── */}
        <div
          className="grid grid-cols-4 gap-2 px-3 pb-3"
          style={{ flex: '0 0 auto' }}
        >
          {/* Row 1 */}
          <CalcBtn label={isAC ? 'AC' : 'C'} variant={V.func} className={btnFontSize} onClick={clearAll} />
          <CalcBtn label="⌫"    variant={V.func} className={btnFontSize} onClick={backspace} />
          <CalcBtn label="%"    variant={V.func} className={btnFontSize} onClick={toPercent} />
          <CalcBtn label="÷"    variant={V.op}   className={btnFontSize} active={operator === '÷' && waitingForOperand}
                   onClick={() => pressOperator('÷')} />

          {/* Row 2 */}
          <CalcBtn label="7" variant={V.num} className={btnFontSize} onClick={() => inputDigit('7')} />
          <CalcBtn label="8" variant={V.num} className={btnFontSize} onClick={() => inputDigit('8')} />
          <CalcBtn label="9" variant={V.num} className={btnFontSize} onClick={() => inputDigit('9')} />
          <CalcBtn label="×" variant={V.op}  className={btnFontSize} active={operator === '×' && waitingForOperand}
                   onClick={() => pressOperator('×')} />

          {/* Row 3 */}
          <CalcBtn label="4" variant={V.num} className={btnFontSize} onClick={() => inputDigit('4')} />
          <CalcBtn label="5" variant={V.num} className={btnFontSize} onClick={() => inputDigit('5')} />
          <CalcBtn label="6" variant={V.num} className={btnFontSize} onClick={() => inputDigit('6')} />
          <CalcBtn label="−" variant={V.op}  className={btnFontSize} active={operator === '−' && waitingForOperand}
                   onClick={() => pressOperator('−')} />

          {/* Row 4 */}
          <CalcBtn label="1" variant={V.num} className={btnFontSize} onClick={() => inputDigit('1')} />
          <CalcBtn label="2" variant={V.num} className={btnFontSize} onClick={() => inputDigit('2')} />
          <CalcBtn label="3" variant={V.num} className={btnFontSize} onClick={() => inputDigit('3')} />
          <CalcBtn label="+" variant={V.op}  className={btnFontSize} active={operator === '+' && waitingForOperand}
                   onClick={() => pressOperator('+')} />

          {/* Row 5 */}
          <CalcBtn label="0" variant={V.num} className={`${btnFontSize} col-span-2 !justify-start !pl-6`}
                   onClick={() => inputDigit('0')} />
          <CalcBtn label="." variant={V.num} className={btnFontSize} onClick={inputDot} />
          <CalcBtn label="=" variant={V.op}  className={btnFontSize} onClick={calculate} />
        </div>

        {/* ── resize handle ─────────────────────────────────────────── */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10"
          onMouseDown={onResizeStart}
          style={{ pointerEvents: 'auto' }}
        >
          <svg viewBox="0 0 12 12" className="w-full h-full text-gray-600">
            <path d="M10 2 L10 10 L2 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M6 6 L10 6 L10 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );

  return createPortal(calculator, document.body);
}

/* ── reusable button ────────────────────────────────────────────── */
function CalcBtn({ label, variant, className = '', active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center rounded-full font-medium
        transition-all duration-75 select-none
        ${variant}
        ${active ? 'brightness-150' : ''}
        ${className}
      `}
      style={{ aspectRatio: label === '0' ? 'unset' : '1 / 1', minHeight: 64 }}
    >
      {label}
    </button>
  );
}

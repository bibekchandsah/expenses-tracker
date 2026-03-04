import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown } from 'lucide-react';

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
  /* ── calculator type ────────────────────────────────────────────── */
  const [calcType, setCalcType] = useState('basic'); // basic, discount, currency, loan, date
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const calcTypes = [
    { id: 'basic', label: 'Calculator' },
    { id: 'discount', label: 'Discount Calculator' },
    { id: 'currency', label: 'Currency Converter' },
    { id: 'loan', label: 'Loan/Investment Calculator' },
    { id: 'date', label: 'Date Calculator' },
  ];

  /* ── calc state ─────────────────────────────────────────────────── */
  const [display,            setDisplay]            = useState('0');
  const [prevValue,          setPrevValue]          = useState(null);
  const [operator,           setOperator]           = useState(null);
  const [waitingForOperand,  setWaitingForOperand]  = useState(false);
  const [justCalculated,     setJustCalculated]     = useState(false);
  // for equation sub-line display
  const [leftStr,            setLeftStr]            = useState('');
  const [equationStr,        setEquationStr]        = useState('');

  /* ── discount calculator state ──────────────────────────────────── */
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountResult, setDiscountResult] = useState(null);

  /* ── currency converter state ───────────────────────────────────── */
  const [fromAmount, setFromAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [exchangeRate, setExchangeRate] = useState('');
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateError, setRateError] = useState(null);

  /* ── loan calculator state ──────────────────────────────────────── */
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loanTermYears, setLoanTermYears] = useState('');
  const [loanTermMonths, setLoanTermMonths] = useState('');
  const [loanType, setLoanType] = useState('loan'); // loan or investment
  const [investmentType, setInvestmentType] = useState('onetime'); // onetime or recurring
  const [loanResult, setLoanResult] = useState(null);

  /* ── date calculator state ──────────────────────────────────────── */
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysToAdd, setDaysToAdd] = useState('');
  const [dateCalcMode, setDateCalcMode] = useState('difference'); // difference or add
  const [dateResult, setDateResult] = useState(null);

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

  /* ── discount calculator logic ──────────────────────────────────── */
  const calculateDiscount = useCallback(() => {
    const price = parseFloat(originalPrice);
    const discount = parseFloat(discountPercent);
    if (isNaN(price) || isNaN(discount)) return;
    
    const discountAmount = (price * discount) / 100;
    const finalPrice = price - discountAmount;
    const savings = discountAmount;
    
    setDiscountResult({
      original: price.toFixed(2),
      discount: discount.toFixed(2),
      savings: savings.toFixed(2),
      final: finalPrice.toFixed(2),
    });
  }, [originalPrice, discountPercent]);

  /* ── currency converter logic ───────────────────────────────────── */
  const fetchExchangeRate = useCallback(async () => {
    if (!fromCurrency || !toCurrency) return;
    
    setLoadingRate(true);
    setRateError(null);
    
    try {
      // Using exchangerate-api.com free tier (1500 requests/month)
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate');
      }
      
      const data = await response.json();
      const rate = data.rates[toCurrency];
      
      if (rate) {
        setExchangeRate(rate.toFixed(6));
        setRateError(null);
      } else {
        throw new Error('Currency not found');
      }
    } catch (error) {
      setRateError('Failed to fetch rate. Please enter manually.');
      console.error('Exchange rate fetch error:', error);
    } finally {
      setLoadingRate(false);
    }
  }, [fromCurrency, toCurrency]);

  const convertCurrency = useCallback(() => {
    const amount = parseFloat(fromAmount);
    const rate = parseFloat(exchangeRate);
    if (isNaN(amount) || isNaN(rate)) return;
    
    const result = amount * rate;
    setConvertedAmount(result.toFixed(2));
  }, [fromAmount, exchangeRate]);

  /* ── loan calculator logic ──────────────────────────────────────── */
  const calculateLoan = useCallback(() => {
    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate) / 100 / 12;
    const years = parseFloat(loanTermYears) || 0;
    const months = parseFloat(loanTermMonths) || 0;
    const totalMonths = years * 12 + months;
    
    if (isNaN(principal) || isNaN(rate) || totalMonths <= 0) return;
    
    if (loanType === 'loan') {
      const monthlyPayment = principal * (rate * Math.pow(1 + rate, totalMonths)) / (Math.pow(1 + rate, totalMonths) - 1);
      const totalPayment = monthlyPayment * totalMonths;
      const totalInterest = totalPayment - principal;
      
      setLoanResult({
        type: 'Loan',
        monthlyPayment: monthlyPayment.toFixed(2),
        totalPayment: totalPayment.toFixed(2),
        totalInterest: totalInterest.toFixed(2),
        principal: principal.toFixed(2),
      });
    } else {
      if (investmentType === 'onetime') {
        // One-time investment: A = P(1 + r)^n
        const futureValue = principal * Math.pow(1 + rate, totalMonths);
        const totalInterest = futureValue - principal;
        
        setLoanResult({
          type: 'Investment (One-time)',
          futureValue: futureValue.toFixed(2),
          totalInterest: totalInterest.toFixed(2),
          principal: principal.toFixed(2),
        });
      } else {
        // Recurring investment (Future Value of Annuity): FV = P × [((1 + r)^n - 1) / r]
        const futureValue = principal * ((Math.pow(1 + rate, totalMonths) - 1) / rate);
        const totalInvested = principal * totalMonths;
        const totalInterest = futureValue - totalInvested;
        
        setLoanResult({
          type: 'Investment (Recurring)',
          futureValue: futureValue.toFixed(2),
          totalInvested: totalInvested.toFixed(2),
          totalInterest: totalInterest.toFixed(2),
          monthlyInvestment: principal.toFixed(2),
        });
      }
    }
  }, [loanAmount, interestRate, loanTermYears, loanTermMonths, loanType, investmentType]);

  /* ── date calculator logic ──────────────────────────────────────── */
  const calculateDate = useCallback(() => {
    if (dateCalcMode === 'difference') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
      
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30.44);
      const diffYears = Math.floor(diffDays / 365.25);
      
      setDateResult({
        mode: 'difference',
        days: diffDays,
        weeks: diffWeeks,
        months: diffMonths,
        years: diffYears,
      });
    } else {
      const start = new Date(startDate);
      const days = parseInt(daysToAdd);
      if (isNaN(start.getTime()) || isNaN(days)) return;
      
      const result = new Date(start);
      result.setDate(result.getDate() + days);
      
      setDateResult({
        mode: 'add',
        resultDate: result.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
      });
    }
  }, [startDate, endDate, daysToAdd, dateCalcMode]);

  /* ── close dropdown on outside click ────────────────────────────── */
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  /* ── keyboard support ───────────────────────────────────────────── */
  useEffect(() => {
    if (calcType !== 'basic') return;
    
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
  }, [calcType, inputDigit, inputDot, pressOperator, calculate, backspace, clearAll, toPercent]);

  /* ── drag ───────────────────────────────────────────────────────── */
  const onDragStart = useCallback((e) => {
    if (e.type === 'mousedown' && e.button !== 0) return;
    e.preventDefault();
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    dragInfo.current = { offsetX: clientX - pos.x, offsetY: clientY - pos.y };

    function onMove(ev) {
      if (!dragInfo.current) return;
      const moveX = ev.type === 'touchmove' ? ev.touches[0].clientX : ev.clientX;
      const moveY = ev.type === 'touchmove' ? ev.touches[0].clientY : ev.clientY;
      const newX = Math.min(Math.max(0, moveX - dragInfo.current.offsetX), window.innerWidth  - (calcRef.current?.offsetWidth  ?? 320));
      const newY = Math.min(Math.max(0, moveY - dragInfo.current.offsetY), window.innerHeight - (calcRef.current?.offsetHeight ?? 500));
      setPos({ x: newX, y: newY });
    }
    function onUp() {
      dragInfo.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend',  onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend',  onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  /* ── resize ─────────────────────────────────────────────────────── */
  const onResizeStart = useCallback((e) => {
    if (e.type === 'mousedown' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    resizeInfo.current = { startX: clientX, startY: clientY, startW: size.w, startH: size.h };

    function onMove(ev) {
      if (!resizeInfo.current) return;
      const moveX = ev.type === 'touchmove' ? ev.touches[0].clientX : ev.clientX;
      const moveY = ev.type === 'touchmove' ? ev.touches[0].clientY : ev.clientY;
      const dx = moveX - resizeInfo.current.startX;
      const dy = moveY - resizeInfo.current.startY;
      setSize({
        w: Math.min(Math.max(280, resizeInfo.current.startW + dx), 560),
        h: Math.min(Math.max(440, resizeInfo.current.startH + dy), 900),
      });
    }
    function onUp() {
      resizeInfo.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend',  onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend',  onUp);
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
          onTouchStart={onDragStart}
        >
          <div className="relative" ref={dropdownRef}>
            <button
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-widest select-none transition-colors"
            >
              {calcTypes.find(c => c.id === calcType)?.label || 'Calculator'}
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showDropdown && (
              <div className="absolute left-0 top-full mt-1 bg-[#2c2c2e] rounded-lg shadow-xl border border-white/10 py-1 min-w-[200px] z-50">
                {calcTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setCalcType(type.id);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      calcType === type.id
                        ? 'bg-[#FF9F0A] text-white'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── content area ──────────────────────────────────────────── */}
        {calcType === 'basic' ? (
          <>
            {/* ── display ───────────────────────────────────────────────── */}
            <div
              className="flex-1 flex flex-col justify-end items-end px-6 pb-2 gap-1"
              onMouseDown={onDragStart}
              onTouchStart={onDragStart}
              style={{ cursor: 'grab' }}
            >
              <div className="text-gray-500 text-sm h-5 truncate w-full text-right">
                {justCalculated
                  ? equationStr
                  : prevValue !== null ? `${leftStr} ${operator ?? ''}` : ''}
              </div>
              <div className={`text-white font-light w-full text-right leading-none ${dispFontSize} break-all`}>
                {display}
              </div>
            </div>

            {/* ── button grid ───────────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-2 px-3 pb-3" style={{ flex: '0 0 auto' }}>
              <CalcBtn label={isAC ? 'AC' : 'C'} variant={V.func} className={btnFontSize} onClick={clearAll} />
              <CalcBtn label="⌫" variant={V.func} className={btnFontSize} onClick={backspace} />
              <CalcBtn label="%" variant={V.func} className={btnFontSize} onClick={toPercent} />
              <CalcBtn label="÷" variant={V.op} className={btnFontSize} active={operator === '÷' && waitingForOperand}
                       onClick={() => pressOperator('÷')} />

              <CalcBtn label="7" variant={V.num} className={btnFontSize} onClick={() => inputDigit('7')} />
              <CalcBtn label="8" variant={V.num} className={btnFontSize} onClick={() => inputDigit('8')} />
              <CalcBtn label="9" variant={V.num} className={btnFontSize} onClick={() => inputDigit('9')} />
              <CalcBtn label="×" variant={V.op} className={btnFontSize} active={operator === '×' && waitingForOperand}
                       onClick={() => pressOperator('×')} />

              <CalcBtn label="4" variant={V.num} className={btnFontSize} onClick={() => inputDigit('4')} />
              <CalcBtn label="5" variant={V.num} className={btnFontSize} onClick={() => inputDigit('5')} />
              <CalcBtn label="6" variant={V.num} className={btnFontSize} onClick={() => inputDigit('6')} />
              <CalcBtn label="−" variant={V.op} className={btnFontSize} active={operator === '−' && waitingForOperand}
                       onClick={() => pressOperator('−')} />

              <CalcBtn label="1" variant={V.num} className={btnFontSize} onClick={() => inputDigit('1')} />
              <CalcBtn label="2" variant={V.num} className={btnFontSize} onClick={() => inputDigit('2')} />
              <CalcBtn label="3" variant={V.num} className={btnFontSize} onClick={() => inputDigit('3')} />
              <CalcBtn label="+" variant={V.op} className={btnFontSize} active={operator === '+' && waitingForOperand}
                       onClick={() => pressOperator('+')} />

              <CalcBtn label="0" variant={V.num} className={`${btnFontSize} col-span-2 !justify-start !pl-6`}
                       onClick={() => inputDigit('0')} />
              <CalcBtn label="." variant={V.num} className={btnFontSize} onClick={inputDot} />
              <CalcBtn label="=" variant={V.op} className={btnFontSize} onClick={calculate} />
            </div>
          </>
        ) : calcType === 'discount' ? (
          <DiscountCalculator
            originalPrice={originalPrice}
            setOriginalPrice={setOriginalPrice}
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            discountResult={discountResult}
            calculateDiscount={calculateDiscount}
          />
        ) : calcType === 'currency' ? (
          <CurrencyConverter
            fromAmount={fromAmount}
            setFromAmount={setFromAmount}
            fromCurrency={fromCurrency}
            setFromCurrency={setFromCurrency}
            toCurrency={toCurrency}
            setToCurrency={setToCurrency}
            exchangeRate={exchangeRate}
            setExchangeRate={setExchangeRate}
            convertedAmount={convertedAmount}
            convertCurrency={convertCurrency}
            fetchExchangeRate={fetchExchangeRate}
            loadingRate={loadingRate}
            rateError={rateError}
          />
        ) : calcType === 'loan' ? (
          <LoanCalculator
            loanAmount={loanAmount}
            setLoanAmount={setLoanAmount}
            interestRate={interestRate}
            setInterestRate={setInterestRate}
            loanTermYears={loanTermYears}
            setLoanTermYears={setLoanTermYears}
            loanTermMonths={loanTermMonths}
            setLoanTermMonths={setLoanTermMonths}
            loanType={loanType}
            setLoanType={setLoanType}
            investmentType={investmentType}
            setInvestmentType={setInvestmentType}
            loanResult={loanResult}
            calculateLoan={calculateLoan}
          />
        ) : calcType === 'date' ? (
          <DateCalculator
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            daysToAdd={daysToAdd}
            setDaysToAdd={setDaysToAdd}
            dateCalcMode={dateCalcMode}
            setDateCalcMode={setDateCalcMode}
            dateResult={dateResult}
            calculateDate={calculateDate}
          />
        ) : null}

        {/* ── resize handle ─────────────────────────────────────────── */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10"
          onMouseDown={onResizeStart}
          onTouchStart={onResizeStart}
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

/* ═══════════════════════════════════════════════════════════════════
   Discount Calculator
   ═══════════════════════════════════════════════════════════════════ */
function DiscountCalculator({ originalPrice, setOriginalPrice, discountPercent, setDiscountPercent, discountResult, calculateDiscount }) {
  return (
    <div className="flex-1 flex flex-col px-6 py-4 gap-4 overflow-y-auto">
      <InputField label="Original Price" value={originalPrice} onChange={setOriginalPrice} placeholder="100.00" />
      <InputField label="Discount %" value={discountPercent} onChange={setDiscountPercent} placeholder="20" />
      
      <button
        onClick={calculateDiscount}
        className="bg-[#FF9F0A] text-white py-3 rounded-lg font-semibold hover:bg-[#ffbd62] transition-colors"
      >
        Calculate
      </button>

      {discountResult && (
        <div className="bg-[#2c2c2e] rounded-lg p-4 space-y-2">
          <ResultRow label="Original Price" value={`$${discountResult.original}`} />
          <ResultRow label="Discount" value={`${discountResult.discount}%`} />
          <ResultRow label="You Save" value={`$${discountResult.savings}`} highlight />
          <ResultRow label="Final Price" value={`$${discountResult.final}`} highlight />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Currency Converter
   ═══════════════════════════════════════════════════════════════════ */
function CurrencyConverter({ fromAmount, setFromAmount, fromCurrency, setFromCurrency, toCurrency, setToCurrency, exchangeRate, setExchangeRate, convertedAmount, convertCurrency, fetchExchangeRate, loadingRate, rateError }) {
  const currencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR', 'THB', 'IDR', 'NPR', 
    'AFN', 'ALL', 'DZD', 'AOA', 'ARS', 'AMD', 'AUD', 'AZN', 'BSD', 'BHD', 
    'BDT', 'BBD', 'BYN', 'BZD', 'BMD', 'BTN', 'BOB', 'BAM', 'BWP', 'BRL', 
    'BND', 'BGN', 'BIF', 'KHR', 'CAD', 'CVE', 'XAF', 'CLP', 'CNY', 'COP',
    'KMF', 'CDF', 'CRC', 'HRK', 'CUP', 'CZK', 'DKK', 'DJF', 'DOP', 'XCD', 
    'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'GMD', 'GEL', 'GHS', 'GTQ', 'GNF',
    'HTG', 'HNL', 'HUF', 'ISK', 'INR', 'IDR', 'IRR', 'IQD', 'ILS', 'JMD', 
    'JPY', 'JOD', 'KZT', 'KES', 'KWD', 'KGS', 'LAK', 'LBP', 'LSL', 'LRD', 
    'LYD', 'MGA', 'MWK', 'MYR', 'MVR', 'MRU', 'MUR', 'MXN', 'MDL', 'MNT', 
    'MAD', 'MZN', 'MMK',
    'NAD', 'NPR', 'NZD', 'NIO', 'NGN', 'KPW', 'NOK', 'OMR', 'PKR', 'PAB', 
    'PGK', 'PYG', 'PEN', 'PHP', 'PLN', 'QAR', 'RON', 'RUB', 'RWF', 'SAR', 
    'RSD', 'SCR', 'SLE', 'SGD', 'SBD', 'SOS', 'ZAR', 'KRW', 'SSP', 'LKR', 
    'SDG', 'SRD', 'SEK', 'CHF', 'SYP', 'TWD', 'TJS', 'TZS', 'THB', 'TOP', 
    'TTD', 'TND', 'TRY', 'TMT', 'UGX', 'UAH', 'AED', 'USD', 'UYU', 'UZS', 
    'VES', 'VND', 'YER', 'ZMW', 'ZWL'
  ];

  return (
    <div className="flex-1 flex flex-col px-6 py-4 gap-4 overflow-y-auto">
      <InputField label="Amount" value={fromAmount} onChange={setFromAmount} placeholder="100" />
      
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="From" value={fromCurrency} onChange={setFromCurrency} options={currencies} />
        <SelectField label="To" value={toCurrency} onChange={setToCurrency} options={currencies} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-gray-400 text-sm">Exchange Rate</label>
          <button
            onClick={fetchExchangeRate}
            disabled={loadingRate}
            className="text-xs text-[#FF9F0A] hover:text-[#ffbd62] disabled:text-gray-500 transition-colors"
          >
            {loadingRate ? 'Fetching...' : 'Get Rate'}
          </button>
        </div>
        <input
          type="text"
          value={exchangeRate}
          onChange={(e) => setExchangeRate(e.target.value)}
          placeholder="Auto-fetch or enter manually"
          className="w-full bg-[#333333] text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9F0A]"
        />
        {rateError && (
          <p className="text-red-400 text-xs mt-1">{rateError}</p>
        )}
        {exchangeRate && !rateError && (
          <p className="text-gray-500 text-xs mt-1">
            1 {fromCurrency} = {exchangeRate} {toCurrency}
          </p>
        )}
      </div>
      
      <button
        onClick={convertCurrency}
        className="bg-[#FF9F0A] text-white py-3 rounded-lg font-semibold hover:bg-[#ffbd62] transition-colors"
      >
        Convert
      </button>

      {convertedAmount && (
        <div className="bg-[#2c2c2e] rounded-lg p-4">
          <ResultRow label="Converted Amount" value={`${convertedAmount} ${toCurrency}`} highlight />
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-gray-400 text-xs text-center">
              {fromAmount} {fromCurrency} = {convertedAmount} {toCurrency}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Loan Calculator
   ═══════════════════════════════════════════════════════════════════ */
function LoanCalculator({ loanAmount, setLoanAmount, interestRate, setInterestRate, loanTermYears, setLoanTermYears, loanTermMonths, setLoanTermMonths, loanType, setLoanType, investmentType, setInvestmentType, loanResult, calculateLoan }) {
  return (
    <div className="flex-1 flex flex-col px-6 py-4 gap-4 overflow-y-auto">
      <div className="flex gap-2">
        <button
          onClick={() => setLoanType('loan')}
          className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
            loanType === 'loan' ? 'bg-[#FF9F0A] text-white' : 'bg-[#333333] text-gray-400'
          }`}
        >
          Loan
        </button>
        <button
          onClick={() => setLoanType('investment')}
          className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
            loanType === 'investment' ? 'bg-[#FF9F0A] text-white' : 'bg-[#333333] text-gray-400'
          }`}
        >
          Investment
        </button>
      </div>

      {loanType === 'investment' && (
        <div className="flex gap-2">
          <button
            onClick={() => setInvestmentType('onetime')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              investmentType === 'onetime' ? 'bg-[#4CAF50] text-white' : 'bg-[#333333] text-gray-400'
            }`}
          >
            One-time
          </button>
          <button
            onClick={() => setInvestmentType('recurring')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              investmentType === 'recurring' ? 'bg-[#4CAF50] text-white' : 'bg-[#333333] text-gray-400'
            }`}
          >
            Recurring
          </button>
        </div>
      )}

      <InputField 
        label={loanType === 'loan' ? 'Principal Amount' : investmentType === 'recurring' ? 'Monthly Investment' : 'Initial Investment'} 
        value={loanAmount} 
        onChange={setLoanAmount} 
        placeholder="10000" 
      />
      <InputField label="Interest Rate (% per year)" value={interestRate} onChange={setInterestRate} placeholder="5" />
      
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Years" value={loanTermYears} onChange={setLoanTermYears} placeholder="5" />
        <InputField label="Months" value={loanTermMonths} onChange={setLoanTermMonths} placeholder="6" />
      </div>
      
      <button
        onClick={calculateLoan}
        className="bg-[#FF9F0A] text-white py-3 rounded-lg font-semibold hover:bg-[#ffbd62] transition-colors"
      >
        Calculate
      </button>

      {loanResult && (
        <div className="bg-[#2c2c2e] rounded-lg p-4 space-y-2">
          {loanResult.type === 'Loan' ? (
            <>
              <ResultRow label="Principal" value={`$${loanResult.principal}`} />
              <ResultRow label="Monthly Payment" value={`$${loanResult.monthlyPayment}`} highlight />
              <ResultRow label="Total Payment" value={`$${loanResult.totalPayment}`} />
              <ResultRow label="Total Interest" value={`$${loanResult.totalInterest}`} />
            </>
          ) : loanResult.type === 'Investment (One-time)' ? (
            <>
              <ResultRow label="Initial Investment" value={`$${loanResult.principal}`} />
              <ResultRow label="Future Value" value={`$${loanResult.futureValue}`} highlight />
              <ResultRow label="Total Interest" value={`$${loanResult.totalInterest}`} />
            </>
          ) : (
            <>
              <ResultRow label="Monthly Investment" value={`$${loanResult.monthlyInvestment}`} />
              <ResultRow label="Total Invested" value={`$${loanResult.totalInvested}`} />
              <ResultRow label="Future Value" value={`$${loanResult.futureValue}`} highlight />
              <ResultRow label="Total Interest" value={`$${loanResult.totalInterest}`} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Date Calculator
   ═══════════════════════════════════════════════════════════════════ */
function DateCalculator({ startDate, setStartDate, endDate, setEndDate, daysToAdd, setDaysToAdd, dateCalcMode, setDateCalcMode, dateResult, calculateDate }) {
  return (
    <div className="flex-1 flex flex-col px-6 py-4 gap-4 overflow-y-auto">
      <div className="flex gap-2">
        <button
          onClick={() => setDateCalcMode('difference')}
          className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
            dateCalcMode === 'difference' ? 'bg-[#FF9F0A] text-white' : 'bg-[#333333] text-gray-400'
          }`}
        >
          Difference
        </button>
        <button
          onClick={() => setDateCalcMode('add')}
          className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
            dateCalcMode === 'add' ? 'bg-[#FF9F0A] text-white' : 'bg-[#333333] text-gray-400'
          }`}
        >
          Add Days
        </button>
      </div>

      {dateCalcMode === 'difference' ? (
        <>
          <DateField label="Start Date" value={startDate} onChange={setStartDate} />
          <DateField label="End Date" value={endDate} onChange={setEndDate} />
        </>
      ) : (
        <>
          <DateField label="Start Date" value={startDate} onChange={setStartDate} />
          <InputField label="Days to Add" value={daysToAdd} onChange={setDaysToAdd} placeholder="30" />
        </>
      )}
      
      <button
        onClick={calculateDate}
        className="bg-[#FF9F0A] text-white py-3 rounded-lg font-semibold hover:bg-[#ffbd62] transition-colors"
      >
        Calculate
      </button>

      {dateResult && (
        <div className="bg-[#2c2c2e] rounded-lg p-4 space-y-2">
          {dateResult.mode === 'difference' ? (
            <>
              <ResultRow label="Days" value={dateResult.days} highlight />
              <ResultRow label="Weeks" value={dateResult.weeks} />
              <ResultRow label="Months" value={dateResult.months} />
              <ResultRow label="Years" value={dateResult.years} />
            </>
          ) : (
            <ResultRow label="Result Date" value={dateResult.resultDate} highlight />
          )}
        </div>
      )}
    </div>
  );
}

/* ── helper components ──────────────────────────────────────────── */
function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-gray-400 text-sm mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#333333] text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9F0A]"
      />
    </div>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-gray-400 text-sm mb-1 block">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#333333] text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9F0A]"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-gray-400 text-sm mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#333333] text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9F0A]"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function ResultRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-[#FF9F0A] text-lg' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
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

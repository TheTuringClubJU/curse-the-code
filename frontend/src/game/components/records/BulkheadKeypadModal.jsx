import React, { useState, useRef, useEffect } from 'react';

export default function BulkheadKeypadModal({
  isOpen,
  onClose,
  clue,
  onSubmitAnswer,
  isSubmitting,
  audio,
  onBulkheadUnlocked
}) {
  if (!isOpen || !clue) return null;

  const [panelCode, setPanelCode] = useState('');
  const [keyword, setKeyword] = useState('');
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [activeField, setActiveField] = useState('panel'); // 'panel' or 'word'
  const [inputMode, setInputMode] = useState('numeric'); // 'numeric' or 'alpha'
  const keywordInputRef = useRef(null);

  const attemptsLeft = Math.max(0, (clue.attempts_max || 3) - (clue.attempts || 0));
  const isSolved = Boolean(clue.solved);

  // Auto-switch keypad deck when active field changes
  useEffect(() => {
    if (activeField === 'word') {
      setInputMode('alpha');
      setTimeout(() => keywordInputRef.current?.focus(), 50);
    } else {
      setInputMode('numeric');
    }
  }, [activeField]);

  // Global physical keyboard listener for fluid interaction
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSubmitting || isSolved || attemptsLeft <= 0) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (panelCode && keyword) handleSubmit();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setActiveField((prev) => (prev === 'panel' ? 'word' : 'panel'));
        return;
      }
      if (activeField === 'panel') {
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          handleKeypadPress(e.key);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handleBackspace();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeField, panelCode, keyword, isSubmitting, isSolved, attemptsLeft]);

  const handleKeypadPress = (val) => {
    audio?.click?.();
    if (activeField === 'panel') {
      if (panelCode.length < 8) {
        setPanelCode((prev) => prev + val);
      }
    } else {
      if (keyword.length < 10) {
        setKeyword((prev) => prev + val.toUpperCase());
      }
    }
  };

  const handleClear = () => {
    audio?.click?.();
    if (activeField === 'panel') setPanelCode('');
    else setKeyword('');
  };

  const handleBackspace = () => {
    audio?.click?.();
    if (activeField === 'panel') setPanelCode((prev) => prev.slice(0, -1));
    else setKeyword((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting || isSolved || attemptsLeft <= 0 || !panelCode || !keyword) return;

    const res = await onSubmitAnswer(clue.id, {
      panel: panelCode.trim(),
      word: keyword.trim().toUpperCase()
    });

    if (res?.correct) {
      audio?.good?.();
      setSubmitFeedback({ ok: true, msg: 'ACCESS AUTHORIZED // HYDRAULIC LOCKS DISENGAGING...' });
      onBulkheadUnlocked?.();
    } else {
      audio?.bad?.();
      setSubmitFeedback({ ok: false, msg: res?.message || 'AUTHORIZATION FAILED: INVALID COMBINATION.' });
    }
  };

  const alphaRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none font-mono">
      {/* Heavy Industrial Metal Cabinet Shell */}
      <div className="relative w-full max-w-xl flex flex-col bg-[#12100d] border-2 border-[#b38600] shadow-[0_0_60px_rgba(179,134,0,0.35)] rounded-2xl overflow-hidden text-[#e4ebf0]">
        
        {/* Riveted Industrial Header with Caution Accents */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1c1710] border-b border-[#b38600]/40 relative overflow-hidden">
          {/* Subtle Industrial Hazard Stripe Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#b38600,#b38600_10px,#12100d_10px,#12100d_20px)] opacity-60" />

          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${isSolved ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'bg-[#ffaa00] shadow-[0_0_10px_#ffaa00]'} animate-pulse`} />
            <div>
              <h2 className="text-xs font-bold tracking-widest text-[#ffd68a] uppercase flex items-center gap-2">
                <span>SECTOR 04 // BULKHEAD ACCESS KEYPAD TERMINAL</span>
              </h2>
              <span className="text-[9px] text-[#8a7651] tracking-wider block">
                FACILITY LOCKOUT OVERRIDE CONTROLLER • REV 4.2
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {/* LED Attempts Dots */}
            <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded border border-[#52442c]">
              <span className="text-[10px] text-[#a09075] uppercase">ATTEMPTS:</span>
              <span className={attemptsLeft === 1 ? 'text-red-400 font-bold' : 'text-[#ffd68a] font-bold'}>
                {attemptsLeft}/{clue.attempts_max || 3}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-[#a09075] hover:text-white border border-[#52442c] hover:border-[#ffd68a] px-2 py-0.5 rounded transition text-xs"
            >
              [ESC] EXIT
            </button>
          </div>
        </div>

        {/* Main Terminal Bay */}
        <div className="p-6 sm:p-8 bg-[#0a0907] flex flex-col items-center space-y-6">
          
          {/* Dual Segment Amber CRT Display Screens */}
          <div className="w-full space-y-3">
            
            {/* Field 1: Panel Code Display */}
            <div
              onClick={() => setActiveField('panel')}
              className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                activeField === 'panel'
                  ? 'bg-black border-[#ffaa00] shadow-[0_0_20px_rgba(255,170,0,0.25)]'
                  : 'bg-[#0f0d0a] border-[#382d18] opacity-75 hover:opacity-100 hover:border-[#6e582e]'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] text-[#8a7651] mb-1 font-bold">
                <span className="tracking-wider">INPUT 1: SUBSYSTEM PANEL CODE</span>
                {activeField === 'panel' ? (
                  <span className="text-[#ffaa00] text-[9px] font-bold px-1.5 py-0.2 bg-[#332200] border border-[#ffaa00]/40 rounded animate-pulse">
                    ● ACTIVE
                  </span>
                ) : (
                  <span className="text-zinc-600 text-[9px]">STANDBY</span>
                )}
              </div>
              
              <div className="h-9 flex items-center px-1 font-mono text-2xl tracking-[0.25em] text-[#ffaa00] font-bold text-shadow-[0_0_10px_rgba(255,170,0,0.4)]">
                {panelCode ? (
                  <span>{panelCode}</span>
                ) : (
                  <span className="text-[#59421b] select-none">____</span>
                )}
                {activeField === 'panel' && (
                  <span className="inline-block w-2.5 h-6 bg-[#ffaa00] ml-1 animate-pulse" />
                )}
              </div>
            </div>

            {/* Field 2: Keyword Display */}
            <div
              onClick={() => {
                setActiveField('word');
                keywordInputRef.current?.focus();
              }}
              className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                activeField === 'word'
                  ? 'bg-black border-[#ffaa00] shadow-[0_0_20px_rgba(255,170,0,0.25)]'
                  : 'bg-[#0f0d0a] border-[#382d18] opacity-75 hover:opacity-100 hover:border-[#6e582e]'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] text-[#8a7651] mb-1 font-bold">
                <span className="tracking-wider">INPUT 2: ARCHIVAL TIMELINE KEYWORD</span>
                {activeField === 'word' ? (
                  <span className="text-[#ffaa00] text-[9px] font-bold px-1.5 py-0.2 bg-[#332200] border border-[#ffaa00]/40 rounded animate-pulse">
                    ● ACTIVE
                  </span>
                ) : (
                  <span className="text-zinc-600 text-[9px]">STANDBY</span>
                )}
              </div>

              <div className="h-9 flex items-center px-1 font-mono text-2xl tracking-[0.25em] text-[#ffaa00] font-bold text-shadow-[0_0_10px_rgba(255,170,0,0.4)]">
                <input
                  ref={keywordInputRef}
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value.toUpperCase())}
                  placeholder="______"
                  maxLength={10}
                  className="bg-transparent border-0 p-0 text-[#ffaa00] placeholder:text-[#59421b] uppercase outline-none focus:outline-none focus:ring-0 w-full font-mono text-2xl tracking-[0.25em] font-bold"
                  style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  disabled={isSubmitting || isSolved}
                />
              </div>
            </div>
          </div>

          {/* Mode Switcher Deck Tabs */}
          <div className="flex items-center gap-2 w-full max-w-sm justify-between px-1 text-[10px]">
            <span className="text-[#8a7651] uppercase font-bold tracking-wider">INPUT DECK:</span>
            <div className="flex items-center gap-1.5 bg-black/80 p-1 rounded-lg border border-[#3d321d]">
              <button
                type="button"
                onClick={() => setInputMode('numeric')}
                className={`px-3 py-1 rounded transition font-bold tracking-wider ${
                  inputMode === 'numeric'
                    ? 'bg-[#3d2a09] text-[#ffd68a] border border-[#ffaa00]/50'
                    : 'text-[#8a7651] hover:text-[#ffd68a]'
                }`}
              >
                123 NUMERIC
              </button>
              <button
                type="button"
                onClick={() => setInputMode('alpha')}
                className={`px-3 py-1 rounded transition font-bold tracking-wider ${
                  inputMode === 'alpha'
                    ? 'bg-[#3d2a09] text-[#ffd68a] border border-[#ffaa00]/50'
                    : 'text-[#8a7651] hover:text-[#ffd68a]'
                }`}
              >
                ABC ALPHABETIC
              </button>
            </div>
          </div>

          {/* Dynamic Mechanical Input Deck */}
          {inputMode === 'numeric' ? (
            /* Mechanical Number Keypad (3x4 Grid) */
            <div className="w-full max-w-xs grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  disabled={isSubmitting || isSolved || attemptsLeft <= 0}
                  className="h-12 bg-gradient-to-b from-[#241f17] to-[#17140e] hover:from-[#332b1f] hover:to-[#211c14] active:translate-y-0.5 border border-[#52442c] hover:border-[#b38600] text-lg font-bold text-[#f3ead0] rounded-xl transition disabled:opacity-30 shadow-[0_3px_0_#0d0b07,inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center justify-center cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-12 bg-gradient-to-b from-[#331515] to-[#200c0c] hover:from-[#451c1c] hover:to-[#2b1010] active:translate-y-0.5 border border-red-900/80 hover:border-red-600 text-xs font-bold text-red-300 rounded-xl transition shadow-[0_3px_0_#120505] flex items-center justify-center cursor-pointer"
              >
                CLR
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                disabled={isSubmitting || isSolved || attemptsLeft <= 0}
                className="h-12 bg-gradient-to-b from-[#241f17] to-[#17140e] hover:from-[#332b1f] hover:to-[#211c14] active:translate-y-0.5 border border-[#52442c] hover:border-[#b38600] text-lg font-bold text-[#f3ead0] rounded-xl transition disabled:opacity-30 shadow-[0_3px_0_#0d0b07,inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center justify-center cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={isSubmitting || isSolved || attemptsLeft <= 0}
                className="h-12 bg-gradient-to-b from-[#2c2317] to-[#1c160e] hover:from-[#3a2f1f] hover:to-[#261f14] active:translate-y-0.5 border border-[#6b5837] hover:border-[#ffd68a] text-xs font-bold text-[#ffd68a] rounded-xl transition shadow-[0_3px_0_#0d0b07] flex items-center justify-center cursor-pointer"
              >
                DEL
              </button>
            </div>
          ) : (
            /* Mechanical Alpha Deck */
            <div className="w-full max-w-md space-y-2">
              {alphaRows.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center gap-1.5">
                  {rIdx === 2 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 h-10 bg-gradient-to-b from-[#331515] to-[#200c0c] hover:from-[#451c1c] hover:to-[#2b1010] active:translate-y-0.5 border border-red-900/80 text-[10px] font-bold text-red-300 rounded-lg transition shadow-[0_2px_0_#120505]"
                    >
                      CLR
                    </button>
                  )}
                  {row.map((char) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => handleKeypadPress(char)}
                      disabled={isSubmitting || isSolved || attemptsLeft <= 0}
                      className="w-8 sm:w-9 h-10 bg-gradient-to-b from-[#241f17] to-[#17140e] hover:from-[#332b1f] hover:to-[#211c14] active:translate-y-0.5 border border-[#52442c] hover:border-[#b38600] text-sm font-bold text-[#f3ead0] rounded-lg transition shadow-[0_2px_0_#0d0b07] flex items-center justify-center"
                    >
                      {char}
                    </button>
                  ))}
                  {rIdx === 2 && (
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="px-3 h-10 bg-gradient-to-b from-[#2c2317] to-[#1c160e] hover:from-[#3a2f1f] hover:to-[#261f14] active:translate-y-0.5 border border-[#6b5837] hover:border-[#ffd68a] text-[10px] font-bold text-[#ffd68a] rounded-lg transition shadow-[0_2px_0_#0d0b07]"
                    >
                      DEL
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Heavy-Duty Industrial Hydraulic Execution Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isSolved || attemptsLeft <= 0 || !panelCode || !keyword}
            className={`w-full max-w-xs h-12 rounded-xl font-bold text-xs sm:text-sm tracking-[0.2em] transition-all flex items-center justify-center cursor-pointer shadow-lg active:translate-y-0.5 ${
              isSubmitting || isSolved || attemptsLeft <= 0 || !panelCode || !keyword
                ? 'bg-[#2a2419] text-[#736348] border border-[#403522] cursor-not-allowed opacity-50 shadow-none'
                : 'bg-gradient-to-r from-[#d99b00] via-[#ffb700] to-[#b38000] text-black font-extrabold border border-[#ffe082] shadow-[0_4px_20px_rgba(255,183,0,0.35)] hover:brightness-110'
            }`}
          >
            {isSubmitting ? 'VERIFYING CREDENTIALS...' : 'ENTER'}
          </button>
        </div>

        {/* Industrial Status Footnote / Result Tray */}
        <div className="p-4 bg-[#14120e] border-t border-[#b38600]/30 text-center min-h-[50px] flex items-center justify-center">
          {isSolved ? (
            <div className="w-full p-2.5 bg-emerald-950/80 border border-emerald-500 rounded-lg text-xs font-bold text-emerald-300 animate-pulse tracking-wider">
              ✓ BULKHEAD UNLOCKED // AIRLOCK CHAMBER ACCESSIBLE
            </div>
          ) : attemptsLeft <= 0 ? (
            <div className="w-full p-2.5 bg-red-950/80 border border-red-500 rounded-lg text-xs font-bold text-red-300 tracking-wider">
              SECURITY LOCKOUT: MAXIMUM ATTEMPTS EXCEEDED (3/3).
            </div>
          ) : (
            submitFeedback && (
              <div className={`text-xs font-bold tracking-wider ${submitFeedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {submitFeedback.msg}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Transmission data ────────────────────────────────────────────────────────
const TRANSMISSIONS = [
  {
    id: 'TX-1',
    date: '1983-08-20 23:10',
    freq: '7.420 MHz',
    duration: '0:08',
    classification: 'SIGNAL / UNCLASSIFIED',
    body: '[GARBLED — STATIC NOISE — NO INTELLIGIBLE CONTENT]\n[END OF RECORD]',
    authentic: false,
  },
  {
    id: 'TX-2',
    date: '1983-08-21 09:15',
    freq: '3.100 MHz',
    duration: '1:24',
    classification: 'INTERNAL / SHIFT CHANGE',
    body: 'STANDARD HANDOVER. NO ANOMALIES LOGGED.\nALL SYSTEMS NOMINAL. GENERATOR FUEL AT 61%.\nRELIEF OPERATOR: PENDING CONFIRMATION.\n[END OF RECORD]',
    authentic: false,
  },
  {
    id: 'TX-3',
    date: '1983-08-21 23:41',
    freq: '7.420 MHz',
    duration: '4:17',
    classification: 'PRIORITY / POST-SHUTDOWN ACTIVE',
    from: 'BDG-9001 / DELTA-CONTROL',
    body: 'Protocol deviation confirmed.\nVM-A contains the operational record.\nVoicemail archive VM-A is the authenticated source.\nDo not access VM-B.\nThis transmission is filed as evidence of continued activity\nafter facility shutdown date 1983-08-14.\n[SIGNAL STRENGTH: 9 — AUTHENTICATED]\n[END OF RECORD]',
    authentic: true,
  },
  {
    id: 'TX-4',
    date: '1983-08-22 02:30',
    freq: '7.420 MHz',
    duration: '0:52',
    classification: 'NOTICE / EVACUATION',
    body: 'ALL NON-ESSENTIAL PERSONNEL MUST VACATE SECTOR C.\nDO NOT ACCESS ARCHIVAL TERMINALS.\nREPORT TO SURFACE CHECKPOINT BRAVO.\n[ORIGIN UNVERIFIED — POSSIBLE DISINFORMATION]\n[END OF RECORD]',
    authentic: false,
  },
  {
    id: 'TX-5',
    date: '1983-08-23 14:08',
    freq: '11.800 MHz',
    duration: '0:11',
    classification: 'SIGNAL / TEST',
    body: '[GARBLED — CARRIER ONLY — NO CONTENT]\n[END OF RECORD]',
    authentic: false,
  },
  {
    id: 'TX-6',
    date: '1983-08-24 06:00',
    freq: '3.100 MHz',
    duration: '2:05',
    classification: 'INTERNAL / MAINTENANCE',
    body: 'MAINTENANCE SCHEDULE UPDATE — ROUTINE.\nGENERATOR SERVICE DUE CYCLE 83-24.\nREPLACE COOLANT FILTERS SUB-LEVEL 2.\nNO ANOMALIES — STANDARD LOG.\n[END OF RECORD]',
    authentic: false,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function TransmissionArchiveModal({ isOpen, onClose, onSubmit, clueState }) {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [blink, setBlink] = useState(true);

  // Drag-scroll inertia
  const dragState = useRef({ dragging: false, startY: 0, startScroll: 0, velY: 0, lastY: 0, rafId: null });

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(id);
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScrolledToEnd(false);
      setInputValue('');
      setErrorMsg('');
      setSubmitted(false);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  // Scroll detection
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
    if (atBottom) setScrolledToEnd(true);
  }, []);

  // ── Drag-to-scroll ──────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    const ds = dragState.current;
    ds.dragging = true;
    ds.startY = e.clientY;
    ds.startScroll = scrollRef.current?.scrollTop || 0;
    ds.lastY = e.clientY;
    ds.velY = 0;
    if (ds.rafId) cancelAnimationFrame(ds.rafId);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    const ds = dragState.current;
    if (!ds.dragging || !scrollRef.current) return;
    ds.velY = ds.lastY - e.clientY;
    ds.lastY = e.clientY;
    scrollRef.current.scrollTop = ds.startScroll + (ds.startY - e.clientY);
  }, []);

  const onPointerUp = useCallback(() => {
    const ds = dragState.current;
    if (!ds.dragging) return;
    ds.dragging = false;
    // Inertia
    const coast = () => {
      if (Math.abs(ds.velY) < 0.5 || !scrollRef.current) return;
      scrollRef.current.scrollTop += ds.velY;
      ds.velY *= 0.92;
      ds.rafId = requestAnimationFrame(coast);
    };
    ds.rafId = requestAnimationFrame(coast);
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const val = inputValue.trim().toUpperCase();
    if (!val) return;
    onSubmit(val);
    setSubmitted(true);
  }, [inputValue, onSubmit]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  // Already solved / exhausted
  const isSolved = clueState?.solved;
  const isExhausted = clueState?.exhausted;
  const attemptsLeft = clueState?.attempts_remaining ?? 3;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel paper-tape-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 740, width: '94vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Header ── */}
        <div className="modal-header" style={{ borderBottom: '1px solid #1a3d1f', paddingBottom: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="font-teletype" style={{ color: '#4dff78', letterSpacing: 3, fontSize: 11, marginBottom: 4 }}>
                ◈ SUBSTATION DELTA — RADIO INTERCEPT ARCHIVE ◈
              </div>
              <h2 style={{ color: '#4dff78', fontSize: 18, fontFamily: 'Courier, monospace', margin: 0, letterSpacing: 2 }}>
                TRANSMISSION LOG
              </h2>
              <div className="font-teletype" style={{ color: '#c47a00', fontSize: 10, marginTop: 4, letterSpacing: 1 }}>
                FREQ RANGE: 3.100–11.800 MHz // PERIOD: 1983-08-20 TO 1983-08-24
              </div>
            </div>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* ── Tape Scroll ── */}
        <div
          ref={scrollRef}
          className="tape-scroll-container"
          onScroll={handleScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            flex: 1,
            overflowY: 'auto',
            cursor: 'grab',
            userSelect: 'none',
            padding: '8px 0',
            scrollBehavior: 'auto',
          }}
        >
          {/* Paper tape wrapper */}
          <div className="paper-tape" style={{ position: 'relative', padding: '0 24px' }}>
            {/* Top sprocket holes decoration */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 16, opacity: 0.4 }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', border: '1px solid #4dff78', flexShrink: 0 }} />
              ))}
            </div>

            <div className="font-teletype" style={{ color: '#c47a00', fontSize: 10, letterSpacing: 2, marginBottom: 20, textAlign: 'center' }}>
              ─── SCROLL DOWN TO READ ALL TRANSMISSIONS ───
            </div>

            {TRANSMISSIONS.map((tx, idx) => (
              <div
                key={tx.id}
                className={`transmission-entry${tx.authentic ? ' authentic-transmission' : ''}`}
                style={{
                  borderTop: idx > 0 ? '1px dashed #1a3d1f' : 'none',
                  paddingTop: idx > 0 ? 20 : 0,
                  marginBottom: 24,
                }}
              >
                {/* TX Header line */}
                <div
                  className="font-teletype"
                  style={{
                    color: tx.authentic ? '#4dff78' : '#c47a00',
                    fontSize: 11,
                    letterSpacing: 1.5,
                    marginBottom: 6,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0 16px',
                    borderLeft: tx.authentic ? '3px solid #4dff78' : '3px solid #1a3d1f',
                    paddingLeft: 10,
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>{tx.id}</span>
                  <span>DATE {tx.date}</span>
                  <span>FREQ {tx.freq}</span>
                  <span>DUR {tx.duration}</span>
                </div>

                {/* Classification */}
                <div
                  className="font-teletype"
                  style={{
                    color: tx.authentic ? '#4dff78' : '#3a5a3f',
                    fontSize: 10,
                    letterSpacing: 1,
                    marginBottom: 2,
                    paddingLeft: 13,
                  }}
                >
                  CLASS: {tx.classification}
                  {tx.from && <span style={{ marginLeft: 16 }}>FROM: {tx.from}</span>}
                </div>

                {/* Body */}
                <pre
                  className="font-teletype"
                  style={{
                    color: tx.authentic ? '#e8d9c0' : '#7a9a7f',
                    fontSize: 12,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    margin: '10px 0 0 13px',
                    fontFamily: 'Courier, monospace',
                  }}
                >
                  {tx.body}
                </pre>
              </div>
            ))}

            {/* ── End-of-tape marker ── */}
            <div style={{ textAlign: 'center', margin: '24px 0 16px' }}>
              <div className="font-teletype" style={{ color: '#1a3d1f', fontSize: 11, letterSpacing: 3 }}>
                ══════════════════════════
              </div>
              <div className="font-teletype" style={{ color: '#c47a00', fontSize: 10, letterSpacing: 2, margin: '8px 0' }}>
                END OF ARCHIVE RECORD
              </div>
              <div className="font-teletype" style={{ color: '#1a3d1f', fontSize: 11, letterSpacing: 3 }}>
                ══════════════════════════
              </div>
            </div>

            {/* Bottom sprocket holes */}
            <div style={{ display: 'flex', gap: 24, marginTop: 16, opacity: 0.4 }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', border: '1px solid #4dff78', flexShrink: 0 }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Scroll prompt or input ── */}
        <div style={{ flexShrink: 0, borderTop: '1px solid #1a3d1f', padding: '12px 24px' }}>
          {!scrolledToEnd && (
            <div
              className="font-teletype"
              style={{ color: '#c47a00', fontSize: 11, letterSpacing: 2, textAlign: 'center', animation: 'pulse 1.5s ease-in-out infinite' }}
            >
              ▼  SCROLL TO END TO CONTINUE  ▼
            </div>
          )}

          {scrolledToEnd && (
            <>
              {isSolved && (
                <div className="font-teletype" style={{ color: '#4dff78', fontSize: 12, letterSpacing: 2 }}>
                  ✓ TRANSMISSION SOURCE IDENTIFIED — RECORD LOCKED
                </div>
              )}
              {isExhausted && !isSolved && (
                <div className="font-teletype" style={{ color: '#a31818', fontSize: 12, letterSpacing: 2 }}>
                  ✗ MAXIMUM ATTEMPTS EXCEEDED — ACCESS REVOKED
                </div>
              )}
              {!isSolved && !isExhausted && (
                <>
                  {errorMsg && (
                    <div className="font-teletype" style={{ color: '#a31818', fontSize: 11, marginBottom: 8, letterSpacing: 1 }}>
                      ✗ {errorMsg}
                    </div>
                  )}
                  <div className="font-teletype" style={{ color: '#3a5a3f', fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>
                    ATTEMPTS REMAINING: {attemptsLeft}
                  </div>
                  <div className="terminal-input-line" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="font-teletype" style={{ color: '#4dff78', fontSize: 12, whiteSpace: 'nowrap' }}>
                      &gt; IDENTIFY AUTHENTIC TRANSMISSION SOURCE:
                    </span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={e => { setInputValue(e.target.value.toUpperCase()); setErrorMsg(''); }}
                      onKeyDown={handleKeyDown}
                      maxLength={8}
                      autoFocus
                      placeholder={blink ? '_' : ''}
                      className="terminal-input"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #4dff78',
                        color: '#4dff78',
                        fontFamily: 'Courier, monospace',
                        fontSize: 12,
                        letterSpacing: 2,
                        outline: 'none',
                        width: 100,
                        textTransform: 'uppercase',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitted}
                      className="px-3 py-1 font-mono font-bold text-xs tracking-wider uppercase rounded transition-all cursor-pointer shadow-[0_0_10px_rgba(77,255,120,0.2)]"
                      style={{
                        background: '#1a3d1f',
                        border: '1px solid #4dff78',
                        color: '#4dff78',
                      }}
                    >
                      SUBMIT
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


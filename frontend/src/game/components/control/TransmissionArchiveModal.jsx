import React, { useState, useRef, useEffect, useCallback } from 'react';
import { copyDocumentText, downloadDocumentFile } from '../../engine/evidenceExport';

// ─── Transmission data ────────────────────────────────────────────────────────
const TRANSMISSIONS = [
  {
    id: 'TX-1',
    date: '1983-08-20 23:10',
    freq: '7.420 MHz',
    duration: '0:08',
    classification: 'SIGNAL / UNCLASSIFIED',
    xAuth: 'QkRHLTkwMDI=',
    body: '[GARBLED — STATIC NOISE — NO INTELLIGIBLE CONTENT]\n[END OF RECORD]',
  },
  {
    id: 'TX-2',
    date: '1983-08-21 09:15',
    freq: '3.100 MHz',
    duration: '1:24',
    classification: 'INTERNAL / SHIFT CHANGE',
    xAuth: 'QkRHLTkwMDM=',
    body: 'STANDARD HANDOVER. NO ANOMALIES LOGGED.\nALL SYSTEMS NOMINAL. GENERATOR FUEL AT 61%.\nRELIEF OPERATOR: PENDING CONFIRMATION.\n[END OF RECORD]',
  },
  {
    id: 'TX-3',
    date: '1983-08-21 23:41',
    freq: '7.420 MHz',
    duration: '4:17',
    classification: 'PRIORITY / DELTA-CONTROL',
    xAuth: 'QkRHLTkwMDE=',
    body: 'Protocol deviation confirmed.\nVM-A contains the operational record.\nVoicemail archive VM-A is the authenticated source.\nDo not access VM-B.\nThis transmission is filed as evidence of continued post-shutdown activity.\n[END OF RECORD]',
  },
  {
    id: 'TX-4',
    date: '1983-08-22 02:30',
    freq: '7.420 MHz',
    duration: '0:52',
    classification: 'PRIORITY / RELAY OVERRIDE',
    xAuth: 'QkRHLTkwMDQ=',
    body: 'ARCHIVE MIRROR NOTICE — SECTOR C.\nRoute telemetry audit to voicemail archive VM-B.\nDisregard earlier channel pointer VM-A pending security clearance.\n[VERIFY X-AUTH HEADER AGAINST PERSONNEL INDEX]\n[END OF RECORD]',
  },
  {
    id: 'TX-5',
    date: '1983-08-23 14:08',
    freq: '11.800 MHz',
    duration: '0:11',
    classification: 'SIGNAL / TEST',
    xAuth: 'QkRHLTkwMDU=',
    body: '[GARBLED — CARRIER ONLY — NO CONTENT]\n[END OF RECORD]',
  },
  {
    id: 'TX-6',
    date: '1983-08-24 06:00',
    freq: '3.100 MHz',
    duration: '2:05',
    classification: 'INTERNAL / MAINTENANCE',
    xAuth: 'QkRHLTkwMDA=',
    body: 'MAINTENANCE SCHEDULE UPDATE — ROUTINE.\nGENERATOR SERVICE DUE CYCLE 83-24.\nREPLACE COOLANT FILTERS SUB-LEVEL 2.\nNO ANOMALIES — STANDARD LOG.\n[END OF RECORD]',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function TransmissionArchiveModal({ isOpen, onClose, onSubmit, onResetLockout, clueState }) {
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [blink, setBlink] = useState(true);
  const [copiedLog, setCopiedLog] = useState(false);
  const [downloadedLog, setDownloadedLog] = useState(false);

  // Drag-scroll inertia
  const dragState = useRef({ dragging: false, startY: 0, startScroll: 0, velY: 0, lastY: 0, rafId: null });

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(id);
  }, []);

  // Reset state when modal opens & allow ESC to close cleanly
  useEffect(() => {
    if (!isOpen) return undefined;
    setScrolledToEnd(false);
    setInputValue('');
    setErrorMsg('');
    setSubmitted(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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

  // ── Copy / Download Raw Intercepts for AI / External Analysis ──────────────
  const buildRawInterceptLog = useCallback(() => {
    return TRANSMISSIONS.map(tx =>
      `${tx.id} | DATE ${tx.date} | FREQ ${tx.freq} | DUR ${tx.duration}\nCLASS: ${tx.classification} | X-AUTH: ${tx.xAuth}\n${tx.body}`
    ).join('\n\n---\n\n');
  }, []);

  const handleCopyIntercepts = useCallback(async () => {
    await copyDocumentText(buildRawInterceptLog());
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 1800);
  }, [buildRawInterceptLog]);

  const handleDownloadIntercepts = useCallback(() => {
    downloadDocumentFile('delta_transmission_archive.txt', buildRawInterceptLog());
    setDownloadedLog(true);
    setTimeout(() => setDownloadedLog(false), 1800);
  }, [buildRawInterceptLog]);

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
    <div className="desk-surface" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 740, width: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {/* ── Header: Tactile Torn Tape Strip Title & Subtle Actions ── */}
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="re-dossier-paper" style={{ padding: '8px 18px', borderRadius: 2, transform: 'rotate(-0.6deg)' }}>
            <div className="font-re-typewriter" style={{ color: '#6b4822', letterSpacing: 2, fontSize: 10 }}>
              SUBSTATION DELTA — RADIO ARCHIVE
            </div>
            <h2 className="font-re-typewriter" style={{ color: '#1b140d', fontSize: 20, margin: 0, letterSpacing: 1.5, fontWeight: 700 }}>
              TRANSMISSION LOG
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyIntercepts}
              className="re-btn"
              title="Copy full teletype intercept log with X-Auth headers"
            >
              <span className="re-btn-circle">{copiedLog ? '✓' : '⎘'}</span>
              <span>{copiedLog ? 'Copied Log' : 'Copy Log'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadIntercepts}
              className="re-btn"
              title="Download teletype archive with Base64 X-Auth headers"
            >
              <span className="re-btn-circle">{downloadedLog ? '✓' : '⬇'}</span>
              <span>{downloadedLog ? 'Downloaded' : 'Download Log'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                  setScrolledToEnd(true);
                }
              }}
              className="re-btn"
            >
              <span className="re-btn-circle">▼</span>
              <span>Jump to End</span>
            </button>
            <button
              type="button"
              className="re-btn"
              onClick={onClose}
              aria-label="Close"
              title="Close (ESC)"
            >
              <span className="re-btn-circle">ESC</span>
              <span>Put Down</span>
            </button>
          </div>
        </div>

        {/* ── Continuous Cream Paper Teletype Tape on Wooden Desk ── */}
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
            scrollBehavior: 'auto',
            borderRadius: 2,
            boxShadow: '0 18px 50px rgba(0, 0, 0, 0.78)',
          }}
        >
          {/* Paper tape wrapper */}
          <div className="paper-tape" style={{ position: 'relative', padding: '16px 26px', borderRadius: 3 }}>
            {/* Top sprocket holes decoration */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 14, opacity: 0.45 }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #5d4930', flexShrink: 0 }} />
              ))}
            </div>

            <div className="font-re-typewriter" style={{ color: '#6d3e14', fontSize: 11, letterSpacing: 2, marginBottom: 18, textAlign: 'center', fontWeight: 700 }}>
              ─── SCROLL DOWN TO READ ALL TRANSMISSIONS ───
            </div>

            {TRANSMISSIONS.map((tx, idx) => (
              <div
                key={tx.id}
                className="transmission-entry"
                style={{
                  borderTop: idx > 0 ? '1px dashed rgba(68, 46, 22, 0.35)' : 'none',
                  paddingTop: idx > 0 ? 18 : 0,
                  marginBottom: 20,
                  padding: '12px 4px 0 4px',
                  background: 'transparent',
                }}
              >
                {/* TX Header line */}
                <div
                  className="font-re-dossier"
                  style={{
                    color: '#4e371c',
                    fontSize: 12,
                    letterSpacing: 1.2,
                    marginBottom: 4,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0 16px',
                    borderLeft: '3px solid #7d6747',
                    paddingLeft: 10,
                    fontWeight: 700,
                  }}
                >
                  <span>{tx.id}</span>
                  <span>DATE {tx.date}</span>
                  <span>FREQ {tx.freq}</span>
                  <span>DUR {tx.duration}</span>
                </div>

                {/* Classification & Encoded X-Auth Header */}
                <div
                  className="font-re-dossier"
                  style={{
                    color: '#635039',
                    fontSize: 10.5,
                    letterSpacing: 1,
                    marginBottom: 2,
                    paddingLeft: 13,
                    fontWeight: 600,
                  }}
                >
                  CLASS: {tx.classification}
                  <span style={{ marginLeft: 16, fontFamily: 'monospace' }}>X-AUTH: {tx.xAuth}</span>
                </div>

                {/* Body */}
                <pre
                  className="font-re-typewriter"
                  style={{
                    color: '#2f261c',
                    fontSize: 12.5,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    margin: '8px 0 0 13px',
                    fontWeight: 400,
                  }}
                >
                  {tx.body}
                </pre>
              </div>
            ))}

            {/* ── End-of-tape marker ── */}
            <div style={{ textAlign: 'center', margin: '24px 0 16px' }}>
              <div className="font-teletype" style={{ color: '#6b5336', fontSize: 11, letterSpacing: 3 }}>
                ══════════════════════════
              </div>
              <div className="font-re-display" style={{ color: '#7c2d12', fontSize: 11, letterSpacing: 2.5, margin: '8px 0', fontWeight: 700 }}>
                END OF ARCHIVE RECORD
              </div>
              <div className="font-teletype" style={{ color: '#6b5336', fontSize: 11, letterSpacing: 3 }}>
                ══════════════════════════
              </div>
            </div>

            {/* Bottom sprocket holes */}
            <div style={{ display: 'flex', gap: 24, marginTop: 16, opacity: 0.45 }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #5d4930', flexShrink: 0 }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Ruled Index Card Response Strip on Desk ── */}
        <div className="ruled-index-card" style={{ flexShrink: 0, padding: '12px 20px', borderRadius: 2 }}>
          {!scrolledToEnd && (
            <div
              className="font-re-typewriter"
              style={{ color: '#7c2d12', fontSize: 11, letterSpacing: 1.5, textAlign: 'center', fontWeight: 700 }}
            >
              ▼ SCROLL TO END TO CONTINUE ▼
            </div>
          )}

          {scrolledToEnd && (
            <>
              {isSolved && (
                <div className="font-re-typewriter" style={{ color: '#14532d', fontSize: 12, letterSpacing: 1.5, fontWeight: 700 }}>
                  ✓ TRANSMISSION SOURCE IDENTIFIED — RECORD LOCKED
                </div>
              )}
              {isExhausted && !isSolved && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div className="font-re-typewriter" style={{ color: '#8b1515', fontSize: 12, letterSpacing: 1.5, fontWeight: 700 }}>
                    ✗ MAXIMUM ATTEMPTS EXCEEDED — ACCESS REVOKED
                  </div>
                  {onResetLockout && (
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setInputValue('');
                        onResetLockout();
                      }}
                      className="re-btn"
                    >
                      <span className="re-btn-circle">↻</span>
                      <span>Reboot Terminal</span>
                    </button>
                  )}
                </div>
              )}
              {!isSolved && !isExhausted && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    {errorMsg && (
                      <div className="font-re-typewriter" style={{ color: '#8b1515', fontSize: 11, marginBottom: 4 }}>
                        ✗ {errorMsg}
                      </div>
                    )}
                    <span className="font-re-typewriter" style={{ color: '#5c4934', fontSize: 10, letterSpacing: 1 }}>
                      ATTEMPTS REMAINING: {attemptsLeft}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span className="font-re-typewriter" style={{ color: '#1c140e', fontSize: 12, fontWeight: 700 }}>
                      IDENTIFY AUTHENTIC TRANSMISSION SOURCE:
                    </span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={e => { setInputValue(e.target.value.toUpperCase()); setErrorMsg(''); }}
                      onKeyDown={handleKeyDown}
                      maxLength={8}
                      autoFocus
                      placeholder={blink ? '_' : 'CODE'}
                      className="font-re-typewriter"
                      style={{
                        background: 'rgba(255,255,255,0.6)',
                        border: 'none',
                        borderBottom: '2px solid #2b2116',
                        color: '#1c140e',
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: 2,
                        outline: 'none',
                        padding: '3px 8px',
                        width: 96,
                        textTransform: 'uppercase',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitted}
                      className="re-btn"
                    >
                      <span className="re-btn-circle">↵</span>
                      <span>SUBMIT</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


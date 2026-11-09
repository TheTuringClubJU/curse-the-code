import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

const DIGIT_GLYPHS = {
  8: [
    [1,1,1],
    [1,0,1],
    [1,1,1],
    [1,0,1],
    [1,1,1],
  ],
  1: [
    [0,1,0],
    [1,1,0],
    [0,1,0],
    [0,1,0],
    [1,1,1],
  ],
  4: [
    [1,0,1],
    [1,0,1],
    [1,1,1],
    [0,0,1],
    [0,0,1],
  ],
  0: [
    [1,1,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,1,1],
  ],
};

function drawOscilloscope(canvas, vmTab, band, scrubPos) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // Dark background
  ctx.fillStyle = '#030e05';
  ctx.fillRect(0, 0, W, H);

  // Vignette
  const vign = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.72);
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#0d2e12';
  ctx.lineWidth = 0.6;
  const cols = 10, rows = 8;
  for (let i = 1; i < cols; i++) {
    ctx.beginPath(); ctx.moveTo(W*i/cols, 0); ctx.lineTo(W*i/cols, H); ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    ctx.beginPath(); ctx.moveTo(0, H*j/rows); ctx.lineTo(W, H*j/rows); ctx.stroke();
  }

  // Phosphor afterglow bands
  const bandOffset = band === 'LOW' ? 0 : band === 'MID' ? 1.4 : 2.8;
  const freq = 0.015 + bandOffset * 0.008;
  const amp = H * (band === 'HIGH' ? 0.22 : band === 'MID' ? 0.28 : 0.32);
  const noiseAmp = band === 'HIGH' ? 6 : band === 'MID' ? 4 : 8;

  const isReveal = vmTab === 'VM-A' && band === 'HIGH' && scrubPos >= 65 && scrubPos <= 80;

  // Shadow / glow passes
  for (let pass = 0; pass < 3; pass++) {
    const alpha = [0.06, 0.12, 0.85][pass];
    const lw = [4.5, 2.5, 1.2][pass];
    ctx.strokeStyle = `rgba(77,255,120,${alpha})`;
    ctx.lineWidth = lw;
    ctx.beginPath();

    for (let x = 0; x < W; x++) {
      const t = x / W;
      const phase = t * Math.PI * 2 * (3 + bandOffset) + scrubPos * 0.08;
      const noise = (Math.sin(x * 0.3 + scrubPos) * 0.5 + Math.cos(x * 0.17) * 0.5) * noiseAmp;
      let y = H / 2 + Math.sin(phase) * amp * Math.sin(t * Math.PI) + noise;

      // Inject digit disruption in reveal zone
      if (isReveal && pass === 2) {
        const digitZone = { start: 0.28, end: 0.75 };
        if (t > digitZone.start && t < digitZone.end) {
          const localT = (t - digitZone.start) / (digitZone.end - digitZone.start);
          const digit = localT < 0.25 ? 8 : localT < 0.50 ? 1 : localT < 0.75 ? 4 : 0;
          const glyph = DIGIT_GLYPHS[digit];
          const glyphT = ((localT * 4) % 1);
          const col = Math.floor(glyphT * 3);
          const row = Math.floor((Math.sin(t * 2.3) * 0.5 + 0.5) * 5);
          if (glyph[row] && glyph[row][col]) {
            y = H / 2 + (row - 2) * 10;
          }
        }
      }

      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // CRT scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
}

function drawWaveformStrip(canvas, vmTab, band, scrubPos) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = '#020a04';
  ctx.fillRect(0, 0, W, H);

  // Scrub marker
  const markerX = (scrubPos / 100) * W;
  ctx.fillStyle = 'rgba(196,122,0,0.15)';
  ctx.fillRect(markerX - 20, 0, 40, H);

  ctx.strokeStyle = '#c47a00';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(markerX, 0); ctx.lineTo(markerX, H); ctx.stroke();

  const isReveal = vmTab === 'VM-A' && band === 'HIGH' && scrubPos >= 65 && scrubPos <= 80;

  // Mini waveform
  ctx.strokeStyle = isReveal ? '#4dff78' : '#1a3d1f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < W; x++) {
    const t = x / W;
    const v = Math.sin(t * Math.PI * 48) * (H * 0.3) + Math.sin(t * Math.PI * 11 + 1) * (H * 0.1);
    const y = H / 2 + v;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  if (isReveal) {
    // Digit tick marks
    ctx.fillStyle = '#4dff78';
    ctx.font = 'bold 10px Courier, monospace';
    ctx.textAlign = 'center';
    const digits = [8, 1, 4, 0];
    digits.forEach((d, i) => {
      const dx = W * (0.3 + i * 0.12);
      ctx.fillText(String(d), dx, H / 2 - 6);
      ctx.beginPath();
      ctx.moveTo(dx, H / 2);
      ctx.lineTo(dx, H / 2 + 8);
      ctx.stroke();
    });
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
const BANDS = ['LOW', 'MID', 'HIGH'];

export default function SpectrogramModal({ isOpen, onClose, onSubmit, clueState }) {
  const [vmTab, setVmTab] = useState('VM-A');
  const [band, setBand] = useState('MID');
  const [scrubPos, setScrubPos] = useState(0); // 0–100
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [blink, setBlink] = useState(true);

  const oscRef = useRef(null);
  const stripRef = useRef(null);

  // Dial drag
  const dialDrag = useRef({ dragging: false, startX: 0, startY: 0, startPos: 0 });

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(id);
  }, []);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setVmTab('VM-A');
      setBand('MID');
      setScrubPos(0);
      setInputValue('');
      setErrorMsg('');
      setSubmitted(false);
    }
  }, [isOpen]);

  // Redraw canvas when params change
  useEffect(() => {
    drawOscilloscope(oscRef.current, vmTab, band, scrubPos);
  }, [vmTab, band, scrubPos, isOpen]);

  useEffect(() => {
    drawWaveformStrip(stripRef.current, vmTab, band, scrubPos);
  }, [vmTab, band, scrubPos, isOpen]);

  // ── Dial drag ──────────────────────────────────────────────────────────────
  const onDialPointerDown = useCallback((e) => {
    dialDrag.current = { dragging: true, startX: e.clientX, startY: e.clientY, startPos: scrubPos };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [scrubPos]);

  const onDialPointerMove = useCallback((e) => {
    if (!dialDrag.current.dragging) return;
    const dx = e.clientX - dialDrag.current.startX;
    const dy = -(e.clientY - dialDrag.current.startY);
    const delta = (dx + dy) * 0.5;
    const next = Math.max(0, Math.min(100, dialDrag.current.startPos + delta));
    setScrubPos(Math.round(next));
  }, []);

  const onDialPointerUp = useCallback(() => {
    dialDrag.current.dragging = false;
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const val = inputValue.trim();
    if (!val) return;
    onSubmit(val);
    setSubmitted(true);
  }, [inputValue, onSubmit]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  const isSolved = clueState?.solved;
  const isExhausted = clueState?.exhausted;
  const attemptsLeft = clueState?.attempts_remaining ?? 3;

  const isRevealZone = vmTab === 'VM-A' && band === 'HIGH' && scrubPos >= 65 && scrubPos <= 80;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel spectrogram-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 760, width: '94vw', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* ── Header ── */}
        <div className="modal-header" style={{ borderBottom: '1px solid #1a3d1f', paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="font-teletype" style={{ color: '#4dff78', letterSpacing: 3, fontSize: 11, marginBottom: 4 }}>
              ◈ SUBSTATION DELTA — VOICEMAIL SPECTROGRAM ANALYSER ◈
            </div>
            <h2 style={{ color: '#4dff78', fontSize: 18, fontFamily: 'Courier, monospace', margin: 0, letterSpacing: 2 }}>
              SOUND CONSOLE / FREQ ANALYSIS
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── VM Tab selector ── */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 0 0 0', marginBottom: 16 }}>
          {['VM-A', 'VM-B'].map(tab => (
            <button
              key={tab}
              className={`vm-tab-btn${vmTab === tab ? ' active' : ''}`}
              onClick={() => { setVmTab(tab); setScrubPos(0); }}
              style={{
                fontFamily: 'Courier, monospace',
                fontSize: 13,
                letterSpacing: 2,
                padding: '6px 24px',
                border: `1px solid ${vmTab === tab ? '#4dff78' : '#1a3d1f'}`,
                background: vmTab === tab ? '#0d2e12' : 'transparent',
                color: vmTab === tab ? '#4dff78' : '#3a5a3f',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
          <span className="font-teletype" style={{ color: '#3a5a3f', fontSize: 10, alignSelf: 'center', marginLeft: 12, letterSpacing: 1 }}>
            {vmTab === 'VM-A' ? '// AUTHENTICATED VOICEMAIL' : '// SECONDARY ARCHIVE'}
          </span>
        </div>

        {/* ── Oscilloscope ── */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div
              className="oscilloscope-tube"
              style={{
                position: 'relative',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #1a3d1f',
                boxShadow: '0 0 24px rgba(77,255,120,0.12), inset 0 0 40px rgba(0,0,0,0.6)',
                aspectRatio: '1',
                maxWidth: 300,
              }}
            >
              <canvas
                ref={oscRef}
                width={300}
                height={300}
                style={{ display: 'block', width: '100%', height: '100%' }}
              />
              {/* CRT bezel overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, rgba(77,255,120,0.04), transparent 60%)',
                pointerEvents: 'none',
              }} />
              {/* Tube label */}
              <div
                className="font-teletype"
                style={{
                  position: 'absolute', bottom: 8, left: 0, right: 0,
                  textAlign: 'center', color: '#1a3d1f', fontSize: 9, letterSpacing: 2,
                }}
              >
                DELTA-OSC-MK2
              </div>
            </div>

            {isRevealZone && (
              <div
                className="font-teletype blink-cursor"
                style={{ color: '#4dff78', fontSize: 11, letterSpacing: 2, marginTop: 8, textAlign: 'center' }}
              >
                ⚠ ANOMALY DETECTED IN HIGH BAND
              </div>
            )}
          </div>

          {/* ── Controls column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minWidth: 200 }}>
            {/* Band selector */}
            <div>
              <div className="font-teletype" style={{ color: '#c47a00', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>
                FREQ BAND
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {BANDS.map(b => (
                  <button
                    key={b}
                    className={`freq-band-btn${band === b ? ' active' : ''}`}
                    onClick={() => setBand(b)}
                    style={{
                      fontFamily: 'Courier, monospace',
                      fontSize: 11,
                      letterSpacing: 1,
                      padding: '5px 14px',
                      border: `1px solid ${band === b ? '#4dff78' : '#1a3d1f'}`,
                      background: band === b ? '#0d2e12' : 'transparent',
                      color: band === b ? '#4dff78' : '#3a5a3f',
                      cursor: 'pointer',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrub dial */}
            <div>
              <div className="font-teletype" style={{ color: '#c47a00', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>
                POSITION: {scrubPos}%
              </div>
              <div
                className="scrub-dial"
                onPointerDown={onDialPointerDown}
                onPointerMove={onDialPointerMove}
                onPointerUp={onDialPointerUp}
                onPointerCancel={onDialPointerUp}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  border: '3px solid #1a3d1f',
                  background: 'radial-gradient(circle at 40% 40%, #1a3d1f, #030e05)',
                  cursor: 'grab',
                  position: 'relative',
                  boxShadow: '0 0 12px rgba(77,255,120,0.1)',
                  userSelect: 'none',
                }}
              >
                {/* Dial indicator line */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 2,
                  height: 28,
                  background: '#4dff78',
                  transformOrigin: '1px 0',
                  transform: `translateX(-50%) rotate(${scrubPos * 2.7 - 135}deg)`,
                  borderRadius: 1,
                }} />
                {/* Center dot */}
                <div style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: '#4dff78',
                  transform: 'translate(-50%, -50%)',
                }} />
              </div>
              <div className="font-teletype" style={{ color: '#3a5a3f', fontSize: 9, letterSpacing: 1, marginTop: 6 }}>
                DRAG TO SCRUB
              </div>
            </div>

            {/* Status */}
            <div>
              <div className="font-teletype" style={{ color: '#c47a00', fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>STATUS</div>
              <div className="font-teletype" style={{ color: '#3a5a3f', fontSize: 11, lineHeight: 1.6 }}>
                FILE: {vmTab}<br />
                BAND: {band}<br />
                SIGNAL: {vmTab === 'VM-A' ? 'STRONG' : 'DEGRADED'}<br />
                DECODE: {isRevealZone ? '⚠ ANOMALY' : 'NOMINAL'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Waveform strip ── */}
        <div style={{ marginTop: 20 }}>
          <div className="font-teletype" style={{ color: '#c47a00', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>
            WAVEFORM STRIP — {vmTab} / {band} BAND
          </div>
          <div
            className="waveform-strip"
            style={{
              border: '1px solid #1a3d1f',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={stripRef}
              width={700}
              height={56}
              style={{ display: 'block', width: '100%', height: 56 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="font-teletype" style={{ color: '#3a5a3f', fontSize: 9 }}>0:00</span>
            <span className="font-teletype" style={{ color: '#c47a00', fontSize: 9 }}>pos {scrubPos}%</span>
            <span className="font-teletype" style={{ color: '#3a5a3f', fontSize: 9 }}>4:17</span>
          </div>
        </div>

        {/* ── Clue input ── */}
        <div style={{ marginTop: 20, borderTop: '1px solid #1a3d1f', paddingTop: 16 }}>
          {isSolved && (
            <div className="font-teletype" style={{ color: '#4dff78', fontSize: 12, letterSpacing: 2 }}>
              ✓ CODE VERIFIED — RECORD LOCKED
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
                <div className="font-teletype" style={{ color: '#a31818', fontSize: 11, marginBottom: 8 }}>
                  ✗ {errorMsg}
                </div>
              )}
              <div className="font-teletype" style={{ color: '#3a5a3f', fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>
                ATTEMPTS REMAINING: {attemptsLeft}
              </div>
              <div className="terminal-input-line" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="font-teletype" style={{ color: '#4dff78', fontSize: 12, whiteSpace: 'nowrap' }}>
                  &gt; ENTER FOUR-DIGIT CODE:
                </span>
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => { setInputValue(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }}
                  onKeyDown={handleKeyDown}
                  maxLength={4}
                  autoFocus
                  placeholder={blink ? '_' : ''}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #4dff78',
                    color: '#4dff78',
                    fontFamily: 'Courier, monospace',
                    fontSize: 14,
                    letterSpacing: 4,
                    outline: 'none',
                    width: 72,
                    textAlign: 'center',
                  }}
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitted || inputValue.length !== 4}
                  className="px-3 py-1 font-mono font-bold text-xs tracking-wider uppercase rounded transition-all cursor-pointer shadow-[0_0_10px_rgba(77,255,120,0.2)]"
                  style={{
                    background: inputValue.length === 4 ? '#1a3d1f' : 'transparent',
                    border: '1px solid #4dff78',
                    color: '#4dff78',
                    opacity: inputValue.length !== 4 ? 0.4 : 1,
                    cursor: inputValue.length === 4 ? 'pointer' : 'not-allowed',
                  }}
                >
                  SUBMIT
                </button>
              </div>
              {isRevealZone && (
                <div className="font-teletype" style={{ color: '#c47a00', fontSize: 10, marginTop: 8, letterSpacing: 1 }}>
                  HINT: Scan the HIGH band waveform carefully for embedded signal patterns.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


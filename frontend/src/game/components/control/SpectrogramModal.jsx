import React, { useState, useRef, useEffect, useCallback } from 'react';
import { copyDocumentText, downloadDocumentFile } from '../../engine/evidenceExport';

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

const TELEMETRY_PROFILES = {
  'VM-A': {
    label: '// PRIMARY VOICE LOG',
    peakMin: 65,
    peakMax: 80,
    carrierFreqKHz: '14.82',
    frames: [
      { idx: 0, bcd: '1000', morse: '---..', peakHz: 14820 },
      { idx: 1, bcd: '0001', morse: '.----', peakHz: 14110 },
      { idx: 2, bcd: '0100', morse: '....-', peakHz: 14440 },
      { idx: 3, bcd: '0000', morse: '-----', peakHz: 14000 },
    ],
    midDecoy: {
      peakMin: 25,
      peakMax: 42,
      carrierFreqKHz: '3.18',
      frames: [
        { idx: 0, bcd: '0001', morse: '.----', peakHz: 3110 },
        { idx: 1, bcd: '1001', morse: '----.', peakHz: 3910 },
        { idx: 2, bcd: '1000', morse: '---..', peakHz: 3820 },
        { idx: 3, bcd: '0011', morse: '...--', peakHz: 3340 },
      ],
    },
  },
  'VM-B': {
    label: '// SECONDARY ARCHIVE',
    peakMin: 40,
    peakMax: 55,
    carrierFreqKHz: '14.41',
    frames: [
      { idx: 0, bcd: '1000', morse: '---..', peakHz: 14410 },
      { idx: 1, bcd: '0100', morse: '....-', peakHz: 14440 },
      { idx: 2, bcd: '0001', morse: '.----', peakHz: 14110 },
      { idx: 3, bcd: '0000', morse: '-----', peakHz: 14000 },
    ],
  },
};

function resolveTelemetryProfile(vmTab, filesPayload) {
  const base = TELEMETRY_PROFILES[vmTab] || TELEMETRY_PROFILES['VM-A'];
  if (!Array.isArray(filesPayload)) return base;
  const entry = filesPayload.find((f) => (f?.id || f) === vmTab);
  if (!entry || typeof entry === 'string') return base;
  return {
    label: entry.subtitle || (entry.label && entry.label !== `Voicemail ${vmTab.replace(/^VM-/, '')}` ? `// ${entry.label}` : base.label),
    peakMin: entry.peak_min ?? base.peakMin,
    peakMax: entry.peak_max ?? base.peakMax,
    carrierFreqKHz: entry.carrier_khz || base.carrierFreqKHz,
    frames: Array.isArray(entry.frames) && entry.frames.length > 0 ? entry.frames : base.frames,
    midDecoy: entry.mid_decoy || base.midDecoy,
  };
}

function getActiveTelemetryPacket(vmTab, band, scrubPos, filesPayload) {
  const profile = resolveTelemetryProfile(vmTab, filesPayload);
  if (band === 'HIGH' && scrubPos >= profile.peakMin && scrubPos <= profile.peakMax) {
    return { active: true, carrierFreqKHz: profile.carrierFreqKHz, frames: profile.frames, bandType: 'ULTRASONIC' };
  }
  if (band === 'MID' && profile.midDecoy && scrubPos >= profile.midDecoy.peakMin && scrubPos <= profile.midDecoy.peakMax) {
    return { active: true, carrierFreqKHz: profile.midDecoy.carrierFreqKHz, frames: profile.midDecoy.frames, bandType: 'MID-BAND' };
  }
  return { active: false, carrierFreqKHz: profile.carrierFreqKHz, frames: [], bandType: band };
}

function drawOscilloscope(canvas, vmTab, band, scrubPos) {
  if (!canvas) return;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  // Matte charcoal hardware CRT tube background
  ctx.fillStyle = '#0c0d0e';
  ctx.fillRect(0, 0, W, H);

  // Vignette
  const vign = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.72);
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  // Clean hairline studio reticle
  ctx.strokeStyle = 'rgba(216, 208, 192, 0.12)';
  ctx.lineWidth = 0.7;
  const cols = 10, rows = 8;
  for (let i = 1; i < cols; i++) {
    ctx.beginPath(); ctx.moveTo(W*i/cols, 0); ctx.lineTo(W*i/cols, H); ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    ctx.beginPath(); ctx.moveTo(0, H*j/rows); ctx.lineTo(W, H*j/rows); ctx.stroke();
  }

  const profile = TELEMETRY_PROFILES[vmTab] || TELEMETRY_PROFILES['VM-A'];
  const bandOffset = band === 'LOW' ? 0 : band === 'MID' ? 1.4 : 2.8;
  const amp = H * (band === 'HIGH' ? 0.22 : band === 'MID' ? 0.28 : 0.32);
  const noiseAmp = band === 'HIGH' ? 6 : band === 'MID' ? 4 : 8;

  const isCarrierPeak = band === 'HIGH' && scrubPos >= profile.peakMin && scrubPos <= profile.peakMax;

  // Draw subtle 4-frame BCD pulse columns when carrier peak is tuned
  if (isCarrierPeak) {
    profile.frames.forEach((f, idx) => {
      const fx = W * (0.2 + idx * 0.2);
      ctx.fillStyle = 'rgba(227, 178, 97, 0.08)';
      ctx.fillRect(fx - 14, H * 0.18, 28, H * 0.64);
      [...f.bcd].forEach((bit, bIdx) => {
        const by = H * (0.28 + bIdx * 0.12);
        ctx.fillStyle = bit === '1' ? 'rgba(227, 178, 97, 0.75)' : 'rgba(210, 218, 204, 0.18)';
        ctx.fillRect(fx - 7, by, 14, bit === '1' ? 6 : 2);
      });
    });
  }

  // Warm amber/ivory analog trace
  for (let pass = 0; pass < 3; pass++) {
    const alpha = [0.08, 0.22, 0.9][pass];
    const lw = [4.0, 2.2, 1.3][pass];
    ctx.strokeStyle = isCarrierPeak ? `rgba(227, 178, 97, ${alpha})` : `rgba(210, 218, 204, ${alpha})`;
    ctx.lineWidth = lw;
    ctx.beginPath();

    for (let x = 0; x < W; x++) {
      const t = x / W;
      const phase = t * Math.PI * 2 * (3 + bandOffset) + scrubPos * 0.08;
      const noise = (Math.sin(x * 0.3 + scrubPos) * 0.5 + Math.cos(x * 0.17) * 0.5) * noiseAmp;
      let y = H / 2 + Math.sin(phase) * amp * Math.sin(t * Math.PI) + noise;

      // Modulate trace with ultrasonic carrier envelope inside peak pocket
      if (isCarrierPeak && pass === 2) {
        const slot = Math.min(3, Math.floor(t * 4));
        const bits = profile.frames[slot]?.bcd || '0000';
        const bitIdx = Math.min(3, Math.floor(((t * 4) % 1) * 4));
        if (bits[bitIdx] === '1') {
          y += Math.sin(t * Math.PI * 64) * 18;
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
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = '#0c0d0e';
  ctx.fillRect(0, 0, W, H);

  const profile = TELEMETRY_PROFILES[vmTab] || TELEMETRY_PROFILES['VM-A'];
  const markerX = (scrubPos / 100) * W;
  const isCarrierPeak = band === 'HIGH' && scrubPos >= profile.peakMin && scrubPos <= profile.peakMax;

  // Scrub marker
  ctx.fillStyle = isCarrierPeak ? 'rgba(227, 178, 97, 0.22)' : 'rgba(196, 162, 101, 0.14)';
  ctx.fillRect(markerX - 18, 0, 36, H);

  ctx.strokeStyle = '#c4a265';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(markerX, 0); ctx.lineTo(markerX, H); ctx.stroke();

  // Mini spectral envelope — peaks subtly inside each channel's HIGH carrier pocket without spoiling digits
  ctx.strokeStyle = isCarrierPeak ? '#e3b261' : '#737874';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let x = 0; x < W; x++) {
    const t = x / W;
    const pct = t * 100;
    const inPocket = band === 'HIGH' && pct >= profile.peakMin && pct <= profile.peakMax;
    const burst = inPocket ? (H * 0.24) : 0;
    const v = Math.sin(t * Math.PI * (inPocket ? 92 : 48)) * (H * 0.16 + burst) + Math.sin(t * Math.PI * 11 + 1) * (H * 0.08);
    const y = H / 2 + v;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// ─── Component ────────────────────────────────────────────────────────────────
const BANDS = ['LOW', 'MID', 'HIGH'];

export default function SpectrogramModal({ isOpen, onClose, onSubmit, clueState }) {
  const availableTabs = React.useMemo(() => {
    const raw = clueState?.payload?.files;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((f) => f.id || f).filter(Boolean);
    }
    return ['VM-A', 'VM-B'];
  }, [clueState?.payload?.files]);
  const [vmTab, setVmTab] = useState('VM-A');
  const [band, setBand] = useState('MID');
  const [scrubPos, setScrubPos] = useState(0); // 0–100
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [blink, setBlink] = useState(true);
  const [copiedTelemetry, setCopiedTelemetry] = useState(false);
  const [downloadedTelemetry, setDownloadedTelemetry] = useState(false);

  const oscRef = useRef(null);
  const stripRef = useRef(null);

  // Dial drag
  const dialDrag = useRef({ dragging: false, startX: 0, startY: 0, startPos: 0 });

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(id);
  }, []);

  // Reset on open & close on Escape
  useEffect(() => {
    if (!isOpen) return undefined;
    setVmTab('VM-A');
    setBand('MID');
    setScrubPos(0);
    setInputValue('');
    setErrorMsg('');
    setSubmitted(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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
  const handleSubmit = useCallback(async () => {
    const val = inputValue.trim();
    if (!val || submitted) return;
    setSubmitted(true);
    try {
      const res = await onSubmit(val);
      if (res && !res.correct && !res.solved) {
        setErrorMsg(res.message || 'Incorrect spectrogram code. Check the waveform telemetry.');
      }
    } catch {
      setErrorMsg('Acoustic verification failed.');
    } finally {
      setSubmitted(false);
    }
  }, [inputValue, onSubmit, submitted]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  const isSolved = clueState?.solved;
  const attemptsMax = clueState?.attempts_max ?? 3;
  const attemptsLeft = clueState?.attempts_remaining ?? Math.max(0, attemptsMax - (clueState?.attempts ?? 0));
  const isExhausted = Boolean(clueState?.exhausted || (!isSolved && attemptsLeft <= 0));

  const profile = resolveTelemetryProfile(vmTab, clueState?.payload?.files);
  const activePacket = getActiveTelemetryPacket(vmTab, band, scrubPos, clueState?.payload?.files);
  const isCarrierPeak = activePacket.active;

  const buildTelemetryDump = useCallback(() => {
    const header = `DELTA-OSC-MK2 TELEMETRY | CHANNEL=${vmTab} (${profile.label}) | BAND=${band} | POS=${scrubPos}%`;
    const body = isCarrierPeak
      ? `CARRIER_LOCK=${activePacket.carrierFreqKHz}kHz (${activePacket.bandType})\n4-FRAME BCD-8421 / ITU-MORSE PACKET:\n` +
        activePacket.frames.map(f => `F${f.idx}: BCD=${f.bcd} | MORSE=${f.morse} | PEAK=${f.peakHz}Hz`).join('\n')
      : [
          `STATUS=SCANNING (NO CARRIER PACKET AT POS=${scrubPos}% IN ${band} BAND)`,
          `CHANNEL_FREQ=${profile.carrierFreqKHz}kHz`,
          'CALIBRATION GUIDE: Low and mid bands contain background rumble and false harmonics.',
          'Sweep the HIGH band past two-thirds travel (66%+) on the proven voicemail reel from R2-05 to capture the 4-frame BCD-8421 / ITU-Morse quartet.',
        ].join('\n');
    return `${header}\n${body}`;
  }, [vmTab, profile, band, scrubPos, isCarrierPeak, activePacket]);

  const handleCopyTelemetry = useCallback(async () => {
    await copyDocumentText(buildTelemetryDump());
    setCopiedTelemetry(true);
    setTimeout(() => setCopiedTelemetry(false), 1800);
  }, [buildTelemetryDump]);

  const handleDownloadTelemetry = useCallback(() => {
    downloadDocumentFile(`delta_spectrogram_${vmTab.toLowerCase()}_${band.toLowerCase()}.txt`, buildTelemetryDump());
    setDownloadedTelemetry(true);
    setTimeout(() => setDownloadedTelemetry(false), 1800);
  }, [vmTab, band, buildTelemetryDump]);

  const handleAuditionCarrier = useCallback(() => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const now = ctx.currentTime;
      if (!isCarrierPeak) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = band === 'LOW' ? 140 : band === 'MID' ? 320 : 680;
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.26);
        setTimeout(() => ctx.close().catch(() => {}), 350);
        return;
      }
      let t = now + 0.02;
      activePacket.frames.forEach(f => {
        [...f.morse].forEach(sym => {
          const dur = sym === '-' ? 0.14 : 0.05;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = band === 'MID' ? 540 : 1180;
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(t); osc.stop(t + dur + 0.01);
          t += dur + 0.045;
        });
        t += 0.14;
      });
      setTimeout(() => ctx.close().catch(() => {}), Math.ceil((t - now + 0.2) * 1000));
    } catch {
      // ignore environments without Web Audio API
    }
  }, [isCarrierPeak, band, activePacket]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel spectrogram-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 800, width: '94vw', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* ── Hardware Header ── */}
        <div className="modal-header flex justify-between items-start gap-4 pb-3 border-b border-white/10">
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-[#c4a265] mb-1">
              SUBSTATION DELTA · AUDIO ANALYSER MK-II
            </div>
            <h2 className="font-re-display text-lg font-bold text-[#eceae4] m-0">
              SOUND CONSOLE / FREQ ANALYSIS
            </h2>
          </div>
          <button type="button" className="re-btn" onClick={onClose} aria-label="Close">
            <span className="re-btn-circle">ESC</span>
            <span>Close</span>
          </button>
        </div>

        {/* ── Channel Tabs (Rounded Capsule Pills) ── */}
        <div className="flex items-center gap-2 pt-3 pb-4">
          {availableTabs.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => { setVmTab(tab); setScrubPos(0); }}
              className="font-sans font-semibold text-xs tracking-wider px-5 py-1.5 rounded-full border cursor-pointer transition"
              style={{
                borderColor: vmTab === tab ? 'rgba(208, 156, 98, 0.58)' : 'rgba(255,255,255,0.12)',
                background: vmTab === tab ? 'linear-gradient(90deg, rgba(132,34,34,0.84), rgba(40,14,14,0.9))' : 'rgba(255,255,255,0.04)',
                color: vmTab === tab ? '#f6efe0' : '#9c9282',
              }}
            >
              {tab}
            </button>
          ))}
          <span className="font-mono text-[11px] text-[#9c9282] ml-2">
            {profile.label}
          </span>
        </div>

        {/* ── Oscilloscope + Controls ── */}
        <div className="flex gap-6 items-start flex-wrap">
          <div className="flex-1 min-w-[260px] flex flex-col items-center">
            <div
              className="rounded-full overflow-hidden border-2 border-[#303234] bg-[#0c0d0e] shadow-inner relative"
              style={{ width: 270, height: 270 }}
            >
              <canvas
                ref={oscRef}
                width={300}
                height={300}
                style={{ display: 'block', width: '100%', height: '100%' }}
              />
              <div className="absolute bottom-2 inset-x-0 text-center font-mono text-[9px] tracking-[0.2em] text-[#6d706e]">
                DELTA-OSC-MK2
              </div>
            </div>

            {isCarrierPeak ? (
              <div className="mt-3 w-full max-w-[300px] bg-black/45 border border-[#c4a265]/35 rounded-xl px-3.5 py-2.5 font-mono text-[10px] text-[#eceae4] space-y-1">
                <div className="flex items-center justify-between text-[#e3b261] font-bold tracking-[0.14em]">
                  <span>4-FRAME BCD-MORSE TELEMETRY</span>
                  <span>{activePacket.carrierFreqKHz} kHz</span>
                </div>
                {activePacket.frames.map(f => (
                  <div key={f.idx} className="flex justify-between text-[#c8c4b8]">
                    <span>{`F${f.idx} [${f.bcd}]`}</span>
                    <span className="text-[#e3b261] tracking-widest">{f.morse}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="font-mono text-[10px] tracking-[0.15em] text-[#7c7870] mt-2.5">
                SWEEP FREQ BAND & POS TO CAPTURE CARRIER PACKET
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[240px] flex flex-col gap-4">
            {/* Frequency Band Selector (Gothic Capsule Pills) */}
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-[#b4a998] mb-2">
                FREQ BAND
              </div>
              <div className="flex gap-2">
                {BANDS.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBand(b)}
                    className="font-sans font-semibold text-xs tracking-wider px-4 py-1.5 rounded-full border cursor-pointer transition"
                    style={{
                      borderColor: band === b ? 'rgba(208, 156, 98, 0.58)' : 'rgba(255,255,255,0.12)',
                      background: band === b ? 'linear-gradient(90deg, rgba(132,34,34,0.84), rgba(40,14,14,0.9))' : 'rgba(255,255,255,0.04)',
                      color: band === b ? '#f6efe0' : '#9c9282',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrub Dial + Clean Slider + Hardware Utilities */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-[11px] text-[#c8c4b8]">
                <span>POSITION: <strong className="text-[#f5e1ba]">{scrubPos}%</strong></span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAuditionCarrier}
                    className="font-sans font-semibold text-[11px] px-3 py-1 rounded-full bg-white/8 hover:bg-white/15 border border-white/18 text-[#e5d0a4] cursor-pointer transition"
                    title="Audition carrier pulse via Web Audio"
                  >
                    Pulse Tone
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyTelemetry}
                    className="font-sans font-semibold text-[11px] px-3 py-1 rounded-full bg-white/8 hover:bg-white/15 border border-white/18 text-[#f5e1ba] cursor-pointer transition"
                    title="Copy captured spectral telemetry for external/AI decoding"
                  >
                    {copiedTelemetry ? '✓ Copied Pkt' : 'Copy Telemetry'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTelemetry}
                    className="font-sans font-semibold text-[11px] px-3 py-1 rounded-full bg-white/8 hover:bg-white/15 border border-white/18 text-[#f5e1ba] cursor-pointer transition"
                    title="Download captured spectral telemetry as a .txt file"
                  >
                    {downloadedTelemetry ? '✓ Downloaded' : 'Download Pkt'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div
                  onPointerDown={onDialPointerDown}
                  onPointerMove={onDialPointerMove}
                  onPointerUp={onDialPointerUp}
                  onPointerCancel={onDialPointerUp}
                  className="shrink-0 relative rounded-full border-2 border-[#3a3d40] cursor-grab"
                  style={{
                    width: 60,
                    height: 60,
                    background: 'radial-gradient(circle at 38% 35%, #2a2c2e, #121314)',
                    userSelect: 'none',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    width: 2, height: 22,
                    background: '#c4a265',
                    transformOrigin: '1px 0',
                    transform: `translateX(-50%) rotate(${scrubPos * 2.7 - 135}deg)`,
                  }} />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={scrubPos}
                  onChange={e => setScrubPos(Number(e.target.value))}
                  className="w-full accent-[#c4a265] cursor-pointer"
                />
              </div>
            </div>

            {/* Clear Readout Status Box (non-spoiling hardware telemetry) */}
            <div className="bg-black/35 border border-white/10 p-3 font-mono text-xs space-y-1 text-[#c8c4b8]">
              <div className="text-[10px] text-[#c4a265] tracking-widest mb-1">STATUS</div>
              <div>{`FILE: ${vmTab}  ·  BAND: ${band}`}</div>
              <div>
                SIGNAL:{' '}
                <span className={isCarrierPeak ? 'text-[#e3b261] font-bold' : 'text-[#9c9890]'}>
                  {isCarrierPeak ? `CARRIER LOCK (${profile.carrierFreqKHz} kHz)` : band === 'HIGH' ? 'HARMONIC PRESENT' : 'AMBIENT FLOOR'}
                </span>
              </div>
              <div>
                PACKET:{' '}
                <span className={isCarrierPeak ? 'text-[#e3b261]' : 'text-[#9c9890]'}>
                  {isCarrierPeak ? 'BCD-8421 / MORSE READY (VERIFY SOURCE LOG)' : 'ALIGN BAND & POSITION FOR PEAK'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Waveform Strip ── */}
        <div className="mt-4">
          <div className="font-mono text-[10px] tracking-[0.16em] text-[#b4a998] mb-1.5">
            WAVEFORM STRIP — {vmTab} / {band} BAND
          </div>
          <div className="border border-white/15 bg-[#0c0d0e] overflow-hidden">
            <canvas
              ref={stripRef}
              width={700}
              height={56}
              style={{ display: 'block', width: '100%', height: 56 }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10px] text-[#8d8a82] mt-1">
            <span>0:00</span>
            <span className="text-[#c4a265]">pos {scrubPos}%</span>
            <span>4:17</span>
          </div>
        </div>

        {/* ── Code Entry Bar ── */}
        <div className="mt-4 pt-4 border-t border-white/10">
          {isSolved && (
            <div className="font-mono text-xs tracking-widest text-[#e5d0a4] font-bold">
              ✓ CODE VERIFIED — RECORD LOCKED
            </div>
          )}
          {isExhausted && !isSolved && (
            <div className="font-mono text-xs tracking-widest text-[#ef7b7b] font-bold">
              ✗ MAXIMUM ATTEMPTS EXCEEDED — ACCESS REVOKED
            </div>
          )}
          {!isSolved && !isExhausted && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {errorMsg && <div className="font-mono text-xs text-[#fca5a5] mb-1">✗ {errorMsg}</div>}
                <span className="font-mono text-[11px] text-[#9c9890]">ATTEMPTS REMAINING: {attemptsLeft}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[#eceae4] whitespace-nowrap">
                  {clueState?.stages?.[0]?.prompt || 'ENTER FOUR-DIGIT CODE:'}
                </span>
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => { setInputValue(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }}
                  onKeyDown={handleKeyDown}
                  maxLength={4}
                  autoFocus
                  placeholder={blink ? '____' : '0000'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="bg-black/55 border-b-2 border-[#c4a265] text-[#f5e1ba] font-mono text-sm tracking-[0.25em] outline-none py-1 text-center"
                  style={{ width: 88, flex: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitted || inputValue.length !== 4}
                  className="re-btn disabled:opacity-40"
                >
                  <span className="re-btn-circle">↵</span>
                  <span>SUBMIT</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


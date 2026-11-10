import React, { useEffect, useRef, useState } from 'react';
import { Camera, Film, Radio, Eye } from 'lucide-react';
import {
  copyDocumentText,
  downloadDocumentFile,
  formatDocumentText,
  formatEvidenceBundleText,
  sanitizeExportFilename,
} from '../../engine/evidenceExport';

const CAMERAS = [
  {
    id: 'CAM-01',
    zone: 'ENTRY AIRLOCK // 05A',
    stamp: '14 FLR · SEC-05',
    date: '08-21-83',
    status: 'LOCKED',
    anomaly: false,
    seed: 11,
    logTitle: 'Airlock Bulkhead — 22:55 Shift Check',
    logBody: 'Exterior pressure hatch magnetically engaged from Sector 4 relay. Steel Control 5B bulkhead isolates inside terminal bay from corridor surges.',
    irClue: 'IR THERMAL CHECK: Bulkhead steel absorbs external entity knocks at Z = 2.15m; no biological cross-bleed into Control 5B.',
    events: [
      '22:55:10 — Magnetic bolt engaged (MANUAL OVERRIDE: MC)',
      '23:12:44 — Heavy impact spike recorded outside 5B door (84 dB)',
      '23:41:02 — Corridor motion sensor triggered near ceiling grate',
    ],
  },
  {
    id: 'CAM-02',
    zone: 'CONTROL BAY // 05B',
    stamp: '14 FLR · CTRL (SAFE)',
    date: '08-21-83',
    status: 'SAFE ZONE · LIVE',
    anomaly: false,
    seed: 23,
    logTitle: 'Operator Desk — Safe Zone & Blackout Audit',
    logBody: 'CRT maintenance memo MNT-83-311 notes main display bus refuses power-down. Curfew seal began at 1983-08-14 23:00; only one Research scholar kept logging in afterward.',
    irClue: 'IR FORENSIC TRACE: Pre-curfew test pings (`21:18` or earlier) and Terminated accounts are decoys; filter Personnel CSV after 23:00 blackout.',
    events: [
      '23:01:09 — Terminal login registered under [REDACTED BADGE] (STATUS: ACTIVE)',
      '23:18:30 — Wing 5C reel-to-reel transport triggered remotely',
      '23:44:12 — Steel door bolts held against exterior scratching',
    ],
  },
  {
    id: 'CAM-03',
    zone: 'LOCKER ANNEX // 05C',
    stamp: 'B2 FLR · ANNEX',
    date: '08-21-83',
    status: 'DIM',
    anomaly: true,
    seed: 37,
    logTitle: 'East-West Relay & Radio Wing — Header Audit',
    logBody: 'Locker Annex houses the Field Radio Console (north wall beside the Akai reel cart). Several transmissions falsify relay paths — authenticate via X-Auth Base64 headers.',
    irClue: 'IR SPECTRUM NOTE: Match decoded Base64 X-Auth header (`Qm...`) against the active post-curfew Research badge from Control 5B.',
    events: [
      '21:40:18 — Cabinet door #4 unlatched after breaker fluctuation',
      '23:05:51 — Conflicting VM-A vs VM-B directives logged on teletype reel',
      '23:39:22 — Temperature drop -6.4 C logged along North locker bank',
    ],
  },
  {
    id: 'CAM-04',
    zone: 'CONTAINMENT GLASS // 05D',
    stamp: 'B2 FLR · CH-03',
    date: '08-21-83',
    status: 'BREACH RISK',
    anomaly: true,
    seed: 53,
    logTitle: 'Observation Hallway — Chamber 3 Seal',
    logBody: 'Reinforced stained glass separates Observation Wing 5D from Chamber 3 shaft. Sound Console sits against the clear north alcove inside Wing 5D.',
    irClue: 'IR ACOUSTIC TRACE: Both voicemail reels emit 4-frame BCD-Morse packets under HIGH band, but only one matches the proven Radio Log channel.',
    events: [
      '23:19:03 — Silhouette registered behind tinted glass pane (height ~1.88m)',
      '23:27:49 — Condensation palm smears appeared from INSIDE glass wall',
      '23:42:15 — Ultrasonic pulse bursts detected on Loop 7-C',
    ],
  },
  {
    id: 'CAM-05',
    zone: 'CRYO WING // 05E CORRIDOR',
    stamp: 'B2 FLR · CRYO-5E',
    date: '08-21-83',
    status: 'ANOMALY',
    anomaly: true,
    seed: 71,
    logTitle: 'Cryo Autopsy Wing — Specimen Patrol',
    logBody: 'Repeated VHS signal dropout at 7.420 MHz. Brass deadbolt key resting inside Suite 5E opens Chamber 3, triggering aggressive corridor sweeps by Specimen S-011.',
    irClue: 'IR TIMELINE NOTE: Low and mid audio bands mask static; scrub above middle voice ceiling past two-thirds displacement to capture the 4-frame BCD quartet.',
    events: [
      'R+11:04:19;04 — Hallway clear under surgical ceiling strobe',
      'R+11:04:22;18 — 1.4s tracking tear; pale gaunt figure lunging south',
      'R+11:04:25;20 — [HIGH-BAND ULTRASONIC BURST — DECODE BCD-8421 / MORSE]',
    ],
  },
  {
    id: 'CAM-06',
    zone: 'CHAMBER 3 & VAULT // 05F',
    stamp: 'B2 FLR · CH3/5F',
    date: '08-21-83',
    status: 'INTERFERENCE',
    anomaly: true,
    seed: 89,
    logTitle: 'Relay Vault & Chamber 3 — Live Threat Origin',
    logBody: 'Primary entity lair inside Chamber 3 & Relay Vault 5F. Relay cabinet in 5F holds missing closure transmission slips.',
    irClue: 'IR SANCTUARY CHECK: If pursued from 5F/5E/5D, sprint south back past 5A into Control 5B bulkhead to force entity retreat.',
    events: [
      '23:40:00 — Generator hum fluctuating along North-West bulkhead',
      '23:43:11 — Subject pacing perimeter near Chamber 3 steel bed',
      '23:45:00 — SIGNAL HIJACKED // LIVE RADAR ACTIVE',
    ],
  },
];

function drawCCTVFrame(canvas, cam, tick, glitchLevel, liveEntityHere, irEnhanced) {
  if (!canvas) return;
  const ctx = canvas.getContext?.('2d');
  if (!ctx || typeof ctx.createLinearGradient !== 'function') return;
  const W = canvas.width;
  const H = canvas.height;

  // Analog bunker surveillance feed — infrared thermal mode highlights active threats in crimson/amber
  const isHotAlert = liveEntityHere || cam.id === 'CAM-04' || cam.id === 'CAM-06';
  const baseTone = irEnhanced ? (isHotAlert ? '#170606' : '#061012') : (isHotAlert ? '#120909' : '#090b0c');
  ctx.fillStyle = baseTone;
  ctx.fillRect(0, 0, W, H);

  const vx = W * (0.5 + Math.sin(cam.seed) * 0.03);
  const vy = H * (0.42 + Math.cos(cam.seed) * 0.025);
  const flicker = 0.84 + 0.16 * Math.sin(tick * 0.42 + cam.seed);

  // Subtle ceiling fluor-lamp wash + vignette darkness
  const roomWash = ctx.createRadialGradient(vx, vy + 18, 12, vx, vy + 10, W * 0.62);
  roomWash.addColorStop(
    0,
    liveEntityHere
      ? `rgba(180, 40, 40, ${0.42 * flicker})`
      : irEnhanced
      ? `rgba(196, 162, 101, ${0.28 * flicker})`
      : isHotAlert
      ? `rgba(118, 34, 34, ${0.34 * flicker})`
      : `rgba(155, 168, 160, ${0.24 * flicker})`
  );
  roomWash.addColorStop(0.42, isHotAlert ? `rgba(42, 14, 14, ${0.22 * flicker})` : `rgba(42, 48, 46, ${0.18 * flicker})`);
  roomWash.addColorStop(1, 'rgba(3, 3, 4, 0.96)');
  ctx.fillStyle = roomWash;
  ctx.fillRect(0, 0, W, H);

  // Overhead bunker doorway framing
  const wallShadowL = ctx.createLinearGradient(0, 0, vx * 0.58, 0);
  wallShadowL.addColorStop(0, 'rgba(4, 4, 5, 0.92)');
  wallShadowL.addColorStop(1, 'rgba(4, 4, 5, 0)');
  ctx.fillStyle = wallShadowL;
  ctx.fillRect(0, 0, vx * 0.62, H);

  const wallShadowR = ctx.createLinearGradient(W, 0, W - vx * 0.58, 0);
  wallShadowR.addColorStop(0, 'rgba(4, 4, 5, 0.92)');
  wallShadowR.addColorStop(1, 'rgba(4, 4, 5, 0)');
  ctx.fillStyle = wallShadowR;
  ctx.fillRect(W - vx * 0.62, 0, vx * 0.62, H);

  // Floor reflection streak
  const floorGlow = ctx.createLinearGradient(vx, vy + 24, vx, H);
  floorGlow.addColorStop(0, isHotAlert ? 'rgba(95, 22, 22, 0.22)' : 'rgba(130, 142, 134, 0.14)');
  floorGlow.addColorStop(1, 'rgba(2, 2, 3, 0.88)');
  ctx.fillStyle = floorGlow;
  ctx.fillRect(vx * 0.42, vy + 24, W - vx * 0.84, H - (vy + 24));

  // Analog IR anomaly signature: driven by REAL ghost location or historical tape spikes
  const showGhost = liveEntityHere || (cam.anomaly && (
    (cam.id === 'CAM-05' && (tick % 48) > 22)
    || (cam.id === 'CAM-04' && (tick % 36) > 16)
    || (cam.id === 'CAM-03' && (tick % 60) > 42)
  ));
  if (showGhost) {
    const scale = liveEntityHere ? 1.45 : cam.id === 'CAM-06' ? 1.25 : 0.85;
    const gx = vx + Math.sin(tick * 0.09 + cam.seed) * 14;
    const gy = vy + 14 * scale;

    const shadowMass = ctx.createRadialGradient(gx, gy, 6 * scale, gx, gy + 16 * scale, 64 * scale);
    shadowMass.addColorStop(0, 'rgba(0, 0, 0, 0.96)');
    shadowMass.addColorStop(0.55, 'rgba(5, 4, 5, 0.78)');
    shadowMass.addColorStop(1, 'rgba(5, 4, 5, 0)');
    ctx.fillStyle = shadowMass;
    ctx.beginPath();
    ctx.ellipse(gx, gy + 10 * scale, 34 * scale, 72 * scale, Math.sin(tick * 0.05) * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal EMI interference smear slicing through anomaly
    ctx.fillStyle = liveEntityHere ? 'rgba(220, 58, 58, 0.26)' : 'rgba(210, 218, 212, 0.14)';
    for (let s = 0; s < 5; s++) {
      const sy = gy - 42 * scale + ((s * 23 + tick * 7) % (90 * scale));
      const sw = (28 + ((s * 17 + tick) % 34)) * scale;
      ctx.fillRect(gx - sw * 0.5, sy, sw, 2);
    }

    if (liveEntityHere || (glitchLevel > 0.35 && tick % 3 !== 0)) {
      ctx.fillStyle = 'rgba(245, 195, 165, 0.75)';
      ctx.fillRect(gx - 5 * scale, gy - 38 * scale, 2, 2);
      ctx.fillRect(gx + 3 * scale, gy - 38 * scale, 2, 2);
    }

    // Motion tracker targeting bracket around live anomaly
    ctx.strokeStyle = liveEntityHere ? 'rgba(235, 72, 72, 0.88)' : 'rgba(208, 172, 114, 0.45)';
    ctx.lineWidth = liveEntityHere ? 1.4 : 1;
    const bx = gx - 28 * scale;
    const by = gy - 48 * scale;
    const bw = 56 * scale;
    const bh = 98 * scale;
    const brk = 8;
    ctx.beginPath();
    ctx.moveTo(bx, by + brk); ctx.lineTo(bx, by); ctx.lineTo(bx + brk, by);
    ctx.moveTo(bx + bw - brk, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + brk);
    ctx.moveTo(bx, by + bh - brk); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + brk, by + bh);
    ctx.moveTo(bx + bw - brk, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - brk);
    ctx.stroke();

    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = liveEntityHere ? 'rgba(252, 130, 130, 0.95)' : 'rgba(218, 188, 132, 0.8)';
    ctx.fillText(
      liveEntityHere ? `LIVE BIOMETRIC LOCK · DELTA +${(68 + ((tick * 3) % 25)).toFixed(0)}%` : `ARCHIVE MOTION +${(42 + ((tick * 3) % 29)).toFixed(0)}%`,
      18,
      H - 54
    );
  }

  // Optical framing crosshairs
  ctx.strokeStyle = irEnhanced ? 'rgba(208, 162, 101, 0.28)' : 'rgba(220, 215, 204, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.5 - 10, H * 0.5); ctx.lineTo(W * 0.5 + 10, H * 0.5);
  ctx.moveTo(W * 0.5, H * 0.5 - 10); ctx.lineTo(W * 0.5, H * 0.5 + 10);
  ctx.stroke();

  // VHS Static snow
  ctx.globalAlpha = 1;
  for (let i = 0; i < 420; i++) {
    const nx = ((i * 73 + tick * 19) % W);
    const ny = ((i * 41 + tick * 13) % H);
    const bright = (i + tick) % 3 === 0 ? 220 : 120;
    ctx.fillStyle = `rgba(${bright},${bright + 10},${bright}, ${0.08 + glitchLevel * 0.16})`;
    ctx.fillRect(nx, ny, 2 + (i % 4), 1);
  }
  if (glitchLevel > 0.35 || (tick % 29 === 0)) {
    const tearY = (tick * 23) % H;
    ctx.fillStyle = 'rgba(210, 235, 220, 0.22)';
    ctx.fillRect(0, tearY, W, 6);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, (tearY + 12) % H, W, 4);
  }

  // CRT Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }

  // VHS On-Screen Display
  ctx.font = 'bold 14px "Courier Prime", "Courier New", monospace';
  ctx.fillStyle = 'rgba(240, 245, 240, 0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 4;
  ctx.fillText(cam.zone, 18, 28);

  if (Math.floor(tick / 6) % 2 === 0) {
    ctx.fillStyle = liveEntityHere ? '#ef4444' : '#dc2626';
    ctx.beginPath(); ctx.arc(W - 64, 22, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(240, 245, 240, 0.9)';
  ctx.fillText(liveEntityHere ? 'LIVE ●' : 'PLAY ►', W - 52, 27);

  ctx.fillText(cam.stamp, 18, H - 36);
  ctx.fillText(irEnhanced ? `${cam.date} · IR TRACE ON` : cam.date, 18, H - 18);

  const fSec = String(20 + (Math.floor(tick / 4) % 40)).padStart(2, '0');
  const fFrm = String((tick * 3) % 30).padStart(2, '0');
  const tc = `R+11:04:${fSec};${fFrm}`;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(W - 164, H - 34, 148, 22);
  ctx.fillStyle = liveEntityHere ? '#f87171' : cam.anomaly ? '#fca5a5' : '#f3f4f6';
  ctx.fillText(tc, W - 156, H - 18);
  ctx.shadowBlur = 0;
}

export default function CCTVMonitorModal({
  isOpen,
  onClose,
  ghostTelemetry = null,
  droppedItems = [],
  collectedIds = [],
}) {
  const [selectedId, setSelectedId] = useState('CAM-05');
  const [tick, setTick] = useState(0);
  const [irEnhanced, setIrEnhanced] = useState(true);
  const [copiedCam, setCopiedCam] = useState(false);
  const [downloadedCam, setDownloadedCam] = useState(false);
  const [downloadedAllCams, setDownloadedAllCams] = useState(false);
  const canvasRef = useRef(null);

  const selectedCam = CAMERAS.find(c => c.id === selectedId) || CAMERAS[0];
  const ghostCamId = ghostTelemetry?.camId || null;
  const liveEntityHere = ghostCamId === selectedCam.id;

  useEffect(() => {
    if (!isOpen) return undefined;
    const iv = setInterval(() => setTick(t => t + 1), 110);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(iv);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const glitch = (liveEntityHere || selectedCam.anomaly) && (tick % 19 === 0 || tick % 23 === 0) ? 0.75 : 0.15;
    drawCCTVFrame(canvasRef.current, selectedCam, tick, glitch, liveEntityHere, irEnhanced);
  }, [isOpen, selectedCam, tick, liveEntityHere, irEnhanced]);

  if (!isOpen) return null;

  const camExportPayload = {
    id: selectedCam.id,
    title: `${selectedCam.id} — ${selectedCam.logTitle}`,
    corner_mark: `${selectedCam.stamp} // ${selectedCam.date}`,
    classification: `SURVEILLANCE FEED (${selectedCam.status})`,
    location: selectedCam.zone,
    lines: [selectedCam.logBody],
    events: selectedCam.events,
    highlight: selectedCam.irClue,
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-[95vw] max-w-[960px] flex flex-col gap-3.5"
        onClick={e => e.stopPropagation()}
      >
        {/* Minimal RE2R Translucent Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 px-1">
          <div className="flex items-center gap-3">
            <Film className="w-5 h-5 text-[#d47474]" />
            <div>
              <div className="text-[10px] tracking-[0.2em] text-[#b4a998] uppercase">
                DELTA BUNKER · VHS SECURITY FEED
              </div>
              <h2 className="font-re-display text-lg font-bold text-[#eceae4] m-0">
                SURVEILLANCE MONITOR BANK
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ghostTelemetry && (
              <div className="px-3.5 py-1 rounded-full bg-black/70 border border-[#9a2a2a]/60 text-[11px] font-mono text-[#fca5a5] flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 animate-pulse text-[#ef4444]" />
                <span>ENTITY TRACKED: {ghostTelemetry.camId} ({ghostTelemetry.isHunting ? 'HUNTING' : 'PATROL'})</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIrEnhanced(prev => !prev)}
              className="re-btn"
              title="Toggle IR Forensic Layer on Camera Feed"
            >
              <span className="re-btn-circle"><Eye className="w-3 h-3" /></span>
              <span>{irEnhanced ? 'IR Trace: ON' : 'IR Trace: OFF'}</span>
            </button>
            <button type="button" className="re-btn" onClick={onClose} aria-label="Close">
              <span className="re-btn-circle">ESC</span>
              <span>Put Down</span>
            </button>
          </div>
        </div>

        {/* Gothic Capsule Channel Pills */}
        <div className="flex flex-wrap gap-2">
          {CAMERAS.map(cam => {
            const active = cam.id === selectedCam.id;
            const hasGhost = ghostCamId === cam.id;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={() => setSelectedId(cam.id)}
                className="px-4 py-1.5 rounded-full text-xs font-sans border transition cursor-pointer flex items-center gap-1.5"
                style={{
                  background: active ? 'linear-gradient(90deg, rgba(132,34,34,0.82), rgba(40,14,14,0.9))' : 'rgba(16, 14, 13, 0.8)',
                  borderColor: hasGhost ? 'rgba(239, 68, 68, 0.78)' : active ? 'rgba(208, 156, 98, 0.6)' : 'rgba(255,255,255,0.12)',
                  color: active ? '#f7f0e3' : '#a8a094',
                }}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="font-semibold">{cam.id}</span>
                {hasGhost ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-950 text-[#fca5a5] text-[9px] font-bold animate-pulse">LIVE</span>
                ) : cam.anomaly ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Live Radar + VHS Feed + Pinned Cream Ruled Index Card Log */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-start overflow-y-auto pr-1" style={{ maxHeight: '72vh' }}>
          <div className="md:col-span-3 flex flex-col gap-2.5">
            <div className="rounded-xl border border-white/15 bg-black overflow-hidden shadow-2xl relative">
              <canvas
                ref={canvasRef}
                width={520}
                height={330}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans px-1 text-[#b4aba0]">
              <span>STATUS: <strong className={liveEntityHere || selectedCam.anomaly ? 'text-[#f87171]' : 'text-[#a8d5a2]'}>{liveEntityHere ? 'LIVE ENTITY DETECTED' : selectedCam.status}</strong></span>
              <span>{droppedItems.length > 0 ? `${droppedItems.length} DROPPED EVIDENCE ON FLOOR` : `COLLECTED: ${collectedIds.filter(id => String(id).startsWith('EC')).length}/8`}</span>
            </div>

            {/* Compact Tactical Bunker Wing Status Map */}
            <div className="rounded-xl bg-black/55 border border-white/10 p-2.5 grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px] font-mono">
              {CAMERAS.map(cam => {
                const entityPresent = ghostCamId === cam.id;
                const isSafe = cam.id === 'CAM-02';
                return (
                  <button
                    key={`map_${cam.id}`}
                    type="button"
                    onClick={() => setSelectedId(cam.id)}
                    className="px-2 py-1.5 rounded-full border text-center transition cursor-pointer"
                    style={{
                      background: entityPresent ? 'rgba(154, 42, 42, 0.36)' : isSafe ? 'rgba(196, 162, 101, 0.14)' : 'rgba(255,255,255,0.03)',
                      borderColor: entityPresent ? 'rgba(239, 68, 68, 0.65)' : isSafe ? 'rgba(196, 162, 101, 0.45)' : 'rgba(255,255,255,0.1)',
                      color: entityPresent ? '#fca5a5' : isSafe ? '#e5d0a4' : '#9c958a',
                    }}
                  >
                    <div className="font-bold">{cam.id.replace('CAM-', 'C')}</div>
                    <div className="text-[9px] truncate">{isSafe ? 'SAFE 5B' : entityPresent ? 'THREAT' : 'CLEAR'}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="ruled-index-card rounded-sm p-5 pt-7 relative rotate-[0.6deg]">
              <div className="push-pin absolute top-2.5 left-1/2 -translate-x-1/2" />
              <div className="flex items-center justify-between border-b border-black/20 pb-2 mb-3">
                <span className="font-re-typewriter text-xs font-bold text-[#4a3622]">{selectedCam.id} NOTE</span>
                <span className="re-stamp-badge">{liveEntityHere ? 'LIVE THREAT' : selectedCam.anomaly ? 'ANOMALY' : 'ROUTINE'}</span>
              </div>
              <h3 className="font-re-typewriter text-sm font-bold text-[#1c150f] mb-2">{selectedCam.logTitle}</h3>
              <p className="font-re-typewriter text-xs leading-relaxed text-[#2b2016] mb-3">{selectedCam.logBody}</p>
              <div className="space-y-1.5 border-t border-black/15 pt-2 mb-3">
                {selectedCam.events.map((evLine, i) => (
                  <div key={i} className="font-re-typewriter text-[11px] text-[#2b2016] pl-2 border-l-2 border-[#7c1d1d]">
                    {evLine}
                  </div>
                ))}
              </div>
              {irEnhanced && (
                <div className="mt-2 p-2.5 bg-black/5 border border-[#7c1d1d]/30 font-re-typewriter text-[11px] text-[#4a1818] font-bold">
                  {selectedCam.irClue}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={async () => {
                  const text = formatDocumentText(camExportPayload);
                  await copyDocumentText(text);
                  setCopiedCam(true);
                  setTimeout(() => setCopiedCam(false), 1800);
                }}
                className="re-btn"
              >
                <span className="re-btn-circle">{copiedCam ? '✓' : '⎘'}</span>
                <span>{copiedCam ? 'Copied Feed' : 'Copy Log'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = formatDocumentText(camExportPayload);
                  downloadDocumentFile(sanitizeExportFilename(selectedCam.id, selectedCam.logTitle), text);
                  setDownloadedCam(true);
                  setTimeout(() => setDownloadedCam(false), 1800);
                }}
                className="re-btn"
              >
                <span className="re-btn-circle">{downloadedCam ? '✓' : '⬇'}</span>
                <span>{downloadedCam ? 'Downloaded' : 'Download Log'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const allFeeds = CAMERAS.map((c) => ({
                    id: c.id,
                    title: `${c.id} — ${c.logTitle}`,
                    corner_mark: `${c.stamp} // ${c.date}`,
                    classification: `SURVEILLANCE FEED (${c.status})`,
                    location: c.zone,
                    lines: [c.logBody],
                    events: c.events,
                    highlight: c.irClue,
                  }));
                  downloadDocumentFile('delta_cctv_all_6_feeds.txt', formatEvidenceBundleText(allFeeds));
                  setDownloadedAllCams(true);
                  setTimeout(() => setDownloadedAllCams(false), 1800);
                }}
                className="re-btn"
              >
                <span className="re-btn-circle">{downloadedAllCams ? '✓' : '⬇'}</span>
                <span>{downloadedAllCams ? 'All 6 Saved' : 'Download All 6'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

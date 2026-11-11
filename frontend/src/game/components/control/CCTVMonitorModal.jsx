import React, { useEffect, useRef, useState } from 'react';
import { Camera, Film, Radio, Eye, MapPin } from 'lucide-react';
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
    logBody: 'Exterior hatch sealed. Central Anteroom connects Bay 5B south door, West Annex 5C corridor, and East Core Airlock Vault Exit.',
    irClue: 'ROUTE NOTE: Cross the timber planks to reach Wing 5C doors; return east after solving all 3 terminals to open the Vault Exit.',
    events: [
      '22:55:10 — Magnetic bolt engaged on Vault Exit Hatch',
      '23:12:44 — Heavy impact spike outside Control Bay 5B door (84 dB)',
      '23:41:02 — Corridor motion sensor triggered near ceiling camera',
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
    logBody: 'Main display bus refuses power-down. Multiple unauthorized logins detected past facility curfew hours inside Control Bay 5B.',
    irClue: 'IR FORENSIC TRACE: Inspect the Staff Terminal Personnel Index alongside collected evidence fragments. Specimen S-011 cannot breach Control Bay 5B steel doors.',
    events: [
      '23:01:09 — Terminal login registered under [REDACTED BADGE] (STATUS: ACTIVE)',
      '23:18:30 — Fuse breaker tripping across East Wall panel',
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
    logBody: 'Locker Annex houses the Field Radio Console and Akai tape deck along the north bench, plus corridors west to Observation 5D and north into Cryo Suite 5E.',
    irClue: 'IR SPECTRUM NOTE: Match decoded Base64 X-Auth header (`Qm...`) against the verified badge.',
    events: [
      '21:40:18 — Cabinet door unlatched near North bench',
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
    logBody: 'Reinforced stained glass separates Observation Lab 5D from Chamber 3 cell. Sound Console sits against the north wall partition.',
    irClue: 'IR ACOUSTIC TRACE: Both voicemail reels emit 4-frame BCD-Morse packets under HIGH band; match the file verified at the Radio Console.',
    events: [
      '23:19:03 — Silhouette registered behind tinted observation pane',
      '23:27:49 — Condensation palm smears from Chamber 3 glass',
      '23:42:15 — Ultrasonic pulse bursts logged on floor conduit',
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
    logBody: 'Directly north of Annex 5C. Contains Cryo Autopsy Gurney, Instrument Table, and a connecting west passage into Relay Vault 5F.',
    irClue: 'IR TIMELINE NOTE: Low and mid audio bands mask static; scrub above middle voice ceiling past two-thirds displacement to capture the 4-frame digits.',
    events: [
      'R+11:04:19;04 — Strobe flash across surgical table',
      'R+11:04:22;18 — 1.4s tracking tear; entity passing west doorway',
      'R+11:04:25;20 — [HIGH-BAND ULTRASONIC BURST — DECODE BCD-8421]',
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
    logBody: 'North-West sector housing Twin Relay Racks, Backup Diesel Generator, and Bio-Containment Cell (Chamber 3).',
    irClue: 'IR SANCTUARY CHECK: If pursued in outer wings, sprint south back past Anteroom 5A into Control Bay 5B.',
    events: [
      '23:40:00 — Backup generator humming beside north Relay Racks',
      '23:43:11 — Subject pacing perimeter near Chamber 3 bed',
      '23:45:00 — SIGNAL HIJACKED // LIVE RADAR ACTIVE',
    ],
  },
];

// Draw authentic architectural perspective view for each camera feed so cameras show real bunker layout & landmarks
function drawRoomArchitecture(ctx, W, H, camId, strokeCol, fillAccent) {
  ctx.save();
  ctx.strokeStyle = strokeCol;
  ctx.fillStyle = fillAccent;
  ctx.lineWidth = 1.15;

  // Perspective corridor vanishing walls + ceiling ribs
  const lx = W * 0.22;
  const rx = W * 0.78;
  const ty = H * 0.22;
  const by = H * 0.76;

  ctx.beginPath();
  ctx.strokeRect(lx, ty, rx - lx, by - ty);
  ctx.moveTo(0, 0); ctx.lineTo(lx, ty);
  ctx.moveTo(W, 0); ctx.lineTo(rx, ty);
  ctx.moveTo(0, H); ctx.lineTo(lx, by);
  ctx.moveTo(W, H); ctx.lineTo(rx, by);
  ctx.stroke();

  ctx.font = 'bold 10px "Courier New", monospace';

  if (camId === 'CAM-01') {
    // Vault bulkhead hatch + planks over pit
    ctx.strokeRect(W * 0.62, H * 0.30, W * 0.14, H * 0.44);
    ctx.beginPath(); ctx.arc(W * 0.69, H * 0.52, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(W * 0.30, H * 0.72, W * 0.24, H * 0.08);
    ctx.fillText('[VAULT EXIT]', W * 0.61, H * 0.27);
    ctx.fillText('[CORRIDOR PLANKS]', W * 0.28, H * 0.85);
  } else if (camId === 'CAM-02') {
    // Operator desk + PC + wall board + chair + fuse cabinet
    ctx.strokeRect(W * 0.25, H * 0.46, W * 0.22, H * 0.26);
    ctx.strokeRect(W * 0.28, H * 0.36, 30, 22);
    ctx.strokeRect(W * 0.40, H * 0.28, 28, 22);
    ctx.strokeRect(W * 0.32, H * 0.60, 24, 24);
    ctx.strokeRect(W * 0.68, H * 0.30, 26, 38);
    ctx.fillText('[STAFF WORKSTATION]', W * 0.24, H * 0.33);
    ctx.fillText('[NORTH WALL]', W * 0.41, H * 0.25);
    ctx.fillText('[EAST CABINET]', W * 0.62, H * 0.27);
  } else if (camId === 'CAM-03') {
    // North Radio workbench + Akai Tape Deck + Cryo doorway left
    ctx.strokeRect(W * 0.25, H * 0.28, W * 0.14, H * 0.48);
    ctx.strokeRect(W * 0.43, H * 0.46, W * 0.30, H * 0.24);
    ctx.strokeRect(W * 0.45, H * 0.36, 36, 22);
    ctx.strokeRect(W * 0.60, H * 0.33, 34, 28);
    ctx.beginPath(); ctx.arc(W * 0.65, H * 0.41, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W * 0.72, H * 0.41, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillText('[5E CORRIDOR]', W * 0.24, H * 0.25);
    ctx.fillText('[RADIO BENCH]', W * 0.44, H * 0.31);
  } else if (camId === 'CAM-04') {
    // Observation glass pane + north console desk
    ctx.strokeRect(W * 0.24, H * 0.30, W * 0.16, H * 0.32);
    ctx.strokeRect(W * 0.50, H * 0.44, W * 0.22, H * 0.26);
    ctx.strokeRect(W * 0.53, H * 0.34, 34, 22);
    ctx.strokeRect(W * 0.30, H * 0.68, 42, 18);
    ctx.fillText('[CH-3 WINDOW]', W * 0.23, H * 0.27);
    ctx.fillText('[5D GALLERY]', W * 0.50, H * 0.31);
  } else if (camId === 'CAM-05') {
    // Cryo gurney + steel exam table + west vault door
    ctx.strokeRect(W * 0.24, H * 0.30, W * 0.12, H * 0.46);
    ctx.strokeRect(W * 0.48, H * 0.50, W * 0.24, H * 0.20);
    ctx.strokeRect(W * 0.44, H * 0.60, W * 0.14, H * 0.14);
    ctx.fillText('[TO 5F VAULT]', W * 0.23, H * 0.26);
    ctx.fillText('[CRYO BAY 5E]', W * 0.50, H * 0.46);
  } else if (camId === 'CAM-06') {
    // Twin tall Steel Relay Racks + Diesel Generator
    ctx.strokeRect(W * 0.26, H * 0.27, W * 0.14, H * 0.48);
    ctx.strokeRect(W * 0.42, H * 0.27, W * 0.14, H * 0.48);
    for (let y = 0.32; y <= 0.68; y += 0.08) {
      ctx.strokeRect(W * 0.28, H * y, W * 0.10, 8);
      ctx.strokeRect(W * 0.44, H * y, W * 0.10, 8);
    }
    ctx.strokeRect(W * 0.60, H * 0.44, W * 0.16, H * 0.30);
    ctx.fillText('[RELAY VAULT 5F]', W * 0.26, H * 0.23);
    ctx.fillText('[GENERATOR]', W * 0.60, H * 0.41);
  }
  ctx.restore();
}

function drawCCTVFrame(canvas, cam, tick, glitchLevel, liveEntityHere, irEnhanced) {
  if (!canvas) return;
  const ctx = canvas.getContext?.('2d');
  if (!ctx || typeof ctx.createLinearGradient !== 'function') return;
  const W = canvas.width;
  const H = canvas.height;

  const isHotAlert = liveEntityHere || cam.id === 'CAM-04' || cam.id === 'CAM-06';
  const baseTone = irEnhanced ? (isHotAlert ? '#150808' : '#081314') : (isHotAlert ? '#100909' : '#090c0c');
  ctx.fillStyle = baseTone;
  ctx.fillRect(0, 0, W, H);

  const vx = W * 0.5;
  const vy = H * 0.46;
  const flicker = 0.86 + 0.14 * Math.sin(tick * 0.42 + cam.seed);

  const roomWash = ctx.createRadialGradient(vx, vy, 18, vx, vy, W * 0.65);
  roomWash.addColorStop(
    0,
    liveEntityHere
      ? `rgba(185, 42, 42, ${0.36 * flicker})`
      : irEnhanced
      ? `rgba(196, 162, 101, ${0.22 * flicker})`
      : `rgba(140, 175, 155, ${0.20 * flicker})`
  );
  roomWash.addColorStop(1, 'rgba(3, 4, 4, 0.94)');
  ctx.fillStyle = roomWash;
  ctx.fillRect(0, 0, W, H);

  // Render real architectural layout per room camera
  drawRoomArchitecture(
    ctx,
    W,
    H,
    cam.id,
    irEnhanced ? 'rgba(222, 184, 118, 0.52)' : 'rgba(154, 198, 168, 0.42)',
    irEnhanced ? 'rgba(240, 206, 146, 0.85)' : 'rgba(196, 232, 204, 0.80)'
  );

  // Live Entity Thermal Lock (only when entity is actually in this camera or anomaly archive triggers)
  const showGhost = liveEntityHere || (cam.anomaly && ((tick % 56) > 40));
  if (showGhost) {
    const scale = liveEntityHere ? 1.25 : 0.82;
    const gx = vx + Math.sin(tick * 0.08 + cam.seed) * 26;
    const gy = vy + 10;

    const shadowMass = ctx.createRadialGradient(gx, gy, 5, gx, gy + 12, 54 * scale);
    shadowMass.addColorStop(0, liveEntityHere ? 'rgba(165, 22, 22, 0.88)' : 'rgba(12, 12, 14, 0.85)');
    shadowMass.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowMass;
    ctx.beginPath();
    ctx.ellipse(gx, gy + 8, 26 * scale, 56 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = liveEntityHere ? 'rgba(248, 82, 82, 0.92)' : 'rgba(218, 180, 118, 0.55)';
    ctx.lineWidth = liveEntityHere ? 1.5 : 1;
    const bx = gx - 24 * scale;
    const by = gy - 42 * scale;
    const bw = 48 * scale;
    const bh = 86 * scale;
    const brk = 8;
    ctx.beginPath();
    ctx.moveTo(bx, by + brk); ctx.lineTo(bx, by); ctx.lineTo(bx + brk, by);
    ctx.moveTo(bx + bw - brk, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + brk);
    ctx.moveTo(bx, by + bh - brk); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + brk, by + bh);
    ctx.moveTo(bx + bw - brk, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - brk);
    ctx.stroke();

    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = liveEntityHere ? '#fca5a5' : '#e5c690';
    ctx.fillText(
      liveEntityHere ? `LIVE BIOMETRIC LOCK · DELTA +${(68 + ((tick * 3) % 25)).toFixed(0)}%` : `ARCHIVE THERMAL TRACE +${(42 + ((tick * 3) % 29)).toFixed(0)}%`,
      18,
      H - 54
    );
  }

  // CRT Scanlines & minimal static
  ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
  for (let i = 0; i < 180; i++) {
    const nx = ((i * 73 + tick * 19) % W);
    const ny = ((i * 41 + tick * 13) % H);
    ctx.fillStyle = `rgba(210, 220, 212, ${0.06 + glitchLevel * 0.12})`;
    ctx.fillRect(nx, ny, 2 + (i % 3), 1);
  }

  // VHS On-Screen Display
  ctx.font = 'bold 13px "Courier Prime", "Courier New", monospace';
  ctx.fillStyle = 'rgba(240, 245, 240, 0.94)';
  ctx.fillText(cam.zone, 18, 24);

  if (Math.floor(tick / 6) % 2 === 0) {
    ctx.fillStyle = liveEntityHere ? '#ef4444' : '#22c55e';
    ctx.beginPath(); ctx.arc(W - 64, 20, 4.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(240, 245, 240, 0.9)';
  ctx.fillText(liveEntityHere ? 'LIVE ●' : 'FEED ►', W - 54, 24);

  ctx.fillText(cam.stamp, 18, H - 32);
  ctx.fillText(irEnhanced ? `${cam.date} · IR TRACE ON` : cam.date, 18, H - 14);
}

// Convert room world X/Z (-14.5 .. 7.0 X, -2.5 .. 20.0 Z) to normalized SVG floorplan coords
const mapX = (wx) => ((wx + 14.5) / 21.5) * 320;
const mapZ = (wz) => ((19.8 - wz) / 22.3) * 210; // North (+Z) at top!

export default function CCTVMonitorModal({
  isOpen,
  onClose,
  ghostTelemetry = null,
  playerPos = null,
  propChecklist = [],
  collectedIds = [],
  totalFragments = 10,
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
    const iv = setInterval(() => setTick(t => t + 1), 180);
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
    const glitch = (liveEntityHere || selectedCam.anomaly) && (tick % 19 === 0) ? 0.65 : 0.12;
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
        className="w-[95vw] max-w-[1000px] flex flex-col gap-3"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Translucent Header */}
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
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Camera Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {CAMERAS.map(cam => {
            const active = cam.id === selectedCam.id;
            const hasGhost = ghostCamId === cam.id;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={() => setSelectedId(cam.id)}
                className="px-3.5 py-1.5 rounded-full text-xs font-sans border transition cursor-pointer flex items-center gap-1.5"
                style={{
                  background: active ? 'linear-gradient(90deg, rgba(132,34,34,0.84), rgba(40,14,14,0.9))' : 'rgba(16, 14, 13, 0.8)',
                  borderColor: hasGhost ? 'rgba(239, 68, 68, 0.78)' : active ? 'rgba(208, 156, 98, 0.6)' : 'rgba(255,255,255,0.12)',
                  color: active ? '#f7f0e3' : '#a8a094',
                }}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="font-semibold">{cam.id}</span>
                {hasGhost ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-950 text-[#fca5a5] text-[9px] font-bold animate-pulse">LIVE</span>
                ) : cam.anomaly ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Camera Perspective Feed + Interactive Floorplan Map + Pinned Note */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start overflow-y-auto pr-1" style={{ maxHeight: '72vh' }}>
          <div className="md:col-span-7 flex flex-col gap-3">
            <div className="rounded-xl border border-white/15 bg-black overflow-hidden shadow-2xl relative">
              <canvas
                ref={canvasRef}
                width={520}
                height={300}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans px-1 text-[#b4aba0]">
              <span>STATUS: <strong className={liveEntityHere || selectedCam.anomaly ? 'text-[#f87171]' : 'text-[#a8d5a2]'}>{liveEntityHere ? 'LIVE ENTITY DETECTED' : selectedCam.status}</strong></span>
              <span>{`COLLECTED: ${collectedIds.length}/${totalFragments}`}</span>
            </div>

            {/* Interactive Live Bunker Tactical Blueprint (Rooms + Doorways + Player + 6 Fragment Pins) */}
            <div className="rounded-xl bg-[#0a0d0b] border border-[#c4a265]/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[#d4c8ae] mb-2">
                <span className="flex items-center gap-1 font-bold text-[#ffd68a]">
                  <MapPin className="w-3.5 h-3.5" /> TACTICAL FLOORPLAN (CLICK ROOM TO SWITCH CAM)
                </span>
                <span>COLLECTED: {collectedIds.length}/{totalFragments} · ● YOU</span>
              </div>

              <svg viewBox="0 0 320 210" className="w-full h-44 bg-[#070908] rounded border border-white/10">
                {/* 5F Relay Vault */}
                <g onClick={() => setSelectedId('CAM-06')} className="cursor-pointer">
                  <rect x={mapX(-14.1)} y={mapZ(19.5)} width={mapX(-7.85) - mapX(-14.1)} height={mapZ(13.3) - mapZ(19.5)}
                    fill={selectedId === 'CAM-06' ? 'rgba(132,34,34,0.28)' : 'rgba(255,255,255,0.04)'} stroke="#5a655d" strokeWidth="1" />
                  <text x={mapX(-13.6)} y={mapZ(18.0)} fill="#e5d0a4" fontSize="8" fontFamily="monospace">5F RELAY VAULT</text>
                </g>
                {/* 5E Cryo Suite */}
                <g onClick={() => setSelectedId('CAM-05')} className="cursor-pointer">
                  <rect x={mapX(-7.85)} y={mapZ(19.5)} width={mapX(-1.61) - mapX(-7.85)} height={mapZ(13.3) - mapZ(19.5)}
                    fill={selectedId === 'CAM-05' ? 'rgba(132,34,34,0.28)' : 'rgba(255,255,255,0.04)'} stroke="#5a655d" strokeWidth="1" />
                  <text x={mapX(-7.3)} y={mapZ(18.0)} fill="#cbd5e1" fontSize="8" fontFamily="monospace">5E CRYO SUITE</text>
                </g>
                {/* Chamber 3 */}
                <g onClick={() => setSelectedId('CAM-06')} className="cursor-pointer">
                  <rect x={mapX(-14.1)} y={mapZ(13.3)} width={mapX(-10.97) - mapX(-14.1)} height={mapZ(5.5) - mapZ(13.3)}
                    fill={selectedId === 'CAM-06' ? 'rgba(132,34,34,0.24)' : 'rgba(120,20,20,0.12)'} stroke="#7f1d1d" strokeWidth="1" />
                  <text x={mapX(-13.8)} y={mapZ(9.5)} fill="#fca5a5" fontSize="7.5" fontFamily="monospace">CH-3</text>
                </g>
                {/* 5D Observation */}
                <g onClick={() => setSelectedId('CAM-04')} className="cursor-pointer">
                  <rect x={mapX(-10.97)} y={mapZ(13.3)} width={mapX(-7.85) - mapX(-10.97)} height={mapZ(5.5) - mapZ(13.3)}
                    fill={selectedId === 'CAM-04' ? 'rgba(132,34,34,0.28)' : 'rgba(255,255,255,0.04)'} stroke="#5a655d" strokeWidth="1" />
                  <text x={mapX(-10.6)} y={mapZ(11.6)} fill="#cbd5e1" fontSize="8" fontFamily="monospace">5D OBS</text>
                </g>
                {/* 5C Locker Annex */}
                <g onClick={() => setSelectedId('CAM-03')} className="cursor-pointer">
                  <rect x={mapX(-7.85)} y={mapZ(13.3)} width={mapX(-1.61) - mapX(-7.85)} height={mapZ(5.5) - mapZ(13.3)}
                    fill={selectedId === 'CAM-03' ? 'rgba(132,34,34,0.28)' : 'rgba(255,255,255,0.04)'} stroke="#5a655d" strokeWidth="1" />
                  <text x={mapX(-6.6)} y={mapZ(9.0)} fill="#cbd5e1" fontSize="8" fontFamily="monospace">5C ANNEX</text>
                </g>
                {/* 5A Anteroom & Vault Alcove */}
                <g onClick={() => setSelectedId('CAM-01')} className="cursor-pointer">
                  <rect x={mapX(-5.5)} y={mapZ(10.7)} width={mapX(6.4) - mapX(-5.5)} height={mapZ(1.8) - mapZ(10.7)}
                    fill={selectedId === 'CAM-01' ? 'rgba(132,34,34,0.22)' : 'rgba(255,255,255,0.025)'} stroke="#475569" strokeWidth="1" />
                  <text x={mapX(-0.8)} y={mapZ(6.2)} fill="#94a3b8" fontSize="8" fontFamily="monospace">5A ANTEROOM · VAULT EXIT ▶</text>
                </g>
                {/* 5B Safe Control Bay */}
                <g onClick={() => setSelectedId('CAM-02')} className="cursor-pointer">
                  <rect x={mapX(-3.45)} y={mapZ(1.8)} width={mapX(3.45) - mapX(-3.45)} height={mapZ(-2.0) - mapZ(1.8)}
                    fill={selectedId === 'CAM-02' ? 'rgba(22,101,52,0.34)' : 'rgba(22,101,52,0.18)'} stroke="#22c55e" strokeWidth="1.2" />
                  <text x={mapX(-1.6)} y={mapZ(-0.2)} fill="#86efac" fontSize="8" fontFamily="monospace">5B SAFE BAY</text>
                </g>

                {/* Doorway markers */}
                {[
                  [1.02, 1.8], [-1.61, 9.4], [-3.95, 5.5], [-7.85, 7.84], [-10.97, 7.84],
                  [-11.75, 13.3], [-10.19, 13.3], [-5.51, 13.3], [-7.85, 17.2],
                ].map(([dx, dz], idx) => (
                  <circle key={`d_${idx}`} cx={mapX(dx)} cy={mapZ(dz)} r="2.3" fill="#f59e0b" opacity="0.85" />
                ))}

                {/* Player current position */}
                {playerPos && (
                  <g>
                    <circle cx={mapX(playerPos.x)} cy={mapZ(playerPos.z)} r="5.5" fill="rgba(56,189,248,0.28)" />
                    <circle cx={mapX(playerPos.x)} cy={mapZ(playerPos.z)} r="3.2" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
                    <text x={mapX(playerPos.x) + 6} y={mapZ(playerPos.z) + 3} fill="#bae6fd" fontSize="7.5" fontWeight="bold" fontFamily="monospace">YOU</text>
                  </g>
                )}

                {/* Entity live location */}
                {ghostTelemetry && typeof ghostTelemetry.x === 'number' && typeof ghostTelemetry.z === 'number' && (
                  <g>
                    <circle cx={mapX(ghostTelemetry.x)} cy={mapZ(ghostTelemetry.z)} r="5" fill="#ef4444" opacity="0.85" />
                  </g>
                )}
              </svg>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="ruled-index-card rounded-sm p-5 pt-7 relative rotate-[0.5deg]">
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

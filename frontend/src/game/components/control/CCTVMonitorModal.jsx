import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, MapPin, Maximize2, Minimize2 } from 'lucide-react';
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
    shortCode: '01',
    wingTag: '5A AIRLOCK',
    snapshotSrc: '/assets/ui/cctv/cam-01.jpg',
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
    shortCode: '02',
    wingTag: '5B SAFE BAY',
    snapshotSrc: '/assets/ui/cctv/cam-02.jpg',
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
    shortCode: '03',
    wingTag: '5C ANNEX',
    snapshotSrc: '/assets/ui/cctv/cam-03.jpg',
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
    shortCode: '04',
    wingTag: '5D OBSERVATION',
    snapshotSrc: '/assets/ui/cctv/cam-04.jpg',
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
    shortCode: '05',
    wingTag: '5E CRYO SUITE',
    snapshotSrc: '/assets/ui/cctv/cam-05.jpg',
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
    shortCode: '06',
    wingTag: '5F RELAY VAULT',
    snapshotSrc: '/assets/ui/cctv/cam-06.jpg',
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

// Overlay subtle CRT phosphor film grain and tape OSD over the real wing feed (zero tracking overlays)
function renderVhsTelemetryOverlay(ctx, cam, irEnhanced, tick) {
  if (
    !ctx ||
    typeof ctx.fillRect !== 'function' ||
    typeof ctx.fill !== 'function' ||
    typeof ctx.arc !== 'function' ||
    typeof ctx.fillText !== 'function'
  ) {
    return;
  }
  const W = ctx.canvas?.width || 420;
  const H = ctx.canvas?.height || 260;
  ctx.clearRect?.(0, 0, W, H);

  // Subtle green phosphor wash
  ctx.fillStyle = irEnhanced ? 'rgba(18, 42, 30, 0.18)' : 'rgba(8, 20, 14, 0.12)';
  ctx.fillRect(0, 0, W, H);

  // Delicate analog snow flecks
  for (let i = 0; i < 90; i++) {
    const nx = (i * 73 + tick * 19) % W;
    const ny = (i * 41 + tick * 13) % H;
    ctx.fillStyle = irEnhanced ? 'rgba(185, 255, 210, 0.08)' : 'rgba(185, 255, 210, 0.05)';
    ctx.fillRect(nx, ny, 2 + (i % 2), 1);
  }

  // Minimal VHS deck timestamp & zone stamp
  ctx.font = 'bold 12px "Courier Prime", "Courier New", monospace';
  ctx.fillStyle = 'rgba(220, 252, 231, 0.9)';
  ctx.fillText(cam.zone, 18, 24);

  if (Math.floor(tick / 6) % 2 === 0) {
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(W - 64, 20, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(220, 252, 231, 0.9)';
  ctx.fillText('REC ►', W - 54, 24);

  if (H >= 80) {
    ctx.font = '11px "Courier Prime", "Courier New", monospace';
    ctx.fillText(cam.stamp, 18, H - 30);
    ctx.fillText(irEnhanced ? `${cam.date} · IR TRACE ON` : cam.date, 18, H - 14);
  }
}

// Convert room world X/Z (-14.5 .. 7.0 X, -2.5 .. 20.0 Z) to normalized SVG floorplan coords
const mapX = (wx) => ((wx + 14.5) / 21.5) * 320;
const mapZ = (wz) => ((19.8 - wz) / 22.3) * 210;

export default function CCTVMonitorModal({
  isOpen,
  onClose,
  ghostTelemetry: _ghostTelemetry = null,
  playerPos: _playerPos = null,
  collectedIds = [],
  totalFragments = 10,
}) {
  const [selectedCamId, setSelectedCamId] = useState('CAM-05');
  const [isZoomed, setIsZoomed] = useState(false);
  const [irEnhanced, setIrEnhanced] = useState(true);
  const [showFloorplanInZoom, setShowFloorplanInZoom] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [downloadedKey, setDownloadedKey] = useState(null);
  const [tick, setTick] = useState(0);
  const canvasRef = useRef(null);

  const activeCam = CAMERAS.find((c) => c.id === selectedCamId) || CAMERAS[4];

  useEffect(() => {
    if (!isOpen) return undefined;
    const iv = setInterval(() => setTick((t) => t + 1), 180);
    return () => clearInterval(iv);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isZoomed, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderVhsTelemetryOverlay(ctx, activeCam, irEnhanced, tick);
  }, [isOpen, activeCam, irEnhanced, tick, isZoomed]);

  if (!isOpen) return null;

  const formatCamDoc = (cam) =>
    formatDocumentText({
      id: cam.id,
      title: `${cam.id} (${cam.zone}) — ${cam.logTitle}`,
      classification: `CCTV SECURITY LOG // ${cam.status}`,
      location: cam.stamp,
      lines: [cam.logBody],
      events: cam.events,
      highlight: cam.irClue,
    });

  const handleCopyCam = async (cam) => {
    await copyDocumentText(formatCamDoc(cam));
    setCopiedKey(cam.id);
    setTimeout(() => setCopiedKey((prev) => (prev === cam.id ? null : prev)), 1800);
  };

  const handleDownloadCam = (cam) => {
    downloadDocumentFile(sanitizeExportFilename(cam.id, cam.zone), formatCamDoc(cam));
    setDownloadedKey(cam.id);
    setTimeout(() => setDownloadedKey((prev) => (prev === cam.id ? null : prev)), 1800);
  };

  const handleDownloadAllCams = () => {
    const bundle = formatEvidenceBundleText(
      CAMERAS.map((c) => ({
        id: c.id,
        title: `${c.id} (${c.zone}) — ${c.logTitle}`,
        classification: `CCTV SECURITY LOG // ${c.status}`,
        location: c.stamp,
        lines: [c.logBody],
        events: c.events,
        highlight: c.irClue,
      }))
    );
    downloadDocumentFile('room5_all_cctv_logs.txt', bundle);
    setDownloadedKey('__all__');
    setTimeout(() => setDownloadedKey((prev) => (prev === '__all__' ? null : prev)), 1800);
  };

  const selectMonitorAndZoom = (camId) => {
    setSelectedCamId(camId);
    setIsZoomed(true);
  };

  // Single curved CRT feed monitor inside the gallery bank
  const renderMonitorBezel = (cam, sizeClass = 'h-32 sm:h-36') => {
    const isSel = selectedCamId === cam.id;
    return (
      <button
        key={cam.id}
        type="button"
        onClick={() => selectMonitorAndZoom(cam.id)}
        className={`cctv-crt-housing text-left group w-full ${sizeClass} ${isSel ? 'is-selected' : ''}`}
      >
        <div className="cctv-crt-screen">
          <img
            src={cam.snapshotSrc}
            alt={`${cam.id} ${cam.zone}`}
            className="cctv-phosphor-feed group-hover:scale-[1.03]"
          />
          <div className="cctv-scanline-mask" />

          {/* Soft pill badges — zero sharp corners or tracking alerts */}
          <div className="absolute inset-x-0 top-0 p-2.5 flex items-center justify-between bg-gradient-to-b from-black/75 via-black/25 to-transparent">
            <span className="font-mono text-[11px] font-bold tracking-wider text-[#dcfce7] px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-sm">
              {cam.id}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isSel ? 'bg-[#4ade80] shadow-[0_0_8px_#4ade80]' : 'bg-[#22c55e]/60'
              }`}
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-[#bbf7d0] truncate">
              {cam.wingTag}
            </span>
            <Maximize2 className="w-3.5 h-3.5 text-[#86efac]/80 opacity-0 group-hover:opacity-100 transition shrink-0" />
          </div>
        </div>
      </button>
    );
  };

  // Clean static architectural bunker schematic (no live tracking pins)
  const renderTacticalFloorplan = () => (
    <div className="rounded-2xl bg-[#07110d]/90 p-3">
      <div className="flex items-center justify-between text-[10px] font-mono text-[#86efac] mb-2 px-1">
        <span className="font-bold flex items-center gap-1.5 tracking-wider">
          <MapPin className="w-3.5 h-3.5 text-[#4ade80]" /> TACTICAL FLOORPLAN
        </span>
        <span className="text-[#86efac]/60">WINGS 5A – 5F</span>
      </div>
      <svg viewBox="0 0 320 210" className="w-full h-32 rounded-xl bg-[#050b08]">
        <rect x={mapX(-3.3)} y={mapZ(1.8)} width={mapX(3.3) - mapX(-3.3)} height={mapZ(-1.8) - mapZ(1.8)} rx="7" fill="rgba(22,101,52,0.28)" stroke="rgba(74,222,128,0.6)" strokeWidth="1" />
        <text x={mapX(0)} y={mapZ(0)} fill="#86efac" fontSize="8" fontFamily="monospace" textAnchor="middle">5B SAFE</text>

        <rect x={mapX(-5.6)} y={mapZ(10.7)} width={mapX(6.5) - mapX(-5.6)} height={mapZ(1.8) - mapZ(10.7)} rx="7" fill="rgba(255,255,255,0.025)" stroke="#2e4739" strokeWidth="0.9" />
        <text x={mapX(1.2)} y={mapZ(6.8)} fill="#6ee7b7" fontSize="7.5" fontFamily="monospace" textAnchor="middle">5A ANTEROOM</text>

        <rect x={mapX(-7.85)} y={mapZ(13.3)} width={mapX(-1.6) - mapX(-7.85)} height={mapZ(5.5) - mapZ(13.3)} rx="7" fill="rgba(255,255,255,0.03)" stroke="#2e4739" strokeWidth="0.9" />
        <text x={mapX(-4.7)} y={mapZ(9.5)} fill="#6ee7b7" fontSize="7.5" fontFamily="monospace" textAnchor="middle">5C ANNEX</text>

        <rect x={mapX(-10.97)} y={mapZ(13.3)} width={mapX(-7.85) - mapX(-10.97)} height={mapZ(5.5) - mapZ(13.3)} rx="7" fill="rgba(255,255,255,0.03)" stroke="#2e4739" strokeWidth="0.9" />
        <text x={mapX(-9.4)} y={mapZ(9.5)} fill="#6ee7b7" fontSize="7" fontFamily="monospace" textAnchor="middle">5D OBS</text>

        <rect x={mapX(-14.1)} y={mapZ(13.3)} width={mapX(-10.97) - mapX(-14.1)} height={mapZ(5.5) - mapZ(13.3)} rx="7" fill="rgba(124,29,29,0.22)" stroke="rgba(185,28,28,0.65)" strokeWidth="0.9" />
        <text x={mapX(-12.5)} y={mapZ(9.5)} fill="#fca5a5" fontSize="7" fontFamily="monospace" textAnchor="middle">CH-3</text>

        <rect x={mapX(-7.85)} y={mapZ(19.5)} width={mapX(-1.6) - mapX(-7.85)} height={mapZ(13.3) - mapZ(19.5)} rx="7" fill="rgba(255,255,255,0.03)" stroke="#2e4739" strokeWidth="0.9" />
        <text x={mapX(-4.7)} y={mapZ(16.6)} fill="#6ee7b7" fontSize="7.5" fontFamily="monospace" textAnchor="middle">5E CRYO</text>

        <rect x={mapX(-14.1)} y={mapZ(19.5)} width={mapX(-7.85) - mapX(-14.1)} height={mapZ(13.3) - mapZ(19.5)} rx="7" fill="rgba(255,255,255,0.03)" stroke="#2e4739" strokeWidth="0.9" />
        <text x={mapX(-11.0)} y={mapZ(16.6)} fill="#6ee7b7" fontSize="7.5" fontFamily="monospace" textAnchor="middle">5F VAULT</text>
      </svg>
    </div>
  );

  return (
    <div
      className="cctv-station-backdrop"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (isZoomed && e.target === e.currentTarget) {
          setIsZoomed(false);
        }
      }}
      onClick={(e) => {
        if (isZoomed && e.target === e.currentTarget) {
          setIsZoomed(false);
        }
      }}
    >
      {/* Sleek Rounded Top Console Header */}
      <div
        className="relative z-20 flex items-center justify-between gap-4 px-5 sm:px-8 py-3.5 bg-[#08120e]/85 backdrop-blur-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#112a1f] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(74,222,128,0.12)]">
            <Camera className="w-4 h-4 text-[#86efac]" />
          </div>
          <div className="min-w-0">
            <h2 className="font-mono text-xs sm:text-sm font-bold tracking-[0.16em] uppercase text-[#dcfce7] m-0 truncate">
              SURVEILLANCE MONITOR BANK
            </h2>
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#86efac]/70 m-0 truncate">
              DELTA BUNKER · VHS SECURITY FEED
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isZoomed && (
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="re-btn"
            >
              <span className="re-btn-circle"><Minimize2 className="w-3 h-3" /></span>
              <span>Zoom Out</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="re-btn"
            aria-label="Close"
            title="Close Monitor Bank (ESC)"
          >
            <span className="re-btn-circle">ESC</span>
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Main Security Desk Workspace */}
      <div
        className="relative flex-1 overflow-y-auto px-4 sm:px-8 py-5 flex flex-col justify-center"
        onClick={(e) => {
          if (isZoomed && e.target === e.currentTarget) {
            setIsZoomed(false);
          }
        }}
      >
        {!isZoomed ? (
          <div className="cctv-wall-enter max-w-6xl w-full mx-auto space-y-5">
            {/* Curved CRT Security Bank */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Left Monitor Stack: CAM-01 above CAM-02 */}
              <div className="md:col-span-3 flex flex-col gap-3.5">
                {renderMonitorBezel(CAMERAS[0], 'h-32 sm:h-36')}
                {renderMonitorBezel(CAMERAS[1], 'h-36 sm:h-44')}
              </div>

              {/* Center Cluster: Twin CRTs CAM-03 + CAM-04 above Tactical Floorplan */}
              <div className="md:col-span-5 flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  {renderMonitorBezel(CAMERAS[2], 'h-32 sm:h-36')}
                  {renderMonitorBezel(CAMERAS[3], 'h-32 sm:h-36')}
                </div>
                <div className="cctv-crt-housing">
                  <div className="cctv-crt-screen p-2">
                    {renderTacticalFloorplan()}
                    <div className="relative h-8 mt-2 rounded-xl overflow-hidden bg-[#050d09]">
                      <canvas
                        ref={canvasRef}
                        width={420}
                        height={36}
                        className="w-full h-full block opacity-90"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Feature Stack: CAM-05 above Hero Monitor CAM-06 */}
              <div className="md:col-span-4 flex flex-col gap-3.5">
                {renderMonitorBezel(CAMERAS[4], 'h-32 sm:h-36')}
                {renderMonitorBezel(CAMERAS[5], 'h-44 sm:h-52')}
              </div>
            </div>

            {/* Rounded Glassmorphic Monitor Note & Export Capsule */}
            <div
              className="rounded-3xl bg-[#091511]/88 backdrop-blur-xl px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="lg:col-span-7 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-[#86efac] uppercase tracking-wider">
                    {activeCam.id} NOTE
                  </span>
                  <span className="font-mono text-[10px] px-3 py-0.5 rounded-full bg-[#10291e] text-[#dcfce7]">
                    {activeCam.zone}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-3 py-0.5 rounded-full ${
                      activeCam.anomaly
                        ? 'bg-red-950/75 text-red-200'
                        : 'bg-emerald-950/75 text-emerald-200'
                    }`}
                  >
                    {activeCam.status}
                  </span>
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-[#ecfdf5]">
                  {activeCam.logTitle}
                </div>
                <p className="font-mono text-[11px] text-[#a7f3d0]/85 m-0 leading-relaxed">
                  {irEnhanced ? activeCam.irClue : activeCam.logBody}
                </p>
              </div>

              <div className="lg:col-span-5 flex flex-wrap items-center justify-start lg:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  className="re-btn"
                >
                  <span className="re-btn-circle"><Maximize2 className="w-3 h-3" /></span>
                  <span>Inspect Monitor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIrEnhanced((v) => !v)}
                  className="re-btn"
                >
                  <span className="re-btn-circle"><Eye className="w-3 h-3" /></span>
                  <span>IR Trace: {irEnhanced ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyCam(activeCam)}
                  className="re-btn"
                >
                  <span className="re-btn-circle">{copiedKey === activeCam.id ? '✓' : '⎘'}</span>
                  <span>{copiedKey === activeCam.id ? 'Copied' : 'Copy Log'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCam(activeCam)}
                  className="re-btn"
                >
                  <span className="re-btn-circle">{downloadedKey === activeCam.id ? '✓' : '⬇'}</span>
                  <span>{downloadedKey === activeCam.id ? 'Saved' : 'Download Log'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadAllCams}
                  className="re-btn"
                >
                  <span className="re-btn-circle">{downloadedKey === '__all__' ? '✓' : 'PKG'}</span>
                  <span>{downloadedKey === '__all__' ? 'Saved All' : 'Download All 6'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Zoomed-In Curved CRT Focus View (click outside monitor or ESC or Zoom Out to return to wall) */
          <div
            className="cctv-zoom-enter max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lg:col-span-7 space-y-3.5">
              <div className="cctv-crt-housing cursor-default p-3.5">
                <div className="cctv-crt-screen aspect-[16/10] relative">
                  <img
                    src={activeCam.snapshotSrc}
                    alt={`${activeCam.id} zoomed view`}
                    className="cctv-phosphor-feed"
                  />
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={400}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                  <div className="cctv-scanline-mask" />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {CAMERAS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCamId(c.id)}
                      className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] font-semibold transition cursor-pointer ${
                        c.id === selectedCamId
                          ? 'bg-[#1a4731] text-[#dcfce7] shadow-[0_4px_16px_rgba(74,222,128,0.2)]'
                          : 'bg-[#0b1914]/85 text-[#86efac]/75 hover:bg-[#12271e] hover:text-[#dcfce7]'
                      }`}
                    >
                      {c.shortCode} · {c.wingTag}
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[10px] text-[#86efac]/65">
                  Click outside monitor or press ESC to zoom out
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-3xl bg-[#091511]/92 backdrop-blur-xl p-6 space-y-4 font-mono text-xs text-[#dcfce7] shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#86efac] tracking-wider">{activeCam.id} NOTE</span>
                <span
                  className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                    activeCam.anomaly
                      ? 'bg-red-950/75 text-red-200'
                      : 'bg-emerald-950/75 text-emerald-200'
                  }`}
                >
                  {activeCam.status}
                </span>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#86efac]/70">
                  {activeCam.zone} · {activeCam.stamp}
                </div>
                <h3 className="text-sm font-bold text-white mt-1 mb-1.5">
                  {activeCam.logTitle}
                </h3>
                <p className="text-[11px] leading-relaxed text-[#bbf7d0]/90 m-0">
                  {activeCam.logBody}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-[#86efac]/75 font-bold">
                  TIMESTAMPED EVENTS
                </div>
                {activeCam.events.map((ev, i) => (
                  <div key={i} className="text-[10.5px] text-[#d1fae5]/85 leading-snug">
                    • {ev}
                  </div>
                ))}
              </div>

              {irEnhanced && (
                <div className="rounded-2xl bg-[#102b1f]/65 p-3.5 text-[11px] text-[#ecfdf5] leading-relaxed">
                  {activeCam.irClue}
                </div>
              )}

              {showFloorplanInZoom && renderTacticalFloorplan()}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIrEnhanced((v) => !v)}
                  className="re-btn"
                >
                  <span className="re-btn-circle"><Eye className="w-3 h-3" /></span>
                  <span>IR Trace: {irEnhanced ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFloorplanInZoom((v) => !v)}
                  className="re-btn"
                >
                  <span className="re-btn-circle"><MapPin className="w-3 h-3" /></span>
                  <span>{showFloorplanInZoom ? 'Hide Map' : 'Tactical Map'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyCam(activeCam)}
                  className="re-btn"
                >
                  <span className="re-btn-circle">{copiedKey === activeCam.id ? '✓' : '⎘'}</span>
                  <span>{copiedKey === activeCam.id ? 'Copied' : 'Copy Log'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCam(activeCam)}
                  className="re-btn"
                >
                  <span className="re-btn-circle">{downloadedKey === activeCam.id ? '✓' : '⬇'}</span>
                  <span>{downloadedKey === activeCam.id ? 'Saved' : 'Download Log'}</span>
                </button>
              </div>

              <div className="text-[10px] text-[#86efac]/65 pt-2 border-t border-white/10 flex justify-between">
                <span>EVIDENCE LOGGED</span>
                <span className="font-bold text-[#bbf7d0]">{collectedIds.length}/{totalFragments}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

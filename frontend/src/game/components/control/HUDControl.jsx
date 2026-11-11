import React, { memo } from 'react';
import {
  FileText,
  Volume2,
  VolumeX,
  LogOut,
  FolderOpen,
  Crosshair,
  MousePointer2,
} from 'lucide-react';

const KeyCap = ({ children }) => (
  <span
    className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold tracking-wider text-[#efe7d6]"
    style={{
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(196, 162, 101, 0.24)',
    }}
  >
    {children}
  </span>
);

function resolveCurrentZone(pos) {
  const x = typeof pos?.x === 'number' ? pos.x : 0.25;
  const z = typeof pos?.z === 'number' ? pos.z : 0.25;
  if (x >= -3.45 && x <= 3.45 && z <= 1.85) {
    return { code: '5B', name: 'CONTROL BAY (SAFE)', isSafe: true };
  }
  if (x > -1.75 || z < 5.5) {
    return { code: '5A', name: 'CENTRAL ANTEROOM', isSafe: false };
  }
  if (x >= -7.85 && z <= 13.3) {
    return { code: '5C', name: 'LOCKER ANNEX', isSafe: false };
  }
  if (x >= -10.97 && x < -7.85 && z <= 13.3) {
    return { code: '5D', name: 'OBSERVATION LAB', isSafe: false };
  }
  if (x < -10.97 && z <= 13.3) {
    return { code: 'CH-3', name: 'CHAMBER 3 CELL', isSafe: false };
  }
  if (x >= -7.85 && z > 13.3) {
    return { code: '5E', name: 'CRYO AUTOPSY SUITE', isSafe: false };
  }
  return { code: '5F', name: 'RELAY VAULT', isSafe: false };
}

// Convert room world X/Z (-14.3 .. 6.7 X, -2.2 .. 19.8 Z) cleanly into bottom-left HUD minimap SVG coordinates
const mx = (wx) => ((wx + 14.3) / 21.0) * 168 + 6;
const mz = (wz) => ((19.7 - wz) / 22.0) * 104 + 4;

const HUDControl = memo(function HUDControl({
  roomTitle = 'The Surveillance Morgue',
  totalFragments = 10,
  collectedCount = 0,
  basketUnlocked = false,
  isRoomCompleted = false,
  cluesSolved = 0,
  totalClues = 3,
  clueHint = '',
  isSafeZone = true,
  isThreatActive = false,
  ghostTelemetry = null,
  playerPos = null,
  onOpenBasket,
  onOpenCaseFiles,
  onLogout,
  audioMuted = false,
  onToggleAudio,
  qualityMode = 'high',
  onToggleQuality,
  activeHoverPrompt = null,
  isPointerLocked = true,
  mouseSensitivity = 1.0,
  onCycleSensitivity,
  onRequestLock,
}) {
  const objectiveText = isRoomCompleted
    ? 'VAULT SEAL BROKEN — Exit through the Vault Door'
    : basketUnlocked
    ? `Solve the 3 Clue Terminals (${cluesSolved}/${totalClues}) to unlock the Vault Door`
    : `Search bunker fixtures & explore wings (${collectedCount}/${totalFragments} fragments)`;

  const activeZone = resolveCurrentZone(playerPos);
  const px = typeof playerPos?.x === 'number' ? playerPos.x : 0.25;
  const pz = typeof playerPos?.z === 'number' ? playerPos.z : 0.25;
  const yaw = typeof playerPos?.yaw === 'number' ? playerPos.yaw : 0;
  // Engine forward vector: fx = -Math.sin(yaw), fz = -Math.cos(yaw)
  const lookAngleDeg = Math.atan2(-Math.sin(yaw), -Math.cos(yaw)) * (180 / Math.PI);

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6 z-40">
      {/* ── Top Edge Bar (Gothic Smoke-Fade Strip + Capsule Inventory Pills) ── */}
      <div className="flex items-start justify-between w-full pointer-events-auto gap-4">
        {/* Left: Borderless gothic smoke-fade objective strip + subtle clue hint */}
        <div
          className="pr-12 pl-3.5 py-2 rounded-r-full"
          style={{
            background: 'linear-gradient(90deg, rgba(12, 10, 10, 0.8) 0%, rgba(12, 10, 10, 0.36) 76%, transparent 100%)',
            borderLeft: '2px solid rgba(184, 58, 58, 0.72)',
          }}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="font-re-display text-xs sm:text-sm font-bold tracking-[0.18em] text-[#f3ede0] uppercase">
              {roomTitle}
            </div>
            <span
              className="font-re-dossier text-[10px] tracking-[0.14em] uppercase px-2.5 py-0.5 rounded-full border"
              style={{
                background: isSafeZone
                  ? 'rgba(196, 162, 101, 0.14)'
                  : isThreatActive
                  ? 'rgba(154, 42, 42, 0.35)'
                  : 'rgba(255, 255, 255, 0.05)',
                borderColor: isSafeZone
                  ? 'rgba(196, 162, 101, 0.45)'
                  : isThreatActive
                  ? 'rgba(220, 68, 68, 0.65)'
                  : 'rgba(255, 255, 255, 0.12)',
                color: isSafeZone ? '#e5d0a4' : isThreatActive ? '#fca5a5' : '#9c9282',
              }}
            >
              {isSafeZone ? 'Safe Bay · 5B' : isThreatActive ? 'Alert · Return to 5B' : `Sector ${activeZone.code}`}
            </span>

            {ghostTelemetry && typeof ghostTelemetry.nextEventSec === 'number' && (() => {
              const sec = Math.max(0, ghostTelemetry.nextEventSec);
              const mm = String(Math.floor(sec / 60)).padStart(2, '0');
              const ss = String(sec % 60).padStart(2, '0');
              const active = ghostTelemetry.cyclePhase === 'MANIFESTING';
              const approaching = ghostTelemetry.state === 'APPROACHING';
              const cam = ghostTelemetry.incomingCam;
              const prefix = active ? 'Danger' : approaching ? 'Caution' : 'Clear';
              const timeStr = cam ? `${mm}:${ss} · ${cam}` : `${mm}:${ss}`;
              return (
                <span
                  data-testid="ghost-cycle-timer"
                  className="inline-flex items-center gap-1.5 font-re-dossier text-[10px] tracking-[0.14em] uppercase px-2.5 py-0.5 rounded-full border"
                  style={{
                    background: active
                      ? 'rgba(154, 42, 42, 0.34)'
                      : approaching
                      ? 'rgba(196, 122, 0, 0.24)'
                      : 'rgba(12, 10, 10, 0.55)',
                    borderColor: active
                      ? 'rgba(220, 68, 68, 0.65)'
                      : approaching
                      ? 'rgba(229, 178, 84, 0.65)'
                      : 'rgba(196, 162, 101, 0.28)',
                    color: active ? '#fca5a5' : approaching ? '#fde68a' : '#d4c8ae',
                  }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${active || approaching ? 'animate-pulse' : ''}`}
                    style={{ background: active ? '#ef4444' : approaching ? '#eab308' : '#8b7752' }}
                  />
                  <span>{`${prefix} · ${timeStr}`}</span>
                </span>
              );
            })()}
          </div>
          <div
            className="text-[11px] font-sans mt-0.5 tracking-wide"
            style={{ color: isRoomCompleted ? '#e5d0a4' : '#d4c8ae' }}
          >
            {objectiveText}
          </div>
          {clueHint && (
            <div className="text-[10.5px] font-sans mt-1 text-[#b4a68e]/90 tracking-wide max-w-md">
              {clueHint}
            </div>
          )}
        </div>

        {/* Right: Unified RE2R Prompt-Pill HUD Controls ((key) White Sans Smoke) */}
        <div className="flex items-center gap-1.5 text-xs font-sans">
          <button
            type="button"
            onClick={onOpenBasket}
            title="Open Evidence Basket (Press B)"
            className="re-btn !py-1 !px-2.5 !pr-4"
          >
            <span className="re-btn-circle">B</span>
            <FolderOpen className="w-3.5 h-3.5 text-[#d4c8ae]" />
            <span className="hidden sm:inline">Basket</span>
            <span className="font-semibold">{collectedCount}/{totalFragments}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCaseFiles}
            title="View Clue Terminals / Case Dossier (Press C)"
            className="re-btn !py-1 !px-2.5 !pr-4"
          >
            <span className="re-btn-circle">C</span>
            <FileText className="w-3.5 h-3.5 text-[#d4c8ae]" />
            <span className="hidden sm:inline">Clues</span>
            <span className="font-semibold">{cluesSolved}/{totalClues}</span>
          </button>

          {onToggleQuality && (
            <button
              type="button"
              onClick={onToggleQuality}
              title={`Graphics Mode: ${qualityMode === 'eco' ? 'ECO (Performance)' : 'HIGH (Full Detail)'} — click to toggle`}
              className="re-btn !py-1 !px-2.5 text-[11px] font-mono tracking-wider"
              style={{ color: qualityMode === 'eco' ? '#fde68a' : '#d4c8ae' }}
            >
              {qualityMode === 'eco' ? 'GFX: ECO' : 'GFX: HIGH'}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleAudio}
            title={audioMuted ? 'Unmute Audio (Press M)' : 'Mute Audio (Press M)'}
            className="re-btn !py-1 !px-2"
            style={{ color: audioMuted ? '#fca5a5' : '#d4c8ae' }}
          >
            <span className="re-btn-circle">M</span>
            {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Exit Session"
              className="re-btn !py-1 !px-2"
              style={{ color: '#fca5a5' }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Center Reticle & RE2 Remake World Inspect Prompt ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        {!activeHoverPrompt && (
          <div className="relative flex items-center justify-center">
            <div
              className="rounded-full transition-all duration-150"
              style={{
                width: isPointerLocked ? '18px' : '14px',
                height: isPointerLocked ? '18px' : '14px',
                border: isPointerLocked
                  ? '1px solid rgba(244, 239, 224, 0.28)'
                  : '1px solid rgba(244, 239, 224, 0.18)',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: '4px',
                height: '4px',
                background: isPointerLocked ? 'rgba(248, 244, 232, 0.9)' : 'rgba(248, 244, 232, 0.55)',
                boxShadow: '0 0 6px rgba(0, 0, 0, 0.95)',
              }}
            />
          </div>
        )}

        {activeHoverPrompt && (
          <div className="flex flex-col items-center gap-1 animate-fade-in">
            <div className="flex items-center gap-2.5">
              {/* Circular white button badge matching RE2R Ink Ribbon prompt */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-sans font-bold text-xs shadow-lg"
                style={{
                  background: '#f5f4f0',
                  color: '#111213',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.85)',
                }}
              >
                E
              </div>
              {/* Borderless translucent dark smoke gradient label */}
              <div
                className="pl-3 pr-8 py-1 rounded-full text-xs sm:text-sm font-sans font-medium tracking-wide text-[#f4f3ef]"
                style={{
                  background: 'linear-gradient(90deg, rgba(14, 12, 12, 0.82) 0%, rgba(14, 12, 12, 0.35) 76%, transparent 100%)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.95)',
                }}
              >
                {activeHoverPrompt}
              </div>
            </div>
            {!isPointerLocked && (
              <span
                className="text-[10px] font-sans tracking-wider text-[#dcd2be]/90 px-2.5 py-0.5 rounded-full"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}
              >
                Right-Click or [E]
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom-Left Architectural Room Layout Indicator (Matching RE2R Smoked Gold Language) ── */}
      <div
        data-testid="hud-room-minimap"
        className="hidden sm:flex flex-col gap-1.5 pointer-events-none fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 rounded-lg p-2.5"
        style={{
          width: '188px',
          background: 'linear-gradient(135deg, rgba(14, 12, 12, 0.86) 0%, rgba(10, 9, 9, 0.72) 100%)',
          border: '1px solid rgba(196, 162, 101, 0.24)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.72)',
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: activeZone.isSafe ? '#4ade80' : '#c4a265' }}
            />
            <span className="font-re-display text-[9.5px] font-bold tracking-[0.14em] text-[#e6d5b2] truncate">
              {activeZone.name}
            </span>
          </div>
          <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-[#f3ede0] shrink-0">
            {activeZone.code}
          </span>
        </div>

        <svg viewBox="0 0 180 112" className="w-full h-[106px] block">
          {[
            { code: '5F', x0: -14.1, x1: -7.85, z0: 13.3, z1: 19.5, lx: -11.0, lz: 16.4 },
            { code: '5E', x0: -7.85, x1: -1.61, z0: 13.3, z1: 19.5, lx: -4.7, lz: 16.4 },
            { code: 'CH-3', x0: -14.1, x1: -10.97, z0: 5.5, z1: 13.3, lx: -12.5, lz: 9.4 },
            { code: '5D', x0: -10.97, x1: -7.85, z0: 5.5, z1: 13.3, lx: -9.4, lz: 9.4 },
            { code: '5C', x0: -7.85, x1: -1.61, z0: 5.5, z1: 13.3, lx: -4.7, lz: 9.4 },
            { code: '5A', x0: -5.5, x1: 6.4, z0: 1.8, z1: 10.7, lx: 1.0, lz: 6.2 },
            { code: '5B', x0: -3.45, x1: 3.45, z0: -2.0, z1: 1.8, lx: 0.0, lz: -0.1 },
          ].map((rm) => {
            const isHere = activeZone.code === rm.code;
            const fill = isHere
              ? rm.code === '5B'
                ? 'rgba(74, 222, 128, 0.22)'
                : 'rgba(196, 162, 101, 0.24)'
              : 'rgba(255, 255, 255, 0.03)';
            const stroke = isHere
              ? rm.code === '5B'
                ? 'rgba(74, 222, 128, 0.78)'
                : 'rgba(229, 198, 134, 0.85)'
              : 'rgba(196, 162, 101, 0.24)';
            return (
              <g key={rm.code}>
                <rect
                  x={mx(rm.x0)}
                  y={mz(rm.z1)}
                  width={mx(rm.x1) - mx(rm.x0)}
                  height={mz(rm.z0) - mz(rm.z1)}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isHere ? '1.3' : '0.75'}
                  rx="1"
                />
                <text
                  x={mx(rm.lx)}
                  y={mz(rm.lz) + 2.5}
                  textAnchor="middle"
                  fill={isHere ? '#f7f0e3' : 'rgba(212, 200, 174, 0.55)'}
                  fontSize="6.5"
                  fontFamily="monospace"
                  fontWeight={isHere ? 'bold' : 'normal'}
                >
                  {rm.code}
                </text>
              </g>
            );
          })}

          {/* Doorway notches (strictly spatial layout — zero puzzle markers) */}
          {[
            [1.02, 1.8], [-1.61, 9.4], [-3.95, 5.5], [-7.85, 7.84], [-10.97, 7.84],
            [-11.75, 13.3], [-10.19, 13.3], [-5.51, 13.3], [-7.85, 17.2],
          ].map(([dx, dz], idx) => (
            <circle key={`d_${idx}`} cx={mx(dx)} cy={mz(dz)} r="1.4" fill="rgba(212, 200, 174, 0.55)" />
          ))}

          {/* Live Player Position + Look Direction */}
          <g transform={`translate(${mx(px)}, ${mz(pz)}) rotate(${lookAngleDeg})`}>
            <polygon points="0,-8 -4,-1 4,-1" fill="rgba(229, 198, 134, 0.32)" />
            <circle r="3" fill="#f3eee3" stroke="#151210" strokeWidth="1" />
          </g>
        </svg>
      </div>

      {/* ── Sleek Rounded Bottom Controls Capsule Dock ── */}
      <div className="flex items-center justify-center w-full pointer-events-none">
        <div
          className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 px-5 py-2 rounded-full text-[11px] font-sans"
          style={{
            background: 'rgba(14, 12, 12, 0.84)',
            border: '1px solid rgba(196, 162, 101, 0.2)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.72)',
            color: '#c9bfab',
          }}
        >
          {isPointerLocked ? (
            <span className="inline-flex items-center gap-1.5 text-[#e6d2ab] font-medium pr-2.5 border-r border-white/10">
              <Crosshair className="w-3 h-3 text-[#c94a4a]" />
              <span>FPS Aim</span>
              <KeyCap>ESC</KeyCap>
              <span className="text-[#8e887c]">Cursor</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onRequestLock}
              className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full cursor-pointer transition hover:brightness-115 text-[#f3e6cc] font-medium mr-1"
              style={{
                background: 'linear-gradient(90deg, rgba(132, 34, 34, 0.72), rgba(44, 14, 14, 0.85))',
                border: '1px solid rgba(196, 162, 101, 0.45)',
              }}
              title="Lock mouse for full 360 first-person view"
            >
              <MousePointer2 className="w-3 h-3" />
              <span>Click to Lock Aim</span>
            </button>
          )}

          <span className="hidden md:inline-flex items-center gap-1.5">
            <KeyCap>WASD</KeyCap>
            <span className="text-[#9e9688]">Move</span>
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5">
            <KeyCap>{isPointerLocked ? 'MOUSE' : 'LMB'}</KeyCap>
            <span className="text-[#9e9688]">Look 360°</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <KeyCap>E / RMB</KeyCap>
            <span className="text-[#9e9688]">Interact</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <KeyCap>F</KeyCap>
            <span className="text-[#9e9688]">Torch</span>
          </span>

          {onCycleSensitivity && (
            <button
              type="button"
              onClick={onCycleSensitivity}
              title="Cycle Mouse Look Sensitivity"
              className="ml-1 pl-2 border-l border-white/10 inline-flex items-center gap-1 text-[10px] font-mono text-[#d4c8ae] hover:text-white cursor-pointer transition"
            >
              <span className="text-[#8e887c]">SENS</span>
              <span className="font-semibold">{mouseSensitivity.toFixed(1)}×</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default HUDControl;

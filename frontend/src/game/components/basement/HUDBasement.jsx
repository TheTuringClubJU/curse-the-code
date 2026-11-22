import React, { memo } from 'react';
import {
  FileText,
  Volume2,
  VolumeX,
  LogOut,
  FolderOpen,
  HelpCircle,
  Image,
  BookOpen,
  Crosshair,
  MousePointer2,
} from 'lucide-react';

// Convert 10m basement world coords (X ∈ [-4.2, 4.2], Z ∈ [-5.0, 5.0]) into SVG minimap coords
const mx = (wx) => ((wx + 4.4) / 8.8) * 140 + 10;
const mz = (wz) => ((wz + 5.2) / 10.4) * 100 + 6;

const KeyChip = ({ children }) => (
  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold tracking-wider text-white bg-white/20 border border-white/25">
    {children}
  </span>
);

const HUDBasement = memo(function HUDBasement({
  roomTitle = 'The Basement',
  totalFragments = 5,
  collectedCount = 0,
  basketUnlocked = false,
  isRoomCompleted = false,
  cluesSolved = 0,
  totalClues = 2,
  finaleSolved = false,
  photoCount = 0,
  playerPos = null,
  onOpenBasket,
  onOpenCaseFiles,
  onOpenPhotoPuzzle,
  onOpenHints,
  onOpenRules,
  onLogout,
  audioMuted = false,
  onToggleAudio,
  qualityMode = 'eco',
  onToggleQuality,
  activeHoverPrompt = null,
  isPointerLocked = true,
  mouseSensitivity = 1.0,
  onCycleSensitivity,
  onRequestLock,
}) {
  const objectiveText = isRoomCompleted
    ? 'ROOM 3 COMPLETE • BASEMENT SECTOR PURGED'
    : !basketUnlocked
    ? `Search cellar fixtures & equipment (${collectedCount}/${totalFragments} fragments)`
    : cluesSolved < totalClues
    ? `Solve Intercom & Server Rack Note (${cluesSolved}/${totalClues} clues)`
    : finaleSolved
    ? 'Vault seal disengaged — operate the South Containment Door'
    : 'Approach the North Containment Console to override the seal';

  const px = typeof playerPos?.x === 'number' ? playerPos.x : 0;
  const pz = typeof playerPos?.z === 'number' ? playerPos.z : 3.8;
  const yaw = typeof playerPos?.yaw === 'number' ? playerPos.yaw : 0;
  const lookAngleDeg = Math.atan2(-Math.sin(yaw), Math.cos(yaw)) * (180 / Math.PI);

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6 z-40">
      {/* ── Top Bar: Room 5 Smoke-Fade Strip + Soft Frosted White Glassmorphism Pills ── */}
      <div className="flex flex-wrap items-start justify-between w-full pointer-events-auto gap-3">
        {/* Top-Left: Frosted objective strip */}
        <div
          className="pr-8 pl-4 py-2 rounded-2xl"
          style={{
            background:
              'linear-gradient(90deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.06) 85%, transparent 100%)',
            borderLeft: '2.5px solid rgba(255, 77, 77, 0.85)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
          }}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bsmt-display text-xs sm:text-sm font-bold tracking-[0.18em] text-white uppercase">
              {roomTitle}
            </span>
            <span className="bsmt-glass-pill text-[10px] tracking-[0.14em] uppercase font-semibold">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRoomCompleted ? 'bg-emerald-400' : 'bg-[#ff4d4d] animate-pulse'
                }`}
              />
              {isRoomCompleted ? 'SEAL BROKEN' : 'CELLAR · SECTOR B3'}
            </span>
          </div>
          <div className="text-[11px] font-bsmt-ui mt-0.5 tracking-wide text-white/85">
            {objectiveText}
          </div>
        </div>

        {/* Top-Right: Gameplay Actions + Utility Controls separated by subtle frosted divider */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bsmt-ui">
          <button
            type="button"
            onClick={onOpenBasket}
            title="Open Evidence Basket (Press B)"
            className="bsmt-glass-btn !py-1.5 !px-3.5"
          >
            <span className="bsmt-key-dot">B</span>
            <FolderOpen className="w-3.5 h-3.5 text-white/95" />
            <span className="hidden sm:inline">Basket</span>
            <span className="font-bold">{collectedCount}/{totalFragments}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCaseFiles}
            title="Open Case Files & Containment Terminal (Press C)"
            className="bsmt-glass-btn !py-1.5 !px-3.5"
          >
            <span className="bsmt-key-dot">C</span>
            <FileText className="w-3.5 h-3.5 text-white/95" />
            <span className="hidden sm:inline">Clues</span>
            <span className="font-bold">{cluesSolved}/{totalClues}</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/25 text-white">
              {finaleSolved ? 'Finale' : '+1 Final'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenPhotoPuzzle}
            title="Open Photo Puzzle (Press P)"
            className="bsmt-glass-btn !py-1.5 !px-3.5"
          >
            <span className="bsmt-key-dot">P</span>
            <Image className="w-3.5 h-3.5 text-white/95" />
            <span className="hidden sm:inline">Photo</span>
            <span className="font-bold">{photoCount}/10</span>
          </button>

          {onOpenRules && (
            <button
              type="button"
              onClick={onOpenRules}
              title="Ancient Field Dossier & Rules (Press R)"
              className="bsmt-glass-btn !py-1.5 !px-3.5"
            >
              <span className="bsmt-key-dot">R</span>
              <BookOpen className="w-3.5 h-3.5 text-white/95" />
              <span className="hidden md:inline">Dossier</span>
            </button>
          )}

          {onOpenHints && (
            <button
              type="button"
              onClick={onOpenHints}
              title="Investigation Hints (Press H)"
              className="bsmt-glass-btn !py-1.5 !px-3.5"
            >
              <span className="bsmt-key-dot">H</span>
              <HelpCircle className="w-3.5 h-3.5 text-white/95" />
              <span className="hidden md:inline">Hints</span>
            </button>
          )}

          <span className="hidden sm:block w-px h-5 bg-white/20 mx-0.5" aria-hidden="true" />

          {onToggleQuality && (
            <button
              type="button"
              onClick={onToggleQuality}
              title={`Graphics Mode: ${qualityMode === 'eco' ? 'ECO (Low-End PC)' : 'HIGH (Full Detail)'}`}
              className="bsmt-glass-btn !py-1.5 !px-3 text-[11px] font-mono tracking-wider"
            >
              {qualityMode === 'eco' ? 'GFX: ECO' : 'GFX: HIGH'}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleAudio}
            title={audioMuted ? 'Unmute Ambient' : 'Mute Ambient'}
            className="bsmt-glass-btn !py-1.5 !px-2.5"
          >
            <span className="bsmt-key-dot">M</span>
            {audioMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-200" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-white" />
            )}
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Exit / Logout"
              className="bsmt-glass-icon"
            >
              <LogOut className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── Center Reticle & Room 5 Circular Soft-White [E] Prompt ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        {!activeHoverPrompt && (
          <div className="relative flex items-center justify-center">
            <div
              className="rounded-full transition-all duration-150"
              style={{
                width: isPointerLocked ? '18px' : '14px',
                height: isPointerLocked ? '18px' : '14px',
                border: isPointerLocked
                  ? '1px solid rgba(255, 255, 255, 0.36)'
                  : '1px solid rgba(255, 255, 255, 0.22)',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: '4px',
                height: '4px',
                background: isPointerLocked ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.58)',
                boxShadow: '0 0 8px rgba(0, 0, 0, 0.95)',
              }}
            />
          </div>
        )}

        {activeHoverPrompt && (
          <div className="flex flex-col items-center gap-1.5 animate-fade-in">
            <div className="bsmt-glass-btn !py-1.5 !pl-2 !pr-5 pointer-events-auto">
              <span className="bsmt-key-dot !w-6 !h-6 text-xs">E</span>
              <span className="text-xs sm:text-sm font-medium tracking-wide text-white">
                {activeHoverPrompt}
              </span>
            </div>
            {!isPointerLocked && (
              <span className="text-[10px] font-bsmt-ui tracking-wider text-white/85 px-3 py-0.5 rounded-full bg-white/15">
                Right-Click or [E]
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom-Left Frosted White Glass Cellar Hall Minimap ── */}
      <div
        data-testid="hud-basement-minimap"
        className="hidden sm:flex flex-col gap-1.5 pointer-events-none fixed bottom-5 left-5 z-40 rounded-2xl p-3"
        style={{
          width: '180px',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.08) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.26)',
          boxShadow: '0 14px 34px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff4d4d] shrink-0" />
            <span className="font-bsmt-display text-[10px] font-bold tracking-[0.14em] text-white truncate uppercase">
              Cellar Hall
            </span>
          </div>
          <span className="font-mono text-[9px] font-bold px-2 py-0.2 rounded-full bg-white/20 text-white shrink-0">
            B3
          </span>
        </div>

        <svg viewBox="0 0 160 112" className="w-full h-[100px] block">
          {/* Main 10m basement outline */}
          <rect
            x={mx(-4.2)}
            y={mz(-5.0)}
            width={mx(4.2) - mx(-4.2)}
            height={mz(5.0) - mz(-5.0)}
            fill="rgba(255, 255, 255, 0.05)"
            stroke="rgba(255, 255, 255, 0.34)"
            strokeWidth="1"
            rx="4"
          />
          {/* North Containment Console & Corner Barrels */}
          <rect
            x={mx(-1.35)}
            y={mz(-4.65)}
            width={mx(1.35) - mx(-1.35)}
            height={mz(-3.65) - mz(-4.65)}
            fill="rgba(255, 255, 255, 0.18)"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="0.8"
            rx="1.5"
          />
          <text x={mx(0)} y={mz(-2.8)} textAnchor="middle" fill="rgba(255,255,255,0.58)" fontSize="5.2" fontFamily="monospace">
            CONSOLE
          </text>
          <rect
            x={mx(-4.0)}
            y={mz(-4.7)}
            width={mx(-1.8) - mx(-4.0)}
            height={mz(-3.9) - mz(-4.7)}
            fill="rgba(255, 255, 255, 0.12)"
            stroke="rgba(255, 255, 255, 0.32)"
            strokeWidth="0.6"
            rx="1"
          />
          <rect
            x={mx(1.8)}
            y={mz(-4.7)}
            width={mx(4.0) - mx(1.8)}
            height={mz(-3.9) - mz(-4.7)}
            fill="rgba(255, 255, 255, 0.12)"
            stroke="rgba(255, 255, 255, 0.32)"
            strokeWidth="0.6"
            rx="1"
          />

          {/* West SW Shelving, Server Rack & Terminal */}
          <rect
            x={mx(-4.05)}
            y={mz(2.9)}
            width={mx(-3.1) - mx(-4.05)}
            height={mz(4.4) - mz(2.9)}
            fill="rgba(255, 255, 255, 0.13)"
            stroke="rgba(255, 255, 255, 0.36)"
            strokeWidth="0.7"
            rx="1"
          />
          <rect
            x={mx(-4.05)}
            y={mz(0.1)}
            width={mx(-2.95) - mx(-4.05)}
            height={mz(1.5) - mz(0.1)}
            fill="rgba(255, 255, 255, 0.15)"
            stroke="rgba(255, 255, 255, 0.42)"
            strokeWidth="0.7"
            rx="1"
          />
          <text x={mx(-2.6)} y={mz(0.9)} fill="rgba(255,255,255,0.5)" fontSize="4.8" fontFamily="monospace">
            RACK
          </text>
          <rect
            x={mx(-4.05)}
            y={mz(-2.6)}
            width={mx(-2.85) - mx(-4.05)}
            height={mz(-1.3) - mz(-2.6)}
            fill="rgba(255, 255, 255, 0.14)"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="0.7"
            rx="1"
          />
          <text x={mx(-2.5)} y={mz(-1.75)} fill="rgba(255,255,255,0.5)" fontSize="4.8" fontFamily="monospace">
            TERM
          </text>

          {/* East SE Barrels, Workbench & Shelving */}
          <rect
            x={mx(3.1)}
            y={mz(2.6)}
            width={mx(4.05) - mx(3.1)}
            height={mz(4.6) - mz(2.6)}
            fill="rgba(255, 255, 255, 0.12)"
            stroke="rgba(255, 255, 255, 0.34)"
            strokeWidth="0.6"
            rx="1"
          />
          <rect
            x={mx(3.0)}
            y={mz(-0.3)}
            width={mx(4.05) - mx(3.0)}
            height={mz(1.3) - mz(-0.3)}
            fill="rgba(255, 255, 255, 0.15)"
            stroke="rgba(255, 255, 255, 0.42)"
            strokeWidth="0.7"
            rx="1"
          />
          <text x={mx(2.7)} y={mz(0.6)} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="4.8" fontFamily="monospace">
            BENCH
          </text>
          <rect
            x={mx(3.1)}
            y={mz(-2.6)}
            width={mx(4.05) - mx(3.1)}
            height={mz(-1.05) - mz(-2.6)}
            fill="rgba(255, 255, 255, 0.13)"
            stroke="rgba(255, 255, 255, 0.36)"
            strokeWidth="0.7"
            rx="1"
          />
          <text x={mx(2.8)} y={mz(-1.7)} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="4.8" fontFamily="monospace">
            SHELF
          </text>

          {/* Center Vault Seal ring */}
          <circle
            cx={mx(0)}
            cy={mz(0.3)}
            r="9"
            fill="rgba(255, 77, 77, 0.1)"
            stroke="rgba(255, 255, 255, 0.36)"
            strokeDasharray="2 2"
            strokeWidth="0.9"
          />
          <text x={mx(0)} y={mz(1.6)} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="4.8" fontFamily="monospace">
            SEAL
          </text>

          {/* South Bulkhead Door marker */}
          <rect
            x={mx(-1.0)}
            y={mz(4.75)}
            width={mx(1.0) - mx(-1.0)}
            height="3.2"
            fill="rgba(255, 255, 255, 0.85)"
            rx="1"
          />
          <text x={mx(0)} y={mz(4.25)} textAnchor="middle" fill="rgba(255,255,255,0.62)" fontSize="4.8" fontFamily="monospace">
            DOOR
          </text>

          {/* Live Player Position + Look Direction */}
          <g transform={`translate(${mx(px)}, ${mz(pz)}) rotate(${lookAngleDeg})`}>
            <polygon points="0,-9 -4,-1 4,-1" fill="rgba(255, 255, 255, 0.35)" />
            <circle r="3" fill="#ffffff" stroke="#111317" strokeWidth="1" />
          </g>
        </svg>
      </div>

      {/* ── Bottom-Center Rounded Frosted White Glass Controls Capsule Dock ── */}
      <div className="flex items-center justify-center w-full pointer-events-none">
        <div
          className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 px-5 py-2 rounded-full text-[11px] font-bsmt-ui"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.08) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.32)',
            color: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          {isPointerLocked ? (
            <span className="inline-flex items-center gap-1.5 text-white font-medium pr-2.5 border-r border-white/25">
              <Crosshair className="w-3 h-3 text-[#ff6b6b]" />
              <span>FPS Aim</span>
              <KeyChip>ESC</KeyChip>
              <span className="text-white/75">Cursor</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onRequestLock}
              className="bsmt-glass-btn !py-0.5 !px-3 mr-1 text-[11px]"
              title="Lock mouse for full 360 first-person view"
            >
              <MousePointer2 className="w-3 h-3" />
              <span>Click to Lock Aim</span>
            </button>
          )}

          <span className="hidden md:inline-flex items-center gap-1.5">
            <KeyChip>WASD</KeyChip>
            <span className="text-white/80">Move</span>
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5">
            <KeyChip>{isPointerLocked ? 'MOUSE' : 'LMB'}</KeyChip>
            <span className="text-white/80">Look 360°</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <KeyChip>E / RMB</KeyChip>
            <span className="text-white/80">Interact</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <KeyChip>F</KeyChip>
            <span className="text-white/80">Torch</span>
          </span>

          {onCycleSensitivity && (
            <button
              type="button"
              onClick={onCycleSensitivity}
              title="Cycle Mouse Look Sensitivity"
              className="ml-1 pl-2.5 border-l border-white/25 inline-flex items-center gap-1 text-[10px] font-mono text-white/90 hover:text-white cursor-pointer transition"
            >
              <span className="text-white/65">SENS</span>
              <span className="font-semibold">{mouseSensitivity.toFixed(1)}×</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default HUDBasement;

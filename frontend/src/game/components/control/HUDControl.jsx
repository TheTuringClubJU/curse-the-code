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

const HUDControl = memo(function HUDControl({
  roomTitle = 'The Surveillance Morgue',
  totalFragments = 8,
  collectedCount = 0,
  basketUnlocked = false,
  isRoomCompleted = false,
  cluesSolved = 0,
  totalClues = 3,
  clueHint = '',
  isSafeZone = true,
  isThreatActive = false,
  ghostTelemetry = null,
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
    ? `Solve the 3 Consoles (${cluesSolved}/${totalClues}) to unlock the Vault Door`
    : `Search props & explore wings (${collectedCount}/${totalFragments} files)`;

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
              {isSafeZone ? 'Safe Bay · 5B' : isThreatActive ? 'Alert · Return to 5B' : 'Outer Wings'}
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
            <span className="hidden sm:inline">Files</span>
            <span className="font-semibold">{collectedCount}/{totalFragments}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCaseFiles}
            title="View Case Dossier (Press C)"
            className="re-btn !py-1 !px-2.5 !pr-4"
          >
            <span className="re-btn-circle">C</span>
            <FileText className="w-3.5 h-3.5 text-[#d4c8ae]" />
            <span className="hidden sm:inline">Dossier</span>
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

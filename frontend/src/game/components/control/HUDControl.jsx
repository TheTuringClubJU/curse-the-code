import React, { useState, useEffect } from 'react';
import {
  Radio,
  Layers,
  FileText,
  Volume2,
  VolumeX,
  LogOut,
  Camera,
  ShieldAlert,
} from 'lucide-react';

export default function HUDControl({
  roomTitle = 'The Surveillance Morgue',
  totalFragments = 8,
  collectedCount = 0,
  basketUnlocked = false,
  isRoomCompleted = false,
  cluesSolved = 0,
  totalClues = 3,
  onOpenBasket,
  onOpenCaseFiles,
  onLogout,
  audioMuted = false,
  onToggleAudio,
  activeHoverPrompt = null,
}) {
  const [timeStr, setTimeStr] = useState('23:41:09');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hh}:${mm}:${ss}`);
    };
    updateClock();
    const iv = setInterval(updateClock, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5 z-40 font-mono">

      {/* ── Top CCTV Surveillance Header ── */}
      <div className="flex items-center justify-between w-full pointer-events-auto gap-3">

        {/* Left: CCTV Camera Feed Tag & Room Title */}
        <div
          className="flex items-center gap-3.5 backdrop-blur-md px-4 py-2.5 rounded-xl border shadow-2xl"
          style={{
            background: 'rgba(5, 10, 7, 0.92)',
            borderColor: 'rgba(77, 255, 120, 0.35)',
            boxShadow: '0 0 25px rgba(0, 0, 0, 0.8), inset 0 0 12px rgba(77, 255, 120, 0.05)',
          }}
        >
          {/* Pulsing REC indicator */}
          <div className="flex items-center gap-1.5 shrink-0 pr-1 border-r border-[#1a3d1f]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
            <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">REC</span>
            <span className="text-[10px] text-gray-400 font-mono tracking-wider ml-1">{timeStr}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-[#4dff78]" />
              <span className="text-[9px] font-bold tracking-[0.2em] text-[#3a6e45] uppercase">
                CAM-05 // BUNKER CCTV
              </span>
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-wide text-[#e8f5ec] block mt-0.5">
              {roomTitle}
            </span>
          </div>
        </div>

        {/* Center-Right: Tactical Action Buttons (Basket & Case Dossier) */}
        <div
          className="flex items-center gap-2 backdrop-blur-md px-3.5 py-2 rounded-xl border shadow-2xl text-xs"
          style={{
            background: 'rgba(5, 10, 7, 0.92)',
            borderColor: 'rgba(196, 122, 0, 0.35)',
            boxShadow: '0 0 25px rgba(0,0,0,0.8)',
          }}
        >
          {/* Evidence Basket Button [B] */}
          <button
            type="button"
            onClick={onOpenBasket}
            title="Open Evidence Basket (Press B)"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: basketUnlocked ? 'rgba(13, 46, 18, 0.9)' : 'rgba(24, 20, 14, 0.9)',
              color: basketUnlocked ? '#4dff78' : '#e8d9c0',
              border: `1px solid ${basketUnlocked ? 'rgba(77, 255, 120, 0.6)' : 'rgba(196, 122, 0, 0.4)'}`,
              boxShadow: basketUnlocked ? '0 0 12px rgba(77, 255, 120, 0.25)' : 'none',
            }}
          >
            <Layers className="w-3.5 h-3.5" style={{ color: basketUnlocked ? '#4dff78' : '#c47a00' }} />
            <span className="hidden sm:inline font-semibold">Basket:</span>
            <span className="font-bold">{collectedCount}/{totalFragments}</span>
            <kbd className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-black/60 border border-white/10 text-gray-300">
              B
            </kbd>
          </button>

          {/* Case Dossier Button [C] */}
          <button
            type="button"
            onClick={onOpenCaseFiles}
            title="View Case Dossier (Press C)"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(24, 20, 14, 0.9)',
              color: '#e8d9c0',
              border: '1px solid rgba(196, 122, 0, 0.4)',
            }}
          >
            <FileText className="w-3.5 h-3.5" style={{ color: '#c47a00' }} />
            <span className="hidden sm:inline font-semibold">Dossier:</span>
            <span className="font-bold">{cluesSolved}/{totalClues}</span>
            <kbd className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-black/60 border border-white/10 text-gray-300">
              C
            </kbd>
          </button>

          {/* Audio Mute [M] */}
          <button
            type="button"
            onClick={onToggleAudio}
            title={audioMuted ? 'Unmute Audio (Press M)' : 'Mute Audio (Press M)'}
            className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition cursor-pointer"
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#4dff78]" />}
          </button>

          {/* Logout */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Logout from Terminal"
              className="p-1.5 rounded-lg border border-red-900/40 text-red-400 hover:text-red-300 hover:border-red-600/60 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Center Crosshair & Tactical Interaction Prompt (Image 1 Style) ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        {/* Circular Reticle with center dot */}
        <div
          className="relative flex items-center justify-center transition-all duration-150"
          style={{
            width: activeHoverPrompt ? '22px' : '14px',
            height: activeHoverPrompt ? '22px' : '14px',
          }}
        >
          {/* Outer Ring */}
          <div
            className="absolute inset-0 rounded-full border transition-all duration-150"
            style={{
              borderColor: activeHoverPrompt ? '#4dff78' : 'rgba(255, 255, 255, 0.75)',
              boxShadow: activeHoverPrompt
                ? '0 0 12px #4dff78, inset 0 0 6px #4dff78'
                : '0 0 6px rgba(255, 255, 255, 0.4)',
              transform: activeHoverPrompt ? 'scale(1.15)' : 'scale(1)',
            }}
          />
          {/* Inner Dot */}
          <div
            className="w-1.5 h-1.5 rounded-full transition-all duration-150"
            style={{
              background: activeHoverPrompt ? '#4dff78' : 'rgba(255, 255, 255, 0.9)',
            }}
          />
        </div>

        {/* Tactical Hover Pill Prompt */}
        {activeHoverPrompt && (
          <div
            className="mt-4 px-3.5 py-1.5 backdrop-blur-md rounded-lg text-xs font-mono flex items-center gap-2.5 shadow-2xl animate-fade-in"
            style={{
              background: 'rgba(3, 14, 5, 0.94)',
              border: '1px solid rgba(77, 255, 120, 0.6)',
              boxShadow: '0 0 20px rgba(77, 255, 120, 0.3)',
              color: '#4dff78',
            }}
          >
            <kbd
              className="px-2 py-0.5 font-black rounded text-[10px] tracking-wider"
              style={{ background: '#4dff78', color: '#030e05' }}
            >
              [E] / CLICK
            </kbd>
            <span className="font-semibold tracking-wide text-white">{activeHoverPrompt}</span>
          </div>
        )}
      </div>

      {/* ── Bottom Telemetry & Status Bar (Image 2 Sanity Bar Style) ── */}
      <div className="flex items-end justify-between w-full pointer-events-auto gap-4">

        {/* Bottom Left: Military Protocol & Completion Ticker */}
        <div
          className="backdrop-blur-md px-3.5 py-2 rounded-xl border text-[11px]"
          style={{
            background: 'rgba(5, 10, 7, 0.9)',
            borderColor: 'rgba(77, 255, 120, 0.25)',
            color: '#76a880',
          }}
        >
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-[#4dff78] animate-pulse" />
            <span className="tracking-widest uppercase text-[10px]">
              DELTA CONTROL // SURVEILLANCE FEED 98.4%
            </span>
          </div>
          {isRoomCompleted ? (
            <div className="text-[#4dff78] font-bold text-xs mt-1 animate-pulse">
              ✓ VAULT SEAL BROKEN // ADVANCE TO SECTOR 6
            </div>
          ) : (
            <div className="text-gray-400 text-[10px] mt-0.5">
              COLLECT ALL 8 FRAGMENTS TO UNLOCK MAIN CONSOLES
            </div>
          )}
        </div>

        {/* Bottom Right: Psychological Sanity Telemetry Bar (Image 2 Style) */}
        <div
          className="backdrop-blur-md px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-3"
          style={{
            background: 'rgba(5, 10, 7, 0.92)',
            borderColor: 'rgba(77, 255, 120, 0.3)',
            boxShadow: '0 0 20px rgba(0,0,0,0.8)',
          }}
        >
          <div className="text-right">
            <span className="text-[10px] tracking-widest text-[#76a880] uppercase block">
              Sanity
            </span>
            <span className="text-[9px] text-gray-500 font-mono">
              NEURO-STABILITY
            </span>
          </div>

          {/* High-end Glowing Progress Bar */}
          <div className="w-28 sm:w-36 h-2.5 rounded-full bg-black/70 border border-white/20 p-0.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: '88%',
                background: 'linear-gradient(90deg, #10b981 0%, #4dff78 100%)',
                boxShadow: '0 0 10px rgba(77, 255, 120, 0.8)',
              }}
            />
          </div>
        </div>

      </div>

    </div>
  );
}

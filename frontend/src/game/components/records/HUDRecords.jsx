import React from 'react';
import {
  Compass,
  Layers,
  FileText,
  Volume2,
  VolumeX,
  LogOut,
  Zap,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';

export default function HUDRecords({
  roomTitle = 'The Rotting Archive',
  totalFragments = 12,
  collectedCount = 0,
  basketUnlocked = false,
  isRoomCompleted = false,
  cluesSolved = 0,
  totalClues = 4,
  batteryLevel = 100,
  isFlashlightOn = true,
  onToggleFlashlight,
  onOpenBasket,
  onOpenCaseFiles,
  onLogout,
  audioMuted = false,
  onToggleAudio,
  activeHoverPrompt = null
}) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-4 z-40 font-mono">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between w-full pointer-events-auto gap-2">
        
        {/* Left: Room Badge */}
        <div className="flex items-center gap-3 bg-[#0d0c0a]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#c47a00]/40 shadow-lg">
          <Compass className="w-5 h-5 text-[#c47a00] animate-pulse shrink-0" />
          <div>
            <span className="text-[9px] font-mono tracking-widest text-[#a0885c] uppercase block">
              ROUND 2 • SUB-BASEMENT ARCHIVE
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#f3ead0] font-mono truncate">
              {roomTitle}
            </span>
          </div>
        </div>

        {/* Center: Interactive Modals Shortcuts (Basket, Case Dossier, Flashlight) */}
        <div className="flex items-center gap-2 bg-[#0d0c0a]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#c47a00]/40 shadow-lg text-xs">
          
          {/* Basket Button (B) */}
          <button
            onClick={onOpenBasket}
            title="Open Evidence Basket (Press B)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              basketUnlocked
                ? 'bg-[#18261e] text-[#86efac] border-[#22543d] hover:bg-[#203629]'
                : 'bg-[#1c1811] text-[#e8dfc8] border-[#4a391e] hover:bg-[#2b2417]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#c47a00]" />
            <span className="hidden sm:inline">Basket:</span>
            <span>{collectedCount}/{totalFragments}</span>
            <kbd className="px-1 py-0.2 text-[9px] bg-black/60 rounded border border-white/10 text-gray-300">
              B
            </kbd>
          </button>

          {/* Case Dossier Button (C) */}
          <button
            onClick={onOpenCaseFiles}
            title="View Case Dossier & Terminal Files (Press C)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-[#1c1811] text-[#e8dfc8] border-[#4a391e] hover:bg-[#2b2417] transition"
          >
            <FileText className="w-3.5 h-3.5 text-[#c47a00]" />
            <span className="hidden sm:inline">Dossier:</span>
            <span className="text-[#ffd68a] font-bold">{cluesSolved}/{totalClues}</span>
            <kbd className="px-1 py-0.2 text-[9px] bg-black/60 rounded border border-white/10 text-gray-300">
              C
            </kbd>
          </button>

          {/* Flashlight Battery Meter (F) */}
          <button
            onClick={onToggleFlashlight}
            title="Toggle Tactical Flashlight (Press F)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              isFlashlightOn
                ? 'bg-[#2a2212] text-[#ffd68a] border-[#c47a00]'
                : 'bg-[#12110e] text-[#6b583a] border-[#2e2618]'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isFlashlightOn ? 'text-[#ffaa00]' : 'text-zinc-600'}`} />
            <span className="hidden sm:inline">Light:</span>
            <span className={batteryLevel <= 20 ? 'text-red-500 font-bold animate-pulse' : ''}>
              {Math.round(batteryLevel)}%
            </span>
            <kbd className="px-1 py-0.2 text-[9px] bg-black/60 rounded border border-white/10 text-gray-300">
              F
            </kbd>
          </button>
        </div>

        {/* Right: Audio & Logout Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAudio}
            title={audioMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2 rounded-xl bg-[#0d0c0a]/90 backdrop-blur-md border border-[#c47a00]/40 text-[#a0885c] hover:text-[#f3ead0] hover:border-[#c47a00] transition shadow-lg"
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#c47a00]" />}
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout from session"
              className="p-2 rounded-xl bg-[#0d0c0a]/90 backdrop-blur-md border border-red-900/60 text-red-400 hover:bg-red-950/60 transition shadow-lg"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Center Reticle / Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full border border-white/80 transition-all duration-150 ${activeHoverPrompt ? 'scale-150 bg-[#c47a00] border-[#ffd68a]' : 'bg-white/40'}`} />
        
        {/* Interaction Prompt (Press E) */}
        {activeHoverPrompt && (
          <div className="mt-4 px-3 py-1 bg-[#0e0c08]/90 backdrop-blur-md rounded border border-[#c47a00]/80 shadow-[0_0_15px_rgba(196,122,0,0.3)] text-xs text-[#ffd68a] font-mono flex items-center gap-2 animate-fade-in">
            <kbd className="px-1.5 py-0.5 bg-[#c47a00] text-black font-bold rounded text-[10px]">E</kbd>
            <span>{activeHoverPrompt}</span>
          </div>
        )}
      </div>

      {/* Bottom Status Ticker */}
      <div className="flex items-center justify-between text-[11px] text-[#7a6b52] px-2">
        <div className="flex items-center gap-3">
          <span>SURVIVAL HORROR // 18.98Hz SENSORY MATRIX ACTIVE</span>
          {isRoomCompleted && (
            <span className="text-emerald-400 font-bold animate-pulse">
              [BULKHEAD UNSEALED // ADVANCE TO NEXT SECTOR]
            </span>
          )}
        </div>
        <div className="hidden sm:block text-[10px] text-[#5a4e3a]">
          CURSE THE CODE • 2026
        </div>
      </div>
    </div>
  );
}

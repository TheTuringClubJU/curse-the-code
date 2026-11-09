import React from 'react';
import { 
  Compass, Layers, FileText, Image, Volume2, VolumeX, LogOut, 
  CheckCircle, Lock, Unlock, ShieldAlert 
} from 'lucide-react';

export default function HUD({
  roomTitle = "Village Cabin — Abandoned Homestead",
  totalFragments = 15,
  collectedCount = 0,
  basketUnlocked = false,
  isRoomCompleted = false,
  photoCount = 0,
  cluesSolved = 0,
  totalClues = 4,
  onOpenBasket,
  onOpenPhotoPuzzle,
  onOpenCaseFiles,
  onLogout,
  audioMuted = false,
  onToggleAudio,
  activeHoverPrompt = null
}) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-4 z-40 font-mono">
      
      {/* ── Top Navigation Bar (RE4 Survival Horror Aesthetic) ── */}
      <div className="flex items-center justify-between w-full pointer-events-auto gap-2">
        
        {/* Left: RE4 Stage & Room Badge */}
        <div className="flex items-center gap-3 bg-[#0c0a08]/92 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#c47a00]/50 shadow-2xl">
          <Compass className="w-5 h-5 text-[#d4a040] animate-pulse shrink-0" />
          <div>
            <span className="text-[9px] font-mono tracking-widest text-[#a8906c] uppercase block">
              STAGE 1-1 • INVESTIGATION (r100 / r102)
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#f2e8d4] font-serif truncate">
              {roomTitle}
            </span>
          </div>
        </div>

        {/* Center: Interactive Modals Shortcuts (Inventory, Clues, Evidence) */}
        <div className="flex items-center gap-2 bg-[#0c0a08]/92 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#c47a00]/40 shadow-2xl text-xs font-mono">
          
          {/* Inventory Basket Button (B) */}
          <button
            onClick={onOpenBasket}
            title="Open Attache Case / Evidence Basket (Press B)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              basketUnlocked
                ? 'bg-[#18261e] text-[#86efac] border-[#22543d] hover:bg-[#203629]'
                : 'bg-[#18130e] text-[#e0d4be] border-[#554028] hover:bg-[#241c14]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#d4a040]" />
            <span className="hidden sm:inline">Items:</span>
            <span>{collectedCount}/{totalFragments}</span>
            <kbd className="px-1 py-0.2 text-[9px] bg-black/60 rounded border border-white/10 text-gray-300">
              B
            </kbd>
          </button>

          {/* RE4 Village Files / Clues Button (C) */}
          <button
            onClick={onOpenCaseFiles}
            title="Open Village Files & Notes (Press C)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              cluesSolved >= totalClues
                ? 'bg-[#18261e] text-[#86efac] border-[#22543d] hover:bg-[#203629]'
                : 'bg-[#18130e] text-[#e0d4be] border-[#554028] hover:bg-[#241c14]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#d4a040]" />
            <span className="hidden sm:inline">Files:</span>
            <span>{cluesSolved}/{totalClues}</span>
            <kbd className="px-1 py-0.2 text-[9px] bg-black/60 rounded border border-white/10 text-gray-300">
              C
            </kbd>
          </button>

          {/* Photo Fragments Button (P) */}
          <button
            onClick={onOpenPhotoPuzzle}
            title="Open Fragment Puzzle (Press P)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#18130e] text-[#e0d4be] border border-[#554028] hover:bg-[#241c14] transition"
          >
            <Image className="w-3.5 h-3.5 text-[#e8b923]" />
            <span className="hidden sm:inline">Photo:</span>
            <span>{photoCount}/10</span>
            <kbd className="px-1 py-0.2 text-[9px] bg-black/60 rounded border border-white/10 text-gray-300">
              P
            </kbd>
          </button>

        </div>

        {/* Right: Audio & Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAudio}
            className="p-2 rounded-xl bg-[#0c0a08]/92 backdrop-blur-md border border-[#c47a00]/40 text-gray-300 hover:text-white hover:bg-white/10 transition shadow-lg"
            title={audioMuted ? "Unmute Ambient" : "Mute Ambient"}
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#d4a040]" />}
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-[#0c0a08]/92 backdrop-blur-md border border-[#c47a00]/40 text-gray-400 hover:text-red-400 hover:bg-white/10 transition shadow-lg"
            title="Exit / Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* ── Center Screen: RE4 Reticle & Interactive Prompt ── */}
      <div className="self-center flex flex-col items-center justify-center text-center">
        {/* RE4 Style Reticle Crosshair */}
        <div className="relative flex items-center justify-center w-6 h-6 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#d4a040] shadow-[0_0_8px_#d4a040]" />
          <div className="absolute w-4 h-4 border border-[#d4a040]/30 rounded-full" />
        </div>

        {activeHoverPrompt && (
          <div className="bg-[#0e0c08]/95 backdrop-blur-md px-4 py-2 rounded-lg border border-[#d4a040]/70 shadow-2xl animate-fade-in pointer-events-auto">
            <span className="text-xs font-mono text-[#f3eedd] flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-[#d4a040] text-black font-black text-xs font-mono">
                E
              </kbd>
              <span>{activeHoverPrompt}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Bottom Information Banner ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full pointer-events-auto gap-2">
        <div className="bg-[#0c0a08]/92 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-[#c47a00]/30 text-[10px] sm:text-[11px] font-mono text-[#a8906c]">
          <span>
            Move: <strong className="text-white">WASD</strong> • Look: <strong className="text-white">Mouse</strong> • Interact: <strong className="text-white">E</strong> • Case: <strong className="text-white">B</strong> • Files: <strong className="text-white">C</strong> • Photo: <strong className="text-white">P</strong>
          </span>
        </div>

        {isRoomCompleted && (
          <div className="bg-[#14291e]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-[#22543d] flex items-center gap-2 text-xs font-mono text-[#86efac] shadow-2xl animate-pulse">
            <CheckCircle className="w-4 h-4 text-[#86efac] shrink-0" />
            <span className="font-bold tracking-wide">
              STAGE 1-1 COMPLETE • PASSAGE TO STUDY UNLOCKED
            </span>
          </div>
        )}
      </div>

    </div>
  );
}

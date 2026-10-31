import React from 'react';
import { 
  Layers, Compass, Image, Volume2, VolumeX, LogOut, 
  CheckCircle, FileText, Lock, Unlock 
} from 'lucide-react';

export default function HUD({
  roomTitle = "Lena's Bedroom",
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
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-4 z-40">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between w-full pointer-events-auto gap-2">
        
        {/* Left: Room Badge */}
        <div className="flex items-center gap-3 bg-[#0a0714]/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#3b2a59] shadow-lg">
          <Compass className="w-5 h-5 text-[#8f7bff] animate-pulse shrink-0" />
          <div>
            <span className="text-[9px] font-mono tracking-widest text-[#a292cc] uppercase block">
              ROUND 1 • INVESTIGATION
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#e8e0ff] font-serif truncate">
              {roomTitle}
            </span>
          </div>
        </div>

        {/* Center: Interactive Modals Shortcuts (Basket, Clues, Photo Pieces) */}
        <div className="flex items-center gap-2 bg-[#0a0714]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#3b2a59] shadow-lg text-xs font-mono">
          
          {/* Basket Button (B) */}
          <button
            onClick={onOpenBasket}
            title="Open Evidence Basket (Press B)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              basketUnlocked
                ? 'bg-[#18261e] text-[#86efac] border-[#22543d] hover:bg-[#203629]'
                : 'bg-[#151024] text-[#d6cded] border-[#433066] hover:bg-[#201836]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#8f7bff]" />
            <span className="hidden sm:inline">Basket:</span>
            <span>{collectedCount}/{totalFragments}</span>
            <kbd className="px-1 py-0.2 text-[9px] bg-black/50 rounded border border-white/10 text-gray-300">
              B
            </kbd>
          </button>

          {/* Case Files Button (C) */}
          <button
            onClick={onOpenCaseFiles}
            title="Open Case Files Directory (Press C)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              cluesSolved >= totalClues
                ? 'bg-[#18261e] text-[#86efac] border-[#22543d] hover:bg-[#203629]'
                : 'bg-[#151024] text-[#d6cded] border-[#433066] hover:bg-[#201836]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#8f7bff]" />
            <span className="hidden sm:inline">Clues:</span>
            <span>{cluesSolved}/{totalClues}</span>
            <kbd className="px-1 py-0.2 text-[9px] bg-black/50 rounded border border-white/10 text-gray-300">
              C
            </kbd>
          </button>

          {/* Photo Pieces Button (P) */}
          <button
            onClick={onOpenPhotoPuzzle}
            title="Open Photo Puzzle (Press P)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#151024] text-[#d6cded] border border-[#433066] hover:bg-[#201836] transition"
          >
            <Image className="w-3.5 h-3.5 text-[#ffcf8a]" />
            <span className="hidden sm:inline">Photo:</span>
            <span>{photoCount}/10</span>
            <kbd className="px-1 py-0.2 text-[9px] bg-black/50 rounded border border-white/10 text-gray-300">
              P
            </kbd>
          </button>

        </div>

        {/* Right: Audio & Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAudio}
            className="p-2 rounded-xl bg-[#0a0714]/85 backdrop-blur-md border border-[#3b2a59] text-gray-300 hover:text-white hover:bg-white/10 transition shadow-lg"
            title={audioMuted ? "Unmute Ambient" : "Mute Ambient"}
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#8f7bff]" />}
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-[#0a0714]/85 backdrop-blur-md border border-[#3b2a59] text-gray-400 hover:text-red-400 hover:bg-white/10 transition shadow-lg"
            title="Exit / Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Center Screen: Interactive Raycast Prompt (When looking at an object) */}
      <div className="self-center flex flex-col items-center justify-center text-center">
        {/* Reticle / Dot in center of screen */}
        <div className="w-2 h-2 rounded-full bg-white/40 ring-2 ring-white/10 shadow-[0_0_8px_rgba(255,255,255,0.5)] mb-3" />

        {activeHoverPrompt && (
          <div className="bg-[#0b0817]/90 backdrop-blur-md px-4 py-2 rounded-lg border border-[#8f7bff]/50 shadow-2xl animate-fade-in pointer-events-auto">
            <span className="text-xs font-mono text-[#e8e0ff] flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-[#8f7bff] text-black font-black text-xs font-mono">
                E
              </kbd>
              <span>{activeHoverPrompt}</span>
            </span>
          </div>
        )}
      </div>

      {/* Bottom Information Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full pointer-events-auto gap-2">
        <div className="bg-[#0a0714]/85 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/5 text-[10px] sm:text-[11px] font-mono text-gray-400">
          <span>
            Move: <strong className="text-white">WASD</strong> • Look: <strong className="text-white">Mouse</strong> • Interact: <strong className="text-white">E</strong> • Basket: <strong className="text-white">B</strong> • Clues: <strong className="text-white">C</strong> • Photo: <strong className="text-white">P</strong>
          </span>
        </div>

        {isRoomCompleted && (
          <div className="bg-[#14291e]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-[#22543d] flex items-center gap-2 text-xs font-mono text-[#86efac] shadow-2xl animate-pulse">
            <CheckCircle className="w-4 h-4 text-[#86efac] shrink-0" />
            <span className="font-bold tracking-wide">
              ROOM 1 COMPLETE • DOOR TO ROOM 2 UNLATCHED
            </span>
          </div>
        )}
      </div>

    </div>
  );
}

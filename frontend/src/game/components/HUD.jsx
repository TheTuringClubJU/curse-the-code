import React from 'react';
import { Layers, Compass, Image, Volume2, VolumeX, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';

export default function HUD({
  roomTitle = "Lena's Bedroom",
  totalFragments = 15,
  collectedCount = 0,
  basketUnlocked = false,
  isRoomCompleted = false,
  photoCount = 0,
  onOpenBasket,
  onOpenPhotoPuzzle,
  onLogout,
  audioMuted = false,
  onToggleAudio,
  activeHoverPrompt = null
}) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 z-40">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        {/* Left: Room Badge */}
        <div className="flex items-center gap-3 bg-[#0a0714]/85 backdrop-blur-md px-4 py-2 rounded-xl border border-[#3b2a59] shadow-lg">
          <Compass className="w-5 h-5 text-[#8f7bff] animate-pulse" />
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#a292cc] uppercase block">
              ROUND 1 • INVESTIGATION
            </span>
            <span className="text-sm font-bold text-[#e8e0ff] font-serif">
              {roomTitle}
            </span>
          </div>
        </div>

        {/* Center: Interactive Status / Crosshair */}
        <div className="hidden md:flex items-center gap-3 bg-[#0a0714]/85 backdrop-blur-md px-5 py-2 rounded-xl border border-[#3b2a59] shadow-lg text-xs font-mono">
          <button
            onClick={onOpenBasket}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition ${
              basketUnlocked
                ? 'bg-[#18261e] text-[#86efac] border-[#22543d] hover:bg-[#203629]'
                : 'bg-[#151024] text-[#d6cded] border-[#433066] hover:bg-[#201836]'
            }`}
          >
            <Layers className="w-4 h-4 text-[#8f7bff]" />
            <span>
              Basket: {collectedCount} / {totalFragments}
            </span>
            {basketUnlocked && (
              <span className="px-1.5 py-0.2 bg-[#86efac]/20 text-[#86efac] text-[10px] rounded font-bold">
                OPEN
              </span>
            )}
          </button>

          <button
            onClick={onOpenPhotoPuzzle}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#151024] text-[#d6cded] border border-[#433066] hover:bg-[#201836] transition"
          >
            <Image className="w-4 h-4 text-[#ffcf8a]" />
            <span>Photo Pieces: {photoCount} / 10</span>
          </button>
        </div>

        {/* Right: Audio & Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAudio}
            className="p-2.5 rounded-xl bg-[#0a0714]/85 backdrop-blur-md border border-[#3b2a59] text-gray-300 hover:text-white hover:bg-white/10 transition shadow-lg"
            title={audioMuted ? "Unmute Ambient" : "Mute Ambient"}
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#8f7bff]" />}
          </button>

          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-[#0a0714]/85 backdrop-blur-md border border-[#3b2a59] text-gray-400 hover:text-red-400 hover:bg-white/10 transition shadow-lg"
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
      <div className="flex items-end justify-between w-full pointer-events-auto">
        <div className="bg-[#0a0714]/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/5 text-[11px] font-mono text-gray-400">
          <span>Move: <strong className="text-white">W A S D</strong> • Look: <strong className="text-white">Mouse</strong> • Interact: <strong className="text-white">E</strong></span>
        </div>

        {isRoomCompleted && (
          <div className="bg-[#14291e]/90 backdrop-blur-md px-5 py-2.5 rounded-xl border border-[#22543d] flex items-center gap-2 text-xs font-mono text-[#86efac] shadow-2xl">
            <CheckCircle className="w-4 h-4 text-[#86efac]" />
            <span className="font-bold tracking-wide">
              BEDROOM LATCH UNBOLTED — PROCEED THROUGH THE DOOR INTO THE CORRIDOR
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

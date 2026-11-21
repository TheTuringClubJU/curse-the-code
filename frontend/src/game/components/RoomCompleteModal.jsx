import React from 'react';
import { Trophy, Unlock, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function RoomCompleteModal({
  isOpen,
  onClose,
  onProceedToDoor,
  roomLabel = 'ROOM 1 CLEARED',
  title = "Lena's Bedroom Completed!",
  description = 'All 4 case files in this room have been solved. The heavy iron deadbolts locking the bedroom door have disengaged. The corridor to Room 2 (The Study) is now open!',
  rewards = [
    '✓ 4 / 4 Case Files Solved',
    '✓ 4 Photo Pieces Recovered (P01 - P04)',
    '✓ Bedroom Exit Door Unlocked'
  ],
  actionLabel = 'Enter Room 2 (The Study)'
}) {
  if (!isOpen) return null;

  const cleanActionLabel = String(actionLabel).replace(/\s*→+\s*$/, '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none bg-[#050608] overflow-hidden"
      data-testid="room-complete-modal"
    >
      {/* Resident Evil 7 Atmospheric Inspo Backdrop */}
      <img
        src="/assets/textures/re-loading-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-50 contrast-125 saturate-50 brightness-75 pointer-events-none"
      />
      {/* Solid dark obsidian scrim (zero gradients) */}
      <div className="absolute inset-0 bg-[#050608]/80 pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl space-y-6">
        {/* Stark RE7-style CURSE THE CODE Branding Header */}
        <div className="text-center space-y-2">
          <div
            className="text-[10px] uppercase tracking-[0.36em] text-[#a39e93]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            SECTOR TRANSITION
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold uppercase tracking-[0.16em] text-[#ede8df]"
            style={{
              fontFamily: "'Oswald', 'Barlow Condensed', sans-serif",
              textShadow: '0 4px 18px rgba(0, 0, 0, 0.95)',
            }}
          >
            CURSE THE <span className="text-[#c82828]">CODE</span>
          </h1>
          <div className="mx-auto w-20 h-[2px] bg-[#991b1b]" />
        </div>

        {/* Resident Evil Matte-Obsidian Dossier Plate */}
        <div className="relative bg-[#0a0b0e]/92 border border-[#d4b896]/20 border-l-[3px] border-l-[#b91c1c] rounded-[2px] shadow-[0_24px_60px_rgba(0,0,0,0.92)] p-6 sm:p-7 space-y-5 text-left">
          {/* Top Status Row */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div
              className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#140d0e] border border-[#991b1b]/60 rounded-[2px] text-[#e5a9a9] text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <Unlock className="w-3.5 h-3.5 text-[#dc2626]" />
              <span>{roomLabel}</span>
            </div>
            <span
              className="text-[10px] uppercase tracking-[0.2em] text-[#848078]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              LOCK DISENGAGED
            </span>
          </div>

          {/* Cold Survival-Horror Title & Description */}
          <div className="space-y-2">
            <h2
              className="text-2xl sm:text-[26px] font-semibold uppercase tracking-[0.06em] text-[#f0ebe1]"
              style={{ fontFamily: "'Oswald', 'Barlow Condensed', sans-serif" }}
            >
              {title}
            </h2>
            <p
              className="text-xs sm:text-[13px] text-[#b4b0a8] leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {description}
            </p>
          </div>

          {/* Evidence / Sector Log */}
          <div
            className="p-3.5 rounded-[2px] bg-[#06070a]/90 border border-white/10 text-xs space-y-2"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {rewards.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between gap-3 py-0.5 ${
                  idx === 0 ? 'text-[#86efac]' : idx === 1 ? 'text-[#e2c288]' : 'text-[#d4cfc6]'
                }`}
              >
                <span>{item}</span>
                {idx === 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : idx === 1 ? (
                  <Trophy className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Resident Evil Action Plate Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToDoor?.();
              }}
              className="w-full py-3 px-4 rounded-[2px] bg-[#14171f] hover:bg-[#1d1416] border border-white/20 hover:border-[#b91c1c] border-l-[3px] border-l-[#b91c1c] text-[#f3ece0] font-semibold text-xs sm:text-sm tracking-[0.16em] uppercase transition-colors flex items-center justify-center gap-3 cursor-pointer"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <span className="px-1.5 py-0.5 text-[10px] border border-white/25 bg-[#0a0b0e] text-[#d4cfc6] rounded-[2px]">
                ENTER
              </span>
              <span>{cleanActionLabel}</span>
              <ArrowRight className="w-4 h-4 text-[#dc2626]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      {/* Resident Evil Atmospheric Inspo Backdrop */}
      <img
        src="/assets/textures/re-loading-bg.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-45 contrast-125 saturate-50 brightness-75 pointer-events-none"
      />
      {/* Solid dark obsidian scrim (zero gradients) */}
      <div className="absolute inset-0 bg-[#050608]/78 pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl space-y-5">
        {/* Spooky CURSE THE CODE Branding Header */}
        <div className="text-center space-y-1.5">
          <div
            className="text-[10px] uppercase tracking-[0.42em] text-[#b91c1c]"
            style={{ fontFamily: "'Special Elite', 'Courier Prime', monospace" }}
          >
            ST. JUDE CONTAINMENT ARCHIVE // SECTOR CLEARANCE
          </div>
          <h1
            className="text-3xl sm:text-4xl font-black uppercase tracking-[0.24em] text-[#ebe3d5]"
            style={{
              fontFamily: "'Cinzel', 'Cormorant Garamond', Georgia, serif",
              textShadow: '0 2px 14px rgba(153, 27, 27, 0.78), 0 0 2px #000',
            }}
          >
            CURSE THE CODE
          </h1>
          <div className="mx-auto w-28 h-[1px] bg-[#991b1b]" />
        </div>

        {/* Resident Evil Matte-Obsidian Dossier Plate */}
        <div className="relative bg-[#0a0b0e]/92 border border-[#d4b896]/25 border-l-[3px] border-l-[#b91c1c] rounded-[2px] shadow-[0_24px_60px_rgba(0,0,0,0.92)] p-6 sm:p-7 space-y-5 text-left">
          {/* Top Status Row */}
          <div className="flex items-center justify-between gap-3 border-b border-[#d4b896]/15 pb-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#140d0e] border border-[#991b1b]/60 rounded-[2px] text-[#e5a9a9] text-[11px] font-bold tracking-[0.22em] uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <Unlock className="w-3.5 h-3.5 text-[#dc2626]" />
              <span>{roomLabel}</span>
            </div>
            <span
              className="text-[10px] uppercase tracking-[0.22em] text-[#8c8478]"
              style={{ fontFamily: "'Courier Prime', monospace" }}
            >
              LOCK DISENGAGED
            </span>
          </div>

          {/* Spooky Title & Description */}
          <div className="space-y-2">
            <h2
              className="text-xl sm:text-2xl font-bold text-[#efe7da] tracking-[0.06em]"
              style={{
                fontFamily: "'Cinzel', 'Cormorant Garamond', Georgia, serif",
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)',
              }}
            >
              {title}
            </h2>
            <p
              className="text-xs sm:text-[13px] text-[#b8ae9f] leading-relaxed"
              style={{ fontFamily: "'Special Elite', 'Courier Prime', monospace" }}
            >
              {description}
            </p>
          </div>

          {/* Evidence / Sector Log */}
          <div className="p-3.5 rounded-[2px] bg-[#06070a]/90 border border-[#d4b896]/15 text-xs space-y-2"
            style={{ fontFamily: "'Courier Prime', monospace" }}
          >
            {rewards.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between gap-3 py-0.5 ${
                  idx === 0 ? 'text-[#86efac]' : idx === 1 ? 'text-[#e2c288]' : 'text-[#d4c8b8]'
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
              className="w-full py-3 px-4 rounded-[2px] bg-[#14171f] hover:bg-[#1d1416] border border-[#d4b896]/30 hover:border-[#b91c1c] border-l-[3px] border-l-[#b91c1c] text-[#f3ece0] font-bold text-xs sm:text-sm tracking-[0.2em] uppercase transition-colors flex items-center justify-center gap-3 cursor-pointer"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span className="px-1.5 py-0.5 text-[10px] border border-[#d4b896]/35 bg-[#0a0b0e] text-[#d4b896] rounded-[2px]">
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

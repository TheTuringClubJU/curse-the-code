import React from 'react';
import { Trophy, Unlock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function RoomCompleteModal({
  isOpen,
  onClose,
  onProceedToDoor,
  variant = 'default',
  onNavigateRoom,
  roomBadge = 'ROOM 1 CLEARED',
  title = "Lena's Bedroom Completed!",
  description = 'All 4 case files in this room have been solved. The heavy iron deadbolts locking the bedroom door have disengaged. The corridor to Room 2 (The Study) is now open!',
  recapLines = [
    '✓ 4 / 4 Case Files Solved',
    '✓ 4 Photo Pieces Recovered (P01 - P04)',
    '✓ Bedroom Exit Door Unlocked',
  ],
  buttonText = 'Proceed to Corridor Door',
}) {
  if (!isOpen) return null;

  if (variant === 'control') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-panel w-[94vw] max-w-lg flex flex-col gap-5 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-white/10 pb-3">
            <div>
              <div className="text-[10px] tracking-[0.22em] text-[#9cd498] uppercase font-sans font-semibold mb-1">
                {roomBadge}
              </div>
              <h2 className="font-re-display text-xl font-bold text-[#f4f3ef] m-0">
                {title}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="re-btn" aria-label="Close">
              <span className="re-btn-circle">ESC</span>
              <span>Close</span>
            </button>
          </div>

          <p className="text-xs text-[#cfc8ba] font-sans leading-relaxed m-0">
            {description}
          </p>

          <div className="bg-black/45 border border-white/10 p-4 space-y-2 text-xs font-sans text-[#ded8cc]">
            {recapLines.map((line, i) => (
              <div key={i} className="flex items-center gap-2 text-[#9cd498]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{line.replace(/^✓\s*/, '')}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToDoor?.();
              }}
              className="re-btn justify-between w-full"
            >
              <span className="flex items-center gap-2.5">
                <span className="re-btn-circle">E</span>
                <span>{buttonText}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-[#f4f3ef]" />
            </button>

            {onNavigateRoom && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateRoom('bedroom');
                  }}
                  className="re-btn w-full"
                >
                  <span className="re-btn-circle">1</span>
                  <span>Return to Room 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateRoom('records');
                  }}
                  className="re-btn w-full"
                >
                  <span className="re-btn-circle">4</span>
                  <span>Return to Room 4</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0e091c] border-2 border-[#8f7bff] rounded-2xl shadow-[0_0_50px_rgba(143,123,255,0.3)] overflow-hidden text-center p-8 space-y-6">
        
        {/* Glow ambient background element */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#8f7bff]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#86efac]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Big Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8f7bff]/30 to-[#86efac]/20 border border-[#8f7bff]/50 flex items-center justify-center shadow-xl">
          <Unlock className="w-10 h-10 text-[#86efac] animate-bounce" />
        </div>

        {/* Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18261e] border border-[#22543d] text-[#86efac] text-xs font-mono font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            {roomBadge}
          </div>
          <h2 className="text-2xl font-black text-[#e8e0ff] font-serif tracking-wide">
            {title}
          </h2>
          <p className="text-xs text-[#cdbfff] font-mono max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Rewards Recap */}
        <div className="p-4 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-gray-300 space-y-2 text-left">
          <div className="flex items-center justify-between text-[#86efac]">
            <span>{recapLines[0]}</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between text-[#ffcf8a]">
            <span>{recapLines[1]}</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between text-[#cdbfff]">
            <span>{recapLines[2]}</span>
            <Unlock className="w-4 h-4" />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onProceedToDoor?.();
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8f7bff] to-[#a696ff] hover:from-[#a696ff] hover:to-[#cdbfff] text-black font-black font-mono text-sm tracking-wider uppercase transition shadow-lg shadow-[#8f7bff]/30 flex items-center justify-center gap-2"
          >
            <span>{buttonText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

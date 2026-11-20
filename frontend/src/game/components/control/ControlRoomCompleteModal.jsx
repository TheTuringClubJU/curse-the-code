import React, { useEffect } from 'react';
import { Trophy, Unlock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ControlRoomCompleteModal({
  isOpen,
  onClose,
  onProceedToDoor,
  cluesSolved = 3,
  totalClues = 3,
  collectedCount = 10,
  totalFragments = 10,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="control-room-complete-modal"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 select-none animate-fadeIn font-mono"
    >
      <div className="relative w-full max-w-lg bg-[#0d1012] border-2 border-[#c47a00]/80 rounded-2xl shadow-[0_0_50px_rgba(196,122,0,0.3)] overflow-hidden text-center p-8 space-y-6">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#c47a00]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#86efac]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#c47a00]/25 to-[#86efac]/15 border border-[#c47a00]/50 flex items-center justify-center shadow-xl">
          <Unlock className="w-10 h-10 text-[#86efac] animate-bounce" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18261e] border border-[#22543d] text-[#86efac] text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            R2 · ROOM 2 CLEARED
          </div>
          <h2 className="text-2xl font-black text-[#ffd68a] font-serif tracking-wide">
            The Surveillance Morgue Completed!
          </h2>
          <p className="text-xs text-[#9fb3c4] max-w-md mx-auto leading-relaxed">
            All {totalClues} clue terminals in Sector 5 Control have been resolved. The hydraulic bulkhead locking the Core Airlock Valve Manifold (Fork 2) has disengaged.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-black/50 border border-white/10 text-xs text-gray-300 space-y-2 text-left">
          <div className="flex items-center justify-between text-[#86efac]">
            <span>✓ {cluesSolved} / {totalClues} Clues Solved (R2-01, R2-05, R2-06)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between text-[#ffd68a]">
            <span>✓ {collectedCount} / {totalFragments} Evidence Fragments Recovered</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between text-[#9fb3c4]">
            <span>✓ Core Airlock Valve Manifold (Fork 2) Unsealed</span>
            <Unlock className="w-4 h-4" />
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={() => {
              onProceedToDoor?.();
            }}
            className="w-full py-3.5 rounded-xl bg-[#86efac] hover:bg-[#4ade80] text-[#050d08] font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition shadow-lg text-sm cursor-pointer"
          >
            <span>Proceed to Core Airlock (Fork 2)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-200 transition cursor-pointer"
          >
            Stay in Sector 5 Control
          </button>
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import { Trophy, Unlock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function RoomCompleteModal({
  isOpen,
  onClose,
  onProceedToDoor
}) {
  if (!isOpen) return null;

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
            ROOM 1 CLEARED
          </div>
          <h2 className="text-2xl font-black text-[#e8e0ff] font-serif tracking-wide">
            Lena's Bedroom Completed!
          </h2>
          <p className="text-xs text-[#cdbfff] font-mono max-w-md mx-auto leading-relaxed">
            All 4 case files in this room have been solved. The heavy iron deadbolts locking the bedroom door have disengaged. The corridor to Room 2 (The Study) is now open!
          </p>
        </div>

        {/* Rewards Recap */}
        <div className="p-4 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-gray-300 space-y-2 text-left">
          <div className="flex items-center justify-between text-[#86efac]">
            <span>✓ 4 / 4 Case Files Solved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between text-[#ffcf8a]">
            <span>✓ 4 Photo Pieces Recovered (P01 - P04)</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between text-[#cdbfff]">
            <span>✓ Bedroom Exit Door Unlocked</span>
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
            <span>Proceed to Corridor Door</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

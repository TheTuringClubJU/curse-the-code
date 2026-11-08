import React from 'react';
import { Trophy, Unlock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function StudyCompleteModal({
  isOpen,
  onClose,
  onProceedToDoor,
  solvedCount = 4,
  photoCount = 8
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#04120b] border-2 border-[#3dff8b] rounded-2xl shadow-[0_0_60px_rgba(61,255,139,0.35)] overflow-hidden text-center p-8 space-y-6">
        
        {/* Glow ambient background element */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#3dff8b]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#7dffb0]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Big Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1b4d28] to-[#0e2916] border border-[#3dff8b]/60 flex items-center justify-center shadow-xl">
          <Unlock className="w-10 h-10 text-[#3dff8b] animate-bounce" />
        </div>

        {/* Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0a2414] border border-[#2b6641] text-[#7dffb0] text-xs font-mono font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            ROOM 2 CLEARED
          </div>
          <h2 className="text-2xl font-black text-[#b6ffd1] font-mono tracking-wide">
            Daniel's Study Completed!
          </h2>
          <p className="text-xs text-[#7dffb0] font-mono max-w-md mx-auto leading-relaxed">
            All investigation terminals in Daniel's study have been solved. The pneumatic steel deadbolts on the North blast door have disengaged. The containment passage to Room 3 (The Basement) is now open!
          </p>
        </div>

        {/* Rewards Recap */}
        <div className="p-4 rounded-xl bg-black/60 border border-[#1b3d27] text-xs font-mono text-[#b6ffd1] space-y-2 text-left">
          <div className="flex items-center justify-between text-[#3dff8b]">
            <span>✓ {solvedCount} / 4 Case Files Solved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between text-[#7dffb0]">
            <span>✓ {photoCount} Photo Pieces Recovered</span>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between text-[#b6ffd1]">
            <span>✓ Basement Blast Door Unlocked</span>
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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#22703f] to-[#3dff8b] hover:from-[#2e9454] hover:to-[#7dffb0] text-[#04120b] font-black font-mono text-sm tracking-wider uppercase transition shadow-lg shadow-[#3dff8b]/30 flex items-center justify-center gap-2"
          >
            <span>Proceed to Blast Door</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

import React from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Round1VictoryModal({ isOpen, onClose, onProceed }) {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[90] bg-black/86 backdrop-blur-lg flex items-center justify-center p-4"
    >
      <div className="bsmt-glass-panel relative w-full max-w-xl overflow-hidden p-8 text-center">
        <div className="absolute inset-0 pointer-events-none animate-pulse bg-[radial-gradient(circle_at_center,rgba(255,77,77,0.16),transparent_65%)]" />
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-white/35 bg-white/10 backdrop-blur-md">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>
        <div className="relative">
          <div className="mb-2 text-xs font-bold tracking-[.35em] text-[#fca5a5] uppercase">
            CONTAINMENT SEAL DISENGAGED
          </div>
          <h2 className="font-bsmt-display text-3xl sm:text-4xl font-bold text-white uppercase">
            Round 1 Victory
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/75 font-bsmt-ui">
            All three containment phases are complete. The subterranean vault seal is disengaged. Stand by in the tournament lobby for official curator review and qualification standings.
          </p>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-2.5 text-xs font-bsmt-ui">
          <div className="bsmt-glass-card p-3">
            <b className="block text-white font-mono">10/10</b>
            <span className="text-white/60 text-[10px]">PHOTO PIECES</span>
          </div>
          <div className="bsmt-glass-card p-3">
            <b className="block text-white font-mono">BETA</b>
            <span className="text-white/60 text-[10px]">PROTOCOL</span>
          </div>
          <div className="bsmt-glass-card p-3">
            <b className="flex items-center justify-center text-emerald-300 font-mono">
              <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-300" /> COMPLETE
            </b>
            <span className="text-white/60 text-[10px]">STATUS</span>
          </div>
        </div>
        <button
          className="bsmt-glass-primary relative mt-6 w-full"
          onClick={() => {
            onClose?.();
            onProceed?.();
          }}
        >
          PROCEED TO LOBBY <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

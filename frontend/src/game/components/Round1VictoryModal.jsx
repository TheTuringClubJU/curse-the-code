import React from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Round1VictoryModal({ isOpen, onClose, onProceed }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border-2 border-red-500/60 bg-[#10090b] p-8 text-center shadow-[0_0_70px_rgba(255,42,42,.35)]">
        <div className="absolute inset-0 pointer-events-none animate-pulse bg-[radial-gradient(circle_at_center,rgba(255,42,42,.18),transparent_65%)]" />
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-red-400/50 bg-red-950/60">
          <ShieldCheck className="h-10 w-10 text-red-300" />
        </div>
        <div className="relative">
          <div className="mb-2 text-xs font-bold tracking-[.35em] text-red-400">
            CONTAINMENT SEAL DISENGAGED
          </div>
          <h2 className="font-serif text-3xl font-black text-[#ffd6d6]">
            Round 1 Victory
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-red-100/70">
            All three containment phases are complete. The subterranean vault seal is disengaged. Stand by in the tournament lobby for official curator review and qualification standings.
          </p>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded border border-red-500/20 bg-black/40 p-3">
            <b className="block text-red-300">10/10</b>
            PHOTO PIECES
          </div>
          <div className="rounded border border-red-500/20 bg-black/40 p-3">
            <b className="block text-red-300">BETA</b>
            PROTOCOL
          </div>
          <div className="rounded border border-red-500/20 bg-black/40 p-3">
            <b className="flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-400" /> COMPLETE
            </b>
            STATUS
          </div>
        </div>
        <button
          className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 py-3 font-bold text-white hover:bg-red-600 transition"
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

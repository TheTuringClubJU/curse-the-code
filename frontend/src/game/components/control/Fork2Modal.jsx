import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, CheckCircle2, Gauge } from 'lucide-react';

export default function Fork2Modal({
  isOpen,
  onClose,
  audio,
  onProceedToRoom6,
}) {
  const [selectedValve, setSelectedValve] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [trapActive, setTrapActive] = useState(false);
  const [trapMessage, setTrapMessage] = useState('');
  const [wrongValveBarred, setWrongValveBarred] = useState(false);
  const [successPhase, setSuccessPhase] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    let isCancelled = false;
    const fetchForkStatus = async () => {
      try {
        const res = await fetch('/api/game/round/2/fork/airlock/status', {
          credentials: 'include',
          headers: {
            'x-session-token': localStorage.getItem('ctc_token') || '',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            if (Array.isArray(data.barred_choices) && data.barred_choices.includes('A')) {
              setWrongValveBarred(true);
            }
            if (data.resolved) {
              setSuccessPhase(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to query Fork 2 status:', err);
      }
    };

    fetchForkStatus();
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !trapActive && !submitting) {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, trapActive, submitting, onClose]);

  if (!isOpen) return null;

  const handleChooseValve = async (choice) => {
    if (submitting || (choice === 'A' && wrongValveBarred)) return;
    setSubmitting(true);
    setSelectedValve(choice);

    try {
      const res = await fetch('/api/game/round/2/fork/airlock/choose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ctc_token') || '',
        },
        credentials: 'include',
        body: JSON.stringify({ choice }),
      });
      const data = await res.json();

      if (data.is_trap || (choice === 'A' && !data.is_correct)) {
        setTrapActive(true);
        setTrapMessage(data.message || 'Auxiliary feed valve failure. +60s time penalty applied.');
        audio?.bad?.();
        audio?.drawerSlam?.(0, 0);
        audio?.entityScream?.(0, 0, 0.9);
        setTimeout(() => {
          setWrongValveBarred(true);
          setSelectedValve(null);
          setTrapActive(false);
          setSubmitting(false);
        }, 2800);
      } else if (data.barred) {
        setWrongValveBarred(true);
        setSelectedValve(null);
        setSubmitting(false);
      } else {
        audio?.good?.();
        setSuccessPhase(true);
        setTimeout(() => {
          setSubmitting(false);
          onProceedToRoom6?.(data);
        }, 1400);
      }
    } catch (err) {
      console.error('Error submitting Fork 2 choice:', err);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 select-none font-mono">
      {trapActive && (
        <div
          data-testid="fork2-trap-overlay"
          className="absolute inset-0 z-50 bg-[#090405] flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="max-w-lg space-y-4 border border-red-700/70 bg-red-950/30 p-8 rounded-xl shadow-2xl">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
            <div className="text-2xl sm:text-3xl text-red-500 font-black tracking-widest uppercase">
              CONTAMINATED FEED BREACH
            </div>
            <p className="text-xs sm:text-sm text-red-200">{trapMessage}</p>
            <div className="inline-block px-3 py-1 rounded bg-red-900/60 border border-red-500/60 text-xs font-bold text-red-200">
              +60s PENALTY APPLIED · VALVE A SEALED
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-3xl bg-[#0e1012] border border-[#c47a00]/60 shadow-[0_0_50px_rgba(196,122,0,0.22)] rounded-xl overflow-hidden text-[#e6ecef]">
        <div className="px-6 py-4 bg-[#15181c] border-b border-[#2e353d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gauge className="w-5 h-5 text-[#c47a00]" />
            <div>
              <div className="text-[10px] tracking-[0.22em] text-[#8ca0b0] uppercase">
                ROUND 2 // CORE AIRLOCK VALVE SELECTOR
              </div>
              <h2 className="text-sm sm:text-base font-bold tracking-wider text-[#ffd68a] uppercase">
                FORK 2 • CORE AIRLOCK PURGE MANIFOLD
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-xs text-[#8ca0b0] hover:text-white px-2.5 py-1 border border-[#343d46] hover:border-[#ffd68a] rounded transition"
          >
            [ESC] CLOSE
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-[#9cb0c0] leading-relaxed border-l-2 border-[#c47a00] pl-3">
            Select the primary containment equalization valve to unseal the hydraulic vault bulkhead ahead.
            Pressurizing the wrong manifold triggers an aerosol breach (+60s round penalty).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Valve A: Trap */}
            <div
              className={`p-5 rounded-xl border-2 flex flex-col justify-between transition ${
                wrongValveBarred
                  ? 'bg-[#120b0b] border-red-900/50 opacity-65 cursor-not-allowed'
                  : 'bg-[#14171b] border-[#343d46] hover:border-red-500/70 cursor-pointer'
              }`}
              onClick={() => handleChooseValve('A')}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#c47a00]">VALVE ALPHA (A)</span>
                  {wrongValveBarred ? (
                    <span className="text-red-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> BARRED (+60s)
                    </span>
                  ) : (
                    <span className="text-[#8ca0b0]">AUXILIARY FEED</span>
                  )}
                </div>
                <div className="text-sm font-bold text-[#e6ecef]">
                  AUXILIARY BYPASS LINE
                </div>
                <p className="text-xs text-[#7e909e]">
                  Unverified corroded bypass intake linked to dormant containment vents.
                </p>
              </div>
              <button
                type="button"
                disabled={wrongValveBarred || submitting}
                className={`mt-4 w-full py-2 text-xs font-bold rounded uppercase transition ${
                  wrongValveBarred
                    ? 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                    : 'bg-[#2a2214] hover:bg-red-950 text-[#ffd68a] border border-[#52442c]'
                }`}
              >
                {wrongValveBarred ? 'VALVE BARRED' : selectedValve === 'A' && submitting ? 'OPENING...' : 'ENGAGE VALVE A'}
              </button>
            </div>

            {/* Valve B: Correct route forward */}
            <div
              className="p-5 rounded-xl border-2 bg-[#141815] border-[#c47a00]/65 hover:border-[#4dff78] cursor-pointer flex flex-col justify-between transition"
              onClick={() => handleChooseValve('B')}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400">VALVE BETA (B)</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PRIMARY SEAL
                  </span>
                </div>
                <div className="text-sm font-bold text-[#e6ecef]">
                  PRIMARY CONTAINMENT EQUALIZER
                </div>
                <p className="text-xs text-[#8ca0b0]">
                  Shielded high-pressure hydraulic manifold routed directly to The Anointing Vault bulkhead.
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                className="mt-4 w-full py-2 text-xs font-bold bg-[#b38600] hover:bg-[#d69f00] text-black rounded uppercase transition"
              >
                {selectedValve === 'B' && submitting ? 'UNSEALING...' : 'ENGAGE VALVE B ➔'}
              </button>
            </div>
          </div>

          {successPhase && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-center text-xs font-bold text-emerald-300">
              VALVE B ENGAGED — HYDRAULIC SEAL TO ROOM 6 UNSEALED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


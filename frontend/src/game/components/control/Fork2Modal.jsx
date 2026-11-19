import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Gauge } from 'lucide-react';

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
        // Sprung trap on Valve A
        setTrapActive(true);
        setTrapMessage(
          data.message || 'Auxiliary feed valve failure. Contaminated aerosol released. +60s round penalty applied.'
        );
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
        // Correct choice (Valve B)
        audio?.good?.();
        setSuccessPhase(true);
        setTimeout(() => {
          setSubmitting(false);
          onProceedToRoom6?.(data);
        }, 1200);
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
          className="absolute inset-0 z-50 bg-[#090405]/95 flex flex-col items-center justify-center p-6 text-center animate-shake"
        >
          <div className="max-w-lg space-y-4 border-2 border-red-700 bg-red-950/50 p-8 rounded-xl shadow-2xl">
            <ShieldAlert className="w-14 h-14 text-red-500 mx-auto animate-pulse" />
            <div className="text-2xl sm:text-3xl text-red-500 font-black tracking-widest uppercase">
              CONTAMINATED FEED BREACH
            </div>
            <p className="text-xs sm:text-sm text-red-200 leading-relaxed">{trapMessage}</p>
            <div className="inline-block px-4 py-1.5 rounded bg-red-900/80 border border-red-500 text-xs font-bold text-red-200">
              +60s PENALTY APPLIED · EMERGENCY BYPASS ENGAGED
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Emergency ventilation sequence forced airlock unseal. Advancing to Room 6...
            </p>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-3xl bg-[#0e1012] border border-[#c47a00]/60 shadow-[0_0_50px_rgba(196,122,0,0.22)] rounded-xl overflow-hidden text-[#e6ecef]">
        {/* Header */}
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

        {/* Deduction Briefing */}
        <div className="p-6 space-y-4">
          <div className="p-3 bg-[#13161a] border border-[#c47a00]/40 rounded text-xs space-y-2">
            <div className="font-bold text-[#ffd68a] uppercase tracking-wider">
              — BULKHEAD EQUALIZATION PROTOCOL // SECTOR 5 SUB-STATION —
            </div>
            <p className="text-[#a8b8c8] leading-relaxed">
              To release the inner hydraulic bulkhead to <span className="text-[#ffd68a] font-semibold">The Anointing Vault (Room 6)</span>, you must pressurize the authentic containment circuit. Rerouting high pressure through a compromised manifold triggers a contaminated aerosol breach (+60s penalty).
            </p>
            <p className="text-[#8ca0b0] leading-relaxed border-t border-[#232b35] pt-2">
              <span className="text-[#c47a00] font-semibold">Archival Cross-Reference:</span> In the Transmission Archive (CF-CFA6), CIPHER’s verified transmission (Operator BDG-0417) identified VM-B as the only authentic communication, warning that Auxiliary vent seals collapsed during the evacuation while Primary Containment Line Beta retains active equalizing pressure.
            </p>
          </div>

          {/* Dual Valves */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Valve Alpha: Auxiliary Bypass (Trap) */}
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
                      <Lock className="w-3.5 h-3.5" /> RUPTURED (+60s)
                    </span>
                  ) : (
                    <span className="text-[#8ca0b0]">AUXILIARY FEED</span>
                  )}
                </div>
                <div className="text-sm font-bold text-[#e6ecef]">
                  AUXILIARY BYPASS LINE
                </div>
                <p className="text-xs text-[#7e909e] leading-relaxed">
                  Decommissioned bypass line routed into dormant auxiliary vents. Decoy broadcasts urged staff to use this intake, but structural logs show the auxiliary line ruptured during the 1996 containment failure.
                </p>
              </div>
              <button
                type="button"
                disabled={wrongValveBarred || submitting}
                className={`mt-4 w-full py-2.5 text-xs font-bold rounded uppercase transition ${
                  wrongValveBarred
                    ? 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                    : 'bg-[#2a2214] hover:bg-red-950 text-[#ffd68a] border border-[#52442c]'
                }`}
              >
                {wrongValveBarred ? 'VALVE RUPTURED' : selectedValve === 'A' && submitting ? 'PRESSURIZING...' : 'ENGAGE VALVE A'}
              </button>
            </div>

            {/* Valve Beta: Primary Containment Equalizer (Correct) */}
            <div
              className="p-5 rounded-xl border-2 bg-[#14171b] border-[#343d46] hover:border-[#ffd68a]/70 cursor-pointer flex flex-col justify-between transition"
              onClick={() => handleChooseValve('B')}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#ffd68a]">VALVE BETA (B)</span>
                  <span className="text-[#8ca0b0]">PRIMARY CONTAINMENT</span>
                </div>
                <div className="text-sm font-bold text-[#e6ecef]">
                  PRIMARY CONTAINMENT EQUALIZER
                </div>
                <p className="text-xs text-[#7e909e] leading-relaxed">
                  Reinforced high-pressure hydraulic manifold routed direct to The Anointing Vault inner bulkhead. Confirmed by CIPHER’s authentic VM-B audio cipher as the intact operational feed to the biological core.
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                className="mt-4 w-full py-2.5 text-xs font-bold bg-[#b38600] hover:bg-[#d69f00] text-black rounded uppercase transition"
              >
                {selectedValve === 'B' && submitting ? 'EQUALIZING...' : 'ENGAGE VALVE B ➔'}
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {successPhase && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-center text-xs font-bold text-emerald-300">
              VALVE B ENGAGED — HYDRAULIC EQUALIZATION SUCCESSFUL. ADVANCING TO THE ANOINTING VAULT (ROOM 6)...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

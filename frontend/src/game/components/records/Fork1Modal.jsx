import React, { useState, useEffect } from 'react';
import { Compass, AlertTriangle, ArrowRight, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';

export default function Fork1Modal({
  isOpen,
  onClose,
  audio,
  onApplyBatteryPenalty,
  onProceedToRoom5
}) {
  if (!isOpen) return null;

  // Selected wing: null | 'A' | 'B'
  const [selectedWing, setSelectedWing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [trapActive, setTrapActive] = useState(false);
  const [trapPhase, setTrapPhase] = useState(0); // 0: normal, 1: slam, 2: scratch, 3: whisper, 4: reset
  const [wrongWingBarred, setWrongWingBarred] = useState(false);
  const [successPhase, setSuccessPhase] = useState(false);

  // Sync fork status with backend on modal mount
  useEffect(() => {
    let isCancelled = false;
    const fetchForkStatus = async () => {
      try {
        const res = await fetch('/api/game/fork/fork_1/status', {
          credentials: 'include',
          headers: {
            'x-session-token': localStorage.getItem('ctc_token') || ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            if (data.barred_choices && data.barred_choices.includes('A')) {
              setWrongWingBarred(true);
            }
            if (data.resolved) {
              setSuccessPhase(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to query Fork 1 status:', err);
      }
    };

    fetchForkStatus();
    return () => {
      isCancelled = true;
    };
  }, []);

  // According to ROUND2_DESIGN.md:
  // Wing B (PRIMARY WING - MAIN VAULT FEED) connects to Room 5 Control Room.
  // Wing A (AUXILIARY WING - SUB-STATION 11) is the sealed trap box.
  const handleCommitSelection = async (wing) => {
    if (submitting || (wing === 'A' && wrongWingBarred)) return;
    setSubmitting(true);
    setSelectedWing(wing);

    try {
      const res = await fetch('/api/game/fork/fork_1/choose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ctc_token') || ''
        },
        credentials: 'include',
        body: JSON.stringify({ choice: wing })
      });
      const data = await res.json();

      if (data.is_trap || wing === 'A') {
        // TRIGGER FORK TRAP SEQUENCE (Most violent event in game)
        setTrapActive(true);
        setTrapPhase(1); // Door slams
        audio?.drawerSlam?.(0, 0);

        // Phase 1: Slam
        setTimeout(() => {
          setTrapPhase(2); // Scratching from walls
          audio?.followerFootstepsBehind?.();
        }, 1500);

        // Phase 2: Whispers & screamer
        setTimeout(() => {
          setTrapPhase(3); // "Wrong room"
          audio?.whisperRaspy?.('behind', 0, 0);
          audio?.screamingStinger?.(1.4);
        }, 3400);

        // Phase 3: Whiteout & Reset
        setTimeout(() => {
          setTrapPhase(4);
          onApplyBatteryPenalty?.(30); // 30% battery loss
          setWrongWingBarred(true);
          setSelectedWing(null);
          setTrapActive(false);
          setSubmitting(false);
        }, 4800);
      } else {
        // CORRECT CHOICE (Wing B -> Room 5)
        audio?.good?.();
        setSuccessPhase(true);
        setTimeout(() => {
          setSubmitting(false);
          onProceedToRoom5?.();
        }, 1800);
      }
    } catch (err) {
      console.error('Error submitting fork choice:', err);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 select-none font-mono">
      {/* Trap Horror Sequence Fullscreen Overlay */}
      {trapActive && (
        <div className="absolute inset-0 z-50 bg-[#080605] flex flex-col items-center justify-center p-6 text-center animate-shake">
          {trapPhase === 1 && (
            <div className="space-y-4">
              <div className="text-4xl text-red-600 font-black tracking-widest uppercase animate-bounce">
                DOOR SLAMS SHUT
              </div>
              <p className="text-xs text-red-400 font-mono">
                HEAVY IRON DOOR CRASHES BEHIND YOU. 2x2 METRE STONE CELL. NO EXIT.
              </p>
            </div>
          )}

          {trapPhase === 2 && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-red-600 border-t-transparent animate-spin" />
              <div className="text-xl text-[#f3ead0] font-bold tracking-widest uppercase">
                NAILS SCRATCHING ON STONE...
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Scratching sounds surrounding from every wall simultaneously.
              </p>
            </div>
          )}

          {trapPhase === 3 && (
            <div className="space-y-4">
              <div className="text-5xl text-red-600 font-black tracking-widest uppercase scale-125 transition-transform animate-pulse">
                "WRONG ROOM."
              </div>
              <p className="text-xs text-red-300 font-mono">
                ANOMALY CONTACT DETECTED. ELECTRICAL SHOCK DISCHARGE.
              </p>
            </div>
          )}

          {trapPhase === 4 && (
            <div className="space-y-4">
              <div className="text-3xl text-zinc-300 font-mono font-bold">
                SCREEN PULSES WHITE...
              </div>
              <p className="text-xs text-amber-500 font-mono">
                FORCED REVERSION TO CORRIDOR JUNCTION. -30% FLASHLIGHT BATTERY.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Fork Selection Terminal Panel */}
      {!trapActive && (
        <div className="relative w-full max-w-3xl flex flex-col bg-[#12100d] border-2 border-[#b38600] shadow-[0_0_60px_rgba(179,134,0,0.35)] rounded-xl overflow-hidden text-[#e6ecef]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#1c1811] border-b border-[#b38600]/40">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-[#ffaa00] animate-pulse" />
              <div>
                <span className="text-[10px] text-[#a0885c] uppercase tracking-widest block">
                  FORK 1 • ROUTE SELECTION JUNCTION
                </span>
                <h2 className="text-sm font-bold text-[#ffd68a] tracking-wider uppercase font-mono">
                  SUB-STATION DELTA // DUAL-PATH FORK
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-[#8ca0b0] hover:text-white px-2 py-1 border border-[#443822] rounded transition"
            >
              [ESC] RETURN
            </button>
          </div>

          {/* Description & Brass Plaque */}
          <div className="p-6 bg-[#0c0a08] border-b border-[#302614] space-y-3">
            <div className="p-3 bg-[#1e1b12] border border-[#b38600]/50 rounded text-center">
              <span className="text-xs font-bold text-[#ffd68a] tracking-widest uppercase block">
                — BRASS PLAQUE INSCRIPTION —
              </span>
              <p className="text-xs text-[#dcd2be] mt-1 font-serif">
                "SUB-STATION DELTA — ROUTE SELECTION REQUIRED.<br />
                ONE CORRIDOR ADVANCES INTO THE PRIMARY CONTROL CORE. THE OTHER TERMINATES IN SEALED QUARANTINE."
              </p>
            </div>

            <p className="text-xs text-[#9a886c] text-center max-w-xl mx-auto">
              Cross-reference Room 4 archival documents: check the Requisition Form &amp; Shutdown Forgery notice to deduce which wing remained active.
            </p>
          </div>

          {/* Dual Archways Selection */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#100e0b]">
            
            {/* Wing A: Auxiliary Wing (Trap) */}
            <div
              className={`relative p-5 rounded-xl border-2 flex flex-col justify-between transition-all ${
                wrongWingBarred
                  ? 'bg-red-950/20 border-red-900/40 opacity-40 cursor-not-allowed'
                  : 'bg-[#18140e] border-[#3d321d] hover:border-red-500/80 cursor-pointer shadow-lg hover:-translate-y-1'
              }`}
              onClick={() => {
                if (!wrongWingBarred) handleCommitSelection('A');
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-red-400">ARCHWAY A</span>
                  {wrongWingBarred ? (
                    <span className="flex items-center gap-1 text-red-500">
                      <Lock className="w-3.5 h-3.5" /> SEALED WITH BARS
                    </span>
                  ) : (
                    <span className="text-zinc-500">[STANDBY]</span>
                  )}
                </div>

                <div className="text-base font-bold text-[#f3ead0] font-mono">
                  AUXILIARY WING<br />
                  <span className="text-xs text-[#a0885c]">SUB-STATION 11 QUARANTINE</span>
                </div>

                <p className="text-xs text-[#8a7651]">
                  Heavy rusted iron archway. Faint cold draft and water seepage beneath the sill.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#302614]">
                <button
                  type="button"
                  disabled={wrongWingBarred || submitting}
                  className={`w-full py-2 text-xs font-bold rounded uppercase transition ${
                    wrongWingBarred
                      ? 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                      : 'bg-[#2a2214] hover:bg-red-950 hover:text-red-200 text-[#ffd68a] border border-[#52442c]'
                  }`}
                >
                  {wrongWingBarred ? 'BARRED BY TRAP RESET' : submitting && selectedWing === 'A' ? 'ENTERING ARCH...' : 'SELECT WING A ➔'}
                </button>
              </div>
            </div>

            {/* Wing B: Primary Wing (Correct Route to Room 5) */}
            <div
              className="relative p-5 rounded-xl border-2 bg-[#18140e] border-[#b38600]/60 hover:border-[#ffaa00] cursor-pointer shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between"
              onClick={() => handleCommitSelection('B')}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400">ARCHWAY B</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> OPERATIONAL FEED
                  </span>
                </div>

                <div className="text-base font-bold text-[#f3ead0] font-mono">
                  PRIMARY WING<br />
                  <span className="text-xs text-[#a0885c]">MAIN VAULT CONTROL FEED</span>
                </div>

                <p className="text-xs text-[#8a7651]">
                  Reinforced conduit archway. Low electrical hum vibrating through iron pipe fittings.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#302614]">
                <button
                  type="button"
                  disabled={submitting}
                  className="w-full py-2 text-xs font-bold bg-[#b38600] hover:bg-[#d69f00] text-black rounded uppercase transition shadow"
                >
                  {submitting && selectedWing === 'B' ? 'PROCEEDING...' : 'SELECT WING B ➔ PROCEED TO ROOM 5'}
                </button>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {successPhase && (
            <div className="p-4 bg-emerald-950/90 border-t border-emerald-500 text-center text-xs font-bold text-emerald-300 animate-pulse">
              ✓ ROUTE CONFIRMED: ENTERING SECTOR 5 (CONTROL ROOM)...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

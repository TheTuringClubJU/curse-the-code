import React, { useEffect, useState } from 'react';
import {
  X,
  Lightbulb,
  Clock,
  ShieldAlert,
  MapPin,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';

export default function HintModal({
  isOpen,
  onClose,
  roomId = 'bedroom',
  roomTitle = "Lena's Bedroom"
}) {
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [hintStatus, setHintStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [latestHint, setLatestHint] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/game/hint/status', {
        credentials: 'include',
        headers: {
          'x-session-token': localStorage.getItem('ctc_token') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHintStatus(data);
      } else {
        setErrorMsg('Failed to load hint status.');
      }
    } catch (e) {
      setErrorMsg('Network error connecting to hint service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setLatestHint(null);
    }
  }, [isOpen, roomId]);

  const isVault = roomId === 'vault';
  if (!isOpen) return null;

  const handleRequestHint = async () => {
    if (requesting) return;
    setRequesting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/game/hint', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ctc_token') || ''
        },
        body: JSON.stringify({ room_id: roomId })
      });
      const data = await res.json();
      if (res.ok && (data.success !== false && (data.success || data.target_id || data.hint_text))) {
        setLatestHint(data);
        await fetchStatus();
      } else {
        setErrorMsg(data.detail?.message || data.detail || 'Unable to dispatch hint at this time.');
      }
    } catch (e) {
      setErrorMsg('Failed to request hint. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const remaining = hintStatus?.hints_remaining ?? 15;
  const totalPenalty = hintStatus?.total_penalty_seconds ?? 0;
  const unlockedHints = hintStatus?.unlocked_hints || [];

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl bg-[#0a0c10]/94 backdrop-blur-xl border border-slate-500/35 ${
          isVault ? 'rounded-[2px] border-l-2 border-l-[#b91c1c]' : 'rounded-3xl'
        } shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.03] border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className={isVault ? 'p-1.5 rounded-[2px] bg-red-950/35 border border-red-500/45' : 'p-1.5 rounded-full bg-amber-500/15 border border-amber-400/35'}>
              <Lightbulb className="w-5 h-5 text-[#ff9d54]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#f5efe6] font-serif tracking-wide flex items-center gap-2">
                HINTS & INVESTIGATION GUIDANCE
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                Active Chamber: <b className="text-amber-200">{roomTitle}</b>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={isVault ? 're-plate !p-2 cursor-pointer' : 'p-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tournament Meter Bar */}
        <div className="grid grid-cols-2 bg-black/35 border-b border-white/10 px-5 py-2.5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#ff9d54]" />
            <span className="text-gray-400">Budget:</span>
            <span className={`font-bold text-white bg-black/50 px-2.5 py-0.5 ${isVault ? 'rounded-[2px]' : 'rounded-full'} border border-white/15`}>
              {remaining} / 15 REMAINING
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Clock className="w-4 h-4 text-red-400" />
            <span className="text-gray-400">Time Penalty:</span>
            <span className={`font-bold text-red-300 bg-red-950/50 px-2.5 py-0.5 ${isVault ? 'rounded-[2px]' : 'rounded-full'} border border-red-500/35`}>
              +{totalPenalty}s
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Request Action Card */}
          <div className={isVault ? 'p-4 rounded-[2px] bg-white/[0.03] border border-white/10 space-y-3' : 'p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3'}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-amber-300 block">
                  Need Immediate Guidance?
                </span>
                <p className="text-[11px] text-slate-300 font-sans">
                  The vault logs your pleas cleanly. Hints unlock one progressive layer at a time:
                </p>
              </div>

              <button
                disabled={requesting || remaining <= 0}
                onClick={handleRequestHint}
                className={
                  isVault
                    ? 're-plate re-plate-amber shrink-0 !py-2.5 !px-5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                    : 'shrink-0 flex items-center justify-center gap-2 bg-[#b45309]/85 hover:bg-[#d97706] border border-amber-400/45 text-white font-mono font-bold text-xs px-5 py-2.5 rounded-full shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
                }
              >
                {requesting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Unlocking...</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4 text-white" />
                    <span>REQUEST NEXT HINT</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-[#c29b7f] border-t border-[#78441d]/20 pt-2.5">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[#ff9d54]" />
                <span>Fragment Search: <b>+10s time penalty</b> (0 pts)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-[#ff9d54]" />
                <span>Clue Solve: <b>+30s time penalty</b> (-15 pts on solve)</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-red-950/40 border border-red-500/40 text-xs font-mono text-red-300">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Newly Dispatched Hint Highlight */}
          {latestHint && (
            <div
              className={
                isVault
                  ? 'p-4 rounded-[2px] bg-[#16100b] border border-[#926933]/70 border-l-2 border-l-[#f59e0b] animate-fade-in space-y-2'
                  : 'p-4 rounded-xl bg-[#2e1507] border-2 border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-fade-in space-y-2'
              }
            >
              <div className="flex items-center justify-between border-b border-[#f59e0b]/30 pb-2">
                <span className="flex items-center gap-1.5 font-bold text-[#fef3c7] font-mono text-xs uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-[#fbbf24]" />
                  Newly Unlocked: {latestHint.target_title || latestHint.target_id}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 bg-black/60 text-[#fde68a] border border-[#f59e0b]/40 ${
                    isVault ? 'rounded-[2px]' : 'rounded'
                  }`}
                >
                  +{latestHint.penalty_applied ?? latestHint.penalty_seconds ?? 0}s PENALTY
                </span>
              </div>

              {latestHint.hint_details?.location_prop && (
                <div className="text-xs text-[#fed7aa] font-mono flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
                  <span>Room Location: <b>{latestHint.hint_details.location_prop}</b></span>
                </div>
              )}

              <p
                className={`text-sm font-serif text-white bg-black/40 p-3 border border-white/10 leading-relaxed ${
                  isVault ? 'rounded-[2px]' : 'rounded-lg'
                }`}
              >
                {latestHint.hint_details?.guidance || latestHint.hint_text}
              </p>
            </div>
          )}

          {/* Unlocked Hints History */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400 border-b border-white/10 pb-1.5">
              <span className="text-[#ffdfba] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#ff9d54]" />
                UNLOCKED DOSSIER ARCHIVE ({unlockedHints.length})
              </span>
              <span
                className={`text-[10px] text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 border border-emerald-500/30 ${
                  isVault ? 'rounded-[2px]' : 'rounded'
                }`}
              >
                FREE RE-READING (0 penalty)
              </span>
            </div>

            {loading ? (
              <div className="text-center py-6 text-xs font-mono text-gray-500">
                Loading hint archives...
              </div>
            ) : unlockedHints.length === 0 ? (
              <div
                className={`text-center py-6 border border-dashed border-[#78441d]/30 text-xs font-mono text-gray-500 ${
                  isVault ? 'rounded-[2px]' : 'rounded-lg'
                }`}
              >
                No hints unlocked yet. Solve cleanly to claim full 100 points!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {unlockedHints.map((hint, idx) => (
                  <div
                    key={hint.id || idx}
                    className={`p-3 bg-[#140b07] border border-[#78441d]/30 text-xs font-mono space-y-1 hover:border-[#ff9d54]/50 transition ${
                      isVault ? 'rounded-[2px]' : 'rounded-lg'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#ff9d54] font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {hint.target_id} • {hint.hint_category === 'fragment' ? 'Fragment Nudge' : 'Clue Guidance'}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.5 bg-black text-gray-400 border border-white/10 ${
                          isVault ? 'rounded-[2px]' : 'rounded'
                        }`}
                      >
                        {hint.room_id}
                      </span>
                    </div>

                    <p className="text-gray-300 font-serif text-xs leading-normal pt-1">
                      {hint.hint_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white/[0.03] border-t border-white/10 flex items-center justify-between text-xs font-mono">
          <span className="text-[10px] text-gray-400">
            Press <kbd className={isVault ? 're-keycap' : 'px-1.5 py-0.5 bg-black/50 rounded-full border border-white/15 text-gray-300'}>H</kbd> or <kbd className={isVault ? 're-keycap' : 'px-1.5 py-0.5 bg-black/50 rounded-full border border-white/15 text-gray-300'}>ESC</kbd> to close
          </span>
          <button
            onClick={onClose}
            className={
              isVault
                ? 're-plate !px-4 !py-1.5 cursor-pointer'
                : 'px-5 py-1.5 rounded-full bg-white/10 text-slate-100 hover:bg-white/20 border border-white/15 transition text-xs font-mono cursor-pointer'
            }
          >
            Return to Room (H)
          </button>
        </div>
      </div>
    </div>
  );
}

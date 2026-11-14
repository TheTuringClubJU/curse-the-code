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
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#0c0a12] border border-[#78441d]/60 rounded-xl shadow-[0_0_35px_rgba(255,122,26,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#1a0e08] border-b border-[#78441d]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#ff7a1a]/15 border border-[#ff7a1a]/30">
              <Lightbulb className="w-5 h-5 text-[#ff9d54]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#ffdfba] font-serif tracking-wide flex items-center gap-2">
                HINTS & INVESTIGATION GUIDANCE
              </h2>
              <p className="text-[11px] font-mono text-[#c29b7f]">
                Active Chamber: <b className="text-[#ffdfba]">{roomTitle}</b>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#c29b7f] hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tournament Meter Bar */}
        <div className="grid grid-cols-2 bg-[#120a06] border-b border-[#78441d]/30 px-5 py-2.5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#ff9d54]" />
            <span className="text-gray-400">Budget:</span>
            <span className="font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-[#78441d]/40">
              {remaining} / 15 REMAINING
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Clock className="w-4 h-4 text-red-400" />
            <span className="text-gray-400">Time Penalty:</span>
            <span className="font-bold text-red-300 bg-red-950/40 px-2 py-0.5 rounded border border-red-500/30">
              +{totalPenalty}s
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Request Action Card */}
          <div className="p-4 rounded-xl bg-[#1f120a]/80 border border-[#8a4b22]/40 shadow-inner space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-[#ff9d54] block">
                  Need Immediate Guidance?
                </span>
                <p className="text-[11px] text-[#dec3ab] font-sans">
                  The house watches your desperation. Hints follow strict sequential chamber logic:
                </p>
              </div>

              <button
                disabled={requesting || remaining <= 0}
                onClick={handleRequestHint}
                className="shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-[#b45309] to-[#d97706] hover:from-[#d97706] hover:to-[#f59e0b] text-white font-mono font-bold text-xs px-4 py-2.5 rounded-lg shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
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
            <div className="p-4 rounded-xl bg-[#2e1507] border-2 border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-fade-in space-y-2">
              <div className="flex items-center justify-between border-b border-[#f59e0b]/30 pb-2">
                <span className="flex items-center gap-1.5 font-bold text-[#fef3c7] font-mono text-xs uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-[#fbbf24]" />
                  Newly Unlocked: {latestHint.target_title || latestHint.target_id}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-[#fde68a] border border-[#f59e0b]/40">
                  +{latestHint.penalty_applied ?? latestHint.penalty_seconds ?? 0}s PENALTY
                </span>
              </div>

              {latestHint.hint_details?.location_prop && (
                <div className="text-xs text-[#fed7aa] font-mono flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />
                  <span>Room Location: <b>{latestHint.hint_details.location_prop}</b></span>
                </div>
              )}

              <p className="text-sm font-serif text-white bg-black/40 p-3 rounded-lg border border-white/10 leading-relaxed">
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
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/30">
                FREE RE-READING (0 penalty)
              </span>
            </div>

            {loading ? (
              <div className="text-center py-6 text-xs font-mono text-gray-500">
                Loading hint archives...
              </div>
            ) : unlockedHints.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#78441d]/30 rounded-lg text-xs font-mono text-gray-500">
                No hints unlocked yet. Solve cleanly to claim full 100 points!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {unlockedHints.map((hint, idx) => (
                  <div
                    key={hint.id || idx}
                    className="p-3 rounded-lg bg-[#140b07] border border-[#78441d]/30 text-xs font-mono space-y-1 hover:border-[#ff9d54]/50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#ff9d54] font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {hint.target_id} • {hint.hint_category === 'fragment' ? 'Fragment Nudge' : 'Clue Guidance'}
                        </span>
                      </div>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-black text-gray-400 border border-white/10">
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
        <div className="px-5 py-2.5 bg-[#1a0e08] border-t border-[#78441d]/40 flex items-center justify-between text-xs font-mono">
          <span className="text-[10px] text-gray-400">
            Press <kbd className="px-1 py-0.5 bg-black/60 rounded border border-white/10 text-gray-300">H</kbd> or <kbd className="px-1 py-0.5 bg-black/60 rounded border border-white/10 text-gray-300">ESC</kbd> to close
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#3d2011] text-[#ffdfba] hover:bg-[#522b17] border border-[#78441d]/60 transition text-xs font-mono"
          >
            Return to Room (H)
          </button>
        </div>
      </div>
    </div>
  );
}

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
      const query = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
      const res = await fetch(`/api/game/hint/status${query}`, {
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
  const isControlRoom = roomId === 'control';

  const ui = isControlRoom
    ? {
        backdropStyle: {
          background:
            'radial-gradient(ellipse at 50% 25%, rgba(28, 22, 16, 0.72) 0%, rgba(6, 6, 6, 0.92) 78%)',
        },
        panelClass:
          'bg-gradient-to-b from-[#161312] to-[#0b0a09] border border-[#c4a265]/35 shadow-[0_28px_80px_rgba(0,0,0,0.96)]',
        headerClass: 'bg-[#120e0c] border-b border-[#c4a265]/25',
        iconWrapClass: 'p-1.5 rounded-lg bg-[#7a1c1c]/35 border border-[#d4b06a]/35',
        iconClass: 'w-5 h-5 text-[#e5c17d]',
        titleClass: 'text-base sm:text-lg font-bold text-[#faf1e2] tracking-[0.06em] flex items-center gap-2',
        titleStyle: { fontFamily: "'Cormorant Garamond', Georgia, serif" },
        subTitleClass: 'text-[11px] font-mono text-[#a69a84]',
        subTitleValueClass: 'text-[#e5c17d]',
        closeIconBtnClass: 'p-1.5 rounded-lg text-[#a69a84] hover:text-[#faf1e2] hover:bg-white/10 transition',
        meterBarClass: 'grid grid-cols-2 bg-[#100d0b] border-b border-[#c4a265]/20 px-5 py-2.5 text-xs font-mono',
        meterIconClass: 'w-4 h-4 text-[#d4b06a]',
        meterLabelClass: 'text-[#a69a84]',
        budgetPillClass: 'font-bold text-[#faf1e2] bg-[#1a1512] px-2.5 py-0.5 rounded-full border border-[#c4a265]/35',
        penaltyPillClass: 'font-bold text-[#fca5a5] bg-[#2a1212]/70 px-2.5 py-0.5 rounded-full border border-[#8c1f1f]/45',
        actionCardClass: 'p-4 rounded-xl bg-[#15110e] border border-[#c4a265]/25 shadow-inner space-y-3',
        actionTitleClass: 'text-xs uppercase font-mono font-bold tracking-wider text-[#e5c17d] block',
        actionDescClass: 'text-[11px] text-[#cbb694] font-sans',
        requestBtnClass:
          'shrink-0 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7a1c1c] via-[#5d1414] to-[#3f0e0e] hover:from-[#922323] hover:to-[#4f1111] text-[#faf1e2] border border-[#e3bd74]/45 font-mono font-bold text-xs px-5 py-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.55)] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
        rulesDividerClass:
          'grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-[#a69a84] border-t border-[#c4a265]/20 pt-2.5',
        ruleIconClass: 'w-3 h-3 text-[#d4b06a]',
        latestCardClass:
          'p-4 rounded-xl bg-[#19130f] border border-[#d4b06a]/65 shadow-[0_12px_32px_rgba(0,0,0,0.65)] animate-fade-in space-y-2',
        latestHeadClass: 'flex items-center justify-between border-b border-[#c4a265]/25 pb-2',
        latestTitleClass: 'flex items-center gap-1.5 font-bold text-[#faf1e2] font-mono text-xs uppercase tracking-wide',
        latestSparkleClass: 'w-4 h-4 text-[#e5c17d]',
        latestPenaltyClass: 'text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#2a1212] text-[#f3d8a4] border border-[#d4b06a]/35',
        latestLocClass: 'text-xs text-[#cbb694] font-mono flex items-center gap-1.5',
        latestPinClass: 'w-3.5 h-3.5 text-[#e5c17d] shrink-0',
        latestBodyClass: 'text-sm text-[#f3ead8] bg-[#0e0b09]/85 p-3 rounded-lg border border-[#c4a265]/20 leading-relaxed',
        archiveHeaderClass: 'flex items-center justify-between text-xs font-mono text-[#a69a84] border-b border-[#c4a265]/20 pb-1.5',
        archiveTitleClass: 'text-[#e5c17d] font-bold uppercase tracking-wider flex items-center gap-1.5',
        archiveIconClass: 'w-3.5 h-3.5 text-[#d4b06a]',
        freeBadgeClass: 'text-[10px] text-emerald-300 font-bold bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-500/35',
        emptyArchiveClass: 'text-center py-6 border border-dashed border-[#c4a265]/25 rounded-xl text-xs font-mono text-[#a69a84] bg-[#120e0b]/60',
        historyCardClass: 'p-3 rounded-xl bg-[#14100d] border border-[#c4a265]/25 text-xs font-mono space-y-1 hover:border-[#d4b06a]/55 transition',
        historyTitleClass: 'flex items-center gap-1.5 text-[#e5c17d] font-bold',
        historyRoomClass: 'text-[9px] uppercase px-2 py-0.5 rounded-full bg-[#1f1814] text-[#cbb694] border border-[#c4a265]/25',
        historyTextClass: 'text-[#e8dcc6] text-xs leading-normal pt-1 font-sans',
        footerClass: 'px-5 py-3 bg-[#120e0c] border-t border-[#c4a265]/25 flex items-center justify-between text-xs font-mono',
        footerHintClass: 'text-[10px] text-[#a69a84]',
        kbdClass: 'px-1.5 py-0.5 bg-[#1b1512] rounded border border-[#c4a265]/25 text-[#efe7d6]',
        footerBtnClass:
          'px-4 py-1.5 rounded-full bg-[#241b15] text-[#f3e6d0] hover:bg-[#7a1c1c] border border-[#c4a265]/35 transition text-xs font-mono cursor-pointer',
      }
    : {
        backdropStyle: undefined,
        panelClass: 'bg-[#0c0a12] border border-[#78441d]/60 shadow-[0_0_35px_rgba(255,122,26,0.15)]',
        headerClass: 'bg-[#1a0e08] border-b border-[#78441d]/50',
        iconWrapClass: 'p-1.5 rounded-lg bg-[#ff7a1a]/15 border border-[#ff7a1a]/30',
        iconClass: 'w-5 h-5 text-[#ff9d54]',
        titleClass: 'text-base sm:text-lg font-bold text-[#ffdfba] font-serif tracking-wide flex items-center gap-2',
        titleStyle: undefined,
        subTitleClass: 'text-[11px] font-mono text-[#c29b7f]',
        subTitleValueClass: 'text-[#ffdfba]',
        closeIconBtnClass: 'p-1.5 rounded-lg text-[#c29b7f] hover:text-white hover:bg-white/10 transition',
        meterBarClass: 'grid grid-cols-2 bg-[#120a06] border-b border-[#78441d]/30 px-5 py-2.5 text-xs font-mono',
        meterIconClass: 'w-4 h-4 text-[#ff9d54]',
        meterLabelClass: 'text-gray-400',
        budgetPillClass: 'font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-[#78441d]/40',
        penaltyPillClass: 'font-bold text-red-300 bg-red-950/40 px-2 py-0.5 rounded border border-red-500/30',
        actionCardClass: 'p-4 rounded-xl bg-[#1f120a]/80 border border-[#8a4b22]/40 shadow-inner space-y-3',
        actionTitleClass: 'text-xs uppercase font-mono font-bold tracking-wider text-[#ff9d54] block',
        actionDescClass: 'text-[11px] text-[#dec3ab] font-sans',
        requestBtnClass:
          'shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-[#b45309] to-[#d97706] hover:from-[#d97706] hover:to-[#f59e0b] text-white font-mono font-bold text-xs px-4 py-2.5 rounded-lg shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed',
        rulesDividerClass:
          'grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-[#c29b7f] border-t border-[#78441d]/20 pt-2.5',
        ruleIconClass: 'w-3 h-3 text-[#ff9d54]',
        latestCardClass: 'p-4 rounded-xl bg-[#2e1507] border-2 border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-fade-in space-y-2',
        latestHeadClass: 'flex items-center justify-between border-b border-[#f59e0b]/30 pb-2',
        latestTitleClass: 'flex items-center gap-1.5 font-bold text-[#fef3c7] font-mono text-xs uppercase tracking-wide',
        latestSparkleClass: 'w-4 h-4 text-[#fbbf24]',
        latestPenaltyClass: 'text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-[#fde68a] border border-[#f59e0b]/40',
        latestLocClass: 'text-xs text-[#fed7aa] font-mono flex items-center gap-1.5',
        latestPinClass: 'w-3.5 h-3.5 text-[#fbbf24] shrink-0',
        latestBodyClass: 'text-sm font-serif text-white bg-black/40 p-3 rounded-lg border border-white/10 leading-relaxed',
        archiveHeaderClass: 'flex items-center justify-between text-xs font-mono text-gray-400 border-b border-white/10 pb-1.5',
        archiveTitleClass: 'text-[#ffdfba] font-bold uppercase tracking-wider flex items-center gap-1.5',
        archiveIconClass: 'w-3.5 h-3.5 text-[#ff9d54]',
        freeBadgeClass: 'text-[10px] text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/30',
        emptyArchiveClass: 'text-center py-6 border border-dashed border-[#78441d]/30 rounded-lg text-xs font-mono text-gray-500',
        historyCardClass: 'p-3 rounded-lg bg-[#140b07] border border-[#78441d]/30 text-xs font-mono space-y-1 hover:border-[#ff9d54]/50 transition',
        historyTitleClass: 'flex items-center gap-1.5 text-[#ff9d54] font-bold',
        historyRoomClass: 'text-[9px] uppercase px-1.5 py-0.5 rounded bg-black text-gray-400 border border-white/10',
        historyTextClass: 'text-gray-300 font-serif text-xs leading-normal pt-1',
        footerClass: 'px-5 py-2.5 bg-[#1a0e08] border-t border-[#78441d]/40 flex items-center justify-between text-xs font-mono',
        footerHintClass: 'text-[10px] text-gray-400',
        kbdClass: 'px-1 py-0.5 bg-black/60 rounded border border-white/10 text-gray-300',
        footerBtnClass: 'px-4 py-1.5 rounded bg-[#3d2011] text-[#ffdfba] hover:bg-[#522b17] border border-[#78441d]/60 transition text-xs font-mono',
      };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none"
      style={ui.backdropStyle}
      onClick={onClose}
    >
      <div
        data-hint-theme={isControlRoom ? 'control' : 'default'}
        className={`relative w-full max-w-2xl rounded-xl overflow-hidden flex flex-col max-h-[90vh] ${ui.panelClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 ${ui.headerClass}`}>
          <div className="flex items-center gap-2.5">
            <div className={ui.iconWrapClass}>
              <Lightbulb className={ui.iconClass} />
            </div>
            <div>
              <h2 className={ui.titleClass} style={ui.titleStyle}>
                HINTS & INVESTIGATION GUIDANCE
              </h2>
              <p className={ui.subTitleClass}>
                Active Chamber: <b className={ui.subTitleValueClass}>{roomTitle}</b>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={ui.closeIconBtnClass}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tournament Meter Bar */}
        <div className={ui.meterBarClass}>
          <div className="flex items-center gap-2">
            <HelpCircle className={ui.meterIconClass} />
            <span className={ui.meterLabelClass}>Budget:</span>
            <span className={ui.budgetPillClass}>
              {remaining} / 15 REMAINING
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Clock className="w-4 h-4 text-red-400" />
            <span className={ui.meterLabelClass}>Time Penalty:</span>
            <span className={ui.penaltyPillClass}>
              +{totalPenalty}s
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Request Action Card */}
          <div className={ui.actionCardClass}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className={ui.actionTitleClass}>
                  Need Immediate Guidance?
                </span>
                <p className={ui.actionDescClass}>
                  The house watches your desperation. Hints follow strict sequential chamber logic:
                </p>
              </div>

              <button
                disabled={requesting || remaining <= 0}
                onClick={handleRequestHint}
                className={ui.requestBtnClass}
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

            <div className={ui.rulesDividerClass}>
              <div className="flex items-center gap-1.5">
                <Layers className={ui.ruleIconClass} />
                <span>Fragment Search: <b>+10s time penalty</b> (0 pts)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className={ui.ruleIconClass} />
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
            <div className={ui.latestCardClass}>
              <div className={ui.latestHeadClass}>
                <span className={ui.latestTitleClass}>
                  <Sparkles className={ui.latestSparkleClass} />
                  Newly Unlocked: {latestHint.target_title || latestHint.target_id}
                </span>
                <span className={ui.latestPenaltyClass}>
                  +{latestHint.penalty_applied ?? latestHint.penalty_seconds ?? 0}s PENALTY
                </span>
              </div>

              {latestHint.hint_details?.location_prop && (
                <div className={ui.latestLocClass}>
                  <MapPin className={ui.latestPinClass} />
                  <span>Room Location: <b>{latestHint.hint_details.location_prop}</b></span>
                </div>
              )}

              <p className={ui.latestBodyClass}>
                {latestHint.hint_details?.guidance || latestHint.hint_text}
              </p>
            </div>
          )}

          {/* Unlocked Hints History */}
          <div className="space-y-2.5">
            <div className={ui.archiveHeaderClass}>
              <span className={ui.archiveTitleClass}>
                <FileText className={ui.archiveIconClass} />
                UNLOCKED DOSSIER ARCHIVE ({unlockedHints.length})
              </span>
              <span className={ui.freeBadgeClass}>
                FREE RE-READING (0 penalty)
              </span>
            </div>

            {loading ? (
              <div className="text-center py-6 text-xs font-mono text-gray-500">
                Loading hint archives...
              </div>
            ) : unlockedHints.length === 0 ? (
              <div className={ui.emptyArchiveClass}>
                No hints unlocked yet. Solve cleanly to claim full 100 points!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {unlockedHints.map((hint, idx) => (
                  <div
                    key={hint.id || idx}
                    className={ui.historyCardClass}
                  >
                    <div className="flex items-center justify-between">
                      <div className={ui.historyTitleClass}>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {hint.target_id} • {hint.hint_category === 'fragment' ? 'Fragment Nudge' : 'Clue Guidance'}
                        </span>
                      </div>
                      <span className={ui.historyRoomClass}>
                        {hint.room_id}
                      </span>
                    </div>

                    <p className={ui.historyTextClass}>
                      {hint.hint_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={ui.footerClass}>
          <span className={ui.footerHintClass}>
            Press <kbd className={ui.kbdClass}>H</kbd> or <kbd className={ui.kbdClass}>ESC</kbd> to close
          </span>
          <button
            onClick={onClose}
            className={ui.footerBtnClass}
          >
            Return to Room (H)
          </button>
        </div>
      </div>
    </div>
  );
}

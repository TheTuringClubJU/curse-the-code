import React, { useState } from 'react';

export default function EpochTimelineModal({
  isOpen,
  onClose,
  clue,
  onSubmitAnswer,
  isSubmitting,
  audio
}) {
  if (!isOpen || !clue) return null;

  const payload = clue.payload || {};
  const initialCards = payload.cards || [];

  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [keywordInput, setKeywordInput] = useState('');
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [showEpochHelper, setShowEpochHelper] = useState(false);

  const attemptsLeft = Math.max(0, (clue.attempts_max || 3) - (clue.attempts || 0));
  const isSolved = Boolean(clue.solved);

  // Toggle card dismissed (planted anomaly)
  const toggleDismiss = (id) => {
    audio?.click?.();
    setDismissedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatEpoch = (epoch) => {
    try {
      const d = new Date(epoch * 1000);
      return d.toUTCString().replace(' 00:00:00 GMT', '');
    } catch {
      return String(epoch);
    }
  };

  // Sort remaining cards chronologically
  const activeCards = initialCards
    .filter((c) => !dismissedIds.has(c.id))
    .sort((a, b) => a.epoch - b.epoch);

  const spelledWord = activeCards.map((c) => c.text?.[0] || '').join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isSolved || attemptsLeft <= 0) return;

    const res = await onSubmitAnswer(clue.id, {
      word: keywordInput.trim().toUpperCase()
    });

    if (res?.correct) {
      setSubmitFeedback({ ok: true, msg: 'CHRONOLOGY VALIDATED: Keyword accepted for Bulkhead Keypad.' });
    } else {
      setSubmitFeedback({ ok: false, msg: res?.message || 'INCORRECT: Anomaly sequence does not spell the valid keyword.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none font-mono">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#16171a] border border-[#788896]/50 shadow-[0_0_50px_rgba(120,136,150,0.2)] rounded-lg overflow-hidden text-[#e4ebf0]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#1e2226] border-b border-[#363e46]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#788896] animate-pulse" />
            <h2 className="text-xs font-bold tracking-widest text-[#d0dbe4] uppercase">
              CASE FILE CF-2F05 // CHRONOLOGICAL EVENT TIMELINE BOARD
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#8898a6]">
              ATTEMPTS: <span className={attemptsLeft === 1 ? 'text-red-400 font-bold' : 'text-[#d0dbe4]'}>{attemptsLeft}/{clue.attempts_max || 3}</span>
            </span>
            <button
              onClick={onClose}
              className="text-[#8898a6] hover:text-[#ffffff] border border-[#46525c] hover:border-[#8898a6] px-2 py-0.5 rounded transition"
            >
              [ESC] EXIT
            </button>
          </div>
        </div>

        {/* Instructions & Tools Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#141618] border-b border-[#282e34] text-xs">
          <div className="text-[#8ca0b0]">
            FILTER OUT ANOMALOUS EVENTS OCCURRING <span className="text-[#ffd78a] font-bold">AFTER THE GENUINE SHUTDOWN DATE</span> IDENTIFIED IN FACILITY REPORTS.
          </div>
          <button
            onClick={() => setShowEpochHelper(!showEpochHelper)}
            className="text-[11px] px-2.5 py-1 bg-[#22272c] hover:bg-[#2d343b] text-[#8ca0b0] hover:text-white border border-[#404b54] rounded transition"
          >
            {showEpochHelper ? 'HIDE EPOCH TRANSLATIONS' : 'SHOW UTC DATES'}
          </button>
        </div>

        {/* Corkboard Workspace */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0f1113] relative">
          {/* Subtle cork grid texture */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {initialCards.map((card) => {
              const isDismissed = dismissedIds.has(card.id);
              const dateStr = formatEpoch(card.epoch);
              const isAfterShutdown = card.epoch > 981763200; // After Feb 10, 2001

              return (
                <div
                  key={card.id}
                  onClick={() => toggleDismiss(card.id)}
                  className={`relative p-4 rounded border transition-all cursor-pointer flex flex-col justify-between min-h-[140px] ${
                    isDismissed
                      ? 'bg-[#121416]/50 border-red-950/60 opacity-35 scale-95 line-through'
                      : 'bg-[#20252b] border-[#424c56] hover:border-[#8fa4b8] shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  {/* Push Pin */}
                  <div
                    className={`absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border border-black/40 shadow ${
                      isDismissed ? 'bg-zinc-600' : 'bg-red-600'
                    }`}
                  />

                  {/* Card ID */}
                  <div className="flex justify-between items-center text-[10px] text-[#768896] pb-1 border-b border-[#303840]">
                    <span>CARD {card.id}</span>
                    <span>{isDismissed ? '[DISMISSED]' : '[PINNED]'}</span>
                  </div>

                  {/* Event Text */}
                  <div className="py-2 text-xs font-sans font-medium text-[#f0f4f8] leading-snug">
                    <span className="font-mono font-bold text-[#eec77d] text-sm mr-1">
                      {card.text?.[0]}
                    </span>
                    {card.text?.slice(1)}
                  </div>

                  {/* Epoch Timestamp */}
                  <div className="pt-1 border-t border-[#303840] text-[10px] font-mono text-[#8ca0b0]">
                    <div>EPOCH: <code className="text-[#d0dbe4]">{card.epoch}</code></div>
                    {showEpochHelper && (
                      <div className="mt-0.5 font-mono text-gray-300">
                        {dateStr}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pinned Events Summary */}
          <div className="mt-6 p-3 bg-[#181d22] border border-[#36424e] rounded-lg flex items-center justify-between">
            <span className="text-xs text-[#8ca0b0]">ACTIVE TIMELINE SELECTION:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#eec77d]">
                {activeCards.length} / {initialCards.length} Events Pinned (Chronological Sequence)
              </span>
            </div>
          </div>
        </div>

        {/* Clue Answer Form */}
        <div className="p-4 bg-[#14181c] border-t border-[#36424e]">
          {isSolved ? (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded text-center text-xs font-bold text-emerald-300">
              ✓ TIMELINE CHRONOLOGY AUTHENTICATED
            </div>
          ) : attemptsLeft <= 0 ? (
            <div className="p-3 bg-red-950/80 border border-red-500 rounded text-center text-xs font-bold text-red-300">
              TERMINAL LOCKED: ATTEMPTS EXHAUSTED (3/3). PROCEED TO BULKHEAD.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-[10px] text-[#8ca0b0] uppercase mb-1">
                  Enter Sequence Keyword (First letters in chronological order):
                </label>
                <input
                  type="text"
                  placeholder="PLANET"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-[#424c56] focus:border-[#788896] px-3 py-1.5 text-xs text-[#f0f4f8] rounded uppercase tracking-widest outline-none font-bold"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !keywordInput}
                className="mt-4 px-6 py-2 bg-[#788896] hover:bg-[#8fa4b8] text-black font-bold text-xs rounded transition disabled:opacity-40"
              >
                {isSubmitting ? 'VALIDATING...' : 'SUBMIT KEYWORD'}
              </button>
            </form>
          )}

          {submitFeedback && (
            <div className={`mt-2 text-xs font-bold ${submitFeedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {submitFeedback.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

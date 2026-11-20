import React, { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Check,
  FileText,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  ZoomIn,
  GitCompare,
  Columns2,
  Sparkles,
} from 'lucide-react';

function extractStepDigit(line, fallbackIdx) {
  const m = String(line || '').match(/^\s*(?:step\s*)?(\d+)\s*[.):\-]/i);
  if (m) return m[1];
  const lead = String(line || '').match(/^\s*(\d+)/);
  if (lead) return lead[1];
  return String(fallbackIdx + 1);
}

export default function ManualDiffModal({
  isOpen,
  onClose,
  clue,
  onSubmit,
  isSubmitting = false,
}) {
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState(false);
  const [pinnedRows, setPinnedRows] = useState({});
  const [selectedDigits, setSelectedDigits] = useState([]);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'redline'
  const [largeType, setLargeType] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [localAttempts, setLocalAttempts] = useState(null);

  useEffect(() => {
    setLocalAttempts(clue?.attempts ?? 0);
  }, [clue?.attempts, isOpen]);

  const payload = clue?.payload || {};
  const plainLines = useMemo(
    () =>
      Array.isArray(payload.manual_plain)
        ? payload.manual_plain
        : String(payload.manual_plain || '')
            .split('\n')
            .filter(Boolean),
    [payload.manual_plain]
  );

  const revisedLines = useMemo(
    () =>
      Array.isArray(payload.manual_encrypted)
        ? payload.manual_encrypted
        : String(payload.manual_encrypted || '')
            .split('\n')
            .filter(Boolean),
    [payload.manual_encrypted]
  );

  if (!isOpen || !clue) return null;

  const revisedCopyText = Array.isArray(payload.manual_encrypted)
    ? payload.manual_encrypted.join('\n')
    : String(payload.manual_encrypted || '');

  const stage = clue.stages?.[0] || {};
  const field = stage.fields?.[0] || {
    key: 'steps',
    label: 'Tampered steps',
    placeholder: 'e.g. 26',
  };

  const attemptsMade = localAttempts ?? clue?.attempts ?? 0;
  const attemptsMax = clue?.attempts_max ?? 3;
  const attemptsLeft = Math.max(0, attemptsMax - attemptsMade);
  const isExhausted = !clue.solved && attemptsLeft <= 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText?.(revisedCopyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {}
  };

  const toggleRowPin = (idx, digit) => {
    setPinnedRows((prev) => ({ ...prev, [idx]: !prev[idx] }));
    setSelectedDigits((prev) => {
      if (prev.includes(digit)) return prev.filter((d) => d !== digit);
      return [...prev, digit].sort((a, b) => Number(a) - Number(b));
    });
  };

  const applyCandidateDigits = () => {
    if (selectedDigits.length === 0) return;
    setAnswer(selectedDigits.join(''));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim() || isSubmitting || clue.solved || isExhausted) return;
    const res = await onSubmit(clue.id, answer.trim());
    if (res) {
      setFeedback(res);
      if (typeof res.attempts === 'number') {
        setLocalAttempts(res.attempts);
      } else if (res.correct === false) {
        setLocalAttempts((prev) => (prev ?? clue?.attempts ?? 0) + 1);
      }
    }
  };

  const maxRows = Math.max(plainLines.length, revisedLines.length);
  const textSizeCls = largeType ? 'text-sm' : 'text-xs';

  return (
    <div className="vault-desk-surface select-none" onClick={onClose}>
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Archival Workstation Title Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 shrink-0">
          <div className="relative bg-[#090b10] border border-[#d4b896]/25 border-l-2 border-l-[#b91c1c] px-5 py-2.5 rounded-[2px] shadow-2xl">
            <div className="vault-masking-tape absolute -top-2 left-5 w-14 h-3.5 -rotate-2" />
            <div className="vault-masking-tape absolute -top-2 right-6 w-12 h-3.5 rotate-2" />
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-red-400" />
              <h2 className="font-re-display text-sm sm:text-base font-bold tracking-[0.14em] text-[#f5f3ee] uppercase">
                {clue.title || 'Manual Diff Workstation'} ({clue.id})
              </h2>
            </div>
            <p className="font-re-typewriter text-[11px] text-slate-300 mt-0.5">{clue.scene_text}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Forensic View Switcher */}
            <div className="flex rounded-[2px] p-0.5 bg-[#090b10] border border-slate-700/70">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] font-re-typewriter text-[10px] tracking-wider uppercase transition cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-red-900/55 text-red-100 border border-red-500/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Columns2 className="w-3 h-3" />
                <span>Split Originals</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('redline')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] font-re-typewriter text-[10px] tracking-wider uppercase transition cursor-pointer ${
                  viewMode === 'redline'
                    ? 'bg-red-900/55 text-red-100 border border-red-500/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitCompare className="w-3 h-3" />
                <span>Redline Overlay</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLargeType((v) => !v)}
              title="Toggle Large Magnified Type"
              className="re-plate !py-1.5 !px-3.5 text-[11px]"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{largeType ? '1.2x' : '1.0x'}</span>
            </button>

            <span className="re-plate !py-1.5 !px-3.5 cursor-default">
              <span className="text-[10px] tracking-widest uppercase text-[#b8a586]">Attempts:</span>
              <span className={`font-mono font-bold ${attemptsLeft <= 1 ? 'text-red-400' : 'text-[#ffd68a]'}`}>
                {attemptsLeft}/{attemptsMax}
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Manual Terminal"
              className="re-plate !py-1.5 !px-4"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close [ESC]</span>
            </button>
          </div>
        </div>

        {/* Interactive Candidate Chip Tray (shown when steps are pinned) */}
        {selectedDigits.length > 0 && !clue.solved && (
          <div className="mx-1 px-4 py-2 rounded-[2px] bg-[#0c0f16] border border-slate-600/40 text-xs font-re-typewriter text-slate-200 flex items-center justify-between gap-2.5 shrink-0">
            <span className="text-[11px] text-slate-300">
              Selected Steps: <strong className="text-red-200">{selectedDigits.join('')}</strong>
            </span>
            <button
              type="button"
              onClick={applyCandidateDigits}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-[2px] bg-red-950/80 hover:bg-red-900/80 border border-red-500/50 text-[10px] text-red-100 uppercase tracking-wider cursor-pointer transition"
            >
              <Sparkles className="w-3 h-3" />
              <span>Use Selected</span>
            </button>
          </div>
        )}

        {/* Desk Document Spread */}
        <div className="flex-1 overflow-y-auto px-1 py-1">
          {viewMode === 'redline' ? (
            <div className="vault-archival-sheet rounded-[2px] p-5 sm:p-6 border border-[#9e8962]/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#463626]/35 pb-2.5 pl-6">
                <div>
                  <span className="font-re-typewriter text-[9px] tracking-[0.2em] uppercase text-[#7a4b26] block">
                    FORENSIC DIFF LEDGER // LINE-BY-LINE DELTA
                  </span>
                  <h3 className="font-re-typewriter text-xs sm:text-sm font-bold tracking-wider text-[#1e150e]">
                    REDLINE AUDIT — v1.1 ARCHIVE vs v2.0 CORVIN REVISION
                  </h3>
                </div>
                {payload.copyable !== false && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[2px] font-re-typewriter text-[11px] font-bold bg-[#2b1a0f] hover:bg-[#492214] text-[#f3dcb3] border border-[#8c6230] shadow transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'COPIED' : 'COPY TEXT'}</span>
                  </button>
                )}
              </div>

              <div className={`space-y-2.5 font-re-typewriter ${textSizeCls} pl-6`}>
                {Array.from({ length: maxRows }).map((_, idx) => {
                  const left = plainLines[idx] || '';
                  const right = revisedLines[idx] || '';
                  const digit = extractStepDigit(right || left, idx);
                  const isPinned = Boolean(pinnedRows[idx]);
                  return (
                    <button
                      type="button"
                      key={`redline-${idx}`}
                      onClick={() => toggleRowPin(idx, digit)}
                      className={`w-full text-left p-3 rounded-[2px] border transition cursor-pointer ${
                        isPinned
                          ? 'bg-[#d97706]/18 border-[#92400e]/60 ring-1 ring-[#92400e]/30'
                          : 'bg-white/40 border-[#8e7a56]/35 hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#523d28]">
                          CLAUSE #{digit}
                        </span>
                        {isPinned && (
                          <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-[2px] border border-[#92400e]/60 bg-[#d97706]/20 text-[#78350f] uppercase tracking-wider">
                            PINNED #{digit}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-[#4a3929] text-xs">v1.1 ARCHIVE: {left || '—'}</div>
                        <div className="text-[#26150a] font-bold text-xs">v2.0 REVISED: {right || '—'}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* Left Sheet: Original Archival Manual v1.1 */}
              <div className="vault-archival-sheet rounded-[2px] p-5 sm:p-6 border border-[#9e8962]/60 flex flex-col">
                <div className="vault-masking-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 rotate-1" />
                <div className="flex items-center justify-between border-b-2 border-[#463626]/35 pb-2.5 mb-4 pl-6">
                  <div>
                    <span className="font-re-typewriter text-[9px] tracking-[0.2em] uppercase text-[#7a4b26] block">
                      SUBSTATION DELTA // ARCHIVE COPY
                    </span>
                    <h3 className="font-re-typewriter text-xs sm:text-sm font-bold tracking-wider text-[#1e150e]">
                      ORIGINAL — SHUTDOWN PROCEDURE MANUAL v1.1
                    </h3>
                  </div>
                  <span className="font-re-typewriter text-[10px] font-bold px-2.5 py-0.5 rounded-[2px] border-2 border-[#3f593b] text-[#284725] -rotate-3 uppercase">
                    VERIFIED 1979
                  </span>
                </div>

                <div className={`space-y-2 font-re-typewriter ${textSizeCls} pl-6 flex-1`}>
                  {Array.from({ length: maxRows }).map((_, idx) => {
                    const digit = extractStepDigit(plainLines[idx] || revisedLines[idx], idx);
                    return (
                      <button
                        type="button"
                        key={`plain-${idx}`}
                        onClick={() => toggleRowPin(idx, digit)}
                        className={`w-full text-left py-1.5 px-3 rounded-[2px] border leading-relaxed cursor-pointer transition ${
                          pinnedRows[idx]
                            ? 'bg-[#d97706]/20 border-[#92400e]/60 text-[#1e1208] ring-1 ring-[#92400e]/40'
                            : 'bg-white/35 border-[#8e7a56]/35 text-[#221912] hover:bg-white/50'
                        }`}
                      >
                        {plainLines[idx] || '—'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Sheet: Revised / Corrupted Manual v2.0 */}
              <div className="vault-corvin-sheet rounded-[2px] p-5 sm:p-6 border border-[#8c6430]/70 flex flex-col">
                <div className="vault-masking-tape absolute -top-2.5 left-12 w-20 h-4 -rotate-2" />
                <div className="vault-masking-tape absolute -top-2.5 right-12 w-20 h-4 rotate-2" />
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#7c3518]/35 pb-2.5 mb-4">
                  <div>
                    <span className="font-re-typewriter text-[9px] tracking-[0.2em] uppercase text-[#882b1e] block">
                      REVISED REVISION // UNAUTHORIZED AMENDMENT
                    </span>
                    <h3 className="font-re-typewriter text-xs sm:text-sm font-bold tracking-wider text-[#26150a]">
                      REVISED — SHUTDOWN PROCEDURE MANUAL v2.0 (CORVIN)
                    </h3>
                  </div>

                  {payload.copyable !== false && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[2px] font-re-typewriter text-[11px] font-bold bg-[#2b1a0f] hover:bg-[#492214] text-[#f3dcb3] border border-[#8c6230] shadow transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'COPIED' : 'COPY TEXT'}</span>
                    </button>
                  )}
                </div>

                <div className={`space-y-2 font-re-typewriter ${textSizeCls} flex-1`}>
                  {Array.from({ length: maxRows }).map((_, idx) => {
                    const right = revisedLines[idx] || '';
                    const digit = extractStepDigit(right || plainLines[idx], idx);
                    const isPinned = Boolean(pinnedRows[idx]);
                    return (
                      <button
                        type="button"
                        key={`rev-${idx}`}
                        onClick={() => toggleRowPin(idx, digit)}
                        className={`w-full text-left py-1.5 px-3 rounded-[2px] border leading-relaxed flex items-start justify-between gap-2 cursor-pointer transition ${
                          isPinned
                            ? 'bg-[#d97706]/20 border-[#92400e]/70 text-[#1e1208] ring-1 ring-[#92400e]/40 font-bold'
                            : 'bg-black/5 border-[#8e744c]/35 text-[#2d2115] hover:bg-black/10'
                        }`}
                      >
                        <span>{right || '—'}</span>
                        {isPinned && (
                          <span className="shrink-0 text-[9px] px-2 py-0.5 rounded-[2px] border border-[#92400e]/60 bg-[#d97706]/20 text-[#78350f] tracking-wider uppercase font-bold">
                            PINNED #{digit}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`mt-4 p-3.5 rounded-[2px] border font-re-typewriter text-xs flex items-center gap-2.5 shadow-xl ${
                feedback.correct
                  ? 'bg-[#0e1f15] border-emerald-600/70 text-emerald-200'
                  : 'bg-[#210b0d] border-red-700/70 text-red-200'
              }`}
            >
              {feedback.correct ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <div className="font-bold tracking-wide">{feedback.message}</div>
            </div>
          )}

          {clue.solved && !feedback && (
            <div className="mt-4 p-3.5 rounded-[2px] border bg-[#0e1f15] border-emerald-600/60 text-emerald-200 font-re-typewriter text-xs flex items-center gap-2 shadow-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Terminal {clue.id} verified.</span>
            </div>
          )}

          {isExhausted && !clue.solved && (
            <div className="mt-4 p-3.5 rounded-[2px] border bg-red-950/80 border-red-500/80 text-red-200 font-mono text-xs tracking-wider">
              SECURITY LOCKOUT: MAXIMUM ATTEMPTS EXCEEDED (0/{attemptsMax}).
            </div>
          )}
        </div>

        {/* Riveted Cast-Iron Input Bar */}
        <form
          onSubmit={handleFormSubmit}
          className="p-4 rounded-[2px] bg-[#16110e] border border-[#6e502c]/70 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-end gap-3 shrink-0"
        >
          <div className="flex-1">
            <label className="block font-re-typewriter text-[11px] uppercase tracking-[0.12em] text-[#e4c48a] mb-1.5">
              {stage.prompt || 'Which step numbers were tampered with?'}
            </label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={clue.solved || isExhausted || isSubmitting}
              placeholder={field.placeholder || 'Enter tampered step digits (e.g. 26)'}
              aria-label={field.label || 'Tampered steps'}
              className="w-full px-4 py-2.5 rounded-[2px] bg-[#090706] border border-[#5c4529] focus:border-[#d8b26e] outline-none font-re-typewriter text-sm tracking-[0.14em] text-[#f5e7cf] placeholder:text-[#665947]"
            />
          </div>

          <button
            type="submit"
            disabled={clue.solved || isExhausted || isSubmitting || !answer.trim()}
            className="re-plate !px-5 !py-2.5 !justify-center disabled:opacity-40 cursor-pointer"
          >
            <span className="re-keycap">↵</span>
            <span className="tracking-widest uppercase">
              {clue.solved ? 'VERIFIED' : isExhausted ? 'LOCKED OUT' : isSubmitting ? 'VERIFYING...' : 'SUBMIT DIFF'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

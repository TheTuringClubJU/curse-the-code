import React from 'react';
import { X, CheckCircle, Lock, AlertCircle, ShieldAlert, Key } from 'lucide-react';

export default function CaseFilesModal({
  isOpen,
  onClose,
  clues = [],
  onOpenClue = null
}) {
  if (!isOpen) return null;

  // Filter Room 1 clues and sort in deterministic order (R1-01, R1-02, R1-03, R1-04, etc.)
  const roomClues = clues
    .filter(c => c.id && c.id.startsWith('R1-'))
    .sort((a, b) => (a.id > b.id ? 1 : -1));

  const finaleClue = roomClues.find(c => c.id === 'R1-FIN');
  const standardClues = roomClues.filter(c => c.id !== 'R1-FIN');

  const solvedCount = roomClues.filter(c => c.solved).length;
  const totalCount = roomClues.length || 4;
  const standardSolved = standardClues.filter(c => c.solved).length;

  const renderClueRow = (clue, displayLabel, isFinale = false) => {
    const isSolved = Boolean(clue.solved);
    const attempts = clue.attempts || 0;
    const maxAttempts = clue.attempts_max || (isFinale ? '∞' : 3);
    const isExhausted = !isSolved && typeof maxAttempts === 'number' && attempts >= maxAttempts;
    const isLocked = Boolean(clue.is_locked);

    return (
      <div
        key={clue.id}
        onClick={() => {
          if (onOpenClue) onOpenClue(clue);
        }}
        className={`flex items-center justify-between px-4 py-3 rounded-xl border transition ${
          onOpenClue ? 'cursor-pointer hover:border-[#8f7bff]' : ''
        } ${
          isFinale
            ? isSolved
              ? 'bg-[#14261b]/80 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : isLocked
              ? 'bg-[#1c0f18]/60 border-amber-900/40 opacity-80'
              : 'bg-[#210c14]/80 border-amber-500/50 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
            : isSolved
            ? 'bg-[#14261b]/60 border-[#22543d]'
            : isExhausted
            ? 'bg-[#291418]/60 border-[#7f1d1d]'
            : isLocked
            ? 'bg-[#1c1221]/50 border-[#382645] opacity-75'
            : 'bg-[#151024] border-[#34244d]'
        }`}
      >
        {/* Clue Name & State */}
        <div className="flex items-center gap-3">
          {isSolved ? (
            <CheckCircle className="w-4 h-4 text-[#86efac] shrink-0" />
          ) : isExhausted ? (
            <AlertCircle className="w-4 h-4 text-[#fca5a5] shrink-0" />
          ) : isFinale ? (
            <ShieldAlert className={`w-4 h-4 shrink-0 ${isLocked ? 'text-amber-500/60' : 'text-amber-400'}`} />
          ) : (
            <Lock className={`w-4 h-4 shrink-0 ${isLocked ? 'text-red-400/60' : 'text-[#a78bfa]'}`} />
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${isFinale ? 'text-amber-200' : 'text-[#e8e0ff]'}`}>
                {displayLabel}
              </span>
              {isFinale && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-950/70 text-amber-300 border border-amber-500/40 uppercase">
                  Finale
                </span>
              )}
            </div>
            {clue.title && (
              <span className="text-xs text-[#a292cc] font-mono block">
                {clue.title}
              </span>
            )}
          </div>
        </div>

        {/* Attempts Count & Status */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Attempts:{' '}
            <span
              className={`font-bold ${
                isSolved
                  ? 'text-[#86efac]'
                  : attempts > 0
                  ? 'text-[#fdba74]'
                  : 'text-gray-300'
              }`}
            >
              {attempts} / {maxAttempts}
            </span>
          </span>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
              isSolved
                ? 'bg-[#18261e] text-[#86efac] border border-[#22543d]'
                : isExhausted
                ? 'bg-[#291418] text-[#fca5a5] border border-[#7f1d1d]'
                : isLocked
                ? 'bg-[#291724] text-red-300 border border-red-900/50'
                : isFinale
                ? 'bg-[#3b1c10] text-amber-300 border border-amber-500/50'
                : 'bg-[#211a3b] text-purple-200 border border-purple-500/30'
            }`}
          >
            {isSolved ? 'Solved' : isExhausted ? 'Exhausted' : isLocked ? 'Locked' : isFinale ? 'Ready' : 'Open'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-[#0d0914] border border-[#3b2a59] rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#140e24] border-b border-[#3b2a59]">
          <div>
            <h2 className="text-sm font-bold text-[#e8e0ff] tracking-wider uppercase">
              Clues Status
            </h2>
            <p className="text-xs text-[#a292cc] mt-0.5">
              {finaleClue ? (
                <>
                  Chamber Clues: <span className="text-[#86efac] font-bold">{standardSolved}</span> / {standardClues.length}
                  {' • '}Finale: <span className={finaleClue.solved ? "text-[#86efac] font-bold" : "text-amber-400 font-bold"}>{finaleClue.solved ? '1/1' : '0/1'}</span>
                </>
              ) : (
                <>Solved: <span className="text-[#86efac] font-bold">{solvedCount}</span> / {totalCount}</>
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clue List Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Section 1: Standard Chamber Clues */}
          <div className="space-y-2">
            {finaleClue && (
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-[#2d1f45]">
                <span>Chamber Investigation Clues ({standardSolved} / {standardClues.length})</span>
                <span className="text-[10px] text-gray-500 font-normal">Sequential Clues</span>
              </div>
            )}
            <div className="space-y-2.5">
              {standardClues.map((clue, index) => renderClueRow(clue, `Clue ${index + 1}`, false))}
            </div>
          </div>

          {/* Section 2: Master Finale (if present) */}
          {finaleClue && (
            <div className="space-y-2 pt-1 border-t border-amber-900/30">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-amber-900/40">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Subterranean Master Finale (1 Final)</span>
                </span>
                <span className="text-[10px] text-amber-500/80 font-normal">3-Stage Protocol</span>
              </div>
              <div>
                {renderClueRow(finaleClue, `Clue 3: Master Terminal`, true)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#140e24] border-t border-[#3b2a59] flex items-center justify-between text-xs text-gray-400">
          <span className="text-[11px] text-gray-500">Shortcut: C</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-[#2b1f47] text-[#e8e0ff] hover:bg-[#3b2a59] transition text-xs font-bold"
          >
            Close (C)
          </button>
        </div>

      </div>
    </div>
  );
}

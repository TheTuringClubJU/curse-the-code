import React from 'react';
import { X, CheckCircle, Lock, AlertCircle } from 'lucide-react';

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

  const solvedCount = roomClues.filter(c => c.solved).length;
  const totalCount = roomClues.length || 4;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-[#0d0914] border border-[#3b2a59] rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#140e24] border-b border-[#3b2a59]">
          <div>
            <h2 className="text-sm font-bold text-[#e8e0ff] tracking-wider uppercase">
              Clues Status
            </h2>
            <p className="text-xs text-[#a292cc] mt-0.5">
              Solved: <span className="text-[#86efac] font-bold">{solvedCount}</span> / {totalCount}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Minimal Clue List */}
        <div className="p-4 space-y-2.5">
          {roomClues.map((clue, index) => {
            const clueNumber = index + 1;
            const isSolved = Boolean(clue.solved);
            const attempts = clue.attempts || 0;
            const maxAttempts = clue.attempts_max || 3;
            const isExhausted = !isSolved && attempts >= maxAttempts;
            const isLocked = Boolean(clue.is_locked);

            return (
              <div
                key={clue.id || index}
                onClick={() => {
                  if (onOpenClue) onOpenClue(clue);
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                  onOpenClue ? 'cursor-pointer hover:border-[#6b4fa0]' : ''
                } ${
                  isSolved
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
                  ) : (
                    <Lock className={`w-4 h-4 shrink-0 ${isLocked ? 'text-red-400/60' : 'text-[#a78bfa]'}`} />
                  )}
<div>
                    <span className="text-sm font-bold text-[#e8e0ff]">
                      Clue {clueNumber}
                    </span>
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
                        : 'bg-[#211a3b] text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {isSolved ? 'Solved' : isExhausted ? 'Exhausted' : isLocked ? 'Locked' : 'Open'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#140e24] border-t border-[#3b2a59] flex items-center justify-between text-xs text-gray-400">
          <span className="text-[11px] text-gray-500">Shortcut: C</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[#2b1f47] text-[#e8e0ff] hover:bg-[#3b2a59] transition text-xs"
          >
            Close (C)
          </button>
        </div>

      </div>
    </div>
  );
}

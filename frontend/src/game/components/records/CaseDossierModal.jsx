import React from 'react';

export default function CaseDossierModal({
  isOpen,
  onClose,
  clues = [],
  basketUnlocked,
  totalFragments = 12,
  collectedCount = 0,
  onOpenClue
}) {
  if (!isOpen) return null;

  const roomClues = clues.filter((c) => c.id && c.id.startsWith('R2-') && c.room === 'records');
  const displayClues = roomClues.length > 0 ? roomClues : clues.filter((c) => c.id && c.id.startsWith('R2-'));

  const solvedCount = displayClues.filter((c) => c.solved).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none font-mono">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#111315] border border-[#c47a00]/70 shadow-[0_0_50px_rgba(196,122,0,0.25)] rounded-lg overflow-hidden text-[#e6ecef]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#1a1e22] border-b border-[#343d46]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c47a00] animate-pulse" />
            <h2 className="text-sm font-bold tracking-widest text-[#ffd68a] uppercase">
              CASE DOSSIER // SUBSTATION DELTA RECORDS VAULT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#8ca0b0] hover:text-white px-2 py-1 border border-[#343d46] hover:border-[#ffd68a] rounded transition"
          >
            [ESC] CLOSE
          </button>
        </div>

        {/* Progress Summary Strip */}
        <div className="px-6 py-3 bg-[#14171a] border-b border-[#242b31] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-[#8ca0b0]">EVIDENCE FRAGMENTS: </span>
            <span className="font-bold text-[#ffd68a]">
              {collectedCount} / {totalFragments}
            </span>
            <span className="ml-2 text-[10px] text-[#5e6e7c]">
              {basketUnlocked ? '(BASKET UNLOCKED)' : '(SEAL ACTIVE)'}
            </span>
          </div>

          <div>
            <span className="text-[#8ca0b0]">CASE FILES RESOLVED: </span>
            <span className="font-bold text-[#3dff8b]">
              {solvedCount} / {displayClues.length || 4}
            </span>
          </div>
        </div>

        {/* Clue Case Files Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0d0f11]">
          {displayClues.map((clue) => {
            const isSolved = Boolean(clue.solved);
            const attemptsLeft = Math.max(0, (clue.attempts_max || 3) - (clue.attempts || 0));
            const isLockedOut = attemptsLeft <= 0 && !isSolved;

            return (
              <div
                key={clue.id}
                className={`p-4 rounded-lg border transition-all ${
                  isSolved
                    ? 'bg-[#122417] border-emerald-700/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : isLockedOut
                    ? 'bg-[#241414] border-red-800/60 opacity-60'
                    : 'bg-[#181d22] border-[#36424e] hover:border-[#c47a00]/80 shadow'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#ffd68a]">
                        {clue.case_file_id || clue.id}
                      </span>
                      <span className="text-xs text-[#8ca0b0]">|</span>
                      <h3 className="text-sm font-bold text-[#f0f4f8]">
                        {clue.title}
                      </h3>
                    </div>
                    <p className="text-xs text-[#8ca0b0] mt-1 max-w-xl">
                      {clue.scene_text || 'Archival terminal located in records sub-basement.'}
                    </p>
                  </div>

                  <div className="text-right">
                    {isSolved ? (
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600 rounded text-[11px] font-bold">
                        RESOLVED
                      </span>
                    ) : isLockedOut ? (
                      <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-700 rounded text-[11px] font-bold">
                        LOCKOUT (0/3)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-[#252016] text-[#ffd68a] border border-[#c47a00]/60 rounded text-[11px] font-bold">
                        ATTEMPTS: {attemptsLeft}/3
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer action button */}
                <div className="mt-3 pt-3 border-t border-black/30 flex items-center justify-between">
                  <div className="text-[11px] text-[#708494]">
                    TERMINAL PROP: <code className="text-[#a0b4c4]">{clue.object_id}</code>
                  </div>

                  <button
                    onClick={() => onOpenClue(clue)}
                    className="px-4 py-1 bg-[#28323c] hover:bg-[#c47a00] hover:text-black text-xs font-bold text-[#ffd68a] rounded transition border border-[#445260] hover:border-[#ffd68a]"
                  >
                    ACCESS TERMINAL ➔
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lore Briefing Footer */}
        <div className="px-6 py-3 bg-[#14171a] border-t border-[#242b31] text-[11px] text-[#6e8090]">
          INVESTIGATIVE DIRECTIVE: Recover all evidence fragments across the room's 7 props to unlock the evidence basket [B]. Resolve all 4 case files to unseal the hydraulic bulkhead [R2-07].
        </div>
      </div>
    </div>
  );
}

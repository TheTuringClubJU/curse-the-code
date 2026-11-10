import React, { useState } from 'react';
import { copyDocumentText, downloadDocumentFile } from '../../engine/evidenceExport';

export default function CaseDossierModal({
  isOpen,
  onClose,
  clues = [],
  basketUnlocked,
  totalFragments = 12,
  collectedCount = 0,
  onOpenClue
}) {
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [downloadedDossier, setDownloadedDossier] = useState(false);
  if (!isOpen) return null;

  const roomClues = clues.filter((c) => c.id && c.id.startsWith('R2-') && c.room === 'records');
  const displayClues = roomClues.length > 0 ? roomClues : clues.filter((c) => c.id && c.id.startsWith('R2-'));
  const isControlRoom = totalFragments === 8 || displayClues.some((c) => c.object_id === 'staff_terminal' || c.object_id === 'radio_console');

  const solvedCount = displayClues.filter((c) => c.solved).length;

  const buildDossierText = () => [
    '============================================================',
    'SUBSTATION DELTA · SECTOR 5 — CASE DOSSIER',
    `RESOLVED: ${solvedCount}/${displayClues.length || 3} | EVIDENCE RECOVERED: ${collectedCount}/${totalFragments}`,
    '============================================================',
    ...displayClues.map((c) =>
      `\n[${c.case_file_id || c.id}] ${c.title} (${c.solved ? 'RESOLVED' : 'OPEN'})\nOBJECT: ${c.object_id || 'terminal'}\n${c.scene_text || ''}`
    ),
  ].join('\n');

  // Room 5 Tactile Detective Desk & Pinned Manila Case Folders
  if (isControlRoom) {
    return (
      <div className="desk-surface" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="relative w-full max-w-4xl flex flex-col gap-5 py-2" onMouseDown={(e) => e.stopPropagation()}>
          {/* Masking-Taped Case Header Strip + Export Actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="re-dossier-paper px-6 py-2.5 rounded-sm -rotate-[0.6deg] relative">
              <div className="masking-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-4" />
              <div className="font-re-typewriter text-[10px] tracking-[0.2em] text-[#6b4822] uppercase">
                SUBSTATION DELTA · SECTOR 5
              </div>
              <h2 className="font-re-typewriter text-lg sm:text-xl font-bold text-[#1c150f] m-0">
                CASE DOSSIER — RESOLVED {solvedCount}/{displayClues.length || 3}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await copyDocumentText(buildDossierText());
                  setCopiedDossier(true);
                  setTimeout(() => setCopiedDossier(false), 1800);
                }}
                className="re-btn"
              >
                <span className="re-btn-circle">{copiedDossier ? '✓' : '⎘'}</span>
                <span>{copiedDossier ? 'Copied' : 'Copy Dossier'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadDocumentFile('delta_sector5_dossier.txt', buildDossierText());
                  setDownloadedDossier(true);
                  setTimeout(() => setDownloadedDossier(false), 1800);
                }}
                className="re-btn"
              >
                <span className="re-btn-circle">{downloadedDossier ? '✓' : '⬇'}</span>
                <span>{downloadedDossier ? 'Downloaded' : 'Download Dossier'}</span>
              </button>
              <button type="button" onClick={onClose} className="re-btn">
                <span className="re-btn-circle">ESC</span>
                <span>Put Down</span>
              </button>
            </div>
          </div>

          {/* Manila Case Folders laid across desk */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto py-2" style={{ maxHeight: '70vh' }}>
            {displayClues.map((clue, idx) => {
              const isSolved = Boolean(clue.solved);
              const attemptsLeft = Math.max(0, (clue.attempts_max || 3) - (clue.attempts || 0));
              const isLockedOut = attemptsLeft <= 0 && !isSolved;
              const tilt = idx === 0 ? '-rotate-[1.2deg]' : idx === 1 ? 'rotate-[0.6deg]' : 'rotate-[1.3deg]';

              return (
                <div key={clue.id} className={`manila-dossier relative p-5 rounded-sm flex flex-col justify-between gap-4 ${tilt}`}>
                  {/* Dark metallic binder clip at top */}
                  <div className="absolute -top-2.5 right-6 w-8 h-4 rounded-sm bg-[#27272a] border border-white/20 shadow-md" />
                  <div>
                    <div className="flex items-center justify-between border-b border-black/20 pb-2 mb-3">
                      <span className="font-re-typewriter text-xs font-bold text-[#5e1212]">
                        {clue.case_file_id || clue.id}
                      </span>
                      <span className="re-stamp-badge">
                        {isSolved ? 'RESOLVED' : isLockedOut ? 'LOCKED' : `${attemptsLeft}/3 TRIES`}
                      </span>
                    </div>

                    <h3 className="font-re-typewriter text-base font-bold text-[#1a130c] mb-2">
                      {clue.title}
                    </h3>
                    <p className="font-re-typewriter text-xs text-[#36291c] leading-relaxed m-0">
                      {clue.scene_text}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-black/15 flex items-center justify-between">
                    <span className="font-re-typewriter text-[10px] text-[#5e4a32]">
                      {clue.object_id?.replace(/_/g, ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenClue(clue)}
                      className="re-btn"
                    >
                      <span className="re-btn-circle">E</span>
                      <span>Open Terminal</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none font-mono" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0d100e] border border-[#c47a00]/70 shadow-[0_0_50px_rgba(196,122,0,0.25)] rounded-lg overflow-hidden text-[#e6ecef]" onMouseDown={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#161915] border-b border-[#3d3426]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b91c1c] animate-pulse" />
            <h2 className="font-re-display text-sm sm:text-base font-bold tracking-widest text-[#f0dec0] uppercase m-0">
              {isControlRoom
                ? 'CASE DOSSIER // SUBSTATION DELTA CONTROL BUNKER'
                : 'CASE DOSSIER // SUBSTATION DELTA RECORDS VAULT'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#d6b98b] hover:text-white px-2.5 py-1 border border-[#4d3d29] hover:border-[#ffd68a] rounded transition cursor-pointer"
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
              {basketUnlocked ? '(BINDER UNLOCKED)' : '(SEAL ACTIVE)'}
            </span>
          </div>

          <div>
            <span className="text-[#8ca0b0]">CASE FILES RESOLVED: </span>
            <span className="font-bold text-[#3dff8b]">
              {solvedCount} / {displayClues.length || (isControlRoom ? 3 : 4)}
            </span>
          </div>
        </div>

        {/* Clue Case Files Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0b0d0b]">
          {isControlRoom && (
            <div className="re-dossier-paper rounded p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between border-b border-black/20 pb-1.5">
                <span className="font-re-display font-bold text-[#4a2b13] tracking-wider">INCIDENT BRIEFING // FILE 17-B</span>
                <span className="re-stamp-badge">ACTIVE ANOMALY</span>
              </div>
              <p className="font-re-typewriter m-0 text-[11.5px] leading-relaxed text-[#1f160d]">
                Substation Delta officially shut down on 1983-08-14, yet surveillance circuits inside Room 5B, the Locker Annex (5C), and Chamber 3 Observation Hall (5D) remain hot. Recover all 8 evidence fragments, inspect the CCTV feed, and unlock all 3 cryptographic terminals to break the Vault seal.
              </p>
            </div>
          )}
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
        <div className="px-6 py-3 bg-[#14171a] border-t border-[#242b31] text-[11px] text-[#8d9aa5]">
          {isControlRoom
            ? 'INVESTIGATIVE DIRECTIVE: Search glowing fixtures in Control Bay 5B and Security Annex 5C for all 8 evidence fragments to unlock terminals R2-01, R2-05, and R2-06.'
            : "INVESTIGATIVE DIRECTIVE: Recover all evidence fragments across the room's 7 props to unlock the evidence basket [B]. Resolve all 4 case files to unseal the hydraulic bulkhead [R2-07]."}
        </div>
      </div>
    </div>
  );
}

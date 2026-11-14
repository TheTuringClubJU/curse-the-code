import React, { useEffect, useState } from 'react';
import { copyDocumentText, downloadDocumentFile } from '../../engine/evidenceExport';

const RECOMMENDED_ORDER = ['R2-01', 'R2-05', 'R2-06'];

export default function ControlDossierModal({
  isOpen,
  onClose,
  clues = [],
  basketUnlocked = false,
  totalFragments = 10,
  collectedCount = 0,
  onOpenClue,
}) {
  const [dossierRecords, setDossierRecords] = useState([]);
  const [copiedDossier, setCopiedDossier] = useState(false);
  const [downloadedDossier, setDownloadedDossier] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    fetch('/api/game/round/2/dossier', {
      credentials: 'include',
      headers: { 'x-session-token': localStorage.getItem('ctc_token') || '' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.records)) {
          setDossierRecords(data.records.filter((r) => r.room === 'control'));
        }
      })
      .catch(() => {});

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayClues = [...clues.filter((c) => c?.id)].sort((a, b) => {
    const ia = RECOMMENDED_ORDER.indexOf(a.id);
    const ib = RECOMMENDED_ORDER.indexOf(b.id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const solvedCount = displayClues.filter((c) => c.solved).length;

  const buildDossierText = () => [
    '============================================================',
    'CURSE THE CODE // ROOM 5 — CASE DOSSIER',
    `RESOLVED: ${solvedCount}/${displayClues.length || 3} | FRAGMENTS: ${collectedCount}/${totalFragments}`,
    '============================================================',
    ...displayClues.map((c) => {
      const rec = dossierRecords.find((r) => r.clue_id === c.id);
      const revealStr = rec?.reveal ? `\nREVEAL: ${JSON.stringify(rec.reveal)}` : '';
      return `\n[${c.case_file_id || c.id}] ${c.title || c.id} (${c.solved ? 'SOLVED' : 'OPEN'})\nTERMINAL: ${c.object_id || 'terminal'}\n${c.scene_text || ''}${revealStr}`;
    }),
  ].join('\n');

  return (
    <div
      className="desk-surface select-none"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="relative w-full max-w-5xl flex flex-col gap-4 py-2 max-h-[92vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Masking-Taped Paper Plaque Header + Tactile Action Pills */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="re-dossier-paper px-6 py-2.5 rounded-sm -rotate-[0.6deg] relative">
            <div className="masking-tape absolute -top-2.5 left-4 w-16 h-4 rotate-2" />
            <div className="masking-tape absolute -top-2.5 right-4 w-16 h-4 -rotate-2" />
            <div className="flex flex-wrap items-center gap-3 font-re-typewriter text-[10px] tracking-[0.16em] text-[#6b4822] uppercase">
              <span>
                FRAGMENTS: {collectedCount} / {totalFragments}{' '}
                {basketUnlocked ? '(BASKET UNLOCKED)' : '(SEAL ACTIVE)'}
              </span>
              <span>•</span>
              <span className="font-bold text-[#1c5e32]">
                CLUES SOLVED: {solvedCount} / {displayClues.length || 3}
              </span>
            </div>
            <h2 className="font-re-typewriter text-base sm:text-xl font-bold text-[#1c150f] m-0">
              CASE DOSSIER // THE SURVEILLANCE MORGUE
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
                downloadDocumentFile('room5_case_dossier.txt', buildDossierText());
                setDownloadedDossier(true);
                setTimeout(() => setDownloadedDossier(false), 1800);
              }}
              className="re-btn"
            >
              <span className="re-btn-circle">{downloadedDossier ? '✓' : '⬇'}</span>
              <span>{downloadedDossier ? 'Saved' : 'Download'}</span>
            </button>
            <button type="button" onClick={onClose} className="re-btn">
              <span className="re-btn-circle">ESC</span>
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Side-by-Side Tilted Manila Case Folders */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto px-1 py-3"
          style={{ maxHeight: '62vh' }}
        >
          {displayClues.map((clue, idx) => {
            const isSolved = Boolean(clue.solved);
            const attemptsMax = clue.attempts_max || 3;
            const attemptsUsed = clue.attempts || 0;
            const attemptsLeft = Math.max(0, attemptsMax - attemptsUsed);
            const isLockedOut = Boolean(clue.exhausted || (!isSolved && attemptsLeft <= 0));
            const rec = dossierRecords.find((r) => r.clue_id === clue.id);
            const orderIdx = RECOMMENDED_ORDER.indexOf(clue.id);
            const stepNumber = orderIdx >= 0 ? orderIdx + 1 : idx + 1;
            const prevClue =
              orderIdx > 0
                ? displayClues.find((item) => item.id === RECOMMENDED_ORDER[orderIdx - 1])
                : null;
            const prevPending = Boolean(prevClue && !prevClue.solved);
            const tilts = ['-rotate-[1deg]', 'rotate-[0.6deg]', 'rotate-[1.1deg]'];
            const tiltClass = tilts[idx % tilts.length];

            return (
              <div
                key={clue.id}
                onClick={() => onOpenClue?.(clue)}
                className={`manila-dossier relative p-5 rounded-sm flex flex-col justify-between gap-4 cursor-pointer transition-transform hover:scale-[1.015] ${tiltClass} ${
                  !basketUnlocked && !isSolved ? 'opacity-85' : ''
                }`}
              >
                {/* Metallic binder clip at top */}
                <div className="absolute -top-2.5 right-6 w-8 h-4 rounded-sm bg-[#27272a] border border-white/20 shadow-md" />

                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-black/20 pb-2 mb-3">
                    <span className="font-re-typewriter text-xs font-bold text-[#5e1212]">
                      #{stepNumber} · {clue.case_file_id || clue.id}
                    </span>
                    <span
                      className="re-stamp-badge"
                      style={
                        isSolved
                          ? { borderColor: '#166534', color: '#166534' }
                          : !basketUnlocked
                          ? { borderColor: '#5c4832', color: '#5c4832' }
                          : undefined
                      }
                    >
                      {isSolved
                        ? 'SOLVED'
                        : isLockedOut
                        ? 'LOCKED OUT'
                        : basketUnlocked
                        ? 'OPEN TERMINAL'
                        : 'SEALED'}
                    </span>
                  </div>

                  <h3 className="font-re-typewriter text-base font-bold text-[#1a130c] mb-2">
                    {clue.title || clue.id}
                  </h3>

                  {clue.scene_text && (
                    <p className="font-re-typewriter text-xs text-[#36291c] leading-relaxed m-0 mb-2">
                      {clue.scene_text}
                    </p>
                  )}

                  {!isSolved && basketUnlocked && prevPending && (
                    <div className="font-re-typewriter text-[10.5px] font-bold text-[#7c1d1d] mb-2">
                      Sequence note: Resolve {prevClue.id} first for investigation continuity.
                    </div>
                  )}

                  {rec?.reveal && (
                    <div className="ruled-index-card px-3.5 pt-4 pb-2.5 rounded-sm mt-2 relative">
                      <div className="push-pin absolute top-1.5 right-2" />
                      <div className="font-re-typewriter text-[11px] space-y-0.5 text-[#142018]">
                        {Object.entries(rec.reveal).map(([k, v]) => (
                          <div key={k}>
                            <strong className="uppercase">{k.replace(/_/g, ' ')}:</strong>{' '}
                            {String(v)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-black/15 flex items-center justify-between gap-2">
                  <div className="font-re-typewriter text-[10px] text-[#5e4a32]">
                    <div>{clue.object_id?.replace(/_/g, ' ')}</div>
                    <div>Attempts Left: {attemptsLeft}/{attemptsMax}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenClue?.(clue);
                    }}
                    className="re-btn"
                  >
                    <span className="re-btn-circle">E</span>
                    <span>{isSolved ? 'Inspect' : 'Open Terminal'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ruled Investigative Directive Strip (strictly non-spoiler) */}
        <div className="re-dossier-paper px-5 py-3 rounded-sm relative font-re-typewriter text-[11.5px] leading-relaxed text-[#241b13] shrink-0">
          <div className="masking-tape absolute -top-2 left-8 w-14 h-3.5 rotate-1" />
          <strong>DIRECTIVE:</strong> Recover all {totalFragments} room fragments across Substation
          Delta to unseal the Evidence Basket [B], then solve the three Clue Terminals in investigation
          order (R2-01 → R2-05 → R2-06) to unseal the Core Airlock Valve (Fork 2).
        </div>
      </div>
    </div>
  );
}

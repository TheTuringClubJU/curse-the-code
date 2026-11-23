import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldAlert,
  FolderArchive,
  CheckCircle,
  AlertCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';

export default function FinalContainmentTerminalModal({
  isOpen,
  onClose,
  clue,
  onSubmitAnswer,
  isSubmitting,
  onOpenHints,
}) {
  const stages = clue?.stages || [];
  const payload = clue?.payload || {};
  const initialPieces = payload.piece_ids?.length ? [...payload.piece_ids] : [];
  const options = payload.options || [];
  const [stage, setStage] = useState(clue?.current_stage || 1);
  const [words, setWords] = useState(['', '', '']);
  const [pieces, setPieces] = useState(initialPieces);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [protocol, setProtocol] = useState(options[0]?.id || '');
  const [pin, setPin] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [showArchive, setShowArchive] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setStage(clue?.current_stage || 1);
      setPieces(initialPieces);
      setSelectedIndex(null);
      setFeedback(null);
    }
  }, [isOpen, clue?.id, clue?.current_stage]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if (
        (e.key === 'h' || e.key === 'H') &&
        !['INPUT', 'TEXTAREA'].includes(e.target?.tagName)
      ) {
        e.preventDefault();
        onOpenHints?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onOpenHints]);

  if (!isOpen) return null;
  const exhausted = !clue?.solved && (clue?.attempts || 0) >= (clue?.attempts_max || 3);
  const readOnly = isSubmitting || exhausted || clue?.solved;
  const stageDef = stages.find((item) => item.index === stage) || stages[stage - 1];

  const archiveItems = clue?.previous_clues_archive || [];
  const archiveStats = clue?.archive_stats || {
    total_count: archiveItems.length || 10,
    solved_count: archiveItems.filter((i) => i.solved).length,
    exhausted_count: archiveItems.filter((i) => i.is_exhausted).length,
    unresolved_count: archiveItems.filter((i) => !i.solved && !i.is_exhausted).length,
  };

  const swap = (from, to) => {
    if (readOnly || from == null || to == null || from === to) return;
    const next = [...pieces];
    [next[from], next[to]] = [next[to], next[from]];
    setPieces(next);
    setSelectedIndex(null);
  };

  const submit = async () => {
    if (readOnly) return;
    let answer;
    if (stage === 1) {
      answer = { stage: 1, k1: words[0], k2: words[1], k3: words[2] };
    } else if (stage === 2) {
      answer = { stage: 2, pieces: [...pieces] };
    } else {
      answer = { stage: 3, choice: protocol, code: pin };
    }
    const result = await onSubmitAnswer?.(clue.id, answer);
    if (result?.exhausted) setFeedback('Maximum attempts exhausted for this clue.');
    else if (result?.correct) {
      setFeedback(null);
      if (stage < 3) setStage((current) => current + 1);
      else if (result?.room_completed) onClose();
    } else {
      setFeedback(result?.message || 'Submission rejected.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-black/84 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bsmt-glass-panel w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 text-white font-bsmt-ui"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b border-white/15 pb-3">
          <h2 className="flex items-center gap-2.5 text-base sm:text-lg font-bold font-bsmt-display tracking-[0.12em] uppercase text-white">
            <ShieldAlert className="text-[#ff6b6b] w-5 h-5 shrink-0" />
            <span>CONTAINMENT TERMINAL • PHASE {stage}/3</span>
          </h2>

          <div className="flex items-center gap-2">
            {onOpenHints && (
              <button
                type="button"
                onClick={onOpenHints}
                title="Open Investigation Hints (Press H)"
                className="bsmt-glass-btn !py-1.5 !px-3.5 text-xs"
              >
                <Lightbulb className="w-3.5 h-3.5 text-white" />
                <span>Need Hint? (H)</span>
              </button>
            )}

            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="bsmt-glass-btn !py-1.5 !px-3.5 text-xs"
              title="Close Terminal (Esc)"
            >
              <span>Close (Esc)</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {stageDef?.prompt && (
          <p className="mb-3 text-xs sm:text-sm font-bsmt-ui text-white/85">{stageDef.prompt}</p>
        )}

        {stage === 1 && (
          <div className="space-y-4">
            <div className="bsmt-glass-card overflow-hidden">
              <button
                type="button"
                onClick={() => setShowArchive((prev) => !prev)}
                className="w-full flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 text-white transition text-xs select-none !rounded-none"
              >
                <div className="flex items-center gap-2 font-bold tracking-wide">
                  <FolderArchive className="w-4 h-4 text-[#ff6b6b]" />
                  <span>
                    {showArchive
                      ? 'HIDE DECRYPTED HOUSE LOGS'
                      : 'VIEW DECRYPTED HOUSE LOGS (PREVIOUS ROOMS)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/15 border border-emerald-400/40 text-emerald-200 font-bold">
                    Solved: {archiveStats.solved_count} / {archiveStats.total_count}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/15 border border-red-400/40 text-red-200 font-bold">
                    Exhausted: {archiveStats.exhausted_count}
                  </span>
                  {showArchive ? (
                    <ChevronUp className="w-4 h-4 text-white/80" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/80" />
                  )}
                </div>
              </button>

              {showArchive && (
                <div className="p-4 border-t border-white/15 font-mono text-xs max-h-72 overflow-y-auto space-y-3">
                  <div className="flex flex-wrap items-center justify-between pb-2 border-b border-white/10 text-[11px] text-white/60 gap-2">
                    <span className="text-white font-bold">HOLLOW HOUSE ARCHIVE TRANSCRIPTS</span>
                    <span className="text-[10px] text-white/55">
                      Cleartext keywords only revealed for solved clues.
                    </span>
                  </div>

                  {['bedroom', 'study', 'basement'].map((roomKey) => {
                    const roomClues = archiveItems.filter((item) => item.room === roomKey);
                    if (roomClues.length === 0) return null;
                    const roomLabel =
                      roomKey === 'bedroom'
                        ? "Room 1: Lena's Bedroom"
                        : roomKey === 'study'
                        ? "Room 2: Daniel's Study"
                        : 'Room 3: The Basement';

                    return (
                      <div key={roomKey} className="space-y-1.5">
                        <div className="text-[11px] font-bold text-white/85 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b6b]" />
                          {roomLabel}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {roomClues.map((item) => (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1 transition ${
                                item.solved
                                  ? 'bg-emerald-950/25 border-emerald-400/35 text-emerald-100'
                                  : item.is_exhausted
                                  ? 'bg-red-950/25 border-red-400/30 text-red-200'
                                  : 'bg-white/5 border-white/15 text-white/75'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 font-bold">
                                  {item.solved ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  ) : item.is_exhausted ? (
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  ) : (
                                    <Lock className="w-3.5 h-3.5 text-white/60 shrink-0" />
                                  )}
                                  <span>
                                    {item.title} ({item.id})
                                  </span>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 rounded-full uppercase font-bold bg-white/10 border border-white/20">
                                  {item.status}
                                </span>
                              </div>

                              <div className="mt-1">
                                {item.solved ? (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-white/55 text-[10px]">KEYWORD:</span>
                                    <span className="font-bold text-white bg-black/50 px-2.5 py-0.5 rounded-full border border-emerald-400/40 tracking-wider">
                                      {item.revealed_answer}
                                    </span>
                                  </div>
                                ) : item.is_exhausted ? (
                                  <span className="text-[10px] text-red-300/70 italic">
                                    [ DATA CORRUPTED • NO KEYWORD ]
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-white/50 italic">
                                    [ UNRESOLVED • SEALED ]
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {words.map((value, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono text-white/70">
                    {stageDef?.fields?.[index]?.label || `Master keyword ${index + 1}`}
                  </label>
                  <input
                    aria-label={stageDef?.fields?.[index]?.label || `Master keyword ${index + 1}`}
                    value={value}
                    disabled={readOnly}
                    placeholder={`Enter keyword ${index + 1}...`}
                    onChange={(event) =>
                      setWords((current) =>
                        current.map((word, wordIndex) =>
                          wordIndex === index ? event.target.value.toUpperCase() : word
                        )
                      )
                    }
                    className="bsmt-glass-input px-4 py-2.5 text-sm font-mono text-center placeholder-white/35"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="space-y-3">
            {pieces.length < 10 && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  <strong>Missing photograph fragments ({pieces.length}/10 collected):</strong> All 10 previous clues across Lena&apos;s Bedroom, Daniel&apos;s Study, and the Basement must be solved to recover every piece before the photograph can be assembled.
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between text-xs font-mono text-white/70 border-b border-white/15 pb-2 gap-2">
              <span className="text-white flex items-center gap-1.5 font-bold">
                <ImageIcon className="w-4 h-4 text-[#ff6b6b]" />
                VANCE FAMILY PORTRAIT • 10-PIECE RECONSTRUCTION
              </span>
              <span className="text-[11px] text-white/60">
                Drag &amp; drop or click two pieces to swap
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2.5" aria-label="Photo piece board">
              {pieces.map((piece, index) => (
                <div
                  key={piece}
                  draggable={!readOnly && pieces.length === 10}
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    swap(Number(event.dataTransfer.getData('text/plain')), index);
                  }}
                  onClick={() =>
                    selectedIndex == null ? setSelectedIndex(index) : swap(selectedIndex, index)
                  }
                  className={`relative aspect-[4/5] sm:aspect-[4/3] border-2 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing transition-all select-none flex flex-col items-center justify-between shadow-md ${
                    selectedIndex === index
                      ? 'border-white ring-2 ring-white/60 scale-105 z-10'
                      : 'border-white/25 bg-black/60 hover:border-white/65'
                  }`}
                >
                  <img
                    src={`/photo_pieces/${piece}.png`}
                    alt={`Fragment ${piece}`}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />

                  <div className="relative z-10 w-full flex items-center justify-between px-2 py-1 bg-black/55 backdrop-blur-xs border-b border-white/10">
                    <span className="text-[9px] font-mono text-white/80 font-bold">
                      #{index + 1}
                    </span>
                    <b className="font-mono text-xs text-white font-bold px-2 py-0.2 rounded-full bg-white/15 border border-white/30">
                      {piece}
                    </b>
                  </div>
                </div>
              ))}

              {Array.from({ length: Math.max(0, 10 - pieces.length) }).map((_, i) => (
                <div
                  key={`locked-slot-${i}`}
                  className="relative aspect-[4/5] sm:aspect-[4/3] border-2 border-dashed border-red-500/35 bg-red-950/20 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-2 text-center select-none"
                >
                  <Lock className="w-5 h-5 text-red-400/70 mb-1" />
                  <span className="text-[10px] font-mono text-red-300 font-bold">LOCKED PIECE</span>
                  <span className="text-[9px] text-white/40">Unsolved clue</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                disabled={readOnly || pieces.length < 10}
                onClick={() => {
                  setPieces([...initialPieces]);
                  setSelectedIndex(null);
                }}
                className="bsmt-glass-btn !py-1.5 !px-4 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <span className="text-[11px] font-mono text-white/55">
                {pieces.length === 10
                  ? 'Correct permutation unlocks the override terminal'
                  : 'Recover all missing pieces to enable verification'}
              </span>
            </div>
          </div>
        )}

        {stage === 3 && (
          <div className="space-y-4">
            <div className="bsmt-glass-card overflow-hidden p-2.5">
              <div className="flex flex-wrap items-center justify-between px-2 py-1.5 border-b border-white/15 mb-2 text-xs font-mono gap-2">
                <span className="text-white font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#ff6b6b]" />
                  RECONSTRUCTED VANCE FAMILY PORTRAIT
                </span>
                <span className="text-[11px] text-amber-200 font-mono">
                  Inspect the fifth figure&apos;s silhouette for the hidden code
                </span>
              </div>
              <div className="relative w-full overflow-hidden rounded-xl bg-black/70 flex items-center justify-center">
                <img
                  src="/photo_full.png"
                  alt="Reconstructed Vance Family Portrait"
                  className="w-full max-h-72 sm:max-h-80 object-contain rounded-xl select-none cursor-zoom-in"
                  title="Click to view full image in a new tab"
                  onClick={() => window.open('/photo_full.png', '_blank')}
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {options.length > 0 && (
                <div>
                  <label className="block text-[11px] font-mono text-white/70 mb-1.5">
                    Override Protocol:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-label={option.label || option.id}
                        disabled={readOnly}
                        onClick={() => setProtocol(option.id)}
                        className={`bsmt-glass-btn text-xs ${
                          protocol === option.id
                            ? '!bg-white/25 !border-white font-bold shadow-[0_0_16px_rgba(255,255,255,0.22)]'
                            : 'opacity-80'
                        }`}
                      >
                        {option.label || option.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-white/80 mb-1.5 font-bold">
                  Security PIN (from portrait):
                </label>
                <input
                  aria-label="Hidden PIN"
                  inputMode="numeric"
                  value={pin}
                  disabled={readOnly}
                  placeholder="Enter 4-digit code (e.g. 7351)..."
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="bsmt-glass-input w-full px-5 py-3 font-mono text-center text-lg tracking-widest placeholder-white/35"
                />
              </div>
            </div>
          </div>
        )}

        {feedback && (
          <p className="mt-4 text-sm text-red-200 font-mono text-center bg-red-950/45 border border-red-400/35 px-4 py-2 rounded-full">
            {feedback}
          </p>
        )}
        {exhausted && (
          <p className="mt-4 text-sm text-red-200 font-mono text-center bg-red-950/45 border border-red-400/35 px-4 py-2 rounded-full">
            Maximum attempts exhausted for this clue.
          </p>
        )}

        <button
          disabled={readOnly || (stage === 2 && pieces.length < 10)}
          onClick={submit}
          className="bsmt-glass-primary mt-5 w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {stage === 3
            ? 'DISENGAGE VAULT'
            : stage === 2 && pieces.length < 10
            ? `MISSING PIECES (${pieces.length}/10)`
            : 'VERIFY PHASE'}
        </button>
      </div>
    </div>
  );
}

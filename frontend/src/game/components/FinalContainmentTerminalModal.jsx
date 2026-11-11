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
  Lightbulb
} from 'lucide-react';

export default function FinalContainmentTerminalModal({
  isOpen,
  onClose,
  clue,
  onSubmitAnswer,
  isSubmitting,
  onOpenHints
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

  // Escape and Hint key listeners
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

  // Archive data passed from basement state
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
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl border border-red-500/50 bg-[#0d1012] p-5 sm:p-6 text-[#ffd6d6] shadow-[0_0_50px_rgba(239,68,68,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4 border-b border-red-500/30 pb-3">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold font-mono tracking-wide">
            <ShieldAlert className="text-red-400 w-5 h-5 shrink-0" />
            <span>CONTAINMENT TERMINAL • STAGE {stage} OF 3</span>
          </h2>

          <div className="flex items-center gap-2">
            {onOpenHints && (
              <button
                type="button"
                onClick={onOpenHints}
                title="Open Investigation Hints (Press H)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a1309] text-[#ffbf80] border border-[#ff7a1a]/50 hover:bg-[#3d1c0e] hover:border-[#ff9d54] transition font-mono text-xs font-bold shadow-sm"
              >
                <Lightbulb className="w-3.5 h-3.5 text-[#ff9d54]" />
                <span>Need Hint? (H)</span>
              </button>
            )}

            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition font-mono text-xs"
              title="Close Terminal (Esc)"
            >
              <span>Close (Esc)</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {stageDef?.prompt && (
          <p className="mb-3 text-xs sm:text-sm font-mono text-[#fca5a5]">
            {stageDef.prompt}
          </p>
        )}

        {stage === 1 && (
          <div className="space-y-4">
            {/* Decrypted House Logs Archive Section */}
            <div className="border border-red-500/30 rounded-lg overflow-hidden bg-black/40">
              <button
                type="button"
                onClick={() => setShowArchive((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-red-950/30 hover:bg-red-900/40 text-red-200 transition font-mono text-xs select-none"
              >
                <div className="flex items-center gap-2 font-bold tracking-wide">
                  <FolderArchive className="w-4 h-4 text-red-400" />
                  <span>{showArchive ? 'HIDE DECRYPTED HOUSE LOGS' : 'VIEW DECRYPTED HOUSE LOGS (PREVIOUS ROOMS)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-emerald-500/40 text-emerald-300 font-bold">
                    Solved: {archiveStats.solved_count} / {archiveStats.total_count}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-red-500/40 text-red-400 font-bold">
                    Exhausted: {archiveStats.exhausted_count}
                  </span>
                  {showArchive ? <ChevronUp className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-red-400" />}
                </div>
              </button>

              {showArchive && (
                <div className="p-4 bg-[#0a050d] border-t border-red-500/20 font-mono text-xs max-h-72 overflow-y-auto space-y-3">
                  <div className="flex flex-wrap items-center justify-between pb-2 border-b border-red-500/20 text-[11px] text-gray-400 gap-2">
                    <span className="text-red-300 font-bold">HOLLOW HOUSE ARCHIVE TRANSCRIPTS</span>
                    <span className="text-[10px] text-gray-400">Cleartext keywords only revealed for solved clues.</span>
                  </div>

                  {['bedroom', 'study', 'basement'].map((roomKey) => {
                    const roomClues = archiveItems.filter((item) => item.room === roomKey);
                    if (roomClues.length === 0) return null;
                    const roomLabel =
                      roomKey === 'bedroom'
                        ? "Room 1: Lena's Bedroom"
                        : roomKey === 'study'
                        ? "Room 2: Daniel's Study"
                        : "Room 3: The Basement";

                    return (
                      <div key={roomKey} className="space-y-1.5">
                        <div className="text-[11px] font-bold text-red-400/90 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                          {roomLabel}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {roomClues.map((item) => (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded border flex flex-col justify-between gap-1 transition ${
                                item.solved
                                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                                  : item.is_exhausted
                                  ? 'bg-red-950/20 border-red-900/40 text-red-300'
                                  : 'bg-[#151024]/40 border-purple-900/30 text-purple-300/80'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 font-bold">
                                  {item.solved ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  ) : item.is_exhausted ? (
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  ) : (
                                    <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                  )}
                                  <span>{item.title} ({item.id})</span>
                                </div>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                    item.solved
                                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30'
                                      : item.is_exhausted
                                      ? 'bg-red-900/40 text-red-400 border border-red-500/30'
                                      : 'bg-purple-900/40 text-purple-300 border border-purple-500/30'
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </div>

                              <div className="mt-1">
                                {item.solved ? (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-gray-400 text-[10px]">KEYWORD:</span>
                                    <span className="font-bold text-white bg-black/70 px-2 py-0.5 rounded border border-emerald-500/40 tracking-wider">
                                      {item.revealed_answer}
                                    </span>
                                  </div>
                                ) : item.is_exhausted ? (
                                  <span className="text-[10px] text-red-400/60 italic font-mono">
                                    [ DATA CORRUPTED • NO KEYWORD ]
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-purple-400/60 italic font-mono">
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

            {/* Keyword Inputs */}
            <div className="grid sm:grid-cols-3 gap-3">
              {words.map((value, index) => (
                <div key={index} className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono text-gray-400">
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
                    className="bg-black border border-red-500/40 rounded px-3 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-red-400"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between text-xs font-mono text-gray-400 border-b border-red-500/20 pb-2 gap-2">
              <span className="text-red-300 flex items-center gap-1.5 font-bold">
                <ImageIcon className="w-4 h-4 text-red-400" />
                VANCE FAMILY PORTRAIT • 10-PIECE RECONSTRUCTION
              </span>
              <span className="text-[11px] text-gray-400">
                Drag & drop or click two pieces to swap
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2.5" aria-label="Photo piece board">
              {pieces.map((piece, index) => (
                <div
                  key={piece}
                  draggable={!readOnly}
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    swap(Number(event.dataTransfer.getData('text/plain')), index);
                  }}
                  onClick={() => (selectedIndex == null ? setSelectedIndex(index) : swap(selectedIndex, index))}
                  className={`relative aspect-[4/5] sm:aspect-[4/3] border-2 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all select-none flex flex-col items-center justify-between shadow-md ${
                    selectedIndex === index
                      ? 'border-red-400 ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] scale-105 z-10'
                      : 'border-red-500/40 bg-[#0e0712] hover:border-red-400/80 hover:bg-[#1a0c24]'
                  }`}
                >
                  {/* Photo Fragment Graphic */}
                  <img
                    src={`/photo_pieces/${piece}.png`}
                    alt={`Fragment ${piece}`}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />

                  {/* Top Badge: Slot # and Piece ID without blocking artwork */}
                  <div className="relative z-10 w-full flex items-center justify-between px-2 py-1 bg-black/60 backdrop-blur-xs border-b border-white/10">
                    <span className="text-[9px] font-mono text-gray-300 font-bold">
                      #{index + 1}
                    </span>
                    <b className="font-mono text-xs text-amber-200 font-bold px-1.5 py-0.2 rounded bg-black/70 border border-amber-500/30">
                      {piece}
                    </b>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => {
                  setPieces([...initialPieces]);
                  setSelectedIndex(null);
                }}
                className="flex items-center gap-1.5 border border-red-500/40 rounded px-3 py-1.5 text-xs font-mono text-red-200 hover:bg-red-950/40 hover:border-red-400 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <span className="text-[11px] font-mono text-gray-500">
                Correct permutation unlocks the override terminal
              </span>
            </div>
          </div>
        )}

        {stage === 3 && (
          <div className="space-y-4">
            {/* Full Assembled Portrait Display */}
            <div className="border border-red-500/40 rounded-xl overflow-hidden bg-black/90 p-2 shadow-inner">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-red-500/20 mb-2 text-xs font-mono">
                <span className="text-red-300 font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-red-400" />
                  RECONSTRUCTED VANCE FAMILY PORTRAIT
                </span>
                <span className="text-[11px] text-amber-300 font-mono">
                  Inspect the fifth figure's silhouette for the hidden code
                </span>
              </div>
              <div className="relative w-full overflow-hidden rounded bg-[#0a050d] flex items-center justify-center">
                <img
                  src="/photo_full.png"
                  alt="Reconstructed Vance Family Portrait"
                  className="w-full max-h-72 sm:max-h-80 object-contain rounded select-none cursor-zoom-in"
                  title="Click to view full image in a new tab"
                  onClick={() => window.open('/photo_full.png', '_blank')}
                />
              </div>
            </div>

            {/* Protocol Options (if present) & Code Input */}
            <div className="space-y-3 pt-1">
              {options.length > 0 && (
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1.5">
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
                        className={`border rounded px-4 py-2 font-mono text-xs transition ${
                          protocol === option.id
                            ? 'border-red-300 bg-red-950 font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                            : 'border-red-500/30 text-gray-300 hover:border-red-400'
                        }`}
                      >
                        {option.label || option.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-gray-300 mb-1.5 font-bold">
                  Security PIN (from portrait):
                </label>
                <input
                  aria-label="Hidden PIN"
                  inputMode="numeric"
                  value={pin}
                  disabled={readOnly}
                  placeholder="Enter 4-digit code (e.g. 7351)..."
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-black border border-red-500/40 rounded px-3 py-3 font-mono text-white text-lg tracking-widest placeholder-gray-600 focus:outline-none focus:border-red-400"
                />
              </div>
            </div>
          </div>
        )}

        {feedback && <p className="mt-4 text-sm text-red-200 font-mono">{feedback}</p>}
        {exhausted && <p className="mt-4 text-sm text-red-200 font-mono">Maximum attempts exhausted for this clue.</p>}
        <button
          disabled={readOnly}
          onClick={submit}
          className="mt-5 w-full bg-red-700 hover:bg-red-600 py-3 rounded font-bold font-mono tracking-wider transition disabled:opacity-50"
        >
          {stage === 3 ? 'DISENGAGE VAULT' : 'VERIFY STAGE'}
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, FileText, ZoomIn, KeyRound } from 'lucide-react';

const RACK_NOTE_CIPHER_PIECES = [
  {
    id: 'EK01',
    label: 'Scrap A • Porcelain Doll Note',
    origin: "Room 1: Lena's Bedroom",
    file: '/key_piece.png',
    cipherText: 'PT ESS LPQE',
    summary:
      'Aged paper fragment recovered from Lena’s porcelain doll in the bedroom. (Margin: The key is the name of what died that night.)',
  },
  {
    id: 'EK03',
    label: 'Scrap B • Hidden Ledger Recess',
    origin: "Room 2: Daniel's Study",
    file: '/evidence/study/EK03.png',
    cipherText: 'FFA JCXAZAASD NZ',
    summary:
      'Folded slip concealed behind Daniel’s study bookshelf recess. Contains the central cipher phrase.',
  },
  {
    id: 'EK06',
    label: 'Scrap C • Toolbox Margin Note',
    origin: 'Room 3: The Basement',
    file: '/evidence/basement/EK06.png',
    cipherText: 'KZS ESS OLOW',
    summary:
      'Pencil margin note recovered from the mechanics toolbox. Concludes the three-piece message.',
  },
];

export default function ServerRackNoteModal({ isOpen, onClose, clue, onSubmitAnswer, isSubmitting }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [inspectingPiece, setInspectingPiece] = useState(null);

  if (!isOpen) return null;
  const exhausted = !clue?.solved && (clue?.attempts || 0) >= (clue?.attempts_max || 3);
  const stage = clue?.stages?.[0];
  const field = stage?.fields?.[0];

  const submit = async (e) => {
    e?.preventDefault?.();
    if (isSubmitting || exhausted || clue?.solved) return;
    const result = await onSubmitAnswer?.(clue.id, answer);
    setFeedback(result?.message || (result?.correct ? 'Decryption verified!' : 'Decryption sequence incorrect.'));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] bg-black/82 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bsmt-glass-panel w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 text-white font-bsmt-ui flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/15 pb-3">
          <h2 className="flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-[0.12em] font-bsmt-display text-white uppercase">
            <FileText className="text-[#ff6b6b] w-5 h-5 shrink-0" />
            <span>SERVER RACK / MARGIN NOTE</span>
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="bsmt-glass-icon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scene Text */}
        <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
          {clue?.scene_text ||
            'A weathered yellow incident note is taped inside the perforated steel door of the server rack, referencing scraps scattered across the estate.'}
        </p>

        {/* Recovered Cipher Scraps Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-white/80 uppercase tracking-wider">
            <span>Recovered Cipher Notes (Bedroom • Study • Basement)</span>
            <span className="text-[10px] text-white/50 font-normal">Click scrap to zoom</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {RACK_NOTE_CIPHER_PIECES.map((piece) => (
              <div
                key={piece.id}
                onClick={() => setInspectingPiece(piece)}
                className="group bsmt-glass-card cursor-pointer p-2.5 flex flex-col justify-between transition hover:border-white/40 hover:bg-white/10"
              >
                <div className="space-y-1.5">
                  <div className="relative w-full h-24 bg-black/75 rounded-xl overflow-hidden border border-white/15 flex items-center justify-center">
                    <img
                      src={piece.file}
                      alt={piece.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/parcel_wrapped.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#fca5a5] block truncate font-mono">
                      {piece.id} • {piece.origin}
                    </span>
                    <span className="text-xs font-bold text-amber-200 tracking-wider block bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 mt-1 truncate font-mono text-center">
                      &ldquo;{piece.cipherText}&rdquo;
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-white/75 mt-2 line-clamp-2 leading-tight">
                  {piece.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Assembled Ciphertext Banner */}
        <div className="bsmt-glass-card p-3.5 text-center space-y-1">
          <span className="text-[10px] text-white/65 uppercase font-bold tracking-widest block">
            Complete Assembled Estate Cipher Sequence
          </span>
          <div className="text-sm sm:text-base font-bold font-mono text-amber-200 tracking-[0.2em]">
            PT ESS LPQE • FFA JCXAZAASD NZ • KZS ESS OLOW
          </div>
        </div>

        {/* Cipher Guidance Box */}
        <div className="bsmt-glass-card border-l-4 border-l-[#ff6b6b] p-3.5 text-xs space-y-1">
          <div className="font-bold text-white flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-[#ff6b6b] shrink-0" />
            <span>VIGENÈRE CIPHER DECRYPTION PROTOCOL</span>
          </div>
          <p className="text-white/75 text-[11px] leading-relaxed">
            The three note scraps assemble into a single contiguous cipher message. Decrypt the text using the key indicated in the scrap margin to uncover what to do with the seal.
          </p>
        </div>

        {/* Submission Form */}
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs text-white/80 block font-medium">
              {stage?.prompt || field?.label || 'What does the family ask you to do with the seal? (one word)'}
            </label>
            <input
              aria-label={field?.label || 'One word'}
              value={answer}
              onChange={(event) => setAnswer(event.target.value.toUpperCase())}
              disabled={isSubmitting || exhausted || clue?.solved}
              placeholder={field?.placeholder || 'ENTER DECRYPTED WORD (e.g. CLOSE)'}
              className="bsmt-glass-input w-full px-5 py-3 tracking-[.25em] text-center text-sm sm:text-base font-bold font-mono placeholder:text-white/35"
            />
          </div>

          {feedback && (
            <p className="text-xs text-center text-red-200 bg-red-950/50 border border-red-400/35 px-4 py-2 rounded-full">
              {feedback}
            </p>
          )}

          {exhausted && (
            <p className="text-xs text-center text-red-300 bg-red-950/50 border border-red-400/35 px-4 py-2 rounded-full">
              Maximum attempts exhausted for this clue.
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || exhausted || clue?.solved || !answer.trim()}
            className="bsmt-glass-primary w-full"
          >
            {isSubmitting ? 'VERIFYING CIPHER...' : 'SUBMIT DECRYPTION'}
          </button>
        </form>

        {/* Scrap Zoom Lightbox */}
        {inspectingPiece && (
          <div
            className="fixed inset-0 z-[80] bg-black/88 backdrop-blur-md flex items-center justify-center p-4 select-none"
            onClick={() => setInspectingPiece(null)}
          >
            <div
              className="bsmt-glass-panel max-w-md w-full p-5 space-y-3 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/15 pb-2">
                <span className="font-bold text-sm text-white font-mono">{inspectingPiece.label}</span>
                <button
                  type="button"
                  onClick={() => setInspectingPiece(null)}
                  className="bsmt-glass-icon !w-8 !h-8"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="w-full h-56 bg-black/80 rounded-2xl overflow-hidden border border-white/15 flex items-center justify-center">
                <img
                  src={inspectingPiece.file}
                  alt={inspectingPiece.label}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="text-xs space-y-1">
                <div className="text-white/60">
                  Origin: <span className="text-white font-bold">{inspectingPiece.origin}</span>
                </div>
                <div className="text-white/60">
                  Cipher Inscription:{' '}
                  <span className="text-amber-200 font-bold tracking-wider font-mono">
                    {inspectingPiece.cipherText}
                  </span>
                </div>
                <p className="text-white/80 text-[11px] pt-1">{inspectingPiece.summary}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

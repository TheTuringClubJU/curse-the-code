import React, { useState } from 'react';
import { X, FileText, ZoomIn, Info, ShieldAlert, KeyRound } from 'lucide-react';

const RACK_NOTE_CIPHER_PIECES = [
  {
    id: 'EK01',
    label: 'Scrap A • Porcelain Doll Note',
    origin: "Room 1: Lena's Bedroom",
    file: '/key_piece.png',
    cipherText: 'KYFV MVV HZ',
    summary: 'Aged paper fragment recovered from Lena’s porcelain doll in the bedroom. Contains the opening encrypted triad.'
  },
  {
    id: 'EK03',
    label: 'Scrap B • Hidden Ledger Recess',
    origin: "Room 2: Daniel's Study",
    file: '/evidence/study/EK03.png',
    cipherText: 'BR TPUIZVUML ZF',
    summary: 'Folded slip concealed behind Daniel’s study bookshelf recess. Contains the central cipher phrase.'
  },
  {
    id: 'EK06',
    label: 'Scrap C • Toolbox Margin Note',
    origin: 'Room 3: The Basement',
    file: '/evidence/basement/EK06.png',
    cipherText: 'XMK HYF NEOX',
    summary: 'Pencil margin note recovered from the mechanics toolbox. Concludes the three-piece message.'
  }
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
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-red-500/40 bg-[#15171a] p-5 sm:p-6 text-[#ffd6d6] font-mono flex flex-col gap-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-red-500/30 pb-3">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-red-300">
            <FileText className="text-red-400 w-5 h-5 shrink-0" />
            <span>SERVER RACK / MARGIN NOTE</span>
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scene Text */}
        <p className="text-xs sm:text-sm text-red-200/90 leading-relaxed">
          {clue?.scene_text || 'A weathered yellow incident note is taped inside the perforated steel door of the server rack, referencing scraps scattered across the estate.'}
        </p>

        {/* Recovered Cipher Scraps Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-red-300 uppercase tracking-wider">
            <span>Recovered Cipher Notes (Bedroom • Study • Basement)</span>
            <span className="text-[10px] text-gray-400 font-normal">Click scrap to zoom</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {RACK_NOTE_CIPHER_PIECES.map((piece) => (
              <div
                key={piece.id}
                onClick={() => setInspectingPiece(piece)}
                className="group cursor-pointer bg-black/60 border border-red-500/30 hover:border-red-400/70 rounded-xl p-2.5 flex flex-col justify-between transition hover:bg-red-950/20"
              >
                <div className="space-y-1.5">
                  <div className="relative w-full h-24 bg-black/80 rounded-lg overflow-hidden border border-red-500/20 flex items-center justify-center">
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
                    <span className="text-[10px] font-bold text-red-400 block truncate">{piece.id} • {piece.origin}</span>
                    <span className="text-xs font-bold text-amber-300 tracking-wider block bg-black/60 px-2 py-0.5 rounded border border-amber-500/30 mt-1 truncate">
                      "{piece.cipherText}"
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-300 mt-2 line-clamp-2 leading-tight">
                  {piece.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Assembled Ciphertext Banner */}
        <div className="bg-[#101214] border border-amber-500/40 rounded-xl p-3 text-center space-y-1">
          <span className="text-[10px] text-amber-400/80 uppercase font-bold tracking-widest block">
            Complete Assembled Estate Cipher Sequence
          </span>
          <div className="text-sm sm:text-base font-bold text-amber-200 tracking-[0.2em]">
            KYFV MVV HZ • BR TPUIZVUML ZF • XMK HYF NEOX
          </div>
        </div>

        {/* Cipher Guidance Box */}
        <div className="bg-[#1a0f12] border-l-4 border-red-500 p-3 rounded-r-xl text-xs space-y-1">
          <div className="font-bold text-red-300 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-red-400 shrink-0" />
            <span>VIGENÈRE CIPHER DECRYPTION PROTOCOL</span>
          </div>
          <p className="text-gray-300 text-[11px] leading-relaxed">
            The three note scraps assemble into a single contiguous cipher message. Decrypt the text using the family surname as the Vigenère repeating key to uncover what to do with the flag.
          </p>
        </div>

        {/* Submission Form */}
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-xs text-red-300/80 block">
              {stage?.prompt || field?.label || 'What does the note say to do with the flag? (one word)'}
            </label>
            <input
              aria-label={field?.label || 'One word'}
              value={answer}
              onChange={(event) => setAnswer(event.target.value.toUpperCase())}
              disabled={isSubmitting || exhausted || clue?.solved}
              placeholder={field?.placeholder || 'ENTER DECRYPTED WORD (e.g. LOWER)'}
              className="w-full bg-black/80 border border-red-500/40 rounded-xl px-4 py-3 tracking-[.25em] text-center text-sm sm:text-base font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-red-400 transition"
            />
          </div>

          {feedback && (
            <p className="text-xs text-center text-red-300 bg-red-950/40 border border-red-500/30 p-2 rounded-lg">
              {feedback}
            </p>
          )}

          {exhausted && (
            <p className="text-xs text-center text-red-400 bg-red-950/50 border border-red-700/50 p-2 rounded-lg">
              Maximum attempts exhausted for this clue.
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || exhausted || clue?.solved || !answer.trim()}
            className="w-full bg-red-700 hover:bg-red-600 active:bg-red-800 py-3 rounded-xl font-bold tracking-widest text-white disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg"
          >
            {isSubmitting ? 'VERIFYING CIPHER...' : 'SUBMIT DECRYPTION'}
          </button>
        </form>

        {/* Scrap Zoom Lightbox */}
        {inspectingPiece && (
          <div
            className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4 select-none"
            onClick={() => setInspectingPiece(null)}
          >
            <div
              className="max-w-md w-full bg-[#181116] border border-red-500/50 rounded-2xl p-5 space-y-3 text-red-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-red-500/30 pb-2">
                <span className="font-bold text-sm text-red-300">{inspectingPiece.label}</span>
                <button type="button" onClick={() => setInspectingPiece(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-56 bg-black rounded-xl overflow-hidden border border-red-500/30 flex items-center justify-center">
                <img src={inspectingPiece.file} alt={inspectingPiece.label} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="text-xs space-y-1">
                <div className="text-gray-400">Origin: <span className="text-white font-bold">{inspectingPiece.origin}</span></div>
                <div className="text-gray-400">Cipher Inscription: <span className="text-amber-300 font-bold tracking-wider">{inspectingPiece.cipherText}</span></div>
                <p className="text-gray-300 text-[11px] pt-1">{inspectingPiece.summary}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

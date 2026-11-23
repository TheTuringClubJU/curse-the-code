import React, { useState } from 'react';
import { X, Radio, Volume2, ZoomIn, Info } from 'lucide-react';

const INTERCOM_EVIDENCE_PIECES = [
  {
    id: 'EK04',
    name: 'Decoy Transmission Card',
    origin: 'Room 3: The Basement (Server Rack)',
    file: '/evidence/basement/EK04.png',
    role: 'Sub-station Telemetry [Card 1]',
    summary:
      'Damaged telemetry clearance card recovered from the server rack printer tray. Scan to verify transmission status.',
  },
  {
    id: 'EK05',
    name: 'Station Clearance Card',
    origin: 'Room 3: The Basement (Maintenance Terminal)',
    file: '/evidence/basement/EK05.png',
    role: 'Primary Intercom Keycard [Card 2]',
    summary:
      'Clearance card recovered from the CRT maintenance terminal desk. Scan to retrieve external authorization passcode.',
  },
];

export default function IntercomQrModal({ isOpen, onClose, clue, onSubmitAnswer, isSubmitting }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [inspectingPiece, setInspectingPiece] = useState(null);

  if (!isOpen) return null;
  const exhausted = !clue?.solved && (clue?.attempts || 0) >= (clue?.attempts_max || 3);
  const stage = clue?.stages?.[0];
  const field = stage?.fields?.[0];

  const playTone = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 920;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 260);
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (isSubmitting || exhausted || clue?.solved) return;
    const r = await onSubmitAnswer?.(clue.id, answer);
    setFeedback(r?.correct ? r?.message || 'Authentication successful.' : r?.message || 'Submission failed');
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
            <Radio className="text-[#ff6b6b] w-5 h-5 shrink-0" />
            <span>WALL INTERCOM • AUTHORIZATION TERMINAL</span>
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

        {/* Tone Generator */}
        <div className="bsmt-glass-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="text-xs text-white/80">
            Emergency Station Beacon: <span className="text-white font-bold font-mono">920 Hz Pulse</span>
          </div>
          <button
            type="button"
            onClick={playTone}
            className="bsmt-glass-btn !py-1.5 !px-4 text-xs"
          >
            <Volume2 size={15} />
            <span>Play Tone (920 Hz)</span>
          </button>
        </div>

        {/* Context / Scene Prompt */}
        <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
          {clue?.scene_text ||
            'The wall intercom terminal asks for the physical clearance passcode encoded in the physical card.'}
        </p>

        {/* Recovered Fragments Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-white/80 uppercase tracking-wider">
            <span>Recovered Clearance Cards (Basement)</span>
            <span className="text-[10px] text-white/50 font-normal">Click any card to inspect &amp; scan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INTERCOM_EVIDENCE_PIECES.map((piece) => (
              <div
                key={piece.id}
                onClick={() => setInspectingPiece(piece)}
                className="group bsmt-glass-card cursor-pointer p-2.5 flex flex-col justify-between transition hover:border-white/40 hover:bg-white/10"
              >
                <div className="space-y-1.5">
                  <div className="relative w-full h-24 bg-black/75 rounded-xl overflow-hidden border border-white/15 flex items-center justify-center">
                    <img
                      src={piece.file}
                      alt={piece.name}
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
                      {piece.id} • {piece.role}
                    </span>
                    <span className="text-[9px] text-white/55 block truncate">{piece.origin}</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/75 mt-2 line-clamp-2 leading-tight">
                  {piece.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Physical Directive Banner */}
        <div className="bsmt-glass-card border-l-4 border-l-white/60 p-3.5 text-xs space-y-1">
          <div className="font-bold text-white flex items-center gap-1.5">
            <Info className="w-4 h-4 text-white/80 shrink-0" />
            <span>PHYSICAL VERIFICATION PROTOCOL</span>
          </div>
          <p className="text-white/75 text-[11px] leading-relaxed">
            Cross-reference the recovered transmission channel logs above with your team’s physical authorization card to obtain the clearance passcode.
          </p>
        </div>

        {/* Input & Submission */}
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs text-white/80 block font-medium">
              {stage?.prompt || field?.label || 'Passcode'}
            </label>
            <input
              aria-label={field?.label || 'Passcode'}
              value={answer}
              onChange={(e) => setAnswer(e.target.value.toUpperCase())}
              disabled={isSubmitting || exhausted || clue?.solved}
              placeholder={field?.placeholder || 'ENTER PASSCODE (e.g. QR92)'}
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
            {isSubmitting ? 'VERIFYING AUTHORIZATION...' : 'AUTHENTICATE'}
          </button>
        </form>

        {/* Piece Zoom Modal Lightbox */}
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
                <span className="font-bold text-sm text-white font-mono">
                  {inspectingPiece.id} • {inspectingPiece.name}
                </span>
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
                  alt={inspectingPiece.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="text-xs space-y-1">
                <div className="text-white/60">
                  Origin: <span className="text-white font-bold">{inspectingPiece.origin}</span>
                </div>
                <div className="text-white/60">
                  Classification: <span className="text-[#fca5a5] font-bold">{inspectingPiece.role}</span>
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

import React, { useState } from 'react';
import { X, Radio, Volume2, Key, RadioReceiver, ExternalLink, Image as ImageIcon, ZoomIn, Info, CheckCircle2 } from 'lucide-react';

const INTERCOM_EVIDENCE_PIECES = [
  {
    id: 'EK02',
    name: 'Tape Spool Clearance Segment',
    origin: "Room 2: Daniel's Study (Tape Recorder)",
    file: '/evidence/study/EK02.png',
    role: 'Emergency Frequency Channel',
    summary: 'Audio spool recovered from Daniel’s reel-to-reel recorder. Encodes the primary transmission channel: Channel 92 / RED broadcast band.'
  },
  {
    id: 'EK04',
    name: 'Drive Bay Transmission Echo',
    origin: 'Room 3: The Basement (Server Rack)',
    file: '/evidence/basement/EK04.png',
    role: 'Sub-station Telemetry Header',
    summary: 'Telemetry printout salvaged from the central server rack drive bay. Handshake sequence confirms external physical clearance card verification.'
  },
  {
    id: 'EK05',
    name: 'Terminal Alignment Packet',
    origin: 'Room 3: The Basement (Maintenance Terminal)',
    file: '/evidence/basement/EK05.png',
    role: 'Authorization Handshake Key',
    summary: 'Audio data packet recovered from the CRT maintenance terminal above the console. Directs agents to cross-reference the physical QR card.'
  }
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
    setFeedback(r?.correct ? (r?.message || 'Authentication successful.') : (r?.message || 'Submission failed'));
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-red-500/40 bg-[#120d0f] shadow-[0_0_40px_rgba(255,70,70,.18)] p-5 sm:p-6 text-[#ffd6d6] font-mono flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-red-500/30 pb-3">
          <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-red-300">
            <Radio className="text-red-400 w-5 h-5 shrink-0" />
            <span>WALL INTERCOM • AUTHORIZATION TERMINAL</span>
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

        {/* Tone Generator */}
        <div className="flex items-center justify-between gap-3 bg-red-950/30 border border-red-500/30 rounded-xl p-3">
          <div className="text-xs text-red-200/80">
            Emergency Station Beacon: <span className="text-red-300 font-bold">920 Hz Pulse</span>
          </div>
          <button
            type="button"
            onClick={playTone}
            className="flex items-center gap-2 bg-red-900/40 hover:bg-red-800/50 border border-red-400/40 px-3 py-1.5 rounded-lg text-xs font-bold text-red-200 transition"
          >
            <Volume2 size={15} />
            <span>Play Tone (920 Hz)</span>
          </button>
        </div>

        {/* Context / Scene Prompt */}
        <p className="text-xs sm:text-sm text-red-200/90 leading-relaxed">
          {clue?.scene_text || 'The wall intercom terminal asks for the physical clearance passcode encoded in the physical card.'}
        </p>

        {/* Recovered Fragments Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-red-300 uppercase tracking-wider">
            <span>Recovered Assembly Evidence (Study & Basement)</span>
            <span className="text-[10px] text-gray-400 font-normal">Click any fragment to inspect</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {INTERCOM_EVIDENCE_PIECES.map((piece) => (
              <div
                key={piece.id}
                onClick={() => setInspectingPiece(piece)}
                className="group cursor-pointer bg-black/60 border border-red-500/30 hover:border-red-400/70 rounded-xl p-2.5 flex flex-col justify-between transition hover:bg-red-950/20"
              >
                <div className="space-y-1.5">
                  <div className="relative w-full h-24 bg-black/80 rounded-lg overflow-hidden border border-red-500/20 flex items-center justify-center">
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
                    <span className="text-[10px] font-bold text-red-400 block truncate">{piece.id} • {piece.role}</span>
                    <span className="text-[9px] text-gray-400 block truncate">{piece.origin}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-300 mt-2 line-clamp-2 leading-tight">
                  {piece.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Physical Directive Banner */}
        <div className="bg-[#1a0f12] border-l-4 border-amber-500 p-3 rounded-r-xl text-xs space-y-1">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>PHYSICAL VERIFICATION PROTOCOL</span>
          </div>
          <p className="text-gray-300 text-[11px] leading-relaxed">
            Cross-reference the recovered transmission channel logs above with your team’s physical authorization card to obtain the clearance passcode.
          </p>
        </div>

        {/* Input & Submission */}
        <form onSubmit={submit} className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-xs text-red-300/80 block">
              {stage?.prompt || field?.label || 'Passcode'}
            </label>
            <input
              aria-label={field?.label || 'Passcode'}
              value={answer}
              onChange={(e) => setAnswer(e.target.value.toUpperCase())}
              disabled={isSubmitting || exhausted || clue?.solved}
              placeholder={field?.placeholder || 'ENTER PASSCODE (e.g. QR92)'}
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
            {isSubmitting ? 'VERIFYING AUTHORIZATION...' : 'AUTHENTICATE'}
          </button>
        </form>

        {/* Piece Zoom Modal Lightbox */}
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
                <span className="font-bold text-sm text-red-300">{inspectingPiece.id} • {inspectingPiece.name}</span>
                <button type="button" onClick={() => setInspectingPiece(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-56 bg-black rounded-xl overflow-hidden border border-red-500/30 flex items-center justify-center">
                <img src={inspectingPiece.file} alt={inspectingPiece.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="text-xs space-y-1">
                <div className="text-gray-400">Origin: <span className="text-white font-bold">{inspectingPiece.origin}</span></div>
                <div className="text-gray-400">Classification: <span className="text-red-300 font-bold">{inspectingPiece.role}</span></div>
                <p className="text-gray-300 text-[11px] pt-1">{inspectingPiece.summary}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

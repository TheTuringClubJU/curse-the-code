import React, { useState, useEffect } from 'react';

export default function MicrofilmViewerModal({
  isOpen,
  onClose,
  clue,
  onSubmitAnswer,
  isSubmitting,
  audio
}) {
  if (!isOpen || !clue) return null;

  const [currentFrame, setCurrentFrame] = useState(0);
  const [dialRotation, setDialRotation] = useState(0);
  const [codeInput, setCodeInput] = useState('');
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [stareScare, setStareScare] = useState(false);

  const attemptsLeft = Math.max(0, (clue.attempts_max || 3) - (clue.attempts || 0));
  const isSolved = Boolean(clue.solved);

  // Microfilm frame contents
  const frames = [
    {
      title: 'FRAME 01/04 // CALIBRATION & INTAKE',
      content: (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 font-mono text-emerald-400">
          <div className="w-16 h-16 border-2 border-dashed border-emerald-500 rounded-full flex items-center justify-center text-xs animate-spin">
            1981
          </div>
          <div className="text-xs tracking-widest uppercase border-y border-emerald-800 py-2">
            SUBSTATION DELTA ARCHIVAL MICROFILM REEL #883
          </div>
          <p className="text-[11px] text-emerald-600 max-w-sm">
            CALIBRATED OPTICAL REEL. OPERATE BRASS DIAL TO ADVANCE FRAMES.
            ALL ENTRIES RETRIEVED FROM SUB-SURFACE VAULT RECORDS.
          </p>
        </div>
      )
    },
    {
      title: 'FRAME 02/04 // SUBJECT PHOTOGRAPH',
      content: (
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
          <div className={`relative w-48 h-56 bg-black border-2 ${stareScare ? 'border-red-600 animate-pulse' : 'border-emerald-700'} rounded overflow-hidden flex items-center justify-center transition-all`}>
            {/* Procedural CRT Portrait */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-black to-emerald-950/60" />
            <div className="relative text-center p-2">
              <div className="w-20 h-24 mx-auto bg-emerald-900/40 rounded-full border border-emerald-500/40 flex items-center justify-center relative overflow-hidden">
                <div className={`absolute top-8 left-4 w-3 h-3 rounded-full ${stareScare ? 'bg-red-500 shadow-[0_0_8px_#ff0000]' : 'bg-emerald-400'} transition-colors`} />
                <div className={`absolute top-8 right-4 w-3 h-3 rounded-full ${stareScare ? 'bg-red-500 shadow-[0_0_8px_#ff0000]' : 'bg-emerald-400'} transition-colors`} />
                <div className="absolute bottom-5 w-6 h-1 bg-emerald-600 rounded" />
              </div>
              <div className="mt-2 text-[10px] font-mono text-emerald-400 tracking-wider">
                {stareScare ? 'HE SEES YOU' : 'DR. M. CORVIN — 1981'}
              </div>
            </div>
            {/* Film Grain & Scratches */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,30,10,0.8))]" />
          </div>
          <div className="text-[10px] font-mono text-emerald-600">
            RECORD IDENTIFICATION: ARCHIVIST PERSONNEL FILE #0388
          </div>
        </div>
      )
    },
    {
      title: 'FRAME 03/04 // SUBSYSTEM JUNCTION SCHEMATIC',
      content: (
        <div className="flex flex-col items-center justify-center p-6 space-y-3 font-mono text-emerald-400">
          <div className="border border-emerald-700/60 bg-black/60 p-4 rounded max-w-md w-full text-xs space-y-2">
            <div className="text-emerald-300 font-bold border-b border-emerald-800 pb-1">
              SUBSYSTEM RELAY BUS SCHEMATIC
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-900/60">
              <span className="text-emerald-500">JUNCTION ID:</span>
              <span className="font-bold text-emerald-200">DELTA-04</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-900/60">
              <span className="text-emerald-500">CIRCUIT BUS:</span>
              <span className="font-bold text-emerald-200">0x054D</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-900/60">
              <span className="text-emerald-500">LOGIC LEVEL:</span>
              <span className="text-emerald-400">TTL HIGH (+5V)</span>
            </div>
          </div>
          <p className="text-[10px] text-emerald-600 text-center max-w-sm">
            Substation Archival Microfilm Record #883 • Sector 04 Circuit Diagram
          </p>
        </div>
      )
    },
    {
      title: 'FRAME 04/04 // ARCHIVAL SPECIFICATION',
      content: (
        <div className="flex flex-col items-center justify-center p-6 font-mono text-emerald-400 text-xs space-y-3 text-center">
          <div className="text-emerald-300 font-bold tracking-widest uppercase border-b border-emerald-800 pb-1">
            FACILITY ARCHIVAL SPECIFICATION 81-B
          </div>
          <p className="max-w-md text-[11px] leading-relaxed text-emerald-500 text-left">
            "All sub-basement security terminals interface directly with the primary circuit bus registers. Verify routing against recovered vault records prior to operating manual access controls."
          </p>
          <div className="text-[10px] text-emerald-700 text-left w-full max-w-md">
            ARCHIVAL REF: DELTA-SEC-04
          </div>
        </div>
      )
    }
  ];

  // Rotate dial to advance frame
  const advanceFrame = (direction = 1) => {
    audio?.dialClick?.();
    setDialRotation((prev) => prev + direction * 45);
    setCurrentFrame((prev) => (prev + direction + frames.length) % frames.length);
  };

  // Jump scare timer if looking at photograph (Frame 1)
  useEffect(() => {
    let t;
    if (currentFrame === 1 && !stareScare) {
      t = setTimeout(() => {
        setStareScare(true);
        audio?.screamingStinger?.(0.9);
      }, 14000);
    } else {
      setStareScare(false);
    }
    return () => clearTimeout(t);
  }, [currentFrame]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isSolved || attemptsLeft <= 0) return;

    const res = await onSubmitAnswer(clue.id, {
      code: codeInput.trim()
    });

    if (res?.correct) {
      setSubmitFeedback({ ok: true, msg: 'ACCEPTED: Subsystem panel code verified.' });
    } else {
      setSubmitFeedback({ ok: false, msg: res?.message || 'ERROR: Invalid hardware panel code.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-3xl flex flex-col bg-[#0b100c] border-2 border-emerald-700/80 shadow-[0_0_60px_rgba(16,185,129,0.2)] rounded-xl overflow-hidden font-mono">
        
        {/* Hood Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#070b08] border-b border-emerald-900">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
              REEL READER 400 // OPTICAL MICROFILM CONSOLE
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-600">
              ATTEMPTS: <span className={attemptsLeft === 1 ? 'text-red-400 font-bold' : 'text-emerald-400'}>{attemptsLeft}/{clue.attempts_max || 3}</span>
            </span>
            <button
              onClick={onClose}
              className="text-emerald-600 hover:text-emerald-300 border border-emerald-800 hover:border-emerald-500 px-2 py-0.5 rounded transition"
            >
              [ESC] EXIT
            </button>
          </div>
        </div>

        {/* CRT Display Housing */}
        <div className="relative p-8 bg-[#040805] flex flex-col items-center">
          {/* Curved CRT Screen Bezel */}
          <div className="relative w-full max-w-xl h-80 bg-black rounded-2xl border-4 border-[#122216] shadow-[inset_0_0_40px_rgba(16,185,129,0.3)] overflow-hidden flex flex-col">
            
            {/* Scanlines Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-10 opacity-70" />
            
            {/* Screen Header */}
            <div className="px-4 py-1.5 bg-emerald-950/70 border-b border-emerald-800 flex justify-between items-center text-[10px] text-emerald-400 font-bold z-20">
              <span>{frames[currentFrame].title}</span>
              <span className="animate-pulse">ONLINE</span>
            </div>

            {/* Screen Content */}
            <div className="flex-1 flex items-center justify-center p-4 relative z-0">
              {frames[currentFrame].content}
            </div>

            {/* Screen Vignette Overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_0_60px_rgba(0,0,0,0.85)] z-20" />
          </div>

          {/* Lower Control Deck with Brass Rotary Dial */}
          <div className="mt-6 flex items-center justify-between w-full max-w-xl px-4 py-3 bg-[#070e09] border border-emerald-900 rounded-lg">
            <div className="flex items-center gap-4">
              {/* Rotary Dial */}
              <button
                onClick={() => advanceFrame(1)}
                className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#c89e48] via-[#856320] to-[#4a3408] border-2 border-[#ffd68a] shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                style={{ transform: `rotate(${dialRotation}deg)` }}
                title="Click or drag to advance microfilm reel"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-black/80 absolute top-1.5" />
                <div className="w-5 h-5 rounded-full bg-[#3a2806] border border-[#ffd68a]/40" />
              </button>
              <div>
                <div className="text-[11px] font-bold text-emerald-400">ROTARY ADVANCE</div>
                <div className="text-[9px] text-emerald-600">CLICK DIAL TO ADVANCE</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => advanceFrame(-1)}
                className="px-3 py-1.5 bg-[#0e1a11] hover:bg-[#162b1c] border border-emerald-800 text-emerald-400 text-xs rounded transition"
              >
                ◀ PREV
              </button>
              <button
                onClick={() => advanceFrame(1)}
                className="px-3 py-1.5 bg-[#0e1a11] hover:bg-[#162b1c] border border-emerald-800 text-emerald-400 text-xs rounded transition"
              >
                NEXT ▶
              </button>
            </div>
          </div>
        </div>

        {/* Clue Answer Form */}
        <div className="p-4 bg-[#070c08] border-t border-emerald-900">
          {isSolved ? (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded text-center text-xs font-bold text-emerald-300">
              ✓ SUBSYSTEM BUS ADDRESS AUTHENTICATED
            </div>
          ) : attemptsLeft <= 0 ? (
            <div className="p-3 bg-red-950/80 border border-red-500 rounded text-center text-xs font-bold text-red-300">
              CONSOLE LOCKED: ATTEMPTS EXHAUSTED (3/3). PROCEED TO BULKHEAD.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-[10px] text-emerald-600 uppercase mb-1">
                  Terminal Input Register:
                </label>
                <input
                  type="text"
                  placeholder="----"
                  maxLength={10}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="w-full bg-black border border-emerald-800 focus:border-emerald-400 px-3 py-1.5 text-xs text-emerald-300 rounded outline-none tracking-widest font-bold"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !codeInput}
                className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded transition disabled:opacity-40"
              >
                {isSubmitting ? 'VALIDATING...' : 'SUBMIT CODE'}
              </button>
            </form>
          )}

          {submitFeedback && (
            <div className={`mt-2 text-xs font-bold ${submitFeedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {submitFeedback.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

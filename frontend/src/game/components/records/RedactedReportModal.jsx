import React, { useState } from 'react';

export default function RedactedReportModal({
  isOpen,
  onClose,
  clue,
  onSubmitAnswer,
  isSubmitting,
  evidence = []
}) {
  if (!isOpen || !clue) return null;

  const [activeTab, setActiveTab] = useState('copy_a');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [decodedHash, setDecodedHash] = useState(null);

  // Form state
  const [dateInput, setDateInput] = useState('');
  const [wordInput, setWordInput] = useState('');
  const [submitFeedback, setSubmitFeedback] = useState(null);

  const payload = clue.payload || {};
  const copies = payload.copies || [];
  const currentCopy = copies.find((c) => c.id === activeTab) || copies[0] || { paragraphs: [] };

  const attemptsLeft = Math.max(0, (clue.attempts_max || 3) - (clue.attempts || 0));
  const isSolved = Boolean(clue.solved);

  const handleDecodeHash = (hashStr) => {
    try {
      const decoded = atob(hashStr);
      setDecodedHash(decoded);
    } catch {
      setDecodedHash('Unable to decode stream');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isSolved || attemptsLeft <= 0) return;

    const res = await onSubmitAnswer(clue.id, {
      date: dateInput.trim(),
      word: wordInput.trim().toUpperCase()
    });

    if (res?.correct) {
      setSubmitFeedback({ ok: true, msg: 'AUTHENTICATED: Genuine shutdown date & codeword matched.' });
    } else {
      setSubmitFeedback({ ok: false, msg: res?.message || 'MISMATCH: Contradictory archival evidence rejected.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-text">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#14120e] border border-[#c47a00]/70 shadow-[0_0_50px_rgba(196,122,0,0.25)] rounded-lg overflow-hidden font-mono text-[#dcd2be]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#1e1a14] border-b border-[#c47a00]/40">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c47a00] animate-pulse" />
            <h2 className="text-sm font-bold tracking-widest text-[#eec77d] uppercase">
              CASE FILE CF-79A2 // REDACTED INCIDENT REPORT
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#a09075]">
              ATTEMPTS: <span className={attemptsLeft === 1 ? 'text-red-400 font-bold' : 'text-[#eec77d]'}>{attemptsLeft}/{clue.attempts_max || 3}</span>
            </span>
            <button
              onClick={onClose}
              className="text-[#a09075] hover:text-[#ffdd99] text-xs px-2 py-1 border border-[#a09075]/40 hover:border-[#ffdd99] rounded transition"
            >
              [ESC] CLOSE
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-[#171410] border-b border-[#3d3222]">
          {copies.map((copy) => (
            <button
              key={copy.id}
              onClick={() => setActiveTab(copy.id)}
              className={`px-5 py-2 text-xs font-bold tracking-wider rounded-t uppercase transition border-t border-x ${
                activeTab === copy.id
                  ? 'bg-[#2a241b] text-[#ffd68a] border-[#c47a00]/80 shadow-[0_-2px_10px_rgba(196,122,0,0.2)]'
                  : 'bg-[#120f0c] text-[#7a6d59] border-[#2e261b] hover:text-[#c47a00]'
              }`}
            >
              {copy.id === 'copy_a' ? '📁 Copy A (Cabinet A)' : '📁 Copy B (Clerk Desk)'}
            </button>
          ))}

          {/* Forensic Image Filters */}
          <div className="ml-auto flex items-center gap-4 text-xs text-[#8a7b64] py-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span>BRIGHT:</span>
              <input
                type="range"
                min="60"
                max="180"
                value={brightness}
                onChange={(e) => setBrightness(e.target.value)}
                className="w-20 accent-[#c47a00] h-1"
              />
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span>CONTRAST:</span>
              <input
                type="range"
                min="60"
                max="220"
                value={contrast}
                onChange={(e) => setContrast(e.target.value)}
                className="w-20 accent-[#c47a00] h-1"
              />
            </label>
            <button
              onClick={() => setInvert(!invert)}
              className={`px-2 py-0.5 border text-[11px] rounded transition ${
                invert ? 'bg-[#c47a00] text-black border-[#ffd68a]' : 'border-[#6b583c] hover:border-[#c47a00]'
              }`}
            >
              NEG SCAN
            </button>
          </div>
        </div>

        {/* Document Body Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#100e0b]">
          <div
            style={{
              filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(1) hue-rotate(180deg)' : ''}`
            }}
            className="max-w-2xl mx-auto p-8 bg-[#d9cdb4] text-[#1c1813] font-serif shadow-2xl rounded border border-[#8f8269] relative transition-all"
          >
            {/* Stamp */}
            <div className="absolute top-6 right-8 border-2 border-red-800 text-red-800 text-xs px-3 py-1 font-mono font-bold tracking-widest rotate-6 select-none opacity-80">
              DEPT OF RECORDS // EYES ONLY
            </div>

            <div className="text-center font-mono font-bold text-sm tracking-widest text-[#4a3f31] border-b-2 border-[#4a3f31]/40 pb-3 mb-6">
              SUBSTATION DELTA ARCHIVAL TRANSCRIPT — {activeTab.toUpperCase()}
            </div>

            {/* Paragraphs with Redaction Bars */}
            <div className="space-y-4 text-sm leading-relaxed">
              {currentCopy.paragraphs?.map((p, pIdx) => (
                <p key={pIdx}>
                  {p.map((seg, sIdx) => {
                    if (seg.r) {
                      return (
                        <span
                          key={sIdx}
                          className="relative inline-block mx-1 group cursor-text"
                          title="Black marker redaction. Highlight text or examine forensic negative."
                        >
                          <span className="bg-[#11100e] text-[#11100e] px-1 py-0.5 rounded font-mono select-none">
                            ████████
                          </span>
                        </span>
                      );
                    }
                    return <span key={sIdx}>{seg.t}</span>;
                  })}
                </p>
              ))}
            </div>

            {/* Hash Footer */}
            {currentCopy.footer_hash && (
              <div className="mt-8 pt-4 border-t border-[#4a3f31]/30 flex items-center justify-between text-xs font-mono text-[#5a4e3c]">
                <span>ARCHIVAL RECORD CHECKSUM:</span>
                <div className="flex items-center gap-2">
                  <code className="bg-[#b8ab91] px-2 py-0.5 rounded text-[11px] font-bold">
                    {currentCopy.footer_hash}
                  </code>
                  <button
                    onClick={() => handleDecodeHash(currentCopy.footer_hash)}
                    className="text-[11px] underline hover:text-black"
                  >
                    [BASE-64 DECODE]
                  </button>
                </div>
              </div>
            )}

            {decodedHash && (
              <div className="mt-2 p-2 bg-[#2a241b] text-[#ffd68a] font-mono text-xs rounded border border-[#c47a00]/60">
                DECODED HASH METADATA: <b>{decodedHash}</b>
              </div>
            )}
          </div>
        </div>

        {/* Clue Answer Submission Drawer */}
        <div className="p-4 bg-[#18140f] border-t border-[#c47a00]/40">
          {isSolved ? (
            <div className="p-3 bg-[#1b3d22]/80 border border-[#3dff8b]/60 rounded text-center text-sm font-bold text-[#b6ffd1]">
              ✓ CLUE VERIFIED: INCIDENT REPORT RESOLVED
            </div>
          ) : attemptsLeft <= 0 ? (
            <div className="p-3 bg-[#421616]/80 border border-red-500 rounded text-center text-sm font-bold text-red-200">
              TERMINAL LOCKED: MAXIMUM ATTEMPTS EXHAUSTED (3/3). PROCEED TO OTHER FILES.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] text-[#a09075] uppercase mb-1">
                  Genuine Shutdown Date (YYYY-MM-DD):
                </label>
                <input
                  type="text"
                  placeholder="2001-02-10"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full bg-[#0d0b09] border border-[#6b583c] focus:border-[#c47a00] px-3 py-1.5 text-xs text-[#f3ead0] rounded outline-none"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] text-[#a09075] uppercase mb-1">
                  Genuine Codeword:
                </label>
                <input
                  type="text"
                  placeholder="COMET"
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  className="w-full bg-[#0d0b09] border border-[#6b583c] focus:border-[#c47a00] px-3 py-1.5 text-xs text-[#f3ead0] rounded uppercase outline-none"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !dateInput || !wordInput}
                className="mt-5 px-6 py-2 bg-[#c47a00] hover:bg-[#e09820] text-black font-bold text-xs rounded transition disabled:opacity-40"
              >
                {isSubmitting ? 'VALIDATING...' : 'SUBMIT AUTHENTICATION'}
              </button>
            </form>
          )}

          {submitFeedback && (
            <div className={`mt-2 text-xs font-bold ${submitFeedback.ok ? 'text-green-400' : 'text-red-400'}`}>
              {submitFeedback.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

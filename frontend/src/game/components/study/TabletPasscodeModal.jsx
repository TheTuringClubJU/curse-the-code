import React, { useState } from 'react';
import { X, Send, RotateCw, Copy, Check, Tablet, ShieldAlert, CheckCircle2, ArrowLeftRight, Layers, AlertCircle } from 'lucide-react';

export default function TabletPasscodeModal({
  isOpen,
  onClose,
  clue,
  evidence = [],
  onSubmitAnswer,
  isSubmitting = false
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Scraps reordering state on back of tablet
  // 0 = Scrap A (ES03: 01000001 01001100 -> 'AL')
  // 1 = Scrap B (ES08: 01010000 01001000 01000001 -> 'PHA')
  const [scrapOrder, setScrapOrder] = useState([1, 0]); // Starts scrambled (B, A)

  if (!isOpen || !clue) return null;

  const scraps = [
    { id: 0, label: 'Scrap A (Torn Slip)', binary: '01000001 01001100', char: 'AL' },
    { id: 1, label: 'Scrap B (Cable Tag)', binary: '01010000 01001000 01000001', char: 'PHA' },
  ];

  const isAligned = scrapOrder[0] === 0 && scrapOrder[1] === 1;
  const currentBinary = isAligned ? "01000001 01001100 01010000 01001000 01000001" : "[MISALIGNED TAPE - REARRANGE POSITIONS]";

  const handleSwap = () => {
    setScrapOrder(prev => [prev[1], prev[0]]);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(currentBinary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!answer.trim() || isSubmitting) return;

    setFeedback(null);
    const res = await onSubmitAnswer(clue.id, answer.trim());
    if (res) {
      if (res.correct) {
        setFeedback({ type: 'success', message: 'Passcode Accepted! Tablet Unlocked.' });
      } else {
        setFeedback({ type: 'error', message: res.message || 'Passcode rejected. Check binary byte groups.' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-2xl bg-[#09140e] border-2 border-[#1c4a2e] rounded-2xl shadow-[0_0_50px_rgba(61,255,139,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#050f09] border-b border-[#1c4a2e]">
          <div className="flex items-center gap-3">
            <Tablet className="w-5 h-5 text-[#3dff8b]" />
            <div>
              <h2 className="text-base font-bold text-[#b6ffd1] tracking-wider font-mono">
                CRACKED FIELD TABLET • {clue.case_file_id || 'CF-0F69'}
              </h2>
              <p className="text-xs text-[#52996e] font-mono">MODEL XT-880 • FIRMWARE V1.4</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e2619] hover:bg-[#183b27] border border-[#2b6641] text-[#7dffb0] text-xs font-mono transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isFlipped ? 'View Screen' : 'Flip to Back (Scraps Tray)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#52996e] hover:text-[#b6ffd1] hover:bg-[#132c1e] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tablet Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono">
          {!isFlipped ? (
            /* FRONT: Cracked Tablet Screen */
            <div className="relative p-6 rounded-xl bg-[#020804] border border-[#1b3d27] min-h-[300px] flex flex-col justify-between overflow-hidden shadow-inner">
              {/* Cracked Glass SVG Overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 stroke-[#7dffb0]" xmlns="http://www.w3.org/2000/svg">
                <line x1="20" y1="10" x2="180" y2="120" strokeWidth="1.5" />
                <line x1="180" y1="120" x2="310" y2="90" strokeWidth="1" />
                <line x1="180" y1="120" x2="240" y2="280" strokeWidth="1.5" />
                <line x1="310" y1="90" x2="450" y2="190" strokeWidth="1" />
                <line x1="240" y1="280" x2="380" y2="340" strokeWidth="1" />
              </svg>

              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#1b3d27] text-xs text-[#52996e]">
                  <span>BATTERY: 14% [CRITICAL]</span>
                  <span>ENCRYPTION: AES-256</span>
                </div>
                <div className="mt-6 text-center">
                  <div className="text-sm text-[#7dffb0] mb-2">SYSTEM LOCKED</div>
                  <h3 className="text-lg font-bold text-[#b6ffd1]">
                    {clue.stages?.[0]?.prompt || "Enter the tablet passcode (a word)."}
                  </h3>
                  <p className="text-xs text-[#52996e] mt-2">
                    5-letter alphanumeric key required. Flip to the back chassis to reassemble the recovered binary scraps.
                  </p>
                </div>
              </div>

              {/* Status & Solved State */}
              {clue.solved ? (
                <div className="my-4 p-4 rounded-lg bg-[#0e331c] border border-[#3dff8b] text-[#b6ffd1] flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#3dff8b]" />
                  <span className="font-bold tracking-wide">CASE FILE SOLVED & TABLET UNLOCKED</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Enter deduced answer..."
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-3 bg-[#06120a] border border-[#235235] focus:border-[#3dff8b] rounded-lg text-[#b6ffd1] font-mono text-sm tracking-widest uppercase focus:outline-none focus:ring-1 focus:ring-[#3dff8b]"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !answer.trim()}
                      className="px-6 py-3 bg-[#174728] hover:bg-[#206037] disabled:opacity-40 disabled:cursor-not-allowed text-[#b6ffd1] rounded-lg font-bold text-sm tracking-wider flex items-center gap-2 transition border border-[#2b6641]"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-[#b6ffd1] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Submit</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                  {feedback && (
                    <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${feedback.type === 'success' ? 'bg-[#0f381f] text-[#7dffb0] border border-[#2b6641]' : 'bg-[#381111] text-[#ff8a8a] border border-[#662b2b]'}`}>
                      {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      <span>{feedback.message}</span>
                    </div>
                  )}
                </form>
              )}
            </div>
          ) : (
            /* BACK: Interactive Evidence Reassembly Chassis */
            <div className="p-6 rounded-xl bg-[#030a05] border border-[#1b3d27] min-h-[300px] flex flex-col justify-between shadow-inner space-y-4">
              
              {/* Assembly Tray Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1b3d27]">
                <div className="flex items-center gap-2 text-xs text-[#b6ffd1] font-bold">
                  <Layers className="w-4 h-4 text-[#3dff8b]" />
                  <span>STICKY NOTE • DANIEL'S SCRAWL (SCRAPS TRAY)</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                  isAligned 
                    ? 'bg-[#0e331c] text-[#7dffb0] border-[#3dff8b]' 
                    : 'bg-[#291414] text-[#ff9999] border-[#662b2b]'
                }`}>
                  {isAligned ? <Check className="w-3 h-3 text-[#3dff8b]" /> : <AlertCircle className="w-3 h-3 text-[#ff8a8a]" />}
                  {isAligned ? 'Seams Aligned' : 'Misaligned'}
                </span>
              </div>

              {/* Rearrangeable Binary Scrap Slots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#52996e]">
                  <span>Rearrange recovered strips into positions 1 and 2:</span>
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0e2619] hover:bg-[#183b27] border border-[#2b6641] text-[#7dffb0] text-xs transition"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Swap Positions</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {scrapOrder.map((scrapIdx, pos) => {
                    const scrap = scraps[scrapIdx];
                    return (
                      <div
                        key={scrap.id}
                        onClick={handleSwap}
                        className={`p-3 rounded-lg border transition cursor-pointer ${
                          isAligned ? 'bg-[#06180c] border-[#3dff8b]' : 'bg-[#0b140e] border-[#20472e] hover:border-[#3dff8b]/60'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1 text-[10px] text-[#52996e]">
                          <span>POSITION {pos + 1}</span>
                          <span className="text-[#7dffb0]">{scrap.label}</span>
                        </div>
                        <div className="font-mono text-xs text-[#b6ffd1] tracking-wider break-all bg-black/40 p-2 rounded border border-white/5">
                          {scrap.binary}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Combined Assembled Stream */}
              <div className="p-3 bg-[#020804] rounded-lg border border-[#1b3d27] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#52996e]">ASSEMBLED BINARY STREAM:</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0e2619] hover:bg-[#183b27] text-[#7dffb0] text-[10px] transition border border-[#2b6641]"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Binary'}</span>
                  </button>
                </div>
                <div className={`p-2.5 rounded font-mono text-xs tracking-widest break-all ${isAligned ? 'bg-[#0b2414] text-[#3dff8b] border border-[#3dff8b]/50' : 'bg-black/50 text-[#52996e]'}`}>
                  {currentBinary}
                </div>
              </div>

              {/* Context Scrap Note (From Wastebin) */}
              <div className="p-3 bg-[#1c1c0e] rounded-lg border border-[#4d4a1b] text-xs text-[#e8dfa2] leading-relaxed">
                <span className="font-bold text-[#fff9b0] block mb-1">RECOVERED NOTE • CONTEXT RIDDLE:</span>
                "Test passcode: the first Greek letter. Five letters."
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Send, Copy, Check, Mail, ShieldAlert, CheckCircle2, ArrowLeft, ArrowRight, Layers, AlertCircle } from 'lucide-react';

export default function CrtEmailModal({
  isOpen,
  onClose,
  clue,
  evidence = [],
  onSubmitAnswer,
  isSubmitting = false
}) {
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // 3 CRT Dump Tapes reordering state
  // Index 0: Tape A (ES02: 'VGhlIHNpZ25hbCBtdXN0IG5l' -> "The signal must ne")
  // Index 1: Tape B (ES05: 'dmVyIGJlIHNlbnQgZnJvbSBp' -> "ver be sent from i")
  // Index 2: Tape C (ES09: 'bnNpZGUgdGhlIGxhYi4=' -> "nside the lab.")
  const [tapeOrder, setTapeOrder] = useState([1, 2, 0]); // Starts scrambled (Tape B, Tape C, Tape A)

  if (!isOpen || !clue) return null;

  const tapes = [
    { id: 0, label: 'CRT Tape A (Corkboard)', b64: 'VGhlIHNpZ25hbCBtdXN0IG5l', text: 'The signal must ne' },
    { id: 1, label: 'CRT Tape B (Sticky Wall)', b64: 'dmVyIGJlIHNlbnQgZnJvbSBp', text: 'ver be sent from i' },
    { id: 2, label: 'CRT Tape C (Upper Corkboard)', b64: 'bnNpZGUgdGhlIGxhYi4=', text: 'nside the lab.' },
  ];

  const isAligned = tapeOrder[0] === 0 && tapeOrder[1] === 1 && tapeOrder[2] === 2;
  const assembledText = isAligned 
    ? "The signal must never be sent from inside the lab."
    : tapeOrder.map(i => tapes[i].text).join(' ... ');
  const base64Buffer = "U0lHTkFM";

  const moveTape = (fromIndex, dir) => {
    const toIndex = fromIndex + dir;
    if (toIndex < 0 || toIndex >= tapeOrder.length) return;
    setTapeOrder(prev => {
      const next = [...prev];
      const temp = next[fromIndex];
      next[fromIndex] = next[toIndex];
      next[toIndex] = temp;
      return next;
    });
  };

  const handleCopyBase64 = () => {
    if (!isAligned) return;
    navigator.clipboard?.writeText(base64Buffer);
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
        setFeedback({ type: 'success', message: 'Email draft decoded! Case File Solved.' });
      } else {
        setFeedback({ type: 'error', message: res.message || 'Invalid deciphered word. Check base64 padding.' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-2xl bg-[#04120b] border-2 border-[#1c4a2e] rounded-xl shadow-[0_0_60px_rgba(61,255,139,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#020a06] border-b border-[#1c4a2e]">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-[#3dff8b]" />
            <div>
              <h2 className="text-base font-bold text-[#b6ffd1] tracking-wider font-mono">
                CRT MAIL DRAFT • {clue.case_file_id || 'CF-6E2A'}
              </h2>
              <p className="text-xs text-[#52996e] font-mono">VANCE POSTAL DAEMON • DRAFT QUEUE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#52996e] hover:text-[#b6ffd1] hover:bg-[#0c2416] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Monospace Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono space-y-4 text-xs">
          
          {/* Email Headers */}
          <div className="p-4 rounded-lg bg-[#071a0f] border border-[#1b3d27] space-y-1 text-[#7dffb0]">
            <div><span className="text-[#3dff8b] font-bold">FROM:</span> daniel.vance@vance-corp.internal</div>
            <div><span className="text-[#3dff8b] font-bold">TO:</span> external-relays@null.void</div>
            <div><span className="text-[#3dff8b] font-bold">SUBJECT:</span> UNSENT OUTBOUND DRAFT (CLASSIFIED)</div>
          </div>

          {/* Interactive CRT Tape Buffer Assembly Tray */}
          <div className="p-4 rounded-lg bg-[#020804] border border-[#1b3d27] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1b3d27]">
              <div className="flex items-center gap-2 text-xs text-[#b6ffd1] font-bold">
                <Layers className="w-4 h-4 text-[#3dff8b]" />
                <span>CRT TAPE BUFFER RECONSTRUCTION TRAY</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                isAligned 
                  ? 'bg-[#0e331c] text-[#7dffb0] border-[#3dff8b]' 
                  : 'bg-[#291414] text-[#ff9999] border-[#662b2b]'
              }`}>
                {isAligned ? <Check className="w-3 h-3 text-[#3dff8b]" /> : <AlertCircle className="w-3 h-3 text-[#ff8a8a]" />}
                {isAligned ? 'Buffer Contiguous' : 'Buffer Fragmented'}
              </span>
            </div>

            <p className="text-[11px] text-[#52996e]">
              Use the ◀ and ▶ buttons to rearrange the 3 recovered magnetic tapes into the transmission buffer:
            </p>

            {/* 3 Tape Slots */}
            <div className="grid grid-cols-3 gap-2">
              {tapeOrder.map((tapeIdx, slot) => {
                const tape = tapes[tapeIdx];
                return (
                  <div
                    key={tape.id}
                    className={`p-2.5 rounded border flex flex-col justify-between transition ${
                      isAligned ? 'bg-[#06180c] border-[#3dff8b]' : 'bg-[#07160c] border-[#163822]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1 text-[9px] text-[#52996e]">
                        <span>SLOT {slot + 1}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={slot === 0}
                            onClick={() => moveTape(slot, -1)}
                            className="p-0.5 rounded bg-black/40 hover:bg-white/10 disabled:opacity-20 text-[#b6ffd1]"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={slot === tapeOrder.length - 1}
                            onClick={() => moveTape(slot, 1)}
                            className="p-0.5 rounded bg-black/40 hover:bg-white/10 disabled:opacity-20 text-[#b6ffd1]"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] text-[#7dffb0] font-bold mb-1 truncate">{tape.label}</div>
                      <div className="text-[10px] text-[#52996e] italic">"{tape.text}"</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reconstructed Email Draft Body */}
            <div className="mt-3 p-3 rounded bg-black/50 border border-white/5 space-y-2">
              <span className="text-[10px] text-[#52996e] block uppercase">TRANSMISSION BUFFER DECODE:</span>
              <p className={`text-xs italic leading-relaxed ${isAligned ? 'text-[#b6ffd1]' : 'text-gray-500'}`}>
                "{assembledText}"
              </p>
            </div>

            {/* Attachment preview */}
            <div className="flex items-center justify-between p-2.5 rounded bg-[#07160c] border border-[#183b25]">
              <div>
                <span className="text-[#3dff8b] font-bold mr-2">ATTACHMENT:</span>
                <span className={isAligned ? 'text-[#7dffb0] font-bold tracking-widest' : 'text-[#ff9999]'}>
                  {base64Buffer}
                </span>
              </div>
              <button
                onClick={handleCopyBase64}
                disabled={!isAligned}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0f2e1b] hover:bg-[#1a4a2d] disabled:opacity-30 disabled:cursor-not-allowed border border-[#2b6641] text-[#b6ffd1] transition text-[11px]"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Payload'}</span>
              </button>
            </div>
          </div>

          {/* Prompt & Submission */}
          <div className="p-4 rounded-lg bg-[#071a0f] border border-[#1b3d27]">
            <h3 className="text-sm font-bold text-[#b6ffd1] mb-2">
              {clue.stages?.[0]?.prompt || "What must never be sent from inside? (one word)"}
            </h3>

            {clue.solved ? (
              <div className="p-3 rounded-lg bg-[#0e331c] border border-[#3dff8b] text-[#b6ffd1] flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#3dff8b]" />
                <span className="font-bold">CASE FILE SOLVED & RECONSTRUCTED</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter deduced answer..."
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-[#020804] border border-[#235235] focus:border-[#3dff8b] rounded-lg text-[#b6ffd1] font-mono text-sm tracking-wider uppercase focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !answer.trim()}
                    className="px-5 py-2.5 bg-[#174728] hover:bg-[#206037] disabled:opacity-40 text-[#b6ffd1] rounded-lg font-bold text-xs tracking-wider flex items-center gap-2 transition border border-[#2b6641]"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-[#b6ffd1] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Submit</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
                {feedback && (
                  <div className={`p-2.5 rounded text-xs flex items-center gap-2 ${feedback.type === 'success' ? 'bg-[#0f381f] text-[#7dffb0] border border-[#2b6641]' : 'bg-[#381111] text-[#ff8a8a] border border-[#662b2b]'}`}>
                    {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                    <span>{feedback.message}</span>
                  </div>
                )}
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

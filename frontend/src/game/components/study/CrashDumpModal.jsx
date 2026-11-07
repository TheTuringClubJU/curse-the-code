import React, { useState } from 'react';
import { X, Send, Copy, Check, Terminal, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function CrashDumpModal({
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

  if (!isOpen || !clue) return null;

  const hexLines = [
    { offset: "0x00000000", hex: "45 52 52 4F 52 20 30 32 3A 31 35 3A 30 30 20 54", ascii: "ERROR 02:15:00 T", isFault: false },
    { offset: "0x00000010", hex: "45 53 54 20 4B 45 52 4E 45 4C 20 50 41 4E 49 43", ascii: "EST KERNEL PANIC", isFault: false },
    { offset: "0x00000020", hex: "46 41 54 41 4C 20 46 41 55 4C 54 20 30 78 30 34", ascii: "FATAL FAULT 0x04", isFault: true },
    { offset: "0x00000030", hex: "4F 52 42 49 54 2E 53 59 53 20 48 41 4C 54 45 44", ascii: "ORBIT.SYS HALTED", isFault: true },
    { offset: "0x00000040", hex: "30 78 46 46 46 46 46 46 46 46 20 53 54 41 43 4B", ascii: "0xFFFFFFFF STACK", isFault: false },
    { offset: "0x00000050", hex: "44 55 4D 50 20 43 4F 4D 50 4C 45 54 45 2E 2E 2E", ascii: "DUMP COMPLETE...", isFault: false },
  ];

  const fullLog = hexLines.map(l => `${l.offset}  ${l.hex}  |${l.ascii}|`).join('\n');

  const handleCopyLog = () => {
    navigator.clipboard?.writeText(fullLog);
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
        setFeedback({ type: 'success', message: 'Fatal process identified! Case File Solved.' });
      } else {
        setFeedback({ type: 'error', message: res.message || 'Incorrect process name. Check memory offset dump.' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-3xl bg-[#04120b] border-2 border-[#1c4a2e] rounded-xl shadow-[0_0_60px_rgba(61,255,139,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#020a06] border-b border-[#1c4a2e]">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-[#3dff8b]" />
            <div>
              <h2 className="text-base font-bold text-[#b6ffd1] tracking-wider font-mono">
                HEX CRASH DUMP VIEWER • {clue.case_file_id || 'CF-3135'}
              </h2>
              <p className="text-xs text-[#52996e] font-mono">MEMORY EXCERPT • CORE DUMP TRACE</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e2619] hover:bg-[#183b27] border border-[#2b6641] text-[#7dffb0] text-xs font-mono transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Dump'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#52996e] hover:text-[#b6ffd1] hover:bg-[#0c2416] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hex Dump Viewer Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono space-y-4">
          <div className="p-4 rounded-lg bg-[#020804] border border-[#1b3d27] overflow-x-auto">
            <div className="text-[11px] text-[#52996e] mb-2 pb-2 border-b border-[#1b3d27] flex justify-between">
              <span>OFFSET</span>
              <span>HEX BYTES (00 - 0F)</span>
              <span>ASCII TRANSLATION</span>
            </div>
            <div className="space-y-1 text-xs">
              {hexLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between p-1 rounded transition ${
                    line.isFault ? 'bg-[#184a28] text-[#7dffb0] font-bold border border-[#2b6641]' : 'text-[#7dffb0]/80 hover:bg-[#0a2014]'
                  }`}
                >
                  <span className="text-[#3dff8b] mr-4">{line.offset}</span>
                  <span className="tracking-widest mr-4 text-center flex-1">{line.hex}</span>
                  <span className="text-[#b6ffd1]">|{line.ascii}|</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-[#52996e]">
            Fragments Correlated: ES01 (Terminal printout), ES06 (Crash excerpt), ES11 (Printed memo)
          </div>

          {/* Submission Section */}
          <div className="p-4 rounded-lg bg-[#071a0f] border border-[#1b3d27]">
            <h3 className="text-sm font-bold text-[#b6ffd1] mb-2">
              {clue.stages?.[0]?.prompt || "Which process caused the fatal crash in the crash log? (name only)"}
            </h3>

            {clue.solved ? (
              <div className="p-3 rounded-lg bg-[#0e331c] border border-[#3dff8b] text-[#b6ffd1] flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#3dff8b]" />
                <span className="font-bold">CASE FILE SOLVED & CRASH TRACE IDENTIFIED</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter deduced process name (e.g. ORBIT)..."
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

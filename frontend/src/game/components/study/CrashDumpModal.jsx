import React, { useState } from 'react';
import { X, Send, Copy, Check, Terminal, ShieldAlert, CheckCircle2, ArrowLeft, ArrowRight, Layers, AlertCircle } from 'lucide-react';

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

  // 3 Memory Dump Blocks reordering state
  // Index 0: Block A (ES01: Terminal printout -> "ERROR 02:15:00 KERNEL PANIC")
  // Index 1: Block B (ES06: Armchair crash excerpt -> "FATAL FAULT 0x04 THREAD 4")
  // Index 2: Block C (ES11: Floor lamp memo -> "ORBIT.SYS HALTED 0xFFFFFFFF")
  const [blockOrder, setBlockOrder] = useState([2, 0, 1]); // Starts scrambled (C, A, B)

  if (!isOpen || !clue) return null;

  const blocks = [
    {
      id: 0,
      label: 'Memory Segment A (Bookshelf)',
      offset: '0x00000000',
      hex: '45 52 52 4F 52 20 30 32 3A 31 35 3A 30 30 20 54',
      ascii: 'ERROR 02:15:00 T',
      isFault: false,
    },
    {
      id: 1,
      label: 'Memory Segment B (Armchair)',
      offset: '0x00000020',
      hex: '46 41 54 41 4C 20 46 41 55 4C 54 20 30 78 30 34',
      ascii: 'FATAL FAULT 0x04',
      isFault: true,
    },
    {
      id: 2,
      label: 'Memory Segment C (Floor Lamp)',
      offset: '0x00000030',
      hex: '4F 52 42 49 54 2E 53 59 53 20 48 41 4C 54 45 44',
      ascii: 'ORBIT.SYS HALTED',
      isFault: true,
    },
  ];

  const isAligned = blockOrder[0] === 0 && blockOrder[1] === 1 && blockOrder[2] === 2;

  const moveBlock = (fromIndex, dir) => {
    const toIndex = fromIndex + dir;
    if (toIndex < 0 || toIndex >= blockOrder.length) return;
    setBlockOrder(prev => {
      const next = [...prev];
      const temp = next[fromIndex];
      next[fromIndex] = next[toIndex];
      next[toIndex] = temp;
      return next;
    });
  };

  const handleCopyLog = () => {
    const dumpLines = blockOrder.map((idx, pos) => {
      const b = blocks[idx];
      return `0x000000${(pos + 1) * 10}  ${b.hex}  |${b.ascii}|`;
    }).join('\n');
    navigator.clipboard?.writeText(dumpLines);
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
          
          {/* Interactive Memory Block Assembly Tray */}
          <div className="p-4 rounded-lg bg-[#020804] border border-[#1b3d27] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1b3d27]">
              <div className="flex items-center gap-2 text-xs text-[#b6ffd1] font-bold">
                <Layers className="w-4 h-4 text-[#3dff8b]" />
                <span>HEX MEMORY OFFSET ALIGNMENT TRAY</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                isAligned 
                  ? 'bg-[#0e331c] text-[#7dffb0] border-[#3dff8b]' 
                  : 'bg-[#291414] text-[#ff9999] border-[#662b2b]'
              }`}>
                {isAligned ? <Check className="w-3 h-3 text-[#3dff8b]" /> : <AlertCircle className="w-3 h-3 text-[#ff8a8a]" />}
                {isAligned ? 'Trace Contiguous' : 'Trace Discontinuous'}
              </span>
            </div>

            <p className="text-[11px] text-[#52996e]">
              Shift memory segments into chronological offset order using ◀ and ▶ buttons:
            </p>

            <div className="space-y-1.5">
              {blockOrder.map((blockIdx, slot) => {
                const b = blocks[blockIdx];
                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between p-2 rounded border transition text-xs ${
                      isAligned && b.isFault 
                        ? 'bg-[#184a28] border-[#3dff8b] text-[#b6ffd1]' 
                        : 'bg-[#07160c] border-[#163822] text-[#7dffb0]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-[#52996e]">
                        {b.offset}
                      </span>
                      <span className="text-[#3dff8b] font-bold">{b.label}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="tracking-widest hidden sm:inline text-[11px]">{b.hex}</span>
                      <span className="font-bold text-[#b6ffd1]">|{b.ascii}|</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={slot === 0}
                          onClick={() => moveBlock(slot, -1)}
                          className="p-1 rounded bg-black/40 hover:bg-white/10 disabled:opacity-20 text-[#b6ffd1]"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={slot === blockOrder.length - 1}
                          onClick={() => moveBlock(slot, 1)}
                          className="p-1 rounded bg-black/40 hover:bg-white/10 disabled:opacity-20 text-[#b6ffd1]"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
                    placeholder="Enter deduced process name..."
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

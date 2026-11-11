import React, { useState } from 'react';
import { X, Send, Search, Printer, ShieldAlert, CheckCircle2, ArrowLeft, ArrowRight, Layers, AlertCircle, Check } from 'lucide-react';

export default function LinePrinterModal({
  isOpen,
  onClose,
  clue,
  evidence = [],
  onSubmitAnswer,
  isSubmitting = false
}) {
  const [answer, setAnswer] = useState('');
  const [filterText, setFilterText] = useState('');
  const [feedback, setFeedback] = useState(null);

  // 3 Fanfold Continuous Sheets reordering state
  // Index 0: Page 1 (ES04: Logins directory -> SRC-TEST9 assigned token TK-07)
  // Index 1: Page 2 (ES07: Token timestamp ledger -> TK-07 issued 2031-07-04 23:47:09)
  // Index 2: Page 3 (ES10: Facility policy -> HOUSE SEALED 2001-07-04 23:59:59)
  const [pageOrder, setPageOrder] = useState([2, 0, 1]); // Starts scrambled (Policy, Logins, Tokens)

  if (!isOpen || !clue) return null;

  const pages = [
    {
      id: 0,
      label: 'Fanfold Leaf 1 (Filing Cabinet)',
      title: 'LOGINS DISPATCH',
      lines: [
        '2001-09-12 04:12:00 [SRC-TEST1] AUTH_PASS USER=analyst01 STATUS=OK',
        '2001-09-12 04:18:22 [SRC-TEST2] AUTH_PASS USER=guard_station_e STATUS=OK',
        '2001-09-12 04:25:10 [SRC-TEST3] AUTH_PASS USER=sys_maintenance STATUS=OK',
        '2001-09-12 04:99:99 [SRC-TEST9] ERR_IMPOSSIBLE_TIME ANOMALOUS_TIMESTAMP',
      ],
      isAnomaly: true,
    },
    {
      id: 1,
      label: 'Fanfold Leaf 2 (Reel Recorder)',
      title: 'TOKEN TIMESTAMP LEDGER',
      lines: [
        'TK-01 issued 2001-07-04 16:12:44 [SRC-TEST1]',
        'TK-02 issued 2001-07-04 17:03:10 [SRC-TEST2]',
        'TK-03 issued 2001-07-04 18:40:27 [SRC-TEST3]',
        'TK-07 issued 2031-07-04 23:47:09 [SRC-TEST7 - POST-SEAL]',
      ],
      isAnomaly: false,
    },
    {
      id: 2,
      label: 'Fanfold Leaf 3 (Archive Drawer 4)',
      title: 'SECURITY DIRECTIVE',
      lines: [
        'SECURITY POLICY: ALL TOKENS EXPIRE UPON FACILITY LOCKDOWN',
        'HOUSE SEALED: 2001-07-04 23:59:59',
        'CRITICAL: ANY TOKEN ISSUED AFTER SEALING YEAR 2001 IS IMPOSSIBLE & FORGED',
      ],
      isAnomaly: false,
    },
  ];

  const isAligned = pageOrder[0] === 0 && pageOrder[1] === 1 && pageOrder[2] === 2;

  const movePage = (fromIndex, dir) => {
    const toIndex = fromIndex + dir;
    if (toIndex < 0 || toIndex >= pageOrder.length) return;
    setPageOrder(prev => {
      const next = [...prev];
      const temp = next[fromIndex];
      next[fromIndex] = next[toIndex];
      next[toIndex] = temp;
      return next;
    });
  };

  // Compile all visible lines based on current leaf order
  const allLines = pageOrder.flatMap((pageIdx) => pages[pageIdx].lines);
  const filteredLines = allLines.filter(l => 
    l.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!answer.trim() || isSubmitting) return;

    setFeedback(null);
    const res = await onSubmitAnswer(clue.id, answer.trim());
    if (res) {
      if (res.correct) {
        setFeedback({ type: 'success', message: 'Anomalous source ID detected! Case File Solved.' });
      } else {
        setFeedback({ type: 'error', message: res.message || 'Incorrect source ID. Verify timestamp timezone and log entries.' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-3xl bg-[#04120b] border-2 border-[#1c4a2e] rounded-xl shadow-[0_0_60px_rgba(61,255,139,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#020a06] border-b border-[#1c4a2e]">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-[#3dff8b]" />
            <div>
              <h2 className="text-base font-bold text-[#b6ffd1] tracking-wider font-mono">
                CONTINUOUS PRINTOUT VIEWER • {clue.case_file_id || 'CF-E0D1'}
              </h2>
              <p className="text-xs text-[#52996e] font-mono">DOT-MATRIX FAN-FOLD LOG DISPATCH</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#52996e] hover:text-[#b6ffd1] hover:bg-[#0c2416] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printout Viewer Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono space-y-4">
          
          {/* Interactive Fanfold Sheet Sequence Tray */}
          <div className="p-4 rounded-lg bg-[#020804] border border-[#1b3d27] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1b3d27]">
              <div className="flex items-center gap-2 text-xs text-[#b6ffd1] font-bold">
                <Layers className="w-4 h-4 text-[#3dff8b]" />
                <span>FANFOLD SHEET SEQUENCE TRAY</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                isAligned 
                  ? 'bg-[#0e331c] text-[#7dffb0] border-[#3dff8b]' 
                  : 'bg-[#291414] text-[#ff9999] border-[#662b2b]'
              }`}>
                {isAligned ? <Check className="w-3 h-3 text-[#3dff8b]" /> : <AlertCircle className="w-3 h-3 text-[#ff8a8a]" />}
                {isAligned ? 'Seams Aligned' : 'Chronology Broken'}
              </span>
            </div>

            <p className="text-[11px] text-[#52996e]">
              Reorder the 3 continuous fanfold leaves into logical sequence using ◀ and ▶ buttons:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {pageOrder.map((pageIdx, slot) => {
                const p = pages[pageIdx];
                return (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded border flex flex-col justify-between transition ${
                      isAligned ? 'bg-[#06180c] border-[#3dff8b]' : 'bg-[#07160c] border-[#163822]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1 text-[9px] text-[#52996e]">
                        <span>LEAF {slot + 1}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={slot === 0}
                            onClick={() => movePage(slot, -1)}
                            className="p-0.5 rounded bg-black/40 hover:bg-white/10 disabled:opacity-20 text-[#b6ffd1]"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={slot === pageOrder.length - 1}
                            onClick={() => movePage(slot, 1)}
                            className="p-0.5 rounded bg-black/40 hover:bg-white/10 disabled:opacity-20 text-[#b6ffd1]"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] text-[#7dffb0] font-bold mb-1 truncate">{p.title}</div>
                      <div className="text-[9px] text-[#52996e] truncate">{p.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search Filter Box */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#020804] border border-[#235235] rounded-lg">
            <Search className="w-4 h-4 text-[#52996e]" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter access log lines..."
              className="flex-1 bg-transparent text-[#b6ffd1] font-mono text-xs focus:outline-none placeholder-[#3d7a52]"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="text-xs text-[#52996e] hover:text-[#b6ffd1]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Continuous Paper Simulation */}
          <div className="p-4 rounded-lg bg-[#030d07] border-y-2 border-dashed border-[#1c4a2e] space-y-2">
            <div className="text-[10px] text-[#428059] uppercase tracking-widest pb-1 border-b border-[#122e1c]">
              --- LOG DISPATCH FEED (TOTAL LINES: {filteredLines.length}) ---
            </div>
            <div className="space-y-1.5 text-xs">
              {filteredLines.length > 0 ? (
                filteredLines.map((line, idx) => {
                  const isAnomaly = line.includes('ERR_IMPOSSIBLE_TIME') || line.includes('SRC-TEST9');
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded border transition ${
                        isAnomaly && isAligned
                          ? 'bg-[#184a28] border-[#3dff8b] text-[#b6ffd1] font-bold'
                          : 'bg-[#07160c] border-[#163822] text-[#7dffb0]'
                      }`}
                    >
                      {line}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-[#52996e] text-xs">
                  No matching log lines for filter: "{filterText}"
                </div>
              )}
            </div>
          </div>

          {/* Submission Section */}
          <div className="p-4 rounded-lg bg-[#071a0f] border border-[#1b3d27]">
            <h3 className="text-sm font-bold text-[#b6ffd1] mb-2">
              {clue.stages?.[0]?.prompt || "Which source ID logged in at an impossible time?"}
            </h3>

            {clue.solved ? (
              <div className="p-3 rounded-lg bg-[#0e331c] border border-[#3dff8b] text-[#b6ffd1] flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#3dff8b]" />
                <span className="font-bold">CASE FILE SOLVED & ANOMALY VERIFIED</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter deduced source ID..."
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

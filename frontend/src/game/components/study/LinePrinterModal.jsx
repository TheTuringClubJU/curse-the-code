import React, { useState } from 'react';
import { X, Send, Search, Printer, ShieldAlert, CheckCircle2 } from 'lucide-react';

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

  if (!isOpen || !clue) return null;

  const logLines = [
    { id: 1, text: "2001-09-12 04:12:00 [SRC-TEST1] AUTH_PASS USER=analyst01 STATUS=OK", isAnomaly: false },
    { id: 2, text: "2001-09-12 04:14:30 [SRC-TEST1] QUERY_DB TARGET=SUBJECT_RECORDS", isAnomaly: false },
    { id: 3, text: "2001-09-12 04:18:22 [SRC-TEST2] AUTH_PASS USER=guard_station_e STATUS=OK", isAnomaly: false },
    { id: 4, text: "2001-09-12 04:25:10 [SRC-TEST3] AUTH_PASS USER=sys_maintenance STATUS=OK", isAnomaly: false },
    { id: 5, text: "2001-09-12 04:99:99 [SRC-TEST9] ERR_IMPOSSIBLE_TIME ANOMALOUS_TIMESTAMP", isAnomaly: true },
    { id: 6, text: "2001-09-12 04:31:45 [SRC-TEST4] AUTH_PASS USER=dr_vance STATUS=OK", isAnomaly: false },
    { id: 7, text: "2001-09-12 04:35:00 [SRC-TEST5] PRINT_REPORT FANFOLD_BATCH_08", isAnomaly: false },
  ];

  const filteredLines = logLines.filter(l => 
    l.text.toLowerCase().includes(filterText.toLowerCase())
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
          
          {/* Search Filter Box */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#020804] border border-[#235235] rounded-lg">
            <Search className="w-4 h-4 text-[#52996e]" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter access log lines (e.g. SRC, ERR, TIME)..."
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
                filteredLines.map((line) => (
                  <div
                    key={line.id}
                    className={`p-2 rounded border transition ${
                      line.isAnomaly
                        ? 'bg-[#184a28] border-[#3dff8b] text-[#b6ffd1] font-bold'
                        : 'bg-[#07160c] border-[#163822] text-[#7dffb0]'
                    }`}
                  >
                    {line.text}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-[#52996e] text-xs">
                  No matching log lines for filter: "{filterText}"
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-[#52996e]">
            Fragments Correlated: ES04 [Page 1], ES07 [Page 2], ES10 [Page 3 - Anomaly]
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
                    placeholder="Enter deduced source ID (e.g. SRC-TEST9)..."
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

import React, { useState } from 'react';
import { X, Send, Copy, Check, Mail, Terminal, ShieldAlert, CheckCircle2 } from 'lucide-react';

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

  if (!isOpen || !clue) return null;

  const base64Buffer = "U0lHTkFM"; // Base64 encoding of 'SIGNAL'
  const binaryBuffer = "01010011 01001001 01000111 01001110 01000001 01001100";

  const handleCopyBase64 = () => {
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

        {/* Email Client Monospace Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono space-y-4 text-xs">
          
          {/* Email Headers */}
          <div className="p-4 rounded-lg bg-[#071a0f] border border-[#1b3d27] space-y-1.5 text-[#7dffb0]">
            <div><span className="text-[#3dff8b] font-bold">FROM:</span> daniel.vance@vance-corp.internal</div>
            <div><span className="text-[#3dff8b] font-bold">TO:</span> external-relays@null.void</div>
            <div><span className="text-[#3dff8b] font-bold">SUBJECT:</span> UNSENT OUTBOUND DRAFT (CLASSIFIED)</div>
            <div className="flex items-center justify-between pt-2 border-t border-[#1b3d27]">
              <span><span className="text-[#3dff8b] font-bold">ATTACHMENT:</span> outbound_payload.b64</span>
              <button
                onClick={handleCopyBase64}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0f2e1b] hover:bg-[#1a4a2d] border border-[#2b6641] text-[#b6ffd1] transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Buffer Copied' : 'Copy Base64'}</span>
              </button>
            </div>
          </div>

          {/* Email Draft Content */}
          <div className="p-4 rounded-lg bg-[#020804] border border-[#1b3d27] text-[#b6ffd1] leading-relaxed space-y-2">
            <p className="text-[#52996e] italic">
              "If this draft transmits through the firewall, the containment protocol will engage. 
              The payload must never leak outside. Decode the unsent attachment string below:"
            </p>
            <div className="p-3 bg-[#07160c] rounded border border-[#183b25] text-sm text-[#7dffb0] font-bold tracking-widest">
              {base64Buffer}
            </div>
            <p className="text-[11px] text-[#428059]">
              Tape Fragments Combined: ES02 [01010011 01001001], ES05 [01000111 01001110], ES09 [01000001 01001100]
            </p>
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
                    placeholder="Enter deduced answer (e.g. SIGNAL)..."
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

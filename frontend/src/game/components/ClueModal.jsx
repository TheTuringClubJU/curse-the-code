import React, { useState } from 'react';
import { X, Send, AlertCircle, CheckCircle, Sparkles, Sliders } from 'lucide-react';

export default function ClueModal({
  isOpen,
  onClose,
  clue,
  onSubmitAnswer,
  isSubmitting = false
}) {
  const [answerInput, setAnswerInput] = useState('');
  const [contrastVal, setContrastVal] = useState(100);
  const [brightnessVal, setBrightnessVal] = useState(100);
  const [invertVal, setInvertVal] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState(null);

  if (!isOpen || !clue) return null;

  const stage = clue.stages?.[0] || {};
  const isImageContrast = clue.solution_method === 'image_contrast';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answerInput.trim() || isSubmitting) return;

    setSubmissionFeedback(null);
    const res = await onSubmitAnswer(clue.id, answerInput.trim());
    if (res) {
      setSubmissionFeedback(res);
      if (res.correct) {
        setAnswerInput('');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-2xl bg-[#0e0a1a] border border-[#433066] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#171029] border-b border-[#433066]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8f7bff]/20 text-[#cdbfff] border border-[#8f7bff]/30">
                {clue.id}
              </span>
              <h2 className="text-base font-bold text-[#e8e0ff] font-serif">
                {clue.title}
              </h2>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Attempts: {clue.attempts} / {clue.attempts_max}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scene Text / Story Prompt */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
          {clue.scene_text && (
            <p className="text-sm text-[#d5cbf0] font-serif italic border-l-2 border-[#8f7bff] pl-3 py-1 bg-black/20">
              "{clue.scene_text}"
            </p>
          )}

          {/* Visual puzzle controls if image_contrast */}
          {isImageContrast && (
            <div className="bg-[#140e24] p-4 rounded-lg border border-[#3b2a59] space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-[#cdbfff]">
                <Sliders className="w-4 h-4 text-[#8f7bff]" />
                <span>EXPOSURE & ENHANCEMENT CONTROLS</span>
              </div>

              {/* Inspection Preview Area */}
              <div
                className="w-full h-44 rounded bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden transition-all duration-150"
                style={{
                  filter: `contrast(${contrastVal}%) brightness(${brightnessVal}%) ${invertVal ? 'invert(100%)' : ''}`
                }}
              >
                <div className="text-center font-mono text-xs text-gray-700 select-all p-4">
                  {clue.object_id === 'poster' ? (
                    <div className="space-y-1">
                      <p className="text-gray-800 text-sm tracking-widest font-bold">CARNIVAL OF SHADOWS</p>
                      <p className="text-[#131118]">TEST DATE 07/04/2001</p>
                      <p className="text-[10px] text-gray-900">THE GATES SHALL BOLT AT SUNDOWN</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-gray-800 text-sm tracking-widest font-bold">VANCE FAMILY ESTATE</p>
                      <p className="text-[#15121c] tracking-widest font-black text-sm">REVERSE CANVAS: SHADOW</p>
                      <p className="text-[10px] text-gray-900">CHARCOAL ETCHING BENEATH THE PIGMENT</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono text-gray-300">
                <div>
                  <label className="flex justify-between mb-1">
                    <span>Contrast</span>
                    <span className="text-[#8f7bff]">{contrastVal}%</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="400"
                    value={contrastVal}
                    onChange={(e) => setContrastVal(Number(e.target.value))}
                    className="w-full accent-[#8f7bff]"
                  />
                </div>
                <div>
                  <label className="flex justify-between mb-1">
                    <span>Brightness</span>
                    <span className="text-[#8f7bff]">{brightnessVal}%</span>
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    value={brightnessVal}
                    onChange={(e) => setBrightnessVal(Number(e.target.value))}
                    className="w-full accent-[#8f7bff]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setInvertVal(!invertVal)}
                  className={`px-3 py-1 rounded text-xs font-mono border transition ${
                    invertVal
                      ? 'bg-[#8f7bff] text-black border-[#8f7bff]'
                      : 'bg-black/40 text-gray-300 border-white/20 hover:border-white/40'
                  }`}
                >
                  {invertVal ? 'Invert Active' : 'Toggle Invert'}
                </button>
              </div>
            </div>
          )}

          {/* Clue Prompt */}
          <div className="bg-[#140e24] p-4 rounded-lg border border-[#3b2a59]">
            <p className="text-xs font-mono text-gray-400 mb-1">PROMPT:</p>
            <p className="text-sm font-semibold text-[#e8e0ff] font-mono">
              {stage.prompt || "Enter the deduced solution:"}
            </p>
          </div>

          {/* Feedback Display */}
          {submissionFeedback && (
            <div className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
              submissionFeedback.correct
                ? 'bg-[#18261e] text-[#86efac] border-[#22543d]'
                : 'bg-[#291418] text-[#fca5a5] border-[#7f1d1d]'
            }`}>
              {submissionFeedback.correct ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-[#86efac]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-[#fca5a5]" />
              )}
              <span>{submissionFeedback.message}</span>
            </div>
          )}

          {/* Answer Form */}
          {clue.solved ? (
            <div className="p-4 rounded-lg bg-[#14261b] border border-[#235339] text-center">
              <span className="text-sm font-bold text-[#86efac] font-mono tracking-wider">
                ✓ CASE FILE SOLVED & RECONSTRUCTED
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Enter deduced answer..."
                  disabled={isSubmitting || (clue.attempts_max && clue.attempts >= clue.attempts_max)}
                  className="flex-1 bg-black/50 border border-[#523d78] focus:border-[#8f7bff] rounded-lg px-4 py-2.5 text-sm text-[#e8e0ff] font-mono outline-none transition"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !answerInput.trim() || (clue.attempts_max && clue.attempts >= clue.attempts_max)}
                  className="px-5 py-2.5 rounded-lg bg-[#8f7bff] text-black font-bold font-mono text-xs flex items-center gap-1.5 hover:bg-[#a696ff] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#171029] border-t border-[#433066] flex justify-between items-center text-xs font-mono text-gray-400">
          <span>{clue.object_id} investigation terminal</span>
          <button
            onClick={onClose}
            className="px-4 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

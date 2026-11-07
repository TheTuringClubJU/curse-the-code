import React, { useState } from 'react';
import { X, Radio, Volume2 } from 'lucide-react';

export default function IntercomQrModal({ isOpen, onClose, clue, onSubmitAnswer, isSubmitting }) {
  const [answer, setAnswer] = useState(''); const [feedback, setFeedback] = useState(null);
  if (!isOpen) return null;
  const exhausted = !clue?.solved && (clue?.attempts || 0) >= (clue?.attempts_max || 3);
  const stage = clue?.stages?.[0];
  const field = stage?.fields?.[0];
  const playTone = () => { const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return; const ctx = new Ctx(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.frequency.value = 920; gain.gain.value = 0.08; osc.connect(gain); gain.connect(ctx.destination); osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 260); };
  const submit = async (e) => { e?.preventDefault?.(); if (isSubmitting || exhausted || clue?.solved) return; const r = await onSubmitAnswer?.(clue.id, answer); setFeedback(r?.correct ? (r?.message || null) : (r?.message || 'Submission failed')); };
  return <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
    <div className="w-full max-w-lg rounded-2xl border border-red-500/40 bg-[#120d0f] shadow-[0_0_40px_rgba(255,70,70,.18)] p-6 text-[#ffd6d6]">
      <div className="flex justify-between items-center mb-5"><h2 className="flex items-center gap-2 font-bold"><Radio className="text-red-400"/> WALL INTERCOM</h2><button aria-label="Close" onClick={onClose}><X/></button></div>
      <button onClick={playTone} className="mb-4 flex items-center gap-2 border border-red-400/30 px-3 py-2 rounded"><Volume2 size={16}/> Play identification tone</button>
      <p className="text-sm mb-3">{stage?.prompt || clue?.scene_text || ''}</p>
      <input aria-label={field?.label || 'Authorization passcode'} value={answer} onChange={e=>setAnswer(e.target.value.toUpperCase())} disabled={isSubmitting || exhausted || clue?.solved} className="w-full bg-black border border-red-500/30 rounded px-4 py-3 tracking-[.25em]" placeholder={field?.placeholder || ''} />
      {feedback && <p className="text-sm mt-3 text-red-200">{feedback}</p>}
      <button disabled={isSubmitting} onClick={submit} className="mt-4 w-full bg-red-700 hover:bg-red-600 py-3 rounded font-bold">AUTHENTICATE</button>
    </div>
  </div>;
}

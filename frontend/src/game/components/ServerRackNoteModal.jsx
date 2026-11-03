import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';

export default function ServerRackNoteModal({ isOpen, onClose, clue, onSubmitAnswer, isSubmitting }) {
  const [answer, setAnswer] = useState(''); const [feedback, setFeedback] = useState(null);
  if (!isOpen) return null;
  const submit = async () => { const r = await onSubmitAnswer?.(clue.id, answer); setFeedback(r?.message || null); };
  return <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
    <div className="w-full max-w-xl rounded-xl border border-red-500/40 bg-[#15171a] p-6 text-[#ffd6d6]">
      <div className="flex justify-between mb-5"><h2 className="flex items-center gap-2"><FileText className="text-red-400"/> SERVER RACK / MARGIN NOTE</h2><button aria-label="Close" onClick={onClose}><X/></button></div>
      <div className="bg-[#d6cda9] text-black p-5 rotate-[-1deg] shadow-xl font-mono mb-5">
        <p>KYFV MVV HZ</p><p className="mt-2 border-t border-black/20 pt-2">Margin: repeated key moves every letter.</p>
      </div>
      <label className="text-sm">What does the note say to do with the flag?</label>
      <input aria-label="Rack note answer" value={answer} onChange={e=>setAnswer(e.target.value.toUpperCase())} className="mt-2 w-full bg-black border border-red-500/30 rounded px-4 py-3" placeholder="ONE WORD" />
      {feedback && <p className="mt-3 text-sm text-red-200">{feedback}</p>}
      <button disabled={isSubmitting} onClick={submit} className="mt-4 w-full bg-red-700 hover:bg-red-600 py-3 rounded font-bold">SUBMIT DECRYPTION</button>
    </div>
  </div>;
}

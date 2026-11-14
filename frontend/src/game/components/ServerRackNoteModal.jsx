import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';

export default function ServerRackNoteModal({ isOpen, onClose, clue, onSubmitAnswer, isSubmitting }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  if (!isOpen) return null;
  const exhausted = !clue?.solved && (clue?.attempts || 0) >= (clue?.attempts_max || 3);
  const stage = clue?.stages?.[0];
  const field = stage?.fields?.[0];
  const submit = async () => {
    if (isSubmitting || exhausted || clue?.solved) return;
    const result = await onSubmitAnswer?.(clue.id, answer);
    setFeedback(result?.message || null);
  };
  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-xl border border-red-500/40 bg-[#15171a] p-6 text-[#ffd6d6]">
        <div className="flex justify-between mb-5">
          <h2 className="flex items-center gap-2"><FileText className="text-red-400" /> SERVER RACK / MARGIN NOTE</h2>
          <button aria-label="Close" onClick={onClose}><X /></button>
        </div>
        <p className="mb-5 text-sm">{clue?.scene_text || ''}</p>
        <label className="text-sm">{stage?.prompt || ''}</label>
        <input
          aria-label={field?.label || 'Rack note answer'}
          value={answer}
          onChange={(event) => setAnswer(event.target.value.toUpperCase())}
          disabled={isSubmitting || exhausted || clue?.solved}
          className="mt-2 w-full bg-black border border-red-500/30 rounded px-4 py-3"
          placeholder={field?.placeholder || ''}
        />
        {feedback && <p className="mt-3 text-sm text-red-200">{feedback}</p>}
        {exhausted && <p className="mt-3 text-sm text-red-200">Maximum attempts exhausted for this clue.</p>}
        <button disabled={isSubmitting || exhausted || clue?.solved} onClick={submit} className="mt-4 w-full bg-red-700 hover:bg-red-600 py-3 rounded font-bold disabled:opacity-50">
          SUBMIT DECRYPTION
        </button>
      </div>
    </div>
  );
}

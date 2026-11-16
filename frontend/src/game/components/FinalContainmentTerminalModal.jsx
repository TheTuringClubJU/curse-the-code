import React, { useEffect, useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';

export default function FinalContainmentTerminalModal({ isOpen, onClose, clue, onSubmitAnswer, isSubmitting }) {
  const stages = clue?.stages || [];
  const payload = clue?.payload || {};
  const initialPieces = payload.piece_ids?.length ? [...payload.piece_ids] : [];
  const options = payload.options || [];
  const [stage, setStage] = useState(clue?.current_stage || 1);
  const [words, setWords] = useState(['', '', '']);
  const [pieces, setPieces] = useState(initialPieces);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [protocol, setProtocol] = useState(options[0]?.id || '');
  const [pin, setPin] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStage(clue?.current_stage || 1);
      setPieces(initialPieces);
      setSelectedIndex(null);
      setFeedback(null);
    }
  }, [isOpen, clue?.id, clue?.current_stage]);

  if (!isOpen) return null;
  const exhausted = !clue?.solved && (clue?.attempts || 0) >= (clue?.attempts_max || 3);
  const readOnly = isSubmitting || exhausted || clue?.solved;
  const stageDef = stages.find((item) => item.index === stage) || stages[stage - 1];

  const swap = (from, to) => {
    if (readOnly || from == null || to == null || from === to) return;
    const next = [...pieces];
    [next[from], next[to]] = [next[to], next[from]];
    setPieces(next);
    setSelectedIndex(null);
  };

  const submit = async () => {
    if (readOnly) return;
    let answer;
    if (stage === 1) {
      answer = { stage: 1, k1: words[0], k2: words[1], k3: words[2] };
    } else if (stage === 2) {
      answer = { stage: 2, pieces: [...pieces] };
    } else {
      answer = { stage: 3, choice: protocol, code: pin };
    }
    const result = await onSubmitAnswer?.(clue.id, answer);
    if (result?.exhausted) setFeedback('Maximum attempts exhausted for this clue.');
    else if (result?.correct) {
      setFeedback(null);
      if (stage < 3) setStage((current) => current + 1);
      else if (result?.room_completed) onClose();
    } else {
      setFeedback(result?.message || 'Submission rejected.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl border border-red-500/50 bg-[#0d1012] p-6 text-[#ffd6d6]">
        <div className="flex justify-between items-center mb-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldAlert className="text-red-400" /> CONTAINMENT TERMINAL / PHASE {stage}/3</h2>
          <button aria-label="Close" onClick={onClose}><X /></button>
        </div>
        {stageDef?.prompt && <p className="mb-3">{stageDef.prompt}</p>}
        {stage === 1 && (
          <div className="grid sm:grid-cols-3 gap-3">
            {words.map((value, index) => (
              <input
                key={index}
                aria-label={(stageDef?.fields?.[index]?.label) || `Master keyword ${index + 1}`}
                value={value}
                disabled={readOnly}
                onChange={(event) => setWords((current) => current.map((word, wordIndex) => wordIndex === index ? event.target.value.toUpperCase() : word))}
                className="bg-black border border-red-500/30 rounded px-3 py-3"
              />
            ))}
          </div>
        )}
        {stage === 2 && (
          <div>
            <div className="grid grid-cols-5 gap-2" aria-label="Photo piece board">
              {pieces.map((piece, index) => (
                <div
                  key={piece}
                  draggable={!readOnly}
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); swap(Number(event.dataTransfer.getData('text/plain')), index); }}
                  onClick={() => selectedIndex == null ? setSelectedIndex(index) : swap(selectedIndex, index)}
                  className={`border rounded p-2 text-center cursor-pointer ${selectedIndex === index ? 'border-red-300 bg-red-950' : 'border-red-500/30'}`}
                >
                  <b>{piece}</b>
                </div>
              ))}
            </div>
            <button type="button" disabled={readOnly} onClick={() => { setPieces([...initialPieces]); setSelectedIndex(null); }} className="mt-3 border border-red-500/40 rounded px-4 py-2">Reset</button>
          </div>
        )}
        {stage === 3 && (
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {options.map((option) => (
                <button key={option.id} type="button" aria-label={option.label || option.id} disabled={readOnly} onClick={() => setProtocol(option.id)} className={`border rounded px-4 py-3 ${protocol === option.id ? 'border-red-300 bg-red-950' : 'border-red-500/30'}`}>
                  {option.label || option.id}
                </button>
              ))}
            </div>
            <input aria-label="Hidden PIN" inputMode="numeric" value={pin} disabled={readOnly} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 60))} className="bg-black border border-red-500/30 rounded px-3 py-3" />
          </div>
        )}
        {feedback && <p className="mt-4 text-sm text-red-200">{feedback}</p>}
        {exhausted && <p className="mt-4 text-sm text-red-200">Maximum attempts exhausted for this clue.</p>}
        <button disabled={readOnly} onClick={submit} className="mt-5 w-full bg-red-700 hover:bg-red-600 py-3 rounded font-bold disabled:opacity-50">{stage === 3 ? 'DISENGAGE VAULT' : 'VERIFY PHASE'}</button>
      </div>
    </div>
  );
}

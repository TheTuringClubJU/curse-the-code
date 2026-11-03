import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';

export default function FinalContainmentTerminalModal({ isOpen, onClose, clue, onSubmitAnswer, isSubmitting }) {
  const [stage, setStage] = useState(1);
  const [words, setWords] = useState(['', '', '']);
  const [pieces, setPieces] = useState(['P01','P02','P03','P04','P05','P06','P07','P08','P09','P10']);
  const [protocol, setProtocol] = useState('ALPHA'); const [pin, setPin] = useState(''); const [feedback, setFeedback] = useState(null);
  if (!isOpen) return null;
  const movePiece = (index, delta) => { const next = [...pieces]; const j=index+delta; if(j<0||j>=next.length)return; [next[index],next[j]]=[next[j],next[index]]; setPieces(next); };
  const submit = async () => {
    let answer;
    if(stage===1) answer={ stage: 1, k1: words[0], k2: words[1], k3: words[2] };
    else if(stage===2) answer={ stage: 2, pieces }; else answer={ stage: 3, choice: protocol, code: pin };
    const r = await onSubmitAnswer?.(clue.id, answer); setFeedback(r?.message || null);
    if(r?.correct && stage<3) setStage(stage+1); if(r?.correct && r?.room_completed) onClose();
  };
  return <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4">
    <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl border border-red-500/50 bg-[#0d1012] p-6 text-[#ffd6d6]">
      <div className="flex justify-between items-center mb-5"><h2 className="flex items-center gap-2 text-lg font-bold"><ShieldAlert className="text-red-400"/> CONTAINMENT TERMINAL • PHASE {stage}/3</h2><button aria-label="Close" onClick={onClose}><X/></button></div>
      {stage===1 && <div><p className="mb-3">Enter the three master keywords recovered from the previous rooms.</p><div className="grid sm:grid-cols-3 gap-3">{words.map((v,i)=><input key={i} aria-label={`Master keyword ${i+1}`} value={v} onChange={e=>setWords(w=>w.map((x,n)=>n===i?e.target.value.toUpperCase():x))} className="bg-black border border-red-500/30 rounded px-3 py-3"/> )}</div></div>}
      {stage===2 && <div><p className="mb-3">Arrange all 10 photo pieces into the correct sequence.</p><div className="grid grid-cols-5 gap-2">{pieces.map((p,i)=><div key={p} className="border border-red-500/30 rounded p-2 text-center"><b>{p}</b><div className="flex justify-center mt-1"><button aria-label={`Move ${p} left`} onClick={()=>movePiece(i,-1)}>←</button><button aria-label={`Move ${p} right`} onClick={()=>movePiece(i,1)}>→</button></div></div>)}</div></div>}
      {stage===3 && <div><p className="mb-3">Select containment protocol and enter the hidden PIN.</p><select aria-label="Containment protocol" value={protocol} onChange={e=>setProtocol(e.target.value)} className="bg-black border border-red-500/30 rounded px-3 py-3 mr-3"><option>ALPHA</option><option>BETA</option></select><input aria-label="Final PIN" inputMode="numeric" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} className="bg-black border border-red-500/30 rounded px-3 py-3" placeholder="2468"/></div>}
      {feedback && <p className="mt-4 text-sm text-red-200">{feedback}</p>}
      <button disabled={isSubmitting} onClick={submit} className="mt-5 w-full bg-red-700 hover:bg-red-600 py-3 rounded font-bold">{stage===3?'DISENGAGE VAULT':'VERIFY PHASE'}</button>
    </div>
  </div>;
}

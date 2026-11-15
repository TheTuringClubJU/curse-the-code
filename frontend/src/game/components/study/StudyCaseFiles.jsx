import React from 'react';
import {X,Check,Lock,ChevronRight} from 'lucide-react';
import {studyCases,studyPropName,studyResolved,STUDY_PROPS} from './studyGuide.js';
export default function StudyCaseFiles({isOpen,onClose,clues=[],basketUnlocked=false,onOpenClue,collectedCount=0,totalFragments=16}){
 if(!isOpen)return null;const files=studyCases(clues),next=files.find(c=>!studyResolved(c));
 return <div className="study-panel" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section role="dialog" aria-modal="true" aria-label="Study case files" className="study-panel__sheet">
 <header><div><span>DANIEL VANCE / INVESTIGATION</span><h2>Case files</h2><p>Clues Status · {files.filter(studyResolved).length} / {files.length||4} resolved</p></div><button onClick={onClose} aria-label="Close case files"><X/></button></header>
 <div className="study-panel__body"><p className="study-panel__instruction">{basketUnlocked?'The records are open. Work through these four files in order. Each file uses a different set of scraps from your Basket.':'First recover every sealed fragment. Then your Basket opens and these four investigations become available in order.'}</p>
 <ol className="study-case-list">{files.map((c,i)=>{const done=studyResolved(c),locked=!basketUnlocked||Boolean(c.is_locked),current=next?.id===c.id;return <li key={c.id} data-current={current}><span className="study-case-list__number">{String(i+1).padStart(2,'0')}</span><div><h3>{studyPropName(c.object_id)}</h3><p>{c.title} · {STUDY_PROPS[c.object_id]?.[1]}</p><small>{done?(c.solved?'Solved':'Attempts exhausted · resolved'):!basketUnlocked?`Recover ${totalFragments-collectedCount} more fragments to open the Basket.`:locked?`Resolve ${studyPropName(next?.object_id)} first.`:'Current case · read its records, assemble the scraps and submit a deduction.'}</small><span className="study-case-list__attempts">Attempts: {c.attempts||0} / {c.attempts_max??'∞'}</span></div><button disabled={locked&&!done} onClick={()=>onOpenClue(c)} aria-label={`Open ${studyPropName(c.object_id)}`}>{done?<Check/>:locked?<Lock/>:<ChevronRight/>}<span>{done?'Review':locked?'Sealed':'Open'}</span></button></li>;})}</ol>
 <p className="study-panel__footnote">Solving earns points and a photograph piece. Exhausting attempts resolves a file without its solve reward. Only the server can unlock the Basement.</p></div>
 <footer><span>B · Basket &nbsp; C · Case files</span><button onClick={onClose}>Return to Study</button></footer>
 </section></div>;
}

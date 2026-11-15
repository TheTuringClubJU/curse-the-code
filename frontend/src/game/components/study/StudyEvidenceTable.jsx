import React,{useEffect,useState} from 'react';
import {X,ArrowLeft,FileText,Lock} from 'lucide-react';

export default function StudyEvidenceTable({isOpen,onClose,onOpenCaseFiles,evidence=[],collectedIds=[],basketUnlocked=false,totalInRoom=16}){
  const [selected,setSelected]=useState(null);
  useEffect(()=>{if(!isOpen)setSelected(null);},[isOpen]);
  useEffect(()=>{
    if(!isOpen)return;
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(selected)setSelected(null);else onClose();}};
    window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);
  },[isOpen,onClose,selected]);
  if(!isOpen)return null;
  const items=collectedIds.map(id=>evidence.find(e=>e.id===id)||{id,is_wrapped:true,display:{title:'Wrapped Fragment'}});
  const unlocked=item=>basketUnlocked&&!item.is_wrapped;
  const lines=item=>Array.isArray(item.display?.lines)?item.display.lines:[];
  return <div className="study-evidence" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="study-evidence__dialog" role="dialog" aria-modal="true" aria-label="Evidence Table">
      <header className="study-evidence__header">
        <div><span>DANIEL VANCE / PRIVATE ARCHIVE</span><h2>Evidence Table</h2><p>Your investigation Basket  -  preserve, read and compare the recovered scraps.</p><p>Daniel’s Study · {collectedIds.length} / {totalInRoom} recovered</p></div>
        <button aria-label="Close evidence table" onClick={onClose}><X size={22}/></button>
      </header>
      <div className="study-evidence__status">{basketUnlocked?'All wrappers are open. Read the records below, then use Case Files (C) to assemble and solve the four investigations in order. The door opens after the case files are resolved.':`The Basket stores your discoveries. Recover the remaining ${totalInRoom-collectedIds.length} fragments to open their wrappers together. Follow the field notes on screen; some objects hold more than one record.`}</div>
      {selected?<div className="study-evidence__reading">
        <button className="study-evidence__back" onClick={()=>setSelected(null)}><ArrowLeft size={16}/>All evidence</button>
        <article className="study-evidence__sheet">
          <div className="study-evidence__reference">EXHIBIT {selected.id} {unlocked(selected)&&selected.clue_id?' / '+selected.clue_id:''}</div>
          <h3>{unlocked(selected)?selected.display?.title||'Recovered record':'Wrapped Fragment'}</h3>
          {unlocked(selected)?<>
            <pre>{lines(selected).join('\n')||'No written inscription was recovered.'}</pre>
            {selected.secret?.chunk&&!lines(selected).join('\n').includes(selected.secret.chunk)&&<div className="study-evidence__data"><span>RECOVERED DATA</span><pre>{selected.secret.chunk}</pre></div>}
            {selected.secret?.note&&<p>{selected.secret.note}</p>}
            <footer>Recovered from Daniel’s study · preserve the original order</footer>
          </>:<p>The oilcloth is sealed. Recover the remaining room fragments before examining this record.</p>}
        </article>
      </div>:<div className="study-evidence__grid">
        {!items.length&&<div className="study-evidence__empty"><FileText size={32}/><h3>No evidence recovered yet</h3><p>Search the study with E. Every recovered fragment will appear here.</p></div>}
        {items.map((item,index)=><button className={'study-evidence__card '+(unlocked(item)?'':'study-evidence__card--sealed')} key={item.id} onClick={()=>setSelected(item)} aria-label={'Examine '+(unlocked(item)?item.display?.title||item.id:'wrapped fragment '+(index+1))}>
          <span className="study-evidence__reference">{String(index+1).padStart(2,'0')} / {item.id}</span>
          {unlocked(item)?<FileText size={22}/>:<Lock size={22}/>}
          <h3>{unlocked(item)?item.display?.title||'Recovered record':'Wrapped Fragment'}</h3>
          <pre>{unlocked(item)?lines(item).slice(0,2).join('\n'):'OILCLOTH WRAPPER\nCONTENTS SEALED'}</pre>
          <span className="study-evidence__card-footer">{unlocked(item)?'UNWRAPPED · EXAMINE':'SEALED'}</span>
        </button>)}
      </div>}
      <footer className="study-evidence__footer"><span>HOLLOW HOUSE / INVESTIGATION RECORDS</span><div>{basketUnlocked&&onOpenCaseFiles&&<button onClick={onOpenCaseFiles}>Continue to Case Files (C)</button>}<button onClick={onClose}>Close Basket</button></div></footer>
    </section>
  </div>;
}

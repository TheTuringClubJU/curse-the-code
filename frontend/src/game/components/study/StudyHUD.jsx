import React from 'react';
import {Volume2,VolumeX,LogOut} from 'lucide-react';
export default function StudyHUD(p){
 const actions=[['B','Basket',`${p.collectedCount}/${p.totalFragments}`,p.onOpenBasket],['C','Case files',`${p.cluesSolved}/${p.totalClues}`,p.onOpenCaseFiles],['P','Photograph',`${p.photoCount}/10`,p.onOpenPhotoPuzzle],['R','Dossier',null,p.onOpenRules],['H','Hints',null,p.onOpenHints]];
 return <div className="study-hud">
  <header className="study-hud__header"><div className="study-hud__identity"><span>HOLLOW HOUSE / II</span><strong>Daniel&apos;s Study</strong></div>
   <nav aria-label="Investigation tools">{actions.map(([key,label,value,fn])=><button key={key} onClick={fn} title={`Open ${label} (${key})`}><kbd>{key}</kbd><span>{label}</span>{value&&<small>{value}</small>}</button>)}</nav>
   <div className="study-hud__utility"><button title={p.audioMuted?'Unmute Ambient':'Mute Ambient'} aria-label={p.audioMuted?'Enable sound':'Mute sound'} onClick={p.onToggleAudio}>{p.audioMuted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button><button aria-label="Log out" onClick={p.onLogout}><LogOut size={17}/></button></div>
  </header>
  {p.objective&&<aside className="study-objective" aria-label="Current objective" aria-live="polite"><span>FIELD NOTES / 0{p.objective.step}</span><h2>{p.objective.title}</h2><p>{p.objective.detail}</p>{p.objective.extra&&<p className="study-objective__tip">{p.objective.extra}</p>}<small>{p.objective.progress}</small></aside>}
  <div className="study-hud__crosshair" aria-hidden="true"/>
  {p.activeHoverPrompt&&<div className="study-hud__target"><kbd>E</kbd><span>{p.activeHoverPrompt.replace(/\s*\[E\]/g,'')}</span></div>}
  <footer><span>WASD <i>Move</i> · Mouse <i>Look</i> · F <i>Torch</i></span>{p.isRoomCompleted&&<strong>Basement passage unlocked</strong>}</footer>
 </div>;
}

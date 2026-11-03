import React, { useEffect, useRef, useState } from 'react';
import { createEngine } from './engine/engine.js';
import basementConfig from './rooms/basement.js';
import { GameAudio } from './engine/audio.js';
import HUD from './components/HUD.jsx';
import BasketModal from './components/BasketModal.jsx';
import CaseFilesModal from './components/CaseFilesModal.jsx';
import PhotoPuzzleModal from './components/PhotoPuzzleModal.jsx';
import IntercomQrModal from './components/IntercomQrModal.jsx';
import ServerRackNoteModal from './components/ServerRackNoteModal.jsx';
import Round1VictoryModal from './components/Round1VictoryModal.jsx';
import FinalContainmentTerminalModal from './components/FinalContainmentTerminalModal.jsx';
import './game.css';

export default function Room3Basement({ team, onLogout, onProceedToLobby }) {
  const mountRef = useRef(null), engineRef = useRef(null), audioRef = useRef(null);
  const roomDataRef = useRef(null), activeTargetRef = useRef(null), handleInteractRef = useRef(null);
  const [roomData, setRoomData] = useState(null), [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false), [activeClue, setActiveClue] = useState(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false), [isCaseFilesOpen, setIsCaseFilesOpen] = useState(false);
  const [isPhotoPuzzleOpen, setIsPhotoPuzzleOpen] = useState(false), [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [hoverPrompt, setHoverPrompt] = useState(null), [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false), [audioMuted, setAudioMuted] = useState(false);

  const showNotification = (message) => { setNotification(message); setTimeout(()=>setNotification(null), 4500); };
  const fetchRoomState = async () => {
    try {
      const res = await fetch('/api/game/room/basement', { credentials:'include', headers:{'x-session-token':localStorage.getItem('ctc_token')||''} });
      if(res.ok){ const data=await res.json(); setRoomData(data); roomDataRef.current=data; if(data.is_completed) engineRef.current?.openDoor?.(); }
    } catch(e){ console.error('Failed to load basement:', e); } finally { setLoading(false); }
  };

  const handleInteract = async (objectId) => {
    const data=roomDataRef.current;
    if(objectId==='room_door'){ if(data?.is_completed) setIsCompleteOpen(true); else showNotification('The subterranean vault remains sealed until the containment terminal is solved.'); return; }
    try {
      const res=await fetch('/api/game/room/basement/search',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','x-session-token':localStorage.getItem('ctc_token')||''},body:JSON.stringify({object_id:objectId})});
      if(res.ok){ const result=await res.json(); if(result.message) showNotification(result.message); if(result.found){await fetchRoomState(); return;} }
    } catch(e){ console.error('Search failed:',e); }
    const clue=data?.clues?.find(c=>c.object_id===objectId);
    if(clue){
      if(clue.id==='R1-FIN'){ const required=['R1-09','R1-10']; const ready=required.every(id=>data.clues.find(c=>c.id===id)?.solved); if(!ready){showNotification('Final terminal locked. Solve R1-09 and R1-10 first.');return;} }
      if(!data?.basket_unlocked && clue.id!=='R1-FIN'){showNotification('The evidence lock is sealed. Recover all 5 basement fragments first.');return;}
      setActiveClue(clue); engineRef.current?.unlock();
    }
  };
  handleInteractRef.current=handleInteract;

  useEffect(()=>{fetchRoomState();},[]);
  useEffect(()=>{
    const key=(e)=>{ const tag=(e.target?.tagName||'').toUpperCase(); if(['INPUT','TEXTAREA'].includes(tag)||e.target?.isContentEditable)return;
      if(e.key.toLowerCase()==='e'&&activeTargetRef.current){e.preventDefault();handleInteractRef.current?.(activeTargetRef.current);}
      if(e.key.toLowerCase()==='b'){e.preventDefault();setIsBasketOpen(v=>!v);}
      if(e.key.toLowerCase()==='c'){e.preventDefault();setIsCaseFilesOpen(v=>!v);}
      if(e.key.toLowerCase()==='p'){e.preventDefault();setIsPhotoPuzzleOpen(v=>!v);}
    };
    window.addEventListener('keydown',key,true); return()=>window.removeEventListener('keydown',key,true);
  },[]);

  useEffect(()=>{
    if(!mountRef.current||engineRef.current)return;
    audioRef.current=new GameAudio();
    try{ engineRef.current=createEngine(mountRef.current,basementConfig,{audio:audioRef.current,onFlash:()=>{},onTarget:(id)=>{activeTargetRef.current=id;setHoverPrompt(id?`Inspect ${id.replaceAll('_',' ')}`:null);},onInteract:(id)=>handleInteractRef.current?.(id),onLock:()=>{}}); }
    catch(e){console.error('Basement initialization failed:',e);} return()=>{engineRef.current?.dispose?.();engineRef.current=null;audioRef.current?.dispose?.();};
  },[]);

  const handleStart=()=>{setIsStarted(true);audioRef.current?.start(basementConfig.audio);engineRef.current?.setPaused(false);setTimeout(()=>engineRef.current?.lock(),50);};
  const handleClueSubmit=async(clueId,answer)=>{setIsSubmitting(true);try{const res=await fetch(`/api/game/clue/${clueId}/submit`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','x-session-token':localStorage.getItem('ctc_token')||''},body:JSON.stringify({answer})});const data=await res.json();if(res.ok){await fetchRoomState();if(data.room_completed){engineRef.current?.openDoor?.();setIsCompleteOpen(true);}return data;}return{correct:false,message:data.detail||'Submission failed'};}catch(e){return{correct:false,message:'Server communication error'};}finally{setIsSubmitting(false);}};

  const clues=roomData?.clues||[], roomClues=clues.filter(c=>c.id!=='R1-FIN');
  const clueModalProps={isSubmitting,onSubmitAnswer:handleClueSubmit,clue:activeClue,onClose:()=>{setActiveClue(null);engineRef.current?.lock();}};

  useEffect(() => {
    let cancelled = false;
    let remainingSeconds = 15 * 60;
    const updateCountdown = async () => {
      try {
        const res = await fetch('/api/time', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const serverRemaining = Number(data.remaining_seconds ?? data.remaining ?? NaN);
          if (Number.isFinite(serverRemaining)) remainingSeconds = Math.max(0, Math.floor(serverRemaining));
        }
      } catch (_) {}
      if (cancelled) return;
      if (!document.hidden) {
        const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
        const seconds = String(remainingSeconds % 60).padStart(2, '0');
        engineRef.current?.setCountdown(`${minutes}:${seconds}`);
        remainingSeconds = Math.max(0, remainingSeconds - 1);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return <div className="relative w-full h-screen overflow-hidden bg-[#14161a] select-none font-mono">
    <div ref={mountRef} onClick={()=>isStarted&&engineRef.current?.lock()} className="absolute inset-0" />
    {!isStarted&&<div className="ov"><h1>CURSE THE CODE</h1><h3>The Basement</h3><ul><li><b>WASD</b> move</li><li><b>Mouse</b> look</li><li><b>E</b> interact/search</li><li><b>B/C/P</b> basket/clues/photo</li></ul><button onClick={handleStart}>CLICK TO ENTER BASEMENT</button></div>}
    {notification&&<div className="absolute top-20 left-1/2 -translate-x-1/2 z-[80] bg-red-950/95 border border-red-400/40 px-5 py-3 rounded text-xs text-red-100">{notification}</div>}
    {isStarted&&<HUD roomTitle={roomData?.title||'The Basement'} totalFragments={5} collectedCount={roomData?.collected_fragment_ids?.length||0} basketUnlocked={Boolean(roomData?.basket_unlocked)} isRoomCompleted={Boolean(roomData?.is_completed)} photoCount={roomData?.photo_pieces_collected||0} cluesSolved={roomClues.filter(c=>c.solved).length} totalClues={2} onOpenBasket={()=>{setIsBasketOpen(true);engineRef.current?.unlock();}} onOpenCaseFiles={()=>{setIsCaseFilesOpen(true);engineRef.current?.unlock();}} onOpenPhotoPuzzle={()=>{setIsPhotoPuzzleOpen(true);engineRef.current?.unlock();}} onLogout={onLogout} audioMuted={audioMuted} onToggleAudio={()=>{const v=!audioMuted;audioRef.current?.setMuted(v);setAudioMuted(v);}} activeHoverPrompt={hoverPrompt}/>} 
    <BasketModal isOpen={isBasketOpen} onClose={()=>{setIsBasketOpen(false);engineRef.current?.lock();}} evidence={roomData?.evidence||[]} collectedIds={roomData?.collected_fragment_ids||[]} basketUnlocked={Boolean(roomData?.basket_unlocked)} totalInRoom={5} roomTitle="The Basement"/>
    <CaseFilesModal isOpen={isCaseFilesOpen} onClose={()=>{setIsCaseFilesOpen(false);engineRef.current?.lock();}} clues={clues} basketUnlocked={Boolean(roomData?.basket_unlocked)} onOpenClue={clue=>{setIsCaseFilesOpen(false);if(clue.id==='R1-FIN'&&!clues.filter(c=>c.id==='R1-09'||c.id==='R1-10').every(c=>c.solved)){showNotification('Final terminal locked.');return;}setActiveClue(clue);engineRef.current?.unlock();}}/>
    <PhotoPuzzleModal isOpen={isPhotoPuzzleOpen} onClose={()=>{setIsPhotoPuzzleOpen(false);engineRef.current?.lock();}} photoCount={roomData?.photo_pieces_collected||0} requiredPieces={10}/>
    <IntercomQrModal isOpen={Boolean(activeClue?.id==='R1-09')} {...clueModalProps}/>
    <ServerRackNoteModal isOpen={Boolean(activeClue?.id==='R1-10')} {...clueModalProps}/>
    <FinalContainmentTerminalModal isOpen={Boolean(activeClue?.id==='R1-FIN')} {...clueModalProps}/>
    <Round1VictoryModal isOpen={isCompleteOpen} onClose={()=>setIsCompleteOpen(false)} onProceed={()=>{setIsCompleteOpen(false);onProceedToLobby?.();showNotification('Round 1 complete. The subterranean vault seal is disengaged.');}} />
  </div>;
}

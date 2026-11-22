import React, { useEffect, useRef, useState } from 'react';
import { createEngine } from './engine/engine.js';
import basementConfig from './rooms/basement.js';
import { GameAudioRecords as GameAudioBasement } from './engine/audioRecords.js';
import HUD from './components/HUD.jsx';
import BasketModal from './components/BasketModal.jsx';
import CaseFilesModal from './components/CaseFilesModal.jsx';
import PhotoPuzzleModal from './components/PhotoPuzzleModal.jsx';
import IntercomQrModal from './components/IntercomQrModal.jsx';
import ServerRackNoteModal from './components/ServerRackNoteModal.jsx';
import Round1VictoryModal from './components/Round1VictoryModal.jsx';
import FinalContainmentTerminalModal from './components/FinalContainmentTerminalModal.jsx';
import Round1DossierModal from './components/Round1DossierModal.jsx';
import HintModal from './components/HintModal.jsx';
import './game.css';

const jumpscareVisual = '/assets/jumpscare_entity.jpg';

const BASEMENT_EVIDENCE_IMAGES = {
  EK04: '/evidence/basement/EK04.png',
  EK05: '/evidence/basement/EK05.png',
  EK06: '/evidence/basement/EK06.png',
  XK01: '/evidence/basement/XK01.png',
  XK02: '/evidence/basement/XK02.png',
};

function mapBasementEvidence(evidenceList) {
  if (!Array.isArray(evidenceList)) return [];
  return evidenceList.map(ev => ({
    ...ev,
    image_file: ev.image_file || BASEMENT_EVIDENCE_IMAGES[ev.id] || ''
  }));
}

function isClueResolved(clueList, clueId) {
  const c = clueList?.find(item => item.id === clueId);
  return Boolean(c && (c.solved || (c.attempts || 0) >= (c.attempts_max || 3)));
}

export default function Room3Basement({ team, onLogout, onProceedToLobby, onProceedToStudy, previewMode = false }) {
  const mountRef = useRef(null), engineRef = useRef(null), audioRef = useRef(null);
  const roomDataRef = useRef(null), activeTargetRef = useRef(null), handleInteractRef = useRef(null);
  const submittingRef = useRef(false), notificationTimerRef = useRef(null);
  const screamAudioRef = useRef(null);
  const [roomData, setRoomData] = useState(null), [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false), [activeClue, setActiveClue] = useState(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false), [isCaseFilesOpen, setIsCaseFilesOpen] = useState(false);
  const [isPhotoPuzzleOpen, setIsPhotoPuzzleOpen] = useState(false), [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [hoverPrompt, setHoverPrompt] = useState(null), [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false), [audioMuted, setAudioMuted] = useState(false);
  const [isJumpscareActive, setIsJumpscareActive] = useState(false);
  const jumpscareTriggeredRef = useRef(false);
  const wasOnStairsRef = useRef(false);
  const jumpscareTimerRef = useRef(null);
  const handlePlayerMoveRef = useRef(null);
  const [flashOverlay, setFlashOverlay] = useState({ color: '#c40414', opacity: 0, visible: false });
  const doorScareCountRef = useRef(0);

  const previewRoomData = {
    title: 'The Basement',
    is_completed: false,
    basket_unlocked: true,
    collected_fragment_ids: ['basement-preview-1'],
    evidence: [],
    photo_pieces_collected: 4,
    clues: [
      { id: 'R1-09', object_id: 'intercom', solved: false, attempts: 0, attempts_max: 3 },
      { id: 'R1-10', object_id: 'rack_door', solved: false, attempts: 0, attempts_max: 3 },
      { id: 'R1-FIN', object_id: 'containment_console', solved: false, attempts: 0, attempts_max: 3 },
    ],
  };

  const showNotification = (message) => {
    setNotification(message);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(()=>setNotification(null), 4500);
  };
  const fetchRoomState = async () => {
    if (previewMode) {
      setRoomData(previewRoomData);
      roomDataRef.current = previewRoomData;
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/game/room/basement', { credentials:'include', headers:{'x-session-token':localStorage.getItem('ctc_token')||''} });
      if(res.ok){
        const data=await res.json();
        const mappedData = { ...data, evidence: mapBasementEvidence(data.evidence) };
        setRoomData(mappedData);
        roomDataRef.current=mappedData;
        if(data.is_completed) engineRef.current?.openDoor?.();
      }
      else if ([401,403,404,429,500].includes(res.status)) return;
    } catch(e){ console.error('Failed to load basement:', e); } finally { setLoading(false); }
  };

  const handleInteract = async (objectId) => {
    const data=roomDataRef.current;
    if (previewMode) {
      if (objectId === 'room_door') {
        showNotification('Preview mode: the Room 3 exit is not connected.');
        return;
      }
      const clue = data?.clues?.find(c => c.object_id === objectId);
      if (clue) {
        setActiveClue(clue);
        engineRef.current?.unlock();
      } else {
        showNotification(`Preview: inspected ${objectId.replaceAll('_', ' ')}`);
      }
      return;
    }
    if(objectId==='room_door'){
      if(data?.is_completed){ setIsCompleteOpen(true); engineRef.current?.unlock(); }
      else if (onProceedToStudy) { onProceedToStudy(); }
      else {
        audioRef.current?.slam?.(3, 2.95);
        showNotification('The backward passage leads to the Study. The subterranean vault remains sealed.');
      }
      return;
    }
    try {
      const res=await fetch('/api/game/room/basement/search',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','x-session-token':localStorage.getItem('ctc_token')||''},body:JSON.stringify({object_id:objectId})});
      if(res.ok){ const result=await res.json(); if(result.message) showNotification(result.message); if(result.found){await fetchRoomState(); return;} }
      if ([401,403,404,429,500].includes(res.status)) { showNotification(res.status === 429 ? 'Search is temporarily rate limited.' : 'Search request could not be completed.'); }
    } catch(e){ console.error('Search failed:',e); }
    const clue=data?.clues?.find(c=>c.object_id===objectId);
    if(clue){
      if(!data?.basket_unlocked){
        showNotification('The evidence lock is sealed. Recover all 5 basement fragments first.');
        return;
      }
      if(clue.is_locked){
        showNotification(clue.lock_reason || 'This clue is locked.');
        return;
      }
      if(clue.id==='R1-10' && !isClueResolved(data?.clues, 'R1-09')){
        showNotification('Previous clue "R1-09" in this sequence must be solved first.');
        return;
      }
      if(clue.id==='R1-FIN' && (!isClueResolved(data?.clues, 'R1-09') || !isClueResolved(data?.clues, 'R1-10'))){
        showNotification('Final terminal locked. Solve R1-09 and R1-10 first.');
        return;
      }
      if(!clue.solved && (clue.attempts || 0) >= (clue.attempts_max || 3)){
        showNotification('Maximum attempts exhausted for this clue.');
        return;
      }
      setActiveClue(clue); engineRef.current?.unlock();
    }
  };
  handleInteractRef.current=handleInteract;

  const triggerJumpscare = () => {
    if (jumpscareTriggeredRef.current) return;
    jumpscareTriggeredRef.current = true;
    setIsJumpscareActive(true);

    // 1. Play scream audio asset (/assets/audio/basement/scream.mp3)
    try {
      if (typeof Audio !== 'undefined') {
        const scream = new Audio('/assets/audio/basement/scream.mp3');
        scream.volume = 1.0;
        screamAudioRef.current = scream;
        scream.play().catch(() => {});
      }
    } catch (_) {}

    // 2. Web Audio API playback
    try {
      audioRef.current?.hoarseScream?.(1.0);
    } catch (_) {}

    // 3. Violent camera trauma shake
    try {
      engineRef.current?.shake?.(2.5, 1.0);
    } catch (_) {}

    // 4. Exactly one second (1000ms) scare duration before disappearing
    if (jumpscareTimerRef.current) clearTimeout(jumpscareTimerRef.current);
    jumpscareTimerRef.current = setTimeout(() => {
      setIsJumpscareActive(false);
      try {
        if (screamAudioRef.current) {
          screamAudioRef.current.pause();
          screamAudioRef.current.currentTime = 0;
        }
      } catch (_) {}
    }, 1000);
  };

  const handlePlayerMove = ({ px }) => {
    // Upper staircase landing (player spawns at px=19.5, top of stairs px>=18.56)
    if (px >= 16.5) {
      wasOnStairsRef.current = true;
    }

    // End of staircase transition (stairs end and meet the basement floor at px=15.0)
    if (!jumpscareTriggeredRef.current && wasOnStairsRef.current && px <= 15.2) {
      triggerJumpscare();
    }
  };
  handlePlayerMoveRef.current = handlePlayerMove;

  useEffect(() => {
    // Preload jumpscare audio, ambient monster audio, and visual asset on mount
    try {
      const audioPreload = new Audio('/assets/audio/basement/scream.mp3');
      audioPreload.preload = 'auto';
      audioPreload.load();
    } catch (_) {}
    try {
      const monsterPreload = new Audio('/assets/audio/basement/alesiadavina-halloween-horror-sound-lurking-monster-145070.mp3');
      monsterPreload.preload = 'auto';
      monsterPreload.load();
    } catch (_) {}
    try {
      const fallingPreload = new Audio('/assets/audio/basement/universfield-heavy-object-falling-291096.mp3');
      fallingPreload.preload = 'auto';
      fallingPreload.load();
    } catch (_) {}
    try {
      const imgPreload = new Image();
      imgPreload.src = jumpscareVisual;
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.__triggerBasementJumpscare = triggerJumpscare;
    }
    return () => {
      if (typeof window !== 'undefined' && window.__triggerBasementJumpscare === triggerJumpscare) {
        delete window.__triggerBasementJumpscare;
      }
    };
  }, []);

  // Ambient Horror Loop:
  // 1. alesiadavina-halloween-horror-sound-lurking-monster-145070.mp3 plays once every 1 min and 15 sec (75s).
  // 2. universfield-heavy-object-falling-291096.mp3 plays 40-45 seconds after the first, at random.
  useEffect(() => {
    if (!isStarted) return;

    let isDisposed = false;
    let monsterInterval = null;
    let fallingTimeout = null;

    const playSound = (url) => {
      if (isDisposed || audioMuted) return null;
      if (audioRef.current?.playTrack) {
        return audioRef.current.playTrack(url, 0.85);
      }
      try {
        if (typeof Audio !== 'undefined') {
          const snd = new Audio(url);
          snd.volume = audioMuted ? 0 : 0.85;
          snd.play().catch(() => {});
          return snd;
        }
      } catch (_) {}
      return null;
    };

    const triggerLurkingCycle = () => {
      if (isDisposed) return;
      // Play Lurking Monster audio
      playSound('/assets/audio/basement/alesiadavina-halloween-horror-sound-lurking-monster-145070.mp3');

      // Play Heavy Object Falling audio 40-45 seconds after the first, at random
      const delayMs = (40 + Math.random() * 5) * 1000;
      if (fallingTimeout) clearTimeout(fallingTimeout);
      fallingTimeout = setTimeout(() => {
        if (isDisposed) return;
        playSound('/assets/audio/basement/universfield-heavy-object-falling-291096.mp3');
      }, delayMs);
    };

    if (typeof window !== 'undefined') {
      window.__triggerBasementLurkingCycle = triggerLurkingCycle;
    }

    // Runs once every 1 min and 15 sec (75,000 ms)
    const MONSTER_INTERVAL_MS = 75 * 1000;
    monsterInterval = setInterval(triggerLurkingCycle, MONSTER_INTERVAL_MS);

    return () => {
      isDisposed = true;
      if (monsterInterval) clearInterval(monsterInterval);
      if (fallingTimeout) clearTimeout(fallingTimeout);
      if (typeof window !== 'undefined' && window.__triggerBasementLurkingCycle === triggerLurkingCycle) {
        delete window.__triggerBasementLurkingCycle;
      }
    };
  }, [isStarted, audioMuted]);

  useEffect(() => {
    fetchRoomState();
    const iv = setInterval(fetchRoomState, 2000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => () => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    if (jumpscareTimerRef.current) clearTimeout(jumpscareTimerRef.current);
  }, []);
  useEffect(()=>{
    const key=(e)=>{ const tag=(e.target?.tagName||'').toUpperCase(); if(['INPUT','TEXTAREA'].includes(tag)||e.target?.isContentEditable)return;
      if(e.key.toLowerCase()==='b'){e.preventDefault();setIsBasketOpen(v=>{const next=!v;if(next)engineRef.current?.unlock();else engineRef.current?.lock();return next;});}
      if(e.key.toLowerCase()==='c'){e.preventDefault();setIsCaseFilesOpen(v=>{const next=!v;if(next)engineRef.current?.unlock();else engineRef.current?.lock();return next;});}
      if(e.key.toLowerCase()==='p'){e.preventDefault();setIsPhotoPuzzleOpen(v=>{const next=!v;if(next)engineRef.current?.unlock();else engineRef.current?.lock();return next;});}
      if(e.key.toLowerCase()==='r'){e.preventDefault();setIsDossierOpen(v=>{const next=!v;if(next)engineRef.current?.unlock();else engineRef.current?.lock();return next;});}
      if(e.key.toLowerCase()==='h'){e.preventDefault();setIsHintOpen(v=>{const next=!v;if(next)engineRef.current?.unlock();else engineRef.current?.lock();return next;});}
    };
    window.addEventListener('keydown',key,true); return()=>window.removeEventListener('keydown',key,true);
  },[]);

  useEffect(()=>{
    if(!mountRef.current||engineRef.current)return;
    audioRef.current=new GameAudioBasement();
    try{ 
      engineRef.current=createEngine(mountRef.current,basementConfig,{
        audio:audioRef.current,
        onFlash:(color,opacity=0.78,durationMs=200)=>{setFlashOverlay({color,opacity,visible:true});setTimeout(()=>setFlashOverlay(prev=>({...prev,visible:false})),durationMs||200);},
        onTarget:(id)=>{activeTargetRef.current=id;setHoverPrompt(id?`Inspect ${id.replaceAll('_',' ')}`:null);},
        onInteract:(id)=>handleInteractRef.current?.(id),
        onLock:()=>{},
        onPlayerMove:(pos)=>handlePlayerMoveRef.current?.(pos)
      }); 
    }
    catch(e){console.error('Basement initialization failed:',e);} return()=>{engineRef.current?.dispose?.();engineRef.current=null;audioRef.current?.dispose?.();};
  },[]);

  const handleStart=()=>{setIsStarted(true);audioRef.current?.start(basementConfig.audio);engineRef.current?.setPaused(false);engineRef.current?.lock();};
  const handleClueSubmit=async(clueId,answer)=>{
    if (previewMode) {
      return { correct: false, message: `Preview mode: "${answer}" is not submitted to the server.` };
    }
    if(submittingRef.current)return {correct:false,message:'Submission already pending'};
    submittingRef.current=true;setIsSubmitting(true);
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const res=await fetch(`/api/game/clue/${clueId}/submit`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','x-session-token':localStorage.getItem('ctc_token')||''},body:JSON.stringify({answer}),signal:controller.signal});
      const data=await res.json().catch(()=>({detail:'Invalid server response'}));
      if(res.ok){await fetchRoomState();if(data.room_completed){engineRef.current?.openDoor?.();setIsCompleteOpen(true);}return data;}
      if(res.status===429)return {correct:false,message:'Submission is temporarily rate limited.'};
      if(res.status===401)return {correct:false,message:'Your session is no longer authorized.'};
      if(res.status===403) {
        const msg = typeof data?.detail === 'object' ? (data?.detail?.message || data?.detail?.code) : data?.detail;
        return {correct:false, message: msg || 'Action not permitted.'};
      }
      if(res.status===404)return {correct:false,message:'This clue is unavailable.'};
      if(res.status===500)return {correct:false,message:'The server could not process this submission.'};
      const fallbackMsg = (typeof data?.detail === 'object' ? data?.detail?.message : data?.detail) || 'Submission failed';
      return {correct:false,message:fallbackMsg};
    }catch(e){return {correct:false,message:e?.name==='AbortError'?'Submission timed out.':'Server communication error'};}
    finally{clearTimeout(timeout);submittingRef.current=false;setIsSubmitting(false);}
  };

  const clues=roomData?.clues||[], roomClues=clues.filter(c=>c.id!=='R1-FIN');
  const clueModalProps={isSubmitting,onSubmitAnswer:handleClueSubmit,clue:activeClue,onClose:()=>{setActiveClue(null);engineRef.current?.lock();}};

  // Wall-monitor countdown: sync with the server clock ONCE on mount, then count down
  // locally (no polling). If the sync fails, retry at most 3 times with backoff and show
  // --:-- until the server answers, so players never see a made-up time.
  useEffect(() => {
    let cancelled = false, retryTimer = null, lastText = null;
    let deadline = null; // performance.now() value at which the countdown reaches 0
    const toNum = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) ? Number(v) : NaN;
    const parseRemaining = (d) => {
      const direct = toNum(d?.remaining_seconds ?? d?.remaining);
      if (Number.isFinite(direct)) return Math.max(0, Math.floor(direct));
      const end = Date.parse(d?.ends_at), now = Date.parse(d?.server_time ?? d?.now);
      return Number.isFinite(end) && Number.isFinite(now) ? Math.max(0, Math.floor((end - now) / 1000)) : null;
    };
    const render = () => {
      let text = '--:--';
      if (deadline !== null) {
        const left = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
        text = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      }
      if (engineRef.current && text !== lastText) { lastText = text; engineRef.current.setCountdown?.(text); }
    };
    const sync = async (attempt = 0) => {
      if (previewMode) { deadline = performance.now() + 15 * 60 * 1000; render(); return; }
      try {
        const res = await fetch('/api/time', { credentials: 'include' });
        if (cancelled) return;
        if (res.ok) {
          const remaining = parseRemaining(await res.json());
          if (remaining !== null && !cancelled) { deadline = performance.now() + remaining * 1000; render(); return; }
        }
      } catch (_) { /* fall through to retry */ }
      if (!cancelled && attempt < 3) retryTimer = setTimeout(() => sync(attempt + 1), [5000, 15000, 45000][attempt]);
    };
    sync();
    const tickTimer = setInterval(render, 1000); // local only, no network
    return () => { cancelled = true; clearTimeout(retryTimer); clearInterval(tickTimer); };
  }, []);

  const isAnyModalOpen = Boolean(
    isBasketOpen ||
    isCaseFilesOpen ||
    isPhotoPuzzleOpen ||
    activeClue ||
    isCompleteOpen ||
    isDossierOpen ||
    isHintOpen
  );

  return <div className="basement-room relative w-full h-screen overflow-hidden bg-[#14161a] select-none font-mono">
    <div ref={mountRef} onClick={() => { if (isStarted && engineRef.current && !isAnyModalOpen) engineRef.current.lock(); }} className="absolute inset-0" />
    {flashOverlay.visible && <div className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-75" style={{ backgroundColor: flashOverlay.color, opacity: flashOverlay.opacity }} />}
    {!isStarted && (
      <div 
        className="fixed inset-0 z-[100] bg-black select-none flex items-center justify-start p-8 sm:p-16 overflow-hidden bg-cover bg-right sm:bg-center"
        style={{
          background: 'radial-gradient(ellipse at 70% 50%, #1c0e15 0%, #0d070f 50%, #060608 100%)',
          backgroundColor: '#060608'
        }}
      >
        {/* Cinematic dark gradient vignette overlay on left for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent pointer-events-none w-full sm:w-3/5" />
        <div className="absolute inset-0 bg-black/25 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-start max-w-lg pl-2 sm:pl-8">
          {/* Main Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-[0.2em] text-white uppercase drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)]">
            CURSE THE CODE
          </h1>

          {/* Room Pill Badge */}
          <div className="mt-3 mb-8 px-4 py-1 rounded-full bg-white text-black font-mono font-bold text-xs sm:text-sm tracking-[0.35em] uppercase shadow-md inline-flex items-center justify-center">
            r o o m &nbsp; 3
          </div>

          {/* Enter Room Button */}
          <button
            onClick={handleStart}
            aria-label="CLICK TO ENTER BASEMENT"
            className="group px-6 py-2.5 rounded border border-white/70 hover:border-white bg-black/50 hover:bg-white/10 text-white font-serif tracking-wider text-sm sm:text-base cursor-pointer transition-all duration-200 shadow-[0_0_15px_rgba(0,0,0,0.6)] hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-[0.98] flex items-center justify-center"
          >
            <span>Enter the Basement</span>
            <span className="sr-only">CLICK TO ENTER BASEMENT</span>
          </button>

          {/* Controls List */}
          <div className="mt-8 space-y-2.5 text-xs sm:text-sm font-mono text-stone-300/80">
            <div className="flex items-center">
              <span className="w-36 sm:w-44 text-stone-200">
                <span className="text-white font-bold mr-1.5">•</span>Move &amp; Look
              </span>
              <span className="text-stone-400 font-mono">WASD &middot; Mouse</span>
            </div>
            <div className="flex items-center">
              <span className="w-36 sm:w-44 pl-3.5 text-stone-300">
                Interact
              </span>
              <span className="text-stone-400 font-mono">E &middot; Right-Click</span>
            </div>
            <div className="flex items-center">
              <span className="w-36 sm:w-44 pl-3.5 text-stone-300">
                Files
              </span>
              <span className="text-stone-400 font-mono">P &middot; B &middot; C</span>
            </div>
            <div className="flex items-center">
              <span className="w-36 sm:w-44 pl-3.5 text-stone-300">
                Cursor Release
              </span>
              <span className="text-stone-400 font-mono">ESC</span>
            </div>
          </div>
        </div>
      </div>
    )}
    {notification&&<div className="absolute top-20 left-1/2 -translate-x-1/2 z-[80] bg-black/60 backdrop-blur-none border border-white/50 px-5 py-3 rounded-lg text-xs font-mono text-white shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{notification}</div>}
    {isStarted&&<HUD roomTitle={roomData?.title||'The Basement'} totalFragments={5} collectedCount={roomData?.collected_fragment_ids?.length||0} basketUnlocked={Boolean(roomData?.basket_unlocked)} isRoomCompleted={Boolean(roomData?.is_completed)} completedMessage="ROOM 3 COMPLETE • BASEMENT SECTOR PURGED" photoCount={roomData?.photo_pieces_collected||0} cluesSolved={roomClues.filter(c=>c.solved).length} totalClues={2} hasFinale={true} finaleSolved={Boolean(roomData?.clues?.find(c=>c.id==='R1-FIN')?.solved)} onOpenBasket={()=>{setIsBasketOpen(true);engineRef.current?.unlock();}} onOpenCaseFiles={()=>{setIsCaseFilesOpen(true);engineRef.current?.unlock();}} onOpenPhotoPuzzle={()=>{setIsPhotoPuzzleOpen(true);engineRef.current?.unlock();}} onOpenRules={()=>{setIsDossierOpen(true);engineRef.current?.unlock();}} onOpenDossier={()=>{setIsDossierOpen(true);engineRef.current?.unlock();}} onOpenHints={()=>{setIsHintOpen(true);engineRef.current?.unlock();}} onLogout={onLogout} audioMuted={audioMuted} onToggleAudio={()=>{const v=!audioMuted;audioRef.current?.setMuted(v);setAudioMuted(v);}} activeHoverPrompt={hoverPrompt} />}
    <BasketModal isOpen={isBasketOpen} onClose={()=>{setIsBasketOpen(false);engineRef.current?.lock();}} evidence={roomData?.evidence||[]} collectedIds={roomData?.collected_fragment_ids||[]} basketUnlocked={Boolean(roomData?.basket_unlocked)} totalInRoom={5} roomTitle="The Basement" />
    <CaseFilesModal
      isOpen={isCaseFilesOpen}
      onClose={()=>{setIsCaseFilesOpen(false);engineRef.current?.lock();}}
      clues={clues}
      basketUnlocked={Boolean(roomData?.basket_unlocked)}
      onOpenClue={clue => {
        setIsCaseFilesOpen(false);
        if (!roomData?.basket_unlocked) {
          showNotification('The evidence lock is sealed. Recover all 5 basement fragments first.');
          return;
        }
        if (clue.is_locked) {
          showNotification(clue.lock_reason || 'This clue is locked.');
          return;
        }
        if (clue.id === 'R1-10' && !isClueResolved(clues, 'R1-09')) {
          showNotification('Previous clue "R1-09" in this sequence must be solved first.');
          return;
        }
        if (clue.id === 'R1-FIN' && (!isClueResolved(clues, 'R1-09') || !isClueResolved(clues, 'R1-10'))) {
          showNotification('Final terminal locked. Solve R1-09 and R1-10 first.');
          return;
        }
        if (!clue.solved && (clue.attempts || 0) >= (clue.attempts_max || 3)) {
          showNotification('Maximum attempts exhausted for this clue.');
          return;
        }
        setActiveClue(clue);
        engineRef.current?.unlock();
      }}
    />
    <PhotoPuzzleModal isOpen={isPhotoPuzzleOpen} onClose={()=>{setIsPhotoPuzzleOpen(false);engineRef.current?.lock();}} photoCount={roomData?.photo_pieces_collected||0} requiredPieces={10} />
    <IntercomQrModal isOpen={Boolean(activeClue?.id==='R1-09')} {...clueModalProps}/>
    <ServerRackNoteModal isOpen={Boolean(activeClue?.id==='R1-10')} {...clueModalProps}/>
    <FinalContainmentTerminalModal isOpen={Boolean(activeClue?.id==='R1-FIN')} {...clueModalProps} onOpenHints={() => setIsHintOpen(true)} />
    <Round1VictoryModal isOpen={isCompleteOpen} onClose={()=>setIsCompleteOpen(false)} onProceed={()=>{setIsCompleteOpen(false);onProceedToLobby?.();showNotification('Round 1 complete. The subterranean vault seal is disengaged.');}} />
    <Round1DossierModal isOpen={isDossierOpen} onClose={()=>{setIsDossierOpen(false);engineRef.current?.lock();}} />
    <HintModal isOpen={isHintOpen} onClose={()=>{setIsHintOpen(false);engineRef.current?.lock();}} roomId="basement" roomTitle="The Basement" />

    {/* Survival Horror Staircase Jumpscare Overlay */}
    {isJumpscareActive && (
      <div
        className="jumpscare-overlay"
        role="alert"
        aria-live="assertive"
        data-testid="basement-jumpscare-modal"
      >
        <img
          src={jumpscareVisual || '/assets/jumpscare_entity.jpg'}
          onError={(e) => {
            if (e.target.src !== '/jumpscare_entity.jpg') {
              e.target.src = '/jumpscare_entity.jpg';
            }
          }}
          alt="Jumpscare Entity"
          className="jumpscare-image"
          data-testid="jumpscare-image"
        />
      </div>
    )}
  </div>;
}

import React, { useEffect, useRef, useState } from 'react';
import { createEngine } from './engine/engine.js';
import bedroomConfig from './rooms/bedroom.js';
import { GameAudio } from './engine/audio.js';
import HUD from './components/HUD.jsx';
import BasketModal from './components/BasketModal.jsx';
import ClueModal from './components/ClueModal.jsx';
import PhotoPuzzleModal from './components/PhotoPuzzleModal.jsx';
import CaseFilesModal from './components/CaseFilesModal.jsx';
import RoomCompleteModal from './components/RoomCompleteModal.jsx';
import Round1DossierModal from './components/Round1DossierModal.jsx';
import HintModal from './components/HintModal.jsx';
import './game.css';

export default function Room1Bedroom({ team, onLogout, onTransitionToRoom2 }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const audioRef = useRef(null);
  const roomDataRef = useRef(null);
  const handleInteractRef = useRef(null);
  const activeTargetRef = useRef(null);
  const searchBusyRef = useRef(false);
  const notificationTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // Game state
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [activeClue, setActiveClue] = useState(null);
  const [isPhotoPuzzleOpen, setIsPhotoPuzzleOpen] = useState(false);
  const [isCaseFilesOpen, setIsCaseFilesOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isRoomCompleteModalOpen, setIsRoomCompleteModalOpen] = useState(false);
  const [activeHoverPrompt, setActiveHoverPrompt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemNotification, setSystemNotification] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [flashOverlay, setFlashOverlay] = useState({ color: '#c40414', opacity: 0, visible: false });
  const [loadPct, setLoadPct] = useState(0);
  const [ghostPopActive, setGhostPopActive] = useState(false);
  const ghostPopTimerRef = useRef(null);
  const unmountedRef = useRef(false);

  // Fetch room data from backend (with live teammate sync detection)
  const fetchRoomState = async (silent = false) => {
    try {
      const res = await fetch('/api/game/room/bedroom', {
        credentials: 'include',
        headers: {
          'x-session-token': localStorage.getItem('ctc_token') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        const prevData = roomDataRef.current;
        setRoomData(data);
        roomDataRef.current = data;

        // Detect teammate actions and show live sync toast
        if (silent && prevData) {
          const prevFrags = prevData.collected_fragment_ids || [];
          const nextFrags = data.collected_fragment_ids || [];
          if (nextFrags.length > prevFrags.length) {
            showNotification(`Teammate recovered a photo fragment (${nextFrags.length}/${data.total_fragments_in_room || 4})!`);
            audioRef.current?.click?.();
          }
          if (!prevData.basket_unlocked && data.basket_unlocked) {
            showNotification('All photo pieces assembled by team!');
            audioRef.current?.good?.();
          }
          const prevSolved = (prevData.clues || []).filter((c) => c.solved).map((c) => c.id);
          const nextSolved = (data.clues || []).filter((c) => c.solved && !prevSolved.includes(c.id));
          if (nextSolved.length > 0) {
            showNotification(`Teammate solved ${nextSolved[0].title || nextSolved[0].id}!`);
            audioRef.current?.good?.();
          }
        }

        // If room is completed, animate door open
        if (data.is_completed && engineRef.current) {
          engineRef.current.openDoor?.();
        }
      }
    } catch (err) {
      if (!silent) console.error('Failed to load room state:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Direct window listener for Keyboard shortcuts (E = interact, B = basket, C = clues, P = photo)
  useEffect(() => {
    mountedRef.current = true;
    const handleGlobalKey = (e) => {
      const tag = (e.target?.tagName || document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }

      if (e.repeat) return;

      // E Key - Interact
      if (e.key === 'e' || e.key === 'E' || e.code === 'KeyE') {
        const target = activeTargetRef.current;
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleInteractRef.current?.(target);
          return;
        }
      }

      // B Key - Toggle Basket
      if (e.key === 'b' || e.key === 'B' || e.code === 'KeyB') {
        e.preventDefault();
        setIsBasketOpen((prev) => {
          const next = !prev;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
        return;
      }

      // C Key - Toggle Case Files / Clues Directory
      if (e.key === 'c' || e.key === 'C' || e.code === 'KeyC') {
        e.preventDefault();
        setIsCaseFilesOpen((prev) => {
          const next = !prev;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
        return;
      }

      // P Key - Toggle Photo Puzzle
      if (e.key === 'p' || e.key === 'P' || e.code === 'KeyP') {
        e.preventDefault();
        setIsPhotoPuzzleOpen((prev) => {
          const next = !prev;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
        return;
      }

      // R Key - Toggle Field Dossier & Round 1 Rules
      if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
        e.preventDefault();
        setIsDossierOpen((prev) => {
          const next = !prev;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
        return;
      }

      // H Key - Toggle Hints & Investigation Guidance
      if (e.key === 'h' || e.key === 'H' || e.code === 'KeyH') {
        e.preventDefault();
        setIsHintOpen((prev) => {
          const next = !prev;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKey, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKey, true);
    };
  }, []);

  useEffect(() => {
    fetchRoomState();
    const interval = setInterval(() => {
      fetchRoomState(true);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Three.js 3D Engine
  useEffect(() => {
    if (!mountRef.current || engineRef.current) return;

    audioRef.current = new GameAudio();

    try {
      const engine = createEngine(mountRef.current, bedroomConfig, {
        audio: audioRef.current,
        onFlash: (color, opacity = 0.78, durationMs = 200) => {
          setFlashOverlay({ color, opacity, visible: true });
          setTimeout(() => {
            setFlashOverlay((prev) => ({ ...prev, visible: false }));
          }, durationMs || 200);
        },
        onTarget: (targetId) => {
          activeTargetRef.current = targetId;
          if (targetId) {
            const labels = {
              nightstand: 'Inspect Bedside Nightstand',
              chair: 'Inspect Wooden Chair',
              desk: 'Inspect Study Desk',
              doll: 'Inspect Porcelain Doll',
              painting: 'Inspect Castle Painting',
              notebook: 'Inspect School Notebook',
              diary: 'Inspect Leather Diary',
              bed: 'Inspect Four-Poster Bed',
              clock: 'Inspect Torsion Pendulum Clock',
              wardrobe: 'Inspect Antique Wardrobe',
              bookshelf: 'Inspect Bookshelf',
              portrait: 'Inspect Victorian Portrait',
              poster: 'Inspect Celestial Poster',
              musicbox: 'Inspect Music Box',
              candle: 'Inspect Candlestick',
              photo_frame: 'Inspect Framed Photo',
              mirror: 'Inspect Baroque Mirror',
              trunk: 'Inspect trunk',
              pillow: 'Inspect Silk Pillows',
              lamp: 'Inspect Parlor Lamp'
            };
            if (targetId === 'room_door' || targetId === 'door') {
              if (roomDataRef.current?.is_completed) {
                setActiveHoverPrompt('Step into Corridor / Enter Room 2');
              } else {
                setActiveHoverPrompt('Inspect Locked Bedroom Door');
              }
            } else if (labels[targetId]) {
              setActiveHoverPrompt(labels[targetId]);
            } else {
              setActiveHoverPrompt(`Inspect ${targetId.replace('_', ' ')}`);
            }
          } else {
            setActiveHoverPrompt(null);
          }
        },
        onInteract: async (objectId) => {
          console.info("[ROOM1 ON_INTERACT RECEIVED]", objectId);
          handleInteractRef.current?.(objectId);
        },
        onLock: () => { }
      });

      // Unpause initially once started
      engine.setPaused(false);
      engineRef.current = engine;

      // If room was already completed, open door
      if (roomDataRef.current?.is_completed) {
        engine.openDoor?.();
      }
    } catch (err) {
      console.error('Three.js initialization failed:', err);
    }

    return () => {
      mountedRef.current = false;
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.dispose?.();
      }
    };
  }, []);

  // Play a weird, eerie ghost pop-out shriek + sub-bass impact when loading reaches 100%
  const playWeirdGhostScareSound = () => {
    try {
      if (audioMuted) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const t = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.42, t);
      master.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      master.connect(ctx.destination);

      // Pitch-gliding spectral shriek + dissonant horror harmonic
      [
        { type: 'sawtooth', f0: 290, f1: 1480, dur: 0.72, g: 0.35 },
        { type: 'square', f0: 311, f1: 920, dur: 0.72, g: 0.25 },
        { type: 'sine', f0: 95, f1: 28, dur: 0.55, g: 0.75 }
      ].forEach((cfg) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = cfg.type;
        osc.frequency.setValueAtTime(cfg.f0, t);
        osc.frequency.exponentialRampToValueAtTime(cfg.f1, t + cfg.dur * 0.45);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(cfg.g, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + cfg.dur);
        osc.connect(g);
        g.connect(master);
        osc.start(t);
        osc.stop(t + cfg.dur + 0.04);
      });
      setTimeout(() => { try { ctx.close?.(); } catch (_) {} }, 950);
    } catch (_) {
      // Ignore WebAudio restrictions in headless/test environments
    }
  };

  const triggerGhostPopAndEnter = () => {
    if (unmountedRef.current) return;
    setGhostPopActive(true);
    playWeirdGhostScareSound();
    clearTimeout(ghostPopTimerRef.current);
    ghostPopTimerRef.current = setTimeout(() => {
      if (!unmountedRef.current) setGhostPopActive(false);
    }, 720);
  };

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      clearTimeout(ghostPopTimerRef.current);
    };
  }, []);

  // Animate 0% -> 100% haunted loading bar and pop-out ghost on completion
  useEffect(() => {
    if (isStarted) return;
    let pct = 0;
    const iv = setInterval(() => {
      if (unmountedRef.current) {
        clearInterval(iv);
        return;
      }
      pct = Math.min(100, pct + 2.2);
      setLoadPct(Math.round(pct));
      if (pct >= 100) {
        clearInterval(iv);
        triggerGhostPopAndEnter();
        handleStartGame(true);
      }
    }, 55);
    return () => clearInterval(iv);
  }, [isStarted]);

  const handleStartGame = (skipPopSound = false) => {
    if (!skipPopSound) {
      triggerGhostPopAndEnter();
    }
    setIsStarted(true);
    if (audioRef.current) {
      audioRef.current.start(bedroomConfig.audio);
    }
    if (engineRef.current) {
      engineRef.current.setPaused(false);
      setTimeout(() => {
        engineRef.current?.lock();
      }, 50);
    }
  };

  // Handle interacting (E) with an object
  const handleInteract = async (objectId) => {
    if (!objectId || searchBusyRef.current) return;
    searchBusyRef.current = true;
    try {
      console.info("[ROOM1 HANDLE_INTERACT RUNNING FOR]", objectId);
      const currentData = roomDataRef.current;

      // Check if this is the Bedroom Exit Door
      if (objectId === 'room_door' || objectId === 'door') {
        if (currentData?.is_completed) {
          if (onTransitionToRoom2) {
            onTransitionToRoom2();
          } else {
            setIsRoomCompleteModalOpen(true);
            engineRef.current?.unlock();
          }
        } else {
          audioRef.current?.slam?.(0, 0);
          const solvedCount = currentData?.clues?.filter(c => c.solved)?.length || 0;
          showNotification(
            `The heavy corridor door is locked with four iron deadbolts. Solve all 4 case files in this room to unlock it (${solvedCount}/4 solved).`
          );
        }
        return;
      }

      // Trigger spectral wardrobe-opening jumpscare when inspecting/opening the antique wardrobe
      if (objectId === 'wardrobe') {
        engineRef.current?.triggerWardrobeScare?.();
      }

      // 1. If this is a Clue Entry object (Diary, Notebook, Poster, Portrait), open it
      const matchingClue = currentData?.clues?.find((c) => c.object_id === objectId);
      if (matchingClue) {
        if (!currentData?.basket_unlocked) {
          showNotification(
            "The arcane seal is unbroken. You must recover all 15 room fragments to unseal this case file."
          );
          return;
        }
        if (matchingClue.is_locked) {
          showNotification(
            matchingClue.lock_reason || "This clue is sealed. Complete the preceding clue in sequence first."
          );
          return;
        }
        setActiveClue(matchingClue);
        engineRef.current?.unlock();
        return;
      }

      // 2. Otherwise search for a hidden fragment in this furniture/prop
      let searchResult = null;
      try {
        const res = await fetch('/api/game/room/bedroom/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': localStorage.getItem('ctc_token') || ''
          },
          credentials: 'include',
          body: JSON.stringify({ object_id: objectId })
        });

        if (res.ok) {
          searchResult = await res.json();
          // If inspecting chair and nothing was found directly, search doll compartment for folded note EK01
          if ((!searchResult || !searchResult.found) && objectId === 'chair') {
            try {
              const dollRes = await fetch('/api/game/room/bedroom/search', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-session-token': localStorage.getItem('ctc_token') || ''
                },
                credentials: 'include',
                body: JSON.stringify({ object_id: 'doll' })
              });
              if (dollRes.ok) {
                const dollData = await dollRes.json();
                if (dollData && dollData.found) {
                  searchResult = dollData;
                }
              }
            } catch (_) {}
          }
          if (searchResult && searchResult.message) {
            showNotification(searchResult.message);
          }
          if (searchResult.found) {
            fetchRoomState();
            return;
          }
        }
      } catch (err) {
        console.error('Search request failed:', err);
      }
    } finally {
      searchBusyRef.current = false;
    }
  };
  handleInteractRef.current = handleInteract;

  // Submit Clue Answer
  const handleClueSubmit = async (clueId, answer) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/game/clue/${clueId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ctc_token') || ''
        },
        credentials: 'include',
        body: JSON.stringify({ answer })
      });

      if (res.ok) {
        const data = await res.json();
        fetchRoomState();
        setActiveClue((prev) => prev ? {
          ...prev,
          attempts: data.attempts ?? prev.attempts,
          solved: data.correct ?? prev.solved
        } : null);

        // Check if this submission finished Room 1
        if (data.room_completed) {
          engineRef.current?.openDoor?.();
          setIsRoomCompleteModalOpen(true);
        }

        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = typeof errData.detail === 'object' ? (errData.detail.message || JSON.stringify(errData.detail)) : (errData.detail || 'Submission failed');
        return {
          correct: false,
          message: errMsg
        };
      }
    } catch (err) {
      console.error('Submission failed:', err);
      return { correct: false, message: 'Server communication error' };
    } finally {
      setIsSubmitting(false);
    }
  };

  const showNotification = (msg) => {
    if (!mountedRef.current) return;
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setSystemNotification(msg);
    notificationTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setSystemNotification(null);
      }
    }, 4500);
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      const newMuted = !audioMuted;
      audioRef.current.setMuted(newMuted);
      setAudioMuted(newMuted);
    }
  };

  // Clues count calculations
  const cluesList = roomData?.clues || [];
  const roomCaseFiles = cluesList.filter(c => c.id && c.id.startsWith('R1-') && c.id !== 'R1-FIN');
  const cluesSolvedCount = roomCaseFiles.filter(c => c.solved).length;
  const totalCluesCount = roomCaseFiles.length || 4;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#07050d] select-none font-mono">
      {/* 3D Canvas Mounting Point */}
      <div
        ref={mountRef}
        onClick={() => {
          if (isStarted && engineRef.current && !activeClue && !isBasketOpen && !isPhotoPuzzleOpen && !isCaseFilesOpen && !isRoomCompleteModalOpen && !isDossierOpen && !isHintOpen) {
            engineRef.current.lock();
          }
        }}
        className="absolute inset-0 w-full h-full cursor-none"
      />

      {/* Atmospheric Overlays */}
      <div className="vig pointer-events-none" />
      <div className="grain pointer-events-none" />
      {flashOverlay.visible && (
        <div
          className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-75"
          style={{ backgroundColor: flashOverlay.color, opacity: flashOverlay.opacity }}
        />
      )}

      {/* Haunted 0–100% Loading Screen with Roaming Ghosts for Room 1 (Lena's Bedroom) */}
      {!isStarted && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#040208] text-[#e9e4f5] px-6 select-none">
          <style>{`
            @keyframes ghostRoamA { 0%{transform:translate(-38vw,18vh) scale(0.9)} 25%{transform:translate(-10vw,-22vh) scale(1.05)} 50%{transform:translate(34vw,-12vh) scale(0.95)} 75%{transform:translate(16vw,24vh) scale(1.1)} 100%{transform:translate(-38vw,18vh) scale(0.9)} }
            @keyframes ghostRoamB { 0%{transform:translate(36vw,22vh) scale(1)} 30%{transform:translate(4vw,8vh) scale(0.85)} 60%{transform:translate(-32vw,-18vh) scale(1.15)} 85%{transform:translate(-14vw,26vh) scale(0.9)} 100%{transform:translate(36vw,22vh) scale(1)} }
            @keyframes ghostRoamC { 0%{transform:translate(-26vw,-28vh) scale(0.85)} 40%{transform:translate(28vw,16vh) scale(1.1)} 75%{transform:translate(-8vw,28vh) scale(0.95)} 100%{transform:translate(-26vw,-28vh) scale(0.85)} }
            @keyframes ghostRoamD { 0%{transform:translate(24vw,-26vh) scale(0.8)} 50%{transform:translate(-30vw,12vh) scale(1.05)} 100%{transform:translate(24vw,-26vh) scale(0.8)} }
            @keyframes ghostLungePop { 0%{transform:scale(0.18) rotate(-4deg);opacity:0.2} 35%{transform:scale(1.14) rotate(2deg);opacity:1} 55%{transform:scale(1.03) rotate(-2deg);opacity:1} 75%{transform:scale(1.10) rotate(1.5deg);opacity:0.98} 100%{transform:scale(1.26) rotate(0deg);opacity:0} }
          `}</style>

          {/* Subtle radial vignette & giant backdrop Chapter I numeral */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.16)_0%,rgba(4,2,8,0.96)_72%)]" />
          <div className="pointer-events-none absolute right-[8%] top-1/2 -translate-y-1/2 font-serif text-[28rem] leading-none text-[#8f7bff]/[0.05]">I</div>

          {/* 4 Roaming Spectral Wraiths patrolling the dark loading void */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {[
              { anim: 'ghostRoamA 9s ease-in-out infinite', opacity: 0.42 },
              { anim: 'ghostRoamB 11s ease-in-out infinite', opacity: 0.36 },
              { anim: 'ghostRoamC 8s ease-in-out infinite', opacity: 0.30 },
              { anim: 'ghostRoamD 12s ease-in-out infinite', opacity: 0.28 }
            ].map((g, idx) => (
              <div key={idx} className="absolute left-1/2 top-1/2" style={{ animation: g.anim, opacity: g.opacity }}>
                <svg width="68" height="86" viewBox="0 0 68 86" className="drop-shadow-[0_0_16px_rgba(143,123,255,0.45)]">
                  <path d="M34 4 C16 4 8 18 8 36 L6 78 L16 68 L26 80 L34 69 L42 80 L52 68 L62 78 L60 36 C60 18 52 4 34 4 Z" fill="#171026" stroke="#8f7bff" strokeWidth="1.2" strokeOpacity="0.6" />
                  <circle cx="24" cy="31" r="4" fill="#ff2a2a" />
                  <circle cx="44" cy="31" r="4" fill="#ff2a2a" />
                  <ellipse cx="34" cy="48" rx="6" ry="9" fill="#06020a" stroke="#ff2a2a" strokeOpacity="0.45" strokeWidth="0.8" />
                </svg>
              </div>
            ))}
          </div>

          {/* Center Investigation Loading Card */}
          <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center gap-4">
            <p className="text-[11px] tracking-[0.28em] uppercase text-[#a78bfa]">
              CURSE THE CODE / ROOM 01
            </p>
            <h1 className="font-['Special_Elite',serif] text-5xl sm:text-6xl tracking-wide text-[#ff7a1a] drop-shadow-[0_0_24px_rgba(255,122,26,0.45)]">
              LENA&apos;S BEDROOM
            </h1>
            <p className="max-w-md text-xs sm:text-sm text-[#c4b5fd]/85 leading-relaxed">
              The floorboards creak beneath dried dust. Something still lingers in the shadows — rely on your flashlight.
            </p>

            {/* 0% -> 100% Haunted Progress Bar */}
            <div className="w-full max-w-md mt-2 space-y-2">
              <div className="flex justify-between text-[11px] tracking-widest uppercase text-[#cdbfff]/80">
                <span>
                  {loadPct < 30
                    ? 'UNSEALING OAK BEDROOM DOOR...'
                    : loadPct < 65
                      ? 'ENTITIES STIRRING IN THE DARK...'
                      : loadPct < 92
                        ? 'SOMETHING IS APPROACHING...'
                        : 'IT IS RIGHT BEHIND YOU...'}
                </span>
                <span className="font-bold text-[#ff7a1a]">{loadPct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full border border-[#8f7bff]/40 bg-[#0d0817] p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6d28d9] via-[#a855f7] to-[#ff4d1a] transition-all duration-75 shadow-[0_0_12px_rgba(255,122,26,0.7)]"
                  style={{ width: `${loadPct}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[11px] text-[#a78bfa]/75 mt-1">
              <span><b>W A S D</b> Move</span>
              <span><b>Mouse</b> Look</span>
              <span><b>F</b> Flashlight</span>
              <span><b>E</b> Inspect</span>
              <span><b>B / C / P</b> Case Tools</span>
            </div>

            <button
              onClick={() => handleStartGame(false)}
              className="mt-2 px-7 py-3 rounded-lg border border-[#ff7a1a]/70 bg-[#1a0f26]/90 text-xs tracking-[0.2em] uppercase text-[#ff9f5a] hover:bg-[#ff7a1a]/20 hover:border-[#ff7a1a] transition-all shadow-[0_0_20px_rgba(255,122,26,0.25)]"
            >
              CLICK TO ENTER ROOM
            </button>
          </div>
        </div>
      )}

      {/* 100% Loading Pop-Out Ghost Face Overlay */}
      {ghostPopActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/85 overflow-hidden" aria-hidden="true">
          <style>{`@keyframes ghostLungePop { 0%{transform:scale(0.18) rotate(-4deg);opacity:0.2} 35%{transform:scale(1.14) rotate(2deg);opacity:1} 55%{transform:scale(1.03) rotate(-2deg);opacity:1} 75%{transform:scale(1.10) rotate(1.5deg);opacity:0.98} 100%{transform:scale(1.26) rotate(0deg);opacity:0} }`}</style>
          <svg
            viewBox="0 0 240 280"
            className="w-[82vmin] h-[90vmin] drop-shadow-[0_0_60px_rgba(255,20,20,0.85)]"
            style={{ animation: 'ghostLungePop 720ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          >
            <path d="M120 12 C58 12 24 58 24 120 L18 258 L54 226 L86 266 L120 228 L154 266 L186 226 L222 258 L216 120 C216 58 182 12 120 12 Z" fill="#0d0714" stroke="#8f7bff" strokeWidth="2.5" strokeOpacity="0.65" />
            <ellipse cx="80" cy="108" rx="22" ry="18" fill="#030005" />
            <ellipse cx="160" cy="108" rx="22" ry="18" fill="#030005" />
            <circle cx="80" cy="108" r="9" fill="#ff1a1a" />
            <circle cx="160" cy="108" r="9" fill="#ff1a1a" />
            <circle cx="80" cy="108" r="3" fill="#ffffff" />
            <circle cx="160" cy="108" r="3" fill="#ffffff" />
            <path d="M74 156 Q120 144 166 156 Q158 228 120 232 Q82 228 74 156 Z" fill="#050008" stroke="#ff1a1a" strokeWidth="2" strokeOpacity="0.7" />
            <path d="M84 158 L92 178 L100 156 L110 180 L120 155 L130 180 L140 156 L148 178 L156 158" fill="none" stroke="#e2d8f0" strokeWidth="2.5" />
          </svg>
        </div>
      )}

      {/* Floating System Notification */}
      {systemNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#160f26]/95 backdrop-blur-md px-6 py-3 rounded-xl border border-[#8f7bff]/60 shadow-2xl text-xs font-mono text-[#e8e0ff] max-w-lg text-center animate-fade-in pointer-events-none">
          {systemNotification}
        </div>
      )}

      {/* HUD Layer */}
      {isStarted && (
        <HUD
          roomTitle={roomData?.title || "Lena's Bedroom"}
          totalFragments={roomData?.total_fragments_in_room || 15}
          collectedCount={roomData?.collected_fragment_ids?.length || 0}
          basketUnlocked={Boolean(roomData?.basket_unlocked)}
          isRoomCompleted={Boolean(roomData?.is_completed)}
          photoCount={roomData?.photo_pieces_collected || 0}
          cluesSolved={cluesSolvedCount}
          totalClues={totalCluesCount}
          onOpenBasket={() => {
            setIsBasketOpen(true);
            engineRef.current?.unlock();
          }}
          onOpenCaseFiles={() => {
            setIsCaseFilesOpen(true);
            engineRef.current?.unlock();
          }}
          onOpenPhotoPuzzle={() => {
            setIsPhotoPuzzleOpen(true);
            engineRef.current?.unlock();
          }}
          onOpenRules={() => {
            setIsDossierOpen(true);
            engineRef.current?.unlock();
          }}
          onOpenHints={() => {
            setIsHintOpen(true);
            engineRef.current?.unlock();
          }}
          onLogout={onLogout}
          audioMuted={audioMuted}
          onToggleAudio={toggleAudio}
          activeHoverPrompt={activeHoverPrompt}
        />
      )}

      {/* Modals */}
      <BasketModal
        isOpen={isBasketOpen}
        onClose={() => {
          setIsBasketOpen(false);
          engineRef.current?.lock();
        }}
        evidence={roomData?.evidence || []}
        collectedIds={roomData?.collected_fragment_ids || []}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        totalInRoom={roomData?.total_fragments_in_room || 15}
        roomTitle={roomData?.title}
      />

      <CaseFilesModal
        isOpen={isCaseFilesOpen}
        onClose={() => {
          setIsCaseFilesOpen(false);
          engineRef.current?.lock();
        }}
        clues={roomData?.clues || []}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        onOpenClue={(clue) => {
          setIsCaseFilesOpen(false);
          if (!roomData?.basket_unlocked) {
            showNotification("Arcane seal unbroken: Gather all 15 room fragments to inspect this clue terminal.");
            return;
          }
          if (clue.is_locked) {
            showNotification(clue.lock_reason || "This clue is locked. Complete the preceding clue in sequence first.");
            return;
          }
          setActiveClue(clue);
          engineRef.current?.unlock();
        }}
      />

      <ClueModal
        isOpen={Boolean(activeClue)}
        onClose={() => {
          setActiveClue(null);
          engineRef.current?.lock();
        }}
        clue={activeClue}
        evidence={roomData?.evidence || []}
        onSubmitAnswer={handleClueSubmit}
        isSubmitting={isSubmitting}
      />

      <PhotoPuzzleModal
        isOpen={isPhotoPuzzleOpen}
        onClose={() => {
          setIsPhotoPuzzleOpen(false);
          engineRef.current?.lock();
        }}
        photoCount={roomData?.photo_pieces_collected || 0}
        requiredPieces={10}
      />

      <RoomCompleteModal
        isOpen={isRoomCompleteModalOpen}
        onClose={() => {
          setIsRoomCompleteModalOpen(false);
          engineRef.current?.lock();
        }}
        onProceedToDoor={() => {
          setIsRoomCompleteModalOpen(false);
          engineRef.current?.lock();
          if (onTransitionToRoom2) {
            onTransitionToRoom2();
          } else {
            showNotification("Head to the unlatched door at the front of the room to step into Room 2.");
          }
        }}
      />

      <Round1DossierModal
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false);
          engineRef.current?.lock();
        }}
      />
      <HintModal
        isOpen={isHintOpen}
        onClose={() => {
          setIsHintOpen(false);
          engineRef.current?.lock();
        }}
        roomId="bedroom"
        roomTitle="Lena's Bedroom"
      />
    </div>
  );
}

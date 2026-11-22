import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createEngine } from './engine/engine.js';
import bedroomConfig from './rooms/bedroom.js';
import { GameAudio } from './engine/audio.js';
import { isBedroomLowDetail, rememberBedroomQuality } from './engine/studyPerformance.js';
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
  const [bedroomQuality, setBedroomQuality] = useState(() => isBedroomLowDetail() ? 'low' : 'balanced');
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
  const unmountedRef = useRef(false);

  const isAnyModalOpen = Boolean(
    activeClue ||
    isBasketOpen ||
    isCaseFilesOpen ||
    isPhotoPuzzleOpen ||
    isDossierOpen ||
    isHintOpen ||
    isRoomCompleteModalOpen
  );

  // Suspend 3D render loop when any modal is open (matching Room 2 Study zero-lag behavior)
  useEffect(() => {
    if (!isStarted) return;
    engineRef.current?.setPaused(isAnyModalOpen);
  }, [isStarted, isAnyModalOpen]);

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
        const dataChanged = JSON.stringify(data) !== JSON.stringify(prevData);
        if (dataChanged) {
          setRoomData(data);
          roomDataRef.current = data;
        }

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

          // Live Teammate Hint Sync detection
          if (data.hint_sync) {
            const prevUsed = Number(prevData.hint_sync?.hints_used || 0);
            const nextUsed = Number(data.hint_sync.hints_used || 0);
            if (nextUsed > prevUsed) {
              const target = data.hint_sync.latest_target_id || 'this chamber';
              showNotification(`Teammate unlocked a hint (${target}). Press H to view!`);
              audioRef.current?.click?.();
            }
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
        onQualityChange: (mode) => {
          setBedroomQuality(mode);
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

  const handleStartGame = () => {
    setIsStarted(true);
    if (audioRef.current) {
      audioRef.current.start(bedroomConfig.audio);
    }
    if (engineRef.current) {
      engineRef.current.setBedroomQuality?.(bedroomQuality);
      engineRef.current.setPaused(false);
      setTimeout(() => {
        engineRef.current?.lock();
      }, 50);
    }
  };

  const handleCloseBasket = useCallback(() => {
    setIsBasketOpen(false);
    engineRef.current?.lock();
  }, []);

  const handleCloseCaseFiles = useCallback(() => {
    setIsCaseFilesOpen(false);
    engineRef.current?.lock();
  }, []);

  const handleCloseClue = useCallback(() => {
    setActiveClue(null);
    engineRef.current?.lock();
  }, []);

  const handleClosePhotoPuzzle = useCallback(() => {
    setIsPhotoPuzzleOpen(false);
    engineRef.current?.lock();
  }, []);

  const handleCloseRoomComplete = useCallback(() => {
    setIsRoomCompleteModalOpen(false);
    engineRef.current?.lock();
  }, []);

  const handleCloseDossier = useCallback(() => {
    setIsDossierOpen(false);
    engineRef.current?.lock();
  }, []);

  const handleCloseHint = useCallback(() => {
    setIsHintOpen(false);
    engineRef.current?.lock();
  }, []);

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

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[11px] text-[#a78bfa]/75 mt-2">
              <span><b>W A S D</b> Move</span>
              <span><b>Mouse</b> Look</span>
              <span><b>F</b> Flashlight</span>
              <span><b>E</b> Inspect</span>
              <span><b>B / C / P / H</b> Investigation Tools</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-[#a78bfa]/80 mt-1">
              <span>Detail:</span>
              <button
                type="button"
                onClick={() => {
                  setBedroomQuality('balanced');
                  rememberBedroomQuality(false);
                }}
                className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                  bedroomQuality === 'balanced'
                    ? 'border-[#8f7bff] bg-[#8f7bff]/20 text-[#e8e0ff] font-bold'
                    : 'border-[#3b2a59] text-[#a292cc] hover:text-white'
                }`}
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => {
                  setBedroomQuality('low');
                  rememberBedroomQuality(true);
                }}
                className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                  bedroomQuality === 'low'
                    ? 'border-[#ff7a1a] bg-[#ff7a1a]/20 text-[#ffd8bc] font-bold'
                    : 'border-[#3b2a59] text-[#a292cc] hover:text-[#ff9f5a]'
                }`}
              >
                Low (Potato PCs)
              </button>
            </div>

            <button
              onClick={handleStartGame}
              className="mt-3 px-8 py-3.5 rounded-lg border border-[#ff7a1a]/70 bg-[#1a0f26]/90 text-xs font-semibold tracking-[0.25em] uppercase text-[#ff9f5a] hover:bg-[#ff7a1a]/20 hover:border-[#ff7a1a] transition-all shadow-[0_0_20px_rgba(255,122,26,0.35)]"
            >
              CLICK TO ENTER ROOM
            </button>
          </div>
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
          qualityControl={
            <div className="hidden sm:flex items-center gap-1 bg-[#0a0714]/85 backdrop-blur-md px-2 py-1 rounded-xl border border-[#3b2a59] text-[11px] font-mono shadow-lg shrink-0">
              <button
                type="button"
                onClick={() => {
                  setBedroomQuality('balanced');
                  rememberBedroomQuality(false);
                  engineRef.current?.setBedroomQuality?.('balanced');
                }}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  bedroomQuality === 'balanced'
                    ? 'bg-[#8f7bff]/30 text-[#e8e0ff] font-bold border border-[#8f7bff]/60'
                    : 'text-[#a292cc] hover:text-white'
                }`}
                title="Balanced graphics quality"
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => {
                  setBedroomQuality('low');
                  rememberBedroomQuality(true);
                  engineRef.current?.setBedroomQuality?.('low');
                }}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  bedroomQuality === 'low'
                    ? 'bg-[#ff7a1a]/30 text-[#ffd8bc] font-bold border border-[#ff7a1a]/60'
                    : 'text-[#a292cc] hover:text-[#ff9f5a]'
                }`}
                title="Low detail mode for older / low-spec PCs"
              >
                Low (Potato PCs)
              </button>
            </div>
          }
        />
      )}

      {/* Modals */}
      <BasketModal
        isOpen={isBasketOpen}
        onClose={handleCloseBasket}
        evidence={roomData?.evidence || []}
        collectedIds={roomData?.collected_fragment_ids || []}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        totalInRoom={roomData?.total_fragments_in_room || 15}
        roomTitle={roomData?.title}
      />

      <CaseFilesModal
        isOpen={isCaseFilesOpen}
        onClose={handleCloseCaseFiles}
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
        onClose={handleCloseClue}
        clue={activeClue}
        evidence={roomData?.evidence || []}
        onSubmitAnswer={handleClueSubmit}
        isSubmitting={isSubmitting}
      />

      <PhotoPuzzleModal
        isOpen={isPhotoPuzzleOpen}
        onClose={handleClosePhotoPuzzle}
        photoCount={roomData?.photo_pieces_collected || 0}
        requiredPieces={10}
      />

      <RoomCompleteModal
        isOpen={isRoomCompleteModalOpen}
        onClose={handleCloseRoomComplete}
        onProceedToDoor={() => {
          handleCloseRoomComplete();
          if (onTransitionToRoom2) {
            onTransitionToRoom2();
          } else {
            showNotification("Head to the unlatched door at the front of the room to step into Room 2.");
          }
        }}
      />

      <Round1DossierModal
        isOpen={isDossierOpen}
        onClose={handleCloseDossier}
      />
      <HintModal
        isOpen={isHintOpen}
        onClose={handleCloseHint}
        roomId="bedroom"
        roomTitle="Lena's Bedroom"
      />
    </div>
  );
}

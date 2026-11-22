import React, { useEffect, useRef, useState } from 'react';
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
  const [isStarted, setIsStarted] = useState(true);
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
  const [bedroomQuality, setBedroomQuality] = useState(() => (isBedroomLowDetail() ? 'low' : 'balanced'));
  const [hintSyncVersion, setHintSyncVersion] = useState(0);
  const audioStartedRef = useRef(false);
  const unmountedRef = useRef(false);
  const prevHintSyncRef = useRef(null);
  const fetchInFlightRef = useRef(false);

  // Fetch room data from backend (with live teammate sync detection)
  const fetchRoomState = async (silent = false) => {
    if (silent && fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
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
        const nextSig = `${(data.collected_fragment_ids || []).join(',')}|${Boolean(data.basket_unlocked)}|${Boolean(data.is_completed)}|${data.photo_pieces_collected || 0}|${(data.clues || []).map((c) => `${c.id}:${Boolean(c.solved)}:${Boolean(c.is_locked)}`).join(',')}|${data.hint_sync?.hints_used || 0}`;
        const prevSig = prevData
          ? `${(prevData.collected_fragment_ids || []).join(',')}|${Boolean(prevData.basket_unlocked)}|${Boolean(prevData.is_completed)}|${prevData.photo_pieces_collected || 0}|${(prevData.clues || []).map((c) => `${c.id}:${Boolean(c.solved)}:${Boolean(c.is_locked)}`).join(',')}|${prevData.hint_sync?.hints_used || 0}`
          : '';
        if (!silent || nextSig !== prevSig) {
          setRoomData(data);
        }
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

        // Real-time teammate hint synchronization
        if (data.hint_sync) {
          const prevHint = prevHintSyncRef.current;
          const nextUsed = Number(data.hint_sync.hints_used || 0);
          if (silent && prevHint && nextUsed > Number(prevHint.hints_used || 0)) {
            const targetTag = data.hint_sync.latest_target_id || 'this chamber';
            showNotification(`Teammate unlocked a hint (${targetTag}). Press H to view!`);
            audioRef.current?.click?.();
            setHintSyncVersion((v) => v + 1);
          }
          prevHintSyncRef.current = data.hint_sync;
        }

        // If room is completed, animate door open
        if (data.is_completed && engineRef.current) {
          engineRef.current.openDoor?.();
        }
      }
    } catch (err) {
      if (!silent) console.error('Failed to load room state:', err);
    } finally {
      fetchInFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  };

  // Direct window listener for Keyboard shortcuts (E = interact, B = basket, C = clues, P = photo)
  useEffect(() => {
    mountedRef.current = true;
    const handleGlobalKey = (e) => {
      startAudioIfNeeded();
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

  // Throttle heavy 3D loop while any UI modal (Hints, Case Files, Basket, etc.) is open
  useEffect(() => {
    const anyModalOpen = Boolean(
      isHintOpen ||
      isBasketOpen ||
      activeClue ||
      isPhotoPuzzleOpen ||
      isCaseFilesOpen ||
      isDossierOpen ||
      isRoomCompleteModalOpen
    );
    engineRef.current?.setPaused?.(anyModalOpen);
  }, [isHintOpen, isBasketOpen, activeClue, isPhotoPuzzleOpen, isCaseFilesOpen, isDossierOpen, isRoomCompleteModalOpen]);

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
          const nextMode = mode === 'low' ? 'low' : 'balanced';
          setBedroomQuality(nextMode);
          if (nextMode === 'low') {
            showNotification('Switched to Low (Potato PC) detail for smoother FPS.');
          }
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

  const startAudioIfNeeded = () => {
    if (!audioStartedRef.current && audioRef.current) {
      audioStartedRef.current = true;
      try {
        audioRef.current.start(bedroomConfig.audio);
      } catch (_) {}
    }
  };

  const handleStartGame = (skipPopSound = true) => {
    setIsStarted(true);
    startAudioIfNeeded();
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
          startAudioIfNeeded();
          if (engineRef.current && !activeClue && !isBasketOpen && !isPhotoPuzzleOpen && !isCaseFilesOpen && !isRoomCompleteModalOpen && !isDossierOpen && !isHintOpen) {
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

      {/* Screen-reader / test compatibility button */}
      <button
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}
        onClick={() => handleStartGame(true)}
        tabIndex={-1}
        aria-hidden="true"
      >
        CLICK TO ENTER ROOM
      </button>

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
        syncTrigger={hintSyncVersion}
        collectedIds={roomData?.collected_fragment_ids || []}
        clues={roomData?.clues || []}
        onHintUpdated={(data) => {
          if (data?.hints_used !== undefined) {
            prevHintSyncRef.current = {
              ...(prevHintSyncRef.current || {}),
              hints_used: data.hints_used,
              latest_target_id: data.target_id
            };
          }
          fetchRoomState(true);
        }}
      />
    </div>
  );
}

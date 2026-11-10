import React, { useEffect, useRef, useState } from 'react';
import { createEngine } from './engine/engine.js';
import studyConfig from './rooms/study.js';
import { GameAudio } from './engine/audio.js';
import HUD from './components/HUD.jsx';
import BasketModal from './components/BasketModal.jsx';
import CaseFilesModal from './components/CaseFilesModal.jsx';
import PhotoPuzzleModal from './components/PhotoPuzzleModal.jsx';
import TabletPasscodeModal from './components/study/TabletPasscodeModal.jsx';
import CrtEmailModal from './components/study/CrtEmailModal.jsx';
import CrashDumpModal from './components/study/CrashDumpModal.jsx';
import LinePrinterModal from './components/study/LinePrinterModal.jsx';
import StudyCompleteModal from './components/study/StudyCompleteModal.jsx';
import Round1DossierModal from './components/Round1DossierModal.jsx';
import HintModal from './components/HintModal.jsx';
import './game.css';

export default function Room2Study({
  team,
  onLogout,
  onTransitionToRoom1,
  onTransitionToRoom3
}) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const audioRef = useRef(null);
  const roomDataRef = useRef(null);
  const handleInteractRef = useRef(null);
  const activeTargetRef = useRef(null);

  // Game state
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isCaseFilesOpen, setIsCaseFilesOpen] = useState(false);
  const [isPhotoPuzzleOpen, setIsPhotoPuzzleOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isStudyCompleteModalOpen, setIsStudyCompleteModalOpen] = useState(false);
  const [activeClueModal, setActiveClueModal] = useState(null); // 'R1-05' | 'R1-06' | 'R1-07' | 'R1-08'
  const [activeHoverPrompt, setActiveHoverPrompt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemNotification, setSystemNotification] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [crtFlicker, setCrtFlicker] = useState(false);

  // Fetch initial room data from backend
  const fetchRoomState = async () => {
    try {
      const res = await fetch('/api/game/room/study', {
        credentials: 'include',
        headers: {
          'x-session-token': localStorage.getItem('ctc_token') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRoomData(data);
        roomDataRef.current = data;

        // If room is completed, animate blast door open
        if (data.is_completed && engineRef.current) {
          engineRef.current.openDoor?.();
        }
      }
    } catch (err) {
      console.error('Failed to load study room state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Global keyboard shortcuts (E, B, C, P)
  useEffect(() => {
    const handleGlobalKey = (e) => {
      const tag = (e.target?.tagName || document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }

      // E Key - Interact
      if (e.key === 'e' || e.key === 'E' || e.code === 'KeyE') {
        const target = activeTargetRef.current;
        if (target) {
          e.preventDefault();
          e.stopPropagation();
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

      // C Key - Toggle Case Files / Clues
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
    return () => window.removeEventListener('keydown', handleGlobalKey, true);
  }, []);

  // CRT Glitch Flicker Interval (respects reduced motion)
  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReduced) return;

    const flickerInterval = setInterval(() => {
      setCrtFlicker(true);
      setTimeout(() => setCrtFlicker(false), 150);
    }, 12000 + Math.random() * 8000);

    return () => clearInterval(flickerInterval);
  }, []);

  // Random binaural whisper interval
  useEffect(() => {
    const whisperInterval = setInterval(() => {
      if (audioRef.current && !audioMuted) {
        audioRef.current.whisper?.('whisper_study', (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
      }
    }, 25000 + Math.random() * 15000);

    return () => clearInterval(whisperInterval);
  }, [audioMuted]);

  // Notification helper
  const showNotification = (msg) => {
    setSystemNotification(msg);
    setTimeout(() => {
      setSystemNotification((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  // Main interaction handler
  const handleInteract = async (objectId) => {
    const currentData = roomDataRef.current;

// No return door to Room 1 (Room 2 only exits forward to Room 3)

    // 2. Check if this is the Basement Exit Door
    if (objectId === 'study_door_exit' || objectId === 'exit_door') {
      if (currentData?.is_completed) {
        if (onTransitionToRoom3) {
          onTransitionToRoom3();
        } else {
          setIsStudyCompleteModalOpen(true);
          engineRef.current?.unlock();
        }
      } else {
        const solvedCount = currentData?.clues?.filter((c) => c.solved)?.length || 0;
        showNotification(
          `The heavy steel blast door is deadbolted with pneumatic locks. Solve all 4 study clues to unlatch it (${solvedCount}/4 solved).`
        );
      }
      return;
    }

    // 3. Search for evidence fragment
    let searchResult = null;
    try {
      const res = await fetch('/api/game/room/study/search', {
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
        if (searchResult && searchResult.message) {
          showNotification(searchResult.message);
        }
        if (searchResult.found) {
          fetchRoomState();
          return;
        }
      }
    } catch (err) {
      console.error('Study search request failed:', err);
    }

    // 4. Check if this is a clue entry prop
    const matchingClue = currentData?.clues?.find((c) => c.object_id === objectId);
    if (matchingClue) {
      if (!currentData?.basket_unlocked) {
        showNotification(
          "Arcane seal unbroken: Recover all 16 study fragments to inspect this clue terminal."
        );
        return;
      }
      if (matchingClue.is_locked) {
        showNotification(
          matchingClue.lock_reason || "This clue is sealed. Complete the preceding clue in sequence first."
        );
        return;
      }
      setActiveClueModal(matchingClue.id);
      engineRef.current?.unlock();
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
        await fetchRoomState();

        // Check if this submission completed the room
        if (data.room_completed || data.is_completed) {
          engineRef.current?.openDoor?.();
          audioRef.current?.slam?.(0, -3);
          setIsStudyCompleteModalOpen(true);
        }

        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        return {
          correct: false,
          message: typeof errData.detail === 'string' ? errData.detail : errData.detail?.message || 'Submission failed'
        };
      }
    } catch (err) {
      console.error('Study submission failed:', err);
      return { correct: false, message: 'Server communication error' };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize Three.js Engine and Audio
  useEffect(() => {
    fetchRoomState();

    if (!mountRef.current) return;

    const audio = new GameAudio();
    audioRef.current = audio;

    const engine = createEngine(mountRef.current, studyConfig, {
      audio: audioRef.current,
      onInteract: (targetId) => {
        handleInteractRef.current?.(targetId);
      },
      onTarget: (targetId) => {
        activeTargetRef.current = targetId;
        if (!targetId) {
          setActiveHoverPrompt(null);
          return;
        }

        const data = roomDataRef.current;
        if (targetId === 'study_door_exit') {
          if (data?.is_completed) {
            setActiveHoverPrompt('Step into Subterranean Bunker / Enter Room 3 [E]');
          } else {
            setActiveHoverPrompt('Basement Blast Door [Deadbolted]');
          }
          return;
        }

        const interactInfo = studyConfig.interact?.[targetId];
        if (interactInfo) {
          setActiveHoverPrompt(`${interactInfo.label} [E]`);
        } else {
          setActiveHoverPrompt(`Inspect ${targetId} [E]`);
        }
      }
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      audio.dispose();
    };
  }, []);

  const handleStartGame = () => {
    setIsStarted(true);
    audioRef.current?.start?.({
      crtHum: true,
      typewriter: true,
      whisperCooldown: 35
    });
    engineRef.current?.lock();
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    const next = !audioMuted;
    setAudioMuted(next);
    audioRef.current.setMuted(next);
  };

  const activeClueObj = roomData?.clues?.find((c) => c.id === activeClueModal);

  // Clues count calculations
  const cluesList = roomData?.clues || [];
  const cluesSolvedCount = cluesList.filter((c) => c.solved).length;
  const totalCluesCount = cluesList.length || 4;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#04120b] select-none">
      
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* 6% Scanline Overlay */}
      <div 
        data-testid="scanline-overlay"
        className="pointer-events-none fixed inset-0 z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-[0.06]" 
      />

      {/* Random CRT Glitch Flicker Overlay */}
      {crtFlicker && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-[#3dff8b]/5 mix-blend-screen" />
      )}

      {/* Start Game / Click to Enter Overlay */}
      {!isStarted && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center font-mono">
          <div className="max-w-md p-8 bg-[#04120b] border-2 border-[#1c4a2e] rounded-2xl shadow-[0_0_60px_rgba(61,255,139,0.25)] space-y-6">
            <h1 className="text-3xl font-black text-[#b6ffd1] tracking-widest uppercase">
              DANIEL'S STUDY
            </h1>
            <p className="text-xs text-[#7dffb0] leading-relaxed">
              Green CRT phosphors illuminate cold mahogany and tangled ribbon cables. Search the hacker's sanctuary, recover all 16 evidence scraps, and breach the subterranean blast door.
            </p>
            <button
              onClick={handleStartGame}
              className="w-full py-3.5 bg-gradient-to-r from-[#174728] to-[#2b6641] hover:from-[#206037] hover:to-[#3dff8b] text-[#b6ffd1] hover:text-[#04120b] rounded-xl font-bold text-sm tracking-widest uppercase transition shadow-lg shadow-[#3dff8b]/20 border border-[#3dff8b]/50"
            >
              CLICK TO ENTER ROOM
            </button>
            <div className="text-[11px] text-[#428059]">
              WASD: Move • Mouse: Look • E: Search / Inspect • B: Basket • C: Clues • P: Photo
            </div>
          </div>
        </div>
      )}

      {/* In-Game HUD */}
      {isStarted && (
        <HUD
          roomTitle={roomData?.title || "Daniel's Study"}
          collectedCount={roomData?.collected_fragment_ids?.length || 0}
          totalFragments={roomData?.total_fragments_in_room || 16}
          photoCount={roomData?.photo_pieces_collected || (roomData?.photo_piece_ids?.length || 0)}
          cluesSolved={cluesSolvedCount}
          totalClues={totalCluesCount}
          basketUnlocked={Boolean(roomData?.basket_unlocked)}
          isRoomCompleted={Boolean(roomData?.is_completed)}
          completedMessage="ROOM 2 COMPLETE • BLAST DOOR TO ROOM 3 UNLATCHED"
          team={team}
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

      {/* System Toast Notifications */}
      {systemNotification && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-[#04120b]/95 border border-[#3dff8b] text-[#b6ffd1] rounded-xl font-mono text-xs shadow-2xl tracking-wide max-w-lg text-center backdrop-blur-md">
          {systemNotification}
        </div>
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
        totalInRoom={roomData?.total_fragments_in_room || 16}
        roomTitle={roomData?.title || "Daniel's Study"}
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
            showNotification("Arcane seal unbroken: Recover all 16 study fragments to inspect this clue terminal.");
            return;
          }
          if (clue.is_locked) {
            showNotification(
              clue.lock_reason || "This clue is locked. Complete the preceding clue in sequence first."
            );
            return;
          }
          setActiveClueModal(clue.id);
          engineRef.current?.unlock();
        }}
      />

      <PhotoPuzzleModal
        isOpen={isPhotoPuzzleOpen}
        onClose={() => {
          setIsPhotoPuzzleOpen(false);
          engineRef.current?.lock();
        }}
        photoCount={roomData?.photo_pieces_collected || (roomData?.photo_piece_ids?.length || 0)}
        requiredPieces={10}
      />

      {/* Clue Modals */}
      {activeClueModal === 'R1-05' && (
        <TabletPasscodeModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            engineRef.current?.lock();
          }}
          clue={activeClueObj}
          evidence={roomData?.evidence || []}
          onSubmitAnswer={handleClueSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {activeClueModal === 'R1-06' && (
        <CrtEmailModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            engineRef.current?.lock();
          }}
          clue={activeClueObj}
          evidence={roomData?.evidence || []}
          onSubmitAnswer={handleClueSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {activeClueModal === 'R1-07' && (
        <CrashDumpModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            engineRef.current?.lock();
          }}
          clue={activeClueObj}
          evidence={roomData?.evidence || []}
          onSubmitAnswer={handleClueSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {activeClueModal === 'R1-08' && (
        <LinePrinterModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            engineRef.current?.lock();
          }}
          clue={activeClueObj}
          evidence={roomData?.evidence || []}
          onSubmitAnswer={handleClueSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Study Complete Celebration Modal */}
      <StudyCompleteModal
        isOpen={isStudyCompleteModalOpen}
        onClose={() => {
          setIsStudyCompleteModalOpen(false);
          engineRef.current?.lock();
        }}
        solvedCount={roomData?.clues?.filter((c) => c.solved)?.length || 4}
        photoCount={roomData?.photo_pieces_collected || (roomData?.photo_piece_ids?.length || 8)}
        onProceedToDoor={() => {
          setIsStudyCompleteModalOpen(false);
          engineRef.current?.lock();
          showNotification("Head to the unbolted blast door at the north wall to enter Room 3 (The Basement).");
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
        roomId="study"
        roomTitle="Daniel's Study"
      />
    </div>
  );
}

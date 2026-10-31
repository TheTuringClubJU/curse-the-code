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
import './game.css';

export default function Room1Bedroom({ team, onLogout }) {
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
  const [activeClue, setActiveClue] = useState(null);
  const [isPhotoPuzzleOpen, setIsPhotoPuzzleOpen] = useState(false);
  const [isCaseFilesOpen, setIsCaseFilesOpen] = useState(false);
  const [isRoomCompleteModalOpen, setIsRoomCompleteModalOpen] = useState(false);
  const [activeHoverPrompt, setActiveHoverPrompt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemNotification, setSystemNotification] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);

  // Fetch initial room data from backend
  const fetchRoomState = async () => {
    try {
      const res = await fetch('/api/game/room/bedroom', {
        credentials: 'include',
        headers: {
          'x-session-token': localStorage.getItem('ctc_token') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRoomData(data);
        roomDataRef.current = data;

        // If room is completed, animate door open
        if (data.is_completed && engineRef.current) {
          engineRef.current.openDoor?.();
        }
      }
    } catch (err) {
      console.error('Failed to load room state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Direct window listener for Keyboard shortcuts (E = interact, B = basket, C = clues, P = photo)
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
    };

    window.addEventListener('keydown', handleGlobalKey, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKey, true);
    };
  }, []);

  useEffect(() => {
    fetchRoomState();
  }, []);

  // Initialize Three.js 3D Engine
  useEffect(() => {
    if (!mountRef.current || engineRef.current) return;

    audioRef.current = new GameAudio();

    try {
      const engine = createEngine(mountRef.current, bedroomConfig, {
        audio: audioRef.current,
        onFlash: () => {},
        onTarget: (targetId) => {
          activeTargetRef.current = targetId;
          if (targetId) {
            if (targetId === 'room_door' || targetId === 'door') {
              if (roomDataRef.current?.is_completed) {
                setActiveHoverPrompt('Step into Corridor / Enter Room 2');
              } else {
                setActiveHoverPrompt('Inspect Locked Bedroom Door');
              }
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
        onLock: () => {}
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
      engineRef.current.setPaused(false);
      setTimeout(() => {
        engineRef.current?.lock();
      }, 50);
    }
  };

  // Handle interacting (E) with an object
  const handleInteract = async (objectId) => {
    console.info("[ROOM1 HANDLE_INTERACT RUNNING FOR]", objectId);
    const currentData = roomDataRef.current;

    // Check if this is the Bedroom Exit Door
    if (objectId === 'room_door' || objectId === 'door') {
      if (currentData?.is_completed) {
        setIsRoomCompleteModalOpen(true);
        engineRef.current?.unlock();
      } else {
        const solvedCount = currentData?.clues?.filter(c => c.solved)?.length || 0;
        showNotification(
          `The heavy corridor door is locked with four iron deadbolts. Solve all 4 case files in this room to unlock it (${solvedCount}/4 solved).`
        );
      }
      return;
    }

    // 1. Search for a hidden fragment first
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

    // 2. If no fragment was found, check if this is a Clue Entry object (Diary, Notebook, Poster, Portrait)
    const matchingClue = currentData?.clues?.find((c) => c.object_id === objectId);
    if (matchingClue) {
      if (!currentData?.basket_unlocked) {
        showNotification(
          "The arcane seal is unbroken. You must recover all 15 room fragments to unseal this case file."
        );
        return;
      }
      setActiveClue(matchingClue);
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
        return {
          correct: false,
          message: errData.detail || 'Submission failed'
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
    setSystemNotification(msg);
    setTimeout(() => {
      setSystemNotification(null);
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
          if (isStarted && engineRef.current && !activeClue && !isBasketOpen && !isPhotoPuzzleOpen && !isCaseFilesOpen && !isRoomCompleteModalOpen) {
            engineRef.current.lock();
          }
        }}
        className="absolute inset-0 w-full h-full cursor-none" 
      />

      {/* Atmospheric Overlays */}
      <div className="vig pointer-events-none" />
      <div className="grain pointer-events-none" />

      {/* Enter Room Splash Modal */}
      {!isStarted && (
        <div className="ov">
          <h1>CURSE THE CODE</h1>
          <h3>Lena's Bedroom</h3>
          <ul>
            <li><b>W A S D</b> move</li>
            <li><b>Mouse</b> look</li>
            <li><b>E</b> interact / search</li>
            <li><b>B</b> toggle evidence basket</li>
            <li><b>C</b> view case files & clues</li>
            <li><b>P</b> view photo pieces</li>
            <li><b>Esc</b> release cursor</li>
          </ul>
          <button onClick={handleStartGame}>
            CLICK TO ENTER ROOM
          </button>
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
          showNotification("Head to the unlatched door at the front of the room to step into Room 2.");
        }}
      />
    </div>
  );
}

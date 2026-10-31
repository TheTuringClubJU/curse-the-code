import React, { useEffect, useRef, useState } from 'react';
import { createEngine } from './engine/engine.js';
import { buildDecor } from './engine/decor.js';
import bedroomConfig from './rooms/bedroom.js';
import { GameAudio } from './engine/audio.js';
import HUD from './components/HUD';
import BasketModal from './components/BasketModal';
import ClueModal from './components/ClueModal';
import PhotoPuzzleModal from './components/PhotoPuzzleModal';
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
      }
    } catch (err) {
      console.error('Failed to load room state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Direct window listener for Key E and Mouse Click to guarantee interaction
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === 'e' || e.key === 'E' || e.code === 'KeyE') {
        const target = activeTargetRef.current;
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          handleInteractRef.current?.(target);
        }
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
            setActiveHoverPrompt(`Inspect ${targetId.replace('_', ' ')}`);
          } else {
            setActiveHoverPrompt(null);
          }
        },
        onInteract: async (objectId) => {
          console.info("[ROOM1 ON_INTERACT RECEIVED]", objectId);
          handleInteractRef.current?.(objectId);
        },
        onLock: (isLocked) => {
          // When pointerlock is active, unpause engine
          if (engineRef.current) {
            engineRef.current.setPaused(!isLocked);
          }
        }
      });

      // Build decor elements (lighting shafts, outside moon view, rug)
      buildDecor(engine);

      // Unpause initially once started
      engine.setPaused(false);
      engineRef.current = engine;
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
    if (!currentData) {
      console.warn("Room data still loading...");
      return;
    }

    // Check if object is a Clue Entry object (Diary, Notebook, Poster, Portrait)
    const matchingClue = currentData.clues?.find((c) => c.object_id === objectId);
    if (matchingClue) {
      if (!currentData.basket_unlocked) {
        showNotification(
          "The arcane seal is unbroken. You must recover all 15 room fragments to unseal this case file."
        );
        return;
      }
      setActiveClue(matchingClue);
      engineRef.current?.unlock();
      return;
    }

    // Otherwise, it's a Hiding Object search!
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
        const result = await res.json();
        showNotification(result.message);
        if (result.found) {
          fetchRoomState();
        }
      }
    } catch (err) {
      console.error('Search request failed:', err);
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
        return data;
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

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#07050d] select-none font-mono">
      {/* 3D Canvas Mounting Point */}
      <div 
        ref={mountRef} 
        onClick={() => {
          if (isStarted && engineRef.current && !activeClue && !isBasketOpen && !isPhotoPuzzleOpen) {
            engineRef.current.lock();
          }
        }}
        className="absolute inset-0 w-full h-full cursor-none" 
      />

      {/* Atmospheric Overlays from original design */}
      <div className="vig" />
      <div className="grain" />

      {/* Enter Room Splash Modal */}
      {!isStarted && (
        <div className="ov">
          <h1>CURSE THE CODE</h1>
          <h3>Lena's Bedroom</h3>
          <ul>
            <li><b>W A S D</b> move</li>
            <li><b>Mouse</b> look</li>
            <li><b>E</b> interact / search</li>
            <li><b>Shift</b> walk faster</li>
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
          onOpenBasket={() => {
            setIsBasketOpen(true);
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

      <ClueModal
        isOpen={Boolean(activeClue)}
        onClose={() => {
          setActiveClue(null);
          engineRef.current?.lock();
        }}
        clue={activeClue}
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
    </div>
  );
}

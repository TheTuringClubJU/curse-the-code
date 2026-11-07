import React, { useEffect, useRef, useState } from 'react';
import { createEngine } from './engine/engine.js';
import recordsConfig from './rooms/records.js';
import { GameAudioRecords } from './engine/audioRecords.js';
import HUDRecords from './components/records/HUDRecords.jsx';
import BasketModal from './components/BasketModal.jsx';
import RedactedReportModal from './components/records/RedactedReportModal.jsx';
import MicrofilmViewerModal from './components/records/MicrofilmViewerModal.jsx';
import EpochTimelineModal from './components/records/EpochTimelineModal.jsx';
import BulkheadKeypadModal from './components/records/BulkheadKeypadModal.jsx';
import CaseDossierModal from './components/records/CaseDossierModal.jsx';
import Fork1Modal from './components/records/Fork1Modal.jsx';
import RoomCompleteModal from './components/RoomCompleteModal.jsx';
import './game.css';
import './records.css';

export default function Room4Records({ team, onLogout }) {
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
  const [isCaseDossierOpen, setIsCaseDossierOpen] = useState(false);
  const [isFork1Open, setIsFork1Open] = useState(false);
  const [isRoomCompleteModalOpen, setIsRoomCompleteModalOpen] = useState(false);
  const [activeClueModal, setActiveClueModal] = useState(null); // 'R2-02' | 'R2-03' | 'R2-04' | 'R2-07' | null
  const [activeHoverPrompt, setActiveHoverPrompt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemNotification, setSystemNotification] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);

  // Survival-horror mechanics state
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isFlashlightOn, setIsFlashlightOn] = useState(true);
  const [glassCrackLevel, setGlassCrackLevel] = useState(0);
  const [flashOverlay, setFlashOverlay] = useState({ color: '#000', opacity: 0, visible: false });

  // Fetch initial room data from backend
  const fetchRoomState = async () => {
    try {
      const res = await fetch('/api/game/room/records', {
        credentials: 'include',
        headers: {
          'x-session-token': localStorage.getItem('ctc_token') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRoomData(data);
        roomDataRef.current = data;

        // If room is completed, animate bulkhead door open
        if (data.is_completed && engineRef.current) {
          engineRef.current.openDoor?.();
        }
      }
    } catch (err) {
      console.error('Failed to load records room state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcuts listener (E, B, C, F, M)
  useEffect(() => {
    const handleGlobalKey = (e) => {
      const tag = (e.target?.tagName || document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }

      // Escape Key - Close open modals & restore lock
      if (e.key === 'Escape' || e.code === 'Escape') {
        setIsBasketOpen(false);
        setIsCaseDossierOpen(false);
        setIsFork1Open(false);
        setActiveClueModal(null);
        engineRef.current?.lock();
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

      // B Key - Toggle Evidence Basket
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

      // C Key - Toggle Case Dossier
      if (e.key === 'c' || e.key === 'C' || e.code === 'KeyC') {
        e.preventDefault();
        setIsCaseDossierOpen((prev) => {
          const next = !prev;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
        return;
      }

      // F Key - Toggle Flashlight
      if (e.key === 'f' || e.key === 'F' || e.code === 'KeyF') {
        e.preventDefault();
        toggleFlashlight();
        return;
      }

      // M Key - Toggle Audio
      if (e.key === 'm' || e.key === 'M' || e.code === 'KeyM') {
        e.preventDefault();
        toggleAudio();
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

  // Flashlight battery decay loop
  useEffect(() => {
    if (!isStarted || !isFlashlightOn) return;
    const interval = setInterval(() => {
      setBatteryLevel((prev) => {
        const next = Math.max(0, prev - 0.04);
        if (next <= 0 && engineRef.current) {
          engineRef.current.setFlashlight?.(false);
          setIsFlashlightOn(false);
          audioRef.current?.click?.();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, isFlashlightOn]);

  // Initialize Three.js 3D Engine for Room 4: The Rotting Archive
  useEffect(() => {
    if (!mountRef.current || engineRef.current) return;

    audioRef.current = new GameAudioRecords();

    try {
      const engine = createEngine(mountRef.current, recordsConfig, {
        audio: audioRef.current,
        onFlash: (color, opacity, durationMs) => {
          setFlashOverlay({ color, opacity, visible: true });
          setTimeout(() => {
            setFlashOverlay((prev) => ({ ...prev, visible: false }));
          }, durationMs || 150);
        },
        onGlassCrack: () => {
          setGlassCrackLevel((prev) => Math.min(3, prev + 1));
        },
        onScare: (scareName, message) => {
          showNotification(message);
        },
        onTarget: (targetId) => {
          activeTargetRef.current = targetId;
          if (targetId) {
            if (targetId === 'room_door' || targetId === 'door') {
              setActiveHoverPrompt('Sealed Archival Entrance Hatch');
            } else if (targetId === 'bulkhead_door') {
              if (roomDataRef.current?.is_completed) {
                setActiveHoverPrompt('Pass Through Unsealed Bulkhead ➔ Enter Room 5');
              } else if (!roomDataRef.current?.basket_unlocked) {
                setActiveHoverPrompt('Inspect Sealed Bulkhead Door (12 Fragments Required)');
              } else {
                setActiveHoverPrompt('Operate Sealed Bulkhead Keypad (Clue R2-07)');
              }
            } else if (recordsConfig.interact[targetId]?.label) {
              setActiveHoverPrompt(recordsConfig.interact[targetId].label);
            } else {
              setActiveHoverPrompt(`Inspect ${targetId.replace(/_/g, ' ')}`);
            }
          } else {
            setActiveHoverPrompt(null);
          }
        },
        onInteract: async (objectId) => {
          console.info('[ROOM4 ON_INTERACT RECEIVED]', objectId);
          handleInteractRef.current?.(objectId);
        }
      });

      engine.setPaused(false);
      engineRef.current = engine;

      if (roomDataRef.current?.is_completed) {
        engine.openDoor?.();
      }
    } catch (err) {
      console.error('Three.js records engine initialization failed:', err);
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
      audioRef.current.start(recordsConfig.audio);
    }
    if (engineRef.current) {
      engineRef.current.setPaused(false);
      setTimeout(() => {
        engineRef.current?.lock();
      }, 50);
    }
  };

  const toggleFlashlight = () => {
    setIsFlashlightOn((prev) => {
      const next = !prev;
      if (batteryLevel <= 0 && next) {
        showNotification('Tactical flashlight battery depleted.');
        return false;
      }
      audioRef.current?.click?.();
      if (engineRef.current) {
        engineRef.current.setFlashlight?.(next);
      }
      return next;
    });
  };

  // Handle interacting (E) with an object
  const handleInteract = async (objectId) => {
    console.info('[ROOM4 HANDLE_INTERACT RUNNING FOR]', objectId);
    const currentData = roomDataRef.current;

    // 1. Check Entrance Door
    if (objectId === 'room_door' || objectId === 'door') {
      showNotification('The heavy iron entrance hatch sealed behind you. You cannot retreat. Find a way forward.');
      return;
    }

    // Flashlight / Battery Pack Pickup
    if (objectId === 'flashlight_item' || objectId === 'battery_pack') {
      setBatteryLevel(100);
      audioRef.current?.click?.();
      showNotification('Recharged tactical flashlight battery to 100%.');
      return;
    }

    // 2. Check Bulkhead Door (Exit to next room)
    if (objectId === 'bulkhead_door') {
      if (currentData?.is_completed) {
        setIsFork1Open(true);
        engineRef.current?.unlock();
        return;
      }
      if (!currentData?.basket_unlocked) {
        showNotification('Arcane seal unbroken: Recover all 12 fragments in this room to unseal the archival terminals and power the bulkhead keypad.');
        return;
      }
      // If not completed, open Bulkhead Keypad (Clue R2-07)
      const clueR207 = currentData?.clues?.find((c) => c.id === 'R2-07') || { id: 'R2-07' };
      setActiveClueModal('R2-07');
      engineRef.current?.unlock();
      return;
    }

    // 3. Check Clue Terminals (report_folder -> R2-02, microfilm_reader -> R2-03, timeline_board -> R2-04)
    const matchingClue = currentData?.clues?.find((c) => c.object_id === objectId);
    if (matchingClue) {
      if (!currentData?.basket_unlocked) {
        showNotification('Arcane seal unbroken. Recover all 12 room fragments across the 7 storage props to unseal this case file.');
        return;
      }
      setActiveClueModal(matchingClue.id);
      engineRef.current?.unlock();
      return;
    }

    // 4. Search for a hidden fragment in this prop
    try {
      const res = await fetch('/api/game/room/records/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ctc_token') || ''
        },
        credentials: 'include',
        body: JSON.stringify({ object_id: objectId })
      });

      if (res.ok) {
        const searchResult = await res.json();
        if (searchResult && searchResult.message) {
          showNotification(searchResult.message);
        }
        if (searchResult.found) {
          audioRef.current?.good?.();
          fetchRoomState();
          return;
        } else {
          audioRef.current?.step?.(0.6);
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

        if (data.correct) {
          audioRef.current?.good?.();
          // Check if this submission finished Room 4
          if (data.room_completed) {
            engineRef.current?.openDoor?.();
            setIsRoomCompleteModalOpen(true);
          }
        } else {
          audioRef.current?.bad?.();
          setGlassCrackLevel((prev) => Math.min(3, prev + 1));
          engineRef.current?.shake?.(0.8, 0.4);
        }

        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        audioRef.current?.bad?.();
        return {
          correct: false,
          message: errData.detail || 'Authentication rejected'
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
    setAudioMuted((prev) => {
      const next = !prev;
      audioRef.current?.setMuted?.(next);
      return next;
    });
  };

  // Clues count
  const cluesList = roomData?.clues || [];
  const roomClues = cluesList.filter((c) => c.id && c.id.startsWith('R2-'));
  const cluesSolvedCount = roomClues.filter((c) => c.solved).length;
  const totalCluesCount = roomClues.length || 4;

  const currentClue = roomClues.find((c) => c.id === activeClueModal);

  const isAnyModalOpen =
    isBasketOpen ||
    isCaseDossierOpen ||
    isFork1Open ||
    isRoomCompleteModalOpen ||
    Boolean(activeClueModal);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#030205] select-none font-mono">
      {/* 3D Canvas Mounting Point */}
      <div
        ref={mountRef}
        onClick={() => {
          if (isStarted && engineRef.current && !isAnyModalOpen) {
            engineRef.current.lock();
          }
        }}
        className="absolute inset-0 w-full h-full cursor-none"
      />

      {/* Survival-Horror Overlays */}
      <div className="breathing-vig pointer-events-none" />
      <div className="grain pointer-events-none" />

      {/* Screen Glass Crack Progression */}
      {glassCrackLevel === 1 && <div className="glass-crack-1 pointer-events-none" />}
      {glassCrackLevel === 2 && <div className="glass-crack-2 pointer-events-none" />}
      {glassCrackLevel >= 3 && <div className="glass-crack-3 pointer-events-none" />}

      {/* Horror Scare Flash Overlay */}
      {flashOverlay.visible && (
        <div
          className="horror-flash pointer-events-none"
          style={{ backgroundColor: flashOverlay.color, opacity: flashOverlay.opacity }}
        />
      )}

      {/* Enter Room Splash Modal */}
      {!isStarted && (
        <div className="ov">
          <h1>CURSE THE CODE</h1>
          <h3 className="text-[#ffd68a]">ROUND 2 • ROOM 4: THE ROTTING ARCHIVE</h3>
          <ul className="text-xs text-[#dcd2be] space-y-1 my-3">
            <li><b>W A S D</b> Move in flooded sub-basement</li>
            <li><b>Mouse</b> Look around / aim flashlight</li>
            <li><b>E</b> Search props / operate terminal</li>
            <li><b>B</b> Open Evidence Basket (12 fragments)</li>
            <li><b>C</b> View Case Files & Clues Dossier</li>
            <li><b>F</b> Toggle heavy-duty flashlight</li>
            <li><b>M</b> Mute / unmute 18.98Hz horror audio</li>
            <li><b>1 - 5</b> Manual Jumpscare triggers (Drawer, Blackout, Phantom, Stalker, Burst)</li>
            <li><b>Esc</b> Release mouse cursor</li>
          </ul>
          <button
            onClick={handleStartGame}
            className="px-8 py-3 bg-[#c47a00] hover:bg-[#e09820] text-black font-bold text-sm tracking-widest rounded transition shadow-[0_0_25px_rgba(196,122,0,0.5)]"
          >
            DESCEND INTO THE SUB-BASEMENT
          </button>
        </div>
      )}

      {/* Floating System Notification */}
      {systemNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#16120b]/95 backdrop-blur-md px-6 py-3 rounded-xl border border-[#c47a00]/70 shadow-2xl text-xs font-mono text-[#f3ead0] max-w-lg text-center animate-fade-in pointer-events-none">
          {systemNotification}
        </div>
      )}

      {/* HUD Layer */}
      {isStarted && (
        <HUDRecords
          roomTitle={roomData?.title || 'The Rotting Archive'}
          totalFragments={roomData?.total_fragments_in_room || 12}
          collectedCount={roomData?.collected_fragment_ids?.length || 0}
          basketUnlocked={Boolean(roomData?.basket_unlocked)}
          isRoomCompleted={Boolean(roomData?.is_completed)}
          cluesSolved={cluesSolvedCount}
          totalClues={totalCluesCount}
          batteryLevel={batteryLevel}
          isFlashlightOn={isFlashlightOn}
          onToggleFlashlight={toggleFlashlight}
          onOpenBasket={() => {
            setIsBasketOpen(true);
            engineRef.current?.unlock();
          }}
          onOpenCaseFiles={() => {
            setIsCaseDossierOpen(true);
            engineRef.current?.unlock();
          }}
          onLogout={onLogout}
          audioMuted={audioMuted}
          onToggleAudio={toggleAudio}
          activeHoverPrompt={activeHoverPrompt}
        />
      )}

      {/* Evidence Basket Modal */}
      <BasketModal
        isOpen={isBasketOpen}
        onClose={() => {
          setIsBasketOpen(false);
          engineRef.current?.lock();
        }}
        evidence={roomData?.evidence || []}
        collectedIds={roomData?.collected_fragment_ids || []}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        totalInRoom={roomData?.total_fragments_in_room || 12}
        roomTitle={roomData?.title || 'The Rotting Archive'}
      />

      {/* Case Dossier Modal (Press C) */}
      <CaseDossierModal
        isOpen={isCaseDossierOpen}
        onClose={() => {
          setIsCaseDossierOpen(false);
          engineRef.current?.lock();
        }}
        clues={roomClues}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        totalFragments={roomData?.total_fragments_in_room || 12}
        collectedCount={roomData?.collected_fragment_ids?.length || 0}
        onOpenClue={(clue) => {
          setIsCaseDossierOpen(false);
          if (!roomData?.basket_unlocked) {
            showNotification('Arcane seal active: Gather all 12 room fragments to inspect this clue terminal.');
            return;
          }
          setActiveClueModal(clue.id);
          engineRef.current?.unlock();
        }}
      />

      {/* Clue R2-02: Redacted Incident Report */}
      <RedactedReportModal
        isOpen={activeClueModal === 'R2-02'}
        onClose={() => {
          setActiveClueModal(null);
          engineRef.current?.lock();
        }}
        clue={currentClue || { id: 'R2-02', attempts_max: 3 }}
        onSubmitAnswer={handleClueSubmit}
        isSubmitting={isSubmitting}
        evidence={roomData?.evidence || []}
      />

      {/* Clue R2-03: Microfilm Viewer Console */}
      <MicrofilmViewerModal
        isOpen={activeClueModal === 'R2-03'}
        onClose={() => {
          setActiveClueModal(null);
          engineRef.current?.lock();
        }}
        clue={currentClue || { id: 'R2-03', attempts_max: 3 }}
        onSubmitAnswer={handleClueSubmit}
        isSubmitting={isSubmitting}
        audio={audioRef.current}
      />

      {/* Clue R2-04: Epoch Event Timeline Corkboard */}
      <EpochTimelineModal
        isOpen={activeClueModal === 'R2-04'}
        onClose={() => {
          setActiveClueModal(null);
          engineRef.current?.lock();
        }}
        clue={currentClue || { id: 'R2-04', attempts_max: 3 }}
        onSubmitAnswer={handleClueSubmit}
        isSubmitting={isSubmitting}
        audio={audioRef.current}
      />

      {/* Clue R2-07: Sealed Bulkhead Keypad Terminal */}
      <BulkheadKeypadModal
        isOpen={activeClueModal === 'R2-07'}
        onClose={() => {
          setActiveClueModal(null);
          engineRef.current?.lock();
        }}
        clue={currentClue || { id: 'R2-07', attempts_max: 3 }}
        onSubmitAnswer={handleClueSubmit}
        isSubmitting={isSubmitting}
        audio={audioRef.current}
        onBulkheadUnlocked={() => {
          engineRef.current?.openDoor?.();
          setIsFork1Open(true);
        }}
      />

      {/* Fork 1: The Records Fork (Dual-Path Choice between Room 4 and Room 5) */}
      <Fork1Modal
        isOpen={isFork1Open}
        onClose={() => {
          setIsFork1Open(false);
          engineRef.current?.lock();
        }}
        audio={audioRef.current}
        onApplyBatteryPenalty={(penalty) => {
          setBatteryLevel((prev) => Math.max(0, prev - penalty));
          setFlashOverlay({ color: '#ffffff', opacity: 0.95, visible: true });
          setTimeout(() => {
            setFlashOverlay((prev) => ({ ...prev, visible: false }));
          }, 350);
          engineRef.current?.shake?.(1.5, 0.7);
        }}
        onProceedToRoom5={() => {
          setIsFork1Open(false);
          setIsRoomCompleteModalOpen(true);
          showNotification('Routing authenticated through Primary Wing. Sector 5 (Control Room) corridor unsealed.');
        }}
      />

      {/* Room Complete / Transition Modal */}
      <RoomCompleteModal
        isOpen={isRoomCompleteModalOpen}
        onClose={() => {
          setIsRoomCompleteModalOpen(false);
          engineRef.current?.lock();
        }}
        onProceedToDoor={() => {
          setIsRoomCompleteModalOpen(false);
          engineRef.current?.lock();
          showNotification('The heavy hydraulic bulkhead is unsealed. Step through the doorway into Room 5.');
        }}
      />
    </div>
  );
}

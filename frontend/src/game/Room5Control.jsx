import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createEngine } from './engine/engine.js';
import controlConfig from './rooms/control.js';
import { buildControlScene } from './engine/sceneControl.js';
import { GameAudioControl } from './engine/audioControl.js';
import { createControlScares } from './engine/scaresControl.js';
import HUDControl from './components/control/HUDControl.jsx';
import PersonnelIndexModal from './components/control/PersonnelIndexModal.jsx';
import TransmissionArchiveModal from './components/control/TransmissionArchiveModal.jsx';
import SpectrogramModal from './components/control/SpectrogramModal.jsx';
import BasketModal from './components/BasketModal.jsx';
import CaseDossierModal from './components/records/CaseDossierModal.jsx';
import RoomCompleteModal from './components/RoomCompleteModal.jsx';
import './game.css';
import './control.css';

// ─── Room 5: The Surveillance Morgue ─────────────────────────────────────────
export default function Room5Control({ team, onLogout }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const audioRef = useRef(null);
  const scaresRef = useRef(null);
  const roomDataRef = useRef(null);
  const handleInteractRef = useRef(null);
  const activeTargetRef = useRef(null);

  // ── Game state ──────────────────────────────────────────────────────────────
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);

  // Modal visibility
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isCaseDossierOpen, setIsCaseDossierOpen] = useState(false);
  const [isRoomCompleteModalOpen, setIsRoomCompleteModalOpen] = useState(false);
  const [activeClueModal, setActiveClueModal] = useState(null); // 'R2-01' | 'R2-05' | 'R2-06' | null

  // UX state
  const [activeHoverPrompt, setActiveHoverPrompt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemNotification, setSystemNotification] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);

  // Horror overlay
  const [flashOverlay, setFlashOverlay] = useState({ color: '#000', opacity: 0, visible: false });

  // ── Helper: show timed notification ────────────────────────────────────────
  const showNotification = useCallback((msg) => {
    setSystemNotification(msg);
    setTimeout(() => setSystemNotification(null), 4500);
  }, []);

  // ── Fetch room state from backend ───────────────────────────────────────────
  const fetchRoomState = useCallback(async () => {
    try {
      const res = await fetch('/api/game/room/control', {
        credentials: 'include',
        headers: { 'x-session-token': localStorage.getItem('ctc_token') || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setRoomData(data);
        roomDataRef.current = data;
        if (data.is_completed && engineRef.current) {
          engineRef.current.openDoor?.();
        }
      }
    } catch (err) {
      console.error('[ROOM5] Failed to load control room state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoomState(); }, [fetchRoomState]);

  // ── Initialize Three.js engine ──────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current || engineRef.current) return;

    audioRef.current = new GameAudioControl();

    try {
      const engine = createEngine(mountRef.current, controlConfig, {
        audio: audioRef.current,

        onFlash: (color, opacity, durationMs) => {
          setFlashOverlay({ color, opacity, visible: true });
          setTimeout(() => setFlashOverlay(prev => ({ ...prev, visible: false })), durationMs || 150);
        },

        onGlassCrack: null, // Room 5 has no glass-crack mechanic

        onScare: (_name, message) => {
          showNotification(message);
        },

        onTarget: (targetId) => {
          activeTargetRef.current = targetId;
          if (!targetId) {
            setActiveHoverPrompt(null);
            return;
          }
          if (targetId === 'room_door' || targetId === 'entry_door') {
            setActiveHoverPrompt('Sealed Entry Hatch — No Return');
          } else if (targetId === 'vault_door' || targetId === 'exit_door') {
            const rd = roomDataRef.current;
            if (rd?.is_completed) {
              setActiveHoverPrompt('Advance to The Anointing Vault (Room 6) ➔');
            } else {
              setActiveHoverPrompt('Sealed Vault Door — Solve all clue terminals to open');
            }
          } else if (controlConfig.interact?.[targetId]?.label) {
            setActiveHoverPrompt(controlConfig.interact[targetId].label);
          } else {
            setActiveHoverPrompt(`Inspect ${targetId.replace(/_/g, ' ')}`);
          }
        },

        onInteract: async (objectId) => {
          handleInteractRef.current?.(objectId);
        },
      });

      // Build the scene geometry on top of the engine
      buildControlScene(engine);

      // Create horror director
      scaresRef.current = createControlScares(engine, {
        audio: audioRef.current,
        onFlash: (color, opacity, durationMs) => {
          setFlashOverlay({ color, opacity, visible: true });
          setTimeout(() => setFlashOverlay(prev => ({ ...prev, visible: false })), durationMs || 150);
        },
        onScare: (_name, message) => showNotification(message),
        onTeamNameInjection: (name) => {
          showNotification(`⚠ GHOST TRACE — TERMINAL LOGGED: "${name}"`);
        },
        onGlassCrack: null,
      });

      engine.setPaused(false);
      engineRef.current = engine;

      if (roomDataRef.current?.is_completed) {
        engine.openDoor?.();
      }
    } catch (err) {
      console.error('[ROOM5] Three.js control engine initialization failed:', err);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKey = (e) => {
      const tag = (e.target?.tagName || document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

      // Escape — close all modals and re-lock pointer
      if (e.key === 'Escape' || e.code === 'Escape') {
        setIsBasketOpen(false);
        setIsCaseDossierOpen(false);
        setActiveClueModal(null);
        engineRef.current?.lock();
        return;
      }

      // E — interact with hovered object
      if (e.key === 'e' || e.key === 'E' || e.code === 'KeyE') {
        const target = activeTargetRef.current;
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          handleInteractRef.current?.(target);
        }
        return;
      }

      // B — evidence basket
      if (e.key === 'b' || e.key === 'B' || e.code === 'KeyB') {
        e.preventDefault();
        setIsBasketOpen(prev => {
          const next = !prev;
          if (next) engineRef.current?.unlock(); else engineRef.current?.lock();
          return next;
        });
        return;
      }

      // C — case dossier
      if (e.key === 'c' || e.key === 'C' || e.code === 'KeyC') {
        e.preventDefault();
        setIsCaseDossierOpen(prev => {
          const next = !prev;
          if (next) engineRef.current?.unlock(); else engineRef.current?.lock();
          return next;
        });
        return;
      }

      // M — toggle audio
      if (e.key === 'm' || e.key === 'M' || e.code === 'KeyM') {
        e.preventDefault();
        setAudioMuted(prev => {
          const next = !prev;
          audioRef.current?.setMuted?.(next);
          return next;
        });
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKey, true);
    return () => window.removeEventListener('keydown', handleGlobalKey, true);
  }, []);

  // ── Start game ──────────────────────────────────────────────────────────────
  const handleStartGame = () => {
    setIsStarted(true);
    audioRef.current?.start?.(controlConfig.audio);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
      setTimeout(() => engineRef.current?.lock(), 50);
    }
  };

  // ── Main interaction handler ────────────────────────────────────────────────
  const handleInteract = useCallback(async (objectId) => {
    const currentData = roomDataRef.current;

    // ── Entry door / no return ──
    if (objectId === 'room_door' || objectId === 'entry_door') {
      showNotification('The armoured entry hatch sealed shut behind you. There is no going back. Find a way through.');
      return;
    }

    // ── Vault / exit door ──
    if (objectId === 'vault_door' || objectId === 'exit_door') {
      if (currentData?.is_completed) {
        setIsRoomCompleteModalOpen(true);
        engineRef.current?.unlock();
        engineRef.current?.openDoor?.();
      } else {
        showNotification('The vault door is electromagnetically sealed. Solve all three clue terminals to release the lock.');
      }
      return;
    }

    // ── Monitor bank: CCTV horror ──
    if (objectId === 'monitor_bank') {
      scaresRef.current?.triggerCCTVHorror?.();
      showNotification('Static bursts across all nine monitors. For a moment — a figure that shouldn\'t be there.');
      return;
    }

    // ── Staff terminal: Personnel Index (R2-01) ──
    if (objectId === 'staff_terminal') {
      if (!currentData?.basket_unlocked) {
        showNotification('This terminal is locked. Collect all evidence fragments first.');
        return;
      }
      scaresRef.current?.triggerTeamNameInjection?.();
      setActiveClueModal('R2-01');
      engineRef.current?.unlock();
      return;
    }

    // ── Radio console: Transmission Archive (R2-05) ──
    if (objectId === 'radio_console') {
      if (!currentData?.basket_unlocked) {
        showNotification('This terminal is locked. Collect all evidence fragments first.');
        return;
      }
      setActiveClueModal('R2-05');
      engineRef.current?.unlock();
      return;
    }

    // ── Sound console: Spectrogram Analyser (R2-06) ──
    if (objectId === 'sound_console') {
      if (!currentData?.basket_unlocked) {
        showNotification('This terminal is locked. Collect all evidence fragments first.');
        return;
      }
      setActiveClueModal('R2-06');
      engineRef.current?.unlock();
      return;
    }

    // ── Generic: search prop for hidden fragments ──
    try {
      const res = await fetch('/api/game/room/control/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ctc_token') || '',
        },
        credentials: 'include',
        body: JSON.stringify({ object_id: objectId }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.message) showNotification(result.message);
        if (result.found) {
          audioRef.current?.good?.();
          scaresRef.current?.maybeFragmentScare?.();
          fetchRoomState();
        } else {
          audioRef.current?.step?.(0.5);
        }
      }
    } catch (err) {
      console.error('[ROOM5] Fragment search failed:', err);
    }
  }, [fetchRoomState, showNotification]);

  // Keep the ref in sync with the closure
  handleInteractRef.current = handleInteract;

  // ── Submit clue answer ──────────────────────────────────────────────────────
  const handleClueSubmit = useCallback(async (clueId, answer) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/game/clue/${clueId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ctc_token') || '',
        },
        credentials: 'include',
        body: JSON.stringify({ answer }),
      });

      if (res.ok) {
        const data = await res.json();
        await fetchRoomState();

        if (data.correct) {
          audioRef.current?.good?.();
          if (data.room_completed) {
            engineRef.current?.openDoor?.();
            setIsRoomCompleteModalOpen(true);
          }
        } else {
          audioRef.current?.bad?.();
          engineRef.current?.shake?.(0.7, 0.35);
        }
        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        audioRef.current?.bad?.();
        return { correct: false, message: errData.detail || 'Authentication rejected' };
      }
    } catch (err) {
      console.error('[ROOM5] Clue submission failed:', err);
      return { correct: false, message: 'Server communication error' };
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchRoomState]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const cluesList = roomData?.clues || [];
  const roomClues = cluesList.filter(c => c.id && c.id.startsWith('R2-'));
  const cluesSolvedCount = roomClues.filter(c => c.solved || c.exhausted).length;
  const totalCluesCount = roomClues.length || 3;

  const getClueState = (id) => roomClues.find(c => c.id === id) || { id, attempts_remaining: 3 };

  const isAnyModalOpen =
    isBasketOpen ||
    isCaseDossierOpen ||
    isRoomCompleteModalOpen ||
    Boolean(activeClueModal);

  // ── Real fragment count (non-decoy for basket unlock) ──
  const collectedNonDecoyCount = (roomData?.collected_fragment_ids || []).filter(id =>
    id.startsWith('EC')
  ).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none font-mono"
      style={{ background: '#030104' }}
    >
      {/* 3D Canvas mount */}
      <div
        ref={mountRef}
        onClick={() => {
          if (isStarted && engineRef.current && !isAnyModalOpen) {
            engineRef.current.lock();
          }
        }}
        className="absolute inset-0 w-full h-full cursor-none"
      />

      {/* Breathing vignette + film grain */}
      <div className="breathing-vig pointer-events-none" />
      <div className="grain pointer-events-none" />

      {/* Horror flash overlay */}
      {flashOverlay.visible && (
        <div
          className="horror-flash pointer-events-none"
          style={{ backgroundColor: flashOverlay.color, opacity: flashOverlay.opacity }}
        />
      )}

      {/* ── Enter Room splash ── */}
      {!isStarted && (
        <div
          className="ov"
          style={{
            '--ov-bg': '#030e05',
            '--ov-border': 'rgba(77,255,120,0.3)',
            '--ov-text': '#4dff78',
          }}
        >
          <div
            className="font-mono text-center"
            style={{ color: '#4dff78', letterSpacing: 4, fontSize: 11, marginBottom: 8 }}
          >
            ◈ ROUND 2 • SUBSTATION DELTA ◈
          </div>
          <h1
            style={{
              color: '#4dff78',
              fontFamily: 'Courier, monospace',
              fontSize: 22,
              letterSpacing: 3,
              margin: '0 0 4px',
              textShadow: '0 0 20px rgba(77,255,120,0.5)',
            }}
          >
            CURSE THE CODE
          </h1>
          <h3
            style={{
              color: '#c47a00',
              fontFamily: 'Courier, monospace',
              fontSize: 14,
              letterSpacing: 2,
              margin: '0 0 20px',
            }}
          >
            ROOM 5: THE SURVEILLANCE MORGUE
          </h3>
          <ul
            style={{
              color: '#7a9a7f',
              fontSize: 12,
              lineHeight: 2,
              listStyle: 'none',
              padding: 0,
              margin: '0 0 24px',
              fontFamily: 'Courier, monospace',
              letterSpacing: 1,
              textAlign: 'left',
              maxWidth: 360,
            }}
          >
            <li><b style={{ color: '#e8d9c0' }}>W A S D</b> — Move through the control room</li>
            <li><b style={{ color: '#e8d9c0' }}>Mouse</b> — Look around</li>
            <li><b style={{ color: '#e8d9c0' }}>E</b> — Interact / search props</li>
            <li><b style={{ color: '#e8d9c0' }}>B</b> — Open Evidence Basket (8 fragments)</li>
            <li><b style={{ color: '#e8d9c0' }}>C</b> — View Case Dossier &amp; Clues</li>
            <li><b style={{ color: '#e8d9c0' }}>M</b> — Mute / unmute audio</li>
            <li><b style={{ color: '#e8d9c0' }}>Esc</b> — Release mouse cursor</li>
          </ul>
          <button
            onClick={handleStartGame}
            style={{
              padding: '12px 36px',
              background: 'transparent',
              border: '1px solid #4dff78',
              color: '#4dff78',
              fontFamily: 'Courier, monospace',
              fontSize: 13,
              letterSpacing: 3,
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(77,255,120,0.3)',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0d2e12'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            ENTER THE SURVEILLANCE MORGUE
          </button>
        </div>
      )}

      {/* ── System notification toast ── */}
      {systemNotification && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 z-50 backdrop-blur-md px-6 py-3 rounded-xl shadow-2xl text-xs font-mono max-w-lg text-center animate-fade-in pointer-events-none"
          style={{
            background: 'rgba(3,14,5,0.95)',
            border: '1px solid rgba(77,255,120,0.4)',
            color: '#e8d9c0',
            boxShadow: '0 0 24px rgba(77,255,120,0.15)',
          }}
        >
          {systemNotification}
        </div>
      )}

      {/* ── HUD ── */}
      {isStarted && (
        <HUDControl
          roomTitle={roomData?.title || 'The Surveillance Morgue'}
          totalFragments={8}
          collectedCount={collectedNonDecoyCount}
          basketUnlocked={Boolean(roomData?.basket_unlocked)}
          isRoomCompleted={Boolean(roomData?.is_completed)}
          cluesSolved={cluesSolvedCount}
          totalClues={totalCluesCount}
          onOpenBasket={() => { setIsBasketOpen(true); engineRef.current?.unlock(); }}
          onOpenCaseFiles={() => { setIsCaseDossierOpen(true); engineRef.current?.unlock(); }}
          onLogout={onLogout}
          audioMuted={audioMuted}
          onToggleAudio={() => {
            setAudioMuted(prev => {
              const next = !prev;
              audioRef.current?.setMuted?.(next);
              return next;
            });
          }}
          activeHoverPrompt={activeHoverPrompt}
        />
      )}

      {/* ── Evidence Basket Modal ── */}
      <BasketModal
        isOpen={isBasketOpen}
        onClose={() => { setIsBasketOpen(false); engineRef.current?.lock(); }}
        evidence={roomData?.evidence || []}
        collectedIds={roomData?.collected_fragment_ids || []}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        totalInRoom={8}
        roomTitle={roomData?.title || 'The Surveillance Morgue'}
      />

      {/* ── Case Dossier Modal ── */}
      <CaseDossierModal
        isOpen={isCaseDossierOpen}
        onClose={() => { setIsCaseDossierOpen(false); engineRef.current?.lock(); }}
        clues={roomClues}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        totalFragments={8}
        collectedCount={collectedNonDecoyCount}
        onOpenClue={(clue) => {
          setIsCaseDossierOpen(false);
          if (!roomData?.basket_unlocked) {
            showNotification('Terminal locked: Collect all 8 evidence fragments first to unlock clue access.');
            return;
          }
          setActiveClueModal(clue.id);
          engineRef.current?.unlock();
        }}
      />

      {/* ── Clue R2-01: Personnel Index Terminal ── */}
      <PersonnelIndexModal
        isOpen={activeClueModal === 'R2-01'}
        onClose={() => { setActiveClueModal(null); engineRef.current?.lock(); }}
        onSubmit={(answer) => handleClueSubmit('R2-01', answer)}
        clueState={getClueState('R2-01')}
      />

      {/* ── Clue R2-05: Transmission Archive (Radio Console) ── */}
      <TransmissionArchiveModal
        isOpen={activeClueModal === 'R2-05'}
        onClose={() => { setActiveClueModal(null); engineRef.current?.lock(); }}
        onSubmit={(answer) => handleClueSubmit('R2-05', answer)}
        clueState={getClueState('R2-05')}
      />

      {/* ── Clue R2-06: Spectrogram Analyser (Sound Console) ── */}
      <SpectrogramModal
        isOpen={activeClueModal === 'R2-06'}
        onClose={() => { setActiveClueModal(null); engineRef.current?.lock(); }}
        onSubmit={(answer) => handleClueSubmit('R2-06', answer)}
        clueState={getClueState('R2-06')}
      />

      {/* ── Room Complete / Transition Modal ── */}
      <RoomCompleteModal
        isOpen={isRoomCompleteModalOpen}
        onClose={() => { setIsRoomCompleteModalOpen(false); engineRef.current?.lock(); }}
        onProceedToDoor={() => {
          setIsRoomCompleteModalOpen(false);
          engineRef.current?.lock();
          showNotification('The vault door disengages with a heavy magnetic thud. Advance into Room 6: The Anointing Vault.');
        }}
      />
    </div>
  );
}


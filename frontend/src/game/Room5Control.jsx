import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createEngine } from './engine/engine.js';
import controlConfig, { CONTROL_PROP_NOTES } from './rooms/control.js';
import { buildControlScene } from './engine/sceneControl.js';
import { GameAudioControl } from './engine/audioControl.js';
import {
  createControlScares,
  isInsideSafeRoom5B,
  SAFE_ROOM_RESPAWN,
} from './engine/scaresControl.js';
import HUDControl from './components/control/HUDControl.jsx';
import PersonnelIndexModal from './components/control/PersonnelIndexModal.jsx';
import TransmissionArchiveModal from './components/control/TransmissionArchiveModal.jsx';
import SpectrogramModal from './components/control/SpectrogramModal.jsx';
import ControlBasketModal from './components/control/ControlBasketModal.jsx';
import ControlDossierModal from './components/control/ControlDossierModal.jsx';
import ControlRoomCompleteModal from './components/control/ControlRoomCompleteModal.jsx';
import DevCalibratorOverlay from './components/control/DevCalibratorOverlay.jsx';
import EvidencePickupModal from './components/control/EvidencePickupModal.jsx';
import CCTVMonitorModal from './components/control/CCTVMonitorModal.jsx';
import Fork2Modal from './components/control/Fork2Modal.jsx';
import './game.css';
import './control.css';

const WING_DOORS = {
  annex_door: ['Locker Annex (5C) door unlatched.', 'Locker Annex (5C) door shut.'],
  south_wing_door: ['South connecting corridor door unlatched.', 'South connecting corridor door shut.'],
  observation_door: ['Observation Wing (5D) door unsealed.', 'Observation Wing (5D) door shut.'],
  chamber3_door: ['Chamber 3 containment door unlatched.', 'Chamber 3 containment door shut.'],
  chamber3_north_door: ['Chamber 3 north passage opened.', 'Chamber 3 north passage shut.'],
  cryo_door: ['Cryo Autopsy Wing (5E) unsealed.', 'Cryo Autopsy Wing (5E) door shut.'],
  generator_door: ['Relay Vault (5F) bulkhead opened.', 'Relay Vault (5F) bulkhead shut.'],
  morgue_vault_door: ['Cryo–Relay connecting passage opened.', 'Cryo–Relay connecting passage shut.'],
};

const PROP_GUIDE_SPECS = [
  { id: 'relay_rack',     label: 'Relay Rack',         wing: 'Wing 5F', short: '5F RELAY',  pos: [-12.25, 18.45], seqIds: ['EC01', 'EC02'], allIds: ['EC01', 'EC02'] },
  { id: 'tape_deck_cart', label: 'Tape Deck Cart',     wing: 'Wing 5C', short: '5C TAPE',   pos: [-2.58, 12.60],  seqIds: ['EC03', 'EC04'], allIds: ['EC03', 'EC04'] },
  { id: 'operator_chair', label: 'Operator Chair',     wing: 'Bay 5B',  short: '5B CHAIR',  pos: [-2.79, 0.16],   seqIds: ['EC05'],         allIds: ['EC05', 'XC01'] },
  { id: 'cable_trench',   label: 'Cable Trench',       wing: 'Wing 5D', short: '5D TRENCH', pos: [-10.42, 10.80], seqIds: ['EC06'],         allIds: ['EC06'] },
  { id: 'wall_clipboard', label: 'Wall Clipboard',     wing: 'Bay 5B',  short: '5B BOARD',  pos: [-2.05, 1.48],   seqIds: ['EC07'],         allIds: ['EC07', 'XC02'] },
  { id: 'fuse_box',       label: 'Fuse Box',           wing: 'Bay 5B',  short: '5B FUSE',   pos: [3.02, -0.58],   seqIds: ['EC08'],         allIds: ['EC08'] },
];

function computePropGuidance(data) {
  const collectedSet = new Set(data?.collected_fragment_ids || []);
  const backendFragObjects = (data?.objects || []).filter((o) => o.kind === 'interactive_fragment');
  const activeSpecs =
    backendFragObjects.length === 0 || backendFragObjects.some((o) => PROP_GUIDE_SPECS.some((s) => s.id === o.id))
      ? PROP_GUIDE_SPECS
      : backendFragObjects.map((o, idx) => ({
          id: o.id,
          label: String(o.label || o.id).replace(/^TEST:\s*/i, ''),
          wing: `Stop ${idx + 1}`,
          short: o.id.slice(0, 8).toUpperCase(),
          pos: null,
          seqIds: [],
          allIds: [],
        }));

  let nextPropId = null;
  for (const spec of activeSpecs) {
    if (spec.seqIds.some((fid) => !collectedSet.has(fid))) {
      nextPropId = spec.id;
      break;
    }
  }
  if (!nextPropId && !data?.basket_unlocked) {
    const anyIncomplete = activeSpecs.find((spec) => spec.allIds.some((fid) => !collectedSet.has(fid)));
    nextPropId = anyIncomplete?.id || activeSpecs[0]?.id || null;
  }

  const propChecklist = activeSpecs.map((spec) => {
    const total = spec.allIds.length;
    const collected = spec.allIds.filter((fid) => collectedSet.has(fid)).length;
    const isDone = total > 0 ? collected >= total : Boolean(data?.basket_unlocked);
    const isNext = !isDone && spec.id === nextPropId;
    return {
      ...spec,
      collected,
      total,
      remaining: Math.max(0, total - collected),
      isDone,
      isNext,
    };
  });

  const nextSpec = propChecklist.find((p) => p.isNext) || propChecklist.find((p) => !p.isDone) || null;
  return {
    propChecklist,
    nextProp: nextSpec,
    nextPropId: nextSpec?.id || null,
    nextTargetLabel: nextSpec ? `${nextSpec.label} (${nextSpec.wing})` : 'All fragments recovered!',
    pendingPropIds: propChecklist.filter((p) => !p.isDone).map((p) => p.id),
    clearedPropIds: propChecklist.filter((p) => p.isDone).map((p) => p.id),
  };
}

// ─── Room 5 (R2-Room 2): The Surveillance Morgue ──────────────────────────────
export default function Room5Control({ team, onLogout }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const audioRef = useRef(null);
  const scaresRef = useRef(null);
  const roomDataRef = useRef(null);
  const handleInteractRef = useRef(null);
  const activeTargetRef = useRef(null);
  const notifTimerRef = useRef(null);
  const flashlightOnRef = useRef(true);

  // ── Game state (100% backend-driven) ────────────────────────────────────────
  const [roomData, setRoomData] = useState(null);
  const [basketData, setBasketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [assetProgress, setAssetProgress] = useState(null);
  const [telemetryState, setTelemetryState] = useState({
    inSafeRoom: true,
    ghostTelemetry: null,
    playerPos: { x: 0.25, z: 0.25, yaw: 0 },
  });
  const lastTelKeyRef = useRef('');
  const isDevMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('dev');

  // Modal visibility
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isCaseDossierOpen, setIsCaseDossierOpen] = useState(false);
  const [isRoomCompleteModalOpen, setIsRoomCompleteModalOpen] = useState(false);
  const [isFork2Open, setIsFork2Open] = useState(false);
  const [isCCTVOpen, setIsCCTVOpen] = useState(false);
  const [activeClueModal, setActiveClueModal] = useState(null); // 'R2-01' | 'R2-05' | 'R2-06' | null
  const [inspectModalData, setInspectModalData] = useState(null);

  // UX state
  const [activeHoverPrompt, setActiveHoverPrompt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemNotification, setSystemNotification] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [qualityMode, setQualityMode] = useState('high');
  const [isJumpscaring, setIsJumpscaring] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [mouseSens, setMouseSens] = useState(1.0);
  const isStartedRef = useRef(false);
  const isAnyModalOpenRef = useRef(false);

  // Horror flash overlay
  const [flashOverlay, setFlashOverlay] = useState({
    color: '#000',
    opacity: 0,
    visible: false,
  });

  const showNotification = useCallback((msg) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setSystemNotification(msg);
    notifTimerRef.current = setTimeout(() => setSystemNotification(null), 5500);
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
      } else if (res.status === 401 || res.status === 403) {
        showNotification('Session expired. Please refresh and log in again.');
      }
    } catch (err) {
      console.error('[ROOM5] Failed to fetch room state:', err);
      showNotification('Unable to connect to game server. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const fetchBasketState = useCallback(async () => {
    try {
      const res = await fetch('/api/game/room/control/basket', {
        credentials: 'include',
        headers: { 'x-session-token': localStorage.getItem('ctc_token') || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setBasketData(data);
      }
    } catch {
      // Fall back cleanly to roomData.evidence
    }
  }, []);

  useEffect(() => {
    const onDownloaded = (e) => {
      if (e?.detail?.filename) {
        showNotification(
          `Downloaded "${e.detail.filename}" (${e.detail.bytes || 0} bytes).`
        );
      }
    };
    window.addEventListener('ctc:file-downloaded', onDownloaded);
    return () => window.removeEventListener('ctc:file-downloaded', onDownloaded);
  }, [showNotification]);

  // ── Jumpscare Catch Handler: Respawn inside Safe Room 5B (fragments stay persisted in DB) ──
  const handlePlayerCaught = useCallback(() => {
    setIsJumpscaring(false);
    setIsBasketOpen(false);
    setIsCaseDossierOpen(false);
    setIsFork2Open(false);
    setIsCCTVOpen(false);
    setActiveClueModal(null);
    setInspectModalData(null);

    engineRef.current?.shake?.(1.6, 0.72);
    engineRef.current?.setView?.(
      SAFE_ROOM_RESPAWN[0],
      SAFE_ROOM_RESPAWN[1],
      SAFE_ROOM_RESPAWN[2] ?? 0,
      0
    );
    showNotification(
      'Specimen S-011 drove you back into Safe Room 5B — all recovered fragments remain safe in your Evidence Basket.'
    );
  }, [showNotification]);

  const handlePlayerCaughtRef = useRef(handlePlayerCaught);
  handlePlayerCaughtRef.current = handlePlayerCaught;

  useEffect(() => {
    fetchRoomState();
  }, [fetchRoomState]);

  // ── Initialize Three.js engine ──────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current || engineRef.current) return;

    audioRef.current = new GameAudioControl();

    try {
      const engine = createEngine(mountRef.current, controlConfig, {
        audio: audioRef.current,
        teamName: team?.name || '',

        onLoadProgress: (pct, label) => {
          setAssetProgress({ pct, label });
        },

        onFlash: (color, opacity, durationMs) => {
          setFlashOverlay({ color, opacity, visible: true });
          setTimeout(
            () => setFlashOverlay((prev) => ({ ...prev, visible: false })),
            durationMs || 150
          );
        },

        onGlassCrack: null,

        onScare: (_name, message) => {
          showNotification(message);
        },

        onTeamNameInjection: (name) => {
          showNotification(
            `GHOST TRACE — TERMINAL LOGGED: "${name || team?.name || 'SUBJECT'}"`
          );
        },

        onQualityChange: (mode) => {
          setQualityMode(mode);
        },

        onJumpscareStart: () => {
          setIsJumpscaring(true);
        },

        onPlayerCaught: (pos) => {
          handlePlayerCaughtRef.current?.(pos);
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
            setActiveHoverPrompt(
              rd?.is_completed
                ? 'Core Airlock Valve Selector (Proceed Forward)'
                : 'Sealed Vault Door — Solve all clues to open'
            );
          } else if (
            targetId === 'staff_terminal' ||
            targetId === 'radio_console' ||
            targetId === 'sound_console'
          ) {
            const rd = roomDataRef.current;
            if (!rd?.basket_unlocked) {
              const colCount = rd?.collected_fragment_ids?.length ?? 0;
              const totCount = rd?.total_fragments_in_room ?? 10;
              setActiveHoverPrompt(
                `Clue Terminal Locked — Recover all evidence fragments first (${colCount}/${totCount})`
              );
            } else {
              setActiveHoverPrompt(controlConfig.interact[targetId]?.label || targetId);
            }
          } else if (PROP_GUIDE_SPECS.some((s) => s.id === targetId)) {
            const rd = roomDataRef.current;
            const guide = computePropGuidance(rd);
            const item = guide.propChecklist.find((p) => p.id === targetId);
            const baseLabel = controlConfig.interact?.[targetId]?.label || targetId;
            setActiveHoverPrompt(item?.isDone ? `${baseLabel} (Already Searched)` : baseLabel);
          } else if (controlConfig.interact?.[targetId]?.label) {
            setActiveHoverPrompt(controlConfig.interact[targetId].label);
          } else if (targetId === 'control_door' || WING_DOORS[targetId]) {
            setActiveHoverPrompt(`Open ${targetId.replace(/_/g, ' ')}`);
          } else {
            setActiveHoverPrompt(null);
          }
        },

        onInteract: async (objectId) => {
          handleInteractRef.current?.(objectId);
        },
      });

      if (!engine._controlBuilt) {
        buildControlScene(engine);
        scaresRef.current = createControlScares(engine, {
          audio: audioRef.current,
          teamName: team?.name || '',
          onFlash: (color, opacity, durationMs) => {
            setFlashOverlay({ color, opacity, visible: true });
            setTimeout(
              () => setFlashOverlay((prev) => ({ ...prev, visible: false })),
              durationMs || 150
            );
          },
          onScare: (_name, message) => showNotification(message),
          onTeamNameInjection: (name) => {
            showNotification(
              `GHOST TRACE — TERMINAL LOGGED: "${name || team?.name || 'SUBJECT'}"`
            );
          },
          onJumpscareStart: () => setIsJumpscaring(true),
          onPlayerCaught: (pos) => handlePlayerCaughtRef.current?.(pos),
          onGlassCrack: null,
        });
      } else {
        scaresRef.current = engine.scares;
      }

      engineRef.current = engine;
      setQualityMode(engine.getQualityMode?.() || 'high');

      if (roomDataRef.current?.is_completed) {
        engine.openDoor?.();
      }
    } catch (err) {
      console.error('[ROOM5] Three.js control engine initialization failed:', err);
    }

    const onLockChange = () => {
      setIsPointerLocked(Boolean(document.pointerLockElement));
    };
    const onResumeAudio = () => {
      if (isStartedRef.current) audioRef.current?.ensureActive?.();
    };
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('pointerdown', onResumeAudio, { passive: true });
    window.addEventListener('keydown', onResumeAudio, { passive: true });

    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('pointerdown', onResumeAudio);
      window.removeEventListener('keydown', onResumeAudio);
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.dispose?.();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lightweight throttled telemetry poll (only re-renders when display values actually change)
  useEffect(() => {
    if (!isStarted) return undefined;
    const iv = setInterval(() => {
      const pos = engineRef.current?.getPos?.();
      const px = pos ? Number(pos.x.toFixed(1)) : 0.25;
      const pz = pos ? Number(pos.z.toFixed(1)) : 0.25;
      const pyaw =
        typeof pos?.yaw === 'number' && !Number.isNaN(pos.yaw)
          ? Number(pos.yaw.toFixed(2))
          : 0;
      const inSafe = pos ? isInsideSafeRoom5B(pos.x, pos.z) : true;
      const gTel = scaresRef.current?.getGhostTelemetry?.() || null;
      const qx = Math.round(px * 2);
      const qz = Math.round(pz * 2);
      const qYaw = Math.round(pyaw * 4);
      const telKey = `${inSafe}|${qx}|${qz}|${qYaw}|${gTel?.cyclePhase || ''}|${gTel?.state || ''}|${gTel?.camId || ''}|${gTel?.incomingCam || ''}|${gTel?.nextEventSec ?? ''}|${Boolean(gTel?.isHunting)}`;
      if (telKey !== lastTelKeyRef.current) {
        lastTelKeyRef.current = telKey;
        setTelemetryState({
          inSafeRoom: inSafe,
          ghostTelemetry: gTel,
          playerPos: { x: px, z: pz, yaw: pyaw },
        });
      }
    }, 250);
    return () => clearInterval(iv);
  }, [isStarted]);

  // ── Start game ──────────────────────────────────────────────────────────────
  const handleStartGame = useCallback(() => {
    setIsStarted(true);
    audioRef.current?.start?.(controlConfig.audio);
    if (engineRef.current) {
      engineRef.current.setPaused?.(false);
      engineRef.current.lock?.();
    }
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (isAnyModalOpenRef.current) {
          setIsBasketOpen(false);
          setIsCaseDossierOpen(false);
          setIsFork2Open(false);
          setIsCCTVOpen(false);
          setIsRoomCompleteModalOpen(false);
          setActiveClueModal(null);
          setInspectModalData(null);
          engineRef.current?.setPaused?.(false);
          engineRef.current?.lock?.();
        } else {
          engineRef.current?.unlock?.();
        }
        return;
      }

      const tag = (
        e.target?.tagName ||
        document.activeElement?.tagName ||
        ''
      ).toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }

      if (!isStartedRef.current && (e.key === 'Enter' || e.key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        handleStartGame();
        return;
      }

      if (e.key === 'e' || e.key === 'E' || e.code === 'KeyE') {
        if (e.repeat) return;
        if (isAnyModalOpenRef.current || !isStartedRef.current) return;
        const target = activeTargetRef.current;
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          handleInteractRef.current?.(target);
        }
        return;
      }

      if (e.key === 'f' || e.key === 'F' || e.code === 'KeyF') {
        if (isAnyModalOpenRef.current) return;
        e.preventDefault();
        const next = !flashlightOnRef.current;
        flashlightOnRef.current = next;
        engineRef.current?.setFlashlight?.(next);
        audioRef.current?.click?.();
        return;
      }

      if (e.key === 'b' || e.key === 'B' || e.code === 'KeyB') {
        e.preventDefault();
        setIsBasketOpen((prev) => {
          const next = !prev;
          if (next) {
            fetchBasketState();
            engineRef.current?.unlock?.();
          }
          return next;
        });
        return;
      }

      if (e.key === 'c' || e.key === 'C' || e.code === 'KeyC') {
        e.preventDefault();
        setIsCaseDossierOpen((prev) => {
          const next = !prev;
          if (next) engineRef.current?.unlock?.();
          return next;
        });
        return;
      }

      if (e.key === 'm' || e.key === 'M' || e.code === 'KeyM') {
        e.preventDefault();
        setAudioMuted((prev) => {
          const next = !prev;
          audioRef.current?.setMuted?.(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleGlobalKey, true);
    return () => window.removeEventListener('keydown', handleGlobalKey, true);
  }, [fetchBasketState, handleStartGame]);

  // ── Main interaction handler ────────────────────────────────────────────────
  const handleInteract = useCallback(
    async (objectId) => {
      audioRef.current?.ensureActive?.();
      const currentData = roomDataRef.current;

      // ── Entry door / strictly one-way (no returning to Room 4) ──
      if (objectId === 'room_door' || objectId === 'entry_door') {
        engineRef.current?.rattleDoor?.('entry_door');
        audioRef.current?.bad?.();
        scaresRef.current?.triggerBreachHunt?.(0.35);
        showNotification(
          'The armoured entry hatch sealed shut behind you. There is no going back. Find a way forward.'
        );
        return;
      }

      // ── Vault / exit door -> Opens Fork 2 modal once clues solved ──
      if (objectId === 'vault_door' || objectId === 'exit_door') {
        if (currentData?.is_completed) {
          setIsFork2Open(true);
          engineRef.current?.unlock?.();
          engineRef.current?.openDoor?.();
        } else {
          engineRef.current?.rattleDoor?.('vault_door');
          audioRef.current?.bad?.();
          scaresRef.current?.triggerBreachHunt?.(0.35);
          showNotification(
            'The vault door is electromagnetically sealed. Solve all three clue terminals first.'
          );
        }
        return;
      }

      // ── Monitor bank: CCTV horror + camera viewer ──
      if (objectId === 'monitor_bank') {
        scaresRef.current?.triggerCCTVHorror?.();
        showNotification('Static bursts across the surveillance monitors.');
        setIsCCTVOpen(true);
        engineRef.current?.unlock?.();
        return;
      }

      // ── Dead intercom decor ──
      if (objectId === 'dead_intercom') {
        audioRef.current?.intercomCrackle?.();
        showNotification(
          'A burst of static hisses from the intercom speaker, then falls dead.'
        );
        return;
      }

      // ── Internal 3D wing bulkhead doors (physical navigation across wings) ──
      if (objectId === 'control_door') {
        const opened = engineRef.current?.toggleControlDoor?.();
        audioRef.current?.relayClick?.();
        if (opened) scaresRef.current?.triggerDoorSighting?.('control_door', { respectGrace: true });
        showNotification(
          opened
            ? 'Control Bay bulkhead unlatched — outer corridor accessible.'
            : 'Control Bay bulkhead latched shut.'
        );
        return;
      }

      if (WING_DOORS[objectId]) {
        const opened = engineRef.current?.toggleWingDoor?.(objectId);
        audioRef.current?.relayClick?.();
        if (opened) scaresRef.current?.triggerDoorSighting?.(objectId, { respectGrace: true });
        const [openMsg, shutMsg] = WING_DOORS[objectId];
        showNotification(opened ? openMsg : shutMsg);
        return;
      }

      // ── Clue Terminals (dynamically mapped or direct IDs) ──
      const totalFragmentsCount = currentData?.total_fragments_in_room ?? 10;
      const collectedCountNow = currentData?.collected_fragment_ids?.length ?? 0;
      const matchingClue = currentData?.clues?.find((c) => c.object_id === objectId);
      const terminalToClue = {
        staff_terminal: 'R2-01',
        radio_console: 'R2-05',
        sound_console: 'R2-06',
      };
      const resolvedClueId = matchingClue?.id || terminalToClue[objectId];

      if (resolvedClueId) {
        if (!currentData?.basket_unlocked) {
          audioRef.current?.bad?.();
          showNotification('This terminal is locked. Collect all evidence fragments first.');
          setInspectModalData({
            type: 'locked_terminal',
            terminalName: matchingClue?.title || objectId.replace(/_/g, ' '),
            collectedCount: collectedCountNow,
            totalCount: totalFragmentsCount,
          });
          engineRef.current?.unlock?.();
          return;
        }
        if (resolvedClueId === 'R2-01') {
          scaresRef.current?.triggerTeamNameInjection?.();
        }
        setActiveClueModal(resolvedClueId);
        engineRef.current?.unlock?.();
        return;
      }

      // ── Ambient / Environmental 3D Props (authentic Substation Delta writing) ─
      if (CONTROL_PROP_NOTES[objectId]) {
        const baseNote = CONTROL_PROP_NOTES[objectId];
        let customLines = baseNote.lines;
        if (objectId === 'wall_breaker') {
          const lightsOn = engineRef.current?.toggleBreakerLight?.();
          audioRef.current?.relayClick?.();
          customLines = [
            `Breaker thrown — overhead emergency lighting is now ${lightsOn ? 'ON (illuminated)' : 'OFF (dimmed)'}.`,
            ...baseNote.lines,
          ];
          showNotification(`Emergency lighting switched ${lightsOn ? 'ON' : 'OFF'}.`);
        } else if (objectId === 'ringing_phone') {
          scaresRef.current?.markPhoneAnswered?.();
          audioRef.current?.relayClick?.();
        } else if (objectId === 'containment_key') {
          engineRef.current?.pickupContainmentKey?.();
          audioRef.current?.relayClick?.();
        } else {
          audioRef.current?.step?.(0.35);
        }
        setInspectModalData({
          ...baseNote,
          lines: customLines,
        });
        engineRef.current?.unlock?.();
        return;
      }

      // ── Backend fragment search (only spec props) ──
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
          const propLabel =
            controlConfig.interact?.[objectId]?.label?.replace(/^Search\s+/i, '') ||
            objectId.replace(/_/g, ' ');
          if (result.found) {
            audioRef.current?.good?.();
            scaresRef.current?.maybeFragmentScare?.();
            await fetchRoomState();
            const refreshed = roomDataRef.current;
            const refreshedGuide = computePropGuidance(refreshed);
            const propInfo = refreshedGuide.propChecklist.find((p) => p.id === objectId);
            const evObj =
              (refreshed?.evidence || []).find((e) => e.id === result.fragment_id) || {
                id: result.fragment_id,
                is_wrapped: !refreshed?.basket_unlocked,
                display: {
                  title: `Evidence ${result.fragment_id}`,
                  lines: [result.message || 'Fragment recovered.'],
                },
              };
            const count =
              result.total_collected ?? refreshed?.collected_fragment_ids?.length ?? 0;
            const totalInRoom =
              result.total_in_room ?? refreshed?.total_fragments_in_room ?? 10;
            if ((propInfo && propInfo.isDone) || count >= totalInRoom) {
              engineRef.current?.setFragmentCleared?.(objectId);
            }
            setInspectModalData({
              type: 'evidence',
              evidence: evObj,
              sourceName: propLabel,
              collectedCount: count,
              totalCount: totalInRoom,
              remainingHere: propInfo ? propInfo.remaining : 0,
            });
            engineRef.current?.unlock?.();
          } else {
            audioRef.current?.step?.(0.5);
            if (result.already_collected) {
              engineRef.current?.setFragmentCleared?.(objectId);
              if (!result.message) {
                showNotification(
                  `Nothing new in ${propLabel} — all items here are already in your Evidence Basket [B].`
                );
              }
            } else if (result.locked) {
              setInspectModalData({
                type: 'sequence_locked',
                propName: propLabel,
                collectedCount: collectedCountNow,
                totalCount: totalFragmentsCount,
              });
              engineRef.current?.unlock?.();
            }
          }
        } else if (res.status === 401 || res.status === 403) {
          showNotification('Session expired. Please log in again.');
        } else {
          showNotification('Unable to search this object right now.');
        }
      } catch (err) {
        console.error('[ROOM5] Fragment search failed:', err);
        showNotification('Connection interrupted while searching prop.');
      }
    },
    [fetchRoomState, showNotification]
  );

  handleInteractRef.current = handleInteract;

  // ── Submit clue answer to live backend ──────────────────────────────────────
  const handleClueSubmit = useCallback(
    async (clueId, answer) => {
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
            scaresRef.current?.triggerBreachHunt?.(data.exhausted ? 1.1 : 0.6, {
              respectGrace: true,
            });
          }
          return data;
        } else {
          const errData = await res.json().catch(() => ({}));
          audioRef.current?.bad?.();
          engineRef.current?.shake?.(0.7, 0.35);
          scaresRef.current?.triggerBreachHunt?.(0.75, { respectGrace: true });
          return {
            correct: false,
            message: errData.detail || 'Submission rejected',
          };
        }
      } catch (err) {
        console.error('[ROOM5] Clue submission failed:', err);
        return { correct: false, message: 'Server communication error' };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchRoomState]
  );

  // ── Derived state from live backend payload ─────────────────────────────────
  const totalFragmentsCount = roomData?.total_fragments_in_room ?? 10;
  const collectedIdsList = roomData?.collected_fragment_ids || [];
  const collectedCount = collectedIdsList.length;
  const effectiveBasketUnlocked = Boolean(roomData?.basket_unlocked);
  const evidenceList = basketData?.fragments?.length
    ? basketData.fragments
    : roomData?.evidence || [];

  const roomClues = roomData?.clues || [];
  const cluesSolvedCount = roomClues.filter((c) => c.solved).length;
  const totalCluesCount = roomClues.length || 3;

  const getClueState = (id) => {
    const found = roomClues.find((c) => c.id === id);
    if (!found) return { id, attempts: 0, attempts_max: 3, attempts_remaining: 3 };
    const maxAtt = found.attempts_max ?? 3;
    const used = found.attempts ?? 0;
    const left = Math.max(0, maxAtt - used);
    return {
      ...found,
      attempts_remaining: left,
      exhausted: Boolean(found.exhausted || (!found.solved && left <= 0)),
    };
  };

  const isAnyModalOpen =
    isBasketOpen ||
    isCaseDossierOpen ||
    isFork2Open ||
    isRoomCompleteModalOpen ||
    isCCTVOpen ||
    Boolean(inspectModalData) ||
    Boolean(activeClueModal);

  isStartedRef.current = isStarted;
  isAnyModalOpenRef.current = isAnyModalOpen;

  useEffect(() => {
    engineRef.current?.setPaused?.(!isStarted || isAnyModalOpen);
  }, [isStarted, isAnyModalOpen]);

  const resumeGameplayLock = useCallback(() => {
    engineRef.current?.setPaused?.(false);
    engineRef.current?.lock?.();
  }, []);

  const handleOpenBasket = useCallback(() => {
    fetchBasketState();
    setIsBasketOpen(true);
    engineRef.current?.unlock?.();
  }, [fetchBasketState]);

  const handleOpenCaseFiles = useCallback(() => {
    setIsCaseDossierOpen(true);
    engineRef.current?.unlock?.();
  }, []);

  const handleToggleAudio = useCallback(() => {
    setAudioMuted((prev) => {
      const next = !prev;
      audioRef.current?.setMuted?.(next);
      return next;
    });
  }, []);

  const handleToggleQuality = useCallback(() => {
    setQualityMode((prev) => {
      const next = prev === 'eco' ? 'high' : 'eco';
      engineRef.current?.setQualityMode?.(next);
      showNotification(
        next === 'eco'
          ? 'Graphics switched to ECO mode (reduced resolution & FX for smoother FPS).'
          : 'Graphics switched to HIGH fidelity mode.'
      );
      return next;
    });
  }, [showNotification]);

  const handleCycleSensitivity = useCallback(() => {
    const steps = [0.7, 1.0, 1.4];
    setMouseSens((prev) => {
      const next = steps[(steps.indexOf(prev) + 1) % steps.length] ?? 1.0;
      engineRef.current?.setSensitivity?.(next);
      return next;
    });
  }, []);

  const remainingCount = Math.max(0, totalFragmentsCount - collectedCount);
  const clueHint = roomData?.is_completed
    ? 'Vault seal broken — interact with the Vault Exit Door for Fork 2 Valve selection'
    : effectiveBasketUnlocked
    ? cluesSolvedCount < totalCluesCount
      ? `Evidence Basket unsealed (${cluesSolvedCount}/${totalCluesCount} terminals solved) — inspect bunker terminals to unlock the Vault Door`
      : 'All clue terminals verified — approach the Vault Exit Door'
    : `Search Substation Delta wings & fixtures (${remainingCount} fragment${remainingCount === 1 ? '' : 's'} remaining before Evidence Basket unseals)`;

  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none font-mono"
      style={{ background: '#050404' }}
    >
      {/* 3D Canvas */}
      <div
        ref={mountRef}
        className={`absolute inset-0 w-full h-full ${
          isPointerLocked && !isAnyModalOpen
            ? 'cursor-none'
            : activeHoverPrompt && !isAnyModalOpen
            ? 'cursor-pointer'
            : 'cursor-crosshair'
        }`}
      />

      {/* Subtle edge vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at center, transparent 64%, rgba(0,0,0,0.36) 100%)',
        }}
      />

      {/* Horror flash overlay */}
      {flashOverlay.visible && (
        <div
          className="horror-flash pointer-events-none"
          style={{
            backgroundColor: flashOverlay.color,
            opacity: flashOverlay.opacity,
          }}
        />
      )}

      {/* Room 5 Entry Overlay (Curse the Code atmospheric start screen) */}
      {!isStarted && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 select-none p-6">
          <div className="text-center space-y-5 max-w-lg">
            <div className="font-mono text-[11px] tracking-[0.38em] uppercase text-[#c4a265]/80">
              R2 · ROOM 2 {loading ? '· CONNECTING...' : '· SECTOR 5 CONTROL'}
            </div>
            <h1 className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.2em] uppercase text-[#e6e1d6]">
              {roomData?.title || 'THE SURVEILLANCE MORGUE'}
            </h1>
            <p className="font-mono text-xs text-[#9c9282] leading-relaxed">
              Recover all {totalFragmentsCount} evidence fragments hidden across the facility wings, decrypt all 3 verification terminals, and equalize the Core Airlock valve. Control Bay 5B remains your sanctuary.
            </p>
            {assetProgress && assetProgress.pct < 100 ? (
              <div className="text-[#4dff78] font-mono text-xs tracking-wider">
                {assetProgress.label} — {Math.round(assetProgress.pct)}%
              </div>
            ) : (
              <button
                type="button"
                data-testid="enter-morgue-btn"
                onClick={handleStartGame}
                className="px-8 py-3 border border-[#4dff78]/60 text-[#4dff78] font-mono text-xs sm:text-sm tracking-widest uppercase hover:bg-[#4dff78]/10 transition cursor-pointer"
              >
                ENTER THE SURVEILLANCE MORGUE
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active 3D Jumpscare Crimson Edge Vignette */}
      {isJumpscaring && (
        <div
          aria-hidden="true"
          data-testid="jumpscare-vignette"
          className="fixed inset-0 z-[68] pointer-events-none animate-pulse"
          style={{
            background:
              'radial-gradient(circle at center, transparent 28%, rgba(128, 10, 10, 0.56) 72%, rgba(28, 2, 2, 0.92) 100%)',
          }}
        />
      )}

      {/* System notification toast */}
      {systemNotification && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-lg rounded-full px-5 py-2.5 backdrop-blur-md text-xs font-sans shadow-2xl flex items-center gap-2.5 animate-fade-in-fast"
          style={{
            background:
              'linear-gradient(90deg, rgba(20, 14, 14, 0.94) 0%, rgba(16, 13, 12, 0.85) 82%, rgba(16, 13, 12, 0.3) 100%)',
            border: '1px solid rgba(196, 162, 101, 0.22)',
            color: '#f2eadc',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#c94a4a] shrink-0" />
          <span>{systemNotification}</span>
        </div>
      )}

      {/* HUD */}
      {isStarted && (
        <HUDControl
          roomTitle={roomData?.title || 'The Surveillance Morgue'}
          totalFragments={totalFragmentsCount}
          collectedCount={collectedCount}
          basketUnlocked={effectiveBasketUnlocked}
          isRoomCompleted={Boolean(roomData?.is_completed)}
          cluesSolved={cluesSolvedCount}
          totalClues={totalCluesCount}
          clueHint={clueHint}
          playerPos={telemetryState.playerPos}
          isSafeZone={telemetryState.inSafeRoom}
          isThreatActive={Boolean(telemetryState.ghostTelemetry?.isHunting)}
          ghostTelemetry={telemetryState.ghostTelemetry}
          onOpenBasket={handleOpenBasket}
          onOpenCaseFiles={handleOpenCaseFiles}
          onLogout={onLogout}
          audioMuted={audioMuted}
          onToggleAudio={handleToggleAudio}
          qualityMode={qualityMode}
          onToggleQuality={handleToggleQuality}
          activeHoverPrompt={activeHoverPrompt}
          isPointerLocked={isPointerLocked}
          mouseSensitivity={mouseSens}
          onCycleSensitivity={handleCycleSensitivity}
          onRequestLock={resumeGameplayLock}
        />
      )}

      {/* Evidence Basket Modal */}
      {isBasketOpen && (
        <ControlBasketModal
          isOpen={true}
          onClose={() => {
            setIsBasketOpen(false);
            resumeGameplayLock();
          }}
          evidence={evidenceList}
          collectedIds={collectedIdsList}
          basketUnlocked={effectiveBasketUnlocked}
          totalInRoom={totalFragmentsCount}
          roomTitle={roomData?.title || 'The Surveillance Morgue'}
        />
      )}

      {/* Case Dossier Modal */}
      {isCaseDossierOpen && (
        <ControlDossierModal
          isOpen={true}
          onClose={() => {
            setIsCaseDossierOpen(false);
            resumeGameplayLock();
          }}
          clues={roomClues}
          basketUnlocked={effectiveBasketUnlocked}
          totalFragments={totalFragmentsCount}
          collectedCount={collectedCount}
          onOpenClue={(clue) => {
            setIsCaseDossierOpen(false);
            if (!effectiveBasketUnlocked) {
              showNotification(
                `Terminal locked: Collect all ${totalFragmentsCount} evidence fragments first to unlock clue access.`
              );
              return;
            }
            setActiveClueModal(clue.id);
            engineRef.current?.unlock?.();
          }}
        />
      )}

      {/* Clue R2-01: Personnel Index Terminal */}
      {activeClueModal === 'R2-01' && (
        <PersonnelIndexModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            resumeGameplayLock();
          }}
          onSubmit={(answer) => handleClueSubmit('R2-01', answer)}
          clueState={getClueState('R2-01')}
          teamName={team?.name || ''}
        />
      )}

      {/* Clue R2-05: Transmission Archive */}
      {activeClueModal === 'R2-05' && (
        <TransmissionArchiveModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            resumeGameplayLock();
          }}
          onSubmit={(answer) => handleClueSubmit('R2-05', answer)}
          clueState={getClueState('R2-05')}
        />
      )}

      {/* Clue R2-06: Spectrogram Analyser */}
      {activeClueModal === 'R2-06' && (
        <SpectrogramModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            resumeGameplayLock();
          }}
          onSubmit={(answer) => handleClueSubmit('R2-06', answer)}
          clueState={getClueState('R2-06')}
        />
      )}

      {/* CCTV Monitor Modal */}
      {isCCTVOpen && (
        <CCTVMonitorModal
          isOpen={true}
          onClose={() => {
            setIsCCTVOpen(false);
            resumeGameplayLock();
          }}
          ghostTelemetry={telemetryState.ghostTelemetry}
          playerPos={telemetryState.playerPos}
          collectedIds={collectedIdsList}
          totalFragments={totalFragmentsCount}
        />
      )}

      {/* Evidence Pickup & Terminal Locked Modal */}
      {inspectModalData && (
        <EvidencePickupModal
          modalData={inspectModalData}
          onClose={() => {
            setInspectModalData(null);
            resumeGameplayLock();
          }}
        />
      )}

      {/* Fork 2 Modal: Core Airlock Valve Selector (Choice A trap +60s, Choice B -> Room 6) */}
      {isFork2Open && (
        <Fork2Modal
          isOpen={true}
          onClose={() => {
            setIsFork2Open(false);
            resumeGameplayLock();
          }}
          audio={audioRef.current}
          onProceedToRoom6={() => {
            setIsFork2Open(false);
            window.dispatchEvent(new CustomEvent('ctc:navigate-room', { detail: 'vault' }));
            showNotification(
              'Core Airlock Valve B engaged. Hydraulic seal to The Anointing Vault (Room 6) unsealed!'
            );
            resumeGameplayLock();
          }}
        />
      )}

      {/* Room Complete Modal */}
      {isRoomCompleteModalOpen && (
        <ControlRoomCompleteModal
          isOpen={true}
          cluesSolved={cluesSolvedCount}
          totalClues={totalCluesCount}
          collectedCount={collectedCount}
          totalFragments={totalFragmentsCount}
          onClose={() => {
            setIsRoomCompleteModalOpen(false);
            resumeGameplayLock();
          }}
          onProceedToDoor={() => {
            setIsRoomCompleteModalOpen(false);
            setIsFork2Open(true);
            engineRef.current?.unlock?.();
          }}
        />
      )}

      {/* Dev Position Calibrator (?dev=1) */}
      {isStarted && isDevMode && <DevCalibratorOverlay engineRef={engineRef} />}
    </div>
  );
}

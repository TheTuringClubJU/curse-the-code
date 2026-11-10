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
import DevCalibratorOverlay from './components/control/DevCalibratorOverlay.jsx';
import EvidencePickupModal from './components/control/EvidencePickupModal.jsx';
import CCTVMonitorModal from './components/control/CCTVMonitorModal.jsx';
import { EntrySplash } from './components/control/EntrySplash.jsx';
import {
  createSimulationRoom5,
  ROOM5_WORLD_DOCUMENTS,
  ROOM5_ENV_DOCUMENTS,
  enrichRoom5EvidenceItem,
  isInsideSafeRoom5B,
  SAFE_ROOM_RESPAWN,
} from './engine/simulationControl.js';
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
  const simRef = useRef(null);
  const isSimModeRef = useRef(false);
  const notifTimerRef = useRef(null);
  const flashlightOnRef = useRef(true);
  const worldDocsMapRef = useRef(new Map());
  const liveDroppedMapRef = useRef(new Map());
  const caughtTimerRef = useRef(null);

  // ── Game state ──────────────────────────────────────────────────────────────
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [assetProgress, setAssetProgress] = useState(null); // { pct, label } when GLBs load
  const [isSimMode, setIsSimMode] = useState(false);
  const [worldDocsVersion, setWorldDocsVersion] = useState(0);
  const [droppedItems, setDroppedItems] = useState([]);
  const [caughtOverlay, setCaughtOverlay] = useState(null);
  const [telemetryState, setTelemetryState] = useState({
    inSafeRoom: true,
    ghostTelemetry: null,
  });
  const isDevMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev');

  // Modal visibility
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isCaseDossierOpen, setIsCaseDossierOpen] = useState(false);
  const [isRoomCompleteModalOpen, setIsRoomCompleteModalOpen] = useState(false);
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
  const hasContainmentKeyRef = useRef(false);
  const [hasContainmentKey, setHasContainmentKey] = useState(false);

  // Horror overlay
  const [flashOverlay, setFlashOverlay] = useState({ color: '#000', opacity: 0, visible: false });

  // ── Helper: show timed notification (clears previous timer cleanly) ────────
  const showNotification = useCallback((msg) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setSystemNotification(msg);
    notifTimerRef.current = setTimeout(() => setSystemNotification(null), 5500);
  }, []);

  // ── Fetch room state from backend (with 401/offline simulation fallback) ───
  const syncSimulationState = useCallback(() => {
    if (!simRef.current) simRef.current = createSimulationRoom5();
    isSimModeRef.current = true;
    setIsSimMode(true);
    const data = simRef.current.getState();
    setRoomData(data);
    roomDataRef.current = data;
    if (data.is_completed && engineRef.current) {
      engineRef.current.openDoor?.();
    }
    return data;
  }, []);

  const fetchRoomState = useCallback(async () => {
    if (isSimModeRef.current && simRef.current) {
      syncSimulationState();
      setLoading(false);
      return;
    }
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
      } else if (res.status === 401 || res.status === 403 || res.status >= 500) {
        syncSimulationState();
      }
    } catch (err) {
      console.warn('[ROOM5] Backend unavailable — activating local 3D simulation mode:', err);
      syncSimulationState();
    } finally {
      setLoading(false);
    }
  }, [syncSimulationState]);

  // ── Record every encountered world/case popup into Evidence Board ([B]) ───
  const recordWorldDoc = useCallback((doc) => {
    if (!doc) return;
    const docId = doc.id || `DOC-${String(doc.title || 'NOTE').replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`;
    const enriched = enrichRoom5EvidenceItem({
      ...doc,
      id: docId,
      clue_id: null,
      part: doc.part || 'Field Note',
      is_wrapped: false,
      kind: 'world_doc',
      display: {
        title: doc.title || docId,
        corner_mark: doc.corner_mark || docId,
        lines: Array.isArray(doc.lines) ? doc.lines : (doc.body ? [doc.body] : []),
      },
      secret: doc.highlight ? { note: doc.highlight } : doc.secret,
    });
    worldDocsMapRef.current.set(docId, enriched);
    if (simRef.current?.recordWorldDocument) {
      simRef.current.recordWorldDocument({ ...doc, id: docId });
    }
    setWorldDocsVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const onDownloaded = (e) => {
      if (e?.detail?.filename) {
        showNotification(`Downloaded "${e.detail.filename}" (${e.detail.bytes || 0} bytes) — ready for inspection or AI audit.`);
      }
    };
    window.addEventListener('ctc:file-downloaded', onDownloaded);
    return () => window.removeEventListener('ctc:file-downloaded', onDownloaded);
  }, [showNotification]);

  const recordCaseDossierDoc = useCallback(() => {
    recordWorldDoc({
      id: 'DOC-DOSSIER',
      title: 'CASE DOSSIER // SUBSTATION DELTA SECTOR 5 BRIEFING',
      corner_mark: 'DOSSIER // 5-OPS',
      classification: 'CASE FILES // R2-01 · R2-05 · R2-06',
      location: 'Control Room 5B / Wing 5C / Wing 5D',
      lines: [
        'Three encrypted terminals lock the Vault exit bulkhead across Sector 5.',
        'R2-01 (Personnel Index — 5B): Retro IBM terminal requiring the living post-curfew Research badge.',
        'R2-05 (Transmission Archive — 5C): Radio teletype bank requiring verified X-Auth Base64 channel.',
        'R2-06 (Spectrogram Analyser — 5D): Acoustic oscilloscope requiring 4-digit BCD-Morse harmonic key.',
      ],
      highlight: 'Collect all 8 core slips (EC01–EC08) to unlock terminal submission access; inspect [B] to copy/download everything.',
    });
  }, [recordWorldDoc]);

  const recordTerminalBrief = useCallback((clueId) => {
    const briefs = {
      'R2-01': {
        id: 'TERM-R201',
        title: 'PERSONNEL INDEX CONSOLE (R2-01) // TERMINAL BRIEF',
        corner_mark: 'IBM-5B // R2-01',
        classification: 'TERMINAL SNAPSHOT // R2-01',
        location: 'Room 5B · West Desk IBM Terminal',
        lines: [
          'Live access registry loaded across Admin, Research, Systems, Medical, Security, Archive, and Maintenance.',
          'Use "Copy Roster CSV" / "Download CSV" inside the Personnel Index modal to inspect all rows in external tools.',
        ],
        highlight: 'Isolate the active Research badge still logging in after the 1983-08-14 23:00 curfew.',
      },
      'R2-05': {
        id: 'TERM-R205',
        title: 'TRANSMISSION ARCHIVE CONSOLE (R2-05) // TERMINAL BRIEF',
        corner_mark: 'RADIO-5C // R2-05',
        classification: 'TERMINAL SNAPSHOT // R2-05',
        location: 'Room 5C · North Locker Annex Desk',
        lines: [
          'Six teletype intercepts (TX-1..TX-6) with embedded Base64 X-Auth credentials and voicemail channel directives.',
          'Use "Copy Log" / "Download Log" inside the Transmission Archive modal to verify X-Auth seals.',
        ],
        highlight: 'Compare every decoded X-Auth token against the verified active scholar credential from R2-01.',
      },
      'R2-06': {
        id: 'TERM-R206',
        title: 'SPECTROGRAM ANALYSER MK-II (R2-06) // TERMINAL BRIEF',
        corner_mark: 'OSC-5D // R2-06',
        classification: 'TERMINAL SNAPSHOT // R2-06',
        location: 'Room 5D · North Observation Console',
        lines: [
          'Dual-channel acoustic oscilloscope analyzing voicemail reels VM-A and VM-B across LOW, MID, and HIGH bands.',
          'Sweep to upper-band carrier peaks and use "Copy Telemetry" / "Download Pkt" to export 4-frame BCD-8421 & Morse bursts.',
        ],
        highlight: 'Verify the authentic channel from R2-05 before decoding the 4-frame high-band carrier quartet.',
      },
    };
    if (briefs[clueId]) recordWorldDoc(briefs[clueId]);
  }, [recordWorldDoc]);

  // ── Jumpscare Catch Handler: Respawn 5B + Drop 1 Evidence at Death Site ───
  const handlePlayerCaught = useCallback((pos) => {
    setIsJumpscaring(false);
    const deathX = pos?.x ?? 0;
    const deathZ = pos?.z ?? 6.5;

    // Close open overlays & unlock cursor momentarily
    setIsBasketOpen(false);
    setIsCaseDossierOpen(false);
    setIsCCTVOpen(false);
    setActiveClueModal(null);
    setInspectModalData(null);

    engineRef.current?.shake?.(1.6, 0.72);
    engineRef.current?.setView?.(SAFE_ROOM_RESPAWN[0], SAFE_ROOM_RESPAWN[2], 0, 0);

    let droppedRecord = null;
    if (isSimModeRef.current && simRef.current?.handlePlayerDeath) {
      const res = simRef.current.handlePlayerDeath(deathX, deathZ);
      droppedRecord = res.droppedItem;
      syncSimulationState();
      setDroppedItems(res.state?.dropped_items || []);
    } else {
      const cur = roomDataRef.current;
      const ecIds = (cur?.collected_fragment_ids || []).filter(
        (id) => String(id).startsWith('EC') && !liveDroppedMapRef.current.has(`dropped_${id}`)
      );
      const dropFragId = ecIds[ecIds.length - 1] || null;
      if (dropFragId) {
        const dropId = `dropped_${dropFragId}`;
        const evObj = (cur?.evidence || []).find((e) => e.id === dropFragId) || null;
        droppedRecord = { id: dropId, fragmentId: dropFragId, x: deathX, z: deathZ, evidence: evObj };
        liveDroppedMapRef.current.set(dropId, droppedRecord);
        setDroppedItems(Array.from(liveDroppedMapRef.current.values()));
      }
    }

    if (droppedRecord) {
      engineRef.current?.spawnDroppedEvidence?.(droppedRecord);
    }

    if (caughtTimerRef.current) clearTimeout(caughtTimerRef.current);
    setCaughtOverlay({
      droppedId: droppedRecord?.fragmentId || null,
      x: Number(deathX).toFixed(1),
      z: Number(deathZ).toFixed(1),
    });
    caughtTimerRef.current = setTimeout(() => {
      setCaughtOverlay(null);
      if (droppedRecord) {
        showNotification(
          `Respawned in Safe Room 5B — reclaim dropped Evidence ${droppedRecord.fragmentId} at the catch site.`
        );
      } else {
        showNotification('Respawned inside Safe Room 5B behind the steel bulkhead.');
      }
    }, 2200);
  }, [showNotification, syncSimulationState]);

  const handlePlayerCaughtRef = useRef(handlePlayerCaught);
  handlePlayerCaughtRef.current = handlePlayerCaught;

  useEffect(() => { fetchRoomState(); }, [fetchRoomState]);

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
          setTimeout(() => setFlashOverlay(prev => ({ ...prev, visible: false })), durationMs || 150);
        },

        onGlassCrack: null, // Room 5 has no glass-crack mechanic

        onScare: (_name, message) => {
          showNotification(message);
        },

        onTeamNameInjection: (name) => {
          showNotification(`⚠ GHOST TRACE — TERMINAL LOGGED: "${name || team?.name || 'SUBJECT'}"`);
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
          if (targetId.startsWith('dropped_')) {
            setActiveHoverPrompt(`Recover Dropped Evidence (${targetId.replace('dropped_', '')})`);
          } else if (targetId === 'room_door' || targetId === 'entry_door') {
            setActiveHoverPrompt('Sealed Entry Hatch — No Return');
          } else if (targetId === 'vault_door' || targetId === 'exit_door') {
            const rd = roomDataRef.current;
            if (rd?.is_completed) {
              setActiveHoverPrompt('Advance to The Anointing Vault (Room 6) ➔');
            } else {
              setActiveHoverPrompt('Sealed Vault Door — Solve all clue terminals to open');
            }
          } else if ((targetId === 'chamber3_door' || targetId === 'chamber3_north_door') && !hasContainmentKeyRef.current) {
            setActiveHoverPrompt('Chamber 3 Deadbolted — Needs Brass Key (Cryo Suite 5E)');
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

      // Only invoke directly when engine came from a test mock that did not already build the scene
      if (!engine._controlBuilt) {
        buildControlScene(engine);
        scaresRef.current = createControlScares(engine, {
          audio: audioRef.current,
          teamName: team?.name || '',
          onFlash: (color, opacity, durationMs) => {
            setFlashOverlay({ color, opacity, visible: true });
            setTimeout(() => setFlashOverlay(prev => ({ ...prev, visible: false })), durationMs || 150);
          },
          onScare: (_name, message) => showNotification(message),
          onTeamNameInjection: (name) => {
            showNotification(`⚠ GHOST TRACE — TERMINAL LOGGED: "${name || team?.name || 'SUBJECT'}"`);
          },
          onJumpscareStart: () => {
            setIsJumpscaring(true);
          },
          onPlayerCaught: (pos) => {
            handlePlayerCaughtRef.current?.(pos);
          },
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
      if (caughtTimerRef.current) clearTimeout(caughtTimerRef.current);
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

  // Lightweight telemetry poll for HUD Safe-Zone badge & live CCTV ghost radar
  useEffect(() => {
    if (!isStarted) return undefined;
    const iv = setInterval(() => {
      const pos = engineRef.current?.getPos?.();
      const inSafe = pos ? isInsideSafeRoom5B(pos.x, pos.z) : true;
      const gTel = scaresRef.current?.getGhostTelemetry?.() || null;
      setTelemetryState({ inSafeRoom: inSafe, ghostTelemetry: gTel });
    }, 350);
    return () => clearInterval(iv);
  }, [isStarted]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKey = (e) => {
      // Escape closes open modals cleanly (or frees cursor if none open) — works even inside inputs
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (isAnyModalOpenRef.current) {
          setIsBasketOpen(false);
          setIsCaseDossierOpen(false);
          setIsCCTVOpen(false);
          setActiveClueModal(null);
          setInspectModalData(null);
          engineRef.current?.setPaused?.(false);
          engineRef.current?.lock?.();
        } else {
          engineRef.current?.unlock?.();
        }
        return;
      }

      const tag = (e.target?.tagName || document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

      // Start game shortcut
      if (!isStartedRef.current && (e.key === 'Enter' || e.key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        handleStartGame();
        return;
      }

      // Block 3D world interactions & shortcuts while a modal overlay is open
      if (e.key === 'e' || e.key === 'E' || e.code === 'KeyE') {
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

      // F — toggle tactical GLB flashlight
      if (e.key === 'f' || e.key === 'F' || e.code === 'KeyF') {
        if (isAnyModalOpenRef.current) return;
        e.preventDefault();
        const next = !flashlightOnRef.current;
        flashlightOnRef.current = next;
        engineRef.current?.setFlashlight?.(next);
        audioRef.current?.click?.();
        return;
      }

      // B — evidence basket
      if (e.key === 'b' || e.key === 'B' || e.code === 'KeyB') {
        e.preventDefault();
        setIsBasketOpen(prev => {
          const next = !prev;
          if (next) engineRef.current?.unlock();
          return next;
        });
        return;
      }

      // C — case dossier
      if (e.key === 'c' || e.key === 'C' || e.code === 'KeyC') {
        e.preventDefault();
        setIsCaseDossierOpen(prev => {
          const next = !prev;
          if (next) {
            recordCaseDossierDoc();
            engineRef.current?.unlock();
          }
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
      // Synchronous call preserves browser user gesture so pointer lock engages immediately
      engineRef.current.lock?.();
    }
  };

  // ── Main interaction handler ────────────────────────────────────────────────
  const handleInteract = useCallback(async (objectId) => {
    audioRef.current?.ensureActive?.();
    const currentData = roomDataRef.current;

    // ── Dropped Evidence Satchel Recovery (from earlier ghost catch) ──
    if (String(objectId).startsWith('dropped_')) {
      let recoveredId = objectId.replace('dropped_', '');
      let recoveredEv = null;
      if (isSimModeRef.current && simRef.current?.recoverDroppedItem) {
        const rec = simRef.current.recoverDroppedItem(objectId);
        recoveredId = rec.fragmentId || recoveredId;
        recoveredEv = rec.evidence || null;
        const st = syncSimulationState();
        setDroppedItems(st?.dropped_items || []);
      } else {
        const entry = liveDroppedMapRef.current.get(objectId);
        liveDroppedMapRef.current.delete(objectId);
        recoveredId = entry?.fragmentId || recoveredId;
        recoveredEv = entry?.evidence || null;
        setDroppedItems(Array.from(liveDroppedMapRef.current.values()));
      }
      engineRef.current?.clearDroppedEvidence?.(objectId);
      audioRef.current?.good?.();
      showNotification(`Recovered dropped Evidence ${recoveredId}!`);
      if (recoveredEv) {
        setInspectModalData({
          type: 'evidence',
          evidence: recoveredEv,
          collectedCount: (roomDataRef.current?.collected_fragment_ids || []).filter((id) => id.startsWith('EC') && !liveDroppedMapRef.current.has(`dropped_${id}`)).length,
          remainingHere: 0,
        });
        engineRef.current?.unlock?.();
      }
      return;
    }

    // ── Entry door / no return ──
    if (objectId === 'room_door' || objectId === 'entry_door') {
      engineRef.current?.rattleDoor?.('entry_door');
      audioRef.current?.bad?.();
      scaresRef.current?.triggerBreachHunt?.(0.35);
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
        engineRef.current?.rattleDoor?.('vault_door');
        audioRef.current?.bad?.();
        scaresRef.current?.triggerBreachHunt?.(0.35);
        showNotification('The vault door is electromagnetically sealed. Solve all three clue terminals to release the lock.');
      }
      return;
    }

    // ── Monitor bank: CCTV horror + interactive security camera switcher ──
    if (objectId === 'monitor_bank') {
      scaresRef.current?.triggerCCTVHorror?.();
      recordWorldDoc({
        id: 'CCTV-BANK',
        title: 'SURVEILLANCE MONITOR BANK // CAM-01 TO CAM-06 DIGEST',
        corner_mark: 'VHS-IR // CTRL-5B',
        classification: 'SURVEILLANCE LOG // LIVE RADAR',
        location: 'Room 5B · Security Console Desk',
        lines: [
          'CAM-01 (5A Airlock): Bulkhead steel absorbs knocks at Z = 2.15m; Control 5B remains isolated.',
          'CAM-02 (5B Control): Safe Zone live. Curfew began 1983-08-14 23:00 — filter Personnel CSV after 23:00.',
          'CAM-03 (5C Annex): Authenticate teletype directives via decoded Base64 X-Auth headers.',
          'CAM-04 (5D Observation): Both voicemail reels emit 4-frame BCD-Morse packets under HIGH band.',
          'CAM-05 (5E Cryo): Sweep HIGH band past two-thirds displacement to capture true BCD quartet.',
          'CAM-06 (5F / Chamber 3): Entity patrol origin — sprint back behind 5B bulkhead to force retreat.',
        ],
        reportLines: [
          'Open the Monitor Bank in Control 5B anytime to view real-time entity wing telemetry and export full individual camera logs.',
        ],
        highlight: 'Cross-reference CAM-02 curfew timestamp, CAM-03 Base64 X-Auth headers, and CAM-05 high-band threshold.',
      });
      showNotification('Static bursts across the monitors — CCTV feeds unlocked & archived to Evidence Board [B].');
      setIsCCTVOpen(true);
      engineRef.current?.unlock?.();
      return;
    }

    // ── Inner bulkhead / Multi-room wing doors ──
    if (objectId === 'control_door') {
      const opened = engineRef.current?.toggleControlDoor?.();
      audioRef.current?.relayClick?.();
      if (opened) scaresRef.current?.triggerDoorSighting?.('control_door', { respectGrace: true });
      showNotification(
        opened
          ? 'Control Room bulkhead unlatched — outer corridor accessible.'
          : 'Control Room bulkhead latched shut.'
      );
      return;
    }

    if (
      objectId === 'annex_door' ||
      objectId === 'south_wing_door' ||
      objectId === 'observation_door' ||
      objectId === 'chamber3_door' ||
      objectId === 'chamber3_north_door' ||
      objectId === 'cryo_door' ||
      objectId === 'generator_door' ||
      objectId === 'morgue_vault_door'
    ) {
      if ((objectId === 'chamber3_door' || objectId === 'chamber3_north_door') && !hasContainmentKeyRef.current) {
        engineRef.current?.rattleDoor?.(objectId);
        audioRef.current?.bad?.();
        scaresRef.current?.triggerBreachHunt?.(0.35, { respectGrace: true });
        showNotification('Chamber 3 is deadbolted — search the Cryo Autopsy Suite (North of Wing 5C) for the Containment Brass Key.');
        return;
      }
      const opened = engineRef.current?.toggleWingDoor?.(objectId);
      audioRef.current?.relayClick?.();
      if (opened) scaresRef.current?.triggerDoorSighting?.(objectId, { respectGrace: true });
      const openMsgs = {
        annex_door: opened ? 'Locker & Radio Wing (5C) unlatched.' : 'Locker Wing (5C) door shut.',
        south_wing_door: opened ? 'West Hallway ↔ Wing 5C loop door opened.' : 'West Hallway connecting door shut.',
        observation_door: opened ? 'Observation & Acoustic Wing (5D) unsealed.' : 'Observation Wing (5D) door shut.',
        chamber3_door: opened ? 'Brass key turns — Chamber 3 Containment door swings open!' : 'Chamber 3 Containment door shut.',
        chamber3_north_door: opened ? 'Brass key turns — Chamber 3 North passage into Vault 5F opened!' : 'Chamber 3 North passage shut.',
        cryo_door: opened ? 'Cryo Autopsy Suite (5E) unsealed — cold vapor spills out.' : 'Cryo Suite (5E) door shut.',
        generator_door: opened ? 'Generator & Relay Vault (5F) bulkhead opened.' : 'Generator Vault (5F) door shut.',
        morgue_vault_door: opened ? 'Cryo Morgue (5E) ↔ Generator Vault (5F) loop passage opened.' : 'Morgue–Generator passage shut.',
      };
      showNotification(openMsgs[objectId]);
      return;
    }

    // ── Physical Brass Containment Key in Room 5E ──
    if (objectId === 'containment_key') {
      if (!hasContainmentKeyRef.current) {
        hasContainmentKeyRef.current = true;
        setHasContainmentKey(true);
        engineRef.current?.pickupContainmentKey?.();
        audioRef.current?.unlockBolt?.();
        scaresRef.current?.triggerBreachHunt?.(0.95, { respectGrace: true });
        recordWorldDoc(ROOM5_WORLD_DOCUMENTS.containment_key);
        setInspectModalData({ type: 'inspect', ...ROOM5_WORLD_DOCUMENTS.containment_key });
        engineRef.current?.unlock?.();
      } else {
        showNotification('You already carry the Brass Containment Key — unlock Chamber 3 in Wing 5D.');
      }
      return;
    }

    // ── Horror Trap & Interactive World Props across Rooms ──
    if (objectId === 'ringing_phone') {
      scaresRef.current?.markPhoneAnswered?.();
      audioRef.current?.intercomCrackle?.();
      recordWorldDoc(ROOM5_WORLD_DOCUMENTS.ringing_phone);
      setInspectModalData({ type: 'inspect', ...ROOM5_WORLD_DOCUMENTS.ringing_phone });
      engineRef.current?.unlock?.();
      return;
    }
    if (objectId === 'annex_locker') {
      audioRef.current?.drawerSlam?.();
      scaresRef.current?.maybeFragmentScare?.();
      recordWorldDoc(ROOM5_ENV_DOCUMENTS.annex_locker);
      setInspectModalData({ type: 'inspect', ...ROOM5_ENV_DOCUMENTS.annex_locker });
      engineRef.current?.unlock?.();
      return;
    }
    if (objectId === 'autopsy_gurney') {
      audioRef.current?.click?.();
      scaresRef.current?.triggerBreachHunt?.(0.95, { respectGrace: true });
      recordWorldDoc(ROOM5_WORLD_DOCUMENTS.autopsy_gurney);
      setInspectModalData({ type: 'inspect', ...ROOM5_WORLD_DOCUMENTS.autopsy_gurney });
      engineRef.current?.unlock?.();
      return;
    }
    if (objectId === 'scalpel_prop') {
      audioRef.current?.click?.();
      scaresRef.current?.triggerBreachHunt?.(1.0, { respectGrace: true });
      recordWorldDoc(ROOM5_WORLD_DOCUMENTS.scalpel_prop);
      setInspectModalData({ type: 'inspect', ...ROOM5_WORLD_DOCUMENTS.scalpel_prop });
      engineRef.current?.unlock?.();
      return;
    }
    if (objectId === 'aux_generator') {
      audioRef.current?.relayClick?.();
      audioRef.current?.good?.();
      recordWorldDoc(ROOM5_WORLD_DOCUMENTS.aux_generator);
      setInspectModalData({ type: 'inspect', ...ROOM5_WORLD_DOCUMENTS.aux_generator });
      engineRef.current?.unlock?.();
      return;
    }

    // ── Interactive physical case dossiers placed around Rooms 5C, 5D & Chamber 3 ──
    if (ROOM5_WORLD_DOCUMENTS[objectId]) {
      audioRef.current?.click?.();
      scaresRef.current?.maybeFragmentScare?.();
      recordWorldDoc(ROOM5_WORLD_DOCUMENTS[objectId]);
      setInspectModalData({ type: 'inspect', ...ROOM5_WORLD_DOCUMENTS[objectId] });
      engineRef.current?.unlock?.();
      return;
    }

    // ── Dead wall intercom ──
    if (objectId === 'dead_intercom') {
      audioRef.current?.intercomCrackle?.();
      recordWorldDoc(ROOM5_ENV_DOCUMENTS.dead_intercom);
      showNotification('A burst of static hisses from the intercom speaker — line plate trace logged in [B].');
      return;
    }

    // ── Environmental interactive props & breaker switch ──
    if (objectId === 'wall_breaker') {
      const on = engineRef.current?.toggleBreakerLight?.();
      audioRef.current?.relayClick?.();
      recordWorldDoc(ROOM5_ENV_DOCUMENTS.wall_breaker);
      showNotification(on ? 'Overhead emergency fluorescent circuit restored (wiring note logged in [B]).' : 'Overhead lights killed — operating on torchlight only (wiring note logged in [B]).');
      return;
    }

    if (ROOM5_ENV_DOCUMENTS[objectId]) {
      audioRef.current?.click?.();
      recordWorldDoc(ROOM5_ENV_DOCUMENTS[objectId]);
      setInspectModalData({ type: 'inspect', ...ROOM5_ENV_DOCUMENTS[objectId] });
      engineRef.current?.unlock?.();
      return;
    }

    // ── Clue Terminals (R2-01, R2-05, R2-06) ──
    const lockedCount = (currentData?.collected_fragment_ids || []).filter(
      (id) => id.startsWith('EC') && !liveDroppedMapRef.current.has(`dropped_${id}`)
    ).length;
    const isEffectivelyUnlocked = Boolean(currentData?.basket_unlocked) && liveDroppedMapRef.current.size === 0;
    if (objectId === 'staff_terminal') {
      if (!isEffectivelyUnlocked) {
        audioRef.current?.bad?.();
        showNotification('This terminal is locked. Collect all evidence fragments first.');
        setInspectModalData({ type: 'locked_terminal', terminalName: 'Staff Terminal (R2-01)', collectedCount: lockedCount });
        engineRef.current?.unlock?.();
        return;
      }
      scaresRef.current?.triggerTeamNameInjection?.();
      recordTerminalBrief('R2-01');
      setActiveClueModal('R2-01');
      engineRef.current?.unlock();
      return;
    }

    if (objectId === 'radio_console') {
      if (!isEffectivelyUnlocked) {
        audioRef.current?.bad?.();
        showNotification('This terminal is locked. Collect all evidence fragments first.');
        setInspectModalData({ type: 'locked_terminal', terminalName: 'Radio Console (R2-05)', collectedCount: lockedCount });
        engineRef.current?.unlock?.();
        return;
      }
      recordTerminalBrief('R2-05');
      setActiveClueModal('R2-05');
      engineRef.current?.unlock();
      return;
    }

    if (objectId === 'sound_console') {
      if (!isEffectivelyUnlocked) {
        audioRef.current?.bad?.();
        showNotification('This terminal is locked. Collect all evidence fragments first.');
        setInspectModalData({ type: 'locked_terminal', terminalName: 'Sound Console (R2-06)', collectedCount: lockedCount });
        engineRef.current?.unlock?.();
        return;
      }
      recordTerminalBrief('R2-06');
      setActiveClueModal('R2-06');
      engineRef.current?.unlock();
      return;
    }

    // ── Simulation mode fragment search ──
    if (isSimModeRef.current && simRef.current) {
      const result = simRef.current.searchProp(objectId);
      const updated = syncSimulationState();
      const nonDecoyCount = (updated.collected_fragment_ids || []).filter(id => id.startsWith('EC')).length;
      if (result.remaining_here === 0) {
        engineRef.current?.setFragmentCleared?.(objectId);
      }
      if (result.found) {
        audioRef.current?.good?.();
        scaresRef.current?.maybeFragmentScare?.();
        setInspectModalData({
          type: 'evidence',
          evidence: result.evidence,
          collectedCount: nonDecoyCount,
          remainingHere: result.remaining_here,
        });
        engineRef.current?.unlock?.();
      } else {
        audioRef.current?.step?.(0.5);
        showNotification(result.message);
      }
      return;
    }

    // ── Backend fragment search ──
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
        engineRef.current?.setFragmentCleared?.(objectId);
        if (result.found) {
          audioRef.current?.good?.();
          scaresRef.current?.maybeFragmentScare?.();
          await fetchRoomState();
          const refreshed = roomDataRef.current;
          const rawEvObj = (refreshed?.evidence || []).find(e => e.id === result.fragment_id) || {
            id: result.fragment_id,
            display: { title: `Evidence ${result.fragment_id}`, lines: [result.message || 'Fragment recovered.'] },
          };
          const evObj = enrichRoom5EvidenceItem(rawEvObj);
          const count = (refreshed?.collected_fragment_ids || []).filter(id => id.startsWith('EC')).length;
          setInspectModalData({
            type: 'evidence',
            evidence: evObj,
            collectedCount: count,
            remainingHere: 0,
          });
          engineRef.current?.unlock?.();
        } else {
          audioRef.current?.step?.(0.5);
        }
      } else if (res.status === 401 || res.status === 403 || res.status === 404) {
        // Activate simulation fallback seamlessly if unauthenticated or standalone preview prop
        const simData = syncSimulationState();
        const result = simRef.current.searchProp(objectId);
        const updated = syncSimulationState();
        const count = (updated.collected_fragment_ids || []).filter(id => id.startsWith('EC')).length;
        if (result.remaining_here === 0) {
          engineRef.current?.setFragmentCleared?.(objectId);
        }
        if (result.found) {
          audioRef.current?.good?.();
          setInspectModalData({ type: 'evidence', evidence: result.evidence, collectedCount: count, remainingHere: result.remaining_here });
          engineRef.current?.unlock?.();
        } else if (simData) {
          showNotification(result.message);
        }
      } else {
        showNotification('Unable to search this object right now.');
      }
    } catch (err) {
      console.error('[ROOM5] Fragment search failed:', err);
      showNotification('Connection interrupted while searching prop.');
    }
  }, [fetchRoomState, showNotification, syncSimulationState, recordWorldDoc]);

  // Keep the ref in sync with the closure
  handleInteractRef.current = handleInteract;

  // ── Submit clue answer ──────────────────────────────────────────────────────
  const handleClueSubmit = useCallback(async (clueId, answer) => {
    if (isSimModeRef.current && simRef.current) {
      const data = simRef.current.submitClue(clueId, answer);
      syncSimulationState();
      if (data.correct) {
        audioRef.current?.good?.();
        if (data.room_completed) {
          engineRef.current?.openDoor?.();
          setActiveClueModal(null);
          setIsRoomCompleteModalOpen(true);
        }
      } else {
        audioRef.current?.bad?.();
        engineRef.current?.shake?.(0.7, 0.35);
        scaresRef.current?.triggerBreachHunt?.(data.exhausted ? 1.1 : 0.6, { respectGrace: true });
      }
      return data;
    }

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
          scaresRef.current?.triggerBreachHunt?.(data.exhausted ? 1.1 : 0.6, { respectGrace: true });
        }
        return data;
      } else if (res.status === 401 || res.status === 403 || res.status === 404) {
        syncSimulationState();
        const data = simRef.current.submitClue(clueId, answer);
        syncSimulationState();
        if (data.correct) {
          audioRef.current?.good?.();
          if (data.room_completed) {
            engineRef.current?.openDoor?.();
            setActiveClueModal(null);
            setIsRoomCompleteModalOpen(true);
          }
        } else {
          audioRef.current?.bad?.();
          engineRef.current?.shake?.(0.7, 0.35);
          scaresRef.current?.triggerBreachHunt?.(data.exhausted ? 1.1 : 0.6, { respectGrace: true });
        }
        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        audioRef.current?.bad?.();
        engineRef.current?.shake?.(0.7, 0.35);
        scaresRef.current?.triggerBreachHunt?.(0.75, { respectGrace: true });
        return { correct: false, message: errData.detail || 'Authentication rejected' };
      }
    } catch (err) {
      console.error('[ROOM5] Clue submission failed:', err);
      return { correct: false, message: 'Server communication error' };
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchRoomState, syncSimulationState]);

  const handleResetClue = useCallback((clueId) => {
    if (!simRef.current) return;
    const cur = roomDataRef.current;
    const solvedIds = (cur?.clues || []).filter(c => c.solved).map(c => c.id);
    const collectedIds = cur?.collected_fragment_ids || [];
    if (!isSimModeRef.current) {
      isSimModeRef.current = true;
    }
    simRef.current.resetClue(clueId, solvedIds, collectedIds, Boolean(cur?.basket_unlocked));
    syncSimulationState();
    audioRef.current?.good?.();
    showNotification(`Terminal ${clueId} rebooted — security lockout cleared (3 attempts restored).`);
  }, [syncSimulationState, showNotification]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const cluesList = roomData?.clues || [];
  const roomClues = cluesList.filter(c => c.id && c.id.startsWith('R2-'));
  const cluesSolvedCount = roomClues.filter(c => c.solved).length;
  const hasExhaustedClue = roomClues.some(c => c.exhausted && !c.solved);
  const totalCluesCount = roomClues.length || 3;

  const getClueState = (id) => roomClues.find(c => c.id === id) || { id, attempts_remaining: 3 };

  const isAnyModalOpen =
    isBasketOpen ||
    isCaseDossierOpen ||
    isRoomCompleteModalOpen ||
    isCCTVOpen ||
    Boolean(inspectModalData) ||
    Boolean(activeClueModal);

  isStartedRef.current = isStarted;
  isAnyModalOpenRef.current = isAnyModalOpen;

  // Pause 3D movement & world input cleanly whenever any overlay/modal is active
  useEffect(() => {
    engineRef.current?.setPaused?.(!isStarted || isAnyModalOpen);
  }, [isStarted, isAnyModalOpen]);

  const handleOpenBasket = useCallback(() => {
    setIsBasketOpen(true);
    engineRef.current?.unlock?.();
  }, []);
  const handleOpenCaseFiles = useCallback(() => {
    recordCaseDossierDoc();
    setIsCaseDossierOpen(true);
    engineRef.current?.unlock?.();
  }, [recordCaseDossierDoc]);
  const handleToggleAudio = useCallback(() => {
    setAudioMuted(prev => {
      const next = !prev;
      audioRef.current?.setMuted?.(next);
      return next;
    });
  }, []);
  const handleToggleQuality = useCallback(() => {
    setQualityMode(prev => {
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
    setMouseSens(prev => {
      const next = steps[(steps.indexOf(prev) + 1) % steps.length] ?? 1.0;
      engineRef.current?.setSensitivity?.(next);
      return next;
    });
  }, []);
  const resumeGameplayLock = useCallback(() => {
    engineRef.current?.setPaused?.(false);
    engineRef.current?.lock?.();
  }, []);
  const handleRequestLock = resumeGameplayLock;
  const handleCloseBasket = useCallback(() => {
    setIsBasketOpen(false);
    resumeGameplayLock();
  }, [resumeGameplayLock]);
  const handleCloseDossier = useCallback(() => {
    setIsCaseDossierOpen(false);
    resumeGameplayLock();
  }, [resumeGameplayLock]);
  const handleCloseClue = useCallback(() => {
    setActiveClueModal(null);
    resumeGameplayLock();
  }, [resumeGameplayLock]);
  const handleCloseCCTV = useCallback(() => {
    setIsCCTVOpen(false);
    resumeGameplayLock();
  }, [resumeGameplayLock]);
  const handleCloseInspect = useCallback(() => {
    setInspectModalData(null);
    resumeGameplayLock();
  }, [resumeGameplayLock]);
  const handleCloseComplete = useCallback(() => {
    setIsRoomCompleteModalOpen(false);
    resumeGameplayLock();
  }, [resumeGameplayLock]);

  // ── Real fragment count (non-decoy, excluding dropped pieces awaiting recovery) ──
  const liveDroppedIds = new Set(Array.from(liveDroppedMapRef.current.values()).map(d => d.fragmentId));
  const collectedNonDecoyCount = (roomData?.collected_fragment_ids || []).filter(id =>
    id.startsWith('EC') && !liveDroppedIds.has(id)
  ).length;
  const effectiveBasketUnlocked = Boolean(roomData?.basket_unlocked) && liveDroppedIds.size === 0;

  // Combined Evidence Board entries: enriched server/sim fragments (minus dropped) + every opened field/world popup
  const worldDocsArray = Array.from(worldDocsMapRef.current.values());
  const baseEvidenceList = (roomData?.evidence || [])
    .filter(ev => !liveDroppedIds.has(ev?.id))
    .map(ev => enrichRoom5EvidenceItem(ev));
  const existingEvIds = new Set(baseEvidenceList.map(e => e?.id));
  const mergedBasketEvidence = [
    ...baseEvidenceList,
    ...worldDocsArray.filter(doc => doc?.id && !existingEvIds.has(doc.id)),
  ];
  const mergedCollectedIds = Array.from(new Set([
    ...((roomData?.collected_fragment_ids || []).filter(id => !liveDroppedIds.has(id))),
    ...worldDocsArray.map(d => d.id),
  ]));
  void worldDocsVersion;

  // Riddlesome subtle top-left clue hint (never spoils answers or direct room keys)
  const clueHint = roomData?.is_completed
    ? 'Vault seal broken — proceed to the heavy bulkhead exit'
    : droppedItems.length > 0
      ? `Evidence lost during ambush (${droppedItems.map(d => d.fragmentId).join(', ')}) — reclaim your satchel where you fell`
      : hasExhaustedClue
        ? 'Terminal lockout triggered — reopen locked console to reboot & resume'
        : effectiveBasketUnlocked
          ? cluesSolvedCount < 3
            ? 'Seek the Raven beyond curfew (5B), decode sealed Base64 headers (5C), & ride the upper crest past 2/3 spool (5D)'
            : 'All systems authenticated — approach the Vault Door'
          : !hasContainmentKey && collectedNonDecoyCount < 8
            ? `Eight fractures sleep across darkened wings & locked steel (${8 - collectedNonDecoyCount} left) — only Control 5B keeps it out`
            : `${8 - collectedNonDecoyCount} fractures remain — inspect floor conduits & relay vaults before dawn`;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none font-mono"
      style={{ background: '#050404' }}
    >
      {/* 3D Canvas mount: hide cursor only under pointer lock; show hand when hovering clickable object */}
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

      {/* Static lightweight subtle edge vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(circle at center, transparent 64%, rgba(0,0,0,0.36) 100%)' }}
      />

      {/* Horror flash overlay */}
      {flashOverlay.visible && (
        <div
          className="horror-flash pointer-events-none"
          style={{ backgroundColor: flashOverlay.color, opacity: flashOverlay.opacity }}
        />
      )}

      {/* ── Asymmetric Forensic Corkboard Title Overlay (Resident Evil: Requiem Inspo) ── */}
      {!isStarted && (
        <EntrySplash onStart={handleStartGame} assetProgress={assetProgress} />
      )}

      {/* ── Active 3D Jumpscare Crimson Edge Vignette (pure CSS, leaves 3D center crisp) ── */}
      {isJumpscaring && !caughtOverlay && (
        <div
          aria-hidden="true"
          data-testid="jumpscare-vignette"
          className="fixed inset-0 z-[68] pointer-events-none animate-pulse"
          style={{
            background: 'radial-gradient(circle at center, transparent 28%, rgba(128, 10, 10, 0.56) 72%, rgba(28, 2, 2, 0.92) 100%)',
          }}
        />
      )}

      {/* ── Cinematic Survival-Horror YOU DIED & 5B Recovery Overlay ── */}
      {caughtOverlay && (
        <div
          data-testid="death-respawn-overlay"
          className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center p-6 overflow-hidden"
          style={{
            background:
              'radial-gradient(circle at center, rgba(46, 5, 5, 0.86) 0%, rgba(12, 3, 3, 0.96) 56%, rgba(3, 1, 1, 0.99) 100%)',
          }}
        >
          {/* Subtle CRT scanline & blood-smoke horizontal frame */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.65) 3px, rgba(0,0,0,0.65) 4px)',
            }}
          />

          <div
            className="relative w-full max-w-xl px-8 py-8 text-center"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(22, 6, 6, 0.88) 25%, rgba(22, 6, 6, 0.88) 75%, transparent 100%)',
            }}
          >
            <div className="mx-auto w-56 h-[1px] mb-5 bg-gradient-to-r from-transparent via-[#9a2a2a] to-transparent" />

            <div className="font-mono text-[10px] tracking-[0.42em] uppercase text-[#c4a265]/80 mb-2">
              SPECIMEN S-011 CAUGHT YOU · INCIDENT LOGGED
            </div>

            <h2
              className="font-re-display text-4xl sm:text-6xl font-bold tracking-[0.34em] uppercase text-[#e6c9c9]"
              style={{ textShadow: '0 0 28px rgba(185, 28, 28, 0.85), 0 4px 12px rgba(0, 0, 0, 0.95)' }}
            >
              YOU DIED
            </h2>

            <div className="mx-auto w-72 h-[1px] my-5 bg-gradient-to-r from-transparent via-[#c4a265]/55 to-transparent" />

            <div className="flex flex-col items-center gap-2.5">
              {caughtOverlay.droppedId ? (
                <span
                  className="inline-flex items-center gap-2 px-4 py-1 rounded-full font-mono text-[11px] tracking-[0.18em] uppercase border"
                  style={{
                    background: 'rgba(138, 28, 28, 0.25)',
                    borderColor: 'rgba(220, 68, 68, 0.45)',
                    color: '#fca5a5',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                  DROPPED {caughtOverlay.droppedId} AT ({caughtOverlay.x}, {caughtOverlay.z})
                </span>
              ) : (
                <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-[#d4c8ae]/85">
                  ALL HELD FRAGMENTS RETAINED
                </span>
              )}

              <div className="font-re-typewriter text-xs tracking-[0.25em] uppercase text-[#c4a265]/90 mt-1">
                RESPAWNING INSIDE SAFE ROOM 5B...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── System notification toast (centered bottom-above-dock so zero overlap with top-left objective) ── */}
      {systemNotification && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-lg rounded-full px-5 py-2.5 backdrop-blur-md text-xs font-sans shadow-2xl flex items-center gap-2.5 animate-fade-in-fast"
          style={{
            background: 'linear-gradient(90deg, rgba(20, 14, 14, 0.94) 0%, rgba(16, 13, 12, 0.85) 82%, rgba(16, 13, 12, 0.3) 100%)',
            borderLeft: '2px solid rgba(184, 58, 58, 0.78)',
            border: '1px solid rgba(196, 162, 101, 0.22)',
            color: '#f2eadc',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#c94a4a] shrink-0" />
          <span>{systemNotification}</span>
        </div>
      )}

      {/* ── HUD ── */}
      {isStarted && (
        <HUDControl
          roomTitle={roomData?.title || 'The Surveillance Morgue'}
          totalFragments={8}
          collectedCount={collectedNonDecoyCount}
          basketUnlocked={effectiveBasketUnlocked}
          isRoomCompleted={Boolean(roomData?.is_completed)}
          cluesSolved={cluesSolvedCount}
          totalClues={totalCluesCount}
          clueHint={clueHint}
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
          onRequestLock={handleRequestLock}
        />
      )}

      {/* ── Evidence Basket Modal (conditionally mounted to avoid per-hover re-renders) ── */}
      {isBasketOpen && (
        <BasketModal
          isOpen={true}
          onClose={handleCloseBasket}
          evidence={mergedBasketEvidence}
          collectedIds={mergedCollectedIds}
          basketUnlocked={effectiveBasketUnlocked}
          totalInRoom={8}
          roomTitle={roomData?.title || 'The Surveillance Morgue'}
        />
      )}

      {/* ── Case Dossier Modal ── */}
      {isCaseDossierOpen && (
        <CaseDossierModal
          isOpen={true}
          onClose={handleCloseDossier}
          clues={roomClues}
          basketUnlocked={effectiveBasketUnlocked}
          totalFragments={8}
          collectedCount={collectedNonDecoyCount}
          onOpenClue={(clue) => {
            setIsCaseDossierOpen(false);
            if (!effectiveBasketUnlocked) {
              showNotification('Terminal locked: Collect all 8 evidence fragments first to unlock clue access.');
              return;
            }
            recordTerminalBrief(clue.id);
            setActiveClueModal(clue.id);
            engineRef.current?.unlock();
          }}
        />
      )}

      {/* ── Clue R2-01: Personnel Index Terminal ── */}
      {activeClueModal === 'R2-01' && (
        <PersonnelIndexModal
          isOpen={true}
          onClose={handleCloseClue}
          onSubmit={(answer) => handleClueSubmit('R2-01', answer)}
          onResetLockout={() => handleResetClue('R2-01')}
          clueState={getClueState('R2-01')}
          teamName={team?.name || ''}
        />
      )}

      {/* ── Clue R2-05: Transmission Archive (Radio Console) ── */}
      {activeClueModal === 'R2-05' && (
        <TransmissionArchiveModal
          isOpen={true}
          onClose={handleCloseClue}
          onSubmit={(answer) => handleClueSubmit('R2-05', answer)}
          onResetLockout={() => handleResetClue('R2-05')}
          clueState={getClueState('R2-05')}
        />
      )}

      {/* ── Clue R2-06: Spectrogram Analyser (Sound Console) ── */}
      {activeClueModal === 'R2-06' && (
        <SpectrogramModal
          isOpen={true}
          onClose={handleCloseClue}
          onSubmit={(answer) => handleClueSubmit('R2-06', answer)}
          onResetLockout={() => handleResetClue('R2-06')}
          clueState={getClueState('R2-06')}
        />
      )}

      {/* ── Surveillance Monitor Bank CCTV Modal ── */}
      {isCCTVOpen && (
        <CCTVMonitorModal
          isOpen={true}
          onClose={handleCloseCCTV}
          ghostTelemetry={telemetryState.ghostTelemetry}
          droppedItems={droppedItems}
          collectedIds={mergedCollectedIds}
        />
      )}

      {/* ── Evidence Pickup & Environmental Inspection Modal ── */}
      {inspectModalData && (
        <EvidencePickupModal
          modalData={inspectModalData}
          onClose={handleCloseInspect}
          onUnlockPreview={
            (isSimMode || isDevMode) && simRef.current
              ? () => {
                  simRef.current.unlockConsolesPreview();
                  syncSimulationState();
                  setInspectModalData(null);
                  engineRef.current?.lock?.();
                  showNotification('All 3 verification consoles are now accessible.');
                }
              : null
          }
        />
      )}

      {/* ── Room Complete / Transition Modal ── */}
      {isRoomCompleteModalOpen && (
        <RoomCompleteModal
          isOpen={true}
          variant="control"
          onClose={handleCloseComplete}
          onNavigateRoom={(roomKey) => {
            window.dispatchEvent(new CustomEvent('ctc:navigate-room', { detail: roomKey }));
          }}
          roomBadge="ROOM 5 CLEARED"
          title="The Surveillance Morgue Completed!"
          description="All 3 control room verification consoles have been decoded. The electromagnetic seal on the outer Vault Door has disengaged."
          recapLines={[
            '✓ 3 / 3 Verification Consoles Solved (R2-01, R2-05, R2-06)',
            '✓ Bunker Case Files & Chamber 3 Records Reviewed',
            '✓ Outer Corridor Vault Door Unlocked',
          ]}
          buttonText="Proceed to Corridor Vault Door"
          onProceedToDoor={() => {
            setIsRoomCompleteModalOpen(false);
            engineRef.current?.lock?.();
            showNotification('The vault door disengages with a heavy magnetic thud. Advance into Room 6: The Anointing Vault.');
          }}
        />
      )}
      {/* ── Dev Position Calibrator (?dev=1) ── */}
      {isStarted && isDevMode && <DevCalibratorOverlay engineRef={engineRef} />}
    </div>
  );
}


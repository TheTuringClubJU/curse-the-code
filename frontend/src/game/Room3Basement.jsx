import React, { useEffect, useRef, useState } from 'react';
import { createEngine } from './engine/engine.js';
import basementConfig from './rooms/basement.js';
import { GameAudioRecords as GameAudioBasement } from './engine/audioRecords.js';
import HUDBasement from './components/basement/HUDBasement.jsx';
import BasketModal from './components/BasketModal.jsx';
import CaseFilesModal from './components/CaseFilesModal.jsx';
import PhotoPuzzleModal from './components/PhotoPuzzleModal.jsx';
import IntercomQrModal from './components/IntercomQrModal.jsx';
import ServerRackNoteModal from './components/ServerRackNoteModal.jsx';
import Round1VictoryModal from './components/Round1VictoryModal.jsx';
import FinalContainmentTerminalModal from './components/FinalContainmentTerminalModal.jsx';
import Round1DossierModal from './components/Round1DossierModal.jsx';
import HintModal from './components/HintModal.jsx';
import './game.css';
import './basement.css';

const jumpscareVisual = '/assets/jumpscare_entity.jpg';

const BASEMENT_EVIDENCE_IMAGES = {
  EK04: '/evidence/basement/EK04.png',
  EK05: '/evidence/basement/EK05.png',
  EK06: '/evidence/basement/EK06.png',
  XK01: '/evidence/basement/XK01.png',
  XK02: '/evidence/basement/XK02.png',
};

const FLAVOR_MESSAGES = {
  flavor_valve: 'Scalding steam hisses from the rusted pipe as the pressure wheel turns...',
  flavor_breaker: 'An arc crackles across the damp switchboard and the cellar lights stutter.',
  flavor_grate: 'Something heavy lunges against the iron bars underneath the floor grate!'
};

function mapBasementEvidence(evidenceList) {
  if (!Array.isArray(evidenceList)) return [];
  return evidenceList.map((ev) => ({
    ...ev,
    image_file: ev.image_file || BASEMENT_EVIDENCE_IMAGES[ev.id] || '',
  }));
}

function isClueResolved(clueList, clueId) {
  const c = clueList?.find((item) => item.id === clueId);
  return Boolean(c && (c.solved || (c.attempts || 0) >= (c.attempts_max || 3)));
}

function getSessionToken() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('ctc_token') || '' : '';
  } catch {
    return '';
  }
}

export default function Room3Basement({
  team,
  onLogout,
  onProceedToLobby,
  onProceedToStudy,
  previewMode = false,
}) {
  const mountRef = useRef(null),
    engineRef = useRef(null),
    audioRef = useRef(null);
  const roomDataRef = useRef(null),
    activeTargetRef = useRef(null),
    handleInteractRef = useRef(null);
  const submittingRef = useRef(false),
    notificationTimerRef = useRef(null);
  const screamAudioRef = useRef(null);
  const ambientLoopsRef = useRef([]);
  const thirdFragScareDoneRef = useRef(false);
  const prevFragCountRef = useRef(null);

  const [roomData, setRoomData] = useState(null),
    [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false),
    [activeClue, setActiveClue] = useState(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false),
    [isCaseFilesOpen, setIsCaseFilesOpen] = useState(false);
  const [isPhotoPuzzleOpen, setIsPhotoPuzzleOpen] = useState(false),
    [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [hoverPrompt, setHoverPrompt] = useState(null),
    [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false),
    [audioMuted, setAudioMuted] = useState(false);
  const [isJumpscareActive, setIsJumpscareActive] = useState(false);
  const [assetProgress, setAssetProgress] = useState(null);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 3.8, yaw: 0 });
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [mouseSens, setMouseSens] = useState(1.0);
  const [qualityMode, setQualityMode] = useState('eco');
  const lastPosRef = useRef({ x: 0, z: 3.8, yaw: 0, locked: false });
  const lastRoomStateSigRef = useRef('');
  const jumpscareTriggeredRef = useRef(false);
  const wasOnStairsRef = useRef(false);
  const jumpscareTimerRef = useRef(null);
  const handlePlayerMoveRef = useRef(null);
  const [flashOverlay, setFlashOverlay] = useState({
    color: '#c40414',
    opacity: 0,
    visible: false,
  });

  const previewRoomData = {
    title: 'The Basement',
    is_completed: false,
    basket_unlocked: true,
    collected_fragment_ids: ['basement-preview-1'],
    evidence: [],
    photo_pieces_collected: 4,
    clues: [
      { id: 'R1-09', object_id: 'intercom', solved: false, attempts: 0, attempts_max: 3 },
      { id: 'R1-10', object_id: 'rack_door', solved: false, attempts: 0, attempts_max: 3 },
      { id: 'R1-FIN', object_id: 'containment_console', solved: false, attempts: 0, attempts_max: 3 },
    ],
  };

  const showNotification = (message) => {
    setNotification(message);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => setNotification(null), 4500);
  };

  const playOneShot = (url, vol = 0.75) => {
    if (audioMuted) return null;
    if (audioRef.current?.playTrack) return audioRef.current.playTrack(url, vol);
    try {
      if (typeof Audio !== 'undefined') {
        const snd = new Audio(url);
        snd.volume = vol;
        snd.play().catch(() => {});
        return snd;
      }
    } catch (_) {}
    return null;
  };

  const flashScreen = (color = '#6b0808', opacity = 0.28, durationMs = 220) => {
    setFlashOverlay({ color, opacity, visible: true });
    setTimeout(() => setFlashOverlay((prev) => ({ ...prev, visible: false })), durationMs);
  };

  const triggerJumpscare = (durationMs = 1000, markStairDone = true) => {
    if (markStairDone && jumpscareTriggeredRef.current) return;
    if (markStairDone) jumpscareTriggeredRef.current = true;
    setIsJumpscareActive(true);

    try {
      if (!audioMuted && typeof Audio !== 'undefined') {
        const scream = new Audio('/assets/audio/basement/scream.mp3');
        scream.volume = 1.0;
        screamAudioRef.current = scream;
        scream.play().catch(() => {});
      }
    } catch (_) {}

    try {
      audioRef.current?.hoarseScream?.(1.0);
    } catch (_) {}

    try {
      engineRef.current?.shake?.(2.5, 1.0);
    } catch (_) {}

    if (jumpscareTimerRef.current) clearTimeout(jumpscareTimerRef.current);
    jumpscareTimerRef.current = setTimeout(() => {
      setIsJumpscareActive(false);
      try {
        if (screamAudioRef.current) {
          screamAudioRef.current.pause();
          screamAudioRef.current.currentTime = 0;
        }
      } catch (_) {}
    }, durationMs);
  };

  const fetchRoomState = async () => {
    if (previewMode) {
      setRoomData(previewRoomData);
      roomDataRef.current = previewRoomData;
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/game/room/basement', {
        credentials: 'include',
        headers: { 'x-session-token': getSessionToken() },
      });
      if (res.ok) {
        const data = await res.json();
        const mappedData = { ...data, evidence: mapBasementEvidence(data.evidence) };
        const count = mappedData.collected_fragment_ids?.length || 0;
        if (
          prevFragCountRef.current !== null &&
          prevFragCountRef.current < 3 &&
          count >= 3 &&
          !thirdFragScareDoneRef.current
        ) {
          thirdFragScareDoneRef.current = true;
          setTimeout(() => {
            if (!document.querySelector('[role="dialog"]')) {
              triggerJumpscare(750, false);
            }
          }, 2200);
        }
        prevFragCountRef.current = count;
        roomDataRef.current = mappedData;
        const clueSig = (mappedData.clues || [])
          .map((c) => `${c.id}:${c.solved ? 1 : 0}:${c.attempts || 0}:${c.is_locked ? 1 : 0}`)
          .join('|');
        const sig = `${mappedData.title || ''}|${mappedData.is_completed ? 1 : 0}|${
          mappedData.basket_unlocked ? 1 : 0
        }|${(mappedData.collected_fragment_ids || []).join(',')}|${
          mappedData.photo_pieces_collected || 0
        }|${clueSig}`;
        if (sig !== lastRoomStateSigRef.current) {
          lastRoomStateSigRef.current = sig;
          setRoomData(mappedData);
        }
        if (data.is_completed) engineRef.current?.openDoor?.();
      } else if ([401, 403, 404, 429, 500].includes(res.status)) return;
    } catch (e) {
      console.error('Failed to load basement:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFlavorInteract = (objectId) => {
    window.__triggerBasementFlavor?.(objectId);
    if (objectId === 'flavor_valve') {
      audioRef.current?.pipeBurst?.(-3.96, 2.2);
      playOneShot('/assets/audio/basement/pipe_drip.mp3', 0.65);
    } else if (objectId === 'flavor_breaker') {
      audioRef.current?.sparkPop?.();
      flashScreen('#9aa5b8', 0.22, 160);
    } else if (objectId === 'flavor_grate') {
      playOneShot('/assets/audio/basement/stinger_sub.mp3', 0.8);
      audioRef.current?.hoarseScream?.(0.55);
      flashScreen('#5c0707', 0.3, 240);
    }
    showNotification(FLAVOR_MESSAGES[objectId] || 'You examine the fixture in the dark.');
  };

  const handleInteract = async (objectId) => {
    if (objectId && objectId.startsWith('flavor_')) {
      handleFlavorInteract(objectId);
      return;
    }

    const data = roomDataRef.current;
    if (previewMode) {
      if (objectId === 'room_door') {
        showNotification('Preview mode: the Room 3 exit is not connected.');
        return;
      }
      const clue = data?.clues?.find((c) => c.object_id === objectId);
      if (clue) {
        setActiveClue(clue);
        engineRef.current?.unlock();
      } else {
        showNotification(`Preview: inspected ${objectId.replaceAll('_', ' ')}`);
      }
      return;
    }
    if (objectId === 'room_door') {
      if (data?.is_completed) {
        setIsCompleteOpen(true);
        engineRef.current?.unlock();
      } else if (onProceedToStudy) {
        onProceedToStudy();
      } else {
        audioRef.current?.slam?.(3, 2.95);
        showNotification('The backward passage leads to the Study. The subterranean vault remains sealed.');
      }
      return;
    }
    try {
      const res = await fetch('/api/game/room/basement/search', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': getSessionToken(),
        },
        body: JSON.stringify({ object_id: objectId }),
      });
      if (res.ok) {
        const result = await res.json();
        if (objectId === 'floor_seal') {
          playOneShot('/assets/audio/basement/stinger_sub.mp3', 0.72);
          engineRef.current?.shake?.(0.5, 0.45);
          flashScreen('#6b0808', 0.25, 200);
        } else if (!result.found && !audioRef.current?.muted) {
          audioRef.current?.drawerSlam?.(0, 0);
          playOneShot('/assets/audio/basement/metal_scrape.mp3', 0.32);
        }
        if (result.message) showNotification(result.message);
        if (result.found) {
          audioRef.current?.good?.();
          await fetchRoomState();
          return;
        }
      }
      if ([401, 403, 404, 429, 500].includes(res.status)) {
        showNotification(
          res.status === 429
            ? 'Search is temporarily rate limited.'
            : 'Search request could not be completed.'
        );
      }
    } catch (e) {
      console.error('Search failed:', e);
    }
    const clue = data?.clues?.find((c) => c.object_id === objectId);
    if (clue) {
      if (!data?.basket_unlocked) {
        showNotification('The evidence lock is sealed. Recover all 5 basement fragments first.');
        return;
      }
      if (clue.is_locked) {
        showNotification(clue.lock_reason || 'This clue is locked.');
        return;
      }
      if (clue.id === 'R1-10' && !isClueResolved(data?.clues, 'R1-09')) {
        showNotification('Previous clue "R1-09" in this sequence must be solved first.');
        return;
      }
      if (
        clue.id === 'R1-FIN' &&
        (!isClueResolved(data?.clues, 'R1-09') || !isClueResolved(data?.clues, 'R1-10'))
      ) {
        showNotification('Final terminal locked. Solve R1-09 and R1-10 first.');
        return;
      }
      if (!clue.solved && (clue.attempts || 0) >= (clue.attempts_max || 3)) {
        showNotification('Maximum attempts exhausted for this clue.');
        return;
      }
      setActiveClue(clue);
      engineRef.current?.unlock();
    }
  };
  handleInteractRef.current = handleInteract;

  const handlePlayerMove = ({ px }) => {
    if (px >= 16.5) {
      wasOnStairsRef.current = true;
    }
    if (!jumpscareTriggeredRef.current && wasOnStairsRef.current && px <= 15.2) {
      triggerJumpscare(1000, true);
    }
  };
  handlePlayerMoveRef.current = handlePlayerMove;

  useEffect(() => {
    [
      '/assets/audio/basement/scream.mp3',
      '/assets/audio/basement/alesiadavina-halloween-horror-sound-lurking-monster-145070.mp3',
      '/assets/audio/basement/universfield-heavy-object-falling-291096.mp3',
      '/assets/audio/basement/pipe_drip.mp3',
      '/assets/audio/basement/metal_scrape.mp3',
      '/assets/audio/basement/hoarse_scream.wav',
      '/assets/audio/basement/stinger_sub.mp3',
      '/audio/study/universfield-door-knock-291150.mp3',
      '/audio/study/universfield-female-crying-291098.mp3',
      '/audio/study/oxidvideos-creaking-wooden-floor-footsteps-410804.mp3',
      '/audio/study/alesiadavina-horror-sound-lurking-horror-monster-189948.mp3',
      '/audio/study/universfield-cinematic-paranormal-horror-498207.mp3',
      '/audio/study/dragon-studio-scary-scream-401725.mp3',
      '/audio/study/universfield-okiku-well-horror-578058.mp3'
    ].forEach((url) => {
      try {
        const a = new Audio(url);
        a.preload = 'auto';
        a.load();
      } catch (_) {}
    });
    try {
      const imgPreload = new Image();
      imgPreload.src = jumpscareVisual;
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.__triggerBasementJumpscare = triggerJumpscare;
    }
    const onProgress = (e) => {
      if (e?.detail) setAssetProgress(e.detail);
    };
    const onScareEvent = (e) => {
      const type = e?.detail?.type;
      const muted = Boolean(audioRef.current?.muted);
      if (type === 'stalker') {
        if (!muted) {
          playOneShot('/assets/audio/basement/metal_scrape.mp3', 0.8);
          playOneShot('/assets/audio/basement/hoarse_scream.wav', 0.55);
        }
        flashScreen('#640606', 0.28, 260);
      } else if (type === 'hatchBang') {
        if (!muted) {
          playOneShot('/assets/audio/basement/stinger_sub.mp3', 0.68);
          playOneShot('/assets/audio/basement/metal_scrape.mp3', 0.38);
        }
      } else if (type === 'fuseArc') {
        if (!muted) audioRef.current?.sparkPop?.();
      } else if (type === 'peek') {
        if (!muted) {
          audioRef.current?.whisperRaspy?.('behind', (Math.random() - 0.5) * 4, -2);
          playOneShot('/audio/study/dragon-studio-scary-scream-401725.mp3', 0.46);
          playOneShot('/assets/audio/basement/metal_scrape.mp3', 0.45);
        }
      } else if (type === 'brownout') {
        if (!muted) {
          if (audioRef.current?.blackoutSurge) audioRef.current.blackoutSurge();
          else audioRef.current?.sparkPop?.();
          playOneShot('/assets/audio/basement/hoarse_scream.wav', 0.55);
        }
        flashScreen('#3a0404', 0.22, 220);
      }
    };
    window.addEventListener('ctc:basement-progress', onProgress);
    window.addEventListener('ctc:basement-scare', onScareEvent);

    return () => {
      window.removeEventListener('ctc:basement-progress', onProgress);
      window.removeEventListener('ctc:basement-scare', onScareEvent);
      if (typeof window !== 'undefined') {
        if (window.__triggerBasementJumpscare === triggerJumpscare) {
          delete window.__triggerBasementJumpscare;
        }
        delete window.__triggerBasementFlavor;
      }
    };
  }, []);

  // Seamless Basement Ambient Loops + Leaking Pipe Drips + Corner Horror SFX + 75s Monster Cycle
  useEffect(() => {
    if (!isStarted) return;

    let isDisposed = false;
    let monsterInterval = null;
    let fallingTimeout = null;
    let dripTimer = null;
    let cornerSfxTimer = null;

    // Start ambient room loops (amb_basement.mp3 + server_hum.mp3)
    const startLoop = (url, vol) => {
      try {
        if (typeof Audio === 'undefined') return null;
        const a = new Audio(url);
        a.loop = true;
        a.volume = audioMuted ? 0 : vol;
        a._baseVol = vol;
        a.play().catch(() => {});
        return a;
      } catch (_) {
        return null;
      }
    };
    const loops = [
      startLoop('/assets/audio/basement/amb_basement.mp3', 0.52),
      startLoop('/assets/audio/basement/server_hum.mp3', 0.22),
      startLoop('/audio/study/universfield-okiku-well-horror-578058.mp3', 0.26),
    ].filter(Boolean);
    ambientLoopsRef.current = loops;

    const playSound = (url, vol = 0.85) => {
      if (isDisposed || audioMuted) return null;
      if (audioRef.current?.playTrack) {
        return audioRef.current.playTrack(url, vol);
      }
      try {
        if (typeof Audio !== 'undefined') {
          const snd = new Audio(url);
          snd.volume = audioMuted ? 0 : vol;
          snd.play().catch(() => {});
          return snd;
        }
      } catch (_) {}
      return null;
    };

    const scheduleDrip = () => {
      if (isDisposed) return;
      dripTimer = setTimeout(() => {
        if (isDisposed) return;
        playSound('/assets/audio/basement/pipe_drip.mp3', 0.55);
        scheduleDrip();
      }, 6000 + Math.random() * 6000);
    };
    scheduleDrip();

    const cornerPool = [
      () => playSound('/audio/study/oxidvideos-creaking-wooden-floor-footsteps-410804.mp3', 0.72),
      () => playSound('/audio/study/universfield-door-knock-291150.mp3', 0.8),
      () => playSound('/audio/study/universfield-female-crying-291098.mp3', 0.6),
      () => playSound('/audio/study/alesiadavina-horror-sound-lurking-horror-monster-189948.mp3', 0.68),
      () => playSound('/assets/audio/basement/metal_scrape.mp3', 0.65),
      () => {
        if (!audioMuted) audioRef.current?.followerFootstepsBehind?.();
      },
      () => playSound('/audio/study/universfield-cinematic-paranormal-horror-498207.mp3', 0.62),
      () => playSound('/assets/audio/basement/hoarse_scream.wav', 0.5),
      () => {
        if (!audioMuted) {
          audioRef.current?.whisperRaspy?.('behind', (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 16);
        }
      },
      () => playSound('/assets/audio/basement/stinger_sub.mp3', 0.62),
    ];
    let cornerIdx = 0;
    const scheduleCornerSfx = (initialDelay = null) => {
      if (isDisposed) return;
      const waitMs = initialDelay ?? (10000 + Math.random() * 8000);
      cornerSfxTimer = setTimeout(() => {
        if (isDisposed) return;
        if (!document.querySelector('[role="dialog"]')) {
          cornerPool[cornerIdx % cornerPool.length]();
          cornerIdx++;
        }
        scheduleCornerSfx();
      }, waitMs);
    };
    scheduleCornerSfx(4500);

    const triggerLurkingCycle = () => {
      if (isDisposed) return;
      playSound(
        '/assets/audio/basement/alesiadavina-halloween-horror-sound-lurking-monster-145070.mp3',
        0.85
      );

      const delayMs = (40 + Math.random() * 5) * 1000;
      if (fallingTimeout) clearTimeout(fallingTimeout);
      fallingTimeout = setTimeout(() => {
        if (isDisposed) return;
        playSound('/assets/audio/basement/universfield-heavy-object-falling-291096.mp3', 0.85);
      }, delayMs);
    };

    if (typeof window !== 'undefined') {
      window.__triggerBasementLurkingCycle = triggerLurkingCycle;
    }

    const MONSTER_INTERVAL_MS = 75 * 1000;
    monsterInterval = setInterval(triggerLurkingCycle, MONSTER_INTERVAL_MS);

    return () => {
      isDisposed = true;
      if (monsterInterval) clearInterval(monsterInterval);
      if (fallingTimeout) clearTimeout(fallingTimeout);
      if (dripTimer) clearTimeout(dripTimer);
      if (cornerSfxTimer) clearTimeout(cornerSfxTimer);
      ambientLoopsRef.current.forEach((a) => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch (_) {}
      });
      ambientLoopsRef.current = [];
      if (
        typeof window !== 'undefined' &&
        window.__triggerBasementLurkingCycle === triggerLurkingCycle
      ) {
        delete window.__triggerBasementLurkingCycle;
      }
    };
  }, [isStarted, audioMuted]);

  useEffect(() => {
    fetchRoomState();
    const iv = setInterval(fetchRoomState, 2000);
    return () => clearInterval(iv);
  }, []);

  useEffect(
    () => () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      if (jumpscareTimerRef.current) clearTimeout(jumpscareTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const key = (e) => {
      const tag = (e.target?.tagName || '').toUpperCase();
      if (['INPUT', 'TEXTAREA'].includes(tag) || e.target?.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === 'b') {
        e.preventDefault();
        setIsBasketOpen((v) => {
          const next = !v;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
      }
      if (k === 'c') {
        e.preventDefault();
        setIsCaseFilesOpen((v) => {
          const next = !v;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
      }
      if (k === 'p') {
        e.preventDefault();
        setIsPhotoPuzzleOpen((v) => {
          const next = !v;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
      }
      if (k === 'r') {
        e.preventDefault();
        setIsDossierOpen((v) => {
          const next = !v;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
      }
      if (k === 'h') {
        e.preventDefault();
        setIsHintOpen((v) => {
          const next = !v;
          if (next) engineRef.current?.unlock();
          else engineRef.current?.lock();
          return next;
        });
      }
      if (k === 'm') {
        e.preventDefault();
        setAudioMuted((prev) => {
          const next = !prev;
          audioRef.current?.setMuted?.(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, []);

  useEffect(() => {
    if (!mountRef.current || engineRef.current) return;
    audioRef.current = new GameAudioBasement();
    try {
      engineRef.current = createEngine(mountRef.current, basementConfig, {
        audio: audioRef.current,
        onFlash: (color, opacity = 0.78, durationMs = 200) => {
          setFlashOverlay({ color, opacity, visible: true });
          setTimeout(
            () => setFlashOverlay((prev) => ({ ...prev, visible: false })),
            durationMs || 200
          );
        },
        onTarget: (id) => {
          activeTargetRef.current = id;
          const label = basementConfig.interact?.[id]?.label;
          setHoverPrompt(label || (id ? `Inspect ${id.replaceAll('_', ' ')}` : null));
        },
        onInteract: (id) => handleInteractRef.current?.(id),
        onLock: () => {},
        onPlayerMove: (pos) => handlePlayerMoveRef.current?.(pos),
      });
      engineRef.current?.setQualityMode?.(qualityMode);
    } catch (e) {
      console.error('Basement initialization failed:', e);
    }
    return () => {
      engineRef.current?.dispose?.();
      engineRef.current = null;
      audioRef.current?.dispose?.();
    };
  }, []);

  useEffect(() => {
    if (!isStarted) return;
    const onLockChange = () => {
      setIsPointerLocked(Boolean(document.pointerLockElement));
    };
    document.addEventListener('pointerlockchange', onLockChange);
    const iv = setInterval(() => {
      const pos = engineRef.current?.getPos?.();
      const prev = lastPosRef.current;
      if (
        pos &&
        (Math.abs(pos.x - prev.x) > 0.05 ||
          Math.abs(pos.z - prev.z) > 0.05 ||
          Math.abs((pos.yaw || 0) - prev.yaw) > 0.05)
      ) {
        lastPosRef.current = { x: pos.x, z: pos.z, yaw: pos.yaw || 0, locked: prev.locked };
        setPlayerPos(pos);
      }
      const locked = Boolean(engineRef.current?.isLocked?.());
      if (locked !== lastPosRef.current.locked) {
        lastPosRef.current.locked = locked;
        setIsPointerLocked(locked);
      }
    }, 150);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      clearInterval(iv);
    };
  }, [isStarted]);

  const handleStart = () => {
    setIsStarted(true);
    audioRef.current?.start(basementConfig.audio);
    engineRef.current?.setPaused(false);
    engineRef.current?.lock();
  };

  const handleToggleQuality = () => {
    const next = qualityMode === 'eco' ? 'high' : 'eco';
    setQualityMode(next);
    engineRef.current?.setQualityMode?.(next);
    showNotification(
      next === 'eco'
        ? 'Graphics: ECO mode enabled (optimized for low-end GPUs).'
        : 'Graphics: HIGH detail mode enabled.'
    );
  };

  const handleCycleSensitivity = () => {
    const steps = [0.6, 0.8, 1.0, 1.3, 1.6];
    const idx = steps.findIndex((s) => Math.abs(s - mouseSens) < 0.05);
    const next = steps[(idx + 1) % steps.length];
    setMouseSens(next);
    engineRef.current?.setSensitivity?.(next);
  };

  const handleClueSubmit = async (clueId, answer) => {
    if (previewMode) {
      return {
        correct: false,
        message: `Preview mode: "${answer}" is not submitted to the server.`,
      };
    }
    if (submittingRef.current) return { correct: false, message: 'Submission already pending' };
    submittingRef.current = true;
    setIsSubmitting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`/api/game/clue/${clueId}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': getSessionToken(),
        },
        body: JSON.stringify({ answer }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({ detail: 'Invalid server response' }));
      if (res.ok) {
        await fetchRoomState();
        if (data.room_completed) {
          engineRef.current?.openDoor?.();
          setIsCompleteOpen(true);
        }
        return data;
      }
      if (res.status === 429)
        return { correct: false, message: 'Submission is temporarily rate limited.' };
      if (res.status === 401)
        return { correct: false, message: 'Your session is no longer authorized.' };
      if (res.status === 403) {
        const msg =
          typeof data?.detail === 'object'
            ? data?.detail?.message || data?.detail?.code
            : data?.detail;
        return { correct: false, message: msg || 'Action not permitted.' };
      }
      if (res.status === 404) return { correct: false, message: 'This clue is unavailable.' };
      if (res.status === 500)
        return { correct: false, message: 'The server could not process this submission.' };
      const fallbackMsg =
        (typeof data?.detail === 'object' ? data?.detail?.message : data?.detail) ||
        'Submission failed';
      return { correct: false, message: fallbackMsg };
    } catch (e) {
      return {
        correct: false,
        message: e?.name === 'AbortError' ? 'Submission timed out.' : 'Server communication error',
      };
    } finally {
      clearTimeout(timeout);
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const clues = roomData?.clues || [],
    roomClues = clues.filter((c) => c.id !== 'R1-FIN');
  const clueModalProps = {
    isSubmitting,
    onSubmitAnswer: handleClueSubmit,
    clue: activeClue,
    onClose: () => {
      setActiveClue(null);
      engineRef.current?.lock();
    },
  };

  useEffect(() => {
    let cancelled = false,
      retryTimer = null,
      lastText = null;
    let deadline = null;
    const toNum = (v) =>
      typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? Number(v) : NaN;
    const parseRemaining = (d) => {
      const direct = toNum(d?.remaining_seconds ?? d?.remaining);
      if (Number.isFinite(direct)) return Math.max(0, Math.floor(direct));
      const end = Date.parse(d?.ends_at),
        now = Date.parse(d?.server_time ?? d?.now);
      return Number.isFinite(end) && Number.isFinite(now)
        ? Math.max(0, Math.floor((end - now) / 1000))
        : null;
    };
    const render = () => {
      let text = '--:--';
      if (deadline !== null) {
        const left = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
        text = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(
          2,
          '0'
        )}`;
      }
      if (engineRef.current && text !== lastText) {
        lastText = text;
        engineRef.current.setCountdown?.(text);
      }
    };
    const sync = async (attempt = 0) => {
      if (previewMode) {
        deadline = performance.now() + 15 * 60 * 1000;
        render();
        return;
      }
      try {
        const res = await fetch('/api/time', { credentials: 'include' });
        if (cancelled) return;
        if (res.ok) {
          const remaining = parseRemaining(await res.json());
          if (remaining !== null && !cancelled) {
            deadline = performance.now() + remaining * 1000;
            render();
            return;
          }
        }
      } catch (_) {}
      if (!cancelled && attempt < 3)
        retryTimer = setTimeout(() => sync(attempt + 1), [5000, 15000, 45000][attempt]);
    };
    sync();
    const tickTimer = setInterval(render, 1000);
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearInterval(tickTimer);
    };
  }, []);

  const isAnyModalOpen = Boolean(
    isBasketOpen ||
      isCaseFilesOpen ||
      isPhotoPuzzleOpen ||
      activeClue ||
      isCompleteOpen ||
      isDossierOpen ||
      isHintOpen
  );

  const isLoadingModels = Boolean(assetProgress && assetProgress.pct < 100);

  return (
    <div className="basement-room relative w-full h-screen overflow-hidden bg-[#14161a] select-none font-bsmt-ui">
      <div
        ref={mountRef}
        onClick={() => {
          if (isStarted && engineRef.current && !isAnyModalOpen) engineRef.current.lock();
        }}
        className="absolute inset-0"
      />

      {/* Subtle atmospheric vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at center, transparent 62%, rgba(0,0,0,0.42) 100%)',
        }}
      />

      {flashOverlay.visible && (
        <div
          className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-75"
          style={{ backgroundColor: flashOverlay.color, opacity: flashOverlay.opacity }}
        />
      )}

      {/* ── Room 5–Style Editorial Hero Briefing Entry Overlay ── */}
      {!isStarted && (
        <div
          className="fixed inset-0 z-[100] flex items-center select-none overflow-hidden"
          style={{
            background:
              'linear-gradient(98deg, rgba(6, 5, 8, 0.92) 0%, rgba(10, 7, 10, 0.74) 44%, rgba(8, 6, 8, 0.16) 76%, rgba(6, 5, 8, 0.45) 100%)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 72% 45%, rgba(145, 20, 20, 0.16) 0%, transparent 62%)',
            }}
          />

          <div className="relative z-10 w-full max-w-6xl mx-auto px-8 sm:px-14 lg:px-20 py-10 flex flex-col items-start">
            <div className="max-w-xl space-y-6">
              <div className="bsmt-glass-pill text-[10.5px] tracking-[0.24em] uppercase font-semibold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    loading ? 'bg-amber-400 animate-pulse' : 'bg-[#ff4d4d]'
                  }`}
                />
                <span>
                  ROUND 1 · ROOM 3 {loading ? '· CONNECTING...' : '· HOLLOW HOUSE CELLAR'}
                </span>
              </div>

              <div className="space-y-3">
                <h1 className="font-bsmt-display text-4xl sm:text-6xl font-bold tracking-[0.06em] uppercase text-white leading-[1.03] drop-shadow-[0_8px_32px_rgba(0,0,0,0.88)]">
                  {roomData?.title || 'THE BASEMENT'}
                </h1>
                <div className="h-[2px] w-24 rounded-full bg-gradient-to-r from-[#ff4d4d] via-white/75 to-transparent" />
              </div>

              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-lg font-bsmt-ui">
                Descend below Hollow House into the containment cellar. Recover all 5 shredded fragments, decrypt the intercom and server rack protocols, and disengage the triple-screen seal before time runs out.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="bsmt-glass-pill text-[11px] font-medium">
                  5 Evidence Fragments
                </span>
                <span className="bsmt-glass-pill text-[11px] font-medium">
                  2 Clues + 3-Stage Finale
                </span>
                <span className="bsmt-glass-pill text-[11px] font-medium">
                  Subterranean Containment Seal
                </span>
              </div>

              <div className="pt-2">
                {isLoadingModels ? (
                  <div className="bsmt-glass-panel w-full max-w-sm px-5 py-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs tracking-wider text-white/90 font-bsmt-ui">
                      <span>{assetProgress.label}</span>
                      <span className="font-mono font-bold">{assetProgress.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#ff4d4d] to-white transition-all duration-300"
                        style={{ width: `${Math.max(4, Math.min(100, assetProgress.pct))}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleStart}
                    aria-label="CLICK TO ENTER BASEMENT"
                    className="group bsmt-glass-primary"
                  >
                    <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#ffffff]" />
                    <span>Enter the Basement</span>
                    <span className="sr-only">CLICK TO ENTER BASEMENT</span>
                    <span className="text-white/90 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </button>
                )}
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/65 font-bsmt-ui">
                <span>
                  <strong className="text-white">WASD · Mouse</strong> Move &amp; Look
                </span>
                <span>
                  <strong className="text-white">E · Right-Click</strong> Inspect
                </span>
                <span>
                  <strong className="text-white">F</strong> Torch
                </span>
                <span>
                  <strong className="text-white">B · C · P</strong> Files
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[80] pointer-events-none max-w-lg rounded-full px-5 py-2.5 text-xs font-bsmt-ui shadow-2xl flex items-center gap-2.5 animate-fade-in-fast"
          style={{
            background: 'rgba(18, 20, 24, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            color: '#ffffff',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff4d4d] shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {isStarted && (
        <HUDBasement
          roomTitle={roomData?.title || 'The Basement'}
          totalFragments={5}
          collectedCount={roomData?.collected_fragment_ids?.length || 0}
          basketUnlocked={Boolean(roomData?.basket_unlocked)}
          isRoomCompleted={Boolean(roomData?.is_completed)}
          cluesSolved={roomClues.filter((c) => c.solved).length}
          totalClues={2}
          finaleSolved={Boolean(roomData?.clues?.find((c) => c.id === 'R1-FIN')?.solved)}
          photoCount={roomData?.photo_pieces_collected || 0}
          playerPos={playerPos}
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
          onToggleAudio={() => {
            const v = !audioMuted;
            audioRef.current?.setMuted(v);
            setAudioMuted(v);
          }}
          qualityMode={qualityMode}
          onToggleQuality={handleToggleQuality}
          activeHoverPrompt={hoverPrompt}
          isPointerLocked={isPointerLocked}
          mouseSensitivity={mouseSens}
          onCycleSensitivity={handleCycleSensitivity}
          onRequestLock={() => engineRef.current?.lock?.()}
        />
      )}

      <BasketModal
        isOpen={isBasketOpen}
        onClose={() => {
          setIsBasketOpen(false);
          engineRef.current?.lock();
        }}
        evidence={roomData?.evidence || []}
        collectedIds={roomData?.collected_fragment_ids || []}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        totalInRoom={5}
        roomTitle="The Basement"
      />
      <CaseFilesModal
        isOpen={isCaseFilesOpen}
        onClose={() => {
          setIsCaseFilesOpen(false);
          engineRef.current?.lock();
        }}
        clues={clues}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        onOpenClue={(clue) => {
          setIsCaseFilesOpen(false);
          if (!roomData?.basket_unlocked) {
            showNotification('The evidence lock is sealed. Recover all 5 basement fragments first.');
            return;
          }
          if (clue.is_locked) {
            showNotification(clue.lock_reason || 'This clue is locked.');
            return;
          }
          if (clue.id === 'R1-10' && !isClueResolved(clues, 'R1-09')) {
            showNotification('Previous clue "R1-09" in this sequence must be solved first.');
            return;
          }
          if (
            clue.id === 'R1-FIN' &&
            (!isClueResolved(clues, 'R1-09') || !isClueResolved(clues, 'R1-10'))
          ) {
            showNotification('Final terminal locked. Solve R1-09 and R1-10 first.');
            return;
          }
          if (!clue.solved && (clue.attempts || 0) >= (clue.attempts_max || 3)) {
            showNotification('Maximum attempts exhausted for this clue.');
            return;
          }
          setActiveClue(clue);
          engineRef.current?.unlock();
        }}
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
      <IntercomQrModal isOpen={Boolean(activeClue?.id === 'R1-09')} {...clueModalProps} />
      <ServerRackNoteModal isOpen={Boolean(activeClue?.id === 'R1-10')} {...clueModalProps} />
      <FinalContainmentTerminalModal
        isOpen={Boolean(activeClue?.id === 'R1-FIN')}
        {...clueModalProps}
        onOpenHints={() => setIsHintOpen(true)}
      />
      <Round1VictoryModal
        isOpen={isCompleteOpen}
        onClose={() => setIsCompleteOpen(false)}
        onProceed={() => {
          setIsCompleteOpen(false);
          onProceedToLobby?.();
          showNotification('Round 1 complete. The subterranean vault seal is disengaged.');
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
        roomId="basement"
        roomTitle="The Basement"
      />

      {isJumpscareActive && (
        <div
          className="jumpscare-overlay"
          role="alert"
          aria-live="assertive"
          data-testid="basement-jumpscare-modal"
        >
          <img
            src={jumpscareVisual || '/assets/jumpscare_entity.jpg'}
            onError={(e) => {
              if (e.target.src !== '/jumpscare_entity.jpg') {
                e.target.src = '/jumpscare_entity.jpg';
              }
            }}
            alt="Jumpscare Entity"
            className="jumpscare-image"
            data-testid="jumpscare-image"
          />
        </div>
      )}
    </div>
  );
}

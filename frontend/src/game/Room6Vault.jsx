import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createEngine } from './engine/engine';
import vaultConfig from './rooms/vault';
import { GameAudioVault } from './engine/audioVault';
import HUDVault from './components/vault/HUDVault';
import VaultDossierModal from './components/vault/VaultDossierModal';
import ManualDiffModal from './components/vault/ManualDiffModal';
import FailsafeCircuitModal from './components/vault/FailsafeCircuitModal';
import CentralConsoleModal from './components/vault/CentralConsoleModal';
import VaultDocumentModal, { VAULT_DOCUMENTS } from './components/vault/VaultDocumentModal';
import HintModal from './components/HintModal';
import './vault.css';

function authHeaders(extra = {}) {
  const token = localStorage.getItem('ctc_token') || '';
  return token ? { 'x-session-token': token, ...extra } : { ...extra };
}

function formatMMSS(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function Room6Vault({ team, onLogout }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const audioRef = useRef(null);
  const cluesRef = useRef([]);
  const anyModalOpenRef = useRef(false);
  const vaultRestoredRef = useRef(false);
  const lastTimeStrRef = useRef('');
  const noticeTimerRef = useRef(null);
  const tearTimerRef = useRef(null);
  const nightmareTimerRef = useRef(null);
  const crackTimerRef = useRef(null);
  const lastApiRemRef = useRef(null);
  const localRemRef = useRef(null);

  const [roomData, setRoomData] = useState({
    room_id: 'vault',
    title: 'The Anointing Vault',
    clues: [],
    is_completed: false,
  });
  const [activeClue, setActiveClue] = useState(null);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [discoveredDocIds, setDiscoveredDocIds] = useState([]);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isSystemOpen, setIsSystemOpen] = useState(false);
  const docDelayRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [activeHoverPrompt, setActiveHoverPrompt] = useState('');
  const [notice, setNotice] = useState('');
  const [scanTear, setScanTear] = useState(false);
  const [nightmarePulse, setNightmarePulse] = useState(false);
  const [visorCrack, setVisorCrack] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 13.8, yaw: 0 });
  const [mouseSensitivity, setMouseSensitivity] = useState(1.0);
  const [threatState, setThreatState] = useState(null);
  const [qualityMode, setQualityMode] = useState(() => {
    try {
      const saved = localStorage.getItem('vault_quality');
      if (saved === 'low' || saved === 'eco') return 'low';
      if (saved === 'high' || saved === 'crisp') return 'high';
      return 'med';
    } catch {
      return 'med';
    }
  });
  const [vaultRestored, setVaultRestored] = useState(false);
  const [victoryData, setVictoryData] = useState(null);
  const [clearanceDismissed, setClearanceDismissed] = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(
    () => typeof navigator !== 'undefined' && !/jsdom/i.test(navigator.userAgent)
  );
  const [loadPct, setLoadPct] = useState(0);

  useEffect(() => {
    if (!isBootLoading) return undefined;
    // Safety fallback: dismiss after 5.5s if any network or asset load stalls
    const t = setTimeout(() => {
      setLoadPct(100);
      setIsBootLoading(false);
    }, 5500);
    return () => clearTimeout(t);
  }, [isBootLoading]);

  const showNotice = useCallback((msg, durationMs = 4200) => {
    setNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    if (msg && durationMs > 0) {
      noticeTimerRef.current = setTimeout(() => setNotice(''), durationMs);
    }
  }, []);

  const triggerScanTear = useCallback(() => {
    setScanTear(true);
    if (tearTimerRef.current) clearTimeout(tearTimerRef.current);
    tearTimerRef.current = setTimeout(() => setScanTear(false), 380);
  }, []);

  const triggerNightmarePulse = useCallback((ms = 340) => {
    setNightmarePulse(true);
    if (nightmareTimerRef.current) clearTimeout(nightmareTimerRef.current);
    nightmareTimerRef.current = setTimeout(() => setNightmarePulse(false), ms);
  }, []);

  const triggerVisorCrack = useCallback((ms = 1900) => {
    setVisorCrack(true);
    if (crackTimerRef.current) clearTimeout(crackTimerRef.current);
    crackTimerRef.current = setTimeout(() => setVisorCrack(false), ms);
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch('/api/game/room/vault', {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      const clues = Array.isArray(data.clues) ? data.clues : [];
      cluesRef.current = clues;
      setRoomData({
        room_id: data.room_id || 'vault',
        title: data.title || 'The Anointing Vault',
        clues,
        is_completed: Boolean(data.is_completed),
      });

      if (data.is_completed) {
        vaultRestoredRef.current = true;
        setVaultRestored(true);
        engineRef.current?.restoreContainment?.();
        audioRef.current?.stopCorePulse?.();
      }

      setActiveClue((prev) => {
        if (!prev) return null;
        return clues.find((c) => c.id === prev.id) || prev;
      });
      return data;
    } catch {
      return null;
    }
  }, []);

  const syncCountdown = useCallback(async () => {
    if (vaultRestoredRef.current) {
      engineRef.current?.setCountdown?.('00:00', true);
      return;
    }
    try {
      const res = await fetch('/api/game/time', {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      const rem = Number(data.remaining_seconds ?? data.remaining ?? 0);
      if (lastApiRemRef.current === null || rem !== lastApiRemRef.current) {
        lastApiRemRef.current = rem;
        localRemRef.current = rem;
      } else if (rem === 900 && localRemRef.current !== null && localRemRef.current > 0) {
        // Backend /api/game/time stub returns static 900s; advance locally each second for live 3D board tension
        localRemRef.current = Math.max(0, localRemRef.current - 1);
      }
      const effRem = localRemRef.current ?? rem;
      const nextStr = formatMMSS(effRem);
      const changed = Boolean(lastTimeStrRef.current && lastTimeStrRef.current !== nextStr);
      lastTimeStrRef.current = nextStr;
      engineRef.current?.setCountdown?.(nextStr, vaultRestoredRef.current);
      if (changed) {
        audioRef.current?.flapClack?.();
      }
      if (effRem < 180) {
        audioRef.current?.setTension?.(1);
      }
    } catch {
      // keep existing display on transient poll failure
    }
  }, []);

  const openClueByObjectId = useCallback(
    (objectId) => {
      const clues = cluesRef.current || [];
      const target =
        clues.find((c) => c.object_id === objectId) ||
        (objectId === 'manual_terminal'
          ? clues.find((c) => c.id === 'R2-08')
          : objectId === 'failsafe_panel'
            ? clues.find((c) => c.id === 'R2-09')
            : objectId === 'central_console'
              ? clues.find((c) => c.id === 'R2-10')
              : null);

      if (!target) {
        showNotice('Terminal initializing — loading containment schematics...');
        fetchRoom();
        return;
      }

      setSubmitFeedback(null);
      setActiveClue(target);
      engineRef.current?.unlock?.();
      audioRef.current?.click?.();
    },
    [fetchRoom, showNotice]
  );

  const markDocDiscovered = useCallback((docId) => {
    setDiscoveredDocIds((prev) => (prev.includes(docId) ? prev : [...prev, docId]));
  }, []);

  const handleInteract = useCallback(
    (objectId) => {
      if (objectId === 'core_glass') {
        audioRef.current?.ensureActive?.();
        const fired = engineRef.current?.triggerScare?.('core_glass');
        showNotice(
          fired
            ? 'Something pressed from inside the reinforced glass — then slipped back into the crimson core.'
            : 'Reinforced lead-glass barrier. The suspended core pulses relentlessly at the center of the pit.'
        );
        markDocDiscovered('core_glass');
        if (docDelayRef.current) clearTimeout(docDelayRef.current);
        docDelayRef.current = setTimeout(() => {
          setActiveDocumentId('core_glass');
          engineRef.current?.unlock?.();
        }, fired ? 680 : 0);
        return;
      }

      if (objectId === 'countdown_timer') {
        const display = lastTimeStrRef.current || '--:--';
        showNotice(`Split-flap containment clock: ${display} until automatic purge.`);
        audioRef.current?.flapClack?.();
        markDocDiscovered('countdown_timer');
        setActiveDocumentId('countdown_timer');
        engineRef.current?.unlock?.();
        return;
      }

      if (
        objectId === 'manual_terminal' ||
        objectId === 'failsafe_panel' ||
        objectId === 'central_console'
      ) {
        openClueByObjectId(objectId);
        return;
      }

      if (VAULT_DOCUMENTS[objectId]) {
        const doc = VAULT_DOCUMENTS[objectId];
        audioRef.current?.ensureActive?.();
        audioRef.current?.click?.();
        engineRef.current?.triggerScare?.(`inspect_${objectId}`);
        markDocDiscovered(objectId);
        showNotice(`Examining manuscript: ${doc.title}`);
        setActiveDocumentId(objectId);
        engineRef.current?.unlock?.();
      }
    },
    [markDocDiscovered, openClueByObjectId, showNotice]
  );

  useEffect(() => {
    const isAnyOpen = Boolean(activeClue || activeDocumentId || isDossierOpen || isHintOpen || isSystemOpen);
    anyModalOpenRef.current = isAnyOpen;
    engineRef.current?.setPaused?.(isAnyOpen);
    if (isAnyOpen) {
      engineRef.current?.unlock?.();
    }
  }, [activeClue, activeDocumentId, isDossierOpen, isHintOpen, isSystemOpen]);

  useEffect(() => {
    fetchRoom();
    syncCountdown();
    const timePoll = setInterval(syncCountdown, 1000);
    return () => clearInterval(timePoll);
  }, [fetchRoom, syncCountdown]);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

    const audio = new GameAudioVault();
    audioRef.current = audio;

    let engine = null;
    try {
      engine = createEngine(mountEl, vaultConfig, {
        audio,
        onProgress: (pct) => {
          setLoadPct(pct);
        },
        onComplete: () => {
          setLoadPct(100);
          setTimeout(() => setIsBootLoading(false), 320);
        },
        onInteract: (objId) => handleInteract(objId),
        onTarget: (targetId) => {
          const entry = targetId ? vaultConfig.interact?.[targetId] : null;
          const label =
            typeof entry === 'string'
              ? entry
              : entry?.label || (targetId ? `Inspect ${targetId}` : '');
          setActiveHoverPrompt(label ? `[E] ${label}` : '');
        },
        onScare: (_scareId, msg) => {
          if (msg) showNotice(msg, 3600);
        },
        onThreatState: (st) => setThreatState(st),
        onFlash: () => triggerScanTear(),
        onNightmarePulse: (ms) => triggerNightmarePulse(ms),
        onGlassCrack: () => triggerVisorCrack(),
      });
      engineRef.current = engine;
      engine?.setQualityMode?.(qualityMode);
    } catch {
      // Allow graceful UI operation in headless/WebGL-less environments
    }

    const posPoll = setInterval(() => {
      const p = engine?.getPos?.();
      if (!p) return;
      setPlayerPos((prev) => {
        if (
          Math.abs(prev.x - p.x) < 0.16 &&
          Math.abs(prev.z - p.z) < 0.16 &&
          Math.abs(prev.yaw - p.yaw) < 0.06
        ) {
          return prev;
        }
        return { x: p.x, z: p.z, yaw: p.yaw };
      });
    }, 220);

    const wakeAudio = () => {
      audio.start();
      audio.ensureActive();
    };
    window.addEventListener('pointerdown', wakeAudio, { passive: true });
    window.addEventListener('keydown', wakeAudio, { passive: true });

    const onDocPointerLock = () => {
      const locked = Boolean(document.pointerLockElement);
      setIsPointerLocked(locked);
      if (locked) {
        wakeAudio();
      }
    };
    document.addEventListener('pointerlockchange', onDocPointerLock);

    return () => {
      clearInterval(posPoll);
      window.removeEventListener('pointerdown', wakeAudio);
      window.removeEventListener('keydown', wakeAudio);
      document.removeEventListener('pointerlockchange', onDocPointerLock);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (tearTimerRef.current) clearTimeout(tearTimerRef.current);
      if (nightmareTimerRef.current) clearTimeout(nightmareTimerRef.current);
      if (crackTimerRef.current) clearTimeout(crackTimerRef.current);
      if (docDelayRef.current) clearTimeout(docDelayRef.current);
      engine?.dispose?.();
      audio?.dispose?.();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, [handleInteract, showNotice, triggerScanTear, triggerNightmarePulse, triggerVisorCrack]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;

      if (e.code === 'Tab') {
        e.preventDefault();
        setIsSystemOpen((v) => !v);
        return;
      }

      if (e.code === 'Escape') {
        if (isSystemOpen) {
          setIsSystemOpen(false);
          return;
        }
        if (activeDocumentId) {
          setActiveDocumentId(null);
        } else if (activeClue) {
          setActiveClue(null);
          setSubmitFeedback(null);
        } else if (isDossierOpen) {
          setIsDossierOpen(false);
        } else if (isHintOpen) {
          setIsHintOpen(false);
        }
        return;
      }

      if (isTyping) return;

      if (e.code === 'KeyG' && !e.repeat) {
        if (anyModalOpenRef.current) return;
        e.preventDefault();
        if (engineRef.current?.isLocked?.()) {
          engineRef.current?.unlock?.();
        } else {
          audioRef.current?.start?.();
          audioRef.current?.ensureActive?.();
          engineRef.current?.lock?.();
        }
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        setIsDossierOpen((prev) => !prev);
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        setIsHintOpen((prev) => !prev);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setAudioMuted((prev) => {
          const next = !prev;
          audioRef.current?.setMuted?.(next);
          return next;
        });
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        engineRef.current?.sparkDeadTorch?.();
        audioRef.current?.click?.();
        showNotice('Torch battery dead (0%). Follow the candle sconces and amber lamps.');
      } else if (e.code === 'KeyR' && !e.repeat) {
        e.preventDefault();
        setQualityMode((prev) => {
          const order = ['low', 'med', 'high'];
          const cur = prev === 'eco' ? 'low' : prev === 'crisp' ? 'high' : order.includes(prev) ? prev : 'med';
          const next = order[(order.indexOf(cur) + 1) % order.length];
          try {
            localStorage.setItem('vault_quality', next);
          } catch {
            // ignore
          }
          engineRef.current?.setResolutionMode?.(next);
          showNotice(`Render Resolution: ${next.toUpperCase()} [R]`);
          return next;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeClue, activeDocumentId, isDossierOpen, isHintOpen, isSystemOpen, showNotice]);

  const handleConsoleReject = useCallback(() => {
    triggerScanTear();
    audioRef.current?.bad?.();
    engineRef.current?.scares?.onConsoleReject?.();
  }, [triggerScanTear]);

  const handleVictory = useCallback(
    (responseData) => {
      vaultRestoredRef.current = true;
      setVaultRestored(true);
      setVictoryData(responseData || { ok: true });
      setClearanceDismissed(false);
      engineRef.current?.restoreContainment?.();
      engineRef.current?.setCountdown?.('00:00', true);
      audioRef.current?.stopCorePulse?.();
      audioRef.current?.good?.();
      showNotice('Vault stabilization confirmed — Sub-basement bio-core dormant.');
    },
    [showNotice]
  );

  const handleSubmitClue = useCallback(
    async (clueId, payloadValue) => {
      setIsSubmitting(true);
      setSubmitFeedback(null);
      try {
        const body =
          clueId === 'R2-10' && payloadValue && typeof payloadValue === 'object'
            ? payloadValue
            : { answer: payloadValue };

        const res = await fetch(`/api/game/clue/${encodeURIComponent(clueId)}/submit`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        const isCorrect = Boolean(data.correct || data.solved);

        if (isCorrect) {
          audioRef.current?.good?.();
          await fetchRoom();
          if (clueId === 'R2-10') {
            handleVictory(data);
          } else {
            setSubmitFeedback({ ok: true, message: data.message || 'Accepted.' });
            if (clueId === 'R2-08' && data.solved) {
              engineRef.current?.triggerScare?.('manual_solved');
            }
            if (clueId === 'R2-09' && data.solved) {
              engineRef.current?.triggerScare?.('failsafe_open');
            }
            showNotice(data.message || `${clueId} verified.`);
          }
          return { ok: true, correct: true, ...data };
        }

        if (clueId === 'R2-10') {
          handleConsoleReject();
        } else {
          audioRef.current?.bad?.();
        }
        await fetchRoom();
        const errMsg = data.message || 'Verification rejected. Recheck containment parameters.';
        setSubmitFeedback({ ok: false, message: errMsg });
        return { ok: false, correct: false, message: errMsg, ...data };
      } catch {
        const errMsg = 'Network error communicating with containment server.';
        setSubmitFeedback({ ok: false, message: errMsg });
        return { ok: false, message: errMsg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchRoom, handleConsoleReject, handleVictory, showNotice]
  );

  const handleSelectDossierClue = useCallback(
    (clueIdOrObjectId) => {
      setIsDossierOpen(false);
      const clues = cluesRef.current || [];
      const found =
        clues.find((c) => c.id === clueIdOrObjectId || c.object_id === clueIdOrObjectId) || null;
      if (found) {
        setSubmitFeedback(null);
        setActiveClue(found);
      }
    },
    []
  );

  const clues = roomData.clues || [];
  const cluesSolved = clues.filter((c) => c.solved).length;
  const totalClues = clues.length || 3;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#05070b] text-[#f3f1ec] select-none"
      data-testid="room6-vault"
    >
      {/* 3D WebGL Mount */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair"
        onClick={() => {
          if (!anyModalOpenRef.current) {
            audioRef.current?.start?.();
            audioRef.current?.ensureActive?.();
            engineRef.current?.lock?.();
          }
        }}
      />

      {/* Atmospheric Vault Vignette & Scanlines */}
      <div className={`vault-vig ${vaultRestored ? 'vault-vig-restored' : ''}`} />
      <div className="vault-scanlines" />
      {scanTear && <div className="vault-scan-tear" data-testid="vault-scan-tear" />}
      {nightmarePulse && <div className="fixed inset-0 z-30 pointer-events-none jumpscare-nightmare-fx" />}
      {visorCrack && <div className="vault-visor-crack" aria-hidden="true" />}

      {/* Resident Evil Atmospheric Loading Screen */}
      {isBootLoading && (
        <div
          className="fixed inset-0 z-50 bg-[#050608] flex flex-col justify-between p-6 sm:p-10 select-none cursor-pointer overflow-hidden"
          onClick={() => setIsBootLoading(false)}
          data-testid="vault-loading-screen"
        >
          <img
            src="/assets/textures/re-loading-bg.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-55 contrast-125 saturate-50 brightness-75 pointer-events-none"
          />
          <div className="absolute inset-0 bg-[#050608]/70 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-[#a39e93]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <span className="border-l-2 border-[#b91c1c] pl-2.5">SECTOR VI — ST. JUDE VAULT</span>
            <span>CONTAINMENT ARCHIVE</span>
          </div>

          <div className="relative z-10 max-w-2xl space-y-3 my-auto">
            <div
              className="text-xs uppercase tracking-[0.3em] text-[#c82828] font-semibold"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              CHAMBER VI — THE ANOINTING VAULT
            </div>
            <h1
              className="text-5xl sm:text-7xl font-bold uppercase tracking-[0.14em] text-[#ede8df]"
              style={{
                fontFamily: "'Oswald', 'Barlow Condensed', sans-serif",
                textShadow: '0 4px 18px rgba(0, 0, 0, 0.95)',
              }}
            >
              CURSE THE <span className="text-[#c82828]">CODE</span>
            </h1>
            <p
              className="text-xs sm:text-sm text-[#b4b0a8] max-w-lg leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Battery depleted. Keep your eyes on the shadows ahead—the vault remembers every step.
            </p>
          </div>

          <div className="relative z-10 space-y-2.5">
            <div className="w-full h-[3px] bg-[#1a1c22] rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#991b1b] via-[#dc2626] to-[#f87171] transition-all duration-200"
                style={{ width: `${Math.max(8, loadPct)}%` }}
              />
            </div>
            <div
              className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-[#848078]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <span>
                {loadPct >= 100
                  ? 'SANCTUARY ARCHITECTURE READY'
                  : `LOADING 3D GEOMETRY & CONDUITS (${loadPct}%)...`}
              </span>
              <span className={loadPct >= 100 ? 'text-[#e5dcc9] font-bold animate-pulse' : ''}>
                {loadPct >= 100 ? 'CLICK TO ENTER VAULT →' : 'PLEASE WAIT'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      <HUDVault
        team={team}
        clues={clues}
        cluesSolved={cluesSolved}
        totalClues={totalClues}
        activeHoverPrompt={activeHoverPrompt}
        isPointerLocked={isPointerLocked}
        sensitivity={mouseSensitivity}
        onChangeSensitivity={(next) => {
          const val = typeof next === 'number' ? next : 1.0;
          setMouseSensitivity(val);
          engineRef.current?.setSensitivity?.(val);
        }}
        muted={audioMuted}
        onToggleMute={() => {
          setAudioMuted((prev) => {
            const next = !prev;
            audioRef.current?.setMuted?.(next);
            return next;
          });
        }}
        qualityMode={qualityMode}
        onChangeQuality={() => {
          setQualityMode((prev) => {
            const order = ['low', 'med', 'high'];
            const cur = prev === 'eco' ? 'low' : prev === 'crisp' ? 'high' : order.includes(prev) ? prev : 'med';
            const next = order[(order.indexOf(cur) + 1) % order.length];
            try {
              localStorage.setItem('vault_quality', next);
            } catch {
              // ignore storage errors
            }
            engineRef.current?.setResolutionMode?.(next);
            showNotice(`Render Resolution: ${next.toUpperCase()} [R]`);
            return next;
          });
        }}
        onToggleDossier={() => setIsDossierOpen((v) => !v)}
        onToggleHint={() => setIsHintOpen((v) => !v)}
        onRequestLock={() => {
          if (anyModalOpenRef.current) return;
          if (engineRef.current?.isLocked?.()) {
            engineRef.current?.unlock?.();
          } else {
            audioRef.current?.start?.();
            audioRef.current?.ensureActive?.();
            engineRef.current?.lock?.();
          }
        }}
        onLogout={onLogout}
        discoveredDocsCount={discoveredDocIds.length}
        totalDocsCount={Object.keys(VAULT_DOCUMENTS).length}
        isSystemOpen={isSystemOpen}
        onToggleSystem={() => setIsSystemOpen((v) => !v)}
        getPlayerPos={() => engineRef.current?.getPos?.() || playerPos}
        threatState={threatState}
      />

      {/* Atmospheric / Status Notice Banner */}
      {notice && (
        <div
          role="status"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-xl px-5 py-2.5 rounded-[2px] border border-[#d4b896]/25 border-l-2 border-l-[#b91c1c] bg-[#090a0f]/88 text-xs sm:text-sm vault-font-serif tracking-wider text-[#f5f3ee] shadow-[0_12px_34px_rgba(0,0,0,0.78)] pointer-events-none text-center backdrop-blur-md"
        >
          {notice}
        </div>
      )}

      {/* Persistent Round 2 Clearance Bar (shown after Altar Seal when HUD is clear) */}
      {(vaultRestored || roomData.is_completed) &&
        !clearanceDismissed &&
        !notice &&
        !activeClue &&
        !activeDocumentId &&
        !isDossierOpen &&
        !isHintOpen && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-wrap items-center justify-center gap-2.5 px-4 py-2 rounded-[2px] border border-emerald-400/45 border-l-2 border-l-emerald-400 bg-[#09120e]/90 backdrop-blur-md shadow-[0_12px_34px_rgba(0,0,0,0.72)]">
            <span className="w-2 h-2 rotate-45 bg-emerald-400 shrink-0" />
            <span className="vault-font-mono text-[11px] font-bold tracking-[0.16em] uppercase text-emerald-200">
              {victoryData?.round_completed ? 'ROUND 2 CLEARED · CONTAINMENT COMPLETE' : 'TEST ROOM 6 SEALED · CONTAINMENT COMPLETE'}
            </span>
            <button
              type="button"
              onClick={() => handleSelectDossierClue('R2-10')}
              className="re-plate re-plate-emerald !py-1 !px-3 text-[10px] cursor-pointer"
            >
              Debrief
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="re-plate !py-1 !px-3 text-[10px] cursor-pointer"
              >
                Exit / Log Out
              </button>
            )}
            <button
              type="button"
              onClick={() => setClearanceDismissed(true)}
              aria-label="Dismiss round clearance banner"
              className="re-plate !py-1 !px-2 text-xs cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

      {/* Inline Feedback Toast when modal open */}
      {submitFeedback && activeClue && (
        <div
          role="alert"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-2 rounded-[2px] border border-l-2 font-mono text-xs ${
            submitFeedback.ok
              ? 'border-emerald-500/70 border-l-emerald-400 bg-[#091711]/95 text-emerald-200'
              : 'border-rose-500/70 border-l-rose-400 bg-[#1c090c]/95 text-rose-200'
          }`}
        >
          {submitFeedback.message}
        </div>
      )}

      {/* Clue Modals */}
      <ManualDiffModal
        isOpen={activeClue?.id === 'R2-08'}
        onClose={() => {
          setActiveClue(null);
          setSubmitFeedback(null);
          engineRef.current?.lock?.();
        }}
        clue={activeClue?.id === 'R2-08' ? activeClue : null}
        onSubmit={handleSubmitClue}
        isSubmitting={isSubmitting}
      />

      <FailsafeCircuitModal
        isOpen={activeClue?.id === 'R2-09'}
        onClose={() => {
          setActiveClue(null);
          setSubmitFeedback(null);
          engineRef.current?.lock?.();
        }}
        clue={activeClue?.id === 'R2-09' ? activeClue : null}
        onSubmit={handleSubmitClue}
        onSwitchClang={() => audioRef.current?.clang?.()}
        isSubmitting={isSubmitting}
      />

      <CentralConsoleModal
        isOpen={activeClue?.id === 'R2-10'}
        onClose={() => {
          setActiveClue(null);
          setSubmitFeedback(null);
          engineRef.current?.lock?.();
        }}
        clue={activeClue?.id === 'R2-10' ? activeClue : null}
        vaultClues={clues}
        onSubmit={handleSubmitClue}
        onOpenDossier={() => {
          setActiveClue(null);
          setIsDossierOpen(true);
        }}
        onKeystroke={() => audioRef.current?.keystroke?.()}
        onReject={handleConsoleReject}
        onVictory={handleVictory}
        onLogout={onLogout}
        isSubmitting={isSubmitting}
      />

      {/* Inspection Manuscript / Document Modal */}
      {activeDocumentId && (
        <VaultDocumentModal
          documentId={activeDocumentId}
          discoveredIds={discoveredDocIds}
          onSelectDocument={(id) => {
            markDocDiscovered(id);
            setActiveDocumentId(id);
          }}
          onClose={() => {
            setActiveDocumentId(null);
            engineRef.current?.lock?.();
          }}
        />
      )}

      {/* [C] Case Dossier */}
      <VaultDossierModal
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false);
          engineRef.current?.lock?.();
        }}
        vaultClues={clues}
        onSelectClue={handleSelectDossierClue}
        discoveredDocIds={discoveredDocIds}
        documents={VAULT_DOCUMENTS}
        onOpenDocument={(docId) => {
          setIsDossierOpen(false);
          setActiveDocumentId(docId);
        }}
      />

      {/* [H] Shared Hint Modal */}
      <HintModal
        isOpen={isHintOpen}
        onClose={() => {
          setIsHintOpen(false);
          engineRef.current?.lock?.();
        }}
        roomId="vault"
        roomTitle={roomData.title}
      />
    </div>
  );
}

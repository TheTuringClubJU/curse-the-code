import * as THREE from 'three';

// Choreographed, Telegraphed Horror Director for Room 6: The Anointing Vault
// Game-dev polish pass: multi-stage builds, FOV-kick curves, crimson vignette blooms,
// environmental echo loops, staggered whisper builds, and camera-tilt trauma effects.

export function createVaultScares(E, h = {}) {
  const fired = new Set();
  const timers = [];
  let elapsed = 0;
  let leftNarthex = false;
  let visitedSideWing = false;

  let scriptedBusyUntil = 0;
  let pendingStatueTurn = false;
  let pendingWestBreach = false;
  let pendingEastBlackout = false;

  // ── Poppy Playtime camera-locked in-your-face jumpscare state ──
  let faceJumpscare = null;

  // ── Lunge animation state ──
  let lungeT = -1;
  let lungeEntity = null;
  let lungeStartDist = 3.8;
  let lungeEndDist = 1.65;
  let lungeDuration = 0.44;
  const baseFov = E.cam?.fov || 72;

  // ── Trauma / camera shake accumulator ──
  let traumaAcc = 0;        // 0..1 decaying trauma
  let traumaDecayRate = 2.4;

  // ── Persistent dread ambient whisper cadence ──
  let whisperCooldown = 0;
  const WHISPER_MIN_INTERVAL = 14.0;

  // ── Atmospheric light flicker state ──
  let flickerActive = false;
  let flickerTimer = null;

  const schedule = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  };

  const setThreat = (phase, label = '') => {
    h.onThreatState?.(phase ? { phase, label } : null);
  };

  const getPlayerPose = () => {
    const px = E.px?.() ?? 0;
    const pz = E.pz?.() ?? 13.8;
    const yaw = E.yaw?.() ?? E.cam?.rotation?.y ?? 0;
    return { px, pz, yaw, fx: -Math.sin(yaw), fz: -Math.cos(yaw) };
  };

  const clampNaveSpot = (x, z) => [
    Math.max(-15.6, Math.min(15.6, x)),
    Math.max(-8.8, Math.min(14.8, z)),
  ];

  const lookingAt = (tx, tz, minDot = 0.65) => {
    const { px, pz, fx, fz } = getPlayerPose();
    const dx = tx - px;
    const dz = tz - pz;
    const len = Math.hypot(dx, dz) || 1;
    return (dx / len) * fx + (dz / len) * fz >= minDot;
  };

  const placeEntity = (entity, x, z, faceX, faceZ, lightIntensity = 2.6, tiltZ = 0) => {
    if (!entity) return;
    entity.position.set(x, 0, z);
    const dx = faceX - x;
    const dz = faceZ - z;
    entity.rotation.y = Math.atan2(dx, dz);
    entity.rotation.z = tiltZ;
    entity.visible = true;
    if (E.ref.ghostLight) {
      const dist = Math.hypot(dx, dz) || 1;
      const nx = dx / dist;
      const nz = dz / dist;
      const frontOffset = Math.min(0.85, dist * 0.4);
      const sideOffset = 0.65;
      E.ref.ghostLight.position.set(
        x + nx * frontOffset - nz * sideOffset,
        1.38,
        z + nz * frontOffset + nx * sideOffset
      );
      E.ref.ghostLight.color.setHex(0xe0583c);
      E.ref.ghostLight.intensity = Math.min(3.4, Math.max(2.1, lightIntensity));
    }
  };

  const placeGhost = (x, z, faceX, faceZ, lightIntensity = 3.6, tiltZ = 0) =>
    placeEntity(E.ref.ghost, x, z, faceX, faceZ, lightIntensity, tiltZ);

  const placeStalker = (x, z, faceX, faceZ, lightIntensity = 3.8, tiltZ = 0) =>
    placeEntity(E.ref.stalker || E.ref.ghost, x, z, faceX, faceZ, lightIntensity, tiltZ);

  const hideGhost = () => {
    [E.ref.ghost, E.ref.stalker].forEach((entity) => {
      if (entity) {
        entity.visible = false;
        entity.rotation.z = 0;
      }
    });
    if (E.ref.ghostLight) E.ref.ghostLight.intensity = 0;
  };

  const playAgathaAnim = (animIndex = 0, speed = 1.0) => {
    if (!E.ref?.agathaMixer || !E.ref?.agathaActions) return;
    try {
      E.ref.agathaMixer.stopAllAction();
      const act = E.ref.agathaActions[animIndex] || E.ref.agathaActions[0];
      if (act) {
        act.reset();
        act.setLoop(1, 1);
        act.clampWhenFinished = true;
        act.timeScale = speed;
        act.play();
      }
    } catch (_) { }
  };

  const setGlobalLightScale = (val) => {
    if (E.sc) E.sc.v = val;
  };

  // ── Smooth light ramp helper (eases light to target over durationMs) ──
  const rampLight = (from, to, durationMs, stepMs = 40) => {
    const steps = Math.max(2, Math.round(durationMs / stepMs));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out
      const val = from + (to - from) * ease;
      schedule(() => setGlobalLightScale(val), i * stepMs);
    }
  };

  // ── Rapid staccato light flicker (3–6 pulses, irregular cadence) ──
  const triggerFlicker = (onScale = 0.08, offScale = 0.9, pulses = 5, basePulseMs = 60) => {
    if (flickerActive) return;
    flickerActive = true;
    let t = 0;
    for (let i = 0; i < pulses * 2; i++) {
      const jitter = basePulseMs * (0.6 + Math.random() * 0.9);
      t += jitter;
      const val = i % 2 === 0 ? onScale : offScale;
      schedule(() => { if (!E.ref.vaultRestored) setGlobalLightScale(val); }, t);
    }
    schedule(() => { flickerActive = false; }, t + 80);
  };

  // ── Add trauma so the tick system shakes the camera organically ──
  const addTrauma = (amount) => {
    traumaAcc = Math.min(1.0, traumaAcc + amount);
  };

  // ── Full-featured jumpscare camera-kick: FOV surge + tilt + recovery ──
  const kickCamera = (fovDelta = -18, tiltRad = 0.04, durationMs = 650) => {
    if (!E.cam?.isPerspectiveCamera) return;
    const targetFov = baseFov + fovDelta;
    schedule(() => {
      if (E.cam) {
        E.cam.fov = targetFov;
        if (E.cam.rotation) E.cam.rotation.z = (Math.random() < 0.5 ? -1 : 1) * tiltRad;
        E.cam.updateProjectionMatrix?.();
      }
    }, 0);
    // Smooth recovery
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      schedule(() => {
        if (E.cam?.isPerspectiveCamera) {
          E.cam.fov = targetFov + (baseFov - targetFov) * ease;
          if (E.cam.rotation) E.cam.rotation.z *= (1 - ease);
          E.cam.updateProjectionMatrix?.();
        }
      }, (durationMs * p));
    }
  };

  // ── Color-graded crimson vignette flash (more immersive than a plain overlay) ──
  const flashBlood = (hexColor = '#6e000d', opacity = 0.6, durationMs = 280) => {
    h.onFlash?.(hexColor, opacity, durationMs);
    h.onNightmarePulse?.(Math.round(durationMs * 1.4));
  };

  // ═══════════════════════════════════════════════════════════════════
  // POPPY PLAYTIME / FNAF IN-YOUR-FACE JUMPSCARE ENGINE
  // Locks directly to the camera viewport lens at 0.42m point-blank,
  // fills 95%+ of the screen with Agatha's screaming face and thrashing
  // claws, shakes violently with per-frame head tremors and jaw spasms,
  // casts blood-red spotlight, punches FOV, and blasts horrific audio.
  // ═══════════════════════════════════════════════════════════════════
  const startFaceJumpscare = ({
    duration = 1.35,
    animIndex = 0,
    animSpeed = 1.65,
    initialDist = 3.0,
    faceDist = 0.42,
    headOffset = 1.58,
    screamVol = 1.0,
    scareId = 'face_jumpscare',
    scareNotice = null,
    preferStalker = false,
  } = {}) => {
    if (E.ref.vaultRestored) return;

    // 1. Overwhelming, ear-splitting layered horror audio blast
    E.audio?.playHorrificJumpscare?.(screamVol);
    E.audio?.setTension?.(2.8);

    // 2. Select entity (Agatha or stalker)
    const entity = (preferStalker && E.ref.stalker) || E.ref.ghost || E.ref.stalker;
    if (!entity) return;

    // 3. Play rapid frantically screaming animation
    playAgathaAnim(animIndex, animSpeed);
    entity.visible = true;

    // 4. Set face jumpscare state
    faceJumpscare = {
      elapsed: 0,
      duration,
      initialDist,
      faceDist,
      headOffset,
      entity,
      animIndex,
    };

    // 5. Massive camera trauma shake + blood vignette + visor crack
    E.shake?.(3.6, 0.95);
    addTrauma(1.0);
    h.onGlassCrack?.();
    h.onFlash?.('#80000e', 0.88, 380);
    h.onNightmarePulse?.(Math.round(duration * 1000));
    if (scareNotice) {
      h.onScare?.(scareId, scareNotice);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // PHANTOM LUNGE — The core apex scare. 3-beat build: environment
  // goes ice-cold, dim flicker telegraphs, then she EXPLODES into your face.
  // ═══════════════════════════════════════════════════════════════════
  const triggerPhantomLunge = (reasonMsg = null, preferStalker = false) => {
    if (E.ref.vaultRestored) return;
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.8);
    setThreat(null, '');

    // Beat 1 — sudden silence + cold flicker at 0ms
    setGlobalLightScale(0.14);
    E.audio?.playBreathScared?.(0.72);
    h.onFlash?.('#1a000a', 0.28, 180);

    // Beat 2 — a whisper-close breath at 220ms
    schedule(() => {
      if (E.ref.vaultRestored) return;
      E.audio?.whisper?.();
      setGlobalLightScale(0.04);
    }, 220);

    // Beat 3 — Poppy Playtime face jumpscare erupts at 320ms
    schedule(() => {
      if (E.ref.vaultRestored) return;
      startFaceJumpscare({
        duration: 1.4,
        animIndex: 3,
        animSpeed: 1.7,
        initialDist: 3.2,
        faceDist: 0.42,
        scareId: 'phantom_lunge',
        scareNotice: reasonMsg,
        preferStalker,
      });
    }, 320);
  };

  // ═══════════════════════════════════════════════════════════════════
  // CORE GLASS SLAM — Inspection milestone. Agatha erupts OUT of the
  // reliquary glass directly onto your face!
  // ═══════════════════════════════════════════════════════════════════
  const triggerCoreGlassScare = () => {
    if (fired.has('core_glass_slam')) return false;
    fired.add('core_glass_slam');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 5.2);
    setThreat('surge', 'RELIQUARY SEAL FRACTURING');

    // Beat 1 — distant rumble, lights die to almost nothing
    E.audio?.chainsRattle?.();
    rampLight(0.9, 0.08, 480);

    schedule(() => {
      if (E.ref.vaultRestored) return;

      // Beat 2 — single heartbeat thud, dead silence
      E.audio?.heartbeat?.();
      setGlobalLightScale(0.02);

      schedule(() => {
        if (E.ref.vaultRestored) return;

        startFaceJumpscare({
          duration: 1.45,
          animIndex: 1,
          animSpeed: 1.65,
          initialDist: 2.6,
          faceDist: 0.40,
          scareId: 'core_glass_slam',
          scareNotice: 'Agatha erupts from within the broken reliquary!',
        });

        if (E.ref.coreLight) E.ref.coreLight.intensity = 16.0;

        // Beat 4 — aftermath: lights strobe back up, blood-red tint lingers
        [280, 520, 760].forEach((ms) => {
          schedule(() => {
            if (E.ref.vaultRestored) return;
            h.onFlash?.('#5c000a', 0.26, 130);
          }, ms);
        });

        schedule(() => {
          rampLight(0.0, 1.0, 600);
          setThreat(null, '');
          if (E.ref.coreLight) E.ref.coreLight.intensity = 1.4;
        }, 1600);

        schedule(() => {
          E.audio?.setTension?.(1.2);
        }, 3200);
      }, 420);
    }, 460);

    return true;
  };

  // ═══════════════════════════════════════════════════════════════════
  // SANCTUARY STARTING DOOR REVEAL — As the grand castle doors swing open,
  // Agatha's tall silhouette stands in the distance of the candlelit nave,
  // head twitching, staring right back through the opening doors.
  // ═══════════════════════════════════════════════════════════════════
  const triggerSanctuaryRevealTease = () => {
    if (fired.has('sanctuary_reveal_tease') || E.ref.vaultRestored) return;
    fired.add('sanctuary_reveal_tease');

    // Deep sub-bass swell and eerie string stinger
    E.audio?.playTensionStab?.(0.75);
    E.audio?.setTension?.(1.6);
    h.onFlash?.('#2a0006', 0.35, 200);

    // Right as the doors swing open wide enough to see down the nave (420ms):
    schedule(() => {
      if (E.ref.vaultRestored) return;
      // Manifest Agatha down the nave center aisle (z = 2.4, x = 0)
      placeGhost(0, 2.4, 0, 7.48, 3.4, 0.04);
      playAgathaAnim(0, 0.75); // eerie slow twitching posture facing the doorway
      setGlobalLightScale(0.3);

      kickCamera(-6, 0.04, 700);
      addTrauma(0.5);
      h.onScare?.('sanctuary_reveal_tease', 'Something watches from the depths of the nave…');

      // After 850ms, she jerks violently and vanishes into the gloom between the pews
      schedule(() => {
        hideGhost();
        setGlobalLightScale(1.0);
        E.audio?.playBreathScared?.(0.72);
      }, 850);
    }, 420);
  };

  E.ref.onStartingDoorOpen = triggerSanctuaryRevealTease;

  // ═══════════════════════════════════════════════════════════════════
  // NAVE AISLE AMBUSH — She bursts from the pews as you walk the aisle.
  // Extended 3-beat: creak→silence→IN-YOUR-FACE Poppy Playtime eruption!
  // ═══════════════════════════════════════════════════════════════════
  const triggerNaveAisleScare = () => {
    if (fired.has('nave_pew_ambush') || E.ref.vaultRestored) return;
    fired.add('nave_pew_ambush');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.8);
    setThreat('surge', 'SANCTUARY BREACH // AGATHA AWAKENS');

    // Beat 1 — single pew creak; freeze the music
    E.audio?.creak?.();
    rampLight(0.9, 0.16, 320);

    schedule(() => {
      if (E.ref.vaultRestored) return;

      // Beat 2 — bonecrack, lights snuff
      E.audio?.playBonecrack?.(0.98);
      setGlobalLightScale(0.02);

      schedule(() => {
        if (E.ref.vaultRestored) return;

        // Beat 3 — burst into player's face with Poppy Playtime jumpscare!
        startFaceJumpscare({
          duration: 1.4,
          animIndex: 0,
          animSpeed: 1.65,
          initialDist: 2.8,
          faceDist: 0.42,
          scareId: 'nave_pew_ambush',
          scareNotice: 'A ghastly Victorian form tears through the pews!',
        });

        // Staggered blood-flash aftershocks
        [320, 620].forEach((ms) => {
          schedule(() => { h.onFlash?.('#4c0008', 0.24, 120); }, ms);
        });

        schedule(() => {
          rampLight(0.0, 1.0, 500);
          setThreat(null, '');
        }, 1500);
      }, 260);
    }, 300);
  };

  // ═══════════════════════════════════════════════════════════════════
  // ENTRY CELL VANISH — Looking into Cell 01: crying stops dead,
  // chains rattle, then she SLAMS the bars and rushes into your face!
  // ═══════════════════════════════════════════════════════════════════
  const triggerEntryCellVanish = () => {
    if (fired.has('entry_cell_peek') || E.ref.vaultRestored) return;
    fired.add('entry_cell_peek');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 5.0);
    setThreat('warning', 'CELL 01 // RESTRAINTS SHIFTING');

    // Beat 1 — crying cuts out instantly, silence
    E.audio?.stopWomanCrying?.();
    E.audio?.playBreathScared?.(0.78);

    schedule(() => {
      if (E.ref.vaultRestored) return;

      // Beat 2 — chains rattle & single lamp flicker
      E.audio?.chainsRattle?.();
      E.shake?.(0.65, 0.4);
      triggerFlicker(0.10, 0.85, 4, 55);

      schedule(() => {
        if (E.ref.vaultRestored) return;

        const prevCellIntensity = E.ref.cellLight?.intensity ?? 1.3;
        if (E.ref.cellLight) E.ref.cellLight.intensity = 14.0;

        // Beat 3 — she smashes the bars and surges into your face!
        startFaceJumpscare({
          duration: 1.35,
          animIndex: 2,
          animSpeed: 1.6,
          initialDist: 2.2,
          faceDist: 0.42,
          scareId: 'entry_cell_peek',
          scareNotice: 'She slams against the bars from within!',
        });

        // Cell light strobe — 5 rapid flickers
        [130, 290, 480, 660, 850].forEach((ms, i) => {
          schedule(() => {
            if (E.ref.vaultRestored) return;
            if (E.ref.cellLight) E.ref.cellLight.intensity = i % 2 === 0 ? 0.2 : 12.0;
          }, ms);
        });

        schedule(() => {
          if (E.ref.cellLight) E.ref.cellLight.intensity = prevCellIntensity;
          setThreat(null, '');
        }, 1500);
      }, 540);
    }, 320);
  };

  // ═══════════════════════════════════════════════════════════════════
  // EAST BAY PEEK — Voltage surge telegraphs the Stalker who
  // materialises in the doorway across 6E — distant, watching, still.
  // ═══════════════════════════════════════════════════════════════════
  const triggerEastBayPeek = () => {
    if (fired.has('east_stalker_flicker') || E.ref.vaultRestored) return;
    fired.add('east_stalker_flicker');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 5.0);
    setThreat('warning', '6D EAST BAY // ANOMALOUS CURRENT');

    // Beat 1 — voltage crackle + lamp agitation
    E.ref.eastLampAgitated = true;
    E.audio?.voltageBuzz?.();
    E.shake?.(0.6, 0.35);

    // Beat 2 — irregular flicker sequence mimicking electrical fault
    const flickerSeq = [0, 160, 310, 500, 720, 1020, 1380];
    flickerSeq.forEach((ms, i) => {
      schedule(() => {
        if (E.ref.vaultRestored) return;
        setGlobalLightScale(i % 2 === 0 ? 0.12 : 0.88);
      }, ms);
    });

    // Beat 3 — she's THERE in the doorway. No screaming. Just staring.
    schedule(() => {
      if (E.ref.vaultRestored) return;
      const { px, pz } = getPlayerPose();
      placeStalker(12.9, 5.65, px, pz, 4.6, -0.07);
      E.audio?.playBreathScared?.(0.68);
      h.onScare?.('east_stalker_flicker', 'Something watches from the eastern doorway…');
    }, 1100);

    // Beat 4 — snap reveal strobe then she vanishes
    schedule(() => {
      setGlobalLightScale(1.0);
      E.audio?.playStab?.(0.78);
      h.onFlash?.('#540008', 0.34, 160);

      schedule(() => {
        hideGhost();
        E.ref.eastLampAgitated = false;
        setThreat(null, '');
      }, 480);
    }, 1900);
  };

  // ═══════════════════════════════════════════════════════════════════
  // WEST CRYPT CHILL — The Seraph statue rotates in the dark.
  // A cold temperature drop + sub-bass moan precedes the stone scrape.
  // ═══════════════════════════════════════════════════════════════════
  const triggerWestCryptChill = () => {
    if (fired.has('west_crypt_chill') || E.ref.vaultRestored) return;
    fired.add('west_crypt_chill');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.8);

    // Beat 1 — breath + deep chill drop
    E.audio?.playBreathScared?.(0.78);
    rampLight(0.9, 0.06, 420);

    schedule(() => {
      if (E.ref.vaultRestored) return;

      // Beat 2 — statue rotates with stone grind
      E.audio?.statueScrape?.();
      E.shake?.(0.55, 0.35);
      if (E.ref.westStatue) E.ref.westStatue.rotation.y += Math.PI;
      h.onFlash?.('#1a0004', 0.24, 200);
      h.onScare?.('west_crypt_chill', 'The Seraph has turned its face toward you.');

      // Beat 3 — lights recover slowly, unsettling
      schedule(() => { rampLight(0.06, 1.0, 900); }, 320);
    }, 440);
  };

  // ═══════════════════════════════════════════════════════════════════
  // WEST SEAL VENGEANCE — Seal I breaks; Agatha stalks the corridor.
  // 4-beat: chains → phantom steps → manifest → surge.
  // ═══════════════════════════════════════════════════════════════════
  const triggerWestSealVengeance = () => {
    if (fired.has('west_seal_vengeance') || E.ref.vaultRestored) return;
    fired.add('west_seal_vengeance');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 5.5);
    setThreat('warning', 'SEAL I BROKEN // SOMETHING IN THE WEST ARCH');

    // Beat 1 — distant chains + cold dip
    E.audio?.chainsRattle?.();
    rampLight(0.9, 0.28, 600);

    // Beat 2 — slow phantom footsteps approaching
    schedule(() => {
      if (E.ref.vaultRestored) return;
      E.audio?.phantomSteps?.();
    }, 500);

    // Beat 3 — she manifests in the West arch (~6-7m away)
    schedule(() => {
      if (E.ref.vaultRestored || E.isModalOpen?.()) {
        rampLight(0.28, 1.0, 400);
        setThreat(null, '');
        return;
      }
      const { px, pz } = getPlayerPose();
      placeGhost(-8.1, 0, px, pz, 4.0, 0.07);
      playAgathaAnim(2, 1.25);
      E.audio?.playBreathScared?.(0.82);
      setGlobalLightScale(0.14);
      h.onFlash?.('#3e0008', 0.32, 200);
    }, 1200);

    // Beat 4 — she surges with a scream 600ms later
    schedule(() => {
      if (E.ref.vaultRestored) {
        hideGhost(); rampLight(0.14, 1.0, 400); setThreat(null, ''); return;
      }
      E.audio?.playAgathaScream?.(0.94);
      E.shake?.(1.0, 0.48);
      addTrauma(0.6);
      kickCamera(-12, 0.04, 550);
      h.onFlash?.('#5e000a', 0.52, 240);
      h.onScare?.('west_seal_vengeance', 'Seal I fractured — Agatha stalks the West corridor!');

      schedule(() => {
        hideGhost();
        rampLight(0.14, 1.0, 700);
        setThreat(null, '');
      }, 2000);
    }, 1800);
  };

  // ═══════════════════════════════════════════════════════════════════
  // BLACKOUT AMBUSH — Breaker overload. Total darkness. Footsteps
  // close in. Then she erupts from the dark — Alien: Isolation style.
  // ═══════════════════════════════════════════════════════════════════
  const triggerBlackoutAmbush = () => {
    if (fired.has('blackout_ambush') || E.ref.vaultRestored) return;
    fired.add('blackout_ambush');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 5.5);
    setThreat('surge', 'BREAKER OVERLOAD // DEAD DARK');

    // Beat 1 — power-down whine + instant blackout
    E.audio?.powerOut?.();
    E.audio?.voltageBuzz?.();
    setGlobalLightScale(0.02);
    h.onScare?.('blackout_ambush', 'RELAY OVERLOAD — ALL LIGHTS OUT');

    // Beat 2 — footsteps in the dark, getting closer
    schedule(() => {
      if (!E.ref.vaultRestored) {
        E.audio?.phantomSteps?.();
        E.audio?.playBreathScared?.(0.88);
        E.audio?.setTension?.(2.4);
      }
    }, 460);

    // Beat 3 — a second set of steps even closer
    schedule(() => {
      if (!E.ref.vaultRestored) E.audio?.phantomSteps?.();
    }, 1050);

    // Beat 4 — partial light recovery: just enough to see her silhouette
    schedule(() => {
      if (E.ref.vaultRestored) {
        setGlobalLightScale(1.0);
        setThreat(null, '');
        return;
      }
      setGlobalLightScale(0.22);
      const { px, pz } = getPlayerPose();
      placeGhost(8.1, 0, px, pz, 4.8, -0.06);
      playAgathaAnim(0, 1.3);
      E.audio?.playBreathScared?.(0.72);
    }, 1600);

    // Beat 5 — FULL POPPY PLAYTIME FACE JUMPSCARE 500ms after partial reveal
    schedule(() => {
      if (E.ref.vaultRestored) {
        hideGhost(); setGlobalLightScale(1.0); setThreat(null, ''); return;
      }
      startFaceJumpscare({
        duration: 1.4,
        animIndex: 0,
        animSpeed: 1.7,
        initialDist: 2.8,
        faceDist: 0.42,
        scareId: 'blackout_ambush',
        scareNotice: 'RELAY OVERLOAD — SHE STRIKES IN THE DARK',
      });

      schedule(() => {
        rampLight(0.0, 1.0, 800);
        setThreat(null, '');
        if (!E.ref.vaultRestored) E.audio?.setTension?.(1.2);
      }, 1600);
    }, 2100);
  };

  // ═══════════════════════════════════════════════════════════════════
  // CHAPEL RELIQUARY — Optional 6F wing. Crow shriek + distant
  // laughter + cold ghost silhouette in peripheral vision.
  // ═══════════════════════════════════════════════════════════════════
  const triggerChapelReliquaryScare = () => {
    if (fired.has('chapel_reliquary') || E.ref.vaultRestored) return;
    fired.add('chapel_reliquary');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.8);
    setThreat('warning', '6F CHAPEL // COLD DRAFT DETECTED');

    E.audio?.playCrows?.(0.42);
    rampLight(0.9, 0.18, 300);

    schedule(() => {
      if (E.ref.vaultRestored) return;
      E.audio?.playEvilLaugh?.(0.38);
      E.audio?.playBreathScared?.(0.68);
      const { px, pz } = getPlayerPose();
      placeGhost(-13.3, -9.2, px, pz, 2.8, -0.07);
      E.shake?.(0.8, 0.35);
      h.onFlash?.('#540008', 0.38, 190);
      h.onScare?.('chapel_reliquary', 'Laughter echoes through the reliquary chapel…');

      schedule(() => {
        hideGhost();
        rampLight(0.18, 1.0, 600);
        setThreat(null, '');
      }, 1550);
    }, 320);
  };

  // ═══════════════════════════════════════════════════════════════════
  // CELLAR TRAP — Optional 6E shackle room. Bone-crack + monster
  // growl + chains. Ghost in the corner at close range.
  // ═══════════════════════════════════════════════════════════════════
  const triggerCellarTrapScare = () => {
    if (fired.has('cellar_ambush') || E.ref.vaultRestored) return;
    fired.add('cellar_ambush');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.0);
    setThreat('warning', '6E CELLAR // SHACKLES MOVING');

    // Beat 1 — shackle rattle
    E.audio?.chainsRattle?.();
    rampLight(0.9, 0.12, 280);

    schedule(() => {
      if (E.ref.vaultRestored) return;

      // Beat 2 — bonecrack + monster sound
      E.audio?.playBonecrack?.(0.95);
      E.audio?.playMonster?.(0.88);
      E.shake?.(0.7, 0.4);

      schedule(() => {
        if (E.ref.vaultRestored) return;
        const { px, pz } = getPlayerPose();

        // Beat 3 — she's in the corner, contorted
        placeGhost(12.9, 10.25, px, pz, 5.0, -0.11);
        playAgathaAnim(1, 1.3);
        E.shake?.(1.3, 0.52);
        addTrauma(0.65);
        kickCamera(-11, 0.04, 500);
        h.onFlash?.('#60000b', 0.56, 220);
        h.onNightmarePulse?.(420);
        h.onScare?.('cellar_ambush', 'The shackles are empty. Something else is here.');

        schedule(() => {
          hideGhost();
          rampLight(0.12, 1.0, 700);
          setThreat(null, '');
        }, 1100);
      }, 320);
    }, 300);
  };

  const triggerConsoleReject = () => {
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.2);
    setThreat('surge', 'CONTAINMENT REJECTED // CRITICAL BREACH');
    setGlobalLightScale(0.04);
    E.audio?.voltageBuzz?.();
    h.onFlash?.('#4e0008', 0.45, 180);

    schedule(() => {
      if (E.ref.vaultRestored) return;
      startFaceJumpscare({
        duration: 1.45,
        animIndex: 3,
        animSpeed: 1.7,
        initialDist: 2.8,
        faceDist: 0.40,
        scareId: 'console_reject',
        scareNotice: 'CONTAINMENT REJECTED — SHE IS FREE',
      });
      E.audio?.setTension?.(2.8);
      schedule(() => {
        if (!E.ref.vaultRestored) E.audio?.setTension?.(1.2);
      }, 3600);
    }, 240);
  };

  // ═══════════════════════════════════════════════════════════════════
  // TICK — per-frame update: Poppy Playtime face jumpscare,
  // trauma decay, organic whisper cadence, and all zone trigger checks.
  // ═══════════════════════════════════════════════════════════════════
  const tick = (dt) => {
    // ── Poppy Playtime Camera-Locked In-Your-Face Jumpscare Update ──
    if (faceJumpscare) {
      faceJumpscare.elapsed += dt;
      const { elapsed: fElapsed, duration: fDur, initialDist, faceDist, headOffset, entity } = faceJumpscare;

      if (fElapsed >= fDur) {
        faceJumpscare = null;
        hideGhost();
        setGlobalLightScale(1.0);
        if (E.cam?.isPerspectiveCamera && E.cam.fov !== baseFov) {
          E.cam.fov = baseFov;
          E.cam.updateProjectionMatrix?.();
        }
      } else {
        // Explosive surge in first 0.16s down to 0.42m point-blank
        const surgeK = Math.min(1.0, fElapsed / 0.16);
        const easeSurge = 1 - Math.pow(1 - surgeK, 4);
        const curDist = initialDist - (initialDist - faceDist) * easeSurge;

        // Violent Poppy Playtime jitter (lateral tremor, jaw vibration, violent head twitches)
        const jitIntensity = fElapsed < 0.16 ? 0.025 : 0.052;
        const jitX = (Math.random() - 0.5) * jitIntensity * 2;
        const jitY = (Math.random() - 0.5) * jitIntensity * 1.5;
        const jitRotZ = (Math.random() - 0.5) * 0.18;

        if (E.cam) {
          const camPos = E.cam.position?.clone ? E.cam.position.clone() : new THREE.Vector3(E.px?.() ?? 0, 1.6, E.pz?.() ?? 0);
          const camDir = new THREE.Vector3();
          if (E.cam.getWorldDirection) {
            E.cam.getWorldDirection(camDir);
          } else {
            const yaw = E.yaw?.() ?? 0;
            camDir.set(-Math.sin(yaw), 0, -Math.cos(yaw));
          }
          camDir.normalize();

          const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(E.cam.quaternion || new THREE.Quaternion()).normalize();
          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(E.cam.quaternion || new THREE.Quaternion()).normalize();

          const agathaPos = camPos.clone()
            .addScaledVector(camDir, curDist)
            .addScaledVector(camRight, jitX)
            .addScaledVector(camUp, -headOffset + jitY);

          entity.position.copy(agathaPos);

          const dx = camPos.x - agathaPos.x;
          const dz = camPos.z - agathaPos.z;
          entity.rotation.y = Math.atan2(dx, dz);
          if (E.cam.rotation) {
            entity.rotation.x = -E.cam.rotation.x;
          }
          entity.rotation.z = jitRotZ;
          entity.visible = true;

          // Piercing crimson face spotlight right on Agatha's screaming jaws
          if (E.ref.ghostLight) {
            E.ref.ghostLight.position.copy(camPos).addScaledVector(camDir, curDist * 0.5);
            E.ref.ghostLight.position.y = camPos.y;
            E.ref.ghostLight.color.setHex(0xff1212);
            E.ref.ghostLight.intensity = 16.0;
            E.ref.ghostLight.distance = 5.0;
          }

          // Camera FOV punch: zoom in hard from 72 down to 44
          if (E.cam.isPerspectiveCamera) {
            const fovProg = Math.sin(Math.min(1.0, fElapsed / fDur) * Math.PI);
            E.cam.fov = baseFov - 28 * Math.pow(fovProg, 0.4);
            E.cam.updateProjectionMatrix?.();
          }
        }
      }
    }

    // ── Lunge animation fallback (if any external system sets lungeT) ──
    if (lungeT >= 0) {
      lungeT += dt;
      const rawK = Math.min(1, lungeT / lungeDuration);
      const k = 1 - Math.pow(1 - rawK, 4);
      const { px, pz, fx, fz } = getPlayerPose();
      const dist = lungeStartDist - (lungeStartDist - lungeEndDist) * k;
      const [gx, gz] = clampNaveSpot(px + fx * dist, pz + fz * dist);
      placeEntity(lungeEntity || E.ref.ghost, gx, gz, px, pz, 2.6, lungeEntity?.rotation?.z || 0);

      if (E.cam?.isPerspectiveCamera) {
        const fovK = Math.sin(Math.min(1, lungeT / (lungeDuration * 1.4)) * Math.PI);
        E.cam.fov = baseFov - 20 * fovK;
        E.cam.updateProjectionMatrix?.();
      }

      if (lungeT >= lungeDuration + 0.26) {
        lungeT = -1;
        lungeEntity = null;
        hideGhost();
        setGlobalLightScale(1.0);
        if (E.cam?.isPerspectiveCamera && E.cam.fov !== baseFov) {
          E.cam.fov = baseFov;
          E.cam.updateProjectionMatrix?.();
        }
      }
    }

    // ── Trauma decay: organic micro-shake ──
    if (traumaAcc > 0.005) {
      traumaAcc = Math.max(0, traumaAcc - traumaDecayRate * dt);
      // Inject a small shake derived from trauma so it feels physically grounded
      if (traumaAcc > 0.08 && E.shake) {
        const traumaShake = traumaAcc * traumaAcc * 0.9; // squared for non-linear feel
        E.shake?.(traumaShake, 0.08);
      }
    }

    if (E.isModalOpen?.()) return;

    elapsed += dt;
    whisperCooldown = Math.max(0, whisperCooldown - dt);

    if (E.ref.vaultRestored) {
      hideGhost();
      setThreat(null, '');
      E.audio?.stopMachineLoop?.();
      E.ref._lightsOverridden = false;
      setGlobalLightScale(1.0);
      if (E.cam?.isPerspectiveCamera && E.cam.fov !== baseFov) {
        E.cam.fov = baseFov;
        E.cam.updateProjectionMatrix?.();
      }
      return;
    }

    // ── Fire post-puzzle scares after modal exit ──
    if (pendingWestBreach && elapsed >= scriptedBusyUntil) {
      pendingWestBreach = false;
      triggerWestSealVengeance();
    }
    if (pendingEastBlackout && elapsed >= scriptedBusyUntil) {
      pendingEastBlackout = false;
      triggerBlackoutAmbush();
    }

    const { px, pz, fx, fz } = getPlayerPose();
    if (pz < 7.6) leftNarthex = true;

    // ── Passive ambient dread: random whispers in long silences ──
    if (
      whisperCooldown <= 0 &&
      elapsed > 12.0 &&
      !fired.has('entry_cell_peek') &&
      elapsed < scriptedBusyUntil + 2.0 === false &&
      Math.random() < 0.012 // ~1.2% per frame at 60fps ≈ every ~15s
    ) {
      whisperCooldown = WHISPER_MIN_INTERVAL + Math.random() * 8.0;
      E.audio?.whisper?.();
      // Very faint light dip
      setGlobalLightScale(0.72);
      schedule(() => setGlobalLightScale(1.0), 420);
    }

    // ── 6C Seraph Statue silent turn when you look away ──
    if (pendingStatueTurn && E.ref.westStatue && !lookingAt(-11.8, -3.6, -0.34)) {
      pendingStatueTurn = false;
      E.ref.westStatue.rotation.y += Math.PI;
      E.audio?.statueScrape?.();
      // Brief light dip when the statue turns
      setGlobalLightScale(0.55);
      schedule(() => setGlobalLightScale(1.0), 480);
    }

    // ── Beat 1: Sobbing ambience on entering Narthex ──
    if (!fired.has('cell_sobbing') && pz > 9.0 && pz < 15.5 && px < 1.0) {
      fired.add('cell_sobbing');
      E.audio?.playWomanCrying?.(0.34);
    }

    // ── Beat 1A: Cell bars lunge on deliberate approach ──
    if (
      !fired.has('entry_cell_peek') &&
      px < -1.8 && pz > 9.0 && pz < 13.0 && lookingAt(-4.8, 10.9, 0.6)
    ) {
      triggerEntryCellVanish();
    }

    // ── Beat 1.5: Nave pew burst on advancing toward altar ──
    if (
      !fired.has('nave_pew_ambush') &&
      leftNarthex &&
      pz < 3.2 && pz > 1.2 &&
      Math.abs(px) < 1.45 &&
      lookingAt(0, -4.9, 0.5)
    ) {
      triggerNaveAisleScare();
    }

    // ── Beat 2 & 3: Wing first entries ──
    if (elapsed > 3 && px > 9.4) {
      visitedSideWing = true;
      if (!fired.has('east_stalker_flicker')) triggerEastBayPeek();
    }
    if (elapsed > 3 && px < -9.4) {
      visitedSideWing = true;
      if (!fired.has('west_crypt_chill')) triggerWestCryptChill();
    }

    // ── Optional Side Chambers ──
    if (px > 10.4 && pz > 6.8 && !fired.has('cellar_ambush')) {
      triggerCellarTrapScare();
    }
    if (px < -10.4 && pz < -6.9 && !fired.has('chapel_reliquary')) {
      triggerChapelReliquaryScare();
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // LORE INSPECT REACTIONS — Each interactable has a contextual micro-scare
  // scaled to what the player is touching (never the same twice).
  // ═══════════════════════════════════════════════════════════════════
  const handleLoreInspect = (id) => {
    E.ref.triggerInteractAnim?.(id);
    const key = `lore_react_${id}`;
    if (fired.has(key) || E.ref.vaultRestored) return false;
    fired.add(key);

    if (id === 'narthex_registry' || id === 'scriptorium_books') {
      E.audio?.creak?.();
      if (id === 'narthex_registry') {
        // Ghost watches from the arch threshold — not in your face
        const { px, pz } = getPlayerPose();
        placeGhost(0, 7.35, px, pz, 2.8, -0.04);
        E.audio?.playBreathScared?.(0.88);
        E.audio?.playStab?.(0.65);
        E.shake?.(0.72, 0.38);
        h.onFlash?.('#4e0008', 0.38, 200);
        // Whisper accompanies the sighting
        schedule(() => { E.audio?.whisper?.(); }, 180);
        schedule(() => { hideGhost(); }, 1000);
        return true;
      }
    } else if (id === 'cell_manifest') {
      if (!fired.has('entry_cell_peek')) triggerEntryCellVanish();
    } else if (id === 'autopsy_gurney') {
      // Cold snap + blood tint + bone crunch
      setGlobalLightScale(0.08);
      E.audio?.playBonecrack?.(0.92);
      E.audio?.playStab?.(0.72);
      E.shake?.(0.78, 0.4);
      addTrauma(0.35);
      h.onFlash?.('#540009', 0.44, 220);
      h.onNightmarePulse?.(360);
      schedule(() => rampLight(0.08, 1.0, 500), 160);
    } else if (id === 'specimen_locker') {
      // A single wheeze + distant crow
      E.audio?.playBreathScared?.(0.6);
      E.audio?.playCrows?.(0.28);
      setGlobalLightScale(0.72);
      schedule(() => setGlobalLightScale(1.0), 380);
    } else if (id === 'weeping_statue') {
      // Schedule the statue turn for when player looks away
      E.audio?.statueScrape?.();
      pendingStatueTurn = true;
    } else if (id === 'sarcophagus_se') {
      // Chains + sub-bass + ghost light flare
      E.audio?.chainsRattle?.();
      E.shake?.(0.6, 0.35);
      h.onFlash?.('#3c0007', 0.28, 180);
      triggerFlicker(0.2, 0.9, 3, 70);
    } else if (id === 'switchgear_log') {
      // Electrical crackle + voltage buzz + momentary strobe
      E.audio?.voltageBuzz?.();
      triggerFlicker(0.1, 0.85, 4, 50);
      E.shake?.(0.45, 0.3);
    }
    return false;
  };

  return {
    tick,
    trigger: (name) => {
      if (name === 'core_glass') return triggerCoreGlassScare();
      if (name === 'console_reject') return triggerConsoleReject();
      if (name === 'dome_dip' || name === 'blackout_ambush') {
        triggerBlackoutAmbush();
        return true;
      }
      if (name === 'phantom_lunge') {
        triggerPhantomLunge();
        return true;
      }
      if (name === 'manual_solved') {
        E.ref.onManualSolved?.();
        E.audio?.statueScrape?.();
        pendingWestBreach = true;
        scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 1.0);
        return true;
      }
      if (name === 'failsafe_open') {
        E.ref.openFailsafeDoor?.();
        E.audio?.startMachineLoop?.(0.22);
        pendingEastBlackout = true;
        scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 1.0);
        return true;
      }
      if (typeof name === 'string' && name.startsWith('inspect_')) {
        return handleLoreInspect(name.slice(8));
      }
      return false;
    },
    onCoreGlassInspect: triggerCoreGlassScare,
    onConsoleReject: triggerConsoleReject,
    dispose: () => {
      faceJumpscare = null;
      hideGhost();
      setThreat(null, '');
      E.audio?.stopMachineLoop?.();
      E.ref._lightsOverridden = false;
      setGlobalLightScale(1.0);
      traumaAcc = 0;
      if (flickerTimer) { clearTimeout(flickerTimer); flickerTimer = null; }
      if (E.cam?.isPerspectiveCamera && E.cam.fov !== baseFov) {
        E.cam.fov = baseFov;
        E.cam.updateProjectionMatrix?.();
      }
      timers.forEach((id) => clearTimeout(id));
      timers.length = 0;
    },
  };
}

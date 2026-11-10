// Paranormal Horror Director for Room 5: The Surveillance Morgue
// JS-03 (corner entity), JS-05 (CCTV impossible figure), JS-07 (team name injection),
// intercom crackle, footstep follower, fragment scare.
import * as THREE from 'three';
import * as X from './tex.js';
import { isInsideSafeRoom5B } from './simulationControl.js';

export { isInsideSafeRoom5B };

const rnd = (a, b) => a + Math.random() * (b - a);

// Control Room 5B safe-room outer exclusion envelope (ghost clamps outside Z = 2.18)
const clampOutsideSafeRoom = (x, z) => {
  if (x >= -3.55 && x <= 3.55 && z <= 2.15) {
    return { blocked: true, x: Math.max(-3.2, Math.min(3.2, x)), z: 2.22 };
  }
  return { blocked: false, x, z };
};

export function getZoneForPosition(x, z) {
  if (isInsideSafeRoom5B(x, z)) return { camId: 'CAM-02', label: 'CONTROL BAY // 05B (SAFE)' };
  if (x > -1.75) return { camId: 'CAM-01', label: 'ENTRY AIRLOCK // 05A' };
  if (x >= -7.85 && z <= 13.30) return { camId: 'CAM-03', label: 'LOCKER ANNEX // 05C' };
  if (x >= -10.97 && x < -7.85 && z <= 13.30) return { camId: 'CAM-04', label: 'CONTAINMENT GLASS // 05D' };
  if (x >= -7.85 && z > 13.30) return { camId: 'CAM-05', label: 'CRYO AUTOPSY SUITE // 05E' };
  return { camId: 'CAM-06', label: 'CHAMBER 3 / RELAY VAULT // 05F' };
}

export function createControlScares(E, handlers) {
  const S = E.S;
  const cam = E.cam;
  const ref = E.ref;
  const A = () => handlers.audio;
  const flash = (color, opacity, durationMs) => handlers.onFlash?.(color, opacity, durationMs);

  let disposed = false;
  const timers = new Set();
  const schedule = (fn, ms) => {
    if (disposed) return null;
    const id = setTimeout(() => {
      timers.delete(id);
      if (!disposed) fn();
    }, ms);
    timers.add(id);
    return id;
  };

  // ── Timing & Alternating Haunt Cycle Config ──────────────────────────────
  // 2-minute initial grace -> 18s first track -> 2-minute quiet -> 12s repeating tracks
  const INITIAL_GRACE_SEC = Number.isFinite(handlers.initialGraceSec) ? handlers.initialGraceSec : 120;
  const FIRST_MANIFEST_SEC = Number.isFinite(handlers.firstManifestSec) ? handlers.firstManifestSec : 18;
  const DORMANT_COOLDOWN_SEC = Number.isFinite(handlers.dormantIntervalSec) ? handlers.dormantIntervalSec : 120;
  const REPEAT_MANIFEST_SEC = Number.isFinite(handlers.repeatManifestSec) ? handlers.repeatManifestSec : 12;

  let scareTime = 0;
  let nextScareAt = rnd(28, 45);
  let activeScare = null;
  let hasEntryTriggered = false;
  let hasTeamNameInjected = false;
  let cornerEntityBuilding = false;
  let cornerEntityScale = 0;

  let cyclePhase = 'DORMANT';
  let cycleTimer = INITIAL_GRACE_SEC;
  let manifestCount = 0;
  let upcomingAnchor = null;
  let preApproachStepTimer = 0;
  let preApproachAngle = 0;
  let didPreCry = false;
  let didPreScream = false;
  let didCloseScreamThisHunt = false;
  let huntStareTimer = 0;
  let cryingCornerTimer = rnd(26, 38);

  const CRYING_CORNERS = [
    { x: -13.1, z: 6.4 },
    { x: -6.8, z: 18.2 },
    { x: -12.6, z: 18.1 },
    { x: -4.8, z: 6.2 },
    { x: -9.8, z: 11.8 },
  ];

  // Follower footstep, doorway-peek director & 3D jumpscare state
  let lastMoveTime = 0;
  let lastPos = { x: E.px?.() || 0, z: E.pz?.() || 0 };
  let followerActive = false;
  let followerStepTimer = 0;
  let noiseLevel = 0;
  let huntTimer = 0;
  let huntStepTimer = 0;
  let huntGrowlTimer = 0;
  let huntCooldown = 0;
  let bangedDoorThisHunt = false;
  let ghostVelX = 0;
  let ghostVelZ = 0;
  let phoneAnswered = false;
  let phoneRingTimer = 10;
  let prevFlashFlickered = false;
  let flashOutageTimer = rnd(28, 54);
  let flashOutageState = null;
  let peekState = null;
  let retreatState = null;
  let jumpscareState = null;

  // Wing doorway & corridor corner anchors for Poppy Playtime–style peeks & physical retreats
  const PEEK_ANCHORS = [
    { id: 'corner_5a', x: -1.9, z: 5.4, retreatX: -3.2, retreatZ: 8.6 },
    { id: 'annex_door', x: -4.2, z: 9.2, retreatX: -6.9, retreatZ: 9.8 },
    { id: 'observation_door', x: -8.3, z: 9.8, retreatX: -10.5, retreatZ: 10.6 },
    { id: 'cryo_door', x: -4.4, z: 16.2, retreatX: -6.8, retreatZ: 17.4 },
    { id: 'chamber3_door', x: -11.4, z: 16.4, retreatX: -13.2, retreatZ: 17.8 },
  ];

  const pickPeekAnchor = (px, pz, forcedId = null) => {
    if (forcedId) {
      const explicit = PEEK_ANCHORS.find((a) => a.id === forcedId);
      if (explicit) return explicit;
    }
    let best = PEEK_ANCHORS[0];
    let bestScore = Infinity;
    for (const anchor of PEEK_ANCHORS) {
      const d = Math.hypot(px - anchor.x, pz - anchor.z);
      // Spawn/peek from an adjacent wing doorway (>= 4.5m away) so entity never materializes atop the player
      const penalty = d < 4.5 ? 28 : d > 12.0 ? 6 : 0;
      const score = d + penalty;
      if (score < bestScore) {
        bestScore = score;
        best = anchor;
      }
    }
    return best;
  };

  const pickBehindSpawn = (px, pz, fallbackAnchor) => {
    const yaw = E.yaw?.() ?? 0;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    // Target ~4.2m directly behind player's gaze vector so turning around reveals Specimen S-011
    const rawX = Math.max(-13.3, Math.min(2.4, px - fx * 4.2));
    const rawZ = Math.max(-1.4, Math.min(18.6, pz - fz * 4.2));
    const safe = clampOutsideSafeRoom(rawX, rawZ);
    const d = Math.hypot(px - safe.x, pz - safe.z);
    if (d >= 3.0) return safe;
    // Fallback to nearest adjacent corridor doorway (>= 3.8m away) if wall/safe-room squeezed behind-vector
    if (fallbackAnchor) {
      const fbSafe = clampOutsideSafeRoom(fallbackAnchor.x, fallbackAnchor.z);
      if (Math.hypot(px - fbSafe.x, pz - fbSafe.z) >= 2.8) return fbSafe;
    }
    return clampOutsideSafeRoom(-4.2, Math.min(17.5, Math.max(6.2, pz + 4.4)));
  };

  const banishGhostToDormant = (dormantDuration = DORMANT_COOLDOWN_SEC) => {
    const ghost = E._ghost;
    huntTimer = 0;
    huntStareTimer = 0;
    peekState = null;
    retreatState = null;
    ghostVelX = 0;
    ghostVelZ = 0;
    noiseLevel = 0;
    upcomingAnchor = null;
    preApproachStepTimer = 0;
    didPreCry = false;
    didPreScream = false;
    didCloseScreamThisHunt = false;
    cyclePhase = 'DORMANT';
    cycleTimer = Math.max(0, dormantDuration);
    flashOutageState = null;
    E._flashOutageActive = false;
    if (prevFlashFlickered && E.flashlight && E.flashlight.intensity > 0.05) {
      prevFlashFlickered = false;
      E.flashlight.intensity = E._flashBaseIntensity || 9.0;
    }
    A()?.setChaseTension?.(0);
    A()?.setWeepingVolume?.(0.36);
    if (ghost) {
      ghost.scareOverride = false;
      ghost.isHunting = false;
      ghost.isJumpscaring = false;
      ghost.behavior = 'DORMANT';
      ghost.root.visible = false;
      ghost.root.position.set(-12.2, 0.02, 16.5);
      ghost.setAnim?.('IdleStalk', 0.44, 0.2);
      if (ghost.ghostGlow) ghost.ghostGlow.intensity = 0;
    }
  };

  const startHuntSequence = (gxPos, gzPos, duration, reason, message, severity = 1.0, { stareDelay = 0 } = {}) => {
    const ghost = E._ghost;
    if (!ghost || disposed || jumpscareState) return;
    peekState = null;
    retreatState = null;
    didCloseScreamThisHunt = false;
    const clamped = clampOutsideSafeRoom(gxPos, gzPos);
    ghost.root.visible = true;
    ghost.scareOverride = true;
    ghost.isJumpscaring = false;
    ghost.isHunting = true;
    ghost.behavior = 'HUNT';
    bangedDoorThisHunt = false;
    huntGrowlTimer = 0.2;
    huntStareTimer = Math.max(0, stareDelay);
    huntTimer = Math.max(huntTimer, duration);
    ghost.root.position.set(clamped.x, 0.02, clamped.z);
    if (ghost.walkAction) ghost.walkAction.timeScale = 0.88;
    ghost.setAnim?.(huntStareTimer > 0 ? 'DoorPeek' : 'SprintLunge', huntStareTimer > 0 ? 1.0 : 1.05, 0.12);
    if (ghost.ghostGlow) ghost.ghostGlow.intensity = huntStareTimer > 0 ? 1.85 : 1.45;
    A()?.stinger?.(severity >= 1 ? 'hard' : 'soft');
    A()?.stalkerGrowl?.(clamped.x, clamped.z, Math.min(0.95, 0.72 + severity * 0.15));
    if (severity >= 0.9) {
      A()?.entityScream?.(clamped.x, clamped.z, Math.min(0.95, 0.65 + severity * 0.2));
      A()?.womanScream?.(clamped.x, clamped.z, Math.min(1.0, 0.78 + severity * 0.18));
    }
    if (message) handlers.onScare?.(reason, message);
  };

  const startDoorPeek = ({ anchorId = null, allowEscalate = true } = {}) => {
    const ghost = E._ghost;
    if (!ghost || disposed || jumpscareState || huntTimer > 0) return false;
    const cx = E.px?.() ?? 0;
    const cz = E.pz?.() ?? 0;
    const anchor = pickPeekAnchor(cx, cz, anchorId);
    const clamped = clampOutsideSafeRoom(anchor.x, anchor.z);
    retreatState = null;
    ghost.root.visible = true;
    ghost.scareOverride = true;
    ghost.isHunting = false;
    ghost.isJumpscaring = false;
    ghost.behavior = 'PEEK';
    ghost.root.position.set(clamped.x, 0.02, clamped.z);
    ghost.root.rotation.y = Math.atan2(cx - clamped.x, cz - clamped.z);
    if (ghost.ghostGlow) ghost.ghostGlow.intensity = 1.35;
    ghost.setAnim?.('DoorPeek', 0.9, 0.14);
    A()?.peekSting?.();
    A()?.heavyEntityStep?.(clamped.x, clamped.z, 0.48);
    const escalate = allowEscalate && !isInsideSafeRoom5B(cx, cz) && noiseLevel > 0.35 && Math.random() < 0.45;
    peekState = {
      anchor,
      elapsed: 0,
      duration: rnd(1.8, 2.7),
      escalate,
    };
    return true;
  };

  // ── Phantom Face (attached to camera) ─────────────────────────────────────
  const faceTexture = X.tex(X.faceC({ seed: 7, mouth: true }));
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true, fog: false, depthWrite: false });
  const phantomFace = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), faceMat);
  phantomFace.position.set(0, 0, -1.1);
  phantomFace.visible = false;
  phantomFace.userData.np = 1;
  cam.add(phantomFace);

  // ── JS-03 Corner Entity ───────────────────────────────────────────────────
  // Dark mass grows from far corner over 10 minutes then lunges
  const entityMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, fog: false });
  const entityMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), entityMat);
  entityMesh.position.set(-2.95, 0.5, -1.45); // far south-west control room shadow
  entityMesh.scale.setScalar(0.01);
  entityMesh.visible = false;
  S.add(entityMesh);

  const fwd = () => [-Math.sin(E.yaw()), -Math.cos(E.yaw())];

  // ── Scare Definitions ─────────────────────────────────────────────────────
  const scareDefinitions = {
    // Monitor static burst with distant thud (audio/visual only — avoids distracting UI spam)
    monitorBurst: {
      cond: () => true,
      start() {
        A()?.staticBurst?.(0, -2.2);
        schedule(() => A()?.drawerSlam?.(-2.5, 0), 350);
        flash('#004400', 0.25, 100);
      },
      upd(t) { return t > 0.8; }
    },

    // Relay click cascade from east wall (spatial audio only)
    relayCascade: {
      cond: () => true,
      start() {
        const times = [0, 180, 320, 450, 560, 650];
        times.forEach(ms => schedule(() => A()?.relayClick?.(2.5, rnd(-1.5, 1.5)), ms));
      },
      upd(t) { return t > 1.2; }
    },

    // Phantom face disabled in favor of grounded 3D ghost.glb sightings (non-childish suspense)
    phantomFace: {
      cond: () => false,
      start() {},
      upd() { return true; }
    },

    // Intercom crackle (ambient audio cue)
    intercomActivate: {
      cond: () => scareTime > 30,
      start() {
        A()?.intercomCrackle?.();
      },
      upd(t) { return t > 2.5; }
    },

    // Static voice whisper (spatial audio cue)
    whisperFromWall: {
      cond: () => scareTime > 45,
      start() {
        const [fx, fz] = fwd();
        const bx = E.px() - fx * 2.5;
        const bz = E.pz() - fz * 2.5;
        A()?.whisperRaspy?.(pick(['wrongroom', 'watching', 'inthere']), bx, bz);
      },
      upd(t) { return t > 1.5; }
    },

    // Doorway / corner peek during active manifestation window
    corridorApparition: {
      cond: () => cyclePhase === 'MANIFESTING' && Boolean(E._ghost) && !isInsideSafeRoom5B(E.px?.() ?? 0, E.pz?.() ?? 0) && huntTimer <= 0 && !peekState && !retreatState && !jumpscareState,
      start() {
        startDoorPeek({ allowEscalate: true });
      },
      upd(t) {
        if (!peekState && !retreatState && t > 0.25) return true;
        if (t > 7.5) {
          peekState = null;
          retreatState = null;
          if (cycleTimer <= 0 || cyclePhase === 'DORMANT') {
            banishGhostToDormant(DORMANT_COOLDOWN_SEC);
          } else if (E._ghost) {
            E._ghost.scareOverride = false;
            E._ghost.behavior = 'MANIFESTING';
            E._ghost.setAnim?.('IdleStalk', 0.44, 0.25);
          }
          return true;
        }
        return false;
      }
    }
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const scareKeys = Object.keys(scareDefinitions);

  // ── Entry Intercom Trigger ─────────────────────────────────────────────────
  // Fires 3-5 seconds after first entering the room
  schedule(() => {
    if (!hasEntryTriggered) {
      hasEntryTriggered = true;
      A()?.intercomCrackle?.();
    }
  }, rnd(3000, 5000));

  // ── JS-03: Corner Entity Growth over 8 minutes ───────────────────────────
  const startCornerEntity = () => {
    cornerEntityBuilding = true;
    entityMesh.visible = true;
    entityMat.opacity = 0;
    entityMesh.scale.setScalar(0.01);
    cornerEntityScale = 0;
  };
  // Schedule entity growth start after 8 minutes
  schedule(startCornerEntity, 8 * 60 * 1000);

  // ── JS-05: Monitor Bank CCTV Horror ──────────────────────────────────────
  const triggerCCTVHorror = () => {
    if (disposed || !E._monitorScreens?.length) return;
    const footageMonitor = E._monitorScreens.find(m => m.idx === 4) || E._monitorScreens[0];
    if (!footageMonitor) return;

    // Phase 1: static
    flash('#001100', 0.3, 100);
    A()?.staticBurst?.(0, -2.5);

    schedule(() => {
      if (!footageMonitor.mat) return;
      // Phase 2: show past footage (ghostly grid with vague figure)
      footageMonitor.mat.emissiveIntensity = 1.0;
      handlers.onScare?.('cctv', 'The center monitor flickers — for a moment, it shows a room that looks just like this one... but occupied.');
    }, 600);

    // Phase 3: impossible figure appears then static
    schedule(() => {
      A()?.staticBurst?.(0, -2.5);
      A()?.stinger?.('extreme');
      flash('#000800', 0.95, 200);
      handlers.onScare?.('cctvFigure', 'In the corner of the CCTV footage — something is standing directly behind where you are standing now.');
    }, 2800);

    schedule(() => {
      if (footageMonitor.mat) footageMonitor.mat.emissiveIntensity = 0.8;
    }, 4000);
  };

  // ── JS-07: Team Name Injection ────────────────────────────────────────────
  const triggerTeamNameInjection = (name) => {
    if (hasTeamNameInjected) return;
    hasTeamNameInjected = true;
    handlers.onTeamNameInjection?.(name || handlers.teamName || 'SUBJECT');
  };

  // ── Fragment Scare (15% chance on any prop search) ────────────────────────
  const maybeFragmentScare = () => {
    noiseLevel = Math.min(1, noiseLevel + 0.14);
    if (Math.random() < 0.15) {
      const [fx, fz] = fwd();
      A()?.drawerSlam?.(E.px() + fx * 1.5, E.pz() + fz * 1.5);
      flash('#240404', 0.35, 140);
      handlers.onScare?.('fragmentScare', 'A heavy metallic bang echoes from down the corridor.');
    }
  };

  // ── Breach / Noise Hunt Trigger ───────────────────────────────────────────
  const triggerBreachHunt = (severity = 1.0, { respectGrace = false } = {}) => {
    if (disposed || jumpscareState) return;
    if (respectGrace && (scareTime < INITIAL_GRACE_SEC || cyclePhase === 'DORMANT')) {
      if (severity >= 0.9) A()?.stinger?.('soft');
      return;
    }
    noiseLevel = Math.min(1, noiseLevel + 0.42 * severity);
    A()?.stinger?.(severity >= 1 ? 'hard' : 'soft');
    const ghost = E._ghost;
    if (severity >= 0.9 && ghost) {
      if (cyclePhase !== 'MANIFESTING') {
        manifestCount += 1;
        cyclePhase = 'MANIFESTING';
        cycleTimer = manifestCount === 1 ? FIRST_MANIFEST_SEC : REPEAT_MANIFEST_SEC;
      } else {
        cycleTimer = Math.max(cycleTimer, 10);
      }
      const cx = E.px?.() ?? 0;
      const cz = E.pz?.() ?? 0;
      const [fx, fz] = fwd();
      flash('#1f0303', 0.42, 220);
      startHuntSequence(
        cx - fx * 5.8,
        Math.max(2.6, Math.min(18.0, cz + 4.5)),
        Math.min(cycleTimer, 16),
        'breachHunt',
        'Alarm tripped — heavy footsteps are closing in outside Control Room 5B.',
        severity
      );
    }
  };

  const markPhoneAnswered = () => { phoneAnswered = true; };

  // ── Main Update Loop ──────────────────────────────────────────────────────
  const update = (dt, totalT) => {
    if (disposed) return;
    scareTime += dt;
    if (huntCooldown > 0) huntCooldown -= dt;

    // Noise accumulation from sprinting vs quiet stealth decay
    const isSprinting = Boolean(E.isSprinting?.());
    noiseLevel = isSprinting
      ? Math.min(1, noiseLevel + dt * 0.28)
      : Math.max(0, noiseLevel - dt * 0.12);

    const cx = E.px?.() ?? 0;
    const cz = E.pz?.() ?? 0;
    const playerInSafeRoom = isInsideSafeRoom5B(cx, cz);

    // Periodic desk telephone ring inside Control Bay 5B until answered
    if (!phoneAnswered) {
      phoneRingTimer -= dt;
      if (phoneRingTimer <= 0) {
        phoneRingTimer = rnd(24, 38);
        A()?.phoneRing?.(2.62, 0.96);
      }
    }

    // Active 3D Jumpscare Lock (1.35s grabbed camera lunge -> Respawn 5B -> Dormant cooldown)
    const ghost = E._ghost;
    if (jumpscareState && ghost) {
      jumpscareState.elapsed += dt;
      const p = Math.min(1, jumpscareState.elapsed / jumpscareState.duration);
      const slideDist = 0.95 - 0.45 * Math.min(1, p * 1.85);
      const cand = clampOutsideSafeRoom(
        jumpscareState.cx + jumpscareState.ux * slideDist,
        jumpscareState.cz + jumpscareState.uz * slideDist
      );
      ghost.root.visible = true;
      ghost.scareOverride = true;
      ghost.isHunting = false;
      ghost.isJumpscaring = true;
      ghost.behavior = 'JUMPSCARE';
      ghost.root.position.set(cand.x, 0.02, cand.z);
      ghost.root.rotation.y = Math.atan2(jumpscareState.cx - cand.x, jumpscareState.cz - cand.z);
      if (ghost.ghostGlow) ghost.ghostGlow.intensity = 6.2 + Math.sin(p * 32) * 0.7;
      E.setCameraOverride?.(true, jumpscareState.yaw, 0.08);
      E.setTargetFov?.(50);

      if (jumpscareState.elapsed >= jumpscareState.duration) {
        const finished = jumpscareState;
        jumpscareState = null;
        banishGhostToDormant(DORMANT_COOLDOWN_SEC);
        E.setCameraOverride?.(false);
        E.setTargetFov?.(72);
        handlers.onPlayerCaught?.({ x: finished.cx, z: finished.cz, gx: finished.gx, gz: finished.gz });
      }
      return;
    }

    // Alternating 2m Grace -> Pre-Arrival Telegraph (8s Surrounding Footsteps + Crying Corner + Female Scream) -> Behind-You Reveal + Evadable Chase -> 2m Dormant
    cycleTimer -= dt;
    if (cyclePhase === 'DORMANT') {
      if (cycleTimer <= 15.0 && !upcomingAnchor) {
        upcomingAnchor = pickPeekAnchor(cx, cz);
      }
      if (cycleTimer > 0 && cycleTimer <= 8.0 && upcomingAnchor) {
        preApproachStepTimer -= dt;
        if (preApproachStepTimer <= 0) {
          preApproachStepTimer = Math.max(0.32, cycleTimer * 0.13);
          preApproachAngle += 1.85;
          const ringR = Math.max(2.2, 2.0 + cycleTimer * 0.42);
          const sx = cx + Math.cos(preApproachAngle) * ringR;
          const sz = cz + Math.sin(preApproachAngle) * ringR;
          A()?.footstep?.(sx, sz);
          A()?.heavyEntityStep?.(upcomingAnchor.x, upcomingAnchor.z, Math.max(0.42, 0.96 - cycleTimer * 0.07));
        }
        if (!didPreCry && cycleTimer <= 7.2) {
          didPreCry = true;
          const corner = CRYING_CORNERS.reduce((best, c) => {
            const d = Math.hypot(c.x - cx, c.z - cz);
            return Math.abs(d - 8.5) < Math.abs(best.d - 8.5) ? { c, d } : best;
          }, { c: CRYING_CORNERS[0], d: Infinity }).c;
          A()?.cryingWoman?.(corner.x, corner.z, 0.85);
        }
        if (!didPreScream && cycleTimer <= 3.8) {
          didPreScream = true;
          A()?.entityScream?.(upcomingAnchor.x, upcomingAnchor.z, 0.72);
          A()?.womanScream?.(upcomingAnchor.x, upcomingAnchor.z, 0.88);
          A()?.setChaseTension?.(0.44);
        }
      }
    }

    if (cyclePhase === 'DORMANT' && cycleTimer <= 0) {
      manifestCount += 1;
      const dur = manifestCount === 1 ? FIRST_MANIFEST_SEC : REPEAT_MANIFEST_SEC;
      const spawnAnchor = upcomingAnchor || pickPeekAnchor(cx, cz);
      upcomingAnchor = null;
      preApproachStepTimer = 0;
      didPreCry = false;
      didPreScream = false;
      cyclePhase = 'MANIFESTING';
      cycleTimer = dur;
      if (ghost) {
        if (!playerInSafeRoom) {
          const behindSpawn = pickBehindSpawn(cx, cz, spawnAnchor);
          flash('#260202', 0.34, 240);
          E.shake?.(0.22, 0.25);
          A()?.whisperRaspy?.('inthere', behindSpawn.x, behindSpawn.z);
          startHuntSequence(
            behindSpawn.x,
            behindSpawn.z,
            dur,
            'manifestation',
            null,
            0.98,
            { stareDelay: 1.25 }
          );
        } else {
          startDoorPeek({ anchorId: spawnAnchor.id, allowEscalate: true });
        }
      }
    } else if (cyclePhase === 'MANIFESTING' && cycleTimer <= 0 && !retreatState && !jumpscareState) {
      if (ghost && ghost.root.visible) {
        huntTimer = 0;
        huntStareTimer = 0;
        const anchor = pickPeekAnchor(ghost.root.position.x, ghost.root.position.z);
        const rt = clampOutsideSafeRoom(anchor.retreatX, anchor.retreatZ);
        retreatState = {
          targetX: rt.x,
          targetZ: rt.z,
          elapsed: 0,
          duration: 1.35,
          didStep: false,
        };
        peekState = null;
        ghost.scareOverride = true;
        ghost.isHunting = false;
        ghost.behavior = 'RETREAT';
        ghost.setAnim?.('SprintLunge', 1.25, 0.1);
        A()?.scurrySteps?.(ghost.root.position.x, ghost.root.position.z);
      } else {
        banishGhostToDormant(DORMANT_COOLDOWN_SEC);
      }
    }

    if (cyclePhase === 'MANIFESTING' && !playerInSafeRoom && noiseLevel >= 0.78 && huntTimer <= 0 && huntCooldown <= 0 && ghost) {
      huntCooldown = 18;
      const [fx, fz] = fwd();
      startHuntSequence(
        cx - fx * 6.2,
        Math.max(2.4, Math.min(18.0, cz - fz * 6.2)),
        Math.max(6.0, Math.min(cycleTimer, 13.0)),
        'noiseHunt',
        'Sprint echoes drew Specimen S-011 — weave through open wings or head to 5B!',
        0.95
      );
    }

    // Active stalker pursuit, Safe Room 5B threshold barrier & lethal 3D jumpscare
    if (huntTimer > 0 && ghost) {
      huntTimer -= dt;
      if (huntStareTimer > 0) {
        huntStareTimer = Math.max(0, huntStareTimer - dt);
      }
      ghost.root.visible = true;
      ghost.isHunting = true;
      ghost.isJumpscaring = false;
      ghost.behavior = 'HUNT';
      const gx = ghost.root.position.x;
      const gz = ghost.root.position.z;
      const dx = cx - gx;
      const dz = cz - gz;
      const dist = Math.hypot(dx, dz);
      const tension = playerInSafeRoom
        ? Math.min(0.45, Math.max(0.12, 0.7 - dist / 12.0))
        : Math.max(0.32, Math.min(1, 1.2 - dist / 10.5));
      A()?.setChaseTension?.(tension);

      if (huntStareTimer > 0) {
        // Dramatic behind-you reveal beat so player can turn around and sprint away
        ghostVelX = 0;
        ghostVelZ = 0;
        ghost.setAnim?.('DoorPeek', 1.1, 0.12);
        if (ghost.ghostGlow) ghost.ghostGlow.intensity = 2.0;
      } else if (dist > 1.32) {
        ghost.setAnim?.('SprintLunge', 1.05, 0.14);
        const targetSpeed = playerInSafeRoom ? 1.05 : 1.42;
        const inv = 1 / Math.max(0.001, dist);
        const dirX = dx * inv;
        const dirZ = dz * inv;
        ghostVelX += (dirX * targetSpeed - ghostVelX) * Math.min(1, dt * 6.0);
        ghostVelZ += (dirZ * targetSpeed - ghostVelZ) * Math.min(1, dt * 6.0);

        const candX = gx + ghostVelX * dt;
        const candZ = gz + ghostVelZ * dt;
        const safeCheck = clampOutsideSafeRoom(candX, candZ);

        if (safeCheck.blocked) {
          ghost.root.position.set(safeCheck.x, 0.02, safeCheck.z);
          ghostVelX = 0;
          ghostVelZ = 0;
          if (!bangedDoorThisHunt) {
            bangedDoorThisHunt = true;
            A()?.bulkheadBang?.(safeCheck.x, 2.05);
            A()?.stalkerGrowl?.(safeCheck.x, 2.15, 0.9);
            E.shake?.(0.55, 0.28);
            handlers.onScare?.('safeDoorBang', 'Specimen S-011 slams against Control Room 5B steel — you are safe inside.');
            huntTimer = Math.min(huntTimer, 2.5);
          }
        } else {
          ghost.root.position.x = candX;
          ghost.root.position.z = candZ;
        }
      } else if (!playerInSafeRoom && huntCooldown <= 0) {
        // Caught outside Safe Room 5B -> 1.35s Locked 3D Camera-Grab Jumpscare + Respawn + Drop 1 Evidence
        huntTimer = 0;
        huntCooldown = 20;
        noiseLevel = 0;
        ghostVelX = 0;
        ghostVelZ = 0;
        peekState = null;
        retreatState = null;
        if (prevFlashFlickered && E.flashlight && E.flashlight.intensity > 0.05) {
          prevFlashFlickered = false;
          E.flashlight.intensity = 9.0;
        }
        const inv = 1 / Math.max(0.001, dist);
        const fvec = fwd();
        const ux = dist > 0.05 ? (gx - cx) * inv : fvec[0];
        const uz = dist > 0.05 ? (gz - cz) * inv : fvec[1];
        const yaw = Math.atan2(-ux, -uz);
        jumpscareState = { elapsed: 0, duration: 1.35, ux, uz, yaw, cx, cz, gx, gz };
        const initPos = clampOutsideSafeRoom(cx + ux * 0.95, cz + uz * 0.95);
        ghost.root.visible = true;
        ghost.scareOverride = true;
        ghost.isHunting = false;
        ghost.isJumpscaring = true;
        ghost.behavior = 'JUMPSCARE';
        ghost.root.position.set(initPos.x, 0.02, initPos.z);
        ghost.root.rotation.y = Math.atan2(cx - initPos.x, cz - initPos.z);
        ghost.setAnim?.('JumpscareSnap', 1.35, 0.06);
        if (ghost.ghostGlow) ghost.ghostGlow.intensity = 6.8;
        E.setCameraOverride?.(true, yaw, 0.08);
        E.setTargetFov?.(50);
        E.shake?.(1.35, 1.35);
        A()?.jumpscareSting?.();
        A()?.setChaseTension?.(1.0);
        flash('#4a0303', 0.96, 520);
        handlers.onJumpscareStart?.({ x: cx, z: cz, gx, gz });
        return;
      }
      ghost.root.rotation.y = Math.atan2(dx, dz);

      if (!playerInSafeRoom && dist < 4.2 && !didCloseScreamThisHunt) {
        didCloseScreamThisHunt = true;
        A()?.entityScream?.(ghost.root.position.x, ghost.root.position.z, 0.95);
        A()?.womanScream?.(ghost.root.position.x, ghost.root.position.z, 0.98);
      }

      huntStepTimer -= dt;
      if (huntStepTimer <= 0) {
        huntStepTimer = playerInSafeRoom ? 0.62 : 0.30;
        A()?.heavyEntityStep?.(ghost.root.position.x, ghost.root.position.z, tension);
      }

      huntGrowlTimer -= dt;
      if (huntGrowlTimer <= 0) {
        huntGrowlTimer = rnd(2.2, 3.8);
        A()?.stalkerGrowl?.(ghost.root.position.x, ghost.root.position.z, Math.max(0.45, tension));
      }

      if (huntTimer <= 0) {
        const anchor = pickPeekAnchor(ghost.root.position.x, ghost.root.position.z);
        const rt = clampOutsideSafeRoom(anchor.retreatX, anchor.retreatZ);
        retreatState = {
          targetX: rt.x,
          targetZ: rt.z,
          elapsed: 0,
          duration: 1.35,
          didStep: false,
        };
        ghost.isHunting = false;
        ghost.behavior = 'RETREAT';
        ghost.setAnim?.('SprintLunge', 1.25, 0.12);
        A()?.scurrySteps?.(ghost.root.position.x, ghost.root.position.z);
      }
    } else if (peekState && ghost) {
      peekState.elapsed += dt;
      ghost.root.visible = true;
      ghost.scareOverride = true;
      ghost.isHunting = false;
      ghost.isJumpscaring = false;
      ghost.behavior = 'PEEK';
      const gx = ghost.root.position.x;
      const gz = ghost.root.position.z;
      const dist = Math.hypot(cx - gx, cz - gz);
      ghost.root.rotation.y = Math.atan2(cx - gx, cz - gz);
      if (ghost.ghostGlow) ghost.ghostGlow.intensity = 1.15 + Math.sin(peekState.elapsed * 5.0) * 0.25;

      if (!playerInSafeRoom && dist < 2.25 && huntCooldown <= 0) {
        huntCooldown = 18;
        startHuntSequence(
          gx,
          gz,
          Math.max(8.0, cyclePhase === 'MANIFESTING' ? cycleTimer : 10.5),
          'peekAmbush',
          'Specimen S-011 lunged from the doorway — sprint back to Control Room 5B!'
        );
      } else if (peekState.elapsed >= peekState.duration) {
        if (peekState.escalate && !playerInSafeRoom && huntCooldown <= 0) {
          huntCooldown = 18;
          startHuntSequence(
            gx,
            gz,
            Math.max(8.0, cyclePhase === 'MANIFESTING' ? cycleTimer : 10.5),
            'peekAmbush',
            'Specimen S-011 spotted you in the corridor — get behind Control Room 5B steel!'
          );
        } else {
          const rt = clampOutsideSafeRoom(peekState.anchor.retreatX, peekState.anchor.retreatZ);
          retreatState = {
            targetX: rt.x,
            targetZ: rt.z,
            elapsed: 0,
            duration: 1.45,
            didStep: false,
          };
          peekState = null;
          ghost.behavior = 'RETREAT';
          ghost.setAnim?.('SprintLunge', 1.25, 0.1);
          A()?.scurrySteps?.(gx, gz);
        }
      }
    } else if (retreatState && ghost) {
      retreatState.elapsed += dt;
      ghost.root.visible = true;
      ghost.scareOverride = true;
      ghost.isHunting = false;
      ghost.isJumpscaring = false;
      ghost.behavior = 'RETREAT';
      const gx = ghost.root.position.x;
      const gz = ghost.root.position.z;
      const rx = retreatState.targetX - gx;
      const rz = retreatState.targetZ - gz;
      const dist = Math.hypot(rx, rz);
      if (dist > 0.1) {
        const step = Math.min(dist, 3.2 * dt);
        const inv = 1 / dist;
        const cand = clampOutsideSafeRoom(gx + rx * inv * step, gz + rz * inv * step);
        ghost.root.position.set(cand.x, 0.02, cand.z);
        ghost.root.rotation.y = Math.atan2(rx, rz);
      }
      if (!retreatState.didStep && retreatState.elapsed > 0.32) {
        retreatState.didStep = true;
        A()?.scurrySteps?.(ghost.root.position.x, ghost.root.position.z);
      }
      if (dist <= 0.35 || retreatState.elapsed >= retreatState.duration) {
        retreatState = null;
        banishGhostToDormant(cyclePhase === 'DORMANT' ? cycleTimer : DORMANT_COOLDOWN_SEC);
      }
    } else if (ghost) {
      ghost.isHunting = false;
      ghost.isJumpscaring = false;
      if (cyclePhase === 'DORMANT') {
        ghost.behavior = 'DORMANT';
        ghost.root.visible = false;
        if (ghost.ghostGlow) ghost.ghostGlow.intensity = 0;
        A()?.setChaseTension?.(0);
      } else {
        if (!ghost.scareOverride) ghost.behavior = 'MANIFESTING';
        const safePatrol = clampOutsideSafeRoom(ghost.root.position.x, ghost.root.position.z);
        if (safePatrol.blocked) {
          ghost.root.position.set(-12.5, 0.02, 12.2);
        }
        const dist = Math.hypot(cx - ghost.root.position.x, cz - ghost.root.position.z);
        const ambientTension = !playerInSafeRoom && dist < 7.5 ? Math.max(0, (7.5 - dist) / 9.0) : noiseLevel * 0.2;
        A()?.setChaseTension?.(ambientTension);
      }
    }

    // Random Torch Flicker -> 5–7s Blackout (can strike any time while exploring Room 5) & Entity EMI Sputter
    const entityVisibleDist = ghost && ghost.root.visible
      ? Math.hypot(cx - ghost.root.position.x, cz - ghost.root.position.z)
      : Infinity;
    const isApproachingNow = cyclePhase === 'DORMANT' && cycleTimer <= 8.0 && Boolean(upcomingAnchor);
    const flashBase = E._flashBaseIntensity || 9.0;
    const userFlashOn = E._userFlashlightOn !== undefined
      ? Boolean(E._userFlashlightOn)
      : Boolean(E.flashlight && (E.flashlight.intensity > 0.05 || flashOutageState || prevFlashFlickered));

    if (!flashOutageState && E.flashlight) {
      flashOutageTimer -= dt;
      if (flashOutageTimer <= 0 && scareTime > 18 && userFlashOn) {
        triggerFlashOutage(rnd(5.0, 7.0));
      }
    }

    if (flashOutageState && E.flashlight) {
      flashOutageState.elapsed += dt;
      const { elapsed, flickerDur, blackoutDur, recoverDur } = flashOutageState;
      if (!userFlashOn) {
        E.flashlight.intensity = 0;
        if (E._flashLensMat) E._flashLensMat.emissiveIntensity = 0;
      } else if (elapsed < flickerDur) {
        const sputter = Math.random() < 0.55 ? 0 : (Math.random() < 0.5 ? 1.2 : flashBase);
        E.flashlight.intensity = sputter;
        if (E._flashLensMat) E._flashLensMat.emissiveIntensity = sputter > 1 ? 1.5 : 0.12;
      } else if (elapsed < flickerDur + blackoutDur) {
        if (!flashOutageState.didDarkClick) {
          flashOutageState.didDarkClick = true;
          A()?.relayClick?.(cx, cz);
        }
        E.flashlight.intensity = 0;
        if (E._flashLensMat) E._flashLensMat.emissiveIntensity = 0;
      } else if (elapsed < flickerDur + blackoutDur + recoverDur) {
        const onBlink = Math.random() < 0.65;
        E.flashlight.intensity = onBlink ? flashBase : 1.4;
        if (E._flashLensMat) E._flashLensMat.emissiveIntensity = onBlink ? 1.8 : 0.25;
      } else {
        flashOutageState = null;
        E._flashOutageActive = false;
        flashOutageTimer = rnd(42, 74);
        prevFlashFlickered = false;
        A()?.relayClick?.(cx, cz);
        E.flashlight.intensity = flashBase;
        if (E._flashLensMat) E._flashLensMat.emissiveIntensity = 1.8;
      }
    } else if (E.flashlight && userFlashOn) {
      if (entityVisibleDist < 10.5 || isApproachingNow) {
        prevFlashFlickered = true;
        const deepCut = entityVisibleDist < 5.5 ? 0.45 : 1.65;
        const prob = entityVisibleDist < 5.5 ? 0.42 : 0.26;
        const nextInt = Math.random() < prob ? deepCut : flashBase;
        E.flashlight.intensity = nextInt;
        if (E._flashLensMat) E._flashLensMat.emissiveIntensity = nextInt > 2 ? 1.8 : 0.22;
      } else if (prevFlashFlickered) {
        prevFlashFlickered = false;
        E.flashlight.intensity = flashBase;
        if (E._flashLensMat) E._flashLensMat.emissiveIntensity = 1.8;
      }
    } else if (prevFlashFlickered) {
      prevFlashFlickered = false;
    }

    // Continuous creepy-woman weeping bed: faintly audible throughout round, swelling loudly near countdown & attacks
    const weepingVol = jumpscareState
      ? 0.45
      : cyclePhase === 'MANIFESTING' || huntTimer > 0 || peekState
        ? (entityVisibleDist < 12.0 ? Math.min(1.80, 1.15 + ((12.0 - entityVisibleDist) / 12.0) * 0.65) : 1.15)
        : cyclePhase === 'DORMANT' && cycleTimer <= 14.0
          ? 0.36 + ((14.0 - Math.max(0, cycleTimer)) / 14.0) * 1.10
          : 0.36;
    A()?.setWeepingVolume?.(weepingVol);

    // Periodic haunting crying-woman audio emanating from darkened outer wing corners
    if (scareTime > 25 && huntTimer <= 0) {
      cryingCornerTimer -= dt;
      if (cryingCornerTimer <= 0) {
        cryingCornerTimer = rnd(34, 48);
        const corner = CRYING_CORNERS.reduce((best, c) => {
          const d = Math.hypot(c.x - cx, c.z - cz);
          return Math.abs(d - 9.5) < Math.abs(best.d - 9.5) ? { c, d } : best;
        }, { c: CRYING_CORNERS[0], d: Infinity }).c;
        A()?.cryingWoman?.(corner.x, corner.z, 0.72);
      }
    }

    // Track player movement for stationary shadow footsteps
    const moved = Math.hypot(cx - lastPos.x, cz - lastPos.z) > 0.08;
    if (moved) {
      lastPos = { x: cx, z: cz };
      lastMoveTime = scareTime;
      followerActive = false;
    }

    // Activate follower if player stationary 15+ seconds
    if (scareTime - lastMoveTime > 15 && !followerActive) {
      followerActive = true;
    }
    if (followerActive) {
      followerStepTimer -= dt;
      if (followerStepTimer <= 0) {
        followerStepTimer = rnd(0.4, 0.8);
        // Footstep from behind player
        const [fx, fz] = fwd();
        const bx = cx - fx * rnd(1.5, 3.0);
        const bz = cz - fz * rnd(1.5, 3.0);
        A()?.footstep?.(bx, bz);
        // Stop when player moves (detected above)
      }
    }

    // JS-03 corner entity growth (upgrades lunge to animated 3D ghost.glb when loaded)
    if (cornerEntityBuilding) {
      const growDuration = 2 * 60; // 2 more minutes of growth (started at 8min)
      cornerEntityScale = Math.min(1, cornerEntityScale + dt / growDuration);
      entityMesh.scale.setScalar(0.01 + cornerEntityScale * 1.4);
      entityMat.opacity = E._ghost ? 0 : cornerEntityScale * 0.6;

      if (cornerEntityScale >= 1 && !isInsideSafeRoom5B(E.px?.() ?? 0, E.pz?.() ?? 0)) {
        // LUNGE (only outside Safe Room 5B)
        cornerEntityBuilding = false;
        const cornerGhost = E._ghost;
        if (cornerGhost) {
          const [fx, fz] = fwd();
          const clamped = clampOutsideSafeRoom(E.px() + fx * 2.75, E.pz() + fz * 2.75);
          cornerGhost.root.visible = true;
          cornerGhost.scareOverride = true;
          cornerGhost.behavior = 'HUNT';
          cornerGhost.root.position.set(clamped.x, 0.02, clamped.z);
          cornerGhost.root.rotation.y = Math.atan2(E.px() - cornerGhost.root.position.x, E.pz() - cornerGhost.root.position.z);
          cornerGhost.setAnim?.('SprintLunge', 1.15, 0.12);
        }
        A()?.stinger?.('mid');
        flash('#100000', 0.45, 180);
        schedule(() => {
          entityMesh.visible = false;
          entityMesh.scale.setScalar(0.01);
          entityMat.opacity = 0;
          cornerEntityScale = 0;
          if (cornerGhost) {
            banishGhostToDormant(cyclePhase === 'DORMANT' ? cycleTimer : DORMANT_COOLDOWN_SEC);
          }
        }, 1200);
      }
    }

    // Active scare update
    if (activeScare) {
      activeScare.elapsed += dt;
      if (activeScare.def.upd(activeScare.elapsed)) {
        activeScare = null;
        nextScareAt = scareTime + rnd(50, 90);
      }
      return;
    }

    // Schedule next scare
    if (scareTime >= nextScareAt) {
      const eligible = scareKeys.filter(k => scareDefinitions[k].cond());
      if (eligible.length > 0) {
        const key = pick(eligible);
        const def = scareDefinitions[key];
        def.start();
        activeScare = { def, elapsed: 0 };
      } else {
        nextScareAt = scareTime + rnd(10, 20);
      }
    }
  };

  // Doorway peek + physical retreat choreography when exploring corridor/wings
  const seenDoors = new Set();
  const triggerDoorSighting = (doorId, { respectGrace = false } = {}) => {
    if (disposed || seenDoors.has(doorId) || !E._ghost || huntTimer > 0 || jumpscareState) return;
    if (respectGrace && (scareTime < INITIAL_GRACE_SEC || cyclePhase === 'DORMANT')) return;
    seenDoors.add(doorId);
    const anchorMap = {
      control_door: 'corner_5a',
      annex_door: 'annex_door',
      south_wing_door: 'corner_5a',
      observation_door: 'observation_door',
      cryo_door: 'cryo_door',
      generator_door: 'chamber3_door',
      chamber3_door: 'chamber3_door',
      chamber3_north_door: 'chamber3_door',
      morgue_vault_door: 'cryo_door',
    };
    startDoorPeek({ anchorId: anchorMap[doorId] || 'observation_door', allowEscalate: false });
  };

  const triggerFlashOutage = (blackoutSec = rnd(5.0, 7.0)) => {
    if (disposed || !E.flashlight) return false;
    const dur = Math.max(5.0, Math.min(7.0, Number(blackoutSec) || 6.0));
    flashOutageState = {
      elapsed: 0,
      flickerDur: rnd(0.85, 1.25),
      blackoutDur: dur,
      recoverDur: 0.45,
      didDarkClick: false,
    };
    E._flashOutageActive = true;
    const lx = E.px?.() || 0;
    const lz = E.pz?.() || 0;
    A()?.staticBurst?.(lx, lz);
    A()?.relayClick?.(lx, lz);
    return true;
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    flashOutageState = null;
    E._flashOutageActive = false;
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    peekState = null;
    retreatState = null;
    jumpscareState = null;
    E.setCameraOverride?.(false);
    E.setTargetFov?.(72);
    if (E._ghost) {
      E._ghost.isJumpscaring = false;
      E._ghost.isHunting = false;
      E._ghost.scareOverride = false;
      E._ghost.behavior = 'DORMANT';
      E._ghost.root.visible = false;
      if (E._ghost.ghostGlow) E._ghost.ghostGlow.intensity = 0;
    }
    A()?.setChaseTension?.(0);
    A()?.setWeepingVolume?.(0);
    cam.remove(phantomFace);
    S.remove(entityMesh);
    phantomFace.geometry?.dispose();
    faceMat?.dispose();
    faceTexture?.dispose();
    entityMesh.geometry?.dispose();
    entityMat?.dispose();
  };

  const getGhostTelemetry = () => {
    const g = E._ghost?.root;
    const gx = g ? g.position.x : -12.5;
    const gz = g ? g.position.z : 9.2;
    const zone = getZoneForPosition(gx, gz);
    const incomingZone = upcomingAnchor ? getZoneForPosition(upcomingAnchor.x, upcomingAnchor.z) : null;
    const approaching = cyclePhase === 'DORMANT' && cycleTimer <= 8.0 && Boolean(upcomingAnchor);
    const state = jumpscareState
      ? 'JUMPSCARE'
      : huntTimer > 0
        ? 'HUNT'
        : peekState
          ? 'PEEK'
          : retreatState
            ? 'RETREAT'
            : approaching
              ? 'APPROACHING'
              : (cyclePhase === 'DORMANT' ? 'DORMANT' : (E._ghost?.behavior || 'MANIFESTING'));
    const activeAnim = E._ghost?.activeAnimName || (
      state === 'JUMPSCARE'
        ? 'JumpscareSnap'
        : state === 'PEEK'
          ? 'DoorPeek'
          : state === 'HUNT' || state === 'RETREAT'
            ? 'SprintLunge'
            : 'IdleStalk'
    );
    return {
      x: gx,
      z: gz,
      isHunting: Boolean(E._ghost?.isHunting || huntTimer > 0),
      isBehindReveal: huntStareTimer > 0,
      isJumpscaring: Boolean(jumpscareState || E._ghost?.isJumpscaring),
      isVisible: Boolean(E._ghost?.root?.visible),
      state,
      cyclePhase,
      cycleTimer: Number(cycleTimer.toFixed(1)),
      nextEventSec: Math.max(0, Math.ceil(cycleTimer)),
      incomingCam: cyclePhase === 'MANIFESTING' ? zone.camId : (incomingZone ? incomingZone.camId : null),
      activeAnim,
      camId: zone.camId,
      zoneLabel: zone.label,
    };
  };

  const isInGracePeriod = () => scareTime < INITIAL_GRACE_SEC || cyclePhase === 'DORMANT';

  return { update, tick: update, triggerCCTVHorror, triggerTeamNameInjection, maybeFragmentScare, triggerBreachHunt, triggerDoorSighting, startDoorPeek, triggerFlashOutage, markPhoneAnswered, isInGracePeriod, getGhostTelemetry, dispose };
}


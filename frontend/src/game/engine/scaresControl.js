// Paranormal Horror Director for Room 5: The Surveillance Morgue
// JS-03 (corner entity), JS-05 (CCTV impossible figure), JS-07 (team name injection),
// intercom crackle, footstep follower, fragment scare.
import * as THREE from 'three';
import * as X from './tex.js';

const rnd = (a, b) => a + Math.random() * (b - a);

export function createControlScares(E, handlers) {
  const { cam, sc: S, ref } = E;
  const A = () => handlers.audio;
  const flash = (color, opacity, durationMs) => handlers.onFlash?.(color, opacity, durationMs);

  // ── Timing State ──────────────────────────────────────────────────────────
  let scareTime = 0;
  let nextScareAt = rnd(8, 14);
  let activeScare = null;
  let roomEntryTime = 0;
  let hasEntryTriggered = false;
  let hasTeamNameInjected = false;
  let cornerEntityBuilding = false;
  let cornerEntityScale = 0;

  // Follower footstep state
  let lastMoveTime = 0;
  let lastPos = { x: E.px?.() || 0, z: E.pz?.() || 0 };
  let followerActive = false;
  let followerStepTimer = 0;

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
  entityMesh.position.set(-5.5, 0.5, -2.2); // far north-west corner
  entityMesh.scale.setScalar(0.01);
  entityMesh.visible = false;
  S.add(entityMesh);

  const fwd = () => [-Math.sin(E.yaw()), -Math.cos(E.yaw())];

  // ── Scare Definitions ─────────────────────────────────────────────────────
  const scareDefinitions = {
    // Monitor static burst with distant thud
    monitorBurst: {
      cond: () => true,
      start() {
        A()?.staticBurst?.(0, -2.2);
        setTimeout(() => A()?.drawerSlam?.(-5, 0), 350);
        flash('#004400', 0.4, 120);
        handlers.onScare?.('monitorBurst', 'A burst of static erupts from the monitor bank behind you.');
      },
      upd(t) { return t > 0.8; }
    },

    // Relay click cascade from east wall
    relayCascade: {
      cond: () => true,
      start() {
        const times = [0, 180, 320, 450, 560, 650];
        times.forEach(ms => setTimeout(() => A()?.relayClick?.(5.5, rnd(-2, 2)), ms));
        handlers.onScare?.('relayCascade', 'A sequence of relay clicks echoes from the rack as if something cycled through it.');
      },
      upd(t) { return t > 1.2; }
    },

    // Phantom face
    phantomFace: {
      cond: () => scareTime > 60,
      start() {
        phantomFace.visible = true;
        faceMat.opacity = 0;
        A()?.stinger?.('hard');
        flash('#000a00', 0.9, 80);
        handlers.onScare?.('phantomFace', 'Something was RIGHT THERE.');
      },
      upd(t) {
        if (t < 0.06) faceMat.opacity = Math.min(1, t / 0.06);
        else faceMat.opacity = Math.max(0, 1 - (t - 0.06) / 0.14);
        if (t > 0.22) { phantomFace.visible = false; return true; }
        return false;
      }
    },

    // Intercom crackle (also fires on entry)
    intercomActivate: {
      cond: () => scareTime > 15,
      start() {
        A()?.intercomCrackle?.();
        handlers.onScare?.('intercomActivate', 'The dead intercom beside the door briefly crackles to life — a voice, mid-sentence. Then nothing.');
      },
      upd(t) { return t > 2.5; }
    },

    // Static voice whisper
    whisperFromWall: {
      cond: () => scareTime > 30,
      start() {
        const [fx, fz] = fwd();
        const bx = E.px() - fx * 2.5;
        const bz = E.pz() - fz * 2.5;
        A()?.whisperRaspy?.(pick(['wrongroom', 'watching', 'inthere']), bx, bz);
        handlers.onScare?.('whisperFromWall', 'You hear something from behind you, like a voice trying to form words.');
      },
      upd(t) { return t > 1.5; }
    }
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const scareKeys = Object.keys(scareDefinitions);

  // ── Entry Intercom Trigger ─────────────────────────────────────────────────
  // Fires 3-5 seconds after first entering the room
  setTimeout(() => {
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
  setTimeout(startCornerEntity, 8 * 60 * 1000);

  // ── JS-05: Monitor Bank CCTV Horror ──────────────────────────────────────
  const triggerCCTVHorror = () => {
    // Find the "footage" monitor (index 4, center) on the engine's screen array
    if (!E._monitorScreens) return;
    const footageMonitor = E._monitorScreens.find(m => m.idx === 4);
    if (!footageMonitor) return;

    // Phase 1: static
    flash('#001100', 0.3, 100);
    A()?.staticBurst?.(0, -2.5);

    setTimeout(() => {
      if (!footageMonitor.mat) return;
      // Phase 2: show past footage (ghostly grid with vague figure)
      footageMonitor.mat.emissiveIntensity = 1.0;
      handlers.onScare?.('cctv', 'The center monitor flickers — for a moment, it shows a room that looks just like this one... but occupied.');
    }, 600);

    // Phase 3: impossible figure appears then static
    setTimeout(() => {
      A()?.staticBurst?.(0, -2.5);
      A()?.stinger?.('extreme');
      flash('#000800', 0.95, 200);
      handlers.onScare?.('cctvFigure', 'In the corner of the CCTV footage — something is standing directly behind where you are standing now.');
    }, 2800);

    setTimeout(() => {
      if (footageMonitor.mat) footageMonitor.mat.emissiveIntensity = 0.8;
    }, 4000);
  };

  // ── JS-07: Team Name Injection ────────────────────────────────────────────
  const triggerTeamNameInjection = () => {
    if (hasTeamNameInjected) return;
    hasTeamNameInjected = true;
    handlers.onTeamNameInjection?.();
  };

  // ── Fragment Scare (15% chance on any prop search) ────────────────────────
  const maybeFragmentScare = () => {
    if (Math.random() < 0.15) {
      const [fx, fz] = fwd();
      A()?.drawerSlam?.(E.px() + fx * 1.5, E.pz() + fz * 1.5);
      flash('#003300', 0.6, 150);
      handlers.onScare?.('fragmentScare', 'Something violently reacts to your search.');
    }
  };

  // ── Main Update Loop ──────────────────────────────────────────────────────
  const update = (dt, totalT) => {
    scareTime += dt;

    // Track player movement for follower
    const cx = E.px?.() ?? 0;
    const cz = E.pz?.() ?? 0;
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

    // JS-03 corner entity growth
    if (cornerEntityBuilding) {
      const growDuration = 2 * 60; // 2 more minutes of growth (started at 8min)
      cornerEntityScale = Math.min(1, cornerEntityScale + dt / growDuration);
      entityMesh.scale.setScalar(0.01 + cornerEntityScale * 2.5);
      entityMat.opacity = cornerEntityScale * 0.7;

      if (cornerEntityScale >= 1) {
        // LUNGE
        cornerEntityBuilding = false;
        A()?.stinger?.('extreme');
        flash('#000a00', 1.0, 300);
        handlers.onScare?.('cornerLunge', 'The mass in the corner surges toward you.');
        setTimeout(() => {
          entityMesh.visible = false;
          entityMesh.scale.setScalar(0.01);
          entityMat.opacity = 0;
          cornerEntityScale = 0;
        }, 1200);
      }
    }

    // Active scare update
    if (activeScare) {
      activeScare.elapsed += dt;
      if (activeScare.def.upd(activeScare.elapsed)) {
        activeScare = null;
        nextScareAt = scareTime + rnd(25, 55);
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

  return { update, triggerCCTVHorror, triggerTeamNameInjection, maybeFragmentScare };
}


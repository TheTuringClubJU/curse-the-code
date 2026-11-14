// Paranormal Horror Director for Room 4: The Rotting Archive
// Coordinates dynamic psychological tension, stationary follower entity, and visceral jumpscares.
import * as THREE from 'three';
import * as X from './tex.js';

const rnd = (a, b) => a + Math.random() * (b - a);

export function createRecordsScares(E, handlers) {
  const { S, cam, sc, ref } = E;
  if (!cam.parent && S) S.add(cam);
  const A = () => handlers.audio;
  const flash = (color, opacity, durationMs) => handlers.onFlash?.(color, opacity, durationMs);
  const triggerGlassCrack = () => handlers.onGlassCrack?.();

  let activeScare = null;
  let scareTime = 0;
  // First jumpscare strikes within 5 to 8 seconds of entering!
  let nextScareAt = rnd(22, 35);

  // Stalker entity & Phantom Face state
  const stalker = ref.stalkerEntity;
  let lastMoveTime = 0;
  let lastPos = { x: E.px?.() || 0, z: E.pz?.() || 0 };
  let stalkerActive = false;

  // In-your-face Phantom Screaming Face attached to camera for visceral jumpscares
  const faceTexture = X.tex(X.faceC({ eye: '#ff1828', glow: true, seed: 3, mouth: true }));
  const faceMat = new THREE.MeshBasicMaterial({
    map: faceTexture,
    transparent: true,
    fog: false,
    depthWrite: false
  });
  const phantomFace = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.05), faceMat);
  phantomFace.position.set(0, 0, -1.2);
  phantomFace.visible = false;
  phantomFace.userData.np = 1;
  cam.add(phantomFace);

  const fwd = () => [-Math.sin(E.yaw()), -Math.cos(E.yaw())];

  const scareDefinitions = {
    // 1. Drawer Slam: violent metal crash + visor crack
    drawerSlam: {
      cond: () => true,
      start() {
        const [fx, fz] = fwd();
        const sx = E.px() + fx * 1.5;
        const sz = E.pz() + fz * 1.5;
        A()?.drawerSlam?.(sx, sz);
        A()?.whisperRaspy?.('seeyou', sx, sz);
        E.shake(1.8, 0.7);
        flash('#ffeebb', 0.8, 180);
        triggerGlassCrack();
        handlers.onScare?.('drawerSlam', 'A heavy metal filing drawer slammed violently shut behind you!');
      },
      upd(t) {
        return t > 1.2;
      }
    },

    // 2. Blackout Surge: pitch darkness + red-eyed demon stalker manifesting right in player's face
    blackoutSurge: {
      cond: () => true,
      start() {
        sc.v = 0.02; // Pitch darkness
        A()?.blackoutSurge?.();
        A()?.heartbeat?.(true);
        E.shake(1.2, 0.6);
        flash('#000000', 0.98, 250);
        handlers.onScare?.('blackoutSurge', 'Sub-station power failure! The vault breaker tripped!');

        if (stalker) {
          const [fx, fz] = fwd();
          stalker.position.set(E.px() + fx * 1.8, 1.4, E.pz() + fz * 1.8);
          stalker.quaternion.copy(cam.quaternion);
          stalker.visible = true;
        }
      },
      upd(t) {
        if (t > 1.2 && t < 1.45) {
          sc.v = 0.9;
          if (stalker) stalker.visible = true;
          flash('#ff1111', 0.5, 100);
        } else if (t >= 1.45 && t < 1.7) {
          sc.v = 0.03;
        } else if (t >= 1.7 && t < 1.95) {
          sc.v = 0.85;
          flash('#ff0000', 0.55, 120);
        } else if (t >= 1.95) {
          sc.v = 1.0;
          if (stalker) stalker.visible = false;
          A()?.heartbeat?.(false);
          E.shake(0.5, 0.3);
          return true;
        }
        return false;
      }
    },

    // 3. Phantom Lunge: grotesque screaming mutilated face lunges straight into the camera!
    phantomLunge: {
      cond: () => true,
      start() {
        phantomFace.scale.set(0.35, 0.35, 0.35);
        phantomFace.position.set(0, -0.05, -1.45);
        phantomFace.rotation.set(0, 0, 0);
        phantomFace.visible = true;
        A()?.screamingStinger?.(1.38);
        A()?.drawerSlam?.(E.px(), E.pz());
        E.shake(2.3, 0.82);
        flash('#c40008', 0.92, 280);
        triggerGlassCrack();
        handlers.onScare?.('phantomLunge', 'A screaming ghostly apparition lunged directly at your visor!');
      },
      upd(t) {
        const k = Math.min(1, t / 0.14);
        phantomFace.position.z = -1.45 + 1.12 * k;
        phantomFace.position.x = Math.sin(t * 82) * 0.04;
        phantomFace.rotation.z = Math.sin(t * 70) * 0.15;
        phantomFace.scale.set(0.35 + 1.42 * k, 0.35 + 1.42 * k, 1);
        if (t > 0.58) {
          phantomFace.visible = false;
          return true;
        }
        return false;
      }
    },

    // 4. Stalker Glance: shadow entity hovering in peripheral vision with whisper stinger
    stalkerGlance: {
      cond: () => true,
      start() {
        if (stalker) {
          const [fx, fz] = fwd();
          const sideX = -fz * 2.2;
          const sideZ = fx * 2.2;
          stalker.position.set(E.px() + fx * 1.8 + sideX, 1.4, E.pz() + fz * 1.8 + sideZ);
          stalker.quaternion.copy(cam.quaternion);
          stalker.visible = true;
        }
        A()?.screamingStinger?.(0.8);
        A()?.whisperRaspy?.('behind', E.px(), E.pz());
        E.shake(0.8, 0.45);
        flash('#300000', 0.5, 200);
        handlers.onScare?.('stalkerGlance', 'A tall shadowy entity is watching you from the dark...');
      },
      upd(t) {
        if (stalker) {
          stalker.position.y += t * 0.2;
        }
        if (t > 0.9) {
          if (stalker) stalker.visible = false;
          return true;
        }
        return false;
      }
    },

    // 5. Overhead Pipe Burst: high pressure industrial explosion + tremor
    pipeBurst: {
      cond: () => true,
      start() {
        const px = E.px() + (Math.random() - 0.5) * 2;
        const pz = E.pz() + (Math.random() - 0.5) * 2;
        A()?.pipeBurst?.(px, pz);
        E.shake(1.5, 0.7);
        flash('#ffffff', 0.8, 160);
        triggerGlassCrack();
        handlers.onScare?.('pipeBurst', 'High-pressure overhead corroded steam pipe exploded!');
      },
      upd(t) {
        return t > 1.5;
      }
    },

    // 6. Stationary Follower Entity (Wet footsteps creeping directly behind listener)
    stationaryStalker: {
      cond: () => true,
      start() {
        A()?.followerFootstepsBehind?.();
        A()?.whisperRaspy?.('behind', E.px(), E.pz());
        A()?.heartbeat?.(true);
        handlers.onScare?.('stationaryStalker', 'You feel a cold breath on your neck... Something is standing right behind you!');
        if (stalker) {
          const [fx, fz] = fwd();
          stalker.position.set(E.px() - fx * 1.5, 1.4, E.pz() - fz * 1.5);
          stalker.quaternion.copy(cam.quaternion);
          stalker.visible = true;
        }
        setTimeout(() => {
          E.shake(1.1, 0.5);
          flash('#400000', 0.65, 250);
          A()?.screamingStinger?.(0.7);
        }, 1600);
      },
      upd(t) {
        if (t > 3.2) {
          if (stalker) stalker.visible = false;
          A()?.heartbeat?.(false);
          return true;
        }
        return false;
      }
    }
  };

  const trigger = (scareName) => {
    if (!scareDefinitions[scareName]) return;
    activeScare = Object.create(scareDefinitions[scareName]);
    scareTime = 0;
    activeScare.name = scareName;
    activeScare.start();
  };

  // Keyboard debug & manual scare controls (Keys 1-6)
  const onKeyScare = (e) => {
    const tag = (e.target?.tagName || document.activeElement?.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
    if (e.code === 'Digit1' || e.key === '1') trigger('drawerSlam');
    if (e.code === 'Digit2' || e.key === '2') trigger('blackoutSurge');
    if (e.code === 'Digit3' || e.key === '3') trigger('phantomLunge');
    if (e.code === 'Digit4' || e.key === '4') trigger('stalkerGlance');
    if (e.code === 'Digit5' || e.key === '5') trigger('pipeBurst');
    if (e.code === 'Digit6' || e.key === '6') trigger('stationaryStalker');
  };
  window.addEventListener('keydown', onKeyScare);

  return {
    trigger,
    triggerDoorScare: () => trigger('phantomLunge'),
    dispose() {
      window.removeEventListener('keydown', onKeyScare);
      if (phantomFace.parent) phantomFace.parent.remove(phantomFace);
    },
    tick(dt, totalTime) {
      const currPos = { x: E.px?.() || 0, z: E.pz?.() || 0 };
      const distMoved = Math.hypot(currPos.x - lastPos.x, currPos.z - lastPos.z);

      if (distMoved > 0.05) {
        lastMoveTime = totalTime;
        lastPos = currPos;
        stalkerActive = false;
      } else {
        // Player has been stationary for 7+ seconds: Follower Entity creeps up from behind!
        if (totalTime - lastMoveTime > 7.0 && !stalkerActive && !activeScare) {
          stalkerActive = true;
          trigger('stationaryStalker');
          // Reset timer so it triggers again every 8s if player continues standing still
          lastMoveTime = totalTime;
        }
      }

      // Progress active jump scare
      if (activeScare) {
        scareTime += dt;
        if (activeScare.upd(scareTime)) {
          activeScare = null;
          // Subsequent jumpscares trigger every 38 to 58 seconds
          nextScareAt = totalTime + rnd(38, 58);
        }
        return;
      }

      // Schedule periodic psychological jumpscares
      if (totalTime >= nextScareAt && !E.paused) {
        const scareKeys = ['drawerSlam', 'blackoutSurge', 'phantomLunge', 'stalkerGlance', 'pipeBurst'];
        const chosen = scareKeys[Math.floor(Math.random() * scareKeys.length)];
        trigger(chosen);
      }
    }
  };
}

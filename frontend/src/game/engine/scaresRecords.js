// Paranormal Horror Director for Room 4: The Rotting Archive
// Coordinates dynamic psychological tension, 3D articulated stalker entity, and visceral jumpscares.
import * as THREE from 'three';
import * as X from './tex.js';
import * as XR from './texRecords.js';

const rnd = (a, b) => a + Math.random() * (b - a);

/**
 * Builds the articulated 3D Archive Stalker Creature matching Reference 2:
 * A tall (2.3m), slender, pale ashen humanoid with sunken eye cavities, elongated drooping limbs,
 * and articulated bones for frantic running strides and visceral jumpscares.
 */
function buildStalker3D(S) {
  const stalker = new THREE.Group();
  stalker.visible = false;
  stalker.userData.np = 1;

  // Pale ashen corpse skin material
  const skinTex = XR.tex(XR.stalkerSkinTexture());
  const skinMat = new THREE.MeshStandardMaterial({
    map: skinTex,
    roughness: 0.82,
    metalness: 0.08,
    color: 0xdedede
  });

  const hollowEyeMat = new THREE.MeshBasicMaterial({ color: 0x050101 });
  const redGlintMat = new THREE.MeshBasicMaterial({ color: 0xff1010 });

  // 1. Torso & Spine
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.45, 0);
  stalker.add(torsoGroup);

  // Emaciated ribbed chest
  const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.22), skinMat);
  chestMesh.castShadow = true;
  chestMesh.userData.np = 1;
  torsoGroup.add(chestMesh);

  // Exposed spinal column ridge
  const spineMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.68, 0.05), skinMat);
  spineMesh.position.set(0, 0, -0.12);
  spineMesh.userData.np = 1;
  torsoGroup.add(spineMesh);

  // Elongated neck
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.32, 8), skinMat);
  neckMesh.position.set(0, 0.48, 0.02);
  neckMesh.castShadow = true;
  neckMesh.userData.np = 1;
  torsoGroup.add(neckMesh);

  // 2. Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.68, 0.04);
  torsoGroup.add(headGroup);

  // Elongated distorted skull
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), skinMat);
  cranium.scale.set(0.9, 1.35, 1.1);
  cranium.castShadow = true;
  cranium.userData.np = 1;
  headGroup.add(cranium);

  // Deep sunken hollow eye sockets
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), hollowEyeMat);
  eyeL.position.set(-0.065, 0.02, 0.16);
  eyeL.scale.set(1, 1.2, 0.4);
  eyeL.userData.np = 1;
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.065;
  headGroup.add(eyeL, eyeR);

  // Faint glowing crimson reflective glints in eyes
  const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), redGlintMat);
  glintL.position.set(-0.065, 0.02, 0.18);
  glintL.userData.np = 1;
  const glintR = glintL.clone();
  glintR.position.x = 0.065;
  headGroup.add(glintL, glintR);

  // Distended gaping jaw locked in a silent shriek
  const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.16), skinMat);
  jawMesh.position.set(0, -0.16, 0.1);
  jawMesh.rotation.x = 0.35;
  jawMesh.userData.np = 1;
  headGroup.add(jawMesh);

  // Black hollow mouth cavity
  const mouthHole = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.08), hollowEyeMat);
  mouthHole.position.set(0, -0.12, 0.16);
  mouthHole.userData.np = 1;
  headGroup.add(mouthHole);

  // 3. Articulated Limbs - Elongated Arms (reaching down past knees)
  const mkArm = (isLeft) => {
    const shoulderGroup = new THREE.Group();
    const sign = isLeft ? -1 : 1;
    shoulderGroup.position.set(sign * 0.24, 0.3, 0);
    torsoGroup.add(shoulderGroup);

    // Upper arm
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.58, 8), skinMat);
    upperArm.position.set(0, -0.28, 0);
    upperArm.castShadow = true;
    upperArm.userData.np = 1;
    shoulderGroup.add(upperArm);

    // Elbow pivot
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(0, -0.56, 0);
    shoulderGroup.add(elbowGroup);

    // Elongated forearm
    const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.035, 0.65, 8), skinMat);
    foreArm.position.set(0, -0.32, 0);
    foreArm.castShadow = true;
    foreArm.userData.np = 1;
    elbowGroup.add(foreArm);

    // Skeletal clawed fingers
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.65, 0);
    elbowGroup.add(handGroup);

    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.22, 6), skinMat);
      finger.position.set((f - 1.5) * 0.024, -0.1, 0);
      finger.rotation.z = (f - 1.5) * 0.12;
      finger.userData.np = 1;
      handGroup.add(finger);
    }

    return { shoulderGroup, elbowGroup };
  };

  const leftArm = mkArm(true);
  const rightArm = mkArm(false);

  // 4. Articulated Limbs - Slender Legs
  const mkLeg = (isLeft) => {
    const hipGroup = new THREE.Group();
    const sign = isLeft ? -1 : 1;
    hipGroup.position.set(sign * 0.14, -0.36, 0);
    torsoGroup.add(hipGroup);

    // Thigh
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.72, 8), skinMat);
    thigh.position.set(0, -0.35, 0);
    thigh.castShadow = true;
    thigh.userData.np = 1;
    hipGroup.add(thigh);

    // Knee pivot
    const kneeGroup = new THREE.Group();
    kneeGroup.position.set(0, -0.7, 0);
    hipGroup.add(kneeGroup);

    // Shin / Calve
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.75, 8), skinMat);
    shin.position.set(0, -0.36, 0);
    shin.castShadow = true;
    shin.userData.np = 1;
    kneeGroup.add(shin);

    // Splayed barefoot
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.26), skinMat);
    foot.position.set(0, -0.73, 0.08);
    foot.castShadow = true;
    foot.userData.np = 1;
    kneeGroup.add(foot);

    return { hipGroup, kneeGroup };
  };

  const leftLeg = mkLeg(true);
  const rightLeg = mkLeg(false);

  S.add(stalker);

  return {
    group: stalker,
    torsoGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    animateSprint(phase, t) {
      // Frantic sprint gait: violent arm swinging, pumping knees, aggressive hunched posture
      torsoGroup.rotation.x = 0.38 + Math.sin(phase * 2) * 0.08;
      torsoGroup.position.y = 1.45 + Math.abs(Math.sin(phase)) * 0.12;

      // Arms swing in violent opposition
      leftArm.shoulderGroup.rotation.x = Math.sin(phase) * 1.35;
      rightArm.shoulderGroup.rotation.x = -Math.sin(phase) * 1.35;
      leftArm.elbowGroup.rotation.x = -0.4 + Math.max(0, -Math.sin(phase)) * 0.8;
      rightArm.elbowGroup.rotation.x = -0.4 + Math.max(0, Math.sin(phase)) * 0.8;

      // Legs pump in deep strides
      leftLeg.hipGroup.rotation.x = -Math.sin(phase) * 1.25;
      rightLeg.hipGroup.rotation.x = Math.sin(phase) * 1.25;
      leftLeg.kneeGroup.rotation.x = Math.max(0, Math.sin(phase)) * 1.1;
      rightLeg.kneeGroup.rotation.x = Math.max(0, -Math.sin(phase)) * 1.1;

      // Head shakes and jitters erratically
      headGroup.rotation.z = Math.sin(t * 38) * 0.18;
      headGroup.rotation.y = Math.sin(t * 26) * 0.14;
      headGroup.rotation.x = -0.15 + Math.sin(t * 18) * 0.12;
    },
    resetPose() {
      torsoGroup.rotation.set(0, 0, 0);
      torsoGroup.position.set(0, 1.45, 0);
      headGroup.rotation.set(0, 0, 0);
      leftArm.shoulderGroup.rotation.set(0, 0, 0.12);
      rightArm.shoulderGroup.rotation.set(0, 0, -0.12);
      leftArm.elbowGroup.rotation.set(-0.15, 0, 0);
      rightArm.elbowGroup.rotation.set(-0.15, 0, 0);
      leftLeg.hipGroup.rotation.set(0, 0, 0);
      rightLeg.hipGroup.rotation.set(0, 0, 0);
      leftLeg.kneeGroup.rotation.set(0, 0, 0);
      rightLeg.kneeGroup.rotation.set(0, 0, 0);
    }
  };
}

export function createRecordsScares(E, handlers) {
  const { cam, sc, S } = E;
  const A = () => handlers.audio;
  const flash = (color, opacity, durationMs) => handlers.onFlash?.(color, opacity, durationMs);
  const triggerGlassCrack = () => handlers.onGlassCrack?.();

  let activeScare = null;
  let scareTime = 0;
  // First jumpscare strikes within 5 to 8 seconds of entering!
  let nextScareAt = rnd(5, 8);

  // 3D Archive Stalker Creature Rig (Reference 2)
  const stalkerRig = buildStalker3D(S);
  const stalker = stalkerRig.group;

  let lastMoveTime = 0;
  let lastPos = { x: E.px?.() || 0, z: E.pz?.() || 0 };
  let stalkerActive = false;

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

    // 2. Blackout Surge: pitch darkness + 3D Stalker creature lunges directly into player's face
    blackoutSurge: {
      cond: () => true,
      start() {
        sc.v = 0.02; // Pitch darkness
        A()?.blackoutSurge?.();
        A()?.heartbeat?.(true);
        E.shake(1.2, 0.6);
        flash('#000000', 0.98, 250);
        handlers.onScare?.('blackoutSurge', 'Sub-station power failure! The vault breaker tripped!');

        const [fx, fz] = fwd();
        stalker.position.set(E.px() + fx * 2.2, 0, E.pz() + fz * 2.2);
        stalker.lookAt(E.px(), 1.45, E.pz());
        stalkerRig.resetPose();
        stalker.visible = true;
      },
      upd(t) {
        if (t > 1.2 && t < 1.45) {
          sc.v = 0.9;
          stalker.visible = true;
          flash('#ff1111', 0.5, 100);
        } else if (t >= 1.45 && t < 1.7) {
          sc.v = 0.03;
        } else if (t >= 1.7 && t < 1.95) {
          sc.v = 0.85;
          flash('#ff0000', 0.55, 120);
        } else if (t >= 1.95) {
          sc.v = 1.0;
          stalker.visible = false;
          A()?.heartbeat?.(false);
          E.shake(0.5, 0.3);
          return true;
        }
        return false;
      }
    },

    // 3. Phantom Lunge (Re-engineered to 100% 3D Creature Sprint Attack matching Reference 2):
    // The pale, emaciated 3D creature spawns in the darkness down the corridor and sprints violently
    // directly at the player at 10m/s with heavy echoing wet footsteps and a demonic screech!
    phantomLunge: {
      cond: () => true,
      spawnX: 0,
      spawnZ: 0,
      targetX: 0,
      targetZ: 0,
      duration: 0.85,
      start() {
        const [fx, fz] = fwd();
        const px = E.px?.() || 0;
        const pz = E.pz?.() || 0;

        // Spawn 7.2 meters directly in front of the player
        this.spawnX = px + fx * 7.2;
        this.spawnZ = pz + fz * 7.2;
        this.targetX = px + fx * 0.75;
        this.targetZ = pz + fz * 0.75;

        stalker.position.set(this.spawnX, 0, this.spawnZ);
        stalker.lookAt(px, 1.45, pz);
        stalkerRig.resetPose();
        stalker.visible = true;

        // Audio: Demonic screech stinger + heavy, rapid accelerating footsteps!
        A()?.creatureSprintRushing?.(this.spawnX, this.spawnZ, px, pz, this.duration * 1000);
        E.shake(1.5, 0.3);
        flash('#2a0000', 0.45, 120);
        handlers.onScare?.('phantomLunge', 'The Archive Stalker lunged out of the darkness straight at you!');
      },
      upd(t) {
        const frac = Math.min(1.0, t / this.duration);
        // Non-linear acceleration rushing towards the camera
        const moveFrac = Math.pow(frac, 1.4);

        const curX = this.spawnX + (this.targetX - this.spawnX) * moveFrac;
        const curZ = this.spawnZ + (this.targetZ - this.spawnZ) * moveFrac;
        stalker.position.set(curX, 0, curZ);

        // Animate high-speed sprinting gait
        stalkerRig.animateSprint(t * 26, t);

        // Mounting violent camera tremor as creature nears
        E.shake(1.2 + frac * 2.2, 0.2);

        // When creature arrives right in player's face (< 0.8m)
        if (frac >= 1.0) {
          stalker.visible = false;
          stalkerRig.resetPose();
          flash('#8b0000', 0.92, 220);
          triggerGlassCrack();
          E.shake(2.8, 0.6);
          return true;
        }
        return false;
      }
    },

    // 4. Stalker Glance: 3D shadow entity hovering in peripheral vision with whisper stinger
    stalkerGlance: {
      cond: () => true,
      start() {
        const [fx, fz] = fwd();
        const sideX = -fz * 2.4;
        const sideZ = fx * 2.4;
        const px = E.px?.() || 0;
        const pz = E.pz?.() || 0;

        stalker.position.set(px + fx * 2.5 + sideX, 0, pz + fz * 2.5 + sideZ);
        stalker.lookAt(px, 1.45, pz);
        stalkerRig.resetPose();
        stalker.visible = true;

        A()?.screamingStinger?.(0.85);
        A()?.whisperRaspy?.('behind', px, pz);
        E.shake(0.8, 0.45);
        flash('#300000', 0.5, 200);
        handlers.onScare?.('stalkerGlance', 'A tall shadowy entity is watching you from the dark...');
      },
      upd(t) {
        stalker.position.y += t * 0.15;
        if (t > 0.9) {
          stalker.visible = false;
          stalkerRig.resetPose();
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
        const px = E.px?.() || 0;
        const pz = E.pz?.() || 0;
        const [fx, fz] = fwd();

        A()?.followerFootstepsBehind?.();
        A()?.whisperRaspy?.('behind', px, pz);
        A()?.heartbeat?.(true);
        handlers.onScare?.('stationaryStalker', 'You feel a cold breath on your neck... Something is standing right behind you!');

        stalker.position.set(px - fx * 1.8, 0, pz - fz * 1.8);
        stalker.lookAt(px, 1.45, pz);
        stalkerRig.resetPose();
        stalker.visible = true;

        setTimeout(() => {
          E.shake(1.1, 0.5);
          flash('#400000', 0.65, 250);
          A()?.screamingStinger?.(0.7);
        }, 1600);
      },
      upd(t) {
        if (t > 3.2) {
          stalker.visible = false;
          stalkerRig.resetPose();
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
    dispose() {
      window.removeEventListener('keydown', onKeyScare);
      if (stalker.parent) stalker.parent.remove(stalker);
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
          lastMoveTime = totalTime;
        }
      }

      // Progress active jump scare
      if (activeScare) {
        scareTime += dt;
        if (activeScare.upd(scareTime)) {
          activeScare = null;
          // Subsequent jumpscares trigger every 12 to 20 seconds
          nextScareAt = totalTime + rnd(12, 20);
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

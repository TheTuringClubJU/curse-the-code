// Paranormal Horror Director for Room 1: RE4 Village Cabin (r100 / r102 / r101)
// Authentic RE4 tension: wind rattling broken shutters, woodstove embers crackling,
// heavy footstep echoes behind the player, violent thumps from the cellar trapdoor.
import * as THREE from 'three';
import * as X from './tex.js';

const rnd = (a, b) => a + Math.random() * (b - a);

export function createCabinScares(E, handlers) {
  const S = E.S;
  const cam = E.cam;
  const ref = E.ref;
  const A = () => handlers.audio;
  const flash = (color, opacity, durationMs) => handlers.onFlash?.(color, opacity, durationMs);

  let scareTime = 0;
  let nextScareAt = rnd(12, 22);
  let activeScare = null;

  // Phantom face for window/wardrobe jump scares
  const faceTexture = X.tex(X.faceC({ seed: 3, mouth: true, glow: true, eye: '#ff2211' }));
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true, fog: false, depthWrite: false });
  const phantomFace = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), faceMat);
  phantomFace.position.set(0, 0, -1.05);
  phantomFace.visible = false;
  phantomFace.userData.np = 1;
  cam.add(phantomFace);

  // Shadow figure outside the window
  const figMat = new THREE.MeshBasicMaterial({ color: 0x020305, transparent: true, opacity: 0.85 });
  const shadowFigure = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.2), figMat);
  shadowFigure.position.set(-6.1, 1.5, -1.2);
  shadowFigure.visible = false;
  S.add(shadowFigure);

  const scareDefinitions = {
    // 1. Wind rattles broken window shutters violently
    windowWind: {
      cond: () => true,
      start() {
        A()?.thump?.(-5.5, -1.2);
        A()?.stinger?.(0.5);
        E.shake?.(0.3, 0.4);
        shadowFigure.visible = true;
        setTimeout(() => { shadowFigure.visible = false; }, 1800);
        handlers.onScare?.('windowWind', 'A freezing gale slams against the broken window slats. A gaunt silhouette passes outside.');
      },
      upd(t) { return t > 2.0; }
    },

    // 2. Cellar trapdoor knocks & scratches from beneath floor
    cellarScratch: {
      cond: () => true,
      start() {
        A()?.whisper?.('behind', 4.2, -1.8);
        A()?.bang?.(4.2, -1.8);
        E.shake?.(0.45, 0.3);
        handlers.onScare?.('cellarScratch', 'Violent scratching and muffled thuds vibrate through the floorboards from the locked cellar.');
      },
      upd(t) { return t > 1.5; }
    },

    // 3. Woodstove embers flare and hiss
    stoveFlare: {
      cond: () => true,
      start() {
        A()?.stinger?.(0.4);
        flash('#ff4400', 0.25, 140);
        handlers.onScare?.('stoveFlare', 'A gust down the chimney stovepipe sends glowing orange embers crackling onto the hearth.');
      },
      upd(t) { return t > 1.0; }
    },

    // 4. Creaking floorboard footstep follower right behind player
    footstepFollower: {
      cond: () => true,
      start() {
        const px = E.px?.() || 0;
        const pz = E.pz?.() || 0;
        A()?.footsteps?.(px - 1.2, pz - 1.2, px - 0.4, pz - 0.4);
        A()?.whisper?.('seeyou', px - 0.6, pz - 0.6);
        E.shake?.(0.25, 0.35);
        handlers.onScare?.('footstepFollower', 'Heavy, uneven footsteps shuffle on the rotting floorboards directly behind you.');
      },
      upd(t) { return t > 1.8; }
    },

    // 5. Wardrobe / Window Phantom Lunge
    phantomLunge: {
      cond: () => true,
      start() {
        phantomFace.visible = true;
        A()?.screech?.(0, 0);
        A()?.stinger?.(1.0);
        flash('#900000', 0.5, 200);
        E.shake?.(0.8, 0.6);
        handlers.onScare?.('phantomLunge', 'A hollow, pale face flashes in front of your eyes with a piercing shriek!');
      },
      upd(t) {
        if (t > 0.4) {
          phantomFace.visible = false;
          return true;
        }
        return false;
      }
    }
  };

  const scareKeys = Object.keys(scareDefinitions);

  const trigger = (name) => {
    if (scareDefinitions[name]) {
      activeScare = Object.create(scareDefinitions[name]);
      activeScare.start();
    }
  };

  return {
    trigger,
    tick(dt, totalTime) {
      scareTime += dt;
      if (activeScare) {
        if (activeScare.upd(scareTime)) {
          activeScare = null;
        }
      }

      if (scareTime >= nextScareAt && !activeScare) {
        const randomKey = scareKeys[Math.floor(Math.random() * scareKeys.length)];
        trigger(randomKey);
        nextScareAt = scareTime + rnd(25, 50);
      }
    }
  };
}

// 3D Procedural Scene Builder for Room 5: The Surveillance Morgue
// High-fidelity procedural Three.js horror environment with zero external models.
import * as THREE from 'three';
import * as X from './tex.js';
import * as XC from './texControl.js';
import { buildDoll } from './scene.js';

export function buildControlScene(E) {
  const { S, add, solid, anim, interact, flick, lightRig, glow, ref } = E;
  const [W, H, D] = [12, 3.0, 6]; // Observation bunker proportions

  // ── Shared Material Palette ───────────────────────────────────────────────
  const wallTex  = XC.tex(XC.concreteWall(), { repeat: [5, 2] });
  const wallMat  = new THREE.MeshStandardMaterial({ map: wallTex, bumpMap: wallTex, bumpScale: 0.5, roughness: 0.9, metalness: 0.05 });

  const floorTex = XC.tex(XC.diamondPlateFloor(), { repeat: [6, 3] });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, bumpMap: floorTex, bumpScale: 0.45, roughness: 0.4, metalness: 0.65 });

  const ceilTex  = XC.tex(XC.dampCeiling(), { repeat: [4, 2] });
  const ceilMat  = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.95, metalness: 0.0 });

  const rustTex  = XC.tex(XC.rustMetal(), { repeat: [2, 2] });
  const rustMat  = new THREE.MeshStandardMaterial({ map: rustTex, bumpMap: rustTex, bumpScale: 0.4, roughness: 0.75, metalness: 0.5 });

  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x0f1315, roughness: 0.55, metalness: 0.85 });
  const blackMat     = new THREE.MeshStandardMaterial({ color: 0x050708, roughness: 0.75, metalness: 0.3 });
  const glassMat     = new THREE.MeshStandardMaterial({ color: 0x0a1a0c, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.4 });
  const amberBulbMat = new THREE.MeshStandardMaterial({ color: 0xc47a00, emissive: new THREE.Color(0xc47a00), emissiveIntensity: 1.4, roughness: 0.5, metalness: 0.0 });
  const cageMat      = new THREE.MeshStandardMaterial({ color: 0x181c18, roughness: 0.6, metalness: 0.75 });

  const plasticTex = XC.tex(XC.quarantinePlastic(), { repeat: [3, 4] });
  const plasticMat = new THREE.MeshStandardMaterial({ map: plasticTex, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.0, side: THREE.DoubleSide });

  const rackTex  = XC.tex(XC.rackFace(), { repeat: [1, 3] });
  const rackMat  = new THREE.MeshStandardMaterial({ map: rackTex, roughness: 0.5, metalness: 0.75 });

  // ── Geometry Helpers ──────────────────────────────────────────────────────
  const mkBox = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true; return m;
  };
  const mkCyl = (rt, rb, h, seg, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true; return m;
  };
  const mkSphere = (r, ws, hs, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
    m.position.set(x, y, z); return m;
  };

  // ── Room Shell ────────────────────────────────────────────────────────────
  const floor = mkBox(W, 0.1, D, floorMat, 0, -0.05, 0);
  floor.receiveShadow = true;
  add(floor);

  // Ceiling
  const ceiling = mkBox(W, 0.1, D, ceilMat, 0, H + 0.05, 0);
  add(ceiling);

  // Shell Walls
  const northWall = mkBox(W, H, 0.15, blackMat, 0, H/2, -D/2);
  add(northWall);
  const southWall = mkBox(W, H, 0.15, wallMat,  0, H/2,  D/2);
  add(southWall);
  const eastWall  = mkBox(0.15, H, D, wallMat, W/2, H/2,  0);
  add(eastWall);
  const westWall  = mkBox(0.15, H, D, wallMat,-W/2, H/2,  0);
  add(westWall);

  // Room Wall Collision Solids
  solid(-W/2, W/2, -D/2, -D/2 + 0.35); // North Wall
  solid(-W/2, W/2, D/2 - 0.35, D/2);   // South Wall
  solid(-W/2, -W/2 + 0.35, -D/2, D/2); // West Wall
  solid(W/2 - 0.35, W/2, -D/2, D/2);   // East Wall

  // ── Hazard Warning Decal (above monitor bank) ─────────────────────────────
  const hazardCanvas = document.createElement('canvas');
  hazardCanvas.width = 512; hazardCanvas.height = 128;
  const hctx = hazardCanvas.getContext('2d');
  hctx.fillStyle = '#0a0d0a'; hctx.fillRect(0, 0, 512, 128);
  hctx.fillStyle = '#c47a00';
  for (let s = -128; s < 512; s += 48) {
    hctx.beginPath();
    hctx.moveTo(s, 0); hctx.lineTo(s + 24, 0); hctx.lineTo(s - 16, 128); hctx.lineTo(s - 40, 128);
    hctx.fill();
  }
  hctx.fillStyle = '#111'; hctx.fillRect(40, 24, 432, 80);
  hctx.strokeStyle = '#c47a00'; hctx.lineWidth = 3; hctx.strokeRect(40, 24, 432, 80);
  hctx.fillStyle = '#ffb338'; hctx.font = 'bold 20px monospace'; hctx.textAlign = 'center';
  hctx.fillText('⚠ CAUTION: SECTOR 5 — SURVEILLANCE MORGUE', 256, 56);
  hctx.fillStyle = '#a0a0a0'; hctx.font = '12px monospace';
  hctx.fillText('ELECTROMAGNETIC ISOLATION PROTOCOL ACTIVE', 256, 84);
  const hazardTex = new THREE.CanvasTexture(hazardCanvas);
  const hazardSign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.6 }));
  hazardSign.position.set(0, H - 0.55, -D/2 + 0.12);
  add(hazardSign);

  // ── Entrance Door (South wall, offset left) ───────────────────────────────
  const doorFrame = mkBox(1.1, 2.3, 0.18, rustMat, -4.5, 1.15, D/2 - 0.02);
  add(doorFrame);
  const doorLeaf  = mkBox(0.95, 2.1, 0.08, darkMetalMat, -4.5, 1.05, D/2 - 0.05);
  doorLeaf.userData.id = 'control_door';
  interact(doorLeaf, 'control_door');
  add(doorLeaf);

  // Wire viewport on door
  const viewport = mkBox(0.25, 0.25, 0.09, glassMat, -4.5, 1.6, D/2 - 0.08);
  add(viewport);
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.9, roughness: 0.4 });
  add(mkBox(0.25, 0.015, 0.02, wireMat, -4.5, 1.6, D/2 - 0.04));
  add(mkBox(0.015, 0.25, 0.02, wireMat, -4.5, 1.6, D/2 - 0.04));

  // ── Vault Exit Door to Room 6 (North-East wall) ───────────────────────────
  const vaultFrame = mkBox(1.2, 2.4, 0.2, rustMat, 4.5, 1.2, -D/2 + 0.1);
  add(vaultFrame);
  const vaultDoor = mkBox(1.05, 2.2, 0.1, darkMetalMat, 4.5, 1.1, -D/2 + 0.12);
  vaultDoor.userData.id = 'vault_door';
  interact(vaultDoor, 'vault_door');
  add(vaultDoor);
  ref.bulkheadDoor = vaultDoor;
  ref.roomDoor = vaultDoor;

  // ── 9-Monitor CRT Wall (North wall, 3×3 Grid) ─────────────────────────────
  const monitorStates = [
    { on: true, static: true }, { on: true, static: true }, { on: false, static: false },
    { on: true, static: true }, { on: true, static: false }, { on: true,  static: true },
    { on: false, static: false }, { on: true, static: true }, { on: false, static: false }
  ];

  const monitorScreens = [];
  const monitorMeshes  = [];
  const monitorGlows   = [];

  // Steel supporting structure for the CRT bank
  const bankHousing = mkBox(4.4, 3.0, 0.65, darkMetalMat, 0, H/2, -D/2 + 0.35);
  add(bankHousing);

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx   = row * 3 + col;
      const state = monitorStates[idx];
      const mx    = (col - 1) * 1.35;
      const my    = H - 0.65 - row * 0.9;
      const mz    = -D/2 + 0.42;

      // Heavy curved CRT housing
      const body = mkBox(1.15, 0.78, 0.5, blackMat, mx, my, mz);
      add(body);

      // CRT phosphor screen with curved convex appearance
      const scrCanvas = XC.phosphorScreen(state.on, state.static);
      const scrTex = new THREE.CanvasTexture(scrCanvas);
      scrTex.needsUpdate = true;
      const scrMat = new THREE.MeshStandardMaterial({
        map: scrTex,
        emissive: state.on ? new THREE.Color(0x1a3d1f) : new THREE.Color(0x000000),
        emissiveIntensity: state.on ? (state.static ? 0.7 : 0.95) : 0,
        roughness: 0.15,
        metalness: 0.1
      });

      const screen = mkBox(0.96, 0.65, 0.04, scrMat, mx, my, mz + 0.26);
      add(screen);
      monitorScreens.push({ mesh: screen, mat: scrMat, state, idx, canvas: scrCanvas });
      monitorMeshes.push({ body, screen, mx, my, mz, state, idx });

      // Processing drawer unit with status LEDs below monitor
      const procUnit = mkBox(1.15, 0.14, 0.45, rackMat, mx, my - 0.42, mz);
      add(procUnit);

      // Ambient screen glow
      if (state.on) {
        const pt = new THREE.PointLight(0x4dff78, state.static ? 0.4 : 0.6, 2.8, 2);
        pt.position.set(mx, my, mz + 0.35);
        S.add(pt);
        monitorGlows.push(pt);
      }
    }
  }

  // Interactive Proxy for Monitor Bank (CCTV Horror trigger)
  const monitorBankProxy = mkBox(4.2, 2.8, 0.4, new THREE.MeshBasicMaterial({ visible: false }), 0, H/2 + 0.1, -D/2 + 0.5);
  monitorBankProxy.userData.id = 'monitor_bank';
  interact(monitorBankProxy, 'monitor_bank');
  add(monitorBankProxy);

  // ── Operator Chair with Haunted Doll (Center-left) ────────────────────────
  const chairGroup = new THREE.Group();
  chairGroup.add(mkCyl(0.32, 0.32, 0.04, 8, darkMetalMat, 0, 0.02, 0));
  chairGroup.add(mkCyl(0.035, 0.035, 0.44, 6, darkMetalMat, 0, 0.24, 0));
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x220c08, roughness: 0.85, metalness: 0.05 });
  chairGroup.add(mkBox(0.48, 0.09, 0.48, seatMat, 0, 0.46, 0));
  chairGroup.add(mkBox(0.44, 0.54, 0.07, seatMat, 0, 0.77, -0.22));

  // The Creepy Haunted Doll sitting in the operator chair
  try {
    const hauntedDoll = buildDoll(0.95);
    hauntedDoll.position.set(0, 0.51, 0.02);
    hauntedDoll.rotation.y = -Math.PI * 0.05;
    chairGroup.add(hauntedDoll);
    ref.doll = hauntedDoll;
    E.doll = hauntedDoll;
  } catch (err) {
    console.warn('[ROOM5] Failed to instantiate doll model:', err);
  }

  chairGroup.position.set(-0.4, 0, 0.3);
  chairGroup.rotation.y = Math.PI * 0.15;

  const chairProxy = mkBox(0.65, 1.1, 0.65, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.55, 0);
  chairProxy.userData.id = 'operator_chair';
  interact(chairProxy, 'operator_chair');
  chairGroup.add(chairProxy);
  add(chairGroup);
  solid(-0.75, -0.05, 0.0, 0.65);

  // ── Staff Terminal: Personnel Index (R2-01) ───────────────────────────────
  const termGroup = new THREE.Group();
  termGroup.add(mkBox(1.15, 0.07, 0.75, rustMat, 0, 0.72, 0));
  termGroup.add(mkBox(0.06, 0.72, 0.06, darkMetalMat, -0.5, 0.36, -0.32));
  termGroup.add(mkBox(0.06, 0.72, 0.06, darkMetalMat,  0.5, 0.36, -0.32));
  termGroup.add(mkBox(0.06, 0.72, 0.06, darkMetalMat, -0.5, 0.36,  0.32));
  termGroup.add(mkBox(0.06, 0.72, 0.06, darkMetalMat,  0.5, 0.36,  0.32));

  // Terminal CRT monitor & screen
  termGroup.add(mkBox(0.7, 0.54, 0.55, blackMat, 0, 1.05, -0.06));
  const termScreenTex = new THREE.CanvasTexture(XC.phosphorScreen(true, false));
  termScreenTex.needsUpdate = true;
  const termScreenMat = new THREE.MeshStandardMaterial({
    map: termScreenTex, emissive: new THREE.Color(0x1a3d1f), emissiveIntensity: 0.85, roughness: 0.1
  });
  termGroup.add(mkBox(0.6, 0.44, 0.03, termScreenMat, 0, 1.05, 0.22));

  // Mechanical Keyboard
  const kbMat = new THREE.MeshStandardMaterial({ color: 0x111612, roughness: 0.65, metalness: 0.3 });
  termGroup.add(mkBox(0.64, 0.03, 0.24, kbMat, 0, 0.765, 0.21));

  // Terminal Proxy
  const termProxy = mkBox(1.2, 1.1, 0.85, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.9, 0);
  termProxy.userData.id = 'staff_terminal';
  interact(termProxy, 'staff_terminal');
  termGroup.add(termProxy);

  termGroup.position.set(-1.8, 0, -D/2 + 1.2);
  add(termGroup);
  solid(-2.4, -1.2, -D/2 + 0.6, -D/2 + 1.7);

  // ── Radio Console: Transmission Archive (R2-05) ───────────────────────────
  const radioGroup = new THREE.Group();
  radioGroup.add(mkBox(0.95, 0.07, 0.65, rustMat, 0, 0.68, 0));
  radioGroup.add(mkBox(0.06, 0.68, 0.06, darkMetalMat, -0.42, 0.34, -0.27));
  radioGroup.add(mkBox(0.06, 0.68, 0.06, darkMetalMat,  0.42, 0.34, -0.27));
  radioGroup.add(mkBox(0.06, 0.68, 0.06, darkMetalMat, -0.42, 0.34,  0.27));
  radioGroup.add(mkBox(0.06, 0.68, 0.06, darkMetalMat,  0.42, 0.34,  0.27));

  // Radio front chassis & dials
  radioGroup.add(mkBox(0.9, 0.35, 0.28, darkMetalMat, 0, 0.89, -0.15));
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc89e48, roughness: 0.4, metalness: 0.85 });
  const dialPositions = [[-0.3, 0.89, 0.0], [-0.1, 0.89, 0.0], [0.1, 0.89, 0.0], [0.3, 0.89, 0.0]];
  dialPositions.forEach(([dx, dy, dz]) => {
    radioGroup.add(mkCyl(0.042, 0.042, 0.02, 16, brassMat, dx, dy, dz));
  });

  // Paper tape reel
  radioGroup.add(mkCyl(0.1, 0.1, 0.04, 16, new THREE.MeshStandardMaterial({ color: 0xd8cca8, roughness: 0.85 }), 0.32, 0.74, 0.18));

  const radioProxy = mkBox(1.0, 0.7, 0.7, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.75, 0);
  radioProxy.userData.id = 'radio_console';
  interact(radioProxy, 'radio_console');
  radioGroup.add(radioProxy);

  radioGroup.position.set(W/2 - 2.1, 0, D/2 - 0.7);
  radioGroup.rotation.y = -Math.PI * 0.18;
  add(radioGroup);
  solid(W/2 - 2.7, W/2 - 1.5, D/2 - 1.3, D/2 - 0.1);

  // ── Sound Console: Spectrogram Analyser (R2-06) ───────────────────────────
  const soundGroup = new THREE.Group();
  soundGroup.add(mkBox(0.85, 0.07, 0.6, rustMat, 0, 0.68, 0));
  // Oscilloscope tube housing
  soundGroup.add(mkCyl(0.22, 0.24, 0.32, 18, blackMat, 0, 0.94, -0.1));
  const oscScreenTex = new THREE.CanvasTexture(XC.phosphorScreen(true, false));
  oscScreenTex.needsUpdate = true;
  const oscMat = new THREE.MeshStandardMaterial({
    map: oscScreenTex, emissive: new THREE.Color(0x1a3d1f), emissiveIntensity: 0.8, roughness: 0.05
  });
  const oscScreen = new THREE.Mesh(new THREE.CircleGeometry(0.18, 32), oscMat);
  oscScreen.position.set(0, 0.94, 0.065);
  soundGroup.add(oscScreen);

  // Patch bay jacks
  soundGroup.add(mkBox(0.74, 0.22, 0.03, darkMetalMat, 0, 0.84, 0.24));
  for (let pj = 0; pj < 12; pj++) {
    const pjx = -0.3 + (pj % 6) * 0.11;
    const pjy = pj < 6 ? 0.88 : 0.8;
    soundGroup.add(mkCyl(0.014, 0.014, 0.02, 6, darkMetalMat, pjx, pjy, 0.258));
  }

  const soundProxy = mkBox(0.9, 0.7, 0.7, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.8, 0);
  soundProxy.userData.id = 'sound_console';
  interact(soundProxy, 'sound_console');
  soundGroup.add(soundProxy);

  soundGroup.position.set(W/2 - 0.75, 0, 0.5);
  soundGroup.rotation.y = -Math.PI / 2;
  add(soundGroup);
  solid(W/2 - 1.25, W/2, 0.1, 0.9);

  // ── Relay Racks (East Wall, Fragment Prop) ─────────────────────────────────
  const rackGroup = new THREE.Group();
  for (let r = 0; r < 2; r++) {
    rackGroup.add(mkBox(0.55, 2.2, 0.65, rackMat, 0, 1.1, r === 0 ? -0.45 : 0.45));
  }
  const actLightColors = [0x00ff44, 0xff3300, 0xffaa00, 0x00aaff];
  const actLights = [];
  for (let i = 0; i < 10; i++) {
    const col = actLightColors[i % actLightColors.length];
    const lmat = new THREE.MeshStandardMaterial({ color: col, emissive: new THREE.Color(col), emissiveIntensity: 1.6 });
    const light = mkBox(0.03, 0.03, 0.02, lmat, (Math.random() - 0.5) * 0.4, 0.4 + i * 0.18, 0.34);
    rackGroup.add(light);
    actLights.push({ mesh: light, mat: lmat, timer: Math.random() * 2, interval: 0.2 + Math.random() });
  }

  const rackProxy = mkBox(1.2, 2.2, 0.8, new THREE.MeshBasicMaterial({ visible: false }), 0, 1.1, 0);
  rackProxy.userData.id = 'relay_rack';
  interact(rackProxy, 'relay_rack');
  rackGroup.add(rackProxy);

  rackGroup.position.set(W/2 - 0.5, 0, -1.0);
  add(rackGroup);
  solid(W/2 - 1.15, W/2, -1.8, -0.2);

  // ── Tape Deck Cart (South-East, Fragment Prop) ─────────────────────────────
  const deckGroup = new THREE.Group();
  deckGroup.add(mkBox(0.65, 0.6, 0.5, rustMat, 0, 0.3, 0));
  // Magnetic reels
  const reelL = mkCyl(0.18, 0.18, 0.025, 20, rustMat, -0.15, 0.62, 0.08);
  const reelR = mkCyl(0.18, 0.18, 0.025, 20, rustMat,  0.15, 0.62, 0.08);
  deckGroup.add(reelL, reelR);

  const deckProxy = mkBox(0.75, 0.75, 0.6, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.375, 0);
  deckProxy.userData.id = 'tape_deck_cart';
  interact(deckProxy, 'tape_deck_cart');
  deckGroup.add(deckProxy);

  deckGroup.position.set(W/2 - 1.2, 0, D/2 - 1.1);
  add(deckGroup);
  solid(W/2 - 1.6, W/2 - 0.8, D/2 - 1.45, D/2 - 0.75);

  // ── Cable Trench (Floor, Fragment Prop) ───────────────────────────────────
  const trenchMat = new THREE.MeshStandardMaterial({ color: 0x07090a, roughness: 0.9, metalness: 0.4 });
  const trench = mkBox(0.28, 0.06, D * 0.75, trenchMat, 0.7, 0.0, -0.2);
  add(trench);
  const cableColors = [0x1a0a04, 0x0a0a1a, 0x0a1a0a, 0x1a0808];
  for (let i = 0; i < 5; i++) {
    const cmat = new THREE.MeshStandardMaterial({ color: cableColors[i % cableColors.length], roughness: 0.9 });
    const cable = mkCyl(0.014, 0.014, D * 0.74, 6, cmat, 0.7 + (i - 2) * 0.04, 0.025, -0.2);
    add(cable);
  }
  const trenchProxy = mkBox(0.35, 0.12, D * 0.75, new THREE.MeshBasicMaterial({ visible: false }), 0.7, 0.06, -0.2);
  trenchProxy.userData.id = 'cable_trench';
  interact(trenchProxy, 'cable_trench');
  add(trenchProxy);

  // ── Wall Clipboard (Beside door, Fragment Prop) ───────────────────────────
  const clipGroup = new THREE.Group();
  clipGroup.add(mkBox(0.24, 0.32, 0.02, new THREE.MeshStandardMaterial({ color: 0x1b1308, roughness: 0.8 }), 0, 0, 0));
  clipGroup.add(mkBox(0.21, 0.28, 0.01, new THREE.MeshStandardMaterial({ color: 0xd6cbb0, roughness: 0.9 }), 0, -0.005, 0.014));
  clipGroup.add(mkBox(0.07, 0.035, 0.03, darkMetalMat, 0, 0.155, 0.015));

  const clipProxy = mkBox(0.3, 0.38, 0.1, new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0);
  clipProxy.userData.id = 'wall_clipboard';
  interact(clipProxy, 'wall_clipboard');
  clipGroup.add(clipProxy);

  clipGroup.position.set(-3.6, 1.55, D/2 - 0.08);
  clipGroup.rotation.y = Math.PI;
  add(clipGroup);

  // ── Fuse Box (West Wall, Fragment Prop) ───────────────────────────────────
  const fuseGroup = new THREE.Group();
  fuseGroup.add(mkBox(0.55, 0.72, 0.14, new THREE.MeshStandardMaterial({ color: 0x101412, roughness: 0.5, metalness: 0.7 }), 0, 0, 0));
  for (let b = 0; b < 9; b++) {
    const row = Math.floor(b / 3);
    const col = b % 3;
    const bx = -0.13 + col * 0.13;
    const by = 0.2 - row * 0.14;
    fuseGroup.add(mkBox(0.08, 0.045, 0.035, darkMetalMat, bx, by, 0.12));
  }

  const fuseProxy = mkBox(0.65, 0.8, 0.25, new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0);
  fuseProxy.userData.id = 'fuse_box';
  interact(fuseProxy, 'fuse_box');
  fuseGroup.add(fuseProxy);

  fuseGroup.position.set(-W/2 + 0.12, 1.45, 1.2);
  fuseGroup.rotation.y = Math.PI / 2;
  add(fuseGroup);
  solid(-W/2, -W/2 + 0.5, 0.8, 1.6);

  // ── Divider Partition: 5A Command Deck to 5B Morgue (x = -0.5) ─────────────
  // Dividing concrete wall with reinforced wired observation window & sliding security door
  const divWallNorth = mkBox(0.2, H, 1.8, wallMat, -0.5, H / 2, -D / 2 + 0.9);
  add(divWallNorth);
  solid(-0.65, -0.35, -D / 2, -D / 2 + 1.8);

  const divWallSouth = mkBox(0.2, H, 1.8, wallMat, -0.5, H / 2, D / 2 - 0.9);
  add(divWallSouth);
  solid(-0.65, -0.35, D / 2 - 1.8, D / 2);

  // Over-door header beam
  const divHeader = mkBox(0.2, 0.8, 2.4, wallMat, -0.5, H - 0.4, 0);
  add(divHeader);

  // Reinforced wired observation window (player can peer into morgue)
  const morgueWindow = mkBox(0.08, 1.1, 1.2, glassMat, -0.5, 1.6, -1.2);
  add(morgueWindow);
  add(mkBox(0.09, 1.1, 0.03, cageMat, -0.5, 1.6, -1.2));
  add(mkBox(0.09, 0.03, 1.2, cageMat, -0.5, 1.6, -1.2));

  // Morgue Security Door (Interactive: slides open)
  const morgueDoorGroup = new THREE.Group();
  const morgueDoorFrame = mkBox(0.18, 2.3, 1.3, rustMat, -0.5, 1.15, 0);
  add(morgueDoorFrame);
  const morgueDoorMesh = mkBox(0.08, 2.15, 1.15, darkMetalMat, -0.5, 1.1, 0);
  morgueDoorMesh.userData.id = 'morgue_access_door';
  interact(morgueDoorMesh, 'morgue_access_door');
  morgueDoorGroup.add(morgueDoorMesh);
  add(morgueDoorGroup);
  ref.morgueDoor = morgueDoorMesh;

  // Keypad beside morgue door
  const morgueKeypad = mkBox(0.06, 0.28, 0.18, blackMat, -0.62, 1.45, 0.75);
  add(morgueKeypad);
  const keypadLight = mkBox(0.02, 0.03, 0.03, amberBulbMat, -0.66, 1.55, 0.75);
  add(keypadLight);

  // ── Section 5B: The Cold Morgue & Autopsy Room (x = 0.5 to 5.5) ─────────────
  // Stainless steel autopsy gurney (center of morgue)
  const gurneyGroup = new THREE.Group();
  const slab = mkBox(1.9, 0.08, 0.85, darkMetalMat, 0, 0.85, 0);
  gurneyGroup.add(slab);
  // Legs and caster wheels
  [[-0.85, -0.35], [-0.85, 0.35], [0.85, -0.35], [0.85, 0.35]].forEach(([gx, gz]) => {
    gurneyGroup.add(mkCyl(0.025, 0.025, 0.8, 8, rustMat, gx, 0.4, gz));
    gurneyGroup.add(mkCyl(0.04, 0.04, 0.06, 8, blackMat, gx, 0.04, gz, Math.PI / 2));
  });
  // Draped body under canvas quarantine sheet
  const drapedBody = mkBox(1.6, 0.25, 0.6, plasticMat, 0, 1.0, 0);
  drapedBody.userData.id = 'autopsy_gurney';
  interact(drapedBody, 'autopsy_gurney');
  gurneyGroup.add(drapedBody);
  gurneyGroup.position.set(2.2, 0, 0);
  add(gurneyGroup);
  solid(1.1, 3.3, -0.55, 0.55);

  // Cold Storage Wall Lockers (Morgue pull-out drawers on East Wall)
  const coldStorageGroup = new THREE.Group();
  const lockerBank = mkBox(0.55, 2.2, 3.2, darkMetalMat, W / 2 - 0.3, 1.1, 0);
  coldStorageGroup.add(lockerBank);
  // 6 drawer faces (3 rows x 2 columns) with steel handles
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const dy = 0.4 + row * 0.7;
      const dz = -1.0 + col * 1.5;
      const drawer = mkBox(0.04, 0.55, 1.25, rustMat, W / 2 - 0.56, dy, dz);
      coldStorageGroup.add(drawer);
      const handle = mkBox(0.06, 0.04, 0.25, blackMat, W / 2 - 0.6, dy, dz);
      coldStorageGroup.add(handle);
    }
  }
  const storageHitbox = mkBox(0.7, 2.2, 3.2, new THREE.MeshBasicMaterial({ visible: false }), W / 2 - 0.35, 1.1, 0);
  storageHitbox.userData.id = 'cold_storage';
  interact(storageHitbox, 'cold_storage');
  coldStorageGroup.add(storageHitbox);
  add(coldStorageGroup);
  solid(W / 2 - 0.7, W / 2, -1.8, 1.8);

  // ── Section 5C: Vault Containment Airlock Terminal (Beside Vault Door) ──────
  const bioTerminal = mkBox(0.25, 0.4, 0.18, darkMetalMat, 3.8, 1.4, -D / 2 + 0.18);
  const bioScreen = mkBox(0.02, 0.2, 0.12, new THREE.MeshStandardMaterial({
    color: 0x4dff78,
    emissive: new THREE.Color(0x1a3d1f),
    emissiveIntensity: 1.2
  }), 3.8, 1.45, -D / 2 + 0.28);
  bioTerminal.userData.id = 'biometric_terminal';
  interact(bioTerminal, 'biometric_terminal');
  add(bioTerminal);
  add(bioScreen);

  // RE4-Style Interactive Glimmer Particles (Kira Effect)
  const kiraGroup = new THREE.Group();
  const kiraMat = new THREE.PointsMaterial({
    color: 0xfff0aa,
    size: 0.08,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const kiraGeo = new THREE.BufferGeometry();
  const kiraCoords = new Float32Array([
    2.2, 1.2, 0,    // atop autopsy gurney
    W / 2 - 0.8, 1.1, -1.0, // cold storage drawer
    3.8, 1.3, -D / 2 + 0.35, // biometric console
    -4.2, 1.0, 1.8  // operator desk
  ]);
  kiraGeo.setAttribute('position', new THREE.BufferAttribute(kiraCoords, 3));
  const kiraPoints = new THREE.Points(kiraGeo, kiraMat);
  add(kiraPoints);

  // ── Dead Intercom (Beside Door) ───────────────────────────────────────────
  const intercomGroup = new THREE.Group();
  intercomGroup.add(mkBox(0.2, 0.25, 0.07, blackMat, 0, 0, 0));
  for (let g2 = 0; g2 < 5; g2++) {
    intercomGroup.add(mkBox(0.14, 0.01, 0.02, darkMetalMat, 0, -0.03 + g2 * 0.03, 0.042));
  }
  const intercomProxy = mkBox(0.26, 0.3, 0.14, new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0);
  intercomProxy.userData.id = 'dead_intercom';
  interact(intercomProxy, 'dead_intercom');
  intercomGroup.add(intercomProxy);

  intercomGroup.position.set(-3.0, 1.55, D/2 - 0.08);
  intercomGroup.rotation.y = Math.PI;
  add(intercomGroup);

  // ── Plastic Quarantine Sheeting (Billowing Hazmat Curtains) ───────────────
  const eastSheet = new THREE.Mesh(new THREE.PlaneGeometry(D * 0.7, H, 8, 20), plasticMat);
  eastSheet.position.set(W/2 - 0.6, H/2, 0.2);
  eastSheet.rotation.set(0, Math.PI / 2, 0);
  add(eastSheet);

  const sheetGeo = eastSheet.geometry;
  const sheetPos = sheetGeo.attributes.position;
  const origSheetPos = new Float32Array(sheetPos.array.length);
  origSheetPos.set(sheetPos.array);

  // ── Ceiling Emergency Cage Bulbs ──────────────────────────────────────────
  const cagePositions = [[-3.5, H - 0.15, 0], [3.5, H - 0.15, 0]];
  const ceilingLights = [];
  cagePositions.forEach(([cx, cy, cz], idx) => {
    for (let ri = 0; ri < 4; ri++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.009, 6, 16), cageMat);
      ring.position.set(cx, cy - 0.06, cz);
      ring.rotation.set(0, ri * Math.PI / 4, 0);
      add(ring);
    }
    const bulb = mkSphere(0.06, 12, 10, amberBulbMat, cx, cy - 0.06, cz);
    add(bulb);

    const pt = new THREE.PointLight(0xc47a00, idx === 0 ? 1.4 : 0.8, 6.5, 2);
    pt.position.set(cx, cy - 0.08, cz);
    S.add(pt);
    ceilingLights.push(pt);
  });

  // ── Animation Loop ────────────────────────────────────────────────────────
  let time = 0;
  anim((t, dt) => {
    time += dt;

    // Billowing hazmat plastic sheet
    for (let i = 0; i < sheetPos.count; i++) {
      const iy = i * 3 + 1;
      const ix = i * 3;
      const origY = origSheetPos[iy];
      const origX = origSheetPos[ix];
      sheetPos.array[ix] = origX + Math.sin(time * 0.8 + origY * 1.8) * 0.035;
      sheetPos.array[iy] = origY + Math.sin(time * 0.6 + origX * 2.2) * 0.02;
    }
    sheetPos.needsUpdate = true;

    // Spinning tape reels
    reelL.rotation.y += dt * 1.8;
    reelR.rotation.y += dt * 1.8;

    // Server rack activity LEDs
    actLights.forEach(al => {
      al.timer -= dt;
      if (al.timer <= 0) {
        al.timer = al.interval * (0.6 + Math.random());
        al.mat.emissiveIntensity = Math.random() > 0.35 ? 1.8 : 0;
      }
    });

    // Flickering failing amber cage light
    if (ceilingLights[1]) {
      const flickVal = 0.5 + Math.sin(time * 3.7) * 0.2 + (Math.random() < 0.04 ? -0.3 : 0.05);
      ceilingLights[1].intensity = Math.max(0.15, flickVal);
    }

    // Monitor screen static flicker
    monitorScreens.forEach(mon => {
      if (mon.state.static && Math.random() < 0.02) {
        mon.mat.emissiveIntensity = 0.5 + Math.random() * 0.45;
      }
    });
  });

  E._monitorScreens = monitorScreens;
}

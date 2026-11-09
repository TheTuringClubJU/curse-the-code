// 3D Procedural Scene Builder for Room 5: The Surveillance Morgue
// Strict Three.js geometric primitives & procedural canvas textures. Zero external models.
import * as THREE from 'three';
import * as X from './tex.js';
import * as XC from './texControl.js';

export function buildControlScene(E) {
  const { S, add, solid, anim, interact, flick, lightRig, glow } = E;
  const [W, H, D] = [12, 2.8, 5]; // railway carriage proportions

  // ── Shared Material Palette ───────────────────────────────────────────────
  const wallTex  = XC.tex(XC.concreteWall(), { repeat: [5, 2] });
  const wallMat  = new THREE.MeshStandardMaterial({ map: wallTex, bumpMap: wallTex, bumpScale: 0.5, roughness: 0.9, metalness: 0.05 });

  const floorTex = XC.tex(XC.diamondPlateFloor(), { repeat: [6, 3] });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, bumpMap: floorTex, bumpScale: 0.4, roughness: 0.5, metalness: 0.55 });

  const ceilTex  = XC.tex(XC.dampCeiling(), { repeat: [4, 2] });
  const ceilMat  = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.95, metalness: 0.0 });

  const rustTex  = XC.tex(XC.rustMetal(), { repeat: [2, 2] });
  const rustMat  = new THREE.MeshStandardMaterial({ map: rustTex, bumpMap: rustTex, bumpScale: 0.4, roughness: 0.75, metalness: 0.5 });

  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x0a0e0a, roughness: 0.6, metalness: 0.8 });
  const blackMat     = new THREE.MeshStandardMaterial({ color: 0x060808, roughness: 0.8, metalness: 0.3 });
  const glassMat     = new THREE.MeshStandardMaterial({ color: 0x0a1a0c, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.35 });
  const amberBulbMat = new THREE.MeshStandardMaterial({ color: 0xc47a00, emissive: new THREE.Color(0xc47a00), emissiveIntensity: 1.2, roughness: 0.5, metalness: 0.0 });
  const cageMat      = new THREE.MeshStandardMaterial({ color: 0x1a2018, roughness: 0.6, metalness: 0.7, wireframe: false });

  const plasticTex = XC.tex(XC.quarantinePlastic(), { repeat: [3, 4] });
  const plasticMat = new THREE.MeshStandardMaterial({ map: plasticTex, transparent: true, opacity: 0.18, roughness: 0.1, metalness: 0.0, side: THREE.DoubleSide });

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
  const floor = mkBox(W, 0.08, D, floorMat, 0, -0.04, 0);
  floor.receiveShadow = true; add(floor); solid(floor);

  // Walls
  const northWall = mkBox(W, H, 0.12, blackMat, 0, H/2, -D/2);    add(northWall); solid(northWall); // monitor bank wall
  const southWall = mkBox(W, H, 0.12, wallMat,  0, H/2,  D/2);    add(southWall); solid(southWall);
  const eastWall  = mkBox(0.12, H, D, wallMat, W/2, H/2,  0);     add(eastWall);  solid(eastWall);
  const westWall  = mkBox(0.12, H, D, wallMat,-W/2, H/2,  0);     add(westWall);  solid(westWall);
  const ceiling   = mkBox(W, 0.1, D, ceilMat, 0, H + 0.05, 0);   add(ceiling);

  // ── Door (south wall, offset left) ────────────────────────────────────────
  const doorFrame = mkBox(0.95, 2.2, 0.15, rustMat, -4.5, 1.1, D/2 - 0.01);
  add(doorFrame);
  const doorLeaf  = mkBox(0.85, 2.0, 0.08, darkMetalMat, -4.5, 1.0, D/2 - 0.05);
  doorLeaf.userData.id = 'control_door';
  interact(doorLeaf, 'control_door');
  add(doorLeaf);
  // Wire-reinforced viewport
  const viewport = mkBox(0.22, 0.22, 0.09, glassMat, -4.5, 1.6, D/2 - 0.08);
  add(viewport);
  // Wire cross on viewport
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.4 });
  add(mkBox(0.22, 0.015, 0.02, wireMat, -4.5, 1.6, D/2 - 0.04));
  add(mkBox(0.015, 0.22, 0.02, wireMat, -4.5, 1.6, D/2 - 0.04));

  // ── Monitor Bank (north wall, 3×3 grid) ──────────────────────────────────
  // CRT states: indices 0,1,3,5,7 are ON, rest OFF. Index 4 (center) = footage
  const monitorStates = [
    { on: true, static: true }, { on: true, static: true }, { on: false, static: false },
    { on: true, static: true }, { on: true, static: false }, { on: true,  static: true },
    { on: false, static: false }, { on: false, static: false }, { on: false, static: false }
  ];

  const monitorMeshes  = [];
  const monitorScreens = [];
  const monitorGlows   = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx    = row * 3 + col;
      const state  = monitorStates[idx];
      const mx     = (col - 1) * 1.3;
      const my     = H - 0.5 - row * 0.85;
      const mz     = -D/2 + 0.26;

      // CRT body — dark plastic housing
      const body = mkBox(1.1, 0.75, 0.5, blackMat, mx, my, mz);
      add(body);

      // Screen face
      const scrCanvas = XC.phosphorScreen(state.on, state.static);
      const scrTex = new THREE.CanvasTexture(scrCanvas);
      scrTex.needsUpdate = true;
      const scrMat = new THREE.MeshStandardMaterial({
        map: scrTex,
        emissive: state.on ? new THREE.Color(0x1a3d1f) : new THREE.Color(0x000000),
        emissiveIntensity: state.on ? (state.static ? 0.6 : 0.8) : 0,
        roughness: 0.1, metalness: 0.0
      });
      const screen = mkBox(0.9, 0.62, 0.02, scrMat, mx, my, mz + 0.26);
      add(screen);
      monitorScreens.push({ mesh: screen, mat: scrMat, state, idx, canvas: scrCanvas });
      monitorMeshes.push({ body, screen, mx, my, mz, state, idx });

      // Per-unit processing box below
      const procUnit = mkBox(1.1, 0.25, 0.4, rackMat, mx, my - 0.55, mz - 0.05);
      add(procUnit);

      // Monitor screen glow (RectAreaLight per monitor, low intensity)
      if (state.on) {
        const rl = new THREE.RectAreaLight(0x1a3d1f, 0.35, 0.9, 0.62);
        rl.position.set(mx, my, mz + 0.28);
        rl.lookAt(mx, my, mz + 2);
        S.add(rl);
        monitorGlows.push(rl);
      }
    }
  }

  // Central monitor label — interactive trigger for CCTV horror / monitor_bank
  const monitorBankProxy = mkBox(3.9, 2.6, 0.2, new THREE.MeshBasicMaterial({ visible: false }), 0, H - 1.1, -D/2 + 0.3);
  monitorBankProxy.userData.id = 'monitor_bank';
  interact(monitorBankProxy, 'monitor_bank');
  add(monitorBankProxy);

  // ── Plastic Quarantine Sheeting ───────────────────────────────────────────
  // East-side sheet
  const eastSheet = new THREE.Mesh(new THREE.PlaneGeometry(D, H, 1, 20), plasticMat);
  eastSheet.position.set(W/2 - 0.5, H/2, 0);
  eastSheet.rotation.set(0, Math.PI/2, 0);
  S.add(eastSheet);

  // West-side partial sheet
  const westSheet = new THREE.Mesh(new THREE.PlaneGeometry(D * 0.6, H, 1, 20), plasticMat);
  westSheet.position.set(-W/2 + 0.5, H/2, -0.6);
  westSheet.rotation.set(0, -Math.PI/2, 0);
  S.add(westSheet);

  // Store original vertex positions for sine animation
  const sheetGeos = [eastSheet.geometry, westSheet.geometry];
  const origPositions = sheetGeos.map(geo => {
    const pos = geo.attributes.position;
    const orig = new Float32Array(pos.array.length);
    orig.set(pos.array);
    return { geo, orig };
  });

  // ── Relay Racks (east wall) ───────────────────────────────────────────────
  const rackGroup = new THREE.Group();
  // Two rack chassis side by side
  for (let r = 0; r < 2; r++) {
    const chassisMesh = mkBox(0.5, 2.0, 0.6, rackMat, 0, 1.0, r === 0 ? -0.4 : 0.4);
    rackGroup.add(chassisMesh);
    // U-slot screws detail
    for (let u = 0; u < 12; u++) {
      const uy = -0.9 + u * 0.155;
      const screw = mkBox(0.46, 0.005, 0.01, darkMetalMat, 0, uy, 0.31);
      rackGroup.add(screw);
    }
  }
  rackGroup.position.set(W/2 - 0.4, 0, -0.4);

  // Activity lights — small emissive cubes
  const actLightColors = [0x00ff44, 0xff4400, 0xffaa00, 0x00aaff, 0x44ff00, 0xff0000];
  const actLights = [];
  for (let i = 0; i < 8; i++) {
    const col = actLightColors[i % actLightColors.length];
    const lmat = new THREE.MeshStandardMaterial({ color: col, emissive: new THREE.Color(col), emissiveIntensity: 1.5 });
    const light = mkBox(0.025, 0.025, 0.02, lmat, (Math.random() - 0.5) * 0.4, -0.4 + i * 0.2, 0.32);
    rackGroup.add(light);
    actLights.push({ mesh: light, mat: lmat, timer: Math.random() * 2, interval: 0.3 + Math.random() * 1.2 });
  }

  // Rack group as interactive_fragment proxy
  const rackProxy = mkBox(1.1, 2.0, 0.65, new THREE.MeshBasicMaterial({ visible: false }), 0, 1.0, 0);
  rackProxy.userData.id = 'relay_rack';
  interact(rackProxy, 'relay_rack');
  rackGroup.add(rackProxy);
  rackGroup.position.set(W/2 - 0.5, 0, -0.4);
  S.add(rackGroup);

  // ── Tape Deck Cart (south-east corner) ───────────────────────────────────
  const deckGroup = new THREE.Group();
  // Cart body
  deckGroup.add(mkBox(0.6, 0.55, 0.45, rustMat, 0, 0.275, 0));
  // Two reels
  for (let r = 0; r < 2; r++) {
    const reelHub = mkCyl(0.1, 0.1, 0.04, 14, darkMetalMat, r === 0 ? -0.13 : 0.13, 0.57, 0.08);
    const reelRim = mkCyl(0.16, 0.16, 0.025, 20, rustMat, r === 0 ? -0.13 : 0.13, 0.57, 0.08);
    deckGroup.add(reelHub, reelRim);
  }
  // Deck face controls
  deckGroup.add(mkBox(0.55, 0.12, 0.02, darkMetalMat, 0, 0.47, 0.235));
  // Cart wheels
  for (let wx = -1; wx <= 1; wx += 2) {
    for (let wz = -1; wz <= 1; wz += 2) {
      deckGroup.add(mkCyl(0.03, 0.03, 0.04, 8, blackMat, wx * 0.22, 0.03, wz * 0.17));
    }
  }
  const deckProxy = mkBox(0.65, 0.65, 0.5, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.325, 0);
  deckProxy.userData.id = 'tape_deck_cart';
  interact(deckProxy, 'tape_deck_cart');
  deckGroup.add(deckProxy);
  deckGroup.position.set(W/2 - 1.2, 0, D/2 - 0.8);
  S.add(deckGroup);

  // ── Operator Chair (center-room) ──────────────────────────────────────────
  const chairGroup = new THREE.Group();
  // Base star + post
  chairGroup.add(mkCyl(0.28, 0.28, 0.04, 5, darkMetalMat, 0, 0.02, 0));
  chairGroup.add(mkCyl(0.03, 0.03, 0.42, 6, darkMetalMat, 0, 0.23, 0));
  // Seat cushion — torn leather (dark brownish-red)
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1a0a06, roughness: 0.9, metalness: 0.0 });
  chairGroup.add(mkBox(0.42, 0.08, 0.42, seatMat, 0, 0.44, 0));
  // Backrest
  chairGroup.add(mkBox(0.4, 0.5, 0.06, seatMat, 0, 0.74, -0.2));
  chairGroup.add(mkBox(0.04, 0.5, 0.04, darkMetalMat, 0, 0.72, -0.17));
  // Interaction proxy
  const chairProxy = mkBox(0.5, 1.0, 0.5, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.5, 0);
  chairProxy.userData.id = 'operator_chair';
  interact(chairProxy, 'operator_chair');
  chairGroup.add(chairProxy);
  chairGroup.position.set(-0.5, 0, 0.3);
  chairGroup.rotation.y = Math.PI * 0.1;
  S.add(chairGroup);

  // ── Cable Trench (floor, running south-to-north) ──────────────────────────
  const trenchMat = new THREE.MeshStandardMaterial({ color: 0x060808, roughness: 0.9, metalness: 0.3 });
  const trench = mkBox(0.22, 0.06, D * 0.75, trenchMat, 0.6, 0.0, -0.3);
  add(trench);
  // Cable bundle fill
  const cableColors = [0x1a0a04, 0x0a0a1a, 0x0a1a0a, 0x1a0808];
  for (let i = 0; i < 6; i++) {
    const cmat = new THREE.MeshStandardMaterial({ color: cableColors[i % cableColors.length], roughness: 0.9 });
    const cable = mkCyl(0.012, 0.012, D * 0.74, 6, cmat, 0.6 + (i-3)*0.03, 0.025, -0.3);
    add(cable);
  }
  // Trench interaction proxy
  const trenchProxy = mkBox(0.25, 0.1, D * 0.75, new THREE.MeshBasicMaterial({ visible: false }), 0.6, 0.05, -0.3);
  trenchProxy.userData.id = 'cable_trench';
  interact(trenchProxy, 'cable_trench');
  add(trenchProxy);

  // ── Wall Clipboard (south wall, beside door) ──────────────────────────────
  const clipGroup = new THREE.Group();
  const clipboardMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.8, metalness: 0.0 });
  const paperMat     = new THREE.MeshStandardMaterial({ color: 0xd0c8b0, roughness: 0.9, metalness: 0.0 });
  clipGroup.add(mkBox(0.22, 0.30, 0.015, clipboardMat, 0, 0, 0));
  clipGroup.add(mkBox(0.20, 0.27, 0.01, paperMat, 0, -0.005, 0.013));
  // Clip at top
  clipGroup.add(mkBox(0.06, 0.03, 0.025, darkMetalMat, 0, 0.145, 0.013));
  // Lines on paper
  const linePaperMat = new THREE.MeshStandardMaterial({ color: 0xb0a890, roughness: 0.9 });
  for (let l = 0; l < 5; l++) {
    clipGroup.add(mkBox(0.16, 0.004, 0.005, linePaperMat, 0, 0.09 - l * 0.045, 0.019));
  }
  // Interaction proxy
  const clipProxy = mkBox(0.25, 0.32, 0.08, new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0);
  clipProxy.userData.id = 'wall_clipboard';
  interact(clipProxy, 'wall_clipboard');
  clipGroup.add(clipProxy);
  clipGroup.position.set(-3.6, 1.55, D/2 - 0.08);
  clipGroup.rotation.y = Math.PI;
  S.add(clipGroup);

  // ── Fuse Box (west wall) ──────────────────────────────────────────────────
  const fuseGroup = new THREE.Group();
  const fusePanelMat = new THREE.MeshStandardMaterial({ color: 0x0e1210, roughness: 0.5, metalness: 0.7 });
  fuseGroup.add(mkBox(0.5, 0.65, 0.12, fusePanelMat, 0, 0, 0));
  // Door
  fuseGroup.add(mkBox(0.44, 0.58, 0.06, darkMetalMat, 0, 0.005, 0.09));
  // Breaker switches
  for (let b = 0; b < 9; b++) {
    const row = Math.floor(b / 3);
    const col = b % 3;
    const bx = -0.11 + col * 0.11;
    const by = 0.18 - row * 0.13;
    // Some are snapped off (broken)
    const isSnapped = [3, 6, 8].includes(b);
    const bMat = new THREE.MeshStandardMaterial({
      color: isSnapped ? 0x2a0a06 : 0x1a1a1a,
      roughness: 0.5, metalness: 0.6
    });
    fuseGroup.add(mkBox(0.07, 0.04, 0.03, bMat, bx, by, 0.13));
  }
  // Interaction proxy
  const fuseProxy = mkBox(0.55, 0.7, 0.2, new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0);
  fuseProxy.userData.id = 'fuse_box';
  interact(fuseProxy, 'fuse_box');
  fuseGroup.add(fuseProxy);
  fuseGroup.position.set(-W/2 + 0.1, 1.4, 1.2);
  fuseGroup.rotation.y = Math.PI/2;
  S.add(fuseGroup);

  // ── Staff Terminal (center-room, beside monitor bank) ─────────────────────
  const termGroup = new THREE.Group();
  // Desk
  termGroup.add(mkBox(1.0, 0.06, 0.65, rustMat, 0, 0, 0));
  termGroup.add(mkBox(0.06, 0.73, 0.06, darkMetalMat, -0.44, -0.365, -0.28));
  termGroup.add(mkBox(0.06, 0.73, 0.06, darkMetalMat,  0.44, -0.365, -0.28));
  termGroup.add(mkBox(0.06, 0.73, 0.06, darkMetalMat, -0.44, -0.365,  0.28));
  termGroup.add(mkBox(0.06, 0.73, 0.06, darkMetalMat,  0.44, -0.365,  0.28));
  // CRT monitor
  termGroup.add(mkBox(0.65, 0.5, 0.52, blackMat, 0, 0.31, -0.07));
  // Screen
  const termScreenTex = new THREE.CanvasTexture(XC.phosphorScreen(true, false));
  termScreenTex.needsUpdate = true;
  const termScreenMat = new THREE.MeshStandardMaterial({
    map: termScreenTex, emissive: new THREE.Color(0x1a3d1f), emissiveIntensity: 0.7, roughness: 0.1
  });
  termGroup.add(mkBox(0.55, 0.42, 0.02, termScreenMat, 0, 0.31, 0.21));
  // Keyboard
  const kbMat = new THREE.MeshStandardMaterial({ color: 0x0e120e, roughness: 0.7, metalness: 0.3 });
  termGroup.add(mkBox(0.6, 0.025, 0.22, kbMat, 0, 0.038, 0.19));
  // Key rows
  for (let kr = 0; kr < 4; kr++) {
    termGroup.add(mkBox(0.56, 0.018, 0.008, darkMetalMat, 0, 0.056, 0.1 + kr * 0.028));
  }
  // Interaction proxy
  const termProxy = mkBox(1.1, 1.0, 0.75, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.25, 0);
  termProxy.userData.id = 'staff_terminal';
  interact(termProxy, 'staff_terminal');
  termGroup.add(termProxy);
  termGroup.position.set(-1.5, 0.73, -D/2 + 1.0);
  S.add(termGroup);

  // ── Radio Console (south-east) ─────────────────────────────────────────────
  const radioGroup = new THREE.Group();
  // Console desk
  radioGroup.add(mkBox(0.85, 0.06, 0.55, rustMat, 0, 0, 0));
  radioGroup.add(mkBox(0.06, 0.65, 0.06, darkMetalMat, -0.38, -0.325, -0.23));
  radioGroup.add(mkBox(0.06, 0.65, 0.06, darkMetalMat,  0.38, -0.325,  0.23));
  // Panel face
  radioGroup.add(mkBox(0.82, 0.3, 0.02, darkMetalMat, 0, 0.19, -0.26));
  // Dials
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc89e48, roughness: 0.4, metalness: 0.85 });
  const dialPositions = [[-0.26,0.19,-0.246], [-0.08,0.19,-0.246], [0.1,0.19,-0.246], [0.28,0.22,-0.246]];
  dialPositions.forEach(([dx, dy, dz]) => {
    radioGroup.add(mkCyl(0.038, 0.038, 0.02, 12, brassMat, dx, dy, dz));
    radioGroup.add(mkCyl(0.012, 0.012, 0.03, 8, darkMetalMat, dx, dy, dz + 0.02));
  });
  // Paper tape reel
  radioGroup.add(mkCyl(0.09, 0.09, 0.04, 16, new THREE.MeshStandardMaterial({ color: 0xd0c8b0, roughness: 0.8 }), 0.32, 0.12, 0.2));
  // Squelch controls
  for (let sc = 0; sc < 3; sc++) {
    radioGroup.add(mkBox(0.14, 0.015, 0.03, darkMetalMat, -0.22 + sc * 0.14, 0.08, -0.26));
  }
  // Interaction proxy
  const radioProxy = mkBox(0.9, 0.55, 0.6, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.1, 0);
  radioProxy.userData.id = 'radio_console';
  interact(radioProxy, 'radio_console');
  radioGroup.add(radioProxy);
  radioGroup.position.set(W/2 - 1.9, 0.65, D/2 - 0.65);
  radioGroup.rotation.y = -Math.PI * 0.15;
  S.add(radioGroup);

  // ── Sound Console (east wall) ─────────────────────────────────────────────
  const soundGroup = new THREE.Group();
  // Console base
  soundGroup.add(mkBox(0.75, 0.06, 0.5, rustMat, 0, 0, 0));
  // Oscilloscope tube housing
  const oscHousing = mkCyl(0.2, 0.22, 0.28, 16, blackMat, 0, 0.26, -0.1);
  soundGroup.add(oscHousing);
  // Tube face
  const oscScreenTex = new THREE.CanvasTexture(XC.phosphorScreen(true, false));
  oscScreenTex.needsUpdate = true;
  const oscMat = new THREE.MeshStandardMaterial({
    map: oscScreenTex, emissive: new THREE.Color(0x1a3d1f), emissiveIntensity: 0.7, roughness: 0.05
  });
  const oscScreen = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), oscMat);
  oscScreen.position.set(0, 0.26, -0.1 + 0.145);
  soundGroup.add(oscScreen);
  // Patch bay
  soundGroup.add(mkBox(0.68, 0.22, 0.03, darkMetalMat, 0, 0.17, 0.26));
  // Patch jacks (small cylinders)
  for (let pj = 0; pj < 12; pj++) {
    const pjx = -0.28 + (pj % 6) * 0.095;
    const pjy = pj < 6 ? 0.2 : 0.14;
    soundGroup.add(mkCyl(0.012, 0.012, 0.025, 6, darkMetalMat, pjx, pjy, 0.278));
  }
  // Tape output spool
  soundGroup.add(mkCyl(0.07, 0.07, 0.03, 12, darkMetalMat, 0.28, 0.1, 0.22));
  // Interaction proxy
  const soundProxy = mkBox(0.8, 0.6, 0.6, new THREE.MeshBasicMaterial({ visible: false }), 0, 0.15, 0);
  soundProxy.userData.id = 'sound_console';
  interact(soundProxy, 'sound_console');
  soundGroup.add(soundProxy);
  soundGroup.position.set(W/2 - 0.65, 0.65, 0.5);
  soundGroup.rotation.y = -Math.PI/2;
  S.add(soundGroup);

  // ── Dead Intercom (beside door, south wall) ────────────────────────────────
  const intercomGroup = new THREE.Group();
  intercomGroup.add(mkBox(0.18, 0.22, 0.06, blackMat, 0, 0, 0));
  // Cracked housing detail
  intercomGroup.add(mkBox(0.14, 0.03, 0.02, darkMetalMat, 0, 0.06, 0.04));
  // Speaker grille slats
  for (let g2 = 0; g2 < 5; g2++) {
    intercomGroup.add(mkBox(0.12, 0.008, 0.015, new THREE.MeshStandardMaterial({ color: 0x060808, roughness: 0.8 }), 0, -0.02 + g2 * 0.025, 0.04));
  }
  // Coiled cable dangling
  intercomGroup.add(mkCyl(0.008, 0.008, 0.18, 6, darkMetalMat, 0.05, -0.2, 0.02, Math.PI/2, 0, 0.1));
  // Interaction proxy
  const intercomProxy = mkBox(0.22, 0.26, 0.12, new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0);
  intercomProxy.userData.id = 'dead_intercom';
  interact(intercomProxy, 'dead_intercom');
  intercomGroup.add(intercomProxy);
  intercomGroup.position.set(-3.0, 1.55, D/2 - 0.07);
  intercomGroup.rotation.y = Math.PI;
  S.add(intercomGroup);

  // ── Ceiling Cage Bulbs (2 amber emergency lights) ─────────────────────────
  const cagePositions = [[-3.5, H - 0.12, 0], [3.5, H - 0.12, 0]];
  cagePositions.forEach(([cx, cy, cz]) => {
    // Cage frame (rings)
    for (let ri = 0; ri < 4; ri++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.1, 0.008, 6, 14),
        cageMat
      );
      ring.position.set(cx, cy - 0.06, cz);
      ring.rotation.set(0, ri * Math.PI / 4, 0);
      S.add(ring);
    }
    // Bulb
    const bulb = mkSphere(0.055, 10, 8, amberBulbMat, cx, cy - 0.06, cz);
    S.add(bulb);
    // PointLight
    const pt = new THREE.PointLight(0xc47a00, 0.9, 5.5, 2);
    pt.position.set(cx, cy - 0.08, cz);
    S.add(pt);

    // One bulb is dim (failing filament)
    if (cx > 0) {
      pt.intensity = 0.35;
      amberBulbMat.emissiveIntensity = 0.5;
    }
  });

  // ── Atmospheric Lighting ──────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x0a0e0a, 0.06);
  S.add(ambient);

  // ── Animation Loop ────────────────────────────────────────────────────────
  let t = 0;
  const flickerMonitors = [0, 2]; // indices of monitors that randomly flicker
  const monitorsToFlicker = flickerMonitors.map(i => monitorScreens[i]);

  anim((dt) => {
    t += dt;

    // Plastic sheeting sine wave
    origPositions.forEach(({ geo, orig }) => {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const iy = i * 3 + 1;
        const ix = i * 3;
        const origY = orig[iy];
        const origX = orig[ix];
        // Low amplitude, slow sine-wave drift
        pos.array[ix] = orig[ix] + Math.sin(t * 0.4 + origY * 1.5) * 0.025;
        pos.array[iy] = orig[iy] + Math.sin(t * 0.3 + orig[ix] * 2.0) * 0.015;
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    });

    // Monitor flicker (random threshold)
    monitorsToFlicker.forEach(mon => {
      if (Math.random() < 0.012) {
        const on = Math.random() > 0.15;
        mon.mat.emissiveIntensity = on ? 0.5 + Math.random() * 0.3 : 0;
      }
    });

    // Relay rack activity lights
    actLights.forEach(al => {
      al.timer -= dt;
      if (al.timer <= 0) {
        al.timer = al.interval * (0.5 + Math.random());
        const on = Math.random() > 0.3;
        al.mat.emissiveIntensity = on ? 1.5 : 0;
      }
    });

    // Failing filament flicker (right cage bulb dims in and out)
    const failIntensity = 0.25 + Math.sin(t * 2.3) * 0.1 + Math.sin(t * 7.1) * 0.06;
  });

  // Store monitor references on E for horror system access
  E._monitorScreens = monitorScreens;
}


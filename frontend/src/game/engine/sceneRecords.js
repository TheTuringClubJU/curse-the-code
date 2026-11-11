// 3D Procedural Scene Builder for Room 4: The Rotting Archive
// Strict Three.js geometric primitives & procedural canvas textures. Zero external models.
import * as THREE from 'three';
import * as X from './tex.js';
import * as XR from './texRecords.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export function buildRecordsScene(E) {
  const { S, add, solid, anim, interact, flick, lightRig, glow } = E;
  const [W, H, D] = [10, 3.2, 8];

  // --- Common Procedural Materials ---
  const wallTex = XR.tex(XR.archiveWall(), { repeat: [4, 2] });
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    bumpMap: wallTex,
    bumpScale: 0.8,
    roughness: 0.92,
    metalness: 0.05
  });

  const floorTex = XR.tex(XR.floodedFloor(), { repeat: [5, 4] });
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    bumpMap: floorTex,
    bumpScale: 1.2,
    roughness: 0.35, // High wetness sheen
    metalness: 0.15
  });

  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x111617,
    roughness: 0.98,
    metalness: 0.1
  });

  const rustedSteelTex = XR.tex(XR.rustedSteel());
  const rustedSteelMat = new THREE.MeshStandardMaterial({
    map: rustedSteelTex,
    bumpMap: rustedSteelTex,
    bumpScale: 0.6,
    roughness: 0.75,
    metalness: 0.45
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e20,
    roughness: 0.65,
    metalness: 0.8
  });

  const oakTex = XR.tex(XR.dampOak());
  const oakMat = new THREE.MeshStandardMaterial({
    map: oakTex,
    bumpMap: oakTex,
    bumpScale: 0.5,
    roughness: 0.82
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc89e48,
    roughness: 0.4,
    metalness: 0.85
  });

  // --- Helper Geometry Builders ---
  const mkBox = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const mkCyl = (rt, rb, h, seg, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // --- 1. ROOM SHELL (Walls, Floor, Ceiling) ---
  // Concrete sub-floor
  const floor = mkBox(W, 0.1, D, floorMat, 0, -0.05, 0);
  floor.receiveShadow = true;
  S.add(floor);

  // Stagnant Black Water Layer
  const waterGeo = new THREE.PlaneGeometry(W - 0.05, D - 0.05, 24, 24);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x051218,
    roughness: 0.08,
    metalness: 0.75,
    transparent: true,
    opacity: 0.82
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, 0.035, 0);
  waterMesh.receiveShadow = true;
  waterMesh.userData.np = 1; // Don't pick water plane
  S.add(waterMesh);

  // Subtle water ripple animation
  anim((t) => {
    const pos = waterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      const w = pos.getZ(i);
      const wave = Math.sin(u * 3.5 + t * 1.8) * Math.cos(w * 3.5 + t * 1.4) * 0.003;
      pos.setY(i, wave);
    }
    pos.needsUpdate = true;
  });

  // Ceiling slab
  const ceil = mkBox(W, 0.1, D, ceilMat, 0, H + 0.05, 0);
  S.add(ceil);

  // Boundary walls
  const wallN = mkBox(W, H, 0.1, wallMat, 0, H / 2, -D / 2 - 0.05);
  const wallS = mkBox(W, H, 0.1, wallMat, 0, H / 2, D / 2 + 0.05);
  const wallW = mkBox(0.1, H, D, wallMat, -W / 2 - 0.05, H / 2, 0);
  const wallE = mkBox(0.1, H, D, wallMat, W / 2 + 0.05, H / 2, 0);
  S.add(wallN, wallS, wallW, wallE);

  // Bloody handprint wall decal on East wall
  const bloodTex = XR.tex(XR.bloodyDecal());
  const bloodDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.7),
    new THREE.MeshStandardMaterial({
      map: bloodTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1
    })
  );
  bloodDecal.position.set(W / 2 - 0.01, 1.6, -1.0);
  bloodDecal.rotation.y = -Math.PI / 2;
  bloodDecal.userData.np = 1;
  S.add(bloodDecal);

  // --- 2. CEILING RUSTED PIPES & WATER DRIPS ---
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.8, metalness: 0.6 });
  const p1 = mkCyl(0.06, 0.06, W - 0.4, 12, pipeMat, 0, H - 0.18, -1.5, 0, 0, Math.PI / 2);
  const p2 = mkCyl(0.05, 0.05, W - 0.4, 12, pipeMat, 0, H - 0.28, 1.2, 0, 0, Math.PI / 2);
  const pCross = mkCyl(0.04, 0.04, D - 0.4, 12, pipeMat, 2.0, H - 0.22, 0, Math.PI / 2, 0, 0);
  S.add(p1, p2, pCross);

  // Falling water drip particle system
  const dripCount = 4;
  const dripPoints = [
    [-2.2, H - 0.2, -1.5],
    [1.8, H - 0.3, 1.2],
    [3.5, H - 0.2, -0.4],
    [-3.8, H - 0.2, 2.0]
  ];
  const dripMeshes = dripPoints.map((pt) => {
    const d = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6),
      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.75 })
    );
    d.position.set(pt[0], pt[1], pt[2]);
    d.userData.startY = pt[1];
    d.userData.speed = 4.5 + Math.random() * 2.0;
    d.userData.np = 1;
    S.add(d);
    return d;
  });

  anim((t, dt) => {
    dripMeshes.forEach((d) => {
      d.position.y -= dt * d.userData.speed;
      if (d.position.y <= 0.04) {
        d.position.y = d.userData.startY;
      }
    });
  });

  // --- 3. LIGHTING FIXTURES (Fluorescents + Bulkhead Emergency Light) ---
  // Industrial fluorescent strips suspended from ceiling
  const createFluorescentFixture = (x, z) => {
    const fix = new THREE.Group();
    fix.position.set(x, H - 0.15, z);

    // Metal housing
    const housing = mkBox(2.2, 0.08, 0.3, darkMetalMat, 0, 0, 0);
    fix.add(housing);

    // Two fluorescent glass tubes
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0xecf6ff,
      emissive: 0xecf6ff,
      emissiveIntensity: 1.0,
      roughness: 0.2
    });
    const t1 = mkCyl(0.02, 0.02, 1.9, 12, tubeMat, 0, -0.06, -0.08, 0, 0, Math.PI / 2);
    const t2 = mkCyl(0.02, 0.02, 1.9, 12, tubeMat, 0, -0.06, 0.08, 0, 0, Math.PI / 2);
    fix.add(t1, t2);

    // Point Light
    const pl = new THREE.PointLight(0xaed6f8, 3.8, 12, 1.8);
    pl.position.set(0, -0.25, 0);
    fix.add(pl);

    lightRig(pl, 3.8, flick(Math.floor(x * 10 + z), 0.35));
    glow(tubeMat, 1.0, flick(Math.floor(x * 10 + z), 0.35));

    S.add(fix);
  };

  createFluorescentFixture(0, -1.2);
  createFluorescentFixture(0, 1.6);

  // Bulkhead Door Emergency Amber Beacon
  const amberLight = new THREE.PointLight(0xe08418, 2.8, 8, 2.0);
  amberLight.position.set(0, 2.7, -3.5);
  S.add(amberLight);
  lightRig(amberLight, 2.8, flick(7, 0.2));

  // --- 4. INTERACTIVE PROP: FILING CABINET A (`filing_cabinet_a`) ---
  {
    const cabA = new THREE.Group();
    cabA.position.set(4.3, 0, -1.8);
    cabA.rotation.y = -Math.PI / 2;

    // Body
    cabA.add(mkBox(0.65, 1.45, 0.6, rustedSteelMat, 0, 0.725, 0));
    // 4 drawers with handles
    for (let i = 0; i < 4; i++) {
      const drawerY = 0.2 + i * 0.34;
      const isAjar = i === 0; // Bottom drawer ajar (holds ER01)
      const dZ = isAjar ? 0.08 : 0;
      cabA.add(mkBox(0.58, 0.3, 0.03, darkMetalMat, 0, drawerY, 0.31 + dZ));
      cabA.add(mkBox(0.14, 0.03, 0.03, brassMat, 0, drawerY, 0.33 + dZ));
    }

    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0.75, 0);
    cabA.add(hit);

    interact(cabA, 'filing_cabinet_a');
    add(cabA);
    solid(3.8, 4.8, -2.4, -1.2);
  }

  // --- 5. INTERACTIVE PROP: FILING CABINET B (`filing_cabinet_b`) ---
  {
    const cabB = new THREE.Group();
    cabB.position.set(4.3, 0, -0.6);
    cabB.rotation.y = -Math.PI / 2;

    cabB.add(mkBox(0.65, 1.45, 0.6, rustedSteelMat, 0, 0.725, 0));
    for (let i = 0; i < 4; i++) {
      const drawerY = 0.2 + i * 0.34;
      const isDented = i === 1; // 2nd drawer dented (holds ER03)
      cabB.add(mkBox(0.58, 0.3, 0.03, darkMetalMat, 0, drawerY, 0.31, isDented ? 0.05 : 0, 0, 0));
      cabB.add(mkBox(0.14, 0.03, 0.03, brassMat, 0, drawerY, 0.33));
    }

    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0.75, 0);
    cabB.add(hit);

    interact(cabB, 'filing_cabinet_b');
    add(cabB);
    solid(3.8, 4.8, -1.2, 0.0);
  }

  // --- 6. INTERACTIVE PROP: ARCHIVE SHELVES (`archive_shelves`) ---
  {
    const shelves = new THREE.Group();
    shelves.position.set(-4.3, 0, -1.2);
    shelves.rotation.y = Math.PI / 2;

    // 4 vertical angle iron posts
    const postMat = darkMetalMat;
    [[-0.9, -0.3], [0.9, -0.3], [-0.9, 0.3], [0.9, 0.3]].forEach(([px, pz]) => {
      shelves.add(mkBox(0.06, 2.2, 0.06, postMat, px, 1.1, pz));
    });

    // 4 horizontal metal shelf tiers
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 });
    for (let s = 0; s < 4; s++) {
      const sy = 0.3 + s * 0.55;
      shelves.add(mkBox(1.85, 0.04, 0.65, rustedSteelMat, 0, sy, 0));

      // Waterlogged document boxes sitting on shelves
      if (s < 3) {
        shelves.add(mkBox(0.45, 0.32, 0.52, boxMat, -0.55, sy + 0.18, 0));
        shelves.add(mkBox(0.45, 0.32, 0.52, boxMat, 0.0, sy + 0.18, 0.04, 0, 0.08, 0));
        shelves.add(mkBox(0.42, 0.28, 0.48, boxMat, 0.55, sy + 0.16, -0.02));
      }
    }

    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.3, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 1.1, 0);
    shelves.add(hit);

    interact(shelves, 'archive_shelves');
    add(shelves);
    solid(-4.8, -3.7, -2.3, -0.1);
  }

  // --- 7. INTERACTIVE PROP: CLERK'S DESK (`clerk_desk`) + INCIDENT REPORT (`report_folder`) ---
  {
    const desk = new THREE.Group();
    desk.position.set(2.4, 0, -2.6);

    // Desktop
    desk.add(mkBox(1.8, 0.06, 0.9, rustedSteelMat, 0, 0.74, 0));
    // Metal legs and drawer pedestals
    desk.add(mkBox(0.5, 0.7, 0.8, darkMetalMat, -0.6, 0.36, 0));
    desk.add(mkBox(0.5, 0.7, 0.8, darkMetalMat, 0.6, 0.36, 0));

    // Desk Lamp with gooseneck
    const lampArm = mkCyl(0.015, 0.015, 0.45, 8, darkMetalMat, -0.65, 0.98, -0.25, 0.3, 0, 0);
    const lampShade = mkCyl(0.12, 0.16, 0.18, 12, darkMetalMat, -0.65, 1.15, -0.15, 0.6, 0, 0);
    desk.add(lampArm, lampShade);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 1.1), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0.6, 0);
    desk.add(hit);

    interact(desk, 'clerk_desk');
    add(desk);
    solid(1.3, 3.5, -3.2, -2.0);

    // CLUE TERMINAL: Yellowed Incident Folder CF-79A2 (`report_folder`, Clue R2-02)
    const folderCoverTex = XR.tex(XR.manilaFolderCover());
    const folder = new THREE.Group();
    folder.position.set(2.55, 0.775, -2.45);
    folder.rotation.y = 0.15;

    const folderMesh = mkBox(0.36, 0.02, 0.48, new THREE.MeshStandardMaterial({
      map: folderCoverTex,
      roughness: 0.85
    }), 0, 0.01, 0);
    folder.add(folderMesh);

    const fHit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    fHit.position.set(0, 0.1, 0);
    folder.add(fHit);

    interact(folder, 'report_folder');
    add(folder);
  }

  // --- 8. INTERACTIVE PROP: WIRE WASTE BASKET (`waste_basket`) ---
  {
    const basket = new THREE.Group();
    basket.position.set(1.2, 0, -2.7);

    // Wire mesh cylinder
    const basketMesh = mkCyl(0.2, 0.16, 0.42, 14, darkMetalMat, 0, 0.21, 0);
    basket.add(basketMesh);

    // Crumpled soggy papers inside
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xc8c0a8, roughness: 0.9 });
    for (let i = 0; i < 4; i++) {
      const p = mkBox(0.08, 0.08, 0.08, paperMat, (Math.random() - 0.5) * 0.15, 0.2 + i * 0.04, (Math.random() - 0.5) * 0.15);
      p.rotation.set(Math.random(), Math.random(), Math.random());
      basket.add(p);
    }

    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0.25, 0);
    basket.add(hit);

    interact(basket, 'waste_basket');
    add(basket);
  }

  // --- 9. CLUE TERMINAL: MICROFILM VIEWER (`microfilm_reader`, Clue R2-03) ---
  {
    const viewer = new THREE.Group();
    viewer.position.set(-2.8, 0, -2.9);

    // Stand table
    viewer.add(mkBox(1.1, 0.72, 0.8, darkMetalMat, 0, 0.36, 0));

    // Vintage CRT Microfilm Console Housing
    const consoleHousing = mkBox(0.72, 0.55, 0.58, darkMetalMat, 0, 0.98, 0);
    viewer.add(consoleHousing);

    // Hooded green phosphor screen
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x18e878 });
    const screen = mkBox(0.48, 0.36, 0.02, screenMat, 0, 1.02, 0.28, -0.15, 0, 0);
    viewer.add(screen);

    // Screen light cast onto player
    const screenLight = new THREE.PointLight(0x18e878, 1.2, 2.5, 2);
    screenLight.position.set(0, 1.02, 0.5);
    viewer.add(screenLight);

    // Brass Rotary Dial on control deck
    const dial = mkCyl(0.06, 0.06, 0.04, 16, brassMat, 0.18, 0.78, 0.24, Math.PI / 4, 0, 0);
    viewer.add(dial);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0.75, 0);
    viewer.add(hit);

    interact(viewer, 'microfilm_reader');
    add(viewer);
    solid(-3.5, -2.1, -3.4, -2.3);
  }

  // --- 10. CLUE TERMINAL: WHITEBOARD OF EVENT CARDS (`timeline_board`, Clue R2-04) ---
  {
    const board = new THREE.Group();
    board.position.set(-4.92, 1.8, 1.0);
    board.rotation.y = Math.PI / 2;

    // Aluminum frame + white corkboard
    board.add(mkBox(2.2, 1.2, 0.04, darkMetalMat, 0, 0, 0));
    const corkMat = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.9 });
    board.add(mkBox(2.1, 1.1, 0.02, corkMat, 0, 0, 0.025));

    // Pinned index cards representation
    const cardMat = new THREE.MeshStandardMaterial({ color: 0xede4d0, roughness: 0.95 });
    for (let c = 0; c < 8; c++) {
      const cx = -0.85 + (c % 4) * 0.55;
      const cy = c < 4 ? 0.24 : -0.24;
      const card = mkBox(0.45, 0.32, 0.015, cardMat, cx, cy, 0.04);
      card.rotation.z = (Math.random() - 0.5) * 0.06;
      board.add(card);

      // Red pushpin
      const pin = mkCyl(0.015, 0.015, 0.02, 8, new THREE.MeshBasicMaterial({ color: 0xd92618 }), cx, cy + 0.13, 0.055, Math.PI / 2, 0, 0);
      board.add(pin);
    }

    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.3, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0, 0.2);
    board.add(hit);

    interact(board, 'timeline_board');
    add(board);
  }

  // --- 11. INTERACTIVE PROP: CARD CATALOG (`card_catalog`) ---
  {
    const catalog = new THREE.Group();
    catalog.position.set(4.35, 0, 1.6);
    catalog.rotation.y = -Math.PI / 2;

    // Wooden cabinet body
    catalog.add(mkBox(1.2, 1.3, 0.55, oakMat, 0, 0.9, 0));

    // Metal stand legs
    catalog.add(mkBox(1.15, 0.25, 0.5, darkMetalMat, 0, 0.125, 0));

    // 30 small drawers with brass pull labels
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const dx = -0.48 + col * 0.19;
        const dy = 0.42 + row * 0.22;
        catalog.add(mkBox(0.16, 0.18, 0.015, oakMat, dx, dy, 0.285));
        catalog.add(mkBox(0.08, 0.04, 0.02, brassMat, dx, dy, 0.30));
      }
    }

    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0.8, 0);
    catalog.add(hit);

    interact(catalog, 'card_catalog');
    add(catalog);
    solid(3.8, 4.8, 0.8, 2.4);
  }

  // --- 12. INTERACTIVE PROP: CORRODED VENT GRATE (`vent_grate`) ---
  {
    const vent = new THREE.Group();
    vent.position.set(-4.94, 0.38, 2.8);
    vent.rotation.y = Math.PI / 2;

    // Dark void inside wall
    vent.add(mkBox(0.7, 0.55, 0.1, new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 0, -0.05));

    // Metal frame and horizontal vent slats
    vent.add(mkBox(0.72, 0.58, 0.04, darkMetalMat, 0, 0, 0.02));
    for (let s = 0; s < 6; s++) {
      const sy = -0.2 + s * 0.08;
      vent.add(mkBox(0.64, 0.025, 0.04, rustedSteelMat, 0, sy, 0.04, 0.4, 0, 0));
    }

    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 0, 0.15);
    vent.add(hit);

    interact(vent, 'vent_grate');
    add(vent);
  }

  // --- 13. CLUE TERMINAL & EXIT: SEALED BULKHEAD DOOR (`bulkhead_door`, Clue R2-07) ---
  {
    const bulkhead = new THREE.Group();
    bulkhead.position.set(0, 0, -3.92);

    // Door frame recessed into North wall
    const frameMat = darkMetalMat;
    bulkhead.add(mkBox(2.2, 2.6, 0.18, frameMat, 0, 1.3, 0));

    // Massive round-cornered submarine door slab with hazard textures
    const doorTex = XR.tex(XR.bulkheadTexture());
    const doorMat = new THREE.MeshStandardMaterial({
      map: doorTex,
      bumpMap: doorTex,
      bumpScale: 0.8,
      roughness: 0.65,
      metalness: 0.45
    });
    const doorMesh = mkBox(1.8, 2.3, 0.12, doorMat, 0, 1.25, 0.08);
    bulkhead.add(doorMesh);

    // Center circular locking wheel
    const wheelHub = mkCyl(0.18, 0.18, 0.1, 16, darkMetalMat, 0, 1.25, 0.18, Math.PI / 2, 0, 0);
    const wheelRim = mkCyl(0.36, 0.36, 0.04, 24, brassMat, 0, 1.25, 0.22, Math.PI / 2, 0, 0);
    bulkhead.add(wheelHub, wheelRim);

    // Electronic Access Terminal / Keypad mounted on right frame
    const panel = new THREE.Group();
    panel.position.set(1.2, 1.3, 0.12);
    panel.add(mkBox(0.32, 0.45, 0.08, darkMetalMat, 0, 0, 0));
    // LED Display (Amber)
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffa018 });
    panel.add(mkBox(0.24, 0.08, 0.02, ledMat, 0, 0.12, 0.045));
    // Keypad buttons
    panel.add(mkBox(0.24, 0.2, 0.02, rustedSteelMat, 0, -0.06, 0.045));
    bulkhead.add(panel);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 1.4, 0.2);
    bulkhead.add(hit);

    interact(bulkhead, 'bulkhead_door');
    add(bulkhead);

    // Expose door open anim reference
    E.ref.bulkheadDoor = {
      mesh: doorMesh,
      wheel: wheelRim,
      isOpen: false,
      openAnim: 0
    };

    anim((t, dt) => {
      const bh = E.ref.bulkheadDoor;
      if (bh && bh.isOpen && bh.openAnim < 1.0) {
        bh.openAnim = Math.min(1.0, bh.openAnim + dt * 0.4);
        // Spin locking wheel
        bh.wheel.rotation.z += dt * 4.0;
        // Slide heavy door sideways
        bh.mesh.position.x = bh.openAnim * 1.8;
      }
    });

    solid(-1.3, 1.3, -4.0, -3.7);
  }

  // --- 14. ENTRANCE VAULT HATCH: South Wall Door (`room_door`) ---
  {
    const hatch = new THREE.Group();
    hatch.position.set(0, 0, 3.92);
    hatch.rotation.y = Math.PI;

    hatch.add(mkBox(1.8, 2.4, 0.12, darkMetalMat, 0, 1.2, 0));
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.5, 0.5), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 1.2, 0.2);
    hatch.add(hit);

    interact(hatch, 'room_door');
    add(hatch);
    E.ref.roomDoor = { isOpen: false };
    solid(-1.1, 1.1, 3.7, 4.0);
  }

  // --- 15. PARANORMAL SPECTRAL ENTITY SPRITE (Billboard) ---
  const entityTex = XR.tex(XR.followerEntitySprite());
  const entitySprite = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 2.8),
    new THREE.MeshBasicMaterial({
      map: entityTex,
      transparent: true,
      fog: false,
      depthWrite: false
    })
  );
  entitySprite.position.set(0, 1.4, -2.0);
  entitySprite.visible = false;
  entitySprite.userData.np = 1;
  S.add(entitySprite);
  E.ref.stalkerEntity = entitySprite;

  return {
    waterMesh,
    entitySprite
  };
}

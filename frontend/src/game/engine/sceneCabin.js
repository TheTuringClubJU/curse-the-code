// 3D Procedural Scene Builder for Room 1: RE4 Village Cabin (r100 / r102 / r103)
// Authentic Resident Evil 4 atmosphere: gritty textures, pitch darkness, warm amber lantern,
// cold pale moonlight through broken shutters, tactical first-person flashlight, survival horror props.
import * as THREE from 'three';
import * as XC from './texCabin.js';

export function buildCabinScene(E) {
  const { S, add, solid, anim, interact, flick, lightRig, glow, ref, cam, W = 12, H = 3.4, D = 8 } = E;

  // ── Material Palette ──────────────────────────────────────────────────────────
  const floorTex = XC.tex(XC.cabinFloorPlanks(), { repeat: [4, 3] });
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    bumpMap: floorTex,
    bumpScale: 0.8,
    roughness: 0.85,
    metalness: 0.05
  });

  const logTex = XC.tex(XC.cabinLogWall(), { repeat: [3, 2] });
  const logMat = new THREE.MeshStandardMaterial({
    map: logTex,
    bumpMap: logTex,
    bumpScale: 0.9,
    roughness: 0.92,
    metalness: 0.02
  });

  const plasterTex = XC.tex(XC.cabinPlasterWall(), { repeat: [2, 2] });
  const plasterMat = new THREE.MeshStandardMaterial({
    map: plasterTex,
    roughness: 0.95,
    metalness: 0.0
  });

  const ceilTex = XC.tex(XC.cabinCeiling(), { repeat: [4, 3] });
  const ceilMat = new THREE.MeshStandardMaterial({
    map: ceilTex,
    roughness: 0.98,
    metalness: 0.0
  });

  const ironTex = XC.tex(XC.rustedCastIron(), { repeat: [1, 1] });
  const ironMat = new THREE.MeshStandardMaterial({
    map: ironTex,
    roughness: 0.75,
    metalness: 0.65
  });

  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x221810,
    roughness: 0.82,
    metalness: 0.04
  });

  const wornWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3d2c1d,
    roughness: 0.88,
    metalness: 0.02
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc89e46,
    roughness: 0.35,
    metalness: 0.82
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x88aacc,
    transparent: true,
    opacity: 0.35,
    roughness: 0.15,
    metalness: 0.1
  });

  const bloodStoneMat = new THREE.MeshStandardMaterial({
    color: 0x1f1917,
    roughness: 0.95,
    metalness: 0.1
  });

  // Helpers
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

  // ── Room Shell ───────────────────────────────────────────────────────────────
  // Floor
  const floor = mkBox(W, 0.1, D, floorMat, 0, -0.05, 0);
  add(floor);

  // Ceiling
  const ceiling = mkBox(W, 0.1, D, ceilMat, 0, H + 0.05, 0);
  add(ceiling);

  // Outer Shell Walls (Heavy dark logs)
  const northWall = mkBox(W, H, 0.2, logMat, 0, H / 2, -D / 2);
  add(northWall);
  const southWall = mkBox(W, H, 0.2, logMat, 0, H / 2, D / 2);
  add(southWall);
  const eastWall  = mkBox(0.2, H, D, plasterMat, W / 2, H / 2, 0);
  add(eastWall);
  const westWall  = mkBox(0.2, H, D, logMat, -W / 2, H / 2, 0);
  add(westWall);

  // Room Wall Collision Solids
  solid(-W / 2, W / 2, -D / 2, -D / 2 + 0.35);
  solid(-W / 2, W / 2, D / 2 - 0.35, D / 2);
  solid(-W / 2, -W / 2 + 0.35, -D / 2, D / 2);
  solid(W / 2 - 0.35, W / 2, -D / 2, D / 2);

  // Heavy ceiling rafters across the room
  for (let rz = -D / 2 + 1.2; rz < D / 2; rz += 1.8) {
    const rafter = mkBox(W, 0.22, 0.2, darkWoodMat, 0, H - 0.11, rz);
    add(rafter);
    // Suspended rusted chains / meat hooks
    if (Math.abs(rz) < 2) {
      const chain = mkCyl(0.012, 0.012, 0.65, 8, ironMat, 0.8, H - 0.5, rz);
      add(chain);
      const hook = mkBox(0.04, 0.08, 0.02, ironMat, 0.8, H - 0.85, rz);
      add(hook);
    }
  }

  // ── Compound Partition Walls ──────────────────────────────────────────────────
  // Partition 1: Separating 1A (Entry Porch) and 1B (Master Cabin) at X = -2.2
  // North partition segment
  const part1North = mkBox(0.18, H, 2.6, logMat, -2.2, H / 2, -D / 2 + 1.3);
  add(part1North);
  solid(-2.35, -2.05, -D / 2, -D / 2 + 2.6);

  // South partition segment
  const part1South = mkBox(0.18, H, 2.6, logMat, -2.2, H / 2, D / 2 - 1.3);
  add(part1South);
  solid(-2.35, -2.05, D / 2 - 2.6, D / 2);

  // Door lintel above central archway
  const lintel1 = mkBox(0.24, 0.8, 2.8, darkWoodMat, -2.2, H - 0.4, 0);
  add(lintel1);

  // Partition 2: Separating 1B and 1C (Cellar Nook) at X = 2.4
  const part2Wall = mkBox(0.18, H, D, plasterMat, 2.4, H / 2, 0);
  add(part2Wall);
  solid(2.25, 2.55, -D / 2, D / 2);

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 1A: ENTRY PORCH & CREAKING HALLWAY (r100 Approach)
  // X: -6.0 to -2.2, Z: -4.0 to 4.0
  // ══════════════════════════════════════════════════════════════════════════════

  // 1. Heavy Wooden Front Entry Door (Bolted shut from outside)
  const entryDoorGroup = new THREE.Group();
  const doorSlab = mkBox(0.12, 2.4, 1.4, darkWoodMat, 0, 1.2, 0);
  entryDoorGroup.add(doorSlab);
  // Heavy horizontal iron strap bands & cross brace
  entryDoorGroup.add(mkBox(0.16, 0.08, 1.36, ironMat, 0, 0.5, 0));
  entryDoorGroup.add(mkBox(0.16, 0.08, 1.36, ironMat, 0, 1.9, 0));
  entryDoorGroup.add(mkBox(0.18, 0.12, 0.25, ironMat, 0.02, 1.2, -0.4)); // heavy iron sliding deadbolt
  entryDoorGroup.position.set(-W / 2 + 0.15, 0, 0);
  interact(entryDoorGroup, 'entry_door');
  add(entryDoorGroup);
  solid(-W / 2, -W / 2 + 0.5, -0.8, 0.8);

  // 2. Rusted Cast-Iron Coat Rack with Dripping Trenchcoat
  const coatRackGroup = new THREE.Group();
  // Central iron pole & tripod base
  coatRackGroup.add(mkCyl(0.025, 0.035, 2.1, 12, ironMat, 0, 1.05, 0));
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const leg = mkBox(0.28, 0.03, 0.03, ironMat, Math.cos(ang) * 0.18, 0.06, Math.sin(ang) * 0.18, 0, ang, 0.25);
    coatRackGroup.add(leg);
    // Upper hanging hooks
    const hook = mkBox(0.16, 0.04, 0.03, ironMat, Math.cos(ang) * 0.12, 1.95, Math.sin(ang) * 0.12, 0, ang, -0.3);
    coatRackGroup.add(hook);
  }
  // Wet trenchcoat draped over hook
  const coatMat = new THREE.MeshStandardMaterial({ color: 0x181410, roughness: 0.95 });
  const coatBody = mkBox(0.35, 1.1, 0.25, coatMat, 0.06, 1.35, 0.06);
  coatRackGroup.add(coatBody);
  coatRackGroup.position.set(-4.5, 0, -2.6);
  interact(coatRackGroup, 'coat_rack');
  add(coatRackGroup);
  solid(-4.8, -4.2, -2.9, -2.3);

  // 3. Flickering Oil Sconce on Hallway Wall
  const sconceGroup = new THREE.Group();
  sconceGroup.add(mkBox(0.05, 0.25, 0.08, ironMat, -0.05, 0, 0)); // wall mount
  sconceGroup.add(mkCyl(0.04, 0.02, 0.15, 12, ironMat, 0.1, -0.05, 0));
  // Amber flame bulb
  const sconceBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffaa33,
    emissive: new THREE.Color(0xff8811),
    emissiveIntensity: 1.8,
    roughness: 0.3
  });
  const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 8), sconceBulbMat);
  flameMesh.position.set(0.1, 0.06, 0);
  sconceGroup.add(flameMesh);

  const sconceLight = new THREE.PointLight(0xff8820, 1.8, 6.0, 2);
  sconceLight.position.set(0.15, 0.1, 0);
  sconceGroup.add(sconceLight);
  sconceGroup.position.set(-2.32, 1.9, -1.2);
  interact(sconceGroup, 'hallway_sconce');
  add(sconceGroup);
  lightRig?.(sconceLight, 1.8, flick(12, 0.45));

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 1B: ABANDONED CABIN / MASTER LIVING AREA (r102 / r103)
  // X: -2.2 to 2.4, Z: -4.0 to 4.0
  // ══════════════════════════════════════════════════════════════════════════════

  // 4. Central Rustic Timber Dining Table & Props
  const tableGroup = new THREE.Group();
  // Table top (heavy thick rough-hewn pine)
  const tableTop = mkBox(1.9, 0.09, 1.1, wornWoodMat, 0, 0.8, 0);
  tableGroup.add(tableTop);
  // 4 sturdy timber legs
  const legCoords = [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]];
  legCoords.forEach(([lx, lz]) => {
    tableGroup.add(mkBox(0.09, 0.8, 0.09, darkWoodMat, lx, 0.4, lz));
  });

  // (A) Antique Brass Kerosene Lantern
  const lanternGroup = new THREE.Group();
  lanternGroup.add(mkCyl(0.07, 0.09, 0.06, 14, brassMat, 0, 0.03, 0));
  lanternGroup.add(mkCyl(0.05, 0.05, 0.16, 14, glassMat, 0, 0.14, 0));
  lanternGroup.add(mkCyl(0.08, 0.06, 0.05, 14, brassMat, 0, 0.24, 0));
  // Internal kerosene flame
  const lanternFlame = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffcc44,
      emissive: new THREE.Color(0xff9911),
      emissiveIntensity: 2.2
    })
  );
  lanternFlame.position.set(0, 0.13, 0);
  lanternGroup.add(lanternFlame);

  const tableLanternLight = new THREE.PointLight(0xff9922, 3.2, 8.5, 2);
  tableLanternLight.position.set(0, 0.2, 0);
  lanternGroup.add(tableLanternLight);
  lanternGroup.position.set(0.3, 0.845, 0.15);
  tableGroup.add(lanternGroup);
  lightRig?.(tableLanternLight, 3.2, flick(3, 0.3));

  // (B) RE4 Handwritten Village Memo (Officer's Report) on the table
  const memoTex = XC.tex(XC.villageMemoTexture());
  const memoMat = new THREE.MeshStandardMaterial({ map: memoTex, roughness: 0.95 });
  const memoMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.42), memoMat);
  memoMesh.position.set(-0.35, 0.85, -0.1);
  memoMesh.rotation.set(-Math.PI / 2, 0, 0.15);
  tableGroup.add(memoMesh);

  // (C) RE4 Handgun Ammunition Box (9mm) on the table
  const ammoTex = XC.tex(XC.ammoBoxTexture());
  const ammoMat = new THREE.MeshStandardMaterial({ map: ammoTex, roughness: 0.7 });
  const ammoBoxMesh = mkBox(0.18, 0.09, 0.12, ammoMat, -0.4, 0.89, 0.28, 0, -0.3, 0);
  tableGroup.add(ammoBoxMesh);

  // (D) Chipped earthenware mug & pewter spoon
  const mug = mkCyl(0.045, 0.04, 0.1, 12, new THREE.MeshStandardMaterial({ color: 0x6e6456, roughness: 0.6 }), 0.55, 0.89, -0.22);
  tableGroup.add(mug);

  tableGroup.position.set(0.0, 0, 0.0);
  interact(tableGroup, 'lamp'); // Interacting with table/lamp
  interact(memoMesh, 'diary');  // Reading memo opens diary/file modal
  interact(ammoBoxMesh, 'nightstand'); // Looting ammo
  add(tableGroup);
  solid(-1.1, 1.1, -0.7, 0.7);

  // Two rough wooden chairs pulled up to the table
  const mkChair = (cx, cz, ry) => {
    const cg = new THREE.Group();
    cg.add(mkBox(0.44, 0.04, 0.44, wornWoodMat, 0, 0.44, 0));
    cg.add(mkBox(0.05, 0.44, 0.05, darkWoodMat, -0.18, 0.22, -0.18));
    cg.add(mkBox(0.05, 0.44, 0.05, darkWoodMat,  0.18, 0.22, -0.18));
    cg.add(mkBox(0.05, 0.44, 0.05, darkWoodMat, -0.18, 0.22,  0.18));
    cg.add(mkBox(0.05, 0.44, 0.05, darkWoodMat,  0.18, 0.22,  0.18));
    // Backrest
    cg.add(mkBox(0.04, 0.48, 0.04, darkWoodMat, -0.18, 0.68, -0.18));
    cg.add(mkBox(0.04, 0.48, 0.04, darkWoodMat,  0.18, 0.68, -0.18));
    cg.add(mkBox(0.42, 0.12, 0.03, wornWoodMat, 0, 0.86, -0.18));
    cg.position.set(cx, 0, cz);
    cg.rotation.y = ry;
    add(cg);
    solid(cx - 0.25, cx + 0.25, cz - 0.25, cz + 0.25);
  };
  mkChair(0.0, 1.0, Math.PI);
  mkChair(-1.3, 0.0, Math.PI / 2);

  // 5. Cast-Iron Woodstove / Fireplace in North-East Corner
  const stoveGroup = new THREE.Group();
  // Fireplace stone brick backer
  const hearthBacker = mkBox(1.6, 2.2, 0.2, bloodStoneMat, 0, 1.1, -0.45);
  stoveGroup.add(hearthBacker);
  // Potbelly cast iron body
  const stoveBody = mkCyl(0.38, 0.42, 0.85, 16, ironMat, 0, 0.65, 0);
  stoveGroup.add(stoveBody);
  // Stove legs
  for (let l = 0; l < 4; l++) {
    const ang = (l / 4) * Math.PI * 2;
    stoveGroup.add(mkBox(0.06, 0.22, 0.06, ironMat, Math.cos(ang) * 0.32, 0.11, Math.sin(ang) * 0.32));
  }
  // Iron stovepipe ascending to the ceiling
  stoveGroup.add(mkCyl(0.12, 0.12, H - 1.0, 14, ironMat, 0, 1.0 + (H - 1.0) / 2, 0));
  // Open stove grate with glowing embers
  const emberTex = XC.tex(XC.glowingEmbers());
  const emberMat = new THREE.MeshStandardMaterial({
    map: emberTex,
    emissiveMap: emberTex,
    emissive: new THREE.Color(0xff4400),
    emissiveIntensity: 2.5,
    roughness: 0.8
  });
  const emberGrate = mkBox(0.32, 0.25, 0.05, emberMat, 0, 0.55, 0.39);
  stoveGroup.add(emberGrate);

  // Fireplace flicker light
  const fireLight = new THREE.PointLight(0xff5511, 2.6, 7.0, 2);
  fireLight.position.set(0, 0.6, 0.6);
  stoveGroup.add(fireLight);
  lightRig?.(fireLight, 2.6, flick(44, 0.4));

  // Fireplace poker leaning against the hearth
  const poker = mkCyl(0.012, 0.012, 1.1, 8, ironMat, 0.65, 0.55, -0.2, 0.18, 0, -0.15);
  stoveGroup.add(poker);

  // Mounted deer antlers high above the stove on the log wall
  const antlerGroup = new THREE.Group();
  antlerGroup.add(mkBox(0.14, 0.16, 0.06, bloodStoneMat, 0, 0, 0)); // mount shield
  antlerGroup.add(mkCyl(0.02, 0.01, 0.6, 6, new THREE.MeshStandardMaterial({ color: 0xd0c4b0 }), -0.2, 0.25, 0.06, 0, 0, -0.5));
  antlerGroup.add(mkCyl(0.02, 0.01, 0.6, 6, new THREE.MeshStandardMaterial({ color: 0xd0c4b0 }),  0.2, 0.25, 0.06, 0, 0,  0.5));
  antlerGroup.position.set(0, 2.4, -0.42);
  stoveGroup.add(antlerGroup);

  stoveGroup.position.set(1.4, 0, -D / 2 + 0.7);
  interact(stoveGroup, 'candle'); // Inspect hearth / fire
  add(stoveGroup);
  solid(0.6, 2.2, -D / 2, -D / 2 + 1.2);

  // 6. Barricaded Broken Window on West Wall (Pale Moonlight Beam)
  const windowGroup = new THREE.Group();
  // Window frame
  const frameMat = darkWoodMat;
  windowGroup.add(mkBox(0.12, 1.8, 0.1, frameMat, 0, 0.9, -0.8));
  windowGroup.add(mkBox(0.12, 1.8, 0.1, frameMat, 0, 0.9,  0.8));
  windowGroup.add(mkBox(0.12, 0.1, 1.7, frameMat, 0, 0.05, 0));
  windowGroup.add(mkBox(0.12, 0.1, 1.7, frameMat, 0, 1.75, 0));

  // Shattered dirty glass shards
  const windowGlass = mkBox(0.02, 1.6, 1.5, glassMat, 0, 0.9, 0);
  windowGroup.add(windowGlass);

  // Jagged broken wooden planks nailed haphazardly across window
  windowGroup.add(mkBox(0.06, 0.16, 1.65, wornWoodMat, 0.05, 0.6, 0, 0.1, 0, 0));
  windowGroup.add(mkBox(0.06, 0.16, 1.65, wornWoodMat, 0.05, 1.2, 0, -0.12, 0, 0));

  // Directional pale cold moonlight beam piercing through the window
  const moonLight = new THREE.DirectionalLight(0x486488, 2.4);
  moonLight.position.set(-6, 3.5, 0);
  moonLight.target.position.set(2, 0, 0);
  windowGroup.add(moonLight);
  windowGroup.add(moonLight.target);

  // Volumetric moonlight dust shaft
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x6888aa,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.2, 5.0, 16, 1, true), beamMat);
  beamMesh.position.set(1.8, 0.7, 0);
  beamMesh.rotation.set(0, 0, -Math.PI / 3);
  windowGroup.add(beamMesh);

  windowGroup.position.set(-W / 2 + 0.15, 0.8, -1.2);
  add(windowGroup);

  // 7. Classic RE4 Wooden Supply Crate (Yellow Tape & Crest)
  const crateTex = XC.tex(XC.re4CrateTexture());
  const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.75, metalness: 0.15 });
  const crateMesh = mkBox(0.75, 0.75, 0.75, crateMat, -1.8, 0.375, -D / 2 + 0.65, 0, 0.15, 0);
  interact(crateMesh, 'trunk'); // Interacting / smashing crate
  add(crateMesh);
  solid(-2.2, -1.4, -D / 2, -D / 2 + 1.1);

  // 8. RE4 Vintage Typewriter Save Station on Small Round Table
  const typeGroup = new THREE.Group();
  // Round wooden side table
  typeGroup.add(mkCyl(0.35, 0.32, 0.05, 20, darkWoodMat, 0, 0.72, 0));
  typeGroup.add(mkCyl(0.04, 0.05, 0.7, 12, darkWoodMat, 0, 0.35, 0));
  typeGroup.add(mkCyl(0.24, 0.28, 0.04, 16, darkWoodMat, 0, 0.02, 0));

  // The Typewriter
  const typeMat = new THREE.MeshStandardMaterial({
    map: XC.tex(XC.typewriterFace()),
    roughness: 0.45,
    metalness: 0.55
  });
  const typewriterMesh = mkBox(0.36, 0.14, 0.32, typeMat, 0, 0.81, 0);
  typeGroup.add(typewriterMesh);

  // Carriage return & paper roller
  typeGroup.add(mkCyl(0.03, 0.03, 0.42, 12, ironMat, 0, 0.9, -0.08, 0, 0, Math.PI / 2));
  // White sheet of typed save paper sticking out
  const paperSheet = mkBox(0.22, 0.18, 0.005, new THREE.MeshStandardMaterial({ color: 0xf5eedc }), 0, 1.0, -0.06, -0.2, 0, 0);
  typeGroup.add(paperSheet);

  typeGroup.position.set(-1.8, 0, D / 2 - 0.8);
  interact(typeGroup, 'desk'); // Save progress / inspect typewriter
  add(typeGroup);
  solid(-2.2, -1.4, D / 2 - 1.2, D / 2);

  // 9. RE4 Potted Green Herb on Wooden Wall Shelf
  const shelfGroup = new THREE.Group();
  // Wooden plank shelf
  shelfGroup.add(mkBox(1.2, 0.04, 0.32, darkWoodMat, 0, 1.5, 0));
  shelfGroup.add(mkBox(0.04, 0.3, 0.3, ironMat, -0.5, 1.35, 0));
  shelfGroup.add(mkBox(0.04, 0.3, 0.3, ironMat,  0.5, 1.35, 0));

  // Terracotta flowerpot with green herb
  const potMat = new THREE.MeshStandardMaterial({ color: 0x8a4524, roughness: 0.8 });
  shelfGroup.add(mkCyl(0.1, 0.07, 0.16, 12, potMat, 0, 1.6, 0));
  // Jagged green herb leaves
  const herbMat = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.4, side: THREE.DoubleSide });
  for (let h = 0; h < 6; h++) {
    const hang = (h / 6) * Math.PI * 2;
    const leaf = mkBox(0.12, 0.02, 0.06, herbMat, Math.cos(hang) * 0.08, 1.72, Math.sin(hang) * 0.08, 0.3, hang, 0);
    shelfGroup.add(leaf);
  }

  // Small vintage mantel clock on the shelf
  const clockMat = new THREE.MeshStandardMaterial({ color: 0x3d2816, roughness: 0.6 });
  shelfGroup.add(mkBox(0.18, 0.22, 0.1, clockMat, 0.35, 1.63, 0));
  const clockFace = mkCyl(0.07, 0.07, 0.02, 16, brassMat, 0.35, 1.63, 0.05, Math.PI / 2, 0, 0);
  shelfGroup.add(clockFace);

  shelfGroup.position.set(0.6, 0, -D / 2 + 0.18);
  interact(shelfGroup, 'photo_frame'); // Inspect green herb
  interact(clockFace, 'clock');        // Inspect clock
  add(shelfGroup);

  // 10. Rustic Timber Bed Cot with Stained Canvas & Wool Blanket (RE4 Cabin Style)
  const bedGroup = new THREE.Group();
  // Rough-hewn log bed frame
  bedGroup.add(mkBox(1.3, 0.12, 2.2, darkWoodMat, 0, 0.35, 0));
  // 4 rough log corner posts
  bedGroup.add(mkBox(0.12, 0.9, 0.12, darkWoodMat, -0.6, 0.45, -1.05));
  bedGroup.add(mkBox(0.12, 0.9, 0.12, darkWoodMat,  0.6, 0.45, -1.05));
  bedGroup.add(mkBox(0.12, 0.6, 0.12, darkWoodMat, -0.6, 0.3,   1.05));
  bedGroup.add(mkBox(0.12, 0.6, 0.12, darkWoodMat,  0.6, 0.3,   1.05));
  // Headboard
  bedGroup.add(mkBox(1.2, 0.45, 0.06, darkWoodMat, 0, 0.65, -1.05));

  // Stained canvas mattress
  const mattressMat = new THREE.MeshStandardMaterial({
    color: 0x7a6c56,
    roughness: 0.95
  });
  bedGroup.add(mkBox(1.15, 0.2, 2.05, mattressMat, 0, 0.48, 0));

  // Coarse dark wool blanket
  const blanketMat = new THREE.MeshStandardMaterial({
    color: 0x241d18,
    roughness: 0.98
  });
  bedGroup.add(mkBox(1.18, 0.08, 1.4, blanketMat, 0, 0.54, 0.3));

  // Soiled feather pillow
  const pillowMat = new THREE.MeshStandardMaterial({
    color: 0x5a5246,
    roughness: 0.9
  });
  const pillow = mkBox(0.65, 0.14, 0.4, pillowMat, 0, 0.62, -0.8, -0.15, 0, 0);
  bedGroup.add(pillow);

  bedGroup.position.set(1.4, 0, 2.2);
  interact(bedGroup, 'bed');
  interact(pillow, 'pillow');
  add(bedGroup);
  solid(0.6, 2.2, 1.0, D / 2);

  // 11. Heavy Carved Spanish Armoire / Wardrobe (with Secret False Backboard!)
  const wardrobeGroup = new THREE.Group();
  // Outer carcass
  wardrobeGroup.add(mkBox(1.4, 2.5, 0.65, darkWoodMat, 0, 1.25, 0));
  // Carved pediment crown
  wardrobeGroup.add(mkBox(1.5, 0.12, 0.72, darkWoodMat, 0, 2.56, 0));

  // Two opening panel doors
  const doorR = mkBox(0.62, 2.2, 0.04, wornWoodMat, 0.32, 1.2, 0.32);
  const doorL = mkBox(0.62, 2.2, 0.04, wornWoodMat, -0.32, 1.2, 0.32);
  wardrobeGroup.add(doorR);
  wardrobeGroup.add(doorL);

  // Tarnished brass teardrop handles
  wardrobeGroup.add(mkBox(0.03, 0.09, 0.04, brassMat,  0.06, 1.2, 0.36));
  wardrobeGroup.add(mkBox(0.03, 0.09, 0.04, brassMat, -0.06, 1.2, 0.36));

  // The Concealed Secret Backboard leading into Section 1C
  const secretBackboard = mkBox(1.2, 2.0, 0.05, darkWoodMat, 0, 1.2, -0.28);
  wardrobeGroup.add(secretBackboard);
  ref.wardrobeSecret = secretBackboard;

  wardrobeGroup.position.set(2.35, 0, -1.4);
  interact(wardrobeGroup, 'wardrobe');
  interact(secretBackboard, 'wardrobe_secret');
  add(wardrobeGroup);
  solid(1.6, 2.4, -2.2, -0.6);

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 1C: HIDDEN RITUAL ALCOVE / CELLAR NOOK (r101 Secret Passage)
  // X: 2.4 to 6.0, Z: -4.0 to 4.0
  // ══════════════════════════════════════════════════════════════════════════════

  // 12. Heavy Oak Cellar Trapdoor in Floor (with claw scratches and iron padlock)
  const trapdoorTex = XC.tex(XC.cellarTrapdoorTexture());
  const trapdoorMat = new THREE.MeshStandardMaterial({
    map: trapdoorTex,
    bumpMap: trapdoorTex,
    bumpScale: 0.8,
    roughness: 0.8
  });
  const trapdoorMesh = mkBox(1.4, 0.03, 1.4, trapdoorMat, 4.2, 0.015, -1.8);
  // Heavy iron padlock on the latch
  const padlock = mkBox(0.12, 0.16, 0.06, brassMat, 4.2, 0.08, -1.1);
  interact(trapdoorMesh, 'ritual_lockbox'); // Or cellar hatch
  interact(padlock, 'ritual_lockbox');
  add(trapdoorMesh);
  add(padlock);

  // 13. Suspended Iron Birdcage with Glowing Occult Fragment
  const cageGroup = new THREE.Group();
  // Hanging chain from ceiling
  cageGroup.add(mkCyl(0.012, 0.012, 1.2, 8, ironMat, 0, 0.6, 0));
  // Iron birdcage bars
  const cageDome = mkCyl(0.3, 0.32, 0.55, 12, ironMat, 0, -0.15, 0);
  cageGroup.add(cageDome);

  // Glowing ritual fragment inside cage
  const fragMat = new THREE.MeshStandardMaterial({
    color: 0xffaa22,
    emissive: new THREE.Color(0xff8800),
    emissiveIntensity: 2.5,
    roughness: 0.2
  });
  const fragmentObj = mkBox(0.14, 0.14, 0.14, fragMat, 0, -0.15, 0, 0.4, 0.6, 0.2);
  cageGroup.add(fragmentObj);

  const cageLight = new THREE.PointLight(0xff8811, 2.0, 5.0, 2);
  cageLight.position.set(0, -0.15, 0);
  cageGroup.add(cageLight);

  cageGroup.position.set(4.4, H - 0.7, 1.4);
  interact(cageGroup, 'suspended_cage');
  add(cageGroup);
  anim?.((t) => {
    fragmentObj.rotation.y = t * 0.8;
    fragmentObj.rotation.x = Math.sin(t * 1.2) * 0.3;
  });

  // 14. Blood Sigil / Occult Floor Pentagram
  const pentagramTex = XC.tex(XC.glowingEmbers());
  const pentagramMat = new THREE.MeshStandardMaterial({
    color: 0x6e1414,
    roughness: 0.9,
    transparent: true,
    opacity: 0.85
  });
  const sigilRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.86, 32), pentagramMat);
  sigilRing.rotation.x = -Math.PI / 2;
  sigilRing.position.set(4.2, 0.02, 1.4);
  interact(sigilRing, 'ritual_pentagram');
  add(sigilRing);

  // 15. Heavy Iron-Bolted Exit Passage Door (Leading to Daniel's Study / Room 2)
  const exitDoorGroup = new THREE.Group();
  exitDoorGroup.add(mkBox(0.12, 2.4, 1.3, darkWoodMat, 0, 1.2, 0));
  // Heavy iron studs & deadbolt bars
  exitDoorGroup.add(mkBox(0.16, 0.1, 1.25, ironMat, 0, 0.6, 0));
  exitDoorGroup.add(mkBox(0.16, 0.1, 1.25, ironMat, 0, 1.8, 0));
  exitDoorGroup.add(mkBox(0.18, 0.14, 0.22, ironMat, 0.02, 1.2, -0.35));
  exitDoorGroup.position.set(W / 2 - 0.15, 0, 1.4);
  interact(exitDoorGroup, 'exit_door');
  add(exitDoorGroup);
  solid(W / 2 - 0.5, W / 2, 0.7, 2.1);

  // ── Atmospheric Floating Dust Particles ───────────────────────────────────────
  const dustCount = 180;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount * 3; i += 3) {
    dustPos[i]     = -W / 2 + Math.random() * W;
    dustPos[i + 1] = 0.2 + Math.random() * (H - 0.4);
    dustPos[i + 2] = -D / 2 + Math.random() * D;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xddc8a0,
    size: 0.025,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  S.add(dustPoints);

  anim?.((t, dt) => {
    const arr = dustGeo.attributes.position.array;
    for (let i = 1; i < dustCount * 3; i += 3) {
      arr[i] -= dt * 0.04;
      if (arr[i] < 0.2) arr[i] = H - 0.2;
    }
    dustGeo.attributes.position.needsUpdate = true;
  });
}

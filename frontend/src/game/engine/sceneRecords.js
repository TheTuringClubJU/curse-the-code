// Specialized 3D Architectural Scene Builder for Room 4: The Rotting Archive
// Substation Delta (1968-1983) flooded subterranean record storage.
// High-fidelity survival horror aesthetics matching user references 1-11:
// 17th-century European distressed brick masonry, flagstone puddles, dense archive aisles,
// cluttered radio/surveillance tech tables, scattered confidential files, chain-link gates,
// hanging bare Edison bulbs, and dramatic volumetric flashlight lighting physics.

import * as THREE from 'three';
import * as XR from './texRecords.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

function loadModel(filename) {
  return new Promise((resolve, reject) => {
    loader.load(
      `/assets/models/records/${filename}`,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err)
    );
  });
}

function normalizeScale(mesh, targetHeight) {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > 0.001) {
    const s = targetHeight / size.y;
    mesh.scale.set(s, s, s);
  }
}

function alignToFloor(mesh, floorY = 0) {
  const box = new THREE.Box3().setFromObject(mesh);
  mesh.position.y += floorY - box.min.y;
}

function gradeMaterials(root, { colorMul = 1.0, roughness = 0.8, metalness = 0.2 } = {}) {
  root.traverse((child) => {
    if (child.isMesh && child.material) {
      child.castShadow = true;
      child.receiveShadow = true;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        if (m.color && colorMul !== 1.0) {
          m.color.multiplyScalar(colorMul);
        }
        if (m.roughness !== undefined) m.roughness = roughness;
        if (m.metalness !== undefined) m.metalness = metalness;
      });
    }
  });
}

export function buildRecordsScene(E) {
  const { S, add, solid, anim, interact, flick, lightRig, glow } = E;
  const [W, H, D] = [12, 3.2, 10];

  // =========================================================================
  // 0. LIGHTING RIG & FLASHLIGHT PHYSICS (References 3, 4, 5, 6)
  // =========================================================================
  // 1. Tame the engine's ambient hemisphere light down to pitch horror levels
  S.traverse((child) => {
    if (child.isHemisphereLight) {
      child.intensity = 0.05;
      child.color.setHex(0x140e0a);
      child.groundColor.setHex(0x040302);
    }
  });

  // 2. Configure Player Tactical Flashlight with focused cone, sharp penumbra, and warm sunset beam (Reference 4)
  if (E.flashlight) {
    E.flashlight.color.setHex(0xfff0dc);
    E.flashlight.intensity = 8.5; // High brightness focused beam
    E.flashlight.distance = 32;
    E.flashlight.angle = Math.PI / 5.2; // Realistic focused beam cone
    E.flashlight.penumbra = 0.45; // Smooth realistic penumbra edge
    E.flashlight.decay = 2.0; // Physically accurate inverse-square decay
    E.flashlight.castShadow = true;
    E.flashlight.shadow.mapSize.set(1024, 1024);
    E.flashlight.shadow.bias = -0.001;
  }

  // 3. Ambient subterranean fill: warm dusk tint so rooms and textures are clearly visible
  const ambientFill = new THREE.AmbientLight(0x352b22, 0.42);
  const hemiLight = new THREE.HemisphereLight(0x5a4836, 0x181410, 0.35);
  S.add(ambientFill, hemiLight);

  // =========================================================================
  // 1. PBR WALL, FLOOR & CEILING MATERIALS (from Game Elements)
  //    Walls: random_bricks_thick_4k throughout (all perimeter and partitions)
  //    Floor: rock_wall_13_4k worn subterranean rock flagstone
  //    Ceiling: rusty_metal_05_4k corrugated industrial rusted steel
  // =========================================================================
  const texLoader = new THREE.TextureLoader();
  const loadPbrTex = (url, rx = 1, ry = 1, srgb = true) => {
    const t = texLoader.load(url);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  // Random Thick Bricks Masonry (random_bricks_thick_4k from Game Elements)
  const createRandomMat = (rx = 2.0, ry = 1.5) => new THREE.MeshStandardMaterial({
    map: loadPbrTex('/assets/textures/records/random_bricks_diff.jpg', rx, ry, true),
    normalMap: loadPbrTex('/assets/textures/records/random_bricks_nor.jpg', rx, ry, false),
    normalScale: new THREE.Vector2(1.3, 1.3),
    bumpMap: loadPbrTex('/assets/textures/records/random_bricks_bump.jpg', rx, ry, false),
    bumpScale: 0.18,
    roughnessMap: loadPbrTex('/assets/textures/records/random_bricks_rough.jpg', rx, ry, false),
    roughness: 0.82,
    metalness: 0.06,
    color: 0x8a7262
  });

  const brickWallLong = createRandomMat(4.5, 1.5);
  const brickWallWide = createRandomMat(2.2, 1.5);
  const brickWallMed = createRandomMat(1.6, 1.5);
  const brickWallShort = createRandomMat(1.0, 1.5);

  // Worn subterranean rock flagstone floor (rock_wall_13_4k from Game Elements)
  // Fully opaque, completely matte, coarse aged rock (zero gloss, zero reflection)
  const floorMat = new THREE.MeshStandardMaterial({
    map: loadPbrTex('/assets/textures/records/rock_floor_diff.jpg', 6, 5, true),
    bumpMap: loadPbrTex('/assets/textures/records/rock_floor_bump.jpg', 6, 5, false),
    bumpScale: 0.32,
    roughness: 0.98,
    metalness: 0.0
  });

  // Industrial corrugated rusty metal ceiling (rusty_metal_05_4k from Game Elements)
  const ceilMat = new THREE.MeshStandardMaterial({
    map: loadPbrTex('/assets/textures/records/rusty_metal_diff.jpg', 6, 5, true),
    bumpMap: loadPbrTex('/assets/textures/records/rusty_metal_bump.jpg', 6, 5, false),
    bumpScale: 0.14,
    roughness: 0.72,
    metalness: 0.48
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
    color: 0x181c1e,
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

  // Geometric Helpers
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

  const mkHitBox = (w, h, d, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    m.position.set(x, y, z);
    return m;
  };

  // =========================================================================
  // 2. OUTER ROOM SHELL (Solid Opaque Coarse Rock Floor & Rusted Metal Ceiling)
  // =========================================================================
  const floor = mkBox(W, 0.1, D, floorMat, 0, -0.05, 0);
  floor.receiveShadow = true;
  S.add(floor);

  const ceil = mkBox(W, 0.1, D, ceilMat, 0, H + 0.05, 0);
  S.add(ceil);

  // Outer Boundary Walls (Random Thick Bricks Masonry throughout)
  const wallNW = mkBox((W - 2.8) / 2, H, 0.15, brickWallWide, -(W / 2 + 1.4) / 2, H / 2, -D / 2);
  const wallNE = mkBox((W - 2.8) / 2, H, 0.15, brickWallWide, (W / 2 + 1.4) / 2, H / 2, -D / 2);
  const wallNTop = mkBox(2.8, H - 2.6, 0.15, brickWallWide, 0, 2.6 + (H - 2.6) / 2, -D / 2);

  const wallSW = mkBox((W - 2.8) / 2, H, 0.15, brickWallWide, -(W / 2 + 1.4) / 2, H / 2, D / 2);
  const wallSE = mkBox((W - 2.8) / 2, H, 0.15, brickWallWide, (W / 2 + 1.4) / 2, H / 2, D / 2);
  const wallSTop = mkBox(2.8, H - 2.6, 0.15, brickWallWide, 0, 2.6 + (H - 2.6) / 2, D / 2);

  const wallW = mkBox(0.15, H, D, brickWallLong, -W / 2, H / 2, 0);
  const wallE = mkBox(0.15, H, D, brickWallLong, W / 2, H / 2, 0);

  S.add(wallNW, wallNE, wallNTop, wallSW, wallSE, wallSTop, wallW, wallE);

  // Outer Collisions
  solid(-W / 2, -1.4, -D / 2 - 0.2, -D / 2 + 0.1);
  solid(1.4, W / 2, -D / 2 - 0.2, -D / 2 + 0.1);
  solid(-W / 2, -1.4, D / 2 - 0.1, D / 2 + 0.2);
  solid(1.4, W / 2, D / 2 - 0.1, D / 2 + 0.2);
  solid(-W / 2 - 0.2, -W / 2 + 0.1, -D / 2, D / 2);
  solid(W / 2 - 0.1, W / 2 + 0.2, -D / 2, D / 2);

  // =========================================================================
  // 3. MULTI-CHAMBER PARTITION WALLS, ARCHED ENCLOSURES & CASTLE DOORS
  //    Walls: random_bricks_thick_4k
  //    Doors: large_castle_door_4k (animated swinging hinges + full arch wall coverage)
  // =========================================================================
  // Partition wall segments along X = -1.6 (West) and X = +1.6 (East)
  // Doorway openings: width 1.90m centered at z = -2.0 and z = +2.0
  const partW1 = mkBox(0.14, H, 2.05, brickWallShort, -1.6, H / 2, -3.975);
  const partW2 = mkBox(0.14, H, 2.10, brickWallMed, -1.6, H / 2, 0);
  const partW3 = mkBox(0.14, H, 2.05, brickWallShort, -1.6, H / 2, 3.975);

  const partE1 = mkBox(0.14, H, 2.05, brickWallShort, 1.6, H / 2, -3.975);
  const partE2 = mkBox(0.14, H, 2.10, brickWallMed, 1.6, H / 2, 0);
  const partE3 = mkBox(0.14, H, 2.05, brickWallShort, 1.6, H / 2, 3.975);

  const divWest = mkBox(4.2, H, 0.14, brickWallWide, -3.8, H / 2, -0.7);
  const divEast = mkBox(4.2, H, 0.14, brickWallWide, 3.8, H / 2, -0.7);

  S.add(partW1, partW2, partW3, partE1, partE2, partE3, divWest, divEast);

  // Arched Wall Enclosures & Lintels around the 4 castle door openings
  // Covers the upper rectangular wall gap and hugs the curved arch with zero openings
  const miniDoorways = [
    { id: 'microfilm', x: -1.6, z: -2.0, ry: Math.PI / 2, name: 'Microfilm Lab' },
    { id: 'sump', x: -1.6, z: 2.0, ry: Math.PI / 2, name: 'Sump Vault' },
    { id: 'clerk', x: 1.6, z: -2.0, ry: -Math.PI / 2, name: "Clerk's Office" },
    { id: 'annex', x: 1.6, z: 2.0, ry: -Math.PI / 2, name: 'Records Annex' }
  ];

  miniDoorways.forEach((dw) => {
    // 1. Top lintel wall above the arched frame up to the ceiling (H = 3.2)
    const lintelH = H - 2.68;
    const lintel = mkBox(0.14, lintelH, 1.90, brickWallShort, dw.x, 2.68 + lintelH / 2, dw.z);
    S.add(lintel);

    // 2. Arch shoulder corner spandrels (smoothly covers where the arched door narrows below the lintel)
    // Upper tier (y in [2.45, 2.68], height 0.23, shoulder span 0.32m each side)
    const spandrelN1 = mkBox(0.14, 0.23, 0.32, brickWallShort, dw.x, 2.565, dw.z - 0.79);
    const spandrelS1 = mkBox(0.14, 0.23, 0.32, brickWallShort, dw.x, 2.565, dw.z + 0.79);
    // Lower tier (y in [2.22, 2.45], height 0.23, shoulder span 0.16m each side)
    const spandrelN2 = mkBox(0.14, 0.23, 0.16, brickWallShort, dw.x, 2.335, dw.z - 0.87);
    const spandrelS2 = mkBox(0.14, 0.23, 0.16, brickWallShort, dw.x, 2.335, dw.z + 0.87);
    S.add(spandrelN1, spandrelS1, spandrelN2, spandrelS2);
  });

  // Interior Solid Collisions (Preserving unobstructed 1.8m openings into all 4 mini-rooms)
  solid(-1.75, -1.45, -5.0, -2.92);
  solid(-1.75, -1.45, -1.08, 1.08);
  solid(-1.75, -1.45, 2.92, 5.0);

  solid(1.45, 1.75, -5.0, -2.92);
  solid(1.45, 1.75, -1.08, 1.08);
  solid(1.45, 1.75, 2.92, 5.0);

  solid(-5.9, -1.6, -0.85, -0.55);
  solid(1.6, 5.9, -0.85, -0.55);

  // Instantiate Large Castle Doors with animated swinging hinges (large_castle_door_4k)
  const castleDoorRefs = [];
  loader.load(
    '/assets/models/records/large_castle_door/large_castle_door_1k.gltf',
    (gltf) => {
      const template = gltf.scene;
      template.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material) {
            c.material.roughness = Math.max(0.65, c.material.roughness || 0.7);
          }
        }
      });

      miniDoorways.forEach((dw) => {
        const doorInstance = template.clone(true);
        const s = 0.94;
        doorInstance.scale.set(s, s, s);
        doorInstance.updateMatrixWorld(true);

        // Center frame precisely in opening and sit flush on floor
        const b = new THREE.Box3().setFromObject(doorInstance);
        const c = new THREE.Vector3();
        b.getCenter(c);
        doorInstance.position.x -= c.x;
        doorInstance.position.y -= b.min.y;
        doorInstance.position.z -= c.z;

        const doorGroup = new THREE.Group();
        doorGroup.position.set(dw.x, 0, dw.z);
        doorGroup.rotation.y = dw.ry;
        doorGroup.add(doorInstance);
        S.add(doorGroup);

        const leftLeaf = doorInstance.getObjectByName('large_castle_door_left');
        const rightLeaf = doorInstance.getObjectByName('large_castle_door_right');

        castleDoorRefs.push({
          ...dw,
          doorGroup,
          leftLeaf,
          rightLeaf,
          openProgress: 0,
          targetProgress: 0,
          isOpen: false
        });
      });
    },
    undefined,
    (err) => console.warn('[RECORDS] large_castle_door load error', err)
  );

  // Castle Doors Hinge Motion in Engine Loop
  anim((t, dt) => {
    if (castleDoorRefs.length === 0) return;
    const px = E.cam ? E.cam.position.x : (E.pos ? E.pos.x : 0);
    const pz = E.cam ? E.cam.position.z : (E.pos ? E.pos.z : 0);

    castleDoorRefs.forEach((door) => {
      const dx = px - door.x;
      const dz = pz - door.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Proximity open: door creaks open smoothly on approach
      if (dist < 2.8) {
        door.isOpen = true;
      }
      door.targetProgress = door.isOpen ? 1.0 : 0.0;

      const rate = dt ? Math.min(dt * 2.4, 0.25) : 0.05;
      door.openProgress += (door.targetProgress - door.openProgress) * rate;

      // Realistic swinging leaves on outer iron hinges
      if (door.leftLeaf) {
        door.leftLeaf.rotation.y = -Math.PI * 0.48 * door.openProgress;
      }
      if (door.rightLeaf) {
        door.rightLeaf.rotation.y = Math.PI * 0.48 * door.openProgress;
      }
    });
  });

  // =========================================================================
  // 4. INDUSTRIAL LIGHTING GRID: HANGING PENDANTS & WALL SCONCES (1800K - 2200K)
  //    Textures & Models: hanging_industrial_lamp & industrial_wall_lamp
  // =========================================================================
  // Color Temperature to RGB in the 1800K - 2200K vintage amber gradient
  const kelvinToColor = (kelvin) => {
    const k = Math.max(1800, Math.min(2200, kelvin));
    const t = (k - 1800) / 400; // 0..1
    const c1800 = new THREE.Color(0xff8f24); // Deep amber
    const c2200 = new THREE.Color(0xffb566); // Warm tungsten amber
    return c1800.lerp(c2200, t);
  };

  const hangingLampMat = new THREE.MeshStandardMaterial({
    map: loadPbrTex('/assets/textures/records/lamps/hanging_lamp_diff.jpg', 1, 1),
    roughness: 0.65,
    metalness: 0.45,
    side: THREE.DoubleSide
  });

  const wallLampMetalMat = new THREE.MeshStandardMaterial({
    map: loadPbrTex('/assets/textures/records/lamps/wall_lamp_diff.jpg', 1, 1),
    roughness: 0.7,
    metalness: 0.4
  });

  const wallLampGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    normalMap: loadPbrTex('/assets/textures/records/lamps/wall_lamp_glass_nor.jpg', 1, 1),
    transparent: true,
    opacity: 0.68,
    roughness: 0.25,
    metalness: 0.1
  });

  // A. Ceiling Hanging Industrial Pendant Lamp
  const createHangingIndustrialLamp = (x, z, kelvin = 2000, isHero = false) => {
    const lamp = new THREE.Group();
    lamp.position.set(x, H, z);

    const lightColor = kelvinToColor(kelvin);

    // Ceiling mount plate
    const canopy = mkCyl(0.09, 0.09, 0.04, 16, darkMetalMat, 0, -0.02, 0);
    lamp.add(canopy);

    // Drop cord / conduit
    const dropLen = 0.82;
    const cord = mkCyl(0.007, 0.007, dropLen, 8, darkMetalMat, 0, -dropLen / 2 - 0.04, 0);
    lamp.add(cord);

    const shadeY = -dropLen - 0.04;

    // Heavy socket cap with cooling fins
    const socket = mkCyl(0.055, 0.065, 0.12, 16, darkMetalMat, 0, shadeY - 0.06, 0);
    lamp.add(socket);

    // Flared enamel reflector dome shade
    const shadeGeo = new THREE.CylinderGeometry(0.065, 0.36, 0.22, 24, 1, true);
    const shadeMesh = new THREE.Mesh(shadeGeo, hangingLampMat);
    shadeMesh.position.set(0, shadeY - 0.17, 0);
    lamp.add(shadeMesh);

    // Inner reflective underside
    const innerShadeMat = new THREE.MeshStandardMaterial({ color: 0xeeebe2, roughness: 0.35, side: THREE.BackSide });
    const innerShade = new THREE.Mesh(shadeGeo, innerShadeMat);
    innerShade.position.set(0, shadeY - 0.17, 0);
    innerShade.scale.set(0.99, 0.99, 0.99);
    lamp.add(innerShade);

    // Filament bulb
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: lightColor,
      emissiveIntensity: 2.8,
      roughness: 0.15
    });
    const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), bulbMat);
    bulbMesh.position.set(0, shadeY - 0.22, 0);
    lamp.add(bulbMesh);

    // Protective wire cage guard ribs
    for (let a = 0; a < 4; a++) {
      const rib = mkCyl(0.003, 0.003, 0.26, 6, darkMetalMat, 0, shadeY - 0.24, 0);
      rib.rotation.y = (a * Math.PI) / 4;
      lamp.add(rib);
    }
    const guardRing = mkCyl(0.18, 0.18, 0.006, 20, darkMetalMat, 0, shadeY - 0.32, 0);
    lamp.add(guardRing);

    // Downward physical light source
    const light = new THREE.PointLight(lightColor, 2.8, 10.5, 1.8);
    light.position.set(0, shadeY - 0.24, 0);
    if (isHero) {
      light.castShadow = true;
      light.shadow.bias = -0.001;
      light.shadow.mapSize.set(512, 512);
    }
    lamp.add(light);

    lightRig(light, 2.8, flick(Math.floor(x * 10 + z * 7), 0.2));
    glow(bulbMat, 2.8, flick(Math.floor(x * 10 + z * 7), 0.2));

    anim((t) => {
      lamp.rotation.z = Math.sin(t * 1.2 + x) * 0.02;
      lamp.rotation.x = Math.cos(t * 0.9 + z) * 0.015;
    });

    lamp.userData.np = 1;
    interact(lamp, 'ceiling_light');
    add(lamp);
    return lamp;
  };

  // B. Wall-Mounted Industrial Bulkhead Sconce Lamp
  const createIndustrialWallLamp = (x, y, z, ry = 0, kelvin = 1900) => {
    const sconce = new THREE.Group();
    sconce.position.set(x, y, z);
    sconce.rotation.y = ry;

    const lightColor = kelvinToColor(kelvin);

    // Wall mounting flange plate
    const backplate = mkBox(0.18, 0.22, 0.03, wallLampMetalMat, 0, 0, 0.015);
    sconce.add(backplate);

    // 90-degree gooseneck conduit arm
    const armOut = mkCyl(0.014, 0.014, 0.28, 8, darkMetalMat, 0, 0.06, 0.14, Math.PI / 2, 0, 0);
    const armDown = mkCyl(0.014, 0.014, 0.14, 8, darkMetalMat, 0, -0.01, 0.28);
    sconce.add(armOut, armDown);

    // Hexagonal socket hood
    const hood = mkCyl(0.07, 0.08, 0.06, 16, wallLampMetalMat, 0, -0.09, 0.28);
    sconce.add(hood);

    // Cylindrical well-glass jar with normal ribs
    const glass = mkCyl(0.06, 0.06, 0.18, 16, wallLampGlassMat, 0, -0.19, 0.28);
    sconce.add(glass);

    // Filament bulb
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: lightColor,
      emissiveIntensity: 2.6,
      roughness: 0.2
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), bulbMat);
    bulb.position.set(0, -0.18, 0.28);
    sconce.add(bulb);

    // Wire cage basket
    for (let c = 0; c < 4; c++) {
      const wire = mkCyl(0.0025, 0.0025, 0.20, 6, darkMetalMat, 0, -0.19, 0.28);
      wire.rotation.y = (c * Math.PI) / 4;
      sconce.add(wire);
    }
    const guardRing = mkCyl(0.072, 0.072, 0.005, 16, darkMetalMat, 0, -0.27, 0.28);
    sconce.add(guardRing);

    // Physical light casting onto wall and floor
    const light = new THREE.PointLight(lightColor, 2.0, 7.8, 1.9);
    light.position.set(0, -0.19, 0.32);
    sconce.add(light);

    lightRig(light, 2.0, flick(Math.floor(x * 12 + z * 15), 0.18));
    glow(bulbMat, 2.6, flick(Math.floor(x * 12 + z * 15), 0.18));

    sconce.userData.np = 1;
    S.add(sconce);
    return sconce;
  };

  // Ceiling Industrial Hanging Lamps: Placed in corridor and each chamber
  createHangingIndustrialLamp(0, -1.8, 2050, true);   // North corridor
  createHangingIndustrialLamp(0, 2.2, 1950, true);    // South corridor
  createHangingIndustrialLamp(-3.6, -2.6, 2150);      // Room 2 (Microfilm Lab)
  createHangingIndustrialLamp(3.6, -2.6, 2200);       // Clerk's Office
  createHangingIndustrialLamp(3.6, 2.2, 1950);        // Cold File Records Annex
  createHangingIndustrialLamp(-3.6, 2.2, 1820);       // Sump & Drainage Vault

  // Wall Industrial Sconce Lamps: Mounted strictly on the brick walls
  createIndustrialWallLamp(-1.52, 2.3, -3.2, -Math.PI / 2, 1900); // Corridor West wall north
  createIndustrialWallLamp(1.52, 2.3, -3.2, Math.PI / 2, 2100);  // Corridor East wall north
  createIndustrialWallLamp(-1.52, 2.3, 3.2, -Math.PI / 2, 1850);  // Corridor West wall south (Sump entrance)
  createIndustrialWallLamp(1.52, 2.3, 3.2, Math.PI / 2, 1920);   // Corridor East wall south (Annex entrance)
  createIndustrialWallLamp(-3.6, 2.4, -4.85, 0, 2000);            // Room 2 Microfilm North wall
  createIndustrialWallLamp(3.6, 2.4, -4.85, 0, 2150);             // Clerk North wall
  createIndustrialWallLamp(5.85, 2.4, 2.2, Math.PI / 2, 1900);   // Records Annex East wall
  createIndustrialWallLamp(-5.85, 2.4, 3.8, -Math.PI / 2, 1820);  // Sump Vault West wall

  // Bulkhead Door Emergency Amber Beacon (Reference 4)
  const amberBeacon = new THREE.PointLight(0xff5500, 1.8, 7.5, 1.8);
  amberBeacon.position.set(0, 2.8, -4.5);
  S.add(amberBeacon);
  lightRig(amberBeacon, 1.8, flick(7, 0.25));

  // =========================================================================
  // 5. CLERK'S OFFICE (North-East Chamber)
  //    Hero Props: clerk_desk, report_folder (R2-02), waste_basket (XR01 Decoy)
  // =========================================================================
  {
    // Clerk Desk Group (`clerk_desk`)
    const deskGroup = new THREE.Group();
    deskGroup.position.set(3.6, 0, -2.6);

    const fallbackDesk = new THREE.Group();
    fallbackDesk.add(mkBox(1.8, 0.06, 0.9, rustedSteelMat, 0, 0.74, 0));
    fallbackDesk.add(mkBox(0.5, 0.7, 0.8, darkMetalMat, -0.6, 0.36, 0));
    fallbackDesk.add(mkBox(0.5, 0.7, 0.8, darkMetalMat, 0.6, 0.36, 0));
    deskGroup.add(fallbackDesk);

    const deskHit = mkHitBox(1.8, 0.75, 0.9, 0, 0.375, 0);
    deskGroup.add(deskHit);

    interact(deskGroup, 'clerk_desk');
    add(deskGroup);
    solid(2.4, 4.8, -3.3, -1.9);

    loadModel('clerk_desk.glb')
      .then((gltf) => {
        const m = gltf.scene;
        normalizeScale(m, 0.82);
        alignToFloor(m, 0);
        m.rotation.y = 0;
        gradeMaterials(m, { colorMul: 0.9, roughness: 0.8 });
        deskGroup.remove(fallbackDesk);
        deskGroup.add(m);
        interact(deskGroup, 'clerk_desk');
        add(deskGroup);
      })
      .catch((err) => console.warn('[RECORDS] clerk_desk.glb fallback active', err));

    // Hero Prop: Incident Report Folder CF-79A2 (Clue R2-02)
    const folder = new THREE.Group();
    folder.position.set(3.85, 0.81, -2.42);
    folder.rotation.y = 0.12;

    const folderCoverTex = XR.tex(XR.manilaFolderCover());
    const folderMesh = mkBox(
      0.36,
      0.02,
      0.46,
      new THREE.MeshStandardMaterial({
        map: folderCoverTex,
        roughness: 0.85
      }),
      0,
      0.01,
      0
    );
    folder.add(folderMesh);

    const fHit = mkHitBox(0.65, 0.35, 0.65, 0, 0.1, 0);
    folder.add(fHit);

    interact(folder, 'report_folder');
    add(folder);
  }

  // Waste Basket (XR01 Decoy) beside Clerk Desk
  {
    const basketGroup = new THREE.Group();
    basketGroup.position.set(2.4, 0, -2.8);

    const fallbackBasket = new THREE.Group();
    fallbackBasket.add(mkCyl(0.2, 0.16, 0.42, 14, darkMetalMat, 0, 0.21, 0));
    basketGroup.add(fallbackBasket);

    const hit = mkHitBox(0.55, 0.55, 0.55, 0, 0.25, 0);
    basketGroup.add(hit);

    interact(basketGroup, 'waste_basket');
    add(basketGroup);

    loadModel('trash_can.glb')
      .then((gltf) => {
        const m = gltf.scene;
        normalizeScale(m, 0.45);
        alignToFloor(m, 0);
        gradeMaterials(m, { colorMul: 0.75, roughness: 0.8 });
        basketGroup.remove(fallbackBasket);
        basketGroup.add(m);
        interact(basketGroup, 'waste_basket');
        add(basketGroup);
      })
      .catch((err) => console.warn('[RECORDS] trash_can.glb fallback active', err));
  }

  // =========================================================================
  // 8. MICROFILM & SURVEILLANCE LAB (North-West Chamber)
  //    Hero Props: microfilm_reader (R2-03), timeline_board (R2-04), metal_table
  //    Clutter: Stacked CRT Monitors, Illuminated Grid Map, Relays (Reference 8)
  // =========================================================================
  {
    const viewerGroup = new THREE.Group();
    viewerGroup.position.set(-3.6, 0, -2.6);

    const fallbackViewer = new THREE.Group();
    fallbackViewer.add(mkBox(1.2, 0.72, 0.8, darkMetalMat, 0, 0.36, 0));
    viewerGroup.add(fallbackViewer);

    const hit = mkHitBox(1.4, 1.5, 1.0, 0, 0.75, 0);
    viewerGroup.add(hit);

    interact(viewerGroup, 'microfilm_reader');
    add(viewerGroup);
    solid(-4.8, -2.4, -3.3, -1.9);

    // Industrial Metal Work Table GLB
    loadModel('metal_table.glb')
      .then((gltf) => {
        const tbl = gltf.scene;
        normalizeScale(tbl, 0.76);
        alignToFloor(tbl, 0);
        gradeMaterials(tbl, { colorMul: 0.8, roughness: 0.85 });
        fallbackViewer.visible = false;
        viewerGroup.add(tbl);
      })
      .catch((err) => console.warn('[RECORDS] metal_table.glb fallback active', err));

    // Soviet Vintage Filmstrip Projector GLB as Microfilm Viewer (Clue R2-03)
    loadModel('filmstrip_projector.glb')
      .then((gltf) => {
        const proj = gltf.scene;
        normalizeScale(proj, 0.46);
        proj.position.set(0.18, 0.76, 0);
        proj.rotation.y = Math.PI;
        gradeMaterials(proj, { colorMul: 0.9, roughness: 0.75 });
        fallbackViewer.visible = false;
        viewerGroup.add(proj);
        interact(viewerGroup, 'microfilm_reader');
        add(viewerGroup);
      })
      .catch((err) => console.warn('[RECORDS] filmstrip_projector.glb fallback active', err));

  }

  // Whiteboard / Corkboard of Event Cards (`timeline_board`, Clue R2-04)
  {
    const board = new THREE.Group();
    board.position.set(-5.88, 1.8, -2.4);
    board.rotation.y = Math.PI / 2;

    board.add(mkBox(2.2, 1.2, 0.04, darkMetalMat, 0, 0, 0));
    const corkMat = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.9 });
    board.add(mkBox(2.1, 1.1, 0.02, corkMat, 0, 0, 0.025));

    const cardMat = new THREE.MeshStandardMaterial({ color: 0xede4d0, roughness: 0.95 });
    for (let c = 0; c < 8; c++) {
      const cx = -0.85 + (c % 4) * 0.55;
      const cy = c < 4 ? 0.24 : -0.24;
      const card = mkBox(0.45, 0.32, 0.015, cardMat, cx, cy, 0.04);
      card.rotation.z = (Math.random() - 0.5) * 0.06;
      board.add(card);

      const pin = mkCyl(0.015, 0.015, 0.02, 8, new THREE.MeshBasicMaterial({ color: 0xd92618 }), cx, cy + 0.13, 0.055, Math.PI / 2, 0, 0);
      board.add(pin);
    }

    const hit = mkHitBox(2.3, 1.3, 0.4, 0, 0, 0.2);
    board.add(hit);

    interact(board, 'timeline_board');
    add(board);
  }

  // =========================================================================
  // 9. COLD FILE RECORDS ANNEX (South-East Chamber)
  //    Hero Props: filing_cabinet_a, filing_cabinet_b, card_catalog, filing_cabinets
  // =========================================================================
  // Filing Cabinet A (`filing_cabinet_a`: ER01, ER02)
  {
    const cabA = new THREE.Group();
    cabA.position.set(5.2, 0, 1.4);
    cabA.rotation.y = Math.PI / 2; // Face westward toward room center

    const fallbackA = new THREE.Group();
    fallbackA.add(mkBox(0.65, 1.45, 0.6, rustedSteelMat, 0, 0.725, 0));
    cabA.add(fallbackA);

    const hit = mkHitBox(0.85, 1.6, 0.85, 0, 0.75, 0);
    cabA.add(hit);

    interact(cabA, 'filing_cabinet_a');
    add(cabA);
    solid(4.5, 5.8, 0.8, 2.0);

    loadModel('filing_cabinet.glb')
      .then((gltf) => {
        const m = gltf.scene;
        normalizeScale(m, 1.45);
        alignToFloor(m, 0);
        m.rotation.y = -Math.PI / 2; // Drawers and handles face west toward player
        gradeMaterials(m, { colorMul: 0.85, roughness: 0.8 });
        cabA.remove(fallbackA);
        cabA.add(m);
        interact(cabA, 'filing_cabinet_a');
        add(cabA);
      })
      .catch((err) => console.warn('[RECORDS] filing_cabinet_a GLB fallback active', err));
  }

  // Filing Cabinet B (`filing_cabinet_b`: ER03, ER04)
  {
    const cabB = new THREE.Group();
    cabB.position.set(5.2, 0, 2.8);
    cabB.rotation.y = Math.PI / 2; // Face westward toward room center

    const fallbackB = new THREE.Group();
    fallbackB.add(mkBox(0.65, 1.45, 0.6, rustedSteelMat, 0, 0.725, 0));
    cabB.add(fallbackB);

    const hit = mkHitBox(0.85, 1.6, 0.85, 0, 0.75, 0);
    cabB.add(hit);

    interact(cabB, 'filing_cabinet_b');
    add(cabB);
    solid(4.5, 5.8, 2.2, 3.4);

    loadModel('filing_cabinet.glb')
      .then((gltf) => {
        const m = gltf.scene;
        normalizeScale(m, 1.45);
        alignToFloor(m, 0);
        m.rotation.y = -Math.PI / 2; // Drawers and handles face west toward player
        gradeMaterials(m, { colorMul: 0.85, roughness: 0.8 });
        cabB.remove(fallbackB);
        cabB.add(m);
        interact(cabB, 'filing_cabinet_b');
        add(cabB);
      })
      .catch((err) => console.warn('[RECORDS] filing_cabinet_b GLB fallback active', err));
  }

  // Vintage Card Catalog (`card_catalog`: ER08)
  {
    const catalog = new THREE.Group();
    catalog.position.set(3.4, 0, 4.35);
    catalog.rotation.y = 0; // Face northward toward room entrance

    catalog.add(mkBox(1.2, 1.3, 0.55, oakMat, 0, 0.9, 0));
    catalog.add(mkBox(1.15, 0.25, 0.5, darkMetalMat, 0, 0.125, 0));

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const dx = -0.48 + col * 0.19;
        const dy = 0.42 + row * 0.22;
        catalog.add(mkBox(0.16, 0.18, 0.015, oakMat, dx, dy, 0.285));
        catalog.add(mkBox(0.08, 0.04, 0.02, brassMat, dx, dy, 0.3));
      }
    }

    const hit = mkHitBox(1.4, 1.6, 0.8, 0, 0.8, 0);
    catalog.add(hit);

    interact(catalog, 'card_catalog');
    add(catalog);
    solid(2.6, 4.2, 3.7, 4.8);
  }

  // Background Decorative Filing Stacks (`filing_cabinets`)
  {
    const decorCabs = new THREE.Group();
    decorCabs.position.set(5.2, 0, 4.0);
    decorCabs.rotation.y = Math.PI / 2;
    decorCabs.add(mkBox(0.65, 1.45, 0.6, rustedSteelMat, 0, 0.725, 0));
    interact(decorCabs, 'filing_cabinets');
    add(decorCabs);
  }

  // =========================================================================
  // 10. FLOODED VENT & ARCHIVE SHELVES VAULT (South-West Chamber)
  //     Hero Props: archive_shelves (ER05, ER06, XR02 Decoy), vent_grate (ER09)
  // =========================================================================

  {
    const shelves = new THREE.Group();
    shelves.position.set(-5.3, 0, 1.8);
    shelves.rotation.y = 0;

    // Procedural fallback (agar GLB fail ho jaye)
    const fallbackShelves = new THREE.Group();
    // Simple metal rack structure
    fallbackShelves.add(mkBox(0.08, 2.1, 0.08, darkMetalMat, -0.35, 1.05, -0.9));
    fallbackShelves.add(mkBox(0.08, 2.1, 0.08, darkMetalMat, 0.35, 1.05, -0.9));
    fallbackShelves.add(mkBox(0.08, 2.1, 0.08, darkMetalMat, -0.35, 1.05, 0.9));
    fallbackShelves.add(mkBox(0.08, 2.1, 0.08, darkMetalMat, 0.35, 1.05, 0.9));
    // Shelves
    for (let i = 0; i < 4; i++) {
      const sy = 0.35 + i * 0.5;
      fallbackShelves.add(mkBox(0.85, 0.04, 1.9, rustedSteelMat, 0, sy, 0));
    }
    shelves.add(fallbackShelves);

    const hit = mkHitBox(0.95, 2.2, 2.4, 0, 1.1, 0);
    shelves.add(hit);

    interact(shelves, 'archive_shelves');
    add(shelves);
    solid(-5.8, -4.5, 0.6, 3.0);

    // Load real GLB model
    loadModel('archive_shelves.glb')
      .then((gltf) => {
        const m = gltf.scene;
        normalizeScale(m, 2.15);        // height adjust
        alignToFloor(m, 0);
        m.rotation.y = 0;               // agar direction galat lage to Math.PI / 2 try karna
        gradeMaterials(m, { colorMul: 0.85, roughness: 0.82 });

        shelves.remove(fallbackShelves);
        shelves.add(m);
        interact(shelves, 'archive_shelves');
        add(shelves);
      })
      .catch((err) => console.warn('[RECORDS] archive_shelves.glb fallback active', err));
  }


  // Corroded Vent Grate (`vent_grate`: ER09)
  {
    const vent = new THREE.Group();
    vent.position.set(-5.88, 0.45, 3.8);
    vent.rotation.y = Math.PI / 2;

    const fallbackVent = new THREE.Group();
    fallbackVent.add(mkBox(0.7, 0.55, 0.1, new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 0, -0.05));
    fallbackVent.add(mkBox(0.72, 0.58, 0.04, darkMetalMat, 0, 0, 0.02));
    vent.add(fallbackVent);

    const hit = mkHitBox(0.9, 0.7, 0.4, 0, 0.15, 0);
    vent.add(hit);

    interact(vent, 'vent_grate');
    add(vent);

    loadModel('vent_grille.glb')
      .then((gltf) => {
        const m = gltf.scene;
        normalizeScale(m, 0.55);
        m.position.set(0, 0, 0.02);
        gradeMaterials(m, { colorMul: 0.75, roughness: 0.8 });
        vent.add(m);
        interact(vent, 'vent_grate');
        add(vent);
      })
      .catch((err) => console.warn('[RECORDS] vent_grille.glb fallback active', err));
  }

  // =========================================================================
  // 11. EXIT BULKHEAD DOOR (`bulkhead_door`, Clue R2-07)
  // =========================================================================
  {
    const bulkhead = new THREE.Group();
    bulkhead.position.set(0, 0, -4.92);

    // Reinforced Industrial Steel Portal Frame around Vault Opening
    const portalArchMat = new THREE.MeshStandardMaterial({
      color: 0x16191b,
      roughness: 0.88,
      metalness: 0.65
    });
    // Top reinforced steel lintel spanning corridor width
    const lintel = mkBox(3.0, 0.35, 0.22, portalArchMat, 0, 2.92, 0);
    lintel.userData.np = 1;
    bulkhead.add(lintel);

    // Heavy vertical steel jambs framing the vault socket
    const jambL = mkBox(0.18, 2.8, 0.22, portalArchMat, -1.45, 1.4, 0);
    jambL.userData.np = 1;
    const jambR = mkBox(0.18, 2.8, 0.22, portalArchMat, 1.45, 1.4, 0);
    jambR.userData.np = 1;
    bulkhead.add(jambL, jambR);

    // Industrial corner gussets / reinforcement plates
    const gussetL = mkBox(0.32, 0.32, 0.24, darkMetalMat, -1.35, 2.75, 0.01);
    gussetL.userData.np = 1;
    const gussetR = mkBox(0.32, 0.32, 0.24, darkMetalMat, 1.35, 2.75, 0.01);
    gussetR.userData.np = 1;
    bulkhead.add(gussetL, gussetR);

    // Procedural Fallback Door Slab
    const doorTex = XR.tex(XR.bulkheadTexture());
    const doorMat = new THREE.MeshStandardMaterial({
      map: doorTex,
      bumpMap: doorTex,
      bumpScale: 0.8,
      roughness: 0.65,
      metalness: 0.45
    });
    const doorMesh = mkBox(2.2, 2.5, 0.14, doorMat, 0, 1.28, 0.08);
    doorMesh.userData.np = 1;
    bulkhead.add(doorMesh);

    const wheelRim = mkCyl(0.38, 0.38, 0.04, 24, brassMat, 0, 1.28, 0.22, Math.PI / 2, 0, 0);
    wheelRim.userData.np = 1;
    bulkhead.add(wheelRim);

    // Electronic Access Terminal Keypad mounted on right door frame
    const panel = new THREE.Group();
    panel.position.set(1.36, 1.35, 0.16);
    panel.add(mkBox(0.24, 0.42, 0.08, darkMetalMat, 0, 0, 0));
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffa018 });
    panel.add(mkBox(0.18, 0.06, 0.02, ledMat, 0, 0.12, 0.045));
    panel.add(mkBox(0.18, 0.22, 0.02, rustedSteelMat, 0, -0.06, 0.045));
    panel.traverse((c) => { if (c.isMesh) c.userData.id = 'bulkhead_door'; });
    bulkhead.add(panel);

    const hit = mkHitBox(2.9, 2.9, 0.8, 0, 1.4, 0.2);
    hit.userData.id = 'bulkhead_door';
    bulkhead.add(hit);

    interact(hit, 'bulkhead_door');
    add(bulkhead);

    E.ref.bulkheadDoor = {
      mesh: doorMesh,
      wheel: wheelRim,
      isOpen: false,
      openAnim: 0,
      mixer: null,
      actions: null,
      maxDuration: 6.25,
      isGltf: false
    };

    anim((t, dt) => {
      const bh = E.ref.bulkheadDoor;
      if (bh) {
        if (bh.isOpen && bh.openAnim < 1.0) {
          // Smoothly advance animation across ~4.2 seconds
          bh.openAnim = Math.min(1.0, bh.openAnim + dt * 0.24);
          if (bh.isGltf && bh.actions && bh.mixer) {
            const animTime = bh.openAnim * bh.maxDuration;
            bh.actions.forEach((act) => {
              act.time = animTime;
            });
            bh.mixer.update(0);
          } else {
            if (bh.wheel) bh.wheel.rotation.z += dt * 4.0;
            if (bh.mesh) bh.mesh.position.x = bh.openAnim * 1.9;
          }
        } else if (!bh.isOpen && bh.openAnim > 0.0) {
          bh.openAnim = Math.max(0.0, bh.openAnim - dt * 0.35);
          if (bh.isGltf && bh.actions && bh.mixer) {
            const animTime = bh.openAnim * bh.maxDuration;
            bh.actions.forEach((act) => {
              act.time = animTime;
            });
            bh.mixer.update(0);
          }
        }
      }
    });

    solid(-1.4, 1.4, -5.1, -4.7);

    loadModel('vault_door.glb')
      .then((gltf) => {
        const m = gltf.scene;
        const targetHeight = 2.76;
        const box = new THREE.Box3().setFromObject(m);
        const size = new THREE.Vector3();
        box.getSize(size);
        const s = targetHeight / (size.y || 1);
        m.scale.set(s, s, s);
        // Align bottom of circular frame to floor at Y=0, positioned at Z=0.04
        m.position.set(0, -box.min.y * s, 0.04);

        // PBR material tuning matching industrial archive aesthetics
        m.traverse((child) => {
          if (child.isMesh && child.material) {
            child.castShadow = true;
            child.receiveShadow = true;
            // Prevent emissive wash-out so PBR steel and brass detail stays crisp
            child.userData.np = 1;
            if (child.material.name === 'VaultSteel') {
              child.material.color = new THREE.Color(0x2d3236);
              child.material.roughness = 0.52;
              child.material.metalness = 0.88;
            } else if (child.material.name === 'VaultBrass') {
              child.material.color = new THREE.Color(0xb88832);
              child.material.roughness = 0.32;
              child.material.metalness = 0.94;
            }
          }
        });

        doorMesh.visible = false;
        wheelRim.visible = false;

        // Bind all 24 animated channels (lock handles, central wheel, deadbolts, cog door)
        const mixer = new THREE.AnimationMixer(m);
        const actions = (gltf.animations || []).map((clip) => {
          const act = mixer.clipAction(clip);
          act.setLoop(THREE.LoopOnce);
          act.clampWhenFinished = true;
          act.play();
          return act;
        });

        const maxDuration = gltf.animations && gltf.animations[0] ? gltf.animations[0].duration : 6.25;

        bulkhead.add(m);

        E.ref.bulkheadDoor.mesh = m;
        E.ref.bulkheadDoor.wheel = null;
        E.ref.bulkheadDoor.mixer = mixer;
        E.ref.bulkheadDoor.actions = actions;
        E.ref.bulkheadDoor.maxDuration = maxDuration;
        E.ref.bulkheadDoor.isGltf = true;

        // Initialize at t=0
        actions.forEach((a) => { a.time = 0; });
        mixer.update(0);

        add(bulkhead);
      })
      .catch((err) => console.warn('[RECORDS] vault_door.glb fallback active', err));
  }

  // =========================================================================
  // 12. ENTRANCE VAULT HATCH: South Wall Door (`room_door`)
  // =========================================================================
  {
    const hatch = new THREE.Group();
    hatch.position.set(0, 0, 4.92);
    hatch.rotation.y = Math.PI;

    hatch.add(mkBox(1.9, 2.5, 0.14, darkMetalMat, 0, 1.25, 0));
    const hit = mkHitBox(2.2, 2.6, 0.5, 0, 1.25, 0.2);
    hatch.add(hit);

    interact(hatch, 'room_door');
    add(hatch);
    E.ref.roomDoor = { isOpen: false };
    solid(-1.3, 1.3, 4.7, 5.1);
  }

  // =========================================================================
  // 13. SPIDERWEBS, COBWEBS & ATMOSPHERIC DUST SYSTEM
  // =========================================================================
  // Real-world organic arachnid deposition derived from spiderwebWithDew.blend:
  // - Corner cobwebs at 90-degree ceiling/wall junctions
  // - Tension webs stretched across overhead pipes and conduits
  // - Curved crevice webs tucked into stone archway spandrels & vault portal
  // - Draped dusty sheets hanging from archive shelves & furniture
  // - Showcase radial webs with glistening dew droplets
  // - Floating volumetric dust motes dancing in light cones and torch beam
  {
    const webGroup = new THREE.Group();
    webGroup.name = 'Records_Spiderwebs_Group';

    const prepWeb = (root) => {
      root.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = true;
          child.userData.np = 1;
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              m.side = THREE.DoubleSide;
              m.transparent = true;
              m.depthWrite = false;
              if (m.name && m.name.includes('Dew')) {
                m.color = new THREE.Color(0xdce8f2);
                m.emissive = new THREE.Color(0x283848);
                m.emissiveIntensity = 0.35; // Glistening subterranean condensation droplets
                m.roughness = 0.05;
                m.metalness = 0.15;
                m.opacity = 0.90;
              } else {
                m.color = new THREE.Color(0xc4bfb4); // Authentic aged, dusty silk
                m.emissive = new THREE.Color(0x28231c); // Subtle ambient glow so strands remain visible against dark bricks without glowing like neon
                m.emissiveIntensity = 0.22;
                m.roughness = 0.42;
                m.metalness = 0.05;
                m.opacity = 0.68; // Translucent gossamer silk
              }
            });
          }
        }
      });
    };

    const spawnWebInstances = (proto, list) => {
      list.forEach((item) => {
        const inst = proto.clone(true);
        inst.position.set(...item.pos);
        if (item.rot) inst.rotation.set(...item.rot);
        if (item.scale) {
          if (typeof item.scale === 'number') {
            inst.scale.set(item.scale, item.scale, item.scale);
          } else {
            inst.scale.set(...item.scale);
          }
        }
        inst.traverse((child) => {
          if (child.isMesh) child.userData.np = 1;
        });
        webGroup.add(inst);
      });
    };

    // 1. CORNER COBWEBS (Tucked into ceiling-wall corners and upper crevices with natural catenary sag)
    loadModel('spiderweb_corner.glb')
      .then((gltf) => {
        const proto = gltf.scene;
        prepWeb(proto);
        spawnWebInstances(proto, [
          // Central Corridor Upper Corners (Y=3.0, tucked into ceiling-wall junctions)
          { pos: [-1.78, 3.02, 4.75], rot: [0, 0, 0], scale: 1.25 },
          { pos: [1.78, 3.02, 4.75], rot: [0, Math.PI / 2, 0], scale: 1.2 },
          { pos: [-1.78, 3.02, -4.75], rot: [0, -Math.PI / 2, 0], scale: 1.25 },
          { pos: [1.78, 3.02, -4.75], rot: [0, Math.PI, 0], scale: 1.2 },
          // North-West Chamber: Microfilm & Surveillance
          { pos: [-5.75, 2.95, -4.75], rot: [0, -Math.PI / 2, 0], scale: 1.35 },
          { pos: [-5.75, 2.30, -1.25], rot: [0, 0, 0], scale: 1.15 },
          { pos: [-2.25, 2.95, -4.75], rot: [0, Math.PI, 0], scale: 1.2 },
          // North-East Chamber: Clerk's Office
          { pos: [5.75, 2.95, -4.75], rot: [0, Math.PI, 0], scale: 1.35 },
          { pos: [5.75, 2.30, -1.25], rot: [0, Math.PI / 2, 0], scale: 1.15 },
          { pos: [2.25, 2.95, -4.75], rot: [0, -Math.PI / 2, 0], scale: 1.2 },
          // South-East Chamber: Records Annex
          { pos: [5.75, 2.95, 4.75], rot: [0, Math.PI / 2, 0], scale: 1.35 },
          { pos: [5.75, 2.25, 1.25], rot: [0, Math.PI, 0], scale: 1.2 },
          { pos: [2.25, 2.95, 4.75], rot: [0, 0, 0], scale: 1.2 },
          // South-West Chamber: Sump Vault (Damp, heavy web growth)
          { pos: [-5.75, 2.90, 4.75], rot: [0, 0, 0], scale: 1.4 },
          { pos: [-5.75, 2.05, 4.75], rot: [0, 0, 0], scale: 1.15 }, // Lower damp corner near flooded sump
          { pos: [-5.75, 2.85, 1.25], rot: [0, -Math.PI / 2, 0], scale: 1.25 },
          { pos: [-2.25, 2.90, 4.75], rot: [0, Math.PI / 2, 0], scale: 1.2 }
        ]);
      })
      .catch((err) => console.warn('[RECORDS] spiderweb_corner.glb load error', err));

    // 2. STRETCHED TENSION WEBS (Spanning across overhead ceiling pipes at Y=2.76 - 2.80m)
    loadModel('spiderweb_stretched.glb')
      .then((gltf) => {
        const proto = gltf.scene;
        prepWeb(proto);
        spawnWebInstances(proto, [
          // Central Corridor Pipe Spans (Overhead spanning conduits at Y=2.78m - 2.82m)
          { pos: [0.0, 2.80, -2.2], rot: [0.05, 0.2, 0], scale: [1.1, 1.0, 1.1] },
          { pos: [0.0, 2.78, 1.2], rot: [-0.05, -0.15, 0], scale: [1.15, 1.0, 1.1] },
          // North-West Microfilm Lab
          { pos: [-4.0, 2.80, -3.2], rot: [0.04, 0.35, 0], scale: [1.2, 1.0, 1.1] },
          // North-East Clerk's Office
          { pos: [3.8, 2.80, -3.0], rot: [-0.04, -0.25, 0], scale: [1.15, 1.0, 1.1] },
          // South-East Records Annex
          { pos: [4.3, 2.78, 3.2], rot: [0.05, 0.2, 0], scale: [1.2, 1.0, 1.1] },
          // South-West Sump Vault
          { pos: [-4.6, 2.76, 2.5], rot: [-0.05, -0.3, 0], scale: [1.25, 1.0, 1.2] }
        ]);
      })
      .catch((err) => console.warn('[RECORDS] spiderweb_stretched.glb load error', err));

    // 3. ARCHED CREVICE WEBS (Tucked neatly into stone doorway arch spandrels & vault bulkhead rim)
    loadModel('spiderweb_arch.glb')
      .then((gltf) => {
        const proto = gltf.scene;
        prepWeb(proto);
        spawnWebInstances(proto, [
          // Mini-room arched door spandrels (Tucked into upper arch shoulder at Y=2.45m)
          { pos: [-1.88, 2.45, -3.0], rot: [0, Math.PI / 2, 0], scale: 0.85 },
          { pos: [1.88, 2.45, -3.0], rot: [0, -Math.PI / 2, 0], scale: 0.85 },
          { pos: [1.88, 2.45, 3.0], rot: [0, -Math.PI / 2, 0], scale: 0.85 },
          { pos: [-1.88, 2.45, 3.0], rot: [0, Math.PI / 2, 0], scale: 0.85 },
          // Vault Door portal frame perimeter (Tucked into upper crevices around circular bulkhead)
          { pos: [0.65, 2.52, -4.85], rot: [0, 0, 0.15], scale: 0.85 },
          { pos: [-0.65, 2.52, -4.85], rot: [0, Math.PI, -0.15], scale: 0.85 },
          { pos: [0.0, 2.72, -4.85], rot: [0, 0, 0], scale: 0.9 }
        ]);
      })
      .catch((err) => console.warn('[RECORDS] spiderweb_arch.glb load error', err));

    // 4. DRAPED VERTICAL COBWEBS (Draping from shelves, cabinets, and vents)
    loadModel('spiderweb_draped.glb')
      .then((gltf) => {
        const proto = gltf.scene;
        prepWeb(proto);
        spawnWebInstances(proto, [
          // South-West archive shelves (Y=1.85m)
          { pos: [-4.6, 1.85, 3.6], rot: [0, -0.2, 0], scale: [0.95, 0.9, 0.95] },
          // South-East filing cabinets (Y=1.70m)
          { pos: [5.1, 1.70, 3.2], rot: [0, Math.PI / 2, 0], scale: [0.9, 0.9, 0.9] },
          // Behind Clerk's desk in North-East chamber (Y=1.15m)
          { pos: [4.6, 1.15, -4.3], rot: [0, 0, 0], scale: [0.9, 0.85, 0.85] },
          // Across low drainage vent grate in South-West chamber (Y=0.55m)
          { pos: [-5.65, 0.55, 3.0], rot: [0, Math.PI / 2, 0], scale: [0.75, 0.8, 0.75] },
          // Corridor hanging lamp fixture bracket (Y=2.65m)
          { pos: [0.25, 2.65, -1.5], rot: [0, 0.6, 0], scale: [0.8, 0.85, 0.8] }
        ]);
      })
      .catch((err) => console.warn('[RECORDS] spiderweb_draped.glb load error', err));

    // 5. SHOWCASE RADIAL WEB WITH DEW (Glistening condensation highlights)
    loadModel('spiderweb_full.glb')
      .then((gltf) => {
        const proto = gltf.scene;
        prepWeb(proto);
        spawnWebInstances(proto, [
          // Corridor high ceiling junction near hanging lamp (Y=2.80m, catching warm lamp light)
          { pos: [-0.35, 2.80, -0.65], rot: [Math.PI / 2 - 0.15, 0.3, 0], scale: 0.95 },
          // South-West humid sump corner above flooded water (Y=2.35m)
          { pos: [-5.0, 2.35, 1.8], rot: [0.2, 0.7, 0], scale: 0.95 },
          // North-West surveillance rack upper flank (Y=2.30m)
          { pos: [-5.15, 2.30, -1.85], rot: [0, Math.PI / 2, 0.15], scale: 0.85 }
        ]);
      })
      .catch((err) => console.warn('[RECORDS] spiderweb_full.glb load error', err));

    add(webGroup);

    // 6. ATMOSPHERIC VOLUMETRIC DUST MOTES
    // 450 micro-particles dancing in ambient lamplight and tactical flashlight cone
    const dustCount = 450;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustMeta = [];

    // Procedural soft-radial circular dust texture
    const dcv = document.createElement('canvas');
    dcv.width = dcv.height = 32;
    const dg = dcv.getContext('2d');
    const grad = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 245, 230, 0.95)');
    grad.addColorStop(0.35, 'rgba(220, 205, 185, 0.5)');
    grad.addColorStop(0.7, 'rgba(180, 165, 145, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dg.fillStyle = grad;
    dg.fillRect(0, 0, 32, 32);
    const dustTex = new THREE.CanvasTexture(dcv);

    for (let i = 0; i < dustCount; i++) {
      // Disperse across corridor and chambers
      const inChamber = Math.random() > 0.4;
      let px, pz;
      if (inChamber) {
        px = (Math.random() > 0.5 ? 1 : -1) * (2.2 + Math.random() * 3.4);
        pz = (Math.random() > 0.5 ? 1 : -1) * (1.3 + Math.random() * 3.3);
      } else {
        px = (Math.random() - 0.5) * 3.4;
        pz = (Math.random() - 0.5) * 9.2;
      }
      const py = 0.2 + Math.random() * 2.85;

      dustPos[i * 3] = px;
      dustPos[i * 3 + 1] = py;
      dustPos[i * 3 + 2] = pz;

      dustMeta.push({
        baseX: px,
        baseY: py,
        baseZ: pz,
        driftSpeedY: 0.0004 + Math.random() * 0.0008,
        driftWobble: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));

    const dustMat = new THREE.PointsMaterial({
      size: 0.042,
      map: dustTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.42,
      color: 0xdecbb5
    });

    const dustPoints = new THREE.Points(dustGeo, dustMat);
    dustPoints.userData.np = 1;
    add(dustPoints);

    // Animate volumetric dust drift
    let dustElapsed = 0;
    anim((dt) => {
      dustElapsed += dt;
      const posAttr = dustGeo.attributes.position;
      const arr = posAttr.array;

      for (let i = 0; i < dustCount; i++) {
        const m = dustMeta[i];
        const idx = i * 3;

        // Gentle 3D convective Brownian drift
        arr[idx + 1] -= m.driftSpeedY * (1.0 + 0.3 * Math.sin(dustElapsed * m.driftWobble + m.phase));
        arr[idx] += Math.sin(dustElapsed * 0.25 + m.phase) * 0.0006;
        arr[idx + 2] += Math.cos(dustElapsed * 0.28 + m.phase) * 0.0006;

        // Recycle particles that drift below floor or out of bounds
        if (arr[idx + 1] < 0.15) {
          arr[idx + 1] = 3.05;
        } else if (arr[idx + 1] > 3.15) {
          arr[idx + 1] = 0.2;
        }
        if (Math.abs(arr[idx]) > 5.85) arr[idx] = m.baseX;
        if (Math.abs(arr[idx + 2]) > 4.85) arr[idx + 2] = m.baseZ;
      }
      posAttr.needsUpdate = true;
    });
  }

  return {
    floor
  };
}

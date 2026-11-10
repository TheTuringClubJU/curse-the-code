// GLB-Powered Multi-Room 3D Scene Builder for Room 5: The Surveillance Morgue
// Combines compressed control_room.glb (Rooms 5A/5B), modular horror_kit.glb wings (Rooms 5C Security Annex
// & 5D Chamber 3 Observation Hall), hero GLB props, live CRT screens, hinged doors, and animated ghost.glb.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as XC from './texControl.js';

const MODEL_BASE = '/assets/models/room5';
const ROOM_OFFSET = new THREE.Vector3(6.55, -4.99, -2.40);

// Modular 1.56m tile grid anchored flush onto P1_Puerta_Granate__1__ at X = -1.61, Z = 9.40
const TILE = 1.56;
const colX = (c) => -2.39 - c * TILE; // c=0:-2.39 (East -1.61) .. c=7:-13.31 (West -14.09)
const rowZ = (r) => 6.28 + r * TILE;  // r=0: 6.28 (South 5.50) .. r=4: 12.52 (North 13.30)

/**
 * Center X/Z and ground min.y = 0 for any imported GLB prop, returning the wrapped Group.
 */
function normalizeProp(root, { scale = 1, position = [0, 0, 0], rotationY = 0, fixTransparency = false } = {}) {
  const wrapper = new THREE.Group();
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box.getCenter(center);

  root.position.set(-center.x, -box.min.y, -center.z);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.userData.np = 1;
    o.castShadow = false;
    o.receiveShadow = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (!m) return;
      if (fixTransparency) {
        m.transparent = false;
        m.alphaTest = 0;
      }
      m.needsUpdate = true;
    });
  });

  wrapper.add(root);
  wrapper.scale.setScalar(scale);
  wrapper.position.set(...position);
  wrapper.rotation.y = rotationY;
  return wrapper;
}

/**
 * Build a hinged door group around a world-space hinge point, preserving mesh world transforms.
 */
function createHingedDoor(S, meshes, hingeWorldPos, openAngleRad, closedAngleRad = 0) {
  const hinge = new THREE.Group();
  hinge.position.copy(hingeWorldPos);
  hinge.rotation.y = closedAngleRad;
  S.add(hinge);
  hinge.updateMatrixWorld(true);
  meshes.forEach((m) => {
    if (!m) return;
    m.updateMatrixWorld(true);
    hinge.attach(m);
  });
  hinge.isOpen = false;
  hinge.userData.openAngle = openAngleRad;
  hinge.userData.closedAngle = closedAngleRad;
  hinge.userData.currentAngle = closedAngleRad;
  return hinge;
}

/**
 * Clone a named piece cleanly out of the loaded horror_kit.glb bundle.
 */
function cloneKitPiece(kitRoot, name, { position = [0, 0, 0], rotY = 0, rotX = 0, scale = 1 } = {}) {
  const src = kitRoot.getObjectByName(name);
  if (!src) return null;
  const clone = src.clone(true);
  // Preserve source Y origin offset (walls sit at +1.482, doors at +1.318, floors at -0.078)
  clone.position.set(position[0], src.position.y + position[1], position[2]);
  clone.rotation.set(rotX, rotY, 0);
  if (typeof scale === 'number' && scale !== 1) clone.scale.multiplyScalar(scale);
  clone.traverse((o) => {
    if (!o.isMesh) return;
    o.userData.np = 1;
    o.castShadow = false;
    o.receiveShadow = false;
  });
  return clone;
}

const markNoMerge = (root) => {
  if (!root) return;
  root.traverse((o) => { o.userData._noMerge = true; });
};

/**
 * Dequantize a BufferAttribute (including Int16/Uint16 normalized & InterleavedBufferAttributes)
 * into an unshared Float32Array geometry before applying world matrices or merging.
 */
function toFloat32Geometry(srcGeo) {
  const g = srcGeo.index ? srcGeo.toNonIndexed() : srcGeo.clone();
  const posAttr = g.getAttribute('position');
  const normAttr = g.getAttribute('normal');
  const uvAttr = g.getAttribute('uv');
  const count = posAttr.count;

  const posArr = new Float32Array(count * 3);
  const normArr = new Float32Array(count * 3);
  const uvArr = new Float32Array(count * 2);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    posArr[i3] = posAttr.getX(i);
    posArr[i3 + 1] = posAttr.getY(i);
    posArr[i3 + 2] = posAttr.getZ(i);
    if (normAttr) {
      normArr[i3] = normAttr.getX(i);
      normArr[i3 + 1] = normAttr.getY(i);
      normArr[i3 + 2] = normAttr.getZ(i);
    }
    if (uvAttr) {
      const i2 = i * 2;
      uvArr[i2] = uvAttr.getX(i);
      uvArr[i2 + 1] = uvAttr.getY(i);
    }
  }

  g.dispose();
  const clean = new THREE.BufferGeometry();
  clean.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  clean.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  clean.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  if (!normAttr) clean.computeVertexNormals();
  return clean;
}

/**
 * Merge static modular geometries in a group by shared material to cut WebGL draw calls ~10x.
 */
function batchStaticMeshes(group) {
  if (!group) return;
  group.updateMatrixWorld(true);
  const groupInv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const toRemove = [];

  group.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.userData._noMerge || !o.geometry || !o.material) return;
    if (Array.isArray(o.material)) return;
    const g = o.geometry;
    if (!g.getAttribute('position')) return;
    const mKey = o.material.uuid;
    if (!buckets.has(mKey)) buckets.set(mKey, { material: o.material, entries: [] });
    buckets.get(mKey).entries.push({ mesh: o });
  });

  buckets.forEach(({ material, entries }) => {
    if (entries.length < 2) return;
    const geos = [];
    const relMat = new THREE.Matrix4();
    for (const { mesh } of entries) {
      try {
        const g = toFloat32Geometry(mesh.geometry);
        relMat.multiplyMatrices(groupInv, mesh.matrixWorld);
        g.applyMatrix4(relMat);
        geos.push(g);
      } catch {
        geos.forEach((d) => d.dispose());
        return; // Leave group unmerged if any custom geometry fails
      }
    }
    if (geos.length < 2) {
      geos.forEach((g) => g.dispose());
      return;
    }
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) return;
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const batchMesh = new THREE.Mesh(merged, material);
    batchMesh.userData.np = 1;
    batchMesh.castShadow = false;
    batchMesh.receiveShadow = false;
    group.add(batchMesh);
    entries.forEach(({ mesh }) => toRemove.push(mesh));
  });

  toRemove.forEach((mesh) => {
    mesh.parent?.remove(mesh);
  });
}

/**
 * Procedural instrument dial / oscilloscope CanvasTexture so equipment never looks like flat yellow boxes.
 */
function createInstrumentFaceTexture(kind = 'scope') {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#090e0a';
    ctx.fillRect(0, 0, 256, 128);
    if (kind === 'radio') {
      ctx.fillStyle = '#18140d';
      ctx.fillRect(6, 6, 244, 116);
      ctx.strokeStyle = '#6c5633';
      ctx.lineWidth = 2;
      ctx.strokeRect(6, 6, 244, 116);
      ctx.strokeStyle = '#d4a45a';
      ctx.lineWidth = 1.5;
      for (let x = 20; x <= 236; x += 12) {
        const tall = x % 36 === 0;
        ctx.beginPath();
        ctx.moveTo(x, tall ? 30 : 40);
        ctx.lineTo(x, 62);
        ctx.stroke();
      }
      ctx.fillStyle = '#e5c17b';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('7.45 MHz // VM-CH', 18, 22);
      ctx.fillText('SIGNAL +12 dB', 18, 98);
      ctx.strokeStyle = '#d43a3a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(118, 24);
      ctx.lineTo(118, 74);
      ctx.stroke();
    } else if (kind === 'gauge') {
      ctx.fillStyle = '#121311';
      ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = '#8b7752';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(128, 64, 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#e7dcc5';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('LINE PSI / V', 92, 92);
      ctx.strokeStyle = '#b93838';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(128, 64);
      ctx.lineTo(164, 34);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#1e3824';
      ctx.lineWidth = 1;
      for (let x = 0; x < 256; x += 24) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
      }
      for (let y = 0; y < 128; y += 24) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      }
      ctx.strokeStyle = '#d99a44';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 4) {
        const y = 64 - Math.sin(x * 0.08) * (18 + 22 * Math.exp(-Math.pow((x - 168) / 36, 2)));
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#cf9e56';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('PEAK 8.1 kHz · BCD', 10, 16);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildControlScene(E, handlers = {}) {
  const { S, add, solid, removeSolid, interact, visualInteract, anim, ref } = E;
  const isDev = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev');

  // Skip heavy PMREM cubemap IBL in Room 5 to keep WebGL shaders lightweight & frame rate locked at 60 FPS

  // ── 1. Structural Wall & Furniture Colliders ────────────────────────────────
  const addWallColliders = () => {
    // Control Room 5B shell (X: [-3.27, 3.26], Z: [-1.82, 1.71])
    solid(-3.45, 3.45, -2.05, -1.78); // South wall
    solid(-3.45, -3.22, -1.95, 1.85); // West wall
    solid(3.22, 3.45, -1.95, 1.85);   // East wall
    solid(-3.45, 0.46, 1.66, 1.96);   // North wall left of doorway (widened gap)
    solid(1.58, 3.45, 1.66, 1.96);    // North wall right of doorway (widened gap)

    // Anteroom / Outer L-shaped corridor (5A)
    solid(-5.75, -5.48, -2.15, 5.55); // Far west wall
    solid(-5.65, -3.40, -2.20, -1.86);// SW entry door wall
    solid(-3.58, -3.22, -2.00, 1.92); // Corridor partition wall
    // NW partition (IS4_P1_Antesala_Pared_4) split around south_wing_door (X = -4.45..-3.45, Z = 5.50)
    solid(-5.65, -4.45, 5.38, 5.62);
    solid(-3.45, -1.48, 5.38, 5.62);

    // Mid-north partition (Pared_3) split widely around annex_door (Z = 8.84..9.96)
    solid(-1.74, -1.46, 5.38, 8.84);  // South section of Pared_3
    solid(-1.74, -1.46, 9.96, 10.75); // North section of Pared_3

    solid(-1.65, 6.65, 10.60, 10.88); // North end wall (5A)
    solid(6.42, 6.70, 7.95, 10.75);   // East alcove wall (5A)
    solid(2.42, 6.65, 7.92, 8.15);    // South-east alcove wall (vault door wall)
    solid(2.42, 2.65, 1.70, 8.10);    // East corridor wall (5A)

    // Control Room 5B furniture
    solid(2.38, 3.25, -0.78, 1.35);   // WhiteDesk + monitors
    solid(1.02, 2.85, -1.65, -0.64);  // Shelving rack + floor TVs
    solid(-2.65, -0.20, -1.82, -0.78);// Sofa
    solid(-3.27, -2.22, 0.25, 1.71);  // OfficeWoodTable (staff_terminal)
    solid(-3.16, -2.42, -0.10, 0.64); // OfficeChair
    solid(-1.44, -0.40, 1.12, 1.70);  // Filing cabinets (5B north wall)
    solid(-0.12, 0.72, -1.68, -0.90); // Retro TV cluster alcove

    // Anteroom 5A crates & north bench (West passage X = -4.45..-3.45 cleared straight into 5C)
    solid(4.80, 6.55, 9.00, 10.65);   // NE crate stack
    solid(-0.25, 1.58, 9.90, 10.70);  // North green bench

    // Expanded Wing Rooms 5C, 5D, Chamber 3 (Z: 5.50..13.30) + North Wings 5E & 5F (Z: 13.30..19.54)
    solid(-14.25, -4.45, 5.38, 5.64);  // South perimeter west of south_wing_door
    solid(-3.45, -1.55, 5.38, 5.64);   // South perimeter east of south_wing_door
    solid(-1.74, -1.48, 10.75, 19.65);  // East wall extension (5C + 5E)
    solid(-14.25, -13.95, 5.45, 19.65); // Far West outer wall (Chamber 3 + 5F)
    solid(-14.25, -1.55, 19.40, 19.68); // Far North perimeter wall (5E + 5F)

    // North divider wall along Z = 13.30 split around chamber3_north_door (-12.25..-11.25), generator_door (-10.69..-9.69), & cryo_door (-6.01..-5.01)
    solid(-14.25, -12.25, 13.16, 13.44);
    solid(-11.25, -10.69, 13.16, 13.44);
    solid(-9.69, -7.85, 13.16, 13.44);
    solid(-7.85, -6.01, 13.16, 13.44);
    solid(-5.01, -1.55, 13.16, 13.44);

    // Partition between 5E Cryo Suite & 5F Generator Bay along X = -7.85 (morgue_vault_door doorway at Z = 16.62..17.78)
    solid(-8.02, -7.68, 13.30, 16.62);
    solid(-8.02, -7.68, 17.78, 19.54);

    // Partition between enlarged Room 5C & Room 5D at X = -7.85 (doorway at Z = 7.26..8.42)
    solid(-8.02, -7.68, 5.50, 7.26);  // South half
    solid(-8.02, -7.68, 8.42, 13.30); // North half + twin observation glass

    // Partition between Room 5D & Enterable Chamber 3 Cell at X = -10.97 (doorway at Z = 7.26..8.42)
    solid(-11.14, -10.80, 5.50, 7.26);  // South half
    solid(-11.14, -10.80, 8.42, 13.30); // North half + stained observation glass

    // Enlarged Room 5C, 5D, Chamber 3, 5E & 5F Furnishing Colliders
    solid(-7.55, -5.05, 5.62, 6.24);    // South locker bank (5C SW corner, clearing south_wing_door)
    solid(-5.25, -2.55, 12.18, 13.10);  // CabinetShort + Radio Console + Akai deck (5C North)
    solid(-7.15, -5.80, 12.20, 13.10);  // Tall locker cabinet NW (5C)
    solid(-10.15, -8.35, 12.18, 13.10); // Observation north Sound Console desk (5D)
    solid(-9.60, -8.80, 5.75, 6.45);    // Observation corridor crate (5D South)
    solid(-10.85, -9.65, 8.85, 10.35); // Observation 5D Table_1.fbx (relocated west wall alcove)
    solid(-13.75, -12.40, 12.15, 13.10);// Chamber 3 specimen table north wall (cleared west of chamber3_north_door)
    solid(-13.85, -13.05, 5.85, 6.65);  // Chamber 3 south locker
    solid(-13.95, -12.65, 9.40, 11.45); // Chamber 3 morgue exam bed against west wall
    solid(-3.75, -2.15, 16.40, 18.65);  // Room 5E Cryo Autopsy Gurney
    solid(-4.65, -3.25, 17.20, 18.60);  // Room 5E Autopsy Table
    solid(-7.35, -5.95, 18.40, 19.35);  // Room 5E Cold Storage Locker
    solid(-13.45, -11.05, 17.85, 19.25);// Room 5F Relay Rack & Generator Bank
  };

  addWallColliders();

  // Dynamic doorway colliders (widened gaps; removed cleanly when doors swing open)
  let controlDoorSolid = solid(0.46, 1.58, 1.66, 1.96);
  const wingDoorSpecs = {
    annex_door: [-1.74, -1.46, 8.84, 9.96],
    south_wing_door: [-4.45, -3.45, 5.38, 5.64],
    observation_door: [-8.02, -7.68, 7.26, 8.42],
    chamber3_door: [-11.14, -10.80, 7.26, 8.42],
    chamber3_north_door: [-12.25, -11.25, 13.16, 13.44],
    cryo_door: [-6.01, -5.01, 13.16, 13.44],
    generator_door: [-10.69, -9.69, 13.16, 13.44],
    morgue_vault_door: [-8.02, -7.68, 16.62, 17.78],
  };
  const wingDoorSolids = {
    annex_door: solid(...wingDoorSpecs.annex_door),
    south_wing_door: solid(...wingDoorSpecs.south_wing_door),
    observation_door: solid(...wingDoorSpecs.observation_door),
    chamber3_door: solid(...wingDoorSpecs.chamber3_door),
    chamber3_north_door: solid(...wingDoorSpecs.chamber3_north_door),
    cryo_door: solid(...wingDoorSpecs.cryo_door),
    generator_door: solid(...wingDoorSpecs.generator_door),
    morgue_vault_door: solid(...wingDoorSpecs.morgue_vault_door),
  };

  // ── 2. Dim Moody Hospital Orange-Red Lighting Rig (Flashlight Essential) ─
  // Very subtle terracotta-charcoal fill (~10-15% shadow floor) so corners stay dark and [F] flashlight matters
  const hospitalHemi = new THREE.HemisphereLight(0x522116, 0x100806, 0.22);
  S.add(hospitalHemi);

  // Dim warm amber-tungsten fixture covering Safe Control Bay 5B
  const controlOverhead = new THREE.PointLight(0xc47a4a, 1.85, 11.5, 1.55);
  controlOverhead.position.set(0.0, 2.68, 0.2);
  S.add(controlOverhead);

  // Flickering rusty burnt-orange emergency hospital bulb in Anteroom 5A East
  const corridorAmber = new THREE.PointLight(0xc94218, 1.95, 11.5, 1.55);
  corridorAmber.position.set(1.2, 2.68, 6.2);
  S.add(corridorAmber);

  // Anteroom 5A West Hallway — dim hospital orange-red light near Control Bay loop
  const corridorWestLight = new THREE.PointLight(0xc23e18, 1.80, 11.0, 1.55);
  corridorWestLight.position.set(-4.0, 2.74, 3.2);
  S.add(corridorWestLight);

  // Room 5C (Locker & Radio Wing) — dim smoky emergency orange-amber hospital light
  const annexLight = new THREE.PointLight(0xc94418, 2.05, 11.5, 1.55);
  annexLight.position.set(colX(1.5), 2.84, rowZ(2));
  S.add(annexLight);

  // Room 5D (Observation Lab) — dim murky orange-red hospital emergency bulb
  const obsLight = new THREE.PointLight(0xc23616, 1.95, 11.0, 1.55);
  obsLight.position.set(colX(4.8), 2.84, rowZ(2));
  S.add(obsLight);

  // Chamber 3 Bio-Containment Cell — dim pulsing crimson-orange hazard light
  const chamber3RedLight = new THREE.PointLight(0xc42214, 2.30, 11.0, 1.55);
  chamber3RedLight.position.set(colX(6.5), 2.78, rowZ(2));
  S.add(chamber3RedLight);

  // Room 5E (Cryo Autopsy Suite) — low blood-amber hospital bulkhead light
  const cryoLight = new THREE.PointLight(0xb8401e, 1.95, 11.0, 1.55);
  cryoLight.position.set(colX(1.8), 2.84, rowZ(6.8));
  S.add(cryoLight);

  // Room 5F (Generator & Relay Vault) — dim turbine red-orange hospital bulb
  const genLight = new THREE.PointLight(0xc43c16, 2.05, 11.0, 1.55);
  genLight.position.set(colX(5.5), 2.84, rowZ(6.8));
  S.add(genLight);

  // Grounded Caged Hospital Ceiling Bulkhead Fixtures (Zero floating flashlights)
  const makeHospitalFixture = (parent, lx, ly, lz, colorHex) => {
    const grp = new THREE.Group();
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x1c211f, roughness: 0.55, metalness: 0.72 });
    const cageMat = new THREE.MeshStandardMaterial({ color: 0x2c3330, roughness: 0.45, metalness: 0.82 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: new THREE.Color(colorHex),
      emissiveIntensity: 1.45,
      roughness: 0.25,
      metalness: 0.10,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.045, 14), housingMat);
    base.position.y = 0.015;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.145, 0.04, 14), cageMat);
    collar.position.y = -0.025;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), glassMat);
    dome.position.y = -0.032;
    const guardRing = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.009, 6, 16), cageMat);
    guardRing.rotation.x = Math.PI / 2;
    guardRing.position.y = -0.08;
    grp.add(base, collar, dome, guardRing);
    grp.position.set(lx, ly, lz);
    grp.userData.np = 1;
    parent.add(grp);
    return grp;
  };
  makeHospitalFixture(S, 0.0, 2.95, 0.2, 0xd88d5a);
  makeHospitalFixture(S, 1.2, 2.95, 6.2, 0xe05824);
  makeHospitalFixture(S, -4.0, 2.95, 3.2, 0xd95122);

  // Subtle doorway header transom strips marking passages in dim hospital lighting without altering wooden doors
  const unlockedTransomMat = new THREE.MeshStandardMaterial({
    color: 0xc96926,
    emissive: new THREE.Color(0xc96926),
    emissiveIntensity: 0.72,
    roughness: 0.35,
  });
  const lockedTransomMat = new THREE.MeshStandardMaterial({
    color: 0xb82222,
    emissive: new THREE.Color(0xb82222),
    emissiveIntensity: 0.85,
    roughness: 0.35,
  });
  const doorCasingMat = new THREE.MeshStandardMaterial({ color: 0x202523, roughness: 0.55, metalness: 0.6 });
  const addDoorwayTransom = (parent, x, z, rotY = 0, locked = false) => {
    const grp = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.21), doorCasingMat);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.028, 0.225), locked ? lockedTransomMat : unlockedTransomMat);
    grp.add(box, bar);
    grp.position.set(x, 2.52, z);
    grp.rotation.y = rotY;
    grp.userData.np = 1;
    parent.add(grp);
    return grp;
  };
  addDoorwayTransom(S, -1.61, 9.40, Math.PI / 2, false);

  // Vault status LED beside vault_door (emissive mesh only — zero extra PointLight cost)
  const vaultBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: new THREE.Color(0xff2222),
    emissiveIntensity: 1.8,
    roughness: 0.3,
  });
  const vaultBeaconMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.06), vaultBeaconMat);
  vaultBeaconMesh.position.set(3.42, 1.52, 8.15);
  vaultBeaconMesh.userData.np = 1;
  S.add(vaultBeaconMesh);

  // Lean dust particles across rooms
  const dustCount = 80;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3]     = -13.8 + Math.random() * 20.0;
    dustPositions[i * 3 + 1] = 0.25 + Math.random() * 2.55;
    dustPositions[i * 3 + 2] = -1.6 + Math.random() * 14.5;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustPoints = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0xd98a5b, size: 0.024, transparent: true, opacity: 0.24 })
  );
  dustPoints.userData.np = 1;
  dustPoints.visible = E._qualityMode !== 'eco';
  E._dustPoints = dustPoints;
  S.add(dustPoints);

  const roomLights = [
    { light: controlOverhead, base: () => (isBreakerOn ? 1.85 : 0.55) },
    { light: corridorAmber, base: () => 1.95 },
    { light: corridorWestLight, base: () => 1.80 },
    { light: annexLight, base: () => (isBreakerOn ? 2.05 : 0.55) },
    { light: obsLight, base: () => (isBreakerOn ? 1.95 : 0.55) },
    { light: chamber3RedLight, base: () => 2.30 },
    { light: cryoLight, base: () => (isBreakerOn ? 1.95 : 0.55) },
    { light: genLight, base: () => (isBreakerOn ? 2.05 : 0.65) },
  ];

  // ── 3. Interactive Proxy Hitboxes & Diegetic Floor/Surface Rings ─────────────
  const monitorScreens = [];
  E._monitorScreens = monitorScreens;

  const hotspotSpecs = [
    // Clue Consoles distributed across Control Room (5B), Locker/Radio Wing (5C), & Observation Lab (5D)
    { id: 'staff_terminal', pos: [-2.68, 1.05, 0.98],  size: [0.95, 0.85, 0.95], kind: 'clue' },
    { id: 'radio_console',  pos: [-4.40, 1.25, 12.60], size: [0.95, 0.85, 0.80], kind: 'clue' },
    { id: 'sound_console',  pos: [-9.25, 1.25, 12.60], size: [0.95, 0.85, 0.80], kind: 'clue' },
    { id: 'monitor_bank',   pos: [2.90, 1.38, 0.35],   size: [0.75, 1.10, 1.35], kind: 'decor' },

    // 6 Search Props distributed across ALL rooms (5B, 5C, 5D, 5E, 5F)
    { id: 'relay_rack',     pos: [-12.25, 1.10, 18.45], size: [2.10, 2.20, 0.95], kind: 'fragment' },
    { id: 'tape_deck_cart', pos: [-3.15, 1.25, 12.60],  size: [0.95, 0.85, 0.80], kind: 'fragment' },
    { id: 'operator_chair', pos: [-2.79, 0.55, 0.27],   size: [0.80, 1.00, 0.80], kind: 'fragment' },
    { id: 'cable_trench',   pos: [-10.42, 0.28, 10.80], size: [0.85, 0.65, 0.95], kind: 'fragment' },
    { id: 'wall_clipboard', pos: [-2.33, 1.30, 1.66],   size: [0.85, 0.65, 0.28], kind: 'fragment' },
    { id: 'fuse_box',       pos: [3.08, 2.05, -0.48],   size: [0.45, 0.80, 0.85], kind: 'fragment' },

    // Environmental Props & Interactive Lore across 5B, 5C, 5D, Chamber 3, 5E & 5F
    { id: 'annex_incident_file',  pos: [-3.85, 1.18, 12.50], size: [0.55, 0.35, 0.55], kind: 'fragment' },
    { id: 'guard_watch_ledger',   pos: [-2.85, 0.75, 6.45],  size: [0.75, 1.05, 0.75], kind: 'fragment' },
    { id: 'containment_protocol', pos: [-10.25, 0.92, 9.40], size: [0.60, 0.35, 0.50], kind: 'fragment' },
    { id: 'chamber3_autopsy',     pos: [-13.10, 1.22, 12.55],size: [0.95, 0.75, 0.75], kind: 'fragment' },
    { id: 'containment_key',      pos: [-3.95, 1.05, 17.85], size: [0.65, 0.65, 0.65], kind: 'fragment' },
    { id: 'autopsy_gurney',       pos: [-2.95, 0.65, 17.45], size: [1.45, 1.05, 2.15], kind: 'decor' },
    { id: 'scalpel_prop',         pos: [-13.62, 0.85, 8.75], size: [0.65, 0.75, 0.65], kind: 'decor' },
    { id: 'annex_locker',         pos: [-5.75, 1.10, 5.92],  size: [1.35, 2.05, 0.65], kind: 'decor' },
    { id: 'aux_generator',        pos: [-9.25, 1.10, 18.45], size: [1.55, 2.05, 0.95], kind: 'decor' },
    { id: 'ringing_phone',        pos: [2.62, 1.02, 0.96],   size: [0.75, 0.70, 0.80], kind: 'decor' },

    { id: 'dead_intercom',   pos: [0.17, 1.35, 1.65],   size: [0.45, 0.65, 0.35], kind: 'decor' },
    { id: 'wall_breaker',    pos: [0.18, 1.15, 1.96],   size: [0.40, 0.45, 0.25], kind: 'decor' },
    { id: 'crowbar_prop',    pos: [-2.49, 0.88, 0.95],  size: [0.45, 0.25, 0.95], kind: 'decor' },
    { id: 'sofa_alcove',     pos: [-1.45, 0.55, -1.25], size: [2.10, 1.05, 0.95], kind: 'decor' },
    { id: 'security_camera', pos: [2.75, 2.68, 8.25],   size: [0.55, 0.55, 0.55], kind: 'decor' },
    { id: 'wooden_crates',   pos: [5.55, 0.75, 9.80],   size: [1.55, 1.50, 1.45], kind: 'decor' },
    { id: 'caution_pit',     pos: [0.90, 0.20, 6.75],   size: [2.40, 0.45, 1.85], kind: 'decor' },

    // Doors across all 6 rooms + inter-wing escape loops
    { id: 'control_door',        pos: [1.02, 1.12, 1.80],     size: [1.18, 2.25, 0.72], kind: 'door' },
    { id: 'annex_door',          pos: [-1.61, 1.12, 9.40],    size: [0.75, 2.25, 1.18], kind: 'door' },
    { id: 'south_wing_door',     pos: [-3.95, 1.15, 5.50],    size: [1.18, 2.30, 0.75], kind: 'door' },
    { id: 'observation_door',    pos: [-7.85, 1.15, 7.84],    size: [0.75, 2.30, 1.18], kind: 'door' },
    { id: 'chamber3_door',       pos: [-10.97, 1.15, 7.84],   size: [0.75, 2.30, 1.18], kind: 'door' },
    { id: 'chamber3_north_door', pos: [-11.75, 1.15, 13.30],  size: [1.18, 2.30, 0.75], kind: 'door' },
    { id: 'cryo_door',           pos: [-5.51, 1.15, 13.30],   size: [1.18, 2.30, 0.75], kind: 'door' },
    { id: 'generator_door',      pos: [-10.19, 1.15, 13.30],  size: [1.18, 2.30, 0.75], kind: 'door' },
    { id: 'morgue_vault_door',   pos: [-7.85, 1.15, 17.20],   size: [0.75, 2.30, 1.18], kind: 'door' },
    { id: 'entry_door',          pos: [-4.50, 1.10, -1.98],   size: [1.15, 2.20, 0.45], kind: 'door' },
    { id: 'vault_door',          pos: [4.13, 1.10, 7.98],     size: [1.20, 2.25, 0.60], kind: 'door' },
  ];

  const hotspotProxies = {};
  const fragmentMarkers = {};
  const devItems = [];

  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  hotspotSpecs.forEach((spec) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...spec.size), proxyMat);
    mesh.position.set(...spec.pos);
    mesh.userData.id = spec.id;
    mesh.userData.ns = 1;
    interact(mesh, spec.id);
    add(mesh, { noShadow: true });
    hotspotProxies[spec.id] = mesh;

    devItems.push({
      id: `hotspot:${spec.id}`,
      label: `Hotspot — ${spec.id}`,
      object3D: mesh,
      basePos: [...spec.pos],
      baseRotY: 0,
      baseScale: 1,
    });
  });

  E.setFragmentCleared = (id) => {
    const mk = fragmentMarkers[id];
    if (mk) {
      mk.cleared = true;
      if (mk.ring) mk.ring.visible = false;
    }
  };

  // Secondary monitor_bank proxy for retro_tvs cluster on South Wall of Control Bay
  const retroTvProxy = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.90, 1.05), proxyMat);
  retroTvProxy.position.set(0.28, 0.45, -1.28);
  retroTvProxy.userData.id = 'monitor_bank';
  retroTvProxy.userData.ns = 1;
  interact(retroTvProxy, 'monitor_bank');
  add(retroTvProxy, { noShadow: true });

  // ── 4. Shared CRT Phosphor Materials (2 shared CanvasTextures instead of 17!) ─
  const sharedScreenTex = {};
  const sharedScreenMat = {};
  const makeScreenMat = (isOn, hasStatic, idx) => {
    const key = !isOn ? 'off' : (hasStatic ? 'static' : 'clean');
    if (!sharedScreenMat[key]) {
      if (!sharedScreenTex[key]) {
        const canvas = XC.phosphorScreen(isOn, hasStatic);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        sharedScreenTex[key] = tex;
      }
      const tex = sharedScreenTex[key];
      sharedScreenMat[key] = new THREE.MeshStandardMaterial({
        map: tex,
        emissive: isOn ? new THREE.Color(0x1f6e33) : new THREE.Color(0x000000),
        emissiveMap: isOn ? tex : null,
        emissiveIntensity: isOn ? (hasStatic ? 0.75 : 1.05) : 0,
        roughness: 0.18,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
    }
    const mat = sharedScreenMat[key];
    monitorScreens.push({ mat, state: { on: isOn, static: hasStatic }, idx, tex: sharedScreenTex[key] });
    return mat;
  };

  // ── 5. Door Hinges, Toggle Helpers & GLB Asset Pipeline ─────────────────────
  let controlDoorHinge = null;
  let annexDoorHinge = null;
  let southWingDoorHinge = null;
  let observationDoorHinge = null;
  let chamber3DoorHinge = null;
  let chamber3NorthDoorHinge = null;
  let cryoDoorHinge = null;
  let generatorDoorHinge = null;
  let morgueVaultDoorHinge = null;
  let entryDoorHinge = null;
  let vaultDoorHinge = null;
  let keyPropGroup = null;
  let akaiReelsNode = null;
  let ghostData = null;
  let isControlDoorOpen = false;
  const wingDoorStates = {
    annex_door: false,
    south_wing_door: false,
    observation_door: false,
    chamber3_door: false,
    chamber3_north_door: false,
    cryo_door: false,
    generator_door: false,
    morgue_vault_door: false,
  };
  let isBreakerOn = true;
  let rattleTimer = { id: null, t: 0 };
  let loadedCount = 0;
  const totalModels = 6;
  E._wingDoorStates = wingDoorStates;
  E._isControlDoorOpen = () => isControlDoorOpen;

  const reportLoaded = (label) => {
    loadedCount += 1;
    const pct = Math.min(100, Math.round((loadedCount / totalModels) * 100));
    handlers?.onLoadProgress?.(pct, label);
    if (loadedCount >= totalModels) {
      E.bakeShadows?.();
    }
  };

  E.toggleBreakerLight = () => {
    isBreakerOn = !isBreakerOn;
    controlOverhead.intensity = isBreakerOn ? 1.85 : 0.55;
    annexLight.intensity = isBreakerOn ? 2.05 : 0.55;
    obsLight.intensity = isBreakerOn ? 1.95 : 0.55;
    cryoLight.intensity = isBreakerOn ? 1.95 : 0.55;
    genLight.intensity = isBreakerOn ? 2.05 : 0.65;
    return isBreakerOn;
  };

  E.pickupContainmentKey = () => {
    if (keyPropGroup) keyPropGroup.visible = false;
    lockedTransomMat.color.setHex(0xf29442);
    lockedTransomMat.emissive.setHex(0xe87b2e);
  };

  E.rattleDoor = (doorId) => {
    rattleTimer = { id: doorId, t: 0.32 };
  };

  E.toggleControlDoor = () => {
    isControlDoorOpen = !isControlDoorOpen;
    if (controlDoorHinge) {
      controlDoorHinge.isOpen = isControlDoorOpen;
    }
    if (isControlDoorOpen) {
      if (controlDoorSolid) {
        removeSolid(controlDoorSolid);
        controlDoorSolid = null;
      }
    } else if (!controlDoorSolid) {
      controlDoorSolid = solid(0.46, 1.58, 1.66, 1.96);
    }
    return isControlDoorOpen;
  };

  E.toggleWingDoor = (doorId) => {
    if (!(doorId in wingDoorStates)) return false;
    const next = !wingDoorStates[doorId];
    wingDoorStates[doorId] = next;
    const hingeMap = {
      annex_door: annexDoorHinge,
      south_wing_door: southWingDoorHinge,
      observation_door: observationDoorHinge,
      chamber3_door: chamber3DoorHinge,
      chamber3_north_door: chamber3NorthDoorHinge,
      cryo_door: cryoDoorHinge,
      generator_door: generatorDoorHinge,
      morgue_vault_door: morgueVaultDoorHinge,
    };
    const hinge = hingeMap[doorId];
    if (hinge) hinge.isOpen = next;
    if (next) {
      if (wingDoorSolids[doorId]) {
        removeSolid(wingDoorSolids[doorId]);
        wingDoorSolids[doorId] = null;
      }
    } else if (!wingDoorSolids[doorId]) {
      wingDoorSolids[doorId] = solid(...wingDoorSpecs[doorId]);
    }
    return next;
  };

  // (a) Main Facility Shell: control_room.glb
  E.loadGLB(`${MODEL_BASE}/control_room.glb`)
    .then((gltf) => {
      const envRoot = gltf.scene;
      envRoot.position.copy(ROOM_OFFSET);
      envRoot.updateMatrixWorld(true);

      const controlDoorMeshes = [];
      const annexDoorMeshes = [];
      const entryDoorMeshes = [];
      const vaultDoorMeshes = [];
      const visualGroups = {
        ringing_phone: [],
        monitor_bank: [],
        operator_chair: [],
        cable_trench: [],
        wall_clipboard: [],
        fuse_box: [],
        dead_intercom: [],
        wall_breaker: [],
        crowbar_prop: [],
        sofa_alcove: [],
        security_camera: [],
        wooden_crates: [],
        caution_pit: [],
        entry_door: [],
        vault_door: [],
        control_door: [],
        annex_door: [],
      };

      let screenIdx = 0;
      const gradedMatCache = new WeakMap();
      const tintColor = new THREE.Color(0x282d2b);
      const getGradedMat = (srcMat) => {
        if (!srcMat) return srcMat;
        if (gradedMatCache.has(srcMat)) return gradedMatCache.get(srcMat);
        const m = srcMat.clone();
        if (m.color) {
          m.color.multiplyScalar(0.52);
          m.color.lerp(tintColor, 0.24);
        }
        m.roughness = Math.max(m.roughness ?? 0.65, 0.86);
        if (typeof m.metalness === 'number') m.metalness = Math.min(m.metalness, 0.22);
        if ('envMapIntensity' in m) m.envMapIntensity = 0.0;
        if (/SelfIlum|Emision/i.test(m.name || '')) {
          m.emissive = new THREE.Color(0x8c7b5c);
          m.emissiveIntensity = 0.36;
        }
        m.needsUpdate = true;
        gradedMatCache.set(srcMat, m);
        return m;
      };

      envRoot.traverse((o) => {
        if (!o.isMesh) return;
        o.userData.np = 1;
        o.castShadow = false;
        o.receiveShadow = false;

        const name = o.name;

        // Clear crates/planks blocking annex_door AND open Anteroom West Partition for south_wing_door loop into 5C
        if (/^(WoodCrate_IS8_TXT|WoodCrate_1_IS8_TXT|WoodCrate_2_IS8_TXT|WoodCrate_3_IS8_TXT|Office_Cage_IS8_TXT|Office_Pallet_IS8_TXT|WoodPlank_B_P1_01|IS4_P1_Antesala_Pared_4|Office_GreenBench_1)/i.test(name)) {
          o.visible = false;
          return;
        }

        // Collect hinged door meshes
        if (/IS4_P1_PuertaControl(_4_|__1__|_P1_02)|ControlRoom_DoorLatch|EngineRoom_Door_Hitch/i.test(name)) {
          controlDoorMeshes.push(o);
          visualGroups.control_door.push(o);
        } else if (/IS4_P1_PuertaControl_2_/i.test(name)) {
          annexDoorMeshes.push(o);
          visualGroups.annex_door.push(o);
        } else if (/P1_Puerta_Granate__2__|IS4_P1_PuertaControl_3_/i.test(name)) {
          vaultDoorMeshes.push(o);
          visualGroups.vault_door.push(o);
        } else if (/P1_Puerta_Granate_P1|IS4_P1_PuertaControl_1_/i.test(name)) {
          entryDoorMeshes.push(o);
          visualGroups.entry_door.push(o);
        }

        // Map visual highlights (Control Room phone -> ringing_phone, leaving radio/sound/relay for deep rooms!)
        if (/Telephone/i.test(name)) visualGroups.ringing_phone.push(o);
        if (/MonitorT|Screen_/i.test(name)) visualGroups.monitor_bank.push(o);
        if (/OfficeChair/i.test(name)) visualGroups.operator_chair.push(o);
        if (/CubicleBoard/i.test(name)) visualGroups.wall_clipboard.push(o);
        if (/CajaFusibles/i.test(name)) visualGroups.fuse_box.push(o);
        if (/SalaControl_Interruptor/i.test(name)) visualGroups.dead_intercom.push(o);
        if (/Interruptor01__2__/i.test(name)) visualGroups.wall_breaker.push(o);
        if (/Item_Crowbar/i.test(name)) visualGroups.crowbar_prop.push(o);
        if (/SalaControl_Sofa/i.test(name)) visualGroups.sofa_alcove.push(o);
        if (/Office_Camera/i.test(name)) visualGroups.security_camera.push(o);
        if (/WoodCrate_[4567]/i.test(name)) visualGroups.wooden_crates.push(o);
        if (/P1_Hole|WoodPlank/i.test(name)) visualGroups.caution_pit.push(o);

        // Apply cached graded material (reduces ~300 material clones to ~12 shared instances!)
        if (!/Screen_[ABCD]_Glass|MonitorT\d_Pantalla/i.test(name) && o.material) {
          o.material = Array.isArray(o.material)
            ? o.material.map(getGradedMat)
            : getGradedMat(o.material);
        }

        // Replace CRT monitor faces with live phosphor/static CanvasTextures
        if (/Screen_[ABCD]_Glass|MonitorT\d_Pantalla/i.test(name)) {
          const isStatic = screenIdx % 2 === 0;
          const isOn = screenIdx !== 2 && screenIdx !== 7;
          o.material = makeScreenMat(isOn, isStatic, screenIdx);
          screenIdx += 1;
        }
      });

      S.add(envRoot);

      if (controlDoorMeshes.length) {
        controlDoorHinge = createHingedDoor(S, controlDoorMeshes, new THREE.Vector3(0.58, 0, 1.78), -Math.PI * 0.52);
      }
      if (annexDoorMeshes.length) {
        annexDoorHinge = createHingedDoor(S, annexDoorMeshes, new THREE.Vector3(-1.61, 0, 8.96), -Math.PI * 0.52);
      }
      if (entryDoorMeshes.length) {
        entryDoorHinge = createHingedDoor(S, entryDoorMeshes, new THREE.Vector3(-5.00, 0, -2.01), Math.PI * 0.45);
      }
      if (vaultDoorMeshes.length) {
        vaultDoorHinge = createHingedDoor(S, vaultDoorMeshes, new THREE.Vector3(3.58, 0, 7.98), -Math.PI * 0.52);
        ref.bulkheadDoor = vaultDoorHinge;
        ref.roomDoor = vaultDoorHinge;
      }

      Object.entries(visualGroups).forEach(([id, list]) => {
        if (list.length) visualInteract(list, id);
      });

      reportLoaded('Bunker Structure');
    })
    .catch((err) => {
      console.error('[ROOM5] Failed to load control_room.glb:', err);
      reportLoaded('Bunker Structure');
    });

  // (b) Expanded Multi-Room Wings: horror_kit.glb (Rooms 5C, 5D, Chamber 3 + North Rooms 5E & 5F)
  E.loadGLB(`${MODEL_BASE}/horror_kit.glb`)
    .then((gltf) => {
      const kit = gltf.scene;
      const wingGroup = new THREE.Group();
      // 4mm above y=0 parquet keeps thresholds flush while preventing Screenshot z-fighting
      wingGroup.position.y = 0.004;
      const placedCells = new Set();

      const placeArch = (pieceName, c, r, rotY = 0) => {
        const obj = cloneKitPiece(kit, pieceName, { position: [colX(c), 0, rowZ(r)], rotY });
        if (!obj) return null;
        wingGroup.add(obj);
        placedCells.add(`${c},${r}`);
        return obj;
      };

      const bunkerMat = new THREE.MeshStandardMaterial({
        color: 0x262e2a,
        roughness: 0.90,
        metalness: 0.08,
      });

      // Flanking concrete wall panels along Z = 5.46 around south_wing_door (replacing hidden Pared_4)
      [[-5.02, 1.24], [-2.50, 1.94]].forEach(([fx, fw]) => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(fw, 3.04, 0.14), bunkerMat);
        panel.position.set(fx, 1.52, 5.46);
        wingGroup.add(panel);
      });

      // Continuous solid concrete subfloor beneath 5C / 5D / Chamber 3 / 5E / 5F + iron sill at Anteroom threshold
      const subFloor = new THREE.Mesh(new THREE.BoxGeometry(TILE * 8.05, 0.04, TILE * 9.05), bunkerMat);
      subFloor.position.set(colX(3.5), -0.04, rowZ(4));
      wingGroup.add(subFloor);

      const sillMat = new THREE.MeshStandardMaterial({ color: 0x2e3330, roughness: 0.65, metalness: 0.55 });
      const sillPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.016, 1.24), sillMat);
      sillPlate.position.set(-1.61, 0.008, 9.40);
      S.add(sillPlate);

      // Clean walk-planks bridging the Anteroom P1_Hole pit (replaces the removed floating door-board mesh)
      const plankMat = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.9 });
      [-0.35, 0.05, 0.45].forEach((dz, idx) => {
        const pl = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.035, 0.22), plankMat);
        pl.position.set(0.92, 0.02, 6.72 + dz);
        pl.rotation.y = (idx - 1) * 0.04;
        pl.userData.np = 1;
        S.add(pl);
      });

      // East Perimeter (col 0, X = -1.61, r = 0..8)
      placeArch('Wal_Corner005', 0, 0, 0);                  // SE corner
      placeArch('Wall_02037', 0, 1, -Math.PI / 2);          // East wall
      placeArch('Wall_01_Door_Hole002', 0, 2, -Math.PI / 2);// Aligned flush onto annex_door (Z=9.40)
      placeArch('Wall_02037', 0, 3, -Math.PI / 2);          // East wall
      placeArch('Wall_02037', 0, 4, -Math.PI / 2);
      placeArch('Wall_02037', 0, 5, -Math.PI / 2);
      placeArch('Wall_02037', 0, 6, -Math.PI / 2);
      placeArch('Wall_02037', 0, 7, -Math.PI / 2);
      placeArch('Wal_Corner005', 0, 8, -Math.PI / 2);      // Far NE corner (Z = 19.54)

      // West Perimeter (col 7, X = -14.09, r = 0..8)
      placeArch('Wal_Corner005', 7, 0, Math.PI / 2);        // SW corner
      for (let r = 1; r <= 7; r++) {
        placeArch('Wall_02037', 7, r, Math.PI / 2);
      }
      placeArch('Wal_Corner005', 7, 8, Math.PI);            // Far NW corner (Z = 19.54)

      // South (Z=5.50, r=0: south_wing_door at col 1, solid walls elsewhere) & Far North (Z=19.54, r=8)
      placeArch('Wall_01_Door_Hole002', 1, 0, 0); // south_wing_door (5A West Hall <-> 5C Loop, X = -3.95, Z = 5.50)
      placeArch('Wall_02037', 1, 8, Math.PI);
      for (let c = 2; c <= 6; c++) {
        placeArch('Wall_02037', c, 0, 0);        // South wall (Z = 5.50)
        placeArch('Wall_02037', c, 8, Math.PI);  // Far North wall (Z = 19.54)
      }

      // Dividing wall along Z = 13.30 (placed on r = 5 South edge, rotY = 0) connecting 5C->5E & 5D->5F!
      placeArch('Wall_Window002', 1, 5, 0);        // Observation pane into Cryo Suite 5E
      placeArch('Wall_01_Door_Hole002', 2, 5, 0); // cryo_door (X = -5.51, Z = 13.30)
      placeArch('Wall_02037', 3, 5, 0);
      placeArch('Wall_02037', 4, 5, 0);
      placeArch('Wall_01_Door_Hole002', 5, 5, 0); // generator_door (X = -10.19, Z = 13.30)
      placeArch('Wall_01_Door_Hole002', 6, 5, 0); // chamber3_north_door (Chamber 3 <-> 5F loop, X = -11.75, Z = 13.30)
      // Close the narrow east/west end wall segments on Z=13.30 inside cols 0 & 7 without duplicating FloorTile
      [colX(0), colX(7)].forEach((endX) => {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(TILE, 3.12, 0.16), bunkerMat);
        cap.position.set(endX, 1.56, 13.30);
        wingGroup.add(cap);
      });

      // Partition along X = -7.85 (5C <-> 5D & 5E <-> 5F): doors + observation windows
      placeArch('Wall_01_Door_Hole002', 4, 1, -Math.PI / 2); // observation_door doorway (Z=7.84)
      placeArch('Wall_Window002', 4, 2, -Math.PI / 2);       // Observation window 1
      placeArch('Wall_Window002', 4, 3, -Math.PI / 2);       // Observation window 2
      placeArch('Wall_Window002', 4, 6, -Math.PI / 2);       // 5E <-> 5F Observation window
      placeArch('Wall_01_Door_Hole002', 4, 7, -Math.PI / 2); // morgue_vault_door (5E <-> 5F loop doorway, Z = 17.20)

      // Partition along X = -10.97 (5D <-> Enterable Chamber 3): openable doorway + stained containment glass!
      placeArch('Wall_01_Door_Hole002', 6, 1, -Math.PI / 2); // chamber3_door doorway (Z=7.84)
      placeArch('Wall_Window_Colored003', 6, 2, -Math.PI / 2);
      placeArch('Wall_Window_Colored003', 6, 3, -Math.PI / 2);

      // Matte partition end panels on rows where corners/doors occupy the cell
      [
        [-7.85, 0], [-7.85, 4], [-7.85, 5], [-7.85, 8],
        [-10.97, 0], [-10.97, 4],
      ].forEach(([pxPos, rIdx]) => {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.12, TILE + 0.02), bunkerMat);
        seg.position.set(pxPos, 1.56, rowZ(rIdx));
        wingGroup.add(seg);
      });

      // Fill every remaining grid cell once cleanly with FloorTile (ZERO overlapping floors)
      for (let c = 0; c <= 7; c++) {
        for (let r = 0; r <= 8; r++) {
          if (!placedCells.has(`${c},${r}`)) {
            placeArch('FloorTile', c, r, 0);
          }
        }
      }

      // Full contiguous concrete ceiling across 5C + 5D + Chamber 3 + 5E + 5F
      const ceilMesh = new THREE.Mesh(new THREE.PlaneGeometry(TILE * 8.04, TILE * 9.04), bunkerMat);
      ceilMesh.rotation.x = Math.PI / 2;
      ceilMesh.position.set(colX(3.5), 3.10, rowZ(4));
      wingGroup.add(ceilMesh);

      // Illuminated transom bars across all outer-wing connecting doorways (amber = unlocked, red = Brass-Key locked)
      addDoorwayTransom(wingGroup, colX(1), 5.50, 0, false);                // south_wing_door
      addDoorwayTransom(wingGroup, -7.85, 7.84, Math.PI / 2, false);         // observation_door
      addDoorwayTransom(wingGroup, -10.97, 7.84, Math.PI / 2, true);         // chamber3_door
      addDoorwayTransom(wingGroup, colX(6), 13.30, 0, true);                 // chamber3_north_door
      addDoorwayTransom(wingGroup, colX(2), 13.30, 0, false);                // cryo_door
      addDoorwayTransom(wingGroup, colX(5), 13.30, 0, false);                // generator_door
      addDoorwayTransom(wingGroup, -7.85, rowZ(7), Math.PI / 2, false);      // morgue_vault_door

      // Helper to build hinged wooden horror_kit Door preserving original wood-grain texture untouched
      const makeEWLeafDoor = (doorId, xPos, centerZ = 7.84) => {
        const doorLeaf = cloneKitPiece(kit, 'Door', { position: [0.48, 0, 0] });
        if (!doorLeaf) return null;
        const hingeWrap = new THREE.Group();
        hingeWrap.position.set(xPos, 0, centerZ - 0.48);
        hingeWrap.rotation.y = -Math.PI / 2;
        hingeWrap.add(doorLeaf);
        markNoMerge(hingeWrap);
        wingGroup.add(hingeWrap);
        hingeWrap.isOpen = false;
        hingeWrap.userData.closedAngle = -Math.PI / 2;
        hingeWrap.userData.openAngle = 0.12;
        hingeWrap.userData.currentAngle = -Math.PI / 2;
        visualInteract(doorLeaf, doorId);
        return hingeWrap;
      };
      const makeNSLeafDoor = (doorId, centerX, zPos) => {
        const doorLeaf = cloneKitPiece(kit, 'Door', { position: [0.48, 0, 0] });
        if (!doorLeaf) return null;
        const hingeWrap = new THREE.Group();
        hingeWrap.position.set(centerX - 0.48, 0, zPos);
        hingeWrap.rotation.y = 0;
        hingeWrap.add(doorLeaf);
        markNoMerge(hingeWrap);
        wingGroup.add(hingeWrap);
        hingeWrap.isOpen = false;
        hingeWrap.userData.closedAngle = 0;
        hingeWrap.userData.openAngle = -Math.PI * 0.52;
        hingeWrap.userData.currentAngle = 0;
        visualInteract(doorLeaf, doorId);
        return hingeWrap;
      };
      southWingDoorHinge = makeNSLeafDoor('south_wing_door', colX(1), 5.50);
      observationDoorHinge = makeEWLeafDoor('observation_door', -7.85, 7.84);
      chamber3DoorHinge = makeEWLeafDoor('chamber3_door', -10.97, 7.84);
      chamber3NorthDoorHinge = makeNSLeafDoor('chamber3_north_door', colX(6), 13.30);
      cryoDoorHinge = makeNSLeafDoor('cryo_door', colX(2), 13.30);
      generatorDoorHinge = makeNSLeafDoor('generator_door', colX(5), 13.30);
      morgueVaultDoorHinge = makeEWLeafDoor('morgue_vault_door', -7.85, rowZ(7));

      // Furnishings — Enlarged Room 5C (Security Locker & Radio Wing, south-west wall so south_wing_door stays open)
      [-5.75, -6.95].forEach((x) => {
        const lk = cloneKitPiece(kit, 'Metal_Cabinet001', { position: [x, 0, 5.92], rotY: 0 });
        if (lk) {
          wingGroup.add(lk);
          if (x === -5.75) {
            markNoMerge(lk);
            visualInteract(lk, 'annex_locker');
          }
        }
      });

      const northCabShort = cloneKitPiece(kit, 'CabinetShort', { position: [-4.40, 0, 12.60], rotY: Math.PI });
      if (northCabShort) wingGroup.add(northCabShort);
      const radioCabShort = cloneKitPiece(kit, 'CabinetShort', { position: [-3.15, 0, 12.60], rotY: Math.PI });
      if (radioCabShort) wingGroup.add(radioCabShort);

      // Shared industrial PBR materials & procedural CRT/dial faces
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1b1f1e, roughness: 0.56, metalness: 0.58 });
      const gunmetalMat = new THREE.MeshStandardMaterial({ color: 0x2a2f2d, roughness: 0.45, metalness: 0.68 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0x9aa09b, roughness: 0.28, metalness: 0.85 });
      const oakTopMat = new THREE.MeshStandardMaterial({ color: 0x3a2b20, roughness: 0.78, metalness: 0.08 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0x9c793e, roughness: 0.36, metalness: 0.78 });
      const dangerRedMat = new THREE.MeshStandardMaterial({ color: 0x8f1e1e, roughness: 0.42, metalness: 0.25 });

      const radioTex = createInstrumentFaceTexture('radio');
      const scopeTex = createInstrumentFaceTexture('scope');
      const gaugeTex = createInstrumentFaceTexture('gauge');
      const radioScreenMat = new THREE.MeshStandardMaterial({
        map: radioTex,
        emissive: new THREE.Color(0xc8822a),
        emissiveMap: radioTex,
        emissiveIntensity: 0.95,
        roughness: 0.22,
        metalness: 0.1,
      });
      const scopeScreenMat = new THREE.MeshStandardMaterial({
        map: scopeTex,
        emissive: new THREE.Color(0xd28538),
        emissiveMap: scopeTex,
        emissiveIntensity: 1.05,
        roughness: 0.18,
        metalness: 0.12,
      });
      const gaugeScreenMat = new THREE.MeshStandardMaterial({
        map: gaugeTex,
        emissive: new THREE.Color(0x886234),
        emissiveMap: gaugeTex,
        emissiveIntensity: 0.65,
        roughness: 0.25,
        metalness: 0.2,
      });
      const rubberFootGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.024, 8);
      const knobGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.026, 12);

      // Symmetrical floor-anchored steel & oak lab workbench (exact tabletop Y = 0.780m — zero floating props!)
      const makeMorgueWorktable = (tx, tz, rotY = 0) => {
        const tg = new THREE.Group();
        [[-0.48, -0.39], [0.48, -0.39], [-0.48, 0.39], [0.48, 0.39]].forEach(([lx, lz]) => {
          const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.02, 10), chassisMat);
          pad.position.set(lx, 0.01, lz);
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.73, 0.048), gunmetalMat);
          leg.position.set(lx, 0.375, lz);
          tg.add(pad, leg);
        });
        const apronF = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.055, 0.03), gunmetalMat);
        apronF.position.set(0, 0.71, -0.38);
        const apronB = apronF.clone();
        apronB.position.set(0, 0.71, 0.38);
        const lowerShelf = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.024, 0.74), chassisMat);
        lowerShelf.position.set(0, 0.22, 0);
        const trimRim = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.048, 0.90), gunmetalMat);
        trimRim.position.set(0, 0.752, 0);
        const topSlab = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.038, 0.86), oakTopMat);
        topSlab.position.set(0, 0.761, 0); // top surface exactly Y = 0.780m
        tg.add(apronF, apronB, lowerShelf, trimRim, topSlab);
        tg.position.set(tx, 0, tz);
        tg.rotation.y = rotY;
        tg.traverse((o) => { if (o.isMesh) o.userData.np = 1; });
        wingGroup.add(tg);
        return tg;
      };

      // Dedicated Multi-Part Cold-War Field Transceiver (`radio_console` R2-05 in Room 5C)
      const radioUnit = new THREE.Group();
      [[-0.32, -0.18], [0.32, -0.18], [-0.32, 0.18], [0.32, 0.18]].forEach(([fx, fz]) => {
        const ft = new THREE.Mesh(rubberFootGeo, chassisMat);
        ft.position.set(fx, 0.012, fz);
        radioUnit.add(ft);
      });
      const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.32, 0.46), chassisMat);
      rBody.position.set(0, 0.184, 0);
      const rHood = new THREE.Mesh(new THREE.BoxGeometry(0.79, 0.035, 0.49), gunmetalMat);
      rHood.position.set(0, 0.352, 0);
      const rDialBezel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.03), gunmetalMat);
      rDialBezel.position.set(-0.11, 0.22, -0.225);
      const rDialFace = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.125), radioScreenMat);
      rDialFace.position.set(-0.11, 0.22, -0.242);
      rDialFace.rotation.y = Math.PI;
      const rSpeakerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.21, 0.022), gunmetalMat);
      rSpeakerPlate.position.set(0.23, 0.20, -0.226);
      for (let s = 0; s < 5; s++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.014), chromeMat);
        slat.position.set(0.23, 0.14 + s * 0.028, -0.238);
        radioUnit.add(slat);
      }
      [-0.24, -0.11, 0.03].forEach((kx) => {
        const k = new THREE.Mesh(knobGeo, chromeMat);
        k.rotation.x = Math.PI / 2;
        k.position.set(kx, 0.095, -0.242);
        radioUnit.add(k);
      });
      [-0.395, 0.395].forEach((hx) => {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.16), chromeMat);
        handle.position.set(hx, 0.19, 0);
        radioUnit.add(handle);
      });
      const rAntBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.05, 8), brassMat);
      rAntBase.position.set(0.31, 0.39, 0.14);
      const rAntMast = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.01, 0.44, 8), chromeMat);
      rAntMast.position.set(0.31, 0.62, 0.14);
      radioUnit.add(rBody, rHood, rDialBezel, rDialFace, rSpeakerPlate, rAntBase, rAntMast);
      radioUnit.position.set(-4.40, 1.078, 12.60);
      markNoMerge(radioUnit);
      wingGroup.add(radioUnit);
      visualInteract(radioUnit, 'radio_console');

      const nwTallCab = cloneKitPiece(kit, 'Cabinet002', { position: [-6.45, 0, 12.68], rotY: 0 });
      if (nwTallCab) wingGroup.add(nwTallCab);

      const c1 = cloneKitPiece(kit, 'Wood_Box008', { position: [-2.15, 0, 6.20], rotY: 0.28 });
      const c2 = cloneKitPiece(kit, 'CarboardBox', { position: [-2.20, 0, 12.55], rotY: -0.45 });
      if (c1) wingGroup.add(c1);
      if (c2) wingGroup.add(c2);

      // Visual physical dossier folders & props seated flush on desks/crates
      const paperMat = new THREE.MeshStandardMaterial({ color: 0xd2be96, roughness: 0.85 });
      const stampMat = new THREE.MeshStandardMaterial({ color: 0x8b1515, roughness: 0.65 });
      const makeDossierProp = (id, pos, rotY = 0) => {
        const g = new THREE.Group();
        const folder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.024, 0.42), paperMat);
        const tab = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.008, 0.08), stampMat);
        tab.position.set(0, 0.014, 0.04);
        g.add(folder, tab);
        g.position.set(...pos);
        g.rotation.y = rotY;
        markNoMerge(g);
        wingGroup.add(g);
        visualInteract(g, id);
      };

      // File 17-B flush on Room 5C CabinetShort (maxY = 1.078)
      makeDossierProp('annex_incident_file', [-3.85, 1.09, 12.48], -0.25);

      // Guard Watch Ledger flush atop South Locker crate (Wood_Box008 maxY = 0.387)
      const gCrate = cloneKitPiece(kit, 'Wood_Box008', { position: [-2.85, 0, 6.45], rotY: 0.15 });
      if (gCrate) wingGroup.add(gCrate);
      makeDossierProp('guard_watch_ledger', [-2.88, 0.399, 6.46], 0.12);

      // Room 5D Observation Gallery & Relocated Acoustic Sound Console (`sound_console` R2-06!)
      const obsDeskCrate = cloneKitPiece(kit, 'Wood_Box008', { position: [-9.20, 0, 6.10], rotY: 0.05 });
      if (obsDeskCrate) wingGroup.add(obsDeskCrate);
      makeMorgueWorktable(-10.25, 9.40, Math.PI / 2);
      makeDossierProp('containment_protocol', [-10.25, 0.792, 9.40], -0.18);

      const obsCabShort = cloneKitPiece(kit, 'CabinetShort', { position: [-9.25, 0, 12.60], rotY: Math.PI });
      if (obsCabShort) wingGroup.add(obsCabShort);

      // Multi-Part Acoustic Oscilloscope & Spectrum Desk (`sound_console` R2-06)
      const soundUnit = new THREE.Group();
      [[-0.31, -0.17], [0.31, -0.17], [-0.31, 0.17], [0.31, 0.17]].forEach(([fx, fz]) => {
        const ft = new THREE.Mesh(rubberFootGeo, chassisMat);
        ft.position.set(fx, 0.012, fz);
        soundUnit.add(ft);
      });
      const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.36, 0.44), chassisMat);
      sBody.position.set(0, 0.204, 0);
      const sTopVent = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.025, 0.38), gunmetalMat);
      sTopVent.position.set(0, 0.395, 0);
      const sCRTBezel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.036), gunmetalMat);
      sCRTBezel.position.set(-0.15, 0.22, -0.215);
      const sCRTGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.20), scopeScreenMat);
      sCRTGlass.position.set(-0.15, 0.22, -0.235);
      sCRTGlass.rotation.y = Math.PI;
      const sControlPlate = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.26, 0.024), gunmetalMat);
      sControlPlate.position.set(0.19, 0.21, -0.215);
      for (let col = 0; col < 3; col++) {
        const pot = new THREE.Mesh(knobGeo, brassMat);
        pot.rotation.x = Math.PI / 2;
        pot.position.set(0.11 + col * 0.08, 0.26, -0.232);
        soundUnit.add(pot);
        const tog = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.035, 6), chromeMat);
        tog.rotation.x = Math.PI / 2 - 0.35;
        tog.position.set(0.11 + col * 0.08, 0.14, -0.232);
        soundUnit.add(tog);
      }
      const sCable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8), chassisMat);
      sCable.rotation.z = Math.PI / 2;
      sCable.position.set(0.42, 0.022, -0.14);
      soundUnit.add(sBody, sTopVent, sCRTBezel, sCRTGlass, sControlPlate, sCable);
      soundUnit.position.set(-9.25, 1.078, 12.60);
      markNoMerge(soundUnit);
      wingGroup.add(soundUnit);
      visualInteract(soundUnit, 'sound_console');

      const hallBox = cloneKitPiece(kit, 'CarboardBox', { position: [-8.35, 0, 12.55], rotY: 0.22 });
      if (hallBox) wingGroup.add(hallBox);

      const wallFrame = cloneKitPiece(kit, 'Frame', { position: [-9.20, 1.65, 5.74], rotX: Math.PI / 2 });
      if (wallFrame) wingGroup.add(wallFrame);

      // Grounded Hard-Surface Loop 7-C Floor Conduit Manifold (`cable_trench` -> EC06) wired into West Wall
      const conduitGroup = new THREE.Group();
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x202422, roughness: 0.62, metalness: 0.65 });
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x151716, roughness: 0.52, metalness: 0.45 });
      const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.024, 0.60), gunmetalMat);
      basePlinth.position.set(0, 0.012, 0);
      [[-0.24, -0.25], [0.24, -0.25], [-0.24, 0.25], [0.24, 0.25]].forEach(([bx, bz]) => {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.018, 6), chromeMat);
        bolt.position.set(bx, 0.03, bz);
        conduitGroup.add(bolt);
      });
      const jMain = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.48), ironMat);
      jMain.position.set(0, 0.094, 0);
      const jLid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.032, 0.40), chassisMat);
      jLid.position.set(0, 0.175, 0);
      const jDial = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.026, 16), chromeMat);
      jDial.position.set(-0.07, 0.195, 0.06);
      const jDialFace = new THREE.Mesh(new THREE.CircleGeometry(0.056, 16), gaugeScreenMat);
      jDialFace.rotation.x = -Math.PI / 2;
      jDialFace.position.set(-0.07, 0.21, 0.06);
      const jBreaker = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.035, 0.09), dangerRedMat);
      jBreaker.position.set(0.11, 0.20, -0.09);
      const cable1 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.72, 10), pipeMat);
      cable1.rotation.z = Math.PI / 2;
      cable1.position.set(-0.34, 0.028, -0.09);
      const cable2 = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.72, 10), pipeMat);
      cable2.rotation.z = Math.PI / 2;
      cable2.position.set(-0.34, 0.024, 0.09);
      const wallCollar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.34), gunmetalMat);
      wallCollar.position.set(-0.54, 0.08, 0);
      conduitGroup.add(basePlinth, jMain, jLid, jDial, jDialFace, jBreaker, cable1, cable2, wallCollar);
      conduitGroup.position.set(-10.42, 0.0, 10.80);
      markNoMerge(conduitGroup);
      wingGroup.add(conduitGroup);
      visualInteract(conduitGroup, 'cable_trench');

      // Inside NOW ENTERABLE Chamber 3 Bio-Containment Cell (cols 6..7)
      const cellBench = cloneKitPiece(kit, 'CabinetShort', { position: [-13.10, 0, 12.60], rotY: 0 });
      if (cellBench) wingGroup.add(cellBench);
      makeDossierProp('chamber3_autopsy', [-13.10, 1.09, 12.55], 0.35);

      const cellCab = cloneKitPiece(kit, 'Metal_Cabinet001', { position: [-13.45, 0, 6.25], rotY: Math.PI / 2 });
      if (cellCab) wingGroup.add(cellCab);

      // NEW Room 5E (Cryo Autopsy Suite): Cold Storage Locker + Symmetrical Workbench + Brass Key on Evidence Tray
      const cryoLocker = cloneKitPiece(kit, 'Cabinet002', { position: [-6.65, 0, 18.85], rotY: Math.PI });
      if (cryoLocker) wingGroup.add(cryoLocker);
      const cryoSideBox = cloneKitPiece(kit, 'Wood_Box008', { position: [-6.65, 0, 14.50], rotY: 0.3 });
      if (cryoSideBox) wingGroup.add(cryoSideBox);
      makeMorgueWorktable(-3.95, 17.85, Math.PI / 2);
      const keyTray = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.016, 0.24), gunmetalMat);
      keyTray.position.set(-3.95, 0.788, 17.85);
      wingGroup.add(keyTray);
      const keyMesh = cloneKitPiece(kit, 'Keys', { position: [0, 0, 0], scale: 1.4 });
      if (keyMesh) {
        keyPropGroup = new THREE.Group();
        keyPropGroup.position.set(-3.95, 0.80, 17.85);
        keyPropGroup.add(keyMesh);
        markNoMerge(keyPropGroup);
        wingGroup.add(keyPropGroup);
        visualInteract(keyPropGroup, 'containment_key');
      }

      // NEW Room 5F (Generator & Relay Vault): Relocated `relay_rack` (EC01!) + Industrial Diesel Turbine (`aux_generator`)
      const rRack1 = cloneKitPiece(kit, 'Metal_Cabinet001', { position: [-11.80, 0, 18.55], rotY: Math.PI });
      const rRack2 = cloneKitPiece(kit, 'Metal_Cabinet001', { position: [-13.05, 0, 18.55], rotY: Math.PI });
      if (rRack1 && rRack2) {
        markNoMerge(rRack1);
        markNoMerge(rRack2);
        wingGroup.add(rRack1, rRack2);
        visualInteract([rRack1, rRack2], 'relay_rack');
      } else if (rRack1) {
        markNoMerge(rRack1);
        wingGroup.add(rRack1);
        visualInteract(rRack1, 'relay_rack');
      }
      const genGroup = new THREE.Group();
      const genOliveMat = new THREE.MeshStandardMaterial({ color: 0x262e29, roughness: 0.64, metalness: 0.52 });
      const skidF = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.14), gunmetalMat);
      skidF.position.set(0, 0.04, -0.32);
      const skidB = skidF.clone();
      skidB.position.set(0, 0.04, 0.32);
      const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.72, 0.58), genOliveMat);
      engineBlock.position.set(0, 0.44, 0);
      const headCap = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.08, 0.48), chromeMat);
      headCap.position.set(-0.04, 0.83, 0);
      const fuelDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.88, 16), brassMat);
      fuelDrum.rotation.z = Math.PI / 2;
      fuelDrum.position.set(-0.12, 1.04, 0.08);
      [-0.36, 0.12].forEach((sx) => {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.38), gunmetalMat);
        strap.position.set(sx, 0.96, 0.08);
        genGroup.add(strap);
      });
      [0.36, 0.48].forEach((ex) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.92, 10), ironMat);
        pipe.position.set(ex, 1.26, 0.14);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.03, 10), gunmetalMat);
        cap.position.set(ex, 1.73, 0.14);
        genGroup.add(pipe, cap);
      });
      const ctrlCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.64, 0.10), chassisMat);
      ctrlCabinet.position.set(0.32, 0.52, -0.32);
      [0.22, 0.42].forEach((gx) => {
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.026, 14), chromeMat);
        bezel.rotation.x = Math.PI / 2;
        bezel.position.set(gx, 0.68, -0.378);
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.056, 14), gaugeScreenMat);
        face.rotation.y = Math.PI;
        face.position.set(gx, 0.68, -0.393);
        genGroup.add(bezel, face);
      });
      for (let v = 0; v < 4; v++) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.022, 0.025), gunmetalMat);
        louver.position.set(-0.24, 0.34 + v * 0.10, -0.295);
        genGroup.add(louver);
      }
      const throwSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.05), dangerRedMat);
      throwSwitch.position.set(0.42, 0.42, -0.385);
      const powerTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 1.55, 8), pipeMat);
      powerTrunk.rotation.z = Math.PI / 2;
      powerTrunk.position.set(-1.32, 0.034, 0);
      genGroup.add(skidF, skidB, engineBlock, headCap, fuelDrum, ctrlCabinet, throwSwitch, powerTrunk);
      genGroup.position.set(-9.25, 0, 18.55);
      markNoMerge(genGroup);
      wingGroup.add(genGroup);
      visualInteract(genGroup, 'aux_generator');

      // Grounded Hospital Bulkhead Ceiling Fixtures spaced across all 5 outer wings
      [
        [colX(1.5), rowZ(2), 0xe05824],
        [colX(4.8), rowZ(2), 0xdc441c],
        [colX(6.5), rowZ(2), 0xd92e1c],
        [colX(1.8), rowZ(6.8), 0xd65428],
        [colX(5.5), rowZ(6.8), 0xdf4c1e],
      ].forEach(([lx, lz, cHex]) => {
        makeHospitalFixture(wingGroup, lx, 3.07, lz, cHex);
      });

      // Floor horror blood/rust stains across 5C, 5D, Chamber 3, 5E & 5F
      const stainMat = new THREE.MeshBasicMaterial({ color: 0x220808, transparent: true, opacity: 0.65, depthWrite: false });
      [
        [-12.55, 0.008, 10.20, 1.45],
        [-12.20, 0.008, 8.15, 0.95],
        [-10.45, 0.008, 9.55, 0.85],
        [-3.65, 0.008, 9.45, 0.78],
        [-3.40, 0.008, 17.50, 1.30],
        [-10.10, 0.008, 16.40, 1.05],
      ].forEach(([sx, sy, sz, rad], idx) => {
        const dec = new THREE.Mesh(new THREE.CircleGeometry(rad, 14), stainMat);
        dec.rotation.x = -Math.PI / 2;
        dec.scale.set(1.25, 0.72, 1);
        dec.rotation.z = idx * 0.9;
        dec.position.set(sx, sy, sz);
        dec.userData.np = 1;
        wingGroup.add(dec);
      });

      batchStaticMeshes(wingGroup);
      S.add(wingGroup);
      reportLoaded('Security & Observation Wings');

      // Load lightweight HorrorPackFBX morgue furnishings into Chamber 3, 5D, 5C & 5E!
      if (typeof E.loadFBX === 'function') {
        const texLoader = new THREE.TextureLoader();
        const HP = `${MODEL_BASE}/horrorpack`;
        const loadTex = (name) => {
          const tx = texLoader.load(`${HP}/${name}`);
          tx.colorSpace = THREE.SRGBColorSpace;
          return tx;
        };
        const bedTex = loadTex('bed.jpg');
        const knifeTex = loadTex('kNIFE.jpg');
        const woodTex = loadTex('WoodGround.jpg');

        const mountFBX = (file, tex, targetLen, pos, rotY = 0, interactId = null) => {
          E.loadFBX(`${HP}/${file}`).then((fbx) => {
            fbx.updateMatrixWorld(true);
            const b = new THREE.Box3().setFromObject(fbx);
            const sz = new THREE.Vector3();
            b.getSize(sz);
            const maxDim = Math.max(sz.x, sz.y, sz.z, 0.001);
            const scale = targetLen / maxDim;
            const grp = normalizeProp(fbx, { scale, position: pos, rotationY });
            grp.traverse((m) => {
              if (!m.isMesh) return;
              m.material = new THREE.MeshStandardMaterial({
                map: tex,
                color: 0x9e9a92,
                roughness: 0.82,
                metalness: 0.14,
              });
            });
            wingGroup.add(grp);
            if (interactId) visualInteract(grp, interactId);
          }).catch(() => {});
        };

        mountFBX('bed_1.fbx', bedTex, 2.05, [-13.25, 0, 10.40], Math.PI / 2);                    // Chamber 3 Morgue Exam Bed
        mountFBX('NightStand_1.fbx', woodTex, 0.65, [-13.65, 0, 8.75], 0);                        // Chamber 3 Side Table
        mountFBX('Knife.fbx', knifeTex, 0.34, [-13.62, 0.66, 8.75], 0.65, 'scalpel_prop');        // Interactive Surgical Scalpel
        mountFBX('DressHolder_1.fbx', woodTex, 1.75, [-7.25, 0, 6.25], -0.2);                     // Annex 5C Coat/Hazmat Stand
        mountFBX('bed_1.fbx', bedTex, 2.05, [-2.95, 0, 17.45], 0, 'autopsy_gurney');              // Room 5E Cryo Autopsy Gurney
      }
    })
    .catch((err) => {
      console.error('[ROOM5] Failed to load horror_kit.glb:', err);
      reportLoaded('Security & Observation Wings');
    });

  // (c) Retro IBM PC -> staff_terminal (R2-01) on OfficeWoodTable
  E.loadGLB(`${MODEL_BASE}/retro_ibm_pc.glb`)
    .then((gltf) => {
      const pcGroup = normalizeProp(gltf.scene, {
        scale: 0.50,
        position: [-2.72, 0.82, 0.98],
        rotationY: 0,
      });
      S.add(pcGroup);
      visualInteract(pcGroup, 'staff_terminal');
      devItems.push({
        id: 'glb:retro_ibm_pc',
        label: 'GLB — Retro IBM PC (staff_terminal)',
        object3D: pcGroup,
        basePos: [-2.72, 0.82, 0.98],
        baseRotY: 0,
        baseScale: 0.50,
      });
      reportLoaded('Staff Terminal');
    })
    .catch((err) => {
      console.error('[ROOM5] Failed to load retro_ibm_pc.glb:', err);
      reportLoaded('Staff Terminal');
    });

  // (d) Retro TVs cluster -> monitor_bank alcove on South Wall
  E.loadGLB(`${MODEL_BASE}/retro_tvs.glb`)
    .then((gltf) => {
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        if (o.material?.name === 'Main_TV_Glass_Mat') {
          o.material = makeScreenMat(true, true, monitorScreens.length);
        }
      });
      const tvGroup = normalizeProp(gltf.scene, {
        scale: 0.72,
        position: [0.28, 0.0, -1.28],
        rotationY: 0,
      });
      S.add(tvGroup);
      visualInteract(tvGroup, 'monitor_bank');
      devItems.push({
        id: 'glb:retro_tvs',
        label: 'GLB — Retro TV Bank (monitor_bank)',
        object3D: tvGroup,
        basePos: [0.28, 0.0, -1.28],
        baseRotY: 0,
        baseScale: 0.72,
      });
      reportLoaded('CRT Monitor Bank');
    })
    .catch((err) => {
      console.error('[ROOM5] Failed to load retro_tvs.glb:', err);
      reportLoaded('CRT Monitor Bank');
    });

  // (e) Akai Reel-to-Reel -> tape_deck_cart relocated into Room 5C beside Radio Console!
  E.loadGLB(`${MODEL_BASE}/akai_reel_to_reel.glb`)
    .then((gltf) => {
      gltf.scene.traverse((o) => {
        if (o.isMesh && /Top_Reels/i.test(o.name)) {
          akaiReelsNode = o;
        }
      });
      const akaiGroup = normalizeProp(gltf.scene, {
        scale: 1.0,
        position: [-3.15, 1.09, 12.60],
        rotationY: Math.PI,
        fixTransparency: true,
      });
      S.add(akaiGroup);
      visualInteract(akaiGroup, 'tape_deck_cart');
      devItems.push({
        id: 'glb:akai_reel_to_reel',
        label: 'GLB — Akai Reel-to-Reel (Room 5C tape_deck_cart)',
        object3D: akaiGroup,
        basePos: [-3.15, 1.09, 12.60],
        baseRotY: Math.PI,
        baseScale: 1.0,
      });
      reportLoaded('Akai Tape Deck');
    })
    .catch((err) => {
      console.error('[ROOM5] Failed to load akai_reel_to_reel.glb:', err);
      reportLoaded('Akai Tape Deck');
    });

  // (f) Optimized 15-Bone Skeletal Apparition -> ghost.glb (26k tris + AnimationClips)
  E.loadGLB(`${MODEL_BASE}/ghost.glb`)
    .then((gltf) => {
      const ghostRoot = new THREE.Group();
      const ghostMats = [];
      const bones = {};
      const modelGroup = normalizeProp(gltf.scene, { scale: 1.0, position: [0, 0, 0] });
      modelGroup.traverse((o) => {
        if (o.isBone && o.name) {
          bones[o.name] = o;
        }
        if (!o.isMesh) return;
        o.userData.np = 1;
        o.castShadow = false;
        o.receiveShadow = false;
        // Never frustum-cull skinned meshes mid-lunge so arms/jaw stay visible right against camera lens
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (!m) return;
          m.roughness = Math.min(0.84, m.roughness ?? 0.68);
          m.emissive = new THREE.Color(0x160404);
          m.emissiveIntensity = 0.28;
          m.needsUpdate = true;
          ghostMats.push(m);
        });
      });

      const mixer = new THREE.AnimationMixer(gltf.scene);
      const actions = {};
      (gltf.animations || []).forEach((clip) => {
        const act = mixer.clipAction(clip);
        actions[clip.name] = act;
      });
      const defaultClipName = actions.IdleStalk ? 'IdleStalk' : Object.keys(actions)[0] || null;
      let activeAnimName = defaultClipName;
      if (defaultClipName) {
        actions[defaultClipName].play();
      }

      const setAnim = (name, timeScale = 1.0, fadeSec = 0.16) => {
        const targetAct = actions[name];
        if (!targetAct) return;
        targetAct.timeScale = timeScale;
        if (activeAnimName === name && targetAct.isRunning()) return;
        const prevAct = activeAnimName ? actions[activeAnimName] : null;
        activeAnimName = name;
        targetAct.reset().setEffectiveWeight(1).play();
        if (prevAct && prevAct !== targetAct) {
          prevAct.crossFadeTo(targetAct, fadeSec, false);
        }
      };

      const ghostGlow = new THREE.PointLight(0x9a1c1c, 0, 6.2, 1.6);
      ghostGlow.position.set(0, 1.28, 0.25);
      ghostRoot.add(ghostGlow);

      ghostRoot.add(modelGroup);
      // Starts hidden in Dormant standby during the initial 3-minute grace window
      ghostRoot.position.set(-12.2, 0.02, 16.5);
      ghostRoot.visible = false;
      S.add(ghostRoot);

      ghostData = {
        root: ghostRoot,
        meshWrap: modelGroup,
        ghostGlow,
        mixer,
        actions,
        bones,
        setAnim,
        get activeAnim() { return activeAnimName; },
        walkAction: actions.IdleStalk || null,
        mats: ghostMats,
        isHunting: false,
        isJumpscaring: false,
        behavior: 'DORMANT',
        prevX: -12.2,
        prevZ: 16.5,
        stridePhase: 0,
      };
      E._ghost = ghostData;
      reportLoaded('Entity Specimen');
    })
    .catch((err) => {
      console.warn('[ROOM5] Failed to load ghost.glb:', err);
      reportLoaded('Entity Specimen');
    });

  // Connected patrol loop through Chamber 3 & Observation Hall 5D (when not peeking/hunting)
  const patrolWaypoints = [
    [-12.55, 8.2],
    [-12.55, 11.6],
    [-11.85, 9.4],
    [-12.55, 7.6],
  ];
  let patrolIdx = 0;

  // ── 6. Per-Frame Animation Loop ──────────────────────────────────────────────
  const droppedBeacons = new Map();
  let elapsedTime = 0;
  anim((_t, dt) => {
    elapsedTime += dt;

    // Smoothly animate Control Room doorway leaf
    if (controlDoorHinge) {
      const target = controlDoorHinge.isOpen ? controlDoorHinge.userData.openAngle : 0;
      controlDoorHinge.userData.currentAngle += (target - controlDoorHinge.userData.currentAngle) * Math.min(1, dt * 5.5);
      controlDoorHinge.rotation.y = controlDoorHinge.userData.currentAngle;
    }

    // Smoothly animate Annex, South Wing, Observation, Chamber 3 (South+North), Cryo, Generator & Morgue Vault doors
    [
      annexDoorHinge,
      southWingDoorHinge,
      observationDoorHinge,
      chamber3DoorHinge,
      chamber3NorthDoorHinge,
      cryoDoorHinge,
      generatorDoorHinge,
      morgueVaultDoorHinge,
    ].forEach((h) => {
      if (!h) return;
      const closed = h.userData.closedAngle ?? 0;
      const target = h.isOpen ? h.userData.openAngle : closed;
      h.userData.currentAngle += (target - h.userData.currentAngle) * Math.min(1, dt * 5.0);
      h.rotation.y = h.userData.currentAngle;
    });

    // Rattle locked doors & open Vault door when cleared
    const rattleOffset = rattleTimer.t > 0 ? Math.sin(rattleTimer.t * 48) * 0.035 * (rattleTimer.t / 0.32) : 0;
    if (rattleTimer.t > 0) rattleTimer.t = Math.max(0, rattleTimer.t - dt);

    if (entryDoorHinge) {
      entryDoorHinge.rotation.y = rattleTimer.id === 'entry_door' ? rattleOffset : 0;
    }
    if (chamber3DoorHinge && !chamber3DoorHinge.isOpen && rattleTimer.id === 'chamber3_door') {
      chamber3DoorHinge.rotation.y = (chamber3DoorHinge.userData.closedAngle ?? 0) + rattleOffset;
    }
    if (chamber3NorthDoorHinge && !chamber3NorthDoorHinge.isOpen && rattleTimer.id === 'chamber3_north_door') {
      chamber3NorthDoorHinge.rotation.y = (chamber3NorthDoorHinge.userData.closedAngle ?? 0) + rattleOffset;
    }

    if (vaultDoorHinge) {
      const isOpen = Boolean(vaultDoorHinge.isOpen);
      const target = isOpen ? vaultDoorHinge.userData.openAngle : 0;
      vaultDoorHinge.userData.currentAngle += (target - vaultDoorHinge.userData.currentAngle) * Math.min(1, dt * 3.5);
      vaultDoorHinge.rotation.y = vaultDoorHinge.userData.currentAngle + (!isOpen && rattleTimer.id === 'vault_door' ? rattleOffset : 0);

      if (isOpen) {
        vaultBeaconMat.color.setHex(0xd4a45a);
        vaultBeaconMat.emissive.setHex(0xc88a38);
      }
    }

    // Subtle vibration / tape wobble on Akai reel deck
    if (akaiReelsNode) {
      akaiReelsNode.position.y = Math.sin(elapsedTime * 18) * 0.0006;
    }

    // Animate 15-bone rigged Specimen S-011 only when manifested (zero idle roaming during dormant windows)
    if (ghostData && ghostData.root.visible) {
      const gx = ghostData.root.position.x;
      const gz = ghostData.root.position.z;
      const frameDisp = Math.hypot(gx - (ghostData.prevX ?? gx), gz - (ghostData.prevZ ?? gz));
      const ghostSpeed = dt > 0.0001 ? Math.min(4.5, frameDisp / dt) : 0;
      ghostData.prevX = gx;
      ghostData.prevZ = gz;

      const hunting = Boolean(ghostData.isHunting);
      const jumpscaring = Boolean(ghostData.isJumpscaring);

      if (!ghostData.scareOverride && !jumpscaring && !hunting) {
        ghostData.setAnim?.('IdleStalk', 0.72 + ghostSpeed * 0.45, 0.25);
        const [wx, wz] = patrolWaypoints[patrolIdx];
        const dxW = wx - gx;
        const dzW = wz - gz;
        const dW = Math.hypot(dxW, dzW);
        if (dW < 0.25) {
          patrolIdx = (patrolIdx + 1) % patrolWaypoints.length;
        } else {
          const step = Math.min(dW, dt * 0.62);
          ghostData.root.position.x += (dxW / dW) * step;
          ghostData.root.position.z += (dzW / dW) * step;
          const targetRot = Math.atan2(dxW, dzW);
          const dRot = Math.atan2(Math.sin(targetRot - ghostData.root.rotation.y), Math.cos(targetRot - ghostData.root.rotation.y));
          ghostData.root.rotation.y += dRot * Math.min(1, dt * 4.5);
        }
      }

      if (ghostData.mixer) {
        ghostData.mixer.update(dt);
      }

      // Additive organic head/jaw micro-tracking toward player after skeletal mixer update
      if (ghostData.bones?.Head) {
        const px = E.px?.() ?? 0;
        const pz = E.pz?.() ?? 0;
        const toPlayerYaw = Math.atan2(px - gx, pz - gz);
        const relYaw = Math.atan2(Math.sin(toPlayerYaw - ghostData.root.rotation.y), Math.cos(toPlayerYaw - ghostData.root.rotation.y));
        const clampedNeckYaw = Math.max(-0.55, Math.min(0.55, relYaw));
        ghostData.bones.Head.rotation.y += clampedNeckYaw * 0.55;
        if (ghostData.bones.Neck) {
          ghostData.bones.Neck.rotation.y += clampedNeckYaw * 0.35;
        }
        if ((hunting || jumpscaring) && Math.random() < (jumpscaring ? 0.35 : 0.08)) {
          ghostData.bones.Head.rotation.z += (Math.random() - 0.5) * (jumpscaring ? 0.28 : 0.14);
        }
      }

      // Clean ground placement — limbs carry full skeletal animation without wobbling root capsule
      ghostData.meshWrap.position.y = jumpscaring ? -0.14 : 0.0;
      ghostData.meshWrap.rotation.set(0, 0, 0);

      if (ghostData.ghostGlow) {
        const pulse = jumpscaring
          ? 6.5
          : hunting
          ? (2.2 + 0.9 * Math.sin(elapsedTime * 11.0))
          : (0.95 + 0.3 * Math.sin(elapsedTime * 2.4));
        ghostData.ghostGlow.intensity = pulse;
      }
    } else if (ghostData?.ghostGlow) {
      ghostData.ghostGlow.intensity = 0;
    }

    // Pulse dropped evidence beacons cleanly
    droppedBeacons.forEach((entry, idx) => {
      const pulse = 0.7 + 0.3 * Math.sin(elapsedTime * 5.2 + idx);
      if (entry.beaconMat) entry.beaconMat.emissiveIntensity = 1.1 + pulse * 0.9;
      if (entry.satchelMesh) entry.satchelMesh.position.y = 0.05 + pulse * 0.012;
    });

    // Reset base light intensities cleanly every frame before distance attenuation & culling (dim scary hospital tones)
    controlOverhead.intensity = isBreakerOn ? 1.85 : 0.55;
    const flickVal = 1.95 + Math.sin(elapsedTime * 4.2) * 0.32 + (Math.random() < 0.04 ? -0.75 : 0.08);
    corridorAmber.intensity = Math.max(0.75, flickVal);
    corridorWestLight.intensity = Math.max(0.68, 1.80 + Math.sin(elapsedTime * 3.1) * 0.25);

    if (isBreakerOn) {
      annexLight.intensity = Math.random() < 0.035 ? 0.62 : 2.05 + 0.24 * Math.sin(elapsedTime * 7.1);
      obsLight.intensity = Math.random() < 0.035 ? 0.58 : 1.95 + 0.22 * Math.sin(elapsedTime * 5.3);
      cryoLight.intensity = Math.random() < 0.03 ? 0.58 : 1.95 + 0.22 * Math.sin(elapsedTime * 3.8);
      genLight.intensity = Math.random() < 0.05 ? 0.65 : 2.05 + 0.26 * Math.sin(elapsedTime * 9.0);
    } else {
      annexLight.intensity = 0.55;
      obsLight.intensity = 0.55;
      cryoLight.intensity = 0.55;
      genLight.intensity = 0.65;
    }
    chamber3RedLight.intensity = 2.30 + Math.sin(elapsedTime * 2.6) * 0.65;

    const pCurX = E.px?.() ?? 0;
    const pCurZ = E.pz?.() ?? 0;
    const cullMaxDist = E._qualityMode === 'eco' ? 14.5 : 18.5;
    const cullFadeStart = cullMaxDist * 0.75;
    const cullMaxSq = cullMaxDist * cullMaxDist;
    roomLights.forEach((entry) => {
      const lx = entry.light.position.x - pCurX;
      const lz = entry.light.position.z - pCurZ;
      const dSq = lx * lx + lz * lz;
      if (dSq > cullMaxSq) {
        entry.light.visible = false;
      } else {
        entry.light.visible = true;
        const d = Math.sqrt(dSq);
        if (d > cullFadeStart) {
          const atten = Math.max(0.08, 1 - (d - cullFadeStart) / (cullMaxDist - cullFadeStart));
          entry.light.intensity *= atten;
        }
      }
    });

    // Subtle CRT static flicker (shared material updated at most once per frame in High mode)
    if (E._qualityMode !== 'eco' && sharedScreenMat.static && Math.random() < 0.08) {
      sharedScreenMat.static.emissiveIntensity = 0.55 + Math.random() * 0.5;
    }

    // Pulse diegetic fragment markers
    Object.values(fragmentMarkers).forEach((mk, idx) => {
      if (!mk.cleared) {
        mk.mat.opacity = mk.baseOpacity * (0.7 + 0.3 * Math.sin(elapsedTime * 2.8 + idx));
      }
    });

    // Drift dust motes gently when visible
    if (dustPoints.visible) {
      dustPoints.rotation.y = Math.sin(elapsedTime * 0.04) * 0.02;
    }
  });

  // ── 6B. Dynamic Dropped Evidence Pouch Spawner (Ghost Catch Recovery) ──────
  E.clearDroppedEvidence = (dropId) => {
    const entry = droppedBeacons.get(dropId);
    if (!entry) return;
    droppedBeacons.delete(dropId);
    S.remove(entry.group);
    if (Array.isArray(E._pick)) {
      entry.group.traverse((o) => {
        const idx = E._pick.indexOf(o);
        if (idx !== -1) E._pick.splice(idx, 1);
      });
    }
    if (E._byId) delete E._byId[dropId];
    if (E._visualById) delete E._visualById[dropId];
    entry.group.traverse((o) => {
      o.geometry?.dispose?.();
      if (Array.isArray(o.material)) o.material.forEach((m) => m?.dispose?.());
      else o.material?.dispose?.();
    });
  };

  E.spawnDroppedEvidence = (record) => {
    if (!record || !record.id || !S || !interact) return;
    if (droppedBeacons.has(record.id)) return;
    const grp = new THREE.Group();
    const satchelMat = new THREE.MeshStandardMaterial({ color: 0xd4be92, roughness: 0.78 });
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x5c2418, roughness: 0.65 });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xc94a4a,
      emissive: new THREE.Color(0xc94a4a),
      emissiveIntensity: 1.6,
    });

    const satchelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.30), satchelMat);
    satchelMesh.position.set(0, 0.05, 0);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.02, 0.09), strapMat);
    band.position.set(0, 0.09, 0);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), beaconMat);
    beacon.position.set(0.11, 0.10, 0.07);
    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.65, 0.75),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitbox.position.set(0, 0.32, 0);

    grp.add(satchelMesh, band, beacon, hitbox);
    grp.position.set(Number(record.x || 0), 0.02, Number(record.z || 6.5));
    interact(grp, record.id);
    add(grp, { noShadow: true });
    visualInteract(grp, record.id);
    droppedBeacons.set(record.id, { group: grp, beaconMat, satchelMesh });
  };

  // ── 7. Optional ?dev=1 Live Position & Collider Calibrator API ──────────────
  if (isDev) {
    let wireframeGroup = null;
    E._dev = {
      getItems: () =>
        devItems.map((it) => ({
          id: it.id,
          label: it.label,
          pos: [
            Number(it.object3D.position.x.toFixed(2)),
            Number(it.object3D.position.y.toFixed(2)),
            Number(it.object3D.position.z.toFixed(2)),
          ],
          rotY: Number(it.object3D.rotation.y.toFixed(2)),
          scale: Number(it.object3D.scale.x.toFixed(2)),
        })),
      updateItem: (id, { pos, rotY, scale }) => {
        const it = devItems.find((d) => d.id === id);
        if (!it) return;
        if (pos) it.object3D.position.set(pos[0], pos[1], pos[2]);
        if (rotY !== undefined) it.object3D.rotation.y = rotY;
        if (scale !== undefined) it.object3D.scale.setScalar(scale);
      },
      toggleWireframes: (show) => {
        if (show && !wireframeGroup) {
          wireframeGroup = new THREE.Group();
          const wfMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true, transparent: true, opacity: 0.55 });
          devItems.forEach((it) => {
            if (it.id.startsWith('hotspot:')) {
              const clone = new THREE.Mesh(it.object3D.geometry, wfMat);
              clone.position.copy(it.object3D.position);
              clone.userData.np = 1;
              wireframeGroup.add(clone);
            }
          });
          S.add(wireframeGroup);
        } else if (wireframeGroup) {
          wireframeGroup.visible = Boolean(show);
        }
      },
      exportJSON: () => {
        const payload = E._dev.getItems();
        console.info('[ROOM5 ?dev=1 POSITIONS]', JSON.stringify(payload, null, 2));
        return payload;
      },
    };
  }

  return ref;
}

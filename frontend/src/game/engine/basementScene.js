import { THREE, TX, X, mat, bgeo } from './kit.js';
import { tex, concreteWall, rustMetal, diamondPlateFloor } from './texControl.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const MODEL_BASE = '/assets/models/basement';

// Keep ONLY real shell.glb concrete floor, walls, ceiling beams/panels & West wall/overhead pipes
// Hides all 34 shipping containers, low slabs, black partitions, pillars, and glaring white ceiling strips
const SHELL_KEEP_NAMES = new Set([
  'plane_material001_0',          // wet cracked concrete floor
  'plane001_material002_0',        // East damp concrete wall
  'plane004_material002_0',        // West damp concrete wall
  'plane003_material004_0',        // concrete baseboard
  'plane015_material004_0',        // concrete baseboard trim
  'plane005_material005_0',        // industrial roof deck
  'plane006_material006_0',        // corrugated ceiling panels
  'plane012_material001_0',        // low overhead concrete beams
  'cube020_material003_0',         // roof structural trusses
  'cube020_material006_0',         // ceiling cross bracing (excludes white cube020_material_0)
  'factory_tube_04001_material006_0',
  'factory_tube_04002_material006_0',
  'factory_tube_04003_material006_0',
  'factory_tube_18002_material005_0'
]);

const isTestEnv = () =>
  typeof window === 'undefined' ||
  typeof document === 'undefined' ||
  (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST));

const box = (w, h, d, material, x, y, z) => {
  const mesh = new THREE.Mesh(bgeo(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
};

const cylinder = (rt, rb, h, segments, material, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
};

const mergeStaticChildren = (group) => {
  group.updateMatrixWorld(true);
  const byMaterial = new Map();
  const originalGeometries = new Set();
  group.traverse((mesh) => {
    if (!mesh.isMesh || mesh === group) return;
    originalGeometries.add(mesh.geometry);
    const key = mesh.material?.uuid || 'default';
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    const existing = byMaterial.get(key);
    if (existing) existing.geometries.push(geometry);
    else byMaterial.set(key, { material: mesh.material, geometries: [geometry] });
  });
  const parentInverse = group.matrixWorld.clone().invert();
  group.children.slice().forEach((child) => group.remove(child));
  originalGeometries.forEach((geometry) => geometry.dispose());
  for (const { material, geometries } of byMaterial.values()) {
    const combined = geometries.length > 1 ? mergeGeometries(geometries, false) : geometries[0];
    if (combined) {
      combined.applyMatrix4(parentInverse);
      const merged = new THREE.Mesh(combined, material);
      merged.castShadow = false;
      merged.receiveShadow = false;
      group.add(merged);
    }
    geometries.forEach((geometry) => geometry.dispose());
  }
};

function freezeStatic(obj) {
  if (!obj) return;
  obj.updateMatrixWorld(true);
  obj.traverse?.((child) => {
    child.matrixAutoUpdate = false;
  });
}

function createPbrMaterial(generatorFn, fallbackParams, { repeat = [1, 1], bumpScale = 0.03, roughness = 0.9, metalness = 0.1 } = {}) {
  if (isTestEnv()) return mat(fallbackParams);
  try {
    const canvas = generatorFn();
    const mapTex = tex(canvas, { repeat });
    return new THREE.MeshStandardMaterial({
      map: mapTex,
      bumpMap: mapTex,
      bumpScale,
      roughness,
      metalness
    });
  } catch {
    return mat(fallbackParams);
  }
}

function createRedGlowTexture() {
  if (isTestEnv()) return null;
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  if (ctx) {
    const rad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    rad.addColorStop(0.0, 'rgba(255, 70, 60, 0.95)');
    rad.addColorStop(0.32, 'rgba(220, 20, 20, 0.48)');
    rad.addColorStop(0.68, 'rgba(155, 8, 8, 0.14)');
    rad.addColorStop(1.0, 'rgba(120, 0, 0, 0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
}

function createBlueSparkTexture() {
  if (isTestEnv()) return null;
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const ctx = cv.getContext('2d');
  if (ctx) {
    const rad = ctx.createRadialGradient(32, 32, 1, 32, 32, 32);
    rad.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    rad.addColorStop(0.28, 'rgba(135, 215, 255, 0.78)');
    rad.addColorStop(0.65, 'rgba(40, 125, 255, 0.25)');
    rad.addColorStop(1.0, 'rgba(20, 60, 220, 0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
}

function createDecalMesh(map, w, h, pos, rot, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      depthWrite: false,
      roughness: opts.r ?? 0.86,
      metalness: opts.m ?? 0.05,
      emissive: opts.e ?? 0x000000,
      emissiveMap: opts.em ?? null,
      emissiveIntensity: opts.ei ?? 0,
      polygonOffset: true,
      polygonOffsetFactor: opts.pf ?? -2,
      opacity: opts.o ?? 0.88,
      side: opts.side ?? THREE.FrontSide
    })
  );
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = false;
  m.receiveShadow = false;
  m.userData.np = 1;
  return m;
}

function createIncidentSheetMaterial() {
  if (isTestEnv()) return mat({ c: 0x8f8266, r: 0.92 });
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 192;
  const ctx = cv.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#9a8c6c';
    ctx.fillRect(0, 0, 256, 192);
    const vig = ctx.createRadialGradient(128, 96, 30, 128, 96, 145);
    vig.addColorStop(0, 'rgba(154, 140, 108, 0)');
    vig.addColorStop(1, 'rgba(42, 32, 20, 0.68)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, 256, 192);
    ctx.fillStyle = 'rgba(34, 28, 22, 0.55)';
    for (let y = 32; y < 164; y += 22) {
      const w = 120 + ((y * 37) % 85);
      ctx.fillRect(24, y, w, 4);
    }
    ctx.fillStyle = 'rgba(78, 16, 14, 0.5)';
    ctx.beginPath();
    ctx.arc(198, 140, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  const canvasTex = new THREE.CanvasTexture(cv);
  canvasTex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: canvasTex, roughness: 0.92, metalness: 0.04 });
}

function createHazardRingMaterial() {
  if (isTestEnv()) return new THREE.MeshBasicMaterial({ visible: false });
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const ctx = cv.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.lineWidth = 14;
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2;
      const a1 = ((i + 0.65) / 24) * Math.PI * 2;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(158, 118, 32, 0.42)' : 'rgba(18, 20, 22, 0.46)';
      ctx.beginPath();
      ctx.arc(128, 128, 112, a0, a1);
      ctx.stroke();
    }
  }
  const canvasTex = new THREE.CanvasTexture(cv);
  canvasTex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: canvasTex,
    transparent: true,
    depthWrite: false,
    roughness: 0.92,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });
}

function createAnimatedCrtScreen(kind = 'cctv') {
  if (isTestEnv()) {
    return {
      mat: mat({ c: 0x071d11, e: 0x1e4d2d, ei: 0.85, r: 0.38 }),
      tex: null,
      update: () => {}
    };
  }
  const W = 192;
  const H = 128;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');

  let cachedFace = null;
  if (kind === 'cctv') {
    try {
      const fc = document.createElement('canvas');
      fc.width = 64;
      fc.height = 80;
      const fctx = fc.getContext('2d');
      if (fctx) {
        fctx.drawImage(X.faceC({ eye: '#d8f5e0', glow: true, mouth: true, seed: 7 }), 0, 0, 64, 80);
        cachedFace = fc;
      }
    } catch (_) {}
  }

  const canvasTex = new THREE.CanvasTexture(cv);
  canvasTex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: canvasTex });

  const drawScanlines = () => {
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
  };

  const update = (t = 0, spikeAmount = 0, glitchActive = false) => {
    if (!ctx) return;
    if (kind === 'seismic') {
      const alertBoost = Math.min(1, spikeAmount);
      ctx.fillStyle = alertBoost > 0.2 ? '#230508' : '#120506';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(225, 58, 58, 0.18)';
      ctx.lineWidth = 1;
      for (let x = 16; x < W; x += 24) {
        ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, H - 8); ctx.stroke();
      }
      for (let y = 16; y < H; y += 22) {
        ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(W - 8, y); ctx.stroke();
      }
      const amp = 1 + alertBoost * 2.8;
      ctx.strokeStyle = alertBoost > 0.25 ? '#ff5555' : '#e13a3a';
      ctx.lineWidth = alertBoost > 0.25 ? 2.6 : 2.0;
      ctx.beginPath();
      for (let x = 8; x <= W - 8; x += 4) {
        const phase = x / 16 + t * (4.2 + alertBoost * 5);
        const rawY = Math.sin(phase * 1.7) * 12 + Math.cos(phase * 4.3) * 7 + (alertBoost > 0.15 ? Math.sin(phase * 11) * 9 : 0);
        const y = Math.max(12, Math.min(H - 12, H * 0.5 + rawY * amp));
        if (x === 8) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      drawScanlines();
    } else if (kind === 'cctv') {
      ctx.fillStyle = '#031208';
      ctx.fillRect(0, 0, W, H);
      // Faint dark doorway corridor geometry
      ctx.fillStyle = 'rgba(18, 56, 28, 0.42)';
      ctx.fillRect(W * 0.34, H * 0.16, W * 0.32, H * 0.72);
      ctx.fillStyle = 'rgba(6, 22, 10, 0.75)';
      ctx.fillRect(W * 0.38, H * 0.22, W * 0.24, H * 0.66);

      if (glitchActive && cachedFace) {
        ctx.globalAlpha = 0.78;
        ctx.drawImage(cachedFace, W * 0.5 - 28, H * 0.2, 56, 70);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(90, 255, 150, 0.18)';
        ctx.fillRect(0, 0, W, H);
      }

      // Rolling interference band & grainy static specks
      const rollY = ((t * 48) % (H + 24)) - 12;
      ctx.fillStyle = 'rgba(84, 225, 130, 0.14)';
      ctx.fillRect(0, rollY, W, 10);
      ctx.fillStyle = 'rgba(110, 240, 155, 0.24)';
      for (let i = 0; i < 42; i++) {
        const sx = Math.random() * W;
        const sy = Math.random() * H;
        ctx.fillRect(sx, sy, 2 + Math.random() * 5, 1.5);
      }
      drawScanlines();
    } else if (kind === 'pressure') {
      ctx.fillStyle = '#110a04';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(229, 146, 56, 0.18)';
      ctx.lineWidth = 1;
      for (let y = 20; y < H - 10; y += 22) {
        ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(W - 10, y); ctx.stroke();
      }
      // Fluctuating vertical gauge bars (zero fake digits/clues)
      const bars = 8;
      const bw = 14;
      for (let i = 0; i < bars; i++) {
        const level = 0.25 + 0.62 * (0.5 + 0.5 * Math.sin(t * (2.1 + i * 0.35) + i * 1.4));
        const bh = Math.round((H - 34) * level);
        const bx = 18 + i * 21;
        ctx.fillStyle = level > 0.78 ? '#ff5738' : '#e59238';
        ctx.fillRect(bx, H - 14 - bh, bw, bh);
      }
      const sweepY = 12 + ((t * 36) % (H - 24));
      ctx.fillStyle = 'rgba(255, 180, 75, 0.22)';
      ctx.fillRect(8, sweepY, W - 16, 4);
      // Blinking status pips
      for (let i = 0; i < 4; i++) {
        const on = Math.sin(t * 4.5 + i * 1.8) > 0;
        ctx.fillStyle = on ? '#ff6a40' : '#4a2410';
        ctx.fillRect(18 + i * 24, 10, 10, 5);
      }
      drawScanlines();
    } else {
      // 'terminal': phosphor green oscilloscope wave + blinking cursor (zero digits/clues)
      ctx.fillStyle = '#04120a';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(64, 210, 130, 0.18)';
      ctx.lineWidth = 1;
      for (let x = 24; x < W; x += 28) {
        ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, H - 8); ctx.stroke();
      }
      for (let y = 20; y < H; y += 24) {
        ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(W - 8, y); ctx.stroke();
      }
      ctx.strokeStyle = '#40d282';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let x = 10; x <= W - 10; x += 4) {
        const phase = x / 18 - t * 3.1;
        const y = H * 0.48 + Math.sin(phase * 1.8) * 18 + Math.cos(phase * 4.4) * 9;
        if (x === 10) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (Math.sin(t * 5.2) > 0) {
        ctx.fillStyle = '#6cf0a8';
        ctx.fillRect(16, H - 22, 10, 6);
      }
      drawScanlines();
    }
    canvasTex.needsUpdate = true;
  };

  update(0, 0, false);
  return { mat: screenMat, tex: canvasTex, update };
}

// Cap all GLB textures to 512px to cut GPU texture RAM & bandwidth ~75% without visual loss
function capTextures(root, limit = 512) {
  if (isTestEnv()) return;
  const textures = new Set();
  const resized = new Map();
  const oldImages = new Set();
  root.traverse((o) => {
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m) continue;
      for (const v of Object.values(m)) {
        if (v?.isTexture) textures.add(v);
      }
    }
  });
  for (const t of textures) {
    const img = t.image;
    const w = img?.width;
    const h = img?.height;
    if (!w || !h || Math.max(w, h) <= limit) continue;
    let c = resized.get(img);
    if (!c) {
      const sc = limit / Math.max(w, h);
      c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * sc));
      c.height = Math.max(1, Math.round(h * sc));
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      resized.set(img, c);
      oldImages.add(img);
    }
    t.image = c;
    t.needsUpdate = true;
  }
  for (const img of oldImages) img.close?.();
}

function gradeModel(modelScene, { darken = 0.80 } = {}) {
  capTextures(modelScene, 512);
  modelScene.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (!m) return;
      const mn = (m.name || '').toLowerCase();
      if (m.roughness !== undefined) {
        m.roughness = Math.min(0.94, Math.max(0.55, m.roughness + 0.05));
      }
      if (m.metalness !== undefined && m.metalness > 0.6) {
        m.metalness = 0.5;
      }
      if (m.color) {
        m.color.multiplyScalar(darken);
      }
      // Kill KHR_materials_transmission full-screen double-render pass & physical shader bloat
      const wasTransmissive = (m.transmission && m.transmission > 0) || mn.includes('glass') || mn.includes('acrylic');
      if ('transmission' in m) m.transmission = 0;
      if ('thickness' in m) m.thickness = 0;
      if ('clearcoat' in m) m.clearcoat = 0;
      if ('sheen' in m) m.sheen = 0;
      if ('specularIntensity' in m) m.specularIntensity = 0;
      if ('ior' in m) m.ior = 1.45;
      if ('envMapIntensity' in m) m.envMapIntensity = 0.15;
      if (wasTransmissive) {
        m.transparent = true;
        m.opacity = Math.min(m.opacity || 0.35, 0.35);
        m.depthWrite = false;
      }
      if (!m.transparent) {
        m.side = THREE.FrontSide;
      }
      m.needsUpdate = true;
    });
  });
}

function normalizeGLB(
  root,
  {
    targetHeight = null,
    targetWidth = null,
    targetDepth = null,
    targetMax = null,
    groundY = 0,
    centerY = false,
    darken = 0.80
  } = {}
) {
  const wrapper = new THREE.Group();
  root.updateMatrixWorld(true);
  const box3 = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box3.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  let scale = 1;
  if (targetMax && maxDim > 0.0001) scale = targetMax / maxDim;
  else if (targetHeight && size.y > 0.0001) scale = targetHeight / size.y;
  else if (targetWidth && size.x > 0.0001) scale = targetWidth / size.x;
  else if (targetDepth && size.z > 0.0001) scale = targetDepth / size.z;

  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(root);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  root.position.set(
    root.position.x - scaledCenter.x,
    root.position.y - (centerY ? scaledCenter.y : scaledBox.min.y) + groundY,
    root.position.z - scaledCenter.z
  );

  gradeModel(root, { darken });
  wrapper.add(root);
  return wrapper;
}

function safeLoadGLB(url, E) {
  if (
    typeof window === 'undefined' ||
    typeof XMLHttpRequest === 'undefined' ||
    (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST))
  ) {
    return Promise.reject(new Error('Test or non-browser environment'));
  }
  if (typeof E?.loadGLB === 'function') {
    return E.loadGLB(url);
  }
  return new Promise((resolve, reject) => {
    try {
      const loader = new GLTFLoader();
      if (MeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load(url, resolve, undefined, reject);
    } catch (err) {
      reject(err);
    }
  });
}

function emitProgress(loaded, total, label) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 100;
    window.dispatchEvent(
      new CustomEvent('ctc:basement-progress', {
        detail: { loaded, total, pct, label }
      })
    );
  } catch (_) {}
}

export function buildBasement(E) {
  if (E._basementBuilt) return;
  E._basementBuilt = true;

  const { S, add, interact, anim, ref } = E;
  const solid = E.solid ? E.solid.bind(E) : () => {};
  const roomWidth = E.W ?? 8.4;
  const roomHeight = E.H ?? 3.4;
  const roomDepth = E.D ?? 10.0;

  // Neutralize default shell meshes/lights created by engine.js
  if (Array.isArray(S?.children)) {
    const toRemove = [];
    for (const child of S.children) {
      if (child === E.cam || child?.isCamera) continue;
      if (child.isLight) {
        child.intensity = 0;
        if (child.castShadow) child.castShadow = false;
      } else if (child.isMesh || child.isGroup) {
        child.visible = false;
        toRemove.push(child);
      }
    }
    toRemove.forEach((child) => S.remove?.(child));
  }

  S.background = new THREE.Color(0x050406);
  S.fog = new THREE.FogExp2(0x050406, 0.068);

  // Calibrate player torch for intimate Resident Evil cellar shadows (prevents washing out 10m room)
  if (E.flashlight) {
    E.flashlight.color?.setHex?.(0xfff0da);
    E.flashlight.intensity = 10.5;
    E.flashlight.distance = 18;
    E.flashlight.angle = Math.PI / 5.2;
    E.flashlight.penumbra = 0.68;
    E.flashlight.decay = 1.55;
    E._flashBaseIntensity = 10.5;
  }

  // Photorealistic procedural fbm bump-mapped PBR materials from texControl.js
  const concreteEndMat = createPbrMaterial(concreteWall, { c: 0x1b1d22, m: 0.08, r: 0.94 }, { repeat: [3, 2], bumpScale: 0.045, roughness: 0.94, metalness: 0.08 });
  const rustSteelMat = createPbrMaterial(rustMetal, { c: 0x3b2c23, m: 0.42, r: 0.86 }, { repeat: [2, 2], bumpScale: 0.03, roughness: 0.86, metalness: 0.42 });
  const diamondIronMat = createPbrMaterial(diamondPlateFloor, { c: 0x1e2126, m: 0.55, r: 0.72 }, { repeat: [2, 2], bumpScale: 0.025, roughness: 0.72, metalness: 0.55 });
  const darkIron = mat({ c: 0x16181d, m: 0.56, r: 0.72 });
  const primerRed = mat({ c: 0x691d1d, r: 0.72 });
  const puddleMat = new THREE.MeshStandardMaterial({
    color: 0x0b0c10,
    transparent: true,
    opacity: 0.34,
    roughness: 0.14,
    metalness: 0.4,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });
  const incidentSheetMat = createIncidentSheetMaterial();
  const crtLeft = createAnimatedCrtScreen('seismic');
  const crtMid = createAnimatedCrtScreen('cctv');
  const crtRight = createAnimatedCrtScreen('pressure');
  const crtTerm = createAnimatedCrtScreen('terminal');
  const deckGreenMat = mat({ c: 0x0b2615, e: 0x267540, ei: 0.7, r: 0.4 });
  const deckAmberMat = mat({ c: 0x291a08, e: 0xb86d24, ei: 0.7, r: 0.4 });
  const crimsonEmissive = mat({ c: 0x2e0606, e: 0xe62929, ei: 1.5, r: 0.35 });
  const redGlowTex = createRedGlowTexture();
  const blueSparkTex = createBlueSparkTexture();
  const lightHaloGroup = new THREE.Group();
  lightHaloGroup.userData.np = 1;
  S.add(lightHaloGroup);

  let voltageSagUntil = 0;
  let hatchBangUntil = 0;
  let fuseArcUntil = 0;
  let grateLungeUntil = 0;
  let crtGlitchUntil = 0;
  const rackDannueMats = [];
  const rackLedEntries = [];

  // Low-poly invisible hitbox registry (12 tris per hitbox -> zero high-poly GLB raycast overhead)
  const hitboxGroup = new THREE.Group();
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  S.add(hitboxGroup);

  const registerHitbox = (id, w, h, d, x, y, z, rotY = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitboxMat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.userData.id = id;
    delete mesh.userData.np;
    hitboxGroup.add(mesh);
    if (Array.isArray(E._pick)) E._pick.push(mesh);
    return mesh;
  };

  const registerVisualOnly = (root, id, { skipInteractCall = false } = {}) => {
    if (!skipInteractCall) interact(root, id);
    root.traverse((m) => {
      if (!m.isMesh) return;
      m.userData.id = id;
      m.userData.np = 1;
      if (E._byId) {
        const arr = (E._byId[id] ??= []);
        if (!arr.includes(m)) arr.push(m);
      }
    });
  };

  const attachChild = (parent, child, id, { skipInteractCall = false } = {}) => {
    parent.add(child);
    child.traverse((m) => {
      if (!m.isMesh) return;
      m.castShadow = false;
      m.receiveShadow = false;
    });
    if (id) registerVisualOnly(child, id, { skipInteractCall });
  };

  // --------------------------------------------------------------------------
  // 1. COLLISION SOLIDS — Low 8.4m x 3.4m x 10.0m Cellar (X ∈ [-4.2, 4.2], Z ∈ [-5.0, 5.0])
  // --------------------------------------------------------------------------
  // South Bulkhead flanks
  solid(-4.25, -1.05, 4.7, 5.15);
  solid(1.05, 4.25, 4.7, 5.15);
  // West Wing
  solid(-4.15, -3.05, 2.85, 4.45);   // South-West shelving
  solid(-4.15, -2.85, 0.05, 1.55);   // Server Rack + Rack Door
  solid(-4.15, -2.75, -2.65, -1.25); // Maintenance Terminal desk
  solid(-4.15, -1.75, -4.75, -3.8);  // North-West barrel row
  // North Hero Wall
  solid(-1.45, 1.45, -4.75, -3.55);  // Containment Console
  // East Wing
  solid(3.05, 4.15, 2.55, 4.7);      // South-East barrel row
  solid(2.95, 4.15, -0.35, 1.35);    // Workbench + Toolbox + Cutters
  solid(3.05, 4.15, -2.65, -1.0);    // East shelving
  solid(1.75, 4.15, -4.75, -3.8);    // North-East interactive barrels

  // --------------------------------------------------------------------------
  // 2. END-CAP CONCRETE WALLS + FALLBACK SHELL + HORROR DECALS
  // --------------------------------------------------------------------------
  const fallbackRoom = new THREE.Group();
  fallbackRoom.userData.np = 1;
  fallbackRoom.add(
    box(roomWidth, 0.1, roomDepth, concreteEndMat, 0, -0.05, 0),
    box(roomWidth, 0.1, roomDepth, darkIron, 0, roomHeight + 0.05, 0),
    box(roomWidth, roomHeight, 0.14, concreteEndMat, 0, roomHeight / 2, -5.08),
    box(0.14, roomHeight, roomDepth, concreteEndMat, -4.28, roomHeight / 2, 0),
    box(0.14, roomHeight, roomDepth, concreteEndMat, 4.28, roomHeight / 2, 0)
  );
  fallbackRoom.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
  S.add(fallbackRoom);

  const southBulkhead = new THREE.Group();
  southBulkhead.userData.np = 1;
  southBulkhead.add(
    box(3.35, roomHeight, 0.28, concreteEndMat, -2.62, roomHeight / 2, 5.02),
    box(3.35, roomHeight, 0.28, concreteEndMat, 2.62, roomHeight / 2, 5.02),
    box(2.15, roomHeight - 2.42, 0.28, concreteEndMat, 0, 2.42 + (roomHeight - 2.42) / 2, 5.02)
  );
  const ironTrim = new THREE.Group();
  ironTrim.add(
    box(0.18, 2.46, 0.34, diamondIronMat, -1.03, 1.23, 4.95),
    box(0.18, 2.46, 0.34, diamondIronMat, 1.03, 1.23, 4.95),
    box(2.24, 0.18, 0.34, diamondIronMat, 0, 2.44, 4.95),
    box(0.22, roomHeight, 0.3, rustSteelMat, -2.25, roomHeight / 2, 4.9),
    box(0.22, roomHeight, 0.3, rustSteelMat, 2.25, roomHeight / 2, 4.9)
  );
  mergeStaticChildren(southBulkhead);
  mergeStaticChildren(ironTrim);
  southBulkhead.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
  ironTrim.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
  freezeStatic(southBulkhead);
  freezeStatic(ironTrim);
  S.add(southBulkhead, ironTrim);

  const northWall = new THREE.Group();
  northWall.userData.np = 1;
  northWall.add(
    box(roomWidth, roomHeight, 0.24, concreteEndMat, 0, roomHeight / 2, -5.02),
    box(0.24, roomHeight, 0.32, diamondIronMat, -1.78, roomHeight / 2, -4.86),
    box(0.24, roomHeight, 0.32, diamondIronMat, 1.78, roomHeight / 2, -4.86),
    box(3.8, 0.2, 0.32, rustSteelMat, 0, 2.98, -4.86)
  );
  mergeStaticChildren(northWall);
  northWall.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
  freezeStatic(northWall);
  S.add(northWall);

  // Visceral blood splatters, drag/claw gouges & dusty corner cobwebs (all grouped under S)
  const horrorDecalGroup = new THREE.Group();
  horrorDecalGroup.userData.np = 1;
  const cobwebGroup = new THREE.Group();
  cobwebGroup.userData.np = 1;
  let sealUnderGlowMat = null;

  if (!isTestEnv()) {
    try {
      // Wet arterial blood pools & radiating claw marks around subterranean floor_seal (0, 0, 0.3)
      horrorDecalGroup.add(
        createDecalMesh(TX.bloodPool(1), 1.38, 1.38, [-0.52, 0.011, 0.72], [-Math.PI / 2, 0, 0.4], { r: 0.18, m: 0.12, pf: -3, o: 0.9 }),
        createDecalMesh(TX.bloodPool(2), 1.12, 1.12, [0.58, 0.012, -0.22], [-Math.PI / 2, 0, -1.1], { r: 0.18, m: 0.12, pf: -3, o: 0.86 }),
        createDecalMesh(TX.clawMarks(1), 0.96, 0.96, [-0.88, 0.013, -0.25], [-Math.PI / 2, 0, -0.6], { pf: -4, o: 0.9 }),
        createDecalMesh(TX.clawMarks(2), 0.96, 0.96, [0.85, 0.013, 0.82], [-Math.PI / 2, 0, 2.4], { pf: -4, o: 0.9 }),
        createDecalMesh(TX.clawMarks(3), 0.92, 0.92, [0.05, 0.013, 1.24], [-Math.PI / 2, 0, 0.12], { pf: -4, o: 0.88 })
      );

      if (redGlowTex) {
        sealUnderGlowMat = new THREE.MeshBasicMaterial({
          map: redGlowTex,
          color: 0xff241c,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const sealGlowDisc = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 2.75), sealUnderGlowMat);
        sealGlowDisc.position.set(0, 0.015, 0.3);
        sealGlowDisc.rotation.x = -Math.PI / 2;
        sealGlowDisc.userData.np = 1;
        horrorDecalGroup.add(sealGlowDisc);
      }

      // South Bulkhead beside room_door: frantic bloody handprints & claw scratches
      horrorDecalGroup.add(
        createDecalMesh(TX.handprint(1), 0.34, 0.5, [-1.26, 1.38, 4.85], [0, Math.PI, 0.12], { pf: -4, o: 0.9 }),
        createDecalMesh(TX.handprint(2), 0.34, 0.5, [1.24, 1.24, 4.85], [0, Math.PI, -0.14], { pf: -4, o: 0.88 }),
        createDecalMesh(TX.clawMarks(2), 0.82, 0.82, [-1.35, 1.56, 4.84], [0, Math.PI, 0.18], { pf: -3, o: 0.86 })
      );

      // Bare wall stretches on West, East & North concrete walls (clear of GLBs)
      horrorDecalGroup.add(
        createDecalMesh(TX.bloodWall(1), 1.3, 1.3, [-4.16, 1.55, 2.45], [0, Math.PI / 2, 0.06], { pf: -3, o: 0.86 }),
        createDecalMesh(TX.clawMarks(3), 0.92, 0.92, [-4.15, 1.62, -3.15], [0, Math.PI / 2, -0.15], { pf: -4, o: 0.88 }),
        createDecalMesh(TX.bloodWall(2), 1.28, 1.28, [4.16, 1.58, 2.55], [0, -Math.PI / 2, -0.05], { pf: -3, o: 0.84 }),
        createDecalMesh(TX.clawMarks(4), 0.88, 0.88, [4.15, 1.52, -0.55], [0, -Math.PI / 2, 0.2], { pf: -4, o: 0.86 }),
        createDecalMesh(TX.handprint(3), 0.32, 0.48, [4.14, 1.35, 1.35], [0, -Math.PI / 2, -0.1], { pf: -4, o: 0.88 }),
        createDecalMesh(TX.bloodWall(3), 1.25, 1.25, [1.38, 1.65, -4.85], [0, 0, -0.08], { pf: -3, o: 0.85 }),
        createDecalMesh(TX.bloodWall(4), 1.18, 1.18, [-1.42, 1.55, -4.85], [0, 0, 0.09], { pf: -3, o: 0.82 })
      );

      // 8 translucent dusty cobwebs tucked in upper corners & shelving
      const webTex = TX.web();
      [
        { pos: [-3.95, 2.75, -4.55], rot: [0, Math.PI / 4, 0], size: [1.05, 1.05] },
        { pos: [3.95, 2.75, -4.55], rot: [0, -Math.PI / 4, 0], size: [1.05, 1.05] },
        { pos: [-3.95, 2.75, 4.55], rot: [0, (3 * Math.PI) / 4, 0], size: [1.05, 1.05] },
        { pos: [3.95, 2.75, 4.55], rot: [0, (-3 * Math.PI) / 4, 0], size: [1.05, 1.05] },
        { pos: [-3.85, 2.68, 2.05], rot: [0, Math.PI / 2, 0], size: [0.9, 0.9] },
        { pos: [3.85, 2.68, -0.8], rot: [0, -Math.PI / 2, 0], size: [0.9, 0.9] },
        { pos: [3.55, 1.92, -1.25], rot: [0, -Math.PI / 3, 0], size: [0.72, 0.72] },
        { pos: [-3.5, 1.92, 3.1], rot: [0, Math.PI / 3, 0], size: [0.72, 0.72] }
      ].forEach((w) => {
        cobwebGroup.add(
          createDecalMesh(webTex, w.size[0], w.size[1], w.pos, w.rot, {
            r: 0.98,
            m: 0,
            pf: -1,
            o: 0.34,
            side: THREE.DoubleSide
          })
        );
      });
    } catch (_) {}
  }
  freezeStatic(horrorDecalGroup);
  freezeStatic(cobwebGroup);
  S.add(horrorDecalGroup, cobwebGroup);

  // Asset streaming progress tracker (15 GLBs)
  const TOTAL_GLBS = 15;
  let loadedCount = 0;
  emitProgress(0, TOTAL_GLBS, 'Initializing basement...');
  const loadAsset = (filename, label) =>
    safeLoadGLB(`${MODEL_BASE}/${filename}`, E)
      .then((gltf) => {
        loadedCount++;
        emitProgress(loadedCount, TOTAL_GLBS, label);
        return gltf;
      })
      .catch((err) => {
        loadedCount++;
        emitProgress(loadedCount, TOTAL_GLBS, label);
        throw err;
      });

  // --------------------------------------------------------------------------
  // 3. SHELL GLB — Real Photorealistic Concrete Cellar Shell + Low Ceiling Beams
  // --------------------------------------------------------------------------
  registerHitbox('pipes', 0.42, 2.8, 0.65, -3.98, 1.48, 2.2);
  const pipeRiserGroup = new THREE.Group();
  pipeRiserGroup.add(
    cylinder(0.06, 0.06, 3.0, 10, rustSteelMat, -3.98, 1.5, 2.2),
    cylinder(0.045, 0.045, 2.2, 10, darkIron, -3.98, 2.95, 1.15)
  );
  pipeRiserGroup.children[1].rotation.x = Math.PI / 2;
  mergeStaticChildren(pipeRiserGroup);
  registerVisualOnly(pipeRiserGroup, 'pipes');
  freezeStatic(pipeRiserGroup);
  S.add(pipeRiserGroup);

  const shellPromise = loadAsset('shell.glb', 'Factory cellar architecture')
    .then((gltf) => {
      const shell = gltf.scene;
      gradeModel(shell, { darken: 0.72 });
      shell.scale.set(1.02, 0.78, 0.66);
      shell.position.set(0, 0, 0);

      shell.traverse((child) => {
        if (!child.isMesh) return;
        const cleanName = (child.name || '').toLowerCase().replace(/\./g, '');
        if (!SHELL_KEEP_NAMES.has(cleanName)) {
          child.visible = false;
          child.userData.np = 1;
          return;
        }
        child.userData.np = 1;
        if (cleanName.startsWith('factory_tube_')) {
          child.userData.id = 'pipes';
          if (E._byId) {
            const arr = (E._byId.pipes ??= []);
            if (!arr.includes(child)) arr.push(child);
          }
        }
      });

      freezeStatic(shell);
      add(shell, { noShadow: true });
      E.retire?.(fallbackRoom);
    })
    .catch((err) => {
      console.warn('[BASEMENT] shell.glb failed; keeping procedural shell', err);
    });

  // --------------------------------------------------------------------------
  // 4. SOUTH ENTRY WALL — DOOR (Inside Pivot), EXIT BEACON, INTERCOM (R1-09)
  // --------------------------------------------------------------------------
  registerHitbox('room_door', 1.88, 2.38, 0.45, 0, 1.19, 4.82);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.92, 0, 4.92);
  S.add(doorPivot);
  ref.roomDoor = {
    isOpen: false,
    group: doorPivot,
    set open(v) { this.isOpen = Boolean(v); }
  };

  const doorFallback = new THREE.Group();
  const doorLeaf = box(1.86, 2.38, 0.14, diamondIronMat, 0.92, 1.19, 0);
  const doorWheel = cylinder(0.22, 0.22, 0.08, 12, rustSteelMat, 1.35, 1.2, -0.09);
  doorWheel.rotation.x = Math.PI / 2;
  doorFallback.add(doorLeaf, doorWheel);
  attachChild(doorPivot, doorFallback, 'room_door', { skipInteractCall: true });

  const doorPromise = loadAsset('room_door.glb', 'Bunker bulkhead door')
    .then((gltf) => {
      const doorGLB = normalizeGLB(gltf.scene, { targetHeight: 2.36, groundY: 0, darken: 0.78 });
      doorGLB.position.set(0.92, 0, 0.25);
      doorGLB.rotation.y = Math.PI;
      attachChild(doorPivot, doorGLB, 'room_door', { skipInteractCall: true });
      E.retire?.(doorFallback);
    })
    .catch(() => {});

  const exitPromise = loadAsset('exit_light.glb', 'Emergency exit beacon')
    .then((gltf) => {
      const exitGLB = normalizeGLB(gltf.scene, { targetMax: 0.52, centerY: true, darken: 0.9 });
      exitGLB.position.set(0, 2.58, 4.8);
      exitGLB.rotation.y = Math.PI / 2;
      exitGLB.traverse((m) => {
        if (m.isMesh) {
          m.userData.np = 1;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mt) => {
            if (mt?.emissive) {
              mt.emissive.setHex(0xb82020);
              mt.emissiveIntensity = 0.9;
            }
          });
        }
      });
      freezeStatic(exitGLB);
      S.add(exitGLB);
    })
    .catch(() => {});

  const intercomConduit = cylinder(0.018, 0.018, 1.75, 6, rustSteelMat, 1.55, 2.45, 4.85);
  intercomConduit.userData.np = 1;
  freezeStatic(intercomConduit);
  S.add(intercomConduit);

  const intercomLed = box(0.034, 0.034, 0.034, crimsonEmissive, 1.55, 1.7, 4.82);
  intercomLed.userData.np = 1;
  S.add(intercomLed);
  E.glow?.(crimsonEmissive, 1.4, (t) => 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 3.1)));

  let intercomHalo = null;
  if (redGlowTex) {
    intercomHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: redGlowTex,
        color: 0xff2222,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    intercomHalo.position.set(1.55, 1.7, 4.79);
    intercomHalo.scale.set(0.28, 0.28, 1);
    intercomHalo.userData.np = 1;
    lightHaloGroup.add(intercomHalo);
  }

  registerHitbox('intercom', 0.42, 0.52, 0.24, 1.55, 1.44, 4.82);
  const intercomProc = new THREE.Group();
  intercomProc.position.set(1.55, 1.44, 4.84);
  intercomProc.add(box(0.32, 0.42, 0.1, rustSteelMat, 0, 0, 0));
  mergeStaticChildren(intercomProc);
  registerVisualOnly(intercomProc, 'intercom');
  S.add(intercomProc);

  const intercomPromise = loadAsset('intercom.glb', 'Wall intercom')
    .then((gltf) => {
      const intercomGLB = normalizeGLB(gltf.scene, { targetMax: 0.4, centerY: true, darken: 0.85 });
      intercomGLB.position.set(1.55, 1.44, 4.84);
      intercomGLB.rotation.y = Math.PI;
      registerVisualOnly(intercomGLB, 'intercom');
      freezeStatic(intercomGLB);
      S.add(intercomGLB);
      E.retire?.(intercomProc);
    })
    .catch(() => {});

  // --------------------------------------------------------------------------
  // 5. CENTER FLOOR — RATTLING FLOOR SEAL (XK01), CANDLES, CHAINS, PUDDLES, VOLUMETRIC LAMPS & STROBE
  // --------------------------------------------------------------------------
  registerHitbox('floor_seal', 2.25, 0.28, 2.25, 0, 0.14, 0.3);
  const sealVisualGroup = new THREE.Group();
  sealVisualGroup.position.set(0, 0, 0.3);
  S.add(sealVisualGroup);

  const floorSealProc = new THREE.Group();
  floorSealProc.position.set(0, 0.01, 0);
  floorSealProc.add(cylinder(1.05, 1.08, 0.06, 24, diamondIronMat, 0, 0.03, 0));
  floorSealProc.add(cylinder(0.88, 0.88, 0.08, 24, rustSteelMat, 0, 0.04, 0));
  mergeStaticChildren(floorSealProc);
  registerVisualOnly(floorSealProc, 'floor_seal');
  sealVisualGroup.add(floorSealProc);

  const floorSealPromise = loadAsset('floor_seal.glb', 'Subterranean floor hatch')
    .then((gltf) => {
      const sealGLB = normalizeGLB(gltf.scene, { targetWidth: 2.15, groundY: 0, darken: 0.78 });
      sealGLB.position.set(0, -0.02, 0);
      registerVisualOnly(sealGLB, 'floor_seal');
      sealVisualGroup.add(sealGLB);
      E.retire?.(floorSealProc);
    })
    .catch(() => {});

  const hazardRingMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 2.65), createHazardRingMaterial());
  hazardRingMesh.position.set(0, 0.008, 0.3);
  hazardRingMesh.rotation.x = -Math.PI / 2;
  hazardRingMesh.userData.np = 1;
  freezeStatic(hazardRingMesh);
  S.add(hazardRingMesh);

  // 6 melted-wax vigil candles flanking floor_seal + West terminal + North console + East workbench (zero extra PointLights)
  const candleGroup = new THREE.Group();
  candleGroup.userData.np = 1;
  const candleWaxGroup = new THREE.Group();
  const candleFlames = [];
  const waxMat = mat({ c: 0xd9ceb2, r: 0.56, e: 0x331b08, ei: 0.42 });
  const candleSpots = [
    { x: -1.24, y: 0, z: -0.35, h: 0.13 },
    { x: -1.34, y: 0, z: 0.52, h: 0.095 },
    { x: -0.96, y: 0, z: 1.26, h: 0.15 },
    { x: 1.24, y: 0, z: -0.35, h: 0.11 },
    { x: 1.34, y: 0, z: 0.52, h: 0.16 },
    { x: 0.96, y: 0, z: 1.26, h: 0.12 },
    { x: 3.36, y: 0.78, z: -0.14, h: 0.12 },  // East workbench corner
    { x: -3.22, y: 0.78, z: -2.42, h: 0.11 }, // West maintenance terminal desk corner
    { x: -1.18, y: 1.01, z: -3.86, h: 0.13 }  // North containment console left corner
  ];
  let candleFlameTex = null;
  let candleGlowTex = null;
  if (!isTestEnv()) {
    try {
      candleFlameTex = TX.flame();
      candleGlowTex = TX.glow('o');
    } catch (_) {}
  }
  candleSpots.forEach((c, idx) => {
    candleWaxGroup.add(
      cylinder(0.022, 0.026, c.h, 10, waxMat, c.x, c.y + c.h / 2, c.z),
      cylinder(0.036, 0.04, 0.015, 10, waxMat, c.x, c.y + 0.008, c.z)
    );
    if (candleFlameTex && candleGlowTex) {
      const fl = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: candleFlameTex,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          fog: false,
          blending: THREE.AdditiveBlending
        })
      );
      fl.position.set(c.x, c.y + c.h + 0.045, c.z);
      fl.scale.set(0.055, 0.11, 1);
      fl.userData.np = 1;
      candleGroup.add(fl);

      const gl = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: candleGlowTex,
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
          fog: false,
          blending: THREE.AdditiveBlending
        })
      );
      gl.position.set(c.x, c.y + c.h + 0.04, c.z);
      gl.scale.set(0.42, 0.42, 1);
      gl.userData.np = 1;
      candleGroup.add(gl);
      candleFlames.push({ fl, gl, seed: 3.7 * idx + 1.1 });
    }
  });
  mergeStaticChildren(candleWaxGroup);
  candleWaxGroup.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
  freezeStatic(candleWaxGroup);
  candleGroup.add(candleWaxGroup);
  S.add(candleGroup);

  // Reflective damp floor puddles
  const puddles = new THREE.Group();
  [
    { x: -0.9, z: 2.4, rx: 0.7, rz: 0.45, r: 0.4 },
    { x: 1.2, z: 1.5, rx: 0.58, rz: 0.42, r: -0.6 },
    { x: -1.15, z: -1.25, rx: 0.72, rz: 0.46, r: 0.9 },
    { x: 1.45, z: -2.4, rx: 0.62, rz: 0.42, r: -0.2 }
  ].forEach((p) => {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 12), puddleMat);
    disc.rotation.set(-Math.PI / 2, 0, p.r);
    disc.scale.set(p.rx, p.rz, 1);
    disc.position.set(p.x, 0.006, p.z);
    puddles.add(disc);
  });
  mergeStaticChildren(puddles);
  puddles.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
  freezeStatic(puddles);
  S.add(puddles);

  const chainsPromise = loadAsset('chains.glb', 'Rusted iron shackles')
    .then((gltf) => {
      const baseChain = normalizeGLB(gltf.scene, { targetMax: 1.35, groundY: 0.01, darken: 0.75 });
      const chainSize = new THREE.Box3().setFromObject(baseChain).getSize(new THREE.Vector3());
      const hangRotFor = (yaw) => (chainSize.x >= chainSize.z ? [0, yaw, Math.PI / 2] : [Math.PI / 2, yaw, 0]);
      [
        { pos: [-1.1, 0.01, 1.1], rot: [0, 0.65, 0] },
        { pos: [1.1, 0.01, -0.5], rot: [0, -0.9, 0] },
        { pos: [-4.05, 1.85, -3.2], rot: [Math.PI / 2, Math.PI / 2, 0] },
        { pos: [4.05, 1.85, -3.2], rot: [Math.PI / 2, -Math.PI / 2, 0] },
        { pos: [-2.45, 2.05, -0.65], rot: hangRotFor(0.2) },
        { pos: [2.45, 2.05, -0.65], rot: hangRotFor(-0.3) },
        { pos: [-2.55, 2.15, 2.25], rot: hangRotFor(0.5) },
        { pos: [2.55, 2.15, 2.25], rot: hangRotFor(-0.4) }
      ].forEach((p, idx) => {
        const inst = idx === 0 ? baseChain : baseChain.clone(true);
        inst.position.set(...p.pos);
        inst.rotation.set(...p.rot);
        inst.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
        freezeStatic(inst);
        S.add(inst);
      });
    })
    .catch(() => {});

  // 2 dark weathered caged ceiling fixtures swaying gently from ceiling beams (zero overhead spotlight cones)
  const centerLampPivot = new THREE.Group();
  centerLampPivot.position.set(0, 3.08, 0.4);
  centerLampPivot.userData.np = 1;
  S.add(centerLampPivot);

  const northStrobePivot = new THREE.Group();
  northStrobePivot.position.set(0, 3.08, -3.3);
  northStrobePivot.userData.np = 1;
  S.add(northStrobePivot);

  const hangingLightPromise = loadAsset('hanging_light.glb', 'Caged cellar lamps')
    .then((gltf) => {
      const baseLamp = normalizeGLB(gltf.scene, { targetMax: 0.64, groundY: 0, darken: 0.65 });
      [centerLampPivot, northStrobePivot].forEach((pivot, idx) => {
        const inst = idx === 0 ? baseLamp : baseLamp.clone(true);
        inst.position.set(0, -0.34, 0);
        inst.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
        pivot.add(inst);
      });
    })
    .catch(() => {});

  // --------------------------------------------------------------------------
  // 6. NORTH HERO WALL — CONTAINMENT CONSOLE (R1-FIN) & COUNTDOWN MONITOR
  // --------------------------------------------------------------------------
  const consoleX = 0;
  const consoleZ = -4.15;
  registerHitbox('containment_console', 2.8, 1.5, 1.15, consoleX, 0.82, consoleZ);

  const consoleDesk = new THREE.Group();
  consoleDesk.position.set(consoleX, 0, consoleZ);
  consoleDesk.add(box(2.68, 0.94, 0.96, diamondIronMat, 0, 0.47, 0));
  consoleDesk.add(box(2.75, 0.1, 1.02, rustSteelMat, 0, 0.96, 0.03));
  const deck = box(2.4, 0.1, 0.42, darkIron, 0, 1.05, 0.22);
  deck.rotation.x = 0.28;
  consoleDesk.add(deck);
  consoleDesk.add(box(0.32, 0.05, 0.08, crimsonEmissive, -0.78, 1.09, 0.24));
  consoleDesk.add(box(0.32, 0.05, 0.08, deckGreenMat, 0.0, 1.09, 0.24));
  consoleDesk.add(box(0.32, 0.05, 0.08, deckAmberMat, 0.78, 1.09, 0.24));
  mergeStaticChildren(consoleDesk);
  registerVisualOnly(consoleDesk, 'containment_console');
  freezeStatic(consoleDesk);
  S.add(consoleDesk);

  const consoleCrtFallback = new THREE.Group();
  consoleCrtFallback.position.set(consoleX, 1.01, consoleZ - 0.12);
  for (let i = -1; i <= 1; i++) {
    const crt = new THREE.Group();
    crt.position.set(i * 0.76, 0, Math.abs(i) * 0.08);
    crt.rotation.y = -i * 0.26;
    crt.add(box(0.54, 0.44, 0.4, diamondIronMat, 0, 0.22, 0));
    crt.add(box(0.4, 0.28, 0.03, i === -1 ? crtLeft.mat : i === 0 ? crtMid.mat : crtRight.mat, 0, 0.23, 0.2));
    consoleCrtFallback.add(crt);
  }
  mergeStaticChildren(consoleCrtFallback);
  registerVisualOnly(consoleCrtFallback, 'containment_console');
  S.add(consoleCrtFallback);

  registerHitbox('wall_monitor', 1.4, 0.8, 0.55, 0, 2.38, -4.66);
  const wallMonitorGroup = new THREE.Group();
  wallMonitorGroup.position.set(0, 2.38, -4.72);
  const monitorFallbackBox = box(1.32, 0.72, 0.3, diamondIronMat, 0, 0, 0);
  attachChild(wallMonitorGroup, monitorFallbackBox, 'wall_monitor');

  const monitorMount = new THREE.Group();
  monitorMount.userData.np = 1;
  monitorMount.add(
    box(0.1, 0.12, 0.48, rustSteelMat, -0.36, 2.38, -4.84),
    box(0.1, 0.12, 0.48, rustSteelMat, 0.36, 2.38, -4.84),
    box(0.08, 0.82, 0.08, rustSteelMat, -0.42, 2.86, -4.76),
    box(0.08, 0.82, 0.08, rustSteelMat, 0.42, 2.86, -4.76)
  );
  mergeStaticChildren(monitorMount);
  monitorMount.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
  freezeStatic(monitorMount);
  S.add(monitorMount);

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    const renderTimer = (text) => {
      if (!ctx) return;
      ctx.fillStyle = '#07080a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 42, 42, 0.16)';
      ctx.fillRect(0, 0, canvas.width, 32);
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CONTAINMENT SEAL TIMER', 256, 23);
      ctx.fillStyle = 'rgba(25, 30, 35, 0.45)';
      for (let y = 36; y < 192; y += 4) ctx.fillRect(0, y, 512, 1.5);
      ctx.fillStyle = '#e5a44c';
      ctx.font = '900 84px "Courier New", monospace';
      ctx.fillText(text || '--:--', 256, 140);
    };
    renderTimer('--:--');
    const countdownTex = new THREE.CanvasTexture(canvas);
    countdownTex.colorSpace = THREE.SRGBColorSpace;
    const countdownScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.48),
      new THREE.MeshBasicMaterial({ map: countdownTex })
    );
    countdownScreen.position.set(0, 0.04, 0.22);
    attachChild(wallMonitorGroup, countdownScreen, 'wall_monitor');
    ref.wallMonitor = {
      setText(t) {
        renderTimer(String(t));
        countdownTex.needsUpdate = true;
      }
    };
  }
  S.add(wallMonitorGroup);

  const monitorPromise = loadAsset('wall_monitor.glb', 'CRT monitors')
    .then((gltf) => {
      const baseTV = normalizeGLB(gltf.scene, { targetMax: 0.56, groundY: 0, darken: 0.8 });
      const crtMats = [crtLeft.mat, crtMid.mat, crtRight.mat];
      for (let i = -1; i <= 1; i++) {
        const crtWrap = new THREE.Group();
        crtWrap.add(baseTV.clone(true));
        const screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.37, 0.26), crtMats[i + 1]);
        screenPlane.position.set(0, 0.31, 0.232);
        crtWrap.add(screenPlane);

        crtWrap.position.set(consoleX + i * 0.76, 1.01, consoleZ - 0.12 + Math.abs(i) * 0.08);
        crtWrap.rotation.y = -i * 0.26;
        registerVisualOnly(crtWrap, 'containment_console');
        freezeStatic(crtWrap);
        S.add(crtWrap);
      }
      E.retire?.(consoleCrtFallback);

      const overheadTV = baseTV.clone(true);
      overheadTV.scale.set(2.0, 1.65, 1.3);
      overheadTV.position.set(0, -0.32, -0.02);
      attachChild(wallMonitorGroup, overheadTV, 'wall_monitor');
      E.retire?.(monitorFallbackBox);
    })
    .catch(() => {});

  // --------------------------------------------------------------------------
  // 7. WEST WING — SW SHELVING, PIPES, SERVER RACK (EK04+XK02), RACK DOOR (R1-10), TERMINAL (EK05)
  // --------------------------------------------------------------------------
  const rackX = -3.55;
  const rackZ = 0.8;
  registerHitbox('server_rack', 1.15, 2.18, 1.35, rackX, 1.09, rackZ);
  const rackProc = new THREE.Group();
  rackProc.position.set(rackX, 0, rackZ);
  rackProc.add(box(0.84, 2.15, 1.2, diamondIronMat, 0, 1.08, 0));
  mergeStaticChildren(rackProc);
  registerVisualOnly(rackProc, 'server_rack');
  S.add(rackProc);

  const rearCables = new THREE.Group();
  rearCables.position.set(-4.1, 0, rackZ);
  for (let i = -2; i <= 2; i++) {
    const cable = cylinder(0.02, 0.02, 1.85, 6, darkIron, 0, 0.92, i * 0.16);
    cable.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.08;
    rearCables.add(cable);
  }
  mergeStaticChildren(rearCables);
  rearCables.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
  freezeStatic(rearCables);
  S.add(rearCables);

  const rackLedGroup = new THREE.Group();
  rackLedGroup.userData.np = 1;
  S.add(rackLedGroup);

  const rackPromise = loadAsset('server_rack.glb', '42U server rack')
    .then((gltf) => {
      const rackGLB = normalizeGLB(gltf.scene, { targetHeight: 2.15, groundY: 0, darken: 0.72 });
      rackGLB.traverse((m) => {
        if (!m.isMesh) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mt) => {
          if (!mt?.emissive) return;
          const mn = (mt.name || '').toLowerCase();
          if (mn.includes('dannue')) {
            mt.emissiveIntensity = 0.32;
            rackDannueMats.push(mt);
          } else {
            mt.emissive.setHex(0x000000);
            mt.emissiveIntensity = 0;
          }
          mt.needsUpdate = true;
        });
      });
      rackGLB.position.set(rackX, 0, rackZ);
      rackGLB.rotation.y = Math.PI;
      rackGLB.updateMatrixWorld(true);
      const rackBox = new THREE.Box3().setFromObject(rackGLB);
      const frontX = rackBox.max.x + 0.008;
      const ledColors = [0x38e57a, 0x38e57a, 0xffaa2a, 0xff2c2c];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const hex = ledColors[(row + col) % ledColors.length];
          const ledMat = new THREE.MeshStandardMaterial({
            color: 0x0b0e10,
            emissive: hex,
            emissiveIntensity: 0.9,
            roughness: 0.35
          });
          const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.022), ledMat);
          led.position.set(frontX, 0.68 + row * 0.44, rackZ - 0.24 + col * 0.16);
          led.userData.np = 1;
          led.castShadow = false;
          led.receiveShadow = false;
          freezeStatic(led);
          rackLedGroup.add(led);
          rackLedEntries.push({
            mat: ledMat,
            speed: 2.1 + ((row * 4 + col) % 5) * 0.95,
            phase: (row * 4 + col) * 1.37
          });
        }
      }
      registerVisualOnly(rackGLB, 'server_rack');
      freezeStatic(rackGLB);
      S.add(rackGLB);
      E.retire?.(rackProc);
    })
    .catch(() => {});

  const rackDoor = new THREE.Group();
  rackDoor.position.set(-2.95, 1.06, 0.02);
  rackDoor.add(
    box(0.82, 1.94, 0.04, diamondIronMat, 0, 0, 0),
    box(0.66, 1.74, 0.046, rustSteelMat, 0, 0, 0.002),
    box(0.06, 0.24, 0.07, darkIron, 0.32, -0.05, 0.03)
  );
  for (let y = -0.74; y <= 0.74; y += 0.16) {
    rackDoor.add(box(0.6, 0.02, 0.015, darkIron, 0, y, 0.03));
  }
  const sheetMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.014), incidentSheetMat);
  sheetMesh.position.set(-0.08, 0.45, 0.036);
  rackDoor.add(sheetMesh);
  rackDoor.rotation.y = Math.PI / 2 - 0.48;
  mergeStaticChildren(rackDoor);
  interact(rackDoor, 'rack_door');
  freezeStatic(rackDoor);
  add(rackDoor);

  const termX = -3.5;
  const termZ = -1.95;
  const termDesk = new THREE.Group();
  termDesk.userData.np = 1;
  termDesk.position.set(termX, 0, termZ);
  termDesk.add(box(1.1, 0.08, 1.38, rustSteelMat, 0, 0.74, 0));
  termDesk.add(box(0.08, 0.74, 0.08, diamondIronMat, -0.45, 0.37, -0.6));
  termDesk.add(box(0.08, 0.74, 0.08, diamondIronMat, 0.45, 0.37, -0.6));
  termDesk.add(box(0.08, 0.74, 0.08, diamondIronMat, -0.45, 0.37, 0.6));
  termDesk.add(box(0.08, 0.74, 0.08, diamondIronMat, 0.45, 0.37, 0.6));
  mergeStaticChildren(termDesk);
  termDesk.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
  freezeStatic(termDesk);
  S.add(termDesk);

  registerHitbox('maintenance_terminal', 0.85, 0.75, 0.85, termX, 1.15, termZ + 0.08);
  const termProc = new THREE.Group();
  termProc.position.set(termX, 0.78, termZ + 0.08);
  termProc.add(box(0.52, 0.46, 0.6, diamondIronMat, 0, 0.23, 0));
  termProc.add(box(0.04, 0.3, 0.44, crtTerm.mat, 0.26, 0.27, 0));
  mergeStaticChildren(termProc);
  registerVisualOnly(termProc, 'maintenance_terminal');
  S.add(termProc);

  const termPromise = loadAsset('maintenance_terminal.glb', 'Maintenance CRT terminal')
    .then((gltf) => {
      const termGLB = normalizeGLB(gltf.scene, { targetMax: 0.76, groundY: 0, darken: 0.8 });
      if (!isTestEnv() && crtTerm.tex) {
        termGLB.traverse((m) => {
          if (!m.isMesh) return;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mt) => {
            const mn = (mt?.name || '').toLowerCase();
            if (mn.includes('screen')) {
              if (mt.map && 'flipY' in mt.map) crtTerm.tex.flipY = mt.map.flipY;
              mt.color?.setHex?.(0xffffff);
              mt.map = crtTerm.tex;
              mt.emissiveMap = crtTerm.tex;
              mt.emissive?.setHex?.(0x88ffaa);
              mt.emissiveIntensity = 0.95;
              mt.roughness = 0.25;
              mt.needsUpdate = true;
            }
          });
        });
      }
      termGLB.position.set(termX, 0.78, termZ + 0.08);
      termGLB.rotation.y = 0;
      registerVisualOnly(termGLB, 'maintenance_terminal');
      freezeStatic(termGLB);
      S.add(termGLB);
      E.retire?.(termProc);
    })
    .catch(() => {});

  // --------------------------------------------------------------------------
  // 8. EAST WING — FUSE BOX, WORKBENCH (TOOLBOX EK06 + CUTTERS), SHELVING, BARRELS
  // --------------------------------------------------------------------------
  const fuseConduit = cylinder(0.022, 0.022, 1.55, 6, rustSteelMat, 4.12, 2.42, 2.0);
  fuseConduit.userData.np = 1;
  freezeStatic(fuseConduit);
  S.add(fuseConduit);

  const fuseSparkGroup = new THREE.Group();
  fuseSparkGroup.position.set(3.94, 1.46, 2.0);
  fuseSparkGroup.visible = false;
  fuseSparkGroup.userData.np = 1;
  if (blueSparkTex) {
    [
      [0, 0.06, -0.05, 0.26],
      [-0.03, -0.04, 0.06, 0.2],
      [0.02, 0.02, 0.01, 0.32]
    ].forEach(([sx, sy, sz, sc]) => {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: blueSparkTex,
          color: 0xaee2ff,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          fog: false,
          blending: THREE.AdditiveBlending
        })
      );
      sp.position.set(sx, sy, sz);
      sp.scale.set(sc, sc, 1);
      sp.userData.np = 1;
      fuseSparkGroup.add(sp);
    });
  }
  S.add(fuseSparkGroup);

  registerHitbox('fuse_box', 0.35, 0.88, 0.65, 4.02, 1.44, 2.0);
  const fuseProc = new THREE.Group();
  fuseProc.position.set(4.06, 1.44, 2.0);
  fuseProc.add(box(0.2, 0.8, 0.54, diamondIronMat, 0, 0, 0));
  mergeStaticChildren(fuseProc);
  registerVisualOnly(fuseProc, 'fuse_box');
  S.add(fuseProc);

  const fusePromise = loadAsset('fuse_box.glb', 'Breaker fuse box')
    .then((gltf) => {
      const fuseGLB = normalizeGLB(gltf.scene, { targetHeight: 0.86, centerY: true, darken: 0.8 });
      fuseGLB.position.set(4.06, 1.44, 2.0);
      fuseGLB.rotation.y = -Math.PI / 2;
      registerVisualOnly(fuseGLB, 'fuse_box');
      freezeStatic(fuseGLB);
      S.add(fuseGLB);
      E.retire?.(fuseProc);
    })
    .catch(() => {});

  // Mechanic's Workbench (3.52, 0, 0.5)
  const benchX = 3.52;
  const benchZ = 0.5;
  const workbench = new THREE.Group();
  workbench.userData.np = 1;
  workbench.position.set(benchX, 0, benchZ);
  workbench.add(box(0.94, 0.08, 1.55, rustSteelMat, 0, 0.74, 0));
  workbench.add(box(0.08, 0.74, 0.08, diamondIronMat, -0.38, 0.37, -0.68));
  workbench.add(box(0.08, 0.74, 0.08, diamondIronMat, 0.38, 0.37, -0.68));
  workbench.add(box(0.08, 0.74, 0.08, diamondIronMat, -0.38, 0.37, 0.68));
  workbench.add(box(0.08, 0.74, 0.08, diamondIronMat, 0.38, 0.37, 0.68));
  mergeStaticChildren(workbench);
  workbench.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
  freezeStatic(workbench);
  S.add(workbench);

  registerHitbox('toolbox', 0.62, 0.5, 0.82, benchX, 1.02, benchZ - 0.14);
  const toolboxProc = new THREE.Group();
  toolboxProc.position.set(benchX, 0.78, benchZ - 0.14);
  toolboxProc.add(box(0.44, 0.36, 0.72, primerRed, 0, 0.18, 0));
  mergeStaticChildren(toolboxProc);
  registerVisualOnly(toolboxProc, 'toolbox');
  S.add(toolboxProc);

  const toolboxPromise = loadAsset('toolbox.glb', 'Mechanics toolbox')
    .then((gltf) => {
      const toolboxGLB = normalizeGLB(gltf.scene, { targetMax: 0.68, groundY: 0, darken: 0.84 });
      toolboxGLB.position.set(benchX, 0.78, benchZ - 0.14);
      toolboxGLB.rotation.y = -Math.PI / 2 + 0.08;
      registerVisualOnly(toolboxGLB, 'toolbox');
      freezeStatic(toolboxGLB);
      S.add(toolboxGLB);
      E.retire?.(toolboxProc);
    })
    .catch(() => {});

  const cuttersPromise = loadAsset('bolt_cutters.glb', 'Bolt cutters')
    .then((gltf) => {
      const cuttersGLB = normalizeGLB(gltf.scene, { targetMax: 0.54, centerY: true, darken: 0.82 });
      cuttersGLB.position.set(benchX - 0.06, 0.8, benchZ + 0.44);
      cuttersGLB.rotation.set(Math.PI / 2, 0.35, 0);
      cuttersGLB.traverse((m) => { if (m.isMesh) m.userData.np = 1; });
      freezeStatic(cuttersGLB);
      S.add(cuttersGLB);
    })
    .catch(() => {});

  // Real shelving.glb along East wall (3.65, 0, -1.8) AND cloned to South-West wall (-3.62, 0, 3.65)
  const shelvingPromise = loadAsset('shelving.glb', 'Industrial shelving')
    .then((gltf) => {
      const shelfGLB = normalizeGLB(gltf.scene, { targetHeight: 2.08, groundY: 0, darken: 0.78 });
      shelfGLB.traverse((m) => {
        if (!m.isMesh) return;
        m.userData.np = 1;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mt) => {
          const mn = (mt?.name || '').toLowerCase();
          if (mn.includes('paper') || mn === 'material') {
            if (mt.color) mt.color.multiplyScalar(0.24);
            mt.roughness = 0.96;
            mt.needsUpdate = true;
          }
        });
      });
      shelfGLB.position.set(3.65, 0, -1.8);
      shelfGLB.rotation.y = -Math.PI / 2;
      freezeStatic(shelfGLB);
      S.add(shelfGLB);

      const shelfSW = shelfGLB.clone(true);
      shelfSW.position.set(-3.62, 0, 3.65);
      shelfSW.rotation.y = Math.PI / 2;
      freezeStatic(shelfSW);
      S.add(shelfSW);
    })
    .catch(() => {});

  // Real barrel.glb along North-East (interactive), North-West, and South-East corners
  registerHitbox('barrels', 2.45, 0.95, 0.72, 2.85, 0.48, -4.32);
  const barrelsProc = new THREE.Group();
  [
    [2.05, 0, -4.32],
    [2.85, 0, -4.32],
    [3.65, 0, -4.32]
  ].forEach(([bx, by, bz]) => {
    barrelsProc.add(cylinder(0.28, 0.28, 0.88, 12, rustSteelMat, bx, by + 0.44, bz));
  });
  mergeStaticChildren(barrelsProc);
  registerVisualOnly(barrelsProc, 'barrels');
  S.add(barrelsProc);

  const barrelPromise = loadAsset('barrel.glb', 'Sealed storage barrels')
    .then((gltf) => {
      const barrelsNE = normalizeGLB(gltf.scene, { targetHeight: 0.88, groundY: 0, darken: 0.8 });
      barrelsNE.position.set(2.85, 0, -4.32);
      barrelsNE.rotation.y = Math.PI / 2;
      registerVisualOnly(barrelsNE, 'barrels');
      freezeStatic(barrelsNE);
      S.add(barrelsNE);
      E.retire?.(barrelsProc);

      // North-West decorative clone
      const barrelsNW = barrelsNE.clone(true);
      barrelsNW.position.set(-2.85, 0, -4.32);
      barrelsNW.rotation.y = Math.PI / 2;
      barrelsNW.traverse((m) => { if (m.isMesh) { m.userData.np = 1; delete m.userData.id; } });
      freezeStatic(barrelsNW);
      S.add(barrelsNW);

      // South-East decorative clone (slightly compact scale so it clears South bulkhead & fuse_box)
      const barrelsSE = barrelsNE.clone(true);
      barrelsSE.scale.setScalar(0.92);
      barrelsSE.position.set(3.65, 0, 3.6);
      barrelsSE.rotation.y = 0;
      barrelsSE.traverse((m) => { if (m.isMesh) { m.userData.np = 1; delete m.userData.id; } });
      freezeStatic(barrelsSE);
      S.add(barrelsSE);
    })
    .catch(() => {});

  Promise.allSettled([
    shellPromise, doorPromise, exitPromise, floorSealPromise, chainsPromise,
    rackPromise, monitorPromise, termPromise, intercomPromise, fusePromise,
    toolboxPromise, cuttersPromise, barrelPromise, shelvingPromise, hangingLightPromise
  ]).then(() => {
    emitProgress(TOTAL_GLBS, TOTAL_GLBS, 'Basement sector ready');
  });

  // --------------------------------------------------------------------------
  // 9. 3 SLEEK TEXTURED ENVIRONMENTAL FIXTURES (flavor_valve, flavor_breaker, flavor_grate)
  // --------------------------------------------------------------------------
  const valveGroup = new THREE.Group();
  valveGroup.position.set(-3.86, 1.38, 2.2);
  valveGroup.add(cylinder(0.032, 0.032, 0.14, 8, diamondIronMat, -0.06, 0, 0));
  const valveWheel = new THREE.Group();
  valveWheel.add(cylinder(0.2, 0.2, 0.035, 10, primerRed, 0, 0, 0));
  valveWheel.add(box(0.36, 0.035, 0.035, primerRed, 0, 0, 0));
  valveWheel.add(box(0.035, 0.035, 0.36, primerRed, 0, 0, 0));
  valveWheel.rotation.z = Math.PI / 2;
  valveGroup.add(valveWheel);
  interact(valveGroup, 'flavor_valve');
  add(valveGroup);

  const breakerGroup = new THREE.Group();
  breakerGroup.position.set(-1.62, 1.44, 4.84);
  breakerGroup.rotation.y = Math.PI / 2;
  breakerGroup.add(box(0.14, 0.46, 0.32, rustSteelMat, 0, 0, 0));
  const breakerHandle = new THREE.Group();
  breakerHandle.position.set(-0.08, 0.05, 0);
  breakerHandle.add(box(0.04, 0.24, 0.06, primerRed, 0, 0.1, 0));
  breakerHandle.rotation.z = 0.45;
  breakerGroup.add(breakerHandle);
  interact(breakerGroup, 'flavor_breaker');
  add(breakerGroup);

  const grateGroup = new THREE.Group();
  grateGroup.position.set(0, 0.015, -2.05);
  grateGroup.add(box(1.05, 0.03, 1.05, diamondIronMat, 0, 0, 0));
  for (let gx = -0.36; gx <= 0.36; gx += 0.12) {
    grateGroup.add(box(0.035, 0.045, 0.88, rustSteelMat, gx, 0.01, 0));
  }
  mergeStaticChildren(grateGroup);
  grateGroup.traverse((m) => { if (m.isMesh) freezeStatic(m); });
  interact(grateGroup, 'flavor_grate');

  const pitBack = new THREE.Mesh(
    new THREE.PlaneGeometry(0.84, 0.84),
    new THREE.MeshBasicMaterial({ color: 0x020203 })
  );
  pitBack.rotation.x = -Math.PI / 2;
  pitBack.position.set(0, -0.015, 0);
  pitBack.userData.np = 1;
  freezeStatic(pitBack);
  grateGroup.add(pitBack);

  let grateFaceMesh = null;
  if (!isTestEnv()) {
    try {
      const faceTex = new THREE.CanvasTexture(X.faceC({ eye: '#d8e8ff', glow: true, mouth: true, seed: 4 }));
      faceTex.colorSpace = THREE.SRGBColorSpace;
      grateFaceMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.58, 0.72),
        new THREE.MeshBasicMaterial({
          map: faceTex,
          transparent: true,
          opacity: 0.24,
          depthWrite: false
        })
      );
      grateFaceMesh.rotation.x = -Math.PI / 2;
      grateFaceMesh.position.set(0, -0.008, 0);
      grateFaceMesh.userData.np = 1;
      grateGroup.add(grateFaceMesh);
    } catch (_) {}
  }
  add(grateGroup);

  // --------------------------------------------------------------------------
  // 10. SOFT VOLUMETRIC STEAM, BREACH MIST & AMBIENT ASH MOTES
  // --------------------------------------------------------------------------
  let dustSpriteTex = null;
  if (!isTestEnv()) {
    try { dustSpriteTex = TX.dust(); } catch (_) {}
  }

  const steam = new THREE.Group();
  steam.position.set(-3.86, 1.54, 2.2);
  for (let i = 0; i < 12; i++) {
    const p = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dustSpriteTex,
        color: 0xc2ccd0,
        transparent: true,
        opacity: 0.11,
        depthWrite: false
      })
    );
    p.scale.setScalar(0.24);
    p.userData.np = 1;
    steam.add(p);
  }
  S.add(steam);

  const sealMistGroup = new THREE.Group();
  sealMistGroup.position.set(0, 0.04, 0.3);
  sealMistGroup.userData.np = 1;
  for (let i = 0; i < 12; i++) {
    const p = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dustSpriteTex,
        color: 0xcc3c3c,
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    const angle = (i / 12) * Math.PI * 2;
    const rad = 0.85 + (i % 3) * 0.16;
    p.position.set(Math.cos(angle) * rad, (i % 4) * 0.2, Math.sin(angle) * rad);
    p.scale.setScalar(0.45);
    p.userData.np = 1;
    p.userData.angle = angle;
    p.userData.rad = rad;
    sealMistGroup.add(p);
  }
  S.add(sealMistGroup);

  // Keep ambientAsh independent of E._dustPoints so particles stay alive in ECO mode
  const ashCount = 48;
  const ashGeo = new THREE.BufferGeometry();
  const ashPos = new Float32Array(ashCount * 3);
  for (let i = 0; i < ashCount; i++) {
    ashPos[i * 3] = (Math.random() - 0.5) * 7.8;
    ashPos[i * 3 + 1] = 0.25 + Math.random() * 2.65;
    ashPos[i * 3 + 2] = (Math.random() - 0.5) * 9.2;
  }
  ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
  const ambientAsh = new THREE.Points(
    ashGeo,
    new THREE.PointsMaterial({
      map: dustSpriteTex,
      color: 0xdecbb5,
      size: 0.055,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  ambientAsh.userData.np = 1;
  S.add(ambientAsh);

  // --------------------------------------------------------------------------
  // 11. CANDLE-FIRST HORROR LIGHTING (No Shadow Maps, Candle Pool Lights + Torch)
  // --------------------------------------------------------------------------
  const ambLight = new THREE.HemisphereLight(0x3a201b, 0x080608, 0.24);
  S.add(ambLight);

  const candlePoolLight = new THREE.PointLight(0xff8430, 6.2, 8.5, 1.7);
  candlePoolLight.position.set(0, 0.72, 0.3);
  S.add(candlePoolLight);
  E.lightRig?.(candlePoolLight, 6.2, (t) => {
    const now = performance.now();
    if (now < voltageSagUntil) return 0.22 + 0.12 * Math.sin(t * 22);
    return 0.82 + 0.18 * Math.sin(t * 6.8) * Math.cos(t * 3.7);
  });

  const benchCandleLight = new THREE.PointLight(0xff8a36, 2.5, 4.8, 1.8);
  benchCandleLight.position.set(3.28, 1.02, -0.05);
  S.add(benchCandleLight);
  E.lightRig?.(benchCandleLight, 2.5, (t) => 0.8 + 0.2 * Math.sin(t * 7.4 + 1.3));

  const emergencyBeacon = new THREE.PointLight(0xb81a1a, 2.8, 6.8, 1.85);
  emergencyBeacon.position.set(0, 2.15, -4.1);
  S.add(emergencyBeacon);
  E.lightRig?.(emergencyBeacon, 2.8, (t) => {
    if (performance.now() < voltageSagUntil) return 0.5 + 0.4 * Math.sin(t * 3.6);
    const wave = 0.5 + 0.5 * Math.sin(t * 1.8);
    return 0.52 + 0.48 * (wave * wave);
  });

  const sealBreachLight = new THREE.PointLight(0xb81212, 2.0, 3.8, 1.9);
  sealBreachLight.position.set(0, 0.24, 0.3);
  S.add(sealBreachLight);
  E.lightRig?.(sealBreachLight, 2.0, (t) => {
    if (performance.now() < hatchBangUntil) return 2.4;
    return 0.58 + 0.42 * Math.sin(t * 1.9);
  });

  let valveSpinTimer = 0;

  if (typeof window !== 'undefined') {
    window.__triggerBasementFlavor = (id) => {
      const now = performance.now();
      if (id === 'flavor_valve') {
        valveSpinTimer = 1.8;
      } else if (id === 'flavor_breaker') {
        breakerHandle.rotation.z = breakerHandle.rotation.z > 0 ? -0.45 : 0.45;
        voltageSagUntil = now + 950;
        fuseArcUntil = now + 450;
      } else if (id === 'flavor_grate') {
        grateLungeUntil = now + 580;
        E.shake?.(0.45, 0.45);
      }
    };
  }

  // --------------------------------------------------------------------------
  // 12. TEXTURED APPARITION, CRT UPDATER & REPEATABLE PARANORMAL DIRECTOR
  // --------------------------------------------------------------------------
  let figureTex = null;
  if (!isTestEnv()) {
    try {
      figureTex = new THREE.CanvasTexture(X.figureC());
      figureTex.colorSpace = THREE.SRGBColorSpace;
    } catch (_) {}
  }

  const shadowMat = new THREE.MeshBasicMaterial({
    map: figureTex,
    color: figureTex ? 0xffffff : 0x050608,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const shadowEntity = new THREE.Group();
  const bodyMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 2.15), shadowMat);
  shadowEntity.add(bodyMesh);
  shadowEntity.position.set(-2.55, 1.06, -0.45);
  shadowEntity.visible = false;
  shadowEntity.traverse((m) => { m.userData.np = 1; });
  S.add(shadowEntity);

  const scaresState = {
    t0: performance.now(),
    nextHatchAt: performance.now() + 12000,
    nextFuseAt: performance.now() + 16000,
    nextCrtGlitchAt: performance.now() + 14000,
    nextPeekAt: performance.now() + 31000,
    nextBrownoutAt: performance.now() + 48000,
    fired: { hatchThud: false, voltageSag: false }
  };

  let peekPhase = 'idle'; // 'idle' | 'waiting' | 'caught' | 'fading' | 'brownout'
  let peekUntil = 0;
  let peekOrigin = [-2.55, 1.06, -0.45];
  let crtAccum = 0;
  let crtTick = 0;
  const crtScreens = [crtLeft, crtMid, crtRight, crtTerm];

  const PEEK_ALCOVES = [
    [-2.55, 1.06, -0.45],
    [2.35, 1.06, -3.55],
    [-2.15, 1.06, -3.65],
    [2.65, 1.06, 2.75]
  ];

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const dispatchScare = (type) => {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('ctc:basement-scare', { detail: { type } }));
    } catch (_) {}
  };

  anim((t, dt) => {
    const stepDt = dt || 0.016;
    const now = performance.now();

    const targetDoorAngle = ref.roomDoor.isOpen ? -Math.PI * 0.52 : 0;
    if (Math.abs(doorPivot.rotation.y - targetDoorAngle) > 0.004) {
      doorPivot.rotation.y += (targetDoorAngle - doorPivot.rotation.y) * Math.min(1, stepDt * 5);
    }

    if (valveSpinTimer > 0) {
      valveSpinTimer = Math.max(0, valveSpinTimer - stepDt);
      valveWheel.rotation.x += stepDt * 8;
    }

    // Subterranean hatch physical rattle during floor_seal bangs
    if (!prefersReducedMotion && now < hatchBangUntil) {
      const k = (hatchBangUntil - now) / 420;
      sealVisualGroup.position.set(
        (Math.random() - 0.5) * 0.026 * k,
        Math.abs(Math.sin(t * 58)) * 0.012 * k,
        0.3 + (Math.random() - 0.5) * 0.026 * k
      );
    } else if (sealVisualGroup.position.y !== 0 || sealVisualGroup.position.x !== 0) {
      sealVisualGroup.position.set(0, 0, 0.3);
    }

    // Drainage grate creature lunge
    if (grateFaceMesh) {
      if (!prefersReducedMotion && now < grateLungeUntil) {
        const p = Math.sin(((grateLungeUntil - now) / 580) * Math.PI);
        grateFaceMesh.position.y = -0.008 + 0.053 * p;
        grateFaceMesh.material.opacity = 0.24 + 0.72 * p;
      } else {
        grateFaceMesh.position.y = -0.008;
        grateFaceMesh.material.opacity = 0.24;
      }
    }

    // Swaying weathered ceiling cages + subtle candle & intercom glow
    if (!prefersReducedMotion) {
      centerLampPivot.rotation.z = Math.sin(t * 0.85) * 0.032;
      centerLampPivot.rotation.x = Math.cos(t * 0.62) * 0.018;
      northStrobePivot.rotation.z = Math.sin(t * 0.72 + 1.1) * 0.024;

      if (intercomHalo) intercomHalo.material.opacity = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(t * 3.1));
      if (sealUnderGlowMat) {
        sealUnderGlowMat.opacity = now < hatchBangUntil ? 0.62 : 0.18 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.9));
      }

      // Candle flames flicker gently
      candleFlames.forEach(({ fl, gl, seed }) => {
        const fq = 0.82 + 0.18 * Math.sin(t * 7.8 + seed) * Math.cos(t * 4.3 + seed * 1.3);
        fl.scale.set(0.052 * (0.88 + 0.2 * fq), 0.11 * (0.86 + 0.28 * fq), 1);
        gl.material.opacity = 0.44 * fq;
      });

      // Server rack Dannue pulse & asynchronous blinking telemetry LEDs
      rackDannueMats.forEach((mt, idx) => {
        mt.emissiveIntensity = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(t * 1.9 + idx));
      });
      rackLedEntries.forEach((entry) => {
        entry.mat.emissiveIntensity = Math.sin(t * entry.speed + entry.phase) > -0.15 ? 1.15 : 0.12;
      });

      // Fuse box spark burst
      fuseSparkGroup.visible = now < fuseArcUntil;
      if (fuseSparkGroup.visible) {
        fuseSparkGroup.rotation.z = t * 18;
      }

      // Soft volumetric steam plume
      const steamBoost = valveSpinTimer > 0 ? 2.2 : 1.0;
      steam.children.forEach((p, i) => {
        const life = ((t * 0.24 * steamBoost + i / 12) % 1);
        p.position.set(
          Math.sin(t * 0.9 + i) * 0.05 + life * 0.16,
          life * 1.35,
          Math.cos(t * 0.7 + i) * 0.04
        );
        const sc = 0.18 + life * 0.42;
        p.scale.set(sc, sc, 1);
        p.material.opacity = Math.sin(life * Math.PI) * (valveSpinTimer > 0 ? 0.24 : 0.14);
      });

      // Subterranean floor seal mist
      const bangActive = now < hatchBangUntil;
      sealMistGroup.children.forEach((p, i) => {
        const life = ((t * (bangActive ? 0.55 : 0.16) + i / 12) % 1);
        const r = p.userData.rad + life * 0.18;
        const a = p.userData.angle + t * 0.15;
        p.position.set(Math.cos(a) * r, life * 0.85, Math.sin(a) * r);
        const sc = 0.36 + life * 0.42;
        p.scale.set(sc, sc, 1);
        p.material.opacity = Math.sin(life * Math.PI) * (bangActive ? 0.22 : 0.085);
      });

      // Ambient floating ash motes (visible in both ECO & HIGH modes)
      const pos = ashGeo.attributes.position.array;
      for (let i = 0; i < ashCount; i++) {
        pos[i * 3] += Math.sin(t * 0.55 + i) * 0.0008;
        pos[i * 3 + 1] -= 0.0014;
        if (pos[i * 3 + 1] < 0.25) pos[i * 3 + 1] = 2.95;
      }
      ashGeo.attributes.position.needsUpdate = true;

      // Round-robin live CRT updates (~5-6 Hz per screen, negligible CPU)
      crtAccum += stepDt;
      if (crtAccum >= 0.045) {
        crtAccum = 0;
        const scr = crtScreens[crtTick % crtScreens.length];
        crtTick++;
        const spike = now < hatchBangUntil ? 0.9 : 0;
        const glitch = now < crtGlitchUntil;
        scr.update(t, spike, glitch);
      }
    }

    if (prefersReducedMotion) return;

    const modalOpen = typeof document !== 'undefined' && Boolean(document.querySelector('[role="dialog"]'));
    const px = E.px ? E.px() : 0;
    const pz = E.pz ? E.pz() : 3.8;
    const yaw = E.yaw ? E.yaw() : 0;

    // Apparition state machine runs smoothly once visible
    if (shadowEntity.visible) {
      const sx = shadowEntity.position.x;
      const sz = shadowEntity.position.z;
      const lookYaw = Math.atan2((E.cam?.position?.x ?? px) - sx, (E.cam?.position?.z ?? pz) - sz);
      shadowEntity.rotation.y = lookYaw;

      if (peekPhase === 'waiting') {
        const dx = sx - px;
        const dz = sz - pz;
        const dist = Math.hypot(dx, dz) || 1;
        const fwdX = -Math.sin(yaw);
        const fwdZ = -Math.cos(yaw);
        const dot = (dx * fwdX + dz * fwdZ) / dist;
        if (dot > 0.9 || dist < 2.6) {
          peekPhase = 'caught';
          peekUntil = now + 620;
          voltageSagUntil = Math.max(voltageSagUntil, now + 380);
          dispatchScare('peek');
        } else if (now >= peekUntil) {
          peekPhase = 'fading';
          peekUntil = now + 280;
        }
      } else if (peekPhase === 'caught' && now >= peekUntil) {
        peekPhase = 'fading';
        peekUntil = now + 280;
      } else if (peekPhase === 'fading') {
        const rem = Math.max(0, (peekUntil - now) / 280);
        shadowMat.opacity = 0.92 * rem;
        shadowEntity.position.x = peekOrigin[0] + (1 - rem) * (peekOrigin[0] < 0 ? -0.45 : 0.45);
        if (rem <= 0) {
          shadowEntity.visible = false;
          shadowMat.opacity = 0.92;
          peekPhase = 'idle';
        }
      } else if (peekPhase === 'brownout' && now >= peekUntil) {
        shadowEntity.visible = false;
        shadowMat.opacity = 0.92;
        peekPhase = 'idle';
      }
    }

    if (modalOpen) return;

    // 1. Subterranean Hatch Bang (starts 12s, repeats every 18-28s)
    if (now >= scaresState.nextHatchAt) {
      scaresState.nextHatchAt = now + 18000 + Math.random() * 10000;
      hatchBangUntil = now + 420;
      E.shake?.(0.24, 0.28);
      dispatchScare('hatchBang');
    }

    // 2. Fuse Box Electrical Arc (starts 16s, repeats every 15-24s)
    if (now >= scaresState.nextFuseAt) {
      scaresState.nextFuseAt = now + 15000 + Math.random() * 9000;
      fuseArcUntil = now + 260;
      dispatchScare('fuseArc');
    }

    // 3. Center CCTV Ghost Glitch near North Console
    if (now >= scaresState.nextCrtGlitchAt) {
      scaresState.nextCrtGlitchAt = now + 14000 + Math.random() * 8000;
      if (Math.hypot(px, pz + 4.15) < 4.6) {
        crtGlitchUntil = now + 420;
      }
    }

    const elapsed = (now - scaresState.t0) / 1000;
    if (elapsed < 30) return;

    // 4. Sight-Reactive Apparition Peek (strictly >= 30s grace, repeats every 28-44s)
    if (peekPhase === 'idle' && now >= scaresState.nextPeekAt) {
      scaresState.nextPeekAt = now + 28000 + Math.random() * 16000;
      const candidates = PEEK_ALCOVES.filter(([ax, , az]) => Math.hypot(ax - px, az - pz) >= 3.3);
      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        peekOrigin = chosen.slice();
        shadowEntity.position.set(...peekOrigin);
        shadowMat.opacity = 0.92;
        shadowEntity.visible = true;
        peekPhase = 'waiting';
        peekUntil = now + 9000;
      }
    }

    // 5. Dramatic Power Brownout Scare (strictly >= 48s grace, repeats every 55-75s)
    if (now >= scaresState.nextBrownoutAt) {
      scaresState.nextBrownoutAt = now + 55000 + Math.random() * 20000;
      voltageSagUntil = now + 2300;
      fuseArcUntil = now + 360;
      dispatchScare('brownout');
      if (peekPhase === 'idle') {
        peekOrigin = [0.85, 1.06, -3.45];
        shadowEntity.position.set(...peekOrigin);
        shadowMat.opacity = 0.9;
        shadowEntity.visible = true;
        peekPhase = 'brownout';
        peekUntil = now + 950;
      }
    }
  });

  E.triggerBasementScare = (type) => {
    const elapsed = (performance.now() - scaresState.t0) / 1000;
    if (elapsed < 30 || prefersReducedMotion) return;
    if (type === 'hatchThud' && !scaresState.fired.hatchThud) {
      scaresState.fired.hatchThud = true;
      hatchBangUntil = performance.now() + 420;
      E.shake?.(0.45, 0.45);
    } else if (type === 'voltageSag' && !scaresState.fired.voltageSag) {
      scaresState.fired.voltageSag = true;
      voltageSagUntil = performance.now() + 1400;
    }
  };
}

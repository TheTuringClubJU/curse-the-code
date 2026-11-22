import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Modular GLB Architectural Grid & Interactive Door System for Room 6 (The Anointing Vault).
 * Replaces procedural box shells with snapped 2.0m PSX Dungeon, Hell Temple, and Industrial GLB kits.
 */

export const VAULT_MODEL_BASE = '/assets/models/vault';

export function fitModelToHeight(model, targetHeight) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const scale = size.y > 0.001 ? targetHeight / size.y : 1;
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);
  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  model.position.y -= scaledBox.min.y;
  model.updateMatrixWorld(true);
  return model;
}

/**
 * Scales and centers a GLB inside an outer pivot Group so calling
 * pivot.position.set(...) / pivot.rotation.y NEVER overwrites grounding or XZ centering.
 */
export function fitAndPivotModel(model, targetHeight = null, { extraScale = 1, anchor = 'bottom' } = {}) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  let scale = targetHeight && size.y > 0.001 ? targetHeight / size.y : 1;
  if (extraScale && extraScale !== 1) scale *= extraScale;
  if (scale !== 1) {
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
  }

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);
  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  if (anchor === 'top') {
    model.position.y -= scaledBox.max.y;
  } else if (anchor === 'center') {
    model.position.y -= scaledCenter.y;
  } else {
    model.position.y -= scaledBox.min.y;
  }
  model.updateMatrixWorld(true);

  const pivot = new THREE.Group();
  pivot.add(model);
  pivot.updateMatrixWorld(true);
  return pivot;
}

/**
 * Computes true animated world-space Box3 for SkinnedMeshes (whose static geometry
 * bind-pose bounds are frequently scaled 0.001x–0.1x or offset by bone rest poses).
 */
export function computeAnimatedBox3(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  let sampled = false;
  root.traverse((obj) => {
    if (obj.isSkinnedMesh && obj.skeleton && obj.geometry?.attributes?.position) {
      obj.skeleton.update();
      const pos = obj.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 450));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i);
        obj.applyBoneTransform(i, v);
        v.applyMatrix4(obj.matrixWorld);
        box.expandByPoint(v);
        sampled = true;
      }
    } else if (obj.isMesh && !obj.isSkinnedMesh) {
      box.expandByObject(obj);
      sampled = true;
    }
  });
  return sampled ? box : new THREE.Box3().setFromObject(root);
}

/**
 * Clones, normalizes animated SkinnedMesh scale to exact `targetHeight`, and grounds cleanly on `y = 0`.
 */
export function fitAndPivotSkinnedModel(gltf, targetHeight, { extraScale = 1, anchor = 'bottom' } = {}) {
  const model = SkeletonUtils.clone(gltf.scene);
  let scratchMixer = null;
  if (gltf.animations && gltf.animations.length > 0) {
    scratchMixer = new THREE.AnimationMixer(model);
    scratchMixer.clipAction(gltf.animations[0]).play();
    scratchMixer.update(0.12);
  }

  const box = computeAnimatedBox3(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  let scale = targetHeight && size.y > 0.0005 ? targetHeight / size.y : 1;
  if (extraScale && extraScale !== 1) scale *= extraScale;
  if (scale !== 1) {
    model.scale.multiplyScalar(scale);
  }

  const scaledBox = computeAnimatedBox3(model);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);
  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  if (anchor === 'top') {
    model.position.y -= scaledBox.max.y;
  } else if (anchor === 'center') {
    model.position.y -= scaledCenter.y;
  } else {
    model.position.y -= scaledBox.min.y;
  }
  model.updateMatrixWorld(true);

  if (scratchMixer) {
    scratchMixer.stopAllAction();
    scratchMixer.uncacheRoot(model);
  }

  const pivot = new THREE.Group();
  pivot.add(model);
  pivot.updateMatrixWorld(true);
  return pivot;
}

export function normalizeModelMaterials(
  root,
  { crtMap = null, screenNames = [], psx = false, npAll = false, albedoLift = 0.0 } = {}
) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    if (npAll) obj.userData.np = true;

    let containsScreen = false;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (!m) return;
      const matName = (m.name || '').toLowerCase();
      if ('transmission' in m) m.transmission = 0;
      if ('thickness' in m) m.thickness = 0;

      const isScreen = screenNames.some((s) => matName.includes(s));
      const isGlass = matName.includes('glass');
      const isFlameOrBulb =
        matName.includes('flame') || matName.includes('bulb') || matName.includes('lamp');

      if (isScreen && crtMap) {
        containsScreen = true;
        m.map = crtMap;
        m.emissiveMap = crtMap;
        m.emissive = new THREE.Color(0xffffff);
        m.emissiveIntensity = 1.1;
        m.roughness = 0.25;
        m.userData.noEmissiveHl = true;
        m.needsUpdate = true;
      } else if (isGlass) {
        containsScreen = true;
        m.transparent = true;
        m.opacity = 0.34;
        m.roughness = 0.16;
        m.depthWrite = false;
        m.userData.noEmissiveHl = true;
        m.needsUpdate = true;
      } else if (isFlameOrBulb) {
        containsScreen = true;
        m.emissive = new THREE.Color(0xffba66);
        m.emissiveIntensity = 1.28;
        m.userData.noEmissiveHl = true;
      } else {
        ['map', 'normalMap', 'roughnessMap'].forEach((k) => {
          const tx = m[k];
          if (tx) {
            tx.magFilter = THREE.LinearFilter;
            tx.minFilter = THREE.LinearMipmapLinearFilter;
            tx.anisotropy = 2;
            tx.needsUpdate = true;
          }
        });
        if (m.color) {
          const hsl = { h: 0, s: 0, l: 0 };
          m.color.getHSL(hsl);
          // Prevent dark-stained wood/steel assets from crushing to pure black bricks in low light
          if (albedoLift > 0 && hsl.l < albedoLift) {
            m.color.setHSL(hsl.h, Math.min(hsl.s, 0.38), albedoLift);
          } else if (psx) {
            // Shift cold PSX dungeon/temple atlas masonry toward weathered tarnished sepia-brown
            if (hsl.s > 0.34 || hsl.l > 0.58) {
              m.color.setHSL(hsl.h, Math.min(hsl.s, 0.28), Math.min(hsl.l, 0.52));
            }
            m.color.multiply(new THREE.Color(0xc29874));
          }
        }
        if (m.roughness !== undefined) m.roughness = Math.max(m.roughness, psx ? 0.78 : 0.54);
        if (m.metalness !== undefined && psx) m.metalness = Math.min(m.metalness, 0.16);
      }
    });

    if (containsScreen) obj.userData.np = true;
  });
}

export function createVaultArchitecture(E, { matLancet, pushStatic }) {
  const { S, loadGLB, solid, removeSolid, anim, audio, ref } = E;
  const protoPromises = new Map();

  const assetTracker = {
    total: 0,
    loaded: 0,
    isReady: false,
    track(p) {
      assetTracker.total++;
      p.finally(() => {
        assetTracker.loaded++;
        const pct = assetTracker.total > 0 ? Math.min(100, Math.round((assetTracker.loaded / assetTracker.total) * 100)) : 100;
        if (assetTracker.loaded >= assetTracker.total && assetTracker.total >= 8) {
          assetTracker.isReady = true;
        }
        ref?.onLoadProgress?.(pct, assetTracker.loaded, assetTracker.total);
        if (assetTracker.isReady) {
          ref?.onLoadComplete?.();
        }
      });
      return p;
    },
  };
  ref.assetTracker = assetTracker;

  const loadCached = (relPath, opts = { psx: true, npAll: true }) => {
    const key = `${relPath}|${Boolean(opts.psx)}|${opts.albedoLift || 0}`;
    if (!protoPromises.has(key)) {
      const loaderPromise = loadGLB(`${VAULT_MODEL_BASE}/${relPath}`)
        .then((gltf) => {
          if (!gltf?.scene) return null;
          normalizeModelMaterials(gltf.scene, opts);
          return gltf;
        })
        .catch(() => null);
      const p = opts.trackBoot ? assetTracker.track(loaderPromise) : loaderPromise;
      protoPromises.set(key, p);
    }
    return protoPromises.get(key);
  };

  const freezeStatic = (node) => {
    node.updateMatrix();
    node.matrixAutoUpdate = false;
    node.traverse((c) => {
      c.updateMatrix();
      c.matrixAutoUpdate = false;
    });
  };

  // Batched InstancedMesh wall/bay collector — collapses ~160+ modular wall draw calls into ~6 GPU draw calls with 100% identical geometry & textures
  const wallBatches = new Map();
  let wallFlushScheduled = false;
  const _mWorld = new THREE.Matrix4();
  const _mFinal = new THREE.Matrix4();
  const _qRot = new THREE.Quaternion();
  const _vPos = new THREE.Vector3();
  const _vScale = new THREE.Vector3();
  const _eul = new THREE.Euler();

  const flushWallBatches = () => {
    wallFlushScheduled = false;
    for (const [key, batch] of wallBatches.entries()) {
      wallBatches.delete(key);
      const { relPath, opts, items } = batch;
      loadCached(relPath, opts).then((gltf) => {
        if (!gltf?.scene || !items.length) return;
        const proto = gltf.scene;
        proto.updateMatrixWorld(true);
        const meshes = [];
        let hasSkinned = false;
        proto.traverse((c) => {
          if (c.isSkinnedMesh) hasSkinned = true;
          else if (c.isMesh && c.geometry) meshes.push(c);
        });
        if (hasSkinned || meshes.length === 0) {
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const inst = proto.clone();
            inst.position.set(it.x, it.y, it.z);
            inst.rotation.y = it.ry;
            inst.scale.set(it.sx, it.sy, it.sz);
            freezeStatic(inst);
            S.add(inst);
          }
          return;
        }
        for (let mIdx = 0; mIdx < meshes.length; mIdx++) {
          const src = meshes[mIdx];
          const im = new THREE.InstancedMesh(src.geometry, src.material, items.length);
          im.castShadow = false;
          im.receiveShadow = false;
          im.userData.np = true;
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            _vPos.set(it.x, it.y, it.z);
            _eul.set(0, it.ry, 0);
            _qRot.setFromEuler(_eul);
            _vScale.set(it.sx, it.sy, it.sz);
            _mWorld.compose(_vPos, _qRot, _vScale);
            _mFinal.multiplyMatrices(_mWorld, src.matrixWorld);
            im.setMatrixAt(i, _mFinal);
          }
          im.instanceMatrix.needsUpdate = true;
          im.computeBoundingSphere();
          im.updateMatrix();
          im.matrixAutoUpdate = false;
          S.add(im);
        }
      });
    }
  };

  const queueWallInstance = (relPath, x, y, z, ry, sx, sy, sz, opts = { psx: true, npAll: true, trackBoot: true }) => {
    const key = `${relPath}|${Boolean(opts.psx)}|${opts.albedoLift || 0}`;
    let batch = wallBatches.get(key);
    if (!batch) {
      batch = { relPath, opts, items: [] };
      wallBatches.set(key, batch);
    }
    batch.items.push({ x, y, z, ry, sx, sy, sz });
    if (!wallFlushScheduled) {
      wallFlushScheduled = true;
      Promise.resolve().then(flushWallBatches);
    }
  };

  // Snap a single 2m modular bay (width = 2m, height = 3m -> scaled by scaleY)
  const placeModularBay = (relPath, x, y, z, ry = 0, scale = [1, 1, 1], opts = { psx: true, npAll: true, trackBoot: true }) => {
    queueWallInstance(relPath, x, y, z, ry, scale[0], scale[1], scale[2], opts);
  };

  // Tile a floor span in clean 2m x 2m modular GLB tiles
  const buildModularFloor = (relPath, x0, x1, z0, z1, y = 0, yOffset = 0, ryStep = 0) => {
    const nx = Math.max(1, Math.round((x1 - x0) / 2.0));
    const nz = Math.max(1, Math.round((z1 - z0) / 2.0));
    const dx = (x1 - x0) / nx;
    const dz = (z1 - z0) / nz;
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        queueWallInstance(
          relPath,
          x0 + (ix + 0.5) * dx,
          y + yOffset,
          z0 + (iz + 0.5) * dz,
          ryStep ? ((ix + iz) % 2) * ryStep : 0,
          dx / 2.0,
          1,
          dz / 2.0,
          { psx: true, npAll: true, trackBoot: false }
        );
      }
    }
  };

  // Build stacked wall rows (handles multi-tier gothic walls + stained lancet windows cleanly)
  const buildWallRun = (relPath, start, end, yBase, tiers = 1, tierHeight = 3.0, ry = 0, skipIndices = []) => {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const len = Math.hypot(dx, dz);
    const count = Math.max(1, Math.round(len / 2.0));
    const sx = (len / count) / 2.0;
    const sy = tierHeight / 3.0;
    const ux = dx / count;
    const uz = dz / count;
    const angle = ry !== null ? ry : Math.atan2(dx, dz) + Math.PI / 2;

    for (let i = 0; i < count; i++) {
      if (skipIndices.includes(i)) continue;
      const px = start[0] + (i + 0.5) * ux;
      const pz = start[1] + (i + 0.5) * uz;
      for (let t = 0; t < tiers; t++) {
        queueWallInstance(relPath, px, yBase + t * tierHeight, pz, angle, sx, sy, 1.15, {
          psx: true,
          npAll: true,
          trackBoot: true,
        });
      }
    }
  };

  // Add luminous crimson lancet window GLB + stained-glass backing + floor moon-wash
  const placeLancetWindow = (x, y, z, ry = 0, scaleY = 1.08, washDx = 0, washDz = 0) => {
    placeModularBay('temple/glb/wall_window_lancet.glb', x, y, z, ry, [1, scaleY, 1.2]);
    const backDist = -0.18;
    const gx = x + Math.sin(ry) * backDist;
    const gz = z + Math.cos(ry) * backDist;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 2.55 * scaleY), matLancet);
    glass.position.set(gx, y + 1.52 * scaleY, gz);
    glass.rotation.y = ry;
    glass.userData.np = true;
    S.add(glass);

    if (washDx !== 0 || washDz !== 0) {
      const wash = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 3.8),
        new THREE.MeshBasicMaterial({
          color: 0x7e1d26,
          transparent: true,
          opacity: 0.13,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        })
      );
      wash.rotation.x = -Math.PI / 2;
      wash.rotation.z = ry;
      wash.position.set(x + washDx, 0.022, z + washDz);
      S.add(wash);
    }
  };

  // ── Ground & Ceiling Sub-Floor Seal Planes (guarantees zero void flicker while GLBs stream) ──
  const buildRoomFloors = (materials) => {
    const { matFlagstone, matConcrete, matCeilingStone } = materials;
    // Sub-grade foundation planes act as the primary seamless PBR stone floors (eliminates ~150 redundant tiled floor GLB draw calls for smooth low-end PC performance)
    pushStatic(new THREE.PlaneGeometry(7.2, 9.6), matFlagstone, 0, 0, 12.1, -Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(17.4, 17.4), matFlagstone, 0, 0, -1.0, -Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(8.8, 12.6), matFlagstone, -12.85, 0, 0, -Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(8.8, 12.6), matFlagstone, 12.85, 0, 0, -Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(4.4, 5.8), matConcrete, -5.5, 0, 10.9, -Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(3.8, 5.4), matConcrete, 12.9, 0, 8.65, -Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(6.0, 5.4), matFlagstone, -13.3, 0, -8.75, -Math.PI / 2, 0, 0);

    // Dark Cathedral Ceilings
    pushStatic(new THREE.PlaneGeometry(7.6, 9.8), matCeilingStone, 0, 5.85, 12.1, Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(17.6, 17.6), matCeilingStone, 0, 9.25, -1.0, Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(8.8, 12.6), matCeilingStone, -12.85, 6.2, 0, Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(8.8, 12.6), matCeilingStone, 12.85, 6.2, 0, Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(4.6, 6.0), matCeilingStone, -5.5, 5.85, 10.9, Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(4.0, 5.6), matCeilingStone, 12.9, 4.95, 8.65, Math.PI / 2, 0, 0);
    pushStatic(new THREE.PlaneGeometry(6.2, 5.6), matCeilingStone, -13.3, 5.65, -8.75, Math.PI / 2, 0, 0);
  };

  // ── Assemble ALL 6 Vault Chambers from Modular 2m GLBs ──
  const buildAllSixChambers = () => {
    // Exterior matte void-sealing curtain behind lancets/joints so no black tear ever shows at oblique angles
    const matShellBack = new THREE.MeshStandardMaterial({ color: 0x221712, roughness: 0.96 });
    const addBacking = (x, y, z, w, h, d) => {
      pushStatic(new THREE.BoxGeometry(w, h, d), matShellBack, x, y, z);
    };

    // ─── 6A GRAND NARTHEX & HOLDING CELL (x: -3.2..3.2, z: 7.5..16.5, Cell x: -7.5..-3.3) ───
    addBacking(0, 2.9, 16.75, 7.6, 6.0, 0.25);
    addBacking(3.55, 2.9, 12.1, 0.25, 6.0, 9.8);
    addBacking(-7.75, 2.9, 10.9, 0.25, 6.0, 6.4);
    addBacking(-5.5, 2.9, 7.85, 4.8, 6.0, 0.25);
    addBacking(-5.5, 2.9, 13.95, 4.8, 6.0, 0.25);

    buildWallRun('dungeon/glb/wall_stone.glb', [-3.2, 16.45], [3.2, 16.45], 0, 2, 2.95, 0); // South entry wall
    buildWallRun('dungeon/glb/wall_stone.glb', [3.25, 8.0], [3.25, 16.4], 0, 2, 2.95, -Math.PI / 2); // East Narthex
    buildWallRun('dungeon/glb/wall_rough.glb', [-7.55, 8.2], [-7.55, 13.6], 0, 2, 2.95, Math.PI / 2); // Cell West
    buildWallRun('dungeon/glb/wall_rough.glb', [-7.4, 8.15], [-3.4, 8.15], 0, 2, 2.95, 0); // Cell North
    buildWallRun('dungeon/glb/wall_rough.glb', [-7.4, 13.65], [-3.4, 13.65], 0, 2, 2.95, Math.PI); // Cell South
    buildWallRun('dungeon/glb/wall_stone.glb', [-3.35, 13.8], [-3.35, 16.4], 0, 2, 2.95, Math.PI / 2); // SW Wall below cell
    // Holding Cell Front: iron bar modules flanking animated cell door
    placeModularBay('dungeon/glb/wall_bars_door.glb', -3.35, 0, 9.2, Math.PI / 2, [0.95, 1.08, 1]);
    placeModularBay('dungeon/glb/wall_bars_door.glb', -3.35, 0, 12.6, Math.PI / 2, [0.95, 1.08, 1]);
    placeModularBay('dungeon/glb/wall_post_stone.glb', 3.1, 0, 16.3, 0, [1.2, 1.9, 1.2]);
    placeModularBay('dungeon/glb/wall_post_stone.glb', -3.1, 0, 16.3, 0, [1.2, 1.9, 1.2]);

    // ─── 6A -> 6B THRESHOLD AIRLOCK (z: 6.1..8.5, open x: -1.4..1.4) ───
    buildWallRun('temple/glb/wall_temple.glb', [-8.4, 7.45], [-1.8, 7.45], 0, 3, 3.05, Math.PI);
    buildWallRun('temple/glb/wall_temple.glb', [1.8, 7.45], [8.4, 7.45], 0, 3, 3.05, Math.PI);
    placeModularBay('temple/glb/wall_doorway_temple.glb', 0, 0, 7.48, 0, [1.55, 1.28, 1.85]);
    buildWallRun('temple/glb/wall_temple.glb', [-1.8, 7.45], [1.8, 7.45], 3.85, 2, 2.7, Math.PI);
    addBacking(0, 6.6, 7.55, 4.2, 5.2, 0.3);

    // ─── 6B CENTRAL SANCTUARY NAVE (x: -8.5..8.5, z: -9.5..7.5, H=9.2m) ───
    addBacking(0, 4.6, -9.7, 17.8, 9.4, 0.25);
    addBacking(-8.7, 4.6, -5.6, 0.25, 9.4, 7.8);
    addBacking(-8.7, 4.6, 4.6, 0.25, 9.4, 6.2);
    addBacking(8.7, 4.6, -5.6, 0.25, 9.4, 7.8);
    addBacking(8.7, 4.6, 4.6, 0.25, 9.4, 6.2);

    // North Apse Wall: Lower solid temple wall + Clerestory Lancets (x: -5.2, 0, +5.2) + Upper frieze
    buildWallRun('temple/glb/wall_temple.glb', [-8.4, -9.45], [8.4, -9.45], 0, 1, 3.3, 0);
    [-5.2, 0, 5.2].forEach((lx) => placeLancetWindow(lx, 3.3, -9.42, 0, 1.15, 0, 2.35));
    [-7.3, -2.6, 2.6, 7.3].forEach((sx) =>
      placeModularBay('temple/glb/wall_temple.glb', sx, 3.3, -9.42, 0, [1.12, 1.15, 1.15])
    );
    buildWallRun('temple/glb/wall_temple.glb', [-8.4, -9.45], [8.4, -9.45], 6.75, 1, 2.5, 0);

    // West Nave Wall (`x = -8.45`): Gap at z: -1.4..1.4 into 6C Scriptorium + Clerestory Lancets
    buildWallRun('temple/glb/wall_temple.glb', [-8.45, -9.3], [-8.45, -1.6], 0, 1, 3.3, Math.PI / 2);
    buildWallRun('temple/glb/wall_temple.glb', [-8.45, 1.6], [-8.45, 7.4], 0, 1, 3.3, Math.PI / 2);
    placeModularBay('temple/glb/wall_doorway_temple.glb', -8.45, 0, 0, Math.PI / 2, [1.65, 1.25, 1.65]);
    [-5.6, 4.8].forEach((wz) => placeLancetWindow(-8.42, 3.3, wz, Math.PI / 2, 1.12, 2.1, 0));
    [-8.2, -3.0, 0, 2.4, 6.8].forEach((wz) =>
      placeModularBay('temple/glb/wall_temple.glb', -8.42, 3.3, wz, Math.PI / 2, [1.05, 1.12, 1.15])
    );
    buildWallRun('temple/glb/wall_temple.glb', [-8.45, -9.3], [-8.45, 7.4], 6.75, 1, 2.5, Math.PI / 2);

    // East Nave Wall (`x = +8.45`): Breached Industrial Transition at z: -1.5..1.5 into 6D Switchgear!
    buildWallRun('temple/glb/wall_temple.glb', [8.45, -9.3], [8.45, -1.6], 0, 1, 3.3, -Math.PI / 2);
    buildWallRun('temple/glb/wall_temple.glb', [8.45, 1.6], [8.45, 7.4], 0, 1, 3.3, -Math.PI / 2);
    placeModularBay('temple/glb/wall_breach.glb', 8.45, 0, -1.65, 0, [1.45, 1.25, 1.15]);
    placeModularBay('temple/glb/wall_breach.glb', 8.45, 0, 1.65, Math.PI, [1.45, 1.25, 1.15]);
    [-5.6, 4.8].forEach((wz) => placeLancetWindow(8.42, 3.3, wz, -Math.PI / 2, 1.12, -2.1, 0));
    [-8.2, -3.0, 0, 2.4, 6.8].forEach((wz) =>
      placeModularBay('temple/glb/wall_temple.glb', 8.42, 3.3, wz, -Math.PI / 2, [1.05, 1.12, 1.15])
    );
    buildWallRun('temple/glb/wall_temple.glb', [8.45, -9.3], [8.45, 7.4], 6.75, 1, 2.5, -Math.PI / 2);

    // Nave Gothic Stone Colonnade (`pillar_gothic.glb` spanning lower+upper heights!)
    [
      [-5.0, -4.85, 2.08],
      [5.0, -4.85, 2.08],
      [-7.85, -8.85, 2.95],
      [7.85, -8.85, 2.95],
      [-7.85, 6.85, 2.95],
      [7.85, 6.85, 2.95],
    ].forEach(([px, pz, sy]) => {
      placeModularBay('temple/glb/pillar_gothic.glb', px, 0, pz, 0, [1.15, sy, 1.15]);
    });

    // ─── 6C WEST SCRIPTORIUM (x: -17.0..-8.6, z: -6.0..6.0) ───
    addBacking(-17.25, 3.1, 0, 0.25, 6.4, 12.6);
    addBacking(-12.85, 3.1, 6.25, 8.8, 6.4, 0.25);
    addBacking(-15.9, 3.1, -6.25, 2.8, 6.4, 0.25);
    addBacking(-10.1, 3.1, -6.25, 3.6, 6.4, 0.25);

    // West outer wall with twin stained-glass lancets (`z = ±2.75`)
    [-2.75, 2.75].forEach((wz) => placeLancetWindow(-16.95, 1.65, wz, Math.PI / 2, 1.18, 2.2, 0));
    [-5.0, 0, 5.0].forEach((wz) =>
      placeModularBay('dungeon/glb/wall_stone.glb', -16.95, 0, wz, Math.PI / 2, [1.1, 1.05, 1.15])
    );
    buildWallRun('dungeon/glb/wall_stone.glb', [-16.95, -6.0], [-16.95, 6.0], 3.15, 1, 3.05, Math.PI / 2);
    buildWallRun('dungeon/glb/wall_stone.glb', [-17.0, 6.05], [-8.6, 6.05], 0, 2, 3.1, Math.PI); // South 6C wall
    // North 6C wall with stone archway leading to 6F North Reliquary Chapel (`x = -13.3`)
    buildWallRun('dungeon/glb/wall_stone.glb', [-17.0, -6.05], [-14.4, -6.05], 0, 2, 3.1, 0);
    buildWallRun('dungeon/glb/wall_stone.glb', [-12.1, -6.05], [-8.6, -6.05], 0, 2, 3.1, 0);
    placeModularBay('dungeon/glb/wall_doorway_stone.glb', -13.3, 0, -6.05, 0, [1.35, 1.18, 1.4]);
    placeModularBay('dungeon/glb/wall_stone.glb', -13.3, 3.55, -6.05, 0, [1.3, 0.9, 1.2]);
    placeModularBay('dungeon/glb/wall_doorway_stone.glb', -9.2, 0, 0, Math.PI / 2, [1.55, 1.22, 1.6]);

    // ─── 6F NORTH RELIQUARY CHAPEL (x: -16.1..-10.5, z: -11.3..-6.1) ───
    addBacking(-13.3, 2.8, -11.45, 6.2, 5.8, 0.25);
    addBacking(-16.3, 2.8, -8.75, 0.25, 5.8, 5.4);
    addBacking(-10.3, 2.8, -8.75, 0.25, 5.8, 5.4);
    buildWallRun('temple/glb/wall_temple.glb', [-16.1, -11.25], [-10.5, -11.25], 0, 2, 2.85, 0);
    buildWallRun('temple/glb/wall_temple.glb', [-16.1, -11.2], [-16.1, -6.1], 0, 2, 2.85, Math.PI / 2);
    buildWallRun('temple/glb/wall_temple.glb', [-10.5, -11.2], [-10.5, -6.1], 0, 2, 2.85, -Math.PI / 2);
    placeLancetWindow(-13.3, 1.85, -11.2, 0, 0.95, 0, 1.9);

    // ─── 6D EAST RELAY GALLERY (x: 8.6..17.0, z: -6.0..6.0) ───
    addBacking(17.25, 3.1, 0, 0.25, 6.4, 12.6);
    addBacking(12.85, 3.1, -6.25, 8.8, 6.4, 0.25);
    addBacking(9.8, 3.1, 6.25, 3.2, 6.4, 0.25);
    addBacking(15.8, 3.1, 6.25, 3.2, 6.4, 0.25);

    buildWallRun('dungeon/glb/wall_stone.glb', [16.95, -6.0], [16.95, 6.0], 0, 2, 3.1, -Math.PI / 2);
    buildWallRun('dungeon/glb/wall_stone.glb', [8.6, -6.05], [17.0, -6.05], 0, 2, 3.1, 0);
    buildWallRun('dungeon/glb/wall_stone.glb', [8.6, 6.05], [11.6, 6.05], 0, 2, 3.1, Math.PI);
    buildWallRun('dungeon/glb/wall_stone.glb', [14.1, 6.05], [17.0, 6.05], 0, 2, 3.1, Math.PI);
    placeModularBay('dungeon/glb/wall_stone.glb', 12.85, 3.2, 6.05, Math.PI, [1.3, 1.0, 1.1]);
    placeModularBay('temple/glb/wall_breach.glb', 9.25, 0, -1.65, 0, [1.4, 1.25, 1.15]);
    placeModularBay('temple/glb/wall_breach.glb', 9.25, 0, 1.65, Math.PI, [1.4, 1.25, 1.15]);

    // ─── 6E SOUTH QUARANTINE CELLAR (x: 11.1..14.7, z: 6.1..11.2) ───
    addBacking(12.9, 2.5, 11.35, 4.0, 5.2, 0.25);
    addBacking(10.95, 2.5, 8.65, 0.25, 5.2, 5.4);
    addBacking(14.85, 2.5, 8.65, 0.25, 5.2, 5.4);
    buildWallRun('dungeon/glb/wall_rough.glb', [11.15, 11.15], [14.65, 11.15], 0, 2, 2.5, Math.PI);
    buildWallRun('dungeon/glb/wall_rough.glb', [11.15, 6.1], [11.15, 11.15], 0, 2, 2.5, Math.PI / 2);
    buildWallRun('dungeon/glb/wall_rough.glb', [14.65, 6.1], [14.65, 11.15], 0, 2, 2.5, -Math.PI / 2);
    placeModularBay('dungeon/glb/wall_bars_door.glb', 12.9, 0, 6.08, 0, [1.55, 1.08, 1.2]);
  };

  // ── Animated & Articulated GLB Event Registry (Doors, Gates, Cabinets, Crates, Chests) ──
  const activeMixers = [];
  const animatedTweens = [];
  const doors = {};

  const getPX = () => (typeof E.px === 'function' ? E.px() : (E.cam?.position?.x ?? 0));
  const getPZ = () => (typeof E.pz === 'function' ? E.pz() : (E.cam?.position?.z ?? 0));

  const autoCloseTriggers = {
    nave_threshold: {
      armed: false,
      armTime: 0,
      fromSide: 'south',
      arm(px, pz) {
        this.armed = true;
        this.armTime = performance.now();
        this.fromSide = pz > 7.48 ? 'south' : 'north';
      },
      shouldClose(px, pz) {
        if (this.fromSide === 'south') return pz < 6.4;
        if (this.fromSide === 'north') return pz > 8.5;
        return false;
      },
    },
    west_scriptorium: {
      armed: false,
      armTime: 0,
      fromSide: 'east',
      arm(px, pz) {
        this.armed = true;
        this.armTime = performance.now();
        this.fromSide = px > -8.45 ? 'east' : 'west';
      },
      shouldClose(px, pz) {
        if (this.fromSide === 'east') return px < -9.8;
        if (this.fromSide === 'west') return px > -7.0;
        return false;
      },
    },
    north_chapel: {
      armed: false,
      armTime: 0,
      fromSide: 'south',
      arm(px, pz) {
        this.armed = true;
        this.armTime = performance.now();
        this.fromSide = pz > -6.05 ? 'south' : 'north';
      },
      shouldClose(px, pz) {
        if (this.fromSide === 'south') return pz < -7.4;
        if (this.fromSide === 'north') return pz > -4.8;
        return false;
      },
    },
    east_gate: {
      armed: false,
      armTime: 0,
      fromSide: 'west',
      arm(px, pz) {
        this.armed = true;
        this.armTime = performance.now();
        this.fromSide = px < 8.45 ? 'west' : 'east';
      },
      shouldClose(px, pz) {
        if (this.fromSide === 'west') return px > 9.8;
        if (this.fromSide === 'east') return px < 7.0;
        return false;
      },
    },
    south_cellar: {
      armed: false,
      armTime: 0,
      fromSide: 'north',
      arm(px, pz) {
        this.armed = true;
        this.armTime = performance.now();
        this.fromSide = pz < 6.08 ? 'north' : 'south';
      },
      shouldClose(px, pz) {
        if (this.fromSide === 'north') return pz > 7.4;
        if (this.fromSide === 'south') return pz < 4.8;
        return false;
      },
    },
  };

  const animateScalar = (getVal, setVal, target, speed = 2.4) => {
    animatedTweens.push({ getVal, setVal, target, speed });
  };

  anim((_t, dt) => {
    const stepDt = Math.min(dt, 0.05);
    for (let i = 0; i < activeMixers.length; i++) {
      activeMixers[i].update(stepDt);
    }
    for (let i = animatedTweens.length - 1; i >= 0; i--) {
      const tw = animatedTweens[i];
      const cur = tw.getVal();
      const next = THREE.MathUtils.lerp(cur, tw.target, Math.min(1, stepDt * tw.speed));
      tw.setVal(next);
      if (Math.abs(next - tw.target) < 0.004) {
        tw.setVal(tw.target);
        animatedTweens.splice(i, 1);
      }
    }

    const px = getPX();
    const pz = getPZ();
    const now = performance.now();
    for (const [key, trig] of Object.entries(autoCloseTriggers)) {
      if (doors[key]?.opened && trig.armed) {
        if (now - trig.armTime >= 1800 && trig.shouldClose(px, pz)) {
          trig.armed = false;
          doors[key]?.close?.(false);
        }
      }
    }
  });

  const setupClipDoor = (
    key,
    relPath,
    {
      x,
      y,
      z,
      ry = 0,
      scale = [1, 1, 1],
      colliderBounds = null,
      startOpen = false,
      swingLeafName = null,
      doubleLeafNames = null,
      swingTargetY = -1.45,
    }
  ) => {
    const collider = colliderBounds ? solid(...colliderBounds) : null;
    loadGLB(`${VAULT_MODEL_BASE}/${relPath}`).then((gltf) => {
      if (!gltf?.scene) return;
      const root = gltf.scene.clone();
      normalizeModelMaterials(root, { psx: true, npAll: true, albedoLift: 0.34 });
      root.position.set(x, y, z);
      root.rotation.y = ry;
      root.scale.set(...scale);
      S.add(root);

      const swingLeaf = swingLeafName ? root.getObjectByName(swingLeafName) : null;
      const leafL = doubleLeafNames ? root.getObjectByName(doubleLeafNames[0]) : null;
      const leafR = doubleLeafNames ? root.getObjectByName(doubleLeafNames[1]) : null;
      let mixer = null;
      let action = null;
      if (!swingLeaf && !leafL && gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(root);
        action = mixer.clipAction(gltf.animations[0]);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.timeScale = 1.15;
        activeMixers.push(mixer);
      }

      const openFn = (silent = false) => {
        if (doors[key]?.opened) return;
        if (doors[key]) doors[key].opened = true;
        if (doors[key]?.collider) {
          removeSolid(doors[key].collider);
          doors[key].collider = null;
        }
        if (leafL && leafR) {
          animateScalar(() => leafL.rotation.y, (v) => { leafL.rotation.y = v; }, -swingTargetY, 2.2);
          animateScalar(() => leafR.rotation.y, (v) => { leafR.rotation.y = v; }, swingTargetY, 2.2);
        } else if (swingLeaf) {
          animateScalar(() => swingLeaf.rotation.y, (v) => { swingLeaf.rotation.y = v; }, swingTargetY, 2.2);
        } else if (action) {
          action.reset().play();
        } else {
          animateScalar(() => root.rotation.y, (v) => { root.rotation.y = v; }, ry + swingTargetY, 2.2);
        }
        if (!silent) audio?.playGateOpen?.(0.66);
        if (ref.doorProxies?.[key]) {
          ref.doorProxies[key].position.set(0, -999, 0);
        }
        if (autoCloseTriggers[key]) {
          autoCloseTriggers[key].arm?.(getPX(), getPZ());
        }
      };

      const closeFn = (silent = false) => {
        if (!doors[key]?.opened) return;
        if (doors[key]) doors[key].opened = false;
        if (autoCloseTriggers[key]) {
          autoCloseTriggers[key].armed = false;
        }
        if (colliderBounds && !doors[key]?.collider) {
          doors[key].collider = solid(...colliderBounds);
        }
        if (leafL && leafR) {
          animateScalar(() => leafL.rotation.y, (v) => { leafL.rotation.y = v; }, 0, 3.8);
          animateScalar(() => leafR.rotation.y, (v) => { leafR.rotation.y = v; }, 0, 3.8);
        } else if (swingLeaf) {
          animateScalar(() => swingLeaf.rotation.y, (v) => { swingLeaf.rotation.y = v; }, 0, 3.8);
        } else if (action) {
          action.stop();
        } else {
          animateScalar(() => root.rotation.y, (v) => { root.rotation.y = v; }, ry, 3.8);
        }
        if (!silent) {
          audio?.playGateOpen?.(0.9);
          audio?.triggerOneShot?.('blackout', 0.5);
          E.shake?.(0.35, 0.2);
        }
        if (ref.doorProxies?.[key] && originalProxyPositions[key]) {
          ref.doorProxies[key].position.set(...originalProxyPositions[key]);
        }
      };

      doors[key] = { root, collider, opened: false, open: openFn, close: closeFn, pos: new THREE.Vector3(x, y, z) };
      if (startOpen) openFn(true);
    });
  };

  const originalProxyPositions = {
    nave_threshold: [0, 1.65, 7.48],
    west_scriptorium: [-8.45, 1.45, 0],
    north_chapel: [-13.3, 1.45, -6.05],
    south_cellar: [12.14, 1.45, 6.08],
    east_gate: [8.45, 1.45, 0],
  };

  // Interactive Door Placements Across Vault Thresholds
  const installThresholdDoors = () => {
    // 1) Sealed rear entry castle doors (z = 16.36) — heavy fortress entrance behind player spawn
    loadGLB(`${VAULT_MODEL_BASE}/castle_door.glb`).then((gltf) => {
      const door = gltf?.scene;
      if (!door) return;
      normalizeModelMaterials(door, { npAll: true });
      const pivot = fitAndPivotModel(door, 4.35);
      pivot.position.set(0, 0, 16.36);
      pivot.rotation.y = Math.PI;
      S.add(pivot);
    });

    // 2) Narthex -> Sanctuary Starting Castle Doors (z = 7.48, seated inside wall_doorway_temple)
    let thresholdCollider = solid(-1.5, 1.5, 7.25, 7.7);
    loadCached('castle_door.glb', { psx: true, npAll: true, albedoLift: 0.32 }).then((gltf) => {
      const raw = gltf?.scene;
      if (!raw) return;
      const door = raw.clone();
      const pivot = fitAndPivotModel(door, 3.85);
      pivot.scale.x = 1.38; // snug fit inside 2.9m archway opening
      pivot.position.set(0, 0, 7.48);
      pivot.rotation.y = 0; // facing south towards player spawn in 6A
      S.add(pivot);

      const leftLeaf = door.getObjectByName('large_castle_door_left');
      const rightLeaf = door.getObjectByName('large_castle_door_right');
      if (leftLeaf) leftLeaf.rotation.y = 0;
      if (rightLeaf) rightLeaf.rotation.y = 0;

      const openDoors = (silent = false) => {
        if (doors.nave_threshold?.opened) return;
        doors.nave_threshold.opened = true;
        if (doors.nave_threshold.collider) {
          removeSolid(doors.nave_threshold.collider);
          doors.nave_threshold.collider = null;
        }
        if (leftLeaf) animateScalar(() => leftLeaf.rotation.y, (v) => { leftLeaf.rotation.y = v; }, -1.55, 1.9);
        if (rightLeaf) animateScalar(() => rightLeaf.rotation.y, (v) => { rightLeaf.rotation.y = v; }, 1.55, 1.9);
        if (!silent) audio?.playGateOpen?.(0.8);
        ref?.onStartingDoorOpen?.();
        if (ref.doorProxies?.nave_threshold) {
          ref.doorProxies.nave_threshold.position.set(0, -999, 0);
        }
        if (autoCloseTriggers.nave_threshold) {
          autoCloseTriggers.nave_threshold.arm?.(getPX(), getPZ());
        }
      };

      const closeDoors = (silent = false) => {
        if (!doors.nave_threshold?.opened) return;
        doors.nave_threshold.opened = false;
        if (autoCloseTriggers.nave_threshold) {
          autoCloseTriggers.nave_threshold.armed = false;
        }
        if (!doors.nave_threshold.collider) {
          doors.nave_threshold.collider = solid(-1.5, 1.5, 7.25, 7.7);
        }
        if (leftLeaf) animateScalar(() => leftLeaf.rotation.y, (v) => { leftLeaf.rotation.y = v; }, 0, 3.8);
        if (rightLeaf) animateScalar(() => rightLeaf.rotation.y, (v) => { rightLeaf.rotation.y = v; }, 0, 3.8);
        if (!silent) {
          audio?.playGateOpen?.(0.95);
          audio?.triggerOneShot?.('blackout', 0.6);
          E.shake?.(0.35, 0.2);
        }
        if (ref.doorProxies?.nave_threshold) {
          ref.doorProxies.nave_threshold.position.set(0, 1.65, 7.48);
        }
      };

      doors.nave_threshold = {
        root: pivot,
        collider: thresholdCollider,
        opened: false,
        pos: new THREE.Vector3(0, 0, 7.48),
        open: openDoors,
        close: closeDoors,
      };
    });

    // 3) West Scriptorium Temple Double Doors (`x = -8.45, z = 0` — seated cleanly inside West Nave archway)
    setupClipDoor('west_scriptorium', 'temple/glb/door_temple.glb', {
      x: -8.45,
      y: 0,
      z: 0,
      ry: Math.PI / 2,
      scale: [1.58, 1.24, 1.25],
      colliderBounds: [-8.65, -8.25, -1.25, 1.25],
      doubleLeafNames: ['door_temple_l', 'door_temple_r'],
      swingTargetY: 1.52,
    });

    // 4) North Reliquary Dungeon Door (`x = -13.3, z = -6.05` seated cleanly inside wall_doorway_stone)
    setupClipDoor('north_chapel', 'dungeon/glb/door_dungeon.glb', {
      x: -13.3,
      y: 0,
      z: -6.05,
      ry: 0,
      scale: [1.35, 1.18, 1.2],
      colliderBounds: [-14.2, -12.4, -6.2, -5.9],
      swingLeafName: 'door_dungeon_leaf',
      swingTargetY: 1.48,
    });

    // 5) 6D -> 6E Quarantine Cell Door (`x = 12.14..13.66, z = 6.08`)
    setupClipDoor('south_cellar', 'dungeon/glb/door_cell.glb', {
      x: 12.14,
      y: 0,
      z: 6.08,
      ry: 0,
      scale: [1.55, 1.18, 1.2],
      colliderBounds: [11.8, 14.0, 5.9, 6.25],
      swingLeafName: 'door_cell_leaf',
      swingTargetY: 1.48,
    });

    // 6) East Breach Iron Gate (`x = 8.45, z = 0`) — seated inside East breach threshold, manual unlatch
    let gateCollider = solid(8.25, 8.65, -1.25, 1.25);
    loadGLB(`${VAULT_MODEL_BASE}/iron_gate.glb`).then((gltf) => {
      const raw = gltf?.scene;
      if (!raw) return;
      const gate = raw.clone();
      normalizeModelMaterials(gate, { npAll: true, albedoLift: 0.34 });
      const pivot = fitAndPivotModel(gate, 3.25);
      pivot.position.set(8.45, 0, 0);
      pivot.rotation.y = Math.PI / 2;
      S.add(pivot);

      const wrapHinge = (leaf, hingeX) => {
        if (!leaf || !leaf.parent) return null;
        const hingePivot = new THREE.Group();
        hingePivot.name = `${leaf.name}_pivot`;
        hingePivot.position.set(hingeX, leaf.position.y, leaf.position.z);
        leaf.parent.add(hingePivot);
        hingePivot.add(leaf);
        leaf.position.set(leaf.position.x - hingeX, 0, 0);
        return hingePivot;
      };
      const leftLeaf = wrapHinge(gate.getObjectByName('large_iron_gate_left_door'), -1.43);
      const rightLeaf = wrapHinge(gate.getObjectByName('large_iron_gate_right_door'), 1.43);
      const bolt = gate.getObjectByName('large_iron_gate_bolt');
      if (leftLeaf) leftLeaf.rotation.y = 0;
      if (rightLeaf) rightLeaf.rotation.y = 0;
      if (bolt && rightLeaf) {
        rightLeaf.add(bolt);
        bolt.position.set(-1.43, 0, 0);
      }

      const openGate = (silent = false) => {
        if (doors.east_gate?.opened) return;
        doors.east_gate.opened = true;
        if (doors.east_gate.collider) {
          removeSolid(doors.east_gate.collider);
          doors.east_gate.collider = null;
        }
        if (bolt) animateScalar(() => bolt.position.x, (v) => { bolt.position.x = v; }, -1.08, 1.2);
        if (leftLeaf) animateScalar(() => leftLeaf.rotation.y, (v) => { leftLeaf.rotation.y = v; }, -1.52, 2.2);
        if (rightLeaf) animateScalar(() => rightLeaf.rotation.y, (v) => { rightLeaf.rotation.y = v; }, 1.52, 2.2);
        if (!silent) audio?.playGateOpen?.(0.75);
        if (ref.doorProxies?.east_gate) {
          ref.doorProxies.east_gate.position.set(0, -999, 0);
        }
        if (autoCloseTriggers.east_gate) {
          autoCloseTriggers.east_gate.arm?.(getPX(), getPZ());
        }
      };

      const closeGate = (silent = false) => {
        if (!doors.east_gate?.opened) return;
        doors.east_gate.opened = false;
        if (autoCloseTriggers.east_gate) {
          autoCloseTriggers.east_gate.armed = false;
        }
        if (!doors.east_gate.collider) {
          doors.east_gate.collider = solid(8.25, 8.65, -1.25, 1.25);
        }
        if (leftLeaf) animateScalar(() => leftLeaf.rotation.y, (v) => { leftLeaf.rotation.y = v; }, 0, 3.8);
        if (rightLeaf) animateScalar(() => rightLeaf.rotation.y, (v) => { rightLeaf.rotation.y = v; }, 0, 3.8);
        if (bolt) animateScalar(() => bolt.position.x, (v) => { bolt.position.x = v; }, -1.43, 3.8);
        if (!silent) {
          audio?.playGateOpen?.(0.95);
          audio?.triggerOneShot?.('bonecrack', 0.8);
          E.shake?.(0.35, 0.2);
        }
        if (ref.doorProxies?.east_gate) {
          ref.doorProxies.east_gate.position.set(8.45, 1.45, 0);
        }
      };

      doors.east_gate = {
        root: pivot,
        collider: gateCollider,
        opened: false,
        pos: new THREE.Vector3(8.45, 0, 0),
        open: openGate,
        close: closeGate,
      };
      if (!ref.openFailsafeDoor) ref.openFailsafeDoor = () => openGate(false);
    });
  };

  const openZoneDoor = (key, silent = false) => {
    doors[key]?.open?.(silent);
    if (ref.doorProxies?.[key]) {
      ref.doorProxies[key].position.set(0, -999, 0);
    }
  };

  const closeZoneDoor = (key, silent = false) => {
    doors[key]?.close?.(silent);
  };

  ref.openZoneDoor = openZoneDoor;
  ref.closeZoneDoor = closeZoneDoor;
  ref.doors = doors;

  return {
    loadCached,
    track: (p) => assetTracker.track(p),
    placeModularBay,
    placeLancetWindow,
    buildRoomFloors,
    buildAllSixChambers,
    installThresholdDoors,
    openZoneDoor,
    doors,
    activeMixers,
    animateScalar,
  };
}

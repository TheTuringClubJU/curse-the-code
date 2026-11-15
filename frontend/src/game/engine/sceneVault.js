import * as THREE from 'three';
import {
  createBioFleshTextures,
  createCandleFlameTexture,
  createCarvedOakTexture,
  createCrackedGlassTexture,
  createCrtPhosphorTexture,
  createForgedIronTexture,
  createGothicLancetTexture,
  createRitualFloorDecalTexture,
  createSplitFlapBoard,
  loadVaultPBR,
} from './texVault.js';
import {
  createVaultArchitecture,
  fitModelToHeight,
  normalizeModelMaterials,
  VAULT_MODEL_BASE,
} from './vaultArchitecture.js';

/**
 * Room 6: The Anointing Vault
 * Rebuilt ground-up on modular PSX Dungeon, Hell Temple, and Industrial GLB architecture,
 * articulated interactive props/doors, calibrated survival-horror sightlines, and tri-state
 * Central Altar containment conduits (R2-08 + R2-09 -> R2-10).
 */
export function buildVaultScene(E) {
  const { S, add, interact, loadGLB, solid, anim, ref, audio, visualInteract } = E;

  // ── 1. PBR Materials & Atmospheric Palette ────────────────────────────────
  const pbrStoneFloor = loadVaultPBR('flagstone', 6.5, 6.5);
  const matFlagstone = new THREE.MeshStandardMaterial({
    map: pbrStoneFloor.map,
    normalMap: pbrStoneFloor.normalMap,
    roughnessMap: pbrStoneFloor.roughnessMap,
    color: 0xa89ea6,
    roughness: 0.86,
    metalness: 0.08,
  });

  const pbrConcrete = loadVaultPBR('damaged_concrete', 4.5, 4.5);
  const matConcrete = new THREE.MeshStandardMaterial({
    map: pbrConcrete.map,
    normalMap: pbrConcrete.normalMap,
    roughnessMap: pbrConcrete.roughnessMap,
    color: 0x9b9ca2,
    roughness: 0.88,
    metalness: 0.14,
  });

  const pbrCeil = loadVaultPBR('castle_stone', 6.0, 6.0);
  const matCeilingStone = new THREE.MeshStandardMaterial({
    map: pbrCeil.map,
    normalMap: pbrCeil.normalMap,
    roughnessMap: pbrCeil.roughnessMap,
    color: 0x625a66,
    roughness: 0.94,
    metalness: 0.05,
  });

  const ironTex = createForgedIronTexture();
  const matDarkIron = new THREE.MeshStandardMaterial({
    map: ironTex.map,
    bumpMap: ironTex.bumpMap,
    bumpScale: 0.03,
    color: 0x686c74,
    roughness: 0.44,
    metalness: 0.68,
  });

  const oakTex = createCarvedOakTexture();
  const matCarvedOak = new THREE.MeshStandardMaterial({
    map: oakTex.map,
    bumpMap: oakTex.bumpMap,
    bumpScale: 0.035,
    color: 0x7b5c48,
    roughness: 0.72,
    metalness: 0.08,
  });

  const lancetTex = createGothicLancetTexture();
  const matLancet = new THREE.MeshStandardMaterial({
    map: lancetTex,
    emissiveMap: lancetTex,
    emissive: new THREE.Color(0xc4484d),
    emissiveIntensity: 0.62,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });

  const crackedTex = createCrackedGlassTexture();
  const matCrackedGlass = new THREE.MeshStandardMaterial({
    map: crackedTex.map,
    bumpMap: crackedTex.bumpMap,
    bumpScale: 0.04,
    transparent: true,
    opacity: 0.42,
    color: 0xd0e2eb,
    roughness: 0.14,
    metalness: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const texFlame = createCandleFlameTexture();
  const texCrtManual = createCrtPhosphorTexture('manual');
  const splitFlap = createSplitFlapBoard();
  const matInvisibleHit = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const pushStatic = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.userData.np = true;
    S.add(m);
    return m;
  };

  // ── 2. Modular 6-Chamber GLB Architecture & Colliders ─────────────────────
  const arch = createVaultArchitecture(E, { matLancet, pushStatic });
  arch.buildRoomFloors({ matFlagstone, matConcrete, matCeilingStone });
  arch.buildAllSixChambers();
  arch.installThresholdDoors();

  const installColliders = () => {
    // 6A Narthex & Cell 01 dividers
    solid(-3.8, 3.8, 16.05, 16.95);
    solid(3.0, 3.6, 7.6, 16.5);
    solid(-3.6, -3.1, 7.6, 16.5);
    // 6A -> 6B South Nave threshold wall (door opening x = -1.45..1.45)
    solid(-8.6, -1.45, 7.2, 7.75);
    solid(1.45, 8.6, 7.2, 7.75);

    // 6B Central Nave perimeter + colonnade pillars + Altar/Core footprint
    solid(-8.7, 8.7, -9.8, -9.15);
    solid(-8.8, -8.15, -9.5, -1.35);
    solid(-8.8, -8.15, 1.35, 7.5);
    solid(8.15, 8.8, -9.5, -1.45);
    solid(8.15, 8.8, 1.45, 7.5);
    solid(-5.5, -4.5, -5.35, -4.35);
    solid(4.5, 5.5, -5.35, -4.35);
    solid(-1.35, 1.35, -6.25, -3.55); // core_glass rotunda
    solid(-1.05, 1.05, -2.65, -1.45); // central_console altar
    solid(-5.25, -2.35, 1.65, 2.75); // west pew 1
    solid(-5.25, -2.35, 4.05, 5.15); // west pew 2
    solid(2.35, 5.25, 4.05, 5.15); // east pew 2
    solid(3.45, 5.55, 1.65, 2.95); // autopsy gurney

    // 6C West Scriptorium walls & furniture (6F archway opening x = -14.2..-12.4)
    solid(-17.4, -16.6, -6.3, 6.3);
    solid(-17.1, -8.5, 5.75, 6.4);
    solid(-17.1, -14.2, -6.35, -5.75);
    solid(-12.4, -8.5, -6.35, -5.75);
    solid(-16.1, -14.35, -0.95, 0.95); // manual_terminal desk
    solid(-12.35, -11.25, -4.15, -3.05); // weeping_statue pedestal
    solid(-15.1, -12.5, 3.25, 5.25); // scriptorium_books cabinet & table

    // 6F North Reliquary Chapel
    solid(-16.4, -10.2, -11.6, -10.95);
    solid(-16.4, -15.8, -11.3, -6.0);
    solid(-10.8, -10.2, -11.3, -6.0);
    solid(-14.6, -11.9, -10.6, -9.05); // specimen_locker altar

    // 6D East Switchgear (6E cellar archway opening x = 11.75..14.05 centered at 12.9)
    solid(16.6, 17.4, -6.3, 6.3);
    solid(8.5, 17.1, -6.4, -5.75);
    solid(8.5, 11.75, 5.75, 6.38);
    solid(14.05, 17.1, 5.75, 6.38);
    solid(15.25, 16.65, -0.95, 0.95); // failsafe_panel rack
    solid(11.35, 13.85, -5.0, -3.25); // switchgear_log bench

    // 6E South Quarantine Cellar
    solid(10.8, 11.45, 6.0, 11.4);
    solid(14.35, 15.0, 6.0, 11.4);
    solid(10.8, 15.0, 10.85, 11.5);
    solid(11.95, 13.85, 8.75, 10.55); // sarcophagus_se ossuary
  };
  installColliders();

  // ── 3. Calibrated Survival-Horror Lighting Rig (+Sightline Rim Pools) ─────
  const lightEntries = [];
  const registerLight = (light) => {
    lightEntries.push({ light, base: light.intensity });
    S.add(light);
    return light;
  };

  // Global shadow/moonlight ambient bounce — calibrated for clear visibility and zero pure-black crush
  registerLight(new THREE.HemisphereLight(0x645c72, 0x28202d, 1.25));

  const narthexLight = registerLight(new THREE.PointLight(0xffba78, 2.6, 12.5, 1.5));
  narthexLight.position.set(0, 3.6, 12.2);

  const cellLight = registerLight(new THREE.PointLight(0x769ec8, 1.15, 9.0, 1.5));
  cellLight.position.set(-5.2, 3.0, 10.9);

  const coreLight = registerLight(new THREE.PointLight(0xdc3240, 3.6, 15.0, 1.4));
  coreLight.position.set(0, 2.5, -4.9);

  const altarSpotLight = registerLight(new THREE.PointLight(0xffd28e, 2.6, 11.5, 1.5));
  altarSpotLight.position.set(0, 3.8, -1.6);

  const westCryptLight = registerLight(new THREE.PointLight(0x94bbce, 2.4, 14.5, 1.5));
  westCryptLight.position.set(-12.6, 3.2, 0);

  const eastCryptLight = registerLight(new THREE.PointLight(0xebac68, 2.5, 14.5, 1.5));
  eastCryptLight.position.set(12.8, 3.1, 0);

  const cellarLight = registerLight(new THREE.PointLight(0xdca562, 1.85, 9.5, 1.5));
  cellarLight.position.set(12.9, 2.7, 8.5);

  const reliquaryLight = registerLight(new THREE.PointLight(0xe48265, 2.2, 9.8, 1.5));
  reliquaryLight.position.set(-13.3, 3.1, -8.5);

  // Flame sprites & animated torches
  const flameSprites = [];
  const spawnFlameSprite = (x, y, z, scale = 0.28) => {
    const mat = new THREE.SpriteMaterial({
      map: texFlame,
      color: 0xffc878,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.scale.set(scale, scale * 1.35, scale);
    S.add(sp);
    flameSprites.push({ sp, baseY: y, baseScale: scale, phase: Math.random() * 6.28 });
    return sp;
  };

  // ── 4. Helper Factories for Normalized Props & Articulated Interactables ──
  const interactAnims = {};

  const mountClipAnimation = (root, animations, clipIndex = 0, { loop = THREE.LoopRepeat, speed = 1, autoPlay = true } = {}) => {
    if (!animations || !animations.length) return null;
    const mixer = new THREE.AnimationMixer(root);
    const clip = animations[clipIndex] || animations[0];
    const action = mixer.clipAction(clip);
    action.setLoop(loop, loop === THREE.LoopOnce ? 1 : Infinity);
    action.clampWhenFinished = loop === THREE.LoopOnce;
    action.timeScale = speed;
    if (autoPlay) action.play();
    arch.activeMixers.push(mixer);
    return { mixer, action };
  };

  const placePropGLB = (
    relPath,
    { pos = [0, 0, 0], ry = 0, targetHeight = null, scale = null, albedoLift = 0.26, playClip = false, clipSpeed = 1, flameOffset = null, onReady = null } = {}
  ) =>
    arch.track(
      loadGLB(`${VAULT_MODEL_BASE}/${relPath}`)
        .then((gltf) => {
          if (!gltf?.scene) return null;
          const root = gltf.scene.clone();
          normalizeModelMaterials(root, { psx: relPath.includes('/glb/'), npAll: true, albedoLift });
          if (targetHeight) fitModelToHeight(root, targetHeight);
          if (scale) root.scale.multiplyScalar(scale);
          root.position.set(...pos);
          root.rotation.y = ry;
          S.add(root);
          let clipCtrl = null;
          if (playClip) clipCtrl = mountClipAnimation(root, gltf.animations, 0, { speed: clipSpeed });
          if (flameOffset) {
            spawnFlameSprite(pos[0] + flameOffset[0], pos[1] + flameOffset[1], pos[2] + flameOffset[2], 0.34);
          }
          onReady?.(root, gltf, clipCtrl);
          return root;
        })
        .catch(() => null)
    );

  const registerHitProxy = (id, pos, size) => {
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(...size), matInvisibleHit);
    proxy.position.set(...pos);
    interact(proxy, id);
    add(proxy, { noShadow: true });
    return proxy;
  };

  const placeInteractiveGLB = (
    relPath,
    id,
    {
      pos = [0, 0, 0],
      ry = 0,
      targetHeight = null,
      scale = null,
      albedoLift = 0.28,
      screenTex = null,
      hitPos = null,
      hitSize = [1.25, 1.45, 1.25],
      onReady = null,
    } = {}
  ) => {
    registerHitProxy(id, hitPos || [pos[0], pos[1] + (targetHeight || 1.2) * 0.5, pos[2]], hitSize);
    return arch.track(
      loadGLB(`${VAULT_MODEL_BASE}/${relPath}`)
        .then((gltf) => {
          if (!gltf?.scene) return null;
          const root = gltf.scene.clone();
          normalizeModelMaterials(root, {
            crtMap: screenTex,
            screenNames: screenTex ? ['screen', 'crt', 'monitor', 'display', 'phosphor'] : [],
            psx: relPath.includes('/glb/'),
            npAll: false,
            albedoLift,
          });
          if (targetHeight) fitModelToHeight(root, targetHeight);
          if (scale) root.scale.multiplyScalar(scale);
          root.position.set(...pos);
          root.rotation.y = ry;
          interact(root, id);
          add(root, { noShadow: true });
          visualInteract(id, root);
          onReady?.(root, gltf);
          return root;
        })
        .catch(() => null)
    );
  };

  // ── 5. Central Nave Centerpiece (Altar R2-10, Core Glass, Split-Flap Clock) ─
  // 5A. Floor Sigil & Conduit Tracks running from 6C (-8.4, 0) & 6D (+8.4, 0) into 6B Altar
  const sigilTex = createRitualFloorDecalTexture();
  pushStatic(
    new THREE.PlaneGeometry(5.8, 5.8),
    new THREE.MeshBasicMaterial({
      map: sigilTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
    0,
    0.018,
    -4.9,
    -Math.PI / 2,
    0,
    0
  );

  let manualSolved = false;
  let failsafeSolved = false;

  const matWestCable = new THREE.MeshStandardMaterial({
    color: 0x382026,
    emissive: new THREE.Color(0x9b222e),
    emissiveIntensity: 0.72,
    roughness: 0.4,
  });
  const matEastCable = new THREE.MeshStandardMaterial({
    color: 0x382026,
    emissive: new THREE.Color(0x9b222e),
    emissiveIntensity: 0.72,
    roughness: 0.4,
  });
  const matAltarBeacon = new THREE.MeshStandardMaterial({
    color: 0x451218,
    emissive: new THREE.Color(0xc82333),
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });

  // Armored diegetic conduits showing R2-08 (West) & R2-09 (East) lock status to Central Altar
  pushStatic(new THREE.BoxGeometry(7.9, 0.045, 0.14), matDarkIron, -4.45, 0.025, -0.05);
  pushStatic(new THREE.BoxGeometry(0.14, 0.045, 2.05), matDarkIron, -0.55, 0.025, -1.02);
  pushStatic(new THREE.BoxGeometry(7.8, 0.02, 0.045), matWestCable, -4.45, 0.052, -0.05);
  pushStatic(new THREE.BoxGeometry(0.045, 0.02, 2.0), matWestCable, -0.55, 0.052, -1.02);

  pushStatic(new THREE.BoxGeometry(7.9, 0.045, 0.14), matDarkIron, 4.45, 0.025, 0.05);
  pushStatic(new THREE.BoxGeometry(0.14, 0.045, 2.15), matDarkIron, 0.55, 0.025, -1.0);
  pushStatic(new THREE.BoxGeometry(7.8, 0.02, 0.045), matEastCable, 4.45, 0.052, 0.05);
  pushStatic(new THREE.BoxGeometry(0.045, 0.02, 2.1), matEastCable, 0.55, 0.052, -1.0);

  // Relay status lamps & central interlock beacon grounded on iron stands flanking central_console
  pushStatic(new THREE.CylinderGeometry(0.055, 0.08, 1.02, 10), matDarkIron, -1.08, 0.51, -2.05);
  pushStatic(new THREE.CylinderGeometry(0.055, 0.08, 1.02, 10), matDarkIron, 1.08, 0.51, -2.05);
  pushStatic(new THREE.CylinderGeometry(0.06, 0.09, 0.94, 10), matDarkIron, 0, 0.47, -2.42);
  const westRelayLamp = pushStatic(new THREE.SphereGeometry(0.075, 12, 10), matWestCable, -1.08, 1.08, -2.05);
  const eastRelayLamp = pushStatic(new THREE.SphereGeometry(0.075, 12, 10), matEastCable, 1.08, 1.08, -2.05);
  const altarBeaconMesh = pushStatic(new THREE.OctahedronGeometry(0.11, 0), matAltarBeacon, 0, 1.02, -2.42);

  const syncConduitVisuals = () => {
    const updateMat = (mat, active) => {
      mat.emissive.setHex(active ? 0x26d882 : 0xa32430);
      mat.emissiveIntensity = active ? 1.45 : 0.72;
    };
    updateMat(matWestCable, manualSolved);
    updateMat(matEastCable, failsafeSolved);
    if (manualSolved && failsafeSolved) {
      matAltarBeacon.emissive.setHex(0x34d399);
      matAltarBeacon.emissiveIntensity = 1.65;
    } else if (manualSolved || failsafeSolved) {
      matAltarBeacon.emissive.setHex(0xe09820);
      matAltarBeacon.emissiveIntensity = 1.45;
    }
  };

  // 5B. core_glass (0, 0, -4.9): Anointing Specimen Vessel + flesh_blob.glb inside cracked glass
  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, 0, -4.9);
  S.add(coreGroup);

  const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.32, 0.55, 16), matDarkIron);
  pedBase.position.y = 0.275;
  coreGroup.add(pedBase);
  const capRing = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.15, 0.32, 16), matDarkIron);
  capRing.position.y = 3.25;
  coreGroup.add(capRing);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.7, 8), matDarkIron);
    strut.position.set(Math.cos(ang) * 1.14, 1.9, Math.sin(ang) * 1.14);
    coreGroup.add(strut);
  }

  const glassTube = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 2.65, 24, 1, true), matCrackedGlass);
  glassTube.position.y = 1.88;
  coreGroup.add(glassTube);
  interact(coreGroup, 'core_glass');
  add(coreGroup, { noShadow: true });
  registerHitProxy('core_glass', [0, 1.75, -4.9], [2.45, 3.2, 2.45]);

  const bioMaps = createBioFleshTextures();
  const matFlesh = new THREE.MeshStandardMaterial({
    map: bioMaps.map,
    emissiveMap: bioMaps.emissiveMap,
    emissive: new THREE.Color(0xc81c2e),
    emissiveIntensity: 0.95,
    bumpMap: bioMaps.bumpMap,
    bumpScale: 0.05,
    roughness: 0.52,
    metalness: 0.12,
  });

  let fleshRoot = null;
  arch.track(
    loadGLB(`${VAULT_MODEL_BASE}/flesh_blob.glb`)
      .then((gltf) => {
        if (!gltf?.scene) return;
        const blob = gltf.scene.clone();
        blob.traverse((o) => {
          if (o.isMesh) {
            o.material = matFlesh;
            o.userData.np = true;
          }
        });
        fitModelToHeight(blob, 1.75);
        blob.position.set(0, 0.72, -4.9);
        S.add(blob);
        fleshRoot = blob;
        mountClipAnimation(blob, gltf.animations, 0, { speed: 0.9 });
      })
      .catch(() => null)
  );

  placePropGLB('temple/glb/pillar_gothic.glb', { pos: [-2.45, 0, -4.9], targetHeight: 4.8, albedoLift: 0.25 });
  placePropGLB('temple/glb/pillar_gothic.glb', { pos: [2.45, 0, -4.9], targetHeight: 4.8, albedoLift: 0.25 });

  // 5C. central_console (0, 0, -2.05): Anointing Containment Altar R2-10
  placePropGLB('temple/glb/altar_high.glb', { pos: [0, 0, -2.95], ry: 0, scale: 1.1, albedoLift: 0.28 });
  placeInteractiveGLB('central_console.glb', 'central_console', {
    pos: [0, 0, -2.05],
    ry: 0,
    targetHeight: 1.38,
    albedoLift: 0.3,
    hitPos: [0, 0.9, -2.05],
    hitSize: [1.55, 1.65, 1.25],
  });

  // 5D. countdown_timer: Overhead Split-Flap Board + Apse Inspection Switch
  const flapBoardMat = new THREE.MeshStandardMaterial({
    map: splitFlap.texture,
    emissiveMap: splitFlap.texture,
    emissive: new THREE.Color(0xffe8cc),
    emissiveIntensity: 0.88,
    roughness: 0.35,
  });
  flapBoardMat.userData.noEmissiveHl = true;
  const flapBoardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.28),
    flapBoardMat
  );
  flapBoardMesh.position.set(0, 3.65, -8.85);
  const flapFrame = new THREE.Mesh(new THREE.BoxGeometry(3.64, 1.5, 0.18), matDarkIron);
  flapFrame.position.set(0, 3.65, -8.96);
  S.add(flapFrame, flapBoardMesh);
  interact(flapBoardMesh, 'countdown_timer');
  add(flapBoardMesh, { noShadow: true });

  // Lower clock plaque & relay post under apse so eye-level raycast catches countdown_timer effortlessly
  pushStatic(new THREE.BoxGeometry(0.95, 1.28, 0.35), matDarkIron, 0, 0.64, -8.15);
  registerHitProxy('countdown_timer', [0, 1.45, -8.05], [1.65, 2.4, 1.4]);
  registerHitProxy('countdown_timer', [0, 3.6, -8.45], [3.6, 1.6, 1.2]);

  // ── 6. Dress All 6 Chambers With Normalized Props & Articulated Events ─────
  // Zone 6A: Narthex & Holding Cell 01
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [-2.85, 2.55, 13.2], ry: Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [2.85, 2.55, 13.2], ry: -Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [-2.85, 2.55, 9.6], ry: Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [2.85, 2.55, 9.6], ry: -Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/torch_wall.glb', { pos: [-2.95, 2.05, 11.4], ry: Math.PI / 2, albedoLift: 0.34, playClip: true, flameOffset: [0.22, 0.38, 0] });
  placePropGLB('dungeon/glb/torch_wall.glb', { pos: [2.95, 2.05, 11.4], ry: -Math.PI / 2, albedoLift: 0.34, playClip: true, flameOffset: [-0.22, 0.38, 0] });
  placePropGLB('candelabra.glb', { pos: [-1.75, 0, 8.95], targetHeight: 1.55, flameOffset: [0, 1.42, 0] });
  placePropGLB('candelabra.glb', { pos: [1.75, 0, 8.95], targetHeight: 1.55, flameOffset: [0, 1.42, 0] });
  placePropGLB('dungeon/glb/bed_straw.glb', { pos: [-6.15, 0, 11.6], ry: Math.PI / 2, scale: 1.05 });
  placePropGLB('dungeon/glb/skeleton_chained.glb', { pos: [-6.5, 0, 9.15], ry: 0.45, scale: 1.08 });

  // Interactable #1 (Lore 6A): narthex_registry
  placePropGLB('gothic_table.glb', { pos: [2.15, 0, 11.2], ry: -Math.PI / 2, targetHeight: 0.82, albedoLift: 0.34 });
  placeInteractiveGLB('binder_notebook.glb', 'narthex_registry', {
    pos: [2.15, 0.83, 11.2],
    ry: -Math.PI / 2,
    targetHeight: 0.16,
    albedoLift: 0.36,
    hitPos: [2.15, 0.95, 11.2],
    hitSize: [1.1, 1.0, 1.1],
    onReady: (root) => {
      const openNode = root.getObjectByName('binder_notebook');
      const closedNode = root.getObjectByName('binder_notebook_closed');
      if (openNode) openNode.visible = false;
      interactAnims.narthex_registry = () => {
        if (openNode) openNode.visible = true;
        if (closedNode) closedNode.visible = false;
      };
    },
  });

  // Interactable #2 (Lore 6A): cell_manifest
  pushStatic(new THREE.BoxGeometry(0.42, 0.34, 0.08), matCarvedOak, -3.28, 1.15, 10.9);
  registerHitProxy('cell_manifest', [-3.28, 1.15, 10.9], [0.9, 1.15, 1.1]);

  // Zone 6B: Nave Sightlines, Pews, Braziers & Autopsy Gurney
  placePropGLB('temple/glb/brazier_hell.glb', { pos: [-2.15, 0, 6.2], playClip: true, flameOffset: [0, 1.05, 0] });
  placePropGLB('temple/glb/brazier_hell.glb', { pos: [2.15, 0, 6.2], playClip: true, flameOffset: [0, 1.05, 0] });
  placePropGLB('dungeon/glb/torch_wall.glb', { pos: [-7.95, 2.0, -1.65], ry: Math.PI / 2, albedoLift: 0.34, playClip: true, flameOffset: [0.22, 0.38, 0] });
  placePropGLB('dungeon/glb/torch_wall.glb', { pos: [-7.95, 2.0, 1.65], ry: Math.PI / 2, albedoLift: 0.34, playClip: true, flameOffset: [0.22, 0.38, 0] });
  placePropGLB('wall_sconce.glb', { pos: [8.05, 2.25, -1.65], ry: -Math.PI / 2, targetHeight: 0.45 });
  placePropGLB('wall_sconce.glb', { pos: [8.05, 2.25, 1.65], ry: -Math.PI / 2, targetHeight: 0.45 });
  placePropGLB('temple/glb/banner_hell.glb', { pos: [-4.6, 4.4, -4.85], ry: Math.PI / 2, playClip: true });
  placePropGLB('temple/glb/banner_hell.glb', { pos: [4.6, 4.4, -4.85], ry: -Math.PI / 2, playClip: true });
  placePropGLB('temple/glb/pew.glb', { pos: [-3.8, 0, 2.2], ry: Math.PI, scale: 1.08, albedoLift: 0.3 });
  placePropGLB('temple/glb/pew.glb', { pos: [-3.8, 0, 4.6], ry: Math.PI, scale: 1.08, albedoLift: 0.3 });
  placePropGLB('church_pew.glb', { pos: [3.8, 0, 4.6], ry: Math.PI, targetHeight: 1.05, albedoLift: 0.3 });

  // Interactable #3 (Lore 6B): autopsy_gurney
  placeInteractiveGLB('gothic_table.glb', 'autopsy_gurney', {
    pos: [4.5, 0, 2.3],
    ry: Math.PI / 2,
    targetHeight: 0.86,
    albedoLift: 0.32,
    hitPos: [4.5, 0.9, 2.3],
    hitSize: [1.8, 1.2, 1.2],
  });
  placePropGLB('dead_body.glb', { pos: [4.5, 0.87, 2.3], ry: Math.PI / 2, targetHeight: 0.42, albedoLift: 0.3 });
  placePropGLB('handsaw.glb', { pos: [4.85, 0.89, 1.85], ry: 0.5, targetHeight: 0.14 });
  placePropGLB('tool_cart.glb', { pos: [5.55, 0, 2.95], ry: -0.4, targetHeight: 0.95, albedoLift: 0.3 });

  // Zone 6C: West Scriptorium (manual_terminal R2-08, weeping_statue, scriptorium_books)
  placeInteractiveGLB('manual_terminal.glb', 'manual_terminal', {
    pos: [-15.15, 0, 0],
    ry: Math.PI / 2,
    targetHeight: 1.48,
    albedoLift: 0.3,
    screenTex: texCrtManual,
    hitPos: [-15.1, 1.0, 0],
    hitSize: [1.6, 1.65, 1.6],
  });
  pushStatic(
    new THREE.PlaneGeometry(0.42, 0.3),
    new THREE.MeshBasicMaterial({ map: texCrtManual }),
    -14.66,
    1.18,
    0,
    0,
    Math.PI / 2,
    0
  );

  // weeping_statue (turns off-screen during scaresVault)
  placeInteractiveGLB('gothic_statue.glb', 'weeping_statue', {
    pos: [-11.8, 0, -3.6],
    ry: 0.65,
    targetHeight: 2.15,
    albedoLift: 0.32,
    hitPos: [-11.8, 1.15, -3.6],
    hitSize: [1.25, 2.2, 1.25],
    onReady: (root) => {
      ref.westStatue = root;
    },
  });

  // scriptorium_books (articulated gothic_cabinet doors + table + candleholders)
  placeInteractiveGLB('gothic_cabinet.glb', 'scriptorium_books', {
    pos: [-13.8, 0, 4.45],
    ry: Math.PI,
    targetHeight: 2.25,
    albedoLift: 0.36,
    hitPos: [-13.8, 1.2, 4.25],
    hitSize: [1.9, 2.1, 1.4],
    onReady: (root) => {
      const doors = ['GothicCabinet_01_door1', 'GothicCabinet_01_door2', 'GothicCabinet_01_door3', 'GothicCabinet_01_door4']
        .map((n) => root.getObjectByName(n))
        .filter(Boolean);
      let opened = false;
      interactAnims.scriptorium_books = () => {
        if (opened) return;
        opened = true;
        doors.forEach((d, idx) => {
          const sign = idx % 2 === 0 ? -1.15 : 1.15;
          arch.animateScalar(() => d.rotation.y, (v) => { d.rotation.y = v; }, d.rotation.y + sign, 2.5);
        });
      };
    },
  });
  placePropGLB('gothic_table.glb', { pos: [-13.8, 0, 3.05], targetHeight: 0.78, albedoLift: 0.34 });
  placePropGLB('candleholders.glb', { pos: [-13.4, 0.79, 3.05], targetHeight: 0.42, flameOffset: [0, 0.38, 0] });
  placePropGLB('gothic_commode.glb', { pos: [-15.85, 0, -4.4], ry: Math.PI / 2, targetHeight: 1.05, albedoLift: 0.36 });

  // Zone 6F: North Reliquary Chapel (specimen_locker + chest_wood)
  placeInteractiveGLB('vintage_cabinet.glb', 'specimen_locker', {
    pos: [-13.3, 0, -9.85],
    ry: 0,
    targetHeight: 2.15,
    albedoLift: 0.36,
    hitPos: [-13.3, 1.15, -9.75],
    hitSize: [1.9, 2.1, 1.3],
    onReady: (root) => {
      const cabinetDoors = [
        'vintage_cabinet_01_door_01',
        'vintage_cabinet_01_door_02',
        'vintage_cabinet_01_door_05',
        'vintage_cabinet_01_door_06',
      ]
        .map((n) => root.getObjectByName(n))
        .filter(Boolean);
      let opened = false;
      interactAnims.specimen_locker = () => {
        if (opened) return;
        opened = true;
        cabinetDoors.forEach((d, idx) => {
          const sign = idx % 2 === 0 ? -1.15 : 1.15;
          arch.animateScalar(() => d.rotation.y, (v) => { d.rotation.y = v; }, d.rotation.y + sign, 2.4);
        });
      };
    },
  });
  placePropGLB('dungeon/glb/chest_wood.glb', {
    pos: [-11.55, 0, -9.85],
    ry: -0.25,
    scale: 1.15,
    onReady: (root, gltf) => {
      const chestAnim = mountClipAnimation(root, gltf.animations, 0, { loop: THREE.LoopOnce, speed: 1.25, autoPlay: false });
      const prev = interactAnims.specimen_locker;
      interactAnims.specimen_locker = () => {
        prev?.();
        chestAnim?.action?.reset().play();
      };
    },
  });
  placePropGLB('temple/glb/skull_totem.glb', { pos: [-15.1, 0, -9.9], ry: 0.4, scale: 1.15 });
  placePropGLB('candelabra.glb', { pos: [-14.8, 0, -8.3], targetHeight: 1.45, flameOffset: [0, 1.32, 0] });

  // Zone 6D: East Switchgear & 1981 Concrete Intrusion (failsafe_panel R2-09 + switchgear_log)
  pushStatic(new THREE.BoxGeometry(0.95, 0.44, 1.45), matDarkIron, 15.85, 0.22, 0);
  let failsafeAction = null;
  placeInteractiveGLB('failsafe_panel.glb', 'failsafe_panel', {
    pos: [15.85, 0.44, 0],
    ry: -Math.PI / 2,
    targetHeight: 1.85,
    albedoLift: 0.3,
    hitPos: [15.7, 1.25, 0],
    hitSize: [1.55, 2.3, 1.75],
    onReady: (root, gltf) => {
      const ctrl = mountClipAnimation(root, gltf.animations, 0, {
        loop: THREE.LoopOnce,
        speed: 2.6,
        autoPlay: false,
      });
      failsafeAction = ctrl?.action || null;
    },
  });

  // Hanging swinging industrial lamp in 6D
  let eastSwingLamp = null;
  placePropGLB('hanging_lamp.glb', {
    pos: [12.8, 3.65, 0],
    targetHeight: 1.1,
    albedoLift: 0.3,
    onReady: (root) => {
      eastSwingLamp = root;
    },
  });

  // Gothic medieval dressing in 6D (replaces sci-fi industrial pipes/barrels)
  placePropGLB('temple/glb/pillar_gothic.glb', { pos: [16.4, 0, 5.2], targetHeight: 3.2, albedoLift: 0.26 });
  placePropGLB('temple/glb/pillar_gothic.glb', { pos: [16.4, 0, -5.2], targetHeight: 3.2, albedoLift: 0.26 });
  placePropGLB('wall_sconce.glb', { pos: [16.85, 2.4, 2.8], ry: -Math.PI / 2, targetHeight: 0.45 });
  placePropGLB('wall_sconce.glb', { pos: [16.85, 2.4, -2.8], ry: -Math.PI / 2, targetHeight: 0.45 });
  placePropGLB('candelabra.glb', { pos: [13.4, 0, -4.1], targetHeight: 1.35, flameOffset: [0, 1.25, 0] });
  placePropGLB('barrel_stove.glb', { pos: [10.4, 0, 4.55], targetHeight: 1.45, albedoLift: 0.28 });

  // switchgear_log bench + articulated crate_medical (classic_console moved onto floor in 6C)
  placePropGLB('work_table.glb', { pos: [12.6, 0, -4.1], ry: 0, targetHeight: 0.85, albedoLift: 0.3 });
  placePropGLB('classic_console.glb', { pos: [-10.5, 0, 5.25], ry: Math.PI / 2, targetHeight: 0.95, albedoLift: 0.3 });
  placeInteractiveGLB('crate_medical.glb', 'switchgear_log', {
    pos: [12.6, 0.86, -4.1],
    ry: -0.25,
    targetHeight: 0.42,
    albedoLift: 0.34,
    hitPos: [12.6, 1.05, -4.1],
    hitSize: [1.85, 1.25, 1.15],
    onReady: (root) => {
      const lid = root.getObjectByName('wooden_military_crate_lid');
      let popped = false;
      interactAnims.switchgear_log = () => {
        if (popped || !lid) return;
        popped = true;
        arch.animateScalar(() => lid.rotation.x, (v) => { lid.rotation.x = v; }, -0.82, 3.2);
      };
    },
  });

  // Zone 6E: South Quarantine Cellar (sarcophagus_se)
  placeInteractiveGLB('gothic_bed.glb', 'sarcophagus_se', {
    pos: [12.9, 0, 9.6],
    ry: 0,
    targetHeight: 0.92,
    albedoLift: 0.32,
    hitPos: [12.9, 0.9, 9.6],
    hitSize: [1.75, 1.35, 1.75],
  });
  placePropGLB('dungeon/glb/skeleton_chained.glb', { pos: [11.6, 0, 10.1], ry: -0.6, scale: 1.05 });
  placePropGLB('dungeon/glb/chest_wood.glb', {
    pos: [14.0, 0, 8.2],
    ry: -1.1,
    scale: 1.0,
    onReady: (root, gltf) => {
      const chestAnim = mountClipAnimation(root, gltf.animations, 0, { loop: THREE.LoopOnce, speed: 1.2, autoPlay: false });
      interactAnims.sarcophagus_se = () => {
        chestAnim?.action?.reset().play();
      };
    },
  });

  // ── 7. 3D Horror Apparitions (manthing.glb + stalker.glb) ─────────────────
  const ghostLight = new THREE.PointLight(0xd6e6ff, 0, 7.5, 1.4);
  S.add(ghostLight);
  ref.ghostLight = ghostLight;

  arch.track(
    loadGLB(`${VAULT_MODEL_BASE}/manthing.glb`)
      .then((gltf) => {
        if (!gltf?.scene) return;
        const g = gltf.scene.clone();
        normalizeModelMaterials(g, { npAll: true, albedoLift: 0.2 });
        fitModelToHeight(g, 1.98);
        g.visible = false;
        S.add(g);
        ref.ghost = g;
        const ctrl = mountClipAnimation(g, gltf.animations, 0, { speed: 1.25 });
        ref.ghostMixer = ctrl?.mixer || null;
      })
      .catch(() => null)
  );

  arch.track(
    loadGLB(`${VAULT_MODEL_BASE}/stalker.glb`)
      .then((gltf) => {
        if (!gltf?.scene) return;
        const st = gltf.scene.clone();
        normalizeModelMaterials(st, { npAll: true, albedoLift: 0.18 });
        fitModelToHeight(st, 2.08);
        st.visible = false;
        S.add(st);
        ref.stalker = st;
        const ctrl = mountClipAnimation(st, gltf.animations, 0, { speed: 1.0 });
        ref.stalkerMixer = ctrl?.mixer || null;
      })
      .catch(() => null)
  );

  // ── 8. Reactive Engine Hooks & Per-Frame Heartbeat / Proximity Doors ──────
  ref.narthexLight = narthexLight;
  ref.cellLight = cellLight;
  ref.westCryptLight = westCryptLight;
  ref.eastCryptLight = eastCryptLight;
  ref.cellarLight = cellarLight;
  ref.reliquaryLight = reliquaryLight;
  ref.coreLight = coreLight;
  ref.coreMesh = coreGroup;
  ref.countdownBoard = splitFlap;
  ref.vaultRestored = false;
  ref._lightsOverridden = false;
  ref.eastLampAgitated = false;

  ref.onManualSolved = () => {
    manualSolved = true;
    interactAnims.scriptorium_books?.();
    syncConduitVisuals();
  };

  ref.onFailsafeOpened = () => {
    failsafeSolved = true;
    failsafeAction?.reset?.().play?.();
    syncConduitVisuals();
  };

  ref.openFailsafeDoor = () => {
    arch.openZoneDoor('east_gate', false);
    ref.onFailsafeOpened();
  };

  ref.triggerInteractAnim = (id) => {
    interactAnims[id]?.();
  };

  ref.restoreContainment = () => {
    if (ref.vaultRestored) return;
    ref.vaultRestored = true;
    manualSolved = true;
    failsafeSolved = true;
    syncConduitVisuals();
    splitFlap.setText('00:00', true);
    arch.openZoneDoor('east_gate', true);
    failsafeAction?.reset?.().play?.();

    narthexLight.color.setHex(0xffd79e);
    coreLight.color.setHex(0x64d8ff);
    altarSpotLight.color.setHex(0xffe6ba);
    westCryptLight.color.setHex(0xd6e8ff);
    eastCryptLight.color.setHex(0xffe0b0);
    reliquaryLight.color.setHex(0xffd8a8);
    matFlesh.emissive.setHex(0x1f6e5c);
    matFlesh.emissiveIntensity = 0.55;
    S.fog.density = 0.015;
    audio?.stopCorePulse?.();
  };

  ref.setQualityMode = (tier) => {
    if (!E.R) return;
    const dpr = window.devicePixelRatio || 1;
    if (tier === 'low') {
      E.R.setPixelRatio(0.75);
      E.R.toneMappingExposure = 1.46;
      if (S.fog) S.fog.density = 0.024;
    } else if (tier === 'high') {
      E.R.setPixelRatio(Math.min(dpr, 1.35));
      E.R.toneMappingExposure = 1.52;
      if (S.fog) S.fog.density = 0.019;
    } else {
      E.R.setPixelRatio(Math.min(dpr, 1.05));
      E.R.toneMappingExposure = 1.49;
      if (S.fog) S.fog.density = 0.021;
    }
  };
  ref.setQualityMode('medium');

  // Auto-unlatch threshold doors as the player approaches them + core pulse + lamp sway
  const thresholdChecks = [
    { key: 'nave_threshold', x: 0, z: 8.38, radius: 2.9 },
    { key: 'west_scriptorium', x: -7.25, z: 0, radius: 2.8 },
    { key: 'north_chapel', x: -13.3, z: -6.05, radius: 2.7 },
    { key: 'south_cellar', x: 12.9, z: 6.08, radius: 2.7 },
    { key: 'east_gate', x: 7.45, z: 0, radius: 2.6 },
  ];

  anim((t) => {
    const px = E.px?.() ?? 0;
    const pz = E.pz?.() ?? 13.8;
    const yaw = E.yaw?.() ?? 0;
    if (typeof window !== 'undefined') {
      window.__vaultPose = { x: px, z: pz, yaw };
    }

    for (let i = 0; i < thresholdChecks.length; i++) {
      const td = thresholdChecks[i];
      const door = arch.doors[td.key];
      if (door && !door.opened && Math.hypot(px - td.x, pz - td.z) < td.radius) {
        door.open(false);
      }
    }

    // Flame & brazier ember pulse
    for (let i = 0; i < flameSprites.length; i++) {
      const f = flameSprites[i];
      const flick = 1 + 0.14 * Math.sin(t * 9.3 + f.phase) + 0.06 * Math.sin(t * 17.1 + f.phase);
      f.sp.scale.set(f.baseScale * flick, f.baseScale * 1.35 * flick, 1);
      f.sp.position.y = f.baseY + 0.012 * Math.sin(t * 8.1 + f.phase);
    }

    // 1.4s Anointing Core biological pulse
    if (!ref.vaultRestored) {
      const beat = Math.pow(Math.max(0, Math.sin((t * Math.PI) / 1.4)), 4);
      if (fleshRoot) {
        const s = 1 + beat * 0.045;
        fleshRoot.scale.set(s, s, s);
      }
      if (!ref._lightsOverridden) {
        coreLight.intensity = 2.9 + beat * 1.6;
        westRelayLamp.rotation.y = t * 0.7;
        eastRelayLamp.rotation.y = -t * 0.7;
        altarBeaconMesh.rotation.y = t * 0.9;
      }
    } else {
      altarBeaconMesh.rotation.y = t * 0.5;
    }

    // Swinging east lamp in 6D when agitated
    if (eastSwingLamp) {
      eastSwingLamp.rotation.z = ref.eastLampAgitated ? Math.sin(t * 7.8) * 0.24 : Math.sin(t * 1.1) * 0.03;
    }

    // Scale active lights proportionally when blackout scares dim E.sc.v
    const gScale = E.sc?.v ?? 1;
    if (!ref._lightsOverridden) {
      for (let i = 0; i < lightEntries.length; i++) {
        const le = lightEntries[i];
        if (le.light === coreLight && !ref.vaultRestored) {
          le.light.intensity = le.light.intensity * gScale;
        } else {
          le.light.intensity = le.base * gScale;
        }
      }
    }
  });
}

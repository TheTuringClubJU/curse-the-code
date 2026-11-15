import * as THREE from 'three';
import {
  createBioFleshTextures,
  createBloodGrimeTexture,
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
  fitAndPivotModel,
  fitAndPivotSkinnedModel,
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

  // ── 1. PBR Materials & Tarnished Brown Destroyed Horror Palette ───────────
  const pbrStoneFloor = loadVaultPBR('flagstone', 6.5, 6.5);
  const matFlagstone = new THREE.MeshStandardMaterial({
    map: pbrStoneFloor.map,
    normalMap: pbrStoneFloor.normalMap,
    roughnessMap: pbrStoneFloor.roughnessMap,
    color: 0xc29e80,
    roughness: 0.88,
    metalness: 0.08,
  });

  const pbrConcrete = loadVaultPBR('damaged_concrete', 4.5, 4.5);
  const matConcrete = new THREE.MeshStandardMaterial({
    map: pbrConcrete.map,
    normalMap: pbrConcrete.normalMap,
    roughnessMap: pbrConcrete.roughnessMap,
    color: 0xb4957a,
    roughness: 0.9,
    metalness: 0.14,
  });

  const pbrCeil = loadVaultPBR('castle_stone', 6.0, 6.0);
  const matCeilingStone = new THREE.MeshStandardMaterial({
    map: pbrCeil.map,
    normalMap: pbrCeil.normalMap,
    roughnessMap: pbrCeil.roughnessMap,
    color: 0x82654d,
    roughness: 0.95,
    metalness: 0.05,
  });

  const ironTex = createForgedIronTexture();
  const matDarkIron = new THREE.MeshStandardMaterial({
    map: ironTex.map,
    bumpMap: ironTex.bumpMap,
    roughnessMap: ironTex.roughnessMap,
    bumpScale: 0.035,
    color: 0x7a6658,
    roughness: 0.56,
    metalness: 0.62,
  });

  const oakTex = createCarvedOakTexture();
  const matCarvedOak = new THREE.MeshStandardMaterial({
    map: oakTex,
    color: 0x9b7458,
    roughness: 0.74,
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
    map: crackedTex,
    transparent: true,
    opacity: 0.76,
    alphaTest: 0.01,
    color: 0xf4ece4,
    roughness: 0.14,
    metalness: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const bloodGrimeTex = createBloodGrimeTexture();
  const matBloodGrime = new THREE.MeshBasicMaterial({
    map: bloodGrimeTex,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
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
    solid(1.4, 2.95, 10.4, 12.0); // narthex registry table
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
    solid(-1.25, 1.25, -6.15, -3.65); // core_glass Gothic reliquary shrine
    solid(-1.55, 1.55, -2.95, -1.05); // central_console containment altar
    solid(-1.45, 1.45, -8.85, -7.25); // North Apse High Altar under clock
    solid(-4.75, -3.05, 1.45, 2.55); // west pew 1
    solid(-4.75, -3.05, 4.05, 5.15); // west pew 2
    solid(-6.75, -5.75, 2.35, 4.25); // west flank pew
    solid(3.05, 4.75, 4.05, 5.15); // east pew 2
    solid(3.35, 5.65, 1.15, 3.45); // autopsy table & corpse

    // 6C West Scriptorium walls & furniture (6F archway opening x = -14.2..-12.4)
    solid(-17.4, -16.6, -6.3, 6.3);
    solid(-17.1, -8.5, 5.75, 6.4);
    solid(-17.1, -14.2, -6.35, -5.75);
    solid(-12.4, -8.5, -6.35, -5.75);
    solid(-16.1, -14.35, -0.95, 0.95); // manual_terminal desk
    solid(-12.35, -11.25, -4.15, -3.05); // weeping_statue pedestal
    solid(-15.1, -12.5, 2.65, 5.55); // scriptorium_books cabinet & table
    solid(-12.6, -10.8, 3.05, 4.15); // 6C reading pew

    // 6F North Reliquary Chapel
    solid(-16.4, -10.2, -11.6, -10.95);
    solid(-16.4, -15.8, -11.3, -6.0);
    solid(-10.8, -10.2, -11.3, -6.0);
    solid(-14.6, -11.9, -10.75, -9.2); // specimen_locker altar

    // 6D East Switchgear & Vestry (6E cellar archway opening x = 11.75..14.05 centered at 12.9)
    solid(16.6, 17.4, -6.3, 6.3);
    solid(8.5, 17.1, -6.4, -5.75);
    solid(8.5, 11.75, 5.75, 6.38);
    solid(14.05, 17.1, 5.75, 6.38);
    solid(14.7, 16.55, -0.95, 0.95); // failsafe_panel pedestal & switchboard
    solid(11.8, 13.4, -4.15, -2.95); // switchgear_log table
    solid(9.75, 16.05, -5.85, -4.55); // 6D north vestry cabinets
    solid(9.35, 11.45, 3.35, 5.45); // 6D SW gothic table
    solid(9.6, 11.2, 2.05, 2.95); // 6D SW pew
    solid(14.85, 16.3, 2.95, 4.75); // 6D SE pew

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

  // Global warm tarnished sepia bounce — chiaroscuro shadows with ruined brown texture detail
  registerLight(new THREE.HemisphereLight(0xb68a5c, 0x3b2516, 1.56));

  const narthexLight = registerLight(new THREE.PointLight(0xffb46e, 3.15, 14.5, 1.45));
  narthexLight.position.set(0, 3.6, 12.2);

  const cellLight = registerLight(new THREE.PointLight(0xc29864, 1.65, 10.5, 1.45));
  cellLight.position.set(-5.2, 3.0, 10.9);

  const coreLight = registerLight(new THREE.PointLight(0xe43638, 4.1, 16.5, 1.38));
  coreLight.position.set(0, 2.35, -4.9);

  const altarSpotLight = registerLight(new THREE.PointLight(0xffca82, 3.0, 13.5, 1.45));
  altarSpotLight.position.set(0, 3.8, -1.6);

  const westCryptLight = registerLight(new THREE.PointLight(0xf2b56e, 3.25, 16.5, 1.45));
  westCryptLight.position.set(-13.4, 3.15, 0);

  const eastCryptLight = registerLight(new THREE.PointLight(0xebb06e, 3.1, 16.5, 1.45));
  eastCryptLight.position.set(13.5, 3.15, 0);

  const cellarLight = registerLight(new THREE.PointLight(0xdca562, 2.05, 10.0, 1.5));
  cellarLight.position.set(12.9, 2.7, 8.5);

  const reliquaryLight = registerLight(new THREE.PointLight(0xe48265, 2.35, 10.2, 1.5));
  reliquaryLight.position.set(-13.3, 3.1, -8.5);

  // Flame sprites & animated torches
  const flameSprites = [];
  const spawnFlameSprite = (x, y, z, scale = 0.28, parent = S) => {
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
    parent.add(sp);
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
    {
      pos = [0, 0, 0],
      ry = 0,
      rx = 0,
      rz = 0,
      targetHeight = null,
      scale = null,
      anchor = 'bottom',
      albedoLift = 0.26,
      playClip = false,
      clipSpeed = 1,
      flameOffset = null,
      flameOffsets = null,
      flameScale = 0.28,
      onReady = null,
    } = {}
  ) =>
    arch.track(
      loadGLB(`${VAULT_MODEL_BASE}/${relPath}`)
        .then((gltf) => {
          if (!gltf?.scene) return null;
          const root = gltf.scene.clone();
          normalizeModelMaterials(root, { psx: relPath.includes('/glb/'), npAll: true, albedoLift });
          if (rx) root.rotation.x = rx;
          if (rz) root.rotation.z = rz;
          const pivot = fitAndPivotModel(root, targetHeight, { extraScale: scale || 1, anchor });
          pivot.position.set(...pos);
          pivot.rotation.y = ry;
          S.add(pivot);
          let clipCtrl = null;
          if (playClip) clipCtrl = mountClipAnimation(pivot, gltf.animations, 0, { speed: clipSpeed });
          if (flameOffset) {
            spawnFlameSprite(flameOffset[0], flameOffset[1], flameOffset[2], flameScale, pivot);
          }
          if (Array.isArray(flameOffsets)) {
            flameOffsets.forEach(([fx, fy, fz]) => {
              spawnFlameSprite(fx, fy, fz, flameScale, pivot);
            });
          }
          onReady?.(pivot, gltf, clipCtrl);
          return pivot;
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
      rx = 0,
      targetHeight = null,
      scale = null,
      anchor = 'bottom',
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
          if (rx) root.rotation.x = rx;
          const pivot = fitAndPivotModel(root, targetHeight, { extraScale: scale || 1, anchor });
          pivot.position.set(...pos);
          pivot.rotation.y = ry;
          interact(pivot, id);
          add(pivot, { noShadow: true });
          visualInteract(id, pivot);
          onReady?.(pivot, gltf);
          return pivot;
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

  // 5B. core_glass (0, 0, -4.9): Gothic Suspended Reliquary Cage + Skinned flesh_blob.glb
  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, 0, -4.9);
  S.add(coreGroup);

  const pedStep = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.44, 0.24, 8), matFlagstone);
  pedStep.position.y = 0.12;
  coreGroup.add(pedStep);

  const pedDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 1.08, 0.56, 8), matConcrete);
  pedDrum.position.y = 0.52;
  coreGroup.add(pedDrum);

  const ironCollar = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.05, 0.09, 8), matDarkIron);
  ironCollar.position.y = 0.82;
  coreGroup.add(ironCollar);

  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    const px = Math.cos(ang) * 0.9;
    const pz = Math.sin(ang) * 0.9;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.92, 0.14), matDarkIron);
    pier.position.set(px, 1.78, pz);
    pier.rotation.y = ang;
    coreGroup.add(pier);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.48, 4), matDarkIron);
    spire.position.set(px, 2.94, pz);
    spire.rotation.y = ang;
    coreGroup.add(spire);
  }

  const midBand = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.032, 6, 8), matDarkIron);
  midBand.rotation.x = Math.PI / 2;
  midBand.position.y = 1.78;
  coreGroup.add(midBand);

  const upperRing = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.038, 6, 8), matDarkIron);
  upperRing.rotation.x = Math.PI / 2;
  upperRing.position.y = 2.74;
  coreGroup.add(upperRing);

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.06, 0.65, 8), matDarkIron);
  canopy.position.y = 3.08;
  coreGroup.add(canopy);

  // Heavy iron suspension chains rising to the 9.2m Nave vault roof so it's anchored, never floating
  const centerChain = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 5.9, 6), matDarkIron);
  centerChain.position.y = 6.25;
  coreGroup.add(centerChain);
  for (let c = 0; c < 4; c++) {
    const ang = (c * Math.PI) / 2 + Math.PI / 4;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 6.2, 5), matDarkIron);
    strut.position.set(Math.cos(ang) * 0.92, 6.1, Math.sin(ang) * 0.92);
    coreGroup.add(strut);
  }

  const crossPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), matDarkIron);
  crossPost.position.y = 3.55;
  coreGroup.add(crossPost);
  const crossArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.06), matDarkIron);
  crossArm.position.y = 3.63;
  coreGroup.add(crossArm);

  const leadedVessel = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.88, 8, 1, true), matCrackedGlass);
  leadedVessel.position.y = 1.78;
  coreGroup.add(leadedVessel);

  // Interior specimen glow lamp inside the cracked vessel
  const coreInnerLamp = new THREE.PointLight(0xff343e, 3.6, 5.8, 1.6);
  coreInnerLamp.position.set(0, 1.68, 0);
  coreGroup.add(coreInnerLamp);

  interact(coreGroup, 'core_glass');
  add(coreGroup, { noShadow: true });
  registerHitProxy('core_glass', [0, 1.65, -4.9], [2.3, 3.2, 2.3]);

  const bioMaps = createBioFleshTextures();
  const matFlesh = new THREE.MeshStandardMaterial({
    map: bioMaps.map,
    emissiveMap: bioMaps.emissiveMap,
    emissive: new THREE.Color(0xe62032),
    emissiveIntensity: 1.25,
    bumpMap: bioMaps.bumpMap,
    bumpScale: 0.05,
    roughness: 0.48,
    metalness: 0.12,
  });

  let fleshRoot = null;
  arch.track(
    loadGLB(`${VAULT_MODEL_BASE}/flesh_blob.glb`)
      .then((gltf) => {
        if (!gltf?.scene) return;
        const blobPivot = fitAndPivotSkinnedModel(gltf, 1.38, { anchor: 'bottom' });
        blobPivot.traverse((o) => {
          if (o.isMesh) {
            o.material = matFlesh;
            o.userData.np = true;
          }
        });
        blobPivot.position.set(0, 0.88, -4.9);
        S.add(blobPivot);
        fleshRoot = blobPivot;
        mountClipAnimation(blobPivot, gltf.animations, 0, { speed: 0.95 });
      })
      .catch(() => null)
  );

  placePropGLB('temple/glb/candelabra.glb', {
    pos: [-1.7, 0, -4.9],
    ry: Math.PI / 2,
    targetHeight: 1.75,
    flameOffsets: [[-0.29, 1.67, 0], [0, 1.76, 0], [0.29, 1.67, 0]],
    flameScale: 0.24,
  });
  placePropGLB('temple/glb/candelabra.glb', {
    pos: [1.7, 0, -4.9],
    ry: -Math.PI / 2,
    targetHeight: 1.75,
    flameOffsets: [[-0.29, 1.67, 0], [0, 1.76, 0], [0.29, 1.67, 0]],
    flameScale: 0.24,
  });
  placePropGLB('temple/glb/pillar_gothic.glb', { pos: [-3.65, 0, -4.9], targetHeight: 4.8, albedoLift: 0.25 });
  placePropGLB('temple/glb/pillar_gothic.glb', { pos: [3.65, 0, -4.9], targetHeight: 4.8, albedoLift: 0.25 });

  // 5C. central_console (0, 0, -2.05): Anointing Containment Altar R2-10
  placeInteractiveGLB('central_console.glb', 'central_console', {
    pos: [0, 0, -2.05],
    ry: 0,
    targetHeight: 1.12,
    albedoLift: 0.3,
    hitPos: [0, 0.85, -2.05],
    hitSize: [2.75, 1.65, 1.85],
  });

  // 5D. countdown_timer: Overhead Split-Flap Board + Apse High Altar Switch
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

  // Gothic High Altar below the apse clock so eye-level raycast catches countdown_timer cleanly
  placePropGLB('temple/glb/altar_high.glb', { pos: [0, 0, -8.0], ry: 0, scale: 1.05, albedoLift: 0.3 });
  registerHitProxy('countdown_timer', [0, 1.35, -7.85], [2.4, 2.3, 1.6]);
  registerHitProxy('countdown_timer', [0, 3.6, -8.45], [3.6, 1.6, 1.2]);

  const placeBloodDecal = (x, z, size = 2.2, ry = 0) =>
    pushStatic(new THREE.PlaneGeometry(size, size), matBloodGrime, x, 0.019, z, -Math.PI / 2, 0, ry);

  // Dried blood pools & grime splatter decals hinting at what unfolded in every chamber
  placeBloodDecal(-1.7, 11.2, 2.4, 0.4);
  placeBloodDecal(-4.9, 10.7, 2.6, -0.3);
  placeBloodDecal(4.45, 2.2, 2.8, 1.1);
  placeBloodDecal(0, -3.55, 2.5, 0.2);
  placeBloodDecal(-14.55, 1.45, 2.9, 0.8);
  placeBloodDecal(14.55, -2.0, 2.6, -0.6);

  // ── 6. Dress All 6 Chambers With Dense Storytelling Props & Horror Clutter ─
  // Zone 6A: Narthex & Holding Cell 01 (starting view must feel rich, tarnished & ominous)
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [-3.12, 2.35, 13.2], ry: Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [3.12, 2.35, 13.2], ry: -Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [-3.12, 2.35, 9.6], ry: Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [3.12, 2.35, 9.6], ry: -Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/torch_wall.glb', {
    pos: [-3.15, 1.85, 11.4],
    ry: Math.PI / 2,
    albedoLift: 0.38,
    playClip: true,
    flameOffset: [0, 0.72, -0.03],
  });
  placePropGLB('dungeon/glb/torch_wall.glb', {
    pos: [3.08, 1.85, 11.4],
    ry: -Math.PI / 2,
    albedoLift: 0.38,
    playClip: true,
    flameOffset: [0, 0.72, -0.03],
  });
  placePropGLB('wall_sconce.glb', { pos: [-3.18, 2.05, 14.2], ry: Math.PI / 2, targetHeight: 0.42, albedoLift: 0.38, flameOffset: [0, 0.28, 0.14], flameScale: 0.18 });
  placePropGLB('wall_sconce.glb', { pos: [3.16, 2.05, 14.2], ry: -Math.PI / 2, targetHeight: 0.42, albedoLift: 0.38, flameOffset: [0, 0.28, 0.14], flameScale: 0.18 });
  placePropGLB('temple/glb/candelabra.glb', {
    pos: [-1.85, 0, 8.95],
    targetHeight: 1.72,
    flameOffsets: [[-0.28, 1.64, 0], [0, 1.72, 0], [0.28, 1.64, 0]],
    flameScale: 0.24,
  });
  placePropGLB('temple/glb/candelabra.glb', {
    pos: [1.85, 0, 8.95],
    targetHeight: 1.72,
    flameOffsets: [[-0.28, 1.64, 0], [0, 1.72, 0], [0.28, 1.64, 0]],
    flameScale: 0.24,
  });
  // Tarnished crates, rusted barrels, burn-drum brazier & overturned church bench framing 6A corners
  placePropGLB('barrel_stove.glb', { pos: [2.52, 0, 14.85], ry: -0.6, targetHeight: 0.96, albedoLift: 0.38, flameOffset: [0, 0.88, 0], flameScale: 0.28 });
  placePropGLB('industrial/SM_Crate.glb', { pos: [2.45, 0, 13.75], ry: 0.18, targetHeight: 0.82, albedoLift: 0.36 });
  placePropGLB('industrial/SM_Barrel.glb', { pos: [-2.55, 0, 15.1], ry: 0.4, targetHeight: 0.94, albedoLift: 0.36 });
  placePropGLB('industrial/SM_Crate.glb', { pos: [-2.42, 0, 14.1], ry: -0.22, targetHeight: 0.8, albedoLift: 0.36 });
  placePropGLB('dungeon/glb/chest_wood.glb', { pos: [-2.4, 0.8, 14.1], ry: 0.32, targetHeight: 0.56 });
  placePropGLB('gothic_commode.glb', { pos: [-2.6, 0, 8.6], ry: Math.PI / 2, targetHeight: 1.05, albedoLift: 0.42 });
  placePropGLB('church_pew.glb', { pos: [-2.28, 0.04, 12.15], ry: 1.38, rz: 0.14, targetHeight: 0.95, albedoLift: 0.38 });
  placePropGLB('dungeon/glb/skeleton_chained.glb', { pos: [-2.95, 0, 9.15], ry: 0.85, targetHeight: 1.48 });
  placePropGLB('dungeon/glb/bed_straw.glb', { pos: [-6.15, 0, 11.6], ry: Math.PI / 2, scale: 1.05 });
  placePropGLB('dungeon/glb/skeleton_chained.glb', { pos: [-6.75, 0, 9.15], ry: 0.55, targetHeight: 1.55 });
  placePropGLB('temple/glb/skull_totem.glb', { pos: [-5.65, 0, 8.8], ry: 0.5, targetHeight: 1.85, albedoLift: 0.36 });

  // Interactable #1 (Lore 6A): narthex_registry
  placePropGLB('gothic_table.glb', { pos: [2.15, 0, 11.2], ry: -Math.PI / 2, targetHeight: 0.82, albedoLift: 0.42 });
  placePropGLB('candleholders.glb', { pos: [2.35, 0.82, 11.6], targetHeight: 0.34, flameOffset: [0.13, 0.35, 0], flameScale: 0.18 });
  placeInteractiveGLB('binder_notebook.glb', 'narthex_registry', {
    pos: [2.05, 0.82, 11.15],
    ry: -Math.PI / 2,
    scale: 0.85,
    albedoLift: 0.42,
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
  pushStatic(new THREE.BoxGeometry(0.46, 0.36, 0.09), matCarvedOak, -3.28, 1.15, 10.9);
  registerHitProxy('cell_manifest', [-3.28, 1.15, 10.9], [0.9, 1.15, 1.1]);

  // Zone 6B: Nave Sightlines, Tarnished Pews, Braziers, Crates, Wall Sconces & Autopsy Table
  placePropGLB('temple/glb/brazier_hell.glb', { pos: [-2.25, 0, 6.2], targetHeight: 1.4, playClip: true, flameOffset: [0, 1.25, 0] });
  placePropGLB('temple/glb/brazier_hell.glb', { pos: [2.25, 0, 6.2], targetHeight: 1.4, playClip: true, flameOffset: [0, 1.25, 0] });
  placePropGLB('barrel_stove.glb', { pos: [-7.35, 0, -7.2], ry: 0.4, targetHeight: 0.98, albedoLift: 0.38, flameOffset: [0, 0.9, 0], flameScale: 0.28 });
  placePropGLB('barrel_stove.glb', { pos: [7.35, 0, -7.2], ry: -0.4, targetHeight: 0.98, albedoLift: 0.38, flameOffset: [0, 0.9, 0], flameScale: 0.28 });
  placePropGLB('industrial/SM_Crate.glb', { pos: [-7.3, 0, -5.7], ry: 0.25, targetHeight: 0.85, albedoLift: 0.36 });
  placePropGLB('industrial/SM_Barrel.glb', { pos: [7.3, 0, -5.8], ry: 0.1, targetHeight: 0.92, albedoLift: 0.36 });
  placePropGLB('industrial_pipes.glb', { pos: [8.1, 2.0, -2.5], ry: -Math.PI / 2, targetHeight: 2.8, albedoLift: 0.36 });
  placePropGLB('industrial_pipes.glb', { pos: [8.1, 2.0, 2.5], ry: -Math.PI / 2, targetHeight: 2.8, albedoLift: 0.36 });
  placePropGLB('temple/glb/skull_totem.glb', { pos: [-3.4, 0, -8.35], ry: 0.35, targetHeight: 1.95, albedoLift: 0.36 });
  placePropGLB('temple/glb/skull_totem.glb', { pos: [3.4, 0, -8.35], ry: -0.35, targetHeight: 1.95, albedoLift: 0.36 });
  placePropGLB('dungeon/glb/torch_wall.glb', {
    pos: [-8.25, 1.9, -1.65],
    ry: Math.PI / 2,
    albedoLift: 0.38,
    playClip: true,
    flameOffset: [0, 0.72, -0.03],
  });
  placePropGLB('dungeon/glb/torch_wall.glb', {
    pos: [-8.25, 1.9, 1.65],
    ry: Math.PI / 2,
    albedoLift: 0.38,
    playClip: true,
    flameOffset: [0, 0.72, -0.03],
  });
  placePropGLB('dungeon/glb/torch_wall.glb', {
    pos: [8.25, 1.9, -1.65],
    ry: -Math.PI / 2,
    albedoLift: 0.38,
    playClip: true,
    flameOffset: [0, 0.72, -0.03],
  });
  placePropGLB('dungeon/glb/torch_wall.glb', {
    pos: [8.25, 1.9, 1.65],
    ry: -Math.PI / 2,
    albedoLift: 0.38,
    playClip: true,
    flameOffset: [0, 0.72, -0.03],
  });
  placePropGLB('temple/glb/banner_hell.glb', { pos: [-4.9, 4.1, -4.85], ry: Math.PI / 2, playClip: true });
  placePropGLB('temple/glb/banner_hell.glb', { pos: [4.9, 4.1, -4.85], ry: -Math.PI / 2, playClip: true });
  placePropGLB('temple/glb/pew.glb', { pos: [-3.9, 0, 2.0], ry: Math.PI, targetHeight: 1.05, albedoLift: 0.36 });
  placePropGLB('temple/glb/pew.glb', { pos: [-3.9, 0, 4.6], ry: Math.PI, targetHeight: 1.05, albedoLift: 0.36 });
  placePropGLB('temple/glb/pew.glb', { pos: [-6.25, 0, 3.3], ry: Math.PI / 2, targetHeight: 1.05, albedoLift: 0.36 });
  placePropGLB('church_pew.glb', { pos: [3.9, 0.04, 4.6], ry: Math.PI + 0.12, rz: -0.08, targetHeight: 1.02, albedoLift: 0.36 });
  placePropGLB('dungeon/glb/chest_wood.glb', { pos: [-6.8, 0, -7.9], ry: 0.4, targetHeight: 0.65 });
  placePropGLB('dungeon/glb/chest_wood.glb', { pos: [6.8, 0, -7.9], ry: -0.4, targetHeight: 0.65 });
  placePropGLB('temple/glb/candelabra.glb', {
    pos: [-2.65, 0, -7.95],
    targetHeight: 1.75,
    flameOffsets: [[-0.29, 1.67, 0], [0, 1.76, 0], [0.29, 1.67, 0]],
    flameScale: 0.24,
  });
  placePropGLB('temple/glb/candelabra.glb', {
    pos: [2.65, 0, -7.95],
    targetHeight: 1.75,
    flameOffsets: [[-0.29, 1.67, 0], [0, 1.76, 0], [0.29, 1.67, 0]],
    flameScale: 0.24,
  });

  // Interactable #3 (Lore 6B): autopsy_gurney
  placeInteractiveGLB('gothic_table.glb', 'autopsy_gurney', {
    pos: [4.5, 0, 2.3],
    ry: Math.PI / 2,
    targetHeight: 0.86,
    albedoLift: 0.38,
    hitPos: [4.5, 0.9, 2.3],
    hitSize: [2.1, 1.2, 2.1],
  });
  placePropGLB('dead_body.glb', { pos: [4.5, 0.86, 2.3], ry: Math.PI / 2, targetHeight: 0.23, albedoLift: 0.38 });
  placePropGLB('handsaw.glb', { pos: [5.28, 0.862, 2.35], rx: 0, rz: Math.PI / 2, ry: 0.28, targetHeight: 0.04 });
  placePropGLB('tool_cart.glb', { pos: [5.95, 0, 2.95], ry: -0.4, targetHeight: 0.95, albedoLift: 0.36 });

  // Zone 6C: West Scriptorium Study (RE-inspired warm mahogany desk + terminal + slumped body)
  placePropGLB('gothic_table.glb', {
    pos: [-15.15, 0, 0],
    ry: Math.PI / 2,
    targetHeight: 0.82,
    albedoLift: 0.44,
  });
  placePropGLB('candleholders.glb', {
    pos: [-15.05, 0.82, -0.64],
    targetHeight: 0.38,
    flameOffset: [0.14, 0.39, 0],
    flameScale: 0.2,
  });
  placeInteractiveGLB('manual_terminal.glb', 'manual_terminal', {
    pos: [-15.15, 0.82, 0],
    ry: Math.PI / 2,
    targetHeight: 0.62,
    albedoLift: 0.38,
    screenTex: texCrtManual,
    hitPos: [-15.05, 1.05, 0],
    hitSize: [1.75, 1.75, 1.75],
  });
  // Slumped victim beside the 6C archivist desk (echoes RE study carnage in warm lamp light)
  placePropGLB('dead_body.glb', { pos: [-14.55, 0, 1.48], ry: -0.85, targetHeight: 0.32, albedoLift: 0.42 });
  placePropGLB('barrel_stove.glb', { pos: [-15.95, 0, -2.35], ry: 0.5, targetHeight: 0.95, albedoLift: 0.38, flameOffset: [0, 0.86, 0], flameScale: 0.26 });
  placePropGLB('industrial/SM_Crate.glb', { pos: [-16.0, 0, 2.15], ry: 0.2, targetHeight: 0.8, albedoLift: 0.38 });
  placePropGLB('gothic_commode.glb', { pos: [-10.6, 0, -4.8], ry: 0, targetHeight: 1.08, albedoLift: 0.42 });
  placePropGLB('wall_sconce.glb', { pos: [-16.82, 2.0, -1.6], ry: Math.PI / 2, targetHeight: 0.42, albedoLift: 0.4, flameOffset: [0, 0.28, 0.14], flameScale: 0.18 });
  placePropGLB('wall_sconce.glb', { pos: [-16.82, 2.0, 1.6], ry: Math.PI / 2, targetHeight: 0.42, albedoLift: 0.4, flameOffset: [0, 0.28, 0.14], flameScale: 0.18 });

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

  // scriptorium_books (articulated gothic_cabinet doors + table + candleholders + reading pew)
  placeInteractiveGLB('gothic_cabinet.glb', 'scriptorium_books', {
    pos: [-13.8, 0, 4.95],
    ry: Math.PI,
    targetHeight: 2.25,
    albedoLift: 0.36,
    hitPos: [-13.8, 1.2, 4.75],
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
  placePropGLB('gothic_table.glb', { pos: [-13.8, 0, 3.25], targetHeight: 0.78, albedoLift: 0.34 });
  placePropGLB('candleholders.glb', { pos: [-13.5, 0.78, 3.25], targetHeight: 0.42, flameOffset: [0.16, 0.43, 0], flameScale: 0.22 });
  placePropGLB('temple/glb/pew.glb', { pos: [-11.7, 0, 3.6], ry: Math.PI, targetHeight: 1.02, albedoLift: 0.32 });
  placePropGLB('temple/glb/candelabra.glb', {
    pos: [-15.85, 0, 4.8],
    targetHeight: 1.72,
    flameOffsets: [[-0.28, 1.64, 0], [0, 1.72, 0], [0.28, 1.64, 0]],
    flameScale: 0.24,
  });
  placePropGLB('dungeon/glb/chest_wood.glb', { pos: [-10.35, 0, 4.85], ry: -0.55, targetHeight: 0.62 });
  placePropGLB('dungeon/glb/skeleton_chained.glb', { pos: [-16.15, 0, -4.7], ry: 0.65, targetHeight: 1.55 });
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [-16.82, 2.5, -4.4], ry: Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [-16.82, 2.5, 4.4], ry: Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/torch_wall.glb', {
    pos: [-16.75, 1.85, 0],
    ry: Math.PI / 2,
    albedoLift: 0.34,
    playClip: true,
    flameOffset: [0, 0.72, -0.03],
  });
  placePropGLB('gothic_commode.glb', { pos: [-15.85, 0, -3.9], ry: Math.PI / 2, targetHeight: 1.05, albedoLift: 0.36 });

  // Zone 6F: North Reliquary Chapel (specimen_locker + chest_wood + skull_totem + candelabras)
  placeInteractiveGLB('vintage_cabinet.glb', 'specimen_locker', {
    pos: [-13.3, 0, -10.15],
    ry: 0,
    targetHeight: 2.15,
    albedoLift: 0.36,
    hitPos: [-13.3, 1.15, -9.95],
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
    targetHeight: 0.62,
    onReady: (root, gltf) => {
      const chestAnim = mountClipAnimation(root, gltf.animations, 0, { loop: THREE.LoopOnce, speed: 1.25, autoPlay: false });
      const prev = interactAnims.specimen_locker;
      interactAnims.specimen_locker = () => {
        prev?.();
        chestAnim?.action?.reset().play();
      };
    },
  });
  placePropGLB('temple/glb/skull_totem.glb', { pos: [-15.1, 0, -9.9], ry: 0.4, targetHeight: 2.15 });
  placePropGLB('temple/glb/candelabra.glb', {
    pos: [-14.8, 0, -7.8],
    targetHeight: 1.68,
    flameOffsets: [[-0.28, 1.61, 0], [0, 1.69, 0], [0.28, 1.61, 0]],
    flameScale: 0.24,
  });

  // Zone 6D: East Switchgear & Gothic Relay Sanctuary (failsafe_panel R2-09 + switchgear_log)
  // Carved dark stone & forged-iron pedestal ensures full unclipped failsafe_panel clearance
  pushStatic(new THREE.BoxGeometry(1.76, 0.36, 1.76), matFlagstone, 15.55, 0.18, 0);
  pushStatic(new THREE.BoxGeometry(1.82, 0.06, 1.82), matDarkIron, 15.55, 0.35, 0);
  let failsafeAction = null;
  placeInteractiveGLB('failsafe_panel.glb', 'failsafe_panel', {
    pos: [15.55, 0.36, 0],
    ry: -Math.PI / 2,
    targetHeight: 1.55,
    albedoLift: 0.34,
    hitPos: [15.4, 1.15, 0],
    hitSize: [1.7, 2.1, 1.85],
    onReady: (root, gltf) => {
      const ctrl = mountClipAnimation(root, gltf.animations, 0, {
        loop: THREE.LoopOnce,
        speed: 2.6,
        autoPlay: false,
      });
      failsafeAction = ctrl?.action || null;
    },
  });

  // Ceiling-anchored swinging sanctuary lamp in 6D (suspended by iron chain from y=6.18m roof!)
  const eastLampPivot = new THREE.Group();
  eastLampPivot.position.set(12.8, 6.18, 0);
  S.add(eastLampPivot);
  let eastSwingLamp = eastLampPivot;
  const lampChain = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.32, 8), matDarkIron);
  lampChain.position.y = -1.16;
  eastLampPivot.add(lampChain);
  arch.track(
    loadGLB(`${VAULT_MODEL_BASE}/hanging_lamp.glb`)
      .then((gltf) => {
        if (!gltf?.scene) return null;
        const lamp = gltf.scene.clone();
        normalizeModelMaterials(lamp, { npAll: true, albedoLift: 0.3 });
        const pivotedLamp = fitAndPivotModel(lamp, 1.08, { anchor: 'top' });
        pivotedLamp.position.set(0, -2.3, 0);
        eastLampPivot.add(pivotedLamp);
        return pivotedLamp;
      })
      .catch(() => null)
  );

  // Rich Gothic furnishing across all 4 quadrants of 6D (zero barren empty floor!)
  placePropGLB('temple/glb/pillar_gothic.glb', { pos: [16.4, 0, 5.4], targetHeight: 6.15, albedoLift: 0.26 });
  placePropGLB('temple/glb/pillar_gothic.glb', { pos: [16.4, 0, -5.4], targetHeight: 6.15, albedoLift: 0.26 });
  placePropGLB('dungeon/glb/torch_wall.glb', {
    pos: [16.75, 1.85, -2.6],
    ry: -Math.PI / 2,
    albedoLift: 0.34,
    playClip: true,
    flameOffset: [0, 0.72, -0.03],
  });
  placePropGLB('dungeon/glb/torch_wall.glb', {
    pos: [16.75, 1.85, 2.6],
    ry: -Math.PI / 2,
    albedoLift: 0.34,
    playClip: true,
    flameOffset: [0, 0.72, -0.03],
  });
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [16.82, 2.4, -4.2], ry: -Math.PI / 2, playClip: true });
  placePropGLB('dungeon/glb/banner_red.glb', { pos: [16.82, 2.4, 4.2], ry: -Math.PI / 2, playClip: true });
  placePropGLB('temple/glb/candelabra.glb', {
    pos: [15.2, 0, -2.0],
    ry: -Math.PI / 2,
    targetHeight: 1.72,
    flameOffsets: [[-0.28, 1.64, 0], [0, 1.72, 0], [0.28, 1.64, 0]],
    flameScale: 0.24,
  });
  placePropGLB('temple/glb/candelabra.glb', {
    pos: [15.2, 0, 2.0],
    ry: -Math.PI / 2,
    targetHeight: 1.72,
    flameOffsets: [[-0.28, 1.64, 0], [0, 1.72, 0], [0.28, 1.64, 0]],
    flameScale: 0.24,
  });
  placePropGLB('temple/glb/brazier_hell.glb', { pos: [10.15, 0, -2.3], targetHeight: 1.35, playClip: true, flameOffset: [0, 1.22, 0] });
  placePropGLB('gothic_cabinet.glb', { pos: [10.8, 0, -5.25], ry: 0, targetHeight: 2.25, albedoLift: 0.34 });
  placePropGLB('vintage_cabinet.glb', { pos: [14.95, 0, -5.35], ry: 0, targetHeight: 2.15, albedoLift: 0.34 });
  placePropGLB('temple/glb/skull_totem.glb', { pos: [16.2, 0, -4.75], ry: -0.6, targetHeight: 2.05 });

  // switchgear_log study table + articulated crate_medical + ledger
  placePropGLB('work_table.glb', { pos: [12.6, 0, -3.55], ry: 0, targetHeight: 0.85, albedoLift: 0.34 });
  placePropGLB('candleholders.glb', { pos: [12.05, 0.85, -3.55], targetHeight: 0.36, flameOffset: [0.14, 0.37, 0], flameScale: 0.18 });
  placeInteractiveGLB('crate_medical.glb', 'switchgear_log', {
    pos: [12.65, 0.85, -3.55],
    ry: -0.2,
    targetHeight: 0.4,
    albedoLift: 0.36,
    hitPos: [12.6, 1.05, -3.55],
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

  // South half of 6D (pews, oak table, chest, chained skeleton, industrial debris & slumped body)
  placePropGLB('gothic_table.glb', { pos: [10.4, 0, 4.4], targetHeight: 0.8, albedoLift: 0.38 });
  placePropGLB('candleholders.glb', { pos: [10.4, 0.8, 4.4], targetHeight: 0.38, flameOffset: [0.15, 0.39, 0], flameScale: 0.2 });
  placePropGLB('temple/glb/pew.glb', { pos: [10.4, 0, 2.55], ry: 0, targetHeight: 1.02, albedoLift: 0.36 });
  placePropGLB('temple/glb/pew.glb', { pos: [15.45, 0, 3.85], ry: -Math.PI / 2, targetHeight: 1.02, albedoLift: 0.36 });
  placePropGLB('dungeon/glb/chest_wood.glb', { pos: [15.65, 0, 5.2], ry: -2.4, targetHeight: 0.62 });
  placePropGLB('dungeon/glb/skeleton_chained.glb', { pos: [16.2, 0, 4.9], ry: -2.2, targetHeight: 1.55 });
  placePropGLB('barrel_stove.glb', { pos: [15.9, 0, -2.5], ry: -0.7, targetHeight: 0.96, albedoLift: 0.38, flameOffset: [0, 0.88, 0], flameScale: 0.28 });
  placePropGLB('industrial/SM_Barrel.glb', { pos: [16.05, 0, 1.8], targetHeight: 0.92, albedoLift: 0.36 });
  placePropGLB('industrial/SM_Crate.glb', { pos: [15.85, 0, 2.65], ry: 0.35, targetHeight: 0.8, albedoLift: 0.36 });
  placePropGLB('dead_body.glb', { pos: [14.55, 0, -2.0], ry: 1.9, targetHeight: 0.3, albedoLift: 0.4 });
  placePropGLB('wall_sconce.glb', { pos: [16.82, 2.0, -1.6], ry: -Math.PI / 2, targetHeight: 0.42, albedoLift: 0.4, flameOffset: [0, 0.28, 0.14], flameScale: 0.18 });
  placePropGLB('wall_sconce.glb', { pos: [16.82, 2.0, 1.6], ry: -Math.PI / 2, targetHeight: 0.42, albedoLift: 0.4, flameOffset: [0, 0.28, 0.14], flameScale: 0.18 });

  // Zone 6E: South Quarantine Cellar (sarcophagus_se)
  placeInteractiveGLB('gothic_bed.glb', 'sarcophagus_se', {
    pos: [12.9, 0, 9.6],
    ry: 0,
    targetHeight: 0.92,
    albedoLift: 0.32,
    hitPos: [12.9, 0.9, 9.6],
    hitSize: [1.75, 1.35, 1.75],
  });
  placePropGLB('dungeon/glb/skeleton_chained.glb', { pos: [11.6, 0, 10.1], ry: -0.6, targetHeight: 1.55 });
  placePropGLB('temple/glb/candelabra.glb', {
    pos: [11.65, 0, 8.15],
    targetHeight: 1.55,
    flameOffsets: [[-0.26, 1.48, 0], [0, 1.56, 0], [0.26, 1.48, 0]],
    flameScale: 0.22,
  });
  placePropGLB('dungeon/glb/chest_wood.glb', {
    pos: [14.0, 0, 8.2],
    ry: -1.1,
    targetHeight: 0.58,
    onReady: (root, gltf) => {
      const chestAnim = mountClipAnimation(root, gltf.animations, 0, { loop: THREE.LoopOnce, speed: 1.2, autoPlay: false });
      interactAnims.sarcophagus_se = () => {
        chestAnim?.action?.reset().play();
      };
    },
  });

  // ── 7. 3D Horror Apparitions (SkeletonUtils.clone + animated SkinnedMesh normalization) ─
  const ghostLight = new THREE.PointLight(0xffe0c8, 0, 9.5, 1.2);
  S.add(ghostLight);
  ref.ghostLight = ghostLight;

  const enhanceEntityVisibility = (pivot) => {
    pivot.traverse((o) => {
      if (o.isMesh && o.material) {
        o.material.emissive = new THREE.Color(0x281214);
        o.material.emissiveIntensity = 0.26;
        o.material.roughness = Math.min(o.material.roughness ?? 0.8, 0.68);
        o.material.needsUpdate = true;
      }
    });
  };

  arch.track(
    loadGLB(`${VAULT_MODEL_BASE}/manthing.glb`)
      .then((gltf) => {
        if (!gltf?.scene) return;
        const gPivot = fitAndPivotSkinnedModel(gltf, 2.02, { anchor: 'bottom' });
        normalizeModelMaterials(gPivot, { npAll: true, albedoLift: 0.44 });
        enhanceEntityVisibility(gPivot);
        gPivot.visible = false;
        S.add(gPivot);
        ref.ghost = gPivot;
        const ctrl = mountClipAnimation(gPivot, gltf.animations, 0, { speed: 1.25 });
        ref.ghostMixer = ctrl?.mixer || null;
      })
      .catch(() => null)
  );

  arch.track(
    loadGLB(`${VAULT_MODEL_BASE}/stalker.glb`)
      .then((gltf) => {
        if (!gltf?.scene) return;
        const stPivot = fitAndPivotSkinnedModel(gltf, 1.92, { anchor: 'bottom' });
        normalizeModelMaterials(stPivot, { npAll: true, albedoLift: 0.46 });
        enhanceEntityVisibility(stPivot);
        stPivot.visible = false;
        S.add(stPivot);
        ref.stalker = stPivot;
        const ctrl = mountClipAnimation(stPivot, gltf.animations, 0, { speed: 1.0 });
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
    { key: 'west_scriptorium', x: -8.45, z: 0, radius: 2.9 },
    { key: 'north_chapel', x: -13.3, z: -6.05, radius: 2.7 },
    { key: 'south_cellar', x: 12.9, z: 6.08, radius: 2.7 },
    { key: 'east_gate', x: 8.45, z: 0, radius: 2.8 },
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

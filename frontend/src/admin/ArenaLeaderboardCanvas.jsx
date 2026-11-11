import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Configuration for Arena, Podium & Characters
const SCENE_CONFIG = {
  arena: {
    url: '/models/low_poly_gladiators_arena_realistic_style.glb',
    pos: [0, -0.2, 0],
    scale: 1.0,
    rotY: 0
  },
  base: {
    url: '/models/base.glb',
    // Place the larger podium on the tower roof between its pink crystal supports.
    pos: [0, 15.55, 18.0],
    scale: 13.0,
    rotY: Math.PI // Faces the audience/camera
  },
  podiumChars: [
    // Rank 1: Grim Reaper (Center, highest tier)
    {
      url: '/models/podium_1.glb',
      offset: [0, 19.45, 18.0],
      targetHeight: 5.0,
      rotY: 0, // This GLB's front faces the camera without a half-turn.
      rank: 1
    },
    // Rank 2: Left tier (on pedestal #2, +X is screen-left when looking toward +Z)
    {
      url: '/models/podium_2.glb',
      offset: [3.8, 18.65, 18.0],
      targetHeight: 4.5,
      rotY: Math.PI,
      rank: 2
    },
    // Rank 3: Right tier (on pedestal #3, -X is screen-right when looking toward +Z)
    {
      url: '/models/podium_3.glb',
      offset: [-3.8, 20.62, 18.0],
      targetHeight: 4.5,
      rotY: Math.PI,
      rank: 3
    }
  ]
};

// 12 Runners staggered in racing lanes on the arena floor (facing the podium at +Z)
const RUNNER_COORDS = [
  { x: -9.0, z: -4.0 }, // Rank 4
  { x: -3.0, z: -3.3 }, // Rank 5
  { x: 3.0, z: -3.8 },   // Rank 6
  { x: 9.0, z: -3.0 },   // Rank 7
  { x: -9.0, z: -2.0 }, // Rank 8
  { x: -3.0, z: -1.4 }, // Rank 9
  { x: 3.0, z: -1.8 },   // Rank 10
  { x: 9.0, z: -0.8 },   // Rank 11
  { x: -9.0, z: 0.2 },   // Rank 12
  { x: -3.0, z: 1.0 },   // Rank 13
  { x: 3.0, z: 2.0 },    // Rank 14
  { x: 9.0, z: 4.0 }     // Rank 15
];

export default function ArenaLeaderboardCanvas({ teams = [], round = 1 }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [screenPlaques, setScreenPlaques] = useState([]);
  const [screenPennants, setScreenPennants] = useState([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [sceneError, setSceneError] = useState('');
  const [loadErrors, setLoadErrors] = useState([]);

  // Three.js instances
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const mixersRef = useRef([]);
  const trackedCharsRef = useRef([]); // Podium chars { rank, headAnchor }
  const trackedRunnersRef = useRef([]); // Runner chars { rank, headAnchor, mesh, seed }
  const reqIdRef = useRef(null);

  const teamsRef = useRef(teams);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  const roundRef = useRef(round);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let destroyed = false;
    let renderer, scene, camera, particleSystem, wispSystem, controls;
    let handleDebugKey;
    let particleCount = 0;
    let particleVelocities = [];
    let wispCount = 0;
    let wispVelocities = [];
    let torchLeftLight = null;
    let torchRightLight = null;
    const mixers = [];
    mixersRef.current = mixers;
    const trackedChars = [];
    trackedCharsRef.current = trackedChars;
    const trackedRunners = [];
    trackedRunnersRef.current = trackedRunners;

    try {
      // 1. Scene Setup - Haunted Midnight Void
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x07040c);
      scene.fog = new THREE.Fog(0x07040c, 95, 235);
      sceneRef.current = scene;

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      // Framing: Elevated stadium view capturing both the 12 runners on the sand and the 3 champions atop the tower.
      camera = new THREE.PerspectiveCamera(62, width / height, 0.5, 300);
      camera.position.set(0, 24.5, -26.5);
      camera.lookAt(0, 12.0, 9.0);
      cameraRef.current = camera;

      // 3. WebGL Renderer with Balanced Night Exposure (avoids washed-out sand/walls)
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 12.0, 9.0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 8;
      controls.maxDistance = 55;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.update();
      handleDebugKey = (event) => {
        if (event.key.toLowerCase() === 'p') {
          console.info('Arena camera:', camera.position.toArray(), 'target:', controls.target.toArray());
        }
      };
      window.addEventListener('keydown', handleDebugKey);

      // 4. Haunted Moonlit + Torch Lighting (Moody dark atmosphere with clear silhouettes)
      const ambient = new THREE.AmbientLight(0x8a7bb8, 0.95);
      scene.add(ambient);
      scene.add(new THREE.HemisphereLight(0x6d58b5, 0x26140d, 0.75));

      // Pale Cold Moonlight over the amphitheater
      const sunLight = new THREE.DirectionalLight(0xaec2ff, 1.65);
      sunLight.position.set(10, 28, -12);
      sunLight.target.position.set(0, 4, 6);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      scene.add(sunLight);
      scene.add(sunLight.target);

      // Dedicated Fiery Amber Spotlight for the 1-2-3 Tower Base
      const podiumSun = new THREE.DirectionalLight(0xff9b26, 2.4);
      podiumSun.position.set(0, 26, 8);
      podiumSun.target.position.set(0, 15, 18);
      scene.add(podiumSun);
      scene.add(podiumSun.target);

      // Flanking Hellfire Torches
      torchLeftLight = new THREE.PointLight(0xff4411, 3.8, 55, 0.6);
      torchLeftLight.position.set(-15, 8, 6);
      scene.add(torchLeftLight);

      torchRightLight = new THREE.PointLight(0xff6622, 3.8, 55, 0.6);
      torchRightLight.position.set(15, 8, 6);
      scene.add(torchRightLight);

      // Floating embers & ghostly soul sparks
      particleCount = 110;
      const particleGeo = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      particleVelocities = [];

      for (let i = 0; i < particleCount; i++) {
        particlePositions[i * 3] = (Math.random() - 0.5) * 38;
        particlePositions[i * 3 + 1] = Math.random() * 16;
        particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 28 + 3;
        particleVelocities.push({
          y: 0.7 + Math.random() * 1.4,
          x: (Math.random() - 0.5) * 0.45,
          z: (Math.random() - 0.5) * 0.45
        });
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0xff6622,
        size: 0.2,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      particleSystem = new THREE.Points(particleGeo, particleMat);
      scene.add(particleSystem);

      // Ghostly spectral violet wisps drifting through the night air
      wispCount = 45;
      const wispGeo = new THREE.BufferGeometry();
      const wispPositions = new Float32Array(wispCount * 3);
      wispVelocities = [];

      for (let i = 0; i < wispCount; i++) {
        wispPositions[i * 3] = (Math.random() - 0.5) * 40;
        wispPositions[i * 3 + 1] = Math.random() * 14 + 0.5;
        wispPositions[i * 3 + 2] = (Math.random() - 0.5) * 32 + 4;
        wispVelocities.push({
          y: 0.25 + Math.random() * 0.55,
          phase: Math.random() * Math.PI * 2,
          amp: 0.4 + Math.random() * 0.6
        });
      }

      wispGeo.setAttribute('position', new THREE.BufferAttribute(wispPositions, 3));
      const wispMat = new THREE.PointsMaterial({
        color: 0xa855f7,
        size: 0.34,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending
      });
      wispSystem = new THREE.Points(wispGeo, wispMat);
      scene.add(wispSystem);

    } catch (e) {
      console.warn('WebGL initialization skipped (Headless/JSDOM):', e);
      setSceneError('This browser could not start WebGL for the arena.');
      return;
    }

    // 6. Model Loading
    const loader = new GLTFLoader();
    let loadedCount = 0;
    const totalAssets = 6;
    const markLoaded = () => {
      loadedCount++;
      setLoadProgress(Math.round((loadedCount / totalAssets) * 100));
      if (loadedCount >= totalAssets) {
        setAssetsLoaded(true);
      }
    };
    const handleLoadError = (url) => (error) => {
      console.error(`Could not load arena model: ${url}`, error);
      setLoadErrors((errors) => [...errors, `${url.split('/').pop()}: ${error?.message || 'load failed'}`]);
      markLoaded();
    };

    const normalizeScale = (gltf, targetHeight) => {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const factor = targetHeight / (size.y || 1);
      gltf.scene.scale.set(factor, factor, factor);
      return factor;
    };

    // A) Load Arena Amphitheater
    loader.load(
      SCENE_CONFIG.arena.url,
      (gltf) => {
        if (destroyed) return;
        const arena = gltf.scene;
        arena.position.set(...SCENE_CONFIG.arena.pos);
        arena.scale.set(SCENE_CONFIG.arena.scale, SCENE_CONFIG.arena.scale, SCENE_CONFIG.arena.scale);
        arena.traverse((child) => {
          if (child.isMesh) {
            child.receiveShadow = true;
            child.castShadow = true;
          }
        });
        scene.add(arena);
        markLoaded();
      },
      undefined,
      handleLoadError(SCENE_CONFIG.arena.url)
    );

    // B) Load Podium Base (1-2-3 Base in front of gate)
    loader.load(
      SCENE_CONFIG.base.url,
      (gltf) => {
        if (destroyed) return;
        const base = gltf.scene;
        base.position.set(...SCENE_CONFIG.base.pos);
        base.scale.set(SCENE_CONFIG.base.scale, SCENE_CONFIG.base.scale, SCENE_CONFIG.base.scale);
        base.rotation.y = SCENE_CONFIG.base.rotY;
        base.traverse((child) => {
          if (child.isMesh) {
            child.receiveShadow = true;
            child.castShadow = true;
          }
        });
        scene.add(base);
        markLoaded();
      },
      undefined,
      handleLoadError(SCENE_CONFIG.base.url)
    );

    // C) Load the 3 Podium Champions
    SCENE_CONFIG.podiumChars.forEach((cfg) => {
      loader.load(
        cfg.url,
        (gltf) => {
          if (destroyed) return;
          const char = gltf.scene;
          normalizeScale(gltf, cfg.targetHeight);
          char.position.set(...cfg.offset);
          char.rotation.y = cfg.rotY;

          char.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Play standing idle animation
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(char);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
            mixers.push(mixer);
          }

          scene.add(char);
          char.updateMatrixWorld(true);
          const charBox = new THREE.Box3().setFromObject(char);
          const charCenter = charBox.getCenter(new THREE.Vector3());

          trackedChars.push({
            rank: cfg.rank,
            mesh: char,
            headAnchor: new THREE.Vector3(charCenter.x, charBox.max.y + 0.35, charCenter.z)
          });

          markLoaded();
        },
        undefined,
        handleLoadError(cfg.url)
      );
    });

    // D) Load Running Boy & Clone for Ranks 4 to 15
    loader.load(
      '/models/running_boy.glb',
      (gltf) => {
        if (destroyed) return;
        const boyBase = gltf.scene;
        normalizeScale(gltf, 2.6);

        RUNNER_COORDS.forEach((pos, idx) => {
          const rank = idx + 4;
          const runner = SkeletonUtils.clone(boyBase);
          runner.position.set(pos.x, -0.2, pos.z);
          // Facing forward towards the podium (+Z)
          runner.rotation.y = 0 + (pos.x > 0 ? 0.08 : -0.08);

          runner.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Enable animation if present
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(runner);
            const action = mixer.clipAction(gltf.animations[0]);
            action.time = (idx * 0.2) % (gltf.animations[0].duration || 1);
            action.play();
            mixers.push(mixer);
          }

          scene.add(runner);

          const headAnchor = new THREE.Vector3(pos.x, 2.6, pos.z);
          trackedRunners.push({
            rank,
            mesh: runner,
            headAnchor,
            seed: idx * 0.65
          });
        });

        markLoaded();
      },
      undefined,
      handleLoadError('/models/running_boy.glb')
    );

    // 7. Render Loop with Embers, Torch Flicker, and Projection
    const clock = new THREE.Clock();
    const tempVec = new THREE.Vector3();
    let projectionElapsed = 0;

    const animate = () => {
      if (destroyed) return;
      reqIdRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      controls.update();
      camera.lookAt(controls.target);

      // Update character animation mixers
      for (let i = 0; i < mixers.length; i++) {
        mixers[i].update(delta);
      }

      // Stride bobbing for runners
      for (let i = 0; i < trackedRunners.length; i++) {
        const r = trackedRunners[i];
        if (r.mesh) {
          const bob = Math.sin(elapsed * 9.0 + r.seed) * 0.06;
          r.mesh.position.y = -0.2 + Math.max(0, bob);
          r.headAnchor.y = 2.6 + bob;
        }
      }

      // Torch flame flicker
      if (torchLeftLight) {
        torchLeftLight.intensity = 3.8 + Math.sin(elapsed * 11.0) * 0.6 + Math.cos(elapsed * 23.0) * 0.25;
      }
      if (torchRightLight) {
        torchRightLight.intensity = 3.8 + Math.cos(elapsed * 13.0) * 0.6 + Math.sin(elapsed * 19.0) * 0.25;
      }

      // Update fire ember particles
      if (particleSystem) {
        const positions = particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          positions[i * 3 + 1] += particleVelocities[i].y * delta * 2.0;
          positions[i * 3] += particleVelocities[i].x * delta;
          positions[i * 3 + 2] += particleVelocities[i].z * delta;

          if (positions[i * 3 + 1] > 15) {
            positions[i * 3 + 1] = 0;
            positions[i * 3] = (Math.random() - 0.5) * 35;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 24 + 3;
          }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
      }

      // Update spectral soul wisps
      if (wispSystem) {
        const wispPos = wispSystem.geometry.attributes.position.array;
        for (let i = 0; i < wispCount; i++) {
          wispPos[i * 3 + 1] += wispVelocities[i].y * delta;
          wispPos[i * 3] += Math.sin(elapsed * 1.4 + wispVelocities[i].phase) * wispVelocities[i].amp * delta;
          if (wispPos[i * 3 + 1] > 18) {
            wispPos[i * 3 + 1] = 0.5;
            wispPos[i * 3] = (Math.random() - 0.5) * 40;
            wispPos[i * 3 + 2] = (Math.random() - 0.5) * 32 + 4;
          }
        }
        wispSystem.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);

      // --- SCREEN PROJECTION ---
      projectionElapsed += delta;
      if (projectionElapsed < 1 / 15) return;
      projectionElapsed = 0;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const currentTeams = teamsRef.current;
      const activeRound = roundRef.current;

      // 1) Project the champions. Elevate #1 above center and push #2 left / #3 right
      // so the three plaques never overlap and connector lines point directly to each head.
      const plaques = [];
      const minCenterClearance = Math.min(Math.max(225, w * 0.24), Math.max(175, w * 0.5 - 140));
      for (let i = 0; i < trackedChars.length; i++) {
        const c = trackedChars[i];
        const teamData = currentTeams.find((t) => Number(t.rank) === c.rank);
        if (c.mesh) {
          c.mesh.visible = activeRound !== 2 || Boolean(teamData);
        }
        if (!teamData) continue;

        tempVec.copy(c.headAnchor);
        tempVec.project(camera);

        if (tempVec.z < 1.0 && tempVec.x >= -1.1 && tempVec.x <= 1.1 && tempVec.y >= -1.1 && tempVec.y <= 1.15) {
          const anchorX = (tempVec.x * 0.5 + 0.5) * w;
          const anchorY = (-(tempVec.y * 0.5) + 0.5) * h;
          const targetX =
            c.rank === 2
              ? Math.min(anchorX - 95, w * 0.5 - minCenterClearance)
              : c.rank === 3
                ? Math.max(anchorX + 95, w * 0.5 + minCenterClearance)
                : anchorX;
          const y =
            c.rank === 1
              ? THREE.MathUtils.clamp(anchorY - 62, 74, h - 10)
              : THREE.MathUtils.clamp(anchorY - 4, 146, h - 10);
          plaques.push({
            rank: c.rank,
            team_name: teamData.team_name,
            score: Number(teamData.total_score || 0).toFixed(1),
            clues: teamData.clues_solved || 0,
            isQualified: activeRound === 1 && Boolean(teamData.is_qualified_r2),
            x: THREE.MathUtils.clamp(targetX, 150, w - 150),
            y,
            anchorX,
            anchorY
          });
        }
      }
      setScreenPlaques(plaques);

      // 2) Project Small Gladiator Pennants (Ranks 4 to 15)
      const pennants = [];
      const occupiedPennantBoxes = [];
      const pennantWidth = 196;
      const pennantHeight = 28;
      const xShifts = [0];
      const yShifts = [0, -24, 24, -48, 48, -64, 64];
      for (let i = 0; i < trackedRunners.length; i++) {
        const r = trackedRunners[i];
        const teamData = currentTeams.find((t) => Number(t.rank) === r.rank);
        if (r.mesh) {
          r.mesh.visible = activeRound !== 2 || Boolean(teamData);
        }
        if (!teamData) continue;

        tempVec.copy(r.headAnchor);
        tempVec.project(camera);

        if (tempVec.z < 1.0 && tempVec.x >= -1 && tempVec.x <= 1 && tempVec.y >= -1 && tempVec.y <= 1) {
          const anchorX = (tempVec.x * 0.5 + 0.5) * w;
          const anchorY = (-(tempVec.y * 0.5) + 0.5) * h;
          let labelPosition = null;
          for (const yShift of yShifts) {
            for (const xShift of xShifts) {
              const x = THREE.MathUtils.clamp(anchorX + xShift, pennantWidth / 2 + 6, w - pennantWidth / 2 - 6);
              const y = THREE.MathUtils.clamp(anchorY + yShift, pennantHeight + 6, h - 4);
              const box = {
                left: x - pennantWidth / 2,
                right: x + pennantWidth / 2,
                top: y - pennantHeight,
                bottom: y
              };
              const overlaps = occupiedPennantBoxes.some((other) =>
                box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top
              );
              if (!overlaps) {
                labelPosition = { x, y, box };
                break;
              }
            }
            if (labelPosition) break;
          }
          if (!labelPosition) continue;
          occupiedPennantBoxes.push(labelPosition.box);
          pennants.push({
            rank: r.rank,
            team_name: teamData.team_name,
            score: Number(teamData.total_score || 0).toFixed(0),
            isQualified: activeRound === 1 && Boolean(teamData.is_qualified_r2),
            x: labelPosition.x,
            y: labelPosition.y,
            anchorX,
            anchorY
          });
        }
      }
      setScreenPennants(pennants);
    };

    reqIdRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    }

    return () => {
      destroyed = true;
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (handleDebugKey) window.removeEventListener('keydown', handleDebugKey);
      if (controls) controls.dispose();
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 overflow-hidden select-none bg-[#07040c]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Subtle Haunted Vignette blending 3D scene into dark frame */}
      <div className="vignette pointer-events-none absolute inset-0 z-10" />

      {/* Loading / Error Gate */}
      {sceneError ? (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#07040c]/95 text-center p-6">
          <h3
            className="text-base font-bold tracking-wider text-amber-200 uppercase"
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
          >
            Arena Crypt Unavailable
          </h3>
          <p className="mt-2 max-w-md text-sm text-stone-400">{sceneError}</p>
        </div>
      ) : !assetsLoaded && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_45%,rgba(127,29,29,0.22),rgba(6,3,10,0.98)_65%)] text-center p-6">
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-red-900/50 border-t-amber-500 animate-spin shadow-[0_0_24px_rgba(220,38,38,0.45)]" />
            <div className="absolute inset-2 rounded-full border border-purple-700/40 border-b-purple-400 animate-spin [animation-direction:reverse] [animation-duration:2.5s]" />
            <span className="text-xl drop-shadow-[0_0_10px_rgba(245,158,11,0.7)]">💀</span>
          </div>
          <h3
            className="text-sm font-black tracking-[0.22em] text-amber-200 uppercase drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]"
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
          >
            Summoning The Haunted Arena...
          </h3>
          <p className="mt-1.5 font-mono text-[11px] tracking-widest text-red-400/80">
            {loadProgress}% RITUAL BOUND
          </p>
        </div>
      )}

      {assetsLoaded && loadErrors.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-4 z-20 max-w-[80%] rounded border border-red-800/70 bg-[#0b0408]/90 px-3 py-2 text-xs text-red-300">
          Some arena models could not load: {loadErrors.join(', ')}
        </div>
      )}

      {/* --- OVERLAYS LAYER --- */}
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
        {/* A) TOP 3 CURSED OBSIDIAN / GOTHIC CREST PLAQUES */}
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          {screenPlaques.filter((plaque) => Math.abs(plaque.x - plaque.anchorX) > 8 || Math.abs(plaque.y - plaque.anchorY) > 12).map((plaque) => (
            <line
              key={`leader-${plaque.rank}`}
              x1={plaque.x}
              y1={plaque.y}
              x2={plaque.anchorX}
              y2={plaque.anchorY}
              stroke={plaque.rank === 1 ? '#f59e0b' : plaque.rank === 2 ? '#cbd5e1' : '#ea580c'}
              strokeOpacity="0.75"
              strokeWidth="1.75"
              strokeDasharray="3 2"
            />
          ))}
          {screenPennants.filter((pennant) => Math.abs(pennant.x - pennant.anchorX) > 8 || Math.abs(pennant.y - pennant.anchorY) > 8).map((pennant) => (
            <line
              key={`runner-leader-${pennant.rank}`}
              x1={pennant.x}
              y1={pennant.y - 5}
              x2={pennant.anchorX}
              y2={pennant.anchorY}
              stroke="#dc2626"
              strokeOpacity="0.55"
              strokeWidth="1"
            />
          ))}
        </svg>

        {screenPlaques.map((plaque) => {
          const isGold = plaque.rank === 1;
          const isSilver = plaque.rank === 2;

          let borderTheme =
            'border-amber-500/80 bg-[radial-gradient(circle_at_top,rgba(180,83,9,0.22),rgba(8,4,6,0.95)_75%)] shadow-[0_0_34px_rgba(245,158,11,0.42),inset_0_0_20px_rgba(127,29,29,0.28)]';
          let sealTheme = 'from-amber-950/90 via-[#1b0806] to-[#0a0404] text-amber-300 border-amber-500/35';
          let emblem = '💀';
          let romanNum = 'I';
          let titleColor = 'text-amber-200 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]';

          if (isSilver) {
            borderTheme =
              'border-slate-300/65 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),rgba(6,8,14,0.95)_75%)] shadow-[0_0_26px_rgba(148,163,184,0.34),inset_0_0_16px_rgba(71,85,105,0.22)]';
            sealTheme = 'from-slate-800/85 via-[#0f131d] to-[#06080d] text-slate-200 border-slate-400/25';
            emblem = '🕯️';
            romanNum = 'II';
            titleColor = 'text-slate-100 drop-shadow-[0_0_8px_rgba(203,213,225,0.4)]';
          } else if (!isGold) {
            borderTheme =
              'border-orange-600/75 bg-[radial-gradient(circle_at_top,rgba(154,52,18,0.22),rgba(12,5,5,0.95)_75%)] shadow-[0_0_26px_rgba(234,88,12,0.36),inset_0_0_18px_rgba(127,29,29,0.25)]';
            sealTheme = 'from-orange-950/85 via-[#180706] to-[#0b0404] text-orange-300 border-orange-500/25';
            emblem = '🎃';
            romanNum = 'III';
            titleColor = 'text-orange-200 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]';
          }

          return (
            <div
              key={`podium-${plaque.rank}`}
              className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
              style={{
                left: `${plaque.x}px`,
                top: `${plaque.y}px`,
                transform: `translate(-50%, -100%) scale(${isGold ? 1.04 : 0.94})`
              }}
            >
              {/* Cursed Gothic Tomb Plaque */}
              <div
                className={`relative flex items-stretch border-2 rounded-lg overflow-hidden ${borderTheme}`}
                style={{ backgroundColor: 'rgba(7, 4, 11, 0.96)' }}
              >
                {/* Corner gothic rivets */}
                <span className="pointer-events-none absolute left-1 top-1 h-1 w-1 rounded-full bg-white/30" />
                <span className="pointer-events-none absolute right-1 top-1 h-1 w-1 rounded-full bg-white/30" />

                {/* Wax Seal / Roman Numeral Badge */}
                <div
                  className={`flex flex-col items-center justify-center px-3 py-2 bg-gradient-to-b border-r min-w-[48px] ${sealTheme}`}
                >
                  <span
                    className="text-lg leading-none font-black"
                    style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                  >
                    {romanNum}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-stone-400 font-mono mt-0.5">
                    {emblem} #{plaque.rank}
                  </span>
                </div>

                {/* Team Name & Sigils */}
                <div className="flex flex-col justify-center px-3.5 py-2 border-r border-red-950/60 min-w-[140px] max-w-[230px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`font-black text-sm tracking-wide truncate ${titleColor}`}
                      style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                    >
                      {plaque.team_name}
                    </span>
                    {plaque.isQualified && (
                      <span className="shrink-0 rounded border border-emerald-500/55 bg-emerald-950 px-1 py-[1px] font-mono text-[8px] font-black uppercase text-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.35)]">
                        R2
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i < plaque.clues
                            ? isGold
                              ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                              : isSilver
                                ? 'bg-slate-200 shadow-[0_0_5px_#cbd5e1]'
                                : 'bg-orange-400 shadow-[0_0_6px_#fb923c]'
                            : 'bg-stone-900'
                        }`}
                      />
                    ))}
                    <span className="text-[9px] text-stone-400 font-mono ml-1">
                      {plaque.clues}/10
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center justify-center px-3.5 py-2 bg-black/70 min-w-[68px]">
                  <span className="font-mono text-base font-black text-stone-100">
                    {plaque.score}
                  </span>
                  <span className="text-[8px] text-red-400/85 uppercase font-mono tracking-widest -mt-0.5">
                    PTS
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* B) HAUNTED PENNANTS FOR RUNNERS (RANKS 4 TO 15) */}
        {screenPennants.map((pennant) => (
          <div
            key={`runner-${pennant.rank}`}
            className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none"
            style={{
              left: `${pennant.x}px`,
              top: `${pennant.y}px`,
              transform: 'translate(-50%, -100%) scale(0.9)'
            }}
          >
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-700/90 text-white shadow-[0_4px_14px_rgba(0,0,0,0.95)]"
              style={{ backgroundColor: 'rgba(7, 3, 12, 0.95)' }}
            >
              <span className="text-[10px] font-black text-red-400 font-mono">
                #{pennant.rank}
              </span>
              <span className="text-[11px] font-bold text-white max-w-[115px] truncate">
                {pennant.team_name}
              </span>
              {pennant.isQualified && (
                <span className="rounded border border-emerald-500/60 bg-emerald-950 px-1 font-mono text-[8px] font-black text-emerald-300">
                  R2
                </span>
              )}
              <span className="text-[9px] font-mono text-amber-300 font-bold ml-0.5">
                &bull; {pennant.score} Pts
              </span>
            </div>

            <div className="w-[1.5px] h-3.5 bg-gradient-to-b from-red-500 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}

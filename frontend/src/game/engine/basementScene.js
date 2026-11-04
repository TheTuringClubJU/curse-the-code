import { THREE, mat, bgeo } from './kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const box = (w, h, d, material, x, y, z) => {
  const mesh = new THREE.Mesh(bgeo(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const cylinder = (rt, rb, h, segments, material, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
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
    const geometries = byMaterial.get(key);
    if (geometries) geometries.geometries.push(geometry);
    else byMaterial.set(key, { material: mesh.material, geometries: [geometry] });
  });
  const parentInverse = group.matrixWorld.clone().invert();
  group.children.slice().forEach((child) => group.remove(child));
  originalGeometries.forEach((geometry) => geometry.dispose());
  for (const { material, geometries } of byMaterial.values()) {
    const combined = geometries.length > 1 ? mergeGeometries(geometries, false) : geometries[0];
    if (combined) combined.applyMatrix4(parentInverse);
    if (combined) {
      const merged = new THREE.Mesh(combined, material);
      merged.castShadow = true;
      merged.receiveShadow = true;
      group.add(merged);
    }
    geometries.forEach((geometry) => geometry.dispose());
  }
};

export function buildBasement(E) {
  const { S, add, solid, interact, anim, ref } = E;
  const concrete = mat({ c: 0x303238, r: 0.95 });
  const darkSteel = mat({ c: 0x17191d, m: 0.75, r: 0.38 });
  const steel = mat({ c: 0x5d6268, m: 0.7, r: 0.32 });
  const red = mat({ c: 0x8b1717, e: 0x330000, ei: 0.5, r: 0.5 });
  const yellow = mat({ c: 0xd9b84a, r: 0.6 });
  const blueLed = mat({ c: 0x2b90ff, e: 0x147cff, ei: 2.2, r: 0.2 });
  const redLed = mat({ c: 0xff3030, e: 0xff0000, ei: 2.2, r: 0.2 });

  // Intercom
  const intercom = new THREE.Group();
  intercom.position.set(2.8, 1.45, 0.5);
  intercom.add(box(0.12, 0.62, 0.48, yellow, 0, 0, 0));
  intercom.add(box(0.14, 0.14, 0.32, darkSteel, 0, 0.12, 0));
  for (let i = -2; i <= 2; i++) intercom.add(box(0.02, 0.015, 0.3, darkSteel, -0.07, i * 0.045 - 0.02, 0));
  mergeStaticChildren(intercom);
  interact(intercom, 'intercom'); add(intercom); solid(2.6, 3.0, 0.2, 0.8);

  // Server rack and rack door share visible separate meshes and are both searchable/tagged.
  const rack = new THREE.Group(); rack.position.set(-2.5, 0, 0);
  rack.add(box(1.25, 2.45, 0.7, darkSteel, 0, 1.225, 0));
  for (let y = 0.25; y < 2.15; y += 0.22) {
    rack.add(box(1.05, 0.12, 0.04, steel, 0, y, 0.38));
    rack.add(cylinder(0.018, 0.018, 0.02, 6, blueLed, 0.38, y, 0.42));
    if ((Math.round(y * 10) % 2) === 0) rack.add(cylinder(0.018, 0.018, 0.02, 6, redLed, -0.38, y, 0.42));
  }
  mergeStaticChildren(rack);
  interact(rack, 'server_rack'); add(rack); solid(-3.25, -1.75, -0.45, 0.45);

  const rackDoor = new THREE.Group(); rackDoor.position.set(-2.2, 1.15, -1.0);
  rackDoor.add(box(1.08, 2.1, 0.05, steel, 0, 0, 0));
  for (let y = -0.85; y <= 0.85; y += 0.16) rackDoor.add(box(0.82, 0.018, 0.025, darkSteel, 0, y, 0.04));
  rackDoor.add(box(0.5, 0.18, 0.025, yellow, -0.18, 0.72, 0.04));
  rackDoor.rotation.y = 0;
  mergeStaticChildren(rackDoor);
  interact(rackDoor, 'rack_door'); add(rackDoor);

  // Final containment console
  const consoleGroup = new THREE.Group(); consoleGroup.position.set(0, 0, -2.95);
  consoleGroup.add(box(2.3, 1.05, 0.65, darkSteel, 0, 0.525, 0));
  consoleGroup.add(box(2.1, 0.12, 0.75, steel, 0, 1.08, 0.05));
  for (let x = -0.75; x <= 0.75; x += 0.75) {
    consoleGroup.add(box(0.58, 0.58, 0.025, mat({ c: 0x180a0a, e: 0xff1a1a, ei: 0.45 }), x, 1.58, 0.36));
  }
  interact(consoleGroup, 'containment_console'); add(consoleGroup); solid(-1.25, 1.25, -3.35, -2.55);

  // Fragment props
  const terminal = new THREE.Group(); terminal.position.set(-2.2, 1.2, 1.2);
  terminal.add(box(0.78, 0.58, 0.12, darkSteel, 0, 0, 0));
  terminal.add(box(0.62, 0.38, 0.03, blueLed, 0, 0.08, 0.08));
  mergeStaticChildren(terminal);
  interact(terminal, 'maintenance_terminal'); add(terminal);

  const toolbox = new THREE.Group(); toolbox.position.set(1.8, 0, -1.5);
  toolbox.add(box(1.0, 0.55, 0.58, red, 0, 0.275, 0));
  toolbox.add(box(0.5, 0.08, 0.05, steel, 0, 0.62, 0));
  mergeStaticChildren(toolbox);
  interact(toolbox, 'toolbox'); add(toolbox); solid(1.2, 2.4, -1.85, -1.15);

  const floorSeal = new THREE.Group(); floorSeal.position.set(0, 0.04, 0);
  floorSeal.add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.08, 12), steel));
  floorSeal.add(new THREE.Mesh(new THREE.RingGeometry(0.72, 0.78, 12), red));
  floorSeal.children[1].rotation.x = -Math.PI / 2;
  floorSeal.children[1].position.y = 0.06;
  mergeStaticChildren(floorSeal);
  interact(floorSeal, 'floor_seal'); add(floorSeal);

  // Decorative but visible objects
  const monitor = new THREE.Group(); monitor.position.set(0, 2.45, 2.8);
  monitor.add(box(2.0, 0.68, 0.08, darkSteel, 0, 0, 0));
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#120607'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff3030'; ctx.font = 'bold 84px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('15:00', 256, 68);
  const countdownTexture = new THREE.CanvasTexture(canvas); countdownTexture.colorSpace = THREE.SRGBColorSpace;
  const countdownMaterial = new THREE.MeshBasicMaterial({ map: countdownTexture });
  const countdown = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 0.48), countdownMaterial); countdown.position.set(0, 0, -0.05); monitor.add(countdown);
  ref.wallMonitor = { setText(text) { ctx.fillStyle = '#120607'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#ff3030'; ctx.fillText(String(text), 256, 68); countdownTexture.needsUpdate = true; } };
  interact(monitor, 'wall_monitor'); add(monitor, { noShadow: true });

  const pipes = new THREE.Group();
  for (let x = -3; x <= 3; x += 1.5) {
    const pipe = cylinder(0.09, 0.09, 7, 8, steel, x, 3.0, -2.2);
    pipe.rotation.x = Math.PI / 2;
    pipes.add(pipe);
  }
  interact(pipes, 'pipes'); add(pipes, { noShadow: true });

  const barrels = new THREE.Group(); barrels.position.set(-2.0, 0, 2.2);
  for (let i = 0; i < 3; i++) {
    barrels.add(cylinder(0.38, 0.38, 0.85, 10, red, i * 0.72 - 0.72, 0.425, 0));
  }
  interact(barrels, 'barrels'); add(barrels); solid(-3, 0, 1.5, 3);

  const fuse = new THREE.Group(); fuse.position.set(2.6, 1.3, -2.2);
  fuse.add(box(0.5, 0.9, 0.16, darkSteel, 0, 0, 0));
  for (let i = 0; i < 4; i++) fuse.add(cylinder(0.025, 0.025, 0.02, 8, redLed, -0.12 + i * 0.08, 0.28, 0.1));
  interact(fuse, 'fuse_box'); add(fuse);

  // Red strobe and animated steam pipes
  const beacon = new THREE.PointLight(0xff2a2a, 4, 12, 2);
  beacon.position.set(0, 3.05, -1.5);
  S.add(beacon);
  E.lightRig(beacon, 4, t => 0.55 + 0.45 * Math.max(0, Math.sin(t * 8)));

  const steam = new THREE.Group(); steam.position.set(2.4, 2.8, -1.2);
  for (let i = 0; i < 18; i++) {
    const p = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xbfc7c9, transparent: true, opacity: 0.08, depthWrite: false }));
    p.scale.setScalar(0.16); p.userData.np = 1;
    steam.add(p);
  }
  S.add(steam);
  anim((t) => {
    steam.children.forEach((p, i) => {
      p.position.set(Math.sin(t * 0.5 + i) * 0.05, ((t * 0.18 + i * 0.07) % 1.3), 0);
    });
  });

  // Basement exit door is the study/back door in Room 3.
  const door = new THREE.Group(); door.position.set(3, 0, 2.95); door.rotation.y = Math.PI;
  door.add(box(0.12, 2.15, 1.1, darkSteel, 0, 1.075, 0));
  door.add(box(0.14, 0.05, 0.45, steel, 0.08, 0.45, 0));
  interact(door, 'room_door'); add(door);
  ref.roomDoor = { hinge: door, isOpen: false, angle: 0 };
  anim(() => {
    const target = ref.roomDoor.isOpen ? 1.45 : 0;
    ref.roomDoor.angle += (target - ref.roomDoor.angle) * 0.06;
    door.rotation.y = Math.PI - ref.roomDoor.angle;
  });
}

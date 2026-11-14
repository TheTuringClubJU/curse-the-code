// Shared player torch (flashlight) — SINGLE SOURCE OF TRUTH for every room.
// Values are the Room 5 (control) torch, which is the project's reference look & feel.
// Rooms must NOT define their own torch light/model/sway; they call attachTorch(E, cam)
// via engine.js and toggle it through api.setFlashlight(on) / api.isFlashlightOn().
import * as THREE from 'three';

export const TORCH = Object.freeze({
  // SpotLight (attached to the camera)
  color: 0xf3f7fa,
  intensity: 18.0,
  distance: 32,
  angle: Math.PI / 4.2,
  penumbra: 0.55,
  decay: 1.32,
  lightPos: [0.22, -0.16, 0.08],
  targetPos: [0, 0, -6],
  // First-person model
  modelUrl: '/assets/models/room5/flashlight.glb',
  modelPos: [0.24, -0.21, -0.32],
  modelRot: [0.05, -0.07, 0.02],
  modelLength: 0.24, // metres, longest axis
  // Lens glow
  lensIntensityBase: 1.6,
  lensIntensityOn: 1.8,
  // Walking sway (position offsets relative to modelPos)
  swayMoving: { amt: 0.012, speed: 8 },
  swayIdle: { amt: 0.002, speed: 1.5 },
  swayY: -0.22,
  // Default toggle key for rooms whose React page doesn't bind it itself
  toggleCode: 'KeyF',
});

export function attachTorch(E, cam) {
  const flashL = new THREE.SpotLight(
    TORCH.color, TORCH.intensity, TORCH.distance, TORCH.angle, TORCH.penumbra, TORCH.decay
  );
  flashL.position.set(...TORCH.lightPos);
  flashL.target.position.set(...TORCH.targetPos);
  flashL.castShadow = false;
  cam.add(flashL);
  cam.add(flashL.target);
  E.flashlight = flashL;
  E._flashBaseIntensity = TORCH.intensity;
  E._userFlashlightOn = true;
  E._flashOutageActive = false;

  const flashGroup = new THREE.Group();
  flashGroup.position.set(...TORCH.modelPos);
  flashGroup.rotation.set(...TORCH.modelRot);
  cam.add(flashGroup);
  E.flashlightModel = flashGroup;

  if (typeof E.loadGLB !== 'function') return;
  E.loadGLB(TORCH.modelUrl).then((gltf) => {
    const torch = gltf.scene;
    let tailNode = null;
    let lensNode = null;
    torch.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.np = 1;
      o.castShadow = false;
      o.receiveShadow = false;
      if (o.material?.name === 'lace') {
        o.visible = false;
        return;
      }
      if (o.name === 'defaultMaterial_7') tailNode = o;
      if (o.material?.name === 'glass' || o.name === 'defaultMaterial_11') {
        lensNode = o;
        o.material = o.material.clone();
        o.material.emissive = new THREE.Color(0xdcf0ff);
        o.material.emissiveIntensity = TORCH.lensIntensityBase;
        E._flashLensMat = o.material;
      }
    });

    torch.updateMatrixWorld(true);
    if (tailNode && lensNode) {
      const tailC = new THREE.Vector3();
      const lensC = new THREE.Vector3();
      new THREE.Box3().setFromObject(tailNode).getCenter(tailC);
      new THREE.Box3().setFromObject(lensNode).getCenter(lensC);
      const dir = lensC.sub(tailC).normalize();
      torch.quaternion.setFromUnitVectors(dir, new THREE.Vector3(0, 0, -1));
    }

    torch.updateMatrixWorld(true);
    const bodyBox = new THREE.Box3();
    torch.traverse((o) => {
      if (o.isMesh && o.visible) bodyBox.expandByObject(o);
    });
    const sz = new THREE.Vector3();
    const ctr = new THREE.Vector3();
    bodyBox.getSize(sz);
    bodyBox.getCenter(ctr);

    const norm = new THREE.Group();
    torch.position.set(-ctr.x, -ctr.y, -ctr.z);
    norm.add(torch);
    norm.scale.setScalar(TORCH.modelLength / Math.max(sz.z, 0.001));
    flashGroup.add(norm);
    if (E._flashLensMat && !E._userFlashlightOn) E._flashLensMat.emissiveIntensity = 0;
  }).catch((err) => {
    console.warn('[torch] Flashlight GLB load failed:', err);
  });
}

// Per-frame hand sway (same in every room). Respects prefers-reduced-motion via `reduce`.
export function updateTorchSway(E, t, moving, reduce) {
  if (!E.flashlightModel || reduce) return;
  const s = moving ? TORCH.swayMoving : TORCH.swayIdle;
  E.flashlightModel.position.y = TORCH.swayY + Math.sin(t * s.speed) * s.amt;
  E.flashlightModel.position.x = TORCH.modelPos[0] + Math.cos(t * (s.speed * 0.5)) * (s.amt * 0.8);
}

// Toggle (same in every room). Honors scare-driven outages.
export function setTorch(E, on) {
  E._userFlashlightOn = Boolean(on);
  if (E._flashOutageActive) {
    if (E.flashlight) E.flashlight.intensity = 0;
    if (E._flashLensMat) E._flashLensMat.emissiveIntensity = 0;
    return;
  }
  if (E.flashlight) E.flashlight.intensity = on ? (E._flashBaseIntensity || TORCH.intensity) : 0;
  if (E._flashLensMat) E._flashLensMat.emissiveIntensity = on ? TORCH.lensIntensityOn : 0;
}

// Rooms 1–3 pages don't bind the torch key; the engine does it (only while pointer-locked,
// i.e. no modal open). Records/Control pages already bind F themselves (battery logic etc.).
export function bindTorchKey(E) {
  const onKey = (e) => {
    if (e.code !== TORCH.toggleCode && e.key !== 'f' && e.key !== 'F') return;
    const tag = (e.target?.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
    if (!document.pointerLockElement) return;
    setTorch(E, !E._userFlashlightOn);
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

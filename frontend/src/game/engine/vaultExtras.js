import * as THREE from 'three';

/**
 * Extensible Drop-In Manifest for Additional Resident Evil / Gothic GLB Rooms & Props.
 *
 * How to mount ANY external .glb model (room extension or optional prop):
 * 1. Place the downloaded `.glb` file inside:
 *    `frontend/public/assets/models/vault/custom/<filename>.glb`
 * 2. Append an entry below with `enabled: true`, desired `targetHeight`, `position: [x, y, z]`,
 *    optional `rotationY`, optional `collider: [x0, x1, z0, z1]`, and optional `interact: { id, prompt }`.
 *
 * Missing `.glb` files fail gracefully via `.catch(() => null)` without blocking scene load.
 */
export const OPTIONAL_VAULT_ASSETS = [
  // Example optional custom room wing or horror prop (uncomment/enable after placing GLB in /custom/):
  // {
  //   id: 'custom_morgue_autopsy_table',
  //   enabled: true,
  //   url: '/assets/models/vault/custom/autopsy_table.glb',
  //   targetHeight: 0.92,
  //   position: [12.9, 0, 9.2],
  //   rotationY: Math.PI / 2,
  //   collider: [12.1, 13.7, 8.2, 10.2],
  //   interactId: null,
  // },
  // {
  //   id: 'custom_gothic_corridor_module',
  //   enabled: true,
  //   url: '/assets/models/vault/custom/gothic_corridor.glb',
  //   targetHeight: 4.6,
  //   position: [-13.6, 0, -11.5],
  //   rotationY: 0,
  //   collider: null,
  //   interactId: null,
  // },
];

/**
 * Safely mounts any enabled optional external GLB rooms or props onto the active Vault scene.
 */
export function loadVaultOptionalExtras(E, helpers = {}, extraEntries = []) {
  const { S, loadGLB, interact, add } = E;
  const { normalizeModelMaterials, fitModelToHeight, wallSolid } = helpers;
  const entries = [...OPTIONAL_VAULT_ASSETS, ...(Array.isArray(extraEntries) ? extraEntries : [])].filter(
    (entry) => entry && entry.enabled !== false && typeof entry.url === 'string' && entry.url.trim()
  );

  entries.forEach((entry) => {
    loadGLB(entry.url)
      .then((gltf) => {
        const root = gltf?.scene;
        if (!root) return;

        if (fitModelToHeight && typeof entry.targetHeight === 'number') {
          fitModelToHeight(root, entry.targetHeight);
        }
        if (normalizeModelMaterials) {
          normalizeModelMaterials(root, {
            psx: Boolean(entry.psx),
            npAll: true,
          });
        }

        const [x = 0, y = 0, z = 0] = entry.position || [];
        root.position.set(x, y, z);
        if (typeof entry.rotationY === 'number') {
          root.rotation.y = entry.rotationY;
        }
        if (typeof entry.scale === 'number') {
          root.scale.multiplyScalar(entry.scale);
        }

        if (entry.interactId && interact) {
          const proxyBox = new THREE.Box3().setFromObject(root);
          const sz = new THREE.Vector3();
          const ctr = new THREE.Vector3();
          proxyBox.getSize(sz);
          proxyBox.getCenter(ctr);
          const wrap = new THREE.Group();
          wrap.add(root);
          const proxy = new THREE.Mesh(
            new THREE.BoxGeometry(Math.max(0.6, sz.x), Math.max(0.6, sz.y), Math.max(0.6, sz.z)),
            new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
          );
          proxy.userData.np = true;
          proxy.position.copy(ctr);
          interact(proxy, entry.interactId);
          interact(root, entry.interactId);
          wrap.add(proxy);
          add(wrap, { noShadow: true });
        } else {
          S.add(root);
        }

        if (Array.isArray(entry.collider) && entry.collider.length === 4 && wallSolid) {
          wallSolid(entry.collider[0], entry.collider[1], entry.collider[2], entry.collider[3]);
        }
      })
      .catch(() => null);
  });
}

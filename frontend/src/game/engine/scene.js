// Haunted bedroom: 100% delegated to Authentic RE4 Village Cabin Scene Builder
import { THREE, X, TX, RoundedBoxGeometry, BufferGeometryUtils, mat, wm, lathe, bgeo, drapeGeo, curtainGeo, tube, rep, pumpkinGeo } from './kit.js';
import { buildCabinScene } from './sceneCabin.js';

export const mk = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  return o;
};

export const grp = (x = 0, y = 0, z = 0, ry = 0) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  return g;
};

export function buildBedroom(E) {
  // Delegate completely to the authentic RE4 Village Cabin (r100 / r102) compound scene
  return buildCabinScene(E);
}

export function buildDoll(s = 1) {
  const g = new THREE.Group();
  const sk = mat({ map: TX.doll(), r: 0.35 });
  const dress = mat({ map: TX.sheet(), c: 0xe0cfd4, r: 0.9, side: 2 });
  g.add(mk(lathe([[0, 0], [0.1, 0], [0.13, 0.04], [0.1, 0.1], [0.05, 0.16], [0.035, 0.22], [0.05, 0.26], [0, 0.27]], 24), dress, 0, 0, 0));
  g.add(mk(new THREE.TorusGeometry(0.11, 0.012, 8, 28), dress, 0, 0.035, 0, Math.PI / 2, 0, 0));
  [-1, 1].forEach((a) => {
    g.add(mk(new THREE.CylinderGeometry(0.015, 0.013, 0.17, 8), mat({ color: 0xdccfc4, r: 0.4 }), a * 0.04, 0.1, 0.12, Math.PI / 2.4, 0, 0));
    g.add(mk(new THREE.SphereGeometry(0.022, 10, 8), mat({ color: 0x151015, r: 0.5 }), a * 0.04, 0.04, 0.2));
    g.add(mk(new THREE.CylinderGeometry(0.012, 0.01, 0.13, 8), mat({ color: 0xdccfc4, r: 0.4 }), a * 0.085, 0.19, 0.05, 0.5, 0, a * 0.5));
  });
  const head = new THREE.Group();
  head.position.set(0, 0.31, 0);
  const hs = mk(new THREE.SphereGeometry(0.06, 32, 24), sk, 0, 0.03, 0);
  head.add(hs);
  head.add(mk(new THREE.SphereGeometry(0.064, 32, 20, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.78), mat({ map: TX.hair(), r: 0.9, side: 2 }), 0, 0.035, -0.002));
  const fr = mk(new THREE.TorusGeometry(0.058, 0.009, 6, 18, Math.PI), mat({ map: TX.hair(), r: 0.9 }), 0, 0.065, 0.005, 0, 0, 0);
  fr.rotation.set(0.1, 0, 0);
  head.add(fr);
  g.add(head);
  g.userData.head = head;
  g.scale.setScalar(s);
  return g;
}

export function buildSkull(s = 1) {
  const g = new THREE.Group();
  const bm = mat({ map: TX.bone(), r: 0.6, bump: TX.bone(), bs: 0.8 });
  const dk = mat({ color: 0x050404, r: 1 });
  const cr = mk(new THREE.SphereGeometry(0.07, 28, 22), bm, 0, 0.08, 0);
  cr.scale.set(1, 1.02, 1.1);
  g.add(cr);
  [-1, 1].forEach((a) => {
    g.add(mk(new THREE.SphereGeometry(0.022, 14, 10), dk, a * 0.03, 0.075, 0.058), mk(new THREE.SphereGeometry(0.02, 12, 8), bm, a * 0.05, 0.05, 0.045));
  });
  g.add(mk(new THREE.ConeGeometry(0.012, 0.03, 3), dk, 0, 0.05, 0.075, 0, 0, Math.PI), mk(bgeo(0.07, 0.035, 0.07, 6), bm, 0, 0.015, 0.04), mk(bgeo(0.075, 0.03, 0.075, 6), bm, 0, -0.01, 0.03));
  for (let i = 0; i < 6; i++) g.add(mk(bgeo(0.008, 0.014, 0.008, 4), mat({ color: 0xd8d0bc, r: 0.5 }), -0.03 + i * 0.012, 0.0, 0.073));
  g.scale.setScalar(s);
  return g;
}

const _pt = {};
export function pumpkinMesh(r, kind = 0) {
  const f = X.pumpkinFace(kind);
  const tt = _pt[kind] || (_pt[kind] = { map: X.tex(f.map), emi: X.tex(f.emi) });
  const map = tt.map;
  const emi = tt.emi;
  const m = mat({ map, bump: map, bs: 0.8, r: 0.6, em: emi, e: 0xffffff, ei: 1.6 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(pumpkinGeo(r, 0.82), m);
  g.add(body);
  const st = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.01, 0.05, 0), new THREE.Vector3(0.04, 0.1, 0.01), new THREE.Vector3(0.07, 0.12, 0)]), 12, 0.14 * r, 8), mat({ map: TX.wood('worn'), c: 0x6a7a3a, r: 0.8 }));
  st.scale.setScalar(r * 3.2);
  st.position.set(-0.02, r * 0.82 - 0.03 * r, 0);
  g.add(st);
  g.userData.mat = m;
  g.userData.body = body;
  return g;
}

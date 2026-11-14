// Haunted bedroom: furniture + structure props. Upgraded with high-fidelity Victorian gothic aesthetic,
// Phasmophobia paranormal tracking, and asynchronous GLB model loading pipeline with procedural fallback.
import {
  THREE,
  X,
  TX,
  RoundedBoxGeometry,
  BufferGeometryUtils,
  mat,
  wm,
  lathe,
  bgeo,
  drapeGeo,
  curtainGeo,
  tube,
  pumpkinGeo
} from './kit.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildDecor } from './decor.js';

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

const bx = (w, h, d, m, x, y, z, o = {}) => {
  const q = mk(bgeo(w, h, d, o.s ?? 1.4, o.vert), m, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0);
  return q;
};

const rb = (w, h, d, r, m, x, y, z, seg = 2) => mk(new RoundedBoxGeometry(w, h, d, seg, r), m, x, y, z);

// Helper for loading external GLB models safely with procedural fallback
const tryLoadBedroomGLB = (E, modelName, targetGroup, onPlaced) => {
  if (typeof window === 'undefined') return;
  const url = `/assets/models/bedroom/${modelName}.glb`;
  try {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (!gltf || !gltf.scene) return;
        const model = gltf.scene;
        model.traverse((o) => {
          if (o.isMesh && o.material) {
            o.castShadow = true;
            o.receiveShadow = true;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => {
              if (m.roughness !== undefined) m.roughness = Math.max(0.65, m.roughness);
              if (m.metalness !== undefined) m.metalness = Math.min(0.35, m.metalness);
            });
          }
        });
        // Hide procedural children when GLB successfully arrives
        targetGroup.children.forEach((child) => {
          child.visible = false;
          child.userData.np = 1;
        });
        targetGroup.add(model);
        if (onPlaced) onPlaced(model);
      },
      undefined,
      () => {
        // Fallback procedural prop remains active seamlessly
      }
    );
  } catch {
    // Fallback procedural prop remains active seamlessly
  }
};

export function buildBedroom(E) {
  const { S, add, solid, anim, glow, interact, cam, W, H, D, win, ref } = E;
  const dark = wm('dark', { r: 0.8, c: 0x1b1318 });
  const worn = wm('worn', { r: 0.85, c: 0x2e2025 });
  const ebony = wm('ebony', { r: 0.65, c: 0x0f0b10 });
  const mahogany = wm('dark', { r: 0.72, c: 0x231114 });
  const brass = mat({ map: TX.brass(), m: 0.85, r: 0.42, c: 0xd8b070 });
  const gold = mat({ map: TX.metal(), m: 0.75, r: 0.48, c: 0xd4a35c });
  const iron = mat({ color: 0x18141c, m: 0.88, r: 0.32 });

  // Lathed Victorian canopy bedpost
  const post = (g, x, z, h) => {
    const L = lathe([
      [0.0, 0],
      [0.055, 0],
      [0.058, 0.08],
      [0.036, 0.13],
      [0.045, 0.24],
      [0.062, 0.34],
      [0.038, 0.43],
      [0.038, h - 0.2],
      [0.056, h - 0.12],
      [0.065, h - 0.06],
      [0.036, h - 0.02],
      [0.0, h]
    ]);
    const m = mk(L, ebony, x, 0, z);
    g.add(m);
    // Turned acorn finial on top of each post
    g.add(mk(new THREE.SphereGeometry(0.055, 16, 12), gold, x, h + 0.035, z));
  };

  // 1. Four-Poster Victorian Bed (EB05 hiding prop)
  {
    const g = grp(-0.8, 0, -1.6);
    // Lower Bedframe Rails
    g.add(
      bx(0.08, 0.24, 2.74, dark, -0.97, 0.36, 0),
      bx(0.08, 0.24, 2.74, dark, 0.97, 0.36, 0),
      bx(1.96, 0.22, 0.08, dark, 0, 0.36, 1.37),
      bx(1.96, 0.22, 0.08, dark, 0, 0.36, -1.37)
    );
    // 4 Grand Carved Canopy Posts
    post(g, -0.97, -1.37, 2.3);
    post(g, 0.97, -1.37, 2.3);
    post(g, -0.97, 1.37, 2.05);
    post(g, 0.97, 1.37, 2.05);

    // Upper Canopy Crossbars (Resident Evil 1 Mansion aesthetic)
    g.add(
      bx(0.06, 0.06, 2.74, ebony, -0.97, 2.27, 0),
      bx(0.06, 0.06, 2.74, ebony, 0.97, 2.27, 0),
      bx(1.96, 0.06, 0.06, ebony, 0, 2.27, -1.37),
      bx(1.96, 0.06, 0.06, ebony, 0, 2.02, 1.37)
    );

    // Headboard - Gothic Arch with ornamental filigree
    const sh = new THREE.Shape();
    sh.moveTo(-0.9, 0);
    sh.lineTo(0.9, 0);
    sh.lineTo(0.9, 0.65);
    sh.bezierCurveTo(0.9, 0.88, 0.45, 0.96, 0, 1.05);
    sh.bezierCurveTo(-0.45, 0.96, -0.9, 0.88, -0.9, 0.65);
    sh.closePath();
    const hb = mk(
      new THREE.ExtrudeGeometry(sh, {
        depth: 0.06,
        bevelEnabled: true,
        bevelSize: 0.015,
        bevelThickness: 0.015,
        bevelSegments: 3
      }),
      ebony,
      0,
      0.5,
      -1.4
    );
    g.add(hb);

    // Inner Tufted Headboard Velvet Cushion
    const sh2 = new THREE.Shape();
    sh2.moveTo(-0.72, 0);
    sh2.lineTo(0.72, 0);
    sh2.lineTo(0.72, 0.52);
    sh2.bezierCurveTo(0.72, 0.68, 0.36, 0.75, 0, 0.8);
    sh2.bezierCurveTo(-0.36, 0.75, -0.72, 0.68, -0.72, 0.52);
    sh2.closePath();
    g.add(
      mk(
        new THREE.ExtrudeGeometry(sh2, {
          depth: 0.03,
          bevelEnabled: true,
          bevelSize: 0.01,
          bevelThickness: 0.01,
          bevelSegments: 2
        }),
        mat({ color: 0x3d1726, roughness: 0.95 }),
        0,
        0.62,
        -1.36
      )
    );

    // Footboard
    g.add(bx(1.9, 0.38, 0.06, dark, 0, 0.65, 1.4), bx(1.94, 0.06, 0.09, ebony, 0, 0.86, 1.4));

    // Mattress with Sagging Indentation (matches EB05 "under the mattress edge")
    g.add(rb(1.86, 0.24, 2.66, 0.07, mat({ map: TX.sheet2(), r: 0.96 }), 0, 0.59, 0));
    // Draped Velvet Quilt with Deep Creases
    const bl = mk(drapeGeo(1.84, 1.95, 0.42, 3), mat({ map: TX.quilt(), r: 0.96, side: THREE.DoubleSide }), 0, 0.7, 0.42);
    g.add(bl);

    interact(g, 'bed');
    add(g);
    solid(-1.85, 0.25, -3, -0.12);
    tryLoadBedroomGLB(E, 'bed', g);

    // Pillows (EB08 hiding prop)
    const pilGrp = grp(-0.8, 0, -1.6);
    [
      [-0.34, -1.08, 0.08],
      [0.36, -1.05, -0.1]
    ].forEach((p) => {
      const pl = rb(0.62, 0.18, 0.42, 0.08, mat({ map: TX.sheet(), r: 0.95 }), p[0], 0.79, p[1], 5);
      pl.rotation.y = p[2];
      pl.scale.set(1, 0.9, 1);
      pilGrp.add(pl);
    });
    const pilHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.45, 0.9),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    pilHitBox.position.set(0, 0.82, -1.05);
    pilGrp.add(pilHitBox);
    interact(pilGrp, 'pillow');
    add(pilGrp);

    // Diary (R1-01 Clue Entry Prop) - open leather diary resting on the blanket
    const dg = grp(0, 0.745, 0.82, 0.2);
    const lc = mat({ map: TX.leather('red'), r: 0.65 });
    const L = X.tex(X.paperPage(['Dad has been sleeping at his desk.'], 'Test day 1'));
    const R2 = X.tex(X.paperPage(['Rex turned 5 today. This is test page two.'], 'Test day 2'));
    dg.add(
      rb(0.52, 0.03, 0.35, 0.006, lc, 0, 0, 0, 2),
      mk(new THREE.BoxGeometry(0.012, 0.034, 0.34), mat({ map: TX.leather('red'), r: 0.6 }), 0, 0.003, 0)
    );
    [
      [-1, L],
      [1, R2]
    ].forEach(([s, t]) => {
      const p = mk(new THREE.PlaneGeometry(0.23, 0.32), mat({ map: t, r: 0.95 }), s * 0.12, 0.0285, 0, -Math.PI / 2, 0, -s * 0.05);
      dg.add(p);
      dg.add(mk(new THREE.BoxGeometry(0.23, 0.015, 0.32), mat({ color: 0xcfc4a6, r: 1 }), s * 0.12, 0.02, 0, 0, 0, -s * 0.05));
    });
    // Gold bookmark ribbon
    dg.add(mk(new THREE.BoxGeometry(0.014, 0.003, 0.32), mat({ color: 0xa82020, r: 0.6 }), 0.01, 0.035, 0.02));
    const dgHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.28, 0.5),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    dgHit.position.set(0, 0.05, 0);
    dg.add(dgHit);
    interact(dg, 'diary');
    add(dg, { parent: null });
    dg.position.set(-0.8, 0.745, -0.78);
    dg.rotation.y = 0.2;
    tryLoadBedroomGLB(E, 'diary', dg);
  }

  // 2. Bedside Nightstand (EB02 hiding prop) with Candle, Music Box & Photo Frame
  {
    const g = grp(-2.7, 0, -2.65);
    // Turned Cabriole Legs
    [
      [-0.28, -0.19],
      [0.28, -0.19],
      [-0.28, 0.19],
      [0.28, 0.19]
    ].forEach((p) => g.add(bx(0.05, 0.16, 0.05, dark, p[0], 0.08, p[1], { vert: true })));
    // Carved Cabinet Body
    g.add(
      bx(0.62, 0.52, 0.44, worn, 0, 0.41, 0),
      bx(0.7, 0.045, 0.52, ebony, 0, 0.68, 0),
      // Top Drawer - slightly ajar (matches EB02 "the drawer, under the tissues")
      bx(0.54, 0.18, 0.05, dark, 0, 0.54, 0.235),
      bx(0.48, 0.03, 0.12, mat({ color: 0xdfd8c8, r: 0.98 }), 0, 0.61, 0.24), // Peeking white cloth/tissue
      bx(0.54, 0.22, 0.02, dark, 0, 0.29, 0.215),
      mk(new THREE.SphereGeometry(0.022, 12, 8), brass, 0, 0.54, 0.265),
      mk(new THREE.SphereGeometry(0.022, 12, 8), brass, 0, 0.29, 0.24)
    );
    // Chipped doily lace
    g.add(mk(new THREE.CircleGeometry(0.2, 24), mat({ color: 0xb5ab96, r: 1 }), -0.05, 0.704, 0.0, -Math.PI / 2, 0, 0));
    interact(g, 'nightstand');
    add(g);
    solid(-3.05, -2.35, -2.9, -2.4);
    tryLoadBedroomGLB(E, 'nightstand', g);

    // Music Box (EB07 hiding prop - Note exact ID is 'musicbox')
    const mb = grp(-2.7, 0.7, -2.65, 0.12);
    const bw = mat({ map: TX.wood('ebony'), bump: TX.wood('ebony'), bs: 0.5, r: 0.5, c: 0x8a5040 });
    mb.add(
      rb(0.32, 0.11, 0.22, 0.012, bw, 0, 0.055, 0, 3),
      bx(0.33, 0.014, 0.23, gold, 0, 0.108, 0),
      bx(0.33, 0.014, 0.23, gold, 0, 0.005, 0),
      mk(new THREE.PlaneGeometry(0.28, 0.18), mat({ color: 0x660814, r: 0.95 }), 0, 0.111, 0, -Math.PI / 2, 0, 0)
    );
    // Hinged Lid with Velvet Interior
    const lid = grp(0, 0.11, -0.11);
    lid.add(
      rb(0.32, 0.024, 0.22, 0.008, bw, 0, 0, 0.11, 2),
      bx(0.33, 0.012, 0.23, gold, 0, 0.013, 0.11)
    );
    lid.rotation.x = -1.75;
    mb.add(lid);
    // Brass winding key on the side
    mb.add(
      mk(new THREE.CylinderGeometry(0.048, 0.052, 0.024, 20), brass, 0.0, 0.12, 0.0),
      bx(0.16, 0.007, 0.014, gold, -0.05, 0.115, 0.06),
      mk(new THREE.CylinderGeometry(0.005, 0.005, 0.04, 8), brass, 0.165, 0.06, 0, 0, 0, Math.PI / 2),
      mk(new THREE.TorusGeometry(0.025, 0.004, 6, 16), brass, 0.185, 0.06, 0, 0, Math.PI / 2, 0)
    );
    // Rotating Porcelain Ballerina Figurine
    const bl = grp(0, 0.13, 0);
    bl.add(mk(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8), brass, 0, 0.025, 0));
    const bd = lathe(
      [
        [0.0, 0],
        [0.018, 0.02],
        [0.01, 0.07],
        [0.012, 0.1],
        [0, 0.11]
      ],
      12
    );
    bl.add(mk(bd, mat({ color: 0xe6dccd, r: 0.35 }), 0, 0.01, 0));
    bl.add(mk(new THREE.SphereGeometry(0.014, 12, 10), mat({ map: TX.doll(), r: 0.3 }), 0, 0.13, 0, 0, Math.PI * 0.5, 0));
    const tu = mk(new THREE.ConeGeometry(0.048, 0.026, 18, 1, true), mat({ color: 0xdfabbc, r: 0.8, side: THREE.DoubleSide }), 0, 0.08, 0);
    bl.add(tu);
    [-1, 1].forEach((s) =>
      bl.add(mk(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 6), mat({ color: 0xe6dccd }), s * 0.022, 0.1, 0, 0, 0, s * 0.9))
    );
    mb.add(bl);
    const mbHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.38, 0.38),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    mbHit.position.set(0, 0.12, 0);
    mb.add(mbHit);
    interact(mb, 'musicbox');
    add(mb);
    anim((t) => {
      bl.rotation.y = t * 0.5;
    });

    // Antique Candlestick (EB03 hiding prop)
    const cg = grp(-2.93, 0.7, -2.55);
    cg.add(
      mk(
        lathe(
          [
            [0, 0],
            [0.055, 0],
            [0.055, 0.014],
            [0.022, 0.035],
            [0.018, 0.055],
            [0.032, 0.06],
            [0, 0.06]
          ],
          16
        ),
        brass,
        0,
        0,
        0
      )
    );
    // Wax Pillar with Heavy Melted Wax Runs
    const wax = mat({ color: 0xdcd3bd, r: 0.55, e: 0x221509, ei: 0.3 });
    cg.add(
      mk(new THREE.CylinderGeometry(0.018, 0.02, 0.18, 16), wax, 0, 0.15, 0),
      mk(new THREE.CylinderGeometry(0.024, 0.022, 0.025, 16), wax, 0, 0.07, 0)
    );
    for (let i = 0; i < 5; i++) {
      cg.add(
        mk(
          new THREE.CylinderGeometry(0.006, 0.008, 0.055 + i * 0.015, 8),
          wax,
          Math.cos(i * 1.5) * 0.02,
          0.16 - i * 0.015,
          Math.sin(i * 1.5) * 0.02
        )
      );
    }
    // Animated Guttering Flame Sprite & Ambient PointLight
    const fl = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: TX.flame(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        fog: false
      })
    );
    fl.position.set(0, 0.3, 0);
    fl.userData.np = 1;
    cg.add(fl);
    const gl = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: TX.glow('w'),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        fog: false,
        opacity: 0.7
      })
    );
    gl.scale.set(0.55, 0.55, 1);
    gl.position.set(0, 0.31, 0);
    gl.userData.np = 1;
    cg.add(gl);
    const cdHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.55, 0.35),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    cdHit.position.set(0, 0.16, 0);
    cg.add(cdHit);
    interact(cg, 'candle');
    add(cg);
    const pl = new THREE.PointLight(0xffaa55, 1.4, 3.4, 2);
    pl.position.set(-2.93, 1.01, -2.55);
    S.add(pl);
    E.lightRig(pl, 1.4, E.flick(2, 0.28));
    anim((t) => {
      const f = E.flick(2, 0.32)(t);
      fl.scale.set(0.052 * (0.9 + 0.2 * f), 0.115 * (0.85 + 0.3 * f), 1);
      gl.material.opacity = 0.45 * f * E.lightScale();
    });

    // Framed Photo (XB01 Decoy Prop - "behind the photograph")
    const pf = grp(-2.46, 0.7, -2.8, -0.25);
    pf.add(
      bx(0.15, 0.21, 0.02, gold, 0, 0.105, 0),
      mk(new THREE.PlaneGeometry(0.11, 0.16), mat({ map: TX.photo(0), r: 0.5 }), 0, 0.105, 0.013)
    );
    // Backing strut and peeled cardboard backing (XB01 hint)
    pf.add(
      bx(0.03, 0.13, 0.01, dark, 0, 0.07, -0.025),
      mk(new THREE.PlaneGeometry(0.13, 0.18), mat({ color: 0x4a3a28, r: 0.95 }), 0, 0.105, -0.011, 0, Math.PI, 0)
    );
    pf.rotation.x = -0.15;
    const pfHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.38, 0.22),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    pfHit.position.set(0, 0.1, 0);
    pf.add(pfHit);
    interact(pf, 'photo_frame');
    add(pf);
  }

  // 3. Victorian Pedestal Study Desk (EB04 hiding prop) with Lamp, Notebook & Chair
  {
    const g = grp(2.7, 0, -2.6);
    // Desktop & Moulded Lip
    g.add(bx(1.86, 0.07, 0.84, worn, 0, 0.75, 0), bx(1.9, 0.03, 0.88, dark, 0, 0.725, 0));
    // Turned Wood Legs with Brass Casters
    [
      [-0.82, -0.34],
      [-0.82, 0.34],
      [0.82, -0.34],
      [0.82, 0.34]
    ].forEach((p) => {
      g.add(
        mk(
          lathe(
            [
              [0, 0],
              [0.045, 0],
              [0.05, 0.1],
              [0.032, 0.2],
              [0.045, 0.4],
              [0.055, 0.5],
              [0.038, 0.6],
              [0.045, 0.7],
              [0, 0.7]
            ],
            14
          ),
          dark,
          p[0],
          0,
          p[1]
        )
      );
    });
    // Right Pedestal Drawer Stack
    g.add(bx(0.52, 0.55, 0.74, worn, 0.52, 0.44, 0));
    [0, 1, 2].forEach((i) => {
      g.add(
        bx(0.46, 0.15, 0.02, dark, 0.52, 0.62 - i * 0.17, 0.38),
        mk(new THREE.SphereGeometry(0.018, 10, 8), brass, 0.52, 0.62 - i * 0.17, 0.405)
      );
    });
    // Modesty Panel
    g.add(bx(1.24, 0.52, 0.025, dark, -0.2, 0.46, -0.36));
    interact(g, 'desk');
    add(g);
    solid(1.75, 3.65, -3, -2.2);
    tryLoadBedroomGLB(E, 'desk', g);

    // Antique Parlor Lamp (lamp prop)
    const lg = grp(3.1, 0.78, -2.5);
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.85, 0.7),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    hitBox.position.set(0, 0.35, 0);
    lg.add(hitBox);
    lg.add(
      mk(
        lathe(
          [
            [0, 0],
            [0.085, 0],
            [0.085, 0.02],
            [0.035, 0.05],
            [0.022, 0.2],
            [0.028, 0.3],
            [0.016, 0.36],
            [0, 0.37]
          ],
          20
        ),
        mat({ color: 0x18181c, m: 0.75, r: 0.35 }),
        0,
        0,
        0
      )
    );
    // Green/Amber Glass Lamp Shade
    const shade = mk(
      new THREE.CylinderGeometry(0.11, 0.18, 0.22, 28, 1, true),
      mat({ map: TX.shade(), side: THREE.DoubleSide, e: 0xffb86a, ei: 0.85, r: 0.85 }),
      0,
      0.45,
      0
    );
    lg.add(shade);
    E.lampMats.push(shade.material);
    lg.add(mk(new THREE.SphereGeometry(0.036, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }), 0, 0.45, 0));
    const lh = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: TX.glow('w'),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        fog: false,
        opacity: 0.55
      })
    );
    lh.scale.set(1.3, 1.3, 1);
    lh.position.set(0, 0.46, 0);
    lh.userData.np = 1;
    lg.add(lh);
    E.lampGlow = lh;
    interact(lg, 'lamp');
    add(lg);

    // School Notebook & Clutter (R1-02 Clue Entry Prop & EB04 Hiding Spot)
    const bk = (w, h, d, c, x, y, z, ry) => {
      const m = rb(w, h, d, 0.008, mat({ map: TX.leather(c), r: 0.7 }), x, y, z, 2);
      m.rotation.y = ry;
      return m;
    };
    const cl = grp(2.15, 0.78, -2.5);
    cl.add(
      bk(0.28, 0.04, 0.2, 'red', 0, 0.02, 0, 0.1),
      bk(0.25, 0.035, 0.18, 'green', 0, 0.058, 0, -0.15),
      bk(0.23, 0.04, 0.17, 'blue', 0, 0.096, 0, 0.3),
      bk(0.21, 0.03, 0.16, 'dark', 0, 0.132, 0, -0.05)
    );
    // Inkpot with Goose Feather Quill
    const ink = grp(2.5, 0.78, -2.3);
    ink.add(
      mk(
        lathe(
          [
            [0, 0],
            [0.038, 0],
            [0.038, 0.04],
            [0.016, 0.055],
            [0.016, 0.065],
            [0, 0.065]
          ],
          16
        ),
        mat({ color: 0x080812, r: 0.1, m: 0.3 }),
        0,
        0,
        0
      )
    );
    const qu = mk(
      tube(
        [
          [0.0, 0.06, 0],
          [0.04, 0.16, 0.03],
          [0.09, 0.22, 0.07]
        ],
        0.0035,
        8,
        5
      ),
      mat({ color: 0xe8e0d0, r: 0.8 }),
      0,
      0,
      0
    );
    ink.add(qu);
    // Scattered Loose Homework Papers
    const pp = grp(3.1, 0.785, -2.15);
    const ptx = X.tex(X.paperPage(['...'], ''));
    for (let i = 0; i < 3; i++) {
      pp.add(
        mk(
          new THREE.PlaneGeometry(0.23, 0.31),
          mat({ map: ptx, r: 1, side: 2 }),
          i * 0.03,
          i * 0.0015,
          i * 0.02,
          -Math.PI / 2,
          0,
          i * 0.5 - 0.4
        )
      );
    }
    interact(cl, 'notebook');
    add(cl);
    ink.traverse((o) => (o.userData.np = 1));
    pp.traverse((o) => (o.userData.np = 1));
    add(ink);
    add(pp);

    // Carved Victorian Desk Chair (EB12 Hiding Prop - "the cushion seam")
    const ch = grp(2.45, 0, -1.7, Math.PI - 0.55);
    [
      [-0.19, -0.19],
      [0.19, -0.19],
      [-0.19, 0.19],
      [0.19, 0.19]
    ].forEach((p) => ch.add(bx(0.042, 0.46, 0.042, worn, p[0], 0.23, p[1], { vert: true })));
    // Seat base and tufted brocade cushion with seam indentation
    ch.add(
      bx(0.46, 0.045, 0.46, worn, 0, 0.47, 0),
      rb(0.42, 0.06, 0.42, 0.03, mat({ map: TX.sheet2(), c: 0x4a1822, r: 0.95 }), 0, 0.51, 0, 2),
      bx(0.042, 0.52, 0.042, worn, -0.19, 0.73, -0.19, { vert: true }),
      bx(0.042, 0.52, 0.042, worn, 0.19, 0.73, -0.19, { vert: true }),
      bx(0.44, 0.09, 0.035, worn, 0, 0.94, -0.19)
    );
    for (let i = 0; i < 5; i++) {
      ch.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), worn, -0.13 + i * 0.065, 0.73, -0.19));
    }
    interact(ch, 'chair');
    add(ch);
    solid(2.15, 2.75, -2.0, -1.4);
    tryLoadBedroomGLB(E, 'chair', ch);
  }

  // 4. Tall Victorian Wardrobe (EB06 hiding prop - "a coat pocket")
  {
    const g = grp(3.55, 0, -0.2);
    const dk = wm('ebony', { r: 0.65 });
    const inner = new THREE.MeshStandardMaterial({ color: 0x020103, roughness: 1, side: THREE.BackSide });
    // Wardrobe Exterior Shell & Gothic Arched Moulding
    g.add(
      bx(0.035, 2.15, 1.44, dk, 0.38, 1.17, 0),
      bx(0.82, 2.15, 0.035, dk, 0, 1.17, 0.7),
      bx(0.82, 2.15, 0.035, dk, 0, 1.17, -0.7),
      bx(0.86, 0.09, 1.48, dk, 0, 2.24, 0),
      bx(0.92, 0.13, 1.54, dk, -0.02, 2.34, 0), // Top cornice
      bx(0.86, 0.14, 1.48, dk, 0, 0.07, 0),
      bx(0.8, 0.04, 1.42, dk, 0, 0.16, 0)
    );
    g.add(mk(new THREE.BoxGeometry(0.78, 2.05, 1.38), inner, 0, 1.18, 0));
    // Hanging Rail
    g.add(mk(new THREE.CylinderGeometry(0.013, 0.013, 1.36, 8), brass, 0, 1.97, 0, Math.PI / 2, 0, 0));

    // Dark Wool Overcoats (EB06 hiding spot)
    const coats = [];
    for (let i = 0; i < 6; i++) {
      const c = bx(
        0.06,
        0.98 + (i % 3) * 0.12,
        0.32,
        mat({ color: [0x120f16, 0x1a1218, 0x0e1118][i % 3], r: 1 }),
        0,
        1.46 - (i % 3) * 0.06,
        -0.5 + i * 0.2
      );
      g.add(c);
      coats.push(c);
    }
    // Subtle breathing coat sway
    anim((t) => coats.forEach((c, i) => (c.rotation.x = Math.sin(t * 0.6 + i) * 0.02)));

    // Double Panelled Doors with Keyhole Escutcheon
    const door = (side) => {
      const p = grp(-0.38, 0, 0.7 * side);
      const m = grp(0, 0, -0.34 * side);
      m.add(
        bx(0.038, 2.05, 0.68, dk, 0, 1.12, 0),
        bx(0.022, 0.82, 0.48, wm('dark'), -0.02, 0.71, 0),
        bx(0.022, 0.64, 0.48, wm('dark'), -0.02, 1.64, 0),
        mk(new THREE.SphereGeometry(0.024, 12, 10), brass, -0.048, 1.05, -0.28 * side)
      );
      p.add(m);
      g.add(p);
      return p;
    };
    const dr = door(1);
    const dl = door(-1);
    dr.rotation.y = 0.16;
    ref.wardrobe = { doorR: dr, doorL: dl, pos: new THREE.Vector3(3.2, 1.2, -0.2) };

    // Blackout Jump Scare Face inside Wardrobe
    const ff = mk(
      new THREE.PlaneGeometry(0.72, 0.92),
      new THREE.MeshBasicMaterial({
        map: X.tex(X.faceC({ glow: true, eye: '#ff2a1a', seed: 7 }), {}),
        transparent: true,
        fog: false,
        depthWrite: false
      }),
      -0.3,
      1.25,
      0.12,
      0,
      -Math.PI / 2,
      0
    );
    ff.visible = false;
    ff.userData.np = 1;
    g.add(ff);
    ref.wardrobe.face = ff;

    interact(g, 'wardrobe');
    add(g);
    solid(3.1, 4, -0.95, 0.55);
    tryLoadBedroomGLB(E, 'wardrobe', g);
  }

  // 5. Heavy Iron-Banded Storage Trunk (EB01 hiding prop - "folded in the lid lining")
  {
    const g = grp(-0.8, 0, -0.05, 0);
    const lt = mat({ map: TX.leather('dark'), r: 0.6, c: 0x9b7b6c });
    // Trunk Box with Iron Corner Straps (Resident Evil Item Chest homage)
    g.add(
      bx(0.82, 0.03, 0.56, lt, 0, 0.015, 0),
      bx(0.82, 0.22, 0.03, lt, 0, 0.12, 0.265),
      bx(0.82, 0.22, 0.03, lt, 0, 0.12, -0.265),
      bx(0.03, 0.22, 0.56, lt, -0.395, 0.12, 0),
      bx(0.03, 0.22, 0.56, lt, 0.395, 0.12, 0),
      // Iron reinforcement brackets & corner studs
      bx(0.84, 0.03, 0.04, iron, 0, 0.22, 0.265),
      bx(0.84, 0.03, 0.04, iron, 0, 0.22, -0.265),
      bx(0.04, 0.03, 0.58, iron, -0.395, 0.22, 0),
      bx(0.04, 0.03, 0.58, iron, 0.395, 0.22, 0)
    );
    // Interior Tufted Red Velvet Base
    g.add(mk(new THREE.PlaneGeometry(0.76, 0.52), mat({ color: 0x48121f, r: 0.95 }), 0, 0.032, 0, -Math.PI / 2, 0, 0));

    // Folded Blankets & Garments inside
    const cw = mat({ map: TX.sheet2(), bump: TX.sheet2(), bs: 2, r: 1, c: 0x4a5578 });
    const cw2 = mat({ map: TX.sheet(), bump: TX.sheet(), bs: 2, r: 1, c: 0x6a4552 });
    g.add(
      rb(0.5, 0.07, 0.38, 0.03, cw, -0.1, 0.07, 0.0, 4),
      rb(0.46, 0.06, 0.34, 0.03, cw2, -0.08, 0.135, 0.01, 4)
    );

    // Open Hinged Lid with Quilted Lining (EB01 hiding spot: "folded in the lid lining")
    const lidp = grp(0, 0.23, -0.265);
    lidp.add(
      bx(0.82, 0.032, 0.56, lt, 0, 0, 0.28),
      bx(0.82, 0.025, 0.03, lt, 0, -0.01, 0.56),
      bx(0.03, 0.025, 0.56, lt, -0.395, -0.01, 0.28),
      bx(0.03, 0.025, 0.56, lt, 0.395, -0.01, 0.28),
      // Velvet lid lining where the fragment is tucked
      mk(new THREE.PlaneGeometry(0.76, 0.52), mat({ color: 0x581424, r: 0.95, side: 2 }), 0, -0.018, 0.28, Math.PI / 2, 0, 0),
      // Brass Corner Hasps
      bx(0.06, 0.04, 0.016, brass, -0.25, 0.0, 0.56),
      bx(0.06, 0.04, 0.016, brass, 0.25, 0.0, 0.56)
    );
    lidp.rotation.x = -1.9;
    g.add(lidp);

    interact(g, 'trunk');
    add(g);
    solid(-1.3, -0.3, -0.35, 0.25);
    tryLoadBedroomGLB(E, 'trunk', g);
  }

  // 6. Rocking Chair with Possessed Porcelain Doll (EK01 hiding prop - "inside the doll")
  {
    const yaw = grp(-3.1, 0, 1.2, Math.PI / 2);
    const pv = grp(0, 0, 0, 0);
    yaw.add(pv);

    // Curved Runners & Spindles
    [-1, 1].forEach((s) => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const z = -0.5 + i * 0.1;
        pts.push([s * 0.27, 0.03 + 0.2 * Math.pow(z / 0.5, 2) * 0.8, z]);
      }
      pv.add(mk(tube(pts, 0.016, 24, 8), worn));
      pv.add(
        bx(0.035, 0.4, 0.035, worn, s * 0.26, 0.25, 0.2, { vert: true }),
        bx(0.035, 0.5, 0.035, worn, s * 0.26, 0.3, -0.2, { vert: true }),
        bx(0.03, 0.2, 0.03, worn, s * 0.27, 0.56, 0.15, { vert: true }),
        bx(0.04, 0.03, 0.44, worn, s * 0.27, 0.67, 0.0)
      );
    });
    pv.add(
      bx(0.54, 0.04, 0.46, dark, 0, 0.45, 0),
      bx(0.5, 0.03, 0.03, worn, 0, 0.2, 0.2),
      bx(0.5, 0.03, 0.03, worn, 0, 0.2, -0.2)
    );
    // Spindle Backrest
    const back = grp(0, 0.46, -0.22);
    back.rotation.x = -0.14;
    back.add(
      bx(0.035, 0.55, 0.035, worn, -0.24, 0.28, 0, { vert: true }),
      bx(0.035, 0.55, 0.035, worn, 0.24, 0.28, 0, { vert: true }),
      bx(0.54, 0.08, 0.03, worn, 0, 0.56, 0),
      bx(0.5, 0.03, 0.03, worn, 0, 0.1, 0)
    );
    for (let i = 0; i < 6; i++) {
      back.add(mk(new THREE.CylinderGeometry(0.011, 0.011, 0.46, 8), worn, -0.2 + i * 0.08, 0.3, 0));
    }
    pv.add(back);

    // Porcelain Doll with Tracking Head (EK01 Hiding Prop)
    const dg = buildDoll(1.5);
    dg.position.set(0, 0.47, 0.02);
    pv.add(dg);
    ref.doll = { g: dg, head: dg.userData.head };
    ref.chair = { yaw, pv };
    interact(dg, 'doll');
    add(yaw);
    solid(-3.5, -2.7, 0.85, 1.55);

    // Animate Rocking Motion & Phasmophobia-style Doll Head Tracking
    anim((t) => {
      const a = ref.chairRock ?? 1;
      pv.rotation.x = Math.sin(t * 1.8) * 0.08 * a + Math.sin(t * 0.6) * 0.012;

      // Phasmophobia Doll Head Tracking: smoothly turns to face player when within 3.8m
      if (ref.doll && ref.doll.head && cam) {
        const dollPos = new THREE.Vector3();
        dg.getWorldPosition(dollPos);
        const dist = dollPos.distanceTo(cam.position);
        if (dist < 3.8 && dist > 0.4) {
          const dx = cam.position.x - dollPos.x;
          const dz = cam.position.z - dollPos.z;
          const targetYaw = Math.atan2(dx, dz) - yaw.rotation.y;
          const clampedYaw = Math.max(-1.1, Math.min(1.1, targetYaw));
          ref.doll.head.rotation.y += (clampedYaw - ref.doll.head.rotation.y) * 0.04;
          ref.doll.head.rotation.z = Math.sin(t * 1.4) * 0.035 - 0.02;
        } else {
          ref.doll.head.rotation.y += (0 - ref.doll.head.rotation.y) * 0.02;
          ref.doll.head.rotation.z += (0 - ref.doll.head.rotation.z) * 0.02;
        }
      }
    });
    tryLoadBedroomGLB(E, 'doll', dg);
  }

  // 7. Victorian Gothic Bookshelf (EB10 hiding prop - "inside a hollowed book on the shelf")
  {
    const g = grp(-2.3, 0, 2.8, Math.PI);
    const br = wm('ebony', { r: 0.65 });
    // Shell & Shelves
    g.add(
      bx(0.045, 1.98, 0.35, br, -0.6, 0.99, 0),
      bx(0.045, 1.98, 0.35, br, 0.6, 0.99, 0),
      bx(1.3, 0.05, 0.38, br, 0, 1.99, 0),
      bx(1.22, 1.92, 0.025, wm('dark'), 0, 0.99, -0.16),
      bx(1.22, 0.14, 0.35, br, 0, 0.07, 0)
    );
    const ys = [0.3, 0.78, 1.26, 1.74];
    ys.forEach((y) => g.add(bx(1.18, 0.03, 0.33, wm('worn'), 0, y, 0)));

    // Dense Leatherbound Antique Books
    const cols = ['red', 'green', 'blue', 'dark'];
    const r = X.rng(4);
    const bookGeosByCol = { red: [], green: [], blue: [], dark: [] };
    for (let row of [0, 2]) {
      let x = -0.55;
      const base = ys[row] + 0.015;
      while (x < 0.5) {
        const w = 0.025 + r() * 0.035;
        const h = 0.17 + r() * 0.1;
        const lean = r() < 0.1;
        const col = cols[Math.floor(r() * 4)];
        const bg = bgeo(w, h, 0.2, 1.4);
        if (lean) {
          bg.rotateZ(0.25);
          bg.translate(x + w / 2, base + h / 2 - 0.01, 0);
        } else {
          bg.translate(x + w / 2, base + h / 2, 0);
        }
        bookGeosByCol[col].push(bg);
        x += w + 0.002;
      }
    }
    for (const [col, geos] of Object.entries(bookGeosByCol)) {
      if (geos.length) {
        const mg = BufferGeometryUtils.mergeGeometries(geos);
        g.add(new THREE.Mesh(mg, mat({ map: TX.leather(col), r: 0.65 })));
      }
    }

    // Specimen Jars with Floating Eye (tracks player camera)
    const baseY = ys[1] + 0.015;
    [-0.35, -0.05].forEach((jx) => {
      const jg = grp(jx, baseY, 0.0);
      jg.add(
        mk(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 24), mat({ c: 0x9ad0a8, t: 1, o: 0.28, r: 0.05, m: 0.1, dw: false }), 0, 0.1, 0),
        mk(
          new THREE.CylinderGeometry(0.066, 0.066, 0.17, 24),
          mat({ c: 0x7ab88a, t: 1, o: 0.35, r: 0.2, e: 0x1a4a2a, ei: 0.5, dw: false }),
          0,
          0.095,
          0
        ),
        mk(new THREE.CylinderGeometry(0.078, 0.078, 0.025, 24), brass, 0, 0.21, 0)
      );
      const ey = mk(new THREE.SphereGeometry(0.036, 20, 16), mat({ map: TX.eye(), r: 0.2 }), 0, 0.1, 0);
      jg.add(ey);
      ref.eyes = ref.eyes || [];
      ref.eyes.push(ey);
      g.add(jg);
    });

    // Cracked Human Skull & Decayed Dolls
    const d2 = buildDoll(0.8);
    d2.position.set(0.3, baseY, 0);
    d2.rotation.y = -0.3;
    g.add(d2);
    const d3 = buildDoll(0.65);
    d3.position.set(0.48, baseY, 0);
    d3.rotation.y = 0.4;
    d3.rotation.z = 0.12;
    g.add(d3);
    const sk = buildSkull(1);
    sk.position.set(-0.3, ys[3] + 0.015, 0);
    sk.rotation.y = 0.4;
    g.add(sk);

    const pk = pumpkinMesh(0.07, 2);
    pk.position.set(0.15, ys[3] + 0.015 + 0.05, 0);
    g.add(pk);
    glow(pk.userData.mat, 1.3);

    const bsHit = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.0, 0.5),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    bsHit.position.set(0, 1.0, 0);
    g.add(bsHit);
    interact(g, 'bookshelf');
    add(g);
    solid(-2.95, -1.65, 2.6, 3);
    tryLoadBedroomGLB(E, 'bookshelf', g);
  }

  // 8. Gothic Window with Cracked Glass & Curtains (window hiding prop)
  if (win) {
    const wz = win.z;
    const wy0 = win.y0;
    const wy1 = win.y1;
    const wh = wy1 - wy0;
    const fr = wm('dark');
    const X0 = -W / 2;
    const g = grp(X0, 0, wz);
    const winHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, wh + 0.3, win.w + 0.3),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    winHitBox.position.set(0.3, (wy0 + wy1) / 2, 0);
    g.add(winHitBox);
    g.add(
      bx(0.12, 0.08, win.w + 0.2, fr, 0.03, wy1 + 0.04, 0),
      bx(0.12, 0.08, win.w + 0.2, fr, 0.03, wy0 - 0.04, 0),
      bx(0.12, wh, 0.08, fr, 0.03, (wy0 + wy1) / 2, -win.w / 2 - 0.04),
      bx(0.12, wh, 0.08, fr, 0.03, (wy0 + wy1) / 2, win.w / 2 + 0.04)
    );
    // Mullions & Sill
    g.add(
      bx(0.04, wh, 0.04, fr, 0.04, (wy0 + wy1) / 2, 0),
      bx(0.04, 0.04, win.w, fr, 0.04, (wy0 + wy1) / 2, 0),
      bx(0.3, 0.05, win.w + 0.35, fr, 0.12, wy0 - 0.07, 0),
      bx(0.18, 0.2, win.w + 0.3, fr, 0.03, wy1 + 0.14, 0)
    );
    // Cracked Glass Plane
    const cm = new THREE.Mesh(
      new THREE.PlaneGeometry(win.w, wh),
      new THREE.MeshBasicMaterial({
        map: X.tex(X.crackC(512, 512, 6, { cx: 0.7, cy: 0.35, n: 12 }), {}),
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        fog: false
      })
    );
    cm.rotation.y = Math.PI / 2;
    cm.position.set(0.025, (wy0 + wy1) / 2, 0);
    g.add(cm);
    interact(g, 'window');
    add(g);

    // Brass Curtain Rod & Draped Velvet Curtains
    const rod = grp(X0 + 0.14, 0, wz);
    rod.add(
      mk(new THREE.CylinderGeometry(0.015, 0.015, win.w + 0.9, 10), brass, 0, 2.46, 0, Math.PI / 2, 0, 0),
      mk(new THREE.SphereGeometry(0.03, 12, 10), brass, 0, 2.46, -(win.w + 0.9) / 2),
      mk(new THREE.SphereGeometry(0.03, 12, 10), brass, 0, 2.46, (win.w + 0.9) / 2)
    );
    rod.traverse((o) => (o.userData.np = 1));
    add(rod);

    const cmat = mat({ map: TX.curtain(), at: 0.5, side: THREE.DoubleSide, r: 1 });
    [-1, 1].forEach((s) => {
      const geo = curtainGeo(0.62, 1.85);
      const m = new THREE.Mesh(geo, cmat);
      m.position.set(X0 + 0.2, 2.42 - 0.925, wz + s * (win.w / 2 + 0.02));
      m.rotation.y = Math.PI / 2;
      m.castShadow = false;
      m.receiveShadow = true;
      m.userData.np = 1;
      S.add(m);
    });
  }

  // 9. Exit Door to Daniel's Study (room_door - opens upon clue exhaustion / resolution)
  {
    const g = grp(3, 0, 2.965, Math.PI);
    const dk = wm('dark');
    // Heavy Door Frame
    g.add(
      bx(0.1, 2.22, 0.07, wm('ebony'), -0.5, 1.11, 0),
      bx(0.1, 2.22, 0.07, wm('ebony'), 0.5, 1.11, 0),
      bx(1.1, 0.1, 0.07, wm('ebony'), 0, 2.22, 0)
    );
    // Door Hinge & Leaf
    const doorHinge = grp(-0.45, 0, 0);
    const doorLeaf = grp(0.45, 0, 0);
    doorLeaf.add(bx(0.9, 2.12, 0.05, dk, 0, 1.06, 0));
    for (const y of [1.62, 0.56]) {
      for (const x of [-0.22, 0.22]) {
        doorLeaf.add(bx(0.3, 0.7, 0.02, wm('worn'), x, y, 0.03), bx(0.3, 0.66, 0.012, dk, x, y, 0.04));
      }
    }
    // Tarnished Brass Escutcheon, Knob & Keyhole
    doorLeaf.add(
      mk(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 20), brass, 0.33, 1.05, 0.04, Math.PI / 2, 0, 0),
      mk(new THREE.SphereGeometry(0.035, 16, 12), brass, 0.33, 1.05, 0.075),
      bx(0.1, 0.025, 0.005, brass, 0.33, 0.92, 0.036),
      mk(
        tube(
          [
            [0.28, 1.4, 0.04],
            [0.2, 1.36, 0.05],
            [0.12, 1.4, 0.04],
            [0.04, 1.35, 0.05]
          ],
          0.007,
          20,
          5
        ),
        brass
      )
    );
    // Iron Deadbolts
    const boltMat = mat({ color: 0x1c1a24, m: 0.9, r: 0.2 });
    doorLeaf.add(
      bx(0.16, 0.04, 0.03, boltMat, 0.4, 1.8, 0.035),
      bx(0.16, 0.04, 0.03, boltMat, 0.4, 0.35, 0.035)
    );
    doorHinge.add(doorLeaf);
    g.add(doorHinge);

    const doorHit = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 2.2, 0.3),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    doorHit.position.set(0, 1.1, 0);
    g.add(doorHit);
    interact(g, 'room_door');
    add(g);
    solid(2.4, 3.6, 2.7, 3.0);

    ref.roomDoor = { hinge: doorHinge, isOpen: false, angle: 0 };
    anim(() => {
      if (ref.roomDoor) {
        const targetAngle = ref.roomDoor.isOpen ? 1.55 : 0;
        ref.roomDoor.angle += (targetAngle - ref.roomDoor.angle) * 0.05;
        ref.roomDoor.hinge.rotation.y = -ref.roomDoor.angle;
      }
    });

    // Subtle Under-Door Light Seam (shifts green when unlocked to hint at Daniel's study)
    const ls = mk(
      new THREE.PlaneGeometry(0.88, 0.015),
      new THREE.MeshBasicMaterial({
        color: 0x3dff8b,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        fog: false,
        depthWrite: false
      }),
      3,
      0.008,
      2.93,
      -Math.PI / 2,
      0,
      0
    );
    ls.userData.np = 1;
    S.add(ls);
  }

  // 10. Baroque Oval Mirror (mirror hiding prop - "behind the frame")
  {
    const g = grp(-1.0, 1.55, 2.955, Math.PI);
    const geo = new THREE.CircleGeometry(1, 48);
    const mr = new Reflector(geo, { color: 0x707890, textureWidth: 512, textureHeight: 512, clipBias: 0.003 });
    mr.scale.set(0.27, 0.44, 1);
    mr.position.z = 0.006;
    mr.userData.np = 1;
    g.add(mr);
    // Gilded Baroque Frame with Ebony Inlay
    const fr = mk(new THREE.TorusGeometry(1, 0.1, 12, 56), gold, 0, 0, 0.02);
    fr.scale.set(0.31, 0.48, 0.35);
    g.add(fr);
    const fr2 = mk(new THREE.TorusGeometry(1, 0.05, 10, 56), mat({ map: TX.wood('ebony'), r: 0.6 }), 0, 0, 0.01);
    fr2.scale.set(0.285, 0.455, 0.3);
    g.add(fr2);
    // Mirror Dirt & Spiderweb Crack
    const cr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.9),
      new THREE.MeshBasicMaterial({
        map: X.tex(X.crackC(512, 512, 2, { cx: 0.4, cy: 0.45, n: 16 }), {}),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        fog: false
      })
    );
    cr.scale.set(0.95, 0.95, 1);
    cr.position.z = 0.012;
    cr.userData.np = 1;
    g.add(cr);
    const dt = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.88),
      new THREE.MeshBasicMaterial({ map: X.tex(X.mirrorDirt(), {}), transparent: true, depthWrite: false, fog: false })
    );
    dt.position.z = 0.011;
    g.add(dt);
    const mrHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.2, 0.2),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    g.add(mrHit);
    interact(g, 'mirror');
    add(g, { noShadow: true });
  }

  buildDecor(E);
}

// Exported for contract testing and shelf decoration
export function buildDoll(s = 1) {
  const g = new THREE.Group();
  const sk = mat({ map: TX.doll(), r: 0.35 });
  const dress = mat({ map: TX.sheet(), c: 0xe0cfd4, r: 0.9, side: 2 });
  g.add(mk(lathe([[0, 0], [0.1, 0], [0.13, 0.04], [0.1, 0.1], [0.05, 0.16], [0.035, 0.22], [0.05, 0.26], [0, 0.27]], 24), dress, 0, 0, 0));
  g.add(mk(new THREE.TorusGeometry(0.11, 0.012, 8, 28), dress, 0, 0.035, 0, Math.PI / 2, 0, 0));
  [-1, 1].forEach((a) => {
    g.add(
      mk(new THREE.CylinderGeometry(0.015, 0.013, 0.17, 8), mat({ color: 0xdccfc4, r: 0.4 }), a * 0.04, 0.1, 0.12, Math.PI / 2.4, 0, 0),
      mk(new THREE.SphereGeometry(0.022, 10, 8), mat({ color: 0x151015, r: 0.5 }), a * 0.04, 0.04, 0.2),
      mk(new THREE.CylinderGeometry(0.012, 0.01, 0.13, 8), mat({ color: 0xdccfc4, r: 0.4 }), a * 0.085, 0.19, 0.05, 0.5, 0, a * 0.5)
    );
  });
  const head = new THREE.Group();
  head.position.set(0, 0.31, 0);
  const hs = mk(new THREE.SphereGeometry(0.06, 32, 24), sk, 0, 0.03, 0);
  head.add(hs);
  head.add(
    mk(
      new THREE.SphereGeometry(0.064, 32, 20, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.78),
      mat({ map: TX.hair(), r: 0.9, side: 2 }),
      0,
      0.035,
      -0.002
    )
  );
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
    g.add(
      mk(new THREE.SphereGeometry(0.022, 14, 10), dk, a * 0.03, 0.075, 0.058),
      mk(new THREE.SphereGeometry(0.02, 12, 8), bm, a * 0.05, 0.05, 0.045)
    );
  });
  g.add(
    mk(new THREE.ConeGeometry(0.012, 0.03, 3), dk, 0, 0.05, 0.075, 0, 0, Math.PI),
    bx(0.07, 0.035, 0.07, bm, 0, 0.015, 0.04, { s: 6 }),
    bx(0.075, 0.03, 0.075, bm, 0, -0.01, 0.03, { s: 6 })
  );
  for (let i = 0; i < 6; i++) {
    g.add(bx(0.008, 0.014, 0.008, mat({ color: 0xd8d0bc, r: 0.5 }), -0.03 + i * 0.012, 0.0, 0.073, { s: 4 }));
  }
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
  const st = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.01, 0.05, 0),
        new THREE.Vector3(0.04, 0.1, 0.01),
        new THREE.Vector3(0.07, 0.12, 0)
      ]),
      12,
      0.14 * r,
      8
    ),
    mat({ map: TX.wood('worn'), c: 0x6a7a3a, r: 0.8 })
  );
  st.scale.setScalar(r * 3.2);
  st.position.set(-0.02, r * 0.82 - 0.03 * r, 0);
  g.add(st);
  g.userData.mat = m;
  g.userData.body = body;
  return g;
}

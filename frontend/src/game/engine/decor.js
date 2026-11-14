// Decor: rug, beams, lights, pumpkins, candles, bats, spider, webs, portrait, frames, poster, clock, decals, light shafts, outside view.
// Upgraded with Resident Evil gothic detail, swinging grandfather clock pendulum, and atmospheric Phasmophobia lighting.
import { THREE, X, TX, RoundedBoxGeometry, BufferGeometryUtils, mat, wm, lathe, bgeo, tube } from './kit.js';
import { mk, grp, buildDoll, pumpkinMesh } from './scene.js';

const spr = (map, sc, op = 1, blend = true) => {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map,
      transparent: true,
      opacity: op,
      depthWrite: false,
      fog: false,
      blending: blend ? THREE.AdditiveBlending : THREE.NormalBlending
    })
  );
  s.scale.set(sc, sc, 1);
  s.userData.np = 1;
  s.userData.ns = 1;
  return s;
};

const decal = (map, w, h, x, y, z, ry, o = {}) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      depthWrite: false,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      opacity: o.o ?? 1
    })
  );
  m.position.set(x, y, z);
  m.rotation.set(0, ry, o.rz || 0);
  m.userData.np = 1;
  m.userData.ns = 1;
  return m;
};

const bx = (w, h, d, m, x = 0, y = 0, z = 0, o = {}) =>
  mk(bgeo(w, h, d, o.s ?? 1.4, o.vert), m, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0);

const rb = (w, h, d, r, m, x = 0, y = 0, z = 0, seg = 2) =>
  mk(new RoundedBoxGeometry(w, h, d, seg, r), m, x, y, z);

export function buildDecor(E) {
  const { S, add, anim, glow, interact, cam, W, H, D, win, ref } = E;
  const R = X.rng(12);
  const gold = mat({ map: TX.metal(), m: 0.75, r: 0.45, c: 0xd4a35c });
  const brass = mat({ map: TX.brass(), m: 0.85, r: 0.42, c: 0xd8b070 });
  const darkWood = wm('dark', { r: 0.8, c: 0x1c1318 });
  const ebony = wm('ebony', { r: 0.65, c: 0x100b12 });

  // 1. Victorian Faded Persian Floor Rug (rug decor)
  {
    const m = mk(
      new THREE.CircleGeometry(1, 64),
      mat({ map: TX.rug(), r: 1, bump: TX.rug(), bs: 0.6 }),
      0.35,
      0.006,
      0.75,
      -Math.PI / 2,
      0,
      0
    );
    m.scale.set(1.6, 1.1, 1);
    m.rotation.z = 0.15;
    m.userData.id = 'rug';
    m.userData.np = 1;
    add(m);
  }

  // 2. Heavy Ceiling Beams (beams_webs decor)
  {
    const b = wm('ebony');
    [-1.2, 1.4].forEach((z) => {
      const bm = mk(new THREE.BoxGeometry(W, 0.24, 0.3), b, 0, H - 0.12, z);
      bm.userData.id = 'beams_webs';
      bm.userData.np = 1;
      add(bm);
    });
  }

  // 3. Central Overhead Victorian Pendant Lamp (Moody flickering light)
  {
    const g = grp(0, 0, 0.2);
    // Tarnished Brass Chain & Socket
    g.add(
      mk(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 6), new THREE.MeshBasicMaterial({ color: 0x050505 }), 0, H - 0.35, 0),
      mk(
        lathe(
          [
            [0, 0],
            [0.02, 0],
            [0.025, 0.05],
            [0.015, 0.08],
            [0, 0.08]
          ],
          12
        ),
        mat({ color: 0x151515, m: 0.8, r: 0.4 }),
        0,
        H - 0.76,
        0
      )
    );
    // Filament Bulb with Wire Cage
    const bm = mat({ color: 0xffffff, e: 0xcfd0ff, ei: 1.2, r: 0.2 });
    const bulb = mk(new THREE.SphereGeometry(0.05, 20, 16), bm, 0, H - 0.8, 0);
    bulb.userData.np = 1;
    g.add(bulb);
    glow(bm, 1.2, E.flick(7, 0.45));
    add(g);

    // Moody Overhead Light (Balanced Victorian gothic ambience: intensity 3.6 for clarity)
    const l = new THREE.PointLight(0xb0a5ff, 3.6, 12, 1.8);
    l.position.set(0, H - 0.85, 0.2);
    S.add(l);
    E.lightRig(l, 3.6, E.flick(7, 0.25));
    const hs = spr(TX.glow('v'), 1.2, 0.65);
    hs.position.set(0, H - 0.8, 0.2);
    S.add(hs);
    anim((t) => (hs.material.opacity = 0.55 * E.flick(7, 0.25)(t) * E.lightScale()));

    // Central room fill light ensuring spawn and play area are cleanly visible
    const fillLight = new THREE.PointLight(0x7e8aff, 2.0, 9.0, 1.8);
    fillLight.position.set(0.4, 2.3, 2.0);
    S.add(fillLight);
    E.lightRig(fillLight, 2.0, E.flick(11, 0.15));
  }

  // 4. Halloween Fairy Lights Swagged along the Wall
  {
    const pts = [];
    const n = 5;
    for (let i = 0; i <= n; i++) {
      for (let k = 0; k <= 8; k++) {
        const t = i + k / 8;
        const z = -2.8 + t * (5.6 / (n + 1));
        const sag = Math.sin((k / 8) * Math.PI) * 0.16;
        pts.push([3.94, 2.78 - sag, z]);
      }
    }
    add(mk(tube(pts, 0.004, 120, 4), new THREE.MeshBasicMaterial({ color: 0x07110a })), { noShadow: true });
    const cols = [
      [0xff8a1a, 0xff6a00],
      [0xa070ff, 0x7a4cff],
      [0x8cff6a, 0x4cd23a]
    ];
    const mats = cols.map((c, i) => {
      const m = mat({ color: c[0], e: c[1], ei: 2, r: 0.3 });
      glow(m, 2, E.flick(20 + i, 0.4));
      return m;
    });
    const g = new THREE.Group();
    for (let i = 0; i < pts.length; i += 3) {
      const p = pts[i];
      const b = mk(new THREE.SphereGeometry(0.03, 10, 8), mats[(i / 3 | 0) % 3], p[0] - 0.01, p[1] - 0.04, p[2]);
      b.scale.y = 1.3;
      b.userData.ns = 1;
      b.userData.np = 1;
      g.add(b);
      if (i % 6 === 0) {
        const h = spr(TX.glow(['o', 'v', 'o'][(i / 3 | 0) % 3] === 'o' ? 'o' : 'v'), 0.22, 0.55);
        h.position.set(p[0] - 0.02, p[1] - 0.04, p[2]);
        g.add(h);
      }
    }
    add(g);
  }

  // 5. Jack-o'-Lantern Pumpkins (pumpkins decor) - Atmospheric Emissive Glow
  const pumps = [
    [-0.55, 0, 1.55, 0.3, 0, true],
    [2.3, 0, 2.35, 0.2, 1, false],
    [2.2, 0.78, -2.3, 0.1, 2, false]
  ];
  pumps.forEach(([x, y, z, r, k, lt]) => {
    const p = pumpkinMesh(r, k);
    p.position.set(x, y + r * 0.82, z);
    p.rotation.y = k === 0 ? 0.9 : k === 1 ? -2.2 : 0.5;
    p.userData.id = 'pumpkins';
    p.userData.np = 1;
    if (p.userData.body) p.userData.body.userData.np = 1;
    add(p);
    glow(p.userData.mat, 1.7, E.flick(30 + k, 0.35));
    if (lt) {
      // Warm local candle flicker inside carved pumpkin
      const l = new THREE.PointLight(0xff7a1a, 2.2, 5.5, 2);
      l.position.set(x, y + r * 0.8, z);
      S.add(l);
      E.lightRig(l, 2.2, E.flick(30 + k, 0.35));
      const h = spr(TX.glow('o'), 1.4, 0.45);
      h.position.copy(l.position);
      S.add(h);
      anim((t) => (h.material.opacity = 0.35 * E.flick(30, 0.35)(t) * E.lightScale()));
    }
  });

  if (win) {
    const p = pumpkinMesh(0.13, 2);
    p.position.set(-W / 2 + 0.2, 1.0 + 0.13 * 0.82 + 0.01, win.z + 0.55);
    p.rotation.y = Math.PI / 2 + 0.4;
    p.userData.id = 'pumpkins';
    p.userData.np = 1;
    if (p.userData.body) p.userData.body.userData.np = 1;
    add(p);
    glow(p.userData.mat, 1.7, E.flick(41, 0.35));
  }

  // 6. Occult Ritual Chalk Circle & Floor Candles
  {
    const m = mk(
      new THREE.CircleGeometry(0.68, 48),
      new THREE.MeshStandardMaterial({
        map: TX.chalk(),
        transparent: true,
        depthWrite: false,
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -2
      }),
      -2.1,
      0.008,
      0.6,
      -Math.PI / 2,
      0,
      0
    );
    m.userData.np = 1;
    m.userData.ns = 1;
    add(m);

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 6.283 - 1.5708;
      const x = -2.1 + Math.cos(a) * 0.64;
      const z = 0.6 + Math.sin(a) * 0.64;
      const h = 0.09 + R() * 0.1;
      const g = grp(x, 0, z);
      const wax = mat({ color: 0xd8cfb8, r: 0.55, e: 0x201408, ei: 0.3 });
      g.add(
        mk(new THREE.CylinderGeometry(0.02, 0.024, h, 14), wax, 0, h / 2, 0),
        mk(new THREE.CylinderGeometry(0.03, 0.026, 0.015, 14), wax, 0, 0.007, 0)
      );
      const f = spr(TX.flame(), 0.05, 1);
      f.material.depthWrite = false;
      f.position.set(0, h + 0.045, 0);
      g.add(f);
      const gl = spr(TX.glow('w'), 0.35, 0.5);
      gl.position.set(0, h + 0.05, 0);
      g.add(gl);
      g.traverse((o) => (o.userData.np = 1));
      add(g);
      const sd = 50 + i;
      anim((t) => {
        const q = E.flick(sd, 0.4)(t) * E.lightScale();
        f.scale.set(0.04 * (0.9 + 0.2 * q), 0.1 * (0.85 + 0.3 * q), 1);
        gl.material.opacity = 0.4 * q;
      });
    }
  }

  // 7. Spilled Halloween Treat Bucket & Letter Blocks
  {
    const g = grp(0.62, 0, -0.38, 0.4);
    g.add(
      mk(
        lathe(
          [
            [0, 0],
            [0.075, 0],
            [0.1, 0.14],
            [0.105, 0.15],
            [0.095, 0.15],
            [0.07, 0.01],
            [0, 0.01]
          ],
          24
        ),
        mat({ color: 0xd8561a, r: 0.25, m: 0.05, side: 2 }),
        0,
        0,
        0
      ),
      mk(new THREE.TorusGeometry(0.095, 0.006, 6, 24, Math.PI), mat({ color: 0x111111, r: 0.4 }), 0, 0.15, 0, 0, 0, 0)
    );
    g.traverse((o) => (o.userData.np = 1));
    add(g);

    const cc = [0xff7a1a, 0x9a5cff, 0x60e060, 0xffd24a];
    for (let i = 0; i < 16; i++) {
      const a = R() * 6.283;
      const r = 0.12 + R() * 0.34;
      const c = new THREE.Group();
      const m = mat({ color: cc[i % 4], r: 0.3, m: 0.1 });
      c.add(
        mk(new THREE.SphereGeometry(0.016, 10, 8), m),
        mk(new THREE.ConeGeometry(0.014, 0.025, 8), m, 0.026, 0, 0, 0, 0, -Math.PI / 2),
        mk(new THREE.ConeGeometry(0.014, 0.025, 8), m, -0.026, 0, 0, 0, 0, Math.PI / 2)
      );
      c.children[0].scale.x = 1.5;
      c.position.set(0.62 + Math.cos(a) * r, 0.016, -0.38 + Math.sin(a) * r);
      c.rotation.y = R() * 6;
      c.traverse((o) => (o.userData.np = 1));
      add(c);
    }

    const bl = (ch, x, y, z, ry, h) => {
      const t = X.tex(X.blockC(ch, h));
      const m = mk(new RoundedBoxGeometry(0.1, 0.1, 0.1, 2, 0.008), mat({ map: t, r: 0.6 }), x, y, z);
      m.rotation.y = ry;
      m.userData.np = 1;
      add(m);
    };
    bl('R', -1.35, 0.05, 1.7, 0.3, 0);
    bl('E', -1.22, 0.05, 1.62, -0.2, 1);
    bl('X', -1.3, 0.15, 1.66, 0.7, 2);
  }

  // 8. Dusty Spiderwebs in Room Corners
  {
    const wt = TX.web();
    const wmt = () =>
      new THREE.MeshBasicMaterial({
        map: wt,
        transparent: true,
        depthWrite: false,
        side: 2,
        fog: true,
        opacity: 0.9
      });
    const pl = (x, y, z, rx, ry, rz, s) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), wmt());
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.userData.id = 'beams_webs';
      m.userData.np = 1;
      m.userData.ns = 1;
      m.geometry.translate(s / 2, s / 2, 0);
      add(m);
    };
    const h = H - 0.004;
    const w = W / 2 - 0.004;
    const d = D / 2 - 0.004;
    const s = 1.0;
    pl(-w, h, -d, Math.PI / 2, 0, 0, s);
    pl(-w, h, -d, 0, 0, (Math.PI / 2) * 3, s);
    pl(-w + 0.004, h, -d, 0, Math.PI / 2, 0, s);
    pl(w, h, -d, Math.PI / 2, 0, Math.PI / 2, s);
    pl(w, h, -d + 0.004, 0, 0, 0, s);
    pl(w - 0.004, h, -d, 0, -Math.PI / 2, (Math.PI / 2) * 3, s);
    pl(-w, h, d, Math.PI / 2, 0, Math.PI / 2, s * 0.9);
    pl(w, h, d, Math.PI / 2, 0, Math.PI, s * 0.9);
    pl(w, h, d - 0.004, 0, Math.PI, 0, s * 0.9);
  }

  // 9. Hanging Bats & Descending Spider (bats_spider decor)
  {
    const bm = TX.bat();
    const bats = [];
    [
      [-1.6, 2.55, -0.4],
      [0.8, 2.35, 0.9],
      [1.9, 2.6, -1.6],
      [-0.4, 2.45, 1.9],
      [-3, 2.4, 1.4]
    ].forEach((p, i) => {
      const g = grp(p[0], p[1], p[2], R() * 6);
      g.add(mk(new THREE.CylinderGeometry(0.002, 0.002, H - p[1], 4), new THREE.MeshBasicMaterial({ color: 0x080808 }), 0, (H - p[1]) / 2, 0));
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.38, 0.19),
        new THREE.MeshStandardMaterial({
          map: bm,
          transparent: true,
          alphaTest: 0.5,
          side: 2,
          roughness: 0.9,
          color: 0x222230
        })
      );
      m.userData.id = 'bats_spider';
      m.userData.np = 1;
      g.add(m);
      add(g);
      g.traverse((o) => (o.userData.np = 1));
      bats.push([g, m, i]);
    });
    anim((t) =>
      bats.forEach(([g, m, i]) => {
        g.rotation.z = Math.sin(t * 0.6 + i) * 0.12;
        g.rotation.y += 0.002;
        m.scale.x = 0.9 + 0.15 * Math.sin(t * 1.7 + i * 2);
      })
    );

    const sp = grp(-1.5, 0, 0.25);
    const thr = mk(new THREE.CylinderGeometry(0.0012, 0.0012, 1, 4), new THREE.MeshBasicMaterial({ color: 0xcfcfe0, transparent: true, opacity: 0.5 }));
    sp.add(thr);
    const bd = new THREE.Group();
    const bl = mat({ color: 0x0a0a0c, r: 0.25, m: 0.3 });
    bd.add(
      mk(new THREE.SphereGeometry(0.026, 14, 10), bl, 0, 0, 0.03),
      mk(new THREE.SphereGeometry(0.04, 14, 10), bl, 0, 0.005, -0.025)
    );
    for (let k = 0; k < 8; k++) {
      const s = k < 4 ? 1 : -1;
      const a = (k % 4 - 1.5) * 0.5;
      const leg = mk(
        tube(
          [
            [0, 0, 0],
            [s * 0.05, 0.035, a * 0.06],
            [s * 0.1, -0.01, a * 0.12]
          ],
          0.0035,
          6,
          4
        ),
        bl
      );
      bd.add(leg);
    }
    sp.add(bd);
    sp.userData.id = 'bats_spider';
    sp.traverse((o) => (o.userData.np = 1));
    add(sp, { noShadow: true });
    anim((t) => {
      const y = 2.15 + Math.sin(t * 0.25) * 0.4;
      bd.position.y = y;
      thr.scale.y = H - y;
      thr.position.y = y + (H - y) / 2;
      bd.rotation.y = t * 0.3;
    });
  }

  // 10. Eye-Tracking Victorian Portrait (R1-04 Clue Entry Prop & XB02 Decoy "behind the canvas")
  {
    const g = grp(-0.8, 1.95, -2.965);
    const fr = gold;
    // Carved Baroque Frame with Filigree Moulding
    g.add(
      mk(new THREE.BoxGeometry(0.76, 0.07, 0.05), fr, 0, 0.41, 0),
      mk(new THREE.BoxGeometry(0.76, 0.07, 0.05), fr, 0, -0.41, 0),
      mk(new THREE.BoxGeometry(0.07, 0.88, 0.05), fr, -0.35, 0, 0),
      mk(new THREE.BoxGeometry(0.07, 0.88, 0.05), fr, 0.35, 0, 0),
      // Canvas Backing (XB02 Decoy hint)
      mk(new THREE.PlaneGeometry(0.64, 0.8), mat({ color: 0x3d3222, r: 0.95 }), 0, 0, -0.02, 0, Math.PI, 0)
    );
    g.add(mk(new THREE.PlaneGeometry(0.62, 0.775), mat({ map: TX.portrait(), r: 0.5 }), 0, 0, 0.012));
    // Resident Evil Pupil Tracking: eyes shift inside portrait to stare at player
    const pm = new THREE.MeshBasicMaterial({ color: 0x06080a });
    const ps = [];
    [-1, 1].forEach((s) => {
      const p = mk(new THREE.CircleGeometry(0.0105, 14), pm, s * 0.0638, 0.0647, 0.0135);
      p.userData.np = 1;
      g.add(p);
      ps.push(p);
    });
    const ptHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.1, 0.2),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    g.add(ptHit);
    interact(g, 'portrait');
    add(g);
    anim(() => {
      if (!cam) return;
      const dx = cam.position.x - g.position.x;
      const dy = cam.position.y - g.position.y;
      const dz = cam.position.z - g.position.z;
      const d = Math.hypot(dx, dy, dz) || 1;
      ps.forEach((p, i) => {
        p.position.x = (i ? 1 : -1) * 0.0638 + Math.max(-1, Math.min(1, (dx / d) * 1.6)) * 0.011;
        p.position.y = 0.0647 + Math.max(-1, Math.min(1, (dy / d) * 1.6)) * 0.007;
      });
    });
  }

  // 11. Crooked Victorian Wall Frames (wall_frames decor)
  {
    [
      [1.15, 1.55, 0.28, 0],
      [1.85, 1.45, -0.1, 1],
      [2.5, 1.6, 0.12, 2]
    ].forEach(([z, y, rz, i]) => {
      const g = grp(3.965, y, z, -Math.PI / 2);
      const w = 0.3;
      const h = 0.38;
      g.add(
        mk(new THREE.BoxGeometry(w + 0.06, 0.035, 0.03), gold, 0, h / 2 + 0.015, 0),
        mk(new THREE.BoxGeometry(w + 0.06, 0.035, 0.03), gold, 0, -h / 2 - 0.015, 0),
        mk(new THREE.BoxGeometry(0.035, h, 0.03), gold, -w / 2 - 0.015, 0, 0),
        mk(new THREE.BoxGeometry(0.035, h, 0.03), gold, w / 2 + 0.015, 0, 0),
        mk(new THREE.PlaneGeometry(w, h), mat({ map: TX.photo(i), r: 0.4 }), 0, 0, 0.008)
      );
      g.rotation.z = rz * 0.3;
      g.userData.id = 'wall_frames';
      g.traverse((o) => (o.userData.np = 1));
      add(g);
    });
  }

  // 12. Celestial Astrology Wall Poster (R1-03 Clue Entry Prop)
  {
    const g = grp(0.9, 1.6, -2.975);
    const pt = X.tex(X.posterScene());
    g.add(
      mk(new THREE.BoxGeometry(0.92, 1.32, 0.006), mat({ color: 0x3a3228, r: 1 }), 0, 0, 0),
      mk(new THREE.PlaneGeometry(0.9, 1.3), mat({ map: pt, r: 0.9 }), 0, 0, 0.0035)
    );
    // Taped dog-eared corners
    [
      [-0.4, 0.6, 0.5],
      [0.4, 0.6, -0.5],
      [-0.4, -0.6, -0.5],
      [0.4, -0.6, 0.5]
    ].forEach((c) =>
      g.add(mk(new THREE.BoxGeometry(0.12, 0.04, 0.004), mat({ color: 0xb8aa80, t: 1, o: 0.55, r: 0.6 }), c[0], c[1], 0.006, 0, 0, c[2]))
    );
    interact(g, 'poster');
    add(g);
  }

  // 13. Tall Victorian Grandfather Clock (EB09 Hiding Prop - "behind the clock face")
  {
    const g = grp(2.7, 1.15, -2.93);
    // Tall Floor-standing Grandfather Clock Casing
    g.add(
      // Lower plinth base
      bx(0.68, 0.28, 0.36, ebony, 0, -1.0, 0),
      // Trunk body with glass waist panel
      bx(0.56, 1.3, 0.3, darkWood, 0, -0.22, 0),
      bx(0.04, 1.25, 0.32, ebony, -0.28, -0.22, 0),
      bx(0.04, 1.25, 0.32, ebony, 0.28, -0.22, 0),
      // Glass door aperture for waist
      mk(new THREE.PlaneGeometry(0.38, 0.9), mat({ color: 0x203540, t: 1, o: 0.35, r: 0.1, m: 0.3 }), 0, -0.2, 0.155)
    );

    // Swinging Brass Pendulum (Phasmophobia eerie ticking rhythm)
    const pendGroup = grp(0, 0.45, 0.06);
    pendGroup.add(
      mk(new THREE.CylinderGeometry(0.005, 0.005, 0.72, 8), brass, 0, -0.36, 0),
      mk(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 24), brass, 0, -0.72, 0, Math.PI / 2, 0, 0)
    );
    g.add(pendGroup);

    // Upper Clock Hood & Glass Dial Door
    g.add(
      bx(0.68, 0.68, 0.38, ebony, 0, 0.85, 0),
      // Decorative carved pediment arch on top
      bx(0.72, 0.08, 0.4, darkWood, 0, 1.22, 0),
      mk(new THREE.SphereGeometry(0.04, 14, 10), brass, 0, 1.28, 0.16),
      mk(new THREE.SphereGeometry(0.03, 14, 10), brass, -0.32, 1.25, 0.16),
      mk(new THREE.SphereGeometry(0.03, 14, 10), brass, 0.32, 1.25, 0.16)
    );

    // Dial Face
    const c0 = mk(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 48), mat({ map: TX.clockFace(), r: 0.5 }), 0, 0.85, 0.175);
    c0.rotation.x = Math.PI / 2;
    g.add(c0);
    g.add(mk(new THREE.TorusGeometry(0.25, 0.025, 12, 48), brass, 0, 0.85, 0.185));

    // Hands
    const hands = [0.16, 0.11].map((l) => {
      const p = new THREE.Group();
      p.position.set(0, 0.85, 0.19);
      const hd = mk(new THREE.BoxGeometry(0.012, l, 0.006), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }), 0, l / 2, 0);
      p.add(hd);
      g.add(p);
      return p;
    });

    const clkHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 2.3, 0.45),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    );
    clkHit.position.set(0, 0, 0);
    g.add(clkHit);
    interact(g, 'clock');
    add(g);

    anim((t) => {
      // Swing brass pendulum smoothly at 1 Hz
      pendGroup.rotation.z = Math.sin(t * Math.PI) * 0.18;
      // Clock hands advance
      const d = new Date();
      hands[0].rotation.z = -((d.getMinutes() / 60 + d.getSeconds() / 3600) * Math.PI * 2);
      hands[1].rotation.z = -(((d.getHours() % 12) / 12 + d.getMinutes() / 720) * Math.PI * 2);
    });
  }

  // 14. Ominous Wall Writing Decal & Bloodied Handprints
  {
    const wr = X.writingC("DON'T TURN AROUND", { W: 1024, H: 256, size: 92, seed: 4 });
    const t = X.tex(wr.c);
    document.fonts?.ready?.then?.(() => {
      wr.redraw();
      t.needsUpdate = true;
    });
    S.add(decal(t, 2.6, 0.65, 1.45, 2.05, D / 2 - 0.012, Math.PI, { o: 0.9 }));

    const hp = X.tex(X.handprintC(3));
    [
      [2.0, 1.35, 0.06],
      [2.35, 1.1, -0.1],
      [2.2, 0.75, 0.2]
    ].forEach((a) => S.add(decal(hp, 0.26, 0.39, -W / 2 + 0.012, a[1], a[0], Math.PI / 2, { rz: a[2], o: 0.85 })));

    const bt = TX.bat();
    for (let i = 0; i < 8; i++) {
      const m = decal(bt, 0.24 + R() * 0.1, 0.12 + R() * 0.05, W / 2 - 0.012, 1.9 + R() * 0.55 + (i % 2) * 0.1, 0.55 + i * 0.3, -Math.PI / 2, {
        rz: (R() - 0.5) * 0.8
      });
      m.material.color.set(0x15121c);
      m.material.opacity = 0.95;
      S.add(m);
    }
  }

  // 15. Cold Paranormal Floating Dust & Breath Motes (Phasmophobia feel)
  {
    const n = 280;
    const p = [];
    for (let i = 0; i < n; i++) {
      p.push(-W / 2 + R() * W * 0.85, 0.2 + R() * (H - 0.3), -D / 2 + R() * D);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    const pts = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        size: 0.038,
        map: TX.dust(),
        color: 0xcdbfff,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    S.add(pts);
    anim((t, dt) => {
      const a = g.attributes.position;
      for (let i = 0; i < a.count; i++) {
        a.setY(i, (a.getY(i) + dt * 0.025 - 0.2 + H) % (H - 0.2) + 0.2);
        a.setX(i, a.getX(i) + Math.sin(t * 0.4 + i) * 0.0006);
      }
      a.needsUpdate = true;
    });
  }

  // 16. Night Window Backdrop & Moonlit Trees
  if (win) {
    const sk = X.pix(256, 256, (u, v, o) => {
      const c = X.fbm(u, v, 5, 3, 5, 4);
      const h = Math.pow(v, 1.6);
      o[0] = 10 + h * 38 + c * 14;
      o[1] = 12 + h * 26 + c * 10;
      o[2] = 40 + h * 52 + c * 18;
    });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(70, 34), new THREE.MeshBasicMaterial({ map: X.tex(sk), fog: false }));
    sky.position.set(-24, 9, -1);
    sky.rotation.y = Math.PI / 2;
    sky.userData.np = 1;
    S.add(sky);

    const gr = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ color: 0x04050c, fog: false }));
    gr.rotation.x = -Math.PI / 2;
    gr.position.set(-40, -0.3, 0);
    gr.userData.np = 1;
    S.add(gr);

    const mc = X.pix(256, 256, (u, v, o) => {
      const d = Math.hypot(u - 0.5, v - 0.5) * 2;
      const cr = X.fbm(u, v, 8, 8, 4, 2);
      const k = d < 1 ? 0.85 + 0.15 * cr : 0;
      o[0] = 232 * k;
      o[1] = 238 * k;
      o[2] = 255 * k;
      o[3] = d < 1 ? 255 : 0;
    });
    const moon = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: X.tex(mc), transparent: true, fog: false }));
    moon.position.set(-22, 8.5, -4);
    moon.rotation.y = Math.PI / 2;
    moon.userData.np = 1;
    S.add(moon);

    const mh = spr(TX.glow('v'), 14, 0.55);
    mh.position.set(-21.5, 8.5, -4);
    S.add(mh);

    const sp = [];
    for (let i = 0; i < 220; i++) {
      sp.push(-23.5, R() * 17, -30 + R() * 60);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    S.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.12, color: 0xffffff, fog: false })));

    const bm = new THREE.MeshBasicMaterial({ color: 0x020205, fog: false });
    const cyl = new THREE.CylinderGeometry(0.5, 1, 1, 6);
    cyl.translate(0, 0.5, 0);
    const treeGeos = [];
    const limb = (p, d, len, r, dep) => {
      const g = cyl.clone();
      g.scale(r, len, r);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      g.applyQuaternion(q);
      g.translate(p.x, p.y, p.z);
      treeGeos.push(g);
      if (dep <= 0) return;
      const e = p.clone().addScaledVector(d.clone().normalize(), len);
      for (let k = 0; k < 2 + (R() < 0.3 ? 1 : 0); k++) {
        const nd = d.clone().add(new THREE.Vector3((R() - 0.5) * 1.1, 0.25 + R() * 0.3, (R() - 0.5) * 1.1)).normalize();
        limb(e, nd, len * (0.68 + R() * 0.1), r * 0.68, dep - 1);
      }
    };
    [
      [-14, -5, 5, 0.5],
      [-17, 3, 6.5, 0.6],
      [-13, 7, 4.5, 0.4],
      [-19, -9, 7, 0.7],
      [-16, 12, 6, 0.5],
      [-12, -1.5, 3.5, 0.3]
    ].forEach(([x, z, h, r]) => {
      limb(new THREE.Vector3(x, -0.3, z), new THREE.Vector3((R() - 0.5) * 0.2, 1, (R() - 0.5) * 0.2), h * 0.38, r, 4);
    });
    if (treeGeos.length) {
      const mg = BufferGeometryUtils.mergeGeometries(treeGeos);
      const tm = new THREE.Mesh(mg, bm);
      tm.userData.np = 1;
      tm.userData.ns = 1;
      S.add(tm);
    }

    const ob = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: TX.bat(), transparent: true, fog: false, side: 2 }));
      b.rotation.y = Math.PI / 2;
      b.userData.np = 1;
      S.add(b);
      ob.push([b, i]);
    }
    anim((t) =>
      ob.forEach(([b, i]) => {
        const a = t * 0.18 + i * 1.1;
        b.position.set(-21, 8 + Math.sin(a * 3 + i) * 1.3, -4 + Math.cos(a) * 7);
        b.scale.x = 0.7 + 0.45 * Math.abs(Math.sin(t * 9 + i));
      })
    );

    const ms = spr(X.tex(X.radial([[0, 'rgba(120,130,200,.5)'], [1, 'rgba(120,130,200,0)']], 128)), 22, 0.28);
    ms.position.set(-12, 0.4, -1);
    S.add(ms);
  }
}

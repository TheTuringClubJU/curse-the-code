// Decor: rug, beams, lights, pumpkins, candles, bats, spider, webs, portrait, frames, poster, clock, decals, light shafts, outside view.
import { THREE, X, TX, RoundedBoxGeometry, BufferGeometryUtils, mat, wm, lathe, bgeo, tube } from './kit.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { mk, grp, buildDoll, pumpkinMesh } from './scene.js'
const spr = (map, sc, op = 1, blend = true) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, opacity: op, depthWrite: false, fog: false, blending: blend ? THREE.AdditiveBlending : THREE.NormalBlending })); s.scale.set(sc, sc, 1); s.userData.np = 1; s.userData.ns = 1; return s }
const decal = (map, w, h, x, y, z, ry, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: o.r ?? .88, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveMap: o.em ?? null, emissiveIntensity: o.ei ?? 0, polygonOffset: true, polygonOffsetFactor: o.pf ?? -2, opacity: o.o ?? 1 })); m.position.set(x, y, z); m.rotation.set(o.rx || 0, ry, o.rz || 0); m.userData.np = 1; m.userData.ns = 1; return m }

// Central Gothic Ritual Altar & Glowing Octagram/Pentagram Circle (imitating reference image)
export function buildGothicRitualAltar(E, { x = 0, z = 0, y = .009, radius = 1.55, seed = 1, addPointLight = true } = {}) {
  const S = E.S, add = E.add || (o => S.add(o)), anim = E.anim || (() => { }), R = X.rng(seed * 31 + 7)
  const g = grp(x, y, z)
  const raTex = TX.ritualAltar(seed)
  // Main glowing ritual circle & star on the floor
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({
      map: raTex, emissive: 0xffbe78, emissiveMap: raTex, emissiveIntensity: .68,
      transparent: true, depthWrite: false, roughness: .92, polygonOffset: true, polygonOffsetFactor: -3
    })
  )
  disc.rotation.x = -Math.PI / 2; disc.userData.np = 1; disc.userData.ns = 1; g.add(disc)

  // Inner sacrificial blood pool & secondary blood puddle (like reference image)
  const bpTex = TX.bloodPool(seed)
  const pool1 = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * .48, radius * .48),
    new THREE.MeshStandardMaterial({ map: bpTex, transparent: true, depthWrite: false, roughness: .25, metalness: .15, polygonOffset: true, polygonOffsetFactor: -4, opacity: .92 })
  )
  pool1.rotation.x = -Math.PI / 2; pool1.position.set(-radius * .16, .002, -radius * .18); pool1.userData.np = 1; pool1.userData.ns = 1; g.add(pool1)

  // Central dark sacrificial altar basin / chalice in the middle of the inner circle
  const ironMat = mat({ color: 0x140e10, r: .42, m: .75 })
  const bloodLiquidMat = mat({ color: 0x5a0306, e: 0x320103, ei: .6, r: .15, m: .1 })
  const basin = grp(0, 0, 0)
  basin.add(
    mk(new THREE.CylinderGeometry(.15, .11, .11, 24), ironMat, 0, .055, 0),
    mk(new THREE.TorusGeometry(.15, .014, 10, 24), ironMat, 0, .11, 0, Math.PI / 2, 0, 0),
    mk(new THREE.CylinderGeometry(.138, .138, .01, 20), bloodLiquidMat, 0, .102, 0)
  )
  // Ritual dark glass bottle / vial beside the central bowl (matching reference image)
  const bottleMat = mat({ color: 0x22080a, r: .2, m: .2 })
  basin.add(
    mk(new THREE.CylinderGeometry(.032, .036, .11, 14), bottleMat, .17, .055, -.05),
    mk(new THREE.CylinderGeometry(.014, .022, .04, 12), bottleMat, .17, .12, -.05),
    mk(new THREE.CylinderGeometry(.016, .016, .018, 10), mat({ color: 0x8a1216, r: .6 }), .17, .142, -.05)
  )
  // Sacrificial blood-stained skull at inner ring edge
  const boneMat = mat({ map: TX.bone(), bump: TX.bone(), bs: .3, r: .75, c: 0xcabaa0 })
  const sk = grp(-.18, .045, .14, .6)
  sk.add(
    mk(new THREE.SphereGeometry(.048, 14, 12), boneMat, 0, .015, 0),
    mk(new THREE.BoxGeometry(.046, .032, .045), boneMat, 0, -.018, .022),
    mk(new THREE.SphereGeometry(.013, 8, 8), new THREE.MeshBasicMaterial({ color: 0x090203 }), -.017, .018, .038),
    mk(new THREE.SphereGeometry(.013, 8, 8), new THREE.MeshBasicMaterial({ color: 0x090203 }), .017, .018, .038)
  )
  basin.add(sk)
  basin.traverse(o => { o.userData.np = 1 }); g.add(basin)

  // 8 lit pillar candles around the 8 vertices of the star
  const waxMat = mat({ color: 0xe2d8c0, r: .52, e: 0x2a1808, ei: .38 })
  const candleFlames = []
  const N = 8, cRad = radius * .885
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2 - Math.PI / 2
    const cx = Math.cos(a) * cRad, cz = Math.sin(a) * cRad, ch = .11 + (i % 3) * .03 + R() * .03
    const cg = grp(cx, 0, cz)
    cg.add(
      mk(new THREE.CylinderGeometry(.024, .028, ch, 14), waxMat, 0, ch / 2, 0),
      mk(new THREE.CylinderGeometry(.038, .032, .016, 14), waxMat, 0, .008, 0)
    )
    const fl = spr(TX.flame(), .075, 1)
    fl.material.depthWrite = false; fl.position.set(0, ch + .05, 0); cg.add(fl)
    const gl = spr(TX.glow('o'), .48, .65)
    gl.position.set(0, ch + .04, 0); cg.add(gl)
    cg.traverse(o => { o.userData.np = 1 }); g.add(cg)
    candleFlames.push({ fl, gl, sd: 70 + seed * 11 + i })
  }
  add(g)

  // Warm eerie flickering candlelight illuminating the center of the room
  let altarLight = null
  if (addPointLight && S) {
    altarLight = new THREE.PointLight(0xff8e36, 2.8, 6.2, 1.8)
    altarLight.position.set(x, y + .55, z)
    S.add(altarLight)
  }
  anim(t => {
    const ls = E.lightScale ? E.lightScale() : 1
    candleFlames.forEach(({ fl, gl, sd }) => {
      const q = (E.flick ? E.flick(sd, .42)(t) : (.85 + .15 * Math.sin(t * 7 + sd))) * ls
      fl.scale.set(.055 * (.88 + .24 * q), .125 * (.85 + .32 * q), 1)
      gl.material.opacity = .52 * q
    })
    if (altarLight) {
      const fq = E.flick ? E.flick(seed * 19 + 3, .32)(t) : (.88 + .12 * Math.sin(t * 5.3))
      altarLight.intensity = 2.8 * fq * ls
    }
  })
  return g
}

// Aged Gothic Wall Arches, Blood Splatters, Floor Blood Spots & Vicious Claw Marks
export function buildRoomBloodAndClaws(E, { W = 8, H = 3, D = 6, seed = 1, gothicArches = true } = {}) {
  const S = E.S; if (!S) return
  const R = X.rng(seed * 53 + 9), hw = W / 2 - .014, hd = D / 2 - .014

  // 1. Gothic Pointed Arch & Stone Decay overlays on the 4 walls
  if (gothicArches) {
    const ga1 = TX.gothicArch(seed), ga2 = TX.gothicArch(seed + 1)
      ;[[-W * .26, H * .5, -hd, 0], [W * .26, H * .5, -hd, 0], [-W * .26, H * .5, hd, Math.PI], [W * .26, H * .5, hd, Math.PI]].forEach(([x, y, z, ry], i) => {
        S.add(decal(i % 2 ? ga1 : ga2, W * .44, H * .92, x, y, z, ry, { o: .78, pf: -1 }))
      })
      ;[[-hw, H * .5, -D * .24, Math.PI / 2], [-hw, H * .5, D * .24, Math.PI / 2], [hw, H * .5, -D * .24, -Math.PI / 2], [hw, H * .5, D * .24, -Math.PI / 2]].forEach(([x, y, z, ry], i) => {
        S.add(decal(i % 2 ? ga2 : ga1, D * .44, H * .92, x, y, z, ry, { o: .78, pf: -1 }))
      })
  }

  // 2. Visceral Blood Splatters & Drips all around the 4 walls
  const wallPlacements = [
    // North wall (z = -hd)
    [-W * .32, 1.65, -hd, 0, 1.25, 1.25], [0, 2.1, -hd, 0, 1.4, 1.3], [W * .28, 1.35, -hd, 0, 1.15, 1.2],
    // South wall (z = +hd)
    [-W * .28, 1.55, hd, Math.PI, 1.3, 1.25], [W * .22, 1.8, hd, Math.PI, 1.2, 1.3],
    // West wall (x = -hw)
    [-hw, 1.6, -D * .28, Math.PI / 2, 1.25, 1.25], [-hw, 1.3, D * .22, Math.PI / 2, 1.35, 1.25],
    // East wall (x = +hw)
    [hw, 1.7, -D * .22, -Math.PI / 2, 1.3, 1.25], [hw, 1.25, D * .28, -Math.PI / 2, 1.2, 1.2]
  ]
  wallPlacements.forEach(([x, y, z, ry, w, h], i) => {
    const btex = TX.bloodWall((seed + i) % 4 + 1)
    S.add(decal(btex, w, h, x, y, z, ry, { o: .88, rz: (R() - .5) * .25, pf: -3 }))
  })

  // 3. Vicious Demon Claw / Scratch Marks gouged into the walls
  const clawPlacements = [
    [-W * .15, 1.5, -hd + .002, 0, .95, .95, -.18],
    [W * .34, 1.75, -hd + .002, 0, .85, .85, .22],
    [-W * .32, 1.45, hd - .002, Math.PI, .9, .9, .15],
    [W * .14, 1.6, hd - .002, Math.PI, 1.0, 1.0, -.12],
    [-hw + .002, 1.55, 0, Math.PI / 2, .95, .95, .18],
    [-hw + .002, 1.8, -D * .34, Math.PI / 2, .8, .8, -.24],
    [hw - .002, 1.5, -D * .05, -Math.PI / 2, .95, .95, -.16],
    [hw - .002, 1.75, D * .32, -Math.PI / 2, .85, .85, .2]
  ]
  clawPlacements.forEach(([x, y, z, ry, w, h, rz], i) => {
    const ctex = TX.clawMarks((seed + i) % 4 + 1)
    S.add(decal(ctex, w, h, x, y, z, ry, { o: .94, rz, pf: -4 }))
  })

  // 4. Bloody Handprints smeared on walls
  const hpPlacements = [
    [-W * .38, 1.25, -hd + .003, 0, -.12], [W * .38, 1.15, hd - .003, Math.PI, .18],
    [-hw + .003, 1.35, D * .36, Math.PI / 2, .08], [hw - .003, 1.4, -D * .36, -Math.PI / 2, -.15]
  ]
  hpPlacements.forEach(([x, y, z, ry, rz], i) => {
    S.add(decal(TX.handprint((seed + i) % 3 + 1), .32, .48, x, y, z, ry, { o: .88, rz, pf: -4 }))
  })

  // 5. Blood Spots, Puddles & Claw Gouges on the Floor
  for (let i = 0; i < 9; i++) {
    const fx = (R() - .5) * (W - 1.4), fz = (R() - .5) * (D - 1.4), sz = .65 + R() * .85
    const bfloor = decal(TX.bloodPool((seed + i) % 4 + 1), sz, sz, fx, .005 + (i * .0003), fz, 0, { rx: -Math.PI / 2, rz: R() * 6.28, o: .85, r: .22, m: .12, pf: -2 })
    S.add(bfloor)
  }
  for (let i = 0; i < 4; i++) {
    const fx = (R() - .5) * (W - 1.8), fz = (R() - .5) * (D - 1.8), sz = .7 + R() * .4
    const cfloor = decal(TX.clawMarks((seed + i) % 4 + 1), sz, sz, fx, .007, fz, 0, { rx: -Math.PI / 2, rz: R() * 6.28, o: .88, pf: -3 })
    S.add(cfloor)
  }
}
export function buildDecor(E) {
  const { S, add, anim, interact, cam, W, H, D } = E, R = X.rng(12), gold = mat({ map: TX.metal(), m: .7, r: .45, c: 0xe0b878 }), brass = mat({ map: TX.brass(), m: .85, r: .4, c: 0xd8b070 })

  // Portrait (R1-04 + XB02): aligned flush onto the GLB's own antique monochrome portrait at (-1.45, 2.05, -2.95)
  // Procedural purple portrait & eyes hide automatically once abandoned_mansion_bedroom.glb loads (zero overlap!).
  {
    const g = grp(-1.45, 2.05, -2.95)
    const procVis = new THREE.Group()
    const fr = gold
    procVis.add(mk(new THREE.BoxGeometry(.74, .06, .05), fr, 0, .4, 0), mk(new THREE.BoxGeometry(.74, .06, .05), fr, 0, -.4, 0), mk(new THREE.BoxGeometry(.06, .86, .05), fr, -.34, 0, 0), mk(new THREE.BoxGeometry(.06, .86, .05), fr, .34, 0, 0))
    procVis.add(mk(new THREE.PlaneGeometry(.62, .775), mat({ map: TX.portrait(), r: .55 }), 0, 0, .012))
    const pm = new THREE.MeshBasicMaterial({ color: 0x06080a }), ps = [];[-1, 1].forEach(s => { const p = mk(new THREE.CircleGeometry(.0105, 14), pm, s * .0638, .0647, .0135); p.userData.np = 1; procVis.add(p); ps.push(p) })
      ; (E.ref.procVisuals ??= []).push(procVis)
    g.add(procVis)
    // Real dusty glass glaze over the GLB's antique portrait frame so raycasting hits cleanly without obscuring the photo
    const glassGlaze = mk(new THREE.PlaneGeometry(1.12, 0.72), mat({ color: 0x100c14, t: true, o: 0.06, r: 0.25, m: 0.1 }), 0, 0, 0.015)
    glassGlaze.castShadow = false; g.add(glassGlaze)
    interact(g, 'portrait'); add(g)
    anim(() => { if (!procVis.visible) return; const dx = cam.position.x - g.position.x, dy = cam.position.y - g.position.y, dz = cam.position.z - g.position.z, d = Math.hypot(dx, dy, dz) || 1; ps.forEach((p, i) => { p.position.x = (i ? 1 : -1) * .0638 + Math.max(-1, Math.min(1, dx / d * 1.6)) * .011; p.position.y = .0647 + Math.max(-1, Math.min(1, dy / d * 1.6)) * .007 }) })
  }

  // Bonnie Poster (R1-03): mounted on the BARE South-East floral wallpaper wall at (2.35, 1.75, 2.98), clear of all paintings & bookshelf
  {
    const g = grp(2.35, 1.75, 2.98, 0)
    const fallback = mk(new THREE.BoxGeometry(0.66, 0.82, 0.018), mat({ color: 0x1a1412, r: 0.88, m: 0.05 }), 0, 0, 0)
    fallback.rotation.z = -0.025
    g.add(fallback)
    interact(g, 'poster'); add(g)
    if (E.loadGLB) {
      E.loadGLB('/assets/models/bedroom/bonnie_poster.glb').then(gltf => {
        const model = gltf.scene
        model.updateMatrixWorld(true)
        const b = new THREE.Box3().setFromObject(model)
        const ctr = b.getCenter(new THREE.Vector3())
        const norm = new THREE.Group()
        model.position.set(-ctr.x, -ctr.y, -ctr.z)
        norm.add(model)
        // Post-opt bonnie_poster.glb has UP=(-1,0,0) and FRONT=(0,1,0); (-PI/2, +PI/2, 0) XYZ faces North (-Z) upright into the room
        norm.rotation.set(-Math.PI / 2, Math.PI / 2, 0)
        norm.scale.setScalar(0.22)
        norm.traverse(c => {
          if (!c.isMesh) return
          c.castShadow = true; c.receiveShadow = true
          const mats = Array.isArray(c.material) ? c.material : [c.material]
          mats.forEach(m => { if (m?.color) { m.color.multiplyScalar(0.68); m.roughness = Math.max(m.roughness ?? 0.8, 0.82); m.needsUpdate = true } })
          c.updateMatrix(); c.matrixAutoUpdate = false
        })
        const holder = grp(2.35, 1.75, 2.94, 0)
        holder.add(norm)
        holder.updateMatrix(); holder.matrixAutoUpdate = false
        interact(holder, 'poster')
        E.visualInteract?.(holder, 'poster')
        add(holder)
        g.visible = false
        g.traverse(o => {
          o.visible = false; o.userData.np = 1; delete o.userData.id
          if (E._pick) { const i = E._pick.indexOf(o); if (i !== -1) E._pick.splice(i, 1) }
          if (E._byId) { Object.values(E._byId).forEach(arr => { const j = arr.indexOf(o); if (j !== -1) arr.splice(j, 1) }) }
        })
        E?.bakeShadows?.()
      }).catch(() => { })
    }
  }

  // Torsion Pendulum Clock (EB09) resting flat on GLB South sideboard cabinet facing North into the room
  {
    const darkWood = wm('ebony')
    const g = grp(-1.35, 1.08, 2.50, Math.PI)
    const c0 = mk(new THREE.CylinderGeometry(.14, .14, .04, 36), [mat({ color: 0x2a1a12, r: .6 }), mat({ map: TX.clockFace(), r: .5 }), mat({ color: 0x2a1a12, r: .6 })], 0, .20, .02)
    c0.rotation.x = Math.PI / 2
    c0.rotation.y = Math.PI
    const clkHit = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.48, 0.35), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }))
    clkHit.position.set(0, 0.20, 0); clkHit.castShadow = false; clkHit.userData.ns = 1
    g.add(c0, clkHit, mk(new THREE.TorusGeometry(.145, .016, 10, 36), brass, 0, .20, .04), mk(new THREE.CylinderGeometry(.15, .16, .04, 24), darkWood, 0, .02, 0))
    const hands = [.10, .07].map(l => {
      const p = new THREE.Group()
      p.position.set(0, .20, .05)
      const hd = mk(new THREE.BoxGeometry(.009, l, .004), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }), 0, l / 2, 0)
      p.add(hd)
      g.add(p)
      return p
    })
    interact(g, 'clock')
    add(g)
    anim(() => {
      if (!g.visible) return
      const d = new Date()
      hands[0].rotation.z = -(d.getMinutes() / 60 + d.getSeconds() / 3600) * Math.PI * 2
      hands[1].rotation.z = -((d.getHours() % 12) / 12 + d.getMinutes() / 720) * Math.PI * 2
    })

    if (typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
      const clockUrl = '/assets/models/bedroom/torsion_pendulum_clock_-_animation.glb'
      const onClockLoaded = gltf => {
        if (!gltf?.scene) return
        const clockModel = gltf.scene
        clockModel.name = 'torsion_pendulum_clock'
        clockModel.traverse(o => {
          if (!o.isMesh) return
          o.castShadow = true
          o.receiveShadow = true
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach(m => {
            if (!m) return
            if (m.name === 'Basic_Glass' || (m.transmission !== undefined && m.transmission > 0)) {
              m.transparent = true
              m.opacity = 0.30
              m.roughness = 0.08
              m.metalness = 0.05
              m.depthWrite = false
              m.side = THREE.DoubleSide
            } else if (m.name === 'Gold') {
              m.metalness = 0.88
              m.roughness = 0.32
              m.side = THREE.DoubleSide
            }
          })
        })
        clockModel.scale.setScalar(1.45)
        clockModel.position.set(-1.35, 1.08, 2.50)
        clockModel.rotation.set(0, Math.PI, 0)
        interact(clockModel, 'clock')
        add(clockModel)

        g.visible = false
        g.traverse(o => {
          o.visible = false
          o.userData.np = 1
        })

        if (gltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(clockModel)
          const action = mixer.clipAction(gltf.animations[0])
          action.play()
          anim((t, dt) => mixer.update(dt || 0.016))
        }
        E?.bakeShadows?.()
      }
      if (typeof E.loadGLB === 'function') {
        E.loadGLB(clockUrl).then(onClockLoaded).catch(err => console.warn('[BEDROOM CLOCK GLB FALLBACK ACTIVE]', err))
      } else {
        const readyP = typeof MeshoptDecoder !== 'undefined' && MeshoptDecoder.ready ? MeshoptDecoder.ready : Promise.resolve()
        readyP.then(() => {
          const loader = new GLTFLoader()
          if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder)
          loader.load(clockUrl, onClockLoaded, undefined, err => console.warn('[BEDROOM CLOCK GLB FALLBACK ACTIVE]', err))
        }).catch(err => console.warn('[BEDROOM CLOCK GLB FALLBACK ACTIVE]', err))
      }
    }
  }

  // Dim floating dust motes in the darkness
  {
    const n = 200, p = []; for (let i = 0; i < n; i++)p.push(-W / 2 + R() * W * .85, .2 + R() * (H - .3), -D / 2 + R() * D * .85); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .032, map: TX.dust(), color: 0x9b8ec4, transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending })); S.add(pts)
    anim((t, dt) => { const a = g.attributes.position; for (let i = 0; i < a.count; i++) { a.setY(i, (a.getY(i) + dt * .025 - .2 + H) % (H - .2) + .2); a.setX(i, a.getX(i) + Math.sin(t * .4 + i) * .0006) } a.needsUpdate = true })
  }
}






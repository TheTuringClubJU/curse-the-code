// Haunted bedroom: GLB shell integration (abandoned_mansion_bedroom.glb) + clean story props, dark atmosphere & aligned collisions.
import { THREE, X, TX, RoundedBoxGeometry, mat, wm, lathe, bgeo, curtainGeo, tube, drapeGeo } from './kit.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { buildDecor } from './decor.js'
export const mk = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o }
export const grp = (x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; return g }
const bx = (w, h, d, m, x, y, z, o = {}) => { const q = mk(bgeo(w, h, d, o.s ?? 1.4, o.vert), m, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0); return q }
const rb = (w, h, d, r, m, x, y, z, seg = 2) => mk(new RoundedBoxGeometry(w, h, d, seg, r), m, x, y, z)
const hitbox = (w, h, d, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); m.position.set(x, y, z); m.castShadow = false; m.userData.ns = 1; m.userData._isHitbox = true; return m }

export function buildBedroom(E) {
    const { S, add, solid, anim, interact, W, H, D, win, ref } = E
    // Enforce pitch-dark horror atmosphere (~10% ambient brightness; flashlight is primary light source)
    if (S) {
        S.background = new THREE.Color(0x020105)
        S.fog = new THREE.FogExp2(0x020105, 0.115)
        S.traverse((o) => {
            if (o.isHemisphereLight) o.intensity = 0.02
            if (o.isDirectionalLight) o.intensity = 0.04
        })
    }
    if (E.flashlight) {
        E.flashlight.angle = Math.PI / 7.2
        E.flashlight.penumbra = 0.48
        E.flashlight.distance = 18.0
        E.flashlight.decay = 1.42
        E._flashBaseIntensity = 28.0
        E.flashlight.intensity = 28.0

        // Randomized stochastic flashlight flicker generator (unpredictable non-sequential timing & varied intensity)
        let nextBurstAt = 1.2 + Math.random() * 2.2
        let burstUntil = 0
        let burstType = 0 // 0: deep brownout dip, 1: erratic multi-stutter, 2: chaotic electrical spark, 3: minor voltage sag
        let burstFloor = 0.08
        let burstSubPulse = 0

        anim((t) => {
            if (!E.flashlight || E._userFlashlightOn === false || E._flashOutageActive) return

            // Schedule next burst with unpredictable randomized intervals (never periodic/sequential)
            if (t >= nextBurstAt) {
                const dur = 0.10 + Math.random() * 0.34 // 100ms - 440ms randomized duration
                burstUntil = t + dur
                burstType = Math.floor(Math.random() * 4)
                // Random intensity floor for this specific burst: varies between near-blackout (0.02) and dim (0.35)
                burstFloor = 0.02 + Math.random() * 0.33
                burstSubPulse = 0
                // Next burst delay is completely randomized: 0.85s to 4.2s (never sequential/periodic)
                nextBurstAt = t + dur + 0.85 + Math.random() * 3.35
            }

            const base = E._flashBaseIntensity || 28.0
            let factor = 1.0

            if (t < burstUntil) {
                // Inside randomized flicker burst: intensity dynamically varies and spikes stochastically
                const r = Math.random()
                if (burstType === 0) {
                    // Deep brownout: drops deep down, with occasional erratic 1-frame micro-spark
                    factor = r > 0.82 ? (burstFloor + Math.random() * 0.45) : (burstFloor + r * 0.06)
                } else if (burstType === 1) {
                    // Multi-stutter: rapid stochastic oscillation between low and moderate intensity
                    burstSubPulse += 1
                    factor = (burstSubPulse % 2 === 0) ? (burstFloor + Math.random() * 0.12) : (0.45 + Math.random() * 0.45)
                } else if (burstType === 2) {
                    // Chaotic electrical spasm: completely irregular noise
                    factor = r > 0.5 ? (burstFloor + Math.random() * 0.2) : (0.55 + Math.random() * 0.42)
                } else {
                    // Minor voltage sag / soft flicker
                    factor = 0.52 + Math.random() * 0.35
                }
            } else {
                // Organic idle filament micro-tremor (stochastic noise, non-periodic)
                factor = 0.96 + (Math.random() - 0.5) * 0.06
            }

            const intensity = Math.max(0.6, base * factor)
            E.flashlight.intensity = intensity
            if (E._flashLensMat) {
                E._flashLensMat.emissiveIntensity = Math.max(0.12, 2.2 * (intensity / base))
            }
        })
    }

    // Snapshot procedural room shell created in engine.js so it can be hidden once GLB shell loads
    const procShell = S ? S.children.filter(o => o.isMesh) : []
    const procFurnitureVisuals = []
    const retireOnGLB = []
    const trackVisual = (obj) => { procFurnitureVisuals.push(obj); return obj }
    const retireObj = (obj) => {
        if (!obj) return
        obj.visible = false
        obj.traverse((o) => {
            o.visible = false
            o.userData.np = 1
            delete o.userData.id
            if (E._pick) {
                const idx = E._pick.indexOf(o)
                if (idx !== -1) E._pick.splice(idx, 1)
            }
            if (E._byId) {
                Object.values(E._byId).forEach((arr) => {
                    const j = arr.indexOf(o)
                    if (j !== -1) arr.splice(j, 1)
                })
            }
        })
    }

    const dark = wm('dark'), worn = wm('worn'), ebony = wm('ebony'), brass = mat({ map: TX.brass(), m: .85, r: .4, c: 0xd8b070 }), gold = mat({ map: TX.metal(), m: .7, r: .45, c: 0xe0b878 })
    const post = (g, x, z, h) => { const L = lathe([[.0, 0], [.05, 0], [.052, .08], [.034, .13], [.04, .24], [.056, .34], [.034, .43], [.034, h - .2], [.052, h - .12], [.06, h - .06], [.034, h - .02], [.0, h]]); const m = mk(L, dark, x, 0, z); g.add(m); g.add(mk(new THREE.SphereGeometry(.05, 16, 12), dark, x, h + .03, z)) }

    // 1. Four-poster bed (GLB North-Center X:[-0.20, 1.85], Z:[-2.85, 0.15]) + pillow + diary on mattress
    {
        const g = grp(0.82, 0, -1.35)
        const vis = new THREE.Group()
        vis.add(bx(.07, .22, 2.7, dark, -.97, .36, 0), bx(.07, .22, 2.7, dark, .97, .36, 0), bx(1.94, .2, .07, dark, 0, .36, 1.37), bx(1.94, .2, .07, dark, 0, .36, -1.37))
        post(vis, -.97, -1.37, 1.55); post(vis, .97, -1.37, 1.55); post(vis, -.97, 1.37, 1.02); post(vis, .97, 1.37, 1.02)
        const sh = new THREE.Shape(); sh.moveTo(-.9, 0); sh.lineTo(.9, 0); sh.lineTo(.9, .62); sh.bezierCurveTo(.9, .82, .45, .9, 0, .98); sh.bezierCurveTo(-.45, .9, -.9, .82, -.9, .62); sh.closePath()
        vis.add(mk(new THREE.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 2 }), dark, 0, .5, -1.4))
        const sh2 = new THREE.Shape(); sh2.moveTo(-.7, 0); sh2.lineTo(.7, 0); sh2.lineTo(.7, .5); sh2.bezierCurveTo(.7, .64, .34, .7, 0, .74); sh2.bezierCurveTo(-.34, .7, -.7, .64, -.7, .5); sh2.closePath()
        vis.add(mk(new THREE.ExtrudeGeometry(sh2, { depth: .02, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 2 }), ebony, 0, .62, -1.36))
        vis.add(bx(1.88, .34, .05, dark, 0, .64, 1.4), bx(1.9, .05, .08, ebony, 0, .83, 1.4))
        vis.add(rb(1.84, .21, 2.64, .06, mat({ map: TX.sheet2(), r: .95 }), 0, .58, 0))
        vis.add(mk(drapeGeo(1.84, 1.95, .38, 3), mat({ map: TX.quilt(), r: .98, side: THREE.DoubleSide }), 0, .7, .42))
        g.add(trackVisual(vis))
        g.add(hitbox(2.1, 1.1, 3.0, 0, 0.55, 0))
        interact(g, 'bed'); add(g); solid(-0.22, 1.85, -2.90, 0.12)

        // Pillow (EB08) at head of GLB bed
        const pilGrp = grp(0.82, 0.98, -2.35)
        const pilVis = new THREE.Group()
            ;[[-.34, 0, .08], [.34, 0, -.1]].forEach(p => { const pl = rb(.6, .17, .4, .07, mat({ map: TX.sheet(), r: .95 }), p[0], 0, p[1], 5); pl.rotation.y = p[2]; pl.scale.set(1, .9, 1); pilVis.add(pl) })
        pilGrp.add(trackVisual(pilVis))
        pilGrp.add(hitbox(1.7, 0.45, 0.95, 0, 0.05, 0))
        interact(pilGrp, 'pillow'); add(pilGrp)

        // Diary (R1-01 - Clue 1) lying flat on center of GLB bed mattress
        const dg = grp(0.82, 0.82, -1.25, .25), lc = mat({ map: TX.leather('red'), r: .75 }), L = X.tex(X.paperPage(['Dad has been sleeping at his desk.'], 'Test day 1')), R2 = X.tex(X.paperPage(['Rex turned 5 today. This is test page two.'], 'Test day 2'))
        dg.add(rb(.5, .03, .34, .006, lc, 0, 0, 0, 2), mk(new THREE.BoxGeometry(.012, .034, .34), mat({ map: TX.leather('red'), r: .65 }), 0, .003, 0))
            ;[[-1, L], [1, R2]].forEach(([s, t]) => { const p = mk(new THREE.PlaneGeometry(.225, .315), mat({ map: t, r: .95 }), s * .118, .0285, 0, -Math.PI / 2, 0, -s * .05); dg.add(p); dg.add(mk(new THREE.BoxGeometry(.225, .014, .315), mat({ color: 0xcfc4a6, r: 1 }), s * .118, .02, 0, 0, 0, -s * .05)) })
        dg.add(mk(new THREE.BoxGeometry(.012, .002, .3), mat({ color: 0x7a1212, r: .6 }), .01, .034, .02))
        dg.add(hitbox(0.55, 0.25, 0.45, 0, 0.05, 0))
        interact(dg, 'diary'); add(dg)
    }

    // 2. Nightstand (GLB bedside table left of bed at (-0.85, 0, -2.45)) + musicbox, candle, photo_frame & GLB lamp
    {
        const g = grp(-0.85, 0, -2.45)
        const vis = new THREE.Group()
            ;[[-.28, -.19], [.28, -.19], [-.28, .19], [.28, .19]].forEach(p => vis.add(bx(.05, .14, .05, dark, p[0], .07, p[1], { vert: true })))
        vis.add(bx(.6, .5, .42, worn, 0, .39, 0), bx(.68, .04, .5, dark, 0, .66, 0), bx(.52, .17, .02, dark, 0, .52, .215), bx(.52, .21, .02, dark, 0, .27, .215), mk(new THREE.SphereGeometry(.02, 12, 8), brass, 0, .52, .24), mk(new THREE.SphereGeometry(.02, 12, 8), brass, 0, .28, .24))
        vis.add(mk(new THREE.CircleGeometry(.2, 24), mat({ color: 0xbfb6a0, r: 1 }), -.05, .683, .0, -Math.PI / 2, 0, 0))
        g.add(trackVisual(vis))
        g.add(hitbox(1.0, 1.1, 0.9, 0, 0.55, 0))
        interact(g, 'nightstand'); add(g); solid(-1.35, -0.33, -2.92, -1.98)

        // Music box (EB07) on open right half of GLB nightstand surface
        const mb = grp(-0.55, 1.10, -2.35, .18), bw = mat({ map: TX.wood('ebony'), bump: TX.wood('ebony'), bs: .5, r: .5, c: 0x9a7060 })
        mb.add(rb(.28, .09, .18, .01, bw, 0, .045, 0, 3), bx(.29, .01, .19, gold, 0, .09, 0), bx(.29, .01, .19, gold, 0, .004, 0))
        mb.add(mk(new THREE.PlaneGeometry(.25, .15), mat({ color: 0x5a0f1a, r: 1 }), 0, .092, 0, -Math.PI / 2, 0, 0))
        const lid = grp(0, .09, -.09); lid.add(rb(.28, .02, .18, .008, bw, 0, 0, .09, 2), bx(.29, .01, .19, gold, 0, .01, .09)); lid.rotation.x = -1.75; mb.add(lid)
        mb.add(mk(new THREE.CylinderGeometry(.04, .045, .02, 20), brass, 0, .102, 0), bx(.14, .006, .01, gold, -.04, .098, .05))
        const bl = grp(0, .115, 0); bl.add(mk(new THREE.CylinderGeometry(.005, .005, .045, 8), brass, 0, .022, 0)); const bd = lathe([[.0, 0], [.016, .018], [.009, .065], [.01, .09], [0, .1]], 12); bl.add(mk(bd, mat({ color: 0xe6dccd, r: .35 }), 0, .01, 0))
        bl.add(mk(new THREE.SphereGeometry(.012, 12, 10), mat({ map: TX.doll(), r: .3 }), 0, .115, 0, 0, Math.PI * .5, 0))
        bl.add(mk(new THREE.ConeGeometry(.04, .022, 18, 1, true), mat({ color: 0xe2b7c6, r: .8, side: THREE.DoubleSide }), 0, .07, 0))
            ;[-1, 1].forEach(s => bl.add(mk(new THREE.CylinderGeometry(.003, .003, .045, 6), mat({ color: 0xe6dccd }), s * .02, .09, 0, 0, 0, s * .9))); mb.add(bl)
        mb.add(hitbox(0.4, 0.35, 0.35, 0, 0.12, 0))
        interact(mb, 'musicbox'); add(mb); anim((t) => { bl.rotation.y = t * .45 })

        // Candle (EB03) on GLB nightstand surface with dim warm flame light
        const cg = grp(-0.85, 1.10, -2.32); cg.add(mk(lathe([[0, 0], [.05, 0], [.05, .012], [.02, .03], [.016, .05], [.03, .056], [0, .056]], 16), brass, 0, 0, 0))
        const wax = mat({ color: 0xd8cfb8, r: .55, e: 0x201408, ei: .3 }); cg.add(mk(new THREE.CylinderGeometry(.017, .019, .17, 16), wax, 0, .14, 0), mk(new THREE.CylinderGeometry(.022, .02, .02, 16), wax, 0, .065, 0))
        for (let i = 0; i < 4; i++)cg.add(mk(new THREE.CylinderGeometry(.0055, .007, .05 + i * .015, 8), wax, Math.cos(i * 1.7) * .018, .16 - i * .015, Math.sin(i * 1.7) * .018))
        const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.flame(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); fl.position.set(0, .29, 0); fl.userData.np = 1; cg.add(fl)
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow('w'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: .55 })); gl.scale.set(.42, .42, 1); gl.position.set(0, .3, 0); gl.userData.np = 1; cg.add(gl)
        cg.add(hitbox(0.3, 0.48, 0.3, 0, 0.15, 0))
        interact(cg, 'candle'); add(cg)
        const pl = new THREE.PointLight(0xff9840, 0.16, 1.8, 2); pl.position.set(-0.85, 1.40, -2.32); S.add(pl); E.lightRig(pl, 0.16, E.flick(2, .25)); anim(t => { const f = E.flick(2, .3)(t); fl.scale.set(.05 * (.9 + .2 * f), .11 * (.85 + .3 * f), 1); gl.material.opacity = .22 * f * E.lightScale() })

        // Photo frame (XB01 decoy) on back-right corner of GLB nightstand surface
        const pf = grp(-0.42, 1.10, -2.60, -.35); pf.add(bx(.14, .19, .02, gold, 0, .1, 0), mk(new THREE.PlaneGeometry(.1, .15), mat({ map: TX.photo(0), r: .5 }), 0, .1, .0125)); pf.add(bx(.03, .12, .01, dark, 0, .07, -.02)); pf.rotation.x = -.15
        pf.add(hitbox(0.3, 0.35, 0.2, 0, 0.1, 0))
        interact(pf, 'photo_frame'); add(pf)

        // Lamp hitbox aligned over the GLB's 3D bedside lamp at (-1.15, 1.10, -2.62); procedural lamp mesh hides on GLB load
        const lg = grp(-1.15, 1.10, -2.62)
        const lampVis = new THREE.Group()
        lampVis.add(mk(lathe([[0, 0], [.08, 0], [.08, .02], [.03, .05], [.02, .2], [.025, .3], [.015, .36], [0, .37]], 20), mat({ color: 0x1a1a1e, m: .7, r: .35 }), 0, 0, 0))
        lampVis.add(mk(new THREE.CylinderGeometry(.1, .17, .2, 28, 1, true), mat({ map: TX.shade(), side: THREE.DoubleSide, r: .9 }), 0, .44, 0))
        lg.add(trackVisual(lampVis))
        lg.add(hitbox(0.55, 0.75, 0.55, 0, 0.35, 0))
        interact(lg, 'lamp'); add(lg)
    }

    // 3. West vanity desk (GLB (-3.36, 0, 0.0)) + mirror above + notebook lying flat on vanity top
    {
        const g = grp(-3.36, 0, 0.0, Math.PI / 2)
        const vis = new THREE.Group()
        vis.add(bx(1.8, .06, .8, worn, 0, .75, 0), bx(1.84, .025, .84, dark, 0, .725, 0))
            ;[[-.82, -.34], [-.82, .34], [.82, -.34], [.82, .34]].forEach(p => { vis.add(mk(lathe([[0, 0], [.04, 0], [.045, .1], [.03, .2], [.04, .4], [.05, .5], [.035, .6], [.04, .7], [0, .7]], 14), dark, p[0], 0, p[1])) })
        vis.add(bx(.5, .54, .72, worn, .52, .44, 0))
            ;[0, 1, 2].forEach(i => { vis.add(bx(.44, .15, .02, dark, .52, .62 - i * .17, .37), mk(new THREE.SphereGeometry(.016, 10, 8), brass, .52, .62 - i * .17, .395)) })
        vis.add(bx(1.2, .5, .02, dark, -.2, .46, -.36))
        g.add(trackVisual(vis))
        g.add(hitbox(2.3, 1.35, 1.15, 0, 0.65, 0.1))
        interact(g, 'desk'); add(g); solid(-3.85, -2.92, -1.08, 1.08)

        // Mirror (EB11) aligned to GLB West wall tall cracked mirror at (-3.55, 1.92, -0.49)
        const mg = grp(-3.55, 1.92, -0.49, Math.PI / 2)
        const mvis = new THREE.Group()
        const geo = new THREE.CircleGeometry(1, 48); const mr = new Reflector(geo, { color: 0x707890, textureWidth: 512, textureHeight: 512, clipBias: .003 }); mr.scale.set(.27, .44, 1); mr.position.z = .006; mr.userData.np = 1; mvis.add(mr)
        const fr = mk(new THREE.TorusGeometry(1, .1, 12, 56), gold, 0, 0, .02); fr.scale.set(.31, .48, .35); mvis.add(fr)
        const fr2 = mk(new THREE.TorusGeometry(1, .05, 10, 56), mat({ map: TX.wood('ebony'), r: .6 }), 0, 0, .01); fr2.scale.set(.285, .455, .3); mvis.add(fr2)
        const cr = new THREE.Mesh(new THREE.PlaneGeometry(.56, .9), new THREE.MeshBasicMaterial({ map: X.tex(X.crackC(512, 512, 2, { cx: .4, cy: .45, n: 16 }), {}), transparent: true, opacity: .85, depthWrite: false, fog: false })); cr.scale.set(.95, .95, 1); cr.position.z = .012; cr.userData.np = 1; mvis.add(cr)
        const dt = new THREE.Mesh(new THREE.PlaneGeometry(.55, .88), new THREE.MeshBasicMaterial({ map: X.tex(X.mirrorDirt(), {}), transparent: true, depthWrite: false, fog: false })); dt.position.z = .011; mvis.add(dt)
        mg.add(trackVisual(mvis))
        const mirrorGlaze = mk(new THREE.BoxGeometry(0.78, 1.60, 0.08), mat({ color: 0x141820, t: true, o: 0.04, r: 0.25 }), 0, 0, 0.05)
        mirrorGlaze.castShadow = false; mg.add(mirrorGlaze)
        interact(mg, 'mirror'); add(mg, { noShadow: true })

        // School notebook stack (R1-02 - Clue 2) resting cleanly on GLB West vanity desk top
        const bk = (w, h, d, c, x, y, z, ry) => { const m = rb(w, h, d, .008, mat({ map: TX.leather(c), r: .75 }), x, y, z, 2); m.rotation.y = ry; return m }
        const cl = grp(-3.12, 1.10, -0.65, Math.PI / 2); cl.add(bk(.26, .04, .19, 'red', 0, .02, 0, .1), bk(.24, .035, .17, 'green', 0, .0575, 0, -.15), bk(.22, .04, .16, 'blue', 0, .095, .0, .3), bk(.2, .03, .15, 'dark', 0, .13, 0, -.05))
        cl.add(hitbox(0.42, 0.32, 0.36, 0, 0.08, 0))
        interact(cl, 'notebook'); add(cl)
    }

    // 4. East Wall Armchair beside the Bookshelf (Chair EB12 + Doll EK01 seated neatly)
    {
        const chGrp = grp(3.78, 0, 0.66)
        const yaw = grp(0, 0, 0, -Math.PI / 2), pv = grp(0, 0, 0, 0); yaw.add(pv)
            ;[-1, 1].forEach(s => {
                const pts = []; for (let i = 0; i <= 10; i++) { const z = -.5 + i * .1; pts.push([s * .27, .03 + .2 * Math.pow(z / .5, 2) * .8, z]) } pv.add(mk(tube(pts, .016, 24, 8), worn))
                pv.add(bx(.035, .4, .035, worn, s * .26, .25, .2, { vert: true }), bx(.035, .5, .035, worn, s * .26, .3, -.2, { vert: true }), bx(.03, .2, .03, worn, s * .27, .56, .15, { vert: true }), bx(.04, .03, .44, worn, s * .27, .67, .0))
            })
        pv.add(bx(.54, .04, .46, dark, 0, .45, 0), bx(.5, .03, .03, worn, 0, .2, .2), bx(.5, .03, .03, worn, 0, .2, -.2))
        const back = grp(0, .46, -.22); back.rotation.x = -.14; back.add(bx(.035, .55, .035, worn, -.24, .28, 0, { vert: true }), bx(.035, .55, .035, worn, .24, .28, 0, { vert: true }), bx(.54, .08, .03, worn, 0, .56, 0), bx(.5, .03, .03, worn, 0, .1, 0)); for (let i = 0; i < 6; i++)back.add(mk(new THREE.CylinderGeometry(.011, .011, .46, 8), worn, -.2 + i * .08, .3, 0)); pv.add(back)
        chGrp.add(trackVisual(yaw))
        const chairGlaze = mk(new THREE.BoxGeometry(0.74, 0.88, 0.74), mat({ color: 0x140e0a, t: true, o: 0.03, r: 0.9 }), 0, 0.44, 0)
        chairGlaze.castShadow = false; chGrp.add(chairGlaze)
        ref.chair = { yaw, pv }
        ref.doll = null
        interact(chGrp, 'chair'); add(chGrp); solid(3.38, 4.18, 0.20, 1.08)
    }

    // 5. North-West Ornate Carved Double Wardrobe (Wardrobe EB06 at (-3.28, 0, -2.06)) + Opening Door & Ghost Rig
    {
        const g = grp(-3.28, 0, -2.06, Math.PI), dk = wm('ebony', { r: .6 }), inner = new THREE.MeshStandardMaterial({ color: 0x020103, roughness: 1, side: THREE.BackSide })
        const vis = new THREE.Group()
        vis.add(bx(.03, 2.1, 1.4, dk, .38, 1.15, 0), bx(.8, 2.1, .03, dk, 0, 1.15, .685), bx(.8, 2.1, .03, dk, 0, 1.15, -.685), bx(.84, .08, 1.46, dk, 0, 2.2, 0), bx(.9, .12, 1.52, dk, -.02, 2.3, 0), bx(.84, .14, 1.46, dk, 0, .07, 0), bx(.78, .04, 1.4, dk, 0, .16, 0))
        vis.add(mk(new THREE.BoxGeometry(.76, 2.0, 1.36), inner, 0, 1.16, 0))
        vis.add(mk(new THREE.CylinderGeometry(.012, .012, 1.34, 8), brass, 0, 1.95, 0, Math.PI / 2, 0, 0))
        const coats = []; for (let i = 0; i < 6; i++) { const c = bx(.06, .95 + (i % 3) * .12, .3, mat({ color: [0x120f16, 0x1a1218, 0x0e1118][i % 3], r: 1 }), 0, 1.45 - (i % 3) * .06, -.5 + i * .2); vis.add(c); coats.push(c) }
        anim(t => coats.forEach((c, i) => c.rotation.x = Math.sin(t * .6 + i) * .02))
        const door = (side) => { const p = grp(-.38, 0, .69 * side); const m = grp(0, 0, -.335 * side); m.add(bx(.035, 2.0, .67, dk, 0, 1.1, 0), bx(.02, .8, .46, wm('dark'), -.02, .7, 0), bx(.02, .62, .46, wm('dark'), -.02, 1.62, 0), mk(new THREE.SphereGeometry(.022, 12, 10), brass, -.045, 1.05, -.28 * side)); p.add(m); vis.add(p); return p }
        const dr = door(1), dl = door(-1); dr.rotation.y = .16
        g.add(trackVisual(vis))
        // Real thin carved sheen overlay on NW ornate wardrobe facing East (+X in world)
        const wdGlaze = mk(new THREE.BoxGeometry(0.05, 2.55, 1.50), mat({ color: 0x100c14, t: true, o: 0.03, r: 0.8 }), -0.31, 1.38, 0)
        wdGlaze.castShadow = false; g.add(wdGlaze)

        ref.wardrobe = { doorR: dr, doorL: dl, pos: new THREE.Vector3(-2.95, 1.2, -2.06), open: false }
        interact(g, 'wardrobe'); add(g); solid(-3.75, -2.85, -2.92, -1.22)
    }

    // 6. Old Trunk (Trunk EB01) at the foot of the GLB bed — loads optimized old_trunk.glb
    {
        const g = grp(0.82, 0, 0.42, 0)
        const woodDark = wm('dark'), trimEbony = wm('ebony')
        const trunkFallback = new THREE.Group()
        trunkFallback.add(bx(.84, .30, .52, woodDark, 0, .15, 0))
        trunkFallback.add(bx(.86, .04, .54, trimEbony, 0, .02, 0), bx(.86, .04, .54, trimEbony, 0, .29, 0))
            ;[-.32, 0, .32].forEach(x => trunkFallback.add(bx(.04, .31, .53, trimEbony, x, .155, 0)))
        const lid = grp(0, .30, -.26)
        lid.add(bx(.84, .08, .52, woodDark, 0, .04, .26), bx(.86, .03, .54, trimEbony, 0, .02, .26))
        lid.rotation.x = -0.12
        trunkFallback.add(lid)
            ;[-.22, .22].forEach(x => trunkFallback.add(bx(.05, .06, .02, brass, x, .27, .265)))
        trunkFallback.add(bx(.07, .08, .025, brass, 0, .26, .265))
        g.add(trunkFallback)
        interact(g, 'trunk'); add(g); solid(0.38, 1.26, 0.12, 0.72)

        if (typeof window !== 'undefined' && window.location?.protocol?.startsWith('http') && typeof E.loadGLB === 'function') {
            E.loadGLB('/assets/models/bedroom/old_trunk.glb').then((gltf) => {
                const model = gltf?.scene
                if (!model) return
                model.name = 'old_trunk_glb'
                model.updateMatrixWorld(true)
                const b = new THREE.Box3().setFromObject(model)
                const ctr = b.getCenter(new THREE.Vector3())
                model.position.set(-ctr.x, -b.min.y, -ctr.z)
                model.traverse((o) => {
                    if (!o.isMesh) return
                    o.castShadow = true; o.receiveShadow = true
                    const mats = Array.isArray(o.material) ? o.material : [o.material]
                    mats.forEach((m) => { if (m?.color) { m.color.multiplyScalar(0.62); m.roughness = Math.max(m.roughness ?? 0.75, 0.78); m.needsUpdate = true } })
                    o.updateMatrix(); o.matrixAutoUpdate = false
                })
                const holder = new THREE.Group()
                holder.position.set(0.82, 0, 0.42)
                holder.add(model)
                holder.updateMatrix(); holder.matrixAutoUpdate = false
                interact(holder, 'trunk')
                E.visualInteract?.(holder, 'trunk')
                add(holder)
                retireObj(trunkFallback)
                E?.bakeShadows?.()
            }).catch((err) => console.warn('[BEDROOM TRUNK GLB FALLBACK ACTIVE]', err))
        }
    }

    // 7. East-South Wall Tall Green Bookshelf (Bookshelf EB10 at (3.75, 0, 2.00) facing West -X into the room)
    {
        const g = grp(3.75, 0, 2.00, -Math.PI / 2), br = wm('ebony', { r: .6 })
        const vis = new THREE.Group()
        vis.add(bx(.04, 1.15, .34, br, -.6, .575, 0), bx(.04, 1.15, .34, br, .6, .575, 0), bx(1.28, .05, .36, br, 0, 1.16, 0), bx(1.2, 1.1, .02, wm('dark'), 0, .575, -.16), bx(1.2, .12, .34, br, 0, .06, 0))
        g.add(trackVisual(vis))
        const shelfGlaze = mk(new THREE.BoxGeometry(1.92, 2.75, 0.06), mat({ color: 0x0c140e, t: true, o: 0.04, r: 0.8 }), 0, 1.45, 0.22)
        shelfGlaze.castShadow = false; g.add(shelfGlaze)
        interact(g, 'bookshelf'); add(g); solid(3.48, 4.18, 0.95, 3.05)
    }

    // 8. East Wall Draped Window (procedural/test fallback only — retired when GLB loads so it NEVER overlaps the bookshelf!)
    if (win) {
        const wz = win.z, wy0 = win.y0, wy1 = win.y1, wh = wy1 - wy0, fr = wm('dark'), X0 = W / 2
        const g = grp(X0, 0, wz, -Math.PI / 2)
        const vis = new THREE.Group()
        vis.add(bx(.12, .08, win.w + .2, fr, .03, wy1 + .04, 0), bx(.12, .08, win.w + .2, fr, .03, wy0 - .04, 0), bx(.12, wh, .08, fr, .03, (wy0 + wy1) / 2, -win.w / 2 - .04), bx(.12, wh, .08, fr, .03, (wy0 + wy1) / 2, win.w / 2 + .04))
        vis.add(bx(.04, wh, .04, fr, .04, (wy0 + wy1) / 2, 0), bx(.04, .04, win.w, fr, .04, (wy0 + wy1) / 2, 0), bx(.3, .05, win.w + .35, fr, .12, wy0 - .07, 0), bx(.18, .2, win.w + .3, fr, .03, wy1 + .14, 0))
        const cmat = mat({ map: TX.curtain(), at: .5, side: THREE.DoubleSide, r: 1 });[-1, 1].forEach(s => { const geo = curtainGeo(.62, 1.85), m = new THREE.Mesh(geo, cmat); m.position.set(-.18, 2.42 - .925, s * (win.w / 2 + .02)); m.rotation.y = -Math.PI / 2; m.castShadow = false; m.receiveShadow = true; vis.add(m) })
        g.add(trackVisual(vis))
        g.add(hitbox(2.3, 2.1, 0.6, 0, 1.5, 0))
        interact(g, 'window'); add(g)
        retireOnGLB.push(g)
    }

    // 9. Bedroom Exit Door: procedural South door retires on GLB load; GLB exit door sits ONLY at South-West doorway (-3.91, 0, 2.19)
    {
        const g = grp(2.45, 0, 2.88, Math.PI), dk = wm('dark')
        const vis = new THREE.Group()
        vis.add(bx(.1, 2.2, .07, wm('ebony'), -.5, 1.1, 0), bx(.1, 2.2, .07, wm('ebony'), .5, 1.1, 0), bx(1.1, .1, .07, wm('ebony'), 0, 2.2, 0))
        const doorHinge = grp(-0.45, 0, 0), doorLeaf = grp(0.45, 0, 0)
        doorLeaf.add(bx(.9, 2.1, .05, dk, 0, 1.05, 0))
        for (const y of [1.6, .55]) for (const x of [-.22, .22]) doorLeaf.add(bx(.3, .7, .02, wm('worn'), x, y, .03), bx(.3, .66, .012, dk, x, y, .04))
        doorLeaf.add(mk(new THREE.CylinderGeometry(.06, .06, .012, 20), brass, .33, 1.05, .04, Math.PI / 2, 0, 0), mk(new THREE.SphereGeometry(.035, 16, 12), brass, .33, 1.05, .075), bx(.1, .025, .005, brass, .33, .92, .036))
        doorLeaf.add(mk(tube([[.28, 1.4, .04], [.2, 1.36, .05], [.12, 1.4, .04], [.04, 1.35, .05]], .007, 20, 5), brass))
        const boltMat = mat({ color: 0x1c1a24, m: 0.9, r: 0.2 })
        doorLeaf.add(bx(0.16, 0.04, 0.03, boltMat, 0.4, 1.8, 0.035), bx(0.16, 0.04, 0.03, boltMat, 0.4, 0.35, 0.035))
        doorHinge.add(doorLeaf); vis.add(doorHinge)
        g.add(trackVisual(vis))
        g.add(hitbox(1.1, 2.2, 0.35, 0, 1.1, 0))
        interact(g, 'room_door'); add(g)
        retireOnGLB.push(g)
        ref.roomDoor = { hinge: doorHinge, isOpen: false, angle: 0 }
        anim(() => { if (ref.roomDoor) { const targetAngle = ref.roomDoor.isOpen ? 1.55 : 0; ref.roomDoor.angle += (targetAngle - ref.roomDoor.angle) * 0.05; ref.roomDoor.hinge.rotation.y = -ref.roomDoor.angle } })
        const ls = mk(new THREE.PlaneGeometry(.88, .012), new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }), 2.45, .008, 2.85, -Math.PI / 2, 0, 0); ls.userData.np = 1; trackVisual(ls); S.add(ls)

        // Single GLB bedroom exit doorway panel over South-West doorway (FrontSide_6 at (-3.91, 1.43, 2.19))
        const swDoor = grp(-3.91, 0, 2.19)
        const swGlaze = mk(new THREE.BoxGeometry(0.12, 2.45, 1.28), mat({ color: 0x140c0a, t: true, o: 0.04, r: 0.85 }), 0, 1.25, 0)
        swGlaze.castShadow = false; swDoor.add(swGlaze)
        interact(swDoor, 'room_door'); add(swDoor)
    }

    buildDecor(E)

    // Load the abandoned_mansion_bedroom.glb shell asynchronously and replace procedural walls/furniture visuals
    if (typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
        const shellUrl = '/assets/models/bedroom/abandoned_mansion_bedroom.glb'
        const onShellLoaded = (gltf) => {
            if (!gltf?.scene) return
            const model = gltf.scene
            model.name = 'abandoned_mansion_bedroom_shell'
            model.updateMatrixWorld(true)
            const box = new THREE.Box3().setFromObject(model)
            const c = box.getCenter(new THREE.Vector3())
            model.position.set(-(c.x + 0.72), -box.min.y, -(c.z + 1.315))
            const shellRoot = new THREE.Group()
            shellRoot.name = 'abandoned_mansion_bedroom_root'
            shellRoot.add(model)
            shellRoot.scale.set(W / 8.42, H / 2.46, D / 6.07)
            shellRoot.traverse((o) => {
                if (!o.isMesh) return
                o.userData.np = 1
                o.castShadow = true
                o.receiveShadow = true
                const mats = Array.isArray(o.material) ? o.material : [o.material]
                mats.forEach((m) => {
                    if (!m) return
                    m.color.setRGB(0.28, 0.26, 0.33)
                    m.roughness = Math.max(m.roughness ?? 0.75, 0.82)
                    m.metalness = Math.min(m.metalness ?? 0.1, 0.15)
                    if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 0
                    m.side = THREE.DoubleSide
                    m.needsUpdate = true
                })
            })
            S.add(shellRoot)
            procShell.forEach((m) => { m.visible = false; m.userData.np = 1 })
            procFurnitureVisuals.forEach((obj) => {
                obj.traverse((o) => {
                    if (o.isMesh && !o.userData._isHitbox) { o.visible = false; o.userData.np = 1 }
                })
            })
                ; (E.ref?.procVisuals || []).forEach((obj) => retireObj(obj))
            retireOnGLB.forEach((obj) => retireObj(obj))
            E?.bakeShadows?.()
        }
        if (typeof E.loadGLB === 'function') {
            E.loadGLB(shellUrl).then(onShellLoaded).catch((err) => console.warn('[BEDROOM SHELL GLB FALLBACK ACTIVE]', err))
        } else {
            const readyP = typeof MeshoptDecoder !== 'undefined' && MeshoptDecoder.ready ? MeshoptDecoder.ready : Promise.resolve()
            readyP.then(() => {
                const loader = new GLTFLoader()
                if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder)
                loader.load(shellUrl, onShellLoaded, undefined, (err) => console.warn('[BEDROOM SHELL GLB FALLBACK ACTIVE]', err))
            }).catch((err) => console.warn('[BEDROOM SHELL GLB FALLBACK ACTIVE]', err))
        }
    }
}

export function buildDoll(s = 1) {
    const g = new THREE.Group(), sk = mat({ map: TX.doll(), r: .35 }), dress = mat({ map: TX.sheet(), c: 0xe0cfd4, r: .9, side: 2 })
    g.add(mk(lathe([[0, 0], [.1, 0], [.13, .04], [.1, .1], [.05, .16], [.035, .22], [.05, .26], [0, .27]], 24), dress, 0, 0, 0))
    g.add(mk(new THREE.TorusGeometry(.11, .012, 8, 28), dress, 0, .035, 0, Math.PI / 2, 0, 0))
        ;[-1, 1].forEach(a => { g.add(mk(new THREE.CylinderGeometry(.015, .013, .17, 8), mat({ color: 0xdccfc4, r: .4 }), a * .04, .1, .12, Math.PI / 2.4, 0, 0), mk(new THREE.SphereGeometry(.022, 10, 8), mat({ color: 0x151015, r: .5 }), a * .04, .04, .2), mk(new THREE.CylinderGeometry(.012, .01, .13, 8), mat({ color: 0xdccfc4, r: .4 }), a * .085, .19, .05, .5, 0, a * .5)) })
    const head = new THREE.Group(); head.position.set(0, .31, 0); const hs = mk(new THREE.SphereGeometry(.06, 32, 24), sk, 0, .03, 0); head.add(hs)
    head.add(mk(new THREE.SphereGeometry(.064, 32, 20, Math.PI / 2 + .85, Math.PI * 2 - 1.7, 0, Math.PI * .78), mat({ map: TX.hair(), r: .9, side: 2 }), 0, .035, -.002))
    const fr = mk(new THREE.TorusGeometry(.058, .009, 6, 18, Math.PI), mat({ map: TX.hair(), r: .9 }), 0, .065, .005, 0, 0, 0); fr.rotation.set(.1, 0, 0); head.add(fr)
    g.add(head); g.userData.head = head; g.scale.setScalar(s); return g
}
export function buildSkull(s = 1) {
    const g = new THREE.Group(), bm = mat({ map: TX.bone(), r: .6, bump: TX.bone(), bs: .8 }), dk = mat({ color: 0x050404, r: 1 })
    const cr = mk(new THREE.SphereGeometry(.07, 28, 22), bm, 0, .08, 0); cr.scale.set(1, 1.02, 1.1); g.add(cr)
        ;[-1, 1].forEach(a => { g.add(mk(new THREE.SphereGeometry(.022, 14, 10), dk, a * .03, .075, .058), mk(new THREE.SphereGeometry(.02, 12, 8), bm, a * .05, .05, .045)) })
    g.add(mk(new THREE.ConeGeometry(.012, .03, 3), dk, 0, .05, .075, 0, 0, Math.PI), bx(.07, .035, .07, bm, 0, .015, .04, { s: 6 }), bx(.075, .03, .075, bm, 0, -.01, .03, { s: 6 }))
    for (let i = 0; i < 6; i++)g.add(bx(.008, .014, .008, mat({ color: 0xd8d0bc, r: .5 }), -.03 + i * .012, .0, .073, { s: 4 }))
    g.scale.setScalar(s); return g
}
const _pt = {}; export function pumpkinMesh(r, kind = 0) {
    const f = X.pumpkinFace(kind), tt = _pt[kind] || (_pt[kind] = { map: X.tex(f.map), emi: X.tex(f.emi) }), map = tt.map, emi = tt.emi; const m = mat({ map, bump: map, bs: .8, r: .6, em: emi, e: 0xffffff, ei: 1.6 }), g = new THREE.Group()
    const body = new THREE.Mesh(pumpkinGeo(r, .82), m); g.add(body); const st = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.01, .05, 0), new THREE.Vector3(.04, .1, .01), new THREE.Vector3(.07, .12, 0)]), 12, .14 * r, 8), mat({ map: TX.wood('worn'), c: 0x6a7a3a, r: .8 }))
    st.scale.setScalar(r * 3.2); st.position.set(-.02, r * .82 - .03 * r, 0); g.add(st); g.userData.mat = m; g.userData.body = body; return g
}

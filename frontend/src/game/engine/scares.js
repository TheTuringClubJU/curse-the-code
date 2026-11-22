// Jump-scare director: animated 3D Clown Springtrap jumpscare + Spectral Wardrobe-opening ghost scare.
import * as THREE from 'three'
import * as X from './tex.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const rnd = (a, b) => a + Math.random() * (b - a)

function buildClownTexture() {
  const base = X.faceC({ eye: '#ff1e1e', glow: true, mouth: true, seed: 9 })
  const g = base.getContext('2d')
  if (!g) return base
  const cx = base.width / 2
  g.fillStyle = 'rgba(245, 240, 236, 0.25)'
  g.beginPath()
  g.ellipse(cx, 285, 92, 132, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(175, 10, 18, 0.88)'
  ;[-1, 1].forEach((s) => {
    const ex = cx + s * 50
    g.beginPath()
    g.moveTo(ex, 222)
    g.lineTo(ex + 28, 280)
    g.lineTo(ex, 338)
    g.lineTo(ex - 28, 280)
    g.closePath()
    g.fill()
    g.fillStyle = '#ff2200'
    g.beginPath()
    g.arc(ex, 280, 9, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.arc(ex, 280, 3.5, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(175, 10, 18, 0.88)'
  })
  g.strokeStyle = 'rgba(165, 8, 12, 0.95)'
  g.lineWidth = 14
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx - 88, 378)
  g.quadraticCurveTo(cx, 480, cx + 88, 378)
  g.stroke()
  g.fillStyle = '#cc0b14'
  g.beginPath()
  g.arc(cx, 332, 24, 0, Math.PI * 2)
  g.fill()
  return base
}

/** Build a spectral ragged ghost figure that bursts out of the antique wardrobe doors. */
function buildWardrobeGhost() {
  const g = new THREE.Group()
  g.visible = false
  g.userData.np = 1

  const shroudMat = new THREE.MeshStandardMaterial({
    color: 0xc8d4e8,
    emissive: 0x304868,
    emissiveIntensity: 0.95,
    roughness: 0.7,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
    fog: false
  })
  const faceTex = X.tex(X.faceC({ glow: true, eye: '#ff2211', mouth: true, seed: 7 }), {})
  const headMat = new THREE.MeshBasicMaterial({
    map: faceTex,
    transparent: true,
    opacity: 0.96,
    fog: false,
    side: THREE.DoubleSide
  })
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2211, fog: false })

  // Draped spectral torso/cloak
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.55, 14, 4, true), shroudMat)
  body.position.set(0, 0.85, 0)
  body.userData.np = 1
  g.add(body)

  // Floating spectral skull/visage plane facing out (+Z in local ghost space)
  const visage = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.72), headMat)
  visage.position.set(0, 1.62, 0.08)
  visage.userData.np = 1
  g.add(visage)

  // Glowing piercing eyes
  ;[-0.08, 0.08].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat)
    eye.position.set(ex, 1.67, 0.11)
    eye.userData.np = 1
    g.add(eye)
  })

  // Outstretched clawing arms reaching toward the player
  const arms = []
  ;[-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.055, 0.78, 8), shroudMat)
    arm.position.set(side * 0.24, 1.32, 0.34)
    arm.rotation.set(Math.PI / 2.25, 0, side * 0.22)
    arm.userData.np = 1
    g.add(arm)
    arms.push(arm)
  })
  g.userData.arms = arms
  return g
}

export function createScares(E, h) {
  const { S, cam, sc } = E
  const A = () => h.audio
  const flash = (c, a, ms) => h.onFlash?.(c, a, ms)

  // Clown jumpscare rig attached directly to camera
  const clownPivot = new THREE.Group()
  clownPivot.visible = false
  clownPivot.userData.np = 1
  cam.add(clownPivot)

  const clownGroup = new THREE.Group()
  clownGroup.position.set(0, -0.02, -1.55)
  clownGroup.userData.np = 1

  const faceTex = X.tex(buildClownTexture(), {})
  const faceMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 1.15),
    new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, fog: false, depthWrite: false, side: THREE.DoubleSide })
  )
  faceMesh.userData.np = 1
  clownGroup.add(faceMesh)

  const noseMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xcc0a12, emissive: 0x550000, emissiveIntensity: 0.9, roughness: 0.25 })
  )
  noseMesh.position.set(0, -0.02, 0.04)
  noseMesh.userData.np = 1
  clownGroup.add(noseMesh)

  clownPivot.add(clownGroup)

  // Wait for MeshoptDecoder.ready before loading compressed 3D animated Clown model
  let clownModel = null
  let clownMixer = null
  let clownAction = null

  const setupLoadedClown = (gltf) => {
    if (!gltf?.scene) return
    clownModel = gltf.scene
    clownModel.name = 'clown_springtrap_jumpscare'
    clownModel.traverse((o) => {
      if (!o.isMesh) return
      o.userData.np = 1
      o.userData.ns = 1
      o.frustumCulled = false
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach((m) => {
        if (!m) return
        m.fog = false
        // Skinned body mesh shipped with alphaMode: BLEND which causes Three.js sort/invisible edge cases;
        // enforce opaque alpha-tested cutout + depthWrite so it renders reliably over dark backgrounds.
        if (m.transparent) {
          m.transparent = false
          m.alphaTest = 0.25
        }
        m.depthWrite = true
        m.depthTest = true
        m.side = THREE.DoubleSide
        if (m.name?.includes('Eyes') || o.name?.includes('Eyes')) {
          m.emissive = new THREE.Color(0xff1100)
          m.emissiveIntensity = 3.5
        } else if (m.color) {
          m.emissive = new THREE.Color(0x160908)
          m.emissiveIntensity = 0.35
        }
        m.needsUpdate = true
      })
    })

    // During Clown_Springtrap--Jumpscare, Root_Bn_04 already drops head/eyes to local Y ≈ -0.02..+0.07m!
    // Keeping Y near -0.04 centers the face directly in camera eye line instead of pushing it off the bottom edge.
    clownModel.scale.setScalar(1.05)
    clownModel.position.set(-0.04, -0.04, 0.24)
    clownModel.rotation.set(0, 0, 0)
    clownGroup.add(clownModel)

    // Swap from 2D procedural face fallback to 3D clown
    faceMesh.visible = false
    noseMesh.visible = false

    if (gltf.animations?.length > 0) {
      clownMixer = new THREE.AnimationMixer(clownModel)
      clownAction = clownMixer.clipAction(gltf.animations[0])
      clownAction.setLoop(THREE.LoopOnce)
      clownAction.clampWhenFinished = true
      clownAction.timeScale = 0.72
    }
  }

  if (typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
    const clownUrl = '/assets/models/bedroom/clown_springtrap_jumpscare.glb'
    if (typeof E.loadGLB === 'function') {
      E.loadGLB(clownUrl)
        .then(setupLoadedClown)
        .catch((err) => console.warn('[BEDROOM CLOWN GLB FALLBACK ACTIVE]', err))
    } else {
      const readyP = typeof MeshoptDecoder !== 'undefined' && MeshoptDecoder.ready
        ? MeshoptDecoder.ready
        : Promise.resolve()
      readyP
        .then(() => {
          const loader = new GLTFLoader()
          if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder)
          loader.load(
            clownUrl,
            setupLoadedClown,
            undefined,
            (err) => console.warn('[BEDROOM CLOWN GLB FALLBACK ACTIVE]', err)
          )
        })
        .catch((err) => console.warn('[BEDROOM CLOWN GLB FALLBACK ACTIVE]', err))
    }
  }

  // Bright camera-mounted key light + red underlight so the 3D clown pops clearly in the dark room
  const scareKeyLight = new THREE.PointLight(0xfff0e8, 0, 6.0)
  scareKeyLight.position.set(0, 0.14, -0.25)
  scareKeyLight.visible = false
  cam.add(scareKeyLight)

  const scareLight = new THREE.PointLight(0xff2200, 0, 5.0)
  scareLight.position.set(0, -0.25, -0.45)
  scareLight.visible = false
  cam.add(scareLight)

  // Spectral Wardrobe-opening ghost scare state (anchored in world at NW carved wardrobe opening)
  const wardrobeGhost = buildWardrobeGhost()
  wardrobeGhost.position.set(-3.18, 0.05, -2.06)
  wardrobeGhost.rotation.y = Math.PI / 2 // face +X out of the wardrobe into the room
  S?.add(wardrobeGhost)

  const wardrobeLight = new THREE.PointLight(0x78c8ff, 0, 5.5)
  wardrobeLight.position.set(-2.55, 1.55, -2.06)
  wardrobeLight.visible = false
  S?.add(wardrobeLight)

  let wardrobeScareT = -1

  const triggerWardrobeScare = () => {
    wardrobeScareT = 0
    wardrobeGhost.visible = true
    wardrobeLight.visible = true
    wardrobeLight.intensity = 9.5
    if (E.ref?.wardrobeRig) {
      E.ref.wardrobeRig.open = true
    }
    if (E.ref?.wardrobe) {
      E.ref.wardrobe.open = true
      if (E.ref.wardrobe.face) E.ref.wardrobe.face.visible = true
    }
    if (A()?.jumpscareSting) {
      A().jumpscareSting(1.25)
    } else {
      A()?.screech?.(-3.0, -2.06)
    }
    E.shake?.(2.2, 1.55)
    flash?.('#14081c', 0.28, 150)
  }

  const defs = {
    clown: {
      cond: () => true,
      start() {
        clownPivot.visible = true
        scareKeyLight.visible = true
        scareKeyLight.intensity = 14.0
        scareLight.visible = true
        scareLight.intensity = 10.0
        clownGroup.position.set(0, -0.02, -1.55)
        clownGroup.rotation.set(0, 0, 0)
        clownGroup.scale.setScalar(1.0)
        if (clownAction) {
          clownAction.reset()
          clownAction.timeScale = 0.72
          // Advance slightly past frame 0 crouch so the rising head enters viewport immediately
          clownAction.time = 0.08
          clownAction.play()
          clownMixer?.update(0)
        }
        if (A()?.jumpscareSting) {
          A().jumpscareSting(1.45)
        } else {
          A()?.stinger?.(1.0)
          A()?.screech?.(E.px(), E.pz())
        }
        E.shake?.(2.6, 1.75)
        flash?.('#550000', 0.26, 130)
        sc.v = 0.25
      },
      upd(t, dt) {
        if (clownMixer) {
          clownMixer.update(dt || 0.016)
        }
        sc.v = Math.sin(t * 38) > 0 ? 0.65 : 0.16
        scareKeyLight.intensity = 13.0 + Math.sin(t * 42) * 3.0
        scareLight.intensity = 8.5 + Math.sin(t * 45) * 4.0

        const lunge = Math.sin(Math.min(Math.PI * 0.5, t * 4.5)) * 0.52
        const spasm = Math.sin(t * 28) * 0.022
        clownGroup.position.z = -1.55 + lunge + spasm
        clownGroup.position.x = Math.sin(t * 55) * 0.02
        clownGroup.position.y = -0.02 + Math.cos(t * 45) * 0.02
        clownGroup.rotation.z = Math.sin(t * 32) * 0.06
        clownGroup.scale.setScalar(1.0 + Math.min(0.22, t * 0.16))

        if (t > 1.75) {
          if (clownAction) {
            clownAction.stop()
          }
          clownPivot.visible = false
          scareKeyLight.visible = false
          scareLight.visible = false
          sc.v = 1
          clownGroup.position.set(0, -0.02, -1.55)
          clownGroup.rotation.set(0, 0, 0)
          clownGroup.scale.setScalar(1.0)
          A()?.heartbeat?.(true)
          setTimeout(() => A()?.heartbeat?.(false), 8000)
          return true
        }
      }
    }
  }

  let act = null, at = 0
  // First jumpscare strikes ~20s after entering room
  let nextAt = 20

  const trigger = () => {
    if (act) return
    act = Object.create(defs.clown)
    at = 0
    act.name = 'clown'
    act.start()
  }

  const triggerDoorScare = () => {
    trigger()
  }

  let onKey = null
  if (typeof window !== 'undefined') {
    onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return
      if (['1', '2', '3', '4', '5', 'j', 'J'].includes(e.key)) {
        trigger()
      }
    }
    window.addEventListener('keydown', onKey)
  }

  return {
    trigger,
    triggerDoorScare,
    triggerWardrobeScare,
    tick(dt, t) {
      if (wardrobeScareT >= 0) {
        wardrobeScareT += dt || 0.016
        const p = Math.min(1, wardrobeScareT / 0.45)
        // Burst outward from inside wardrobe (-3.18) toward room (-1.85), hovering slightly
        wardrobeGhost.position.x = -3.18 + Math.sin(p * Math.PI * 0.5) * 1.32 + Math.sin(wardrobeScareT * 36) * 0.03
        wardrobeGhost.position.y = 0.05 + Math.sin(wardrobeScareT * 14) * 0.06
        wardrobeGhost.scale.setScalar(0.55 + Math.min(0.65, wardrobeScareT * 1.4))
        wardrobeLight.intensity = 7.0 + Math.sin(wardrobeScareT * 48) * 5.0
        ;(wardrobeGhost.userData.arms || []).forEach((arm, idx) => {
          arm.rotation.x = Math.PI / 2.25 + Math.sin(wardrobeScareT * 26 + idx) * 0.25
        })
        if (wardrobeScareT > 1.65) {
          wardrobeScareT = -1
          wardrobeGhost.visible = false
          wardrobeLight.visible = false
          wardrobeGhost.position.set(-3.18, 0.05, -2.06)
          wardrobeGhost.scale.setScalar(1.0)
          if (E.ref?.wardrobeRig) E.ref.wardrobeRig.open = false
          if (E.ref?.wardrobe) {
            E.ref.wardrobe.open = false
            if (E.ref.wardrobe.face) E.ref.wardrobe.face.visible = false
          }
        }
      }
      if (act) {
        at += dt
        if (act.upd(at, dt)) {
          act = null
          nextAt = t + rnd(70, 110)
        }
        return
      }
      if (E.isModalOpen?.() || E.paused) {
        if (t >= nextAt) {
          nextAt = t + rnd(20, 40)
        }
        return
      }
      if (t < nextAt) return
      trigger()
    },
    dispose() {
      if (clownMixer) {
        try { clownMixer.stopAllAction() } catch (_) {}
      }
      if (clownPivot.parent) clownPivot.parent.remove(clownPivot)
      if (scareKeyLight.parent) scareKeyLight.parent.remove(scareKeyLight)
      if (scareLight.parent) scareLight.parent.remove(scareLight)
      if (wardrobeGhost.parent) wardrobeGhost.parent.remove(wardrobeGhost)
      if (wardrobeLight.parent) wardrobeLight.parent.remove(wardrobeLight)
      if (typeof window !== 'undefined' && onKey) {
        window.removeEventListener('keydown', onKey)
      }
    }
  }
}

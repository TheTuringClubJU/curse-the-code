// Jump-scare director: animated 3D Clown Springtrap jumpscare at balanced intervals. Press J or 1-5 to trigger directly.
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

export function createScares(E, h) {
  const { cam, sc } = E
  const A = () => h.audio
  const flash = (c, a, ms) => h.onFlash?.(c, a, ms)

  // Clown jumpscare rig attached directly to camera
  const clownPivot = new THREE.Group()
  clownPivot.visible = false
  clownPivot.userData.np = 1
  cam.add(clownPivot)

  const clownGroup = new THREE.Group()
  clownGroup.position.set(0, -0.02, -1.68)
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
        m.depthWrite = true
        m.depthTest = true
        m.side = THREE.DoubleSide
        if (m.name?.includes('Eyes') || o.name?.includes('Eyes')) {
          m.emissive = new THREE.Color(0xff1100)
          m.emissiveIntensity = 2.8
        }
        m.needsUpdate = true
      })
    })

    // Align head/eyes at local Y ≈ 1.18m directly to camera eye height Y ≈ 0
    clownModel.scale.setScalar(0.85)
    clownModel.position.set(0, -1.02, 0)
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
      clownAction.timeScale = 0.85
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
  scareKeyLight.position.set(0, 0.12, -0.25)
  scareKeyLight.visible = false
  cam.add(scareKeyLight)

  const scareLight = new THREE.PointLight(0xff2200, 0, 5.0)
  scareLight.position.set(0, -0.25, -0.45)
  scareLight.visible = false
  cam.add(scareLight)

  const defs = {
    clown: {
      cond: () => true,
      start() {
        clownPivot.visible = true
        scareKeyLight.visible = true
        scareKeyLight.intensity = 12.0
        scareLight.visible = true
        scareLight.intensity = 10.0
        clownGroup.position.set(0, -0.02, -1.68)
        clownGroup.rotation.set(0, 0, 0)
        clownGroup.scale.setScalar(1.0)
        if (clownAction) {
          clownAction.timeScale = 0.85
          clownAction.reset().play()
        }
        if (A()?.jumpscareSting) {
          A().jumpscareSting(1.45)
        } else {
          A()?.stinger?.(1.0)
          A()?.screech?.(E.px(), E.pz())
        }
        E.shake?.(2.6, 1.75)
        flash?.('#550000', 0.28, 130)
        sc.v = 0.2
      },
      upd(t, dt) {
        if (clownMixer) {
          clownMixer.update(dt || 0.016)
        }
        sc.v = Math.sin(t * 38) > 0 ? 0.65 : 0.12
        scareKeyLight.intensity = 11.5 + Math.sin(t * 42) * 2.5
        scareLight.intensity = 8.0 + Math.sin(t * 45) * 4.0

        const lunge = Math.sin(Math.min(Math.PI * 0.5, t * 4.5)) * 0.50
        const spasm = Math.sin(t * 28) * 0.025
        clownGroup.position.z = -1.68 + lunge + spasm
        clownGroup.position.x = Math.sin(t * 55) * 0.02
        clownGroup.position.y = -0.02 + Math.cos(t * 45) * 0.02
        clownGroup.rotation.z = Math.sin(t * 32) * 0.06
        clownGroup.scale.setScalar(1.0 + Math.min(0.25, t * 0.18))

        if (t > 1.75) {
          if (clownAction) {
            clownAction.stop()
          }
          clownPivot.visible = false
          scareKeyLight.visible = false
          scareLight.visible = false
          sc.v = 1
          clownGroup.position.set(0, -0.02, -1.68)
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
    tick(dt, t) {
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
      if (typeof window !== 'undefined' && onKey) {
        window.removeEventListener('keydown', onKey)
      }
    }
  }
}

// Jump-scare director: explosive animated 3D Agatha jumpscare (agatha_only_jumpscares.glb) on a 4-5 minute randomized schedule.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { capStudyTextures, optimizeStudyMaterials } from './studyPerformance.js'

const rnd = (a, b) => a + Math.random() * (b - a)
const SCARE_MIN_INTERVAL_SEC = 240 // 4 minutes
const SCARE_MAX_INTERVAL_SEC = 300 // 5 minutes
const nextScareDelay = () => rnd(SCARE_MIN_INTERVAL_SEC, SCARE_MAX_INTERVAL_SEC)

export function createScares(E, h) {
  const { cam, sc } = E
  const A = () => h.audio
  const flash = (c, a, ms) => h.onFlash?.(c, a, ms)
  const baseFov = cam?.fov || 72

  // Agatha jumpscare rig attached directly to camera so it strikes in your face regardless of look angle
  const agathaPivot = new THREE.Group()
  agathaPivot.visible = false
  agathaPivot.userData.np = 1
  cam.add(agathaPivot)

  const agathaGroup = new THREE.Group()
  agathaGroup.position.set(0, 0, -1.75)
  agathaGroup.userData.np = 1
  agathaPivot.add(agathaGroup)

  let agathaModel = null
  let agathaMixer = null
  let agathaActions = []
  let activeAction = null
  let activeDuration = 2.2
  let midFlashFired = false
  let hbTimeout = null

  const setupLoadedAgatha = (gltf) => {
    if (!gltf?.scene) return
    agathaModel = gltf.scene
    agathaModel.name = 'agatha_only_jumpscares'

    agathaModel.traverse((o) => {
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
        m.side = THREE.FrontSide
        if (m.color) {
          m.emissive = new THREE.Color(0x331015)
          m.emissiveIntensity = 0.4
        }
      })
    })

    optimizeStudyMaterials(agathaModel)
    capStudyTextures(agathaModel, E.bedroomLowDetail ? 256 : 512)

    // Agatha's skeleton height is ~57 units facing +Z; scale 0.036 puts her upper torso & face in view
    agathaModel.scale.setScalar(0.036)
    agathaModel.position.set(0, -1.78, -0.35)
    agathaModel.rotation.set(0, 0, 0)
    agathaGroup.add(agathaModel)

    // Pre-warm GPU pipeline offscreen: compiles skinned mesh shader & uploads all textures to GPU VRAM
    agathaGroup.position.set(0, -999, 0)
    agathaPivot.visible = true
    setTimeout(() => {
      if (!act) {
        agathaPivot.visible = false
        agathaGroup.position.set(0, -0.24, -1.85)
      }
    }, 150)

    if (gltf.animations?.length > 0) {
      agathaMixer = new THREE.AnimationMixer(agathaModel)
      // Pick jumpscare clips, prioritizing the direct forward-lunge jumpscare1
      const primaryClip = gltf.animations.find((c) => /jumpscare1/i.test(c.name))
      const otherClips = gltf.animations.filter((c) => c.duration > 0.1 && /jumpscare/i.test(c.name) && !/jumpscare1/i.test(c.name))
      const usableClips = primaryClip ? [primaryClip, ...otherClips] : gltf.animations.filter((c) => c.duration > 0.1)
      agathaActions = usableClips.map((clip) => {
        const action = agathaMixer.clipAction(clip)
        action.setLoop(THREE.LoopOnce)
        action.clampWhenFinished = true
        return { action, duration: clip.duration, name: clip.name }
      })
    }
  }

  if (typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
    const agathaUrl = '/assets/models/bedroom/agatha_only_jumpscares.glb'
    if (typeof E.loadGLB === 'function') {
      E.loadGLB(agathaUrl)
        .then(setupLoadedAgatha)
        .catch((err) => console.warn('[BEDROOM AGATHA GLB LOAD FAILED]', err))
    } else {
      const readyP = typeof MeshoptDecoder !== 'undefined' && MeshoptDecoder.ready
        ? MeshoptDecoder.ready
        : Promise.resolve()
      readyP
        .then(() => {
          const loader = new GLTFLoader()
          if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder)
          loader.load(
            agathaUrl,
            setupLoadedAgatha,
            undefined,
            (err) => console.warn('[BEDROOM AGATHA GLB LOAD FAILED]', err)
          )
        })
        .catch((err) => console.warn('[BEDROOM AGATHA GLB LOAD FAILED]', err))
    }
  }

  // Blinding strobe white key light + blood-red underlight mounted on camera
  // Keep visible = true with intensity = 0 so Three.js compiles all shaders with these uniforms at init
  const scareKeyLight = new THREE.PointLight(0xf6f8ff, 0, 7.0)
  scareKeyLight.position.set(0, 0.14, -0.10)
  scareKeyLight.visible = true
  cam.add(scareKeyLight)

  const scareLight = new THREE.PointLight(0xff1008, 0, 6.0)
  scareLight.position.set(0, -0.26, -0.18)
  scareLight.visible = true
  cam.add(scareLight)

  const defs = {
    agatha: {
      cond: () => true,
      start() {
        clearTimeout(hbTimeout)
        agathaPivot.visible = true
        scareKeyLight.intensity = 22.0
        scareLight.intensity = 15.0
        agathaGroup.position.set(0, -0.24, -2.05)
        agathaGroup.rotation.set(0, 0, 0)
        agathaGroup.scale.setScalar(0.92)
        if (agathaModel) {
          agathaModel.position.set(0, -1.78, -0.35)
        }
        midFlashFired = false
        activeDuration = 3.5 + Math.random() * 0.4

        if (agathaMixer && agathaActions.length > 0) {
          agathaMixer.stopAllAction()
          // Favor direct forward-screaming jumpscare1 with occasional variations
          const picked = (Math.random() < 0.70 || agathaActions.length === 1)
            ? agathaActions[0]
            : agathaActions[Math.floor(Math.random() * agathaActions.length)]
          activeAction = picked.action
          const timeScale = picked.duration < 1.3 ? 0.90 : 1.05
          activeAction.reset()
          activeAction.timeScale = timeScale
          activeAction.play()
          // Stay in front of the player's face for 3 to 4 seconds
          activeDuration = Math.max(3.4, Math.min(3.9, 3.5 + Math.random() * 0.4))
        } else {
          activeAction = null
        }

        // Punch FOV once on start (no per-frame projection matrix invalidation)
        if (cam && typeof cam.updateProjectionMatrix === 'function') {
          cam.fov = baseFov - 14
          cam.updateProjectionMatrix()
        }

        // Play the attached scary scream sound ONLY when this jumpscare happens
        if (A()?.jumpscareSting) {
          A().jumpscareSting(1.45)
        } else {
          A()?.playScreamClip?.()
        }
        E.shake?.(1.4, 0.55)
        flash?.('#7a0000', 0.32, 120)
        sc.v = 0.05
      },
      upd(t, dt) {
        if (agathaMixer) {
          agathaMixer.update(dt || 0.016)
        }

        // Explosive pop-out lunge in the first 0.14s: stops right in front of player's face (-1.48m) and holds there for 3-4s without passing through
        const lungeProgress = Math.min(1, t / 0.14)
        const easeSnap = 1 - Math.pow(1 - lungeProgress, 4)
        const pulseZ = lungeProgress >= 1 ? Math.sin((t - 0.14) * 18) * 0.035 : 0
        const desiredGroupZ = -2.05 + easeSnap * 0.57 + pulseZ

        if (!midFlashFired && t >= 0.12) {
          midFlashFired = true
          flash?.('#ffffff', 0.22, 50)
        }

        // Fast horror strobe & crimson underlight
        const strobe = Math.random() > 0.35 ? 24.0 : 4.5
        sc.v = Math.random() > 0.5 ? 0.55 : 0.05
        scareKeyLight.intensity = strobe
        scareLight.intensity = 11.0 + Math.random() * 8.0

        // Demonic tremors around face position (pure coordinate math, zero matrix updates)
        const thrashAmp = lungeProgress >= 1 ? 1.0 : lungeProgress * 0.4
        agathaGroup.position.set(
          Math.sin(t * 48) * 0.022 * thrashAmp,
          -0.24 + Math.cos(t * 38) * 0.016 * thrashAmp,
          desiredGroupZ
        )
        agathaGroup.rotation.z = Math.sin(t * 32) * 0.07 * thrashAmp
        agathaGroup.scale.setScalar(0.92 + easeSnap * 0.16 + Math.sin(t * 34) * 0.02 * thrashAmp)

        if (t > activeDuration) {
          if (activeAction) {
            activeAction.stop()
            activeAction = null
          }
          agathaPivot.visible = false
          scareKeyLight.intensity = 0
          scareLight.intensity = 0
          sc.v = 1
          agathaGroup.position.set(0, -0.24, -1.85)
          agathaGroup.rotation.set(0, 0, 0)
          agathaGroup.scale.setScalar(1.0)
          if (cam && Math.abs(cam.fov - baseFov) > 0.1) {
            cam.fov = baseFov
            cam.updateProjectionMatrix?.()
          }
          A()?.heartbeat?.(true)
          hbTimeout = setTimeout(() => A()?.heartbeat?.(false), 6000)
          return true
        }
      }
    }
  }

  let act = null, at = 0
  // Strictly randomized 4 to 5 minute timeframe (240 - 300 seconds)
  let nextAt = nextScareDelay()

  const trigger = () => {
    if (act) return
    act = Object.create(defs.agatha)
    at = 0
    act.name = 'agatha'
    act.start()
  }

  let onKey = null
  if (typeof window !== 'undefined' && typeof window.location?.search === 'string' && window.location.search.includes('debug')) {
    onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return
      if (e.key === 'j' || e.key === 'J') {
        trigger()
      }
    }
    window.addEventListener('keydown', onKey)
  }

  return {
    trigger,
    triggerDoorScare: () => {},
    triggerWardrobeScare: () => {},
    tick(dt, t) {
      if (act) {
        at += dt
        if (act.upd(at, dt)) {
          act = null
          nextAt = t + nextScareDelay()
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
      clearTimeout(hbTimeout)
      if (cam && Math.abs(cam.fov - baseFov) > 0.1) {
        cam.fov = baseFov
        cam.updateProjectionMatrix?.()
      }
      if (agathaMixer) {
        try { agathaMixer.stopAllAction() } catch (_) {}
      }
      if (agathaPivot.parent) agathaPivot.parent.remove(agathaPivot)
      if (scareKeyLight.parent) scareKeyLight.parent.remove(scareKeyLight)
      if (scareLight.parent) scareLight.parent.remove(scareLight)
      if (typeof window !== 'undefined' && onKey) {
        window.removeEventListener('keydown', onKey)
      }
    }
  }
}

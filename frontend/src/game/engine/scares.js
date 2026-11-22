// Jump-scare director: explosive animated 3D Agatha jumpscare (agatha_only_jumpscares.glb) on a 4-5 minute randomized schedule.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

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
  let agathaHeadBone = null
  let agathaEyeL = null
  let agathaEyeR = null
  let midFlashFired = false
  let hbTimeout = null
  const tmpHeadWorld = new THREE.Vector3()
  const tmpEyeWorld = new THREE.Vector3()
  const tmpHeadLocal = new THREE.Vector3()

  const setupLoadedAgatha = (gltf) => {
    if (!gltf?.scene) return
    agathaModel = gltf.scene
    agathaModel.name = 'agatha_only_jumpscares'

    agathaModel.traverse((o) => {
      if (o.isBone) {
        if (!agathaEyeL && /l_eye_01shjnt_067|l_eye/i.test(o.name) && !/end/i.test(o.name)) {
          agathaEyeL = o
        }
        if (!agathaEyeR && /r_eye_01shjnt_068|r_eye/i.test(o.name) && !/end/i.test(o.name)) {
          agathaEyeR = o
        }
        if (!agathaHeadBone && /head_top|neck_top|head_jaw|head/i.test(o.name) && !/end/i.test(o.name)) {
          agathaHeadBone = o
        }
      }
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
        if (m.color) {
          m.emissive = new THREE.Color(0x220c10)
          m.emissiveIntensity = 0.35
        }
        m.needsUpdate = true
      })
    })

    // Agatha's skeleton height is ~57 units facing +Z; scale 0.036 puts her upper torso & face terrifyingly large
    agathaModel.scale.setScalar(0.036)
    agathaModel.position.set(0, -1.78, -0.20)
    agathaModel.rotation.set(0, 0, 0)
    agathaGroup.add(agathaModel)

    if (gltf.animations?.length > 0) {
      agathaMixer = new THREE.AnimationMixer(agathaModel)
      const clips = gltf.animations.filter((c) => c.duration > 0.1 && /jumpscare/i.test(c.name))
      const usableClips = clips.length > 0 ? clips : gltf.animations.filter((c) => c.duration > 0.1)
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
  const scareKeyLight = new THREE.PointLight(0xf6f8ff, 0, 7.0)
  scareKeyLight.position.set(0, 0.14, -0.10)
  scareKeyLight.visible = false
  cam.add(scareKeyLight)

  const scareLight = new THREE.PointLight(0xff1008, 0, 6.0)
  scareLight.position.set(0, -0.26, -0.18)
  scareLight.visible = false
  cam.add(scareLight)

  const getFacePivotLocal = () => {
    if (!agathaModel) return false
    agathaModel.updateMatrixWorld(true)
    if (agathaEyeL && agathaEyeR) {
      agathaEyeL.getWorldPosition(tmpHeadWorld)
      agathaEyeR.getWorldPosition(tmpEyeWorld)
      tmpHeadWorld.lerp(tmpEyeWorld, 0.5)
    } else if (agathaHeadBone) {
      agathaHeadBone.getWorldPosition(tmpHeadWorld)
    } else {
      return false
    }
    agathaPivot.worldToLocal(tmpHeadLocal.copy(tmpHeadWorld))
    return true
  }

  // Snap Agatha's face center rapidly into targetZ (-1.75m -> -0.36m in ~0.12s) and keep eyes centered
  const alignFaceToCamera = (targetZ, snapSpeed) => {
    if (!getFacePivotLocal()) return
    agathaModel.position.x -= tmpHeadLocal.x * snapSpeed
    agathaModel.position.y -= (tmpHeadLocal.y + 0.01) * snapSpeed
    agathaModel.position.z += (targetZ - tmpHeadLocal.z) * snapSpeed
    // Hard safety guard so nose/teeth never intersect camera near plane (-0.28m)
    if (tmpHeadLocal.z > -0.32) {
      agathaModel.position.z -= (tmpHeadLocal.z - (-0.32))
    }
  }

  const defs = {
    agatha: {
      cond: () => true,
      start() {
        clearTimeout(hbTimeout)
        agathaPivot.visible = true
        scareKeyLight.visible = true
        scareKeyLight.intensity = 22.0
        scareLight.visible = true
        scareLight.intensity = 15.0
        agathaGroup.position.set(0, 0, 0)
        agathaGroup.rotation.set(0, 0, 0)
        agathaGroup.scale.setScalar(0.85)
        if (agathaModel) {
          agathaModel.position.set(0, -1.78, -1.55)
        }
        midFlashFired = false
        activeDuration = 2.25

        if (agathaMixer && agathaActions.length > 0) {
          agathaMixer.stopAllAction()
          const picked = agathaActions[Math.floor(Math.random() * agathaActions.length)]
          activeAction = picked.action
          // Energetic aggressive speed so the lunge feels immediate and violent
          const timeScale = picked.duration < 1.3 ? 0.92 : 1.25
          activeAction.reset()
          activeAction.timeScale = timeScale
          activeAction.play()
          agathaMixer.update(0.03)
          activeDuration = Math.min(2.6, Math.max(1.85, picked.duration / timeScale))
          alignFaceToCamera(-1.65, 1.0)
        } else {
          activeAction = null
        }

        // Play the attached scary scream sound ONLY when this jumpscare happens
        if (A()?.jumpscareSting) {
          A().jumpscareSting(1.45)
        } else {
          A()?.playScreamClip?.()
        }
        E.shake?.(4.5, activeDuration)
        flash?.('#7a0000', 0.36, 130)
        sc.v = 0.05
      },
      upd(t, dt) {
        if (agathaMixer) {
          agathaMixer.update(dt || 0.016)
        }

        // Explosive pop-out lunge in the first 0.12s: -1.65m -> -0.35m straight into the player's face
        const lungeProgress = Math.min(1, t / 0.12)
        const easeSnap = 1 - Math.pow(1 - lungeProgress, 4)
        const pulseZ = lungeProgress >= 1 ? Math.max(0, Math.sin((t - 0.12) * 28)) * 0.045 : 0
        const desiredFaceZ = -1.65 + easeSnap * 1.30 + pulseZ // reaches -0.35m -> -0.305m at full snap

        if (!midFlashFired && t >= 0.11) {
          midFlashFired = true
          flash?.('#ffffff', 0.24, 60)
        }

        // Dramatic FOV punch: 72 -> 50 deg on impact, holding tight then snapping back near end
        if (cam && typeof cam.updateProjectionMatrix === 'function') {
          const exitFade = t > activeDuration - 0.22 ? Math.min(1, (t - (activeDuration - 0.22)) / 0.22) : 0
          const targetFov = baseFov - (22 * easeSnap * (1 - exitFade))
          if (Math.abs(cam.fov - targetFov) > 0.2) {
            cam.fov = targetFov
            cam.updateProjectionMatrix()
          }
        }

        // Aggressive horror strobe + crimson rim lighting
        const strobe = Math.sin(t * 58) > -0.15 ? 24.0 : 3.5
        sc.v = Math.sin(t * 48) > 0 ? 0.55 : 0.04
        scareKeyLight.intensity = strobe
        scareLight.intensity = 13.0 + Math.sin(t * 47) * 7.0

        // Violent demonic thrash & head-snap tremors once in the player's face
        const thrashAmp = lungeProgress >= 1 ? 1.0 : lungeProgress * 0.3
        agathaGroup.position.x = Math.sin(t * 72) * 0.032 * thrashAmp
        agathaGroup.position.y = Math.cos(t * 61) * 0.026 * thrashAmp
        agathaGroup.rotation.z = (Math.sin(t * 37) * 0.14 + Math.sin(t * 89) * 0.05) * thrashAmp
        agathaGroup.scale.setScalar(0.85 + easeSnap * 0.24 + Math.sin(t * 50) * 0.035 * thrashAmp)

        alignFaceToCamera(desiredFaceZ, lungeProgress < 1 ? 0.85 : Math.min(1, (dt || 0.016) * 24))

        if (t > activeDuration) {
          if (activeAction) {
            activeAction.stop()
            activeAction = null
          }
          agathaPivot.visible = false
          scareKeyLight.visible = false
          scareLight.visible = false
          sc.v = 1
          agathaGroup.position.set(0, 0, -1.75)
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

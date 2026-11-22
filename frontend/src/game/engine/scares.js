// Jump-scare director: animated 3D Agatha jumpscare (agatha_only_jumpscares.glb) on a 5-6 minute randomized schedule.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const rnd = (a, b) => a + Math.random() * (b - a)
const SCARE_MIN_INTERVAL_SEC = 300 // 5 minutes
const SCARE_MAX_INTERVAL_SEC = 360 // 6 minutes
const nextScareDelay = () => rnd(SCARE_MIN_INTERVAL_SEC, SCARE_MAX_INTERVAL_SEC)

export function createScares(E, h) {
  const { cam, sc } = E
  const A = () => h.audio
  const flash = (c, a, ms) => h.onFlash?.(c, a, ms)

  // Agatha jumpscare rig attached directly to camera so it frames regardless of look angle
  const agathaPivot = new THREE.Group()
  agathaPivot.visible = false
  agathaPivot.userData.np = 1
  cam.add(agathaPivot)

  const agathaGroup = new THREE.Group()
  agathaGroup.position.set(0, 0, -1.65)
  agathaGroup.userData.np = 1
  agathaPivot.add(agathaGroup)

  let agathaModel = null
  let agathaMixer = null
  let agathaActions = []
  let activeAction = null
  let activeDuration = 2.4
  let agathaHeadBone = null
  const tmpHeadWorld = new THREE.Vector3()
  const tmpHeadLocal = new THREE.Vector3()

  const setupLoadedAgatha = (gltf) => {
    if (!gltf?.scene) return
    agathaModel = gltf.scene
    agathaModel.name = 'agatha_only_jumpscares'

        agathaModel.traverse((o) => {
          if (o.isBone && !agathaHeadBone && /head_top|neck_top|head/i.test(o.name) && !/jaw|eye|end/i.test(o.name)) {
            agathaHeadBone = o
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
                m.emissive = new THREE.Color(0x180e12)
                m.emissiveIntensity = 0.28
              }
              m.needsUpdate = true
            })
        })

        // Agatha's skeleton height is ~57 units facing +Z; scale 0.03 = ~1.7m tall, head aligned at eye level
        agathaModel.scale.setScalar(0.03)
        agathaModel.position.set(0, -1.62, -0.25)
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
        .catch ((err) => console.warn('[BEDROOM AGATHA GLB LOAD FAILED]', err))
    }
  }

// Dramatic camera-mounted key light + red underlight so Agatha reads sharply in the dark bedroom
const scareKeyLight = new THREE.PointLight(0xfff0e6, 0, 6.0)
scareKeyLight.position.set(0, 0.16, -0.22)
scareKeyLight.visible = false
cam.add(scareKeyLight)

const scareLight = new THREE.PointLight(0xff1e10, 0, 5.0)
scareLight.position.set(0, -0.25, -0.45)
scareLight.visible = false
cam.add(scareLight)

    const keepHeadFramed = (dt) => {
      if (!agathaModel || !agathaHeadBone) return
      agathaModel.updateMatrixWorld(true)
      agathaHeadBone.getWorldPosition(tmpHeadWorld)
      agathaPivot.worldToLocal(tmpHeadLocal.copy(tmpHeadWorld))
      // Never let head clip inside camera near plane (-0.52m) or drift below bottom of screen
      if (tmpHeadLocal.z > -0.56) {
        agathaGroup.position.z -= (tmpHeadLocal.z - (-0.56))
      } else if (tmpHeadLocal.z < -1.35) {
        agathaGroup.position.z += ((-1.20) - tmpHeadLocal.z) * Math.min(1, (dt || 0.016) * 8)
      }
        if (tmpHeadLocal.y < -0.18) {
          agathaGroup.position.y += (-0.06 - tmpHeadLocal.y) * Math.min(1, (dt || 0.016) * 8)
        }
      }

      const defs = {
          agatha: {
            cond: () => true,
            start() {
              agathaPivot.visible = true
              scareKeyLight.visible = true
              scareKeyLight.intensity = 15.0
              scareLight.visible = true
                scareLight.intensity = 11.0
                agathaGroup.position.set(0, 0, -1.65)
                agathaGroup.rotation.set(0, 0, 0)
                agathaGroup.scale.setScalar(1.0)
                activeDuration = 2.4

                if (agathaMixer && agathaActions.length > 0) {
                  agathaMixer.stopAllAction()
                  const picked = agathaActions[Math.floor(Math.random() * agathaActions.length)]
                  activeAction = picked.action
                  const timeScale = picked.duration < 1.5 ? 0.72 : 0.88
                  activeAction.reset()
                  activeAction.timeScale = timeScale
                  activeAction.play()
                  agathaMixer.update(0.02)
                  activeDuration = Math.min(3.2, Math.max(1.85, picked.duration / timeScale))
                  keepHeadFramed(1)
                } else {
                  activeAction = null
                }

                // Play the attached scary scream sound ONLY when this jumpscare happens
                if (A()?.jumpscareSting) {
                  A().jumpscareSting(1.4)
                } else {
                  A()?.playScreamClip?.()
                }
                E.shake?.(2.6, Math.min(2.1, activeDuration))
                flash?.('#550000', 0.28, 150)
                sc.v = 0.22
              },
              upd(t, dt) {
                  if (agathaMixer) {
                    agathaMixer.update(dt || 0.016)
                  }
                  sc.v = Math.sin(t * 38) > 0 ? 0.65 : 0.14
                  scareKeyLight.intensity = 13.5 + Math.sin(t * 42) * 3.5
                  scareLight.intensity = 9.0 + Math.sin(t * 46) * 4.5

                  agathaGroup.position.x = Math.sin(t * 52) * 0.022
                  agathaGroup.position.y = Math.cos(t * 44) * 0.022
                  agathaGroup.rotation.z = Math.sin(t * 30) * 0.05
                  keepHeadFramed(dt)

                      if (t > activeDuration) {
                        if (activeAction) {
                          activeAction.stop()
                          activeAction = null
                        }
                        agathaPivot.visible = false
                        scareKeyLight.visible = false
                        scareLight.visible = false
                        sc.v = 1
                        agathaGroup.position.set(0, 0, -1.65)
                        agathaGroup.rotation.set(0, 0, 0)
                        agathaGroup.scale.setScalar(1.0)
                        return true
                      }
                    }
                  }
                }

                let act = null, at = 0
                // Strictly randomized 5 to 6 minute timeframe (300 - 360 seconds)
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
                      triggerDoorScare: () => { },
                      triggerWardrobeScare: () => { },
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
                          if (agathaMixer) {
                            try { agathaMixer.stopAllAction() } catch (_) { }
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

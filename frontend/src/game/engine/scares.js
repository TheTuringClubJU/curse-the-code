// Jump-scare director: clown jumpscare at balanced intervals. In debug/play mode keys 1-5 or J trigger it directly.
import * as THREE from 'three'
import * as X from './tex.js'

const rnd = (a, b) => a + Math.random() * (b - a)

function buildClownTexture() {
  const base = X.faceC({ eye: '#ff1e1e', glow: true, mouth: true, seed: 9 })
  const g = base.getContext('2d')
  if (!g) return base
  const cx = base.width / 2
  // Pale cracked greasepaint highlights
  g.fillStyle = 'rgba(245, 240, 236, 0.25)'
  g.beginPath()
  g.ellipse(cx, 285, 92, 132, 0, 0, Math.PI * 2)
  g.fill()
  // Crimson diamond clown eye markings & sinister smears
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
  // Smeared crimson grin extending up the cheeks
  g.strokeStyle = 'rgba(165, 8, 12, 0.95)'
  g.lineWidth = 14
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx - 88, 378)
  g.quadraticCurveTo(cx, 480, cx + 88, 378)
  g.stroke()
  // Painted bulbous crimson clown nose
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

  // Clown jumpscare rig attached to camera
  const clownPivot = new THREE.Group()
  clownPivot.visible = false
  clownPivot.userData.np = 1
  cam.add(clownPivot)

  const clownGroup = new THREE.Group()
  clownGroup.position.set(0, -0.05, -1.55)
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

  const scareLight = new THREE.PointLight(0xff2200, 0, 5.0)
  scareLight.position.set(0, 0, -0.4)
  scareLight.visible = false
  cam.add(scareLight)

  const defs = {
    clown: {
      cond: () => true,
      start() {
        clownPivot.visible = true
        scareLight.visible = true
        scareLight.intensity = 10.0
        clownGroup.position.set(0, -0.05, -1.55)
        clownGroup.rotation.set(0, 0, 0)
        clownGroup.scale.setScalar(1.0)
        A()?.stinger?.(1.0)
        A()?.screech?.(E.px(), E.pz())
        E.shake?.(2.8, 4.2)
        flash?.('#800000', 0.85, 450)
        sc.v = 0.05
      },
      upd(t) {
        sc.v = Math.sin(t * 38) > 0 ? 0.85 : 0.06
        scareLight.intensity = 8.0 + Math.sin(t * 45) * 4.0

        const lunge = Math.sin(Math.min(Math.PI * 0.5, t * 3.0)) * 0.82
        const spasm = Math.sin(t * 26) * 0.035
        clownGroup.position.z = -1.55 + lunge + spasm
        clownGroup.position.x = Math.sin(t * 55) * 0.025
        clownGroup.position.y = -0.05 + Math.cos(t * 45) * 0.025
        clownGroup.rotation.z = Math.sin(t * 32) * 0.09
        clownGroup.scale.setScalar(1.0 + Math.min(0.45, t * 0.35))

        if (t > 4.2) {
          clownPivot.visible = false
          scareLight.visible = false
          sc.v = 1
          clownGroup.position.set(0, -0.05, -1.55)
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
  // Reduced frequency: first jumpscare strikes ~45s after entering room
  let nextAt = 45

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
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || !document.pointerLockElement) return
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
          // Reduced frequency: subsequent jumpscares trigger every 90-140s
          nextAt = t + rnd(90, 140)
        }
        return
      }
      // Never trigger while a modal is open / player is typing (pointer is unlocked).
      // Postpone nextAt so closing a modal doesn't immediately ambush the player on frame 1.
      if (typeof document !== 'undefined' && !document.pointerLockElement) {
        if (t >= nextAt) {
          nextAt = t + rnd(30, 60)
        }
        return
      }
      if (t < nextAt || E.paused) return
      trigger()
    },
    dispose() {
      if (clownPivot.parent) clownPivot.parent.remove(clownPivot)
      if (scareLight.parent) scareLight.parent.remove(scareLight)
      if (typeof window !== 'undefined' && onKey) {
        window.removeEventListener('keydown', onKey)
      }
    }
  }
}

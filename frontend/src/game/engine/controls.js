// ============================================================================
// SINGLE SOURCE OF TRUTH: PLAYER CONTROLS (WASD, MOUSE LOOK, INTERACTION)
// ============================================================================
// Rules:
// 1. WASD + Arrow Keys never get blocked by any state flag.
// 2. Mouse Look has true continuous 360 yaw rotation without any limit/clamping.
// 3. Left Click toggles pointer lock or drag-looks around (mouse view toggle / drag).
// 4. [E] Key and Right Mouse Click (button === 2) identically trigger onInteract(target).
// ============================================================================

export function setupControls({
  canvas,
  onInteract,
  onTargetChange,
  getAudio,
  getSolids,
  roomSize,
  spawn
}) {
  const [W, H, D] = roomSize;
  let px = spawn[0], pz = spawn[1], yaw = spawn[2], pitch = 0;
  let targetYaw = spawn[2], targetPitch = 0;
  let sensitivity = 1.0;
  let walk = 0, lastStep = 0;
  let currentTarget = null;
  let inputPaused = false;
  let overrideActive = false;
  let overrideYaw = 0;
  let overridePitch = 0;
  const activeKeys = new Set();

  // Pointer lock status
  const checkPointerLocked = () => !!(
    document.pointerLockElement ||
    document.mozPointerLockElement ||
    document.webkitPointerLockElement
  );

  const requestLock = () => {
    inputPaused = false;
    try {
      const targetEl = canvas || document.body;
      if (targetEl && targetEl.requestPointerLock) {
        targetEl.requestPointerLock();
      }
    } catch (e) {}
  };

  const unlock = () => {
    activeKeys.clear();
    isPointerDown = false;
    prevClientX = null;
    prevClientY = null;
    try { document.exitPointerLock?.(); } catch (e) {}
  };

  // Collision logic
  const checkCollision = (x, z) => {
    if (Math.abs(x) > W / 2 - 0.35 || Math.abs(z) > D / 2 - 0.35) return true;
    const solids = getSolids() || [];
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      const dx = Math.max(s.x0 - x, 0, x - s.x1);
      const dz = Math.max(s.z0 - z, 0, z - s.z1);
      if (dx * dx + dz * dz < 0.045) return true;
    }
    return false;
  };

  // Safe Spawn Unstuck: ensure player never spawns wedged in walls or furniture
  if (checkCollision(px, pz)) {
    let unstuck = false;
    for (let r = 0.2; r <= 3.0 && !unstuck; r += 0.2) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const testX = px + Math.cos(a) * r;
        const testZ = pz + Math.sin(a) * r;
        if (!checkCollision(testX, testZ)) {
          px = testX;
          pz = testZ;
          unstuck = true;
          break;
        }
      }
    }
  }

  // Mouse Look: Continuous 360 rotation + tracked cursor NDC for unlocked point-and-click
  let prevClientX = null, prevClientY = null;
  let downClientX = null, downClientY = null;
  let isPointerDown = false;
  let dragMoved = false;
  let lastLockChangeAt = 0;
  const pointerNDC = { x: 0, y: 0 };
  const clampDelta = (v) => Math.max(-75, Math.min(75, v));

  // Cached canvas rect prevents synchronous DOM reflow on mousemove
  let cachedRect = canvas?.getBoundingClientRect?.() || null;
  const refreshRect = () => {
    cachedRect = canvas?.getBoundingClientRect?.() || null;
  };
  window.addEventListener('resize', refreshRect, { passive: true });

  const updatePointerNDC = (e) => {
    if (!cachedRect || !cachedRect.width || !cachedRect.height) refreshRect();
    if (!cachedRect || !cachedRect.width || !cachedRect.height || e.clientX === undefined || e.clientY === undefined) return;
    pointerNDC.x = ((e.clientX - cachedRect.left) / cachedRect.width) * 2 - 1;
    pointerNDC.y = -(((e.clientY - cachedRect.top) / cachedRect.height) * 2 - 1);
  };

  const onMouseDown = (e) => {
    if (inputPaused) return;
    if (!checkPointerLocked()) updatePointerNDC(e);
    if (e.button === 0) {
      isPointerDown = true;
      dragMoved = false;
      downClientX = e.clientX;
      downClientY = e.clientY;
      prevClientX = e.clientX;
      prevClientY = e.clientY;
    }
  };

  const onMouseUp = (e) => {
    if (e.button === 0) {
      isPointerDown = false;
      prevClientX = null;
      prevClientY = null;
      downClientX = null;
      downClientY = null;
      return;
    }
    if (!inputPaused && e.button === 2) {
      const onCanvas = checkPointerLocked() || e.target === canvas || canvas?.contains?.(e.target);
      if (onCanvas && currentTarget) {
        e.preventDefault?.();
        e.stopPropagation?.();
        onInteract?.(currentTarget);
      }
    }
  };

  const onMouseMove = (e) => {
    if (inputPaused) return;
    const locked = checkPointerLocked();
    if (!locked) updatePointerNDC(e);
    let rawMx = 0, rawMy = 0;

    if (locked) {
      rawMx = e.movementX ?? 0;
      rawMy = e.movementY ?? 0;
      // Ignore single-frame pointer-warp outlier spikes right as macOS Chromium engages lock
      if (performance.now() - lastLockChangeAt < 80 && (Math.abs(rawMx) > 45 || Math.abs(rawMy) > 45)) {
        return;
      }
    } else if (isPointerDown) {
      // Unlocked fallback: Left/Right drag-to-look while holding mouse button
      if (e.clientX !== undefined && prevClientX !== null) {
        rawMx = e.clientX - prevClientX;
        rawMy = e.clientY - prevClientY;
        if (downClientX !== null && Math.hypot(e.clientX - downClientX, e.clientY - downClientY) > 4) {
          dragMoved = true;
        }
      }
      prevClientX = e.clientX;
      prevClientY = e.clientY;
    } else {
      prevClientX = e.clientX;
      prevClientY = e.clientY;
    }

    const mx = clampDelta(rawMx);
    const my = clampDelta(rawMy);
    if (mx !== 0 || my !== 0) {
      const sens = (locked ? 0.0024 : 0.0058) * sensitivity;
      targetYaw -= mx * sens;
      targetPitch = Math.max(-1.45, Math.min(1.45, targetPitch - my * sens));
    }
  };

  // Key Listeners (WASD + E)
  const onKeyDown = (e) => {
    if (inputPaused) return;
    const tag = (e.target?.tagName || document.activeElement?.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
      return;
    }
    const isE = e.code === 'KeyE' || e.key === 'e' || e.key === 'E';
    if (isE && !e.repeat) {
      const t = currentTarget;
      if (t) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        onInteract?.(t);
        return;
      }
    }

    activeKeys.add(e.code);
    activeKeys.add(e.key.toLowerCase());
  };

  const onKeyUp = (e) => {
    const tag = (e.target?.tagName || document.activeElement?.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
      return;
    }
    activeKeys.delete(e.code);
    activeKeys.delete(e.key.toLowerCase());
  };

  const onWindowBlur = () => {
    activeKeys.clear();
    prevClientX = null;
    prevClientY = null;
    downClientX = null;
    downClientY = null;
    isPointerDown = false;
    dragMoved = false;
  };

  const onPointerLockChange = () => {
    lastLockChangeAt = performance.now();
    prevClientX = null;
    prevClientY = null;
  };

  const onContextMenu = (e) => {
    if (checkPointerLocked() || e.target === canvas || canvas?.contains?.(e.target)) {
      e.preventDefault();
    }
  };

  // Left click strictly controls mouse-look / pointer lock toggle (E and Right-Click interact)
  const onWindowClick = (e) => {
    if (inputPaused || e.button !== 0) return;
    if (e.target === canvas || canvas?.contains?.(e.target)) {
      if (dragMoved) {
        dragMoved = false;
        return;
      }
      if (!checkPointerLocked()) {
        requestLock();
      }
    }
  };

  // Attach global event listeners
  window.addEventListener('keydown', onKeyDown, { capture: true, passive: false });
  window.addEventListener('keyup', onKeyUp, { capture: true, passive: true });
  window.addEventListener('mousedown', onMouseDown, { passive: true });
  window.addEventListener('mouseup', onMouseUp, { passive: true });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('click', onWindowClick, { passive: true });
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('blur', onWindowBlur);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  // Per-frame physics + frame-coherent camera smoothing
  const update = (dt) => {
    if (overrideActive) {
      const snapAlpha = 1 - Math.exp(-26 * dt);
      const dYaw = Math.atan2(Math.sin(overrideYaw - yaw), Math.cos(overrideYaw - yaw));
      yaw += dYaw * snapAlpha;
      pitch += (overridePitch - pitch) * snapAlpha;
      targetYaw = yaw;
      targetPitch = pitch;
      return { px, pz, yaw, pitch, walk, isMoving: false };
    }
    if (inputPaused) {
      return { px, pz, yaw, pitch, walk, isMoving: false };
    }
    const rotAlpha = 1 - Math.exp(-52 * dt);
    yaw += (targetYaw - yaw) * rotAlpha;
    pitch += (targetPitch - pitch) * rotAlpha;
    const moveF = (activeKeys.has('KeyW') || activeKeys.has('w') || activeKeys.has('ArrowUp')) ? 1 : 0;
    const moveB = (activeKeys.has('KeyS') || activeKeys.has('s') || activeKeys.has('ArrowDown')) ? 1 : 0;
    const moveR = (activeKeys.has('KeyD') || activeKeys.has('d') || activeKeys.has('ArrowRight')) ? 1 : 0;
    const moveL = (activeKeys.has('KeyA') || activeKeys.has('a') || activeKeys.has('ArrowLeft')) ? 1 : 0;

    const f = moveF - moveB;
    const s = moveR - moveL;

    let isMoving = false;
    if (f !== 0 || s !== 0) {
      const isShift = activeKeys.has('ShiftLeft') || activeKeys.has('ShiftRight');
      const speed = isShift ? 3.4 : 2.4;
      const l = Math.hypot(f, s);
      const sp = (speed * dt) / l;

      const dx = (-Math.sin(yaw) * f + Math.cos(yaw) * s) * sp;
      const dz = (-Math.cos(yaw) * f - Math.sin(yaw) * s) * sp;

      if (!checkCollision(px + dx, pz)) px += dx;
      if (!checkCollision(px, pz + dz)) pz += dz;

      walk += dt * 8;
      isMoving = true;

      if (Math.floor(walk / Math.PI) !== lastStep) {
        lastStep = Math.floor(walk / Math.PI);
        const audio = getAudio();
        audio?.step?.(isShift ? 1 : 0.7);
      }
    }

    return {
      px,
      pz,
      yaw,
      pitch,
      walk,
      isMoving
    };
  };

  const setTarget = (id) => {
    if (id !== currentTarget) {
      currentTarget = id;
      if (id) window.__lastAimTarget = id;
      onTargetChange?.(id);
    }
  };

  const dispose = () => {
    window.removeEventListener('keydown', onKeyDown, { capture: true });
    window.removeEventListener('keyup', onKeyUp, { capture: true });
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('click', onWindowClick);
    window.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('blur', onWindowBlur);
    window.removeEventListener('resize', refreshRect);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    activeKeys.clear();
  };

  return {
    update,
    setTarget,
    getTarget: () => currentTarget,
    setPaused: (paused) => {
      inputPaused = Boolean(paused);
      if (inputPaused) {
        activeKeys.clear();
        isPointerDown = false;
        dragMoved = false;
      }
    },
    setCameraOverride: (active, nextYaw = null, nextPitch = null) => {
      overrideActive = Boolean(active);
      if (overrideActive) {
        activeKeys.clear();
        isPointerDown = false;
        dragMoved = false;
        if (typeof nextYaw === 'number' && !Number.isNaN(nextYaw)) overrideYaw = nextYaw;
        if (typeof nextPitch === 'number' && !Number.isNaN(nextPitch)) overridePitch = nextPitch;
      }
    },
    setSensitivity: (s) => {
      sensitivity = Math.max(0.3, Math.min(2.5, Number(s) || 1.0));
    },
    requestLock,
    unlock,
    isLocked: checkPointerLocked,
    isSprinting: () => (
      (activeKeys.has('ShiftLeft') || activeKeys.has('ShiftRight'))
      && (activeKeys.has('KeyW') || activeKeys.has('KeyA') || activeKeys.has('KeyS') || activeKeys.has('KeyD') || activeKeys.has('ArrowUp') || activeKeys.has('ArrowDown'))
    ),
    getPointerNDC: () => (checkPointerLocked() ? { x: 0, y: 0 } : pointerNDC),
    setView: (x, z, y, p = 0) => {
      px = x; pz = z;
      yaw = targetYaw = y;
      pitch = targetPitch = p;
    },
    getPos: () => ({ x: px, z: pz, yaw: targetYaw, pitch: targetPitch }),
    dispose
  };
}

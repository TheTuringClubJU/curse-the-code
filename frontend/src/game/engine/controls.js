// ============================================================================
// SINGLE SOURCE OF TRUTH: PLAYER CONTROLS (WASD, MOUSE LOOK, INTERACTION)
// ============================================================================
// Rules:
// 1. WASD + Arrow Keys never get blocked by any state flag.
// 2. Mouse Look has true continuous 360 yaw rotation without any limit/clamping.
// 3. Pointer lock automatically requests on canvas click. Drag-look fallback works anytime.
// 4. E Key and Mouse Click reliably trigger onInteract(target).
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
  let walk = 0, lastStep = 0;
  let currentTarget = null;
  const activeKeys = new Set();

  // Pointer lock status
  const checkPointerLocked = () => !!(
    document.pointerLockElement ||
    document.mozPointerLockElement ||
    document.webkitPointerLockElement
  );

  const requestLock = () => {
    try {
      const targetEl = canvas || document.body;
      if (targetEl && targetEl.requestPointerLock) {
        targetEl.requestPointerLock({ unadjustedMovement: true })?.catch?.(() => {
          targetEl.requestPointerLock?.();
        });
      }
    } catch (e) {
      try { (canvas || document.body).requestPointerLock?.(); } catch (_) {}
    }
  };

  const unlock = () => {
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
      if (dx * dx + dz * dz < 0.08) return true;
    }
    return false;
  };

  // Mouse Look: Continuous 360 rotation
  let prevClientX = null, prevClientY = null;
  let isPointerDown = false;

  const onMouseDown = (e) => {
    if (e.button === 0) {
      isPointerDown = true;
      prevClientX = e.clientX;
      prevClientY = e.clientY;
    }
  };

  const onMouseUp = () => {
    isPointerDown = false;
    prevClientX = null;
    prevClientY = null;
  };

  const onMouseMove = (e) => {
    const locked = checkPointerLocked();
    let mx = 0, my = 0;

    if (locked) {
      mx = e.movementX ?? 0;
      my = e.movementY ?? 0;
    } else {
      // Unlocked: if moving mouse or dragging, calculate delta
      if (e.clientX !== undefined && prevClientX !== null) {
        mx = e.clientX - prevClientX;
        my = e.clientY - prevClientY;
      }
      prevClientX = e.clientX;
      prevClientY = e.clientY;
    }

    if (mx !== 0 || my !== 0) {
      // Invert sign of delta for smooth camera yaw
      yaw -= mx * 0.0035;
      pitch = Math.max(-1.45, Math.min(1.45, pitch - my * 0.0035));
    }
  };

  // Key Listeners (WASD + E)
  const onKeyDown = (e) => {
    const tag = (e.target?.tagName || document.activeElement?.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
      return;
    }
    const isE = e.code === 'KeyE' || e.key === 'e' || e.key === 'E';
    if (isE && !e.repeat) {
      const t = currentTarget || window.__lastAimTarget;
      if (t) {
        e.preventDefault();
        e.stopPropagation();
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
    isPointerDown = false;
  };

  const onPointerLockChange = () => {
    prevClientX = null;
    prevClientY = null;
  };

  const onWindowClick = (e) => {
    if (e.target === canvas || canvas?.contains?.(e.target)) {
      requestLock();
      const t = currentTarget || window.__lastAimTarget;
      if (t) {
        onInteract?.(t);
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
  window.addEventListener('blur', onWindowBlur);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  // Per-frame physics
  const update = (dt) => {
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
    window.removeEventListener('blur', onWindowBlur);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    activeKeys.clear();
  };

  return {
    update,
    setTarget,
    getTarget: () => currentTarget,
    requestLock,
    unlock,
    isLocked: checkPointerLocked,
    setView: (x, z, y, p = 0) => { px = x; pz = z; yaw = y; pitch = p; },
    getPos: () => ({ x: px, z: pz, yaw, pitch }),
    dispose
  };
}

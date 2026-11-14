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
  let px = spawn[0], pz = spawn[2] ?? spawn[1], yaw = spawn[3] ?? 0, pitch = 0;
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
        const result = targetEl.requestPointerLock();
        result?.catch?.(() => {});
      }
    } catch (e) {
      try { (canvas || document.body).requestPointerLock?.(); } catch (_) {}
    }
  };

  const unlock = () => {
    try { document.exitPointerLock?.(); } catch (e) {}
  };

  const R_MARGIN = 0.2828; // Math.sqrt(0.08)
  const BOUND_MARGIN = 0.35;

  // Collision logic
  const checkCollision = (x, z) => {
    if (Math.abs(x) > W / 2 - BOUND_MARGIN || Math.abs(z) > D / 2 - BOUND_MARGIN) return true;
    const solids = getSolids() || [];
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      const dx = Math.max(s.x0 - x, 0, x - s.x1);
      const dz = Math.max(s.z0 - z, 0, z - s.z1);
      if (dx * dx + dz * dz < 0.08) return true;
    }
    return false;
  };

  // Signed distance / clearance to obstacles (positive = free, negative = penetrating)
  const getClearance = (x, z) => {
    let minClearance = Math.min(
      W / 2 - BOUND_MARGIN - Math.abs(x),
      D / 2 - BOUND_MARGIN - Math.abs(z)
    );
    const solids = getSolids() || [];
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) {
        const dEdge = Math.min(x - s.x0, s.x1 - x, z - s.z0, s.z1 - z);
        minClearance = Math.min(minClearance, -R_MARGIN - dEdge);
      } else {
        const dx = Math.max(s.x0 - x, 0, x - s.x1);
        const dz = Math.max(s.z0 - z, 0, z - s.z1);
        const dist = Math.hypot(dx, dz) - R_MARGIN;
        minClearance = Math.min(minClearance, dist);
      }
    }
    return minClearance;
  };

  // Depenetration resolver: gently pushes the player outside of overlapping solids / walls
  const resolvePenetration = () => {
    px = Math.max(-W / 2 + BOUND_MARGIN, Math.min(W / 2 - BOUND_MARGIN, px));
    pz = Math.max(-D / 2 + BOUND_MARGIN, Math.min(D / 2 - BOUND_MARGIN, pz));

    const solids = getSolids() || [];
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (px >= s.x0 && px <= s.x1 && pz >= s.z0 && pz <= s.z1) {
        const dLeft = px - s.x0;
        const dRight = s.x1 - px;
        const dTop = pz - s.z0;
        const dBottom = s.z1 - pz;
        const minD = Math.min(dLeft, dRight, dTop, dBottom);
        const pushR = R_MARGIN + 0.005;
        if (minD === dLeft) px = s.x0 - pushR;
        else if (minD === dRight) px = s.x1 + pushR;
        else if (minD === dTop) pz = s.z0 - pushR;
        else pz = s.z1 + pushR;
      } else {
        const dx = Math.max(s.x0 - px, 0, px - s.x1);
        const dz = Math.max(s.z0 - pz, 0, pz - s.z1);
        const d2 = dx * dx + dz * dz;
        if (d2 < 0.08) {
          const dist = Math.hypot(dx, dz);
          const overlap = R_MARGIN - dist + 0.005;
          const nx = px < s.x0 ? -1 : (px > s.x1 ? 1 : 0);
          const nz = pz < s.z0 ? -1 : (pz > s.z1 ? 1 : 0);
          const len = Math.hypot(nx, nz) || 1;
          px += (nx / len) * overlap;
          pz += (nz / len) * overlap;
        }
      }
    }
  };

  // Ensure initial spawn is not trapped in any collision solid
  resolvePenetration();

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

    if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    activeKeys.add(e.code);
    activeKeys.add(e.key.toLowerCase());
  };

  const onKeyUp = (e) => {
    activeKeys.delete(e.code);
    if (e.key) activeKeys.delete(e.key.toLowerCase());
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
    if (!checkPointerLocked()) {
      activeKeys.clear();
    }
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      activeKeys.clear();
    }
  };

  const onWindowClick = (e) => {
    const isGameTarget = e.target === canvas || 
      canvas?.contains?.(e.target) || 
      canvas?.parentElement?.contains?.(e.target) ||
      e.target?.tagName === 'CANVAS';

    if (isGameTarget) {
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
  document.addEventListener('visibilitychange', onVisibilityChange);

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

      const curClearance = getClearance(px, pz);

      if (!checkCollision(px + dx, pz) || getClearance(px + dx, pz) > curClearance) {
        px += dx;
      }
      if (!checkCollision(px, pz + dz) || getClearance(px, pz + dz) > curClearance) {
        pz += dz;
      }

      resolvePenetration();

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
    document.removeEventListener('visibilitychange', onVisibilityChange);
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

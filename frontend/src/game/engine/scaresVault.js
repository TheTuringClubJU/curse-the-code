// Choreographed, Telegraphed Horror Director for Room 6: The Anointing Vault
// Replaces aimless random popups with clear atmospheric buildups, milestone-driven
// set-piece scares (6A Cell, 6B Reliquary, 6C Seal I, 6D Seal II), and a playable Stalker patrol.

export function createVaultScares(E, h = {}) {
  const fired = new Set();
  const timers = [];
  let elapsed = 0;
  let leftNarthex = false;
  let visitedSideWing = false;

  let scriptedBusyUntil = 0;
  let pendingStatueTurn = false;
  let pendingWestBreach = false;
  let pendingEastBlackout = false;

  // Active 3D lunge closeup animation
  let lungeT = -1;
  let lungeEntity = null;
  const baseFov = E.cam?.fov || 72;

  const schedule = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  };

  const setThreat = (phase, label = '') => {
    h.onThreatState?.(phase ? { phase, label } : null);
  };

  const getPlayerPose = () => {
    const px = E.px?.() ?? 0;
    const pz = E.pz?.() ?? 13.8;
    const yaw = E.yaw?.() ?? E.cam?.rotation?.y ?? 0;
    return { px, pz, yaw, fx: -Math.sin(yaw), fz: -Math.cos(yaw) };
  };

  const clampNaveSpot = (x, z) => [
    Math.max(-15.6, Math.min(15.6, x)),
    Math.max(-8.8, Math.min(14.8, z)),
  ];

  const lookingAt = (tx, tz, minDot = 0.65) => {
    const { px, pz, fx, fz } = getPlayerPose();
    const dx = tx - px;
    const dz = tz - pz;
    const len = Math.hypot(dx, dz) || 1;
    return (dx / len) * fx + (dz / len) * fz >= minDot;
  };

  const placeEntity = (entity, x, z, faceX, faceZ, lightIntensity = 2.6, tiltZ = 0) => {
    if (!entity) return;
    entity.position.set(x, 0, z);
    const dx = faceX - x;
    const dz = faceZ - z;
    entity.rotation.y = Math.atan2(dx, dz);
    entity.rotation.z = tiltZ;
    entity.visible = true;
    if (E.ref.ghostLight) {
      // Low side-angled crimson-amber rim light so apparitions keep chilling shadow contours (never studio-bleached white)
      const dist = Math.hypot(dx, dz) || 1;
      const nx = dx / dist;
      const nz = dz / dist;
      const frontOffset = Math.min(0.85, dist * 0.4);
      const sideOffset = 0.65;
      E.ref.ghostLight.position.set(
        x + nx * frontOffset - nz * sideOffset,
        1.38,
        z + nz * frontOffset + nx * sideOffset
      );
      E.ref.ghostLight.color.setHex(0xe0583c);
      E.ref.ghostLight.intensity = Math.min(3.4, Math.max(2.1, lightIntensity));
    }
  };

  const placeGhost = (x, z, faceX, faceZ, lightIntensity = 3.6, tiltZ = 0) =>
    placeEntity(E.ref.ghost, x, z, faceX, faceZ, lightIntensity, tiltZ);

  const placeStalker = (x, z, faceX, faceZ, lightIntensity = 3.8, tiltZ = 0) =>
    placeEntity(E.ref.stalker || E.ref.ghost, x, z, faceX, faceZ, lightIntensity, tiltZ);

  const hideGhost = () => {
    [E.ref.ghost, E.ref.stalker].forEach((entity) => {
      if (entity) {
        entity.visible = false;
        entity.rotation.z = 0;
      }
    });
    if (E.ref.ghostLight) E.ref.ghostLight.intensity = 0;
  };

  const playAgathaAnim = (animIndex = 0, speed = 1.0) => {
    if (!E.ref?.agathaMixer || !E.ref?.agathaActions) return;
    try {
      E.ref.agathaMixer.stopAllAction();
      const act = E.ref.agathaActions[animIndex] || E.ref.agathaActions[0];
      if (act) {
        act.reset();
        act.setLoop(1, 1);
        act.clampWhenFinished = true;
        act.timeScale = speed;
        act.play();
      }
    } catch (_) {}
  };

  const setGlobalLightScale = (val) => {
    if (E.sc) E.sc.v = val;
  };

  // High-impact telegraphed rush scare (surges forward from 3.8m to 1.8m in shadowed crimson rim light)
  const triggerPhantomLunge = (reasonMsg = null, preferStalker = false) => {
    if (E.ref.vaultRestored) return;
    lungeT = 0;
    lungeEntity = (preferStalker && E.ref.stalker) || E.ref.ghost || E.ref.stalker;
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.0);
    setThreat(null, '');

    const { px, pz, fx, fz } = getPlayerPose();
    setGlobalLightScale(0.18);
    const [gx, gz] = clampNaveSpot(px + fx * 3.8, pz + fz * 3.8);
    const tilt = (Math.random() < 0.5 ? -1 : 1) * 0.06;
    placeEntity(lungeEntity, gx, gz, px, pz, 3.8, tilt);
    playAgathaAnim(3, 1.35); // jumpscare4: violent snap lunge

    E.audio?.playAgathaScream?.(0.95);
    E.shake?.(2.1, 0.65);
    h.onFlash?.('#5c000a', 0.56, 220);
    h.onNightmarePulse?.(520);
    h.onGlassCrack?.();
    h.onScare?.('phantom_lunge', reasonMsg);
  };

  // Milestone 1: Inspecting core_glass — Agatha screams directly in front of the broken reliquary
  const triggerCoreGlassScare = () => {
    if (fired.has('core_glass_slam')) return false;
    fired.add('core_glass_slam');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.5);
    setThreat('surge', 'RELIQUARY SEAL FRACTURING');

    const { px, pz } = getPlayerPose();
    setGlobalLightScale(0.04);

    schedule(() => {
      if (E.ref.vaultRestored) return;
      const { px: curPx, pz: curPz, fx, fz } = getPlayerPose();
      const agathaX = curPx + fx * 1.4;
      const agathaZ = curPz + fz * 1.4;

      placeGhost(agathaX, agathaZ, curPx, curPz, 5.2, -0.05);
      playAgathaAnim(0, 1.2); // jumpscare1: violent double-handed screaming claw grab

      E.audio?.playAgathaScream?.(1.0);
      E.audio?.setTension?.(2.2);
      E.shake?.(2.4, 0.75);
      h.onGlassCrack?.();
      h.onFlash?.('#72000e', 0.64, 300);
      h.onNightmarePulse?.(720);
      h.onScare?.('core_glass_slam', 'Agatha shrieks from within the broken reliquary!');

      if (E.cam && E.cam.isPerspectiveCamera) {
        E.cam.fov = baseFov - 16;
        E.cam.updateProjectionMatrix();
      }

      if (E.ref.coreLight) E.ref.coreLight.intensity = 12.0;

      schedule(() => {
        hideGhost();
        setGlobalLightScale(1.0);
        setThreat(null, '');
        if (E.cam && E.cam.isPerspectiveCamera) {
          E.cam.fov = baseFov;
          E.cam.updateProjectionMatrix();
        }
      }, 1400);

      schedule(() => {
        E.audio?.setTension?.(1.2);
      }, 2800);
    }, 280);

    return true;
  };

  // NEW Agatha Jumpscare Condition: Nave Church Pew Ambush
  const triggerNaveAisleScare = () => {
    if (fired.has('nave_pew_ambush') || E.ref.vaultRestored) return;
    fired.add('nave_pew_ambush');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.2);
    setThreat('surge', 'SANCTUARY BREACH // AGATHA AWAKENS');

    E.audio?.playBonecrack?.(0.95);
    E.audio?.playBreathScared?.(0.92);
    setGlobalLightScale(0.12);

    schedule(() => {
      if (E.ref.vaultRestored) return;
      const { px, pz } = getPlayerPose();
      // Burst out from behind the front pew bank into the aisle in front of the player
      const ambushX = px <= 0 ? -1.8 : 1.8;
      const ambushZ = pz - 1.8;
      placeGhost(ambushX, ambushZ, px, pz, 4.8, 0.08);
      playAgathaAnim(2, 1.35); // jumpscare3: terrifying thrashing lunge

      E.audio?.playAgathaScream?.(1.0);
      E.shake?.(2.1, 0.65);
      h.onFlash?.('#68000c', 0.58, 260);
      h.onNightmarePulse?.(600);
      h.onScare?.('nave_pew_ambush', 'A ghastly Victorian form lunges from the pews!');

      if (E.cam && E.cam.isPerspectiveCamera) {
        E.cam.fov = baseFov - 14;
        E.cam.updateProjectionMatrix();
      }

      schedule(() => {
        hideGhost();
        setGlobalLightScale(1.0);
        setThreat(null, '');
        if (E.cam && E.cam.isPerspectiveCamera) {
          E.cam.fov = baseFov;
          E.cam.updateProjectionMatrix();
        }
      }, 1250);
    }, 260);
  };

  // Milestone 2: 6A Holding Cell 01 bars — crying cuts dead -> chain warning -> Agatha strikes bars
  const triggerEntryCellVanish = () => {
    if (fired.has('entry_cell_peek') || E.ref.vaultRestored) return;
    fired.add('entry_cell_peek');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.0);
    setThreat('warning', 'CELL 01 // RESTRAINTS SHIFTING');

    E.audio?.stopWomanCrying?.();
    E.audio?.chainsRattle?.();
    E.audio?.playBreathScared?.(0.92);
    E.shake?.(0.5, 0.35);

    schedule(() => {
      if (E.ref.vaultRestored) return;
      const { px, pz } = getPlayerPose();
      const prevCellIntensity = E.ref.cellLight?.intensity ?? 1.3;
      placeGhost(-3.75, 10.9, px, pz, 5.5, 0.08);
      playAgathaAnim(1, 1.35); // jumpscare2: vicious strike against cell bars
      if (E.ref.cellLight) E.ref.cellLight.intensity = 9.8;
      E.audio?.playBonecrack?.(0.92);
      E.audio?.playAgathaScream?.(0.95);
      E.shake?.(1.4, 0.5);
      h.onFlash?.('#64000b', 0.44, 220);
      h.onScare?.('entry_cell_peek', null);

      [140, 310, 520, 740].forEach((ms, i) => {
        schedule(() => {
          if (E.ref.vaultRestored) return;
          if (E.ref.cellLight) E.ref.cellLight.intensity = i % 2 === 0 ? 0.3 : 9.0;
        }, ms);
      });

      schedule(() => {
        hideGhost();
        if (E.ref.cellLight) E.ref.cellLight.intensity = prevCellIntensity;
        setThreat(null, '');
      }, 1250);
    }, 750);
  };

  // Milestone 3: 6D East Crypt Entry — lamp swings violently for 1.5s telegraph, then Stalker watches across 6E doorway
  const triggerEastBayPeek = () => {
    if (fired.has('east_stalker_flicker') || E.ref.vaultRestored) return;
    fired.add('east_stalker_flicker');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.4);
    setThreat('warning', '6D EAST BAY // ANOMALOUS CURRENT');

    E.ref.eastLampAgitated = true;
    E.audio?.creak?.();
    E.audio?.voltageBuzz?.();
    E.shake?.(0.55, 0.32);

    const { px, pz } = getPlayerPose();
    placeStalker(12.9, 5.65, px, pz, 4.2, -0.06);
    h.onScare?.('east_stalker_flicker', null);

    [220, 520, 880, 1280].forEach((ms, i) => {
      schedule(() => {
        if (E.ref.vaultRestored) return;
        setGlobalLightScale(i % 2 === 0 ? 0.16 : 0.92);
      }, ms);
    });

    schedule(() => {
      setGlobalLightScale(1.0);
      E.audio?.playStab?.(0.8);
      h.onFlash?.('#540008', 0.28, 150);
      schedule(() => {
        hideGhost();
        E.ref.eastLampAgitated = false;
        setThreat(null, '');
      }, 520);
    }, 1680);
  };

  // Milestone 4: 6C West Scriptorium Entry — cold dip & Seraph statue shifts
  const triggerWestCryptChill = () => {
    if (fired.has('west_crypt_chill') || E.ref.vaultRestored) return;
    fired.add('west_crypt_chill');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.2);
    E.audio?.statueScrape?.();
    E.audio?.playBreathScared?.(0.74);
    E.shake?.(0.5, 0.32);

    setGlobalLightScale(0.08);
    if (E.ref.westStatue) E.ref.westStatue.rotation.y += Math.PI;
    h.onScare?.('west_crypt_chill', null);

    schedule(() => {
      setGlobalLightScale(1.0);
    }, 950);
  };

  // Progression Vengeance I (after solving R2-08 in 6C): Seal-I Wraith emerges into the West Nave archway
  const triggerWestSealVengeance = () => {
    if (fired.has('west_seal_vengeance') || E.ref.vaultRestored) return;
    fired.add('west_seal_vengeance');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.8);
    setThreat('warning', 'SEAL I BROKEN // SOMETHING IN THE WEST ARCH');

    E.audio?.chainsRattle?.();
    E.audio?.phantomSteps?.();
    setGlobalLightScale(0.32);

    schedule(() => {
      if (E.ref.vaultRestored || E.isModalOpen?.()) {
        setGlobalLightScale(1.0);
        setThreat(null, '');
        return;
      }
      const { px, pz } = getPlayerPose();
      // Manifest grounded inside the West doorway corridor (~6-7m away) instead of teleporting in front of camera
      placeGhost(-8.1, 0, px, pz, 3.8, 0.06);
      playAgathaAnim(2, 1.2); // jumpscare3: menacing lunge
      E.audio?.playAgathaScream?.(0.92);
      E.shake?.(0.85, 0.4);
      h.onFlash?.('#5e000a', 0.45, 200);
      h.onScare?.('west_seal_vengeance', 'Seal I fractured — Agatha stalks the West corridor!');

      schedule(() => {
        hideGhost();
        setGlobalLightScale(1.0);
        setThreat(null, '');
      }, 1900);
    }, 1150);
  };

  // Progression Vengeance II (after solving R2-09 in 6D): Breaker overload -> dark corridor silhouette across East breach
  const triggerBlackoutAmbush = () => {
    if (fired.has('blackout_ambush') || E.ref.vaultRestored) return;
    fired.add('blackout_ambush');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.8);
    setThreat('surge', 'BREAKER OVERLOAD // DEAD DARK');

    setGlobalLightScale(0.04);
    E.audio?.powerOut?.();
    E.audio?.voltageBuzz?.();
    E.audio?.playBreathScared?.(0.9);
    E.audio?.setTension?.(2.1);
    h.onScare?.('blackout_ambush', 'RELAY OVERLOAD — LIGHTS OUT');

    schedule(() => {
      if (!E.ref.vaultRestored) E.audio?.phantomSteps?.();
    }, 550);

    schedule(() => {
      if (E.ref.vaultRestored) {
        setGlobalLightScale(1.0);
        setThreat(null, '');
        return;
      }
      const { px, pz } = getPlayerPose();
      setGlobalLightScale(0.28);
      placeGhost(8.1, 0, px, pz, 4.4, -0.05);
      playAgathaAnim(0, 1.25); // jumpscare1: thrashing screaming rush
      E.audio?.playAgathaScream?.(0.98);
      E.shake?.(1.5, 0.55);
      h.onFlash?.('#6c000d', 0.55, 240);

      schedule(() => {
        hideGhost();
        setGlobalLightScale(1.0);
        setThreat(null, '');
        if (!E.ref.vaultRestored) E.audio?.setTension?.(1.2);
      }, 1550);
    }, 1450);
  };

  // Optional Horror Wings (6F Reliquary Chapel & 6E Cellar)
  const triggerChapelReliquaryScare = () => {
    if (fired.has('chapel_reliquary') || E.ref.vaultRestored) return;
    fired.add('chapel_reliquary');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.4);
    setThreat('warning', '6F CHAPEL // COLD DRAFT');
    const { px, pz } = getPlayerPose();
    E.audio?.playCrows?.(0.36);
    E.audio?.playEvilLaugh?.(0.32);
    placeGhost(-13.3, -9.2, px, pz, 2.7, -0.06);
    E.shake?.(0.75, 0.32);
    h.onFlash?.('#540008', 0.32, 160);

    schedule(() => {
      E.audio?.stopWomanCrying?.();
      hideGhost();
      setThreat(null, '');
    }, 1350);
  };

  const triggerCellarTrapScare = () => {
    if (fired.has('cellar_ambush') || E.ref.vaultRestored) return;
    fired.add('cellar_ambush');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.4);
    setThreat('warning', '6E CELLAR // SHACKLES MOVING');
    const { px, pz } = getPlayerPose();
    placeGhost(12.9, 10.25, px, pz, 4.6, -0.09);
    E.audio?.playBonecrack?.(0.92);
    E.audio?.playMonster?.(0.84);
    E.audio?.chainsRattle?.();
    E.shake?.(1.15, 0.45);
    h.onFlash?.('#60000b', 0.48, 190);
    h.onScare?.('cellar_ambush', null);
    schedule(() => {
      hideGhost();
      setThreat(null, '');
    }, 980);
  };

  const triggerConsoleReject = () => {
    triggerPhantomLunge('CONTAINMENT REJECTED', false);
    E.audio?.setTension?.(2.2);
    schedule(() => {
      if (!E.ref.vaultRestored) E.audio?.setTension?.(1.2);
    }, 3200);
  };

  const tick = (dt) => {
    // Dynamic shadow rush scare: entity surges from 3.8m to 1.8m then dissolves before camera clipping
    if (lungeT >= 0) {
      lungeT += dt;
      const k = Math.min(1, lungeT / 0.42);
      const { px, pz, fx, fz } = getPlayerPose();
      const dist = 3.8 - 2.0 * k;
      const [gx, gz] = clampNaveSpot(px + fx * dist, pz + fz * dist);
      placeEntity(lungeEntity || E.ref.ghost, gx, gz, px, pz, 2.8, lungeEntity?.rotation?.z || 0);
      if (E.cam && E.cam.isPerspectiveCamera) {
        E.cam.fov = baseFov - 12 * Math.sin(Math.min(1, lungeT / 0.65) * Math.PI);
        E.cam.updateProjectionMatrix();
      }
      if (lungeT >= 0.68) {
        lungeT = -1;
        lungeEntity = null;
        hideGhost();
        setGlobalLightScale(1.0);
        if (E.cam && E.cam.isPerspectiveCamera && E.cam.fov !== baseFov) {
          E.cam.fov = baseFov;
          E.cam.updateProjectionMatrix();
        }
      }
    }

    if (E.isModalOpen?.()) return;

    elapsed += dt;
    if (E.ref.vaultRestored) {
      hideGhost();
      setThreat(null, '');
      E.audio?.stopMachineLoop?.();
      E.ref._lightsOverridden = false;
      setGlobalLightScale(1.0);
      if (E.cam && E.cam.isPerspectiveCamera && E.cam.fov !== baseFov) {
        E.cam.fov = baseFov;
        E.cam.updateProjectionMatrix();
      }
      return;
    }

    // Fire post-puzzle progression scares cleanly right after the player exits the modal!
    if (pendingWestBreach && elapsed >= scriptedBusyUntil) {
      pendingWestBreach = false;
      triggerWestSealVengeance();
    }
    if (pendingEastBlackout && elapsed >= scriptedBusyUntil) {
      pendingEastBlackout = false;
      triggerBlackoutAmbush();
    }

    const { px, pz, fx, fz } = getPlayerPose();
    if (pz < 7.6) leftNarthex = true;

    // 6C Weeping Seraph Statue turns silently when you look away
    if (pendingStatueTurn && E.ref.westStatue && !lookingAt(-11.8, -3.6, -0.34)) {
      pendingStatueTurn = false;
      E.ref.westStatue.rotation.y += Math.PI;
      E.audio?.statueScrape?.();
    }

    // Beat 1: 6A Entry Cell 01 — ambient crying when in Narthex
    if (!fired.has('cell_sobbing') && pz > 9.0 && pz < 15.5 && px < 1.0) {
      fired.add('cell_sobbing');
      E.audio?.playWomanCrying?.(0.32);
    }
    // Only lunge against bars when player deliberately walks UP TO the cell bars and looks into the cell!
    if (
      !fired.has('entry_cell_peek') &&
      px < -1.8 && pz > 9.0 && pz < 13.0 && lookingAt(-4.8, 10.9, 0.6)
    ) {
      triggerEntryCellVanish();
    }

    // Beat 1.5: Nave Church Pew Ambush (Agatha bursts from between church pews when advancing down center aisle towards Altar)
    if (
      !fired.has('nave_pew_ambush') &&
      leftNarthex &&
      pz < 3.2 &&
      pz > 1.2 &&
      Math.abs(px) < 1.45 &&
      lookingAt(0, -4.9, 0.5)
    ) {
      triggerNaveAisleScare();
    }

    // Beat 2 & 3: Wing First Entries (environmental visual teases, never in-camera jumps)
    if (elapsed > 3 && px > 9.4) {
      visitedSideWing = true;
      if (!fired.has('east_stalker_flicker')) triggerEastBayPeek();
    }
    if (elapsed > 3 && px < -9.4) {
      visitedSideWing = true;
      if (!fired.has('west_crypt_chill')) triggerWestCryptChill();
    }

    // Optional Side Chambers (6E / 6F)
    if (px > 10.4 && pz > 6.8 && !fired.has('cellar_ambush')) {
      triggerCellarTrapScare();
    }
    if (px < -10.4 && pz < -6.9 && !fired.has('chapel_reliquary')) {
      triggerChapelReliquaryScare();
    }
  };

  const handleLoreInspect = (id) => {
    E.ref.triggerInteractAnim?.(id);
    const key = `lore_react_${id}`;
    if (fired.has(key) || E.ref.vaultRestored) return false;
    fired.add(key);

    if (id === 'narthex_registry' || id === 'scriptorium_books') {
      E.audio?.creak?.();
      if (id === 'narthex_registry') {
        // Place shadowed entity at the 6A->6B archway threshold watching from afar rather than in front of the desk
        const { px, pz } = getPlayerPose();
        placeGhost(0, 7.35, px, pz, 2.7, -0.04);
        E.audio?.playBreathScared?.(0.85);
        E.audio?.playStab?.(0.62);
        E.shake?.(0.65, 0.35);
        h.onFlash?.('#4e0008', 0.34, 180);
        schedule(() => {
          hideGhost();
        }, 900);
        return true;
      }
    } else if (id === 'cell_manifest') {
      if (!fired.has('entry_cell_peek')) triggerEntryCellVanish();
    } else if (id === 'autopsy_gurney') {
      setGlobalLightScale(0.12);
      E.audio?.playBonecrack?.(0.9);
      E.audio?.playStab?.(0.68);
      E.shake?.(0.7, 0.35);
      h.onFlash?.('#4e0008', 0.35, 180);
      schedule(() => setGlobalLightScale(1.0), 380);
    } else if (id === 'specimen_locker') {
      E.audio?.playBreathScared?.(0.55);
      E.audio?.playCrows?.(0.24);
    } else if (id === 'weeping_statue') {
      E.audio?.statueScrape?.();
      pendingStatueTurn = true;
    } else if (id === 'sarcophagus_se') {
      E.audio?.chainsRattle?.();
    } else if (id === 'switchgear_log') {
      E.audio?.voltageBuzz?.();
    }
    return false;
  };

  return {
    tick,
    trigger: (name) => {
      if (name === 'core_glass') return triggerCoreGlassScare();
      if (name === 'console_reject') return triggerConsoleReject();
      if (name === 'dome_dip' || name === 'blackout_ambush') {
        triggerBlackoutAmbush();
        return true;
      }
      if (name === 'phantom_lunge') {
        triggerPhantomLunge();
        return true;
      }
      if (name === 'manual_solved') {
        E.ref.onManualSolved?.();
        E.audio?.statueScrape?.();
        pendingWestBreach = true;
        scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 1.0);
        return true;
      }
      if (name === 'failsafe_open') {
        E.ref.openFailsafeDoor?.();
        E.audio?.startMachineLoop?.(0.22);
        pendingEastBlackout = true;
        scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 1.0);
        return true;
      }
      if (typeof name === 'string' && name.startsWith('inspect_')) {
        return handleLoreInspect(name.slice(8));
      }
      return false;
    },
    onCoreGlassInspect: triggerCoreGlassScare,
    onConsoleReject: triggerConsoleReject,
    dispose: () => {
      hideGhost();
      setThreat(null, '');
      E.audio?.stopMachineLoop?.();
      E.ref._lightsOverridden = false;
      setGlobalLightScale(1.0);
      if (E.cam && E.cam.isPerspectiveCamera && E.cam.fov !== baseFov) {
        E.cam.fov = baseFov;
        E.cam.updateProjectionMatrix();
      }
      timers.forEach((id) => clearTimeout(id));
      timers.length = 0;
    },
  };
}

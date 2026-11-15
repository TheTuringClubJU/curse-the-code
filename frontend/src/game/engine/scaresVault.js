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
  // Patrol state machine: 'idle' | 'telegraph' | 'manifest' | 'rush'
  let patrolState = 'idle';
  let patrolTimer = 0;
  let lookHoldTimer = 0;
  let lookAwayTimer = 0;
  let patrolEntity = null;
  let nextPatrolAt = 14.0;

  let pendingStatueTurn = false;
  let pendingWestBreach = false;
  let pendingEastBlackout = false;
  let behindWatch = null;

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

  const placeEntity = (entity, x, z, faceX, faceZ, lightIntensity = 3.8, tiltZ = 0) => {
    if (!entity) return;
    entity.position.set(x, 0, z);
    const dx = faceX - x;
    const dz = faceZ - z;
    entity.rotation.y = Math.atan2(dx, dz);
    entity.rotation.z = tiltZ;
    entity.visible = true;
    if (E.ref.ghostLight) {
      // Position illumination in FRONT of the apparition (toward the viewer) so faces & limbs never render backlit black
      const dist = Math.hypot(dx, dz) || 1;
      const frontOffset = Math.min(0.95, dist * 0.45);
      E.ref.ghostLight.position.set(
        x + (dx / dist) * frontOffset,
        1.64,
        z + (dz / dist) * frontOffset
      );
      E.ref.ghostLight.color.setHex(0xffead6);
      E.ref.ghostLight.intensity = Math.max(4.6, lightIntensity * 1.35);
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

  const setGlobalLightScale = (val) => {
    if (E.sc) E.sc.v = val;
  };

  // High-impact readable 3D Jump Scare (stays cleanly outside camera near plane at 1.15m..1.55m for 0.86s)
  const triggerPhantomLunge = (reasonMsg = null, preferStalker = false) => {
    if (E.ref.vaultRestored) return;
    lungeT = 0;
    lungeEntity = (preferStalker && E.ref.stalker) || E.ref.ghost || E.ref.stalker;
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.0);
    nextPatrolAt = Math.max(nextPatrolAt, elapsed + 34.0);
    patrolState = 'idle';
    setThreat(null, '');

    const { px, pz, fx, fz } = getPlayerPose();
    setGlobalLightScale(0.22);
    const [gx, gz] = clampNaveSpot(px + fx * 1.48, pz + fz * 1.48);
    const tilt = (Math.random() < 0.5 ? -1 : 1) * 0.08;
    placeEntity(lungeEntity, gx, gz, px, pz, 6.8, tilt);
    if (E.ref.ghostLight) E.ref.ghostLight.color.setHex(0xffe8d6);

    E.audio?.playStab?.(0.95);
    E.audio?.playMonster?.(0.88);
    E.audio?.screamStinger?.();
    E.shake?.(1.75, 0.62);
    h.onFlash?.('#64000c', 0.58, 220);
    h.onNightmarePulse?.(560);
    h.onGlassCrack?.();
    h.onScare?.('phantom_lunge', reasonMsg);
  };

  // Milestone 1: Inspecting core_glass — cracked reliquary manifestation directly in front of player
  const triggerCoreGlassScare = () => {
    if (fired.has('core_glass_slam')) return false;
    fired.add('core_glass_slam');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.5);
    nextPatrolAt = Math.max(nextPatrolAt, elapsed + 32.0);
    patrolState = 'idle';
    setThreat('surge', 'RELIQUARY SEAL FRACTURING');

    const { px, pz, fx, fz } = getPlayerPose();
    const [gx, gz] = clampNaveSpot(px + fx * 1.42, pz + fz * 1.42);

    E.audio?.playMonster?.(0.95);
    E.audio?.screamStinger?.();
    E.audio?.setTension?.(2.0);
    E.shake?.(1.8, 0.65);
    h.onGlassCrack?.();
    h.onFlash?.('#68000c', 0.58, 240);
    h.onNightmarePulse?.(560);
    h.onScare?.('core_glass_slam', null);

    setGlobalLightScale(0.26);
    if (E.ref.coreLight) E.ref.coreLight.intensity = 9.8;
    placeGhost(gx, gz, px, pz, 6.8, -0.07);

    schedule(() => {
      if (patrolState === 'idle') hideGhost();
      setGlobalLightScale(1.0);
      setThreat(null, '');
    }, 1050);

    schedule(() => {
      E.audio?.setTension?.(1.2);
    }, 2600);

    return true;
  };

  // Milestone 2: 6A Holding Cell 01 bars — crying cuts dead -> chain warning -> lit wraith lurches against bars
  const triggerEntryCellVanish = () => {
    if (fired.has('entry_cell_peek') || E.ref.vaultRestored) return;
    fired.add('entry_cell_peek');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.0);
    setThreat('warning', 'CELL 01 // RESTRAINTS SHIFTING');

    E.audio?.stopWomanCrying?.();
    E.audio?.chainsRattle?.();
    E.audio?.playBreathScared?.(0.85);
    E.shake?.(0.45, 0.3);

    schedule(() => {
      if (E.ref.vaultRestored) return;
      const { px, pz } = getPlayerPose();
      const prevCellIntensity = E.ref.cellLight?.intensity ?? 1.3;
      placeGhost(-3.75, 10.9, px, pz, 5.2, 0.08);
      if (E.ref.cellLight) E.ref.cellLight.intensity = 8.8;
      E.audio?.playBonecrack?.(0.86);
      E.audio?.playMonster?.(0.68);
      E.shake?.(0.95, 0.42);
      h.onFlash?.('#540008', 0.36, 180);
      h.onScare?.('entry_cell_peek', null);

      [140, 310, 520, 740].forEach((ms, i) => {
        schedule(() => {
          if (E.ref.vaultRestored) return;
          if (E.ref.cellLight) E.ref.cellLight.intensity = i % 2 === 0 ? 0.3 : 9.0;
        }, ms);
      });

      schedule(() => {
        if (patrolState === 'idle') hideGhost();
        if (E.ref.cellLight) E.ref.cellLight.intensity = prevCellIntensity;
        setThreat(null, '');
      }, 1150);
    }, 850);
  };

  // Milestone 3: 6D East Crypt Entry — lamp swings violently for 1.5s telegraph, then Stalker watches across 6E doorway
  const triggerEastBayPeek = () => {
    if (fired.has('east_stalker_flicker') || E.ref.vaultRestored) return;
    fired.add('east_stalker_flicker');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 4.4);
    nextPatrolAt = Math.max(nextPatrolAt, elapsed + 28.0);
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
        if (patrolState === 'idle') hideGhost();
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

  // Progression Vengeance I (after solving R2-08 in 6C): Seal-I Wraith stalks out of West doorway into jump scare
  const triggerWestSealVengeance = () => {
    if (fired.has('west_seal_vengeance') || E.ref.vaultRestored) return;
    fired.add('west_seal_vengeance');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 5.2);
    nextPatrolAt = Math.max(nextPatrolAt, elapsed + 36.0);
    setThreat('warning', 'SEAL I BROKEN // SOMETHING IN THE SCRIPTORIUM');

    E.audio?.chainsRattle?.();
    E.audio?.phantomSteps?.();
    setGlobalLightScale(0.35);

    schedule(() => {
      if (E.ref.vaultRestored || E.isModalOpen?.()) {
        setGlobalLightScale(1.0);
        setThreat(null, '');
        return;
      }
      const { px, pz } = getPlayerPose();
      placeStalker(-9.4, 0, px, pz, 4.6, 0.08);
      E.audio?.playEvilLaugh?.(0.32);
      h.onScare?.('west_seal_vengeance', 'Seal I fractured — something crossed the West Arch!');

      schedule(() => {
        if (!E.ref.vaultRestored && !E.isModalOpen?.()) {
          triggerPhantomLunge(null, true);
        } else {
          hideGhost();
          setGlobalLightScale(1.0);
          setThreat(null, '');
        }
      }, 1350);
    }, 1500);
  };

  // Progression Vengeance II (after solving R2-09 in 6D): Breaker overload -> total dark footsteps -> close flash scare
  const triggerBlackoutAmbush = () => {
    if (fired.has('blackout_ambush') || E.ref.vaultRestored) return;
    fired.add('blackout_ambush');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 5.0);
    nextPatrolAt = Math.max(nextPatrolAt, elapsed + 38.0);
    patrolState = 'idle';
    setThreat('surge', 'BREAKER OVERLOAD // DEAD DARK');

    setGlobalLightScale(0.02);
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
      const { px, pz, fx, fz } = getPlayerPose();
      const [gx, gz] = clampNaveSpot(px + fx * 1.48, pz + fz * 1.48);
      setGlobalLightScale(1.05);
      placeGhost(gx, gz, px, pz, 6.2, 0.07);
      if (E.ref.ghostLight) E.ref.ghostLight.color.setHex(0xd8e8ff);

      E.audio?.playStab?.(0.95);
      E.audio?.playMonster?.(0.9);
      E.audio?.screamStinger?.();
      E.shake?.(1.8, 0.56);
      h.onFlash?.('#64000c', 0.65, 200);
      h.onNightmarePulse?.(560);

      schedule(() => {
        setGlobalLightScale(0.06);
        hideGhost();
      }, 620);

      schedule(() => {
        hideGhost();
        setGlobalLightScale(1.0);
        setThreat(null, '');
        if (!E.ref.vaultRestored) E.audio?.setTension?.(1.2);
      }, 1050);
    }, 1750);
  };

  // Optional Horror Wings (6F Reliquary Chapel & 6E Cellar)
  const triggerChapelReliquaryScare = () => {
    if (fired.has('chapel_reliquary') || E.ref.vaultRestored) return;
    fired.add('chapel_reliquary');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.6);
    setThreat('warning', '6F CHAPEL // COLD DRAFT');
    const { px, pz } = getPlayerPose();
    E.audio?.playCrows?.(0.36);
    E.audio?.playEvilLaugh?.(0.32);
    placeStalker(-13.3, -8.5, px, pz, 4.2);
    E.shake?.(0.75, 0.32);

    schedule(() => {
      E.audio?.stopWomanCrying?.();
      if (!E.ref.vaultRestored && !E.isModalOpen?.()) {
        triggerPhantomLunge(null, true);
      } else {
        hideGhost();
        setThreat(null, '');
      }
    }, 950);
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
      if (patrolState === 'idle') hideGhost();
      setThreat(null, '');
    }, 980);
  };

  // One-time Behind-You Neck Breath encounter when crossing back into the central nave
  const triggerBehindYouWhisper = () => {
    if (fired.has('behind_you_whisper') || E.ref.vaultRestored) return;
    fired.add('behind_you_whisper');
    const { px, pz, fx, fz } = getPlayerPose();
    const [tx, tz] = clampNaveSpot(px - fx * 2.0, pz - fz * 2.0);
    behindWatch = {
      tx,
      tz,
      expiresAt: elapsed + 6.5,
    };
    setThreat('warning', 'FOOTSTEPS BEHIND YOU');
    E.audio?.phantomSteps?.();
    E.audio?.playBreathScared?.(0.86);
    E.audio?.whisper?.();
    h.onScare?.('behind_you_whisper', null);
  };

  const triggerConsoleReject = () => {
    triggerPhantomLunge('CONTAINMENT REJECTED', false);
    E.audio?.setTension?.(2.2);
    schedule(() => {
      if (!E.ref.vaultRestored) E.audio?.setTension?.(1.2);
    }, 3200);
  };

  // Pick a visible threshold doorway / corridor anchor ahead or to the side of the player
  const pickPatrolDoorway = (px, pz, fx, fz) => {
    const spots = [
      [-8.3, 0],
      [8.3, 0],
      [0, 6.9],
      [0, -6.9],
      [-5.2, -5.8],
      [5.2, -5.8],
      [-13.2, -5.8],
      [12.9, 5.8],
      [-12.8, 2.8],
      [12.8, -2.6],
    ];
    let best = null;
    let bestScore = -Infinity;
    for (const [sx, sz] of spots) {
      const dx = sx - px;
      const dz = sz - pz;
      const dist = Math.hypot(dx, dz);
      if (dist < 4.5 || dist > 14.0) continue;
      const dot = (dx / dist) * fx + (dz / dist) * fz;
      // Strongly prefer corridors within the player's forward hemisphere so the manifestation is SEEN!
      const score = dot * 10 - Math.abs(dist - 7.5);
      if (score > bestScore) {
        bestScore = score;
        best = [sx, sz];
      }
    }
    return best;
  };

  const tick = (dt) => {
    // Advance close-quarters lunge animation cleanly at 1.12m..1.48m so creature fills viewport clearly
    if (lungeT >= 0) {
      lungeT += dt;
      const k = Math.min(1, lungeT / 0.34);
      const { px, pz, fx, fz } = getPlayerPose();
      const dist = 1.48 - 0.36 * k;
      const [gx, gz] = clampNaveSpot(px + fx * dist, pz + fz * dist);
      placeEntity(lungeEntity || E.ref.ghost, gx, gz, px, pz, 6.8, lungeEntity?.rotation?.z || 0);
      if (E.cam && E.cam.isPerspectiveCamera) {
        E.cam.fov = baseFov - 15 * Math.sin(Math.min(1, lungeT / 0.85) * Math.PI);
        E.cam.updateProjectionMatrix();
      }
      if (lungeT >= 1.02) {
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

    // Beat 1: 6A Entry Cell 01
    if (!fired.has('cell_sobbing') && !fired.has('entry_cell_peek') && elapsed > 0.6 && pz > 9.5) {
      fired.add('cell_sobbing');
      E.audio?.playWomanCrying?.(0.36);
    }
    if (
      !fired.has('entry_cell_peek') &&
      ((elapsed > 1.2 && pz < 12.6) || (elapsed > 0.8 && pz > 8.8 && lookingAt(-4.5, 10.9, 0.58)))
    ) {
      triggerEntryCellVanish();
    }

    // Beat 2 & 3: Wing First Entries
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

    // One-time Behind-You Nave encounter after exploring a side wing
    if (visitedSideWing && Math.abs(px) < 4.5 && pz > -2.5 && pz < 6.0 && elapsed > 18 && !fired.has('behind_you_whisper')) {
      triggerBehindYouWhisper();
    }
    if (behindWatch) {
      if (elapsed > behindWatch.expiresAt) {
        behindWatch = null;
        if (patrolState === 'idle') setThreat(null, '');
      } else if (lookingAt(behindWatch.tx, behindWatch.tz, 0.68)) {
        const bw = behindWatch;
        behindWatch = null;
        scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 2.5);
        placeGhost(bw.tx, bw.tz, px, pz, 5.8, -0.1);
        E.audio?.playStab?.(0.92);
        E.audio?.playMonster?.(0.86);
        E.shake?.(1.45, 0.5);
        h.onFlash?.('#5e000b', 0.52, 200);
        h.onNightmarePulse?.(480);
        h.onScare?.('behind_turn', null);
        schedule(() => {
          if (patrolState === 'idle') hideGhost();
          setThreat(null, '');
        }, 880);
      }
    }

    // Structured, Telegraphed Reliquary Stalker Patrol Cycle
    if (leftNarthex && !behindWatch && elapsed >= scriptedBusyUntil && (E.ref.stalker || E.ref.ghost)) {
      if (patrolState === 'idle' && elapsed >= nextPatrolAt) {
        patrolState = 'telegraph';
        patrolTimer = 0;
        setThreat('warning', 'COLD PRESENCE NEARBY');
        E.audio?.phantomSteps?.();
        E.audio?.playBreathScared?.(0.75);
        setGlobalLightScale(0.55);
      } else if (patrolState === 'telegraph') {
        patrolTimer += dt;
        // Subtle bulb tension pulse during 2.8s telegraph
        setGlobalLightScale(0.45 + 0.16 * Math.sin(patrolTimer * 11));
        if (patrolTimer >= 2.8) {
          const spot = pickPatrolDoorway(px, pz, fx, fz);
          if (spot) {
            patrolState = 'manifest';
            patrolTimer = 0;
            lookHoldTimer = 0;
            lookAwayTimer = 0;
            patrolEntity = E.ref.stalker || E.ref.ghost;
            setGlobalLightScale(0.82);
            placeEntity(patrolEntity, spot[0], spot[1], px, pz, 4.4, 0.08);
            E.audio?.creak?.();
            setThreat('surge', 'APPARITION SIGHTED // KEEP BACK');
          } else {
            patrolState = 'idle';
            setGlobalLightScale(1.0);
            setThreat(null, '');
            nextPatrolAt = elapsed + 16.0;
          }
        }
      } else if (patrolState === 'manifest') {
        patrolTimer += dt;
        const active = patrolEntity || E.ref.stalker || E.ref.ghost;
        const gx = active.position.x;
        const gz = active.position.z;
        const gDist = Math.hypot(px - gx, pz - gz);
        active.rotation.y = Math.atan2(px - gx, pz - gz);

        const isWatched = lookingAt(gx, gz, 0.65) && gDist < 14.0;
        if (isWatched) {
          lookHoldTimer += dt;
          lookAwayTimer = 0;
        } else {
          lookAwayTimer += dt;
        }

        // Counterplay: Staring too long (>1.1s) or approaching close (<4.0m) provokes a direct corridor rush!
        if (lookHoldTimer >= 1.1 || gDist < 4.0) {
          patrolState = 'rush';
          patrolTimer = 0;
          E.audio?.playMonster?.(0.86);
          E.audio?.phantomSteps?.();
          if (E.ref.ghostLight) E.ref.ghostLight.intensity = 5.4;
        } else if (lookAwayTimer >= 2.6 || gDist > 12.5 || patrolTimer >= 6.0) {
          // Looking away & backing off cleanly dismisses the manifestation into the dark
          patrolState = 'idle';
          hideGhost();
          setGlobalLightScale(1.0);
          setThreat(null, '');
          E.audio?.chainsRattle?.();
          nextPatrolAt = elapsed + 22.0;
        }
      } else if (patrolState === 'rush') {
        patrolTimer += dt;
        const active = patrolEntity || E.ref.stalker || E.ref.ghost;
        const gx = active.position.x;
        const gz = active.position.z;
        const dx = px - gx;
        const dz = pz - gz;
        const gDist = Math.hypot(dx, dz) || 1;
        const step = Math.min(gDist, 7.6 * dt);
        placeEntity(active, gx + (dx / gDist) * step, gz + (dz / gDist) * step, px, pz, 5.2, 0.1);

        if (gDist < 1.9 || patrolTimer > 1.5) {
          patrolState = 'idle';
          hideGhost();
          triggerPhantomLunge(null, active === E.ref.stalker);
        }
      }
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
        const { px, pz, fx, fz } = getPlayerPose();
        const [gx, gz] = clampNaveSpot(px + fx * 1.55, pz + fz * 1.55);
        placeGhost(gx, gz, px, pz, 5.4, -0.06);
        E.audio?.playBreathScared?.(0.85);
        E.audio?.playStab?.(0.62);
        E.shake?.(0.65, 0.35);
        h.onFlash?.('#4e0008', 0.34, 180);
        schedule(() => {
          if (patrolState === 'idle') hideGhost();
        }, 850);
        return true;
      }
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

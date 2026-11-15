// Situation-Based Horror Director for Room 6: The Anointing Vault
// Drives grounded 3D survival-horror ambushes: 3D stalker.glb camera-space strobe lunges,
// pitch-black blackout cuts, behind-you turns, and roaming apparition hunts across Zones 6A–6F.

export function createVaultScares(E, h = {}) {
  const fired = new Set();
  const timers = [];
  let elapsed = 0;
  let visitedSideWing = false;
  let leftNarthex = false;
  let dartProgress = -1;

  let scriptedBusyUntil = 0;
  let ghostState = 'cell_wait'; // 'cell_wait' | 'hidden' | 'peek' | 'hunt'
  let ghostTimer = 0;
  let lookHoldTimer = 0;
  let stareCharge = true;
  let peekEntity = null;
  let pendingStatueTurn = false;
  let wasShortGap = false;
  let lastDirectorMode = null;

  // Randomized per-run trigger jitters so scares never fire on a stopwatch loop
  const jitterBehind = 8 + Math.random() * 9;
  const jitterDart = 12 + Math.random() * 10;
  const jitterBlackout = 21 + Math.random() * 15;
  const scheduleRandomDelay = () => {
    const r = Math.random();
    if (!wasShortGap && r < 0.22) {
      wasShortGap = true;
      return 6.0 + Math.random() * 5.0; // Unsettling double-sting (6–11s)
    }
    wasShortGap = false;
    if (r > 0.68) {
      return 27.0 + Math.random() * 13.0; // Long oppressive calm (27–40s)
    }
    return 13.5 + Math.random() * 12.5; // Irregular mid gap (13.5–26s)
  };
  let nextHuntAt = 12 + Math.random() * 9;

  // Active 3D entity rush lunge & camera FOV snap
  let lungeT = -1;
  const baseFov = E.cam?.fov || 72;
  // Active "behind you" turn detector
  let behindWatch = null;

  const schedule = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  };

  const getPlayerPose = () => {
    const px = E.px?.() ?? 0;
    const pz = E.pz?.() ?? 13.8;
    const yaw = E.yaw?.() ?? E.cam?.rotation?.y ?? 0;
    return { px, pz, yaw, fx: -Math.sin(yaw), fz: -Math.cos(yaw) };
  };

  const lookingAt = (tx, tz, minDot = 0.65) => {
    const { px, pz, fx, fz } = getPlayerPose();
    const dx = tx - px;
    const dz = tz - pz;
    const len = Math.hypot(dx, dz) || 1;
    return (dx / len) * fx + (dz / len) * fz >= minDot;
  };

  const placeEntity = (entity, x, z, faceX, faceZ, lightIntensity = 2.4, tiltZ = 0) => {
    if (!entity) return;
    entity.position.set(x, 0.02, z);
    entity.rotation.y = Math.atan2(faceX - x, faceZ - z);
    entity.rotation.z = tiltZ;
    entity.visible = true;
    if (E.ref.ghostLight) {
      E.ref.ghostLight.position.set(x, 1.65, z);
      E.ref.ghostLight.color.setHex(0xd6e6ff);
      E.ref.ghostLight.intensity = lightIntensity;
    }
  };

  const placeGhost = (x, z, faceX, faceZ, lightIntensity = 2.4, tiltZ = 0) =>
    placeEntity(E.ref.ghost, x, z, faceX, faceZ, lightIntensity, tiltZ);

  const placeStalker = (x, z, faceX, faceZ, lightIntensity = 2.6, tiltZ = 0) =>
    placeEntity(E.ref.stalker, x, z, faceX, faceZ, lightIntensity, tiltZ);

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

  // 3D Apparition Encounter Lunge (close dread reveal + cold flash + optical snap)
  const triggerPhantomLunge = (reasonMsg = null) => {
    if (E.ref.vaultRestored) return;
    lungeT = 0;
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 1.8);
    ghostState = 'hidden';

    const { px, pz, fx, fz } = getPlayerPose();
    setGlobalLightScale(0.24);
    const tilt = (Math.random() < 0.5 ? -1 : 1) * (0.06 + Math.random() * 0.08);
    placeGhost(px + fx * 1.48, pz + fz * 1.48, px, pz, 5.4, tilt);
    if (E.ref.ghostLight) {
      E.ref.ghostLight.color.setHex(0xc8d8ee);
    }

    E.audio?.playStab?.(0.9);
    E.audio?.playMonster?.(0.74);
    E.audio?.screamStinger?.();
    E.shake?.(1.65, 0.48);
    h.onFlash?.('#540008', 0.52, 190);
    h.onNightmarePulse?.(400);
    h.onGlassCrack?.();
    h.onScare?.('phantom_lunge', reasonMsg);
  };

  // Trigger 1 (once): Inspecting core_glass — violent glass impact + sub-bass slam
  const triggerCoreGlassScare = () => {
    if (fired.has('core_glass_slam')) return false;
    fired.add('core_glass_slam');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.0);
    ghostState = 'hidden';

    E.audio?.playMonster?.(0.88);
    E.audio?.screamStinger?.();
    E.audio?.setTension?.(2.0);
    E.shake?.(1.7, 0.52);
    h.onGlassCrack?.();
    h.onFlash?.('#68000c', 0.54, 240);
    h.onNightmarePulse?.(420);
    h.onScare?.('core_glass_slam', null);

    if (E.ref.coreLight) {
      E.ref.coreLight.intensity = 9.2;
    }
    placeGhost(0, -2.9, 0, 1, 3.6);

    schedule(() => {
      if (ghostState === 'hidden') hideGhost();
    }, 620);

    schedule(() => {
      E.audio?.setTension?.(1.15);
    }, 2400);

    return true;
  };

  // Trigger 2 (once): Distant woman sobbing behind Holding Cell 01 bars cuts DEAD SILENT + iron gate slam!
  const triggerEntryCellVanish = () => {
    if (fired.has('entry_cell_peek') || E.ref.vaultRestored) return;
    fired.add('entry_cell_peek');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 2.8);
    ghostState = 'hidden';

    E.audio?.stopWomanCrying?.();
    E.audio?.playBreathScared?.(0.85);
    E.audio?.chainsRattle?.();
    E.audio?.playBonecrack?.(0.75);
    E.shake?.(0.85, 0.36);
    h.onFlash?.('#540008', 0.34, 180);
    h.onScare?.('entry_cell_peek', null);

    const { px, pz } = getPlayerPose();
    const prevCellIntensity = E.ref.cellLight?.intensity ?? 0.36;
    placeGhost(-3.75, 10.9, px, pz, 3.8);
    if (E.ref.cellLight) E.ref.cellLight.intensity = 7.8;

    [130, 260, 420].forEach((ms, i) => {
      schedule(() => {
        if (E.ref.vaultRestored) return;
        if (E.ref.cellLight) E.ref.cellLight.intensity = i % 2 === 0 ? 0.35 : 8.2;
      }, ms);
    });

    schedule(() => {
      if (ghostState === 'hidden') hideGhost();
      if (E.ref.cellLight) E.ref.cellLight.intensity = prevCellIntensity;
      nextHuntAt = Math.max(nextHuntAt, elapsed + 8 + Math.random() * 14);
    }, 640);
  };

  // Trigger 3 (once): East Switchgear lamp lurches & figure watches across 6E Cellar bars
  const triggerEastBayPeek = () => {
    if (fired.has('east_stalker_flicker') || E.ref.vaultRestored) return;
    fired.add('east_stalker_flicker');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.2);
    ghostState = 'hidden';

    E.ref.eastLampAgitated = true;
    E.audio?.creak?.();
    E.audio?.voltageBuzz?.();
    E.shake?.(0.55, 0.3);

    const { px, pz } = getPlayerPose();
    placeGhost(12.9, 6.3, px, pz, 2.6);
    h.onScare?.('east_stalker_flicker', null);

    [160, 380, 620, 960, 1300].forEach((ms, i) => {
      schedule(() => {
        if (E.ref.vaultRestored) return;
        setGlobalLightScale(i % 2 === 0 ? 0.12 : 1.0);
      }, ms);
    });

    schedule(() => {
      setGlobalLightScale(1.0);
      E.audio?.playStab?.(0.75);
      schedule(() => {
        if (ghostState === 'hidden') hideGhost();
        E.ref.eastLampAgitated = false;
      }, 280);
    }, 1520);
  };

  // Trigger 4 (once): West Scriptorium blackout — weeping stone statue silently shifts orientation
  const triggerWestCryptChill = () => {
    if (fired.has('west_crypt_chill') || E.ref.vaultRestored) return;
    fired.add('west_crypt_chill');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 2.4);
    E.audio?.statueScrape?.();
    E.audio?.playBreathScared?.(0.72);
    E.shake?.(0.5, 0.32);

    setGlobalLightScale(0.04);
    if (E.ref.westStatue) E.ref.westStatue.rotation.y += Math.PI;

    h.onScare?.('west_crypt_chill', null);
    schedule(() => {
      setGlobalLightScale(1.0);
    }, 850);
  };

  // Trigger 4B (once): Breath inches behind collar + behind-you ambush on turn
  const triggerBehindYouWhisper = () => {
    if (fired.has('behind_you_whisper') || E.ref.vaultRestored) return;
    fired.add('behind_you_whisper');
    const { px, pz, fx, fz } = getPlayerPose();
    behindWatch = {
      tx: px - fx * 2.1,
      tz: pz - fz * 2.1,
      expiresAt: elapsed + 5.2,
    };
    E.audio?.phantomSteps?.();
    E.audio?.playBreathScared?.(0.84);
    E.audio?.whisper?.();
    h.onScare?.('behind_you_whisper', null);
  };

  // Trigger 4C (once): Ghost darts silently across the far dark Nave nave aisle
  const triggerCorridorDart = () => {
    if (fired.has('corridor_dart') || E.ref.vaultRestored) return;
    fired.add('corridor_dart');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 2.0);
    ghostState = 'hidden';
    dartProgress = 0;
    placeGhost(-5.2, -1.6, 5.2, -1.6, 2.2);
    E.audio?.playBonecrack?.(0.78);
    h.onScare?.('corridor_dart', null);
  };

  // Trigger 5 (once): Overhead iron restraint chains groan near pit
  const triggerCageBreath = () => {
    if (fired.has('cage_breath')) return;
    fired.add('cage_breath');
    E.audio?.chainsRattle?.();
    E.shake?.(0.38, 0.28);
    h.onScare?.('cage_breath', null);
  };

  // Trigger 6: Wrong submission on Central Console
  const triggerConsoleReject = () => {
    triggerPhantomLunge('CONTAINMENT REJECTED');
    E.audio?.setTension?.(2.2);
    schedule(() => {
      if (!E.ref.vaultRestored) {
        E.audio?.setTension?.(1.2);
      }
    }, 3200);
  };

  // Trigger 7 (once): Deep Cold Blackout — dead silence + scared breathing, then harsh flash inches away!
  const triggerBlackoutAmbush = () => {
    if (fired.has('blackout_ambush') || E.ref.vaultRestored) return;
    fired.add('blackout_ambush');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 3.6);
    ghostState = 'hidden';

    setGlobalLightScale(0.015);
    E.audio?.powerOut?.();
    E.audio?.playBreathScared?.(0.90);
    E.audio?.setTension?.(2.1);
    h.onScare?.('blackout_ambush', 'POWER BUS TRIPPED');

    // 1.35s agonizing dark silence -> single stark strobe flash + impact
    schedule(() => {
      if (E.ref.vaultRestored) {
        setGlobalLightScale(1.0);
        return;
      }
      const { px, pz, fx, fz } = getPlayerPose();
      setGlobalLightScale(1.1);
      placeGhost(px + fx * 1.55, pz + fz * 1.55, px, pz, 4.6);
      if (E.ref.ghostLight) E.ref.ghostLight.color.setHex(0xd4e2f4);
      E.audio?.playStab?.(0.92);
      E.audio?.playMonster?.(0.86);
      E.shake?.(1.75, 0.5);
      h.onFlash?.('#62000a', 0.62, 160);
      h.onNightmarePulse?.(440);

      schedule(() => {
        setGlobalLightScale(0.02);
        hideGhost();
      }, 190);

      schedule(() => {
        hideGhost();
        setGlobalLightScale(1.0);
        if (!E.ref.vaultRestored) E.audio?.setTension?.(1.15);
      }, 680);
    }, 1350);
  };

  // Trigger 8 (once): Entering 6F North Reliquary Chapel — crows & hollow laughter stage the Stalker
  const triggerChapelReliquaryScare = () => {
    if (fired.has('chapel_reliquary') || E.ref.vaultRestored) return;
    fired.add('chapel_reliquary');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 2.6);
    const { px, pz } = getPlayerPose();
    E.audio?.playCrows?.(0.34);
    E.audio?.playEvilLaugh?.(0.3);
    placeStalker(-13.3, -6.55, px, pz, 3.0);
    E.shake?.(0.75, 0.32);
    schedule(() => {
      E.audio?.stopWomanCrying?.();
      if (ghostState === 'hidden') hideGhost();
      triggerPhantomLunge(null);
    }, 680);
  };

  const triggerCellarTrapScare = () => {
    if (fired.has('cellar_ambush') || E.ref.vaultRestored) return;
    fired.add('cellar_ambush');
    scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 2.4);
    const { px, pz } = getPlayerPose();
    placeGhost(12.9, 10.2, px, pz, 3.2);
    E.audio?.playBonecrack?.(0.92);
    E.audio?.playMonster?.(0.84);
    E.audio?.chainsRattle?.();
    E.shake?.(0.95, 0.42);
    h.onFlash?.('#60000b', 0.42, 190);
    h.onScare?.('cellar_ambush', null);
    schedule(() => {
      if (ghostState === 'hidden') hideGhost();
    }, 650);
  };

  const pickCorridorPeekSpot = (px, pz) => {
    const spots = [
      [-8.55, 0.1],
      [8.55, -0.1],
      [0, 7.25],
      [-4.9, -6.4],
      [4.9, -6.4],
      [-12.8, 3.8],
      [12.8, -3.6],
      [-13.3, -8.5],
      [12.9, 8.6],
    ];
    let best = null;
    let bestScore = Infinity;
    for (const [sx, sz] of spots) {
      const dist = Math.hypot(px - sx, pz - sz);
      if (dist < 4.5 || dist > 14.5) continue;
      const score = Math.abs(dist - 7.5);
      if (score < bestScore) {
        bestScore = score;
        best = [sx, sz];
      }
    }
    return best;
  };

  const tick = (dt) => {
    // Advance active 3D apparition close-quarters strobe encounter + FOV tunnel snap
    if (lungeT >= 0) {
      lungeT += dt;
      const k = Math.min(1, lungeT / 0.22);
      const { px, pz, fx, fz } = getPlayerPose();
      const dist = 1.48 - 0.54 * k;
      if (E.ref.ghost) {
        placeGhost(px + fx * dist, pz + fz * dist, px, pz, 4.4);
      }
      if (E.cam && E.cam.isPerspectiveCamera) {
        E.cam.fov = baseFov - 16 * Math.sin(Math.min(1, lungeT / 0.44) * Math.PI);
        E.cam.updateProjectionMatrix();
      }
      if (lungeT >= 0.46) {
        lungeT = -1;
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
      E.audio?.stopMachineLoop?.();
      E.ref._lightsOverridden = false;
      setGlobalLightScale(1.0);
      if (E.cam && E.cam.isPerspectiveCamera && E.cam.fov !== baseFov) {
        E.cam.fov = baseFov;
        E.cam.updateProjectionMatrix();
      }
      return;
    }

    const { px, pz } = getPlayerPose();
    if (pz < 7.6) leftNarthex = true;

    // Off-camera >110° Phasmophobia mannequin beat for 6C Weeping Seraph
    if (pendingStatueTurn && E.ref.westStatue && !lookingAt(-11.8, -3.6, -0.34)) {
      pendingStatueTurn = false;
      E.ref.westStatue.rotation.y += Math.PI;
      E.audio?.statueScrape?.();
    }

    // 1. Entry Cell weeping audio -> abruptly cuts silent & slams as player approaches bars
    if (!fired.has('cell_sobbing') && !fired.has('entry_cell_peek') && elapsed > 0.6 && pz > 9.5) {
      fired.add('cell_sobbing');
      E.audio?.playWomanCrying?.(0.36);
    }
    if (
      !fired.has('entry_cell_peek') &&
      ((elapsed > 1.2 && pz < 12.7) || (elapsed > 0.8 && pz > 8.8 && lookingAt(-4.5, 10.9, 0.58)))
    ) {
      triggerEntryCellVanish();
    }

    // 2. Wing triggers
    if (elapsed > 4 && px > 9.4) {
      visitedSideWing = true;
      if (!fired.has('east_stalker_flicker')) triggerEastBayPeek();
    }
    if (elapsed > 4 && px < -9.4) {
      visitedSideWing = true;
      if (!fired.has('west_crypt_chill')) triggerWestCryptChill();
    }

    // 3. New chambers (6E South Quarantine Cellar & 6F North Reliquary Chapel)
    if (px > 10.4 && pz > 6.8 && !fired.has('cellar_ambush')) {
      triggerCellarTrapScare();
    }
    if (px < -10.4 && pz < -6.9 && !fired.has('chapel_reliquary')) {
      triggerChapelReliquaryScare();
    }

    // 4. Behind-you breath + ambush on turn (randomized elapsed gate)
    if (elapsed > jitterBehind && Math.abs(px) > 10.0 && !fired.has('behind_you_whisper')) {
      triggerBehindYouWhisper();
    }
    if (behindWatch) {
      if (elapsed > behindWatch.expiresAt) {
        behindWatch = null;
      } else if (lookingAt(behindWatch.tx, behindWatch.tz, 0.70)) {
        const bw = behindWatch;
        behindWatch = null;
        placeGhost(bw.tx, bw.tz, px, pz, 4.8, (Math.random() < 0.5 ? -1 : 1) * 0.12);
        if (E.ref.ghostLight) E.ref.ghostLight.color.setHex(0xd4e2f4);
        E.audio?.playStab?.(0.9);
        E.audio?.playMonster?.(0.84);
        E.shake?.(1.35, 0.48);
        h.onFlash?.('#5e000b', 0.46, 180);
        h.onNightmarePulse?.(380);
        h.onScare?.('behind_turn', null);
        schedule(() => {
          if (ghostState === 'hidden') hideGhost();
        }, 540);
      }
    }

    // 5. Nave cross-corridor sprint
    if (visitedSideWing && elapsed > jitterDart && Math.abs(px) < 4.8 && pz > -3.5 && !fired.has('corridor_dart')) {
      triggerCorridorDart();
    }

    if (dartProgress >= 0 && E.ref.ghost) {
      dartProgress += dt / 0.55;
      if (dartProgress >= 1) {
        dartProgress = -1;
        hideGhost();
      } else {
        const gx = -5.2 + dartProgress * 10.4;
        placeGhost(gx, -1.6, 5.2, -1.6, 2.2);
      }
    }

    // 6. Cage breathing
    const distToCore = Math.hypot(px, pz + 5.2);
    if (elapsed > 6 && distToCore < 3.8 && !fired.has('cage_breath')) {
      triggerCageBreath();
    }

    // 7. Signature Cold Blackout Ambush (jittered start)
    if (visitedSideWing && elapsed > jitterBlackout && Math.abs(px) < 7.5 && !fired.has('blackout_ambush')) {
      triggerBlackoutAmbush();
    }

    // 8. Non-Uniform Randomized Horror Director (varies interval + encounter type every trigger)
    if (elapsed >= scriptedBusyUntil && leftNarthex && dartProgress < 0 && E.ref.ghost) {
      if (ghostState === 'hidden' && elapsed >= nextHuntAt && !behindWatch) {
        const modes = ['shoulder_breath', 'corner_stare', 'stalker_watcher', 'door_creak_lurk', 'local_brownout'];
        if (visitedSideWing) modes.push('lunge_ambush');
        const pool = modes.filter((m) => m !== lastDirectorMode);
        const mode = pool[Math.floor(Math.random() * pool.length)];
        lastDirectorMode = mode;

        if (mode === 'shoulder_breath') {
          const { fx, fz } = getPlayerPose();
          behindWatch = {
            tx: px - fx * 1.9,
            tz: pz - fz * 1.9,
            expiresAt: elapsed + 5.4,
          };
          E.audio?.phantomSteps?.();
          E.audio?.playBreathScared?.(0.84);
          E.audio?.whisper?.();
          schedule(() => {
            if (!E.ref.vaultRestored && behindWatch) {
              E.audio?.creak?.();
              E.audio?.chainsRattle?.();
            }
          }, 2400);
          nextHuntAt = elapsed + scheduleRandomDelay();
        } else if (mode === 'door_creak_lurk') {
          scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 2.4);
          E.audio?.creak?.();
          schedule(() => {
            if (!E.ref.vaultRestored) E.audio?.playWomanCrying?.(0.28);
          }, 260);
          schedule(() => {
            if (E.ref.vaultRestored) return;
            E.audio?.stopWomanCrying?.();
            const pose = getPlayerPose();
            const sideSign = Math.random() < 0.5 ? -1 : 1;
            const ang = pose.yaw + sideSign * (0.58 + Math.random() * 0.25);
            const lx = pose.px - Math.sin(ang) * 2.45;
            const lz = pose.pz - Math.cos(ang) * 2.45;
            E.ref._lightsOverridden = true;
            const localLight =
              pose.px < -7 ? E.ref.westCryptLight : pose.px > 7 ? E.ref.eastCryptLight : E.ref.coreLight;
            const prevInt = localLight?.intensity ?? 2.6;
            if (localLight) localLight.intensity = 0.25;
            placeGhost(lx, lz, pose.px, pose.pz, 3.8, sideSign * 0.13);
            E.audio?.playBonecrack?.(0.86);
            E.shake?.(1.05, 0.34);
            h.onFlash?.('#540008', 0.32, 140);
            schedule(() => {
              if (localLight) localLight.intensity = prevInt;
              E.ref._lightsOverridden = false;
              if (ghostState === 'hidden') hideGhost();
            }, 480);
          }, 960);
          nextHuntAt = elapsed + scheduleRandomDelay();
        } else if (mode === 'local_brownout') {
          scriptedBusyUntil = Math.max(scriptedBusyUntil, elapsed + 2.2);
          E.audio?.powerOut?.();
          E.audio?.chainsRattle?.();
          setGlobalLightScale(0.2);
          placeGhost(0, -2.5, px, pz, 2.5, 0.08);
          [220, 480, 820, 1240].forEach((ms, i) => {
            schedule(() => {
              if (E.ref.vaultRestored) return;
              setGlobalLightScale(i % 2 === 0 ? 0.85 : 0.18);
            }, ms);
          });
          schedule(() => {
            if (ghostState === 'hidden') hideGhost();
            setGlobalLightScale(1.0);
          }, 1460);
          nextHuntAt = elapsed + scheduleRandomDelay();
        } else if (mode === 'lunge_ambush') {
          triggerPhantomLunge(null);
          nextHuntAt = elapsed + scheduleRandomDelay();
        } else {
          // 'corner_stare' / 'stalker_watcher': silent watchful silhouette; eye contact snaps off or stalks
          const spot = pickCorridorPeekSpot(px, pz);
          if (spot) {
            ghostState = 'peek';
            ghostTimer = 0;
            lookHoldTimer = 0;
            stareCharge = Math.random() < 0.54;
            const useStalker = mode === 'stalker_watcher' && E.ref.stalker;
            peekEntity = useStalker ? E.ref.stalker : E.ref.ghost;
            const headTilt = (Math.random() < 0.5 ? -1 : 1) * (0.09 + Math.random() * 0.06);
            placeEntity(peekEntity, spot[0], spot[1], px, pz, useStalker ? 2.6 : 2.2, headTilt);
            if (useStalker) {
              E.audio?.playEvilLaugh?.(0.26);
              E.audio?.playCrows?.(0.24);
            } else {
              E.audio?.playBreathScared?.(0.62);
            }
          } else {
            nextHuntAt = elapsed + 4.5 + Math.random() * 4.5;
          }
        }
      } else if (ghostState === 'peek') {
        ghostTimer += dt;
        const active = peekEntity || E.ref.ghost;
        const gx = active.position.x;
        const gz = active.position.z;
        const gDist = Math.hypot(px - gx, pz - gz);
        active.rotation.y = Math.atan2(px - gx, pz - gz);

        const isWatched = lookingAt(gx, gz, 0.74) && gDist < 12.5;
        if (isWatched) lookHoldTimer += dt;

        if ((isWatched && lookHoldTimer > 0.48) || gDist < 4.2) {
          if (stareCharge) {
            ghostState = 'hunt';
            ghostTimer = 0;
            E.audio?.playMonster?.(0.8);
            E.audio?.phantomSteps?.();
            if (E.ref.ghostLight) E.ref.ghostLight.intensity = 3.8;
          } else {
            // Sudden snap vanish + creak leaves player guessing instead of repetitive forced rushes
            ghostState = 'hidden';
            hideGhost();
            E.audio?.playBonecrack?.(0.84);
            E.audio?.creak?.();
            setGlobalLightScale(0.28);
            schedule(() => setGlobalLightScale(1.0), 190);
            nextHuntAt = elapsed + scheduleRandomDelay();
          }
        } else if (ghostTimer > 6.4) {
          ghostState = 'hidden';
          hideGhost();
          nextHuntAt = elapsed + scheduleRandomDelay();
        }
      } else if (ghostState === 'hunt') {
        ghostTimer += dt;
        const active = peekEntity || E.ref.ghost;
        const gx = active.position.x;
        const gz = active.position.z;
        const dx = px - gx;
        const dz = pz - gz;
        const gDist = Math.hypot(dx, dz) || 1;
        const step = Math.min(gDist, 6.4 * dt);
        const nx = gx + (dx / gDist) * step;
        const nz = gz + (dz / gDist) * step;
        placeEntity(active, nx, nz, px, pz, 4.0, active.rotation.z);

        if (gDist < 1.9 || ghostTimer > 1.35) {
          ghostState = 'hidden';
          hideGhost();
          if (gDist < 2.3) {
            triggerPhantomLunge(null);
          } else {
            E.audio?.playStab?.(0.78);
            E.shake?.(0.95, 0.36);
            h.onFlash?.('#540008', 0.34, 160);
            h.onNightmarePulse?.(280);
            h.onScare?.('ghost_rush', null);
          }
          nextHuntAt = elapsed + scheduleRandomDelay();
        }
      }
    }
  };

  const handleLoreInspect = (id) => {
    E.ref.triggerInteractAnim?.(id);
    const key = `lore_react_${id}`;
    if (fired.has(key) || E.ref.vaultRestored) return;
    fired.add(key);

    if (id === 'narthex_registry' || id === 'scriptorium_books') {
      E.audio?.creak?.();
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
        return true;
      }
      if (name === 'failsafe_open') {
        E.ref.openFailsafeDoor?.();
        E.audio?.startMachineLoop?.(0.22);
        return true;
      }
      if (typeof name === 'string' && name.startsWith('inspect_')) {
        handleLoreInspect(name.slice(8));
        return true;
      }
      return false;
    },
    onCoreGlassInspect: triggerCoreGlassScare,
    onConsoleReject: triggerConsoleReject,
    dispose: () => {
      hideGhost();
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

// Daniel's Study 3D Scene Builder
// Implements all 20 objects + 2 doors strictly adhering to Golden Reference Blueprint (zero GLB, geometry merging, <250 draw calls)

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as X from './tex.js';
import { bgeo, mat, wm, lathe } from './kit.js';

export function buildStudy(E) {
  const { S, add, solid, anim, interact, W, H, D, ref } = E;

  // Shared Materials Palette (reused to avoid GPU pipeline switching)
  const darkOak = wm('dark', { r: 0.75, c: 0x241810 });
  const wornWood = wm('worn', { r: 0.8, c: 0x302216 });
  const ebonyWood = wm('ebony', { r: 0.6, c: 0x120c0a });
  const brassMat = mat({ m: 0.85, r: 0.4, c: 0x8ea870 });
  const beigeMetal = mat({ m: 0.6, r: 0.5, c: 0xb5b09d });
  const darkSteel = mat({ m: 0.8, r: 0.4, c: 0x222a26 });
  const greenLeather = mat({ r: 0.7, c: 0x163322 });
  const goldTrim = mat({ m: 0.9, r: 0.3, c: 0xcca850 });
  const crtGlowMat = new THREE.MeshBasicMaterial({ color: 0x3dff8b });
  const crtScreenOff = mat({ r: 0.2, m: 0.8, c: 0x07150d });
  const paperMat = mat({ r: 0.95, c: 0xddddcc });

  // Procedural CRT Screen Canvas Texture
  const crtCanvas = document.createElement('canvas');
  crtCanvas.width = 512;
  crtCanvas.height = 384;
  const ctx = crtCanvas.getContext('2d');
  ctx.fillStyle = '#05140b';
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = '#3dff8b';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('> VANCE_OS v2.4 (TERMINAL ACTIVE)', 30, 50);
  ctx.fillText('> SYSTEM CRASH LOG PENDING...', 30, 90);
  ctx.fillText('> MEMORY OFFSET: 0x00007FFA', 30, 130);
  ctx.fillText('> FATAL FAULT: ORBIT.SYS', 30, 170);
  ctx.fillText('> UNREAD MAIL: 1 ENCRYPTED DRAFT', 30, 210);
  ctx.fillText('> INPUT PASSCODE TO DECRYPT TABLET', 30, 250);
  ctx.fillText('> _', 30, 290);
  // Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  for (let y = 0; y < 384; y += 4) {
    ctx.fillRect(0, y, 512, 2);
  }
  const crtTexture = new THREE.CanvasTexture(crtCanvas);
  const crtScreenMat = new THREE.MeshBasicMaterial({ map: crtTexture });

  // 1. Center Desk (Heavy Executive Oak Desk) - decor
  {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0.0, 0.0, -0.7);

    // Desktop
    const top = new THREE.Mesh(bgeo(2.6, 0.08, 1.3), darkOak);
    top.position.set(0, 0.74, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    deskGroup.add(top);

    // Left and right drawer pedestals
    const leftPed = new THREE.Mesh(bgeo(0.65, 0.7, 1.15), wornWood);
    leftPed.position.set(-0.95, 0.35, 0);
    leftPed.castShadow = true;
    const rightPed = new THREE.Mesh(bgeo(0.65, 0.7, 1.15), wornWood);
    rightPed.position.set(0.95, 0.35, 0);
    rightPed.castShadow = true;
    deskGroup.add(leftPed, rightPed);

    // Modesty back panel
    const backPanel = new THREE.Mesh(bgeo(1.3, 0.6, 0.04), darkOak);
    backPanel.position.set(0, 0.4, -0.5);
    deskGroup.add(backPanel);

    deskGroup.userData.np = 1;
    interact(deskGroup, 'desk');
    add(deskGroup);
    solid(-1.4, 1.4, -1.4, 0.0);
  }

  // 2. Desk Blotter (interactive_fragment) - holds ES03
  {
    const blotterGroup = new THREE.Group();
    blotterGroup.position.set(0.0, 0.76, -0.48);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.015, 0.65), greenLeather);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.012, 0.67), goldTrim);
    trim.position.y = -0.002;
    blotterGroup.add(pad, trim);

    // Corner brass accents
    [[-0.46, -0.31], [0.46, -0.31], [-0.46, 0.31], [0.46, 0.31]].forEach(([cx, cz]) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.06), brassMat);
      c.position.set(cx, 0.005, cz);
      blotterGroup.add(c);
    });

    interact(blotterGroup, 'desk_blotter');
    add(blotterGroup);
  }

  // 3. CRT Monitor (clue_entry R1-06) - Old CRT monitor on desk
  {
    const crtGroup = new THREE.Group();
    crtGroup.position.set(0.0, 0.95, -0.8);

    // Monitor housing
    const casing = new THREE.Mesh(bgeo(0.55, 0.46, 0.5), beigeMetal);
    casing.castShadow = true;
    crtGroup.add(casing);

    // Screen bezel & curved screen
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.34), crtScreenMat);
    screen.position.set(0, 0.02, 0.252);
    crtGroup.add(screen);

    // Stand base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.08, 12), darkSteel);
    base.position.set(0, -0.22, 0);
    crtGroup.add(base);

    // Power LED
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), crtGlowMat);
    led.position.set(0.2, -0.18, 0.253);
    crtGroup.add(led);

    // Subtle screen point light
    const screenLight = new THREE.PointLight(0x3dff8b, 0.8, 2.2, 2);
    screenLight.position.set(0, 0.05, 0.4);
    crtGroup.add(screenLight);

    interact(crtGroup, 'crt_monitor');
    add(crtGroup);
  }

  // 4. Locked Desk Drawer / Tablet Drawer (clue_entry R1-05)
  {
    const drawerGroup = new THREE.Group();
    drawerGroup.position.set(-1.2, 0.72, -0.5);

    const face = new THREE.Mesh(bgeo(0.58, 0.22, 0.04), darkOak);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), brassMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 0, 0.035);

    // Electronic keypad lock on drawer
    const lockPad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.02), darkSteel);
    lockPad.position.set(0, 0.06, 0.03);
    const lockLed = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff4444 }));
    lockLed.position.set(0.04, 0.08, 0.042);

    drawerGroup.add(face, handle, lockPad, lockLed);
    interact(drawerGroup, 'tablet_drawer');
    add(drawerGroup);
  }

  // 5. Terminal PC (clue_entry R1-07) - Right side of desk
  {
    const pcGroup = new THREE.Group();
    pcGroup.position.set(0.9, 0.5, -0.8);

    const tower = new THREE.Mesh(bgeo(0.35, 0.55, 0.6), beigeMetal);
    tower.castShadow = true;
    pcGroup.add(tower);

    // 5.25" and 3.5" drive slots
    const drive1 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.01), darkSteel);
    drive1.position.set(0, 0.18, 0.302);
    const drive2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.01), darkSteel);
    drive2.position.set(0, 0.1, 0.302);
    const hddLed = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), crtGlowMat);
    hddLed.position.set(0.1, 0.02, 0.303);
    pcGroup.add(drive1, drive2, hddLed);

    // Power switch
    const pwr = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.015), darkSteel);
    pwr.position.set(-0.1, 0.02, 0.303);
    pcGroup.add(pwr);

    interact(pcGroup, 'terminal_pc');
    add(pcGroup);
  }

  // 6. Dot-Matrix Line Printer (clue_entry R1-08) - Side table
  {
    const printerGroup = new THREE.Group();
    printerGroup.position.set(1.8, 0.75, -0.4);

    // Printer stand table
    const tableTop = new THREE.Mesh(bgeo(0.7, 0.05, 0.6), wornWood);
    tableTop.position.y = -0.05;
    const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), darkSteel);
    leg1.position.set(-0.3, -0.4, -0.25);
    const leg2 = leg1.clone(); leg2.position.x = 0.3;
    const leg3 = leg1.clone(); leg3.position.z = 0.25;
    const leg4 = leg2.clone(); leg4.position.z = 0.25;
    printerGroup.add(tableTop, leg1, leg2, leg3, leg4);

    // Printer Body
    const printerBody = new THREE.Mesh(bgeo(0.55, 0.22, 0.45), beigeMetal);
    printerBody.position.y = 0.1;
    printerBody.castShadow = true;
    printerGroup.add(printerBody);

    // Smoked plastic cover
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.25), mat({ c: 0x223328, t: 1, o: 0.6, r: 0.1 }));
    cover.position.set(0, 0.22, -0.05);
    printerGroup.add(cover);

    // Paper feed & fanfold paper
    const paperFeed = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.01, 0.3), paperMat);
    paperFeed.position.set(0, 0.26, 0.1);
    paperFeed.rotation.x = -0.3;
    printerGroup.add(paperFeed);

    interact(printerGroup, 'line_printer');
    add(printerGroup);
    solid(1.4, 2.2, -0.75, -0.05);
  }

  // 7. Bookshelf (interactive_fragment) - West wall at x: -2.8, z: 0.0 - Holds ES01 & EK03
  {
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(-2.8, 1.5, 0.0);
    shelfGroup.rotation.y = Math.PI / 2;

    const frameL = new THREE.Mesh(bgeo(0.05, 2.8, 0.45), darkOak);
    frameL.position.x = -1.05;
    const frameR = new THREE.Mesh(bgeo(0.05, 2.8, 0.45), darkOak);
    frameR.position.x = 1.05;
    const topBoard = new THREE.Mesh(bgeo(2.15, 0.06, 0.45), darkOak);
    topBoard.position.y = 1.38;
    const btmBoard = new THREE.Mesh(bgeo(2.15, 0.08, 0.45), darkOak);
    btmBoard.position.y = -1.36;
    const backWall = new THREE.Mesh(bgeo(2.1, 2.7, 0.02), ebonyWood);
    backWall.position.z = -0.21;
    shelfGroup.add(frameL, frameR, topBoard, btmBoard, backWall);

    // 4 Shelves
    const shelfYs = [-0.8, -0.25, 0.3, 0.85];
    shelfYs.forEach(sy => {
      const sh = new THREE.Mesh(bgeo(2.05, 0.04, 0.42), wornWood);
      sh.position.y = sy;
      shelfGroup.add(sh);
    });

    // Merged Books Rows (BufferGeometryUtils.mergeGeometries)
    const bookColors = [0x1a3324, 0x4a2a1a, 0x18243a, 0x332211];
    const bookGeos = [];
    shelfYs.forEach((sy, rIdx) => {
      let bx = -0.92;
      while (bx < 0.9) {
        const bw = 0.035 + (Math.sin(bx * 7 + rIdx) * 0.5 + 0.5) * 0.03;
        const bh = 0.22 + (Math.cos(bx * 5) * 0.5 + 0.5) * 0.12;
        const bg = new THREE.BoxGeometry(bw, bh, 0.32);
        bg.translate(bx + bw / 2, sy + bh / 2 + 0.02, 0.02);
        bookGeos.push(bg);
        bx += bw + 0.005;
      }
    });

    if (bookGeos.length > 0) {
      const mergedBooks = BufferGeometryUtils.mergeGeometries(bookGeos);
      const booksMesh = new THREE.Mesh(mergedBooks, mat({ c: 0x2a3e30, r: 0.8 }));
      shelfGroup.add(booksMesh);
    }

    interact(shelfGroup, 'bookshelf');
    add(shelfGroup);
    solid(-3.1, -2.4, -1.2, 1.2);
  }

  // 8. Corkboard with Red String (interactive_fragment) - North-east wall - Holds ES02 & ES09
  {
    const corkGroup = new THREE.Group();
    corkGroup.position.set(1.5, 1.8, -2.8);

    // Frame & Board
    const frame = new THREE.Mesh(bgeo(1.8, 1.1, 0.06), wornWood);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0), mat({ c: 0xb58c5a, r: 0.9 }));
    board.position.z = 0.032;
    corkGroup.add(frame, board);

    // Pinned notes & red strings merged
    const noteGeos = [];
    const pinGeos = [];
    const pinCoords = [
      [-0.6, 0.3], [-0.2, 0.35], [0.4, 0.25],
      [-0.4, -0.1], [0.1, -0.15], [0.55, -0.2],
      [-0.1, 0.05], [0.35, 0.0]
    ];

    pinCoords.forEach(([px, py], i) => {
      // Note paper
      const ng = new THREE.PlaneGeometry(0.18, 0.14);
      ng.rotateZ((i % 3 - 1) * 0.12);
      ng.translate(px, py, 0.036);
      noteGeos.push(ng);

      // Pin head
      const pg = new THREE.SphereGeometry(0.012, 6, 6);
      pg.translate(px, py + 0.06, 0.045);
      pinGeos.push(pg);
    });

    if (noteGeos.length) {
      const mergedNotes = BufferGeometryUtils.mergeGeometries(noteGeos);
      corkGroup.add(new THREE.Mesh(mergedNotes, mat({ c: 0xf5eed6, r: 0.9 })));
    }
    if (pinGeos.length) {
      const mergedPins = BufferGeometryUtils.mergeGeometries(pinGeos);
      corkGroup.add(new THREE.Mesh(mergedPins, new THREE.MeshBasicMaterial({ color: 0xff2222 })));
    }

    // Connecting Red String Lines (Tube or LineSegments)
    const stringLines = [];
    for (let i = 0; i < pinCoords.length - 1; i++) {
      const p1 = new THREE.Vector3(pinCoords[i][0], pinCoords[i][1] + 0.06, 0.045);
      const p2 = new THREE.Vector3(pinCoords[i + 1][0], pinCoords[i + 1][1] + 0.06, 0.045);
      stringLines.push(p1, p2);
    }
    const strGeo = new THREE.BufferGeometry().setFromPoints(stringLines);
    const strMesh = new THREE.LineSegments(strGeo, new THREE.LineBasicMaterial({ color: 0xff3333 }));
    corkGroup.add(strMesh);

    interact(corkGroup, 'corkboard');
    add(corkGroup);
  }

  // 9. Filing Cabinet (interactive_fragment) - Holds ES04 & ES10
  {
    const cabGroup = new THREE.Group();
    cabGroup.position.set(-2.6, 0.8, -2.5);

    const body = new THREE.Mesh(bgeo(0.6, 1.5, 0.65), darkSteel);
    body.castShadow = true;
    cabGroup.add(body);

    // 4 Drawers with aluminum handles
    for (let d = 0; d < 4; d++) {
      const dy = 0.52 - d * 0.35;
      const drawerFace = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.31, 0.02), beigeMetal);
      drawerFace.position.set(0, dy, 0.33);

      const hndl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.03), brassMat);
      hndl.position.set(0, dy, 0.355);

      const labelTag = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04), paperMat);
      labelTag.position.set(0, dy + 0.06, 0.342);

      cabGroup.add(drawerFace, hndl, labelTag);
    }

    interact(cabGroup, 'filing_cabinet');
    add(cabGroup);
    solid(-2.95, -2.25, -2.85, -2.15);
  }

  // 10. Sticky-Note Wall (interactive_fragment) - Holds ES05
  {
    const stickyGroup = new THREE.Group();
    stickyGroup.position.set(-1.8, 1.8, -2.9);

    // Group and merge layered sticky notes (BufferGeometryUtils.mergeGeometries)
    const stickyGeosYellow = [];
    const stickyGeosGreen = [];
    for (let i = 0; i < 28; i++) {
      const sx = (i % 7) * 0.18 - 0.54 + (Math.sin(i * 3) * 0.03);
      const sy = Math.floor(i / 7) * 0.18 - 0.27 + (Math.cos(i * 2) * 0.02);
      const sg = new THREE.PlaneGeometry(0.14, 0.14);
      sg.rotateZ((Math.sin(i * 11) * 0.08));
      sg.translate(sx, sy, 0.01 + (i % 3) * 0.003);
      if (i % 4 === 0) stickyGeosGreen.push(sg);
      else stickyGeosYellow.push(sg);
    }

    if (stickyGeosYellow.length) {
      const my = BufferGeometryUtils.mergeGeometries(stickyGeosYellow);
      stickyGroup.add(new THREE.Mesh(my, mat({ c: 0xffee66, r: 0.95 })));
    }
    if (stickyGeosGreen.length) {
      const mg = BufferGeometryUtils.mergeGeometries(stickyGeosGreen);
      stickyGroup.add(new THREE.Mesh(mg, mat({ c: 0x88ffaa, r: 0.95 })));
    }

    interact(stickyGroup, 'sticky_wall');
    add(stickyGroup);
  }

  // 11. Armchair (interactive_fragment) - Reading nook at x: -2.0, z: 1.5 - Holds ES06
  {
    const chairGroup = new THREE.Group();
    chairGroup.position.set(-2.0, 0.5, 1.5);
    chairGroup.rotation.y = Math.PI / 4;

    // Cushion seat
    const seat = new THREE.Mesh(bgeo(0.85, 0.25, 0.8), greenLeather);
    seat.position.y = 0.0;
    // Backrest
    const back = new THREE.Mesh(bgeo(0.85, 0.75, 0.22), greenLeather);
    back.position.set(0, 0.45, -0.32);
    // Arms
    const armL = new THREE.Mesh(bgeo(0.18, 0.45, 0.75), greenLeather);
    armL.position.set(-0.48, 0.2, 0);
    const armR = armL.clone();
    armR.position.x = 0.48;
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.25, 8);
    const fl = new THREE.Mesh(legGeo, darkOak); fl.position.set(-0.35, -0.22, 0.3);
    const fr = fl.clone(); fr.position.x = 0.35;
    const bl = fl.clone(); bl.position.z = -0.3;
    const br = fr.clone(); br.position.z = -0.3;

    chairGroup.add(seat, back, armL, armR, fl, fr, bl, br);
    chairGroup.castShadow = true;

    interact(chairGroup, 'armchair');
    add(chairGroup);
    solid(-2.55, -1.45, 0.95, 2.05);
  }

  // 12. Reel Recorder (interactive_fragment) - Holds ES07 & EK02
  {
    const reelGroup = new THREE.Group();
    reelGroup.position.set(2.2, 0.8, 1.0);

    // Audio cart
    const cart = new THREE.Mesh(bgeo(0.65, 0.65, 0.55), wornWood);
    cart.position.y = -0.35;
    reelGroup.add(cart);

    // Tape Deck housing
    const deck = new THREE.Mesh(bgeo(0.58, 0.25, 0.48), darkSteel);
    deck.position.y = 0.08;
    reelGroup.add(deck);

    // Dual tape reels
    const reelGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.02, 16);
    const leftReel = new THREE.Mesh(reelGeo, mat({ m: 0.9, r: 0.2, c: 0xd8d8d8 }));
    leftReel.position.set(-0.14, 0.21, 0);
    const rightReel = leftReel.clone();
    rightReel.position.x = 0.14;
    reelGroup.add(leftReel, rightReel);

    // VU Meters
    const vuL = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.04), mat({ c: 0xffea88 }));
    vuL.position.set(-0.06, 0.12, 0.242);
    const vuR = vuL.clone();
    vuR.position.x = 0.06;
    reelGroup.add(vuL, vuR);

    // Animate reels rotating slowly
    anim((t) => {
      leftReel.rotation.y = t * 1.5;
      rightReel.rotation.y = t * 1.5;
    });

    interact(reelGroup, 'reel_recorder');
    add(reelGroup);
    solid(1.85, 2.55, 0.7, 1.3);
  }

  // 13. Cable Bundle (interactive_fragment) - Holds ES08
  {
    const cableGroup = new THREE.Group();
    cableGroup.position.set(-0.5, 0.05, -1.1);

    // Merge multiple tube cable strands (BufferGeometryUtils.mergeGeometries)
    const cableGeos = [];
    const ptsList = [
      [[-0.3, 0.01, -0.2], [-0.1, 0.08, 0.0], [0.2, 0.02, 0.15], [0.35, 0.05, -0.1]],
      [[-0.25, 0.02, 0.15], [0.0, 0.06, -0.1], [0.18, 0.04, 0.2], [0.4, 0.02, 0.05]],
      [[-0.35, 0.03, -0.05], [-0.05, 0.1, 0.1], [0.15, 0.05, -0.15], [0.3, 0.01, 0.2]]
    ];

    ptsList.forEach(pts => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
      const tg = new THREE.TubeGeometry(curve, 16, 0.018, 6, false);
      cableGeos.push(tg);
    });

    if (cableGeos.length) {
      const mergedCables = BufferGeometryUtils.mergeGeometries(cableGeos);
      const cableMesh = new THREE.Mesh(mergedCables, mat({ c: 0x181818, r: 0.9 }));
      cableGroup.add(cableMesh);
    }

    interact(cableGroup, 'cable_bundle');
    add(cableGroup);
  }

  // 14. Floor Lamp (interactive_fragment) - Holds ES11
  {
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-2.6, 1.2, 1.8);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.06, 12), brassMat);
    base.position.y = -1.17;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.0, 8), brassMat);
    pole.position.y = -0.17;

    // Green glass lampshade
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.24, 0.28, 14, 1, true),
      mat({ c: 0x246638, e: 0x1b4d28, ei: 0.6, side: THREE.DoubleSide, r: 0.4 })
    );
    shade.position.y = 0.85;
    lampGroup.add(base, pole, shade);

    // Warm green reading light
    const lampLight = new THREE.PointLight(0x7dffb0, 1.6, 4.5, 2);
    lampLight.position.set(0, 0.8, 0);
    lampGroup.add(lampLight);

    interact(lampGroup, 'floor_lamp');
    add(lampGroup);
    solid(-2.85, -2.35, 1.55, 2.05);
  }

  // 15. Waste Bin (interactive_fragment) - Holds ES12
  {
    const binGroup = new THREE.Group();
    binGroup.position.set(1.1, 0.22, -0.9);

    const binMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.12, 0.38, 12, 1, true),
      darkSteel
    );
    binGroup.add(binMesh);

    // Crumpled paper printouts inside
    for (let p = 0; p < 4; p++) {
      const crumpled = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.05, 0),
        mat({ c: 0xeeeecd, r: 1 })
      );
      crumpled.position.set((p % 2 - 0.5) * 0.08, -0.05 + p * 0.06, (Math.floor(p / 2) - 0.5) * 0.08);
      binGroup.add(crumpled);
    }

    interact(binGroup, 'wastebin');
    add(binGroup);
  }

  // 16. Window (interactive_fragment) - East wall - Holds XS01 Decoy
  {
    const winGroup = new THREE.Group();
    winGroup.position.set(2.9, 1.5, 0.0);
    winGroup.rotation.y = -Math.PI / 2;

    const winFrame = new THREE.Mesh(bgeo(1.8, 1.6, 0.1), darkOak);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.4),
      mat({ c: 0x11281c, t: 1, o: 0.35, r: 0.1, side: THREE.DoubleSide })
    );
    glass.position.z = 0.01;
    const sill = new THREE.Mesh(bgeo(2.0, 0.08, 0.3), darkOak);
    sill.position.set(0, -0.84, 0.08);
    winGroup.add(winFrame, glass, sill);

    interact(winGroup, 'window');
    add(winGroup);
  }

  // 17. Radiator (interactive_fragment) - Under window - Holds XS02 Decoy
  {
    const radGroup = new THREE.Group();
    radGroup.position.set(2.9, 0.4, 0.2);
    radGroup.rotation.y = -Math.PI / 2;

    // Merged cast-iron heating fins
    const finGeos = [];
    for (let f = 0; f < 8; f++) {
      const fg = new THREE.BoxGeometry(0.06, 0.55, 0.18);
      fg.translate((f - 3.5) * 0.12, 0, 0);
      finGeos.push(fg);
    }
    const mergedFins = BufferGeometryUtils.mergeGeometries(finGeos);
    const finsMesh = new THREE.Mesh(mergedFins, darkSteel);
    radGroup.add(finsMesh);

    // Connecting top & bottom steam pipes
    const pipeTop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8), brassMat);
    pipeTop.rotation.z = Math.PI / 2;
    pipeTop.position.y = 0.24;
    const pipeBtm = pipeTop.clone();
    pipeBtm.position.y = -0.24;
    radGroup.add(pipeTop, pipeBtm);

    interact(radGroup, 'radiator');
    add(radGroup);
  }

  // 18. Faded Persian Rug - Center floor (decor)
  {
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 256;
    rugCanvas.height = 256;
    const rctx = rugCanvas.getContext('2d');
    rctx.fillStyle = '#10281b';
    rctx.fillRect(0, 0, 256, 256);
    rctx.strokeStyle = '#2d5e3c';
    rctx.lineWidth = 12;
    rctx.strokeRect(12, 12, 232, 232);
    rctx.strokeStyle = '#4d9460';
    rctx.lineWidth = 6;
    rctx.strokeRect(28, 28, 200, 200);
    const rugTex = new THREE.CanvasTexture(rugCanvas);
    const rugMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.8), mat({ map: rugTex, r: 0.95 }));
    rugMesh.position.set(0.0, 0.008, 0.0);
    rugMesh.rotation.x = -Math.PI / 2;
    rugMesh.userData.np = 1;
    add(rugMesh);
  }

  // 19. Beams & Webs (decor)
  {
    const beamGroup = new THREE.Group();
    beamGroup.position.set(0, 3.0, 0);
    [-1.8, 0.0, 1.8].forEach(bz => {
      const beam = new THREE.Mesh(bgeo(6.8, 0.25, 0.25), darkOak);
      beam.position.z = bz;
      beamGroup.add(beam);
    });
    beamGroup.userData.np = 1;
    add(beamGroup);
  }

  // 20. Coat Stand (decor)
  {
    const coatGroup = new THREE.Group();
    coatGroup.position.set(2.2, 1.0, 2.5);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.0, 8), darkOak);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 8), darkOak);
    base.position.y = -0.97;
    coatGroup.add(pole, base);

    // Trenchcoat draped on peg
    const coat = new THREE.Mesh(bgeo(0.3, 0.9, 0.2), mat({ c: 0x1f2b24, r: 0.95 }));
    coat.position.set(0.08, 0.35, 0.05);
    coatGroup.add(coat);

    coatGroup.userData.np = 1;
    interact(coatGroup, 'coat_stand');
    add(coatGroup);
    solid(1.95, 2.45, 2.25, 2.75);
  }

  // Bedroom Return Door removed: Room 2 has only 1 exit door to Room 3

  // 22. Basement Exit Door (study_door_exit) - North Wall at x: 0.0, z: -2.95
  {
    const exitDoorGroup = new THREE.Group();
    exitDoorGroup.position.set(0.0, 0.0, -2.95);

    // Heavy industrial steel frame
    const doorFrame = new THREE.Mesh(bgeo(1.3, 2.3, 0.16), darkSteel);
    doorFrame.position.y = 1.15;
    exitDoorGroup.add(doorFrame);

    // Door Hinge Pivot for opening animation
    const doorHinge = new THREE.Group();
    doorHinge.position.set(-0.5, 0, 0);

    const doorLeaf = new THREE.Mesh(bgeo(1.0, 2.15, 0.08), darkSteel);
    doorLeaf.position.set(0.5, 1.1, 0);

    // Reinforced steel crossbars & iron deadbolt
    const crossbar1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.04), beigeMetal);
    crossbar1.position.set(0.5, 1.6, 0.05);
    const crossbar2 = crossbar1.clone();
    crossbar2.position.y = 0.6;
    const deadbolt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), brassMat);
    deadbolt.rotation.z = Math.PI / 2;
    deadbolt.position.set(0.9, 1.1, 0.06);

    doorHinge.add(doorLeaf, crossbar1, crossbar2, deadbolt);
    exitDoorGroup.add(doorHinge);

    // Clearance Beacon Light above door
    const beaconLight = new THREE.PointLight(0xff2222, 1.2, 3.0, 2);
    beaconLight.position.set(0, 2.4, 0.15);
    const beaconBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    beaconBulb.position.set(0, 2.4, 0.12);
    exitDoorGroup.add(beaconLight, beaconBulb);

    interact(exitDoorGroup, 'study_door_exit');
    add(exitDoorGroup);
    solid(-0.65, 0.65, -3.1, -2.8);

    // Store reference for door swing animation & clearance beacon toggle
    ref.studyExitDoor = {
      hinge: doorHinge,
      beacon: beaconLight,
      beaconBulb: beaconBulb,
      isOpen: false,
      angle: 0
    };

    // Exit door opening animation
    anim(() => {
      if (ref.studyExitDoor) {
        const targetAngle = ref.studyExitDoor.isOpen ? 1.55 : 0;
        ref.studyExitDoor.angle += (targetAngle - ref.studyExitDoor.angle) * 0.05;
        ref.studyExitDoor.hinge.rotation.y = ref.studyExitDoor.angle;

        if (ref.studyExitDoor.isOpen) {
          ref.studyExitDoor.beacon.color.setHex(0x3dff8b);
          ref.studyExitDoor.beaconBulb.material.color.setHex(0x3dff8b);
        } else {
          ref.studyExitDoor.beacon.color.setHex(0xff2222);
          ref.studyExitDoor.beaconBulb.material.color.setHex(0xff2222);
        }
      }
    });
  }
}

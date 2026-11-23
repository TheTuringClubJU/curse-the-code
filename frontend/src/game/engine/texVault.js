import * as THREE from 'three';

const pbrBaseCache = new Map();
const textureLoader = new THREE.TextureLoader();

function cloneTiled(tex, rx, ry, colorSpace) {
  const c = tex.clone();
  c.colorSpace = colorSpace;
  c.wrapS = THREE.RepeatWrapping;
  c.wrapT = THREE.RepeatWrapping;
  c.magFilter = THREE.LinearFilter;
  c.minFilter = THREE.LinearMipmapLinearFilter;
  c.repeat.set(rx, ry);
  c.anisotropy = 2;
  c.needsUpdate = true;
  return c;
}

/**
 * Load CC0 Poly Haven 1024x1024 PBR maps from /assets/textures/vault/
 * Supported bases: 'castle_stone', 'flagstone', 'damaged_concrete', 'dark_wood', 'rusty_metal'
 */
export function loadVaultPBR(baseName, rx = 1, ry = 1) {
  if (!pbrBaseCache.has(baseName)) {
    const diff = textureLoader.load(`/assets/textures/vault/${baseName}_diff.jpg`);
    diff.colorSpace = THREE.SRGBColorSpace;
    const nor = textureLoader.load(`/assets/textures/vault/${baseName}_nor.jpg`);
    nor.colorSpace = THREE.NoColorSpace;
    const rough = textureLoader.load(`/assets/textures/vault/${baseName}_rough.jpg`);
    rough.colorSpace = THREE.NoColorSpace;
    pbrBaseCache.set(baseName, { diff, nor, rough });
  }
  const base = pbrBaseCache.get(baseName);
  return {
    map: cloneTiled(base.diff, rx, ry, THREE.SRGBColorSpace),
    normalMap: cloneTiled(base.nor, rx, ry, THREE.NoColorSpace),
    roughnessMap: cloneTiled(base.rough, rx, ry, THREE.NoColorSpace),
  };
}

/**
 * Veined pulsing necrotic biological core maps (map + emissiveMap + bumpMap).
 * Ensures only arterial capillaries glow, eliminating any flat cartoon pink ball look.
 */
export function createBioFleshTextures() {
  const S = 256;
  const colCanv = document.createElement('canvas');
  colCanv.width = colCanv.height = S;
  const cctx = colCanv.getContext('2d');

  const emCanv = document.createElement('canvas');
  emCanv.width = emCanv.height = S;
  const ectx = emCanv.getContext('2d');

  const bmpCanv = document.createElement('canvas');
  bmpCanv.width = bmpCanv.height = S;
  const bctx = bmpCanv.getContext('2d');

  // Deep dark organic flesh gradient + cellular dimples
  cctx.fillStyle = '#290509';
  cctx.fillRect(0, 0, S, S);
  ectx.fillStyle = '#120103';
  ectx.fillRect(0, 0, S, S);
  bctx.fillStyle = '#5a5a5a';
  bctx.fillRect(0, 0, S, S);

  let seed = 4817;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 320; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 4 + rnd() * 18;
    const g = cctx.createRadialGradient(x, y, 0, x, y, r);
    const v = rnd();
    g.addColorStop(0, v > 0.5 ? 'rgba(110, 12, 22, 0.48)' : 'rgba(28, 3, 7, 0.62)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cctx.fillStyle = g;
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fill();

    const bg = bctx.createRadialGradient(x, y, 0, x, y, r);
    bg.addColorStop(0, v > 0.5 ? 'rgba(185,185,185,0.35)' : 'rgba(35,35,35,0.4)');
    bg.addColorStop(1, 'rgba(90,90,90,0)');
    bctx.fillStyle = bg;
    bctx.beginPath();
    bctx.arc(x, y, r, 0, Math.PI * 2);
    bctx.fill();
  }

  // Branching arterial capillary trunks
  const drawBranch = (x, y, angle, len, width, depth) => {
    if (depth <= 0 || len < 5) return;
    const cx = x + Math.cos(angle + (rnd() - 0.5) * 0.6) * (len * 0.55);
    const cy = y + Math.sin(angle + (rnd() - 0.5) * 0.6) * (len * 0.55);
    const nx = x + Math.cos(angle) * len;
    const ny = y + Math.sin(angle) * len;

    cctx.strokeStyle = depth > 2 ? 'rgba(155, 18, 30, 0.85)' : 'rgba(198, 28, 42, 0.7)';
    cctx.lineWidth = width;
    cctx.lineCap = 'round';
    cctx.beginPath();
    cctx.moveTo(x, y);
    cctx.quadraticCurveTo(cx, cy, nx, ny);
    cctx.stroke();

    ectx.strokeStyle = depth > 2 ? 'rgba(255, 44, 58, 0.92)' : 'rgba(210, 26, 40, 0.68)';
    ectx.lineWidth = Math.max(0.9, width * 0.85);
    ectx.lineCap = 'round';
    ectx.beginPath();
    ectx.moveTo(x, y);
    ectx.quadraticCurveTo(cx, cy, nx, ny);
    ectx.stroke();

    bctx.strokeStyle = 'rgba(235, 235, 235, 0.72)';
    bctx.lineWidth = width * 1.15;
    bctx.lineCap = 'round';
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.quadraticCurveTo(cx, cy, nx, ny);
    bctx.stroke();

    drawBranch(nx, ny, angle + (rnd() - 0.5) * 0.9, len * 0.76, width * 0.72, depth - 1);
    if (rnd() > 0.3) {
      drawBranch(cx, cy, angle + (rnd() > 0.5 ? 0.65 : -0.65), len * 0.64, width * 0.62, depth - 1);
    }
  };

  for (let t = 0; t < 16; t++) {
    drawBranch(rnd() * S, rnd() * S, rnd() * Math.PI * 2, 34 + rnd() * 24, 3.6, 4);
  }

  const map = new THREE.CanvasTexture(colCanv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;

  const emissiveMap = new THREE.CanvasTexture(emCanv);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bmpCanv);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, emissiveMap, bumpMap };
}

/**
 * Hammered dark wrought-iron texture (for suspended cage, chains, railings, ossuary bars)
 */
export function createForgedIronTexture() {
  const S = 256;
  const col = document.createElement('canvas');
  col.width = col.height = S;
  const ctx = col.getContext('2d');

  const bmp = document.createElement('canvas');
  bmp.width = bmp.height = S;
  const bctx = bmp.getContext('2d');

  const rgh = document.createElement('canvas');
  rgh.width = rgh.height = S;
  const rctx = rgh.getContext('2d');

  ctx.fillStyle = '#1b191d';
  ctx.fillRect(0, 0, S, S);
  bctx.fillStyle = '#707070';
  bctx.fillRect(0, 0, S, S);
  rctx.fillStyle = '#9a9a9a';
  rctx.fillRect(0, 0, S, S);

  let seed = 913;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 500; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 1.2 + rnd() * 7.5;
    const dark = rnd() > 0.44;
    const rust = !dark && rnd() > 0.78;
    ctx.fillStyle = dark
      ? 'rgba(10, 9, 12, 0.48)'
      : rust
      ? 'rgba(72, 33, 21, 0.34)'
      : 'rgba(60, 58, 65, 0.28)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    bctx.fillStyle = dark ? 'rgba(28, 28, 28, 0.62)' : 'rgba(195, 195, 195, 0.42)';
    bctx.beginPath();
    bctx.arc(x, y, r, 0, Math.PI * 2);
    bctx.fill();

    rctx.fillStyle = rust ? 'rgba(235, 235, 235, 0.45)' : 'rgba(110, 110, 110, 0.32)';
    rctx.beginPath();
    rctx.arc(x, y, r, 0, Math.PI * 2);
    rctx.fill();
  }

  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 2;

  const bumpMap = new THREE.CanvasTexture(bmp);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = 2;

  const roughnessMap = new THREE.CanvasTexture(rgh);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = 2;

  return { map, bumpMap, roughnessMap };
}

/**
 * Dark Gothic Quarter-Sawn Oak Wood texture
 */
export function createCarvedOakTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#3b2517';
  ctx.fillRect(0, 0, S, S);

  let seed = 319;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let y = 0; y < S; y += 2) {
    const shade = 34 + Math.floor(rnd() * 24);
    ctx.fillStyle = `rgba(${shade + 26}, ${shade + 8}, ${shade - 8}, 0.52)`;
    ctx.fillRect(0, y, S, 1.5);
  }
  ctx.fillStyle = 'rgba(14, 8, 5, 0.72)';
  for (let x = 0; x < S; x += 64) {
    ctx.fillRect(x, 0, 2, S);
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

/**
 * Cracked Reinforced Containment Glass with internal crimson handprint & fingernail tally marks.
 */
export function createCrackedGlassTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');

  // Clear central viewing window with subtle smoky soot rim so the suspended entity reads sharply
  ctx.clearRect(0, 0, S, S);
  const rim = ctx.createRadialGradient(S * 0.5, S * 0.5, S * 0.24, S * 0.5, S * 0.5, S * 0.72);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, 'rgba(32, 18, 12, 0.48)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, S, S);

  // Internal dried-blood palm smudge + 5 sliding finger streaks
  ctx.save();
  ctx.globalAlpha = 0.62;
  const palm = ctx.createRadialGradient(210, 295, 6, 210, 295, 42);
  palm.addColorStop(0, 'rgba(128, 14, 22, 0.85)');
  palm.addColorStop(1, 'rgba(72, 6, 12, 0)');
  ctx.fillStyle = palm;
  ctx.beginPath();
  ctx.ellipse(210, 295, 24, 34, -0.18, 0, Math.PI * 2);
  ctx.fill();

  const fingers = [
    [186, 260, 181, 210],
    [198, 250, 195, 194],
    [211, 248, 209, 188],
    [224, 254, 224, 204],
    [238, 286, 252, 262],
  ];
  ctx.strokeStyle = 'rgba(124, 14, 20, 0.78)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1] of fingers) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();

  // Internal frantic tally scratches near bottom right
  ctx.strokeStyle = 'rgba(235, 242, 246, 0.55)';
  ctx.lineWidth = 1.6;
  for (let g = 0; g < 4; g++) {
    const bx = 335 + g * 34;
    for (let s = 0; s < 4; s++) {
      ctx.beginPath();
      ctx.moveTo(bx + s * 5, 388);
      ctx.lineTo(bx + s * 5 + 2, 412);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(bx - 4, 405);
    ctx.lineTo(bx + 20, 392);
    ctx.stroke();
  }

  // Two spiderweb impact shatter centers
  let seed = 2049;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const drawImpact = (cx, cy, maxR, spokes) => {
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 + (rnd() - 0.5) * 0.25;
      const r = maxR * (0.45 + rnd() * 0.55);
      ctx.strokeStyle = 'rgba(232, 244, 252, 0.85)';
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let px = cx + Math.cos(a) * (r * 0.45) + (rnd() - 0.5) * 14;
      let py = cy + Math.sin(a) * (r * 0.45) + (rnd() - 0.5) * 14;
      ctx.lineTo(px, py);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    for (let ring = 1; ring <= 4; ring++) {
      ctx.strokeStyle = `rgba(218, 232, 240, ${0.65 - ring * 0.1})`;
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rr = ring * (maxR * 0.19) + (rnd() - 0.5) * 5;
        const rx = cx + Math.cos(a) * rr;
        const ry = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.stroke();
    }
  };
  drawImpact(212, 275, 190, 18);
  drawImpact(342, 165, 115, 12);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Leaded Gothic Lancet Stained-Glass Clerestory Texture
 */
export function createGothicLancetTexture() {
  const W = 256;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5a1e24');
  g.addColorStop(0.55, '#7a4424');
  g.addColorStop(1, '#26141a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Diagonal leaded quarrels
  ctx.strokeStyle = '#0e0b0c';
  ctx.lineWidth = 3;
  for (let d = -H; d < W + H; d += 36) {
    ctx.beginPath();
    ctx.moveTo(d, 0);
    ctx.lineTo(d + H * 0.65, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(d, H);
    ctx.lineTo(d + H * 0.65, 0);
    ctx.stroke();
  }

  // Heavy horizontal saddle bars
  ctx.fillStyle = '#0a0809';
  for (let y = 96; y < H; y += 96) {
    ctx.fillRect(0, y - 3, W, 6);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Soft additive flame ember glow sprite (replaces chunky PSX fire triangles)
 */
export function createCandleFlameTexture() {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 34, 2, 32, 32, 28);
  g.addColorStop(0, 'rgba(255, 245, 205, 1)');
  g.addColorStop(0.28, 'rgba(255, 176, 74, 0.85)');
  g.addColorStop(0.65, 'rgba(204, 72, 28, 0.3)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Recessed dark glass CRT phosphor readout for Central Altar & Scriptorium Terminal
 */
export function createCrtPhosphorTexture(variant = 'console') {
  const W = 256;
  const H = 192;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#070a09';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = variant === 'manual' ? 'rgba(214, 170, 99, 0.35)' : 'rgba(196, 56, 62, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, W - 16, H - 16);

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = variant === 'manual' ? '#d8b26e' : '#e05358';
  ctx.fillText(variant === 'manual' ? 'DIFF ENGINE // R2-08' : 'ANOINTING BUS // R2-10', 18, 30);

  ctx.fillStyle = variant === 'manual' ? '#8ca878' : '#d69952';
  ctx.font = '10px monospace';
  const rows =
    variant === 'manual'
      ? ['REV 1.1  ->  VERIFIED', 'REV 2.0  ->  CHECKSUM ERR', 'OFFSET 0x4C: ALTERED', 'READY FOR AUDIT_']
      : ['CAGE INTEGRITY: CRITICAL', 'PULSE CYCLE   : 1.40s', 'SEAL R2-08    : PENDING', 'SEAL R2-09    : PENDING'];
  rows.forEach((line, idx) => {
    ctx.fillText(line, 18, 60 + idx * 24);
  });

  // Subtle scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Mechanical Split-Flap Containment Clock Board (R2 display in 6B Nave)
 */
export function createSplitFlapBoard() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  let currentText = '';
  let currentRestored = false;

  const draw = (text = '--:--', restored = false) => {
    if (text === currentText && restored === currentRestored) return;
    currentText = text;
    currentRestored = restored;

    ctx.fillStyle = '#0f0c0d';
    ctx.fillRect(0, 0, 512, 192);

    ctx.strokeStyle = restored ? '#c79b44' : '#733135';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 176);

    ctx.fillStyle = restored ? '#e4b862' : '#c8a97e';
    ctx.font = '600 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      restored ? 'SUBSTATION DELTA // SEAL SECURED' : 'SUBSTATION DELTA // ANOINTING COUNTDOWN',
      256,
      38
    );

    const chars = String(text || '--:--').slice(0, 8).padStart(5, ' ').split('');
    const tileW = 72;
    const gap = 12;
    const totalW = chars.length * tileW + (chars.length - 1) * gap;
    let x = (512 - totalW) / 2;

    for (const ch of chars) {
      ctx.fillStyle = '#181416';
      ctx.fillRect(x, 56, tileW, 102);
      ctx.strokeStyle = '#3c2e2b';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 56, tileW, 102);

      ctx.fillStyle = restored ? '#fbe19a' : '#f2dfbc';
      ctx.font = 'bold 62px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, x + tileW / 2, 109);

      // Mechanical split-flap horizontal hinge bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(x, 105, tileW, 4);
      x += tileW + gap;
    }

    tex.needsUpdate = true;
  };

  draw('--:--', false);
  return {
    texture: tex,
    setText: draw,
  };
}

/**
 * Dried crimson ritual stain & faded ash-chalk containment ring decal (for Nave floor)
 */
export function createRitualFloorDecalTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');

  // Subtle dark grime wash in center
  const base = ctx.createRadialGradient(256, 256, 30, 256, 256, 240);
  base.addColorStop(0, 'rgba(12, 4, 5, 0.52)');
  base.addColorStop(0.72, 'rgba(18, 6, 8, 0.25)');
  base.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);

  // Faded chalk & salt outer containment rings
  ctx.strokeStyle = 'rgba(205, 192, 168, 0.26)';
  ctx.lineWidth = 3.2;
  ctx.setLineDash([12, 7]);
  ctx.beginPath();
  ctx.arc(256, 256, 218, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(168, 152, 126, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 256, 194, 0, Math.PI * 2);
  ctx.stroke();

  // Radial ritual spokes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * 145, 256 + Math.sin(a) * 145);
    ctx.lineTo(256 + Math.cos(a) * 218, 256 + Math.sin(a) * 218);
    ctx.stroke();
  }

  // Dried arterial blood smear patches around altar
  let seed = 8831;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 24; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = 95 + rnd() * 115;
    const bx = 256 + Math.cos(ang) * rad;
    const by = 256 + Math.sin(ang) * rad;
    const br = 8 + rnd() * 26;
    const bg = ctx.createRadialGradient(bx, by, 1, bx, by, br);
    bg.addColorStop(0, 'rgba(104, 10, 16, 0.72)');
    bg.addColorStop(0.6, 'rgba(66, 6, 10, 0.36)');
    bg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Engraved oxidized bronze gothic plaque (for arch pillars & switchgear housing)
 */
export function createBrassPlaqueTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = 128;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#2b2013';
  ctx.fillRect(0, 0, S, 128);
  ctx.strokeStyle = '#735630';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, S - 12, 116);

  ctx.fillStyle = '#bfa065';
  ctx.font = 'bold 13px serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUBSTATION DELTA // SECTOR VI', 128, 42);
  ctx.fillStyle = '#9c7d48';
  ctx.font = '11px monospace';
  ctx.fillText('ANOINTING CONTAINMENT SANCTUM', 128, 68);
  ctx.fillStyle = '#a83438';
  ctx.fillText('AUTHORIZED CLERGY & OPERATORS ONLY', 128, 94);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Vintage 1981 Switchgear Pressure & Voltage Manometer Dial
 */
export function createManometerDialTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#141210';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d4c8ae';
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fill();

  // Red critical arc
  ctx.strokeStyle = '#a31c24';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(64, 64, 42, -0.45, 0.72);
  ctx.stroke();

  ctx.strokeStyle = '#221c16';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI * 1.15 + (i / 10) * Math.PI * 1.45;
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(a) * 35, 64 + Math.sin(a) * 35);
    ctx.lineTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46);
    ctx.stroke();
  }
  ctx.strokeStyle = '#7a1216';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, 64);
  ctx.lineTo(100, 50);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Weathered crimson velvet & wool fabric weave (banners, cathedral floor runners, tomes).
 */
export function createWovenFabricTextures() {
  const S = 512;
  const col = document.createElement('canvas');
  col.width = col.height = S;
  const ctx = col.getContext('2d');

  const bmp = document.createElement('canvas');
  bmp.width = bmp.height = S;
  const bctx = bmp.getContext('2d');

  ctx.fillStyle = '#3c1015';
  ctx.fillRect(0, 0, S, S);
  bctx.fillStyle = '#7a7a7a';
  bctx.fillRect(0, 0, S, S);

  let seed = 617;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let y = 0; y < S; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(18, 4, 6, 0.35)' : 'rgba(92, 24, 30, 0.24)';
    ctx.fillRect(0, y, S, 1.6);
    bctx.fillStyle = y % 6 === 0 ? 'rgba(40, 40, 40, 0.55)' : 'rgba(195, 195, 195, 0.4)';
    bctx.fillRect(0, y, S, 1.6);
  }
  for (let x = 0; x < S; x += 4) {
    ctx.fillStyle = 'rgba(14, 3, 5, 0.24)';
    ctx.fillRect(x, 0, 1.5, S);
    bctx.fillStyle = 'rgba(55, 55, 55, 0.4)';
    bctx.fillRect(x, 0, 1.5, S);
  }
  for (let i = 0; i < 420; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 4 + rnd() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rnd() > 0.4 ? 'rgba(16, 8, 9, 0.38)' : 'rgba(78, 36, 32, 0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bmp);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = 8;

  return { map, bumpMap };
}

/**
 * Stained porous bone, dried parchment & aged brass micro-grit textures.
 */
export function createAgedBoneTextures() {
  const S = 512;
  const col = document.createElement('canvas');
  col.width = col.height = S;
  const ctx = col.getContext('2d');

  const bmp = document.createElement('canvas');
  bmp.width = bmp.height = S;
  const bctx = bmp.getContext('2d');

  ctx.fillStyle = '#bfb194';
  ctx.fillRect(0, 0, S, S);
  bctx.fillStyle = '#888888';
  bctx.fillRect(0, 0, S, S);

  let seed = 883;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 1800; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 0.9 + rnd() * 4.5;
    const dark = rnd() > 0.35;
    ctx.fillStyle = dark ? 'rgba(65, 52, 36, 0.25)' : 'rgba(218, 206, 180, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    bctx.fillStyle = dark ? 'rgba(35, 35, 35, 0.5)' : 'rgba(210, 210, 210, 0.3)';
    bctx.beginPath();
    bctx.arc(x, y, r, 0, Math.PI * 2);
    bctx.fill();
  }

  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bmp);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = 8;

  return { map, bumpMap };
}

/**
 * Dried crimson blood pool, drag-marks, and smoky brown grime splatter decals.
 */
export function createBloodGrimeTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);

  let seed = 1337;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Outer soot / dried-rust grime wash
  const soot = ctx.createRadialGradient(128, 128, 12, 128, 128, 118);
  soot.addColorStop(0, 'rgba(38, 16, 10, 0.72)');
  soot.addColorStop(0.55, 'rgba(48, 18, 12, 0.42)');
  soot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = soot;
  ctx.fillRect(0, 0, S, S);

  // Dark arterial core blotches
  for (let i = 0; i < 22; i++) {
    const x = 68 + rnd() * 120;
    const y = 68 + rnd() * 120;
    const r = 8 + rnd() * 30;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(78, 8, 11, 0.88)');
    g.addColorStop(0.7, 'rgba(42, 6, 8, 0.56)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dragged finger / smear streaks
  ctx.lineCap = 'round';
  for (let s = 0; s < 5; s++) {
    const x0 = 96 + rnd() * 44;
    const y0 = 100 + s * 10;
    ctx.strokeStyle = 'rgba(84, 10, 14, 0.62)';
    ctx.lineWidth = 3 + rnd() * 4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + 48 + rnd() * 48, y0 + (rnd() - 0.5) * 18);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}



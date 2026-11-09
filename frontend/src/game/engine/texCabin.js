// Procedural Texture Library for Room 1: RE4 Village Cabin (r100 / r102 / r103)
// 100% canvas procedural generation - authentic gritty survival horror aesthetics.
import * as THREE from 'three';
import { cv, fbm, vnoise, rng } from './tex.js';

export const tex = (c, { repeat = [1, 1], srgb = true } = {}) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
};

// 1. Weathered rough-hewn oak floorboards with blood stains and dirt
export function cabinFloorPlanks() {
  const W = 512, H = 512, N = 8;
  const c = cv(W, H);
  const g = c.getContext('2d');
  const im = g.createImageData(W, H);
  const d = im.data;

  for (let y = 0; y < H; y++) {
    const v = y / H;
    const pi = Math.floor(v * N);
    const pv = v * N - pi;
    const off = (Math.sin(pi * 17.3) * 0.5 + 0.5);
    const tone = 0.5 + 0.5 * (Math.sin(pi * 31.7) * 0.5 + 0.5);

    for (let x = 0; x < W; x++) {
      const u = x / W;
      const ju = (u + off) % 1;
      const gr = fbm(u * 14, v * 2, 4, 32, 3, pi + 5);
      const ring = 0.5 + 0.5 * Math.sin((v * N * 9 + gr * 4) * Math.PI * 2);
      const t = Math.max(0, Math.min(1, 0.2 + 0.55 * gr + 0.25 * ring)) * tone;

      // Plank gaps
      const gapY = Math.min(Math.max((pv - 0.04) / 0.05, 0), 1) * Math.min(Math.max((0.96 - pv) / 0.05, 0), 1);
      const gapX = Math.min(Math.max((ju - 0.015) / 0.02, 0), 1) * Math.min(Math.max((0.985 - ju) / 0.02, 0), 1);
      const dirt = 0.55 + 0.45 * fbm(u * 4, v * 4, 3, 3, 3, 11);
      const k = gapY * gapX * dirt;

      // Base weathered dark timber colors: deep umber, charcoal dirt, raw pine
      let r = (24 + (78 - 24) * t) * k;
      let grn = (18 + (58 - 18) * t) * k;
      let b = (13 + (40 - 13) * t) * k;

      // Dark blood / fluid splatter trail
      const bloodNoise = fbm(u * 7, v * 7, 3, 3, 2, 88);
      const bloodDist = Math.hypot(u - 0.45, v - 0.6);
      if (bloodDist < 0.28 && bloodNoise > 0.48) {
        const intensity = (1 - bloodDist / 0.28) * (bloodNoise - 0.48) * 4.0;
        r = r * (1 - intensity * 0.5) + 38 * intensity;
        grn = grn * (1 - intensity * 0.8) + 6 * intensity;
        b = b * (1 - intensity * 0.8) + 4 * intensity;
      }

      const idx = (y * W + x) * 4;
      d[idx]     = Math.max(5, Math.min(255, r | 0));
      d[idx + 1] = Math.max(4, Math.min(255, grn | 0));
      d[idx + 2] = Math.max(3, Math.min(255, b | 0));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);

  // Square iron nails along plank seams
  g.fillStyle = '#0a0908';
  for (let n = 0; n < N; n++) {
    const yp = ((n + 0.5) / N) * H;
    for (let x = 20; x < W; x += 64) {
      g.fillRect(x - 2, yp - 2, 4, 4);
    }
  }

  return c;
}

// 2. Decrepit horizontal timber log wall with mortar chinking
export function cabinLogWall() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;
  const courses = 6;

  for (let y = 0; y < S; y++) {
    const v = y / S;
    const logIdx = Math.floor(v * courses);
    const logFrac = v * courses - logIdx;

    for (let x = 0; x < S; x++) {
      const u = x / S;
      const grain = fbm(u * 20, v * 2, 4, 16, 3, logIdx * 7);
      const bark = fbm(u * 6, v * 6, 3, 4, 3, 29);

      // Chinking gap between logs
      let isChink = false;
      if (logFrac < 0.12 || logFrac > 0.88) {
        isChink = true;
      }

      let r, grn, b;
      if (isChink) {
        // Sandy dry plaster / mud mortar
        const mortar = 0.6 + 0.4 * fbm(u * 8, v * 8, 3, 3, 2, 41);
        r = 62 * mortar;
        grn = 55 * mortar;
        b = 45 * mortar;
      } else {
        // Dark aged pine / cedar log
        const curvedShade = Math.sin(logFrac * Math.PI); // 3D cylindrical roundness
        const tone = (0.35 + 0.45 * grain + 0.2 * bark) * (0.4 + 0.6 * curvedShade);
        r = 38 + 55 * tone;
        grn = 28 + 42 * tone;
        b = 20 + 30 * tone;

        // Mold & damp patches
        const mold = fbm(u * 5, v * 5, 2, 2, 2, 73);
        if (mold > 0.65) {
          grn += 8;
          r -= 6;
          b -= 4;
        }
      }

      const idx = (y * S + x) * 4;
      d[idx]     = Math.max(8, Math.min(255, r | 0));
      d[idx + 1] = Math.max(6, Math.min(255, grn | 0));
      d[idx + 2] = Math.max(5, Math.min(255, b | 0));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// 3. Peeling plaster / damaged stucco wall with exposed timber lath
export function cabinPlasterWall() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const plasNoise = fbm(u * 5, v * 5, 3, 4, 3, 14);
      const stain = fbm(u * 2, v * 3, 2, 2, 2, 92);

      // Dirty off-white peeling plaster
      let r = 75 + 30 * plasNoise - 20 * stain;
      let grn = 70 + 26 * plasNoise - 22 * stain;
      let b = 60 + 22 * plasNoise - 25 * stain;

      // Dark exposed water leak stains
      if (stain > 0.68) {
        r *= 0.55;
        grn *= 0.52;
        b *= 0.45;
      }

      const idx = (y * S + x) * 4;
      d[idx]     = Math.max(10, Math.min(255, r | 0));
      d[idx + 1] = Math.max(9, Math.min(255, grn | 0));
      d[idx + 2] = Math.max(8, Math.min(255, b | 0));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);

  // Cracks in plaster
  g.strokeStyle = 'rgba(12, 10, 8, 0.6)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    let cx = Math.random() * S, cy = Math.random() * S;
    g.moveTo(cx, cy);
    for (let s = 0; s < 6; s++) {
      cx += (Math.random() - 0.5) * 60;
      cy += (Math.random() - 0.5) * 60;
      g.lineTo(cx, cy);
    }
    g.stroke();
  }
  return c;
}

// 4. Dark smoked timber ceiling with heavy soot and rafters
export function cabinCeiling() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const grain = fbm(u * 16, v * 3, 4, 16, 2, 19);
      const soot = fbm(u * 3, v * 3, 3, 3, 2, 47);

      // Charcoal dark charred pine
      let r = 24 + 18 * grain - 12 * soot;
      let grn = 19 + 14 * grain - 10 * soot;
      let b = 15 + 10 * grain - 8 * soot;

      const idx = (y * S + x) * 4;
      d[idx]     = Math.max(6, Math.min(255, r | 0));
      d[idx + 1] = Math.max(5, Math.min(255, grn | 0));
      d[idx + 2] = Math.max(4, Math.min(255, b | 0));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// 5. Classic RE4 Wooden Supply Crate with yellow hazard bands and stenciled crest
export function re4CrateTexture() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  // Base raw rough pine wood
  g.fillStyle = '#6e5436';
  g.fillRect(0, 0, S, S);

  // Planks
  const slats = 5;
  for (let i = 0; i < slats; i++) {
    const y0 = (i / slats) * S;
    const h = S / slats;
    g.fillStyle = i % 2 === 0 ? '#7a5d3c' : '#654c30';
    g.fillRect(0, y0, S, h);
    // Dark grain
    g.fillStyle = 'rgba(25, 18, 12, 0.25)';
    for (let l = 0; l < 4; l++) {
      g.fillRect(0, y0 + Math.random() * h, S, 2);
    }
    // Slat seams
    g.fillStyle = '#18120c';
    g.fillRect(0, y0, S, 4);
  }

  // Sturdy wooden perimeter frame
  g.fillStyle = '#553e26';
  g.fillRect(0, 0, S, 24);
  g.fillRect(0, S - 24, S, 24);
  g.fillRect(0, 0, 24, S);
  g.fillRect(S - 24, 0, 24, S);

  // Classic RE4 Diagonal Yellow Caution Band
  g.save();
  g.fillStyle = '#d49b20';
  g.fillRect(30, S / 2 - 28, S - 60, 56);
  g.strokeStyle = '#18120a';
  g.lineWidth = 4;
  g.strokeRect(30, S / 2 - 28, S - 60, 56);

  // Black hazard stripes
  g.fillStyle = '#1c1812';
  for (let x = 36; x < S - 60; x += 40) {
    g.beginPath();
    g.moveTo(x, S / 2 + 28);
    g.lineTo(x + 20, S / 2 + 28);
    g.lineTo(x + 36, S / 2 - 28);
    g.lineTo(x + 16, S / 2 - 28);
    g.closePath();
    g.fill();
  }
  g.restore();

  // Spanish Los Iluminados Stenciled Symbol in Center
  g.save();
  g.strokeStyle = 'rgba(20, 15, 10, 0.85)';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(S / 2, S / 2, 54, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(S / 2 - 40, S / 2);
  g.lineTo(S / 2 + 40, S / 2);
  g.moveTo(S / 2, S / 2 - 40);
  g.lineTo(S / 2, S / 2 + 40);
  g.stroke();
  g.restore();

  // Corner steel brackets with rivets
  const drawBracket = (x, y) => {
    g.fillStyle = '#22201d';
    g.fillRect(x, y, 48, 48);
    g.fillStyle = '#8a8274';
    g.beginPath();
    g.arc(x + 16, y + 16, 4, 0, Math.PI * 2);
    g.arc(x + 32, y + 32, 4, 0, Math.PI * 2);
    g.fill();
  };
  drawBracket(0, 0);
  drawBracket(S - 48, 0);
  drawBracket(0, S - 48);
  drawBracket(S - 48, S - 48);

  return c;
}

// 6. Rusted pitted cast-iron for woodstove, chains, and cellar ironwork
export function rustedCastIron() {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const n = fbm(u * 12, v * 12, 4, 4, 3, 17);
      const rust = fbm(u * 4, v * 4, 3, 3, 2, 61);

      let r = 24 + 18 * n;
      let grn = 22 + 16 * n;
      let b = 20 + 14 * n;

      if (rust > 0.58) {
        // Red-orange rust patches
        r += 32;
        grn += 12;
        b -= 6;
      }

      const idx = (y * S + x) * 4;
      d[idx]     = Math.max(10, Math.min(255, r | 0));
      d[idx + 1] = Math.max(8, Math.min(255, grn | 0));
      d[idx + 2] = Math.max(6, Math.min(255, b | 0));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// 7. Glowing woodstove hot coals and burning embers
export function glowingEmbers() {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const flameNoise = fbm(u * 8, v * 8, 4, 4, 3, 99);
      const crack = Math.pow(flameNoise, 2.5);

      // Deep charred black coal vs incandescent orange/yellow hot fissures
      let r = 20 + 235 * crack;
      let grn = 8 + 120 * crack;
      let b = 4 + 20 * crack;

      const idx = (y * S + x) * 4;
      d[idx]     = Math.max(10, Math.min(255, r | 0));
      d[idx + 1] = Math.max(5, Math.min(255, grn | 0));
      d[idx + 2] = Math.max(2, Math.min(255, b | 0));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// 8. Authentic RE4 9mm Handgun Ammunition Box Label
export function ammoBoxTexture() {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');

  // Red and Yellow RE4 Box styling
  g.fillStyle = '#b32420';
  g.fillRect(0, 0, S, S);

  // Yellow diagonal bands
  g.fillStyle = '#e8b923';
  g.fillRect(0, S * 0.45, S, S * 0.35);

  g.fillStyle = '#1a1816';
  g.font = 'bold 24px monospace';
  g.textAlign = 'center';
  g.fillText('HANDGUN AMMO', S / 2, S * 0.58);

  g.font = 'bold 16px sans-serif';
  g.fillStyle = '#f5efe0';
  g.fillText('9mm Parabellum', S / 2, S * 0.32);
  g.fillText('50 CARTRIDGES', S / 2, S * 0.72);

  // Border wear
  g.strokeStyle = '#0a0806';
  g.lineWidth = 4;
  g.strokeRect(4, 4, S - 8, S - 8);

  return c;
}

// 9. RE4 Typewriter Keyboard & Save Mechanism face
export function typewriterFace() {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');

  // Black crackle enamel finish
  g.fillStyle = '#141416';
  g.fillRect(0, 0, S, S);

  // Gold pinstripes
  g.strokeStyle = '#c49e46';
  g.lineWidth = 2;
  g.strokeRect(10, 10, S - 20, S - 20);

  // Circular vintage keys with silver rings
  const rows = 4;
  const cols = 9;
  for (let r = 0; r < rows; r++) {
    for (let cl = 0; cl < cols; cl++) {
      const kx = 30 + cl * 22 + (r % 2) * 10;
      const ky = 70 + r * 38;

      g.fillStyle = '#1c1c1f';
      g.beginPath();
      g.arc(kx, ky, 8, 0, Math.PI * 2);
      g.fill();

      g.strokeStyle = '#c8c0b4';
      g.lineWidth = 1.5;
      g.stroke();

      g.fillStyle = '#f0e8d0';
      g.font = 'bold 7px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String.fromCharCode(65 + (r * 9 + cl) % 26), kx, ky);
    }
  }

  // Typewriter brand banner
  g.fillStyle = '#c49e46';
  g.font = 'bold 12px serif';
  g.textAlign = 'center';
  g.fillText('• CORONA AUTOMATIC •', S / 2, 40);

  return c;
}

// 10. Heavy Cellar Trapdoor with reinforced iron straps and claw scratch marks
export function cellarTrapdoorTexture() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  // Dark weathered thick oak planks
  g.fillStyle = '#3a2b1c';
  g.fillRect(0, 0, S, S);

  for (let i = 0; i < 6; i++) {
    const x0 = (i / 6) * S;
    const w = S / 6;
    g.fillStyle = i % 2 === 0 ? '#423220' : '#352518';
    g.fillRect(x0, 0, w, S);
    g.fillStyle = '#100c08';
    g.fillRect(x0, 0, 4, S);
  }

  // Heavy cross-straps of forged black iron
  g.fillStyle = '#1a1816';
  g.fillRect(0, 60, S, 40);
  g.fillRect(0, S - 100, S, 40);

  // Rivets / Bolts
  g.fillStyle = '#7a7065';
  for (let x = 30; x < S; x += 60) {
    g.beginPath();
    g.arc(x, 80, 6, 0, Math.PI * 2);
    g.arc(x, S - 80, 6, 0, Math.PI * 2);
    g.fill();
  }

  // Deep desperate fingernail / claw scratch marks
  g.strokeStyle = '#120505';
  g.lineWidth = 3;
  for (let s = 0; s < 5; s++) {
    g.beginPath();
    let sx = 180 + s * 14, sy = 160;
    g.moveTo(sx, sy);
    for (let k = 0; k < 6; k++) {
      sx += (Math.random() - 0.4) * 8;
      sy += 25 + Math.random() * 15;
      g.lineTo(sx, sy);
    }
    g.stroke();
  }

  return c;
}

// 11. Handwritten Village Memo / Police Report (RE4 File)
export function villageMemoTexture() {
  const W = 512, H = 512;
  const c = cv(W, H);
  const g = c.getContext('2d');

  // Aged yellowed parchment with burnt edges
  g.fillStyle = '#c7b68a';
  g.fillRect(0, 0, W, H);

  // Paper stains
  g.fillStyle = 'rgba(90, 65, 35, 0.2)';
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.arc(Math.random() * W, Math.random() * H, 40 + Math.random() * 80, 0, Math.PI * 2);
    g.fill();
  }

  // Document header
  g.fillStyle = '#2a1a0e';
  g.font = 'bold 20px serif';
  g.fillText('OFFICER\'S REPORT — VILLAGE APPROACH', 36, 52);

  g.strokeStyle = '#4a321a';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(36, 64);
  g.lineTo(W - 36, 64);
  g.stroke();

  // Handwritten cursive lines
  g.font = 'italic 15px serif';
  const lines = [
    'Oct 24 - We crossed into the mountainous province.',
    'The local inhabitants refuse to speak Spanish. Their eyes',
    'have taken on a violent, clouded pallor.',
    '',
    'Officer Mario walked into the abandoned cabin ahead to ask',
    'for directions. He never returned.',
    '',
    'I found the master bedroom bolted from inside. Faint scratching',
    'echoes beneath the floorboards near the iron cellar hatch.',
    '',
    'If you are reading this: DO NOT TRUST ANYONE.',
    'Take the ammunition from the sideboard and get out.'
  ];

  lines.forEach((line, idx) => {
    g.fillText(line, 40, 100 + idx * 26);
  });

  // Spanish police stamp
  g.save();
  g.translate(W - 130, H - 120);
  g.rotate(-0.25);
  g.strokeStyle = '#8a2020';
  g.lineWidth = 3;
  g.strokeRect(0, 0, 110, 50);
  g.fillStyle = '#8a2020';
  g.font = 'bold 12px sans-serif';
  g.fillText('CONFIDENTIAL', 8, 22);
  g.fillText('POLICÍA LOCAL', 10, 40);
  g.restore();

  return c;
}

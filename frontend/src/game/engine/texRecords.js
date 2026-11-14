// Procedural texture library for Room 4: The Rotting Archive
// 100% canvas procedural generation - zero external assets.
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

// 1. Decayed concrete wall with peeling institutional paint & black water drips
export function archiveWall() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const n = fbm(u, v, 8, 8, 4, 12);
      const rough = fbm(u, v, 24, 24, 3, 5);
      
      // Vertical water seep stains running down
      const seep = Math.pow(fbm(u * 6, v * 1.5, 3, 2, 2, 88), 3.0);
      
      let baseR = 28;
      let baseG = 34;
      let baseB = 32;

      // Mold and water decay darkening
      const mold = fbm(u, v, 16, 16, 3, 42);
      const k = 0.55 + 0.45 * n + 0.15 * rough;

      let r = baseR * k - seep * 16 - (mold > 0.6 ? 12 : 0);
      let gr = baseG * k - seep * 14 - (mold > 0.6 ? 8 : 0);
      let b = baseB * k - seep * 20 - (mold > 0.6 ? 14 : 0);

      const idx = (y * S + x) * 4;
      d[idx] = Math.max(8, Math.min(255, r));
      d[idx + 1] = Math.max(10, Math.min(255, gr));
      d[idx + 2] = Math.max(8, Math.min(255, b));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);

  // Paint peeling cracks
  g.strokeStyle = 'rgba(180, 200, 190, 0.12)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    let px = (i / 6) * S + (Math.random() - 0.5) * 40;
    let py = 0;
    g.moveTo(px, py);
    while (py < S) {
      px += (Math.random() - 0.5) * 8;
      py += Math.random() * 20 + 8;
      g.lineTo(px, py);
    }
    g.stroke();
  }

  return c;
}

// 2. Flooded concrete floor with puddle reflections & water slick bump
export function floodedFloor() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const tileX = Math.floor(u * 4);
      const tileY = Math.floor(v * 4);
      const isGrout = (u * 4 - tileX < 0.03) || (v * 4 - tileY < 0.03);

      const n = fbm(u, v, 6, 6, 3, 21);
      // Dark stagnant water pooling
      const puddle = fbm(u * 3, v * 3, 2, 2, 2, 9);
      const isWater = puddle > 0.45;

      let r = isWater ? 10 + n * 8 : 22 + n * 18;
      let gr = isWater ? 14 + n * 10 : 26 + n * 20;
      let b = isWater ? 18 + n * 14 : 28 + n * 24;

      if (isGrout) {
        r *= 0.4;
        gr *= 0.4;
        b *= 0.4;
      }

      const idx = (y * S + x) * 4;
      d[idx] = r;
      d[idx + 1] = gr;
      d[idx + 2] = b;
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// 3. Rusted olive-drab steel for filing cabinets and desks
export function rustedSteel(baseColor = [48, 54, 46], rustColor = [85, 42, 20]) {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const n = fbm(u, v, 8, 8, 4, 33);
      // Rust patches
      const rustN = fbm(u * 2, v * 2, 4, 4, 3, 71);
      const isRust = rustN > 0.58;
      const rustAmt = Math.max(0, Math.min(1, (rustN - 0.55) * 4));

      let r = baseColor[0] * (0.6 + 0.4 * n);
      let gr = baseColor[1] * (0.6 + 0.4 * n);
      let b = baseColor[2] * (0.6 + 0.4 * n);

      r = r * (1 - rustAmt) + rustColor[0] * rustAmt;
      gr = gr * (1 - rustAmt) + rustColor[1] * rustAmt;
      b = b * (1 - rustAmt) + rustColor[2] * rustAmt;

      const idx = (y * S + x) * 4;
      d[idx] = Math.min(255, r);
      d[idx + 1] = Math.min(255, gr);
      d[idx + 2] = Math.min(255, b);
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);

  // Scratch marks
  g.strokeStyle = 'rgba(180, 180, 180, 0.25)';
  g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    const sx = Math.random() * S;
    const sy = Math.random() * S;
    g.moveTo(sx, sy);
    g.lineTo(sx + (Math.random() - 0.5) * 60, sy + (Math.random() - 0.5) * 30);
    g.stroke();
  }

  return c;
}

// 4. Damp weathered card-catalog oak
export function dampOak() {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const woodGrain = fbm(u, v * 0.2, 4, 32, 3, 8);
      const darkWater = Math.pow(v, 2.0) * 0.4; // Water damaged at bottom
      const k = 0.45 + 0.55 * woodGrain - darkWater;

      const idx = (y * S + x) * 4;
      d[idx] = Math.max(10, 68 * k);
      d[idx + 1] = Math.max(8, 42 * k);
      d[idx + 2] = Math.max(6, 26 * k);
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// 5. Massive Submarine Bulkhead Door Texture
export function bulkheadTexture() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  // Heavy oxidized industrial primer
  g.fillStyle = '#262a2d';
  g.fillRect(0, 0, S, S);

  // Warning chevron border
  const barH = 28;
  g.fillStyle = '#b38600';
  g.fillRect(0, 0, S, barH);
  g.fillRect(0, S - barH, S, barH);

  // Black diagonal hazard stripes
  g.fillStyle = '#111315';
  for (let x = -S; x < S * 2; x += 40) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 20, 0);
    g.lineTo(x - barH + 20, barH);
    g.lineTo(x - barH, barH);
    g.fill();

    g.beginPath();
    g.moveTo(x, S - barH);
    g.lineTo(x + 20, S - barH);
    g.lineTo(x - barH + 20, S);
    g.lineTo(x - barH, S);
    g.fill();
  }

  // Steel bolt rim
  g.fillStyle = '#42494e';
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const bx = S / 2 + Math.cos(ang) * 190;
    const by = S / 2 + Math.sin(ang) * 190;
    g.beginPath();
    g.arc(bx, by, 7, 0, Math.PI * 2);
    g.fill();
  }

  // Central round observation port / hub
  g.strokeStyle = '#141719';
  g.lineWidth = 14;
  g.beginPath();
  g.arc(S / 2, S / 2, 130, 0, Math.PI * 2);
  g.stroke();

  // Stenciled warning text
  g.fillStyle = '#a8b0b6';
  g.font = 'bold 24px monospace';
  g.textAlign = 'center';
  g.fillText('BULKHEAD 04-A', S / 2, S / 2 - 40);
  g.font = '16px monospace';
  g.fillText('SUB-DELTA ARCHIVE', S / 2, S / 2 - 14);
  g.fillStyle = '#d94432';
  g.font = 'bold 18px monospace';
  g.fillText('SEALED UNDER PROTOCOL CYGNUS', S / 2, S / 2 + 25);
  g.fillText('KEYPAD ACCESS REQUIRED', S / 2, S / 2 + 48);

  return c;
}

// 6. Paranormal Spectral Silhouette Entity Texture (Billboard)
export function followerEntitySprite() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  const grad = g.createRadialGradient(S / 2, S * 0.45, 20, S / 2, S * 0.5, S * 0.45);
  grad.addColorStop(0, 'rgba(8, 6, 12, 0.98)');
  grad.addColorStop(0.5, 'rgba(12, 10, 18, 0.85)');
  grad.addColorStop(0.85, 'rgba(16, 12, 24, 0.4)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  g.fillStyle = grad;

  // Tall distorted human silhouette
  g.beginPath();
  // Head
  g.ellipse(S / 2, S * 0.22, 42, 60, 0, 0, Math.PI * 2);
  // Torso & long hanging shroud
  g.moveTo(S / 2 - 65, S * 0.35);
  g.bezierCurveTo(S / 2 - 90, S * 0.55, S / 2 - 110, S * 0.8, S / 2 - 80, S * 0.98);
  g.lineTo(S / 2 + 80, S * 0.98);
  g.bezierCurveTo(S / 2 + 110, S * 0.8, S / 2 + 90, S * 0.55, S / 2 + 65, S * 0.35);
  g.closePath();
  g.fill();

  // Elongated distorted arms reaching out
  g.strokeStyle = 'rgba(8, 6, 12, 0.9)';
  g.lineWidth = 14;
  g.beginPath();
  g.moveTo(S / 2 - 55, S * 0.36);
  g.quadraticCurveTo(S / 2 - 120, S * 0.6, S / 2 - 130, S * 0.88);
  g.stroke();

  g.beginPath();
  g.moveTo(S / 2 + 55, S * 0.36);
  g.quadraticCurveTo(S / 2 + 120, S * 0.6, S / 2 + 130, S * 0.88);
  g.stroke();

  // Glowing faint pinprick eyes
  g.fillStyle = '#ff2020';
  g.shadowColor = '#ff0000';
  g.shadowBlur = 12;
  g.beginPath();
  g.arc(S / 2 - 16, S * 0.21, 3.5, 0, Math.PI * 2);
  g.arc(S / 2 + 16, S * 0.21, 3.5, 0, Math.PI * 2);
  g.fill();

  return c;
}

// 7. Bloody Handprint & Seepage Wall Decal
export function bloodyDecal(seed = 1) {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');

  g.fillStyle = 'rgba(90, 12, 12, 0.75)';
  // Palm
  g.beginPath();
  g.ellipse(S / 2, S / 2 + 15, 34, 40, 0, 0, Math.PI * 2);
  g.fill();

  // Fingers dragging downward
  const fingers = [-24, -10, 5, 20, 32];
  fingers.forEach((fx, i) => {
    g.beginPath();
    g.moveTo(S / 2 + fx, S / 2);
    g.lineTo(S / 2 + fx * 1.1, S / 2 - 40 - (i === 2 ? 18 : 0));
    g.lineWidth = 11;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(90, 12, 12, 0.75)';
    g.stroke();

    // Drips dripping down from palm
    g.beginPath();
    g.moveTo(S / 2 + fx * 0.8, S / 2 + 45);
    g.lineTo(S / 2 + fx * 0.8, S / 2 + 80 + Math.random() * 40);
    g.lineWidth = 3.5;
    g.stroke();
  });

  return c;
}

// 8. Manila Incident Folder CF-79A2 Cover
export function manilaFolderCover() {
  const W = 360;
  const H = 480;
  const c = cv(W, H);
  const g = c.getContext('2d');

  // Weathered manila paper
  g.fillStyle = '#c7b38c';
  g.fillRect(0, 0, W, H);

  // Tab on top right
  g.fillStyle = '#ba9f72';
  g.beginPath();
  g.moveTo(W - 140, 0);
  g.lineTo(W, 0);
  g.lineTo(W, 40);
  g.lineTo(W - 140, 40);
  g.closePath();
  g.fill();

  g.fillStyle = '#2b2316';
  g.font = 'bold 16px monospace';
  g.fillText('CF-79A2', W - 110, 26);

  // Red stamped TOP SECRET
  g.save();
  g.translate(W / 2, H * 0.35);
  g.rotate(-0.18);
  g.strokeStyle = '#b8281a';
  g.lineWidth = 4;
  g.strokeRect(-120, -25, 240, 50);
  g.fillStyle = '#b8281a';
  g.font = 'bold 30px monospace';
  g.textAlign = 'center';
  g.fillText('CONFIDENTIAL', 0, 8);
  g.restore();

  // Document title text
  g.fillStyle = '#1c1712';
  g.font = 'bold 18px monospace';
  g.textAlign = 'center';
  g.fillText('INCIDENT INVESTIGATION REPORT', W / 2, H * 0.62);
  g.font = '14px monospace';
  g.fillText('SUBSTATION DELTA - 1983', W / 2, H * 0.68);
  g.fillText('STATUS: TWO DISCORDANT COPIES', W / 2, H * 0.74);

  return c;
}

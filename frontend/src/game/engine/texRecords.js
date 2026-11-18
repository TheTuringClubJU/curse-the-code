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

  // Paint peeling cracks and salt efflorescence
  g.strokeStyle = 'rgba(180, 200, 190, 0.08)';
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

// 9. Industrial Bunker Chamber Stencil Placard
export function chamberSign(code, title, subtitle = 'SUBSTATION DELTA') {
  const W = 512;
  const H = 160;
  const c = cv(W, H);
  const g = c.getContext('2d');

  // Heavy stamped steel background
  g.fillStyle = '#1e2326';
  g.fillRect(0, 0, W, H);

  // Weathered rust texture
  for (let i = 0; i < 80; i++) {
    const rx = Math.random() * W;
    const ry = Math.random() * H;
    const rw = Math.random() * 40 + 10;
    const rh = Math.random() * 15 + 4;
    g.fillStyle = `rgba(${70 + Math.random() * 40}, ${35 + Math.random() * 20}, ${20}, 0.25)`;
    g.fillRect(rx, ry, rw, rh);
  }

  // Steel bevel border with corner screws
  g.strokeStyle = '#3a444a';
  g.lineWidth = 6;
  g.strokeRect(6, 6, W - 12, H - 12);
  g.strokeStyle = '#0e1113';
  g.lineWidth = 2;
  g.strokeRect(10, 10, W - 20, H - 20);

  // Corner mounting bolts
  [[20, 20], [W - 20, 20], [20, H - 20], [W - 20, H - 20]].forEach(([bx, by]) => {
    g.fillStyle = '#606b72';
    g.beginPath();
    g.arc(bx, by, 6, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#1a1f22';
    g.lineWidth = 2;
    g.stroke();
  });

  // Stenciled text
  g.fillStyle = '#ffaa33';
  g.font = 'bold 22px monospace';
  g.fillText(code, 40, 48);

  g.fillStyle = '#e2ecf0';
  g.font = 'bold 32px monospace';
  g.fillText(title, 40, 94);

  g.fillStyle = '#6b828d';
  g.font = 'bold 16px monospace';
  g.fillText(subtitle, 40, 130);

  return c;
}

// 10. Waterlogged Confidential Document Decal
export function scatteredDocument(type = 0) {
  const W = 256;
  const H = 320;
  const c = cv(W, H);
  const g = c.getContext('2d');

  // Water-stained yellowed paper
  g.fillStyle = '#dcd2be';
  g.fillRect(0, 0, W, H);

  // Water damage tide-marks at bottom
  const grad = g.createLinearGradient(0, H - 100, 0, H);
  grad.addColorStop(0, 'rgba(120, 90, 50, 0)');
  grad.addColorStop(1, 'rgba(80, 55, 30, 0.65)');
  g.fillStyle = grad;
  g.fillRect(0, H - 100, W, 100);

  // Faux typed document lines
  g.fillStyle = '#26211c';
  for (let y = 35; y < H - 40; y += 14) {
    const isRedacted = (y * 7) % 5 === 0;
    if (isRedacted) {
      g.fillStyle = '#110e0c';
      g.fillRect(24, y - 8, Math.min(W - 48, 80 + ((y * 13) % 120)), 10);
      g.fillStyle = '#26211c';
    } else {
      g.fillRect(24, y - 4, W - 48 - ((y * 23) % 60), 3);
    }
  }

  // Red stamp
  g.save();
  g.translate(W * 0.65, 55);
  g.rotate(0.25);
  g.strokeStyle = type === 0 ? '#b82015' : '#1e488f';
  g.lineWidth = 2.5;
  g.strokeRect(-55, -15, 110, 30);
  g.fillStyle = type === 0 ? '#b82015' : '#1e488f';
  g.font = 'bold 15px monospace';
  g.textAlign = 'center';
  g.fillText(type === 0 ? 'RESTRICTED' : 'ARCHIVED', 0, 5);
  g.restore();

  return c;
}

// 11. Phosphor Green Microfilm CRT Display Texture
export function microfilmDisplayTexture() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  // Dark curved CRT face
  g.fillStyle = '#06180c';
  g.fillRect(0, 0, S, S);

  // Scanline grid
  g.fillStyle = 'rgba(0, 0, 0, 0.4)';
  for (let y = 0; y < S; y += 4) {
    g.fillRect(0, y, S, 2);
  }

  // CRT Phosphor glow gradient
  const rad = g.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S * 0.6);
  rad.addColorStop(0, 'rgba(40, 255, 120, 0.35)');
  rad.addColorStop(1, 'rgba(10, 40, 20, 0.9)');
  g.fillStyle = rad;
  g.fillRect(0, 0, S, S);

  // Terminal header
  g.fillStyle = '#45ff8a';
  g.font = 'bold 22px monospace';
  g.fillText('SUBSTATION DELTA // ARCHIVAL REPLAY', 30, 48);
  g.font = '16px monospace';
  g.fillText('REEL 04 • FRAME 1983-09-14 • MAGNIFICATION 18X', 30, 78);

  // ECG / EEG Waveform trace
  g.strokeStyle = '#55ff99';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(30, S * 0.45);
  for (let x = 30; x < S - 30; x += 6) {
    const u = (x - 30) / (S - 60);
    const spike = Math.sin(u * 18) * 12 + (u > 0.45 && u < 0.55 ? (Math.random() - 0.5) * 80 : (Math.random() - 0.5) * 14);
    g.lineTo(x, S * 0.45 + spike);
  }
  g.stroke();

  // Status notes
  g.fillStyle = '#a0ffc8';
  g.font = '18px monospace';
  g.fillText('SUBJECT DISCORDANCE INDEX: 88.4%', 30, S * 0.68);
  g.fillText('CORVIN NEURAL ECHO ACTIVE', 30, S * 0.76);
  g.fillStyle = '#ff6060';
  g.fillText('CRITICAL DIVERGENCE DETECTED', 30, S * 0.84);

  return c;
}

// 12. Vintage Dark Bookshelf Texture (Clerk's Office)
export function bookshelfTexture() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  // Dark oak backing
  g.fillStyle = '#1c1510';
  g.fillRect(0, 0, S, S);

  // 4 Shelves
  const shelfH = S / 4;
  for (let s = 0; s < 4; s++) {
    const sy = s * shelfH;
    // Wood shelf plank
    g.fillStyle = '#2d221a';
    g.fillRect(0, sy + shelfH - 14, S, 14);
    g.fillStyle = '#0f0a06';
    g.fillRect(0, sy + shelfH - 4, S, 4);

    // Books on this shelf
    let bx = 16;
    while (bx < S - 30) {
      const bw = Math.floor(Math.random() * 16) + 12;
      const bh = Math.floor(Math.random() * 32) + (shelfH - 35);
      const by = sy + shelfH - 14 - bh;
      
      const colors = ['#40241b', '#203028', '#1a2233', '#3d1d28', '#2b2318', '#382e22', '#521d1d'];
      g.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      g.fillRect(bx, by, bw, bh);

      // Gold embossed spine ribs
      g.fillStyle = '#9e8042';
      g.fillRect(bx + 2, by + bh * 0.2, bw - 4, 2);
      g.fillRect(bx + 2, by + bh * 0.8, bw - 4, 2);

      bx += bw + 3;
    }
  }

  return c;
}

// 13. Cardboard Archive Boxes Texture (Records Annex & Storage)
export function archiveBoxesTexture() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  g.fillStyle = '#7a6042';
  g.fillRect(0, 0, S, S);

  // Box grid (2 x 3 boxes)
  const bw = S / 2;
  const bh = S / 3;

  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 2; col++) {
      const x = col * bw;
      const y = r * bh;

      // Box shade
      g.fillStyle = (r + col) % 2 === 0 ? '#6d5438' : '#7e6446';
      g.fillRect(x + 4, y + 4, bw - 8, bh - 8);

      // Box lid line
      g.fillStyle = '#4a3822';
      g.fillRect(x + 4, y + 22, bw - 8, 4);

      // White archival label
      g.fillStyle = '#e8ded0';
      g.fillRect(x + 24, y + bh * 0.45, bw - 48, 32);

      // Label print
      g.fillStyle = '#201810';
      g.font = 'bold 14px monospace';
      g.fillText(`VOL. 197${r * 2 + col}`, x + 32, y + bh * 0.45 + 18);
      g.font = '10px monospace';
      g.fillText('SUB-DELTA CASE', x + 32, y + bh * 0.45 + 28);
    }
  }

  return c;
}

// 12. Fine hanging spiderwebs & dust filaments on transparent background (Reference 8)
export function cobwebTexture() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);

  const ox = S * 0.08;
  const oy = S * 0.08;

  // Radial structural lines
  const spokes = 16;
  g.lineWidth = 1.0;
  g.strokeStyle = 'rgba(215, 225, 235, 0.5)';

  const pts = [];
  for (let i = 0; i <= spokes; i++) {
    const angle = (i / spokes) * (Math.PI * 0.52);
    const len = S * (0.85 + 0.1 * Math.sin(i * 1.8));
    const tx = ox + Math.cos(angle) * len;
    const ty = oy + Math.sin(angle) * len;
    pts.push({ angle, len, tx, ty });

    g.beginPath();
    g.moveTo(ox, oy);
    const mx = (ox + tx) * 0.5 + Math.sin(i) * 6;
    const my = (oy + ty) * 0.5 + Math.cos(i) * 6;
    g.quadraticCurveTo(mx, my, tx, ty);
    g.stroke();
  }

  // Concentric connecting spiral web threads with catenary drooping curves
  const rings = 14;
  for (let r = 1; r <= rings; r++) {
    const frac = r / rings;
    g.strokeStyle = `rgba(205, 220, 230, ${0.18 + 0.22 * (1 - frac * 0.5)})`;
    g.lineWidth = 0.75;
    g.beginPath();

    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const x1 = ox + Math.cos(p1.angle) * p1.len * frac;
      const y1 = oy + Math.sin(p1.angle) * p1.len * frac;

      if (i === 0) {
        g.moveTo(x1, y1);
      } else {
        const p0 = pts[i - 1];
        const x0 = ox + Math.cos(p0.angle) * p0.len * frac;
        const y0 = oy + Math.sin(p0.angle) * p0.len * frac;
        const cpx = (x0 + x1) * 0.5;
        const cpy = (y0 + y1) * 0.5 + frac * 14;
        g.quadraticCurveTo(cpx, cpy, x1, y1);
      }
    }
    g.stroke();
  }

  // Soft dust motes adhering to filaments
  g.fillStyle = 'rgba(235, 240, 245, 0.6)';
  for (let d = 0; d < 50; d++) {
    const angle = Math.random() * Math.PI * 0.5;
    const dist = Math.random() * S * 0.8;
    const mx = ox + Math.cos(angle) * dist;
    const my = oy + Math.sin(angle) * dist;
    const r = 0.6 + Math.random() * 1.2;
    g.beginPath();
    g.arc(mx, my, r, 0, Math.PI * 2);
    g.fill();
  }

  return c;
}

// 13. European 17th-Century Weathered Masonry Brick Wall (Reference 10)
// Features irregular course heights, crumbling dark mortar grooves, soot stains, water runnels, and moss
export function damagedBrickWall() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  // Deep decayed dark background (mortar bed)
  g.fillStyle = '#100e0c';
  g.fillRect(0, 0, S, S);

  const numRows = 12;
  const rowHeight = S / numRows;

  // Render individual weathered stone blocks
  for (let r = 0; r < numRows; r++) {
    const y = r * rowHeight;
    const rowOffset = (r % 2 === 0) ? 0 : 38;
    const numCols = 6;
    const colWidth = S / (numCols - 1);

    for (let col = -1; col <= numCols; col++) {
      const x = col * colWidth + rowOffset + Math.sin(r * 3 + col) * 4;
      const bw = colWidth - 8 + Math.cos(r + col * 2) * 4;
      const bh = rowHeight - 6;

      // Color variation across European weathered brick tones
      const toneSeed = Math.abs(Math.sin(r * 17.3 + col * 31.7));
      let baseHex = '#272420';
      if (toneSeed < 0.25) baseHex = '#352c23';      // Burnt umber
      else if (toneSeed < 0.5) baseHex = '#1e1c18';   // Deep soot
      else if (toneSeed < 0.75) baseHex = '#3f3226';  // Iron oxide clay
      else baseHex = '#20261f';                       // Damp mossy stone

      g.fillStyle = baseHex;
      g.fillRect(x + 2, y + 2, bw, bh);

      // Top/Left highlight and Bottom/Right chipped shadow for 3D block relief
      g.fillStyle = 'rgba(255, 235, 205, 0.08)';
      g.fillRect(x + 2, y + 2, bw, 2.5);
      g.fillRect(x + 2, y + 2, 2.5, bh);

      g.fillStyle = 'rgba(0, 0, 0, 0.45)';
      g.fillRect(x + 2, y + bh - 1, bw, 3);
      g.fillRect(x + bw - 1, y + 2, 3, bh);

      // Chipped stone surface pitting
      for (let p = 0; p < 8; p++) {
        const px = x + 4 + Math.random() * (bw - 8);
        const py = y + 4 + Math.random() * (bh - 8);
        g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.3)' : 'rgba(180,160,130,0.06)';
        g.fillRect(px, py, 2 + Math.random() * 3, 1.5 + Math.random() * 2);
      }
    }
  }

  // Dark water seep runnels and algae stains cascading from ceiling leaks
  g.fillStyle = 'rgba(12, 10, 8, 0.65)';
  for (let s = 0; s < 9; s++) {
    const sx = (s / 9) * S + Math.sin(s * 5) * 20;
    const sw = 14 + Math.sin(s * 3) * 8;
    g.beginPath();
    g.moveTo(sx, 0);
    g.lineTo(sx + sw, 0);
    g.quadraticCurveTo(sx + sw * 1.4, S * 0.5, sx + sw * 0.6, S);
    g.lineTo(sx - 4, S);
    g.quadraticCurveTo(sx - 6, S * 0.5, sx, 0);
    g.fill();
  }

  // Fine organic crack networks
  g.strokeStyle = 'rgba(6, 5, 4, 0.85)';
  g.lineWidth = 1.5;
  for (let k = 0; k < 5; k++) {
    g.beginPath();
    let cx = (k / 5) * S + 30;
    let cy = Math.random() * 60;
    g.moveTo(cx, cy);
    while (cy < S) {
      cx += (Math.random() - 0.5) * 16;
      cy += Math.random() * 32 + 10;
      g.lineTo(cx, cy);
    }
    g.stroke();
  }

  return c;
}

// 14. 3D Bump Map for 17th-Century Weathered Masonry Brick Wall (Reference 10)
// High-contrast depth map: Mortar is deep pitch black (#00), stone faces are raised (#c0 to #f0)
export function damagedBrickBump() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  g.fillStyle = '#050505'; // Recessed mortar
  g.fillRect(0, 0, S, S);

  const numRows = 12;
  const rowHeight = S / numRows;

  for (let r = 0; r < numRows; r++) {
    const y = r * rowHeight;
    const rowOffset = (r % 2 === 0) ? 0 : 38;
    const numCols = 6;
    const colWidth = S / (numCols - 1);

    for (let col = -1; col <= numCols; col++) {
      const x = col * colWidth + rowOffset + Math.sin(r * 3 + col) * 4;
      const bw = colWidth - 8 + Math.cos(r + col * 2) * 4;
      const bh = rowHeight - 6;

      const grad = g.createLinearGradient(x, y, x, y + bh);
      grad.addColorStop(0, '#f0f0f0');
      grad.addColorStop(0.1, '#d8d8d8');
      grad.addColorStop(0.85, '#b0b0b0');
      grad.addColorStop(1, '#505050');

      g.fillStyle = grad;
      g.fillRect(x + 2, y + 2, bw, bh);

      // Pitting noise for tactile stone feel
      for (let p = 0; p < 12; p++) {
        const px = x + 3 + Math.random() * (bw - 6);
        const py = y + 3 + Math.random() * (bh - 6);
        g.fillStyle = '#303030';
        g.fillRect(px, py, 1.5, 1.5);
      }
    }
  }

  return c;
}

// 15. Damaged Historic Flagstone Floor with Water Puddles & Blood Stains (Reference 10 & 11)
export function waterDamagedStoneFloor() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  // Dark damp stone foundation
  g.fillStyle = '#141210';
  g.fillRect(0, 0, S, S);

  // Large rectangular flagstone grid
  const cols = 5;
  const rows = 5;
  const cw = S / cols;
  const rh = S / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw;
      const y = r * rh;
      const seed = Math.sin(col * 9.1 + r * 13.7);

      let hex = '#22201d';
      if (seed > 0.4) hex = '#2e2820';
      else if (seed < -0.3) hex = '#181b16';
      else hex = '#1c1b18';

      g.fillStyle = hex;
      g.fillRect(x + 3, y + 3, cw - 6, rh - 6);

      // Slab bevels
      g.fillStyle = 'rgba(255, 230, 200, 0.06)';
      g.fillRect(x + 3, y + 3, cw - 6, 2);
      g.fillRect(x + 3, y + 3, 2, rh - 6);

      g.fillStyle = 'rgba(0, 0, 0, 0.5)';
      g.fillRect(x + 3, y + rh - 4, cw - 6, 2);
      g.fillRect(x + cw - 4, y + 3, 2, rh - 6);
    }
  }

  // Dark stagnant black water pools reflecting light
  g.fillStyle = 'rgba(6, 12, 14, 0.7)';
  g.beginPath();
  g.ellipse(S * 0.35, S * 0.4, S * 0.28, S * 0.18, 0.3, 0, Math.PI * 2);
  g.ellipse(S * 0.75, S * 0.72, S * 0.2, S * 0.15, -0.2, 0, Math.PI * 2);
  g.fill();

  // Dark dried blood stains and drag marks (Reference 11)
  g.fillStyle = 'rgba(85, 10, 10, 0.7)';
  g.beginPath();
  g.ellipse(S * 0.55, S * 0.3, 22, 14, 0.4, 0, Math.PI * 2);
  g.ellipse(S * 0.58, S * 0.35, 14, 8, -0.2, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = 'rgba(70, 8, 8, 0.6)';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(S * 0.55, S * 0.3);
  g.quadraticCurveTo(S * 0.62, S * 0.45, S * 0.68, S * 0.58);
  g.stroke();

  return c;
}

// 16. Floor Bump Map with Deep Grout Channels
export function waterDamagedStoneFloorBump() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');

  g.fillStyle = '#080808'; // Deep grout
  g.fillRect(0, 0, S, S);

  const cols = 5;
  const rows = 5;
  const cw = S / cols;
  const rh = S / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw;
      const y = r * rh;
      const grad = g.createRadialGradient(x + cw * 0.5, y + rh * 0.5, 5, x + cw * 0.5, y + rh * 0.5, cw * 0.6);
      grad.addColorStop(0, '#d8d8d8');
      grad.addColorStop(0.8, '#b8b8b8');
      grad.addColorStop(1, '#606060');
      g.fillStyle = grad;
      g.fillRect(x + 3, y + 3, cw - 6, rh - 6);
    }
  }

  return c;
}

// 17. Security Chain-Link Wire Mesh with Alpha Cutout (Reference 11)
export function chainLinkFenceTexture() {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);

  // Dark industrial woven wire with metallic shine
  g.strokeStyle = 'rgba(150, 160, 165, 0.85)';
  g.lineWidth = 3.0;

  const step = 32;
  for (let x = -S; x <= S * 2; x += step) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + S, S);
    g.stroke();

    g.beginPath();
    g.moveTo(x + S, 0);
    g.lineTo(x, S);
    g.stroke();
  }

  // Interlocking wire crimp knots
  g.fillStyle = 'rgba(210, 220, 225, 0.9)';
  for (let y = 0; y <= S; y += step / 2) {
    for (let x = 0; x <= S; x += step / 2) {
      if ((x + y) % step === 0) {
        g.beginPath();
        g.arc(x, y, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  return c;
}

// 18. Illuminated Amber Radar/Tactical Grid Map (Reference 8)
export function bunkerGridMapTexture() {
  const W = 512;
  const H = 384;
  const c = cv(W, H);
  const g = c.getContext('2d');

  // Backlit orange/amber luminescent background
  const bgGrad = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.6);
  bgGrad.addColorStop(0, '#5a2d04');
  bgGrad.addColorStop(0.65, '#2e1502');
  bgGrad.addColorStop(1, '#120801');
  g.fillStyle = bgGrad;
  g.fillRect(0, 0, W, H);

  // Precision tactical grid lines
  g.strokeStyle = 'rgba(255, 160, 30, 0.45)';
  g.lineWidth = 1.0;
  for (let x = 0; x <= W; x += 32) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, H);
    g.stroke();
  }
  for (let y = 0; y <= H; y += 32) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }

  // Major sector boundary coordinates
  g.strokeStyle = 'rgba(255, 190, 60, 0.85)';
  g.lineWidth = 2.0;
  g.strokeRect(32, 32, W - 64, H - 64);
  g.strokeRect(160, 96, 192, 160); // Sector 05 highlight

  // Danger radius & concentric telemetry circles
  g.strokeStyle = 'rgba(255, 120, 20, 0.7)';
  g.lineWidth = 1.8;
  g.beginPath();
  g.arc(256, 176, 55, 0, Math.PI * 2);
  g.arc(256, 176, 110, 0, Math.PI * 2);
  g.stroke();

  // Target crosshairs
  g.beginPath();
  g.moveTo(256, 40);
  g.lineTo(256, 312);
  g.moveTo(120, 176);
  g.lineTo(392, 176);
  g.stroke();

  // Stenciled coordinates & facility typography
  g.font = 'bold 12px monospace';
  g.fillStyle = '#ffb338';
  g.fillText('SUBSTATION DELTA • SECTOR 05 DEEP AQUIFER', 40, 24);
  g.fillText('GEO-RESONANCE: ANOMALOUS • 1983-QUARANTINE', 40, H - 14);
  g.fillText('CORE VAULT [LOCKDOWN]', 170, 115);
  g.fillText('DEPTH: -42.8M', 370, 52);

  return c;
}

// 19. CRT Television Static / Snow Noise (Reference 6)
export function crtStaticSnowTexture() {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let i = 0; i < S * S * 4; i += 4) {
    const val = Math.random() < 0.4 ? (Math.random() * 200 + 55) : (Math.random() * 40);
    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val * 1.1; // slight cold blue-white tinge
    d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);

  // Horizontal CRT scanline overlay
  g.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (let y = 0; y < S; y += 3) {
    g.fillRect(0, y, S, 1);
  }

  return c;
}

// 20. Vintage CB Radio / Transmitter Front Faceplate (Reference 7)
export function vintageTransceiverTexture() {
  const W = 512;
  const H = 256;
  const c = cv(W, H);
  const g = c.getContext('2d');

  // Heavy dark metal brushed faceplate
  g.fillStyle = '#222528';
  g.fillRect(0, 0, W, H);

  // Dual illuminated analog needle meters
  const drawMeter = (x, y, w, h, label) => {
    g.fillStyle = '#f0e6c8'; // warm parchment meter face
    g.fillRect(x, y, w, h);
    g.strokeStyle = '#111';
    g.lineWidth = 1.5;
    g.strokeRect(x, y, w, h);

    // Arc scale
    g.beginPath();
    g.arc(x + w / 2, y + h * 1.2, w * 0.7, Math.PI * 1.25, Math.PI * 1.75);
    g.stroke();

    // Red needle indicator
    g.strokeStyle = '#c41818';
    g.lineWidth = 2.0;
    g.beginPath();
    g.moveTo(x + w / 2, y + h * 1.2);
    g.lineTo(x + w * 0.7, y + h * 0.28);
    g.stroke();

    g.font = 'bold 9px monospace';
    g.fillStyle = '#111';
    g.fillText(label, x + 6, y + h - 6);
  };

  drawMeter(30, 30, 110, 65, 'SIGNAL / VU');
  drawMeter(160, 30, 110, 65, 'MODULATION');

  // Frequency tuner display window (orange backlit LED segments)
  g.fillStyle = '#080502';
  g.fillRect(300, 30, 175, 55);
  g.font = 'bold 22px monospace';
  g.fillStyle = '#ff7700';
  g.fillText('14.285 MHz', 315, 66);

  // Giant tuning dial knob
  const drawKnob = (kx, ky, kr, label) => {
    const kgrad = g.createRadialGradient(kx, ky, kr * 0.2, kx, ky, kr);
    kgrad.addColorStop(0, '#555');
    kgrad.addColorStop(0.8, '#282828');
    kgrad.addColorStop(1, '#111');
    g.fillStyle = kgrad;
    g.beginPath();
    g.arc(kx, ky, kr, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#0a0a0a';
    g.lineWidth = 2;
    g.stroke();

    // Notch
    g.strokeStyle = '#fff';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(kx, ky);
    g.lineTo(kx + kr * 0.7, ky - kr * 0.5);
    g.stroke();

    g.font = '9px monospace';
    g.fillStyle = '#888';
    g.fillText(label, kx - 14, ky + kr + 14);
  };

  drawKnob(380, 160, 38, 'TUNE');
  drawKnob(280, 160, 24, 'VOLUME');
  drawKnob(200, 160, 24, 'SQUELCH');
  drawKnob(120, 160, 24, 'MIC GAIN');

  // Toggle switches
  for (let s = 0; s < 4; s++) {
    const sx = 40 + s * 18;
    g.fillStyle = '#111';
    g.fillRect(sx, 140, 8, 20);
    g.fillStyle = '#bbb';
    g.fillRect(sx + 1, 142, 6, 9);
  }

  return c;
}

// 21. Ashen Ghostly Stalker Skin Texture (Reference 2)
// Mottled pale corpse flesh with sunken eyes, ribcage shadows, and spinal contours
export function stalkerSkinTexture() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const n = fbm(u, v, 6, 6, 4, 17);
      const vein = Math.sin(u * 40 + fbm(u, v, 4, 4, 2, 9) * 8);

      // Pale mottled ash-grey flesh
      let r = 185 + n * 45;
      let gr = 190 + n * 42;
      let b = 180 + n * 40;

      // Darkened bruised mottling
      if (vein > 0.85) {
        r -= 35;
        gr -= 30;
        b -= 20;
      }

      // Ribcage / spine shadow bands
      const rib = Math.sin(v * 26);
      if (rib > 0.5 && u > 0.25 && u < 0.75) {
        r -= 25 * rib;
        gr -= 25 * rib;
        b -= 25 * rib;
      }

      const idx = (y * S + x) * 4;
      d[idx] = Math.max(0, Math.min(255, r));
      d[idx + 1] = Math.max(0, Math.min(255, gr));
      d[idx + 2] = Math.max(0, Math.min(255, b));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);

  return c;
}

// 22. Dense Vintage Archive Bookshelf with Dust Accumulation (Reference 7 & 9)
export function bookshelfTextureWithDust() {
  const W = 512;
  const H = 512;
  const c = cv(W, H);
  const g = c.getContext('2d');

  // Dark weathered oak backing
  g.fillStyle = '#1c150e';
  g.fillRect(0, 0, W, H);

  const shelves = 4;
  const sh = H / shelves;

  const bookTones = [
    '#3e2718', '#541c14', '#1f3427', '#252a38', '#443522',
    '#2c241c', '#60281c', '#1e2025', '#483c2e', '#361e1b'
  ];

  for (let s = 0; s < shelves; s++) {
    const y = s * sh;
    const shelfFloor = y + sh - 12;

    // Books packed shoulder to shoulder
    let curX = 14;
    while (curX < W - 20) {
      const bw = 8 + Math.floor(Math.random() * 14);
      const bh = sh - 22 - Math.floor(Math.random() * 18);
      const by = shelfFloor - bh;

      const tone = bookTones[Math.floor(Math.random() * bookTones.length)];
      g.fillStyle = tone;
      g.fillRect(curX, by, bw, bh);

      // Book spine highlight & crease
      g.fillStyle = 'rgba(255, 255, 255, 0.08)';
      g.fillRect(curX, by, 2, bh);
      g.fillStyle = 'rgba(0, 0, 0, 0.35)';
      g.fillRect(curX + bw - 2, by, 2, bh);

      // Gold/Gilt foil embossed title bands
      if (Math.random() < 0.6) {
        g.fillStyle = 'rgba(215, 175, 80, 0.45)';
        g.fillRect(curX + 1, by + bh * 0.25, bw - 2, 2.5);
        g.fillRect(curX + 1, by + bh * 0.32, bw - 2, 1.5);
      }

      curX += bw + 1.5;
    }

    // Heavy dark wooden shelf ledge
    g.fillStyle = '#2a1e14';
    g.fillRect(0, shelfFloor, W, 12);
    g.fillStyle = 'rgba(0, 0, 0, 0.6)';
    g.fillRect(0, shelfFloor + 10, W, 2);

    // Pale grey dust motes accumulated along the front lip of the shelf
    g.fillStyle = 'rgba(190, 185, 175, 0.35)';
    g.fillRect(4, shelfFloor, W - 8, 2.5);
  }

  return c;
}



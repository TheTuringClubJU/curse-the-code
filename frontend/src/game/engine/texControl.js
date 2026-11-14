// Procedural texture library for Room 5: The Surveillance Morgue
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

// 1. Industrial diamond-plate steel floor
export function diamondPlateFloor() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      // Base metal noise
      const n = fbm(u * 12, v * 12, 4, 4, 3, 7);
      const corr = fbm(u * 3, v * 3, 2, 2, 2, 31);

      // Diamond pattern: rotated grid
      const du = (u * 8) % 1;
      const dv = (v * 8) % 1;
      const cx = Math.abs(du - 0.5);
      const cy = Math.abs(dv - 0.5);
      const diamond = Math.max(cx + cy - 0.3, 0); // raised diamond ridge
      const ridge = Math.pow(Math.max(0, 0.12 - diamond), 1.5) * 60;

      let r = 20 + n * 14 + ridge * 0.6;
      let gr = 24 + n * 16 + ridge * 0.65;
      let b = 22 + n * 14 + ridge * 0.6;

      // Rust/damp patches
      const rust = fbm(u * 5, v * 5, 3, 3, 2, 55);
      if (rust > 0.62) { r += 12; gr -= 2; b -= 4; }
      // Dark damp stains
      const damp = fbm(u * 2, v * 2, 2, 2, 2, 19);
      if (damp > 0.65) { r *= 0.75; gr *= 0.75; b *= 0.75; }

      const idx = (y * S + x) * 4;
      d[idx]     = Math.max(8, Math.min(255, r | 0));
      d[idx + 1] = Math.max(10, Math.min(255, gr | 0));
      d[idx + 2] = Math.max(8, Math.min(255, b | 0));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);

  // Peeled rubber strip remnants
  g.strokeStyle = 'rgba(10,8,6,0.5)';
  g.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const yp = (i * 0.28 + 0.05) * S;
    g.beginPath();
    g.moveTo(0, yp);
    for (let xi = 0; xi <= S; xi += 20) {
      g.lineTo(xi, yp + (Math.random() - 0.5) * 2);
    }
    g.stroke();
  }

  return c;
}

// 2. Raw concrete bunker wall
export function concreteWall() {
  const S = 512;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const n = fbm(u, v, 10, 10, 4, 13);
      const rough = fbm(u * 5, v * 5, 3, 3, 3, 27);
      const seep = Math.pow(fbm(u * 8, v * 1.2, 3, 2, 2, 71), 2.8);

      let r = 22 + n * 18 - seep * 14;
      let gr = 26 + n * 20 - seep * 12;
      let b  = 24 + n * 18 - seep * 16;

      // Mold patches
      const mold = fbm(u * 7, v * 7, 3, 3, 2, 41);
      if (mold > 0.63) { r -= 4; gr -= 2; b -= 4; }

      const idx = (y * S + x) * 4;
      d[idx]     = Math.max(6, Math.min(255, r | 0));
      d[idx + 1] = Math.max(8, Math.min(255, gr | 0));
      d[idx + 2] = Math.max(6, Math.min(255, b | 0));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);

  // Subtle formwork seams & vertical rebar shadows (clean bunker concrete — no arch graffiti or blood)
  g.strokeStyle = 'rgba(0,0,0,0.22)';
  g.lineWidth = 1.8;
  for (let i = 0; i < 8; i++) {
    const xp = (i / 8) * S + (Math.random() - 0.5) * 20;
    g.beginPath(); g.moveTo(xp, 0); g.lineTo(xp + (Math.random()-0.5)*6, S); g.stroke();
  }

  return c;
}

// 3. CRT phosphor screen with scanlines
export function phosphorScreen(isOn = true, hasStatic = false) {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');

  if (!isOn) {
    g.fillStyle = '#060808';
    g.fillRect(0, 0, S, S);
    // Dead screen crack
    g.strokeStyle = 'rgba(60,60,60,0.4)';
    g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(S*0.3, S*0.2); g.lineTo(S*0.6, S*0.5); g.lineTo(S*0.5, S*0.9); g.stroke();
    return c;
  }

  // Phosphor green base
  g.fillStyle = '#001200';
  g.fillRect(0, 0, S, S);

  if (hasStatic) {
    // CRT static noise
    const im = g.createImageData(S, S);
    const d = im.data;
    for (let i = 0; i < S * S; i++) {
      const v = Math.random() > 0.5 ? Math.random() * 40 : 0;
      d[i * 4] = 0; d[i * 4 + 1] = v | 0; d[i * 4 + 2] = 0; d[i * 4 + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  } else {
    // CCTV "footage" — faint ghostly grid pattern
    g.strokeStyle = 'rgba(26,61,31,0.6)';
    g.lineWidth = 0.5;
    for (let i = 0; i < 8; i++) {
      g.beginPath(); g.moveTo(0, (i/8)*S); g.lineTo(S, (i/8)*S); g.stroke();
      g.beginPath(); g.moveTo((i/8)*S, 0); g.lineTo((i/8)*S, S); g.stroke();
    }
    // Vague figure outline (barely perceptible)
    g.fillStyle = 'rgba(26,61,31,0.35)';
    g.beginPath();
    g.ellipse(S*0.5, S*0.3, S*0.08, S*0.1, 0, 0, Math.PI*2); // head
    g.fill();
    g.fillRect(S*0.44, S*0.4, S*0.12, S*0.3); // body
  }

  // Phosphor glow overlay
  const grad = g.createRadialGradient(S*0.5, S*0.5, 0, S*0.5, S*0.5, S*0.6);
  grad.addColorStop(0, 'rgba(77,255,120,0.04)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);

  // Scanlines
  for (let y = 0; y < S; y += 2) {
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, y, S, 1);
  }

  return c;
}

// 4. Rusted metal surface
export function rustMetal() {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x/S, v = y/S;
      const n = fbm(u*8, v*8, 4, 4, 3, 17);
      const rust = fbm(u*5, v*5, 3, 3, 2, 83);

      let r = 32 + n * 20;
      let gr = 20 + n * 10;
      let b  = 10 + n * 6;

      if (rust > 0.5) {
        const ramt = (rust - 0.5) * 2;
        r += ramt * 60;
        gr += ramt * 20;
        b  += ramt * 5;
      }

      const idx = (y * S + x) * 4;
      d[idx]     = Math.max(8, Math.min(255, r | 0));
      d[idx + 1] = Math.max(4, Math.min(255, gr | 0));
      d[idx + 2] = Math.max(2, Math.min(255, b | 0));
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// 5. Quarantine plastic sheeting (semi-transparent, yellowed)
export function quarantinePlastic() {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');

  // Translucent yellowish base
  g.fillStyle = 'rgba(220, 230, 190, 0.08)';
  g.fillRect(0, 0, S, S);

  // Creases / wrinkles
  g.strokeStyle = 'rgba(200, 215, 170, 0.15)';
  for (let i = 0; i < 12; i++) {
    g.lineWidth = Math.random() * 1.5 + 0.3;
    const x0 = Math.random() * S;
    g.beginPath();
    g.moveTo(x0, 0);
    let cx = x0;
    for (let yy = 0; yy <= S; yy += 20) {
      cx += (Math.random() - 0.5) * 10;
      g.lineTo(cx, yy);
    }
    g.stroke();
  }

  // Tape residue at top
  g.fillStyle = 'rgba(255, 240, 160, 0.12)';
  g.fillRect(0, 0, S, 12);

  return c;
}

// 6. Worn black rubber anti-slip mat strips
export function rubberMat() {
  const S = 128;
  const c = cv(S, S);
  const g = c.getContext('2d');

  g.fillStyle = '#080a08';
  g.fillRect(0, 0, S, S);

  // Raised anti-slip ridge pattern
  g.strokeStyle = 'rgba(30,35,28,0.8)';
  for (let i = 0; i < 10; i++) {
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, (i / 10) * S + 4);
    g.lineTo(S, (i / 10) * S + 4);
    g.stroke();
  }

  // Worn areas
  const im = g.getImageData(0, 0, S, S);
  const d = im.data;
  for (let i = 0; i < S * S; i++) {
    if (Math.random() > 0.97) {
      d[i*4] = 25; d[i*4+1] = 28; d[i*4+2] = 22; d[i*4+3] = 255;
    }
  }
  g.putImageData(im, 0, 0);

  return c;
}

// 7. Dark damp ceiling concrete
export function dampCeiling() {
  const S = 256;
  const c = cv(S, S);
  const g = c.getContext('2d');
  const im = g.createImageData(S, S);
  const d = im.data;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x/S, v = y/S;
      const n = fbm(u*6, v*6, 4, 4, 3, 99);
      const mold = fbm(u*4, v*4, 3, 3, 2, 37);

      let r = 10 + n * 10;
      let gr = 12 + n * 12;
      let b  = 10 + n * 10;

      if (mold > 0.6) { r -= 2; gr -= 1; b -= 2; }

      const idx = (y * S + x) * 4;
      d[idx]     = Math.max(4, r | 0);
      d[idx + 1] = Math.max(5, gr | 0);
      d[idx + 2] = Math.max(4, b | 0);
      d[idx + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// 8. Rack chassis / server equipment face
export function rackFace() {
  const S = 128;
  const c = cv(S, S);
  const g = c.getContext('2d');

  g.fillStyle = '#0a0d0a';
  g.fillRect(0, 0, S, S);

  // 1U slot lines
  for (let i = 0; i < 20; i++) {
    const y = (i / 20) * S;
    g.strokeStyle = 'rgba(40,50,40,0.6)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke();
  }

  // Vents on right side
  for (let i = 0; i < 8; i++) {
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(S*0.7, i * (S/8) + 2, S*0.25, (S/8) - 4);
  }

  return c;
}

// Specialized Procedural Horror Audio for Room 5: The Surveillance Morgue
// 100% Web Audio API synthesis — zero external audio files.
// Features: 18.98 Hz infrasound, 60Hz CRT transformer hum, static bursts,
// relay clicks, intercom crackle, spatial steel footsteps, whisper voices.

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class GameAudioControl {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.vol = 0.82;
    this.L = { x: 0, z: 0, yaw: 0 };
    this.staticTimer = null;
    this.humNodes = null;
    this.infraNodes = null;
    this.crtHumNodes = null;
    this.eventTimer = null;
    this.cfg = {};
  }

  ensureActive() {
    if (!this.ctx) { this.start(this.cfg); return; }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  start(cfg = {}) {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    this.cfg = cfg;
    const c = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    if (c.state === 'suspended') c.resume().catch(() => {});

    // ── Master chain: Gain → Compressor → Analyser → Destination ──────────
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.vol;

    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 10;
    this.comp.ratio.value = 5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.3;

    this.an = c.createAnalyser();
    this.an.fftSize = 256;
    this.master.connect(this.comp);
    this.comp.connect(this.an);
    this.an.connect(c.destination);

    // ── Concrete/steel reverb (shorter than records — metal bunker) ─────────
    const irLen = c.sampleRate * 2.0;
    const ir = c.createBuffer(2, irLen, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        const decay = Math.pow(1 - i / irLen, 3.0);
        d[i] = (Math.random() * 2 - 1) * decay * (1 + 0.2 * Math.sin(i * 0.015));
      }
    }
    this.verb = c.createConvolver();
    this.verb.buffer = ir;
    const vg = c.createGain();
    vg.gain.value = 0.35;
    this.verb.connect(vg);
    vg.connect(this.master);

    // ── Shared noise buffer ─────────────────────────────────────────────────
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;

    // ── Infrasound (18.98 Hz psychological drone) ───────────────────────────
    if (cfg.infrasound !== false) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 18.98;
      const ig = c.createGain();
      ig.gain.value = 0.055;
      osc.connect(ig);
      ig.connect(this.master);
      osc.start();
      this.infraNodes = { osc, gain: ig };
    }

    // ── 60Hz industrial mains hum ───────────────────────────────────────────
    if (cfg.hum !== false) {
      const h1 = c.createOscillator();
      h1.type = 'sawtooth'; h1.frequency.value = 60;
      const h2 = c.createOscillator();
      h2.type = 'sine'; h2.frequency.value = 120;
      const h3 = c.createOscillator();
      h3.type = 'sine'; h3.frequency.value = 180;
      const hg = c.createGain(); hg.gain.value = 0.015;
      const hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 300;
      h1.connect(hg); h2.connect(hg); h3.connect(hg);
      hg.connect(hf); hf.connect(this.master);
      h1.start(); h2.start(); h3.start();
      this.humNodes = { h1, h2, h3, gain: hg };
    }

    // ── CRT transformer hum (higher pitched — distinctive monitor whine) ─────
    if (cfg.crt !== false) {
      const crtOsc = c.createOscillator();
      crtOsc.type = 'sawtooth';
      crtOsc.frequency.value = 15750; // horizontal sync frequency
      const crtG = c.createGain(); crtG.gain.value = 0.006;
      const crtF = c.createBiquadFilter(); crtF.type = 'bandpass'; crtF.frequency.value = 15750; crtF.Q.value = 15;
      crtOsc.connect(crtG); crtG.connect(crtF); crtF.connect(this.master);
      crtOsc.start();
      // Softer CRT hash (broadband)
      const crtNs = c.createBufferSource(); crtNs.buffer = nb; crtNs.loop = true;
      const crtNf = c.createBiquadFilter(); crtNf.type = 'highpass'; crtNf.frequency.value = 8000;
      const crtNg = c.createGain(); crtNg.gain.value = 0.008;
      crtNs.connect(crtNf); crtNf.connect(crtNg); crtNg.connect(this.master);
      crtNs.start();
      this.crtHumNodes = { osc: crtOsc, gain: crtG, noise: crtNs, noiseGain: crtNg };
    }

    // ── Scheduled static burst events ───────────────────────────────────────
    if (cfg.staticBursts !== false) {
      const scheduleStatic = () => {
        const delay = rnd(12, 28) * 1000;
        this.staticTimer = setTimeout(() => {
          this.staticBurst(this.L.x, this.L.z);
          scheduleStatic();
        }, delay);
      };
      scheduleStatic();
    }
  }

  stop() {
    clearTimeout(this.staticTimer);
    clearTimeout(this.eventTimer);
    if (!this.ctx) return;
    try {
      this.humNodes?.h1?.stop(); this.humNodes?.h2?.stop(); this.humNodes?.h3?.stop();
      this.infraNodes?.osc?.stop();
      this.crtHumNodes?.osc?.stop(); this.crtHumNodes?.noise?.stop();
      this.ctx.close();
    } catch (e) {}
    this.ctx = null;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.linearRampToValueAtTime(m ? 0 : this.vol, this.ctx.currentTime + 0.1);
  }

  updateListener(x, z, yaw) {
    this.L = { x, z, yaw };
    if (!this.ctx) return;
    const l = this.ctx.listener;
    if (l.positionX) {
      l.positionX.value = x; l.positionY.value = 1.6; l.positionZ.value = z;
      l.forwardX.value = -Math.sin(yaw); l.forwardZ.value = -Math.cos(yaw);
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    }
  }

  _makePanner(x, z) {
    if (!this.ctx) return null;
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 1;
    p.maxDistance = 14;
    p.rolloffFactor = 1.5;
    p.positionX.value = x;
    p.positionY.value = 1.3;
    p.positionZ.value = z;
    return p;
  }

  // ── Steel plate footstep ─────────────────────────────────────────────────
  footstep(x, z) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const env = c.createGain();
    env.gain.setValueAtTime(0, c.currentTime);
    env.gain.linearRampToValueAtTime(0.9, c.currentTime + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.065);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 220; f.Q.value = 0.6;
    const f2 = c.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 80;
    // Metal ring
    const ring = c.createOscillator(); ring.type = 'sine'; ring.frequency.value = rnd(180, 280);
    const rg = c.createGain(); rg.gain.setValueAtTime(0.3, c.currentTime); rg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
    ring.connect(rg);
    const pan = this._makePanner(x, z);
    src.connect(f); f.connect(f2); f2.connect(env); env.connect(pan || this.verb);
    rg.connect(pan || this.verb);
    if (pan) pan.connect(this.master);
    this.verb.connect(this.master);
    src.start(c.currentTime); ring.start(c.currentTime);
    src.stop(c.currentTime + 0.08); ring.stop(c.currentTime + 0.08);
  }

  // ── CRT static burst ─────────────────────────────────────────────────────
  staticBurst(x = 0, z = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rnd(2000, 6000); f.Q.value = 0.3;
    const env = c.createGain();
    const dur = rnd(0.04, 0.22);
    env.gain.setValueAtTime(0, c.currentTime);
    env.gain.linearRampToValueAtTime(rnd(0.3, 0.7), c.currentTime + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    const pan = this._makePanner(x, z);
    src.connect(f); f.connect(env); env.connect(pan || this.master);
    if (pan) pan.connect(this.master);
    src.start(c.currentTime); src.stop(c.currentTime + dur + 0.05);
  }

  // ── Relay rack click ─────────────────────────────────────────────────────
  relayClick(x = 0, z = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const osc = c.createOscillator(); osc.type = 'square'; osc.frequency.value = rnd(400, 900);
    const env = c.createGain();
    env.gain.setValueAtTime(0, c.currentTime);
    env.gain.linearRampToValueAtTime(0.4, c.currentTime + 0.003);
    env.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);
    const pan = this._makePanner(x, z);
    osc.connect(env); env.connect(pan || this.master);
    if (pan) pan.connect(this.master);
    osc.start(c.currentTime); osc.stop(c.currentTime + 0.04);
  }

  // ── Dead intercom crackle ────────────────────────────────────────────────
  intercomCrackle() {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    // Initial crackle
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.08;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = rnd(600, 2200); f.Q.value = 0.8;
      const env = c.createGain();
      env.gain.setValueAtTime(0, c.currentTime + delay);
      env.gain.linearRampToValueAtTime(0.6, c.currentTime + delay + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 0.12);
      src.connect(f); f.connect(env); env.connect(this.verb); env.connect(this.master);
      src.start(c.currentTime + delay); src.stop(c.currentTime + delay + 0.15);
    }

    // Voice-like modulated tone (mid-sentence cut simulation)
    setTimeout(() => {
      if (!this.ctx || this.muted) return;
      const c2 = this.ctx;
      const osc = c2.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = rnd(140, 200);
      const vib = c2.createOscillator(); vib.type = 'sine'; vib.frequency.value = rnd(4, 8);
      const vibGain = c2.createGain(); vibGain.gain.value = rnd(5, 15);
      vib.connect(vibGain); vibGain.connect(osc.frequency);
      const f = c2.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 2;
      const env = c2.createGain();
      env.gain.setValueAtTime(0, c2.currentTime);
      env.gain.linearRampToValueAtTime(0.4, c2.currentTime + 0.08);
      env.gain.setValueAtTime(0.4, c2.currentTime + 1.6);
      env.gain.exponentialRampToValueAtTime(0.001, c2.currentTime + 1.65); // cuts mid-sentence
      osc.connect(f); f.connect(env); env.connect(this.verb); env.connect(this.master);
      osc.start(c2.currentTime); vib.start(c2.currentTime);
      osc.stop(c2.currentTime + 1.7); vib.stop(c2.currentTime + 1.7);
    }, 400);
  }

  // ── Metal impact / drawer slam ───────────────────────────────────────────
  drawerSlam(x = 0, z = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    // Impact transient
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f1 = c.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = 400;
    const env = c.createGain();
    env.gain.setValueAtTime(0, c.currentTime);
    env.gain.linearRampToValueAtTime(1.4, c.currentTime + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
    // Ring
    const ring = c.createOscillator(); ring.type = 'sine'; ring.frequency.value = rnd(220, 380);
    ring.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.4);
    const rg = c.createGain();
    rg.gain.setValueAtTime(0.6, c.currentTime);
    rg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
    ring.connect(rg);
    const pan = this._makePanner(x, z);
    src.connect(f1); f1.connect(env); env.connect(pan || this.verb);
    rg.connect(pan || this.verb);
    if (pan) pan.connect(this.master);
    this.verb.connect(this.master);
    src.start(c.currentTime); ring.start(c.currentTime);
    src.stop(c.currentTime + 0.4); ring.stop(c.currentTime + 0.42);
  }

  // ── Spatial whisper ──────────────────────────────────────────────────────
  whisperRaspy(type = 'wrongroom', x = 0, z = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    // Breathed formant synthesis
    const freqs = { wrongroom: [300, 420, 220], watching: [260, 380, 180], getaway: [340, 460, 240], inthere: [280, 400, 200] };
    const fSet = freqs[type] || freqs['watching'];
    const start = c.currentTime;
    fSet.forEach((freq, i) => {
      const src = c.createBufferSource(); src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = rnd(5, 12);
      const env = c.createGain();
      const offset = i * 0.14;
      env.gain.setValueAtTime(0, start + offset);
      env.gain.linearRampToValueAtTime(rnd(0.15, 0.28), start + offset + 0.12);
      env.gain.exponentialRampToValueAtTime(0.001, start + offset + 0.6);
      const pan = this._makePanner(x, z);
      src.connect(f); f.connect(env); env.connect(pan || this.verb);
      if (pan) pan.connect(this.master);
      src.start(start + offset); src.stop(start + offset + 0.65);
    });
  }

  // ── Horror stinger ───────────────────────────────────────────────────────
  stinger(type = 'soft') {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const configs = {
      soft:    { freq: 180, dur: 1.2, vol: 0.5, sweep: 90 },
      hard:    { freq: 240, dur: 0.8, vol: 0.9, sweep: 60 },
      extreme: { freq: 320, dur: 0.5, vol: 1.3, sweep: 40 }
    };
    const cfg2 = configs[type] || configs.soft;
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(cfg2.freq, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(cfg2.sweep, c.currentTime + cfg2.dur);
    const env = c.createGain();
    env.gain.setValueAtTime(cfg2.vol, c.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, c.currentTime + cfg2.dur);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
    osc.connect(f); f.connect(env); env.connect(this.verb); env.connect(this.master);
    osc.start(c.currentTime); osc.stop(c.currentTime + cfg2.dur + 0.05);
  }

  // ── CRT hum toggle ───────────────────────────────────────────────────────
  crtHum(on) {
    if (!this.crtHumNodes) return;
    const target = on ? 0.006 : 0;
    if (this.ctx) this.crtHumNodes.gain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.5);
  }
}


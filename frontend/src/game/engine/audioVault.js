// Procedural Horror Audio Synthesizer for Room 6: The Anointing Vault
// Zero external asset dependency (optional .mp3/.ogg layering supported if placed in /assets/audio/vault/).
// Features: 1.4s biological core pulse, mechanical split-flap clack-snap, heavy knife-switch clang,
// cast-iron typewriter hammer clack, wet stone footsteps, chain creaks, and glass-slam stingers.

const rnd = (a, b) => a + Math.random() * (b - a);

export class GameAudioVault {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.vol = 0.88;
    this.L = { x: 0, z: 0, yaw: 0 };
    this.pulseTimer = null;
    this.creakTimer = null;
    this.motifTimer = null;
    this.motifStep = 0;
    this.droneNodes = null;
    this.restored = false;
    this.tension = 1.0; // 1.0 = normal 1.4s, >1 = accelerated, 0 = stopped
    this.samples = {};
    this.ambienceSrc = null;
    this.loopSources = [];
    this.activeOneShots = {};
  }

  ensureActive() {
    if (!this.ctx) {
      this.start(this.cfg);
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  start(cfg = {}) {
    this.cfg = cfg;
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }

    const c = (this.ctx = new AudioCtx());
    if (c.state === 'suspended') c.resume().catch(() => {});

    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.vol;

    const dest = c.destination;
    const bus = this.master;

    if (typeof c.createDynamicsCompressor === 'function') {
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.knee.value = 10;
      this.comp.ratio.value = 5;
      this.comp.attack.value = 0.004;
      this.comp.release.value = 0.25;
      this.comp.connect(dest);
      bus.connect(this.comp);
    } else {
      bus.connect(dest);
    }

    if (typeof c.createConvolver === 'function' && typeof c.createBuffer === 'function' && this.comp) {
      // Gothic stone nave impulse reverb
      this.reverb = c.createConvolver();
      const len = Math.floor(c.sampleRate * 2.4);
      const ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.65)) * 0.48;
        }
      }
      this.reverb.buffer = ir;
      this.reverbGain = c.createGain();
      this.reverbGain.gain.value = 0.38;
      this.master.connect(this.reverb);
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.comp);
    }

    // Laptop-audible Gothic organ / cathedral cello bed (C3 + G3 + detuned Eb3 + C2 sub)
    if (typeof c.createOscillator === 'function') {
      const o1 = c.createOscillator();
      o1.type = 'sawtooth';
      o1.frequency.value = 130.81; // C3
      const o2 = c.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = 196.0; // G3
      const o3 = c.createOscillator();
      o3.type = 'sine';
      o3.frequency.value = 155.56; // Eb3
      const oSub = c.createOscillator();
      oSub.type = 'triangle';
      oSub.frequency.value = 65.41; // C2

      const gDrone = c.createGain();
      gDrone.gain.value = 0.13;

      if (typeof c.createBiquadFilter === 'function') {
        const lpf = c.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 520;
        lpf.Q.value = 1.2;
        o1.connect(lpf);
        o2.connect(lpf);
        o3.connect(lpf);
        oSub.connect(lpf);
        lpf.connect(gDrone);
      } else {
        o1.connect(gDrone);
        o2.connect(gDrone);
        o3.connect(gDrone);
        oSub.connect(gDrone);
      }
      gDrone.connect(this.master);
      o1.start();
      o2.start();
      o3.start();
      oSub.start();
      this.droneNodes = { o1, o2, o3, oSub, gDrone };
    }

    this._schedulePulse();
    this._scheduleCreak();
    // Kick off first eerie cathedral motif right after entry gesture
    this.motifTimer = setTimeout(() => this._scheduleMotif(), 650);
    // Non-blocking optional external horror audio sample loader (/assets/audio/vault/manifest.json)
    this._loadOptionalSamples();
  }

  async _loadOptionalSamples() {
    if (typeof fetch !== 'function' || !this.ctx || typeof this.ctx.decodeAudioData !== 'function') return;
    try {
      const res = await fetch('/assets/audio/vault/manifest.json');
      if (!res || !res.ok) return;
      const manifest = await res.json();
      const samples = manifest?.samples || {};
      const entries = Object.entries(samples).filter(([, fn]) => typeof fn === 'string' && fn.trim());
      await Promise.all(
        entries.map(async ([key, filename]) => {
          try {
            const url = filename.startsWith('/') ? filename : `/assets/audio/vault/${filename}`;
            const aRes = await fetch(url);
            if (!aRes || !aRes.ok || !this.ctx) return;
            const buf = await aRes.arrayBuffer();
            const decoded = await this.ctx.decodeAudioData(buf);
            if (!this.ctx) return;
            this.samples[key] = decoded;
            if (key === 'ambience' && !this.ambienceSrc && this.master) {
              const src = this.ctx.createBufferSource();
              src.buffer = decoded;
              src.loop = true;
              const g = this.ctx.createGain();
              g.gain.value = 0.34;
              src.connect(g);
              g.connect(this.master);
              src.start();
              this.ambienceSrc = src;
              this.loopSources.push(src);
              // Fade down synthetic sawtooth drone once genuine studio horror ambience loads
              if (this.droneNodes?.gDrone?.gain) {
                this.droneNodes.gDrone.gain.value = 0.025;
              }
            } else if ((key === 'blood_drip' || key === 'machine_hum') && this.master) {
              const lsrc = this.ctx.createBufferSource();
              lsrc.buffer = decoded;
              lsrc.loop = true;
              const lg = this.ctx.createGain();
              lg.gain.value = key === 'blood_drip' ? 0.13 : 0.09;
              lsrc.connect(lg);
              lg.connect(this.master);
              lsrc.start();
              this.loopSources.push(lsrc);
            }
          } catch (_) {
            // Optional sample missing or unplayable — fallback synth handles seamlessly
          }
        })
      );
    } catch (_) {
      // Safe offline/test fallback
    }
  }

  _playSample(key, gainVal = 0.85, trackAs = null) {
    const buf = this.samples?.[key];
    if (!buf || !this.ctx || !this.master || this.muted) return false;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = gainVal;
      src.connect(g);
      g.connect(this.master);
      src.start();
      if (trackAs) {
        try {
          this.activeOneShots[trackAs]?.stop?.();
        } catch (_) {}
        this.activeOneShots[trackAs] = { src, gain: g };
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  stopSample(trackAs) {
    const entry = this.activeOneShots?.[trackAs];
    if (!entry) return;
    try {
      if (entry.gain?.gain && this.ctx) {
        entry.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
      }
      entry.src?.stop?.((this.ctx?.currentTime || 0) + 0.08);
    } catch (_) {}
    delete this.activeOneShots[trackAs];
  }

  _scheduleMotif() {
    if (this.motifTimer) clearTimeout(this.motifTimer);
    if (!this.ctx) return;

    // Suppress synthetic organ chimes during active horror once real horror ambience is loaded
    if (!this.muted && !(this.ambienceSrc && !this.restored)) {
      if (this.restored) {
        // Warm resolved sanctuary chime
        this._playCathedralPhrase([261.63, 329.63, 392.0, 523.25], 0.34, 0.085);
      } else {
        // C harmonic minor dread motifs (C4, Eb4, D4, B3, Ab3, G3, C5)
        const phrases = [
          [261.63, 311.13, 293.66, 246.94],
          [196.0, 207.65, 246.94, 261.63],
          [392.0, 415.3, 311.13, 293.66],
          [261.63, 246.94, 196.0],
        ];
        const phrase = phrases[this.motifStep % phrases.length];
        this.motifStep += 1;
        this._playCathedralPhrase(phrase, 0.56, 0.11);
      }
    }

    const nextDelay = this.restored ? 7200 : Math.round(rnd(3600, 5600));
    this.motifTimer = setTimeout(() => this._scheduleMotif(), nextDelay);
  }

  _playCathedralPhrase(freqs, stepSec = 0.52, peakGain = 0.1) {
    if (!this.ctx || this.muted || typeof this.ctx.createOscillator !== 'function') return;
    const c = this.ctx;
    const t0 = c.currentTime;

    freqs.forEach((f, idx) => {
      const startAt = t0 + idx * stepSec;
      const o = c.createOscillator();
      const oHarm = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      oHarm.type = 'sine';
      o.frequency.setValueAtTime(f, startAt);
      oHarm.frequency.setValueAtTime(f * 2, startAt);

      g.gain.setValueAtTime(0.001, startAt);
      g.gain.linearRampToValueAtTime(peakGain, startAt + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + 1.85);

      const gHarm = c.createGain();
      gHarm.gain.value = 0.25;

      o.connect(g);
      oHarm.connect(gHarm);
      gHarm.connect(g);
      g.connect(this.master);
      o.start(startAt);
      oHarm.start(startAt);
      o.stop(startAt + 1.9);
      oHarm.stop(startAt + 1.9);
    });
  }

  _schedulePulse() {
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
    if (!this.ctx || this.restored) return;

    this._playCorePulse();
    const interval = Math.max(480, Math.round(1400 / Math.max(0.5, this.tension)));
    this.pulseTimer = setTimeout(() => this._schedulePulse(), interval);
  }

  _playCorePulse() {
    if (!this.ctx || this.muted || this.restored) return;
    const c = this.ctx;
    const t = c.currentTime;

    // Audible laptop-ready double lub-dub thump
    [0, 0.24].forEach((offset, idx) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(idx === 0 ? 112 : 94, t + offset);
      o.frequency.exponentialRampToValueAtTime(38, t + offset + 0.26);
      g.gain.setValueAtTime(0.001, t + offset);
      g.gain.linearRampToValueAtTime(idx === 0 ? 0.28 : 0.19, t + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.32);
      o.connect(g);
      g.connect(this.master);
      o.start(t + offset);
      o.stop(t + offset + 0.34);
    });
  }

  heartbeat() {
    this._playCorePulse();
  }

  _scheduleCreak() {
    if (this.creakTimer) clearTimeout(this.creakTimer);
    if (!this.ctx) return;
    const delay = rnd(11000, 22000);
    this.creakTimer = setTimeout(() => {
      if (!this.restored) this.creak();
      this._scheduleCreak();
    }, delay);
  }

  setTension(level) {
    this.tension = Math.max(0.4, Math.min(2.6, level));
  }

  stopCorePulse() {
    this.restored = true;
    this.stopMachineLoop();
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
      this.pulseTimer = null;
    }
    if (this.droneNodes && this.ctx) {
      const t = this.ctx.currentTime;
      try {
        this.droneNodes.o3?.frequency?.setTargetAtTime?.(164.81, t, 0.4); // Shift Eb3 -> E3 resolve!
        this.droneNodes.gDrone?.gain?.setTargetAtTime?.(0.07, t, 0.6);
      } catch (_) {}
    }
  }

  vaultCalm() {
    this.stopCorePulse();
  }

  setMuted(m) {
    this.muted = Boolean(m);
    if (this.master && this.ctx) {
      if (typeof this.master.gain.setTargetAtTime === 'function') {
        this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol, this.ctx.currentTime, 0.05);
      } else {
        this.master.gain.value = this.muted ? 0 : this.vol;
      }
    }
  }

  listen(x, z, yaw) {
    this.L = { x, z, yaw };
  }

  // Mechanical split-flap CLACK-SNAP every second
  flapClack() {
    if (!this.ctx || this.muted || this.restored) return;
    const c = this.ctx;
    const t = c.currentTime;

    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.045), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.009));
    }
    const src = c.createBufferSource();
    src.buffer = buf;

    const bpf = c.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 1850;
    bpf.Q.value = 2.4;

    const g = c.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    src.connect(bpf);
    bpf.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  // Heavy metallic knife-switch CLANG (R2-09)
  clang() {
    this.ensureActive();
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const t = c.currentTime;

    [310, 585, 1140].forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = i === 0 ? 'square' : 'triangle';
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.72, t + 0.22);
      g.gain.setValueAtTime(0.16 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + 0.26);
    });
  }

  // Heavy typewriter hammer clack (R2-10)
  keystroke() {
    this.ensureActive();
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const t = c.currentTime;

    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(rnd(170, 230), t);
    o.frequency.exponentialRampToValueAtTime(65, t + 0.045);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.055);
  }

  // Heavy rusted chain / iron cell hinge creak
  creak() {
    this.ensureActive();
    if (!this.ctx || this.muted) return;
    if (this._playSample('door_creak', 0.72)) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(rnd(95, 145), t);
    o.frequency.linearRampToValueAtTime(rnd(65, 90), t + 0.55);
    const bpf = c.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 340;
    bpf.Q.value = 6;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    o.connect(bpf);
    bpf.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.7);
  }

  step(s = 1) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(92, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.09);
    g.gain.setValueAtTime(0.11 * s, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.12);
  }

  click() {
    this.clang();
  }

  good() {
    this.ensureActive();
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const t = c.currentTime;
    [330, 440, 554.37].forEach((f, idx) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t + idx * 0.08);
      g.gain.setValueAtTime(0.09, t + idx * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.35);
      o.connect(g);
      g.connect(this.master);
      o.start(t + idx * 0.08);
      o.stop(t + idx * 0.08 + 0.38);
    });
  }

  bad() {
    this.ensureActive();
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const t = c.currentTime;
    [130, 92].forEach((f, idx) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t + idx * 0.09);
      o.frequency.linearRampToValueAtTime(f * 0.7, t + idx * 0.09 + 0.3);
      g.gain.setValueAtTime(0.14, t + idx * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.32);
      o.connect(g);
      g.connect(this.master);
      o.start(t + idx * 0.09);
      o.stop(t + idx * 0.09 + 0.35);
    });
  }

  playWomanCrying(gainVal = 0.42) {
    this.ensureActive();
    if (!this.ctx || this.muted) return false;
    return this._playSample('woman_crying', gainVal, 'woman_crying');
  }

  stopWomanCrying() {
    this.stopSample('woman_crying');
  }

  playBreathScared(gainVal = 0.72) {
    this.ensureActive();
    if (!this.ctx || this.muted) return false;
    return this._playSample('breath_scared', gainVal);
  }

  playBonecrack(gainVal = 0.85) {
    this.ensureActive();
    if (!this.ctx || this.muted) return false;
    return this._playSample('bonecrack', gainVal);
  }

  playStab(gainVal = 0.88) {
    this.ensureActive();
    if (!this.ctx || this.muted) return false;
    return this._playSample('stab', gainVal);
  }

  playMonster(gainVal = 0.85) {
    this.ensureActive();
    if (!this.ctx || this.muted) return false;
    const keys = ['monster_2', 'monster_5', 'monster'].filter((k) => Boolean(this.samples?.[k]));
    const pick = keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : 'monster';
    return this._playSample(pick, gainVal);
  }

  playGateOpen(gainVal = 0.78) {
    this.ensureActive();
    if (!this.ctx || this.muted) return false;
    if (this._playSample('gate_open', gainVal)) return true;
    this.creak();
    return false;
  }

  playCrows(gainVal = 0.52) {
    this.ensureActive();
    if (!this.ctx || this.muted) return false;
    return this._playSample('crows', gainVal);
  }

  playEvilLaugh(gainVal = 0.48) {
    this.ensureActive();
    if (!this.ctx || this.muted) return false;
    return this._playSample('laugh_evil', gainVal);
  }

  startMachineLoop(gainVal = 0.14) {
    this.ensureActive();
    if (!this.ctx || this.muted || !this.master || this.machineLoopSrc) return false;
    const buf = this.samples?.machine_loop || this.samples?.machine_hum;
    if (!buf) return false;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = gainVal;
      src.connect(g);
      g.connect(this.master);
      src.start();
      this.machineLoopSrc = src;
      this.machineLoopGain = g;
      this.loopSources.push(src);
      return true;
    } catch (_) {
      return false;
    }
  }

  stopMachineLoop() {
    try {
      if (this.machineLoopGain?.gain && this.ctx) {
        this.machineLoopGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.18);
      }
      this.machineLoopSrc?.stop?.((this.ctx?.currentTime || 0) + 0.35);
    } catch (_) {}
    this.machineLoopSrc = null;
    this.machineLoopGain = null;
  }

  scareHit() {
    this.ensureActive();
    if (!this.ctx || this.muted) return;
    if (this._playSample('stab', 0.86) || this._playSample('monster', 0.80)) {
      this._playSample('monster', 0.42);
      return;
    }
    const c = this.ctx;
    const t = c.currentTime;

    // Punchy low-end body slam + screeching tritone horror cluster
    if (typeof c.createOscillator === 'function') {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(165, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.55);
      g.gain.setValueAtTime(0.45, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + 0.62);

      // Tritone dissonant bowed-metal shriek (audible & chilling on any speaker)
      [1180, 1665, 620].forEach((freq, i) => {
        const hi = c.createOscillator();
        const hg = c.createGain();
        hi.type = i === 1 ? 'sawtooth' : 'square';
        hi.frequency.setValueAtTime(freq, t);
        hi.frequency.exponentialRampToValueAtTime(freq * 0.62, t + 0.45);
        hg.gain.setValueAtTime(0.001, t);
        hg.gain.linearRampToValueAtTime(0.18 / (i + 1), t + 0.015);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
        hi.connect(hg);
        hg.connect(this.master);
        hi.start(t);
        hi.stop(t + 0.5);
      });
    }

    // Crisp transient white-noise burst for glass/cage rattle shock
    if (typeof c.createBuffer === 'function' && typeof c.createBufferSource === 'function') {
      const len = Math.floor(c.sampleRate * 0.24);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.065));
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.32, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      src.connect(ng);
      ng.connect(this.master);
      src.start(t);
    }
  }

  // Heavy iron cell-bar / lockup chains slam
  chainsRattle() {
    this.ensureActive();
    if (!this.ctx || this.muted || typeof this.ctx.createOscillator !== 'function') return;
    if (this._playSample('chains', 0.82)) return;
    const c = this.ctx;
    const t = c.currentTime;
    [0, 0.09, 0.21].forEach((off, k) => {
      [840 + k * 90, 1420 + k * 140].forEach((freq) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, t + off);
        o.frequency.exponentialRampToValueAtTime(freq * 0.78, t + off + 0.14);
        g.gain.setValueAtTime(0.14, t + off);
        g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.16);
        o.connect(g);
        g.connect(this.master);
        o.start(t + off);
        o.stop(t + off + 0.18);
      });
    });
  }

  // Hollow spectral breath / whisper beside player in the dark
  whisper() {
    this.ensureActive();
    if (!this.ctx || this.muted) return;
    if (this._playSample('whisper', 0.78)) return;
    const c = this.ctx;
    const t = c.currentTime;
    const len = Math.floor(c.sampleRate * 0.95);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
    }
    const src = c.createBufferSource();
    src.buffer = buf;

    const bpf = c.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(920, t);
    bpf.frequency.exponentialRampToValueAtTime(280, t + 0.85);
    bpf.Q.value = 3.8;

    const g = c.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.14);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.92);

    src.connect(bpf);
    bpf.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  // Accelerating wet stone footsteps right behind the player
  phantomSteps() {
    this.ensureActive();
    if (!this.ctx || this.muted) return;
    [0, 290, 520, 700, 840].forEach((delayMs, idx) => {
      setTimeout(() => {
        if (!this.ctx || this.muted) return;
        this.step(0.9 + idx * 0.15);
      }, delayMs);
    });
  }

  // Dry granite scrape when weeping statue rotates behind the player
  statueScrape() {
    this.ensureActive();
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(215, t);
    o.frequency.linearRampToValueAtTime(108, t + 0.65);
    const bpf = c.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 460;
    bpf.Q.value = 4.2;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.68);
    o.connect(bpf);
    bpf.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.72);
  }

  // High-voltage relay buzz & crackle for East Relay surges
  voltageBuzz() {
    this.ensureActive();
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(120, t);
    const lpf = c.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 960;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.2, t + 0.05);
    g.gain.setValueAtTime(0.05, t + 0.22);
    g.gain.setValueAtTime(0.22, t + 0.31);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
    o.connect(lpf);
    lpf.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.76);
  }

  // Terrifying distorted screaming shriek + sub-bass impact for sudden lunges
  screamStinger() {
    this.ensureActive();
    if (!this.ctx || this.muted || !this.master) return;
    const playedSample = this._playSample('scream', 0.92);
    const c = this.ctx;
    const t = c.currentTime;

    if (!playedSample) {
      // 1) Dissonant tritone shriek sweep (fallback when no external scream.mp3 is dropped in)
      [680, 965, 1340].forEach((freq, idx) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = idx === 2 ? 'square' : 'sawtooth';
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * 0.42, t + 0.55);
        const bpf = c.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.value = 1150;
        bpf.Q.value = 1.8;
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.24, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
        o.connect(bpf);
        bpf.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + 0.6);
      });
    }

    // 2) Sub-bass slam thump
    const sub = c.createOscillator();
    const sg = c.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(115, t);
    sub.frequency.exponentialRampToValueAtTime(34, t + 0.42);
    sg.gain.setValueAtTime(0.001, t);
    sg.gain.linearRampToValueAtTime(0.55, t + 0.015);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.46);
    sub.connect(sg);
    sg.connect(this.master);
    sub.start(t);
    sub.stop(t + 0.48);

    // 3) Burst noise hiss
    const len = Math.floor(c.sampleRate * 0.36);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.14));
    const nSrc = c.createBufferSource();
    nSrc.buffer = buf;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.32, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    nSrc.connect(ng);
    ng.connect(this.master);
    nSrc.start(t);
  }

  // Deep electrical blackout power-down whine
  powerOut() {
    this.ensureActive();
    if (!this.ctx || this.muted || !this.master) return;
    if (this._playSample('blackout', 0.85)) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.72);
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.78);
  }

  // Terrifying layered jumpscare banshee scream with sub-bass slam & monster roar
  playAgathaScream(vol = 0.95) {
    this.ensureActive();
    if (!this.ctx || this.muted || !this.master) return;
    this._playSample('scream', vol);
    this._playSample('monster_5', vol * 0.9);
    this._playSample('stab', vol * 0.8);
    this._playSample('bonecrack', vol * 0.75);
    this.screamStinger();
  }

  playTensionStab(vol = 0.85) {
    this.ensureActive();
    if (!this.ctx || this.muted || !this.master) return;
    this._playSample('stab', vol);
    this._playSample('breath_scared', vol * 0.8);
    this.scareHit();
  }

  dispose() {
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
    if (this.creakTimer) clearTimeout(this.creakTimer);
    if (this.motifTimer) clearTimeout(this.motifTimer);
    try {
      this.ambienceSrc?.stop?.();
      this.stopMachineLoop();
      this.loopSources?.forEach((s) => s?.stop?.());
      Object.keys(this.activeOneShots || {}).forEach((k) => this.stopSample(k));
      this.droneNodes?.o1?.stop();
      this.droneNodes?.o2?.stop();
      this.droneNodes?.o3?.stop();
      this.droneNodes?.oSub?.stop();
      this.ctx?.close();
    } catch (_) {}
    this.ctx = null;
  }
}

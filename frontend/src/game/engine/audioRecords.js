// Specialized Procedural Survival-Horror Audio Synthesizer for Room 4: The Rotting Archive
// Uses 100% Web Audio API procedural synthesis with zero external audio assets.
// Features: 18.98 Hz infrasound resonance, 60Hz ballast buzz, water drip convolution reverb,
// spatial follower wet footsteps, metal slams, and visceral psychological stingers.

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class GameAudioRecords {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.vol = 0.85;
    this.L = { x: 0, z: 0, yaw: 0 };
    this.heartbeatTimer = null;
    this.dripTimer = null;
    this.eventTimer = null;
    this.humNodes = null;
    this.infraNodes = null;
    this.isBlackout = false;
  }

  ensureActive() {
    if (!this.ctx) {
      this.start(this.cfg);
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  start(cfg = {}) {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const c = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    if (c.state === 'suspended') {
      c.resume().catch(() => {});
    }
    this.cfg = cfg;

    // Master Dynamics Compressor & Analyser
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.vol;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -12;
    this.comp.knee.value = 8;
    this.comp.ratio.value = 6;
    this.comp.attack.value = 0.003;
    this.comp.release.value = 0.25;

    this.an = c.createAnalyser();
    this.an.fftSize = 256;
    this.master.connect(this.comp);
    this.comp.connect(this.an);
    this.an.connect(c.destination);

    // Cavernous Industrial Vault Convolver Reverb (wet concrete impulse response)
    const irLen = c.sampleRate * 3.2;
    const ir = c.createBuffer(2, irLen, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        const decay = Math.pow(1 - i / irLen, 2.4);
        // Early reflections + decaying noise
        d[i] = (Math.random() * 2 - 1) * decay * (1 + 0.3 * Math.sin(i * 0.02));
      }
    }
    this.verb = c.createConvolver();
    this.verb.buffer = ir;
    const vg = c.createGain();
    vg.gain.value = 0.48;
    this.verb.connect(vg);
    vg.connect(this.master);

    // Shared white/pink noise buffer for steam, wet footsteps, and impacts
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;

    // 1. INFRASOUND GENERATOR (18.98 Hz physiological dread oscillator)
    this.initInfrasound();

    // 2. 60Hz FLUORESCENT BALLAST & MAINS HUM
    this.initFluorescentHum();

    // 3. LOW-FREQUENCY DETUNED INDUSTRIAL DRONE
    this.initIndustrialDrone();

    // 4. PERIODIC WATER DRIPS IN STAGNANT POOL
    this.schedWaterDrips();

    // 5. RANDOMIZED PARANORMAL AMBIENT EVENTS
    this.schedEvents();
  }

  // 18.98 Hz sub-bass sine tone
  initInfrasound() {
    const c = this.ctx;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 18.98; // Human eyeball resonance & fear trigger

    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.045; // Slow 22-second swell cycle
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.035;

    const gain = c.createGain();
    gain.gain.value = 0.065;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.master);

    osc.start();
    lfo.start();
    this.infraNodes = { osc, lfo, gain };
  }

  // 60Hz + 120Hz harsh fluorescent lighting ballast hum
  initFluorescentHum() {
    const c = this.ctx;
    const humFilter = c.createBiquadFilter();
    humFilter.type = 'bandpass';
    humFilter.frequency.value = 120;
    humFilter.Q.value = 4.0;

    const gain = c.createGain();
    gain.gain.value = 0.055;

    [60, 120, 180, 300].forEach((freq, idx) => {
      const o = c.createOscillator();
      o.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      o.frequency.value = freq;
      const g = c.createGain();
      g.gain.value = [0.4, 0.7, 0.25, 0.15][idx];
      o.connect(g);
      g.connect(humFilter);
      o.start();
    });

    humFilter.connect(gain);
    gain.connect(this.master);
    this.humNodes = { gain, humFilter };
  }

  // Deep cavernous sub-station drone
  initIndustrialDrone() {
    const c = this.ctx;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    lp.Q.value = 3.5;

    const gain = c.createGain();
    gain.gain.value = 0.09;
    lp.connect(gain);
    gain.connect(this.master);
    gain.connect(this.verb);

    [36.7, 43.65, 51.9, 73.4].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = i % 2 ? 'sawtooth' : 'triangle';
      o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.005);
      const g = c.createGain();
      g.gain.value = [0.8, 0.5, 0.3, 0.2][i];
      o.connect(g);
      g.connect(lp);
      o.start();
    });

    // Slow filter modulation (pipe air current)
    const sweep = c.createOscillator();
    sweep.type = 'sine';
    sweep.frequency.value = 0.08;
    const sweepGain = c.createGain();
    sweepGain.gain.value = 90;
    sweep.connect(sweepGain);
    sweepGain.connect(lp.frequency);
    sweep.start();
  }

  listen(x, z, yaw) {
    this.L.x = x;
    this.L.z = z;
    this.L.yaw = yaw;
  }

  spat(x, z, v = 1) {
    if (!this.ctx) return null;
    const c = this.ctx;
    const L = this.L;
    const dx = x - L.x;
    const dz = z - L.z;
    const d = Math.hypot(dx, dz) || 0.01;
    const pan = Math.max(-1, Math.min(1, (dx * Math.cos(L.yaw) + dz * -Math.sin(L.yaw)) / d));

    const g = c.createGain();
    g.gain.value = v / (1 + d * 0.45);

    const p = c.createStereoPanner();
    p.pan.value = pan * 0.95;

    g.connect(p);
    p.connect(this.master);

    const s = c.createGain();
    s.gain.value = 0.45;
    p.connect(s);
    s.connect(this.verb);
    return g;
  }

  schedWaterDrips() {
    const drip = () => {
      if (this.ctx && !this.isBlackout) {
        const x = rnd(-4.5, 4.5);
        const z = rnd(-3.5, 3.5);
        this.waterDrip(x, z);
      }
      this.dripTimer = setTimeout(drip, rnd(800, 2400));
    };
    drip();
  }

  schedEvents() {
    const [minS, maxS] = this.cfg.every || [14, 30];
    this.eventTimer = setTimeout(() => {
      this.randomHorrorEvent();
      this.schedEvents();
    }, rnd(minS, maxS) * 1000);
  }

  burst(f, q, dur, v, dest, sweep, type = 'bandpass') {
    if (!this.ctx || !dest) return;
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const bp = c.createBiquadFilter();
    bp.type = type;
    bp.Q.value = q;
    const t = c.currentTime;
    bp.frequency.setValueAtTime(f, t);
    if (sweep) bp.frequency.linearRampToValueAtTime(sweep, t + dur);

    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    s.connect(bp);
    bp.connect(g);
    g.connect(dest);
    s.start(t, rnd(0, 1), dur + 0.05);
  }

  osc(type, f0, f1, dur, v, dest, t0 = 0) {
    if (!this.ctx || !dest) return null;
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + t0;
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);

    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  dist(amount = 45) {
    const c = this.ctx;
    const w = c.createWaveShaper();
    const k = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = i / 128 - 1;
      k[i] = Math.tanh((x * amount) / 10);
    }
    w.curve = k;
    return w;
  }

  // Single high-resonance water droplet into floor puddle
  waterDrip(x, z) {
    if (!this.ctx) return;
    const d = this.spat(x, z, rnd(0.4, 0.8));
    if (!d) return;
    const f0 = rnd(1400, 2600);
    const f1 = f0 * rnd(1.4, 1.9); // Distinct rising pitch characteristic of water droplets
    this.osc('sine', f0, f1, 0.065, 0.45, d);
    // Subtle splash body
    setTimeout(() => {
      this.burst(f0 * 0.8, 4, 0.08, 0.18, d, f0 * 0.3);
    }, 15);
  }

  // Player footsteps in puddle water
  step(v = 1) {
    if (!this.ctx) return;
    const o = this.master;
    // Splash transient
    this.burst(1200, 2.5, 0.08, 0.12 * v, o, 400, 'bandpass');
    // Wet thud
    this.burst(180, 1.2, 0.14, 0.22 * v, o, 90, 'lowpass');
    // Secondary splash droplets
    if (Math.random() < 0.4) {
      setTimeout(() => {
        this.osc('sine', rnd(1200, 2000), rnd(800, 1400), 0.04, 0.06 * v, this.verb);
      }, 40);
    }
  }

  // FOLLOW THE PLAYER: Terrifying wet footsteps directly behind listener
  followerFootstepsBehind() {
    this.ensureActive();
    if (!this.ctx) return;
    const L = this.L;
    // Position 1.5 - 3.5 meters directly behind the player's view vector
    const bx = L.x + Math.sin(L.yaw) * 3.2;
    const bz = L.z + Math.cos(L.yaw) * 3.2;
    const stepsCount = 7;

    for (let i = 0; i < stepsCount; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const progress = i / (stepsCount - 1);
        const currX = bx + (L.x - bx) * progress * 0.8;
        const currZ = bz + (L.z - bz) * progress * 0.8;
        const d = this.spat(currX, currZ, 1.4 + progress * 0.6);
        if (!d) return;

        // Heavy wet dragging footstep
        this.burst(140, 1.5, 0.22, 0.7 + progress * 0.3, d, 60, 'lowpass');
        this.burst(1600, 3.5, 0.15, 0.35, d, 500, 'bandpass');
        this.osc('sawtooth', 85, 40, 0.3, 0.2, d);

        // On the final close step: sudden ragged breathing whisper
        if (i === stepsCount - 1) {
          setTimeout(() => {
            this.whisperRaspy('behind', currX, currZ);
          }, 300);
        }
      }, i * 280);
    }
  }

  // Raspy guttural whisper (synthesized white-noise formant filters)
  whisperRaspy(phrase, x, z) {
    this.ensureActive();
    if (!this.ctx) return;
    const d = this.spat(x, z, 1.6);
    if (!d) return;

    // Multi-formant rasp simulating vocal tract friction
    const formants = [750, 1220, 2400, 3400];
    formants.forEach((f, i) => {
      this.burst(f, 6.0, rnd(0.45, 0.75), 0.35, d, f * rnd(0.85, 1.15), 'bandpass');
    });

    // Deep sub-harmonic guttural voice fry
    this.osc('sawtooth', 75, 45, 0.65, 0.28, d);
  }

  // JS-01: Drawer Slam (metal drawer violent bang)
  drawerSlam(x, z) {
    this.ensureActive();
    if (!this.ctx) return;
    const d = this.spat(x, z, 2.0);
    if (!d) return;
    const dist = this.dist(65);
    dist.connect(d);

    // Initial metallic slide screech
    this.burst(3200, 8.0, 0.12, 1.2, dist, 1200, 'bandpass');
    // Explosive metal impact
    this.burst(350, 0.8, 0.5, 1.8, dist, 80, 'lowpass');
    // Deep room rattle
    this.osc('sine', 110, 32, 0.85, 1.4, d);
    this.burst(4500, 5.0, 0.35, 0.6, this.verb, 800);
  }

  // JS-02: Document Head-Turn / Screaming Stinger (Horrific Multi-Layered Banshee & Entity Shriek)
  screamingStinger(intensity = 1) {
    this.ensureActive();
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime;
    const g = c.createGain();
    g.gain.value = Math.min(1.4, 0.82 * intensity);
    g.connect(this.master);
    g.connect(this.verb);

    const w = this.dist(90);
    w.connect(g);

    // 1. Dissonant clustered microtonal sawtooth + square shrieks with chaotic FM vocal-cord tear
    [311.1, 466.2, 493.9, 587.3, 622.3, 739.9, 880.0, 1244.5, 1661.2].forEach((freq, idx) => {
      const o = this.osc(idx % 2 ? 'sawtooth' : 'square', freq * 0.9, freq * (idx % 2 ? 1.32 : 0.78), 1.65, 0.52, w);
      if (o) {
        const fm = c.createOscillator();
        const fg = c.createGain();
        fm.frequency.value = 32 + idx * 4.5;
        fg.gain.value = 78 + idx * 15;
        fm.connect(fg);
        fg.connect(o.frequency);
        fm.start(t);
        fm.stop(t + 1.68);
      }
    });

    // 2. High-formant banshee scream sweep
    const sbp = c.createBiquadFilter();
    sbp.type = 'bandpass';
    sbp.Q.value = 3.0;
    sbp.frequency.setValueAtTime(1050, t);
    sbp.frequency.exponentialRampToValueAtTime(2480, t + 0.16);
    sbp.frequency.exponentialRampToValueAtTime(1280, t + 1.45);
    sbp.connect(w);
    this.osc('sawtooth', 840, 2240, 1.45, 0.88, sbp);
    this.osc('sawtooth', 895, 2360, 1.45, 0.78, sbp);

    // 3. Visceral sub bass chest-slam drop & tearing noise
    this.osc('sine', 118, 20, 2.2, 1.85, g);
    this.burst(1100, 1.0, 1.3, 1.15, w, 150, 'lowpass');
    this.burst(2800, 1.8, 1.15, 1.05, w, 920, 'bandpass');
  }

  // JS-03: Sudden Blackout Surge (fluorescent pop + electrical spark + heart pounding)
  blackoutSurge() {
    this.ensureActive();
    if (!this.ctx) return;
    this.isBlackout = true;
    const c = this.ctx;

    // Electrical arc zap
    const zap = c.createGain();
    zap.gain.value = 1.2;
    zap.connect(this.master);
    this.burst(4800, 12.0, 0.08, 1.3, zap, 400);
    this.osc('sawtooth', 320, 60, 0.15, 0.9, zap);

    // Mute hum temporarily
    if (this.humNodes) {
      this.humNodes.gain.gain.setValueAtTime(0, c.currentTime);
    }

    // Heavy adrenaline heartbeat
    this.heartbeat(true, 120);

    setTimeout(() => {
      // Light stuttering back on
      this.sparkPop();
      if (this.humNodes) {
        this.humNodes.gain.gain.setValueAtTime(0.055, this.ctx.currentTime);
      }
      this.isBlackout = false;
      this.heartbeat(false);
    }, 2400);
  }

  sparkPop() {
    if (!this.ctx) return;
    this.burst(3800, 10, 0.04, 0.7, this.master);
    this.burst(180, 2, 0.08, 0.4, this.master);
  }

  // JS-05: High-pressure pipe hiss and metal clank
  pipeBurst(x, z) {
    this.ensureActive();
    if (!this.ctx) return;
    const d = this.spat(x, z, 1.6);
    if (!d) return;

    // Metal clank
    this.osc('sine', 480, 120, 0.18, 0.9, d);
    this.burst(950, 4.0, 0.15, 0.7, d);

    // Scalding high pressure hiss
    this.burst(3400, 2.2, 1.2, 0.65, d, 1800, 'bandpass');
  }

  // Heartbeat loop with controllable BPM
  heartbeat(on, bpm = 80) {
    clearInterval(this.heartbeatTimer);
    if (!on || !this.ctx) return;

    const intervalMs = (60 / bpm) * 1000;
    const beat = () => {
      if (!this.ctx) return;
      // Lub
      this.osc('sine', 70, 36, 0.14, 1.0, this.master);
      // Dub
      setTimeout(() => {
        if (this.ctx) this.osc('sine', 60, 32, 0.16, 0.8, this.master);
      }, 140);
    };

    beat();
    this.heartbeatTimer = setInterval(beat, intervalMs);
  }

  // Random ambient occurrences
  randomHorrorEvent() {
    if (!this.ctx || this.isBlackout) return;
    const r = Math.random();
    const ax = rnd(-4.2, 4.2);
    const az = rnd(-3.2, 3.2);

    if (r < 0.28) {
      // Rusted metal pipe groaned
      const d = this.spat(ax, az, 0.7);
      if (d) {
        this.osc('sawtooth', rnd(120, 180), rnd(60, 95), rnd(0.7, 1.3), 0.22, d);
      }
    } else if (r < 0.55) {
      // Water drip cascade
      for (let i = 0; i < 4; i++) {
        setTimeout(() => this.waterDrip(ax + rnd(-0.5, 0.5), az + rnd(-0.5, 0.5)), i * 140);
      }
    } else if (r < 0.78) {
      // Distant wet footstep
      const d = this.spat(ax, az, 0.8);
      if (d) {
        this.burst(150, 1.2, 0.18, 0.5, d, 70, 'lowpass');
        this.burst(1400, 3.0, 0.1, 0.3, d);
      }
    } else {
      // Electrical flicker pop
      this.sparkPop();
    }
  }

  // Tactical / UI feedback sounds
  click() {
    if (!this.ctx) return;
    this.osc('sine', 1200, 600, 0.02, 0.08, this.master);
  }

  dialClick() {
    if (!this.ctx) return;
    this.burst(2400, 8.0, 0.015, 0.18, this.master);
  }

  good() {
    if (!this.ctx) return;
    [520, 650, 780, 1040].forEach((freq, i) => {
      setTimeout(() => {
        if (this.ctx) this.osc('sine', freq, freq * 1.01, 0.18, 0.14, this.master);
      }, i * 75);
    });
  }

  bad() {
    if (!this.ctx) return;
    this.osc('sawtooth', 140, 55, 0.35, 0.3, this.master);
    this.burst(400, 1.5, 0.25, 0.45, this.master);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.vol;
  }

  setVol(v) {
    this.vol = v;
    if (this.master && !this.muted) this.master.gain.value = v;
  }

  dispose() {
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.dripTimer);
    clearTimeout(this.eventTimer);
    this.ctx?.close();
    this.ctx = null;
  }
}

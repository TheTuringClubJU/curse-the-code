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
    this.bgmNodes = null;
    this.chimeTimer = null;
    this.heartbeatTimer = null;
    this.chaseBeatTimer = null;
    this.eventTimer = null;
    this._tension = 0;
    this._distCurve = null;
    this.cryAudio = null;
    this.cryGain = null;
    this.crySource = null;
    this._cryTargetVol = 0.36;
    this.cfg = {};
  }

  _ensureCryAudio() {
    if (this.cryAudio || typeof Audio === 'undefined') return this.cryAudio;
    try {
      const a = new Audio('/assets/audio/room5/creepy-woman-cry.mp3');
      a.loop = true;
      a.preload = 'auto';
      a.volume = this.cryGain ? 1.0 : Math.min(1.0, this._cryTargetVol);
      a.muted = Boolean(this.muted);
      this.cryAudio = a;
    } catch {
      this.cryAudio = null;
    }
    return this.cryAudio;
  }

  _connectCryGain() {
    const c = this.ctx;
    if (!c || !this.master || !this.cryAudio || this.cryGain || typeof c.createMediaElementSource !== 'function') return;
    try {
      this.crySource = c.createMediaElementSource(this.cryAudio);
      this.cryGain = c.createGain();
      this.cryGain.gain.value = this._cryTargetVol;
      this.crySource.connect(this.cryGain);
      this.cryGain.connect(this.master);
      if (this.verb) {
        const send = c.createGain();
        send.gain.value = 0.28;
        this.cryGain.connect(send);
        send.connect(this.verb);
      }
      this.cryAudio.volume = 1.0;
    } catch {
      this.cryGain = null;
      this.crySource = null;
    }
  }

  ensureActive() {
    this._ensureCryAudio();
    if (this.cryAudio && this.cryAudio.paused && !this.muted) {
      this.cryAudio.play?.()?.catch?.(() => {});
    }
    if (!this.ctx) { this.start(this.cfg); return; }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this._connectCryGain();
  }

  setWeepingVolume(level = 0.36) {
    const clamped = Math.max(0, Math.min(1.85, Number(level) || 0));
    this._cryTargetVol = clamped;
    const cry = this._ensureCryAudio();
    if (!cry) return;
    cry.muted = Boolean(this.muted);
    if (this.cryGain && this.ctx) {
      cry.volume = 1.0;
      this.cryGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.25);
    } else {
      cry.volume = Math.min(1.0, clamped);
    }
    if (cry.paused && !this.muted) {
      cry.play?.()?.catch?.(() => {});
    }
  }

  start(cfg = {}) {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      this._connectCryGain();
      return;
    }
    this.cfg = cfg;
    const c = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    if (c.state === 'suspended') c.resume().catch(() => {});
    this._ensureCryAudio();
    if (this.cryAudio && this.cryAudio.paused && !this.muted) {
      this.cryAudio.play?.()?.catch?.(() => {});
    }

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
    this._connectCryGain();

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

    // ── Eerie Gothic Horror BGM Drone & Cathedral Chimes ────────────────────
    this._startEerieBGM();

    // ── Scheduled static burst events ───────────────────────────────────────
    if (cfg.staticBursts !== false) {
      const scheduleStatic = () => {
        const delay = rnd(14, 30) * 1000;
        this.staticTimer = setTimeout(() => {
          this.staticBurst(this.L.x, this.L.z);
          scheduleStatic();
        }, delay);
      };
      scheduleStatic();
    }
  }

  _getDistortionCurve(amount = 42) {
    if (this._distCurve) return this._distCurve;
    const n = 256;
    const curve = new Float32Array(n);
    const k = Number(amount) || 42;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    this._distCurve = curve;
    return curve;
  }

  _startEerieBGM() {
    const c = this.ctx;
    if (!c) return;
    // Deep ominous minor chord bed (C3, Eb3, F#3, C2 bass) audible on all speaker types
    const freqs = [130.81, 155.56, 185.0, 65.41];
    const types = ['sawtooth', 'triangle', 'sine', 'sine'];
    const padGain = c.createGain();
    padGain.gain.value = 0.14;

    const padFilter = c.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 520;
    padFilter.Q.value = 1.9;

    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.085;
    const lfoDepth = c.createGain();
    lfoDepth.gain.value = 210;
    lfo.connect(lfoDepth);
    lfoDepth.connect(padFilter.frequency);
    lfo.start();

    // Layered industrial chase dissonance cluster (sub-brass + minor-9th string shriek)
    const chaseOsc = c.createOscillator();
    chaseOsc.type = 'sawtooth';
    chaseOsc.frequency.value = 146.83;
    const chaseSub = c.createOscillator();
    chaseSub.type = 'sawtooth';
    chaseSub.frequency.value = 73.42;
    const chaseShriekOsc = c.createOscillator();
    chaseShriekOsc.type = 'sawtooth';
    chaseShriekOsc.frequency.value = 311.13;

    const chaseFilter = c.createBiquadFilter();
    chaseFilter.type = 'lowpass';
    chaseFilter.frequency.value = 460;
    chaseFilter.Q.value = 3.2;

    const chaseShaper = c.createWaveShaper();
    chaseShaper.curve = this._getDistortionCurve(36);
    chaseShaper.oversample = '2x';

    const chaseGain = c.createGain();
    chaseGain.gain.value = 0.001;

    chaseOsc.connect(chaseFilter);
    chaseSub.connect(chaseFilter);
    chaseShriekOsc.connect(chaseFilter);
    chaseFilter.connect(chaseShaper);
    chaseShaper.connect(chaseGain);
    chaseGain.connect(this.verb);
    chaseGain.connect(this.master);
    chaseOsc.start();
    chaseSub.start();
    chaseShriekOsc.start();

    const oscs = freqs.map((f, i) => {
      const o = c.createOscillator();
      o.type = types[i];
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.value = i === 3 ? 0.28 : 0.26;
      o.connect(g);
      g.connect(padFilter);
      o.start();
      return o;
    });

    padFilter.connect(padGain);
    padGain.connect(this.verb);
    padGain.connect(this.master);
    this.bgmNodes = {
      oscs,
      lfo,
      chaseOsc,
      chaseSub,
      chaseShriekOsc,
      chaseFilter,
      chaseGain,
      padGain,
      padFilter,
    };

    // Haunted survival-horror piano / music-box ostinato through bunker reverb (unmistakable in mid-range)
    const motif = [261.63, 311.13, 392.0, 369.99, 246.94, 311.13, 466.16, 392.0];
    let stepIdx = 0;
    const playChime = () => {
      if (!this.ctx) return;
      const t = this._tension;
      if (!this.muted) {
        const now = this.ctx.currentTime;
        const note = motif[stepIdx % motif.length];
        stepIdx += 1;
        const o = this.ctx.createOscillator();
        const o2 = this.ctx.createOscillator();
        o.type = 'triangle';
        o2.type = 'sine';
        o.frequency.setValueAtTime(note, now);
        o2.frequency.setValueAtTime(note * 0.501, now);
        const eg = this.ctx.createGain();
        eg.gain.setValueAtTime(0.0001, now);
        eg.gain.linearRampToValueAtTime(0.11 + t * 0.055, now + 0.035);
        eg.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
        o.connect(eg);
        o2.connect(eg);
        eg.connect(this.verb);
        eg.connect(this.master);
        o.start(now);
        o2.start(now);
        o.stop(now + 2.95);
        o2.stop(now + 2.95);
      }
      const nextNoteMs = Math.max(620, 1280 - t * 520 + (stepIdx % 4 === 0 ? 450 : 0));
      this.chimeTimer = setTimeout(playChime, nextNoteMs);
    };
    this.chimeTimer = setTimeout(playChime, 450);

    // Heartbeat thump scales when hunter approaches / tension > 0.2
    const pulseHeart = () => {
      if (!this.ctx) return;
      const t = this._tension;
      if (!this.muted && t > 0.2) {
        const now = this.ctx.currentTime;
        [0, 0.19].forEach((off, idx) => {
          const ho = this.ctx.createOscillator();
          ho.type = 'sine';
          ho.frequency.setValueAtTime(idx === 0 ? 64 : 52, now + off);
          ho.frequency.exponentialRampToValueAtTime(30, now + off + 0.15);
          const hg = this.ctx.createGain();
          hg.gain.setValueAtTime(0.001, now + off);
          hg.gain.linearRampToValueAtTime(0.36 * t, now + off + 0.015);
          hg.gain.exponentialRampToValueAtTime(0.001, now + off + 0.17);
          ho.connect(hg);
          hg.connect(this.master);
          ho.start(now + off);
          ho.stop(now + off + 0.19);
        });
      }
      const nextMs = Math.max(275, 980 - t * 670);
      this.heartbeatTimer = setTimeout(pulseHeart, nextMs);
    };
    this.heartbeatTimer = setTimeout(pulseHeart, 900);

    // Poppy Playtime-inspired industrial panic chase percussion + dissonant string stabs
    let beatIdx = 0;
    const playChaseBeat = () => {
      if (!this.ctx) return;
      const t = this._tension;
      if (!this.muted && t >= 0.34) {
        const now = this.ctx.currentTime;
        const drive = Math.min(1, (t - 0.34) / 0.66);

        // Deep industrial kick slam
        const kick = this.ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(102, now);
        kick.frequency.exponentialRampToValueAtTime(30, now + 0.16);
        const kg = this.ctx.createGain();
        kg.gain.setValueAtTime(0.001, now);
        kg.gain.linearRampToValueAtTime(0.28 * drive + 0.08, now + 0.008);
        kg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        kick.connect(kg);
        kg.connect(this.master);
        kick.start(now);
        kick.stop(now + 0.24);

        // Off-beat metallic hangar rail clang & high string stab
        if (beatIdx % 2 === 1 && drive > 0.22) {
          const ns = this.ctx.createBufferSource();
          ns.buffer = this.noiseBuf;
          const hp = this.ctx.createBiquadFilter();
          hp.type = 'bandpass';
          hp.frequency.value = 1850 + drive * 950;
          hp.Q.value = 3.2;
          const ng = this.ctx.createGain();
          ng.gain.setValueAtTime(0.001, now);
          ng.gain.linearRampToValueAtTime(0.22 * drive, now + 0.008);
          ng.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          ns.connect(hp); hp.connect(ng); ng.connect(this.verb); ng.connect(this.master);
          ns.start(now); ns.stop(now + 0.18);
        }

        // Urgent minor-second screech stab every bar
        if (beatIdx % 4 === 0 && drive > 0.28) {
          [293.66, 311.13, 440.0].forEach((f, idx) => {
            const so = this.ctx.createOscillator();
            so.type = 'sawtooth';
            so.frequency.setValueAtTime(f * (beatIdx % 8 === 0 ? 1.0 : 1.06), now);
            const sg = this.ctx.createGain();
            sg.gain.setValueAtTime(0.001, now);
            sg.gain.linearRampToValueAtTime((idx === 1 ? 0.075 : 0.055) * drive, now + 0.015);
            sg.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            so.connect(sg);
            sg.connect(this.verb);
            sg.connect(this.master);
            so.start(now);
            so.stop(now + 0.26);
          });
        }
        beatIdx += 1;
      }
      const nextBeatMs = Math.max(205, 450 - t * 235);
      this.chaseBeatTimer = setTimeout(playChaseBeat, nextBeatMs);
    };
    this.chaseBeatTimer = setTimeout(playChaseBeat, 500);
  }

  setChaseTension(level = 0) {
    const clamped = Math.max(0, Math.min(1, Number(level) || 0));
    this._tension = clamped;
    if (!this.ctx || !this.bgmNodes) return;
    const now = this.ctx.currentTime;
    this.bgmNodes.chaseGain.gain.setTargetAtTime(0.001 + clamped * 0.28, now, 0.14);
    this.bgmNodes.chaseFilter?.frequency.setTargetAtTime(420 + clamped * 2000, now, 0.14);
    this.bgmNodes.padGain.gain.setTargetAtTime(0.14 + clamped * 0.14, now, 0.16);
    this.bgmNodes.padFilter?.frequency.setTargetAtTime(520 + clamped * 680, now, 0.16);
  }

  dispose() {
    this.stop();
  }

  stop() {
    clearTimeout(this.staticTimer);
    clearTimeout(this.eventTimer);
    clearTimeout(this.chimeTimer);
    clearTimeout(this.heartbeatTimer);
    clearTimeout(this.chaseBeatTimer);
    if (this.cryAudio) {
      try {
        this.cryAudio.pause?.();
        this.cryAudio.currentTime = 0;
      } catch {}
      this.cryAudio = null;
    }
    this.cryGain = null;
    this.crySource = null;
    if (!this.ctx) return;
    try {
      this.humNodes?.h1?.stop(); this.humNodes?.h2?.stop(); this.humNodes?.h3?.stop();
      this.infraNodes?.osc?.stop();
      this.crtHumNodes?.osc?.stop(); this.crtHumNodes?.noise?.stop();
      this.bgmNodes?.oscs?.forEach((o) => o.stop());
      this.bgmNodes?.lfo?.stop();
      this.bgmNodes?.chaseOsc?.stop();
      this.bgmNodes?.chaseSub?.stop();
      this.bgmNodes?.chaseShriekOsc?.stop();
      this.ctx.close();
    } catch (e) {}
    this.ctx = null;
    this.bgmNodes = null;
  }

  setMuted(m) {
    this.muted = m;
    if (this.cryAudio) this.cryAudio.muted = Boolean(m);
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

  // ── UI & Player Feedback Cues ──────────────────────────────────────────
  click() {
    this.relayClick(this.L.x, this.L.z);
  }

  step(intensity = 0.7) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 340;
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, c.currentTime);
    g.gain.linearRampToValueAtTime(0.08 * intensity, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.085);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(c.currentTime);
    src.stop(c.currentTime + 0.1);
  }

  good() {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    [329.63, 392.0].forEach((freq, idx) => {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      const g = c.createGain();
      const t = c.currentTime + idx * 0.08;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(g);
      g.connect(this.verb);
      o.start(t);
      o.stop(t + 0.5);
    });
  }

  bad() {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(118, c.currentTime);
    o.frequency.linearRampToValueAtTime(84, c.currentTime + 0.25);
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = c.createGain();
    g.gain.setValueAtTime(0.16, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.28);
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    o.start(c.currentTime);
    o.stop(c.currentTime + 0.3);
  }

  // ── CRT hum toggle ───────────────────────────────────────────────────────
  crtHum(on) {
    if (!this.crtHumNodes) return;
    const target = on ? 0.006 : 0;
    if (this.ctx) this.crtHumNodes.gain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.5);
  }

  // ── Spatial vintage telephone ring ──────────────────────────────────────
  phoneRing(x = 2.6, z = 0.96) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const now = c.currentTime;
    [0, 0.18, 0.65, 0.83].forEach((off) => {
      const o1 = c.createOscillator();
      const o2 = c.createOscillator();
      o1.type = 'sine'; o2.type = 'triangle';
      o1.frequency.setValueAtTime(440, now + off);
      o2.frequency.setValueAtTime(480, now + off);
      const g = c.createGain();
      g.gain.setValueAtTime(0.001, now + off);
      g.gain.linearRampToValueAtTime(0.12, now + off + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.14);
      const pan = this._makePanner(x, z);
      o1.connect(g); o2.connect(g);
      g.connect(pan || this.verb);
      if (pan) pan.connect(this.master);
      o1.start(now + off); o2.start(now + off);
      o1.stop(now + off + 0.16); o2.stop(now + off + 0.16);
    });
  }

  // ── Heavy brass deadbolt unlatch SFX ────────────────────────────────────
  unlockBolt(x = 0, z = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    [420, 680].forEach((freq, i) => {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, c.currentTime + i * 0.09);
      const g = c.createGain();
      g.gain.setValueAtTime(0.2, c.currentTime + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.09 + 0.14);
      const pan = this._makePanner(x, z);
      o.connect(g); g.connect(pan || this.master);
      if (pan) pan.connect(this.master);
      o.start(c.currentTime + i * 0.09);
      o.stop(c.currentTime + i * 0.09 + 0.16);
    });
  }

  // ── Predatory Entity Spatial Growl & Wet Breath ─────────────────────────
  stalkerGrowl(x = 0, z = 0, intensity = 0.75) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const now = c.currentTime;
    const pan = this._makePanner(x, z);
    const out = pan || this.verb;
    if (pan) pan.connect(this.master);

    // Guttural sub-growl
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(rnd(64, 86), now);
    o.frequency.linearRampToValueAtTime(rnd(46, 58), now + 0.72);
    const lf = c.createBiquadFilter();
    lf.type = 'lowpass';
    lf.frequency.value = 340;
    const og = c.createGain();
    og.gain.setValueAtTime(0.001, now);
    og.gain.linearRampToValueAtTime(0.26 * intensity, now + 0.08);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
    o.connect(lf); lf.connect(og); og.connect(out);
    o.start(now); o.stop(now + 0.8);

    // Raspy throat hiss overtone
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const bf = c.createBiquadFilter();
    bf.type = 'bandpass';
    bf.frequency.setValueAtTime(920, now);
    bf.frequency.exponentialRampToValueAtTime(420, now + 0.65);
    bf.Q.value = 4.2;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.18 * intensity, now + 0.06);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    src.connect(bf); bf.connect(ng); ng.connect(out);
    src.start(now); src.stop(now + 0.72);
  }

  // ── Heavy Bone/Boot Entity Step (approaching stalker) ───────────────────
  heavyEntityStep(x = 0, z = 0, intensity = 0.85) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const now = c.currentTime;
    const pan = this._makePanner(x, z);
    if (pan) pan.connect(this.master);

    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(62, now);
    o.frequency.exponentialRampToValueAtTime(24, now + 0.16);
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.28 * intensity, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    o.connect(g); g.connect(pan || this.verb);
    o.start(now); o.stop(now + 0.2);

    const scrape = c.createBufferSource();
    scrape.buffer = this.noiseBuf;
    const sf = c.createBiquadFilter();
    sf.type = 'bandpass';
    sf.frequency.value = rnd(580, 860);
    sf.Q.value = 3.0;
    const sg = c.createGain();
    sg.gain.setValueAtTime(0.001, now);
    sg.gain.linearRampToValueAtTime(0.08 * intensity, now + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    scrape.connect(sf); sf.connect(sg); sg.connect(pan || this.verb);
    scrape.start(now); scrape.stop(now + 0.14);
  }

  // ── Safe-Zone Steel Bulkhead Slam (blocked from 5B entry) ───────────────
  bulkheadBang(x = 1.0, z = 1.9) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const now = c.currentTime;
    const pan = this._makePanner(x, z);
    if (pan) pan.connect(this.master);

    // Sub impact + metallic ring
    [54, 196, 311].forEach((freq, idx) => {
      const o = c.createOscillator();
      o.type = idx === 0 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(freq, now);
      o.frequency.exponentialRampToValueAtTime(Math.max(22, freq * 0.45), now + 0.35);
      const g = c.createGain();
      g.gain.setValueAtTime(idx === 0 ? 0.38 : 0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      o.connect(g); g.connect(pan || this.verb);
      o.start(now); o.stop(now + 0.45);
    });
  }

  // ── Full-Spectrum Monster Roar & Shriek Jumpscare Stinger ─────────────────
  jumpscareSting() {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const now = c.currentTime;

    // 1. Massive chest-slam sub impact
    const sub = c.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(118, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.72);
    const subG = c.createGain();
    subG.gain.setValueAtTime(0.78, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    sub.connect(subG); subG.connect(this.master);
    sub.start(now); sub.stop(now + 0.88);

    // 2. Guttural FM vocal-cord overdrive scream cluster
    const growl = c.createOscillator();
    growl.frequency.setValueAtTime(48, now);
    const growlG = c.createGain();
    growlG.gain.setValueAtTime(88, now);
    growl.connect(growlG);
    growl.start(now);
    growl.stop(now + 1.4);

    const shaper = c.createWaveShaper();
    shaper.curve = this._getDistortionCurve(55);
    shaper.oversample = '2x';
    const screamFilter = c.createBiquadFilter();
    screamFilter.type = 'bandpass';
    screamFilter.frequency.setValueAtTime(1650, now);
    screamFilter.frequency.exponentialRampToValueAtTime(720, now + 1.32);
    screamFilter.Q.value = 1.25;
    shaper.connect(screamFilter);
    screamFilter.connect(this.verb);
    screamFilter.connect(this.master);

    [155.56, 293.66, 415.3, 622.25, 932.33, 1244.5].forEach((freq, i) => {
      const o = c.createOscillator();
      o.type = i % 2 === 0 ? 'sawtooth' : 'square';
      o.frequency.setValueAtTime(freq * 0.88, now);
      o.frequency.linearRampToValueAtTime(freq * 1.18, now + 0.055);
      o.frequency.exponentialRampToValueAtTime(freq * 0.56, now + 1.32);
      growlG.connect(o.frequency);
      const g = c.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(i < 2 ? 0.24 : 0.16, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.34);
      o.connect(g); g.connect(shaper);
      o.start(now); o.stop(now + 1.38);
    });

    // 3. Tearing predator shriek noise burst + double jaw-snap cracks
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const nf = c.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.setValueAtTime(2400, now);
    nf.frequency.exponentialRampToValueAtTime(580, now + 1.25);
    nf.Q.value = 1.65;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.62, now + 0.018);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 1.28);
    src.connect(nf); nf.connect(ng); ng.connect(shaper);
    src.start(now); src.stop(now + 1.3);

    [0.04, 0.26].forEach((snapOff) => {
      const t0 = now + snapOff;
      const snap = c.createBufferSource();
      snap.buffer = this.noiseBuf;
      const sf = c.createBiquadFilter();
      sf.type = 'highpass';
      sf.frequency.value = 1200;
      const sg = c.createGain();
      sg.gain.setValueAtTime(0.55, t0);
      sg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
      snap.connect(sf); sf.connect(sg); sg.connect(this.master);
      snap.start(t0); snap.stop(t0 + 0.09);
    });
  }

  // ── Rapid Claw-Foot Scurry When Peeking Entity Darts Into Darkness ────────
  scurrySteps(x, z) {
    if (!this.ctx || this.muted) return;
    const pan = this._panner(x, z);
    const base = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const t = base + i * 0.085;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 340 + i * 55;
      bp.Q.value = 2.5;
      const g = this.ctx.createGain();
      const vol = 0.24 * Math.max(0.2, 1 - i * 0.16);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
      src.connect(bp); bp.connect(g); g.connect(pan || this.verb);
      src.start(t); src.stop(t + 0.085);
    }
  }

  // ── Sharp Doorframe Peek / Discovery Stinger (Poppy-style reveal chord) ─
  peekSting() {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const now = c.currentTime;
    [523.25, 554.37, 740.0].forEach((freq, idx) => {
      const o = c.createOscillator();
      o.type = idx === 2 ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(freq, now);
      o.frequency.exponentialRampToValueAtTime(freq * 0.94, now + 0.72);
      const g = c.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(idx === 2 ? 0.12 : 0.16, now + 0.018);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      o.connect(g); g.connect(this.verb); g.connect(this.master);
      o.start(now); o.stop(now + 0.78);
    });
  }

  // ── Spatial Distant / Approaching Entity Shriek & Guttural Scream ────────
  entityScream(x, z, intensity = 0.75) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const now = c.currentTime;
    const clamped = Math.max(0.2, Math.min(1.0, intensity));
    const pan = this._panner(x, z);
    const dest = pan || this.verb;

    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 34;
    lfoGain.gain.value = 42;
    lfo.connect(lfoGain);
    lfo.start(now);
    lfo.stop(now + 1.3);

    const formant = c.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(1120 + clamped * 620, now);
    formant.frequency.exponentialRampToValueAtTime(520, now + 1.25);
    formant.Q.value = 2.1;

    const shaper = c.createWaveShaper();
    shaper.curve = this._getDistortionCurve(44);
    shaper.oversample = '2x';
    shaper.connect(formant);
    formant.connect(dest);
    if (this.verb && dest !== this.verb) {
      const send = c.createGain();
      send.gain.value = 0.55;
      formant.connect(send);
      send.connect(this.verb);
    }

    [138, 418, 449, 698].forEach((f0, idx) => {
      const o = c.createOscillator();
      o.type = idx % 2 === 0 ? 'sawtooth' : 'square';
      o.frequency.setValueAtTime(f0, now);
      o.frequency.linearRampToValueAtTime(f0 * (1.85 + clamped * 0.4), now + 0.16);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.72, now + 1.24);
      lfoGain.connect(o.frequency);

      const g = c.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime((idx === 0 ? 0.24 : 0.16) * clamped, now + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.26);
      o.connect(g);
      g.connect(shaper);
      o.start(now);
      o.stop(now + 1.3);
    });

    const nSrc = c.createBufferSource();
    nSrc.buffer = this.noiseBuf;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.36 * clamped, now + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
    nSrc.connect(ng);
    ng.connect(shaper);
    nSrc.start(now);
    nSrc.stop(now + 1.2);
  }

  // ── Spatial Distant Crying / Weeping Woman in Darkened Corners ────────────
  cryingWoman(x, z, intensity = 0.65) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const now = c.currentTime;
    const vol = Math.max(0.18, Math.min(1.0, intensity));
    const pan = this._panner(x, z);
    const dest = pan || this.verb;

    const sobs = [
      { off: 0.0, f0: 560, f1: 390, dur: 0.48 },
      { off: 0.56, f0: 510, f1: 335, dur: 0.52 },
      { off: 1.18, f0: 465, f1: 280, dur: 0.68 },
    ];

    sobs.forEach(({ off, f0, f1, dur }) => {
      const t0 = now + off;
      const vib = c.createOscillator();
      const vibG = c.createGain();
      vib.frequency.value = 6.2;
      vibG.gain.value = 16;
      vib.connect(vibG);
      vib.start(t0);
      vib.stop(t0 + dur + 0.1);

      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(760, t0);
      bp.frequency.exponentialRampToValueAtTime(520, t0 + dur);
      bp.Q.value = 3.4;
      bp.connect(dest);
      if (this.verb && dest !== this.verb) {
        const send = c.createGain();
        send.gain.value = 0.55;
        bp.connect(send);
        send.connect(this.verb);
      }

      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      vibG.connect(o.frequency);

      const g = c.createGain();
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.24 * vol, t0 + 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(bp);
      o.start(t0);
      o.stop(t0 + dur + 0.05);

      // Choked inhale gasp right at sob onset
      const ns = c.createBufferSource();
      ns.buffer = this.noiseBuf;
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.001, t0);
      ng.gain.linearRampToValueAtTime(0.14 * vol, t0 + 0.04);
      ng.gain.exponentialRampToValueAtTime(0.001, t0 + dur * 0.65);
      ns.connect(ng);
      ng.connect(bp);
      ns.start(t0);
      ns.stop(t0 + dur * 0.7);
    });
  }

  // ── Chilling High-Formant Female Shriek (Manifestation & Jump Ambush) ────
  womanScream(x, z, intensity = 0.90) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const now = c.currentTime;
    const vol = Math.max(0.25, Math.min(1.0, intensity));
    const pan = this._panner(x, z);
    const dest = pan || this.master;

    const flutter = c.createOscillator();
    const flutterG = c.createGain();
    flutter.frequency.value = 39;
    flutterG.gain.value = 54;
    flutter.connect(flutterG);
    flutter.start(now);
    flutter.stop(now + 1.45);

    const formant = c.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(1380, now);
    formant.frequency.exponentialRampToValueAtTime(2150, now + 0.22);
    formant.frequency.exponentialRampToValueAtTime(740, now + 1.32);
    formant.Q.value = 2.8;
    formant.connect(dest);
    if (this.verb) {
      const send = c.createGain();
      send.gain.value = 0.6;
      formant.connect(send);
      send.connect(this.verb);
    }

    [665, 712, 1080].forEach((freq, idx) => {
      const o = c.createOscillator();
      o.type = idx === 2 ? 'square' : 'sawtooth';
      o.frequency.setValueAtTime(freq * 0.86, now);
      o.frequency.exponentialRampToValueAtTime(freq * 1.45, now + 0.16);
      o.frequency.exponentialRampToValueAtTime(freq * 0.68, now + 1.32);
      flutterG.connect(o.frequency);

      const g = c.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime((idx === 0 ? 0.17 : 0.095) * vol, now + 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.36);
      o.connect(g);
      g.connect(formant);
      o.start(now);
      o.stop(now + 1.4);
    });

    const ns = c.createBufferSource();
    ns.buffer = this.noiseBuf;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.28 * vol, now + 0.06);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
    ns.connect(ng);
    ng.connect(formant);
    ns.start(now);
    ns.stop(now + 1.2);
  }
}


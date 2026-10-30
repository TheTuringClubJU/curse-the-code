/**
 * Curse the Code: Haunted Mansion Soundscape Generator
 * Synthesizes an eerie, chilling cinematic atmospheric score using Web Audio API:
 * 1. Deep Hollow Wind: Filtered white noise with random slow gusts
 * 2. Somber Dark Piano/Bell Chimes: Periodic, echoing minor notes (D minor / G minor) with natural decay
 * 3. Ghostly Sub-Pad: Very slow, dark string drone
 */
class AmbientSoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.intervals = [];
    this.activeNodes = [];
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  }

  async start(isRound2 = false) {
    try {
      this.init();
      if (this.isPlaying) return;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.isPlaying = true;
      const now = this.ctx.currentTime;

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.01, now);
      this.masterGain.gain.linearRampToValueAtTime(0.28, now + 1.5);
      this.masterGain.connect(this.ctx.destination);

      // --- 1. HAUNTED WIND GENERATOR (Filtered White Noise) ---
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(isRound2 ? 320 : 220, now);
      windFilter.Q.setValueAtTime(2.5, now);

      const windGain = this.ctx.createGain();
      windGain.gain.setValueAtTime(0.06, now);

      whiteNoise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.masterGain);
      whiteNoise.start();
      this.activeNodes.push(whiteNoise);

      // Gust of wind modulation (changes filter pitch like wind passing through old floorboards)
      const windInterval = setInterval(() => {
        if (!this.isPlaying || !this.ctx) return;
        const targetFreq = (isRound2 ? 280 : 180) + Math.random() * 260;
        const targetGain = 0.04 + Math.random() * 0.08;
        const t = this.ctx.currentTime;
        windFilter.frequency.exponentialRampToValueAtTime(Math.max(60, targetFreq), t + 3.5);
        windGain.gain.linearRampToValueAtTime(targetGain, t + 2.5);
      }, 4000);
      this.intervals.push(windInterval);

      // --- 2. DEEP SUB-GHOST CELLO/STRINGS (Dark Pad) ---
      const padOsc = this.ctx.createOscillator();
      padOsc.type = 'sawtooth';
      padOsc.frequency.setValueAtTime(isRound2 ? 58.27 : 73.42, now); // Bb1 or D2

      const padFilter = this.ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(120, now);

      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(0.12, now);

      padOsc.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(this.masterGain);
      padOsc.start();
      this.activeNodes.push(padOsc);

      // --- 3. SPOOKY METALLIC CLOCK/CHIME (Random Eerie Bells) ---
      // Minor notes: D4 (293.66Hz), F4 (349.23Hz), G#4/Ab4 (415.30Hz - tritone!), A4 (440Hz), C5 (523.25Hz)
      const spookyNotes = isRound2 
        ? [233.08, 277.18, 311.13, 349.23, 466.16] // Dark Bb minor
        : [293.66, 349.23, 415.30, 440.00, 523.25]; // D minor with diminished tritone

      const playEerieBell = () => {
        if (!this.isPlaying || !this.ctx) return;
        const chimeTime = this.ctx.currentTime;
        const note = spookyNotes[Math.floor(Math.random() * spookyNotes.length)];

        // Sine bell fundamental
        const bell = this.ctx.createOscillator();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(note, chimeTime);

        // Overtone for hollow metallic clock effect
        const overtone = this.ctx.createOscillator();
        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(note * 2.76, chimeTime); // Inharmonic metallic ratio

        const bellGain = this.ctx.createGain();
        bellGain.gain.setValueAtTime(0.001, chimeTime);
        bellGain.gain.linearRampToValueAtTime(0.14, chimeTime + 0.05); // quick strike
        bellGain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 4.5); // long haunting ring

        const overGain = this.ctx.createGain();
        overGain.gain.setValueAtTime(0.001, chimeTime);
        overGain.gain.linearRampToValueAtTime(0.04, chimeTime + 0.04);
        overGain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 2.5);

        bell.connect(bellGain);
        overtone.connect(overGain);
        bellGain.connect(this.masterGain);
        overGain.connect(this.masterGain);

        bell.start(chimeTime);
        overtone.start(chimeTime);
        bell.stop(chimeTime + 5.0);
        overtone.stop(chimeTime + 3.0);
      };

      // Play first chime shortly after start
      setTimeout(playEerieBell, 800);

      // Play subsequent chimes at random intervals (every 4 to 7 seconds)
      const bellInterval = setInterval(() => {
        if (Math.random() > 0.15) {
          playEerieBell();
        }
      }, 4500);
      this.intervals.push(bellInterval);

    } catch (e) {
      console.error('Haunted audio error:', e);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    try {
      this.intervals.forEach(id => clearInterval(id));
      this.intervals = [];

      if (this.masterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.8);
        setTimeout(() => {
          this.activeNodes.forEach(node => {
            try { node.stop(); } catch (_) {}
          });
          this.activeNodes = [];
          this.isPlaying = false;
        }, 800);
      } else {
        this.isPlaying = false;
      }
    } catch (e) {
      this.isPlaying = false;
    }
  }
}

export const ambientSound = new AmbientSoundManager();


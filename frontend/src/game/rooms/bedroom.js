// Room config: haunted Halloween bedroom (GLB-integrated interior + dark gothic atmosphere). Scene detail lives in scene.js + decor.js.
export default {
  id: 'bedroom',
  title: "Lena's Bedroom",
  size: [8, 3, 6],
  spawn: [0.8, 1.8, 1.45],
  haunted: true,
  theme: {
    bg: '#140d26',
    wall: '#4a3f73',
    floor: '#8a7aa8',
    ceil: '#241a42',
    accent: '#8f7bff',
    glow: '#cdbfff',
    lamp: '#ffcf8a',
    moon: '#9db8ff'
  },
  window: { z: 1.65, w: 2.0, y0: 0.7, y1: 2.4 },
  lamp: { pos: [-3.15, 1.55, 0.58], shadow: true },
  clock: { pos: [-3.32, 1.36, -1.95] },
  audio: {
    tick: true,
    every: [16, 38],
    whisperCooldown: 50,
    clock: [-3.32, -1.95],
    voices: ['seeyou', 'getout', 'behind', 'rex']
  },
  interact: {
    diary: { label: 'Inspect Diary' },
    musicbox: { label: 'Listen to Music Box' },
    poster: { label: 'Inspect Poster' },
    clock: { label: 'Inspect Torsion Pendulum Clock' }
  },
  boxes: []
};

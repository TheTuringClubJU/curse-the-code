// Room config: dark haunted Victorian bedroom (GLB-integrated interior). Scene detail lives in scene.js + decor.js.
export default {
  id: 'bedroom',
  title: "Lena's Bedroom",
  size: [8, 3, 6],
  spawn: [0.8, 1.8, 1.35],
  haunted: true,
  theme: {
    bg: '#05030a',
    wall: '#2b2342',
    floor: '#4a4060',
    ceil: '#120d21',
    accent: '#8f7bff',
    glow: '#cdbfff',
    lamp: '#ffcf8a',
    moon: '#7b93cc'
  },
  window: { z: 1.65, w: 2.0, y0: 0.7, y1: 2.4 },
  lamp: null,
  clock: { pos: [-1.35, 1.12, 2.50] },
  audio: {
    tick: true,
    every: [16, 38],
    whisperCooldown: 50,
    clock: [-1.35, 2.50],
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

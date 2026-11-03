export default {
  id: 'basement',
  title: 'The Basement',
  size: [8, 3.2, 7],
  spawn: [0, 1.8, 2.4],
  haunted: false,
  theme: {
    bg: '#14161a', wall: '#34343a', floor: '#25272b', ceil: '#111216',
    accent: '#ff4d4d', glow: '#ff8a8a', text: '#ffd6d6', lamp: '#ff2a2a'
  },
  window: null,
  audio: { tick: true, every: [12, 24], whisperCooldown: 60, voices: ['getout', 'seeyou'] },
  interact: {
    intercom: { label: 'Use Wall Intercom' }, rack_door: { label: 'Inspect Rack Door' },
    containment_console: { label: 'Open Containment Console' }
  },
  boxes: []
};

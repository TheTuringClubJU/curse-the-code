const boxes = [];

export default {
  id: 'basement',
  title: 'The Basement',
  size: [38, 3.8, 7.4],
  boundaryInset: 0,
  spawn: [0.8, 1.6, 2.4, 0],
  haunted: false,
  theme: {
    bg: '#14161a',
    wall: '#34343a',
    floor: '#25272b',
    ceil: '#111216',
    accent: '#ff4d4d',
    glow: '#8c2626',
    text: '#ffd6d6',
    lamp: '#ff2a2a'
  },
  window: null,
  audio: {
    tick: false,
    every: [3600, 3600],
    whisperCooldown: 3600,
    voices: []
  },
  interact: {
    intercom: { label: 'Use Wall Intercom' },
    rack_door: { label: 'Inspect Rack Door' },
    containment_console: { label: 'Open Containment Console' },
    server_rack: { label: 'Search Server Rack' },
    maintenance_terminal: { label: 'Examine Maintenance Terminal' },
    toolbox: { label: 'Search Mechanics Toolbox' },
    floor_seal: { label: 'Inspect Subterranean Floor Seal' },
    wall_monitor: { label: 'Read Quarantine Monitor' },
    fuse_box: { label: 'Check Breaker Fuse Box' },
    pipes: { label: 'Inspect Overhead Pipes' },
    barrels: { label: 'Search Storage Crates' },
    room_door: { label: 'Operate Containment Door' }
  },
  boxes
};

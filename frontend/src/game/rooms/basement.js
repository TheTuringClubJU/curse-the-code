const boxes = [];

export default {
  id: 'basement',
  title: 'The Basement',
  size: [8.4, 3.4, 10.0],
  boundaryInset: 0,
  spawn: [0, 1.6, 3.8, 0],
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
    every: [12, 22],
    whisperCooldown: 30,
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
    barrels: { label: 'Search Storage Barrels' },
    room_door: { label: 'Operate Containment Door' },
    flavor_valve: { label: 'Turn Steam Pressure Valve' },
    flavor_breaker: { label: 'Throw Emergency Knife Switch' },
    flavor_grate: { label: 'Peer Into Drainage Grate' }
  },
  boxes
};

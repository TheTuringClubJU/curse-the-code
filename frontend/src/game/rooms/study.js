// Daniel's Study (Green CRT / Hacker Investigation Room)
// 3D coordinate layout for all 20 objects + back/exit doors

export default {
  id: 'study',
  title: "Daniel's Study",
  size: [7.0, 3.2, 6.4],
  spawn: [-2.0, 1.8, 2.2],
  haunted: false,
  theme: {
    bg: '#04120b',
    wall: '#0b2418',
    floor: '#071810',
    ceil: '#030d07',
    accent: '#3dff8b',
    glow: '#7dffb0',
    text: '#b6ffd1',
    lamp: '#9dffc4',
    moon: '#1b4d32'
  },
  window: { z: 0.0, w: 1.8, y0: 1.0, y1: 2.3 },
  lamp: { pos: [-2.6, 1.8, 1.8], shadow: true },
  audio: {
    crtHum: true,
    typewriter: true,
    every: [12, 28],
    whisperCooldown: 35,
    voices: ['whisper_study']
  },
  // All 20 Objects from content.test.json + Doors
  objectCoordinates: {
    tablet_drawer: { pos: [-1.2, 0.72, -0.5], size: [0.6, 0.25, 0.5], role: 'clue_entry', clue_id: 'R1-05' },
    crt_monitor: { pos: [0.0, 0.95, -0.8], size: [0.55, 0.5, 0.5], role: 'clue_entry', clue_id: 'R1-06' },
    terminal_pc: { pos: [0.9, 0.5, -0.8], size: [0.35, 0.55, 0.6], role: 'clue_entry', clue_id: 'R1-07' },
    line_printer: { pos: [1.8, 0.75, -0.4], size: [0.65, 0.35, 0.55], role: 'clue_entry', clue_id: 'R1-08' },
    bookshelf: { pos: [-2.8, 1.5, 0.0], size: [0.45, 2.8, 2.2], role: 'interactive_fragment', fragments: ['ES01', 'EK03'] },
    corkboard: { pos: [1.5, 1.8, -2.8], size: [1.8, 1.1, 0.08], role: 'interactive_fragment', fragments: ['ES02', 'ES09'] },
    desk_blotter: { pos: [0.0, 0.76, -0.48], size: [0.95, 0.02, 0.65], role: 'interactive_fragment', fragments: ['ES03'] },
    filing_cabinet: { pos: [-2.6, 0.8, -2.5], size: [0.6, 1.5, 0.65], role: 'interactive_fragment', fragments: ['ES04', 'ES10'] },
    sticky_wall: { pos: [-1.8, 1.8, -2.9], size: [1.4, 1.2, 0.05], role: 'interactive_fragment', fragments: ['ES05'] },
    armchair: { pos: [-2.0, 0.5, 1.5], size: [0.95, 0.9, 0.95], role: 'interactive_fragment', fragments: ['ES06'] },
    reel_recorder: { pos: [2.2, 0.8, 1.0], size: [0.65, 0.75, 0.55], role: 'interactive_fragment', fragments: ['ES07', 'EK02'] },
    cable_bundle: { pos: [-0.5, 0.1, -1.1], size: [0.8, 0.15, 0.6], role: 'interactive_fragment', fragments: ['ES08'] },
    floor_lamp: { pos: [-2.6, 1.2, 1.8], size: [0.45, 2.1, 0.45], role: 'interactive_fragment', fragments: ['ES11'] },
    wastebin: { pos: [1.1, 0.3, -0.9], size: [0.35, 0.45, 0.35], role: 'interactive_fragment', fragments: ['ES12'] },
    window: { pos: [2.9, 1.5, 0.0], size: [0.2, 1.6, 1.8], role: 'interactive_fragment', fragments: ['XS01'] },
    radiator: { pos: [2.9, 0.4, 0.2], size: [0.25, 0.65, 1.2], role: 'interactive_fragment', fragments: ['XS02'] },
    desk: { pos: [0.0, 0.0, -0.7], size: [2.6, 0.75, 1.3], role: 'decor' },
    rug: { pos: [0.0, 0.01, 0.0], size: [3.2, 0.02, 3.8], role: 'decor' },
    beams_webs: { pos: [0.0, 3.0, 0.0], size: [6.8, 0.3, 6.2], role: 'decor' },
    coat_stand: { pos: [2.2, 1.0, 2.5], size: [0.45, 2.0, 0.45], role: 'decor' },
    study_door_back: { pos: [-2.5, 1.1, 2.9], size: [1.1, 2.2, 0.2], role: 'door_back' },
    study_door_exit: { pos: [0.0, 1.1, -2.95], size: [1.2, 2.2, 0.2], role: 'door_exit' }
  },
  interact: {
    tablet_drawer: { label: 'Inspect Tablet Drawer (R1-05)' },
    crt_monitor: { label: 'Inspect CRT Monitor (R1-06)' },
    terminal_pc: { label: 'Inspect Terminal PC (R1-07)' },
    line_printer: { label: 'Inspect Dot-Matrix Printer (R1-08)' },
    bookshelf: { label: 'Search Bookshelf' },
    corkboard: { label: 'Search Corkboard' },
    desk_blotter: { label: 'Search Desk Blotter' },
    filing_cabinet: { label: 'Search Filing Cabinet' },
    sticky_wall: { label: 'Search Sticky-Note Wall' },
    armchair: { label: 'Search Armchair' },
    reel_recorder: { label: 'Search Reel Recorder' },
    cable_bundle: { label: 'Search Cable Bundle' },
    floor_lamp: { label: 'Search Floor Lamp' },
    wastebin: { label: 'Search Waste Bin' },
    window: { label: 'Search Window' },
    radiator: { label: 'Search Radiator' },
    study_door_back: { label: 'Return to Lena\'s Bedroom' },
    study_door_exit: { label: 'Basement Blast Door' }
  },
  boxes: []
};

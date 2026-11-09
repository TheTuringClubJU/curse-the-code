// Room 5: The Surveillance Morgue — Observation Bunker Configuration
export default {
  id: 'control',
  title: 'The Surveillance Morgue',
  size: [12, 2.8, 5],
  spawn: [0, 2.4, 1.5],
  haunted: true,
  theme: {
    bg: '#030104',
    wall: '#0f1210',
    floor: '#0a0d0a',
    ceil: '#060808',
    accent: '#c47a00',
    glow: '#4dff78',
    phosphor: '#1a3d1f',
    phosphorText: '#4dff78',
    amber: '#c47a00',
    rust: '#2b1206',
    bone: '#c8b89a',
    decay: '#1a1208',
    void: '#030104'
  },
  audio: {
    static: true,
    relay: true,
    infrasound: true,
    hum: true,
    crt: true,
    every: [12, 28],
    whisperCooldown: 25,
    voices: ['wrongroom', 'watching', 'getaway', 'inthere']
  },
  interact: {
    relay_rack:      { label: 'Inspect Relay Rack' },
    tape_deck_cart:  { label: 'Examine Tape Deck Cart' },
    operator_chair:  { label: 'Search Operator Chair' },
    cable_trench:    { label: 'Inspect Cable Trench' },
    wall_clipboard:  { label: 'Read Wall Clipboard' },
    fuse_box:        { label: 'Open Fuse Box' },
    monitor_bank:    { label: 'View Monitor Bank' },
    dead_intercom:   { label: 'Press Intercom' },
    staff_terminal:  { label: 'Access Staff Terminal' },
    radio_console:   { label: 'Examine Radio Console' },
    sound_console:   { label: 'Inspect Sound Console' },
    control_door:    { label: 'Inspect Bunker Door' }
  },
  boxes: []
};

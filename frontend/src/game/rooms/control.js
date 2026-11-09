// Room 5: The Surveillance Morgue — Observation Bunker Configuration
export default {
  id: 'control',
  title: 'The Surveillance Morgue',
  size: [12, 3.0, 6],
  spawn: [0, 0.4, 0],
  haunted: true,
  theme: {
    bg: '#020304',
    wall: '#0d1210',
    floor: '#0a0d0b',
    ceil: '#050707',
    accent: '#c47a00',
    glow: '#4dff78',
    phosphor: '#1a3d1f',
    phosphorText: '#4dff78',
    amber: '#c47a00',
    rust: '#2b1206',
    bone: '#c8b89a',
    decay: '#1a1208',
    void: '#020304'
  },
  audio: {
    static: true,
    relay: true,
    infrasound: true,
    hum: true,
    crt: true,
    every: [10, 24],
    whisperCooldown: 20,
    voices: ['wrongroom', 'watching', 'getaway', 'inthere']
  },
  interact: {
    relay_rack:          { label: 'Inspect Relay Rack' },
    tape_deck_cart:      { label: 'Examine Tape Deck Cart' },
    operator_chair:      { label: 'Search Operator Chair' },
    cable_trench:        { label: 'Inspect Cable Trench' },
    wall_clipboard:      { label: 'Read Wall Clipboard' },
    fuse_box:            { label: 'Open Fuse Box' },
    monitor_bank:        { label: 'View Monitor Bank (CCTV)' },
    dead_intercom:       { label: 'Press Intercom' },
    staff_terminal:      { label: 'Access Staff Terminal' },
    radio_console:       { label: 'Examine Radio Console' },
    sound_console:       { label: 'Inspect Sound Console' },
    control_door:        { label: 'Inspect Bunker Entrance Door' },
    morgue_access_door:  { label: 'Inspect Morgue Security Door' },
    autopsy_gurney:      { label: 'Examine Autopsy Gurney' },
    cold_storage:        { label: 'Inspect Cold Storage Wall Lockers' },
    quarantine_tarp:     { label: 'Search Beneath Plastic Quarantine Tarp' },
    biometric_terminal:  { label: 'Swipe Clearance Badge at Airlock' },
    vault_door:          { label: 'Inspect Sealed Vault Door' }
  },
  boxes: []
};

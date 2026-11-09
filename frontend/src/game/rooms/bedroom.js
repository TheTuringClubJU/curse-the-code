// Room 1: Lena's Bedroom — Compound Victorian Gothic / Moonlit Purple Environment
// Sections: 1A Entry Porch (r100) -> 1B Master Bedroom (r102) -> 1C Hidden Ritual Alcove (r101)
export default {
  id: 'bedroom',
  title: "Lena's Bedroom",
  size: [12, 3.2, 8],
  spawn: [0.8, 1.8, 0],
  haunted: true,
  theme: {
    bg: '#0a0514',
    wall: '#2e2548',
    floor: '#453a61',
    ceil: '#140c26',
    accent: '#8f7bff',
    glow: '#cdbfff',
    lamp: '#ffcf8a',
    moon: '#7895e6',
    amber: '#c47a00',
    bone: '#c8b89a',
    decay: '#1a1208'
  },
  window: { z: -0.8, w: 1.6, y0: 1, y1: 2.3 },
  lamp: { pos: [3.0, 1.3, -2.5], shadow: true },
  clock: { pos: [2.7, 2.3, -2.95] },
  audio: {
    tick: true,
    every: [16, 38],
    whisperCooldown: 40,
    clock: [2.7, -2.95],
    voices: ['seeyou', 'getout', 'behind', 'rex', 'wrongroom']
  },
  interact: {
    // ── 1A: Hallway & Porch ──
    entry_door:       { label: 'Inspect Locked Front Entry Door' },
    coat_rack:        { label: 'Search Trenchcoat Pockets' },
    hallway_sconce:   { label: 'Examine Flickering Wall Sconce' },
    bedroom_door:     { label: 'Unlock Master Bedroom Door' },

    // ── 1B: Master Bedroom ──
    bed:              { label: 'Examine Canopy Bed' },
    pillow:           { label: 'Search Under Feather Pillow' },
    diary:            { label: 'Read Lena\'s Diary' },
    nightstand:       { label: 'Search Nightstand Drawers' },
    musicbox:         { label: 'Wind Antique Music Box' },
    candle:           { label: 'Inspect Brass Candleholder' },
    photo_frame:      { label: 'Examine Family Portrait' },
    desk:             { label: 'Search Writing Desk' },
    lamp:             { label: 'Inspect Banker\'s Desk Lamp' },
    wardrobe:         { label: 'Open Carved Oak Wardrobe' },
    wardrobe_secret:  { label: 'Push Concealed Wardrobe Backboard' },
    vanity_mirror:    { label: 'Peer into Vanity Mirror' },
    clock:            { label: 'Inspect Grandfather Clock' },

    // ── 1C: Hidden Ritual Alcove ──
    ritual_pentagram: { label: 'Examine Floor Chalk Pentagram' },
    suspended_cage:   { label: 'Inspect Suspended Birdcage' },
    ritual_lockbox:   { label: 'Unlock Antique Iron Lockbox' },
    exit_door:        { label: 'Unbolt Study Passage Door' }
  },
  boxes: []
};


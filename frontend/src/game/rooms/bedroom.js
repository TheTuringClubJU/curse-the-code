// Room 1: Village Cabin — Abandoned Homestead (RE4 r100 / r102 / r101)
// Sections: 1A Entry Porch (r100) -> 1B Abandoned Cabin (r102) -> 1C Hidden Ritual Cellar (r101)
export default {
  id: 'bedroom',
  title: "Village Cabin — Abandoned Homestead",
  size: [8, 3, 6],
  spawn: [-4.0, 1.8, 0],
  haunted: true,
  theme: {
    bg: '#050403',
    wall: '#1e1812',
    floor: '#140f0a',
    ceil: '#0a0806',
    accent: '#d4a040',
    glow: '#ffbe40',
    lamp: '#ff9933',
    moon: '#486488',
    amber: '#c47a00',
    bone: '#c8b89a',
    decay: '#120d09'
  },
  window: { z: -1.2, w: 1.8, y0: 0.8, y1: 2.6 },
  lamp: { pos: [0.3, 1.1, 0.15], shadow: true },
  clock: { pos: [0.95, 1.63, -3.8] },
  audio: {
    tick: true,
    every: [14, 32],
    whisperCooldown: 35,
    clock: [0.95, -3.8],
    voices: ['seeyou', 'getout', 'behind', 'rex', 'wrongroom']
  },
  interact: {
    // ── 1A: Entry Porch & Creaking Hallway (r100) ──
    entry_door:       { label: 'Inspect Heavy Timber Front Door [Locked from Outside]' },
    coat_rack:        { label: 'Inspect coat rack (Sodden Trenchcoat)' },
    hallway_sconce:   { label: 'Inspect hallway sconce (Flickering Oil Sconce)' },
    bedroom_door:     { label: 'Pass into Main Cabin Living Area' },

    // ── 1B: Abandoned Cabin / Master Room (r102 / r103) ──
    lamp:             { label: 'Inspect lamp (Kerosene Oil Lantern)' },
    diary:            { label: 'Inspect diary (Officer\'s Village Report)' },
    nightstand:       { label: 'Inspect nightstand (Handgun Ammo Box)' },
    trunk:            { label: 'Inspect trunk (Wooden Supply Crate)' },
    candle:           { label: 'Inspect candle (Cast-Iron Woodstove)' },
    photo_frame:      { label: 'Inspect photo frame (Potted Green Herb)' },
    clock:            { label: 'Inspect clock (Vintage Mantel Clock)' },
    desk:             { label: 'Inspect desk (Vintage Save Typewriter)' },
    bed:              { label: 'Inspect bed (Rustic Timber Cot)' },
    pillow:           { label: 'Inspect pillow (Search Feather Pillow)' },
    wardrobe:         { label: 'Inspect wardrobe (Carved Spanish Armoire)' },
    wardrobe_secret:  { label: 'Push False Wardrobe Backboard' },

    // ── 1C: Hidden Cellar Nook & Ritual Alcove (r101) ──
    ritual_lockbox:   { label: 'Inspect Heavy Cellar Trapdoor & Padlock' },
    suspended_cage:   { label: 'Inspect Suspended Iron Birdcage' },
    ritual_pentagram: { label: 'Inspect Floor Blood Sigil' },
    exit_door:        { label: 'Unbolt Study Passage Door (Room 2)' }
  },
  boxes: []
};

// Room 4: The Rotting Archive (Sub-basement Vault) Configuration
export default {
  id: 'records',
  title: 'The Rotting Archive',
  size: [10, 3.2, 8],
  spawn: [0, 2.6, 0],
  haunted: true,
  theme: {
    bg: '#020103',
    wall: '#1a1f1e',
    floor: '#0a0f12',
    ceil: '#080c0d',
    accent: '#c47a00',
    glow: '#e09820',
    lamp: '#9ec4e8',
    emergency: '#ba1a1a',
    water: '#061014'
  },
  audio: {
    drip: true,
    infrasound: true,
    hum: true,
    every: [14, 30],
    whisperCooldown: 30,
    voices: ['seeyou', 'behind', 'getout', 'trapped']
  },
  interact: {
    filing_cabinet_a: { label: 'Inspect Filing Cabinet A' },
    filing_cabinet_b: { label: 'Inspect Filing Cabinet B' },
    archive_shelves: { label: 'Inspect Waterlogged Shelves' },
    clerk_desk: { label: "Search Clerk's Desk" },
    card_catalog: { label: 'Search Damp Card Catalog' },
    waste_basket: { label: 'Rummage in Wire Waste Basket' },
    vent_grate: { label: 'Inspect Corroded Vent Grate' },
    report_folder: { label: 'Open Incident Report CF-79A2' },
    microfilm_reader: { label: 'Operate Microfilm Viewer' },
    timeline_board: { label: 'Examine Event Cards Timeline' },
    bulkhead_door: { label: 'Inspect Sealed Bulkhead Door' },
    room_door: { label: 'Archival Vault Hatch' }
  },
  boxes: []
};

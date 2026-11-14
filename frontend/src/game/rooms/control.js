// Room 5: The Surveillance Morgue — GLB Control Bunker Configuration
// Props aligned with content.test.json / content.json rooms[control] objects definition.

export const CONTROL_PROP_NOTES = {
  annex_incident_file: {
    id: 'LOG-5C-INCIDENT',
    kind: 'ambient_note',
    classification: 'ENVIRONMENTAL FIELD NOTE // WING 5C',
    location: 'Locker & Radio Annex (Wing 5C)',
    title: 'Wing 5C Watchdesk Folder',
    lines: [
      'A ring-bound shift folder left open beside the field radio transceiver.',
      'Handwritten marginalia from the late-shift operative tracks static bursts bleeding through from the Cryo Suite.',
    ],
    reportLines: [
      'Several late-shift timestamps were circled in red grease pencil before the desk was abandoned in haste.',
      'Field Lead [R2-06 Voice Machine]: Ignore low/mid-band generator static (3.18 kHz); switch the Bay 5B Sound Console to HIGH band and scrub 66%+ on the R2-05 verified reel.',
    ],
    highlight: 'Operative note: Substation logbook left open mid-entry during the 1983 curfew breach.',
  },
  guard_watch_ledger: {
    id: 'LOG-5C-GUARD',
    kind: 'ambient_note',
    classification: 'SECURITY POST LOG // WING 5C',
    location: 'South Locker Entry (Wing 5C)',
    title: 'Duty Officer Watch Ledger',
    lines: [
      'Rain-warped security ledger resting atop a wooden supply crate.',
      'The final lines read: "Bulkhead relays cycling on their own. Specimen containment glass frosted over."',
    ],
    reportLines: [
      'Ink smudges across the bottom margin where the night guard dropped his pen.',
    ],
    highlight: 'Security logbook — entries stop abruptly at 23:44.',
  },
  containment_protocol: {
    id: 'LOG-5D-PROTOCOL',
    kind: 'ambient_note',
    classification: 'OBSERVATION DIRECTIVE // WING 5D',
    location: 'Chamber 3 Observation Gallery (Wing 5D)',
    title: 'Observation Gallery Standing Orders',
    lines: [
      'Laminated standing orders taped onto the metal specimen worktable.',
      'Operatives are instructed never to unseal Chamber 3 while magnetic containment alarms are active in Sub-Level 2.',
    ],
    reportLines: [
      'If footsteps approach in the dark corridor, retreat behind the Control Bay 5B steel bulkhead.',
    ],
    highlight: 'Safety Protocol: Control Bay 5B steel threshold blocks hostile breach pursuit.',
  },
  chamber3_autopsy: {
    id: 'LOG-CH3-EXAM',
    kind: 'ambient_note',
    classification: 'CONTAINMENT EXAM SLIP // CHAMBER 3',
    location: 'Bio-Containment Cell (Chamber 3)',
    title: 'Cell Bench Specimen Clipboard',
    lines: [
      'Cold condensation drips across a scorched aluminum exam clipboard.',
      'An unsigned technician noted abnormal sub-vocal resonance echoing beneath the observation window.',
    ],
    reportLines: [
      'Side bulkhead doors link Chamber 3 directly with both Observation Lab 5D and the northern Relay Vault.',
      'Acoustic Note: Sub-vocal ultrasonic telemetry rides high above speech frequencies — look for 4-frame BCD-8421 (8-4-2-1 weights) and ITU Morse bursts on HIGH band.',
    ],
    highlight: 'Cell medical record — subject vitals erratic prior to containment failure.',
  },
  containment_key: {
    id: 'ITEM-5E-KEYRING',
    kind: 'ambient_note',
    classification: 'FACILITY HARDWARE // WING 5E',
    location: 'Cryo Autopsy Suite (Wing 5E)',
    title: 'Spare Brass Maintenance Keyring',
    lines: [
      'A tarnished brass keyring left inside a surgical instrument tray.',
      'Stamped tag reads: "ANNEX BYPASS — OVERRIDE MANUALLY UNLOCKED DURING POWER FAULT."',
    ],
    reportLines: [
      'Magnetic door latches across the internal Sub-Level 2 wings have already disengaged under power fault fail-safe.',
    ],
    highlight: 'Maintenance hardware tag — Substation Delta Lower Sector.',
  },
  autopsy_gurney: {
    id: 'PROP-5E-GURNEY',
    kind: 'ambient_note',
    classification: 'COLD STORAGE SLAB // WING 5E',
    location: 'Cryo Autopsy Suite (Wing 5E)',
    title: 'Stainless Cryo Examination Gurney',
    lines: [
      'Pitted surgical steel table draped in stained canvas restraints.',
      'Deep gouges run along the side rail where the restrained specimen broke loose.',
    ],
    highlight: 'Examination slab left uncleaned since the emergency evacuation.',
  },
  scalpel_prop: {
    id: 'PROP-CH3-SCALPEL',
    kind: 'ambient_note',
    classification: 'SURGICAL TOOL // CHAMBER 3',
    location: 'Bio-Containment Cell (Chamber 3)',
    title: 'Discarded Autopsy Scalpel',
    lines: [
      'No. 11 surgical steel blade abandoned beside the bedside cabinet, tip snapped clean off.',
    ],
    highlight: 'Field debris from the final containment exam.',
  },
  annex_locker: {
    id: 'PROP-5C-LOCKER',
    kind: 'ambient_note',
    classification: 'STORAGE BANK // WING 5C',
    location: 'South-West Corner (Wing 5C)',
    title: 'Rusting Personnel Locker Bank',
    lines: [
      'Twisted sheet-metal lockers belonging to the midnight relay crew.',
      'Someone wrenched the padlocks off from the inside out.',
    ],
    highlight: 'Crew lockers stripped bare before lockdown.',
  },
  aux_generator: {
    id: 'PROP-5F-GENERATOR',
    kind: 'ambient_note',
    classification: 'AUXILIARY POWER // WING 5F',
    location: 'Relay Vault (Wing 5F)',
    title: 'Backup Diesel Turbine Unit',
    lines: [
      'The auxiliary turbine rattles softly on idle governor pressure, feeding dim emergency power to the wing transoms.',
    ],
    highlight: 'Emergency generator running at 14% backup output.',
  },
  ringing_phone: {
    id: 'PROP-5B-PHONE',
    kind: 'ambient_note',
    classification: 'INTERNAL EXTENSION // BAY 5B',
    location: 'East Monitor Desk (Control Bay 5B)',
    title: 'Desk Field Telephone (Ext. 502)',
    lines: [
      'You lift the heavy Bakelite receiver. Only a low 60Hz relay hum and rhythmic static clicks answer on the line.',
    ],
    reportLines: [
      'Teletype Relay Note [R2-05]: Spoofed transmissions borrow Channel 7 voice labels — verify the Base64 X-AUTH header against your Active R2-01 Staff Badge ID.',
    ],
    highlight: 'Line silenced — external trunk circuits remain severed.',
  },
  wall_breaker: {
    id: 'PROP-5B-BREAKER',
    kind: 'ambient_note',
    classification: 'ELECTRICAL PANEL // BAY 5B',
    location: 'North Bulkhead Entry (Control Bay 5B)',
    title: 'Bunker Emergency Lighting Breaker',
    lines: [
      'Heavy bakelite throw switch wired to the overhead bulkhead fixtures across Sector 5.',
    ],
    highlight: 'Breaker state toggled — cycles overhead room lighting across the bunker.',
  },
  crowbar_prop: {
    id: 'PROP-5B-CROWBAR',
    kind: 'ambient_note',
    classification: 'MAINTENANCE TOOL // BAY 5B',
    location: 'Operator Desk Edge (Control Bay 5B)',
    title: 'Pry Bar Used on Control Desk',
    lines: [
      'Scuffed iron pry bar resting beside the staff computer monitor.',
      'Fresh splinters along the desk frame show an operative forced a jammed housing in a hurry.',
    ],
    highlight: 'Utility tool — left behind by the final night operator.',
  },
  sofa_alcove: {
    id: 'PROP-5B-SOFA',
    kind: 'ambient_note',
    classification: 'CREW LOUNGE // BAY 5B',
    location: 'South Wall (Control Bay 5B)',
    title: 'Split Leather Watch Sofa',
    lines: [
      'Collapsed spring sofa where night-shift engineers caught twenty-minute naps between tape reels.',
      'Only copper wire clippings and dust beneath the cushions.',
    ],
    highlight: 'Watch crew break alcove inside Safe Bay 5B.',
  },
  security_camera: {
    id: 'PROP-5A-CAMERA',
    kind: 'ambient_note',
    classification: 'OPTICAL SENSOR // ANTEROOM 5A',
    location: 'East Corridor Alcove (Anteroom 5A)',
    title: 'Ceiling Dome Camera (#CAM-01)',
    lines: [
      'Red tally LED blinks intermittently from the corner bracket, routing analog video back to the monitor wall in Bay 5B.',
    ],
    highlight: 'Linked to the Surveillance Monitor Bank in Bay 5B.',
  },
  wooden_crates: {
    id: 'PROP-5A-CRATES',
    kind: 'ambient_note',
    classification: 'SHIPPING MANIFEST // ANTEROOM 5A',
    location: 'North-East Corner (Anteroom 5A)',
    title: 'Stenciled Surplus Crates',
    lines: [
      'Crates stenciled "SUBSTATION DELTA — MAGNETIC TAPE SPOOLS (DECOMMISSIONED 1983)" stacked beside the outer vault.',
    ],
    highlight: 'Surplus supply pallets stored in Anteroom 5A.',
  },
  caution_pit: {
    id: 'PROP-5A-PIT',
    kind: 'ambient_note',
    classification: 'STRUCTURAL HAZARD // ANTEROOM 5A',
    location: 'Center Crossing (Anteroom 5A)',
    title: 'Planked Cable Inspection Pit',
    lines: [
      'Thick timber planks span a torn floor conduit pit bridging the central corridor.',
    ],
    highlight: 'Temporary walkways crossing exposed Sub-Level 2 conduits.',
  },
};

export default {
  id: 'control',
  title: 'The Surveillance Morgue',
  // Bounds cover Control Bay (5B), Anteroom (5A), Wings (5C/5D/Chamber 3/5E/5F)
  size: [36, 3.2, 46],
  // Spawn centered in open Control Bay floor (clear of sofa, retro TV stack & desks)
  spawn: [0.25, 0.1, 0.25],
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
    void: '#020304',
  },
  audio: {
    static: true,
    relay: true,
    infrasound: true,
    hum: true,
    crt: true,
    every: [10, 24],
    whisperCooldown: 20,
    voices: ['wrongroom', 'watching', 'getaway', 'inthere'],
  },
  interact: {
    // ── Clue entry terminals (defined in content.test.json / content.json clues) ─
    staff_terminal:   { label: 'Access Staff Terminal' },
    radio_console:    { label: 'Examine Radio Console' },
    sound_console:    { label: 'Inspect Sound Console' },

    // ── Evidence fragment hiding spots (6 core interactive_fragment objects) ─
    relay_rack:       { label: 'Search Relay Rack' },
    tape_deck_cart:   { label: 'Search Tape Deck Cart' },
    operator_chair:   { label: 'Search Operator Chair' },
    cable_trench:     { label: 'Search Loop 7-C Cable Trench' },
    wall_clipboard:   { label: 'Search Wall Clipboard' },
    fuse_box:         { label: 'Search Fuse Box' },

    // ── Workstations & Interactive Bunker Fixtures ───────────────────────────
    monitor_bank:         { label: 'View Surveillance Monitor Bank' },
    dead_intercom:        { label: 'Check Wall Intercom' },
    wall_breaker:         { label: 'Toggle Lighting Breaker' },
    ringing_phone:        { label: 'Answer Field Telephone' },
    annex_incident_file:  { label: 'Read Watchdesk Folder' },
    guard_watch_ledger:   { label: 'Read Security Watch Ledger' },
    containment_protocol: { label: 'Read Standing Orders' },
    chamber3_autopsy:     { label: 'Read Specimen Clipboard' },
    containment_key:      { label: 'Inspect Maintenance Keyring' },
    autopsy_gurney:       { label: 'Inspect Cryo Gurney' },
    scalpel_prop:         { label: 'Inspect Autopsy Scalpel' },
    annex_locker:         { label: 'Inspect Locker Bank' },
    aux_generator:        { label: 'Inspect Diesel Generator' },
    crowbar_prop:         { label: 'Inspect Desk Pry Bar' },
    sofa_alcove:          { label: 'Check Watch Sofa' },
    security_camera:      { label: 'Inspect Surveillance Camera' },
    wooden_crates:        { label: 'Inspect Surplus Crates' },
    caution_pit:          { label: 'Inspect Planked Floor Pit' },

    // ── Navigation ────────────────────────────────────────────────────────────
    vault_door:       { label: 'Main Vault Exit — Sealed' },
  },
  boxes: [],
};

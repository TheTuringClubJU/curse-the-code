// Local Room 5 Simulation State — activates only when backend returns 401/offline
// during standalone 3D preview (?room=5). Keeps every prop, basket item, death-drop, and puzzle interactive.

export const SAFE_ROOM_5B_BOUNDS = { minX: -3.45, maxX: 3.45, maxZ: 1.85 };
export const SAFE_ROOM_RESPAWN = [0.25, 0.1, 0.25];

export function isInsideSafeRoom5B(x, z) {
  return x >= SAFE_ROOM_5B_BOUNDS.minX && x <= SAFE_ROOM_5B_BOUNDS.maxX && z <= SAFE_ROOM_5B_BOUNDS.maxZ;
}

export const ROOM5_EVIDENCE_RICH_META = {
  EC01: {
    classification: 'CONFIDENTIAL // SIGNAL INTERCEPT',
    location: 'Room 5F · Generator & Relay Vault — Top Relay Panel',
    reportLines: [
      'Automated carrier burst logged at 23:41 hrs on 14 AUG 1983 — forty-one minutes after the facility curfew and power-down order took effect.',
      'Originating transceiver patched through Delta Relay Bank #7 directly to an unregistered repeater beyond outer perimeter fencing.',
      'Night log note attached: "A nocturnal operator refused dormancy past curfew — cross-check who kept logging in past the eleventh hour."',
    ],
    highlight: 'Riddle I: Eleven strokes seal the ledger on the fourteenth night; only the living shadow defies termination.',
  },
  EC02: {
    classification: 'PRIORITY // REQUISITION ARCHIVE',
    location: 'Room 5F · Generator & Relay Vault — Lower Cable Bundle',
    reportLines: [
      'Form EQR-83-220 countersigned on 20 SEP 1983 — five weeks after Substation Delta was officially sealed and abandoned.',
      'Authorized draw of two long-range encrypted UHF repeaters charged to the dormant research sub-basement under signatory CORVIN, M.',
      'Accounting stamp shows badge serial digits smudged by moisture — compare signatory surname against the full Personnel Registry.',
    ],
    highlight: 'The raven\'s kin signed five weeks after closure; match the surname to an unbroken active record.',
  },
  EC03: {
    classification: 'TECHNICAL ANOMALY // CRT BANK',
    location: 'Room 5C · Security Locker Wing — Akai Tape Deck Cart',
    reportLines: [
      'Maintenance ticket MNT-83-311 filed 07 NOV 1983 after midnight technician discovered CRT-04 and CRT-06 locked on continuous playback.',
      'Signal traces back to buried conduit Loop 7-C inside Chamber 3 Observation Shaft.',
      'Supervisor annotation scrawled in red ink across bottom margin: "DO NOT SEVER FEED — ONLY ONE X-AUTH HEADER CARRIES TRUE CLEARANCE."',
    ],
    highlight: 'Two voicemail directives clash on the teletype spool; decode every encoded header against the living badge first.',
  },
  EC04: {
    classification: 'OPERATOR LOG // RESTRICTED',
    location: 'Room 5C · Security Locker Wing — Reel Spool Case',
    reportLines: [
      'Recovered folded inside an empty Scotch magnetic reel box beneath the portable Akai recorder.',
      'Handwritten in trembling ballpoint pen during the last manned grave shift:',
      '"Monitor 6 keeps cutting behind my chair. Watch the CCTV cameras before stepping through an unlit doorway — only Control 5B steel holds it back."',
    ],
    highlight: 'Surveillance Monitor Bank (5B) tracks live wing intrusions and stores IR camera logs missed by paper records.',
  },
  EC05: {
    classification: 'INTERCEPT // 7.455 MHz',
    location: 'Room 5B · Main Control Bay — Operator Chair Cushion',
    reportLines: [
      'Teletype hardcopy torn from rotary printer beside the West IBM terminal desk.',
      'Intercepted automated burst reads: "ECHO ZERO AUTHORISED. LOW BANDS BREATHE STATIC; MID BANDS WEEP DECOYS. ONLY THE HIGHEST REGISTER BEYOND THE SECOND THIRD CARRIES TRUE PULSE."',
      'Waveform calibration sheet appended: "Four carrier bursts encode digits via 8-4-2-1 binary weights and ITU telemetry ticks."',
    ],
    highlight: 'Riddle III: Abandon low whispers and hollow middles — seek the high crest past two-thirds of the tape spool.',
  },
  EC06: {
    classification: 'BLUEPRINT FRAGMENT // LOOP 7-C',
    location: 'Room 5D · Observation Corridor — Exposed Floor Conduit',
    reportLines: [
      'Laminated electrical schematic pulled directly from the exposed conduit linking Wing 5D into Chamber 3.',
      'Shows secondary auxiliary feeder bypassing main breaker cutoff straight into Chamber 3 containment observation shaft.',
      'Marginalia note: "Twin voicemail reels both harbor ultrasonic ghosts on the high band — trust only the reel sworn authentic by Base64 clearance."',
    ],
    highlight: 'Do not mistake the secondary archive harmonic for the true key; verify the source channel before trusting any quartet.',
  },
  EC07: {
    classification: 'NIGHT SHIFT ORDER // 14 AUG 1983',
    location: 'Room 5B · North-West Wall Pinboard',
    reportLines: [
      'Penciled shift directive torn from the corkboard clipboard beside the inner bulkhead.',
      'Order reads: "Curfew bell strikes 23:00 on 14 AUG. Dr C has authorised full log blackout; terminate all routine passes thereafter."',
      'Footnote adds: "Former systems test accounts were decommissioned prior to blackout; ignore pre-curfew test pings and dead accounts."',
    ],
    highlight: 'Curfew threshold: 1983-08-14 23:00. Pre-curfew test logins and Terminated ghosts are red herrings.',
  },
  EC08: {
    classification: 'ELECTRICAL OVERRIDE // FUSES 4, 7, 9',
    location: 'Room 5B · Wall Fuse Panel',
    reportLines: [
      'Grease-stained slip stuffed inside high-voltage fuse cabinet door above the surveillance monitors.',
      '"DO NOT PULL FUSES 4, 7, OR 9. Chamber 3 telemetry arrays draw standby power continuously. Approved — M.C."',
      'Notes stamped on back: "Teletype archive rolls longest at the tail — unspool all six headers to compare forged relays against true credentials."',
    ],
    highlight: 'Examine every X-Auth Base64 seal from start to finish on the Radio Transceiver reel in Wing 5C.',
  },
  XC01: {
    classification: 'DECOY // WELFARE ARCHIVE',
    location: 'Room 5B · Operator Chair',
    reportLines: [
      'Yellowed canteen weekly rotation menu for Sector 5 sub-basement staff (August 1983).',
      'Contains no cipher data or security overrides — keep filed for completeness.',
    ],
    highlight: 'Non-critical facility ephemera (Decoy Item).',
  },
  XC02: {
    classification: 'DECOY // CLERICAL SHEET',
    location: 'Room 5B · North-West Wall Pinboard',
    reportLines: [
      'Top blank cover sheet shielding handover notes pinned to the wall board.',
      'Only routine maintenance contractor initials appear.',
    ],
    highlight: 'Non-critical facility ephemera (Decoy Item).',
  },
};

export const ROOM5_WORLD_DOCUMENTS = {
  annex_incident_file: {
    id: 'FILE-17B',
    title: 'INCIDENT 17-B // CHAMBER 3 CONTAINMENT FILE',
    corner_mark: 'CLASSIFIED // ARCHIVO 17-B',
    lines: [
      'SUBSTATION DELTA — INTERNAL INVESTIGATION FILE 17-B',
      'Subject: Unauthorized Post-Closure Activity & Observation Breach (Sector 5D)',
      'On 21 AUG 1983, automated security cameras in Wing 5D recorded sustained bioluminescent thermal silhouettes pacing behind Chamber 3 observation glass seven days after evacuation.',
      'Guard Shift Report notes steel locker doors in Room 5C shuddered whenever high-band ultrasonic telemetry locked in past two-thirds displacement on the true channel.',
      'INVESTIGATOR NOTE: Use Control Bay CCTV feeds (5B) to verify wing occupancy before venturing down the observation hall.',
    ],
    highlight: 'Control Room 5B remains sealed against the entity; retreating behind its bulkhead spares your evidence.',
  },
  guard_watch_ledger: {
    id: 'FILE-GW-09',
    title: 'SECURITY WATCH LEDGER — POST 5C/5D',
    corner_mark: 'WATCH LOG // AUG 1983',
    lines: [
      'FINAL NIGHT WATCH ENTRY — GUARD H. VANCE (BADGE BDG-4410):',
      '22:45 — Locked heavy steel door between Control Anteroom and Locker Annex. Left relay rack energized per standing memo.',
      '23:30 — Heard slow dragging steps pacing along Chamber 3 Glass Corridor (Wing 5D). Looked through stained pane: pale gaunt figure crouching behind observation window.',
      '23:52 — Dropped Cryo Wing access note near north gurney crates and bolted back behind Control 5B steel door. The raven doctor can keep the dark.',
    ],
    highlight: 'Every document you read is pinned onto your Evidence Board ([B]) — sort real leads from dead noise.',
  },
  containment_protocol: {
    id: 'FILE-ECP-03',
    title: 'EMERGENCY PROTOCOL // ECHO ZERO',
    corner_mark: 'ECP-83-003 // DELTA',
    lines: [
      'PROTOCOL ECHO ZERO — DELTA CONTROL DECONTAMINATION:',
      'I. Recover the eight cipher-sealed slips scattered across 5B, 5C, 5D, and Relay Vault 5F.',
      'II. First Riddle: Seek the active scholar of the raven whose badge survived the eleventh-hour curfew of August fourteenth.',
      'III. Second Riddle: Unspool all teletype transmissions and decode their Base64 seals against that living credential — beware forged mirrors.',
      'IV. Third Riddle: On the proven voice reel, sweep above the middle static past two-thirds travel until four BCD/Morse frames lock.',
    ],
    highlight: 'Use Copy / Download inside [B] to feed your assembled evidence + CCTV IR notes into any analysis tool.',
  },
  chamber3_autopsy: {
    id: 'FILE-MED-011',
    title: 'OBSERVATION BAY // SPECIMEN REPORT S-011',
    corner_mark: 'MED-83-011 // SENSITIVE',
    lines: [
      'MEDICAL & NEURAL MONITORING SUMMARY — CHAMBER 3',
      'Persistent autonomous ambulation documented after life-support disconnect. Subject stalks darkened corridors and strips one carried record upon physical contact.',
      'WARNING FOR CONTROL OPERATORS: Control Room 5B heavy bulkhead prevents entity intrusion — all outer corridors (5A, 5C, 5D, 5E, 5F, Chamber 3) remain vulnerable.',
      'Inspect Loop 7-C Floor Conduit outside the Chamber 3 threshold before returning to the Observation Sound Console.',
    ],
    highlight: 'If Specimen S-011 catches you outside 5B, retrace your steps to recover the dropped record at the catch site.',
  },
  containment_key: {
    id: 'KEY-CH3',
    title: 'BRASS CONTAINMENT KEY (CHAMBER 3)',
    corner_mark: 'SECURITY KEY // 5E -> CH3',
    lines: [
      'HEAVY BRASS DEADBOLT KEY — TAGGED "CHAMBER 3 BIO-CONTAINMENT"',
      'Found beside a cold surgical tray in the Cryo Overflow Wing (Room 5E).',
      'Matches the deadbolt cylinder on the crimson Chamber 3 Containment Door at the West end of Observation Hall (5D).',
    ],
    highlight: 'Chamber 3 Containment Door can now be unlocked — expect immediate aggressive pursuit nearby.',
  },
  scalpel_prop: {
    id: 'EVIDENCE-SCALPEL',
    title: 'STAINED SURGICAL SCALPEL (#4)',
    corner_mark: 'AUTOPSY INSTRUMENT',
    lines: [
      'An oxidized #4 surgical scalpel lying atop the bedside stand inside Chamber 3.',
      'Dried crimson streaks run halfway up the grip. Restraint straps around Bay 5 show inward slash marks.',
    ],
    highlight: 'Sprint noise draws the stalker faster — retreat into Control 5B if your flashlight sputters.',
  },
  autopsy_gurney: {
    id: 'LOG-GURNEY-5',
    title: 'EXAMINATION GURNEY // BAY 5',
    corner_mark: 'MEDICAL LOG',
    lines: [
      'Deep parallel claw gouges tear across the canvas mattress straps.',
      'Under the torn sheet, an ID tag fragment reads: "SPECIMEN S-011 — SENSOR LOOP 7-C CALIBRATION CHECK".',
    ],
    highlight: 'Check Observation Wing 5D & Relay Vault 5F conduits for missing instrumentation notes.',
  },
  ringing_phone: {
    id: 'CALL-04',
    title: 'INTERNAL EXTENSION #04 (DEAD LINE)',
    corner_mark: 'VOICE INTERCEPT',
    lines: [
      '[RECEIVER AUDIO — WET RASPING BREATH THROUGH STATIC]',
      '"...shut the heavy bulkhead behind you when it hunts... steel 5B is the only door it cannot cross..."',
      '"...watch the six eyes on your monitor bank before stepping into dark wings... three consoles wait across 5B, 5C, and 5D..."',
    ],
    highlight: 'Control Room 5B is your sanctuary. Open CCTV Monitor Bank ([E]) before exploring outer corridors.',
  },
  aux_generator: {
    id: 'GEN-5F',
    title: 'AUXILIARY GENERATOR & RELAY VAULT (5F)',
    corner_mark: 'SECTOR 5F POWER',
    lines: [
      'A diesel transfer relay bank feeding the North Observation Wing.',
      'The magnetic bypass switches still hum — inspect the nearby Steel Relay Cabinet to recover missing Substation Delta transmission sheets.',
    ],
    highlight: 'Relay cabinet in Sector 5F houses early closure logs needed before decoding Personnel Index.',
  },
};

export const ROOM5_ENV_DOCUMENTS = {
  crowbar_prop: {
    id: 'ENV-CROWBAR',
    title: 'IRON PRYBAR — WORKBENCH NOTE',
    corner_mark: 'PROP // 5B-CB',
    classification: 'PHYSICAL TRACE // CONTROL BAY 5B',
    location: 'Room 5B · Adjacent West Terminal Bench',
    lines: [
      'Forged octagonal iron prybar resting beside the active Personnel Index workstation.',
      'Chisel bevel carries fresh concrete dust and dark grease smears.',
      'Groove width (22mm) matches forced pry marks along the collapsed floor pit grating in Wing 5A.',
    ],
    reportLines: [
      'Whoever sealed Entry Airlock 5A did not exit outward — they attempted to lever the maintenance grate directly into the lower shaft.',
      'Check the Nearby Control 5B IBM terminal and Pinboard once all 8 core records are recovered.',
    ],
    highlight: 'Safe Haven Reminder: Control Room 5B heavy bulkhead keeps the outer corridor stalker outside.',
  },
  sofa_alcove: {
    id: 'ENV-VENT',
    title: 'WELDED FLOOR VENT HATCH',
    corner_mark: 'PROP // 5B-VT',
    classification: 'STRUCTURAL BREACH LOG // 5B',
    location: 'Room 5B · South Alcove Behind Vinyl Couch',
    lines: [
      'A heavy torn vinyl sofa shoved askew across an industrial maintenance scuttle hatch.',
      'Steel louver blades were torched shut from top-side, yet mounting bolts show upward impact bulging from beneath.',
      'Stale cold updrafts smell faintly of formalin and old magnetic iron oxide.',
    ],
    reportLines: [
      'Sub-floor service ducts link Wing 5D Containment directly beneath Control Bay 5B, which is why operators welded the floor plates shut before evacuating.',
      'Only the reinforced North steel bulkhead prevents physical intrusion into 5B.',
    ],
    highlight: 'If pursuit begins in outer wings (5C/5D/5E/5F), retreat inside Control 5B steel walls to break chase.',
  },
  security_camera: {
    id: 'ENV-CAM04',
    title: 'CORRIDOR DOME CAMERA // CAM-04 HARDWARE',
    corner_mark: 'PROP // 5A-CM',
    classification: 'SURVEILLANCE HARDWARE // OPTIC',
    location: 'Room 5A · High Entry Corridor Bulkhead',
    lines: [
      'Armoured ceiling pan-tilt dome housing aimed toward the Vault Door alcove.',
      'Power coaxial jacket was cleanly severed in 1983, yet the stepper motor clicks rhythmically toward approaching footsteps.',
      'Stencil stamped on gimbal collar: "FEED ROUTED TO MONITOR BANK B-02 — IR TRACE ACTIVE".',
    ],
    reportLines: [
      'CCTV Monitor Bank inside Safe Room 5B pulls live thermal/IR packets across all six bunker wings.',
      'Inspect all six channels (CAM-01 to CAM-06) with IR Trace toggled ON to reveal corridor & cipher rules.',
    ],
    highlight: 'Monitor Bank in Control 5B tracks live entity movement across wings 5A–5F and stores IR forensic hints.',
  },
  wooden_crates: {
    id: 'ENV-CRATES',
    title: 'SUPPLY CRATES (1983) // PROJECT HOLLOW',
    corner_mark: 'PROP // 5A-SC',
    classification: 'QUARTERMASTER INVENTORY // SECTOR 5',
    location: 'Room 5A · East Entry Corridor Stack',
    lines: [
      'MIL-STD pine crates stenciled "PROJECT HOLLOW — SECTOR 5 // ACOUSTIC & RADIO RELAY STORES".',
      'Pried lid reveals empty Scotch 1/4-inch magnetic tape canisters, shredded teletype ribbons, and requisition carbon slips.',
      'Shipping tag stub notes split consignment: "CRT units -> Control 5B; Akai transport -> Wing 5C; spare repeaters -> Vault 5F".',
    ],
    reportLines: [
      'The missing high-frequency repeaters were drawn weeks after official bunker shutdown — check Relay Vault 5F and the Akai cart in Wing 5C.',
      'Combined records across Sector 5 reveal why one post-curfew operator kept Sector 5 live.',
    ],
    highlight: 'Freight manifest points to Locker Wing 5C (Akai cart / Radio Console) and Vault 5F (Relay Rack).',
  },
  caution_pit: {
    id: 'ENV-PIT',
    title: 'COLLAPSED FLOOR GRATING // SHAFT PIT',
    corner_mark: 'PROP // 5A-PT',
    classification: 'HAZARD SURVEY // SUB-LEVEL 3',
    location: 'Room 5A · Central Airlock Corridor',
    lines: [
      'Corroded iron grate bridged haphazardly by split pine planks over an open vertical shaft.',
      'Below the walkway, shielded telemetry cables run straight from Vault 5F toward Observation Chamber 3.',
      'Spray-painted stencil beside hazard cone reads: "BIO-ISOLATION SHAFT BELOW — DO NOT DROP HARDWARE".',
    ],
    reportLines: [
      'Keep to the solid tile edges when fleeing back toward Control Room 5B during a hunt.',
      'Observation Wing (5D) conduits carry active Chamber 3 Loop 7-C ultrasonic telemetry.',
    ],
    highlight: 'Floor conduit cables lead west into Observation Wing 5D — inspect both conduit and Sound Console there.',
  },
  annex_locker: {
    id: 'ENV-LOCKER',
    title: 'FORCED STEEL LOCKER #04 // ANNEX 5C',
    corner_mark: 'PROP // 5C-LK',
    classification: 'PERSONNEL LOCKER LOG // WING 5C',
    location: 'Room 5C · West Steel Locker Bank',
    lines: [
      'Rusted locker door forced outward; heavy oilcloth lab coat spilled across floor tiles.',
      'Sewn laundry ID tag inside collar reads: "RESEARCH DIV — SUB-LVL 5 — CURFEW EXEMPT (CHECK AFTER 23:00)".',
      'Faded chalk tally scratched inside locker panel: "SIX HEADERS — DECODE BASE64 B64 FROM FIRST LINE TO TAIL".',
    ],
    reportLines: [
      'Supports Transmission Archive audit: forged relays falsify headers, whereas true transmissions embed Base64 X-Auth credentials matching the active night scholar.',
    ],
    highlight: 'Inspect Field Radio Console (Wing 5C) and compare every Base64 X-Auth header against post-curfew Personnel logs.',
  },
  dead_intercom: {
    id: 'ENV-INTERCOM',
    title: 'WALL INTERCOM STATION // STATIC TRACE',
    corner_mark: 'PROP // 5B-IC',
    classification: 'COMMS LINE TRACE // CONTROL 5B',
    location: 'Room 5B · Inner North Bulkhead Wall',
    lines: [
      'Brushed aluminum intercom handset permanently hot with 60Hz hum and intermittent acoustic click bursts.',
      'Line selector switch frozen on "CH-3 OBSERVATION".',
      'Engraved plate beneath speaker reads: "EMERGENCY AUDIO BRIDGE — CALIBRATION TEST ABOVE MID CEILING".',
    ],
    reportLines: [
      'Intercom cross-talk picks up residual Chamber 3 transducer clicks when Specimen S-011 approaches Observation Hallway 5D.',
    ],
    highlight: 'Audio analyser calibration requires sweeping high-frequency bands above the ambient mid-band noise floor.',
  },
  wall_breaker: {
    id: 'ENV-BREAKER',
    title: 'EMERGENCY BREAKER PANEL // FUSES 4, 7, 9',
    corner_mark: 'PROP // 5B-BR',
    classification: 'ELECTRICAL DISTRIBUTION // DELTA 5B',
    location: 'Room 5B · North-East Steel Wall Box',
    lines: [
      'Main Sector 5 auxiliary lighting breaker panel adjacent to Control Door.',
      'Branches 4, 7, and 9 are wired under locked bypass clips labeled "CHAMBER 3 / CRT / SPECTROGRAM — KEEP ENERGIZED".',
      'Cutting room lights lowers flicker glare on CRT monitors, while handheld flashlight remains unaffected.',
    ],
    reportLines: [
      'Keep emergency power alive for the three verification terminals across Control 5B, Locker Annex 5C, and Observation 5D.',
    ],
    highlight: 'Verify fuse bypass notes in Control Bay 5B; Chamber 3 circuits remain continuously energized.',
  },
};

const EVIDENCE_ITEMS = [
  {
    id: 'EC01',
    clue_id: 'R2-01',
    part: 'A',
    is_decoy: false,
    object_id: 'relay_rack',
    display: {
      title: 'Transmission Log Fragment',
      corner_mark: 'TXL-83-114',
      image_file: '/evidence/evidence_ec01.svg',
      lines: [
        'TRANSMISSION LOG — CHANNEL 7',
        '14 AUG 1983 — 23:41',
        'FROM: DELTA CONTROL',
        'TO: EXTERNAL — UNREGISTERED',
      ],
    },
    secret: { note: 'Outbound transmission sent the night of official shutdown — to an unknown recipient.' },
  },
  {
    id: 'EC02',
    clue_id: 'R2-01',
    part: 'B',
    is_decoy: false,
    object_id: 'relay_rack',
    display: {
      title: 'Equipment Requisition',
      corner_mark: 'EQR-83-220',
      image_file: '/evidence/evidence_ec02.svg',
      lines: [
        'EQUIPMENT REQUISITION SLIP',
        'Item: Long-range radio repeater x2',
        'Requested by: CORVIN, M.',
        'Date: 20 SEP 1983 (5 weeks post-closure)',
      ],
    },
    secret: { note: 'Corvin requisitioned active communications gear five weeks after facility closure.' },
  },
  {
    id: 'EC03',
    clue_id: 'R2-05',
    part: 'A',
    is_decoy: false,
    object_id: 'tape_deck_cart',
    display: {
      title: 'CRT Maintenance Report',
      corner_mark: 'MNT-83-311',
      image_file: '/evidence/evidence_ec03.svg',
      lines: [
        'MAINTENANCE REPORT — CRT BANK',
        'Date: 07 NOV 1983',
        'Fault: Continuous loop feed from Chamber 3',
        'Action taken: NONE — do not disconnect',
      ],
    },
    secret: { note: 'Chamber 3 video feed kept running continuously after shutdown — by standing order.' },
  },
  {
    id: 'EC04',
    clue_id: 'R2-05',
    part: 'B',
    is_decoy: false,
    object_id: 'tape_deck_cart',
    display: {
      title: 'Handwritten Incident Note',
      corner_mark: 'NOTE-04',
      image_file: '/evidence/evidence_ec04.svg',
      lines: [
        'Handwritten note, undated:',
        '"Monitor 6 is showing again."',
        '"Same corridor. Same figure."',
        '"I\'m not logging this."',
      ],
    },
    secret: { note: 'Unnamed operator witnessed a recurring figure on Monitor 6 and refused to log it.' },
  },
  {
    id: 'EC05',
    clue_id: 'R2-06',
    part: 'A',
    is_decoy: false,
    object_id: 'operator_chair',
    display: {
      title: 'Radio Intercept Printout',
      corner_mark: 'RIC-83-001',
      image_file: '/evidence/evidence_ec05.svg',
      lines: [
        'RADIO INTERCEPT — AUTOMATED',
        'Freq: 7.455 MHz',
        'Content: "Echo Zero authorised. Do not enter."',
        'Received: 14 AUG 1983 — 23:58',
      ],
    },
    secret: { note: 'Echo Zero emergency override referenced in an intercepted post-shutdown burst.' },
  },
  {
    id: 'EC06',
    clue_id: 'R2-06',
    part: 'B',
    is_decoy: false,
    object_id: 'cable_trench',
    display: {
      title: 'Wiring Schematic Annotation',
      corner_mark: 'SCH-83-7C',
      image_file: '/evidence/evidence_ec06.svg',
      lines: [
        '[SCHEMATIC ANNOTATION]',
        'Loop 7-C: DO NOT CUT',
        'Connected to: Chamber 3 biometric feed',
        'Warning: severing triggers containment alarm',
      ],
    },
    secret: { note: 'Chamber 3 biometric feed remains wired live beneath the console floor.' },
  },
  {
    id: 'EC07',
    clue_id: 'R2-01',
    part: 'C',
    is_decoy: false,
    object_id: 'wall_clipboard',
    display: {
      title: 'Night Shift Handover Note',
      corner_mark: 'LOG-83-14',
      image_file: '/evidence/evidence_ec07.svg',
      lines: [
        'Shift handover — Night, 14 AUG 1983',
        '"Do not acknowledge the signal from Delta."',
        '"Dr C has authorised blackout."',
        '"Log nothing after 23:00."',
      ],
    },
    secret: { note: 'Operator ordered to suppress all logs after 23:00 on the night of closure.' },
  },
  {
    id: 'EC08',
    clue_id: 'R2-05',
    part: 'C',
    is_decoy: false,
    object_id: 'fuse_box',
    display: {
      title: 'Fuse Box Override Note',
      corner_mark: 'OVR-MC-479',
      image_file: '/evidence/evidence_ec08.svg',
      lines: [
        'DO NOT RESTORE FUSES 4, 7, 9',
        'These feed Chamber 3.',
        'They are supposed to be on.',
        '— M.C.',
      ],
    },
    secret: { note: 'Corvin\'s initials — fuses feeding Chamber 3 kept live deliberately.' },
  },
  {
    id: 'XC01',
    clue_id: null,
    part: 'Decoy',
    is_decoy: true,
    object_id: 'operator_chair',
    display: {
      title: 'Decoy — Canteen Menu',
      corner_mark: 'DCY-C01',
      image_file: '/evidence/evidence_xc01.svg',
      lines: ['Standard Sector 5 canteen menu.', 'No operational relevance.'],
    },
    secret: { note: 'Decoy paper slipped between chair cushions.' },
  },
  {
    id: 'XC02',
    clue_id: null,
    part: 'Decoy',
    is_decoy: true,
    object_id: 'wall_clipboard',
    display: {
      title: 'Decoy — Blank Sign-In Sheet',
      corner_mark: 'DCY-C02',
      image_file: '/evidence/evidence_xc02.svg',
      lines: ['Routine sign-in sheet, all entries standard.', 'Nothing unusual.'],
    },
    secret: { note: 'Top sheet masking the real handover note underneath.' },
  },
];

export const ROOM5_CORE_EVIDENCE_MAP = Object.fromEntries(EVIDENCE_ITEMS.map((ev) => [ev.id, ev]));

const ALL_WORLD_AND_ENV_BY_ID = Object.fromEntries(
  [...Object.values(ROOM5_WORLD_DOCUMENTS), ...Object.values(ROOM5_ENV_DOCUMENTS)].map((d) => [d.id, d])
);

export function enrichRoom5EvidenceItem(ev) {
  if (!ev || !ev.id) return ev;
  const id = ev.id;
  const fallbackCore = ROOM5_CORE_EVIDENCE_MAP[id] || null;
  const rich = ROOM5_EVIDENCE_RICH_META[id] || null;
  const worldMeta = ALL_WORLD_AND_ENV_BY_ID[id] || null;

  const isRoom5Id = Boolean(fallbackCore || rich || worldMeta || ev.kind === 'world_doc' || id.startsWith('EC') || id.startsWith('XC'));
  if (!isRoom5Id) return ev;

  const rawTitle = ev.display?.title || ev.title || '';
  const cleanRawTitle = rawTitle.replace(/^TEST:\s*/i, '').trim();
  const isMaskedTitle = !cleanRawTitle || /^Wrapped Fragment/i.test(cleanRawTitle);
  const title = isMaskedTitle
    ? (fallbackCore?.display?.title || worldMeta?.title || id)
    : cleanRawTitle;

  const incomingLines = Array.isArray(ev.display?.lines)
    ? ev.display.lines.map((l) => String(l).replace(/^TEST:\s*/i, '').trim()).filter(Boolean)
    : Array.isArray(ev.lines)
    ? ev.lines.map((l) => String(l).replace(/^TEST:\s*/i, '').trim()).filter(Boolean)
    : [];
  const lines = incomingLines.length > 0
    ? incomingLines
    : (fallbackCore?.display?.lines || worldMeta?.lines || (ev.body ? [ev.body] : []));

  const reportLines = Array.isArray(ev.reportLines) && ev.reportLines.length > 0
    ? ev.reportLines
    : (rich?.reportLines || worldMeta?.reportLines || []);

  const classification = ev.classification || rich?.classification || worldMeta?.classification || (ev.kind === 'world_doc' ? 'FIELD DOCUMENT // WORLD ARCHIVE' : 'SUBSTATION DELTA RECORD');
  const location = ev.location || rich?.location || worldMeta?.location || '';
  const cornerMark = ev.display?.corner_mark || ev.corner_mark || fallbackCore?.display?.corner_mark || worldMeta?.corner_mark || id;
  const highlight = ev.highlight || rich?.highlight || ev.secret?.note?.replace(/^TEST:\s*/i, '') || fallbackCore?.secret?.note || worldMeta?.highlight || '';
  const events = Array.isArray(ev.events) ? ev.events : (Array.isArray(worldMeta?.events) ? worldMeta.events : undefined);

  return {
    ...ev,
    clue_id: ev.clue_id ?? fallbackCore?.clue_id ?? null,
    part: ev.part || fallbackCore?.part || (worldMeta ? 'Field Note' : 'Record'),
    is_wrapped: false,
    classification,
    location,
    reportLines,
    highlight,
    ...(events ? { events } : {}),
    display: {
      ...(ev.display || {}),
      title,
      corner_mark: cornerMark,
      image_file: ev.display?.image_file || fallbackCore?.display?.image_file || worldMeta?.image_file || '',
      lines,
    },
    secret: highlight ? { ...(ev.secret || {}), note: highlight } : ev.secret,
  };
}

const CLUE_ANSWERS = {
  'R2-01': 'BDG-9001',
  'R2-05': 'VM-A',
  'R2-06': '8140',
};

export function createSimulationRoom5() {
  const collected = new Set();
  const solvedClues = new Set();
  const discoveredDocs = new Map();
  const droppedItems = new Map(); // dropId -> { id, fragmentId, x, z, evidence }
  const attempts = { 'R2-01': 3, 'R2-05': 3, 'R2-06': 3 };
  // Require finding all 8 cross-room fragments before consoles unlock (or explicit preview bypass if needed)
  let previewUnlocked = false;

  const getNonDecoyCount = () =>
    EVIDENCE_ITEMS.filter((ev) => !ev.is_decoy && collected.has(ev.id)).length;

  const buildState = () => {
    const nonDecoyCount = getNonDecoyCount();
    const basketUnlocked = previewUnlocked || nonDecoyCount >= 8;
    const isCompleted = solvedClues.has('R2-01') && solvedClues.has('R2-05') && solvedClues.has('R2-06');
    const coreEvidence = EVIDENCE_ITEMS.filter((ev) => collected.has(ev.id)).map((ev) => ({
      id: ev.id,
      clue_id: ev.clue_id,
      part: ev.part,
      is_wrapped: false,
      kind: ev.is_decoy ? 'decoy' : 'core_evidence',
      display: ev.display,
      secret: ev.secret,
    }));
    const worldEntries = Array.from(discoveredDocs.values());

    return {
      ok: true,
      simulation: true,
      room_id: 'control',
      title: 'The Surveillance Morgue',
      total_fragments_in_room: 8,
      collected_fragment_ids: Array.from(collected),
      basket_unlocked: basketUnlocked,
      is_completed: isCompleted,
      evidence: [...coreEvidence, ...worldEntries],
      dropped_items: Array.from(droppedItems.values()),
      clues: [
        {
          id: 'R2-01',
          object_id: 'staff_terminal',
          title: 'Personnel Index',
          scene_text: 'Retro IBM workstation in Control Room 5B. Cross-reference staff clearance against blackout logs.',
          solved: solvedClues.has('R2-01'),
          exhausted: attempts['R2-01'] <= 0,
          attempts: 3 - attempts['R2-01'],
          attempts_max: 3,
          attempts_remaining: attempts['R2-01'],
        },
        {
          id: 'R2-05',
          object_id: 'radio_console',
          title: 'Transmission Archive',
          scene_text: 'Field Radio Transceiver Console in North Locker Wing (5C). Decode encoded X-Auth headers.',
          solved: solvedClues.has('R2-05'),
          exhausted: attempts['R2-05'] <= 0,
          attempts: 3 - attempts['R2-05'],
          attempts_max: 3,
          attempts_remaining: attempts['R2-05'],
        },
        {
          id: 'R2-06',
          object_id: 'sound_console',
          title: 'Spectrogram Analyser',
          scene_text: 'Acoustic Oscilloscope Console in Observation Wing (5D). Sweep high bands of the verified channel.',
          solved: solvedClues.has('R2-06'),
          exhausted: attempts['R2-06'] <= 0,
          attempts: 3 - attempts['R2-06'],
          attempts_max: 3,
          attempts_remaining: attempts['R2-06'],
        },
      ],
    };
  };

  return {
    getState: buildState,
    unlockConsolesPreview() {
      previewUnlocked = true;
      return buildState();
    },
    recordWorldDocument(doc) {
      if (!doc || !doc.id) return buildState();
      const base = {
        id: doc.id,
        clue_id: null,
        part: 'Field Note',
        is_wrapped: false,
        kind: 'world_doc',
        classification: doc.classification,
        location: doc.location,
        reportLines: doc.reportLines,
        events: doc.events,
        highlight: doc.highlight,
        display: {
          title: doc.title || doc.id,
          corner_mark: doc.corner_mark || doc.id,
          lines: Array.isArray(doc.lines) ? doc.lines : (doc.body ? [doc.body] : []),
        },
        secret: doc.highlight ? { note: doc.highlight } : undefined,
      };
      discoveredDocs.set(doc.id, enrichRoom5EvidenceItem(base));
      return buildState();
    },
    handlePlayerDeath(deathX, deathZ) {
      // Prefer dropping the most recently collected core EC01..EC08 evidence item; otherwise any item
      const collectedList = Array.from(collected);
      const ecList = collectedList.filter((id) => id.startsWith('EC'));
      const dropCandidateId = ecList.length > 0 ? ecList[ecList.length - 1] : (collectedList[collectedList.length - 1] || null);
      if (!dropCandidateId) {
        return {
          spawn: SAFE_ROOM_RESPAWN,
          droppedItem: null,
          state: buildState(),
        };
      }
      collected.delete(dropCandidateId);
      const ev = EVIDENCE_ITEMS.find((item) => item.id === dropCandidateId) || null;
      const dropId = `dropped_${dropCandidateId}`;
      const droppedRecord = {
        id: dropId,
        fragmentId: dropCandidateId,
        x: Number(deathX ?? 0),
        z: Number(deathZ ?? 6.5),
        evidence: ev,
      };
      droppedItems.set(dropId, droppedRecord);
      return {
        spawn: SAFE_ROOM_RESPAWN,
        droppedItem: droppedRecord,
        state: buildState(),
      };
    },
    recoverDroppedItem(dropId) {
      const entry = droppedItems.get(dropId);
      if (!entry) return { found: false, state: buildState() };
      droppedItems.delete(dropId);
      collected.add(entry.fragmentId);
      return {
        found: true,
        fragmentId: entry.fragmentId,
        evidence: entry.evidence,
        state: buildState(),
      };
    },
    searchProp(objectId) {
      const candidates = EVIDENCE_ITEMS.filter((ev) => ev.object_id === objectId && !collected.has(ev.id));
      if (!candidates.length) {
        const hadAny = EVIDENCE_ITEMS.some((ev) => ev.object_id === objectId);
        return {
          found: false,
          already_collected: hadAny,
          message: hadAny
            ? 'You already recovered everything hidden here.'
            : 'Nothing hidden inside this object.',
        };
      }
      // Prefer real evidence pieces before decoys so exploration feels crisp and rewarding
      const next = candidates.find((ev) => !ev.is_decoy) || candidates[0];
      collected.add(next.id);
      const remainingHere = candidates.length - 1;
      const count = getNonDecoyCount();
      return {
        found: true,
        fragment_id: next.id,
        evidence: next,
        remaining_here: remainingHere,
        message: next.is_decoy
          ? `Found decoy slip (${next.id}). ${remainingHere > 0 ? 'Something else is still tucked nearby.' : ''}`
          : `Recovered Evidence ${next.id} (${count}/8).${remainingHere > 0 ? ' Check this spot once more!' : ''}`,
      };
    },
    submitClue(clueId, rawAnswer) {
      const expected = CLUE_ANSWERS[clueId];
      const normalized = String(rawAnswer || '').trim().toUpperCase();
      if (normalized === expected) {
        solvedClues.add(clueId);
        const state = buildState();
        return {
          correct: true,
          solved: true,
          room_completed: state.is_completed,
          message: `Verification accepted for ${clueId}.`,
        };
      }
      attempts[clueId] = Math.max(0, (attempts[clueId] ?? 3) - 1);
      return {
        correct: false,
        exhausted: attempts[clueId] <= 0,
        attempts_remaining: attempts[clueId],
        message: `Rejected "${normalized}" — ${attempts[clueId]} attempts remaining.`,
      };
    },
    resetClue(clueId, solvedIds = [], collectedIds = [], basketAlreadyUnlocked = false) {
      if (basketAlreadyUnlocked) previewUnlocked = true;
      for (const sid of solvedIds) {
        if (sid && CLUE_ANSWERS[sid]) solvedClues.add(sid);
      }
      for (const cid of collectedIds) {
        if (cid) collected.add(cid);
      }
      if (clueId && !solvedClues.has(clueId)) {
        attempts[clueId] = 3;
      }
      return buildState();
    },
  };
}

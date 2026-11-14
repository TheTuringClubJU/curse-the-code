// In-universe Substation Delta investigative clues, technician marginalia, and Voice Machine leads.
// Sealed leads strictly omit literal container/discard spoilers so tamper-seal progression stays fair.

export const SEALED_SPECIMEN_LEADS = [
  {
    code: 'INTERCEPT // 14 AUG 1983',
    badgeLabel: 'THE GHOST BADGE',
    cardExcerpt: 'Curfew killed power at 23:00 — yet someone inside Sub-Level 2 never clocked out after shutdown.',
    plateHeading: 'CURFEW LOG // 14 AUG 1983',
    plateLines: [
      'EVERY LOYAL CREW BADGE WENT COLD',
      'WHEN POWER FELL AT 23:00.',
      'ONE ACCOUNT STAYED ACTIVE PAST',
      'SHUTDOWN — FIND IT IN BAY 5B.',
    ],
    plateFooter: 'PERSONNEL REGISTRY · TRACE ACTIVE',
    lines: [
      'Watchdesk Scrap (14 AUG, 23:41): "Orders came down from Dr. C to wipe the board at 23:00 — Retired, On Leave, Terminated, all dark."',
      '"Check the Personnel Registry in Bay 5B anyway. Somebody’s Systems badge stayed marked Active long after Substation Delta died."',
    ],
    reportLines: [
      'Margin Note: Filter out the dead accounts and sort by their last breath — the intruder who stayed after shutdown left a date too recent to be human oversight.',
    ],
    nextStep: 'Continue exploring the darkened facility sectors and checking unfamiliar hardware with [E].',
    highlight: 'Blackout ledger scrap — one Active credential outlived the 1983 curfew.',
  },
  {
    code: 'REQUISITION // CH-7 SPOOFING',
    badgeLabel: 'THE FORGED WIRES',
    cardExcerpt: 'Corvin wired two repeaters to flood Channel 7 with lies. Only Base64 X-AUTH tells the truth.',
    plateHeading: 'TELETYPE SLIP // CORVIN, M.',
    plateLines: [
      'TWO REPEATERS ON CHANNEL 7:',
      'FIVE DISPATCHES LIE ABOUT VM.',
      'CHECK THE BASE64 X-AUTH STAMP',
      'FOR THE ROGUE STAFF BADGE ID.',
    ],
    plateFooter: 'RADIO ARCHIVE · VERIFY X-AUTH',
    lines: [
      'Equipment Slip (20 SEP): Signed "CORVIN, M." — two long-range radio repeaters spliced directly across Channel 7.',
      'Teletype Note: "Corvin cloned five ghost broadcasts that point to the wrong tape reel. Do not trust the prose — decode the X-AUTH Base64 stamp until it matches your Bay 5B badge."',
    ],
    reportLines: [
      'Watchdog Note: Every false wire tries to rush you into opening the wrong reel. Compare X-AUTH ("QkRH...") character for character.',
    ],
    nextStep: 'Keep checking unsearched corners and equipment bays throughout the facility.',
    highlight: 'Requisition proof that Channel 7 teletype bodies were spoofed; X-AUTH holds the real signer.',
  },
  {
    code: 'ACOUSTIC SLIP // CHAMBER 3',
    badgeLabel: 'BEYOND AUDIBLE STATIC',
    cardExcerpt: 'Low hum is the generator; 3.18 kHz mid-band is bait. Climb into the ultrasonic HIGH band past 66%.',
    plateHeading: 'VOICE MACHINE // E. VANCE',
    plateLines: [
      'IGNORE LOW GENERATOR RUMBLE.',
      'DO NOT TOUCH 3.18 KHZ MID BAIT.',
      'SWITCH TO HIGH BAND · SWEEP',
      'PAST TWO-THIRDS (~14 KHZ PEAK).',
    ],
    plateFooter: 'USE THE PROVEN VM REEL ONLY',
    lines: [
      'Scorched CRT Post-It (signed E. Vance): "Whatever breathes inside Chamber 3 rides above human hearing — it hides underneath the audible voicemail chatter."',
      '"Low-band hum is just the diesel turbine; 3.18 kHz on MID band is an injected chime wired to burn your terminal tries. Climb onto HIGH band and push the needle past two-thirds."',
    ],
    reportLines: [
      'Calibration Mark: Look for the amber ~14 kHz carrier lock on the proven voicemail reel from the Radio Log — never trust voices in the middle band.',
    ],
    nextStep: 'Inspect the remaining power enclosures and dark corridor fixtures.',
    highlight: 'Technician warning: Voice Machine truth lies on HIGH band past 66%, never on 3.18 kHz MID.',
  },
  {
    code: 'TELEMETRY NOTE // MONITOR 6',
    badgeLabel: 'FOUR BINARY PULSES',
    cardExcerpt: 'When the ~14 kHz carrier locks, weigh each 4-bit pulse (8 · 4 · 2 · 1) with its Morse chime.',
    plateHeading: 'CRT TRACE // F0..F3 KEY',
    plateLines: [
      'CARRIER LOCK SHOWS 4 FRAMES:',
      'F0 · F1 · F2 · F3 BIT COLUMNS',
      'WEIGH BITS LEFT TO RIGHT: 8-4-2-1',
      'VERIFY WITH PULSE MORSE TONE',
    ],
    plateFooter: 'FOUR DIGITS OPEN THE LOCK',
    lines: [
      'Unsigned Night Slip (07 NOV): "Monitor 6 is showing that same corridor again. Chamber 3 won’t stop feeding Loop 7-C."',
      '"When the Voice Machine oscilloscope catches the upper ~14 kHz carrier, four binary columns flash F0 through F3 — classic 8-4-2-1 weights echoed in Morse dots and dashes."',
    ],
    reportLines: [
      'Cipher Scrap: Translate all four frames in order (example: 1000 yields 8, 0100 yields 4) and audition Pulse Tone if you want to double-check by ear.',
    ],
    nextStep: 'Continue sweeping uninspected facility wings while watching corridor doorways.',
    highlight: 'BCD-8421 bit columns and Morse pips inside the Voice Machine yield the 4-digit override.',
  },
  {
    code: 'RF TRACE // ECHO ZERO',
    badgeLabel: 'THE THREE-KEY CHAIN',
    cardExcerpt: 'Nothing works alone: Badge exposes Wire -> Wire exposes VM Reel -> Reel yields the 4 digits.',
    plateHeading: 'ECHO ZERO // 7.455 MHZ',
    plateLines: [
      '"ECHO ZERO AUTHORISED."',
      'ONE KEY FEEDS THE NEXT KEY:',
      'STAFF BADGE -> X-AUTH WIRE ->',
      'AUTHENTIC VM HIGH-BAND CODE',
    ],
    plateFooter: 'CHAIN ORDER MATTERS',
    lines: [
      'Automated RF Printout (14 AUG, 23:58 — 7.455 MHz): "Echo Zero authorised. Do not enter. Three keys bind the core manifold."',
      'Field Marginalia: "Staff Registry hands you the rogue Badge; Channel 7 proves which voicemail file that Badge sent; the Voice Machine pulls the four numbers buried inside that reel."',
    ],
    reportLines: [
      'Archive Discipline: Resist jumping ahead on any console — every wrong submission burns one of three shared attempts before permanent lockout.',
    ],
    nextStep: 'Locate the remaining hidden evidence across unsearched rooms.',
    highlight: '7.455 MHz intercept confirming how the three Bay 5B terminals chain together.',
  },
  {
    code: 'WIRING TAG // LOOP 7-C',
    badgeLabel: 'BAY 5B SANCTUARY',
    cardExcerpt: 'Fuses 4, 7, and 9 keep Chamber 3 alive. If footsteps stalk the dark, run behind Bay 5B doors.',
    plateHeading: 'LOOP 7-C // DO NOT SEVER',
    plateLines: [
      'FUSES 4, 7, 9 FEED CHAMBER 3.',
      'SEVERING TRIPS FULL ALARM.',
      'SAFE GROUND: CONTROL BAY 5B',
      'STEEL BULKHEADS HOLD PATROL',
    ],
    plateFooter: 'SURVEILLANCE BANK MAPS WINGS',
    lines: [
      'Wiring Tag: "Loop 7-C runs straight to Chamber 3’s biometric line. Keep Fuses 4, 7, and 9 hot — she reacts the second voltage dips."',
      '"If you hear dragging footsteps or static spikes in the corridor, sprint back through Control Bay 5B’s heavy steel doors. Nothing gets past that threshold."',
    ],
    reportLines: [
      'Bay 5B houses both your Monitor Bank (check cameras #01–#06 before crossing corridors) and all three verification desks.',
    ],
    nextStep: 'Inspect unsearched workstations and sealed wings to complete the file set.',
    highlight: 'Survival note: Control Bay 5B stops pursuit while Fuses 4, 7, 9 sustain Loop 7-C.',
  },
  {
    code: 'HANDOVER // AFTER 23:00',
    badgeLabel: 'THE PURGE GAP',
    cardExcerpt: '"Log nothing after 23:00 — Dr. C." Honest staff vanished that night; only one kept logging in.',
    plateHeading: 'NIGHT SHIFT // CURFEW GAP',
    plateLines: [
      '"DO NOT ACKNOWLEDGE SIGNAL."',
      '"LOG NOTHING AFTER 23:00."',
      'HONEST ACCOUNTS FROZE AT',
      'SHUTDOWN — ONE KEPT BREATHING.',
    ],
    plateFooter: 'COMPARE LAST LOGIN DATES',
    lines: [
      'Torn Handover Page (Night, 14 AUG): "Do not acknowledge the signal from Delta. Dr. C has authorised blackout. Log nothing after 23:00."',
      '"Sixty names sit in the personnel roll, most stale from before the incident. Whoever broke curfew left a timestamp newer than everyone else marked Active."',
    ],
    reportLines: [
      'Archive Tip: Export the roster CSV or sort Last Login inside the Bay 5B terminal to spot the anomalous year immediately.',
    ],
    nextStep: 'Track down the final sealed folders tucked in adjacent facility wings.',
    highlight: 'Night-shift handover explaining the post-curfew timestamp gap in the personnel index.',
  },
  {
    code: 'LOCKOUT WARNING // 3.18 KHZ',
    badgeLabel: 'THE MID-BAND SNARE',
    cardExcerpt: 'False 3.18 kHz tones mimic clean Morse just to waste attempts. Stay above audible voice.',
    plateHeading: 'TRIPWIRE // 3.18 KHZ SNARE',
    plateLines: [
      'WARNING: MID-BAND AT 3.18 KHZ',
      'CARRIES POISONED BINARY TONES',
      'THREE MISSES SEAL THE CONSOLE!',
      'TRUST HIGH-BAND PACKETS ONLY.',
    ],
    plateFooter: 'SAVE ALL THREE ATTEMPTS',
    lines: [
      'Scratched inside Fuse Cover: "Somebody injected a clean 3.18 kHz signal right in the middle band — looks convincing on the scope until it burns your clearance."',
      '"Do not touch MID or LOW. Only the faint ultrasonic peak past 66% on HIGH carries Chamber 3’s uncorrupted signature."',
    ],
    reportLines: [
      'Three-Strike Lockout: Exhausting attempts adds a 90-second facility penalty and locks the console permanently.',
    ],
    nextStep: 'Only a couple of compartments remain before Basket [B] releases its wax seals.',
    highlight: 'Field warning: 3.18 kHz mid-band packets are engineered lock-traps.',
  },
  {
    code: 'VALVE SHEET // FORK 2',
    badgeLabel: 'CORE AIRLOCK EXHAUST',
    cardExcerpt: 'When all three Bay 5B desks confirm green, equalize Core Airlock Fork 2 in the North Vault.',
    plateHeading: 'EXHAUST VALVE // FORK 2',
    plateLines: [
      'AIRLOCK SEALED UNDER PRESSURE.',
      'EQUALIZES ONLY AFTER ALL 3',
      'BAY 5B DESKS REGISTER CLEAN:',
      'BADGE · X-AUTH · VOICE CODE',
    ],
    plateFooter: 'NORTH EXIT VAULT MANIFOLD',
    lines: [
      'Manifold Ledger: "Pressure Valve B on the North Exit Manifold refuses manual cranking while Substation Delta’s three console locks remain amber."',
      '"Bring Copy/Download teletype sheets if you cross-check offline — once Badge, Wire, and Voice Code verify, equalize Fork 2."',
    ],
    reportLines: [
      'Emergency Escape Reminder: Fork 2 houses two valves — never force an unverified bypass valve unless you want containment alarms.',
    ],
    nextStep: 'One last parcel remains sealed across Substation Delta.',
    highlight: 'North Core Airlock opens once all three Substation Delta verifications clear.',
  },
  {
    code: 'RELEASE STAMP // 10 OF 10',
    badgeLabel: 'BREAK THE WAX SEALS',
    cardExcerpt: 'With all 10 parcels gathered, black bars lift across Basket [B] — examine Bay 5B in chain order.',
    plateHeading: 'SEAL THRESHOLD // 10 OF 10',
    plateLines: [
      'ALL 10 PARCELS ACCOUNTED FOR.',
      'WAX SEALS DROP ACROSS [B].',
      'BEGIN AT PERSONNEL REGISTRY,',
      'CARRY BADGE TO RADIO & VOICE.',
    ],
    plateFooter: 'SUBSTATION DELTA UNLOCKED',
    lines: [
      'Custody Seal Stamp: "Upon logging all ten Substation Delta fragments, tamper seals release automatically across Evidence Basket [B]."',
      '"Take your unsealed exhibits back inside Control Bay 5B — start at the Personnel Registry, follow the Base64 trail through Channel 7, and break open the Voice Machine."',
    ],
    reportLines: [
      'Every date, name, and frequency across your 10 unsealed exhibits now cross-references cleanly inside the Bay 5B stations.',
    ],
    nextStep: 'Return to Control Bay 5B and begin decrypting the three console locks.',
    highlight: 'Final custody release unlocking all Basket exhibits and Bay 5B consoles.',
  },
];

// Non-spoiler lead lookup by parcel index
export function resolveSealedSpecimenLead(index = 0) {
  const safeIdx = Math.abs(Number(index) || 0) % SEALED_SPECIMEN_LEADS.length;
  return SEALED_SPECIMEN_LEADS[safeIdx];
}

// Per-terminal atmospheric note when approaching a console before 10/10 fragments are gathered
export const LOCKED_TERMINAL_NOTES = {
  staff_terminal: {
    excerpt:
      'Tape residue on monitor corner: "Dr. Corvin claimed every crew badge went cold when power died at 23:00 on 14 AUG. Somebody forgot to turn theirs off — check who stayed Active after shutdown."',
    highlight: 'Personnel Registry locked pending all 10 Substation Delta seals.',
  },
  radio_console: {
    excerpt:
      'Slip wedged under teletype carriage: "Five of six Channel 7 wires are spoofed repeaters screaming conflicting voicemail names. Ignore their prose — match the Base64 X-AUTH header against the rogue staff badge."',
    highlight: 'Radio Archive locked — Base64 X-AUTH separates genuine dispatches from Corvin repeaters.',
  },
  sound_console: {
    excerpt:
      'Grease-pencil note on oscilloscope bezel (E. Vance): "Do not trust 3.18 kHz mid-band chimes — that snare burns attempts. Switch to HIGH band, scrub past two-thirds dial (~14 kHz), and weigh the four binary pulses (8-4-2-1)."',
    highlight: 'Voice Machine MK-II locked — genuine Chamber 3 carrier hides above 66% on HIGH band.',
  },
};

// Strip testing prefixes ("Test Transmissions" -> cleaner in-world fixture label)
export function cleanTerminalDisplayName(rawName, objectId = '') {
  const fallbackMap = {
    staff_terminal: 'Personnel Registry Terminal',
    radio_console: 'Radio Teletype Console',
    sound_console: 'Magnetic Voice Console MK-II',
  };
  const trimmed = String(rawName || '').trim();
  if (!trimmed || /^TEST\b/i.test(trimmed)) {
    return fallbackMap[objectId] || trimmed.replace(/^TEST[:\s-]*/i, '').trim() || 'Sector Terminal';
  }
  return trimmed;
}

// Forensic cross-references for UNSEALED Basket items & pickup receipts (keyed by evidence id)
export const UNSEALED_EVIDENCE_GUIDES = {
  EC01: {
    terminalRef: 'R2-01 · CURFEW AUDIT & R2-05 · CH-7',
    reportLines: [
      'Clue Connection [R2-01 / R2-05]: 14 AUG 1983 (23:41) marks the Delta shutdown. Any credential still "Active" after curfew is suspect; follow that Badge ID straight into Channel 7’s Base64 X-AUTH stamp.',
    ],
  },
  EC02: {
    terminalRef: 'R2-05 · REPEATER SPOOFING',
    reportLines: [
      'Clue Connection [R2-05]: M. Corvin’s dual repeaters forged five out of six wire bodies. Decode each X-AUTH header from Base64 until it matches the verified bay operator.',
    ],
  },
  EC03: {
    terminalRef: 'R2-06 · VOICE MACHINE ULTRASONIC LOOP',
    reportLines: [
      'Clue Connection [R2-06]: Continuous Chamber 3 static bleeds above normal voice bands. Select the R2-05 verified reel, set FREQ BAND to HIGH, and scrub past 66% to catch the four-frame BCD-8421 / Morse carrier.',
    ],
  },
  EC04: {
    terminalRef: 'R2-06 · MONITOR 6 & MID-BAND TRAP',
    reportLines: [
      'Clue Connection [R2-06]: Confirms unauthorized corridor activity linked to Chamber 3. Stay clear of 3.18 kHz mid-band bait on the Voice Machine — work strictly on HIGH band.',
    ],
  },
  EC05: {
    terminalRef: 'R2-05 -> R2-06 CHAIN',
    reportLines: [
      'Clue Connection [Echo Zero]: Automated RF traffic after 23:58 confirms the post-curfew intrusion. Prove the X-AUTH sender first so you inspect only the authentic voicemail file.',
    ],
  },
  EC06: {
    terminalRef: 'R2-06 · LOOP 7-C TELEMETRY',
    reportLines: [
      'Clue Connection [Loop 7-C]: Telemetry piggybacks on F0..F3 ultrasonic pulses. Read each 4-bit quartet left-to-right (8-4-2-1 weights) and cross-check by ear with Pulse Tone Morse.',
    ],
  },
  EC07: {
    terminalRef: 'R2-01 · 23:00 BLACKOUT ORDER',
    reportLines: [
      'Clue Connection [R2-01]: "Log nothing after 23:00 — Dr. C." Sort Last Login descending and filter Status = "Active" to expose who never went dark.',
    ],
  },
  EC08: {
    terminalRef: 'BAY 5B SANCTUARY & FORK 2',
    reportLines: [
      'Clue Connection [M.C.]: Fuses 4, 7, 9 sustain Chamber 3 feeds. Once Badge, X-AUTH Wire, and Voice Machine Code clear in Bay 5B, equalize North Core Airlock Fork 2.',
    ],
  },
  XC01: {
    terminalRef: 'DISCARDED ADMINISTRATIVE RECORD',
    reportLines: [
      'Forensic Assessment: Routine canteen manifest swept up during curfew panic — contains no terminal credentials or cipher values.',
    ],
  },
  XC02: {
    terminalRef: 'DISCARDED ADMINISTRATIVE RECORD',
    reportLines: [
      'Forensic Assessment: Unremarkable routine sign-in sheet with zero post-curfew anomalies. Focus on EC01–EC08 instead.',
    ],
  },
};

export function resolveUnsealedEvidenceGuide(ev) {
  if (!ev) return null;
  const id = String(ev.id || '').toUpperCase();
  if (UNSEALED_EVIDENCE_GUIDES[id]) return UNSEALED_EVIDENCE_GUIDES[id];
  if (ev.is_decoy || ev.category === 'decoy' || /^XC/i.test(id)) {
    return {
      terminalRef: 'DISCARDED ADMINISTRATIVE RECORD',
      reportLines: [
        'Forensic Assessment: Auxiliary facility paperwork without terminal keys. Focus on EC-series exhibits.',
      ],
    };
  }
  return null;
}

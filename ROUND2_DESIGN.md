# Round 2: "What Was Sealed Below" — Full Development Design Specification

> **Status:** Design complete. Pending Round 1 (300/300 tests). Reference this document for all Round 2 frontend, backend, and horror implementation work.
>
> **Content files:** `content.test.json` (dev/CI) and `content.live.json` (competition). Both have identical schema. Test file has placeholder content; live file has real clues and answers. Never commit `content.live.json` answers to public remotes.
>
> **Horror design reference:** See `round2_horror_design.md` for the full paranormal event catalog, jumpscare choreography, and audio architecture.

---

## The Story (What Teams Are Actually Uncovering)

Hollow House was not just a family home. Beneath it, Dr. Milo Corvin — a Systems engineer listed in the personnel index — ran an illegal subterranean research program from the late 1960s through the 1980s. The stated purpose: archiving human consciousness. The real result: something that did not die.

When the facility was officially shut down in 1983, Corvin forged the shutdown documentation. His badge remained active years past the official closure date. He continued operating in secret. The subjects of the experiments — people, once — became something the documentation calls only "the archived." They did not leave.

Teams descending into Round 2 are not investigators. They are containment technicians who accidentally opened a door that was sealed for a reason. The only way out is to trigger the emergency containment protocol at the Central Console in the Vault — which requires three keys derived from evidence scattered across all three chambers.

**The clue chain in plain English (not to be encoded in any JSON):**
The redacted report reveals the official shutdown date. That date lets teams identify which badge was still active after shutdown (Personnel Index). That badge belongs to Corvin. The microfilm and timeline confirm what Corvin was doing. The transmissions name the voicemail that exposes Corvin's identity. The spectrogram voicemail hides a 4-digit code. That code feeds the failsafe circuit logic gates. The manual diff reveals which protocol steps were tampered with. The final console requires all three outputs at once: the clean steps, the circuit code, and Corvin's badge.

---

## Colour Palette & Visual Language (All Rooms)

No blue. No clean. No synthetic glows. Every colour choice reinforces rot, age, and something biologically wrong.

| Token | Hex | Used For |
|:---|:---|:---|
| `void` | `#030104` | Unlit areas, absolute darkness |
| `decay-dark` | `#0f0a07` | Room ceiling and far walls |
| `decay-mid` | `#1a1208` | Floor, mid-room surfaces |
| `bile-shadow` | `#1a1a12` | Damp concrete under lights |
| `rust` | `#2b1206` | Cabinet metal, iron fittings |
| `dried-blood` | `#3a0808` | Stain overlays, emergency lighting |
| `bone` | `#c8b89a` | Aged paper, document backgrounds |
| `mold` | `#1f2e0a` | Damp ceiling patches, floor seams |
| `phosphor` | `#1a3d1f` | CRT screens, terminal text |
| `phosphor-text` | `#4dff78` | Active terminal characters |
| `amber-warning` | `#c47a00` | Emergency filament bulbs |
| `ash` | `#141316` | Rebar, iron chains |

No white. The brightest text in the game is `#e8d9c0` (old cream paper). Emergency lighting is `#c47a00` amber filament — not red, not blue.

---

## Room 4: The Rotting Archive (`records`)

### 3D Environment Specification

**What the room looks like:**
A sub-basement archive. The ceiling is low — just above head height — and crosshatched with exposed, corroded iron pipes that drip. The floor is buckled, water-stained concrete with standing black water in the corners and along one wall. Metal shelving units line three walls, most bowing under the weight of waterlogged cardboard archive boxes. Many boxes have collapsed. Their contents — forms, files, paper reams — are scattered across the floor and soaking in the water.

The only light source is a single row of institutional fluorescent tubes running the length of the ceiling. Half of them are dead. Two flicker continuously. One at the far end of the room buzzes with a sound that is too irregular to be a bulb fault. The room has two heavy iron doors: one on the south wall (entrance from the transition corridor) and one on the north wall — the bulkhead door — sealed and chained. The chains are new. Everything else is 40 years old.

**Procedural 3D construction (Three.js):**
- Floor: `PlaneGeometry` with procedural Canvas texture showing aged concrete with water pooling. Use vertex displacement for surface unevenness.
- Ceiling: low `BoxGeometry` box ceiling with `CylinderGeometry` pipe runs. Drip particles: `THREE.Points` system emitting from pipe intersections at random intervals.
- Shelves: merged `BoxGeometry` frames per shelf unit. Books and boxes are merged geometries per shelf row to minimize draw calls.
- Standing water: `PlaneGeometry` at floor level with a dark, slightly reflective material (`MeshStandardMaterial`, metalness 0.3, roughness 0.1). Animated ripple shader when entity passes through.
- Atmospheric particles: slow-drifting `THREE.Points` for dust motes and spores, never more than 400 particles total.

**Lighting:**
- Primary: `THREE.RectAreaLight` mapped to the fluorescent tube positions. Random flicker implemented in the animation loop using `Math.random()` threshold per frame.
- Ambient: `THREE.AmbientLight` at 4% intensity — `#1a1208`. Near-zero. Players must rely on the flashlight for more than 2 metres of visibility.
- Flashlight: `THREE.SpotLight` attached to the camera, 60° angle, 10m range, `#c8b89a` colour. Battery decay: intensity reduces 0.5% per 60 seconds. Picking up the flashlight item in-room recharges it. Wrong fork choice removes 30% battery instantly.

**Interactive props (all require `[E]` to interact):**

| Object ID | 3D Description | Role | Fragment |
|:---|:---|:---|:---|
| `filing_cabinet_a` | 4-drawer rusted steel cabinet, east wall. Drawers dented. One is jammed half-open. | `interactive_fragment` | `ER01`, `ER02` |
| `filing_cabinet_b` | Larger 6-drawer cabinet, also east wall. Heavy chains across drawers, padlock. Padlock is rusted open. | `interactive_fragment` | `ER03`, `ER04` |
| `archive_shelves` | Floor-to-ceiling steel shelves, north and west walls. Rows of waterlogged boxes. | `interactive_fragment` | `ER05`, `ER06` |
| `clerk_desk` | Heavy steel desk, center-east. Blotter is ruined with water and ink bleed. Papers covering surface. | `interactive_fragment` | `ER07` |
| `card_catalog` | Wooden library card index, south-east corner. 36 small drawers. Most are stuck. | `interactive_fragment` | `ER08`, `ER09` |
| `waste_basket` | Mesh steel bin, under the clerk desk. Overflowing with shredded and crumpled documents. | `interactive_fragment` | `ER10` |
| `vent_grate` | Low wall ventilation conduit, north wall, floor level. Grille is bent outward. | `interactive_fragment` | `XR01` (decoy) |
| `filing_cabinets` | Decorative far-row cabinets against west wall. Sealed, rusty, atmospheric only. | `decor` | — |
| `ceiling_light` | The flickering fluorescent bank overhead. | `decor` | — |
| `report_folder` | Yellowed folder sitting on a small reading lectern near the center. Sealed with black tape. | `clue_entry` (R2-02) | — |
| `microfilm_reader` | Heavy optical viewer on a corner desk. The desk chair in front of it is turned to face the door. | `clue_entry` (R2-03) | — |
| `timeline_board` | Large corkboard on the west wall. Index cards pinned to it with red string connections. Many cards are blank. | `clue_entry` (R2-04) | — |
| `bulkhead_door` | Reinforced steel blast door, north wall. Keypad mounted beside it. Keypad has power — the only clearly powered thing in the room. | `clue_entry` (R2-07) | — |

**Hover & Interact behaviours:**
- All `interactive_fragment` props: subtle warm amber emissive highlight on hover. No hard outline. Crosshair prompt: `[E] Search [label]`.
- `clue_entry` props: cold green emissive on hover (CRT colour, suggesting power source). Crosshair prompt: `[E] Examine [label]`.
- `decor` props: no highlight, no interaction.

**Basket mechanic in this room:**
- Fragments are found sequentially in a chain (strict pickup order, same as Round 1). Finding a fragment plays a dry, papery rustling sound and adds it to the basket.
- When all 10 real fragments (ER01–ER10) are collected, the basket becomes interactive. No ceremony — the game does not announce this. The player simply notices the basket icon `[B]` has changed state.
- Opening the basket reveals the fragments as a grid of document images. Each has a brightness/contrast/invert inspector slider. Some fragments require maximum contrast inversion to read their hidden content.
- Clue terminals for `report_folder`, `microfilm_reader`, `timeline_board` only become interactive AFTER the basket is complete (`input_gate: room_evidence_complete`). Before that, pressing `[E]` on them gives: *"This terminal is locked. The case must be assembled first."* — displayed as a brief UI toast, typewriter-font.

---

### Room 4: Fragment UI Details (How Each Fragment Looks)

When a fragment is opened in the basket inspector, it renders as a full-screen-width document modal. The modal frame is a cast-iron border with rust bleeding at the corners. The document itself is photographed/scanned — not clean vector text. It has genuine paper texture, typewriter ink inconsistency, aging marks.

**Fragment types in Room 4:**
- **Requisition forms:** Institutional grid paper. Columns for item, quantity, authorisation. Authorised by `M. CORVIN` with an ink-smudged signature.
- **Internal memos:** Plain A4, typed. Letterhead: `PROJECT CRYPT — SUBSTATION DELTA — INTERNAL ONLY`. Cc: redacted.
- **Autopsy intake forms:** Medical grid. Subject ID (not names). Age, weight, measurements. Diagnosis: redacted. Outcome column is blank.
- **Incident reports:** Handwritten on a pre-printed form. Some words crossed out heavily. Some lines written in a different hand, different ink, clearly added later.
- **Photographs (image_file fragments):** Old black-and-white photographs clipped to paper backing. The photograph shows a room that looks like the room the player is standing in — but clean, lit, occupied. People in white coats. Equipment that is now rusted scrap. The photographs are the most upsetting fragments because they show the facility as it was before whatever happened.

---

### Room 4: Clue UI Details

**R2-02: The Redacted Report (`report_folder`)**

The modal opens to a two-tab view: `Copy A` and `Copy B`. Both show what appears to be the same incident report. Both are scanned, typewriter-typed, paper-textured.

The UI: two tabs at the top of the modal, styled as physical folder tabs — worn, slightly curling paper labels. Active tab is slightly raised. Tab switch is not a web transition — it is a physical flick animation (the new page slides in from the side like turning a physical file).

The paper itself has black grease-pencil redaction bars on Copy A — thick, hand-applied, slightly angled. On Copy B the same sections are instead covered in a later-added printed black rectangle — machine-applied. Players must compare the two copies. Where Copy A's handwritten redaction is imprecise, the text edges are faintly visible underneath, especially at maximum brightness in the inspector. Where Copy B's machine redaction is applied, it is clean — but it covers different text in some sections than Copy A. The discrepancy between the two copies is what leads to the answer.

UI controls: within the document modal, a small toolbar at the bottom: `Brightness [slider]`, `Contrast [slider]`, `Invert [toggle]`. These are the same tools from Round 1's basket inspector but applied directly within the clue modal here.

**R2-03: The Microfilm Viewer (`microfilm_reader`)**

The modal opens to what looks like a physical microfilm reader: a dark background with a rectangular light panel in the center, showing the microfilm frame. Around the light panel: the plastic housing of an old reader — worn, scratched, with a large brass dial on the right side.

The brass dial is interactive — click and drag rotates it. Rotating the dial advances the microfilm frame. There are numbered positions on the dial's housing (scratched on). Players must navigate to a specific frame number (derived from the report in R2-02) to find the target photograph frame.

Stage 2: Once the correct frame is found, the photograph on the microfilm shows what appears to be a standard facility photo — but embedded in the image is a hex comment string in the metadata (shown in a small `[i]` panel that appears when hovering the photograph). Players must decode the hex.

UI feel: dark, the light panel glows with a cold amber backlight. The microfilm strip is visible at the edges of the frame, showing adjacent frames in blurred form. The dial has a physical click every 5 degrees of rotation — an audible `tick` sound.

**R2-04: The Epoch Timeline (`timeline_board`)**

The modal opens to a recreation of the corkboard — a large dark cork surface with index cards pinned to it. Each card shows an event description and a date. Red string connects some cards to others.

Players drag cards. The mechanic: some cards are legitimate historical events (facility construction, subject intake, official shutdown). Some cards are planted — false events added by Corvin to obscure the timeline. Players must identify and remove the planted cards, leaving only the genuine sequence. The first letters of the genuine events (in correct chronological order) spell the answer.

UI: the corkboard fills the full modal. Cards are `draggable` — picking up a card with a mouse-down and dragging it to a "remove" zone at the bottom of the modal (visualised as a floor surface, as if the card is being put down). Cards snap back if the player hesitates. A counter at the top-right of the modal shows: `Cards remaining: 8`. Removing a card plays a soft pin-pull sound.

**R2-07: The Bulkhead Keypad (`bulkhead_door`)**

The modal opens to a close-up of the keypad. It is not a modern keypad — it is an older industrial rotary combination type. Three separate rotating disc selectors (each showing 0–9) and a 4-character alphanumeric keypad. The team must enter both a numeric code and a keyword.

UI: each disc selector is click-draggable — drag up to increase, drag down to decrease. The alphanumeric input is a standard keyboard text field, but styled as a physical key-press terminal — each character appears with a typewriter clack sound and a physical key depression animation. Submitting an incorrect code causes the keypad to emit a harsh buzz and a red warning light flashes on the keypad housing. Submitting the correct code plays a heavy mechanical thunk and the door behind the player begins to audibly unlock — chains retracting, bolts sliding — over 3 seconds.

---

### Room 4: Backend Routes

```
GET  /api/game/room/records/state          — Room state, fragment progress, basket status
POST /api/game/room/records/search         — Search a fragment prop (object_id in body)
GET  /api/game/room/records/basket         — All collected fragments for this team in this room
POST /api/game/clue/R2-02/submit           — Submit redacted report answer
POST /api/game/clue/R2-03/submit           — Submit microfilm answer (stage 1 and 2)
POST /api/game/clue/R2-04/submit           — Submit epoch timeline answer
POST /api/game/clue/R2-07/submit           — Submit bulkhead keypad answer (unlocks vault)
GET  /api/game/clue/R2-02/hints            — Retrieve progressive hints for R2-02
GET  /api/game/clue/R2-03/hints            — Retrieve progressive hints for R2-03
GET  /api/game/clue/R2-04/hints            — Retrieve progressive hints for R2-04
GET  /api/game/clue/R2-07/hints            — Retrieve progressive hints for R2-07
```

**Backend logic for Room 4:**
- Fragment search route must enforce strict sequential pickup (`seq` field). Team cannot pick up `ER03` until `ER01` and `ER02` are collected.
- Decoy fragment `XR01` can be searched at any time — it is added to the basket but marked `is_decoy: true`. It contributes to basket count but is flagged in the basket UI with a subtle visual treatment.
- Basket "opens" (clue terminals unlock) when all non-decoy fragments for the room are collected (`ER01`–`ER10`).
- `R2-07` solve response must set `vault_unlocked: true` in the team's room state, triggering the door open animation on the client.

---

## Room 5: The Surveillance Morgue (`control`)

### 3D Environment Specification

**What the room looks like:**
A narrow, low-ceilinged observation bunker. The room is longer than it is wide — roughly the dimensions of a railway carriage. The south wall (entrance) has a single heavy door with a small wire-reinforced glass viewport. The north wall is entirely taken up by nine cracked CRT monitors in a 3×3 grid, each with its own processing unit below. Five of the nine monitors are on. Four show static. One shows footage.

The floor is industrial diamond-plate steel, damp, with strips of non-slip rubber mat that have mostly peeled away. Quarantine plastic sheeting hangs from the ceiling on two sides, covering unidentified equipment beneath. The sheeting moves in a draft that has no visible source.

The room has no windows. The only light comes from the monitor glow (green-grey phosphor) and two amber emergency filament bulbs mounted in cage fittings on the ceiling. One filament bulb is at 40% brightness — the filament is visibly breaking.

**Procedural 3D construction:**
- Floor: diamond-plate texture via Canvas (`drawLine` patterns in charcoal on `#1a1208`).
- Monitor bank: 9 `BoxGeometry` CRT units merged into one mesh. Screen face is a separate `PlaneGeometry` with an animated Canvas texture simulating static, scanlines, and phosphor glow.
- Plastic sheeting: `PlaneGeometry` with cloth simulation via vertex displacement animation (sine wave along Y axis, low amplitude, slow period).
- Relay racks: merged `BoxGeometry` slabs, 1U rack units represented as thin merged horizontal slices. Drive activity lights: tiny `BoxGeometry` with emissive colour cycling.

**Interactive props:**

| Object ID | 3D Description | Role | Fragment |
|:---|:---|:---|:---|
| `relay_rack` | Server rack chassis, east wall behind the monitor bank. 2m tall, full of blinking equipment. | `interactive_fragment` | `EC01`, `EC02` |
| `tape_deck_cart` | Vintage reel-to-reel magnetic tape deck on a wheeled cart, south-east corner. | `interactive_fragment` | `EC03` |
| `operator_chair` | Swivel chair, center-room, torn leather, in front of the monitor bank. | `interactive_fragment` | `EC04` |
| `cable_trench` | Open floor conduit running from the door to the monitor bank. Packed with thick cable bundles. | `interactive_fragment` | `EC05` |
| `wall_clipboard` | A clipboard mounted beside the door on a hook. Forms clipped to it. | `interactive_fragment` | `EC06`, `EC07` |
| `fuse_box` | Wall-mounted electrical fuse panel, west wall. Some fuses have been physically snapped. | `interactive_fragment` | `EC08` |
| `monitor_bank` | The 9-CRT monitor wall. Visual atmosphere. Clicking the CCTV monitor triggers JS-05. | `decor` (special) |
| `dead_intercom` | Mounted on the wall by the door. Cracked housing, coiled cable dangling. | `decor` (special) |
| `staff_terminal` | A standalone workstation, center-room beside the monitor bank. Heavy CRT monitor, mechanical keyboard. | `clue_entry` (R2-01) |
| `radio_console` | A shortwave radio desk, south-east. Multiple dials, squelch controls, a reel of printed paper tape. | `clue_entry` (R2-05) |
| `sound_console` | An audio analysis unit, east wall. Oscilloscope tube, patch bay, tape output spool. | `clue_entry` (R2-06) |

**Basket mechanic in this room:**
Same as Room 4. `EC01`–`EC08` must all be collected (strict chain order) before `staff_terminal`, `radio_console`, and `sound_console` become interactive.

---

### Room 5: Clue UI Details

**R2-01: Personnel Index (`staff_terminal`)**

The modal opens to what appears to be an old database terminal — not a modern web UI. The background is `#000000`. All text is `#4dff78` (phosphor green). The font is a monospace bitmap font (Terminus or Perfect DOS VGA 437). The header reads: `PROJECT CRYPT — PERSONNEL DATABASE — v2.1`.

The table has columns: `BADGE_ID`, `NAME`, `DEPT`, `STATUS`, `LAST_LOGIN`. 60 rows. The table is scrollable vertically within the modal. At the top: three physical toggle-switch style filter controls (click to toggle): `DEPT:`, `STATUS:`, `SORT`. Each filter opens a dropdown that also looks like a terminal dropdown — dark background, green text, arrow key navigation visual (even though it responds to mouse).

The monospace table rows have alternating background at `#001200` / `#000000`. Hovered row: background shifts to `#003300`, row text shifts to `#ffffff`.

The input prompt at the bottom of the terminal: `> ENTER BADGE ID: _` — a blinking block cursor. The player types directly here.

Incorrect input: the terminal prints `>> ACCESS DENIED — NO MATCH` and the cursor moves to a new line.
Correct input: `>> MATCH CONFIRMED — BDG-XXXX — CORVIN, M. — STATUS: ACTIVE` — then the case dossier auto-updates with the badge entry.

**R2-05: Transmission Archive (`radio_console`)**

The modal opens to what looks like a printed paper tape output — the kind produced by old radio teletype machines. A continuous scroll of slightly yellowed thermal paper, printed with monospace text. Each transmission is clearly separated with a header block: `TX-[number] | DATE | FREQ | DURATION`.

Six transmissions (TX-1 through TX-6) are listed. The paper tape is physically scrollable — the player drags it up and down. It has actual paper texture and subtle print-through showing from the reverse.

One of the six transmissions is authentic. The others are either garbled noise, internal admin comms, or intentional disinformation. Teams must identify the authentic transmission by cross-referencing it against the badge ID they found in R2-01 (the authentic transmission is the one sent from Corvin's active post-shutdown terminal, referencing a voicemail file by name).

There is no input field on this modal. The answer is a voicemail file designation (`VM-A` or `VM-B`). The input field appears only after the player has scrolled through all six transmissions (a scroll completion detection mechanism) — simulating the player reading the full printout. Then a prompt at the bottom of the paper: `> IDENTIFY AUTHENTIC TRANSMISSION SOURCE: _`

**R2-06: Spectrogram Voicemail (`sound_console`)**

The modal opens to what looks like a physical oscilloscope — a large circular tube with a grid overlay, showing a waveform. Below the tube: a panel of physical controls — a scrub dial (click-drag to advance), a frequency band selector (three toggles: `LOW`, `MID`, `HIGH`), and an output paper strip showing the waveform trace.

Two tabs at the top of the modal: `VM-A` and `VM-B` — the two voicemail recordings. Only one is real (determined by R2-05). Teams must load the correct voicemail tab and analyse its waveform.

The waveform shows audio represented visually. At a specific frequency band (toggled with the band selector), at a specific time range (found by scrubbing), the waveform contains embedded text — four digits visible as pattern disruptions in the waveform trace. These are not obvious — they require the player to look at the waveform carefully. When the correct band is selected and the cursor scrubs over the target range, the digits briefly appear in the waveform trace, clearly enough to read but only while actively scrubbing over that range.

No audio playback required. The entire puzzle is visual — the waveform is a static image with an interactive cursor. The four digits are the answer.

---

### Room 5: Backend Routes

```
GET  /api/game/room/control/state          — Room state, fragment progress, basket status
POST /api/game/room/control/search         — Search a fragment prop
GET  /api/game/room/control/basket         — Collected fragments
POST /api/game/clue/R2-01/submit           — Submit badge ID
POST /api/game/clue/R2-05/submit           — Submit transmission identification
POST /api/game/clue/R2-06/submit           — Submit 4-digit spectrogram code
GET  /api/game/clue/R2-01/hints
GET  /api/game/clue/R2-05/hints
GET  /api/game/clue/R2-06/hints
```

---

## Room 6: The Anointing Vault (`vault`)

### 3D Environment Specification

**What the room looks like:**
The deepest chamber. Reached through the bulkhead door after solving R2-07. The corridor from the records room to here is 40 metres of raw stone tunnel — rough-carved, not finished. Moisture beads on the stone. The floor is covered in something dark that is not water — it does not reflect light the same way.

The vault itself is a circular chamber with a domed ceiling. The dome is poured concrete, heavily reinforced with visible rebar grids. Rusted iron chains hang from ceiling anchor points, most of them terminating in nothing — the hooks at the bottom are empty. One set of chains is not empty. At the center of the room, suspended from three ceiling anchors, hangs a rusted iron cage approximately 2 metres in diameter. It is spherical. Behind the cage bars, behind a panel of thick, scratched, bulletproof glass bolted over a section of the cage — something is inside.

The organism inside the cage pulses. It is biological. It is not an animal. It is not a machine. It occupies most of the interior volume of the cage, pressed against the bars. When the player enters the room, the pulse rhythm accelerates. The glass panel has handprints on the inside. The handprints are from more than one pair of hands. The fingernails have left deep scratches in the glass.

The countdown display is a large mechanical split-flap board on the east wall — the kind used in train stations. It counts down in minutes and seconds. The flaps make a sharp, loud CLACK-SNAP when each second advances.

**Lighting:** The only light in the vault is the pulsing bioluminescence of the organism — a deep, sickening crimson at the pulse peak, fading to near-black in the valleys between beats. The room breathes light and darkness in a 1.4-second cycle. All consoles have small amber indicator lights — the only stable light source.

No flashlight in the vault. The player's flashlight battery drains to zero at the moment they cross the threshold. This is not explained. It simply stops working.

**Interactive props:**

| Object ID | 3D Description | Role |
|:---|:---|:---|
| `core_glass` | The bulletproof glass panel on the cage. Heavily cracked from inside. | `decor` (special — triggers horror) |
| `countdown_timer` | Mechanical split-flap board, east wall. Synced to tournament timer. | `decor` |
| `manual_terminal` | Heavy cast-iron workstation, west wall, facing the cage. | `clue_entry` (R2-08) |
| `failsafe_panel` | A copper and brass switchboard with 8 large knife-switch levers, north wall. | `clue_entry` (R2-09) |
| `central_console` | A monolithic control altar directly facing the cage. The final terminal. | `clue_entry` (R2-10) |

**No fragments in the vault. No basket. Teams arrive here with everything they need.**

---

### Room 6: Clue UI Details

**R2-08: Manual Diff (`manual_terminal`)**

The modal opens to a split-view — two side-by-side documents. Left: `ORIGINAL — SHUTDOWN PROCEDURE MANUAL v1.1`. Right: `REVISED — SHUTDOWN PROCEDURE MANUAL v2.0 (CORVIN)`.

Both documents show numbered procedure steps. The layout is clean and legible — this is the least visually decayed UI in the game, because these are institutional documents, not handwritten field notes. However, the terminal frame around the modal is aged iron with a scratched glass screen face.

Corresponding steps are aligned horizontally across the split view. Steps that are identical in both versions are displayed in normal text. Steps that differ are highlighted: the original version's text is shown in full, the revised version's differing content is shown with the altered text highlighted in amber.

The modal includes a small `COPY TEXT` button on the revised document — clicking it copies the revised text to the clipboard to allow the player to work with it externally. This is the same `copyable: true` behaviour from the existing schema.

The answer: a string of digits (the step numbers that were tampered with in the revised version).

**R2-09: Failsafe Circuit (`failsafe_panel`)**

The modal opens to a physical representation of the switchboard. At the top: 8 large toggle switches arranged in four pairs labelled `A`, `B`, `C`, `D`. Each pair has two positions: `0` or `1`. Clicking a switch flips it between positions with an audible heavy metallic `CLANG`. The switch physically animates — the lever moves, the base housing vibrates slightly.

Below the switches: a wiring diagram showing how the switches feed through a series of logic gates (AND, OR, NOT). The wiring is drawn in a deliberately aged, hand-drawn schematic style — pencil on grid paper, corrections visible. Gate symbols are standard electronic symbols but slightly hand-drawn.

At the bottom of the schematic: 4 lamp indicators. Each is an amber filament bulb in a small housing. When the correct switch configuration is set, the corresponding lamp lights up. The 4-digit code is the state of the 4 lamps read left to right (1 = lit, 0 = unlit).

The switch configuration that determines the correct code comes from the 4 digits found in R2-06. Teams must derive the binary input pairs from those digits.

The panel note is printed on a small label beside the switches: `FOUR DIGITS FEED FOUR INPUT PAIRS (A, B, C, D). EACH PAIR IS THE LAST TWO BITS OF THAT DIGIT IN BINARY. LAMPS READ LEFT TO RIGHT.`

**R2-10: Central Console (`central_console`)**

The final terminal. The modal is the most dramatic in the game. It opens fullscreen — the first and only modal that takes the entire viewport.

The background is completely black. The only content is a large ENTER CONTAINMENT CODE header at the top, in heavy monospace. Below: three input fields, each in a physical iron housing with engraved labels:

```
CLEAN PROTOCOL STEPS:  [ ________ ]
AUTHORIZATION CODE:    [ ____ ]
OPERATOR BADGE:        [ _________ ]
```

Each field, when active, has the blinking block cursor. The keyboard input sounds like heavy typewriter hammers hitting a metal platen. Incorrect submission: a 3-second pause, then the screen tears — a horizontal RGBshift scan tear — and the words `CONTAINMENT REJECTED — RESEQUENCE REQUIRED` appear. The cage pulse accelerates during this sequence. Correct submission: see victory sequence below.

**Victory Sequence:**
1. 2-second pause after submission — longer than any previous delay, long enough for the team to doubt they were right.
2. The cage pulse slows. Slows. Slows. Stops.
3. The room goes completely dark for 1.5 seconds.
4. When light returns: the emergency lighting has switched from crimson to amber. Full room visibility for the first time.
5. The countdown board stops. The flaps on the board spin randomly for 3 seconds, then settle on: `CONTAINMENT RESTORED`.
6. The terminal displays — one line at a time, with a 1.5-second pause between each — the bridge text from the content file.
7. Last frame before black: the cage is visible in the background of the terminal modal. It is empty. Something has changed about the room but no specific element has visibly changed. The feeling is irresistible and impossible to articulate. Teams will talk about it.

---

### Room 6: Backend Routes

```
GET  /api/game/room/vault/state            — Room state (no fragment system)
POST /api/game/clue/R2-08/submit           — Submit tampered step numbers
POST /api/game/clue/R2-09/submit           — Submit 4-digit circuit lamp code
POST /api/game/clue/R2-10/submit           — Submit final containment code (3 fields)
GET  /api/game/clue/R2-08/hints
GET  /api/game/clue/R2-09/hints
GET  /api/game/clue/R2-10/hints
```

**R2-10 backend logic:**
- Validate all three fields simultaneously (steps, code, badge) in a single HMAC check.
- On success: set `team_rounds.qualified_at` for round 2, record final timestamp, return `round_complete: true`.
- Round complete response triggers the client victory sequence.

---

## The Carry-Forward Case Dossier (`[C]` Key)

The Case Dossier replaces the photo-assembly mechanic from Round 1. When a clue is solved anywhere in Round 2, its result is permanently stamped into the dossier as a **Case Record** — an aged index card with the clue's title, the extracted answer, and a wax seal stamp indicating it has been verified.

The dossier is accessible with `[C]` from anywhere in Round 2. It opens as a physical folder — dark brown leather cover, worn corners. Inside: index cards on a ring binder. Each solved clue occupies one card. Unsolved clues appear as blank grey cards labelled only with their case file ID.

**Why this matters for gameplay:** Teams can reference previous answers without walking back to the room where they found them. When they reach the final console (R2-10), they open the dossier and read all three required values directly from their case records. The dossier is the memory of the investigation.

**UI:** The folder opens with a physical animation (cover swings open). Cards are flippable — click to see front (clue title, case file ID) and back (extracted answer, timestamp of solve). The case records are designed to look like real investigative case cards — printed form with handwritten fill-ins.

---

## The Dual-Path Fork System

At two points in Round 2, teams face a branching choice. These are the most high-stakes moments of the round.

### Fork 1: The Records Fork (Between Room 4 and Room 5)

**Where:** After the records archive corridor begins, before the control room door.

**What teams see:** A cracked concrete hallway that splits into two arched passages. Left arch has a flickering amber light. Right arch is in complete darkness. Both arches have heavy iron doors visible at the end.

**How the choice is made:** A brass plaque mounted between the two arches reads: `SUB-STATION DELTA — ROUTE SELECTION REQUIRED`. Below the plaque, a rotary selector with two positions: `AUXILIARY WING (A)` and `PRIMARY WING (B)`. Teams press `[E]` on the selector and choose.

**The correct choice** is determined by cross-referencing evidence from Room 4 — specifically, one of the fragments contains a routing document that identifies which wing was sealed vs. which remained active. The correct wing leads to Room 5. The wrong wing leads to the Fork Trap Sequence.

**Fork Trap Sequence (Wrong Choice):**
- The iron door at the end of the wrong arch opens. The player steps through.
- The door slams behind them. Camera shake — the impact is physically violent.
- The player is in a 2×2 metre stone box. No other door. The ceiling is low.
- The flashlight goes out.
- For 4 seconds: silence. The player can hear their own character's breathing — fast, panicked.
- Then scratching from every wall simultaneously — the sound of fingernails on stone, multiple sources, surrounding.
- A single phrase in a voice that is too close: *"Wrong room."*
- Impact. Screen flash to white.
- The player is back at the fork. The wrong arch door is now sealed — heavy iron bars have dropped across it. The routing selector only has one position available.

### Fork 2: The Core Airlock (Between Room 5 and Room 6)

**Where:** At the junction between the control room and the tunnel leading to the vault.

**What teams see:** A heavy hydraulic bulkhead with two manual valve wheels — one on the left housing, one on the right. Each is labelled: `AUXILIARY FEED (A)` and `PRIMARY CONTAINMENT (B)`.

**How the choice is made:** Teams press `[E]` on one of the two wheels and confirm the selection.

**The correct choice** comes from interpreting the radio console evidence — the authentic transmission identifies which feed was authorised by the operational-period director. The wrong choice triggers the Fork Trap Sequence (suffocation variant — pipes burst, black fluid sprays across the screen, gas alarm sounds, 5-second reset).

---

## Horror Layer (Situation-Based, Not Timeline-Based)

All horror events are triggered by player **situation** — what the player is doing, where they are, and how long they have been doing it — not by timestamps.

For the full paranormal event catalog, jumpscare choreography, audio architecture, and shader systems, see: `round2_horror_design.md`.

**Key horror principle: every situation has a horror response.**

| Player Situation | Horror Response |
|:---|:---|
| Player is stationary reading a document | Footsteps begin behind them. Stop when player moves. |
| Player searches a fragment prop | 15% chance of paranormal drawer response instead of normal. |
| Player is at a terminal for 45+ seconds | JS-01 or JS-02 fires (see horror doc). |
| Player approaches the glass cabinet | JS-04 fires. |
| Player opens personnel database to end | JS-07 fires — team name appears. |
| Player enters Room 5 for the first time | Intercom crackles: a voice, mid-sentence, cuts. |
| Player is in Room 5 for 8+ minutes | JS-03 builds in the corner over 10 minutes. |
| Player interacts with monitor bank | JS-05 fires — CCTV shows past 4 minutes + impossible figure. |
| Player commits to wrong fork | Full fork trap sequence (most violent event in game). |
| Player enters vault for the first time | JS-08 fires — door slams, cage is empty. |
| Player approaches cage glass | Core pulse accelerates. Glass develops new cracks. |
| Player enters incorrect code at R2-10 | Screen tear, alarm, cage pulse surge, 5-second lockout. |
| Player submits correct final answer | Victory sequence — last frame shows something changed. |

---

## HUD Design (Round 2)

The HUD is minimal. Everything is diegetic — it looks like it belongs in the world, not in a video game.

**Flashlight indicator:** Not a battery bar. The flashlight beam is the indicator. As battery decays, the cone of light narrows and dims. Players see this directly in the 3D environment.

**Fragment counter:** A small analogue counter in the top-left corner — like a mechanical click-counter used by archivists. Increments visually when a fragment is picked up. Shows `[n] / [total]` as a stamped mechanical number display.

**Case Dossier indicator `[C]`:** A small leather-bound folder icon in the bottom-left. When a new case record is added (clue solved), the icon briefly brightens with an amber glow. No text. No animation beyond the glow.

**Basket indicator `[B]`:** Visible only when the basket has been unlocked (all fragments collected). Before unlock: not shown. After unlock: a small evidence bag icon. When basket reaches 100%: the bag icon shows a lock-open state.

**Crosshair:** A simple `+` mark in `#c8b89a`. It has no glow. When hovering an interactive object, the crosshair gains a very faint amber ring — not a bright highlight, just a subtle indication of interactability. The interact prompt appears in the bottom-center: `[E] [action]` in small monospace text.

**What is NOT in the HUD:** Score. Timer (the countdown board in Room 6 is the timer, visible in 3D). Health. Mini-map. Objective markers.

---

## Content File Structure Notes

Both `content.test.json` and `content.live.json` follow identical schemas. Key differences:

| Field | Test File | Live File |
|:---|:---|:---|
| `title` on clues | `"Test [Name]"` | Real name |
| Fragment `lines` | Placeholder text with `TEST:` prefix | Real story-connected content |
| `answer_plain` on stages | Contains the answer (for dev/CI) | `null` (only `answer_hash` used) |
| Fragment `locate_hint` | `"TEST: search the [object]."` | Real atmospheric hint |
| Clue `scene_text` | `"TEST scene text for [id]."` | Real descriptive text |
| `story_text` in reward | `"TEST: [id] solved."` | Real narrative reward text |

The JSON files do NOT contain information about which clue depends on which other clue. That dependency logic is maintained in the game engine (`app/game/routes.py`) and enforced by the `input_gate` and `unlock.requires_resolved` fields.

---

## Testing Standards (Round 2)

Round 2 must achieve the same 100-test-per-room standard as Round 1.

**Room 4 (records) — 100 tests:**
- 1 E2E full walkthrough (collect all fragments → open basket → solve R2-02 → R2-03 → R2-04 → R2-07 → bulkhead opens)
- Backend: fragment search sequence validation, basket unlock logic, clue gate enforcement, hint progression, wrong-fork reset mechanics
- Frontend: 3D prop hover states, fragment pickup animation, basket modal inspector controls, all 4 clue modal UIs, fork selector behaviour

**Room 5 (control) — 100 tests:**
- 1 E2E full walkthrough
- Backend: same as Room 4 for control room clues
- Frontend: monitor bank CCTV interaction, intercom activation, all 3 clue modal UIs, paper tape scroll completion detection

**Room 6 (vault) — 100 tests:**
- 1 E2E final sequence (arrive → R2-08 → R2-09 → R2-10 → victory)
- Backend: 3-field simultaneous validation on R2-10, round_complete response, team qualification recording
- Frontend: knife switch interactions, split-flap countdown display, fullscreen final console modal, victory sequence animation

---

## Room Progression, Attempt Rules & Leaderboard Timing

### 1. The "All Clues Resolved" Progression Rule (`solved OR exhausted`)
Just like Round 1, each clue strictly enforces **3 attempts max** (`attempts_max: 3`).
To guarantee that teams never get permanently stuck staring at a wall for 60 minutes, room exit doors and bulkhead locks unlock under the **All Clues Resolved** rule:

- A room's exit opens when **every clue in that room is either `solved` OR has all 3 attempts `exhausted`**.
- **Example (Room 4):**
  - `R2-02`: Solved (Clean answer stamped into Case Dossier `[C]`, +100 pts)
  - `R2-03`: Solved (Clean answer stamped into Case Dossier `[C]`, +100 pts)
  - `R2-04`: 3 Failed Attempts (0 pts, marked `EXHAUSTED / FAILED`)
  - `R2-07`: Solved (+100 pts)
  - **Result:** 4/4 clues are resolved. The Bulkhead Door opens! The team advances to Room 5.

### 2. Forensic Consequences of an Exhausted Clue
- If a clue is exhausted, the player earns **0 points** for that clue.
- In their Case Dossier (`[C]`), that clue card shows **`UNVERIFIED / DATA PURGED`**.
- When future interconnected terminals or the Grand Finale (`R2-10`) ask for that forensic datum, **the team does not have it**.
- They can still play Room 5, search props, collect fragments, and solve independent clues, but they cannot achieve a 100% clean containment at `R2-10`. This cleanly separates podium finishers from casual participants on the leaderboard.

### 3. Leaderboard Scoring & Timing Architecture
- **Clock Tracking:**
  - Round start: `rounds.starts_at` (UTC timestamp recorded when Admin starts Round 2).
  - Clue solves: `team_clues.solved_at` (UTC timestamp per solve).
  - Last solve: `team_rounds.last_solved_at`.
- **Elapsed Time Formula:**
  $$\text{Elapsed Time} = (\text{last\_solved\_at} - \text{starts\_at}) + \text{penalty\_seconds}$$
- **Leaderboard Ranking Order:**
  1. **Primary:** Highest Total Score / Most Clues Solved (Descending $\downarrow$)
  2. **Tie-Breaker:** Lowest Adjusted Elapsed Time in minutes and seconds (Ascending $\uparrow$)
- **Trap / Exhaustion Penalties:**
  - Triggering a Wrong Fork Trap adds $+60$ seconds penalty.
  - Burning 3 attempts on a clue gives 0 points and adds $+180$ seconds lockout penalty.


## Team Assignments & Ownership Matrix

| Room | Theme & Setting | Frontend Lead | Backend Lead | Clues / Terminals | Evidence / Fragments | Target Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Room 4: The Rotting Archive** (`records`) | Flooded sub-basement archive. Buckled concrete, dripping ceiling, flickering tubes. | **Darsh** | **Darsh** | `R2-02`, `R2-03`, `R2-04`, `R2-07` (4 clues) | 12 pieces (`ER01`–`ER10`, `XR01`, `XR02` decoys) | **Assigned** |
| **Room 5: The Surveillance Morgue** (`control`) | Narrow observation bunker. 9 cracked CRTs, plastic quarantine sheeting. | **Swapnil** | **Hari Priya** | `R2-01`, `R2-05`, `R2-06` (3 clues) | 10 pieces (`EC01`–`EC08`, `XC01`, `XC02` decoys) | **Assigned** |
| **Room 6: The Anointing Vault** (`vault`) | Occult containment tomb. Suspended rusted iron cage, pulsing flesh organism. | **Swapnil** | **Hari Priya** | `R2-08`, `R2-09`, `R2-10` (3 clues) | None (Master Case Dossier convergence) | **Assigned** |

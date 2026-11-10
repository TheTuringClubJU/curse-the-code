# Curse the Code: Comprehensive Project Master TODO & Development Blueprint

> **Notice:** Round 1 active assignments are detailed below. Round 2 tasks and completed foundational milestones have been moved to the lower sections. All developers must follow the **Room 1 Reference Blueprint** for architecture, performance budgets, and testing standards.

---

## 0. Team Assignments & Round 1 Architecture Matrix

| Room | Theme & Setting | Frontend Developer | Backend Developer | Clues / Terminals | Evidence / Fragments | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Room 1: Lena's Bedroom** | Victorian Gothic / Moonlit Purple | **Darsh** | **Darsh** | `R1-01` to `R1-04` (4 clues) | 15 pieces (13 real + 2 decoys) | **Completed (Gold Reference)** |
| **Room 2: Daniel's Study** | Green CRT / Hacker Investigation | **Subham Das** | **Shahan** | `R1-05` to `R1-08` (4 clues) | 16 pieces (14 real + 2 decoys) | **In Active Development** |
| **Room 3: The Basement** | Industrial Containment Bunker | **Krishnapriya** | **Darsh** | `R1-09`, `R1-10`, `R1-FIN` (3 clues) | 5 pieces (3 real + 2 decoys) | **Completed** |
| **Room 4: The Rotting Archive** | Flooded Sub-Basement / Decay | **Darsh** | **Darsh** | `R2-02`, `R2-03`, `R2-04`, `R2-07` (4 clues) | 12 pieces (`ER01`–`ER10`, `XR01`, `XR02`) | **Completed (Round 2 Reference)** |
| **Room 5: The Surveillance Morgue** | CRT Bunker / Quarantine Plastic | **Swapnil** | **Hari Priya** | `R2-01`, `R2-05`, `R2-06` (3 clues) | 10 pieces (`EC01`–`EC08`, `XC01`, `XC02`) | **Assigned** |
| **Room 6: The Anointing Vault** | Occult Containment Tomb / Flesh Core | **Swapnil** | **Hari Priya** | `R2-08`, `R2-09`, `R2-10` (3 clues) | Master Case Dossier Convergence | **Assigned** |

### Round 1 Master Test Target
- **Total Tests for Round 1:** Exactly **300 Automated Tests**
  - **Room 1 (Bedroom):** 100 Tests (1 E2E Full Walkthrough + 99 Unit/Integration Tests)
  - **Room 2 (Study):** 100 Tests (1 E2E Full Walkthrough + 99 Unit/Integration Tests)
  - **Room 3 (Basement):** 100 Tests (1 E2E Full Walkthrough + 99 Unit/Integration Tests)

---

## 1. Golden Reference Blueprint: How Room 1 Was Built & Optimized

Every developer working on Room 2 (Subham & Shahan) and Room 3 (Krishnapriya & Vishad) **must** follow the patterns established in Room 1:

### 1.1 Frontend Performance & Three.js Architecture
1. **Single Source of Truth for Controls (`controls.js`):**
   - Never attach independent keyboard event listeners that mutate camera coordinates. All movement is handled in `controls.js` via PointerLockControls and smooth delta-time vector accumulation.
   - Modal states (`BasketModal`, `CaseFilesModal`, `ClueModal`, `PhotoPuzzleModal`) automatically unlock the mouse cursor and pause movement.
2. **100% Tangible & Visible Objects (All Fragment Props Are Interactive with [E]):**
   - Every single object defined across all rooms in both `content.test.json` and `content.live.json` strictly carries `"visible": true`.
   - Never use invisible proxy hitboxes, transparent collision planes, or phantom raycast meshes. Every single interactive prop (`interactive_fragment`, `clue_entry`, `room_door`) is an actual, visible 3D mesh that players can visually locate and examine.
   - **Crucial Clarification on "hiding" in JSON vs 3D Game:** In backend JSON schemas, the category `"kind": "hiding"` is purely a database taxonomy label indicating that an object contains a hidden evidence fragment. In the actual 3D room, **these objects are NOT hidden or passive**. Every single fragment-holding object is a fully clickable, inspectable 3D prop. Developers MUST attach `interact(mesh, objectId)`, emissive hover highlighting, and the `[E] Search <Object>` interaction handler to every fragment prop.
   - The central crosshair raycaster directly targets the real visible mesh tagged with `mesh.userData.id = object_id`.
3. **Exact Lag-Free Optimization Blueprint (No GLB, No Heavy Textures):**
   - **Zero External 3D Models (No .glb / .gltf):** We do NOT load any external `.glb` or `.gltf` model files. All furniture, fixtures, terminals, and props are built 100% procedurally in memory using Three.js geometric primitives (`THREE.BoxGeometry`, `THREE.CylinderGeometry`, `THREE.PlaneGeometry`, `THREE.SphereGeometry`, `THREE.RingGeometry`). This completely eliminates network asset stalls, async model load freezes, and WebGL parser lag.
   - **Geometry Merging (`BufferGeometryUtils.mergeGeometries` — Dozens of Meshes Collapsed into 1):**
     - Never leave complex multi-part props as dozens of separate `THREE.Mesh` objects in the scene graph (which would flood the GPU with hundreds of separate draw calls).
     - In Room 1, sub-geometries are batched into arrays and merged into **a single combined mesh** via `BufferGeometryUtils.mergeGeometries(geos)`.
     - *Room 1 Proof:* Bookshelf books (`scene.js:99`): Over 40 individual books with custom widths, heights, leans, and shelf placements were merged by color into **1 single Mesh per leather tint** (reducing 40+ draw calls down to 4).
     - *Room 1 Proof:* Background trees/branches (`decor.js:61`): Hundreds of procedural recursive tree limbs and branch segments were merged into **1 single Mesh** (`tm`)!
     - *Rule for Subham (Room 2):* Group and merge all Study desk paper piles, sticky notes on the wall, corkboard pins, bookshelf rows, and cable bundles into single merged meshes.
     - *Rule for Krishnapriya (Room 3):* Group and merge all Basement server rack drive bays, cooling vent louvers, floor pipe conduits, and toolbox compartments into single merged meshes.
   - **Unit Primitive Scaling (`scale.set(w, h, d)` & `scale.setScalar(s)`):**
     - Do NOT allocate fresh geometry objects for every minor size difference. Allocate a **single base unit primitive** (e.g. `THREE.BoxGeometry(1, 1, 1)` or `THREE.CylinderGeometry(0.5, 1, 1, 6)`) and scale it to dimension using `mesh.scale.set(w, h, d)`, `geo.scale(r, len, r)`, or `group.scale.setScalar(s)`.
     - Sharing identical base geometry buffers across dozens of props drops GPU geometry memory overhead to nearly zero.
   - **Aggressive Low-Poly Polygon Reduction:**
     - Avoid Three.js default segment counts (which default to 32 radial segments on cylinders and 32x16 on spheres).
     - Cylinders reduced to **6 to 14 radial segments** (e.g. candle wax `14`, branches `6`, spider legs `6`, pipes `8`).
     - Spheres reduced to **10x8 or 14x10 segments** (e.g. candy, eyes, knobs, doll joints).
     - Result: Cut scene polygon counts by **over 70%** while preserving sharp gothic visual silhouettes.
   - **Procedural 2D Canvas Textures (0 Bytes Network Download):** We do NOT download 1MB/2MB/5MB image textures from disk or network for 3D surfaces. All wood grain, aged paper slips, wallpaper, worn leather, and plaster are generated dynamically on startup in memory using 2D HTML5 Canvas (`createCanvas`) and wrapped in `THREE.CanvasTexture`. Total network download for 3D room textures: **0 bytes**!
   - **Shared Material Palettes:** Materials (`MeshLambertMaterial`, `MeshStandardMaterial`) are instantiated once in a shared palette and reused across meshes, completely preventing GPU shader compilation stutter and WebGL pipeline switching.
   - **Zero-Allocation In-Place Emissive Highlighting:** Hover highlighting (`hl(id, 1)` and `hl(id, 0)`) directly modifies `mesh.material.emissive` color in-place without cloning meshes, spawning extra outline geometry, or running expensive post-processing passes.
   - **Unified Delta-Time Loop:** A single `requestAnimationFrame` loop in `engine.js` drives camera physics, lamp flicker, door animation, and rendering with delta-time clamping (`dt = Math.min(0.05, (now - last) / 1000)`).
   - **Hardware & Rendering Budgets:** Locked 60 FPS at 1280x720 on integrated graphics with `< 250 draw calls` per room scene. Max 1 directional/moon light with shadows, 1 ambient hemi-light, and at most 1–2 dynamic point lights with bounded decay.
4. **Direct Modular Reusability:**
   - Do **NOT** rewrite modals from scratch! Reuse:
     - `HUD.jsx`: Displays real-time fragment counters, clue counts, photo counts, and shortcut pills (`[B]`, `[C]`, `[P]`, `[E]`).
     - `BasketModal.jsx`: Forensic fragment table with real PNG thumbnails and contrast/brightness/invert inspector.
     - `CaseFilesModal.jsx`: Minimal, zero-spoiler clue progress list (shows only `Clue 1..4`, attempt counts `X/3`, and solved badges).
     - `ClueModal.jsx`: Standardized terminal interface with scrap assembly trays, contrast sliders, and dual-mode submission.
     - `RoomCompleteModal.jsx`: Room cleared celebration overlay.

### 1.2 Backend Cryptographic Verification & Concurrency Architecture
1. **Dual-HMAC & Plain Array Validation (`app/game/routes.py`):**
   - Always verify clue submissions using HMAC-SHA256 with `answer_salt` over `f"{clue_id}:{stage_idx}:{normalized_answer}"`.
   - In test mode, always support dual-comparison against `answer_plain` array in `content.test.json`.
2. **Sequential Fragment Drop Hunt (`/api/game/room/{room_id}/search`):**
   - Players inspect and search interactive fragment objects by walking up to them and pressing `E` (or clicking).
   - Pieces drop sequentially. Decoy fragments are placed strategically and appear identical to real pieces.
   - When all fragments for the room are collected, the backend updates `is_basket_unlocked = TRUE` in `team_rooms`.
3. **Exit Door Mechanics:**
   - The exit door remains deadbolted until all room clues are marked `solved = TRUE`.
   - When the final clue of a room is solved, the submission response returns `room_completed: true`, triggering the 3D door swing animation (`engine.openDoor()`).

---

## 2. Room 2: Daniel's Study (The Hacker Study)

### 2.1 Ownership & Roles
- **Frontend Lead:** **Subham Das** (`frontend/src/game/rooms/study.js`, `frontend/src/game/Room2Study.jsx`)
- **Backend Lead:** **Shahan** (`app/game/routes.py`, `app/game/study_service.py`)

### 2.2 Scene Atmosphere & Visual Spec
- **Mood & Palette:** Green-black phosphor CRT aesthetic. Gradient `#04120b` to `#0b2418`, accent `#3dff8b`, glow `#7dffb0`, text `#b6ffd1`.
- **Lighting & FX:** Screen glow bleeding across heavy mahogany desk, subtle 6% CRT scanline overlay, random 150 ms glitch flicker every 10–20 seconds, rain beating against window pane.
- **Audio:** Low 60 Hz CRT transformer hum, typewriter clatter, and occasional binaural whisper.

### 2.3 Object Inventory (20 Objects Strictly Defined in `content.test.json`)

| Object ID | Label in JSON | Role | Placement & Visuals | Holds Fragment |
| :--- | :--- | :--- | :--- | :--- |
| `tablet_drawer` | Locked desk drawer | `clue_entry` (`R1-05`) | Under desk edge at `x: -1.2, z: -0.5`. Houses cracked tablet. | *None* |
| `crt_monitor` | Old CRT monitor | `clue_entry` (`R1-06`) | Center of heavy desk at `x: 0.0, z: -0.8`. Flickering green terminal. | *None* |
| `terminal_pc` | Terminal PC | `clue_entry` (`R1-07`) | Right side of desk at `x: 0.9, z: -0.8`. Beige tower with crash dump. | *None* |
| `line_printer` | Dot-matrix printer | `clue_entry` (`R1-08`) | Side table at `x: 1.8, z: -0.4`. Continuous fan-fold paper feed. | *None* |
| `bookshelf` | Bookshelf | `interactive_fragment` (Inspect with `E`) | West wall at `x: -2.8, z: 0.0`. Tall mahogany shelves packed with manuals. | `ES01` & `EK03` |
| `corkboard` | Corkboard with red string | `interactive_fragment` (Inspect with `E`) | North-east wall at `x: 1.5, z: -2.8`. Conspiracy diagram with pins. | `ES02` & `ES09` |
| `desk_blotter` | Desk blotter | `interactive_fragment` (Inspect with `E`) | Flat on center desk. Green leather pad with gold trim. | `ES03` |
| `filing_cabinet` | Filing cabinet | `interactive_fragment` (Inspect with `E`) | Corner at `x: -2.6, z: -2.5`. 4-drawer metal cabinet. | `ES04` & `ES10` |
| `sticky_wall` | Sticky-note wall | `interactive_fragment` (Inspect with `E`) | North-west wall at `x: -1.8, z: -2.9`. Covered in layered yellow notes. | `ES05` |
| `armchair` | Armchair | `interactive_fragment` (Inspect with `E`) | Reading nook at `x: -2.0, z: 1.5`. Worn leather chair with deep cushions. | `ES06` |
| `reel_recorder` | Reel recorder | `interactive_fragment` (Inspect with `E`) | Audio cart at `x: 2.2, z: 1.0`. Vintage dual-reel magnetic tape deck. | `ES07` & `EK02` |
| `cable_bundle` | Cable bundle | `interactive_fragment` (Inspect with `E`) | Floor under desk at `x: -0.5, z: -1.1`. Tangled server ribbon cables. | `ES08` |
| `floor_lamp` | Floor lamp | `interactive_fragment` (Inspect with `E`) | Beside armchair at `x: -2.6, z: 1.8`. Standing brass lamp with fabric shade. | `ES11` |
| `wastebin` | Waste bin | `interactive_fragment` (Inspect with `E`) | Under desk right at `x: 1.1, z: -0.9`. Mesh bin with crumpled printouts. | `ES12` |
| `window` | Window | `interactive_fragment` (Inspect with `E`) | East wall at `x: 2.9, z: 0.0`. Rain streaking glass with wide sill. | `XS01` (Decoy) |
| `radiator` | Radiator | `interactive_fragment` (Inspect with `E`) | Under window at `x: 2.9, z: 0.2`. Cast-iron heating pipes. | `XS02` (Decoy) |
| `desk` | Heavy desk | `decor` | Center of room. Massive carved oak executive desk. | *None* |
| `rug` | Rug | `decor` | Center floor. Faded Persian rug `#1a3324`. | *None* |
| `beams_webs` | Beams and webs | `decor` | Ceiling rafters with dusty volumetric cobwebs. | *None* |
| `coat_stand` | Coat stand | `decor` | Entrance corner at `x: 2.2, z: 2.5`. Wooden stand with trenchcoat. | *None* |
| `study_door_back` | Bedroom Return Door | `interactive` | South wall at `x: -2.5, z: 2.9`. Door returning to Lena's Bedroom. | *None* |
| `study_door_exit` | Basement Exit Door | `interactive` | North wall at `x: 0.0, z: -2.95`. Heavy steel door leading to Basement. | *None* |

### 2.4 Clues & Cryptographic Solutions (Room 2)
1. **`R1-05` (Test Tablet - `tablet_drawer`):**
   - **Method:** Binary ASCII / Sticky Note conversion.
   - **Prompt:** *"Enter the tablet passcode (a word)."*
   - **Expected Answer:** `ALPHA` (HMAC: `4152e40ed00e...`)
   - **Reward:** Photo Piece `P05`
2. **`R1-06` (Test Email - `crt_monitor`):**
   - **Method:** Base64 decode of unsent draft attachment.
   - **Prompt:** *"What must never be sent from inside? (one word)"*
   - **Expected Answer:** `SIGNAL` (HMAC: `76e4af1848ad...`)
   - **Reward:** Photo Piece `P06`
3. **`R1-07` (Test Log - `terminal_pc`):**
   - **Method:** Hex crash dump analysis & memory offset parsing.
   - **Prompt:** *"Which process caused the fatal crash in the crash log? (name only)"*
   - **Expected Answer:** `ORBIT` (HMAC: `7afa8837b2ea...`)
   - **Reward:** Photo Piece `P07`
4. **`R1-08` (Test Access Log - `line_printer`):**
   - **Method:** Log filtering & chronological timestamp anomaly detection.
   - **Prompt:** *"Which source ID logged in at an impossible time?"*
   - **Expected Answer:** `SRC-TEST9` (HMAC: `e619227c71a3...`)
   - **Reward:** Photo Piece `P08`

### 2.5 Detailed Tasks for Subham Das (Frontend)
- [ ] **FE-R2-01** Create `frontend/src/game/rooms/study.js` with 3D coordinate layout for all 20 objects, green ambient lighting, and door pivots.
- [ ] **FE-R2-02** Build `frontend/src/game/Room2Study.jsx` integrating `engine.js` and hooking into `/api/game/room/study`.
- [ ] **FE-R2-03** Create custom terminal skins for Study clue modals:
  - `TabletPasscodeModal`: Cracked tablet interface with flip button revealing sticky note.
  - `CrtEmailModal`: Monospace green-phosphor email client with base64 copy buffer.
  - `CrashDumpModal`: Hex viewer with offset highlight and copy capability.
  - `LinePrinterModal`: Continuous printout viewer with search filter.
- [ ] **FE-R2-04** Implement 16 PNG evidence fragments (`ES01`–`ES12`, `EK02`, `EK03`, `XS01`, `XS02`) in `frontend/public/evidence/study/`.
- [ ] **FE-R2-05** Hook keyboard shortcuts: `E` (Search/Interact), `B` (Basket), `C` (Clues Status: 4 study clues), `P` (Photo pieces 5/10).
- [ ] **FE-R2-06** Implement 3D Basement exit door animation with iron deadbolt sound and green clearance beacon when all 4 clues are solved.
- [ ] **FE-R2-07** Implement backward traversal through `study_door_back` allowing players to revisit Room 1.
- [ ] **FE-R2-08** Maintain 60 FPS performance budget and `< 250 draw calls`.

### 2.6 Detailed Tasks for Shahan (Backend)
- [ ] **BE-R2-01** Wire `study` room metadata in `app/game/routes.py` and ensure `/api/game/room/study` returns valid object states.
- [ ] **BE-R2-02** Implement `/api/game/room/study/search` supporting the 14 real + 2 decoy fragment drop progression.
- [ ] **BE-R2-03** Implement auto-unlock for Room 2 Evidence Basket when 16/16 fragments are collected.
- [ ] **BE-R2-04** Implement submission endpoints for `R1-05`, `R1-06`, `R1-07`, and `R1-08` with dual-HMAC and `answer_plain` array matching.
- [ ] **BE-R2-05** Add tailored failure messages per clue (e.g., *"Check your binary byte groups"*, *"Invalid base64 padding"*, *"Verify timestamp timezone"*).
- [ ] **BE-R2-06** Enforce max 3 attempts per clue and record detailed progress in Neon PostgreSQL `team_clues`.
- [ ] **BE-R2-07** Trigger `room_completed: true` upon solving all 4 study clues and award Photo Pieces `P05`–`P08`.

---

## 3. Room 3: The Basement (The Containment Cellar)

### 3.1 Ownership & Roles
- **Frontend Lead:** **Krishnapriya** (`frontend/src/game/rooms/basement.js`, `frontend/src/game/Room3Basement.jsx`)
- **Backend Lead:** **Vishad** (`app/game/routes.py`, `app/game/basement_service.py`)

### 3.2 Scene Atmosphere & Visual Spec
- **Mood & Palette:** Industrial bunker, concrete slabs, red emergency strobe. Gradient `#14161a` to `#1f1115`, accent `#ff4d4d`, glow `#ff8a8a`, text `#ffd6d6`.
- **Lighting & FX:** Flashing red beacon `#ff2a2a` with rotating strobe effect, particle steam leaking from overhead pipes, heavy vignette.
- **Audio:** High-voltage server rack fan hum, rhythmic water pipe drips, deep subwoofer heartbeat pulse that accelerates under 5 minutes.

### 3.3 Object Inventory (11 Objects Strictly Defined in `content.test.json`)

| Object ID | Label in JSON | Role | Placement & Visuals | Holds Fragment |
| :--- | :--- | :--- | :--- | :--- |
| `intercom` | Wall intercom | `clue_entry` (`R1-09`) | East concrete wall at `x: 2.8, z: 0.5`. Yellowed intercom with speaker grille. | *None* |
| `rack_door` | Server rack door with note | `clue_entry` (`R1-10`) | Server cabinet at `x: -2.2, z: -1.0`. Perforated metal door with yellow note taped inside. | *None* |
| `containment_console` | Containment console | `clue_entry` (`R1-FIN`) | South wall at `x: 0.0, z: -2.8`. Massive triple-screen steel console. | *None* |
| `server_rack` | Server rack | `interactive_fragment` (Inspect with `E`) | West wall at `x: -2.5, z: 0.0`. 42U rack with blinking blue/red activity LEDs. | `EK04` & `XK02` |
| `maintenance_terminal` | Maintenance terminal | `interactive_fragment` (Inspect with `E`) | Beside rack at `x: -2.2, z: 1.2`. Wall-mounted CRT terminal with audio headphone jack. | `EK05` |
| `toolbox` | Toolbox | `interactive_fragment` (Inspect with `E`) | Concrete floor at `x: 1.8, z: -1.5`. Heavy red steel mechanics toolbox. | `EK06` |
| `floor_seal` | Circular floor seal | `interactive_fragment` (Inspect with `E`) | Center floor at `x: 0.0, z: 0.0`. 2-meter steel vault hatch with runic perimeter. | `XK01` (Decoy) |
| `wall_monitor` | Countdown monitor | `decor` | High on north wall at `x: 0.0, z: 2.8`. Large 7-segment digital countdown clock. | *None* |
| `pipes` | Pipes and steam | `decor` | Ceiling overhead. Insulated steam pipes with particle smoke vents. | *None* |
| `barrels` | Barrels and crates | `decor` | South-west corner at `x: -2.0, z: 2.2`. Wooden cargo crates and sealed drums. | *None* |
| `fuse_box` | Fuse box | `decor` | Beside door at `x: 2.6, z: -2.2`. Industrial electrical breaker box. | *None* |

### 3.4 Clues & Cryptographic Solutions (Room 3)
1. **`R1-09` (Test Physical QR Terminal - `intercom`):**
   - **Method:** Physical QR code card inspection & authentication PIN.
   - **Prompt:** *"Enter the authorization passcode obtained from the physical QR card."*
   - **Expected Answer:** `QR92` (HMAC: `9661d6eee858...`)
   - **Reward:** Photo Piece `P09`
2. **`R1-10` (Test Note - `rack_door`):**
   - **Method:** Vigenère cipher / margin note decryption.
   - **Prompt:** *"What does the note say to do with the flag? (one word)"*
   - **Expected Answer:** `LOWER` (HMAC: `9be62fcea12d...`)
   - **Reward:** Photo Piece `P10`
3. **`R1-FIN` (Test Containment Terminal - `containment_console`):**
   - **3-Stage Multi-Phase Final Clue:**
     - **Stage 1 (Keywords):** Enter the 3 master keywords recovered from previous rooms (`LANTERN`, `ORBIT`, `SRC-TEST9`).
     - **Stage 2 (10-Piece Photo Reconstruction):** Assemble all 10 Photo Pieces (`P01` to `P10`) into the correct sequence:
       `P06` → `P01` → `P08` → `P03` → `P10` → `P05` → `P02` → `P09` → `P04` → `P07`.
     - **Stage 3 (Protocol Choice & PIN):** Select the containment protocol and enter the final PIN:
       Protocol: `BETA`, PIN: `2468`.
   - **Reward:** Unlocks Round 1 Victory & disengages the subterranean vault seal to Round 2!

### 3.5 Detailed Tasks for Krishnapriya (Frontend)
- [x] **FE-R3-01** Create `frontend/src/game/rooms/basement.js` with industrial bunker materials, flashing red strobe lights, and steam emitters.
- [x] **FE-R3-02** Build `frontend/src/game/Room3Basement.jsx` integrating `engine.js` and server state from `/api/game/room/basement`.
- [x] **FE-R3-03** Build clue modals for Basement:
  - `IntercomQrModal`: Wall intercom interface with QR passcode input and audio tone playback.
  - `ServerRackNoteModal`: Perforated metal rack door viewer with margin cipher inspection.
  - `FinalContainmentTerminalModal`: Comprehensive 3-stage modal (Keyword tri-inputs, interactive 10-piece drag-and-drop Photo Board, Protocol selector, and PIN pad).
- [x] **FE-R3-04** Sync `wall_monitor` with `/api/time` server clock to render live, synchronized countdown in 3D.
- [x] **FE-R3-05** Implement 5 PNG evidence fragments (`EK04`, `EK05`, `EK06`, `XK01`, `XK02`) in `frontend/public/evidence/basement/`.
- [x] **FE-R3-06** Implement Round 1 Grand Finale victory cinematic and transition overlay to Round 2.
- [x] **FE-R3-07** Maintain 60 FPS performance budget and `< 250 draw calls`.

### 3.6 Detailed Tasks for Vishad (Backend)
- [x] **BE-R3-01** Wire `basement` room state in `app/game/routes.py` and manage locked state until Room 2 is completed.
- [x] **BE-R3-02** Implement `/api/game/room/basement/search` supporting the 3 real + 2 decoy fragments.
- [x] **BE-R3-03** Implement auto-unlock for Basement Evidence Basket when 5/5 fragments are collected.
- [x] **BE-R3-04** Implement submission endpoints for `R1-09` and `R1-10` with dual-HMAC verification.
- [x] **BE-R3-05** Implement multi-stage submission engine for `R1-FIN`:
  - Stage 1: Validate array `['LANTERN', 'ORBIT', 'SRC-TEST9']`.
  - Stage 2: Validate photo piece permutation `['P06', 'P01', 'P08', 'P03', 'P10', 'P05', 'P02', 'P09', 'P04', 'P07']`.
  - Stage 3: Validate `['BETA', '2468']` and record official Round 1 completion timestamp in `team_rooms`.
- [x] **BE-R3-06** Enforce atomic database transactions to prevent race conditions during final terminal submission.
- [x] **BE-R3-07** Issue Round 1 completion status (qualification managed strictly via Admin Portal).

---

## 4. The 300-Test Suite for Round 1 (100 Tests Per Room)

Each room has a dedicated suite of **100 tests**:
- **1 End-to-End (E2E) Test:** Full, real-time participant journey from spawn to exit door unbolting.
- **99 Unit & Integration Tests:** 50 Backend tests + 49 Frontend tests covering every component, endpoint, cryptographic algorithm, and UX edge case.

---

### 4.1 Room 1 (Lena's Bedroom) Test Suite (100 Tests)

#### E2E Full Walkthrough Test (1 Test)
- [ ] `QA-R1-E2E-01` **`e2e_bedroom_complete_participant_journey`**
  *Full browser automation simulating a team:*
  1. Log into team session and enter Lena's Bedroom.
  2. Walk using WASD to all 15 interactive fragment props and press `E` (or click) to inspect and recover all 15 evidence fragments.
  3. Verify `HUD` shows `15/15` fragments and basket unseals.
  4. Press `B` to open `BasketModal`, inspect scraps, and verify real PNG rendering.
  5. Approach `diary`, press `E`, decrypt Caesar shift -5, submit `LANTERN`, verify `P01` awarded.
  6. Approach `notebook`, press `E`, decrypt Caesar shift -3, submit `SUNRISE`, verify `P02` awarded.
  7. Approach `poster`, press `E`, assemble scraps in tray, adjust contrast, submit `07/04/2001`, verify `P03` awarded.
  8. Approach `portrait`, press `E`, inspect reverse canvas, submit `SHADOW`, verify `P04` awarded.
  9. Press `C` to verify `CaseFilesModal` displays `4 / 4 Solved` and attempt counts without spoilers.
  10. Verify `RoomCompleteModal` triggers, 3D exit door swings open on hinge, and walking to door prompts Room 2 transition.

#### Backend Unit & Integration Tests (50 Tests - Darsh)
- [ ] `QA-R1-BE-01` `test_bedroom_initial_state_locked_basket_and_unsolved_clues`
- [ ] `QA-R1-BE-02` `test_bedroom_search_hiding_spot_returns_first_sequential_fragment`
- [ ] `QA-R1-BE-03` `test_bedroom_search_locked_fragment_returns_generic_locked_message`
- [ ] `QA-R1-BE-04` `test_bedroom_search_empty_object_returns_nothing_found`
- [ ] `QA-R1-BE-05` `test_bedroom_search_decoy_fragments_XB01_and_XB02`
- [ ] `QA-R1-BE-06` `test_bedroom_search_duplicate_returns_already_found`
- [ ] `QA-R1-BE-07` `test_bedroom_auto_unlock_basket_when_15_fragments_collected`
- [ ] `QA-R1-BE-08` `test_bedroom_basket_remains_locked_at_14_fragments`
- [ ] `QA-R1-BE-09` `test_bedroom_clue_R1_01_hmac_sha256_correct_answer`
- [ ] `QA-R1-BE-10` `test_bedroom_clue_R1_01_plain_text_array_match`
- [ ] `QA-R1-BE-11` `test_bedroom_clue_R1_01_case_insensitive_normalization`
- [ ] `QA-R1-BE-12` `test_bedroom_clue_R1_01_wrong_answer_increments_attempt`
- [ ] `QA-R1-BE-13` `test_bedroom_clue_R1_01_max_3_attempts_exhaustion`
- [ ] `QA-R1-BE-14` `test_bedroom_clue_R1_01_awards_photo_piece_P01`
- [ ] `QA-R1-BE-15` `test_bedroom_clue_R1_02_hmac_sha256_correct_answer`
- [ ] `QA-R1-BE-16` `test_bedroom_clue_R1_02_whitespace_stripping`
- [ ] `QA-R1-BE-17` `test_bedroom_clue_R1_02_wrong_answer_message_format`
- [ ] `QA-R1-BE-18` `test_bedroom_clue_R1_02_awards_photo_piece_P02`
- [ ] `QA-R1-BE-19` `test_bedroom_clue_R1_03_date_normalization_mm_dd_yyyy`
- [ ] `QA-R1-BE-20` `test_bedroom_clue_R1_03_numeric_only_sanitization`
- [ ] `QA-R1-BE-21` `test_bedroom_clue_R1_03_dual_hmac_hash_match`
- [ ] `QA-R1-BE-22` `test_bedroom_clue_R1_03_custom_error_message_format`
- [ ] `QA-R1-BE-23` `test_bedroom_clue_R1_03_awards_photo_piece_P03`
- [ ] `QA-R1-BE-24` `test_bedroom_clue_R1_04_hmac_sha256_correct_answer`
- [ ] `QA-R1-BE-25` `test_bedroom_clue_R1_04_awards_photo_piece_P04`
- [ ] `QA-R1-BE-26` `test_bedroom_clues_endpoint_unauthorized_without_session_token`
- [ ] `QA-R1-BE-27` `test_bedroom_submission_with_invalid_token_returns_401`
- [ ] `QA-R1-BE-28` `test_bedroom_submission_to_nonexistent_clue_returns_404`
- [ ] `QA-R1-BE-29` `test_bedroom_submission_when_already_solved_returns_idempotent_true`
- [ ] `QA-R1-BE-30` `test_bedroom_submission_when_exhausted_rejects_with_exhausted_flag`
- [ ] `QA-R1-BE-31` `test_bedroom_room_completion_flag_false_when_3_clues_solved`
- [ ] `QA-R1-BE-32` `test_bedroom_room_completion_flag_true_when_all_4_solved`
- [ ] `QA-R1-BE-33` `test_bedroom_room_status_persists_in_team_rooms_table`
- [ ] `QA-R1-BE-34` `test_bedroom_clue_attempts_persist_in_team_clues_table`
- [ ] `QA-R1-BE-35` `test_bedroom_concurrent_submissions_for_same_team_are_serialized`
- [ ] `QA-R1-BE-36` `test_bedroom_rate_limit_30_submissions_per_minute`
- [ ] `QA-R1-BE-37` `test_bedroom_session_limit_blocks_third_concurrent_device`
- [ ] `QA-R1-BE-38` `test_bedroom_brute_force_lockout_after_8_failed_logins`
- [ ] `QA-R1-BE-39` `test_bedroom_etag_caching_on_room_state_polling`
- [ ] `QA-R1-BE-40` `test_bedroom_photo_pieces_tally_matches_distinct_solved_clues`
- [ ] `QA-R1-BE-41` `test_bedroom_answer_salt_loaded_from_content_file_meta`
- [ ] `QA-R1-BE-42` `test_bedroom_score_awarded_100_points_per_solved_clue`
- [ ] `QA-R1-BE-43` `test_bedroom_score_zero_points_on_failed_attempts`
- [ ] `QA-R1-BE-44` `test_bedroom_no_points_leak_in_client_facing_json`
- [ ] `QA-R1-BE-45` `test_bedroom_no_hashes_leak_in_client_facing_json`
- [ ] `QA-R1-BE-46` `test_bedroom_database_transaction_rollback_on_submission_error`
- [ ] `QA-R1-BE-47` `test_bedroom_exit_door_status_locked_in_state_before_4_solves`
- [ ] `QA-R1-BE-48` `test_bedroom_exit_door_status_unlocked_in_state_after_4_solves`
- [ ] `QA-R1-BE-49` `test_bedroom_submitting_answer_with_special_characters_sanitized`
- [ ] `QA-R1-BE-50` `test_bedroom_reloading_content_file_updates_room1_metadata`

#### Frontend Unit & Integration Tests (49 Tests - Darsh)
- [ ] `QA-R1-FE-01` `test_room1_bedroom_mounts_canvas_without_errors`
- [ ] `QA-R1-FE-02` `test_room1_threejs_renderer_disposes_cleanly_on_unmount`
- [ ] `QA-R1-FE-03` `test_room1_controls_single_source_of_truth_in_controls_js`
- [ ] `QA-R1-FE-04` `test_room1_wasd_keys_update_camera_velocity`
- [ ] `QA-R1-FE-05` `test_room1_mouse_movement_updates_yaw_and_pitch`
- [ ] `QA-R1-FE-06` `test_room1_pointer_lock_engages_on_click`
- [ ] `QA-R1-FE-07` `test_room1_pointer_lock_releases_on_esc`
- [ ] `QA-R1-FE-08` `test_room1_hud_renders_room_title_and_fragment_counter`
- [ ] `QA-R1-FE-09` `test_room1_hud_displays_shortcut_keys_B_C_P_E`
- [ ] `QA-R1-FE-10` `test_room1_pressing_B_toggles_basket_modal_and_unlocks_cursor`
- [ ] `QA-R1-FE-11` `test_room1_pressing_B_again_closes_basket_modal_and_relocks_cursor`
- [ ] `QA-R1-FE-12` `test_room1_pressing_C_toggles_case_files_modal_and_unlocks_cursor`
- [ ] `QA-R1-FE-13` `test_room1_case_files_modal_shows_clue_1_to_4_labels_only`
- [ ] `QA-R1-FE-14` `test_room1_case_files_modal_shows_attempts_ratio_per_clue`
- [ ] `QA-R1-FE-15` `test_room1_case_files_modal_never_shows_object_locations`
- [ ] `QA-R1-FE-16` `test_room1_case_files_modal_never_shows_cipher_methods`
- [ ] `QA-R1-FE-17` `test_room1_case_files_modal_never_shows_decrypted_solutions`
- [ ] `QA-R1-FE-18` `test_room1_pressing_P_toggles_photo_puzzle_modal`
- [ ] `QA-R1-FE-19` `test_room1_photo_puzzle_modal_renders_10_slots_with_active_pieces`
- [ ] `QA-R1-FE-20` `test_room1_raycaster_detects_trunk_object_and_shows_prompt`
- [ ] `QA-R1-FE-21` `test_room1_pressing_E_on_hiding_spot_triggers_search_api`
- [ ] `QA-R1-FE-22` `test_room1_toast_notification_displays_found_fragment_message`
- [ ] `QA-R1-FE-23` `test_room1_basket_renders_png_thumbnails_with_200_status`
- [ ] `QA-R1-FE-24` `test_room1_basket_inspector_applies_contrast_slider_filter`
- [ ] `QA-R1-FE-25` `test_room1_basket_inspector_applies_brightness_slider_filter`
- [ ] `QA-R1-FE-26` `test_room1_basket_inspector_toggles_invert_filter`
- [ ] `QA-R1-FE-27` `test_room1_clue_modal_opens_matching_clue_when_pressing_E_on_diary`
- [ ] `QA-R1-FE-28` `test_room1_clue_modal_shows_sealed_notice_when_basket_unlocked_false`
- [ ] `QA-R1-FE-29` `test_room1_clue_modal_allows_typing_e_key_inside_input_without_triggering_interact`
- [ ] `QA-R1-FE-30` `test_room1_clue_modal_disables_submit_button_while_pending`
- [ ] `QA-R1-FE-31` `test_room1_poster_clue_modal_renders_interactive_scrap_tray`
- [ ] `QA-R1-FE-32` `test_room1_poster_clue_tray_moves_scraps_left_and_right`
- [ ] `QA-R1-FE-33` `test_room1_poster_clue_tray_indicates_correct_assembly_order`
- [ ] `QA-R1-FE-34` `test_room1_portrait_clue_modal_toggles_canvas_reverse_view`
- [ ] `QA-R1-FE-35` `test_room1_clue_modal_displays_inline_error_message_on_wrong_answer`
- [ ] `QA-R1-FE-36` `test_room1_clue_modal_displays_solved_badge_when_solved`
- [ ] `QA-R1-FE-37` `test_room1_submitting_fourth_clue_triggers_room_complete_modal`
- [ ] `QA-R1-FE-38` `test_room1_room_complete_modal_shows_4_of_4_solved_recap`
- [ ] `QA-R1-FE-39` `test_room1_exit_door_hinge_rotates_90_degrees_smoothly`
- [ ] `QA-R1-FE-40` `test_room1_approaching_open_door_shows_corridor_transition_prompt`
- [ ] `QA-R1-FE-41` `test_room1_pressing_E_on_open_door_triggers_room_transition`
- [ ] `QA-R1-FE-42` `test_room1_ambient_audio_plays_and_respects_global_mute`
- [ ] `QA-R1-FE-43` `test_room1_lamp_flicker_respects_reduced_motion_preference`
- [ ] `QA-R1-FE-44` `test_room1_draw_calls_remain_under_250_budget`
- [ ] `QA-R1-FE-45` `test_room1_frame_rate_maintains_60fps_on_benchmark_loop`
- [ ] `QA-R1-FE-46` `test_room1_texture_memory_footprint_under_25mb`
- [ ] `QA-R1-FE-47` `test_room1_window_resize_recalculates_camera_aspect_ratio`
- [ ] `QA-R1-FE-48` `test_room1_doll_head_tracking_stops_when_cursor_unlocked`
- [ ] `QA-R1-FE-49` `test_room1_case_files_modal_closes_cleanly_on_close_button_click`

---

### 4.2 Room 2 (Daniel's Study) Test Suite (100 Tests)

#### E2E Full Walkthrough Test (1 Test - Subham Das & Shahan)
- [ ] `QA-R2-E2E-01` **`e2e_study_complete_participant_journey`**
  *Full browser automation simulating a team:*
  1. Transition from Room 1 into Daniel's Study.
  2. Verify green CRT aesthetic, scanline overlay, and typewriter ambient audio.
  3. Walk using WASD to all 12 interactive fragment props and press `E` (or click) to inspect and recover all 16 evidence fragments (`ES01`–`ES12`, `EK02`, `EK03`, `XS01`, `XS02`).
  4. Verify `HUD` shows `16/16` fragments and Study Evidence Basket unseals.
  5. Press `B` to inspect green CRT printout strips and sticky notes.
  6. Approach `tablet_drawer`, press `E`, convert binary sticky note, submit `ALPHA`, verify `P05` awarded.
  7. Approach `crt_monitor`, press `E`, decode base64 email draft, submit `SIGNAL`, verify `P06` awarded.
  8. Approach `terminal_pc`, press `E`, inspect hex crash dump, submit `ORBIT`, verify `P07` awarded.
  9. Approach `line_printer`, press `E`, filter access logs by impossible timestamp, submit `SRC-TEST9`, verify `P08` awarded.
  10. Press `C` to verify `CaseFilesModal` displays `4 / 4 Solved` and attempt counts without spoilers.
  11. Verify `RoomCompleteModal` triggers, 3D Basement exit door unbolts and swings open, and walking to door prompts Room 3 transition.

#### Backend Unit & Integration Tests (50 Tests - Shahan)
- [ ] `QA-R2-BE-01` `test_study_initial_state_locked_until_room1_completed`
- [ ] `QA-R2-BE-02` `test_study_get_room_state_returns_20_objects`
- [ ] `QA-R2-BE-03` `test_study_search_bookshelf_drops_ES01`
- [ ] `QA-R2-BE-04` `test_study_search_corkboard_drops_ES02`
- [ ] `QA-R2-BE-05` `test_study_search_desk_blotter_drops_ES03`
- [ ] `QA-R2-BE-06` `test_study_search_filing_cabinet_drops_ES04`
- [ ] `QA-R2-BE-07` `test_study_search_sticky_wall_drops_ES05`
- [ ] `QA-R2-BE-08` `test_study_search_armchair_drops_ES06`
- [ ] `QA-R2-BE-09` `test_study_search_reel_recorder_drops_ES07`
- [ ] `QA-R2-BE-10` `test_study_search_cable_bundle_drops_ES08`
- [ ] `QA-R2-BE-11` `test_study_search_corkboard_second_spot_drops_ES09`
- [ ] `QA-R2-BE-12` `test_study_search_filing_cabinet_second_spot_drops_ES10`
- [ ] `QA-R2-BE-13` `test_study_search_floor_lamp_drops_ES11`
- [ ] `QA-R2-BE-14` `test_study_search_wastebin_drops_ES12`
- [ ] `QA-R2-BE-15` `test_study_search_reel_recorder_case_drops_EK02`
- [ ] `QA-R2-BE-16` `test_study_search_bookshelf_row_drops_EK03`
- [ ] `QA-R2-BE-17` `test_study_search_window_drops_decoy_XS01`
- [ ] `QA-R2-BE-18` `test_study_search_radiator_drops_decoy_XS02`
- [ ] `QA-R2-BE-19` `test_study_search_empty_returns_nothing_found`
- [ ] `QA-R2-BE-20` `test_study_search_duplicate_returns_already_collected`
- [ ] `QA-R2-BE-21` `test_study_basket_auto_unlocks_when_all_16_fragments_collected`
- [ ] `QA-R2-BE-22` `test_study_basket_locked_when_15_of_16_collected`
- [ ] `QA-R2-BE-23` `test_study_clue_R1_05_hmac_sha256_correct_answer`
- [ ] `QA-R2-BE-24` `test_study_clue_R1_05_plain_text_array_match_ALPHA`
- [ ] `QA-R2-BE-25` `test_study_clue_R1_05_case_insensitive_handling`
- [ ] `QA-R2-BE-26` `test_study_clue_R1_05_awards_photo_piece_P05`
- [ ] `QA-R2-BE-27` `test_study_clue_R1_06_hmac_sha256_correct_answer`
- [ ] `QA-R2-BE-28` `test_study_clue_R1_06_plain_text_array_match_SIGNAL`
- [ ] `QA-R2-BE-29` `test_study_clue_R1_06_awards_photo_piece_P06`
- [ ] `QA-R2-BE-30` `test_study_clue_R1_07_hmac_sha256_correct_answer`
- [ ] `QA-R2-BE-31` `test_study_clue_R1_07_plain_text_array_match_ORBIT`
- [ ] `QA-R2-BE-32` `test_study_clue_R1_07_awards_photo_piece_P07`
- [ ] `QA-R2-BE-33` `test_study_clue_R1_08_hmac_sha256_correct_answer`
- [ ] `QA-R2-BE-34` `test_study_clue_R1_08_plain_text_array_match_SRC_TEST9`
- [ ] `QA-R2-BE-35` `test_study_clue_R1_08_awards_photo_piece_P08`
- [ ] `QA-R2-BE-36` `test_study_clues_max_attempts_3_enforced`
- [ ] `QA-R2-BE-37` `test_study_clues_wrong_attempt_increments_count`
- [ ] `QA-R2-BE-38` `test_study_clues_exhausted_rejects_further_answers`
- [ ] `QA-R2-BE-39` `test_study_room_completion_flag_true_when_4_clues_solved`
- [ ] `QA-R2-BE-40` `test_study_exit_door_unlatched_in_database_upon_completion`
- [ ] `QA-R2-BE-41` `test_study_backward_door_persists_state_when_revisiting_bedroom`
- [ ] `QA-R2-BE-42` `test_study_photo_pieces_accumulate_to_8_total`
- [ ] `QA-R2-BE-43` `test_study_atomic_database_transactions_on_concurrent_submits`
- [ ] `QA-R2-BE-44` `test_study_rate_limit_enforced_across_study_clues`
- [ ] `QA-R2-BE-45` `test_study_security_no_passwords_or_hashes_in_json`
- [ ] `QA-R2-BE-46` `test_study_custom_error_message_for_tablet_cipher`
- [ ] `QA-R2-BE-47` `test_study_custom_error_message_for_email_cipher`
- [ ] `QA-R2-BE-48` `test_study_custom_error_message_for_crash_dump`
- [ ] `QA-R2-BE-49` `test_study_custom_error_message_for_printer_log`
- [ ] `QA-R2-BE-50` `test_study_recompute_score_accurately_reflects_all_solved_clues`

#### Frontend Unit & Integration Tests (49 Tests - Subham Das)
- [ ] `QA-R2-FE-01` `test_room2_study_mounts_canvas_and_loads_threejs_scene`
- [ ] `QA-R2-FE-02` `test_room2_disposes_geometry_and_materials_on_unmount`
- [ ] `QA-R2-FE-03` `test_room2_applies_green_crt_lighting_and_ambient_theme`
- [ ] `QA-R2-FE-04` `test_room2_scanline_overlay_renders_with_low_opacity`
- [ ] `QA-R2-FE-05` `test_room2_crt_flicker_effect_respects_reduced_motion`
- [ ] `QA-R2-FE-06` `test_room2_controls_delegate_movement_to_controls_js`
- [ ] `QA-R2-FE-07` `test_room2_wasd_movement_inside_study_bounding_box`
- [ ] `QA-R2-FE-08` `test_room2_pointer_lock_engages_and_releases_properly`
- [ ] `QA-R2-FE-09` `test_room2_hud_displays_study_title_and_collected_count`
- [ ] `QA-R2-FE-10` `test_room2_pressing_B_opens_study_evidence_basket`
- [ ] `QA-R2-FE-11` `test_room2_basket_renders_study_png_thumbnails_correctly`
- [ ] `QA-R2-FE-12` `test_room2_basket_contrast_and_brightness_controls_active`
- [ ] `QA-R2-FE-13` `test_room2_pressing_C_opens_clues_modal_for_study`
- [ ] `QA-R2-FE-14` `test_room2_clues_modal_displays_clues_1_to_4_labels`
- [ ] `QA-R2-FE-15` `test_room2_clues_modal_shows_accurate_attempts_count`
- [ ] `QA-R2-FE-16` `test_room2_clues_modal_strictly_hides_study_room_locations`
- [ ] `QA-R2-FE-17` `test_room2_clues_modal_strictly_hides_cipher_methods`
- [ ] `QA-R2-FE-18` `test_room2_pressing_P_shows_photo_puzzle_with_up_to_8_pieces`
- [ ] `QA-R2-FE-19` `test_room2_raycaster_detects_bookshelf_and_prompts_inspect`
- [ ] `QA-R2-FE-20` `test_room2_pressing_E_searches_bookshelf_and_calls_api`
- [ ] `QA-R2-FE-21` `test_room2_toast_notification_on_study_fragment_found`
- [ ] `QA-R2-FE-22` `test_room2_pressing_E_on_tablet_drawer_opens_tablet_modal`
- [ ] `QA-R2-FE-23` `test_room2_tablet_modal_flip_button_displays_binary_note`
- [ ] `QA-R2-FE-24` `test_room2_tablet_modal_copy_button_copies_binary_text`
- [ ] `QA-R2-FE-25` `test_room2_tablet_modal_submits_ALPHA_successfully`
- [ ] `QA-R2-FE-26` `test_room2_pressing_E_on_crt_monitor_opens_email_modal`
- [ ] `QA-R2-FE-27` `test_room2_email_modal_displays_base64_encoded_draft`
- [ ] `QA-R2-FE-28` `test_room2_email_modal_submits_SIGNAL_successfully`
- [ ] `QA-R2-FE-29` `test_room2_pressing_E_on_terminal_pc_opens_crash_dump_modal`
- [ ] `QA-R2-FE-30` `test_room2_crash_dump_modal_displays_hex_lines_and_offsets`
- [ ] `QA-R2-FE-31` `test_room2_crash_dump_modal_submits_ORBIT_successfully`
- [ ] `QA-R2-FE-32` `test_room2_pressing_E_on_line_printer_opens_access_log_modal`
- [ ] `QA-R2-FE-33` `test_room2_access_log_modal_search_box_filters_lines`
- [ ] `QA-R2-FE-34` `test_room2_access_log_modal_submits_SRC_TEST9_successfully`
- [ ] `QA-R2-FE-35` `test_room2_typing_in_inputs_does_not_trigger_room_movement`
- [ ] `QA-R2-FE-36` `test_room2_submitting_all_4_clues_triggers_study_complete_modal`
- [ ] `QA-R2-FE-37` `test_room2_study_exit_door_rotates_open_smoothly`
- [ ] `QA-R2-FE-38` `test_room2_exit_door_audio_plays_heavy_unlatch_sound`
- [ ] `QA-R2-FE-39` `test_room2_backward_door_prompts_revisit_bedroom`
- [ ] `QA-R2-FE-40` `test_room2_pressing_E_on_backward_door_transitions_to_room1`
- [ ] `QA-R2-FE-41` `test_room2_pressing_E_on_open_exit_door_transitions_to_room3`
- [ ] `QA-R2-FE-42` `test_room2_ambient_typewriter_and_crt_hum_plays`
- [ ] `QA-R2-FE-43` `test_room2_global_mute_silences_study_audio`
- [ ] `QA-R2-FE-44` `test_room2_draw_calls_under_250_benchmark`
- [ ] `QA-R2-FE-45` `test_room2_frame_rate_maintains_60fps`
- [ ] `QA-R2-FE-46` `test_room2_texture_memory_under_25mb`
- [ ] `QA-R2-FE-47` `test_room2_window_resize_handler_active`
- [ ] `QA-R2-FE-48` `test_room2_whisper_sound_plays_at_random_intervals`
- [ ] `QA-R2-FE-49` `test_room2_study_complete_modal_recap_displays_accurate_photo_count`

---

### 4.3 Room 3 (The Basement) Test Suite (100 Tests)

#### E2E Full Walkthrough Test (1 Test - Krishnapriya & Vishad)
- [x] `QA-R3-E2E-01` **`e2e_basement_complete_participant_journey`**
  *Full browser automation simulating a team:*
  1. Transition from Room 2 into The Basement bunker.
  2. Verify red emergency strobe lighting, steam particle venting, and heartbeat subwoofer audio.
  3. Walk using WASD to all 4 interactive fragment props and press `E` (or click) to inspect and recover all 5 evidence fragments (`EK04`, `EK05`, `EK06`, `XK01`, `XK02`).
  4. Verify `HUD` shows `5/5` fragments and Basement Evidence Basket unseals.
  5. Approach `intercom`, press `E`, submit QR authentication passcode `QR92`, verify `P09` awarded.
  6. Approach `rack_door`, press `E`, decrypt margin note, submit `LOWER`, verify `P10` awarded.
  7. Verify all 10 Photo Pieces (`P01` to `P10`) are present in player state.
  8. Approach `containment_console`, press `E` to open Final Terminal:
     - Stage 1: Submit `['LANTERN', 'ORBIT', 'SRC-TEST9']`.
     - Stage 2: Drag and drop 10 Photo Pieces into sequence `['P06', 'P01', 'P08', 'P03', 'P10', 'P05', 'P02', 'P09', 'P04', 'P07']`.
     - Stage 3: Select protocol `BETA` and PIN `2468`.
  9. Press `C` to verify `CaseFilesModal` displays `3 / 3 Solved` without spoilers.
  10. Verify Round 1 Victory screen triggers, the subterranean vault unseals, and completion records in database.

#### Backend Unit & Integration Tests (50 Tests - Vishad)
- [x] `QA-R3-BE-01` `test_basement_initial_state_locked_until_room2_completed`
- [x] `QA-R3-BE-02` `test_basement_get_room_state_returns_11_objects`
- [x] `QA-R3-BE-03` `test_basement_search_server_rack_printer_tray_drops_EK04`
- [x] `QA-R3-BE-04` `test_basement_search_maintenance_terminal_drops_EK05`
- [x] `QA-R3-BE-05` `test_basement_search_toolbox_drops_EK06`
- [x] `QA-R3-BE-06` `test_basement_search_floor_seal_drops_decoy_XK01`
- [x] `QA-R3-BE-07` `test_basement_search_server_rack_drive_bay_drops_decoy_XK02`
- [x] `QA-R3-BE-08` `test_basement_search_empty_returns_nothing_found`
- [x] `QA-R3-BE-09` `test_basement_basket_auto_unlocks_when_all_5_fragments_collected`
- [x] `QA-R3-BE-10` `test_basement_basket_locked_when_4_of_5_collected`
- [x] `QA-R3-BE-11` `test_basement_clue_R1_09_hmac_sha256_correct_answer`
- [x] `QA-R3-BE-12` `test_basement_clue_R1_09_plain_text_array_match_QR92`
- [x] `QA-R3-BE-13` `test_basement_clue_R1_09_awards_photo_piece_P09`
- [x] `QA-R3-BE-14` `test_basement_clue_R1_10_hmac_sha256_correct_answer`
- [x] `QA-R3-BE-15` `test_basement_clue_R1_10_plain_text_array_match_LOWER`
- [x] `QA-R3-BE-16` `test_basement_clue_R1_10_awards_photo_piece_P10`
- [x] `QA-R3-BE-17` `test_basement_total_photo_pieces_equals_10`
- [x] `QA-R3-BE-18` `test_basement_final_terminal_stage1_requires_3_keywords`
- [x] `QA-R3-BE-19` `test_basement_final_terminal_stage1_validates_LANTERN_ORBIT_SRC_TEST9`
- [x] `QA-R3-BE-20` `test_basement_final_terminal_stage1_advances_to_stage2`
- [x] `QA-R3-BE-21` `test_basement_final_terminal_stage2_rejects_if_fewer_than_10_pieces`
- [x] `QA-R3-BE-22` `test_basement_final_terminal_stage2_validates_exact_photo_permutation`
- [x] `QA-R3-BE-23` `test_basement_final_terminal_stage2_advances_to_stage3`
- [x] `QA-R3-BE-24` `test_basement_final_terminal_stage3_validates_BETA_and_2468`
- [x] `QA-R3-BE-25` `test_basement_final_terminal_completes_round1`
- [x] `QA-R3-BE-26` `test_basement_final_terminal_records_official_finish_timestamp`
- [x] `QA-R3-BE-27` `test_basement_final_terminal_prevents_duplicate_scoring`
- [x] `QA-R3-BE-28` `test_basement_final_terminal_never_leaks_which_field_was_wrong`
- [x] `QA-R3-BE-29` `test_basement_clues_max_attempts_enforced`
- [x] `QA-R3-BE-30` `test_basement_exhausted_clues_block_further_submits`
- [x] `QA-R3-BE-31` `test_basement_atomic_transactions_under_high_load`
- [x] `QA-R3-BE-32` `test_basement_rate_limit_enforced_across_basement_clues`
- [x] `QA-R3-BE-33` `test_basement_server_time_synced_to_countdown_monitor`
- [x] `QA-R3-BE-34` `test_basement_security_no_plain_answers_in_client_state`
- [x] `QA-R3-BE-35` `test_basement_security_no_hashes_in_client_state`
- [x] `QA-R3-BE-36` `test_basement_custom_error_message_for_qr_terminal`
- [x] `QA-R3-BE-37` `test_basement_custom_error_message_for_rack_note`
- [x] `QA-R3-BE-38` `test_basement_custom_error_message_for_final_terminal`
- [x] `QA-R3-BE-39` `test_basement_round1_qualification_left_to_admin_only`
- [x] `QA-R3-BE-40` `test_basement_leaderboard_rank_calculated_accurately`
- [x] `QA-R3-BE-41` `test_basement_tie_breaker_logic_respects_finish_timestamp`
- [x] `QA-R3-BE-42` `test_basement_scores_hidden_in_final_10_minutes_if_configured`
- [x] `QA-R3-BE-43` `test_basement_unauthorized_token_returns_401`
- [x] `QA-R3-BE-44` `test_basement_invalid_room_id_returns_404`
- [x] `QA-R3-BE-45` `test_basement_etag_header_on_state_polling`
- [x] `QA-R3-BE-46` `test_basement_database_deadlock_prevention`
- [x] `QA-R3-BE-47` `test_basement_backward_navigation_to_study_valid`
- [x] `QA-R3-BE-48` `test_basement_backward_navigation_to_bedroom_valid`
- [x] `QA-R3-BE-49` `test_basement_recompute_scores_functionality`
- [x] `QA-R3-BE-50` `test_basement_audit_log_records_all_submissions`

#### Frontend Unit & Integration Tests (49 Tests - Krishnapriya)
- [x] `QA-R3-FE-01` `test_room3_basement_mounts_canvas_and_loads_scene`
- [x] `QA-R3-FE-02` `test_room3_disposes_threejs_objects_on_unmount`
- [x] `QA-R3-FE-03` `test_room3_applies_industrial_concrete_and_red_strobe_lighting`
- [x] `QA-R3-FE-04` `test_room3_red_strobe_rotates_and_flickers`
- [x] `QA-R3-FE-05` `test_room3_steam_particle_system_emits_smoothly`
- [x] `QA-R3-FE-06` `test_room3_reduced_motion_turns_off_strobe_and_particles`
- [x] `QA-R3-FE-07` `test_room3_controls_delegate_movement_to_controls_js`
- [x] `QA-R3-FE-08` `test_room3_wasd_movement_inside_basement_bounds`
- [x] `QA-R3-FE-09` `test_room3_pointer_lock_engages_and_releases`
- [x] `QA-R3-FE-10` `test_room3_hud_renders_basement_title_and_5_fragments_counter`
- [x] `QA-R3-FE-11` `test_room3_pressing_B_opens_basement_evidence_basket`
- [x] `QA-R3-FE-12` `test_room3_basket_renders_basement_png_thumbnails`
- [x] `QA-R3-FE-13` `test_room3_pressing_C_opens_clues_modal_for_basement`
- [x] `QA-R3-FE-14` `test_room3_clues_modal_displays_clues_1_to_3_labels`
- [x] `QA-R3-FE-15` `test_room3_clues_modal_shows_attempts_per_clue`
- [x] `QA-R3-FE-16` `test_room3_clues_modal_strictly_hides_basement_locations`
- [x] `QA-R3-FE-17` `test_room3_clues_modal_strictly_hides_cipher_methods`
- [x] `QA-R3-FE-18` `test_room3_pressing_P_shows_photo_puzzle_with_all_10_pieces`
- [x] `QA-R3-FE-19` `test_room3_raycaster_detects_server_rack_and_shows_prompt`
- [x] `QA-R3-FE-20` `test_room3_pressing_E_searches_server_rack_and_calls_api`
- [x] `QA-R3-FE-21` `test_room3_toast_notification_on_basement_fragment_found`
- [x] `QA-R3-FE-22` `test_room3_pressing_E_on_intercom_opens_qr_modal`
- [x] `QA-R3-FE-23` `test_room3_qr_modal_submits_QR92_successfully`
- [x] `QA-R3-FE-24` `test_room3_pressing_E_on_rack_door_opens_note_modal`
- [x] `QA-R3-FE-25` `test_room3_note_modal_submits_LOWER_successfully`
- [x] `QA-R3-FE-26` `test_room3_pressing_E_on_containment_console_opens_final_modal`
- [x] `QA-R3-FE-27` `test_room3_final_modal_stage1_renders_3_keyword_inputs`
- [x] `QA-R3-FE-28` `test_room3_final_modal_stage1_submits_keywords_and_advances`
- [x] `QA-R3-FE-29` `test_room3_final_modal_stage2_renders_10_slot_photo_board`
- [x] `QA-R3-FE-30` `test_room3_final_modal_stage2_supports_drag_and_drop_swapping`
- [x] `QA-R3-FE-31` `test_room3_final_modal_stage2_supports_click_to_select_and_place`
- [x] `QA-R3-FE-32` `test_room3_final_modal_stage2_reset_button_clears_board`
- [x] `QA-R3-FE-33` `test_room3_final_modal_stage2_submits_permutation_and_advances`
- [x] `QA-R3-FE-34` `test_room3_final_modal_stage3_renders_protocol_buttons_and_pin_pad`
- [x] `QA-R3-FE-35` `test_room3_final_modal_stage3_submits_BETA_and_2468`
- [x] `QA-R3-FE-36` `test_room3_wall_monitor_renders_live_countdown_synced_to_server`
- [x] `QA-R3-FE-37` `test_room3_subwoofer_heartbeat_audio_speeds_up_under_5_minutes`
- [x] `QA-R3-FE-38` `test_room3_server_rack_cooling_fans_audio_plays`
- [x] `QA-R3-FE-39` `test_room3_global_mute_silences_basement_audio`
- [x] `QA-R3-FE-40` `test_room3_final_victory_screen_triggers_upon_stage3_solve`
- [x] `QA-R3-FE-41` `test_room3_victory_screen_plays_cinematic_audio_sting`
- [x] `QA-R3-FE-42` `test_room3_draw_calls_under_250_budget`
- [x] `QA-R3-FE-43` `test_room3_frame_rate_maintains_60fps`
- [x] `QA-R3-FE-44` `test_room3_texture_memory_under_25mb`
- [x] `QA-R3-FE-45` `test_room3_window_resize_handler_active`
- [x] `QA-R3-FE-46` `test_room3_backward_door_prompts_revisit_study`
- [x] `QA-R3-FE-47` `test_room3_pressing_E_on_backward_door_transitions_to_room2`
- [x] `QA-R3-FE-48` `test_room3_typing_in.inputs_does_not_trigger_room_movement`
- [x] `QA-R3-FE-49` `test_room3_final_modal_read_only_when_exhausted`

---

## 5. Round 2: "What Was Sealed Below" (Pending Round 1 Completion)

> **Status:** Master Architecture & Content Schemas Complete. Assignments Unassigned (to be assigned later).
> **Master Specifications:**
> - [`ROUND2_DESIGN.md`](./ROUND2_DESIGN.md) — Complete room-by-room UI, props, 3D world, and backend specifications.
> - [`round2_horror_design.md`](./round2_horror_design.md) — Situation-based horror events, jumpscares (JS-01 to JS-08), 3D spatial audio, and camera-hijack triggers.
> - Content Schemas: Synchronized in `content.test.json` and `content.live.json` with 22 fragments and strict input gates.


### Round 2 Progression & Timing Rules
- **Attempts Cap:** Strict 3 attempts per clue (`attempts_max: 3`).
- **Room Transition Rule:** Exit doors unlock when all room clues are either **`solved` OR `exhausted`** (preventing teams from being trapped while maintaining heavy score penalties).
- **Interconnection Failure:** If a prerequisite clue is exhausted, its Dossier card is marked `PURGED`, forcing the team to guess on dependent downstream clues or forfeit the Grand Finale.
- **Leaderboard Timing:** High-precision elapsed time $(\text{last\_solved\_at} - \text{starts\_at}) + \text{penalty\_seconds}$ with minute-second display and trap penalties.

### Round 2 Architecture & Team Assignments Matrix

| Room | Theme & Setting | Frontend Lead | Backend Lead | Clues / Terminals | Evidence / Fragments | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Room 4: The Rotting Archive** (`records`) | Flooded sub-basement archive. Buckled concrete, dripping ceiling, flickering tubes. | **Darsh** | **Darsh** | `R2-02`, `R2-03`, `R2-04`, `R2-07` (4 clues) | 12 pieces (`ER01`–`ER10`, `XR01`, `XR02` decoys) | **Completed (Round 2 Reference)** |
| **Room 5: The Surveillance Morgue** (`control`) | Narrow observation bunker. 9 cracked CRTs, plastic quarantine sheeting. | **Swapnil** | **Hari Priya** | `R2-01`, `R2-05`, `R2-06` (3 clues) | 10 pieces (`EC01`–`EC08`, `XC01`, `XC02` decoys) | **Assigned** |
| **Room 6: The Anointing Vault** (`vault`) | Occult containment tomb. Suspended rusted iron cage, pulsing flesh organism. | **Swapnil** | **Hari Priya** | `R2-08`, `R2-09`, `R2-10` (3 clues) | None (Master Case Dossier convergence) | **Assigned** |

### Round 2 Master Test Target
- **Total Tests for Round 2:** Exactly **300 Automated Tests**
  - Room 4 (records): 110 Tests (60 Frontend + 40 Backend + 10 Multi-Team Competition - 100% Passing)
  - Room 5 (control): 100 Tests (1 E2E Full Walkthrough + 99 Unit/Integration Tests)
  - Room 6 (vault): 100 Tests (1 E2E Final Containment Walkthrough + 99 Unit/Integration Tests)

---

### 5.1 Room 4: The Rotting Archive (`records`)

#### Detailed Tasks for Frontend (Room 4)
- [x] **FE-R4-01** Create `frontend/src/game/rooms/records.js` with 3D procedural layout: buckled concrete floor with water puddles, dripping pipe particle system, merged shelving rows, flickering institutional fluorescent lighting.
- [x] **FE-R4-02** Create `frontend/src/game/Room4Records.jsx` integrating `engine.js` with flashlight battery decay (0.5% per 60s) and interaction handler.
- [x] **FE-R4-03** Build `RedactedReportModal.jsx` for `R2-02`: physical folder-tab interface, authentic aged paper documents, non-revealing black redaction bars, non-spoonfed prompt with dual-tab inspector.
- [x] **FE-R4-04** Build `MicrofilmViewerModal.jsx` for `R2-03`: circular optical viewer housing, draggable brass navigation dial with audible clicks, hardware circuit bus schematic (0x054D), clean input deck.
- [x] **FE-R4-05** Build `EpochTimelineModal.jsx` for `R2-04`: full-screen corkboard with draggable index cards, remove tray, active event count indicator without date answer leaks or card badges.
- [x] **FE-R4-06** Build `BulkheadKeypadModal.jsx` for `R2-07`: industrial dual amber CRT displays, auto-switching numeric (123) and alpha (ABC) deck with physical keyboard input support, mechanical blast-door unlock animation.
- [x] **FE-R4-07** Implement 7 interactive fragment props (`filing_cabinet_a`, `filing_cabinet_b`, `archive_shelves`, `clerk_desk`, `card_catalog`, `waste_basket`, `vent_grate`) with amber emissive hover highlight and `[E] Search <Prop>` prompt.
- [x] **FE-R4-08** Implement Fork 1 selector between Room 4 and Room 5 (Rotary selector on stone archway) with branch persistence in `team_forks`.
- [x] **FE-R4-09** Implement Fork 1 trap sequence: portcullis slam, flashlight death, surrounding wall scratches, disembodied whisper, whiteout reset with wrong arch barred (+60s penalty).
- [x] **FE-R4-10** Implement situation-triggered horror events for Room 4: JS-01 (Cabinet drawer burst), JS-02 (Polaroid head turn), JS-04 (Reflection raises hand), and follower footstep echoes.
- [x] **FE-R4-11** Generate authentic forensic evidence fragment documents: 12 high-resolution XML-compliant SVG documents (`evidence_er01.svg` through `evidence_er10.svg`, `evidence_xr01.svg`, `evidence_xr02.svg`) with 0 external raster dependencies.
- [x] **FE-R4-12** Complete forensic fragment inspector in `BasketModal.jsx` with removed debug IDs/internal codes, authentic archival labels, and zero-spoiler inspector metadata.

#### Detailed Tasks for Backend (Room 4)
- [x] **BE-R4-01** Create `GET /api/game/room/records` returning room presence, fragment progress, basket unlock status, objects projection, and clue solved states without answer leakage.
- [x] **BE-R4-02** Create `POST /api/game/room/records/search` enforcing strict sequential pickup (`seq` 1..10) for `ER01`–`ER10`, allowing decoys `XR01` and `XR02` to drop without sequence blocking.
- [x] **BE-R4-03** Return sealed vs unsealed fragment states: encrypted/wrapped fragments show no secret lines until all 12 fragments are collected.
- [x] **BE-R4-04** Enforce `input_gate: room_evidence_complete` on `R2-02`, `R2-03`, `R2-04`, `R2-07` (returning 403 until all fragments are collected).
- [x] **BE-R4-05** Route `POST /api/game/clue/R2-02/submit`: HMAC verification for shutdown date (`2001-02-10`), writing reveal payload into dossier and updating attempts.
- [x] **BE-R4-06** Route `POST /api/game/clue/R2-03/submit`: case-insensitive whitespace-normalized validation for bus hardware address (`2001-02-10`).
- [x] **BE-R4-07** Route `POST /api/game/clue/R2-04/submit`: normalized chronological letter validation with 3-attempt burnout lockout and +90s penalty enforcement.
- [x] **BE-R4-08** Route `POST /api/game/clue/R2-07/submit`: compound verification (numeric bus decimal code `1357` + archival timeline keyword `OCTOBER`), unsealing bulkhead blast door and setting `is_completed = true`.
- [x] **BE-R4-09** Route `POST /api/game/round/2/fork/fork1/choose`: Wing A trap penalty (+60s) with permanent lockout vs Wing B correct route progression.
- [x] **BE-R4-10** Support multi-team competition isolation and real-time leaderboard ranking with penalty accumulation.

---

### 5.2 Room 5: The Surveillance Morgue (`control`)

#### Detailed Tasks for Frontend (Room 5)
- [ ] **FE-R5-01** Create `frontend/src/game/rooms/control.js` with 3D diamond-plate steel floor, 9-CRT merged monitor wall with animated phosphor static, scanline post-processing, and procedural quarantine sheeting with sine-wave draft displacement.
- [ ] **FE-R5-02** Create `frontend/src/game/Room5Control.jsx` integrating engine, fragment detection, and terminal hooks.
- [ ] **FE-R5-03** Build `PersonnelIndexModal.jsx` for `R2-01`: `#000000` CRT aesthetic with `#4dff78` phosphor text, bitmap font, 60-row scrollable roster, physical toggle filters (`DEPT`, `STATUS`), and interactive command prompt.
- [ ] **FE-R5-04** Build `TransmissionArchiveModal.jsx` for `R2-05`: physical scrollable teletype paper tape, 6 transmission blocks, scroll-to-end detection gate revealing input prompt.
- [ ] **FE-R5-05** Build `SpectrogramModal.jsx` for `R2-06`: circular oscilloscope CRT, dual VM tabs, click-drag time scrubber, 3-band filter toggles, waveform pattern disruption rendering 4 hidden digits.
- [ ] **FE-R5-06** Implement 6 interactive fragment props (`relay_rack`, `tape_deck_cart`, `operator_chair`, `cable_trench`, `wall_clipboard`, `fuse_box`) with amber emissive hover highlight.
- [ ] **FE-R5-07** Implement Monitor Bank special interaction: clicking CCTV triggers JS-05 (past 4-minute playback showing impossible stalker entity).
- [ ] **FE-R5-08** Implement Dead Intercom special trigger: situation-based random activation playing frantic interrupted distress call.
- [ ] **FE-R5-09** Implement Fork 2 Core Airlock valve selector with high-voltage failure trap sequence.
- [ ] **FE-R5-10** Implement situation-triggered horror events for Room 5: JS-03 (Corner entity 10-minute slow crawl and lunge), JS-07 (Personnel roster injected with real player team name as active subject), and progressive room fog desaturation.

#### Detailed Tasks for Backend (Room 5)
- [ ] **BE-R5-01** Create `GET /api/game/room/control/state`.
- [ ] **BE-R5-02** Create `POST /api/game/room/control/search` enforcing strict sequence for `EC01`–`EC08` and handling decoys `XC01`, `XC02`.
- [ ] **BE-R5-03** Create `GET /api/game/room/control/basket`.
- [ ] **BE-R5-04** Enforce `input_gate: room_evidence_complete` on `R2-01`, `R2-05`, `R2-06`.
- [ ] **BE-R5-05** Route `POST /api/game/clue/R2-01/submit`: badge verification, recording genuine active badge into dossier.
- [ ] **BE-R5-06** Route `POST /api/game/clue/R2-05/submit`: authentic transmission file validation.
- [ ] **BE-R5-07** Route `POST /api/game/clue/R2-06/submit`: 4-digit spectrogram code validation.

---

### 5.3 Room 6: The Anointing Vault (`vault`)

#### Detailed Tasks for Frontend (Room 6)
- [ ] **FE-R6-01** Create `frontend/src/game/rooms/vault.js`: circular domed stone chamber, suspended rusted iron cage with chains, pulsing biological organism (vertex displacement shader, crimson emissive cycling at 1.4s), cracked bulletproof glass with internal handprints, mechanical split-flap countdown display with `CLACK-SNAP` audio.
- [ ] **FE-R6-02** Create `frontend/src/game/Room6Vault.jsx` with automatic flashlight battery cutoff upon entering.
- [ ] **FE-R6-03** Build `ManualDiffModal.jsx` for `R2-08`: side-by-side procedure document comparison, amber diff highlights on tampered clauses, clipboard copy utility.
- [ ] **FE-R6-04** Build `FailsafeCircuitModal.jsx` for `R2-09`: 8 heavy knife switches with physical throw animations and metallic `CLANG` audio, hand-drawn logic gate schematic diagram, 4 amber filament output lamps.
- [ ] **FE-R6-05** Build `FinalConsoleModal.jsx` for `R2-10`: full-viewport black terminal, 3 cast-iron input slots, mechanical hammer keystroke sounds, incorrect response screen tear, and multi-stage victory sequence (heartbeat stop, room blackout, emergency amber switch, `CONTAINMENT RESTORED` split-flap, narrative bridge lines, and final empty cage reveal).
- [ ] **FE-R6-06** Implement core proximity horror: approaching within 2m causes organism to press against glass, pulse accelerates to 140 BPM, new procedural fractures form.
- [ ] **FE-R6-07** Implement JS-08 vault entry sequence: door slams shut, human scratching and muffled pleading from the outside, then sudden silence.

#### Detailed Tasks for Backend (Room 6)
- [ ] **BE-R6-01** Create `GET /api/game/room/vault/state` (no fragment checking).
- [ ] **BE-R6-02** Route `POST /api/game/clue/R2-08/submit`: tampered steps verification, returning clean steps array in reveal payload.
- [ ] **BE-R6-03** Route `POST /api/game/clue/R2-09/submit`: 4-digit circuit authorization code verification.
- [ ] **BE-R6-04** Route `POST /api/game/clue/R2-10/submit`: atomic compound verification of all 3 fields (Clean Steps + Auth Code + Operator Badge). On success: set `qualified_at`, set `completed_at`, update leaderboard rank, and return `round_complete: true`.

---

### 5.4 Cross-Room Systems & Paranormal Infrastructure

#### Detailed Tasks for Frontend (Cross-Room Systems)
- [ ] **FE-SYS-01** Build `CaseDossierModal.jsx` (`[C]` shortcut): ring-bound leather folder showing all carried-forward forensic case records with wax seal stamps.
- [ ] **FE-SYS-02** Implement Infrasound Engine: continuous 18.98 Hz subliminal audio tone mixed at 20% volume across all Round 2 scenes.
- [ ] **FE-SYS-03** Implement Follower Entity AI manager: tracks unlit room coordinates, leaves physical evidence (ajar drawers, slid papers, tilted chairs), mirrors player stillness.
- [ ] **FE-SYS-04** Implement Breathing Vignette Shader: post-processing vignette oscillating at 0.2 Hz synchronized with entity respiration track.
- [ ] **FE-SYS-05** Implement Film Grain & Chromatic Aberration Spikes: dynamic noise scaling with entity proximity and RGB separation on impact events.
- [ ] **FE-SYS-06** Implement Screen Glass Crack System: cumulative procedural hairline fractures deepening on every wrong answer or panic event.
- [ ] **FE-SYS-07** Implement Browser Title Creep: background tab title cycle (`Curse the Code` → `I CAN SEE YOU` → `DON'T BLINK`).
- [ ] **FE-SYS-08** Implement 4th-Wall Paranoia injections: fake browser warning modal on decoy paths, injection of registered team name into Dossier at 70+ minutes.

#### Detailed Tasks for Backend (Cross-Room Systems)
- [ ] **BE-SYS-01** Create `GET /api/game/round/2/dossier` returning all solved clue records and reveal payloads for the authenticated team.
- [ ] **BE-SYS-02** Create `POST /api/game/round/2/fork/{fork_id}/choose` to record branch commitments, validate correct passage, and track trap penalties.

---


---

### 5.5 Round 2 Master Test Matrix (300 Tests Target)

Following the Golden Standard of Round 1, Round 2 requires **exactly 300 automated tests** (100 per room) with zero warnings and 100% assertion coverage before deployment.

```
Total Round 2 QA Target: 300 Tests
├── Room 4: The Rotting Archive  (100 Tests: 1 E2E + 49 Backend + 50 Frontend)
├── Room 5: Surveillance Morgue  (100 Tests: 1 E2E + 49 Backend + 50 Frontend)
└── Room 6: The Anointing Vault  (100 Tests: 1 E2E + 49 Backend + 50 Frontend)
```

#### Room 4: The Rotting Archive (110 Tests: 60 Frontend + 40 Backend + 10 Multi-Team Competition - 100% Passed)
- [x] `QA-R4-FE-21` **`e2e_records_complete_participant_journey`** (Full walkthrough: sub-basement spawn -> sequential 12-fragment search -> decoy handling -> basket auto-unlock -> solve R2-02 -> dial R2-03 -> sort R2-04 -> enter keypad R2-07 -> bulkhead door opens -> choose Fork 1 Wing B -> transition to Room 5).

**Backend Suite (40 Tests in `tests/test_room4_records.py` - 40/40 PASSED):**
- [x] `QA-R4-BE-01` `test_r4_01_room4_state_returns_200`
- [x] `QA-R4-BE-02` `test_r4_02_room4_id_and_title`
- [x] `QA-R4-BE-03` `test_r4_03_room4_theme_and_ambient`
- [x] `QA-R4-BE-04` `test_r4_04_room4_initial_flags_false`
- [x] `QA-R4-BE-05` `test_r4_05_room4_total_fragments_count` (12 fragments: ER01-ER10, XR01-XR02)
- [x] `QA-R4-BE-06` `test_r4_06_room4_all_four_clues_projected` (R2-02, R2-03, R2-04, R2-07)
- [x] `QA-R4-BE-07` `test_r4_07_room4_clue_secret_hashes_hidden`
- [x] `QA-R4-BE-08` `test_r4_08_room4_objects_count_and_types`
- [x] `QA-R4-BE-09` `test_r4_09_search_missing_object_id_returns_400`
- [x] `QA-R4-BE-10` `test_r4_10_search_nonexistent_room_returns_404`
- [x] `QA-R4-BE-11` `test_r4_11_search_empty_prop_no_hidden_compartments`
- [x] `QA-R4-BE-12` `test_r4_12_search_out_of_order_seq3_locked`
- [x] `QA-R4-BE-13` `test_r4_13_search_out_of_order_seq7_locked`
- [x] `QA-R4-BE-14` `test_r4_14_search_seq1_er01_success`
- [x] `QA-R4-BE-15` `test_r4_15_search_seq2_er02_from_same_prop`
- [x] `QA-R4-BE-16` `test_r4_16_search_already_collected_prop_exhausted`
- [x] `QA-R4-BE-17` `test_r4_17_search_seq3_er03_now_unlocked`
- [x] `QA-R4-BE-18` `test_r4_18_search_decoy_fragment_xr01_without_sequence_block`
- [x] `QA-R4-BE-19` `test_r4_19_partial_fragments_keeps_basket_sealed`
- [x] `QA-R4-BE-20` `test_r4_20_all_12_fragments_auto_unlocks_basket`
- [x] `QA-R4-BE-21` `test_r4_21_unsealed_basket_reveals_secret_lines`
- [x] `QA-R4-BE-22` `test_r4_22_submit_clue_nonexistent_returns_404`
- [x] `QA-R4-BE-23` `test_r4_23_submit_r2_02_correct_date_award_points`
- [x] `QA-R4-BE-24` `test_r4_24_submit_r2_02_duplicate_returns_already_solved`
- [x] `QA-R4-BE-25` `test_r4_25_submit_r2_03_correct_answer`
- [x] `QA-R4-BE-26` `test_r4_26_submit_r2_03_case_insensitive_and_whitespace`
- [x] `QA-R4-BE-27` `test_r4_27_clue_r2_04_wrong_attempt_1`
- [x] `QA-R4-BE-28` `test_r4_28_clue_r2_04_wrong_attempt_2`
- [x] `QA-R4-BE-29` `test_r4_29_clue_r2_04_burnout_attempt_3_adds_90s`
- [x] `QA-R4-BE-30` `test_r4_30_clue_r2_04_fourth_attempt_blocked_exhausted`
- [x] `QA-R4-BE-31` `test_r4_31_clue_r2_07_bulkhead_code_solve`
- [x] `QA-R4-BE-32` `test_r4_32_room4_completion_under_all_clues_resolved_rule`
- [x] `QA-R4-BE-33` `test_r4_33_fork1_initial_status_unresolved`
- [x] `QA-R4-BE-34` `test_r4_34_fork1_missing_choice_returns_400`
- [x] `QA-R4-BE-35` `test_r4_35_fork1_invalid_choice_letter_returns_400`
- [x] `QA-R4-BE-36` `test_r4_36_fork1_wing_a_trap_penalty_60s`
- [x] `QA-R4-BE-37` `test_r4_37_fork1_wing_a_reselect_is_barred`
- [x] `QA-R4-BE-38` `test_r4_38_fork1_wing_b_advances_and_unseals_room5`
- [x] `QA-R4-BE-39` `test_r4_39_leaderboard_r2_reports_exact_accumulated_penalties`
- [x] `QA-R4-BE-40` `test_r4_40_round1_clue_burnout_penalty_applies_90s`

**Frontend Suite (60 Tests in `frontend/src/__tests__/Room4Records.test.jsx` - 60/60 PASSED):**
- [x] `QA-R4-FE-01` to `QA-R4-FE-60` Full frontend verification covering 3D canvas mount, battery decay & pickup, 7 interactive props, audio system & jumpscares, authentic non-spoiler modals (`RedactedReportModal`, `MicrofilmViewerModal`, `EpochTimelineModal`, `BulkheadKeypadModal`), BasketModal forensic inspector, Fork 1 selector & trap animations, and complete E2E walkthrough.

**Multi-Team Competition Suite (10 Tests in `tests/test_multi_team_competition.py` - 10/10 PASSED):**
- [x] `QA-R4-COMP-01` Admin starts Round 1 and synchronizes multiple teams in lobby
- [x] `QA-R4-COMP-02` Concurrent teams compete through Room 1 with isolated state
- [x] `QA-R4-COMP-03` Admin qualifications preview and promote top N teams to Round 2
- [x] `QA-R4-COMP-04` Both qualified teams enter Room 4 (The Rotting Archive)
- [x] `QA-R4-COMP-05` Team Alpha explores props, respects sequence, and auto-unlocks basket
- [x] `QA-R4-COMP-06` Team Alpha solves all 4 clues and chooses Wing B cleanly
- [x] `QA-R4-COMP-07` Team Beta experiences clue burnout (+90s) and Fork 1 trap (+60s = 150s)
- [x] `QA-R4-COMP-08` Real-time Round 2 competition ranking reflects penalties and timing
- [x] `QA-R4-COMP-09` Tiebreaker formula accurately balances score and penalty seconds
- [x] `QA-R4-COMP-10` Secure concurrent session termination across all teams

---

#### Room 5: The Surveillance Morgue (100 Tests: `QA-R5-*`)
- [ ] `QA-R5-E2E-01` **`e2e_control_complete_participant_journey`** (Full walkthrough: enter bunker -> search 8 fragments -> basket auto-unlock -> filter R2-01 personnel DB -> read R2-05 paper tape -> scrub R2-06 spectrogram -> choose Fork 2 valve -> unlock Vault tunnel).
- [ ] `QA-R5-BE-01` to `QA-R5-BE-49` Backend validation: strict sequence `EC01`–`EC08`, R2-01 active badge query, R2-05 transmission identification, R2-06 4-digit audio code check, 3-attempts exhaustion handling, Fork 2 valve penalty logic.
- [ ] `QA-R5-FE-01` to `QA-R5-FE-50` Frontend validation: 9-CRT monitor canvas shaders, `PersonnelIndexModal` filtering, `TransmissionArchiveModal` paper tape dragging, `SpectrogramModal` oscilloscope dial scrub, Fork 2 valve selection, and horror triggers (JS-03 corner entity build, JS-05 CCTV playback, JS-07 team name injection).

---

#### Room 6: The Anointing Vault (100 Tests: `QA-R6-*`)
- [ ] `QA-R6-E2E-01` **`e2e_vault_complete_containment_victory_journey`** (Full walkthrough: enter vault -> flashlight cut -> R2-08 manual diff -> R2-09 logic gate circuit throw -> R2-10 triple-field containment console -> victory sequence -> leaderboard lock).
- [ ] `QA-R6-BE-01` to `QA-R6-BE-49` Backend validation: R2-08 diff verification, R2-09 logic circuit truth table, R2-10 atomic 3-field compound validation (Clean Steps + Auth Code + Badge ID), tournament completion timestamp recording, leaderboard tie-breaker calculation.
- [ ] `QA-R6-FE-01` to `QA-R6-FE-50` Frontend validation: organic core pulsing shader, cracked glass dome shaders, `ManualDiffModal` copy utility, `FailsafeCircuitModal` knife-switch throw animations, `FinalConsoleModal` typewriter sound and victory sequence, split-flap countdown display animation.


## 6. Admin Panel, Authentication & Infrastructure (Completed Milestones)

- [x] **BE-10** `POST /api/auth/login` with argon2/bcrypt hashing and rate limiting.
- [x] **BE-11** Enforce `MAX_SESSIONS_PER_TEAM = 2` concurrent device limitation.
- [x] **BE-12** `POST /api/auth/logout` single session termination.
- [x] **BE-13** `POST /api/auth/logout-all` emergency full-team session kill switch.
- [x] **BE-14** `GET /api/auth/me` session validation and presence tracking.
- [x] **BE-15** 12-hour sliding session lifetime with cryptographically hashed tokens.
- [x] **BE-18** Brute force lockout (8 failed attempts lock team for 5 minutes).
- [x] **ADM-01** Admin authentication and dashboard routes.
- [x] **ADM-02** Admin round management (Start, Pause, Resume, Extend, Terminate).
- [x] **ADM-03** Live team presence, score tracking, and automated qualification previews.
- [x] **ADM-04** Single-click force logout for disruptive or stalled client sessions.
- [x] **ADM-05** Real-time leaderboard with tie-breaking logic based on solve timestamps.

---

## 7. Development Guidelines & Execution Rules

1. **Content Immutability:** Never hardcode clue questions, prompt text, answers, or fragment IDs in React components. All text must be pulled dynamically from `content.test.json` (or `content.live.json` in production).
2. **Environment Toggling:** 
   - Development uses `content.test.json`.
   - Production competition uses `content.live.json` by adding `CONTENT_FILE=content.live.json` to `.env`.
3. **Branch Protection:** All Round 1 development must remain on the designated working branch (`optimization/room1` or feature branches). Never push unreviewed test content or secret answers to public remotes.
4. **Zero Spoilers in Logs:** Never log answers, plain-text solutions, or HMAC hashes in server logs or console outputs.

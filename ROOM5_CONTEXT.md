# Room 5 (`control` — The Surveillance Morgue) Persistent Context & Design Spec

> **Purpose:** Single source of truth for Room 5 architecture, visual design language, user preferences, solved bugs, asset inventory, protected test contracts, and roadmap across long or new sessions. Keep this updated whenever major changes land.

---

## 1. Git & Workspace Guardrails (STRICT)
- **Active Branch:** `feat/room-5-frontend`
- **NEVER** modify backend Python files (`app/`), backend test suites (`tests/`), or Hari Priya's backend branch (`feat/room-5`).
- **NEVER** commit, push, or switch branches unless explicitly asked by the user.
- **Node/pnpm Environment:** Tools run with `export PATH="/tmp/devbin:$PATH"` inside `frontend/` (`pnpm test`, `pnpm run build`).

---

## 2. User Preferences & Design Language (MUST FOLLOW)

### Aesthetic Direction
- **Vibe:** Survival-horror forensics & gothic claustrophobia inspired by **Resident Evil 2/4 Remake** UI — grounded, atmospheric, minimal HUD, tactile paper/manila/index-card artifacts on dark wood or corkboard.
- **FORBIDDEN ("AI Slop" / "Vibe-coded"):**
  - **NO** bright neon green (`#4dff78`, `#2db84d`, `#001200`, `#003300`) or bright purple (`#8f7bff`) anywhere in gameplay HUD or puzzle UI. *(Only `DevCalibratorOverlay.jsx` retains green dev-tool styling behind `?dev=1`.)*
  - **NO** sharp/hard square box buttons (`border-radius: 2px`) or generic gradient boxes.
  - **NO** cartoon stick-figure silhouettes or wireframe boxes inside CRT monitors (`CCTVMonitorModal.jsx`).
  - **NO** permanent dead-end softlocks/lockouts on puzzle failures, and **NO** screen clutter.

### Typography (`frontend/index.html` & `frontend/src/game/control.css`)
- **Display Headers (`font-re-display`):** `'Cinzel', 'Cormorant Garamond', Georgia, serif`
- **Typewriter / Stamps (`font-re-typewriter`):** `'Special Elite', 'Courier Prime', 'Courier New', monospace`
- **Dossiers / Notes (`font-re-dossier`):** `'Courier Prime', 'Courier New', monospace`
- **Terminal / Logs (`font-terminal` / `--font-re-mono`):** `'IBM Plex Mono', 'Courier New', monospace`

### Color Palette & Surfaces
- **Backgrounds / Panels:** Deep obsidian charcoal `#0b0a09`, `#110f0e`, `#161312` with `border-radius: 12px–14px` (`.modal-panel`, `.crt-bezel`, `.crt-modal-shell`, `rounded-2xl`).
- **Accents:** Antique bronze/gold (`#c4a265`, `#d4a45a`, `#e5d0a4`), bone ivory (`#e9dec7`, `#eceae4`, `#f3ede0`), dark blood crimson (`#842222`, `#9a2a2a`, `#c94a4a`, `#8b1515`).
- **Paper Props (Preserved):** `.paper-tape`, `.re-dossier-paper`, `.green-grid-sheet`, `.ruled-index-card`.

### Button & HUD Rules
- **All Buttons Are Rounded Capsule Pills (`border-radius: 9999px`):**
  - Core class `.re-btn` + `.re-btn-circle` renders a circular ivory keycap badge (`E`, `ESC`, `B`, `C`, `↵`, `↻`) beside clean sans-serif text inside a dark smoked capsule pill.
  - Filter/utility pills (`Copy Roster CSV`, `Copy Log`, `Copy Telemetry`, `Pulse Tone`), selects (`DEPT`, `STATUS`, `SORT`), radio/spectrogram tabs (`VM-A`, `VM-B`, `LOW`, `MID`, `HIGH`), CCTV channel tabs (`CAM-01..CAM-06`), bottom controls dock, and HUD `KeyCap`s all use `rounded-full`.
- **Subtle Left Clue Hint & Notification Toast (`HUDControl.jsx`, `Room5Control.jsx`):**
  - Progressive non-intrusive `clueHint` displays in the **top-left** objective block underneath `objectiveText`.
  - Notifications use a borderless left-aligned gothic capsule smoke ribbon (`fixed top-16 left-6 rounded-full` with crimson indicator dot).

---

## 3. Controls, Mechanics & Anti-Softlock Rules
- **Controls (`controls.js`):**
  - Pointer lock FPS aim (`WASD` move, `Shift` sprint, Mouse 360 look, `[ESC]` free cursor).
  - Interaction input parity: `[E]` key (`stopImmediatePropagation` prevents duplicate listener double-toggles) and **Right Mouse Click (`mouseup` `button === 2`)** perform identical interactions (open doors / inspect artifacts); **Left Click (`button === 0`)** toggles pointer lock & drag view-around separately.
  - `[F]` toggles 3D tactical flashlight; `[B]` toggles Evidence Basket; `[C]` toggles Case Dossier; `[M]` toggles audio mute.
  - **No Flashlight/Battery HUD icons or `[title*="Flashlight"]`/`[title*="Battery"]` attributes** in `HUDControl.jsx` (protected by `QA-R5-FE-14`).
- **Anti-Softlock Recovery:**
  - `cluesSolvedCount` in `Room5Control.jsx` counts `c.solved` **only** (never `c.exhausted`, preventing false `Dossier 3/3` while Vault remains locked).
  - After 3 wrong attempts (`exhausted && !solved`), `PersonnelIndexModal`, `TransmissionArchiveModal`, and `SpectrogramModal` display a breach lockout warning + rounded **`(↻) Reboot Terminal`** button (`handleResetClue` -> `simulationControl.resetClue(...)`), resetting attempts to `3` without losing already-solved clues or collected evidence.
  - Players can revisit completed rooms via `RE4RoomSwitcher.jsx`.

---

## 4. 6-Room Level Layout & Gameplay Progression
- **World Config (`frontend/src/game/rooms/control.js`):** `size: [36, 3.2, 46]`, `spawn: [0.25, 0.1, 0.25]`, `TILE = 1.56`, `colX(c) = -2.39 - c * 1.56` (`c=0..7`), `rowZ(r) = 6.28 + r * 1.56` (`r=0..8`).
- **CRITICAL 3D ENGINE RULE (`horror_kit.glb` Y-Offsets):**
  - Modular meshes inside `horror_kit.glb` have baked vertical origin offsets (`Wall_02037`, `Wall_01_Door_Hole002`, `Wall_Window002`, `Wall_Window_Colored003`, `Wal_Corner005` = `src.position.y: +1.482`; `Door` = `+1.318`; `Metal_Cabinet001` = `+1.026`; `Cabinet002` = `+1.368`; `CabinetShort` = `+0.539`; `FloorTile` = `-0.078`).
  - `cloneKitPiece()` in `sceneControl.js` MUST ALWAYS use `src.position.y + position[1]` — never overwrite `Y` to `0`, otherwise doorways sink `-1.48m` into the floor and walls/lintels block chest/eye level.
  - `wingGroup.position.y = 0.004` prevents z-fighting against `control_room.glb` (`y = 0`).

### Room-by-Room Interactables Map (`sceneControl.js` + `Room5Control.jsx`)
1. **Room 1 — Control Bay 5B (`X: [-3.27..3.26], Z: [-1.82..1.71]`):**
   - `staff_terminal` (`R2-01` -> answer **`BDG-9001`**), `monitor_bank` (`CCTVMonitorModal` + CCTV horror scare), `operator_chair` (`EC03`), `wall_clipboard` (`EC07`), `fuse_box` (`EC08`), `ringing_phone` (`CALL-04` — rings spatially until answered), `dead_intercom`, `crowbar_prop`, `sofa_alcove`.
2. **Room 2 — Anteroom Corridor 5A (`X: [-5.6..6.5], Z: [-1.9..10.7]`):**
   - `wall_breaker` (toggles facility overhead lights), `caution_pit` (bridged with walk planks), `wooden_crates`, `security_camera`, `entry_door` (sealed no-return), `control_door`, `annex_door`, `vault_door` (opens upon solving `R2-01`, `R2-05`, `R2-06`).
3. **Room 3 — Security Locker & Radio Wing 5C (`X: [-7.85..-1.61], Z: [5.50..13.30]`):**
   - **`radio_console`** (`R2-05` -> answer **`VM-A`**) relocated beside `tape_deck_cart` (`akai_reel_to_reel.glb` -> `EC02`), `annex_incident_file` (`FILE-17B`), `guard_watch_ledger` (`FILE-GW-09`), interactive `annex_locker` (slam scare), north doorway `cryo_door` (`X = -5.51, Z = 13.30`).
4. **Room 4 — Acoustic Observation Wing 5D (`X: [-10.97..-7.85], Z: [5.50..13.30]`):**
   - **`sound_console`** (`R2-06` -> answer **`8140`**) facing Chamber 3 containment window, `cable_trench` (`EC06`), `containment_protocol` (`FILE-ECP-03`), north doorway `generator_door` (`X = -10.19, Z = 13.30`), west doorway `chamber3_door` (deadbolted until `containment_key` picked up).
5. **Room 5 — Cryo Autopsy Suite 5E (`X: [-7.85..-1.61], Z: [13.30..19.54]`):**
   - `containment_key` (`Keys` prop -> `KEY-CH3`, unlocks `chamber3_door` and triggers hunt), `autopsy_gurney` (`bed_1.fbx`, triggers hunt), `Table_1.fbx`.
6. **Room 6 — Generator & Relay Vault 5F (`X: [-14.09..-7.85], Z: [13.30..19.54]`) + Chamber 3 (`X: [-14.09..-10.97], Z: [5.50..13.30]`):**
   - **5F:** Relocated **`relay_rack`** (`EC01`) + `aux_generator` (`GEN-5F`).
   - **Chamber 3 (Key-locked):** `bed_1.fbx`, `NightStand_1.fbx`, `scalpel_prop` (`Knife.fbx`, triggers hunt), `chamber3_autopsy` (`FILE-MED-011`), and prowling entity `ghost.glb`.

---

## 5. Audio & Horror AI Systems
- **`audioControl.js` (`GameAudioControl`):**
  - 100% Web Audio synthesis: dark C-minor bowed string bed (`130.81 / 155.56 / 185.0 / 65.41 Hz` @ `0.14` gain), haunted reverberant piano/music-box ostinato (`246–466 Hz`), spatial `phoneRing()`, `unlockBolt()`, `drawerSlam()`, `whisperRaspy()`, `footstep()`, `stinger()`, `good()`, `bad()`.
  - `setChaseTension(0..1)` scales chase dissonance (`chaseGain`) and pounding double-thump heartbeat.
  - Persistent window `pointerdown` / `keydown` listeners in `Room5Control.jsx` call `ensureActive()` so browser autoplay policies never keep music silent.
- **`scaresControl.js` (`createControlScares`):**
  - Stalker AI uses `/assets/models/room5/ghost.glb` (decimated + rigged from `Room-5 Glb models/ghost_model.glb` into `26,000` tris, `15`-bone `SkinnedMesh`, `~1.9 MB`, with 4 skeletal `AnimationClips`: `IdleStalk`, `DoorPeek`, `SprintLunge`, `JumpscareSnap` + additive procedural head tracking & arm sway).
  - Sprint noise buildup, wrong terminal entries, terminal lockouts, door rattles, `containment_key`, `autopsy_gurney`, and `scalpel_prop` trigger `triggerBreachHunt`.
  - Poppy Playtime–style scare director runs explicit `PATROL`, `PEEK`, `RETREAT`, `HUNT`, and `JUMPSCARE` states: doorway peeking (`DoorPeek` + `peekSting`), physical scurrying into darkness (`RETREAT` + `scurrySteps`) or ambush escalation (`HUNT`), plus a `1.35s` locked 3D camera-grab (`setCameraOverride` + FOV punch `72 -> 50` + `JumpscareSnap` lunge + `jumpscareSting` + crimson edge vignette) outside Safe Room 5B (`Z > 2.15`) before respawning in 5B and dropping 1 `EC` fragment.

---

## 6. 3D Asset Inventory

### Active Runtime Models (`frontend/public/assets/models/room5/`)
| Asset | Size | Purpose |
|---|---|---|
| `control_room.glb` | 684 KB | Control Room 5B & Anteroom 5A structural shell + monitors/doors |
| `horror_kit.glb` | 876 KB | Modular rooms (`5C`, `5D`, `Chamber 3`, `5E`, `5F`), hinged doors, cabinets |
| `ghost.glb` | 1.9 MB | Rigged entity mesh (`26,000` tris, `15` bones, `4` clips; optimized from untouched `Room-5 Glb models/ghost_model.glb`) |
| `akai_reel_to_reel.glb` | 428 KB | Interactive tape deck in Room 5C |
| `flashlight.glb` | 241 KB | First-person tactical torch (`[F]`) |
| `retro_ibm_pc.glb` | 175 KB | `staff_terminal` (`R2-01`) in Room 5B |
| `retro_tvs.glb` | 144 KB | South alcove CRT TV bank |
| `horrorpack/*` | ~230 KB total | 5 FBX props (`bed_1`, `Knife`, `NightStand_1`, `Table_1`, `DressHolder_1`) + 4 JPG textures |

### Unused Local Packs in Workspace (`Room-5 Glb models/` & Root)
- `security_room__parking_19_mb.glb` (`6.0 MB`, `4.64m × 4.10m × 10.24m`, 5 meshes)
- `office_is_old_abandoned_free.glb` (`15 MB`, `7.24m × 3.63m × 8.52m`, 47 meshes — needs compression before public deployment)
- `secret_area-52__room.glb` (`14 MB`, `5.24m × 2.77m × 5.33m`, 208 meshes)
- `scp_server_room.glb` (`1.7 MB`, Roblox-style blocky geometry)
- `horror-game-floor-generator-free/` (`Horror_Game_Starter_Kit.fbx` — same 17-piece modular family as compressed `horror_kit.glb`)
- **Deleted per user instruction:** `community-model-019ce831-9fbf-73a8-86b1-60db1a1ac333.glb` (288-tri bone prism placeholder).

---

## 7. Protected Automated Checks (`frontend/src/__tests__/Room5Control.test.jsx`)
Do NOT break these assertions in future UI/level edits:
- Keep exact visible strings: `'VAULT SEAL BROKEN'`, `'5/8'`, `'2/3'`, `'TX-1'`, `'TX-6'`, `'VM-A is the authenticated source'`, `'IDENTITY CONFIRMED|RECORD LOCKED'`, `'CODE VERIFIED|RECORD LOCKED'`, `/ENTER THE SURVEILLANCE MORGUE/i`, `/no going back/i`, `'FILTER / SEARCH...'`, `'ENTER BADGE ID:'`, `'SECONDARY ARCHIVE'`.
- Do NOT duplicate button text `'VM-A'`, `'VM-B'`, `'LOW'`, `'MID'`, `'HIGH'` inside `SpectrogramModal.jsx`.
- Do NOT add `title` attributes containing `Flashlight` or `Battery` in `HUDControl.jsx`.
- Keep interactive IDs: `staff_terminal`, `radio_console`, `sound_console`, `monitor_bank`, `relay_rack`, `tape_deck_cart`, `operator_chair`, `cable_trench`, `wall_clipboard`, `fuse_box`, `entry_door`, `vault_door`.

---

## 8. Verified Baseline & Next Expansion Backlog
- **Last Verified State:**
  - `verify_room5.mjs`: 6/6 open doorways clear (`[]` obstructions `0.5m–1.75m`), `ghost_model.glb` (`467,123` tris) active, breach chase confirmed (`4.5 -> 3.84`), audio & `resetClue` progression verified.
  - `pnpm test`: **6/6 test files passed, 179/179 tests passed**.
  - `pnpm run build`: **1544 modules built cleanly**.
- **Ready Next Expansions (if adding more downloadable packs):**
  1. Compress & mount `security_room__parking_19_mb.glb` + `office_is_old_abandoned_free.glb` as additional East/South sectors off Anteroom 5A.
  2. Add tiered security Keycards (Blue/Red), Plug Fuses (restore Wing power), and VHS Tape items feeding into `CCTVMonitorModal`.
  3. Optional rigged animated `.glb` replacement for `ghost.glb` if articulated bone-skinned walking clips are exported later.

---

## 9. Scaled-Up Puzzle Logic (AI-Assisted, Non-Spoiled) & Admin Tracking
- **`PersonnelIndexModal.jsx` (`R2-01` -> `BDG-9001`):**
  - Removed `Filter: Post-Shutdown` cheat button, `1983-08-14` closure subtitle spoiler, and gold/green row highlights.
  - Interleaved `BDG-9001` (`Corvin, M.`, `Research`, `Active`, `1984-04-23 11:38`) mid-table; updated decoy `BDG-9002` (`Inactive`, pre-blackout `1983-08-14 21:18`) and added `BDG-0889` (`Terminated`, `1983-08-16 04:12`) red herring.
  - Added `Copy Roster CSV` capsule button for AI-assisted audit against collected fragments (`EC01–EC08`).
- **`TransmissionArchiveModal.jsx` (`R2-05` -> `VM-A`):**
  - Removed `PRIORITY VERIFIED` stamp, crimson card background/border highlights, and plaintext `FROM: BDG-9001`.
  - Restored `content.test.json` Base64 `X-Auth` headers across all 6 packets (`TX-3` carries `QkRHLTkwMDE=` = `BDG-9001`), plus a forged `TX-4` mirror directive (`QkRHLTkwMDQ=` -> `VM-B`) requiring cross-reference with `R2-01`.
  - Added `Copy Log` capsule button for external/AI header decoding.
- **`SpectrogramModal.jsx` (`R2-06` -> `8140`):**
  - Removed `AUTO-TUNE PEAK` button, gold strip target box, plaintext `"8 1 4 0"` digits/banner, and `'8140'` input placeholder.
  - Added dual-channel `4-FRAME BCD-8421 / ITU-MORSE` ultrasonic carrier pockets (`VM-A` `HIGH 65–80%` = `8140`; decoy `VM-B` `HIGH 40–55%` = `8410`), Web Audio `Pulse Tone` audition, and `Copy Telemetry` export.
- **Admin Dashboard & Leaderboard (`AdminDashboard.jsx`, `LeaderboardView.jsx`):**
  - `LeaderboardView.jsx` polls both `/api/admin/leaderboard?round_num=1` & `round_num=2`, defaulting to `Side-by-Side (R1 & R2)` comparison + Round 1 / Round 2 views.
  - `AdminDashboard.jsx` Team Presence table displays live R1 and R2 (Rooms 4–6 incl. Room 5) clues, scores, adjusted times, and lockout penalties alongside online status.
  - Note: Backend `/api/admin/dashboard` aggregates Round 2 in `team_rounds (round=2)` without splitting Room 4 vs Room 5 separately, and `/?room=5` preview bypass runs offline simulation unless logged in as a team.

### Phase 13 Update (Safe Room 5B, Entity Horror, Tactical CCTV, AI Export & Riddlesome Overhaul)
- **Layout, Sound Console & HUD Conflict Fixes:**
  - `Table_1.fbx` collider & mesh relocated in `sceneControl.js` to the Room 5D west alcove (`[-10.25, 0, 9.60]`), clearing approach to `sound_console` (`[-9.25, 1.08, 12.60]`) with brighter emissive displays + top indicator LEDs.
  - `Room5Control.jsx` notification toast moved to `fixed bottom-20 left-1/2 -translate-x-1/2` (above bottom dock) so it never overlaps top-left title/objective/`clueHint`; `content.test.json` line 1 JSON syntax verified valid.
- **Control Room 5B Sanctuary, Entity Physics/Audio & Death-Drop Recovery:**
  - `SAFE_ROOM_5B_BOUNDS` (`x in [-3.45, 3.45], z <= 1.85`) and `isInsideSafeRoom5B(x, z)` in `simulationControl.js` / `scaresControl.js` isolate Control Room 5B (`CAM-02`) as a sanctuary; `clampOutsideSafeRoom` stops `ghost.glb` at `Z = 2.22` and triggers `bulkheadBang` outside the steel door.
  - Added chest `ghostGlow` PointLight and hunting gait heave/lurch/lean/spasm in `sceneControl.js` plus Web Audio `stalkerGrowl`, `heavyEntityStep`, `bulkheadBang`, and `jumpscareSting` in `audioControl.js`.
  - Being caught outside 5B triggers `jumpscareSting` + `caughtOverlay`, calls `sim.handlePlayerDeath(deathX, deathZ)`, respawns the player at `SAFE_ROOM_RESPAWN` (`[-0.2, 0.1, -1.35]`), and drops 1 `EC` fragment as a pulsing 3D satchel beacon (`dropped_<fragmentId>`) via `engine.spawnDroppedEvidence` recoverable with `[E]`.
  - `HUDControl.jsx` displays live `[SAFE ZONE · 5B]`, `[HUNT ACTIVE · RUN TO 5B]`, or `[OUTER WING]` pill in top-left header.
- **Tactical CCTV Monitor Bank (`CCTVMonitorModal.jsx`):**
  - Displays live entity wing radar via `ghostTelemetry` (`CAM-01..CAM-06`), dropped-evidence indicator, toggleable `IR Trace: ON/OFF` layer revealing forensic cross-reference hints without spoiling `BDG-9001` or `8140`, plus `Copy Log` & `Download Log` RE2R `.re-btn` controls.
- **Universal Evidence Board & External AI Export (`evidenceExport.js`, `EvidencePickupModal.jsx`, `BasketModal.jsx`):**
  - `evidenceExport.js` provides `formatDocumentText`, `formatEvidenceBundleText`, `copyDocumentText`, and `downloadDocumentFile`.
  - `Room5Control.jsx` auto-records inspected world documents (`world_doc`) into `[B]` Evidence Board via `worldDocsMapRef` while preserving the separate `0/8` core `EC` counter needed to unlock `R2-01` / `R2-05` / `R2-06`.
  - `BasketModal.jsx` adds `All Records / Core Slips / World Logs` filter capsules, `Copy All Files` / `Download All`, and per-item/inspector `Copy` / `Download` `.re-btn` controls; `EvidencePickupModal.jsx`, `PersonnelIndexModal.jsx`, `TransmissionArchiveModal.jsx`, and `SpectrogramModal.jsx` expose rounded `Copy` / `Download` actions.
- **Riddlesome Clue & Decoy Tuning:**
  - Replaced direct walkthrough spoilers across `ROOM5_EVIDENCE_RICH_META`, `ROOM5_WORLD_DOCUMENTS`, `CAM-02..CAM-06`, and `clueHint` with cross-referenced leads requiring curfew timestamp filtering (`23:00`), Base64 `X-Auth` verification, and high-band BCD-Morse decoding.
  - Added plausible decoys: `Corvin, L.` & `Moreau, V.` in `PersonnelIndexModal.jsx` and a `MID`-band `1983` harmonic decoy on `VM-A` in `SpectrogramModal.jsx`.

### Phase 14 Update (Universal Full-Content Visibility & Export Across Every Popup & Board Card)
- **`simulationControl.js` (`ROOM5_ENV_DOCUMENTS`, `ROOM5_CORE_EVIDENCE_MAP`, `enrichRoom5EvidenceItem`):**
  - Enriched all environmental props (`ENV-CRATES`, `ENV-PIT`, `ENV-CROWBAR`, `ENV-VENT`, `ENV-CAM04`, `ENV-LOCKER`, `ENV-INTERCOM`, `ENV-BREAKER`) with multi-line manifests, `classification`, `location`, `reportLines`, and forensic `highlight` leads.
  - Added `enrichRoom5EvidenceItem` so even Room 5 items returned wrapped (`is_wrapped: true`) or `TEST:`-prefixed by backend `/api/game/room/control` before `8/8` unlock cleanly in UI/downloads with full title, lines, report, and highlight.
- **`evidenceExport.js` (`createDocumentPreviewSvg`, hardened `downloadDocumentFile`):**
  - Added `createDocumentPreviewSvg` generating crisp inline archival sheet SVGs (replacing `/parcel_wrapped.png` on all world documents/logs on `[B]` cards and Inspector).
  - Hardened `downloadDocumentFile` with deferred DOM cleanup (`4000ms`) and `ctc:file-downloaded` event confirmation toast.
- **`BasketModal.jsx`, `EvidencePickupModal.jsx`, `Room5Control.jsx`, & All Terminal Modals:**
  - Corkboard cards show multi-line readable text + location + lead snippet (not clipped to 1 line), full Desk Inspector renders `reportLines` + non-blank pinned note card + `View Raw Text` toggle + `Copy`/`Download` confirmation states (`✓ Saved` / `✓ Downloaded`).
  - `Room5Control.jsx` now also registers `monitor_bank` (`CCTV-BANK`), `Case Dossier [C]` (`DOC-DOSSIER`), `annex_locker`, `dead_intercom`, `wall_breaker`, and terminal briefs (`TERM-R201`, `TERM-R205`, `TERM-R206`) into `[B]`.
  - Added `Copy Dossier` / `Download Dossier` to `CaseDossierModal.jsx`, `Copy Leads` / `Download Leads` to locked terminal popups, `Download All 6` to `CCTVMonitorModal.jsx`, rich pre-lock telemetry in `SpectrogramModal.jsx`, and downloaded confirmation states across all modals.

### Phase 15 Update (Articulated Skeletal Ghost Rig, Poppy Playtime Scare Director, 3D Jumpscare & Laptop GPU Optimization)
- **Decimated & Rigged `ghost.glb` (via `scratch/optimize_and_rig_ghost.mjs`):**
  - Replaced un-rigged `467,123`-tri (`10.61 MB`) runtime `ghost.glb` with a `26,000`-tri (`1956.7 KB`) `15`-bone `SkinnedMesh` preserving original embedded WebP PBR textures (`Room-5 Glb models/ghost_model.glb` source kept untouched).
  - Embedded 4 keyframed `AnimationClip`s: `IdleStalk`, `DoorPeek`, `SprintLunge`, and `JumpscareSnap`, weighted with geodesic Dijkstra + 6-pass Laplacian smoothing across welded topology (`<= 0.11m` max animated triangle edge across all clips, zero skin tears) and driven by `THREE.AnimationMixer` (`setAnim`) + additive neck/head player-tracking in `sceneControl.js`.
- **Quantization-Safe Static Batching, Light Culling & Auto/Manual `GFX: HIGH / ECO` Mode (`sceneControl.js`, `engine.js`, `HUDControl.jsx`, `Room5Control.jsx`):**
  - `toFloat32Geometry` dequantizes `horror_kit.glb` `Int16Array`/`Uint16Array` `InterleavedBufferAttribute` attributes into clean `Float32Array` geometries before `applyMatrix4` + `batchStaticMeshes(wingGroup)` so outer wing walls/floors/cabinets (`Wall_02`, `Floor_Carpet`, `Cabinet_Short`, `Wall_Window`) keep exact room coordinates & textures in 1 draw call per material while Room 5B stays unobstructed.
  - 6 corridor/room lights reset base intensity cleanly each frame before distance attenuation & culling (`18.5m` High / `14.5m` Eco); `engine.js` supports manual `GFX: HIGH / ECO` toggle in `HUDControl.jsx` and automatic Eco downgrade (`hardwareConcurrency <= 4` or sustained `> 26ms` frames), toggling shadows and ambient dust particles.
- **Alternating Grace/Haunt Director & `1.35s` Locked 3D Jumpscare (`controls.js`, `audioControl.js`, `scaresControl.js`, `Room5Control.jsx`):**
  - Replaced constant roaming with an alternating manifestation cycle (`INITIAL_GRACE_SEC = 180` first 3 minutes completely ghost-free & `ghost.root.visible = false` -> `18s` active track window -> `120s` dormant cooldown -> `12s` repeating active track windows), with `{ respectGrace: true }` gating prop/door/noise triggers in `Room5Control.jsx`.
  - Active sightings run `PEEK` (`DoorPeek` + `peekSting()`) -> physical `RETREAT` (`SprintLunge` + `scurrySteps()`) -> `DORMANT` (or `HUNT` escalation); catching the player outside Safe Room 5B (`dist <= 1.42`) triggers a `1.35s` locked 3D camera-grab (`setCameraOverride`, `FOV 72 -> 50`, `JumpscareSnap` rush, `jumpscareSting()`, crimson CSS vignette) before showing `"YOU DIED — SPECIMEN S-011 CAUGHT YOU"` respawn inside 5B, dropping 1 `EC` fragment, and entering a 2-minute `DORMANT` breather.
- **Updated Verification Baseline:**
  - `node verify_room5.mjs`: **71 PASSED, 0 FAILED**
  - `scratch/verify_room5.mjs`: **WING_CHECK (`wingTexChecks`, `graceGhostHidden`), AUDIO_CHECK, PROGRESSION, INPUT_PARITY** all green
  - `pnpm test`: **7/7 test files, 216/216 tests passed** (`Room5E2E.test.jsx` 37/37 incl. `T5-06`, `T5-07`, `T5-08`)
  - `pnpm run build`: **1545 modules built cleanly** (`app/` and `tests/` zero diff)

### Phase 16 Update (Hard-Surface Prop Sculpting, Physics Grounding, Open-Floor Respawn, 2-Minute Grace Telegraph & RE2R Death Screen)
- **Replaced Boxy Props & Fixed Levitating Objects (`sceneControl.js`):**
  - Added `createInstrumentFaceTexture('radio' | 'scope' | 'gauge')` procedural CRT/dial faces.
  - Upgraded `radio_console` (5C), `sound_console` (5D), `cable_trench` (moved clear to `[-10.42, 0.0, 10.80]`), and `aux_generator` (5F) into multi-part grounded metallic assemblies with rubber feet/floor bolts, oscilloscope screens, rotary knobs, exhaust stacks, and wall-mounted conduit trunking.
  - Replaced asymmetric `Table_1.fbx` (whose skewed bounding box shifted the tabletop away from folders) with grounded symmetrical `makeMorgueWorktable` steel-and-oak workbenches (`top = 0.780m`), seating `containment_protocol` (`[-10.25, 0.792, 9.40]`) and `containment_key` (`[-3.95, 0.80, 17.85]`) flush on tabletop surfaces (`ZERO` mid-air levitation).
- **Fixed Control Room 5B Respawn Stuck-In-Furniture Bug (`simulationControl.js`, `control.js`, `verify_room5.mjs`):**
  - Relocated `SAFE_ROOM_RESPAWN` & `control.js` `spawn` from `[-0.2, 0.1, -1.35]` (which wedged players between `Sofa` and `Retro TVs` colliders) to open center floor `[0.25, 0.1, 0.25]` (`>= 0.79m` clearance to every collider/wall).
- **Redesigned Death Screen (`Room5Control.jsx`):** CRT-scanline crimson `YOU DIED` overlay before clean 5B open-floor respawn at `[0.25, 0.25]`.

### Phase 17 Update (Looping Doors, Caged Orange-Red Hospital Lights, Crying Woman & Female Scream Audio, Behind-You Reveal + Flashlight Flicker)
- **Removed Misplaced Props & Built Looping Escapable Wings (`sceneControl.js`, `control.js`, `Room5Control.jsx`):**
  - Removed inverted `Light003` flashlight clones and dead-end Chamber 3 stairs (`Ladder002`), replacing overhead points with grounded steel-caged bulkhead dome fixtures (`makeHospitalFixture`) across Rooms `5B`, `5A` East/West, `5C`, `5D`, `Chamber 3`, `5E`, and `5F`.
  - Added looping inter-wing doorways `south_wing_door` (`5A West ↔ 5C` at `X = -3.95, Z = 5.50`), `chamber3_north_door` (`Chamber 3 ↔ 5F` at `X = -11.75, Z = 13.30`, Brass-Key paired with `chamber3_door`), and `morgue_vault_door` (`5E ↔ 5F` at `X = -7.85, Z = 17.20`), preserving original `horror_kit.glb` wood-grain `Door` textures (`markNoMerge`) accented by slim dim header transom strips.
  - Added faint terracotta `HemisphereLight` (`0.22`) and dim burnt-orange/hospital-red PointLights (`1.80–2.30` candela, `decay 1.55`) alongside a high-contrast `18.0` candela `[F]` tactical flashlight beam in `engine.js` so rooms stay dark/scary and require the flashlight to navigate cleanly.
- **Continuous Real Weeping Woman Audio Bed, Female Shriek, Silent Behind-You Manifest, Flashlight EMI & RE2R Status Pill (`audioControl.js`, `scaresControl.js`, `HUDControl.jsx`):**
  - Bundled `neo_panda_25-creepy-woman-cry-407580.mp3` -> `frontend/public/assets/audio/room5/creepy-woman-cry.mp3` routed through a Web Audio `GainNode` + reverb send (`audioControl.setWeepingVolume()`) so continuous weeping is audible (`0.36` gain) throughout the round and swells loudly (`-> 1.45` during final `14s` countdown, up to `1.80` at close range) via `comp` limiter protection.
  - Scheduled `MANIFESTING` threats outside Safe Room 5B spawn `~4.2m` behind the player (`pickBehindSpawn` clamped outside 5B) with a spatial behind-neck whisper + brief crimson flash + `1.25s` staring reveal beat before chasing at evadable `1.42 m/s` (no spoiler text banners!).
  - Expanded flashlight EMI flicker (`< 10.5m` visible or `<= 8s` approaching) + random any-time torch malfunction event (`triggerFlashOutage`: `~1s` electrical sputter -> `5.0–7.0s` total dead-lens blackout locked via `_flashOutageActive` -> sputter recovery back on) and refined `HUDControl.jsx` top-left status badges (`font-re-dossier`: `Safe Bay · 5B`, `Clear`, `Caution`, `Danger` — zero `//` slashes, emojis, or `"BEHIND YOU"` prompts).
  - Redesigned entry splash screen (`EntrySplash.jsx` + `control.css`) after *Resident Evil: Requiem*: asymmetric left-aligned slab-serif (`'American Typewriter', 'Roboto Slab', 'Courier Prime'`) **`CURSE THE CODE`** + white brushed-chalk **`room 5`** smear strip + `Main Story`-style frosted translucent highlight bar over the photorealistic corkboard wallpaper (`frontend/public/assets/ui/room5-title-board.jpg`).




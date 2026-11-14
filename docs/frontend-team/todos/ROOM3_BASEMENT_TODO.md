# Room 3 — The Basement (`basement`) Visual Upgrade To-Do

**Owner:** _[Assign name]_ · **Branch:** `visual/room3-basement` · **Round:** 1 (Room 3 of 3 — Finale)
**Prerequisite guides:** Read `../00_START_HERE.md`, `../01_BACKEND_AND_STORY_CONTRACT.md`, `../02_ROOM_FLOW_AND_CONTINUITY.md`, `../04_GLB_INTEGRATION.md`, `../05_OPTIMIZATION.md`, `../06_HORROR_DESIGN.md`.

---

## 1. Files You Own (Do NOT touch anything else)
- `frontend/src/game/engine/basementScene.js`
- `frontend/src/game/rooms/basement.js`
- `frontend/public/assets/models/basement/` (compressed `.glb` only)
- `frontend/public/assets/audio/basement/` (`.mp3` / `.ogg` only)

**Never touch:** `Room3Basement.jsx`, `engine.js`, `torch.js`, `controls.js`, `App.jsx`, `content*.json`, `tests/`, `frontend/src/__tests__/`.

---

## 2. Room Spec & Continuity
- **Previous room:** Room 2 — Daniel's Study (`study`, descending through the heavy steel door).
- **Next:** Round 1 Completion → Lobby / Bridge to Round 2 (`onProceedToLobby` / `Round1VictoryModal` once `R1-FIN` resolves).
- **Theme / Palette:** Industrial containment bunker, concrete slabs, red emergency strobe (`bg: #14161a`, `wall: #34343a`, `floor: #25272b`, `accent: #ff4d4d`, `lamp: #ff2a2a`).
- **Dimensions / Spawn (`rooms/basement.js`):** `size: [8, 3.2, 7]`, `spawn: [0.8, 1.8, 2.6]`.
- **Player Torch:** Already built-in across all rooms via `engine/torch.js` (`flashlight.glb`, `[F]` toggle). Do **not** add another torch.
- **Seam cue:** `floor_seal` (the 2 m circular steel vault hatch in the center floor) visually foreshadows Round 2 ("What Was Sealed Below"). Make it heavy, industrial, and ominous.

---

## 3. Exact Object IDs & `hiding.spot` Checklist (from `content.test.json` + `basementScene.js`)
Every interactive prop must remain a **real visible 3D mesh** tagged with `E.interact(obj, '<exact_id>')` and reachable with `[E]`.

### Clue Entry Props (`clue_entry`)
- [ ] `intercom` (`R1-09`, Wall intercom on concrete wall) — GLB / procedural fallback: ______
- [ ] `rack_door` (`R1-10`, Server rack door with yellow note taped inside) — GLB / procedural fallback: ______
- [ ] `containment_console` (`R1-FIN`, Massive triple-screen steel console — 3-stage Round 1 finale) — GLB / procedural fallback: ______

### Fragment Hiding Props (`hiding`) — 5 fragments (3 real + 2 decoys)
- [ ] `server_rack` (`EK04`: *"the printer tray"* & `XK02` DECOY: *"a drive bay"*) — 42U rack with tray/bays — GLB / procedural: ______
- [ ] `maintenance_terminal` (`EK05`: *"the terminal's audio player"*) — wall-mounted CRT terminal — GLB / procedural: ______
- [ ] `toolbox` (`EK06`: *"under the tool tray"*) — heavy red steel mechanics toolbox — GLB / procedural: ______
- [ ] `floor_seal` (`XK01` DECOY: *"under the grating"*) — 2 m circular floor seal / vault hatch (must look crucial & authentic) — GLB / procedural: ______

### Door & Decor (`decor`)
- [ ] `room_door` (Entry/exit door — keep `ref.roomDoor` / `engine.openDoor()` working)
- [ ] `wall_monitor` (Countdown monitor — keep `ref.wallMonitor?.setText?.(...)` working if wired; **never fake a timer**)
- [ ] `pipes` (Overhead steam pipes + subtle steam/drip feel)
- [ ] `barrels` (Cargo crates / sealed drums)
- [ ] `fuse_box` (Industrial electrical breaker box)

---

## 4. Phase-by-Phase Tasks

### Phase 1 — Research & Baseline
- [ ] Play Room 5 (`?room=5`) to benchmark quality; play Room 2 → Room 3 (`?room=3` or full path) as baseline.
- [ ] Run `cd frontend && npm test` and confirm all tests pass before editing.
- [ ] Create Pinterest mood board (8–12 images: 1980s concrete bunker, server room, red emergency lighting, sealed floor hatch) and get lead approval.

### Phase 2 — Sourcing & Compression
- [ ] Source a damp concrete bunker/server-room shell GLB (fits `[8, 3.2, 7]`) or modular industrial walls/pillars.
- [ ] Source 1980s analog/industrial GLBs (`server_rack`, `containment_console`, `maintenance_terminal`, `toolbox`, `intercom`, `barrels`, `fuse_box`, `floor_seal`, `pipes`).
- [ ] Source Room 3 audio (`amb_basement`, `server_hum`, `pipe_drip`, concrete footsteps, ≥3 one-shots, stinger) per `../06_HORROR_DESIGN.md`.
- [ ] Compress **every** GLB with Meshopt + WebP (`../05_OPTIMIZATION.md`):
  - Shell ≤ 2 MB (≤ 80k tris, ≤ 1024 tex)
  - Hero ≤ 1 MB (≤ 15k tris), Filler ≤ 400 KB (≤ 3k tris)
  - Total `public/assets/models/basement/` ≤ 8 MB
- [ ] Log every model and audio file in `../07_WORKFLOW_CHECKLIST_ASSET_LOG.md`.

### Phase 3 — Safe GLB Integration (`../04_GLB_INTEGRATION.md`)
- [ ] Load GLBs asynchronously in `basementScene.js`, keeping existing procedural objects as `.catch()` fallback.
- [ ] Calibrate `E.solid` boxes around racks, barrels, console, and walls; verify spawn `[0.8, 1.8, 2.6]` is clear.
- [ ] Ensure `rack_door` and `server_rack` are both distinct and cleanly targetable with `[E]` (don't overlap hitboxes).
- [ ] Grade materials to dark damp concrete, rusted steel, and grime (no clean shiny sci-fi panels).

### Phase 4 — Horror & Audio Pass (`../06_HORROR_DESIGN.md`)
- [ ] Keep room dark with red emergency accent (`#ff2a2a`, avoid >3 flashes/sec strobing!) so the built-in `[F]` torch (`engine/torch.js`) slices through concrete & steam.
- [ ] Ambient + server fan hum + pipe drips + footsteps + ≥3 positional one-shots; mute works and audio stops on exit.
- [ ] ≥3 situation-based scares (never in first 30 s, never during modals or final 3-stage terminal input).
- [ ] Add subtle wrongness/dread around `floor_seal` (e.g., distant thudding/scratches from below the hatch).

### Phase 5 — Verification & PR
- [ ] `cd frontend && npm test` passes (zero tests modified)
- [ ] `cd frontend && npm run build` passes
- [ ] Full manual walkthrough (`../01_BACKEND_AND_STORY_CONTRACT.md` §8): enter from Study → collect all 5 fragments → solve `R1-09`, `R1-10`, and 3-stage `R1-FIN` → Round 1 victory flow works → refresh preserves state
- [ ] Performance test at 6× CPU throttle: ≥ 30 FPS throttled / ≥ 60 FPS normal; `< 250` draw calls
- [ ] `git diff --stat origin/main` touches **only** your owned files + `public/assets/*/basement/`
- [ ] Open PR on `visual/room3-basement` with screenshots + 30 s gameplay clip


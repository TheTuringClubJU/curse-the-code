# Room 2 — Daniel's Study (`study`) Visual Upgrade To-Do

**Owner:** _[Assign / coordinate with Subham Das]_ · **Branch:** `visual/room2-study` · **Round:** 1 (Room 2 of 3)
**Prerequisite guides:** Read `../00_START_HERE.md`, `../01_BACKEND_AND_STORY_CONTRACT.md`, `../02_ROOM_FLOW_AND_CONTINUITY.md`, `../04_GLB_INTEGRATION.md`, `../05_OPTIMIZATION.md`, `../06_HORROR_DESIGN.md`.

> **Coordination note:** `TODO.md` lists an active Study contributor (Subham Das). Check with the lead and Subham before editing `studyScene.js` or `study.js`!

---

## 1. Files You Own (Do NOT touch anything else)
- `frontend/src/game/engine/studyScene.js`
- `frontend/src/game/rooms/study.js`
- `frontend/public/assets/models/study/` (compressed `.glb` only)
- `frontend/public/assets/audio/study/` (`.mp3` / `.ogg` only)

**Never touch:** `Room2Study.jsx`, `engine.js`, `torch.js`, `controls.js`, `App.jsx`, `content*.json`, `tests/`, `frontend/src/__tests__/`.

---

## 2. Room Spec & Continuity
- **Previous room:** Room 1 — Lena's Bedroom (`bedroom`). Back door `study_door_back` (if present/enabled) returns to Bedroom.
- **Next room:** Room 3 — The Basement (`basement`) via `study_door_exit` (`onTransitionToRoom3` — backend unlocks when all 4 clues `R1-05..R1-08` are resolved).
- **Theme / Palette:** Green phosphor CRT hacker sanctuary (`bg: #04120b`, `wall: #0b2418`, `accent: #3dff8b`, `glow: #7dffb0`, `lamp: #9dffc4`).
- **Dimensions / Spawn (`rooms/study.js`):** `size: [7.0, 3.2, 6.4]`, `spawn: [0.0, 1.6, 0]`.
- **Player Torch:** Already built-in across all rooms via `engine/torch.js` (`flashlight.glb`, `[F]` toggle). Do **not** add another torch.
- **Seam cues:** Carry one subtle Victorian/purple trace from Room 1 (e.g., framed heirloom/rug corner) into the 1980s mahogany-and-CRT study; make `study_door_exit` a heavy steel bulkhead-style door leading down to the Basement.

---

## 3. Exact Object IDs & `hiding.spot` Checklist (from `content.test.json` + `studyScene.js`)
Every interactive prop must remain a **real visible 3D mesh** tagged with `E.interact(obj, '<exact_id>')`. **Important:** Study uses strict fragment ordering and several props hold **2 fragments** (players revisit them) — keep all props clearly visible and unblocked.

### Clue Entry Props (`clue_entry`)
- [ ] `tablet_drawer` (`R1-05`, Locked desk drawer — under desk edge) — GLB / procedural fallback: ______
- [ ] `crt_monitor` (`R1-06`, Old CRT monitor — center desk) — GLB / procedural fallback: ______
- [ ] `terminal_pc` (`R1-07`, Terminal PC — beige 80s tower on desk) — GLB / procedural fallback: ______
- [ ] `line_printer` (`R1-08`, Dot-matrix printer — side table with fan-fold paper) — GLB / procedural fallback: ______

### Fragment Hiding Props (`hiding`) — 16 fragments (14 real + 2 decoys)
- [ ] `bookshelf` (`ES01`: *"inside a hollowed book"* & `EK03`: *"behind a row of books"*) — GLB / procedural: ______
- [ ] `corkboard` (`ES02`: *"pinned under a flyer"* & `ES09`: *"the back of the board"*) — GLB / procedural: ______
- [ ] `desk_blotter` (`ES03`: *"under the green blotter"*) — GLB / procedural: ______
- [ ] `filing_cabinet` (`ES04`: *"top drawer, behind the folders"* & `ES10`: *"bottom drawer, false bottom"*) — GLB / procedural: ______
- [ ] `sticky_wall` (`ES05`: *"behind the yellow notes"*) — GLB / procedural: ______
- [ ] `armchair` (`ES06`: *"between cushion and frame"*) — GLB / procedural: ______
- [ ] `reel_recorder` (`ES07`: *"taped under the reel"* & `EK02`: *"the recorder's case"*) — GLB / procedural: ______
- [ ] `cable_bundle` (`ES08`: *"a tag tied to the cables"*) — GLB / procedural: ______
- [ ] `floor_lamp` (`ES11`: *"rolled in the lampshade"*) — GLB / procedural: ______
- [ ] `wastebin` (`ES12`: *"crumpled at the bottom"*) — GLB / procedural: ______
- [ ] `window` (`XS01` DECOY: *"the sill"*) — must look just as legit as real props — GLB / procedural: ______
- [ ] `radiator` (`XS02` DECOY: *"behind the pipes"*) — must look just as legit as real props — GLB / procedural: ______

### Doors & Decor (`decor`)
- [ ] `study_door_exit` (Heavy steel exit door to Basement — must visibly open via `engine.openDoor()` / `ref.studyExitDoor`)
- [ ] `desk` (Heavy mahogany executive desk — keep `E.solid` unblocking WASD movement), `coat_stand`, `rug`, `beams_webs` (keep `userData.np = 1` on non-interactive shell/filler).

---

## 4. Phase-by-Phase Tasks

### Phase 1 — Research & Baseline
- [ ] Play Room 5 (`?room=5`) to benchmark quality; play Room 1 → Room 2 end-to-end as baseline.
- [ ] Run `cd frontend && npm test` and confirm all tests pass before editing.
- [ ] Create Pinterest mood board (8–12 images: 1980s dark hacker study, mahogany desk, green CRT glow) and get lead approval.

### Phase 2 — Sourcing & Compression
- [ ] Source a moody 1980s study/office shell GLB (fits `[7.0, 3.2, 6.4]`) or upgrade wall/floor/beam architecture cleanly.
- [ ] Source 1980s-accurate GLBs for hero props (`crt_monitor`, `terminal_pc`, `line_printer`, `reel_recorder`, `filing_cabinet`, `armchair`, `desk`, etc. — no modern flatscreens or RGB gaming gear).
- [ ] Source Room 2 audio (`amb_study`, `crt_hum`, `whisper_far`, footsteps, ≥3 one-shots, stinger) per `../06_HORROR_DESIGN.md`.
- [ ] Compress **every** GLB with Meshopt + WebP (`../05_OPTIMIZATION.md`):
  - Shell ≤ 2 MB (≤ 80k tris, ≤ 1024 tex)
  - Hero ≤ 1 MB (≤ 15k tris), Filler ≤ 400 KB (≤ 3k tris)
  - Total `public/assets/models/study/` ≤ 8 MB
- [ ] Log every model and audio file in `../07_WORKFLOW_CHECKLIST_ASSET_LOG.md`.

### Phase 3 — Safe GLB Integration (`../04_GLB_INTEGRATION.md`)
- [ ] Load GLBs asynchronously in `studyScene.js`, keeping existing procedural geometry as `.catch()` fallback until verified.
- [ ] Preserve `E.interact(grp, id)` on every prop and verify `E.solid` collisions never block the player behind/around `desk` (`7b0f115` fix).
- [ ] Keep CRT canvas screen texture / emissive green phosphor look aligned with Room 2's theme.

### Phase 4 — Horror & Audio Pass (`../06_HORROR_DESIGN.md`)
- [ ] Darken ambient fill so the built-in `[F]` torch (`engine/torch.js`) + green CRT monitor + brass floor lamp drive visibility.
- [ ] Ambient + 60 Hz CRT hum + footsteps + ≥3 positional one-shots; mute works and audio stops on exit.
- [ ] ≥3 situation-based scares (never in first 30 s, never during modals/typing, never blocking clues or strict-chain search).
- [ ] Add subtle "wrongness" details (e.g., chair slightly turned, sticky-note wall shadows, peripheral silhouette).

### Phase 5 — Verification & PR
- [ ] `cd frontend && npm test` passes (zero tests modified)
- [ ] `cd frontend && npm run build` passes
- [ ] Full manual walkthrough (`../01_BACKEND_AND_STORY_CONTRACT.md` §8): enter from Room 1 → collect all 16 fragments in chain → solve/resolve `R1-05..R1-08` → `study_door_exit` opens → refresh restores state → transitions to Basement
- [ ] Performance test at 6× CPU throttle: ≥ 30 FPS throttled / ≥ 60 FPS normal; `< 250` draw calls
- [ ] `git diff --stat origin/main` touches **only** your owned files + `public/assets/*/study/`
- [ ] Open PR on `visual/room2-study` with screenshots + 30 s gameplay clip


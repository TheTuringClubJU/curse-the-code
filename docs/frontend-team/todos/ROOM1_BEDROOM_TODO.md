# Room 1 — Lena's Bedroom (`bedroom`) Visual Upgrade To-Do

**Owner:** _[Assign name]_ · **Branch:** `visual/room1-bedroom` · **Round:** 1 (Room 1 of 3)
**Prerequisite guides:** Read `../00_START_HERE.md`, `../01_BACKEND_AND_STORY_CONTRACT.md`, `../02_ROOM_FLOW_AND_CONTINUITY.md`, `../04_GLB_INTEGRATION.md`, `../05_OPTIMIZATION.md`, `../06_HORROR_DESIGN.md`.

---

## 1. Files You Own (Do NOT touch anything else)
- `frontend/src/game/engine/scene.js`
- `frontend/src/game/engine/decor.js`
- `frontend/src/game/rooms/bedroom.js`
- `frontend/public/assets/models/bedroom/` (compressed `.glb` only)
- `frontend/public/assets/audio/bedroom/` (`.mp3` / `.ogg` only)
- *(Coordinate with the lead before touching `frontend/src/game/engine/scares.js` or `audio.js`, since Rooms 1–3 share them.)*

**Never touch:** `Room1Bedroom.jsx`, `engine.js`, `torch.js`, `controls.js`, `App.jsx`, `content*.json`, `tests/`, `frontend/src/__tests__/`.

---

## 2. Room Spec & Continuity
- **Previous room:** Round 1 Intro / Lobby (`at_start`)
- **Next room:** Room 2 — Daniel's Study (`study`) via `room_door` (`onTransitionToRoom2` — backend unlocks when all 4 clues `R1-01..R1-04` are resolved).
- **Theme / Palette:** Victorian gothic / Halloween, moonlit purple (`bg: #140d26`, `wall: #4a3f73`, `accent: #8f7bff`, `lamp: #ffcf8a`, `moon: #9db8ff`).
- **Dimensions / Spawn (`rooms/bedroom.js`):** `size: [8, 3, 6]`, `spawn: [0.8, 1.8, 0]`.
- **Player Torch:** Already built-in across all rooms via `engine/torch.js` (`flashlight.glb`, `[F]` toggle). Do **not** add another torch.
- **Seam cue:** Keep the exit door (`room_door`) looking like an interior house door leading toward Daniel's study (e.g., subtle green CRT under-door glow when unlocked).

---

## 3. Exact Object IDs & `hiding.spot` Checklist (from `content.test.json` + `scene.js`)
Every interactive prop must remain a **real visible 3D mesh** tagged with `E.interact(obj, '<exact_id>')` and placed within walking raycast reach (~5.5 m). Props holding fragments must visually support their `hiding.spot` description.

### Clue Entry Props (`clue_entry`)
- [ ] `diary` (`R1-01`, Open diary) — GLB / procedural fallback: ______
- [ ] `notebook` (`R1-02`, School notebook) — GLB / procedural fallback: ______
- [ ] `poster` (`R1-03`, Wall poster) — GLB / procedural fallback: ______
- [ ] `portrait` (`R1-04`, Portrait + decoy `XB02` *"behind the canvas"*) — GLB / procedural fallback: ______

### Fragment Hiding Props (`hiding`) — 15 fragments (13 real + 2 decoys)
- [ ] `trunk` (`EB01`: *"folded in the lid lining"*) — GLB / procedural: ______
- [ ] `nightstand` (`EB02`: *"the drawer, under the tissues"*) — GLB / procedural: ______
- [ ] `candle` (`EB03`: *"under the candle holder"*) — GLB / procedural: ______
- [ ] `desk` (`EB04`: *"under the clutter on the desk"*) — GLB / procedural: ______
- [ ] `bed` (`EB05`: *"under the mattress edge"*) — GLB / procedural: ______
- [ ] `wardrobe` (`EB06`: *"a coat pocket"*) — GLB / procedural: ______
- [ ] `musicbox` (`EB07`: *"inside the musicbox compartment"*) — **Note:** `scene.js` & `EB07` use `musicbox` (no underscore), keep `'musicbox'` in `E.interact`! — GLB / procedural: ______
- [ ] `pillow` (`EB08`: *"tucked beneath the pillow"*) — GLB / procedural: ______
- [ ] `clock` (`EB09`: *"behind the clock face"*) — GLB / procedural: ______
- [ ] `bookshelf` (`EB10`: *"inside a hollowed book on the shelf"*) — GLB / procedural: ______
- [ ] `mirror` (`EB11`: *"behind the frame"*) — GLB / procedural: ______
- [ ] `chair` (`EB12`: *"the cushion seam"*) — GLB / procedural: ______
- [ ] `doll` (`EK01`: *"inside the doll"*) — GLB / procedural: ______
- [ ] `photo_frame` (`XB01` DECOY: *"behind the photograph"*) — must look just as legit as real props — GLB / procedural: ______
- [ ] `lamp` (Table lamp) — GLB / procedural: ______
- [ ] `window` (Window) — GLB / procedural: ______

### Door & Decor (`decor`)
- [ ] `room_door` (Exit door to Study — must visibly swing open via `engine.openDoor()`)
- [ ] Non-interactive/decor visuals (`rug`, `pumpkins`, `wall_frames`, `beams_webs`, `bats_spider`) — keep `userData.np = 1` on shell/non-interactive filler so they never steal `[E]`.

---

## 4. Phase-by-Phase Tasks

### Phase 1 — Research & Baseline
- [ ] Play Room 5 (`?room=5`) to benchmark quality, then play Room 1 end-to-end as baseline.
- [ ] Run `cd frontend && npm test` and confirm all tests pass before editing.
- [ ] Create Pinterest mood board (8–12 Victorian gothic haunted bedroom images) and get lead approval.

### Phase 2 — Sourcing & Compression
- [ ] Shortlist & pick a dark Victorian bedroom shell GLB (fits `[8, 3, 6]`) from Sketchfab/itch.io/Poly Pizza.
- [ ] Source/select GLBs for hero props above (or mark "keep procedural" if no GLB fits `hiding.spot`).
- [ ] Source Room 1 audio (`amb_bedroom`, `music_box_faint`, `clock_tick`, footsteps, ≥3 one-shots, stinger) per `../06_HORROR_DESIGN.md`.
- [ ] Compress **every** GLB with Meshopt + WebP (`../05_OPTIMIZATION.md`):
  - Shell ≤ 2 MB (≤ 80k tris, ≤ 1024 tex)
  - Hero ≤ 1 MB (≤ 15k tris), Filler ≤ 400 KB (≤ 3k tris)
  - Total `public/assets/models/bedroom/` ≤ 8 MB
- [ ] Log every model and audio file (author, URL, licence, sizes) in `../07_WORKFLOW_CHECKLIST_ASSET_LOG.md`.

### Phase 3 — Safe GLB Integration (`../04_GLB_INTEGRATION.md`)
- [ ] Load shell GLB asynchronously in `scene.js` with `userData.np = 1`, keeping procedural walls/floor as `.catch()` fallback.
- [ ] Calibrate `E.solid(x0, x1, z0, z1)` wall and furniture collisions; verify spawn `[0.8, 1.8, 0]` is clear.
- [ ] Replace/upgrade props with `E.loadGLB` + `E.interact(grp, id)` + `E.add(grp)`, keeping procedural fallback in `.catch()`.
- [ ] Grade materials toward moonlit purple/aged Victorian wood (no bright glossy plastic).

### Phase 4 — Horror & Audio Pass (`../06_HORROR_DESIGN.md`)
- [ ] Room dark enough that unlit corners rely on the built-in `[F]` torch (`engine/torch.js`), plus moon/candle/lamp contrast.
- [ ] Ambient + footsteps + ≥3 positional one-shots wired cleanly; mute works and audio stops on room exit.
- [ ] ≥3 situation-based scares (never in first 30 s, never during modals/typing, never blocking clues).
- [ ] At least 1 "wrongness" prop (e.g. doll head tracking / crooked portrait) and 1 peripheral silhouette moment.

### Phase 5 — Verification & PR
- [ ] `cd frontend && npm test` passes (zero tests modified)
- [ ] `cd frontend && npm run build` passes
- [ ] Full manual walkthrough (`../01_BACKEND_AND_STORY_CONTRACT.md` §8): enter from lobby → collect all 15 fragments → solve/resolve `R1-01..R1-04` → `room_door` opens → refresh restores state → transitions to Study
- [ ] Performance test at 6× CPU throttle (Chrome DevTools): ≥ 30 FPS throttled / ≥ 60 FPS normal; `< 250` draw calls
- [ ] `git diff --stat origin/main` touches **only** your owned files + `public/assets/*/bedroom/`
- [ ] Open PR on `visual/room1-bedroom` with screenshots + 30 s gameplay clip


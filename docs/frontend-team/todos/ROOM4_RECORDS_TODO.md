# Room 4 — The Rotting Archive (`records`) Visual Upgrade To-Do

**Owner:** _[Assign name]_ · **Branch:** `visual/room4-records` · **Round:** 2 (Room 4 of 6)
**Prerequisite guides:** Read `../00_START_HERE.md`, `../01_BACKEND_AND_STORY_CONTRACT.md`, `../02_ROOM_FLOW_AND_CONTINUITY.md`, `../04_GLB_INTEGRATION.md`, `../05_OPTIMIZATION.md`, `../06_HORROR_DESIGN.md`, and `ROUND2_DESIGN.md` (§ Room 4).

---

## 1. Files You Own (Do NOT touch anything else)
- `frontend/src/game/engine/sceneRecords.js`
- `frontend/src/game/engine/scaresRecords.js`
- `frontend/src/game/engine/audioRecords.js`
- `frontend/src/game/engine/texRecords.js`
- `frontend/src/game/rooms/records.js`
- `frontend/public/assets/models/records/` (compressed `.glb` only)
- `frontend/public/assets/audio/records/` (`.mp3` / `.ogg` only)

**Never touch:** `Room4Records.jsx` (battery drain/recharge logic lives here!), `Fork1Modal.jsx`, `engine.js`, `torch.js`, `controls.js`, `App.jsx`, `content*.json`, `tests/`, `frontend/src/__tests__/`.

---

## 2. Room Spec & Continuity
- **Previous:** Round 2 Start (`at_start`, after Round 1 bridge).
- **Next:** **Fork 1** (Auxiliary Wing A vs. Primary Wing B rotary selector) → Room 5 (`control`). `bulkhead_door` (`R2-07`) is sealed and chained, unsealing when solved/resolved. **Do NOT break Fork 1 or `bulkhead_door`.**
- **Theme / Palette (`ROUND2_DESIGN.md`):** Flooded sub-basement archive, low ceiling with dripping corroded pipes, buckled concrete with standing black water, bowing metal shelves, dying/buzzing fluorescent tubes (`accent: #c47a00`, `emergency: #ba1a1a`, `water: #061014`). **No blue, no clean white.**
- **Dimensions / Spawn (`rooms/records.js`):** `size: [10, 3.2, 8]`, `spawn: [0, 2.6, 0]`.
- **Player Torch:** Already built-in via `engine/torch.js` (`flashlight.glb`, intensity `18.0`, `[F]` toggle). `Room4Records.jsx` already hooks battery drain + `flashlight_item`/`battery_pack` recharge into `setFlashlight`. **Do not touch battery logic or add a second torch.**

---

## 3. Exact Object IDs & `hiding.spot` Checklist (from `content.test.json` + `sceneRecords.js`)
Every interactive prop must remain a **real visible 3D mesh** tagged with `E.interact(obj, '<exact_id>')`.

### Clue Entry Props (`clue_entry`)
- [ ] `report_folder` (`R2-02`, Yellowed incident folder on desk) — GLB / procedural fallback: ______
- [ ] `microfilm_reader` (`R2-03`, Optical microfilm reader with brass dial look) — GLB / procedural fallback: ______
- [ ] `timeline_board` (`R2-04`, Whiteboard / corkboard of event cards) — GLB / procedural fallback: ______
- [ ] `bulkhead_door` (`R2-07`, Heavy sealed & chained north bulkhead door — opens via `ref.bulkheadDoor` / `engine.openDoor()`) — GLB / procedural fallback: ______

### Fragment Hiding Props (`interactive_fragment`) — 12 fragments (`ER01`–`ER10` + decoys `XR01`, `XR02`)
- [ ] `filing_cabinet_a` (`ER01`: *"bottom drawer, under collapsed papers"* & `ER02`: *"inside back wall of second drawer"*) — GLB / procedural: ______
- [ ] `filing_cabinet_b` (`ER03`: *"behind hanging folder dividers, top drawer"* & `ER04`: *"inside hanging folder"*) — GLB / procedural: ______
- [ ] `archive_shelves` (`ER05`: *"waterlogged box on third shelf"* & `ER06`: *"manila envelope taped to back of bottom shelf"* & `XR02` DECOY: *"loose on top shelf"*) — GLB / procedural: ______
- [ ] `clerk_desk` (`ER07`: *"under the desk mat, right-hand side"* & `ER10`: *"inside locked top drawer"*) — GLB / procedural: ______
- [ ] `card_catalog` (`ER08`: *"inside drawer labelled S, behind last index card"*) — GLB / procedural: ______
- [ ] `waste_basket` (`XR01` DECOY: *"crumpled in the waste basket"*) — GLB / procedural: ______
- [ ] `vent_grate` (`ER09`: *"taped to inside face of vent cover"*) — GLB / procedural: ______

### Doors, Pickups & Decor (`decor`)
- [ ] `room_door` (Entry archival hatch — keep `ref.roomDoor` / `Room4Records.jsx` handler working)
- [ ] Keep Fork 1 rotary selector + arches + `flashlight_item` / `battery_pack` interactions intact!
- [ ] `filing_cabinets`, `ceiling_light`, pipes, water puddles, fallen archive boxes (non-interactive filler = `userData.np = 1`, no readable dates/names/clue text!).

---

## 4. Phase-by-Phase Tasks

### Phase 1 — Research & Baseline
- [ ] Play Room 5 (`?room=5`) to benchmark quality; play Room 4 (`?room=4` or Round 2 start) as baseline.
- [ ] Run `cd frontend && npm test` and confirm all Room 4 tests pass before editing.
- [ ] Create Pinterest mood board (8–12 images: flooded concrete archive, rusted filing stacks, flickering tubes, 1980s microfilm/office decay) and get lead approval.

### Phase 2 — Sourcing & Compression
- [ ] Source a flooded/decaying sub-basement or archive room shell GLB (fits `[10, 3.2, 8]`, low ceiling) + heavy bulkhead/corridor arches.
- [ ] Source 1970s–1980s archive GLBs (`filing_cabinet_a/b`, `archive_shelves`, `clerk_desk`, `card_catalog`, `microfilm_reader`, `waste_basket`, `vent_grate`, `bulkhead_door`).
- [ ] Source/refine Room 4 audio (`amb_records`, `fluorescent_buzz`, `paper_shuffle`, wet concrete footsteps, pipe drips, ≥3 one-shots, stinger) per `../06_HORROR_DESIGN.md`.
- [ ] Compress **every** GLB with Meshopt + WebP (`../05_OPTIMIZATION.md`):
  - Shell ≤ 2 MB (≤ 80k tris, ≤ 1024 tex)
  - Hero ≤ 1 MB (≤ 15k tris), Filler ≤ 400 KB (≤ 3k tris)
  - Total `public/assets/models/records/` ≤ 8 MB
- [ ] Log every model and audio file in `../07_WORKFLOW_CHECKLIST_ASSET_LOG.md`.

### Phase 3 — Safe GLB Integration (`../04_GLB_INTEGRATION.md`)
- [ ] Load GLBs asynchronously in `sceneRecords.js`, keeping existing procedural geometry as `.catch()` fallback.
- [ ] Preserve `E.interact(grp, id)` on every prop and ensure `E.solid` collisions match shelf aisles and Fork 1 corridor.
- [ ] Grade all materials to `ROUND2_DESIGN.md` palette (rust, mold, dark wet concrete, amber filament — no blue/clean white).
- [ ] Keep standing water puddles & drip particles performant (low draw calls, merged shelf rows).

### Phase 4 — Horror & Audio Pass (`../06_HORROR_DESIGN.md`)
- [ ] Dark sub-basement lit only by flickering/dying tubes + built-in `[F]` torch (`engine/torch.js`).
- [ ] Extend `scaresRecords.js` with ≥3 situation-based scares (never blocking modals/Fork 1/typing; keep `ROUND2_DESIGN.md` Fork 1 trap sequence intact).
- [ ] Ensure `audioRecords.js` stops cleanly when transitioning through Fork 1 into Room 5.

### Phase 5 — Verification & PR
- [ ] `cd frontend && npm test` passes (zero tests modified)
- [ ] `cd frontend && npm run build` passes
- [ ] Full manual walkthrough (`../01_BACKEND_AND_STORY_CONTRACT.md` §8): collect all 12 fragments → solve/resolve `R2-02..R2-04` + `R2-07` → `bulkhead_door` unseals → test Fork 1 → enters Room 5 cleanly → refresh preserves state
- [ ] Performance test at 6× CPU throttle: ≥ 30 FPS throttled / ≥ 60 FPS normal; `< 250` draw calls
- [ ] `git diff --stat origin/main` touches **only** your owned files + `public/assets/*/records/`
- [ ] Open PR on `visual/room4-records` with screenshots + 30 s gameplay clip


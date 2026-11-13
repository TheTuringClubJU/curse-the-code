# 01 — Backend & Story Contract (THE LAW)

Everything here is derived from the repo: `content.test.json`, `app/game/routes.py`, `TODO.md`,
`ROUND2_DESIGN.md`, `frontend/src/App.jsx`, `Room*.jsx`. If anything in your task contradicts this file,
**stop and ask the lead**.

## 1. Who decides what

| Thing | Authority | You may |
|---|---|---|
| Clue questions, answers, hints, attempts, scoring | **Backend** (FastAPI + PostgreSQL) | never touch, never hardcode |
| Which fragments are collected, basket unlock, room completion | **Backend** (`team_rooms`) | only *display* what the API returns |
| Room list, object IDs, kinds, clue↔object links, unlock order | `content*.json` (`CONTENT_FILE`) | read only |
| Timer / countdown | `GET /api/game/time` | display only; never fake a timer |
| What the room looks, sounds, feels like | **Frontend (you)** | ✅ this is your job |

`content.test.json` is used in dev; `content.live.json` in production (not in this repo).
**Ask the lead to confirm the object IDs are identical in the live file** before merging anything.

## 2. Backend API the rooms already use (do not change calls)

Auth: session cookie (`credentials:'include'`) + `x-session-token` header from `localStorage.ctc_token`.

| Endpoint | Used for |
|---|---|
| `GET /api/game/room/{room_id}` (+ `/state`) | room state, `is_completed`, fragments, clue progress |
| `GET /api/game/room/{room_id}/basket` | evidence basket |
| `POST /api/game/room/{room_id}/search` | pressing **E** on a fragment prop → server decides what drops |
| `GET /api/game/clue/{clue_id}` / `/hints` | clue modal data |
| `POST /api/game/clue/{clue_id}/submit` | answer (3 attempts max, server-side) |
| `GET /api/game/time` | round timer |
| `GET/POST /api/game/fork/{fork_id}/...`, `/round/{n}/fork/...` | Round 2 forks |
| `GET /api/game/round/{n}/dossier` | Round 2 case dossier |
| `POST /api/game/hint`, `GET /api/game/hint/status` | hints |
| `GET /api/lobby/state` | round status polling (App.jsx) |

**Frontend rules that follow from this:**
- Never decide "correct/incorrect", points, attempts, fragment contents, or door unlock on the client.
- Never hardcode clue text, answers, fragment IDs in React/Three code (`TODO.md` §7.1).
- A scare/animation may *react* to a server response; it may never *replace* one.
- Do not add new fetch calls, new endpoints, or new localStorage keys (existing: `ctc_token`, `ctc_current_room`).

## 3. The progression chain (backend-enforced)

```
Round 1:  bedroom (at_start)
            └─ all 4 clues solved OR exhausted ─▶ study
                                  └─ all 4 clues resolved ─▶ basement
                                                   └─ final R1-FIN ─▶ lobby / Round 1 complete
Round 2:  records (at_start) ─ Fork 1 ─▶ control (at_start) ─ Fork 2 ─▶ vault (unlocks when R2-07 solved)
```

- Exit doors stay locked until the backend says the room is complete (`room_completed: true` / `is_completed`).
  The 3D door opens via `engine.openDoor()` **only** in response to that.
- "Resolved" = solved OR exhausted (3 attempts). A team can leave a room with unsolved clues. Do not add visuals that imply otherwise.
- Study/Basement entry is checked server-side. A GLB room can't be "skipped into".

## 4. The IDs you must preserve (from `content.test.json`)

`mesh.userData.id` **must equal the exact `object_id`** (set via `E.interact(obj, id)`).
Every object is a **real, visible 3D mesh** (no invisible hitboxes — `TODO.md` §1.1.2).

### Room 1 — `bedroom` (Lena's Bedroom) · 25 objects
- **clue_entry:** `diary`(R1-01) `notebook`(R1-02) `poster`(R1-03) `portrait`(R1-04)
- **fragment holders (`hiding`):** `trunk` `nightstand` `candle` `desk` `bed` `wardrobe` `lamp` `window` `clock` `pillow` `mirror` `chair` `doll` `photo_frame` `bookshelf`
- **decor:** `music_box` `rug` `pumpkins` `wall_frames` `beams_webs` `bats_spider`
- **door:** `room_door` / `door`
- 15 fragments (13 real + 2 decoys), photo pieces P01–P04

### Room 2 — `study` (Daniel's Study) · 20 objects + 2 doors
- **clue_entry:** `tablet_drawer`(R1-05) `crt_monitor`(R1-06) `terminal_pc`(R1-07) `line_printer`(R1-08)
- **fragment holders:** `bookshelf` `corkboard` `desk_blotter` `filing_cabinet` `sticky_wall` `armchair` `reel_recorder` `cable_bundle` `floor_lamp` `wastebin` `window`(decoy) `radiator`(decoy)
- **decor:** `desk` `rug` `beams_webs` `coat_stand`
- **doors:** `study_door_back` (→ bedroom) · `study_door_exit` / `exit_door` (→ basement)
- 16 fragments (14 real + 2 decoys); fragments are in strict pickup order; some props hold 2 fragments

### Room 3 — `basement` (The Basement) · 11 objects
- **clue_entry:** `intercom`(R1-09) `rack_door`(R1-10) `containment_console`(R1-FIN)
- **fragment holders:** `server_rack` `maintenance_terminal` `toolbox` `floor_seal`(decoy)
- **decor:** `wall_monitor` `pipes` `barrels` `fuse_box`
- **door:** `room_door`
- 5 fragments (3 real + 2 decoys); final terminal has 3 stages

### Room 4 — `records` (The Rotting Archive) · 13 objects
- **clue_entry:** `report_folder`(R2-02) `microfilm_reader`(R2-03) `timeline_board`(R2-04) `bulkhead_door`(R2-07)
- **fragment holders:** `filing_cabinet_a` `filing_cabinet_b` `archive_shelves` `clerk_desk` `card_catalog` `waste_basket` `vent_grate`
- **decor:** `filing_cabinets` `ceiling_light`
- **doors/items:** `room_door`/`door`, `bulkhead_door`, `flashlight_item`, `battery_pack`
- 12 fragments (`ER01`–`ER10` + decoys `XR01`,`XR02`); existing flashlight battery logic (Room4Records.jsx)

### Room 5 — `control` · DONE, do not touch
### Room 6 — `vault` · Swapnil only
`core_glass` `countdown_timer` `manual_terminal`(R2-08) `failsafe_panel`(R2-09) `central_console`(R2-10). No fragments, no basket, **no flashlight in the vault**.

> **Rule:** *Every ID above must still exist, still be a visible mesh, still be reachable with E from walking distance, and still open the same modal after your upgrade.*
> Object **positions are free** (`placement: "provisional"`) as long as the room stays solvable — IDs are not.

### Props must plausibly match the backend's hints
Each fragment has `hiding.spot` and `locate_hint` text shown to players (e.g. trunk: *"folded in the lid lining"*).
Open `content.test.json`, find your room's `evidence[]`, read every `hiding.spot` / `locate_hint`
and make sure the GLB prop you pick actually has that feature (a lid, a drawer, a lining, a hollow book...).
If you can't find a matching model, **keep the procedural prop**. Do not edit the hint text.
Decoys must look exactly as legit as real fragment props.

## 5. Story contract

**Setting:** Hollow House and the sealed facility beneath it ("Substation Delta").

**Round 1 — the house.** A temporal tear has shredded evidence across the rooms.
- **Lena's Bedroom:** Victorian gothic / Halloween, moonlit purple. Her diary, star charts and wall poster were shredded into 15 scraps.
- **Daniel's Study:** Daniel was paranoid; green CRT hacker sanctuary. 16 shredded printouts, 2 intentional decoys.
- **The Basement:** industrial containment cellar, red emergency light, countdown monitor, 3-stage final terminal.

**Round 2 — "What Was Sealed Below".** Dr. Milo Corvin ran an illegal research program under the house from the late 1960s–1980s ("archiving human consciousness"). Official shutdown 1983; he forged the paperwork and kept operating. His subjects became "the archived" and did not leave. Teams are *containment technicians who accidentally opened a sealed door.*
- **Records (Room 4):** flooded sub-basement archive, low ceiling, dripping pipes, dead fluorescent tubes, chained bulkhead.
- **Control (Room 5):** surveillance morgue — cracked CRTs, plastic quarantine sheeting. (done)
- **Vault (Room 6):** occult containment tomb, rusted iron cage, pulsing organism, split-flap countdown.

**Story-safe visuals:** era-appropriate (Victorian → 1980s analog tech), no modern tech (no flat-screens,
smartphones, LED strips, glossy sci-fi), no bright cheerful objects, no text in your textures that contradicts the story
(dates, names, "Lena", "Daniel", "Corvin", "1983"). Do **not** add readable text/numbers/codes on props that could be mistaken for clue content.
Never add evidence-looking documents that aren't real fragments.

## 6. NEVER touch (lead-owned / shared)

```
app/**   schema.sql   content*.json   tests/**   frontend/src/__tests__/**
frontend/src/App.jsx   frontend/src/main.jsx   frontend/src/lobby/**   frontend/src/admin/**
frontend/src/userlogin/**
frontend/src/game/engine/engine.js   engine/torch.js   engine/controls.js   engine/kit.js   engine/tex.js
frontend/src/game/components/**  (HUD, modals)      frontend/src/game/Room*.jsx  (logic)
.github/**   package.json / lockfile   vite.config.js
```
Need a change there? Message the lead with the exact reason; the lead does it.
(The Room 5 torch is already built-in and constant across all rooms via `engine/torch.js` — do NOT modify or re-create it.)

## 7. Contract tests — must be green before every PR

```bash
cd frontend && npm test          # includes Room1..Room5 test suites
cd frontend && npm run build
# if you can run the backend: pytest tests/  (needs PostgreSQL; CI runs it anyway)
```
- **Never edit a test to make it pass.** A failing test = you broke the contract.
- Tests mock `engine.js` and scene modules (`vi.mock`) and run in jsdom (no WebGL, no GLB loading).
  So GLB code lives **inside the scene builder** (`scene.js`, `studyScene.js`, `basementScene.js`, `sceneRecords.js`),
  must **not throw if `E.loadGLB` is missing/rejects**, and must not add new required props/params to `Room*.jsx`.

## 8. Manual contract walkthrough (each room, before PR)

1. Log in with a test team. Enter the room from the *previous* room (not by URL hacking).
2. Every clue_entry prop highlights, shows `[E]` prompt, opens the correct modal.
3. Every fragment prop: E → search request fires → fragment appears in basket (check Network tab: `POST .../search` 200).
4. Wrong answer uses an attempt; correct one marks solved. (UI only reflects server.)
5. Solve/exhaust all clues → door opens → next room loads.
6. Refresh the page mid-room → state restored from server (progress not lost, door state correct).
7. Open on a second device/session → same state.
8. No console errors; no 404 for models/audio in Network tab.

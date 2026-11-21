# 00 — START HERE (Frontend Visual Team)

Read in order: **00 → 01 → 02** (mandatory, 20 min) then the rest as you need them.

| File | Purpose |
|---|---|
| `00_START_HERE.md` | Mission, golden rules |
| `01_BACKEND_AND_STORY_CONTRACT.md` | **THE LAW.** What you may never change: IDs, API, flow, story |
| `02_ROOM_FLOW_AND_CONTINUITY.md` | Per-room sheet: previous room → this room → next room |
| `03_MODEL_SOURCING.md` | Where/what GLBs to download, per room |
| `04_GLB_INTEGRATION.md` | How to put a GLB into a room without breaking anything |
| `05_OPTIMIZATION.md` | Compression + performance budgets for low-end PCs |
| `06_HORROR_DESIGN.md` | Torch, lighting, audio, jump scares |
| `07_WORKFLOW_CHECKLIST_ASSET_LOG.md` | Git rules, PR checklist, asset log |
| `todos/ROOM*_TODO.md` | Your room's dedicated checklist, owned files & exact `object_id`s |

## 1. The mission

Room 5 is our quality benchmark: real GLB models, dark lighting, torch, audio, scares.
Rooms 1–4 currently use procedural Three.js primitives (boxes, cylinders) and look like "potato graphics".

**Rooms 1, 2, 3, 4 = VISUAL UPGRADE of rooms that already work.**
The game logic, backend, clue modals, evidence basket, doors and tests already exist and pass.
You replace what the player *sees and hears* — you do not redesign what the room *does*.

**Room 6 (Vault) = NEW BUILD.** There is no `rooms/vault.js`, no `Room6Vault.jsx`, and `App.jsx` has no vault route yet
(only the `ctc:navigate-room` → `'vault'` event is dispatched by Room 5). Room 6 is the lead's task, built to the same standard.
The same guides apply to it.

| Round | Room | id | Visual-upgrade owner |
|---|---|---|---|
| 1 | Room 1 — Lena's Bedroom | `bedroom` | team member (assign) |
| 1 | Room 2 — Daniel's Study | `study` | team member (assign) |
| 1 | Room 3 — The Basement | `basement` | team member (assign) |
| 2 | Room 4 — The Rotting Archive | `records` | team member (assign) |
| 2 | Room 5 — The Surveillance Morgue | `control` | DONE (Swapnil) — benchmark |
| 2 | Room 6 — The Anointing Vault | `vault` | Swapnil (new build, not started in repo) |

## 2. Golden rules (in priority order)

1. **Backend + story win every conflict.** If a model, idea, or AI suggestion contradicts the backend
   or story (see `01`), the model/idea loses. Always.
2. **Never rename, remove, or add object IDs, clue IDs, fragment IDs, room IDs or API calls.**
   They come from the content JSON. The visuals attach to them.
3. **Only edit files you own** (list in `07`). Shared files belong to the lead.
4. **Keep the old procedural version working until the GLB version passes the checklist.**
5. **Every GLB is compressed** (`05`) and **logged** (`07`).
6. **Must stay smooth on very low-end PCs.**
7. **Horror without gameplay damage**: scares must never block a clue, eat attempts, or softlock a team.

## 3. How to use AI correctly

AI is your coder, not your 3D artist, and **it does not know our backend**. Always start an AI
session by pasting this:

> "Context: this is the Curse the Code game. I am only upgrading visuals of room `<id>`.
> Do NOT change any object IDs, API calls (`/api/game/...`), clue logic, modals, tests, `content*.json`, `app/`
> or shared files (`engine.js`, `App.jsx`, HUD, modals). Only edit `<my files>`.
> Interactive props must keep `E.interact(mesh, '<exact object_id>')`. Keep the old procedural prop as a
> fallback if the GLB fails to load. Follow the pattern in `sceneControl.js` (Room 5)."

If AI proposes changing anything outside your files: **refuse and ask the lead.**

## 4. What went wrong before (so we don't repeat it)

Past pushes conflicted because people edited the same shared files, renamed IDs, changed
logic while "improving visuals", and overwrote each other. The fix is rules `2`, `3`, `4` above plus
the branch rules in `07`.

## 5. One standard for every room, every round

Round 1 (Rooms 1–3) and Round 2 (Rooms 4–6) follow **exactly the same rules and the same quality bar**.
Nothing in these guides is "Round 2 only". Differences between rooms are only: object IDs, mood/palette, story beats —
all listed per room in `01` and `02`.

**Where each room's spec lives (read yours + the shared content file):**

| Room | Spec source |
|---|---|
| 1 Bedroom, 2 Study, 3 Basement | `TODO.md` §2–§3 (object inventories, clues) + `content*.json` + `ROUND2_DESIGN.md` only for story background |
| 4 Records, 5 Control, 6 Vault | `ROUND2_DESIGN.md` (3D spec, props, horror layer) + `content*.json` |
| All rooms | `01_BACKEND_AND_STORY_CONTRACT.md` (this team's contract) |

(`TODO.md` mentions a `round2_horror_design.md`; it is **not in the repo**. Ask the lead if you need it.)

**Definition of Done — identical for every room:** the checklist in `07` §4 (contract, seams, horror, performance, assets logged).
A room isn't done because it "looks good"; it's done when the whole checklist is ticked.

## 6. The previous TODO list still applies

`TODO.md` is still the project's master plan. **The only line these guides override is §1.1 point 3 ("Zero GLB").**
Everything else is still in force:

| From `TODO.md` | Still required |
|---|---|
| §1.1.1 `controls.js` is the single source of movement | Don't add your own movement/key listeners |
| §1.1.2 Every object is a visible, tangible mesh with `userData.id = object_id` | Yes — see `01`/`04` |
| §1.1.3 geometry merging, shared materials, low poly | Still good practice for **procedural leftovers**; GLBs follow `05` |
| §1.1.3 <250 draw calls, 1 shadow light, ≤2 point lights | Yes (`05`) |
| §1.1.4 Reuse HUD, BasketModal, CaseFilesModal, ClueModal, RoomCompleteModal | Yes — never rewrite modals |
| §1.2 Backend crypto, attempts, locking | Backend only; never reproduce on client |
| §4 / §5 test suites (100 tests per room) | Your changes must not break them; Room 6 needs its own 100 tests |
| §7.1 Content immutability (no hardcoded clue text/answers/IDs) | Yes |
| §7.2 `content.test.json` dev / `content.live.json` prod | Yes |
| §7.3 Branch protection; §7.4 no answers in logs | Yes |

Unchecked `- [ ]` items in `TODO.md` (mostly the QA-R1 test lists) are test-writing tasks owned by the room's logic owners,
not visual tasks. Don't tick or edit `TODO.md`; ask the lead.

# 03 — Sourcing GLB Models (Free)

**Before you download anything:** read `01` (IDs + story) and your room sheet in `02`.
Your shopping list is **the object list of your room** — not random spooky stuff.

## Where to look

| Site | Notes |
|---|---|
| **Sketchfab** (sketchfab.com) | Best. Filter *Downloadable*, license CC0/CC-BY, format glTF/GLB. Sort by Likes. Free account needed. |
| **Poly Pizza** (poly.pizza) | CC0/CC-BY low-poly props, direct GLB. |
| **Quaternius** (quaternius.com) | CC0 packs, kits. |
| **Kenney** (kenney.nl/assets) | CC0, clean low-poly; needs darkening. |
| **itch.io** (itch.io/game-assets/free/tag-3d) | Search "horror", "haunted", "gothic", "dungeon", "retro computer". Check licence on each page; often FBX/OBJ. |
| **Poly Haven** (polyhaven.com/models) | CC0, high quality — compress hard. |
| Free3D / CGTrader (free) / TurboSquid (free) | Last resort, check licence. |

Keywords: `abandoned bedroom`, `victorian bedroom`, `four poster bed`, `old study`, `crt monitor`, `dot matrix printer`,
`reel to reel`, `server rack`, `industrial bunker`, `filing cabinet`, `archive shelves`, `microfilm`, `flooded basement`,
`horror room`, `liminal`, `low poly horror`, `ps1 horror`.

## Licence rules
- ✅ CC0, CC-BY (log the author), royalty-free "free standard".
- ❌ CC-BY-NC, No-Derivatives (we compress/edit) → ask the lead first.
- ❌ Ripped game files (Resident Evil, Phasmophobia…). Reference *look* only.

## Category A — Room shell (find FIRST)
Walls, floor, ceiling, doors, windows as one GLB, enclosed (we walk inside).
- It must **match the room's mood** (sheet in `02`) and be **dark/moody even in daylight preview**.
- Must have a **door opening** we can attach `room_door`/`study_door_exit`… to (or you add a door prop).
- Dimensions: the room config in `rooms/<id>.js` has `size:[W,H,D]` (bedroom is `[8,3,6]`). Pick a shell that can be **scaled to that footprint** (or ask lead to change `size`; spawn + collisions depend on it).
- Prefer baked lighting/textures. Prefer a single simple room over a mansion (bounds + collisions are one box).
- Reject shells with: modern sci-fi, neon, windows showing a daytime city, bright white walls (can darken, but avoid).

## Category B — Props for **your object IDs** (required)
Copy your room's ID list from `01` §4 into your tracker (`07`) and find a model for each **or decide to keep the procedural one**.

| Room | Hero props (must match IDs) | Look for |
|---|---|---|
| 1 Bedroom | `bed` (four-poster), `trunk`, `wardrobe`, `nightstand`, `desk`, `chair` (rocking), `mirror`, `doll`, `clock`, `portrait`, `poster`, `bookshelf`, `candle`, `lamp`, `music_box`, `photo_frame`, `diary`, `notebook` | Victorian, antique wood, creepy doll, candelabra, torn wallpaper |
| 2 Study | `crt_monitor`, `terminal_pc`, `line_printer`, `tablet_drawer`(desk w/ drawer + tablet), `reel_recorder`, `filing_cabinet`, `corkboard`, `armchair`, `radiator`, `floor_lamp`, `bookshelf`, `desk`, `wastebin`, `cable_bundle`, `coat_stand` | 1980s hacker desk, beige PC, green CRT, mahogany desk, leather armchair |
| 3 Basement | `server_rack`, `rack_door`, `intercom`, `containment_console`, `maintenance_terminal`, `toolbox`, `floor_seal`, `wall_monitor`, `pipes`, `barrels`, `fuse_box` | bunker, server room, industrial control, boiler pipes, hatch/vault door |
| 4 Records | `filing_cabinet_a/b`, `archive_shelves`, `clerk_desk`, `card_catalog`, `waste_basket`, `vent_grate`, `report_folder`, `microfilm_reader`, `timeline_board`, `bulkhead_door`, `ceiling_light` (fluorescent tube) | archive, library stacks, metal shelving, flooded basement, blast door, card catalog |
| 6 Vault (lead) | `core_glass`, `countdown_timer` (split-flap board), `manual_terminal` (cast-iron workstation), `failsafe_panel` (brass 8-lever switchboard), `central_console` (altar console), rusted spherical iron cage, chains, organism (flesh core) | occult, brutalist concrete dome, rebar, split-flap display, knife switch, flesh/organic mass |

Hero rule: ≤ 8 detailed props; the rest cheap. Instead of many mismatched models, **fewer consistent models** (same era/condition).

## Category C — Torch (see `06`)
Already built-in and constant across all rooms! The Room 5 player torch (`/assets/models/room5/flashlight.glb`) and all its mechanics are wired into the engine for every room via `frontend/src/game/engine/torch.js`. Do **not** download or load a separate torch GLB.

## Category D — Creatures / scare actors
Ghost/figure/mannequin/crawler. Reuse Room 5's `ghost.glb` if the lead approves (consistency + free). Max 2 MB.
Story check: "the archived" are former human subjects (Round 2). Round 1 haunts are more domestic/ghostly. Don't use random monsters (demons, zombies, aliens) — **off-story**.

## Category E — Audio
Freesound (CC0 filter), Pixabay, OpenGameArt, itch.io packs. See `06`.

## Essential vs optional extra props (non-ID decoration)
**Essential for atmosphere** (cheap, safe, no IDs): cobwebs (alpha planes), grime/blood decals (alpha planes), debris/paper clutter, crooked frames, overturned chair, stopped clock, bare bulbs, chains.
**Optional:** candles, skulls, radio/gramophone, typewriter, jars/specimens, syringes/medical trays, wheelchair, rocking chair, crates, buckets, rats, ouija board, rugs, curtains.
⚠ Extra props must be **non-interactive** (no `userData.id`, `userData.np=1`) and must **not block** paths to interactive props or doors. Never place a loose "paper/note/photo" prop that looks like an evidence scrap.

## Model selection checklist
- [ ] Matches the room's mood/era in `02` and the story in `01` §5
- [ ] Looks creepy in a dark viewer (not just in the bright preview)
- [ ] Right kind of prop for its object ID (can do what `hiding.spot` says)
- [ ] No embedded text/logos/dates that contradict the story
- [ ] Triangles: shell ≤150k raw, hero ≤30k, filler ≤8k (we'll reduce)
- [ ] Texture sizes sane; licence OK; author logged
- [ ] No embedded cameras/lights/animations we don't need
- [ ] Mood board (Pinterest, 8–12 images per room) approved by lead before bulk downloading

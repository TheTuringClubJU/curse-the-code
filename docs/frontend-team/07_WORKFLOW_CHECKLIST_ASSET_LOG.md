# 07 — Workflow, Ownership, PR Checklist, Asset Log

## 1. Git rules (prevents "conflicting pushes")
1. **One branch per room**: `visual/room1-bedroom`, `visual/room2-study`, `visual/room3-basement`, `visual/room4-records`. Branch from latest `main`.
2. **Only edit your room's files** (table in `04`). Other rooms' files are off-limits even for "tiny fixes".
3. **Never commit** shared/lead files (`01` §6). If `git status` shows them, `git restore` them.
4. Commit small, often. Message: `visual(room2): add crt_monitor GLB`.
5. Rebase on `main` daily: `git fetch && git rebase origin/main`. Resolve conflicts only in your files; ask the lead if a conflict touches anything else.
6. **Never force-push to shared branches. Never push to `main`.** Open a PR to the lead's branch.
7. Don't commit: raw models (`raw_models/` is gitignored), `node_modules`, `dist`, `.env`, `content.live.json`.
8. **Room 2 (Study) may have an active contributor (`TODO.md` lists one)** — message the lead and them before starting.
9. Before opening the PR run: `git diff --stat origin/main` and confirm **only** your files + your `public/assets/<type>/<room>/` folders changed.

## 2. File ownership
| Owner of | Files |
|---|---|
| Room 1 | `engine/scene.js`, `engine/decor.js`, `rooms/bedroom.js`, `engine/scares.js`*, `public/assets/*/bedroom/` |
| Room 2 | `engine/studyScene.js`, `rooms/study.js`, `public/assets/*/study/` |
| Room 3 | `engine/basementScene.js`, `rooms/basement.js`, `public/assets/*/basement/` |
| Room 4 | `engine/sceneRecords.js`, `scaresRecords.js`, `audioRecords.js`, `rooms/records.js`, `public/assets/*/records/` |
| Room 6 | new files created by the lead (`sceneVault.js`, `rooms/vault.js`, `Room6Vault.jsx`, `public/assets/*/vault/`) |
| Lead | everything else |

\* `scares.js` and `audio.js` (`GameAudio`) are used by Rooms 1–3. Coordinate through the lead before editing; additions only, never behaviour changes for other rooms.
Also: `engine.js` has per-room `if(room.id===...)` branches — the lead edits it.

## 3. Folder layout
```
frontend/public/assets/models/<room>/   compressed .glb only
frontend/public/assets/audio/<room>/    .mp3/.ogg
raw_models/<room>/                      originals (local, gitignored)
```

## 4. Room TODO (copy into the PR description)

**Room:** ____ **Owner:** ____ **Branch:** ____

### Phase 1 — Research
- [ ] Read `00`–`02`; play the room end to end **and** the previous + next room
- [ ] Baseline: `npm test` green; manual walkthrough (`01` §8) noted
- [ ] Copy ID list from `01` §4 into the table below
- [ ] Pinterest board (8–12 images) approved by lead

### Phase 2 — Assets
- [ ] Shell GLB tested in viewer + fits `size`
- [ ] A model (or "keep procedural") chosen for **every** object ID
- [ ] Creature/scare actor decision confirmed with lead (torch is already built-in via `engine/torch.js`)
- [ ] Audio chosen from the room's content `ambient` brief
- [ ] All GLBs compressed (`05`) and logged below

### Phase 3 — Integration (`04`)
- [ ] Shell + collisions + spawn + door
- [ ] Every ID: mesh visible, tagged, reachable, correct modal
- [ ] Old procedural fallback retained until verified

### Phase 4 — Horror (`06` checklist)
### Phase 5 — Contract + performance
- [ ] `npm test` ✔ `npm run build` ✔ (no test edited)
- [ ] `01` §8 walkthrough all ✔ (incl. refresh + second device)
- [ ] `02` seam checklist ✔
- [ ] FPS ≥ 60 / ≥ 30 at 6× throttle; `renderer.info`: calls __ tris __ textures __; model total __ MB
- [ ] `git diff --stat` shows only owned files

### Phase 6 — Review
- [ ] Screenshots + 30 s video in PR; lead sign-off

## 5. PR template
```
Room: <id>   Type: visual-only
Changed files: (list)  — confirm none from the "never touch" list
Backend/API/content/tests touched: NO
Object IDs preserved: yes (checked 01 §4)
Tests: npm test ✔  npm run build ✔
Walkthrough (01 §8): ✔  Seams (02): ✔  Horror (06): ✔
Perf: fps __ / throttled __ ; calls __ ; total model MB __
Assets logged in ASSET_LOG: yes
```

## 6. Object ID tracker (per room)
| Object ID | kind | Model used (or "procedural") | Reachable w/ E ✔ | Modal opens ✔ | Notes |
|---|---|---|---|---|---|

## 7. ASSET_LOG (one row per file — mandatory)
| Room | File in repo | Name | Author | Source URL | Licence | Original → Final MB | Tris before → after |
|---|---|---|---|---|---|---|---|
| 5 | flashlight.glb | (example) | | | | | |

CC-BY credits will go into the game's credits screen — keep author names exact.

## 8. If something breaks
1. Stop. Don't "fix" it in shared files.
2. `git stash` / revert your last commit; confirm the baseline works again.
3. Report to the lead: what you changed, what failed, console error, screenshot.

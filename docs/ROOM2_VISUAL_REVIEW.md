# Room 2 local visual review

**Current guidance/theme revision:** [ROOM2_GUIDANCE_REVIEW.md](ROOM2_GUIDANCE_REVIEW.md). The report below records the earlier asset revision; its backend-unchanged statement predates the new Study-only hint policy.

Branch: `visual/room2-study`, based on main `ee31040`. All frontend work remains local. No frontend commit, push, PR, merge or deployment has been performed.

## Preview and scope

Frontend: http://127.0.0.1:5173 . Backend: http://127.0.0.1:8000 . Hard-refresh after an update.

Use the existing Study Preview account (`study-preview`) for user testing. Its saved progress and device sessions were preserved. The separate local Study Atmosphere QA account (`atmosphere-local`, id 9) completed this revision's walkthrough; it now normally enters Basement on reload. The older Study Visual QA account is also complete. No existing sessions were released.

Only the Study frontend, its assets and guarded engine integration changed. Backend, schema, content JSON and other rooms' implementations remain unchanged. All original object IDs, 16 fragment IDs and four clue IDs remain intact. The single computer exposes R1-06 on its screen and R1-07 on its base/keyboard. The existing server decides solved-or-exhausted completion. There is no new key item or frontend-only unlock.

WASD/mouse move/look, E inspects, F toggles the lead reference torch, B opens evidence and C/P/R/H open the other investigation tools. The south door returns to Bedroom. Server completion enables the north Basement door; its first E plays the finale and a subsequent E enters Basement.

## Revision 2 changes

- Full gothic door assemblies and pointed wall openings replace the missing surrounds/blue gaps. The north leaf has a proper hinge and an unlit passage behind it. Window arches now have fitted wall cutouts above them.
- Continuous rolling forest terrain, photographed ground texture, three full leafy near trees, eight far LOD trees, layered drifting mist, rain and the distant downloaded keep replace the floating rocky slab/stick trees. This remains a medieval keep, not an RE4 castle replica.
- The supplied vintage recorder and matrix printer replace placeholders. One computer faces the chair, books sit on the desk, and the bin is beside it. Metal drawer pedestals are removed.
- The supplied Victorian console sits against the west wall with the searchable oil lamp on top, its real animated drawer, a wall map, three searchable notes and the supplied coat stand. The searchable carved archive cabinet is beside it with a small clearance; the supplied corkboard is on the opposite wall.
- Two vintage chandeliers, four ceiling webs, one covered body, a cast-iron radiator under the window, candles, filled bookcases, rocking chair, correspondence and skull fill out the room. Ambient lighting is dimmer while the original player torch remains consistent.
- The Study evidence table presents the actual public backend records/chunks after unwrapping; the old CTC placeholder PNGs are no longer used in this room. Sealed records remain concealed until the basket unlocks.

## Horror timing

The supplied animated lying figure crosses opposing walls in exactly two seconds, with dark smoke, a buzz, three broad light-dimming pulses and the supplied eyesaur recording fitted to two seconds. First pass: 35-55 active-play seconds. Later passes: 65-100 seconds apart, four maximum per team/browser tab session. A short playthrough can contain fewer passes. Opening menus cancels an active pass and restores the player's torch setting. Cosmetic limits survive refresh through sessionStorage; they do not alter backend progress.

Sparse unease clips begin after 80-115 active seconds and are separated by 85-130 seconds, with spacing from passes. The crying spirit appears at 8/16 fragments and moves toward the exit as collection increases. At all 16 it occupies the doorway. After server completion, the first exit action hides the HUD/torch and shows the supplied spirit's face against black with the supplied scream. Actual decoded duration: approximately 3.984 seconds. Then it vanishes, the door opens, controls resume and a separate E performs the transition. No actor damages or kills the player.

Menus, typing and hidden tabs suspend horror audio/scheduling. Reduced motion disables passes/light pulses and uses a static close-up. Mute applies to every channel. Missing cosmetic models/audio cannot permanently block the exit.

## Verification

- Final frontend suite: **285 passed across 15 files** (`npm test -- --reporter=dot`). Includes real Three scene contracts, arch openings and upper-corner coverage, asynchronous replacement/disposal, screen mapping, audio pause/resume/cancellation, two-second duration/cap, reduced motion, halfway spirit, backend completion gating and the React two-action exit handoff.
- Production frontend build: passed (`npm run build`). Existing bundle-size warning remains. Existing modal tests still emit React act warnings.
- `git diff --check`: passed. Backend files, schema and content JSON unchanged. Previous real-PostgreSQL Study regression result was 132 passed; it was not rerun for this frontend-only revision.
- Actual browser with isolated local QA account and the real local backend: all **16 fragments** collected through targeting and E, including repeated corkboard/cabinet/recorder/bookshelf pickups and cross-room fragments. The camera was positioned through debug controls for focused hit-testing; this is not a continuous collision/maze navigation certification.
- The supplied console drawer, single computer's screen/base and supplied printer opened all four existing case interfaces. Tape, memory and printer-sheet ordering controls were exercised; all four synthetic test answers were accepted on their first submission, awarding **P05-P08** and setting server completion true. Real event answers were not added to frontend code.
- Evidence table showed recovered backend text, binary and log records rather than placeholder images. Halfway ghost visibility/crying channel observed at 8/16. The tiny cable's picking volume was expanded for practical targeting.
- Actual first exit E: door stayed closed beforehand, camera close-up became visible, torch/HUD hidden, only finale audio channel active, B was blocked. It ended after approximately **4014 ms**. Close-up/spirit hid, torch restored and door opened. Second E returned **HTTP 200 / room_id basement** and displayed Basement intro. Normal reload also entered Basement.
- A separate controlled-time render preview verified the rigged 1.85 m runner, dark aura and pass channel. Automated tests exercise all four passes and exact duration; this controlled preview is distinct from a natural-timing playthrough.
- Final close-up was pulled back slightly after screenshot inspection to avoid clipping into its face. Door/window/desk/recorder/chandelier views were recaptured. Every one of **57 scene placements loaded, zero failed**, plus the separate player torch. Final fresh render had no texture/WebGL warnings or scene exceptions.
- Completed QA was temporarily kept in Study by intercepting only its initial Basement route-selection probe for visual screenshots. Those deliberate 403s are expected in the review console. The override was removed; the actual exit/ordinary reload checks used normal backend responses. No database progress was reset by this screenshot override.

Performance sample: 1600 x 1000 on Intel UHD / ANGLE, about **27 rendered FPS** looking toward the wooded window at the adaptive 0.7 canvas pixel ratio (213 draw calls, about 442k visible triangles). Another interior view had about 191 draw calls. This is a limited desktop sample; 60 FPS and mobile hardware are not certified. The CSS HUD stays at native resolution.

## Models and review images

**35 distinct GLBs / 25.91 MB total**, each below 4 MB. Sources, roles and license metadata are in [the model inventory](ROOM2_MODEL_INVENTORY.md). User originals are intact. Superseded processed runtime props were moved into ignored scratch storage. Audio provenance is recorded in `frontend/public/audio/study/README.md`.

Current images: [desk/computer/printer](room2-revision2-desk.jpeg), [window/forest](room2-revision2-window.jpeg), [console/map/coat stand](room2-revision2-corner.jpeg), [recorder](room2-revision2-recorder.jpeg), [back door](room2-revision2-back-door.jpeg), [radiator](room2-revision2-radiator.jpeg), [chandelier/webs](room2-revision2-ceiling.jpeg), [evidence](room2-revision2-evidence.jpeg), [runner preview](room2-revision2-pass.jpeg), [doorway spirit](room2-revision2-exit-ghost.jpeg), [final face](room2-revision2-finale.jpeg).

User art/performance review remains before any merge request. Original external attribution for the lead-provided torch/computer and the supplied audio publication receipts remain to be consolidated with event credits. The inventory retains all supplied license distinctions.

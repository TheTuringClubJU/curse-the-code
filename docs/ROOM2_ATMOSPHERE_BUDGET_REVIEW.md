# Room 2 blood, mist and model budget

Latest follow-up: [window, blood and scare cadence refinement](ROOM2_WINDOW_ATMOSPHERE_REFINEMENT.md). Current runtime GLB total is **17.53 MB**; the measurements below record the preceding 17.71 MB revision.

Local revision, 15 November 2026. No commits, uploads, PR or deployment. Backend files and other rooms were unchanged in this revision. Room 2's original clue IDs, order, rewards, completion rules, torch character model and recent scare behavior are preserved.

## Atmosphere

Added three irregular dried-blood spills and dripping hand-drawn blood writing on the south wall and west bookcase: “IT LISTENS” and “STAY QUIET”. They are cosmetic, carry no interaction IDs and contain no puzzle answers. Their locations leave doors and evidence targets clear. Added small floor wisps and candle smoke inside, distance/ground haze outside and a textured red moon behind the trees.

This uses small static Canvas textures, instanced quads and a haze calculation in the existing terrain draw. It adds no volumetric render pass, physics simulation, new shadow-casting light or continuous particle spawning. Interior mist is one instanced draw with five quads; outdoor mist replaces twelve individual sprites with one instanced draw of five quads. Low mode reduces each mist batch to three quads. Effects have a rendering cost; they are bounded and offset by the geometry/material optimizations below.

Inspected screenshots: [wall writing](room2-budget-wall-writing.jpeg), [bookcase writing](room2-budget-shelf-writing.jpeg), [blood spill](room2-budget-floor-blood.jpeg), [moon / exterior haze](room2-budget-window.jpeg), [Low window view](room2-budget-low-window.jpeg).

## Asset budget

All **37 runtime GLBs, including the player torch, total 17,710,528 bytes (17.71 decimal MB)**, down from 27,612,756 bytes (27.61 MB): a 35.9% reduction. Every file remains below 4 MB. Standalone images, audio and JavaScript are separate from this GLB budget. New blood/moon/mist effects do not add GLB files.

The window, bookcase, main desk, computer, player torch, main chair and final blood-stained spirit files are byte-for-byte unchanged. User originals in `glb files/` are untouched. Exact previous runtime copies were backed up under ignored `scratch/study-budget/original-runtime/`.

| Secondary asset | Before MB | After MB | Geometry change |
| --- | ---: | ---: | --- |
| Near tree | 3.724 | 0.789 | 248,959 → 34,724 triangles |
| Far tree | 0.721 | 0.291 | 29,687 → 7,520 triangles |
| Desk book pack | 2.324 | 0.274 | Retains the three used books; removes nine unused books and 27 unused textures |
| Distant castle | 2.266 | 1.229 | All 21,586 triangles retained; secondary texture size reduced |
| Window watcher | 1.673 | 0.665 | 216,655 → 54,204 triangles; all four complementary mesh parts retained |
| Cable pack | 0.878 | 0.091 | Retains the used cable; removes 48 unused meshes |
| Bin pack | 0.808 | 0.164 | Retains the rusted bin and handles |
| Covered body | 0.705 | 0.213 | 45,039 → 15,763 triangles |
| Wall map | 0.435 | 0.179 | 64,135 → 22,446 triangles |
| Chandelier | 0.434 | 0.241 | Mostly texture reduction; geometry/detail largely retained |
| Background side chair | 1.711 | 1.640 | Small texture reduction; strict shape-error limit retained its carving geometry |

[Full current inventory and attribution](ROOM2_MODEL_INVENTORY.md), [machine-readable budget and geometry counts](room2-model-budget.json).

## Older-PC support

The Study entry screen now offers **Balanced** and **Low (older PCs)**. Choosing a mode reloads the room and preserves authenticated backend progress; the preference is remembered for this browser and an explicit URL overrides it.

- Balanced retains important model texture detail, antialiasing and the existing static shadow. Sustained slow frames can reduce only the 3D canvas to a 0.6 pixel ratio, with conservative detail recovery.
- Low caps loaded GLB textures at 512 pixels, disables antialiasing/shadows and uses a 0.85 initial maximum pixel ratio with a 0.5 floor. It releases replaced ImageBitmaps safely after replacing shared references. Dynamic CRT text stays at 768 pixels for readability; normal HTML text stays sharp. Standalone room textures are separate from the GLB texture cap.
- Distant trees use three instanced batches of eight trees each and diffuse-only materials. Nearby leafy silhouettes remain present. Offscreen exterior culling works in both modes, including when shadows are disabled. Ground material uses diffuse lighting and haze in the same draw.

Local graphics profiles, 1920×1080 viewport, fixed canvas ratio 0.7, 120 frames per view:

| Mode / revision | West wall FPS | Window FPS | Window triangles |
| --- | ---: | ---: | ---: |
| Before this revision | 37.2 | 38.0 | 898,119 |
| Current Balanced | 39.7 | 45.6 | 502,694 |
| Current Low | 48.7 | 54.1 | 502,686 |

Profiling paused cosmetic activity and hid the watcher for comparable views; these were render measurements, not gameplay walkthroughs. Pixel ratio was held fixed; Low also disables antialiasing/shadows and reduces textures. These are local samples, not a universal FPS guarantee or a certification for every older PC. Automatic mode resolution may differ during real play. The reduced window triangle count is about 44% below the measured baseline.

## Validation

- Full frontend: **338 tests passed across 22 files**. Added real-file budget/GLB integrity checks, geometry ceilings, selected-node preservation, cosmetic-only atmosphere, bounded instancing, preferences, shared-image resizing/release and resolution floors. Existing Room 2, audio/scare, hint and other-room regressions pass.
- Production frontend build and `git diff --check` passed. Existing bundle-size and React test `act` warnings remain. Browser reported no shader/WebGL warnings or model/texture failures; only the existing missing favicon was logged.
- Both graphics modes loaded **75/75 model placements with zero failures**. The far-tree batches each contain eight instances. Low was selected through the actual entry-screen link; shadows were disabled and imported GLB textures capped correctly. The larger dynamically generated CRT display was intentionally retained.
- Read-only browser targeting checked all 16 original props in both modes, including bookshelf, repeated-evidence cabinet, map-side notes, recorder, cable, drawer, screen/base, printer, radiator and window. Blood/fog did not intercept E targeting.
- Both modes passed the real Basement exit: face/scream, then normal WASD movement while piano continued with torch at 9, followed by an opened door and **HTTP 200 from the real Basement endpoint** on the next E. A completed isolated QA account was used. No API responses were mocked and no player progress reset.
- No backend code changed; the preceding full backend run of 324 passing tests remains recorded in the window-ghost review. The prior complete fresh-team investigation walkthrough remains documented there.

Open http://127.0.0.1:5173/study and choose the desired detail mode before entering.

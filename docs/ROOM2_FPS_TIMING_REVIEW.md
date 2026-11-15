# Room 2: FPS, later procession and persistent Basement ghost

Local revision, 15 November 2026. No commit, push, PR or deployment. Backend files and other rooms are unchanged by this revision.

## Rendering changes

The main cost was physical glass transmission: the player torch lens, furniture glass and chandelier glass forced Three.js to redraw opaque scenery into a multisampled refraction buffer each frame. In the measured desk view, the bookcases alone were submitted twice (78 submissions rather than 39).

Study's GLB loader now converts refractive glass to lightweight tinted transparency, retaining its texture and shape. It disables depth writes on that glass and uses one pass for double-sided transparent surfaces such as candle flames. Opaque furniture maps, roughness and detail remain unchanged. The conversion applies only inside the Study loader, including its local torch copy; source GLBs and other rooms retain their materials.

Study also follows each display animation frame. The old exact 16.666 ms gate could discard healthy frames, and imposed a 60 FPS ceiling on faster displays. Other rooms retain the existing pacing. Movement and scare clocks still use elapsed seconds, rather than frame counts. Adaptive resolution and Low mode remain available.

### Same-view local measurements

Balanced mode, fixed 0.7 pixel ratio, 896x442 drawing buffer, static desk/window poses, 120 rendered frames per sample:

| View | Before FPS | After FPS | Render calls before / after | Triangles submitted before / after |
| --- | ---: | ---: | ---: | ---: |
| Desk | 48.7 | 73.5 | 286 / 150 | 646,517 / 381,507 |
| Window | 53.1 | 81.6 | 159 / 90 | 660,664 / 461,267 |

An intermediate check of the glass fix with the old frame gate still active reduced desk render CPU time from about 11.0 to 4.5 ms. The final uncapped sample renders more frequently and measured about 9.0 ms desk / 6.7 ms window per render under that load. These are local samples, not a promise for every PC or a whole-playthrough average. The measurable reduction in repeated scene submissions is independent of the display refresh rate. [Comparison data](room2-fps-comparison.json).

## Smaller exterior assets

Near-tree diffuse/alpha textures are capped at 256px, far-tree textures at 128px. Six unused normal/metallic/occlusion textures were removed from each tree GLB. Full foliage and geometry remain: 34,724 near triangles and 7,520 far triangles. No downloaded source original was changed.

| File | Previous bytes | Current bytes |
| --- | ---: | ---: |
| tree_small_02.glb | 682,416 | 567,620 |
| tree_small_02_far.glb | 219,320 | 159,748 |

**41 runtime GLBs now total 18,147,616 bytes (18.15 decimal MB)**, down from 18,321,984 bytes. Every file is below 4 MB. Standalone textures, audio and JavaScript remain additional to the GLB budget. [Inventory](ROOM2_MODEL_INVENTORY.md), [current budget](room2-model-budget.json).

## Timing and ghost fixes

The procession requires **both at least six recovered fragments and a randomized minimum of 60-75 active seconds**. Menus, typing and hidden tabs do not count. A foreground scare can postpone it further. Five or fewer fragments never trigger it, regardless of elapsed time.

Pressing E at a completed exit cannot bypass this minimum. If a player requests the existing Basement finale before the optional procession is eligible, the procession is skipped for that visit; the game does not introduce an artificial wait or stack the procession after the finale. The once-played marker is not written for that skip.

The original Basement spirit is no longer hidden when the hooded-woman event begins. Its exact transform and visibility stay intact while the ordinary scare controller is reserved for the procession. A just-closed menu can restore the spirit at its existing location without moving a visible spirit. After the event, its original progress-based movement and subtle idle animation resume; the actual Basement finale still hides it as designed when its face scare plays.

## Validation

- **367 frontend tests passed across 25 files.** New regressions cover the combined time/evidence gate, early exit not forcing the event, ghost transform/visibility across the whole procession and recovery, and replacement of expensive glass without changing opaque materials. Existing investigation, keyboard, scare, audio, budget and picking tests pass.
- Production build passed; `git diff --check` passed. Existing React `act` warnings and the build's large-bundle advisory remain.
- Actual browser at 5.2 seconds, with 16 fragments already recovered: phase `waiting`, no procession started.
- Natural live run: first knock at **68.47 seconds**, crossing at 74.75, departure at 99.06, blackout/recovery afterward, and normal play at 156.23. The original Basement ghost remained visible at exactly `[0, 0.10425485196857925, -3.85]` in every recorded procession phase, including departure, blackout, prone view and recovery completion. Its normal idle bob resumed afterward, with X/Z unchanged. [Live trace](room2-fps-event-live.json).
- Tree GLBs were decoded and inspected after compression; each retains three diffuse/alpha textures at its intended cap and unchanged triangle counts. The inventory and machine-readable budget match the files on disk.

No scores, attempts, evidence or server room state were reset. Only the local QA team's cosmetic procession marker was cleared to observe the later trigger. The earlier review documents the real authenticated Basement transition checks in both graphics modes.

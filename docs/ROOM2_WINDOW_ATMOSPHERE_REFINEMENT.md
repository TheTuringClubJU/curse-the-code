# Room 2: window, blood and scare cadence refinement

Local revision, 15 November 2026. No commit, push, PR or deployment. This revision changes Room 2 cosmetics and sound scheduling only; it does not change backend files, clue IDs, progression, rewards, player character or other rooms.

## Window and exterior

- Replaced the 100 bright rain line segments with subtle beads and thin water trails on one textured glass quad. No continuously updated rain particles or extra shadow casters.
- Lowered the window watcher from Y=0.85 to Y=0.38, hiding more of its neck behind the sill. Its skin uses dark diffuse-only materials instead of reflective PBR skin, so a direct torch beam no longer creates the previous glossy white face. All four complementary downloaded mesh parts remain.
- Retreat duration is exactly `4.8 / 1.2 = 4` seconds: 20% faster sideways velocity. Direct-look detection, return cooldown, slow return and reduced-motion stationary fade are retained.
- Exterior fog now has irregular wisps, overlapping near/middle/far banks and more coverage near the window. Ground texture repeats less densely, retains more detail under its haze and has broad tonal variation. Matching background/fog colours removes the artificial colour seam at the distant terrain edge.
- Exterior mist remains one instanced draw: five quads in Balanced, three in Low. No volumetric or postprocessing pass was introduced.

## Blood details

Rivulets start on the actual handwriting strokes, with longer runs and hanging droplets. The bookshelf message has more vertical space for drips. A fourth irregular blood pool sits on the floor directly below it, at X=-3.55, Z=-1.2. Three small ceiling splashes share a single instanced draw and texture. None carries an interaction ID or blocks evidence or doors.

## Scare timing

- Figure crossings remain two seconds long, capped at four per visit, but have much longer deadlines: first base deadline 40–50 scheduling seconds, then 110–130. The existing modest progression multiplier remains; rapid evidence collection can advance a deadline only slightly and cannot bypass the quiet interval.
- Each crossing is followed by 4.5 seconds of steady half-brightness light and a soft electrical noise. Light returns smoothly over the last 0.7 seconds. Movement remains enabled.
- Quieter sound events also dim lights for 4.5 seconds. Their excerpts are limited to that duration and fade out over the last 0.35 seconds, avoiding an abrupt waveform cut. First base deadline is 20–28 scheduling seconds; subsequent ones are 85–100.
- At least 24 active seconds of quiet follow an event. Menus and hidden tabs pause events. Light sources, emissive materials, screen colour and torch state restore correctly after an event, cancellation or disposal. An intentionally switched-off torch stays off.
- Random foreground sounds do not interrupt or stack on each other. The short electrical buzz accompanying a crossing is intentional. Crying stops while a foreground event is playing. The finale cancels ordinary events before starting its synchronized scream/piano pair.
- The Basement finale retains immediate face appearance on E, face disappearance and movement return on scream completion, seven-second piano, half-brightness tail and a separate E to enter Basement.

## Asset budget

All **37 runtime GLBs including the torch total 17,532,696 bytes (17.53 decimal MB)**. Every individual file remains below 4 MB. Original supplied files in `glb files/` are untouched.

| Exterior asset | Previous bytes | Current bytes | Current texture cap | Triangles |
| --- | ---: | ---: | ---: | ---: |
| Near tree | 788,724 | 682,416 | 384px | 34,724, unchanged |
| Far tree | 290,844 | 219,320 | 256px | 7,520, unchanged |

No important indoor GLB was further reduced in this revision. Standalone textures, generated small textures, audio and JavaScript are additional to the GLB budget. Effects have a bounded rendering cost, not zero GPU cost. Low mode retains its existing reduced resolution, texture cap and disabled shadows; this does not certify all older hardware at a particular FPS.

[Inventory and attribution](ROOM2_MODEL_INVENTORY.md), [current machine-readable budget](room2-model-budget.json). The earlier atmosphere/budget report records the previous 17.71 MB state.

## Validation

- Full frontend suite: **346 passed across 22 files**. Covers original Room 1/2 behavior, evidence/case flow, budget and geometry caps, pauses, off-torch restoration, finale interruption, audio fade/exclusivity and 120% retreat velocity.
- After the final sky/fog colour adjustment, the affected scene suite passed again: **10/10**. Production build passed on the final source. `git diff --check` passed.
- Live unaccelerated Balanced browser observation ran for 516 seconds. Crossings occurred at 48.45, 150.40, 251.77 and 386.13 seconds. Only two occurred during the first four minutes. Quiet sound excerpts occurred at 19.91, 91.29, 180.95, 282.31, 357.60, 437.79 and 511.85 seconds. Samples show half-brightness dimming, smooth restoration and `paused: false` during ordinary events. [Recorded events and light samples](room2-refinement-live-results.json).
- All 16 evidence/case interaction targets were aimed successfully in the actual rendered Balanced scene. Broad initial aiming probes were refined for the small sticky notes, blotter and drawer front; these remain reachable at normal player eye height.
- Real authenticated Basement transition returned **HTTP 200 in both Balanced and Low**. The face appeared on the first E. After the scream, the face was hidden, movement was enabled and torch intensity was 9/18 during the piano tail. A real movement check changed player position before the second E entered Basement. No API responses were mocked or progress reset.
- Inspected Balanced and Low screenshots. Low uses three exterior fog quads with shadows disabled. Browser console showed only the existing missing favicon; no shader, GLB or audio-load warnings. Tests retain pre-existing React `act` warnings and the build retains its large-bundle advisory.
- Backend tests were not rerun for these frontend-only changes; the earlier full backend result remains documented in the previous review.

Screenshots: [window](room2-refined-window.jpeg), [Low window](room2-refined-low-window.jpeg), [ground mist](room2-refined-ground.jpeg), [drips and floor pool](room2-refined-blood.jpeg), [ceiling splashes](room2-refined-ceiling.jpeg).

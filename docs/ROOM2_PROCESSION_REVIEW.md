# Room 2: quiet hauntings and the one-time procession

Current follow-up: [FPS, later trigger and persistent Basement ghost](ROOM2_FPS_TIMING_REVIEW.md). The procession now requires both 6+ fragments and 60-75 active seconds. The original Basement spirit stays visible at its position. The stage logs and test counts below record the preceding revision.

Local revision, 15 November 2026. No commit, push, PR or deployment. No backend files or other room builders were changed in this revision. Clue IDs, evidence requirements, case order, scoring, rewards and server completion rules remain authoritative.

## The scripted sequence

The event normally becomes eligible after 50–70 active seconds, or after six recovered fragments with at least 18 active seconds elapsed. It waits for other foreground scares to finish and for the supplied woman/gurney models to load. Opening Basement early can start the sequence rather than stacking both major scares.

1. The first supplied knock locks movement, mouse look, interaction and inventory shortcuts immediately. At the end of that knock, a short fade moves the camera to a clear viewing spot beside the window.
2. A second knock plays. Lena's door opens with the supplied creak. The hooded woman enters behind the gurney, following a curved path around the main desk toward Basement. Her downloaded rig supplies the lower-body animation; a two-bone arm pose brings her hands toward the gurney, and four downloaded wheel assemblies rotate. The body faces the route rather than sliding sideways.
3. The camera follows the procession. She turns her head toward the player for about 2.7 seconds with the requested short sting. Quiet supplied footsteps and the paranormal track accompany the crossing. Basement opens with the supplied creak as she approaches. These script-requested layers are intentional; unrelated random cues and crying remain suppressed.
4. Once she leaves, both scripted door poses close. Normal brightness and movement return at the window. World ambience and footsteps remain silent for ten seconds, then fade back. The delayed scare starts 12–15 active seconds after departure, waiting through an open modal or hidden tab.
5. The hooded face fills the screen for four seconds and fades over its final half-second. The supplied fuzzy clip is limited to seven seconds; its final three seconds fade while the picture is black. The scene then opens through an eye-blink effect at floor height, looking up at the ceiling. Reduced-motion mode uses one smooth fade.
6. The player sees **“You passed out. Press Q to stand up.”** Q or the matching button raises the camera smoothly to normal height, restores the torch model and brightness, and releases input. A thirty-active-second recovery interval separates this from the Basement finale. Attempting the exit during recovery displays the remaining time.

The sequence is remembered with a team-scoped localStorage key (`ctc.study.horror.v2.<team>.procession.v1`). It survives refresh on that browser. It is not a cross-device server flag; this revision adds no schema or gameplay progress field. If storage is unavailable, it still runs at most once in the current mounted room. Original cosmetic markers were reset only for the local QA team when rehearsing; no server evidence, attempts or scores were reset.

Input blocking is an optional control callback enabled only for Study. Held keys are cleared when the cinematic takes control. Other rooms retain their previous controls. Menus, hidden tabs and typing suspend suitable phases; actor/audio cleanup restores input, camera height, lights and door poses. If the required models fail, the cinematic is skipped so it cannot trap players. Phase clocks also advance without successfully decoded audio.

## Four quieter events

- **Door shadows:** two soft dark foot shapes sit in a faint light leak below Basement. On approach, they shrink and fade back toward the door over three active seconds, with a low-volume scrape excerpt. Scripted/open doors hide them. They do not unlock the real exit.
- **Footprints:** crossing an existing blood pool arms a delayed trail. The system samples the player's actual floor route, keeps at most eight steps, and reveals the trail after a delay and a pause in walking, or a bounded fallback delay. The last prints sit behind the player. One instanced draw renders the trail; no particles, physics or ongoing spawning are used.
- **Covered body:** while it is watched nearby, the supplied cloth model expands vertically once and settles over five seconds. After the player looks away and enough time passes, a later glance reveals a hand beside the cloth. The hand is baked from the supplied woman's skinned hand vertices at load time; it is not a newly authored prop GLB. The cloth's original scale is restored exactly.
- **Unnatural silence:** an occasional independent quiet event fades rain/hum and suppresses world footsteps/crying, waits four seconds, plays a single soft wall knock, then restores ambience. It never competes with the procession or another foreground scare. Opening Basement during this event explicitly releases its audio reservation before the finale starts.

All new decals, body details and scenery carry no interaction IDs. They do not add answers, evidence or dependencies to the investigation.

## Downloaded props and budget

New runtime models are processed copies of files already supplied in `glb files/`:

| Model | Runtime bytes | Use |
| --- | ---: | --- |
| terrifying_hooded_horror_woman | 429,744 | Rigged procession, face and source hand |
| ps1_horror_hospital_gurney | 41,208 | Gurney and source wheels |
| roman-catholic_cathedral_gothic_decorations | 265,520 | Two selected gothic wall reliefs; other eight source meshes removed |
| arming_sword_gothic_fanart | 52,816 | Abandoned sword near the covered-body side |

Two extra skull placements reuse the existing downloaded skull. All source originals remain untouched, and attribution/licenses are in [the inventory](ROOM2_MODEL_INVENTORY.md). No furniture, character or decoration GLB was generated from scratch.

**All 41 runtime GLBs total 18,321,984 bytes (18.32 decimal MB), including the torch.** There are 82 model placements plus the torch; the close-up shares downloaded geometry/textures. Every GLB is below 4 MB. Standalone textures, sound and JavaScript are additional to this model budget. Low mode retains its texture/resolution caps and disabled shadows; the new close-up uses a small separate scene instead of rendering the full room behind an opaque scare.

## Validation

- **363 frontend tests passed across 25 files.** Coverage includes once-only persistence, two knocks and delayed relocation, absent models, scene disposal, hidden tabs, reduced motion, keyboard/mouse lock, held-key reset, Q/button recovery, thirty-second separation, bounded footprint routing, body/hand reveal, silence/audio ownership and the existing investigation/room tests.
- Production build passed; `git diff --check` passed. Pre-existing React `act` warnings and the build's large-bundle advisory remain.
- All **82/82** model placements loaded with zero failures in Balanced and Low. Browser console showed only the existing favicon 404; no GLB, shader or audio-load warnings.
- Real-time observation completed the sequence in both modes. In the final Low run: first knock at 18.03s; crossing about 24.06–49.14s; eye-contact sting at 34.10s; delayed face at 63.22s; face hidden/blackout at 67.24s; floor prompt at 71.86s; Q recovery at 73.27s. The face lasted about four wall-clock seconds, then the player recovered at normal height. [Recorded stage/audio logs](room2-procession-live-results.json).
- WASD and mouse input did not move the player away from the scripted window position during the crossing. Normal Q recovery returned control and brightness. Refresh afterward started with phase `done`, proving the event did not repeat.
- The cloth's live Y scale rose from 0.004822 to 0.005636 and returned to 0.004822. A later glance revealed the hand. A sampled route produced seven visible footprints. Shadow retreat was checked in the rendered scene and its timing verified by the focused tests.
- The actual authenticated Basement transition returned **HTTP 200 in both modes**. Low additionally tested interrupting a silence reservation: E released that reservation, showed the existing Basement face immediately, restored movement when the scream ended and retained half-brightness torch during the piano tail. No backend responses were mocked. QA advanced only the cosmetic silence clock for that interruption check.
- Backend files were unchanged; the earlier backend-suite result remains in the previous review. No database progress reset was used for these checks.

Screenshots: [entry door](room2-procession-entry.jpeg), [eye contact and gurney](room2-procession-look.jpeg), [face scare](room2-procession-face.jpeg), [floor recovery](room2-procession-recovery.jpeg), [hand revealed](room2-haunting-hand.jpeg), [footprints](room2-haunting-footprints.jpeg).

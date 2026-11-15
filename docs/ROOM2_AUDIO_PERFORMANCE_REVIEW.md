# Room 2 audio, scare timing and performance revision

**Later movement/lighting and window-ghost revision:** [current review](ROOM2_WINDOW_GHOST_REVIEW.md). The 7%/13% lighting and seven-second movement lock recorded below are historical; the latest version uses 50% lights and releases movement at scream end.

Local revision, 15 November 2026. No commit, push, merge request or deployment was made. This extends the earlier [guidance review](ROOM2_GUIDANCE_REVIEW.md); original room progression, object IDs, answers, scoring and backend services were not changed in this revision.

## Scare frequency

The scheduling clock runs at 1.10 times real active play time initially, rising linearly to 1.20 at 16/16 recovered fragments. This increases event frequency by 10% early, 15% halfway and 20% late. Both wall crossings and random audio use that clock. Crossing animation and its audio remain two real seconds long; the existing four-crossing cap persists across refreshes in the team's browser session. Completing the room stops new random events.

Without intervening foreground audio or pauses, the first crossing's old 35–55 second range becomes about 31.8–50 seconds early or 29.2–45.8 seconds late. Later 65–100 second intervals become about 59.1–90.9 seconds early or 54.2–83.3 seconds late. Random audio's initial 80–115 second interval becomes about 72.7–104.5 seconds early or 66.7–95.8 seconds late; later 85–130 second intervals shorten by the same rate. Menus, typing and hidden tabs pause these clocks. Minimum spacing and exclusivity can postpone events further.

The random cue bag now includes the supplied lurking monster, Okiku well and cinematic paranormal recordings, alongside the two existing cues. It draws all five before repeating. Random foreground recordings never replace or overlap each other or a wall crossing. The crying loop stops during foreground scares and ambient audio ducks. The finale takes priority over any active random cue.

## Exit event

On the first E action at the unlocked Basement door:

1. The close-up is made visible and rendered synchronously, with no black lead-in or decoding wait. The supplied ghost is reused, with a closer face crop against black and a subtle tremor; reduced motion disables the tremor.
2. The new dragon-studio scream and cropped horror piano start together. Face shaders are warmed during loading; the close-up uses a separate small scene rather than rendering the entire study behind it.
3. The face disappears on the scream's audio end callback, approximately 3.312 seconds. The piano continues for its entire seven seconds. The torch remains at 7% intensity, room lights at 13%, and scene exposure at 32% until the event ends.
4. At seven seconds the original light settings return, the door opens, and a separate E action enters Basement. The user's torch-off setting is preserved. Timed fallbacks avoid trapping the player if cosmetic audio fails.

The old persisted `exitCleared` cosmetic flag is no longer reused across room visits, so an earlier preview cannot skip the next visit's door scare. Passage permission still comes from backend room completion. See [runtime audio provenance and crop details](../frontend/public/audio/study/README.md).

## Performance changes

- A world-space bounds check rejects furniture outside the interaction ray before detailed triangle tests. The aim uses the current camera pose and updates at up to 30 Hz.
- The full exterior is hidden when the window is outside the camera frustum. Static shadow baking keeps the exterior available. Flat double-sided foliage uses a single transparent pass, retaining the supplied leaves and materials.
- Sustained slow views lower only the 3D canvas resolution sooner; detail recovery waits longer to avoid rapid oscillation. UI resolution is unchanged. The canvas floor remains 0.7 times native resolution.
- The exit close-up draws independently of the heavy study scene. Its private materials are cleaned up on room disposal.

Final browser samples at 1920×1080, canvas ratio 0.7, each covering 120 rendered frames:

| View | Elapsed | Approximate FPS | Mean render-call CPU time | Draw calls | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desk | 3.586 s | 33.5 | 10.13 ms | 224 | 1,378,351 |
| West wall, exterior culled | 2.112 s | 56.8 | 6.95 ms | 128 | 264,788 |
| Window | 3.908 s | 30.7 | 6.87 ms | 148 | 1,197,380 |

These are local browser samples, not a 60 FPS guarantee or a controlled before/after benchmark. The dense window view remains GPU-heavy. Earlier measurements used different poses/resolutions and should not be compared as a precise percentage improvement. A foliage alpha-cutout experiment performed worse and was reverted.

## Validation

- Full frontend suite: **305 tests passed across 17 files**. Coverage includes progressive scheduling, two-second traversal and cap, modal/background pauses, synchronous prepared audio, seven-second playback limit, exclusive cues, scream/piano pause offsets, exact face callback behavior, separate exit action, moving furniture bounds, invisible interaction planes and resolution adaptation.
- Production frontend build passed. Existing large-bundle and React `act` warnings remain; there were no new browser WebGL warnings. `git diff --check` passed.
- Browser: all nine recordings decoded before Enter. Scream and piano shared the exact same scheduled audio start. Actual callback observations were approximately 3.336 s and 7.024 s after the E handler; the extra milliseconds include the 10 ms scheduled start and browser callback dispatch. At scream end, the face was hidden and the piano still active. At piano end, exposure restored from 0.272 to 0.85, torch from 1.26 to 18, and the door opened.
- Real rendered screenshots were inspected: [face scare](room2-audio-finale.jpeg), [dim piano tail](room2-audio-dim-tail.jpeg), [window performance view](room2-audio-window-perf.jpeg).
- Read-only targeting confirmed all 16 original interactive props, including the invisible cable target, CRT screen, keyboard, printer, recorder, drawer, radiator and window.
- Used the already completed isolated Study Guidance QA account. During Study profiling, its initial Basement GET was temporarily intercepted with 403 to keep that account in Study; no game progress or user sessions were reset. That interception was removed before the second E action, which returned **HTTP 200 from the real Basement endpoint** and displayed the Basement introduction. The four browser 403 console entries were from these deliberate QA access overrides, not asset errors. The override is no longer installed.
- Physical piano WAV verified: stereo 44,100 Hz, 16-bit, 308,700 frames = **exactly 7.000 seconds**. Original user recordings remain unchanged. The eight MP3 runtime copies match the originals byte-for-byte.
- No backend code changed in this audio/performance revision; the earlier backend regression results remain documented separately in the guidance review.

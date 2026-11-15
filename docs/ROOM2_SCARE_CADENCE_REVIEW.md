# Room 2 scare cadence and recurring watcher

Local revision, 15 November 2026. No commits, uploads, PRs or deployment. No backend or other-room changes. This supersedes the one-shot watcher and old scare timing in the earlier reviews; the seven-second exit event and movable 50%-lit piano tail are preserved.

## Why a replay could be quiet

The old director stopped normal events when the backend marked Study complete, and restored a four-crossing cap from session storage. Reopening a completed room could therefore suppress every random event. Long timers also counted only active exploration, excluding menus. Separately, the crossing path could be clamped behind the camera when the player stood close to a wall.

## Revised behavior

- Every room visit starts a new cosmetic schedule, with at most four wall crossings in that visit. Old stored caps are ignored; saved game progress is untouched. Events continue on completed-room previews until the exit finale has cleared.
- Timers and newly crossed evidence milestones both make events due. Wall checkpoints are 2, 8, 13 and 16 recovered fragments; the first three audio checkpoints are 4, 10 and 15. Already collected fragments on entry do not immediately queue all checkpoints. An initial six-second grace and shared quiet gaps prevent a burst of overdue events.
- Timer-only first crossing: 12–18 scheduling seconds, approximately 11–16 active seconds at initial progress or 10–15 with full evidence. Later crossing intervals are 45–57 scheduling seconds. First random cue: 28–34 scheduling seconds; subsequent cues use 48–58. The retained progress clock runs 10–20% faster as evidence accumulates. Busy audio and quiet gaps may postpone these times.
- A crossing remains two seconds of active animation with matching audio. Opening a menu pauses and hides it, then resumes the remaining animation and audio rather than consuming the event behind the menu.
- Crossings stay ahead of the camera near room walls. The model still passes fully between opposing walls with its dark aura and light flicker.
- The first three random recordings are the newly supplied lurking monster, Okiku well and cinematic paranormal clips, shuffled within that group. The older two follow, then all five cycle without repeats within each group. Random recordings and crossings wait for each other, with at least eight active quiet seconds after a completed foreground event. The finale retains priority.
- The window watcher is darker: material color multiplier 0.045, previously 0.12. After retreating right it hides for 25–35 active seconds, creeps back from the right over 2.4 seconds and watches for at least three seconds before direct attention can send it away again. It repeats throughout the visit. Reduced motion uses stationary fades; menus and hidden tabs pause it.

## Verification

- Full frontend suite: **327 passed across 19 files**. New checks cover four crossings and all three new recordings within four simulated active minutes on a completed replay; obsolete stored caps; progress triggers; crossings ahead of cameras near all four walls; interruption/resumption; cooldowns and repeated watcher appearances. Existing audio exclusivity, finale, room progression and other-room suites pass.
- Production build and `git diff --check` pass. Existing bundle-size and React test warnings remain. Backend code is unchanged; the preceding full backend result is 324 passing tests, recorded in the window-ghost review, and was not rerun for this cosmetic scheduling revision.
- Real-time browser check: **four crossings and five random recordings within four minutes** on the actual completed Study Window QA account. No director trigger, progress override or clock acceleration. The camera faced the window for a repeatable view, with no menus during this sample. The watcher completed six visible visits and began another return at 239.83 seconds. A transient expired QA session and an earlier hot-reloaded observation were restarted before this final continuous run.
- All nine observed foreground starts were accepted with `priorBusy: false`, decoded audio sources present, and AudioContext `running`. Output samples were nonzero: recorded foreground peaks ranged roughly 0.049–0.166 RMS, compared with an ambient peak around 0.021. This verifies audio playback/output samples; it is not a listening-volume calibration.

| Event | Seconds from recording start, immediately before Enter |
| --- | ---: |
| Crossing 1 | 12.62 |
| Cinematic paranormal | 28.13 |
| Crossing 2 | 51.67 |
| Lurking monster | 68.72 |
| Crossing 3 | 96.96 |
| Okiku well | 112.30 |
| Crossing 4 | 138.42 |
| Older jump-scare cue B | 155.25 |
| Older jump-scare cue A | 196.04 |

Exact readings: [live timing/output log](room2-cadence-live-results.json). Timings vary with progress, random draws, menus and overlapping foreground audio; they are not fixed appointments.

After the timed run, the real door interaction still showed the face with only `finale` and `piano` audio channels. At scream end movement was released, the torch remained at 9 and piano continued. After seven seconds the second E returned HTTP 200 from the Basement endpoint. No mocked room response or backend progress reset was used.

[Mid-crossing screenshot](room2-cadence-live-pass.jpeg), [darker returning watcher](room2-cadence-returning-watcher.jpeg).

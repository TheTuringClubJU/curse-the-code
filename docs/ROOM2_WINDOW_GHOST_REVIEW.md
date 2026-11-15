# Room 2 window watcher and movable finale

**Current scare cadence and recurring watcher:** [newer review](ROOM2_SCARE_CADENCE_REVIEW.md). The one-shot/12% watcher described below is historical; the newer version is darker and returns periodically.

Local changes, 15 November 2026. No commits, code uploads, PRs or deployment were made. The previously created GitHub `feat/room-2-frontend` branch was not changed. Backend progression and all other rooms' code were unchanged in this revision.

## Player behavior

The woman's face still appears immediately on the first E at the unlocked exit, with the same synchronized scream and first seven seconds of piano. The face disappears on the scream's end callback, approximately 3.312 seconds. That callback now releases the movement lock and returns the HUD immediately. The remaining piano is atmosphere while the player can move and look normally.

Actual room lights are halved exactly once, including ambient, moon and practical lights. The torch is 9 instead of 18; emissive flames, lens and screen are also dimmed. Camera exposure, background and fog are preserved to avoid compounding darkness. At the piano's seven-second end, original values return and the door opens for another E action. Toggling the torch during the tail retains the half-strength setting, and leaving it switched off keeps both torch and lens off after restoration. Menus and hidden tabs still pause tracked audio/timers.

The supplied `white_ghost-like_figure_with_bloodstain` is a separate cosmetic watcher outside the east window. Its material color is darkened to 12% of the supplied multiplier. It faces the player; a continuous direct look for 0.35 active seconds through the window triggers a slow 4.8-second retreat to the viewer's right, then a fade behind the jamb. It does not reappear during that room visit, damage players, consume evidence or change locks. Reduced motion uses a stationary fade. Intro screens, menus and hidden tabs do not advance it.

Added eight further placements of the supplied cobweb mesh and six small supplied RE4 spiders. The west webs/spiders sit in front of the bookcase surface rather than buried behind it. Small movements pause during menus. Props remain outside the interactive ID system and introduce no collision solids or new clue dependencies. The model inventory now lists 37 unique external GLBs, 27.61 MB total, 75 scene placements plus the separate torch; all files remain below 4 MB.

## Tests and walkthrough

- Full backend suite: **324 passed**, 13 existing dependency deprecation warnings, using isolated local PostgreSQL `ctc_test`. Verified that its data directory was the intended local test server before running. No development/player database reset.
- Full frontend suite: **319 passed across 19 files**. Added gaze timing, wrong-facing/opaque-wall rejection, one-shot rightward retreat, menu/tab pause, reduced motion, half-strength scene/emissive lighting, movement-release callback, torch toggles and piano-tail menu behavior. Existing Study and other-room regression suites pass.
- Production frontend build and `git diff --check` pass. Existing large-bundle and React test `act` warnings remain.
- Rendered room: **75/75 placements loaded, zero failed**. Inspected the complete watcher, rightward retreat, added web/spider area and the movable half-lit finale. Browser warning check showed no WebGL/scene warnings; the only error was the existing missing favicon.
- New isolated **Study Window QA** account, id 18, used a separate browser context. Only its Bedroom completion/evidence was seeded. Its Study began with zero collected fragments and all four cases locked. Existing teams and sessions were preserved.
- Before collecting evidence, E at the Basement door correctly explained that the four cases were unresolved. Followed the real server's next-search leads; all 16 pickups returned HTTP 200 through targeting props and pressing E, including repeated objects. The Basket unwrapped only after all 16; only the first case unlocked at that point.
- Through the actual case-list UI, aligned the binary scraps, CRT tapes, memory segments and printer pages, and submitted all four correct test-content answers. Each solved in one attempt and earned 100 points. Database verification showed all 16 Study fragments, four solved Study cases at one attempt each, and total score 800 including the seeded Bedroom 400.
- First exit E played the face scare. After the scream, pressed A for 250 ms while the piano remained active: player position changed from `(0.85, -3.10)` to approximately `(0.70, -2.74)`, `paused` was false, torch was 9, and room lights were `[0.14, 0.30, 1.90, 1.90, 1.90]`, exactly half normal. At piano end full brightness returned and the door opened. Second E returned **HTTP 200 from the real Basement endpoint** and displayed the Basement intro. No API response interception or progress mutation was used during the Study walkthrough.

Camera positioning used the existing local debug controls to target props for focused interaction checks. Actual movement was tested during the piano tail. This verifies the complete gameplay/API path, but is not an independent human difficulty study or exhaustive collision navigation certification. It does not certify 60 FPS on every device; the earlier dense-window performance limit still applies.

## Screenshots

[Window watcher](room2-window-watcher.jpeg), [retreat to the right](room2-window-retreat.jpeg), [web and spider area](room2-window-webs.jpeg), [movable half-lit finale](room2-window-movable-tail.jpeg), [fresh QA unwrapped evidence](room2-window-qa-evidence.jpeg).

Reopen the room locally at http://127.0.0.1:5173/study. Saved progress is preserved; a completed team will show the completed Study.

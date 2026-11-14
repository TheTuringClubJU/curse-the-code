# Contributors

Curse the Code is built and maintained by The Turing Club. Thank you to everyone who has contributed code, design, content, security architecture, and ideas. ❤️

This list is maintained by hand alongside the GitHub [contributors graph](https://github.com/TheTuringClubJU/curse-the-code/graphs/contributors). Merged a PR and don't see yourself here? Open a PR adding your line — that counts too, and each entry here is eligible for a certificate of contribution.

## Maintainer

- Darsh Vithlani ([@CODING-DARSH](https://github.com/CODING-DARSH)) — Tech Lead & Maintainer

## Contributors

- Darsh Vithlani ([@CODING-DARSH](https://github.com/CODING-DARSH))
  - Initial repository setup, project architecture, CI/CD workflows, database schema definition in PostgreSQL, and build specification plan ([#1](https://github.com/TheTuringClubJU/curse-the-code/pull/1))
  - Implemented participant authentication and session system with sliding expiration, maximum 2-device concurrency cap per team, brute-force rate limiting, and global logout-all functionality ([#2](https://github.com/TheTuringClubJU/curse-the-code/pull/2))
  - Built pre-event waiting lobby with live round polling, procedural organic fractal haunted tree scenery in canvas, floating dust motes, and dynamic ambient sound synthesis ([#2](https://github.com/TheTuringClubJU/curse-the-code/pull/2))
  - Designed and developed complete Admin Portal with credential authentication, 8-hour session management, and live team presence monitoring ([#3](https://github.com/TheTuringClubJU/curse-the-code/pull/3))
  - Implemented 6 manual round control buttons (`Start`, `End`, and `Pending` for Round 1 & Round 2) with zero automatic timers, and team-wise force logout with real-time session termination ([#3](https://github.com/TheTuringClubJU/curse-the-code/pull/3))
  - Implemented Top N Qualification system with live preview ranking (sorted by clues solved, score, and earliest submission tie-breaker) and automatic Round 2 database access provisioning ([#3](https://github.com/TheTuringClubJU/curse-the-code/pull/3))
  - Developed full-screen Live Leaderboard view with 4-second auto-sync, round switcher, top-3 podium badges, and Round 2 qualification indicators ([#3](https://github.com/TheTuringClubJU/curse-the-code/pull/3))

- Swapnil Ghosh ([@Swapnil-Ghosh06](https://github.com/Swapnil-Ghosh06))
  - Implemented Room 5 (The Surveillance Morgue) complete 3D scene engine across 6 interconnected control/morgue wings, CRT monitor bank, procedural textures (`texControl.js`), Web Audio horror soundscape (`audioControl.js`), and horror director (`scaresControl.js`) ([#19](https://github.com/TheTuringClubJU/curse-the-code/pull/19))
  - Built zero-spoonfeeding Room 5 clue modals (`PersonnelIndexModal`, `TransmissionArchiveModal` with Base64 audio decoding, `SpectrogramModal` with frequency slider), CCTV tactical monitor modal, phosphor-green HUD (`HUDControl`) with caution timer & sensitivity slider, Resident Evil–inspired typewriter title splash, `Fork2Modal`, `ControlBasketModal`, `ControlDossierModal`, `EvidencePickupModal` with 10 authentic Evidence SVGs, and `ControlRoomCompleteModal` ([#19](https://github.com/TheTuringClubJU/curse-the-code/pull/19))
  - Curated, evaluated, hand-sourced, and integrated real 3D GLB/FBX assets (`control_room.glb`, `retro_ibm_pc.glb`, `retro_tvs.glb`, `akai_reel_to_reel.glb`, `flashlight.glb`, `ghost.glb`, `horror_kit.glb`, and `horrorpack` FBX surgical/mortuary props) alongside weathered, bloodstained, and peeling PBR textures with custom material color grading and collision calibration (`sceneControl.js`, `rooms/control.js`)
  - Hand-sourced, auditioned, and integrated Room 5 horror audio (`creepy-woman-cry.mp3`) into a Web Audio spatial node graph with distance-based volume curves, ambient tracks, and stinger SFX (`audioControl.js`)
  - Engineered the standardized first-person player torch (`engine/torch.js` + `flashlight.glb`) with lens emissive glow, walking/idle hand sway, blackout jitter, and `[E]` / Right-Mouse-Click interaction parity (`controls.js`), plus `DevCalibratorOverlay` and `?room=5` dev quick-switch tooling
  - Implemented situation-based stalker ghost AI (`ghost.glb` door peeks, hallway apparitions, forward-line-of-sight attack staging, and behind-player reveals) and 5–7s torch blackouts (`scaresControl.js`)
  - Built low-spec PC & Eco-mode performance optimizations: pre-init hardware detection, dynamic MSAA/stencil disabling, `<30fps` fallback, shader point-light capping, draw-call batching, per-frame GC allocation elimination, and texture downsampling (`engine.js`, `sceneControl.js`)
  - Authored headless Three.js geometric traversal and door-clearance verification, 37 opaque-box E2E tests (`Room5Control.test.jsx`, `Room5E2E.test.jsx`), and Room 5 technical/QA documentation
  - Authored frontend team onboarding and GLB standardization guidelines (`docs/frontend-team/`) covering backend/story contracts, model sourcing, Meshopt optimization, and horror design
  - Overhauled Substation Delta gameplay: eliminated sequential item locks and false decoys (streamlined 8 authentic fragments across 6 fixtures), built single-interact multi-fragment sweep with non-spoiler investigative UI, unwrapped partial recovered documents on pickup while keeping clue terminals securely gated until 8/8 fragments, upgraded stalker AI to an aggressive Poppy Playtime–inspired pursuit with FM-synthesized monster shrieks, heartbeat tempo escalation, close-range FOV punch and jumpscare thrash VFX, and verified with 100% test pass rate across 363 backend Pytest tests and 341 frontend Vitest tests

<!--
Add new contributors below this line, following the format above.
One bullet per contribution/PR, most recent contribution added to the bottom of their list.
-->

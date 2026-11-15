# Room 2 frontend delivery

Delivery branch: `TheTuringClubJU/curse-the-code:feat/room-2-frontend`. PR target: `main`, because the earlier `feat/room-2` integration branch was already merged in PR #24. The delivery includes current main without changing other rooms' implementation or deployment workflows.

## Gameplay and integration

Daniel's Study now has a gothic GLB environment, consistent burgundy investigation screens, a compact current-objective guide, readable evidence inspection and ordered case-file access. Sixteen fragments and four sequential case files retain server-authoritative collection, attempts, scoring and solved-or-exhausted progression to the Basement. The return door still leads to Lena's Bedroom. The first two distinct Study hints are free; later hints use the existing tournament penalties and global hint budget. Backend changes expose the next valid search lead and implement this Study-only hint policy; there is no schema migration.

The horror layer includes paced figure passes and sound events, a recurring window watcher, quiet environmental details, and one hooded-woman/gurney procession per team/browser. The procession requires at least six fragments and 60-75 active seconds, preserves the original Basement spirit and leaves recovery time before the separate exit scare. Cinematics pause ordinary scares, block controls only during their scripted moments, and clean up on room exit. Normal movement returns when the Basement scream ends; the remaining piano tail dims lighting by 50%.

Shared engine/control changes are guarded by the Study room ID or optional callbacks with the existing default behavior. There are no Room 1/3/4/5/6 scene or backend changes. The development-only `/study` and `/room2` routes retain authenticated backend access checks and are disabled in production.

## Assets and performance

The runtime package contains 41 external/user-supplied GLBs totaling **18,147,616 bytes (18.15 MB)**; every GLB is below 4 MB. Standalone textures and audio are additional. Raw downloads, local instructions, secrets, databases and scratch tools are excluded. The clean checkout includes the complete runtime assets.

Study uses lightweight glass, cached picking, near/far foliage, adaptive resolution and a Low graphics mode. Local same-view FPS measurements improved from 48.7 to 73.5 at the desk and 53.1 to 81.6 at the window; actual performance depends on hardware. See [FPS timing review](ROOM2_FPS_TIMING_REVIEW.md), [asset inventory and source licenses](ROOM2_MODEL_INVENTORY.md), and [audio source notes](../frontend/public/audio/study/README.md). Supplied asset license metadata is retained; original external attribution for the lead-provided computer/torch remains a documented provenance limitation.

## Release verification

Clean checkout verification on the delivery branch:

- `npm ci` completed using the committed lockfile; **367 frontend tests passed across 25 files**.
- `npm run build` passed. Vite reports the existing large-bundle advisory; React tests emit existing `act(...)` warnings.
- Production preview served the hashed application bundle, model/audio assets and authenticated APIs. The completed local QA account correctly resumes in the Basement; production does not enable the development Study shortcut.
- Runtime model/texture references, GLB external-resource references and review-document links resolve in the clean checkout. GLB headers and the 20 MB budget pass automated checks.
- The delivery diff contains no raw input folders, real-content files or environment files. Credential-signature and whitespace checks passed.
- The unchanged dependency lockfile reports five development/test-tool advisories (Vite/Vitest and transitive packages); `npm audit --omit=dev` reports zero vulnerabilities. Toolchain upgrades are outside this room delivery.

- Full backend suite against dedicated local PostgreSQL: **324 passed**, 13 existing deprecation warnings, 431.62 seconds. Overall application coverage: **88%**; Study service **97%**, Study hints **95%**. This includes the existing Bedroom, Basement, Records, authentication, admin and competition tests as well as Study guidance/progression/concurrency checks.
- Verified against main `01ad3277cbffdd69a070ef9ff29c547c228d988f`; the remote delivery branch still points to that original base before this push.
- GitHub CI runs after publication; its status is shown on the PR, separately from these completed local checks.

Historical screenshots and browser traces in the other review documents show the local investigation, cinematics, Low/Balanced graphics and authenticated Basement transition checks. Those reports describe earlier local revisions; this file is the delivery record.

Publication is through a feature-branch PR. The repository's production deploy job runs only on main, after tests pass; this change does not alter that job. Maintainer approval and merge remain separate from publishing this branch.

## Coordination with the open Room 5 PR

A read-only trial merge against `feat/room-5-frontend` (PR #29, head `d529fc2`) reports conflicts in `app/game/hint_service.py`, `frontend/src/App.jsx`, `frontend/src/game/Room2Study.jsx`, `frontend/src/game/engine/controls.js`, `frontend/src/game/engine/engine.js`, and `frontend/src/game/rooms/study.js`, plus its existing TODO/index differences from main. Neither branch was modified by this check. This delivery applies cleanly to current main; these two PRs must be integrated deliberately and retested together when the second is merged. Preserve Room 5 behavior and the Study-specific guidance, hint policy, controls and asset loader. Do not resolve shared-file conflicts by taking either entire file blindly.

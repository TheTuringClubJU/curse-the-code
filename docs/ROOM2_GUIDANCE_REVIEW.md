# Room 2 guidance, theme and atmosphere review

Date: 2026-11-15. Branch: `visual/room2-study`. Local only; no commit, push, merge request or deployment.

## Player flow

Field Notes at the top right now explain three phases. Search with E and follow the current lead until all 16 fragments are recovered. The server chooses a recoverable next object using the original chain/prerequisite rules; the UI explicitly marks return visits when an object holds a later record. It does not expose puzzle answers.

B opens the investigation Basket / Evidence Table. It explains why wrappers are sealed, how many remain and where each collected fragment was found. Once all 16 are recovered, the real public evidence text is readable. A Continue to Case Files button connects collection to solving.

C displays the numbered sequence: console drawer, computer screen, computer keyboard/base, matrix printer. Each entry shows location, attempts, resolution status and an actionable prerequisite. The current case can be opened directly from this screen or through its existing world object. Resolving all four case files is required for the Basement; collecting all fragments alone is insufficient. Server-owned solved/exhausted completion behavior is preserved.

## Hint rules

The first two **new Study hints per team** have no time or point penalty. From the third new Study hint onward, search hints add 10 seconds to the recorded penalty time; puzzle hints add 30 seconds and deduct 15 points from that case's successful solve reward. These paid amounts follow the existing game's hint rules. Free puzzle hints do not reduce solve points. No historical costs or player scores were reset.

New hints, including the free two, still count toward the existing shared 15-hint tournament budget. Previously unlocked hints are free to re-read and use no additional budget, even at the cap. Costs are displayed before the request, and applied only by the backend. Study transactions lock the team row to prevent duplicate dispatch/charges or parallel requests consuming multiple free slots. Room access and future-target guards are enforced.

Search hints now name the actual current layout: carved archive cabinet, lamp on the Victorian console, single computer screen/base and recorder corner. The Study dispatcher includes window and radiator fragments, so it does not prematurely switch to puzzle hints at 14/16. Other rooms retain their existing hint costs and dispatch rules. No schema migration or content/answer changes were needed.

## Presentation and horror

The intro, objective panel, Basket, case list and hints use a room-scoped burgundy, aged brass and parchment palette with double borders. Existing photograph, dossier and puzzle widgets receive the same Study-only shell; other rooms' styling was not edited. H/C/B and Escape handling stays paused during menus and the finale. Newly requested hint text scrolls into view.

The supplied ghost and runner are darker. The progress spirit gently floats/leans, remains almost still while watched and approaches more readily when attention moves away. Reduced motion disables this movement. The original supplied GLBs are reused; no new GLB geometry was generated. The subsequent [audio and performance revision](ROOM2_AUDIO_PERFORMANCE_REVIEW.md) replaces the old finale timing with an immediate face scare, new scream and seven-second piano, and increases random event frequency with progress.

The painted panels had been recessed into the wall. Complete supplied paintings now sit in front of it: four varied sizes form one collage, and one separate portrait remains on the other side. All five images were checked in the browser. Runtime model count stays 35 unique GLBs (25.91 MB); there are now 60 scene placements plus the separate torch.

## Validation

- Frontend: **292 tests passed across 16 files**. Added phase/sequence, actionable prerequisite, pre-request costs, cached hint and service-failure tests. Existing scene/scare/other-room suites passed.
- Backend regression run: **157 passed**, covering Study, shared hint service and multi-team competition. After final hint text/access/budget adjustments, **10 focused Study guidance/hint tests passed** (these overlap the broader run). They use isolated real local PostgreSQL and authenticated requests, including parallel requests and persisted score checks.
- Production frontend build passed. Existing bundle-size and test dependency/React act warnings remain. `git diff --check` and changed-source UTF-8 validation passed.
- Fresh isolated browser account: **Study Guidance QA** (dedicated local test account). Existing Study Preview sessions/progress were preserved. Bedroom completion/fragments were seeded only for this new QA account; all Study pickups and submissions used the real APIs and UI.
- All 16 Study fragments collected by targeting props and pressing E. The Field Notes advanced with the actual server lead and marked repeat visits. The Basket transitioned to readable records and then to the new case list.
- Hint purchases persisted exactly: ES01 0s, ES02 0s, ES03 10s, R1-05 30s. Total time penalty 40s. R1-05 solved for **85 points**, the other three for **100 each**; total score including seeded Bedroom 400 was **785**. Four Study photo pieces awarded, giving the QA account 8/10 overall.
- All four puzzles were completed through the new case-list entry points and existing assembly controls. One automated submission arrived inside the existing three-second cooldown and received 429 without consuming an attempt; after waiting it succeeded normally. Cooldown behavior was not weakened.
- Final task became Enter the Basement. The guide/HUD hid during the face scare; after it ended the second E returned **HTTP 200 / basement**. No route interception was used for this revision's walkthrough.
- Every one of 60 scene model placements loaded successfully. Browser showed no scene/WebGL warnings. Expected room-access probes and the cooldown response appeared in the network console.

The local backend was restarted with the final changes. A user hard-refresh is needed to load the new UI. The QA account is now completed and normally resumes in Basement; use the existing Study Preview account for a user playthrough. Art/performance review remains before any merge request.

## Screenshots

[Introduction](room2-guidance-intro.jpeg), [field notes / paintings](room2-guidance-paintings.jpeg), [sealed Basket](room2-guidance-sealed-basket.jpeg), [open Basket](room2-guidance-unwrapped-basket.jpeg), [case files](room2-guidance-cases.jpeg), [hint history/costs](room2-guidance-hint-cost.jpeg), [paid puzzle quote](room2-guidance-paid-puzzle.jpeg), [themed terminal](room2-guidance-terminal.jpeg), [darkened spirit](room2-guidance-spirit.jpeg), [finale](room2-guidance-finale.jpeg).

# Daniel's Study backend handoff

Assignment: `BE-R2-01` through `BE-R2-07`, Shahan. Base: upstream `main` at
`94323f8`. Working branch: `feat/room2-backend`.

## Implementation

`app/game/routes.py` authenticates the team using the existing session system
and dispatches Study requests to `app/game/study_service.py`. Existing URLs
and successful response fields are retained. No schema migration or frontend
code change is required for the backend implementation.

- Metadata comes from the selected content file: currently 20 objects,
  16 fragments and four clues (`R1-05`-`R1-08`).
- Study reads/searches/submissions require `team_rooms.is_completed` for
  Bedroom. Basement's existing routes now also check the Study prerequisite.
- Searches support all four props containing multiple fragments. Sequence
  checks span room boundaries, including Bedroom's `EK01` prerequisite.
- All sixteen defined fragments, including decoys, are required for the
  basket. A count of unknown/stale database IDs cannot satisfy this gate.
- Submission checks the basket on the server, validates type/length, applies
  field normalisation, compares both HMAC variants and permits plaintext
  fallback only in `content.test.json` with pack label `test`.
- Each accepted attempt is audited. The attempt cap, idempotency, recomputed
  score, reward and room completion are protected by one team-row lock and
  transaction. The exit opens when all four clues are resolved: each is
  either solved or has exhausted its configured attempts. Exhausted clues
  stay unsolved and earn zero points and no photo piece. Room completion
  does not imply Round 1 completion or qualification.
- Clue-specific failure messages, a content-configured cooldown and a
  30-per-minute submission limit are implemented. Rejected requests do not
  consume attempts. Different teams have independent progress and locks.
- State projections remove verification data recursively. Wrapped scraps do
  not expose readable content. Unwrapped evidence deliberately exposes its
  puzzle chunks, without identifying decoys.
- The test harness checks for a dedicated local test database before importing
  the existing demo seeding code.

## Contract for Subham

Send credentials with requests (`credentials: 'include'`). The existing
`x-session-token` alternative is also supported. Do not send team IDs to choose
whose progress to update.

| Action | Request | Response to use |
|---|---|---|
| Load/refresh state | `GET /api/game/room/study` | `objects`, `clues`, `evidence`, `basket_unlocked`, `is_completed`, fragment IDs/count, photo count |
| Inspect prop | `POST /api/game/room/study/search` with `{"object_id":"bookshelf"}` | `found`, `fragment_id`, `total_collected`, `total_in_room`, `basket_unlocked`; or `locked` / `already_collected` |
| Submit clue | `POST /api/game/clue/{clue_id}/submit` with `{"answer":"player input"}` | `correct`, `solved`, `attempts`, `attempts_max`, `exhausted`, `room_completed`, `reward`, `message` |

The additional `photo_piece_ids` array contains actual earned piece IDs,
including Bedroom rewards. Prefer this over assuming the first N pieces are
owned: teams can solve the clues in any order. The existing
`photo_pieces_collected` integer remains available.

Refresh state after an action and when revisiting a room. The second team
device needs state refresh/polling; there is no WebSocket push. Trigger the
exit animation from `room_completed` and restore it from `is_completed` after
a reload. Completed responses commit their database transaction before being
returned.

Use the server's completion flag for the exit, not a count of solved clues.
The door can open with fewer than four Study photo pieces. Build the recap
from `clues[].solved` and `photo_piece_ids`; do not reuse the Bedroom modal's
hardcoded "4 / 4" solves or four-photo claim. Refreshing Study
state or retrying a resolved clue also repairs completion records left by
the earlier all-solved implementation, without awarding missing rewards.

| HTTP result | Meaning | Suggested UI behavior |
|---|---|---|
| 200 + `correct: false` | Accepted wrong attempt or exhausted clue | Show `message` and authoritative attempt count |
| 200 + `already_solved: true` | Idempotent retry | Refresh state; do not add score locally |
| 401 | Missing, expired or invalid session | Return to login |
| 403 + `detail.code: ROOM_LOCKED` | Prerequisite room incomplete | Keep the entrance locked |
| 404 | Unknown room, clue or object | Show an integration error; check IDs against content |
| 409 + `detail.code: EVIDENCE_INCOMPLETE` | Missing room evidence | Keep answer entry sealed |
| 400 / 422 | Missing or invalid request fields | Show validation feedback; no attempt consumed |
| 429 + `Retry-After` | Cooldown or submission limit | Disable submission for that period |
| 503 | Storage failure | Preserve input; refresh state before retrying |

`detail` may be a string or an object. For an error use
`typeof detail === 'string' ? detail : detail?.message`, rather than rendering
the object directly. This matches the structured errors already used by auth.

An actual network interruption after a commit can leave the browser unsure
whether its action succeeded. Read state before automatically retrying a
search: a prop may contain another eligible scrap. Retrying a solved clue is
idempotent.

The production code contains no hardcoded Study answer list. Correct answers
used by tests come only from the published test pack. Do not replace it with
live content or commit the event answer key.

## Validation and remaining integration

The 50 explicitly assigned backend cases are in `tests/study/test_study.py`.
Additional regressions in `tests/study/test_safety.py` cover authentication,
input validation, team isolation, sequential/cross-room dependencies, live
verification, cooldown, rollback, parallel attempts/searches, parallel distinct
solves and an API journey from Bedroom through Study into Basement.
`tests/study/test_progression.py` covers every combination of solved/exhausted
clues, missing progress, configurable attempt limits, legacy-state recovery,
concurrent final attempts and rollback when completion cannot be saved.

Every Study test creates and removes its own team. SQL assertions verify
persistent state and aggregates. Concurrent checks synchronize real parallel
requests; verification tests disable the other matching path so they cannot
pass accidentally through the plaintext fallback.

The API journey does not replace `QA-R2-E2E-01`. The full browser/Three.js
walkthrough, 49 frontend checks, door animation, Study PNGs, shared modal
generalisation and application navigation remain Subham's integration work.
Do not mark the room's full 100-test target complete until those exist.

Two concrete integration details: `engine.js` currently imports/calls
`buildBedroom`, so Study needs a scene-builder dispatch rather than only a new
theme configuration. Several shared modals currently contain Bedroom-specific
fragment/image mappings and test text; generalise those from the API/content
with the frontend owner before reusing them for Study. Handle back/exit doors
as navigation interactions rather than trying to search an undefined JSON prop.

The implementation retains the existing 100-point rule. It does not implement
hint penalties, qualification certificates, round timers, the Basement final
terminal or Room 3/Room 4-6 frontend tasks. See `PROJECT_GUIDE.md` for the
repository-wide findings that need owner review before the event.

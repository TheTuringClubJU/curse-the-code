## Implement Daniel's Study backend

The shared game handler could not recover multiple Study scraps attached to
one object, did not enforce the Study entrance/basket gates, and could award
inconsistent attempts or points under simultaneous requests. Room completion
also treated exhausted clues as cleared.

Route Study requests to a dedicated content-driven service. It supports all
sixteen fragments and cross-room dependencies, both HMAC comparisons and a
test-only plaintext fallback, three attempts per clue, clue-specific feedback,
photo rewards, cooldown/rate limits, idempotent solves and all-solved room
completion. Team-row locking and a single transaction protect pickups,
attempts, audit records, scoring and completion. Existing Basement routes
check Study completion before granting access.

Keep the existing API URLs and success fields; add `photo_piece_ids` so the
frontend can identify actual earned photos. No schema migration or frontend
change is included. Add local-test database guards, the 50 assigned backend
checks, further safety regressions and a developer/frontend handoff.

## Validation

See [TEST_RESULTS.md](TEST_RESULTS.md) for the final local counts, coverage,
commands, warning details and environment. Study tests use real local
PostgreSQL and session authentication. Parallel tests verify persisted
attempt/score counts, and injected database errors verify rollback.
Existing backend tests, frontend tests and the frontend build also pass.

## Integration review

Subham's Study page/scene/assets, application navigation and the full browser
walkthrough remain pending on the checked-out main branch. The API walkthrough
is not the room's browser E2E test. Review structured error handling,
three-second cooldown UX and backward navigation with him. Coordinate the
small shared route edits with Darsh and Vishad.

Study requires actual solves; this differs from the older Room 1 exhaustion
rule. Confirm the event's exhaustion/recovery policy before merging. Review
the existing import-time demo seeding and global round-state enforcement
before an event deployment, as documented in PROJECT_GUIDE.md.

The repository's main-branch rules require two approving reviews before
merging. This backend change is ready for that review; the full Study browser
walkthrough remains pending frontend integration.

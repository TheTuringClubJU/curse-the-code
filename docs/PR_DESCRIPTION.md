## Implement Daniel's Study backend

The shared game handler could not recover multiple Study scraps attached to
one object, did not enforce the Study entrance/basket gates, and could award
inconsistent attempts or points under simultaneous requests.

Route Study requests to a dedicated content-driven service. It supports all
sixteen fragments and cross-room dependencies, both HMAC comparisons and a
test-only plaintext fallback, three attempts per clue, clue-specific feedback,
photo rewards, cooldown/rate limits, idempotent solves and room completion
once every clue is solved or exhausted. Exhausted clues remain unsolved and
earn no points or photo piece. Team-row locking and a single transaction
protect pickups, attempts, audit records, scoring and completion. Existing Basement routes
check Study completion before granting access.

Keep the existing API URLs and success fields; add `photo_piece_ids` so the
frontend can identify actual earned photos. No schema migration or frontend
change is included. Add local-test database guards, the 50 assigned backend
checks, further safety regressions and a developer/frontend handoff.

## Validation

- Complete backend suite: **191 passed**, including **118 Study tests** and
  all **50 assigned backend checks**. Study service line coverage: **98%**.
- Existing frontend suite: **69 passed**. Production build passed.
- Ruff check/format and `git diff --check` passed.

See [TEST_RESULTS.md](TEST_RESULTS.md) for the final local counts, coverage,
commands, warning details and environment. Study tests use real local
PostgreSQL and session authentication. Parallel tests verify persisted
attempt/score counts, and injected database errors verify rollback.
Existing backend tests, frontend tests and the frontend build also pass.

## Review corrections

Address the progression issue raised in PR #7: exhausting a Study clue no
longer traps a team in the room. All 16 combinations of solved/exhausted clues
are tested for door access, persisted progress, exact rewards and scores.
Additional regressions cover unresolved clues, per-clue attempt limits,
unlimited attempts, recovery of previously stuck teams, concurrent final
attempts and transaction rollback. Update the assigned exhaustion test and
the frontend handoff to match the clarified rule.

## Integration review

Subham's Study page/scene/assets, application navigation and the full browser
walkthrough remain pending on the checked-out main branch. The API walkthrough
is not the room's browser E2E test. Review structured error handling,
three-second cooldown UX and backward navigation with him. Coordinate the
small shared route edits with Darsh and Vishad.

Review the existing import-time demo seeding and global round-state enforcement
before an event deployment, as documented in PROJECT_GUIDE.md.

This pull request targets `feat/room-2`, the shared Room 2 integration branch.
The backend can be reviewed and integrated with the Study frontend there
before the combined room is proposed for `main`. The full Study browser
walkthrough remains pending frontend integration.

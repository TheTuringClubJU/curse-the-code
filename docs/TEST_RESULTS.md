# Room 2 validation — 2 November 2026

Base revision: `94323f8`. Local branch: `feat/room2-backend`.

| Check | Result |
|---|---|
| Required Study backend cases, `tests/study/test_study.py` | 50 passed |
| Complete Study suite, `tests/study` | 93 passed |
| Study service line coverage | 98% (194/197 statements) |
| Existing backend regression files | 73 passed |
| Complete backend CI command, one combined invocation | 166 passed; 88% overall app coverage |
| Existing frontend suite, `npm test` | 69 passed across four files |
| Frontend production build, `npm run build` | Passed |
| Ruff check/format on Study service and Study tests | Passed |
| `git diff --check` | Passed |
| Existing `schema.sql` | Unchanged |

The first row is included in the second row; it is not an additional 50 tests.
Study and existing backend suites passed separately and then together in one
final invocation: 166 backend tests total, not the sum of these table rows.
The final combined run took 185.78 seconds. The new tests exercise a real isolated PostgreSQL 16.14 database
on localhost, Python 3.12.7, real session authentication and actual HTTP routing
through FastAPI TestClient. Frontend dependencies were installed with `npm ci`.

Final backend command (using the isolated local test server settings):

```powershell
$env:DATABASE_URL='postgresql://ctc_test:local-tests-only@127.0.0.1:55433/ctc_test'
$env:CONTENT_FILE='content.test.json'
$env:COOKIE_SECURE='false'
.\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing -q --tb=short
```

The Study tests verify every fragment drop, repeat searches at shared props,
cross-room chain requirements, basket wrapping/unlock, all four answer paths,
plain-array matching isolated from HMAC matching, rewards, attempt exhaustion,
room gating and completion, score reconstruction and backward room visits.
Additional cases cover invalid input, team isolation, cooldown/rate windows
without sleeps, live-content hash checks, rollback after writes, missing
storage and content, and genuinely parallel requests.

Concurrency checks synchronize multiple requests with barriers and check
database results: a single scored solve/audit entry on duplicate correct
submissions, no more than three attempts on parallel wrong answers, one pickup
on parallel decoy searches, and correct completion when four distinct clues
are solved concurrently.

The API walkthrough earns Bedroom evidence/rewards through game endpoints,
enters Study, collects all sixteen Study scraps through their actual props,
solves the four clues and verifies access to Basement with eight photo pieces.
It is an API integration walkthrough, not a browser/3D E2E test.

The test harness also rejects remote PostgreSQL hosts and database names that
do not begin with `ctc_test` before importing the pre-existing demo seeder.
Each Study test owns a separate team and removes that team's records afterward.
No event database, live answer file, hosted API or deployment was used.

## Warnings and limits

- The existing frontend suite emits React `act(...)` warnings and logs a
  qualification mock error despite passing. These are pre-existing test issues.
- The existing Vite build reports a JavaScript chunk of approximately 1.11 MB
  (302 KB gzip). It remains a successful build with a bundle-size warning.
- Installed Python dependencies emit pytest-asyncio/Starlette/httpx deprecation
  warnings; the repository currently uses broad minimum dependency versions.
- The three uncovered Study statements handle a missing Study room via direct
  service invocation and normalisation modes not used by any current Study
  clue. The actual Study clues all use alphanumeric normalisation.
- No claim is made about 60 FPS, GPU memory, real PNG rendering, door animation
  or the full Room 2 100-test target. The Study frontend does not yet exist on
  the checked-out `main`, so `QA-R2-E2E-01` and its frontend checks remain open.
- These measurements were taken locally before publication and apply to test
  content. Track GitHub CI results in the pull request. A combined
  frontend/backend preview remains pending frontend integration; these local
  checks do not verify a hosted deployment.

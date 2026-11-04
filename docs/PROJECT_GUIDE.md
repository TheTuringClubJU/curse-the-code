# Understanding Curse the Code and your contribution

This guide describes the source cloned from `main` at `94323f8`, plus the Room 2
backend work on `feat/room2-backend`. It distinguishes implemented behavior
from the larger plan in `TODO.md`. It does not claim that the hosted event
environment has been checked.

## 1. The game players are meant to experience

Curse the Code is a cooperative investigation/escape-room game. Players log
into a team, explore a room in first person, inspect objects, collect scraps,
decode clues, and earn pieces of a photograph. The server remembers their
team's discoveries, attempts and score, so both authorised devices share the
same progress and refreshing the page does not reset the game.

Round 1 follows this sequence:

| Room | Exploration and puzzles | Owner of frontend / backend |
|---|---|---|
| Lena's Bedroom | 15 evidence fragments; four clues; photograph pieces P01-P04 | Darsh / Darsh |
| Daniel's Study | 16 fragments; four clues; photograph pieces P05-P08 | Subham / Shahan |
| The Basement | Five fragments; two regular clues and a three-stage final terminal | Krishnapriya / Vishad |

Players move using WASD, look with the mouse, and interact using E. B opens
the evidence basket, C opens the case files, and P opens the photograph view.
Opening a modal releases pointer lock and pauses movement. Some of these
behaviors are established in Room 1 and still need implementation in the
other frontend pages.

In the Study, two of the sixteen scraps are decoys. A decoy is collectible
evidence that can mislead the investigation; the API does not label it as a
decoy for players. All sixteen pieces are needed to open the basket. Scraps
are wrapped until the basket unlocks, then the readable fragments become
available. Searching out of order returns a locked response without awarding
anything. A prop can hold more than one scrap, so players must revisit it.

The four Study terminals are a tablet, CRT monitor, crash-log terminal and
printer. Their puzzles involve binary characters, an encoded message, a hex
dump and inconsistent access timestamps. Correct submissions award one photo
piece and 100 points each under the current implementation. Every accepted
answer, including a correct answer, uses one of the clue's three attempts.
An exhausted Study clue stays unsolved and earns no photo piece or points.
The Study exit opens when all four clues are resolved: solved or out of
attempts. This follows the progression rule clarified in PR #7. A team can
therefore enter the Basement with missing photo pieces; opening the Study
exit does not complete Round 1.

The Basement's planned final terminal asks for keywords, an ordering of all
ten photo pieces, then a protocol and PIN. That multi-stage implementation is
Vishad's task; the current shared submission handler only processes a first
stage. Round 2 is a different competition stage with Rooms 4-6: Records,
Control and Vault. **Room 2 and Round 2 are different things.** The latter
remains a future workstream in the task list.

## 2. What frontend, backend and database mean here

The **frontend** is the JavaScript running in a player's browser. React draws
the login page, lobby, HUD and clue forms. Three.js draws the room, furniture,
lights and camera view. It can show that a player pressed E or typed an
answer, but the browser cannot be trusted to decide whether that answer is
correct or how many points to award: users can modify browser code.

The **backend** is the Python process running on the server. FastAPI exposes
URLs called endpoints. The browser sends an HTTP request, the backend checks
the session and game rules, and then returns a JSON response. Your Study
service belongs here because attempts, clue verification and door unlocking
must remain authoritative even if somebody bypasses the UI.

The **database** is PostgreSQL. In the configured hosted architecture it is
provided by Neon; tests use a separate local PostgreSQL instance. It stores
team-specific facts, such as which scraps this team collected. Puzzle content
itself comes from the content JSON, rather than from those progress tables.

```mermaid
sequenceDiagram
    participant Player
    participant UI as React / Three.js
    participant API as FastAPI
    participant DB as PostgreSQL
    Player->>UI: Press E on a bookshelf
    UI->>API: POST /api/game/room/study/search + session cookie
    API->>DB: Validate session; lock team; read progress
    API->>API: Check access and fragment dependencies
    API->>DB: Save pickup and basket unlock together
    DB-->>API: Commit
    API-->>UI: found, fragment_id, basket_unlocked
    UI->>API: GET /api/game/room/study
    API-->>UI: Authoritative room state
    UI-->>Player: Update basket and HUD
```

HTTP is request/response communication. This repository uses polling and
explicit state refreshes rather than WebSocket broadcasts. One player's
browser does not directly update their teammate's screen; the other browser
must fetch state again to see the change.

## 3. Where the code lives

| Path | Responsibility |
|---|---|
| `app/main.py` | Creates FastAPI, mounts routers and configures CORS/static files |
| `app/config.py` | Reads environment variables and content rules |
| `app/db.py` | Manages reusable PostgreSQL connections |
| `app/login/` | Team login, password checking, sessions and logout |
| `app/lobby/` | Team qualification and round status for the waiting screen; loads content JSON |
| `app/admin/` | Organiser authentication, round controls, presence, ranking and qualification |
| `app/game/routes.py` | The game HTTP endpoints; dispatches Study actions to your service |
| `app/game/study_service.py` | Your Study rules, verification and database transactions |
| `schema.sql` | Existing table definitions, constraints and triggers |
| `content.test.json` | Development room definitions, object IDs, evidence, clue fields and test verification material |
| `frontend/src/App.jsx` | Chooses admin, login, lobby or the current implemented game page |
| `frontend/src/game/Room1Bedroom.jsx` | Room 1 state, interaction requests, modals and scene lifecycle |
| `frontend/src/game/engine/` | Camera controls, rendering, procedural geometry, textures, lighting, audio and scares |
| `frontend/src/game/components/` | HUD, basket, clue forms, case files, photo view and completion overlay |
| `frontend/src/game/rooms/bedroom.js` | Bedroom layout/theme configuration |
| `frontend/src/userlogin/`, `lobby/`, `admin/` | The corresponding browser interfaces |
| `frontend/public/` | Images and fragment artwork; contains Room 1 assets at present |
| `tests/`, `frontend/src/__tests__/` | Python integration tests and React component tests |
| `.github/workflows/ci.yml` | Automated backend tests, frontend tests and frontend build |
| `render.yaml`, `vercel.json` | Hosting/build configuration and API forwarding |

The 3D engine creates furniture from geometry and procedural canvas textures.
It shares meshes/materials and merges geometry to reduce draw calls. The
performance targets in TODO are design budgets, not measurements established
by the backend tests. `controls.js` owns movement; a room should not add its
own competing camera controls.

The current engine explicitly invokes the Bedroom builder. Some shared modals
also contain Bedroom fragment mappings and test text. Subham will need to
generalise that wiring for Study; merely changing a room ID or theme does not
produce the second room.

## 4. How login and saved progress work

Teams have bcrypt password hashes. On successful login the server generates
a random session token and stores its SHA-256 hash. The browser receives a
`team_session` cookie. The token identifies the session, while the team ID
comes from the server's session lookup, never from a player-supplied team ID.
The existing API also supports `x-session-token` and Bearer authentication.
These are opaque session tokens, not JWTs.

Two active devices are permitted per team. Valid activity extends the session
lifetime to twelve hours. Logout ends one session; logout-all and organiser
controls can end multiple sessions. Login has brute-force lockout rules.

The important database tables are:

| Table | What a row represents |
|---|---|
| `teams` | A participating team and its account data |
| `team_sessions` | One authorised device/session |
| `rounds` | Organiser-controlled status for each competition round |
| `team_rounds` | Team totals, ranking/qualification data for a round |
| `team_rooms` | Basket and completion status for a team in a room |
| `team_fragments` | An evidence fragment collected by a team |
| `team_clues` | Attempts, solved status, score and solve time for a clue |
| `submissions` | Audit record of each accepted answer attempt |
| `hint_usage` | Schema support for hint usage; not a complete Study hint system |
| `admins`, `admin_sessions`, `admin_log` | Organiser accounts, sessions and actions |
| `login_attempts`, `event_log` | Authentication and event audit records |

The `(team_id, clue_id)` key prevents duplicate clue-progress rows. The
`(team_id, fragment_id)` constraint prevents duplicate fragment ownership.
Constraints alone do not prevent two simultaneous requests from both reading
zero attempts and awarding points. That is why the Study also locks the team's
existing database row while processing an action.

## 5. What your Room 2 code actually does

The service reads objects, evidence, clues and rewards from content JSON.
It does not invent a second list of puzzle answers or fragment placements.

For searches it selects an uncollected fragment attached to the searched prop
whose prerequisites have been met. `ES01`-`ES12` form the Study trail. Another
chain, `EK01`-`EK06`, spans multiple rooms: `EK01` is found in the Bedroom,
`EK02` and `EK03` in the Study, and the rest in the Basement. This is why a
Study-only check of fragment dependencies would be incomplete.

For answers it validates type and length, checks the room and basket gates,
then applies the content's normalisation rule. It computes HMAC-SHA256 over
`clue_id:stage_index:answer`, using the server's content salt, and compares
the result in constant time. It tries both the normalised answer and the
trimmed uppercase form to support source IDs containing punctuation. The
plaintext array is permitted only with the explicit test content pack.

An HMAC is a keyed cryptographic digest. Keeping the verification material on
the server lets the browser receive the puzzle without receiving the expected
answer/hash/salt. It does not make test answers secret when those answers are
already published in the development repository. Real event content must stay
private.

Each accepted submission writes its progress and audit record together. A
correct answer recalculates round totals from solved clue records rather than
adding points again on retries. Solving the fourth Study clue records room
completion. If any write fails, the whole transaction rolls back. The response
returns after commit. Repeated requests for a solved clue return its status
without another attempt, audit row or score award.

The service also enforces the configured three-second answer cooldown and a
30-submission-per-minute ceiling per team. Its check includes recent attempts
from other rooms. Invalid input, a closed evidence gate, and rate-limited
requests do not consume attempts. It does not retrofit those protections into
the older Room 1 submission handler.

## 6. How you and the other developers collaborate

You collaborate through a shared contract and Git changes. Subham builds the
Study room and sends the documented requests. You implement what those
requests mean and return fields his UI can use. Vishad reads the Study
completion flag as the Basement entry prerequisite. Darsh reviews integration
and shared architecture. You do not need to share a Python process or edit
the same file at the same time.

An **API contract** is an agreement about URL, method, request fields, response
fields and errors. For example, Subham sends `{ "object_id": "bookshelf" }`
and reacts to `found`, `locked` or `already_collected`. He does not send a
fragment ID to award or a new score. Your handoff documents these details.

A **branch** is an isolated line of development. This task uses
`feat/room2-backend`; `main` remains the shared integration branch. A **commit**
records a reviewed set of local changes. A **push** sends commits to GitHub.
A **pull request** asks the team to review and merge your branch. Merging puts
the agreed change into `main`. The configured hosting can deploy repository
changes, so a push/merge is separate from merely testing locally.

Use this workflow after reviewing the diff and test results:

1. Coordinate the Study contract with Subham and link the task/issue in the PR.
2. Keep room logic in your service; coordinate the small shared route edits
   with Darsh and Vishad to reduce merge conflicts.
3. Commit the implementation, tests and handoff on your feature branch.
4. Push that feature branch and open a PR; include validation and remaining
   frontend integration work.
5. Let GitHub Actions run both backend and frontend checks. A green check
   means the configured checks passed, not that every game feature is complete.
6. Ask the code owners to review. Test the combined frontend/backend in a
   development preview with test content before the deployment owner merges.

For hands-on practice, follow one action end to end: put a breakpoint in
`study_service.search_object`, search the bookshelf, inspect the request in
the browser Network tab, then query that team's `team_fragments`. Next change
one failure message locally and rerun its test. Finally read the parallel
submission test: it demonstrates a race that a single manual playthrough
would be unlikely to reveal.

## 7. Existing gaps the team should resolve before the event

- The Study page, Study scene and Study fragment artwork are absent from the
  checked-out `main`. `App.jsx` mounts only Room 1 and does not implement a
  playable transition to Room 2. Backend completion is not a finished 3D room.
- The JSON defines 20 Study objects. TODO additionally describes two doors,
  but those door objects are not in that JSON. Coordinate their scene/API
  representation with Subham rather than silently changing his assignment.
- Study and Room 1 both allow progression after all clues are solved or
  exhausted, as clarified in PR #7. The Study frontend must use the server's
  completion flag rather than requiring four solved badges. The planned
  Basement finale must separately require all earned photo pieces.
- Admin round controls update round status, but existing game routes do not
  generally enforce live/paused/ended status. `App.jsx` defaults to live and
  skips lobby polling during Round 1. The event's pause/end behavior needs a
  shared implementation and integration test.
- Importing `app/login/service.py` calls `seed_demo_teams()`. With a configured
  database it resets demo-team login state and deletes their sessions.
  Startup must not reset participating teams. Move demo seeding behind an
  explicit development command before event deployment. Default demo/admin
  accounts also need an event-specific provisioning plan.
- Room 1/shared routes still need their own concurrency, input-gate and
  verification review. Study's service and tests do not certify those routes.
- The Basement multi-stage finale and Round 2 gameplay remain separate tasks.
  Admin qualification is a manual action; completing the Study does not
  automatically qualify a team for Round 2.
- The frontend test suite passes with existing async-state warnings and a
  qualification mock error; the production build warns about a large bundle.
  These should be reviewed without treating component-test passes as proof of
  a complete browser journey or a 60 FPS benchmark.

No live deployment, real event database, real event content or hosted service
was exercised as part of this local implementation.

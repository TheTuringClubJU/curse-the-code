# Curse the Code: Build TODO (simplified)

One college event. Fixed teams, two rounds, manual round control by the organisers. Tags: **BE** backend, **FE** frontend, **ADM** admin, **AST** assets, **QA** tests. Tick a box when done and reviewed.

**Project rule:** if a feature doesn't (1) let teams play the game, (2) keep results correct, or (3) give organisers a control they need live, it is not in the first release.

**Server rule:** the server decides answers, timing, unlocks, scores and ranks. The browser only displays and sends requests. The expected answer is never sent to the browser.

**Simplifications decided (do not re-add):**
- Passwords are plain text in the DB (only organisers can reach it). Reset = one SQL `UPDATE`.
- Clue answers are plain text in the server-only content file. No salt, no HMAC, no hashes.
- Session ids are random UUIDs, stored as is. No token hashing, no login-attempt tracking, no lockouts, no rate limits.
- No admin roles, no admin-management UI, no audit log, no event log, no announcements, no score-adjustment table, no fingerprinting, no content reload.
- No pause, extend, or auto-end. The admin clicks Start and End. Nothing else changes round state.
- Ending a round signs out every team in that round (section 2.7). Progress, scores and qualification are never touched; organiser sessions are never touched.
- Teams, organisers, password resets and score fixes are plain SQL (examples at the bottom of `schema.sql`).
- Score has one source of truth: `SUM(team_clues.score)`. Fragments and room status are derived, not stored.
- No request-id replay. Double scoring is prevented by a per-team lock plus the "already solved" check.

## 1. Content file (the only source of game content)

Everything (rooms, clues, questions, hints, answers, story text, scoring rules, fragments, toolkit) is in one JSON file named by the `CONTENT_FILE` env var. Same format for `content.live.json` and `content.test.json`. Story, clues, rooms, hints and scoring are unchanged; only the answer field changed (below).

| Key | What it holds |
| --- | --- |
| `meta` | pack\_label, event\_name, assets\_dir, rules (cooldown 3 s, free hint after 300 s, max sessions per team 2, max field length 200) |
| `rounds[]` | round, title, subtitle, difficulty, default\_duration\_min (display only), final\_clue, screens (intro, victory\_lines, bridge\_text, eliminated\_text, sting\_template) |
| `rooms[]` | id, round, order, title, unlock rule, background\_file, theme, ambient audio, objects[] |
| `clues[]` | id, round, room, seq, kind, object\_id, title, scene\_text, unlock.requires\_all, payload, assets[], stages[], hints[], scoring, lockout, reward, final |
| `stages[]` | index, type (`fields`, `arrange`, `choice_code`), prompt, fields[], expected\_fields, **`answer`**, reveal |
| `fragments[]` | id F01 to F10, awarded\_by, correct\_slot, file, caption |
| `toolkit[]` | techniques and free tool links |

**`answer`** is a list of strings, one per field (or per slot for `arrange`, or `[option, code]` for `choice_code`). Example: `"answer": ["BASEMENT", "HOLLOW", "SRC-0477"]`.

**Comparison rule:** normalise the player's field and the stored answer the same way (`upper`, `alnum`, `digits` as set on the field), then compare field by field. Order matters. Plain `==`.

- [ ] **BE-01** Read `CONTENT_FILE` at startup; refuse to boot if unset, missing or invalid JSON. Log the file name and `pack_label` only (never answers).
- [ ] **BE-02** Validate on boot with a short checklist: every round has exactly 10 clues; every clue has at least one stage with an `answer` of the right length; every `object_id`, `requires_all` id and fragment award points at something that exists; no dependency cycle. Boot fails with a readable list of problems.
- [ ] **BE-03** Build derived data once at boot: clue by id, clues by room, clue count per room, final clue per round.
- [ ] **BE-04** Public projection function used for every response that carries content: removes `answer`, `solution`, `feeds`, unused `hints`, and each `reveal` until its stage is solved.
- [ ] **BE-05** Asset endpoint: login required, serves only from `meta.assets_dir`, blocks path traversal, only for clues the team has unlocked. Use the framework's file response (it gives content type and Range for audio).

## 2. Backend

### 2.1 Login and sessions

- [ ] **BE-10** `POST /api/auth/login` (`team_name`, `password`). Name is case-insensitive; password is a plain compare. Wrong name or password returns one generic message. Success sets an HTTP-only cookie holding the session id.
- [ ] **BE-11** Max active sessions per team = `meta.rules.max_sessions_per_team`. Over the limit returns `SESSION_LIMIT` with the count so the login page can offer "log out everywhere".
- [ ] **BE-12** `POST /api/auth/logout`: ends the current session.
- [ ] **BE-13** `POST /api/auth/logout-all` (`team_name`, `password`, no session needed): ends every active session of that team, returns how many. Zero sessions is a success. Never touches progress or scores.
- [ ] **BE-14** `GET /api/auth/me`: team and active session count.
- [ ] **BE-15** A session is valid while `ended_at IS NULL`. An ended session returns `SESSION_ENDED` with a `reason` (`logout`, `forced`, `round_ended`) read from `team_sessions.ended_reason`. Session check runs before any round or clue check, so a signed-out team always gets `SESSION_ENDED`, never `ROUND_CLOSED`.
- [ ] **BE-16** Disabled teams (`is_active = false`) cannot log in. Teams may log in before a round starts (lobby).

### 2.2 Game state

- [ ] **BE-20** `GET /api/state` returns in one call: server time, round status and `started_at`, the team's round summary (score hidden when `hide_scores`), every room of the current round with `locked`, `unlock_hint`, total and solved clue counts, object states (locked, open, solved), unlocked clues in public form, `current_stage`, hint availability per stage, lockout end times, collected fragments, qualification status. Room counts come from the content file and progress, never hardcoded.
- [ ] **BE-21** `GET /api/time` returns server time in ms for the frontend clock offset.
- [ ] **BE-22** `GET /api/clues/{id}` returns the clue only if unlocked, plus the `reveal` of solved stages and the story text once solved. Locked room or clue returns 403 (`ROOM_LOCKED`, `CLUE_LOCKED`) with a spoiler-free hint.
- [ ] **BE-23** A team with no row in the current round gets `NOT_IN_ROUND` (frontend shows the eliminated screen).
- [ ] **BE-24** `/api/state` also returns `phase` for the team, computed from the two round statuses and the team's rows: `waiting_r1` (Round 1 pending), `r1_live`, `r1_ended_pending` (Round 1 ended, qualification not run), `qualified_waiting_r2` (in the Round 2 set, Round 2 pending), `eliminated` (not in the Round 2 set, once qualification has run), `r2_live`, `r2_ended`. The frontend picks the screen from `phase` only.
- [ ] **BE-25** How the two rounds stay separate. `rounds` has two fixed rows (1 and 2). `current_round` is computed on every request from those two rows (cheap, no cache): **2** if Round 2 is `live` or `ended`, otherwise **1**. (Between rounds it stays 1, read-only, and `phase` decides the screen.) Every query that reads progress filters by round: `team_rounds` is keyed `(team_id, round)`, and `team_clues` carries `round` and clue ids are globally unique (`R1-01` vs `R2-01`). A submit or asset request looks the clue up in the content file, takes its round, and rejects unless that round is `live` and the team has a `team_rounds` row for it. Round 1 data is never deleted or overwritten when Round 2 starts.

### 2.3 Unlock engine

- [ ] **BE-30** Room rules: `at_start`, `rooms_complete: [ids]`, `clue_solved: id`. Clue rule: all `requires_all` solved and its room open. Room and clue status is computed from `team_clues` plus the content file.
- [ ] **BE-31** On round start (one transaction): Round 1 creates `team_rounds` for every active team; Round 2 uses the `team_rounds` rows that qualification already created (never adds teams). Then insert `team_clues` for clues with no requirements, `unlocked_at = started_at`.
- [ ] **BE-32** After each solved clue: insert newly unlocked `team_clues` with `unlocked_at = solve time`. Safe to run twice (`ON CONFLICT DO NOTHING`).

### 2.4 Submit

`POST /api/clues/{id}/submit` with `stage` and `fields[]`.

- [ ] **BE-40** Take a per-team lock (`pg_advisory_xact_lock(team_id)`) around the whole submit so two requests from one team never run together.
- [ ] **BE-41** The backend rejects unless the round is `live` (`ROUND_NOT_STARTED`, `ROUND_CLOSED`), the clue is unlocked (`CLUE_LOCKED`), and the clue is not already solved (`ALREADY_SOLVED`, no penalty, original points returned).
- [ ] **BE-42** 3-second cooldown after a wrong answer (`TOO_FAST` with `retry_after_sec`), plus the clue's own lockout from the content file (`LOCKED` with `retry_after_sec`). Both read from `team_clues`, so they survive refresh.
- [ ] **BE-43** Input checks: `stage` equals `current_stage`; field count equals `expected_fields`; strings only, max length from the content, no control characters.
- [ ] **BE-44** Compare using the rule in section 1. For `arrange`: exactly 10 distinct fragment ids, all owned by the team (owned = reward of a solved clue), compared with the answer order.
- [ ] **BE-45** Wrong: bump `wrong_attempts`, set `last_wrong_at`, apply lockout if the clue defines one, return generic `WRONG`. Never say which field was wrong.
- [ ] **BE-46** Correct non-final stage: `current_stage + 1`, return `STAGE_CORRECT` with the reveal.
- [ ] **BE-47** Correct final stage: compute points, set `solved_at` and `score`, run the unlock engine, set `team_rounds.finished_at` if it was the round's final clue, return `CORRECT` with points and newly unlocked rooms/clues. Use the server clock at processing time.
- [ ] **BE-48** Insert a `submissions` row for every attempt (fields, result, points).

### 2.5 Scoring (unchanged rules)

- [ ] **BE-60** Clue points = `base` (6) + `speed` (0 to 4) - hint penalties - wrong-attempt penalties, never below `min_points` (2), rounded to 2 decimals.
- [ ] **BE-61** Speed: full `speed_max` up to `par_sec`, then linear to 0 at double `par_sec`. Time runs from `unlocked_at` to server solve time.
- [ ] **BE-62** Hint penalties: level 1 = 0, level 2 = 1, level 3 = 2 (from the content `hints[].penalty`).
- [ ] **BE-63** Wrong attempts: first `free_wrong` (3) free, then `wrong_penalty` (0.5) each.
- [ ] **BE-64** Round score is `SUM(team_clues.score)`. No cached total. Manual fix = edit the `team_clues` row.

### 2.6 Hints

- [ ] **BE-70** `POST /api/clues/{id}/hint` (`stage`, `level`). Levels in order 1, 2, 3. Level 1 is free and opens `free_after_sec` (300) after the stage became available (`HINT_NOT_READY` with seconds left). Asking again for a used level returns the same text at no cost. Hint text is only sent after use. `/api/state` reports used hints and the next level per stage. Insert into `hint_usage` under the team lock.

### 2.7 Round control (manual only)

- [ ] **BE-80** Admin **Start** (`live`): set `started_at`, run the unlock engine for all eligible teams in one transaction.
- [ ] **BE-81** Admin **End** (round `n`), one transaction, all or nothing:
  1. `UPDATE rounds SET status='ended', ended_at=now() WHERE round=n AND status='live'` (zero rows = already ended or not live: return the current state, change nothing; safe to click twice).
  2. `UPDATE team_sessions SET ended_at=now(), ended_reason='round_ended' WHERE ended_at IS NULL AND team_id IN (SELECT team_id FROM team_rounds WHERE round=n)`.
  3. Commit, return how many teams and sessions were ended.

  Touches only `rounds` and `team_sessions`. It never writes `team_rounds`, `team_clues`, `submissions`, `hint_usage` or any score, so progress, scores, `finished_at` and qualification stay exactly as they were. `admin_sessions` is never touched, so organisers stay signed in. Round 1 End signs out all Round 1 teams (including ones that will not qualify); Round 2 End signs out only Round 2 teams. Signed-out teams can log in again at any time (lobby, standings, eliminated screen).
- [ ] **BE-81b** Race safety between End and submit/hint. Inside the submit and hint transactions, after taking the team lock, run `SELECT status FROM rounds WHERE round=n FOR SHARE` and reject with `ROUND_CLOSED` unless `live`. End's `UPDATE` on that row waits for in-flight submits and blocks new ones until it commits. Result: every submit is either fully committed before End (counts normally) or sees `ended` and is rejected. No submit can be accepted after End commits, and none is half-applied. Do not rely on the status read at the start of the request.
- [ ] **BE-82** Round 2 cannot start until qualification has been run (at least one Round 2 `team_rounds` row exists). Round 1 must be `ended` before qualification can run.
- [ ] **BE-83** The countdown shown to teams is `started_at + default_duration_min` and is display only. Hitting zero changes nothing on the server; the round runs until an admin ends it.
- [ ] **BE-84** Admin toggle **hide scores** on the public leaderboard (replaces the automatic last-10-minutes rule).

### 2.8 Leaderboard and qualification

- [ ] **BE-90** Rank with the `v_leaderboard` view: finished teams first, then clues solved, score, earlier last solve, team id. Disabled teams are excluded. Public leaderboard hides scores when `hide_scores`; the admin view always shows exact scores and times.
- [ ] **BE-91** Qualification by organiser-chosen N. The admin types N; the backend works out who goes through.
  - `GET /admin/qualify/preview?top=N`: returns the teams that would qualify, in rank order, plus the cutoff (rank N, the first team out, and their score), and the total team count. Writes nothing.
  - `POST /admin/qualify?top=N`: in one transaction, take the Round 1 `v_leaderboard` order (finished teams first, then clues solved, score, earlier last solve, team id), keep the first N active teams, make **exactly those** teams the Round 2 set (insert their Round 2 `team_rounds` rows, delete Round 2 rows of anyone else), and return the list. The order has a final team-id tie-break, so the cutoff always yields exactly N teams (or all teams if N is larger).
  - Validation: N is an integer from 1 up to the number of active teams (else `BAD_INPUT`). Round 1 must be `ended` and Round 2 must still be `pending` (else 409 with a clear message). Disabled teams are never selected.
  - Running it again with the same or a different N before Round 2 starts simply recomputes the set; the result depends only on Round 1 data and N. Once Round 2 starts it is locked.
  - Round 2 access is only for teams in that set: they get Round 2 state, clues and assets; everyone else gets `NOT_IN_ROUND` (eliminated screen). Round 1 data of every team is untouched.

### 2.9 Errors

- [ ] **BE-100** One error format: `{ "code", "message", "retry_after_sec" }`. Codes: `BAD_INPUT`, `UNAUTHENTICATED`, `SESSION_ENDED` (with `reason`), `SESSION_LIMIT`, `BAD_CREDENTIALS`, `ACCOUNT_DISABLED`, `ROUND_NOT_STARTED`, `ROUND_CLOSED`, `NOT_IN_ROUND`, `ROOM_LOCKED`, `CLUE_LOCKED`, `ALREADY_SOLVED`, `WRONG`, `TOO_FAST`, `LOCKED`, `HINT_NOT_READY`.
- [ ] **BE-101** Never log submitted answers. CORS limited to the event site. `GET /health` returns status and pack label only.

## 3. Frontend (React)

Look, story, rooms, clue content and colours are the full original design (restored below, object by object). What stays simplified is only the mechanics of a few clue tools, marked **(simplified)**.

### 3.1 Shell

- [ ] **FE-01** Routes: `/login`, `/lobby`, `/play`, `/play/room/:roomId`, `/play/room/:roomId/clue/:clueId`, `/leaderboard`, `/finale/:round`, `/eliminated`. Unknown routes go to `/play` when signed in, else `/login`.
- [ ] **FE-02** One API client: 10 s timeout, maps every error code to a message (FE-160), disables buttons while a request runs.
- [ ] **FE-03** Poll `/api/state` every 5 s; pause while the tab is hidden, refresh when visible.
- [ ] **FE-04** Clock: call `/api/time` once on load, keep the offset, drive countdowns from server time.
- [ ] **FE-05** Toasts (top-right, auto-dismiss).
- [ ] **FE-06** `SESSION_ENDED` from any call (poll, submit, hint, asset) clears local state, stops polling and goes to `/login`. Banner by `reason`: `round_ended` shows "The round has ended. You were signed out. Sign in to see your results; your progress is saved."; otherwise "You were signed out. Sign in again; your progress is safe." Any in-flight submit that fails this way must not show a wrong-answer message. The 5 s poll is what catches a team that is idle at the moment of End.
- [ ] **FE-07** Fonts: "Special Elite" (headings), "VT323" (terminal), "IBM Plex Mono" (body). Colours: background `#07060b`, panel `#0e0c14`, border `#3a2a55`, text `#e9e4f5`, accent `#ff7a1a`.
- [ ] **FE-08** Never keep answers or unrevealed hints in the browser. The session lives in an HTTP-only cookie.
- [ ] **FE-09** Desktop-first (1280 x 720), works down to 1024 wide.
- [ ] **FE-10** Basics: hotspots are buttons with text labels, Tab/Enter/Esc work, `prefers-reduced-motion` turns off flicker and glitch.
- [ ] **FE-11** Audio manager: starts only after the first user click; one ambient loop per room with a 1-second crossfade; random per-room sound effects as listed in the room table; a tension layer that speeds up in the last 5 minutes of the round; UI sounds (hover tick, panel open, correct chime, wrong buzz, room unlock, fragment slide), all short and mutable; a visible global mute button that remembers its state for the session.

### 3.2 Login (`/login`)

**Look:** full-screen near-black `#07060b` with a slow drifting dust-mote layer and faint CRT scanlines. Top centre: the title "CURSE THE CODE" in Special Elite, 56 px, pumpkin `#ff7a1a`, with a slow flicker once every 6 to 9 seconds. Under it, a smaller line: "Hollow House opens at midnight" in `#8f7bff`. Centre: a 420 px wide panel `#0e0c14` with a 1 px border `#3a2a55` and a soft purple glow. Bottom: a small line with the event and club name. A flickering jack-o'-lantern line-art icon sits to the left of the panel on wide screens.

**Panel layout:** a two-option switch at the top: **SIGN IN** (default) and **LOGOUT**. Below it, the form for the selected option. Fields have the show/hide eye on the password, a spinner on the button while pending, autofocus on team name. The page never reveals whether a team name exists.

- [ ] **FE-20** SIGN IN (default) and LOGOUT switch. Sign in: team name, password, "ENTER THE HOUSE". Enter submits; button disabled while pending.
- [ ] **FE-21** Errors in red under the form: bad credentials, disabled team ("Contact the organisers").
- [ ] **FE-22** LOGOUT form: team name + password, button "LOG OUT THIS TEAM", note "Signs this team out everywhere. Your progress and timer are not affected." On success show "N session(s) ended. You can sign in now." and switch back to SIGN IN with the team name kept.
- [ ] **FE-23** On `SESSION_LIMIT` show "Your team is already signed in on N devices" and a button that switches to the LOGOUT form with the name prefilled.
- [ ] **FE-24** Already signed in: `/login` redirects to `/play` (or `/lobby`). Top bar has Sign out (single session) with a confirm dialog.

### 3.3 Lobby, top bar, map, room scene

- [ ] **FE-30** Lobby (`/lobby`): centre card with the team name, the round title and a status line ("Waiting for the organisers to start Round 1" / "You are through to Round 2. Waiting for the organisers to start."), a pulsing candle icon and low ambient audio. Buttons: **How scoring works** (modal: 10 points per clue, 6 base plus up to 4 speed, hint and wrong-answer penalties), **Toolkit** (opens the toolkit card), **Sign out**. When the round goes live, play the round intro and move to `/play` automatically.
- [ ] **FE-40** Top bar (all game screens): left, round title. Centre, countdown `MM:SS`: turns amber under 10 minutes and pulses red under 5; at zero it shows `00:00` and nothing else happens (display only). Right: overall progress "5 of 10 clues", score (shows "?" when scores are hidden), mute button, Toolkit button, Leaderboard button, Sign out.
- [ ] **FE-41** Round 1 only: a fragment tray under the bar with 10 slots (F01 to F10). Empty slots are dark outlines; collected fragments show their thumbnail with a small slide-in animation when awarded.
- [ ] **FE-50** Map hub (`/play`). **Round 1 map:** a dark cutaway of Hollow House with three rooms stacked (Bedroom top, Study middle, Basement bottom), connected by a staircase line. **Round 2 map:** an underground blueprint (blue-black `#0a1220` with cyan `#4ab3ff` line work) with the Records Archive and Control Room side by side and the Containment Vault below them behind a bulkhead.
- [ ] **FE-51** Each room is a card with a thumbnail (the room's `background_file`), the title and the clue count from the server ("Lena's Bedroom, 1 of 3 solved"). Locked rooms show a padlock, the total ("The Basement, 4 clues, locked") and a short unlock hint from the server. Finished rooms show a green "COMPLETE" badge. Card border and glow use the room's `theme.accent` and `theme.glow`. Hover lifts the card 4 px and brightens the glow. Clicking a locked room shakes it and shows a toast with the unlock hint.
- [ ] **FE-52** Round header strip under the top bar: "5 of 10 clues solved" with a segmented progress bar (10 segments).
- [ ] **FE-53** When a room unlocks, play a 1-second unlock animation on its card (padlock cracks open) and a toast "The Study is open." 
- [ ] **FE-60** One reusable `RoomScene` component driven by the room's content (background, theme, objects, ambient). The six rooms must not have separate code paths. It draws a 16:9 stage, letterboxed to fit. Background: the room's `background_file`, with a gradient fallback from `theme.bg_top` to `theme.bg_bottom` if the image is missing, plus a vignette (`theme.vignette`) and a fog layer (`theme.fog`).
- [ ] **FE-61** Objects are absolutely positioned from the percentages in the content file (`x`, `y`, `w`, `h` of the stage). Decor objects are not interactive; clue objects are buttons. Hotspot states: **open** (faint outline in the accent colour at 25 percent, brightens on hover with the object's label tooltip), **solved** (dimmed with a small tick), **locked** (padlock icon, tooltip with the unlock hint). Tab cycles open hotspots in `seq` order; Esc closes the clue panel.
- [ ] **FE-62** Room header: back arrow to the map, room title, "Clues solved: 2 of 3" (count from the server); a "COMPLETE" badge replaces it when all clues are solved. Entering a room crossfades the ambient audio and plays the room's sound effects at random intervals (every 20 to 60 seconds).
- [ ] **FE-63** Effects as small shared components, each respecting reduced-motion: `Flicker` (target object, interval range), `Scanlines`, `Vignette`, `DustMotes`, `Fog`, `Pulse`, `StaticBurst`. A debug overlay (toggled with a key) draws every object's rectangle and id to align art with hotspots.
- [ ] **FE-64** **Placeholder mode (everything playable with zero art).** The content already has all 39 objects with label, kind, `x`, `y`, `w`, `h`. Draw order is decor first, then clue objects on top (the diary sits on the bed, the drawer and recorder on the desk, the note on the rack, on purpose). For each object the scene looks for `obj_<object_id>.png` or `.svg` in the assets folder; if it exists it is drawn at the object's rectangle, otherwise a **placeholder** is drawn there: a rounded box in the room's `theme.accent` at low opacity with the object's `label` centred (clue objects solid border, decor dashed border, solved clues ticked, locked ones padlocked). A missing `background_file` falls back to the theme gradient. Hotspots, states, tooltips and the clue panel behave identically with art or placeholders, so UI work never waits for art.
- [ ] **FE-65** **Map art drawn in code, no asset files needed.** Round 1 map and Round 2 map (FE-50) are inline SVG/CSS: room rectangles, staircase line, blueprint grid, bulkhead, in the colours from the spec. Room cards use the room's `background_file` as thumbnail, falling back to its theme gradient.
- [ ] **FE-66** Dev tools: the debug overlay (FE-63) plus a `?placeholders=1` switch that forces placeholder mode even when art exists, to check hotspot alignment against the real art.

### 3.3b Room looks (visual spec, object by object)

Colours below are the theme values in the content file. Object positions are percentages of the stage and also come from the content file.

| Room | Mood and palette | Lighting and effects | Objects (what is drawn, where) | Ambient audio |
| --- | --- | --- | --- | --- |
| **Lena's Bedroom** (Round 1) | Dim purple-blue. Gradient `#140d26` to `#2b1d52`, accent `#8f7bff`, glow `#cdbfff`, text `#e8e0ff`. | Warm lamp `#ffcf8a` flickers every 2.5 to 7 s. Moonlight from the window as a pale blue shaft. Light fog. | Moonlit window (left, 6/10). Wall poster on the back wall (50/12), nearly black. Unmade bed with a quilt (centre), open diary on the bed (34/56). Nightstand (left) with the music box on top (14/50). Desk lamp (right, 74/36). Half-packed suitcase on the floor (60/66). Wall clock top right (80/14). | Faint music-box loop, ticking clock, occasional floorboard creak. |
| **Daniel's Study** (Round 1) | Green-black CRT. Gradient `#04120b` to `#0b2418`, accent `#3dff8b`, glow `#7dffb0`, text `#b6ffd1`. | Screen glow bleeds onto the desk, scanline overlay at 6 percent, random 150 ms screen glitch every 10 to 20 s. | Sticky-note wall (left, 5/12) with dozens of yellow notes. Corkboard with red string (right, 62/12). Heavy desk (centre). Old CRT monitor on the desk (40/36). Reel recorder (62/52). Locked desk drawer under the desk edge (28/66). Tangled cables on the floor (8/70). | Low CRT hum, distant whisper every 30 to 60 s. |
| **The Basement** (Round 1) | Concrete and red emergency light. Gradient `#14161a` to `#1f1115`, accent `#ff4d4d`, glow `#ff8a8a`, text `#ffd6d6`. | Red lamp `#ff2a2a` pulses slowly and flickers hard now and then. Heavy vignette, steam wisps. | Countdown monitor high on the wall (38/8) showing the live round countdown. Tall server rack at left (6/20). A note taped inside the rack's open door (12/38). Maintenance terminal (30/44). Access console (44/44). Containment console on the right wall (72/34). Circular floor seal in the foreground (36/70) with faint runes. | Server hum, pipe drips, deep heartbeat-like pulse that speeds up under 5 minutes. |
| **The Records Archive** (Round 2) | Yellowed archive. Gradient `#1e1b14` to `#2d2818`, accent `#e7c97a`, glow `#fff2c0`, text `#f3ead0`. | Flickering fluorescent tube (cold white `#dfe9ff`), floating dust motes. | Rows of tall filing cabinets (left, 4/18). Yellowed incident folder on a desk (38/56). Microfilm reader (52/40). Whiteboard of event cards on the back wall (70/14). Sealed bulkhead door at the right end (74/52) with a keypad. Ceiling light (44/4). | Fluorescent buzz, paper shuffle, distant dripping. |
| **The Control Room** (Round 2) | Blue-black monitors. Gradient `#0a1220` to `#101c33`, accent `#4ab3ff`, glow `#9fd6ff`, text `#d6ecff`. | Monitor wall flickers with static, scanline overlay, occasional full-screen static burst (200 ms). | Bank of old monitors (top left, 6/10). Staff terminal (12/52). Transmission receiver with dials and a cassette slot (34/48). Sound console with faders and a small screen (56/54). Dead intercom on the right wall (82/24). | Static bursts, relay clicks, a faint radio voice that cuts out. |
| **The Containment Vault** (Round 2) | Steel and violet core. Gradient `#120d17` to `#1b0f2b`, accent `#38f0ff`, glow `#a99bff`, text `#e6ddff`. | The core behind glass pulses violet `#7a5cff` about once per second; glow brightens as the countdown falls. | Glowing core behind thick glass (centre, 36/14). Countdown timer above it (40/4). Manual terminal on the left (8/46). Failsafe panel on the right (76/42). Central console in the foreground (38/62). Ring of locked panels around the core. | Low core pulse, steel creaks. |

- [ ] **FE-70** The Basement's wall monitor shows the live round countdown (same server-offset clock as the top bar). The Vault's countdown timer above the core does the same and its core glow brightens as the time falls.
- [ ] **FE-71** Theme values (colours, lighting, effect list, ambient audio) are read from each room's content entry, so tuning a room never needs code changes.

### 3.4 Clue panel and clue screens

- [ ] **FE-80** Shared clue panel: a modal over the stage, about 80 percent of the width and height, bordered in the room's accent colour, opening with a 200 ms zoom from the clicked object's position. Left 60 percent: the **artifact viewer** specific to the clue. Right 40 percent: clue title, `scene_text`, the stage prompt, the input fields, the Submit button, the hint ladder, and a line showing wrong attempts so far. Footer: clue id and "Stage 1 of 3" for multi-stage clues. Built from the clue's `kind`, all text read from the content (nothing hardcoded). Esc or the close button returns to the stage.
- [ ] **FE-81** Solved clues reopen read-only (artifact, story text, reveal, no input).
- [ ] **FE-82** Any text a player might want to decode is selectable and has a **Copy** button.
- [ ] **FE-83** On a correct final stage: success overlay "CLUE SOLVED" (plus the points when scores are visible), the story text typed out at 30 characters per second, the fragment sliding into the tray (Round 1), and notices for anything newly unlocked.
- [ ] **FE-84** Submit behaviour: button disabled with a spinner while pending. `WRONG` shakes the panel and keeps the text. `TOO_FAST` shows "Wait 3s" on the button. `LOCKED` shows an overlay with a countdown that comes from the server. `ALREADY_SOLVED` closes the input. `STAGE_CORRECT` moves to the next stage. The browser only checks empty fields and length.
- [ ] **FE-85** Hint drawer: three rungs per stage ("Nudge (free)" with countdown, "Method (-1 point)", "Big help (-2 points)"), locked until the previous rung is used, confirm before a paid hint, revealed hints stay visible. Penalties are read from the content.

**Clue screens (all 20 clues and their puzzles are unchanged).** Each is a thin view over `payload` using shared pieces: text block, image, audio player, input fields.

Round 1, Bedroom
- [ ] **FE-100 R1-01 Lena's Diary** (`cipher_text`). Click the open diary on the bed. Panel shows a two-page diary spread on aged paper `#e9dcc0` with a handwriting font. Left page: the first dated entry; right page: the second. A page-turn arrow reveals the last entry: `last_entry.cipher_text` in smudged ink, grouped in the original word spacing. Copy button on the last page. One text field. Success: the diary cover opens and Fragment 1 slides out.
- [ ] **FE-101 R1-02 Music Box** (`audio_morse`). Click the music box on the nightstand. Panel shows the open box with a spinning ballerina and a **Play** button, a waveform, and a speed switch (Normal, Slow). The browser synthesises the melody from `morse` at `unit_ms` per unit: short note equals one unit, long note three units, a longer gap between digits. No dots or dashes are shown on screen. One numeric field. Success: a false bottom clicks open and Fragment 2 appears.
- [ ] **FE-102 R1-03 Torn Poster** (`image_inspect`). Click the dark poster. Panel shows `image_file` nearly black, with a small **Inspector** toolbar: **Invert** toggle, **Contrast** slider (100 to 400 percent) and Reset (browser filters only). **(simplified: no brightness slider, zoom or pan.)** One field with the format hint in the prompt. Success: the poster corner peels away and Fragment 3 is revealed.

Round 1, Study
- [ ] **FE-103 R1-04 Lena's Tablet** (`binary_note`). Click the desk drawer; it slides open to show a cracked tablet. Panel shows the tablet lock screen with a keyboard-style passcode box. A **Turn over** button flips the tablet to show a yellow sticky note with `sticky_note` groups of eight bits on separate lines. After the correct passcode the tablet unlocks and a voice-memo app opens with a play button and the transcript from the stage reveal. Success also gives Fragment 4.
- [ ] **FE-104 R1-06 The Unsent Email** (`base64_email`). Click the old CRT monitor. Panel shows a mail window in green on black: Drafts folder, From and To lines, Subject, the intro line, and below it `encoded_block` in a monospace block that wraps. Copy button. One text field. Success: the draft gains a paperclip and Fragment 6 opens as an attachment.
- [ ] **FE-105 R1-07 Two Recordings** (`audio_compare`). Click the reel recorder. Panel shows two reels labelled Recording A and Recording B, each with Play, a scrub bar and a waveform, and a **Properties** button. Properties opens a small dialog listing `properties`: date recorded, duration, software. A field asks for the spoken word. Success: the forged reel cracks and Fragment 7 slides out of its cover art.

Round 1, Basement
- [ ] **FE-106 R1-05 Corrupted Log** (`hex_log`). Click the maintenance terminal. Panel shows a green terminal window titled `filename`. It prints `log_lines` with timestamps, then a block of hex lines `hex_lines` with an offset column. Selectable, with a Copy button. One text field. Success: the printer clicks and Fragment 5 prints out.
- [ ] **FE-107 R1-08 Server Access Log** (`log_filter`). Click the access console. Panel shows the 20 log lines in a terminal window with Copy. **(simplified: no built-in search box; players use the browser's find or their own tools.)** One text field. Success: the rack monitor flashes and Fragment 8 appears.
- [ ] **FE-108 R1-09 The Family's Final Note** (`vigenere_note`). Click the note taped inside the rack door. Panel shows `image_file` aged paper with the cipher text laid over it in handwriting, and a smudged margin line `margin_note` at the bottom. Copy button for the cipher text. One text field. Success: the note falls open and Fragment 9 drops from the hinge. This clue unlocks only after R1-05 is solved.
- [ ] **FE-109 R1-10 Containment Terminal** (`final_terminal`, 3 stages). Click the containment console. The panel is full width.
  - **Stage 1:** a keyword screen with three labelled fields (diary keyword, crashed process, source ID). Success drops Fragment 10 into the tray.
  - **Stage 2:** the **Arrange board**. Top: a 2 by 5 grid of slots numbered faintly 1 to 10. Bottom: the tray with the ten collected fragments as thumbnails with their captions on hover. Click a fragment and then a slot (keyboard and touch friendly); drag and drop is a bonus. Dropping on or clicking a filled slot swaps. A **Reset** button clears the grid and a **Lock in** button submits. On success the pieces snap together with a glowing seam and the full photograph appears.
  - **Stage 3:** the photograph at left with a slow pulse on the empty fifth shadow and the line from the reveal. At right, two large option buttons with the labels from the content, a four-digit code field, and a **Submit** button. Selecting an option highlights it in the accent colour. A wrong submission flashes the console red but never says which part was wrong.
  - Success starts the Round 1 finale.

Round 2, Archive
- [ ] **FE-110 R2-02 Redacted Report** (`redacted_pdf`). Click the yellowed folder. Panel shows two tabs, **Copy A** and **Copy B**, each a scanned-paper page with the report paragraphs. Redacted segments are drawn as solid black blocks but the text underneath stays selectable (same colour as the bar), so select-all and copy reveal it. Footer line of each copy shows "DOC-HASH: `footer_hash`" in monospace. Two fields: shutdown date and code word. Success: the folder stamps "VERIFIED" on the genuine copy.
- [ ] **FE-111 R2-03 Photograph, Revisited** (`microfilm_viewer`, 2 stages). Click the microfilm reader. **Stage 1:** the screen shows a dark film strip and a date dial (one field in the YYYY-MM-DD format, with a click-sound dial look). **Stage 2:** the Round 1 portrait appears with film grain, plus a **Properties** button that opens a panel listing the comment field as hex lines from the stage reveal. A field takes the panel code. Unlocks only after R2-02 is solved.
- [ ] **FE-112 R2-04 Epoch Timeline** (`epoch_timeline`). Click the whiteboard. Panel shows eight index cards pinned on a board, each with its event text and a large number (`epoch`) where a date would be, with a Copy button per card. No automatic sorting and no conversion. **(simplified: cards sit in a fixed pinned layout; drag-to-rearrange is optional.)** One text field.
- [ ] **FE-113 R2-07 Convergence Lock** (`keypad_lock`). Click the bulkhead door. Panel shows a steel keypad with two fields (panel code, keyword) and a big **UNLOCK** button. Wrong entry shows "ACCESS DENIED" with no detail. Success: the bulkhead grinds open, the Vault card unlocks on the map, and a toast says so. Unlocks only after R2-03 and R2-04 are solved.

Round 2, Control Room
- [ ] **FE-114 R2-01 Personnel Index** (`table_filter`). Click the staff terminal. Panel shows a spreadsheet-styled table of `rows` with a sticky header and scroll, and a **Download CSV** button for the full table. **(simplified: no built-in column filters, sort or export logic; players filter in Excel or code.)** Nothing is highlighted for the player. One field for the badge ID.
- [ ] **FE-115 R2-05 Transmission Archive** (`transmission_archive`). Click the receiver. Panel shows six cassette or envelope icons, TX-1 to TX-6. Opening one shows a header block (From, X-Auth, Received) and the message body. Copy button on the header. One field for the voicemail file name. Unlocks only after R2-01 is solved.
- [ ] **FE-116 R2-06 Spectrogram Voicemail** (`spectrogram_voicemail`). Click the sound console. Panel shows two tracks (Voicemail A and B), each with Play, a scrub bar, and a **Download WAV** button so teams can open the file in a spectrogram tool. No built-in spectrogram view. A four-box digit field. Unlocks only after R2-05 is solved.

Round 2, Vault
- [ ] **FE-117 R2-08 Manual Diff** (`manual_diff`). Click the manual terminal. Panel shows two panes side by side: **Manual (plain)** with the eight step lines, and **Manual (encrypted)** with the ciphertext block. Copy button on each, no built-in diff. One field for the tampered step numbers.
- [ ] **FE-118 R2-09 Failsafe Circuit** (`logic_circuit`). Click the failsafe panel. Panel draws the circuit from `circuit` as SVG: eight inputs on the left (A1, A0, B1, B0, C1, C0, D1, D0), standard NOT, AND and OR symbols, wires, and four lamps on the right. The panel note is printed at the bottom. **(simplified: static drawing, no flip-able input switches.)** One four-digit field. After 5 wrong tries the clue locks for 60 seconds with a visible countdown.
- [ ] **FE-119 R2-10 Final Containment** (`final_console`). Click the central console. Panel shows three fields (clean step numbers, authorization code, real sender badge) and a big **INITIATE SHUTDOWN** button. A wrong entry triggers a full-panel red lockout with a 3-minute countdown and the line "Check your evidence." Success starts the Round 2 finale.

### 3.5 Toolkit, leaderboard, error messages

- [ ] **FE-150** Toolkit card: techniques and tool links from the content file.
- [ ] **FE-151** Leaderboard screen: rank, team, clues solved, score ("?" when hidden), own team highlighted, "FINISHED" status, refresh every 5 s.
- [ ] **FE-160** Error messages: `BAD_CREDENTIALS` "Team name or password is wrong." / `ACCOUNT_DISABLED` "This team is disabled. Contact the organisers." / `SESSION_LIMIT` "Your team is already signed in on other devices." / `SESSION_ENDED` (FE-06) / `ROUND_NOT_STARTED` "The round has not started yet." / `ROUND_CLOSED` "The round has ended." / `NOT_IN_ROUND` "Your team is not in this round." / `ROOM_LOCKED` and `CLUE_LOCKED` "This lead is not open yet." plus the hint / `WRONG` "Not quite. Check your evidence." / `TOO_FAST` "Wait a few seconds before trying again." / `LOCKED` "Locked. Check your evidence." / `HINT_NOT_READY` "This hint opens in mm:ss."

### 3.6 Story screens and finales

- [ ] **FE-170** **Round intro:** black screen, the `intro` text typed in VT323 at 40 characters per second, then a **BEGIN** button. Ambient audio fades in.
- [ ] **FE-171** **Round 1 finale:** the house goes silent (all audio cuts for 1 second), the countdown freezes, the door opening animation plays (`door_open` image sequence), the three `victory_lines` appear one after another, the last line glitching. Then the leaderboard. Then, for qualified teams only, a glitch cut to the completed photograph with a doorway and a faint sixth shadow, and the `bridge_text` typed out as a CIPHER transmission with a **CONTINUE** button. **Not qualified:** after the leaderboard show the round's `eliminated_text` with a "Thank you for playing" card and a link to the final standings.
- [ ] **FE-172** **Round 2 intro:** the `intro` text of Round 2 typed out, then the map with three rooms.
- [ ] **FE-173** **Round 2 finale:** monitors flicker, the countdown freezes, the `victory_lines` appear, the `bridge_text` plays as the researcher's final recording (typed text with a static voice effect), then the final leaderboard with the winners highlighted. **Sting:** two seconds after the leaderboard, flash the `sting_template` full screen in red on black with the team name inserted for `{TEAM_NAME}`, glitching, then fade to black and show the final "Thank you" screen.
- [ ] **FE-174** All cutscenes can be skipped with Esc after the first viewing, except the sting.
- [ ] **FE-175** **Glitch effect** component (transitions and the sting): 300 ms RGB split plus horizontal slice jitter, triggered from code.
- [ ] **FE-176** Screens after a round-end sign-out. Teams are logged out when a round ends, so cutscenes are shown on the next login, chosen by `phase`:
  - `r1_ended_pending`: "Round 1 has ended. Results are being finalised." plus the Round 1 standings. Nothing about Round 2 yet.
  - `qualified_waiting_r2`: Round 1 finale lines and standings, then the `bridge_text` cutscene (once, **CONTINUE**), then the lobby: "You are through to Round 2. Waiting for the organisers to start." When Round 2 goes live the poll moves them to the Round 2 intro, then the map.
  - `eliminated`: `eliminated_text`, "Thank you for playing", Round 1 standings.
  - `r2_live` for a qualified team: Round 2 intro (once), then `/play`. Teams that are still signed in when Round 2 goes live just see the intro and the map.
  - `r2_ended`: Round 2 `victory_lines`, final standings, then the sting for Round 2 teams, then the thank-you screen. Everyone else sees the final standings.
  - "Seen once" is remembered in `localStorage` per device; if it is lost the cutscene simply plays again.

## 4. Admin panel (`/admin`)

Boring on purpose: flat dark slate `#0f1115`, panels `#171a21`, accent cyan `#38bdf8`, IBM Plex Sans. One page.

- [ ] **ADM-01** `/admin/login`: username and password against the three organiser rows in `admins`. A cookie session in `admin_sessions`. Sign out button. No lockouts, no roles.
- [ ] **ADM-02** Round controls for Round 1 and Round 2: status badge, **Start**, **End**, hide-scores toggle, elapsed time and the display-only countdown. Buttons only enabled when valid (Start when pending, End when live, Round 2 Start after qualification). **End** asks for confirmation ("This signs out every team in Round N. Progress and scores are kept.") and afterwards shows how many teams and sessions were ended. The organiser stays signed in.
- [ ] **ADM-03** Teams table: name, active session count, clues solved, score, enabled flag. Row actions: **Force logout** (ends all sessions of that team), **Disable / Enable**.
- [ ] **ADM-04** Leaderboard per round with exact scores and finish times (millisecond), rank order as in BE-90.
- [ ] **ADM-05** Qualification panel (enabled once Round 1 has ended and Round 2 has not started): a number input **"Teams going to Round 2"** (integer, min 1, max = active teams), a **Preview** button listing rank, team, clues solved, score and finish time for those N plus a "cutoff" line, and a **Qualify** button with a confirmation ("Only these N teams get Round 2 access"). After qualifying it shows the qualified list and still allows re-running until Round 2 starts.

Admin API: `POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/state` (rounds + teams), `POST /admin/rounds/{n}/start`, `/end`, `/hide-scores`, `POST /admin/teams/{id}/force-logout`, `/disable`, `/enable`, `GET /admin/leaderboard?round=n`, `GET /admin/qualify/preview?top=N`, `POST /admin/qualify?top=N`.

Done with SQL instead of UI: create teams and organisers, reset passwords, delete teams, fix scores, reset a clue, read submissions.

## 5. Assets to produce

Unchanged. All files go in `meta.assets_dir`; each clue's brief is in the content file (`clues[].assets[].brief`).

- [ ] **AST-01** Six room backgrounds, 1920 x 1080 PNG (`bg_bedroom.png`, `bg_study.png`, `bg_basement.png`, `bg_records.png`, `bg_control.png`, `bg_vault.png`).
- [ ] **AST-02** Object art (transparent PNG or SVG) for every object in the rooms (39 in total), named `obj_<object_id>.png` (for example `obj_diary_bed.png`), sized to the object's `w` x `h` percentage of the stage. Missing ones show as placeholders (FE-64), so this can be delivered gradually.
- [ ] **AST-00** `scripts/make_placeholders`: reads the content file and generates a flat-colour placeholder for every referenced asset that does not exist yet (backgrounds, fragments, puzzle images, short silent or tone audio files). Used for dev and for `assets_test`, so the asset check and the full game run before any real art exists. It never overwrites a real file.
- [ ] **AST-03** Ambient loops and effects per room, UI sounds (hover, open, correct, wrong, unlock, fragment, sting).
- [ ] **AST-04** Round 1 puzzle files: `diary_open.png`, `music_box.mp3` (optional), `poster_dark.png`, `voice_memo.mp3`, `rec_a.wav`, `rec_b.wav` (metadata embedded), `final_note.png`, `photo_full.png`.
- [ ] **AST-05** `frag_01.png` to `frag_10.png` cut from `photo_full.png` (2 x 5, torn edges) matching each fragment's `correct_slot`. Verify by assembling.
- [ ] **AST-06** Round 2 puzzle files: `paper_scan.png`, `portrait_round1.png` (comment metadata embedded), `vm_a.wav`, `vm_b.wav` (spectrogram digits, check in Audacity).
- [ ] **AST-07** Story screens: `bridge_photo.png`, door-open image sequence, cutscene backgrounds, icons (jack-o'-lantern, padlock, tick, fragment frame).

## 6. Tests (focused: enough to trust the game)

Backend: pytest. Frontend: Vitest. One Playwright playthrough per round. Run against `content.test.json`.

### 6.1 Backend (`tests/backend/`)

- [ ] **test\_content.py**: boots with a valid file; refuses to boot on missing env var, missing file, invalid JSON; validation catches wrong clue count, unknown object id, unknown `requires_all` id, dependency cycle, missing answer; public projection strips `answer`, `solution`, `feeds`, unused hints and unsolved `reveal`; `test_every_asset_file_exists`; every object lies inside the stage (`x + w <= 100`, `y + h <= 100`); two **clue** objects never overlap by more than 40 percent (a clue object sitting on a decor object is intended); every clue object's `clue_id` exists and every clue has exactly one object.
- [ ] **test\_auth.py**: login success sets cookie; `SESSION_ENDED` carries the right `reason`; case-insensitive team name; wrong password and unknown team give the same error; disabled team rejected; session limit blocks login; logout ends only the current session; logout-all needs valid credentials, ends every session, is idempotent, keeps progress; ended session returns `SESSION_ENDED`; login allowed before round start.
- [ ] **test\_answers.py**: normalisation (`upper`, `alnum`, `digits`); multi-field order matters; correct and wrong answers; `arrange` needs 10 distinct owned fragments in the right order; `choice_code` needs both parts right.
- [ ] **test\_submit.py**: correct awards points; wrong returns `WRONG` with no detail; stage progression and wrong stage number rejected; 3 s cooldown; clue lockout persists across requests (R2-09 after 5 wrong, R2-10 for 3 minutes); locked clue rejected; already solved returns original points; submit rejected before start and after end; bad input (field count, length, control characters); submission rows recorded; answers never in logs.
- [ ] **test\_concurrency.py**: 20 parallel correct submits score once; two teams are independent; parallel hint requests charge once; unlock engine creates no duplicates.
- [ ] **test\_scoring.py**: full speed bonus within par, linear decay, zero at double par; hint penalties (0, 1, 2); 3 free wrong then 0.5 each; never below `min_points`; rounding; time measured from `unlocked_at`.
- [ ] **test\_unlock.py**: round start opens `at_start` rooms and no-requirement clues; Study opens after Bedroom, Basement after Study; R1-09 after R1-05; R1-10 after R1-05/08/09; R2 chains (R2-03 after R2-02, R2-05 after R2-01, R2-06 after R2-05, R2-07 after R2-03 and R2-04, Vault after R2-07, R2-10 after R2-08 and R2-09).
- [ ] **test\_hints.py**: level order enforced; level 1 not ready before 300 s; repeat hint no extra cost; hint text absent from state before use.
- [ ] **test\_rounds.py**: start creates state for all eligible teams at once; Round 2 cannot start before qualify; nothing ends a round automatically.
- [ ] **test\_round\_end.py**:
  - End sets `ended` and ends all active sessions of that round's teams in one transaction; a forced failure in step 2 leaves the round `live` (rollback).
  - A team with 2 sessions has both ended with `ended_reason='round_ended'`; the next request on either returns `SESSION_ENDED` with `reason=round_ended`.
  - Round 1 End leaves Round 2-only sessions alone only if such sessions exist (none before qualify); Round 2 End does not touch teams that are not in Round 2.
  - `team_rounds`, `team_clues`, `submissions`, `hint_usage` and `finished_at` are identical before and after End (snapshot compare); leaderboard and qualification preview return the same result.
  - `admin_sessions` untouched: the organiser can still call admin endpoints after End.
  - End twice is a no-op with the same response shape; End on a pending round changes nothing.
  - After End, login works again; the team sees the lobby / standings / eliminated state, and submit returns `ROUND_CLOSED`.
  - Race: 50 parallel submits from different teams while End runs. Every response is either `CORRECT`/`WRONG`/etc. from before the End commit, or `SESSION_ENDED`/`ROUND_CLOSED` after it. No `submissions` row or `team_clues.solved_at` has a timestamp later than `rounds.ended_at`.
  - Same race for hint requests.
- [ ] **test\_leaderboard.py**: rank order (finished, clues, score, last solve, team id); wrong attempts don't move `last_solved_at`; hidden scores omitted for public; disabled team excluded.
- [ ] **test\_phase.py**: `/api/state` returns the right `phase` for a team in each of the seven situations, including after qualify is re-run with a different N.
- [ ] **test\_qualification.py**: preview returns exactly N teams in rank order and writes nothing; qualify creates Round 2 rows for exactly those N and no one else; N larger than the team count qualifies everyone, N below 1 or not an integer is `BAD_INPUT`; tie at the cutoff still gives exactly N (team-id tie-break); disabled teams are never chosen; unfinished teams can qualify when N is larger than the finishers; qualify twice with the same N changes nothing; re-running with a smaller or larger N replaces the set; rejected while Round 1 is live or after Round 2 started; Round 2 start only creates clues for qualified teams; non-qualified team gets `NOT_IN_ROUND` on state, clue, submit and asset calls; Round 1 scores, progress and rank are identical before and after qualify.
- [ ] **test\_admin.py**: admin routes need an admin session; start/end work; force logout revokes sessions with `ended_reason='forced'`; disable blocks login and ends sessions.
- [ ] **test\_no\_leaks.py**: no endpoint returns `answer`, and `/api/state` contains none.

### 6.2 Frontend (`frontend/src/__tests__/`)

- [ ] **SessionEnded**: a `SESSION_ENDED` response from poll or submit goes to `/login`, stops polling, shows the round-ended banner for `reason=round_ended`, and shows no wrong-answer message.
- [ ] **LoginPage**: sign in and logout forms; button disabled while pending; generic error; session limit shows the logout-everywhere button; logout success returns to sign in with the name kept.
- [ ] **RoomScene**: objects positioned from percentages; decor drawn under clue objects; decor not clickable; open, solved and locked hotspot states; gradient fallback; placeholder box with label when `obj_<id>` art is missing, art shown when present.
- [ ] **MapHub**: Round 1 and Round 2 maps render three room cards each with counts from state, padlock and hint when locked, COMPLETE badge, locked-room click shows the toast.
- [ ] **CluePanel**: renders prompt and fields from content; submit disabled while pending; wrong keeps input; `TOO_FAST` and `LOCKED` countdowns; stage correct moves on; review mode read-only; Copy works.
- [ ] **ArrangeBoard**: place, swap, reset, submit sends 10 ids in slot order.
- [ ] **HintDrawer**: rung 1 countdown; paid rung asks for confirmation; rung 3 locked until rung 2.
- [ ] **Leaderboard / Lobby / Cutscenes**: ranks in order, own team highlighted, scores hidden when flagged; lobby moves on when live; bridge only for qualified teams; sting inserts the team name.

### 6.3 End to end (`e2e/`)

- [ ] `e2e_full_round1_run`
- [ ] `e2e_full_round2_run` (includes admin qualify)
- [ ] `e2e_session_limit_then_logout_everywhere`
- [ ] `e2e_admin_start_and_end`
- [ ] `e2e_end_round_signs_teams_out_and_keeps_progress` (two browsers on one team are both sent to `/login` with the round-ended banner; scores and leaderboard unchanged after signing in again; organiser still signed in)
- [ ] `e2e_non_qualified_team_sees_eliminated_screen`

## 7. Order of work

Content loading and login, then state and unlock engine, then submit with the concurrency test, then room scene and clue panels, then admin and rounds, then cutscenes, then one full playthrough of each round by someone who did not build it.

**Done means:** all boxes ticked, tests green, both rounds played end to end.
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

Look, story, rooms, clue content and colours are unchanged. Only the amount of custom UI is cut.

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
- [ ] **FE-11** Audio: starts after the first click, one ambient loop per room with a crossfade, a global mute button.

### 3.2 Login (`/login`)

Look unchanged: near-black screen, "CURSE THE CODE" in pumpkin, "Hollow House opens at midnight", 420 px panel.

- [ ] **FE-20** SIGN IN (default) and LOGOUT switch. Sign in: team name, password, "ENTER THE HOUSE". Enter submits; button disabled while pending.
- [ ] **FE-21** Errors in red under the form: bad credentials, disabled team ("Contact the organisers").
- [ ] **FE-22** LOGOUT form: team name + password, button "LOG OUT THIS TEAM", note "Signs this team out everywhere. Your progress and timer are not affected." On success show "N session(s) ended. You can sign in now." and switch back to SIGN IN with the team name kept.
- [ ] **FE-23** On `SESSION_LIMIT` show "Your team is already signed in on N devices" and a button that switches to the LOGOUT form with the name prefilled.
- [ ] **FE-24** Already signed in: `/login` redirects to `/play` (or `/lobby`). Top bar has Sign out (single session) with a confirm dialog.

### 3.3 Lobby, top bar, map, room scene

- [ ] **FE-30** Lobby (`/lobby`): team name, round title, status line ("Waiting for the organisers to start Round 1" / "Round 2 starts soon"), candle icon, Scoring and Toolkit buttons. Moves to `/play` (after the round intro) when the round goes live.
- [ ] **FE-40** Top bar: round title, countdown `MM:SS` (amber under 10 min, red under 5; shows "00:00" at zero, nothing else happens), "5 of 10 clues", score (hidden with "?" when scores are hidden), mute, Toolkit, Leaderboard, Sign out.
- [ ] **FE-41** Round 1 only: fragment tray with 10 slots; collected fragments show their thumbnail.
- [ ] **FE-50** Map hub (`/play`): Round 1 cutaway of Hollow House (Bedroom, Study, Basement); Round 2 blueprint (Archive, Control Room, Vault). Room cards show thumbnail, title, "1 of 3 solved" from the server, padlock plus unlock hint when locked, "COMPLETE" badge when done, theme accent colours. Clicking a locked room shows its hint as a toast.
- [ ] **FE-60** One reusable `RoomScene` component driven by the content file (no per-room code): 16:9 stage, background image with gradient fallback, vignette and fog from the theme, objects positioned by the percentages in the content, decor non-interactive, clue objects are buttons (open / solved / locked states, label tooltip). Header: back arrow, room title, "Clues solved: 2 of 3".
- [ ] **FE-61** Room effects limited to four small shared components: `Flicker`, `Scanlines`, `Vignette`, `Pulse`. Ambient audio per room from the content file. Debug overlay (key toggle) draws object rectangles for aligning art.

Room looks are exactly as before (palettes and object positions live in the content file):
Lena's Bedroom (purple-blue, lamp flicker), Daniel's Study (green CRT), The Basement (red emergency light), The Records Archive (yellowed, fluorescent), The Control Room (blue monitors, static), The Containment Vault (steel and violet core).

### 3.4 Clue panel and clue screens

- [ ] **FE-80** Shared clue panel (modal, about 80 percent of the stage, accent border): left 60 percent is the clue's artifact, right 40 percent has title, `scene_text`, stage prompt, input fields, Submit, hint ladder and wrong-attempt count. Footer shows clue id and "Stage 1 of 3". Built from the clue's `kind`, all text read from the content.
- [ ] **FE-81** Solved clues reopen read-only (artifact, story text, reveal, no input).
- [ ] **FE-82** Any text a player might want to decode is selectable and has a **Copy** button.
- [ ] **FE-83** On a correct final stage: "CLUE SOLVED" overlay (points when visible), story text typed out, fragment slides into the tray, notices for anything newly unlocked.
- [ ] **FE-84** Submit behaviour: button disabled with a spinner while pending. `WRONG` shakes the panel and keeps the text. `TOO_FAST` shows "Wait 3s" on the button. `LOCKED` shows an overlay with a countdown that comes from the server. `ALREADY_SOLVED` closes the input. `STAGE_CORRECT` moves to the next stage. The browser only checks empty fields and length.
- [ ] **FE-85** Hint drawer: three rungs per stage ("Nudge (free)" with countdown, "Method (-1 point)", "Big help (-2 points)"), locked until the previous rung is used, confirm before a paid hint, revealed hints stay visible. Penalties are read from the content.

**Clue screens (all 20 clues and their puzzles are unchanged).** Each is a thin view over `payload` using shared pieces: text block, image, audio player, input fields.

Round 1, Bedroom
- [ ] **FE-100 R1-01 Diary** (`cipher_text`): aged-paper diary spread, three entries with a page-turn, cipher text on the last page, Copy.
- [ ] **FE-101 R1-02 Music Box** (`audio_morse`): Play button (and Normal / Slow); browser synthesises the melody from `morse` at `unit_ms` with Web Audio. No dots or dashes shown.
- [ ] **FE-102 R1-03 Torn Poster** (`image_inspect`): near-black poster with two controls only: **Invert** and a **Contrast** slider (CSS filters) plus Reset. No zoom or pan.

Round 1, Study
- [ ] **FE-103 R1-04 Tablet** (`binary_note`): lock screen with a passcode field, **Turn over** shows the sticky note with the 8-bit groups; after success a voice-memo player with the transcript.
- [ ] **FE-104 R1-06 Unsent Email** (`base64_email`): mail window styled green on black, encoded block, Copy.
- [ ] **FE-105 R1-07 Two Recordings** (`audio_compare`): two players (A and B) and a **Properties** dialog listing the metadata from the payload.

Round 1, Basement
- [ ] **FE-106 R1-05 Corrupted Log** (`hex_log`): terminal window with log lines and hex lines, selectable, Copy.
- [ ] **FE-107 R1-08 Server Access Log** (`log_filter`): the 20 log lines in a terminal and Copy. Players use the browser's own find or their own tools; no built-in search box.
- [ ] **FE-108 R1-09 Final Note** (`vigenere_note`): note image with the cipher text and margin line, Copy. Unlocks after R1-05.
- [ ] **FE-109 R1-10 Containment Terminal** (`final_terminal`, 3 stages, full-width panel). Stage 1: three keyword fields. Stage 2: **arrange board**, a 2 x 5 slot grid plus the ten collected fragments; click a fragment then a slot (drag is optional), clicking a filled slot swaps, Reset, Lock in. Stage 3: photograph, two option buttons from the content, a four-digit code field. Success starts the Round 1 finale.

Round 2, Archive
- [ ] **FE-110 R2-02 Redacted Report** (`redacted_pdf`): tabs Copy A and Copy B, black bars with selectable text underneath, footer `DOC-HASH`. Two fields.
- [ ] **FE-111 R2-03 Photograph, Revisited** (`microfilm_viewer`, 2 stages): stage 1 date field; stage 2 portrait with a **Properties** button showing the hex comment lines from the reveal. Unlocks after R2-02.
- [ ] **FE-112 R2-04 Epoch Timeline** (`epoch_timeline`): eight cards with event text and epoch number, laid out as a plain list or grid with Copy per card. Players sort and convert themselves. No drag layout.
- [ ] **FE-113 R2-07 Convergence Lock** (`keypad_lock`): two fields and UNLOCK; wrong shows "ACCESS DENIED". Unlocks after R2-03 and R2-04.

Round 2, Control Room
- [ ] **FE-114 R2-01 Personnel Index** (`table_filter`): a plain scrollable table of `rows` plus **Download CSV**. Players filter in Excel or code. No built-in filters, sort or export logic.
- [ ] **FE-115 R2-05 Transmission Archive** (`transmission_archive`): six items TX-1 to TX-6, each opens header and body, Copy. Unlocks after R2-01.
- [ ] **FE-116 R2-06 Spectrogram Voicemail** (`spectrogram_voicemail`): two players with **Download WAV**, four digit boxes. Unlocks after R2-05.

Round 2, Vault
- [ ] **FE-117 R2-08 Manual Diff** (`manual_diff`): two panes (plain, encrypted) with Copy, no diff.
- [ ] **FE-118 R2-09 Failsafe Circuit** (`logic_circuit`): the circuit from `circuit` drawn as a static SVG (inputs, gates, lamps) with the panel note. No toggle switches. Four-digit field. Five wrong tries lock the clue for 60 s (lockout from the content, shown as a countdown).
- [ ] **FE-119 R2-10 Final Containment** (`final_console`): three fields and INITIATE SHUTDOWN. A wrong entry shows a red lockout with a 3-minute countdown from the server. Success starts the Round 2 finale.

### 3.5 Toolkit, leaderboard, error messages

- [ ] **FE-150** Toolkit card: techniques and tool links from the content file.
- [ ] **FE-151** Leaderboard screen: rank, team, clues solved, score ("?" when hidden), own team highlighted, "FINISHED" status, refresh every 5 s.
- [ ] **FE-160** Error messages: `BAD_CREDENTIALS` "Team name or password is wrong." / `ACCOUNT_DISABLED` "This team is disabled. Contact the organisers." / `SESSION_LIMIT` "Your team is already signed in on other devices." / `SESSION_ENDED` (FE-06) / `ROUND_NOT_STARTED` "The round has not started yet." / `ROUND_CLOSED` "The round has ended." / `NOT_IN_ROUND` "Your team is not in this round." / `ROOM_LOCKED` and `CLUE_LOCKED` "This lead is not open yet." plus the hint / `WRONG` "Not quite. Check your evidence." / `TOO_FAST` "Wait a few seconds before trying again." / `LOCKED` "Locked. Check your evidence." / `HINT_NOT_READY` "This hint opens in mm:ss."

### 3.6 Story screens (text, order and effects unchanged)

- [ ] **FE-170** Round intro: black screen, `intro` typed in VT323, **BEGIN** button.
- [ ] **FE-171** Round 1 finale: audio cut, victory lines one by one (last line glitches), leaderboard, then for qualified teams only the completed photograph and `bridge_text` with **CONTINUE**. Not qualified: `eliminated_text`, "Thank you for playing" and a link to the standings (`/eliminated`).
- [ ] **FE-172** Round 2 intro, then the map.
- [ ] **FE-173** Round 2 finale: `victory_lines`, `bridge_text` as the researcher's recording (typed text), final leaderboard with winners highlighted, then the sting (`sting_template` with the team name, glitching, fade to black, final thank-you screen).
- [ ] **FE-174** All cutscenes skip with Esc after the first viewing, except the sting.
- [ ] **FE-175** One simple glitch component (300 ms RGB split) reused for transitions and the sting.
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
- [ ] **AST-02** Object art for every clue and decor object in the rooms.
- [ ] **AST-03** Ambient loops and effects per room, UI sounds (hover, open, correct, wrong, unlock, fragment, sting).
- [ ] **AST-04** Round 1 puzzle files: `diary_open.png`, `music_box.mp3` (optional), `poster_dark.png`, `voice_memo.mp3`, `rec_a.wav`, `rec_b.wav` (metadata embedded), `final_note.png`, `photo_full.png`.
- [ ] **AST-05** `frag_01.png` to `frag_10.png` cut from `photo_full.png` (2 x 5, torn edges) matching each fragment's `correct_slot`. Verify by assembling.
- [ ] **AST-06** Round 2 puzzle files: `paper_scan.png`, `portrait_round1.png` (comment metadata embedded), `vm_a.wav`, `vm_b.wav` (spectrogram digits, check in Audacity).
- [ ] **AST-07** Story screens: `bridge_photo.png`, door-open image sequence, cutscene backgrounds, icons (jack-o'-lantern, padlock, tick, fragment frame).

## 6. Tests (focused: enough to trust the game)

Backend: pytest. Frontend: Vitest. One Playwright playthrough per round. Run against `content.test.json`.

### 6.1 Backend (`tests/backend/`)

- [ ] **test\_content.py**: boots with a valid file; refuses to boot on missing env var, missing file, invalid JSON; validation catches wrong clue count, unknown object id, unknown `requires_all` id, dependency cycle, missing answer; public projection strips `answer`, `solution`, `feeds`, unused hints and unsolved `reveal`; `test_every_asset_file_exists`.
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
- [ ] **RoomScene**: objects positioned from percentages; decor not clickable; open, solved and locked hotspot states; gradient fallback.
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
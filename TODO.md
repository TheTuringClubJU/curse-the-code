# Curse the Code: Build TODO

Every task has an ID so work can be split by person later. Tags: **BE** backend, **FE** frontend, **ADM** admin panel, **AST** assets, **QA** tests. Tick the box when a task is done and reviewed.

**Rule for every module:** the server decides everything (answers, timing, unlocks, scores, ranks). The browser only displays and sends requests. Nothing secret is ever sent to the browser.

## 1. Content file (the only source of game content)

The whole game (rooms, clues, questions, hints, answers, story text, scoring rules, fragments, toolkit card) lives in one JSON file. The server never reads clue content from anywhere else. The file to use is named in one environment variable, `CONTENT_FILE`. Changing that variable and restarting is all it takes to switch content. All content files share one format, so the same code runs with any of them.

### 1.1 Content file format (what every file contains)

| Key | What it holds |
| --- | --- |
| `meta` | pack\_label, event\_name, answer\_salt, assets\_dir (asset folder name), rules (cooldown 3 s, free hint after 300 s, max sessions per team 2, max field length 200, hide scores in the last 10 min) |
| `rounds[]` | round number, title, subtitle, difficulty, default\_duration\_min, final\_clue, screens (intro, victory\_lines, bridge\_text, eliminated\_text, sting\_template) |
| `rooms[]` | id, round, order, title, unlock rule, background\_file, theme (colours), ambient audio, objects\[\] (id, label, kind, x, y, w, h in percent of the scene, clue\_id or null) |
| `clues[]` | id, round, room, seq, order\_in\_room, kind, object\_id, title, scene\_text, unlock.requires\_all, payload (what the player sees), assets\[\], stages\[\], hints\[\], scoring, lockout, reward, feeds, solution.method, tools, final |
| `stages[]` (inside a clue) | index, type (fields, arrange, choice\_code), prompt, fields\[\] (key, label, kind, normalize, placeholder, max\_len), expected\_fields, answer\_hash, answer\_plain (null in secret files), reveal |
| `fragments[]` | id F01 to F10, awarded\_by, correct\_slot, file, caption |
| `toolkit[]` | technique and free tool links shown on the toolkit card |

Solving rule: normalise each field (`upper`, `alnum`, `digits`), join fields with `|`, then HMAC-SHA256 with `meta.answer_salt` over `clue_id:stage:joined_value`, compared in constant time with `answer_hash`.

### 1.2 Tasks

- [ ] **BE-01** Read `CONTENT_FILE` at startup. Refuse to boot if it is unset, missing, unreadable or not valid JSON. Log the file name, `meta.pack_label` and the first 8 characters of its SHA-256. Never log answers or hashes.
- [ ] **BE-02** Load rules, rounds, rooms, clues, fragments and toolkit only from that file. The asset folder comes from `meta.assets_dir`. No other setting may change game content.
- [ ] **BE-03** Validate on boot against `content_schema.json`: exactly 10 clues per round; every clue has at least one stage; every stage has 3 hint levels; every `object_id` exists in its room; every `clue_id` on an object exists; every `requires_all` id exists; no dependency cycles; every fragment is awarded by an existing clue; every `answer_hash` is 64 hex characters; every room unlock rule references real rooms or clues. Boot fails with a readable list of problems.
- [ ] **BE-04** Build and cache derived data at boot: clue by id, clues by room, clue count per room, dependency graph, topological order check, final clue per round.
- [ ] **BE-05** Public projection function: removes `answer_hash`, `answer_plain`, `solution`, `feeds`, unused `hints`, and every `reveal` until its stage is solved. Everything sent to a browser goes through this function.
- [ ] **BE-06** Admin-triggered content reload, allowed only while no round is live.
- [ ] **BE-07** Record the content fingerprint when a round starts. If the file changes while a round is live, block submissions and show a loud admin warning until an admin confirms.
- [ ] **BE-08** Asset endpoint serves files from the folder named in `meta.assets_dir`. A team may fetch an asset only if it has unlocked the owning room and clue. Block path traversal, set the correct content type, support HTTP Range for audio, and send `Cache-Control: private`.

## 2. Backend

### 2.1 Team login and sessions (BE-10 to BE-19)

- [ ] **BE-10** `POST /api/auth/login` with `team_name` and `password`. Team name is case-insensitive. Passwords are hashed with argon2 or bcrypt. A wrong name or password returns one generic message. Success sets an HTTP-only session cookie and returns the team summary.
- [ ] **BE-11** Limit active sessions per team to `meta.rules.max_sessions_per_team`. If the team is already at the limit, login is refused with `SESSION_LIMIT`, returning the number of active sessions and their device labels, so the frontend can offer the Logout option.
- [ ] **BE-12** `POST /api/auth/logout` (signed in): ends the current session only.
- [ ] **BE-13** `POST /api/auth/logout-all` (not signed in): body `team_name` and `password`. After verifying them, ends every active session of that team and returns how many were ended. It never changes progress, scores or timers. It is idempotent (zero sessions is a success), uses the same generic errors and the same rate limits as login.
- [ ] **BE-14** `GET /api/auth/me` returns the team, the session and the number of active sessions.
- [ ] **BE-15** Sessions last 12 hours with sliding expiry. Tokens are stored hashed. A revoked or expired token returns `SESSION_ENDED` and the frontend returns to login with a message.
- [ ] **BE-16** Disabled or disqualified teams cannot log in and see a clear message with the organiser contact.
- [ ] **BE-17** Teams can log in before a round starts and wait in the lobby.
- [ ] **BE-18** Brute-force protection: 8 failed attempts lock that team name for 5 minutes, and 20 failures per IP per 10 minutes lock the IP. Responses still look the same.
- [ ] **BE-19** Every login, logout, forced logout and refused login is recorded in the event log.

### 2.2 Game state (BE-20 to BE-26)

- [ ] **BE-20** `GET /api/state` returns in one call: server time, round status and `ends_at`, seconds remaining, the team's round summary (score hidden when `hide_scores` is on), every room of the current round with `locked`, `unlock_hint`, `total_clues`, `solved_clues`, and its objects with their state (locked, open, solved), the unlocked clues in public form, `current_stage` per clue, hint availability per stage, lockout end times, collected fragments, active announcements and qualification status.
- [ ] **BE-21** Room clue counts come from the content file and recorded progress. They are never hardcoded.
- [ ] **BE-22** Support `ETag` and `If-None-Match` on `/api/state` so 5-second polling is cheap.
- [ ] **BE-23** `GET /api/time` returns server time in milliseconds for clock-offset correction.
- [ ] **BE-24** `GET /api/clues/{id}` returns the clue only if unlocked. After a stage is solved it also returns that stage's `reveal` and the clue's story text.
- [ ] **BE-25** Locked rooms or clues return 403 with a reason code (`ROOM_LOCKED`, `CLUE_LOCKED`) and a short, spoiler-free hint such as "needs a date".
- [ ] **BE-26** Teams not in the current round receive `NOT_IN_ROUND` and the frontend shows the eliminated screen.

### 2.3 Unlock engine (BE-30 to BE-35)

- [ ] **BE-30** Room rules: `at_start`, `rooms_complete: [ids]`, `clue_solved: id`.
- [ ] **BE-31** Clue rule: `requires_all` ids must be solved, and the clue's room must be open.
- [ ] **BE-32** When a round starts: create round state for every eligible team, open the `at_start` rooms, unlock clues with no requirements, and set `unlocked_at` to the round start time.
- [ ] **BE-33** After each fully solved clue: re-evaluate rooms and clues; set `unlocked_at` to the server solve time; mark a room complete when all its clues are solved.
- [ ] **BE-34** The engine is idempotent. Running it twice never creates duplicates.
- [ ] **BE-35** Round 2 state is created only for qualified teams.

### 2.4 Submit (BE-40 to BE-55)

`POST /api/clues/{id}/submit` with `request_id` (UUID), `stage`, `fields[]`.

- [ ] **BE-40** Serialise all work for one team: two simultaneous requests from the same team run one after the other, never together. Other teams are not slowed.
- [ ] **BE-41** Idempotency: if `request_id` was already processed for this team, return the stored response unchanged, with no second scoring.
- [ ] **BE-42** Reject unless the round is `live` (`ROUND_CLOSED`, `ROUND_PAUSED`, `ROUND_NOT_STARTED`). A request that reached the server before `ends_at` is honoured.
- [ ] **BE-43** Reject locked clues (`CLUE_LOCKED`) and already solved clues (`ALREADY_SOLVED`, no penalty).
- [ ] **BE-44** Enforce the 3-second cooldown after a wrong answer on a clue (`TOO_FAST` with `retry_after_sec`) and the clue's own lockout (`LOCKED` with `retry_after_sec`).
- [ ] **BE-45** Validate input: `stage` equals the clue's current stage; field count equals `expected_fields`; every field is a string at most `max_len` long; no control characters.
- [ ] **BE-46** Normalise each field by its `normalize` setting, join with `|`, hash, compare in constant time.
- [ ] **BE-47** For `arrange` stages: exactly 10 distinct fragment ids, all owned by the team.
- [ ] **BE-48** Wrong answer: increment wrong attempts, set `last_wrong_at`, apply a lockout if the clue defines one, respond `WRONG` with generic text. Never say which field was wrong.
- [ ] **BE-49** Correct non-final stage: advance the stage, respond `STAGE_CORRECT` with that stage's reveal.
- [ ] **BE-50** Correct final stage: compute points, mark solved, award the fragment, update totals, run the unlock engine, set `finished_at` if it was the round's final clue, respond `CORRECT` with points and newly unlocked rooms and clues.
- [ ] **BE-51** Store every submission with raw input, result, points, response and server timestamp.
- [ ] **BE-52** Use the server clock at the moment of processing, not the time the request arrived in the queue.
- [ ] **BE-53** Per-team cap of 30 submissions per minute across all clues (`RATE_LIMITED`).
- [ ] **BE-54** Late duplicate after a clue is solved returns `ALREADY_SOLVED` with the original points.
- [ ] **BE-55** The final clue of a round never leaks whether individual fields were right.

### 2.5 Scoring (BE-60 to BE-64)

- [ ] **BE-60** Per clue: `base` (6) plus `speed` (0 to 4) minus hint penalties minus wrong-attempt penalties, never below `min_points` (2), rounded to 2 decimals.
- [ ] **BE-61** Speed: full `speed_max` up to `par_sec`; then falls in a straight line to 0 at double `par_sec`. Elapsed time runs from the clue's `unlocked_at` to the server solve time.
- [ ] **BE-62** Hint penalties: level 1 costs 0, level 2 costs 1, level 3 costs 2.
- [ ] **BE-63** Wrong attempts: the first 3 are free, then 0.5 each.
- [ ] **BE-64** Round total equals the sum of clue scores plus admin adjustments. Provide a recompute function that can rebuild totals from clue scores.

### 2.6 Hints (BE-70 to BE-74)

- [ ] **BE-70** `POST /api/clues/{id}/hint` with `request_id`, `stage`, `level`. Levels must be taken in order (1, then 2, then 3).
- [ ] **BE-71** Level 1 is free and becomes available `free_after_sec` (300) after the stage became available. Before that it returns `HINT_NOT_READY` with seconds left.
- [ ] **BE-72** Levels 2 and 3 are available once the previous level was taken. Asking for a hint already taken returns the same text at no extra cost.
- [ ] **BE-73** Hints are idempotent by `request_id`. Hint text is only ever sent after use.
- [ ] **BE-74** `/api/state` reports per stage: hints used, next level, and seconds until level 1.

### 2.7 Round control (BE-80 to BE-86)

- [ ] **BE-80** Admin start sets `starts_at`, `ends_at = start + duration` (default from the content file, overridable) and runs the unlock engine for all eligible teams at the same instant.
- [ ] **BE-81** Pause records the pause moment and rejects submissions. Resume moves `ends_at` forward by the paused time.
- [ ] **BE-82** End closes the round immediately.
- [ ] **BE-83** Extend adds minutes to `ends_at`.
- [ ] **BE-84** Round 2 cannot start until qualification has run.
- [ ] **BE-85** Toggle `hide_scores`; also switch on automatically for the final `leaderboard_hide_last_min` minutes.
- [ ] **BE-86** A scheduler marks a round `ended` when `ends_at` passes, so state stays correct even if no request arrives.

### 2.8 Leaderboard and qualification (BE-90 to BE-96)

- [ ] **BE-90** Rank by clues solved (more first), then score (higher first), then last solved time (earlier first), then team id. Teams that finished the round always rank above those that did not.
- [ ] **BE-91** Only correct solves move `last_solved_at`.
- [ ] **BE-92** Public leaderboard shows names and ranks, and scores unless hidden. The admin leaderboard always shows exact scores and times to the millisecond.
- [ ] **BE-93** Cache the leaderboard for 3 seconds. Include the requesting team's own rank.
- [ ] **BE-94** Preview qualification: `GET /admin/rounds/1/qualify/preview?top=N` lists the teams that would go through.
- [ ] **BE-95** Qualify: select the top N teams by leaderboard ranking (clues solved, then highest score, then earliest solve time) regardless of whether all 10 clues were completed. Running it twice changes nothing.
- [ ] **BE-96** Disqualified teams are excluded from ranking and qualification.

### 2.9 Announcements, errors and safety (BE-100 to BE-110)

- [ ] **BE-100** Announcements: create, list active, expire. They appear in `/api/state`.
- [ ] **BE-101** One error format everywhere: `{ "code": "...", "message": "...", "retry_after_sec": n }`.
- [ ] **BE-102** Error codes: `BAD_INPUT`, `UNAUTHENTICATED`, `SESSION_ENDED`, `SESSION_LIMIT`, `BAD_CREDENTIALS`, `ACCOUNT_DISABLED`, `RATE_LIMITED`, `ROUND_NOT_STARTED`, `ROUND_PAUSED`, `ROUND_CLOSED`, `NOT_IN_ROUND`, `ROOM_LOCKED`, `CLUE_LOCKED`, `ALREADY_SOLVED`, `WRONG`, `TOO_FAST`, `LOCKED`, `HINT_NOT_READY`, `CONTENT_MISMATCH`, `SERVER_BUSY`.
- [ ] **BE-103** Never log submitted answers or hashes to the console. Attach a request id to every response and log line.
- [ ] **BE-104** Security headers, CORS limited to the event site, request body size limit, and parameterised queries only.
- [ ] **BE-105** `GET /health` returns status and content label only (no counts or secrets).
- [ ] **BE-106** Graceful handling of a temporary storage outage: one automatic retry, then `SERVER_BUSY`, never a half-applied submission.

## 3. Frontend (React)

### 3.1 App shell and shared behaviour

- [ ] **FE-01** Routes: `/login`, `/lobby`, `/play` (map), `/play/room/:roomId`, `/play/room/:roomId/clue/:clueId`, `/leaderboard`, `/finale/:round`, `/eliminated`. Unknown routes go to `/play` when signed in, otherwise `/login`.
- [ ] **FE-02** API client: one function for every call, adds a fresh `request_id` per user action, 10-second timeout, up to 2 automatic retries that reuse the same `request_id`, and maps every server error code to a message (table in FE-160).
- [ ] **FE-03** State polling: call `/api/state` every 5 seconds with the `ETag`; pause polling while the tab is hidden and refresh immediately when it becomes visible again.
- [ ] **FE-04** Clock: on load, call `/api/time` three times, take the median offset, and drive every countdown from server time plus offset, never the device clock.
- [ ] **FE-05** Global toast system (top-right, auto-dismiss 4 s, errors stay 6 s, max 3 stacked).
- [ ] **FE-06** Global handling of `SESSION_ENDED`: clear local state and go to `/login` with the banner "You were signed out. Sign in again; your progress is safe."
- [ ] **FE-07** Fonts: headings in "Special Elite", terminal text in "VT323", body in "IBM Plex Mono", all with real fallback stacks. Base colours: background `#07060b`, panel `#0e0c14`, border `#3a2a55`, text `#e9e4f5`, event accent pumpkin `#ff7a1a`.
- [ ] **FE-08** Never keep answers, hashes or unrevealed hints in the browser. Never put tokens in local storage (session is an HTTP-only cookie).
- [ ] **FE-09** Desktop-first (1280 x 720 target). Works down to 1024 wide. Below 900 wide show a notice: "Use a laptop or tablet for the best experience" but still allow play.
- [ ] **FE-10** Accessibility: every hotspot is a button with a text label, full keyboard navigation (Tab, Enter, Esc), visible focus ring in the room's accent colour, `prefers-reduced-motion` turns off flicker and glitch effects.
- [ ] **FE-11** Audio manager: starts after the first user click, one ambient loop per room with a 1-second crossfade, a global mute button that remembers its state for the session.
- [ ] **FE-12** Glitch effect component (used for transitions): 300 ms RGB split plus horizontal slice jitter, triggered from code.

### 3.2 Event login page (`/login`)

**Look:** full-screen near-black `#07060b` with a slow drifting dust-mote layer and faint CRT scanlines. Top centre: the title "CURSE THE CODE" in Special Elite, 56 px, pumpkin `#ff7a1a`, with a slow flicker once every 6 to 9 seconds. Under it, a smaller line: "Hollow House opens at midnight" in `#8f7bff`. Centre: a 420 px wide panel `#0e0c14` with a 1 px border `#3a2a55` and a soft purple glow. Bottom: a small line with the event and club name. A flickering jack-o'-lantern line-art icon sits to the left of the panel on wide screens.

**Panel layout:** a two-option switch at the top: **SIGN IN** (default) and **LOGOUT**. Below it, the form for the selected option.

- [ ] **FE-20** SIGN IN form: fields "Team name" and "Password" (show/hide eye button), primary button "ENTER THE HOUSE". Enter key submits. The button shows a spinner and is disabled while the request runs. Autofocus on team name.
- [ ] **FE-21** Errors appear under the form in red `#ff5a5a`: bad credentials ("Team name or password is wrong"), locked ("Too many attempts. Try again in 4:32" with a live countdown), disabled team ("This team is disabled. Contact the organisers.").
- [ ] **FE-22** LOGOUT form (reached by the switch, or by the button in the session-limit message): fields "Team name" and "Password", button "LOG OUT THIS TEAM", and a one-line explanation: "Signs this team out everywhere. Your progress and timer are not affected."
- [ ] **FE-23** After a logout request succeeds, show a green confirmation "N session(s) ended. You can sign in now.", clear the password, and switch back to SIGN IN with the team name kept.
- [ ] **FE-24** Session-limit case: when sign-in returns `SESSION_LIMIT`, show "Your team is already signed in on N devices" with the device labels and a button "Log out this team everywhere", which switches to the LOGOUT form with the team name prefilled.
- [ ] **FE-25** If the team is already signed in on this device, `/login` redirects to `/play` (or `/lobby` when no round is live).
- [ ] **FE-26** A signed-in user sees a "Sign out" button in the top bar (calls the single-session logout) and a confirmation dialog: "Sign out? Your progress is saved and the timer keeps running."
- [ ] **FE-27** The login page never reveals whether a team name exists.

### 3.3 Lobby (`/lobby`)

- [ ] **FE-30** Shown when no round is live for the team. Centre card: team name, the round title and a status line ("Waiting for the organisers to start Round 1" / "Round 2 starts soon" / "Round paused"). A pulsing candle icon and low ambient audio.
- [ ] **FE-32** Buttons: "How scoring works" (modal with the rules: 10 points per clue, 6 base plus up to 4 speed, hint and wrong-answer penalties), "Toolkit" (opens the toolkit card), "Sign out".
- [ ] **FE-33** When the state says the round went live, play the round intro (FE-90) and move to `/play` automatically.

### 3.4 Top bar (all game screens)

- [ ] **FE-40** Left: round title. Centre: countdown `MM:SS`, turns amber under 10 minutes and pulses red under 5. Right: overall progress "5 of 10 clues", score (hidden with "?" when scores are hidden), a mute button, a Toolkit button, a Leaderboard button, Sign out.
- [ ] **FE-41** Round 1 only: a fragment tray under the bar with 10 slots (F01 to F10). Empty slots are dark outlines; collected fragments show their thumbnail with a small slide-in animation when awarded.
- [ ] **FE-42** Announcement banner slot above the bar.

### 3.5 Map hub (`/play`)

- [ ] **FE-50** Round 1 map: a dark cutaway of Hollow House with three rooms stacked (Bedroom top, Study middle, Basement bottom), connected by a staircase line. Round 2 map: an underground blueprint (blue-black `#0a1220` with cyan `#4ab3ff` line work) with the Records Archive and Control Room side by side and the Containment Vault below them behind a bulkhead.
- [ ] **FE-51** Each room is a card with: thumbnail (the room's `background_file`), title, and the clue count read from the server ("Lena's Bedroom, 1 of 3 solved"). Locked rooms show a padlock, the total ("The Basement, 4 clues, locked") and a short unlock hint from the server. Finished rooms show a green "COMPLETE" badge.
- [ ] **FE-52** Card border and glow use the room's `theme.accent` and `theme.glow`. Hover lifts the card 4 px and brightens the glow. Clicking a locked room shakes it and shows a toast with the unlock hint.
- [ ] **FE-53** Round header strip under the top bar: "5 of 10 clues solved" with a segmented progress bar (10 segments).
- [ ] **FE-54** When a room unlocks, play a 1-second unlock animation on its card (padlock cracks open) and a toast "The Study is open."

### 3.6 Room scene renderer (`/play/room/:roomId`)

- [ ] **FE-60** Draw the room as a 16:9 stage, letterboxed to fit. Background: the room's `background_file`, with a gradient fallback from `theme.bg_top` to `theme.bg_bottom` if the image is missing. Add a vignette (`theme.vignette`) and a fog layer (`theme.fog`).
- [ ] **FE-61** Objects are absolutely positioned using the percentages in the content file (`x`, `y`, `w`, `h` of the stage). Decor objects are not interactive. Clue objects are buttons.
- [ ] **FE-62** Hotspot states: **open** (faint outline in the accent colour at 25 percent, brightens on hover with the object's label tooltip), **solved** (dimmed with a small tick), **locked** (padlock icon, tooltip with the unlock hint).
- [ ] **FE-63** Room header: back arrow to the map, room title, and "Clues solved: 2 of 3" (the count comes from the server). A "COMPLETE" badge replaces it when all clues are solved.
- [ ] **FE-64** Entering a room crossfades the ambient audio and plays the room's sound effects at random intervals (every 20 to 60 seconds).
- [ ] **FE-65** Clicking a clue hotspot opens the Clue Panel (3.8) over the stage. Esc or the close button returns to the stage.
- [ ] **FE-66** Pressing Tab cycles through open hotspots in `seq` order.

### 3.7 Room looks (visual spec)

Colours below are the theme values in the content file. Object positions are percentages of the stage and also come from the content file.

| Room | Mood and palette | Lighting and effects | Objects (what is drawn, where) | Ambient audio |
| --- | --- | --- | --- | --- |
| **Lena's Bedroom** (Round 1) | Dim purple-blue. Gradient `#140d26` to `#2b1d52`, accent `#8f7bff`, glow `#cdbfff`, text `#e8e0ff`. | Warm lamp `#ffcf8a` flickers every 2.5 to 7 s. Moonlight from the window as a pale blue shaft. Light fog. | Moonlit window (left, 6/10). Wall poster on the back wall (50/12), nearly black. Unmade bed with a quilt (centre), open diary on the bed (34/56). Nightstand (left) with the music box on top (14/50). Desk lamp (right, 74/36). Half-packed suitcase on the floor (60/66). Wall clock top right (80/14). | Faint music-box loop, ticking clock, occasional floorboard creak. |
| **Daniel's Study** (Round 1) | Green-black CRT. Gradient `#04120b` to `#0b2418`, accent `#3dff8b`, glow `#7dffb0`, text `#b6ffd1`. | Screen glow bleeds onto the desk, scanline overlay at 6 percent, random 150 ms screen glitch every 10 to 20 s. | Sticky-note wall (left, 5/12) with dozens of yellow notes. Corkboard with red string (right, 62/12). Heavy desk (centre). Old CRT monitor on the desk (40/36). Reel recorder (62/52). Locked desk drawer under the desk edge (28/66). Tangled cables on the floor (8/70). | Low CRT hum, distant whisper every 30 to 60 s. |
| **The Basement** (Round 1) | Concrete and red emergency light. Gradient `#14161a` to `#1f1115`, accent `#ff4d4d`, glow `#ff8a8a`, text `#ffd6d6`. | Red lamp `#ff2a2a` pulses slowly and flickers hard now and then. Heavy vignette, steam wisps. | Countdown monitor high on the wall (38/8) showing the live round countdown. Tall server rack at left (6/20). A note taped inside the rack's open door (12/38). Maintenance terminal (30/44). Access console (44/44). Containment console on the right wall (72/34). Circular floor seal in the foreground (36/70) with faint runes. | Server hum, pipe drips, deep heartbeat-like pulse that speeds up under 5 minutes. |
| **The Records Archive** (Round 2) | Yellowed archive. Gradient `#1e1b14` to `#2d2818`, accent `#e7c97a`, glow `#fff2c0`, text `#f3ead0`. | Flickering fluorescent tube (cold white `#dfe9ff`), floating dust motes. | Rows of tall filing cabinets (left, 4/18). Yellowed incident folder on a desk (38/56). Microfilm reader (52/40). Whiteboard of event cards on the back wall (70/14). Sealed bulkhead door at the right end (74/52) with a keypad. Ceiling light (44/4). | Fluorescent buzz, paper shuffle, distant dripping. |
| **The Control Room** (Round 2) | Blue-black monitors. Gradient `#0a1220` to `#101c33`, accent `#4ab3ff`, glow `#9fd6ff`, text `#d6ecff`. | Monitor wall flickers with static, scanline overlay, occasional full-screen static burst (200 ms). | Bank of old monitors (top left, 6/10). Staff terminal (12/52). Transmission receiver with dials and a cassette slot (34/48). Sound console with faders and a small screen (56/54). Dead intercom on the right wall (82/24). | Static bursts, relay clicks, a faint radio voice that cuts out. |
| **The Containment Vault** (Round 2) | Steel and violet core. Gradient `#120d17` to `#1b0f2b`, accent `#38f0ff`, glow `#a99bff`, text `#e6ddff`. | The core behind glass pulses violet `#7a5cff` about once per second; glow brightens as the countdown falls. | Glowing core behind thick glass (centre, 36/14). Countdown timer above it (40/4). Manual terminal on the left (8/46). Failsafe panel on the right (76/42). Central console in the foreground (38/62). Ring of locked panels around the core. | Low core pulse, steel creaks. |

- [ ] **FE-70** Build one reusable `RoomScene` component driven by the room's content (background, theme, objects, ambient). The six rooms must not have separate code paths.
- [ ] **FE-71** Effects as small components: `Flicker` (target object, interval range), `Scanlines`, `Vignette`, `DustMotes`, `Fog`, `Pulse`, `StaticBurst`. Each respects reduced-motion.
- [ ] **FE-72** A debug overlay (toggled with a key) draws every object's rectangle and id, to align art with hotspots quickly.

### 3.8 Clue panel (shared layout and behaviour)

- [ ] **FE-80** The clue panel is a modal over the stage, about 80 percent of the width and height, bordered in the room's accent colour. Left 60 percent: the **artifact viewer** specific to the clue. Right 40 percent: clue title, `scene_text`, the stage prompt, the input fields, the Submit button, the hint ladder, and a line showing wrong attempts so far. Footer: clue id and "Stage 1 of 3" for multi-stage clues.
- [ ] **FE-81** The panel is built from the clue's `kind`. One component per kind (listed below). The panel reads fields, labels and prompts from the content, so no clue text is hardcoded.
- [ ] **FE-82** Solved clues reopen in a read-only review mode that shows the artifact, the story text and the reveal, but no input.
- [ ] **FE-83** Every artifact that contains text a player may want to decode offers a **Copy** button, and the text itself is selectable. Never render puzzle text only as an image unless the clue requires it (poster, photo, spectrogram).
- [ ] **FE-84** On a correct final stage show a success overlay: "CLUE SOLVED" (plus the points when scores are visible), the story text typed out at 30 characters per second, the fragment sliding into the tray (Round 1), and notices for anything newly unlocked.
- [ ] **FE-85** Hotspot to panel animation: 200 ms zoom from the object's position.

### 3.9 Clue screens, all 20 (what each looks like and how it works)

Each entry lists the object the player clicks, what the panel shows, what the player does, and what appears on success. Data in square brackets comes from the clue's `payload`.

#### Round 1, Lena's Bedroom (3 clues)

- [ ] **FE-100 R1-01 Lena's Diary** (`cipher_text`). Click the open diary on the bed. Panel shows a two-page diary spread on aged paper `#e9dcc0` with a handwriting font. Left page: the first dated entry; right page: the second. A page-turn arrow reveals the last entry: \[last\_entry.cipher\_text\] in smudged ink, grouped in the original word spacing. Copy button on the last page. One text field. Success: the diary cover opens and Fragment 1 slides out.
- [ ] **FE-101 R1-02 Music Box** (`audio_morse`). Click the music box on the nightstand. Panel shows the open box with a spinning ballerina and a **Play** button, a waveform, and a speed switch (Normal, Slow). The browser synthesises the melody from \[morse\] at \[unit\_ms\] per unit: short note equals one unit, long note three units, a longer gap between digits. No dots or dashes are shown on screen. One numeric field. Success: a false bottom clicks open and Fragment 2 appears.
- [ ] **FE-102 R1-03 Torn Poster** (`image_inspect`). Click the dark poster. Panel shows \[image\_file\] nearly black, with an **Inspector** toolbar: Invert toggle, Contrast slider (100 to 400 percent), Brightness slider, Reset, and mouse-wheel zoom with drag to pan. Filters run in the browser on the image only. One field with the format hint in the prompt. Success: the poster corner peels away and Fragment 3 is revealed.

#### Round 1, Daniel's Study (3 clues)

- [ ] **FE-103 R1-04 Lena's Tablet** (`binary_note`). Click the desk drawer; it slides open to show a cracked tablet. Panel shows the tablet lock screen with a keyboard-style passcode box. A **Turn over** button flips the tablet to show a yellow sticky note with \[sticky\_note\] groups of eight bits on separate lines. After the correct passcode the tablet unlocks and a voice-memo app opens with a play button and the transcript from the stage reveal. Success also gives Fragment 4.
- [ ] **FE-104 R1-06 The Unsent Email** (`base64_email`). Click the old CRT monitor. Panel shows a mail window in green on black: Drafts folder, From and To lines, Subject, the intro line, and below it \[encoded\_block\] in a monospace block that wraps. Copy button. One text field. Success: the draft gains a paperclip and Fragment 6 opens as an attachment.
- [ ] **FE-105 R1-07 Two Recordings** (`audio_compare`). Click the reel recorder. Panel shows two reels labelled Recording A and Recording B, each with Play, a scrub bar and a waveform, and a **Properties** button. Properties opens a small dialog listing \[properties\]: date recorded, duration, software. A field asks for the spoken word. Success: the forged reel cracks and Fragment 7 slides out of its cover art.

#### Round 1, The Basement (4 clues)

- [ ] **FE-106 R1-05 Corrupted Log** (`hex_log`). Click the maintenance terminal. Panel shows a green terminal window titled \[filename\]. It prints \[log\_lines\] with timestamps, then a block of hex lines \[hex\_lines\] with an offset column. Selectable, with a Copy button. One text field. Success: the printer clicks and Fragment 5 prints out.
- [ ] **FE-107 R1-08 Server Access Log** (`log_filter`). Click the access console. Panel shows the 20 log lines in a terminal, a **Search** box (case-insensitive, highlights matches, shows "3 matches"), and Copy. One text field. Success: the rack monitor flashes and Fragment 8 appears.
- [ ] **FE-108 R1-09 The Family's Final Note** (`vigenere_note`). Click the note taped inside the rack door. Panel shows \[image\_file\] aged paper with the cipher text laid over it in handwriting, and a smudged margin line \[margin\_note\] at the bottom. Copy button for the cipher text. One text field. Success: the note falls open and Fragment 9 drops from the hinge. This clue unlocks only after R1-05 is solved.
- [ ] **FE-109 R1-10 Containment Terminal** (`final_terminal`, 3 stages). Click the containment console. The panel is full width.
  - **Stage 1:** a keyword screen with three labelled fields (diary keyword, crashed process, source ID). Success drops Fragment 10 into the tray.
  - **Stage 2:** the **Arrange board**. Top: a 2 by 5 grid of slots numbered faintly 1 to 10. Bottom: the tray with the ten collected fragments as thumbnails with their captions on hover. Drag a fragment into a slot, or click a fragment and then a slot (keyboard and touch friendly). Dropping on a filled slot swaps. A **Reset** button clears the grid and a **Lock in** button submits. On success the pieces snap together with a glowing seam and the full photograph appears.
  - **Stage 3:** the photograph at left with a slow pulse on the empty fifth shadow and the line from the reveal. At right, two large option buttons with the labels from the content, a four-digit code field, and a **Submit** button. Selecting an option highlights it in the accent colour. A wrong submission flashes the console red but never says which part was wrong.
  - Success starts the Round 1 finale (3.14).

#### Round 2, The Records Archive (4 clues)

- [ ] **FE-110 R2-02 Redacted Report** (`redacted_pdf`). Click the yellowed folder. Panel shows two tabs, **Copy A** and **Copy B**, each a scanned-paper page with the report paragraphs. Redacted segments are drawn as solid black blocks but the text underneath stays selectable (same colour as the bar), so select-all and copy reveal it. Footer line of each copy shows "DOC-HASH: \[footer\_hash\]" in monospace. Two fields: shutdown date and code word. Success: the folder stamps "VERIFIED" on the genuine copy.
- [ ] **FE-111 R2-03 Photograph, Revisited** (`microfilm_viewer`, 2 stages). Click the microfilm reader. **Stage 1:** the screen shows a dark film strip and a date dial (one field in the YYYY-MM-DD format, with a click-sound dial look). **Stage 2:** the Round 1 portrait appears with film grain, plus a **Properties** button that opens a panel listing the comment field as hex lines from the stage reveal. A field takes the panel code. Unlocks only after R2-02 is solved.
- [ ] **FE-112 R2-04 Epoch Timeline** (`epoch_timeline`). Click the whiteboard. Panel shows eight index cards pinned on a board, each with its event text and a large number (\[epoch\]) where a date would be. Cards can be dragged around the board to sort them (free layout, no automatic sorting, no conversion). Copy button per card. One text field.
- [ ] **FE-113 R2-07 Convergence Lock** (`keypad_lock`). Click the bulkhead door. Panel shows a steel keypad with two fields (panel code, keyword) and a big **UNLOCK** button. Wrong entry shows "ACCESS DENIED" with no detail. Success: the bulkhead grinds open, the Vault card unlocks on the map, and a toast says so. Unlocks only after R2-03 and R2-04 are solved.

#### Round 2, The Control Room (3 clues)

- [ ] **FE-114 R2-01 Personnel Index** (`table_filter`). Click the staff terminal. Panel shows a spreadsheet-style table of \[rows\] with a sticky header. Each column has a filter (dropdown for status and department, text for badge and name, date range for last login). Click a header to sort. A counter reads "Showing 12 of 60" and an **Export CSV** button downloads what is shown. Nothing is highlighted for the player. One field for the badge ID.
- [ ] **FE-115 R2-05 Transmission Archive** (`transmission_archive`). Click the receiver. Panel shows six cassette or envelope icons, TX-1 to TX-6. Opening one shows a header block (From, X-Auth, Received) and the message body. Copy button on the header. One field for the voicemail file name. Unlocks only after R2-01 is solved.
- [ ] **FE-116 R2-06 Spectrogram Voicemail** (`spectrogram_voicemail`). Click the sound console. Panel shows two tracks (Voicemail A and B), each with Play, a scrub bar, and a **Download WAV** button so teams can open the file in a spectrogram tool. No built-in spectrogram view. A four-box digit field. Unlocks only after R2-05 is solved.

#### Round 2, The Containment Vault (3 clues)

- [ ] **FE-117 R2-08 Manual Diff** (`manual_diff`). Click the manual terminal. Panel shows two panes side by side: **Manual (plain)** with the eight step lines, and **Manual (encrypted)** with the ciphertext block. Copy button on each, no built-in diff. One field for the tampered step numbers.
- [ ] **FE-118 R2-09 Failsafe Circuit** (`logic_circuit`). Click the failsafe panel. Panel draws the circuit from \[circuit\] as SVG: eight inputs on the left (A1, A0, B1, B0, C1, C0, D1, D0), standard NOT, AND and OR symbols, wires, and four lamps on the right. Inputs are toggle switches the player can flip to watch the lamps change. The panel note is printed at the bottom. One four-digit field. After 5 wrong tries the clue locks for 60 seconds with a visible countdown.
- [ ] **FE-119 R2-10 Final Containment** (`final_console`). Click the central console. Panel shows three fields (clean step numbers, authorization code, real sender badge) and a big **INITIATE SHUTDOWN** button. A wrong entry triggers a full-panel red lockout with a 3-minute countdown and the line "Check your evidence." Success starts the Round 2 finale (3.14).

### 3.10 Hint ladder

- [ ] **FE-130** A **Hints** drawer in the clue panel shows three rungs per stage. Rung 1 is labelled "Nudge (free)" with a countdown until it unlocks. Rung 2 "Method (-1 point)" and rung 3 "Big help (-2 points)" are locked until the previous rung is used.
- [ ] **FE-131** Using a rung asks for confirmation ("This costs 1 point. Reveal?") unless the penalty is 0. Revealed hints stay visible.
- [ ] **FE-132** The penalty shown is read from the content, never hardcoded.
- [ ] **FE-133** Hint requests use the same disabled-while-pending and same-request-id retry rules as submissions.

### 3.11 Submit behaviour

- [ ] **FE-140** While a submission is in flight the button is disabled and shows a spinner. Enter is ignored during that time.
- [ ] **FE-141** One `request_id` per click. If a request fails, retry with the same id. The player cannot trigger two submissions with one click or a double click.
- [ ] **FE-142** `WRONG`: shake the panel, show "Not quite. Check your evidence.", keep the text in the fields. `TOO_FAST`: a countdown on the button ("Wait 3s"). `LOCKED`: full-panel lockout overlay with a live countdown that survives a page refresh because it comes from the server.
- [ ] **FE-143** `ALREADY_SOLVED` (a teammate solved it): close the input, show "Your team already solved this", refresh state.
- [ ] **FE-144** `STAGE_CORRECT`: move to the next stage with a short transition.
- [ ] **FE-145** Client-side checks only for empty fields and length. Never compare with an answer in the browser.

### 3.12 Toolkit card and leaderboard

- [ ] **FE-150** Toolkit card (opens at the start of each round and from the top bar): a clean card listing each technique and its free tools as links, from the content file.
- [ ] **FE-151** Leaderboard screen: rank, team name, clues solved, score (hidden when scores are hidden, shown as "?"), highlight for the player's own team. Refreshes every 5 seconds. Final results show "FINISHED" in the status column for teams that finished.

### 3.13 Error messages (FE-160)

| Code | Message shown |
| --- | --- |
| `BAD_CREDENTIALS` | Team name or password is wrong. |
| `ACCOUNT_DISABLED` | This team is disabled. Contact the organisers. |
| `SESSION_LIMIT` | Your team is already signed in on other devices. |
| `SESSION_ENDED` | You were signed out. Sign in again; your progress is safe. |
| `RATE_LIMITED` | Too many tries. Please wait a moment. |
| `ROUND_NOT_STARTED` | The round has not started yet. |
| `ROUND_PAUSED` | The round is paused by the organisers. |
| `ROUND_CLOSED` | The round has ended. |
| `NOT_IN_ROUND` | Your team is not in this round. |
| `ROOM_LOCKED` / `CLUE_LOCKED` | This lead is not open yet. (plus the unlock hint) |
| `WRONG` | Not quite. Check your evidence. |
| `TOO_FAST` | Wait a few seconds before trying again. |
| `LOCKED` | Locked. Check your evidence. (with countdown) |
| `HINT_NOT_READY` | This hint opens in mm:ss. |
| `SERVER_BUSY` | Please try again in a moment. |

### 3.14 Story screens, finales and eliminated screen

- [ ] **FE-170** **Round intro:** black screen, the `intro` text typed in VT323 at 40 characters per second, then a **BEGIN** button. Ambient audio fades in.
- [ ] **FE-171** **Round 1 finale:** the house goes silent (all audio cuts for 1 second), the countdown freezes, the door opening animation plays, the three `victory_lines` appear one after another, the last line glitching. Then the leaderboard. Then, for qualified teams only, a glitch cut to the completed photograph with a doorway and a faint sixth shadow, and the `bridge_text` typed out as a CIPHER transmission with a **CONTINUE** button.
- [ ] **FE-172** **Not qualified:** after the leaderboard show the round's `eliminated_text` with a "Thank you for playing" card and a link back to the final standings.
- [ ] **FE-173** **Round 2 intro:** the `intro` text of Round 2 typed out, then the map with three rooms.
- [ ] **FE-174** **Round 2 finale:** monitors flicker, the countdown freezes, the `victory_lines` appear, the `bridge_text` plays as the researcher's final recording (typed text with a static voice effect), then the final leaderboard with the winners highlighted.
- [ ] **FE-175** **Sting:** two seconds after the leaderboard, flash the `sting_template` full screen in red on black with the team name inserted for `{TEAM_NAME}`, glitching, then fade to black and show the final "Thank you" screen.
- [ ] **FE-176** All cutscenes can be skipped with Esc after the first viewing, except the sting.
- [ ] **FE-177** **Eliminated screen** (`/eliminated`): for any team without Round 2 state, shows the eliminated text and the final standings.

### 3.15 Audio and effects (FE-190)

- [ ] **FE-190** One ambient loop per room, crossfaded. Random sound effects per room as listed in the content. A tension layer that speeds up in the last 5 minutes of the round.
- [ ] **FE-191** UI sounds: hotspot hover tick, panel open, correct chime, wrong buzz, room unlock, fragment slide. All short and mutable.
- [ ] **FE-192** Never autoplay audio before the first click. Provide a visible mute button.

## 4. Admin panel

Separate area at `/admin`. Different look from the event: flat dark slate `#0f1115`, panels `#171a21`, accent cyan `#38bdf8`, text `#e5e7eb`, font IBM Plex Sans. No horror styling, because it must be fast to read under pressure.

### 4.1 Admin login and roles

- [ ] **ADM-01** Admin login page (`/admin/login`): fields username and password, button "SIGN IN", error text under the form, Enter submits, button disabled while pending. After 5 failed attempts the account is locked for 10 minutes with a visible countdown.
- [ ] **ADM-02** Admin sessions last 8 hours. A "Sign out" button sits in the top bar. An ended session returns to the admin login with a banner.
- [ ] **ADM-03** Roles: **superadmin** (everything, including managing admins), **operator** (run the event: rounds, teams, announcements, adjustments), **viewer** (read-only dashboards and leaderboards). Buttons the role cannot use are hidden and the server rejects the call anyway.
- [ ] **ADM-04** The first superadmin is created by a setup script, never through the web.
- [ ] **ADM-05** Admin API is separate from the event API and is protected by the admin session only.

### 4.2 Layout

- [ ] **ADM-10** Left navigation: Dashboard, Teams, Rounds, Leaderboard, Submissions, Clue analytics, Announcements, Content check, Audit log, Admins (superadmin only).
- [ ] **ADM-11** Top bar: live clock, current round with a status badge (pending, live, paused, ended), time remaining, the loaded content label and fingerprint (first 8 characters), a red banner if the content fingerprint changed during a live round, and the signed-in admin with a Sign out button.

### 4.3 Pages

- [ ] **ADM-20 Dashboard.** Big round card (status, countdown, buttons Start, Pause, Resume, End, Extend). Tiles: teams signed in now, teams finished, submissions in the last minute, wrong-answer rate. A heat grid with teams as rows and the 10 clues as columns (grey locked, white open, green solved, amber stuck beyond twice the par time). A live event feed (logins, solves, finishes, lockouts). A quick "Post announcement" box.
- [ ] **ADM-21 Teams.** Searchable list with status chips (active, disabled, disqualified, signed in). Actions: create teams in bulk (paste lines of `team name, optional password`; blank passwords are generated), export credentials as CSV (shown once), reset password, disable or enable, disqualify with a reason, force logout, delete a team that has no progress.
- [ ] **ADM-22 Team detail.** Header with status and active sessions (device label, last seen, Revoke). Per-clue table (state, stage, wrong attempts, hints used, score, solve time). Submissions log for the team. Forms: score adjustment (amount and a required reason), reset a single clue, and notes.
- [ ] **ADM-23 Rounds.** Controls for each round: set duration, start, pause, resume, end, extend by minutes, toggle hide scores. Qualification panel: a number input for N, a **Preview** button listing top N ranked teams (by solved clues, score, time), and a **Qualify** button that qualifies top N teams to Round 2 without requiring all clues solved.
- [ ] **ADM-24 Leaderboard.** Exact scores and finish times to the millisecond for each round, with the tie-break shown. Export as CSV. Never hidden for admins.
- [ ] **ADM-25 Submissions.** Live table with filters (team, clue, result, time range): time, team, clue, stage, result, points, raw input. Auto-refresh every 3 seconds with a pause toggle.
- [ ] **ADM-26 Clue analytics.** Per clue: teams solved, median solve time against par, wrong attempts, hints used by level, teams currently stuck. Sort by hardest.
- [ ] **ADM-28 Content check.** Shows the loaded file name, label, fingerprint, counts per round, room and clue, validation status, asset folder name and a check of every referenced asset file (found or missing). It never shows answers or hashes. A reload button is disabled while any round is live.
- [ ] **ADM-29 Audit log.** Every admin action with time, admin, action, target and details.
- [ ] **ADM-30 Admins** (superadmin). Create, disable, change role, reset password.

### 4.4 Admin API (names to implement)

| Area | Endpoints |
| --- | --- |
| Auth | `POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/auth/me` |
| Teams | `GET /admin/teams`, `POST /admin/teams/bulk`, `GET /admin/teams/{id}`, `POST /admin/teams/{id}/reset-password`, `POST /admin/teams/{id}/disable`, `POST /admin/teams/{id}/enable`, `POST /admin/teams/{id}/disqualify`, `POST /admin/teams/{id}/force-logout`, `POST /admin/teams/{id}/adjust`, `POST /admin/teams/{id}/reset-clue`, `GET /admin/teams/{id}/submissions` |
| Rounds | `POST /admin/rounds/{n}/start`, `/pause`, `/resume`, `/end`, `/extend`, `/hide-scores`, `GET /admin/rounds/1/qualify/preview?top=N`, `POST /admin/rounds/1/qualify?top=N` |
| Data | `GET /admin/leaderboard?round=n`, `GET /admin/submissions`, `GET /admin/analytics/clues`, `GET /admin/events/stream` |
| Content | `GET /admin/content/status`, `POST /admin/content/reload` |
| Other | `GET/POST/DELETE /admin/announcements`, `GET /admin/audit`, `GET/POST /admin/admins` |

## 5. Assets to produce

All files go in the asset folder named by `meta.assets_dir` in the content file. File names must match the content file exactly. Each clue's asset brief is inside the content file under `clues[].assets[].brief`.

- [ ] **AST-01** Six room backgrounds, 1920 x 1080 PNG, with an empty area where each hotspot object sits so the objects can be drawn separately: `bg_bedroom.png`, `bg_study.png`, `bg_basement.png`, `bg_records.png`, `bg_control.png`, `bg_vault.png`.
- [ ] **AST-02** Object art (transparent PNG or SVG) for every clue object and decor object listed in section 3.7, sized to the percentages in the content file.
- [ ] **AST-03** Ambient loops (60 to 120 s, seamless) and effects for each room: `amb_bedroom.mp3`, `music_box_faint.mp3`, `clock_tick.mp3`, `amb_study.mp3`, `crt_hum.mp3`, `whisper_far.mp3`, `amb_basement.mp3`, `server_hum.mp3`, `pipe_drip.mp3`, `amb_records.mp3`, `fluorescent_buzz.mp3`, `paper_shuffle.mp3`, `amb_control.mp3`, `static_burst.mp3`, `relay_click.mp3`, `amb_vault.mp3`, `core_pulse.mp3`, `steel_creak.mp3`.
- [ ] **AST-04** UI sounds: hover tick, panel open, correct chime, wrong buzz, room unlock, fragment slide, success sting.
- [ ] **AST-05** Round 1 puzzle files: `diary_open.png`, `music_box.mp3` (optional fallback), `poster_dark.png`, `voice_memo.mp3`, `rec_a.wav` and `rec_b.wav` (with the recording-date metadata embedded as in the brief), `final_note.png`, `photo_full.png`.
- [ ] **AST-06** The ten photograph pieces `frag_01.png` to `frag_10.png`, cut from `photo_full.png` as a 2 x 5 grid with torn edges, matching each fragment's `correct_slot` in the content file. Verify by placing them in order and comparing with the full photo.
- [ ] **AST-07** Round 2 puzzle files: `paper_scan.png`, `portrait_round1.png` (with the comment metadata embedded as in the brief), `vm_a.wav` and `vm_b.wav` (digits drawn in the spectrogram as in the brief, checked in Audacity).
- [ ] **AST-08** Story screens: `bridge_photo.png` (the portrait with a doorway behind it and a faint sixth shadow), `door_open.png` sequence for the Round 1 finale, and cutscene backgrounds.
- [ ] **AST-09** Icons: jack-o'-lantern line art for the login page, padlock, tick, fragment frame, tool icons for the Inspector.

## 6. Tests

Backend tests use pytest. Frontend tests use Vitest with React Testing Library. End-to-end tests use Playwright. Test function names below are the exact names to create.

### 6.1 Backend tests (`tests/backend/`)

#### test\_content\_loader.py

- [ ] `test_boots_with_valid_content_file`
- [ ] `test_refuses_to_boot_when_env_var_missing`
- [ ] `test_refuses_to_boot_when_file_missing`
- [ ] `test_refuses_to_boot_on_invalid_json`
- [ ] `test_validation_requires_ten_clues_per_round`
- [ ] `test_validation_rejects_unknown_object_id`
- [ ] `test_validation_rejects_unknown_requires_all_id`
- [ ] `test_validation_rejects_dependency_cycle`
- [ ] `test_validation_rejects_bad_answer_hash_length`
- [ ] `test_validation_requires_three_hint_levels_per_stage`
- [ ] `test_validation_requires_fragment_award_clue_exists`
- [ ] `test_public_projection_strips_answer_hash`
- [ ] `test_public_projection_strips_answer_plain_and_solution`
- [ ] `test_public_projection_hides_unused_hints`
- [ ] `test_public_projection_hides_reveal_until_stage_solved`
- [ ] `test_room_clue_counts_computed_from_content`
- [ ] `test_switching_content_file_env_var_changes_loaded_content`
- [ ] `test_assets_dir_comes_from_content_meta`
- [ ] `test_reload_blocked_while_round_live`

#### test\_answers.py

- [ ] `test_normalize_upper_collapses_spaces`
- [ ] `test_normalize_alnum_strips_punctuation`
- [ ] `test_normalize_digits_keeps_only_digits`
- [ ] `test_hash_matches_known_vector`
- [ ] `test_multi_field_join_uses_pipe`
- [ ] `test_comparison_uses_constant_time_compare`
- [ ] `test_wrong_field_order_fails`
- [ ] `test_every_stage_answer_plain_matches_hash_when_present`

#### test\_auth.py

- [ ] `test_login_success_sets_cookie`
- [ ] `test_login_is_case_insensitive_on_team_name`
- [ ] `test_login_wrong_password_generic_error`
- [ ] `test_login_unknown_team_same_error_as_wrong_password`
- [ ] `test_login_disabled_team_rejected`
- [ ] `test_login_lockout_after_eight_failures`
- [ ] `test_login_lockout_expires`
- [ ] `test_ip_lockout_after_twenty_failures`
- [ ] `test_session_limit_blocks_login_over_limit`
- [ ] `test_session_limit_response_lists_devices`
- [ ] `test_logout_ends_only_current_session`
- [ ] `test_logout_all_requires_valid_credentials`
- [ ] `test_logout_all_ends_every_session`
- [ ] `test_logout_all_is_idempotent_with_zero_sessions`
- [ ] `test_logout_all_keeps_progress_and_scores`
- [ ] `test_logout_all_does_not_change_round_timer`
- [ ] `test_logout_all_uses_same_rate_limit_as_login`
- [ ] `test_login_succeeds_after_logout_all`
- [ ] `test_revoked_session_returns_session_ended`
- [ ] `test_expired_session_returns_session_ended`
- [ ] `test_session_sliding_expiry_extends`
- [ ] `test_login_allowed_before_round_start`
- [ ] `test_me_returns_team_and_session_count`
- [ ] `test_login_and_logout_events_recorded`

#### test\_state.py

- [ ] `test_state_requires_auth`
- [ ] `test_state_lists_rooms_with_counts`
- [ ] `test_state_locked_room_has_unlock_hint`
- [ ] `test_state_hides_scores_when_hide_scores_on`
- [ ] `test_state_etag_returns_304_when_unchanged`
- [ ] `test_state_includes_lockout_end_times`
- [ ] `test_state_includes_fragments_collected`
- [ ] `test_state_for_team_not_in_round_returns_not_in_round`
- [ ] `test_time_endpoint_returns_milliseconds`
- [ ] `test_clue_endpoint_locked_returns_403`
- [ ] `test_clue_endpoint_after_solve_includes_reveal`

#### test\_unlock\_engine.py

- [ ] `test_round_start_opens_at_start_rooms`
- [ ] `test_round_start_unlocks_clues_without_requirements`
- [ ] `test_round1_study_opens_when_bedroom_complete`
- [ ] `test_round1_basement_opens_when_study_complete`
- [ ] `test_r1_09_unlocks_after_r1_05`
- [ ] `test_r1_10_unlocks_after_r1_05_r1_08_r1_09`
- [ ] `test_r2_03_unlocks_after_r2_02`
- [ ] `test_r2_05_unlocks_after_r2_01`
- [ ] `test_r2_06_unlocks_after_r2_05`
- [ ] `test_r2_07_unlocks_after_r2_03_and_r2_04`
- [ ] `test_vault_opens_when_r2_07_solved`
- [ ] `test_r2_10_unlocks_after_r2_08_and_r2_09`
- [ ] `test_unlock_engine_is_idempotent`
- [ ] `test_unlocked_at_equals_solve_time_of_prerequisite`
- [ ] `test_room_marked_complete_when_all_clues_solved`

#### test\_submit.py

- [ ] `test_correct_answer_awards_points`
- [ ] `test_wrong_answer_returns_wrong_without_detail`
- [ ] `test_wrong_answer_never_reveals_which_field_is_wrong`
- [ ] `test_answer_normalization_applied`
- [ ] `test_multi_field_answer_correct`
- [ ] `test_multi_field_partial_wrong_is_wrong`
- [ ] `test_stage_correct_advances_stage`
- [ ] `test_wrong_stage_number_rejected`
- [ ] `test_arrange_requires_ten_distinct_fragments`
- [ ] `test_arrange_rejects_fragments_not_owned`
- [ ] `test_arrange_correct_order_accepted`
- [ ] `test_choice_code_correct_pair_accepted`
- [ ] `test_choice_correct_code_wrong_rejected`
- [ ] `test_cooldown_after_wrong_returns_too_fast`
- [ ] `test_cooldown_expires_after_three_seconds`
- [ ] `test_final_clue_lockout_three_minutes`
- [ ] `test_lockout_persists_across_requests`
- [ ] `test_r2_09_locks_after_five_wrong`
- [ ] `test_locked_clue_rejected`
- [ ] `test_already_solved_returns_original_points`
- [ ] `test_submit_before_round_start_rejected`
- [ ] `test_submit_while_paused_rejected`
- [ ] `test_submit_after_round_end_rejected`
- [ ] `test_submit_just_before_end_accepted`
- [ ] `test_per_team_rate_cap_thirty_per_minute`
- [ ] `test_bad_input_wrong_field_count`
- [ ] `test_bad_input_field_too_long`
- [ ] `test_bad_input_control_characters`
- [ ] `test_submission_record_has_raw_fields_and_result`
- [ ] `test_answers_never_written_to_logs`

#### test\_concurrency.py

- [ ] `test_twenty_parallel_correct_submits_score_once`
- [ ] `test_parallel_same_request_id_returns_same_response`
- [ ] `test_duplicate_request_id_no_second_scoring`
- [ ] `test_parallel_different_clues_both_succeed`
- [ ] `test_parallel_submits_from_two_teams_are_independent`
- [ ] `test_parallel_wrong_submits_apply_cooldown_once`
- [ ] `test_parallel_hint_requests_charge_once`
- [ ] `test_parallel_unlock_engine_creates_no_duplicates`
- [ ] `test_solve_timestamp_uses_processing_time`

#### test\_scoring.py

- [ ] `test_full_speed_bonus_within_par`
- [ ] `test_speed_bonus_decays_linearly`
- [ ] `test_speed_bonus_zero_at_double_par`
- [ ] `test_hint_level_two_costs_one_point`
- [ ] `test_hint_level_three_costs_two_points`
- [ ] `test_three_free_wrong_attempts`
- [ ] `test_fourth_wrong_attempt_costs_half_point`
- [ ] `test_score_never_below_min_points`
- [ ] `test_score_rounded_to_two_decimals`
- [ ] `test_time_measured_from_unlocked_at`
- [ ] `test_round_total_is_sum_of_clue_scores`
- [ ] `test_admin_adjustment_changes_total`
- [ ] `test_recompute_totals_matches_incremental`

#### test\_hints.py

- [ ] `test_level_two_requires_level_one`
- [ ] `test_level_one_not_ready_before_five_minutes`
- [ ] `test_level_one_free_after_five_minutes`
- [ ] `test_repeat_hint_returns_same_text_no_extra_cost`
- [ ] `test_hint_text_not_in_state_before_use`
- [ ] `test_hint_per_stage_for_multi_stage_clue`
- [ ] `test_hint_idempotent_by_request_id`
- [ ] `test_hint_rejected_when_clue_locked`

#### test\_rounds.py

- [ ] `test_start_sets_window_from_default_duration`
- [ ] `test_start_overrides_duration`
- [ ] `test_start_creates_state_for_all_eligible_teams_same_instant`
- [ ] `test_pause_rejects_submissions`
- [ ] `test_resume_extends_ends_at_by_paused_time`
- [ ] `test_extend_adds_minutes`
- [ ] `test_end_closes_round`
- [ ] `test_round_two_cannot_start_before_qualify`
- [ ] `test_hide_scores_switches_on_in_last_ten_minutes`
- [ ] `test_scheduler_marks_round_ended`
- [ ] `test_content_fingerprint_recorded_on_start`
- [ ] `test_fingerprint_mismatch_blocks_submissions`

#### test\_leaderboard.py

- [ ] `test_rank_by_clues_then_score_then_time`
- [ ] `test_equal_score_earlier_last_solve_wins`
- [ ] `test_equal_everything_falls_back_to_team_id`
- [ ] `test_finished_teams_rank_above_unfinished`
- [ ] `test_wrong_attempts_do_not_change_last_solved_at`
- [ ] `test_hidden_scores_omitted_for_public`
- [ ] `test_admin_leaderboard_has_exact_scores`
- [ ] `test_leaderboard_cache_three_seconds`
- [ ] `test_own_rank_included`
- [ ] `test_disqualified_team_excluded`

#### test\_qualification.py

- [ ] `test_preview_lists_top_n_finishers`
- [ ] `test_only_finished_teams_qualify`
- [ ] `test_unfinished_high_score_does_not_qualify`
- [ ] `test_qualify_creates_round_two_state`
- [ ] `test_qualify_twice_creates_no_duplicates`
- [ ] `test_non_qualified_team_gets_not_in_round`
- [ ] `test_cutoff_tie_broken_by_finish_time`
- [ ] `test_disqualified_excluded_from_qualification`

#### test\_assets.py

- [ ] `test_asset_served_when_clue_unlocked`
- [ ] `test_asset_blocked_when_clue_locked`
- [ ] `test_path_traversal_blocked`
- [ ] `test_range_request_for_audio`
- [ ] `test_asset_content_type_correct`
- [ ] `test_asset_cache_control_private`
- [ ] `test_unknown_asset_returns_404`

#### test\_admin\_api.py

- [ ] `test_admin_login_success`
- [ ] `test_admin_login_lockout`
- [ ] `test_admin_routes_require_auth`
- [ ] `test_viewer_cannot_start_round`
- [ ] `test_operator_can_start_round`
- [ ] `test_only_superadmin_manages_admins`
- [ ] `test_bulk_create_teams_generates_passwords`
- [ ] `test_bulk_create_rejects_duplicate_names`
- [ ] `test_reset_team_password`
- [ ] `test_disable_team_blocks_login_and_ends_sessions`
- [ ] `test_force_logout_revokes_sessions`
- [ ] `test_score_adjustment_requires_reason`
- [ ] `test_reset_clue_clears_progress_for_that_clue`
- [ ] `test_every_admin_action_is_in_audit_log`
- [ ] `test_announcement_create_and_expire`
- [ ] `test_content_status_endpoint_hides_answers`

#### test\_security.py

- [ ] `test_cors_blocks_other_origin`
- [ ] `test_security_headers_present`
- [ ] `test_body_size_limit`
- [ ] `test_error_format_is_consistent`
- [ ] `test_health_exposes_no_secrets`
- [ ] `test_state_never_contains_answer_hash`
- [ ] `test_no_endpoint_returns_answer_plain`

#### test\_content\_rules.py (runs against whichever content file is loaded)

- [ ] `test_content_file_conforms_to_schema`
- [ ] `test_every_hotspot_inside_stage_bounds`
- [ ] `test_hotspots_do_not_overlap_more_than_forty_percent`
- [ ] `test_every_unlock_chain_reaches_the_final_clue`
- [ ] `test_feeds_references_exist`
- [ ] `test_each_room_has_expected_clue_count`
- [ ] `test_every_asset_file_exists_in_assets_dir`
- [ ] `test_sum_of_par_times_fits_round_duration`
- [ ] `test_independent_solver_reproduces_every_answer`

### 6.2 Frontend tests (`frontend/src/__tests__/`)

#### LoginPage.test.tsx

- [ ] `renders_sign_in_and_logout_options`
- [ ] `sign_in_disables_button_while_pending`
- [ ] `sign_in_submits_on_enter`
- [ ] `sign_in_shows_generic_error_on_bad_credentials`
- [ ] `sign_in_shows_lockout_countdown`
- [ ] `sign_in_shows_disabled_team_message`
- [ ] `session_limit_shows_logout_everywhere_button`
- [ ] `session_limit_switch_prefills_team_name`
- [ ] `logout_requires_team_name_and_password`
- [ ] `logout_success_shows_sessions_ended_and_returns_to_sign_in`
- [ ] `logout_keeps_team_name_and_clears_password`
- [ ] `logout_error_shows_generic_message`
- [ ] `redirects_to_play_when_already_signed_in`
- [ ] `password_toggle_shows_and_hides`

#### AppShell.test.tsx

- [ ] `redirects_unknown_route`
- [ ] `session_ended_returns_to_login_with_banner`
- [ ] `polling_pauses_when_tab_hidden`
- [ ] `polling_sends_etag`
- [ ] `countdown_uses_server_offset`
- [ ] `topbar_hides_score_when_scores_hidden`
- [ ] `topbar_timer_turns_amber_under_ten_minutes`
- [ ] `topbar_timer_pulses_under_five_minutes`
- [ ] `mute_state_persists_during_session`
- [ ] `sign_out_asks_for_confirmation`

#### MapHub.test.tsx

- [ ] `shows_room_counts_from_state`
- [ ] `locked_room_shows_padlock_total_and_hint`
- [ ] `clicking_locked_room_shows_toast`
- [ ] `complete_room_shows_badge`
- [ ] `round1_map_has_three_room_cards`
- [ ] `round2_map_has_three_room_cards`
- [ ] `unlock_animation_plays_when_room_opens`

#### RoomScene.test.tsx

- [ ] `positions_objects_from_percentages`
- [ ] `decor_objects_are_not_clickable`
- [ ] `open_hotspot_is_button_with_label`
- [ ] `solved_hotspot_is_dimmed_with_tick`
- [ ] `locked_hotspot_shows_padlock_tooltip`
- [ ] `header_shows_clues_solved_count`
- [ ] `header_shows_complete_badge`
- [ ] `tab_cycles_hotspots_in_seq_order`
- [ ] `uses_gradient_when_background_missing`
- [ ] `reduced_motion_disables_flicker`
- [ ] `debug_overlay_draws_rectangles`
- [ ] `click_opens_clue_panel`
- [ ] `esc_closes_clue_panel`

#### CluePanel.test.tsx

- [ ] `renders_prompt_and_fields_from_content`
- [ ] `submit_disabled_while_pending`
- [ ] `double_click_sends_one_request`
- [ ] `retry_reuses_same_request_id`
- [ ] `wrong_shakes_and_keeps_input`
- [ ] `too_fast_shows_button_countdown`
- [ ] `locked_shows_overlay_with_countdown`
- [ ] `already_solved_closes_input`
- [ ] `stage_correct_moves_to_next_stage`
- [ ] `correct_shows_success_overlay_and_story`
- [ ] `fragment_animation_plays_on_award`
- [ ] `review_mode_is_read_only`
- [ ] `copy_button_copies_text`

#### Clue screens (one file per kind, `clues/*.test.tsx`)

- [ ] `diary_shows_two_pages_and_cipher_page`
- [ ] `music_box_play_starts_synth_with_morse`
- [ ] `music_box_shows_no_dots_or_dashes`
- [ ] `poster_invert_toggles_filter`
- [ ] `poster_contrast_slider_stays_in_range`
- [ ] `poster_reset_restores_image`
- [ ] `tablet_turn_over_shows_sticky_note`
- [ ] `tablet_unlock_shows_voice_memo`
- [ ] `email_renders_encoded_block_copyable`
- [ ] `recordings_properties_dialog_shows_metadata`
- [ ] `hex_log_renders_hex_lines_with_offsets`
- [ ] `log_search_highlights_matches`
- [ ] `log_search_shows_match_count`
- [ ] `vigenere_note_shows_margin_note`
- [ ] `arrange_board_drag_places_fragment`
- [ ] `arrange_board_click_to_place_works`
- [ ] `arrange_board_swaps_on_filled_slot`
- [ ] `arrange_board_reset_clears_slots`
- [ ] `arrange_board_submit_sends_ten_ids_in_slot_order`
- [ ] `final_terminal_option_select_highlights`
- [ ] `final_terminal_sends_choice_and_code`
- [ ] `redacted_report_text_under_bars_is_selectable`
- [ ] `redacted_report_has_two_tabs`
- [ ] `microfilm_stage_one_then_stage_two`
- [ ] `microfilm_properties_panel_lists_hex`
- [ ] `epoch_cards_are_draggable`
- [ ] `epoch_cards_are_not_auto_sorted`
- [ ] `transmission_archive_opens_headers`
- [ ] `spectrogram_clue_has_download_buttons`
- [ ] `spectrogram_clue_has_four_digit_boxes`
- [ ] `manual_diff_shows_two_panes_without_diff_highlight`
- [ ] `staff_table_filters_work`
- [ ] `staff_table_sort_toggles`
- [ ] `staff_table_counter_updates`
- [ ] `staff_table_exports_csv`
- [ ] `circuit_panel_draws_gates_from_content`
- [ ] `circuit_panel_toggle_updates_lamps`
- [ ] `circuit_panel_locks_after_five_wrong_with_countdown`
- [ ] `final_console_shows_three_minute_lockout_overlay`

#### HintDrawer.test.tsx

- [ ] `rung_one_shows_countdown`
- [ ] `rung_two_asks_for_confirmation`
- [ ] `rung_three_locked_until_rung_two_used`
- [ ] `revealed_hint_stays_visible`
- [ ] `penalty_text_comes_from_content`
- [ ] `hint_request_disabled_while_pending`

#### Leaderboard.test.tsx, Lobby.test.tsx, Cutscenes.test.tsx

- [ ] `leaderboard_shows_ranks_in_order`
- [ ] `leaderboard_highlights_own_team`
- [ ] `leaderboard_hides_scores_when_flag_set`
- [ ] `leaderboard_refreshes_every_five_seconds`
- [ ] `leaderboard_shows_finished_status`
- [ ] `lobby_shows_waiting_status`
- [ ] `lobby_starts_round_when_state_goes_live`
- [ ] `lobby_shows_announcements`
- [ ] `lobby_opens_toolkit_card`
- [ ] `intro_types_text_then_shows_begin_button`
- [ ] `round1_finale_plays_full_sequence`
- [ ] `bridge_shown_only_to_qualified_teams`
- [ ] `not_qualified_team_sees_eliminated_text`
- [ ] `round2_finale_then_leaderboard_then_sting`
- [ ] `sting_inserts_team_name`
- [ ] `esc_skips_cutscene_except_sting`

#### Admin UI tests (`admin/__tests__/`)

- [ ] `admin_login_locks_after_five_failures`
- [ ] `admin_buttons_hidden_for_viewer_role`
- [ ] `dashboard_heat_grid_colours_clue_states`
- [ ] `teams_bulk_create_parses_pasted_lines`
- [ ] `teams_credentials_export_shown_once`
- [ ] `team_detail_revoke_session_calls_api`
- [ ] `adjust_form_requires_reason`
- [ ] `rounds_qualify_requires_preview_and_confirmation`
- [ ] `leaderboard_shows_exact_times`
- [ ] `content_check_never_shows_answers`
- [ ] `reload_button_disabled_while_round_live`

### 6.3 End-to-end tests (`e2e/`)

- [ ] `e2e_login_logout_cycle`
- [ ] `e2e_session_limit_then_logout_everywhere_then_sign_in`
- [ ] `e2e_full_round1_run`
- [ ] `e2e_full_round2_run`
- [ ] `e2e_wrong_then_correct_answer`
- [ ] `e2e_hint_ladder_costs_points`
- [ ] `e2e_two_browsers_same_team_submit_same_clue_once`
- [ ] `e2e_refresh_during_lockout_keeps_countdown`
- [ ] `e2e_admin_start_pause_resume_end`
- [ ] `e2e_admin_qualify_then_round2_access`
- [ ] `e2e_non_qualified_team_sees_eliminated_screen`
- [ ] `e2e_scores_hidden_in_last_ten_minutes`
- [ ] `e2e_leaderboard_tie_break_visible`
- [ ] `e2e_changing_content_file_variable_changes_questions`
- [ ] `e2e_load_fifty_teams_three_devices_each`

## 7. Suggested split by person

| Person | Owns | First tasks |
| --- | --- | --- |
| Backend lead | Sections 1 and 2, `test_*.py` | BE-01 to BE-08, BE-10 to BE-19, BE-40 to BE-55 |
| Backend 2 | Unlock engine, scoring, hints, rounds, leaderboard, qualification | BE-30 to BE-35, BE-60 to BE-96 |
| Frontend lead | Shell, login page, map, room scene, cutscenes | FE-01 to FE-72, FE-170 to FE-177 |
| Frontend 2 | Clue panels and hint ladder | FE-80 to FE-145 |
| Admin dev | Section 4 and admin tests | ADM-01 to ADM-30 |
| Art and sound | Section 5 | AST-01 to AST-09 |
| QA | Section 6 and the playtests | End-to-end suite, content rules, two full playthroughs |

**Order of work:** content loading and login first, then state and unlock engine, then submit with concurrency tests, then room scene and clue panels, then admin and rounds, then cutscenes and polish, then full playthroughs.

**Done means:** all boxes ticked, all tests green, one full playthrough of both rounds by a person who did not build it, and a 50-team load run without a wrong score.

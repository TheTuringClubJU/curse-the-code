# 06 — Horror Design: Torch, Lighting, Audio, Scares

References: **Resident Evil** (tight rooms, hard torch cone, dread of the unseen) and **Phasmophobia**
(flicker, whispers, torch-only exploration). Copy the *feelings*, never the files.

> **Horror is a skin over the game logic.** A scare may never block a clue modal, consume an attempt,
> delay/replace a server response, hide an interactive prop permanently, or softlock a team. Teams are timed
> and scored — unfair scares are bugs.

## 0. Match the room, not your taste
Each room already has its own mood and colour language (see `02`, and `theme` in `content*.json`).
Round 1 is purple/green/red; Round 2 is amber/blue/crimson. Do **not** force one palette (e.g. "no blue") on every room.
Use the room's `theme` colours as your lighting colours.

## 1. Torch (player flashlight)
The Room 5 torch is the **single constant torch across all rooms**, wired automatically by `engine.js` via `frontend/src/game/engine/torch.js`:
- **Model & beam:** loads `/assets/models/room5/flashlight.glb` with identical first-person placement, lens emissive glow (`E._flashLensMat`), and camera-mounted `SpotLight` (`E.flashlight`, intensity `18.0`, distance `32`, angle `Math.PI / 4.2`, penumbra `0.55`).
- **Mechanics:** walking and idle hand sway (`updateTorchSway`), `[F]` key toggle (`bindTorchKey` for Rooms 1–3; React page handlers for Rooms 4–5), and scare outage support (`E._flashOutageActive`, `api.setFlashlight(on)`).
- **Room 4 (`records`):** existing battery drain/recharge logic in `Room4Records.jsx` continues to work seamlessly via `setFlashlight`.
- **Room 6 (`vault`):** disables the torch on entry (`setFlashlight(false)`) per story design (battery dies at the threshold).
- **Your rule:** do **not** create a second flashlight model or camera `SpotLight`. Just make the room dark enough that the constant torch is needed.

## 2. Dark by default
- Ambient very low; fog dark (engine already sets `FogExp2`); background is the room's `theme.bg_top`.
- Light = torch + 1–2 practical lights (bulb/lamp/CRT) + emissive fakes (monitors, candles, exit signs).
- Events cut lights for 1–3 s then bring them back flickering.

## 3. Audio
Content already lists ambience per room (`ambient.loop`, `ambient.sfx` in `content*.json`):
bedroom `amb_bedroom, music_box_faint, clock_tick` · study `amb_study, crt_hum, whisper_far` ·
basement `amb_basement, server_hum, pipe_drip` · records `amb_records, fluorescent_buzz, paper_shuffle`.
Use these as the **sound brief**: source files with those names/feel and wire them through the room's existing audio class
(`GameAudio` for R1–3, `GameAudioRecords` for R4). Don't create a new audio system.

Layers: ambient loop (30–60 s, seamless) · footsteps per surface · interaction sounds (door, drawer, paper, torch click) ·
random positional one-shots every 20–60 s (whisper, knock, scrape, floorboard) · stingers (rare) · tension riser.

Rules: `.mp3`/`.ogg`, mono for positional, 96–128 kbps; ambient ≤ 1 MB, one-shot ≤ 150 KB; normalise ≈ -14 LUFS, peak ≤ -1 dB.
Start audio only after user gesture (existing "enter room" click). Respect the existing mute toggle. Never leave audio running after leaving the room.
Sources: Freesound (CC0 filter), Pixabay, OpenGameArt, itch.io. Log every file in `07`.
Story: no voices that say names/dates/codes ("Corvin", "1983", digits) — that could masquerade as clues.
Existing voice cues in the bedroom (`seeyou, getout, behind, rex`) are part of the current design — keep them unless the lead says otherwise.

## 4. Scares
Rule of three: slow dread → false alarm → real hit. 3–5 per room, different types, **each fires once**, never in the first 30 s of a room,
never while a modal is open, never while the player is typing an answer.

| Type | Example | Cost |
|---|---|---|
| Light cut | Lights die 2 s, something closer after | cheap |
| Audio only | Door slam behind, whisper | cheap |
| Peripheral figure | Figure at the far edge, gone when looked at | cheap |
| Prop event | Chair slides, painting tilts, CRT static | cheap |
| Entity rush | Creature sprints past + stinger | medium |
| Environmental change | Doll now faces player | cheap |
| HUD glitch | Static, vignette pulse, heartbeat | cheap |

**Triggering must be situation-based** (clue opened, fragment found, zone entered), matching `ROUND2_DESIGN.md` "Horror Layer".
Existing pattern files: `scares.js` (R1), `scaresRecords.js` (R4), `scaresControl.js` (R5). **Extend the room's existing scares file; don't invent a new system.**
Any scare tied to a backend event (e.g. fragment found) hooks on the **already-existing** callback/handler in the room's scares API; if there isn't one, ask the lead. Never hook by polling the API.
The existing 3-attempt/wrong-answer feedback (`engine.shake()`) stays as is.

Safety: avoid strobing > 3 flashes/s; keep a reduced-scares/reduced-motion path (engine honours `prefers-reduced-motion`).
Don't trigger scares via the timer/leaderboard clocks. Forks and trap sequences (Round 2) are story-critical and owned by the lead.

## 5. Cheap creepiness (do all)
Crooked frames, a chair facing the wall, stopped clock, single child's shoe; slow breathing sway; film grain/vignette via CSS;
alpha decals (handprints, stains, writing — **no readable clue text**); irregular bulb buzz; dust motes in the torch beam; drips; a silhouette in a doorway, once.

## 6. Feel targets
**Scary** (dark, audio, wrongness) · **Thrilling** (always about to happen; timer pressure) · **Gothic** (aged wood, frames, candles, stone — strongest in R1/R2) · **Fun** (fair scares, rewarding search).

## 7. Prompts that work with AI
- "In `studyScene.js`, load `/assets/models/study/crt_monitor.glb`, scale to 0.9, place at (0,0.76,-0.8), call `E.interact(grp,'crt_monitor')` and `E.add(grp)`. Keep the old procedural CRT as fallback in `.catch`. Do not touch any other file."
- "Add a flickering amber PointLight using `E.lightRig` and `E.flick`, intensity ≤ 1.2. Only the room's scene file."
- "Add a one-time scare in `scares.js` following its existing pattern: when the existing `onFragmentFound` hook fires for `trunk`, cut lights 2 s and play `stinger.mp3`. Don't change fetch/API code."
Never: "make it scary", "generate a 3D room", "fix the backend", "improve the game".

## 8. Horror checklist (PR)
- [ ] Room dark enough that unlit corners rely on the built-in torch; [F] toggle works
- [ ] Ambient + footsteps + ≥3 one-shots using the room's existing audio class
- [ ] ≥3 scares, different types, once each, none blocks gameplay
- [ ] ≥1 "wrongness" prop and ≥1 peripheral moment
- [ ] Palette = this room's theme
- [ ] No scare during modals / answer typing; no softlock; reduced-motion respected
- [ ] Mute works; audio stops on leaving

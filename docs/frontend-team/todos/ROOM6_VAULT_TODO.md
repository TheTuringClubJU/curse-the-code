# Room 6 — The Anointing Vault (`vault`) New Build To-Do

**Owner:** Swapnil (Lead) · **Branch:** `feat/room-6-vault` · **Round:** 2 (Room 6 of 6 — Grand Finale)
**Spec source:** `ROUND2_DESIGN.md` (§ Room 6: The Anointing Vault) + `content.test.json` (`rooms[vault]`).
**Guides:** Follow `../01_BACKEND_AND_STORY_CONTRACT.md`, `../02_ROOM_FLOW_AND_CONTINUITY.md`, `../05_OPTIMIZATION.md`, `../06_HORROR_DESIGN.md`.

---

## 1. Files to Create / Wire (Lead-Owned)
- `frontend/src/game/Room6Vault.jsx`
- `frontend/src/game/rooms/vault.js`
- `frontend/src/game/engine/sceneVault.js`
- `frontend/src/game/engine/scaresVault.js`
- `frontend/src/game/engine/audioVault.js`
- `frontend/public/assets/models/vault/` (compressed `.glb` only)
- `frontend/public/assets/audio/vault/` (`.mp3` / `.ogg` only)
- Wire `'vault'` branch in `frontend/src/game/engine/engine.js` and `ctc:navigate-room` → `'vault'` in `frontend/src/App.jsx` (and backend unlock check `clue_solved: R2-07` / Fork 2).
- Add Room 6 frontend/E2E tests in `frontend/src/__tests__/` (`TODO.md` §5: 100-test standard).

---

## 2. Room Spec & Continuity
- **Previous room:** Room 5 — The Surveillance Morgue (`control`) via **Fork 2** (Core Airlock: Auxiliary Feed A vs. Primary Containment B).
- **Next:** Round 2 Victory / Final Ending sequence (`R2-10` Central Console convergence).
- **Theme / Palette:** Occult subterranean containment dome — poured concrete with exposed rebar, rusted ceiling chains, central suspended spherical iron cage containing a pulsing crimson biological organism (`ROUND2_DESIGN.md`), amber console indicators.
- **Torch Rule (`engine/torch.js`):** Battery dies **on entry** (`api.setFlashlight(false)` + disable `[F]` toggle in `Room6Vault.jsx`). Lighting comes solely from the 1.4 s crimson pulse of the organism + amber console indicator LEDs.
- **No basket / no fragments:** `evidence: []`, `basket.opens_when: "not_used"`. Teams arrive carrying all evidence via the `[C]` Case Dossier (`GET /api/game/round/2/dossier`).

---

## 3. Exact Object IDs (from `content.test.json`)
Every interactive prop must be a real visible 3D mesh tagged with `E.interact(obj, '<exact_id>')`.

- [ ] `core_glass` (`decor` — special horror trigger: bulletproof cracked glass panel on the suspended iron cage with inner handprints & scratches)
- [ ] `countdown_timer` (`decor` — mechanical split-flap board on east wall synced strictly to `GET /api/game/time`, sharp clack-snap per second)
- [ ] `manual_terminal` (`clue_entry`, `R2-08` — heavy cast-iron workstation on west wall facing the cage)
- [ ] `failsafe_panel` (`clue_entry`, `R2-09` — copper & brass switchboard with 8 large knife-switch levers on north wall)
- [ ] `central_console` (`clue_entry`, `R2-10` — monolithic control altar directly facing the cage; requires all 3 Round 2 outputs)

---

## 4. Build Checklist

### Assets & Optimization (`../05_OPTIMIZATION.md`)
- [ ] Source/build & compress Meshopt+WebP GLBs for: concrete dome shell, spherical iron cage + chains, pulsing flesh core, split-flap board, cast-iron terminal, 8-lever knife-switch panel, central altar console.
- [ ] All GLBs within budgets (`≤ 1.5 MB` single / `≤ 8 MB` room total, `< 250` draw calls, Eco-mode compatible).
- [ ] Source audio (`amb_vault`, `core_pulse`, `steel_creak`, split-flap `clack-snap`, stingers).
- [ ] Log all assets in `../07_WORKFLOW_CHECKLIST_ASSET_LOG.md`.

### Integration, UI & Horror
- [ ] Implement `Room6Vault.jsx` + `R2-08`, `R2-09`, `R2-10` clue modals + `[C]` `ControlDossierModal` / `CaseDossierModal` integration.
- [ ] Disable torch on threshold (`setFlashlight(false)`); drive 1.4 s crimson bioluminescence pulse (`E.lightRig` / `E.anim`).
- [ ] Implement situation-based horror events (`core_glass` inspection scare, split-flap countdown tension, final containment victory/ending sequence).
- [ ] Ensure `npm test`, `npm run build`, and Room 6 automated test suite pass; test full Round 2 flow (`records` → Fork 1 → `control` → Fork 2 → `vault`).


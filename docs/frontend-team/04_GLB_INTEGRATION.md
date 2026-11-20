# 04 — Integrating GLBs Safely (without breaking backend or logic)

Reference implementation: `frontend/src/game/engine/sceneControl.js` (Room 5): see `E.loadGLB(...).then(...).catch(...)`,
`normalizeProp`, `batchStaticMeshes`, `visualInteract`, and the `MODEL_BASE` constant.
Engine helpers are in `engine.js` (**read-only for you**): `E.loadGLB`, `E.interact`, `E.add`, `E.solid`,
`E.removeSolid`, `E.visualInteract`, `E.glow`, `E.lightRig`, `E.anim`, `E.bakeShadows`, `E.initPMREM`, `E.W/H/D`.

## Where code goes

| Room | Scene builder (edit) | Room config (edit) | Models | Audio |
|---|---|---|---|---|
| bedroom | `engine/scene.js`, `engine/decor.js` | `rooms/bedroom.js` | `public/assets/models/bedroom/` | `public/assets/audio/bedroom/` |
| study | `engine/studyScene.js` | `rooms/study.js` | `.../models/study/` | `.../audio/study/` |
| basement | `engine/basementScene.js` | `rooms/basement.js` | `.../models/basement/` | `.../audio/basement/` |
| records | `engine/sceneRecords.js`, `engine/scaresRecords.js`, `engine/audioRecords.js` | `rooms/records.js` | `.../models/records/` | `.../audio/records/` |

**Room 6 (vault):** new files `engine/sceneVault.js`, `rooms/vault.js`, `Room6Vault.jsx` and the `engine.js`/`App.jsx` wiring do not exist yet. The lead creates them following the Room 4/5 pattern (`sceneRecords.js`/`sceneControl.js`, `Room4Records.jsx`/`Room5Control.jsx`); this guide then applies unchanged.

Never put GLB loading in `Room*.jsx`, modals, HUD, or `App.jsx`.

## The safe workflow (do the steps in order, commit after each)

### Step 0 — Snapshot
Run `npm test` and walk the room manually. Record: all object IDs working, fragment search working, door working. This is your baseline.

### Step 1 — Shell
1. Load shell GLB → scale to room `size [W,H,D]` → position so floor is `y=0` and the room is centred (engine bounds/spawn assume centred coordinates).
2. Mark shell meshes `userData.np = 1` (non-pickable, like Room 5) so they never steal the `E` target.
3. **Keep** the old procedural shell until the GLB shell loads, then hide/remove it. If load fails, keep the old shell (`.catch`).
4. Re-create collisions: `E.solid(x0,x1,z0,z1)` boxes for walls/large furniture (axis-aligned XZ rectangles). Walk every wall; you must not be able to leave the room or clip into props.
5. Check spawn (`rooms/<id>.js` `spawn`) is inside the room, not inside a prop, facing the room.
6. Door: the door object must keep its exact ID and `engine.openDoor()` must visibly open it. If the GLB door can't animate, keep the old door mesh in that spot, textured to match.

### Step 2 — Interactive props (IDs from `01` §4)
For **each** object ID:
```js
E.loadGLB('/assets/models/study/crt_monitor.glb').then((gltf) => {
  const grp = gltf.scene;
  grp.scale.setScalar(0.9); grp.position.set(0.0, 0.76, -0.8); grp.rotation.y = Math.PI;
  E.interact(grp, 'crt_monitor');   // userData.id = EXACT object_id on every mesh
  E.add(grp);                       // registers meshes for the crosshair raycaster
  // remove the old procedural crt_monitor mesh only now
}).catch((err) => { console.error('[STUDY] crt_monitor.glb failed', err); /* old prop stays */ });
```
Rules:
- ID string = exactly what's in `content*.json` (copy/paste, never retype).
- Prop is a real, visible mesh; **no invisible proxy boxes** (`TODO.md` §1.1.2).
- Reachable: `E` ray length is ~5.5 m (`engine.js`); prop must be reachable by walking and not behind a wall/other prop.
- Hover highlight: keep what the engine does (emissive on hover). If the GLB's materials are shared and highlight bleeds onto other props, use `E.visualInteract(grp, id)` (clones materials per ID).
- Fragment holder props must look like they can hold what the content says (`hiding.spot`).
- **Decoys** (`window`/`radiator` in study, `floor_seal` in basement, `XR01/XR02` holders in records): same quality as real ones.
- Multiple fragments per prop (e.g. `bookshelf`: ES01 + EK03): don't change; the server handles it.

### Step 3 — Decor/filler (no IDs)
- Non-interactive: `userData.np = 1`, no `userData.id`. They must not block paths or sit on top of interactive props.
- Decor IDs from content (`rug`, `pumpkins`, `beams_webs`, …) are still IDs: keep the ID on whatever mesh represents them, even if non-clickable in practice (follow the existing code's behaviour).
- Cobwebs / grime / blood decals: alpha planes (cheap).

### Step 4 — Grade the materials to the room palette
Imported models are usually too bright/colourful. Like Room 5's `getGradedMat`: multiply colours (~0.5), lerp toward the room tint, raise roughness, cut metalness, set `envMapIntensity` low.
Palette per room is in `02`. No glossy "clean" look.

### Step 5 — Lighting hookup
- Don't add dozens of lights. Allowed (per `TODO.md`): 1 shadowed moon/directional, 1 hemisphere ambient, ≤2 dynamic point lights, plus the player torch (spot).
- Use `E.lightRig` / `E.glow` / `E.flick` for flicker. Use emissive materials for monitors/candles.
- Call `E.bakeShadows()` after placing static props (shadow map is `autoUpdate=false` by design).

### Step 6 — Loading UX
Existing `Room*.jsx` handles loading state. Your scene code must not block `createEngine` for the whole GLB download: load async, show props as they arrive (Room 5 uses `reportLoaded(...)` per asset — copy the idea if the room has a loading overlay; otherwise just load async).

### Step 7 — Verify against the contract
Run `01` §8 walkthrough + `npm test` + `npm run build`. Compare against the baseline from Step 0. **Any difference in behaviour = bug in your PR.**

## Hard "don't"s
- ❌ Don't change `Room*.jsx`, modals, HUD, `App.jsx`, `engine.js`, `controls.js`, tests, content, backend.
- ❌ Don't call `fetch('/api/...')` from scene files. Scene code never talks to the backend.
- ❌ Don't hardcode text/answers/fragment IDs. Don't write readable text on props.
- ❌ Don't create `localStorage` keys, global listeners (`window.addEventListener`) without cleanup, or `setInterval` without clearing on dispose.
- ❌ Don't add a second renderer/camera/animation loop. The engine has one loop (`engine.js`).
- ❌ Don't import a model by URL from the internet. Models live in `public/assets/models/<room>/`.
- ❌ Don't leave `.fbx`/`.obj`/uncompressed `.glb` in the repo.
- ❌ Don't use Draco or KTX2-compressed files (loader only has Meshopt; see `05`).

## When GLB can't load (tests/offline/failed download)
The room **must still be playable** with the old procedural props. That means:
- `E.loadGLB` rejection is handled (`.catch`) in every call.
- Tests (jsdom) never load GLBs; they must still pass. Don't make scene code throw when `E.loadGLB` is undefined or mocked.

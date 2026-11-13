# 05 — Optimisation: must run smoothly on very low-end PCs

Every GLB goes through this **before** entering `frontend/public/assets/models/`.
These budgets extend the project's own rules (`TODO.md` §1.1: <250 draw calls, 1 shadowed light, ≤2 dynamic point lights).

## Budgets (hard limits)

| Item | Limit |
|---|---|
| Single GLB | **≤ 1.5 MB** (shell ≤ 2 MB, hero ≤ 1 MB, filler ≤ 400 KB, creature ≤ 2 MB) |
| All models for one room | **≤ 8 MB** |
| Room shell triangles | ≤ 80k after simplify |
| Hero prop / filler | ≤ 15k / ≤ 3k |
| Total visible triangles | ≤ 250k |
| Textures | ≤ 1024 (shell/hero), 512 (filler), 256 (tiny) |
| Materials per room | ≤ 40 |
| Draw calls | **≤ 150 target, < 250 absolute** (`renderer.info.render.calls`) |
| Dynamic lights | ≤ 2 point lights + 1 torch spot; 1 shadow-casting light |
| Audio per room | ≤ 4 MB total (ambient ≤ 1 MB, one-shots ≤ 150 KB) |
| FPS | 60 on laptop iGPU; ≥ 30 at 6× CPU throttle |

The engine already caps pixel ratio at 1.0 and uses baked shadows. Don't undo that.

## Step 1 — Tooling (once)
```bash
npm install --global @gltf-transform/cli
```

## Step 2 — Compress (Meshopt + WebP)
```bash
gltf-transform optimize raw_models/study/crt.glb frontend/public/assets/models/study/crt_monitor.glb \
  --compress meshopt --texture-compress webp --texture-size 512
```
Shell:
```bash
gltf-transform optimize raw_models/study/shell.glb frontend/public/assets/models/study/shell.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 \
  --simplify true --simplify-ratio 0.5 --simplify-error 0.001
```
> **Use `--compress meshopt`. NOT Draco, NOT KTX2.** `engine.js` registers only `MeshoptDecoder`
> (`GLTFLoader.setMeshoptDecoder`). Draco/KTX2 files will fail to load. WebP textures are fine.
> Flags can differ by version: `gltf-transform optimize --help`.

Check: `gltf-transform inspect out.glb` (size, tris, textures). Then **open the result in the glTF viewer**
(https://gltf-viewer.donmccurdy.com/) to be sure compression didn't wreck it.

Non-GLB: `.gltf` → `gltf-transform copy in.gltf out.glb`; `.fbx` → `npx fbx2gltf` or Blender export; `.obj` → Blender → GLB.

## Step 3 — Blender cleanup (big wins)
Delete unseen geometry, merge materials, Decimate (0.3–0.6) for scans, remove embedded cameras/lights/animations, apply transforms, set origin sensibly (bottom-centre for props), 1 unit = 1 metre.

## Code rules (also in AI prompts)
1. Reuse engine helpers; one renderer, one loop.
2. Load once, `clone()` for repeats.
3. Static shadows via `E.bakeShadows()`. Torch doesn't need shadows.
4. Merge static meshes sharing a material (`batchStaticMeshes` pattern in `sceneControl.js`, `BufferGeometryUtils.mergeGeometries`).
5. Dark `FogExp2` is already set by the engine; don't disable (it hides distant cost).
6. No bloom/SSAO/post-processing chains. CSS vignette/grain only.
7. `MeshStandardMaterial`/`MeshLambertMaterial` only. No `MeshPhysicalMaterial` (transmission, clearcoat).
8. Dispose happens in engine cleanup — don't bypass; don't leak listeners/intervals.
9. `matrixAutoUpdate=false` on static props after placement.
10. Lazy-load: shell → hero props → filler → creatures/audio one-shots.

## Test on a weak machine
- DevTools → Performance → **CPU 6× slowdown**, Rendering → FPS meter.
- Disable hardware acceleration in Chrome as worst case: must stay ≥ 20 FPS.
- Append `?debug` to the URL: engine prints `[ctc]` timing laps to the console.
- Check `renderer.info` and Network tab (room should load in <5 s at ~10 Mbps).
- Paste numbers into the PR (`07`).

## Before-commit checklist
- [ ] Within size budgets (`ls -lh`)
- [ ] Meshopt (not Draco/KTX2)
- [ ] Looks right in the viewer after compression
- [ ] `raw_models/` not committed (gitignored)
- [ ] FPS OK at 6× throttle

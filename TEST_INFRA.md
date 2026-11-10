# Test Infrastructure: 4-Tier Opaque-Box Test Architecture for Room 5

## 1. Overview & Test Scope

Room 5 ("The Surveillance Morgue") in **Curse the Code** introduces high-tension live-event escape room mechanics combining Three.js 3D spatial navigation, paranormal entity AI, evidence collection with AI file export tools, forensic multi-step riddle deduction, tactical CCTV monitoring, and safe room boundaries.

To guarantee zero regressions across the existing 179+ test baseline and certify production-grade stability under live-event conditions, this test infrastructure establishes a **4-Tier Opaque-Box Testing Methodology**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   4-Tier Opaque-Box Test Architecture                   │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Category-Partition Feature Coverage                            │
│   • HUD alerts non-overlap                                             │
│   • Evidence popup & basket export actions                             │
│   • Safe room 5B bounds enforcement                                    │
│   • Ghost collision, jumpscare stinger, respawn & evidence drop        │
│   • Multi-step clue deductions (R2-01, R2-05, R2-06)                   │
│   • Tactical CCTV surveillance feeds                                   │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Boundary Value Analysis (BVA) & Corner Cases                   │
│   • Empty inventory death (0 fragments)                                │
│   • Single vs. full inventory death (drop exact most recent item)      │
│   • Successive multiple deaths & dropped item stacking                 │
│   • Safe room threshold border coordinates (Z = 1.84, 1.85, 1.86)     │
│   • Rapid keypress spamming & modal state concurrency                  │
│   • Clue submission boundaries (spaces, casing, 3-attempt lockout)     │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Pairwise Combinatorial Testing (Cross-Feature)                 │
│   • Ghost attack during active document inspection                     │
│   • CCTV tactical feed active while ghost occupies same room           │
│   • Breaker lights toggle during ghost hunt                            │
│   • Chamber 3 access with vs. without Brass Key                        │
│   • Inventory retrieval while clue terminals open                     │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 4: Real-World Workload Testing (Escaperoom Progression)          │
│   • 8-fragment sweep across 6 rooms & wings                            │
│   • Basket modal unlock trigger at 8th fragment                        │
│   • Brass key recovery in Cryo Suite (5E) & Chamber 3 unlatch          │
│   • Sequential multi-source clue solving & vault seal breach           │
│   • Standalone automated scene verification script (verify_room5.mjs)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tier 1: Category-Partition Feature Coverage

The Category-Partition method decomposes the Room 5 specification into functional units, identifying parameter categories, equivalence partitions, and expected behaviors.

### 2.1 HUD Alert Positioning & Layout Non-Overlap
- **Category**: Screen-space notification toasts (`systemNotification`) vs. HUD persistent information (`HUDControl`).
- **Equivalence Classes**:
  - *Class A (Notification active)*: Toast positioned at top-center (`fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none`).
  - *Class B (Top-left HUD status)*: Persistent objective strip and clue hints positioned at top-left (`left: 24px, top: 24px`, `pr-12 pl-3.5 py-2`).
- **Pass Criterion**: Toast bounding box must never intersect top-left objective or clue hint region across viewports ($> 640px$).

### 2.2 Evidence Popup & Basket Modal File Export Utilities
- **Category**: Document inspection and Evidence Basket modals.
- **Equivalence Classes**:
  - *Evidence items (`EC01`–`EC08`, `XC01`–`XC02`)*: Contain title, ref mark, lines, rich metadata, and export actions.
  - *World case files (`ROOM5_WORLD_DOCUMENTS`)*: Contain classification, body/lines, highlight lead, and export actions.
  - *Export Actions*:
    - "Copy Content" pill button: Copies normalized plain text into system clipboard (`navigator.clipboard.writeText`).
    - "Download File" pill button: Generates downloadable text file (`[id]_[title].txt`).
- **Pass Criterion**: Every document opened during gameplay provides working RE-style capsule pills (`.re-btn`, `.re-btn-circle`) for clipboard copy and file download.

### 2.3 Safe Room 5B Bounds Enforcement
- **Category**: Spatial coordinates $(x, z)$ vs. Safe Room 5B boundary definition.
- **Definition**: `isInsideSafeRoom5B(x, z)` returns `true` if $x \in [-3.45, 3.45]$ and $z \le 1.85$.
- **Equivalence Classes**:
  - *Inside Safe Room*: $x \in [-3.45, 3.45], z \le 1.85 \implies$ Ghost entity cannot enter; coordinates clamped or hunt halted at threshold $Z \ge 2.15$.
  - *Outside Safe Room*: $z > 1.85$ or $|x| > 3.45 \implies$ Player is in outer corridor or wings; ghost hunt permitted.
- **Pass Criterion**: Ghost AI pathfinding strictly avoids entering Control Room 5B ($Z < 2.15$).

### 2.4 Ghost Collision, Jumpscare & Death Penalty
- **Category**: Ghost entity proximity to player outside safe room.
- **Trigger**: Distance between player $(cx, cz)$ and ghost $(gx, gz)$ $\le 1.35$m while `!isInsideSafeRoom5B(cx, cz)`.
- **Consequences**:
  1. Horror jumpscare stinger (`audio.stinger('extreme')`), crimson flash, screaming phantom face overlay.
  2. Player teleported to Control Room 5B spawn point: `[-0.2, 0.1, -1.35]`.
  3. Player drops exactly 1 collected evidence item at death point `(deathX, 0.05, deathZ)` with interactive prop `dropped_evidence`.
  4. Player can return to death site, hover, and press `[E]` to recover the dropped item back into inventory.

### 2.5 Multi-Step Clue Deductions
- **Category**: Forensic cryptographic riddle terminals.
- **Invariants**:
  - `R2-01` (`staff_terminal`): Solution `'BDG-9001'` derived from cross-referencing evacuation date (14 AUG 1983) + Corvin requisition memo + Active research badge database.
  - `R2-05` (`radio_console`): Solution `'VM-A'` derived from matching BDG-9001 authorization header (`QkRHLTkwMDE=`) with tape loop index.
  - `R2-06` (`sound_console`): Solution `'8140'` derived from VM-A HIGH band (65–80%) BCD-8421 / Morse frame extraction.
- **Pass Criterion**: Clue solutions validate correctly; multi-step hint trees require $\ge 2$ document cross-references.

### 2.6 Tactical CCTV Surveillance Feeds
- **Category**: Multi-camera CRT monitoring array (`CCTVMonitorModal`).
- **Equivalence Classes**:
  - 6 distinct channels: CAM-01 (Entry Airlock), CAM-02 (Control Bay), CAM-03 (Locker Annex), CAM-04 (Containment Glass), CAM-05 (Main Hall), CAM-06 (Blind Angle CRT-6).
  - Tactical IR Filter (`[T]` key): Uncovers hidden environmental markings (e.g. 8140 Hz resonance on CAM-03, Brass Key glint on CAM-05).
  - Ghost sector tracking: Threat indicator updates dynamically based on ghost 3D sector location.

---

## 3. Tier 2: Boundary Value Analysis (BVA) & Corner Cases

Boundary Value Analysis tests inputs and states at the extreme edges of validity and transitions.

| ID | Boundary Scenario | Test Input / Coordinate | Expected Outcome |
|---|---|---|---|
| **BVA-01** | Empty inventory death | Player killed with 0 fragments collected (`collected_fragment_ids: []`) | No dropped item spawned; player respawns at `[-0.2, 0.1, -1.35]`; no exceptions thrown. |
| **BVA-02** | Single item death | Player killed with exactly 1 fragment (`['EC01']`) | Exactly 1 item dropped; inventory count becomes 0; recovering restored count to 1. |
| **BVA-03** | Full inventory death | Player killed with 8 fragments (`['EC01'..'EC08']`) | Most recent fragment (`EC08`) dropped; 7 remain; basket re-locks if lock condition requires 8 active items. |
| **BVA-04** | Multiple deaths | Player killed twice in succession at distinct points `(x1, z1)` and `(x2, z2)` | Two distinct dropped items placed in world; each can be retrieved independently. |
| **BVA-05** | Safe room Z-threshold (inside) | Player at $X = 0.0, Z = 1.84$ | `isInsideSafeRoom5B(0.0, 1.84) === true`; ghost hunt cannot reach player. |
| **BVA-06** | Safe room Z-threshold (boundary) | Player at $X = 0.0, Z = 1.85$ | `isInsideSafeRoom5B(0.0, 1.85) === true`; safe zone intact. |
| **BVA-07** | Safe room Z-threshold (outside) | Player at $X = 0.0, Z = 1.86$ | `isInsideSafeRoom5B(0.0, 1.86) === false`; player is vulnerable to ghost attack. |
| **BVA-08** | Safe room X-threshold (west boundary) | Player at $X = -3.45, Z = 0.0$ | Safe (`true`). |
| **BVA-09** | Safe room X-threshold (west outside) | Player at $X = -3.46, Z = 0.0$ | Outside (`false`). |
| **BVA-10** | Safe room X-threshold (east boundary) | Player at $X = +3.45, Z = 0.0$ | Safe (`true`). |
| **BVA-11** | Safe room X-threshold (east outside) | Player at $X = +3.46, Z = 0.0$ | Outside (`false`). |
| **BVA-12** | Rapid keypress concurrency | Spamming `['e', 'b', 'c', 'Escape']` within 50ms intervals | Modals toggle without state lockups or broken pointer lock handlers. |
| **BVA-13** | Clue answer whitespace & casing | Submissions `' bdg-9001 '`, `'vm-a'`, `' 8140 '` | Normalization handles trimming and casing consistently. |
| **BVA-14** | Clue attempt exhaustion lockout | 3 incorrect submissions to R2-01 | Terminal locks (`exhausted: true`, `attempts_remaining: 0`); top-left HUD prompt indicates lockout reboot required. |

---

## 4. Tier 3: Pairwise Combinatorial Testing

Pairwise combinatorial testing systematically pairs every state variable across features to detect unexpected cross-feature interactions.

### Factors and Levels:
1. **Player State ($P$)**: $\{ P_1: \text{Free Roam}, P_2: \text{Hunted}, P_3: \text{Dying/Respawning} \}$
2. **Modal / UI State ($M$)**: $\{ M_1: \text{None}, M_2: \text{Document Popup}, M_3: \text{Evidence Basket}, M_4: \text{CCTV}, M_5: \text{Clue Terminal} \}$
3. **Ghost Location ($G$)**: $\{ G_1: \text{North Wings}, G_2: \text{Main Corridor}, G_3: \text{Same Room (within 3m)} \}$
4. **Environment / Key ($E$)**: $\{ E_1: \text{Breaker ON / Key absent}, E_2: \text{Breaker OFF / Key carried} \}$

### Key Interaction Test Cases:
- **PAIR-01 ($P_3 \times M_2$)**: Player killed while inspecting an evidence document popup.
  - *Assertion*: Document popup closes or remains stable; player respawns in 5B; dropped item appears at death coordinates.
- **PAIR-02 ($M_4 \times G_3$)**: Opening CCTV terminal while ghost is in immediate proximity.
  - *Assertion*: CCTV CAM-02 indicates high threat level; ghost static burst renders on screen.
- **PAIR-03 ($P_2 \times E_2$)**: Toggling wall breaker / flashlight while being hunted by ghost.
  - *Assertion*: Ambient light transitions correctly; ghost chase sound tension remains active.
- **PAIR-04 ($M_5 \times E_1$)**: Interacting with Chamber 3 containment door without Brass Key vs. with Brass Key.
  - *Assertion*: Without key, rattles with prompt: "Chamber 3 is deadbolted"; with key, door swings open.

---

## 5. Tier 4: Real-World Workload Testing

Tier 4 verifies the end-to-end player escape room journey from room entry to vault exit under realistic conditions:

```
[Start Splash Screen]
         │ (Press Enter / Click Start)
         ▼
[Sweep Room 5B, 5C, 5D, 5E, 5F] ──> Collect 8 Fragments (EC01..EC08)
         │
         ▼
[Evidence Basket Unlocks] ──────────> Modal opens via [B]; export buttons active
         │
         ▼
[Cryo Suite (5E) Exploration] ──────> Collect Brass Key; unlock Chamber 3
         │
         ▼
[Inspect Documents & Audio] ────────> Cross-reference logs, teletype, & CCTV
         │
         ▼
[Solve Staff Terminal (R2-01)] ─────> Submit "BDG-9001" (1/3 Consoles Solved)
         │
         ▼
[Solve Radio Console (R2-05)] ──────> Submit "VM-A" (2/3 Consoles Solved)
         │
         ▼
[Solve Sound Console (R2-06)] ──────> Submit "8140" (3/3 Consoles Solved)
         │
         ▼
[Vault Seal Release] ───────────────> Bulkhead opens; RoomCompleteModal displays
```

---

## 6. Standalone Verification Engine (`verify_room5.mjs`)

The project includes `verify_room5.mjs` at the workspace root, an automated zero-dependency ES module script that validates:
1. **Doorway clearances**:
   - Control Room 5B door gap ($X \in [0.46, 1.58]$, width $= 1.12$m $> 0.8$m).
   - Annex door gap ($X \in [-1.74, -1.46], Z \in [8.84, 9.96]$, width $= 1.12$m).
   - Observation door gap ($X \in [-8.02, -7.68], Z \in [7.26, 8.42]$, width $= 1.16$m).
   - Chamber 3 door gap ($X \in [-11.14, -10.80], Z \in [7.26, 8.42]$, width $= 1.16$m).
   - Cryo door gap ($X \in [-6.01, -5.01]$, width $= 1.00$m).
   - Generator door gap ($X \in [-10.69, -9.69]$, width $= 1.00$m).
2. **Collision boxes & walking lanes**:
   - `sound_console` North wall desk ($X \in [-10.15, -8.35], Z \in [12.18, 13.10]$).
   - Walking lane clearance along $Z \in [7.84, 12.18]$ ($> 0.45$m navigable lane).
3. **Safe Room 5B bounds & Ghost barrier**:
   - Mathematical boundary check: `isInsideSafeRoom5B(x, z)`.
   - Ghost clamping: ghost $Z \ge 2.15$.
4. **Interactable coordinates**:
   - Verification of all 13 interactive hotspots.
5. **Offline simulation progression**:
   - Full 8-fragment collection, basket unlock, clue submission, lockout reset, and room completion.

---

## 7. How to Run the Tests

To run the Vitest frontend suite (including existing 179+ tests and the new Room 5 E2E suite):
```bash
cd frontend && pnpm test -- --run
```

To run the standalone scene and progression verification script:
```bash
node verify_room5.mjs
```

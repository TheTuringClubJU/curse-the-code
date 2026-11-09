# RE4 Horror Architecture Templates for Curse the Code

This directory contains reverse-engineered Resident Evil 4 level templates, item interaction data, and horror pacing blueprints curated specifically for the 6 rooms of **Curse the Code**:

- Round 1:
  - Room 1: Lena's Bedroom (Blueprint: RE4 Cabin / Approach)
  - Room 2: Daniel's Study (Blueprint: RE4 Farm Study)
  - Room 3: The Basement Bunker (Blueprint: RE4 Underground Tunnel)
- Round 2:
  - Room 4: The Rotting Archive (`records`) (Blueprint: RE4 Castle Archives)
  - Room 5: The Surveillance Morgue (`control`) (Blueprint: RE4 Island Surveillance Lab)
  - Room 6: The Anointing Vault (`vault`) (Blueprint: RE4 Ancient Altar Vault)

### File Guide:
1. `rooms_blueprint.json`: Contains the exact dimensions, atmospheric fog/lighting, door exit links, and scare trigger mappings for all 6 rooms.
2. `items_catalog.json`: RE4 inventory items with grid dimensions (W x H) and combination mechanics (for puzzle pieces and fragments).
3. `sample_room_spawns.json`: Precise 3D coordinate schema (X, Y, Z in meters) for clues, fragments, inspectables, and trigger zones.

### Instruction for Antigravity AI:
Use `rooms_blueprint.json` and `sample_room_spawns.json` as the structural template when implementing or updating:
- 3D props and lighting in `frontend/src/game/engine/sceneControl.js` & `sceneRecords.js`.
- Situational jumpscares and stingers in `frontend/src/game/engine/scaresControl.js` & `scaresRecords.js`.
- Interactive fragment pickup hitboxes and clues in `Room5Control.jsx` and `Room4Records.jsx`.

// re4RoomAdapter.js
// Bridges Resident Evil 4 room data and item placement into Curse the Code's Three.js horror engine.
import * as THREE from 'three';
import re4Rooms from './re4RoomsCatalog.json';
import re4Items from './re4ItemsCatalog.json';

export class RE4RoomAdapter {
    constructor(engine, scareDirector, adminSocket) {
        this.engine = engine; // Curse the Code engine instance (Three.js Scene, Camera, Controls)
        this.scareDirector = scareDirector; // scares.js instance
        this.adminSocket = adminSocket; // WebSocket/SSE connection to Admin Dashboard
        this.currentRoom = null;
        this.activeProps = [];
        this.triggerZones = [];
    }

    /**
     * Loads a room by RE4 ID (e.g. 'r100', 'r101', 'r200')
     */
    loadRoom(roomId) {
        const roomData = re4Rooms.find(r => r.id === roomId);
        if (!roomData) {
            console.error(`[RE4Adapter] Room ${roomId} not found in catalog.`);
            return false;
        }

        this.currentRoom = roomData;
        console.log(`[RE4Adapter] Loading Room: ${roomData.title}`);

        // 1. Apply atmospheric horror lighting to Curse the Code scene
        if (roomData.atmosphere && this.engine.sc) {
            this.engine.S.fog = new THREE.FogExp2(roomData.atmosphere.fog, 0.08);
            if (this.engine.ref && this.engine.ref.ambient) {
                this.engine.ref.ambient.color.set(roomData.atmosphere.ambient);
            }
        }

        // 2. Notify Admin Panel of room entry
        this.notifyAdmin('ROOM_ENTER', {
            roomId: roomData.id,
            title: roomData.title,
            timestamp: Date.now()
        });

        // 3. Register scare triggers for this room
        this.setupScareHooks(roomData.scare_hooks);
        return true;
    }

    /**
     * Maps RE4 coordinates (mm) to Three.js world space (meters)
     */
    toWorldCoords(re4Vec, scale = 0.01) {
        return new THREE.Vector3(re4Vec.x * scale, re4Vec.y * scale, re4Vec.z * scale);
    }

    /**
     * Spawns an interactive clue or item in the room
     */
    spawnClueOrItem(itemId, pos, options = {}) {
        const itemDef = re4Items.items.find(i => i.item_id === itemId) || { name: 'Unknown Clue', category: 'Clue' };
        
        // Create interactive prop mesh
        const geom = new THREE.BoxGeometry(0.3, 0.2, 0.1);
        const mat = new THREE.MeshStandardMaterial({
            color: options.glowColor || 0xc8b89a, // bone / aged document color
            roughness: 0.8
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(pos);
        mesh.userData = {
            isInteractable: true,
            itemId: itemId,
            name: itemDef.name,
            action: options.onInspect || null
        };

        this.engine.S.add(mesh);
        this.activeProps.push(mesh);
        return mesh;
    }

    /**
     * Binds RE4 event trigger zones to Curse the Code jump scares
     */
    setupScareHooks(hooks) {
        this.triggerZones = [];
        for (const hook of hooks) {
            this.triggerZones.push({
                hook: hook,
                triggered: false,
                trigger: () => {
                    if (this.scareDirector && typeof this.scareDirector.trigger === 'function') {
                        this.scareDirector.trigger(hook.scare);
                        this.notifyAdmin('SCARE_TRIGGERED', {
                            roomId: this.currentRoom?.id,
                            scareType: hook.scare,
                            hook: hook.trigger
                        });
                    }
                }
            });
        }
    }

    /**
     * Frame update: checks player position against scare trigger zones
     */
    tick(playerPos) {
        for (const zone of this.triggerZones) {
            if (!zone.triggered && zone.hook.area) {
                const dist = playerPos.distanceTo(zone.hook.area.pos);
                if (dist < zone.hook.area.radius) {
                    zone.triggered = true;
                    zone.trigger();
                }
            }
        }
    }

    /**
     * Sends telemetry and events to the Admin Dashboard
     */
    notifyAdmin(eventType, payload) {
        if (this.adminSocket && this.adminSocket.readyState === WebSocket.OPEN) {
            this.adminSocket.send(JSON.stringify({ event: eventType, data: payload }));
        }
    }
}

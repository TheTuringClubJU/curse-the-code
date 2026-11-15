import * as THREE from 'three';

// Both door leaves and their stone surrounds come from the same downloaded assembly.
export function buildStudyDoors(E, {model, add, wood, iron}) {
  for (const side of [-1, 1]) {
    const z = side * (E.D / 2 - .16);
    const id = side < 0 ? 'study_door_exit' : null;
    const fallback = new THREE.Group(), hinge = new THREE.Group();
    fallback.position.z = z; hinge.position.x = -.63; fallback.add(hinge);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.26, 2.5, .12), side < 0 ? iron : wood);
    leaf.position.set(.63, 1.25, 0); hinge.add(leaf);
    fallback.name = side < 0 ? 'study-exit-fallback' : 'study-entry-door';
    add(fallback, id);
    E.solid(-.8, .8, z - .12, z + .12);
    if (side < 0) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({color:0x7e3828}));
      bulb.position.set(0, 2.87, z + .12); add(bulb);
      E.ref.studyExitDoor = {hinge, angle:0, isOpen:false, scriptOpen:false, unlocked:false, beaconBulb:bulb};
      E.anim((_t, dt) => {
        const door = E.ref.studyExitDoor;
        door.angle += ((door.isOpen||door.scriptOpen ? 1.5 : 0) - door.angle) * Math.min(1, dt * 3);
        door.hinge.rotation.y = door.angle;
        bulb.material.color.setHex(door.unlocked ? 0x647f66 : 0x7e3828);
      });
    }
    // Source bounds include the steps below the leaf; keep them under the floor.
    model('gothic_door', id, [0, -.53, z - side * .365], [1.9, 3.2, 1], side > 0 ? Math.PI : 0, fallback, assembly => {
      const importedLeaf = assembly.getObjectByName('door_iron_low_wood_0');
      if (!importedLeaf) throw new Error('Gothic door leaf is missing');
      // The entry door is sealed scenery, including during the haunting.
      if (side > 0) {assembly.name = 'study-entry-door'; return;}
      assembly.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(importedLeaf);
      const pivot = new THREE.Group();
      pivot.name = 'study-door-hinge-' + id;
      pivot.position.set(side < 0 ? b.min.x : b.max.x, 0, (b.min.z + b.max.z) / 2);
      E.S.add(pivot); pivot.attach(importedLeaf);
      importedLeaf.traverse(o => {
        if (o.isMesh) {
          o.material = o.material.clone(); o.material.side = THREE.DoubleSide;
          if (side < 0) { o.material.color.multiplyScalar(.62); o.material.roughness = .88; }
        }
      });
      E.ref.studyExitDoor.hinge = pivot;
    });
  }
}

import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { buildStudy } from '../game/engine/studyScene.js';
import config from '../game/rooms/study.js';

function scene(loadGLB) {
  const E={S:new THREE.Scene(),W:config.size[0],H:config.size[1],D:config.size[2],ref:{},anims:[],solids:[],cleanups:[],loadGLB,
    anim(fn){this.anims.push(fn);},solid(...box){this.solids.push(box);},
    interact(root,id){root.traverse(o=>{if(o.isMesh){o.userData.id=id;delete o.userData.np;}});},
    add(root){this.S.add(root);},onDispose(fn){this.cleanups.push(fn);},
    retire:vi.fn(root=>{root.visible=false;}),reportStudyAsset:vi.fn(),bakeShadows:vi.fn()};
  // Builders receive bound engine helpers.
  for(const key of ['anim','solid','interact','add'])E[key]=E[key].bind(E);
  buildStudy(E);return E;
}
function ids(E){const result=new Set();E.S.traverse(o=>{if(o.userData.id)result.add(o.userData.id);});return result;}

describe('Study actual Three.js scene contract',()=>{
  it('keeps visible fallbacks and all content props, plus a forward exit and sealed entry without a loader',()=>{
    const E=scene();const present=ids(E);
    for(const id of Object.keys(config.objectCoordinates))expect(present.has(id),id).toBe(true);
    expect(E.ref.studyExitDoor.isOpen).toBe(false);
    expect(E.ref.studyHorror.runner).toBeUndefined();
    for(const [x0,x1,z0,z1] of E.solids){
      const [x,,z]=config.spawn;
      expect(x>=x0&&x<=x1&&z>=z0&&z<=z1).toBe(false);
    }
  });
  it('keeps the room playable when every GLB fails',async()=>{
    const E=scene(()=>Promise.reject(new Error('offline')));
    await vi.waitFor(()=>{const p=E.reportStudyAsset.mock.lastCall[0];expect(p.total).toBeGreaterThan(0);expect(p.failed).toBe(p.total);expect(p.loaded).toBe(0);});
    expect(E.retire).not.toHaveBeenCalled();
    expect(ids(E).has('crt_monitor')).toBe(true);
  });
  it('only retires each fallback after a valid replacement is registered',async()=>{
    const loader=vi.fn(async()=>{const root=new THREE.Group();for(const name of ['Object_2','Object_7','door_iron_low_wood_0','cuadro_5_Cuadros_0','cuadro_12_Cuadros_0','cuadro_7_Cuadros_0','cuadro_14_Cuadros_0','cuadro_18_Cuadros_0','metal_trash_can_rust','cable_double_uturn','cobweb001_0','cobweb004_0','Book3_Book3_0','Book7_Book7_0','Book12_Book12_0','Cube001__0','console_drawer']){const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());m.name=name;if(name==='console_drawer')m.scale.y=.1;root.add(m);}return {scene:root};});const E=scene(loader);
    await vi.waitFor(()=>{const p=E.reportStudyAsset.mock.lastCall[0];expect(p.loaded).toBe(p.total);expect(p.failed).toBe(0);});
    const urls=loader.mock.calls.map(c=>c[0]);expect(new Set(urls).size).toBe(urls.length);
    expect(E.retire).toHaveBeenCalled();
    expect(E.S.getObjectByName('study-model-computer')).toBeDefined();
    expect(E.ref.studyExitDoor.isOpen).toBe(false);const entry=E.S.children.find(o=>o.name==='study-entry-door'&&o.userData.studyAsset==='gothic_door');expect(entry).toBeDefined();entry.traverse(o=>expect(o.userData.id).toBeUndefined());expect(entry.getObjectByName('door_iron_low_wood_0').parent.name).not.toContain('study-door-hinge');
  });
  it('keeps outdoor haze bounded and the moon visible without adding another light',()=>{
    const E=scene(),fog=E.S.getObjectByName('study-valley-mist'),moon=E.S.getObjectByName('study-blood-moon');
    expect(fog.isInstancedMesh).toBe(true);expect(fog.count).toBe(5);expect(fog.material.depthWrite).toBe(false);
    expect(moon.isSprite).toBe(true);expect(moon.material.fog).toBe(false);expect(moon.userData.id).toBeUndefined();
    expect(E.S.background.getHex()).toBe(E.S.fog.color.getHex());
  });
  it('does not attach late models after scene disposal',async()=>{
    const pending=[];const E=scene(()=>new Promise(resolve=>pending.push(resolve)));
    E.cleanups.forEach(fn=>fn());
    pending.forEach(resolve=>resolve({scene:new THREE.Group()}));
    await Promise.resolve();
    expect(E.retire).not.toHaveBeenCalled();
    expect(E.S.children.some(o=>o.name.startsWith('study-model-'))).toBe(false);
  });
  it('keeps glass outside the interaction highlight and the castle at real exterior depth',()=>{
    const E=scene();
    const glass=E.S.getObjectByName('study-rain-glass');
    expect(glass).toBeDefined();expect(glass.userData.id).toBeUndefined();expect(glass.material.opacity).toBeLessThan(.25);expect(glass.material.map.isCanvasTexture).toBe(true);
    const terrain=E.S.getObjectByName('study-exterior-ground');expect(new THREE.Box3().setFromObject(terrain).max.x).toBeGreaterThan(200);expect(E.S.fog.density).toBeGreaterThan(0);
    // Exterior geometry comes from its GLB, never from generated cones/cylinders.
    expect(E.S.children.some(o=>o.geometry?.type==='ConeGeometry')).toBe(false);
  });
  it('animates the drawer on inspection without changing completion',()=>{
    const E=scene();let drawer;
    E.S.traverse(o=>{if(o.isGroup && o.children.some(c=>c.userData.id==='tablet_drawer'))drawer=o;});
    const before=drawer.position.z;E.ref.onStudyInteract({type:'inspect',objectId:'tablet_drawer'});
    E.anims.forEach(fn=>fn(1,.2));expect(drawer.position.z).toBeGreaterThan(before);
    expect(E.ref.studyExitDoor.isOpen).toBe(false);
  });
  it('mounts the terminal texture on the sanitized GLTF screen node',async()=>{
    const E=scene(async()=>{const root=new THREE.Group();const face=new THREE.Mesh(new THREE.BoxGeometry(.1,.4,.65),new THREE.MeshStandardMaterial());face.name='Cube001__0';root.add(face);return {scene:root};});
    await vi.waitFor(()=>expect(E.ref.studyHorror.screenMaterial?.map?.isCanvasTexture).toBe(true));
    const pc=E.S.getObjectByName('study-model-computer');const face=pc.getObjectByName('Cube001__0');
    expect(face.material.type).toBe('MeshBasicMaterial');
    expect(face.geometry.attributes.uv.count).toBe(face.geometry.attributes.position.count);
    expect(pc.rotation.y).toBeCloseTo(Math.PI/2);
    expect(()=>E.ref.updateStudyDisplays({basketUnlocked:true,completed:true})).not.toThrow();
  });
  it('keeps the new recorder and lamp above floor level with an appropriate support asset',async()=>{
    const E=scene();
    const positions={};E.S.traverse(o=>{if(o.isGroup&&o.children.some(c=>c.userData.id==='reel_recorder'))positions.recorder=o.position.y;if(o.isGroup&&o.children.some(c=>c.userData.id==='floor_lamp'))positions.lamp=o.position.y;});
    expect(positions.recorder).toBeCloseTo(.465);expect(positions.lamp).toBeCloseTo(.91);
  });

  it('keeps the south entry sealed and only the north exit interactive',()=>{
    const E=scene();E.S.updateMatrixWorld(true);const entry=E.S.getObjectByName('study-entry-door');expect(entry).toBeDefined();entry.traverse(o=>{expect(o.userData.id).toBeUndefined();});E.anims.forEach(fn=>fn(10,1));expect(entry.children[0].rotation.y).toBe(0);const structure=[];
    E.S.traverse(o=>{if(o.isMesh&&!o.userData.id)structure.push(o);});
    for(const side of [-1,1]){
      const ray=new THREE.Raycaster(new THREE.Vector3(0,1.6,side*4),new THREE.Vector3(0,0,side),0,1);
      if(side<0)expect(ray.intersectObjects(structure,false)).toHaveLength(0);else expect(ray.intersectObjects(structure,false).length).toBeGreaterThan(0);
      const corner=new THREE.Raycaster(new THREE.Vector3(.7,2.5,side*4),new THREE.Vector3(0,0,side),0,1);
      expect(corner.intersectObjects(structure,false).length).toBeGreaterThan(0);
    }
  });

});

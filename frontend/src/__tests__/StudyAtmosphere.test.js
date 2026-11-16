import {it,expect} from 'vitest';
import * as THREE from 'three';
import {buildStudyAtmosphere,createStudyMist,createStudyRainGlass} from '../game/engine/studyAtmosphere.js';
function scene(){const E={S:new THREE.Scene(),anims:[],anim(fn){this.anims.push(fn);}};buildStudyAtmosphere(E,{add:g=>E.S.add(g)});return E;}
it('keeps blood and mist cosmetic so original evidence and navigation IDs remain authoritative',()=>{
 const E=scene();expect(E.S.getObjectByName('study-blood-spills').count).toBe(4);
 expect(E.S.getObjectsByProperty('name','study-blood-writing')).toHaveLength(2);
 E.S.traverse(o=>{if(o.isMesh){expect(o.userData.id).toBeUndefined();expect(o.userData.np).toBe(1);expect(o.userData.ns).toBe(1);}});
});
it('renders indoor smoke as one bounded instanced draw and pauses drift for menus',()=>{
 const E=scene(),mist=E.S.getObjectByName('study-interior-mist');expect(mist.isInstancedMesh).toBe(true);expect(mist.count).toBe(5);expect(mist.material.depthWrite).toBe(false);
 E._studyState={paused:true};E.anims.forEach(fn=>fn(20));expect(mist.position.x).toBe(0);
 E._studyState.paused=false;E.anims.forEach(fn=>fn(20));expect(mist.position.x).not.toBe(0);
});
it('builds billboarded fog without adding shadow casters or dense volumetric geometry',()=>{
 const mist=createStudyMist({},[[0,0,0,3,1]]);expect(mist.geometry.attributes.position.count).toBe(4);expect(mist.castShadow).toBe(false);expect(mist.material.fog).toBe(true);
});
it('places a pool below the bookshelf message and batches three ceiling splashes',()=>{
 const E=scene(),matrix=new THREE.Matrix4(),p=new THREE.Vector3();E.S.getObjectByName('study-blood-spills').getMatrixAt(3,matrix);p.setFromMatrixPosition(matrix);
 expect(p.x).toBeCloseTo(-3.55);expect(p.z).toBeCloseTo(-1.2);expect(p.y).toBeLessThan(.03);
 expect(E.S.getObjectByName('study-ceiling-blood').count).toBe(3);
});
it('uses a single textured glass quad for rain with no white line geometry',()=>{
 const glass=createStudyRainGlass();expect(glass.geometry.attributes.position.count).toBe(4);expect(glass.material.map.isCanvasTexture).toBe(true);expect(glass.material.depthWrite).toBe(false);expect(glass.userData.id).toBeUndefined();
});

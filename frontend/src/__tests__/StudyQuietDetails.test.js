import {it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {buildStudyQuietDetails,createStudyQuietDetails} from '../game/engine/studyQuietDetails.js';
function setup(){
 const player={x:0,z:2};const E={S:new THREE.Scene(),ref:{studyExitDoor:{isOpen:false},studyProcession:{hand:{visible:false}}},px:()=>player.x,pz:()=>player.z,cam:new THREE.PerspectiveCamera(),audio:{playClip:vi.fn()}};
 buildStudyQuietDetails(E,{add:g=>E.S.add(g)});const details=createStudyQuietDetails(E);return {E,player,details,tick:(seconds)=>{for(let t=0;t<seconds;t+=.1)details.tick(.1);}};
}
it('retreats two door shadows once on approach without opening the real door',()=>{
 const {E,player,details,tick}=setup();details.tick(.1);expect(E.ref.studyQuiet.feet.count).toBe(2);expect(E.ref.studyQuiet.feet.visible).toBe(true);player.z=-3;tick(3.2);expect(E.ref.studyQuiet.feet.visible).toBe(false);expect(E.audio.playClip).toHaveBeenCalledOnce();expect(E.ref.studyExitDoor.isOpen).toBe(false);player.z=2;tick(10);expect(E.audio.playClip).toHaveBeenCalledOnce();
});
it('reveals a bounded footprint trail only after crossing blood and moving away',()=>{
 const {E,player,details,tick}=setup();player.x=-3.55;player.z=-1.2;tick(2);expect(E.ref.studyQuiet.prints.count).toBe(0);player.x=-2;details.tick(.1);tick(5);expect(E.ref.studyQuiet.prints.count).toBe(0);
 for(let i=0;i<15;i++){player.z+=.8;tick(1);}expect(E.ref.studyQuiet.prints.count).toBeGreaterThanOrEqual(4);expect(E.ref.studyQuiet.prints.count).toBeLessThanOrEqual(8);expect(E.ref.studyQuiet.prints.userData.id).toBeUndefined();expect(E.ref.studyQuiet.prints.castShadow).toBe(false);
 const m=new THREE.Matrix4();E.ref.studyQuiet.prints.getMatrixAt(E.ref.studyQuiet.prints.count-1,m);const last=new THREE.Vector3().setFromMatrixPosition(m);expect(last.z).toBeLessThan(player.z);expect(Math.abs(last.x+2)).toBeCloseTo(.1);
 expect(new THREE.Vector3(0,1,0).transformDirection(m).z).toBeGreaterThan(.99);
});
it('makes the cloth breathe once, then reveals the downloaded hand on a later glance',()=>{
 const {E,player,details,tick}=setup();const body=new THREE.Group();body.position.set(3.8,.015,3.85);E.ref.studyQuiet.body=body;player.x=3;player.z=2.3;E.cam.position.set(3,1.6,2.3);E.cam.lookAt(3.8,.15,3.85);E.cam.updateMatrixWorld();tick(2.5);expect(body.scale.y).toBeGreaterThan(1);tick(2.7);expect(body.scale.y).toBe(1);expect(E.ref.studyProcession.hand.visible).toBe(false);
 E.cam.lookAt(-4,1.6,0);E.cam.updateMatrixWorld();tick(10);expect(E.ref.studyProcession.hand.visible).toBe(false);E.cam.lookAt(3.8,.15,3.85);E.cam.updateMatrixWorld();tick(.2);expect(E.ref.studyProcession.hand.visible).toBe(true);tick(10);expect(body.scale.y).toBe(1);details.dispose();expect(body.scale.y).toBe(1);
});

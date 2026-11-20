import {it,expect,vi,afterEach} from 'vitest';
import * as THREE from 'three';
import {createStudyWindowGhost} from '../game/engine/studyWindowGhost.js';
function setup(reduced=false){
 const ghost=new THREE.Mesh(new THREE.BoxGeometry(.7,2,.6),new THREE.MeshStandardMaterial({transparent:true,opacity:.94}));ghost.position.set(6.4,.85,.6);
 const E={W:11,cam:new THREE.PerspectiveCamera(72,1,.05,240),_studyState:{started:true,paused:false}};
 E.cam.position.set(3,1.6,.6);E.cam.lookAt(6.4,2.25,.6);E.cam.updateMatrixWorld();
 const sighting=createStudyWindowGhost(E,ghost,{reduced,random:()=>0});return {E,ghost,sighting,tick:n=>{for(let i=0;i<n;i++)sighting.tick(.1);}};
}
afterEach(()=>vi.restoreAllMocks());
it('waits for a deliberate direct look, then retreats slowly to the viewer right and disappears',()=>{
 const {ghost,sighting,tick}=setup();tick(3);expect(ghost.position.z).toBe(.6);tick(2);expect(ghost.position.z).toBeGreaterThan(.6);expect(ghost.position.z).toBeLessThan(1);expect(ghost.visible).toBe(true);
 tick(47);expect(ghost.visible).toBe(false);expect(sighting.getPhase()).toBe('absent');const z=ghost.position.z;tick(100);expect(ghost.position.z).toBe(z);
});
it('does not trigger while looking away or through the opaque wall beside the window',()=>{
 const {E,ghost,tick}=setup();E.cam.lookAt(-4,1.6,0);E.cam.updateMatrixWorld();tick(10);expect(ghost.position.z).toBe(.6);
 E.cam.position.set(5.45,1.6,3.9);E.cam.lookAt(6.4,2.25,.6);E.cam.updateMatrixWorld();tick(10);expect(ghost.position.z).toBe(.6);
});
it('requires continuous attention instead of adding several accidental glances',()=>{
 const {E,ghost,tick}=setup();for(let i=0;i<6;i++){E.cam.lookAt(6.4,2.25,.6);E.cam.updateMatrixWorld();tick(2);E.cam.lookAt(-4,1.6,0);E.cam.updateMatrixWorld();tick(1);}expect(ghost.position.z).toBe(.6);
});
it('pauses before entry, in menus and in hidden tabs',()=>{
 const {E,ghost,tick}=setup();E._studyState.started=false;tick(50);E._studyState.started=true;E._studyState.paused=true;tick(50);E._studyState.paused=false;
 vi.spyOn(document,'hidden','get').mockReturnValue(true);tick(50);expect(ghost.position.z).toBe(.6);vi.restoreAllMocks();tick(5);const z=ghost.position.z;E._studyState.paused=true;tick(30);expect(ghost.position.z).toBe(z);
});
it('uses a gentle stationary fade for reduced motion',()=>{
 const {ghost,sighting,tick}=setup(true);tick(20);expect(ghost.position.z).toBe(.6);expect(ghost.visible).toBe(false);expect(sighting.getPhase()).toBe('absent');
});

it('returns after a cooldown and creeps in before retreating again under continuous observation',()=>{
 const {ghost,sighting,tick}=setup();tick(45);expect(ghost.visible).toBe(false);tick(245);expect(ghost.visible).toBe(false);tick(30);expect(ghost.visible).toBe(true);expect(ghost.position.z).toBeCloseTo(.6);expect(ghost.material.opacity).toBeCloseTo(.94);tick(100);expect(ghost.visible).toBe(false);expect(sighting.getPhase()).toBe('absent');
});
it('pauses the return cooldown while a menu is open',()=>{
 const {E,ghost,sighting,tick}=setup();tick(45);E._studyState.paused=true;tick(1000);expect(sighting.getPhase()).toBe('absent');E._studyState.paused=false;tick(240);expect(ghost.visible).toBe(false);tick(20);expect(ghost.visible).toBe(true);
});
it('continues stalking across at least three separate appearances',()=>{
 const {ghost,tick}=setup();let appearances=1,previous=true;for(let i=0;i<1200;i++){tick(1);if(ghost.visible&&!previous)appearances++;previous=ghost.visible;}expect(appearances).toBeGreaterThanOrEqual(3);
});
it('retreats at 120 percent of the old sideways speed and disappears after four seconds',()=>{
 const {ghost,sighting}=setup();sighting.tick(.35);sighting.tick(1);
 expect(ghost.position.z-.6).toBeCloseTo(3.4/4*1.35);
 sighting.tick(2.64);expect(ghost.visible).toBe(true);sighting.tick(.02);expect(ghost.visible).toBe(false);
});

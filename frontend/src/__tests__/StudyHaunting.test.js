import {it,expect,vi,afterEach} from 'vitest';
import * as THREE from 'three';
import {createStudyHaunting} from '../game/engine/studyHaunting.js';
import {createStudyScares} from '../game/engine/studyScares.js';

function setup({seen=false,reduced=false,missing=false}={}){
 const actor=()=>new THREE.Group(),storage={getItem:vi.fn(()=>seen?'played':null),setItem:vi.fn()};let x=0,z=2.4,yaw=0;
 const r={woman:actor(),gurney:actor(),closeup:actor(),faceMaterials:[{opacity:1}],animate:vi.fn(),wheels:[]};
 if(missing)r.woman=null;
 const E={S:new THREE.Scene(),studyStorageKey:'team-18',ref:{studyProcession:r,studyHorror:{flickerLights:[{intensity:4}],windowGhost:{visible:true}},studyExitDoor:{scriptOpen:false,isOpen:false,unlocked:false},studyBackDoor:{scriptOpen:false}},cam:new THREE.PerspectiveCamera(),_studyState:{started:true,paused:false},_studyProgress:{collected:6,total:16,completed:false},_studyAssetProgress:{loaded:missing?1:2,failed:missing?1:0,total:2},px:()=>x,pz:()=>z,yaw:()=>yaw,flashlight:{intensity:18},flashlightModel:{visible:true},reportStudyCinematic:vi.fn(),unlockStudy:vi.fn(),audio:{playClip:vi.fn(()=>true),stopClip:vi.fn(),setCrying:vi.fn(),setHorrorPaused:vi.fn(),setAtmosphereSilence:vi.fn(),getDuration:()=>2}};
 E.setStudyView=vi.fn((a,b,y,p,h,roll)=>{x=a;z=b;yaw=y;E.cam.position.set(a,h,b);E.cam.rotation.set(p,y,roll);});
 const scares={isBusy:vi.fn(()=>false)},haunt=createStudyHaunting(E,scares,{random:()=>0,storage,reduced});
 const tick=(n,dt=.1)=>{for(let t=0;t<n;t+=dt)haunt.tick(Math.min(dt,n-t));};
 const until=phase=>{for(let i=0;i<2000&&haunt.getPhase()!==phase;i++)haunt.tick(.1);expect(haunt.getPhase()).toBe(phase);};
 return {E,r,storage,scares,haunt,tick,until};
}
afterEach(()=>{vi.restoreAllMocks();document.body.innerHTML='';});
it('starts only during active play and does not interrupt an existing scare',()=>{
 const {E,haunt,tick,scares}=setup();E._studyState.started=false;tick(90);expect(haunt.getPhase()).toBe('waiting');E._studyState.started=true;E._studyState.paused=true;tick(90);expect(haunt.getPhase()).toBe('waiting');E._studyState.paused=false;scares.isBusy.mockReturnValue(true);tick(90);expect(haunt.getPhase()).toBe('waiting');scares.isBusy.mockReturnValue(false);tick(.1);expect(haunt.getPhase()).toBe('knock-one');expect(E._studyCinematicInput).toBe(true);
});
it('plays one two-knock procession without opening the sealed entry or unlocking the exit',()=>{
 const {E,r,haunt,tick,until,storage}=setup();tick(60.1);expect(storage.setItem).toHaveBeenCalledOnce();expect(E.setStudyView).not.toHaveBeenCalled();until('knock-two');expect(E.setStudyView).toHaveBeenCalledWith(4.05,.35,expect.any(Number),-.05,1.6,0);expect(E.audio.playClip.mock.calls.filter(c=>c[0]==='doorKnock')).toHaveLength(2);until('crossing');expect(E.ref.studyBackDoor.scriptOpen).toBe(false);expect(E.ref.studyExitDoor.unlocked).toBe(false);expect(E.ref.studyExitDoor.isOpen).toBe(false);expect(r.gurney.visible).toBe(true);tick(10);expect(E.audio.playClip).toHaveBeenCalledWith('uneaseB',expect.objectContaining({channel:'storySting'}));until('aftermath');expect(r.woman.visible).toBe(false);expect(E.ref.studyExitDoor.scriptOpen).toBe(false);expect(E._studyCinematicInput).toBe(false);
});
it('allows movement after departure, reserves ten seconds of silence, then limits the face to four seconds',()=>{
 const {E,r,haunt,tick,until}=setup();until('aftermath');expect(E.audio.setAtmosphereSilence).toHaveBeenLastCalledWith(true,.3);tick(9.9);expect(haunt.getPhase()).toBe('aftermath');expect(E._studyCinematicInput).toBe(false);tick(.2);expect(E.audio.setAtmosphereSilence).toHaveBeenLastCalledWith(false,.8);until('shock');expect(r.closeup.visible).toBe(true);expect(E._studyCinematicInput).toBe(true);expect(E.audio.playClip).toHaveBeenCalledWith('fuzzy',expect.objectContaining({limitSeconds:7,fadeOutSeconds:3}));tick(3.9);expect(r.closeup.visible).toBe(true);tick(.2);expect(r.closeup.visible).toBe(false);expect(E._studyBlackout).toBe(1);
});
it('requires Q recovery, restores eye height and brightness, then leaves a gap before the Basement finale',()=>{
 const {E,haunt,tick,until}=setup();until('prone');expect(E.cam.position.y).toBeCloseTo(.18);expect(E._studyCinematicInput).toBe(true);expect(haunt.beforeExit().blocked).toBe(true);tick(20);expect(haunt.getPhase()).toBe('prone');expect(haunt.standUp()).toBe(true);expect(haunt.standUp()).toBe(false);until('recovery');expect(E.cam.position.y).toBeCloseTo(1.6);expect(E.flashlight.intensity).toBe(18);expect(E._studyCinematicInput).toBe(false);expect(haunt.beforeExit().blocked).toBe(true);tick(30.2);expect(haunt.getPhase()).toBe('done');expect(haunt.beforeExit().blocked).toBe(false);expect(E._studyProgress).toEqual({collected:6,total:16,completed:false});
});
it('remembers the event across reloads without changing game progress',()=>{
 const {E,haunt,tick,storage}=setup({seen:true});tick(90);expect(haunt.getPhase()).toBe('done');expect(E._studyCinematicInput).toBeUndefined();expect(storage.setItem).not.toHaveBeenCalled();expect(haunt.beforeExit().blocked).toBe(false);
});
it('skips missing models instead of trapping the player behind a cosmetic sequence',()=>{
 const {E,haunt,tick}=setup({missing:true});tick(60);expect(haunt.getPhase()).toBe('done');expect(haunt.beforeExit().blocked).toBe(false);expect(E._studyCinematicInput).not.toBe(true);
});
it('pauses the script and audio when hidden, including while the camera is locked',()=>{
 const {E,haunt,tick,until}=setup();until('crossing');vi.spyOn(document,'hidden','get').mockReturnValue(true);tick(100);expect(haunt.getPhase()).toBe('crossing');expect(E.audio.setHorrorPaused).toHaveBeenLastCalledWith(true);vi.restoreAllMocks();until('aftermath');E._studyState.paused=true;tick(100);expect(haunt.getPhase()).toBe('aftermath');
});
it('restores camera, light and door states when disposed mid-sequence and ignores later ticks',()=>{
 const {E,r,haunt,tick,until}=setup();until('crossing');haunt.dispose();expect(E._studyCinematicInput).toBe(false);expect(E._studyHorrorReserved).toBe(false);expect(E.flashlight.intensity).toBe(18);expect(r.gurney.visible).toBe(false);expect(E.ref.studyBackDoor.scriptOpen).toBe(false);const count=E.audio.playClip.mock.calls.length;tick(500);expect(E.audio.playClip.mock.calls).toHaveLength(count);
});
it('provides a reduced-motion recovery with no rapid eye-blink flashes',()=>{
 const {E,haunt,until}=setup({reduced:true});until('blinking');const values=[];for(let i=0;i<15;i++){haunt.tick(.1);values.push(E._studyBlackout);}for(let i=1;i<values.length;i++)expect(values[i]).toBeLessThanOrEqual(values[i-1]);
});
it('fades ambience into silence, knocks once from the wall and restores ambience',()=>{
 const {E,haunt,tick}=setup({seen:true});tick(110.2);expect(E._studyHorrorReserved).toBe(true);expect(E.audio.setAtmosphereSilence).toHaveBeenLastCalledWith(true,.6);tick(4.1);expect(E.audio.playClip).toHaveBeenCalledWith('doorKnock',expect.objectContaining({channel:'subtle',pan:-.85}));tick(3.1);expect(E._studyHorrorReserved).toBe(false);expect(E.audio.setAtmosphereSilence).toHaveBeenLastCalledWith(false,1);expect(haunt.getPhase()).toBe('done');
});
it('hands audio ownership to the Basement finale when E interrupts a silent wall-knock event',()=>{
 const {E,haunt,tick}=setup({seen:true});tick(110.2);expect(E._studyHorrorReserved).toBe(true);expect(haunt.beforeExit().blocked).toBe(false);expect(E._studyHorrorReserved).toBe(false);expect(E.audio.setAtmosphereSilence).toHaveBeenLastCalledWith(false,.2);
 E.audio.setHorrorPaused.mockClear();E._studyState={started:true,paused:true,exitScare:true};tick(10);expect(E.audio.setHorrorPaused).not.toHaveBeenCalled();
});
it('requires both sixty active seconds and more than five recovered fragments',()=>{
 const a=setup();a.E._studyProgress.collected=5;a.tick(90);expect(a.haunt.getPhase()).toBe('waiting');expect(a.storage.setItem).not.toHaveBeenCalled();a.E._studyProgress.collected=6;a.tick(.1);expect(a.haunt.getPhase()).toBe('knock-one');
 const b=setup();b.E._studyProgress.collected=16;b.tick(59.9);expect(b.haunt.getPhase()).toBe('waiting');b.tick(.2);expect(b.haunt.getPhase()).toBe('knock-one');
});
it('does not force an early procession when a completed player presses E at the exit',()=>{
 const {E,haunt,tick,storage}=setup();E._studyProgress={collected:16,total:16,completed:true};tick(5);expect(haunt.beforeExit()).toEqual({blocked:false});expect(haunt.getPhase()).toBe('done');tick(90);expect(storage.setItem).not.toHaveBeenCalled();expect(E.audio.playClip.mock.calls.some(c=>c[0]==='paranormal')).toBe(false);
});
it('keeps the existing Basement ghost visible and at the same position during the procession and recovery',()=>{
 const {E,haunt,scares,until,tick}=setup();E._studyProgress.collected=10;
 const spirit=E.ref.studyHorror.spirit=new THREE.Group();const original=createStudyScares(E,false,{random:()=>0});original.tick(.1);spirit.position.set(-2.2,.09,.5);spirit.visible=true;const position=spirit.position.clone();scares.preserveSpirit=()=>original.preserveSpirit();
 until('crossing');expect(spirit.visible).toBe(true);expect(spirit.position.equals(position)).toBe(true);until('prone');expect(spirit.visible).toBe(true);expect(spirit.position.equals(position)).toBe(true);haunt.standUp();until('recovery');tick(30.2);expect(spirit.visible).toBe(true);expect(spirit.position.equals(position)).toBe(true);expect(haunt.getPhase()).toBe('done');
});

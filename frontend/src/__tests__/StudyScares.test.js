import {it,expect,vi,afterEach} from 'vitest';
import * as THREE from 'three';
import {setTorch} from '../game/engine/studyTorch.js';
import {createStudyScares,studyPassPath,studyScareRate,STUDY_UNEASE_CLIPS} from '../game/engine/studyScares.js';
function setup(reduced=false,saved=null){
 const r={runner:new THREE.Group(),runnerSmoke:new THREE.Group(),spirit:new THREE.Group(),closeup:new THREE.Group(),face:new THREE.Group(),flickerLights:[{intensity:3.8}]};
 const E={W:11,D:9,px:()=>0,pz:()=>2,yaw:()=>0,_studyState:{started:true,paused:false},_studyProgress:{collected:0,total:16,completed:false},studyStorageKey:'test',ref:{studyHorror:r,studyExitDoor:{unlocked:false}},flashlight:{intensity:18},flashlightModel:{visible:true},renderStudyFrame:vi.fn(),reportStudyFinale:vi.fn(),audio:{playClip:vi.fn(),stopClip:vi.fn(),buzz:vi.fn(),setCrying:vi.fn(),setHorrorPaused:vi.fn(),getDuration:()=>3.312}};
 Object.values(r).forEach(x=>{if(x?.isObject3D)x.visible=false;});
 const storage={getItem:()=>saved,setItem:vi.fn()};const scare=createStudyScares(E,reduced,{random:()=>0,storage});const tick=n=>{for(let i=0;i<n;i++)scare.tick(1);};const untilPass=()=>{for(let i=0;i<2000;i++){scare.tick(.1);if(E.audio.playClip.mock.calls.some(c=>c[0]==='pass'))return;}throw Error('No crossing within 200 active seconds');};return {E,r,scare,tick,storage,untilPass};
}
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();});
it('crosses opposing walls from any camera yaw',()=>{const {E}=setup();for(const yaw of [0,Math.PI/4,Math.PI/2,Math.PI]){E.yaw=()=>yaw;for(const p of Object.values(studyPassPath(E)))expect(Math.abs(p[0])>5.5||Math.abs(p[1])>4.5).toBe(true);}});
it('passes in exactly two seconds with a four-pass cap per visit',()=>{
 const {E,r,scare,tick,storage,untilPass}=setup();untilPass();expect(r.runner.visible).toBe(true);const start=r.runner.position.x;scare.tick(1);expect(r.runner.position.x).toBeGreaterThan(start);scare.tick(.99);expect(r.runner.visible).toBe(true);scare.tick(.01);expect(r.runner.visible).toBe(false);
 expect(E.audio.playClip).toHaveBeenCalledWith('pass',expect.objectContaining({fitSeconds:2}));tick(600);expect(E.audio.playClip.mock.calls.filter(c=>c[0]==='pass')).toHaveLength(4);expect(storage.setItem).not.toHaveBeenCalled();
});
it('ignores an old cosmetic cap so a new visit is not silent',()=>{const {E,tick}=setup(false,'{"passes":4}');tick(600);expect(E.audio.playClip.mock.calls.filter(c=>c[0]==='pass')).toHaveLength(4);expect(E._studyProgress.collected).toBe(0);});
it('pauses before start, during menus, typing and tab hiding',()=>{
 const {E,tick}=setup();E._studyState.started=false;tick(100);E._studyState.started=true;E._studyState.paused=true;tick(100);E._studyState.paused=false;
 const input=document.createElement('input');document.body.append(input);input.focus();tick(100);input.remove();vi.spyOn(document,'hidden','get').mockReturnValue(true);tick(100);expect(E.audio.playClip).not.toHaveBeenCalled();vi.restoreAllMocks();tick(60);expect(E.audio.buzz).toHaveBeenCalled();
});
it('restores lights on cancellation and preserves torch off',()=>{const {E,r,scare,untilPass}=setup();untilPass();scare.tick(.4);expect(r.flickerLights[0].intensity).toBeLessThan(3.8);E._userFlashlightOn=false;E._studyState.paused=true;scare.tick(.01);expect(r.runner.visible).toBe(false);expect(r.flickerLights[0].intensity).toBe(3.8);expect(E.flashlight.intensity).toBe(0);});
it('honors reduced motion without traverse, flicker or zoom',()=>{const {E,r,scare,untilPass}=setup(true);untilPass();scare.tick(.5);expect(r.runner.visible).toBe(false);expect(r.flickerLights[0].intensity).toBe(3.8);E._studyProgress.completed=true;scare.requestExit();scare.tick(.1);expect(r.face.position.z).toBe(-.5);});
it('appears at half the fragments and approaches the exit',()=>{const {E,r,scare}=setup();E._studyProgress.collected=7;scare.tick(.1);expect(r.spirit.visible).toBe(false);E._studyProgress.collected=8;scare.tick(.1);expect(r.spirit.visible).toBe(true);expect(r.spirit.position.x).toBe(-4.2);E._studyProgress.collected=16;for(let i=0;i<100;i++)scare.tick(.1);expect(r.spirit.position.z).toBeCloseTo(-3.85,1);});
it('requires backend completion, plays finale once, then permits a separate exit action',()=>{
 const {E,r,scare}=setup();expect(scare.requestExit().blocked).toBe(false);expect(E.reportStudyFinale).not.toHaveBeenCalled();E._studyProgress.completed=true;E.ref.studyExitDoor.unlocked=true;
 expect(scare.requestExit().blocked).toBe(true);expect(E.flashlightModel.visible).toBe(false);expect(scare.requestExit().blocked).toBe(true);expect(E.audio.playClip.mock.calls.filter(c=>c[0]==='scream')).toHaveLength(1);
 E._studyState={started:true,paused:true,exitScare:true};scare.tick(3.9);expect(scare.isExitCleared()).toBe(false);scare.tick(3.2);expect(r.closeup.visible).toBe(false);expect(E.flashlightModel.visible).toBe(true);expect(E.ref.studyExitDoor.isOpen).toBe(true);expect(scare.requestExit().blocked).toBe(false);
});
it('suspends finale when hidden and ignores callbacks after disposal',()=>{const {E,r,scare}=setup();E._studyProgress.completed=true;scare.requestExit();const ended=E.audio.playClip.mock.lastCall[1].onEnded;vi.spyOn(document,'hidden','get').mockReturnValue(true);scare.tick(20);expect(r.closeup.visible).toBe(false);expect(scare.isExitCleared()).toBe(false);scare.dispose();ended();expect(E.reportStudyFinale).toHaveBeenCalledTimes(1);expect(E.flashlightModel.visible).toBe(true);});
it('does not trap players on missing cosmetic downloads',()=>{const {E,r,scare}=setup();E._studyProgress.completed=true;r.closeup=null;expect(scare.requestExit().blocked).toBe(false);});
it('plays the three new random cues first, then the old pair, without repeats',()=>{
 const {E,r,tick}=setup();r.runner=null;tick(600);expect(E.audio.playClip.mock.calls.slice(0,5).map(c=>c[0])).toEqual(STUDY_UNEASE_CLIPS);
});
it('increases frequency by 10 percent initially, 15 halfway and 20 late',()=>{expect(studyScareRate({collected:0,total:16})).toBeCloseTo(1.1);expect(studyScareRate({collected:8,total:16})).toBeCloseTo(1.15);expect(studyScareRate({collected:16,total:16})).toBeCloseTo(1.2);});
it('shows the face on E immediately and hides it exactly on the scream callback',()=>{
 const {E,r,scare}=setup();E._studyProgress.completed=true;E.ref.studyExitDoor.unlocked=true;scare.requestExit();expect(r.face.visible).toBe(true);expect(r.face.position.z).toBe(-.42);expect(E.renderStudyFrame).toHaveBeenCalled();expect(E.flashlight.intensity).toBe(9);
 const scream=E.audio.playClip.mock.calls.find(c=>c[0]==='scream')[1],piano=E.audio.playClip.mock.calls.find(c=>c[0]==='piano')[1];scream.onEnded();expect(E._studyState.paused).toBe(false);expect(E._studyState.exitScare).toBe(false);expect(E.reportStudyFinale).toHaveBeenLastCalledWith(false);expect(r.closeup.visible).toBe(false);expect(E.flashlightModel.visible).toBe(true);expect(E.flashlight.intensity).toBe(9);expect(E.ref.studyExitDoor.isOpen).toBeFalsy();expect(scare.requestExit().blocked).toBe(true);piano.onEnded();expect(E.ref.studyExitDoor.isOpen).toBe(true);expect(E.flashlight.intensity).toBe(18);expect(scare.requestExit().blocked).toBe(false);
});
it('does not skip a new visit because an earlier visit cleared the finale',()=>{const {E,scare}=setup(false,'{"exitCleared":true,"passes":4}');E._studyProgress.completed=true;expect(scare.requestExit().blocked).toBe(true);});
it('does not replace a foreground cue with another random event',()=>{const {E,scare}=setup();E.audio.isScareBusy=vi.fn(()=>true);scare.tick(200);expect(E.audio.playClip).not.toHaveBeenCalled();E.audio.isScareBusy.mockReturnValue(false);scare.tick(.01);expect(E.audio.playClip).not.toHaveBeenCalled();scare.tick(24.1);expect(E.audio.playClip).toHaveBeenCalledOnce();});

it('halves every scene light and emissive source exactly once, without double-darkening exposure',()=>{
 const {E,r,scare}=setup();E.S=new THREE.Scene();E.renderer={toneMappingExposure:.85};const extra=new THREE.PointLight(0xffffff,6);E.S.add(extra);const source=new THREE.MeshStandardMaterial({emissive:0xffaa33,emissiveIntensity:2});E.S.add(new THREE.Mesh(new THREE.BoxGeometry(),source));E.S.add(new THREE.Mesh(new THREE.BoxGeometry(),source));r.screenMaterial=new THREE.MeshBasicMaterial({color:0xffffff});E._studyProgress.completed=true;scare.requestExit();
 expect(extra.intensity).toBe(3);expect(source.emissiveIntensity).toBe(1);expect(r.flickerLights[0].intensity).toBe(1.9);expect(E.renderer.toneMappingExposure).toBe(.85);expect(r.screenMaterial.color.r).toBe(.5);
 E.audio.playClip.mock.calls.find(c=>c[0]==='scream')[1].onEnded();expect(E._studyState.paused).toBe(false);setTorch(E,false);expect(E.flashlight.intensity).toBe(0);setTorch(E,true);expect(E.flashlight.intensity).toBe(9);
 E.audio.playClip.mock.calls.find(c=>c[0]==='piano')[1].onEnded();expect(extra.intensity).toBe(6);expect(source.emissiveIntensity).toBe(2);expect(r.screenMaterial.color.r).toBe(1);expect(E.flashlight.intensity).toBe(18);
});
it('keeps a user-switched-off torch and lens off after the piano finishes',()=>{
 const {E,scare}=setup();E.S=new THREE.Scene();E._flashLensMat=new THREE.MeshStandardMaterial({emissive:0xffffff,emissiveIntensity:1.8});E.S.add(new THREE.Mesh(new THREE.BoxGeometry(),E._flashLensMat));E._studyProgress.completed=true;scare.requestExit();E.audio.playClip.mock.calls.find(c=>c[0]==='scream')[1].onEnded();setTorch(E,false);E.audio.playClip.mock.calls.find(c=>c[0]==='piano')[1].onEnded();expect(E.flashlight.intensity).toBe(0);expect(E._flashLensMat.emissiveIntensity).toBe(0);
});
it('pauses the piano tail for a newly opened menu without restoring full brightness early',()=>{
 const {E,scare}=setup();E._studyProgress.completed=true;scare.requestExit();E.audio.playClip.mock.calls.find(c=>c[0]==='scream')[1].onEnded();E._studyState.paused=true;scare.tick(20);expect(E.audio.setHorrorPaused).toHaveBeenLastCalledWith(true);expect(E.flashlight.intensity).toBe(9);expect(scare.isExitCleared()).toBe(false);E._studyState.paused=false;scare.tick(7.1);expect(scare.isExitCleared()).toBe(true);
});

it('keeps crossings ahead of the camera when inspecting any nearby wall',()=>{
 const {E}=setup();for(const [x,z,yaw]of [[4.95,0,-Math.PI/2],[-4.95,0,Math.PI/2],[0,3.95,Math.PI],[0,-3.95,0]]){E.px=()=>x;E.pz=()=>z;E.yaw=()=>yaw;const {from,to}=studyPassPath(E),cx=(from[0]+to[0])/2,cz=(from[1]+to[1])/2;expect((cx-x)*-Math.sin(yaw)+(cz-z)*-Math.cos(yaw)).toBeGreaterThan(0);}
});
it('does not let rapid evidence progress bypass the quiet interval',()=>{
 const {E,scare,untilPass}=setup();scare.tick(.1);E._studyProgress.collected=16;for(let i=0;i<180;i++)scare.tick(.1);expect(E.audio.playClip.mock.calls.some(c=>c[0]==='pass')).toBe(false);untilPass();expect(E.audio.playClip).toHaveBeenCalledWith('pass',expect.objectContaining({fitSeconds:2}));
});
it('resumes an interrupted crossing after a menu instead of losing the event',()=>{
 const {E,r,scare,untilPass}=setup();untilPass();scare.tick(.3);const x=r.runner.position.x;E._studyState.paused=true;scare.tick(50);expect(r.runner.visible).toBe(false);E._studyState.paused=false;scare.tick(.1);expect(r.runner.visible).toBe(true);expect(r.runner.position.x).toBeGreaterThan(x);expect(E.audio.playClip.mock.calls.filter(c=>c[0]==='pass')).toHaveLength(1);scare.tick(1.6);expect(r.runner.visible).toBe(false);
});
it('spaces crossings at least 90 active seconds apart and mixes in dim-and-noise events',()=>{
 const {E,scare}=setup(false,'{"passes":4}');E._studyProgress={completed:true,collected:16,total:16};let now=0,remaining=0,ended=null;const events=[];E.audio.isScareBusy=()=>remaining>0;
 E.audio.playClip=vi.fn((key,opts)=>{expect(remaining).toBeLessThanOrEqual(0);events.push({key,at:now});remaining=opts.limitSeconds||(key==='pass'?2:15.1);ended=opts.onEnded;return true;});
 for(let i=0;i<2400;i++){now+=.1;if(remaining>0){remaining=Math.max(0,remaining-.1);if(!remaining){ended?.();ended=null;}}scare.tick(.1);}
 const crossings=events.filter(e=>e.key==='pass');expect(crossings.length).toBeGreaterThanOrEqual(2);expect(crossings.length).toBeLessThanOrEqual(3);expect(crossings[0].at).toBeGreaterThanOrEqual(35);for(let i=1;i<crossings.length;i++)expect(crossings[i].at-crossings[i-1].at).toBeGreaterThanOrEqual(90);expect(new Set(events.filter(e=>e.key!=='pass').slice(0,3).map(e=>e.key))).toEqual(new Set(['lurking','well','paranormal']));expect(E._studyProgress.completed).toBe(true);
});
it('does not start new random events after the exit finale has cleared',()=>{
 const {E,scare,tick}=setup();E._studyProgress.completed=true;scare.requestExit();E.audio.playClip.mock.calls.find(c=>c[0]==='scream')[1].onEnded();E.audio.playClip.mock.calls.find(c=>c[0]==='piano')[1].onEnded();E.audio.playClip.mockClear();tick(240);expect(E.audio.playClip).not.toHaveBeenCalled();
});
it('follows a crossing with 4.5 seconds of half light and noise while movement stays enabled',()=>{
 const {E,r,scare,untilPass}=setup();untilPass();scare.tick(2);
 expect(r.runner.visible).toBe(false);expect(E.audio.buzz).toHaveBeenLastCalledWith({duration:4.5,volume:.13});
 expect(E.flashlight.intensity).toBe(9);expect(r.flickerLights[0].intensity).toBe(1.9);expect(E._studyState.paused).toBe(false);
 scare.tick(3.8);expect(E.flashlight.intensity).toBe(9);scare.tick(.35);expect(E.flashlight.intensity).toBeGreaterThan(9);expect(E.flashlight.intensity).toBeLessThan(18);
 scare.tick(.35);expect(E.flashlight.intensity).toBe(18);expect(r.flickerLights[0].intensity).toBe(3.8);
});
it('pauses a dim event in menus and restores all sources without turning an off torch on',()=>{
 const {E,r,scare,tick}=setup();E.S=new THREE.Scene();const light=new THREE.PointLight(0xffffff,6);E.S.add(light);
 const material=new THREE.MeshStandardMaterial({emissive:0xffaa33,emissiveIntensity:2});E.S.add(new THREE.Mesh(new THREE.BoxGeometry(),material));r.screenMaterial=new THREE.MeshBasicMaterial({color:0xffffff});
 tick(19);expect(light.intensity).toBe(3);expect(material.emissiveIntensity).toBe(1);expect(r.screenMaterial.color.r).toBe(.5);
 E._studyState.paused=true;scare.tick(100);expect(light.intensity).toBe(6);expect(E.audio.setHorrorPaused).toHaveBeenLastCalledWith(true);
 E._studyState.paused=false;scare.tick(.1);expect(light.intensity).toBe(3);setTorch(E,false);scare.tick(4.4);
 expect(light.intensity).toBe(6);expect(material.emissiveIntensity).toBe(2);expect(r.screenMaterial.color.r).toBe(1);expect(E.flashlight.intensity).toBe(0);
});
it('cleans up a random dim before the exit finale so lights are never quartered',()=>{
 const {E,r,scare,tick}=setup();tick(19);expect(E.flashlight.intensity).toBe(9);E._studyProgress.completed=true;scare.requestExit();
 expect(E.flashlight.intensity).toBe(9);expect(r.flickerLights[0].intensity).toBe(1.9);
 E.audio.playClip.mock.calls.find(c=>c[0]==='scream')[1].onEnded();E.audio.playClip.mock.calls.find(c=>c[0]==='piano')[1].onEnded();
 expect(E.flashlight.intensity).toBe(18);expect(r.flickerLights[0].intensity).toBe(3.8);
});

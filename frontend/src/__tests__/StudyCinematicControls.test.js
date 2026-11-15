import {it,expect,vi,afterEach} from 'vitest';
import {setupControls} from '../game/engine/controls.js';
let controls;
afterEach(()=>{controls?.dispose();document.body.innerHTML='';});
it('blocks movement, mouse look and interaction only while the cinematic owns input',()=>{
 let blocked=true;const canvas=document.createElement('canvas');document.body.append(canvas);const onInteract=vi.fn();
 controls=setupControls({canvas,onInteract,getAudio:()=>null,getSolids:()=>[],roomSize:[11,4.6,9],spawn:[0,1.6,2],isInputBlocked:()=>blocked});controls.setTarget('study_door_back');
 window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w'}));window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e'}));window.dispatchEvent(new MouseEvent('mousemove',{clientX:1,clientY:1}));window.dispatchEvent(new MouseEvent('mousemove',{clientX:100,clientY:100}));controls.update(.5);
 expect(controls.getPos()).toEqual({x:0,z:2,yaw:0,pitch:0});expect(onInteract).not.toHaveBeenCalled();blocked=false;controls.update(.5);expect(controls.getPos().z).toBe(2);
 window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w'}));controls.update(.1);expect(controls.getPos().z).toBeLessThan(2);window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',key:'w'}));window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e'}));expect(onInteract).toHaveBeenCalledWith('study_door_back');
 const stopped=controls.getPos().z;window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w'}));controls.resetInput();controls.update(.1);expect(controls.getPos().z).toBe(stopped);
});

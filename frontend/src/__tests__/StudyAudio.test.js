import {it,expect,vi,afterEach,beforeEach} from 'vitest';
import {StudyAudio} from '../game/engine/studyAudio.js';
import {GameAudio} from '../game/engine/audio.js';
function setup(){
 const sources=[];const node=()=>({connect:vi.fn(),disconnect:vi.fn()});
 const a=new StudyAudio();a.ctx={currentTime:0,sampleRate:100,close:vi.fn(),createBuffer:(_,len,sr)=>({duration:len/sr,getChannelData:()=>new Float32Array(len)}),createGain:()=>({...node(),gain:{value:0}}),createStereoPanner:()=>({...node(),pan:{value:0}}),createBufferSource:()=>{const s={...node(),playbackRate:{value:1},start:vi.fn(),stop:vi.fn()};sources.push(s);return s;}};a.master=node();a.loadClip=vi.fn(async()=>({duration:4}));return {a,sources};
}
beforeEach(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
afterEach(()=>vi.restoreAllMocks());
it('fits pass audio to two seconds and resumes from the paused sample offset',async()=>{const {a,sources}=setup();a.playClip('pass',{fitSeconds:2});await vi.waitFor(()=>expect(sources).toHaveLength(1));expect(sources[0].playbackRate.value).toBe(2);a.ctx.currentTime=.4;a.setHorrorPaused(true);expect(sources[0].stop).toHaveBeenCalledOnce();a.setHorrorPaused(false);expect(sources[1].start).toHaveBeenCalledWith(.4,.8,3.2);});
it('cancels deferred decoding on stop or disposal',async()=>{const {a,sources}=setup();let resolve;a.loadClip=()=>new Promise(r=>resolve=r);a.playClip('scream');a.stopClip('scream');resolve({duration:4});await Promise.resolve();expect(sources).toHaveLength(0);a.playClip('pass');a.dispose();resolve({duration:4});await Promise.resolve();expect(sources).toHaveLength(0);});
it('finishes an elapsed nonlooping clip once instead of replaying from zero',()=>{const {a,sources}=setup();const ended=vi.fn();const r={channel:'finale',buffer:{duration:4},offset:4.01,onEnded:ended};a.channels.set('finale',r);a.startChannel(r);expect(sources).toHaveLength(0);expect(ended).toHaveBeenCalledOnce();expect(a.channels.size).toBe(0);});
it('tracks buzz so modal pauses can stop it immediately',()=>{const {a,sources}=setup();a.buzz();expect(a.channels.has('buzz')).toBe(true);a.stopClip('buzz');expect(sources[0].stop).toHaveBeenCalledOnce();expect(a.channels.size).toBe(0);});
it('spatializes crying and removes it when the figure is hidden',async()=>{const {a}=setup();a.setCrying(4,0,true);await vi.waitFor(()=>expect(a.channels.get('crying')?.pan).toBeDefined());a.setCrying(4,0,true);const r=a.channels.get('crying');expect(r.loop).toBe(true);expect(r.pan.pan.value).toBeGreaterThan(0);expect(r.gain.gain.value).toBeLessThan(.12);a.setCrying(0,0,false);expect(a.channels.has('crying')).toBe(false);});

it('starts prepared scream and piano synchronously on one audio clock',()=>{
 const {a,sources}=setup();a.ctx.currentTime=5;a.decoded.set('scream',{duration:3.312});a.decoded.set('piano',{duration:7});a.playExitPair();expect(sources).toHaveLength(2);expect(sources[0].start).toHaveBeenCalledWith(5.01,0,3.312);expect(sources[1].start).toHaveBeenCalledWith(5.01,0,7);
});
it('limits the piano to seven seconds even if a longer file is substituted',()=>{const {a,sources}=setup();a.decoded.set('piano',{duration:31});a.playClip('piano',{channel:'piano',limitSeconds:7});expect(sources[0].start).toHaveBeenCalledWith(0,0,7);});
it('prevents random cue overlap and clears them before the exit pair',async()=>{
 const {a,sources}=setup();a.playClip('lurking',{channel:'unease'});await vi.waitFor(()=>expect(sources).toHaveLength(1));expect(a.playClip('well',{channel:'unease'})).toBe(false);expect(a.playClip('pass',{channel:'pass'})).toBe(false);expect(sources[0].stop).not.toHaveBeenCalled();a.decoded.set('scream',{duration:3.312});a.decoded.set('piano',{duration:7});a.playExitPair();expect(sources[0].stop).toHaveBeenCalledOnce();expect([...a.channels.keys()]).toEqual(['finale','piano']);
});
it('suppresses crying while a foreground effect is active',()=>{const {a}=setup();a.playClip('paranormal',{channel:'unease'});a.setCrying(1,1,true);expect(a.channels.has('crying')).toBe(false);a.stopClip('unease');a.setCrying(1,1,true);expect(a.channels.has('crying')).toBe(true);});
it('resumes the synchronized pair with equal offsets after a pause',()=>{const {a,sources}=setup();a.ctx.currentTime=5;a.decoded.set('scream',{duration:3.312});a.decoded.set('piano',{duration:7});a.playExitPair();a.ctx.currentTime=5.21;a.setHorrorPaused(true);a.ctx.currentTime=9;a.setHorrorPaused(false);expect(sources).toHaveLength(4);expect(sources[2].start.mock.calls[0][0]).toBe(9);expect(sources[3].start.mock.calls[0][0]).toBe(9);expect(sources[2].start.mock.calls[0][1]).toBeCloseTo(.2);expect(sources[3].start.mock.calls[0][1]).toBeCloseTo(.2);});
it('keeps the electrical dim cue exclusive for its full 4.5 seconds',()=>{
 const {a,sources}=setup();a.buzz({duration:4.5,volume:.13});expect(sources[0].start).toHaveBeenCalledWith(0,0,4.5);
 expect(a.isScareBusy()).toBe(true);expect(a.playClip('well',{channel:'unease'})).toBe(false);
 a.setHorrorPaused(true);expect(sources[0].stop).toHaveBeenCalledOnce();a.setHorrorPaused(false);expect(sources[1].start).toHaveBeenCalledWith(0,0,4.5);
 sources[1].onended();expect(a.isScareBusy()).toBe(false);
});
it('fades a shortened atmosphere cue instead of ending its waveform abruptly',()=>{
 const {a,sources}=setup(),gain={value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()};a.ctx.createGain=()=>({connect:vi.fn(),disconnect:vi.fn(),gain});
 a.decoded.set('lurking',{duration:20});a.playClip('lurking',{channel:'unease',volume:.35,limitSeconds:4.5,fadeOutSeconds:.35});
 expect(sources[0].start).toHaveBeenCalledWith(0,0,4.5);expect(gain.setValueAtTime).toHaveBeenCalledWith(.35,4.15);expect(gain.linearRampToValueAtTime).toHaveBeenCalledWith(0,4.5);
});
it('fades rain and hum to silence and suppresses world footsteps and crying until restored',()=>{
 const {a}=setup(),step=vi.spyOn(GameAudio.prototype,'step').mockImplementation(()=>{}),gain={value:1,setTargetAtTime:vi.fn(),cancelScheduledValues:vi.fn()};a.ambient={gain};
 a.setAtmosphereSilence(true,.6);expect(gain.setTargetAtTime).toHaveBeenLastCalledWith(0,0,.6);a.step();a.setCrying(1,1,true);expect(step).not.toHaveBeenCalled();expect(a.channels.has('crying')).toBe(false);
 a.setAtmosphereSilence(false,1);expect(gain.setTargetAtTime).toHaveBeenLastCalledWith(1,0,1);a.step();expect(step).toHaveBeenCalledOnce();
});

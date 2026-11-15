import {GameAudio} from './audio.js';

export const STUDY_CLIPS={
 pass:'sound_effects75-eyesaur-jumpscare-sound-482110.mp3',
 uneaseA:'soumages-jumpscare-v3-335600.mp3',uneaseB:'freesound_community-jump-scare-sound-2-82831.mp3',
 lurking:'alesiadavina-horror-sound-lurking-horror-monster-189948.mp3',
 well:'universfield-okiku-well-horror-578058.mp3',paranormal:'universfield-cinematic-paranormal-horror-498207.mp3',
 scream:'dragon-studio-scary-scream-401725.mp3',piano:'simplesound-horror-piano-443326-first-7s.wav',
 crying:'universfield-female-crying-291098.mp3',
 doorKnock:'universfield-door-knock-291150.mp3',doorCreak:'audiopapkin-old-creaking-wooden-door-003-raw-recording-508598.mp3',
 processionSteps:'oxidvideos-creaking-wooden-floor-footsteps-410804.mp3',fuzzy:'freesound_community-fuzzy-jumpscare-80560.mp3'
};
const FOREGROUND=['pass','unease','finale','piano','buzz','story','storySteps','storySting','storyDoor','subtle'];
export class StudyAudio extends GameAudio {
 constructor(){super();this.buffers=new Map();this.decoded=new Map();this.channels=new Map();this.scenePaused=false;this.disposed=false;}
 prepare(){
  if(!this.decoder){const Decoder=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(Decoder)this.decoder=new Decoder(2,1,44100);}
  return this.preparation??=Promise.all(Object.keys(STUDY_CLIPS).map(key=>this.loadClip(key)));
 }
 start(){
  if(this.ctx){this.ctx.resume?.();return;}
  const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
  const c=this.ctx=new Context();this.master=c.createGain();this.master.gain.value=this.muted?0:this.vol;this.master.connect(c.destination);
  this.ambient=c.createGain();this.ambient.gain.value=1;this.ambient.connect(this.master);
  this.verb=c.createGain();this.verb.gain.value=.12;this.verb.connect(this.master);
  this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const samples=this.noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  for(const [f,v]of [[60,.018],[120,.005],[41.2,.012]]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.value=v;o.connect(g);g.connect(this.ambient);o.start();}
  const rain=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();rain.buffer=this.noise;rain.loop=true;filter.type='lowpass';filter.frequency.value=650;gain.gain.value=.035;rain.connect(filter);filter.connect(gain);gain.connect(this.ambient);rain.start();c.resume?.();
  this.visibility=()=>this.applyHorrorPause();document.addEventListener('visibilitychange',this.visibility);
  for(const key of Object.keys(STUDY_CLIPS))this.loadClip(key);
 }
 loadClip(key){
  const decoder=this.ctx||this.decoder;if(!decoder||!STUDY_CLIPS[key])return Promise.resolve(null);
  if(!this.buffers.has(key))this.buffers.set(key,fetch('/audio/study/'+STUDY_CLIPS[key]).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).then(data=>decoder.decodeAudioData(data)).then(buffer=>{if(!this.disposed)this.decoded.set(key,buffer);return buffer;}).catch(()=>null));
  return this.buffers.get(key);
 }
 getDuration(key,fallback=4){return this.decoded.get(key)?.duration||fallback;}
 isScareBusy(){return FOREGROUND.some(key=>this.channels.has(key));}
 duckAmbient(){if(this.ambient){const value=document.hidden||this.atmosphereSilent?0:(this.isScareBusy()? .3:1),g=this.ambient.gain;g.cancelScheduledValues?.(this.ctx?.currentTime||0);if(this.ctx&&g.setTargetAtTime)g.setTargetAtTime(value,this.ctx.currentTime,this.atmosphereFade||.15);else g.value=value;}}
 setAtmosphereSilence(on,fade=.4){this.atmosphereSilent=on;this.atmosphereFade=fade;if(on)this.stopClip('crying');this.duckAmbient();}
 step(v=1){if(!this.atmosphereSilent)super.step(v);}
 creak(x,z,v){if(!this.atmosphereSilent&&this.ctx)super.creak(x,z,v);}
 playClip(key,{channel=key,volume=.55,loop=false,fitSeconds,onEnded,when,limitSeconds,fadeOutSeconds=0,pan=0}={}){
  if(this.disposed)return false;
  // Random cues never cut off or stack on an existing scare. Finale explicitly cancels them first.
  if(channel==='unease'&&this.isScareBusy())return false;
  if(channel==='pass'&&FOREGROUND.filter(k=>k!=='buzz').some(k=>this.channels.has(k)))return false;
  this.stopClip(channel);
  if(FOREGROUND.includes(channel))this.stopClip('crying');
  const request={key,channel,volume,loop,onEnded,offset:0,source:null,fitSeconds,when,limitSeconds,fadeOutSeconds,initialPan:pan};this.channels.set(channel,request);this.duckAmbient();
  const ready=buffer=>{
   if(this.disposed||this.channels.get(channel)!==request)return;
   if(!buffer){this.channels.delete(channel);this.duckAmbient();return;}
   request.buffer=buffer;request.rate=fitSeconds?buffer.duration/fitSeconds:1;
   if(!this.scenePaused&&!document.hidden)this.startChannel(request);
  };
  const cached=this.decoded.get(key);if(cached)ready(cached);else this.loadClip(key).then(ready);
  return true;
 }
 startChannel(request){
  if(!this.ctx||!request.buffer||request.source)return;
  const duration=Math.min(request.buffer.duration,request.limitSeconds??Infinity);
  if(!request.loop&&request.offset>=duration){this.channels.delete(request.channel);this.duckAmbient();request.onEnded?.();return;}
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner();
  source.buffer=request.buffer;source.loop=request.loop;source.playbackRate.value=request.rate||1;gain.gain.value=request.volume;source.connect(gain);gain.connect(pan);pan.connect(this.master);
  pan.pan.value=request.initialPan||0;
  request.source=source;request.gain=gain;request.pan=pan;request.startedAt=Math.max(this.ctx.currentTime,request.when??this.ctx.currentTime);request.when=undefined;
  if(!request.loop&&request.fadeOutSeconds&&gain.gain.linearRampToValueAtTime){
   const end=request.startedAt+(duration-request.offset)/(request.rate||1),fade=Math.min(request.fadeOutSeconds,end-request.startedAt);
   const fadeStart=end-fade,remaining=duration-request.offset;
   gain.gain.setValueAtTime(request.volume*Math.min(1,remaining/request.fadeOutSeconds),request.startedAt);
   gain.gain.setValueAtTime(request.volume*Math.min(1,remaining/request.fadeOutSeconds),Math.max(request.startedAt,fadeStart));gain.gain.linearRampToValueAtTime(0,end);
  }
  source.onended=()=>{if(request.source!==source)return;source.disconnect();gain.disconnect();pan.disconnect();request.source=null;if(this.channels.get(request.channel)===request)this.channels.delete(request.channel);this.duckAmbient();request.onEnded?.();};
  if(request.loop)source.start(request.startedAt,request.offset%(duration||1));
  else source.start(request.startedAt,request.offset,duration-request.offset);
 }
 pauseChannel(r){if(!r.source)return;r.offset+=Math.max(0,this.ctx.currentTime-r.startedAt)*(r.rate||1);r.source.onended=null;r.source.stop();r.source.disconnect();r.gain?.disconnect();r.pan?.disconnect();r.source=null;}
 stopClip(channel){const r=this.channels.get(channel);if(!r)return;this.pauseChannel(r);this.channels.delete(channel);this.duckAmbient();}
 playExitPair({onScreamEnd,onPianoEnd}={}){
  for(const key of [...FOREGROUND,'buzz','crying'])this.stopClip(key);
  this.ctx?.resume?.();const when=(this.ctx?.currentTime||0)+.01;
  this.playClip('scream',{channel:'finale',volume:.8,when,onEnded:onScreamEnd});
  this.playClip('piano',{channel:'piano',volume:.45,when,limitSeconds:7,onEnded:onPianoEnd});
  return when;
 }
 setHorrorPaused(paused){if(this.scenePaused===paused)return;this.scenePaused=paused;this.applyHorrorPause();}
 applyHorrorPause(){for(const r of [...this.channels.values()]){if(this.scenePaused||document.hidden)this.pauseChannel(r);else this.startChannel(r);}this.duckAmbient();}
 setCrying(x,z,on){
  if(!on||this.atmosphereSilent||this.isScareBusy()){this.stopClip('crying');return;}
  if(!this.channels.has('crying'))this.playClip('crying',{channel:'crying',volume:.12,loop:true});
  const r=this.channels.get('crying');if(!r?.gain||!r.pan)return;
  const dx=x-this.L.x,dz=z-this.L.z,d=Math.hypot(dx,dz)||.01;r.pan.pan.value=Math.max(-.9,Math.min(.9,(dx*Math.cos(this.L.yaw)-dz*Math.sin(this.L.yaw))/d));r.gain.gain.value=.12/(1+d*.2);
 }
 buzz({duration=.35,volume=.15}={}){
  if(!this.ctx||this.disposed)return;this.stopClip('buzz');
  const buffer=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*duration),this.ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++){const t=i/this.ctx.sampleRate,envelope=Math.min(1,t/.04,(duration-t)/.3);data[i]=((Math.random()*2-1)*.25+Math.sin(t*180*Math.PI*2)*.12)*Math.max(0,envelope);}
  const r={channel:'buzz',buffer,rate:1,volume,offset:0,loop:false,source:null};this.channels.set('buzz',r);this.duckAmbient();if(!this.scenePaused&&!document.hidden)this.startChannel(r);
 }
 whisper(_name,x,z){if(this.ctx&&!this.muted&&!this.isScareBusy())this.burst(1300,2,.6,.06,this.spat(x,z,.3),700);}
 event(){}
 slam(x,z){if(this.ctx&&!this.muted&&!this.isScareBusy())this.thump(x,z);}
 dispose(){this.disposed=true;document.removeEventListener('visibilitychange',this.visibility);for(const key of [...this.channels.keys()])this.stopClip(key);this.buffers.clear();this.decoded.clear();this.decoder=null;super.dispose();}
}

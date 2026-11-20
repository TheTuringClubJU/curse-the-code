import {setTorch} from './studyTorch.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const spiritPath=[[-4.2,3.8],[-2.2,.5],[-2.2,-2.9],[-1,-3.5],[0,-3.85]];
function pathPoint(t){const n=clamp(t,0,1)*(spiritPath.length-1),i=Math.min(spiritPath.length-2,Math.floor(n)),f=n-i;return [spiritPath[i][0]*(1-f)+spiritPath[i+1][0]*f,spiritPath[i][1]*(1-f)+spiritPath[i+1][1]*f];}

// Intersect a camera-relative traverse with the room walls, extending through both walls.
export function studyPassPath(E,direction=1){
  const yaw=E.yaw?.()||0,W=E.W||11,D=E.D||9;
  const position=[E.px?.()||0,E.pz?.()||0],forward=[-Math.sin(yaw),-Math.cos(yaw)];
  let clearance=Infinity;
  for(let i=0;i<2;i++)if(Math.abs(forward[i])>.00001){const edge=Math.sign(forward[i])*((i===0?W:D)/2-.12);clearance=Math.min(clearance,(edge-position[i])/forward[i]);}
  const distance=Math.min(1.8,Math.max(.08,clearance*.75));
  // Keep crossings in front of players near a wall instead of clamping behind their camera.
  const center=position.map((p,i)=>p+forward[i]*distance);
  const v=[Math.cos(yaw)*direction,-Math.sin(yaw)*direction];let low=-Infinity,high=Infinity;
  for(let i=0;i<2;i++){if(Math.abs(v[i])<.00001)continue;const half=(i===0?W:D)/2+.8,a=(-half-center[i])/v[i],b=(half-center[i])/v[i];low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));}
  return {from:[center[0]+v[0]*low,center[1]+v[1]*low],to:[center[0]+v[0]*high,center[1]+v[1]*high]};
}

export const STUDY_UNEASE_CLIPS=['lurking','well','paranormal','uneaseA','uneaseB'];
export function studyScareRate(progress={}){
 return 1.1+.1*clamp((progress.collected||0)/(progress.total||16),0,1);
}

export function createStudyScares(E,reduced=false,options={}){
 const random=options.random||Math.random;
 // Cosmetic event limits apply to each room visit.
 let passes=0,uneases=0,entryCount=null,exitCleared=false,activeTime=0,scareClock=0,lastLoud=-100,lastEventEnd=-100,audioWasBusy=false,lastEventType=null,disposed=false;
 let nextPass=40+random()*10,nextUnease=20+random()*8,pass=null,dim=null,finale=null,spiritPlaced=false,uneaseBag=[];
 const originals=new Map(),refs=()=>E.ref.studyHorror||{};
 const restoreLights=()=>{
  for(const [light,intensity]of originals)light.intensity=intensity;originals.clear();
  E._studyLightScale=1;setTorch(E,E._userFlashlightOn!==false);
 };
 const clearPass=()=>{
  const r=refs();if(r.runner)r.runner.visible=false;if(r.runnerSmoke)r.runnerSmoke.visible=false;
  if(!finale)restoreLights();E.audio?.stopClip?.('pass');E.audio?.stopClip?.('buzz');pass=null;
 };
 const dimScale=factor=>{
  for(const [light,intensity]of originals)light.intensity=intensity*factor;
  for(const [m,intensity]of dim?.emissive||[])m.emissiveIntensity=intensity*factor;
  if(dim?.screenColor&&refs().screenMaterial?.color)refs().screenMaterial.color.copy(dim.screenColor).multiplyScalar(factor);
  E._studyLightScale=factor;setTorch(E,E._userFlashlightOn!==false);
 };
 const finishDim=()=>{if(!dim)return;dimScale(1);dim=null;originals.clear();E.audio?.stopClip?.('buzz');};
 const startDim=(electrical=false)=>{
  dim={elapsed:0,duration:4.5,emissive:new Map(),screenColor:refs().screenMaterial?.color?.clone?.()};
  const capture=light=>{if(!originals.has(light))originals.set(light,light.intensity);};
  for(const light of refs().flickerLights||refs().practicals||[])capture(light);
  E.S?.traverse?.(o=>{if(o.isLight)capture(o);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.emissive?.getHex()&&!dim.emissive.has(m))dim.emissive.set(m,m.emissiveIntensity);});
  dimScale(.5);if(electrical)E.audio?.buzz?.({duration:4.5,volume:.13});
 };
 const hideFace=(resumePlay=true)=>{
  if(disposed||!finale||finale.faceEnded)return;
  finale.faceEnded=true;const r=refs();if(r.closeup)r.closeup.visible=false;if(r.spirit)r.spirit.visible=false;
  if(E.flashlightModel)E.flashlightModel.visible=finale.torchVisible;
  if(resumePlay){
   // The remaining piano is atmosphere, not a movement lock.
   E._studyState={...E._studyState,paused:false,exitScare:false};
   E.reportStudyFinale?.(false);
  }
  E.renderStudyFrame?.();
 };
 const finishFinale=()=>{
  if(disposed||!finale)return;hideFace();
  const f=finale;finale=null;
  for(const [material,intensity]of f.emissive||[])material.emissiveIntensity=intensity;
  restoreLights();
  if(f.screenColor&&E.ref.studyHorror?.screenMaterial?.color)E.ref.studyHorror.screenMaterial.color.copy(f.screenColor);
  exitCleared=true;E.audio?.stopClip?.('finale');E.audio?.stopClip?.('piano');
  if(E.ref.studyExitDoor?.unlocked)E.ref.studyExitDoor.isOpen=true;
  E.renderStudyFrame?.();
 };
 const busy=()=>Boolean(E.audio?.isScareBusy?.());
 const startPass=()=>{
  const r=refs();if(!r.runner&&!reduced){nextPass=scareClock+5;return;}
  if(busy())return;
  const path=studyPassPath(E,passes%2?-1:1);pass={elapsed:0,...path};passes++;lastLoud=scareClock;lastEventType='pass';
  nextPass=scareClock+110+random()*20;
  for(const light of r.flickerLights||r.practicals||[])originals.set(light,light.intensity);
  if(r.runner){r.runner.visible=!reduced;r.runner.position.set(path.from[0],.02,path.from[1]);r.runner.rotation.y=Math.atan2(path.to[0]-path.from[0],path.to[1]-path.from[1])+(r.runner.userData.facingOffset||0);}
  if(r.runnerSmoke)r.runnerSmoke.visible=!reduced;
  E.audio?.setCrying?.(0,0,false);E.audio?.buzz?.();E.audio?.playClip?.('pass',{channel:'pass',volume:.72,fitSeconds:2});
  audioWasBusy=busy();
 };
 const updateSpirit=dt=>{
  const r=refs(),progress=E._studyProgress||{},fraction=(progress.collected||0)/(progress.total||16);if(!r.spirit)return;
  if(fraction<.5||exitCleared||finale){r.spirit.visible=false;E.audio?.setCrying?.(0,0,false);return;}
  r.spirit.visible=true;const[x,z]=pathPoint((fraction-.5)*2),dx=r.spirit.position.x-(E.px?.()||0),dz=r.spirit.position.z-(E.pz?.()||0),yaw=E.yaw?.()||0;
  const watched=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/(Math.hypot(dx,dz)||1)>.65;
  const blend=spiritPlaced?Math.min(1,dt*(reduced?.7:fraction>=1?.9:watched?.1:.7)):1;spiritPlaced=true;
  r.spirit.position.x+=(x-r.spirit.position.x)*blend;r.spirit.position.z+=(z-r.spirit.position.z)*blend;r.spirit.position.y=reduced?.03:.08+Math.sin(activeTime*.85)*.025;
  r.spirit.rotation.z=reduced?0:Math.sin(activeTime*.63)*.018;
  r.spirit.rotation.y=Math.atan2((E.px?.()||0)-r.spirit.position.x,(E.pz?.()||0)-r.spirit.position.z)+(r.spirit.userData.facingOffset||0);
  E.audio?.setCrying?.(r.spirit.position.x,r.spirit.position.z,!busy()&&!pass&&!dim);
 };
 return {
  notify(){},isExitCleared:()=>exitCleared,isBusy:()=>Boolean(pass||dim||finale||busy()),preserveSpirit:()=>{if(!refs().spirit?.visible)updateSpirit(0);},
  requestExit(){
   if(disposed||!E._studyProgress?.completed||exitCleared)return {blocked:false};if(finale)return {blocked:true};
   const r=refs();if(!r.closeup||!r.spirit){exitCleared=true;if(E.ref.studyExitDoor?.unlocked)E.ref.studyExitDoor.isOpen=true;return {blocked:false};}
   finishDim();clearPass();for(const c of ['unease','crying','buzz'])E.audio?.stopClip?.(c);E.audio?.setCrying?.(0,0,false);
   finale={elapsed:0,screamDuration:E.audio?.getDuration?.('scream',3.312)||3.312,faceEnded:false,pianoEnded:false,torchVisible:E.flashlightModel?.visible??true,
    emissive:new Map(),screenColor:r.screenMaterial?.color?.clone?.()};
   const dimLight=light=>{if(!originals.has(light)){originals.set(light,light.intensity);light.intensity*=.5;}};
   for(const light of r.flickerLights||r.practicals||[])dimLight(light);
   E.S?.traverse?.(o=>{
    if(o.isLight)dimLight(o);
    for(const m of Array.isArray(o.material)?o.material:[o.material]){
     if(m?.emissive?.getHex()&&!finale.emissive.has(m)){finale.emissive.set(m,m.emissiveIntensity);m.emissiveIntensity*=.5;}
    }
   });
   r.screenMaterial?.color?.multiplyScalar?.(.5);
   E._studyLightScale=.5;setTorch(E,E._userFlashlightOn!==false);
   if(E.flashlightModel)E.flashlightModel.visible=false;r.spirit.visible=false;r.closeup.visible=true;
   if(r.face){r.face.visible=true;r.face.position.z=reduced?-.5:-.42;r.face.rotation.z=0;}
   E._studyState={...E._studyState,paused:true,exitScare:true};E.reportStudyFinale?.(true);E.audio?.setHorrorPaused?.(false);
   const onScreamEnd=()=>{hideFace();if(finale?.pianoEnded)finishFinale();};
   const onPianoEnd=()=>{if(disposed||!finale)return;finale.pianoEnded=true;if(finale.faceEnded)finishFinale();};
   if(E.audio?.playExitPair)E.audio.playExitPair({onScreamEnd,onPianoEnd});
   else {E.audio?.playClip?.('scream',{channel:'finale',volume:.8,onEnded:onScreamEnd});E.audio?.playClip?.('piano',{channel:'piano',volume:.45,limitSeconds:7,onEnded:onPianoEnd});}
   E.shake?.(.35,.18);E.renderStudyFrame?.();return {blocked:true};
  },
  tick(dt){
   if(disposed||E._studyHorrorReserved)return;const state=E._studyState||{},typing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
   const suspended=!state.started||document.hidden||typing||(state.paused&&!state.exitScare);E.audio?.setHorrorPaused?.(suspended);
   if(suspended){
    // Pause an interrupted crossing instead of consuming it invisibly behind a menu.
    if(pass){const r=refs();if(r.runner)r.runner.visible=false;if(r.runnerSmoke)r.runnerSmoke.visible=false;for(const[l,intensity]of originals)l.intensity=intensity;setTorch(E,E._userFlashlightOn!==false);}
    if(dim)dimScale(1);
    if(refs().spirit)refs().spirit.visible=false;if(refs().closeup)refs().closeup.visible=false;E.audio?.setCrying?.(0,0,false);return;
   }
   if(finale){
    const r=refs();finale.elapsed+=dt;
    if(!finale.faceEnded){r.closeup.visible=true;if(r.face)r.face.rotation.z=reduced?0:Math.sin(finale.elapsed*27)*.012;}
    // Audio onended is authoritative; these clocks only prevent trapping players if audio fails.
    if(!finale.faceEnded&&finale.elapsed>=finale.screamDuration+.05)hideFace();
    if(finale.elapsed>=7.05)finale.pianoEnded=true;
    if(finale.faceEnded&&finale.pianoEnded)finishFinale();return;
   }
   activeTime+=dt;scareClock+=dt*studyScareRate(E._studyProgress);updateSpirit(dt);
   const collected=E._studyProgress?.collected||0;entryCount??=collected;
   const audioBusy=busy();if(audioWasBusy&&!audioBusy)lastEventEnd=activeTime;audioWasBusy=audioBusy;
   if(pass){
    pass.elapsed+=dt;const r=refs(),t=clamp(pass.elapsed/2,0,1),x=pass.from[0]+(pass.to[0]-pass.from[0])*t,z=pass.from[1]+(pass.to[1]-pass.from[1])*t;
    if(r.runner)r.runner.visible=!reduced;if(r.runnerSmoke)r.runnerSmoke.visible=!reduced;
    r.runner?.position.set(x,.03,z);r.runnerSmoke?.position.set(x,.03,z);
    if(!reduced){const factor=.2+.8*Math.pow(Math.abs(Math.cos(t*Math.PI*3)),2);for(const[light,intensity]of originals)light.intensity=intensity*factor;if(E.flashlight)E.flashlight.intensity=E._userFlashlightOn===false?0:(E._flashBaseIntensity||18)*factor;}
    if(pass.elapsed>=2){clearPass();startDim(true);}return;
   }
   if(dim){
    dim.elapsed+=dt;
    const blend=Math.min(1,Math.max(0,(dim.elapsed-3.8)/.7));dimScale(.5+.5*blend*blend*(3-2*blend));
    if(dim.elapsed>=dim.duration){finishDim();lastEventEnd=activeTime;}return;
   }
   if(exitCleared||activeTime<18||activeTime-lastEventEnd<24||scareClock-lastLoud<24||audioBusy)return;
   const crossed=threshold=>entryCount<threshold&&collected>=threshold;
   // Progress can slightly advance a deadline, never bypass a real quiet interval.
   const passDue=passes<4&&(refs().runner||reduced)&&(scareClock>=nextPass||(crossed([2,8,13,16][passes])&&scareClock>=nextPass-5));
   const soundDue=scareClock>=nextUnease||(uneases<3&&crossed([4,10,15][uneases])&&scareClock>=nextUnease-3);
   if(passDue&&(!soundDue||lastEventType!=='pass')){startPass();return;}
   if(soundDue){
    // Hear the three new cues before the older pair, then cycle all five without repeats.
    if(!uneaseBag.length)uneaseBag=uneases===0?STUDY_UNEASE_CLIPS.slice(0,3):uneases===3?STUDY_UNEASE_CLIPS.slice(3):[...STUDY_UNEASE_CLIPS];
    const clip=uneaseBag.splice(Math.min(uneaseBag.length-1,Math.floor(random()*uneaseBag.length)),1)[0];uneases++;
    E.audio?.setCrying?.(0,0,false);startDim();E.audio?.playClip?.(clip,{channel:'unease',volume:.35,limitSeconds:4.5,fadeOutSeconds:.35,onEnded:()=>{if(!disposed)lastEventEnd=activeTime;}});lastLoud=scareClock;lastEventType='unease';nextUnease=scareClock+85+random()*15;audioWasBusy=busy();
   }
  },
  dispose(){
   if(finale){hideFace(false);const f=finale;finale=null;for(const [m,intensity]of f.emissive||[])m.emissiveIntensity=intensity;restoreLights();if(f.screenColor&&refs().screenMaterial?.color)refs().screenMaterial.color.copy(f.screenColor);}
   finishDim();disposed=true;clearPass();const r=refs();if(r.spirit)r.spirit.visible=false;if(r.closeup)r.closeup.visible=false;
   for(const c of ['finale','piano','unease','crying'])E.audio?.stopClip?.(c);
  }
 };
}

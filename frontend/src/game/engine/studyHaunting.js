import * as THREE from 'three';
import {setTorch} from './studyTorch.js';
import {createStudyQuietDetails} from './studyQuietDetails.js';

export const PROCESSION_POINTS=[[0,5.7],[0,3.45],[1.8,2.4],[2.5,1.3],[2.5,-.5],[2.45,-2.6],[1.05,-3.25],[0,-4.65],[0,-6.1]];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const angle=(a,b)=>THREE.MathUtils.euclideanModulo(b-a+Math.PI,Math.PI*2)-Math.PI;
const storyChannels=['story','storySteps','storySting','storyDoor'];

export function createStudyHaunting(E,scares,{random=Math.random,storage=globalThis.localStorage,reduced=false}={}){
 const key=(E.studyStorageKey||'ctc.study.local')+'.procession.v1';let seen=false;try{seen=storage?.getItem(key)==='played';}catch{}
 let phase=seen?'done':'waiting',elapsed=0,active=0,deadline=60+random()*15,quietDue=110+random()*35,quiet=null,disposed=false,lookSound=false,exitOpened=false;
 let postDelay=12+random()*3,viewYaw=0,viewPitch=0,pronePose=null,recovery=0,bodyWasVisible=false,torchVisible=true;
 const lightOriginals=new Map(),emissives=new Map();let screenColor=null;
 const details=createStudyQuietDetails(E,{reduced});
 const curve=new THREE.CatmullRomCurve3(PROCESSION_POINTS.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
 const refs=()=>E.ref.studyProcession||{},state=()=>E._studyState||{},audio=()=>E.audio;
 const major=()=>!['waiting','done'].includes(phase),free=()=>phase==='aftermath'||phase==='recovery';
 const report=(caption='')=>E.reportStudyCinematic?.({phase,locked:major()&&!free(),caption});
 const stopStory=()=>storyChannels.forEach(c=>audio()?.stopClip?.(c));
 const lighting=factor=>{
  for(const [l,v]of lightOriginals)l.intensity=v*factor;
  for(const [m,v]of emissives)m.emissiveIntensity=v*factor;
  if(screenColor&&E.ref.studyHorror?.screenMaterial?.color)E.ref.studyHorror.screenMaterial.color.copy(screenColor).multiplyScalar(factor);
  E._studyLightScale=factor;setTorch(E,E._userFlashlightOn!==false);
 };
 const snapshot=()=>{
  lightOriginals.clear();emissives.clear();const capture=l=>{if(!lightOriginals.has(l))lightOriginals.set(l,l.intensity);};
  for(const l of E.ref.studyHorror?.flickerLights||[])capture(l);
  E.S?.traverse?.(o=>{if(o.isLight)capture(o);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.emissive?.getHex()&&!emissives.has(m))emissives.set(m,m.emissiveIntensity);});
  screenColor=E.ref.studyHorror?.screenMaterial?.color?.clone?.();
 };
 const setView=(x,z,yaw,pitch,height=1.6,roll=0)=>{E.setStudyView?.(x,z,yaw,pitch,height,roll);viewYaw=yaw;viewPitch=pitch;};
 const lock=on=>{E._studyCinematicInput=on;if(on)E.unlockStudy?.();};
 const hideActors=()=>{const r=refs();if(r.woman)r.woman.visible=false;if(r.gurney)r.gurney.visible=false;if(r.closeup)r.closeup.visible=false;};
 const doors=exit=>{if(E.ref.studyExitDoor)E.ref.studyExitDoor.scriptOpen=exit;};
 const to=(next,caption='')=>{phase=next;elapsed=0;report(caption);};
 const play=(clip,options={})=>audio()?.playClip?.(clip,{channel:'story',volume:.4,...options});
 const assetsReady=()=>Boolean(refs().woman&&refs().gurney&&refs().closeup);
 const assetsFailed=()=>Boolean(E._studyAssetProgress&&E._studyAssetProgress.loaded+E._studyAssetProgress.failed>=E._studyAssetProgress.total&&!assetsReady());
 const eligible=()=>active>=deadline&&(E._studyProgress?.collected||0)>=6;
 const begin=()=>{
  if(disposed||phase!=='waiting'||!eligible()||!assetsReady()||scares?.isBusy?.())return false;
  try{storage?.setItem(key,'played');}catch{}
  quiet=null;audio()?.setAtmosphereSilence?.(false,.2);
  E._studyHorrorReserved=true;lock(true);snapshot();lighting(.75);
  // Keep the original Basement ghost exactly where it was during this event.
  scares?.preserveSpirit?.();
  const old=E.ref.studyHorror;if(old){bodyWasVisible=old.windowGhost?.visible??false;if(old.windowGhost)old.windowGhost.visible=false;}
  audio()?.setCrying?.(0,0,false);audio()?.stopClip?.('subtle');to('knock-one','A knock at Lena’s door.');play('doorKnock',{pan:.55});return true;
 };
 const end=()=>{
  lighting(1);lightOriginals.clear();emissives.clear();stopStory();audio()?.stopClip?.('subtle');hideActors();doors(false);lock(false);E._studyBlackout=0;E._studyEyeHeight=1.6;E._studyCameraRoll=0;E._studyHorrorReserved=false;audio()?.setAtmosphereSilence?.(false,.6);
  if(bodyWasVisible&&E.ref.studyHorror?.windowGhost)E.ref.studyHorror.windowGhost.visible=true;to('done');
  if(E.flashlightModel)E.flashlightModel.visible=torchVisible;
 };
 return {
  getPhase:()=>phase,
  beforeExit(){
   // The end-door finale takes ownership from a quiet wall-knock event immediately.
   // Leaving its reservation active would pause the finale's audio and safety clock.
   if(quiet){quiet=null;quietDue=Infinity;E._studyHorrorReserved=false;audio()?.stopClip?.('subtle');audio()?.setAtmosphereSilence?.(false,.2);}
   if(phase==='waiting'&&assetsFailed()){phase='done';return {blocked:false};}
   // Do not force the optional procession early, or block a completed player's exit.
   // Skip it for this visit once the existing Basement finale is requested.
   if(phase==='waiting'&&!eligible()){phase='done';return {blocked:false};}
   if(phase==='waiting'){if(!begin())return {blocked:true,message:'Something is moving behind Lena’s door. Wait a moment.'};}
   if(major())return {blocked:true,message:phase==='recovery'?`Catch your breath (${Math.ceil(Math.max(0,30-recovery))}s) before opening the Basement.`:'Something is still moving nearby. Stay in the Study.'};
   return {blocked:false};
  },
  standUp(){if(phase!=='prone'||disposed)return false;to('standing','Getting back on your feet…');audio()?.setAtmosphereSilence?.(false,.8);return true;},
  tick(dt){
   if(disposed)return;
   const s=state(),typing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
   const suspended=!s.started||document.hidden||typing||(s.paused&&!E._studyCinematicInput);
   if(suspended){if(major()||quiet)audio()?.setHorrorPaused?.(true);return;}
   active+=dt;if(major()||quiet)audio()?.setHorrorPaused?.(false);
   if(phase==='waiting'){
    if(assetsFailed())phase='done';
    else if(eligible()&&assetsReady()&&!scares?.isBusy?.())begin();
   }
   if(!major()){
    if(quiet){
     quiet.elapsed+=dt;if(quiet.elapsed>=4&&!quiet.knocked){quiet.knocked=true;play('doorKnock',{channel:'subtle',volume:.18,pan:-.85,limitSeconds:.65,fadeOutSeconds:.2});}
     if(quiet.elapsed>=7){quiet=null;E._studyHorrorReserved=false;audio()?.setAtmosphereSilence?.(false,1);quietDue=Infinity;}return;
    }
    if(!scares?.isBusy?.()){
     details.tick(dt);
     if(active>=quietDue){quiet={elapsed:0,knocked:false};E._studyHorrorReserved=true;audio()?.setCrying?.(0,0,false);audio()?.setAtmosphereSilence?.(true,.6);}
    }return;
   }
   elapsed+=dt;const r=refs(),knockDuration=audio()?.getDuration?.('doorKnock',2.1)||2.1;
   if(phase==='knock-one'){
    if(elapsed>=knockDuration){to('relocate');}return;
   }
   if(phase==='relocate'){
    E._studyBlackout=reduced?Math.sin(Math.PI*Math.min(1,elapsed/.7)):Math.min(1,elapsed<.35?elapsed/.2:(.7-elapsed)/.25);
    if(elapsed>=.3)setView(4.05,.35,Math.atan2(4.05,.35-4.34),-.05);
    if(elapsed>=.7){E._studyBlackout=0;to('knock-two','Do not move.');play('doorKnock',{pan:-.5});}return;
   }
   if(phase==='knock-two'){
    if(elapsed>=knockDuration){to('opening');play('doorCreak',{channel:'storyDoor',volume:.26,limitSeconds:3,fadeOutSeconds:.4});}return;
   }
   if(phase==='opening'){
    if(elapsed>=2){r.woman.visible=r.gurney.visible=true;lookSound=exitOpened=false;to('crossing');play('paranormal',{volume:.17,loop:true});play('processionSteps',{channel:'storySteps',volume:.085,loop:true});}return;
   }
   if(phase==='crossing'){
    const u=Math.min(1,elapsed/24),p=curve.getPointAt(u),tangent=curve.getTangentAt(u),yaw=Math.atan2(tangent.x,tangent.z);
    r.gurney.position.copy(p);r.gurney.rotation.y=yaw;
    r.woman.position.copy(p).addScaledVector(tangent,-1.05);r.woman.position.y=.015;r.woman.rotation.y=yaw;
    for(const wheel of r.wheels||[])wheel.rotation.z-=dt*3.6;
    const looking=elapsed>=9&&elapsed<11.7;
    r.animate?.(dt,looking?new THREE.Vector3(4.05,1.6,.35):null,yaw);
    if(looking&&!lookSound){lookSound=true;play('uneaseB',{channel:'storySting',volume:.32,limitSeconds:2.7,fadeOutSeconds:.4});}
    const target=r.woman.position.clone();target.y=1.45;const dx=target.x-4.05,dz=target.z-.35,wanted=Math.atan2(-dx,-dz),pitch=Math.atan2(target.y-1.6,Math.hypot(dx,dz));
    setView(4.05,.35,viewYaw+angle(viewYaw,wanted)*Math.min(1,dt*1.7),viewPitch+(pitch-viewPitch)*Math.min(1,dt*1.7));
    if(u>.81&&!exitOpened){exitOpened=true;if(E.ref.studyExitDoor)E.ref.studyExitDoor.scriptOpen=true;play('doorCreak',{channel:'storyDoor',volume:.24,limitSeconds:3,fadeOutSeconds:.4});}
    if(elapsed>=24){hideActors();doors(false);stopStory();lighting(1);lock(false);audio()?.setAtmosphereSilence?.(true,.3);to('aftermath');}return;
   }
   if(phase==='aftermath'){
    if(elapsed>=10)audio()?.setAtmosphereSilence?.(false,.8);
    if(elapsed>=postDelay){
     lock(true);snapshot();lighting(.5);audio()?.setAtmosphereSilence?.(true,.2);r.closeup.visible=true;r.faceMaterials?.forEach(m=>{m.opacity=1;});pronePose={x:E.px?.()||4.05,z:E.pz?.()||.35,yaw:E.yaw?.()||viewYaw};
     torchVisible=E.flashlightModel?.visible??true;if(E.flashlightModel)E.flashlightModel.visible=false;
     to('shock');play('fuzzy',{channel:'storySting',volume:.65,limitSeconds:7,fadeOutSeconds:3});
    }return;
   }
   if(phase==='shock'){
    r.faceMaterials?.forEach(m=>{m.opacity=1-smooth((elapsed-3.5)/.5);});
    if(elapsed>=4){r.closeup.visible=false;E._studyBlackout=1;setView(pronePose.x,pronePose.z,pronePose.yaw,1.25,.18,-.14);to('blackout');}return;
   }
   if(phase==='blackout'){
    if(elapsed>=3){stopStory();to('blinking');}return;
   }
   if(phase==='blinking'){
    E._studyBlackout=reduced?1-smooth(elapsed/1.6):elapsed<.5?1-smooth(elapsed/.5)*.85:elapsed<.8?.93:1-smooth((elapsed-.8)/.8);
    if(elapsed>=1.6){E._studyBlackout=0;to('prone','You passed out. Press Q to stand up.');}return;
   }
   if(phase==='standing'){
    const t=smooth(elapsed/1.3);setView(pronePose.x,pronePose.z,pronePose.yaw,1.25*(1-t),.18+1.42*t,-.14*(1-t));lighting(.5+.5*t);
    if(elapsed>=1.3){lighting(1);if(E.flashlightModel)E.flashlightModel.visible=torchVisible;lock(false);recovery=0;to('recovery');}return;
   }
   if(phase==='recovery'){recovery+=dt;if(recovery>=30)end();}
  },
  dispose(){disposed=true;details.dispose();end();}
 };
}

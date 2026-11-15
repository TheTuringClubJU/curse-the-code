import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import {attachTorch,updateTorchSway,setTorch,bindTorchKey} from './studyTorch.js'
import {createStudyScares} from './studyScares.js'
import {createStudyHaunting} from './studyHaunting.js'
import {createStudyQuality} from './studyQuality.js'
import {createStudyPicker} from './studyPicking.js'
import {isStudyLowDetail,capStudyTextures,optimizeStudyMaterials} from './studyPerformance.js'
import * as THREE from 'three'
import * as X from './tex.js'
import {TX,bgeo,mat,wm} from './kit.js'
import {buildBedroom} from './scene.js'
import {buildStudy} from './studyScene.js'
import {createScares} from './scares.js'
import {buildRecordsScene} from './sceneRecords.js'
import {createRecordsScares} from './scaresRecords.js'
import {setupControls} from './controls.js'
import {buildBasement} from './basementScene.js'
export {posterCanvas} from './tex.js'

export function createEngine(el,room,h){
 const tb0=performance.now()
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,T=room.theme,[W,H,D]=room.size,debug=new URLSearchParams(location.search).has('debug')
 const studyLow=room.id==='study'&&isStudyLowDetail(),nativeRatio=Math.min(devicePixelRatio,studyLow?.85:1);
 const R=new THREE.WebGLRenderer({antialias:!studyLow,...(room.id==='study'?{powerPreference:'high-performance'}:{})});R.setPixelRatio(nativeRatio);R.powerPreference='high-performance';R.setSize(el.clientWidth,el.clientHeight);R.shadowMap.enabled=!studyLow;R.shadowMap.type=THREE.BasicShadowMap;R.shadowMap.autoUpdate=false;R.shadowMap.needsUpdate=!studyLow;
 R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.6;el.appendChild(R.domElement)
 const S=new THREE.Scene();S.background=new THREE.Color(T.bg);S.fog=new THREE.FogExp2(T.bg,.045)
 const cam=new THREE.PerspectiveCamera(72,el.clientWidth/el.clientHeight,.05,room.id==='study'?240:80);cam.rotation.order='YXZ';S.add(cam)
 const solids=[],pick=[],byId={},rigL=[],rigG=[],anims=[],sc={v:1},ref={}
 const rnd=(a,b)=>a+Math.random()*(b-a)
 const flick=(seed,amt=.3)=>t=>1-amt*Math.abs(Math.sin(t*(6.3+seed%5)+seed)*Math.sin(t*(2.9+seed%3)+seed*1.7))-.04*Math.abs(Math.sin(t*31+seed))
 let tl=performance.now();const E={lap:n=>{if(debug){const t=performance.now();console.info('[ctc] lap',n,Math.round(t-tl));tl=t}},S,cam,W,H,D,win:room.window,ref,sc,lampMats:[],lampGlow:null,flick,lightScale:()=>sc.v,audio:h.audio,
  anim:f=>anims.push(f),solid:(x0,x1,z0,z1)=>solids.push({x0,x1,z0,z1}),glow:(m,b,f)=>rigG.push({m,b,f:f||flick(Math.floor(Math.random()*90),.3)}),lightRig:(l,b,f)=>rigL.push({l,b,f}),
  interact(obj,id){obj.traverse(o=>{if(o.isMesh){o.userData.id=id;delete o.userData.np}})},
  add(obj,o={}){obj.traverse(m=>{if(!m.isMesh)return;if(!m.userData.ns&&!o.noShadow){m.castShadow=true}m.receiveShadow=true;if(!m.userData.np){pick.push(m);if(m.userData.id)(byId[m.userData.id]??=[]).push(m)}});S.add(obj);return obj}}
 E.renderStudyFrame=()=>{const horror=ref.studyHorror,story=ref.studyProcession;
  if(story?.closeup?.visible&&story.overlayScene)R.render(story.overlayScene,story.overlayCamera);
  else if(horror?.closeup?.visible&&horror.overlayScene)R.render(horror.overlayScene,horror.overlayCamera);
  else {R.render(S,cam);if(story?.blinkScene&&E._studyBlackout>0){story.blackMaterial.opacity=E._studyBlackout;R.autoClear=false;R.clearDepth();R.render(story.blinkScene,story.blinkCamera);R.autoClear=true;}}
 };
 let lamp=null,LB=room.id==='study'?3:9,scares=null;
 const studyCleanups=[];let studyDisposed=false;
 if(room.id==='study'){
   E._studyState={started:false,paused:true};E.renderer=R;E.studyLowDetail=studyLow;E.studyStorageKey=h.studyStorageKey;
   E.reportStudyFinale=active=>{if(!studyDisposed)h.onStudyFinale?.(active);};
   E.reportStudyCinematic=event=>{if(!studyDisposed)h.onStudyCinematic?.(event);};
   E.onDispose=fn=>studyCleanups.push(fn);
   E.reportStudyAsset=progress=>{if(!studyDisposed)h.onStudyAssets?.(progress);};
   const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
   E.loadGLB=async url=>{
     await MeshoptDecoder.ready;
     const gltf=await loader.loadAsync(url);
     if(studyDisposed){gltf.scene.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m){Object.values(m).forEach(v=>{if(v?.isTexture)v.dispose();});m.dispose();}});});throw new Error('Study disposed');}
     if(studyLow)capStudyTextures(gltf.scene);
     optimizeStudyMaterials(gltf.scene);
     return gltf;
   };
   E.retire=root=>{if(!root)return;root.traverse(m=>{const i=pick.indexOf(m);if(i>=0)pick.splice(i,1);const list=byId[m.userData.id];if(list){const j=list.indexOf(m);if(j>=0)list.splice(j,1);}});root.visible=false;};
   attachTorch(E,cam);studyCleanups.push(bindTorchKey(E));
 }


 if(room.id === 'study'){
   buildStudy(E);scares=createStudyScares(E,reduce);
 } else if(room.id === 'records'){
   // Tactical Heavy-duty Player Flashlight
   const flashL = new THREE.SpotLight(0xfff0d8, 4.2, 16, Math.PI / 5.5, 0.45, 1.6);
   flashL.position.set(0.18, -0.15, 0.1);
   flashL.target.position.set(0, 0, -5);
   cam.add(flashL);
   cam.add(flashL.target);
   E.flashlight = flashL;

   // Ambient sub-station fill light
   const ambHemi = new THREE.HemisphereLight(0x2a363a, 0x080a0c, 1.2);
   S.add(ambHemi);

   buildRecordsScene(E);
   scares = createRecordsScares(E, h);
 } else {
   // ---- shell: textured walls, floor, ceiling, trim ----
   const wp=X.tex(X.wallpaper()),wmat=new THREE.MeshStandardMaterial({map:wp,bumpMap:wp,bumpScale:.5,roughness:.92,color:0xffffff})
   const fl=X.floorPlanks(),fmat=new THREE.MeshStandardMaterial({map:X.tex(fl.map),bumpMap:X.tex(fl.bump,{srgb:false}),bumpScale:1.2,roughness:.62,metalness:.04})
   const cmat=new THREE.MeshStandardMaterial({map:X.tex(X.ceiling()),roughness:1})
   const box=(p,s,m,u=1.1)=>{const o=new THREE.Mesh(bgeo(...s,u),m);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;S.add(o);return o}
   box([0,-.05,0],[W,.1,D],fmat,1);const cl=new THREE.Mesh(new THREE.BoxGeometry(W,.1,D),cmat);cl.position.set(0,H+.05,0);cl.receiveShadow=true;cl.castShadow=true;S.add(cl)
   const win=room.window,dec=(seed,w,hh,x,y,z,ry,o={})=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,hh),new THREE.MeshStandardMaterial({map:X.tex(X.wallDecal(seed,512,256,o)),transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-1}));m.position.set(x,y,z);m.rotation.y=ry;m.userData.np=1;S.add(m)}
   box([0,H/2,-D/2-.05],[W,H,.1],wmat);box([0,H/2,D/2+.05],[W,H,.1],wmat);box([W/2+.05,H/2,0],[.1,H,D],wmat)
   dec(1,W,H,0,H/2,-D/2+.006,0,{leaks:5});dec(2,W,H,0,H/2,D/2-.006,Math.PI,{leaks:4});dec(3,D,H,W/2-.006,H/2,0,-Math.PI/2,{leaks:4})
   if(win){const a=win.z-win.w/2,b=win.z+win.w/2,lw=(z0,z1,y0,y1)=>box([-W/2-.05,(y0+y1)/2,(z0+z1)/2],[.1,y1-y0,z1-z0],wmat);lw(-D/2,a,0,H);lw(b,D/2,0,H);lw(a,b,0,win.y0);lw(a,b,win.y1,H)
    dec(4,a+D/2,H,-W/2+.006,H/2,(-D/2+a)/2,Math.PI/2,{leaks:2});dec(5,D/2-b,H,-W/2+.006,H/2,(b+D/2)/2,Math.PI/2,{leaks:2})}else box([-W/2-.05,H/2,0],[.1,H,D],wmat)
   const tr=wm('ebony',{r:.7}),trim=(y,hh,dp)=>[[0,-D/2+dp/2,W,0],[0,D/2-dp/2,W,0],[-W/2+dp/2,0,D,1],[W/2-dp/2,0,D,1]].forEach(([x,z,l,r])=>{box([x,y,z],r?[dp,hh,l]:[l,hh,dp],tr,1.6).castShadow=false})
   trim(.08,.16,.04);trim(H-.05,.1,.08)
   // ---- lights ----
   const hemi=new THREE.HemisphereLight(0x6a72d8,0x2a1a4a,room.id==='study'?.35:1.5);S.add(hemi)
   const moonL=new THREE.DirectionalLight(T.moon,room.id==='study'?.8:2.2);moonL.position.set(-9,5,win?win.z:0);moonL.target.position.set(2,0,win?win.z:0);S.add(moonL.target);moonL.castShadow=true;moonL.shadow.mapSize.set(512,512);moonL.shadow.autoUpdate=false;moonL.shadow.needsUpdate=true;moonL.shadow.bias=-.0004;moonL.shadow.normalBias=.03;Object.assign(moonL.shadow.camera,{left:-8,right:8,top:8,bottom:-8,far:30});S.add(moonL);E.bakeShadows=()=>{moonL.shadow.needsUpdate=true;}
   lamp=new THREE.PointLight(T.lamp,room.lamp?9:0,10,2);if(room.lamp)lamp.position.set(...room.lamp.pos);lamp.castShadow=false;lamp.shadow.mapSize.set(256,256);lamp.shadow.bias=-.002;S.add(lamp);
   if(room.id==='study'||room.builder==='study')buildStudy(E);else if(room.id==='basement')buildBasement(E);else if(room.haunted)buildBedroom(E);else{
    S.add(new THREE.PointLight(T.accent,3,10,2));(room.boxes||[]).forEach(b=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...b.s),new THREE.MeshStandardMaterial({color:b.c,roughness:.9}));o.position.set(...b.p);S.add(o);if(b.solid){const[x,y,z]=b.p,[w,hh,d]=b.s;solids.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2})}})}
   scares=room.id==='study'?createStudyScares(E,reduce):room.haunted?createScares(E,h):null
 }
 if(debug)console.info('[ctc] scene built in',Math.round(performance.now()-tb0),'ms')

 // ---- SINGLE SOURCE OF TRUTH CONTROLS INITIALIZATION ----
 const ray=new THREE.Raycaster(),v0=new THREE.Vector2();
 const hl = (id, on) => {
   byId[id]?.forEach(m => {
     if (!m.userData.__highlightOriginalMaterials) {
       const original = Array.isArray(m.material) ? m.material.slice() : m.material;
       m.userData.__highlightOriginalMaterials = original;
       m.userData.__highlightMaterials = Array.isArray(original)
         ? original.map(q => q?.clone?.() || q)
         : original?.clone?.() || original;
       m.material = m.userData.__highlightMaterials;
     }
     const mats = Array.isArray(m.userData.__highlightMaterials)
       ? m.userData.__highlightMaterials
       : [m.userData.__highlightMaterials];
     mats.forEach(q => {
       if (q && q.emissive && typeof q.emissive.setHex === 'function') {
         q.emissive.setHex(on ? (room.id === 'study' ? 0x16110a : room.id === 'basement' ? 0xff3030 : (room.id === 'records' ? 0xb37418 : 0x4a3c9a)) : 0);
       }
     });
   });
 };
 let flickUntil=0,nextFlick=performance.now()+4000,shakeT=0,shakeA=0;

 const controls = setupControls({
   canvas: R.domElement,
   onInteract: (targetId) => {
     if(room.id!=='study'||(!E._studyState.paused&&!E._studyCinematicInput))h.onInteract?.(targetId);
   },
   onTargetChange: (targetId) => {
     h.onTarget?.(targetId);
   },
   getAudio: () => h.audio,
   getSolids: () => solids,
   roomSize: [W, H, D],
   spawn: room.spawn,
   isInputBlocked:()=>room.id==='study'&&Boolean(E._studyCinematicInput)
 });

 Object.assign(E,{
   px: () => controls.getPos().x,
   pz: () => controls.getPos().z,
   yaw: () => controls.getPos().yaw,
   shake: (a,d) => { shakeA=a; shakeT=d; },
   get paused() { return false; }
 });
 E.unlockStudy=()=>{controls.unlock();controls.resetInput();};
 E.setStudyView=(x,z,yaw,pitch,height=1.6,roll=0)=>{controls.setView(x,z,yaw,pitch);E._studyEyeHeight=height;E._studyCameraRoll=roll;cam.position.set(x,height,z);cam.rotation.set(pitch,yaw,roll);};
 const haunting=room.id==='study'?createStudyHaunting(E,scares,{reduced:reduce}):null;

 const disposedTextures=new Set();
 const disposeMaterial=(material)=>{
  if(!material)return;
  Object.values(material).forEach(value=>{
   if(value?.isTexture&&!disposedTextures.has(value)){disposedTextures.add(value);value.dispose();}
  });
  material.dispose?.();
 }
 const rs=()=>{R.setSize(el.clientWidth,el.clientHeight);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix();if(room.id==='study')for(const refGroup of [ref.studyHorror,ref.studyProcession])if(refGroup?.overlayCamera){refGroup.overlayCamera.aspect=cam.aspect;refGroup.overlayCamera.updateProjectionMatrix();}}
 window.addEventListener('resize',rs)

 const fr=new THREE.Frustum(),pm=new THREE.Matrix4(),hp=new THREE.Vector3(),lp=new THREE.Vector3()
 let last=performance.now(),raf,halt=false,frameCount=0;const t0=last
 const studyPicker=room.id==='study'?createStudyPicker():null;let lastStudyPick=0;
 const FPS_LIMIT = 60;
 const studyQuality=room.id==='study'?createStudyQuality(R,nativeRatio,studyLow):null;
 const FRAME_INTERVAL = 1000 / FPS_LIMIT;
 let lastRenderTime = performance.now();

 const loop = now => {
   if (!halt) raf = requestAnimationFrame(loop);
   const elapsed = now - lastRenderTime;
   // Study follows the display's animation frames. Comparing a 60 Hz frame to
   // exactly 16.666 ms was discarding healthy frames on small timing variations.
   if (room.id!=='study'&&elapsed < FRAME_INTERVAL) return;

   lastRenderTime = room.id==='study'?now:now - (elapsed % FRAME_INTERVAL);
   const frameMs=now-last;last=now;
   const dt = Math.min(0.05, (room.id==='study'?frameMs:elapsed) / 1000);
   studyQuality?.tick(frameMs,E._studyState.paused||document.hidden||api._skip);
   frameCount++;
   const t = (now - t0) / 1000;
   haunting?.tick(Math.min(.25,frameMs/1000));

   // 1. Single-source Controls Update (WASD & Mouse Look)
   const ctrl = room.id==='study'&&(E._studyState.paused||E._studyCinematicInput) ? {...controls.getPos(),px:controls.getPos().x,pz:controls.getPos().z,yaw:cam.rotation.y,pitch:cam.rotation.x,walk:0,isMoving:false} : controls.update(dt);
   const px = ctrl.px;
   const pz = ctrl.pz;
   const yaw = ctrl.yaw;
   const pitch = ctrl.pitch;
   const walk = ctrl.walk;
   const mv = ctrl.isMoving ? 1 : 0;

   // Automatic walk-through transition when player steps into the open Study exit passage
   if (room.id === 'study' && E._studyProgress?.completed && pz <= -4.1 && Math.abs(px) < 1.2) {
     if (!E._studyState?.paused && !E._studyCinematicInput) {
       h.onInteract?.('study_door_exit');
     }
   }

   // Study aims at the current camera pose, at up to 30 Hz even on slower displays.
   if(room.id==='study'){cam.position.set(px,E._studyEyeHeight??1.6,pz);cam.rotation.set(pitch,yaw,E._studyCameraRoll||0);cam.updateMatrixWorld();}
   if (room.id==='study'?now-lastStudyPick>=1000/30:frameCount%2===0) {
     lastStudyPick=now;
     ray.setFromCamera(v0,cam);
     ray.far = 5.5;
     const hits = studyPicker?studyPicker.intersect(ray,pick):ray.intersectObjects(pick, false);
     const hitMesh = hits.find(it => it.object?.userData?.id);
     const id = hitMesh?.object?.userData?.id || null;

     const prevTarget = controls.getTarget();
     if (id !== prevTarget) {
       try {
         if (prevTarget) hl(prevTarget, 0);
         if (id) hl(id, 1);
       } catch (e) {
         console.warn("[HIGHLIGHT ERROR]", e);
       }
       controls.setTarget(id);
     }
   }

   scares?.tick(room.id==='study'?Math.min(.25,frameMs/1000):dt,t);
   h.audio?.listen?.(px,pz,yaw);

   let sx=0,sy=0;
   if(shakeT>0&&!reduce){shakeT-=dt;const k=shakeA*Math.max(0,shakeT)*3;sx=(Math.random()-.5)*k*.05;sy=(Math.random()-.5)*k*.05}
   cam.position.set(px+sx, (room.id==='study'?E._studyEyeHeight??1.6:1.6) + (mv && !reduce ? Math.sin(walk)*.022 : 0) + Math.sin(t*.9)*.004 + sy, pz);
   cam.rotation.set(pitch, yaw, room.id==='study'?E._studyCameraRoll||0:0);

   // lamp flicker
   if(lamp){
     if(!reduce&&room.id!=='study'){if(now>nextFlick){flickUntil=now+rnd(120,600);nextFlick=now+rnd(1800,6000)}}
     const lf=!reduce&&now<flickUntil?rnd(.05,.9):1,sv=sc.v
     lamp.intensity=LB*lf*sv;E.lampMats.forEach(m=>m.emissiveIntensity=.9*lf*sv);if(E.lampGlow)E.lampGlow.material.opacity=.55*lf*sv
   }
   
   rigL.forEach(r=>r.l.intensity=r.b*r.f(t)*sc.v);rigG.forEach(r=>r.m.emissiveIntensity=r.b*r.f(t)*sc.v)
   anims.forEach(f=>f(t,dt));if(room.id==='study')updateTorchSway(E,t,mv,reduce)
   if(ref.doll){cam.updateMatrixWorld();pm.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);fr.setFromProjectionMatrix(pm);const hd=ref.doll.head;hd.getWorldPosition(hp)
    if(!fr.containsPoint(hp)&&!ref.dollLock){lp.copy(cam.position);hd.parent.worldToLocal(lp);const tg=Math.max(-1.35,Math.min(1.35,Math.atan2(lp.x,lp.z)));hd.rotation.y+=(tg-hd.rotation.y)*Math.min(1,dt*1.6)}}
   ref.eyes?.forEach(e=>e.lookAt(cam.position))
   if(!api._skip){if(room.id==='study')E.renderStudyFrame();else R.render(S,cam)}
 }
 raf=requestAnimationFrame(loop)

 const api={
  setStudyState(state){if(room.id==='study'){E._studyState.exitScare=Boolean(state.exitScare);E._studyState.cinematic=Boolean(state.cinematic);Object.assign(E._studyState,state);if(state.paused&&!state.exitScare)controls.unlock();}},
  setStudyProgress(progress){if(room.id==='study'){E._studyProgress=progress;E.ref.updateStudyDisplays?.(progress);}},
  tryStudyExit(){if(room.id!=='study')return {blocked:false};const held=haunting?.beforeExit();return held?.blocked?held:scares?.requestExit?.()||{blocked:false};},
  standUpStudy(){return haunting?.standUp?.()||false;},
  notifyStudyEvent(event){if(room.id==='study'){E.ref.onStudyInteract?.(event);scares?.notify?.(event);}},
  setPaused(){ /* Intentionally no-op: movement & controls never get blocked! */ },
  lock(){ controls.requestLock(); },
  unlock(){ controls.unlock(); },
  setView(x,z,y,p=0){ controls.setView(x,z,y,p); },
  openDoor(){ 
    if(ref.bulkheadDoor) ref.bulkheadDoor.isOpen = true; 
    if(ref.roomDoor) ref.roomDoor.isOpen = true; 
    if(ref.studyExitDoor){ref.studyExitDoor.unlocked=true;ref.studyExitDoor.isOpen=scares?.isExitCleared?.()??true;}
  },
  closeDoor(){ 
    if(ref.bulkheadDoor) ref.bulkheadDoor.isOpen = false; 
    if(ref.roomDoor) ref.roomDoor.isOpen = false; 
    if(ref.studyExitDoor) ref.studyExitDoor.isOpen = false;
  },
  isDoorOpen(){ return !!(ref.bulkheadDoor?.isOpen || ref.roomDoor?.isOpen || ref.studyExitDoor?.isOpen); },
  setFlashlight(on){ if(room.id==='study'){setTorch(E,on);return;}if(E.flashlight) E.flashlight.intensity = on ? 4.2 : 0; },
  isFlashlightOn(){ return !!(E.flashlight && E.flashlight.intensity > 0); },
  halt(){ halt=true; cancelAnimationFrame(raf); },
  frame(){ last=performance.now()-16; loop(performance.now()); },
  step(n,ms=50){ api._skip=true; for(let i=0;i<n;i++){ last=performance.now()-ms; loop(performance.now()); } api._skip=false; last=performance.now()-16; loop(performance.now()); },
  triggerScare:n=>scares?.trigger(n),
  scares,haunting,
  setCountdown(text){ ref.wallMonitor?.setText?.(text); },
  dispose(){
    if(room.id==='study'){studyDisposed=true;halt=true;studyCleanups.forEach(fn=>fn());}
    cancelAnimationFrame(raf);
    haunting?.dispose();
    scares?.dispose?.();
    controls.dispose();
    window.removeEventListener('resize',rs);
    S.traverse(o=>{
      o.geometry?.dispose();
      if (Array.isArray(o.material)) o.material.forEach(disposeMaterial);
      else disposeMaterial(o.material);
    });
    R.dispose();
    R.domElement.remove();
  }
 }
 if(debug)window.__ctc={api,E,THREE,controls}
 return api
}

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import * as X from './tex.js'
import {TX,bgeo,mat,wm} from './kit.js'
import {buildBedroom} from './scene.js'
import {buildStudy} from './studyScene.js'
import {createScares} from './scares.js'
import {buildRecordsScene} from './sceneRecords.js'
import {createRecordsScares} from './scaresRecords.js'
import {buildControlScene} from './sceneControl.js'
import {createControlScares} from './scaresControl.js'
import {setupControls} from './controls.js'
import {attachTorch,updateTorchSway,setTorch,bindTorchKey} from './torch.js'
import {buildBasement} from './basementScene.js'
export {posterCanvas} from './tex.js'

export function createEngine(el,room,h){
 const tb0=performance.now()
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,T=room.theme,[W,H,D]=room.size,debug=new URLSearchParams(location.search).has('debug')
 const hwCores=typeof navigator!=='undefined'&&Number(navigator.hardwareConcurrency)>0?Number(navigator.hardwareConcurrency):8
 const devMem=typeof navigator!=='undefined'&&Number(navigator.deviceMemory)>0?Number(navigator.deviceMemory):8
 const isLowSpecControl=room.id==='control'&&(hwCores<=4||devMem<=4)
 const R=new THREE.WebGLRenderer({antialias:room.id==='control'?!isLowSpecControl:true,stencil:false,powerPreference:'high-performance'});R.setPixelRatio(Math.min(devicePixelRatio,1.0));R.setSize(el.clientWidth,el.clientHeight);R.shadowMap.enabled=true;R.shadowMap.type=THREE.BasicShadowMap;R.shadowMap.autoUpdate=false;R.shadowMap.needsUpdate=true;
 R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.6;el.appendChild(R.domElement)
 const S=new THREE.Scene();S.background=new THREE.Color(T.bg);S.fog=new THREE.FogExp2(T.bg,room.id==='control'?0.035:.045)
 const cam=new THREE.PerspectiveCamera(72,el.clientWidth/el.clientHeight,.05,80);cam.rotation.order='YXZ';S.add(cam)
 const solids=[],pick=[],byId={},visualById={},rigL=[],rigG=[],anims=[],sc={v:1},ref={}
 let pmremGen=null,pmremRT=null,gltfLoader=null,fbxLoader=null,halt=false;
 const TEX_KEYS=['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap'];
 const disposeObjectResources=(root)=>{
  if(!root)return;
  const disposedMats=new Set(),disposedTexs=new Set();
  root.traverse?.(o=>{
   o.geometry?.dispose?.();
   const mats=Array.isArray(o.material)?o.material:(o.material?[o.material]:[]);
   mats.forEach(m=>{
    if(!m||disposedMats.has(m))return;
    disposedMats.add(m);
    for(const k of TEX_KEYS){
     const tx=m[k];
     if(tx&&!disposedTexs.has(tx)){disposedTexs.add(tx);tx.dispose?.();}
    }
    m.dispose?.();
   });
  });
 };
 const getGLTFLoader = () => {
  if (!gltfLoader) {
   gltfLoader = new GLTFLoader();
   gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  }
  return gltfLoader;
 };
 const rnd=(a,b)=>a+Math.random()*(b-a)
 const flick=(seed,amt=.3)=>t=>1-amt*Math.abs(Math.sin(t*(6.3+seed%5)+seed)*Math.sin(t*(2.9+seed%3)+seed*1.7))-.04*Math.abs(Math.sin(t*31+seed))
 let tl=performance.now();const E={lap:n=>{if(debug){const t=performance.now();console.info('[ctc] lap',n,Math.round(t-tl));tl=t}},S,cam,W,H,D,win:room.window,ref,sc,lampMats:[],lampGlow:null,flick,lightScale:()=>sc.v,audio:h.audio,_pick:pick,_byId:byId,_visualById:visualById,_solids:solids,
  anim:f=>anims.push(f),
  solid:(x0,x1,z0,z1)=>{const box={x0,x1,z0,z1};solids.push(box);return box;},
  removeSolid:box=>{const i=solids.indexOf(box);if(i!==-1)solids.splice(i,1);},
  glow:(m,b,f)=>rigG.push({m,b,f:f||flick(Math.floor(Math.random()*90),.3)}),lightRig:(l,b,f)=>rigL.push({l,b,f}),
  bakeShadows:()=>{R.shadowMap.needsUpdate=true;},
  initPMREM:(intensity=0.28)=>{
   if(!pmremGen){
    pmremGen=new THREE.PMREMGenerator(R);
    pmremGen.compileEquirectangularShader();
    const envScene=new RoomEnvironment();
    pmremRT=pmremGen.fromScene(envScene,0.04);
    envScene.dispose();
    S.environment=pmremRT.texture;
   }
   S.environmentIntensity=intensity;
  },
  loadGLB:(url,onProgress)=>new Promise((resolve,reject)=>{
   MeshoptDecoder.ready.then(()=>{
    if(halt)return;
    getGLTFLoader().load(
     url,
     (g)=>{
      if(!halt){resolve(g);return;}
      disposeObjectResources(g?.scene);
     },
     onProgress,
     (err)=>{if(!halt)reject(err);}
    );
   }).catch((err)=>{if(!halt)reject(err);});
  }),
  loadFBX:(url,onProgress)=>new Promise((resolve,reject)=>{
   if(halt)return;
   if(!fbxLoader)fbxLoader=new FBXLoader();
   fbxLoader.load(
    url,
    (grp)=>{
     if(!halt){resolve(grp);return;}
     disposeObjectResources(grp);
    },
    onProgress,
    (err)=>{if(!halt)reject(err);}
   );
  }),
  visualInteract:(target,id)=>{
   const list=Array.isArray(target)?target:[target];
   const hlById = E._hlMatById || (E._hlMatById = new Map());
   let idCache = hlById.get(id);
   if (!idCache) {
    idCache = new WeakMap();
    hlById.set(id, idCache);
   }
   list.forEach(node=>{
    if(!node)return;
    node.traverse(o=>{
     if(o.isMesh&&o.material){
      if(o.userData._hlId !== id){
       const cloneForId = (m) => {
         if (!m) return m;
         if (idCache.has(m)) return idCache.get(m);
         const cm = m.clone();
         idCache.set(m, cm);
         return cm;
       };
       o.material=Array.isArray(o.material)?o.material.map(cloneForId):cloneForId(o.material);
       o.userData._hlId = id;
      }
      (visualById[id]??=[]).push(o);
     }
    });
   });
  },
  interact(obj,id){obj.traverse(o=>{if(o.isMesh){o.userData.id=id;delete o.userData.np;if(room.id==='control'&&o.material){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone()}}})},
  add(obj,o={}){obj.traverse(m=>{if(!m.isMesh)return;if(!m.userData.ns&&!o.noShadow){m.castShadow=true}m.receiveShadow=true;if(!m.userData.np){pick.push(m);if(m.userData.id)(byId[m.userData.id]??=[]).push(m)}});S.add(obj);return obj}}
 let lamp=null,LB=9,scares=null;

 if(room.id === 'records'){
   // Shared player torch (identical in every room: see torch.js)
   attachTorch(E, cam);

   // Ambient sub-station fill light
   const ambHemi = new THREE.HemisphereLight(0x2a363a, 0x080a0c, 1.2);
   S.add(ambHemi);

   buildRecordsScene(E);
   scares = createRecordsScares(E, h);
 } else if (room.id === 'control') {
   attachTorch(E, cam);

   R.shadowMap.enabled = false;
   R.setPixelRatio(Math.min(devicePixelRatio || 1, 0.85));
   R.toneMappingExposure = 1.28;
   S.fog = new THREE.FogExp2(0x050808, 0.034);
   const ambHemi = new THREE.HemisphereLight(0x5c7264, 0x1c221e, 0.86);
   S.add(ambHemi);

   buildControlScene(E, h);
   scares = createControlScares(E, h);
 } else {
   attachTorch(E, cam);
   E._torchUnbind = bindTorchKey(E);
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
   const hemi=new THREE.HemisphereLight(0x6a72d8,0x2a1a4a,1.5);S.add(hemi)
   const moonL=new THREE.DirectionalLight(T.moon,2.2);moonL.position.set(-9,5,win?win.z:0);moonL.target.position.set(2,0,win?win.z:0);S.add(moonL.target);moonL.castShadow=true;moonL.shadow.mapSize.set(512,512);moonL.shadow.autoUpdate=false;moonL.shadow.needsUpdate=true;moonL.shadow.bias=-.0004;moonL.shadow.normalBias=.03;Object.assign(moonL.shadow.camera,{left:-8,right:8,top:8,bottom:-8,far:30});S.add(moonL);E.bakeShadows=()=>{moonL.shadow.needsUpdate=true;}
   lamp=new THREE.PointLight(T.lamp,room.lamp?9:0,10,2);if(room.lamp)lamp.position.set(...room.lamp.pos);lamp.castShadow=false;lamp.shadow.mapSize.set(256,256);lamp.shadow.bias=-.002;S.add(lamp);
   if(room.id==='study'||room.builder==='study')buildStudy(E);else if(room.id==='basement')buildBasement(E);else if(room.haunted)buildBedroom(E);else{
    S.add(new THREE.PointLight(T.accent,3,10,2));(room.boxes||[]).forEach(b=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...b.s),new THREE.MeshStandardMaterial({color:b.c,roughness:.9}));o.position.set(...b.p);S.add(o);if(b.solid){const[x,y,z]=b.p,[w,hh,d]=b.s;solids.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2})}})}
   scares=room.haunted?createScares(E,h):null
 }
 if(debug)console.info('[ctc] scene built in',Math.round(performance.now()-tb0),'ms')

 // ---- SINGLE SOURCE OF TRUTH CONTROLS INITIALIZATION ----
 const ray=new THREE.Raycaster(),v0=new THREE.Vector2();
 const hl = (id, on) => {
   if (room.id === 'control') {
     const targets = [...(byId[id] || []), ...(visualById[id] || [])];
     targets.forEach(m => {
       const mats = Array.isArray(m.material) ? m.material : [m.material];
       mats.forEach(q => {
         if (q && q.emissive && typeof q.emissive.setHex === 'function') {
           if (on) {
             if (q.userData._origEmissive === undefined) {
               q.userData._origEmissive = q.emissive.getHex();
               q.userData._origEmissiveInt = q.emissiveIntensity ?? 1;
             }
             q.emissive.setHex(0x3b3019);
             q.emissiveIntensity = Math.max(q.userData._origEmissiveInt || 0.08, 0.16);
           } else if (q.userData._origEmissive !== undefined) {
             q.emissive.setHex(q.userData._origEmissive);
             q.emissiveIntensity = q.userData._origEmissiveInt;
           } else {
             q.emissive.setHex(0);
           }
         }
       });
     });
     return;
   }
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
         q.emissive.setHex(on ? (room.id === 'basement' ? 0xff3030 : (room.id === 'records' ? 0xb37418 : 0x4a3c9a)) : 0);
       }
     });
   });
 };
 let flickUntil=0,nextFlick=performance.now()+4000,shakeT=0,shakeA=0;

 const controls = setupControls({
   canvas: R.domElement,
   onInteract: (targetId) => {
     h.onInteract?.(targetId);
   },
   onTargetChange: (targetId) => {
     h.onTarget?.(targetId);
   },
   getAudio: () => h.audio,
   getSolids: () => solids,
   roomSize: [W, H, D],
   spawn: room.spawn,
   controlMode: room.id === 'control'
 });

 Object.assign(E,{
   px: () => controls.getPos().x,
   pz: () => controls.getPos().z,
   yaw: () => controls.getPos().yaw,
   isSprinting: () => Boolean(controls.isSprinting?.()),
   shake: (a,d) => { shakeA=a; shakeT=d; },
   get paused() { return false; }
 });

 const disposedTextures=new Set();
 const disposeMaterial=(material)=>{
  if(!material)return;
  Object.values(material).forEach(value=>{
   if(value?.isTexture&&!disposedTextures.has(value)){disposedTextures.add(value);value.dispose();}
  });
  material.dispose?.();
 }
 const rs=()=>{R.setSize(el.clientWidth,el.clientHeight);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}
 window.addEventListener('resize',rs)

 const fr=new THREE.Frustum(),pm=new THREE.Matrix4(),hp=new THREE.Vector3(),lp=new THREE.Vector3()
 let last=performance.now(),raf,frameCount=0;const t0=last
 const FPS_LIMIT = 60;
 const FRAME_INTERVAL = 1000 / FPS_LIMIT;
 let lastRenderTime = performance.now();
 let targetFov=72;
 const defaultEco = isLowSpecControl;
 let qualityMode = defaultEco ? 'eco' : 'high';
 if (room.id === 'control' && qualityMode === 'eco') {
   R.setPixelRatio(Math.min(devicePixelRatio || 1, 0.72));
 }
 E._qualityMode = qualityMode;
 const applyQualityMode = (mode) => {
   qualityMode = mode === 'eco' ? 'eco' : 'high';
   E._qualityMode = qualityMode;
   R.setPixelRatio(qualityMode === 'eco' ? Math.min(devicePixelRatio || 1, 0.65) : Math.min(devicePixelRatio || 1, 0.85));
   if (E._dustPoints) E._dustPoints.visible = qualityMode !== 'eco';
   E._onQualityModeChange?.(qualityMode);
   h.onQualityChange?.(qualityMode);
 };
 E.setQualityMode = applyQualityMode;
 E.setCameraOverride = (active, ty, tp) => controls.setCameraOverride?.(active, ty, tp);
 E.setTargetFov = (fov) => { targetFov = Math.max(42, Math.min(88, Number(fov) || 72)); };
 let slowFrames = 0;
 let autoSwitchedEco = false;
 let lastPausedRender = 0;

 const loop = now => {
   if (halt) return;
   raf = requestAnimationFrame(loop);
   let dt;
   if (room.id === 'control') {
     if (E._paused && now - lastPausedRender < 80) return;
     if (E._paused) lastPausedRender = now;
     const elapsed = now - last;
     last = now;
     dt = Math.min(0.05, Math.max(0.001, elapsed / 1000));
     frameCount++;
     const t = (now - t0) / 1000;
     if (!E._paused && !autoSwitchedEco && qualityMode === 'high' && t > 3.5) {
       if (elapsed > 33 && elapsed < 150) {
         slowFrames++;
         if (slowFrames >= 45) {
           autoSwitchedEco = true;
           applyQualityMode('eco');
         }
       } else if (elapsed < 25) {
         slowFrames = Math.max(0, slowFrames - 1);
       }
     }
   } else {
     const elapsed = now - lastRenderTime;
     if (elapsed < FRAME_INTERVAL) return;
     lastRenderTime = now - (elapsed % FRAME_INTERVAL);
     dt = Math.min(0.05, elapsed / 1000);
     frameCount++;
   }
   const t = (now - t0) / 1000;

   // 1. Single-source Controls Update (WASD & Mouse Look)
   const ctrl = controls.update(dt);
   const px = ctrl.px;
   const pz = ctrl.pz;
   const yaw = ctrl.yaw;
   const pitch = ctrl.pitch;
   const walk = ctrl.walk;
   const mv = ctrl.isMoving ? 1 : 0;

   // 2. Aim Raycast check (skip when paused/modal open in control room)
   if (frameCount % 2 === 0 && !(room.id === 'control' && E._paused)) {
     if (room.id === 'control' && controls.getPointerNDC) {
       const ndc = controls.getPointerNDC();
       v0.set(ndc.x, ndc.y);
     }
     ray.setFromCamera(v0,cam);
     ray.far = room.id === 'control' ? 4.2 : 5.5;
     const hits = ray.intersectObjects(pick, false);
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

   if (!(room.id === 'control' && E._paused)) {
     scares?.tick(dt,t);
   }
   h.audio?.listen?.(px,pz,yaw);

   let sx=0,sy=0;
   if(shakeT>0&&!reduce){shakeT-=dt;const k=shakeA*Math.max(0,shakeT)*3;sx=(Math.random()-.5)*k*.05;sy=(Math.random()-.5)*k*.05}
   cam.position.set(px+sx, 1.6 + (mv && !reduce ? Math.sin(walk)*.022 : 0) + Math.sin(t*.9)*.004 + sy, pz);
   cam.rotation.set(pitch, yaw, 0);
   if (room.id === 'control' && Math.abs(cam.fov - targetFov) > 0.08) {
     cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 15);
     cam.updateProjectionMatrix();
   }
   updateTorchSway(E, t, mv, reduce);

   // lamp flicker
   if(lamp){
     if(!reduce){if(now>nextFlick){flickUntil=now+rnd(120,600);nextFlick=now+rnd(1800,6000)}}
     const lf=!reduce&&now<flickUntil?rnd(.05,.9):1,sv=sc.v
     lamp.intensity=LB*lf*sv;E.lampMats.forEach(m=>m.emissiveIntensity=.9*lf*sv);if(E.lampGlow)E.lampGlow.material.opacity=.55*lf*sv
   }
   
   rigL.forEach(r=>r.l.intensity=r.b*r.f(t)*sc.v);rigG.forEach(r=>r.m.emissiveIntensity=r.b*r.f(t)*sc.v)
   anims.forEach(f=>f(t,dt))
   if(ref.doll){cam.updateMatrixWorld();pm.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);fr.setFromProjectionMatrix(pm);const hd=ref.doll.head;hd.getWorldPosition(hp)
    if(!fr.containsPoint(hp)&&!ref.dollLock){lp.copy(cam.position);hd.parent.worldToLocal(lp);const tg=Math.max(-1.35,Math.min(1.35,Math.atan2(lp.x,lp.z)));hd.rotation.y+=(tg-hd.rotation.y)*Math.min(1,dt*1.6)}}
   ref.eyes?.forEach(e=>e.lookAt(cam.position))
   if(!api._skip)R.render(S,cam)
 }
 raf=requestAnimationFrame(loop)

 const api={
  setPaused(p){
    E._paused = Boolean(p);
    if (room.id === 'control') controls.setPaused?.(Boolean(p));
  },
  setSensitivity(s){ controls.setSensitivity?.(s); },
  lock(){ controls.requestLock(); },
  unlock(){ controls.unlock(); },
  isLocked(){ return !!controls.isLocked?.(); },
  setView(x,z,y,p=0){ controls.setView(x,z,y,p); },
  getPos(){ return controls.getPos(); },
  getGhostPos(){
    const g = E._ghost;
    if (!g?.root) return null;
    return {
      x: g.root.position.x,
      z: g.root.position.z,
      isHunting: Boolean(g.isHunting),
    };
  },
  openDoor(){ 
    if(ref.bulkheadDoor) ref.bulkheadDoor.isOpen = true; 
    if(ref.roomDoor) ref.roomDoor.isOpen = true; 
    if(ref.studyExitDoor) ref.studyExitDoor.isOpen = true;
  },
  closeDoor(){ 
    if(ref.bulkheadDoor) ref.bulkheadDoor.isOpen = false; 
    if(ref.roomDoor) ref.roomDoor.isOpen = false; 
    if(ref.studyExitDoor) ref.studyExitDoor.isOpen = false;
  },
  isDoorOpen(){ return !!(ref.bulkheadDoor?.isOpen || ref.roomDoor?.isOpen || ref.studyExitDoor?.isOpen); },
  setFlashlight(on){ setTorch(E, on); },
  isFlashlightOn(){ return !!(E.flashlight && E.flashlight.intensity > 0); },
  halt(){ halt=true; cancelAnimationFrame(raf); },
  frame(){ last=performance.now()-16; loop(performance.now()); },
  step(n,ms=50){ api._skip=true; for(let i=0;i<n;i++){ last=performance.now()-ms; loop(performance.now()); } api._skip=false; last=performance.now()-16; loop(performance.now()); },
  triggerScare:n=>scares?.trigger(n),
  scares,
  setCountdown(text){ ref.wallMonitor?.setText?.(text); },
  _controlBuilt: room.id === 'control',
  toggleControlDoor: () => E.toggleControlDoor?.(),
  toggleWingDoor: (id) => E.toggleWingDoor?.(id),
  toggleBreakerLight: () => E.toggleBreakerLight?.(),
  rattleDoor: (id) => E.rattleDoor?.(id),
  setFragmentCleared: (id) => E.setFragmentCleared?.(id),
  setFragmentGuidance: (nextId, pendingIds, clearedIds) => E.setFragmentGuidance?.(nextId, pendingIds, clearedIds),
  setQualityMode: (m) => E.setQualityMode?.(m),
  getQualityMode: () => E._qualityMode || 'high',
  get dev() { return E._dev || null; },
  dispose(){
    halt=true;
    E._disposed = true;
    cancelAnimationFrame(raf);
    scares?.dispose?.();
    controls.dispose();
    window.removeEventListener('resize',rs);
    E._torchUnbind?.();
    if (room.id === 'control') {
      disposeObjectResources(S);
      E._hlMatById = null;
      gltfLoader = null;
      fbxLoader = null;
      rigL.length = 0;
      rigG.length = 0;
      anims.length = 0;
      pick.length = 0;
      solids.length = 0;
      pmremRT?.dispose?.();
      pmremGen?.dispose?.();
    } else {
      S.traverse(o=>{
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach(disposeMaterial);
        else disposeMaterial(o.material);
      });
    }
    R.dispose();
    R.domElement.remove();
  }
 }
 if(debug)window.__ctc={api,E,THREE,controls}
 return api
}

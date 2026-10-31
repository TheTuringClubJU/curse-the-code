import * as THREE from 'three'
import * as X from './tex.js'
import {TX,bgeo,mat,wm} from './kit.js'
import {buildBedroom} from './scene.js'
import {createScares} from './scares.js'
export {posterCanvas} from './tex.js'
export function createEngine(el,room,h){
 const tb0=performance.now()
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,T=room.theme,[W,H,D]=room.size,debug=new URLSearchParams(location.search).has('debug')
 const R=new THREE.WebGLRenderer({antialias:true});R.setPixelRatio(Math.min(devicePixelRatio,1.0));R.powerPreference='high-performance';R.setSize(el.clientWidth,el.clientHeight);R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap
 R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.6;el.appendChild(R.domElement)
 const S=new THREE.Scene();S.background=new THREE.Color(T.bg);S.fog=new THREE.FogExp2(T.bg,.04)
 const cam=new THREE.PerspectiveCamera(72,el.clientWidth/el.clientHeight,.05,80);cam.rotation.order='YXZ';S.add(cam)
 const solids=[],pick=[],byId={},rigL=[],rigG=[],anims=[],sc={v:1},ref={}
 const rnd=(a,b)=>a+Math.random()*(b-a)
 const flick=(seed,amt=.3)=>t=>1-amt*Math.abs(Math.sin(t*(6.3+seed%5)+seed)*Math.sin(t*(2.9+seed%3)+seed*1.7))-.04*Math.abs(Math.sin(t*31+seed))
 let tl=performance.now();const E={lap:n=>{if(debug){const t=performance.now();console.info('[ctc] lap',n,Math.round(t-tl));tl=t}},S,cam,W,H,D,win:room.window,ref,sc,lampMats:[],lampGlow:null,flick,lightScale:()=>sc.v,audio:h.audio,
  anim:f=>anims.push(f),solid:(x0,x1,z0,z1)=>solids.push({x0,x1,z0,z1}),glow:(m,b,f)=>rigG.push({m,b,f:f||flick(Math.floor(Math.random()*90),.3)}),lightRig:(l,b,f)=>rigL.push({l,b,f}),
  interact(obj,id){obj.traverse(o=>{if(o.isMesh){o.userData.id=id;if(o.material){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone()}}})},
  add(obj,o={}){obj.traverse(m=>{if(!m.isMesh)return;if(!m.userData.ns&&!o.noShadow){m.castShadow=true}m.receiveShadow=true;if(!m.userData.np){pick.push(m);if(m.userData.id)(byId[m.userData.id]??=[]).push(m)}});S.add(obj);return obj}}
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
 const moonL=new THREE.DirectionalLight(T.moon,2.2);moonL.position.set(-9,5,win?win.z:0);moonL.target.position.set(2,0,win?win.z:0);S.add(moonL.target);moonL.castShadow=true;moonL.shadow.mapSize.set(1024,1024);moonL.shadow.bias=-.0004;moonL.shadow.normalBias=.03
 Object.assign(moonL.shadow.camera,{left:-8,right:8,top:8,bottom:-8,far:30});S.add(moonL)
 const lamp=new THREE.PointLight(T.lamp,room.lamp?9:0,10,2);if(room.lamp)lamp.position.set(...room.lamp.pos);lamp.castShadow=false;lamp.shadow.mapSize.set(256,256);lamp.shadow.bias=-.002;S.add(lamp);const LB=9
 if(room.haunted)buildBedroom(E);else{ // legacy simple box rooms (e.g. ?room=test)
  S.add(new THREE.PointLight(T.accent,3,10,2));(room.boxes||[]).forEach(b=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...b.s),new THREE.MeshStandardMaterial({color:b.c,roughness:.9}));o.position.set(...b.p);S.add(o);if(b.solid){const[x,y,z]=b.p,[w,hh,d]=b.s;solids.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2})}})}
 const scares=room.haunted?createScares(E,h):null
 if(debug)console.info('[ctc] scene built in',Math.round(performance.now()-tb0),'ms')
 // ---- player controls & input ----
 let px=room.spawn[0],pz=room.spawn[1],yaw=room.spawn[2],pitch=0,walk=0,lastStep=0,paused=false,target=null;
 const activeKeys = new Set();
 let flickUntil=0,nextFlick=performance.now()+4000,shakeT=0,shakeA=0;

 Object.assign(E,{px:()=>px,pz:()=>pz,yaw:()=>yaw,shake:(a,d)=>{shakeA=a;shakeT=d},get paused(){return paused}});
 const collide=(x,z)=>Math.abs(x)>W/2-.3||Math.abs(z)>D/2-.3||solids.some(s=>{const dx=Math.max(s.x0-x,0,x-s.x1),dz=Math.max(s.z0-z,0,z-s.z1);return dx*dx+dz*dz<.07});
 const ray=new THREE.Raycaster(),v0=new THREE.Vector2(),hl=(id,on)=>byId[id]?.forEach(m=>{(Array.isArray(m.material)?m.material:[m.material]).forEach(q=>q.emissive.setHex(on?0x4a3c9a:0))});

 const kd = e => {
   const isE = e.code === 'KeyE' || e.key === 'e' || e.key === 'E';
   if (isE && !e.repeat) {
     if (target) {
       console.info('[CTC INTERACT TRIGGERED]', target);
       e.preventDefault();
       h.onInteract(target);
       return;
     }
   }
   if (paused) return;
   activeKeys.add(e.code);
 };

 const ku = e => {
   activeKeys.delete(e.code);
 };

 window.addEventListener('blur', () => {
   activeKeys.clear();
 });

 // Mouse Look: Clean and responsive
  let isMouseDown = false;
 window.addEventListener('mousedown', () => { isMouseDown = true; });
 window.addEventListener('mouseup', () => { isMouseDown = false; });
  window.addEventListener('click', (e) => { if (target && isLocked()) { console.info('[CTC CLICK INTERACT TRIGGERED]', target); h.onInteract(target); } });

 const mm = e => {
   if (paused) return;
   // e.movementX and e.movementY give true mouse delta
   const mx = e.movementX ?? 0;
   const my = e.movementY ?? 0;
   
   if (mx !== 0 || my !== 0) {
     yaw -= mx * 0.0028;
     pitch = Math.max(-1.4, Math.min(1.4, pitch - my * 0.0028));
   }
 };
 const pl=()=>{ const locked = isLocked(); h.onLock?.(locked); activeKeys.clear(); },rs=()=>{R.setSize(el.clientWidth,el.clientHeight);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix()}
 addEventListener('keydown',kd);addEventListener('keyup',ku);addEventListener('mousemove',mm);addEventListener('resize',rs);document.addEventListener('pointerlockchange',pl)
 const fr=new THREE.Frustum(),pm=new THREE.Matrix4(),hp=new THREE.Vector3(),lp=new THREE.Vector3()
 let last=performance.now(),raf,halt=false,frameCount=0;const t0=last
 const FPS_LIMIT = 30;
 const FRAME_INTERVAL = 1000 / FPS_LIMIT; // ~33.33ms
 let lastRenderTime = performance.now();

 const loop = now => {
   if (!halt) raf = requestAnimationFrame(loop);
   const elapsed = now - lastRenderTime;
   if (elapsed < FRAME_INTERVAL) return; // Strict 30 FPS cap!

   lastRenderTime = now - (elapsed % FRAME_INTERVAL);
   const dt = Math.min(0.05, elapsed / 1000);
   frameCount++;
   const t = (now - t0) / 1000;
   let mv = 0;
  if(!paused){
    const moveF = (activeKeys.has('KeyW') || activeKeys.has('ArrowUp')) ? 1 : 0;
    const moveB = (activeKeys.has('KeyS') || activeKeys.has('ArrowDown')) ? 1 : 0;
    const moveR = (activeKeys.has('KeyD') || activeKeys.has('ArrowRight')) ? 1 : 0;
    const moveL = (activeKeys.has('KeyA') || activeKeys.has('ArrowLeft')) ? 1 : 0;

    const f = moveF - moveB;
    const s = moveR - moveL;

    if (f !== 0 || s !== 0) {
      const isShift = activeKeys.has('ShiftLeft') || activeKeys.has('ShiftRight');
      const speed = isShift ? 3.4 : 2.4;
      const l = Math.hypot(f, s);
      const sp = (speed * dt) / l;
    const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*sp,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*sp;if(!collide(px+dx,pz))px+=dx;if(!collide(px,pz+dz))pz+=dz;walk+=dt*8;mv=1;if(Math.floor(walk/Math.PI)!==lastStep){lastStep=Math.floor(walk/Math.PI);h.audio?.step?.((keys.ShiftLeft||keys.ShiftRight)?1:.7)}}
   if (frameCount % 3 === 0) {
     ray.setFromCamera(v0,cam);ray.far=3.8;const id=ray.intersectObjects(pick,false)[0]?.object.userData.id||null;
     if(id!==target){if(target)hl(target,0);if(id)hl(id,1);target=id;h.onTarget(id)}
   }
   scares?.tick(dt,t)}
  h.audio?.listen?.(px,pz,yaw)
  let sx=0,sy=0;if(shakeT>0&&!reduce){shakeT-=dt;const k=shakeA*Math.max(0,shakeT)*3;sx=(Math.random()-.5)*k*.05;sy=(Math.random()-.5)*k*.05}
  cam.position.set(px+sx,1.6+(mv&&!reduce?Math.sin(walk)*.022:0)+(paused?0:Math.sin(t*.9)*.004)+sy,pz);cam.rotation.set(pitch,yaw,0)
  // lamp flicker (dying lamp)
  if(!reduce){if(now>nextFlick){flickUntil=now+rnd(120,600);nextFlick=now+rnd(1800,6000)}}
  const lf=!reduce&&now<flickUntil?rnd(.05,.9):1,sv=sc.v
  lamp.intensity=LB*lf*sv;E.lampMats.forEach(m=>m.emissiveIntensity=.9*lf*sv);if(E.lampGlow)E.lampGlow.material.opacity=.55*lf*sv
  hemi.intensity=1.5*Math.max(sv,.05);moonL.intensity=2.2*Math.max(sv,.04)
  rigL.forEach(r=>r.l.intensity=r.b*r.f(t)*sv);rigG.forEach(r=>r.m.emissiveIntensity=r.b*r.f(t)*sv)
  anims.forEach(f=>f(t,dt))
  if(ref.doll){cam.updateMatrixWorld();pm.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);fr.setFromProjectionMatrix(pm);const hd=ref.doll.head;hd.getWorldPosition(hp)
   if(!fr.containsPoint(hp)&&!paused&&!ref.dollLock){lp.copy(cam.position);hd.parent.worldToLocal(lp);const tg=Math.max(-1.35,Math.min(1.35,Math.atan2(lp.x,lp.z)));hd.rotation.y+=(tg-hd.rotation.y)*Math.min(1,dt*1.6)}}
  ref.eyes?.forEach(e=>e.lookAt(cam.position))
  if(!api._skip)R.render(S,cam)}
 raf=requestAnimationFrame(loop)
 const api={setPaused(p){paused=p;activeKeys.clear();},
  lock(){paused=false;try{R.domElement.requestPointerLock?.();el.requestPointerLock?.();}catch(e){}},unlock(){document.exitPointerLock()},
  setView(x,z,y,p=0){px=x;pz=z;yaw=y;pitch=p},halt(){halt=true;cancelAnimationFrame(raf)},frame(){last=performance.now()-16;loop(performance.now())},step(n,ms=50){api._skip=true;for(let i=0;i<n;i++){last=performance.now()-ms;loop(performance.now())}api._skip=false;last=performance.now()-16;loop(performance.now())},triggerScare:n=>scares?.trigger(n),scares,
  dispose(){cancelAnimationFrame(raf);removeEventListener('keydown',kd);removeEventListener('keyup',ku);removeEventListener('mousemove',mm);removeEventListener('resize',rs);document.removeEventListener('pointerlockchange',pl)
   S.traverse(o=>{o.geometry?.dispose()});R.dispose();R.domElement.remove()}}
 if(debug)window.__ctc={api,E,THREE}
 return api}



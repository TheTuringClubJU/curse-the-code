import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as X from './tex.js';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {buildStudyDoors} from './studyDoors.js';
import {buildStudyExterior} from './studyExterior.js';
import {buildStudyActors} from './studyActors.js';
import {buildStudyAtmosphere,createStudyRainGlass} from './studyAtmosphere.js';
import {buildStudyQuietDetails} from './studyQuietDetails.js';
import {buildStudyProcessionActors} from './studyProcessionActors.js';
const BASE='/assets/models/study/';

export function buildStudy(E){
 const {W,H,D,S}=E,rng=X.rng(27),reduce=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let disposed=false;E.onDispose?.(()=>{disposed=true;});
 const props={},batches=new Map(),tasks=[],cache=new Map();
 const tex=(file,x=1,y=1)=>{const t=new THREE.TextureLoader().load(BASE+file,loaded=>loaded.userData.studyReady?.splice(0).forEach(fn=>fn()));t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(x,y);return t;};
 const wood=new THREE.MeshStandardMaterial({map:tex('dark_wooden_planks.webp',2,2),color:0x73604b,roughness:.95});
 const stone=new THREE.MeshStandardMaterial({map:tex('medieval_blocks_02.webp',3,2),color:0x9a9686,roughness:1});
 const brass=new THREE.MeshStandardMaterial({color:0x8b673b,metalness:.65,roughness:.68}),iron=new THREE.MeshStandardMaterial({color:0x242222,metalness:.3,roughness:.9});
 const velvet=new THREE.MeshStandardMaterial({color:0x441019,roughness:1}),paper=new THREE.MeshStandardMaterial({color:0xbbae8d,roughness:1});
 const mesh=(geo,mat,p=[0,0,0],parent)=>{const m=new THREE.Mesh(geo,mat);m.position.set(...p);m.receiveShadow=m.castShadow=true;parent?.add(m);return m;};
 const box=(p,s,m,parent)=>mesh(new THREE.BoxGeometry(...s),m,p,parent);
 const add=(g,id)=>{if(id)E.interact(g,id);else g.traverse(o=>{if(!o.userData.id)o.userData.np=1;});E.add(g);return g;};
 const batch=(p,s,m)=>{const g=new THREE.BoxGeometry(...s);g.translate(...p);if(!batches.has(m))batches.set(m,[]);batches.get(m).push(g);};
 const fallback=(id,p,s,mat=wood)=>{const g=new THREE.Group();g.position.set(...p);box([0,s[1]/2,0],s,mat,g);props[id]=g;add(g,id);return g;};
 // Matching sky/fog colours avoid a hard, flat horizon at the terrain's far edge.
 S.background=new THREE.Color('#19252b');S.fog=new THREE.FogExp2('#19252b',.012);if(E.renderer)E.renderer.toneMappingExposure=.85;
 const floor=mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshStandardMaterial({map:tex('dark_wooden_planks.webp',5,5),color:0x87745c,roughness:.94}));floor.rotation.x=-Math.PI/2;add(floor);
 const wallpaper=new THREE.MeshStandardMaterial({map:tex('regal_wallpaper.webp',5,2),color:0x651324,roughness:1});
 const wallMaterial=()=>{
  const material=wallpaper.clone(),map=wallpaper.map.clone();map.repeat.set(.55,.6);material.side=THREE.DoubleSide;material.map=null;
  const ready=()=>{if(disposed){map.dispose();return;}map.image=wallpaper.map.image;map.needsUpdate=true;material.map=map;material.needsUpdate=true;};
  if(wallpaper.map.image)ready();else (wallpaper.map.userData.studyReady??=[]).push(ready);
  return material;
 };
 batch([0,H+.1,0],[W,.2,D],wood);
 for(const side of [-1,1]){
  // Match the pointed leaf opening; the stone surround hides the cut edge.
  const shape=new THREE.Shape();shape.moveTo(-W/2,-.1);shape.lineTo(W/2,-.1);shape.lineTo(W/2,H);shape.lineTo(-W/2,H);shape.closePath();
  const opening=new THREE.Path();opening.moveTo(-.64,-.05);opening.lineTo(.64,-.05);opening.lineTo(.64,1.55);
  opening.quadraticCurveTo(.55,2.1,0,2.5);opening.quadraticCurveTo(-.55,2.1,-.64,1.55);opening.closePath();shape.holes.push(opening);
  const material=wallMaterial();
  const wall=mesh(new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false}),material,[0,0,side*D/2]);wall.rotation.y=side>0?Math.PI:0;add(wall);
  if(side===-1)batch([-W/2,2.3,0],[.16,H,D],wallpaper);

  batch([side*(W/2-.1),.46,0],[.18,.92,D],wood);for(const x of [-1,1])batch([x*(W+1.6)/4,.46,side*(D/2-.1)],[(W-1.6)/2,.92,.18],wood);
  for(const y of [.1,.94,H-.2]){for(const x of [-1,1])batch([x*(W+1.6)/4,y,side*(D/2-.18)],[(W-1.6)/2,.07,.12],brass);batch([side*(W/2-.18),y,0],[.12,.07,D],brass);}
  for(let z=-4;z<=4;z++)batch([side*(W/2-.2),.46,z],[.08,.7,.06],wood);
 }
 for(const z of [-3.7,-1.8,0,1.8,3.7])batch([0,H-.25,z],[W,.34,.25],wood);
 for(const z of [-4,-1.9,1.9,4])for(const side of [-1,1])batch([side*5.28,2.5,z],[.28,4.2,.32],stone);
 for(const [mat,list] of batches){add(new THREE.Mesh(mergeGeometries(list),mat));list.forEach(g=>g.dispose());}
 // A wall with pointed arch cutouts covers the blue gaps above/beside the imported frames.
 const eastShape=new THREE.Shape();eastShape.moveTo(-D/2,0);eastShape.lineTo(D/2,0);eastShape.lineTo(D/2,H);eastShape.lineTo(-D/2,H);eastShape.closePath();
 for(const center of [-1.05,1.05]){
  const hole=new THREE.Path();hole.moveTo(center-1.0,1.03);hole.lineTo(center+1.0,1.03);hole.lineTo(center+1.0,3.12);
  hole.quadraticCurveTo(center+.8,3.68,center,4.03);hole.quadraticCurveTo(center-.8,3.68,center-1.0,3.12);hole.closePath();eastShape.holes.push(hole);
 }
 const eastMaterial=wallMaterial();
 const eastWall=mesh(new THREE.ExtrudeGeometry(eastShape,{depth:.16,bevelEnabled:false}),eastMaterial,[W/2,0,0]);eastWall.rotation.y=-Math.PI/2;add(eastWall);
 const peel=tex('decrepit_wallpaper.webp');
 for(let i=0;i<10;i++){
  const shape=new THREE.Shape(),radius=.08+rng()*.18;
  for(let k=0;k<=12;k++){const a=k/12*Math.PI*2,r=radius*(.7+rng()*.3);k?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
  add(mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({map:peel,color:0x9a8e74,roughness:1,side:THREE.DoubleSide}),[-4.6+rng()*9.2,1.4+rng()*2.5,-D/2+.095]));
 }
 const ambient=new THREE.HemisphereLight(0x8c9eb9,0x302018,.28);S.add(ambient);
 const moon=new THREE.DirectionalLight(0x9aacc8,.6);moon.position.set(13,12,-4);moon.castShadow=!E.studyLowDetail;moon.shadow.mapSize.set(1024,1024);moon.shadow.autoUpdate=false;moon.shadow.bias=-.0003;
 Object.assign(moon.shadow.camera,{left:-8,right:8,top:7,bottom:-7,near:.5,far:45});S.add(moon);
 E.bakeShadows=()=>{if(E.studyLowDetail)return;moon.shadow.needsUpdate=true;if(E.renderer)E.renderer.shadowMap.needsUpdate=true;};
 const practicals=[];for(const p of [[-1.35,1.5,-1.5],[0,3.0,-1.8],[-4.85,1.45,2.8]]){const light=new THREE.PointLight(0xffb563,3.8,6,2);light.position.set(...p);S.add(light);practicals.push(light);}
 // Downloaded exterior architecture, beyond the room rather than a flat backdrop.
 const win=new THREE.Group();win.position.set(W/2-.15,0,0);
 for(const z of [-2,2])box([0,2.5,z],[.18,3.5,.18],wood,win);
 box([-.1,1.02,0],[.65,.15,4.35],stone,win);box([0,4.1,0],[.18,.16,4.2],wood,win);
 for(const z of [-1,0,1])box([0,2.65,z],[.065,2.9,.055],iron,win);
 for(const y of [1.8,2.7,3.6])box([0,y,0],[.065,.045,4.1],iron,win);
 for(const z of [-1.45,1.45]){
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,3.4,z-.55),new THREE.Vector3(0,4,z),new THREE.Vector3(0,3.4,z+.55)]);
  mesh(new THREE.TubeGeometry(curve,16,.065,6,false),wood,[0,0,0],win);
 }
 props.window=win;add(win,'window');
 const glass=createStudyRainGlass();glass.position.set(W/2-.13,2.55,0);glass.rotation.y=Math.PI/2;add(glass);
 const windowTarget=mesh(new THREE.PlaneGeometry(4,2.9),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),[5.2,2.55,0]);windowTarget.rotation.y=Math.PI/2;add(windowTarget,'window');
 fallback('desk',[0,0,-1.5],[3.4,.88,1.65]);E.solid(-1.8,1.8,-2.38,-.62);
 fallback('tablet_drawer',[-4.65,.7,2.7],[.06,.18,.45]);
 fallback('crt_monitor',[-.35,.91,-1.6],[.75,.65,.55],wood);fallback('terminal_pc',[-.35,.91,-1.65],[.65,.16,.55],wood);
 fallback('line_printer',[1.05,.915,-1.75],[.65,.2,.4],wood);
 fallback('bookshelf',[-5,0,-1.2],[.65,3.4,2],wood);E.solid(-5.45,-4.6,-3.37,.97);
 fallback('filing_cabinet',[-4.95,0,1.55],[.65,1.6,1.0],wood);E.solid(-5.35,-4.4,1.05,2.05);
 fallback('armchair',[-.25,0,-3.1],[1.1,1.2,1],velvet);E.solid(-.9,.4,-3.65,-2.6);
 fallback('reel_recorder',[4.2,.465,2.7],[.36,.5,.65],wood);fallback('radiator',[5.1,.02,0],[.2,.65,1.2],iron);
 fallback('floor_lamp',[-4.85,.91,2.8],[.35,.7,.35],brass);fallback('wastebin',[-1.25,0,-2.7],[.3,.4,.3],wood);
 fallback('cable_bundle',[1.7,.02,-2.3],[.7,.08,.6],iron);fallback('coat_stand',[-4.95,0,4.0],[.4,1.9,.4],wood);
 const board=fallback('corkboard',[5.32,1.6,3.2],[1.5,.9,.05]);board.rotation.y=-Math.PI/2;
 const sticky=new THREE.Group();
 for(const [i,y,z] of [[0,1.9,3.45],[1,1.65,3.8],[2,2.1,3.85]]){
  const cv=document.createElement('canvas');cv.width=256;cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle='#b5a172';ctx.fillRect(0,0,256,256);ctx.fillStyle='#30271c';ctx.font='22px Georgia';
  ['CHECK ARCHIVE','D. VANCE','LEAVE THE LAMP'][i].split(' ').forEach((line,k)=>ctx.fillText(line,20,65+k*40));
  const note=mesh(new THREE.PlaneGeometry(.18,.2),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(cv),side:THREE.DoubleSide,roughness:1}),[-5.3,y,z],sticky);note.rotation.y=Math.PI/2;
 }
 add(sticky,'sticky_wall');
 const pad=box([0,.907,-1.25],[1.8,.016,.75],velvet);props.desk_blotter=pad;add(pad,'desk_blotter');
 const rug=mesh(new THREE.PlaneGeometry(5.8,5),new THREE.MeshStandardMaterial({map:X.tex(X.rug()),color:0x9b3f35,roughness:1}),[0,.012,-.6]);rug.rotation.x=-Math.PI/2;add(rug,'rug');
 add(box([0,H-.26,0],[W,.3,.25],wood),'beams_webs');
 const nc=document.createElement('canvas');nc.width=nc.height=512;const n=nc.getContext('2d');n.fillStyle='#c3b491';n.fillRect(0,0,512,512);n.fillStyle='#332a22';n.font='italic 27px Georgia';n.fillText('Personal correspondence',38,65);n.font='21px Georgia';
 ['I have put the books back in order.','The room is quiet again, though','the candle burns as if a window','were open. I checked the latch.','','I will leave the lamp burning.'].forEach((line,i)=>n.fillText(line,38,125+i*37));
 const note=mesh(new THREE.PlaneGeometry(.48,.5),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(nc),roughness:1}),[-.6,.92,-.95]);note.rotation.x=-Math.PI/2;note.rotation.z=-.12;add(note);
 let drawer=props.tablet_drawer,drawerBase=drawer.position.clone(),drawerOffset=new THREE.Vector3(0,0,.2),drawerTarget=0;
 E.ref.onStudyInteract=event=>{if(event.type==='inspect'&&event.objectId==='tablet_drawer')drawerTarget=drawerTarget?0:1;};
 E.anim((_t,dt)=>{const target=drawerBase.clone().addScaledVector(drawerOffset,drawerTarget);drawer.position.lerp(target,Math.min(1,dt*6));});
 E.ref.studyHorror={screenMaterial:null,moon,ambient,practicals,flickerLights:[ambient,moon,...practicals],chair:null};
 buildStudyDoors(E,{model,add,wood,iron});
 buildStudyActors(E,{model});
 buildStudyAtmosphere(E,{add});
 buildStudyQuietDetails(E,{add});
 buildStudyProcessionActors(E,{model,add});
 // A short unlit passage is visible through the open Basement door.
 const passage=new THREE.Group();box([0,-.06,-5.8],[1.6,.12,2.8],stone,passage);
 for(const x of [-.85,.85])box([x,1.3,-5.8],[.15,2.6,2.8],stone,passage);
 box([0,2.65,-5.8],[1.8,.15,2.8],stone,passage);box([0,1.3,-7.2],[1.8,2.6,.1],new THREE.MeshBasicMaterial({color:0x030504}),passage);add(passage);
 // Clone cached downloads, then normalize in a wrapper. Source node transforms stay intact.
 function model(file,id,p,size,rot=0,old=null,after,options={}){tasks.push(async()=>{
  if(!cache.has(file))cache.set(file,E.loadGLB(BASE+file+'.glb'));const gltf=await cache.get(file);if(disposed)return;
  const object=options.rigged?cloneSkeleton(gltf.scene):gltf.scene.clone(true);
  let mixer;if(options.rigged&&gltf.animations?.length){mixer=new THREE.AnimationMixer(object);const clip=gltf.animations.find(a=>/walk/i.test(a.name))||gltf.animations[0];mixer.clipAction(clip).play();mixer.update(.001);}
  if(options.select){const remove=[];object.traverse(o=>{if(o.isMesh&&!options.select(o))remove.push(o);});remove.forEach(o=>o.removeFromParent());}
  if(options.preRotate){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...options.preRotate));object.quaternion.premultiply(q);}
  object.updateMatrixWorld(true);object.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
  const bounds=new THREE.Box3().setFromObject(object),d=bounds.getSize(new THREE.Vector3()),ctr=bounds.getCenter(new THREE.Vector3());if(!d.x||!d.y||!d.z)throw new Error('Empty GLB: '+file);
  const normal=new THREE.Group();normal.position.set(-ctr.x,-bounds.min.y,-ctr.z);normal.add(object);
  const g=new THREE.Group();g.name='study-model-'+(id||file);g.add(normal);
  // Only the desk/terrain use explicit axis scaling; other scans retain their proportions.
  if(options.heightOnly)g.scale.setScalar(size[1]/d.y);
  else if(options.stretch)g.scale.set(size[0]/d.x,size[1]/d.y,size[2]/d.z);
  else g.scale.setScalar(Math.min(size[0]/d.x,size[1]/d.y,size[2]/d.z));
  g.position.set(...p);g.rotation.y=rot;g.userData.studyAsset=file;
  // Keep live mixer references out of serializable Object3D.userData.
  g._studyMixer=mixer;g._studyAnimationClips=gltf.animations;
  object.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;
   const grade=m=>options.preserveMaterial?m:m.isMeshBasicMaterial?new THREE.MeshStandardMaterial({map:m.map,color:m.color,roughness:.9}):m;
   o.material=Array.isArray(o.material)?o.material.map(grade):grade(o.material);
   if(file==='candles'&&o.name.includes('Flame')){o.material=o.material.clone();o.material.emissive=new THREE.Color(0xffa34b);o.material.emissiveIntensity=1.6;o.material.toneMapped=false;}
  }});
  options.prepare?.(g);
  if(mixer){if(!options.manualAnimation)E.anim((_t,dt)=>{if(g.visible&&!E._studyState?.paused)mixer.update(dt*2.3);});E.onDispose?.(()=>{mixer.stopAllAction();mixer.uncacheRoot(object);});}
  add(g,id);if(old)E.retire?.(old);after?.(g);E.bakeShadows?.();
 });}
 buildStudyExterior(E,{model,tex,add});
 for(const z of [-1.05,1.05])model('big_gothic_window','window',[5.35,1,z],[2.1,3.1,.3],-Math.PI/2,z<0?props.window:null,null,{preserveMaterial:true});
 model('library_desk','desk',[0,0,-1.5],[1.7,.92,3.5],-Math.PI/2,props.desk,null,{stretch:true});
 const displays=[];
 function paintDisplay(display,progress={}){
  const {ctx,texture,title}=display;
  const locked=progress.clues?.find(c=>title.includes(c.id))?.is_locked??true;
  const status=progress.completed?'BASEMENT ACCESS GRANTED':!progress.basketUnlocked?'RECOVER ALL 16 FRAGMENTS':locked?'FOLLOW THE CASE FILE SEQUENCE':'PRESS E TO OPEN THIS CASE FILE';
  ctx.fillStyle='#06140e';ctx.fillRect(0,0,768,512);ctx.fillStyle='#8cba91';ctx.font='26px monospace';
  [title,'DANIEL / PRIVATE ARCHIVE','--------------------------------','',status,'','[E] EXAMINE TERMINAL'].forEach((line,i)=>ctx.fillText(line,100,65+i*50));
  ctx.fillStyle='#0003';for(let y=0;y<512;y+=4)ctx.fillRect(0,y,768,1);texture.needsUpdate=true;
 }
 E.ref.updateStudyDisplays=progress=>displays.forEach(d=>paintDisplay(d,progress));
 function mountDisplay(g,title){
  const face=g.getObjectByName('Cube001__0');if(!face?.isMesh)return;
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const display={ctx,texture,title};displays.push(display);paintDisplay(display,E._studyProgress);
  face.geometry=face.geometry.clone();g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(face),d=b.getSize(new THREE.Vector3()),positions=face.geometry.attributes.position,uv=[];
  for(let i=0;i<positions.count;i++){const v=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(face.matrixWorld);uv.push((b.max.x-v.x)/d.x,(v.y-b.min.y)/d.y);}
  face.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  face.material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
  E.ref.studyHorror.screenMaterial=face.material;
 }
 // One computer, two original backend entry points: curved display and base/keyboard.
 model('retro_ibm_pc',null,[-.35,.91,-1.65],[1.35,.75,1.3],Math.PI/2,props.crt_monitor,g=>{
  g.name='study-model-computer';mountDisplay(g,'MAIL / R1-06 - LOG / R1-07');E.retire?.(props.terminal_pc);
 },{prepare:g=>g.traverse(o=>{if(o.isMesh)E.interact(o,o.name==='Cube001__0'?'crt_monitor':'terminal_pc');})});
 model('retro_matrix_printer','line_printer',[1.05,.915,-1.75],[.66,.3,.5],Math.PI,props.line_printer);
 model('GothicCabinet_01','filing_cabinet',[-4.95,0,1.55],[1.0,1.65,.65],Math.PI/2,props.filing_cabinet);
 model('gothic_chair','armchair',[-.25,0,-3.1],[1.3,1.7,1.2],0,props.armchair,g=>g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.metalnessMap=null;o.material.roughnessMap=null;o.material.metalness=.02;o.material.roughness=.94;if(o.name.includes('cushion')||o.name==='chair_chair_0')o.material.color.setHex(0x741d2d);}}));
 model('gothic_coffee_table',null,[4.2,0,2.7],[1.2,.8,1.2]);
 model('vintage_tape_recorder','reel_recorder',[4.2,.465,2.7],[.36,.55,.7],Math.PI,props.reel_recorder);
 model('metal_trash_can','wastebin',[-1.25,0,-2.7],[.4,.55,.4],0,props.wastebin,null,{select:o=>o.name.startsWith('metal_trash_can_rust')&&!o.name.includes('lid')});
 model('modular_electric_cables','cable_bundle',[1.7,.01,-2.3],[.7,.15,.6],0,props.cable_bundle,g=>{g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.setHex(0x181715);o.material.roughness=1;}});const target=box([1.7,.065,-2.3],[.48,.11,.58],new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));add(target,'cable_bundle');},{preRotate:[Math.PI/2,0,0],select:o=>o.name==='cable_double_uturn'});
 model('cc0_-_coat_hanger','coat_stand',[-4.95,0,4.0],[.72,1.95,.72],0,props.coat_stand);
 model('iron_radiator','radiator',[5.1,.02,0],[1.25,.7,.2],-Math.PI/2,props.radiator,g=>g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.setHex(0x37302a);o.material.metalness=.35;o.material.roughness=.85;} }),{preRotate:[0,Math.PI/2,0],stretch:true});
 // The two small source meshes are real drawer fronts on the supplied Victorian console.
 model('victorian_antique_wooden_table__game_ready',null,[-4.95,0,2.8],[1.45,1.1,.6],Math.PI/2,null,g=>{
  E.retire?.(props.tablet_drawer);drawer=g.userData.tabletDrawer;drawerBase=drawer.position.clone();g.updateMatrixWorld(true);
  const start=drawer.getWorldPosition(new THREE.Vector3()),end=start.clone().add(new THREE.Vector3(.2,0,0));drawerOffset=drawer.parent.worldToLocal(end).sub(drawer.parent.worldToLocal(start));
 },{prepare:g=>{
  g.updateMatrixWorld(true);const candidates=[];g.traverse(o=>{if(o.isMesh){const b=new THREE.Box3().setFromObject(o);if(b.getSize(new THREE.Vector3()).y<.2)candidates.push(o);E.interact(o,'desk');}});
  if(!candidates.length)throw new Error('Victorian drawer mesh unavailable');g.userData.tabletDrawer=candidates[0];E.interact(candidates[0],'tablet_drawer');
 }});
 model('vintage_oil_lamp','floor_lamp',[-4.85,.91,2.8],[.36,.65,.36],0,props.floor_lamp);
 model('world_map_color_3d_scan',null,[-5.32,2.35,2.55],[1.6,1.1,.08],Math.PI/2);
 model('corkboard','corkboard',[5.32,1.6,3.2],[1.6,1.05,.1],-Math.PI/2,props.corkboard);
 model('library_bookcase','bookshelf',[-4.85,0,-1.2],[1.1,3.3,4.4],0,props.bookshelf);
 for(const x of [-3.4,3.4]){model('library_bookcase','bookshelf',[x,0,-3.95],[1.1,3.2,4.2],-Math.PI/2);E.solid(x-2.1,x+2.1,-4.45,-3.43);}
 model('Rockingchair_01',null,[-3.4,0,2.5],[1.1,1.3,1.2],.35,null,g=>{E.ref.studyHorror.chair=g;E.anim(t=>{if(!reduce&&!E._studyState?.paused)g.rotation.x=Math.sin(t*.85)*.035;});});
 model('library_table',null,[3.45,0,-2.2],[1.3,1.7,1.5],Math.PI/2);
 model('museum_side_chair',null,[3.8,0,-2.85],[.75,1.4,.8],0);
 // Keep the recessed painted surface entirely in front of the wall, not buried in it.
 for(const [number,pos,size] of [[5,[-3.2,2.35,4.16],[.8,1.0,.15]],[7,[-2.25,2.25,4.16],[.55,.75,.12]],[14,[-3.05,1.15,4.16],[.6,.72,.12]],[18,[-2.15,1.3,4.16],[.62,.9,.12]],[12,[2.8,1.9,4.16],[1.1,1.35,.15]]])model('paintings',null,pos,size,Math.PI,null,g=>{g.name='study-painting-'+number;},{select:o=>o.name==='cuadro_'+number+'_Cuadros_0'});

 for(const [n,p,r] of [[3,[.75,.917,-1.0],.1],[7,[.78,.99,-1.0],-.12],[12,[1.15,.917,-.97],.2]])model('12_old_books',null,p,[.35,.07,.4],r,null,null,{select:o=>o.name==='Book'+n+'_Book'+n+'_0'});
 model('binder_notebook',null,[-.85,.918,-1.7],[.32,.06,.4]);model('skull',null,[-.63,.93,-.93],[.16,.18,.2],-.2);
 for(const p of [[-1.35,.915,-1.5],[1.45,.915,-.95],[5.2,1.1,-1.6],[5.2,1.1,1.6]])model('candles',null,p,[.26,.45,.2]);
 for(const z of [-1.8,1.8])model('Chandelier_03',null,[0,3.08,z],[1.1,1.1,1.1]);
 for(const [x,z,rotation] of [[-4.95,-3.9,0],[4.95,-3.9,1.5],[-4.95,3.9,3],[4.95,3.9,4.5]])model('cobwebs',null,[x,3.9,z],[1.0,.3,1.0],rotation,null,null,{select:o=>o.name.startsWith('cobweb001_')});
 // Reuse the supplied meshes in quiet corners; leave sightlines and all clue targets clear.
 for(const [p,size,rot]of [[[-4.24,3.1,-2.7],[.9,.6,.12],Math.PI/2],[[-4.24,2.6,.9],[.7,.5,.12],Math.PI/2],[[2.2,3.6,4.16],[1,.65,.12],Math.PI],[[4.8,3.65,-4.16],[.8,.55,.12],0],[[1.1,2.8,-4.16],[.6,.5,.12],0]]){
  model('cobwebs',null,p,size,rot,null,g=>{g.name='study-wall-web';g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.side=THREE.DoubleSide;}});},{preRotate:[Math.PI/2,0,0],select:o=>o.name.startsWith('cobweb004_')});
 }
 for(const [x,z]of [[-2.7,-1.8],[2.9,1.8],[3.6,-1.8]])model('cobwebs',null,[x,4.0,z],[1.15,.25,.85],x,null,g=>{g.name='study-beam-web';},{select:o=>o.name.startsWith('cobweb001_')});
 for(const [i,p]of [[0,[-4.22,3.12,-2.6]],[1,[4.7,3.73,-4.13]],[2,[-4.22,2.68,.9]],[3,[2.22,3.67,4.13]],[4,[1.1,2.93,-4.13]],[5,[-2.7,4.05,-1.8]]]){
  const wall=i!==5;
  model('spider_-_resident_evil_4',null,p,[.16,.16,.12],i===0||i===2?Math.PI/2:i===3?Math.PI:0,null,g=>{
   g.name='study-spider-'+i;g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.material=o.material.clone();o.material.color.multiplyScalar(.35);o.material.roughness=1;}});
   const initial=g.position.clone();E.anim((t)=>{if(!reduce&&!E._studyState?.paused){g.position.y=initial.y+Math.sin(t*.6+i)*.025;}});
  },{preRotate:wall?[Math.PI/2,0,0]:[Math.PI,0,0]});
 }
 model('body_under_cloth',null,[3.8,.015,3.85],[2.1,.3,.9],.08,null,g=>{E.ref.studyQuiet.body=g;g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.multiplyScalar(.5);o.material.roughness=1;}});});
 // Supplied gothic reliefs and sword, with reused downloaded skulls. All are cosmetic.
 for(const [node,p,size,rot]of [['Object_2',[-1.2,3.35,4.18],[.75,.75,.2],Math.PI],['Object_7',[1.25,3.25,-4.16],[.7,.8,.2],0]])model('roman-catholic_cathedral_gothic_decorations',null,p,size,rot,null,g=>{g.name='study-gothic-relief';g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.multiplyScalar(.45);}});},{select:o=>o.name===node});
 model('arming_sword_gothic_fanart',null,[1.15,.35,4.15],[.32,1.15,.15],Math.PI,null,g=>{g.name='study-abandoned-sword';g.rotation.z=.15;});
 for(const p of [[-4.3,2.12,-2.3],[3.8,.08,3.4]])model('skull',null,p,[.15,.17,.18],-.4,null,g=>{g.name='study-corner-skull';});
 const points=[];for(let i=0;i<130;i++)points.push((rng()-.5)*9,rng()*4,(rng()-.5)*7);
 const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xb2a69a,size:.012,transparent:true,opacity:.3,depthWrite:false}));S.add(dust);E.anim(t=>{if(!reduce)dust.rotation.y=Math.sin(t*.04)*.05;});
 let loaded=0,failed=0;const report=()=>{E._studyAssetProgress={loaded,total:tasks.length,failed};E.reportStudyAsset?.(E._studyAssetProgress);};report();
 if(typeof E.loadGLB==='function')for(const task of tasks)task().then(()=>{if(!disposed){loaded++;report();}}).catch(()=>{if(!disposed){failed++;report();}});
 E.bakeShadows?.();
}

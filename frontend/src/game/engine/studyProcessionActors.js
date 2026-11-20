import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';

const vector=()=>new THREE.Vector3();
function aimBone(bone,child,target){
 if(!bone||!child)return;
 const origin=bone.getWorldPosition(vector()),from=child.getWorldPosition(vector()).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
 const world=bone.getWorldQuaternion(new THREE.Quaternion()),parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
 bone.quaternion.copy(parent.multiply(new THREE.Quaternion().setFromUnitVectors(from,to).multiply(world)));bone.updateWorldMatrix(false,true);
}
function reach(upper,forearm,hand,target){
 if(!upper||!forearm||!hand)return;
 const shoulder=upper.getWorldPosition(vector()),elbow=forearm.getWorldPosition(vector()),wrist=hand.getWorldPosition(vector());
 const a=shoulder.distanceTo(elbow),b=elbow.distanceTo(wrist),direction=target.clone().sub(shoulder),distance=Math.max(.001,Math.min(direction.length(),(a+b)*.98));direction.normalize();
 const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
 const bend=new THREE.Vector3(0,-1,0).addScaledVector(direction,direction.y).normalize();
 aimBone(upper,forearm,shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,height));aimBone(forearm,hand,target);
}

// Isolate the actual downloaded character's hand, baking its current skinned pose.
// This derives geometry from the supplied GLB; it does not introduce a generated prop GLB.
export function sourceHand(character){
 let result=null;character.updateMatrixWorld(true);
 character.traverse(mesh=>{
  if(result||!mesh.isSkinnedMesh)return;
  const joints=mesh.skeleton.bones.map((bone,i)=>/LeftHand/i.test(bone.name)?i:-1).filter(i=>i>=0);if(!joints.length)return;
  mesh.skeleton.update();const g=mesh.geometry,indices=g.index?.array||Array.from({length:g.attributes.position.count},(_,i)=>i),skin=g.attributes.skinIndex,weights=g.attributes.skinWeight;if(!skin||!weights)return;
  const belongs=i=>[0,1,2,3].some(c=>joints.includes(skin.getComponent(i,c))&&weights.getComponent(i,c)>.25),picked=[];
  for(let i=0;i<indices.length;i+=3)if([indices[i],indices[i+1],indices[i+2]].filter(belongs).length>=2)picked.push(indices[i],indices[i+1],indices[i+2]);
  if(!picked.length)return;
  const position=[],uv=[],order=[],remap=new Map();
  for(const index of picked){if(!remap.has(index)){remap.set(index,remap.size);position.push(...mesh.getVertexPosition(index,vector()).applyMatrix4(mesh.matrixWorld).toArray());uv.push(g.attributes.uv?.getX(index)||0,g.attributes.uv?.getY(index)||0);}order.push(remap.get(index));}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(order);geometry.computeVertexNormals();geometry.computeBoundingBox();
  const center=geometry.boundingBox.getCenter(vector()),size=geometry.boundingBox.getSize(vector());geometry.translate(-center.x,-geometry.boundingBox.min.y,-center.z);geometry.scale(.24/Math.max(size.x,size.y,size.z),.24/Math.max(size.x,size.y,size.z),.24/Math.max(size.x,size.y,size.z));
  const original=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;result=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({map:original.map,color:0x62524b}));
 });return result;
}

export function buildStudyProcessionActors(E,{model,add}){
 const refs=E.ref.studyProcession={};
 const blackMaterial=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0,depthTest:false,depthWrite:false});
 const blackout=new THREE.Mesh(new THREE.PlaneGeometry(2,2),blackMaterial);blackout.frustumCulled=false;
 refs.blinkScene=new THREE.Scene();refs.blinkScene.add(blackout);refs.blinkCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);refs.blackMaterial=blackMaterial;
 E.onDispose?.(()=>{blackout.geometry.dispose();blackMaterial.dispose();});
 model('terrifying_hooded_horror_woman',null,[0,0,5.8],[1.1,1.85,1.1],0,null,g=>{
  g.name='study-hooded-woman';g.visible=false;refs.woman=g;
  g.traverse(o=>{o.userData.np=o.userData.ns=1;if(o.isMesh){o.castShadow=o.receiveShadow=false;const grade=m=>{const n=m.clone();n.color.multiplyScalar(.16);n.roughness=1;n.metalness=0;n.emissive?.setHex(0);return n;};o.material=Array.isArray(o.material)?o.material.map(grade):grade(o.material);}});
  E.onDispose?.(()=>g.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();}));
  const mixer=g._studyMixer,clip=g._studyAnimationClips?.[0];
  if(mixer&&clip){mixer.stopAllAction();const walk=new THREE.AnimationClip('procession-lower-body',clip.duration,clip.tracks.filter(t=>/Hips|UpLeg|Leg_|Foot|Toe/i.test(t.name)));mixer.clipAction(walk).play();}
  const bones={};g.traverse(o=>{if(o.isBone)bones[o.name]=o;});
  const hip=bones.Hips_23,hipOrigin=hip?.position.clone(),head=bones.Head_18,headRest=head?.quaternion.clone();
  refs.animate=(dt,lookAt,forward)=>{
   if(mixer)mixer.update(dt*.42);if(hip&&hipOrigin){hip.position.x=hipOrigin.x;hip.position.z=hipOrigin.z;}
   if(head&&headRest){head.quaternion.copy(headRest);if(lookAt){
    g.updateMatrixWorld(true);const eye=head.getWorldPosition(vector()),delta=lookAt.clone().sub(eye),angle=THREE.MathUtils.euclideanModulo(Math.atan2(delta.x,delta.z)-forward+Math.PI,Math.PI*2)-Math.PI;
    const parent=head.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),axis=new THREE.Vector3(0,1,0).applyQuaternion(parent);head.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,THREE.MathUtils.clamp(angle,-1.15,1.15)));
   }}
   if(refs.gurney){g.updateMatrixWorld(true);refs.gurney.updateMatrixWorld(true);for(const side of ['Left','Right']){
    const offset=new THREE.Vector3(side==='Left'?.23:-.23,.86,-.67).applyAxisAngle(new THREE.Vector3(0,1,0),forward).add(refs.gurney.position);
    reach(bones[side+'Arm_'+(side==='Left'?10:14)],bones[side+'ForeArm_'+(side==='Left'?9:13)],bones[side+'Hand_'+(side==='Left'?8:12)],offset);
   }}
  };
  const hand=sourceHand(g);if(hand){hand.name='study-revealed-hand';hand.visible=false;hand.userData.np=hand.userData.ns=1;hand.position.set(3.02,.025,3.5);hand.rotation.y=-.5;add(hand);refs.hand=hand;}
  const face=cloneSkeleton(g);face.name='study-hooded-closeup';face.visible=true;face.position.set(0,0,0);face.rotation.set(0,0,0);face.updateMatrixWorld(true);
  const faceHead=face.getObjectByName('Head_18');const headPoint=faceHead?faceHead.getWorldPosition(vector()):new THREE.Box3().setFromObject(face).getCenter(vector());
  face.position.sub(headPoint);face.position.z-=.42;
  face.traverse(o=>{if(o.isMesh){const grade=m=>new THREE.MeshBasicMaterial({map:m.map,color:0x6b605b,side:m.side,transparent:true,depthWrite:true});o.material=Array.isArray(o.material)?o.material.map(grade):grade(o.material);}});
  const overlay=new THREE.Group();overlay.visible=false;overlay.add(face);refs.face=face;refs.closeup=overlay;
  refs.overlayScene=new THREE.Scene();refs.overlayScene.background=new THREE.Color(0x000000);refs.overlayScene.add(overlay);refs.overlayCamera=new THREE.PerspectiveCamera(E.cam?.fov||72,E.cam?.aspect||1,.05,10);
  refs.faceMaterials=[];face.traverse(o=>{if(o.isMesh)refs.faceMaterials.push(...(Array.isArray(o.material)?o.material:[o.material]));});
  E.onDispose?.(()=>{refs.faceMaterials.forEach(m=>m.dispose());face.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});refs.overlayScene.clear();});
  if(E.renderer?.compileAsync){overlay.visible=true;E.renderer.compileAsync(refs.overlayScene,refs.overlayCamera).catch(()=>{});overlay.visible=false;}
 },{rigged:true,manualAnimation:true,heightOnly:true});
 model('ps1_horror_hospital_gurney',null,[0,0,5.2],[.68,.93,1.6],0,null,g=>{
  g.name='study-procession-gurney';g.visible=false;refs.gurney=g;refs.wheels=[];
  g.traverse(o=>{o.userData.np=o.userData.ns=1;if(o.isMesh){o.castShadow=false;o.material=o.material.clone();o.material.color.multiplyScalar(.38);o.material.roughness=1;}if(/Wheel_Rubber.*_Gurney_0/.test(o.name))refs.wheels.push(o);});
 });
}

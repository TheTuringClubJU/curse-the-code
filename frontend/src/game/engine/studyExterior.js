import * as THREE from 'three';
import {createStudyMist} from './studyAtmosphere.js';

export function buildStudyExterior(E, {model, tex, add}) {
  const exterior=new THREE.Group();exterior.name='study-exterior';add(exterior);
  const farMaterials=new WeakMap(),farBatches=new Map();
  const attach=g=>{
    g.updateMatrixWorld(true);
    if(g.userData.studyAsset==='tree_small_02_far'){
      // Eight distant trees share a small set of instanced draws and diffuse-only materials.
      g.traverse(o=>{if(o.isMesh){
        const source=o.material;if(!farMaterials.has(source)){const m=new THREE.MeshLambertMaterial({map:source.map,color:source.color,transparent:source.transparent,opacity:source.opacity,side:source.side,alphaTest:source.alphaTest,depthWrite:source.depthWrite});m.forceSinglePass=true;farMaterials.set(source,m);}
        const key=o.geometry.uuid+source.uuid;let batch=farBatches.get(key);
        if(!batch){batch=new THREE.InstancedMesh(o.geometry,farMaterials.get(source),8);batch.count=0;batch.name='study-distant-tree-batch';batch.userData.np=batch.userData.ns=1;batch.castShadow=false;batch.receiveShadow=false;batch.renderOrder=2;farBatches.set(key,batch);exterior.add(batch);}
        batch.setMatrixAt(batch.count++,o.matrixWorld);batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();
      }});g.removeFromParent();return;
    }
    exterior.attach(g);g.traverse(o=>{if(o.isMesh){o.renderOrder=2;if(g.userData.studyAsset?.startsWith('tree_'))for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.transparent&&m.side===THREE.DoubleSide)m.forceSinglePass=true;}});
  };
  const height = (x,z) => -5 + 2.2*Math.sin(x*.025)*Math.cos(z*.018) + 1.2*Math.sin(x*.06+z*.027);
  const ground = new THREE.PlaneGeometry(300, 320, 64, 64);
  ground.rotateX(-Math.PI/2); ground.translate(154,0,0);
  const p = ground.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,height(p.getX(i),p.getZ(i)));
  ground.computeVertexNormals();
  const terrainMaterial=new THREE.MeshLambertMaterial({map:tex('forest_floor.webp',14,16),color:0x666d50});
  const time={value:0},haze={value:new THREE.Color('#34424a')};
  terrainMaterial.onBeforeCompile=shader=>{
    shader.uniforms.studyTime=time;shader.uniforms.studyHaze=haze;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 studyGroundXZ; varying float studyGroundDistance;').replace('#include <project_vertex>','#include <project_vertex>\nvec4 studyGroundWorld=modelMatrix*vec4(transformed,1.0); studyGroundXZ=studyGroundWorld.xz; studyGroundDistance=length(cameraPosition.xz-studyGroundXZ);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float studyTime; uniform vec3 studyHaze; varying vec2 studyGroundXZ; varying float studyGroundDistance;').replace('#include <tonemapping_fragment>',`
      float studyPatch=sin(studyGroundXZ.x*0.17+sin(studyGroundXZ.y*0.11))*sin(studyGroundXZ.y*0.23);
      gl_FragColor.rgb*=0.8+studyPatch*0.2;
      float studyVeil=clamp((studyGroundDistance-14.0)*0.008,0.0,0.66);
      float studyDrift=sin(studyGroundXZ.x*0.065+studyTime*0.025)*sin(studyGroundXZ.y*0.08-studyTime*0.018)*0.12;
      gl_FragColor.rgb=mix(gl_FragColor.rgb,studyHaze,clamp(studyVeil+studyDrift,0.0,0.75));
      #include <tonemapping_fragment>
    `);
  };
  terrainMaterial.customProgramCacheKey=()=> 'study-ground-haze-v2';
  const terrain = new THREE.Mesh(ground,terrainMaterial);terrain.userData.ns=1;
  terrain.name='study-exterior-ground';add(terrain);attach(terrain);
  model('distant_castle',null,[90,height(90,-8)-.6,-8],[50,30,50],-Math.PI/2,null,g=>{g.name='study-exterior-castle';attach(g);});
  // Full leafy trees close to the glass; a separate foliage-preserving LOD fills the valley.
  for(const [x,z,h] of [[10,-3,10],[12,3.6,12],[16,-.5,13]]) {
    model('tree_small_02',null,[x,height(x,z),z],[h*.8,h,h*.8],z*.7,null,attach);
  }
  for(const [x,z,h] of [[24,-10,15],[27,9,16],[35,-2,19],[42,15,18],[45,-16,20],[56,5,23],[63,-18,22],[70,19,23]]) {
    model('tree_small_02_far',null,[x,height(x,z),z],[h*.8,h,h*.8],x*.31,null,attach);
  }
  // Low mode retains the nearest, middle and far bank. These overlap over the ground,
  // rather than replacing the whole landscape with a single flat-colour plane.
  const fog=createStudyMist(E,[[11,height(11,0)+2,0,24,8],[35,height(35,-3)+2,-3,42,9],[78,height(78,0)+3,0,55,12],[22,height(22,8)+1.5,8,32,7],[55,height(55,-9)+2,-9,45,10]],{name:'study-valley-mist',opacity:.65,color:0x8a9ca4,wispy:true});
  add(fog);attach(fog);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  const halo=ctx.createRadialGradient(128,128,50,128,128,126);halo.addColorStop(0,'rgba(142,35,21,.35)');halo.addColorStop(1,'rgba(90,12,10,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,256,256);
  const face=ctx.createRadialGradient(106,100,4,128,128,74);face.addColorStop(0,'#d28a61');face.addColorStop(.7,'#ad4c36');face.addColorStop(1,'#612220');ctx.fillStyle=face;ctx.beginPath();ctx.arc(128,128,73,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(128,128,72,0,Math.PI*2);ctx.clip();for(let i=0;i<28;i++){const x=128+Math.sin(i*9.4)*64,y=128+Math.cos(i*3.7)*64;ctx.fillStyle=i%2?'#582c2740':'#e4b18525';ctx.beginPath();ctx.ellipse(x,y,5+i%10,3+i%7,i,0,Math.PI*2);ctx.fill();}ctx.restore();
  const moonMap=new THREE.CanvasTexture(canvas);moonMap.colorSpace=THREE.SRGBColorSpace;
  const bloodMoon=new THREE.Sprite(new THREE.SpriteMaterial({map:moonMap,transparent:true,depthWrite:false,fog:false,toneMapped:false}));bloodMoon.name='study-blood-moon';bloodMoon.position.set(105,47,-25);bloodMoon.scale.set(24,24,1);add(bloodMoon);attach(bloodMoon);
  const frustum=new THREE.Frustum(),projection=new THREE.Matrix4();
  const windowBounds=new THREE.Box3(new THREE.Vector3(E.W/2-.3,1,-2.15),new THREE.Vector3(E.W/2+.3,4.2,2.15));
  E.anim(()=>{if(!E.cam)return;E.cam.updateMatrixWorld();projection.multiplyMatrices(E.cam.projectionMatrix,E.cam.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);exterior.visible=Boolean(E.renderer?.shadowMap?.enabled&&E.renderer?.shadowMap?.needsUpdate)||frustum.intersectsBox(windowBounds);});
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  E.anim(t=>{if(!reduced&&!E._studyState?.paused){fog.position.z=Math.sin(t*.018)*2;time.value=t;}});
}

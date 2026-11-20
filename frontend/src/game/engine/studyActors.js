import * as THREE from 'three';
import {createStudyWindowGhost} from './studyWindowGhost.js';

function darken(root, amount) {
  root.traverse(o=>{
    o.userData.np=1;
    if(o.isMesh){
      o.castShadow=false;o.receiveShadow=false;
      const grade=m=>{const n=m.clone();n.color?.multiplyScalar(amount);n.metalness=0;n.roughness=.95;return n;};
      o.material=Array.isArray(o.material)?o.material.map(grade):grade(o.material);
    }
  });
}

export function buildStudyActors(E,{model}) {
  const refs=E.ref.studyHorror;
  model('white_ghost-like_figure_with_bloodstain',null,[6.4,.38,.6],[1.05,2.1,1.05],-Math.PI/2,null,g=>{
    g.name='study-window-watcher';
    // Diffuse-only skin cannot turn glossy white when the torch hits the glass.
    g.traverse(o=>{o.userData.np=1;if(o.isMesh){
      o.renderOrder=3;o.castShadow=o.receiveShadow=false;
      const grade=m=>new THREE.MeshLambertMaterial({map:m.map,alphaMap:m.alphaMap,color:m.color.clone().multiplyScalar(.018),side:m.side,transparent:true,opacity:.9,depthWrite:true});
      o.material=Array.isArray(o.material)?o.material.map(grade):grade(o.material);
    }});
    refs.windowGhost=g;
    const sighting=createStudyWindowGhost(E,g,{reduced:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches});
    E.anim((_t,dt)=>sighting.tick(dt));
  });
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');
  const gradient=c.createRadialGradient?.(32,32,3,32,32,32);
  if(gradient){gradient.addColorStop(0,'rgba(0,0,0,.65)');gradient.addColorStop(1,'rgba(0,0,0,0)');}
  c.fillStyle=gradient||'#000';c.fillRect(0,0,64,64);
  const smokeMaterial=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),color:0x070608,transparent:true,opacity:.25,depthWrite:false});
  model('lying_figure_-_silent_hill',null,[0,0,0],[1.2,1.85,1.2],0,null,g=>{
    g.name='study-running-figure';darken(g,.16);g.visible=false;
    const aura=new THREE.Group();aura.name='study-runner-aura';
    for(let i=0;i<7;i++){
      const sprite=new THREE.Sprite(smokeMaterial);sprite.position.set(Math.sin(i*2.2)*.22,.35+i*.2,Math.cos(i*2.2)*.2);sprite.scale.set(.7,.9,1);aura.add(sprite);
    }
    const smoke=new THREE.Group();smoke.name='study-passing-smoke';smoke.visible=false;smoke.add(aura);E.S.add(smoke);
    refs.runner=g;refs.runnerSmoke=smoke;
  },{rigged:true});
  model('horror_ghost_character_-_blood_stained_spirit',null,[0,0,0],[.9,1.9,.9],0,null,g=>{
    g.name='study-progress-spirit';g.userData.facingOffset=-Math.PI/2;darken(g,.1);g.visible=false;refs.spirit=g;
    const closeup=new THREE.Group();closeup.name='study-spirit-closeup';closeup.visible=false;
    const black=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:1,depthTest:false,depthWrite:false}));
    black.position.z=-1.4;black.renderOrder=9999;black.onBeforeRender=renderer=>renderer.clearDepth();closeup.add(black);
    const face=g.clone(true);face.visible=true;face.name='study-spirit-face';face.position.set(0,-1.72,-.7);face.rotation.y=-Math.PI/2;
    face.traverse(o=>{o.userData.np=1;if(o.isMesh){o.renderOrder=10000;const grade=m=>new THREE.MeshBasicMaterial({map:m.map,color:m.color.clone().multiplyScalar(2.8),side:m.side,transparent:true,opacity:1,depthTest:true,depthWrite:true,toneMapped:false});o.material=Array.isArray(o.material)?o.material.map(grade):grade(o.material);}});
    closeup.add(face);
    // A small independent scene avoids drawing the entire study behind an opaque face scare.
    const overlayScene=new THREE.Scene();overlayScene.background=new THREE.Color(0x000000);
    const overlayCamera=new THREE.PerspectiveCamera(E.cam?.fov||72,E.cam?.aspect||1,.05,10);
    overlayScene.add(closeup);refs.overlayScene=overlayScene;refs.overlayCamera=overlayCamera;refs.closeup=closeup;refs.face=face;
    E.onDispose?.(()=>{
      // Face geometry/textures are shared with the world spirit; only these materials are private.
      face.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});
      black.geometry.dispose();black.material.dispose();overlayScene.clear();
    });
    if(E.renderer?.compileAsync){closeup.visible=true;const warm=E.renderer.compileAsync(overlayScene,overlayCamera);closeup.visible=false;warm?.catch(()=>{});}
  });
}

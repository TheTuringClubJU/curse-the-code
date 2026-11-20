import * as THREE from 'three';

// A recurring sighting. Deliberate attention makes it retreat; it later creeps back from the right.
export function createStudyWindowGhost(E,ghost,{reduced=false,random=Math.random}={}){
 const origin=ghost.position.clone(),eye=new THREE.Vector3(),forward=new THREE.Vector3(),focus=new THREE.Vector3(),toward=new THREE.Vector3();
 let watched=0,elapsed=0,phase='watching',cooldown=0,linger=0,reserved=false;
 const retreatSeconds=4.8/1.2; // 20% faster sideways velocity; the return remains slow.
 const materials=new Map();
 ghost.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m,m.opacity);});
 return {
  tick(dt){
   const state=E._studyState||{};
   if(E._studyHorrorReserved){reserved=true;ghost.visible=false;return;}
   if(!state.started||state.paused||document.hidden)return;
   if(reserved){ghost.visible=phase!=='absent';reserved=false;}
   const opacity=value=>{for(const [m,base]of materials)m.opacity=base*value;};
   if(phase==='absent'){
    cooldown-=dt;if(cooldown>0)return;
    phase='returning';elapsed=0;ghost.visible=true;opacity(0);ghost.position.copy(origin);if(!reduced)ghost.position.z+=3.4;
   }
   if(E.cam&&!reduced){E.cam.getWorldPosition(eye);ghost.rotation.y=Math.atan2(eye.x-ghost.position.x,eye.z-ghost.position.z);}
   if(phase==='returning'){
    elapsed+=dt;const t=Math.min(1,elapsed/(reduced?1.5:2.4));
    if(!reduced)ghost.position.z=origin.z+3.4*(1-THREE.MathUtils.smoothstep(t,0,1));
    opacity(THREE.MathUtils.smoothstep(t,0,1));
    if(t>=1){phase='watching';elapsed=watched=0;linger=3;ghost.position.copy(origin);}return;
   }
   if(phase==='watching'&&linger>0){linger=Math.max(0,linger-dt);return;}
   if(phase==='watching'&&E.cam){
    E.cam.getWorldPosition(eye);E.cam.getWorldDirection(forward);
    focus.copy(origin);focus.y+=1.4;toward.copy(focus).sub(eye);
    const t=(E.W/2-eye.x)/toward.x;
    const y=eye.y+t*toward.y,z=eye.z+t*toward.z;
    const throughGlass=eye.x<E.W/2&&t>0&&t<1&&y>1.06&&y<3.6&&Math.abs(z)<1.95;
    const direct=throughGlass&&forward.dot(toward.normalize())>Math.cos(12*Math.PI/180);
    watched=direct?watched+dt:0;
    if(watched>=.35){phase='retreating';elapsed=0;}
   }
   if(phase!=='retreating')return;
   elapsed+=dt;
   // Looking east, the viewer's right is positive Z. Slide behind the right-hand jamb.
   if(!reduced)ghost.position.z=origin.z+3.4*Math.min(1,elapsed/retreatSeconds);
   opacity(1-THREE.MathUtils.smoothstep(elapsed,reduced?.2:2.8,reduced?1.5:retreatSeconds));
   if(elapsed>=(reduced?1.5:retreatSeconds)){ghost.visible=false;phase='absent';cooldown=25+random()*10;watched=0;}
  },
  getPhase:()=>phase
 };
}

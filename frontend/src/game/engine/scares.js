// Jump-scare director: 4 scripted scares at random intervals. In ?debug mode keys 1-4 trigger them directly.
import * as THREE from 'three'
import * as X from './tex.js'
const rnd=(a,b)=>a+Math.random()*(b-a),ease=t=>t*t*(3-2*t)
export function createScares(E,h){
 const {S,cam,sc,ref,W,D,win}=E,A=()=>h.audio,flash=(c,a,ms)=>h.onFlash?.(c,a,ms)
 const basic=(map,w,hh)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,hh),new THREE.MeshBasicMaterial({map:X.tex(map,{}),transparent:true,fog:false,depthWrite:false}));m.visible=false;m.userData.np=1;S.add(m);return m}
 const face=basic(X.faceC({seed:2}),.62,.78),fig=basic(X.figureC(),.7,2.1)
 const fwd=()=>[-Math.sin(E.yaw()),-Math.cos(E.yaw())],look=(x,z)=>{const [fx,fz]=fwd(),dx=x-E.px(),dz=z-E.pz(),d=Math.hypot(dx,dz)||1;return{dot:(fx*dx+fz*dz)/d,d}}
 const defs={
  window:{cond:()=>{if(!win)return false;const l=look(-W/2,win.z);return l.dot>.5&&l.d<6.5},start(){face.position.set(-W/2-1.5,1.6,win.z);face.rotation.set(0,Math.PI/2,.07);face.scale.setScalar(.5);face.visible=true;this.hit=false},
   upd(t){const k=ease(Math.min(1,t/.26));face.position.x=-W/2-1.5+(1.5-.08)*k;face.scale.setScalar(.5+.55*k);if(t>.26){if(!this.hit){this.hit=true;A()?.thump?.(-W/2,win.z);A()?.stinger?.(1);A()?.whisper?.('seeyou',-W/2,win.z);E.shake(1,.5);flash('#cfd8ff',.35,120)}face.position.z=win.z+Math.sin(t*60)*.008;face.position.y=1.6+Math.sin(t*47)*.006}
    if(t>1.5){face.visible=false;return true}}},
  blackout:{cond:()=>true,start(){sc.v=.025;A()?.bang?.(E.px()+1,E.pz()-1);A()?.heartbeat?.(true);const [fx,fz]=fwd();this.fx=fx;this.fz=fz;this.shown=0;E.shake(.6,.4)},
   upd(t){const [fx,fz]=[this.fx,this.fz],px=E.px()+fx*2.4,pz=E.pz()+fz*2.4
    if(t>1.9&&t<2.1){sc.v=1;if(!this.shown){this.shown=1;fig.position.set(px,1.05,pz);fig.visible=true;A()?.stinger?.(.8);flash('#000',0,0)}}else if(t>=2.1&&t<2.4){sc.v=.025}
    else if(t>=2.4&&t<2.55){sc.v=.8;fig.visible=false}else if(t>=2.55&&t<2.7){sc.v=.1}else if(t>=2.7){sc.v=1;if(ref.doll){ref.doll.head.rotation.y=0}A()?.heartbeat?.(false);A()?.whisper?.('getout',E.px()-fx*1.5,E.pz()-fz*1.5);ref.chairRock=0;setTimeout(()=>ref.chairRock=1,24000);return true}
    fig.quaternion.copy(cam.quaternion)}},
  shadow:{cond:()=>{const[fx,fz]=fwd(),cx=E.px()+fx*3.2,cz=E.pz()+fz*3.2;return Math.abs(cx)<W/2-.7&&Math.abs(cz)<D/2-.7},start(){const[fx,fz]=fwd(),rx=-fz,rz=fx,cx=E.px()+fx*3.4,cz=E.pz()+fz*3.4;const cl=(x,z)=>[Math.max(-W/2+.4,Math.min(W/2-.4,x)),Math.max(-D/2+.4,Math.min(D/2-.4,z))]
    this.a=cl(cx-rx*3.4,cz-rz*3.4);this.b=cl(cx+rx*3.4,cz+rz*3.4);fig.visible=true;A()?.stinger?.(.6);A()?.footsteps?.(this.a[0],this.a[1],this.b[0],this.b[1]);setTimeout(()=>A()?.whisper?.('behind',this.b[0],this.b[1]),500);E.shake(.4,.5)},
   upd(t){const k=Math.min(1,t/.85);fig.position.set(this.a[0]+(this.b[0]-this.a[0])*k,1.05,this.a[1]+(this.b[1]-this.a[1])*k);fig.quaternion.copy(cam.quaternion);sc.v=t<.7?(Math.random()<.35?.25:1):1;if(k>=1){fig.visible=false;sc.v=1;return true}}},
  wardrobe:{cond:()=>{const w=ref.wardrobe;if(!w)return false;const l=look(w.pos.x,w.pos.z);return l.dot>.5&&l.d<5.5},start(){const w=ref.wardrobe;this.w=w;this.hit=false;w.scare=1},
   upd(t){const w=this.w,k=ease(Math.min(1,t/.12));w.doorR.rotation.y=.16+(2.0-.16)*k;w.doorL.rotation.y=-.0-(1.6)*k
    if(t>.1&&!this.hit){this.hit=true;w.face.visible=true;A()?.slam?.(w.pos.x,w.pos.z);A()?.screech?.(w.pos.x,w.pos.z);flash('#a00000',.55,220);E.shake(1.4,.7)}
    if(t>1.1)w.face.visible=false;if(t>1.4){const q=Math.min(1,(t-1.4)/3);w.doorR.rotation.y=2.0+(.16-2.0)*ease(q);w.doorL.rotation.y=-1.6*(1-ease(q));if(q>=1){w.scare=0;return true}}}}}
 let act=null,at=0,nextAt=performance.now()/1000+rnd(25,40),queue=[],lastName=''
 const refill=()=>{queue=Object.keys(defs).sort(()=>Math.random()-.5);if(queue[0]===lastName)queue.push(queue.shift())}
 const trigger=n=>{if(act||!defs[n])return;act=Object.create(defs[n]);at=0;lastName=n;act.name=n;act.start()}
 return{trigger,tick(dt,t){if(act){at+=dt;if(act.upd(at)){act=null;nextAt=t+rnd(40,75)}return}
  const w=ref.wardrobe;if(w&&!w.scare){w.doorR.rotation.y=.16+.04*Math.sin(t*.45);w.doorL.rotation.y=-.01*Math.sin(t*.3+1)}
  if(t<nextAt||E.paused)return;if(!queue.length)refill();const i=queue.findIndex(n=>defs[n].cond());if(i>=0){const n=queue.splice(i,1)[0];trigger(n)}}}
}

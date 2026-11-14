// Jump-scare director: 5 scripted & randomized scares (including visceral Door Ambush). In ?debug mode keys 1-5 trigger them directly.
import * as THREE from 'three'
import * as X from './tex.js'
const rnd=(a,b)=>a+Math.random()*(b-a),ease=t=>t*t*(3-2*t)
export function createScares(E,h){
 const {S,cam,sc,ref,W,D,win}=E,A=()=>h.audio,flash=(c,a,ms)=>h.onFlash?.(c,a,ms)
 if(!cam.parent)S.add(cam)
 const basic=(map,w,hh)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,hh),new THREE.MeshBasicMaterial({map:X.tex(map,{}),transparent:true,fog:false,depthWrite:false}));m.visible=false;m.userData.np=1;S.add(m);return m}
 const face=basic(X.faceC({seed:2,mouth:true}),.72,.92),fig=basic(X.figureC(),.82,2.2)

 // Camera-locked 3D screaming phantom for intense door & lunge jump scares
 const phantomGrp=new THREE.Group();phantomGrp.position.set(0,-0.04,-1.55);phantomGrp.visible=false;phantomGrp.userData.np=1
 const phantomFace=new THREE.Mesh(
  new THREE.PlaneGeometry(1.45,1.82),
  new THREE.MeshBasicMaterial({map:X.tex(X.faceC({eye:'#ff1828',glow:true,mouth:true,seed:13}),{}),transparent:true,fog:false,depthWrite:false})
 )
 phantomFace.userData.np=1;phantomGrp.add(phantomFace)
 const clawTex=X.tex(X.clawMarksC(31),{})
 const clawMat=new THREE.MeshBasicMaterial({map:clawTex,transparent:true,fog:false,depthWrite:false,opacity:0.92})
 const clawSlash=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.35),clawMat)
 clawSlash.position.set(0,0,0.08);clawSlash.userData.np=1;phantomGrp.add(clawSlash)
 const phantomLight=new THREE.PointLight(0xff1224,0,4.5,2)
 phantomLight.position.set(0,0.1,0.25);phantomGrp.add(phantomLight)
 cam.add(phantomGrp)

 const fwd=()=>[-Math.sin(E.yaw()),-Math.cos(E.yaw())],look=(x,z)=>{const [fx,fz]=fwd(),dx=x-E.px(),dz=z-E.pz(),d=Math.hypot(dx,dz)||1;return{dot:(fx*dx+fz*dz)/d,d}}
 const defs={
  window:{cond:()=>{if(!win)return false;const l=look(-W/2,win.z);return l.dot>.4&&l.d<7.5},start(){face.position.set(-W/2-1.5,1.6,win.z);face.rotation.set(0,Math.PI/2,.07);face.scale.setScalar(.55);face.visible=true;this.hit=false},
   upd(t){const k=ease(Math.min(1,t/.18));face.position.x=-W/2-1.5+(1.5-.06)*k;face.scale.setScalar(.55+.68*k);if(t>.18){if(!this.hit){this.hit=true;A()?.thump?.(-W/2,win.z);A()?.jumpscareSting?.(1.25);A()?.screech?.(-W/2,win.z);A()?.whisper?.('seeyou',-W/2,win.z);E.shake(1.6,.65);flash('#b80414',.68,180)}face.position.z=win.z+Math.sin(t*72)*.014;face.position.y=1.6+Math.sin(t*58)*.012}
    if(t>1.35){face.visible=false;return true}}},
  blackout:{cond:()=>true,start(){sc.v=.02;A()?.bang?.(E.px()+1,E.pz()-1);A()?.heartbeat?.(true);const [fx,fz]=fwd();this.fx=fx;this.fz=fz;this.shown=0;E.shake(1.1,.55);flash('#000',.92,200)},
   upd(t){const [fx,fz]=[this.fx,this.fz],px=E.px()+fx*1.75,pz=E.pz()+fz*1.75
    if(t>1.1&&t<1.45){sc.v=1;if(!this.shown){this.shown=1;fig.position.set(px,1.08,pz);fig.visible=true;A()?.jumpscareSting?.(1.3);A()?.screech?.(px,pz);E.shake(1.8,.6);flash('#a8000c',.75,180)}}else if(t>=1.45&&t<1.75){sc.v=.02}
    else if(t>=1.75&&t<2.0){sc.v=.95;fig.position.set(E.px()+fx*1.05,1.08,E.pz()+fz*1.05)}else if(t>=2.0&&t<2.2){sc.v=.05;fig.visible=false}else if(t>=2.2){sc.v=1;fig.visible=false;if(ref.doll){ref.doll.head.rotation.y=0}A()?.heartbeat?.(false);A()?.whisper?.('getout',E.px()-fx*1.2,E.pz()-fz*1.2);ref.chairRock=0;setTimeout(()=>ref.chairRock=1,24000);return true}
    fig.quaternion.copy(cam.quaternion)}},
  shadow:{cond:()=>{const[fx,fz]=fwd(),cx=E.px()+fx*2.8,cz=E.pz()+fz*2.8;return Math.abs(cx)<W/2-.5&&Math.abs(cz)<D/2-.5},start(){const[fx,fz]=fwd(),rx=-fz,rz=fx,cx=E.px()+fx*2.6,cz=E.pz()+fz*2.6;const cl=(x,z)=>[Math.max(-W/2+.4,Math.min(W/2-.4,x)),Math.max(-D/2+.4,Math.min(D/2-.4,z))]
    this.a=cl(cx-rx*2.8,cz-rz*2.8);this.b=cl(E.px()+fx*0.95,E.pz()+fz*0.95);fig.visible=true;A()?.jumpscareSting?.(1.15);A()?.footsteps?.(this.a[0],this.a[1],this.b[0],this.b[1]);setTimeout(()=>A()?.whisper?.('behind',this.b[0],this.b[1]),280);E.shake(1.2,.55);flash('#6e0008',.52,150)},
   upd(t){const k=Math.min(1,t/.42);fig.position.set(this.a[0]+(this.b[0]-this.a[0])*k,1.08,this.a[1]+(this.b[1]-this.a[1])*k);fig.quaternion.copy(cam.quaternion);sc.v=t<.36?(Math.random()<.45?.18:1):1;if(k>=1){fig.visible=false;sc.v=1;return true}}},
  wardrobe:{cond:()=>{const w=ref.wardrobe;if(!w)return false;const l=look(w.pos.x,w.pos.z);return l.dot>.4&&l.d<6.2},start(){const w=ref.wardrobe;this.w=w;this.hit=false;w.scare=1},
   upd(t){const w=this.w,k=ease(Math.min(1,t/.1));w.doorR.rotation.y=.16+(2.15-.16)*k;w.doorL.rotation.y=-.0-(1.75)*k
    if(t>.08&&!this.hit){this.hit=true;w.face.visible=true;A()?.slam?.(w.pos.x,w.pos.z);A()?.jumpscareSting?.(1.4);A()?.screech?.(w.pos.x,w.pos.z);flash('#c00010',.82,240);E.shake(2.0,.8)}
    if(t>1.15)w.face.visible=false;if(t>1.4){const q=Math.min(1,(t-1.4)/2.2);w.doorR.rotation.y=2.15+(.16-2.15)*ease(q);w.doorL.rotation.y=-1.75*(1-ease(q));if(q>=1){w.scare=0;return true}}}},
  doorAmbush:{cond:()=>true,start(){
    phantomGrp.visible=true;phantomGrp.position.set(0,-0.06,-1.65);phantomGrp.scale.setScalar(0.38);phantomGrp.rotation.set(0,0,0)
    phantomLight.intensity=15;this. flashedMid=false
    A()?.slam?.(E.px(),E.pz());A()?.jumpscareSting?.(1.48);A()?.screech?.(E.px(),E.pz())
    E.shake(2.4,0.88);flash('#c80414',0.88,220)
   },
   upd(t){
    const k=ease(Math.min(1,t/0.13))
    phantomGrp.position.z=-1.65+1.24*k
    phantomGrp.position.x=Math.sin(t*85)*0.045
    phantomGrp.position.y=-0.04+Math.cos(t*72)*0.038
    phantomGrp.rotation.z=Math.sin(t*68)*0.16
    phantomGrp.scale.setScalar(0.38+0.88*k)
    phantomLight.intensity=15*(1-Math.min(1,t/0.68))
    if(t>0.18&&!this.flashedMid){this.flashedMid=true;flash('#ffffff',0.55,95);A()?.whisper?.('getout',E.px(),E.pz())}
    if(t>0.68){phantomGrp.visible=false;phantomLight.intensity=0;return true}
    return false
   }}
 }
 let act=null,at=0,nextAt=performance.now()/1000+rnd(28,45),queue=[],lastName=''
 const refill=()=>{queue=Object.keys(defs).sort(()=>Math.random()-.5);if(queue[0]===lastName)queue.push(queue.shift())}
 const cleanupActive=()=>{face.visible=false;fig.visible=false;phantomGrp.visible=false;phantomLight.intensity=0;sc.v=1;if(ref.wardrobe){ref.wardrobe.face.visible=false;ref.wardrobe.scare=0}}
 const trigger=(n,force=false)=>{if((act&&!force)||!defs[n])return;if(act)cleanupActive();act=Object.create(defs[n]);at=0;lastName=n;act.name=n;act.start()}
 const triggerDoorScare=()=>trigger('doorAmbush',true)
 return{
  trigger,
  triggerDoorScare,
  dispose(){cleanupActive();if(phantomGrp.parent)phantomGrp.parent.remove(phantomGrp)},
  tick(dt,t){
   if(act){at+=dt;if(act.upd(at)){act=null;nextAt=t+rnd(42,68)}return}
   const w=ref.wardrobe;if(w&&!w.scare){w.doorR.rotation.y=.16+.04*Math.sin(t*.45);w.doorL.rotation.y=-.01*Math.sin(t*.3+1)}
   if(t<nextAt||E.paused)return;if(!queue.length)refill();const i=queue.findIndex(n=>defs[n].cond());if(i>=0){const n=queue.splice(i,1)[0];trigger(n)}
  }
 }
}

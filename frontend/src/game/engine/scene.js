// Haunted bedroom: GLB shell integration (abandoned_mansion_bedroom.glb) + aligned interactive props, collisions & procedural fallbacks.
import {THREE,X,TX,RoundedBoxGeometry,mat,wm,lathe,bgeo,curtainGeo,tube,drapeGeo} from './kit.js'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import {Reflector} from 'three/examples/jsm/objects/Reflector.js'
import {buildDecor} from './decor.js'
export const mk=(geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);return o}
export const grp=(x=0,y=0,z=0,ry=0)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;return g}
const bx=(w,h,d,m,x,y,z,o={})=>{const q=mk(bgeo(w,h,d,o.s??1.4,o.vert),m,x,y,z,o.rx||0,o.ry||0,o.rz||0);return q}
const rb=(w,h,d,r,m,x,y,z,seg=2)=>mk(new RoundedBoxGeometry(w,h,d,seg,r),m,x,y,z)
const hitbox=(w,h,d,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}));m.position.set(x,y,z);m.castShadow=false;m.userData.ns=1;m.userData._isHitbox=true;return m}

export function buildBedroom(E){
 const {S,add,solid,anim,interact,W,H,D,win,ref}=E
 // Snapshot procedural room shell created in engine.js so it can be hidden once GLB shell loads
 const procShell=S?S.children.filter(o=>o.isMesh):[]
 const procFurnitureVisuals=[]
 const trackVisual=(obj)=>{procFurnitureVisuals.push(obj);return obj}

 const dark=wm('dark'),worn=wm('worn'),ebony=wm('ebony'),brass=mat({map:TX.brass(),m:.85,r:.4,c:0xd8b070}),gold=mat({map:TX.metal(),m:.7,r:.45,c:0xe0b878})
 const post=(g,x,z,h)=>{const L=lathe([[.0,0],[.05,0],[.052,.08],[.034,.13],[.04,.24],[.056,.34],[.034,.43],[.034,h-.2],[.052,h-.12],[.06,h-.06],[.034,h-.02],[.0,h]]);const m=mk(L,dark,x,0,z);g.add(m);g.add(mk(new THREE.SphereGeometry(.05,16,12),dark,x,h+.03,z))}

 // 1. Four-poster bed (GLB North-Center X:[-0.20, 1.85], Z:[-2.85, 0.15]) + pillow + diary on mattress
 {const g=grp(0.82,0,-1.35)
  const vis=new THREE.Group()
  vis.add(bx(.07,.22,2.7,dark,-.97,.36,0),bx(.07,.22,2.7,dark,.97,.36,0),bx(1.94,.2,.07,dark,0,.36,1.37),bx(1.94,.2,.07,dark,0,.36,-1.37))
  post(vis,-.97,-1.37,1.55);post(vis,.97,-1.37,1.55);post(vis,-.97,1.37,1.02);post(vis,.97,1.37,1.02)
  const sh=new THREE.Shape();sh.moveTo(-.9,0);sh.lineTo(.9,0);sh.lineTo(.9,.62);sh.bezierCurveTo(.9,.82,.45,.9,0,.98);sh.bezierCurveTo(-.45,.9,-.9,.82,-.9,.62);sh.closePath()
  vis.add(mk(new THREE.ExtrudeGeometry(sh,{depth:.05,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2}),dark,0,.5,-1.4))
  const sh2=new THREE.Shape();sh2.moveTo(-.7,0);sh2.lineTo(.7,0);sh2.lineTo(.7,.5);sh2.bezierCurveTo(.7,.64,.34,.7,0,.74);sh2.bezierCurveTo(-.34,.7,-.7,.64,-.7,.5);sh2.closePath()
  vis.add(mk(new THREE.ExtrudeGeometry(sh2,{depth:.02,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2}),ebony,0,.62,-1.36))
  vis.add(bx(1.88,.34,.05,dark,0,.64,1.4),bx(1.9,.05,.08,ebony,0,.83,1.4))
  vis.add(rb(1.84,.21,2.64,.06,mat({map:TX.sheet2(),r:.95}),0,.58,0))
  vis.add(mk(drapeGeo(1.84,1.95,.38,3),mat({map:TX.quilt(),r:.98,side:THREE.DoubleSide}),0,.7,.42))
  g.add(trackVisual(vis))
  g.add(hitbox(2.1,1.1,3.0,0,0.55,0))
  interact(g,'bed');add(g);solid(-0.22,1.85,-2.90,0.12)

  // Pillow (EB08) at head of GLB bed
  const pilGrp=grp(0.82,0.98,-2.35)
  const pilVis=new THREE.Group()
  ;[[-.34,0,.08],[.34,0,-.1]].forEach(p=>{const pl=rb(.6,.17,.4,.07,mat({map:TX.sheet(),r:.95}),p[0],0,p[1],5);pl.rotation.y=p[2];pl.scale.set(1,.9,1);pilVis.add(pl)})
  pilGrp.add(trackVisual(pilVis))
  pilGrp.add(hitbox(1.7,0.45,0.95,0,0.05,0))
  interact(pilGrp,'pillow');add(pilGrp)

  // Diary (R1-01 - Clue 1) kept visible on top of the GLB bed mattress
  const dg=grp(0.85,0.84,-0.95,.2),lc=mat({map:TX.leather('red'),r:.7}),L=X.tex(X.paperPage(['Dad has been sleeping at his desk.'],'Test day 1')),R2=X.tex(X.paperPage(['Rex turned 5 today. This is test page two.'],'Test day 2'))
  dg.add(rb(.5,.03,.34,.006,lc,0,0,0,2),mk(new THREE.BoxGeometry(.012,.034,.34),mat({map:TX.leather('red'),r:.6}),0,.003,0))
  ;[[-1,L],[1,R2]].forEach(([s,t])=>{const p=mk(new THREE.PlaneGeometry(.225,.315),mat({map:t,r:.95}),s*.118,.0285,0,-Math.PI/2,0,-s*.05);dg.add(p);dg.add(mk(new THREE.BoxGeometry(.225,.014,.315),mat({color:0xcfc4a6,r:1}),s*.118,.02,0,0,0,-s*.05))})
  dg.add(mk(new THREE.BoxGeometry(.012,.002,.3),mat({color:0x7a1212,r:.6}),.01,.034,.02))
  dg.add(hitbox(0.55,0.25,0.45,0,0.05,0))
  interact(dg,'diary');add(dg)
 }

 // 2. Nightstand (GLB bedside table left of bed at (-0.85, 0, -2.45)) + musicbox + candle + photo_frame on top
 {const g=grp(-0.85,0,-2.45)
  const vis=new THREE.Group()
  ;[[-.28,-.19],[.28,-.19],[-.28,.19],[.28,.19]].forEach(p=>vis.add(bx(.05,.14,.05,dark,p[0],.07,p[1],{vert:true})))
  vis.add(bx(.6,.5,.42,worn,0,.39,0),bx(.68,.04,.5,dark,0,.66,0),bx(.52,.17,.02,dark,0,.52,.215),bx(.52,.21,.02,dark,0,.27,.215),mk(new THREE.SphereGeometry(.02,12,8),brass,0,.52,.24),mk(new THREE.SphereGeometry(.02,12,8),brass,0,.28,.24))
  vis.add(mk(new THREE.CircleGeometry(.2,24),mat({color:0xbfb6a0,r:1}),-.05,.683,.0,-Math.PI/2,0,0))
  g.add(trackVisual(vis))
  g.add(hitbox(1.0,1.1,0.9,0,0.55,0))
  interact(g,'nightstand');add(g);solid(-1.35,-0.33,-2.92,-1.98)

  // Music box (EB07) visible on top of GLB nightstand
  const mb=grp(-0.82,1.09,-2.42,.12),bw=mat({map:TX.wood('ebony'),bump:TX.wood('ebony'),bs:.5,r:.5,c:0x9a7060})
  mb.add(rb(.3,.1,.2,.012,bw,0,.05,0,3),bx(.31,.012,.21,gold,0,.099,0),bx(.31,.012,.21,gold,0,.004,0))
  mb.add(mk(new THREE.PlaneGeometry(.27,.17),mat({color:0x5a0f1a,r:1}),0,.1005,0,-Math.PI/2,0,0))
  const lid=grp(0,.1,-.1);lid.add(rb(.3,.022,.2,.008,bw,0,0,.1,2),bx(.31,.01,.21,gold,0,.012,.1));lid.rotation.x=-1.75;mb.add(lid)
  mb.add(mk(new THREE.CylinderGeometry(.045,.05,.022,20),brass,.0,.112,.0),bx(.15,.006,.012,gold,-.05,.108,.06))
  const bl=grp(0,.125,0);bl.add(mk(new THREE.CylinderGeometry(.006,.006,.05,8),brass,0,.025,0));const bd=lathe([[.0,0],[.018,.02],[.01,.07],[.012,.1],[0,.11]],12);bl.add(mk(bd,mat({color:0xe6dccd,r:.35}),0,.01,0))
  bl.add(mk(new THREE.SphereGeometry(.013,12,10),mat({map:TX.doll(),r:.3}),0,.125,0,0,Math.PI*.5,0))
  bl.add(mk(new THREE.ConeGeometry(.045,.025,18,1,true),mat({color:0xe2b7c6,r:.8,side:THREE.DoubleSide}),0,.075,0))
  ;[-1,1].forEach(s=>bl.add(mk(new THREE.CylinderGeometry(.003,.003,.05,6),mat({color:0xe6dccd}),s*.022,.1,0,0,0,s*.9)));mb.add(bl)
  mb.add(hitbox(0.45,0.35,0.35,0,0.12,0))
  interact(mb,'musicbox');add(mb);anim((t)=>{bl.rotation.y=t*.45})

  // Candle (EB03) visible on top of GLB nightstand
  const cg=grp(-1.14,1.09,-2.35);cg.add(mk(lathe([[0,0],[.05,0],[.05,.012],[.02,.03],[.016,.05],[.03,.056],[0,.056]],16),brass,0,0,0))
  const wax=mat({color:0xd8cfb8,r:.55,e:0x201408,ei:.3});cg.add(mk(new THREE.CylinderGeometry(.017,.019,.17,16),wax,0,.14,0),mk(new THREE.CylinderGeometry(.022,.02,.02,16),wax,0,.065,0))
  for(let i=0;i<4;i++)cg.add(mk(new THREE.CylinderGeometry(.0055,.007,.05+i*.015,8),wax,Math.cos(i*1.7)*.018,.16-i*.015,Math.sin(i*1.7)*.018))
  const fl=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.flame(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));fl.position.set(0,.29,0);fl.userData.np=1;cg.add(fl)
  const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow('w'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false,opacity:.7}));gl.scale.set(.5,.5,1);gl.position.set(0,.3,0);gl.userData.np=1;cg.add(gl)
  cg.add(hitbox(0.3,0.5,0.3,0,0.15,0))
  interact(cg,'candle');add(cg)
  const pl=new THREE.PointLight(0xffa850,1.4,3.5,2);pl.position.set(-1.14,1.40,-2.35);S.add(pl);E.lightRig(pl,1.4,E.flick(2,.25));anim(t=>{const f=E.flick(2,.3)(t);fl.scale.set(.05*(.9+.2*f),.11*(.85+.3*f),1);gl.material.opacity=.45*f*E.lightScale()})

  // Photo frame (XB01) visible on top of GLB nightstand
  const pf=grp(-0.48,1.09,-2.62,-.25);pf.add(bx(.14,.19,.02,gold,0,.1,0),mk(new THREE.PlaneGeometry(.1,.15),mat({map:TX.photo(0),r:.5}),0,.1,.0125));pf.add(bx(.03,.12,.01,dark,0,.07,-.02));pf.rotation.x=-.15
  pf.add(hitbox(0.3,0.35,0.2,0,0.1,0))
  interact(pf,'photo_frame');add(pf)
 }

 // 3. West vanity desk (GLB (-3.36, 0, 0.0)) + mirror above + notebook & lamp on top
 {const g=grp(-3.36,0,0.0,Math.PI/2)
  const vis=new THREE.Group()
  vis.add(bx(1.8,.06,.8,worn,0,.75,0),bx(1.84,.025,.84,dark,0,.725,0))
  ;[[-.82,-.34],[-.82,.34],[.82,-.34],[.82,.34]].forEach(p=>{vis.add(mk(lathe([[0,0],[.04,0],[.045,.1],[.03,.2],[.04,.4],[.05,.5],[.035,.6],[.04,.7],[0,.7]],14),dark,p[0],0,p[1]))})
  vis.add(bx(.5,.54,.72,worn,.52,.44,0))
  ;[0,1,2].forEach(i=>{vis.add(bx(.44,.15,.02,dark,.52,.62-i*.17,.37),mk(new THREE.SphereGeometry(.016,10,8),brass,.52,.62-i*.17,.395))})
  vis.add(bx(1.2,.5,.02,dark,-.2,.46,-.36))
  g.add(trackVisual(vis))
  g.add(hitbox(2.1,1.1,0.9,0,0.55,0))
  interact(g,'desk');add(g);solid(-3.85,-2.92,-1.08,1.08)

  // Mirror (EB11) above West vanity desk
  const mg=grp(-3.45,1.62,0.0,Math.PI/2)
  const mvis=new THREE.Group()
  const geo=new THREE.CircleGeometry(1,48);const mr=new Reflector(geo,{color:0x707890,textureWidth:512,textureHeight:512,clipBias:.003});mr.scale.set(.27,.44,1);mr.position.z=.006;mr.userData.np=1;mvis.add(mr)
  const fr=mk(new THREE.TorusGeometry(1,.1,12,56),gold,0,0,.02);fr.scale.set(.31,.48,.35);mvis.add(fr)
  const fr2=mk(new THREE.TorusGeometry(1,.05,10,56),mat({map:TX.wood('ebony'),r:.6}),0,0,.01);fr2.scale.set(.285,.455,.3);mvis.add(fr2)
  const cr=new THREE.Mesh(new THREE.PlaneGeometry(.56,.9),new THREE.MeshBasicMaterial({map:X.tex(X.crackC(512,512,2,{cx:.4,cy:.45,n:16}),{}),transparent:true,opacity:.85,depthWrite:false,fog:false}));cr.scale.set(.95,.95,1);cr.position.z=.012;cr.userData.np=1;mvis.add(cr)
  const dt=new THREE.Mesh(new THREE.PlaneGeometry(.55,.88),new THREE.MeshBasicMaterial({map:X.tex(X.mirrorDirt(),{}),transparent:true,depthWrite:false,fog:false}));dt.position.z=.011;mvis.add(dt)
  mg.add(trackVisual(mvis))
  mg.add(hitbox(0.9,1.1,0.35,0,0,0))
  interact(mg,'mirror');add(mg,{noShadow:true})

  // School notebook stack (R1-02 - Clue 2) visible on GLB West vanity desk
  const bk=(w,h,d,c,x,y,z,ry)=>{const m=rb(w,h,d,.008,mat({map:TX.leather(c),r:.7}),x,y,z,2);m.rotation.y=ry;return m}
  const cl=grp(-3.28,1.10,-0.52,Math.PI/2);cl.add(bk(.26,.04,.19,'red',0,.02,0,.1),bk(.24,.035,.17,'green',0,.0575,0,-.15),bk(.22,.04,.16,'blue',0,.095,.0,.3),bk(.2,.03,.15,'dark',0,.13,0,-.05))
  cl.add(hitbox(0.42,0.32,0.36,0,0.08,0))
  interact(cl,'notebook');add(cl)

  // Parlor lamp visible on GLB West vanity desk
  const lg=grp(-3.28,1.10,0.58)
  lg.add(hitbox(0.7,0.85,0.7,0,0.35,0))
  lg.add(mk(lathe([[0,0],[.08,0],[.08,.02],[.03,.05],[.02,.2],[.025,.3],[.015,.36],[0,.37]],20),mat({color:0x1a1a1e,m:.7,r:.35}),0,0,0))
  const shade=mk(new THREE.CylinderGeometry(.1,.17,.2,28,1,true),mat({map:TX.shade(),side:THREE.DoubleSide,e:0xffc67a,ei:.9,r:.9}),0,.44,0);lg.add(shade);E.lampMats.push(shade.material)
  lg.add(mk(new THREE.SphereGeometry(.035,12,10),new THREE.MeshBasicMaterial({color:0xfff0c8}),0,.44,0))
  const lh=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow('w'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false,opacity:.55}));lh.scale.set(1.3,1.3,1);lh.position.set(0,.45,0);lh.userData.np=1;lg.add(lh);E.lampGlow=lh;interact(lg,'lamp');add(lg)
 }

 // 4. North-West GLB cabinet collision solid (sits underneath the torsion pendulum clock)
 solid(-3.85,-2.92,-2.90,-1.08)

 // 5. North-East Tall Wardrobe (GLB (2.95, 0, -2.42))
 {const g=grp(2.95,0,-2.42,Math.PI/2),dk=wm('ebony',{r:.6}),inner=new THREE.MeshStandardMaterial({color:0x020103,roughness:1,side:THREE.BackSide})
  const vis=new THREE.Group()
  vis.add(bx(.03,2.1,1.4,dk,.38,1.15,0),bx(.8,2.1,.03,dk,0,1.15,.685),bx(.8,2.1,.03,dk,0,1.15,-.685),bx(.84,.08,1.46,dk,0,2.2,0),bx(.9,.12,1.52,dk,-.02,2.3,0),bx(.84,.14,1.46,dk,0,.07,0),bx(.78,.04,1.4,dk,0,.16,0))
  vis.add(mk(new THREE.BoxGeometry(.76,2.0,1.36),inner,0,1.16,0))
  vis.add(mk(new THREE.CylinderGeometry(.012,.012,1.34,8),brass,0,1.95,0,Math.PI/2,0,0))
  const coats=[];for(let i=0;i<6;i++){const c=bx(.06,.95+(i%3)*.12,.3,mat({color:[0x120f16,0x1a1218,0x0e1118][i%3],r:1}),0,1.45-(i%3)*.06,-.5+i*.2);vis.add(c);coats.push(c)}
  anim(t=>coats.forEach((c,i)=>c.rotation.x=Math.sin(t*.6+i)*.02))
  const door=(side)=>{const p=grp(-.38,0,.69*side);const m=grp(0,0,-.335*side);m.add(bx(.035,2.0,.67,dk,0,1.1,0),bx(.02,.8,.46,wm('dark'),-.02,.7,0),bx(.02,.62,.46,wm('dark'),-.02,1.62,0),mk(new THREE.SphereGeometry(.022,12,10),brass,-.045,1.05,-.28*side));p.add(m);vis.add(p);return p}
  const dr=door(1),dl=door(-1);dr.rotation.y=.16
  g.add(trackVisual(vis))
  ref.wardrobe={doorR:dr,doorL:dl,pos:new THREE.Vector3(2.95,1.2,-2.1)}
  const ff=mk(new THREE.PlaneGeometry(.7,.9),new THREE.MeshBasicMaterial({map:X.tex(X.faceC({glow:true,eye:'#ff2a1a',seed:7}),{}),transparent:true,fog:false,depthWrite:false}),-.3,1.25,.12,0,-Math.PI/2,0);ff.visible=false;ff.userData.np=1;g.add(ff);ref.wardrobe.face=ff
  g.add(hitbox(0.95,2.5,1.75,0,1.25,0))
  interact(g,'wardrobe');add(g);solid(2.08,3.90,-2.92,-1.92)
 }

 // 6. Leather Trunk (EB01) placed on open floor at foot of GLB bed
 {const g=grp(0.82,0,0.52,0),lt=mat({map:TX.leather('dark'),r:.6,c:0xb09080});g.add(bx(.8,.025,.55,lt,0,.0125,0),bx(.8,.2,.025,lt,0,.12,.2625),bx(.8,.2,.025,lt,0,.12,-.2625),bx(.025,.2,.55,lt,-.3875,.12,0),bx(.025,.2,.55,lt,.3875,.12,0))
  g.add(mk(new THREE.PlaneGeometry(.75,.5),mat({color:0x3a1020,r:1}),0,.03,0,-Math.PI/2,0,0))
  const cw=mat({map:TX.sheet2(),bump:TX.sheet2(),bs:2,r:1,c:0x4a5578}),cw2=mat({map:TX.sheet(),bump:TX.sheet(),bs:2,r:1,c:0x6a4552});g.add(rb(.5,.07,.38,.03,cw,-.1,.07,.0,4),rb(.46,.06,.34,.03,cw2,-.08,.135,.01,4));const ro=rb(.4,.07,.32,.03,mat({map:TX.quilt(),r:1}),.1,.19,.0,4);ro.rotation.y=.2;g.add(ro)
  g.add(mk(tube([[.15,.2,.1],[.3,.15,.22],[.34,.08,.36],[.36,.03,.46]],.032,16,8),cw2));g.add(mk(tube([[-.2,.15,-.1],[-.34,.12,-.1],[-.5,.02,-.05]],.028,12,8),cw))
  const lidp=grp(0,.22,-.2625);lidp.add(bx(.8,.03,.55,lt,0,0,.275),bx(.8,.02,.025,lt,0,-.01,.55),bx(.025,.02,.55,lt,-.3875,-.01,.275),bx(.025,.02,.55,lt,.3875,-.01,.275),mk(new THREE.PlaneGeometry(.74,.5),mat({color:0x3a1020,r:1,side:2}),0,-.017,.275,Math.PI/2,0,0))
  lidp.rotation.x=-1.9;g.add(lidp);[-.25,.25].forEach(x=>g.add(bx(.06,.04,.015,brass,x,.18,.275)));interact(g,'trunk');add(g);solid(0.38,1.26,0.22,0.82)}

 // 7. Rocking Chair (EB12) & Doll (EK01) in open East-Center floor
 {const yaw=grp(2.65,0,-0.50,-Math.PI/2-0.25),pv=grp(0,0,0,0);yaw.add(pv)
  ;[-1,1].forEach(s=>{const pts=[];for(let i=0;i<=10;i++){const z=-.5+i*.1;pts.push([s*.27,.03+.2*Math.pow(z/.5,2)*.8,z])}pv.add(mk(tube(pts,.016,24,8),worn))
   pv.add(bx(.035,.4,.035,worn,s*.26,.25,.2,{vert:true}),bx(.035,.5,.035,worn,s*.26,.3,-.2,{vert:true}),bx(.03,.2,.03,worn,s*.27,.56,.15,{vert:true}),bx(.04,.03,.44,worn,s*.27,.67,.0))})
  pv.add(bx(.54,.04,.46,dark,0,.45,0),bx(.5,.03,.03,worn,0,.2,.2),bx(.5,.03,.03,worn,0,.2,-.2))
  const back=grp(0,.46,-.22);back.rotation.x=-.14;back.add(bx(.035,.55,.035,worn,-.24,.28,0,{vert:true}),bx(.035,.55,.035,worn,.24,.28,0,{vert:true}),bx(.54,.08,.03,worn,0,.56,0),bx(.5,.03,.03,worn,0,.1,0));for(let i=0;i<6;i++)back.add(mk(new THREE.CylinderGeometry(.011,.011,.46,8),worn,-.2+i*.08,.3,0));pv.add(back)
  const dg=buildDoll(1.5);dg.position.set(0,.47,.02);pv.add(dg);ref.doll={g:dg,head:dg.userData.head};ref.chair={yaw,pv}
  interact(yaw,'chair');interact(dg,'doll');add(yaw);solid(2.25,3.05,-0.90,-0.10)
  anim((t)=>{const a=ref.chairRock??1;pv.rotation.x=Math.sin(t*1.9)*.09*a+Math.sin(t*.7)*.01})}

 // 8. South Wall Bookcase / Cabinet (GLB (-0.60, 0, 2.66)) — keeps row of visible antique books on top
 {const g=grp(-0.60,0,2.66,Math.PI),br=wm('ebony',{r:.6})
  const vis=new THREE.Group()
  vis.add(bx(.04,1.15,.34,br,-.6,.575,0),bx(.04,1.15,.34,br,.6,.575,0),bx(1.28,.05,.36,br,0,1.16,0),bx(1.2,1.1,.02,wm('dark'),0,.575,-.16),bx(1.2,.12,.34,br,0,.06,0))
  vis.add(bx(1.16,.028,.32,wm('worn'),0,.58,0))
  g.add(trackVisual(vis))
  // Keep antique books & skull visible resting cleanly on top of the GLB South cabinet (Y = 1.16)
  const cols=['red','green','blue','dark'],r=X.rng(4)
  let x=-.55;while(x<.5){const w=.025+r()*.035,h=.17+r()*.1,lean=r()<.1,col=cols[Math.floor(r()*4)];const bkMesh=bx(w,h,.2,mat({map:TX.leather(col),r:.65}),x+w/2,1.16+h/2,0);if(lean){bkMesh.rotation.z=.25;bkMesh.position.y-=.01}g.add(bkMesh);x+=w+.002}
  const sk=buildSkull(1);sk.position.set(-.3,1.16,.06);sk.rotation.y=.4;g.add(sk)
  g.add(hitbox(2.5,1.45,0.65,0,0.72,0))
  interact(g,'bookshelf');add(g);solid(-1.88,0.70,2.35,2.95)}

 // 9. East Wall Draped Window (GLB (3.80, 0, 1.65, -Math.PI/2))
 if(win){const wz=win.z,wy0=win.y0,wy1=win.y1,wh=wy1-wy0,fr=wm('dark'),X0=W/2
  const g=grp(X0,0,wz,-Math.PI/2)
  const vis=new THREE.Group()
  vis.add(bx(.12,.08,win.w+.2,fr,.03,wy1+.04,0),bx(.12,.08,win.w+.2,fr,.03,wy0-.04,0),bx(.12,wh,.08,fr,.03,(wy0+wy1)/2,-win.w/2-.04),bx(.12,wh,.08,fr,.03,(wy0+wy1)/2,win.w/2+.04))
  vis.add(bx(.04,wh,.04,fr,.04,(wy0+wy1)/2,0),bx(.04,.04,win.w,fr,.04,(wy0+wy1)/2,0),bx(.3,.05,win.w+.35,fr,.12,wy0-.07,0),bx(.18,.2,win.w+.3,fr,.03,wy1+.14,0))
  const cmat=mat({map:TX.curtain(),at:.5,side:THREE.DoubleSide,r:1});[-1,1].forEach(s=>{const geo=curtainGeo(.62,1.85),m=new THREE.Mesh(geo,cmat);m.position.set(-.18,2.42-.925,s*(win.w/2+.02));m.rotation.y=-Math.PI/2;m.castShadow=false;m.receiveShadow=true;vis.add(m)})
  g.add(trackVisual(vis))
  g.add(hitbox(2.3,2.1,0.6,0,1.5,0))
  interact(g,'window');add(g)}

 // 10. Bedroom Exit Door (hinged door at (2.45, 0, 2.88, Math.PI) + GLB South-West door hitbox at (-3.82, 0, 2.05))
 {const g=grp(2.45,0,2.88,Math.PI),dk=wm('dark')
  g.add(bx(.1,2.2,.07,wm('ebony'),-.5,1.1,0),bx(.1,2.2,.07,wm('ebony'),.5,1.1,0),bx(1.1,.1,.07,wm('ebony'),0,2.2,0))
  const doorHinge=grp(-0.45,0,0),doorLeaf=grp(0.45,0,0)
  doorLeaf.add(bx(.9,2.1,.05,dk,0,1.05,0))
  for(const y of [1.6,.55])for(const x of [-.22,.22])doorLeaf.add(bx(.3,.7,.02,wm('worn'),x,y,.03),bx(.3,.66,.012,dk,x,y,.04))
  doorLeaf.add(mk(new THREE.CylinderGeometry(.06,.06,.012,20),brass,.33,1.05,.04,Math.PI/2,0,0),mk(new THREE.SphereGeometry(.035,16,12),brass,.33,1.05,.075),bx(.1,.025,.005,brass,.33,.92,.036))
  doorLeaf.add(mk(tube([[.28,1.4,.04],[.2,1.36,.05],[.12,1.4,.04],[.04,1.35,.05]],.007,20,5),brass))
  const boltMat=mat({color:0x1c1a24,m:0.9,r:0.2})
  doorLeaf.add(bx(0.16,0.04,0.03,boltMat,0.4,1.8,0.035),bx(0.16,0.04,0.03,boltMat,0.4,0.35,0.035))
  doorHinge.add(doorLeaf);g.add(doorHinge)
  g.add(hitbox(1.1,2.2,0.35,0,1.1,0))
  interact(g,'room_door');add(g);solid(1.85,3.05,2.68,3.0)
  ref.roomDoor={hinge:doorHinge,isOpen:false,angle:0}
  anim(()=>{if(ref.roomDoor){const targetAngle=ref.roomDoor.isOpen?1.55:0;ref.roomDoor.angle+=(targetAngle-ref.roomDoor.angle)*0.05;ref.roomDoor.hinge.rotation.y=-ref.roomDoor.angle}})
  const ls=mk(new THREE.PlaneGeometry(.88,.012),new THREE.MeshBasicMaterial({color:0xff9a3a,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,fog:false,depthWrite:false}),2.45,.008,2.85,-Math.PI/2,0,0);ls.userData.np=1;S.add(ls)

  // Secondary raycast hitbox aligned to the GLB's South-West door leaf
  const swDoor=grp(-3.82,0,2.05)
  swDoor.add(hitbox(0.45,2.2,1.25,0,1.1,0))
  interact(swDoor,'room_door');add(swDoor)
 }

 buildDecor(E)

 // Load the abandoned_mansion_bedroom.glb shell asynchronously and replace procedural walls/furniture visuals
 if(typeof window!=='undefined'&&window.location?.protocol?.startsWith('http')){
  const shellUrl='/assets/models/bedroom/abandoned_mansion_bedroom.glb'
  const onShellLoaded=(gltf)=>{
   if(!gltf?.scene)return
   const model=gltf.scene
   model.name='abandoned_mansion_bedroom_shell'
   model.updateMatrixWorld(true)
   const box=new THREE.Box3().setFromObject(model)
   const c=box.getCenter(new THREE.Vector3())
   model.position.set(-(c.x+0.72),-box.min.y,-(c.z+1.315))
   const shellRoot=new THREE.Group()
   shellRoot.name='abandoned_mansion_bedroom_root'
   shellRoot.add(model)
   shellRoot.scale.set(W/8.42,H/2.46,D/6.07)
   shellRoot.traverse((o)=>{
    if(!o.isMesh)return
    o.userData.np=1
    o.castShadow=true
    o.receiveShadow=true
    const mats=Array.isArray(o.material)?o.material:[o.material]
    mats.forEach((m)=>{
     if(!m)return
     m.side=THREE.DoubleSide
     m.needsUpdate=true
    })
   })
   S.add(shellRoot)
   procShell.forEach((m)=>{m.visible=false;m.userData.np=1})
   procFurnitureVisuals.forEach((obj)=>{
    obj.traverse((o)=>{
     if(o.isMesh&&!o.userData._isHitbox){o.visible=false;o.userData.np=1}
    })
   })
   E?.bakeShadows?.()
  }
  if(typeof E.loadGLB==='function'){
   E.loadGLB(shellUrl).then(onShellLoaded).catch((err)=>console.warn('[BEDROOM SHELL GLB FALLBACK ACTIVE]',err))
  }else{
   try{
    const loader=new GLTFLoader()
    if(typeof MeshoptDecoder!=='undefined')loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(shellUrl,onShellLoaded,undefined,(err)=>console.warn('[BEDROOM SHELL GLB FALLBACK ACTIVE]',err))
   }catch(err){
    console.warn('[BEDROOM SHELL GLB FALLBACK ACTIVE]',err)
   }
  }
 }
}

export function buildDoll(s=1){const g=new THREE.Group(),sk=mat({map:TX.doll(),r:.35}),dress=mat({map:TX.sheet(),c:0xe0cfd4,r:.9,side:2})
 g.add(mk(lathe([[0,0],[.1,0],[.13,.04],[.1,.1],[.05,.16],[.035,.22],[.05,.26],[0,.27]],24),dress,0,0,0))
 g.add(mk(new THREE.TorusGeometry(.11,.012,8,28),dress,0,.035,0,Math.PI/2,0,0))
 ;[-1,1].forEach(a=>{g.add(mk(new THREE.CylinderGeometry(.015,.013,.17,8),mat({color:0xdccfc4,r:.4}),a*.04,.1,.12,Math.PI/2.4,0,0),mk(new THREE.SphereGeometry(.022,10,8),mat({color:0x151015,r:.5}),a*.04,.04,.2),mk(new THREE.CylinderGeometry(.012,.01,.13,8),mat({color:0xdccfc4,r:.4}),a*.085,.19,.05,.5,0,a*.5))})
 const head=new THREE.Group();head.position.set(0,.31,0);const hs=mk(new THREE.SphereGeometry(.06,32,24),sk,0,.03,0);head.add(hs)
 head.add(mk(new THREE.SphereGeometry(.064,32,20,Math.PI/2+.85,Math.PI*2-1.7,0,Math.PI*.78),mat({map:TX.hair(),r:.9,side:2}),0,.035,-.002))
 const fr=mk(new THREE.TorusGeometry(.058,.009,6,18,Math.PI),mat({map:TX.hair(),r:.9}),0,.065,.005,0,0,0);fr.rotation.set(.1,0,0);head.add(fr)
 g.add(head);g.userData.head=head;g.scale.setScalar(s);return g}
export function buildSkull(s=1){const g=new THREE.Group(),bm=mat({map:TX.bone(),r:.6,bump:TX.bone(),bs:.8}),dk=mat({color:0x050404,r:1})
 const cr=mk(new THREE.SphereGeometry(.07,28,22),bm,0,.08,0);cr.scale.set(1,1.02,1.1);g.add(cr)
 ;[-1,1].forEach(a=>{g.add(mk(new THREE.SphereGeometry(.022,14,10),dk,a*.03,.075,.058),mk(new THREE.SphereGeometry(.02,12,8),bm,a*.05,.05,.045))})
 g.add(mk(new THREE.ConeGeometry(.012,.03,3),dk,0,.05,.075,0,0,Math.PI),bx(.07,.035,.07,bm,0,.015,.04,{s:6}),bx(.075,.03,.075,bm,0,-.01,.03,{s:6}))
 for(let i=0;i<6;i++)g.add(bx(.008,.014,.008,mat({color:0xd8d0bc,r:.5}),-.03+i*.012,.0,.073,{s:4}))
 g.scale.setScalar(s);return g}
const _pt={};export function pumpkinMesh(r,kind=0){const f=X.pumpkinFace(kind),tt=_pt[kind]||(_pt[kind]={map:X.tex(f.map),emi:X.tex(f.emi)}),map=tt.map,emi=tt.emi;const m=mat({map,bump:map,bs:.8,r:.6,em:emi,e:0xffffff,ei:1.6}),g=new THREE.Group()
 const body=new THREE.Mesh(pumpkinGeo(r,.82),m);g.add(body);const st=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.01,.05,0),new THREE.Vector3(.04,.1,.01),new THREE.Vector3(.07,.12,0)]),12,.14*r,8),mat({map:TX.wood('worn'),c:0x6a7a3a,r:.8}))
 st.scale.setScalar(r*3.2);st.position.set(-.02,r*.82-.03*r,0);g.add(st);g.userData.mat=m;g.userData.body=body;return g}

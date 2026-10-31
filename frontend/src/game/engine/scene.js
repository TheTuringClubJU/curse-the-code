// Haunted bedroom: furniture + structure props. Everything is built from shaped primitives with procedural textures.
import {THREE,X,TX,RoundedBoxGeometry,mat,wm,lathe,bgeo,drapeGeo,curtainGeo,tube,rep,pumpkinGeo} from './kit.js'
import {Reflector} from 'three/examples/jsm/objects/Reflector.js'
import {buildDecor} from './decor.js'
export const mk=(geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);return o}
export const grp=(x=0,y=0,z=0,ry=0)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;return g}
const bx=(w,h,d,m,x,y,z,o={})=>{const q=mk(bgeo(w,h,d,o.s??1.4,o.vert),m,x,y,z,o.rx||0,o.ry||0,o.rz||0);return q}
const rb=(w,h,d,r,m,x,y,z,seg=3)=>mk(new RoundedBoxGeometry(w,h,d,seg,r),m,x,y,z)
export function buildBedroom(E){
 const {S,add,solid,anim,glow,lamp,interact,cam,W,H,D,win,ref}=E
 const dark=wm('dark'),worn=wm('worn'),ebony=wm('ebony'),brass=mat({map:TX.brass(),m:.85,r:.4,c:0xd8b070}),gold=mat({map:TX.metal(),m:.7,r:.45,c:0xe0b878})
 const post=(g,x,z,h)=>{const L=lathe([[.0,0],[.05,0],[.052,.08],[.034,.13],[.04,.24],[.056,.34],[.034,.43],[.034,h-.2],[.052,h-.12],[.06,h-.06],[.034,h-.02],[.0,h]]);const m=mk(L,dark,x,0,z);g.add(m);g.add(mk(new THREE.SphereGeometry(.05,16,12),dark,x,h+.03,z))}
 {const g=grp(-0.8,0,-1.6)
  g.add(bx(.07,.22,2.7,dark,-.97,.36,0),bx(.07,.22,2.7,dark,.97,.36,0),bx(1.94,.2,.07,dark,0,.36,1.37),bx(1.94,.2,.07,dark,0,.36,-1.37))
  post(g,-.97,-1.37,1.55);post(g,.97,-1.37,1.55);post(g,-.97,1.37,1.02);post(g,.97,1.37,1.02)
  const sh=new THREE.Shape();sh.moveTo(-.9,0);sh.lineTo(.9,0);sh.lineTo(.9,.62);sh.bezierCurveTo(.9,.82,.45,.9,0,.98);sh.bezierCurveTo(-.45,.9,-.9,.82,-.9,.62);sh.closePath()
  const hb=mk(new THREE.ExtrudeGeometry(sh,{depth:.05,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2}),dark,0,.5,-1.4);g.add(hb)
  const sh2=new THREE.Shape();sh2.moveTo(-.7,0);sh2.lineTo(.7,0);sh2.lineTo(.7,.5);sh2.bezierCurveTo(.7,.64,.34,.7,0,.74);sh2.bezierCurveTo(-.34,.7,-.7,.64,-.7,.5);sh2.closePath()
  g.add(mk(new THREE.ExtrudeGeometry(sh2,{depth:.02,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2}),ebony,0,.62,-1.36))
  g.add(bx(1.88,.34,.05,dark,0,.64,1.4),bx(1.9,.05,.08,ebony,0,.83,1.4))
  g.add(rb(1.84,.21,2.64,.06,mat({map:TX.sheet2(),r:.95}),0,.58,0))
  const bl=mk(drapeGeo(1.84,1.95,.38,3),mat({map:TX.quilt(),r:.98,side:THREE.DoubleSide}),0,.7,.42);g.add(bl)
  ;[[-.32,-1.08,.08],[.34,-1.05,-.1]].forEach(p=>{const pl=rb(.6,.17,.4,.07,mat({map:TX.sheet(),r:.95}),p[0],.78,p[1],5);pl.rotation.y=p[2];pl.scale.set(1,.9,1);g.add(pl)})
  interact(g,'bed');add(g);solid(-1.85,.25,-3,-.12)
  // diary (interactive) - open book on blanket
  const dg=grp(0,.745,.82,.2),lc=mat({map:TX.leather('red'),r:.7}),L=X.tex(X.paperPage(['Dad has been sleeping at his desk.'],'Test day 1')),R2=X.tex(X.paperPage(['Rex turned 5 today. This is test page two.'],'Test day 2'))
  dg.add(rb(.5,.03,.34,.006,lc,0,0,0,2),mk(new THREE.BoxGeometry(.012,.034,.34),mat({map:TX.leather('red'),r:.6}),0,.003,0))
  ;[[-1,L],[1,R2]].forEach(([s,t])=>{const p=mk(new THREE.PlaneGeometry(.225,.315),mat({map:t,r:.95}),s*.118,.0285,0,-Math.PI/2,0,-s*.05);dg.add(p);dg.add(mk(new THREE.BoxGeometry(.225,.014,.315),mat({color:0xcfc4a6,r:1}),s*.118,.02,0,0,0,-s*.05))})
  dg.add(mk(new THREE.BoxGeometry(.012,.002,.3),mat({color:0x7a1212,r:.6}),.01,.034,.02));interact(dg,'diary');add(dg,{parent:null});dg.position.set(-0.8+Math.sin(0)*0,.745+.0,-1.6+.82);dg.rotation.y=.2}
 {const g=grp(-2.7,0,-2.65)
  ;[[-.28,-.19],[.28,-.19],[-.28,.19],[.28,.19]].forEach(p=>g.add(bx(.05,.14,.05,dark,p[0],.07,p[1],{vert:true})))
  g.add(bx(.6,.5,.42,worn,0,.39,0),bx(.68,.04,.5,dark,0,.66,0),bx(.52,.17,.02,dark,0,.52,.215),bx(.52,.21,.02,dark,0,.27+.0,.215),mk(new THREE.SphereGeometry(.02,12,8),brass,0,.52,.24),mk(new THREE.SphereGeometry(.02,12,8),brass,0,.28,.24))
  g.add(mk(new THREE.CircleGeometry(.2,24),mat({color:0xbfb6a0,r:1}),-.05,.683,.0,-Math.PI/2,0,0))
  interact(g,'nightstand');add(g);solid(-3.05,-2.35,-2.9,-2.4)
  // music box
  const mb=grp(-2.7,.68,-2.65,.12),bw=mat({map:TX.wood('ebony'),bump:TX.wood('ebony'),bs:.5,r:.5,c:0x9a7060})
  mb.add(rb(.3,.1,.2,.012,bw,0,.05,0,3),bx(.31,.012,.21,gold,0,.099,0),bx(.31,.012,.21,gold,0,.004,0))
  mb.add(mk(new THREE.PlaneGeometry(.27,.17),mat({color:0x5a0f1a,r:1}),0,.1005,0,-Math.PI/2,0,0))
  const lid=grp(0,.1,-.1);lid.add(rb(.3,.022,.2,.008,bw,0,0,.1,2),bx(.31,.01,.21,gold,0,.012,.1));lid.rotation.x=-1.75;mb.add(lid)
  mb.add(mk(new THREE.CylinderGeometry(.045,.05,.022,20),brass,.0,.112,.0),bx(.15,.006,.012,gold,-.05,.108,.06))
  const bl=grp(0,.125,0);bl.add(mk(new THREE.CylinderGeometry(.006,.006,.05,8),brass,0,.025,0));const bd=lathe([[.0,0],[.018,.02],[.01,.07],[.012,.1],[0,.11]],12);bl.add(mk(bd,mat({color:0xe6dccd,r:.35}),0,.01,0))
  bl.add(mk(new THREE.SphereGeometry(.013,12,10),mat({map:TX.doll(),r:.3}),0,.125,0,0,Math.PI*.5,0))
  const tu=mk(new THREE.ConeGeometry(.045,.025,18,1,true),mat({color:0xe2b7c6,r:.8,side:THREE.DoubleSide}),0,.075,0);bl.add(tu)
  ;[-1,1].forEach(s=>bl.add(mk(new THREE.CylinderGeometry(.003,.003,.05,6),mat({color:0xe6dccd}),s*.022,.1,0,0,0,s*.9)));mb.add(bl);interact(mb,'musicbox');add(mb);anim((t)=>{bl.rotation.y=t*.45})
  // candle
  const cg=grp(-2.93,.68,-2.55);cg.add(mk(lathe([[0,0],[.05,0],[.05,.012],[.02,.03],[.016,.05],[.03,.056],[0,.056]],16),brass,0,0,0))
  const wax=mat({color:0xd8cfb8,r:.55,e:0x201408,ei:.3});cg.add(mk(new THREE.CylinderGeometry(.017,.019,.17,16),wax,0,.14,0),mk(new THREE.CylinderGeometry(.022,.02,.02,16),wax,0,.065,0))
  for(let i=0;i<4;i++)cg.add(mk(new THREE.CylinderGeometry(.0055,.007,.05+i*.015,8),wax,Math.cos(i*1.7)*.018,.16-i*.015,Math.sin(i*1.7)*.018))
  const fl=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.flame(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));fl.position.set(0,.29,0);fl.userData.np=1;cg.add(fl)
  const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow('w'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false,opacity:.7}));gl.scale.set(.5,.5,1);gl.position.set(0,.3,0);gl.userData.np=1;cg.add(gl)
  interact(cg,'candle');add(cg);const pl=new THREE.PointLight(0xffa850,1.3,3.2,2);pl.position.set(-2.93,.99,-2.55);S.add(pl);E.lightRig(pl,1.3,E.flick(2,.25));anim(t=>{const f=E.flick(2,.3)(t);fl.scale.set(.05*(.9+.2*f),.11*(.85+.3*f),1);gl.material.opacity=.45*f*E.lightScale()})
  // photo frame
  const pf=grp(-2.46,.68,-2.8,-.25);pf.add(bx(.14,.19,.02,gold,0,.1,0),mk(new THREE.PlaneGeometry(.1,.15),mat({map:TX.photo(0),r:.5}),0,.1,.0125));pf.add(bx(.03,.12,.01,dark,0,.07,-.02,{rx:0}));pf.rotation.x=-.15;interact(pf,'photo_frame');add(pf)}
 {const g=grp(2.7,0,-2.6)
  g.add(bx(1.8,.06,.8,worn,0,.75,0),bx(1.84,.025,.84,dark,0,.725,0))
  ;[[-.82,-.34],[-.82,.34],[.82,-.34],[.82,.34]].forEach(p=>{g.add(mk(lathe([[0,0],[.04,0],[.045,.1],[.03,.2],[.04,.4],[.05,.5],[.035,.6],[.04,.7],[0,.7]],14),dark,p[0],0,p[1]))})
  g.add(bx(.5,.54,.72,worn,.52,.44,0));[0,1,2].forEach(i=>{g.add(bx(.44,.15,.02,dark,.52,.62-i*.17,.37),mk(new THREE.SphereGeometry(.016,10,8),brass,.52,.62-i*.17,.395))})
  g.add(bx(1.2,.5,.02,dark,-.2,.46,-.36));interact(g,'desk');add(g);solid(1.75,3.65,-3,-2.2)
  // lamp
  const lg=grp(3.1,.78,-2.5);lg.add(mk(lathe([[0,0],[.08,0],[.08,.02],[.03,.05],[.02,.2],[.025,.3],[.015,.36],[0,.37]],20),mat({color:0x1a1a1e,m:.7,r:.35}),0,0,0))
  const shade=mk(new THREE.CylinderGeometry(.1,.17,.2,28,1,true),mat({map:TX.shade(),side:THREE.DoubleSide,e:0xffc67a,ei:.9,r:.9}),0,.44,0);lg.add(shade);E.lampMats.push(shade.material)
  lg.add(mk(new THREE.SphereGeometry(.035,12,10),new THREE.MeshBasicMaterial({color:0xfff0c8}),0,.44,0))
  const lh=new THREE.Sprite(new THREE.SpriteMaterial({map:TX.glow('w'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false,opacity:.55}));lh.scale.set(1.3,1.3,1);lh.position.set(0,.45,0);lh.userData.np=1;lg.add(lh);E.lampGlow=lh;interact(lg,'lamp');add(lg)
  // desk clutter
  const bk=(w,h,d,c,x,y,z,ry)=>{const m=rb(w,h,d,.008,mat({map:TX.leather(c),r:.7}),x,y,z,2);m.rotation.y=ry;return m}
  const cl=grp(2.15,.78,-2.5);cl.add(bk(.26,.04,.19,'red',0,.02,0,.1),bk(.24,.035,.17,'green',0,.0575,0,-.15),bk(.22,.04,.16,'blue',0,.095,.0,.3),bk(.2,.03,.15,'dark',0,.13,0,-.05))
  const ink=grp(2.5,.78,-2.3);ink.add(mk(lathe([[0,0],[.035,0],[.035,.04],[.015,.055],[.015,.065],[0,.065]],16),mat({color:0x0a0a14,r:.1,m:.3}),0,0,0));const qu=mk(tube([[.0,.06,0],[.04,.16,.03],[.09,.2,.07]],.003,8,5),mat({color:0xe8e0d0,r:.8}),0,0,0);ink.add(qu)
  const pp=grp(3.1,.785,-2.15),ptx=X.tex(X.paperPage(['...'],''));for(let i=0;i<3;i++)pp.add(mk(new THREE.PlaneGeometry(.22,.3),mat({map:ptx,r:1,side:2}),i*.03,i*.0015,i*.02,-Math.PI/2,0,i*.5-.4))
  interact(cl,'notebook');add(cl);add(ink);add(pp)
  // chair
  const ch=grp(2.45,0,-1.7,Math.PI-.55)
  ;[[-.19,-.19],[.19,-.19],[-.19,.19],[.19,.19]].forEach(p=>ch.add(bx(.04,.46,.04,worn,p[0],.23,p[1],{vert:true})))
  ch.add(bx(.44,.045,.44,worn,0,.47,0),bx(.04,.5,.04,worn,-.19,.72,-.19,{vert:true}),bx(.04,.5,.04,worn,.19,.72,-.19,{vert:true}),bx(.42,.08,.03,worn,0,.93,-.19))
  for(let i=0;i<5;i++)ch.add(mk(new THREE.CylinderGeometry(.012,.012,.38,8),worn,-.13+i*.065,.72,-.19));interact(ch,'chair');add(ch);solid(2.15,2.75,-2.0,-1.4)}
 {const g=grp(3.55,0,-0.2),dk=wm('ebony',{r:.6}),inner=new THREE.MeshStandardMaterial({color:0x020103,roughness:1,side:THREE.BackSide})
  g.add(bx(.03,2.1,1.4,dk,.38,1.15,0),bx(.8,2.1,.03,dk,0,1.15,.685),bx(.8,2.1,.03,dk,0,1.15,-.685),bx(.84,.08,1.46,dk,0,2.2,0),bx(.9,.12,1.52,dk,-.02,2.3,0),bx(.84,.14,1.46,dk,0,.07,0),bx(.78,.04,1.4,dk,0,.16,0))
  g.add(mk(new THREE.BoxGeometry(.76,2.0,1.36),inner,0,1.16,0))
  g.add(mk(new THREE.CylinderGeometry(.012,.012,1.34,8),brass,0,1.95,0,Math.PI/2,0,0))
  const coats=[];for(let i=0;i<6;i++){const c=bx(.06,.95+(i%3)*.12,.3,mat({color:[0x120f16,0x1a1218,0x0e1118][i%3],r:1}),0,1.45-(i%3)*.06,-.5+i*.2);g.add(c);coats.push(c)}
  anim(t=>coats.forEach((c,i)=>c.rotation.x=Math.sin(t*.6+i)*.02))
  const door=(side)=>{const p=grp(-.38,0,.69*side);const m=grp(0,0,-.335*side);m.add(bx(.035,2.0,.67,dk,0,1.1,0),bx(.02,.8,.46,wm('dark'),-.02,.7,0),bx(.02,.62,.46,wm('dark'),-.02,1.62,0),mk(new THREE.SphereGeometry(.022,12,10),brass,-.045,1.05,-.28*side));p.add(m);g.add(p);return p}
  const dr=door(1),dl=door(-1);dr.rotation.y=.16;ref.wardrobe={doorR:dr,doorL:dl,pos:new THREE.Vector3(3.2,1.2,-.2)}
  const ff=mk(new THREE.PlaneGeometry(.7,.9),new THREE.MeshBasicMaterial({map:X.tex(X.faceC({glow:true,eye:'#ff2a1a',seed:7}),{}),transparent:true,fog:false,depthWrite:false}),-.3,1.25,.12,0,-Math.PI/2,0);ff.visible=false;ff.userData.np=1;g.add(ff);ref.wardrobe.face=ff;interact(g,'wardrobe');add(g);solid(3.1,4,-.95,.55)}
 {const g=grp(-0.8,0,-0.05,0),lt=mat({map:TX.leather('dark'),r:.6,c:0xb09080});g.add(bx(.8,.025,.55,lt,0,.0125,0),bx(.8,.2,.025,lt,0,.12,.2625),bx(.8,.2,.025,lt,0,.12,-.2625),bx(.025,.2,.55,lt,-.3875,.12,0),bx(.025,.2,.55,lt,.3875,.12,0))
  g.add(mk(new THREE.PlaneGeometry(.75,.5),mat({color:0x3a1020,r:1}),0,.03,0,-Math.PI/2,0,0))
  const cw=mat({map:TX.sheet2(),bump:TX.sheet2(),bs:2,r:1,c:0x4a5578}),cw2=mat({map:TX.sheet(),bump:TX.sheet(),bs:2,r:1,c:0x6a4552});g.add(rb(.5,.07,.38,.03,cw,-.1,.07,.0,4),rb(.46,.06,.34,.03,cw2,-.08,.135,.01,4));const ro=rb(.4,.07,.32,.03,mat({map:TX.quilt(),r:1}),.1,.19,.0,4);ro.rotation.y=.2;g.add(ro)
  g.add(mk(tube([[.15,.2,.1],[.3,.15,.22],[.34,.08,.36],[.36,.03,.46]],.032,16,8),cw2));g.add(mk(tube([[-.2,.15,-.1],[-.34,.12,-.1],[-.5,.02,-.05]],.028,12,8),cw))
  const lidp=grp(0,.22,-.2625);lidp.add(bx(.8,.03,.55,lt,0,0,.275),bx(.8,.02,.025,lt,0,-.01,.55),bx(.025,.02,.55,lt,-.3875,-.01,.275),bx(.025,.02,.55,lt,.3875,-.01,.275),mk(new THREE.PlaneGeometry(.74,.5),mat({color:0x3a1020,r:1,side:2}),0,-.017,.275,Math.PI/2,0,0))
  lidp.rotation.x=-1.9;g.add(lidp);[-.25,.25].forEach(x=>g.add(bx(.06,.04,.015,brass,x,.18,.275)));interact(g,'trunk');add(g);solid(-1.3,-0.3,-0.35,0.25)}
 {const yaw=grp(-3.1,0,1.2,Math.PI/2),pv=grp(0,0,0,0);yaw.add(pv)
  ;[-1,1].forEach(s=>{const pts=[];for(let i=0;i<=10;i++){const z=-.5+i*.1;pts.push([s*.27,.03+.2*Math.pow(z/.5,2)*.8,z])}pv.add(mk(tube(pts,.016,24,8),worn))
   pv.add(bx(.035,.4,.035,worn,s*.26,.25,.2,{vert:true}),bx(.035,.5,.035,worn,s*.26,.3,-.2,{vert:true}),bx(.03,.2,.03,worn,s*.27,.56,.15,{vert:true}),bx(.04,.03,.44,worn,s*.27,.67,.0))})
  pv.add(bx(.54,.04,.46,dark,0,.45,0),bx(.5,.03,.03,worn,0,.2,.2),bx(.5,.03,.03,worn,0,.2,-.2))
  const back=grp(0,.46,-.22);back.rotation.x=-.14;back.add(bx(.035,.55,.035,worn,-.24,.28,0,{vert:true}),bx(.035,.55,.035,worn,.24,.28,0,{vert:true}),bx(.54,.08,.03,worn,0,.56,0),bx(.5,.03,.03,worn,0,.1,0));for(let i=0;i<6;i++)back.add(mk(new THREE.CylinderGeometry(.011,.011,.46,8),worn,-.2+i*.08,.3,0));pv.add(back)
  const dg=buildDoll(1.5);dg.position.set(0,.47,.02);pv.add(dg);ref.doll={g:dg,head:dg.userData.head};ref.chair={yaw,pv};interact(dg,'doll');add(yaw);solid(-3.5,-2.7,.85,1.55);anim((t)=>{const a=ref.chairRock??1;pv.rotation.x=Math.sin(t*1.9)*.09*a+Math.sin(t*.7)*.01})}
 {const g=grp(-2.3,0,2.8,Math.PI),br=wm('ebony',{r:.6})
  g.add(bx(.04,1.95,.34,br,-.6,.975,0),bx(.04,1.95,.34,br,.6,.975,0),bx(1.28,.05,.36,br,0,1.97,0),bx(1.2,1.9,.02,wm('dark'),0,.975,-.16),bx(1.2,.12,.34,br,0,.06,0))
  const ys=[.3,.78,1.26,1.74];ys.forEach(y=>g.add(bx(1.16,.028,.32,wm('worn'),0,y,0)))
  const cols=['red','green','blue','dark'];let x=-.55;const r=X.rng(4)
  for(let row of [0,2]){x=-.55;const base=ys[row]+.014;while(x<.5){const w=.025+r()*.035,h=.17+r()*.1,lean=r()<.1;const b=bx(w,h,.2,mat({map:TX.leather(cols[Math.floor(r()*4)]),r:.65}),x+w/2,base+h/2,.0,{});if(lean){b.rotation.z=.25;b.position.y-=.01}g.add(b);x+=w+.002}}
  const baseY=ys[1]+.014;[-.35,-.05].forEach((jx,i)=>{const jg=grp(jx,baseY,.0);jg.add(mk(new THREE.CylinderGeometry(.075,.075,.2,24),mat({c:0x9ad0a8,t:1,o:.28,r:.05,m:.1,dw:false}),0,.1,0),mk(new THREE.CylinderGeometry(.066,.066,.17,24),mat({c:0x7ab88a,t:1,o:.35,r:.2,e:0x1a4a2a,ei:.5,dw:false}),0,.095,0),mk(new THREE.CylinderGeometry(.078,.078,.025,24),brass,0,.21,0))
   const ey=mk(new THREE.SphereGeometry(.036,20,16),mat({map:TX.eye(),r:.2}),0,.1,0);jg.add(ey);jg.userData.eye=ey;ref.eyes=ref.eyes||[];ref.eyes.push(ey);g.add(jg)})
  const d2=buildDoll(.8);d2.position.set(.3,baseY,0);d2.rotation.y=-.3;g.add(d2);const d3=buildDoll(.65);d3.position.set(.48,baseY,0);d3.rotation.y=.4;d3.rotation.z=.12;g.add(d3)
  const sk=buildSkull(1);sk.position.set(-.3,ys[3]+.014,0);sk.rotation.y=.4;g.add(sk)
  const pk=pumpkinMesh(.07,2);pk.position.set(.15,ys[3]+.014+.05,0);g.add(pk);glow(pk.userData.mat,1.3)
  add(g);solid(-2.95,-1.65,2.6,3)}
 if(win){const wz=win.z,wy0=win.y0,wy1=win.y1,wh=wy1-wy0,fr=wm('dark'),X0=-W/2
  const g=grp(X0,0,wz);g.add(bx(.12,.08,win.w+.2,fr,.03,wy1+.04,0),bx(.12,.08,win.w+.2,fr,.03,wy0-.04,0),bx(.12,wh,.08,fr,.03,(wy0+wy1)/2,-win.w/2-.04),bx(.12,wh,.08,fr,.03,(wy0+wy1)/2,win.w/2+.04))
  g.add(bx(.04,wh,.04,fr,.04,(wy0+wy1)/2,0),bx(.04,.04,win.w,fr,.04,(wy0+wy1)/2,0),bx(.3,.05,win.w+.35,fr,.12,wy0-.07,0),bx(.18,.2,win.w+.3,fr,.03,wy1+.14,0))
  const cm=new THREE.Mesh(new THREE.PlaneGeometry(win.w,wh),new THREE.MeshBasicMaterial({map:X.tex(X.crackC(512,512,6,{cx:.7,cy:.35,n:12}),{}),transparent:true,opacity:.75,depthWrite:false,fog:false}));cm.rotation.y=Math.PI/2;cm.position.set(.025,(wy0+wy1)/2,0);cm.userData.np=1;cm.userData.ns=1;g.add(cm);add(g)
  const rod=grp(X0+.14,0,wz);rod.add(mk(new THREE.CylinderGeometry(.015,.015,win.w+.9,10),brass,0,2.46,0,Math.PI/2,0,0),mk(new THREE.SphereGeometry(.03,12,10),brass,0,2.46,-(win.w+.9)/2),mk(new THREE.SphereGeometry(.03,12,10),brass,0,2.46,(win.w+.9)/2));add(rod)
  const cmat=mat({map:TX.curtain(),at:.5,side:THREE.DoubleSide,r:1}),cur=[];[-1,1].forEach(s=>{const geo=curtainGeo(.62,1.85),m=new THREE.Mesh(geo,cmat);m.position.set(X0+.2,2.42-.925,wz+s*(win.w/2+.02));m.rotation.y=Math.PI/2;m.castShadow=false;m.receiveShadow=true;m.userData.np=1;S.add(m);cur.push([m,geo,s])})
  anim(t=>cur.forEach(([m,geo,s],k)=>{const b=geo.userData.base,p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=b[i*3],y=b[i*3+1],h=(.925-y)/1.85;p.setZ(i,Math.sin(x*18+k)*.03+Math.sin(y*3+t*1.3+k*2)*.03*h+Math.sin(t*.8+x*4)*.015*h)};p.needsUpdate=true;geo.computeVertexNormals()}))}
 {const g=grp(3,0,2.965,Math.PI),dk=wm('dark');g.add(bx(.9,2.1,.05,dk,0,1.05,0),bx(.1,2.2,.07,wm('ebony'),-.5,1.1,0),bx(.1,2.2,.07,wm('ebony'),.5,1.1,0),bx(1.1,.1,.07,wm('ebony'),0,2.2,0))
  ;[[.55,1.55],[.55,.5],[-.5,1.55]].forEach(()=>0);for(const y of [1.6,.55])for(const x of [-.22,.22])g.add(bx(.3,.7-.0,.02,wm('worn'),x,y,.03),bx(.3,.66,.012,dk,x,y,.04))
  g.add(mk(new THREE.CylinderGeometry(.06,.06,.012,20),brass,.33,1.05,.04,Math.PI/2,0,0),mk(new THREE.SphereGeometry(.035,16,12),brass,.33,1.05,.075),bx(.1,.025,.005,brass,.33,.92,.036))
  g.add(mk(tube([[.28,1.4,.04],[.2,1.36,.05],[.12,1.4,.04],[.04,1.35,.05]],.007,20,5),brass));add(g)
  const ls=mk(new THREE.PlaneGeometry(.88,.012),new THREE.MeshBasicMaterial({color:0xff9a3a,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,fog:false,depthWrite:false}),3,.008,2.93,-Math.PI/2,0,0);ls.userData.np=1;S.add(ls)}
 {const g=grp(-1.0,1.55,2.955,Math.PI);const geo=new THREE.CircleGeometry(1,48);const mr=new Reflector(geo,{color:0x707890,textureWidth:512,textureHeight:512,clipBias:.003});mr.scale.set(.27,.44,1);mr.position.z=.006;mr.userData.np=1;g.add(mr)
  const fr=mk(new THREE.TorusGeometry(1,.1,12,56),gold,0,0,.02);fr.scale.set(.31,.48,.35);g.add(fr);const fr2=mk(new THREE.TorusGeometry(1,.05,10,56),mat({map:TX.wood('ebony'),r:.6}),0,0,.01);fr2.scale.set(.285,.455,.3);g.add(fr2)
  const cr=new THREE.Mesh(new THREE.PlaneGeometry(.56,.9),new THREE.MeshBasicMaterial({map:X.tex(X.crackC(512,512,2,{cx:.4,cy:.45,n:16}),{}),transparent:true,opacity:.85,depthWrite:false,fog:false}));cr.scale.set(.95,.95,1);cr.position.z=.012;cr.userData.np=1;g.add(cr)
  const dt=new THREE.Mesh(new THREE.PlaneGeometry(.55,.88),new THREE.MeshBasicMaterial({map:X.tex(X.mirrorDirt(),{}),transparent:true,depthWrite:false,fog:false}));dt.position.z=.011;dt.userData.np=1;g.add(dt);add(g,{noShadow:true})}
 buildDecor(E)
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








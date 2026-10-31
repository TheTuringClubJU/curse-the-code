// Shared helpers: cached textures, materials, custom geometry builders.
import * as THREE from 'three'
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as X from './tex.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
export {THREE,X,RoundedBoxGeometry,BufferGeometryUtils}
const C={},get=(k,f)=>C[k]||(C[k]=f())
export const rep=(t,x,y)=>{const c=t.clone();c.repeat.set(x,y);c.needsUpdate=true;return c}
export const TX={
 wood:k=>get('w'+k,()=>{const p={dark:[[104,62,38],[34,19,12],1],worn:[[138,96,62],[62,42,27],2],ebony:[[64,42,31],[22,13,10],3]}[k];return X.tex(X.woodC(p[0],p[1],p[2]))}),
 quilt:()=>get('q',()=>X.tex(X.quilt(),{repeat:[2,2]})),
 sheet:()=>get('s',()=>X.tex(X.sheet())),sheet2:()=>get('s2',()=>X.tex(X.sheet(8,[186,180,196]))),
 curtain:()=>get('c',()=>X.tex(X.curtain())),rug:()=>get('r',()=>X.tex(X.rug())),
 leather:k=>get('l'+k,()=>X.tex(X.leather(k==='red'?[92,34,30]:k==='green'?[34,58,44]:k==='blue'?[36,44,78]:[70,42,28],k.length+3))),
 metal:()=>get('m',()=>X.tex(X.metal())),brass:()=>get('br',()=>X.tex(X.metal([200,160,80],9))),
 portrait:()=>get('p',()=>X.tex(X.portrait())),photo:i=>get('ph'+i,()=>X.tex(X.familyPhoto(i+1,i!==1))),
 dust:()=>get('d',()=>X.tex(X.radial([[0,'rgba(255,255,255,1)'],[.4,'rgba(255,255,255,.5)'],[1,'rgba(255,255,255,0)']],64))),
 glow:k=>get('g'+k,()=>X.tex(X.radial(k==='o'?[[0,'rgba(255,170,70,.9)'],[.3,'rgba(255,120,30,.35)'],[1,'rgba(255,90,0,0)']]:k==='v'?[[0,'rgba(190,170,255,.9)'],[.3,'rgba(140,110,255,.35)'],[1,'rgba(120,90,255,0)']]:[[0,'rgba(255,220,160,.9)'],[.3,'rgba(255,190,110,.35)'],[1,'rgba(255,170,90,0)']]))),
 flame:()=>get('f',()=>X.tex(X.flameC())),web:()=>get('web',()=>X.tex(X.webC())),bat:()=>get('bat',()=>X.tex(X.batC())),
 bone:()=>get('bone',()=>X.tex(X.pix(128,128,(u,v,o)=>{const n=X.fbm(u,v,8,8,4,2),c=Math.max(0,X.fbm(u,v,4,4,3,5)-.5),k=.55+.6*n-c;o[0]=205*k;o[1]=190*k;o[2]=160*k}))),
 eye:()=>get('eye',()=>X.tex(X.eyeballC())),doll:()=>get('doll',()=>X.tex(X.dollFaceC())),
 hair:()=>get('hair',()=>X.tex(X.pix(128,128,(u,v,o)=>{const n=X.fbm(u,v,40,2,3,3),k=.35+.9*n;o[0]=70*k;o[1]=42*k;o[2]=28*k}))),
 skin:()=>get('skin',()=>X.tex(X.pumpkinSkin())),
 shade:()=>get('sh',()=>X.tex(X.pix(128,128,(u,v,o)=>{const n=X.fbm(u,v,10,6,3,3);o[0]=240*(.7+.3*n);o[1]=210*(.7+.3*n);o[2]=150*(.7+.3*n)}))),
 chalk:()=>get('ch',()=>X.tex(chalkC())),
 clockFace:()=>get('cf',()=>X.tex(clockC()))}
function chalkC(){const S=512,c=X.cv(S,S),g=c.getContext('2d'),r=X.rng(5);g.strokeStyle='rgba(236,232,244,.85)';g.lineCap='round'
 const ring=(R,w)=>{g.lineWidth=w;g.beginPath();for(let i=0;i<=72;i++){const a=i/72*6.283,q=R+(r()-.5)*2.2;i?g.lineTo(S/2+Math.cos(a)*q,S/2+Math.sin(a)*q):g.moveTo(S/2+Math.cos(a)*q,S/2+Math.sin(a)*q)}g.stroke()}
 ring(240,5);ring(228,3);ring(160,3);g.lineWidth=4;g.beginPath();for(let i=0;i<=5;i++){const a=((i*2)%5)/5*6.283-1.5708;const x=S/2+Math.cos(a)*226,y=S/2+Math.sin(a)*226;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()
 for(let i=0;i<24;i++){const a=i/24*6.283,x=S/2+Math.cos(a)*196,y=S/2+Math.sin(a)*196;g.lineWidth=3;g.beginPath();g.moveTo(x,y);g.lineTo(x+(r()-.5)*20,y+(r()-.5)*20);g.lineTo(x+(r()-.5)*20,y+(r()-.5)*20);g.stroke()}
 const im=g.getImageData(0,0,S,S),d=im.data;for(let y=0;y<S;y++)for(let x=0;x<S;x++){const n=X.fbm(x/S,y/S,40,40,3,2);d[(y*S+x)*4+3]*=n>.42?1:.25+n*.5};g.putImageData(im,0,0);return c}
function clockC(){const S=256,c=X.cv(S,S),g=c.getContext('2d');let gr=g.createRadialGradient(128,128,10,128,128,128);gr.addColorStop(0,'#e4dcc6');gr.addColorStop(1,'#a89c82');g.fillStyle=gr;g.fillRect(0,0,S,S)
 g.fillStyle='#1a120e';g.font="bold 26px 'Special Elite',serif";g.textAlign='center';g.textBaseline='middle';const R=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];R.forEach((t,i)=>{const a=i/12*6.283-1.5708;g.fillText(t,128+Math.cos(a)*92,128+Math.sin(a)*92)})
 g.strokeStyle='rgba(30,20,14,.7)';g.lineWidth=2;for(let i=0;i<60;i++){const a=i/60*6.283,l=i%5?4:9;g.beginPath();g.moveTo(128+Math.cos(a)*(122-l),128+Math.sin(a)*(122-l));g.lineTo(128+Math.cos(a)*122,128+Math.sin(a)*122);g.stroke()}
 const im=g.getImageData(0,0,S,S),d=im.data;for(let y=0;y<S;y++)for(let x=0;x<S;x++){const n=X.fbm(x/S,y/S,6,6,4,3),i=(y*S+x)*4,k=.6+.6*n;d[i]*=k;d[i+1]*=k;d[i+2]*=k*.95};g.putImageData(im,0,0)
 g.strokeStyle='rgba(20,14,12,.7)';g.lineWidth=1.5;g.beginPath();g.moveTo(150,40);g.lineTo(142,70);g.lineTo(156,96);g.stroke();return c}
export const mat=(o={})=>{const p={color:o.c??o.color??0xffffff,bumpScale:o.bs??1,roughness:o.r??.85,metalness:o.m??0,emissive:o.e??0x000000,emissiveIntensity:o.ei??1,transparent:!!o.t,opacity:o.o??1,alphaTest:o.at??0,depthWrite:o.dw!==false}
 if(o.map)p.map=o.map;if(o.bump)p.bumpMap=o.bump;if(o.em)p.emissiveMap=o.em;if(o.side!==undefined)p.side=o.side;return new THREE.MeshStandardMaterial(p)}
export const wm=(k,o={})=>{const m=TX.wood(k);return mat({map:m,bump:m,bs:.7,r:.72,...o})}
export const lathe=(pts,seg=24)=>new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg)
export function bgeo(w,h,d,s=1.4,vert=false){const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]]
 for(let f=0;f<6;f++){const side=f<2||f>3;for(let i=0;i<4;i++){const k=f*4+i;let a=uv.getX(k)*dims[f][0]*s,b=uv.getY(k)*dims[f][1]*s;if(vert&&side)uv.setXY(k,b,a);else uv.setXY(k,a,b)}}return g}
export function pumpkinGeo(r=.3,sy=.8){const g=new THREE.SphereGeometry(r,56,40),p=g.attributes.position,uv=g.attributes.uv
 for(let i=0;i<p.count;i++){const u=uv.getX(i);let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const yy=y/r,rib=1+.075*Math.cos(u*6.2832*11)*(1-Math.pow(Math.abs(yy),4));x*=rib;z*=rib;const dip=Math.pow(Math.abs(yy),9)*.24*r;y=(y-Math.sign(yy||1)*dip)*sy;p.setXYZ(i,x,y,z)}
 g.computeVertexNormals();return g}
export function drapeGeo(w,d,hang,seed=1){const g=new THREE.PlaneGeometry(w+2*hang,d+hang,60,60);g.rotateX(-Math.PI/2);const p=g.attributes.position,zl=(d-hang)/2
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),ax=Math.max(0,Math.abs(x)-w/2),az=Math.max(0,z-zl);let y=0,xo=x,zo=z
  if(ax>0){y=-ax;xo=Math.sign(x)*(w/2+ax*.05)};if(az>0){y-=az;zo=zl+az*.05}
  const n=X.fbm(x/w+.5,z/d+.5,5,5,3,seed),k=(ax>0||az>0)?.45:1;y+=(n-.5)*.07*k+Math.sin(x*8+n*4)*.007*k;p.setXYZ(i,xo,y,zo)}
 g.computeVertexNormals();return g}
export function curtainGeo(w,h){const g=new THREE.PlaneGeometry(w,h,22,22);g.userData.base=g.attributes.position.array.slice();return g}
export const tube=(pts,r,seg=24,rs=8)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),seg,r,rs,false)


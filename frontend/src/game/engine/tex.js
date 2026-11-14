// Procedural texture library (canvas based, tileable where noted). No external assets.
import * as THREE from 'three'
export const cv=(w,h)=>{
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const g=c.getContext('2d',{willReadFrequently:true});
 if(g&&!g.fill){
  const noop=()=>{},grad=()=>({addColorStop:noop});
  Object.assign(g,{fill:noop,closePath:noop,save:noop,restore:noop,translate:noop,rotate:noop,scale:noop,ellipse:noop,roundRect:noop,quadraticCurveTo:noop,bezierCurveTo:noop,createLinearGradient:grad,createImageData:(iw,ih)=>({data:new Uint8ClampedArray(iw*ih*4)}),getImageData:(ix,iy,iw,ih)=>({data:new Uint8ClampedArray(iw*ih*4)}),putImageData:noop});
  c.getContext=()=>g;
 }
 return c;
}
const clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x,sm=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t,ss=(a,b,x)=>sm(clamp((x-a)/(b-a)))
const hash=(x,y,s)=>{let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,1442695041))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296}
export function rng(seed){let a=seed|0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
export function vnoise(u,v,fx,fy,s){const x=u*fx,y=v*fy,x0=Math.floor(x),y0=Math.floor(y),tx=sm(x-x0),ty=sm(y-y0)
 const xa=((x0%fx)+fx)%fx,xb=(xa+1)%fx,ya=((y0%fy)+fy)%fy,yb=(ya+1)%fy
 const a=hash(xa,ya,s),b=hash(xb,ya,s),c=hash(xa,yb,s),d=hash(xb,yb,s);return a+(b-a)*tx+(c-a)*ty+(a-b-c+d)*tx*ty}
export function fbm(u,v,fx,fy,oct,s=0){let a=.5,t=0,n=0;for(let o=0;o<oct;o++){t+=a*vnoise(u,v,fx<<o,fy<<o,s+o*17);n+=a;a*=.5}return t/n}
export function pix(w,h,fn){const c=cv(w,h),g=c.getContext('2d'),im=g.createImageData(w,h),d=im.data,o=[0,0,0,255]
 for(let y=0;y<h;y++){const v=y/h;for(let x=0;x<w;x++){o[3]=255;fn(x/w,v,o,x,y);const i=(y*w+x)*4;d[i]=o[0];d[i+1]=o[1];d[i+2]=o[2];d[i+3]=o[3]}}
 g.putImageData(im,0,0);return c}
export function tex(c,{repeat=[1,1],srgb=true}={}){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=8;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t}
const col=(c,k)=>c[k]
// ---------- wood (tileable). Grain runs along u. ----------
export function woodC(base,dark,seed=1,{w=256,h=256,fy=48}={}){const RF=Math.max(4,Math.round(fy*.2))
 return pix(w,h,(u,v,o,x,y)=>{const wp=(fbm(u,v,2,3,3,seed)-.5)*.35,st=fbm(u,v+wp*.2,3,fy,4,seed+3),rg=.5+.5*Math.sin((RF*v+wp*2+fbm(u,v,3,3,2,seed+9)*.8)*Math.PI*2)
  const t=clamp(.28+.55*st+.22*rg-.12+(hash(x,y,seed)-.5)*.06);for(let k=0;k<3;k++)o[k]=mix(dark[k],base[k],t)})}
export function woodBump(seed=1,{w=512,h=512,fy=64}={}){return pix(w,h,(u,v,o)=>{const s=fbm(u,v,3,fy,4,seed+3);const t=255*(.3+.7*s);o[0]=o[1]=o[2]=t})}
// ---------- floor planks (aged, darkened floorboards) ----------
export function floorPlanks(){const W=512,H=512,N=8,cm=cv(W,H),cb=cv(W,H),gm=cm.getContext('2d'),gb=cb.getContext('2d'),im=gm.createImageData(W,H),ib=gb.createImageData(W,H),d=im.data,e=ib.data
 for(let y=0;y<H;y++){const v=y/H,pi=Math.floor(v*N),pv=v*N-pi,off=hash(pi,0,3),tone=.45+.48*hash(pi,1,9);for(let x=0;x<W;x++){const u=x/W,ju=(u+off)%1
  const gr=fbm(u,v,4,96,3,pi+5),ring=.5+.5*Math.sin((v*N*7+gr*3)*6.283),t=clamp(.2+.5*gr+.2*ring)*tone,gap=ss(0,.085,pv)*ss(0,.085,1-pv),jt=ss(0,.016,ju)*ss(0,.016,1-ju),dirt=.56+.5*fbm(u,v,3,3,3,31),k=gap*jt*dirt,i=(y*W+x)*4
  d[i]=(28+(94-28)*t)*k*.9;d[i+1]=(16+(60-16)*t)*k*.88;d[i+2]=(12+(42-12)*t)*k*.86;d[i+3]=255;const hh=255*(.3+.55*t)*gap*jt;e[i]=e[i+1]=e[i+2]=hh;e[i+3]=255}}
 gm.putImageData(im,0,0);gb.putImageData(ib,0,0);return{map:cm,bump:cb}}
// ---------- wallpaper (aged weathered Gothic damask) ----------
export function wallpaper(){const S=512,c=cv(S,S),g=c.getContext('2d');g.fillStyle='#1d1526';g.fillRect(0,0,S,S)
 for(let i=0;i<8;i++){g.fillStyle=i%2?'rgba(95,38,54,.11)':'rgba(6,3,12,.22)';g.fillRect(i*S/8,0,S/8,S)}
 const motif=(cx,cy,sc)=>{g.save();g.translate(cx,cy);g.scale(sc,sc);g.fillStyle='rgba(86,32,52,.32)';g.strokeStyle='rgba(155,115,155,.18)';g.lineWidth=2
  for(let k=0;k<4;k++){g.save();g.rotate(k*Math.PI/2);g.beginPath();g.moveTo(0,-8);g.bezierCurveTo(28,-40,32,-90,0,-124);g.bezierCurveTo(-32,-90,-28,-40,0,-8);g.fill();g.stroke();g.restore()}
  for(let k=0;k<4;k++){g.save();g.rotate(k*Math.PI/2+Math.PI/4);g.beginPath();g.ellipse(0,-64,10,30,0,0,7);g.fill();g.restore()}
  g.beginPath();g.arc(0,0,13,0,7);g.fill();g.stroke();g.restore()}
 ;[[S/2,S/2],[0,0],[S,0],[0,S],[S,S]].forEach(p=>motif(p[0],p[1],.92))
 g.strokeStyle='rgba(140,100,140,.14)';g.lineWidth=2;g.beginPath();g.moveTo(S/2,0);g.lineTo(S,S/2);g.lineTo(S/2,S);g.lineTo(0,S/2);g.closePath();g.stroke()
 const im=g.getImageData(0,0,S,S),d=im.data;for(let y=0;y<S;y++)for(let x=0;x<S;x++){const u=x/S,v=y/S,n=fbm(u,v,6,6,4,5),s=fbm(u,v,2,24,3,8),peel=ss(.71,.79,fbm(u,v,9,9,3,19)),k=.58+.44*n-.22*s,i=(y*S+x)*4
  let R=d[i]*k+(n>.6?12:0),G=d[i+1]*k*.94,B=d[i+2]*k*.9
  R=mix(R,48,peel*.48);G=mix(G,40,peel*.48);B=mix(B,34,peel*.48)
  d[i]=R;d[i+1]=G;d[i+2]=B}
 g.putImageData(im,0,0);return c}
// ---------- decals (transparent, one per wall): natural damp stains, mould, subtle cracks ----------
export function wallDecal(seed,W=512,H=256,{leaks=6,mold=1.2}={}){const r=rng(seed),lx=[];for(let i=0;i<leaks;i++)lx.push(.06+r()*.88)
 const c=pix(W,H,(u,v,o)=>{const bot=ss(.68,1,v),top=1-ss(0,.16,v),edge=Math.max(ss(.88,1,u),1-ss(0,.1,u))
  let lk=0;for(let k=0;k<lx.length;k++){const dx=Math.abs(u-lx[k]+(vnoise(u,v,3,12,seed+k)-.5)*.06),wd=.012+.035*Math.sqrt(v);lk+=(1-ss(0,wd,dx))*Math.pow(1-v,.5)*(.6+.4*vnoise(u,v,2,10,seed))}
  const mt=fbm(u,v,5,3,2,seed+2),mot=Math.max(0,mt-.46)*.55
  const m=ss(.5,.72,fbm(u,v,26,13,3,seed+7))*Math.max(Math.max(bot,top*.9),edge*.85)*mold
  let a=clamp(bot*.6+top*.45+edge*.35+mot+lk*.55+m*.7),R=16+lk*38,G=10+lk*24,B=10+lk*14
  R=mix(R,8,m);G=mix(G,15,m);B=mix(B,8,m);o[0]=R;o[1]=G;o[2]=B;o[3]=a*255})
 const g=c.getContext('2d');g.lineCap='round'
 const crack=(x,y,ang,len,w,depth)=>{if(depth>3||len<8)return;g.beginPath();g.moveTo(x,y);let px=x,py=y,a=ang;const seg=Math.floor(len/9);for(let i=0;i<seg;i++){a+=(r()-.5)*.9;px+=Math.cos(a)*9;py+=Math.sin(a)*9;g.lineTo(px,py);if(r()<.16)crack(px,py,a+(r()<.5?-1:1)*(.5+r()*.7),len*.55,w*.65,depth+1)}
  g.strokeStyle='rgba(6,4,8,.82)';g.lineWidth=w;g.stroke();g.strokeStyle='rgba(160,130,140,.1)';g.lineWidth=w*.5;g.translate(1,1);g.stroke();g.setTransform(1,0,0,1,0,0)}
 for(let i=0;i<4;i++)crack(r()*W,i%2?0:H*.5,Math.PI/2+(r()-.5)*.8,160+r()*160,2.2,0)
 return c}
// ---------- ceiling ----------
export function ceiling(){const W=512,H=384,rs=rng(7),st=[];for(let i=0;i<6;i++)st.push([.12+rs()*.76,.12+rs()*.76,.09+rs()*.12])
 return pix(W,H,(u,v,o)=>{const n=fbm(u,v,8,6,4,3),w2=(fbm(u,v,6,6,2,9)-.5)*.55;let t=.2+.28*n,ring=0,tint=0
  for(const s of st){const d=Math.hypot((u-s[0])*1.33,v-s[1])/s[2]+w2;ring+=Math.exp(-Math.pow((d-1)*5,2));tint+=1-ss(.2,1,d)}
  const edge=Math.max(ss(.85,1,u),1-ss(0,.15,u),ss(.84,1,v),1-ss(0,.16,v)),m=edge>.04?ss(.45,.68,fbm(u,v,22,16,3,12))*edge:0
  let R=52*t*3.1+tint*18-ring*10,G=44*t*3.0+tint*6-ring*10,B=56*t*3.0-tint*8-ring*14
  R=R+(10-R)*m*.85-edge*12;G=G+(16-G)*m*.85-edge*12;B=B+(10-B)*m*.85-edge*12;o[0]=R;o[1]=G;o[2]=B})}
// ---------- fabrics ----------
export function quilt(){const S=256,c=pix(S,S,(u,v,o)=>{const n=fbm(u,v,10,10,3,2),w=.5+.5*Math.sin(u*S*2.2)*Math.sin(v*S*2.2),st=fbm(u,v,3,3,3,77),k=.55+.5*n+.06*w
  o[0]=70*k-(st>.62?18:0);o[1]=40*k-(st>.62?14:0);o[2]=110*k-(st>.62?30:0)})
 const g=c.getContext('2d');g.strokeStyle='rgba(15,8,28,.55)';g.lineWidth=2;for(let i=-8;i<16;i++){g.beginPath();g.moveTo(i*32,0);g.lineTo(i*32+S,S);g.stroke();g.beginPath();g.moveTo(i*32+S,0);g.lineTo(i*32,S);g.stroke()}
 g.strokeStyle='rgba(180,150,230,.10)';g.lineWidth=1;for(let i=-8;i<16;i++){g.beginPath();g.moveTo(i*32+2,0);g.lineTo(i*32+S+2,S);g.stroke()};return c}
export function sheet(seed=3,tint=[196,190,178]){return pix(256,256,(u,v,o)=>{const n=fbm(u,v,6,6,4,seed),f=fbm(u,v,2,18,3,seed+4),k=.6+.4*n-.18*f,y=ss(.55,.75,fbm(u,v,3,3,3,seed+8));o[0]=tint[0]*k+y*22;o[1]=tint[1]*k+y*10;o[2]=tint[2]*k-y*28})}
export function curtain(){return pix(256,256,(u,v,o)=>{const f=.5+.5*Math.sin(u*6.283*7+fbm(u,v,3,6,2,1)*1.5),n=fbm(u,v,8,8,3,6),k=.35+.5*f+.25*n,a=fbm(u,v,4,3,3,9),tat=ss(.86,1,v)*1.4;o[0]=88*k;o[1]=62*k;o[2]=112*k;o[3]=(a+.15<tat*.9+ (v>.97?.2:0)?0:255)})}
export function rug(){const S=384,c=cv(S,S),g=c.getContext('2d');g.fillStyle='#2a0f16';g.fillRect(0,0,S,S);const rings=[[250,'#4a1a22'],[232,'#1f1a3a'],[214,'#6b2a2a'],[190,'#241238'],[150,'#5a2030'],[120,'#2a1844']]
 rings.forEach(r=>{g.fillStyle=r[1];g.beginPath();g.arc(S/2,S/2,r[0],0,7);g.fill()});g.strokeStyle='rgba(215,170,110,.55)';g.lineWidth=3
 for(let k=0;k<32;k++){g.save();g.translate(S/2,S/2);g.rotate(k/32*6.283);g.beginPath();g.moveTo(0,-226);g.lineTo(8,-206);g.lineTo(0,-188);g.lineTo(-8,-206);g.closePath();g.stroke();g.restore()}
 for(let k=0;k<12;k++){g.save();g.translate(S/2,S/2);g.rotate(k/12*6.283);g.fillStyle='rgba(215,170,110,.35)';g.beginPath();g.ellipse(0,-92,14,34,0,0,7);g.fill();g.restore()}
 g.strokeStyle='rgba(215,170,110,.6)';g.beginPath();g.arc(S/2,S/2,60,0,7);g.stroke();g.beginPath();g.arc(S/2,S/2,150,0,7);g.stroke()
 const im=g.getImageData(0,0,S,S),d=im.data;for(let y=0;y<S;y++)for(let x=0;x<S;x++){const n=fbm(x/S,y/S,48,48,2,3),b=fbm(x/S,y/S,3,3,3,6),k=.55+.5*n-.3*Math.max(0,b-.5),i=(y*S+x)*4;d[i]*=k;d[i+1]*=k;d[i+2]*=k}g.putImageData(im,0,0);return c}
export function leather(base=[70,40,26],seed=4){return pix(256,256,(u,v,o)=>{const n=fbm(u,v,16,16,3,seed),c=Math.max(0,fbm(u,v,5,5,3,seed+2)-.5),k=.5+.6*n-c*.8;o[0]=base[0]*k*1.4;o[1]=base[1]*k*1.4;o[2]=base[2]*k*1.4})}
export function metal(base=[190,150,70],seed=5){return pix(128,128,(u,v,o)=>{const n=fbm(u,v,8,8,3,seed),p=Math.max(0,fbm(u,v,4,4,3,seed+3)-.55)*2.5,k=.6+.5*n;o[0]=base[0]*k*(1-p*.6);o[1]=base[1]*k*(1-p*.5);o[2]=base[2]*k*(1-p*.2)+p*20})}
// ---------- paper / diary / poster ----------
export function paperPage(lines,label,flip=false){const W=384,H=525,c=pix(W,H,(u,v,o)=>{const n=fbm(u,v,6,8,4,2),e=Math.max(ss(.85,1,u),1-ss(0,.1,u))*.2+Math.max(ss(.92,1,v),1-ss(0,.06,v))*.2,y=ss(.5,.8,fbm(u,v,3,3,3,5)),k=.8+.2*n-e;o[0]=232*k+y*8;o[1]=218*k;o[2]=186*k-y*30})
 const g=c.getContext('2d');g.strokeStyle='rgba(70,60,90,.25)';g.lineWidth=1.5;for(let y=90;y<H-40;y+=26){g.beginPath();g.moveTo(40,y);g.lineTo(W-40,y);g.stroke()}
 g.fillStyle='#2a1c2e';g.font="bold 21px 'Special Elite','Courier New',monospace";g.fillText(label||'',34,58);g.font="17px 'Special Elite','Courier New',monospace"
 const wrap=(t,mx)=>{const w=t.split(' '),ln=[];let cur='';w.forEach(x=>{if((cur+' '+x).length>mx){ln.push(cur);cur=x}else cur=cur?cur+' '+x:x});if(cur)ln.push(cur);return ln}
 ;(lines||[]).forEach((t,i)=>wrap(t,26).forEach((l,j)=>g.fillText(l,34,112+(j+i*0)*26)));return c}
export function posterCanvas(){const c=cv(420,600),g=c.getContext('2d')
 g.fillStyle='#050505';g.fillRect(0,0,420,600);g.fillStyle='#090909';g.fillRect(30,40,360,300);g.beginPath();g.arc(210,190,90,0,7);g.fill()
 g.fillStyle='#0d0d0d';g.font='bold 30px monospace';g.textAlign='center';['TEST DATE','07/04/2001'].forEach((t,i)=>g.fillText(t,210,430+i*46));return c}
// ---------- paintings / photos ----------
export function portrait(){const W=512,H=640,c=cv(W,H),g=c.getContext('2d');let gr=g.createRadialGradient(W/2,H*.4,40,W/2,H*.45,W*.8);gr.addColorStop(0,'#4a3f30');gr.addColorStop(1,'#120d09');g.fillStyle=gr;g.fillRect(0,0,W,H)
 g.fillStyle='#15131e';g.beginPath();g.moveTo(30,H);g.bezierCurveTo(50,480,150,430,W/2,420);g.bezierCurveTo(362,430,462,480,482,H);g.fill()
 g.fillStyle='#a79e8c';g.beginPath();g.moveTo(182,436);g.quadraticCurveTo(W/2,540,330,436);g.quadraticCurveTo(W/2,470,182,436);g.fill()
 g.fillStyle='#8f857b';g.fillRect(228,378,56,66)
 g.fillStyle='#0a0807';g.beginPath();g.ellipse(W/2,250,124,160,0,0,7);g.fill()
 gr=g.createRadialGradient(W/2-18,240,10,W/2,262,125);gr.addColorStop(0,'#d8cdbf');gr.addColorStop(.7,'#a89b8c');gr.addColorStop(1,'#5f554e');g.fillStyle=gr;g.beginPath();g.ellipse(W/2,264,86,112,0,0,7);g.fill()
 g.fillStyle='#0a0807';g.beginPath();g.moveTo(W/2-92,230);g.bezierCurveTo(W/2-60,130,W/2+60,130,W/2+92,230);g.bezierCurveTo(W/2+60,180,W/2+20,170,W/2,178);g.bezierCurveTo(W/2-20,170,W/2-60,180,W/2-92,230);g.fill()
 ;[-1,1].forEach(s=>{const ex=W/2+s*54,ey=262;let eg=g.createRadialGradient(ex,ey,2,ex,ey,34);eg.addColorStop(0,'rgba(10,6,6,.75)');eg.addColorStop(1,'rgba(10,6,6,0)');g.fillStyle=eg;g.fillRect(ex-40,ey-40,80,80)
  g.fillStyle='#d8d2c0';g.beginPath();g.ellipse(ex,ey,23,12,0,0,7);g.fill();g.fillStyle='#32424e';g.beginPath();g.arc(ex,ey,10,0,7);g.fill();g.strokeStyle='#150f0c';g.lineWidth=3;g.beginPath();g.ellipse(ex,ey,23,12,0,Math.PI,0);g.stroke()
  g.strokeStyle='#0e0a08';g.lineWidth=5;g.beginPath();g.moveTo(ex-26,ey-26);g.quadraticCurveTo(ex,ey-36,ex+26,ey-22);g.stroke()})
 g.strokeStyle='rgba(60,40,36,.7)';g.lineWidth=4;g.beginPath();g.moveTo(W/2-4,280);g.quadraticCurveTo(W/2-12,318,W/2,326);g.stroke()
 g.fillStyle='#5c1f22';g.beginPath();g.moveTo(W/2-28,360);g.quadraticCurveTo(W/2,352,W/2+28,360);g.quadraticCurveTo(W/2,372,W/2-28,360);g.fill()
 const im=g.getImageData(0,0,W,H),d=im.data;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W,y/H,48,48,3,3),cr=Math.abs(fbm(x/W,y/H,22,28,2,8)-.5)<.012?.45:1,i=(y*W+x)*4,vg=1-.5*Math.pow(Math.hypot(x/W-.5,y/H-.5)*1.5,2),k=(.5+.65*n)*cr*vg;d[i]=d[i]*k*1.1+14;d[i+1]=d[i+1]*k+9;d[i+2]=d[i+2]*k*.85+2}
 g.putImageData(im,0,0);return c}
export function familyPhoto(seed=1,scratch=true){const W=320,H=400,r=rng(seed),c=pix(W,H,(u,v,o)=>{const n=fbm(u,v,6,8,4,seed),k=.45+.6*n,vg=1-.55*Math.pow(Math.hypot(u-.5,v-.5)*1.4,2);o[0]=150*k*vg+20;o[1]=118*k*vg+14;o[2]=80*k*vg+8}),g=c.getContext('2d')
 const n=2+Math.floor(r()*3);for(let i=0;i<n;i++){const x=W*(.2+.6*(i+.5)/n),y=H*.62+r()*20,s=.8+r()*.4;g.fillStyle='rgba(30,22,16,.85)';g.beginPath();g.ellipse(x,y+70*s,48*s,70*s,0,Math.PI,0);g.fill();g.fillStyle='rgba(160,140,112,.95)';g.beginPath();g.ellipse(x,y-18*s,22*s,28*s,0,0,7);g.fill();g.fillStyle='rgba(24,18,14,.9)';g.beginPath();g.ellipse(x,y-34*s,24*s,16*s,0,Math.PI,0);g.fill()
  if(scratch&&r()<.8){g.strokeStyle='rgba(235,225,205,.9)';g.lineWidth=2;for(let k=0;k<7;k++){g.beginPath();g.moveTo(x-22*s+r()*10,y-40*s+r()*20);g.lineTo(x+14*s+r()*14,y-4*s+r()*20);g.stroke()}g.fillStyle='rgba(20,14,12,.7)';g.beginPath();g.ellipse(x,y-18*s,17*s,22*s,0,0,7);g.fill()}}
 g.strokeStyle='rgba(235,225,205,.5)';g.lineWidth=1.5;for(let i=0;i<8;i++){g.beginPath();g.moveTo(r()*W,r()*H);g.lineTo(r()*W,r()*H);g.stroke()};return c}
// ---------- scary faces / figures ----------
export function faceC({eye='#dfe3f2',glow=false,mouth=true,seed=2}={}){const W=512,H=640,c=cv(W,H),g=c.getContext('2d'),r=rng(seed),cx=W/2
 g.lineCap='round';for(let i=0;i<340;i++){const side=r()<.5?-1:1,x0=cx+(r()-.5)*200,y0=30+r()*90;g.strokeStyle=`rgba(5,4,8,${.5+r()*.5})`;g.lineWidth=1.5+r()*3.5;g.beginPath();g.moveTo(x0,y0);g.bezierCurveTo(x0+side*(60+r()*80),y0+120,x0+side*(30+r()*140),H*.55,x0+side*(r()*160),H*(.78+r()*.22));g.stroke()}
 let gr=g.createRadialGradient(cx,270,20,cx,290,170);gr.addColorStop(0,'#d9d6e6');gr.addColorStop(.75,'#a9a5bd');gr.addColorStop(1,'#4c4860');g.fillStyle=gr;g.beginPath();g.ellipse(cx,285,98,142,0,0,7);g.fill()
 g.fillStyle='rgba(5,4,8,.92)';g.beginPath();g.moveTo(cx-100,250);g.bezierCurveTo(cx-70,120,cx+70,120,cx+100,250);g.bezierCurveTo(cx+60,190,cx+22,176,cx,182);g.bezierCurveTo(cx-22,176,cx-60,190,cx-100,250);g.fill()
 ;[-1,1].forEach(s=>{const ex=cx+s*50,ey=280;let eg=g.createRadialGradient(ex,ey,4,ex,ey,52);eg.addColorStop(0,'rgba(0,0,0,.98)');eg.addColorStop(.7,'rgba(0,0,0,.8)');eg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=eg;g.fillRect(ex-60,ey-60,120,120)
  if(glow){const gg=g.createRadialGradient(ex,ey,1,ex,ey,22);gg.addColorStop(0,'#fff');gg.addColorStop(.3,eye);gg.addColorStop(1,'rgba(255,0,0,0)');g.fillStyle=gg;g.fillRect(ex-24,ey-24,48,48)}else{g.fillStyle=eye;g.beginPath();g.ellipse(ex,ey,17,9,0,0,7);g.fill();g.fillStyle='#000';g.beginPath();g.arc(ex,ey,3.5,0,7);g.fill()}})
 g.fillStyle='rgba(40,34,52,.7)';g.beginPath();g.moveTo(cx-6,300);g.lineTo(cx-14,348);g.lineTo(cx+2,350);g.fill()
 if(mouth){g.fillStyle='#050308';g.beginPath();g.ellipse(cx,410,44,r()*0+78,0,0,7);g.fill();g.fillStyle='#bdb8c4';for(let i=0;i<9;i++){const a=Math.PI*(1.12+i*.095);const x=cx+Math.cos(a)*40,y=410+Math.sin(a)*74;g.beginPath();g.moveTo(x-4,y);g.lineTo(x,y+14);g.lineTo(x+4,y);g.fill()}}
 g.strokeStyle='rgba(20,14,28,.5)';g.lineWidth=1.4;for(let i=0;i<14;i++){g.beginPath();let x=cx+(r()-.5)*160,y=190+r()*200;g.moveTo(x,y);for(let k=0;k<5;k++){x+=(r()-.5)*24;y+=8+r()*14;g.lineTo(x,y)}g.stroke()}
 g.globalCompositeOperation='destination-in';gr=g.createRadialGradient(cx,310,90,cx,320,300);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.75,'rgba(0,0,0,.95)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';return c}
export function figureC(){const W=256,H=768,c=cv(W,H),g=c.getContext('2d'),r=rng(11);g.fillStyle='#030208'
 g.beginPath();g.ellipse(128,92,30,38,0,0,7);g.fill()
 g.beginPath();g.moveTo(96,70);g.bezierCurveTo(60,150,70,300,82,470);g.lineTo(100,470);g.lineTo(104,130);g.fill();g.beginPath();g.moveTo(160,70);g.bezierCurveTo(196,150,186,300,174,470);g.lineTo(156,470);g.lineTo(152,130);g.fill()
 g.beginPath();g.moveTo(104,128);g.lineTo(152,128);g.lineTo(176,250);g.lineTo(206,740);g.lineTo(50,740);g.lineTo(80,250);g.closePath();g.fill()
 g.strokeStyle='#030208';g.lineWidth=12;g.lineCap='round';g.beginPath();g.moveTo(96,160);g.lineTo(52,420);g.lineTo(60,520);g.stroke();g.beginPath();g.moveTo(160,160);g.lineTo(204,420);g.lineTo(196,520);g.stroke()
 for(let i=0;i<60;i++){g.lineWidth=1+r()*2;g.beginPath();const x=80+r()*100;g.moveTo(x,90);g.quadraticCurveTo(x+(r()-.5)*40,300,x+(r()-.5)*70,420+r()*120);g.stroke()}
 const gl=(x,y)=>{const gg=g.createRadialGradient(x,y,1,x,y,18);gg.addColorStop(0,'#fff');gg.addColorStop(.25,'#cfd8ff');gg.addColorStop(1,'rgba(160,180,255,0)');g.fillStyle=gg;g.fillRect(x-20,y-20,40,40)};gl(116,92);gl(140,92)
 g.globalCompositeOperation='destination-in';const m=g.createLinearGradient(0,H*.85,0,H);m.addColorStop(0,'rgba(0,0,0,1)');m.addColorStop(1,'rgba(0,0,0,.0)');g.fillStyle=m;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';return c}
export function dollFaceC(){const W=512,H=256,c=cv(W,H),g=c.getContext('2d'),r=rng(9);g.fillStyle='#d6cbc0';g.fillRect(0,0,W,H);const im=g.getImageData(0,0,W,H),d=im.data;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W,y/H,16,8,3,3),i=(y*W+x)*4,k=.86+.2*n;d[i]*=k;d[i+1]*=k;d[i+2]*=k*.97}g.putImageData(im,0,0)
 const fx=128;g.fillStyle='rgba(170,60,60,.35)';g.beginPath();g.ellipse(fx-34,150,14,9,0,0,7);g.fill();g.beginPath();g.ellipse(fx+34,150,14,9,0,0,7);g.fill()
 ;[-1,1].forEach(s=>{const ex=fx+s*24,ey=118;g.fillStyle='#e8e2d4';g.beginPath();g.ellipse(ex,ey,13,8,0,0,7);g.fill();g.fillStyle='#10161c';g.beginPath();g.arc(ex,ey,6.5,0,7);g.fill();g.strokeStyle='#150e0c';g.lineWidth=2.4;g.beginPath();g.ellipse(ex,ey,13,8,0,Math.PI,0);g.stroke();g.beginPath();g.moveTo(ex-13,ey-14);g.quadraticCurveTo(ex,ey-21,ex+13,ey-13);g.stroke()
  let eg=g.createRadialGradient(ex,ey+4,3,ex,ey+4,22);eg.addColorStop(0,'rgba(20,10,12,.45)');eg.addColorStop(1,'rgba(20,10,12,0)');g.fillStyle=eg;g.fillRect(ex-24,ey-20,48,48)})
 g.fillStyle='#7b2a30';g.beginPath();g.moveTo(fx-12,176);g.quadraticCurveTo(fx,172,fx+12,176);g.quadraticCurveTo(fx,185,fx-12,176);g.fill()
 g.strokeStyle='rgba(40,28,30,.75)';g.lineWidth=1.3;for(let i=0;i<5;i++){g.beginPath();let x=fx-34+r()*70,y=60+r()*40;g.moveTo(x,y);for(let k=0;k<6;k++){x+=(r()-.5)*14;y+=10+r()*10;g.lineTo(x,y)}g.stroke()};return c}
export function eyeballC(){const W=256,H=128,c=cv(W,H),g=c.getContext('2d'),r=rng(5);g.fillStyle='#e9e1d3';g.fillRect(0,0,W,H);g.strokeStyle='rgba(170,30,30,.6)';g.lineWidth=1.2;for(let i=0;i<40;i++){g.beginPath();let x=r()*W,y=r()*H;g.moveTo(x,y);for(let k=0;k<6;k++){x+=(r()-.5)*30;y+=(r()-.5)*22;g.lineTo(x,y)}g.stroke()}
 const gr=g.createRadialGradient(64,64,2,64,64,26);gr.addColorStop(0,'#05080a');gr.addColorStop(.3,'#05080a');gr.addColorStop(.32,'#4f7a58');gr.addColorStop(1,'#1c3a2a');g.fillStyle=gr;g.beginPath();g.ellipse(64,64,26,26,0,0,7);g.fill();return c}
export function crackC(W=512,H=512,seed=3,{cx=.55,cy=.4,n=14}={}){const c=cv(W,H),g=c.getContext('2d'),r=rng(seed),X=cx*W,Y=cy*H;g.lineCap='round'
 const ray=(a,len,w,d)=>{let x=X,y=Y;g.beginPath();g.moveTo(x,y);let aa=a;const seg=Math.floor(len/14);for(let i=0;i<seg;i++){aa+=(r()-.5)*.25;x+=Math.cos(aa)*14;y+=Math.sin(aa)*14;g.lineTo(x,y);if(d<2&&r()<.1){const sx=x,sy=y;g.stroke();ray2(sx,sy,aa+(r()<.5?-.8:.8),len*.35,w*.6,d+1);g.beginPath();g.moveTo(x,y)}}g.strokeStyle='rgba(235,240,255,.85)';g.lineWidth=w;g.stroke()}
 const ray2=(x0,y0,a,len,w,d)=>{let x=x0,y=y0,aa=a;g.beginPath();g.moveTo(x,y);for(let i=0;i<Math.floor(len/12);i++){aa+=(r()-.5)*.35;x+=Math.cos(aa)*12;y+=Math.sin(aa)*12;g.lineTo(x,y)}g.strokeStyle='rgba(235,240,255,.7)';g.lineWidth=w;g.stroke()}
 for(let i=0;i<n;i++)ray(i/n*6.283+(r()-.5)*.3,160+r()*340,1.8,0)
 for(let k=1;k<5;k++){g.beginPath();for(let i=0;i<=24;i++){const a=i/24*6.283,q=k*34*(.8+r()*.4);const x=X+Math.cos(a)*q,y=Y+Math.sin(a)*q;i?g.lineTo(x,y):g.moveTo(x,y)}g.strokeStyle='rgba(235,240,255,.35)';g.lineWidth=1;g.stroke()};return c}
export function mirrorDirt(){return pix(256,256,(u,v,o)=>{const e=Math.pow(Math.hypot(u-.5,v-.5)*1.9,2.2),n=fbm(u,v,8,8,3,5),m=Math.max(0,fbm(u,v,5,5,3,2)-.5);o[0]=20;o[1]=18;o[2]=26;o[3]=clamp(e*.7+n*.25+m*.5)*255})}
export function webC(){const S=256,c=cv(S,S),g=c.getContext('2d'),r=rng(4);g.lineCap='round';const N=9,ang=[];for(let i=0;i<N;i++)ang.push(i/(N-1)*Math.PI/2+(r()-.5)*.05)
 g.strokeStyle='rgba(235,235,245,.55)';g.lineWidth=1.2;ang.forEach(a=>{g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*S*1.05,Math.sin(a)*S*1.05);g.stroke()})
 for(let k=1;k<14;k++){const R=k*S/12.5;g.lineWidth=.9;g.strokeStyle=`rgba(235,235,245,${.5-k*.025})`;g.beginPath();ang.forEach((a,i)=>{const x=Math.cos(a)*R,y=Math.sin(a)*R;if(!i)g.moveTo(x,y);else{const pa=ang[i-1],mx=Math.cos((a+pa)/2)*R*.9,my=Math.sin((a+pa)/2)*R*.9;g.quadraticCurveTo(mx,my,x,y)}});g.stroke()}
 const im=g.getImageData(0,0,S,S),d=im.data;for(let y=0;y<S;y++)for(let x=0;x<S;x++){const f=Math.hypot(x,y)/S;d[(y*S+x)*4+3]*=clamp(1.4-f)};g.putImageData(im,0,0);return c}
export function batC(){const W=256,H=128,c=cv(W,H),g=c.getContext('2d');g.fillStyle='#050308';g.beginPath();g.moveTo(128,52);g.bezierCurveTo(108,28,84,20,56,30);g.bezierCurveTo(46,46,34,52,6,50);g.bezierCurveTo(26,60,30,78,42,92);g.bezierCurveTo(52,78,64,76,76,86);g.bezierCurveTo(88,70,104,70,114,86);g.lineTo(122,66);g.lineTo(128,104);g.lineTo(134,66);g.lineTo(142,86);g.bezierCurveTo(152,70,168,70,180,86);g.bezierCurveTo(192,76,204,78,214,92);g.bezierCurveTo(226,78,230,60,250,50);g.bezierCurveTo(222,52,210,46,200,30);g.bezierCurveTo(172,20,148,28,128,52);g.fill()
 g.beginPath();g.moveTo(118,52);g.lineTo(114,34);g.lineTo(126,46);g.lineTo(130,46);g.lineTo(142,34);g.lineTo(138,52);g.fill();return c}
export function writingC(text,{W=1024,H=256,size=120,seed=2}={}){const c=cv(W,H),g=c.getContext('2d'),r=rng(seed);g.textAlign='center';g.textBaseline='middle'
 const draw=()=>{g.clearRect(0,0,W,H);const font=`${size}px 'Creepster','Special Elite',Impact,cursive`;g.font=font
  for(let p=0;p<3;p++){g.fillStyle=p?`rgba(${150+r()*40},12,12,.85)`:'rgba(120,8,10,.95)';g.fillText(text,W/2+(r()-.5)*3,H*.42+(r()-.5)*3)}
  g.strokeStyle='rgba(130,8,10,.9)';g.lineCap='round';const m=g.measureText(text).width,x0=W/2-m/2;for(let i=0;i<22;i++){const x=x0+r()*m,y=H*.42+size*.18,l=20+r()*(H-y-20);g.lineWidth=2+r()*3.5;g.beginPath();g.moveTo(x,y);g.lineTo(x,y+l);g.stroke();g.fillStyle='rgba(80,6,8,.9)';g.beginPath();g.arc(x,y+l,g.lineWidth*.75,0,7);g.fill();g.fillStyle='rgba(255,150,150,.18)';g.beginPath();g.arc(x-1,y+l-1,1.2,0,7);g.fill()}}
 draw();return{c,redraw:draw}}
export function handprintC(seed=3){const W=256,H=384,c=cv(W,H),g=c.getContext('2d'),r=rng(seed);g.fillStyle='rgba(78,6,8,.85)'
 g.beginPath();g.ellipse(128,250,58,64,0,0,7);g.fill();[[-46,160,-.3,20,64],[-18,128,-.08,18,76],[14,124,.06,18,80],[44,140,.22,17,70],[78,220,1.0,16,52]].forEach(f=>{g.save();g.translate(128+f[0],f[1]+50);g.rotate(f[2]);g.beginPath();g.roundRect(-f[3]/2,-f[4]/2,f[3],f[4],f[3]/2);g.fill();g.restore()})
 g.strokeStyle='rgba(78,6,8,.75)';g.lineCap='round';for(let i=0;i<9;i++){g.lineWidth=2+r()*5;const x=70+r()*120;g.beginPath();g.moveTo(x,300);g.lineTo(x+(r()-.5)*6,300+r()*80);g.stroke()}
 const im=g.getImageData(0,0,W,H),d=im.data;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=fbm(x/W,y/H,10,14,3,seed);d[(y*W+x)*4+3]*=.55+.6*n};g.putImageData(im,0,0);return c}
// ---------- pumpkin ----------
export function pumpkinSkin(){return pix(512,256,(u,v,o)=>{const rib=.5+.5*Math.cos(u*6.283*11),n=fbm(u,v,24,8,4,3),k=.55+.45*rib+.22*(n-.5);o[0]=225*k;o[1]=98*k;o[2]=18*k*.8;const dk=Math.pow(Math.abs(v-.5)*2,3);o[0]*=1-dk*.4;o[1]*=1-dk*.5})}
const _pf={};export function pumpkinFace(kind=0){if(_pf[kind])return _pf[kind];return _pf[kind]=_pumpkinFace(kind)}
function _pumpkinFace(kind=0){const W=1024,H=512,m=cv(W,H),e=cv(W,H),gm=m.getContext('2d'),ge=e.getContext('2d');gm.drawImage(pumpkinSkin(),0,0,W,H);ge.fillStyle='#000';ge.fillRect(0,0,W,H)
 const cx=W*.25,cy=H*.5,paths=[]
 const tri=(x,y,s,fl=1)=>{const p=new Path2D();p.moveTo(cx+x,y+cy-s*fl);p.lineTo(cx+x-s,y+cy+s*.8*fl);p.lineTo(cx+x+s,y+cy+s*.8*fl);p.closePath();return p}
 if(kind===0){paths.push(tri(-70,-34,34),tri(70,-34,34),tri(0,12,16))
  const mo=new Path2D();mo.moveTo(cx-104,cy+58);for(let i=0;i<9;i++){mo.lineTo(cx-104+i*26,cy+(i%2?78:112)+(i%4===1?6:0))}for(let i=8;i>=0;i--)mo.lineTo(cx-104+i*26,cy+(i%2?64:48)+((i%4===1)?-2:0));mo.closePath();paths.push(mo)}
 else if(kind===1){const ey=(x)=>{const p=new Path2D();p.moveTo(cx+x-34,cy-26);p.lineTo(cx+x+34,cy-52);p.lineTo(cx+x+20,cy-4);p.closePath();return p};paths.push(ey(-70),ey(70));const nose=new Path2D();nose.ellipse(cx,cy+14,10,16,0,0,7);paths.push(nose);const mo=new Path2D();mo.ellipse(cx,cy+84,66,34,0,0,7);paths.push(mo)}
 else{paths.push(tri(-64,-30,26,-1),tri(64,-30,26,-1));const mo=new Path2D();mo.moveTo(cx-90,cy+70);mo.quadraticCurveTo(cx,cy+8,cx+90,cy+70);mo.quadraticCurveTo(cx,cy+60,cx-90,cy+70);paths.push(mo)}
 paths.forEach(p=>{gm.fillStyle='#120400';gm.fill(p);gm.strokeStyle='#6e2a06';gm.lineWidth=5;gm.stroke(p);ge.fillStyle='#ffc060';ge.fill(p)});return{map:m,emi:e}}
export function blockC(ch,hue=0){const c=cv(128,128),g=c.getContext('2d');const bg=['#d9c8a4','#c9d4c2','#cfc0d6'][hue%3];g.fillStyle=bg;g.fillRect(0,0,128,128);for(let i=0;i<400;i++){g.fillStyle=`rgba(60,40,30,${Math.random()*.06})`;g.fillRect(Math.random()*128,Math.random()*128,3,3)}
 g.fillStyle=['#8a2a2a','#2a4a8a','#3a7a3a'][hue%3];g.font="bold 86px 'Special Elite',Impact,monospace";g.textAlign='center';g.textBaseline='middle';g.fillText(ch,64,70);g.strokeStyle='rgba(60,40,30,.5)';g.lineWidth=4;g.strokeRect(2,2,124,124);return c}
// ---------- light sprites ----------
export function radial(stops,S=128){const c=cv(S,S),g=c.getContext('2d'),gr=g.createRadialGradient(S/2,S/2,0,S/2,S/2,S/2);stops.forEach(s=>gr.addColorStop(s[0],s[1]));g.fillStyle=gr;g.fillRect(0,0,S,S);return c}
export function flameC(){const W=64,H=128,c=cv(W,H),g=c.getContext('2d');const gr=g.createRadialGradient(32,92,2,32,84,52);gr.addColorStop(0,'rgba(255,250,220,1)');gr.addColorStop(.25,'rgba(255,190,80,.95)');gr.addColorStop(.6,'rgba(255,110,20,.45)');gr.addColorStop(1,'rgba(255,60,0,0)');g.fillStyle=gr;g.beginPath();g.moveTo(32,6);g.bezierCurveTo(52,50,60,76,52,100);g.bezierCurveTo(46,124,18,124,12,100);g.bezierCurveTo(4,76,14,50,32,6);g.fill();return c}
export function beamC(){return pix(256,64,(u,v,o)=>{const e=Math.pow(Math.sin(v*Math.PI),1.6),a=Math.pow(1-u,1.1)*e*(.7+.5*fbm(u,v,6,3,3,2));o[0]=170;o[1]=190;o[2]=255;o[3]=clamp(a)*255})}

export function posterScene(){const c=posterCanvas(),g=c.getContext('2d'),W=420,H=600
 const im=g.getImageData(0,0,W,H),d=im.data;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const e=Math.min(x,W-1-x,y,H-1-y),i=(y*W+x)*4,n=fbm(x/W,y/H,8,10,4,3);if(e<26){const k=.55+.45*n,b=e<5?.55:1;d[i]=120*k*b;d[i+1]=108*k*b;d[i+2]=96*k*b}else{const s=Math.max(0,n-.6)*40;d[i]+=s;d[i+1]+=s*.8;d[i+2]+=s*.6}}
 g.putImageData(im,0,0);g.strokeStyle='rgba(120,110,130,.25)';g.lineWidth=2;g.beginPath();g.moveTo(0,H/2);g.lineTo(W,H/2+4);g.moveTo(W/2,0);g.lineTo(W/2+6,H);g.stroke();return c}

// ---------- Visceral Blood Splatter / Pool & Drips ----------
export function bloodSplatterC(seed=1,{drips=true}={}){
 const S=512,c=cv(S,S),g=c.getContext('2d'),r=rng(seed),cx=S/2,cy=drips?S*.42:S/2
 // Coagulated main arterial pool
 for(let b=0;b<7;b++){
  const bx=cx+(r()-.5)*110,by=cy+(r()-.5)*90,rx=48+r()*72,ry=42+r()*66
  const gr=g.createRadialGradient(bx,by,4,bx,by,Math.max(rx,ry))
  gr.addColorStop(0,'rgba(128,4,8,.96)');gr.addColorStop(.55,'rgba(82,3,6,.88)');gr.addColorStop(.85,'rgba(44,2,4,.55)');gr.addColorStop(1,'rgba(28,1,2,0)')
  g.fillStyle=gr;g.beginPath();g.ellipse(bx,by,rx,ry,r()*3.14,0,7);g.fill()
 }
 // Radial arterial droplets & spatter streaks
 for(let i=0;i<64;i++){
  const a=r()*6.283,dist=45+r()*185,x=cx+Math.cos(a)*dist,y=cy+Math.sin(a)*dist,rad=2+r()*12
  g.fillStyle=`rgba(${70+Math.floor(r()*65)},3,6,${.55+r()*.4})`
  g.beginPath();g.ellipse(x,y,rad*(1+r()*.8),rad*.65,a,0,7);g.fill()
 }
 if(drips){
  g.lineCap='round'
  for(let i=0;i<14;i++){
   const x=cx-120+r()*240,y0=cy+(r()-.3)*55,len=55+r()*(S-y0-20),w=2+r()*4.5
   g.strokeStyle=`rgba(${68+Math.floor(r()*50)},3,5,${.75+r()*.22})`;g.lineWidth=w
   g.beginPath();g.moveTo(x,y0);g.bezierCurveTo(x+(r()-.5)*8,y0+len*.4,x+(r()-.5)*8,y0+len*.75,x+(r()-.5)*4,y0+len);g.stroke()
   g.fillStyle='rgba(95,4,8,.92)';g.beginPath();g.arc(x,y0+len,w*.75,0,7);g.fill()
  }
 }
 if(g.getImageData){
  const im=g.getImageData(0,0,S,S),d=im.data
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const n=fbm(x/S,y/S,12,12,3,seed+5);d[(y*S+x)*4+3]*=clamp(.45+.75*n)}
  g.putImageData(im,0,0)
 }
 return c
}

// ---------- Subtle Dark Aged Claw Gouges (tapered organic scratches, not bright neon stripes) ----------
export function clawMarksC(seed=1){
 const S=512,c=cv(S,S),g=c.getContext('2d'),r=rng(seed)
 g.lineCap='round'
 // Faint dark grime smudge behind the scratches
 const bg=g.createRadialGradient(S/2,S/2,12,S/2,S/2,160)
 bg.addColorStop(0,'rgba(24,4,6,.28)');bg.addColorStop(.65,'rgba(14,4,5,.12)');bg.addColorStop(1,'rgba(0,0,0,0)')
 g.fillStyle=bg;g.fillRect(0,0,S,S)
 const count=4
 for(let i=0;i<count;i++){
  const t=(i-(count-1)/2)
  const x0=118+t*32+(r()-.5)*10,y0=110+Math.abs(t)*22+(r()-.5)*14
  const x1=S-122+t*26+(r()-.5)*12,y1=S-115-Math.abs(t)*18+(r()-.5)*14
  const mx=(x0+x1)/2+(r()-.5)*16,my=(y0+y1)/2+(r()-.5)*16
  // Tapered scratch via thin dark charcoal shadow + subtle splinter highlight + dried dark-crimson seam
  const steps=26
  for(let s=0;s<steps;s++){
   const f0=s/steps,f1=(s+1)/steps
   const pt=f=>[(1-f)*(1-f)*x0+2*(1-f)*f*mx+f*f*x1,(1-f)*(1-f)*y0+2*(1-f)*f*my+f*f*y1]
   const [ax,ay]=pt(f0),[bx,by]=pt(f1)
   const taper=Math.sin(Math.PI*((f0+f1)*.5))
   if(taper<.08)continue
   g.strokeStyle=`rgba(12,6,8,${.78*taper})`;g.lineWidth=1.5+4.2*taper
   g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke()
   g.strokeStyle=`rgba(62,6,9,${.65*taper})`;g.lineWidth=.8+1.8*taper
   g.beginPath();g.moveTo(ax+1.2,ay+1.2);g.lineTo(bx+1.2,by+1.2);g.stroke()
  }
 }
 if(g.getImageData){
  const im=g.getImageData(0,0,S,S),d=im.data
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const n=fbm(x/S,y/S,18,18,3,seed+13);d[(y*S+x)*4+3]*=clamp(.48+.68*n)}
  g.putImageData(im,0,0)
 }
 return c
}

// ---------- Gothic Pointed Arch & Stone Decay Wall Overlay ----------
export function gothicArchC(seed=1){
 const W=512,H=512,c=cv(W,H),g=c.getContext('2d'),r=rng(seed)
 // Dark weathered Gothic pointed arch moulding & stone ribs
 g.strokeStyle='rgba(12,8,14,.82)';g.lineWidth=14
 g.beginPath();g.moveTo(36,H);g.lineTo(36,H*.38);g.quadraticCurveTo(36,48,W/2,24);g.quadraticCurveTo(W-36,48,W-36,H*.38);g.lineTo(W-36,H);g.stroke()
 g.strokeStyle='rgba(92,72,88,.32)';g.lineWidth=4
 g.beginPath();g.moveTo(42,H);g.lineTo(42,H*.38);g.quadraticCurveTo(42,56,W/2,32);g.quadraticCurveTo(W-42,56,W-42,H*.38);g.lineTo(W-42,H);g.stroke()
 // Inner trefoil /lancet ribs
 for(let k=-1;k<=1;k+=2){
  const cx=W/2+k*110
  g.strokeStyle='rgba(14,9,16,.68)';g.lineWidth=7
  g.beginPath();g.moveTo(cx-75,H);g.lineTo(cx-75,H*.48);g.quadraticCurveTo(cx-75,H*.2,cx,H*.14);g.quadraticCurveTo(cx+75,H*.2,cx+75,H*.48);g.lineTo(cx+75,H);g.stroke()
 }
 // Rosette circle at apex
 g.strokeStyle='rgba(16,10,18,.75)';g.lineWidth=8;g.beginPath();g.arc(W/2,H*.25,46,0,7);g.stroke()
 g.strokeStyle='rgba(120,14,20,.45)';g.lineWidth=2.5;g.beginPath();g.arc(W/2,H*.25,38,0,7);g.stroke()
 // Blood seepage from arch apex
 for(let i=0;i<8;i++){
  const bx=W/2+(r()-.5)*90,by=H*.25+(r()-.5)*40,bl=40+r()*140
  g.strokeStyle=`rgba(${88+Math.floor(r()*45)},5,8,.72)`;g.lineWidth=1.8+r()*2.4
  g.beginPath();g.moveTo(bx,by);g.lineTo(bx+(r()-.5)*6,by+bl);g.stroke()
 }
 return c
}

// ---------- Central Ritual Altar Circle & Octagram/Pentagram Star (Imitating Reference Photo) ----------
export function ritualAltarFloorC(seed=1){
 const S=1024,c=cv(S,S),g=c.getContext('2d'),r=rng(seed),cx=S/2,cy=S/2
 // Subtle dark scorched ritual aura on floor
 const bg=g.createRadialGradient(cx,cy,30,cx,cy,490)
 bg.addColorStop(0,'rgba(42,6,8,.62)');bg.addColorStop(.38,'rgba(26,8,8,.42)');bg.addColorStop(.82,'rgba(12,6,6,.22)');bg.addColorStop(1,'rgba(0,0,0,0)')
 g.fillStyle=bg;g.fillRect(0,0,S,S)

 // Blood pools inside & around the inner sacrificial circle (matching reference photo)
 const drawBloodPool=(px,py,rx,ry,alpha=.88)=>{
  const gr=g.createRadialGradient(px,py,4,px,py,Math.max(rx,ry))
  gr.addColorStop(0,`rgba(110,4,8,${alpha})`);gr.addColorStop(.65,`rgba(68,2,5,${alpha*.85})`);gr.addColorStop(1,'rgba(30,1,2,0)')
  g.fillStyle=gr;g.beginPath();if(g.ellipse)g.ellipse(px,py,rx,ry,r()*3.14,0,7);else g.arc(px,py,(rx+ry)*.5,0,7);g.fill()
 }
 drawBloodPool(cx-95,cy-105,64,52,.92)
 drawBloodPool(cx+28,cy+18,82,74,.85)
 drawBloodPool(cx+135,cy-75,44,36,.75)
 drawBloodPool(cx-120,cy+115,48,38,.78)

 // Hand-drawn weathered chalk/salt line helper with warm candlelight glow
 g.lineCap='round';g.lineJoin='round'
 const chalkLine=(x0,y0,x1,y1,w=6.5)=>{
  // Warm amber outer glow
  g.strokeStyle='rgba(255,195,110,.26)';g.lineWidth=w*2.6
  g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke()
  // Crisp chalk core with slight organic jitter
  g.strokeStyle='rgba(248,238,218,.94)';g.lineWidth=w
  g.beginPath();g.moveTo(x0,y0)
  const segs=18
  for(let i=1;i<=segs;i++){
   const t=i/segs,jx=(r()-.5)*2.4,jy=(r()-.5)*2.4
   g.lineTo(mix(x0,x1,t)+jx,mix(y0,y1,t)+jy)
  }
  g.stroke()
 }
 const chalkRing=(R,w=6.5)=>{
  g.strokeStyle='rgba(255,190,105,.24)';g.lineWidth=w*2.5
  g.beginPath();g.arc(cx,cy,R,0,7);g.stroke()
  g.strokeStyle='rgba(248,238,218,.94)';g.lineWidth=w
  g.beginPath()
  for(let i=0;i<=120;i++){
   const a=i/120*Math.PI*2,q=R+(r()-.5)*2.6
   const x=cx+Math.cos(a)*q,y=cy+Math.sin(a)*q
   i?g.lineTo(x,y):g.moveTo(x,y)
  }
  g.stroke()
 }

 // Outer ritual circle + secondary rim (like reference image)
 const R_OUT=452,R_MID=434,R_IN=168,R_IN2=150
 chalkRing(R_OUT,7.5)
 chalkRing(R_MID,3.8)
 // Inner sacrificial altar ring
 chalkRing(R_IN,6.5)
 chalkRing(R_IN2,3.2)

 // 8-pointed geometric ritual star (octagram: two intersecting squares + star chords matching the photo)
 const N=8,pts=[]
 for(let i=0;i<N;i++){
  const a=i/N*Math.PI*2-Math.PI/2
  pts.push([cx+Math.cos(a)*R_OUT,cy+Math.sin(a)*R_OUT])
 }
 // Connect step-3 octagram star chords ({8/3} star polygon)
 for(let i=0;i<N;i++){
  const p0=pts[i],p1=pts[(i+3)%N]
  chalkLine(p0[0],p0[1],p1[0],p1[1],6.2)
 }
 // Connect step-2 dual squares ({8/2}) for the dense geometric web seen in reference photo
 for(let i=0;i<N;i++){
  const p0=pts[i],p1=pts[(i+2)%N]
  chalkLine(p0[0],p0[1],p1[0],p1[1],4.8)
 }
 // Radial spokes from inner circle to outer vertices
 for(let i=0;i<N;i++){
  const a=i/N*Math.PI*2-Math.PI/2
  chalkLine(cx+Math.cos(a)*R_IN,cy+Math.sin(a)*R_IN,pts[i][0],pts[i][1],3.5)
 }

 // Occult runes & sigil ticks around the inner and outer rings
 g.strokeStyle='rgba(242,226,198,.82)';g.lineWidth=3
 for(let i=0;i<36;i++){
  const a=i/36*Math.PI*2,rx=cx+Math.cos(a)*(R_IN+16),ry=cy+Math.sin(a)*(R_IN+16)
  g.beginPath();g.moveTo(rx-6,ry-6);g.lineTo(rx+6,ry+6);g.moveTo(rx+6,ry-4);g.lineTo(rx-4,ry+6);g.stroke()
 }
 // Warm pools of candlelight glow at the 8 star vertices
 for(let i=0;i<N;i++){
  const [vx,vy]=pts[i]
  const cg=g.createRadialGradient(vx,vy,2,vx,vy,76)
  cg.addColorStop(0,'rgba(255,235,175,.85)');cg.addColorStop(.35,'rgba(255,165,60,.42)');cg.addColorStop(1,'rgba(255,100,10,0)')
  g.fillStyle=cg;g.beginPath();g.arc(vx,vy,76,0,7);g.fill()
 }

 // Weathering grain pass so lines look chalky on aged floor tiles/wood
 if(g.getImageData){
  const im=g.getImageData(0,0,S,S),d=im.data
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
   const n=fbm(x/S,y/S,48,48,3,seed+11)
   d[(y*S+x)*4+3]*=n>.32?1:.45+n*1.1
  }
  g.putImageData(im,0,0)
 }
 return c
}

import * as THREE from 'three';

// Rain caught on the glass, rather than a bright screen of floating white sticks.
export function createStudyRainGlass(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const c=canvas.getContext('2d');
 let n=1849;const random=()=>((n=Math.imul(n,1664525)+1013904223|0)>>>0)/4294967296;
 for(let i=0;i<145;i++){
  const x=random()*512,y=random()*384,r=.5+random()*1.1;
  c.strokeStyle='rgba(12,23,29,.45)';c.lineWidth=.7;c.beginPath();c.ellipse(x,y,r,r*1.5,0,0,Math.PI*2);c.stroke();
  c.strokeStyle='rgba(171,193,202,.6)';c.beginPath();c.moveTo(x-r*.5,y-r*.4);c.lineTo(x-r*.5,y+r*.3);c.stroke();
  if(i%11===0){c.strokeStyle='rgba(142,163,174,.22)';c.lineWidth=.6;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-1,y+8,x+1,y+16,x-.4,y+24+random()*32);c.stroke();}
 }
 const map=new THREE.CanvasTexture(canvas);
 const glass=new THREE.Mesh(new THREE.PlaneGeometry(4,2.9),new THREE.MeshBasicMaterial({map,color:0xa3b8c1,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));
 glass.name='study-rain-glass';glass.userData.np=glass.userData.ns=1;return glass;
}

// Small static textures and a bounded batch of camera-facing planes; no volumetric pass or particles.
export function createStudyMist(E,placements,{color=0x819098,opacity=.12,name='study-mist',wispy=false}={}){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
 const gradient=c.createRadialGradient(64,64,2,64,64,62);gradient.addColorStop(0,'rgba(255,255,255,.6)');gradient.addColorStop(.45,'rgba(255,255,255,.25)');gradient.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gradient;c.fillRect(0,0,128,128);
 if(wispy){
  const pixels=c.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const u=(x-64)/64,v=(y-64)/64,ridge=v+.2*Math.sin(u*5)+.08*Math.sin(u*13),edge=Math.max(0,1-u*u);
   const a=Math.exp(-ridge*ridge*6)*edge*edge*(.5+.15*Math.sin(u*17+v*9))*(1-v*v),i=(y*128+x)*4;
   pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.max(0,a)*255;
  }
  c.putImageData(pixels,0,0);
 }
 const material=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),color,transparent:true,opacity,depthWrite:false});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
   vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
   mvPosition.xy += position.xy * vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
   gl_Position = projectionMatrix * mvPosition;
  `);
 };
 material.customProgramCacheKey=()=> 'study-instanced-mist-v1';
 const mist=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,placements.length),matrix=new THREE.Matrix4();mist.name=name;mist.userData.np=mist.userData.ns=1;
 for(let i=0;i<placements.length;i++){const [x,y,z,w,h]=placements[i];matrix.makeScale(w,h,1);matrix.setPosition(x,y,z);mist.setMatrixAt(i,matrix);}
 mist.instanceMatrix.needsUpdate=true;if(E.studyLowDetail)mist.count=Math.min(3,placements.length);
 // Instanced bounds would describe unrotated planes, not the camera-facing quads.
 mist.frustumCulled=false;mist.castShadow=false;mist.receiveShadow=false;return mist;
}

export function buildStudyAtmosphere(E,{add}){
 const rng=(()=>{let n=8921;return()=>((n=Math.imul(n,1664525)+1013904223|0)>>>0)/4294967296;})();
 const texture=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;};
 const drip=(c,x,y,length,width)=>{
  c.lineCap='round';c.strokeStyle='#47070c';c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+3,y+length*.2,x-2,y+length*.8,x+1,y+length);c.stroke();
  c.fillStyle='#5d0c11';c.beginPath();c.ellipse(x+1,y+length,width*.8,width*1.35,0,0,Math.PI*2);c.fill();
 };
 const spill=texture(256,256,(c,w,h)=>{
  const image=c.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const u=(x-w*.5)/(w*.48),v=(y-h*.5)/(h*.42),a=Math.atan2(v,u),radius=Math.hypot(u,v),edge=.7+.08*Math.sin(a*3)+.06*Math.sin(a*7+1)+.03*Math.sin(a*13),noise=rng();
   const alpha=THREE.MathUtils.clamp((edge-radius+noise*.018)*70,0,1),i=(y*w+x)*4;
   image.data[i]=37+noise*12+(1-radius)*9;image.data[i+1]=2+noise*3;image.data[i+2]=6+noise*3;image.data[i+3]=alpha*245;
  }
  c.putImageData(image,0,0);
  for(let i=0;i<48;i++){c.fillStyle='#280609';c.beginPath();c.arc(rng()*w,rng()*h,1+rng()*2.5,0,Math.PI*2);c.fill();}
 });
 const bloodMaterial=map=>new THREE.MeshLambertMaterial({map,transparent:true,alphaTest:.05,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 const stains=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),bloodMaterial(spill),4),m=new THREE.Matrix4(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
 stains.name='study-blood-spills';stains.userData.np=stains.userData.ns=1;
 [[2.9,.018,3.35,1.5,.85],[-1.6,.018,-2.9,.8,.5],[2.6,.018,.8,.45,.32],[-3.55,.019,-1.2,1.7,1.05]].forEach(([x,y,z,w,h],i)=>{m.compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(w,h,1));stains.setMatrixAt(i,m);});add(stains);
 const splatter=texture(192,192,c=>{
  for(let i=0;i<110;i++){const a=rng()*Math.PI*2,r=Math.pow(rng(),1.7)*85,x=96+Math.cos(a)*r,y=96+Math.sin(a)*r;
   c.fillStyle=i%3?'#41070b':'#690d13';c.beginPath();c.ellipse(x,y,.5+rng()*3,1+rng()*5,a,0,Math.PI*2);c.fill();}
 });
 const ceiling=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),bloodMaterial(splatter),3);ceiling.name='study-ceiling-blood';ceiling.userData.np=ceiling.userData.ns=1;
 const down=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0));
 [[-3.7,2.7,.85,.6],[1.8,.8,.6,.45],[3.1,-2.7,.75,.5]].forEach(([x,z,w,h],i)=>{m.compose(new THREE.Vector3(x,(E.H||4.6)-.005,z),down,new THREE.Vector3(w,h,1));ceiling.setMatrixAt(i,m);});add(ceiling);
 const writing=(words,p,size,rotation)=>{
  const map=texture(768,384,(c)=>{
   const letters={I:[[[.5,0],[.5,1]]],T:[[[0,0],[1,0]],[[.5,0],[.5,1]]],L:[[[0,0],[0,1],[1,1]]],E:[[[1,0],[0,0],[0,1],[1,1]],[[0,.5],[.8,.5]]],N:[[[0,1],[0,0],[1,1],[1,0]]],S:[[[1,.08],[.6,0],[.1,.1],[0,.35],[.2,.46],[.8,.58],[1,.72],[.9,.94],[.4,1],[0,.9]]],A:[[[0,1],[.5,0],[1,1]],[[.2,.62],[.8,.62]]],Y:[[[0,0],[.5,.5],[1,0]],[[.5,.5],[.5,1]]],Q:[[[.5,0],[.15,.08],[0,.4],[.08,.85],[.4,1],[.8,.95],[1,.6],[.9,.15],[.5,0]],[[.6,.75],[1.1,1.2]]],U:[[[0,0],[0,.75],[.2,.98],[.7,1],[1,.8],[1,0]]]};
   const gap=610/words.length;c.lineCap=c.lineJoin='round';
   for(let i=0;i<words.length;i++){
    c.save();c.translate(72+gap*i,53+(rng()-.5)*15);c.rotate((rng()-.5)*.1);
    const strokes=letters[words[i]]||[];
    for(const stroke of strokes){c.beginPath();stroke.forEach(([x,y],j)=>{const px=x*gap*.64+(rng()-.5)*2,py=y*103+(rng()-.5)*2;j?c.lineTo(px,py):c.moveTo(px,py);});c.strokeStyle='#280307';c.lineWidth=10;c.stroke();c.strokeStyle='#6b1017';c.lineWidth=6+rng()*2;c.stroke();}
    // Start rivulets on the actual letter strokes, so they visibly bleed downward.
    const anchors=strokes.flat().filter(([,y])=>y>=.5);
    if(anchors.length)for(let j=0;j<2;j++){const [x,y]=anchors[Math.floor(rng()*anchors.length)];drip(c,x*gap*.64,y*103,35+rng()*133,1.5+rng()*2.4);}
    c.restore();
   }
   for(let i=0;i<40;i++){c.beginPath();c.arc(rng()*768,40+rng()*160,1+rng()*2,0,Math.PI*2);c.fill();}
  });
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(...size),bloodMaterial(map));panel.name='study-blood-writing';panel.position.set(...p);panel.rotation.y=rotation;panel.userData.np=panel.userData.ns=1;add(panel);
 };
 // Flavor only: no answers, new dependencies or interaction IDs.
 writing('IT LISTENS',[0,3.22,4.325],[2.4,.8],Math.PI);
 writing('STAY QUIET',[-4.22,1.72,-1.2],[1.8,.85],Math.PI/2);
 const mist=createStudyMist(E,[[3.6,.4,3.2,2.8,.8],[-3.8,.4,-2.2,2.3,.65],[2.8,.35,-2.7,2.1,.7],[1.45,1.55,-.95,.22,.7],[-1.35,1.55,-1.5,.2,.65]],{name:'study-interior-mist',color:0x9b928c,opacity:.22});add(mist);
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 E.anim(t=>{if(!reduced&&!E._studyState?.paused){mist.position.x=Math.sin(t*.09)*.06;mist.position.y=Math.sin(t*.12)*.025;}});
}

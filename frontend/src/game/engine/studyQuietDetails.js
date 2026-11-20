import * as THREE from 'three';

function canvasTexture(w,h,draw){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'));const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;}
export function buildStudyQuietDetails(E,{add}){
 const refs=E.ref.studyQuiet={};
 const soft=canvasTexture(128,128,c=>{const g=c.createRadialGradient(64,64,5,64,64,63);g.addColorStop(0,'rgba(0,0,0,.95)');g.addColorStop(.55,'rgba(0,0,0,.7)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});
 const feet=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:soft,transparent:true,depthWrite:false,opacity:.9}),2);feet.name='study-door-foot-shadows';feet.userData.np=feet.userData.ns=1;refs.feet=feet;add(feet);
 for(let i=0;i<2;i++){const m=new THREE.Matrix4().makeRotationX(-Math.PI/2);m.scale(new THREE.Vector3(.19,.43,1));m.setPosition(i?.2:-.2,.023,-4.1);feet.setMatrixAt(i,m);}feet.instanceMatrix.needsUpdate=true;feet.computeBoundingSphere();
 const gap=canvasTexture(128,128,c=>{const g=c.createRadialGradient(64,64,2,64,64,63);g.addColorStop(0,'rgba(255,255,255,.65)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});
 const leak=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.65),new THREE.MeshBasicMaterial({map:gap,color:0x796547,transparent:true,opacity:.2,depthWrite:false}));leak.name='study-door-light-gap';leak.position.set(0,.016,-4.04);leak.rotation.x=-Math.PI/2;leak.userData.np=leak.userData.ns=1;refs.leak=leak;add(leak);
 const printMap=canvasTexture(128,256,c=>{
  c.fillStyle='#4b0710';c.beginPath();c.ellipse(66,204,27,32,-.1,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(43,186);c.bezierCurveTo(73,177,40,137,34,118);c.bezierCurveTo(25,88,45,56,78,55);c.bezierCurveTo(109,56,111,95,92,132);c.bezierCurveTo(75,156,100,177,88,201);c.fill();
  for(const [x,y,r]of [[91,35,14],[65,28,11],[43,33,9],[25,44,8],[15,62,7]]){c.beginPath();c.ellipse(x,y,r,r*1.2,0,0,Math.PI*2);c.fill();}
  c.globalCompositeOperation='destination-out';for(let i=0;i<90;i++){c.beginPath();c.arc((Math.sin(i*71)+1)*64,(Math.cos(i*23)+1)*128,.5+(i%3),0,Math.PI*2);c.fill();}
 });
 const prints=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({map:printMap,transparent:true,alphaTest:.04,depthWrite:false,roughness:.4,polygonOffset:true,polygonOffsetFactor:-2}),8);
 prints.name='study-bloody-footprints';prints.count=0;prints.userData.np=prints.userData.ns=1;refs.prints=prints;add(prints);
}

export function createStudyQuietDetails(E,{reduced=false}={}){
 let shadowTime=0,shadowRetreated=false,bodyStage='waiting',bodyTime=0,lookedAway=false,bodyScale=null,poolCrossed=false,trailStarted=false,trailTime=0,lastPoint=null,printCount=0,still=0;const trail=[];
 const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),point=new THREE.Vector3();
 const pools=[[2.9,3.35],[-1.6,-2.9],[2.6,.8],[-3.55,-1.2]];
 const watching=(x,y,z)=>{if(!E.cam)return false;const target=new THREE.Vector3(x,y,z).sub(E.cam.position),forward=E.cam.getWorldDirection(new THREE.Vector3());return target.length()<5&&forward.dot(target.normalize())>.82;};
 return {
  tick(dt){
   const r=E.ref.studyQuiet||{},x=E.px?.()||0,z=E.pz?.()||0;
   if(r.feet){
    if(!shadowRetreated&&Math.hypot(x,z+4.34)<2.35){shadowRetreated=true;E.audio?.playClip?.('processionSteps',{channel:'subtle',volume:.075,limitSeconds:1.05,fadeOutSeconds:.4,pan:-.1});}
    if(shadowRetreated)shadowTime=Math.min(3,shadowTime+dt);
    const amount=1-shadowTime/3,closed=!E.ref.studyExitDoor?.isOpen&&!E.ref.studyExitDoor?.scriptOpen;
    r.feet.visible=closed&&amount>0;r.leak.visible=closed;r.feet.material.opacity=.9*amount;
    for(let i=0;i<2;i++){rotation.setFromEuler(new THREE.Euler(-Math.PI/2,0,0));scale.set(.19,.43*Math.max(.05,amount),1);point.set(i? .2:-.2,.023,-4.1-.18*(1-amount));matrix.compose(point,rotation,scale);r.feet.setMatrixAt(i,matrix);}r.feet.instanceMatrix.needsUpdate=true;r.feet.computeBoundingSphere();
   }
   const body=r.body;
   if(body){
    bodyScale??=body.scale.clone();const near=Math.hypot(x-body.position.x,z-body.position.z)<4,seen=watching(body.position.x,.15,body.position.z);
    if(bodyStage==='waiting'&&near&&seen){bodyStage='breathing';bodyTime=0;}
    if(bodyStage==='breathing'){
     bodyTime+=dt;body.scale.y=bodyScale.y*(1+(reduced?0:.17*Math.sin(Math.PI*Math.min(1,bodyTime/5))));
     if(bodyTime>=5){body.scale.copy(bodyScale);bodyStage='later';bodyTime=0;}
    }else if(bodyStage==='later'){
     bodyTime+=dt;if(!seen)lookedAway=true;
     if(bodyTime>=9&&lookedAway&&seen&&E.ref.studyProcession?.hand){E.ref.studyProcession.hand.visible=true;bodyStage='revealed';}
    }
   }
   const nearPool=pools.some(([px,pz])=>Math.hypot(px-x,pz-z)<.85);
   if(nearPool)poolCrossed=true;
   if(poolCrossed&&!nearPool&&!trailStarted){trailStarted=true;lastPoint={x,z};}
   if(trailStarted&&r.prints&&!printCount){
    trailTime+=dt;
    if(lastPoint&&Math.hypot(x-lastPoint.x,z-lastPoint.z)>.65){
     trail.push({...lastPoint,yaw:Math.atan2(x-lastPoint.x,z-lastPoint.z)});if(trail.length>8)trail.shift();lastPoint={x,z};still=0;
    }else still+=dt;
    if(trailTime>=6&&trail.length&&(still>=1||trailTime>=12)){
     for(const step of trail){const side=printCount%2?.1:-.1;
      point.set(step.x+Math.cos(step.yaw)*side,.026,step.z-Math.sin(step.yaw)*side);rotation.setFromEuler(new THREE.Euler(-Math.PI/2,0,Math.PI+step.yaw));matrix.compose(point,rotation,new THREE.Vector3(.15,.31,1));r.prints.setMatrixAt(printCount++,matrix);
     }r.prints.count=printCount;r.prints.instanceMatrix.needsUpdate=true;r.prints.computeBoundingSphere();
    }
   }
  },
  dispose(){if(bodyScale&&E.ref.studyQuiet?.body)E.ref.studyQuiet.body.scale.copy(bodyScale);}
 };
}

// Adapt the canvas quickly to sustained slow views; restore detail more conservatively.
export function createStudyQuality(renderer,nativeRatio=1,low=false){
 let frames=0,total=0,fastFrames=0,ratio=nativeRatio;const minimum=Math.min(low?.5:.6,nativeRatio);
 const set=next=>{if(Math.abs(next-ratio)>.001){ratio=Math.round(next*100)/100;renderer.setPixelRatio(ratio);}};
 return {tick(frameMs,suspended=false){
  if(suspended||frameMs<=0||frameMs>120){frames=total=fastFrames=0;return;}
  fastFrames=frameMs<18?fastFrames+1:0;
  if(fastFrames>=180){set(Math.min(nativeRatio,ratio+.05));fastFrames=0;}
  total+=frameMs;
  if(++frames>=45){const average=total/frames;frames=total=0;if(average>28){set(Math.max(minimum,ratio-.1));fastFrames=0;}}
 }};
}

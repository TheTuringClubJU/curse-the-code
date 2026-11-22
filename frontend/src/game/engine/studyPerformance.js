import {DoubleSide} from 'three';

function readLowDetailPref(queryParam, storageKey, defaultLow = false) {
 const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
 if (query?.has(queryParam)) return query.get(queryParam) === 'low';
 try {
  const saved = localStorage.getItem(storageKey);
  if (saved === 'low') return true;
  if (saved === 'balanced') return false;
 } catch { /* query still selects the mode */ }
 return Boolean(defaultLow);
}

// Room-owned preferences; other rooms keep their existing renderer and assets.
export function isStudyLowDetail(){
 return readLowDetailPref('studyQuality', 'ctc.study.quality', false);
}
export function studyQualityUrl(low){const url=new URL(window.location.href);url.searchParams.set('studyQuality',low?'low':'balanced');return url.href;}
export function rememberStudyQuality(low){try{localStorage.setItem('ctc.study.quality',low?'low':'balanced');}catch{/* query still selects the mode */}}

export function isBedroomLowDetail(){
 const hwCores = typeof navigator !== 'undefined' && Number(navigator.hardwareConcurrency) > 0 ? Number(navigator.hardwareConcurrency) : 8;
 const devMem = typeof navigator !== 'undefined' && Number(navigator.deviceMemory) > 0 ? Number(navigator.deviceMemory) : 8;
 return readLowDetailPref('bedroomQuality', 'ctc.bedroom.quality', hwCores <= 4 || devMem <= 4);
}
export function rememberBedroomQuality(low){try{localStorage.setItem('ctc.bedroom.quality',low?'low':'balanced');}catch{/* ignore storage failures */}}

// A single transmissive lens forces Three.js to redraw the entire room into a
// multisampled refraction buffer every frame. Tinted alpha is sufficient here.
export function optimizeStudyMaterials(root){
 const materials=new Set();
 root.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});
 for(const m of materials){
  if(m.transmission>0){m.transmission=0;m.thickness=0;m.clearcoat=0;m.transparent=true;m.opacity=Math.min(m.opacity,.18);m.depthWrite=false;m.needsUpdate=true;}
  if(m.transparent&&m.side===DoubleSide)m.forceSinglePass=true;
 }
}

export function capStudyTextures(root,limit=512){
 const textures=new Set(),resized=new Map(),oldImages=new Set();
 root.traverse(o=>{for(const material of Array.isArray(o.material)?o.material:[o.material])if(material)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);});
 for(const texture of textures){
  const image=texture.image,w=image?.width,h=image?.height;if(!w||!h||Math.max(w,h)<=limit)continue;
  let canvas=resized.get(image);
  if(!canvas){const scale=limit/Math.max(w,h);canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);resized.set(image,canvas);oldImages.add(image);}
  texture.image=canvas;texture.needsUpdate=true;
 }
 // All texture references have been replaced before releasing shared ImageBitmaps.
 for(const image of oldImages)image.close?.();
}

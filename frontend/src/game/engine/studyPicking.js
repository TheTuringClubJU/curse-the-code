import * as THREE from 'three';
// Cheap world-space bounds reject most dense furniture before triangle-level picking.
export function createStudyPicker(){
 const bounds=new THREE.Box3(),hit=new THREE.Vector3(),candidates=[];
 return {intersect(raycaster,objects){
  candidates.length=0;
  for(const object of objects){
   const geometry=object.geometry;if(!geometry)continue;
   if(!geometry.boundingBox)geometry.computeBoundingBox();
   bounds.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld);
   if(!bounds.containsPoint(raycaster.ray.origin)){
    if(!raycaster.ray.intersectBox(bounds,hit)||hit.distanceTo(raycaster.ray.origin)>raycaster.far)continue;
   }
   candidates.push(object);
  }
  return raycaster.intersectObjects(candidates,false);
 }};
}

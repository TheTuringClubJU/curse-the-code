import {it,expect,vi,afterEach} from 'vitest';
import * as THREE from 'three';
import {capStudyTextures,isStudyLowDetail,studyQualityUrl,rememberStudyQuality,optimizeStudyMaterials} from '../game/engine/studyPerformance.js';
import {createStudyQuality} from '../game/engine/studyQuality.js';
afterEach(()=>{localStorage.removeItem('ctc.study.quality');window.history.replaceState({},'','/');vi.restoreAllMocks();});
it('lets an explicit URL override the saved Study graphics preference without touching game progress',()=>{
 rememberStudyQuality(true);expect(isStudyLowDetail()).toBe(true);window.history.replaceState({},'','/?studyQuality=balanced');expect(isStudyLowDetail()).toBe(false);
 const url=new URL(studyQualityUrl(true));expect(url.searchParams.get('studyQuality')).toBe('low');expect(url.pathname).toBe('/');
});
it('caps oversized shared textures once, preserves aspect and releases replaced ImageBitmaps safely',()=>{
 const root=new THREE.Group(),image={width:2048,height:1024,close:vi.fn()},texture=new THREE.Texture(image),small=new THREE.Texture({width:128,height:64});
 root.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:texture,normalMap:texture})));root.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:texture,roughnessMap:small})));
 capStudyTextures(root);expect(texture.image.width).toBe(512);expect(texture.image.height).toBe(256);expect(small.image.width).toBe(128);expect(image.close).toHaveBeenCalledOnce();
});
it('provides a lower resolution floor for old PCs while retaining the Balanced floor',()=>{
 const old={setPixelRatio:vi.fn()},balanced={setPixelRatio:vi.fn()},low=createStudyQuality(old,.85,true),normal=createStudyQuality(balanced,1);
 for(let i=0;i<500;i++){low.tick(50);normal.tick(50);}expect(old.setPixelRatio).toHaveBeenLastCalledWith(.5);expect(balanced.setPixelRatio).toHaveBeenLastCalledWith(.6);
});
it('removes the full-scene refraction pass while retaining transparent glass and opaque prop detail',()=>{
 const root=new THREE.Group(),glass=new THREE.MeshPhysicalMaterial({transmission:1,clearcoat:1,thickness:.2,side:THREE.DoubleSide}),wood=new THREE.MeshStandardMaterial({roughness:.8,map:new THREE.Texture()}),flame=new THREE.MeshStandardMaterial({transparent:true,side:THREE.DoubleSide});
 root.add(new THREE.Mesh(new THREE.BoxGeometry(),glass),new THREE.Mesh(new THREE.BoxGeometry(),wood),new THREE.Mesh(new THREE.PlaneGeometry(),flame));optimizeStudyMaterials(root);
 expect(glass.transmission).toBe(0);expect(glass.transparent).toBe(true);expect(glass.opacity).toBe(.18);expect(glass.depthWrite).toBe(false);expect(glass.forceSinglePass).toBe(true);expect(flame.forceSinglePass).toBe(true);expect(wood.roughness).toBe(.8);expect(wood.map.isTexture).toBe(true);expect(wood.transparent).toBe(false);
});

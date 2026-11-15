import {it,expect} from 'vitest';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
const directory=resolve(process.cwd(),'public/assets/models/study');
const glb=name=>{const b=readFileSync(join(directory,name));expect(b.toString('ascii',0,4)).toBe('glTF');expect(b.readUInt32LE(4)).toBe(2);expect(b.readUInt32LE(8)).toBe(b.length);return JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));};
it('keeps all runtime Study GLBs including the torch within a 20 MB download budget',()=>{
 const files=readdirSync(directory).filter(f=>f.endsWith('.glb'));expect(files.length).toBeGreaterThan(30);
 const sizes=files.map(f=>statSync(join(directory,f)).size);expect(sizes.reduce((a,b)=>a+b,0)).toBeLessThanOrEqual(20_000_000);expect(Math.max(...sizes)).toBeLessThan(4_000_000);
 for(const file of files)glb(file);
});
it('retains the downloaded books, cable and bin nodes selected by the scene',()=>{
 expect(glb('12_old_books.glb').nodes.filter(n=>n.mesh!==undefined).map(n=>n.name).sort()).toEqual(['Book12_Book12_0','Book3_Book3_0','Book7_Book7_0']);
 expect(glb('modular_electric_cables.glb').nodes.filter(n=>n.mesh!==undefined).map(n=>n.name)).toEqual(['cable_double_uturn']);
 expect(glb('metal_trash_can.glb').nodes.filter(n=>n.mesh!==undefined).map(n=>n.name)).toContain('metal_trash_can_rust');
});
it('preserves all complementary watcher parts and the interactive screen mesh',()=>{
 expect(glb('white_ghost-like_figure_with_bloodstain.glb').meshes).toHaveLength(4);
 const screenNames=glb('retro_ibm_pc.glb').nodes.map(n=>n.name?.replace(/[.]/g,''));expect(screenNames).toContain('Cube001__0');
});
it('caps the geometry cost of repeated foliage and the window watcher',()=>{
 for(const [file,limit]of [['tree_small_02.glb',40_000],['tree_small_02_far.glb',10_000],['white_ghost-like_figure_with_bloodstain.glb',60_000]]){
  const d=glb(file),triangles=d.meshes.reduce((total,m)=>total+m.primitives.reduce((sum,p)=>sum+(p.indices===undefined?d.accessors[p.attributes.POSITION].count:d.accessors[p.indices].count)/3,0),0);
  expect(triangles,file).toBeLessThanOrEqual(limit);
 }
});

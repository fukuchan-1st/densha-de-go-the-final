import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {opposingVehicle} from '../dist/opposing-models.js';
test('指定路線と高尾の境界で対向列車を選び、野岩鉄道では出さない',()=>{
 for(const [route,vehicle]of [['yamanote','e235'],['osaka','323'],['tokaido','221'],['tohoku','701'],['yagan',null]])assert.equal(opposingVehicle({id:route},1000),vehicle);
 const r={id:'chuo-extended',sceneryStations:[{name:'高尾',s:53000}]};assert.equal(opposingVehicle(r,52999),'e233');assert.equal(opposingVehicle(r,53001),'211');
 assert.equal(opposingVehicle({id:'shinonoi-extended'},1000),'211');
});
test('提供された6車種の車体・機器・テクスチャを欠けなく内蔵する',async()=>{
 const root=new URL('../dist/assets/opposing/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 assert.equal(Object.keys(manifest.models).length,6);
 for(const [id,model]of Object.entries(manifest.models))for(const [role,part]of Object.entries(model.variants)){
  const file=await readFile(new URL(part.file,root));assert.equal(file.length,part.vertices*32);
  const [lo,hi]=part.bounds;assert.ok(hi[0]-lo[0]<4,`${id} ${role} 車幅`);assert.ok(hi[1]-lo[1]<6);assert.ok(hi[2]-lo[2]<23);
  const floats=new Float32Array(file.buffer,file.byteOffset,file.length/4);assert.ok(floats.every(Number.isFinite));
  for(const group of part.groups){assert.ok(group.start+group.count<=part.vertices);if(group.material.texture)assert.ok((await stat(new URL(group.material.texture,root))).size>0);}
 }
});

import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {gzipSync,gunzipSync} from 'node:zlib';
import * as T from '../dist/assets/vendor/three.module.js';import {decodeBuildingRows,mappedBuildingClear,loadMappedBuildings} from '../dist/mapped-buildings.js';
import {sliceRoute,reverseRoute,joinRoutes} from '../dist/service-routes.js';
import {valleyWidth} from '../dist/geographic-sections.js';
const route={id:'yamanote',length:1000,stations:[{name:'A',s:0},{name:'B',s:1000}],points:[[0,0,0,0],[1000,0,1000,0]],mappedBuildings:[[100,30,100,8,12,0,7]]};
test('compact building coordinates decode against the source geometry and retain mapped orientation',()=>{assert.deepEqual(decodeBuildingRows(route,[[1000,300,0,80,120,1570,70]]),[[100,30,100,8,12,1.57,7]]);});
test('buildings stay at the same physical position when services reverse, slice or connect',()=>{
 const reversed=reverseRoute(route);assert.deepEqual(reversed.mappedBuildings[0],[900,30,100,8,12,0,7]);
 const sliced=sliceRoute({...route,stations:[{name:'A',s:0},{name:'X',s:50},{name:'B',s:1000}]},'X','B');assert.equal(sliced.mappedBuildings[0][0],50);assert.equal(sliced.mappedBuildings[0][1],30);
 const joined=joinRoutes([route,route],'joined','joined');assert.equal(joined.mappedBuildings.length,2);assert.equal(joined.mappedBuildings[1][0],1100);assert.ok(Math.abs(joined.mappedBuildings[1][1]-1100)<1e-8);assert.ok(Math.abs(joined.mappedBuildings[1][2]+30)<1e-8);
});
test('mapped footprints are rejected on either running rail, including rotated rectangles',()=>{
 const world={route,length:1000,railTracks:[{knots:[[0,0],[1000,0]]},{knots:[[0,4.2],[1000,4.2]]}],frame:(s,x=0)=>({p:new T.Vector3(x,0,-s),right:new T.Vector3(1,0,0),dir:new T.Vector3(0,0,-1),angle:0})};
 assert.equal(mappedBuildingClear(world,[100,0,100,8,12,0,7]),false);
 assert.equal(mappedBuildingClear(world,[100,4.2,100,8,12,.5,7]),false);
 assert.equal(mappedBuildingClear(world,[100,30,100,8,12,0,7]),true);
});
test('all 19 real source corridors contain compact mapped buildings while fictional routes stay excluded',async()=>{
 const base=new URL('../dist/assets/buildings/',import.meta.url),coverage=JSON.parse(await readFile(new URL('coverage.json',base),'utf8'));
 assert.equal(Object.keys(coverage.routes).length,19);assert.ok(!Object.keys(coverage.routes).some(id=>id==='toho'||id.startsWith('toho-')));
 for(const [id,entry]of Object.entries(coverage.routes)){
  assert.ok(entry.buildings>0,id);const data=JSON.parse(gunzipSync(await readFile(new URL(id+'.json.gz',base))));assert.equal(data.encoding,'decimetre-center-delta-v1');assert.equal(data.rows.length,entry.buildings);
  let previous=-Infinity;for(const row of data.rows){assert.equal(row.length,8);assert.ok(row[7]===0||row[7]===1);assert.ok(row.every(Number.isFinite));assert.ok(row[0]>=previous);previous=row[0];assert.ok(row[3]>=20&&row[4]>=20&&row[6]>=20);}
 }
});
test('building downloads are shared, decoded and include Tohoku without treating it as fictional Toho',async()=>{
 const original=globalThis.fetch;let requests=0;try{globalThis.fetch=async()=>{requests++;return new Response(gzipSync(JSON.stringify({rows:[[1000,300,0,80,120,0,70]],source:'OpenStreetMap',bufferM:150})));};
 const [a,b]=await Promise.all([loadMappedBuildings({...route,id:'tohoku',mappedBuildings:undefined}),loadMappedBuildings({...route,id:'tohoku',mappedBuildings:undefined})]);assert.equal(requests,1);assert.equal(a.mappedBuildings.length,1);assert.deepEqual(a.mappedBuildings,b.mappedBuildings);
 const fiction=await loadMappedBuildings({...route,id:'toho'});assert.equal(fiction.id,'toho');assert.equal(requests,1);
 }finally{globalThis.fetch=original;}
});
test('Yamagata hills rise gradually after Niwasaka in both directions',async()=>{
 const r=JSON.parse(await readFile(new URL('../dist/assets/final/yamagata-route.json',import.meta.url),'utf8'));
 for(const route of [r,reverseRoute(r)]){const station=route.stations.find(st=>st.name==='庭坂'),sign=route.reverseDirection?-1:1;
  assert.equal(valleyWidth(route,station.s),150);const halfway=valleyWidth(route,station.s+sign*750);assert.ok(halfway>90&&halfway<105);assert.equal(valleyWidth(route,station.s+sign*1500),45);
 }
});

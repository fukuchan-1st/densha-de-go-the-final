import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {reverseRoute,sliceRoute} from '../dist/service-routes.js';
import {buildConnectingRoutes} from '../dist/service-catalog.js';
const base=new URL('../dist/assets/',import.meta.url),read=name=>JSON.parse(fs.readFileSync(new URL(name,base))),coverage=read('road-coverage.json');
test('all source route corridors include actual OSM roads and a complete extraction record',()=>{
 for(const corridor of coverage.corridors){
  assert.equal(corridor.status,'fetched',corridor.route);assert.equal(corridor.start,0);assert.ok(corridor.end>0);
  const data=JSON.parse(gunzipSync(fs.readFileSync(new URL('roads/'+corridor.route+'.json.gz',base))));assert.ok(data.roads.length>0,corridor.route);assert.equal(data.roads.length,coverage.segments[corridor.route]);
  for(const road of data.roads){assert.equal(road.source,'OpenStreetMap');assert.ok(road.osmWayId>0);assert.ok(road.s>=0&&road.s<=corridor.end+.1,corridor.route);assert.ok(road.points.length>=2);assert.ok(road.points.flat().every(Number.isFinite));}
 }
 for(const id of ['yamanote','chuo','osaka','tokaido','yagan','chuo-extended','shinonoi-extended','chuo-kofu','chuo-shinshu','shinonoi','oito','ome','ome-okutama','itsukaichi','tohoku'])assert.ok(coverage.corridors.some(c=>c.route===id),id);
});
test('road corridors survive reverse, partial duties and through-service coordinate transforms',()=>{
 const routes=new Map();for(const id of ['chuo-extended','shinonoi-extended','chuo-kofu','chuo-shinshu','shinonoi','oito','ome','ome-okutama','itsukaichi']){const r=read('final/'+id+'-route.json');r.roads=JSON.parse(gunzipSync(fs.readFileSync(new URL('roads/'+id+'.json.gz',base)))).roads;routes.set(id,r);}
 const r=routes.get('oito'),rev=reverseRoute(r);assert.equal(rev.roads.length,r.roads.length);assert.equal(rev.roads[0].s,r.length-r.roads[0].s);assert.deepEqual(rev.roads[0].points,r.roads[0].points);
 const part=sliceRoute(r,r.stations[1].name,r.stations.at(-2).name);assert.ok(part.roads.length>0);assert.ok(part.roads.every(x=>x.s>=0&&x.s<=part.length));
 for(const [id,joined]of buildConnectingRoutes(routes)){assert.ok(joined.roads.length>0,id);assert.ok(joined.roads.every(x=>x.points.flat().every(Number.isFinite)),id);}
});

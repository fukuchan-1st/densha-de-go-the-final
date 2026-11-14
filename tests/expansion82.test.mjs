import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {loadServiceRoutes} from './service-fixture.mjs';
import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';
import {resolveScoreSchedule} from '../dist/scoring.js';
import {scheduledBoardingDelay} from '../dist/published-schedules.js';
import {hillsideSurfaceHeight} from '../dist/yagan-scenery.js';
import {villageAt,addTohoHouses,tohoTerrainHeight} from '../dist/toho-scenery.js';
import {RealTrees} from '../dist/real-trees.js';
import * as T from '../dist/assets/vendor/three.module.js';
import {sampleRouteCurve} from '../dist/route-curve.js';
const routes=await loadServiceRoutes();
test('fictional route distances follow the workbook and all three branches offer both vehicles and directions',()=>{
 assert.equal(routes.get('toho').length,71400);assert.equal(routes.get('toho-village').length,3480);assert.equal(routes.get('toho-center').length,4000);
 assert.equal(serviceChoices.toho.length,12);
 for(const choice of serviceChoices.toho){const r=makeServiceRoute(routes.get(choice[0]),...choice.slice(1));assert.equal(r.trafficSections[0].tracks,1);assert.equal(r.neighborTracks.length,0);assert.ok(r.stations.length>=2);}
 const center=routes.get('toho-center');assert.equal(center.structures[0].sStart,100);assert.ok(center.structures[0].sEnd>center.length);
});
test('fictional station approaches are straight and all intervening bends stay gentle',()=>{
 for(const id of ['toho','toho-village','toho-center']){const r=routes.get(id),heading=s=>{const a=sampleRouteCurve(r.points,s-3),b=sampleRouteCurve(r.points,s+3);return Math.atan2(b[1]-a[1],b[0]-a[0]);},angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  for(const st of r.stations)for(const offset of [-200,-100,0,100])assert.ok(Math.abs(angle(heading(st.s+offset),heading(st.s)))<.0002,`${id} ${st.name} approach ${offset}`);
  for(let s=50;s<r.length-50;s+=25)assert.ok(Math.abs(angle(heading(s+10),heading(s-10)))/20<1/600,`${id} tight curve at ${s}`);
 }
});
test('terrain from a neighboring bend cannot bury the route, and railfan trees follow the filming location',()=>{
 const r={id:'toho',points:[[0,0,0,0],[1000,1000,0,0]]};assert.equal(tohoTerrainHeight(r,{x:300,z:0},40),-.25);assert.equal(tohoTerrainHeight(r,{x:300,z:400},40),40);
 const trees=Object.create(RealTrees.prototype);trees.world={drawDistance:500,quality:'standard',driveOffset:()=>0,frame:(s,x)=>({p:new T.Vector3(x,0,s)})};
 const mesh=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshBasicMaterial(),2),batch={meshes:[{mesh,detail:0,selected:[{s:4000,x:15,y:0,h:8}]}]};
 trees.fill(batch,0,0);assert.equal(mesh.count,0);trees.fill(batch,0,4000);assert.equal(mesh.count,1);mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();
});
test('village scenery stays geographic in both directions and contains low wooden houses rather than office blocks',()=>{
 const r=routes.get('toho');for(const reverse of [false,true]){const q=makeServiceRoute(r,'211','普通',{pattern:'all',reverse}),at=name=>q.stations.find(x=>x.name===name).s;
  assert.equal(villageAt(q,at('人里')),true);assert.equal(villageAt(q,at('霧雨')),true);assert.equal(villageAt(q,at('命蓮寺')),true);assert.equal(villageAt(q,at('紅魔')),false);
 }
 const batches=[];addTohoHouses({route:routes.get('toho-village'),quality:'standard',structureAt:()=>null,stationNear:()=>({d:5000}),instances:(_,items,color)=>batches.push({items,color}),houseRoof:{}},{},0,170,()=>[0,0],()=>.5);
 const bodies=batches.filter(x=>x.color.startsWith('toho-wood:')).flatMap(x=>x.items);assert.ok(bodies.length>=50);assert.ok(bodies.every(x=>x.h<7));
});
test('published Tokaido Shinano departures and the full station stop pattern are retained',()=>{
 for(const x of serviceChoices.tokaido.filter(x=>x[1]==='383')){const r=makeServiceRoute(routes.get(x[0]),...x.slice(1)),schedule=resolveScoreSchedule(r,0,{maxSpeedKmh:130});assert.deepEqual(r.stations.map(x=>x.name),x[3].reverse?['大阪','新大阪','京都']:['京都','新大阪','大阪']);assert.equal(r.stations[0].departure,x[3].reverse?8*3600+58*60:18*3600+50*60);assert.equal(schedule.clockStart,r.stations[0].departure-30);assert.equal(schedule.adjustments.length,0);}
});
test('Tatsuno branch connects without skipping Kawagishi and the Misuzu dwell at Okaya lasts until 08:08',()=>{
 const r=makeServiceRoute(routes.get('tatsuno-nagano'),'211','普通みすず',{pattern:'all'}),q=resolveScoreSchedule(r,0,{maxSpeedKmh:100});assert.deepEqual(r.stations.slice(0,4).map(x=>x.name),['辰野','川岸','岡谷','みどり湖']);
 const index=r.stations.findIndex(x=>x.name==='岡谷'),station=r.stations[index];assert.equal(q.planningSpec.departureTimes[station.s],8*3600+8*60);
 const state={next:index,startingDeparture:false,clockStart:8*3600,elapsed:0,scoreVehicleSpec:q.planningSpec};assert.equal(scheduledBoardingDelay(state,r),475);state.elapsed=475;assert.equal(scheduledBoardingDelay(state,r),0);
});
test('partial Azusa journeys infer the actual direction and their first clock instead of restarting at 08:00',()=>{
 for(const x of serviceChoices.chuo.filter(x=>x[0]==='chuo-kofu'&&x[1]==='e353')){const r=makeServiceRoute(routes.get(x[0]),...x.slice(1)),q=resolveScoreSchedule(r,0,{maxSpeedKmh:130});assert.equal(r.publishedSchedule.id,r.stations[0].name==='甲府'?'azusa4':'azusa41');assert.notEqual(q.clockStart,28800);assert.equal(q.adjustments.some(x=>x.seconds>300),false);}
});
test('wide Matsumoto basins plant trees on the rendered surface and model cabs use corrected ends',async()=>{
 const route={id:'chuo-extended',stations:[{name:'松本',s:0},{name:'南松本',s:1000}]};assert.ok(Math.abs(hillsideSurfaceHeight(50,32,0,100,route)+.25)<1e-8);
 const data=JSON.parse(await readFile(new URL('../dist/assets/opposing/manifest.json',import.meta.url),'utf8'));assert.equal(data.models.e127.frontRotation,0);assert.equal(data.models.e353.tailRotation,0);
});

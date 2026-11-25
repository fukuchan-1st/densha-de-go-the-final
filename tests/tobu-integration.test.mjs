import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {assembleTobuRoutes} from '../dist/tobu-routes.js';
import {makeServiceRoute,serviceChoices} from '../dist/train-selection.js';
import {formationCount} from '../dist/formation-operations.js';
import {resolveScoreSchedule} from '../dist/scoring.js';
const json=name=>JSON.parse(fs.readFileSync(new URL('../dist/assets/final/'+name,import.meta.url),'utf8'));
const parts=Object.fromEntries(['tobu-skytree','tobu-nikko','tobu-kinugawa','aizu'].map(id=>{const r=json(id+'-route.json'),g=JSON.parse(gunzipSync(fs.readFileSync(new URL('../dist/assets/final/'+id+'-geography.json.gz',import.meta.url))));return [id,{...r,roads:g.roads,mappedBuildings:g.mappedBuildings}];}));
const yagan=json('yagan-route.json');yagan.mappedBuildings=[];
const joined=assembleTobuRoutes(parts,yagan),routes=new Map([['yagan',yagan],['tobu-aizu',joined.main],['tobu-nikko',joined.nikko]]);
const choice=n=>{const [id,...rest]=serviceChoices.yagan[n-1];return makeServiceRoute(routes.get(id),...rest);};
test('all21 service choices construct with intact geography and finite increasing stops',()=>{
 assert.equal(serviceChoices.yagan.length,21);
 for(let n=1;n<=21;n++){const r=choice(n);assert.ok(r.stations.length>1);assert.ok(r.stations.every((s,i,a)=>Number.isFinite(s.s)&&(!i||s.s>a[i-1].s)));assert.equal(r.stations[0].s,0);assert.ok(r.points.every(p=>p.every(Number.isFinite)));if(n!==15&&n!==16){assert.ok(r.mappedBuildings.length);assert.equal(r.stations[0].name,r.tobuScenario.start);assert.equal(r.stations.at(-1).name,r.tobuScenario.end);}}
});
test('6050 coupling takes effect at departure and at intermediate free starts',()=>{
 for(const [n,initial,counts]of [[8,6,[4,2]],[9,2,[4,6]]]){const r=choice(n);assert.equal(formationCount(r,{startIndex:0,next:1,s:0}),initial);let previous=initial;for(const [i,change]of r.tobuScenario.formationChanges.entries()){const index=r.stations.findIndex(s=>s.name===change.station),s=r.stations[index].s;assert.equal(formationCount(r,{startIndex:0,next:index,s}),previous);assert.equal(formationCount(r,{startIndex:0,next:index+1,s}),counts[i]);assert.equal(formationCount(r,{startIndex:index,next:index+1,s}),counts[i]);previous=counts[i];}}
});
test('70000 starts on the elevated Hibiya platform;20400 has18m spacing',()=>{
 const r=choice(5);assert.equal(r.stations[0].name,'北千住');assert.equal(r.stations[0].platformNumber,6);assert.equal(r.stations[0].stationFloor,3);const before=r.elevatedTrack.findLast(k=>k[0]<=0),after=r.elevatedTrack.find(k=>k[0]>=0);assert.equal(before[1],10.7);assert.equal(after[1],10.7);assert.ok(r.limits.some(x=>x.kmh===60));assert.equal(choice(10).carLengthM,18);
});
test('estimated local timetable includes25second dwells at every intermediate stop',()=>{
 const r=choice(4),result=resolveScoreSchedule(r,0,{maxSpeedKmh:100,startingAccelerationKmhPerSecondApprox:2.5});assert.ok(result.timetable.every(x=>Number.isFinite(x.time)));for(const st of result.timetable.slice(1,-1)){if(st.stop)assert.ok(result.planningSpec.departureTimes[st.s]>=st.time+24.99);}
});

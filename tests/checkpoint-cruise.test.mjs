import {loadServiceRoutes} from './service-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCheckpoints,resolveScoreSchedule,observeScoreDeparture,checkpointSectionPlan,sectionSpeedPlan} from '../dist/scoring.js';
import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';
import {readFile} from 'node:fs/promises';
test('戸閉音の長さや発車操作待ちを、架空の25秒停車として扱わない',()=>{
 const state={s:0,v:0,doors:true,clockStart:30000,elapsed:0},stations=[{s:0,stop:true}];
 assert.equal(observeScoreDeparture(state,stations),false);state.doors=false;state.elapsed=7;
 assert.equal(observeScoreDeparture(state,stations),false);state.v=.1;state.elapsed=8;
 assert.equal(observeScoreDeparture(state,stations),true);assert.equal(state.scoreDepartureTimes[0],30008);
 assert.equal(observeScoreDeparture(state,stations),false);
 const p=sectionSpeedPlan({s:0,time:30000,stop:true},{s:3000,time:30200,stop:true},[],{departureTimes:state.scoreDepartureTimes});
 assert.equal(p.departure,30008);
});
test('定速から定通まで同じ指定速度を維持でき、次駅にも3秒以内で着く',()=>{
 const a={s:0,time:0,stop:true},b={s:10000,time:420,stop:true},spec={maxSpeedKmh:120,startingAccelerationKmhPerSecondApprox:2.8};
 const pair=checkpointSectionPlan(a,b,[],spec);assert.ok(pair);
 for(let i=pair.begin;i<=pair.end;i++)assert.ok(Math.abs(pair.plan.speeds[i]*3.6-pair.target)<.001);
 const points=makeCheckpoints([b],[],0,0,spec),speed=points.find(p=>p.kind==='speed'),time=points.find(p=>p.kind==='time');
 assert.ok(Math.abs(speed.speedPointTime+(time.s-speed.s)/(speed.target/3.6)-time.target)<=.5);
 assert.ok(Math.abs(time.arrivalError)<=3);
});
test('全列車コースを実車両の力行表で監査し、加減速が必要な定通を作らない',async()=>{
 const load=async id=>JSON.parse(await readFile(new URL('../dist/assets/final/'+id,import.meta.url),'utf8'));
 const recipes=(await load('vehicle-recipes.json')).trains,routes=await loadServiceRoutes();let checked=0;
 for(const choices of Object.values(serviceChoices))for(const [id,vehicle,service,option] of choices){
  if(vehicle==='701')continue;
  const train=recipes.find(t=>t.id===vehicle),route=makeServiceRoute(routes.get(id),vehicle,service,option);
  const spec={...train.playableSpecs,powerForceRows:train.performance?.power?.force?.rows};
  const schedule=resolveScoreSchedule(route,route.stations[0].s,spec);
  const points=makeCheckpoints(schedule.timetable,route.limits??[],route.stations[0].s,schedule.clockStart,spec);
  for(let i=0;i<points.length;i+=2){
   const speed=points[i],time=points[i+1];assert.equal(speed.kind,'speed');assert.equal(time.kind,'time');
   assert.ok(Math.abs(speed.speedPointTime+(time.s-speed.s)/(speed.target/3.6)-time.target)<=.50001);
   assert.ok(Math.abs(time.arrivalError)<=3);assert.ok(time.s<=speed.cruiseTo);checked++;
  }
 }
 assert.ok(checked>50,`監査ペア数 ${checked}`);console.log(`指定速度を維持できる定速・定通 ${checked}ペアを監査`);
});

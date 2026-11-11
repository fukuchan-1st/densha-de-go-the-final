import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {resolveScoreSchedule,sectionSpeedPlan,makeCheckpoints} from '../dist/scoring.js';
import {makeServiceRoute,serviceChoices} from '../dist/train-selection.js';import {osakaPlanningSpec} from '../dist/osaka-timetable.js';
const route=JSON.parse(await readFile(new URL('../dist/assets/final/osaka-route.json',import.meta.url))),catalog=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url)));
test('all six Osaka services have achievable 80 km/h schedules and checkpoints in both directions, preserving line limits',()=>{
 for(const choice of serviceChoices.osaka){const train=catalog.trains.find(t=>t.id===choice[1]),r=makeServiceRoute(route,...choice.slice(1)),original=structuredClone(r.limits),spec=osakaPlanningSpec(r,{...train.playableSpecs,powerNotches:train.notchLabels.length-train.notchLabels.indexOf('N')-1,powerForceRows:train.performance?.power?.force?.rows}),schedule=resolveScoreSchedule(r,r.stations[0].s,spec);assert.equal(spec.maxSpeedKmh,80);let carry=0;
  for(let i=1;i<schedule.timetable.length;i++){const a=schedule.timetable[i-1],b=schedule.timetable[i],plan=sectionSpeedPlan(a,b,r.limits??[],spec,carry);assert.ok(plan.feasible,choice[1]+' '+a.name+' → '+b.name);assert.ok(b.time-plan.departure-plan.fastest>=6,`${a.name} → ${b.name} has recovery time`);assert.ok(Math.max(...plan.speeds)*3.6<=80.001);carry=plan.speeds.at(-1);}
  for(const p of makeCheckpoints(schedule.timetable,r.limits??[],r.stations[0].s,schedule.clockStart,spec))if(p.kind==='speed')assert.ok(p.target<=80);
  assert.deepEqual(r.limits,original);const mid=r.stations[Math.floor(r.stations.length/2)],partial=resolveScoreSchedule(r,mid.s,spec);assert.equal(partial.clockStart,partial.timetable.find(x=>Math.abs(x.s-mid.s)<.5).time);
 }
});
test('the Osaka planning cap does not change another route or its vehicle maximum',()=>{const spec={maxSpeedKmh:130};assert.equal(osakaPlanningSpec({id:'tokaido'},spec),spec);assert.equal(spec.maxSpeedKmh,130);});

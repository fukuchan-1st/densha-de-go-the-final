import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {makeServiceRoute} from '../dist/train-selection.js';import {routeLimitAt} from '../dist/final-model.js';import {resolveScoreSchedule,makeCheckpoints,sectionSpeedPlan} from '../dist/scoring.js';
const original=JSON.parse(await readFile(new URL('../dist/assets/final/yagan-route.json',import.meta.url),'utf8'));
const recipe=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url),'utf8')).trains.find(t=>t.id==='6050');
test('Yagan is limited to 70 throughout, preserving lower limits without mutating source',()=>{
 const before=JSON.stringify(original),route=makeServiceRoute(original,'6050','普通');assert.equal(route.serviceSpeedKmh,70);
 for(let s=0;s<=route.length;s+=5){const lower=original.limits.filter(x=>s>=x.sStart&&s<x.sEnd).reduce((n,x)=>Math.min(n,x.kmh),70);assert.equal(routeLimitAt(route,s),lower);}
 assert.equal(routeLimitAt(route,21120),35);assert.equal(routeLimitAt(route,24750),70);assert.equal(JSON.stringify(original),before);
});
test('Yagan schedules and speed/time checkpoints can be reached with the 70 km/h plan',()=>{
 const route=makeServiceRoute(original,'6050','普通'),spec={...recipe.playableSpecs,maxSpeedKmh:70,powerForceRows:recipe.performance?.power?.force?.rows};
 const schedule=resolveScoreSchedule(route,0,spec),points=makeCheckpoints(schedule.timetable,route.limits,0,schedule.clockStart,spec);assert.ok(points.length>0);assert.ok(points.filter(p=>p.kind==='speed').every(p=>p.target<=70));
 for(let i=1;i<schedule.timetable.length;i++){const a=schedule.timetable[i-1],b=schedule.timetable[i],plan=sectionSpeedPlan(a,b,route.limits,spec);assert.ok(plan.feasible);assert.ok(Math.max(...plan.speeds)*3.6<=70+1e-7);assert.ok(Math.abs(plan.departure+plan.duration-b.time)<.1);}
 for(const station of route.stations.slice(1,-1)){const part=resolveScoreSchedule(route,station.s,spec);assert.ok(Number.isFinite(part.clockStart));}
});

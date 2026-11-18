import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadServiceRoutes} from './service-fixture.mjs';
import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';
import {SCHEDULES} from '../dist/published-schedules.js';
import {resolveScoreSchedule} from '../dist/scoring.js';
const routes=await loadServiceRoutes(),recipes=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url))).trains;
const services=serviceChoices.chuo.map(choice=>({choice,route:makeServiceRoute(routes.get(choice[0]),...choice.slice(1))}));
const find=id=>services.find(x=>x.route.publishedSchedule?.id===id);
test('Chuo uses the old numbers for eight deletions and places E233 first',()=>{
 assert.equal(serviceChoices.chuo.length,60);assert.equal(serviceChoices.chuo[0][1],'e233');assert.equal(serviceChoices.chuo[0][2],'快速');
 assert.equal(serviceChoices.chuo.some(x=>x[0]==='shinonoi'&&x[1]==='383'),false);
 assert.equal(serviceChoices.chuo.some(x=>x[0]==='tatsuno'),false);
 assert.equal(serviceChoices.chuo.some(x=>x[2]==='普通みすず'&&x[3].reverse),false);
 assert.equal(serviceChoices.chuo.some(x=>x[0]==='suwa-nagano'&&x[3].reverse),false);
 assert.equal(serviceChoices.chuo.some(x=>x[0]==='oito'&&x[2]==='快速'&&x[3].reverse),false);
 assert.equal(services.filter(x=>x.choice[2]==='快速みすず').length,1);
 // Reordering must not add fields to otherwise unchanged progress identities.
 assert.deepEqual(serviceChoices.chuo[0],['chuo','e233','快速',{from:'東京',to:'高尾'}]);
});
for(const id of ['oumeDown','oumeUp','hachiojiDown','hachiojiUp','hakubaDown','hakubaUp','shinshuDown','shinshuUp','misuzu','rapidMisuzu'])test(`${id}: station order, minute anchors and model-feasible seconds`,()=>{
 const {route,choice}=find(id),source=SCHEDULES[id],train=recipes.find(t=>t.id===choice[1]);
 assert.deepEqual(route.stations.map(x=>x.name),source.rows.map(x=>x.name));
 const spec={...train.playableSpecs,powerNotches:train.notchLabels.length-train.notchLabels.indexOf('N')-1,powerForceRows:train.performance?.power?.force?.rows};
 const schedule=resolveScoreSchedule(route,0,spec);
 assert.deepEqual(schedule.adjustments,[]);
 for(const row of source.rows){
  const st=route.stations.find(x=>x.name===row.name),actual=schedule.timetable.find(x=>x.name===row.name),minute=t=>t.split(':').slice(0,2).map(Number).reduce((a,b)=>a*60+b,0);
  if(row.arrival!=null){assert.equal(Math.floor(st.arrival/60),minute(row.arrival),row.name+' arrival minute');if(actual.adjusted&&schedule.matsumotoLocalRetimed)assert.ok(Number.isFinite(actual.time),row.name+' retimed arrival');else assert.ok(Math.abs(actual.time-st.arrival)<.01,row.name+' reachable arrival');}
  if(row.departure!=null&&row.name!==route.stations.at(-1).name){if(schedule.matsumotoLocalRetimed&&actual.adjusted)assert.ok(schedule.planningSpec.departureTimes[st.s]>=actual.time,row.name+' retimed dwell');else assert.equal(Math.floor(schedule.planningSpec.departureTimes[st.s]/60),minute(row.departure),row.name+' departure minute');}
 }
 assert.equal(schedule.clockStart,route.stations[0].departure-30);
 assert.equal(route.night,['oumeDown','hachiojiDown','shinshuUp'].includes(id));
});
test('Misuzu retains long station waits and the rapid ends via Kawagishi at Tatsuno',()=>{
 const ordinary=find('misuzu').route,rapid=find('rapidMisuzu').route;
 assert.equal(ordinary.stations.find(x=>x.name==='岡谷').departure,8*3600+8*60);
 assert.equal(ordinary.stations.find(x=>x.name==='冠着').departure,9*3600+23*60);
 assert.deepEqual(rapid.stations.slice(-3).map(x=>x.name),['岡谷','川岸','辰野']);
 assert.equal(rapid.stations.at(-1).arrival,17*3600+20*60);
 assert.equal(find('shinshuDown').route.stations[0].name,'塩尻');
 assert.equal(find('shinshuUp').route.stations.at(-1).name,'塩尻');
});

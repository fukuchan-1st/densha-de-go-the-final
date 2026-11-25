import {loadServiceRoutes,loadRecipesWithTobu} from '../tests/service-fixture.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';
import {resolveScoreSchedule,makeCheckpoints,sectionSpeedPlan,routePlanningSpec} from '../dist/scoring.js';
import {STATIONS} from '../dist/route-data.js';
import {reverseLegacyProfile} from '../dist/tohoku-direction.js';
import {RouteProfile} from '../dist/route-profile.js';
const load=async p=>JSON.parse(await readFile(new URL('../dist/'+p,import.meta.url),'utf8'));
const recipes=(await loadRecipesWithTobu()).trains,routes=await loadServiceRoutes(),failures=[],summary=[];
const profile=new RouteProfile(await load('assets/bve-profile.json'));
for(const [line,choices] of Object.entries(serviceChoices))for(const [id,vehicle,service,option] of choices){
 let route,spec;
 if(vehicle==='701'){
  const length=STATIONS.at(-1).s,p=option?.reverse?reverseLegacyProfile(profile,length):profile;
  route={id:'tohoku',service,vehicle,grades:Array.from({length:Math.ceil(length/20)+2},(_,i)=>[i*20,p.gradeAt(i*20)]),stations:option?.reverse?STATIONS.map(st=>({...st,s:length-st.s})).reverse():STATIONS,limits:p.limits.map((x,i)=>({sStart:x.s,sEnd:p.limits[i+1]?.s??length+1,kmh:x.kmh}))};
  spec={maxSpeedKmh:110,startingAccelerationKmhPerSecondApprox:2.1};
 }else{route=makeServiceRoute(routes.get(id),vehicle,service,option);const train=recipes.find(t=>t.id===vehicle);spec={...train.playableSpecs,powerNotches:train.notchLabels.length-train.notchLabels.indexOf('N')-1,powerForceRows:train.performance?.power?.force?.rows};}
 const schedule=resolveScoreSchedule(route,route.stations[0].s,spec),table=schedule.timetable,points=makeCheckpoints(table,route.limits??[],table[0].s,schedule.clockStart,schedule.planningSpec);let carry=0,checked=0,partialStarts=0;
 for(let i=1;i<table.length;i++){
  const a=table[i-1],b=table[i],key=`${line}/${vehicle}/${service}/${option?.reverse?'reverse':'forward'}: ${a.name} → ${b.name}`,pair=points.filter(p=>p.s>a.s&&p.s<b.s),speed=pair.find(p=>p.kind==='speed'),time=pair.find(p=>p.kind==='time'),plan=sectionSpeedPlan(a,b,route.limits??[],schedule.planningSpec,carry);
  if(!speed)failures.push({key,reason:'no speed checkpoint'});
  if(!time)failures.push({key,reason:'no time checkpoint',length:b.s-a.s,speed});
  if(!plan.feasible)failures.push({key,reason:'unreachable station deadline',error:plan.fastest-plan.available});
  if(time&&(!time.deadlineFeasible||Math.abs(time.arrivalError)>2.5||Math.abs(speed.speedPointTime+(time.s-speed.s)/(speed.target/3.6)-time.target)>.50001))failures.push({key,reason:'inconsistent checkpoint timing',error:time.arrivalError});
  if(speed&&speed.target>Math.max(...plan.caps)*3.6+1)failures.push({key,reason:'target exceeds cap'});
  carry=plan.speeds.at(-1);checked++;
 }
 for(const start of route.stations.slice(0,-1)){
  const row=table.find(st=>Math.abs(st.s-start.s)<.5),next=table.find(st=>st.s>start.s+.5);if(!row||!next)continue;
  const partial=makeCheckpoints(table.filter(st=>st.s<=next.s+.001),route.limits??[],row.s,row.time,schedule.planningSpec);
  if(!partial.some(p=>p.kind==='speed')||!partial.some(p=>p.kind==='time'))failures.push({key:`${line}/${vehicle}/${service}/${option?.reverse?'reverse':'forward'}: start ${start.name}`,reason:'partial-start checkpoint missing'});
  partialStarts++;
 }
 summary.push({line,vehicle,service,reverse:!!option?.reverse,partialStarts,sections:checked,checkpoints:points.length,adjusted:table.filter(s=>s.adjusted).length});
}
await writeFile(new URL('../schedule-audit-v77.json',import.meta.url),JSON.stringify({scenarios:summary.length,sections:summary.reduce((n,x)=>n+x.sections,0),partialStarts:summary.reduce((n,x)=>n+x.partialStarts,0),failures,summary},null,2));console.log(JSON.stringify({scenarios:summary.length,sections:summary.reduce((n,x)=>n+x.sections,0),partialStarts:summary.reduce((n,x)=>n+x.partialStarts,0),failures:failures.length,first:failures.slice(0,12)},null,2));if(failures.length)process.exitCode=1;

import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {districtAt,fixedMoodAt,DISTRICTS} from '../dist/toho-biomes.js';
import {sliceRoute,reverseRoute} from '../dist/service-routes.js';import {driveStep,createJourney,controlsFor} from '../dist/final-model.js';import {sampleRouteCurve} from '../dist/route-curve.js';
const route=JSON.parse(await readFile(new URL('../dist/assets/final/toho-route.json',import.meta.url),'utf8'));
test('all supplied landmarks and inferred districts have a station-specific setting, including Myorenji and Taishibyo separately',()=>{
 for(const st of route.stations){const d=districtAt(route,st.s);assert.ok(d,st.name);assert.equal(d.label,DISTRICTS[st.name].label);}
 assert.equal(DISTRICTS['命蓮寺'].landmark,'temple');assert.equal(DISTRICTS['大祀前'].landmark,'pagoda');assert.equal(DISTRICTS['柳運河'].kind,'canal');assert.equal(DISTRICTS['鈴奈'].landmark,'bookshop');
});
test('Meikai and Sanzu preserve their twilight mood under different weather; every other region uses normal lighting',()=>{
 for(const st of route.stations){const a=fixedMoodAt({...route,weather:'sunny'},st.s),b=fixedMoodAt({...route,weather:'rain'},st.s);assert.deepEqual(a,b);assert.equal(!!a,['冥界','三途'].includes(st.name));}
 const first=route.stations[0],reversed=reverseRoute(route);assert.equal(fixedMoodAt(reversed,route.length-first.s).kind,'sakura');
});
test('Meikai is elevated, station yards stay level, and both supplied trains can climb from Mumeioka',async()=>{
 assert.equal(route.points.find(x=>x[0]===0)[3],60);const next=route.stations.find(x=>x.name==='無名丘');assert.equal(sampleRouteCurve(route.points,next.s)[2],0);
 const branch=reverseRoute(sliceRoute(route,'冥界','無名丘'));const recipes=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url),'utf8')).trains;
 const grade=s=>(sampleRouteCurve(branch.points,s+5)[2]-sampleRouteCurve(branch.points,s-5)[2])*100;
 let steepest=0;for(let s=0;s<branch.length;s+=10)steepest=Math.max(steepest,grade(s));assert.ok(steepest>20&&steepest<23);
 for(const id of ['6050','211']){const recipe=recipes.find(x=>x.id===id),state=createJourney(branch,recipe);state.doors=false;state.notch=controlsFor(recipe).max;let time=0;
  while(state.s<branch.length&&time<900){driveStep(state,recipe,.1,grade(state.s));time+=.1;}
  assert.ok(state.s>=branch.length,`${id} stalled at ${state.s}`);assert.ok(time<600,`${id}: ${time}s`);console.log(`${id}: climbs 60 m in ${Math.round(time)}s`);
 }
});

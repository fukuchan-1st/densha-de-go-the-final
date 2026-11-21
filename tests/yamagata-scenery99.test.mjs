import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeServiceRoute,serviceChoices} from '../dist/train-selection.js';
import {reverseRoute,sliceRoute} from '../dist/service-routes.js';
import {sceneryDensity} from '../dist/scenery-profile.js';
import {residentialAllowed,yamagataSourcePosition} from '../dist/yamagata-mountain.js';
import {YAMAGATA_MOUNTAIN} from '../dist/yamagata-mountain-data.js';
import {RoadScenery} from '../dist/road-scenery.js';
const r=JSON.parse(await readFile(new URL('../dist/assets/final/yamagata-route.json',import.meta.url),'utf8'));
test('mountain exclusion follows all eras, both directions and partial services',()=>{
 for(const choice of serviceChoices.yamagata){
  const route=makeServiceRoute(r,...choice.slice(1));
  const anchors=route.sceneryStations.filter(st=>Number.isFinite(st.sourceS));
  if(anchors.length<2){assert.equal(residentialAllowed(route,0),true);continue;}
  for(let s=0;s<=route.length;s+=137){
   const source=yamagataSourcePosition(route,s),inside=source>=YAMAGATA_MOUNTAIN.start&&source<=YAMAGATA_MOUNTAIN.end;
   assert.equal(residentialAllowed(route,s),!inside,`${choice[0]} at ${s}`);
   if(inside){const d=sceneryDensity(route,s);assert.equal(d.building,0);assert.equal(d.residentialExcluded,true);assert.ok(d.green>=0&&d.green<=100);}
  }
 }
});
test('short mountain-only slices retain source position and reject whole house footprints',()=>{
 for(const route of [r,reverseRoute(r)]){
  const station=route.stations.find(st=>st.name==='板谷');
  const partial=sliceRoute(route,'板谷','峠');
  assert.equal(yamagataSourcePosition(partial,0),partial.stations[0].sourceS);
  assert.equal(residentialAllowed(route,station.s),false);
  const receiver={world:{route}};
  assert.equal(RoadScenery.prototype.buildingClear.call(receiver,station.s,40,8,8),false);
 }
 const niwasaka=r.stations.find(s=>s.name==='庭坂');
 assert.equal(residentialAllowed(r,niwasaka.s-15,32),false);
 assert.equal(residentialAllowed(r,niwasaka.s-30,32),true);
 assert.equal(residentialAllowed({...r,id:'chuo'},20000),true);
});
test('fresh mapped forest samples cover the entire corridor without claiming houses are absent in OSM',()=>{
 assert.ok(YAMAGATA_MOUNTAIN.rows.length>50);
 assert.ok(YAMAGATA_MOUNTAIN.mappedElements>0);
 assert.equal(YAMAGATA_MOUNTAIN.rows[0].sourceS,YAMAGATA_MOUNTAIN.start);
 assert.equal(YAMAGATA_MOUNTAIN.rows.at(-1).sourceS,YAMAGATA_MOUNTAIN.end);
 assert.match(YAMAGATA_MOUNTAIN.timestamp,/^2026-/);
 const forest=YAMAGATA_MOUNTAIN.rows.map(row=>row.forest);
 assert.ok(Math.max(...forest)>.5);assert.ok(Math.max(...forest)>Math.min(...forest)+.1);
 assert.match(YAMAGATA_MOUNTAIN.residentialPolicy,/User-requested/);
});

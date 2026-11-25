import test from 'node:test';import assert from 'node:assert/strict';
import {loadServiceRoutes} from './service-fixture.mjs';
import {makeServiceRoute} from '../dist/train-selection.js';
import {TOBU_SCENARIOS} from '../dist/tobu-services.js';
import {TOBU_STATION_SECTIONS,parseSection} from '../dist/tobu-station-layouts.js';
import {interpolateKnots} from '../dist/track-layout.js';
const routes=await loadServiceRoutes();
const build=sc=>makeServiceRoute(routes.get(sc.routeId),sc.vehicle,sc.service,{from:sc.start,to:sc.end,pattern:'all',carCount:sc.carCount,tobuScenario:sc.id});
const scenario=id=>TOBU_SCENARIOS.find(s=>s.id===id);
test('every Tobu/Aizu station in the corridor has a diagram cross-section',()=>{
 for(const id of ['tobu-aizu','tobu-nikko'])for(const st of routes.get(id).stations){
  if(['龍王峡','川治温泉','川治湯元','湯西川温泉','中三依温泉','上三依塩原温泉口','男鹿高原'].includes(st.name))continue;
  assert.ok(TOBU_STATION_SECTIONS[st.name],st.name);
 }
});
test('diagram platforms keep 1.55 m clearance from every rail in both directions',()=>{
 for(const sc of TOBU_SCENARIOS.filter(s=>!s.preserveExistingSchedule)){
  const r=build(sc);
  for(const st of r.sceneryStations){const lay=r.stationLayouts[st.name];if(!lay?.tobuDiagram)continue;
   const rails=[interpolateKnots(r.drivingTrack,st.s),...r.neighborTracks.filter(t=>t.knots[0][0]<=st.s&&t.knots.at(-1)[0]>=st.s).map(t=>interpolateKnots(t.knots,st.s))];
   for(const p of lay.platforms)for(const x of rails)assert.ok(x<=p.edges[0][1]-1.45||x>=p.edges[0][2]+1.45,`${sc.id} ${st.name} ${x}`);
  }
 }
});
test('side platforms open on the left both ways; island stations follow the diagram',()=>{
 const down=build(scenario('tobu-section-express-down')),up=build(scenario('tobu-section-express-up'));
 const side=(r,name)=>r.sceneryStations.find(s=>s.name===name).doorSide;
 for(const name of ['とうきょうスカイツリー','東向島','堀切','大袋','幸手']){assert.equal(side(down,name),'left',name);assert.equal(side(up,name),'left',name);}
 // 新越谷: express tracks share the outer side of each island with the locals.
 assert.equal(side(down,'新越谷'),'right');assert.equal(side(up,'新越谷'),'right');
 // 草加・越谷: stopping expresses leave the outer passing track for the island face.
 const own=(r,name)=>interpolateKnots(r.drivingTrack,r.sceneryStations.find(s=>s.name===name).s);
 assert.equal(down.stationLayouts['草加'].stopTrack,'e');assert.ok(own(down,'草加')>own(down,'獨協大学前〈草加松原〉')-8);
 const liberty=build(scenario('tobu-liberty101'));assert.equal(liberty.stationLayouts['草加'].stopTrack,'E');
 // Hibiya locals stay on the local island at 小菅.
 const hibiya=build(scenario('tobu-local-hibiya'));assert.equal(side(hibiya,'小菅'),'right');assert.equal(hibiya.stationLayouts['草加'].stopTrack,'D');
});
test('Kinugawa line is single track and passing stations use the left track for each direction',()=>{
 const down=build(scenario('tobu-kinugawa-local-down')),up=build(scenario('tobu-kinugawa-local-up'));
 assert.ok(down.trafficSections.every(x=>x.tracks===1));
 for(const r of [down,up])assert.equal(r.sceneryStations.find(s=>s.name==='大谷向').doorSide,'left');
 const a=parseSection('P d u P','kinugawa');assert.deepEqual(a.tracks.map(t=>t.role),['d','u']);assert.equal(a.platforms.length,2);
 const st=down.sceneryStations.find(s=>s.name==='大谷向'),loop=down.neighborTracks.find(t=>t.passingLoop&&t.station==='大谷向');
 assert.ok(loop&&interpolateKnots(loop.knots,st.s)>interpolateKnots(down.drivingTrack,st.s)+2.8);
});

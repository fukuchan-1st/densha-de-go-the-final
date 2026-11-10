import test from 'node:test';import assert from 'node:assert/strict';import {loadServiceRoutes} from './service-fixture.mjs';import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';import {trafficSectionAt} from '../dist/route-traffic.js';import {adjacentTracks} from '../dist/opposing-trains.js';import {interpolateKnots} from '../dist/track-layout.js';import {normalizeLegacyLayout,reverseLegacyLayout} from '../dist/tohoku-direction.js';import fs from 'node:fs';
const routes=await loadServiceRoutes();
test('all selectable directions keep their running rail on the left and opposing trains off same-direction rails',()=>{
 for(const choice of Object.values(serviceChoices).flat()){
  if(choice[0]==='tohoku')continue;const r=makeServiceRoute(routes.get(choice[0]),...choice.slice(1)),world={route:r,length:r.length,driveOffset:s=>interpolateKnots(r.drivingTrack,s)};
  for(let s=250;s<r.length-200;s+=250){
   const section=trafficSectionAt(r,s),own=world.driveOffset(s),rails=r.neighborTracks.filter(t=>t.trafficMain&&s>=t.knots[0][0]&&s<=t.knots.at(-1)[0]),opposing=adjacentTracks(world,s);
   assert.ok(opposing.every(t=>t.x>own+2.8),choice.slice(0,3)+' '+s);
   for(const t of rails.filter(t=>t.direction==='same')){const x=interpolateKnots(t.knots,s);assert.ok(!opposing.some(o=>Math.abs(o.x-x)<.1));}
   // Test the interior, away from turnout transitions at section boundaries.
   if(s-section.sStart<180||section.sEnd-s<180)continue;
   if(section.tracks===4){assert.equal(opposing.length,2,choice.slice(0,3)+' '+s);const all=[own,...rails.map(t=>interpolateKnots(t.knots,s))].sort((a,b)=>a-b);assert.ok(all.indexOf(own)<2);assert.deepEqual(opposing.map(t=>t.x).sort((a,b)=>a-b),all.slice(-2));}
   if(section.tracks===2){assert.equal(opposing.length,1);assert.ok(opposing[0].x>own);}
   if(section.tracks===1&&!rails.some(t=>t.passingLoop))assert.equal(opposing.length,0);
  }
 }
});
test('all station stopping rails have a platform edge within two metres',()=>{for(const choice of Object.values(serviceChoices).flat()){if(choice[0]==='tohoku')continue;const r=makeServiceRoute(routes.get(choice[0]),...choice.slice(1));for(const st of r.stations){const own=interpolateKnots(r.drivingTrack,st.s),p=r.stationLayouts[st.name].platforms.find(p=>p.boarding);assert.ok(p,st.name);const l=interpolateKnots(p.edges,0,1),right=interpolateKnots(p.edges,0,2);assert.ok(right>l&&!(own>l&&own<right),st.name);assert.ok(Math.min(Math.abs(own-l),Math.abs(own-right))<=2,st.name);}}});
test('Tohoku forward and reverse use right-hand opposing rails',()=>{const data=JSON.parse(fs.readFileSync(new URL('../dist/assets/station-layouts.json',import.meta.url)));for(const r of [normalizeLegacyLayout(data,100000),reverseLegacyLayout(data,100000)])for(let s=100;s<99000;s+=500){const own=interpolateKnots(r.tracks.find(t=>t.id==='player').knots,s),opposite=r.tracks.filter(t=>t.direction==='opposing');assert.equal(opposite.length,1);assert.ok(interpolateKnots(opposite[0].knots,s)>own+2.8);}});
test('Itsukaichi is selectable both ways, including a Tachikawa through service',()=>{for(const id of ['itsukaichi','chuo-itsukaichi']){const pair=serviceChoices.chuo.filter(c=>c[0]===id);assert.equal(pair.length,2);for(const c of pair){assert.equal(c[3].carCount,6);const r=makeServiceRoute(routes.get(id),...c.slice(1));assert.equal(r.stations[c[3].reverse?0:r.stations.length-1].name,'武蔵五日市');for(const name of ['拝島','熊川','東秋留','秋川','武蔵引田','武蔵増戸','武蔵五日市'])assert.ok(r.stations.some(s=>s.name===name));const point=r.sceneryStations.find(s=>s.name==='拝島').s;for(let s=point+300;s<r.length;s+=300){if(!c[3].reverse)assert.equal(trafficSectionAt(r,s).tracks,1);}}}});

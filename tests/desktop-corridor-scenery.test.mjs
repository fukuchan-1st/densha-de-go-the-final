import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareCorridorScenery,corridorSceneryType} from '../dist/corridor-scenery.js';
import {interpolateKnots} from '../dist/track-layout.js';
const load=async id=>JSON.parse(await readFile(new URL('../dist/assets/final/'+id+'-route.json',import.meta.url),'utf8'));
test('京都〜神戸で4本以上の線路が途切れず続く',async()=>{
 const raw=await load('tokaido'),r=prepareCorridorScenery(raw);
 for(let s=0;s<=r.stations.at(-1).s;s+=20){
  const xs=[interpolateKnots(r.drivingTrack,s),...r.neighborTracks.filter(t=>t.knots[0][0]<=s&&t.knots.at(-1)[0]>=s).map(t=>interpolateKnots(t.knots,s))].sort((a,b)=>a-b);
  assert.ok(xs.filter((x,i)=>!i||x-xs[i-1]>1).length>=4,`4線未満: ${s}m`);
 }
 assert.equal(raw.neighborTracks.length,795);
});
test('快速が通過する駅にも各停側ホームを追加し、元の構内図は維持する',async()=>{
 for(const [id,name] of [['tokaido','岸辺'],['chuo-extended','荻窪']]){
  const raw=await load(id),r=prepareCorridorScenery(raw);
  assert.ok(r.stationLayouts[name].platforms.some(p=>p.boarding===false));
  assert.ok(r.stationLayouts[name].platforms.length>(raw.stationLayouts[name]?.platforms?.length??0));
 }
});
test('東海道線は主要4駅の周辺だけビル街、そのほかは住宅街',async()=>{
 const r=await load('tokaido');
 for(const name of ['京都','新大阪','大阪','神戸'])assert.equal(corridorSceneryType(r,r.stations.find(s=>s.name===name).s),'city');
 for(const name of ['岸辺','山崎','甲子園口','摩耶'])assert.equal(corridorSceneryType(r,r.stations.find(s=>s.name===name).s),'suburban');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/assets/vendor/three.module.js';
import {TrafficClock,adjacentTracks,OpposingTrains} from '../dist/opposing-trains.js';
import {readFile} from 'node:fs/promises';
import {interpolateKnots} from '../dist/track-layout.js';

test('山手線と大糸線の実データで最初の対向列車が表示される',async()=>{
 for(const id of ['yamanote','oito']){
  const route=JSON.parse(await readFile(new URL(`../dist/assets/final/${id}-route.json`,import.meta.url),'utf8'));
  const world={route,length:route.stations.at(-1).s,scene:new T.Scene(),driveOffset:s=>route.drivingTrack?interpolateKnots(route.drivingTrack,s):0,sceneryTypeAt:()=>id==='yamanote'?'city':'mountain',frame:(s,x)=>({p:new T.Vector3(x,0,-s)})};
  const traffic=new OpposingTrains(world);let first=null,visible=0;
  for(let i=0;i<600;i++){traffic.update(0,.1);if(traffic.trains.length){first??=i/10;visible++;}}
  assert.ok(first!==null&&first<=31,`${id} first ${first}`);assert.ok(visible>50,`${id} visible ${visible}`);traffic.dispose();
 }
});

test('対向列車は都心60秒・地方300秒で出現し、一時停止では進まない',()=>{
 for(const [type,seconds] of [['city',60],['mountain',300]]){
  const clock=new TrafficClock({initialDelay:false});let count=0;
  const spawn=()=>{count++;return true;};
  for(let i=0;i<seconds*4-1;i++)clock.update(.25,type,spawn);
  assert.equal(count,0);clock.update(0,type,spawn);assert.equal(count,0);
  clock.update(.25,type,spawn);assert.equal(count,1);
 }
});
test('隣接線の範囲と高低差を守り、自線・途切れた線路には列車を置かない',()=>{
 const world={length:3000,route:{id:'chuo',neighborTracks:[{knots:[[0,0],[3000,0]]},{knots:[[300,4],[2500,4]],height:2}]},driveOffset:()=>0,scene:new T.Scene(),sceneryTypeAt:()=> 'city',frame:(s,x)=>({p:new T.Vector3(x,0,-s)})};
 assert.deepEqual(adjacentTracks(world,0),[]);assert.deepEqual(adjacentTracks(world,500),[{x:4,y:2}]);
 const traffic=new OpposingTrains(world);assert.equal(traffic.spawn(0),true);
 traffic.update(0,0);const train=traffic.trains[0];assert.equal(train.cars[0].position.x,4);assert.equal(train.cars[0].position.y,2);
 const before=train.s;traffic.update(0,0);assert.equal(train.s,before);
 train.s=299;traffic.update(0,.1);assert.equal(traffic.trains[0].s,299);assert.ok(traffic.trains[0].blocked>0);
 traffic.dispose();assert.equal(world.scene.children.length,0);
});

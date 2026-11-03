import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {LocalTrainAudio} from '../dist/final-audio.js';
import {brakeAssist,controlsFor,createJourney,driveStep,finishStop,routeLimitAt} from '../dist/final-model.js';
import {FinalWorld} from '../dist/final-world.js';

const assets=new URL('../dist/assets/final/',import.meta.url);
const route=JSON.parse(await readFile(new URL('yagan-route.json',assets),'utf8'));
const {trains}=JSON.parse(await readFile(new URL('vehicle-recipes.json',assets),'utf8'));
const recipe=trains.find(train=>train.id==='6050');

test('野岩鉄道の9駅、線路制限、車内放送と走行音がBVEの配置に対応する',async()=>{
 assert.equal(route.stations.length,9);
 assert.equal(route.stations[0].name,'新藤原');
 assert.equal(route.stations.at(-1).name,'会津高原尾瀬口');
 assert.equal(route.stations.at(-1).s,30773);
 for(const [index,point] of route.points.entries()){
  assert.ok(point.every(Number.isFinite));
  if(index)assert.ok(point[0]>route.points[index-1][0]);
 }
 for(const station of route.stations)assert.ok(route.stationLayouts[station.name].platforms.some(platform=>platform.boarding));
 const yunis=route.stations.find(station=>station.name==='湯西川温泉').s;
 assert.ok(route.structures.some(t=>t.kind==='tunnel'&&t.sStart<yunis&&yunis<t.sEnd));
 assert.equal(routeLimitAt(route,92.99),null);
 assert.equal(routeLimitAt(route,93),70);
 assert.equal(routeLimitAt(route,313),null);
 for(const cue of [route.stations[0].departureSound,...route.soundEvents.map(event=>event.key)]){
  assert.ok((await stat(new URL(`yagan-announcements/${cue}.mp3`,assets))).size>0);
 }
 const audio=Object.assign(Object.create(LocalTrainAudio.prototype),{recipe});
 for(const change of route.rollingNoise)assert.equal(audio.runRef('long',change.index),recipe.sounds.run[change.index]);
});

test('6050型は野岩鉄道の勾配で全駅に停車できる',()=>{
 const world=Object.assign(Object.create(FinalWorld.prototype),{route,points:route.points,length:route.length});
 const run=createJourney(route,recipe),notches=controlsFor(recipe);
 finishStop(run,route);
 for(const [index,station] of route.stations.entries()){
  if(index===0)continue;
  run.notch=notches.max;
  for(let step=0;step<8000&&run.next===index;step++){
   brakeAssist(run,route,recipe);
   driveStep(run,recipe,.08,world.grade(run.s));
   if(run.v<=.01&&Math.abs(run.s-station.s)<=3){
    run.doors=true;
    finishStop(run,route);
   }
  }
  assert.equal(run.next,index+1,station.name);
 }
 assert.equal(run.finished,true);
 assert.equal(run.served,8);
});

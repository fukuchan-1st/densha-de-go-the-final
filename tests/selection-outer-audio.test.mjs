import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bindTrainSelectionKeys} from '../dist/selection-keys.js';
import {makeServiceRoute} from '../dist/train-selection.js';
import {interpolateKnots} from '../dist/track-layout.js';
import {BufferedEffects} from '../dist/buffered-effects.js';
test('フォーカスに関係なく矢印で列車・路線を選び、Enterで詳細へ進む',()=>{
 let listener,selected=0,line=0,details=0,active=true;
 bindTrainSelectionKeys({addEventListener:(name,handler,capture)=>{listener=handler;assert.equal(capture,true);}},{active:()=>active,previous:()=>selected--,next:()=>selected++,previousLine:()=>line--,nextLine:()=>line++,details:()=>details++,back:()=>{}});
 const key=code=>listener({code,preventDefault(){},stopImmediatePropagation(){}});
 key('ArrowDown');key('ArrowDown');key('ArrowUp');key('ArrowRight');key('Enter');
 assert.equal(selected,1);assert.equal(line,1);assert.equal(details,1);active=false;key('ArrowDown');assert.equal(selected,1);
});
test('東海道線の新快速と特急は外側へ移り、内側の線路も残す',async()=>{
 const original=JSON.parse(await readFile(new URL('../dist/assets/final/tokaido-route.json',import.meta.url),'utf8'));
 for(const service of ['新快速','特急']){
  const r=makeServiceRoute(original,service==='新快速'?'223-1000':'681',service);assert.equal(r.serviceTrack,'outer');
  for(let s=0;s<75900;s+=100)assert.equal(interpolateKnots(r.drivingTrack,s),-8);
  assert.ok(r.neighborTracks.some(t=>t.mainCorridor&&interpolateKnots(t.knots,1000)===0));
 }
 assert.equal(interpolateKnots(makeServiceRoute(original,'221','快速').drivingTrack,1000),0);
});
test('全停車駅でホームが走行線に接し、ホームを線路が貫通しない',async()=>{
 const original=JSON.parse(await readFile(new URL('../dist/assets/final/tokaido-route.json',import.meta.url),'utf8'));
 for(const [vehicle,service] of [['207','普通'],['221','快速'],['223-1000','新快速'],['681','特急']]){
  const r=makeServiceRoute(original,vehicle,service);
  for(const t of r.neighborTracks)for(let i=1;i<t.knots.length;i++)assert.ok(t.knots[i][0]>t.knots[i-1][0]);
  for(const st of r.stations){
   const x=interpolateKnots(r.drivingTrack,st.s),platforms=r.stationLayouts[st.name].platforms;
   assert.ok(platforms.some(p=>Math.min(Math.abs(interpolateKnots(p.edges,0,1)-x),Math.abs(interpolateKnots(p.edges,0,2)-x))<1.7),`${service} ${st.name} ホームなし`);
   for(const p of platforms){const left=interpolateKnots(p.edges,0,1),right=interpolateKnots(p.edges,0,2);assert.ok(!(x>left&&x<right),`${st.name} ホームを貫通`);}
  }
  for(let s=1000;s<75900;s+=100){const xs=[interpolateKnots(r.drivingTrack,s),...r.neighborTracks.filter(t=>t.mainCorridor).map(t=>interpolateKnots(t.knots,s))];assert.equal(new Set(xs).size,4);}
 }
});
test('SEは先読みを使い回し、2音の途中でも次のセットを即座に重ねる',async()=>{
 let fetches=0,decodes=0;const sources=[];
 const context={currentTime:10,destination:{},resume:async()=>{},decodeAudioData:async()=>{decodes++;return {duration:.4};},createGain:()=>({gain:{},connect(){},disconnect(){}}),createBufferSource:()=>{const source={connect(){},disconnect(){},start(t){source.at=t;},stop(){source.onended?.();}};sources.push(source);return source;}};
 const bus=new BufferedEffects(context,{fetchAudio:async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};}});
 await bus.preload(['a','b']);const first=bus.playSequence(['a','b']),second=bus.playSequence(['a','b']);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(fetches,2);assert.equal(decodes,2);assert.equal(sources.length,4);assert.equal(sources[0].at,sources[2].at);assert.ok(sources[1].at>sources[0].at);
 first.stop();second.stop();
});

import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {LocalTrainAudio} from '../dist/final-audio.js';import {makeServiceRoute,serviceChoices} from '../dist/train-selection.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('a long passenger announcement cannot delay driver calls, but each voice keeps its own sentence order',async()=>{
 const audio=Object.create(LocalTrainAudio.prototype);audio.generation=0;audio.stopped=false;
 const played=[],ends=new Map();audio.playRef=ref=>new Promise(resolve=>{played.push(ref.entryIndex);ends.set(ref.entryIndex,resolve);});
 const announcement=audio.callRouteAnnouncement('oito','long-local-announcement');await flush();
 assert.deepEqual(played,['oito-announcement-long-local-announcement']);
 const driver=audio.queueDriverCalls([{entryIndex:'station-name'},{entryIndex:'on-time-pass'}]);await flush();
 assert.deepEqual(played,['oito-announcement-long-local-announcement','station-name']);
 ends.get('station-name')(true);await flush();assert.equal(played.at(-1),'on-time-pass');
 ends.get('on-time-pass')(true);await driver;assert.ok(ends.has('oito-announcement-long-local-announcement'));
 ends.get('oito-announcement-long-local-announcement')(true);await announcement;
});
test('cancelled passenger queues cannot start their remaining words on a different run',async()=>{
 const audio=Object.create(LocalTrainAudio.prototype);audio.generation=0;audio.stopped=false;audio.sources=new Set();audio.loops=new Map();audio.passby={reset(){}};
 const played=[];let end;audio.playRef=ref=>new Promise(resolve=>{played.push(ref.entryIndex);end=resolve;});
 const pending=audio.queueDriverCalls([{entryIndex:'first'},{entryIndex:'second'}],'announcementQueue');await flush();audio.stop();end(true);await pending;
 assert.deepEqual(played,['first']);assert.equal(audio.announcementQueue,null);
});
test('Oito rapid in both directions excludes local-stop recordings while local service retains them',async()=>{
 const source=JSON.parse(await readFile(new URL('../dist/assets/final/oito-route.json',import.meta.url),'utf8'));
 for(const choice of serviceChoices.chuo.filter(c=>c[0]==='oito'&&c[2]==='快速')){
  const route=makeServiceRoute(source,...choice.slice(1));assert.equal(route.stations.length,7);assert.deepEqual(route.soundEvents,[]);assert.equal(route.announcementPolicy,'service-stop-calls');
  assert.ok(!route.stations.some(st=>st.name==='千国'));assert.ok(route.sceneryStations.some(st=>st.name==='千国'));
 }
 const local=serviceChoices.chuo.find(c=>c[0]==='oito'&&c[1]==='e127'&&c[2]==='普通');assert.ok(makeServiceRoute(source,...local.slice(1)).soundEvents.length>0);
});

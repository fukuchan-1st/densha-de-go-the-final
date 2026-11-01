import {test} from 'node:test';import assert from 'node:assert/strict';
import {advanceDoorSequence,beginStartingBoarding,completeDoorSequence,departureFilesFor} from '../dist/train-operations.js';
import {formatStopDistance} from '../dist/display.js';
import {SoundEngine} from '../dist/assets/audio/sound-engine.js';
const stopped=error=>({s:4000+error,v:0,doors:false,notch:-3,dwell:0,finished:false});
test('±3m以内でも3秒の停車確認後にだけ自動戸開',()=>{for(const error of [-3,-2.99,0,2.99,3]){const s=stopped(error);assert.equal(advanceDoorSequence(s,4000,2.99),null);assert.equal(s.doors,false);assert.equal(advanceDoorSequence(s,4000,.01),'open');assert.equal(s.doors,true);assert.equal(s.notch,-4);}for(const error of [-10,-3.001,3.001,10]){const s=stopped(error);assert.equal(advanceDoorSequence(s,4000,30),null);assert.equal(s.doors,false);}});
test('待機中の移動または範囲逸脱で3秒の確認をやり直す',()=>{for(const change of [s=>{s.v=.02;},s=>{s.s=4003.01;}]){const s=stopped(0);advanceDoorSequence(s,4000,2);change(s);assert.equal(advanceDoorSequence(s,4000,1),null);assert.equal(s.stopWait,0);s.s=4000;s.v=0;assert.equal(advanceDoorSequence(s,4000,2.99),null);assert.equal(advanceDoorSequence(s,4000,.01),'open');}});
test('戸開から15秒待ち、音声の終了通知後にのみ戸閉する',()=>{const s=stopped(0);assert.equal(advanceDoorSequence(s,4000,3),'open');assert.equal(advanceDoorSequence(s,4000,14.99),null);assert.equal(advanceDoorSequence(s,4000,.01),'announcement');assert.equal(advanceDoorSequence(s,4000,30),null);assert.equal(s.doors,true);s.announcementDone=true;assert.equal(advanceDoorSequence(s,4000,.01),'close');assert.equal(advanceDoorSequence(s,4000,.01),null);});
test('終了済みなら戸開せず、乗降タイマーをリセットしない',()=>{const done={...stopped(0),finished:true};assert.equal(advanceDoorSequence(done,4000,30),null);const s=stopped(0);advanceDoorSequence(s,4000,3);advanceDoorSequence(s,4000,4);assert.equal(s.dwell,4);advanceDoorSequence(s,4000,2);assert.equal(s.dwell,6);});
test('5m以下はcm表示、手前・行き過ぎの両方向に適用',()=>{for(const d of [5,-5])assert.equal(formatStopDistance(d),'500 cm');assert.equal(formatStopDistance(.5),'50 cm');assert.equal(formatStopDistance(-.01),'1 cm');assert.equal(formatStopDistance(0),'0 cm');assert.equal(formatStopDistance(5.001),'5 m');assert.equal(formatStopDistance(10),'10 m');});
test('読み込み中に開始し直したら古い発車音声を再生しない',async()=>{const sound=new SoundEngine();let release;sound.init=()=>new Promise(resolve=>{release=resolve;});const playback=sound.playDeparture();sound.cancelDeparture();release();assert.equal(await playback,false);});

test('黒磯と白河だけ駅音声→ホイッスル、他駅はホイッスルのみ',()=>{
 assert.deepEqual(departureFilesFor('黒磯'),['kuroiso.mp3','departure-chime.wav']);
 assert.deepEqual(departureFilesFor('白河'),['shirakawa.mp3','departure-chime.wav']);
 assert.deepEqual(departureFilesFor('新白河'),['departure-chime.wav']);
});
test('出発駅の戸閉では停車実績・次駅を進めず、白河の到着戸閉は一度だけ加算',()=>{
 const stations=[{name:'黒磯',s:0},{name:'白河',s:100},{name:'福島',s:200}];
 const s={s:0,v:0,next:1,served:0,errors:[],doors:false};
 assert.equal(beginStartingBoarding(s,0,stations),true);assert.equal(s.doors,true);
 assert.equal(advanceDoorSequence(s,100,15),'announcement');s.announcementDone=true;
 assert.equal(advanceDoorSequence(s,100,.01),'close');assert.equal(completeDoorSequence(s,stations),true);
 assert.equal(s.next,1);assert.equal(s.served,0);assert.deepEqual(s.errors,[]);
 s.s=100;s.startingDeparture=false;advanceDoorSequence(s,100,3);advanceDoorSequence(s,100,15);s.announcementDone=true;advanceDoorSequence(s,100,.01);
 assert.equal(completeDoorSequence(s,stations),true);assert.equal(s.served,1);assert.equal(s.next,2);assert.deepEqual(s.errors,[0]);assert.equal(completeDoorSequence(s,stations),false);
});
function mockAudio(){
 const sound=new SoundEngine(),sources=[];sound.ready=true;sound.departureBuffers=new Map(['kuroiso.mp3','shirakawa.mp3','departure-chime.wav'].map(x=>[x,x]));
 sound.ctx={createBufferSource(){const source={connect(){},start(){sources.push(this);},stop(){},disconnect(){}};return source;}};
 return {sound,sources};
}
test('駅音声の終了までホイッスルを開始せず、両方の終了後にだけ完了',async()=>{
 const {sound,sources}=mockAudio(),stages=[];let done=false;
 const playback=sound.playDeparture('白河',stage=>stages.push(stage)).then(v=>{done=v;return v;});
 assert.equal(sources.length,1);assert.equal(sources[0].buffer,'shirakawa.mp3');assert.equal(done,false);
 sources[0].onended();await Promise.resolve();assert.equal(sources.length,2);assert.equal(sources[1].buffer,'departure-chime.wav');assert.equal(done,false);
 sources[1].onended();assert.equal(await playback,true);assert.deepEqual(stages,['station','whistle']);
});
test('駅音声の途中でやり直したらホイッスル・戸閉へ進まない',async()=>{
 const {sound,sources}=mockAudio();const playback=sound.playDeparture('黒磯');sound.cancelDeparture();assert.equal(await playback,false);assert.equal(sources.length,1);
});

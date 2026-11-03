import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HeldHorn} from '../dist/assets/audio/held-horn.js';
import {panelSpeedDigit} from '../dist/final-panel.js';
import {correctStoppedOverrun,nextSignalCall,advanceDoorSequence,completeDoorSequence} from '../dist/train-operations.js';

test('5m以上のオーバーランは停止時だけ0cmに戻し、停止誤差は記録する',()=>{
 const run={s:105,v:1,notch:-3,next:0,errors:[],served:0,doors:false,stopWait:0};
 assert.equal(correctStoppedOverrun(run,100),null);
 run.v=0;
 run.s=104.99;
 assert.equal(correctStoppedOverrun(run,100),null);
 run.s=105;
 assert.equal(correctStoppedOverrun(run,100),5);
 assert.equal(run.s,100);
 assert.equal(run.notch,-3);
 assert.equal(advanceDoorSequence(run,100,2.9),null);
 assert.equal(advanceDoorSequence(run,100,.1),'open');
 Object.assign(run,{doorPhase:'closing',doorCloseDone:true});
 completeDoorSequence(run,[{s:100}]);
 assert.deepEqual(run.errors,[5]);
});

test('次の信号の100m手前から一度だけ喚呼する',()=>{
 const signals=[{s:300,callBlock:2},{s:325,callBlock:3}];
 const called=new Set();
 assert.equal(nextSignalCall(signals,199.9,called),null);
 assert.equal(nextSignalCall(signals,200,called),2);
 assert.equal(nextSignalCall(signals,290,called),null);
 assert.equal(nextSignalCall(signals,301,called),3);
});

test('速度計は0を表示し、10と100で必要な桁だけ表示する',()=>{
 for(const [id,subjects] of [['e235',['ats231','ats232','ats233']],['e233',['ats45','ats46','ats47']]]){
  const digits=speed=>subjects.map(subject=>panelSpeedDigit(id,subject,speed));
  assert.deepEqual(digits(0),[null,null,0]);
  assert.deepEqual(digits(9.6),[null,1,0]);
  assert.deepEqual(digits(104),[1,0,4]);
 }
});

test('警笛は押している間だけループし、離すと余韻を一度再生する',async()=>{
 const sources=[],output={};
 const context={
  currentTime:1,
  createGain:()=>({gain:{setTargetAtTime(){}},connect(){},disconnect(){}}),
  createBufferSource(){
   const source={connect(target){return target;},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};
   sources.push(source);
   return source;
  }
 };
 const horn=new HeldHorn(context,output),loop={duration:.8},tail={duration:.16};
 await horn.press(loop,tail);
 await horn.press(loop,tail);
 assert.equal(sources.length,1);
 assert.equal(sources[0].loop,true);
 horn.release();
 await Promise.resolve();
 assert.equal(sources[0].stopped,true);
 assert.equal(sources[1].buffer,tail);
 horn.end(true);
 assert.equal(sources[1].stopped,true);
 const pending=horn.press(Promise.resolve(loop),tail);
 horn.release();
 await pending;
 assert.equal(sources.length,2);
});

test('4路線の全駅に停車喚呼がある',async()=>{
 for(const [bank,route] of ['yamanote','chuo','osaka','tokaido'].entries()){
  const assets=new URL('../dist/assets/final/',import.meta.url);
  const {stations}=JSON.parse(await readFile(new URL(route+'-route.json',assets),'utf8'));
  for(const index of stations.keys()){
   const data=await readFile(new URL(`driver-voice/kanko${bank}/approach/${index}.wav`,assets));
   assert.equal(data.toString('ascii',0,4),'RIFF');
  }
 }
});

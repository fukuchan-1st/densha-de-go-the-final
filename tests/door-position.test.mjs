import test from 'node:test';import assert from 'node:assert/strict';
import {createJourney,finishStop,beginDoorClosing,isDoorClosing} from '../dist/final-model.js';import {correctStoppedOverrun,completeDoorSequence} from '../dist/train-operations.js';
const route={stations:[{s:0},{s:1000},{s:3000}]};
test('closing first and subsequent stations never changes position, even on duplicate completion',()=>{
 const run=createJourney(route,{});run.doorPhase='closing';assert.equal(finishStop(run,route),true);assert.equal(run.s,0);assert.equal(run.next,1);assert.equal(finishStop(run,route),false);assert.equal(run.next,1);
 run.s=1001.5;run.doors=true;run.doorPhase='boarding';const attempt=beginDoorClosing(run,1);assert.ok(isDoorClosing(run,attempt));assert.equal(beginDoorClosing(run,1),null);run.doorPhase='closing';assert.equal(finishStop(run,route,1),true);assert.equal(run.s,1001.5);assert.equal(run.next,2);assert.equal(isDoorClosing(run,attempt),false);assert.equal(finishStop(run,route,1),false);assert.equal(run.next,2);assert.equal(run.s,1001.5);
});
test('late callbacks from an earlier attempt cannot complete the current closing cycle',()=>{
 const run={s:1000,v:0,next:1,doors:true,doorPhase:'boarding',errors:[],served:0,endIndex:2};const first=beginDoorClosing(run,1);run.doorPhase='audio-error';const retry=beginDoorClosing(run,1);assert.equal(isDoorClosing(run,first),false);assert.equal(isDoorClosing(run,retry),true);assert.equal(finishStop(run,route,2),false);assert.equal(run.next,1);assert.equal(run.s,1000);
});
test('distant targets, invalid coordinates and moving trains never snap to another station',()=>{
 for(const [s,v,target] of [[3000,0,1000],[1000,0,3000],[NaN,0,1000],[1000,0,NaN],[1005,2,1000]]){const run={s,v,doors:false};assert.equal(correctStoppedOverrun(run,target),null);assert.ok(Object.is(run.s,s));}
 const nearby={s:1004,v:0,doors:false};assert.equal(correctStoppedOverrun(nearby,1000),4);assert.equal(nearby.s,1000);
});
test('door completion refuses a different physical station without moving the train',()=>{const run={s:1000,v:0,next:2,doors:true,doorPhase:'closing',errors:[],served:0,endIndex:2};assert.equal(finishStop(run,route),false);assert.equal(run.s,1000);assert.equal(run.next,2);assert.equal(run.doors,true);});
test('701 closing also leaves position unchanged and cannot advance twice',()=>{const run={s:1001,v:0,next:1,doors:true,doorPhase:'closing',doorCloseDone:true,errors:[],served:0};assert.equal(completeDoorSequence(run,route.stations),true);assert.equal(completeDoorSequence(run,route.stations),false);assert.equal(run.s,1001);assert.equal(run.next,2);});

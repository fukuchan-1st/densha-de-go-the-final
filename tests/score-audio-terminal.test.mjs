import test from 'node:test';
import assert from 'node:assert/strict';
import {ScoreAudio} from '../dist/score-audio.js';
import {beginTerminalOpening,advanceTerminalOpening} from '../dist/terminal-arrival.js';
test('採点SEを待ち行列にせず重ねて鳴らし、一時停止で全音を止める',()=>{
 const clips=[],mixer=new ScoreAudio({createAudio:url=>{const audio={url,play:()=>{audio.played=true;return Promise.resolve();},pause:()=>audio.paused=true};clips.push(audio);return audio;}});
 mixer.play('combo1');mixer.play('combo2');mixer.play('D20');assert.equal(mixer.active.size,3);assert.ok(clips.every(a=>a.played));
 clips[0].onended();assert.equal(mixer.active.size,2);mixer.stop();assert.equal(mixer.active.size,0);assert.ok(clips.slice(1).every(a=>a.paused));
});
test('終点では戸開音が終わってから乗務終了し、戸開とノッチを保つ',async()=>{
 const state={s:1002,v:0,notch:-4,doors:true,next:3,served:2,errors:[]};let finish;
 beginTerminalOpening(state,new Promise(resolve=>finish=resolve));assert.equal(advanceTerminalOpening(state,1000,10),false);assert.equal(state.finished,undefined);
 finish(true);await Promise.resolve();assert.equal(advanceTerminalOpening(state,1000,.1),true);
 assert.equal(state.doors,true);assert.equal(state.notch,-4);assert.equal(state.served,3);assert.deepEqual(state.errors,[2]);
 assert.equal(advanceTerminalOpening(state,1000,10),false);assert.equal(state.served,3);
});
test('戸開音がない時は3秒の開扉待ちを終えてから結果を表示する',async()=>{
 const state={s:1000,doors:true,next:1,served:0,errors:[]};beginTerminalOpening(state,Promise.resolve(false));await Promise.resolve();
 assert.equal(advanceTerminalOpening(state,1000,2.9),false);assert.equal(advanceTerminalOpening(state,1000,.11),true);
});

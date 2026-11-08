import test from 'node:test';
import assert from 'node:assert/strict';
import {phoneGeometry} from '../dist/phone-layout.js';
import {BufferedEffects} from '../dist/buffered-effects.js';
test('phone reserves a right gutter and retains 16:9',()=>{
 for(const [w,h] of [[925,410],[667,375],[800,450],[568,320]]){
  const x=phoneGeometry(w,h,true,true);assert.equal(x.rail,76);assert.ok(x.game.left+x.game.width<=w-76+.001);assert.ok(Math.abs(x.game.width/x.game.height-16/9)<1e-6);
 }
 assert.ok(phoneGeometry(390,844,true).portrait);assert.equal(phoneGeometry(1180,820,true,true).rail,0);assert.equal(phoneGeometry(1920,1080,false,true).rail,0);
});
test('audio waits for resume before scheduling',async()=>{
 let release;const started=[];const context={state:'suspended',currentTime:1,destination:{},resume:()=>new Promise(r=>release=()=>{context.state='running';r();}),decodeAudioData:async()=>({duration:.4}),createGain:()=>({gain:{},connect(){},disconnect(){}}),createBufferSource:()=>({connect(){},disconnect(){},start(t){started.push(t);},stop(){}})};
 const bus=new BufferedEffects(context,{fetchAudio:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})});await bus.preload(['a']);bus.playSequence(['a']);await new Promise(r=>setImmediate(r));assert.equal(started.length,0);release();await new Promise(r=>setImmediate(r));assert.equal(started.length,1);
});
test('decode failure falls back with independent overlapping pairs',async()=>{
 const clips=[],context={resume:async()=>{},decodeAudioData:async()=>{throw Error('decode');}};
 const bus=new BufferedEffects(context,{fetchAudio:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}),createAudio:url=>{const clip={url,play:async()=>{clip.played=true;},pause(){}};clips.push(clip);return clip;}});
 const a=bus.playSequence(['a','b']),b=bus.playSequence(['a','b']);await new Promise(r=>setImmediate(r));assert.equal(clips.length,2);assert.ok(clips.every(c=>c.played));clips[0].onended();assert.equal(clips.length,3);a.stop();b.stop();
});

test('native fetch keeps its Window receiver',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=function(){assert.equal(this,globalThis);calls++;return Promise.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});};
 try{const bus=new BufferedEffects({decodeAudioData:async()=>({duration:1})},{createAudio:null});await bus.preload(['a']);assert.equal(calls,1);}finally{globalThis.fetch=original;}
});

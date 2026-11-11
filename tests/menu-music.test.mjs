import test from 'node:test';import assert from 'node:assert/strict';import {mountMenuMusic} from '../dist/photo-menu.js';
test('title stays silent and returning from a drive starts menu BGM at zero, while menu-to-menu navigation preserves playback',()=>{
 const previous={Audio:globalThis.Audio,document:globalThis.document,addEventListener:globalThis.addEventListener};let starts=0;
 globalThis.Audio=class{currentTime=0;paused=true;play(){starts++;this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};globalThis.document={hidden:false,addEventListener(){}};globalThis.addEventListener=()=>{};
 try{const m=mountMenuMusic(()=>.5,{active:false});assert.equal(starts,0);m.setMenu(true);assert.equal(starts,1);m.audio.currentTime=48;m.setMenu(true);assert.equal(m.audio.currentTime,48);m.setMenu(false);assert.equal(m.audio.paused,true);m.setMenu(true);assert.equal(m.audio.currentTime,0);assert.equal(starts,2);m.setMenu(false);assert.equal(m.audio.paused,true);}finally{globalThis.Audio=previous.Audio;globalThis.document=previous.document;globalThis.addEventListener=previous.addEventListener;}
});

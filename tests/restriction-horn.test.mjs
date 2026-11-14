import test from 'node:test';import assert from 'node:assert/strict';
import {ScoreEngine} from '../dist/score-engine.js';import {currentScoreRestriction,scoreHazards,hornMarks} from '../dist/scoring.js';
const state=(s,kmh,t)=>({s,v:kmh/3.6,elapsed:t,notch:0,clockStart:0});
const route={limits:[{sStart:0,sEnd:1000,kmh:80},{sStart:200,sEnd:300,kmh:120},{sStart:1000,sEnd:2000,kmh:60}]};
const tick=(e,s,v,t,r=route)=>e.tick(state(s,v,t),{...currentScoreRestriction(r,s),eb:-9,stations:[]},.1);
test('numeric sign scores once on passage, never for waiting, interval completion or release',()=>{
 const e=new ScoreEngine();tick(e,0,60,0);tick(e,999,60,1);assert.equal(e.points,0);tick(e,1000,60,2);assert.equal(e.points,50);tick(e,1100,50,3);tick(e,2000,50,4);assert.equal(e.points,50);assert.equal(e.chain,1);
 tick(e,999,60,5);tick(e,1000,60,6);assert.equal(e.points,50);
});
test('3km/h over at the actual sign gives -100; later speeding does not repeat its event',()=>{
 const e=new ScoreEngine();e.award('〇','prior');tick(e,0,70,0);tick(e,999,63,1);tick(e,1000,63,2);assert.equal(e.points,-50);assert.equal(e.chain,0);tick(e,1500,90,3);tick(e,2000,90,4);assert.equal(e.points,-50);
});
test('less than 3km/h over at a sign has neither reward nor penalty',()=>{const e=new ScoreEngine();tick(e,999,62,0);tick(e,1000,62,1);assert.equal(e.events.length,0);});
test('non-proceed signal is scored on passage, proceed and release never score',()=>{
 const r={limits:[],signals:[{s:100,aspect:'yellow',speedLimitKmh:45},{s:500,aspect:'green'}]},e=new ScoreEngine();tick(e,0,40,0,r);tick(e,100,40,1,r);assert.equal(e.points,50);tick(e,500,80,2,r);assert.equal(e.points,50);assert.equal(currentScoreRestriction(r,600).limit,null);
 const f=new ScoreEngine();tick(f,0,48,0,r);tick(f,100,48,1,r);tick(f,500,80,2,r);assert.equal(f.points,-100);
});

test('tunnel and worker positions remain distinct and adjacent tunnel fragments merge',()=>{
 const hazards=scoreHazards({structures:[{kind:'tunnel',sStart:500,sEnd:600},{kind:'tunnel',sStart:600,sEnd:700},{kind:'workers',s:1200},{kind:'maintenance',s:1600}],workers:[{position:2000}]});assert.equal(hazards.length,4);assert.equal(new Set(hazards.map(h=>h.id)).size,4);assert.equal(hornMarks(hazards)[0].s,350);
});
test('horn held while entering 300–150m window earns once per location',()=>{
 const hazards=[{id:'t',s:500,name:'トンネル'},{id:'w',s:1000,name:'保線作業員'}],e=new ScoreEngine(),c={limit:null,stations:[],hazards};
 e.hornChange(true,0,100,hazards);assert.equal(e.points,0);e.tick(state(201,60,1),c,.1);assert.equal(e.points,50);e.tick(state(250,60,2),c,.1);assert.equal(e.points,50);e.hornChange(false,3,250,hazards);e.hornChange(true,4,300,hazards);assert.equal(e.points,50);e.hornChange(false,5,300,hazards);e.hornChange(true,6,800,hazards);assert.equal(e.points,150);assert.equal(hornMarks(hazards,e.done).length,0);
});
test('horn closer than 150m or farther than 300m earns nothing',()=>{for(const s of [100,351]){const e=new ScoreEngine();e.hornChange(true,0,s,[{id:'t',s:500}]);assert.equal(e.points,0);}});

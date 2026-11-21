import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {driveStep,controlsFor} from '../dist/final-model.js';import {step} from '../dist/physics.js';
import {weatherType,adhesionStep} from '../dist/weather.js';import {sampleState,replayStateAt} from '../dist/replay-store.js';
import {WeatherScene} from '../dist/weather-scene.js';import * as T from '../dist/assets/vendor/three.module.js';
const recipes=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url),'utf8')).trains;
const initial=(weather,notch)=>({s:100,v:0,elapsed:0,doors:false,notch,weather});
test('all playable trains hold actual speed during powered wheelspin in rain and snow, including the legacy 701',()=>{
 for(const train of recipes){
  if(!train.notchLabels?.includes('P1'))continue;
  const runs=['clear','rain','snow'].map(w=>initial(w,controlsFor(train).max));
  for(let i=0;i<200;i++)for(const state of runs)driveStep(state,train,.02);
  assert.ok(runs[0].v>runs[1].v&&runs[1].v===0&&runs[2].v===0,train.id);
  assert.equal(runs[0].wheelSlip,false);assert.ok(runs[1].wheelSlip&&runs[2].wheelSlip,train.id);
  assert.ok(runs[2].wheelSpeed>runs[2].v);assert.ok(runs[2].adhesionLimit<runs[1].adhesionLimit);assert.ok(runs.every(s=>Number.isFinite(s.v)&&s.v>=0));
 }
 const runs=['clear','rain','snow'].map(w=>initial(w,5));for(let i=0;i<100;i++)for(const state of runs)step(state,.02);
 assert.ok(runs[0].v>runs[1].v&&runs[1].v===0&&runs[2].v===0);assert.ok(runs[2].wheelSlip);
});
test('cutting power restores adhesion and gentle traction can avoid slip; braking and gradients stay independent',()=>{
 const state=initial('snow',5);for(let i=0;i<100;i++)adhesionStep(state,.8,.02);assert.ok(state.wheelExcess>1);
 for(let i=0;i<150;i++)adhesionStep(state,0,.02);assert.equal(state.wheelSlip,false);assert.equal(state.wheelExcess,0);
 assert.equal(adhesionStep(state,.10,.02),.10);assert.equal(state.wheelSlip,false);
 const train=recipes.find(t=>t.id==='e233');
 for(const grade of [-30,0,30]){
  const a={...initial('clear',-3),v:15},b={...initial('snow',-3),v:15};driveStep(a,train,.02,grade);driveStep(b,train,.02,grade);assert.equal(a.v,b.v);
 }
 const spinning={...initial('snow',controlsFor(train).max),v:10};for(let i=0;i<100;i++)driveStep(spinning,train,.02,20);assert.equal(spinning.v,10);assert.ok(spinning.wheelSpeed>10);spinning.notch=1;driveStep(spinning,train,.02);assert.equal(spinning.wheelSlip,false);
 const closed={...initial('snow',5),doors:true};driveStep(closed,train,.02);assert.equal(closed.v,0);assert.equal(closed.wheelSlip,false);
 assert.equal(weatherType('bad-value'),'clear');
});
test('dry or missing weather preserves existing motion exactly and replay preserves weather and wheel speed',()=>{
 const train=recipes.find(t=>t.id==='e233'),a=initial('clear',5),b=initial(undefined,5);
 for(let i=0;i<100;i++){driveStep(a,train,.02,10);driveStep(b,train,.02,10);}assert.equal(a.v,b.v);assert.equal(a.s,b.s);assert.equal(a.wheelSpeed,a.v);
 const snow={...initial('snow',5),wheelSlip:true,wheelSpeed:10,wheelExcess:5,elapsed:1};
 const sample=sampleState(snow);const replay=replayStateAt([sample,{...sample,elapsed:2}],1.5);assert.equal(replay.weather,'snow');assert.equal(replay.wheelSlip,true);assert.equal(replay.wheelSpeed,10);
});
test('rain and snow render separately, respect tunnels, pause and lightweight counts, and dispose cleanly',()=>{
 const world={scene:new T.Scene(),camera:new T.PerspectiveCamera(),quality:'light'},weather=new WeatherScene(world);
 weather.update(.02,{type:'rain'});assert.equal(weather.rain.visible,true);assert.equal(weather.snow.visible,false);assert.equal(weather.rainGeometry.drawRange.count,600);
 assert.ok([...weather.rainPositions].every(Number.isFinite));
 const time=weather.clock;weather.update(0,{type:'rain'});assert.equal(weather.clock,time);
 weather.update(.02,{type:'snow'});assert.equal(weather.rain.visible,false);assert.equal(weather.snow.visible,true);assert.equal(weather.snowGeometry.drawRange.count,650);
 weather.update(.02,{type:'snow',tunnel:1});assert.equal(weather.group.visible,false);
 weather.update(.02,{type:'clear'});assert.equal(weather.group.visible,false);weather.dispose();assert.equal(world.scene.children.length,0);
});

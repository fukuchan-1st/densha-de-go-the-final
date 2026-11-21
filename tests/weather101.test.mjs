import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {driveStep,controlsFor} from '../dist/final-model.js';import {step} from '../dist/physics.js';import {adhesionStep} from '../dist/weather.js';
const trains=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url),'utf8')).trains;
const state=(weather,notch,v=12)=>({weather,notch,v,s:100,elapsed:0,doors:false});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} versus ${b}`);
test('powered effort is 80 percent during wheelspin at the same actual speed for every vehicle',()=>{
 for(const train of trains){
  if(!train.notchLabels?.includes('P1'))continue;const notch=controlsFor(train).max;
  const coast=state('clear',0);driveStep(coast,train,.02);
  const dry=state('clear',notch);driveStep(dry,train,.02);
  for(const weather of ['rain','snow']){const wet=state(weather,notch);driveStep(wet,train,.02);assert.ok(wet.wheelSlip,train.id);close((wet.acceleration-coast.acceleration)/(dry.acceleration-coast.acceleration),.8);assert.ok(wet.v>12);assert.ok(wet.wheelSpeed>wet.v);}
 }
 const rain=state('rain',1,0),snow=state('snow',1,0);adhesionStep(rain,.25,.02);adhesionStep(snow,.25,.02);assert.equal(rain.wheelSlip,false);assert.equal(snow.wheelSlip,true);
});
test('strong service and emergency braking slide with 80 percent braking, while weak braking recovers',()=>{
 for(const train of trains){
  if(!train.notchLabels?.includes('P1'))continue;const c=controlsFor(train);
  const service=train.notchLabels.indexOf('B'+c.brakeMax)-c.neutral;
  for(const notch of [service,c.min])for(const weather of ['rain','snow']){
   const dry=state('clear',notch),wet=state(weather,notch);driveStep(dry,train,.02);driveStep(wet,train,.02);
   assert.equal(wet.wheelSlide,true,train.id);assert.equal(wet.wheelSlip,false);close(wet.acceleration/dry.acceleration,.8);assert.ok(wet.v>dry.v);assert.ok(wet.wheelSpeed<wet.v);
   wet.notch=train.notchLabels.indexOf('B1')-c.neutral;driveStep(wet,train,.02);assert.equal(wet.wheelSlide,false);
   wet.notch=0;driveStep(wet,train,.02);assert.equal(wet.wheelSlide,false);
  }
 }
});
test('legacy 701 shares 80 percent braking and acceleration; wet stopping distance is longer',()=>{
 const dry=state('clear',5),wet=state('rain',5),coast=state('clear',0),old=dry.v;
 step(dry,.02);step(wet,.02);step(coast,.02);close((wet.v-coast.v)/(dry.v-coast.v),.8);assert.ok(wet.v>old);
 for(const notch of [-8,-9]){const a=state('clear',notch),b=state('snow',notch);close(step(b,.02)/step(a,.02),.8);assert.ok(b.wheelSlide);assert.ok(b.wheelSpeed<b.v);}
 const a=state('clear',-8,20),b=state('snow',-8,20);for(let i=0;i<2000&&(a.v>0||b.v>0);i++){step(a,.02);step(b,.02);}assert.equal(a.v,0);assert.equal(b.v,0);assert.ok(b.s-a.s>40);assert.equal(b.wheelSlide,false);
});

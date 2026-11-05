import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LocalTrainAudio,motorPitch} from '../dist/final-audio.js';
import {interpolateColumn} from '../dist/final-vehicle.js';
import {runPitch} from '../dist/assets/audio/run-pitch.js';

const {trains}=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url),'utf8'));

function mockAudio(recipe){
 const parameter=()=>({value:0,setTargetAtTime(value){this.value=value;}});
 const context={
  currentTime:0,
  destination:{},
  createGain:()=>({gain:parameter(),connect(){},disconnect(){}}),
  createBufferSource:()=>({
   playbackRate:parameter(),
   connect(){},
   disconnect(){},
   start(){},
   stop(){this.onended?.();}
  })
 };
 const audio=new LocalTrainAudio(recipe,{},{context});
 audio.buffer=async()=>({});
 return audio;
}

test('周波数は1倍の基準点を超えて元の傾きで上がり、音量は末端の値を保つ',()=>{
 const frequency={labels:['0'],rows:[[0,0],[9.3,1],[40,null]]};
 assert.equal(motorPitch(frequency,0,9.3),1);
 assert.equal(motorPitch(frequency,0,18.6),2);
 assert.ok(Math.abs(motorPitch(frequency,0,27.9)-3)<1e-12);
 const volume={rows:[[0,0],[9.3,.6]]};
 assert.equal(interpolateColumn(volume,0,27.9),.6);
});

test('一定ピッチ・未設定・単一の周波数点は基準を保持する',()=>{
 assert.equal(motorPitch({rows:[[0,1],[40,1]]},0,120),1);
 assert.equal(motorPitch({rows:[[40,1]]},0,120),1);
 assert.equal(motorPitch(null,0,120),1);
 assert.equal(motorPitch({labels:['4'],rows:[[0,0],[40,1]]},0,120),1);
});

test('周波数の列番号と重複速度を解決して最後の区間を延長する',()=>{
 const frequency={labels:['4','','0'],rows:[[10,1,5,2],[5,0,5,1],[0,0,5,0],[5,null,5,1.5]]};
 assert.equal(motorPitch(frequency,0,5),1.5);
 assert.equal(motorPitch(frequency,0,20),3);
 assert.equal(motorPitch(frequency,4,20),3);
});

test('転動音は全車両の高速域で1倍を超え、指定された原音速度を参照する',async()=>{
 assert.equal(runPitch(120),4/3);
 assert.equal(runPitch(100,50),2);
 assert.equal(runPitch(100,0),100/90);
 assert.equal(runPitch(-120),4/3);
 assert.equal(runPitch(Number.NaN),.35);
 for(const recipe of trains){
  const audio=mockAudio(recipe);
  const speed=recipe.playableSpecs.maxSpeedKmh;
  audio.update(speed,0);
  await Promise.resolve();
  const run=[...audio.loops.entries()].find(([key])=>key.startsWith('run'))?.[1];
  assert.ok(run?.source,recipe.id);
  assert.ok(run.source.playbackRate.value>1,recipe.id);
  audio.stop();
 }
 const recipe={sounds:{run:{0:{entryIndex:1}}},rollingBaseSpeedKmh:{0:50}};
 const audio=mockAudio(recipe);
 audio.update(100,0);
 await Promise.resolve();
 assert.equal(audio.loops.get('run1').source.playbackRate.value,2);
 audio.stop();
});

test('実車両の力行と制動で基準速度を超えたモーター音が1倍に固定されない',async()=>{
 const cases=[
  ['e233',13,120,1.25],
  ['323',3,100,2],
  ['207',13,120,120/73],
  ['6050',15,110,110/90],
  ['223-1000',28,130,130/115.8],
  ['223',7,130,2.6],
  ['e353',18,130,130/118.34],
  ['e127',6,100,1.68795033*100/160]
 ];
 for(const [id,index,speed,expected] of cases){
  const recipe=trains.find(train=>train.id===id);
  for(const notch of [1,-1]){
   const audio=mockAudio(recipe);
   audio.update(speed,notch);
   await Promise.resolve();
   const motor=audio.loops.get('motor'+index);
   assert.ok(motor?.source,`${id} notch ${notch}`);
   assert.ok(Math.abs(motor.source.playbackRate.value-expected)<1e-9,`${id} notch ${notch}`);
   audio.stop();
  }
 }
});

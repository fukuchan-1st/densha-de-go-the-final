import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {LocalCabPanel,pressureSpriteFrame} from '../dist/final-panel.js';
const catalog=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('../dist/assets/final/vehicles/manifest.json',import.meta.url),'utf8'));

function panelFor(recipe){
 const draws=[];
 const context=new Proxy({drawImage(...args){draws.push(args);}}, {get(target,key){return target[key]??(()=>{});},set(target,key,value){target[key]=value;return true;}});
 const panel=new LocalCabPanel({getContext:()=>context},recipe,{});
 return {panel,draws};
}

test('全12形式のブレーキ圧・元空気溜め圧は常用と非常で有限値を保つ',()=>{
 for(const recipe of catalog.trains){
  const {panel}=panelFor(recipe);
  for(const notch of [-1,-recipe.playableSpecs.brakeNotches,-recipe.playableSpecs.brakeNotches-1,0]){
   for(let frame=0;frame<120;frame++)panel.render({notch,v:0,doors:false},1/60);
   assert.ok(Number.isFinite(panel.bc),`${recipe.id} BC ${notch}`);
   assert.ok(Number.isFinite(panel.sap),`${recipe.id} SAP ${notch}`);
  }
 }
});

test('E233とE353の圧力画像を全バンク同梱し、元設定の圧力範囲を保持する',async()=>{
 for(const [id,bcSubjects,mrSubjects] of [['e233',['ats123','ats124','ats125'],['ats127','ats128','ats129']],['e353',['ats235','ats236','ats237'],['ats240','ats241']]]){
  const recipe=catalog.trains.find(t=>t.id===id),{panel}=panelFor(recipe);
  assert.deepEqual(Object.keys(recipe.panel.pressureSprites),[...bcSubjects,...mrSubjects]);
  for(const subject of [...bcSubjects,...mrSubjects]){
   const bank=recipe.panel.pressureSprites[subject],element=recipe.panel.elements.find(e=>e.subject===subject&&e.type==='digitalnumber');
   assert.ok(element,`${id} ${subject}`);assert.ok(panel.supported(element));
   assert.equal(recipe.subjectMappings.vehicle[subject],bank.semantic);
   assert.equal((bank.maxKpa-bank.minKpa)/bank.stepKpa,9);
   for(const ref of [element.image,element.nightImage].filter(Boolean)){
    const entry=manifest.trains[id][ref.entryIndex];assert.ok(entry,`${id} ${subject}`);
    assert.ok((await stat(new URL(`../dist/assets/final/vehicles/${id}/${entry.file}`,import.meta.url))).size>0);
   }
  }
 }
});

test('E127と223の周波数コメントを音源番号として扱わない',()=>{
 for(const id of ['e127','223'])for(const phase of Object.values(catalog.trains.find(t=>t.id===id).motorNoise))for(const table of Object.values(phase)){
  assert.deepEqual(table.labels,[]);assert.ok(Array.isArray(table.sourceCommentLabels));
 }
});

test('圧力バンクを切り替える時に空白の末尾フレームや重なった針を表示しない',()=>{
 const e233=catalog.trains.find(t=>t.id==='e233').panel.pressureSprites;
 assert.equal(pressureSpriteFrame(e233,'ats123',180),9);
 assert.equal(pressureSpriteFrame(e233,'ats123',200),null);
 assert.equal(pressureSpriteFrame(e233,'ats124',200),0);
 assert.equal(pressureSpriteFrame(e233,'ats124',340),7);
 assert.equal(pressureSpriteFrame(e233,'ats125',340),null);
 assert.equal(pressureSpriteFrame(e233,'ats127',790),8);
 assert.equal(pressureSpriteFrame(e233,'ats127',800),null);
 assert.equal(pressureSpriteFrame(e233,'ats128',800),0);
 const e353=catalog.trains.find(t=>t.id==='e353').panel.pressureSprites;
 assert.equal(pressureSpriteFrame(e353,'ats240',780),8);
 assert.equal(pressureSpriteFrame(e353,'ats240',830),null);
 assert.equal(pressureSpriteFrame(e353,'ats241',830),3);
 assert.equal(pressureSpriteFrame(e353,'ats237',600),9);
});

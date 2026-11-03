import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {zipSync,strToU8} from '../dist/assets/vendor/fflate.module.js';
import {LocalTrainPack,crc32,interpolateColumn} from '../dist/final-vehicle.js';
import {LocalCabPanel,PANEL_CROPS,localNeedlePoint,localNeedleAngle,calibratedSpeedAngle,panelTransparentColor} from '../dist/final-panel.js';
import {LocalTrainAudio} from '../dist/final-audio.js';
const catalog=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url),'utf8'));
test('サイトの運転開始に必要な4車両の画像と音源がすべて同梱される',async()=>{
 const root=new URL('../dist/assets/final/vehicles/',import.meta.url);
 const {trains}=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 for(const recipe of catalog.trains){
  const panel=Object.assign(Object.create(LocalCabPanel.prototype),{recipe});
  const audio=Object.assign(Object.create(LocalTrainAudio.prototype),{recipe});
  if(recipe.id==='e233'){
   assert.equal(Object.keys(recipe.sounds.motor).length,24);
   assert.equal(interpolateColumn(recipe.motorNoise.power.volume,16,3),.6);
   assert.equal(interpolateColumn(recipe.motorNoise.brake.volume,16,5),.6);
   assert.equal(interpolateColumn(recipe.motorNoise.power.frequency,0,9.3),1);
  }
  const images=recipe.panel.elements.filter(element=>panel.supported(element))
   .flatMap(element=>[element.image,element.nightImage]).filter(Boolean);
  assert.ok(images.length>0);
  for(const cue of ['open','close','hornPrimary'])assert.ok(audio.effectRef(cue));
  for(const surface of ['long','bridge','tunnel'])assert.ok(audio.runRef(surface));
  for(const ref of [...images,...audio.assetRefs()]){
   const asset=trains[recipe.id]?.[ref.entryIndex];
   assert.ok(asset,`${recipe.id}: ${ref.entryName}`);
   assert.ok((await stat(new URL(`${recipe.id}/${asset.file}`,root))).size>0);
  }
  for(const ref of images){
   const asset=trains[recipe.id][ref.entryIndex];
   assert.deepEqual([asset.width,asset.height],[ref.width,ref.height]);
  }
 }
});
function fixture(){const data=strToU8('train-sample-with-original-crc'),zip=zipSync({'panel.txt':data},{level:6}),d=new DataView(zip.buffer),ref={entryIndex:0,entryName:'panel.txt',rawNameBase64:btoa('panel.txt'),crc32:crc32(data),method:8,compressedSize:d.getUint32(18,true),size:data.length,localHeaderOffset:0};return {data,zip,ref,recipe:{archive:{size:zip.length,entryCount:1}},file:new Blob([zip])};}
test('ローカルZIPから参照された1ファイルだけを復号しCRC・名前・サイズを照合する',async()=>{const f=fixture(),pack=await LocalTrainPack.open(f.file,f.recipe);assert.deepEqual(await pack.bytes(f.ref),f.data);await assert.rejects(pack.bytes({...f.ref,crc32:f.ref.crc32+1}),/一致/);await assert.rejects(pack.bytes({...f.ref,rawNameBase64:btoa('evil.txt')}),/一致/);await assert.rejects(LocalTrainPack.open(new Blob([f.zip.slice(1)]),f.recipe),/一致/);pack.dispose();await assert.rejects(pack.bytes(f.ref),/解除/);});
test('ZIP本文の改変をCRCで拒否し、未参照の実行ファイルを読み込まない',async()=>{const f=fixture(),bad=f.zip.slice();bad[30+'panel.txt'.length+2]^=1;const pack=await LocalTrainPack.open(new Blob([bad]),f.recipe);await assert.rejects(pack.bytes(f.ref));const serialized=JSON.stringify(catalog.trains.flatMap(t=>[t.sounds,t.panel.elements.map(e=>[e.image,e.nightImage])])),refs=serialized.match(/entryName[^,]+/g);assert.ok(refs.length>100);assert.ok(!refs.some(r=>/\.(dll|exe)/i.test(r)));});
test('4車両の原本編成と山手線の試作用編成を区別し、各ノッチ段数を保持する',()=>{assert.equal(catalog.trains.length,4);const [e235,e233,s323,s207]=catalog.trains;assert.equal(e235.sourceSpecs.carCount,15);assert.equal(e235.playableSpecs.carCount,11);assert.equal(e233.playableSpecs.carCount,12);assert.equal(s323.playableSpecs.holdingNotches,1);assert.equal(s207.playableSpecs.powerNotches,6);for(const t of catalog.trains){assert.equal(t.notchLabels[0],'EB');assert.equal(t.notchLabels.at(-1),'P'+t.playableSpecs.powerNotches);assert.ok(t.archive.size>1000000);}});
test('全車の針画像の回転中心は角度にかかわらず元パネルの計器中心に一致する',()=>{for(const t of catalog.trains){const crop=PANEL_CROPS[t.id];assert.equal(crop.width/crop.height,16/9);for(const e of t.panel.elements.filter(e=>e.type==='needle'))for(const angle of[-180,-60,0,60,180])assert.deepEqual(localNeedlePoint(e,...e.origin,angle),e.location);}assert.equal(localNeedleAngle({minimum:0,maximum:160,initialangle:-120,lastangle:120},80),0);const c=catalog.trains.find(t=>t.id==='207').panel.speedGaugeCalibration;assert.equal(calibratedSpeedAngle(c.angleKnots,80),-4);assert.equal(calibratedSpeedAngle(c.angleKnots,85),3.5);});
test('速度別モーター表の空欄を飛ばして補間し端点で固定する',()=>{const t={rows:[[0,0,null],[10,null,1],[20,1,null],[30,null,0]]};assert.equal(interpolateColumn(t,0,10),.5);assert.equal(interpolateColumn(t,1,20),.5);assert.equal(interpolateColumn(t,1,0),1);assert.equal(interpolateColumn(t,0,100),1);assert.equal(interpolateColumn(null,0,10,.2),.2);});
test('透明色未指定の運転台では黒を抜かずPNG本来のアルファを保ち、明示指定のみ適用する',()=>{for(const t of catalog.trains){for(const e of t.panel.elements){const color=panelTransparentColor(e,t.panel);if(t.id==='e233'&&['background','pilotlamp'].includes(e.type)&&!e.transparentcolor)assert.equal(color,null);if(e.transparentcolor)assert.equal(color,e.transparentcolor);if(e.subject==='true'&&['e233','e235','323'].includes(t.id)&&!e.transparentcolor)assert.equal(e.image.transparentColor,undefined);}}assert.equal(panelTransparentColor({}, {this:{transparentcolor:'FF0000'}}),'FF0000');});
test('読み込み車両の戸閉音は終了まで完了せず、停止・やり直しでは完了通知を取り消す',async()=>{
 const sources=[],context={currentTime:0,destination:{},createGain:()=>({gain:{value:1},connect(){},disconnect(){}}),createBufferSource(){const s={connect(){},start(){},stop(){this.onended?.();}};sources.push(s);return s;}};
 const recipe={sounds:{door:{closeright:{entryIndex:1}}}},audio=new LocalTrainAudio(recipe,{}, {context});audio.buffer=async()=>({});let completed=false;const first=audio.playEffect('close').then(done=>{completed=done;return done;});await Promise.resolve();assert.equal(completed,false);assert.equal(sources.length,1);sources[0].onended();assert.equal(await first,true);const cancelled=audio.playEffect('close');await Promise.resolve();audio.stop();assert.equal(await cancelled,false);
 let release;audio.buffer=()=>new Promise(resolve=>{release=resolve;});const loading=audio.playEffect('close');audio.stop();release({});assert.equal(await loading,false);assert.equal(sources.length,2);
});

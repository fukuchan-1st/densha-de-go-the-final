import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';
import {vehiclePhoto} from '../dist/vehicle-photos.js';
const load=async name=>JSON.parse(await readFile(new URL('../dist/assets/final/'+name,import.meta.url),'utf8'));
test('221系の運転素材・針・モーター表を内蔵している',async()=>{
 const recipe=(await load('vehicle-recipes.json')).trains.find(t=>t.id==='221');
 assert.equal(recipe.playableSpecs.carCount,8);
 assert.deepEqual(recipe.missingReferences,[]);
 for(const subject of ['kmph','mr','bc'])assert.ok(recipe.panel.elements.some(e=>e.type==='needle'&&e.subject===subject));
 assert.ok(Object.keys(recipe.sounds.motor).length>0);
 assert.ok(recipe.motorNoise.power.frequency.rows.length>0);
 const entries=(await load('vehicles/manifest.json')).trains['221'];
 for(const entry of Object.values(entries))await access(new URL('../dist/assets/final/vehicles/221/'+entry.file,import.meta.url));
});
test('両路線の221系を選択でき、快速と普通の停車駅を区別する',async()=>{
 for(const line of ['tokaido','osaka'])assert.ok(serviceChoices[line].some(c=>c[1]==='221'));
 const route=await load('tokaido-route.json');
 const local=makeServiceRoute(route,'221','普通'),rapid=makeServiceRoute(route,'221','快速');
 assert.ok(rapid.stations.length<local.stations.length);
 assert.equal(rapid.stations[0].name,'京都');assert.equal(rapid.stations.at(-1).name,'神戸');
});
test('7車両の選択写真が対応する内蔵ファイルを指す',async()=>{
 for(const id of ['e353','211','383','e127','223','223-1000','221']){
  const photo=vehiclePhoto(id,'chuo');assert.ok(photo.includes('/'+id+'.webp'));
  await access(new URL('../dist/'+photo,import.meta.url));
 }
});

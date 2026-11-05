import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';
const assets=new URL('../dist/assets/final/',import.meta.url);
const {trains}=JSON.parse(await readFile(new URL('vehicle-recipes.json',assets),'utf8'));

test('大糸線は信濃大町でE127系と211系の運転区間を分ける',async()=>{
 const r=JSON.parse(await readFile(new URL('oito-route.json',assets),'utf8'));
 const north=makeServiceRoute(r,'e127','普通'),south=makeServiceRoute(r,'211','普通');
 assert.equal(north.stations[0].name,'南小谷');assert.equal(north.stations.at(-1).name,'信濃大町');
 assert.equal(south.stations[0].name,'信濃大町');assert.equal(south.stations.at(-1).name,'松本');
 assert.ok(north.stations.every(s=>s.s<=south.stations[0].s));
 assert.ok(south.stations.every(s=>s.s>=north.stations.at(-1).s));
 assert.equal(south.stations[0].layoutIndex,r.stations.findIndex(s=>s.name==='信濃大町'));
 assert.deepEqual(serviceChoices.chuo.filter(([id])=>id==='oito').map(([,vehicle])=>vehicle),['e127','211']);
});
test('全路線に列車選択があり、新車両と運転コースを参照できる',async()=>{
 for(const choices of Object.values(serviceChoices)){
  assert.ok(choices.length);
  for(const [id,vehicle,service] of choices){
   if(id==='tohoku'){assert.equal(vehicle,'701');continue;}
   const train=trains.find(t=>t.id===vehicle);
   assert.ok(train,vehicle);
   const route=JSON.parse(await readFile(new URL(id+'-route.json',assets),'utf8'));
   const trip=makeServiceRoute(route,vehicle,service);
   assert.ok(trip.stations.length>=2);
   for(let i=1;i<trip.stations.length;i++)assert.ok(trip.stations[i].s>trip.stations[i-1].s,id);
   for(const key of ['points','structures'])assert.ok(trip[key].length||key==='structures');
  }
 }
});
test('新快速は通過駅を飛ばし211系には車両別のBVE制限を選ぶ',async()=>{
 const tokaido=JSON.parse(await readFile(new URL('tokaido-route.json',assets),'utf8'));
 const rapid=makeServiceRoute(tokaido,'223-1000','新快速');
 assert.ok(rapid.stations.some(st=>st.name==='高槻'));
 assert.ok(!rapid.stations.some(st=>st.name==='摂津富田'));
 const shinonoi=JSON.parse(await readFile(new URL('shinonoi-extended-route.json',assets),'utf8'));
 const local=makeServiceRoute(shinonoi,'211','普通');
 assert.deepEqual(local.limits,shinonoi.limitsByVehicle['211']);
 assert.ok(local.stations.every(st=>!st.passOnly));
});

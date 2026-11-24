import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import * as T from '../dist/assets/vendor/three.module.js';
import {RoadSeparation,roadElevation} from '../dist/road-separation.js';import {characterAnchors} from '../dist/station-characters.js';import {decodeVertices,decodeIndices} from '../dist/model-format.js';import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';import {loadServiceRoutes} from './service-fixture.mjs';
const route=(roads,structures=[])=>({id:'test',length:2000,points:[[-300,0,-300,0],[2300,0,2300,0]],stations:[{name:'A',s:0},{name:'B',s:2000}],roads,structures});
const crossing=s=>({s,width:8,points:[[-80,s],[80,s]]});
test('parallel road edges stay outside the rail and keep ground height',()=>{const world={length:2000,route:{neighborTracks:[]},point:s=>new T.Vector3(0,0,-s),frame:(s,x=0)=>({p:new T.Vector3(x,0,-s)}),driveOffset:()=>0,deckHeight:()=>0},separation=new RoadSeparation(world),points=separation.separateParallel([[1,500],[1,900]],6);assert.ok(points.every(p=>p[0]>=5.8));assert.deepEqual(separation.separateParallel(points,6),points);assert.equal(separation.profile({s:700},{length:400},[]).base,-.1);});
test('E131 adds 3/6-car all-stop services only beyond Takao and uses the supplied cab/sounds',async()=>{
 const routes=await loadServiceRoutes(),choices=serviceChoices.chuo.filter(x=>x[1]==='e131'&&x[0]==='chuo-extended');assert.equal(choices.length,4);assert.equal(serviceChoices.chuo.filter(x=>x[1]==='e131'&&x[0]==='shinonoi-extended').length,4);
 for(const choice of choices){const r=makeServiceRoute(routes.get(choice[0]),...choice.slice(1));assert.deepEqual(new Set([r.stations[0].name,r.stations.at(-1).name]),new Set(['高尾','松本']));assert.ok(!r.stations.some(x=>x.name==='東京'));}
 const recipes=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url))),train=recipes.trains.find(t=>t.id==='e131');assert.equal(train.sourceVehicle,'0-2O.txt');assert.equal(train.playableSpecs.carCount,3);assert.equal(train.missingReferences.length,0);assert.ok(train.panel.elements.length>0);assert.ok(Object.keys(train.motorNoise).length>0);
 const model=JSON.parse(await readFile(new URL('../dist/assets/opposing/manifest.json',import.meta.url))).models.e131,head=model.variants.head;
 // The previous rotation error produced a 15 m wide, 21 m high model. Cropping
 // that bad transform removed cab parts; require the full source geometry here.
 assert.ok(head.vertices>150000);assert.ok(head.bounds[1][0]-head.bounds[0][0]<3.1);assert.ok(head.bounds[1][1]-head.bounds[0][1]<5);
});
test('each supplied character has one station anchor and bounded indexed geometry',async()=>{
 const routes=await loadServiceRoutes(),r=routes.get('toho'),anchors=characterAnchors(r);assert.deepEqual(anchors.map(x=>x.station),['博麗前','霧雨','紅魔']);assert.equal(new Set(anchors.map(x=>x.id)).size,3);assert.equal(characterAnchors({...r,id:'chuo'}).length,0);
 const base=new URL('../dist/assets/station-characters/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',base)));
 for(const [id,model]of Object.entries(manifest.models)){const raw=await readFile(new URL(model.file,base)),idx=await readFile(new URL(model.indexFile,base)),vertices=decodeVertices(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),model.componentType),indices=decodeIndices(idx.buffer.slice(idx.byteOffset,idx.byteOffset+idx.byteLength));assert.ok(vertices.every(Number.isFinite),id);assert.ok(indices.every(i=>i<model.vertices));assert.ok(model.height>1.5&&model.height<1.8);for(const group of model.groups)if(group.material.texture)assert.ok((await readFile(new URL(group.material.texture,base))).length>0);}
});


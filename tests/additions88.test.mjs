import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import * as T from '../dist/assets/vendor/three.module.js';
import {prepareRailUnderpasses,embankmentHeight} from '../dist/rail-embankment.js';import {RoadSeparation,roadElevation} from '../dist/road-separation.js';import {characterAnchors} from '../dist/station-characters.js';import {decodeVertices,decodeIndices} from '../dist/model-format.js';import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';import {loadServiceRoutes} from './service-fixture.mjs';
const route=(roads,structures=[])=>({id:'test',length:2000,points:[[-300,0,-300,0],[2300,0,2300,0]],stations:[{name:'A',s:0},{name:'B',s:2000}],roads,structures});
const crossing=s=>({s,width:8,points:[[-80,s],[80,s]]});
test('road intersections raise the rail by 6 m, keep smooth ramps and merge closely spaced passages',()=>{const r=prepareRailUnderpasses(route([crossing(700),crossing(760)]));assert.equal(r.roadUnderpasses.length,1);assert.equal(embankmentHeight(r,700),6);assert.equal(embankmentHeight(r,760),6);assert.equal(embankmentHeight(r,400),0);assert.ok(embankmentHeight(r,550)>0&&embankmentHeight(r,550)<6);assert.equal(prepareRailUnderpasses(r),r);});
test('parallel roads, level crossings, tunnels and existing urban viaducts do not add rail mounds',()=>{
 assert.equal(prepareRailUnderpasses(route([{s:700,width:6,points:[[2,500],[2,900]]}])).roadUnderpasses.length,0);
 for(const structures of [[{kind:'crossing',sOrigin:700,sStart:690,sEnd:710}],[{kind:'tunnel',sStart:650,sEnd:750}]])assert.equal(prepareRailUnderpasses(route([crossing(700)],structures)).roadUnderpasses.length,0);
 assert.equal(prepareRailUnderpasses({...route([crossing(700)]),elevatedTrack:[[-300,4.8],[2300,4.8]]}).roadUnderpasses.length,0);
});
test('parallel road edges stay outside the rail and keep ground height',()=>{const world={length:2000,route:{neighborTracks:[]},point:s=>new T.Vector3(0,0,-s),frame:(s,x=0)=>({p:new T.Vector3(x,0,-s)}),driveOffset:()=>0,deckHeight:()=>0},separation=new RoadSeparation(world),points=separation.separateParallel([[1,500],[1,900]],6);assert.ok(points.every(p=>p[0]>=5.8));assert.deepEqual(separation.separateParallel(points,6),points);assert.equal(separation.profile({s:700},{length:400},[]).base,-.1);});
test('E131 adds two all-stop services only beyond Takao and uses the supplied cab/sounds',async()=>{
 const routes=await loadServiceRoutes(),choices=serviceChoices.chuo.filter(x=>x[1]==='e131');assert.equal(choices.length,2);
 for(const choice of choices){const r=makeServiceRoute(routes.get(choice[0]),...choice.slice(1));assert.deepEqual(new Set([r.stations[0].name,r.stations.at(-1).name]),new Set(['高尾','松本']));assert.ok(!r.stations.some(x=>x.name==='東京'));}
 const recipes=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url))),train=recipes.trains.find(t=>t.id==='e131');assert.equal(train.sourceVehicle,'0-2O.txt');assert.equal(train.playableSpecs.carCount,2);assert.equal(train.missingReferences.length,0);assert.ok(train.panel.elements.length>0);assert.ok(Object.keys(train.motorNoise).length>0);
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

test('raised level-crossing approaches meet the rail while unrelated roads stay on the ground',()=>{const world={length:1000,route:{neighborTracks:[]},point:s=>new T.Vector3(0,0,-s),frame:(s,x=0)=>({p:new T.Vector3(x,0,-s)}),driveOffset:()=>0,deckHeight:()=>6},sep=new RoadSeparation(world),path={length:200,points:[[-100,500],[100,500]],distances:[0,200]},profile=sep.profile({s:500,width:6},path,[{sOrigin:500}]);assert.equal(roadElevation(profile,100),6.06);assert.equal(sep.profile({s:500,width:6},{length:200,points:[[-100,540],[100,540]],distances:[0,200]},[{sOrigin:500}]).spans.length,0);});

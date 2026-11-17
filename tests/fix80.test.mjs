import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from '../dist/assets/vendor/three.module.js';
import {makeServiceRoute,serviceChoices} from '../dist/train-selection.js';import {loadServiceRoutes} from './service-fixture.mjs';import {chuoScenery,mountainArea,valleyWidth} from '../dist/geographic-sections.js';import {routeLimitAt} from '../dist/final-model.js';import {setRailPose} from '../dist/rail-pose.js';import {opposingVehicles} from '../dist/opposing-models.js';import {RoadSeparation,roadElevation,mergeRoadSpans} from '../dist/road-separation.js';
const routes=await loadServiceRoutes();
test('Matsumoto is low-rise with surrounding mountains in both directions; only the 110 maximum is released for expresses',()=>{
 for(const reverse of[false,true]){const r=makeServiceRoute(routes.get('chuo-extended'),'e353','特急',{reverse,pattern:'all'}),m=r.sceneryStations.find(s=>s.name==='松本');if(!m)continue;const sh=r.sceneryStations.find(s=>s.name==='塩尻');assert.equal(chuoScenery(r,m.s),'suburban');assert.equal(mountainArea(r,m.s),true);assert.ok(valleyWidth(r,m.s)>=1200);const mid=(m.s+sh.s)/2;assert.notEqual(routeLimitAt(r,mid),110);assert.ok(!r.limits.some(x=>x.kmh===110&&x.sStart<Math.max(m.s,sh.s)&&x.sEnd>Math.min(m.s,sh.s)));assert.ok(r.limits.some(x=>x.kmh===35));}
 const original=routes.get('chuo-extended'),tokyo=original.stations.find(x=>x.name==='新宿');assert.equal(chuoScenery(original,tokyo.s),'city');
});
test('rigid car follows both bogies on positive and negative grades in either travel direction',()=>{
 for(const grade of[-.04,.04])for(const direction of[-1,1]){const car=new T.Object3D(),front=new T.Vector3(0,7.1*grade*direction,7.1*direction),rear=front.clone().multiplyScalar(-1);setRailPose(car,front,rear);const forward=new T.Vector3(0,0,1).applyEuler(car.rotation);assert.ok(forward.dot(front.clone().normalize())>.999999);assert.ok(Math.abs(car.position.y)<1e-9);assert.ok(Math.abs(car.rotation.x)>0);}
});
test('opposing pools match geographical sections in either direction, including E127/313 supplied bodies',()=>{
 const expected=[['chuo-extended','東京','高尾',['e233','e353']],['chuo-extended','高尾','大月',['211','e131','e233','e353']],['chuo-extended','大月','上諏訪',['211','e131','e353']],['chuo-extended','上諏訪','塩尻',['211','e131','e353','313']],['chuo-extended','塩尻','松本',['211','e131','e353','313','383','e127']],['oito','南小谷','信濃大町',['e127','e353','383']],['oito','信濃大町','松本',['211','e353','e127','383']],['shinonoi-extended','松本','篠ノ井',['211','383','e127']]];
 for(const [id,a,b,pool]of expected){const raw=routes.get(id);for(const reverse of[false,true]){const r=makeServiceRoute(raw,'211','普通',{pattern:'all',reverse}),stations=r.sceneryStations,x=stations.find(s=>s.name===a),y=stations.find(s=>s.name===b);assert.deepEqual(opposingVehicles(r,(x.s+y.s)/2),pool,id+' '+a+' '+reverse);}}
 const manifest=JSON.parse(fs.readFileSync(new URL('../dist/assets/opposing/manifest.json',import.meta.url)));for(const id of['e127','313'])assert.ok(manifest.models[id].variants.head.vertices>100);
});
function flatWorld(deck=0,crossings=[]){return {length:1000,route:{structures:crossings,neighborTracks:[]},point:s=>new T.Vector3(0,0,-s),frame:(s,x=0)=>({p:new T.Vector3(x,0,-s)}),driveOffset:()=>0,deckHeight:()=>deck};}
const path={points:[[-120,500],[120,500]],distances:[0,240],length:240};
test('roads stay on the ground; mapped crossings and existing underpasses remain',()=>{
 const separation=new RoadSeparation(flatWorld()),profile=separation.profile({s:500,width:6},path,[]);assert.equal(profile.spans.length,0);assert.equal(roadElevation(profile,120),-.1);assert.equal(roadElevation(profile,50),roadElevation(profile,110));
 const elevated=new RoadSeparation(flatWorld(4.8));assert.equal(elevated.profile({s:500,width:6},path,[]).spans.length,0);
 const crossings=[{sOrigin:500}];assert.equal(separation.profile({s:500,width:6},path,crossings).spans.length,0);
 assert.deepEqual(mergeRoadSpans([{start:0,end:20,height:8},{start:119,end:140,height:9}]),[{start:0,end:140,height:9}]);assert.equal(mergeRoadSpans([{start:0,end:20,height:8},{start:120,end:140,height:9}]).length,2);
});

test('road junctions share the same elevated deck height with eased approaches',()=>{const junctions=new Map([['node',8]]),left={base:0,length:200,spans:[],endNode:'node',junctions},right={base:0,length:200,spans:[],startNode:'node',junctions};assert.equal(roadElevation(left,200),roadElevation(right,0));assert.equal(roadElevation(left,100),0);assert.equal(roadElevation(right,100),0);assert.ok(roadElevation(left,175)>0);});

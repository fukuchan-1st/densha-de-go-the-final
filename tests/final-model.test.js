import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createJourney,controlsFor,notchLabel,driveStep,brakeAssist,finishStop,takeDepartureCall,stopPosition,distanceLabel,interpolateTable} from '../dist/final-model.js';
import {FINAL_SCENARIOS,scenarioJourney} from '../dist/final-scenarios.js';
import {FinalWorld} from '../dist/final-world.js';
import {interpolateKnots} from '../dist/track-layout.js';
const recipes=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url))),ids=['yamanote','chuo','osaka','tokaido'],trains=['e235','e233','323','207'];
const routes=await Promise.all(ids.map(async id=>JSON.parse(await readFile(new URL(`../dist/assets/final/${id}-route.json`,import.meta.url)))));
test('4路線の全駅・営業キロと線路座標が一致し、ループの終点が起点に戻る',()=>{
 for(let i=0;i<routes.length;i++){const r=routes[i];assert.equal(r.stations.length,[31,24,20,33][i]);assert.equal(r.stations.at(-1).s,[34500,53100,21700,75900][i]);for(let j=1;j<r.points.length;j++){assert.ok(r.points[j][0]>r.points[j-1][0]);assert.ok(r.points[j].every(Number.isFinite));}for(const st of r.stations){const p=r.points.find(p=>Math.abs(p[0]-st.s)<.001);assert.ok(p);assert.ok(Math.hypot(p[1]-st.x,p[2]-st.z)<.01);}for(const s of r.structures){assert.ok(s.sStart>=0&&s.sEnd>s.sStart&&s.sEnd<=r.stations.at(-1).s);}assert.deepEqual(r.grades,[]);assert.deepEqual(r.limits,[]);if(i===0||i===2){assert.equal(r.stations[0].name,r.stations.at(-1).name);assert.ok(Math.hypot(r.points.at(-1)[1],r.points.at(-1)[2])<.01);}}
 assert.ok(routes[1].stations.some(s=>s.name==='高円寺'));assert.ok(routes[1].stations.some(s=>s.name==='阿佐ケ谷'));assert.ok(routes[1].stations.some(s=>s.name==='西荻窪'));
});
test('全4車両で戸開中は発車せず、戸閉確定でも操作した全ノッチを保持する',()=>{for(let i=0;i<4;i++){const recipe=recipes.trains.find(t=>t.id===trains[i]),route=routes[i],c=controlsFor(recipe);for(let n=c.min;n<=c.max;n++){const s=createJourney(route,recipe);s.notch=n;driveStep(s,recipe,3);assert.equal(s.v,0);assert.equal(s.notch,n);finishStop(s,route);assert.equal(s.notch,n);assert.equal(s.next,1);}assert.equal(notchLabel(recipe,c.min),'EB');assert.equal(notchLabel(recipe,0),'N');assert.equal(notchLabel(recipe,c.max),i===3?'P6':'P5');}});
test('指定の力行表を速度・ノッチごとに補間し、EBは停止して逆走しない',()=>{assert.equal(interpolateTable([[0,10],[10,30]],5),20);for(let i=0;i<4;i++){const recipe=recipes.trains.find(t=>t.id===trains[i]),c=controlsFor(recipe),s=createJourney(routes[i],recipe);s.doors=false;s.notch=c.max;driveStep(s,recipe,.1);assert.ok(s.v>0);s.notch=c.min;for(let j=0;j<100;j++)driveStep(s,recipe,.02);assert.equal(s.v,0);}});
test('各車両で停車アシストを使って4路線の全停車駅を走破する',()=>{for(let i=0;i<4;i++){const recipe=recipes.trains.find(t=>t.id===trains[i]),route=routes[i],c=controlsFor(recipe),s=createJourney(route,recipe);finishStop(s,route);for(let station=1;station<route.stations.length;station++){s.notch=c.max;let steps=0;while(!s.finished&&s.next===station&&steps++<30000){brakeAssist(s,route,recipe);driveStep(s,recipe,.08);if(s.v<.01&&Math.abs(s.s-route.stations[s.next].s)<=3){s.doors=true;const n=s.notch;finishStop(s,route);assert.equal(s.notch,n);}}assert.ok(steps<30000,`${route.id} ${route.stations[station].name}`);}assert.equal(s.served,route.stations.length-1);assert.ok(s.errors.every(e=>Math.abs(e)<=3));}});
test('右端マーカーは−10mから＋10mへ上から下に動き、5m以内はcmになる',()=>{assert.equal(stopPosition(10).percent,0);assert.equal(stopPosition(0).percent,50);assert.equal(stopPosition(-10).percent,100);assert.equal(stopPosition(10.01).visible,false);assert.equal(distanceLabel(5),'500 cm');assert.equal(distanceLabel(-.03),'3 cm');});
test('発車喚呼は戸閉後の発進時に出発駅の番号を一度だけ返す',()=>{
 const route=routes[1],train=recipes.trains[1],state=createJourney(route,train,5);
 assert.equal(takeDepartureCall(state),null);
 finishStop(state,route);
 assert.equal(takeDepartureCall(state),null);
 state.v=1;
 assert.equal(takeDepartureCall(state),5);
 assert.equal(takeDepartureCall(state),null);
 state.s=route.stations[6].s;
 state.v=0;
 state.doors=true;
 finishStop(state,route);
 state.v=1;
 assert.equal(state.next,7);
 assert.equal(takeDepartureCall(state),6);
 state.next=route.stations.length-1;
 finishStop(state,route);
 assert.equal(takeDepartureCall(state),null);
});
test('運転開始できる全駅に出発駅名と定発の音声がある',async()=>{
 const root=new URL('../dist/assets/final/driver-voice/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('departure-manifest.json',root)));
 for(const [bank,route] of routes.entries()){
  const entries=manifest[route.id];
  assert.deepEqual(entries.map(entry=>entry.station),route.stations.slice(0,-1).map(station=>station.name));
  for(const [index,entry] of entries.entries()){
   assert.equal(entry.file,`kanko${bank}/departure/${index}.wav`);
   const wave=await readFile(new URL(entry.file,root));
   assert.equal(wave.toString('ascii',0,4),'RIFF');
   assert.ok(wave.length>22050);
  }
 }
});
test('FINALの区間は指定した駅で終了し、環状線の継ぎ目も駅順と音声の対応を保つ',()=>{
 for(const [index,route] of routes.entries()){
  for(const scenario of FINAL_SCENARIOS[route.id]){
   const trip=scenarioJourney(route,scenario);
   const stations=trip.route.stations;
   const state=createJourney(trip.route,recipes.trains[index],trip.startIndex,trip.endIndex);
   assert.equal(stations[trip.startIndex].name,scenario[1]);
   assert.equal(stations[trip.endIndex].name,scenario[2]);
   const stationCount=route.stations.length-1;
   finishStop(state,trip.route);
   for(let station=trip.startIndex+1;station<=trip.endIndex;station++){
    assert.equal(state.finished,false);
    assert.ok(stations[station].s>stations[station-1].s);
    if(station>=stationCount&&route.loop)assert.equal(stations[station].layoutIndex,station%stationCount);
    state.s=stations[station].s;
    finishStop(state,trip.route);
   }
   assert.equal(state.finished,true);
   assert.equal(state.served,trip.endIndex-trip.startIndex);
   assert.equal(state.departureCall,null);
  }
 }
});
test('信号機は確認できた配置だけを描画し、環状線の一周後にも距離が対応する',async()=>{
 const bve=JSON.parse(await readFile(new URL('../dist/assets/bve-signals.json',import.meta.url)));
 assert.equal(bve.signals.filter(signal=>signal.kind==='main').length,20);
 assert.equal(bve.signals.filter(signal=>signal.kind==='relay').length,4);
 assert.ok(bve.signals.every(signal=>signal.s>0&&signal.s<bve.coverageEndM&&signal.support&&signal.sourceLine>0));
 const chuo=routes[1],osaka=routes[2];
 assert.equal(chuo.signals.length,1);
 assert.ok(chuo.sources[0].wayIds.includes(chuo.signals[0].osmWayId));
 assert.equal(osaka.signals.length,4);
 assert.ok(osaka.signals.every(signal=>signal.railErrorM<=3&&signal.x<=-2));
 const loop=scenarioJourney(osaka,FINAL_SCENARIOS.osaka.find(([id])=>id==='07')).route;
 assert.deepEqual(loop.signals.slice(4).map(signal=>signal.s),osaka.signals.map(signal=>signal.s+osaka.length));
});
test('駅ごとのホームが走行線に接し、線路との離隔を保つ',()=>{
 for(const [index,route] of routes.entries()){
  const world=Object.assign(Object.create(FinalWorld.prototype),{route,points:route.points,length:route.length});
  const tracks=[{start:0,end:route.length,offset:s=>world.driveOffset(s)}];
  for(const {knots,height} of route.neighborTracks){
   assert.ok(knots.every(([s,x],i)=>Number.isFinite(x)&&(i===0||s>knots[i-1][0])));
   tracks.push({start:knots[0][0],end:knots.at(-1)[0],height,offset:s=>interpolateKnots(knots,s)});
  }
  const surveyed=route.stations.slice(0,route.loop?-1:undefined)
   .filter(st=>route.stationLayouts[st.name]?.platforms?.length);
  assert.equal(surveyed.length,[30,21,19,33][index]);
  for(const st of surveyed){
   const platform=route.stationLayouts[st.name].platforms.find(p=>p.boarding);
   assert.ok(platform.edges[0][0]<=0&&platform.edges.at(-1)[0]>=0,st.name);
   const [left,right]=world.platformBounds(st,platform,st.s,tracks),x=world.driveOffset(st.s);
   assert.ok(right-left>=1,st.name);
   assert.ok(Math.max(left-x,x-right)>=1.45-1e-6,st.name);
  }
 }
});
test('高尾の3番線と東海道線の下り線を走行視点と線路が共有する',()=>{
 const chuo=routes[1],tokaido=routes[3];
 assert.equal(chuo.drivingTrackSources.at(-1).trackRef,'3');
 assert.equal(chuo.drivingTrack.at(-1)[0],53100);
 for(const [name,number] of [['京都','4'],['新大阪','7'],['大阪','6'],['元町','2'],['神戸','4']]){
  const anchor=tokaido.drivingTrackSources.find(st=>st.name===name);
  assert.equal(anchor.officialTrackRef??anchor.trackRef,number);
  const world=Object.assign(Object.create(FinalWorld.prototype),{route:tokaido,points:tokaido.points,length:tokaido.length});
  assert.ok(Math.abs(world.drivePoint(anchor.s).distanceTo(world.point(anchor.s))-Math.abs(anchor.xM))<.03);
 }
 const imamiya=routes[2].stationLayouts['今宮'].platforms;
 assert.equal(imamiya[0].boarding,true);
 assert.ok(imamiya[1].height>0);
});

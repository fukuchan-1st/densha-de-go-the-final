import test from 'node:test';
import assert from 'node:assert/strict';
import {TOBU_SCENARIOS,TOBU_TIMETABLES,tobuStopNames,applyTobuScenario} from '../dist/tobu-services.js';
test('21 bounded Tobu scenarios keep their requested train and endpoints',()=>{
 assert.equal(TOBU_SCENARIOS.length,21);assert.equal(new Set(TOBU_SCENARIOS.map(s=>s.id)).size,21);
 assert.deepEqual(TOBU_SCENARIOS.map(s=>s.number),Array.from({length:21},(_,i)=>i+1));
 assert.equal(TOBU_SCENARIOS[4].originPlatform.number,6);
 assert.equal(TOBU_SCENARIOS[4].carCount,7);
 assert.deepEqual(TOBU_SCENARIOS[7].formationChanges,[{station:'下今市',carCount:4},{station:'新藤原',carCount:2}]);
 assert.deepEqual(TOBU_SCENARIOS[8].formationChanges,[{station:'新藤原',carCount:4},{station:'下今市',carCount:6}]);
 assert.equal(TOBU_SCENARIOS[14].preserveExistingSchedule,true);
});
test('historical150 starts at its verified 2021 departure, keeps every stop and plans the rest from operating speeds',()=>{
 const s=TOBU_SCENARIOS[2];assert.equal(s.id,'tobu-liberty150-historic');assert.equal(s.stopRule,'all');assert.equal(s.schedule,'liberty150Historic');assert.equal(s.timetableStatus,'published-anchors');
 const r=applyTobuScenario({stations:[{name:'会津田島',s:0,departure:123},{name:'中荒井',s:4000},{name:'男鹿高原',s:30000},{name:'下今市',s:80000}]},s.id);
 assert.equal(r.stations.length,4);assert.equal(r.stations[0].departure,17*3600+49*60);assert.equal(r.stations[1].departure,undefined);assert.equal(r.stations.at(-1).arrival,undefined);
 assert.equal(r.stations[2].arrival,undefined);assert.equal(r.publishedSchedule.estimated,true);assert.match(r.publishedSchedule.title,/150/);
});
test('Nikko express skips intermediate stations and starts at its source departure minute',()=>{
 const names=['南栗橋','栗橋','新古河','柳生','板倉東洋大前','藤岡','静和','新大平下','栃木','新栃木','合戦場','家中','東武金崎','楡木','樅山','新鹿沼','北鹿沼','板荷','下小代','明神','下今市','上今市','東武日光'];
 const route={stations:names.map((name,i)=>({name,s:i*3000,time:999}))};
 const result=applyTobuScenario(route,12);
 assert.deepEqual(result.stations.map(s=>s.name),TOBU_TIMETABLES.nikkoExpress.rows.map(s=>s.name));
 assert.equal(result.stations[0].departure,7*3600+3*60);assert.equal(result.stations.at(-1).arrival,undefined);
 assert.equal(result.sceneryStations.length,names.length);assert.equal(route.stations[0].time,999);
 assert.throws(()=>applyTobuScenario(route,1),/endpoints/);
});
test('section express stops at every station 浅草〜北千住 and north of 東武動物公園, in either direction (駅探 2026-11-26)',()=>{
 const names=['浅草','とうきょうスカイツリー','曳舟','東向島','北千住','小菅','西新井','草加','新越谷','越谷','せんげん台','春日部','北春日部','姫宮','東武動物公園','杉戸高野台','幸手','南栗橋'];
 const down=tobuStopNames(TOBU_SCENARIOS[5],names),up=tobuStopNames(TOBU_SCENARIOS[6],[...names].reverse());
 assert(down.includes('東向島'));assert(!down.includes('小菅'));assert(down.includes('杉戸高野台'));assert.deepEqual(down,[...up].reverse());
});
test('published rows have ordered clocks, actual provenance and consistent express101 stops',()=>{
 for(const book of Object.values(TOBU_TIMETABLES)){
  assert(book.source.url.startsWith('https://'));let last=-1;
  for(const row of book.rows)for(const t of [row.arrival,row.departure].filter(Boolean)){const [h,m]=t.split(':').map(Number),seconds=h*3600+m*60;assert(seconds>=last,book.trainNumber+' '+row.name);last=seconds;}
 }
 const names=['浅草','とうきょうスカイツリー','北千住','春日部','板倉東洋大前','栃木','新栃木','新鹿沼','下今市','新高徳','東武ワールドスクウェア','鬼怒川温泉','鬼怒川公園','新藤原','龍王峡','川治温泉','川治湯元','湯西川温泉','中三依温泉','上三依塩原温泉口','男鹿高原','会津高原尾瀬口','七ヶ岳登山口','会津山村道場','会津荒海','中荒井','会津田島'];
 const stops=tobuStopNames(TOBU_SCENARIOS[0],names);assert(stops.includes('板倉東洋大前'));assert(!stops.includes('新栃木'));assert(!stops.includes('中荒井'));
});

test('参考時刻表の1分以上の停車時分を停車秒数として持たせる(北越谷4分・東武動物公園3分)',()=>{
 const names=['北千住','小菅','北越谷','大袋','東武動物公園','南栗橋'];
 const r=applyTobuScenario({stations:names.map((name,i)=>({name,s:i*2000}))},'tobu-local-hibiya');
 assert.equal(r.stations[0].departure,5*3600+24*60);assert.equal(r.tobuDwells[4000],240);assert.equal(r.tobuDwells[8000],180);assert.equal(r.tobuDwells[2000],undefined);
});

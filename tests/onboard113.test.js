import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {onboardCue,chooseOnboardSet,DEPARTURE_AFTER_M,ARRIVAL_BEFORE_M} from '../dist/onboard-broadcast.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../dist/assets/onboard/manifest.json',import.meta.url),'utf8'));
const route={stations:[{name:'松本',s:0},{name:'田沢',s:5000},{name:'明科',s:11000}]};
const stations=manifest.sets['e131-down'].stations;
test('発車後放送は前の停車駅を200m過ぎてから、到着放送は500m手前で1回ずつ流す',()=>{
 const state={s:150,next:1,startIndex:0,doors:false};
 assert.equal(onboardCue(state,route,stations),null);
 state.s=DEPARTURE_AFTER_M+1;const dep=onboardCue(state,route,stations);assert.equal(dep.kind,'next');assert.match(dep.file,/^e131-down\//);
 state.s=3000;assert.equal(onboardCue(state,route,stations),null);
 state.s=5000-ARRIVAL_BEFORE_M+1;const arr=onboardCue(state,route,stations);assert.equal(arr.kind,'soon');
 assert.equal(onboardCue(state,route,stations),null);
});
test('駅間が短く「まもなく」を持たない駅は、発車後のタイミングで一続きの放送を流す',()=>{
 assert.ok(stations['川中島'].next);assert.equal(stations['川中島'].soon,undefined);
 const short={stations:[{name:'今井',s:0},{name:'川中島',s:600}]},state={s:DEPARTURE_AFTER_M+5,next:1,startIndex:0,doors:false};
 assert.equal(onboardCue(state,short,stations).kind,'next');state.s=590;assert.equal(onboardCue(state,short,stations),null);
});
test('録音と同じ向きの列車だけに放送を割り当てる',()=>{
 assert.equal(chooseOnboardSet(manifest.sets,'e131','普通','shinonoi-extended',['松本','田沢','明科','長野']),'e131-down');
 assert.equal(chooseOnboardSet(manifest.sets,'e131','普通','shinonoi-extended',['長野','明科','松本']),null);
 assert.equal(chooseOnboardSet(manifest.sets,'e353','特急あずさ','chuo-oito',['南小谷','白馬','松本','新宿']),'azusa-up');
 assert.equal(chooseOnboardSet(manifest.sets,'e233','各駅停車','chuo-itsukaichi',['立川','拝島','武蔵五日市']),'itsukaichi-down');
 assert.equal(chooseOnboardSet(manifest.sets,'211','普通','shinonoi-extended',['松本','長野']),null);
});
test('放送ファイルが全部そろっている',()=>{for(const set of Object.values(manifest.sets))for(const clips of Object.values(set.stations))for(const c of Object.values(clips))assert.ok(fs.existsSync(new URL('../dist/assets/onboard/'+c.file,import.meta.url)),c.file);});

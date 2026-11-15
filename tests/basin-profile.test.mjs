import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BASIN_PROFILE,basinAnchors,basinDensity,basinRelief,loadBasinProfile} from '../dist/basin-profile.js';
import {valleyWidth,chuoScenery} from '../dist/geographic-sections.js';
const route={id:'chuo-extended',stations:[{name:'大月',s:0},{name:'勝沼ぶどう郷',s:20000},{name:'甲府',s:41000},{name:'竜王',s:45500},{name:'韮崎',s:54000},{name:'小淵沢',s:80000}]};
test('basin density remains aligned for reverse and partial services',()=>{
 const reverse={...route,stations:route.stations.map(x=>({...x,s:80000-x.s})).reverse()};
 for(let s=20000;s<=54000;s+=250){const a=basinDensity(route,s),b=basinDensity(reverse,80000-s);for(const k of ['building','green','width'])assert.ok(Math.abs(a[k]-b[k])<1e-8);}
 const partial={...route,sceneryStations:route.stations.slice(2,5).map(x=>({...x,s:x.s-41000}))};
 for(const k of Object.keys(basinDensity(partial,0)))assert.ok(Math.abs(basinDensity(partial,0)[k]-basinDensity(route,41000)[k])<1e-8);
});
test('interpolation stays bounded and unrelated branches retain existing scenery',()=>{
 for(let s=20000;s<=54000;s+=137){const d=basinDensity(route,s);assert.ok(d.building>=0&&d.building<=100&&d.green>=0&&d.green<=100);}
 assert.equal(basinDensity(route,19999),null);assert.equal(basinDensity(route,54001),null);
 const unrelated={id:'oito',stations:[{name:'松本',s:0},{name:'白馬',s:60000}]};assert.deepEqual(basinAnchors(unrelated),[]);assert.equal(basinDensity(unrelated,1000),null);
 assert.ok(valleyWidth(route,41000)>4000);assert.equal(chuoScenery(route,41000),'city');assert.equal(chuoScenery(route,45500),'suburban');
});
test('density is automatically generated and manual storage cannot override it',()=>{
 const storage={getItem:()=>JSON.stringify({'甲府':{building:0,green:100}})};
 assert.deepEqual(loadBasinProfile(storage),BASIN_PROFILE);
 assert.ok(BASIN_PROFILE.every(p=>p.source==='osm-600m'&&Number.isFinite(p.coverage)));
});
test('wide flat basin floor is surrounded on every side by raised terrain',()=>{
 assert.equal(basinRelief(0,0),0);assert.equal(basinRelief(3000,2000),0);
 for(let i=0;i<16;i++){const a=i*Math.PI/8;assert.ok(basinRelief(Math.cos(a)*21000,Math.sin(a)*13000)>500);}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {sceneryDensity,sceneryProfiles} from '../dist/scenery-profile.js';
import {basinTerrainAt} from '../dist/basin-profile.js';
test('all seven lines and all supplied branches have valid, direction-independent density profiles',async()=>{
 const directory=new URL('../dist/assets/final/',import.meta.url);let count=0;
 for(const name of await readdir(directory)){
  if(!name.endsWith('-route.json'))continue;const route=JSON.parse(await readFile(new URL(name,directory),'utf8'));
  const end=route.stations.at(-1).s,reverse={...route,stations:route.stations.map(st=>({...st,s:end-st.s})).reverse()};
  for(let s=0;s<=end;s+=Math.max(1,end/31)){const a=sceneryDensity(route,s),b=sceneryDensity(reverse,end-s);for(const k of ['building','green']){assert.ok(Number.isFinite(a[k])&&a[k]>=0&&a[k]<=100,name+' '+k);assert.ok(Math.abs(a[k]-b[k])<1e-7,name+' reverse '+k);}}
  count++;
 }
 assert.ok(count>=20);const stations=JSON.parse(await readFile(new URL('../dist/assets/route-stations.json',import.meta.url),'utf8')).stations;
 for(const st of stations)assert.ok(Number.isFinite(sceneryDensity({id:'tohoku',stations},st.s).green));
 assert.ok(sceneryProfiles().length>=16);
});
test('real lines use OSM classifications and fictional lines use district land use',()=>{
 for(const profile of sceneryProfiles())for(const row of profile.rows){
  assert.ok(['osm-600m','interpolated-osm','fictional-landuse'].includes(row.source));
  assert.ok(Number.isFinite(row.coverage)&&row.coverage>=0&&row.coverage<=1);
 }
 const rural=sceneryDensity({id:'yagan',stations:[{name:'新藤原',s:0},{name:'川治温泉',s:5000}]},1000);
 assert.ok(rural.forest>.3);
});
test('basin terrain is confined to relevant station corridors',()=>{
 const route={id:'shinonoi',stations:[{name:'塩尻',s:0},{name:'広丘',s:3500},{name:'松本',s:13000},{name:'明科',s:27000}]};
 assert.equal(basinTerrainAt(route,6000)?.kind,'matsumoto');assert.equal(basinTerrainAt(route,20000),null);
});

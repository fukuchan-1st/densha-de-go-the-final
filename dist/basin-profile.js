import {SCENERY_PROFILES} from './scenery-profile-data.js?v=84';
// Scenery design indices, not surveyed land-cover percentages. Station names keep
// this profile aligned when a service reverses, starts halfway, or joins routes.
export const BASIN_PROFILE=[
 {name:'勝沼ぶどう郷',width:1800},
 {name:'塩山',width:3400},
 {name:'東山梨',width:4700},
 {name:'山梨市',width:5600},
 {name:'春日居町',width:6200},
 {name:'石和温泉',width:6500},
 {name:'酒折',width:5800},
 {name:'甲府',width:5400},
 {name:'竜王',width:4300},
 {name:'塩崎',width:3200},
 {name:'韮崎',width:1900}
];
// Density is generated from OSM; saved manual overrides are deliberately ignored.
const generated=SCENERY_PROFILES.find(p=>p.id==='chuo')?.rows??[];
for(const row of BASIN_PROFILE){const automatic=generated.find(p=>p.name===row.name);if(automatic)Object.assign(row,automatic);}
export function loadBasinProfile(){return BASIN_PROFILE.map(p=>({...p}));}
export function basinProfile(){return BASIN_PROFILE;}
const routes=new WeakMap();
export function basinAnchors(route){
 if(routes.has(route))return routes.get(route);
 const stations=route.sceneryStations??route.stations??[],rows=stations.filter(st=>BASIN_PROFILE.some(p=>p.name===st.name)).map(st=>({name:st.name,s:st.s})).sort((a,b)=>a.s-b.s);
 // A lone terminal must not turn an unrelated branch into the whole basin.
 const result=rows.length>=2?rows:[];routes.set(route,result);return result;
}
export function basinDensity(route,s,profile=basinProfile()){
 const rows=basinAnchors(route);if(!rows.length||s<rows[0].s||s>rows.at(-1).s)return null;
 let i=1;while(i<rows.length-1&&rows[i].s<s)i++;
 const a=rows[i-1],b=rows[i],u=Math.max(0,Math.min(1,(s-a.s)/Math.max(1,b.s-a.s))),pa=profile.find(p=>p.name===a.name),pb=profile.find(p=>p.name===b.name);
 if(!pa||!pb)return null;
 return Object.fromEntries(['building','green','width','forest','farmland','orchard','urban','coverage'].map(k=>[k,(pa[k]??0)+((pb[k]??0)-(pa[k]??0))*u]));
}
export function basinRelief(x,z){
 const r=Math.hypot(x/19000,z/11500),rise=Math.max(0,r-.54),angle=Math.atan2(z/11500,x/19000);
 const ridge=.9+.2*Math.sin(angle*5+.7)+.12*Math.cos(angle*9-.8);
 const detail=1+.13*Math.sin(x/1700+z/2300)+.07*Math.cos(x/650-z/800);
 return Math.pow(rise,1.35)*2500*ridge*detail*Math.exp(-Math.pow(Math.max(0,r-1.08)/.48,2));
}
const terrainAreas=new WeakMap();
export function basinTerrainAreas(route){
 if(terrainAreas.has(route))return terrainAreas.get(route);
 const stations=route.sceneryStations??route.stations??[],areas=[];
 for(const [kind,names,center,factor]of [
  ['kofu',BASIN_PROFILE.map(r=>r.name),'甲府',1],
  ['matsumoto','塩尻 広丘 村井 平田 南松本 松本'.split(' '),'松本',.55],
  ['nagano','篠ノ井 今井 川中島 安茂里 長野'.split(' '),'長野',.6]
 ]){
  const anchors=stations.filter(s=>names.includes(s.name)).sort((a,b)=>a.s-b.s);if(anchors.length<2)continue;
  areas.push({kind,anchors,center:anchors.find(a=>a.name===center)??anchors[Math.floor(anchors.length/2)],factor,start:anchors[0].s,end:anchors.at(-1).s});
 }
 terrainAreas.set(route,areas);return areas;
}
export function basinTerrainAt(route,s){return basinTerrainAreas(route).find(a=>s>=a.start&&s<=a.end)??null;}

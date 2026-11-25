import {joinRoutes,sliceRoute} from './service-routes.js?v=114';
const cache=new Map();
async function json(url){const response=await fetch(url);if(!response.ok)throw Error(`東武路線データを読み込めません: ${url}`);const bytes=new Uint8Array(await response.arrayBuffer());return bytes[0]===31&&bytes[1]===139?new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json():JSON.parse(new TextDecoder().decode(bytes));}
export async function loadTobuRouteParts(){
 const entries=await Promise.all(['tobu-skytree','tobu-nikko','tobu-kinugawa','aizu'].map(async id=>{if(!cache.has(id))cache.set(id,(async()=>{const route=await json(`./assets/final/${id}-route.json?v=114`),geo=await json(`./assets/final/${id}-geography.json.gz?v=114`);return {...route,roads:geo.roads,mappedBuildings:geo.mappedBuildings,mappedBuildingSource:geo.source,mappedBuildingBuffer:geo.bufferM,roadAsset:undefined};})());return [id,await cache.get(id)];}));return Object.fromEntries(entries);
}
export function assembleTobuRoutes(parts,yagan){
 const main=joinRoutes([parts['tobu-skytree'],sliceRoute(parts['tobu-nikko'],'東武動物公園','下今市'),parts['tobu-kinugawa'],yagan,parts.aizu],'tobu-aizu','東武・野岩・会津鉄道 浅草〜会津田島');
 main.geometryQuality='OpenStreetMap実線形＋提供BVE野岩線。駅接続部・GSI推定勾配は近似';main.roadAsset=undefined;
 main.limits.push({sStart:main.stations.find(x=>x.name==='新藤原').s,sEnd:main.stations.find(x=>x.name==='会津高原尾瀬口').s,kmh:70,source:'既存野岩線の運転上限'});
 const nikko=sliceRoute(parts['tobu-nikko'],'南栗橋','東武日光');nikko.id='tobu-nikko';nikko.name='東武日光線 南栗橋〜東武日光';
 return {main,nikko};
}
// This is selected only for Hibiya-line 70000 operation, not Asakusa main-line trains.
export function applyTobuHibiyaPlatform(route){
 const st=route.stations.find(s=>s.name==='北千住');if(!st)return route;const s=st.s;
 const stations=route.stations.map(x=>x.name==='北千住'?{...x,platform:6,platformNumber:6,stationFloor:3,doorSide:'left',platformLabel:'3階 日比谷線6番線',layoutSource:'提供ARATobu MapB / ユーザー指定'}:x);
 // ARATobu MapB places the Joban ground tracks at -10.7 m at Kita-Senju.
 const elevatedTrack=[[Math.min(-300,s-550),0],[s-180,10.7],[s+120,10.7],[s+520,0],[Math.max(route.length+300,s+520.1),0]];
 const stationLayouts={...route.stationLayouts,'北千住':{platforms:[{edges:[[-145,-8,-1.55],[15,-8,-1.55]],boarding:true,roof:[-135,10],name:'日比谷線6番線',platformNumber:6}],source:'ARATobu station layout; platform dimensions approximated',floor:3,platformNumber:6}};
 const bveAnchors=[[0,'北千住'],[1230,'小菅'],[2400,'五反野'],[3760,'梅島'],[4580,'西新井']].map(([q,n])=>[q,(route.stations.find(x=>x.name===n)?.s??s+q)]);const chain=q=>{let i=0;while(i<bveAnchors.length-2&&bveAnchors[i+1][0]<q)i++;const a=bveAnchors[i],b=bveAnchors[i+1];return a[1]+(q-a[0])*(b[1]-a[1])/(b[0]-a[0]);};const hibiyaLimits=[[140,600,60],[1075,5600,65]].map(([a,b,speed])=>({sStart:Math.max(0,chain(a)),sEnd:Math.min(route.length,chain(b)),kmh:speed,source:'提供ARATobu MapB 明示制限'})).filter(x=>x.sEnd>x.sStart);
 return {...route,limits:[...(route.limits??[]),...hibiyaLimits].sort((a,b)=>a.sStart-b.sStart),stations,sceneryStations:(route.sceneryStations??stations).map(x=>x.name==='北千住'?{...x,...stations.find(s=>s.name==='北千住')}:x),stationLayouts,elevatedTrack,hibiyaPlatform6:true};
}

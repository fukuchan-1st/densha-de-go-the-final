import {RouteProfile} from './route-profile.js?v=113';
import {STATIONS} from './route-data.js?v=113';
import {loadRoadAsset} from './road-assets.js?v=113';
export const TOHOKU_TRAIN={id:'701',name:'701系1500番台',notchLabels:['EB','B7','B6','B5','B4','B3','B2','B1','抑速','N','P1','P2','P3','P4','P5'],serviceBrakeKmhPerSecond:3.6,emergencyBrakeKmhPerSecond:3.6,playableSpecs:{carCount:2,maxSpeedKmh:110,startingAccelerationKmhPerSecondApprox:2.1,gauge:1.067,viewpoint:{x:0,y:3.1,z:0}}};
export function buildTohokuRoute(geometry,profileData,layout,structures,extension,crossings,signals){
 const profile=new RouteProfile(profileData),length=STATIONS.at(-1).s;
 const stations=STATIONS.map(st=>({...st,doorSide:'right'}));
 const stationLayouts=Object.fromEntries(layout.stations.map(st=>[st.name,{platforms:st.platforms.map(p=>({...p,edges:p.edges.map(([s,l,r])=>[s-st.s,l,r])}))}]));
 const route={id:'tohoku',name:'東北本線',length,loop:false,vehicle:'701',carCount:2,stations,sceneryStations:stations,
  points:geometry.points.map(([s,x,z])=>[s,x,z,profile.elevationAt(s)]),
  grades:[...profileData.grades.map(x=>[x.s,x.perMille]),[profileData.lengthM+.001,0],[length,0]],
  limits:[...profileData.limits.map((x,i)=>({sStart:x.s,sEnd:Math.min(profileData.limits[i+1]?.s??profileData.lengthM,profileData.lengthM),kmh:x.kmh})),{sStart:profileData.lengthM,sEnd:length+1,kmh:110}],
  stationLayouts,neighborTracks:layout.tracks.filter(t=>t.id!=='player').map(t=>({...t,height:t.knots[0][2]??0,heightKnots:t.knots.map(([s,x,y])=>[s,y??0])})),
  trafficSections:[{sStart:-300,sEnd:length+300,tracks:2}],structures:[...structures.structures,...crossings.structures,...extension.structures.map(x=>({...x,sourceType:'osm'}))],signals:signals.signals,
  roadAsset:'./assets/roads/tohoku.json.gz',geometryQuality:'黒磯〜新白河は提供BVE、以北は地図による試作線形',sourceDirectionNote:'701系の提供運転台・収録音を共通運転画面で使用。新白河以北の勾配・上限速度は従来の試作設定を継承。',unifiedVersion:106};
 return route;
}
export async function loadTohokuRoute(){const files=['route-geometry','bve-profile','station-layouts','bve-structures','osm-extension-structures','level-crossings-tohoku','bve-signals'];const data=await Promise.all(files.map(async file=>{const r=await fetch(`./assets/${file}.json?v=107`);if(!r.ok)throw Error('東北本線の路線データを読み込めません：'+file);return r.json();}));return loadRoadAsset(buildTohokuRoute(...data));}

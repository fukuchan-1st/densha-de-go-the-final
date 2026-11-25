import {yamagataSourcePosition} from './yamagata-mountain.js?v=114';
import {basinDensity,basinTerrainAt} from './basin-profile.js?v=114';
const city=new Set('東京 神田 御茶ノ水 四ツ谷 新宿 中野'.split(' '));
const tokyo=new Set('東京 神田 御茶ノ水 四ツ谷 新宿 中野 高円寺 阿佐ケ谷 荻窪 西荻窪 吉祥寺 三鷹 武蔵境 東小金井 武蔵小金井 国分寺 西国分寺 国立 立川 日野 豊田 八王子 西八王子 高尾'.split(' '));
export function stationLeg(route,s){const stations=(route.sceneryStations??route.stations??[]).filter(st=>!st.displayOnly);let i=1;while(i<stations.length-1&&stations[i].s<s)i++;return [stations[Math.max(0,i-1)],stations[i]??stations[0]].filter(Boolean);}
export function mountainArea(route,s){if(!route.id?.startsWith('chuo'))return true;return !stationLeg(route,s).every(st=>tokyo.has(st.name));}
export function chuoScenery(route,s){
 if(!route.id?.startsWith('chuo'))return null;
 const density=basinDensity(route,s);if(density)return density.building>=80?'city':'suburban';
 const pair=stationLeg(route,s);if(pair.every(st=>city.has(st.name)))return 'city';
 if(pair.every(st=>tokyo.has(st.name)))return 'suburban';
 const matsumoto=(route.sceneryStations??route.stations??[]).find(st=>st.name==='松本');
 return matsumoto&&Math.abs(s-matsumoto.s)<1600?'suburban':'mountain';
}
export function releaseMatsumotoExpressLimit(route,vehicle,service){
 if(!(['e353','383','681'].includes(vehicle)||(service??'').includes('特急')))return route;
 const stations=route.sceneryStations??route.stations??[],a=stations.find(x=>x.name==='塩尻'),b=stations.find(x=>x.name==='松本');if(!a||!b)return route;
 const start=Math.min(a.s,b.s),end=Math.max(a.s,b.s),limits=[];
 for(const row of route.limits??[]){if(![110,120].includes(row.kmh)||row.sEnd<=start||row.sStart>=end){limits.push(row);continue;}if(row.sStart<start)limits.push({...row,sEnd:start});if(row.sEnd>end)limits.push({...row,sStart:end});}
 return {...route,limits,unrestrictedSections:[...(route.unrestrictedSections??[]),{sStart:start,sEnd:end}]};
}

const basin=new Set('松本 南松本 平田 村井 広丘 塩尻'.split(' '));
export function valleyWidth(route,s){if(route.id==='yamagata'){const source=yamagataSourcePosition(route,s);if(source==null||source<6797||source>34930)return 1200;const t=Math.max(0,Math.min(1,Math.min(source-6797,34930-source)/1500)),blend=t*t*(3-2*t);return 150-105*blend;}const density=basinDensity(route,s);if(density)return density.width;if(basinTerrainAt(route,s))return 1200;if(route.id?.startsWith('toho'))return 85;const leg=stationLeg(route,s),m=(route.sceneryStations??route.stations??[]).find(st=>st.name==='松本');return (leg.length===2&&leg.every(st=>basin.has(st.name)))||(m&&Math.abs(s-m.s)<1600)?90:10;}

const clamp01=v=>Math.max(0,Math.min(1,v));
import {interpolateKnots} from './track-layout.js?v=118';
const urbanChuo=new Set('東京 神田 御茶ノ水 四ツ谷 新宿 中野 高円寺 阿佐ケ谷 荻窪 西荻窪 吉祥寺 三鷹 武蔵境 東小金井 武蔵小金井 国分寺 西国分寺 国立 立川'.split(' '));
export function urbanDeckHeight(route,s){const old=route.elevatedTrack?.length?interpolateKnots(route.elevatedTrack,s):0,stations=route.sceneryStations??route.stations??[];let height=old;
 if(['yamanote','osaka'].includes(route.id))height=Math.max(height,4.8);
 else if(route.id?.startsWith('chuo'))for(let i=1;i<stations.length;i++){const a=stations[i-1],b=stations[i];if(urbanChuo.has(a.name)&&urbanChuo.has(b.name)){const start=Math.min(a.s,b.s),end=Math.max(a.s,b.s),weight=Math.max(0,Math.min(1,(s-start+160)/160,(end+160-s)/160));height=Math.max(height,4.8*weight);}}
 // Tokyo's Chuo platforms are on level 3; adjacent surface platforms are level 2.
 // Metre heights are modelling estimates; the floor relationship is authoritative.
 const tokyo=stations.find(st=>st.name==='東京');if(tokyo&&(route.id?.startsWith('chuo')||route.id==='yamanote')){const distance=Math.abs(s-tokyo.s),plateau=300,approach=1100,t=clamp01((distance-plateau)/approach),weight=1-t*t*(3-2*t),target=route.id.startsWith('chuo')?12.8:6.8;if(distance<plateau+approach)height=Math.max(height,4.8+(target-4.8)*weight);}
 for(const crossing of route.structures??[])if(crossing.kind==='crossing'){const center=crossing.sOrigin??(crossing.sStart+crossing.sEnd)/2,d=Math.abs(s-center);if(d>285)continue;const t=Math.max(0,Math.min(1,(d-55)/230));height=Math.min(height,Math.max(old,4.8*t*t*(3-2*t)));if(d<=55)height=0;}
 return height;
}
export function prepareUrbanViaduct(route){if(route.urbanViaductVersion===3)return route;if(!['yamanote','osaka'].includes(route.id)&&!route.id?.startsWith('chuo'))return route;const end=route.length??route.stations.at(-1).s,knots=[];for(let s=-300;s<=end+320;s+=20)knots.push([s,urbanDeckHeight(route,s)]);return {...route,elevatedTrack:knots,urbanViaductVersion:3};}

// Separate unrelated elevated corridors instead of filling the entire gap between them.
export function railDeckSpans(offsets){const groups=[];for(const x of [...offsets].sort((a,b)=>a-b)){const last=groups.at(-1);if(last&&x-last[1]<=8.5)last[1]=x;else groups.push([x,x]);}return groups;}

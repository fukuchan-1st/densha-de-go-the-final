import {interpolateKnots} from './track-layout.js?v=105';
const major=new Set(['京都','新大阪','大阪','神戸']);
export function corridorSceneryType(route,s){
 if(route.id!=='tokaido')return null;
 return (route.sceneryStations??route.stations).some(st=>major.has(st.name)&&Math.abs(st.s-s)<1200)?'city':'suburban';
}
// Fill gaps in the mapped rail fragments; retain their positions where present.
export function prepareCorridorScenery(source){
 if(source.corridorSceneryPrepared)return source;
 const chuo=['chuo','chuo-extended'].includes(source.id),tokaido=source.id==='tokaido';
 if(!chuo&&!tokaido)return source;
 const stations=source.sceneryStations??source.stations,length=stations.at(-1).s;
 const from=tokaido?-300:(stations.find(st=>st.name==='御茶ノ水')?.s??0);
 const to=tokaido?length+300:(stations.find(st=>st.name==='三鷹')?.s??0);
 if(to<=from)return source;
 const drive=s=>source.drivingTrack?interpolateKnots(source.drivingTrack,s):0;
 const rails=[...(source.neighborTracks??[])],layouts=structuredClone(source.stationLayouts??{});
 const active=(s)=>rails.filter(r=>r.knots[0][0]<=s&&r.knots.at(-1)[0]>=s&&Math.abs(r.height??0)<.3).map(r=>interpolateKnots(r.knots,s));
 const localOffset=s=>{
  let influence=0;for(const st of stations)influence=Math.max(influence,Math.max(0,1-Math.max(0,Math.abs(s-(st.s-100))-150)/180));
  return tokaido?4+5*influence:-4-5*influence;
 };
 const targets=tokaido?[s=>0,localOffset,s=>drive(s)-9]:[localOffset,s=>localOffset(s)-4];
 for(const target of targets){
  let gap=[];
  const flush=()=>{if(gap.length>1)rails.push({knots:gap,basis:'Approximate continuation between mapped corridor rail fragments'});gap=[];};
  let previous;
  for(let s=from;s<=to+20;s+=20){
   s=Math.min(s,to);const desired=target(s),xs=active(s).filter(x=>Math.abs(x-drive(s))>1.2),nearest=xs.sort((a,b)=>Math.abs(a-desired)-Math.abs(b-desired))[0];
   const covered=Number.isFinite(nearest)&&Math.abs(nearest-desired)<2.8;
   if(!covered){if(!gap.length&&previous)gap.push(previous);gap.push([s,desired]);}
   else if(gap.length){gap.push([s,nearest]);flush();}
   previous=[s,covered?nearest:desired];if(s===to)break;
  }flush();
 }
 for(const st of stations){
  if(st.s<from||st.s>to)continue;
  const layout=layouts[st.name]??={platforms:[]};
  const xs=active(st.s-60).sort((a,b)=>a-b).filter((x,i,a)=>!i||x-a[i-1]>1);
  const gaps=[];
  for(let i=1;i<xs.length;i++){
   const l=xs[i-1]+1.55,r=xs[i]-1.55,mid=(l+r)/2;
   if(r-l<1.5||(tokaido?mid<0:mid>-3))continue;
   gaps.push({l,r,mid});
  }
  const candidate=gaps.sort((a,b)=>Math.abs(a.mid-(tokaido?4.5:-7))-Math.abs(b.mid-(tokaido?4.5:-7)))[0];
  if(!candidate)continue;
  const {l,r,mid}=candidate;
  if((layout.platforms??[]).some(p=>{const a=interpolateKnots(p.edges,-60,1),b=interpolateKnots(p.edges,-60,2);return mid>=a&&mid<=b;}))continue;
  (layout.platforms??=[]).push({boarding:false,edges:[[-210,l,r],[15,l,r]],roof:[-180,-10],basis:'Approximate local-line island platform between mapped or continued rails'});
 }
 return {...source,neighborTracks:rails,stationLayouts:layouts,corridorSceneryPrepared:true};
}

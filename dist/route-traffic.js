import {applyStationWiring} from './station-wiring.js?v=118';
import {prepareSpecialStations} from './special-station-layouts.js?v=118';
import {prepareTobuStations} from './tobu-station-layouts.js?v=118';
import {widenBoardingClearance,mergePlatformSurfaces} from './platform-details.js?v=118';
import {yamanoteParallel} from './yamanote-parallel.js?v=118';
import {interpolateKnots} from './track-layout.js?v=118';

// All offsets are measured to the driver's right. A direction belongs to a
// rail, rather than being guessed from its distance to the player's train.
export function inferTrafficSections(route){
 if(route.id==='yamagata')return [{sStart:-300,sEnd:(route.length??route.stations.at(-1).s)+300,tracks:2,source:'User-requested continuous double-track simulator arrangement'}];
 if(route.trafficSections?.length)return ensureShiojiriMatsumoto(route,route.trafficSections);
 const stations=route.sceneryStations??route.stations,L=route.length??stations.at(-1).s;
 const at=name=>stations.find(st=>st.name===name)?.s;
 const between=(s,a,b)=>a!=null&&b!=null&&s>=Math.min(a,b)&&s<=Math.max(a,b);
 const count=s=>{
  if(route.singleTrack||['yagan','oito','ome-okutama','itsukaichi'].includes(route.id))return 1;
  if(route.id==='chuo-oito'&&s>=(at('松本')??Infinity))return 1;
  if(['ome','chuo-ome','chuo-itsukaichi'].includes(route.id)&&s>=(at('東青梅')??Infinity))return 1;
  if(route.id==='chuo-itsukaichi'&&s>=(at('拝島')??Infinity))return 1;
  if(route.id.startsWith('shinonoi')||route.id==='suwa-nagano'){
   if(between(s,at('長野'),at('篠ノ井'))||between(s,at('松本'),at('田沢'))||between(s,at('塩尻'),at('松本')))return 2;
   if(route.id==='suwa-nagano'&&s<(at('松本')??0))return 2;
   return 1;
  }
  if(route.id==='tokaido')return 4;
  if(route.id.startsWith('chuo')&&between(s,at('御茶ノ水'),at('三鷹')))return 4;
  return 2;
 };
 const cuts=[-300,...new Set(stations.map(st=>st.s).filter(s=>s>0&&s<L)),L+300],out=[];
 for(let i=1;i<cuts.length;i++){
  const section={sStart:cuts[i-1],sEnd:cuts[i],tracks:count((cuts[i-1]+cuts[i])/2)};
  if(out.at(-1)?.tracks===section.tracks)out.at(-1).sEnd=section.sEnd;else out.push(section);
 }
 return ensureShiojiriMatsumoto(route,out);
}
export function ensureShiojiriMatsumoto(route,sections){
 const stations=route.sceneryStations??route.stations,a=stations.find(x=>x.name==='塩尻')?.s,b=stations.find(x=>x.name==='松本')?.s;
 if(!Number.isFinite(a)||!Number.isFinite(b)||a===b)return sections;
 const lo=Math.min(a,b),hi=Math.max(a,b),cuts=[...new Set([...sections.flatMap(x=>[x.sStart,x.sEnd]),lo,hi])].sort((a,b)=>a-b),out=[];
 for(let i=1;i<cuts.length;i++){const start=cuts[i-1],end=cuts[i],mid=(start+end)/2,base=sections.find(x=>mid>=x.sStart&&mid<=x.sEnd);if(!base)continue;const tracks=mid>=lo&&mid<=hi?Math.max(2,base.tracks):base.tracks;if(out.at(-1)?.tracks===tracks)out.at(-1).sEnd=end;else out.push({...base,sStart:start,sEnd:end,tracks});}return out;
}
export function trafficSectionAt(route,s){const a=inferTrafficSections(route);return a.find(x=>s>=x.sStart&&s<=x.sEnd)??(s<a[0].sStart?a[0]:a.at(-1));}
const lanes=(tracks,reverse)=>tracks===4?(reverse?[-16,-8,0,8]:[-8,0,8,16]):tracks===2?(reverse?[-4.2,0]:[0,4.2]):[0];
const ownLane=(tracks,reverse,outer)=>tracks===1?0:tracks===2?(reverse?-4.2:0):reverse?(outer?-16:-8):(outer?-8:0);

export function prepareLeftTraffic(source){
 source=yamanoteParallel(source);if(source.leftTrafficVersion===5)return applyStationWiring(source);
 const sections=inferTrafficSections(source),reverse=!!source.reverseDirection,outer=(source.id==='tokaido'||source.id?.startsWith('tobu'))&&source.serviceTrack==='outer',L=source.length??source.stations.at(-1).s;
 const base=s=>ownLane(trafficSectionAt({...source,trafficSections:sections},s).tracks,reverse,outer);
 // Continuous driver path through a change from four tracks to two or one.
 const laneAt=s=>{let x=base(s);for(let i=1;i<sections.length;i++){const boundary=sections[i].sStart,from=ownLane(sections[i-1].tracks,reverse,outer),to=ownLane(sections[i].tracks,reverse,outer);if(from===to)continue;const begin=Math.abs(to)>Math.abs(from)?boundary-160:boundary,end=begin+160;if(s>=begin&&s<=end){const t=(s-begin)/160;x=from+(to-from)*(t*t*(3-2*t));}}return x;};
 const driving=[];for(let s=-300;s<L+300;s+=20)driving.push([s,laneAt(s)]);driving.push([L+300,laneAt(L+300)]);
 const rail=(knots,direction,extra={})=>({knots,direction,mainCorridor:true,trafficMain:true,...extra});
 // Keep distant station yards and elevated parallel routes as scenery only.
 const neighbors=(source.neighborTracks??[]).filter(t=>!t.trafficMain&&(t.sceneryParallel||t.knots.every(([s,x])=>Math.abs(x)>24||Math.abs(t.height??0)>.5))).map(t=>({...t,direction:'scenery'}));
 for(const section of sections){
  const {tracks,sStart:a,sEnd:b}=section;if(tracks===1)continue;
  for(const x of lanes(tracks,reverse)){
   if(x===ownLane(tracks,reverse,outer))continue;
   const direction=tracks===4?(x>=(reverse?0:8)?'opposing':'same'):'opposing';
   const target=s=>interpolateKnots(driving,s);
   const adjoining=section===sections[0]?a:Math.max(a-160,-300),finish=section===sections.at(-1)?b:Math.min(b+160,L+300);
   const knots=[[adjoining,section===sections[0]?x:target(adjoining)],[a,x],[b,x],[finish,section===sections.at(-1)?x:target(finish)]];
   const distinct=knots.filter((k,i)=>i===0||k[0]>knots[i-1][0]);neighbors.push(rail(distinct,direction));
  }
 }
 // On a single line, passing tracks exist only within station limits.
 for(const st of source.sceneryStations??source.stations){
  if(trafficSectionAt({...source,trafficSections:sections},st.s).tracks!==1)continue;
  const supplied=st.passingLoop||(source.neighborTracks??[]).some(t=>(!t.trafficMain||t.passingLoop)&&t.knots[0][0]<=st.s&&t.knots.at(-1)[0]>=st.s&&Math.abs(interpolateKnots(t.knots,st.s))>2.8);
  if(supplied)neighbors.push(rail([[st.s-230,0],[st.s-160,4.2],[st.s+30,4.2],[st.s+130,0]],'opposing',{station:st.name,passingLoop:true}));
 }
 widenBoardingClearance(neighbors,source.sceneryStations??source.stations,driving,interpolateKnots);
 const layouts={};
 for(const st of source.sceneryStations??source.stations){
  const drive=interpolateKnots(driving,st.s),active=[drive,...neighbors.filter(t=>st.s>=t.knots[0][0]&&st.s<=t.knots.at(-1)[0]&&Math.abs(t.height??0)<.3).map(t=>interpolateKnots(t.knots,st.s))].sort((a,b)=>a-b);
  const layout=source.stationLayouts?.[st.name]??{},platforms=[];
  for(const p of layout.platforms??[]){
   const left=interpolateKnots(p.edges,0,1),right=interpolateKnots(p.edges,0,2),cuts=[left,...active.filter(x=>x>left&&x<right),right],gaps=[];
   for(let i=1;i<cuts.length;i++){const l=cuts[i-1]+(i>1?1.55:0),r=cuts[i]-(i<cuts.length-1?1.55:0);if(r-l>=1.4)gaps.push([l,r]);}
   const best=gaps.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0];if(best)platforms.push({...p,boarding:false,edges:p.edges.map(([s])=>[s,...best])});
  }
  const distance=p=>Math.min(...p.edges[0].slice(1).map(x=>Math.abs(x-drive)));
  let boarding=platforms.filter(p=>distance(p)<=2&&p.edges[0][2]-p.edges[0][1]>=(source.id==='yagan'&&st.name==='男鹿高原'?2.5:3.4)).sort((a,b)=>distance(a)-distance(b))[0];
  const make=(l,r)=>({edges:[[-220,l,r],[20,l,r]],roof:[-185,0],boarding:false,basis:'左右の通行方向に合わせた試作ホーム'});
  if(!boarding){const lower=active.filter(x=>x<drive-.1).at(-1),left=Math.max(drive-7.5,(lower??-Infinity)+1.55);boarding=make(left,drive-1.55);platforms.push(boarding);}boarding.boarding=true;
  if(trafficSectionAt({...source,trafficSections:sections},st.s).tracks===4){const opposing=reverse?[0,8]:[8,16],l=opposing[0]+1.55,r=opposing[1]-1.55;if(!platforms.some(p=>p.edges[0][1]<=l&&p.edges[0][2]>=r))platforms.push(make(l,r));}
  layouts[st.name]={...layout,platforms:mergePlatformSurfaces(platforms.filter(p=>p===boarding||p.edges[0][2]-p.edges[0][1]>=2.5))};
 }
 return applyStationWiring(prepareTobuStations(prepareSpecialStations({...source,trafficSide:'left',leftTrafficVersion:5,trafficSections:sections,tokyoBaseDrivingTrack:undefined,drivingTrack:driving,neighborTracks:neighbors,stationLayouts:layouts,corridorSceneryPrepared:true})),source);
}

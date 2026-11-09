import {interpolateKnots} from './track-layout.js';
const finite=Number.isFinite;
export function samplePoint(points,s){if(!points?.length)return [0,0,0];let i=0,j=points.length-1;while(j-i>1){const m=(i+j)>>1;if(points[m][0]<=s)i=m;else j=m;}const a=points[i],b=points[j],t=(s-a[0])/Math.max(.001,b[0]-a[0]);return [1,2,3].map(c=>(a[c]??0)+((b[c]??0)-(a[c]??0))*t);}
const clearTimes=st=>{const x={...st};for(const key of ['arrival','departure','startTime','passTime','time','arrivalSound','departureSound'])delete x[key];return x;};
export function reverseSteps(rows=[],length,sign=1){if(!rows.length)return [];const boundaries=[0,...rows.map(x=>length-x[0]).filter(s=>s>0&&s<length),length].sort((a,b)=>a-b);return [...new Set(boundaries)].map(s=>[s,((rows.findLast(x=>x[0]<=Math.max(0,length-s-.00001))??rows[0])[1]*sign)||0]);}
export function reverseRoute(route,{switchTrack=true}={}){
 const length=route.length??route.stations.at(-1).s,span=x=>({...x,sStart:length-x.sEnd,sEnd:length-x.sStart,...(finite(x.sOrigin)?{sOrigin:length-x.sOrigin}:{})}),knots=(rows,sign=-1)=>rows?.map(([s,x,...rest])=>[length-s,x*sign,...rest]).reverse();
 const layouts=Object.fromEntries(Object.entries(route.stationLayouts??{}).map(([name,layout])=>[name,{...layout,opposite:layout.opposite?.map(([s,x])=>[-s,-x]).reverse(),platforms:(layout.platforms??[]).map(pl=>{const shift=pl.edges[0][0]+pl.edges.at(-1)[0];return {...pl,edges:pl.edges.map(([s,left,right])=>[-s+shift,-right,-left]).reverse(),roof:pl.roof?[-pl.roof[1]+shift,-pl.roof[0]+shift]:undefined};})}]));
 const result={...route,reverseDirection:!route.reverseDirection,direction:route.stations.at(-1).name+' → '+route.stations[0].name,points:route.points?.map(([s,...position])=>[length-s,...position]).reverse(),stations:route.stations.map((st,i)=>({...clearTimes(st),layoutIndex:st.layoutIndex??i,s:length-st.s})).reverse(),sceneryStations:(route.sceneryStations??route.stations).map((st,i)=>({...clearTimes(st),layoutIndex:st.layoutIndex??i,s:length-st.s})).reverse(),structures:(route.structures??[]).map(span).sort((a,b)=>a.sStart-b.sStart),limits:(route.limits??[]).map(span).sort((a,b)=>a.sStart-b.sStart),limitsByVehicle:route.limitsByVehicle?Object.fromEntries(Object.entries(route.limitsByVehicle).map(([id,rows])=>[id,rows.map(span).sort((a,b)=>a.sStart-b.sStart)])):undefined,grades:reverseSteps(route.grades,length,-1),drivingTrack:knots(route.drivingTrack),elevatedTrack:knots(route.elevatedTrack,1),neighborTracks:route.neighborTracks?.map(t=>({...t,knots:knots(t.knots),heightKnots:knots(t.heightKnots,1)})),stationLayouts:layouts,signals:(route.signals??[]).filter(x=>x.kind!=='relay').map((x,i)=>({...x,s:length-x.s,x:-(x.x??2.5),callBlock:i+1})).sort((a,b)=>a.s-b.s),soundEvents:[],rollingNoise:(route.rollingNoise??[]).map((x,i,all)=>({...x,s:Math.max(0,length-(all[i+1]?.s??length))})).reverse(),workers:(route.workers??[]).map(x=>({...x,s:length-x.s})),maintenanceWorkers:(route.maintenanceWorkers??[]).map(x=>({...x,s:length-x.s})),geometrySections:route.geometrySections?.map(x=>({...x,sStart:length-x.sEnd,sEnd:length-x.sStart})).reverse(),sourceDirectionNote:'逆方向は同じ提供線形を反転した運転用配線。逆方向の車内放送は未提供のため省略。'};
 return switchTrack?reverseRunningTrack(route,result):result;
}
export function sliceRoute(route,from,to){
 const first=from?route.stations.find(s=>s.name===from):route.stations[0],last=to?route.stations.findLast(s=>s.name===to):route.stations.at(-1);if(!first||!last)throw Error('運転区間の駅がありません: '+from+' → '+to);if(first.s>last.s)return reverseRoute(sliceRoute(route,to,from));
 const a=first.s,b=last.s;if(a===0&&Math.abs(b-(route.length??b))<.01)return route;
 const clip=rows=>(rows??[]).filter(x=>x.sEnd>a&&x.sStart<b).map(x=>({...x,sStart:Math.max(a,x.sStart)-a,sEnd:Math.min(b,x.sEnd)-a}));
 const series=(rows,bounded=false)=>{if(!rows?.length)return undefined;const lo=bounded?Math.max(a-300,rows[0][0]):a-300,hi=bounded?Math.min(b+300,rows.at(-1)[0]):b+300;return [[lo-a,...rows[0].slice(1).map((_,i)=>interpolateKnots(rows,lo,i+1))],...rows.filter(x=>x[0]>lo&&x[0]<hi).map(([s,...v])=>[s-a,...v]),[hi-a,...rows[0].slice(1).map((_,i)=>interpolateKnots(rows,hi,i+1))]];};
 const st=rows=>rows.filter(x=>x.s>=a-.01&&x.s<=b+.01).map((x,i)=>({...x,layoutIndex:x.layoutIndex??route.stations.indexOf(x),s:x.s-a}));
 const steps=rows=>rows?.length?[[0,interpolateKnots(rows,a)],...rows.filter(x=>x[0]>a&&x[0]<=b).map(([s,v])=>[s-a,v])]:[];
 const positions=rows=>(rows??[]).filter(x=>x.s>=a&&x.s<=b).map(x=>({...x,s:x.s-a}));
 return {...route,length:b-a,loop:false,stations:st(route.stations),sceneryStations:st(route.sceneryStations??route.stations),points:route.points?.length?[[-300,...samplePoint(route.points,a-300)],...route.points.filter(p=>p[0]>a-300&&p[0]<b+300).map(([s,...v])=>[s-a,...v]),[b-a+300,...samplePoint(route.points,b+300)]]:undefined,limits:clip(route.limits),limitsByVehicle:route.limitsByVehicle?Object.fromEntries(Object.entries(route.limitsByVehicle).map(([k,v])=>[k,clip(v)])):undefined,structures:clip(route.structures),grades:steps(route.grades),neighborTracks:route.neighborTracks?.filter(t=>t.knots[0][0]<b&&t.knots.at(-1)[0]>a).map(t=>({...t,knots:series(t.knots,true),heightKnots:series(t.heightKnots,true)})),drivingTrack:series(route.drivingTrack),elevatedTrack:series(route.elevatedTrack),signals:positions(route.signals),soundEvents:positions(route.soundEvents),rollingNoise:positions(route.rollingNoise),workers:positions(route.workers),maintenanceWorkers:positions(route.maintenanceWorkers),geometrySections:clip(route.geometrySections)};
}
export function joinRoutes(parts,id,name){
 const out={...parts[0],id,name,length:0,loop:false,stations:[],points:[],structures:[],limits:[],grades:[],signals:[],neighborTracks:[],stationLayouts:{},soundEvents:[],rollingNoise:[],sources:[],geometrySections:[],limitsByVehicle:undefined,drivingTrack:undefined};
 for(const part of parts){const offset=out.length,L=part.length??part.stations.at(-1).s,start=samplePoint(part.points,0),ahead=samplePoint(part.points,10),end=out.points.length?samplePoint(out.points,offset):[0,0,0],behind=out.points.length?samplePoint(out.points,offset-10):null,angle=(behind?Math.atan2(end[1]-behind[1],end[0]-behind[0]):0)-Math.atan2(ahead[1]-start[1],ahead[0]-start[0]),c=Math.cos(angle),sn=Math.sin(angle);
  const transform=p=>{const dx=p[0]-start[0],dz=p[1]-start[1];return [end[0]+c*dx-sn*dz,end[1]+sn*dx+c*dz,end[2]+p[2]-start[2]];};
  const points=[[0,...start],...part.points.filter(p=>p[0]>0&&p[0]<L),[L,...samplePoint(part.points,L)]];for(const [s,...v]of points){if(out.points.length&&s===0)continue;out.points.push([offset+s,...transform(v)]);}
  for(const st of part.stations){const x={...st,s:offset+st.s};if(out.stations.at(-1)?.name===x.name)out.stations[out.stations.length-1]=x;else out.stations.push(x);}
  for(const key of ['structures','limits'])out[key].push(...(part[key]??[]).map(x=>({...x,sStart:offset+x.sStart,sEnd:offset+x.sEnd})));
  for(const key of ['signals','rollingNoise'])out[key].push(...(part[key]??[]).map(x=>({...x,s:offset+x.s})));
  out.grades.push(...(part.grades??[]).map(([s,v])=>[offset+s,v]));out.neighborTracks.push(...(part.neighborTracks??[{knots:[[0,4.2],[L,4.2]]}]).map(t=>({...t,knots:t.knots.map(([s,...v])=>[offset+s,...v]),heightKnots:t.heightKnots?.map(([s,v])=>[offset+s,v])})));
  Object.assign(out.stationLayouts,part.stationLayouts);out.sources.push(...(part.sources??[]));out.geometrySections.push({sStart:offset,sEnd:offset+L,quality:part.geometryQuality});out.length+=L;
 }
 out.sceneryStations=out.stations;out.geometryQuality='提供BVEとOpenStreetMapを接続した試作線形';out.sourceDirectionNote='接続部の線形・配線と未収録箇所は推定';return out;
}

export function singleTrackAt(route,s){
 if(route.singleTrack||['yagan','oito','ome-okutama'].includes(route.id))return true;
 const all=route.sceneryStations??route.stations,station=name=>all.find(x=>x.name===name)?.s;
 if(route.id==='chuo-oito'&&s>=(station('松本')??Infinity))return true;
 if(['ome','chuo-ome'].includes(route.id)&&s>=(station('東青梅')??Infinity))return true;
 if(route.id?.startsWith('shinonoi')||route.id==='suwa-nagano'){
  const inPair=(a,b)=>{a=station(a);b=station(b);return a!=null&&b!=null&&s>=Math.min(a,b)&&s<=Math.max(a,b);};
  if(inPair('長野','篠ノ井')||inPair('松本','田沢'))return false;
  if(route.id==='suwa-nagano'&&s<(station('松本')??0))return false;return true;
 }
 return false;
}
export function reverseRunningTrack(source,rev){
 if(!source.points?.length)return rev;const L=source.length??source.stations.at(-1).s,old=s=>source.drivingTrack?interpolateKnots(source.drivingTrack,s):0;
 const lane=s=>{const own=old(s);if(singleTrackAt(source,s))return own;
  if(source.id==='tokaido')return source.serviceTrack==='outer'?16:8;
  const available=(source.neighborTracks??[]).filter(t=>s>=t.knots[0][0]&&s<=t.knots.at(-1)[0]&&Math.abs(t.heightKnots?.length?interpolateKnots(t.heightKnots,s):t.height??0)<.3).map(t=>interpolateKnots(t.knots,s)).filter(x=>x>=own+2.8&&x<=own+16).sort((a,b)=>a-b);
  return available[0]??own+4.2;
 };
 const points=[];for(let s=-300;s<L+300;s+=20)points.push([s,-lane(Math.max(0,Math.min(L,L-s)))]);points.push([L+300,-lane(0)]);
 // Keep inferred lane joins gradual instead of jumping between map fragments.
 for(let i=1;i<points.length;i++){const delta=points[i][1]-points[i-1][1];points[i][1]=points[i-1][1]+Math.max(-.8,Math.min(.8,delta));}
 const neighbors=(rev.neighborTracks??[]).filter(t=>{let same=0,total=0;for(const [s,x]of t.knots){if(s<0||s>L)continue;total++;if(Math.abs(x-interpolateKnots(points,s))<.9)same++;}return !total||same/total<.6;});
 let segment=[];const flush=()=>{if(segment.length>1)neighbors.push({knots:segment,mainCorridor:true,basis:'反対方向用の線路。複線区間でのみ継続。'});segment=[];};
 for(const [s,x]of points){const other=-old(Math.max(0,Math.min(L,L-s)));if(Math.abs(x-other)>2.8)segment.push([s,other]);else flush();}flush();
 const layouts={...rev.stationLayouts};for(const st of rev.sceneryStations??rev.stations){const x=interpolateKnots(points,st.s),layout=layouts[st.name]??{},platforms=(layout.platforms??[]).map(p=>({...p,boarding:false}));let nearest=null,distance=Infinity;
  for(const p of platforms){const left=interpolateKnots(p.edges,0,1),right=interpolateKnots(p.edges,0,2),d=Math.min(Math.abs(left-x),Math.abs(right-x));if(!(x>left&&x<right)&&d<distance){distance=d;nearest=p;}}
  if(!nearest||distance>2){nearest={edges:[[-220,x-5,x-1.5],[20,x-5,x-1.5]],roof:[-190,5],basis:'逆方向の停止位置・ホームを提供配線から推定'};platforms.push(nearest);}nearest.boarding=true;layouts[st.name]={...layout,platforms};
 }
 return {...rev,trafficSide:'left',drivingTrack:points,neighborTracks:neighbors,stationLayouts:layouts,corridorSceneryPrepared:true};
}

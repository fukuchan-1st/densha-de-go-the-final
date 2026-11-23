import {interpolateKnots} from './track-layout.js?v=111';
export const tokyoWeight=d=>{const t=Math.max(0,Math.min(1,(Math.abs(d)-300)/1100));return 1-t*t*(3-2*t);};
// Canonical cross-section looks north: Marunouchi/Chuo west, Yaesu east.
export function prepareTokyoStation(route){

 const stations=route.sceneryStations??route.stations??[],st=stations.find(s=>s.name==='東京'),chuo=route.id?.startsWith('chuo'),yamanote=route.id==='yamanote';if(!st||(!chuo&&!yamanote))return route;const stationKey=[107,route.id,!!route.reverseDirection,st.s,st.departurePlatform??st.platformNumber??st.platform??2,stations[0]?.name,stations.at(-1)?.name].join(':');if(route.tokyoStationKey===stationKey)return route;
 const north=chuo?!route.reverseDirection:!!route.reverseDirection,sign=north?1:-1,own=chuo?(Number(st.departurePlatform??st.platformNumber??st.platform)===1?0:12):(north?34:38.2),running=chuo?(north?0:12):own,switchStart=north?160:300,switchEnd=switchStart+230,baseKnots=route.tokyoBaseDrivingTrack??route.drivingTrack??[[-300,0],[(route.length??st.s)+300,0]],base=s=>interpolateKnots(baseKnots,s),bias=s=>{if(!chuo)return 0;const t=Math.max(0,Math.min(1,(((s-st.s)*sign)-switchStart)/230)),weight=1-t*t*(3-2*t);return (own-running)*sign*weight;},drive=s=>base(s)+bias(s),x=(v,s=st.s)=>base(s)+(v-running)*sign;
 const lo=st.s-1500,hi=st.s+1500,clip=t=>{const k=t.knots,a=k[0][0],b=k.at(-1)[0],out=[];for(const [l,r]of[[a,Math.min(b,lo)],[Math.max(a,hi),b]])if(r>l)out.push({...t,knots:[[l,interpolateKnots(k,l)],...k.filter(p=>p[0]>l&&p[0]<r),[r,interpolateKnots(k,r)]]});return out;};
 const rails=(route.neighborTracks??[]).flatMap(clip),centres=[0,12,22,34,38.2,50.2,54.4,66.4,70.6,82.6];
 const localLevel=(v,s)=>(v<=12?(chuo?0:6):(chuo?-6:0))*tokyoWeight(s-st.s);
 for(let i=0;i<centres.length;i++){const v=centres[i],terminal=v<=12,a=terminal?(north?st.s-245:st.s-1400):lo,b=terminal?(north?st.s+1400:st.s+35):hi,direction=yamanote&&[34,38.2].includes(v)&&v!==own?'opposing':'scenery';let knots=[],heightKnots=[];
 const flush=()=>{if(knots.length>1)rails.push({tokyoTrack:true,diagramTrack:true,platformNumber:i+1,lineName:i<2?'中央線':i<6?'山手線・京浜東北線':'東海道線・上野東京ライン',sceneryParallel:true,direction,height:localLevel(v,st.s),heightKnots,knots});knots=[];heightKnots=[];};
 const samples=[...new Set([a,b,st.s+sign*switchStart,st.s+sign*switchEnd,...Array.from({length:Math.ceil((b-a)/10)},(_,n)=>a+n*10)].filter(s=>s>=a&&s<=b))].sort((a,b)=>a-b);
 for(let j=1;j<samples.length;j++){const l=samples[j-1],r=samples[j],shared=Math.abs(x(v,(l+r)/2)-drive((l+r)/2))<.02;if(shared){flush();continue;}if(!knots.length){knots.push([l,x(v,l)]);heightKnots.push([l,localLevel(v,l)]);}knots.push([r,x(v,r)]);heightKnots.push([r,localLevel(v,r)]);}flush();
 }
 // Both diagonals belong to the same diamond crossover. The opposing
 // train uses the complementary branch, not the departing train's platform.
 if(chuo){
  const smooth=d=>{const t=Math.max(0,Math.min(1,(d-switchStart)/230));return t*t*(3-2*t);},oppositeOwn=12-own,oppositeRunning=12-running;
  const outer=st.s+sign*1500,normalCandidates=rails.filter(t=>t.direction==='opposing'&&outer>=t.knots[0][0]&&outer<=t.knots.at(-1)[0]&&Math.abs(t.height??0)<.3).map(t=>interpolateKnots(t.knots,outer)-base(outer)).filter(v=>v>2.8).sort((a,b)=>a-b),normalGap=normalCandidates[0]??4.2;
  const routeOffset=s=>{const d=(s-st.s)*sign,t=Math.max(0,Math.min(1,(d-650)/800)),blend=t*t*(3-2*t),local=x(oppositeOwn+(oppositeRunning-oppositeOwn)*smooth(d),s);return local+(base(s)+normalGap-local)*blend;};
  const a=north?st.s-245:lo,b=north?hi:st.s+35,values=[...new Set([a,b,...Array.from({length:Math.ceil((b-a)/10)},(_,i)=>a+i*10),st.s+sign*switchStart,st.s+sign*switchEnd])].filter(v=>v>=a&&v<=b).sort((a,b)=>a-b);
  rails.push({id:'tokyo-chuo-opposing',tokyoTrack:true,tokyoTrafficPath:true,tokyoCrossover:true,direction:'opposing',lineName:'中央線',platformNumber:oppositeOwn===0?1:2,height:0,knots:values.map(s=>[s,routeOffset(s)])});
  // Include the unused diagonals when both active routes run straight.
  if(own===running)for(const from of [0,12]){const knots=Array.from({length:24},(_,i)=>{const d=switchStart+i*10,s=st.s+sign*d;return [s,x(from+(12-2*from)*smooth(d),s)];}).sort((a,b)=>a[0]-b[0]);rails.push({tokyoTrack:true,tokyoCrossover:true,direction:'scenery',height:0,knots});}
 }
 const drivingTrack=chuo?[...new Set([...baseKnots.map(p=>p[0]),st.s+sign*switchStart,st.s+sign*switchEnd,...Array.from({length:24},(_,i)=>st.s+sign*(switchStart+i*10))])].sort((a,b)=>a-b).map(s=>[s,drive(s)]):route.drivingTrack;
 const platforms=[];for(let i=0;i<centres.length;i+=2){const a=centres[i]+1.55,b=centres[i+1]-1.55,l=Math.min(x(a),x(b)),r=Math.max(x(a),x(b)),boarding=own===centres[i]||own===centres[i+1];platforms.push({ref:`${i+1};${i+2}`,boarding,height:localLevel(centres[i],st.s),edges:[[-225,l,r],[15,l,r]],roof:[-215,5],tokyoPlatform:true});}
 const boarding=platforms.find(p=>p.boarding),side=(boarding.edges[0][1]+boarding.edges[0][2])/2>drive(st.s)?'right':'left',update=s=>s.name==='東京'?{...s,doorSide:side,...(chuo?{departurePlatform:own===12?2:1}:{} )}:s;
 return {...route,tokyoStationVersion:107,tokyoBaseDrivingTrack:chuo?baseKnots:undefined,drivingTrack,tokyoStationKey:stationKey,neighborTracks:rails,stations:route.stations.map(update),sceneryStations:stations.map(update),stationLayouts:{...route.stationLayouts,'東京':{platforms,diagramTopology:true,tokyoStation:true}},tokyoLayout:{north,own,running,westToEast:centres,crossover:chuo?{start:st.s+sign*switchStart,end:st.s+sign*switchEnd,active:own!==running,sStart:Math.min(st.s+sign*switchStart,st.s+sign*switchEnd),sEnd:Math.max(st.s+sign*switchStart,st.s+sign*switchEnd),diamond:true}:null}};
}
